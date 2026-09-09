import { describe, expect, test } from 'bun:test';
import { RECENT_TRADES_LIMIT, mergeRecentTrades, filterTradesByMinimumNotional } from './tradeTape';
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
	test('defaults to a rolling window of the 100 newest unique trades', () => {
		const batch = Array.from({ length: 125 }, (_, index) => ({
			id: `trade-${index}`,
			price: 100 + index,
			size: 1,
			side: 'buy',
			timestamp: index
		}));

		const result = mergeRecentTrades([], batch);
		expect(RECENT_TRADES_LIMIT).toBe(100);
		expect(result).toHaveLength(100);
		expect(result[0].id).toBe('trade-124');
		expect(result.at(-1)?.id).toBe('trade-25');
	});

	test('does not expose unsupported liquidation UI in the market trades panel', () => {
		const source = readFileSync(new URL('./components/RecentTrades.svelte', import.meta.url), 'utf8');
		const subscriptions = readFileSync(new URL('./hl/subscriptions.ts', import.meta.url), 'utf8');
		expect(source).not.toContain('Liquidation labels unavailable');
		expect(source).toContain('latest 100');
		expect(subscriptions).toContain('mergeRecentTrades(get(recentTrades), normalizeTrades(trades.value), RECENT_TRADES_LIMIT)');
		expect(subscriptions).toContain('mergeRecentTrades(get(recentTrades), trades, RECENT_TRADES_LIMIT)');
	});
});
