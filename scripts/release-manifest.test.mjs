import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
	KIND,
	MANIFEST_SCHEMA_VERSION,
	assertCleanTree,
	assertHeadMatches,
	buildManifest,
	gitHead,
	gitStatus,
	manifestContentChecksum,
	sha256Buffer,
	verifyManifest
} from './release-manifest.mjs';

// Create a throwaway git repo with a lockfile and (optionally) an artifact.
function makeRepo({ dirty = false, untracked = false } = {}) {
	const dir = mkdtempSync(join(tmpdir(), 'vice-rm-'));
	execSync('git init -q', { cwd: dir });
	execSync('git config user.email test@vice.local', { cwd: dir });
	execSync('git config user.name test', { cwd: dir });
	writeFileSync(join(dir, 'bun.lock'), 'LOCKFILE-V1\n');
	execSync('git add -A && git commit -qm init', { cwd: dir });
	if (dirty) writeFileSync(join(dir, 'bun.lock'), 'LOCKFILE-MODIFIED\n');
	if (untracked) writeFileSync(join(dir, 'scratch.txt'), 'x');
	return dir;
}

describe('git helpers', () => {
	test('gitHead resolves a full SHA', () => {
		const dir = makeRepo();
		const head = gitHead(dir);
		expect(head.commit).toMatch(/^[0-9a-f]{40}$/);
		expect(head.short).toMatch(/^[0-9a-f]{12}$/);
		expect(['master', 'main']).toContain(head.branch);
		expect(head.ref).toBe(`refs/heads/${head.branch}`);
		rmSync(dir, { recursive: true, force: true });
	});

	test('gitStatus reports clean tree when nothing changed', () => {
		const dir = makeRepo();
		expect(gitStatus(dir).clean).toBe(true);
		rmSync(dir, { recursive: true, force: true });
	});

	test('gitStatus detects a modified tracked file', () => {
		const dir = makeRepo({ dirty: true });
		const status = gitStatus(dir);
		expect(status.clean).toBe(false);
		expect(status.changes.some((c) => c.path === 'bun.lock' && c.kind === 'modified')).toBe(true);
		rmSync(dir, { recursive: true, force: true });
	});

	test('gitStatus detects an untracked file', () => {
		const dir = makeRepo({ untracked: true });
		const status = gitStatus(dir);
		expect(status.clean).toBe(false);
		expect(status.changes.some((c) => c.path === 'scratch.txt' && c.kind === 'untracked')).toBe(true);
		rmSync(dir, { recursive: true, force: true });
	});

	test('assertCleanTree passes on a clean tree and throws in strict mode on a dirty one', () => {
		const clean = makeRepo();
		expect(assertCleanTree(clean, { strict: true }).clean).toBe(true);
		rmSync(clean, { recursive: true, force: true });

		const dirty = makeRepo({ untracked: true });
		// Lenient (local dev) mode: does not throw, records cleanTree:false.
		expect(assertCleanTree(dirty, { strict: false }).clean).toBe(false);
		// Strict (release) mode: throws.
		expect(() => assertCleanTree(dirty, { strict: true })).toThrow(/clean working tree/);
		rmSync(dirty, { recursive: true, force: true });
	});

	test('assertHeadMatches enforces the exact SHA', () => {
		const dir = makeRepo();
		const head = gitHead(dir);
		// Full and short SHA both accepted; mismatch throws.
		expect(() => assertHeadMatches(dir, head.commit)).not.toThrow();
		expect(() => assertHeadMatches(dir, head.short)).not.toThrow();
		expect(() => assertHeadMatches(dir, '0'.repeat(40))).toThrow(/does not match expected SHA/);
		rmSync(dir, { recursive: true, force: true });
	});
});

// Create a throwaway git repo with a committed artifact (so strict mode sees a
// clean tree) and optionally a lockfile/test-summary. Returns the dir.
function makeRepoWithArtifact(artifactContent = 'ARTIFACT-CONTENT\n') {
	const dir = makeRepo();
	writeFileSync(join(dir, 'dist.tar.gz'), artifactContent);
	execSync('git add -A && git commit -qm add-artifact', { cwd: dir });
	return dir;
}

