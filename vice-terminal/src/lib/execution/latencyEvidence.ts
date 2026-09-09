import { dispatchLatencySamples, inputToSubmitLatencySamples, recoveryLatencySamples } from './telemetry';
import { causalFeedLatencySamples, runtimeHealthSnapshot, type RuntimeHealthSnapshot } from '$lib/native/performance';

export type LatencyEvidenceNetwork = 'testnet' | 'mainnet';

export type LatencyPercentiles = {
	count: number;
	p50: number;
	p95: number;
	p99: number;
	max: number;
};

export type ClientLatencyEvidence = {
	schemaVersion: 2;
	source: 'client-telemetry';
	network: LatencyEvidenceNetwork;
	capturedAt: string;
	/** Privacy-safe aggregate health captured by this browser session. */
	runtimeHealth: RuntimeHealthSnapshot;
	samples: Array<{
		feed: string;
		sequence: number;
		receiptToStoreMs: number;
		storeToPaintMs: number;
		feedToFrameReadyMs: number;
		actionToSignedDispatchMs?: number;
		localProcessingMs?: number;
	}>;
	dispatchSamples: Array<{ actionToSignedDispatchMs: number; localProcessingMs: number; inputToSubmitMs?: number }>;
	inputToSubmitSamples: number[];
	recoverySamples: number[];
	percentiles: {
		sourceToStore: LatencyPercentiles;
		storeToPaint: LatencyPercentiles;
		feedToFrameReady: LatencyPercentiles;
		inputToSubmit: LatencyPercentiles;
		recovery: LatencyPercentiles;
	};
};

function summarize(values: readonly number[]): LatencyPercentiles {
	const sorted = values.filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
	const percentile = (fraction: number): number => {
		if (sorted.length === 0) return 0;
		const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
		return sorted[index] ?? 0;
	};
	return {
		count: sorted.length,
		p50: percentile(0.5),
		p95: percentile(0.95),
		p99: percentile(0.99),
		max: sorted.at(-1) ?? 0
	};
}

/**
 * Build release evidence from timings actually observed in this browser session.
 * Empty telemetry is intentional: certification must fail closed instead of
 * manufacturing samples or treating a unit-test snapshot as production proof.
 */
export function buildLatencyEvidence(
	network: LatencyEvidenceNetwork,
	capturedAt = new Date().toISOString()
): ClientLatencyEvidence {
	const feed = causalFeedLatencySamples();
	const dispatchSamples = dispatchLatencySamples();
	const inputToSubmitSamples = inputToSubmitLatencySamples();
	const recoverySamples = recoveryLatencySamples();
	return {
		schemaVersion: 2,
		source: 'client-telemetry',
		network,
		capturedAt,
		runtimeHealth: runtimeHealthSnapshot(),
		samples: feed.map((sample) => ({
			feed: sample.feed,
			sequence: sample.sequence,
			receiptToStoreMs: sample.receiptToStoreMs,
			storeToPaintMs: sample.storeToPaintMs,
			feedToFrameReadyMs: sample.feedToFrameReadyMs
		})),
		dispatchSamples,
		inputToSubmitSamples,
		recoverySamples,
		percentiles: {
			sourceToStore: summarize(feed.map((sample) => sample.receiptToStoreMs)),
			storeToPaint: summarize(feed.map((sample) => sample.storeToPaintMs)),
			feedToFrameReady: summarize(feed.map((sample) => sample.feedToFrameReadyMs)),
			inputToSubmit: summarize(inputToSubmitSamples),
			recovery: summarize(recoverySamples)
		}
	};
}

/** Download only timing evidence; account, order, wallet, and venue identifiers never enter the payload. */
export function downloadLatencyEvidence(network: LatencyEvidenceNetwork): ClientLatencyEvidence {
	const evidence = buildLatencyEvidence(network);
	if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') return evidence;
	const url = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' }));
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = `vice-terminal-latency-${network}-${new Date().toISOString().replaceAll(':', '-')}.json`;
	anchor.click();
	setTimeout(() => URL.revokeObjectURL(url), 0);
	return evidence;
}
