import { describe, expect, test, beforeEach } from 'bun:test';
import { marketRegistry } from '../stores';
import { createRunnerBoundaryServices } from './runnerBoundary';
import { createRunnerState, runJob } from './runner';

function btcMarket() {
	return {
		marketKey: 'hyperliquid:BTC',
		apiCoin: 'BTC',
		assetId: 0,
		kind: 'corePerp',
		dex: 'hyperliquid',
		baseToken: 'BTC',
		quoteToken: 'USDC',
		szDecimals: 4,
		priceDecimals: 1,
		symbol: 'BTC',
		name: 'Bitcoin',
		type: 'perp',
		lastPrice: 60_000,
		change24h: 0,
		changePercent24h: 0,
		volume24h: 1_000_000,
		tradingAvailability: 'available'
	};
}

function metaOnlyMarket() {
	return { ...btcMarket(), marketKey: 'hyperliquid:META', apiCoin: 'META', tradingAvailability: 'metadataOnly' };
}

function ack(overrides = {}) {
	return {
		commandId: 'cmd-1',
		sessionId: 'session-1',
		sessionSequence: 1,
		idempotencyKey: 'idem-1',
		accepted: true,
		venueOrderIds: ['venue-1'],
		gatewayReceiveUs: 1,
		venueSendUs: 2,
		completedUs: 3,
		...overrides
	};
}

function nativeLimitJob(overrides = {}) {
	return {
		jobId: 'runner-job-1',
		action: { kind: 'native-limit', spec: { marketKey: 'hyperliquid:BTC', intent: { coin: 'BTC', isBuy: false, size: 0.001, limitPrice: 59_000 } } },
		requiredFreshnessMs: 5_000,
		expiresAtMs: 1_000_000,
		...overrides
	};
}

function pairingRecord() {
	return {
		deviceId: 'desk-01',
		keyFingerprint: 'f'.repeat(16),
		pairedAtMs: 1_000,
		lastSeenMs: 1_000,
		epoch: 0,
		revoked: false
	};
}

function context() {
	return {
		pairing: pairingRecord(),
		feedFreshnessMs: 1_000,
		consentGranted: true,
		focusGranted: true,
		killSwitchEngaged: false,
		now: 10_000
	};
}

