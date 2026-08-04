import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	APPROVAL_ITEMS,
	RELEASE_AUTHORITY,
	assertNoCredentialMaterial,
	assertOperatorAllowed,
	assertPromotable,
	buildApprovalRecord,
	checkFundedCertification,
	createApprovalRecord,
	evaluateMainnetPromotable,
	finalGoNoGo,
	mainnetPromotableReasons,
	recordApproval,
	serializeApprovalRecord
} from './release-approval.mjs';

const BUILD = 'viceterminal-2026-08-04';
const RELEASE = { build: BUILD, scope: 'low-notional canary to mainnet promotion', network: 'mainnet' };

const VALID_CERT = {
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
};

// A certification object that is already validated — used to exercise the pure
// approval logic without touching the filesystem.
const PASSED_CERT = {
	fundedCertification: {
		evidenceRef: 'docs/evidence/funded-testnet-2026-08-03.json',
		sha256: 'a'.repeat(64),
		validated: true,
		validator: 'readMainnetEvidence@scripts/mainnet-evidence.mjs',
		schemaVersion: 1,
		checkedAt: '2026-08-04T00:00:00.000Z',
		summary: { network: 'testnet', venueOrderIds: 2, stories: {} }
	}
};

const ALLOWLIST = { build: BUILD, allowlist: ['BTC', 'ETH'] };
const CAP = { build: BUILD, cap: { value: 50, unit: 'USDC', scope: 'per-order' } };
const WINDOW = {
	deployedBuild: BUILD,
	window: {
		start: '2026-08-04T00:00:00.000Z',
		end: '2026-08-04T23:59:59.000Z',
		result: 'pass',
		manifestRef: 'docs/evidence/observation-2026-08-04.json',
		outcomes: { uncertain: 0, duplicates: 0 },
		reconciliation: 'clean'
	}
};
const OPERATOR = {
	build: BUILD,
	operator: { identity: 'josh', role: 'mainnet operator', scope: 'execute the approved mainnet promotion only', rollbackContact: 'ops@vice.local', acknowledged: true }
};
const APPROVALS = [
	{ item: 'allowlist', evidence: ALLOWLIST },
	{ item: 'cap', evidence: CAP },
	{ item: 'observation-window', evidence: WINDOW },
	{ item: 'named-operator', evidence: OPERATOR }
];

function tempCert(value = VALID_CERT) {
	const dir = mkdtempSync(join(tmpdir(), 'approval-cert-'));
	const path = join(dir, 'funded-testnet.json');
	writeFileSync(path, JSON.stringify(value));
	return path;
}

function approvedRecord(certification = PASSED_CERT) {
	const record = createApprovalRecord({ release: RELEASE, certification });
	for (const a of APPROVALS) recordApproval(record, a.item, { approver: RELEASE_AUTHORITY, evidence: a.evidence });
	finalGoNoGo(record, { approver: RELEASE_AUTHORITY, decision: 'go' });
	return record;
}

describe('Gate 0: funded certification prerequisite', () => {
	test('creates a record only after a passing funded certification', async () => {
		const certification = await checkFundedCertification(tempCert());
		const record = createApprovalRecord({ release: RELEASE, certification });
		expect(record.fundedCertification.validated).toBe(true);
		expect(record.fundedCertification.sha256).toMatch(/^[0-9a-f]{64}$/);
		expect(record.fundedCertification.evidenceRef).toContain('funded-testnet.json');
		expect(record.mainnetPromotable).toBe(false);
	});

	test('rejects a missing certification file', async () => {
		await expect(checkFundedCertification('/nonexistent/funded-testnet.json')).rejects.toThrow('does not exist');
	});

	test('rejects a malformed or failing certification manifest', async () => {
		await expect(checkFundedCertification(tempCert({ ...VALID_CERT, schemaVersion: 2 }))).rejects.toThrow('schemaVersion');
		await expect(checkFundedCertification(tempCert({ ...VALID_CERT, network: 'mainnet' }))).rejects.toThrow('network');
		await expect(checkFundedCertification(tempCert({ ...VALID_CERT, uncertainOutcomes: 1 }))).rejects.toThrow('uncertain');
	});

	test('createApprovalRecord throws without Gate 0', () => {
		expect(() => createApprovalRecord({ release: RELEASE, certification: null })).toThrow('Gate 0');
		expect(() => createApprovalRecord({ release: RELEASE })).toThrow('Gate 0');
	});

	test('a user cannot get an approval recorded without a passing funded certification', () => {
		// Even a caller who claims Josh's name gets nothing recorded: Gate 0
		// must have passed before any approval is accepted.
		const record = { fundedCertification: { validated: false }, release: RELEASE, approvals: [] };
		for (const item of APPROVAL_ITEMS) {
			expect(() => recordApproval(record, item, { approver: RELEASE_AUTHORITY, evidence: APPROVALS[APPROVAL_ITEMS.indexOf(item)].evidence })).toThrow('Gate 0');
		}
		expect(record.approvals).toHaveLength(0);

		// Stale/revoked certification blocks further approvals too.
		const stale = approvedRecord();
		stale.fundedCertification = { ...stale.fundedCertification, validated: false };
		expect(() => recordApproval(stale, 'allowlist', { approver: RELEASE_AUTHORITY, evidence: ALLOWLIST })).toThrow('Gate 0');
	});
});

