export type ScaleLevel = { price: number; size: number };

export function buildScaleLevels(
	startPrice: number,
	endPrice: number,
	totalSize: number,
	levels: number,
	skew = 1
): ScaleLevel[] {
	if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice) || startPrice <= 0 || endPrice <= 0) {
		throw new Error('Scale prices must be positive');
	}
	if (!Number.isFinite(totalSize) || totalSize <= 0) throw new Error('Scale size must be positive');
	if (!Number.isInteger(levels) || levels < 2 || levels > 100) throw new Error('Scale levels must be between 2 and 100');
	if (!Number.isFinite(skew) || skew <= 0) throw new Error('Scale skew must be positive');

	const weights = Array.from({ length: levels }, (_, index) =>
		Math.pow((index + 1) / levels, skew - 1)
	);
	const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
	return weights.map((weight, index) => ({
		price: startPrice + ((endPrice - startPrice) * index) / (levels - 1),
		size: (totalSize * weight) / totalWeight
	}));
}
