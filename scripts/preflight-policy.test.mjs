import { describe, expect, test } from 'bun:test';

const source = await Bun.file(new URL('./preflight.mjs', import.meta.url)).text();
const viteConfig = await Bun.file(new URL('../vice-terminal/vite.config.ts', import.meta.url)).text();

describe('mainnet promotion policy wiring', () => {
	test('requires funded evidence, allowlist, and measured latency on mainnet', () => {
		expect(source).toContain("await readMainnetEvidence(process.env.VICE_MAINNET_EVIDENCE)");
		expect(source).toContain("process.env.VICE_MAINNET_ALLOWLIST?.trim()");
		expect(source).toContain("await runLatencyGate(process.env.VICE_LATENCY_EVIDENCE)");
		expect(source).toContain("latency.network !== 'mainnet'");
		expect(source).toContain('!latency.pass');
	});

	test('fails closed when the trading network is not explicitly configured', () => {
		expect(source).toContain("const configuredTradingNetwork = process.env.VITE_HL_TRADING_NETWORK?.trim().toLowerCase();");
		expect(source).toContain("if (releaseCheck && !configuredTradingNetwork) throw new Error('Mainnet release requires VITE_HL_TRADING_NETWORK=mainnet')");
	});

	test('locks production builds to explicit mainnet configuration', () => {
		expect(viteConfig).toContain('mainnetBuildGuard');
		expect(viteConfig).toContain('VITE_HL_TRADING_NETWORK');
		expect(viteConfig).toContain('VITE_HL_MAINNET_ACK');
	});

	test('does not require builder revenue configuration when revenue is disabled', () => {
		expect(source).toContain("const builderRevenueEnabled = process.env.VITE_HL_ENABLE_BUILDER_REVENUE === 'true'");
		expect(source).toContain('network === \'mainnet\' && builderRevenueEnabled');
	});

	test('wires PLAN_3 fail-closed mainnet guardrails into the mainnet branch', () => {
		expect(source).toContain("import { assertMainnetPromotable, runtimeFromEnv } from './mainnet-guardrails.mjs'");
		expect(source).toContain('await assertMainnetPromotable(runtimeFromEnv(process.env))');
	});

	test('wires the dependency audit gate into preflight (test:security)', () => {
		expect(source).toContain("import { runDependencyAudit } from './dependency-audit.mjs'");
		expect(source).toContain("await runDependencyAudit({");
		expect(source).toContain('Dependency integrity gate failed');
		expect(source).toContain('VICE_AUDIT_EXCEPTIONS');
	});
	test('requires durable beta access configuration for mainnet', () => {
		expect(source).toContain("process.env.VICE_BETA_REQUIRED?.trim().toLowerCase() !== 'true'");
		expect(source).toContain('UPSTASH_REDIS_REST_URL');
		expect(source).toContain('VICE_BETA_SESSION_SECRET');
	});
});
