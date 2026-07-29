import type { ChartCandle } from '$lib/types';

export type TradeCandleInput = { price: number; size: number; timestamp: number };

/** Build/update an OHLCV candle from venue trades without synthetic values. */
export function mergeTradeIntoCandles(
	candles: ChartCandle[],
	trade: TradeCandleInput,
	intervalMs: number
): ChartCandle[] {
	if (!Number.isFinite(intervalMs) || intervalMs <= 0 || !Number.isFinite(trade.price) || trade.price <= 0 || !Number.isFinite(trade.size) || trade.size < 0 || !Number.isFinite(trade.timestamp)) {
		return candles;
	}
	const time = Math.floor(trade.timestamp / intervalMs) * intervalMs / 1000;
	const last = candles[candles.length - 1];
	if (last && time < last.time) return candles;
	if (last && time === last.time) {
		return [
			...candles.slice(0, -1),
			{
				...last,
				high: Math.max(last.high, trade.price),
				low: Math.min(last.low, trade.price),
				close: trade.price,
				volume: (last.volume ?? 0) + trade.size
			}
		];
	}
	return [
		...candles,
		{ time, open: trade.price, high: trade.price, low: trade.price, close: trade.price, volume: trade.size }
	];
}

/**
 * Merge a venue candle snapshot with events received while the snapshot was
 * in flight. The snapshot is authoritative for every candle it contains;
 * only candles newer than its last timestamp can be carried forward from the
 * live stream. A partially observed live candle must never replace the
 * snapshot's accumulated volume or OHLC values.
 */
export function mergeCandleSnapshot(
	snapshot: ChartCandle[],
	liveCandles: ChartCandle[]
): ChartCandle[] {
	if (snapshot.length === 0) return [...liveCandles].sort((a, b) => a.time - b.time);

	const lastSnapshotTime = snapshot[snapshot.length - 1].time;
	const merged = [...snapshot];
	for (const candle of liveCandles) {
		if (candle.time > lastSnapshotTime) merged.push(candle);
	}
	return merged.sort((a, b) => a.time - b.time);
}
