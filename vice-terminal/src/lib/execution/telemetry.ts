import { writable } from 'svelte/store';
import type { ExecutionAck } from './client';

export type ExecutionLifecycleStatus = 'accepted' | 'rejected' | 'unknown' | 'reconciled';

export type ExecutionMetrics = {
	count: number;
	accepted: number;
	rejected: number;
	uncertain: number;
	unknown: number;
	reconciled: number;
	p50Ms: number;
	p95Ms: number;
	p99Ms: number;
	maxMs: number;
	dispatchP50Ms: number;
	dispatchP95Ms: number;
	dispatchP99Ms: number;
	localProcessingP50Ms: number;
	localProcessingP95Ms: number;
	localProcessingP99Ms: number;
	inputToSubmitCount: number;
	inputToSubmitP50Ms: number;
	inputToSubmitP95Ms: number;
	inputToSubmitP99Ms: number;
	recoveryCount: number;
	recoveryP50Ms: number;
	recoveryP95Ms: number;
	recoveryP99Ms: number;
};

const MAX_SAMPLES = 500;
const samples: Array<{ latencyMs: number; accepted: boolean; uncertain: boolean; reconciled: boolean }> = [];
const dispatchSamples: Array<{ commandId: string; actionToSendMs: number; localProcessingMs: number; inputToSubmitMs?: number }> = [];
const inputToSubmitSamples: number[] = [];
const recoverySamples: number[] = [];

export const executionTelemetry = writable<ExecutionMetrics>(emptyMetrics());

export function executionLifecycleStatus(
	ack: Pick<ExecutionAck, 'accepted' | 'uncertain' | 'reconciled'>
): ExecutionLifecycleStatus {
	if (ack.reconciled === true) return 'reconciled';
	if (ack.uncertain === true) return 'unknown';
	return ack.accepted ? 'accepted' : 'rejected';
}

function emptyMetrics(): ExecutionMetrics {
	return {
		count: 0,
		accepted: 0,
		rejected: 0,
		uncertain: 0,
		unknown: 0,
		reconciled: 0,
		p50Ms: 0,
		p95Ms: 0,
		p99Ms: 0,
		maxMs: 0,
		dispatchP50Ms: 0,
		dispatchP95Ms: 0,
		dispatchP99Ms: 0,
		localProcessingP50Ms: 0,
		localProcessingP95Ms: 0,
		localProcessingP99Ms: 0,
		inputToSubmitCount: 0,
		inputToSubmitP50Ms: 0,
		inputToSubmitP95Ms: 0,
		inputToSubmitP99Ms: 0,
		recoveryCount: 0,
		recoveryP50Ms: 0,
		recoveryP95Ms: 0,
		recoveryP99Ms: 0
	};
}

function percentile(values: number[], fraction: number): number {
	if (values.length === 0) return 0;
	const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * fraction) - 1));
	return values[index] ?? 0;
}

function measuredDurationMs(startUs: number, endUs: number): number {
	return Math.max(0, (endUs - startUs) / 1000);
}

function publish(): void {
	executionTelemetry.set(executionMetrics());
}

export function recordDispatchLatency(
	actionStartedUs: number,
	receiveUs: number,
	sendUs: number,
	commandId = '',
	inputStartedUs?: number
): void {
	const inputToSubmitMs = typeof inputStartedUs === 'number' && Number.isFinite(inputStartedUs)
		? measuredDurationMs(inputStartedUs, sendUs)
		: undefined;
	dispatchSamples.push({
		commandId,
		actionToSendMs: measuredDurationMs(actionStartedUs, sendUs),
		localProcessingMs: measuredDurationMs(receiveUs, sendUs),
		...(inputToSubmitMs === undefined ? {} : { inputToSubmitMs })
	});
	if (inputToSubmitMs !== undefined) {
		inputToSubmitSamples.push(inputToSubmitMs);
		if (inputToSubmitSamples.length > MAX_SAMPLES) inputToSubmitSamples.shift();
	}
	if (dispatchSamples.length > MAX_SAMPLES) dispatchSamples.shift();
	publish();
}

export function recordInputToSubmit(inputStartedUs: number, submittedUs: number): void {
	if (!Number.isFinite(inputStartedUs) || !Number.isFinite(submittedUs)) return;
	inputToSubmitSamples.push(measuredDurationMs(inputStartedUs, submittedUs));
	if (inputToSubmitSamples.length > MAX_SAMPLES) inputToSubmitSamples.shift();
	publish();
}

