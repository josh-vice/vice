#!/usr/bin/env bun
/**
 * scripts/release-test-summary.mjs
 *
 * Record a deterministic, non-hosted gate summary into the release manifest
 * input (release/test-summary.json). The release workflow runs the hard source
 * gates directly (preflight, frontend, release-manifest) and reflects their
 * outcome plus the typecheck/svelte results here, so the manifest's test-summary
 * hash binds the artifact to the test state that produced it.
 *
 * Usage:
 *   bun scripts/release-test-summary.mjs
 *
 * Exits non-zero if any hard gate failed (so a release can never be bound to a
 * broken test state). The typecheck/svelte results are recorded but the release
 * gate treats a failed typecheck as a hard failure too.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const OUT = resolve(root, 'release', 'test-summary.json');

function run(cmd) {
	const [bin, ...args] = cmd.split(/\s+/);
	const result = spawnSync(bin, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	return result.status === 0;
}

const HARD = {
	preflight: 'bun run preflight',
	frontend: 'bun run test:frontend',
	'release-manifest': 'bun run test:release-manifest'
};

const suite = {};
let hardPass = true;
for (const [name, cmd] of Object.entries(HARD)) {
	const pass = run(cmd);
	suite[name] = pass ? 'pass' : 'fail';
	if (!pass) hardPass = false;
}
for (const [name, cmd] of [['typecheck', 'bun run typecheck'], ['svelte-check', 'bun run test:svelte']]) {
	const pass = run(cmd);
	suite[name] = pass ? 'pass' : 'fail';
	if (!pass) hardPass = false;
}

mkdirSync(resolve(root, 'release'), { recursive: true });
const summary = { schemaVersion: 2, run: 'release-build', generatedAt: new Date().toISOString(), suite, hardPass };
writeFileSync(OUT, JSON.stringify(summary, null, 2) + '\n');
console.log(`test summary written to ${OUT}`);
console.log(JSON.stringify(suite, null, 2));

if (!hardPass) {
	console.error('release-test-summary: a hard gate failed; refusing to bind a release to broken test state');
	process.exitCode = 1;
}