describe('ordered Josh approvals', () => {
	test('accepts the full ordered sequence', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		for (const a of APPROVALS) recordApproval(record, a.item, { approver: RELEASE_AUTHORITY, evidence: a.evidence });
		expect(record.approvals.map((a) => a.item)).toEqual(APPROVAL_ITEMS);
		expect(record.release.allowlist).toEqual(['BTC', 'ETH']);
		expect(record.release.cap).toEqual({ value: 50, unit: 'USDC', scope: 'per-order' });
	});

	test('rejects approving cap before allowlist', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		expect(() => recordApproval(record, 'cap', { approver: RELEASE_AUTHORITY, evidence: CAP })).toThrow('allowlist');
	});

	test('rejects approving a later item before its predecessors', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		recordApproval(record, 'allowlist', { approver: RELEASE_AUTHORITY, evidence: ALLOWLIST });
		expect(() => recordApproval(record, 'observation-window', { approver: RELEASE_AUTHORITY, evidence: WINDOW })).toThrow('cap');
		recordApproval(record, 'cap', { approver: RELEASE_AUTHORITY, evidence: CAP });
		recordApproval(record, 'observation-window', { approver: RELEASE_AUTHORITY, evidence: WINDOW });
		expect(() => recordApproval(record, 'allowlist', { approver: RELEASE_AUTHORITY, evidence: ALLOWLIST })).toThrow('already approved');
	});

	test('rejects an unknown item', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		expect(() => recordApproval(record, 'anything', { approver: RELEASE_AUTHORITY, evidence: {} })).toThrow('unknown approval item');
	});

	test('rejects any approver other than Josh', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		expect(() => recordApproval(record, 'allowlist', { approver: 'canary-operator', evidence: ALLOWLIST })).toThrow(`only ${RELEASE_AUTHORITY}`);
		expect(() => recordApproval(record, 'allowlist', { approver: 'josh', evidence: ALLOWLIST })).toThrow(`only ${RELEASE_AUTHORITY}`);
	});

	test('rejects missing evidence', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		expect(() => recordApproval(record, 'allowlist', { approver: RELEASE_AUTHORITY })).toThrow('requires evidence');
	});
});

