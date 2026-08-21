#!/usr/bin/env bun
// Bounded-artifact gate for the Vice Terminal PWA build.
//
// Runs against the SvelteKit/Vercel adapter output (.vercel/output). It proves
// the SERVED static artifact:
//   1. contains the required PWA files (service worker, manifest, icon set), and
//   2. does NOT contain any internal tree, signer script, key, env file, docs,
//      evidence, promo tooling, or build source that must never reach clients.
//
// The .vercelignore (this directory) excludes internal files from the upload
// sandbox; this test is the second line of defense that verifies what actually
// ended up in the artifact after a real build.
//
// Run: `bun run build` first (in vice-terminal), then `bun test scripts/pwa-artifact.test.mjs`.

import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const OUTPUT = join(ROOT, '.vercel', 'output');
const STATIC = join(OUTPUT, 'static');

function listFiles(dir) {
	const out = [];
	if (!existsSync(dir)) return out;
	const walk = (d) => {
		for (const entry of readdirSync(d)) {
			const full = join(d, entry);
			if (statSync(full).isDirectory()) walk(full);
			else out.push(full);
		}
	};
	walk(dir);
	return out;
}

// Only path segments are matched; a static asset that merely happens to contain
// a forbidden substring in its FILENAME (e.g. a docs route chunk) is legitimate,
// so we split on the OS separator and compare whole segments.
function hasForbiddenSegment(rel, forbidden) {
	return forbidden.some((seg) => rel.split(sep).includes(seg));
}

describe('Vice Terminal PWA artifact boundary', () => {
	const files = listFiles(STATIC);
	const rel = files.map((f) => f.slice(STATIC.length + 1));

	test('adapter produced a static artifact', () => {
		expect(existsSync(OUTPUT)).toBe(true);
		expect(existsSync(STATIC)).toBe(true);
		expect(files.length).toBeGreaterThan(0);
	});

	test('required PWA shell files are present', () => {
		for (const required of [
			'service-worker.js',
			'manifest.webmanifest',
			'icon-192.png',
			'icon-512.png',
			'icon-maskable-512.png',
			'apple-touch-icon.png'
		]) {
			expect(rel).toContain(required);
		}
		// Build output (hashed client assets) exists under _app/.
		expect(rel.some((f) => f.startsWith('_app' + sep))).toBe(true);
	});

	test('no internal source, signer, or credential trees are served', () => {
		// Whole-segment forbidden paths. Each is an internal tree or file that
		// must never appear inside the SERVED static artifact. NOTE: `static/docs/`
		// (the app's own documentation imagery) is deliberately NOT forbidden —
		// it is a legitimate served asset referenced by the in-app docs. The
		// forbidden set covers repo-internal source, signer, and evidence trees
		// that live OUTSIDE static/ and must never reach a client even if the
		// Root Directory or .vercelignore is ever misconfigured.
		const forbidden = [
			'src',
			'node_modules',
			'scripts',
			'.vercel',
			'.svelte-kit',
			'evidence',
			'hermes-sidecar',
			'blofin',
			'lighter',
			'nado',
			'promo',
			'.hermes',
			'.env',
			'package.json',
			'bun.lock',
			'vite.config',
			'PLAN_3',
			'OPERATIONS.md',
			'user-stories',
			'US-'
		];
		const leaks = rel.filter((f) => hasForbiddenSegment(f, forbidden));
		expect(leaks).toEqual([]);
	});

	test('no key/signature materials leak into the served artifact', () => {
		// Real credential/signature FILES (extensions), not app image filenames.
		// Static docs screenshots legitimately contain words like "credential".
		const suspicious = rel.filter((f) =>
			/\.(pem|p8|key|jwk|keystore)$/.test(f) || /\.env$/.test(f)
		);
		expect(suspicious).toEqual([]);
	});
});
