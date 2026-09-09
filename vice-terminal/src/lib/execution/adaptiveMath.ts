import type { Trade } from '$lib/types';

export type AdaptiveMode = 'adaptive_twap' | 'vwap';

function normalize(values: number[]): number[] {
	const total = values.reduce((sum, value) => sum + value, 0);
	return total > 0 ? values.map((value) => value / total) : values.map(() => 1 / values.length);
}

/**
 * Build deterministic child-size weights from public trade flow. The planner
 * never invents account state and always preserves the requested total size.
 */
export function buildAdaptiveSliceSizes(
	totalSize: number,
	intervals: number,
	mode: AdaptiveMode,
	trades: Trade[],
	participation = 0.1
): number[] {
	if (!Number.isFinite(totalSize) || totalSize <= 0) throw new Error('Adaptive size must be positive');
	const count = Math.max(2, Math.min(100, Math.round(intervals)));
	const observed = trades
		.slice(0, count)
		.map((trade) => Math.max(0, trade.size))
		.filter((size) => Number.isFinite(size));
	const safeParticipation = Math.max(0.01, Math.min(1, participation));
	const weights = Array.from({ length: count }, (_, index) => {
		const flow = observed[index] ?? observed.at(-1) ?? 1;
		if (mode === 'vwap') return Math.max(0.0001, flow * safeParticipation);
		// Adaptive TWAP stays close to equal time slices while leaning toward
		// periods with more observed liquidity.
		return Math.max(0.0001, 1 + Math.min(2, flow / Math.max(1, observed.reduce((a, b) => a + b, 0) / Math.max(1, observed.length)) - 1) * 0.25);
	});
	return normalize(weights).map((weight) => totalSize * weight);
}
