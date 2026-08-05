/**
 * hermes-sidecar — server.test.js
 *
 * Runtime gate for the sidecar transport. Verifies the fail-closed contract:
 * token required on /api/*, execution routes reject while the vault is locked,
 * /api/algo stays 501 (P3), testnet default, mainnet locked without ACK.
 * Happy-path place/cancel exercise the execution-bridge with an injected mock
 * LocalExecutionClient — never the live venue.
 *
 * Does NOT hit the network: HOME is pointed at an empty temp dir so the
 * dev-convenience account resolution finds no evidence wallet, boot does not
 * prime real state, and every execution route fails at the locked gate unless
 * a mock client is injected.
 */
import { describe, test, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import './env-plugin';

const baseEnv = {
	VITE_HL_NETWORK: 'testnet',
	VITE_HL_TRADING_KILL_SWITCH: 'false'
};

process.env.HOME = mkdtempSync(join(tmpdir(), 'vice-sidecar-test-'));
process.env.VICE_SIDECAR_TOKEN = 'test-token-0123456789abcdef';
process.env.VICE_SIDECAR_PORT = '0'; // ephemeral port for tests
globalThis.__viceEnv = { ...baseEnv };

const { startServer } = await import('./server');
const { loadConfig } = await import('./config');
const { setExecutionClient, clearExecutionClient } = await import('./execution-bridge');
const { __resetConfigForTest } = await import('./execution');
const { setRefreshStateOverride } = await import('./state');
const {
	marketRegistry,
	openOrders,
	positions,
	selectedMarket,
	walletAddress,
	accountSyncStatus,
	marketDataStatus,
	isConnected
} = await import('../stores');

let server;
let base;

beforeAll(async () => {
	// Never hit the live venue from unit tests — post-mutation refresh is a no-op.
	setRefreshStateOverride(async () => undefined);
	server = await startServer();
	base = `http://127.0.0.1:${server.server.port}`;
});

afterAll(() => {
	setRefreshStateOverride(null);
	server.server.stop();
});

afterEach(() => {
	clearExecutionClient();
	globalThis.__viceEnv = { ...baseEnv };
	marketRegistry.set([]);
	openOrders.set([]);
	positions.set([]);
	selectedMarket.set(null);
	walletAddress.set(null);
	accountSyncStatus.set('idle');
	marketDataStatus.set('idle');
	isConnected.set(false);
});

const auth = { headers: { authorization: 'Bearer test-token-0123456789abcdef' } };
const testOwnerKey = generatePrivateKey();
const testOwner = privateKeyToAccount(testOwnerKey);

function seedTestOwnerWallet() {
	const dir = join(process.env.HOME, '.vice-testnet');
	mkdirSync(dir, { recursive: true, mode: 0o700 });
	writeFileSync(
		join(dir, 'owner.json'),
		JSON.stringify({ address: testOwner.address, privateKey: testOwnerKey }),
		{ mode: 0o600 }
	);
}

function btcMarket() {
	return {
		marketKey: 'HL:perp:BTC',
		apiCoin: 'BTC',
		assetId: 0,
		kind: 'corePerp',
		dex: null,
		baseToken: 'BTC',
		quoteToken: 'USD',
		szDecimals: 5,
		priceDecimals: 1,
		symbol: 'BTC',
		name: 'BTC',
		type: 'perp',
		lastPrice: 50000,
		change24h: 0,
		changePercent24h: 0,
		volume24h: 0,
		tradingAvailability: 'available',
		instrument: {
			venue: 'hyperliquid',
			kind: 'perp',
			apiCoin: 'BTC',
			marketKey: 'HL:perp:BTC',
			assetId: 0
		}
	};
}

function ack(overrides = {}) {
	return {
		commandId: 'cmd-test',
		sessionId: 'sess-test',
		sessionSequence: 1,
		idempotencyKey: 'idem-test',
		accepted: true,
		venueOrderIds: ['42'],
		gatewayReceiveUs: 1,
		venueSendUs: 2,
		completedUs: 3,
		...overrides
	};
}

/** Inject a ready mock client and seed the stores the transport needs. */
function unlockWithMock(handlers = {}) {
	const placed = [];
	const cancelled = [];
	const modified = [];
	const client = {
		isReady: () => true,
		lock: () => undefined,
		placeOrder: async (market, intent) => {
			placed.push({ market, intent });
			if (handlers.placeOrder) return handlers.placeOrder(market, intent);
			return ack();
		},
		cancelOrder: async (market, orderId) => {
			cancelled.push({ market, orderId });
			if (handlers.cancelOrder) return handlers.cancelOrder(market, orderId);
			return ack({ venueOrderIds: [orderId] });
		},
		modifyOrder: async (market, order, newPrice) => {
			modified.push({ market, order, newPrice });
			if (handlers.modifyOrder) return handlers.modifyOrder(market, order, newPrice);
			return ack({ venueOrderIds: [order.id] });
		}
	};
	setExecutionClient(client);
	const market = btcMarket();
	marketRegistry.set([market]);
	selectedMarket.set(market);
	walletAddress.set('0x60e5f5ec558a1e7E5399765f58a0a245bab0142e');
	accountSyncStatus.set('live');
	marketDataStatus.set('live');
	isConnected.set(true);
	return { client, placed, cancelled, modified, market };
}

/** Seed the authoritative open-order store with one resting BTC order. */
function seedOpenOrder(overrides = {}) {
	const order = {
		id: 'ord-1',
		clientOrderId: 'cloid-1',
		market: 'BTC',
		apiCoin: 'BTC',
		marketKey: 'HL:perp:BTC',
		side: 'sell',
		type: 'limit',
		price: 51000,
		size: 0.5,
		filled: 0,
		remaining: 0.5,
		status: 'open',
		reduceOnly: false,
		postOnly: false,
		timestamp: Date.now(),
		...overrides
	};
	openOrders.set([order]);
	return order;
}

describe('hermes-sidecar transport', () => {
	test('health is open and reports testnet + version + locked vault', async () => {
		const res = await fetch(`${base}/health`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.network).toBe('testnet');
		expect(body.isTestnet).toBe(true);
		expect(typeof body.version).toBe('string');
		expect(body.unlocked).toBe(false);
	});

	test('/api/state rejects missing token', async () => {
		const res = await fetch(`${base}/api/state`);
		expect(res.status).toBe(401);
	});

	test('/api/state rejects wrong token', async () => {
		const res = await fetch(`${base}/api/state`, {
			headers: { authorization: 'Bearer wrong-token' }
		});
		expect(res.status).toBe(401);
	});

	test('/api/state accepts the token and returns the offline snapshot shape', async () => {
		const res = await fetch(`${base}/api/state`, auth);
		expect(res.status).toBe(200);
		const body = await res.json();
		// The boot-time market-registry prime is fire-and-forget and flips
		// `initialized` as soon as it settles (warm localStorage catalog or a
		// fast venue 429), so only the shape contract is deterministic here.
		expect(typeof body.initialized).toBe('boolean');
		expect(Array.isArray(body.positions)).toBe(true);
		expect(Array.isArray(body.openOrders)).toBe(true);
		expect(Array.isArray(body.markets)).toBe(true);
		expect(typeof body.serverTimeMs).toBe('number');
	});

	test('/api/execute rejects while the vault is locked', async () => {
		const res = await fetch(`${base}/api/execute`, {
			method: 'POST',
			...auth,
			body: JSON.stringify({ coin: 'BTC', isBuy: true, size: 0.001, limitPrice: 50000 })
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toContain('locked');
	});

	test('/api/execute rejects missing token', async () => {
		const res = await fetch(`${base}/api/execute`, {
			method: 'POST',
			body: JSON.stringify({ coin: 'BTC', isBuy: true, size: 0.001, limitPrice: 50000 })
		});
		expect(res.status).toBe(401);
	});

	test('/api/execute rejects wrong token', async () => {
		const res = await fetch(`${base}/api/execute`, {
			method: 'POST',
			headers: { authorization: 'Bearer wrong-token' },
			body: JSON.stringify({ coin: 'BTC', isBuy: true, size: 0.001, limitPrice: 50000 })
		});
		expect(res.status).toBe(401);
	});

	test('/api/unlock rejects an invalid address without touching the network', async () => {
		const res = await fetch(`${base}/api/unlock`, {
			method: 'POST',
			...auth,
			body: JSON.stringify({ challenge: 'x'.repeat(32), address: 'not-an-address' })
		});
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toContain('invalid');
	});

	test('/api/unlock rejects a too-short challenge', async () => {
		const res = await fetch(`${base}/api/unlock`, {
			method: 'POST',
			...auth,
			body: JSON.stringify({ challenge: 'short', address: '0x60e5f5ec558a1e7E5399765f58a0a245bab0142e' })
		});
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toContain('challenge');
	});

	test('/api/unlock initializes the certified client and never returns key material', async () => {
		seedTestOwnerWallet();
		const initialized = [];
		setExecutionClient({
			isReady: () => true,
			lock: () => undefined,
			initialize: async (provider, address) => {
				initialized.push(address);
				expect(await provider.request({ method: 'eth_accounts' })).toEqual([testOwner.address]);
			},
			placeOrder: async () => ack(),
			cancelOrder: async (_market, orderId) => ack({ venueOrderIds: [orderId] })
		});
		const challenge = 'p2-server-test-unlock-challenge-0123456789';
		const res = await fetch(`${base}/api/unlock`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ challenge, address: testOwner.address })
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ ok: true, mainAddress: testOwner.address });
		expect(initialized).toEqual([testOwner.address]);
		const serialized = JSON.stringify(body).toLowerCase();
		expect(serialized).not.toContain(testOwnerKey.toLowerCase());
		expect(serialized).not.toMatch(/privatekey|mnemonic|seed|secret/);
	});

	test('/api/unlock config-flip: builder env turns on the one-time 0.1 bp approval (P5)', async () => {
		seedTestOwnerWallet();
		const received = [];
		setExecutionClient({
			isReady: () => true,
			lock: () => undefined,
			initialize: async (provider, address, opts) => {
				received.push({ address, opts: opts ?? {} });
			},
			placeOrder: async () => ack(),
			cancelOrder: async (_market, orderId) => ack({ venueOrderIds: [orderId] })
		});
		const challenge = 'p2-server-test-unlock-challenge-0123456789';
		// Enabled: address + ENABLE_BUILDER_REVENUE=true must reach client.initialize.
		__resetConfigForTest();
		globalThis.__viceEnv = {
			...baseEnv,
			VITE_HL_ENABLE_BUILDER_REVENUE: 'true',
			VITE_HL_BUILDER_ADDRESS: '0x0000000000000000000000000000000000000001'
		};
		let res = await fetch(`${base}/api/unlock`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ challenge, address: testOwner.address })
		});
		expect(res.status).toBe(200);
		expect(received.length).toBe(1);
		expect(received[0].address).toBe(testOwner.address);
		expect(received[0].opts.approveBuilder).toBe(true);
		// Default (no builder env): approveBuilder must stay false — vanilla unbranded.
		__resetConfigForTest();
		globalThis.__viceEnv = { ...baseEnv };
		received.length = 0;
		res = await fetch(`${base}/api/unlock`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ challenge, address: testOwner.address })
		});
		expect(res.status).toBe(200);
		expect(received.length).toBe(1);
		expect(received[0].opts.approveBuilder).toBe(false);
		__resetConfigForTest();
	});

	test('/api/cancel-all rejects while locked', async () => {
		const res = await fetch(`${base}/api/cancel-all`, { method: 'POST', ...auth, body: '{}' });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
	});

	test('/api/flatten rejects while locked', async () => {
		const res = await fetch(`${base}/api/flatten`, { method: 'POST', ...auth, body: '{}' });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
	});

	test('/api/reverse rejects while locked', async () => {
		const res = await fetch(`${base}/api/reverse`, {
			method: 'POST',
			...auth,
			body: JSON.stringify({ positionId: 'x' })
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
	});

	test('/api/modify rejects while locked', async () => {
		const res = await fetch(`${base}/api/modify`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ coin: 'BTC', orderId: 'ord-1', newPrice: 52000 })
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toContain('locked');
	});

	test('/api/modify rejects a non-positive price before any signed call', async () => {
		unlockWithMock();
		seedOpenOrder();
		const res = await fetch(`${base}/api/modify`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ coin: 'BTC', orderId: 'ord-1', newPrice: 0 })
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toContain('positive');
	});

	test('/api/modify rejects an unknown order id without a signed call', async () => {
		const { modified } = unlockWithMock();
		const res = await fetch(`${base}/api/modify`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ coin: 'BTC', orderId: 'ghost', newPrice: 52000 })
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toContain('Authoritative order state');
		expect(modified).toHaveLength(0);
	});

	test('/api/modify rejects an order whose identity mismatches the market', async () => {
		const { modified } = unlockWithMock();
		seedOpenOrder({ id: 'ord-eth', apiCoin: 'ETH' });
		const res = await fetch(`${base}/api/modify`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ coin: 'BTC', orderId: 'ord-eth', newPrice: 52000 })
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toContain('does not match');
		expect(modified).toHaveLength(0);
	});

	test('/api/algo stays 501 until the P3 gate', async () => {
		const res = await fetch(`${base}/api/algo`, { method: 'POST', ...auth, body: '{}' });
		expect(res.status).toBe(501);
		const body = await res.json();
		expect(body.error).toContain('P3');
	});

	test('/api/lock is safe while already locked', async () => {
		const res = await fetch(`${base}/api/lock`, { method: 'POST', ...auth, body: '{}' });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
	});

	test('unknown routes 404', async () => {
		const res = await fetch(`${base}/api/nope`, auth);
		expect(res.status).toBe(404);
	});
});

