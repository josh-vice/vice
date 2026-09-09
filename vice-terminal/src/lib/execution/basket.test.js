import { describe, expect, test } from 'bun:test';
import {
	deterministicBasketCommandId,
	executeBasket,
	planBasket,
	basketJournal
} from './basket';

function account(accountKey) {
	return { accountKey, venue: 'hyperliquid', credentialRef: 'creds:test', accountMode: 'single' };
}

function fixtureAccount(accountKey) {
	return { accountKey, venue: 'fixture', credentialRef: 'creds:fixture', accountMode: 'single' };
}

function instrument(apiCoin) {
	return {
		instrumentKey: `hyperliquid:linearPerp:${apiCoin}`,
		venue: 'hyperliquid',
		venueSymbol: apiCoin,
		product: 'linearPerp',
		baseAsset: apiCoin,
		quoteAsset: 'USD',
		settlementAsset: 'USD',
		contractMultiplier: '1',
		pricePrecision: { kind: 'significantFigures', maxSignificantFigures: 5, maxDecimals: 2, integerPricesAllowed: true },
		sizeIncrement: '0.001'
	};
}

function fixtureInstrument(apiCoin) {
	return {
		instrumentKey: `fixture:linearPerp:${apiCoin}`,
		venue: 'fixture',
		venueSymbol: apiCoin,
		product: 'linearPerp',
		baseAsset: apiCoin,
		quoteAsset: 'USD',
		settlementAsset: 'USD',
		contractMultiplier: '1',
		pricePrecision: { kind: 'significantFigures', maxSignificantFigures: 5, maxDecimals: 2, integerPricesAllowed: true },
		sizeIncrement: '0.001'
	};
}

function certifiedHyperliquid() {
	return {
		venue: 'hyperliquid',
		products: ['linearPerp'],
		orderTypes: ['limit', 'market', 'trigger'],
		supportsHedgeMode: true,
		supportsMarginModes: true,
		supportsAmend: true,
		amendSemantics: 'cancelReplace',
		supportsClientOrderIds: true,
		supportsNativeAlgorithms: true,
		nativeAlgorithmTypes: ['twap'],
		supportsWebSocketOrderEntry: true,
		supportsPrivateStreams: true,
		privateStreamGuarantee: 'authenticatedReconciliation',
		certification: 'fundedCertified'
	};
}

function reviewOnlyHyperliquid() {
	return { ...certifiedHyperliquid(), certification: 'reviewOnly' };
}

function capabilities(byVenue) {
	return new Map(Object.entries(byVenue));
}

function leg(legIndex, acct, instr, orderType = 'limit', price = '100') {
	return { legIndex, account: acct, instrument: instr, action: { side: 'buy', size: '1', orderType, price } };
}

function acceptedDispatch() {
	return { status: 'accepted', cloids: ['0xcloid'], venueOrderIds: ['1001'] };
}

function completeReconcile() {
	return { found: true, complete: true, accepted: true, orderIds: ['1001'], matchedCloids: ['0xcloid'] };
}

function inMemoryJournal() {
	const entries = [];
	return {
		load: () => entries,
		begin(entry) {
			entries.push({ ...entry, status: 'pending', updatedAt: 1 });
		},
		update(commandId, update) {
			const found = entries.find((entry) => entry.commandId === commandId);
			if (found) Object.assign(found, update, { updatedAt: 2 });
		},
		entries
	};
}

