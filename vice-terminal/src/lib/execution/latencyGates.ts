export type LatencyGateSample = {
	receiptToStoreMs: number;
	feedToFrameReadyMs: number;
	actionToSignedDispatchMs: number;
	localProcessingMs: number;
};

export type LatencyGateResult = {
	pass: boolean;
	sampleCount: number;
	p99: {
		receiptToStoreMs: number;
		feedToFrameReadyMs: number;
		actionToSignedDispatchMs: number;
		localProcessingMs: number;
	};
	failures: string[];
};

function percentile(values: number[], fraction: number): number {
	if (!values.length) return 0;
	const sorted = values.slice().sort((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

export function evaluateLatencyGates(samples: LatencyGateSample[]): LatencyGateResult {
	const validSamples = samples.filter((sample) =>
		[
			sample.receiptToStoreMs,
			sample.feedToFrameReadyMs,
			sample.actionToSignedDispatchMs,
			sample.localProcessingMs
		].every((value) => Number.isFinite(value) && value >= 0)
	);
	const p99 = {
		receiptToStoreMs: percentile(validSamples.map((sample) => sample.receiptToStoreMs), 0.99),
		feedToFrameReadyMs: percentile(validSamples.map((sample) => sample.feedToFrameReadyMs), 0.99),
		actionToSignedDispatchMs: percentile(validSamples.map((sample) => sample.actionToSignedDispatchMs), 0.99),
		localProcessingMs: percentile(validSamples.map((sample) => sample.localProcessingMs), 0.99)
	};
	const failures: string[] = [];
	if (validSamples.length === 0) failures.push('latency evidence contains no valid samples');
	if (validSamples.length !== samples.length) failures.push(`latency evidence discarded ${samples.length - validSamples.length} invalid samples`);
	if (p99.receiptToStoreMs >= 5) failures.push(`receipt->store p99 ${p99.receiptToStoreMs.toFixed(3)}ms >= 5ms`);
	if (p99.feedToFrameReadyMs >= 16.667) failures.push(`feed->frame-ready p99 ${p99.feedToFrameReadyMs.toFixed(3)}ms >= one 60Hz frame`);
	if (p99.actionToSignedDispatchMs >= 10) failures.push(`action->signed dispatch p99 ${p99.actionToSignedDispatchMs.toFixed(3)}ms >= 10ms`);
	if (p99.localProcessingMs >= 2) failures.push(`local processing p99 ${p99.localProcessingMs.toFixed(3)}ms >= 2ms`);
	return { pass: failures.length === 0, sampleCount: validSamples.length, p99, failures };
}
