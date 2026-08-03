#!/usr/bin/env bun
/**
 * Validate the newest funded-testnet evidence manifest against the release
 * gate's schema. Reads every docs/evidence/funded-testnet-*.json file and
 * validates the most recent one (by filename date), mirroring how the release
 * gate consumes VICE_FUNDED_TESTNET_EVIDENCE.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readMainnetEvidence } from './mainnet-evidence.mjs';

const dir = resolve(import.meta.dir, '..', 'docs', 'evidence');
const explicit = process.env.VICE_FUNDED_TESTNET_EVIDENCE;

let path;
if (explicit) {
	path = resolve(explicit);
} else {
	const files = (await readdir(dir)).filter((name) => name.startsWith('funded-testnet-') && name.endsWith('.json')).sort();
	if (files.length === 0) {
		console.error('No funded-testnet evidence manifest found in docs/evidence/.');
		process.exit(2);
	}
	path = join(dir, files[files.length - 1]);
}

const evidence = await readMainnetEvidence(path);
console.log(`Funded testnet evidence validated: ${path}`);
console.log(`  venueOrderIds=${evidence.venueOrderIds.join(',')}`);
console.log(`  stories=${JSON.stringify(evidence.stories)}`);
console.log(`  uncertain=${evidence.uncertainOutcomes} duplicates=${evidence.duplicateOrders}`);
