import { describe, expect, test } from 'bun:test';
import { latencySnapshot, markFeedReceive, markFeedReconnect, markStoreCommit, markUiFrameReady, recordRuntimePerformanceEntry, resetLatencyForTest, runtimeHealthSnapshot } from './performance';

describe('runtime feed latency telemetry', () => {
	test('records feed-to-store samples without account or order contents', () => {
		resetLatencyForTest();
		markFeedReceive();
		markStoreCommit();
		const snapshot = latencySnapshot();
		expect(snapshot.storeCount).toBe(1);
		expect(snapshot.storeP99).toBeGreaterThanOrEqual(0);
		resetLatencyForTest();
	});

	test('accepts a worker receipt timestamp for worker-to-store timing', () => {
		resetLatencyForTest();
		markFeedReceive(performance.now() - 1);
		markStoreCommit();
		expect(latencySnapshot().storeCount).toBe(1);
		resetLatencyForTest();
	});

	test('keeps each feed event tied to its store commit and next frame-ready callback', () => {
		resetLatencyForTest();
		markFeedReceive();
		markStoreCommit();
		markFeedReceive();
		markStoreCommit();
		markUiFrameReady();
		const snapshot = latencySnapshot();
		expect(snapshot.storeCount).toBe(2);
		expect(snapshot.count).toBe(2);
		expect(snapshot.p99).toBeGreaterThanOrEqual(snapshot.storeP99);
		resetLatencyForTest();
	});

	test('records privacy-safe queue, frame, reconnect, and browser-performance aggregates', () => {
		resetLatencyForTest();
		markFeedReceive(1);
		markFeedReceive(2);
		markStoreCommit();
		markUiFrameReady(20);
		markFeedReceive(21);
		markStoreCommit();
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
