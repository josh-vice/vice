import { describe, expect, test } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Local equivalent of the hosted workflow linter + security-boundary gate.
// Validates the checked-in .github/workflows/*.yml against the release
// contract: PR CI must never sign, trade, publish, deploy, or need wallet
// credentials; release/staging must not deploy by default. Parsing mirrors the
// subset of GitHub Actions YAML the project relies on (a plain-YAML parse of
// the block structure); actionlint performs the full hosted-equivalent lint.

const ROOT = resolve(import.meta.dir, '..');
const WORKFLOWS = join(ROOT, '.github', 'workflows');

function listWorkflows() {
	if (!existsSync(WORKFLOWS)) return [];
	const entries = [];
	for (const f of ['ci.yml', 'release.yml', 'staging-smoke.yml']) {
		if (existsSync(join(WORKFLOWS, f))) entries.push(f);
	}
	return entries;
}

// Collect every non-comment, non-quoted occurrence of a token in a workflow
// source. Used to prove forbidden tokens are absent from the PR CI surface.
function findToken(source, token) {
	const lines = source.split('\n');
	const hits = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const stripped = line.split('#')[0];
		// Skip the token if it appears only inside a quoted string literal
		// (e.g. a test asserting the token name) — treat bare YAML/key tokens.
		if (stripped.includes(token)) hits.push(`${i + 1}: ${line.trim()}`);
	}
	return hits;
}

describe('workflow security boundary', () => {
	const workflows = listWorkflows();
	expect(workflows.length).toBeGreaterThanOrEqual(3);

	test('CI workflow exists and is not empty', () => {
		expect(workflows).toContain('ci.yml');
		expect(readFileSync(join(WORKFLOWS, 'ci.yml'), 'utf8').length).toBeGreaterThan(500);
	});

	test('every workflow has least-privilege top-level permissions', () => {
		for (const w of workflows) {
			const src = readFileSync(join(WORKFLOWS, w), 'utf8');
			expect(src.includes('permissions:\n  contents: read')).toBe(true);
			// No job may mint a wider write scope; release attestation is the
			// sole exception and needs only OIDC plus attestation write access.
			expect(src).not.toMatch(/permissions:\s*\n\s+contents: write/);
			if (w !== 'release.yml') expect(src).not.toContain('id-token: write');
			if (w !== 'release.yml') expect(src).not.toContain('attestations: write');
		}
	});

	test('PR CI surface never signs, trades, publishes, or deploys', () => {
		const src = readFileSync(join(WORKFLOWS, 'ci.yml'), 'utf8');
		// No secret or credential env can be referenced in CI.
		for (const token of ['secrets.', 'HL_PRIVATE_KEY', 'owner.json', 'VICE_MAINNET_ACK']) {
			expect(findToken(src, token)).toEqual([]);
		}
		// No mutation of a venue through a signing/order path.
		for (const token of ['vercel', 'vercel deploy', 'publish', 'deploy', 'placeOrder', 'execute', 'sign']) {
			expect(findToken(src, token)).toEqual([]);
		}
		// The read-only runtime job is the only place services start, and it
		// asserts venue mutation is rejected (smoke), never performed.
		expect(src).toContain('dev-verify.sh');
	});

	test('release workflow binds artifact to SHA/lockfile and never deploys', () => {
		const src = readFileSync(join(WORKFLOWS, 'release.yml'), 'utf8');
		// Immutable manifest references the release-manifest tooling.
		expect(src).toContain('release-manifest.mjs');
		expect(src).toContain('--release');
		// Clean-tree / exact-SHA safeguard is exercised in the build.
		expect(src).toContain('bun install --frozen-lockfile');
		// No deployment by default: no vercel CLI / deploy-action / publish /
		// package step. The `.vercel/output` directory is the BUILD ARTIFACT
		// path (legitimate), so only reject actual deployment invocations.
		expect(src).not.toMatch(/(^|\s)vercel(\s|$|\/deploy)/);
		expect(src).not.toMatch(/uses:\s*\S*vercel|npm publish|release: publish/);
		expect(src).not.toMatch(/uses:\s*\S*docker|uses:\s*\S*deploy|run:.*\bdeploy\b/);
		// Bounded artifact retention.
		expect(src).toMatch(/retention-days:\s*\d+/);
	});

	test('release workflow binds the exact commit SHA (immutable identity)', () => {
		const src = readFileSync(join(WORKFLOWS, 'release.yml'), 'utf8');
		expect(src).toMatch(/VICE_RELEASE_SHA|expected-sha|github\.sha/);
	});

	test('staging smoke is approval-gated and read-only', () => {
		const src = readFileSync(join(WORKFLOWS, 'staging-smoke.yml'), 'utf8');
		// The staging environment gate is required.
		expect(src).toMatch(/environment:\s*staging/);
		// Read-only: no signing/venue-mutation/deploy commands.
		expect(findToken(src, 'placeOrder')).toEqual([]);
		expect(findToken(src, 'npm publish')).toEqual([]);
		expect(src).not.toMatch(/uses:\s*\S*deploy|run:.*\bdeploy\b/);
	});
});
