import { assertAccountRef, type AccountRef, type VenueId } from './identity';

/** Exact per-venue health states used by read-only account aggregation. */
export type VenueHealth = 'live' | 'connecting' | 'stale' | 'error' | 'unknown';

/** Where a health state came from; never inferred from another venue. */
export type VenueHealthSource = 'venuePrivateSnapshot' | 'venuePublicSignal' | 'reportedByClient' | 'unavailable';

export type VenueEnvironment = 'mainnet' | 'testnet' | 'demo';

export const VENUE_ENVIRONMENTS: readonly VenueEnvironment[] = ['mainnet', 'testnet', 'demo'];
export const VENUE_HEALTHS: readonly VenueHealth[] = ['live', 'connecting', 'stale', 'error', 'unknown'];

export interface AccountHealthRow {
	venue: VenueId;
	environment: VenueEnvironment;
	account: AccountRef;
	health: VenueHealth;
	healthSource: VenueHealthSource;
	updatedAtMs: number;
}

/**
 * A read-only aggregation row. Every field of the source row is preserved;
 * aggregation never drops venue, environment, account, instrument, source
 * timestamp, or health identity.
 */
export interface AggregatedAccountRow<T> extends AccountHealthRow {
	instrumentKey?: string;
	sourceTimestampUs?: string;
	payload: T;
}

export function assertVenueHealth(value: VenueHealth, field = 'health'): VenueHealth {
	if (!VENUE_HEALTHS.includes(value)) throw new Error(`Account aggregation requires a known ${field}`);
	return value;
}

export function assertVenueEnvironment(value: VenueEnvironment, field = 'environment'): VenueEnvironment {
	if (!VENUE_ENVIRONMENTS.includes(value)) throw new Error(`Account aggregation requires a known ${field}`);
	return value;
}

export function assertAccountHealthRow<T>(row: AggregatedAccountRow<T>): AggregatedAccountRow<T> {
	assertAccountRef(row.account);
	assertVenueHealth(row.health);
	assertVenueEnvironment(row.environment);
	if (!Number.isFinite(row.updatedAtMs) || row.updatedAtMs < 0) {
		throw new Error('Account aggregation requires a non-negative updatedAtMs');
	}
	if (row.instrumentKey !== undefined && !row.instrumentKey.startsWith(`${row.venue}:`)) {
		throw new Error('Account aggregation requires an instrumentKey scoped to its venue');
	}
	if (row.sourceTimestampUs !== undefined && !/^(?:0|[1-9]\d*)$/.test(row.sourceTimestampUs)) {
		throw new Error('Account aggregation requires an unsigned integer sourceTimestampUs');
	}
	return row;
}

function compareRows<T>(left: AggregatedAccountRow<T>, right: AggregatedAccountRow<T>): number {
	return (
		left.venue.localeCompare(right.venue) ||
		left.account.accountKey.localeCompare(right.account.accountKey) ||
		(left.instrumentKey ?? '').localeCompare(right.instrumentKey ?? '') ||
		(left.sourceTimestampUs ?? '').localeCompare(right.sourceTimestampUs ?? '')
	);
}

/**
 * Canonical read-only account aggregation. Returns every row with every
 * identity field intact, ordered deterministically by venue, account,
 * instrument, then source timestamp. This function never reaches a venue,
 * signer, or credential store.
 */
export function aggregateAccounts<T>(rows: readonly AggregatedAccountRow<T>[]): AggregatedAccountRow<T>[] {
	const validated = rows.map(assertAccountHealthRow);
	return [...validated].sort(compareRows);
}

/**
 * Apply per-venue health updates with strict venue isolation. A degraded venue
 * marks only its own rows stale; it can never mark another venue stale and can
 * never accept data attributed to a different venue.
 */
export function mergeAccountHealth<T>(
	rows: readonly AggregatedAccountRow<T>[],
	healthByVenue: ReadonlyMap<VenueId, { health: VenueHealth; healthSource: VenueHealthSource; updatedAtMs: number }>
): AggregatedAccountRow<T>[] {
	const validated = rows.map(assertAccountHealthRow);
	return validated.map((row) => {
		const update = healthByVenue.get(row.venue);
		if (!update) return row;
		assertVenueHealth(update.health);
		if (!Number.isFinite(update.updatedAtMs) || update.updatedAtMs < 0) {
			throw new Error('Account aggregation requires a non-negative health updatedAtMs');
		}
		return {
			...row,
			health: update.health,
			healthSource: update.healthSource,
			updatedAtMs: update.updatedAtMs
		};
	});
}

/**
 * Reject cross-venue inference before a payload is attributed to an account.
 * An account may only be attributed rows published by its own venue.
 */
export function attributePayloadToAccount<T>(row: AggregatedAccountRow<T>, account: AccountRef): AggregatedAccountRow<T> {
	assertAccountRef(account);
	assertAccountHealthRow(row);
	if (row.venue !== account.venue) {
		throw new Error('Account aggregation refuses cross-venue inference');
	}
	if (row.account.accountKey.toLowerCase() !== account.accountKey.toLowerCase()) {
		throw new Error('Account aggregation refuses to attribute a row to a different account');
	}
	return row;
}

/**
 * Anonymous per-venue health summary for telemetry. Counts only; never emits
 * account keys, markets, prices, sizes, or credential references.
 */
export function summarizeVenueHealth<T>(
	rows: readonly AggregatedAccountRow<T>[]
): Partial<Record<VenueId, Partial<Record<VenueHealth, number>>>> {
	const summary: Partial<Record<VenueId, Partial<Record<VenueHealth, number>>>> = {};
	for (const row of rows) {
		assertAccountHealthRow(row);
		const venue = summary[row.venue] ?? (summary[row.venue] = {});
		venue[row.health] = (venue[row.health] ?? 0) + 1;
	}
	return summary;
}
