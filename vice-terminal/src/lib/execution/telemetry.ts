import type { ExecutionAck } from './client';

export type ExecutionMetrics = {
	count: number;
	accepted: number;
	rejected: number;
	uncertain: number;
	reconciled: number;
	p50Ms: number;
	p99Ms: number;
	maxMs: number;
	dispatchP50Ms: number;
	dispatchP99Ms: number;
	localProcessingP99Ms: number;
};

const MAX_SAMPLES = 500;
const samples: Array<{ latencyMs: number; accepted: boolean; uncertain: boolean; reconciled: boolean }> = [];
const dispatchSamples: Array<{ actionToSendMs: number; localProcessingMs: number }> = [];

export function recordDispatchLatency(actionStartedUs: number, receiveUs: number, sendUs: number): void {
	dispatchSamples.push({
		actionToSendMs: Math.max(0, (sendUs - actionStartedUs) / 1000),
		localProcessingMs: Math.max(0, (sendUs - receiveUs) / 1000)
	});
	if (dispatchSamples.length > MAX_SAMPLES) dispatchSamples.shift();
}

export function recordExecutionAck(ack: ExecutionAck): void {
	samples.push({
		latencyMs: Math.max(0, (ack.completedUs - ack.gatewayReceiveUs) / 1000),
		accepted: ack.accepted,
		uncertain: ack.uncertain === true,
		reconciled: ack.reconciled === true
	});
	if (samples.length > MAX_SAMPLES) samples.shift();
}

export function executionMetrics(): ExecutionMetrics {
	const sorted = samples.map((sample) => sample.latencyMs).sort((a, b) => a - b);
	const dispatchSorted = dispatchSamples.map((sample) => sample.actionToSendMs).sort((a, b) => a - b);
	const localSorted = dispatchSamples.map((sample) => sample.localProcessingMs).sort((a, b) => a - b);
	const percentile = (value: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] ?? 0;
	const dispatchPercentile = (values: number[], value: number) => values[Math.min(values.length - 1, Math.floor(values.length * value))] ?? 0;
	return {
		count: samples.length,
		accepted: samples.filter((sample) => sample.accepted).length,
		rejected: samples.filter((sample) => !sample.accepted).length,
		uncertain: samples.filter((sample) => sample.uncertain).length,
		reconciled: samples.filter((sample) => sample.reconciled).length,
		p50Ms: percentile(0.5), p99Ms: percentile(0.99), maxMs: sorted.at(-1) ?? 0,
		dispatchP50Ms: dispatchPercentile(dispatchSorted, 0.5),
		dispatchP99Ms: dispatchPercentile(dispatchSorted, 0.99),
		localProcessingP99Ms: dispatchPercentile(localSorted, 0.99)
	};
}

/** Return only measured dispatch timings; no command, account, or venue data is exported. */
export function dispatchLatencySamples(): Array<{ actionToSignedDispatchMs: number; localProcessingMs: number }> {
	return dispatchSamples.map((sample) => ({
		actionToSignedDispatchMs: sample.actionToSendMs,
		localProcessingMs: sample.localProcessingMs
	}));
}

export function resetExecutionMetricsForTest(): void { samples.length = 0; dispatchSamples.length = 0; }
