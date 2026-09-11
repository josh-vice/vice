// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { formatChartPrice, normalizeChartPrice, chartPriceMinMove } from './priceNormalization';
import { priceFormatForMarket } from './priceFormat';

const hyperliquid = {
	priceDecimals: 1,
	instrument: {
		pricePrecision: {
			kind: 'significantFigures',
			maxSignificantFigures: 5,
			maxDecimals: 1,
			integerPricesAllowed: true
		}
	}
};

const blofin = {
	priceDecimals: 1,
	instrument: {
		pricePrecision: { kind: 'fixedIncrement', increment: '0.5' },
		priceIncrement: '0.5'
	}
};

const tenths = {
	priceDecimals: 1,
	instrument: {
		pricePrecision: { kind: 'fixedIncrement', increment: '0.1' },
		priceIncrement: '0.1'
	}
};

describe('US-CT-001 chart price normalization', () => {
	test('normalizes a Hyperliquid significant-figure price before it reaches the ticket', () => {
		expect(normalizeChartPrice(61965.54, hyperliquid)).toBe(61966);
		expect(formatChartPrice(61965.54, hyperliquid)).toBe('61966.0');
	});

	test('snaps a fixed-increment venue to its nearest accepted tick', () => {
		expect(normalizeChartPrice(61965.74, blofin)).toBe(61965.5);
		expect(normalizeChartPrice(61965.76, blofin)).toBe(61966);
		expect(normalizeChartPrice(0.15, tenths)).toBe(0.2);
		expect(formatChartPrice(61965.74, blofin)).toBe('61965.5');
	});

	test('keeps legacy descriptor formatting compatible when canonical identity is absent', () => {
		expect(normalizeChartPrice(61965.54, { priceDecimals: 1 })).toBe(61966);
		expect(formatChartPrice(0.01234567, { priceDecimals: 8 })).toBe('0.01234600');
	});

	test('rejects invalid and zero-after-snap chart prices', () => {
		expect(normalizeChartPrice(Number.NaN, blofin)).toBeNull();
		expect(normalizeChartPrice(0, blofin)).toBeNull();
		expect(normalizeChartPrice(0.1, { priceDecimals: 1, instrument: blofin.instrument })).toBeNull();
	});

	test('derives a price-dependent keyboard step for significant-figure venues', () => {
		expect(chartPriceMinMove(hyperliquid)).toBe(0.1);
		expect(chartPriceMinMove(hyperliquid, 76599)).toBe(1);
		expect(chartPriceMinMove(hyperliquid, 12.34)).toBe(0.1);
	});

	test('uses the fixed increment for lightweight-charts axis precision', () => {
		expect(priceFormatForMarket(blofin)).toEqual({ type: 'price', precision: 1, minMove: 0.5 });
		expect(priceFormatForMarket(hyperliquid)).toEqual({ type: 'price', precision: 1, minMove: 0.1 });
	});
});
