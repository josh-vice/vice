import { beforeEach, describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';
import { executionLifecycleStatus, executionMetrics, executionTelemetry, recordDispatchLatency, recordExecutionAck, recordInputToSubmit, recordRecoveryLatency, resetExecutionMetricsForTest } from './telemetry';

describe('execution SLO telemetry', () => {
	beforeEach(resetExecutionMetricsForTest);
	test('tracks typed lifecycle states without account data', () => {
		for (const [latency, accepted, uncertain, reconciled] of [[10, true, false, false], [30, false, false, false], [20, false, true, false], [40, true, false, true]]) {
			recordExecutionAck({ commandId: 'x', sessionId: 'local', sessionSequence: 1, idempotencyKey: 'x', accepted, uncertain, reconciled, venueOrderIds: [], gatewayReceiveUs: 0, venueSendUs: 0, completedUs: latency * 1000 });
		}
		expect(executionLifecycleStatus({ accepted: true, uncertain: false, reconciled: false })).toBe('accepted');
		expect(executionLifecycleStatus({ accepted: false, uncertain: false, reconciled: false })).toBe('rejected');
		expect(executionLifecycleStatus({ accepted: false, uncertain: true, reconciled: false })).toBe('unknown');
		expect(executionLifecycleStatus({ accepted: true, uncertain: false, reconciled: true })).toBe('reconciled');
		expect(executionMetrics()).toMatchObject({ count: 4, accepted: 1, rejected: 1, uncertain: 1, unknown: 1, reconciled: 1, p50Ms: 20, p95Ms: 40, p99Ms: 40 });
		expect(get(executionTelemetry)).toMatchObject({ count: 4, unknown: 1, reconciled: 1 });
	});

	test('records local dispatch and pre-send processing budgets', () => {
		recordDispatchLatency(0, 1_000, 8_000);
		const metrics = executionMetrics();
		expect(metrics.dispatchP99Ms).toBe(8);
		expect(metrics.dispatchP95Ms).toBe(8);
		expect(metrics.localProcessingP99Ms).toBe(7);
		expect(metrics.localProcessingP95Ms).toBe(7);
	});

	test('records input-to-submit and recovery percentiles separately', () => {
		recordInputToSubmit(0, 5_000);
		recordInputToSubmit(0, 9_000);
		recordRecoveryLatency(0, 3_000);
		recordRecoveryLatency(0, 7_000);
		expect(executionMetrics()).toMatchObject({
			inputToSubmitCount: 2,
			inputToSubmitP50Ms: 5,
			inputToSubmitP95Ms: 9,
			inputToSubmitP99Ms: 9,
			recoveryCount: 2,
			recoveryP50Ms: 3,
			recoveryP95Ms: 7,
			recoveryP99Ms: 7
		});
	});
});
