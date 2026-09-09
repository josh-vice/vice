#!/usr/bin/env bun
/**
 * scripts/release-manifest.mjs
 *
 * Immutable release manifest generation with clean-tree / exact-SHA safeguards.
 *
 * PURPOSE (P0 CI + immutable release evidence):
 *   A release artifact is only trustworthy if you can prove exactly which
 *   commit and which dependency lockfile produced it, and that no uncommitted
 *   or untracked file silently changed what was built. This module emits a
 *   manifest that binds:
 *     - the exact commit SHA (and ref/branch),
 *     - the lockfile SHA-256 (bun.lock),
 *     - the built artifact SHA-256 + size,
 *     - an optional test-summary file SHA-256,
 *     - a deterministic content checksum over the stable fields.
 *
 * CLEAN-TREE / EXACT-SHA GUARDS:
 *   * `--release` (strict) mode FAILS on a dirty working tree OR any untracked
 *     file. Release output must be bit-reproducible from a clean checkout.
 *   * Ordinary local development never passes `--release`, so it is unaffected:
 *     the default (lenient) mode records `cleanTree:false` and the dirty paths
 *     but does not fail, so running the tool mid-edit is harmless.
 *   * `--expected-sha <full|short>` makes the exact-SHA guard explicit: the
 *     current HEAD must resolve to that SHA or the tool fails. The release
 *     workflow passes the checked-out SHA so a re-run after a rebase is
 *     detected, not silently re-bound.
 *
 * DETERMINISM:
 *   `contentSha256` is computed over ONLY the stable fields (commit, ref,
 *   lockfile hash, artifact hash/size, test-summary hash, schemaVersion). The
 *   wall-clock `builtAt` is recorded for humans but EXCLUDED from the checksum,
 *   so two builds of the same commit + lockfile + artifact produce the same
 *   content checksum. `verify` recomputes it and compares.
 *
 * USAGE:
 *   bun scripts/release-manifest.mjs --release \
 *       --out release/vice-manifest.json \
 *       [--artifact <path>] [--lockfile <path>] [--tests <path>] \
 *       [--expected-sha <sha>]
 *   bun scripts/release-manifest.mjs --release --verify release/vice-manifest.json
 *
 * Env overrides for CI: VICE_RELEASE_SHA (exact expected sha), VICE_ARTIFACT,
 * VICE_LOCKFILE, VICE_TEST_SUMMARY.
 */

import { createHash } from 'node:crypto';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { spawnSync } from 'node:child_process';

export const MANIFEST_SCHEMA_VERSION = 2;
export const KIND = 'vice-release-manifest';

// Stable fields that participate in the content checksum. `builtAt` is a
// runtime observation, not part of the reproducible identity.
export const CHECKSUMED_FIELDS = ['schemaVersion', 'kind', 'ref', 'commit', 'branch', 'lockfile.sha256', 'artifact.sha256', 'artifact.sizeBytes', 'tests.sha256', 'releaseBuild', 'policy.sha256', 'approval.sha256', 'observation.sha256'];

// ---------------------------------------------------------------------------
// Pure hash helpers
// ---------------------------------------------------------------------------

export function sha256Buffer(buffer) {
	return createHash('sha256').update(buffer).digest('hex');
}

export function sha256File(path) {
	const fullPath = resolve(path);
	if (statSync(fullPath).isDirectory()) {
		const hash = createHash('sha256');
		const walk = (directory) => {
			for (const name of readdirSync(directory).sort()) {
				const child = join(directory, name);
				if (statSync(child).isDirectory()) walk(child);
				else {
					hash.update(relative(fullPath, child));
					hash.update('\u0000');
					hash.update(readFileSync(child));
				}
			}
		};
		walk(fullPath);
		return hash.digest('hex');
	}
	return sha256Buffer(readFileSync(fullPath));
}

