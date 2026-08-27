#!/usr/bin/env bun
/**
 * Advanced-order certification evidence validation (hardened).
 *
 * The 2026-08-06 artifact (docs/evidence/advanced-order-certification-2026-08-06.json)
 * recorded phase-level `ok: true` and a 15/15 summary while nested
 * phase->events->detail objects carried `ok: false` lifecycle outcomes
 * (pause/resume/cancel rejected with "Unregistered market identity"). This
 * module refuses to trust top-level booleans or counts:
 *
 *  1. Schema envelope must match the release-gate shape (schemaVersion 1,
 *     testnet, allowlisted low-notional pilot, 0 uncertain, 0 duplicates,
 *     non-empty venue order IDs).
 *  2. Every phase is recursively walked through events/details. Any nested
 *     ok:false (including the non-boolean falsies 0 / "false" / "0"), error
 *     (string or non-empty object), or status in {error, failed, rejected,
 *     uncertain} fails that phase — certification evidence must be clean at
 *     every depth.
 *  3. The summary is RECOMPUTED from the phases; a manifest whose top-level
 *     passed/failed/passedCount/failedCount disagrees with the recomputation
 *     is rejected, because the top-level summary is exactly what lied before.
 *
 * Usage:
 *   bun scripts/advanced-order-evidence.mjs
 *   VICE_ADVANCED_EVIDENCE=/path/to/manifest.json bun scripts/advanced-order-evidence.mjs
 */

const FAILURE_STATUS = /error|failed|rejected|uncertain/i;

export const ADVANCED_EVIDENCE_SCHEMA_VERSION = 1;

/**
 * Recursively collect nested failure markers under a node.
 * Returns [{ path, reason }] — empty means the subtree is clean.
 */
export function findNestedFailures(node, path = '$') {
	const found = [];
	if (!node || typeof node !== 'object') return found;

	if (node.ok === false || node.ok === 0 || node.ok === 'false' || node.ok === '0') {
		found.push({ path, reason: `ok=${JSON.stringify(node.ok)}` });
	}
	if (typeof node.status === 'string' && FAILURE_STATUS.test(node.status)) {
		found.push({ path, reason: `status=${node.status}` });
	}
	const errorValue = node.error;
	if (typeof errorValue === 'string' && errorValue.trim().length > 0) {
		found.push({ path, reason: `error=${errorValue.trim().slice(0, 140)}` });
	} else if (errorValue && typeof errorValue === 'object' && (Array.isArray(errorValue) ? errorValue.length > 0 : Object.keys(errorValue).length > 0)) {
		// A non-empty object/array error (e.g. { message: 'rejected' }) is a
		// failure marker too — the schema writes errors as strings, so any
		// other non-empty shape is a tamper/abnormal signal.
		found.push({ path, reason: `error=${JSON.stringify(errorValue).slice(0, 140)}` });
	}

	for (const [key, value] of Object.entries(node)) {
		if (Array.isArray(value)) {
			value.forEach((item, index) => {
				found.push(...findNestedFailures(item, `${path}.${key}[${index}]`));
			});
		} else if (value && typeof value === 'object') {
			found.push(...findNestedFailures(value, `${path}.${key}`));
		}
	}
	return found;
}

/** Recompute the phase summary from the phases array; never trust the manifest's own summary. */
export function recomputeSummary(phases) {
	const passed = [];
	const failed = [];
	for (const phase of phases) {
		const phasePath = `phases[${phases.indexOf(phase)}]`;
		const nestedFailures = findNestedFailures(phase, phasePath);
		const ok = phase?.ok === true && nestedFailures.length === 0;
		const target = ok ? passed : failed;
		target.push(phase?.phase ?? `<unknown@${phasePath}>`);
	}
	return {
		passed,
		failed,
		passedCount: passed.length,
		failedCount: failed.length
	};
}

