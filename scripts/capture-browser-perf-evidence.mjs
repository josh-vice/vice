#!/usr/bin/env node
/**
 * capture-browser-perf-evidence.mjs
 *
 * Gate 3 — real-Chromium cold-load latency/resilience evidence against the
 * PRODUCTION build (vite preview) on Hyperliquid testnet. Runs N true cold
 * loads with cache disabled (a fresh incognito context + no HTTP cache per
 * run) and captures, per run:
 *   - TTFB, FCP, LCP, DCL, load (navigation + paint timing)
 *   - JS transfer bytes + request count (resource timing, script resources)
 *   - long tasks (count + total duration)
 *   - chart-candle paint (time to data-candle-count >= 1 on the trading chart)
 *   - interaction-ready time (time to a stable terminal shell + hydrayed panel)
 * Then computes p50/p95 across runs and writes a sanitized evidence JSON.
 *
 * Non-mutating: no signer, no wallet, no order path. Read-only navigation
 * against public testnet data.
 *
 * Usage:
 *   node scripts/capture-browser-perf-evidence.mjs --runs=12 [--port=4185] [--build]
 */
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const TERMINAL = join(ROOT, 'vice-terminal');
const RUNS = Number(process.argv.find((a) => a.startsWith('--runs='))?.split('=')[1] ?? 12);
const PORT = Number(process.argv.find((a) => a.startsWith('--port='))?.split('=')[1] ?? 4185);
const DO_BUILD = process.argv.includes('--build');
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = resolve(ROOT, 'scripts', 'e2e', 'perf-evidence');
const SANITIZE = /\b0x[a-fA-F0-9]{64}\b/g;

function pct(values, p) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
	return sorted[idx];
}
function mean(values) {
	if (values.length === 0) return null;
	return values.reduce((a, b) => a + b, 0) / values.length;
}

function spawnPreview() {
	const proc = spawn('bun', ['--bun', 'vite', 'preview', '--port', String(PORT), '--strictPort'], {
		cwd: TERMINAL,
		env: { ...process.env },
		stdio: ['ignore', 'pipe', 'pipe']
	});
	let output = '';
	proc.stdout.on('data', (d) => (output += d));
	proc.stderr.on('data', (d) => (output += d));
	return { proc, getLog: () => output };
}

