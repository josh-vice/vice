import type { AccountRef, InstrumentId, VenueId } from '$lib/venue/identity';

export type ExecutionRisk = 'increase' | 'reduce';
export type OrderFamily = string;
export type ReleaseEntitlementRequest = {
	wallet: string;
	actionId: string;
	venue: VenueId;
	instrument: InstrumentId;
	notionalUsd: string;
	risk: ExecutionRisk;
};
export type ExecutionEntitlementInput = ReleaseEntitlementRequest & {
	orderFamily: OrderFamily;
	aggregateNotionalUsd?: string;
	expectedReleaseBuild?: string;
};
export type ExecutionEntitlement = {
	releaseBuild: string;
	policyVersion: string;
	network: 'mainnet';
	walletAllowed: boolean;
	allowedActionIds: readonly string[];
	allowedVenues: readonly VenueId[];
	allowedOrderFamilies: readonly OrderFamily[];
	perOrderCapUsd: string;
	aggregateCapUsd: string;
	halted: boolean;
	mode: 'full' | 'reduce-risk-only';
	issuedAt: number;
	expiresAt: number;
	approvalSha256: string;
};

const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const DIGEST = /^[a-f0-9]{64}$/i;

function decimalParts(value: string, field: string): [string, string] {
	if (!DECIMAL.test(value)) throw new Error(`${field} must be a non-negative decimal string`);
	const [whole, fraction = ''] = value.split('.');
	return [whole, fraction.replace(/0+$/, '')];
}
function decimalCompare(left: string, right: string, leftField: string, rightField: string): number {
	const [leftWhole, leftFraction] = decimalParts(left, leftField);
	const [rightWhole, rightFraction] = decimalParts(right, rightField);
	if (leftWhole.length !== rightWhole.length) return leftWhole.length - rightWhole.length;
	if (leftWhole !== rightWhole) return leftWhole < rightWhole ? -1 : 1;
	const width = Math.max(leftFraction.length, rightFraction.length);
	const paddedLeft = leftFraction.padEnd(width, '0');
	const paddedRight = rightFraction.padEnd(width, '0');
	if (paddedLeft === paddedRight) return 0;
	return paddedLeft < paddedRight ? -1 : 1;
}
function normalizeWallet(wallet: string): string {
	const value = wallet.trim().toLowerCase();
	if (!/^0x[a-f0-9]{40}$/.test(value)) throw new Error('wallet identity is invalid');
	return value;
}
function assertEntitlementShape(value: ExecutionEntitlement): ExecutionEntitlement {
	if (!value || value.network !== 'mainnet' || typeof value.releaseBuild !== 'string' || !value.releaseBuild.trim() || typeof value.policyVersion !== 'string' || !value.policyVersion.trim()) throw new Error('release policy entitlement is malformed');
	if (typeof value.walletAllowed !== 'boolean' || typeof value.halted !== 'boolean' || !['full', 'reduce-risk-only'].includes(value.mode)) throw new Error('release policy entitlement is malformed');
	if (!Array.isArray(value.allowedActionIds) || !Array.isArray(value.allowedVenues) || !Array.isArray(value.allowedOrderFamilies)) throw new Error('release policy entitlement is malformed');
	decimalParts(value.perOrderCapUsd, 'perOrderCapUsd');
	decimalParts(value.aggregateCapUsd, 'aggregateCapUsd');
	if (!Number.isSafeInteger(value.issuedAt) || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= value.issuedAt) throw new Error('release policy provenance is malformed');
	if (!DIGEST.test(value.approvalSha256)) throw new Error('release policy provenance is malformed');
	return value;
}

export async function getExecutionEntitlement(input: ReleaseEntitlementRequest): Promise<ExecutionEntitlement> {
	const wallet = normalizeWallet(input.wallet);
	if (!input.actionId.trim() || !input.instrument.instrumentKey.trim()) throw new Error('release policy request identity is invalid');
	if (input.instrument.venue !== input.venue) throw new Error('release policy request venue does not match instrument');
	decimalParts(input.notionalUsd, 'notionalUsd');
	const params = new URLSearchParams({ wallet, actionId: input.actionId, venue: input.venue, instrument: input.instrument.instrumentKey, notionalUsd: input.notionalUsd, risk: input.risk });
	const response = await fetch(`/api/release-policy?${params.toString()}`, { headers: { accept: 'application/json' }, cache: 'no-store' });
	if (!response.ok) throw new Error(`release policy unavailable (${response.status})`);
	return assertEntitlementShape(await response.json() as ExecutionEntitlement);
}

export async function reserveAggregateCapacity(input: { wallet: string; releaseBuild: string; policyVersion: string; notionalUsd: string; risk: ExecutionRisk }): Promise<void> {
	if (input.risk !== 'increase') return;
	const wallet = normalizeWallet(input.wallet);
	decimalParts(input.notionalUsd, 'notionalUsd');
	const response = await fetch('/api/release-policy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, wallet }), cache: 'no-store' });
	if (!response.ok) throw new Error(response.status === 409 ? 'aggregate release cap would be exceeded' : 'release aggregate capacity is unavailable');
}
export function assertExecutionEntitled(entitlement: ExecutionEntitlement, input: ExecutionEntitlementInput, now = Date.now()): void {
	const wallet = normalizeWallet(input.wallet);
	assertEntitlementShape(entitlement);
	if (entitlement.network !== 'mainnet') throw new Error('execution policy is not mainnet-bound');
	if (!entitlement.walletAllowed) throw new Error('wallet is not allowlisted for this release');
	if (input.instrument.venue !== input.venue) throw new Error('execution instrument identity does not match venue');
	if (input.expectedReleaseBuild && entitlement.releaseBuild !== input.expectedReleaseBuild) throw new Error('execution entitlement release build does not match the running artifact');
	if (input.risk === 'increase' && entitlement.halted) throw new Error('execution is halted by release policy');
	if (entitlement.expiresAt <= now || entitlement.issuedAt > now) throw new Error('execution policy is expired or not yet valid');
	if (!entitlement.allowedActionIds.includes(input.actionId)) throw new Error(`action ${input.actionId} is not enabled by release policy`);
	if (!entitlement.allowedVenues.includes(input.venue)) throw new Error(`venue ${input.venue} is not enabled by release policy`);
	if (!entitlement.allowedOrderFamilies.includes(input.orderFamily)) throw new Error(`order family ${input.orderFamily} is not enabled by release policy`);
	if (input.risk === 'increase' && entitlement.mode !== 'full') throw new Error('release policy permits reduce-risk actions only');
	if (decimalCompare(input.notionalUsd, entitlement.perOrderCapUsd, 'notionalUsd', 'perOrderCapUsd') > 0) throw new Error('order exceeds the release per-order cap');
	if (input.aggregateNotionalUsd !== undefined && decimalCompare(input.aggregateNotionalUsd, entitlement.aggregateCapUsd, 'aggregateNotionalUsd', 'aggregateCapUsd') > 0) throw new Error('aggregate release cap would be exceeded');
	if (decimalCompare(entitlement.aggregateCapUsd, '0', 'aggregateCapUsd', 'zero') <= 0) throw new Error('release aggregate cap is not positive');
	if (!wallet) throw new Error('wallet identity is invalid');
}

export type ExecutionCapabilityInput = {
	account: AccountRef;
	instrument: InstrumentId;
	orderFamily: OrderFamily;
	persistence: 'venue-native' | 'device-local' | 'user-run';
	requiredFeeds: readonly string[];
} & ExecutionEntitlementInput;
