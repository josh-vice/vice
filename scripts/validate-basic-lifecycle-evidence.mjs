#!/usr/bin/env bun
/**
 * validate-basic-lifecycle-evidence.mjs
 *
 * Gate 3 — evidence-integrity validator for the BASIC beta lifecycle
 * certification manifest (docs/evidence/basic-lifecycle-certification-*.json).
 *
 * Purpose: the manifest's summary must be DERIVED from the phase event logs,
 * never hand-edited. This validator recomputes every phase outcome recursively
 * from its nested event log and:
 *   1. Recomputes passed/failed and fails if the stored summary diverges.
 *   2. Recursively walks every event for ANY ok:false, error, or 'uncertain'
 *      nested outcome — a single one flips the phase (and the certification).
 *   3. Verifies zero duplicate venue order ids and zero declared uncertain
 *      outcomes.
 *   4. Verifies schemaVersion/network/pilot invariants.
 *   5. Exits nonzero unless EVERY phase passes (FAIL-on-any-phase rule).
 *
 * Usage:
 *   bun scripts/validate-basic-lifecycle-evidence.mjs [path-to-manifest.json]
 */
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const DEFAULT = resolve(import.meta.dir, '..', 'docs', 'evidence', 'basic-lifecycle-certification-2026-08-11.json');
const path = process.argv[2] ?? DEFAULT;

// Recursively scan for genuine failure markers. A node is a failure if it
// carries ok:false, a non-empty error field, or an 'uncertain' outcome STRING.
// Standalone boolean-false leaves (e.g. ack.uncertain:false, ack.reconciled:false)
// are legitimate "not uncertain / not yet reconciled" flags and are NOT failures.
function scanForFailure(value, trail, found) {
	if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i += 1) scanForFailure(value[i], `${trail}[${i}]`, found);
		return;
	}
	if (value && typeof value === 'object') {
		// Outcome node? An `ok` key makes it an outcome carrier.
		if (Object.prototype.hasOwnProperty.call(value, 'ok')) {
			if (value.ok === false) found.push(`${trail}.ok=false`);
			else if (typeof value.ok === 'string' && /uncertain/i.test(value.ok)) found.push(`${trail}.ok=${value.ok}`);
		}
		if (typeof value.error === 'string' && value.error.length > 0) found.push(`${trail}.error=${value.error.slice(0, 120)}`);
		if (typeof value.status === 'string' && /uncertain/i.test(value.status)) found.push(`${trail}.status=${value.status}`);
		for (const [k, v] of Object.entries(value)) scanForFailure(v, `${trail}.${k}`, found);
		return;
	}
}

// A phase is PASS only if it has an event log with zero failed leaves and no
// error field at the top level. A missing/empty event log is a FAIL.
function phasePass(phase) {
	if (!phase || typeof phase !== 'object') return false;
	if (phase.ok === false) return false;
	if (phase.error) return false;
	const events = Array.isArray(phase.events) ? phase.events : [];
	if (events.length === 0) return false;
	const issues = [];
	scanForFailure(events, 'events', issues);
	// A leaf with explicit error/ok:false inside the top-level result object.
	if (phase.ok !== undefined && phase.ok !== true) issues.push('phase.ok!==true');
	return issues.length === 0;
}

const manifest = JSON.parse(await readFile(path, 'utf8'));

const problems = [];
if (manifest.schemaVersion !== 1) problems.push(`schemaVersion must be 1, got ${manifest.schemaVersion}`);
if (manifest.network !== 'testnet') problems.push(`network must be testnet, got ${manifest.network}`);
if (!manifest.pilot?.allowlisted) problems.push('pilot.allowlisted must be true');
if (!manifest.pilot?.lowNotional) problems.push('pilot.lowNotional must be true');
if (!Array.isArray(manifest.phases) || manifest.phases.length === 0) problems.push('phases must be a non-empty array');

// Recompute outcomes from event logs.
const recomputed = [];
for (const phase of manifest.phases ?? []) {
	const pass = phasePass(phase);
	recomputed.push({ phase: phase?.phase, pass, error: phase?.error ?? null });
}

const storedPassed = new Set(manifest.summary?.passed ?? []);
const storedFailed = new Set(manifest.summary?.failed ?? []);
let summaryMismatch = false;
for (const r of recomputed) {
	const storedAsPass = storedPassed.has(r.phase);
	const storedAsFail = storedFailed.has(r.phase);
	if (r.pass && storedAsPass) continue;
	if (!r.pass && storedAsFail) continue;
	summaryMismatch = true;
	problems.push(`summary mismatch for phase "${r.phase}": recomputed=${r.pass ? 'pass' : 'fail'}, stored=${storedAsPass ? 'pass' : storedAsFail ? 'fail' : 'absent'}`);
}

const recomputedPassedCount = recomputed.filter((r) => r.pass).length;
const recomputedFailedCount = recomputed.length - recomputedPassedCount;
if (recomputedPassedCount !== (manifest.summary?.passedCount ?? -1)) {
	summaryMismatch = true;
	problems.push(`summary passedCount mismatch: recomputed=${recomputedPassedCount}, stored=${manifest.summary?.passedCount}`);
}
if (recomputedFailedCount !== (manifest.summary?.failedCount ?? -1)) {
	summaryMismatch = true;
	problems.push(`summary failedCount mismatch: recomputed=${recomputedFailedCount}, stored=${manifest.summary?.failedCount}`);
}

// Duplicate / uncertain checks.
const ids = [];
for (const phase of manifest.phases ?? []) for (const id of phase.venueOrderIds ?? []) ids.push(String(id));
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length > 0) problems.push(`duplicate venueOrderIds: ${[...new Set(dupes)].join(', ')}`);
if (manifest.duplicateOrders !== 0) problems.push(`duplicateOrders must be 0, got ${manifest.duplicateOrders}`);
if (manifest.uncertainOutcomes !== 0) problems.push(`uncertainOutcomes must be 0, got ${manifest.uncertainOutcomes}`);

// Emit the integrity report.
const report = {
	schemaVersion: manifest.schemaVersion,
	network: manifest.network,
	manifest: path,
	phases: recomputed,
	recomputedSummary: {
		passed: recomputed.filter((r) => r.pass).map((r) => r.phase),
		failed: recomputed.filter((r) => !r.pass).map((r) => r.phase),
		passedCount: recomputedPassedCount,
		failedCount: recomputedFailedCount
	},
	summaryDerivedCorrectly: !summaryMismatch,
	duplicateOrders: dupes.length,
	uncertainOutcomes: manifest.uncertainOutcomes,
	problems
};

console.log(JSON.stringify(report, null, 2));
const ok = problems.length === 0 && recomputedFailedCount === 0 && recomputed.length > 0;
console.log(`INTEGRITY=${ok ? 'PASS' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