/** Validate an advanced-order certification manifest; throws on any integrity failure. */
export function validateAdvancedOrderEvidence(value) {
	if (!value || typeof value !== 'object') {
		throw new Error('advanced-order evidence: manifest must be an object');
	}

	// 1. Schema envelope — must match the release-gate shape.
	const envelopeErrors = [];
	if (value.schemaVersion !== ADVANCED_EVIDENCE_SCHEMA_VERSION) {
		envelopeErrors.push(`schemaVersion must be ${ADVANCED_EVIDENCE_SCHEMA_VERSION}, got ${value.schemaVersion}`);
	}
	if (value.network !== 'testnet') {
		envelopeErrors.push(`network must be 'testnet', got ${value.network}`);
	}
	if (typeof value.releaseBuild !== 'string' || value.releaseBuild.trim() === '') {
		envelopeErrors.push('releaseBuild must be a non-empty release/build identifier');
	}
	if (process.env.VICE_RELEASE_BUILD && value.releaseBuild !== process.env.VICE_RELEASE_BUILD) {
		envelopeErrors.push(`releaseBuild must match VICE_RELEASE_BUILD=${process.env.VICE_RELEASE_BUILD}`);
	}
	if (typeof value.transport !== 'string' || value.transport.length === 0) {
		envelopeErrors.push('transport must be a non-empty string');
	}
	if (!value.pilot || value.pilot.allowlisted !== true || value.pilot.lowNotional !== true) {
		envelopeErrors.push('pilot must be allowlisted and low-notional');
	}
	if (value.uncertainOutcomes !== 0) {
		envelopeErrors.push(`uncertainOutcomes must be 0, got ${value.uncertainOutcomes}`);
	}
	if (value.duplicateOrders !== 0) {
		envelopeErrors.push(`duplicateOrders must be 0, got ${value.duplicateOrders}`);
	}
	if (!Array.isArray(value.venueOrderIds) || value.venueOrderIds.length === 0 || value.venueOrderIds.some((id) => typeof id !== 'string' || id.trim() === '')) {
		throw new Error('advanced evidence must include non-empty venue order IDs');
	}
	if (!Array.isArray(value.phases) || value.phases.length === 0) {
		envelopeErrors.push('phases must be a non-empty array');
	}
	if (envelopeErrors.length > 0) {
		throw new Error(
			`advanced-order evidence: schema envelope invalid\n${envelopeErrors.map((e) => `  - ${e}`).join('\n')}`
		);
	}

	// 2. Recursively walk every phase's events/details for nested failures.
	const nestedFailures = [];
	for (let i = 0; i < value.phases.length; i++) {
		nestedFailures.push(...findNestedFailures(value.phases[i], `phases[${i}]`));
	}
	if (nestedFailures.length > 0) {
		throw new Error(
			`advanced-order evidence: failed lifecycle outcomes — ${nestedFailures.length} nested failure(s) across ${value.phases.length} phase(s)\n` +
				nestedFailures.slice(0, 50).map((f) => `  - ${f.path} ${f.reason}`).join('\n')
		);
	}

	// 3. Recompute the summary from the phases; never trust top-level booleans/counts.
	const recomputed = recomputeSummary(value.phases);
	const summary = value.summary || {};
	const summaryMismatch = [];
	if (JSON.stringify(summary.passed ?? []) !== JSON.stringify(recomputed.passed)) {
		summaryMismatch.push('passed');
	}
	if (JSON.stringify(summary.failed ?? []) !== JSON.stringify(recomputed.failed)) {
		summaryMismatch.push('failed');
	}
	if (summary.passedCount !== recomputed.passedCount) {
		summaryMismatch.push(`passedCount (manifest ${summary.passedCount} != recomputed ${recomputed.passedCount})`);
	}
	if (summary.failedCount !== recomputed.failedCount) {
		summaryMismatch.push(`failedCount (manifest ${summary.failedCount} != recomputed ${recomputed.failedCount})`);
	}
	if (summaryMismatch.length > 0) {
		throw new Error(
			`advanced-order evidence: summary is dishonest — recomputed ${recomputed.passedCount}/${recomputed.failedCount} but manifest claims ${summary.passedCount}/${summary.failedCount}; mismatch on ${summaryMismatch.join(', ')}`
		);
	}
	assertEnabledAdvancedTypes(value);
	return { ...value, summary: recomputed };
}

export function assertEnabledAdvancedTypes(value, env = process.env) {
	if (env.VITE_HL_CERTIFIED_ADVANCED_ORDERS !== 'true') return;
	const phaseNames = new Set(value.phases.map((phase) => phase?.phase));
	const types = ['bracket', 'twap', 'adaptive_twap', 'vwap', 'pov', 'break_even', 'maker', 'conditional_ladder', 'scale', 'chase', 'swarm', 'iceberg', 'oco', 'ping_pong', 'trailing_stop'];
	for (const type of types) {
		const flag = `VITE_HL_CERTIFIED_${type.toUpperCase()}`;
		if (env[flag] === 'true' && !phaseNames.has(type)) {
			throw new Error(`advanced evidence: enabled ${type} has no validated phase in this release/build`);
		}
	}
}

/** Read a manifest from disk (Bun.file) and validate it; returns the validated manifest. */
export async function readAdvancedOrderEvidence(path) {
	const raw = await Bun.file(path).text();
	const value = JSON.parse(raw);
	return validateAdvancedOrderEvidence(value);
}

// CLI entry — validate the newest advanced-order-certification-*.json (or the
// path in $VICE_ADVANCED_EVIDENCE) and exit nonzero on failure.
if (import.meta.main) {
	const { readdirSync } = await import('node:fs');
	const { resolve, join } = await import('node:path');

	const evidenceDir = resolve(process.cwd(), 'docs/evidence');
	const override = process.env.VICE_ADVANCED_EVIDENCE;
	let target = override ? resolve(process.cwd(), override) : null;
	if (!target) {
		const files = readdirSync(evidenceDir)
			.filter((f) => /^advanced-order-certification-.*\.json$/.test(f))
			.sort();
		const latest = files[files.length - 1];
		if (!latest) {
			console.error('advanced-order evidence: no advanced-order-certification-*.json found in docs/evidence/ (or set $VICE_ADVANCED_EVIDENCE)');
			process.exit(1);
		}
		target = join(evidenceDir, latest);
	}

	try {
		await readAdvancedOrderEvidence(target);
		console.log(`VALID: ${target}`);
		process.exit(0);
	} catch (err) {
		console.error(`INVALID: ${target}`);
		console.error(err.message);
		process.exit(1);
	}
}
