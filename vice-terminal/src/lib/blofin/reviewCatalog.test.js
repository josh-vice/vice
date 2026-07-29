import { describe, expect, test } from 'bun:test';
import { fetchBlofinReviewCatalog } from './reviewCatalog.ts';

const market = {
	venue: 'blofin', instId: 'BTC-USDT', baseCurrency: 'BTC', quoteCurrency: 'USDT',
	contractValue: '0.001', minSize: '1', lotSize: '1', tickSize: '0.1', maxLeverage: '125',
	contractType: 'linear', assetClass: 'crypto', lastPrice: 100000, open24h: 99000,
	volumeContracts24h: 10, volumeBase24h: 0.01
};

describe('BloFin review catalog client', () => {
	test('uses only the same-origin read-only review route and validates its catalog', async () => {
		let request = '';
		const result = await fetchBlofinReviewCatalog(async (url) => {
			request = String(url);
			return new Response(JSON.stringify({ markets: [market] }), { status: 200 });
		}, true);
		expect(request).toBe('/api/blofin/public/catalog?environment=demo');
		expect(result).toEqual([market]);
	});

	test('rejects failed or malformed same-origin responses', async () => {
		await expect(fetchBlofinReviewCatalog(async () => new Response('', { status: 502 }))).rejects.toThrow('HTTP 502');
		await expect(fetchBlofinReviewCatalog(async () => new Response(JSON.stringify({ markets: [{ instId: 'BTC-USDT' }] })))).rejects.toThrow('invalid catalog');
	});
});
