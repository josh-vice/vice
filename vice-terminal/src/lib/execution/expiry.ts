/**
 * The maximum lifetime of a signed exchange action.  This is deliberately
 * short enough to prevent stale clicks from being accepted, while leaving
 * enough time for a normal browser-to-venue round trip.
 */
export const EXECUTION_EXPIRES_AFTER_MS = 30_000;

export function executionExpiresAfter(
	now = Date.now(),
	ttlMs = EXECUTION_EXPIRES_AFTER_MS
): number {
	if (!Number.isFinite(now) || !Number.isFinite(ttlMs) || ttlMs <= 0) {
		throw new Error('Execution expiry must be a positive finite duration');
	}
	return Math.floor(now + ttlMs);
}