describe('US-017 basket planning', () => {
	test('preview fails closed when a venue is not certified for execution', () => {
		const plan = planBasket([leg(0, account('hyperliquid:alice'), instrument('BTC'))], capabilities({ hyperliquid: reviewOnlyHyperliquid() }));
		expect(plan.preview.passes).toBe(false);
		expect(plan.preview.issues[0].reason).toMatch(/not certified/);
	});

	test('preview rejects an unsupported venue order type', () => {
		const plan = planBasket([leg(0, account('hyperliquid:alice'), instrument('BTC'), 'fok')], capabilities({ hyperliquid: certifiedHyperliquid() }));
		expect(plan.preview.passes).toBe(false);
		expect(plan.preview.issues[0].reason).toMatch(/does not support order type fok/);
	});

	test('preview requires an explicit account identity and exact instrument', () => {
		const badAccount = { ...account('hyperliquid:alice'), accountKey: '' };
		const plan = planBasket([leg(0, badAccount, instrument('BTC'))], capabilities({ hyperliquid: certifiedHyperliquid() }));
		expect(plan.preview.passes).toBe(false);
		expect(plan.preview.issues[0].reason).toMatch(/account identity/);
	});

	test('orders legs deterministically so identical baskets produce identical plans', () => {
		const legsA = [
			leg(0, fixtureAccount('fixture:bob'), fixtureInstrument('SOL')),
			leg(1, account('hyperliquid:alice'), instrument('ETH')),
			leg(2, account('hyperliquid:alice'), instrument('BTC'))
		];
		const legsB = [...legsA].reverse();
		const planA = planBasket(legsA, capabilities({ hyperliquid: certifiedHyperliquid(), fixture: certifiedHyperliquid() }));
		const planB = planBasket(legsB, capabilities({ hyperliquid: certifiedHyperliquid(), fixture: certifiedHyperliquid() }));
		expect(planA.basketId).toBe(planB.basketId);
		expect(planA.legs.map((entry) => entry.instrument.instrumentKey)).toEqual([
			'fixture:linearPerp:SOL',
			'hyperliquid:linearPerp:BTC',
			'hyperliquid:linearPerp:ETH'
		]);
	});

	test('deterministic child command ids are stable per basket and leg', () => {
		expect(deterministicBasketCommandId('basket-abc', 0)).toBe('vice.basket.v1:basket-abc:0');
		expect(deterministicBasketCommandId('basket-abc', 0)).toBe(deterministicBasketCommandId('basket-abc', 0));
		expect(deterministicBasketCommandId('basket-abc', 0)).not.toBe(deterministicBasketCommandId('basket-abc', 1));
	});
});

