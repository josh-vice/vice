import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	evaluatePromotion,
	assertMainnetPromotable,
	defaultJournalPath,
	GUARDRAIL_SCHEMA_VERSION,
	APPROVAL_RECORD_KIND,
	RELEASE_AUTHORITY_DEFAULT,
	CANARY_SCOPE,
	MAINNET_SCOPE
} from './mainnet-guardrails.mjs';

// The recording-side module (scripts/release-approval.mjs) is committed by the
// sibling worker; load it lazily so this file stays valid if it is not present
// in a fresh checkout yet. The integration tests below skip when it is absent.
let buildApprovalRecord = null;
try {
	({ buildApprovalRecord } = await import('./release-approval.mjs'));
} catch {
	buildApprovalRecord = null;
}

const BUILD = 'viceterminal-2026-08-04';

// Canonical record shape produced by scripts/release-approval.mjs.
const validApproval = () => ({
	schemaVersion: GUARDRAIL_SCHEMA_VERSION,
	kind: APPROVAL_RECORD_KIND,
	release: {
		build: BUILD,
		scope: 'low-notional canary to mainnet promotion',
		network: 'mainnet',
		allowlist: ['BTC', 'ETH'],
		cap: { value: 50, unit: 'USDC', scope: 'per-order' },
		operators: ['josh']
	},
	fundedCertification: {
		evidenceRef: 'docs/evidence/funded-testnet-2026-08-03.json',
		sha256: 'a'.repeat(64),
		validated: true,
		validator: 'readMainnetEvidence@scripts/mainnet-evidence.mjs',
		schemaVersion: 1,
		checkedAt: '2026-08-04T00:00:00.000Z'
	},
	approvals: [
		{ item: 'allowlist', order: 1, approver: RELEASE_AUTHORITY_DEFAULT, approvedAt: '2026-08-04T00:00:00.000Z', decision: 'approved' },
		{ item: 'cap', order: 2, approver: RELEASE_AUTHORITY_DEFAULT, approvedAt: '2026-08-04T00:00:00.000Z', decision: 'approved' },
		{
			item: 'observation-window',
			order: 3,
			approver: RELEASE_AUTHORITY_DEFAULT,
			approvedAt: '2026-08-04T00:00:00.000Z',
			decision: 'approved',
			evidence: {
				deployedBuild: BUILD,
				window: {
					start: '2026-08-04T00:00:00.000Z',
					end: '2026-08-04T23:59:59.000Z',
					result: 'pass',
					manifestRef: 'docs/evidence/observation-2026-08-04.json',
					outcomes: { uncertain: 0, duplicates: 0 },
					reconciliation: 'clean'
				}
			}
		},
		{ item: 'named-operator', order: 4, approver: RELEASE_AUTHORITY_DEFAULT, approvedAt: '2026-08-04T00:00:00.000Z', decision: 'approved' }
	],
	finalDecision: { approver: RELEASE_AUTHORITY_DEFAULT, decision: 'go', decidedAt: '2026-08-04T00:00:00.000Z', releaseBuild: BUILD },
	mainnetPromotable: true
});

const fullRuntime = (overrides = {}) => ({
	network: 'mainnet',
	releaseBuild: BUILD,
	allowlist: 'BTC,ETH',
	cap: '50:USDC:per-order',
	operator: 'josh',
	observationManifest: 'docs/evidence/observation-2026-08-04.json',
	canaryOperator: 'canary-bot',
	releaseAuthority: RELEASE_AUTHORITY_DEFAULT,
	now: new Date('2026-08-05T00:00:00Z'),
	...overrides
});

function blockGates(result) {
	return Object.fromEntries(result.blocks.map((b) => [b.gate, b.reason]));
}

