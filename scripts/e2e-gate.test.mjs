import { describe, expect, test } from 'bun:test';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const E2E = resolve(ROOT, 'vice-terminal/e2e');
const read = (p) => readFile(p, 'utf8');

async function listSpecs(dir) {
	const out = [];
	async function walk(d) {
		const entries = await readdir(d, { withFileTypes: true });
		for (const e of entries) {
			const full = join(d, e.name);
			if (e.isDirectory()) await walk(full);
			else if (e.name.endsWith('.spec.js')) out.push(full);
		}
	}
	await walk(dir);
	return out;
}

describe('E2E suite structure (static gate — no browser)', () => {
	test('playwright config targets production preview, not vite dev', async () => {
		const cfg = await read(`${E2E}/playwright.config.js`);
		// The config runs against the production preview via E2E_BASE_URL; the
		// runner (e2e-gate.mjs) is the one that starts `vite preview`.
		expect(cfg).toContain('E2E_BASE_URL');
		expect(cfg).not.toContain('vite dev');
		expect(cfg).toContain('chromium');
		// Funded specs are excluded from the normal run.
		expect(cfg).toContain('testIgnore');
		expect(cfg).toContain('funded');
		// Artifacts are retained on failure.
		expect(cfg).toContain('trace: \'retain-on-failure\'');
		expect(cfg).toContain('video: \'retain-on-failure\'');
		expect(cfg).toContain('screenshot: \'only-on-failure\'');
	});

	test('non-mutating suite covers the required surfaces', async () => {
		const specs = await listSpecs(`${E2E}/specs`);
		const names = specs.map((s) => s.split('/').pop());
		for (const required of [
			'cold-load.spec.js',
			'workspace-layout.spec.js',
			'panels-status.spec.js',
			'wallet-disconnected.spec.js',
			'mobile.spec.js',
			'quality.spec.js',
			'diagnostics.spec.js'
		]) {
			expect(names).toContain(required);
		}
		// Every spec is a .js test (repo convention: no TS annotations).
		for (const s of specs) {
			const src = await read(s);
			expect(src).not.toMatch(/:(?:string|number|boolean|void)\b/); // no TS type annotations
		}
	});

	test('non-mutating specs never place/modify/cancel an order or touch a signer', async () => {
		const specs = await listSpecs(`${E2E}/specs`);
		const forbidden = [
			'placeOrder(',
			'cancelAll(',
			'flattenAll(',
			'positionClose(',
			'positionReverse(',
			'cancelOrder(',
			'modifyOrder(',
			'signMessage(',
			'walletClient',
			'privateKey',
			'owner.json'
		];
		for (const s of specs) {
			const src = await read(s);
			for (const token of forbidden) {
				expect(src).not.toContain(token);
			}
		}
	});

	test('funded lifecycle specs are gated and excluded from the normal suite', async () => {
		const funded = await listSpecs(`${E2E}/funded`);
		expect(funded.length).toBeGreaterThan(0);
		const src = await read(funded[0]);
		// Explicit env gate refuses to mutate without all mainnet gates.
		expect(src).toContain('VICE_E2E_MAINNET');
		expect(src).toContain('VITE_HL_TRADING_NETWORK');
		expect(src).toContain('VICE_E2E_ALLOWLIST');
		expect(src).toContain('VICE_E2E_NOTIONAL_CAP_USD');
		expect(src).toContain('VICE_E2E_OWNER_KEY');
		expect(src).toContain('VICE_E2E_COUNTERPARTY_KEY');
		expect(src).toContain('flatten');
		expect(src).toContain('cancel');
		// Funded dir must be excluded by the normal config.
		const cfg = await read(`${E2E}/playwright.config.js`);
		expect(cfg).toContain('funded');
	});

	test('funded gate refuses to run when gates are absent (no silent mutation)', async () => {
		// The spec remains defense-in-depth, while the runner must reject the
		// invocation before build. Skipped Playwright tests must never produce a
		// misleading successful funded-gate exit.
		const src = await read((await listSpecs(`${E2E}/funded`))[0]);
		expect(src).toContain('missing');
		expect(src).toContain('Funded mainnet gate refused');
		const runner = await read(resolve(ROOT, 'scripts/e2e-gate.mjs'));
		expect(runner).toContain('assertFundedInvocationGates');
		expect(runner).toContain('Funded mainnet E2E gate refused before build');
		expect(runner.indexOf('assertFundedInvocationGates();')).toBeLessThan(runner.indexOf('await ensureProductionBuild();'));
	});

	test('gate runner retains and sanitizes failure artifacts', async () => {
		const runner = await read(resolve(ROOT, 'scripts/e2e-gate.mjs'));
		expect(runner).toContain('ARTIFACTS');
		expect(runner).toContain('sanitizeArtifacts');
		expect(runner).toContain('PRIVATE_KEY_RE');
		expect(runner).toMatch(/vite.{0,10}preview/);
		expect(runner).toContain('E2E_ONLY');
	});

});
