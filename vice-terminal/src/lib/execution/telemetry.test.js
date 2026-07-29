import { beforeEach, describe, expect, test } from 'bun:test';
import { executionMetrics, recordDispatchLatency, recordExecutionAck, resetExecutionMetricsForTest } from './telemetry';

describe('execution SLO telemetry', () => {
	beforeEach(resetExecutionMetricsForTest);
	test('tracks latency, uncertainty, rejection and reconciliation without account data', () => {
		for (const [latency, accepted, uncertain, reconciled] of [[10, true, false, false], [30, false, true, false], [20, true, false, true]]) {
			recordExecutionAck({ commandId: 'x', sessionId: 'local', sessionSequence: 1, idempotencyKey: 'x', accepted, uncertain, reconciled, venueOrderIds: [], gatewayReceiveUs: 0, venueSendUs: 0, completedUs: latency * 1000 });
		}
		expect(executionMetrics()).toMatchObject({ count: 3, accepted: 2, rejected: 1, uncertain: 1, reconciled: 1, p50Ms: 20, p99Ms: 30 });
	});

	test('records local dispatch and pre-send processing budgets', () => {
		recordDispatchLatency(0, 1_000, 8_000);
		const metrics = executionMetrics();
		expect(metrics.dispatchP99Ms).toBe(8);
		expect(metrics.localProcessingP99Ms).toBe(7);
	});
});
