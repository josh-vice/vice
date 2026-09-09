import { afterEach, describe, expect, test } from 'bun:test';
import { registerVenue, registeredVenues, resetVenueRegistryForTests, venueAdapter } from './registry.ts';

const reviewOnlyCapabilities = {
	venue: 'blofin',
	products: ['linearPerp'],
	orderTypes: ['limit', 'market'],
	supportsHedgeMode: false,
	supportsMarginModes: true,
	supportsAmend: true,
	amendSemantics: 'inPlace',
	supportsClientOrderIds: true,
	supportsNativeAlgorithms: false,
	nativeAlgorithmTypes: [],
	supportsWebSocketOrderEntry: false,
	supportsPrivateStreams: true,
	privateStreamGuarantee: 'authenticatedReconciliation',
	certification: 'reviewOnly'
};

const account = {
	accountKey: 'blofin:demo:account-1',
	venue: 'blofin',
	credentialRef: 'credential-1',
	accountMode: 'futures:demo'
};

function acceptedAck() {
	return {
		commandId: 'command-1',
		sessionId: 'session-1',
		sessionSequence: 1,
		idempotencyKey: 'idempotency-1',
		accepted: true,
		venueOrderIds: ['order-1'],
		gatewayReceiveUs: 1,
		venueSendUs: 2,
		completedUs: 3
	};
}

function makeAdapter(overrides = {}) {
	const capabilities = overrides.capabilities ?? reviewOnlyCapabilities;
	return {
		id: overrides.id ?? 'blofin',
		capabilities,
		async loadMarkets() {
			return [];
		},
		async startPublic() {
			return async () => undefined;
		},
		async readAccount(session) {
			return {
				account: session.account ?? account,
				orders: [],
				positions: [],
				fills: [],
				balances: [],
				receivedAtMs: 1
			};
		},
		async startPrivate() {
			return async () => undefined;
		},
		async place() {
			return acceptedAck();
		},
		async cancel() {
			return acceptedAck();
		},
		async amend() {
			return acceptedAck();
		},
		...overrides
	};
}

afterEach(() => {
	resetVenueRegistryForTests();
});

describe('venue adapter registry and session contracts', () => {
	test('rejects duplicate venue IDs', () => {
		registerVenue(makeAdapter());

		expect(() => registerVenue(makeAdapter())).toThrow('already registered');
		expect(registeredVenues().size).toBe(1);
		expect(venueAdapter('blofin')).toBeDefined();
	});

	test('rejects an adapter whose identity differs from its capabilities venue', () => {
		expect(() => registerVenue(makeAdapter({ capabilities: { ...reviewOnlyCapabilities, venue: 'hyperliquid' } }))).toThrow('capabilities venue');
		expect(registeredVenues().size).toBe(0);
	});

	test('blocks production execution while certification is reviewOnly', async () => {
		let placeCalls = 0;
		registerVenue(makeAdapter({
			place: async () => {
				placeCalls += 1;
				return acceptedAck();
			}
		}));

		await expect(venueAdapter('blofin').place(
			{ venue: 'blofin', account, environment: 'production', generation: 1 },
			{},
			{}
		)).rejects.toThrow('production execution is not certified');
		expect(placeCalls).toBe(0);
	});

	test('carries venue, account, environment, and generation in the session identity', async () => {
		const session = { venue: 'blofin', account, environment: 'demo', generation: 7 };
		let receivedSession;
		registerVenue(makeAdapter({
			readAccount: async (received) => {
				receivedSession = received;
				return {
					account,
					orders: [],
					positions: [],
					fills: [],
					balances: [],
					receivedAtMs: 1
				};
			}
		}));

		await venueAdapter('blofin').readAccount(session, new AbortController().signal);
		expect(receivedSession).toEqual(session);
		expect(receivedSession).toMatchObject({
			venue: 'blofin',
			environment: 'demo',
			generation: 7,
			account: {
				venue: 'blofin',
				accountKey: 'blofin:demo:account-1',
				credentialRef: 'credential-1'
			}
		});
	});
});
