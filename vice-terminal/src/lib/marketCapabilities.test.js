import { describe, expect, test } from 'bun:test';
import { marketCapabilities } from './marketCapabilities';

const base = { marketKey: 'perp:BTC', apiCoin: 'BTC', assetId: 0, dex: null, baseToken: 'BTC', quoteToken: 'USD', szDecimals: 5, priceDecimals: 1, symbol: 'BTC-PERP', name: 'BTC', type: 'perp', lastPrice: 100, change24h: 0, changePercent24h: 0, volume24h: 0 };
const blofinMarket = {
	...base,
	marketKey: 'blofin:linearPerp:BTC-USDT',
	apiCoin: 'BTC-USDT',
	kind: 'corePerp',
	baseToken: 'BTC',
	quoteToken: 'USDT',
	symbol: 'BTC-USDT',
	name: 'BTC-USDT',
	instrument: {
		instrumentKey: 'blofin:linearPerp:BTC-USDT',
		venue: 'blofin',
		venueSymbol: 'BTC-USDT',
		product: 'linearPerp',
		baseAsset: 'BTC',
		quoteAsset: 'USDT',
		settlementAsset: 'USDT',
		contractMultiplier: '0.001',
		priceIncrement: '0.5',
		pricePrecision: { kind: 'fixedIncrement', increment: '0.5' },
		sizeIncrement: '0.1'
	}
};
const blofinAccount = { accountKey: 'blofin:demo:account-1', venue: 'blofin', credentialRef: 'credential-1', accountMode: 'futures:demo' };

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
	test('BloFin linear perps intersect venue capabilities with an authenticated demo account', () => {
		const profile = marketCapabilities(blofinMarket, { account: blofinAccount, environment: 'demo' });
		expect(profile.executable).toBe(true);
		expect(profile.allowedOrderTypes).toEqual(['limit', 'market']);
		expect(profile.supportsPostOnly).toBe(true);
		expect(profile.supportsIoc).toBe(true);
		expect(profile.supportsHedgeMode).toBe(false);
		expect(profile.supportsMarginModes).toBe(true);
		expect(profile.supportsAmend).toBe(true);
		expect(profile.amendSemantics).toBe('inPlace');
		expect(profile.supportsClientOrderIds).toBe(true);
		expect(profile.supportsPrivateStreams).toBe(true);
		expect(profile.privateStreamGuarantee).toBe('authenticatedReconciliation');
		expect(profile.supportsNativeAlgorithms).toBe(false);
		expect(profile.nativeAlgorithmTypes).toEqual([]);
		expect(profile.certification).toBe('reviewOnly');
	});
	test('BloFin requires an account and stays read-only in production while reviewOnly', () => {
		expect(marketCapabilities(blofinMarket, { account: null, environment: 'demo' })).toMatchObject({
			executable: false,
			readOnlyReason: 'Connect a BloFin account before placing an order.'
		});
		expect(marketCapabilities(blofinMarket, { account: blofinAccount, environment: 'production' })).toMatchObject({
			executable: false,
			readOnlyReason: 'BloFin live execution is not certified; use demo trading'
		});
	});
});
