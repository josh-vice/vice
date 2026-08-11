#!/usr/bin/env bun
/**
 * Validate the newest gate3 four-phase testnet evidence manifest against the
 * release-gate schema (docs/evidence/gate3-basic-four-phase-*.json).
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readGate3FourPhaseEvidence } from './gate3-four-phase-evidence.mjs';

const dir = resolve(import.meta.dir, '..', 'docs', 'evidence');
const explicit = process.env.VICE_GATE3_EVIDENCE;

let path;
if (explicit) {
	path = resolve(explicit);
} else {
	const files = (await readdir(dir)).filter((name) => name.startsWith('gate3-basic-four-phase-') && name.endsWith('.json')).sort();
	if (files.length === 0) {
		console.error('No gate3 four-phase evidence manifest found in docs/evidence/.');
		process.exit(2);
	}
	path = join(dir, files[files.length - 1]);
}

const evidence = await readGate3FourPhaseEvidence(path);
console.log(`Gate3 four-phase evidence validated: ${path}`);
console.log(`  phases=${evidence.phasesPassed}/${evidence.phasesTotal} uncertain=${evidence.uncertainOutcomes} duplicates=${evidence.duplicateOrders}`);
console.log(`  venueOrderIds=${evidence.venueOrderIds.join(',')} cleanEnd=${evidence.cleanup.verified}`);
