import { describe, expect, test } from 'bun:test';
import { nextTrailingExtreme, trailingTrigger } from './trailingMath';

describe('US-004 trailing-stop math', () => {
	test('sell exits trail upward extremes only', () => {
		expect(nextTrailingExtreme('sell', 100, 99)).toBe(100);
		expect(nextTrailingExtreme('sell', 100, 105)).toBe(105);
		expect(trailingTrigger('sell', 105, 2.5, 0.1)).toBe(102.5);
	});
	test('buy exits trail downward extremes only', () => {
		expect(nextTrailingExtreme('buy', 100, 101)).toBe(100);
		expect(nextTrailingExtreme('buy', 100, 95)).toBe(95);
		expect(trailingTrigger('buy', 95, 2.5, 0.1)).toBe(97.5);
	});
});
