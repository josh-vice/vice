// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { quoteNotionalAtoms, validateFatFinger } from './fatFinger';

const limits = {
	maxOrderNotional: '100',
	maxPositionNotionalByMarket: { 'hl:BTC': '150' }
};

function check(overrides = {}) {
	return {
		marketKey: 'hl:BTC', price: '50.00001', size: '2', side: 'buy', reduceOnly: false, currentSignedSize: '0',
		...overrides
	};
}

describe('US-010 local fat-finger limits', () => {
	test('uses fixed-point arithmetic and rounds a cap check upward', () => {
		expect(quoteNotionalAtoms('0.00000001', '0.00000001')).toBe(1n);
		expect(validateFatFinger({ maxOrderNotional: '100.00001', maxPositionNotionalByMarket: {} }, check())).toBe('Order exceeds your local maximum order notional');
	});

	test('rejects an order and a resulting position that exceed local caps', () => {
		expect(validateFatFinger(limits, check())).toBe('Order exceeds your local maximum order notional');
		expect(validateFatFinger({ ...limits, maxOrderNotional: '1000' }, check({ currentSignedSize: '2' }))).toBe('Order exceeds your local maximum position notional for this market');
	});

	test('allows a reducing order and blocks malformed enabled caps', () => {
		expect(validateFatFinger({ ...limits, maxOrderNotional: '1000' }, check({ side: 'sell', reduceOnly: true, currentSignedSize: '2' }))).toBeUndefined();
		expect(validateFatFinger({ maxOrderNotional: 'NaN', maxPositionNotionalByMarket: {} }, check({ price: '1', size: '1' }))).toBe('Set a positive maximum order notional or clear the limit');
	});
});
