import { describe, expect, test } from 'bun:test';
import fixture from './fixtures/instruments.json';
import { normalizeBlofinInstruments } from './markets';
import {
	BLOFIN_AMEND_ORDER_PATH,
	BLOFIN_CANCEL_ORDER_PATH,
	BLOFIN_ORDER_PATH,
	createBlofinExecution,
	normalizeBlofinOrderIntent
} from './execution.ts';

const market = normalizeBlofinInstruments(fixture)[0];
const demoAccount = {
	accountKey: 'blofin:demo:account-1',
	venue: 'blofin',
	credentialRef: 'credential-1',
	accountMode: 'futures:demo'
};
const demoSession = { venue: 'blofin', environment: 'demo', account: demoAccount, generation: 7, sessionId: 'session-demo-7' };
const productionSession = {
	venue: 'blofin',
	environment: 'production',
	account: { ...demoAccount, accountKey: 'blofin:production:account-1', accountMode: 'futures:production' },
	generation: 8,
	sessionId: 'session-production-8'
};

function intent(overrides = {}) {
	return {
		coin: 'BTC-USDT',
		isBuy: true,
		size: 0.1,
		limitPrice: 35000,
		marginMode: 'isolated',
		clientOrderId: 'client-order-1',
		...overrides
	};
}

function success(orderId = 'venue-order-1') {
	return { code: '0', msg: 'success', data: [{ orderId, clientOrderId: 'client-order-1' }] };
}

describe('BloFin basic execution payloads', () => {
	test('normalizes the four supported basic intents into exact order payloads', () => {
		const common = { instId: 'BTC-USDT', marginMode: 'isolated', side: 'buy', size: '0.1', clientOrderId: 'client-order-1' };
		expect(normalizeBlofinOrderIntent(market, intent())).toEqual({
			...common,
			orderType: 'limit',
			price: '35000'
		});
		expect(normalizeBlofinOrderIntent(market, intent({ tif: 'Alo' }))).toEqual({
			...common,
			orderType: 'post_only',
			price: '35000'
		});
		expect(normalizeBlofinOrderIntent(market, intent({ tif: 'Ioc' }))).toEqual({
			...common,
			orderType: 'ioc',
			price: '35000'
		});
		expect(normalizeBlofinOrderIntent(market, intent({ orderType: 'market', limitPrice: 0 }))).toEqual({
			...common,
			orderType: 'market'
		});
	});

	test('preserves the supplied client order ID in the request and acknowledgement', async () => {
		const requests = [];
		const client = createBlofinExecution({
			request: async (request) => {
				requests.push(request);
				return success('venue-order-42');
			},
			nowMs: () => 1700000000000
		});

		const ack = await client.place(demoSession, market, intent({ clientOrderId: 'preserve-me', commandId: 'command-42' }));
		expect(requests).toHaveLength(1);
		expect(requests[0]).toEqual({
			environment: 'demo',
			method: 'POST',
			requestPath: BLOFIN_ORDER_PATH,
			body: {
				instId: 'BTC-USDT',
				marginMode: 'isolated',
				side: 'buy',
				orderType: 'limit',
				price: '35000',
				size: '0.1',
				clientOrderId: 'preserve-me'
			}
		});
		expect(ack).toMatchObject({
			commandId: 'command-42',
			idempotencyKey: 'preserve-me',
			accepted: true,
			uncertain: false,
			venueOrderIds: ['venue-order-42'],
			sessionId: 'session-demo-7',
			sessionSequence: 7,
			gatewayReceiveUs: 1700000000000000,
			venueSendUs: 1700000000000000,
			completedUs: 1700000000000000
		});
	});
});

