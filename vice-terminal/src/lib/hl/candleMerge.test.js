import { describe, expect, test } from 'bun:test';
import { mergeCandleSnapshot, mergeTradeIntoCandles } from './candleMerge';

const candle = (time, close, volume) => ({
	time,
	open: close - 1,
	high: close + 1,
	low: close - 2,
	close,
	volume
});

describe('authoritative candle history merge', () => {
	test('keeps snapshot OHLCV when a live candle has the same timestamp', () => {
		expect(mergeCandleSnapshot(
			[candle(100, 110, 42)],
			[candle(100, 111, 0.25), candle(101, 112, 0.5)]
		)).toEqual([
			candle(100, 110, 42),
			candle(101, 112, 0.5)
		]);
	});

	test('preserves live candles newer than the snapshot', () => {
		expect(mergeCandleSnapshot([candle(100, 110, 42)], [candle(99, 109, 1), candle(101, 112, 0.5)])).toEqual([
			candle(100, 110, 42),
			candle(101, 112, 0.5)
		]);
	});

	test('returns live data when the snapshot is empty', () => {
		expect(mergeCandleSnapshot([], [candle(101, 112, 0.5), candle(100, 110, 42)])).toEqual([
			candle(100, 110, 42),
			candle(101, 112, 0.5)
		]);
	});
});

describe('live trade candle fallback', () => {
	test('seeds and updates a real candle from recent trades', () => {
		const interval = 60_000;
		const seeded = mergeTradeIntoCandles([], { price: 100, size: 2, timestamp: 61_000 }, interval);
		expect(mergeTradeIntoCandles(seeded, { price: 105, size: 3, timestamp: 62_000 }, interval)).toEqual([
			{ time: 60, open: 100, high: 105, low: 100, close: 105, volume: 5 }
		]);
	});

	test('does not let an out-of-order trade rewrite a newer candle', () => {
		const existing = [{ time: 120, open: 105, high: 105, low: 105, close: 105, volume: 1 }];
		expect(mergeTradeIntoCandles(existing, { price: 99, size: 4, timestamp: 61_000 }, 60_000)).toBe(existing);
	});
});
