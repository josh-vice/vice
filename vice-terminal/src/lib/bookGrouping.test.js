import { describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';
import { bookDepth, bookSigFigs, setBookDepth, setBookSigFigs } from './bookGrouping';

describe('US-008 venue book grouping', () => {
	test('allows only venue-supported nSigFigs values', () => {
		expect(setBookSigFigs(2)).toBe(2);
		expect(get(bookSigFigs)).toBe(2);
		expect(setBookSigFigs(6)).toBe(5);
	});

	test('bounds locally displayed depth without changing venue grouping', () => {
		expect(setBookDepth(24)).toBe(24);
		expect(get(bookDepth)).toBe(24);
		expect(setBookDepth(13)).toBe(12);
		expect(get(bookDepth)).toBe(12);
	});
});