describe('per-item evidence boundaries', () => {
	test('allowlist must show exact non-empty entries scoped to the release/build', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		expect(() => recordApproval(record, 'allowlist', { approver: RELEASE_AUTHORITY, evidence: { build: BUILD, allowlist: [] } })).toThrow('non-empty allowlist');
		expect(() => recordApproval(record, 'allowlist', { approver: RELEASE_AUTHORITY, evidence: { allowlist: ['BTC'] } })).toThrow('release/build');
		expect(() => recordApproval(record, 'allowlist', { approver: RELEASE_AUTHORITY, evidence: { build: 'other-build', allowlist: ['BTC'] } })).toThrow('does not match');
	});

	test('cap must carry positive numeric value, units, and scope', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		recordApproval(record, 'allowlist', { approver: RELEASE_AUTHORITY, evidence: ALLOWLIST });
		expect(() => recordApproval(record, 'cap', { approver: RELEASE_AUTHORITY, evidence: { build: BUILD, cap: { value: 0, unit: 'USDC', scope: 'per-order' } } })).toThrow('positive numeric value');
		expect(() => recordApproval(record, 'cap', { approver: RELEASE_AUTHORITY, evidence: { build: BUILD, cap: { value: 50 } } })).toThrow('units');
		expect(() => recordApproval(record, 'cap', { approver: RELEASE_AUTHORITY, evidence: { build: BUILD, cap: { value: 50, unit: 'USDC' } } })).toThrow('scope');
	});

	test('observation window must be a completed pass, not a plan', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		recordApproval(record, 'allowlist', { approver: RELEASE_AUTHORITY, evidence: ALLOWLIST });
		recordApproval(record, 'cap', { approver: RELEASE_AUTHORITY, evidence: CAP });
		const base = () => JSON.parse(JSON.stringify(WINDOW));
		expect(() => recordApproval(record, 'observation-window', { approver: RELEASE_AUTHORITY, evidence: { ...base(), window: { ...base().window, result: 'pending' } } })).toThrow('planned window');
		expect(() => recordApproval(record, 'observation-window', { approver: RELEASE_AUTHORITY, evidence: { ...base(), window: { ...base().window, outcomes: { uncertain: 1, duplicates: 0 } } } })).toThrow('uncertain');
		expect(() => recordApproval(record, 'observation-window', { approver: RELEASE_AUTHORITY, evidence: { ...base(), window: { ...base().window, reconciliation: 'unexplained-failure' } } })).toThrow('reconciliation');
		expect(() => recordApproval(record, 'observation-window', { approver: RELEASE_AUTHORITY, evidence: { ...base(), window: { ...base().window, start: '2026-08-05T00:00:00.000Z' } } })).toThrow('precede');
		expect(() => recordApproval(record, 'observation-window', { approver: RELEASE_AUTHORITY, evidence: { ...base(), window: { ...base().window, manifestRef: null } } })).toThrow('manifest');
		expect(() => recordApproval(record, 'observation-window', { approver: RELEASE_AUTHORITY, evidence: { ...base(), deployedBuild: 'other-build' } })).toThrow('does not match');
	});

	test('named operator must be fully identified and acknowledged', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		for (const a of APPROVALS.slice(0, 3)) recordApproval(record, a.item, { approver: RELEASE_AUTHORITY, evidence: a.evidence });
		expect(() => recordApproval(record, 'named-operator', { approver: RELEASE_AUTHORITY, evidence: { build: BUILD, operator: { identity: 'josh' } } })).toThrow('role');
		expect(() => recordApproval(record, 'named-operator', { approver: RELEASE_AUTHORITY, evidence: { build: BUILD, operator: { identity: 'josh', role: 'mainnet operator', scope: 'x', rollbackContact: 'ops@vice.local' } } })).toThrow('acknowledgement');
	});

	test('credential material anywhere in an approval payload is rejected', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		expect(() => recordApproval(record, 'allowlist', { approver: RELEASE_AUTHORITY, evidence: { build: BUILD, allowlist: ['BTC'], privateKey: '0xdeadbeef' } })).toThrow('credential material');
		expect(() => assertNoCredentialMaterial({ ok: { signature: 'abc' } })).toThrow('credential material');
		expect(() => assertNoCredentialMaterial({ ok: true })).not.toThrow();
	});
});

describe('final decision and promotion verdict', () => {
	test('final go requires every approval first', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		expect(() => finalGoNoGo(record, { approver: RELEASE_AUTHORITY, decision: 'go' })).toThrow('all approvals');
	});

	test('final decision is Josh-only and go/no-go only', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		expect(() => finalGoNoGo(record, { approver: 'canary-operator', decision: 'go' })).toThrow(`only ${RELEASE_AUTHORITY}`);
		expect(() => finalGoNoGo(record, { approver: RELEASE_AUTHORITY, decision: 'maybe' })).toThrow('go or no-go');
	});

	test('promotable true only when every gate is satisfied for the same build', () => {
		const record = approvedRecord();
		expect(evaluateMainnetPromotable(record)).toBe(true);
		expect(record.mainnetPromotable).toBe(true);
		expect(assertPromotable(record)).toBe(true);
		expect(mainnetPromotableReasons(record)).toEqual([]);
	});

	test('no-go keeps mainnet fail-closed', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		for (const a of APPROVALS) recordApproval(record, a.item, { approver: RELEASE_AUTHORITY, evidence: a.evidence });
		finalGoNoGo(record, { approver: RELEASE_AUTHORITY, decision: 'no-go' });
		expect(evaluateMainnetPromotable(record)).toBe(false);
		expect(mainnetPromotableReasons(record)).toContain('final go/no-go has not been issued (go)');
	});

	test('deny by default: every missing gate blocks promotion', () => {
		for (const item of APPROVAL_ITEMS) {
			// Start from a fully approved, go-signed record and remove one gate.
			// Recomputation must flip promotion off even if the stored flag said true.
			const record = approvedRecord();
			record.approvals = record.approvals.filter((a) => a.item !== item);
			expect(evaluateMainnetPromotable(record)).toBe(false);
			expect(mainnetPromotableReasons(record)).toContain(`${item} is not approved`);
		}
		const noGate0 = approvedRecord();
		noGate0.fundedCertification = { ...noGate0.fundedCertification, validated: false };
		expect(mainnetPromotableReasons(noGate0)).toContain('Gate 0 (funded certification) has not passed');
		expect(evaluateMainnetPromotable(noGate0)).toBe(false);
	});

	test('a fresh record is never promotable', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		expect(evaluateMainnetPromotable(record)).toBe(false);
		expect(assertPromotable).toBeDefined();
		expect(() => assertPromotable(record)).toThrow('mainnet promotion denied');
	});
});

