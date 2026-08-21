/// <reference lib="webworker" />

// Vice Terminal service worker — P0 PWA release artifact.
//
// Lifecycle contract:
//   * Install precaches the build + static shell (no skipWaiting on install).
//   * A new version waits in `waiting`; the page is told via the client
//     update loop ($lib/pwa.ts) and the user RELOADS deliberately. Only then
//     does the client send { type: 'SKIP_WAITING' } and this worker activates.
//   * Offline: navigations are network-first with a cached app-shell fallback.
//     The shell is a real previously-fetched SSR response — never synthesized
//     data. Trading/account endpoints (/api/*) are NEVER cached, so an offline
//     client cannot be served stale order/position state.

import { build, files, version } from '$service-worker';

const worker = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `vice-terminal-${version}`;
const APP_ASSETS = [...build, ...files];
const NAVIGATION_CACHE_PREFIX = 'shell:';
const API_PATTERN = /^\/api\//;

function isNavigation(request: Request): boolean {
	return request.mode === 'navigate';
}

function isSameOrigin(url: URL): boolean {
	return url.origin === worker.location.origin;
}

function isTradingEndpoint(url: URL): boolean {
	return API_PATTERN.test(url.pathname);
}

// Cache a navigation (HTML) response under its own URL so it can serve as the
// offline app shell later. Only successful, same-origin HTML responses qualify.
async function cacheShell(request: Request, response: Response): Promise<void> {
	if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return;
	try {
		const cache = await caches.open(CACHE);
		await cache.put(`${NAVIGATION_CACHE_PREFIX}${request.url}`, response.clone());
	} catch {
		// Shell caching is best-effort; a failed write never fails the fetch.
	}
}

async function shellFallback(request: Request): Promise<Response | undefined> {
	const cache = await caches.open(CACHE);
	const exact = await cache.match(`${NAVIGATION_CACHE_PREFIX}${request.url}`);
	if (exact) return exact;
	// The home page is the canonical app shell; it is precached the first time
	// it is fetched. Any cached shell is better than a browser error page.
	return cache.match(`${NAVIGATION_CACHE_PREFIX}${worker.location.origin}/`);
}

worker.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_ASSETS)));
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => worker.clients.claim())
	);
});

// The page controls activation: skipWaiting only on an explicit user-triggered
// reload handshake (see $lib/pwa.ts reloadForUpdate). Never skip on install.
worker.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') {
		event.waitUntil(worker.skipWaiting());
	}
});

worker.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (!isSameOrigin(url)) return;

	// Trading/account endpoints are network-only and never cached, so an offline
	// client fails instead of being served stale order/position state. The data
	// health chips surface OFFLINE/STALE and trading stays fail-closed.
	if (isTradingEndpoint(url)) return;

	if (isNavigation(request)) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					void cacheShell(request, response);
					return response;
				})
				.catch(() => shellFallback(request).then((fallback) => fallback ?? fetch(request)))
		);
		return;
	}

	// Hashed build assets and other same-origin GETs: cache-first with network
	// fill. This is the never-synthesized path — only real fetched responses
	// are ever placed in cache.
	event.respondWith(
		caches.match(request).then((cached) => {
			if (cached) return cached;
			return fetch(request).then((response) => {
				if (response.ok && url.pathname.startsWith('/_app/')) {
					const copy = response.clone();
					void caches.open(CACHE).then((cache) => cache.put(request, copy));
				}
				return response;
			});
		})
	);
});