describe('fail-closed mainnet promotion guardrails', () => {
	test('canary scope is unaffected: no gates, no approval record required', () => {
		const result = evaluatePromotion({ approval: null, runtime: { network: 'testnet' } });
		expect(result.promotable).toBe(true);
		expect(result.scope).toBe(CANARY_SCOPE);
		expect(result.blocks).toHaveLength(0);
	});

	test('mainnet with no approval record fails closed with recorded reason', () => {
		const result = evaluatePromotion({ approval: null, runtime: fullRuntime() });
		expect(result.promotable).toBe(false);
		expect(result.scope).toBe(MAINNET_SCOPE);
		const gates = blockGates(result);
		expect(gates['approval-record']).toContain('no external release-authority approval record');
	});

	test('approval record present but no gate values set: every gate blocked', () => {
		const result = evaluatePromotion({ approval: validApproval(), runtime: fullRuntime({ allowlist: '', cap: '', operator: '', observationManifest: '', releaseBuild: '' }) });
		expect(result.promotable).toBe(false);
		const gates = blockGates(result);
		expect(gates['release']).toContain('not set');
		expect(gates['allowlist']).toContain('empty');
		expect(gates['cap']).toContain('missing');
		expect(gates['observation-window']).toContain('not set');
		expect(gates['named-operator']).toContain('not set');
	});

	test('allowlist mismatch blocks promotion', () => {
		const result = evaluatePromotion({ approval: validApproval(), runtime: fullRuntime({ allowlist: 'BTC,SOL' }) });
		expect(result.promotable).toBe(false);
		expect(blockGates(result)['allowlist']).toContain('allowlist mismatch');
	});

	test('cap mismatch blocks promotion', () => {
		const result = evaluatePromotion({ approval: validApproval(), runtime: fullRuntime({ cap: '5000:USDC:per-order' }) });
		expect(result.promotable).toBe(false);
		expect(blockGates(result)['cap']).toContain('cap mismatch');
	});

	test('observation window not completed (no pass result) blocks promotion', () => {
		const approval = validApproval();
		approval.approvals[2].evidence.window.result = 'fail';
		const result = evaluatePromotion({ approval, runtime: fullRuntime() });
		expect(result.promotable).toBe(false);
		expect(blockGates(result)['observation-window']).toContain('not completed');
	});

	test('observation window with end in the future blocks promotion', () => {
		const approval = validApproval();
		approval.approvals[2].evidence.window.end = '2026-08-09T00:00:00Z';
		approval.approvals[2].evidence.window.result = 'pass';
		const result = evaluatePromotion({ approval, runtime: fullRuntime() });
		expect(result.promotable).toBe(false);
		expect(blockGates(result)['observation-window']).toContain('not completed');
	});

	test('observation manifest mismatch blocks promotion', () => {
		const result = evaluatePromotion({ approval: validApproval(), runtime: fullRuntime({ observationManifest: 'docs/evidence/other.json' }) });
		expect(result.promotable).toBe(false);
		expect(blockGates(result)['observation-window']).toContain('manifest mismatch');
	});

	test('operator not in approved named-operator list blocks promotion', () => {
		const result = evaluatePromotion({ approval: validApproval(), runtime: fullRuntime({ operator: 'ops-beta' }) });
		expect(result.promotable).toBe(false);
		expect(blockGates(result)['named-operator']).toContain('not in the approved named-operator list');
	});

	test('canary deployer cannot self-authorize: canary operator equals release authority', () => {
		const result = evaluatePromotion({ approval: validApproval(), runtime: fullRuntime({ canaryOperator: RELEASE_AUTHORITY_DEFAULT }) });
		expect(result.promotable).toBe(false);
		expect(blockGates(result)['authority']).toContain('canary deployer cannot self-authorize');
	});

	test('approval recorded by a non-authority approver blocks promotion', () => {
		const approval = validApproval();
		approval.approvals[0].approver = 'someone-else';
		const result = evaluatePromotion({ approval, runtime: fullRuntime() });
		expect(result.promotable).toBe(false);
		expect(blockGates(result)['authority']).toContain('must all be issued by release authority');
	});

	test('final go/no-go absent blocks promotion', () => {
		const approval = validApproval();
		approval.finalDecision = { approver: RELEASE_AUTHORITY_DEFAULT, decision: 'no-go', decidedAt: '2026-08-04T00:00:00.000Z', releaseBuild: BUILD };
		const result = evaluatePromotion({ approval, runtime: fullRuntime() });
		expect(result.promotable).toBe(false);
		expect(blockGates(result)['final-go']).toContain('not \'go\'');
	});

	test('final go/no-go by a different authority blocks promotion', () => {
		const approval = validApproval();
		approval.finalDecision.approver = 'canary-bot';
		const result = evaluatePromotion({ approval, runtime: fullRuntime() });
		expect(result.promotable).toBe(false);
		expect(blockGates(result)['final-go']).toContain('release authority');
	});

	test('release/build mismatch blocks promotion', () => {
		const result = evaluatePromotion({ approval: validApproval(), runtime: fullRuntime({ releaseBuild: 'viceterminal-other-999' }) });
		expect(result.promotable).toBe(false);
		expect(blockGates(result)['release']).toContain('release/build mismatch');
	});

	test('all gates set and matched: promotion allowed', () => {
		const result = evaluatePromotion({ approval: validApproval(), runtime: fullRuntime() });
		expect(result.promotable).toBe(true);
		expect(result.blocks).toHaveLength(0);
		expect(result.decision).toBe('allowed');
	});
});

