import { describe, test, expect } from 'bun:test';
import { priceFormatForMarket } from './priceFormat';

describe('priceFormatForMarket', () => {
	test('derives precision and minMove from the descriptor priceDecimals', () => {
		expect(priceFormatForMarket({ priceDecimals: 5 })).toEqual({
			type: 'price',
			precision: 5,
			minMove: 0.00001
		});
	});

	test('falls back to 2 decimals when no market is selected', () => {
		expect(priceFormatForMarket(null)).toEqual({ type: 'price', precision: 2, minMove: 0.01 });
		expect(priceFormatForMarket(undefined)).toEqual({ type: 'price', precision: 2, minMove: 0.01 });
	});

	test('falls back to 2 decimals for a non-finite or negative value', () => {
		expect(priceFormatForMarket({ priceDecimals: Number.NaN })).toEqual({
			type: 'price',
			precision: 2,
			minMove: 0.01
		});
		expect(priceFormatForMarket({ priceDecimals: -1 })).toEqual({
			type: 'price',
			precision: 2,
			minMove: 0.01
		});
	});

	test('clamps to a maximum of 8 decimals for very high-precision markets', () => {
		expect(priceFormatForMarket({ priceDecimals: 12 })).toEqual({
			type: 'price',
			precision: 8,
			minMove: 1e-8
		});
	});

	test('rounds a non-integer priceDecimals value', () => {
		expect(priceFormatForMarket({ priceDecimals: 3.6 })).toEqual({
			type: 'price',
			precision: 4,
			minMove: 0.0001
		});
	});
});
