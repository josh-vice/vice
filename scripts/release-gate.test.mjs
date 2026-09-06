import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./release-gate.mjs', import.meta.url)), 'utf8');
const readiness = readFileSync(fileURLToPath(new URL('./beta-readiness.mjs', import.meta.url)), 'utf8');
const productionMonitor = readFileSync(fileURLToPath(new URL('./monitor-production.mjs', import.meta.url)), 'utf8');
const deployedSmoke = readFileSync(fileURLToPath(new URL('./deployed-smoke.mjs', import.meta.url)), 'utf8');
const productionWorkflow = readFileSync(fileURLToPath(new URL('../.github/workflows/production-monitor.yml', import.meta.url)), 'utf8');
const releasePolicyRoute = readFileSync(fileURLToPath(new URL('../vice-terminal/src/routes/api/release-policy/+server.ts', import.meta.url)), 'utf8');

describe('release gate environment', () => {
	test('propagates the explicit mainnet beta contract to every child command', () => {
		expect(source).toContain("VICE_RELEASE_CHECK: 'true'");
		expect(source).toContain("VICE_RELEASE_PROFILE: releaseProfile");
		expect(source).toContain("VICE_BETA_REQUIRED: 'true'");
		expect(source).toContain("VITE_HL_TRADING_NETWORK: 'mainnet'");
		expect(source).toContain("VITE_HL_MAINNET_ACK: 'I_ACCEPT_REAL_MAINNET_TRADING'");
		expect(source).toContain("['test:production-auth']");
	});

	test('readiness requires durable closed-beta configuration and healthy deployment state', () => {
		expect(readiness).toContain("VICE_BETA_REQUIRED=true is required for a closed beta");
		expect(readiness).toContain('UPSTASH_REDIS_REST_URL');
		expect(readiness).toContain('VICE_DEPLOYMENT_URL');
		expect(readiness).toContain("new URL('/api/health', url)");
		expect(readiness).toContain('deployment health checks failed');
	});

	test('production probes bind health to an explicit immutable release SHA', () => {
		expect(productionMonitor).toContain('VICE_RELEASE_SHA is required for immutable production monitoring');
		expect(productionMonitor).toContain('meta.body?.commit !== expectedSha');
		expect(deployedSmoke).toContain("new URL('/api/health', url)");
		expect(productionWorkflow).toContain('VICE_RELEASE_SHA: ${{ secrets.VICE_RELEASE_SHA }}');
		expect(productionWorkflow).toContain('.commit == $sha');
	});

	test('the server rejects a policy that is not bound to the running release', () => {
		expect(releasePolicyRoute).toContain('VICE_MAINNET_RELEASE_BUILD');
		expect(releasePolicyRoute).toContain('release policy is not bound to the running release');
		expect(releasePolicyRoute).toContain('assertPolicyBoundToRuntime(validatePolicy');
	});

	test('aggregate gate output cannot overwrite the manifest-bound build summary', () => {
		expect(source).toContain("release/release-gate-summary.json");
		expect(source).not.toContain("resolve(root, 'release/test-summary.json')");
	});
});