describe('hermes-sidecar config fail-closed', () => {
	test('mainnet without ACK throws', () => {
		globalThis.__viceEnv = { VITE_HL_NETWORK: 'mainnet' };
		expect(() => loadConfig()).toThrow(/Mainnet is locked/);
		globalThis.__viceEnv = { ...baseEnv };
	});

	test('missing token refuses to load', () => {
		const saved = process.env.VICE_SIDECAR_TOKEN;
		delete process.env.VICE_SIDECAR_TOKEN;
		expect(() => loadConfig()).toThrow(/VICE_SIDECAR_TOKEN is required/);
		process.env.VICE_SIDECAR_TOKEN = saved;
	});

	test('kill switch surfaces in config', () => {
		globalThis.__viceEnv = { ...baseEnv, VITE_HL_TRADING_KILL_SWITCH: 'true' };
		const cfg = loadConfig();
		expect(cfg.killSwitch).toBe(true);
		globalThis.__viceEnv = { ...baseEnv };
	});

	test('execute honors the kill switch', async () => {
		globalThis.__viceEnv = { ...baseEnv, VITE_HL_TRADING_KILL_SWITCH: 'true' };
		// Even with a ready mock client, kill switch must win.
		unlockWithMock();
		const res = await fetch(`${base}/api/execute`, {
			method: 'POST',
			...auth,
			body: JSON.stringify({ coin: 'BTC', isBuy: true, size: 0.001, limitPrice: 50000 })
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toMatch(/kill switch/i);
		globalThis.__viceEnv = { ...baseEnv };
	});
});

describe('hermes-sidecar execution-bridge happy path', () => {
	test('execute places through the injected LocalExecutionClient', async () => {
		const { placed, market } = unlockWithMock();
		const res = await fetch(`${base}/api/execute`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({
				coin: 'BTC',
				isBuy: true,
				size: 0.001,
				limitPrice: 50000,
				orderType: 'limit'
			})
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.ack?.accepted).toBe(true);
		expect(body.ack?.venueOrderIds).toEqual(['42']);
		expect(placed).toHaveLength(1);
		expect(placed[0].market.apiCoin).toBe(market.apiCoin);
		expect(placed[0].intent.coin).toBe('BTC');
		expect(placed[0].intent.isBuy).toBe(true);
		expect(placed[0].intent.size).toBe(0.001);
		expect(placed[0].intent.limitPrice).toBe(50000);
		expect(placed[0].intent.tif).toBe('Gtc');
	});

	test('execute market order applies the certified ±3% buffer', async () => {
		const { placed } = unlockWithMock();
		const res = await fetch(`${base}/api/execute`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({
				coin: 'BTC',
				isBuy: true,
				size: 0.01,
				limitPrice: 100,
				orderType: 'market'
			})
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(placed).toHaveLength(1);
		expect(placed[0].intent.limitPrice).toBeCloseTo(103, 5);
		expect(placed[0].intent.tif).toBe('Ioc');
	});

	test('execute rejects invalid size without calling the client', async () => {
		const { placed } = unlockWithMock();
		const res = await fetch(`${base}/api/execute`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ coin: 'BTC', isBuy: true, size: -1, limitPrice: 50000 })
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toMatch(/size/i);
		expect(placed).toHaveLength(0);
	});

	test('execute rejects unregistered market without calling the client', async () => {
		const { placed } = unlockWithMock();
		const res = await fetch(`${base}/api/execute`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ coin: 'DOESNOTEXIST', isBuy: true, size: 0.001, limitPrice: 1 })
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toMatch(/Unregistered market/i);
		expect(placed).toHaveLength(0);
	});

	test('/api/cancel-all dispatches cancelOrder per open order through the bridge', async () => {
		const { cancelled, market } = unlockWithMock({
			cancelOrder: async (_market, orderId) => {
				// Simulate successful cancel: drop the order from the open set so
				// the certified reconcileCancelAllOutcomes sees a clean snapshot.
				openOrders.update((orders) => orders.filter((o) => o.id !== orderId));
				return ack({ venueOrderIds: [orderId] });
			}
		});
		openOrders.set([
			{
				id: '11',
				market: 'BTC',
				apiCoin: 'BTC',
				marketKey: market.marketKey,
				side: 'buy',
				type: 'limit',
				size: 0.001,
				filled: 0,
				remaining: 0.001,
				status: 'open',
				reduceOnly: false,
				postOnly: false,
				timestamp: Date.now()
			},
			{
				id: '22',
				market: 'BTC',
				apiCoin: 'BTC',
				marketKey: market.marketKey,
				side: 'sell',
				type: 'limit',
				size: 0.002,
				filled: 0,
				remaining: 0.002,
				status: 'open',
				reduceOnly: false,
				postOnly: false,
				timestamp: Date.now()
			}
		]);
		const res = await fetch(`${base}/api/cancel-all`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ scope: 'both' })
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(cancelled.map((c) => c.orderId).sort()).toEqual(['11', '22']);
		expect(body.detail?.targets).toBe(2);
	});

	test('modify reprices the seeded open order through the injected client', async () => {
		const { modified, market } = unlockWithMock();
		const order = seedOpenOrder();
		const res = await fetch(`${base}/api/modify`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ coin: 'BTC', orderId: order.id, newPrice: 52000 })
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.ack?.accepted).toBe(true);
		expect(modified).toHaveLength(1);
		expect(modified[0].market.apiCoin).toBe(market.apiCoin);
		expect(modified[0].order.id).toBe(order.id);
		expect(modified[0].newPrice).toBe(52000);
	});

	test('modify surface fails closed when the active client omits modifyOrder', async () => {
		const { client } = unlockWithMock();
		delete client.modifyOrder;
		seedOpenOrder();
		const res = await fetch(`${base}/api/modify`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ coin: 'BTC', orderId: 'ord-1', newPrice: 52000 })
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toContain('does not support modify');
	});

	test('flatten closes each position through placeOrder (reduce-only)', async () => {
		const { placed, market } = unlockWithMock();
		positions.set([
			{
				id: 'pos-1',
				market: 'BTC',
				apiCoin: 'BTC',
				marketKey: market.marketKey,
				side: 'long',
				size: 0.5,
				entryPrice: 49000,
				markPrice: 50000,
				unrealizedPnl: 500,
				realizedPnl: 0
			}
		]);
		const res = await fetch(`${base}/api/flatten`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ scope: 'both' })
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(placed).toHaveLength(1);
		expect(placed[0].intent.reduceOnly).toBe(true);
		expect(placed[0].intent.isBuy).toBe(false); // long → sell to close
		expect(placed[0].intent.size).toBe(0.5);
	});

	test('reverse closes and reopens the position through two certified legs', async () => {
		const { placed, market } = unlockWithMock();
		positions.set([
			{
				id: 'pos-reverse',
				market: 'BTC',
				apiCoin: 'BTC',
				marketKey: market.marketKey,
				side: 'long',
				size: 0.5,
				entryPrice: 49000,
				markPrice: 50000,
				unrealizedPnl: 500,
				realizedPnl: 0
			}
		]);
		const res = await fetch(`${base}/api/reverse`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ positionId: 'pos-reverse' })
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(placed).toHaveLength(2);
		expect(placed[0].intent.reduceOnly).toBe(true);
		expect(placed[0].intent.isBuy).toBe(false);
		expect(placed[1].intent.reduceOnly).toBe(false);
		expect(placed[1].intent.isBuy).toBe(false); // long -> short
	});

	test('reverse of a short mirrors the long rule: buy close then buy reopen to long', async () => {
		const { placed, market } = unlockWithMock();
		positions.set([
			{
				id: 'pos-reverse-short',
				market: 'BTC',
				apiCoin: 'BTC',
				marketKey: market.marketKey,
				side: 'short',
				size: 0.25,
				entryPrice: 51000,
				markPrice: 50000,
				unrealizedPnl: 250,
				realizedPnl: 0
			}
		]);
		const res = await fetch(`${base}/api/reverse`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ positionId: 'pos-reverse-short' })
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(placed).toHaveLength(2);
		expect(placed[0].intent.reduceOnly).toBe(true);
		expect(placed[0].intent.isBuy).toBe(true); // short -> buy to close
		expect(placed[1].intent.reduceOnly).toBe(false);
		expect(placed[1].intent.isBuy).toBe(true); // short -> long
	});

	test('reverse does not open the second leg after a close rejection', async () => {
		const { placed, market } = unlockWithMock({
			placeOrder: async () => ack({ accepted: false, venueOrderIds: [], error: 'venue rejected close' })
		});
		positions.set([
			{
				id: 'pos-partial',
				market: 'BTC',
				apiCoin: 'BTC',
				marketKey: market.marketKey,
				side: 'short',
				size: 0.25,
				entryPrice: 51000,
				markPrice: 50000,
				unrealizedPnl: 250,
				realizedPnl: 0
			}
		]);
		const res = await fetch(`${base}/api/reverse`, {
			method: 'POST',
			...auth,
			headers: { ...auth.headers, 'content-type': 'application/json' },
			body: JSON.stringify({ positionId: 'pos-partial' })
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error).toContain('close leg');
		expect(placed).toHaveLength(1);
	});

	test('health reports unlocked after mock client is ready', async () => {
		unlockWithMock();
		const res = await fetch(`${base}/health`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.unlocked).toBe(true);
	});
});
