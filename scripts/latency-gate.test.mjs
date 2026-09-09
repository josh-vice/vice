import { describe, expect, test } from 'bun:test';
import { parseLatencyEvidence, readLatencyEvidence } from './latency-gate.mjs';

const valid = {
	schemaVersion: 2,
	source: 'client-telemetry',
	network: 'testnet',
	capturedAt: '2026-07-13T12:00:00.000Z',
	runtimeHealth: { longTaskCount: 0, longTaskMaxMs: 0, longAnimationFrameCount: 0, longAnimationFrameMaxMs: 0, eventDelayCount: 0, eventDelayMaxMs: 0, inferredDroppedFrameCount: 0, maxFrameIntervalMs: 0, reconnectCount: 0, maxStoreQueueDepth: 1, maxFrameReadyQueueDepth: 1 },
	samples: [{ feed: 'trade', sequence: 1, receiptToStoreMs: 1, feedToFrameReadyMs: 8 }],
	dispatchSamples: [{ actionToSignedDispatchMs: 4, localProcessingMs: 0.8 }],
};

describe('measured latency evidence boundary', () => {
	test('accepts only versioned client telemetry evidence', () => {
		expect(parseLatencyEvidence(valid)).toEqual(valid);
	});

	test('validates optional percentile and phase timing extensions', () => {
		const extended = {
			...valid,
			samples: [{ ...valid.samples[0], storeToPaintMs: 3 }],
			dispatchSamples: [{ ...valid.dispatchSamples[0], inputToSubmitMs: 12 }],
			inputToSubmitSamples: [12],
			recoverySamples: [7],
			percentiles: {
				sourceToStore: { count: 1, p50: 1, p95: 1, p99: 1, max: 1 },
				storeToPaint: { count: 1, p50: 3, p95: 3, p99: 3, max: 3 },
				feedToFrameReady: { count: 1, p50: 8, p95: 8, p99: 8, max: 8 },
				inputToSubmit: { count: 1, p50: 12, p95: 12, p99: 12, max: 12 },
				recovery: { count: 1, p50: 7, p95: 7, p99: 7, max: 7 }
			}
		};
		expect(parseLatencyEvidence(extended)).toEqual(extended);
		expect(() => parseLatencyEvidence({ ...extended, inputToSubmitSamples: [-1] })).toThrow('inputToSubmitSamples');
		expect(() => parseLatencyEvidence({ ...extended, samples: [{ ...extended.samples[0], storeToPaintMs: Number.NaN }] })).toThrow('storeToPaintMs');
	});

	test('rejects missing or synthetic-shaped evidence metadata', () => {
		for (const field of ['schemaVersion', 'source', 'network', 'capturedAt', 'runtimeHealth', 'samples']) {
			const copy = { ...valid };
			delete copy[field];
			expect(() => parseLatencyEvidence(copy)).toThrow();
		}
		expect(() => parseLatencyEvidence({ ...valid, schemaVersion: 1, samples: [{ feed: 'trade', sequence: 1, receiptToStoreMs: 1, feedToPaintMs: 8, actionToSignedDispatchMs: 4, localProcessingMs: 0.8 }] })).toThrow('schemaVersion must be 2');
		expect(() => parseLatencyEvidence({ ...valid, runtimeHealth: { ...valid.runtimeHealth, reconnectCount: -1 } })).toThrow('runtimeHealth.reconnectCount');
	});

	test('requires a real evidence file path before reading release evidence', async () => {
		expect(readLatencyEvidence()).rejects.toThrow('VICE_LATENCY_EVIDENCE');
	});
});
