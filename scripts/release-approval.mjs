#!/usr/bin/env bun
// scripts/release-approval.mjs
// PLAN_3 external-gate release authority workflow (normative spec:
// docs/PLAN_3_EXTERNAL_GATE_AUTHORITY.md).
//
// Implements Josh's ordered approvals for mainnet promotion, gated on funded
// certification (Gate 0). Fail-closed: no approval, no final go/no-go, and no
// mainnet promotion can be recorded unless every prerequisite is satisfied and
// verified. The approval payload is plain JSON, carries the certification
// evidence reference (path + sha256 + validation summary) alongside the
// approvals, and excludes keys/signatures/raw bodies so verification tooling
// can inspect it without touching credential material.
//
// Reuses readMainnetEvidence (scripts/mainnet-evidence.mjs) as the certified
// Gate 0 boundary — the exact validator the release gate already runs.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readMainnetEvidence } from './mainnet-evidence.mjs';

export const APPROVAL_SCHEMA_VERSION = 1;
export const RELEASE_AUTHORITY = 'Josh';
export const MAINNET_NETWORK = 'mainnet';
export const APPROVAL_ITEMS = Object.freeze(['allowlist', 'cap', 'observation-window', 'named-operator']);
export const GATE0_VALIDATOR = 'readMainnetEvidence@scripts/mainnet-evidence.mjs';

// Evidence manifests never contain keys, signatures, or raw bodies. Any such
// field anywhere in an approval payload is a hard failure.
const FORBIDDEN_CREDENTIAL_KEYS = /private|secret|mnemonic|seed|signature|credential|rawBody|rawError|password|token|apiKey/i;

// ---------------------------------------------------------------------------
// Gate 0: funded certification
// ---------------------------------------------------------------------------

export async function sha256File(path) {
	const file = Bun.file(resolve(path));
	if (!(await file.exists())) throw new Error(`file does not exist: ${path}`);
	return createHash('sha256').update(await file.text()).digest('hex');
}

// Validates the funded-mainnet certification manifest through the certified
// validator and returns the Gate 0 evidence to store alongside the approval.
export async function checkFundedCertification(certPath, { ref, expectedSha } = {}) {
	if (!certPath) throw new Error('funded certification evidence path is required (Gate 0)');
	const evidence = await readMainnetEvidence(certPath, { expectedSha });
	const checkedAt = new Date().toISOString();
	const sha256 = await sha256File(certPath);
	return {
		fundedCertification: {
			evidenceRef: ref ?? certPath,
			sha256,
			validated: true,
			validator: GATE0_VALIDATOR,
			schemaVersion: evidence.schemaVersion,
			commit: evidence.commit,
			artifactSha256: evidence.artifact.sha256,
			policySha256: evidence.policySha256,
			checkedAt,
			summary: {
				network: evidence.network,
				capturedAt: evidence.capturedAt ?? null,
				venueOrderIds: evidence.venueOrderIds.length,
				stories: Object.fromEntries(Object.entries(evidence.stories ?? {}).map(([k, v]) => [k, { passes: v.passes, reconnect: v.reconnect, restart: v.restart }]))
			}
		}
	};
}

// ---------------------------------------------------------------------------
// Approval record construction
// ---------------------------------------------------------------------------

export function createApprovalRecord({ release, certification } = {}) {
	assertNoCredentialMaterial(release);
	if (!release || typeof release !== 'object') throw new Error('release is required');
	if (!release.scope || typeof release.scope !== 'string') throw new Error('release.scope is required');
	if (release.network !== MAINNET_NETWORK) throw new Error(`release.network must be ${MAINNET_NETWORK}`);
	if (!/^[a-f0-9]{40}$/i.test(release.build)) throw new Error('release.build must be a full commit SHA');
	if (!certification?.fundedCertification?.validated) throw new Error('Gate 0 (funded certification) must pass before any approval can be recorded');
	if (certification.fundedCertification.commit?.toLowerCase() !== release.build.toLowerCase()) throw new Error('funded certification commit does not match release/build');
	for (const [field, evidenceField] of [['artifactSha256', 'artifactSha256'], ['lockfileSha256', 'lockfileSha256'], ['policySha256', 'policySha256']]) if (release[field] && certification.fundedCertification[evidenceField] !== release[field]) throw new Error(`funded certification ${field} does not match release provenance`);
	const record = {
		schemaVersion: APPROVAL_SCHEMA_VERSION,
		kind: 'mainnet-release-approval',
		release: {
			build: release.build,
			scope: release.scope,
			network: MAINNET_NETWORK,
			allowlist: [],
			cap: null,
			operators: []
		},
		...certification,
		approvals: [],
		finalDecision: null,
		mainnetPromotable: false,
		audit: [
			{
				event: 'gate0-checked',
				at: certification.fundedCertification.checkedAt,
				by: 'system',
				detail: {
					evidenceRef: certification.fundedCertification.evidenceRef,
					sha256: certification.fundedCertification.sha256,
					validated: true
				}
			}
		]
	};
	return record;
}

