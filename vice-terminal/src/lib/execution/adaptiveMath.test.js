import { describe, expect, test } from 'bun:test';
import { buildAdaptiveSliceSizes } from './adaptiveMath';

describe('post-parity adaptive execution planner', () => {
	test('preserves total size and bounded interval count', () => {
		const slices = buildAdaptiveSliceSizes(10, 4, 'adaptive_twap', []);
		expect(slices).toHaveLength(4);
		expect(slices.reduce((sum, value) => sum + value, 0)).toBeCloseTo(10, 8);
		expect(slices.every((value) => value > 0)).toBe(true);
	});

	test('VWAP responds to observed public trade flow', () => {
		const slices = buildAdaptiveSliceSizes(10, 3, 'vwap', [
			{ id: '1', price: 1, size: 1, side: 'buy', timestamp: 1 },
			{ id: '2', price: 1, size: 5, side: 'buy', timestamp: 2 },
			{ id: '3', price: 1, size: 2, side: 'sell', timestamp: 3 }
		]);
		expect(slices[1]).toBeGreaterThan(slices[0]);
		expect(slices.reduce((sum, value) => sum + value, 0)).toBeCloseTo(10, 8);
	});
});
