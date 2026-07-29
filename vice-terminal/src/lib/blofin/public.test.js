import { describe, expect, test } from 'bun:test';
import { BLOFIN_CAPABILITIES, BLOFIN_DEMO_REST_URL, BLOFIN_REST_URL, fetchBlofinMarkets } from './public.ts';

const instrument = {
	instId: 'BTC-USDT', baseCurrency: 'BTC', quoteCurrency: 'USDT', contractValue: '0.001',
	minSize: '0.1', lotSize: '0.1', tickSize: '0.5', maxLeverage: '125', instType: 'SWAP',
	contractType: 'linear', state: 'live', assetClass: 'Crypto'
};
const ticker = { instId: 'BTC-USDT', last: '90000', open24h: '89000', vol24h: '1234.5', volCurrency24h: '1.2345' };

function fixtureFetch(urls) {
	return async (url) => {
		urls.push(String(url));
		const data = String(url).endsWith('/instruments') ? [instrument] : [ticker];
		return new Response(JSON.stringify({ code: '0', msg: 'success', data }), { status: 200 });
	};
}

describe('BloFin public-market adapter', () => {
	test('preserves exact venue identity and contract terms', async () => {
		const urls = [];
		const [market] = await fetchBlofinMarkets({ fetcher: fixtureFetch(urls) });
		expect(urls).toEqual([`${BLOFIN_REST_URL}/api/v1/market/instruments`, `${BLOFIN_REST_URL}/api/v1/market/tickers`]);
		expect(market).toMatchObject({ venue: 'blofin', instId: 'BTC-USDT', contractValue: '0.001', lotSize: '0.1', tickSize: '0.5', lastPrice: 90000 });
		expect(market.instrument).toEqual({ instrumentKey: 'blofin:linearPerp:BTC-USDT', venue: 'blofin', venueSymbol: 'BTC-USDT', product: 'linearPerp', baseAsset: 'BTC', quoteAsset: 'USDT', settlementAsset: 'USDT', contractMultiplier: '0.001', priceIncrement: '0.5', pricePrecision: { kind: 'fixedIncrement', increment: '0.5' }, sizeIncrement: '0.1' });
	});

	test('uses the isolated demo endpoint when requested', async () => {
		const urls = [];
		await fetchBlofinMarkets({ demo: true, fetcher: fixtureFetch(urls) });
		expect(urls[0]).toBe(`${BLOFIN_DEMO_REST_URL}/api/v1/market/instruments`);
	});

	test('does not expose malformed, suspended, or unpriced contracts', async () => {
		const fetcher = async (url) => {
			const data = String(url).endsWith('/instruments')
				? [{ ...instrument, state: 'suspend' }, { ...instrument, instId: 'ETH-USDT', tickSize: 'bad' }]
				: [ticker, { ...ticker, instId: 'ETH-USDT', last: 'NaN' }];
			return new Response(JSON.stringify({ code: '0', data }), { status: 200 });
		};
		expect(await fetchBlofinMarkets({ fetcher })).toEqual([]);
	});

	test('keeps venue-declared capabilities separate from Vice certification', () => {
		expect(BLOFIN_CAPABILITIES).toMatchObject({ venue: 'blofin', supportsPrivateStreams: true, privateStreamGuarantee: 'authenticatedReconciliation', supportsClientOrderIds: true, supportsWebSocketOrderEntry: false, supportsAmend: false, amendSemantics: 'none', certification: 'reviewOnly' });
	});
});