export function recordApproval(record, item, { approver, evidence } = {}) {
	if (!record?.fundedCertification?.validated) throw new Error('Gate 0 (funded certification) must pass before any approval can be recorded');
	const idx = APPROVAL_ITEMS.indexOf(item);
	if (idx === -1) throw new Error(`unknown approval item: ${item}`);
	if (approver !== RELEASE_AUTHORITY) throw new Error(`only ${RELEASE_AUTHORITY} may approve ${item}`);
	if (record.approvals.some((a) => a.item === item)) throw new Error(`${item} already approved; a change requires rerunning the approval sequence`);
	const required = APPROVAL_ITEMS.slice(0, idx).filter((it) => !record.approvals.some((a) => a.item === it));
	if (required.length > 0) throw new Error(`${item} cannot be approved before ${required.join(', ')}`);
	if (!evidence || typeof evidence !== 'object') throw new Error(`${item} requires evidence`);
	assertNoCredentialMaterial(evidence);
	const validated = validateItemEvidence(item, evidence, record.release);
	const approvedAt = new Date().toISOString();
	record.approvals.push({ item, order: idx + 1, approver, approvedAt, decision: 'approved', evidence: validated.evidence });
	if (validated.apply) validated.apply(record.release, validated.evidence);
	record.audit.push({ event: 'approved', item, at: approvedAt, by: approver, detail: { order: idx + 1 } });
	// Any new or changed approval invalidates promotion until the final decision.
	record.mainnetPromotable = false;
	return record;
}

export function finalGoNoGo(record, { approver, decision } = {}) {
	if (approver !== RELEASE_AUTHORITY) throw new Error(`only ${RELEASE_AUTHORITY} may issue the final mainnet go/no-go`);
	if (!['go', 'no-go'].includes(decision)) throw new Error('final decision must be go or no-go');
	if (!record.fundedCertification?.validated) throw new Error('Gate 0 (funded certification) must pass before a final decision');
	const missing = APPROVAL_ITEMS.filter((it) => !record.approvals.some((a) => a.item === it));
	if (missing.length > 0) throw new Error(`final decision requires all approvals first; missing: ${missing.join(', ')}`);
	const decidedAt = new Date().toISOString();
	record.finalDecision = { approver, decision, decidedAt, releaseBuild: record.release.build };
	record.audit.push({ event: 'final-decision', at: decidedAt, by: approver, detail: { decision, releaseBuild: record.release.build } });
	record.mainnetPromotable = decision === 'go' && evaluateMainnetPromotable(record);
	return record;
}

// ---------------------------------------------------------------------------
// Promotion verdict (deny-by-default)
// ---------------------------------------------------------------------------

export function mainnetPromotableReasons(record) {
	const reasons = [];
	if (!record?.fundedCertification?.validated) reasons.push('Gate 0 (funded certification) has not passed');
	for (const item of APPROVAL_ITEMS) {
		if (!record.approvals.some((a) => a.item === item)) reasons.push(`${item} is not approved`);
	}
	if (record.finalDecision?.decision !== 'go') reasons.push('final go/no-go has not been issued (go)');
	if (record.finalDecision && record.finalDecision.releaseBuild !== record?.release?.build) reasons.push('final decision release/build does not match the approved release');
	if (Array.isArray(record?.release?.allowlist) && record.release.allowlist.length === 0 && record.approvals.some((a) => a.item === 'allowlist')) reasons.push('approved allowlist is empty');
	return reasons;
}

