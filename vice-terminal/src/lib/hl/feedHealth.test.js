import { describe, expect, test } from 'bun:test';
import { ALL_MIDS_STALE_THRESHOLD_MS, FEED_STALE_THRESHOLD_MS, REQUIRED_MARKET_FEEDS, acceptFeedState, allMidsAreFresh, contextIsHealthy, createFeedState, feedsAreHealthy } from './feedHealth.ts';

describe('feed health predicates', () => {
	test('uses distinct freshness windows for continuous and event feeds', () => {
		expect(REQUIRED_MARKET_FEEDS).toEqual(['mids', 'book', 'trades']);
		expect(FEED_STALE_THRESHOLD_MS.trades).toBeGreaterThan(FEED_STALE_THRESHOLD_MS.mids);
	});

	test('requires every selected feed to be fresh', () => {
		const now = 100_000;
		const live = { mids: now - 100, book: now - 200, trades: now - 300 };
		expect(feedsAreHealthy('BTC', live, now)).toBe(true);
		expect(feedsAreHealthy('', live, now)).toBe(false);
		expect(feedsAreHealthy('BTC', { ...live, book: now - FEED_STALE_THRESHOLD_MS.book - 1 }, now)).toBe(false);
	});

	test('treats outcome context as always healthy and validates all-mids freshness', () => {
		const now = 100_000;
		expect(contextIsHealthy('outcome', 0, 0, now)).toBe(true);
		expect(contextIsHealthy('spot', now - 1, now - 1, now)).toBe(true);
		expect(allMidsAreFresh(now - 1, now)).toBe(true);
		expect(allMidsAreFresh(now - ALL_MIDS_STALE_THRESHOLD_MS - 1, now)).toBe(false);
	});
	test('all-mids freshness uses epoch milliseconds, not a monotonic clock value', () => {
		const now = 1_700_000_000_000;
		expect(allMidsAreFresh(now - 1_000, now)).toBe(true);
		expect(allMidsAreFresh(42, now)).toBe(false);
	});
	test('rejects late frames and stale source timestamps while accepting a new epoch', () => {
		const base = createFeedState({ source: 'hl', exactSubscriptionIdentity: 'BTC@nSigFigs=5', epoch: 2, sourceTimestamp: 1000, status: 'live', updatesPerSecond: 5, receiptTimestamp: 1100 });
		expect(acceptFeedState(base, createFeedState({ ...base, sourceTimestamp: 999, receiptTimestamp: 1200 }))).toBe(false);
		expect(acceptFeedState(base, createFeedState({ ...base, epoch: 1, sourceTimestamp: 1200, receiptTimestamp: 1300 }))).toBe(false);
		expect(acceptFeedState(base, createFeedState({ ...base, epoch: 3, sourceTimestamp: 1200, receiptTimestamp: 1300 }))).toBe(true);
	});
});
