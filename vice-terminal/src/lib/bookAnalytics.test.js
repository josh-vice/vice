import { describe, expect, test } from 'bun:test';
import { topOfBookImbalance } from './bookAnalytics';

describe('top-of-book imbalance', () => {
	test('uses only a bounded displayed depth and labels the dominant side', () => {
		const book = {
			bids: [{ price: 99, size: 8, total: 8 }, { price: 98, size: 2, total: 10 }],
			asks: [{ price: 101, size: 3, total: 3 }, { price: 102, size: 1, total: 4 }],
			spread: 2,
			spreadPercent: 2
		};
		expect(topOfBookImbalance(book, 1)).toMatchObject({ bidSize: 8, askSize: 3, label: 'bid' });
		expect(topOfBookImbalance(book, 2)).toMatchObject({ bidSize: 10, askSize: 4, label: 'bid' });
	});

	test('does not invent a signal from invalid, empty, or balanced depth', () => {
		expect(topOfBookImbalance({ bids: [], asks: [], spread: 0, spreadPercent: 0 })).toEqual({ bidSize: 0, askSize: 0, imbalance: 0, label: 'unavailable' });
		expect(topOfBookImbalance({ bids: [{ price: 99, size: 1, total: 1 }], asks: [{ price: 101, size: 1, total: 1 }], spread: 2, spreadPercent: 2 })).toMatchObject({ imbalance: 0, label: 'balanced' });
	});
});
