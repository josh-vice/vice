import { dispatchLatencySamples } from './telemetry';
import { feedFrameReadyLatencySamples, feedStoreLatencySamples, runtimeHealthSnapshot, type RuntimeHealthSnapshot } from '$lib/native/performance';

export type LatencyEvidenceNetwork = 'testnet' | 'mainnet';

export type ClientLatencyEvidence = {
	schemaVersion: 2;
	source: 'client-telemetry';
	network: LatencyEvidenceNetwork;
	capturedAt: string;
	/** Privacy-safe aggregate health captured by this browser session. */
	runtimeHealth: RuntimeHealthSnapshot;
	samples: Array<{
		receiptToStoreMs: number;
		feedToFrameReadyMs: number;
		actionToSignedDispatchMs: number;
		localProcessingMs: number;
	}>;
};

/**
 * Build release evidence from timings actually observed in this browser session.
 * Empty telemetry is intentional: certification must fail closed instead of
 * manufacturing samples or treating a unit-test snapshot as production proof.
 */
export function buildLatencyEvidence(
	network: LatencyEvidenceNetwork,
	capturedAt = new Date().toISOString()
): ClientLatencyEvidence {
	const store = feedStoreLatencySamples();
	const frameReady = feedFrameReadyLatencySamples();
	const dispatch = dispatchLatencySamples();
	const count = Math.min(store.length, frameReady.length, dispatch.length);
	return {
		schemaVersion: 2,
		source: 'client-telemetry',
		network,
		capturedAt,
		runtimeHealth: runtimeHealthSnapshot(),
		samples: Array.from({ length: count }, (_, index) => ({
			receiptToStoreMs: store[index],
			feedToFrameReadyMs: frameReady[index],
			actionToSignedDispatchMs: dispatch[index].actionToSignedDispatchMs,
			localProcessingMs: dispatch[index].localProcessingMs
		}))
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
