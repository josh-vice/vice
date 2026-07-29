import { isAddress, type Address } from 'viem';

function configuredBuilderAddress(): Address | null {
	const value = import.meta.env.VITE_HL_BUILDER_ADDRESS?.trim();
	return value && isAddress(value) ? (value as Address) : null;
}

export function builderRevenueEnabled(): boolean {
	return import.meta.env.VITE_HL_ENABLE_BUILDER_REVENUE === 'true';
}

/** Hyperliquid builder fee units are tenths of a basis point: f=1 is 0.1 bp. */
export const MAX_BUILDER_FEE_TENTHS_BP = 1;
export const BUILDER_APPROVAL_RATE = '0.001%';

export function configuredBuilder(): Address | null {
	return builderRevenueEnabled() ? configuredBuilderAddress() : null;
}

export function builderFeeIsApproved(maxFeeTenthsBp: number, requestedFeeTenthsBp = 1): boolean {
	return (
		Number.isFinite(maxFeeTenthsBp) &&
		Number.isFinite(requestedFeeTenthsBp) &&
		requestedFeeTenthsBp > 0 &&
		requestedFeeTenthsBp <= MAX_BUILDER_FEE_TENTHS_BP &&
		maxFeeTenthsBp >= requestedFeeTenthsBp
	);
}

/**
 * Native venue-managed TWAPs do not accept Hyperliquid builder metadata in the
 * current SDK/API shape. Keep this explicit instead of sending an invalid
 * payload and over-reporting builder attribution.
 */
export function builderEligibleForOrderType(orderType: string): boolean {
	return orderType !== 'twap';
}

export function builderForOrderType(
	builder: { b: Address; f: number } | undefined,
	orderType: string
): { b: Address; f: number } | undefined {
	if (!builderEligibleForOrderType(orderType) || !builder || !isAddress(builder.b)) return undefined;
	if (!Number.isInteger(builder.f) || builder.f <= 0 || builder.f > MAX_BUILDER_FEE_TENTHS_BP) return undefined;
	return builder;
}

/**
 * Preserve trading when venue approval changed after unlock. A fallback is
 * safe only for an explicit builder rejection before any order was accepted;
 * transport uncertainty and partial acceptance must reconcile instead.
 */
export function shouldRetryWithoutBuilder(
	builderPresent: boolean,
	errorCode: string | undefined,
	venueOrderIds: string[]
): boolean {
	return builderPresent && errorCode === 'builder_rejected' && venueOrderIds.length === 0;
}

/** Builder tagging requires a current venue-backed referral/fee snapshot. */
export function revenueAttributionReady(
	syncStatus: string,
	snapshot: { status?: string } | null | undefined
): boolean {
	return syncStatus === 'live' && snapshot?.status === 'live';
}

export function orderTypeRevenueDisclosure(orderType: string): string | null {
	if (!configuredBuilderAddress()) return null;
	if (!builderRevenueEnabled()) {
		return 'Builder revenue is currently disabled; orders carry no Vice builder fee.';
	}
	if (!builderEligibleForOrderType(orderType)) {
		return 'Native TWAP is venue-managed and currently carries no builder metadata or Vice builder fee.';
	}
	return 'This order includes a 0.1 bp Hyperliquid builder fee after one-time wallet approval.';
}

export function builderDisclosure(): string | null {
	if (!configuredBuilderAddress()) return null;
	return builderRevenueEnabled()
		? 'Eligible orders include a 0.1 bp Hyperliquid builder fee after one-time wallet approval. Native TWAP is excluded because the venue-managed API does not accept builder metadata.'
		: 'Builder revenue is currently disabled; orders carry no Vice builder fee.';
}

export function revenueDisclosure(): string | null {
	const disclosures: string[] = [];
	const builder = builderDisclosure();
	if (builder) disclosures.push(builder);
	if (import.meta.env.VITE_HL_REFERRAL_CODE?.trim()) {
		disclosures.push('If your account is eligible and has no referrer, Vice will request its configured Hyperliquid referral.');
	}
	return disclosures.length ? disclosures.join(' ') : null;
}

export function referralConfigured(): boolean {
	return Boolean(import.meta.env.VITE_HL_REFERRAL_CODE?.trim());
}

/**
 * Referral codes are public venue identifiers, but assignment is still a
 * wallet mutation. Expose the configured code only for the explicit consent
 * preview; never use this helper as permission to assign it automatically.
 */
export function configuredReferralCode(): string | null {
	const code = import.meta.env.VITE_HL_REFERRAL_CODE?.trim();
	return code || null;
}