describe('audit journal (state trail)', () => {
	let dir;
	let journalPath;
	beforeAll(() => {
		dir = mkdtempSync(join(tmpdir(), 'vice-gate-journal-'));
		journalPath = join(dir, 'mainnet-gate-journal.jsonl');
	});
	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	test('blocked attempt appends a journal record with the block reason', async () => {
		const runtime = fullRuntime({ approvalPath: '', journalPath });
		let err;
		try {
			await assertMainnetPromotable(runtime);
		} catch (e) {
			err = e;
		}
		expect(err).toBeTruthy();
		expect(String(err.message)).toContain('Mainnet promotion blocked');
		const lines = readFileSync(journalPath, 'utf8').trim().split('\n').filter(Boolean);
		expect(lines.length).toBe(1);
		const record = JSON.parse(lines[0]);
		expect(record.scope).toBe(MAINNET_SCOPE);
		expect(record.decision).toBe('blocked');
		expect(record.promotable).toBe(false);
		expect(record.blocks.some((b) => b.gate === 'approval-record')).toBe(true);
		expect(record.release).toBe(BUILD);
	});

	test('allowed attempt appends an allowed journal record', async () => {
		const approvalPath = join(dir, 'approval.json');
		await Bun.write(approvalPath, JSON.stringify(validApproval()));
		const runtime = fullRuntime({ approvalPath, journalPath });
		const result = await assertMainnetPromotable(runtime);
		expect(result.promotable).toBe(true);
		const lines = readFileSync(journalPath, 'utf8').trim().split('\n').filter(Boolean);
		expect(lines.length).toBe(2); // blocked entry survives + this allowed entry
		const record = JSON.parse(lines.at(-1));
		expect(record.decision).toBe('allowed');
		expect(record.promotable).toBe(true);
	});

	test('canary attempt is journaled as canary and never blocked', async () => {
		const runtime = { network: 'testnet', releaseBuild: '', journalPath, canaryOperator: 'canary-bot' };
		const result = await assertMainnetPromotable(runtime);
		expect(result.promotable).toBe(true);
		expect(result.scope).toBe(CANARY_SCOPE);
		const lines = readFileSync(journalPath, 'utf8').trim().split('\n').filter(Boolean);
		expect(lines.length).toBe(3); // full trail accumulates, nothing overwritten
		const record = JSON.parse(lines.at(-1));
		expect(record.scope).toBe(CANARY_SCOPE);
		expect(record.decision).toBe('allowed');
		// the original blocked record is still intact for the auditor
		expect(JSON.parse(lines[0]).decision).toBe('blocked');
	});

	test('default journal path is under the home .vice-mainnet directory', () => {
		expect(defaultJournalPath()).toContain('.vice-mainnet');
	});
});

