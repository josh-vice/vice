import { describe, expect, test } from 'bun:test';
import { parseLatencyEvidence, readLatencyEvidence } from './latency-gate.mjs';

const valid = {
	schemaVersion: 2,
	source: 'client-telemetry',
	network: 'testnet',
	capturedAt: '2026-07-13T12:00:00.000Z',
	runtimeHealth: { longTaskCount: 0, longTaskMaxMs: 0, longAnimationFrameCount: 0, longAnimationFrameMaxMs: 0, eventDelayCount: 0, eventDelayMaxMs: 0, inferredDroppedFrameCount: 0, maxFrameIntervalMs: 0, reconnectCount: 0, maxStoreQueueDepth: 1, maxFrameReadyQueueDepth: 1 },
	samples: [{ receiptToStoreMs: 1, feedToFrameReadyMs: 8, actionToSignedDispatchMs: 4, localProcessingMs: 0.8 }]
};

describe('measured latency evidence boundary', () => {
	test('accepts only versioned client telemetry evidence', () => {
		expect(parseLatencyEvidence(valid)).toEqual(valid);
	});

	test('rejects missing or synthetic-shaped evidence metadata', () => {
		for (const field of ['schemaVersion', 'source', 'network', 'capturedAt', 'runtimeHealth', 'samples']) {
			const copy = { ...valid };
			delete copy[field];
			expect(() => parseLatencyEvidence(copy)).toThrow();
		}
		expect(() => parseLatencyEvidence({ ...valid, schemaVersion: 1, samples: [{ receiptToStoreMs: 1, feedToPaintMs: 8, actionToSignedDispatchMs: 4, localProcessingMs: 0.8 }] })).toThrow('schemaVersion must be 2');
		expect(() => parseLatencyEvidence({ ...valid, runtimeHealth: { ...valid.runtimeHealth, reconnectCount: -1 } })).toThrow('runtimeHealth.reconnectCount');
	});

	test('requires a real evidence file path before reading release evidence', async () => {
		expect(readLatencyEvidence()).rejects.toThrow('VICE_LATENCY_EVIDENCE');
	});
});