describe('named operator enforcement', () => {
	test('only operators from the approved list may act on the mainnet release', () => {
		const record = approvedRecord();
		expect(record.release.operators).toEqual(['josh']);
		expect(assertOperatorAllowed(record, 'josh')).toBe(true);
		expect(() => assertOperatorAllowed(record, 'carol')).toThrow('not in the approved named-operator list');
	});

	test('no one may act before the named operator is approved', () => {
		const record = createApprovalRecord({ release: RELEASE, certification: PASSED_CERT });
		for (const a of APPROVALS.slice(0, 3)) recordApproval(record, a.item, { approver: RELEASE_AUTHORITY, evidence: a.evidence });
		expect(() => assertOperatorAllowed(record, 'josh')).toThrow('no named operator approved');
	});
});

describe('audit trail and inspectable payload', () => {
	test('audit records what was approved, when, by whom, and which certification run', () => {
		const record = approvedRecord();
		expect(record.audit[0].event).toBe('gate0-checked');
		expect(record.audit[0].by).toBe('system');
		expect(record.audit[0].detail.evidenceRef).toBe(PASSED_CERT.fundedCertification.evidenceRef);
		expect(record.audit[0].detail.sha256).toMatch(/^[0-9a-f]{64}$/);
		const approvedEvents = record.audit.filter((e) => e.event === 'approved');
		expect(approvedEvents.map((e) => e.item)).toEqual(APPROVAL_ITEMS);
		for (const e of approvedEvents) {
			expect(e.by).toBe(RELEASE_AUTHORITY);
			expect(Number.isNaN(Date.parse(e.at))).toBe(false);
		}
		const final = record.audit.find((e) => e.event === 'final-decision');
		expect(final.by).toBe(RELEASE_AUTHORITY);
		expect(final.detail.decision).toBe('go');
		expect(final.detail.releaseBuild).toBe(BUILD);
	});

	test('certification evidence is referenced alongside the approvals', () => {
		const record = approvedRecord();
		expect(record.fundedCertification.evidenceRef).toBe(PASSED_CERT.fundedCertification.evidenceRef);
		expect(record.fundedCertification.sha256).toMatch(/^[0-9a-f]{64}$/);
		expect(record.fundedCertification.validated).toBe(true);
		expect(record.fundedCertification.validator).toContain('mainnet-evidence.mjs');
	});

	test('the approval payload is plain inspectable JSON with no credential material', () => {
		const record = approvedRecord();
		const text = serializeApprovalRecord(record);
		const roundTripped = JSON.parse(text);
		expect(roundTripped.schemaVersion).toBe(1);
		expect(roundTripped.kind).toBe('mainnet-release-approval');
		expect(roundTripped.mainnetPromotable).toBe(true);
		expect(roundTripped.approvals).toHaveLength(4);
		expect(/private|secret|signature|mnemonic|seedPhrase|apiKey/i.test(text)).toBe(false);
	});

	test('buildApprovalRecord orchestrates the whole workflow from a manifest file', async () => {
		const record = await buildApprovalRecord({
			release: RELEASE,
			certPath: tempCert(),
			approvals: APPROVALS,
			finalDecision: { decision: 'go' },
			operatorCheck: 'josh'
		});
		expect(evaluateMainnetPromotable(record)).toBe(true);
		expect(record.fundedCertification.sha256).toMatch(/^[0-9a-f]{64}$/);
		expect(record.audit.some((e) => e.event === 'gate0-checked')).toBe(true);
	});
});
