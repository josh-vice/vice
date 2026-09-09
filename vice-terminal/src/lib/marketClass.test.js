import { describe, expect, test } from 'bun:test';
import { describeMarketClass } from './marketClass.ts';

const base = { marketKey: 'perp:BTC', apiCoin: 'BTC', assetId: 0, dex: null, baseToken: 'BTC', quoteToken: 'USD', szDecimals: 5, priceDecimals: 1, symbol: 'BTC-USD-PERP', name: 'BTC', type: 'perp', lastPrice: 0, change24h: 0, changePercent24h: 0, volume24h: 0 };

describe('market-class disclosure', () => {
	test('labels only authoritative core, spot, and HIP-3 classes', () => {
		expect(describeMarketClass({ ...base, kind: 'corePerp' }).label).toBe('Core perpetual');
		expect(describeMarketClass({ ...base, marketKey: 'spot:BTC', kind: 'spot', type: 'spot' }).label).toBe('Spot');
		expect(describeMarketClass({ ...base, marketKey: 'hip3:xyz:BTC', kind: 'hip3Perp', dex: 'xyz' }).label).toBe('HIP-3 · xyz');
	});

	test('shows an exact official perp category without calling it a tokenization claim', () => {
		expect(describeMarketClass({ ...base, marketKey: 'hip3:xyz:NVDA', apiCoin: 'xyz:NVDA', kind: 'hip3Perp', dex: 'xyz', venueCategory: 'stocks' })).toEqual({ label: 'HIP-3 · xyz · stocks', detail: 'Venue category: stocks; RWA classification unavailable', metadataOnly: false });
	});

	test('discloses that HIP-3 category data does not prove RWA status', () => {
		const display = describeMarketClass({ ...base, marketKey: 'hip3:xyz:NVDA', apiCoin: 'xyz:NVDA', kind: 'hip3Perp', dex: 'xyz', venueCategory: 'stocks' });
		expect(display?.label).toBe('HIP-3 · xyz · stocks');
		expect(display?.detail).toContain('RWA classification unavailable');
	});

});
