// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { liveOrderPrice, liveOrderStatusLabel } from './liveOrder';

describe('US-CT-004 live order overlay state', () => {
	test('uses trigger price when present and preserves zero as an explicit value', () => {
		expect(liveOrderPrice({ triggerPrice: 100, price: 99 })).toBe(100);
		expect(liveOrderPrice({ triggerPrice: 0, price: 99 })).toBe(0);
		expect(liveOrderPrice({ price: 99 })).toBe(99);
		expect(liveOrderPrice({})).toBeNull();
	});

	test('exposes pending and rejected visual states before the resting status', () => {
		expect(liveOrderStatusLabel({ status: 'open', pending: true })).toBe('PENDING');
		expect(liveOrderStatusLabel({ status: 'open', error: 'rejected' })).toBe('REJECTED');
		expect(liveOrderStatusLabel({ status: 'partial' })).toBe('PARTIAL');
	});
});
