import { describe, expect, test } from 'bun:test';
import { buildLatencyEvidence } from './latencyEvidence';
import { recordDispatchLatency, recordInputToSubmit, recordRecoveryLatency, resetExecutionMetricsForTest } from './telemetry';
import { markFeedReceive, markStoreCommit, markUiFrameReady, resetLatencyForTest } from '$lib/native/performance';

describe('client latency evidence', () => {
	test('exports versioned measured timings without private state', () => {
		resetExecutionMetricsForTest();
		resetLatencyForTest();
		markFeedReceive('trade', 1, performance.now());
		markStoreCommit('trade', 1);
		markUiFrameReady();
		recordDispatchLatency(0, 1_000, 8_000);
		recordInputToSubmit(0, 6_000);
		recordInputToSubmit(0, 10_000);
		recordRecoveryLatency(0, 2_000);
		const evidence = buildLatencyEvidence('testnet', '2026-07-13T12:00:00.000Z');
		expect(evidence.schemaVersion).toBe(2);
		expect(evidence.source).toBe('client-telemetry');
		expect(evidence.samples).toHaveLength(1);
		expect(evidence.dispatchSamples).toHaveLength(1);
		expect(evidence.inputToSubmitSamples).toEqual([6, 10]);
		expect(evidence.recoverySamples).toEqual([2]);
		expect(evidence.runtimeHealth).toMatchObject({ maxStoreQueueDepth: 1, maxFrameReadyQueueDepth: 1 });
		expect(evidence.samples[0].receiptToStoreMs).toBeGreaterThanOrEqual(0);
		expect(evidence.samples[0].storeToPaintMs).toBeGreaterThanOrEqual(0);
		expect(evidence.samples[0].feedToFrameReadyMs).toBeGreaterThanOrEqual(0);
		expect(evidence.dispatchSamples[0].actionToSignedDispatchMs).toBe(8);
		expect(evidence.percentiles).toMatchObject({
			sourceToStore: { count: 1 },
			storeToPaint: { count: 1 },
			inputToSubmit: { count: 2, p50: 6, p95: 10, p99: 10 },
			recovery: { count: 1, p50: 2, p95: 2, p99: 2 }
		});
		expect(JSON.stringify(evidence)).not.toContain('order');
		expect(JSON.stringify(evidence)).not.toContain('wallet');
		expect(JSON.stringify(evidence)).not.toContain('marketKey');
		resetExecutionMetricsForTest();
		resetLatencyForTest();
	});

	test('returns empty evidence when a session has no paired measurements', () => {
		resetExecutionMetricsForTest();
		resetLatencyForTest();
		expect(buildLatencyEvidence('testnet').samples).toEqual([]);
	});
});