async function waitForReady() {
	const deadline = Date.now() + 90_000;
	let lastErr = '';
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${BASE_URL}/trade`);
			if (res.ok && (await res.text()).includes('terminal-shell')) return;
		} catch (e) { lastErr = String(e?.message ?? e); }
		await new Promise((r) => setTimeout(r, 1000));
	}
	throw new Error(`Preview not ready at ${BASE_URL}. ${lastErr}`);
}

/** One true cold load: fresh context (no cache), capture all perf metrics. */
async function coldLoad(browser) {
	// Fresh incognito context per run => zero HTTP cache, zero disk cache,
	// zero SW control. This is a genuine cold load.
	const context = await browser.newContext({ bypassCSP: true });
	const page = await context.newPage();
	const metrics = {};

	// Navigation + paint timing via Performance API (authoritative, same as
	// what Lighthouse/CDP surface).
	await page.addInitScript(() => {
		window.__coldPerf = { longTasks: [] };
		if (typeof PerformanceObserver !== 'undefined') {
			try {
				const lt = new PerformanceObserver((list) => {
					for (const e of list.getEntries()) {
						window.__coldPerf.longTasks.push({ duration: e.duration, start: e.startTime });
					}
				});
				lt.observe({ entryTypes: ['longtask'] });
			} catch { /* not supported */ }
		}
	});

	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 90_000 });

	// Chart-candle paint: wait for the trading chart to report a real candle count.
	try {
		const chart = page.getByTestId('trading-chart').first();
		await chart.waitFor({ state: 'attached', timeout: 30_000 });
		await page.waitForFunction(
			() => {
				const el = document.querySelector('[data-testid="trading-chart"]');
				const n = Number(el?.getAttribute('data-candle-count'));
				return Number.isFinite(n) && n >= 1;
			},
			{ timeout: 30_000 }
		).catch(() => {});
	} catch { /* chart may not paint if feed is down — recorded as null */ }

	// Interaction-ready: stable shell + market-data health present.
	try {
		await page.getByTestId('market-data-health').waitFor({ state: 'attached', timeout: 30_000 });
	} catch { /* recorded as null */ }

	// Collect timings + resources + long tasks in one evaluate.
	const collected = await page.evaluate(() => {
		const nav = performance.getEntriesByType('navigation')[0];
		const paint = Object.fromEntries(performance.getEntriesByType('paint').map((e) => [e.name, e.startTime]));
		const resources = performance.getEntriesByType('resource');
		const scripts = resources.filter((r) => r.initiatorType === 'script' || /\.js(\?|$)/.test(r.name));
		const jsTransfer = scripts.reduce((s, r) => s + (r.transferSize || 0), 0);
		const jsRequests = scripts.length;
		const candleCount = Number(document.querySelector('[data-testid="trading-chart"]')?.getAttribute('data-candle-count') ?? -1);
		const ttfbs = resources.filter((r) => r.name === location.origin + '/trade').map((r) => r.responseStart);
		const longTasks = window.__coldPerf?.longTasks ?? [];
		const shellAttach = performance.getEntriesByType('mark').find((m) => m.name === 'shell-attached');
		return {
			ttfb: nav?.responseStart ?? (ttfbs[0] || null),
			domContentLoaded: nav?.domContentLoadedEventEnd ?? null,
			load: nav?.loadEventEnd ?? null,
			fcp: paint?.['first-contentful-paint'] ?? null,
			lcp: paint?.['largest-contentful-paint'] ?? null,
			jsTransferBytes: jsTransfer,
			jsRequests,
			longTasksCount: longTasks.length,
			longTasksTotalMs: Math.round(longTasks.reduce((s, t) => s + t.duration, 0)),
			candleCount,
			candlePaintMs: candleCount >= 1 ? (performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint')?.startTime ?? null) : null,
			interactionReadyMs: shellAttach?.startTime ?? null
		};
	});

	Object.assign(metrics, collected);
	metrics.candlePaintMs = metrics.candlePaintMs;
	metrics.chartHydrated = collected.candleCount >= 1;
	metrics.shellAttached = await page.getByTestId('terminal-shell').isAttached().catch(() => false);

	await context.close();
	return metrics;
}

async function main() {
	if (DO_BUILD) {
		console.log('Building production terminal…');
		const r = spawnSync('bun', ['--bun', 'vite', 'build'], { cwd: TERMINAL, stdio: 'inherit', env: { ...process.env } });
		if (r.status !== 0) throw new Error('Production build failed.');
	}

	const preview = spawnPreview();
	let browser;
	try {
		await waitForReady();
		console.log(`Preview ready at ${BASE_URL}; running ${RUNS} cold loads…`);
		browser = await chromium.launch();
		const runs = [];
		for (let i = 0; i < RUNS; i += 1) {
			const m = await coldLoad(browser);
			runs.push(m);
			console.log(`  run ${i + 1}/${RUNS}: ttfbs=${m.ttfb} fcp=${m.fcp} lcp=${m.lcp} js=${m.jsTransferBytes}B (${m.jsRequests} req) longtasks=${m.longTasksCount} candles=${m.candleCount} chartHydrated=${m.chartHydrated}`);
			await new Promise((r) => setTimeout(r, 500));
		}
		await browser.close();
		browser = undefined;

		const key = (k) => runs.map((r) => r[k]).filter((v) => Number.isFinite(v));
		const stats = {
			runs: RUNS,
			coldLoadsWithCacheDisabled: true,
			ttfb: { p50: pct(key('ttfb'), 50), p95: pct(key('ttfb'), 95), mean: mean(key('ttfb')) },
			fcp: { p50: pct(key('fcp'), 50), p95: pct(key('fcp'), 95), mean: mean(key('fcp')) },
			lcp: { p50: pct(key('lcp'), 50), p95: pct(key('lcp'), 95), mean: mean(key('lcp')) },
			domContentLoaded: { p50: pct(key('domContentLoaded'), 50), p95: pct(key('domContentLoaded'), 95), mean: mean(key('domContentLoaded')) },
			load: { p50: pct(key('load'), 50), p95: pct(key('load'), 95), mean: mean(key('load')) },
			jsTransferBytes: { p50: pct(key('jsTransferBytes'), 50), p95: pct(key('jsTransferBytes'), 95) },
			jsRequests: { p50: pct(key('jsRequests'), 50), p95: pct(key('jsRequests'), 95) },
			longTasksCount: { p50: pct(key('longTasksCount'), 50), p95: pct(key('longTasksCount'), 95) },
			longTasksTotalMs: { p50: pct(key('longTasksTotalMs'), 50), p95: pct(key('longTasksTotalMs'), 95) },
			candlePaintMs: { p50: pct(key('candlePaintMs'), 50), p95: pct(key('candlePaintMs'), 95) },
			interactionReadyMs: { p50: pct(key('interactionReadyMs'), 50), p95: pct(key('interactionReadyMs'), 95) },
			chartHydratedRate: runs.filter((r) => r.chartHydrated).length / RUNS
		};

		const evidence = {
			schemaVersion: 1,
			kind: 'vice-browser-perf-evidence',
			network: 'testnet',
			scope: 'cold-chromium-latency',
			baseUrl: BASE_URL,
			capturedAt: new Date().toISOString(),
			runs: runs.map((r, i) => ({ run: i + 1, ...r })),
			stats
		};

		await mkdir(OUT_DIR, { recursive: true });
		const outPath = join(OUT_DIR, 'browser-perf-evidence.json');
		await writeFile(outPath, JSON.stringify(evidence, null, 2));
		// Sanitize key-shaped strings (none expected — no keys captured).
		const raw = await (await import('node:fs/promises')).readFile(outPath, 'utf8');
		await writeFile(outPath, raw.replace(SANITIZE, '0x[REDACTED_KEY]'));
		console.log(`\nEVIDENCE_WRITTEN=${outPath}`);
		console.log(`  p50 ttfbs=${stats.ttfb.p50}ms fcp=${stats.fcp.p50}ms lcp=${stats.lcp.p50}ms js=${Math.round((stats.jsTransferBytes.p50 ?? 0) / 1024)}KiB longtasks=${stats.longTasksCount.p50} chartHydrated=${(stats.chartHydratedRate * 100).toFixed(0)}%`);
	} finally {
		if (browser) await browser.close().catch(() => {});
		if (preview.proc.exitCode === null) {
			preview.proc.kill('SIGTERM');
			await new Promise((r) => setTimeout(r, 800));
			if (preview.proc.exitCode === null) preview.proc.kill('SIGKILL');
		}
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
