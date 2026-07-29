import { describe, expect, test } from 'bun:test';
import { evaluateLatencyGates } from './latencyGates.ts';

describe('release latency gates', () => {
	test('passes samples below all stated p99 budgets', () => {
		const result = evaluateLatencyGates([
			{ receiptToStoreMs: 1, feedToFrameReadyMs: 8, actionToSignedDispatchMs: 4, localProcessingMs: 0.8 },
			{ receiptToStoreMs: 2, feedToFrameReadyMs: 12, actionToSignedDispatchMs: 7, localProcessingMs: 1.2 }
		]);
		expect(result.pass).toBe(true);
		expect(result.failures).toEqual([]);
	});

	test('fails certification when any p99 budget is reached', () => {
		const result = evaluateLatencyGates([
			{ receiptToStoreMs: 1, feedToFrameReadyMs: 8, actionToSignedDispatchMs: 4, localProcessingMs: 0.8 },
			{ receiptToStoreMs: 5, feedToFrameReadyMs: 16.667, actionToSignedDispatchMs: 10, localProcessingMs: 2 }
		]);
		expect(result.pass).toBe(false);
		expect(result.failures).toHaveLength(4);
	});

	test('fails closed when latency evidence is empty or invalid', () => {
		expect(evaluateLatencyGates([]).pass).toBe(false);
		const result = evaluateLatencyGates([{ receiptToStoreMs: Number.NaN, feedToFrameReadyMs: 8, actionToSignedDispatchMs: 1, localProcessingMs: 1 }]);
		expect(result.pass).toBe(false);
		expect(result.sampleCount).toBe(0);
		expect(result.failures[0]).toContain('no valid samples');
	});

	test('fails closed when frame-ready latency evidence is invalid', () => {
		const result = evaluateLatencyGates([{ receiptToStoreMs: 1, feedToFrameReadyMs: Number.NaN, actionToSignedDispatchMs: 1, localProcessingMs: 1 }]);
		expect(result.pass).toBe(false);
		expect(result.sampleCount).toBe(0);
		expect(result.failures).toContain('latency evidence contains no valid samples');
	});
});
