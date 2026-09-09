import { describe, expect, test } from 'bun:test';
import { estimateOrderPreview } from './orderPreview';

const book = {
	asks: [
		{ price: 101, size: 2, total: 2 },
		{ price: 102, size: 3, total: 5 }
	],
	bids: [
		{ price: 99, size: 1, total: 1 },
		{ price: 98, size: 4, total: 5 }
	],
	spread: 2,
	spreadPercent: 2
};

describe('order preview estimator', () => {
	test('consumes displayed levels and calculates weighted slippage and explicit fees', () => {
		const preview = estimateOrderPreview({
			book,
			side: 'buy',
			orderType: 'market',
			size: 4,
			postOnly: false,
			reduceOnly: false,
			accountLive: true,
			feeRateBps: 5
		});
		expect(preview.status).toBe('estimated');
		expect(preview.filledSize).toBe(4);
		expect(preview.unfilledSize).toBe(0);
		expect(preview.displayedDepthSize).toBe(5);
		expect(preview.averageFillPrice).toBe(101.5);
		expect(preview.slippageBps).toBeCloseTo(49.50495, 4);
		expect(preview.estimatedNotional).toBe(406);
		expect(preview.estimatedFee).toBeCloseTo(0.203, 8);
	});

	test('does not claim an immediate fill for resting or post-only crossing limits', () => {
		const resting = estimateOrderPreview({
			book,
			side: 'buy',
			orderType: 'limit',
			limitPrice: 100,
			size: 2,
			postOnly: false,
			reduceOnly: false,
			accountLive: true
		});
		expect(resting.status).toBe('resting');
		expect(resting.filledSize).toBe(0);

		const blocked = estimateOrderPreview({
			book,
			side: 'buy',
			orderType: 'limit',
			limitPrice: 101,
			size: 2,
			postOnly: true,
			reduceOnly: false,
			accountLive: true
		});
		expect(blocked.status).toBe('post-only-crossing');
		expect(blocked.filledSize).toBe(0);
		expect(blocked.displayedDepthSize).toBe(2);
	});

	test('caps reduce-only size to a live opposite-side position', () => {
		const preview = estimateOrderPreview({
			book,
			side: 'sell',
			orderType: 'market',
			size: 3,
			postOnly: false,
			reduceOnly: true,
			accountLive: true,
			position: { side: 'long', size: 1.5 }
		});
		expect(preview.reduceOnly).toMatchObject({ status: 'capped', requestedSize: 3, effectiveSize: 1.5 });
		expect(preview.filledSize).toBe(1.5);

		const unavailable = estimateOrderPreview({
			book,
			side: 'sell',
			orderType: 'market',
			size: 3,
			postOnly: false,
			reduceOnly: true,
			accountLive: false
		});
		expect(unavailable.status).toBe('unavailable');
		expect(unavailable.reduceOnly.status).toBe('unavailable');
		expect(unavailable.effectiveSize).toBe(0);
	});

	test('reports insufficient depth and does not mutate the book', () => {
		const snapshot = structuredClone(book);
		const preview = estimateOrderPreview({
			book,
			side: 'buy',
			orderType: 'market',
			size: 8,
			postOnly: false,
			reduceOnly: false,
			accountLive: true
		});
		expect(preview.status).toBe('insufficient');
		expect(preview.filledSize).toBe(5);
		expect(preview.unfilledSize).toBe(3);
		expect(preview.estimatedFee).toBeNull();
		expect(book).toEqual(snapshot);
	});
});
