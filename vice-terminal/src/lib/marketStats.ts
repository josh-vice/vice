/** Hyperliquid settles perpetual funding on the next UTC hour. */
const FUNDING_INTERVAL_MS = 60 * 60 * 1_000;

export function nextFundingAt(now: number): number {
	return (Math.floor(now / FUNDING_INTERVAL_MS) + 1) * FUNDING_INTERVAL_MS;
}

export function formatFundingCountdown(now: number): string {
	const remaining = Math.max(0, nextFundingAt(now) - now);
	const minutes = Math.floor(remaining / 60_000);
	const seconds = Math.floor((remaining % 60_000) / 1_000);
	return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
