import { writable } from 'svelte/store';

// Client-side PWA lifecycle — update-available notification, deliberate reload,
// and offline detection. Registration is manual (kit.serviceWorker.register is
// false in svelte.config.js) so the app controls the update flow instead of
// SvelteKit's silent auto-registration.
//
// The offline store is UI truth only: it reflects navigator.onLine. It never
// fabricates market data — when offline the venue feeds fail and the existing
// DATA/CATALOG/ACCOUNT health chips surface STALE/ERROR, plus the OFFLINE chip.

export const updateAvailable = writable(false);
export const isOffline = writable(false);

const SW_URL = '/service-worker.js';
const UPDATE_CHECK_MS = 30 * 60 * 1000; // 30-minute background update poll

let registration: ServiceWorkerRegistration | null = null;
let reloadRequested = false;
let updateTimer: number | null = null;

/** True when the runtime can register a service worker (browser, secure context). */
export function pwaSupported(): boolean {
	return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Install offline listeners (always, even in dev) and register the production
 * service worker. Safe to call multiple times; registration is idempotent.
 */
export function registerPwa(): void {
	if (typeof window === 'undefined') return;

	// Offline detection is independent of the service worker.
	window.addEventListener('online', () => isOffline.set(false));
	window.addEventListener('offline', () => isOffline.set(true));
	isOffline.set(!window.navigator.onLine);

	if (!pwaSupported()) return;
	// SvelteKit's dev service worker is built as an ES module and its lifecycle
	// differs from production; keep dev sessions free of update churn.
	if (import.meta.env.DEV) return;

	window.navigator.serviceWorker
		.register(SW_URL, { updateViaCache: 'none' })
		.then((reg) => {
			registration = reg;
			reg.addEventListener('updatefound', () => {
				const next = reg.installing ?? reg.waiting;
				if (!next) return;
				next.addEventListener('statechange', () => {
					// `installed` with an existing controller means a NEW build is
					// waiting — that is the moment to surface the update banner.
					if (next.state === 'installed' && window.navigator.serviceWorker.controller) {
						updateAvailable.set(true);
					}
				});
			});
			window.navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (reloadRequested) window.location.reload();
			});
			updateTimer = window.setInterval(() => {
				void checkForUpdates();
			}, UPDATE_CHECK_MS);
		})
		.catch(() => {
			// No service worker (private mode / unsupported). The app still works;
			// there is just no offline shell or update handshake.
		});
}

/** Poll the server for a newer service worker build. */
export async function checkForUpdates(): Promise<void> {
	if (!registration) return;
	try {
		await registration.update();
	} catch {
		// Transient network failure; the next poll retries.
	}
}

/**
 * Deliberate reload handshake. Marks that a reload is desired, tells the
 * waiting worker to activate (skipWaiting), then reloads once the new
 * controller takes over (controllerchange listener in registerPwa).
 */
export function reloadForUpdate(): void {
	if (!registration) return;
	reloadRequested = true;
	updateAvailable.set(false);
	const waiting = registration.waiting;
	if (waiting) {
		waiting.postMessage({ type: 'SKIP_WAITING' });
	} else {
		// No waiting worker yet — force a fresh check then reload anyway.
		void checkForUpdates();
		window.setTimeout(() => window.location.reload(), 1500);
	}
}

/** Test-only reset so bun tests never leak interval timers or store flags. */
export function resetPwaForTests(): void {
	if (updateTimer !== null && typeof clearInterval !== 'undefined') clearInterval(updateTimer);
	updateTimer = null;
	registration = null;
	reloadRequested = false;
	updateAvailable.set(false);
	isOffline.set(false);
}
