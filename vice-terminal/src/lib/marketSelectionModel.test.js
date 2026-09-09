import { describe, expect, test } from 'bun:test';
import { firstMarketForType, marketMatchesType } from './marketSelectionModel.ts';

const markets = [
	{ kind: 'corePerp', marketKey: 'perp:BTC', apiCoin: 'BTC', symbol: 'BTC-PERP', name: 'BTC', baseToken: 'BTC', quoteToken: 'USD', dex: null },
	{ kind: 'spot', marketKey: 'spot:BTC', apiCoin: '@1', symbol: 'BTC-USDC', name: 'BTC spot', baseToken: 'BTC', quoteToken: 'USDC', dex: null },
];

describe('market selection model', () => {
	test('matches product classes without an option fallthrough', () => {
		expect(markets.filter((market) => marketMatchesType(market, 'perp'))).toHaveLength(1);
		expect(markets.filter((market) => marketMatchesType(market, 'spot'))).toHaveLength(1);
	});

	test('selects the first market matching type and query', () => {
		expect(firstMarketForType(markets, 'spot', 'spot:btc')?.marketKey).toBe('spot:BTC');
		expect(firstMarketForType(markets, 'perp', 'missing')).toBeUndefined();
	});
});