export function fileSize(path) {
	const fullPath = resolve(path);
	if (!statSync(fullPath).isDirectory()) return statSync(fullPath).size;
	return readdirSync(fullPath).reduce((total, name) => total + fileSize(join(fullPath, name)), 0);
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

export function gitHead(cwd) {
	const branch = exec(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd);
	const ref = exec(['git', 'rev-parse', '--symbolic-full-name', 'HEAD'], cwd);
	const commit = exec(['git', 'rev-parse', 'HEAD'], cwd);
	return { commit, short: commit.slice(0, 12), branch, ref };
}

export function gitStatus(cwd) {
	const raw = exec(['git', 'status', '--porcelain=v1', '--untracked-files=all'], cwd);
	const changes = [];
	let clean = true;
	for (const line of raw.split('\n')) {
		if (!line) continue;
		clean = false;
		// porcelain v1 is `XY path`. After trimming whitespace, match the
		// status code (1-2 chars) then a space then the path, robust to the
		// leading space being trimmed.
		const m = line.match(/^(\S)(\S)? (.*)$/);
		const xy = m ? m[1] + (m[2] ?? ' ') : line.slice(0, 2);
		const path = m ? m[3] : line.slice(3);
		let kind = 'modified';
		if (xy === '??') kind = 'untracked';
		else if (xy.includes('A')) kind = 'added';
		else if (xy.includes('D')) kind = 'deleted';
		else if (xy.includes('R')) kind = 'renamed';
		changes.push({ path, kind });
	}
	return { clean, changes };
}

export function assertCleanTree(cwd, { strict = false } = {}) {
	const status = gitStatus(cwd);
	if (strict && !status.clean) {
		const detail = status.changes.map((c) => `${c.kind} ${c.path}`).join(', ');
		throw new Error(`release requires a clean working tree (found: ${detail})`);
	}
	return status;
}

export function assertHeadMatches(cwd, expected) {
	if (!expected) return;
	const head = gitHead(cwd);
	const expectedShort = expected.toLowerCase();
	const headCommit = head.commit.toLowerCase();
	if (headCommit !== expectedShort && !headCommit.startsWith(expectedShort)) {
		throw new Error(`HEAD ${head.commit} does not match expected SHA ${expected}`);
	}
}

// ---------------------------------------------------------------------------
// Manifest construction
// ---------------------------------------------------------------------------

function pick(obj, path) {
	return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

// Deterministic content checksum over the stable fields (builtAt excluded).
export function manifestContentChecksum(fields, manifest) {
	const payload = { ...manifest };
	delete payload.builtAt;
	delete payload.contentSha256;
	// Re-serialize with stable ordering to keep the digest independent of key
	// insertion order.
	const sorted = {};
	for (const key of Object.keys(payload).sort()) sorted[key] = payload[key];
	return sha256Buffer(JSON.stringify(sorted));
}

export async function buildManifest({
	cwd,
	lockfilePath = 'bun.lock',
	artifactPath = null,
	testsPath = null,
	policyPath = null,
	approvalPath = null,
	observationPath = null,
	releaseBuild = null,
	strict = false,
	expectedSha = null
} = {}) {
	const base = resolve(cwd ?? '.');
	const head = gitHead(base);
	assertHeadMatches(base, expectedSha);
	assertCleanTree(base, { strict });

	const manifest = {
		schemaVersion: MANIFEST_SCHEMA_VERSION,
		kind: KIND,
		builtAt: new Date().toISOString(),
		ref: head.ref,
		commit: head.commit,
		short: head.short,
		branch: head.branch,
		releaseBuild: releaseBuild ?? process.env.VICE_MAINNET_RELEASE_BUILD ?? null
	};

	if (lockfilePath) {
		manifest.lockfile = {
			path: lockfilePath,
			sha256: sha256File(resolve(base, lockfilePath))
		};
	}
	if (artifactPath) {
		const full = resolve(base, artifactPath);
		manifest.artifact = {
			path: artifactPath,
			commit: head.commit,
			sha256: sha256File(full),
			sizeBytes: fileSize(full)
		};
	}
	if (testsPath) {
		manifest.tests = {
			path: testsPath,
			sha256: sha256File(resolve(base, testsPath))
		};
	}
	if (policyPath) manifest.policy = { path: policyPath, sha256: sha256File(resolve(base, policyPath)) };
	if (approvalPath) manifest.approval = { path: approvalPath, sha256: sha256File(resolve(base, approvalPath)) };
	if (observationPath) manifest.observation = { path: observationPath, sha256: sha256File(resolve(base, observationPath)) };

	manifest.contentSha256 = manifestContentChecksum(CHECKSUMED_FIELDS, manifest);
	return manifest;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export function verifyManifest(manifest, { root = null, expectedSha = null, requireProvenance = false } = {}) {
	const errors = [];
	if (manifest?.schemaVersion !== MANIFEST_SCHEMA_VERSION) errors.push(`schemaVersion must be ${MANIFEST_SCHEMA_VERSION}`);
	if (!/^[a-f0-9]{40}$/i.test(manifest?.commit ?? '')) errors.push('manifest commit must be a full SHA');
	if (expectedSha && (!/^[a-f0-9]{40}$/i.test(expectedSha) || manifest?.commit?.toLowerCase() !== expectedSha.toLowerCase())) errors.push(`manifest commit ${manifest?.commit ?? '(missing)'} does not match expected full SHA ${expectedSha}`);
	if (requireProvenance) {
		for (const field of ['releaseBuild', 'lockfile', 'artifact', 'tests', 'policy', 'approval', 'observation']) if (!manifest?.[field]) errors.push(`manifest missing ${field} provenance`);
		if (!/^[a-f0-9]{40}$/i.test(manifest?.releaseBuild ?? '')) errors.push('releaseBuild must be the full release SHA');
		if (manifest?.releaseBuild && manifest.releaseBuild.toLowerCase() !== manifest.commit?.toLowerCase()) errors.push('releaseBuild does not match manifest commit');
		if (manifest?.artifact?.commit && manifest.artifact.commit.toLowerCase() !== manifest.commit?.toLowerCase()) errors.push('artifact commit does not match manifest commit');
		for (const field of ['lockfile', 'artifact', 'tests', 'policy', 'approval', 'observation']) {
			if (manifest?.[field] && (!manifest[field].path || !/^[a-f0-9]{64}$/i.test(manifest[field].sha256 ?? ''))) errors.push(`${field} provenance must include a path and SHA-256 digest`);
		}
		if (!/^[a-f0-9]{64}$/i.test(manifest?.contentSha256 ?? '')) errors.push('contentSha256 must be a SHA-256 digest');
	}
	const expectedContent = manifestContentChecksum(CHECKSUMED_FIELDS, manifest);
	if (manifest.contentSha256 && expectedContent !== manifest.contentSha256) errors.push(`contentSha256 mismatch: manifest ${manifest.contentSha256}, recomputed ${expectedContent}`);
	const base = root ? resolve(root) : null;
	const tryHash = (relPath, section) => {
		if (!relPath || !base) return;
		try {
			if (typeof relPath !== 'string' || relPath.startsWith('/') || relPath.startsWith('~')) throw new Error('path must remain inside release root');
			const full = resolve(base, relPath);
			const inside = relative(base, full);
			if (inside === '..' || inside.startsWith('../')) throw new Error('path must remain inside release root');
			const actual = sha256File(full);
			const expected = manifest[section]?.sha256;
			if (expected && actual !== expected) errors.push(`${section}.sha256 changed on disk: manifest ${expected}, current ${actual}`);
		} catch (error) {
			if (error instanceof Error && error.message === 'path must remain inside release root') errors.push(`${section} path must remain inside release root`);
			else errors.push(`${section} referenced file ${relPath} is missing or unreadable`);
		}
	};
	if (manifest.lockfile) tryHash(manifest.lockfile.path, 'lockfile');
	if (manifest.artifact) tryHash(manifest.artifact.path, 'artifact');
	if (manifest.tests) tryHash(manifest.tests.path, 'tests');
	if (manifest.policy) tryHash(manifest.policy.path, 'policy');
	if (manifest.approval) tryHash(manifest.approval.path, 'approval');
	if (manifest.observation) tryHash(manifest.observation.path, 'observation');
	return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function exec(args, cwd) {
	const result = spawnSync(args[0], args.slice(1), { cwd, encoding: 'utf8' });
	if (result.status !== 0) {
		throw new Error(`command failed: ${args.join(' ')}\n${result.stderr?.trim() ?? ''}`);
	}
	return result.stdout.trim();
}

function parseArgs(argv) {
	const opts = { release: false, verify: null, out: null, artifact: null, lockfile: null, tests: null, policy: null, approval: null, observation: null, expectedSha: null };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case '--release':
				opts.release = true;
				break;
			case '--verify':
				opts.verify = argv[++i];
				break;
			case '--out':
				opts.out = argv[++i];
				break;
			case '--artifact':
				opts.artifact = argv[++i];
				break;
			case '--lockfile':
				opts.lockfile = argv[++i];
				break;
			case '--tests':
				opts.tests = argv[++i];
				break;
			case '--policy':
				opts.policy = argv[++i];
				break;
			case '--approval':
				opts.approval = argv[++i];
				break;
			case '--observation':
				opts.observation = argv[++i];
				break;
			case '--expected-sha':
				opts.expectedSha = argv[++i];
				break;
			default:
				break;
		}
	}
	return opts;
}

async function main(argv) {
	const opts = parseArgs(argv);
	const root = resolve(import.meta.dir, '..');

	// Env overrides for CI.
	const artifact = opts.artifact ?? process.env.VICE_ARTIFACT ?? null;
	const lockfile = opts.lockfile ?? process.env.VICE_LOCKFILE ?? 'bun.lock';
	const tests = opts.tests ?? process.env.VICE_TEST_SUMMARY ?? null;
	const policy = opts.policy ?? process.env.VICE_RELEASE_POLICY ?? null;
	const approval = opts.approval ?? process.env.VICE_RELEASE_APPROVAL ?? null;
	const observation = opts.observation ?? process.env.VICE_OBSERVATION_MANIFEST ?? null;
	const expectedSha = opts.expectedSha ?? process.env.VICE_RELEASE_SHA ?? null;

	if (opts.verify) {
		const manifestPath = resolve(root, opts.verify);
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		const result = verifyManifest(manifest, { root, expectedSha, requireProvenance: opts.release });
		if (!result.ok) {
			console.error('release-manifest: verification FAILED');
			for (const e of result.errors) console.error(`  - ${e}`);
			process.exit(1);
		}
		console.log(`release-manifest: verified ${manifestPath}`);
		console.log(`  commit ${manifest.commit} (${manifest.branch}) lockfile ${manifest.lockfile?.sha256?.slice(0, 12) ?? 'n/a'} artifact ${manifest.artifact?.sha256?.slice(0, 12) ?? 'n/a'}`);
		return;
	}

	const manifest = await buildManifest({
		cwd: root,
		lockfilePath: lockfile,
		artifactPath: artifact,
		testsPath: tests,
		policyPath: policy,
		approvalPath: approval,
		observationPath: observation,
		strict: opts.release,
		expectedSha
	});

	const out = opts.out ?? 'release/vice-manifest.json';
	const outPath = resolve(root, out);
	const { mkdirSync } = await import('node:fs');
	mkdirSync(resolve(root, 'release'), { recursive: true });
	const { writeFileSync } = await import('node:fs');
	writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');

	console.log(`release-manifest: wrote ${outPath}`);
	console.log(`  commit ${manifest.commit} (${manifest.branch})`);
	console.log(`  lockfile sha256 ${manifest.lockfile?.sha256 ?? 'n/a'}`);
	if (manifest.artifact) console.log(`  artifact sha256 ${manifest.artifact.sha256} (${manifest.artifact.sizeBytes} bytes)`);
	console.log(`  contentSha256 ${manifest.contentSha256}`);

	if (opts.release && !verifyManifest(manifest, { root }).ok) {
		console.error('release-manifest: self-verification failed');
		process.exit(1);
	}
}

if (import.meta.main) {
	main(process.argv.slice(2)).catch((err) => {
		console.error(`release-manifest: ${err.message}`);
		process.exit(1);
	});
}
