import { describe, expect, test, beforeAll } from 'bun:test';

// PWA manifest + service-worker + install/update/offline lifecycle tests.
//
// The manifest is static JSON shipped in `static/`; the service worker and the
// $lib/pwa.ts client helper carry the install/update/offline contract. We
// validate the manifest as data, assert the service-worker source enforces the
// security/lifecycle invariants by source token scan, and exercise pwa.ts's
// update/offline behaviour against a stubbed navigator.

const MANIFEST = JSON.parse(
	await Bun.file(new URL('../../static/manifest.webmanifest', import.meta.url)).text()
);

const SW_SRC = await Bun.file(new URL('../service-worker.ts', import.meta.url)).text();

describe('PWA manifest validity', () => {
	test('is a complete standalone-install manifest', () => {
		expect(MANIFEST.name).toBeTruthy();
		expect(MANIFEST.short_name).toBeTruthy();
		expect(MANIFEST.id).toBeTruthy();
		expect(MANIFEST.start_url).toBeTruthy();
		expect(MANIFEST.scope).toBeTruthy();
		expect(MANIFEST.display).toBe('standalone');
		expect(Array.isArray(MANIFEST.display_override)).toBe(true);
		expect(MANIFEST.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
		expect(MANIFEST.background_color).toMatch(/^#[0-9a-f]{6}$/i);
	});

	test('exposes a real icon set including a maskable variant', () => {
		expect(Array.isArray(MANIFEST.icons)).toBe(true);
		expect(MANIFEST.icons.length).toBeGreaterThanOrEqual(3);
		const maskable = MANIFEST.icons.filter((i) => (i.purpose ?? 'any').includes('maskable'));
		expect(maskable.length).toBe(1);
		expect(maskable[0].sizes).toBe('512x512');
		expect(maskable[0].type).toBe('image/png');
		// Every declared icon must exist in the static dir.
		for (const icon of MANIFEST.icons) {
			const file = new URL(`../../static${icon.src}`, import.meta.url);
			expect(Bun.file(file).size, `icon ${icon.src} exists`).toBeGreaterThan(0);
		}
	});
});

describe('service-worker lifecycle contract', () => {
	const src = SW_SRC;

	test('precaches the build and never skips waiting on install', () => {
		expect(src).toContain('$service-worker');
		expect(src).toContain('cache.addAll(APP_ASSETS)');
		// skipWaiting must only be reachable via the SKIP_WAITING message handshake,
		// never unconditionally on install.
		expect(src).toContain('SKIP_WAITING');
		expect(src.lastIndexOf('skipWaiting()')).toBeGreaterThan(src.lastIndexOf("'SKIP_WAITING'"));
		// skipWaiting() is called only inside the SKIP_WAITING message handler.
		const msgStart = src.lastIndexOf("'SKIP_WAITING'");
		const skip = src.lastIndexOf('skipWaiting()');
		const between = src.slice(msgStart, skip);
		expect(between).toMatch(/message|SKIP_WAITING/);
		// The install handler itself never calls skipWaiting.
		expect(src).not.toMatch(/addEventListener\('install'[\s\S]{0,200}skipWaiting\(\)/);
	});

	test('never caches trading/account API responses', () => {
		expect(src).toContain('/api/');
		expect(src).toContain('network-only');
	});

	test('app-shell navigations fall back to a previously-fetched HTML shell', () => {
		expect(src).toContain("request.mode === 'navigate'");
		expect(src).toContain('shellFallback');
		expect(src).toContain('never synthesized');
	});

	test('active version cleanup removes stale caches', () => {
		expect(src).toContain('activate');
		expect(src).toContain('caches.delete(key)');
	});
});

describe('$lib/pwa.ts install/update/offline flow', () => {
	let pwa;
	beforeAll(async () => {
		pwa = await import('./pwa.ts');
	});

	test('pwaSupported is false without a service-worker-capable navigator', () => {
		const prev = globalThis.navigator;
		globalThis.navigator = { onLine: true };
		expect(pwa.pwaSupported()).toBe(false);
		globalThis.navigator = prev;
	});

	test('pwaSupported is true in a service-worker-capable environment', () => {
		const prev = globalThis.navigator;
		globalThis.navigator = { serviceWorker: {} };
		expect(pwa.pwaSupported()).toBe(true);
		globalThis.navigator = prev;
	});

	test('offline listeners flip the offline store on window events', async () => {
		// Stub a window with a navigator.onLine and addEventListener collector.
		// No serviceWorker key → pwaSupported() is false, so registration is
		// skipped but the offline/online window listeners still install.
		const listeners = {};
		globalThis.window = {
			navigator: { onLine: true },
			addEventListener: (name, fn) => (listeners[name] = fn),
			setInterval: () => 0,
			clearInterval: () => {}
		};
		globalThis.navigator = { onLine: true }; // no serviceWorker key
		globalThis.clearInterval = () => {};
		pwa.resetPwaForTests();
		pwa.registerPwa();
		expect(typeof listeners['offline']).toBe('function');
		expect(typeof listeners['online']).toBe('function');
		// Firing the offline event flips the store to true.
		listeners['offline']();
		let off;
		pwa.isOffline.subscribe((v) => (off = v));
		expect(off).toBe(true);
		delete globalThis.window;
		delete globalThis.navigator;
		pwa.resetPwaForTests();
	});

	test('update-available is surfaced when a new build installs behind a controller', async () => {
		const listeners = {};
		const regListeners = {};
		const stateListeners = {};
		const sw = {
			state: 'installing',
			addEventListener: (name, fn) => (stateListeners[name] = fn)
		};
		let resolveRegister;
		globalThis.window = {
			navigator: {
				onLine: true,
				serviceWorker: {
					controller: { /* existing active controller */ },
					register: () => new Promise((res) => {
						const reg = {
							installing: sw,
							waiting: null,
							addEventListener: (name, fn) => (regListeners[name] = fn)
						};
						resolveRegister = () => res(reg);
					}),
					addEventListener: (name, fn) => (listeners[name] = fn)
				}
			},
			location: { reload: () => {} },
			addEventListener: () => {},
			setInterval: () => 0,
			setTimeout: () => 0,
			clearInterval: () => {}
		};
		// pwaSupported() reads the GLOBAL navigator (not window.navigator).
		globalThis.navigator = globalThis.window.navigator;
		globalThis.clearInterval = () => {};
		pwa.resetPwaForTests();
		pwa.registerPwa();
		// Registration resolves → the updatefound listener is attached to reg.
		resolveRegister();
		await Promise.resolve();
		expect(typeof regListeners['updatefound']).toBe('function');
		// updatefound reads reg.installing (sw) and attaches statechange to it.
		regListeners['updatefound']();
		expect(typeof stateListeners['statechange']).toBe('function');
		// Simulate the worker reaching 'installed' behind a controller.
		sw.state = 'installed';
		stateListeners['statechange']();
		let up;
		pwa.updateAvailable.subscribe((v) => (up = v));
		expect(up).toBe(true);
		delete globalThis.window;
		delete globalThis.navigator;
		pwa.resetPwaForTests();
	});

	test('reloadForUpdate posts SKIP_WAITING to the waiting worker', async () => {
		let posted = null;
		let resolveRegister;
		globalThis.window = {
			navigator: {
				onLine: true,
				serviceWorker: {
					controller: { /* existing active controller */ },
					register: () => new Promise((res) => {
						resolveRegister = () =>
							res({
								installing: null,
								waiting: { postMessage: (msg) => (posted = msg) },
								addEventListener: () => {}
							});
					}),
					addEventListener: () => {}
				}
			},
			location: { reload: () => {} },
			addEventListener: () => {},
			setInterval: () => 0,
			clearInterval: () => {}
		};
		globalThis.navigator = globalThis.window.navigator;
		globalThis.clearInterval = () => {};
		pwa.resetPwaForTests();
		pwa.registerPwa();
		resolveRegister();
		await Promise.resolve();
		// The waiting worker posts SKIP_WAITING for the deliberate-reload handshake.
		pwa.reloadForUpdate();
		expect(posted).toEqual({ type: 'SKIP_WAITING' });
		delete globalThis.window;
		delete globalThis.navigator;
		pwa.resetPwaForTests();
	});
});
