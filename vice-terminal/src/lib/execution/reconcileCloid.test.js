import { describe, expect, test } from 'bun:test';
import { reconcileCloids } from './reconcileCloid.ts';

describe('US-002 lost-ack account projection reconciliation', () => {
	test('matches cloids through authoritative open orders and fills', () => {
		const result = reconcileCloids(
			['0xABC', '0xDEF'],
			[{ cloid: '0xabc', oid: 17 }],
			[{ cloid: '0xdef', oid: 18 }]
		);
		expect(result).toEqual({ found: true, complete: true, accepted: true, orderIds: ['17', '18'], matchedCloids: ['0xabc', '0xdef'] });
	});

	test('does not treat a missing cloid as a venue rejection', () => {
		expect(reconcileCloids(['0xabc'], [{ oid: 17 }], [])).toEqual({
			found: false,
			complete: false,
			accepted: false,
			orderIds: [],
			matchedCloids: []
		});
	});

	test('does not call one matched child a complete multi-child outcome', () => {
		expect(reconcileCloids(['0xabc', '0xdef'], [{ cloid: '0xabc', oid: 17 }], [])).toEqual({
			found: true,
			complete: false,
			accepted: true,
			orderIds: ['17'],
			matchedCloids: ['0xabc']
		});
	});
});
