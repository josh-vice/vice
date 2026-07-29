// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { formatVenuePrice, formatVenueSize } from './venueFormat';

const btc = { symbol: 'BTC-USD-PERP', szDecimals: 5, priceDecimals: 1 };
const spot = { symbol: 'PURR-USDC', szDecimals: 0, priceDecimals: 8 };

describe('US-002 exact venue formatting', () => {
	test('enforces size and price precision', () => {
		expect(formatVenueSize(0.1234567, btc)).toBe('0.12346');
		expect(formatVenuePrice(61965.54, btc)).toBe('61966');
		expect(formatVenuePrice(0.01234567, spot)).toBe('0.012346');
	});

	test('rejects values that round to zero', () => {
		expect(() => formatVenueSize(0.000001, btc)).toThrow();
	});
});
