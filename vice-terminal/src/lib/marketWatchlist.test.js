import { describe, expect, test } from 'bun:test';
import { buildMarketWatchlistGroups, marketMatchesWatchlistQuery } from './marketWatchlist.ts';

const base = { marketKey: 'hip3:xyz:NVDA', apiCoin: 'xyz:NVDA', assetId: 100_000, kind: 'hip3Perp', dex: 'xyz', baseToken: 'NVDA', quoteToken: 'USD', szDecimals: 1, priceDecimals: 1, symbol: 'XYZ:NVDA-PERP', name: 'NVDA Perp · xyz', type: 'perp', lastPrice: 0, change24h: 0, changePercent24h: 0, volume24h: 0 };

describe('US-007 market watchlist class search', () => {
	test('matches visible product-class words and exact official venue categories', () => {
		expect(marketMatchesWatchlistQuery({ ...base, venueCategory: 'stocks' }, 'hip-3')).toBe(true);
		expect(marketMatchesWatchlistQuery({ ...base, venueCategory: 'stocks' }, 'stocks')).toBe(true);
		expect(marketMatchesWatchlistQuery({ ...base, venueCategory: 'stocks' }, 'commodities')).toBe(false);
	});

	test('matches prediction as a class without inventing an outcome symbol', () => {
		const outcome = { ...base, marketKey: 'outcome:1:0', apiCoin: '#10', kind: 'outcome', dex: null, type: 'spot', symbol: 'Election · Yes', outcome: { outcomeId: 1, side: 0 } };
		expect(marketMatchesWatchlistQuery(outcome, 'prediction')).toBe(true);
	});
	test('matches the exact canonical market key', () => {
		expect(marketMatchesWatchlistQuery(base, 'hip3:xyz:nvda')).toBe(true);
	});

	test('forms descriptive category groups within each executable product class', () => {
		const core = { ...base, marketKey: 'perp:GOLD', apiCoin: 'GOLD', kind: 'corePerp', dex: null, symbol: 'GOLD-USD-PERP', venueCategory: 'commodities' };
		const groups = buildMarketWatchlistGroups([core, { ...base, venueCategory: 'stocks' }], new Set());
		expect(groups.map((group) => group.label)).toEqual(['Core Perps · commodities', 'HIP-3 · xyz · stocks']);
		expect(groups.every((group) => group.id.includes('uncategorized') || group.id.endsWith('commodities') || group.id.endsWith('stocks'))).toBe(true);
	});
});
