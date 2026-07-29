// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { normalizeL2Book } from './normalize';

const event = (bids, asks) => ({ coin: 'BTC', time: 1, levels: [bids, asks] });

describe('US-001 L2 snapshot truth', () => {
	test('keeps a valid ordered book with bounded cumulative totals', () => {
		const book = normalizeL2Book(event([{ px: '100', sz: '2' }, { px: '99', sz: '3' }], [{ px: '101', sz: '4' }, { px: '102', sz: '5' }]));
		expect(book).toMatchObject({ spread: 1, bids: [{ total: 2 }, { total: 5 }], asks: [{ total: 4 }, { total: 9 }] });
	});

	test('rejects malformed, unordered, and crossed snapshots before the ladder can use them', () => {
		expect(normalizeL2Book(event([{ px: '100', sz: '0' }], [{ px: '101', sz: '1' }]))).toBeNull();
		expect(normalizeL2Book(event([{ px: '100', sz: '1' }, { px: '101', sz: '1' }], [{ px: '102', sz: '1' }]))).toBeNull();
		expect(normalizeL2Book(event([{ px: '101', sz: '1' }], [{ px: '101', sz: '1' }]))).toBeNull();
	});
});