describe('US-018 trade-only runner boundary', () => {
	beforeEach(() => {
		marketRegistry.set([btcMarket(), metaOnlyMarket()]);
	});

	test('a provably safe native-limit job dispatches through the certified client only', async () => {
		const placed = [];
		const client = {
			isReady: () => true,
			placeOrder: async (market, intent) => {
				placed.push({ market, intent });
				return ack();
			},
			placeScale: async () => ack()
		};
		const state = createRunnerState('running');
		const result = await runJob(state, nativeLimitJob(), context(), createRunnerBoundaryServices(client));
		expect(result.dispatched).toBe(true);
		expect(placed).toHaveLength(1);
		expect(placed[0].market.marketKey).toBe('hyperliquid:BTC');
		expect(placed[0].intent.commandId).toBe('runner-job-1');
	});

	test('a scale action dispatches through the certified client placeScale', async () => {
		const scaled = [];
		const client = {
			isReady: () => true,
			placeOrder: async () => ack(),
			placeScale: async (market, params) => {
				scaled.push({ market, params });
				return ack({ venueOrderIds: ['s1', 's2'] });
			}
		};
		const state = createRunnerState('running');
		const job = {
			jobId: 'scale-1',
			action: { kind: 'scale', spec: { marketKey: 'hyperliquid:BTC', scale: { isBuy: true, size: 0.01, reduceOnly: false, postOnly: true, startPrice: 60_000, endPrice: 61_000, levels: 5, skew: 1 } } },
			requiredFreshnessMs: 5_000,
			expiresAtMs: 1_000_000
		};
		const result = await runJob(state, job, context(), createRunnerBoundaryServices(client));
		expect(result.dispatched).toBe(true);
		expect(scaled).toHaveLength(1);
		expect(scaled[0].params.levels).toBe(5);
		expect(scaled[0].params.commandId).toBe('scale-1');
	});

	test('an unknown action kind fails closed without touching the client', async () => {
		const client = {
			isReady: () => true,
			placeOrder: async () => {
				throw new Error('must not be called');
			},
			placeScale: async () => {
				throw new Error('must not be called');
			}
		};
		const job = nativeLimitJob({ action: { kind: 'runner-owned-signer', spec: {} } });
		const outcome = await createRunnerBoundaryServices(client).execute(job);
		expect(outcome.status).toBe('rejected');
		expect(String(outcome.outcome)).toContain('not on the certified boundary allowlist');
	});

	test('a locked vault rejects without dispatching', async () => {
		const client = { isReady: () => false, placeOrder: async () => { throw new Error('must not be called'); }, placeScale: async () => { throw new Error('must not be called'); } };
		const outcome = await createRunnerBoundaryServices(client).execute(nativeLimitJob());
		expect(outcome.status).toBe('rejected');
		expect(String(outcome.outcome)).toContain('locked');
	});

	test('a metadata-only market never reaches the venue client', async () => {
		const client = {
			isReady: () => true,
			placeOrder: async () => {
				throw new Error('must not be called for metadata-only market');
			},
			placeScale: async () => {
				throw new Error('must not be called');
			}
		};
		const job = nativeLimitJob({ action: { kind: 'native-limit', spec: { marketKey: 'hyperliquid:META', intent: { coin: 'META', isBuy: false, size: 1, limitPrice: 1 } } } });
		const outcome = await createRunnerBoundaryServices(client).execute(job);
		expect(outcome.status).toBe('rejected');
		expect(String(outcome.outcome)).toContain('metadata-only');
	});

	test('an unregistered market identity fails closed', async () => {
		const client = {
			isReady: () => true,
			placeOrder: async () => {
				throw new Error('must not be called');
			},
			placeScale: async () => {
				throw new Error('must not be called');
			}
		};
		const job = nativeLimitJob({ action: { kind: 'native-limit', spec: { marketKey: 'hyperliquid:UNKNOWN', intent: { coin: 'UNKNOWN', isBuy: false, size: 1, limitPrice: 1 } } } });
		const outcome = await createRunnerBoundaryServices(client).execute(job);
		expect(outcome.status).toBe('rejected');
		expect(String(outcome.outcome)).toContain('Unregistered market identity');
	});

	test('an uncertain venue ack pauses the runner instead of replaying', async () => {
		const client = {
			isReady: () => true,
			placeOrder: async () => ack({ accepted: false, uncertain: true, error: 'venue outcome unclear', venueOrderIds: [] }),
			placeScale: async () => ack()
		};
		const state = createRunnerState('running');
		const result = await runJob(state, nativeLimitJob(), context(), createRunnerBoundaryServices(client));
		expect(result.dispatched).toBe(true);
		expect(state.status).toBe('paused');
	});

	test('a rejected venue ack maps to rejected without pausing', async () => {
		const client = {
			isReady: () => true,
			placeOrder: async () => ack({ accepted: false, error: 'venue rejected', venueOrderIds: [] }),
			placeScale: async () => ack()
		};
		const state = createRunnerState('running');
		const result = await runJob(state, nativeLimitJob(), context(), createRunnerBoundaryServices(client));
		expect(result.dispatched).toBe(true);
		expect(state.status).toBe('running');
	});

	test('surface: the boundary creates no transport, signer, or credential path', async () => {
		const source = await Bun.file(new URL('./runnerBoundary.ts', import.meta.url)).text();
		for (const token of ['fetch(', 'WebSocket', 'privateKey', 'sign(', 'credentialRef', 'localStorage']) {
			expect(source).not.toContain(token);
		}
		expect(source).toContain('client.placeOrder');
		expect(source).toContain('client.placeScale');
		expect(source).toContain('assertTradingAllowed');
		expect(source).toContain('localExecution');
		expect(source).toContain('metadataOnly');
	});
});
