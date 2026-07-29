import { describe, expect, test } from 'bun:test';
import { fetchBlofinPrivateSnapshot } from './private.ts';

const credentials = { apiKey: 'key', secretKey: 'secret', passphrase: 'passphrase', permissions: ['READ'] };
const position = { positionId: 'p-1', instId: 'BTC-USDT', positionSide: 'net', positions: '-1', availablePositions: '-1', averagePrice: '90000', markPrice: '90100', liquidationPrice: '50000', unrealizedPnl: '100', leverage: '3', updateTime: '1700000000000' };
const order = { orderId: 'o-1', clientOrderId: 'vice-1', instId: 'BTC-USDT', side: 'sell', orderType: 'limit', price: '91000', size: '1', filledSize: '0', reduceOnly: 'true', state: 'live', updateTime: '1700000000001' };

function privateFetch(requests, overrides = {}) {
	return async (url, init) => {
		requests.push({ url: String(url), headers: init.headers });
		const path = String(url);
		const data = path.includes('/balances') ? [{ currency: 'USDT', balance: '1000', available: '900', frozen: '100' }]
			: path.includes('/positions') ? [overrides.position ?? position]
			: [overrides.order ?? order];
		return new Response(JSON.stringify({ code: '0', data }), { status: 200 });
	};
}

describe('BloFin private account snapshot', () => {
	test('signs and validates balances, positions, and exact open-order identity as one snapshot', async () => {
		const requests = [];
		const snapshot = await fetchBlofinPrivateSnapshot(credentials, 'demo', { fetcher: privateFetch(requests), now: 1700000000000, keyFingerprint: '0123456789abcdef01234567', nonceFactory: (() => { let id = 0; return () => `nonce-${++id}`; })() });
		expect(new Set(requests.map((request) => request.url))).toEqual(new Set([
			'https://demo-trading-openapi.blofin.com/api/v1/asset/balances?accountType=futures',
			'https://demo-trading-openapi.blofin.com/api/v1/account/positions',
			'https://demo-trading-openapi.blofin.com/api/v1/trade/orders-pending'
		]));
		expect(new Set(requests.map((request) => request.headers['ACCESS-NONCE'])).size).toBe(3);
		expect(snapshot).toMatchObject({ venue: 'blofin', environment: 'demo', account: { accountKey: 'blofin:demo:0123456789abcdef01234567', venue: 'blofin', credentialRef: '0123456789abcdef01234567', accountMode: 'futures:demo' }, positions: [{ instId: 'BTC-USDT', positions: '-1' }], openOrders: [{ orderId: 'o-1', clientOrderId: 'vice-1', reduceOnly: true }] });
	});

	test('rejects the entire snapshot when a private row loses exact identity', async () => {
		await expect(fetchBlofinPrivateSnapshot(credentials, 'demo', { fetcher: privateFetch([], { order: { ...order, instId: '' } }) })).rejects.toThrow('missing instId');
	});
});