describe('BloFin execution identity and capability boundary', () => {
	test('rejects non-canonical market, account, and session identities before REST', async () => {
		let calls = 0;
		const client = createBlofinExecution({ request: async () => { calls += 1; return success(); } });
		expect(() => normalizeBlofinOrderIntent({ ...market, apiCoin: 'ETH-USDT' }, intent())).toThrow(/identity/i);
		await expect(client.place({ ...demoSession, venue: 'hyperliquid' }, market, intent())).rejects.toThrow(/session.*venue|identity/i);
		await expect(client.place({ ...demoSession, account: { ...demoAccount, venue: 'hyperliquid' } }, market, intent())).rejects.toThrow(/account.*venue|identity/i);
		await expect(client.place(demoSession, { ...market, instrument: { ...market.instrument, instrumentKey: 'blofin:linearPerp:ETH-USDT' } }, intent())).rejects.toThrow(/identity/i);
		expect(calls).toBe(0);
	});

	test('rejects hedge, advanced, trigger, and reduce-only intents', async () => {
		const client = createBlofinExecution({ request: async () => success() });
		for (const unsupported of [
			{ positionSide: 'long' },
			{ hedgeMode: true },
			{ orderType: 'twap' },
			{ triggerPrice: 34900 },
			{ triggerKind: 'stop' },
			{ reduceOnly: true }
		]) {
			await expect(client.place(demoSession, market, intent(unsupported))).rejects.toThrow(/unsupported|hedge|trigger|reduce/i);
		}
	});

	test('keeps review-only production mutations locked at the adapter boundary', async () => {
		let calls = 0;
		const client = createBlofinExecution({ request: async () => { calls += 1; return success(); } });
		await expect(client.place(productionSession, market, intent())).rejects.toThrow(/production.*not certified|reviewOnly/i);
		await expect(client.cancel(productionSession, market, 'venue-order-1')).rejects.toThrow(/production.*not certified|reviewOnly/i);
		await expect(client.amend(productionSession, market, 'venue-order-1', 35100)).rejects.toThrow(/production.*not certified|reviewOnly/i);
		expect(calls).toBe(0);
	});
});

describe('BloFin mutation outcomes', () => {
	test('never retries a mutation and reconciles a lost acknowledgement by client order ID', async () => {
		let calls = 0;
		const reconcileCalls = [];
		const client = createBlofinExecution({
			request: async () => {
				calls += 1;
				throw new Error('request timeout after send');
			},
			reconcile: async (input) => {
				reconcileCalls.push(input);
				return { pending: [], history: [], fills: [] };
			}
		});

		const ack = await client.place(demoSession, market, intent({ clientOrderId: 'lost-ack' }));
		expect(calls).toBe(1);
		expect(reconcileCalls).toHaveLength(1);
		expect(reconcileCalls[0]).toMatchObject({
			clientOrderId: 'lost-ack',
			instId: 'BTC-USDT',
			scopes: ['pending', 'history', 'fills']
		});
		expect(ack).toMatchObject({ accepted: false, uncertain: true, reconciled: false, venueOrderIds: [] });
	});

	test('returns a reconciled acceptance when the client ID appears in history or fills', async () => {
		const client = createBlofinExecution({
			request: async () => { throw new Error('network timeout'); },
			reconcile: async () => ({
				pending: [],
				history: [{ clientOrderId: 'reconcile-me', orderId: 'venue-order-77', state: 'filled' }],
				fills: [{ clientOrderId: 'reconcile-me', orderId: 'venue-order-77', tradeId: 'fill-1' }]
			})
		});

		const ack = await client.place(demoSession, intent({ clientOrderId: 'reconcile-me' }) && market, intent({ clientOrderId: 'reconcile-me' }));
		expect(ack).toMatchObject({ accepted: true, uncertain: false, reconciled: true, venueOrderIds: ['venue-order-77'] });
	});

	test('maps explicit REST errors to redacted rejected acknowledgements', async () => {
		const client = createBlofinExecution({
			request: async () => ({
				code: '150004',
				msg: 'Insufficient margin; secret=fixture-secret apiKey=fixture-api-key',
				data: []
			})
		});
		const ack = await client.place(demoSession, market, intent());
		expect(ack).toMatchObject({ accepted: false, uncertain: false, reconciled: false, venueOrderIds: [] });
		expect(ack.error).toContain('margin');
		expect(ack.error).not.toContain('fixture-secret');
		expect(ack.error).not.toContain('fixture-api-key');
	});
});

describe('BloFin cancel and amend', () => {
	test('sends exact instId and venue/client IDs for cancel and amend without retry', async () => {
		const requests = [];
		const client = createBlofinExecution({
			request: async (request) => {
				requests.push(request);
				return success('venue-order-77');
			}
		});
		const target = { orderId: 'venue-order-77', clientOrderId: 'client-order-77' };

		const cancelAck = await client.cancel(demoSession, market, target);
		const amendAck = await client.amend(demoSession, market, target, 35100);
		expect(cancelAck).toMatchObject({ accepted: true, venueOrderIds: ['venue-order-77'] });
		expect(amendAck).toMatchObject({ accepted: true, venueOrderIds: ['venue-order-77'] });
		expect(requests.map(({ requestPath, body }) => ({ requestPath, body }))).toEqual([
			{
				requestPath: BLOFIN_CANCEL_ORDER_PATH,
				body: { instId: 'BTC-USDT', orderId: 'venue-order-77', clientOrderId: 'client-order-77' }
			},
			{
				requestPath: BLOFIN_AMEND_ORDER_PATH,
				body: { instId: 'BTC-USDT', orderId: 'venue-order-77', clientOrderId: 'client-order-77', newPrice: '35100' }
			}
		]);
	});
});
