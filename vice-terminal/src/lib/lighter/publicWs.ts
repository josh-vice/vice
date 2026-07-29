import type { OrderBook, OrderBookLevel } from '$lib/types';

/**
 * Official unauthenticated streaming endpoints, pinned to Lighter's documented
 * read-only mode. This public adapter never needs transaction capability.
 */
export const LIGHTER_MAINNET_PUBLIC_WS = 'wss://mainnet.zklighter.elliot.ai/stream?readonly=true';
export const LIGHTER_TESTNET_PUBLIC_WS = 'wss://testnet.zklighter.elliot.ai/stream?readonly=true';

export type LighterBookState = {
	marketId: number;
	nonce: string;
	bids: Map<string, number>;
	asks: Map<string, number>;
};

export type LighterBookResult =
	| { status: 'applied'; state: LighterBookState; book: OrderBook }
	| { status: 'gap' | 'invalid'; state: LighterBookState | null };

type BookFrame = {
	type?: unknown;
	channel?: unknown;
	order_book?: {
		code?: unknown;
		asks?: unknown;
		bids?: unknown;
		nonce?: unknown;
		begin_nonce?: unknown;
	};
};

function sequence(value: unknown): string | null {
	if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+$/.test(String(value))) return null;
	return String(value);
}

function levels(value: unknown, allowZero: boolean): Map<string, number> | null {
	if (!Array.isArray(value)) return null;
	const output = new Map<string, number>();
	for (const level of value) {
		if (!level || typeof level !== 'object') return null;
		const row = level as { price?: unknown; size?: unknown };
		const price = Number(row.price);
		const size = Number(row.size);
		if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(size) || size < 0 || (!allowZero && size === 0)) return null;
		output.set(String(price), size);
	}
	return output;
}

function merge(previous: Map<string, number>, updates: Map<string, number>): Map<string, number> {
	const next = new Map(previous);
	for (const [price, size] of updates) {
		if (size === 0) next.delete(price);
		else next.set(price, size);
	}
	return next;
}

function bookFromLevels(bids: Map<string, number>, asks: Map<string, number>): OrderBook | null {
	const bidLevels = [...bids.entries()].map(([price, size]) => ({ price: Number(price), size })).sort((a, b) => b.price - a.price).slice(0, 200);
	const askLevels = [...asks.entries()].map(([price, size]) => ({ price: Number(price), size })).sort((a, b) => a.price - b.price).slice(0, 200);
	if (bidLevels.length === 0 || askLevels.length === 0 || bidLevels[0].price >= askLevels[0].price) return null;
	let bidTotal = 0;
	const normalizedBids: OrderBookLevel[] = bidLevels.map((level) => ({ ...level, total: bidTotal += level.size }));
	let askTotal = 0;
	const normalizedAsks: OrderBookLevel[] = askLevels.map((level) => ({ ...level, total: askTotal += level.size }));
	const spread = normalizedAsks[0].price - normalizedBids[0].price;
	return { bids: normalizedBids, asks: normalizedAsks, spread, spreadPercent: (spread / normalizedBids[0].price) * 100 };
}

/** Build the exact public order-book subscription; it has no account fields. */
export function lighterBookSubscribe(marketId: number): string {
	if (!Number.isSafeInteger(marketId) || marketId < 0) throw new Error('Lighter WebSocket subscription requires a non-negative exact market id');
	return JSON.stringify({ type: 'subscribe', channel: `order_book/${marketId}` });
}

/**
 * Apply one Lighter public book frame. The first valid frame is the documented
 * subscription snapshot. Afterwards `begin_nonce` must equal the preceding
 * `nonce`; otherwise the caller must resubscribe from a new snapshot.
 */
export function applyLighterBookFrame(previous: LighterBookState | null, marketId: number, frame: BookFrame): LighterBookResult {
	if (frame.channel !== `order_book:${marketId}` || !frame.order_book || frame.order_book.code !== 0) {
		return { status: 'invalid', state: previous };
	}
	const nonce = sequence(frame.order_book.nonce);
	const beginNonce = sequence(frame.order_book.begin_nonce);
	const bids = levels(frame.order_book.bids, previous !== null);
	const asks = levels(frame.order_book.asks, previous !== null);
	if (!nonce || !beginNonce || !bids || !asks) return { status: 'invalid', state: previous };
	if (previous === null) {
		if (frame.type !== 'subscribed/order_book') return { status: 'invalid', state: previous };
		const book = bookFromLevels(bids, asks);
		if (!book) return { status: 'invalid', state: previous };
		return { status: 'applied', state: { marketId, nonce, bids, asks }, book };
	}
	if (frame.type !== 'update/order_book') return { status: 'invalid', state: previous };
	if (previous.marketId !== marketId) return { status: 'invalid', state: previous };
	if (beginNonce !== previous.nonce) return { status: 'gap', state: previous };
	const nextBids = merge(previous.bids, bids);
	const nextAsks = merge(previous.asks, asks);
	const book = bookFromLevels(nextBids, nextAsks);
	if (!book) return { status: 'invalid', state: previous };
	return { status: 'applied', state: { marketId, nonce, bids: nextBids, asks: nextAsks }, book };
}
