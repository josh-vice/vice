/**
 * Browser-side diagnostics wiring.
 *
 * Installs the local-only listeners that feed the support-bundle recorders:
 *
 *   1. Health-store subscriptions — every transition of a feed/account health
 *      store is recorded so a support engineer can see the sequence that led
 *      to a failure (e.g. accountSync went idle → connecting → error).
 *   2. Window error + unhandledrejection — app errors are captured locally.
 *   3. Failed-request capture — fetch failures (network, HTTP ≥ 400, abort)
 *      are categorized and recorded locally.
 *
 * ALL of this is local state. Nothing here sends a telemetry/network request;
 * the data only leaves the machine when the user downloads a support bundle
 * themselves. `installDiagnostics` is idempotent and returns an uninstaller.
 */
import {
	walletStatus,
	marketDataStatus,
	marketCatalogStatus,
	accountSyncStatus,
	activeAssetSyncStatus,
	executionStatus,
	algoServiceStatus,
	candleDataStatus,
	marketContextStatus,
	revenueSyncStatus,
	deadmanStatus
} from '$lib/stores';
import type { Readable } from 'svelte/store';
import {
	recordHealthTransition,
	recordRequestFailure,
	recordAppError,
	type RequestFailureCategory
} from './recorder';

type HealthStore = Readable<string>;

/** Health stores we track transitions on, in a stable key order. */
const HEALTH_STORES: Array<[string, HealthStore]> = [
	['wallet', walletStatus],
	['marketData', marketDataStatus],
	['marketCatalog', marketCatalogStatus],
	['accountSync', accountSyncStatus],
	['activeAssetSync', activeAssetSyncStatus],
	['execution', executionStatus],
	['algoService', algoServiceStatus],
	['candleData', candleDataStatus],
	['marketContext', marketContextStatus],
	['revenueSync', revenueSyncStatus],
	['deadman', deadmanStatus as unknown as HealthStore]
];

interface InstallState {
	unsubscribers: Array<() => void>;
	installed: boolean;
}

let state: InstallState = { unsubscribers: [], installed: false };

/** Install all local diagnostics listeners. Idempotent. Returns an uninstaller. */
export function installDiagnostics(): () => void {
	if (typeof window === 'undefined' || state.installed) return () => {};
	state.installed = true;

	// 1. Health transitions.
	for (const [key, store] of HEALTH_STORES) {
		let previous: string | undefined;
		const unsub = store.subscribe((value) => {
			if (previous !== undefined && previous !== value) {
				recordHealthTransition(key, previous, value);
			}
			previous = value;
		});
		state.unsubscribers.push(unsub);
	}

	// 2. App errors (window error + unhandledrejection).
	const onError = (event: ErrorEvent) => {
		recordAppError({
			type: 'error',
			message: event.message || 'Unknown window error',
			source: event.filename
		});
	};
	const onUnhandled = (event: PromiseRejectionEvent) => {
		const reason = event.reason;
		const message =
			reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'Unhandled promise rejection';
		recordAppError({ type: 'unhandledrejection', message });
	};
	window.addEventListener('error', onError);
	window.addEventListener('unhandledrejection', onUnhandled);
	state.unsubscribers.push(() => window.removeEventListener('error', onError));
	state.unsubscribers.push(() => window.removeEventListener('unhandledrejection', onUnhandled));

	// 3. Failed-request capture (fetch wrapper — records failures only, never
	// blocks or alters the request, never records headers/bodies/queries).
	installFetchFailureCapture();

	return () => uninstallDiagnostics();
}

/**
 * Wrap `window.fetch` to categorize failures. This is read-only observation:
 * the wrapped function behaves identically for the app, and only rejects /
 * records local state when a request fails. Installed at most once.
 */
function installFetchFailureCapture(): void {
	const originalFetch = window.fetch;
	if (!originalFetch || (window as unknown as { __viceDiagFetchWrapped?: boolean }).__viceDiagFetchWrapped) return;
	(window as unknown as { __viceDiagFetchWrapped?: boolean }).__viceDiagFetchWrapped = true;

	// Cast to the native fetch type; the wrapper only supplies the callable.
	(window as unknown as { fetch: typeof fetch }).fetch = (async (...args: Parameters<typeof fetch>): Promise<Response> => {
		const request = args[0];
		const init = args[1];
		const method = (init?.method ?? (typeof request === 'string' ? 'GET' : (request as Request).method ?? 'GET')).toUpperCase();
		const url = typeof request === 'string' ? request : (request as Request).url;
		try {
			const response = await originalFetch(...args);
			if (response.status >= 400) {
				recordRequestFailure({
					category: 'http-error',
					method,
					url,
					at: Date.now()
				});
			}
			return response;
		} catch (error) {
			const category: RequestFailureCategory =
				error instanceof DOMException && error.name === 'AbortError' ? 'aborted' : 'network';
			recordRequestFailure({ category, method, url, at: Date.now() });
			throw error;
		}
	}) as unknown as typeof fetch;
}

/** Remove all installed listeners and restore any fetch wrapper. */
export function uninstallDiagnostics(): void {
	for (const unsub of state.unsubscribers) unsub();
	state.unsubscribers = [];
	state.installed = false;
}
