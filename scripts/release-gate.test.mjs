import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./release-gate.mjs', import.meta.url)), 'utf8');

describe('release gate environment', () => {
	test('propagates the explicit mainnet beta contract to every child command', () => {
		expect(source).toContain("VICE_RELEASE_CHECK: 'true'");
		expect(source).toContain("VICE_RELEASE_PROFILE: releaseProfile");
		expect(source).toContain("VICE_BETA_REQUIRED: 'true'");
		expect(source).toContain("VITE_HL_TRADING_NETWORK: 'mainnet'");
		expect(source).toContain("VITE_HL_MAINNET_ACK: 'I_ACCEPT_REAL_MAINNET_TRADING'");
	});
});
