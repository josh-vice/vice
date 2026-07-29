// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { buildScaleLevels } from './scaleMath';

describe('US-004 scale ladder', () => {
	test('spans both boundaries and preserves total size', () => {
		const levels = buildScaleLevels(90, 110, 10, 5, 1);
		expect(levels[0].price).toBe(90);
		expect(levels[4].price).toBe(110);
		expect(levels.reduce((sum, level) => sum + level.size, 0)).toBeCloseTo(10);
	});

	test('supports deterministic skew and rejects unsafe bounds', () => {
		const levels = buildScaleLevels(90, 110, 10, 3, 2);
		expect(levels[2].size).toBeGreaterThan(levels[0].size);
		expect(() => buildScaleLevels(0, 110, 10, 3)).toThrow();
		expect(() => buildScaleLevels(90, 110, 10, 1)).toThrow();
	});
});