describe('integration with the release-authority recording workflow', () => {
	let dir;
	beforeAll(() => {
		dir = mkdtempSync(join(tmpdir(), 'vice-gate-integration-'));
	});
	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	test('consumes a record produced by scripts/release-approval.mjs', async () => {
		if (!buildApprovalRecord) return; // recording module not in this checkout yet
		const certPath = join(dir, 'funded-testnet.json');
		writeFileSync(certPath, JSON.stringify({
			schemaVersion: 1,
			network: 'testnet',
			pilot: { allowlisted: true, lowNotional: true },
			uncertainOutcomes: 0,
			duplicateOrders: 0,
			venueOrderIds: ['1001', '1002'],
			stories: {
				'US-002': { passes: 2, reconnect: true, restart: true },
				'US-003': { passes: 2, reconnect: true, restart: true },
				'US-004': { passes: 2, reconnect: true, restart: true }
			}
		}));
		const record = await buildApprovalRecord({
			release: { build: BUILD, scope: 'low-notional canary to mainnet promotion', network: 'mainnet' },
			certPath,
			approvals: [
				{ item: 'allowlist', evidence: { build: BUILD, allowlist: ['BTC', 'ETH'] } },
				{ item: 'cap', evidence: { build: BUILD, cap: { value: 50, unit: 'USDC', scope: 'per-order' } } },
				{
					item: 'observation-window',
					evidence: {
						deployedBuild: BUILD,
						window: {
							start: '2026-08-04T00:00:00.000Z',
							end: '2026-08-04T23:59:59.000Z',
							result: 'pass',
							manifestRef: 'docs/evidence/observation-2026-08-04.json',
							outcomes: { uncertain: 0, duplicates: 0 },
							reconciliation: 'clean'
						}
					}
				},
				{
					item: 'named-operator',
					evidence: { build: BUILD, operator: { identity: 'josh', role: 'mainnet operator', scope: 'execute the approved mainnet promotion only', rollbackContact: 'ops@vice.local', acknowledged: true } }
				}
			],
			finalDecision: { decision: 'go' }
		});
		expect(record.mainnetPromotable).toBe(true);

		const approvalPath = join(dir, 'approval.json');
		writeFileSync(approvalPath, JSON.stringify(record));
		const journalPath = join(dir, 'journal.jsonl');
		const result = await assertMainnetPromotable(fullRuntime({ approvalPath, journalPath }));
		expect(result.promotable).toBe(true);
		expect(result.scope).toBe(MAINNET_SCOPE);
	});

	test('a partial record from the recording workflow fails closed at runtime', async () => {
		if (!buildApprovalRecord) return; // recording module not in this checkout yet
		const certPath = join(dir, 'funded-testnet-partial.json');
		writeFileSync(certPath, JSON.stringify({
			schemaVersion: 1,
			network: 'testnet',
			pilot: { allowlisted: true, lowNotional: true },
			uncertainOutcomes: 0,
			duplicateOrders: 0,
			venueOrderIds: ['1001', '1002'],
			stories: {
				'US-002': { passes: 2, reconnect: true, restart: true },
				'US-003': { passes: 2, reconnect: true, restart: true },
				'US-004': { passes: 2, reconnect: true, restart: true }
			}
		}));
		// Only Gate 0 + allowlist recorded: no cap/window/operator/final.
		const record = await buildApprovalRecord({
			release: { build: BUILD, scope: 'low-notional canary to mainnet promotion', network: 'mainnet' },
			certPath,
			approvals: [{ item: 'allowlist', evidence: { build: BUILD, allowlist: ['BTC'] } }]
		});
		expect(record.mainnetPromotable).toBe(false);

		const approvalPath = join(dir, 'approval-partial.json');
		writeFileSync(approvalPath, JSON.stringify(record));
		const journalPath = join(dir, 'journal-partial.jsonl');
		let err;
		try {
			await assertMainnetPromotable(fullRuntime({ approvalPath, journalPath, allowlist: 'BTC' }));
		} catch (e) {
			err = e;
		}
		expect(err).toBeTruthy();
		expect(String(err.message)).toContain('Mainnet promotion blocked');
		const lines = readFileSync(journalPath, 'utf8').trim().split('\n').filter(Boolean);
		expect(JSON.parse(lines[0]).decision).toBe('blocked');
	});
});
