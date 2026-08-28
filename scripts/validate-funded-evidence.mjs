#!/usr/bin/env bun
/**
 * Validate the newest mainnet evidence manifest against the release schema.
 * Reads an explicit VICE_MAINNET_EVIDENCE path; checked-in historical testnet
 * manifests are never eligible for final readiness.
 */
import { resolve } from 'node:path';
import { readMainnetEvidence } from './mainnet-evidence.mjs';

const explicit = process.env.VICE_MAINNET_EVIDENCE;
if (!explicit) {
	console.error('VICE_MAINNET_EVIDENCE is required; historical testnet evidence cannot certify mainnet.');
	process.exit(2);
}
const path = resolve(explicit);
const evidence = await readMainnetEvidence(path);
console.log(`Mainnet evidence validated: ${path}`);
console.log(`  venueOrderIds=${evidence.venueOrderIds.join(',')}`);
console.log(`  stories=${JSON.stringify(evidence.stories)}`);
console.log(`  uncertain=${evidence.uncertainOutcomes} duplicates=${evidence.duplicateOrders}`);
