import { describe, expect, test } from 'bun:test';
import { topMarketMovers } from './marketMovers';

const market = (marketKey, changePercent24h, volume24h = 1) => ({
	marketKey,
	apiCoin: marketKey,
	assetId: 0,
	kind: 'corePerp',
	dex: null,
	baseToken: marketKey,
	quoteToken: 'USDC',
	szDecimals: 1,
	priceDecimals: 1,
	symbol: marketKey,
	name: marketKey,
	type: 'perp',
	lastPrice: 1,
	change24h: 0,
	changePercent24h,
	volume24h
});

describe('native market movers', () => {
	test('ranks exact canonical descriptors by 24-hour change and deterministic ties', () => {
		const rows = [market('BTC', 4, 10), market('ETH', 4, 20), market('SOL', -3, 50)];
		expect(topMarketMovers(rows, 'gainers', 2).map((row) => row.marketKey)).toEqual(['ETH', 'BTC']);
		expect(topMarketMovers(rows, 'losers', 2).map((row) => row.marketKey)).toEqual(['SOL', 'ETH']);
	});

	test('excludes metadata-only and unpriceable rows without fabricating a result', () => {
		const outcome = { ...market('OUTCOME', 99), kind: 'outcome' };
		const unpriced = { ...market('EMPTY', 50), lastPrice: 0 };
		expect(topMarketMovers([outcome, unpriced, market('BTC', 1)], 'gainers', 10).map((row) => row.marketKey)).toEqual(['BTC']);
		expect(topMarketMovers([market('BTC', 1)], 'gainers', 0)).toEqual([]);
	});
});
