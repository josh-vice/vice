# PLAN_3 External Gates and Release Authority Matrix

Status: normative release policy
Scope: low-notional canary and mainnet promotion

## 1. Non-negotiable policy

1. **Funded certification is the prerequisite.** No PLAN_3 external approval is valid until mainnet funded certification has passed for the release scope.
2. **Canary is not mainnet authority.** The person or process that deploys/runs the canary or low-notional pilot may collect evidence, but cannot self-authorize mainnet promotion.
3. **Mainnet has a separate release authority.** Josh is the release authority for PLAN_3: only Josh may approve the four external items below and issue the final mainnet go/no-go. This authority is separate from canary/low-notional deployment authority and may not be delegated by implication.
4. **Mainnet is fail-closed.** A green build, static test suite, or successful canary does not substitute for an approved and verified external gate.

## 2. Required precondition: Gate 0

Before any item below can be approved, the release packet must contain a passing funded-mainnet certification manifest for the exact release scope. It must prove repeated US-002/003/004 passes, reconnect and restart behavior, venue order IDs, zero duplicate outcomes, zero uncertain outcomes, cleanup, and the allowlisted low-notional pilot. The manifest must identify the full release SHA, artifact and policy digests, target network, and capture timestamps; it must contain no keys or signatures.

At promotion time the runtime mainnet evidence file (`VICE_MAINNET_EVIDENCE`) must be byte-identical to the manifest that satisfied Gate 0: its sha256 must equal the `fundedCertification.sha256` recorded in the approval record and its path must resolve to the same evidence reference. A different-but-valid manifest never satisfies the gate.

If Gate 0 is absent, stale, malformed, wrong-network, or failing, all four approvals are invalid and mainnet remains blocked.

## 3. Ordered approval matrix

The approvals are recorded and verified in this order. Every row requires **Josh** as approver and **Gate 0: funded certification passed** as its precondition.

| Order | Approval item | What Josh must approve | Acceptable evidence | Failure effect |
| --- | --- | --- | --- | --- |
| 1 | **Allowlist** | The exact mainnet markets/accounts/instruments permitted for the release. The allowlist must be non-empty, bounded, and scoped to the release/build. | Versioned allowlist configuration (for example, the resolved `VICE_MAINNET_ALLOWLIST`), release/build reference, target network, effective timestamp, and Josh's recorded approval. The evidence must show the exact entries, not merely “allowlist reviewed.” | Missing, empty, changed, or unverified allowlist blocks promotion. |
| 2 | **Cap** | The maximum permitted exposure for the release, expressed with explicit numeric value(s), units, and scope (per order, position, session, or day as applicable). | Versioned cap configuration plus preflight or policy output showing the cap is loaded and enforced for the approved release/build. Josh's approval must identify the approved value(s) and scope. | Missing, ambiguous, exceeded, changed, or unverified cap blocks promotion. |
| 3 | **Observation window** | The exact low-notional observation interval and pass criteria. The window must complete after canary deployment under the approved allowlist and cap. | Timestamped canary/observation manifest covering the full start/end interval, release/build, commands and venue acknowledgements, reconciliation results, account/feed health, and rollback/kill-switch status. It must show no unresolved uncertain outcomes, duplicate outcomes, stale required state, or unexplained reconciliation failure. A planned window without completed evidence is not a pass. | An incomplete window, missing telemetry, stale evidence, unresolved outcome, or unexplained failure blocks promotion. |
| 4 | **Named operator** | The identity and role of the operator authorized to execute the approved mainnet promotion, including the operator's permitted scope and rollback responsibility. | A dated release record naming the operator (or unambiguous operator identifier), target release/build, scope, rollback contact/procedure, operator acknowledgement, and Josh's approval. Do not include credentials, private keys, or signing material. | No named/approved operator, conflicting identity, or unverifiable acknowledgement blocks promotion. |

## 4. Final release decision

After rows 1–4 are approved and the observation evidence is verified, Josh must make a separate final mainnet go/no-go decision against the same release/build. The named operator may execute only that approved release and only within the approved allowlist and cap. The canary operator has no authority to alter a gate, expand scope, or promote to mainnet.

Any change to the release/build, allowlist, cap, observation criteria, or named operator invalidates the affected approval and requires the approval sequence to be rerun. A technical mainnet preflight (including required acknowledgements and latency/evidence checks) remains mandatory; this matrix does not waive it.

## 5. Deny-by-default rule

`mainnet_promotable = true` only when Gate 0 and all four approved, verifiable rows are present for the same release/build and the completed observation window passes. If **any** gate is absent, unverified, expired, mismatched, or disputed, the result is `mainnet_promotable = false`: do not promote, do not enable mainnet mutations, and do not treat verbal approval, a screenshot, a green build, or a canary result alone as an override.
