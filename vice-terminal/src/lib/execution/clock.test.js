import { describe, expect, test } from 'bun:test';
import { monotonicNowUs } from './clock';

describe('execution timing clock', () => {
	test('uses a high-resolution monotonic source for local SLO measurements', () => {
		const first = monotonicNowUs();
		const second = monotonicNowUs();
		expect(Number.isFinite(first)).toBe(true);
		expect(second).toBeGreaterThanOrEqual(first);
		expect(first).toBeLessThan(1e12);
	});
});
