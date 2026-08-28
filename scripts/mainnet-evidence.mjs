import { resolve } from 'node:path';

export const EVIDENCE_SCHEMA_VERSION = 2;
export const REQUIRED_EVIDENCE_FIELDS = ['commit', 'artifact', 'lockfileSha256', 'policySha256', 'captureWindow', 'validatorVersion', 'features', 'actions', 'streams', 'cleanup'];
export const REQUIRED_STORIES = ['US-002', 'US-003', 'US-004'];
export const REQUIRED_TRADING_ACTIONS = ['wallet.connect', 'order.submit', 'order.reconcile', 'order.modify', 'order.cancel', 'order.scale', 'position.close', 'position.reverse', 'position.flatten', 'algo.start', 'algo.cancel', 'deadman.arm', 'deadman.clear', 'release.reconcile'];
export const REQUIRED_EXECUTION_FEATURES = ['limit', 'market', 'stop', 'stop_limit', 'bracket', 'twap', 'adaptive_twap', 'vwap', 'pov', 'scale', 'chase', 'swarm', 'iceberg', 'oco', 'ping_pong', 'trailing_stop', 'break_even', 'maker', 'conditional_ladder', 'reverse', 'flatten', 'deadman'];
export const REQUIRED_EVIDENCE_ACTIONS = [...new Set([...REQUIRED_TRADING_ACTIONS, ...REQUIRED_EXECUTION_FEATURES])];

function fullSha(value) {
	return typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);
}
function hash(value, field) {
	if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${field} must be a SHA-256 digest`);
}
function nonEmptyArray(value, field) {
	if (!Array.isArray(value) || value.length === 0) throw new Error(`${field} must be a non-empty array`);
}
function exactCoverage(actual, expected, field) {
	if (!expected) return;
	const found = new Set(actual);
	const missing = expected.filter((id) => !found.has(id));
	if (missing.length) throw new Error(`${field} missing exact coverage: ${missing.join(', ')}`);
}
function validateObservedActions(value, expected) {
	if (!expected) return;
	if (!Array.isArray(value.actionResults) || value.actionResults.length === 0) throw new Error('actionResults are required for exact mainnet certification');
	const passed = new Set();
	for (const result of value.actionResults) {
		if (!result || typeof result.actionId !== 'string' || result.status !== 'passed' || typeof result.observedAt !== 'string' || result.cleanup !== true) throw new Error('actionResults must contain passed, observed, and cleaned scenarios');
		passed.add(result.actionId);
		if (/(order|position|basket|algo|modify|cancel|flatten|reverse)/i.test(result.actionId) && (!result.before || !result.after || !Array.isArray(result.venueOrderIds) || result.venueOrderIds.length === 0)) throw new Error(`mutating action ${result.actionId} requires before/after snapshots and venue order IDs`);
	}
	const missing = expected.filter((id) => !passed.has(id));
	if (missing.length) throw new Error(`actionResults missing passed scenarios: ${missing.join(', ')}`);
}

export function validateMainnetEvidence(value, { expectedActionIds, expectedCriterionIds, expectedStreamIds, expectedSha } = {}) {
	if (!value || typeof value !== 'object') throw new Error('mainnet evidence must be an object');
	if (value.schemaVersion !== EVIDENCE_SCHEMA_VERSION) throw new Error(`mainnet evidence schemaVersion must be ${EVIDENCE_SCHEMA_VERSION}`);
	if (value.network !== 'mainnet') throw new Error('mainnet evidence network must be mainnet');
	if (!fullSha(value.commit)) throw new Error('mainnet evidence commit must be a full commit SHA');
	if (expectedSha && value.commit.toLowerCase() !== expectedSha.toLowerCase()) throw new Error(`mainnet evidence commit does not match expected SHA ${expectedSha}`);
	for (const field of ['artifact', 'lockfileSha256', 'policySha256']) {
		if (field === 'artifact') {
			if (!value.artifact || !fullSha(value.artifact.commit)) throw new Error('artifact must include the full release commit SHA');
			hash(value.artifact.sha256, 'artifact.sha256');
			if (!Number.isSafeInteger(value.artifact.sizeBytes) || value.artifact.sizeBytes <= 0) throw new Error('artifact.sizeBytes must be positive');
		} else hash(value[field], field);
	}
	if (value.artifact.commit.toLowerCase() !== value.commit.toLowerCase()) throw new Error('artifact commit does not match evidence commit');
	for (const field of ['captureWindow', 'validatorVersion']) if (!value[field]) throw new Error(`mainnet evidence ${field} is required`);
	for (const field of ['features', 'actions', 'streams']) nonEmptyArray(value[field], field);
	exactCoverage(value.actions, expectedActionIds, 'actions');
	exactCoverage(value.criteria ?? [], expectedCriterionIds, 'criteria');
	exactCoverage(value.streams, expectedStreamIds, 'streams');
	if (!value.cleanup || value.cleanup.zeroOpenOrders !== true || value.cleanup.zeroUnintendedPositions !== true || value.cleanup.zeroUnresolvedCommands !== true || value.cleanup.zeroRunningJobs !== true) throw new Error('mainnet evidence cleanup must prove a clean final state');
	validateObservedActions(value, expectedActionIds);
	if (value.uncertainOutcomes !== 0) throw new Error('mainnet evidence contains uncertain outcomes');
	if (value.duplicateOrders !== 0) throw new Error('mainnet evidence contains duplicate orders');
	if (!Array.isArray(value.venueOrderIds) || value.venueOrderIds.length === 0) throw new Error('mainnet evidence must include venue order IDs');
	for (const story of REQUIRED_STORIES) {
		if (!value.stories?.[story] || value.stories[story].passes < 2) throw new Error(`${story} requires at least two mainnet passes`);
		if (value.stories[story].reconnect !== true || value.stories[story].restart !== true) throw new Error(`${story} requires reconnect and restart evidence`);
	}
	return value;
}

export async function readMainnetEvidence(path, options = {}) {
	if (!path) throw new Error('VICE_MAINNET_EVIDENCE is required');
	const file = Bun.file(resolve(path));
	if (!(await file.exists())) throw new Error(`mainnet evidence file does not exist: ${path}`);
	let value;
	try {
		value = JSON.parse(await file.text());
	} catch {
		throw new Error(`mainnet evidence is not valid JSON: ${path}`);
	}
	return validateMainnetEvidence(value, options);
}

if (import.meta.main) {
	const run = async () => {
		const root = resolve(import.meta.dir, '..');
		const streamCatalog = await Bun.file(resolve(root, 'docs/data/stream-catalog.json')).json();
		const evidence = await readMainnetEvidence(process.env.VICE_MAINNET_EVIDENCE ?? process.argv[2], {
			expectedActionIds: REQUIRED_EVIDENCE_ACTIONS,
			expectedStreamIds: streamCatalog.streams.map((stream) => stream.id)
		});
		exactCoverage(evidence.features, REQUIRED_EXECUTION_FEATURES, 'features');
	};
	run().then(() => console.log('Mainnet evidence schema v2 passed.')).catch((error) => { console.error(`Mainnet evidence validation failed: ${error.message}`); process.exit(1); });
}
