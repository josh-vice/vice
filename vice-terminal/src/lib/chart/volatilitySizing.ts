import type { ChartCandle } from '$lib/types';
import { riskBasedSize } from './tradingMath';

export interface VolatilitySizingInput {
	candles: ChartCandle[];
	lookback: number;
	stopMultiplier: number;
	equity: number;
	riskPercent: number;
	entry: number;
	marginFree: number;
	leverage: number;
	szDecimals: number;
}

export interface VolatilitySizingResult {
	atr: number;
	stopDistance: number;
	stop: number;
	size: number;
}

export function averageTrueRange(candles: ChartCandle[], lookback: number): number {
	const window = candles.slice(-Math.max(2, Math.min(200, Math.round(lookback))));
	if (window.length < 2) return 0;
	const ranges = window.map((candle, index) => {
		const previous = window[index - 1]?.close ?? candle.open;
		return Math.max(candle.high - candle.low, Math.abs(candle.high - previous), Math.abs(candle.low - previous));
	});
	return ranges.slice(1).reduce((sum, value) => sum + value, 0) / Math.max(1, ranges.length - 1);
}

export function volatilityBasedSize(input: VolatilitySizingInput): VolatilitySizingResult {
	if (!Number.isFinite(input.entry) || input.entry <= 0) throw new Error('Volatility sizing requires a positive entry price');
	const atr = averageTrueRange(input.candles, input.lookback);
	if (!Number.isFinite(atr) || atr <= 0) throw new Error('Volatility sizing requires live chart history');
	const stopDistance = atr * Math.max(0.1, input.stopMultiplier);
	const stop = input.entry - stopDistance;
	const size = riskBasedSize({
		equity: input.equity,
		riskPercent: input.riskPercent,
		entry: input.entry,
		stop,
		marginFree: input.marginFree,
		leverage: input.leverage,
		szDecimals: input.szDecimals
	});
	return { atr, stopDistance, stop, size };
}

export function volatilitySizingCertified(): boolean {
	return import.meta.env.VITE_HL_CERTIFIED_VOLATILITY_SIZING === 'true';
}
