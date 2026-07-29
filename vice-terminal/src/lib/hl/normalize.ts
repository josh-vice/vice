import type { OrderBook, OrderBookLevel, Trade, ChartCandle } from '$lib/types';
import type { L2BookWsEvent as L2BookEvent } from '@nktkas/hyperliquid';
import type { RecentTradesResponse } from '@nktkas/hyperliquid/api/info';
import type { CandleEvent } from '@nktkas/hyperliquid/api/subscription';

/** Return null instead of rendering a malformed or crossed venue snapshot. */
export function normalizeL2Book(event: L2BookEvent): OrderBook | null {
	const [bidLevels, askLevels] = event.levels;
	if (!Array.isArray(bidLevels) || !Array.isArray(askLevels) || bidLevels.length === 0 || askLevels.length === 0) return null;

	let bidTotal = 0;
	const bids: OrderBookLevel[] = [];
	for (const level of bidLevels.slice(0, 20)) {
		const size = parseFloat(level.sz);
		const price = parseFloat(level.px);
		if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(size) || size <= 0 || (bids.length > 0 && price >= bids[bids.length - 1].price)) return null;
		bidTotal += size;
		bids.push({
			price,
			size,
			total: bidTotal
		});
	}

	let askTotal = 0;
	const asks: OrderBookLevel[] = [];
	for (const level of askLevels.slice(0, 20)) {
		const size = parseFloat(level.sz);
		const price = parseFloat(level.px);
		if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(size) || size <= 0 || (asks.length > 0 && price <= asks[asks.length - 1].price)) return null;
		askTotal += size;
		asks.push({
			price,
			size,
			total: askTotal
		});
	}

	const bestBid = bids[0]?.price ?? 0;
	const bestAsk = asks[0]?.price ?? 0;
	const spread = bestAsk - bestBid;
	if (!Number.isFinite(spread) || spread <= 0) return null;

	return {
		bids,
		asks,
		spread,
		spreadPercent: bestBid > 0 ? (spread / bestBid) * 100 : 0
	};
}

export function normalizeTrades(trades: RecentTradesResponse): Trade[] {
	return trades.map((t) => ({
		id: `${t.tid}`,
		price: parseFloat(t.px),
		size: parseFloat(t.sz),
		side: t.side === 'B' ? 'buy' : 'sell',
		timestamp: t.time
	}));
}

export function normalizeCandle(c: CandleEvent): ChartCandle {
	return {
		time: Math.floor(c.t / 1000),
		open: parseFloat(c.o),
		high: parseFloat(c.h),
		low: parseFloat(c.l),
		close: parseFloat(c.c),
		volume: parseFloat(c.v)
	};
}

export function normalizeCandles(candles: CandleEvent[]): ChartCandle[] {
	return candles.map(normalizeCandle);
}
