/**
 * hermes-sidecar — vault.test.js
 *
 * Unit gate for the device-local vault shim. Verifies the file-backed
 * localStorage behaves like the browser Storage the certified modules expect,
 * that records survive reload, and that the window.isSecureContext shim is
 * installed. Uses an isolated temp dir so tests never touch the real vault.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { mkdtempSync, readFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'vice-vault-test-'));
process.env.VICE_HERMES_DIR = dir;

const { installVaultShims, vaultLocation } = await import('./vault');

beforeAll(() => {
	installVaultShims();
});

describe('hermes-sidecar vault shim', () => {
	test('installs window.isSecureContext for the certified modules', () => {
		expect(typeof window).toBe('object');
		expect(window.isSecureContext).toBe(true);
	});

	test('localStorage set/get/remove round-trips', () => {
		localStorage.setItem('vice.hl.agent.v1:testnet:0xabc', '{"version":1}');
		expect(localStorage.getItem('vice.hl.agent.v1:testnet:0xabc')).toBe('{"version":1}');
		expect(localStorage.length).toBeGreaterThanOrEqual(1);
		localStorage.removeItem('vice.hl.agent.v1:testnet:0xabc');
		expect(localStorage.getItem('vice.hl.agent.v1:testnet:0xabc')).toBe(null);
	});

	test('records persist to the vault file with restrictive mode', async () => {
		localStorage.setItem('persist-check', 'hello-vault');
		const raw = readFileSync(vaultLocation(), 'utf8');
		expect(JSON.parse(raw)['persist-check']).toBe('hello-vault');
		// dir 0700 / file 0600 — the plan's device-local custody requirement.
		const mode = statSync(dir).mode & 0o777;
		expect(mode).toBe(0o700);
		const fileMode = statSync(vaultLocation()).mode & 0o777;
		expect(fileMode).toBe(0o600);
	});

	test('a fresh install reads the same persisted record back', async () => {
		// Simulate restart by reading the file the same way load() does.
		expect(existsSync(vaultLocation())).toBe(true);
		const raw = readFileSync(vaultLocation(), 'utf8');
		expect(JSON.parse(raw)['persist-check']).toBe('hello-vault');
	});

	test('clear empties the vault', () => {
		localStorage.setItem('a', '1');
		localStorage.clear();
		expect(localStorage.getItem('a')).toBe(null);
		expect(localStorage.length).toBe(0);
	});
});
