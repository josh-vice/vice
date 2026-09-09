import { describe, expect, test } from 'bun:test';
import { venueIdsProveComplete } from './reconciliationCompleteness.ts';

describe('US-002 lost-ack batch completeness', () => {
	test('requires one known venue id for every expected child cloid', () => {
		expect(venueIdsProveComplete(['17'], ['0xabc', '0xdef'], ['17', '18'])).toBe(false);
		expect(venueIdsProveComplete(['17'], ['0xabc', '0xdef'], ['17'])).toBe(false);
		expect(venueIdsProveComplete(['17', '18'], ['0xabc', '0xdef'], ['17', '18'])).toBe(true);
	});

	test('does not accept an unrelated projected venue id as proof', () => {
		expect(venueIdsProveComplete(['17', '18'], ['0xabc', '0xdef'], ['17', '19'])).toBe(false);
	});
});
