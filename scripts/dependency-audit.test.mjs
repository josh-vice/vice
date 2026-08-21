import { describe, expect, test } from 'bun:test';
import {
	parseAuditJson,
	flattenAdvisories,
	validateException,
	evaluateAdvisories,
	loadExceptions,
	checkLockfileSync,
	runDependencyAudit
} from './dependency-audit.mjs';

const SAMPLE_AUDIT = `bun audit v1.3.9 (cf6cdbbb)
{"@sveltejs/kit":[{"id":1138740,"url":"https://github.com/advisories/GHSA-29g2-3rmr-qm68","title":"SvelteKit: ReDoS","severity":"moderate","vulnerable_versions":"<=2.70.1","cvss":{"score":5.3}}],"nanoid":[{"id":1138813,"url":"https://github.com/advisories/GHSA-2v37-7h3g-55p8","title":"nanoid: loop","severity":"high","vulnerable_versions":"<3.3.17","cvss":{"score":5.9}}]}`;

describe('dependency audit JSON parsing', () => {
	test('strips the banner line and parses the advisory object', () => {
		const parsed = parseAuditJson(SAMPLE_AUDIT);
		expect(parsed['@sveltejs/kit']).toHaveLength(1);
		expect(parsed.nanoid).toHaveLength(1);
	});

	test('flattens per-package advisories into flat records', () => {
		const flat = flattenAdvisories(parseAuditJson(SAMPLE_AUDIT));
		expect(flat).toHaveLength(2);
		expect(flat[0]).toMatchObject({ package: '@sveltejs/kit', severity: 'moderate' });
		expect(flat[1]).toMatchObject({ package: 'nanoid', severity: 'high' });
	});

	test('tolerates empty and malformed input', () => {
		expect(parseAuditJson('')).toEqual({});
		expect(parseAuditJson('not json at all')).toEqual({});
		expect(flattenAdvisories(null)).toEqual([]);
		expect(flattenAdvisories({})).toEqual([]);
	});
});

describe('exception record validation', () => {
	const now = new Date('2026-08-11T00:00:00Z');

	test('accepts a complete, unexpired exception', () => {
		const err = validateException({
			id: 'GHSA-29g2-3rmr-qm68',
			exposure: 'ReDoS in content negotiation; only reachable from an unauthenticated Accept header on the SSR surface.',
			owner: 'l0k1',
			expires: '2026-12-31'
		}, now);
		expect(err).toBeNull();
	});

	test('rejects records with malformed GHSA ids', () => {
		const err = validateException({
			id: 'not-an-advisory',
			exposure: 'enough exposure text to pass the length check here',
			owner: 'l0k1',
			expires: '2026-12-31'
		}, now);
		expect(err).toContain('GHSA');
	});

	test('rejects missing exposure analysis (generic bypass prevention)', () => {
		const err = validateException({
			id: 'GHSA-29g2-3rmr-qm68',
			exposure: '',
			owner: 'l0k1',
			expires: '2026-12-31'
		}, now);
		expect(err).toContain('exposure');
	});

	test('rejects missing owner', () => {
		const err = validateException({
			id: 'GHSA-29g2-3rmr-qm68',
			exposure: 'enough exposure text to pass the length check here',
			expires: '2026-12-31'
		}, now);
		expect(err).toContain('owner');
	});

	test('rejects missing expiry date', () => {
		const err = validateException({
			id: 'GHSA-29g2-3rmr-qm68',
			exposure: 'enough exposure text to pass the length check here',
			owner: 'l0k1'
		}, now);
		expect(err).toContain('expiry');
	});

	test('rejects expired exceptions', () => {
		const err = validateException({
			id: 'GHSA-29g2-3rmr-qm68',
			exposure: 'enough exposure text to pass the length check here',
			owner: 'l0k1',
			expires: '2026-01-01'
		}, now);
		expect(err).toContain('expired');
	});
});

describe('advisory policy evaluation', () => {
	const now = new Date('2026-08-11T00:00:00Z');

	test('an approved, unexpired exception exempts only its advisory id', () => {
		const exceptions = [{
			id: 'GHSA-2v37-7h3g-55p8',
			exposure: 'nanoid loop only reachable in dev-time asset hashing; the production build precomputes hashes.',
			owner: 'l0k1',
			expires: '2026-12-31'
		}];
		const { violations, exempted } = evaluateAdvisories(parseAuditJson(SAMPLE_AUDIT), exceptions, now);
		expect(exempted).toEqual(['GHSA-2v37-7h3g-55p8']);
		expect(violations).toHaveLength(1); // the SvelteKit advisory remains unapproved
		expect(violations[0]).toContain('GHSA-29g2-3rmr-qm68');
	});

	test('an unapproved advisory is a violation', () => {
		const { violations, exempted } = evaluateAdvisories(parseAuditJson(SAMPLE_AUDIT), [], now);
		expect(exempted).toEqual([]);
		expect(violations).toHaveLength(2);
		expect(violations[0]).toContain('no approved exception');
	});

	test('an expired exception fails the gate', () => {
		const exceptions = [{
			id: 'GHSA-2v37-7h3g-55p8',
			exposure: 'nanoid loop only reachable in dev-time asset hashing; the production build precomputes hashes.',
			owner: 'l0k1',
			expires: '2026-01-01'
		}];
		const { violations, exempted } = evaluateAdvisories(parseAuditJson(SAMPLE_AUDIT), exceptions, now);
		expect(exempted).toEqual([]);
		expect(violations).toHaveLength(2);
		expect(violations.find((v) => v.includes('GHSA-2v37-7h3g-55p8'))).toContain('expired');
	});

	test('no advisories means no violations and no exemptions', () => {
		const { violations, exempted } = evaluateAdvisories({}, [], now);
		expect(violations).toEqual([]);
		expect(exempted).toEqual([]);
	});

	test('a malformed exception record yields a violation referencing the exception error', () => {
		const exceptions = [{
			id: 'GHSA-29g2-3rmr-qm68',
			exposure: 'x',
			owner: 'l0k1',
			expires: '2026-12-31'
		}];
		const { violations } = evaluateAdvisories(parseAuditJson(SAMPLE_AUDIT), exceptions, now);
		expect(violations).toHaveLength(2);
		expect(violations[0]).toContain('exposure');
	});
});

describe('exceptions file loading', () => {
	test('loads the committed empty exceptions file', () => {
		const exceptions = loadExceptions('scripts/dependency-audit.exceptions.json');
		expect(Array.isArray(exceptions)).toBe(true);
		expect(exceptions).toEqual([]);
	});

	test('returns an empty list for a missing exceptions file', () => {
		expect(loadExceptions('scripts/does-not-exist.json')).toEqual([]);
	});
});

describe('lockfile sync primitive', () => {
	test('returns a boolean ok result from bun install --frozen-lockfile --dry-run', () => {
		const lock = checkLockfileSync({ root: process.cwd() });
		expect(typeof lock.ok).toBe('boolean');
		expect(typeof lock.output).toBe('string');
	});
});

describe('full gate shape', () => {
	test('runDependencyAudit returns the documented result object', () => {
		const result = runDependencyAudit({ root: process.cwd(), exceptionsPath: 'scripts/dependency-audit.exceptions.json' });
		expect(typeof result.ok).toBe('boolean');
		expect(Array.isArray(result.violations)).toBe(true);
		expect(Array.isArray(result.exempted)).toBe(true);
		expect(Array.isArray(result.exceptionsErrors)).toBe(true);
		expect(Array.isArray(result.advisories)).toBe(true);
		expect(typeof result.lock.ok).toBe('boolean');
	});
});
