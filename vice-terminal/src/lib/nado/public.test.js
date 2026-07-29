import { describe, expect, test } from 'bun:test';
import { NADO_CAPABILITIES, NADO_MAINNET_ARCHIVE_URL, NADO_TESTNET_ARCHIVE_URL, fetchNadoCatalog } from './public.ts';

const perp = { product_id: 2, ticker_id: 'BTC-PERP_USDT0', base_currency: 'BTC-PERP', quote_currency: 'USDT0', product_type: 'perpetual', mark_price: 100000 };
const spot = { product_id: 1, ticker_id: 'KBTC_USDT0', base_currency: 'KBTC', quote_currency: 'USDT0', product_type: 'spot', mark_price: 100000 };

function fixtureFetch(urls, body = { [perp.ticker_id]: perp, [spot.ticker_id]: spot }) {
	return async (url) => {
		urls.push(String(url));
		return new Response(JSON.stringify(body), { status: 200 });
	};
}

describe('Nado public catalog boundary', () => {
	test('retains exact product identifiers but keeps missing execution terms non-routable', async () => {
		const urls = [];
		const records = await fetchNadoCatalog({ fetcher: fixtureFetch(urls) });
		expect(urls).toEqual([`${NADO_MAINNET_ARCHIVE_URL}/contracts`]);
		expect(records).toEqual([
			expect.objectContaining({ venue: 'nado', productId: 2, tickerId: 'BTC-PERP_USDT0', product: 'linearPerp', tradingAvailability: 'metadataOnly' }),
			expect.objectContaining({ venue: 'nado', productId: 1, tickerId: 'KBTC_USDT0', product: 'spot', tradingAvailability: 'metadataOnly' })
		]);
	});

	test('uses the testnet archive only when requested', async () => {
		const urls = [];
		await fetchNadoCatalog({ testnet: true, fetcher: fixtureFetch(urls) });
		expect(urls[0]).toBe(`${NADO_TESTNET_ARCHIVE_URL}/contracts`);
	});

	test('rejects malformed, unsupported, and unpriced contract records', async () => {
		const body = { inactive: { ...perp, mark_price: 0 }, malformed: { ...spot, product_type: 'option' }, missing: { ...spot, ticker_id: '' } };
		expect(await fetchNadoCatalog({ fetcher: fixtureFetch([], body) })).toEqual([]);
	});

	test('does not confuse documented venue transport with Vice certification', () => {
		expect(NADO_CAPABILITIES).toMatchObject({ venue: 'nado', supportsWebSocketOrderEntry: true, supportsPrivateStreams: true, privateStreamGuarantee: 'authenticatedDelta', certification: 'reviewOnly' });
	});
});