describe('manifest construction', () => {
	test('content checksum is deterministic and excludes builtAt', () => {
		const a = manifestContentChecksum([], { schemaVersion: 1, commit: 'abc', artifact: { sha256: 'x' } });
		const b = manifestContentChecksum([], { schemaVersion: 1, commit: 'abc', artifact: { sha256: 'x' } });
		expect(a).toBe(b);
		// builtAt is excluded from the checksum, so a different builtAt does not change it.
		const c = manifestContentChecksum([], { schemaVersion: 1, commit: 'abc', artifact: { sha256: 'x' }, builtAt: 'later' });
		expect(c).toBe(a);
	});

	test('buildManifest binds commit, lockfile hash, and artifact hash', async () => {
		const dir = makeRepoWithArtifact();
		const manifest = await buildManifest({ cwd: dir, artifactPath: 'dist.tar.gz', strict: true });
		const head = gitHead(dir);
		expect(manifest.commit).toBe(head.commit);
		expect(manifest.kind).toBe(KIND);
		expect(manifest.schemaVersion).toBe(MANIFEST_SCHEMA_VERSION);
		expect(manifest.lockfile.sha256).toBe(sha256Buffer(Buffer.from('LOCKFILE-V1\n')));
		expect(manifest.artifact.sha256).toBe(sha256Buffer(Buffer.from('ARTIFACT-CONTENT\n')));
		expect(manifest.artifact.sizeBytes).toBe(Buffer.byteLength('ARTIFACT-CONTENT\n'));
		expect(manifest.contentSha256).toBeTruthy();
		rmSync(dir, { recursive: true, force: true });
	});

	test('strict build rejects a dirty tree', async () => {
		const dir = makeRepo({ dirty: true });
		await expect(buildManifest({ cwd: dir, strict: true })).rejects.toThrow(/clean working tree/);
		rmSync(dir, { recursive: true, force: true });
	});

	test('lenient build records dirty paths without throwing', async () => {
		const dir = makeRepo({ untracked: true });
		const manifest = await buildManifest({ cwd: dir, strict: false });
		expect(manifest.commit).toBeTruthy();
		rmSync(dir, { recursive: true, force: true });
	});
});

describe('manifest verification', () => {
	test('verify passes a self-consistent manifest', async () => {
		const dir = makeRepoWithArtifact();
		const manifest = await buildManifest({ cwd: dir, artifactPath: 'dist.tar.gz', strict: true });
		expect(verifyManifest(manifest, { root: dir }).ok).toBe(true);
		rmSync(dir, { recursive: true, force: true });
	});

	test('verify detects an artifact that changed on disk after the manifest was bound', async () => {
		const dir = makeRepoWithArtifact('V1\n');
		const manifest = await buildManifest({ cwd: dir, artifactPath: 'dist.tar.gz', strict: true });
		// Mutate the artifact after binding (as a rebuild or tamper would).
		writeFileSync(join(dir, 'dist.tar.gz'), 'V2-TAMPERED\n');
		const result = verifyManifest(manifest, { root: dir });
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes('artifact.sha256 changed on disk'))).toBe(true);
		rmSync(dir, { recursive: true, force: true });
	});

	test('verify detects lockfile drift on disk', async () => {
		const dir = makeRepo();
		const manifest = await buildManifest({ cwd: dir, strict: true });
		writeFileSync(join(dir, 'bun.lock'), 'LOCKFILE-DRIFTED\n');
		const result = verifyManifest(manifest, { root: dir });
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes('lockfile.sha256 changed on disk'))).toBe(true);
		rmSync(dir, { recursive: true, force: true });
	});

	test('verify fails when a referenced artifact file is missing', async () => {
		const dir = makeRepoWithArtifact();
		const manifest = await buildManifest({ cwd: dir, artifactPath: 'dist.tar.gz', strict: true });
		rmSync(join(dir, 'dist.tar.gz'), { force: true });
		const result = verifyManifest(manifest, { root: dir });
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes('missing or unreadable'))).toBe(true);
		rmSync(dir, { recursive: true, force: true });
	});
});
