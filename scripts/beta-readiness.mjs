#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readStreamCatalog, validateStreamCatalog } from './stream-catalog.mjs';
import { readMainnetEvidence, REQUIRED_BETA_EVIDENCE_ACTIONS, REQUIRED_BETA_EXECUTION_FEATURES } from './mainnet-evidence.mjs';
import { verifyManifest } from './release-manifest.mjs';

const root = resolve(import.meta.dir, '..');
const args = process.argv.slice(2);
function option(name) {
	const direct = args.find((value) => value.startsWith(`${name}=`));
	if (direct) return direct.slice(name.length + 1);
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : null;
}
async function json(path) { return JSON.parse(await readFile(resolve(root, path), 'utf8')); }
function requireCoverage(actual, expected, field) {
	const found = new Set(actual ?? []);
	const missing = expected.filter((id) => !found.has(id));
	if (missing.length) throw new Error(`${field} missing exact coverage: ${missing.join(', ')}`);
}
async function probeDeployment(url, expectedSha) {
	if (!url) return 'deployment URL is required';
	try {
		const response = await fetch(new URL('/api/meta', url), { headers: { accept: 'application/json' }, cache: 'no-store' });
		if (!response.ok) return `deployment /api/meta returned ${response.status}`;
		const meta = await response.json();
		return meta?.commit === expectedSha && meta?.releaseBuild === expectedSha ? null : 'deployment identity does not match manifest SHA';
	} catch {
		return 'deployment identity probe failed';
	}
}

const errors = [];
let manifest;
try { manifest = await json('release/vice-manifest.json'); } catch { errors.push('release manifest is missing or invalid JSON'); }
const expectedSha = option('--expected-sha') ?? manifest?.commit ?? null;
if (manifest) {
	const verified = verifyManifest(manifest, { root, expectedSha, requireProvenance: true });
	if (!verified.ok) errors.push(...verified.errors);
}
let streamCatalog;
try {
	streamCatalog = await readStreamCatalog();
	errors.push(...validateStreamCatalog(streamCatalog));
} catch {
	errors.push('Hyperliquid stream catalog is missing or invalid');
}
const evidencePath = process.env.VICE_MAINNET_EVIDENCE?.trim();
if (!evidencePath) errors.push('VICE_MAINNET_EVIDENCE is not configured');
if (!process.env.VICE_MAINNET_RELEASE_BUILD?.trim()) errors.push('VICE_MAINNET_RELEASE_BUILD is not configured');
if (manifest?.commit && process.env.VICE_MAINNET_RELEASE_BUILD?.trim() !== manifest.commit) errors.push('VICE_MAINNET_RELEASE_BUILD does not match manifest commit');
for (const owner of ['VICE_BETA_SUPPORT_OWNER', 'VICE_INCIDENT_OWNER', 'VICE_RELEASE_OWNER']) if (!process.env[owner]?.trim()) errors.push(`${owner} is not assigned`);
if (evidencePath && streamCatalog) {
	try {
		await readMainnetEvidence(evidencePath, { expectedSha: expectedSha ?? undefined, expectedActionIds: REQUIRED_BETA_EVIDENCE_ACTIONS, expectedStreamIds: streamCatalog.streams.map((stream) => stream.id) }).then((evidence) => {
			requireCoverage(evidence.features, REQUIRED_BETA_EXECUTION_FEATURES, 'features');
		});
	} catch (error) {
		errors.push(`mainnet evidence is incomplete: ${error instanceof Error ? error.message : 'invalid evidence'}`);
	}
}
const deploymentUrl = option('--deployment') ?? process.env.VICE_DEPLOYED_URL?.trim() ?? null;
if (manifest) {
	const deploymentError = await probeDeployment(deploymentUrl, manifest.commit);
	if (deploymentError) errors.push(deploymentError);
}
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), commit: manifest?.commit ?? null, deployment: deploymentUrl, ready: errors.length === 0, errors };
report.sha256 = createHash('sha256').update(JSON.stringify(report)).digest('hex');
await mkdir(resolve(root, 'release'), { recursive: true });
await writeFile(resolve(root, 'release/readiness-report.json'), JSON.stringify(report, null, 2) + '\n');
if (errors.length) {
	console.error(`Beta readiness blocked (${errors.length} findings):\n${errors.join('\n')}`);
	process.exit(1);
}
console.log(`Beta readiness passed for ${manifest.commit}; report ${report.sha256}`);
