export type LatencyGateSample = {
	receiptToStoreMs: number;
	feedToFrameReadyMs: number;
	actionToSignedDispatchMs?: number;
	localProcessingMs?: number;
};

export type LatencyDispatchSample = {
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

export function evaluateLatencyGates(samples: LatencyGateSample[], dispatchSamples?: LatencyDispatchSample[]): LatencyGateResult {
	const validFeedSamples = samples.filter((sample) =>
		[sample.receiptToStoreMs, sample.feedToFrameReadyMs].every((value) => Number.isFinite(value) && value >= 0)
	);
	const validDispatchSamples: LatencyDispatchSample[] = (dispatchSamples ?? samples).flatMap((sample) => {
		const actionToSignedDispatchMs = sample.actionToSignedDispatchMs;
		const localProcessingMs = sample.localProcessingMs;
		return typeof actionToSignedDispatchMs === 'number' && Number.isFinite(actionToSignedDispatchMs) && actionToSignedDispatchMs >= 0 &&
			typeof localProcessingMs === 'number' && Number.isFinite(localProcessingMs) && localProcessingMs >= 0
			? [{ actionToSignedDispatchMs, localProcessingMs }]
			: [];
	});
	const p99 = {
		receiptToStoreMs: percentile(validFeedSamples.map((sample) => sample.receiptToStoreMs), 0.99),
		feedToFrameReadyMs: percentile(validFeedSamples.map((sample) => sample.feedToFrameReadyMs), 0.99),
		actionToSignedDispatchMs: percentile(validDispatchSamples.map((sample) => sample.actionToSignedDispatchMs), 0.99),
		localProcessingMs: percentile(validDispatchSamples.map((sample) => sample.localProcessingMs), 0.99)
	};
	const failures: string[] = [];
	if (validFeedSamples.length === 0) failures.push('latency evidence contains no valid samples');
	if (validDispatchSamples.length === 0) failures.push('latency evidence contains no valid dispatch samples');
	if (validFeedSamples.length !== samples.length) failures.push(`latency evidence discarded ${samples.length - validFeedSamples.length} invalid feed samples`);
	if (dispatchSamples && validDispatchSamples.length !== dispatchSamples.length) failures.push(`latency evidence discarded ${dispatchSamples.length - validDispatchSamples.length} invalid dispatch samples`);
	if (p99.receiptToStoreMs >= 5) failures.push(`receipt->store p99 ${p99.receiptToStoreMs.toFixed(3)}ms >= 5ms`);
	if (p99.feedToFrameReadyMs >= 16.667) failures.push(`feed->frame-ready p99 ${p99.feedToFrameReadyMs.toFixed(3)}ms >= one 60Hz frame`);
	if (p99.actionToSignedDispatchMs >= 10) failures.push(`action->signed dispatch p99 ${p99.actionToSignedDispatchMs.toFixed(3)}ms >= 10ms`);
	if (p99.localProcessingMs >= 2) failures.push(`local processing p99 ${p99.localProcessingMs.toFixed(3)}ms >= 2ms`);
	return { pass: failures.length === 0, sampleCount: Math.min(validFeedSamples.length, validDispatchSamples.length), p99, failures };
}
