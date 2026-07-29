import { describe, expect, test } from 'bun:test';
import { shouldRetrySmokeStatus } from './smoke-policy.mjs';

describe('runtime smoke retry policy', () => {
	test('retries only transient venue and proxy responses', () => {
		expect(shouldRetrySmokeStatus(429)).toBe(true);
		expect(shouldRetrySmokeStatus(500)).toBe(true);
		expect(shouldRetrySmokeStatus(503)).toBe(true);
		expect(shouldRetrySmokeStatus(400)).toBe(false);
		expect(shouldRetrySmokeStatus(401)).toBe(false);
		expect(shouldRetrySmokeStatus(404)).toBe(false);
	});
});
