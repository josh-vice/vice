import { describe, expect, test } from 'bun:test';
import { blofinPublicReviewEnabled, blofinSetupReviewEnabled } from './review.ts';

describe('BloFin review-only surface gate', () => {
	test('keeps setup absent in production unless an operator explicitly enables review', () => {
		expect(blofinSetupReviewEnabled(false, undefined)).toBe(false);
		expect(blofinSetupReviewEnabled(false, 'false')).toBe(false);
		expect(blofinSetupReviewEnabled(false, 'true')).toBe(true);
		expect(blofinSetupReviewEnabled(true, undefined)).toBe(true);
	});

	test('keeps the read-only public catalog absent in production unless enabled', () => {
		expect(blofinPublicReviewEnabled(false, undefined)).toBe(false);
		expect(blofinPublicReviewEnabled(false, 'false')).toBe(false);
		expect(blofinPublicReviewEnabled(false, 'true')).toBe(true);
		expect(blofinPublicReviewEnabled(true, undefined)).toBe(true);
	});
});
