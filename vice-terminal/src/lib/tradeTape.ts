import type { Trade } from './types';

/** Merge incremental websocket batches into a bounded newest-first tape. */
export function mergeRecentTrades(existing: Trade[], incoming: Trade[], limit = 50): Trade[] {
	const byId = new Map<string, Trade>();
	for (const trade of [...existing, ...incoming]) byId.set(trade.id, trade);
	return [...byId.values()]
		.sort((a, b) => b.timestamp - a.timestamp)
		.slice(0, Math.max(0, Math.floor(limit)));
}

/**
 * Applies a client-only display filter to already-authoritative trades. Invalid
 * values are excluded rather than turned into a fabricated zero notional.
 */
export function filterTradesByMinimumNotional(trades: Trade[], minimumNotional: number): Trade[] {
	const threshold = Number.isFinite(minimumNotional) && minimumNotional > 0 ? minimumNotional : 0;
	return trades.filter((trade) =>
		Number.isFinite(trade.price) && trade.price > 0 &&
		Number.isFinite(trade.size) && trade.size > 0 &&
		trade.price * trade.size >= threshold
	);
}
