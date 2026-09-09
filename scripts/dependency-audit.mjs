#!/usr/bin/env bun
// Dependency integrity gate (P0 remediation, 2026-08-11).
//
// POLICY (per card DECISIONS):
//   * fail release on any advisory that is not covered by an explicitly
//     documented, time-bounded exception — no severity carve-out, no blanket
//     allowlist, no silent ignore;
//   * an exception must carry: advisory ID (GHSA-...), exposure analysis,
//     owner, and expiry date. Expired exceptions fail the gate.
//   * the lockfile must be in sync with package.json manifests
//     (bun install --frozen-lockfile --dry-run must exit 0).
//
// USAGE:
//   bun scripts/dependency-audit.mjs          # full gate (audit + lockfile)
//   VICE_AUDIT_EXCEPTIONS=path bun ...        # override exceptions file
//
// The module also exports pure functions for deterministic tests.

import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const DEFAULT_EXCEPTIONS_FILE = 'scripts/dependency-audit.exceptions.json';

export const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low'];

// Parse the JSON body of `bun audit --json` (banner line + JSON object).
export function parseAuditJson(raw) {
	if (typeof raw !== 'string') return {};
	const start = raw.indexOf('{');
	if (start === -1) return {};
	try {
		return JSON.parse(raw.slice(start));
	} catch {
		return {};
	}
}

// Normalize an advisory record from `bun audit --json` into a flat shape.
// The canonical id is the GHSA slug from the advisory URL (that is what the
// exceptions file keys on); bun's numeric advisory id is retained as `rawId`.
export function flattenAdvisories(advisories) {
	const out = [];
	for (const [pkg, records] of Object.entries(advisories ?? {})) {
		for (const record of records ?? []) {
			const url = record.url ?? '';
			const ghsa = (url.match(/GHSA-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}/) ?? [])[0] ?? '';
			out.push({
				package: pkg,
				id: ghsa || `${record.id ?? pkg}`,
				rawId: record.id ?? null,
				url,
				title: record.title ?? '',
				severity: (record.severity ?? 'unknown').toLowerCase(),
				vulnerableVersions: record.vulnerable_versions ?? record.vulnerableVersions ?? '',
				cvss: record.cvss?.score ?? null
			});
		}
	}
	return out;
}

// Validate one exception record. Returns an error string or null when valid.
export function validateException(record, now = new Date()) {
	if (!record || typeof record !== 'object') return 'exception record is not an object';
	if (!/^GHSA-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}$/.test(record.id ?? '')) return `exception missing valid GHSA id (got ${JSON.stringify(record.id)})`;
	if (!record.exposure || typeof record.exposure !== 'string' || record.exposure.trim().length < 10) return `exception ${record.id} missing exposure analysis`;
	if (!record.owner || typeof record.owner !== 'string' || !record.owner.trim()) return `exception ${record.id} missing owner`;
	if (!record.expires) return `exception ${record.id} missing expiry date`;
	const expiry = new Date(record.expires);
	if (Number.isNaN(expiry.getTime())) return `exception ${record.id} has invalid expiry ${record.expires}`;
	if (expiry.getTime() <= now.getTime()) return `exception ${record.id} expired on ${record.expires}`;
	return null;
}

// Evaluate advisories against the approved exceptions list.
// Returns { violations: string[], exempted: string[] }.
export function evaluateAdvisories(advisories, exceptions, now = new Date()) {
	const byId = new Map();
	for (const record of exceptions ?? []) byId.set(record.id, record);

	const violations = [];
	const exempted = [];
	for (const adv of flattenAdvisories(advisories)) {
		const exc = byId.get(adv.id);
		if (!exc) {
			violations.push(`advisory ${adv.id} (${adv.package}) [${adv.severity}] ${adv.title} has no approved exception`);
			continue;
		}
		const err = validateException(exc, now);
		if (err) {
			violations.push(`advisory ${adv.id} (${adv.package}) has an exception but it is invalid: ${err}`);
		} else {
			exempted.push(adv.id);
		}
	}
	return { violations, exempted };
}

// Load the exceptions file as an array of records. Missing or non-array => [].
export function loadExceptions(path = resolve(root, DEFAULT_EXCEPTIONS_FILE)) {
	try {
		const parsed = JSON.parse(readFileSync(path, 'utf8'));
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

// Verify the lockfile is in sync with the manifests via bun's frozen install.
// Returns { ok: boolean, output: string }.
export function checkLockfileSync({ root }) {
	const result = spawnSync('bun', ['install', '--frozen-lockfile', '--dry-run'], { cwd: root, encoding: 'utf8' });
	return { ok: result.status === 0, output: (result.stdout ?? '') + (result.stderr ?? '') };
}

// Full dependency-integrity gate. Returns
//   { ok, violations, exempted, exceptionsErrors, advisories, lock }.
export function runDependencyAudit({ root, exceptionsPath }) {
	const auditResult = spawnSync('bun', ['audit', '--json'], { cwd: root, encoding: 'utf8' });
	const advisories = parseAuditJson((auditResult.stdout ?? '') + (auditResult.stderr ?? ''));

	const exceptions = loadExceptions(exceptionsPath);
	const exceptionsErrors = [];
	for (const record of exceptions) {
		const err = validateException(record);
		if (err) exceptionsErrors.push(err);
	}

	const { violations, exempted } = evaluateAdvisories(advisories, exceptions);
	const lock = checkLockfileSync({ root });
	const flat = flattenAdvisories(advisories);
	const ok = violations.length === 0 && exceptionsErrors.length === 0 && lock.ok;
	return { ok, violations, exempted, exceptionsErrors, advisories: flat, lock };
}

// Standalone runner (only when invoked directly, not when imported).
const root = resolve(import.meta.dir, '..');
if (process.argv[1] && resolve(process.argv[1]) === import.meta.path) {
	const exceptionsPath = resolve(root, process.env.VICE_AUDIT_EXCEPTIONS ?? DEFAULT_EXCEPTIONS_FILE);
	const audit = runDependencyAudit({ root, exceptionsPath });
	if (!audit.ok) {
		const lines = [...audit.violations, ...audit.exceptionsErrors];
		if (!audit.lock.ok) lines.push(`lockfile out of sync: ${audit.lock.output.trim()}`);
		console.error(`Dependency integrity gate failed:\n${lines.join('\n')}`);
		process.exit(1);
	}
	console.log(`✓ dependency audit (${audit.advisories.length} advisories, ${audit.exempted.length} exempted)`);
	console.log('✓ lockfile in sync');
}
