import { describe, expect, test } from 'bun:test';
import { LIGHTER_CAPABILITIES, LIGHTER_MAINNET_REST_URL, LIGHTER_TESTNET_REST_URL, fetchLighterCatalog } from './public.ts';

const perp = { symbol: 'ETH', market_id: 0, market_type: 'perp', status: 'active', min_base_amount: '0.001', multiplier: '1.000000', price_decimals: 2, size_decimals: 3, mark_price: '2000.00' };
const spot = { symbol: 'ETH/USDC', market_id: 2048, market_type: 'spot', status: 'active', min_base_amount: '0.005', multiplier: '1.000000', price_decimals: 2, size_decimals: 4, last_trade_price: 2000 };

function fixtureFetch(urls, body = { code: 200, order_book_details: [perp], spot_order_book_details: [spot] }) {
	return async (url) => {
		urls.push(String(url));
		return new Response(JSON.stringify(body), { status: 200 });
	};
}

describe('Lighter public catalog boundary', () => {
	test('keeps incomplete perpetual metadata non-routable and creates an exact spot identity', async () => {
		const urls = [];
		const [perpRecord, spotRecord] = await fetchLighterCatalog({ fetcher: fixtureFetch(urls) });
		expect(urls).toEqual([`${LIGHTER_MAINNET_REST_URL}/api/v1/orderBookDetails`]);
		expect(perpRecord).toMatchObject({ venue: 'lighter', marketId: 0, venueSymbol: 'ETH', tradingAvailability: 'metadataOnly' });
		expect(perpRecord.instrument).toBeUndefined();
		expect(spotRecord.instrument).toEqual({ instrumentKey: 'lighter:spot:2048:ETH/USDC', venue: 'lighter', venueSymbol: 'ETH/USDC', product: 'spot', baseAsset: 'ETH', quoteAsset: 'USDC', settlementAsset: 'USDC', contractMultiplier: '1.000000', priceIncrement: '0.01', pricePrecision: { kind: 'fixedIncrement', increment: '0.01' }, sizeIncrement: '0.0001' });
	});

	test('uses the distinct testnet origin only when requested', async () => {
		const urls = [];
		await fetchLighterCatalog({ testnet: true, fetcher: fixtureFetch(urls) });
		expect(urls[0]).toBe(`${LIGHTER_TESTNET_REST_URL}/api/v1/orderBookDetails`);
	});

	test('rejects inactive, malformed, or unpriced records rather than fabricating terms', async () => {
		const body = { code: 200, order_book_details: [{ ...perp, status: 'inactive' }], spot_order_book_details: [{ ...spot, symbol: 'ETHUSDC' }, { ...spot, last_trade_price: 0 }] };
		expect(await fetchLighterCatalog({ fetcher: fixtureFetch([], body) })).toEqual([]);
	});

	test('keeps venue API documentation separate from Vice certification', () => {
		expect(LIGHTER_CAPABILITIES).toMatchObject({ venue: 'lighter', supportsAmend: true, amendSemantics: 'inPlace', supportsClientOrderIds: true, supportsWebSocketOrderEntry: true, privateStreamGuarantee: 'authenticatedSnapshot', certification: 'reviewOnly' });
	});
});