export function evaluateMainnetPromotable(record) {
	return mainnetPromotableReasons(record).length === 0;
}

export function assertPromotable(record) {
	const reasons = mainnetPromotableReasons(record);
	if (reasons.length > 0) throw new Error(`mainnet promotion denied: ${reasons.join('; ')}`);
	return true;
}

// Only named operator(s) from the approved list may act on the mainnet release.
export function assertOperatorAllowed(record, operator) {
	const operators = record?.release?.operators ?? [];
	if (operators.length === 0) throw new Error('no named operator approved; no one may act on the mainnet release');
	if (!operators.includes(operator)) throw new Error(`operator ${operator} is not in the approved named-operator list (${operators.join(', ')})`);
	return true;
}

// ---------------------------------------------------------------------------
// Serialization / inspection
// ---------------------------------------------------------------------------

export function serializeApprovalRecord(record) {
	return JSON.stringify(record, null, 2);
}

export function assertNoCredentialMaterial(value, path = '') {
	if (!value || typeof value !== 'object') return;
	for (const [k, v] of Object.entries(value)) {
		const keyPath = path ? `${path}.${k}` : k;
		if (FORBIDDEN_CREDENTIAL_KEYS.test(k)) throw new Error(`credential material is not permitted in approval payloads: ${keyPath}`);
		if (v && typeof v === 'object') assertNoCredentialMaterial(v, keyPath);
	}
}

// ---------------------------------------------------------------------------
// Orchestrated build (used by the CLI and by downstream tooling)
// ---------------------------------------------------------------------------

export async function buildApprovalRecord({ release, certPath, approvals = [], finalDecision = null, operatorCheck = null }) {
	const certification = await checkFundedCertification(certPath, { expectedSha: /^[a-f0-9]{40}$/i.test(release?.build ?? '') ? release.build : undefined });
	const record = createApprovalRecord({ release, certification });
	for (const a of approvals) {
		recordApproval(record, a.item, { approver: a.approver ?? RELEASE_AUTHORITY, evidence: a.evidence });
	}
	if (finalDecision) finalGoNoGo(record, { approver: finalDecision.approver ?? RELEASE_AUTHORITY, decision: finalDecision.decision });
	if (operatorCheck) assertOperatorAllowed(record, operatorCheck);
	return record;
}

// ---------------------------------------------------------------------------
// Per-item evidence validation (PLAN_3 section 3)
// ---------------------------------------------------------------------------

function requireSameBuild(evidence, release, label) {
	const build = evidence.build ?? evidence.deployedBuild;
	if (!build) throw new Error(`${label} must reference the release/build`);
	if (build !== release.build) throw new Error(`${label} build ${build} does not match approved release build ${release.build}; a change requires rerunning the approval sequence`);
}

