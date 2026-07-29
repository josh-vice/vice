import { resolve } from 'node:path';

export const EVIDENCE_SCHEMA_VERSION = 1;
export const REQUIRED_STORIES = ['US-002', 'US-003', 'US-004'];

export function validateMainnetEvidence(value) {
	if (!value || typeof value !== 'object') throw new Error('funded evidence must be an object');
	if (value.schemaVersion !== EVIDENCE_SCHEMA_VERSION) throw new Error(`funded evidence schemaVersion must be ${EVIDENCE_SCHEMA_VERSION}`);
	if (value.network !== 'testnet') throw new Error('funded evidence network must be testnet');
	if (value.pilot?.allowlisted !== true || value.pilot?.lowNotional !== true) throw new Error('funded evidence must include an allowlisted low-notional pilot');
	if (value.uncertainOutcomes !== 0) throw new Error('funded evidence contains uncertain outcomes');
	if (value.duplicateOrders !== 0) throw new Error('funded evidence contains duplicate orders');
	if (!Array.isArray(value.venueOrderIds) || value.venueOrderIds.length === 0) throw new Error('funded evidence must include venue order IDs');
	for (const story of REQUIRED_STORIES) {
		if (!value.stories?.[story] || value.stories[story].passes < 2) throw new Error(`${story} requires at least two funded-testnet passes`);
		if (value.stories[story].reconnect !== true || value.stories[story].restart !== true) throw new Error(`${story} requires reconnect and restart evidence`);
	}
	return value;
}

export async function readMainnetEvidence(path) {
	if (!path) throw new Error('VICE_FUNDED_TESTNET_EVIDENCE is required for mainnet');
	const file = Bun.file(resolve(path));
	if (!(await file.exists())) throw new Error(`funded evidence file does not exist: ${path}`);
	let value;
	try {
		value = JSON.parse(await file.text());
	} catch {
		throw new Error(`funded evidence is not valid JSON: ${path}`);
	}
	return validateMainnetEvidence(value);
}
