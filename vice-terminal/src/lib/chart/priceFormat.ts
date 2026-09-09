import type { MarketDescriptor } from '$lib/types';

const DEFAULT_PRICE_PRECISION = 2;
const MAX_PRICE_PRECISION = 8;

/**
 * Derive the lightweight-charts price-axis/crosshair format from the
 * authoritative market descriptor's decimal precision. Falls back to a
 * conservative default only when no descriptor is selected, never guesses a
 * finer precision than the venue reports.
 */
export function priceFormatForMarket(
	market: Pick<MarketDescriptor, 'priceDecimals'> | null | undefined
): { type: 'price'; precision: number; minMove: number } {
	const precision = clampPrecision(market?.priceDecimals);
	return { type: 'price', precision, minMove: Math.pow(10, -precision) };
}

function clampPrecision(value: number | undefined): number {
	if (value === undefined || !Number.isFinite(value) || value < 0) return DEFAULT_PRICE_PRECISION;
	return Math.min(MAX_PRICE_PRECISION, Math.round(value));
}
