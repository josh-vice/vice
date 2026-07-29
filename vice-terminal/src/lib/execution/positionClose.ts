import type { MarketDescriptor, OrderBook, Position } from '$lib/types';

export type PositionCloseMode = 'market' | 'quote';

export interface PositionCloseIntent {
	marketKey: string;
	side: 'buy' | 'sell';
	type: 'market' | 'limit';
	price: number;
	size: number;
	reduceOnly: true;
	ioc: boolean;
}

/** Builds a close only when every identity and selected-market feed matches. */
export function buildPositionCloseIntent(
	position: Position | undefined,
	registry: MarketDescriptor[],
	selected: MarketDescriptor | null,
	book: OrderBook,
	mode: PositionCloseMode
): { intent?: PositionCloseIntent; error?: string } {
	if (!position?.apiCoin || !position.marketKey) return { error: 'Position identity is incomplete; reconcile account state before closing' };
	const market = registry.find((candidate) => candidate.apiCoin === position.apiCoin && candidate.marketKey === position.marketKey);
	if (!market) return { error: 'Position market is unavailable; reconcile account state before closing' };
	if (!selected || selected.apiCoin !== market.apiCoin || selected.marketKey !== market.marketKey) {
		return { error: 'Select this position market so its live feed is authoritative before closing' };
	}
	if (!Number.isFinite(position.size) || position.size <= 0) return { error: 'Position size is invalid; reconcile account state before closing' };
	const side = position.side === 'long' ? 'sell' : 'buy';
	const price = mode === 'market'
		? market.lastPrice
		: side === 'sell' ? book.bids[0]?.price : book.asks[0]?.price;
	if (!Number.isFinite(price) || !price || price <= 0) return { error: 'A live executable quote is required before placing a limit close' };
	return {
		intent: {
			marketKey: market.marketKey,
			side,
			type: mode === 'market' ? 'market' : 'limit',
			price,
			size: position.size,
			reduceOnly: true,
			ioc: mode === 'market'
		}
	};
}
