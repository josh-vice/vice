import { describe, expect, test } from 'bun:test';
import { marketCapabilities } from './marketCapabilities';

const base = { marketKey: 'perp:BTC', apiCoin: 'BTC', assetId: 0, dex: null, baseToken: 'BTC', quoteToken: 'USD', szDecimals: 5, priceDecimals: 1, symbol: 'BTC-PERP', name: 'BTC', type: 'perp', lastPrice: 100, change24h: 0, changePercent24h: 0, volume24h: 0 };

describe('marketCapabilities', () => {
	test('core and HIP-3 perps retain margin and lifecycle controls', () => {
		for (const kind of ['corePerp', 'hip3Perp']) {
			const profile = marketCapabilities({ ...base, kind, maxLeverage: 50 });
			expect(profile.executable).toBe(true);
			expect(profile.leverageEnabled).toBe(true);
			expect(profile.maxLeverage).toBe(50);
			expect(profile.usesMargin).toBe(true);
			expect(profile.supportsTriggers).toBe(true);
		}
	});
	test('spot uses quote sizing and no perp controls', () => {
		const profile = marketCapabilities({ ...base, kind: 'spot', type: 'spot' });
		expect(profile.amountUnit).toBe('quote');
		expect(profile.amountUnits).toEqual(['base', 'quote']);
		expect(profile.maxLeverage).toBe(1);
		expect(profile.leverageEnabled).toBe(false);
		expect(profile.supportsTriggers).toBe(false);
		expect(profile.supportsPositionLifecycle).toBe(false);
		expect(profile.allowedOrderTypes).toEqual(['limit', 'market']);
	});
	test('outcomes are public-data-only with a stable reason', () => {
		const profile = marketCapabilities({ ...base, kind: 'outcome', apiCoin: '#11610', type: 'spot', tradingAvailability: 'metadataOnly' });
		expect(profile.executable).toBe(false);
		expect(profile.allowedOrderTypes).toEqual([]);
		expect(profile.amountUnit).toBe('shares');
		expect(profile.supportsAdvancedOrders).toBe(false);
		expect(profile.readOnlyReason).toContain('lot, tick');
	});
});
