import type { MarketDescriptor } from '$lib/types';
import type { PricePrecisionRule } from '$lib/venue/identity';

const DEFAULT_PRICE_PRECISION = 2;
const LEGACY_SIGNIFICANT_FIGURES = 5;
const MAX_PRICE_PRECISION = 18;

type ChartPriceMarket = Pick<MarketDescriptor, 'priceDecimals' | 'instrument'> | {
	priceDecimals?: number;
	instrument?: { pricePrecision?: PricePrecisionRule };
} | null | undefined;

function clampPrecision(value: number | undefined): number {
	if (value === undefined || !Number.isFinite(value) || value < 0) return DEFAULT_PRICE_PRECISION;
	return Math.min(MAX_PRICE_PRECISION, Math.round(value));
}

function decimalPlaces(value: string): number {
	const fraction = value.split('.')[1] ?? '';
	return Math.min(MAX_PRICE_PRECISION, fraction.replace(/0+$/, '').length);
}

function validPositiveDecimal(value: string | undefined): number | null {
	if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function fixedIncrement(rule: PricePrecisionRule | undefined): { increment: number; precision: number } | null {
	if (!rule || rule.kind !== 'fixedIncrement') return null;
	const increment = validPositiveDecimal(rule.increment);
	return increment === null ? null : { increment, precision: decimalPlaces(rule.increment) };
}

function significantFigureRule(rule: PricePrecisionRule | undefined): { figures: number; decimals: number } | null {
	if (
		!rule ||
		rule.kind !== 'significantFigures' ||
		!Number.isInteger(rule.maxSignificantFigures) ||
		rule.maxSignificantFigures < 1 ||
		!Number.isInteger(rule.maxDecimals) ||
		rule.maxDecimals < 0
	) return null;
	return {
		figures: Math.min(MAX_PRICE_PRECISION, rule.maxSignificantFigures),
		decimals: clampPrecision(rule.maxDecimals)
	};
}

function roundToDecimals(value: number, precision: number): number {
	return Number(value.toFixed(clampPrecision(precision)));
}

/**
 * Convert a chart coordinate into the exact price representation used by the
 * selected venue. This is a UI boundary: callers should use the returned
 * value for both ticket state and chart labels instead of retaining the raw
 * lightweight-charts floating-point coordinate.
 */
export function normalizeChartPrice(price: number | null | undefined, market: ChartPriceMarket): number | null {
	if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;

	const rule = market?.instrument?.pricePrecision;
	const fixed = fixedIncrement(rule);
	if (fixed) {
		const scale = 10 ** fixed.precision;
		const incrementUnits = Math.max(1, Math.round(fixed.increment * scale));
		const snapped = Math.round((price * scale) / incrementUnits) * incrementUnits / scale;
		const normalized = roundToDecimals(snapped, fixed.precision);
		return normalized > 0 && Number.isFinite(normalized) ? normalized : null;
	}

	const significant = significantFigureRule(rule);
	if (significant) {
		const rounded = Number(price.toPrecision(significant.figures));
		const normalized = roundToDecimals(rounded, significant.decimals);
		return normalized > 0 && Number.isFinite(normalized) ? normalized : null;
	}

	// Preserve the pre-canonical-identity execution behavior for legacy market
	// objects: five significant figures constrained by priceDecimals.
	const rounded = Number(price.toPrecision(LEGACY_SIGNIFICANT_FIGURES));
	const normalized = roundToDecimals(rounded, clampPrecision(market?.priceDecimals));
	return normalized > 0 && Number.isFinite(normalized) ? normalized : null;
}

/** Display a normalized chart price without exposing coordinate noise. */
export function formatChartPrice(price: number | null | undefined, market: ChartPriceMarket): string {
	const normalized = normalizeChartPrice(price, market);
	if (normalized === null) return '—';

	const fixed = fixedIncrement(market?.instrument?.pricePrecision);
	if (fixed) return normalized.toFixed(fixed.precision);

	const significant = significantFigureRule(market?.instrument?.pricePrecision);
	const precision = significant?.decimals ?? clampPrecision(market?.priceDecimals);
	return normalized.toFixed(precision);
}

/** The smallest visible price step for lightweight-charts and drag guards. */
export function chartPriceMinMove(market: ChartPriceMarket, price?: number): number {
	const fixed = fixedIncrement(market?.instrument?.pricePrecision);
	if (fixed) return fixed.increment;
	const significant = significantFigureRule(market?.instrument?.pricePrecision);
	const precision = significant
		? price !== undefined && Number.isFinite(price) && price > 0
			? Math.min(significant.decimals, Math.max(0, significant.figures - 1 - Math.floor(Math.log10(price))))
			: significant.decimals
		: clampPrecision(market?.priceDecimals);
	return 10 ** -precision;
}

export function chartPricePrecision(market: ChartPriceMarket): number {
	const fixed = fixedIncrement(market?.instrument?.pricePrecision);
	if (fixed) return fixed.precision;
	const significant = significantFigureRule(market?.instrument?.pricePrecision);
	return significant?.decimals ?? clampPrecision(market?.priceDecimals);
}
