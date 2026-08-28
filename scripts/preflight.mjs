#!/usr/bin/env bun
import { resolve } from 'node:path';
import { readMainnetEvidence } from './mainnet-evidence.mjs';
import { runLatencyGate } from './latency-gate.mjs';
import { validateGatewayExposure } from './gateway-policy.mjs';
import { assertMainnetPromotable, runtimeFromEnv } from './mainnet-guardrails.mjs';
import { runDependencyAudit } from './dependency-audit.mjs';

const root = resolve(import.meta.dir, '..');
const forbidden = ['HL_PRIVATE_KEY', 'HL_WALLET_ADDRESS'];
const glob = new Bun.Glob('**/*.{ts,svelte,rs}');
const violations = [];

for (const base of ['vice-terminal/src', 'vice-backend']) {
	for await (const relative of glob.scan({ cwd: resolve(root, base) })) {
		const path = resolve(root, base, relative);
		const source = await Bun.file(path).text();
		for (const token of forbidden) if (source.includes(token)) violations.push(`${base}/${relative}: ${token}`);
	}
}

const backendForbidden = [
	['/api/hl/order', 'Rust execution must not call a SvelteKit order endpoint'],
	['sidecar_url', 'Rust execution must not depend on a sidecar URL'],
	["split('-')", 'market routing must use the exact API coin, never display-symbol inference'],
	['symbol: String', 'backend contracts must not use display symbols as market identity'],
	['symbol: &str', 'backend adapter routing must use the exact API coin'],
];
for await (const relative of glob.scan({ cwd: resolve(root, 'vice-backend') })) {
	const path = resolve(root, 'vice-backend', relative);
	const source = await Bun.file(path).text();
	for (const [token, reason] of backendForbidden) if (source.includes(token)) violations.push(`vice-backend/${relative}: ${reason}`);
}

if (violations.length) throw new Error(`Server-signing secret references are forbidden:\n${violations.join('\n')}`);
const network = (process.env.VITE_HL_TRADING_NETWORK ?? (process.env.VITE_HL_NETWORK === 'mainnet' ? 'mainnet' : 'testnet')).toLowerCase();
const gatewayHost = (process.env.VICE_GATEWAY_BIND ?? `${process.env.VICE_BACKEND_HOST ?? '127.0.0.1'}:8080`).replace(/^\[/, '').split(']')[0].split(':')[0];
validateGatewayExposure({
	host: gatewayHost,
	allowPublic: process.env.VICE_ALLOW_PUBLIC_GATEWAY === 'true',
	origin: process.env.VICE_GATEWAY_ORIGIN ?? ''
});
if (!['testnet', 'mainnet'].includes(network)) throw new Error(`Invalid VITE_HL_TRADING_NETWORK=${network}`);
if (network === 'mainnet' && process.env.VITE_HL_MAINNET_ACK !== 'I_ACCEPT_REAL_MAINNET_TRADING') {
	throw new Error('Mainnet release is locked: missing VITE_HL_MAINNET_ACK=I_ACCEPT_REAL_MAINNET_TRADING');
}
const builderRevenueEnabled = process.env.VITE_HL_ENABLE_BUILDER_REVENUE === 'true';
if (network === 'mainnet' && builderRevenueEnabled && !/^0x[0-9a-fA-F]{40}$/.test(process.env.VITE_HL_BUILDER_ADDRESS ?? '')) {
	throw new Error('Mainnet release requires a valid VITE_HL_BUILDER_ADDRESS');
}
if (network === 'mainnet') {
	if (process.env.VICE_BETA_REQUIRED?.trim().toLowerCase() !== 'true') throw new Error('Mainnet release requires VICE_BETA_REQUIRED=true');
	for (const key of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'VICE_BETA_SESSION_SECRET']) if (!process.env[key]?.trim()) throw new Error(`Mainnet release requires ${key}`);
	const evidence = await readMainnetEvidence(process.env.VICE_MAINNET_EVIDENCE);
	const releaseBuild = process.env.VICE_MAINNET_RELEASE_BUILD?.trim() ?? '';
	if (!/^[a-f0-9]{40}$/i.test(releaseBuild)) throw new Error('Mainnet release requires VICE_MAINNET_RELEASE_BUILD as a full commit SHA');
	if (evidence.commit.toLowerCase() !== releaseBuild.toLowerCase() || evidence.artifact.commit.toLowerCase() !== releaseBuild.toLowerCase()) throw new Error('Mainnet evidence does not match VICE_MAINNET_RELEASE_BUILD');
	let releaseManifest;
	try { releaseManifest = JSON.parse(await Bun.file(resolve(root, process.env.VICE_RELEASE_MANIFEST ?? 'release/vice-manifest.json')).text()); } catch { throw new Error('Mainnet release manifest is required and must be valid JSON'); }
	if (evidence.artifact.sha256 !== releaseManifest.artifact?.sha256 || evidence.lockfileSha256 !== releaseManifest.lockfile?.sha256 || evidence.policySha256 !== releaseManifest.policy?.sha256) throw new Error('Mainnet evidence digests do not match the release manifest');
	if (!process.env.VICE_MAINNET_ALLOWLIST?.trim()) throw new Error('Mainnet release requires VICE_MAINNET_ALLOWLIST');
	const latency = await runLatencyGate(process.env.VICE_LATENCY_EVIDENCE);
	if (latency.network !== 'mainnet') throw new Error('Mainnet release requires latency evidence captured on mainnet');
	if (latency.commit?.toLowerCase() !== releaseBuild.toLowerCase() || latency.releaseBuild?.toLowerCase() !== releaseBuild.toLowerCase()) throw new Error('Mainnet latency evidence does not match VICE_MAINNET_RELEASE_BUILD');
	if (!latency.pass) throw new Error(`Mainnet release latency gate failed: ${latency.failures.join('; ')}`);
	await assertMainnetPromotable(runtimeFromEnv(process.env));
}
const cspConfig = await Bun.file(resolve(root, 'vice-terminal/svelte.config.js')).text();
if (!cspConfig.includes("mode: 'nonce'")) throw new Error('CSP must use per-response nonces for the SSR trading surface');
if (cspConfig.includes("'style-src': ['self', 'unsafe-inline']")) throw new Error('CSP style-src must not allow unsafe-inline');

