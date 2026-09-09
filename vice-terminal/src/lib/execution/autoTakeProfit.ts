import type { OrderSide } from '$lib/types';

export interface AutoTakeProfitConfig {
	enabled: boolean;
	startPrice: number;
	endPrice: number;
	levels: number;
	skew: number;
}

/** Auto-TP levels must all be on the profitable side of the entry bound. */
export function validateAutoTakeProfit(entrySide: OrderSide, entryPrice: number, config?: AutoTakeProfitConfig): string | undefined {
	if (!config?.enabled) return undefined;
	if (![entryPrice, config.startPrice, config.endPrice, config.skew].every(Number.isFinite) || entryPrice <= 0 || config.startPrice <= 0 || config.endPrice <= 0 || config.skew <= 0) return 'Auto take-profit requires positive entry and scale prices';
	if (!Number.isInteger(config.levels) || config.levels < 2 || config.levels > 100) return 'Auto take-profit requires 2 to 100 scale levels';
	const lowest = Math.min(config.startPrice, config.endPrice);
	const highest = Math.max(config.startPrice, config.endPrice);
	if (entrySide === 'buy' && lowest <= entryPrice) return 'Long auto take-profit prices must be above the entry price bound';
	if (entrySide === 'sell' && highest >= entryPrice) return 'Short auto take-profit prices must be below the entry price bound';
	return undefined;
}
