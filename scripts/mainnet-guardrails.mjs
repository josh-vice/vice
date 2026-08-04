#!/usr/bin/env bun
// Fail-closed mainnet promotion guardrails (PLAN_3 external gates).
//
// ENFORCEMENT side of the release-authority workflow. The RECORDING side
// (scripts/release-approval.mjs) produces the external approval record: a
// JSON artifact with Gate 0 funded certification, the ordered allowlist / cap /
// observation-window / named-operator approvals (all by the release authority),
// the separate final go/no-go, and a deny-by-default `mainnetPromotable` flag.
//
// This module consumes that record at promotion time and enforces:
//   * deny-by-default: no recorded approval => blocked, reason journaled;
//   * the separate release authority (only Josh may approve; the canary
//     deployer cannot self-authorize);
//   * an allowlist (non-empty, bounded, exact match with runtime config);
//   * a notional cap (positive value + units + scope, exact match);
//   * a completed observation window (pass result, no uncertain/duplicate
//     outcomes, manifest matches runtime);
//   * a named operator (runtime operator must be in the approved list).
//
// Every evaluation is appended to a JSONL audit journal (default
// ~/.vice-mainnet/mainnet-gate-journal.jsonl) so an auditor can see that
// mainnet was blocked until the gates opened. Canary (testnet) operations
// never consult the mainnet gates and are unaffected.

import { resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { appendFile, mkdir } from 'node:fs/promises';

export const GUARDRAIL_SCHEMA_VERSION = 1;
export const APPROVAL_RECORD_KIND = 'mainnet-release-approval';
export const MAX_ALLOWLIST_ENTRIES = 64;
export const RELEASE_AUTHORITY_DEFAULT = 'Josh';
export const CANARY_SCOPE = 'canary';
export const MAINNET_SCOPE = 'mainnet';

// ---------------------------------------------------------------------------
// Pure evaluation (no I/O) — deny by default, collect EVERY block reason so an
// auditor sees the full list of missing/unverified gates, not just the first.
// ---------------------------------------------------------------------------

function parseCap(value) {
	if (typeof value !== 'string') return null;
	const parts = value.split(':');
	if (parts.length !== 3) return null;
	const num = Number(parts[0]);
	if (!Number.isFinite(num) || num <= 0) return null;
	return { value: num, unit: parts[1].trim(), scope: parts[2].trim() };
}

function normalizeEntries(value) {
	if (typeof value !== 'string') return [];
	return [...new Set(value.split(',').map((s) => s.trim()).filter(Boolean))].sort();
}

function sameEntries(a, b) {
	return a.length === b.length && a.every((x, i) => x === b[i]);
}

function block(blocks, gates, gate, reason, status) {
	blocks.push({ gate, reason });
	gates[gate] = status;
}

function approvalFor(record, item) {
	return (record?.approvals ?? []).find((a) => a?.item === item) ?? null;
}

// runtime = {
//   network, releaseBuild, allowlist, cap, operator, observationManifest,
//   canaryOperator, releaseAuthority, now
// }
export function evaluatePromotion({ approval, runtime }) {
	const network = (runtime.network ?? 'testnet').toLowerCase();
	if (network !== 'mainnet') {
		return {
			promotable: true,
			scope: CANARY_SCOPE,
			blocks: [],
			gates: { mainnetGates: 'not-required' },
			reason: 'canary scope does not require mainnet promotion gates'
		};
	}

	const blocks = [];
	const gates = {};

	const expectedAuthority = runtime.releaseAuthority ?? RELEASE_AUTHORITY_DEFAULT;
	const runtimeBuild = (runtime.releaseBuild ?? '').trim();
	const runtimeAllowlist = normalizeEntries(runtime.allowlist);
	const runtimeCap = parseCap(runtime.cap);
	const runtimeOperator = (runtime.operator ?? '').trim();
	const runtimeManifest = (runtime.observationManifest ?? '').trim();
	const runtimeCanaryOperator = (runtime.canaryOperator ?? '').trim();
	const nowMs = runtime.now instanceof Date ? runtime.now.getTime() : Date.now();

	// 0. External approval record — deny by default when absent.
	if (!approval || typeof approval !== 'object') {
		block(blocks, gates, 'approval-record', 'no external release-authority approval record recorded; mainnet remains denied by default', 'missing');
		return { promotable: false, scope: MAINNET_SCOPE, blocks, gates, decision: 'blocked' };
	}
	if (approval.schemaVersion !== GUARDRAIL_SCHEMA_VERSION) {
		block(blocks, gates, 'approval-record', `approval record schemaVersion must be ${GUARDRAIL_SCHEMA_VERSION}`, 'invalid');
	}
	if (approval.kind !== APPROVAL_RECORD_KIND) {
		block(blocks, gates, 'approval-record', `approval record kind must be ${APPROVAL_RECORD_KIND}`, 'invalid');
	}
	if (approval.mainnetPromotable !== true) {
		block(blocks, gates, 'approval-record', 'approval record does not mark mainnet promotable; approvals are incomplete or a change invalidated them', 'denied');
	}

	const release = (approval.release && typeof approval.release === 'object') ? approval.release : {};
	const cert = (approval.fundedCertification && typeof approval.fundedCertification === 'object') ? approval.fundedCertification : {};
	const finalDecision = (approval.finalDecision && typeof approval.finalDecision === 'object') ? approval.finalDecision : {};

	// Release/build identity — every gate is scoped to the SAME release/build.
	if (!release.build) {
		block(blocks, gates, 'release', 'approval record does not name a release/build', 'missing');
	} else if (!runtimeBuild) {
		block(blocks, gates, 'release', 'runtime release/build (VICE_MAINNET_RELEASE_BUILD) is not set', 'missing');
	} else if (runtimeBuild !== release.build) {
		block(blocks, gates, 'release', `release/build mismatch: approval=${release.build} runtime=${runtimeBuild}`, 'mismatch');
	}

	// Separate release authority — only the named authority may approve; the
	// canary deployer cannot self-authorize. Every recorded approval and the
	// final go/no-go must carry the release authority as approver.
	const approvals = Array.isArray(approval.approvals) ? approval.approvals : [];
	const approvers = [...new Set(approvals.filter((a) => a?.decision === 'approved').map((a) => a.approver))];
	if (approvers.length === 0) {
		block(blocks, gates, 'authority', 'no approved items recorded; the release authority has not approved anything', 'missing');
	} else if (approvers.some((p) => p !== expectedAuthority)) {
		block(blocks, gates, 'authority', `approvals must all be issued by release authority ${expectedAuthority}, got ${approvers.join(',')}`, 'mismatch');
	}
	if (finalDecision.approver && finalDecision.approver !== expectedAuthority) {
		block(blocks, gates, 'authority', `final go/no-go must be issued by release authority ${expectedAuthority}, got ${finalDecision.approver}`, 'mismatch');
	}
	if (runtimeCanaryOperator && runtimeCanaryOperator === expectedAuthority) {
		block(blocks, gates, 'authority', 'canary deployer cannot self-authorize mainnet promotion (canary operator equals release authority)', 'forbidden');
	}

	// Gate 0 — funded certification prerequisite (recorded and validated).
	if (cert.validated !== true) {
		block(blocks, gates, 'gate0', 'Gate 0 funded certification is not validated in the approval record', 'missing');
	}
	if (!cert.evidenceRef?.trim()) {
		block(blocks, gates, 'gate0', 'Gate 0 funded certification evidence reference is empty', 'missing');
	}

	// Approval 1 — allowlist (non-empty, bounded, exact match).
	const approvedAllowlist = Array.isArray(release.allowlist)
		? [...new Set(release.allowlist.map((e) => String(e).trim()).filter(Boolean))].sort()
		: [];
	if (approvedAllowlist.length === 0) {
		block(blocks, gates, 'allowlist', 'approved allowlist is empty', 'missing');
	} else if (approvedAllowlist.length > MAX_ALLOWLIST_ENTRIES) {
		block(blocks, gates, 'allowlist', `approved allowlist exceeds bound of ${MAX_ALLOWLIST_ENTRIES} entries`, 'invalid');
	} else if (runtimeAllowlist.length === 0) {
		block(blocks, gates, 'allowlist', 'runtime allowlist (VICE_MAINNET_ALLOWLIST) is empty', 'missing');
	} else if (!sameEntries(approvedAllowlist, runtimeAllowlist)) {
		block(blocks, gates, 'allowlist', `allowlist mismatch: approved=[${approvedAllowlist.join(',')}] runtime=[${runtimeAllowlist.join(',')}]`, 'mismatch');
	}

	// Approval 2 — notional cap (positive value, units, scope; zero/absent denies).
	const approvedCap = release.cap && typeof release.cap === 'object' ? release.cap : null;
	const approvedCapOk = approvedCap
		&& Number.isFinite(Number(approvedCap.value)) && Number(approvedCap.value) > 0
		&& typeof approvedCap.unit === 'string' && approvedCap.unit.trim()
		&& typeof approvedCap.scope === 'string' && approvedCap.scope.trim();
	if (!approvedCapOk) {
		block(blocks, gates, 'cap', 'approved cap is missing, zero, or lacks unit/scope', 'missing');
	} else if (!runtimeCap) {
		block(blocks, gates, 'cap', 'runtime cap (VICE_MAINNET_CAP=VALUE:UNIT:SCOPE) is missing or malformed', 'missing');
	} else if (runtimeCap.value !== Number(approvedCap.value) || runtimeCap.unit !== approvedCap.unit.trim() || runtimeCap.scope !== approvedCap.scope.trim()) {
		block(blocks, gates, 'cap', `cap mismatch: approved=${approvedCap.value}:${approvedCap.unit}:${approvedCap.scope} runtime=${runtime.cap}`, 'mismatch');
	}

	// Approval 3 — observation window (recorded pass + manifest match + completed).
	const windowApproval = approvalFor(approval, 'observation-window');
	const windowEvidence = windowApproval?.evidence?.window ?? null;
	const wStart = Date.parse(windowEvidence?.start ?? '');
	const wEnd = Date.parse(windowEvidence?.end ?? '');
	if (!windowApproval || windowApproval.decision !== 'approved') {
		block(blocks, gates, 'observation-window', 'observation window has not been approved', 'missing');
	} else if (!windowEvidence) {
		block(blocks, gates, 'observation-window', 'observation window evidence is missing from the approval record', 'missing');
	} else {
		if (!Number.isFinite(wStart) || !Number.isFinite(wEnd)) {
			block(blocks, gates, 'observation-window', 'observation window start/end timestamps are missing or malformed', 'missing');
		} else if (wStart >= wEnd) {
			block(blocks, gates, 'observation-window', 'observation window start must precede end', 'invalid');
		} else if (windowEvidence.result !== 'pass' || wEnd > nowMs) {
			block(blocks, gates, 'observation-window', 'observation window has not completed with a pass yet; a planned window without completed evidence is not a pass', 'incomplete');
		}
		if (!windowEvidence.manifestRef?.trim()) {
			block(blocks, gates, 'observation-window', 'observation manifest reference is empty', 'missing');
		} else if (!runtimeManifest) {
			block(blocks, gates, 'observation-window', 'runtime observation manifest (VICE_MAINNET_OBSERVATION_MANIFEST) is not set', 'missing');
		} else if (runtimeManifest !== windowEvidence.manifestRef.trim()) {
			block(blocks, gates, 'observation-window', `observation manifest mismatch: approved=${windowEvidence.manifestRef} runtime=${runtimeManifest}`, 'mismatch');
		}
		if (windowEvidence.outcomes?.uncertain !== 0) {
			block(blocks, gates, 'observation-window', 'observation evidence contains unresolved uncertain outcomes', 'invalid');
		}
		if (windowEvidence.outcomes?.duplicates !== 0) {
			block(blocks, gates, 'observation-window', 'observation evidence contains duplicate outcomes', 'invalid');
		}
		if (windowEvidence.reconciliation !== 'clean') {
			block(blocks, gates, 'observation-window', 'observation evidence does not show clean reconciliation', 'invalid');
		}
	}

	// Approval 4 — named operator (runtime operator must be in the approved list).
	const approvedOperators = Array.isArray(release.operators)
		? [...new Set(release.operators.map((o) => String(o).trim()).filter(Boolean))].sort()
		: [];
	if (approvedOperators.length === 0) {
		block(blocks, gates, 'named-operator', 'no named operator approved', 'missing');
	} else if (!runtimeOperator) {
		block(blocks, gates, 'named-operator', 'runtime operator (VICE_MAINNET_OPERATOR) is not set', 'missing');
	} else if (!approvedOperators.includes(runtimeOperator)) {
		block(blocks, gates, 'named-operator', `operator ${runtimeOperator} is not in the approved named-operator list (${approvedOperators.join(', ')})`, 'mismatch');
	}

	// Final release decision — separate go/no-go by the release authority.
	if (finalDecision.decision !== 'go') {
		block(blocks, gates, 'final-go', `final release go/no-go is not 'go' (got ${finalDecision.decision ?? '(none)'})`, 'missing');
	}
	if (finalDecision.approver !== expectedAuthority) {
		block(blocks, gates, 'final-go', 'final go/no-go must be issued by the release authority', 'invalid');
	}
	if (!finalDecision.decidedAt) {
		block(blocks, gates, 'final-go', 'final go/no-go has no timestamp', 'missing');
	}
	if (finalDecision.releaseBuild && finalDecision.releaseBuild !== release.build) {
		block(blocks, gates, 'final-go', `final go/no-go targets a different build: ${finalDecision.releaseBuild}`, 'mismatch');
	}

	const promotable = blocks.length === 0;
	return { promotable, scope: MAINNET_SCOPE, blocks, gates, decision: promotable ? 'allowed' : 'blocked' };
}

// ---------------------------------------------------------------------------
// Approval record loading + journaling (the auditor's state trail).
// ---------------------------------------------------------------------------

export async function loadApprovalRecord(path) {
	if (!path) return null;
	const file = Bun.file(resolve(path));
	if (!(await file.exists())) return null;
	let value;
	try {
		value = JSON.parse(await file.text());
	} catch {
		throw new Error(`mainnet release approval record is not valid JSON: ${path}`);
	}
	return value;
}

export function defaultJournalPath() {
	return resolve(homedir(), '.vice-mainnet', 'mainnet-gate-journal.jsonl');
}

// Appends one JSONL audit record. Never writes secrets — only gate status,
// block reasons, scope, release/build, and timestamps.
// NOTE: Bun.write(..., { append: true }) truncates in Bun 1.3.x, so the journal
// uses node:fs/promises appendFile to guarantee the full state trail survives.
export async function appendGateJournal(journalPath, entry) {
	const path = journalPath || defaultJournalPath();
	await mkdir(dirname(path), { recursive: true });
	await appendFile(path, `${JSON.stringify(entry)}\n`, 'utf8');
	return path;
}

// ---------------------------------------------------------------------------
// Runtime entry point: evaluate the CURRENT environment and journal the result.
// Used by preflight (mainnet branch) and by the promotion-attempt CLI.
// ---------------------------------------------------------------------------

export function runtimeFromEnv(env = process.env) {
	return {
		network: env.VITE_HL_NETWORK ?? 'testnet',
		releaseBuild: env.VICE_MAINNET_RELEASE_BUILD ?? '',
		allowlist: env.VICE_MAINNET_ALLOWLIST ?? '',
		cap: env.VICE_MAINNET_CAP ?? '',
		operator: env.VICE_MAINNET_OPERATOR ?? '',
		observationManifest: env.VICE_MAINNET_OBSERVATION_MANIFEST ?? '',
		canaryOperator: env.VICE_CANARY_OPERATOR ?? '',
		releaseAuthority: env.VICE_MAINNET_RELEASE_AUTHORITY ?? RELEASE_AUTHORITY_DEFAULT,
		approvalPath: env.VICE_MAINNET_RELEASE_AUTHORITY_APPROVAL ?? '',
		journalPath: env.VICE_MAINNET_GATE_JOURNAL ?? ''
	};
}

// Evaluate + journal. Throws on blocked mainnet promotion so callers (preflight)
// fail closed with the full reason list surfaced.
export async function assertMainnetPromotable(runtime) {
	const approval = await loadApprovalRecord(runtime.approvalPath);
	const result = evaluatePromotion({ approval, runtime });
	await appendGateJournal(runtime.journalPath, {
		at: new Date().toISOString(),
		scope: result.scope,
		release: runtime.releaseBuild || null,
		decision: result.decision ?? (result.promotable ? 'allowed' : 'blocked'),
		promotable: result.promotable,
		gates: result.gates,
		blocks: result.blocks
	});
	if (result.scope === MAINNET_SCOPE && !result.promotable) {
		const reasons = result.blocks.map((b) => `  [${b.gate}] ${b.reason}`).join('\n');
		throw new Error(`Mainnet promotion blocked (fail-closed):\n${reasons}`);
	}
	return result;
}

// ---------------------------------------------------------------------------
// CLI: "attempt a promotion" using the current environment. Journal is always
// written; exit code is 0 only when the attempt is allowed.
// ---------------------------------------------------------------------------

async function main() {
	const runtime = runtimeFromEnv();
	const result = await assertMainnetPromotable(runtime);
	console.log(`scope=${result.scope} promotable=${result.promotable} decision=${result.decision ?? (result.promotable ? 'allowed' : 'blocked')}`);
	for (const b of result.blocks) console.log(`  BLOCKED [${b.gate}] ${b.reason}`);
	console.log(`journal=${runtime.journalPath || defaultJournalPath()}`);
	process.exit(result.promotable ? 0 : 1);
}

if (import.meta.main) {
	main().catch((err) => {
		console.error(err.message ?? String(err));
		process.exit(1);
	});
}
