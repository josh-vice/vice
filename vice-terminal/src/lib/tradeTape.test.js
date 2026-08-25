import { describe, expect, test } from 'bun:test';
import { mergeRecentTrades, filterTradesByMinimumNotional } from './tradeTape';
import { readFileSync } from 'node:fs';

const trades = [
	{ id: 'small', price: 100, size: 2, side: 'buy', timestamp: 1 },
	{ id: 'large', price: 250, size: 8, side: 'sell', timestamp: 2 },
	{ id: 'bad', price: Number.NaN, size: 1, side: 'buy', timestamp: 3 }
];

describe('US-008 trade tape minimum notional filter', () => {
	test('filters on authoritative price times size without changing order or source data', () => {
		expect(filterTradesByMinimumNotional(trades, 1_000).map((trade) => trade.id)).toEqual(['large']);
		expect(filterTradesByMinimumNotional(trades, 0).map((trade) => trade.id)).toEqual(['small', 'large']);
		expect(trades).toHaveLength(3);
	});
	test('merges websocket batches without losing earlier trades or duplicating IDs', () => {
		const existing = [
			{ id: 'old', price: 100, size: 1, side: 'buy', timestamp: 10 },
			{ id: 'same', price: 101, size: 1, side: 'sell', timestamp: 11 }
		];
		const incoming = [
			{ id: 'same', price: 102, size: 2, side: 'sell', timestamp: 12 },
			{ id: 'new', price: 103, size: 1, side: 'buy', timestamp: 13 }
		];
		expect(mergeRecentTrades(existing, incoming, 3)).toEqual([incoming[1], incoming[0], existing[0]]);
	});

	test('does not fabricate public liquidation labels when the venue trade schema lacks them', () => {
		const source = readFileSync(new URL('./components/RecentTrades.svelte', import.meta.url), 'utf8');
		expect(source).toContain('Liquidation labels unavailable');
		expect(source).toContain('does not classify liquidation orders');
	});
});
