#!/usr/bin/env node
/**
 * Capture schema-v2 client telemetry from real Chromium cold loads.
 *
 * This script never invents samples: it clicks the browser's own latency
 * evidence export and merges only observed feed/frame and dispatch samples.
 * Each run uses a fresh context with service workers blocked and HTTP cache
 * disabled through CDP. It is read-only and never connects a wallet.
 *
 * Usage: node scripts/capture-client-latency.mjs --runs=12 --build
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TERMINAL = join(ROOT, 'vice-terminal');
const RUNS = Number(process.argv.find((arg) => arg.startsWith('--runs='))?.split('=')[1] ?? 12);
const PORT = Number(process.argv.find((arg) => arg.startsWith('--port='))?.split('=')[1] ?? 4185);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const NETWORK = (process.env.VITE_HL_PUBLIC_NETWORK ?? process.env.VITE_HL_NETWORK ?? 'mainnet').toLowerCase();
const OUTPUT = resolve(ROOT, process.env.VICE_LATENCY_OUTPUT ?? 'scripts/e2e/perf-evidence/client-latency.json');
const KEY_RE = /\b0x[a-fA-F0-9]{64}\b/g;

function spawnPreview() {
	const proc = spawn('bun', ['--bun', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
		cwd: TERMINAL,
		env: { ...process.env },
		stdio: ['ignore', 'pipe', 'pipe']
	});
	let log = '';
	proc.stdout.on('data', (chunk) => { log += chunk; });
	proc.stderr.on('data', (chunk) => { log += chunk; });
	return { proc, log: () => log };
}

async function waitForReady(preview) {
	const deadline = Date.now() + 90_000;
	while (Date.now() < deadline) {
		if (preview.proc.exitCode !== null) throw new Error(`Preview exited early:\n${preview.log()}`);
		try {
			const response = await fetch(`${BASE_URL}/trade`);
			if (response.ok && (await response.text()).includes('terminal-shell')) return;
		} catch {
			// Preview is still starting.
		}
		await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
	}
	throw new Error(`Preview did not become ready at ${BASE_URL}`);
}

function aggregateHealth(healthValues) {
	const sumFields = ['longTaskCount', 'longAnimationFrameCount', 'eventDelayCount', 'inferredDroppedFrameCount', 'reconnectCount'];
	const maxFields = ['longTaskMaxMs', 'longAnimationFrameMaxMs', 'eventDelayMaxMs', 'maxFrameIntervalMs', 'maxStoreQueueDepth', 'maxFrameReadyQueueDepth'];
	const runtimeHealth = {};
	for (const field of sumFields) runtimeHealth[field] = healthValues.reduce((total, health) => total + health[field], 0);
	for (const field of maxFields) runtimeHealth[field] = Math.max(0, ...healthValues.map((health) => health[field]));
	return runtimeHealth;
}

async function captureRun(browser, runNumber) {
	const context = await browser.newContext({ baseURL: BASE_URL, serviceWorkers: 'block' });
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	await cdp.send('Network.enable');
	await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 90_000 });
	await page.getByTestId('terminal-shell').waitFor({ state: 'attached', timeout: 30_000 });
	await page.getByTestId('market-data-health').waitFor({ state: 'attached', timeout: 30_000 });
	await page.waitForTimeout(2_000);

	const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
	await page.getByRole('button', { name: 'Download measured client latency evidence' }).click();
	const download = await downloadPromise;
	const evidencePath = await download.path();
	if (!evidencePath) throw new Error(`Run ${runNumber} did not produce a readable latency artifact`);
	const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
	await context.close();
	return evidence;
}

async function main() {
	if (!Number.isSafeInteger(RUNS) || RUNS < 1) throw new Error('--runs must be a positive integer');
	if (NETWORK !== 'mainnet' && NETWORK !== 'testnet') throw new Error(`Unsupported capture network: ${NETWORK}`);
	const releaseSha = process.env.VICE_RELEASE_SHA?.trim() ?? '';
	if (NETWORK === 'mainnet' && !/^[a-f0-9]{40}$/i.test(releaseSha)) throw new Error('VICE_RELEASE_SHA must be a full commit SHA for mainnet latency capture');
	if (process.argv.includes('--build')) {
		const result = spawnSync('bun', ['--bun', 'vite', 'build'], { cwd: TERMINAL, stdio: 'inherit', env: { ...process.env } });
		if (result.status !== 0) throw new Error('Production build failed');
	}
	const preview = spawnPreview();
	let browser;
	try {
		await waitForReady(preview);
		browser = await chromium.launch();
		const evidenceRuns = [];
		for (let run = 1; run <= RUNS; run += 1) {
			const evidence = await captureRun(browser, run);
			if (evidence.schemaVersion !== 2 || evidence.source !== 'client-telemetry') throw new Error(`Run ${run} returned non-v2 client telemetry`);
			evidenceRuns.push(evidence);
			console.log(`run ${run}/${RUNS}: feedSamples=${evidence.samples.length} dispatchSamples=${evidence.dispatchSamples.length}`);
		}
		const output = {
			schemaVersion: 2,
			source: 'client-telemetry',
			network: NETWORK,
			commit: releaseSha || null,
			releaseBuild: releaseSha || null,
			policySha256: process.env.VICE_E2E_POLICY_SHA256 ?? null,
			capturedAt: new Date().toISOString(),
			runtimeHealth: aggregateHealth(evidenceRuns.map((evidence) => evidence.runtimeHealth)),
			samples: evidenceRuns.flatMap((evidence) => evidence.samples),
			dispatchSamples: evidenceRuns.flatMap((evidence) => evidence.dispatchSamples)
		};
		await mkdir(resolve(OUTPUT, '..'), { recursive: true });
		await writeFile(OUTPUT, `${JSON.stringify(output, null, 2).replace(KEY_RE, '0x[REDACTED_KEY]')}\n`);
		console.log(`EVIDENCE_WRITTEN=${OUTPUT}`);
		console.log(`feedSamples=${output.samples.length} dispatchSamples=${output.dispatchSamples.length}`);
	} finally {
		await browser?.close().catch(() => {});
		if (preview.proc.exitCode === null) {
			preview.proc.kill('SIGTERM');
			await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
			if (preview.proc.exitCode === null) preview.proc.kill('SIGKILL');
		}
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
