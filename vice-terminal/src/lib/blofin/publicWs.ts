import type { OrderBook, OrderBookLevel } from '$lib/types';

export const BLOFIN_PUBLIC_WS = 'wss://openapi.blofin.com/ws/public';
export const BLOFIN_DEMO_PUBLIC_WS = 'wss://demo-trading-openapi.blofin.com/ws/public';

export type BlofinPublicChannel = 'books' | 'books5' | 'trades' | 'tickers' | `candle${string}`;
export type BlofinBookState = { instId: string; sequence: string; bids: Map<string, number>; asks: Map<string, number> };
export type BlofinBookResult = { status: 'applied'; state: BlofinBookState; book: OrderBook } | { status: 'gap' | 'invalid'; state: BlofinBookState | null };

type BookFrame = {
	arg?: { channel?: unknown; instId?: unknown };
	action?: unknown;
	data?: { asks?: unknown; bids?: unknown; prevSeqId?: unknown; seqId?: unknown };
};

function sequence(value: unknown): string | null {
	if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+$/.test(String(value))) return null;
	return String(value);
}

function levelMap(value: unknown, allowZero: boolean): Map<string, number> | null {
	if (!Array.isArray(value)) return null;
	const result = new Map<string, number>();
	for (const item of value) {
		if (!Array.isArray(item) || item.length < 2) return null;
		const price = Number(item[0]);
		const size = Number(item[1]);
		if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(size) || size < 0 || (!allowZero && size === 0)) return null;
		result.set(String(price), size);
	}
	return result;
}

function merge(base: Map<string, number>, changes: Map<string, number>): Map<string, number> {
	const next = new Map(base);
	for (const [price, size] of changes) {
		if (size === 0) next.delete(price);
		else next.set(price, size);
	}
	return next;
}

function asBook(bids: Map<string, number>, asks: Map<string, number>): OrderBook | null {
	const bidEntries = [...bids.entries()].map(([price, size]) => ({ price: Number(price), size })).sort((a, b) => b.price - a.price).slice(0, 200);
	const askEntries = [...asks.entries()].map(([price, size]) => ({ price: Number(price), size })).sort((a, b) => a.price - b.price).slice(0, 200);
	if (bidEntries.length === 0 || askEntries.length === 0 || bidEntries[0].price >= askEntries[0].price) return null;
	let bidTotal = 0;
	const normalizedBids: OrderBookLevel[] = bidEntries.map((level) => ({ ...level, total: bidTotal += level.size }));
	let askTotal = 0;
	const normalizedAsks: OrderBookLevel[] = askEntries.map((level) => ({ ...level, total: askTotal += level.size }));
	const spread = normalizedAsks[0].price - normalizedBids[0].price;
	return { bids: normalizedBids, asks: normalizedAsks, spread, spreadPercent: (spread / normalizedBids[0].price) * 100 };
}

/** Build the unauthenticated public WebSocket subscription message. */
export function blofinPublicSubscribe(channel: BlofinPublicChannel, instId: string): string {
	if (instId.trim().length === 0) throw new Error('BloFin WebSocket subscription requires an exact instId');
	return JSON.stringify({ op: 'subscribe', args: [{ channel, instId }] });
}

/**
 * Apply one `books` frame. `books5` is deliberately excluded because it has
 * no incremental sequence contract. Callers must resubscribe after `gap`.
 */
export function applyBlofinBookFrame(previous: BlofinBookState | null, frame: BookFrame): BlofinBookResult {
	if (frame.arg?.channel !== 'books' || typeof frame.arg.instId !== 'string' || frame.arg.instId.length === 0 || !frame.data) return { status: 'invalid', state: previous };
	const instId = frame.arg.instId;
	if (previous && previous.instId !== instId) return { status: 'invalid', state: previous };
	const seqId = sequence(frame.data.seqId);
	const prevSeqId = sequence(frame.data.prevSeqId);
	const isSnapshot = frame.action === 'snapshot';
	const bids = levelMap(frame.data.bids, !isSnapshot);
	const asks = levelMap(frame.data.asks, !isSnapshot);
	if (!seqId || !prevSeqId || !bids || !asks) return { status: 'invalid', state: previous };
	if (isSnapshot) {
		if (prevSeqId !== '0') return { status: 'invalid', state: previous };
		const book = asBook(bids, asks);
		if (!book) return { status: 'invalid', state: previous };
		const state = { instId, sequence: seqId, bids, asks };
		return { status: 'applied', state, book };
	}
	if (frame.action !== 'update' || !previous) return { status: 'invalid', state: previous };
	if (prevSeqId !== previous.sequence) return { status: 'gap', state: previous };
	const nextBids = merge(previous.bids, bids);
	const nextAsks = merge(previous.asks, asks);
	const book = asBook(nextBids, nextAsks);
	if (!book) return { status: 'invalid', state: previous };
	const state = { instId, sequence: seqId, bids: nextBids, asks: nextAsks };
	return { status: 'applied', state, book };
}
