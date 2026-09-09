import { describe, expect, test } from 'bun:test';
import { validateOrderFlags } from './orders';

describe('US-002 order execution flags', () => {
	test('rejects the ambiguous post-only plus IOC combination before execution', () => {
		expect(validateOrderFlags(true, true)).toBe('Post Only and IOC cannot be enabled together');
		expect(validateOrderFlags(true, false)).toBeUndefined();
		expect(validateOrderFlags(false, true)).toBeUndefined();
	});

	test('rejects a stale POST flag on non-limit orders before signing', () => {
		expect(validateOrderFlags(true, false, 'market')).toBe('Post Only is only valid for limit orders');
		expect(validateOrderFlags(true, false, 'stop')).toBe('Post Only is only valid for limit orders');
		expect(validateOrderFlags(false, true, 'market')).toBeUndefined();
	});
});
