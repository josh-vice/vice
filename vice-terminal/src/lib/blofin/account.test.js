import { describe, expect, test } from 'bun:test';
import balances from './fixtures/balances.json';
import positions from './fixtures/positions.json';
import orders from './fixtures/orders-pending.json';
import fills from './fixtures/fills.json';
import { normalizeBlofinAccountSnapshot } from './account';

const NOW = 1700000005000;
const account = {
	accountKey: 'blofin:demo:account-1',
	venue: 'blofin',
	credentialRef: 'credential-1',
	accountMode: 'futures:demo'
};

function input(overrides = {}) {
	return {
		balances,
		positions,
		orders,
		fills,
		receivedAtMs: NOW,
		...overrides
	};
}

describe('BloFin private account projection', () => {
	test('normalizes balances, one-way positions, pending orders, and fills', () => {
		const snapshot = normalizeBlofinAccountSnapshot(input(), account, NOW);

		expect(snapshot.account).toEqual(account);
		expect(snapshot.balances[0]).toMatchObject({ asset: 'USDT', total: 10000, available: 8500, inOrders: 1500, equity: 10025.5 });
		expect(snapshot.positions[0]).toMatchObject({
			id: 'blofin:blofin:demo:account-1:position:position-1',
			market: 'BTC-USDT',
			marketKey: 'blofin:linearPerp:BTC-USDT',
			side: 'long',
			size: 0.1,
			entryPrice: 35000,
			markPrice: 35100
		});
		expect(snapshot.orders[0]).toMatchObject({
			id: 'blofin:blofin:demo:account-1:order:order-1',
			clientOrderId: 'client-1',
			status: 'open',
			remaining: 0.1,
			postOnly: true
		});
		expect(snapshot.fills[0]).toMatchObject({
			id: 'blofin:blofin:demo:account-1:fill:trade-1',
			orderId: 'blofin:blofin:demo:account-1:order:order-1',
			price: 34900,
			size: 0.1
		});
	});

	test('rejects the wrong venue/account identity and stale snapshots', () => {
		expect(() => normalizeBlofinAccountSnapshot(input(), { ...account, venue: 'hyperliquid' }, NOW)).toThrow('identity');
		expect(() => normalizeBlofinAccountSnapshot(input({ receivedAtMs: NOW - 60001 }), account, NOW)).toThrow('stale');
	});

	test('rejects nonzero response envelopes and malformed numeric fields', () => {
		expect(() => normalizeBlofinAccountSnapshot(input({ balances: { ...balances, code: '500' } }), account, NOW)).toThrow('successful');
		expect(() => normalizeBlofinAccountSnapshot(input({ positions: { ...positions, data: [{ ...positions.data[0], markPrice: 'NaN' }] } }), account, NOW)).toThrow('mark price');
	});

	test('fails closed for hedge or multi-position records', () => {
		const hedge = { ...positions, data: [{ ...positions.data[0], positionSide: 'long' }] };
		expect(() => normalizeBlofinAccountSnapshot(input({ positions: hedge }), account, NOW)).toThrow('hedge');
	});

	test('scopes duplicate bare IDs by account and venue', () => {
		const second = { ...account, accountKey: 'blofin:demo:account-2', credentialRef: 'credential-2' };
		const firstOrder = normalizeBlofinAccountSnapshot(input(), account, NOW).orders[0].id;
		const secondOrder = normalizeBlofinAccountSnapshot(input(), second, NOW).orders[0].id;
		expect(firstOrder).not.toBe(secondOrder);
	});
});
