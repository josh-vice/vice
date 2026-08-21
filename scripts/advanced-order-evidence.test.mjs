import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { findNestedFailures, recomputeSummary, validateAdvancedOrderEvidence } from './advanced-order-evidence.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

const cleanManifest = () => ({
	schemaVersion: 1,
	network: 'testnet',
	transport: 'hermes-sidecar /api/algo + /api/execute',
	pilot: { allowlisted: true, lowNotional: true, deadmanDisabled: 'venue entitlement' },
	executionModes: { market: ['twap'], limit: ['twap'] },
	capturedAt: new Date().toISOString(),
	address: '0x0000000000000000000000000000000000000000',
	phases: [
		{
			phase: 'twap',
			ok: true,
			events: [
				{ action: 'sidecar-start', ok: true, port: 19471 },
				{ action: 'start', ok: true, detail: { ok: true, jobId: 'job-1', orderType: 'twap', market: { marketKey: 'perp:BTC', apiCoin: 'BTC' } } },
				{ action: 'children-visible', ok: true, openOrders: 1, jobs: 1 },
				{ action: 'taker-fill', ok: true, fillsBefore: 45, fillsAfter: 46 },
				{ action: 'cancel', ok: true, detail: { ok: true } },
				{ action: 'clean', ok: true, openOrders: 0, positions: 0 }
			],
			venueOrderIds: ['123'],
			fillsObserved: 1,
			durationMs: 10_000
		}
	],
	summary: { passed: ['twap'], failed: [], passedCount: 1, failedCount: 0, totalFillsObserved: 1 },
	venueOrderIds: ['123'],
	uncertainOutcomes: 0,
	duplicateOrders: 0
});

describe('advanced-order evidence integrity', () => {
	test('the 2026-08-06 artifact is rejected (nested ok:false lifecycle outcomes)', () => {
		const artifact = JSON.parse(readFileSync(`${ROOT}docs/evidence/advanced-order-certification-2026-08-06.json`, 'utf8'));
		expect(artifact.artifactProvenance).toMatchObject({
			status: 'reconstructed-negative-fixture',
			originalBytesRecovered: false,
			releaseEvidence: false
		});
		expect(() => validateAdvancedOrderEvidence(artifact)).toThrow();
	});

	test('a clean manifest validates', () => {
		expect(() => validateAdvancedOrderEvidence(cleanManifest())).not.toThrow();
	});

	test('phase-level ok:true cannot mask a nested ok:false event', () => {
		const manifest = cleanManifest();
		manifest.phases[0].events.push({ action: 'pause', ok: false, detail: { ok: false, error: 'Unregistered market identity' } });
		// Phase still claims ok:true and the summary still claims 1 passed —
		// the validator must refuse it.
		expect(() => validateAdvancedOrderEvidence(manifest)).toThrow(/failed lifecycle outcomes/);
	});

	test('recomputed summary catches a dishonest top-level passedCount', () => {
		const manifest = cleanManifest();
		manifest.phases[0].ok = false;
		manifest.phases[0].events.push({ action: 'cancel', ok: false, detail: { ok: false, error: 'rejected' } });
		// Leave the recorded summary claiming 1/1 passed — the lie the 2026-08-06
		// artifact committed.
		expect(() => validateAdvancedOrderEvidence(manifest)).toThrow(/summary is dishonest|failed lifecycle outcomes/);
	});

	test('findNestedFailures walks events and detail subtrees', () => {
		const failures = findNestedFailures({
			ok: true,
			events: [{ action: 'pause', ok: false, detail: { ok: false, error: 'Unregistered market identity' } }]
		});
		expect(failures.length).toBeGreaterThanOrEqual(3);
		expect(failures.map((f) => f.path)).toContain('$.events[0].detail');
	});

	test('nested non-boolean ok falsies (0, "false", "0") are failure markers', () => {
		for (const bad of [0, 'false', '0']) {
			const manifest = cleanManifest();
			manifest.phases[0].events[1].ok = bad;
			expect(() => validateAdvancedOrderEvidence(manifest)).toThrow(/failed lifecycle outcomes/);
		}
	});

	test('nested error as non-empty object is a failure marker', () => {
		const manifest = cleanManifest();
		manifest.phases[0].events[1].error = { message: 'rejected by venue' };
		expect(() => validateAdvancedOrderEvidence(manifest)).toThrow(/failed lifecycle outcomes/);
	});

	test('empty-string venue order IDs are rejected', () => {
		const manifest = cleanManifest();
		manifest.venueOrderIds = [''];
		manifest.phases[0].venueOrderIds = [''];
		expect(() => validateAdvancedOrderEvidence(manifest)).toThrow(/non-empty venue order IDs/);
	});

	test('legitimate nodes without ok/error fields still validate', () => {
		const manifest = cleanManifest();
		manifest.phases[0].events[2] = { action: 'cancel', detail: { ack: { accepted: true, uncertain: false } } };
		expect(() => validateAdvancedOrderEvidence(manifest)).not.toThrow();
	});

	test('recomputeSummary ignores top-level booleans and counts', () => {
		const recomputed = recomputeSummary([
			{ phase: 'ok-phase', ok: true, events: [] },
			{ phase: 'nested-fail', ok: true, events: [{ action: 'cancel', ok: false }] },
			{ phase: 'explicit-fail', ok: false, events: [] }
		]);
		expect(recomputed.passed).toEqual(['ok-phase']);
		expect(recomputed.failed).toEqual(['nested-fail', 'explicit-fail']);
		expect(recomputed.passedCount).toBe(1);
		expect(recomputed.failedCount).toBe(2);
	});
});

describe('promo signer isolation', () => {
	const viteConfig = readFileSync(`${ROOT}vice-terminal/vite.config.ts`, 'utf8');
	const promoConfig = readFileSync(`${ROOT}vice-terminal/vite.config.promo.ts`, 'utf8');
	const rootPkg = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8'));

	test('the normal vite config never proxies a signing shim', () => {
		expect(viteConfig).not.toContain('/shim');
		expect(viteConfig).not.toContain('18990');
		expect(viteConfig).not.toContain('promo-sign-shim');
		expect(viteConfig).not.toContain('proxy: {');
	});

	test('the promo config isolates the shim proxy behind an explicit --config', () => {
		expect(promoConfig).toContain('/shim');
		expect(promoConfig).toContain('18990');
		expect(promoConfig).toContain('TEST-ONLY');
	});

	test('package.json dev/build/preview scripts never reference the promo config or CERTIFIED flags', () => {
		for (const [name, cmd] of Object.entries(rootPkg.scripts)) {
			if (name.startsWith('dev') || name.startsWith('preview') || name === 'build' || name === 'build:terminal') {
				expect(`${name}: ${cmd}`).not.toContain('vite.config.promo');
				expect(`${name}: ${cmd}`).not.toContain('CERTIFIED');
			}
		}
	});

	test('advanced order families default to disabled', () => {
		const capabilities = readFileSync(`${ROOT}vice-terminal/src/lib/execution/capabilities.ts`, 'utf8');
		expect(capabilities).toMatch(/flag === 'true' && typeFlag === 'true'/);
	});
});
