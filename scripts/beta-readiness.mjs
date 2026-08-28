#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateCompetitiveMatrix } from './competitive-matrix.mjs';
import { validateActionCatalog } from './action-catalog.mjs';
import { extractCriteria, readStoryCatalog, validateStoryCatalog } from './user-story-catalog.mjs';
import { validateStreamCatalog } from './stream-catalog.mjs';
import { readMainnetEvidence } from './mainnet-evidence.mjs';
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
async function probeDeployment(url, expectedSha) {
	if (!url) return { ok: false, error: 'deployment URL is required' };
	try {
		const response = await fetch(new URL('/api/meta', url), { headers: { accept: 'application/json' }, cache: 'no-store' });
		if (!response.ok) return { ok: false, error: `deployment /api/meta returned ${response.status}` };
		const meta = await response.json();
		return { ok: meta?.commit === expectedSha && meta?.releaseBuild === expectedSha, error: 'deployment identity does not match manifest SHA' };
	} catch {
		return { ok: false, error: 'deployment identity probe failed' };
	}
}

const errors = [];
let manifest;
try { manifest = await json('release/vice-manifest.json'); } catch { errors.push('release manifest is missing or invalid JSON'); }
const expectedSha = option('--expected-sha') ?? manifest?.commit ?? null;
if (manifest) {
	const verified = verifyManifest(manifest, { root, expectedSha, requireProvenance: true });
	if (!verified.ok) errors.push(...verified.errors);
	if (expectedSha && manifest.commit !== expectedSha) errors.push('manifest commit does not match expected SHA');
}
let actionCatalog;
let streamCatalog;
try { actionCatalog = await json('docs/user-stories/action-catalog.json'); errors.push(...await validateActionCatalog(actionCatalog)); } catch { errors.push('action catalog is missing or invalid JSON'); }
try { errors.push(...validateCompetitiveMatrix(await json('docs/competitive/terminal-matrix.json'))); } catch { errors.push('competitive matrix is missing or invalid JSON'); }
try { errors.push(...await validateStoryCatalog(root)); } catch { errors.push('user-story catalog is missing or invalid JSON'); }
try { streamCatalog = await json('docs/data/stream-catalog.json'); errors.push(...validateStreamCatalog(streamCatalog)); } catch { errors.push('stream catalog is missing or invalid JSON'); }
try {
	const matrix = await json('docs/competitive/terminal-matrix.json');
	for (const capability of matrix.capabilities ?? []) for (const state of ['implemented', 'interactionCertified', 'fundedMainnetCertified', 'mainnetEnabled']) if (capability.status?.[state] !== true) errors.push(`${capability.id}: ${state} is not complete`);
} catch {}
if (!process.env.VICE_MAINNET_EVIDENCE?.trim()) errors.push('VICE_MAINNET_EVIDENCE is not configured');
if (!process.env.VICE_MAINNET_RELEASE_BUILD?.trim()) errors.push('VICE_MAINNET_RELEASE_BUILD is not configured');
if (manifest?.commit && process.env.VICE_MAINNET_RELEASE_BUILD?.trim() !== manifest.commit) errors.push('VICE_MAINNET_RELEASE_BUILD does not match manifest commit');
for (const owner of ['VICE_BETA_SUPPORT_OWNER', 'VICE_INCIDENT_OWNER', 'VICE_RELEASE_OWNER']) if (!process.env[owner]?.trim()) errors.push(`${owner} is not assigned`);
if (process.env.VICE_MAINNET_EVIDENCE?.trim() && actionCatalog && streamCatalog) {
	try {
		const stories = await readStoryCatalog(root);
		const criteria = stories.flatMap(({ source }) => extractCriteria(source).map(({ id }) => id));
		await readMainnetEvidence(process.env.VICE_MAINNET_EVIDENCE, { expectedSha: expectedSha ?? undefined, expectedActionIds: actionCatalog.actions.map((action) => action.id), expectedCriterionIds: [...new Set(criteria)], expectedStreamIds: streamCatalog.streams.map((stream) => stream.id) });
	} catch (error) {
		errors.push(`mainnet evidence is not exact-build complete: ${error instanceof Error ? error.message : 'invalid evidence'}`);
	}
}
if (manifest) {
	const deployment = await probeDeployment(option('--deployment'), manifest.commit);
	if (!deployment.ok) errors.push(deployment.error);
}
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), commit: manifest?.commit ?? null, deployment: option('--deployment'), ready: errors.length === 0, errors };
report.sha256 = createHash('sha256').update(JSON.stringify(report)).digest('hex');
await mkdir(resolve(root, 'release'), { recursive: true });
await writeFile(resolve(root, 'release/readiness-report.json'), JSON.stringify(report, null, 2) + '\n');
if (errors.length) {
	console.error(`Beta readiness blocked (${errors.length} findings):\n${errors.join('\n')}`);
	process.exit(1);
}
console.log(`Beta readiness passed for ${manifest.commit}; report ${report.sha256}`);
