// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
	resolveClickPlacementSide,
	riskBasedSize,
	wouldCrossSpread
} from './tradingMath';

describe('chart trading safety', () => {
	test('auto placement buys below and sells above market', () => {
		expect(resolveClickPlacementSide('auto', 99, 100)).toBe('buy');
		expect(resolveClickPlacementSide('auto', 101, 100)).toBe('sell');
	});

	test('detects post-only crossing prices', () => {
		expect(wouldCrossSpread('buy', 101, 99, 100)).toBe(true);
		expect(wouldCrossSpread('sell', 98, 99, 100)).toBe(true);
		expect(wouldCrossSpread('buy', 99.5, 99, 100)).toBe(false);
	});

	test('risk sizing is margin-clamped and precision-rounded', () => {
		expect(
			riskBasedSize({
				equity: 10_000,
				riskPercent: 1,
				entry: 100,
				stop: 95,
				marginFree: 100,
				leverage: 10,
				szDecimals: 2
			})
		).toBe(10);
	});
});
