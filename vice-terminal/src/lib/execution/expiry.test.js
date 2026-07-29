import { describe, expect, test } from 'bun:test';
import { EXECUTION_EXPIRES_AFTER_MS, executionExpiresAfter } from './expiry';

describe('US-002 bounded signed-action expiry', () => {
	test('creates an absolute expiry within the configured command window', () => {
		expect(executionExpiresAfter(1_000)).toBe(1_000 + EXECUTION_EXPIRES_AFTER_MS);
		expect(executionExpiresAfter(1_000, 125)).toBe(1_125);
	});

	test('rejects invalid expiry windows', () => {
		expect(() => executionExpiresAfter(1_000, 0)).toThrow();
		expect(() => executionExpiresAfter(Number.NaN, 1_000)).toThrow();
	});

	test('passes the same explicit expiry to every local signed mutation family', async () => {
		const source = await Bun.file(new URL('./localExecution.ts', import.meta.url)).text();
		expect(source).toContain('defaultExpiresAfter: () => executionExpiresAfter()');
		expect(source).toContain('exchange.order({');
		expect(source).toContain('exchange.cancel(');
		expect(source).toContain('exchange.modify(');
		expect(source).toContain('exchange.twapOrder(');
		expect(source).toContain('exchange.twapCancel(');
		expect(source).toContain('exchange.scheduleCancel(');
		expect(source).not.toContain('defaultExpiresAfter: 30_000');
	});
});
