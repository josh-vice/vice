import { describe, expect, test } from 'bun:test';
import { averageTrueRange, volatilityBasedSize } from './volatilitySizing';

const candles = [
	{ time: 1, open: 100, high: 110, low: 95, close: 105 },
	{ time: 2, open: 105, high: 115, low: 100, close: 110 },
	{ time: 3, open: 110, high: 120, low: 105, close: 115 }
];

describe('certified volatility sizing', () => {
	test('computes ATR from chart candles using true range', () => {
		expect(averageTrueRange(candles, 3)).toBeCloseTo(15, 8);
	});

	test('returns a precision- and margin-clamped size with a volatility stop', () => {
		const result = volatilityBasedSize({ candles, lookback: 3, stopMultiplier: 2, equity: 1000, riskPercent: 1, entry: 115, marginFree: 1000, leverage: 2, szDecimals: 2 });
		expect(result.stopDistance).toBeCloseTo(30, 8);
		expect(result.stop).toBeCloseTo(85, 8);
		expect(result.size).toBeGreaterThan(0);
		expect(result.size).toBeLessThanOrEqual((1000 * 2) / 115);
	});
});