export function recordRecoveryLatency(recoveryStartedUs: number, recoveredUs: number): void {
	if (!Number.isFinite(recoveryStartedUs) || !Number.isFinite(recoveredUs)) return;
	recoverySamples.push(measuredDurationMs(recoveryStartedUs, recoveredUs));
	if (recoverySamples.length > MAX_SAMPLES) recoverySamples.shift();
	publish();
}

export function recordExecutionAck(ack: ExecutionAck): void {
	samples.push({
		latencyMs: measuredDurationMs(ack.gatewayReceiveUs, ack.completedUs),
		accepted: ack.accepted,
		uncertain: ack.uncertain === true,
		reconciled: ack.reconciled === true
	});
	if (samples.length > MAX_SAMPLES) samples.shift();
	publish();
}

export function executionMetrics(): ExecutionMetrics {
	const sorted = samples.map((sample) => sample.latencyMs).sort((a, b) => a - b);
	const dispatchSorted = dispatchSamples.map((sample) => sample.actionToSendMs).sort((a, b) => a - b);
	const localSorted = dispatchSamples.map((sample) => sample.localProcessingMs).sort((a, b) => a - b);
	const inputSorted = inputToSubmitSamples.slice().sort((a, b) => a - b);
	const recoverySorted = recoverySamples.slice().sort((a, b) => a - b);
	const lifecycleCounts = { accepted: 0, rejected: 0, unknown: 0, reconciled: 0 };
	for (const sample of samples) {
		const status = executionLifecycleStatus(sample);
		lifecycleCounts[status] += 1;
	}
	return {
		count: samples.length,
		accepted: lifecycleCounts.accepted,
		rejected: lifecycleCounts.rejected,
		uncertain: samples.filter((sample) => sample.uncertain).length,
		unknown: lifecycleCounts.unknown,
		reconciled: lifecycleCounts.reconciled,
		p50Ms: percentile(sorted, 0.5),
		p95Ms: percentile(sorted, 0.95),
		p99Ms: percentile(sorted, 0.99),
		maxMs: sorted.at(-1) ?? 0,
		dispatchP50Ms: percentile(dispatchSorted, 0.5),
		dispatchP95Ms: percentile(dispatchSorted, 0.95),
		dispatchP99Ms: percentile(dispatchSorted, 0.99),
		localProcessingP50Ms: percentile(localSorted, 0.5),
		localProcessingP95Ms: percentile(localSorted, 0.95),
		localProcessingP99Ms: percentile(localSorted, 0.99),
		inputToSubmitCount: inputSorted.length,
		inputToSubmitP50Ms: percentile(inputSorted, 0.5),
		inputToSubmitP95Ms: percentile(inputSorted, 0.95),
		inputToSubmitP99Ms: percentile(inputSorted, 0.99),
		recoveryCount: recoverySorted.length,
		recoveryP50Ms: percentile(recoverySorted, 0.5),
		recoveryP95Ms: percentile(recoverySorted, 0.95),
		recoveryP99Ms: percentile(recoverySorted, 0.99)
	};
}

/** Return only measured dispatch timings; no command, account, or venue data is exported. */
export function dispatchLatencySamples(): Array<{ actionToSignedDispatchMs: number; localProcessingMs: number; inputToSubmitMs?: number }> {
	return dispatchSamples.map((sample) => ({
		actionToSignedDispatchMs: sample.actionToSendMs,
		localProcessingMs: sample.localProcessingMs,
		...(sample.inputToSubmitMs === undefined ? {} : { inputToSubmitMs: sample.inputToSubmitMs })
	}));
}

/** Return only measured recovery durations; no command, account, or venue data is exported. */
export function recoveryLatencySamples(): number[] {
	return recoverySamples.slice();
}
/** Return only measured input-to-submit durations; no command, account, or venue data is exported. */
export function inputToSubmitLatencySamples(): number[] {
	return inputToSubmitSamples.slice();
}

export function resetExecutionMetricsForTest(): void {
	samples.length = 0;
	dispatchSamples.length = 0;
	inputToSubmitSamples.length = 0;
	recoverySamples.length = 0;
	publish();
}
