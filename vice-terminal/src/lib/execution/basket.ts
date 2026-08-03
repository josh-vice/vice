import {
	assertAccountRef,
	assertInstrumentId,
	assertVenueCapabilities,
	type AccountRef,
	type InstrumentId,
	type VenueCapabilities,
	type VenueId
} from '$lib/venue/identity';
import type { CloidReconciliation } from './reconcileCloid';

/** Exact basket action spec; never a display-derived or inferred instruction. */
export interface BasketActionSpec {
	side: 'buy' | 'sell';
	/** Exact venue decimal string; positive. */
	size: string;
	/** A venue-native order type already declared in the venue capabilities. */
	orderType: string;
	/** Present only when the venue order type requires a limit/trigger price. */
	price?: string;
	reduceOnly?: boolean;
}

export interface BasketLeg {
	legIndex: number;
	account: AccountRef;
	instrument: InstrumentId;
	action: BasketActionSpec;
}

export interface BasketPreviewIssue {
	legIndex: number;
	reason: string;
}

export interface BasketPlan {
	basketId: string;
	/** Deterministic order: venue, accountKey, instrumentKey, then legIndex. */
	legs: BasketLeg[];
	preview: {
		passes: boolean;
		issues: BasketPreviewIssue[];
	};
}

export type BasketLegStatus = 'pending' | 'dispatched' | 'reconciled' | 'uncertain' | 'failed';

export interface BasketLegJournalEntry {
	basketId: string;
	legIndex: number;
	commandId: string;
	venue: VenueId;
	accountKey: string;
	instrumentKey: string;
	status: BasketLegStatus;
	cloids: string[];
	venueOrderIds: string[];
	updatedAt: number;
}

export interface BasketDispatchOutcome {
	status: 'accepted' | 'rejected' | 'uncertain';
	cloids: string[];
	venueOrderIds: string[];
	error?: string;
}

export interface BasketServices {
	/** The certified venue-native dispatch boundary. The basket creates no signer or second execution path. */
	dispatchLeg(leg: BasketLeg): Promise<BasketDispatchOutcome>;
	/** Prove final state per venue before the basket reports completion. */
	reconcileVenue(venue: VenueId, cloids: string[]): Promise<CloidReconciliation>;
	/** Injectable journal (defaults to the device-local basket journal). */
	journal?: BasketJournalLike;
}

export interface BasketLegOutcome extends BasketLegJournalEntry {
	dispatch?: BasketDispatchOutcome;
	reconciled?: CloidReconciliation;
}

export interface BasketResult {
	basketId: string;
	status: 'complete' | 'partial' | 'failed';
	legs: BasketLegOutcome[];
	pausedAtLegIndex?: number;
	reasons: string[];
}

export interface BasketJournalLike {
	load(): BasketLegJournalEntry[];
	begin(entry: Omit<BasketLegJournalEntry, 'status' | 'updatedAt'>): void;
	update(
		commandId: string,
		update: Partial<Pick<BasketLegJournalEntry, 'status' | 'cloids' | 'venueOrderIds' | 'updatedAt'>>
	): void;
}

const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const BASKET_PREFIX = 'vice.basket.journal.v1';
const BASKET_MAX_ENTRIES = 100;

