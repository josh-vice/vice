#!/usr/bin/env bun
/**
 * E2E gate runner — production hydrated Chromium suite.
 *
 * Orchestrates: production build (vite build) → `vite preview` on an isolated
 * port → Playwright non-mutating suite → teardown → artifact summary.
 *
 * The suite boots a real Chromium against the production build and exercises
 * the hydrated core app (Dockview, Chart/Book/Tape/Ticket, layout lock, CLI,
 * diagnostics, and mobile).
 *
 * Env:
 *   E2E_PORT            preview port (default 4173; avoid 8080 = Docker)
 *   E2E_SKIP_BUILD      1 to reuse an existing production build
 *   E2E_BASE_URL        override the base URL (default http://localhost:PORT)
 *   E2E_ARTIFACTS_DIR   artifact dir (default scripts/e2e/.artifacts)
 *   E2E_ONLY            playwright --grep filter for a focused run
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rm, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const TERMINAL = join(ROOT, 'vice-terminal');
const PORT = process.env.E2E_PORT ?? '4173';
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const ARTIFACTS = resolve(ROOT, process.env.E2E_ARTIFACTS_DIR ?? 'scripts/e2e/.artifacts');
const ONLY = process.env.E2E_ONLY;

function assertFundedInvocationGates() {
	if (!process.argv.includes('--funded')) return;
	const missing = [];
	if (process.env.VICE_E2E_MAINNET !== '1') missing.push('VICE_E2E_MAINNET=1');
	if ((process.env.VITE_HL_TRADING_NETWORK ?? '').trim().toLowerCase() !== 'mainnet') missing.push('VITE_HL_TRADING_NETWORK=mainnet');
	if (process.env.VICE_E2E_MAINNET_ACK !== 'I_ACCEPT_REAL_MAINNET_TRADING') missing.push('VICE_E2E_MAINNET_ACK=I_ACCEPT_REAL_MAINNET_TRADING');
	for (const key of ['VICE_E2E_ALLOWLIST', 'VICE_E2E_APPROVAL_SHA256', 'VICE_E2E_POLICY_SHA256']) if (!(process.env[key] ?? '').trim()) missing.push(`${key}=<configured>`);
	const cap = Number(process.env.VICE_E2E_NOTIONAL_CAP_USD);
	if (!Number.isFinite(cap) || cap <= 0) missing.push('VICE_E2E_NOTIONAL_CAP_USD>0');
	for (const key of ['VICE_E2E_OWNER_KEY', 'VICE_E2E_COUNTERPARTY_KEY']) {
		if (!process.env[key] || !existsSync(process.env[key])) missing.push(`${key}=<existing path>`);
	}
	if (missing.length > 0) throw new Error(`Funded mainnet E2E gate refused before build: missing ${missing.join(', ')}. Refusing to mutate a venue.`);
}

// ---------------------------------------------------------------------------
// Artifact sanitization: trace/video/screenshot/console/network can carry
// wallet addresses, order ids, or key-shaped strings. Strip anything that
// looks like a private key (0x + 64 hex) and long hex blobs beyond a bounded
// address-length keep. Public addresses stay (they are not secrets).
// ---------------------------------------------------------------------------
const PRIVATE_KEY_RE = /\b0x[a-fA-F0-9]{64}\b/g;
const LONG_HEX_RE = /\b0x[a-fA-F0-9]{24,}\b/g;
const ADDRESS_RE = /\b0x[a-fA-F0-9]{40}\b/g;

async function sanitizeFile(path) {
	try {
		const buf = await readFile(path);
		// Only touch text-ish artifacts (json/txt/trc). Skip binary video.
		const first = buf.subarray(0, 512).toString('utf8');
		if (/\x00/.test(first)) return false; // binary — leave as-is
		let text = buf.toString('utf8');
		text = text.replace(PRIVATE_KEY_RE, '0x[REDACTED_KEY]');
		text = text.replace(LONG_HEX_RE, (m) => (m.length === 42 ? m : '0x[REDACTED_HEX]'));
		await writeFile(path, text);
		return true;
	} catch {
		return false;
	}
}

async function walk(dir) {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...(await walk(full)));
		else out.push(full);
	}
	return out;
}

async function sanitizeArtifacts() {
	if (!existsSync(ARTIFACTS)) return;
	const files = await walk(ARTIFACTS);
	let scrubbed = 0;
	for (const f of files) {
		if (f.endsWith('.mp4') || f.endsWith('.webm')) continue;
		if (await sanitizeFile(f)) scrubbed++;
	}
	await writeFile(join(ARTIFACTS, 'SANITIZATION.md'), [
		'# E2E artifact sanitization',
		'',
		'Files under this directory were scrubbed by `scripts/e2e-gate.mjs` to remove',
		'key-shaped material (0x + 64 hex) and oversized hex blobs before the artifacts',
		'are retained. Binary video is excluded. Public addresses (40 hex) are kept.',
		'',
		`Files inspected: ${files.length}`,
		`Files text-sanitized: ${scrubbed}`
	].join('\n') + '\n');
	console.log(`Sanitized ${scrubbed} text artifact(s) under ${ARTIFACTS}`);
}

// ---------------------------------------------------------------------------
async function ensureProductionBuild() {
	if (process.env.E2E_SKIP_BUILD === '1') {
		console.log('E2E_SKIP_BUILD=1 — reusing existing production build.');
		return;
	}
	console.log('Building terminal (production)…');
	const result = spawnSync('bun', ['--bun', 'vite', 'build'], {
		cwd: TERMINAL,
		stdio: 'inherit',
		env: { ...process.env }
	});
	// NOTE: under bun, spawnSync().success is `undefined`, so rely on status.
	if (result.status !== 0) {
		throw new Error('Production build failed — aborting E2E gate.');
	}
	console.log('Production build complete.');
}

function spawnPreview() {
	const proc = spawn('bun', ['--bun', 'vite', 'preview', '--port', PORT, '--strictPort'], {
		cwd: TERMINAL,
		env: { ...process.env },
		stdio: ['ignore', 'pipe', 'pipe']
	});
	let output = '';
	proc.stdout.on('data', (d) => (output += d));
	proc.stderr.on('data', (d) => (output += d));
	proc.on('exit', (code) => {
		if (code && code !== 0) console.error(`[preview] exited ${code}\n${output}`);
	});
	return { proc, getLog: () => output };
}

async function waitForReady(proc) {
	const deadline = Date.now() + 90_000;
	let lastErr = '';
	while (Date.now() < deadline) {
		if (proc.proc.exitCode !== null) throw new Error(`Preview exited early:\n${proc.getLog()}`);
		try {
			const res = await fetch(`${BASE_URL}/trade`);
			if (res.ok) {
				const body = await res.text();
				if (body.includes('terminal-shell')) return;
			}
		} catch (e) {
			lastErr = String(e?.message ?? e);
		}
		await new Promise((r) => setTimeout(r, 1000));
	}
	throw new Error(`Preview did not become ready (${BASE_URL}). ${lastErr}\n${proc.getLog()}`);
}

async function runPlaywright() {
	await rm(ARTIFACTS, { recursive: true, force: true });
	await mkdir(ARTIFACTS, { recursive: true });

	const funded = process.argv.includes('--funded');
	const config = funded ? 'e2e/playwright.funded.config.js' : 'e2e/playwright.config.js';
	const args = ['playwright', 'test', '--config', config];
	if (ONLY) args.push('--grep', ONLY);
	const result = spawnSync('bunx', args, {
		cwd: TERMINAL,
		stdio: 'inherit',
		env: {
			...process.env,
			E2E_BASE_URL: BASE_URL,
			E2E_ARTIFACTS_DIR: ARTIFACTS
		}
	});
	return result.status ?? 1;
}

async function main() {
	assertFundedInvocationGates();
	await ensureProductionBuild();

	const preview = spawnPreview();
	let ok = false;
	try {
		await waitForReady(preview);
		console.log(`Preview ready at ${BASE_URL}`);
		ok = await runPlaywright() === 0;
	} finally {
		if (preview.proc.exitCode === null) {
			preview.proc.kill('SIGTERM');
			await new Promise((r) => setTimeout(r, 800));
			if (preview.proc.exitCode === null) preview.proc.kill('SIGKILL');
		}
		await sanitizeArtifacts();
	}

	if (!ok) {
		console.error('E2E gate FAILED — see artifact dir for traces.');
		process.exit(1);
	}
	console.log('E2E gate passed.');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
