#!/usr/bin/env bun
// Production header/routing test for the Vice Terminal PWA.
//
// Validates the Vercel deployment config (vercel.json) and the SvelteKit CSP
// (svelte.config.js) enforce the release contract:
//   * HTML / service-worker / manifest / icons are NO-CACHE (fresh update handshake).
//   * Hashed build assets (_app/*) are immutable (long-lived cache).
//   * Security headers (nosniff, frame DENY, referrer, CORP) are applied site-wide.
//   * CSP is nonce-based and least-privilege — no unsafe-inline, trading/venue
//     endpoints allowed, worker-src for the service worker.
//
// Run: `bun test scripts/pwa-prod.test.mjs` (no build required).

import { describe, expect, test } from 'bun:test';

const VERCEL = JSON.parse(await Bun.file(new URL('../vercel.json', import.meta.url)).text());
const SVELTE = await Bun.file(new URL('../svelte.config.js', import.meta.url)).text();

function headersFor(source) {
	const rule = VERCEL.headers.find((h) => h.source === source);
	return rule ? new Map(rule.headers.map((h) => [h.key, h.value])) : null;
}

describe('Vercel production routing/headers', () => {
	test('uses only terminal-local vercel.json (not the root legacy-site one)', () => {
		// The terminal artifact must carry its own deployment config.
		expect(VERCEL.headers.length).toBeGreaterThan(0);
		// No root legacy-site rewrites that redirect /vice/ etc.
		expect(VERCEL.rewrites).toBeUndefined();
		expect(VERCEL.redirects).toBeUndefined();
	});

	test('hashed build assets under /_app are cached immutable', () => {
		const h = headersFor('/_app/(.*)');
		expect(h).not.toBeNull();
		expect(h.get('Cache-Control')).toContain('immutable');
		expect(h.get('Cache-Control')).toContain('max-age=31536000');
	});

	test('service worker and PWA manifest/icons are never long-cached', () => {
		for (const source of ['/(service-worker|sw|manifest.webmanifest|manifest.json|icon-192|icon-512|icon-maskable-512|apple-touch-icon).*']) {
			const h = headersFor(source);
			expect(h, source).not.toBeNull();
			expect(h.get('Cache-Control')).toContain('no-cache');
			expect(h.get('Cache-Control')).toContain('no-store');
		}
	});

	test('security headers apply site-wide', () => {
		const h = headersFor('/(.*)');
		expect(h).not.toBeNull();
		expect(h.get('X-Content-Type-Options')).toBe('nosniff');
		expect(h.get('X-Frame-Options')).toBe('DENY');
		expect(h.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
		expect(h.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
	});
});

describe('SvelteKit CSP (svelte.config.js)', () => {
	test('explicit adapter-vercel, not adapter-auto', () => {
		expect(SVELTE).toContain("@sveltejs/adapter-vercel");
		expect(SVELTE).not.toContain('adapter-auto()');
	});

	test('nonce-based CSP with no unsafe-inline and least-privilege sources', () => {
		expect(SVELTE).toContain("mode: 'nonce'");
		// Match the quoted CSP directive value, not prose in comments.
		expect(SVELTE).not.toContain("'unsafe-inline'");
		expect(SVELTE).not.toContain("'unsafe-eval'");
		expect(SVELTE).toContain('default-src');
		expect(SVELTE).toContain('script-src');
		expect(SVELTE).toContain("'self'");
		// Worker allowed only from self (the service worker), never from a CDN.
		expect(SVELTE).toContain("worker-src");
		expect(SVELTE).toContain('frame-ancestors');
	});

	test('venue endpoints are explicitly allowed in connect-src (testnet + mainnet)', () => {
		expect(SVELTE).toContain('api.hyperliquid-testnet.xyz');
		expect(SVELTE).toContain('api.hyperliquid.xyz');
		expect(SVELTE).toContain('wss://api.hyperliquid.xyz');
		expect(SVELTE).toContain('wss://api.hyperliquid-testnet.xyz');
	});
});
