import type { OrderBook } from './types';

export type BookImbalance = {
	bidSize: number;
	askSize: number;
	imbalance: number;
	label: 'bid' | 'ask' | 'balanced' | 'unavailable';
};

const unavailable: BookImbalance = { bidSize: 0, askSize: 0, imbalance: 0, label: 'unavailable' };

/**
 * Measures displayed size on each side of a bounded, venue-normalized book.
 * It does not infer executions, hidden liquidity, or a venue-wide metric.
 */
export function topOfBookImbalance(book: OrderBook, levels = 12): BookImbalance {
	if (!Number.isInteger(levels) || levels < 1) return unavailable;
	let bidSize = 0;
	let askSize = 0;
	for (let index = 0; index < levels; index += 1) {
		const bid = book.bids[index]?.size;
		const ask = book.asks[index]?.size;
		if (Number.isFinite(bid) && bid > 0) bidSize += bid;
		if (Number.isFinite(ask) && ask > 0) askSize += ask;
	}
	const total = bidSize + askSize;
	if (!Number.isFinite(total) || total <= 0) return unavailable;
	const imbalance = (bidSize - askSize) / total;
	const label = Math.abs(imbalance) < 0.05 ? 'balanced' : imbalance > 0 ? 'bid' : 'ask';
	return { bidSize, askSize, imbalance, label };
}