// Promo signer isolation: the normal vite dev/preview/build config must never
// proxy a signing shim, and release scripts must never load the promo config.
// The promo shim proxy lives ONLY in the explicit test-only
// vite.config.promo.ts (loaded via --config vite.config.promo.ts, never by
// dev/preview/build/release CI).
const viteConfig = await Bun.file(resolve(root, 'vice-terminal/vite.config.ts')).text();
for (const token of ['/shim', '18990', 'promo-sign-shim']) {
	if (viteConfig.includes(token)) violations.push(`vice-terminal/vite.config.ts: promo signing shim must not be proxied by the normal config (${token})`);
}
const promoConfig = await Bun.file(resolve(root, 'vice-terminal/vite.config.promo.ts')).text();
if (!promoConfig.includes("'/shim'")) violations.push('vice-terminal/vite.config.promo.ts: expected the isolated promo shim proxy');
const rootPackage = JSON.parse(await Bun.file(resolve(root, 'package.json')).text());
for (const [name, command] of Object.entries(rootPackage.scripts ?? {})) {
	if ((name === 'dev' || name === 'dev:frontend' || name === 'build' || name === 'build:terminal' || name === 'check' || name.startsWith('test')) &&
		command.includes('vite.config.promo')) {
		violations.push(`package.json script ${name}: promo config must never be reachable from dev/build/check/test paths`);
	}
}
if (violations.length) throw new Error(`Promo signer isolation violations:\n${violations.join('\n')}`);

// Dependency integrity gate: fail release on unapproved advisories (no blanket
// allowlist; only documented, time-bounded exceptions in
// scripts/dependency-audit.exceptions.json) and verify the lockfile is in sync.
const audit = await runDependencyAudit({
	root,
	exceptionsPath: resolve(root, process.env.VICE_AUDIT_EXCEPTIONS ?? 'scripts/dependency-audit.exceptions.json')
});
if (!audit.ok) {
	const lines = [...audit.violations, ...audit.exceptionsErrors];
	throw new Error(`Dependency integrity gate failed:\n${lines.join('\n')}`);
}

console.log(`✓ custody boundary scan\n✓ Hyperliquid ${network} release policy\n✓ gateway exposure policy\n✓ nonce-based CSP policy\n✓ promo signer isolation\n✓ dependency audit (${audit.advisories.length} advisories, ${audit.exempted.length} exempted)\n✓ lockfile in sync`);
