#!/usr/bin/env bun
/**
 * Schema validator for the gate3 basic-four-phase testnet evidence manifest
 * (`docs/evidence/gate3-basic-four-phase-*.json`). Mirrors the release-gate
 * boundary of mainnet-evidence.mjs: rejects any manifest that does not prove
 * all four basic-order phases against the authoritative venue with a clean end
 * state and no unresolved outcomes.
 */
export const GATE3_KIND = 'gate3-basic-four-phase';
export const GATE3_PHASES = ['limit-maker', 'stop', 'stop-limit', 'modify'];

export function validateGate3FourPhaseEvidence(value) {
	if (!value || typeof value !== 'object') throw new Error('gate3 evidence must be an object');
	if (value.schemaVersion !== 1) throw new Error('gate3 evidence schemaVersion must be 1');
	if (value.kind !== GATE3_KIND) throw new Error('gate3 evidence kind mismatch');
	if (value.network !== 'testnet') throw new Error('gate3 evidence network must be testnet');
	if (value.phasesTotal !== 4) throw new Error('gate3 evidence must prove all four phases');
	if (value.phasesPassed !== 4) throw new Error('gate3 evidence must have 4/4 phases passed');
	if (value.uncertainOutcomes !== 0) throw new Error('gate3 evidence contains uncertain outcomes');
	if (value.duplicateOrders !== 0) throw new Error('gate3 evidence contains duplicate orders');
	if (!Array.isArray(value.venueOrderIds) || value.venueOrderIds.length !== 4) throw new Error('gate3 evidence must include 4 venue order IDs');
	if (value.cleanup?.verified !== true) throw new Error('gate3 evidence must have a verified clean end state');
	const phaseNames = (value.phases ?? []).map((p) => p.phase);
	for (const name of GATE3_PHASES) {
		if (!phaseNames.includes(name)) throw new Error(`gate3 evidence missing phase: ${name}`);
	}
	// Browser-local signing, low notional scope — never secrets.
	if (!/browser-local signing/.test(value.scope ?? '')) throw new Error('gate3 evidence must declare browser-local signing scope');
	if (value.privateKey || value.secret) throw new Error('gate3 evidence must not contain key material');
	return value;
}

export async function readGate3FourPhaseEvidence(path) {
	const file = Bun.file(path);
	if (!(await file.exists())) throw new Error(`gate3 evidence file does not exist: ${path}`);
	let value;
	try {
		value = JSON.parse(await file.text());
	} catch {
		throw new Error(`gate3 evidence is not valid JSON: ${path}`);
	}
	return validateGate3FourPhaseEvidence(value);
}
