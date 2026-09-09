#!/usr/bin/env bun
import { spawnSync } from 'node:child_process';

const target = process.env.VICE_ROLLBACK_TARGET?.trim();
const productionUrl = process.env.VICE_PRODUCTION_URL?.trim();
const expectedSha = process.env.VICE_RELEASE_SHA?.trim();
if (!target || !productionUrl || !expectedSha) {
	throw new Error('VICE_ROLLBACK_TARGET, VICE_PRODUCTION_URL, and VICE_RELEASE_SHA are required');
}
if (!/^[a-f0-9]{40}$/i.test(expectedSha)) throw new Error('VICE_RELEASE_SHA must be a full commit SHA');

const result = spawnSync('bunx', [
	'--bun',
	'vercel@59.11.7',
	'rollback',
	target,
	'--yes',
	'--non-interactive',
	'--timeout',
	'3m'
], {
		env: process.env,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
});
if (result.status !== 0) {
	throw new Error(`Vercel rollback failed: ${result.stderr?.trim() || result.stdout?.trim() || 'unknown error'}`);
}

const metaResponse = await fetch(new URL('/api/meta', productionUrl), { cache: 'no-store', headers: { accept: 'application/json' } });
if (!metaResponse.ok) throw new Error(`/api/meta returned ${metaResponse.status} after rollback`);
const meta = await metaResponse.json();
if (meta.commit !== expectedSha || meta.releaseBuild !== expectedSha) {
	throw new Error('post-rollback deployment identity does not match expected SHA');
}
console.log(JSON.stringify({ ok: true, target, productionUrl, commit: meta.commit, releaseBuild: meta.releaseBuild }));
