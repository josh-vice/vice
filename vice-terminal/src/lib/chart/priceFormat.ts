import type { MarketDescriptor } from '$lib/types';
import { chartPriceMinMove, chartPricePrecision } from './priceNormalization';

const MAX_AXIS_PRECISION = 8;

/**
 * Derive the lightweight-charts price-axis/crosshair format from the
 * authoritative market descriptor's venue precision rule. Fixed-tick venues
 * expose their actual increment; significant-figure and legacy markets use
 * the finest declared decimal display step.
 */
export function priceFormatForMarket(
	market: Pick<MarketDescriptor, 'priceDecimals' | 'instrument'> | null | undefined
): { type: 'price'; precision: number; minMove: number } {
	const precision = Math.min(MAX_AXIS_PRECISION, chartPricePrecision(market));
	const minMove = market?.instrument?.pricePrecision?.kind === 'fixedIncrement'
		? chartPriceMinMove(market)
		: 10 ** -precision;
	return {
		type: 'price',
		precision,
		minMove
	};
}
