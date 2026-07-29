import type { Trade } from './types';

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