function validateItemEvidence(item, evidence, release) {
	switch (item) {
		case 'allowlist': {
			if (!Array.isArray(evidence.allowlist) || evidence.allowlist.length === 0) throw new Error('allowlist evidence must show the exact entries (non-empty allowlist)');
			if (!evidence.allowlist.every((e) => typeof e === 'string' && e.length > 0)) throw new Error('allowlist entries must be non-empty strings');
			requireSameBuild(evidence, release, 'allowlist');
			return { evidence, apply: (r) => { r.allowlist = [...evidence.allowlist]; } };
		}
		case 'cap': {
			const cap = evidence.cap;
			if (!cap || typeof cap !== 'object') throw new Error('cap evidence must include explicit cap configuration');
			if (!Number.isFinite(cap.value) || cap.value <= 0) throw new Error('cap evidence must include a positive numeric value');
			if (!cap.unit || typeof cap.unit !== 'string') throw new Error('cap evidence must include units');
			if (!cap.scope || typeof cap.scope !== 'string') throw new Error('cap evidence must include scope (per order, position, session, or day)');
			requireSameBuild(evidence, release, 'cap');
			return { evidence, apply: (r) => { r.cap = { value: cap.value, unit: cap.unit, scope: cap.scope }; } };
		}
		case 'observation-window': {
			const w = evidence.window;
			if (!w || typeof w !== 'object') throw new Error('observation-window evidence must include the window manifest');
			if (!w.start || !w.end || Number.isNaN(Date.parse(w.start)) || Number.isNaN(Date.parse(w.end))) throw new Error('observation-window must have ISO start and end timestamps');
			if (Date.parse(w.start) >= Date.parse(w.end)) throw new Error('observation-window start must precede end');
			if (w.result !== 'pass') throw new Error('observation-window must have completed pass evidence; a planned window is not a pass');
			if (!w.manifestRef) throw new Error('observation-window must reference the timestamped canary/observation manifest');
			requireSameBuild(evidence, release, 'observation-window');
			if (!w.outcomes || w.outcomes.uncertain !== 0) throw new Error('observation-window must show zero uncertain outcomes');
			if (!w.outcomes || w.outcomes.duplicates !== 0) throw new Error('observation-window must show zero duplicate outcomes');
			if (w.reconciliation !== 'clean') throw new Error('observation-window must show clean reconciliation (no unexplained failure)');
			return { evidence, apply: () => {} };
		}
		case 'named-operator': {
			const op = evidence.operator;
			if (!op || typeof op !== 'object') throw new Error('named-operator evidence must identify the operator');
			if (!op.identity || typeof op.identity !== 'string') throw new Error('named-operator must name the operator identity');
			if (!op.role || typeof op.role !== 'string') throw new Error('named-operator must include the operator role');
			if (!op.scope || typeof op.scope !== 'string') throw new Error('named-operator must include the operator permitted scope');
			if (!op.rollbackContact || typeof op.rollbackContact !== 'string') throw new Error('named-operator must include rollback contact/procedure');
			if (op.acknowledged !== true) throw new Error('named-operator must include operator acknowledgement');
			requireSameBuild(evidence, release, 'named-operator');
			return { evidence, apply: (r) => { if (!r.operators.includes(op.identity)) r.operators.push(op.identity); } };
		}
		default:
			throw new Error(`unknown approval item: ${item}`);
	}
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printUsage() {
	console.log(`usage:
  bun scripts/release-approval.mjs check <record.json>
      print the mainnet promotion verdict (inspectable by verification tooling)

  bun scripts/release-approval.mjs record <spec.json> [--out <path>]
      build an approval record from a spec:
      { release: { build, scope }, certPath, approvals: [{ item, evidence }],
        finalDecision: { decision: "go"|"no-go" }, operatorCheck? }
      defaults out to <spec>.approval.json

  bun scripts/release-approval.mjs operator <record.json> <operator>
      assert the operator is in the approved named-operator list (exit 0/1)`);
}

async function main(argv) {
	const [mode, a] = argv;
	if (mode === 'check') {
		if (!a) throw new Error('check requires <record.json>');
		const record = JSON.parse(readFileSync(resolve(a), 'utf8'));
		const verdict = { mainnetPromotable: evaluateMainnetPromotable(record), reasons: mainnetPromotableReasons(record) };
		console.log(JSON.stringify(verdict, null, 2));
		process.exitCode = verdict.mainnetPromotable ? 0 : 1;
		return;
	}
	if (mode === 'record') {
		if (!a) throw new Error('record requires <spec.json>');
		const rest = argv.slice(2);
		const out = rest.includes('--out') ? rest[rest.indexOf('--out') + 1] : `${a}.approval.json`;
		const spec = JSON.parse(readFileSync(resolve(a), 'utf8'));
		const record = await buildApprovalRecord(spec);
		writeFileSync(resolve(out), serializeApprovalRecord(record) + '\n');
		console.log(`approval record written to ${out}`);
		console.log(JSON.stringify({ mainnetPromotable: evaluateMainnetPromotable(record), reasons: mainnetPromotableReasons(record) }, null, 2));
		return;
	}
	if (mode === 'operator') {
		const [, , b] = argv;
		if (!a || !b) throw new Error('operator requires <record.json> <operator>');
		const record = JSON.parse(readFileSync(resolve(a), 'utf8'));
		assertOperatorAllowed(record, b);
		console.log(`operator ${b} is approved to act on the mainnet release`);
		return;
	}
	printUsage();
}

if (import.meta.main) {
	main(process.argv.slice(2)).catch((err) => {
		console.error(`release-approval: ${err.message}`);
		process.exitCode = 1;
	});
}
