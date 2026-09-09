import { describe, expect, test } from 'bun:test';
import { conditionalLadderTriggered, validConditionalLadderParameters } from './conditionalLadderMath.ts';

describe('conditional ladder trigger safety', () => {
	test('stop and take-profit directions are side-aware', () => {
		expect(conditionalLadderTriggered('buy', 'stop', 100, 100)).toBe(true);
		expect(conditionalLadderTriggered('sell', 'stop', 100, 99)).toBe(true);
		expect(conditionalLadderTriggered('buy', 'takeProfit', 100, 99)).toBe(true);
		expect(conditionalLadderTriggered('sell', 'takeProfit', 100, 101)).toBe(true);
		expect(conditionalLadderTriggered('buy', 'stop', 100, 99)).toBe(false);
	});

	test('rejects invalid ladder parameters', () => {
		expect(validConditionalLadderParameters(1, 100, 99, 101, 5, 1)).toBe(true);
		expect(validConditionalLadderParameters(1, 100, 99, 101, 1, 1)).toBe(false);
		expect(validConditionalLadderParameters(1, 100, 99, 101, 5.5, 1)).toBe(false);
		expect(validConditionalLadderParameters(0, 100, 99, 101, 5, 1)).toBe(false);
		expect(validConditionalLadderParameters(1, 0, 99, 101, 5, 1)).toBe(false);
		expect(validConditionalLadderParameters(1, 0, 99, 101, 5, 1, false)).toBe(true);
		expect(validConditionalLadderParameters(1, -10, 99, 101, 5, 1, true, true)).toBe(true);
		expect(validConditionalLadderParameters(1, Number.NaN, 99, 101, 5, 1, true, true)).toBe(false);
	});
});
