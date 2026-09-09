import { describe, expect, test } from 'bun:test';
import { causalFeedLatencySamples, latencySnapshot, markFeedReceive, markFeedReconnect, markStoreCommit, markUiFrameReady, recordRuntimePerformanceEntry, resetLatencyForTest, runtimeHealthSnapshot } from './performance';

describe('runtime feed latency telemetry', () => {
	test('records feed-to-store samples without account or order contents', () => {
		resetLatencyForTest();
		markFeedReceive('trade', 1);
		markStoreCommit('trade', 1);
		const snapshot = latencySnapshot();
		expect(snapshot.storeCount).toBe(1);
		expect(snapshot.storeP99).toBeGreaterThanOrEqual(0);
		resetLatencyForTest();
	});

	test('accepts a worker receipt timestamp for worker-to-store timing', () => {
		resetLatencyForTest();
		markFeedReceive('trade', 1, performance.now() - 1);
		markStoreCommit('trade', 1);
		expect(latencySnapshot().storeCount).toBe(1);
		resetLatencyForTest();
	});

	test('keeps source-to-store latency non-negative under clock skew', () => {
		resetLatencyForTest();
		markFeedReceive('skew', 1, 20);
		markStoreCommit('skew', 1, 10);
		markFeedReceive('skew', 2, 30);
		markStoreCommit('skew', 2, Number.NaN);
		expect(latencySnapshot()).toMatchObject({ storeCount: 1, storeP50: 0 });
		resetLatencyForTest();
	});

	test('pairs out-of-order feeds by causal key instead of FIFO position', () => {
		resetLatencyForTest();
		markFeedReceive('book', 1, 1);
		markFeedReceive('book', 2, 2);
		markStoreCommit('book', 2, 10);
		markUiFrameReady(20);
		expect(causalFeedLatencySamples()).toEqual([
			expect.objectContaining({ feed: 'book', sequence: 2, storeToPaintMs: 10 })
		]);
		expect(causalFeedLatencySamples()).not.toEqual([
			expect.objectContaining({ sequence: 1 })
		]);
		const snapshot = latencySnapshot();
		expect(snapshot).toMatchObject({ p50: 18, p95: 18, p99: 18, storeP50: 8, storeP95: 8, storeP99: 8, storeToPaintP50: 10, storeToPaintP95: 10, storeToPaintP99: 10 });
		resetLatencyForTest();
	});

	test('records privacy-safe queue, frame, reconnect, and browser-performance aggregates', () => {
		resetLatencyForTest();
		markFeedReceive('mid', 1, 1);
		markFeedReceive('mid', 2, 2);
		markStoreCommit('mid', 2);
		markUiFrameReady(20);
		markFeedReceive('mid', 3, 21);
		markStoreCommit('mid', 3);
		markUiFrameReady(60);
		markFeedReconnect();
		recordRuntimePerformanceEntry('longtask', 51);
		recordRuntimePerformanceEntry('long-animation-frame', 42);
		recordRuntimePerformanceEntry('event', 18);
		const health = runtimeHealthSnapshot();
		expect(health.maxStoreQueueDepth).toBe(2);
		expect(health.maxFrameReadyQueueDepth).toBeGreaterThanOrEqual(1);
		expect(health.inferredDroppedFrameCount).toBeGreaterThan(0);
		expect(health.reconnectCount).toBe(1);
		expect(health).toMatchObject({ longTaskCount: 1, longTaskMaxMs: 51, longAnimationFrameCount: 1, longAnimationFrameMaxMs: 42, eventDelayCount: 1, eventDelayMaxMs: 18 });
		expect(JSON.stringify(health)).not.toContain('BTC');
		resetLatencyForTest();
	});
});