/** FNV-1a over the canonical basket serialization for a deterministic basket id. */
function stableBasketId(legs: readonly BasketLeg[]): string {
	let hash = 0x811c9dc5;
	const input = legs
		.map(
			(leg) =>
				`${leg.account.accountKey}|${leg.instrument.instrumentKey}|${leg.action.side}|${leg.action.size}|${leg.action.orderType}|${leg.action.price ?? ''}|${leg.action.reduceOnly ?? false}`
		)
		.join('\n');
	for (let index = 0; index < input.length; index++) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return `basket-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function assertActionSpec(action: BasketActionSpec, legIndex: number): void {
	if (action.side !== 'buy' && action.side !== 'sell') {
		throw new Error(`Basket leg ${legIndex} requires an explicit side`);
	}
	if (!DECIMAL.test(action.size) || Number(action.size) <= 0) {
		throw new Error(`Basket leg ${legIndex} requires a positive decimal size`);
	}
	if (action.orderType.trim().length === 0 || action.orderType !== action.orderType.trim()) {
		throw new Error(`Basket leg ${legIndex} requires a trimmed venue order type`);
	}
	if (action.price !== undefined && (!DECIMAL.test(action.price) || Number(action.price) <= 0)) {
		throw new Error(`Basket leg ${legIndex} requires a positive decimal price when provided`);
	}
}

function compareLegs(left: BasketLeg, right: BasketLeg): number {
	return (
		left.account.venue.localeCompare(right.account.venue) ||
		left.account.accountKey.localeCompare(right.account.accountKey) ||
		left.instrument.instrumentKey.localeCompare(right.instrument.instrumentKey) ||
		left.legIndex - right.legIndex
	);
}

/**
 * Preview every leg before any dispatch. A basket only passes when each leg
 * has an explicit account, an exact instrument, a certified venue adapter,
 * and a supported venue-native order type. Preview is read-only: it never
 * journals, signs, or reaches a venue.
 */
export function planBasket(
	legs: readonly BasketLeg[],
	capabilitiesByVenue: ReadonlyMap<VenueId, VenueCapabilities>
): BasketPlan {
	if (legs.length === 0) throw new Error('Basket requires at least one leg');
	const issues: BasketPreviewIssue[] = [];
	const normalized: BasketLeg[] = [];
	for (const leg of legs) {
		const issue = (reason: string): void => {
			issues.push({ legIndex: leg.legIndex, reason });
		};
		try {
			assertAccountRef(leg.account);
		} catch (error) {
			issue(`account identity: ${error instanceof Error ? error.message : 'invalid'}`);
		}
		try {
			assertInstrumentId(leg.instrument);
		} catch (error) {
			issue(`instrument identity: ${error instanceof Error ? error.message : 'invalid'}`);
		}
		try {
			assertActionSpec(leg.action, leg.legIndex);
		} catch (error) {
			issue(error instanceof Error ? error.message : 'invalid action');
		}
		const capabilities = capabilitiesByVenue.get(leg.account.venue);
		if (!capabilities) {
			issue('venue has no declared capabilities');
		} else {
			try {
				assertVenueCapabilities(capabilities);
			} catch (error) {
				issue(`venue capabilities invalid: ${error instanceof Error ? error.message : 'invalid'}`);
			}
			if (capabilities.certification !== 'fundedCertified' && capabilities.certification !== 'productionExposed') {
				issue(`venue is not certified for execution (${capabilities.certification})`);
			}
			if (!capabilities.orderTypes.includes(leg.action.orderType)) {
				issue(`venue does not support order type ${leg.action.orderType}`);
			}
		}
		normalized.push(leg);
	}
	const ordered = [...normalized].sort(compareLegs);
	return {
		basketId: stableBasketId(ordered),
		legs: ordered,
		preview: { passes: issues.length === 0, issues }
	};
}

export function deterministicBasketCommandId(basketId: string, legIndex: number): string {
	return `vice.basket.v1:${basketId}:${legIndex}`;
}

function storage(): Storage | undefined {
	return typeof localStorage === 'undefined' ? undefined : localStorage;
}

function loadBasketJournal(): BasketLegJournalEntry[] {
	const store = storage();
	if (!store) return [];
	try {
		const parsed = JSON.parse(store.getItem(BASKET_PREFIX) ?? '[]') as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(entry): entry is BasketLegJournalEntry =>
				!!entry &&
				typeof (entry as BasketLegJournalEntry).commandId === 'string' &&
				typeof (entry as BasketLegJournalEntry).basketId === 'string' &&
				Array.isArray((entry as BasketLegJournalEntry).cloids) &&
				Array.isArray((entry as BasketLegJournalEntry).venueOrderIds)
		);
	} catch {
		return [];
	}
}

function saveBasketJournal(entries: BasketLegJournalEntry[]): void {
	storage()?.setItem(BASKET_PREFIX, JSON.stringify(entries.slice(-BASKET_MAX_ENTRIES)));
}

export const basketJournal: BasketJournalLike = {
	load: loadBasketJournal,
	begin(entry) {
		const entries = loadBasketJournal().filter((candidate) => candidate.commandId !== entry.commandId);
		entries.push({ ...entry, status: 'pending', updatedAt: Date.now() });
		saveBasketJournal(entries);
	},
	update(commandId, update) {
		const entries = loadBasketJournal();
		const index = entries.findIndex((entry) => entry.commandId === commandId);
		if (index < 0) return;
		entries[index] = { ...entries[index], ...update };
		saveBasketJournal(entries);
	}
};

function outcomeToStatus(outcome: BasketDispatchOutcome): Extract<BasketLegStatus, 'dispatched' | 'uncertain' | 'failed'> {
	if (outcome.status === 'accepted') return 'dispatched';
	if (outcome.status === 'uncertain') return 'uncertain';
	return 'failed';
}

/**
 * Execute a planned basket through the certified dispatch boundary.
 *
 * - Journals every deterministic child command (pending) BEFORE any dispatch.
 * - Dispatches legs in deterministic plan order.
 * - Stops dispatching on the first uncertain outcome and pauses remaining legs.
 * - Reconciles every involved venue before reporting completion.
 * - Reports partial completion when any leg cannot be proven final.
 *
 * This module never touches credentials, signs, or opens a transport; all of
 * that belongs to the certified venue-native action boundary passed in.
 */
export async function executeBasket(plan: BasketPlan, services: BasketServices): Promise<BasketResult> {
	if (!plan.preview.passes) {
		return { basketId: plan.basketId, status: 'failed', legs: [], reasons: ['basket preview did not pass'] };
	}
	const journal = services.journal ?? basketJournal;
	const reasons: string[] = [];
	const outcomes: BasketLegOutcome[] = plan.legs.map((leg) => {
		const commandId = deterministicBasketCommandId(plan.basketId, leg.legIndex);
		journal.begin({
			basketId: plan.basketId,
			legIndex: leg.legIndex,
			commandId,
			venue: leg.account.venue,
			accountKey: leg.account.accountKey,
			instrumentKey: leg.instrument.instrumentKey,
			cloids: [],
			venueOrderIds: []
		});
		return {
			basketId: plan.basketId,
			legIndex: leg.legIndex,
			commandId,
			venue: leg.account.venue,
			accountKey: leg.account.accountKey,
			instrumentKey: leg.instrument.instrumentKey,
			status: 'pending',
			cloids: [],
			venueOrderIds: [],
			updatedAt: Date.now()
		};
	});

	let pausedAtLegIndex: number | undefined;
	for (const leg of plan.legs) {
		if (pausedAtLegIndex !== undefined) break;
		const outcome = outcomes.find((candidate) => candidate.legIndex === leg.legIndex);
		if (!outcome) continue;
		const dispatch = await services.dispatchLeg(leg);
		outcome.dispatch = dispatch;
		outcome.cloids = dispatch.cloids;
		outcome.venueOrderIds = dispatch.venueOrderIds;
		outcome.status = outcomeToStatus(dispatch);
		journal.update(outcome.commandId, {
			status: outcome.status,
			cloids: dispatch.cloids,
			venueOrderIds: dispatch.venueOrderIds,
			updatedAt: Date.now()
		});
		if (dispatch.status === 'uncertain') {
			pausedAtLegIndex = leg.legIndex;
			reasons.push(`leg ${leg.legIndex} ended uncertain; remaining legs paused`);
			break;
		}
	}

	// Reconcile every venue that owns at least one dispatched leg before
	// reporting any completion.
	const venues = [...new Set(plan.legs.map((leg) => leg.account.venue))];
	for (const venue of venues) {
		const venueLegs = outcomes.filter((outcome) => outcome.venue === venue && outcome.status !== 'pending');
		if (venueLegs.length === 0) continue;
		const cloids = [...new Set(venueLegs.flatMap((outcome) => outcome.cloids))];
		const reconciled = await services.reconcileVenue(venue, cloids);
		for (const outcome of venueLegs) {
			outcome.reconciled = reconciled;
			// A definitive venue rejection stays failed; reconciliation can only
			// prove or disprove legs whose final state was unknown.
			if (outcome.status === 'failed') continue;
			const proven =
				reconciled.complete ||
				(reconciled.found && outcome.status !== 'uncertain' && outcome.venueOrderIds.length > 0);
			if (proven) {
				outcome.status = 'reconciled';
			} else {
				outcome.status = 'uncertain';
				reasons.push(
					`leg ${outcome.legIndex} on ${venue} could not be proven final (${reconciled.found ? 'partial match' : 'no match'})`
				);
			}
			journal.update(outcome.commandId, { status: outcome.status, updatedAt: Date.now() });
		}
	}

	const allReconciled =
		outcomes.length > 0 &&
		outcomes.every((outcome) => outcome.status === 'reconciled');
	const hasUncertain = outcomes.some((outcome) => outcome.status === 'uncertain' || outcome.status === 'pending');
	const anyReconciled = outcomes.some((outcome) => outcome.status === 'reconciled');
	const status = allReconciled ? 'complete' : hasUncertain || anyReconciled ? 'partial' : 'failed';
	return { basketId: plan.basketId, status, legs: outcomes, ...(pausedAtLegIndex !== undefined ? { pausedAtLegIndex } : {}), reasons };
}
