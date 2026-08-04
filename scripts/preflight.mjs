#!/usr/bin/env bun
import { resolve } from 'node:path';
import { readMainnetEvidence } from './mainnet-evidence.mjs';
import { runLatencyGate } from './latency-gate.mjs';
import { validateGatewayExposure } from './gateway-policy.mjs';
import { assertMainnetPromotable, runtimeFromEnv } from './mainnet-guardrails.mjs';

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
const network = (process.env.VITE_HL_NETWORK ?? 'testnet').toLowerCase();
const gatewayHost = (process.env.VICE_GATEWAY_BIND ?? `${process.env.VICE_BACKEND_HOST ?? '127.0.0.1'}:8080`).replace(/^\[/, '').split(']')[0].split(':')[0];
validateGatewayExposure({
	host: gatewayHost,
	allowPublic: process.env.VICE_ALLOW_PUBLIC_GATEWAY === 'true',
	origin: process.env.VICE_GATEWAY_ORIGIN ?? ''
});
if (!['testnet', 'mainnet'].includes(network)) throw new Error(`Invalid VITE_HL_NETWORK=${network}`);
if (network === 'mainnet' && process.env.VITE_HL_MAINNET_ACK !== 'I_ACCEPT_REAL_MAINNET_TRADING') {
	throw new Error('Mainnet release is locked: missing VITE_HL_MAINNET_ACK=I_ACCEPT_REAL_MAINNET_TRADING');
}
const builderRevenueEnabled = process.env.VITE_HL_ENABLE_BUILDER_REVENUE === 'true';
if (network === 'mainnet' && builderRevenueEnabled && !/^0x[0-9a-fA-F]{40}$/.test(process.env.VITE_HL_BUILDER_ADDRESS ?? '')) {
	throw new Error('Mainnet release requires a valid VITE_HL_BUILDER_ADDRESS');
}
if (network === 'mainnet') {
	await readMainnetEvidence(process.env.VICE_FUNDED_TESTNET_EVIDENCE);
	if (!process.env.VICE_MAINNET_ALLOWLIST?.trim()) throw new Error('Mainnet release requires VICE_MAINNET_ALLOWLIST');
	const latency = await runLatencyGate(process.env.VICE_LATENCY_EVIDENCE);
	if (latency.network !== 'testnet') throw new Error('Mainnet release requires latency evidence captured on testnet');
	if (!latency.pass) throw new Error(`Mainnet release latency gate failed: ${latency.failures.join('; ')}`);
	// PLAN_3 external gates: deny-by-default until the release authority records
	// Gate 0 funded certification, allowlist, cap, observation window, named
	// operator, and the separate final go/no-go for the same release/build.
	await assertMainnetPromotable(runtimeFromEnv(process.env));
}
const cspConfig = await Bun.file(resolve(root, 'vice-terminal/svelte.config.js')).text();
if (!cspConfig.includes("mode: 'nonce'")) throw new Error('CSP must use per-response nonces for the SSR trading surface');
if (cspConfig.includes("'style-src': ['self', 'unsafe-inline']")) throw new Error('CSP style-src must not allow unsafe-inline');
console.log(`✓ custody boundary scan\n✓ Hyperliquid ${network} release policy\n✓ gateway exposure policy\n✓ nonce-based CSP policy`);
