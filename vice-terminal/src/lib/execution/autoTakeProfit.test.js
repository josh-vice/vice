// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { validateAutoTakeProfit } from './autoTakeProfit';

describe('US-010 auto take-profit bounds', () => {
	test('allows only profit-side reduce-only scale ranges', () => {
		expect(validateAutoTakeProfit('buy', 100, { enabled: true, startPrice: 105, endPrice: 110, levels: 3, skew: 1 })).toBeUndefined();
		expect(validateAutoTakeProfit('sell', 100, { enabled: true, startPrice: 90, endPrice: 95, levels: 3, skew: 1 })).toBeUndefined();
	});
	test('rejects crossing, non-profitable, and malformed ranges before entry', () => {
		expect(validateAutoTakeProfit('buy', 100, { enabled: true, startPrice: 99, endPrice: 110, levels: 3, skew: 1 })).toContain('above');
		expect(validateAutoTakeProfit('sell', 100, { enabled: true, startPrice: 90, endPrice: 101, levels: 3, skew: 1 })).toContain('below');
		expect(validateAutoTakeProfit('buy', 100, { enabled: true, startPrice: 105, endPrice: 110, levels: 1, skew: 1 })).toContain('2 to 100');
	});
});
