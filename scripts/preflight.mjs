#!/usr/bin/env bun
import { resolve } from 'node:path';
import { readMainnetEvidence } from './mainnet-evidence.mjs';
import { runLatencyGate } from './latency-gate.mjs';
import { assertMainnetPromotable, runtimeFromEnv } from './mainnet-guardrails.mjs';
import { runDependencyAudit } from './dependency-audit.mjs';

const root = resolve(import.meta.dir, '..');
const violations = [];
const glob = new Bun.Glob('**/*.{ts,svelte}');
for await (const relative of glob.scan({ cwd: resolve(root, 'vice-terminal/src') })) {
	const source = await Bun.file(resolve(root, 'vice-terminal/src', relative)).text();
	for (const token of ['HL_PRIVATE_KEY', 'HL_WALLET_ADDRESS']) if (source.includes(token)) violations.push(`vice-terminal/src/${relative}: forbidden server-signing secret ${token}`);
}
if (violations.length) throw new Error(`Custody boundary violations:\n${violations.join('\n')}`);

const network = (process.env.VITE_HL_TRADING_NETWORK ?? (process.env.VITE_HL_NETWORK === 'mainnet' ? 'mainnet' : 'testnet')).toLowerCase();
if (!['testnet', 'mainnet'].includes(network)) throw new Error(`Invalid VITE_HL_TRADING_NETWORK=${network}`);
if (network === 'mainnet' && process.env.VITE_HL_MAINNET_ACK !== 'I_ACCEPT_REAL_MAINNET_TRADING') throw new Error('Mainnet release is locked: missing VITE_HL_MAINNET_ACK=I_ACCEPT_REAL_MAINNET_TRADING');
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
	if (latency.network !== 'mainnet' || latency.commit?.toLowerCase() !== releaseBuild.toLowerCase() || latency.releaseBuild?.toLowerCase() !== releaseBuild.toLowerCase()) throw new Error('Mainnet latency evidence does not match the release build');
	if (!latency.pass) throw new Error(`Mainnet release latency gate failed: ${latency.failures.join('; ')}`);
	await assertMainnetPromotable(runtimeFromEnv(process.env));
}
const cspConfig = await Bun.file(resolve(root, 'vice-terminal/svelte.config.js')).text();
if (!cspConfig.includes("mode: 'nonce'")) throw new Error('CSP must use per-response nonces');
if (cspConfig.includes("'style-src': ['self', 'unsafe-inline']")) throw new Error('CSP style-src must not allow unsafe-inline');

const audit = await runDependencyAudit({ root, exceptionsPath: resolve(root, process.env.VICE_AUDIT_EXCEPTIONS ?? 'scripts/dependency-audit.exceptions.json') });
if (!audit.ok) throw new Error(`Dependency integrity gate failed:\n${[...audit.violations, ...audit.exceptionsErrors].join('\n')}`);
console.log(`✓ custody boundary\n✓ Hyperliquid ${network} release policy\n✓ nonce-based CSP\n✓ dependency audit (${audit.advisories.length} advisories)\n✓ lockfile in sync`);
