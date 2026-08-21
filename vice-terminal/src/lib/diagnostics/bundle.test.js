import { describe, expect, test } from 'bun:test';
import {
	buildSupportBundle,
	trimAndSanitize,
	stringifyBundle,
	parseBundle,
	FALLBACK_BUILD_META
} from './bundle';
import { resetDiagnosticsRecorders, recordHealthTransition, recordAppError, recordRequestFailure } from './recorder';
import { SUPPORT_BUNDLE_SCHEMA, SUPPORT_BUNDLE_KIND, MAX_BUNDLE_BYTES } from './schema';

// The bundle module imports `$lib/*` stores which use import.meta.env. Under
// bun these resolve at runtime; the stores initialize to their defaults. These
// tests exercise the assembler contract — schema, kind, bounded size, redaction
// at the boundary, and absence of secrets — without needing a browser.

describe('support bundle contract', () => {
	test('has deterministic schema and kind', () => {
		resetDiagnosticsRecorders();
		const bundle = buildSupportBundle(FALLBACK_BUILD_META);
		expect(bundle.schema).toBe(SUPPORT_BUNDLE_SCHEMA);
		expect(bundle.kind).toBe(SUPPORT_BUNDLE_KIND);
	});

	test('embeds app/build identity without any network call', () => {
		resetDiagnosticsRecorders();
		const bundle = buildSupportBundle({ version: '9.9.9', sha: 'abc123', ref: 'viceterminal' });
		expect(bundle.app.name).toBe('Vice Terminal');
		expect(bundle.app.version).toBe('9.9.9');
		expect(bundle.app.sha).toBe('abc123');
		expect(bundle.app.ref).toBe('viceterminal');
		expect(typeof bundle.app.network).toBe('string');
		expect(typeof bundle.app.testnet).toBe('boolean');
		expect(typeof bundle.generatedAt).toBe('string');
	});

	test('round-trips through stringify/parse with identical schema', () => {
		resetDiagnosticsRecorders();
		const bundle = buildSupportBundle(FALLBACK_BUILD_META);
		const text = stringifyBundle(bundle);
		const parsed = parseBundle(text);
		expect(parsed.schema).toBe(bundle.schema);
		expect(parsed.kind).toBe(bundle.kind);
	});

	test('serialized bundle stays under the byte budget', () => {
		resetDiagnosticsRecorders();
		// Saturate the recorders near their caps, then assemble.
		for (let i = 0; i < 300; i++) recordHealthTransition('accountSync', `a${i}`, `b${i}`);
		for (let i = 0; i < 200; i++) recordAppError({ type: 'error', message: `error ${i} with some detail text` });
		for (let i = 0; i < 200; i++)
			recordRequestFailure({ category: 'http-error', method: 'GET', url: `https://api.example.com/m/${i}?k=v` });

		const bundle = buildSupportBundle(FALLBACK_BUILD_META);
		const text = stringifyBundle(bundle);
		expect(text.length).toBeLessThanOrEqual(MAX_BUNDLE_BYTES);
	});

	test('records carried by the bundle are bounded', () => {
		resetDiagnosticsRecorders();
		for (let i = 0; i < 1000; i++) recordHealthTransition('wallet', `x${i}`, `y${i}`);
		const bundle = buildSupportBundle(FALLBACK_BUILD_META);
		expect(bundle.health.transitions.length).toBeLessThanOrEqual(200);
	});

	test('bundle is human-readable JSON (pretty-printed, parseable)', () => {
		resetDiagnosticsRecorders();
		const bundle = buildSupportBundle(FALLBACK_BUILD_META);
		const text = stringifyBundle(bundle);
		expect(text.startsWith('{\n')).toBe(true); // pretty-printed
		expect(() => JSON.parse(text)).not.toThrow();
	});
});

describe('bundle redaction at the boundary', () => {
	test('health transitions never carry secret-shaped values', () => {
		resetDiagnosticsRecorders();
		// Even if a transition label were maliciously a key/address, redactDeep
		// runs across the whole bundle, so it must be removed.
		recordHealthTransition('accountSync', 'idle', 'live');
		const bundle = buildSupportBundle(FALLBACK_BUILD_META);
		const text = stringifyBundle(bundle);
		expect(text).not.toContain('0x');
	});

	test('app errors with embedded addresses/signatures are redacted', () => {
		resetDiagnosticsRecorders();
		recordAppError({
			type: 'error',
			message: `order failed for 0x${'a'.repeat(40)} signed 0x${'b'.repeat(130)}`
		});
		const bundle = buildSupportBundle(FALLBACK_BUILD_META);
		const text = stringifyBundle(bundle);
		expect(text).not.toContain('0x');
		expect(text).not.toContain('aaaa');
		expect(text).not.toContain('bbbb');
		expect(text).toContain('order failed');
	});

	test('no wallet/agent address is exported anywhere', () => {
		resetDiagnosticsRecorders();
		const bundle = buildSupportBundle(FALLBACK_BUILD_META);
		const text = stringifyBundle(bundle);
		// 40-hex address shape (0x + 40 hex) must never survive.
		expect(text).not.toMatch(/0x[a-fA-F0-9]{40}/);
	});
});

describe('trimAndSanitize', () => {
	test('caps string lengths on environment/user fields', () => {
		const bundle = {
			schema: SUPPORT_BUNDLE_SCHEMA,
			kind: SUPPORT_BUNDLE_KIND,
			generatedAt: '2026-01-01T00:00:00.000Z',
			app: { name: 'Vice Terminal', version: '1', network: 'testnet', testnet: true },
			environment: { userAgent: 'x'.repeat(2000) },
			featureFlags: {
				marketType: 'perp',
				workspacePreset: 'default',
				workspaceLocked: true,
				demoFixturesEnabled: false,
				privacyMode: false,
				tradingKillSwitchActive: false
			},
			health: { current: {}, transitions: [] },
			requestFailures: [],
			appErrors: [{ at: 1, type: 'error', message: 'ok' }],
			commands: { network: 'testnet', entries: [] }
		};
		const out = trimAndSanitize(bundle);
		expect(out.environment.userAgent.length).toBeLessThan(2000);
		expect(out.environment.userAgent.endsWith('…[truncated]')).toBe(true);
	});
});
