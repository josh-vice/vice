import { describe, expect, test } from 'bun:test';
import { formatFundingCountdown, nextFundingAt } from './marketStats';

describe('US-008 market-stat timing', () => {
	test('counts down to the next UTC funding hour without treating a boundary as a past event', () => {
		const boundary = Date.UTC(2026, 6, 24, 12, 0, 0);
		expect(nextFundingAt(boundary)).toBe(boundary + 60 * 60 * 1_000);
		expect(formatFundingCountdown(boundary)).toBe('60:00');
		expect(formatFundingCountdown(boundary + 59 * 60 * 1_000 + 59_000)).toBe('00:01');
	});
});
