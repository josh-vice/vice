import { assertAccountRef, assertInstrumentId, type AccountRef, type InstrumentId, type VenueId } from '$lib/venue/identity';
import type { ExecutionEntitlement, ExecutionEntitlementInput, OrderFamily } from './releasePolicy';

export type ExecutionCapabilityInput = {
	actionId: string;
	venue: VenueId;
	account: AccountRef;
	instrument: InstrumentId;
	orderFamily: OrderFamily;
	persistence: 'venue-native' | 'device-local' | 'user-run';
	requiredFeeds: readonly string[];
	entitlement: ExecutionEntitlement;
	notionalUsd: string;
	risk: 'increase' | 'reduce';
	wallet: string;
	aggregateNotionalUsd?: string;
	expectedReleaseBuild?: string;
};
export type ExecutionCapability = {
	allowed: boolean;
	disabledReason: string | null;
	identity: { venue: VenueId; accountKey: string; instrumentKey: string; orderFamily: OrderFamily };
	requiredFeedIds: readonly string[];
	certificationEvidenceIds: readonly string[];
	perOrderCapUsd: string;
	aggregateCapUsd: string;
	entitlementExpiresAt: number;
};

function firstReason(input: ExecutionCapabilityInput, identity: ExecutionCapability['identity']): string | null {
	const entitlement = input.entitlement;
	if (input.instrument.venue !== input.venue) return 'The selected instrument does not match the execution venue.';
	if (identity.accountKey !== input.account.accountKey) return 'The selected account identity is invalid.';
	if (entitlement.network !== 'mainnet') return 'Execution is unavailable because the release is not mainnet-bound.';
	if (!entitlement.walletAllowed) return 'This wallet is not allowlisted for the active release.';
	if (input.risk === 'increase' && entitlement.halted) return 'Execution is halted by the active release policy.';
	const now = Date.now();
	if (!Number.isFinite(entitlement.issuedAt) || !Number.isFinite(entitlement.expiresAt) || entitlement.issuedAt > now) return 'The execution entitlement is not yet valid.';
	if (entitlement.expiresAt <= now) return 'The execution entitlement is expired.';
	if (input.expectedReleaseBuild && entitlement.releaseBuild !== input.expectedReleaseBuild) return 'The execution entitlement does not match the running release.';
	if (!entitlement.allowedActionIds.includes(input.actionId)) return `Action ${input.actionId} is not enabled by the active release.`;
	if (!entitlement.allowedVenues.includes(input.venue)) return `Venue ${input.venue} is not enabled by the active release.`;
	if (!entitlement.allowedOrderFamilies.includes(input.orderFamily)) return `Order family ${input.orderFamily} is not enabled by the active release.`;
	if (input.requiredFeeds.length === 0) return 'Execution requires at least one declared authoritative feed.';
	if (input.risk === 'increase' && entitlement.mode !== 'full') return 'The active release permits reduce-risk actions only.';
	return null;
}

export function resolveExecutionCapability(input: ExecutionCapabilityInput): ExecutionCapability {
	const account = assertAccountRef(input.account);
	const instrument = assertInstrumentId(input.instrument);
	const identity = { venue: input.venue, accountKey: account.accountKey, instrumentKey: instrument.instrumentKey, orderFamily: input.orderFamily };
	const disabledReason = firstReason(input, identity);
	return {
		allowed: disabledReason === null,
		disabledReason,
		identity,
		requiredFeedIds: [...input.requiredFeeds],
		certificationEvidenceIds: input.orderFamily === 'limit' || input.orderFamily === 'market' ? ['basic-order-mainnet'] : [`${input.orderFamily}-mainnet-certification`],
		perOrderCapUsd: input.entitlement.perOrderCapUsd,
		aggregateCapUsd: input.entitlement.aggregateCapUsd,
		entitlementExpiresAt: input.entitlement.expiresAt
	};
}

export type { ExecutionEntitlement, ExecutionEntitlementInput };