describe('US-017 basket execution', () => {
	test('journals every deterministic child command before dispatching any leg', async () => {
		const journal = inMemoryJournal();
		const dispatched = [];
		const result = await executeBasket(
			planBasket(
				[
					leg(0, account('hyperliquid:alice'), instrument('BTC')),
					leg(1, account('hyperliquid:alice'), instrument('ETH'))
				],
				capabilities({ hyperliquid: certifiedHyperliquid() })
			),
			{
				dispatchLeg: async (entry) => {
					dispatched.push(entry.legIndex);
					return acceptedDispatch();
				},
				reconcileVenue: async () => completeReconcile(),
				journal
			}
		);
		expect(result.status).toBe('complete');
		expect(journal.entries.filter((entry) => entry.status === 'pending' || entry.status === 'reconciled')).toHaveLength(2);
		expect(journal.entries[0].commandId).toMatch(/^vice\.basket\.v1:basket-/);
		expect(dispatched).toEqual([0, 1]);
	});

	test('stops dispatching on the first uncertain outcome and pauses remaining legs', async () => {
		const journal = inMemoryJournal();
		const dispatched = [];
		const plan = planBasket(
			[
				leg(0, account('hyperliquid:alice'), instrument('BTC')),
				leg(1, account('hyperliquid:alice'), instrument('ETH')),
				leg(2, account('hyperliquid:alice'), instrument('SOL'))
			],
			capabilities({ hyperliquid: certifiedHyperliquid() })
		);
		const result = await executeBasket(plan, {
			dispatchLeg: async (entry) => {
				dispatched.push(entry.legIndex);
				if (entry.legIndex === 1) return { status: 'uncertain', cloids: [], venueOrderIds: [] };
				return acceptedDispatch();
			},
			reconcileVenue: async (venue, cloids) => ({ found: cloids.length > 0, complete: cloids.length > 0, accepted: true, orderIds: [], matchedCloids: [] }),
			journal
		});
		expect(result.status).toBe('partial');
		expect(result.pausedAtLegIndex).toBe(1);
		expect(dispatched).toEqual([0, 1]);
		expect(result.legs[2].status).toBe('pending');
	});

	test('a partial or uncertain leg pauses remaining legs and reports partial completion', async () => {
		const plan = planBasket(
			[
				leg(0, account('hyperliquid:alice'), instrument('BTC')),
				leg(1, account('hyperliquid:alice'), instrument('ETH'))
			],
			capabilities({ hyperliquid: certifiedHyperliquid() })
		);
		const result = await executeBasket(plan, {
			dispatchLeg: async (entry) => (entry.legIndex === 0 ? { status: 'accepted', cloids: ['0x1'], venueOrderIds: ['10'] } : acceptedDispatch()),
			reconcileVenue: async () => ({ found: false, complete: false, accepted: false, orderIds: [], matchedCloids: [] }),
			journal: inMemoryJournal()
		});
		expect(result.status).toBe('partial');
		expect(result.reasons.some((reason) => reason.includes('could not be proven final'))).toBe(true);
	});

	test('reconciles every involved venue before reporting completion', async () => {
		const reconciledVenues = [];
		const plan = planBasket(
			[
				leg(0, account('hyperliquid:alice'), instrument('BTC')),
				leg(1, fixtureAccount('fixture:bob'), fixtureInstrument('SOL'))
			],
			capabilities({ hyperliquid: certifiedHyperliquid(), fixture: certifiedHyperliquid() })
		);
		const result = await executeBasket(plan, {
			dispatchLeg: async (entry) => acceptedDispatch(),
			reconcileVenue: async (venue, cloids) => {
				reconciledVenues.push(venue);
				return completeReconcile();
			},
			journal: inMemoryJournal()
		});
		expect(result.status).toBe('complete');
		expect(reconciledVenues.sort()).toEqual(['fixture', 'hyperliquid']);
		expect(result.legs.every((outcome) => outcome.status === 'reconciled')).toBe(true);
	});

	test('a clean rejection on every leg reports failed without uncertainty', async () => {
		const plan = planBasket([leg(0, account('hyperliquid:alice'), instrument('BTC'))], capabilities({ hyperliquid: certifiedHyperliquid() }));
		const result = await executeBasket(plan, {
			dispatchLeg: async () => ({ status: 'rejected', cloids: [], venueOrderIds: [], error: 'venue rejected' }),
			reconcileVenue: async () => completeReconcile(),
			journal: inMemoryJournal()
		});
		expect(result.status).toBe('failed');
		expect(result.legs[0].status).toBe('failed');
	});

	test('persisted journal restores pending basket legs after restart', async () => {
		const journal = inMemoryJournal();
		const plan = planBasket(
			[
				leg(0, account('hyperliquid:alice'), instrument('BTC')),
				leg(1, account('hyperliquid:alice'), instrument('ETH')),
				leg(2, account('hyperliquid:alice'), instrument('SOL'))
			],
			capabilities({ hyperliquid: certifiedHyperliquid() })
		);
		await executeBasket(plan, {
			dispatchLeg: async (entry) => {
				if (entry.legIndex === 0) return { status: 'accepted', cloids: ['0x1'], venueOrderIds: ['10'] };
				return { status: 'uncertain', cloids: [], venueOrderIds: [] };
			},
			reconcileVenue: async () => ({ found: false, complete: false, accepted: false, orderIds: [], matchedCloids: [] }),
			journal
		});
		const restored = journal.load();
		expect(restored.some((entry) => entry.status === 'uncertain')).toBe(true);
		expect(restored.some((entry) => entry.status === 'pending')).toBe(true);
		expect(restored.find((entry) => entry.legIndex === 2).status).toBe('pending');
	});

	test('surface: the basket module creates no transport, signer, or credential path', async () => {
		const source = await Bun.file(new URL('./basket.ts', import.meta.url)).text();
		for (const token of ['fetch(', 'WebSocket', 'privateKey', 'sign(', 'credentialRef']) expect(source).not.toContain(token);
		expect(source).toContain('dispatchLeg');
		expect(source).toContain('reconcileVenue');
	});

	test('device-local journal is versioned and ignores corrupt records', () => {
		const values = new Map();
		globalThis.localStorage = {
			getItem: (key) => values.get(key) ?? null,
			setItem: (key, value) => values.set(key, value),
			removeItem: (key) => values.delete(key)
		};
		values.set('vice.basket.journal.v1', '{not-json');
		expect(basketJournal.load()).toEqual([]);
		delete globalThis.localStorage;
	});
});
