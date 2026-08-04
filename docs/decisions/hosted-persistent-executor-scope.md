# Hosted Persistent Executor — PLAN_3 Scope Decision

Status: DECIDED — NO-GO / intentionally unimplemented
Decision date: 2026-08-04
Decision ID: `PLAN-3-HOSTED-EXECUTOR-SCOPE`
Record owner: H31M (architecture)
Product/security decision owner: Josh

## 1. Decision

Vice does **not** authorize implementation, deployment, or user exposure of a
hosted persistent executor at this time.

The hosted persistent executor remains intentionally unimplemented until the
external gates in §5 are approved and evidenced. The current supported
persistence modes remain:

1. **Browser-local** — encrypted device-local credentials, journals, and local
   automation. Closing the app pauses device-local execution; restart recovery
   and reconciliation remain fail-closed.
2. **Venue-native** — orders accepted by Hyperliquid remain on the venue and
   follow the venue's lifecycle after the browser closes. The venue remains the
   authoritative record for those orders.

There is no silent migration of local state, credentials, journals, or strategy
state to a server. The custody boundary remains unchanged: user private keys
stay on the device, and Vice does not obtain a shared wallet key.

This is a **defer/no-go decision**, not a permanent rejection of the product
concept. A future scope change may reopen the decision only through the
conditions in §7. A design document, green local build, existing local funded
testnet evidence, verbal approval, or customer demand does not reopen it.

### Current operational consequence

- Keep the hosted mutation surfaces fail-closed (`410`/`501`) as documented by
  the current-persistence audit and release smoke checks.
- Do not provision KMS, Postgres, lease infrastructure, executor instances,
  hosted consent UI, hosted data stores, or hosted signing/authority paths.
- Do not collect hosted-execution consent or present hosted execution as an
  available mode.
- Continue supporting and releasing browser-local and venue-native persistence
  under the existing custody, reconciliation, and fail-closed controls.

## 2. Context and evidence

The decision is based on the following current-state facts and design inputs.

### 2.1 What exists today

The current persistence audit records no server-side trading or credential
state. Execution state is device-local, encrypted, and journaled; accepted
venue orders are venue-native. The server-side mutation surfaces are explicit
placeholders: hosted order mutation returns `410`, hosted algorithm start
returns `501`, and the Rust gateway reports execution disabled pending signed
intents with no shared Hyperliquid key.

This is the safe, implemented baseline. It does not represent a partially
available hosted mode.

### 2.2 What the proposed mode would add

A hosted executor would keep user-authorized strategies running while the
browser is closed. That changes the system's security and operating envelope:

- durable remote execution state and audit data;
- unattended order placement, modification, and cancellation;
- revocable authority and lease/fencing enforcement;
- KMS and database custody of encrypted authority/state material;
- remote kill-switch, incident response, backup, deletion, and recovery
  obligations;
- explicit consent, data handling, retention, and revocation UX;
- a new funded testnet and promotion evidence set.

Those obligations are materially different from the present device-local and
venue-native classes. They cannot be inferred from the existing local
implementation or its testnet evidence.

### 2.3 Inputs reviewed

- `docs/persistence/current.md` — authoritative inventory dated 2026-08-04;
  confirms the current classes and intentional `410`/`501` hosted boundary.
- `docs/PLAN_3_REQUIREMENT_MATRIX.md` — identifies the hosted executor as
  intentionally unimplemented pending a separate product/security decision,
  revocable authority, KMS/Postgres/lease infrastructure, and explicit opt-in.
- `revocable-authority-model.md` — proposed delegation, generation, lease,
  proof-of-possession, broker, revocation, and fail-closed model; not approved.
- `hosted-persistent-executor-infrastructure.md` — design-only KMS, Postgres,
  lease, fencing, backup/DR, kill-switch, rollout, and cost envelope; nothing
  deployed.
- `hosted-executor-optin-flow.md` — design-only default-off consent and
  revocation flow; several policy choices remain for Josh to ratify.
- `PLAN_3_EXTERNAL_GATE_AUTHORITY.md` — normative Gate 0, canary, allowlist,
  cap, observation-window, named-operator, and Josh final go/no-go rules.
- `docs/OPERATIONS.md` — current custody boundary and deny-by-default rollout
  ladder.

## 3. Options considered

### Option A — Authorize hosted execution now

**Rejected.** The authority, infrastructure, opt-in, and hosted-scope evidence
gates are not approved or complete. Authorizing now would turn design intent
into an unattended mutation path without a ratified authority boundary,
operating environment, consent contract, or canary evidence.

### Option B — Keep hosted execution intentionally unimplemented until all gates pass

**Selected.** Preserve the current local and venue-native behavior, keep hosted
mutation unavailable, and require the ordered gate and approval process before
any implementation or user exposure.

This option retains a future path without weakening the custody boundary or
forcing users into a remote execution model.

### Option C — Permanently reject hosted execution

**Not selected.** The current evidence supports a no-go now, but does not
require a permanent product rejection. Reconsideration remains possible if a
future proposal satisfies §7 and Josh records the required decision.

## 4. Non-negotiable boundaries while this decision is active

These constraints apply regardless of future design work:

- No user wallet private key, seed phrase, or device agent secret leaves the
  device.
- No hosted executor may use ambient platform credentials or choose its own
  principal, account, resource, scope, or authority.
- No remote action may be admitted from stale, unknown, expired, revoked, or
  unversioned consent/authority state.
- No uncertain venue outcome may be blindly replayed.
- Venue-native orders remain distinct from Vice-hosted execution. Revoke or
  disablement of a future hosted mode must not silently claim to cancel or
  delete venue-side history.
- Existing local testnet evidence is evidence for the current local signing
  path only; it is not evidence that a hosted path is safe or certified.
- Mainnet remains fail-closed under the PLAN_3 release-authority matrix.

## 5. External gates and current status

A hosted executor is not eligible for implementation or exposure unless every
applicable gate below is complete. `OPEN`, `NOT SATISFIED`, `NOT STARTED`, and
`NOT ISSUED` are blocking statuses.

| ID | Gate | Status | Evidence / blocker | Owner and approval needed | Exit condition |
| --- | --- | --- | --- | --- | --- |
| G0 | Current persistence and fail-closed baseline | **PASS — maintain** | `docs/persistence/current.md` inventories the current device-local and venue-native classes and documents the `410`/`501` hosted boundary. This is a safety baseline, not authorization for hosting. | Architecture and release maintainers; no approval converts this baseline into hosted authority. | Keep the current boundary tested and documented while all hosted gates remain open. |
| G1 | Product/security scope decision | **DECIDED NO-GO** | This record makes the current decision: no hosted implementation or exposure. Josh has not approved a change to that decision. | Josh is the product/security decision owner and PLAN_3 release authority. | A dated, explicit Josh decision must authorize a narrowly scoped reconsideration, with network, user/market scope, limits, data handling, and named accountable owners. |
| G2 | Revocable authority design | **OPEN — design only** | The proposed model is not a security approval or implementation contract. It must prove delegation source-of-truth state, generation/lease fences, proof of possession, narrow scopes/resources, broker isolation, local-first revoke, and fail-closed uncertainty behavior. | Security architecture owner (revocable-authority workstream), security reviewer, and Josh. | Written security approval plus integration evidence for grant, use, scope denial, generation revocation, revoke-all, lease expiry, PoP/replay rejection, provider timeout, and authority-store outage. |
| G3 | KMS/Postgres/lease infrastructure and operating environment | **OPEN — design only** | The infrastructure plan defines a possible managed multi-AZ environment, KMS envelope hierarchy, durable journal, lease fencing, backup/DR, kill switch, and rollout. No KMS keys, database, executor fleet, or production environment is authorized or deployed. | Platform/reliability owner (infrastructure workstream), security reviewer, and Josh. | Approved provider/region, environment separation, KMS policy and rotation, private database, lease/fence behavior, backup/restore and DR targets, deletion/purge behavior, monitoring, incident runbook, named operator, and cost envelope. |
| G4 | Explicit user opt-in and revocation flow | **OPEN — design only** | The opt-in spec is not product/security approval. It defines default-off, explicit checkbox consent, plain-language risk/data/key copy, visible revoke, versioned consent, and venue-order disposition, but flags policy choices for ratification. | Product/UX owner (opt-in workstream), privacy/legal and security reviewers, and Josh. | Approved copy and data notice; no pre-check or dark pattern; current copy version and receipt; default-off behavior; account-scoped revoke; fail-closed unknown consent; scope expansion/re-consent; support channel; and ratified retention, inactivity, cancel-all, and deletion behavior. |
| G5 | Gate 0: funded certification for the exact hosted release scope | **NOT SATISFIED** | The 2026-08-03 funded testnet evidence covers the existing exact app/browser signing path. It does not certify a hosted executor, hosted lease, hosted authority, or hosted recovery path. No hosted release manifest exists. | Release/certification owner; Josh approval is required under the PLAN_3 authority matrix. | A versioned, key-free hosted testnet manifest for the exact release scope covering repeated low-notional lifecycle, venue IDs, reconnect/restart, reconciliation, zero duplicates, zero unresolved outcomes, and allowlisted scope. |
| G6 | Hosted testnet pilot and low-notional canary | **NOT STARTED — blocked** | No hosted executor is deployed; no user has opted in; no hosted canary observation window exists. | Named canary operator after G2–G5; platform, security, and product sign-off; the canary operator cannot self-authorize mainnet. | Approved testnet pilot with kill-switch and revoke drills, lease/fence and restart recovery, backup/restore evidence, stale-feed and venue-outage behavior, and a completed observation manifest with no duplicate or unresolved mutation outcomes. |
| G7 | Mainnet allowlist | **NOT STARTED** | No hosted mainnet release/build, account set, or exact instrument allowlist is approved. | Josh. | Non-empty, bounded, versioned allowlist tied to the exact release/build, target network, effective time, and Josh's recorded approval. |
| G8 | Mainnet exposure cap | **NOT STARTED** | No hosted mainnet notional/exposure limits have been selected or verified. | Josh, with product/security and risk input. | Versioned numeric caps with units and scope (order, position, session, and/or day), plus preflight evidence that the exact release enforces them. |
| G9 | Mainnet observation window | **NOT STARTED** | No hosted canary has produced the required timestamped observation interval or pass criteria. | Josh; evidence collected by the named canary/release operator. | Completed window under the approved allowlist and cap, with account/feed health, venue acknowledgements, reconciliation, kill-switch/rollback status, and zero unresolved uncertain, duplicate, stale-state, or unexplained-failure outcomes. |
| G10 | Named mainnet operator | **NOT NAMED** | No operator identity, role, permitted scope, or rollback responsibility has been approved for hosted mainnet. | Josh. | Dated release record naming the operator, exact build/scope, rollback contact/procedure, operator acknowledgement, and Josh's approval; no credentials or signing material in the record. |
| G11 | Final mainnet go/no-go | **NOT ISSUED — fail-closed** | The four mainnet approvals above and the hosted Gate 0 are absent. No canary result or green build can substitute for them. | Josh alone, as PLAN_3 release authority. | After G0 and G7–G10 are approved and verified for the same release/build, Josh records a separate final go/no-go. Any changed build, allowlist, cap, observation criteria, or operator invalidates the affected approval. |

### Gate summary

```text
hosted_implementation_authorized = false
hosted_testnet_authorized        = false
mainnet_promotable                = false
```

The current funded local testnet evidence is valuable for the existing product,
but it cannot be reused as hosted-executor certification. The hosted path has a
different authority, persistence, failure, and operational boundary.

## 6. Owner and approval ledger

| Responsibility | Accountable owner | Required approval or artifact |
| --- | --- | --- |
| Current scope decision and any change from NO-GO | Josh | Dated written product/security decision with exact scope and limits. |
| Architecture record and gate tracking | H31M | This record, kept current; no implementation authority. |
| Revocable authority contract and security verification | Security architecture workstream | Approved authority model and integration/security evidence; Josh's scope approval. |
| KMS, Postgres, lease, backup/DR, kill-switch operating envelope | Platform/reliability workstream | Approved infrastructure design, cost/region/retention choices, runbooks, and recovery drills. |
| Consent, disclosure, revocation, and deletion policy | Product/UX plus privacy/legal and security | Ratified copy version, consent receipt, policy defaults, and revocation/deletion contract. |
| Hosted testnet certification and canary evidence | Named release/canary operator | Exact-scope manifest; canary operator has no implied mainnet authority. |
| Mainnet allowlist, cap, observation window, named operator, final go/no-go | Josh | Four individually verifiable approvals plus separate final decision under `PLAN_3_EXTERNAL_GATE_AUTHORITY.md`. |

Until those approvals exist, there is no implementation owner to activate and no
operator authorized to run a hosted executor.

## 7. Conditions that would reopen this decision

Reopening means reconsidering the no-go status; it is not permission to deploy.
All of the following are required before implementation work may be authorized:

1. **Written scope request and decision.** Josh records that the hosted mode is
   being reconsidered, including the initial network (testnet), allowlisted
   accounts/markets, maximum notional/exposure, supported command families,
   grant duration, data categories, retention/deletion policy, incident owner,
   rollback owner, and named accountable workstream owners. A generic approval
   or verbal direction is insufficient.
2. **Security authority approval.** The revocable-authority model is approved
   as an implementation contract. Integration tests demonstrate no ambient
   authority, immutable subject/resource binding, scoped delegation, short-lived
   proof-of-possession tokens, generation and lease fencing, local-first
   revocation, replay/idempotency handling, credential-broker isolation, and
   fail-closed behavior when revocation or KMS state is stale/unavailable.
3. **Infrastructure approval.** The KMS/Postgres/lease plan is approved for a
   segregated testnet environment. The approved plan includes key policies and
   rotation/revocation, private networking, durable pre-dispatch journaling,
   fencing, kill switch, backup restore, DR and recovery targets, deletion and
   backup-purge behavior, monitoring/alerts, incident runbooks, and an accepted
   cost envelope. Provisioning alone does not satisfy this condition.
4. **Product, privacy, and opt-in approval.** The flow is approved with
   default-off behavior, explicit checkbox consent, exact plain-language scope,
   risk and data handling copy, key-custody statement, consent versioning,
   visible account-scoped revoke, re-consent on material change, and explicit
   venue-order disposition. Josh must ratify the open policy choices, including
   the audit retention window, inactivity auto-revoke, cancel-all default, and
   support/contact path; placeholders are not launch-ready policy.
5. **Hosted Gate 0 certification.** A hosted testnet implementation completes
   the exact funded lifecycle and recovery evidence for the release scope. The
   manifest must be key-free and show venue acknowledgements/IDs, reconnect and
   restart behavior, lease/revoke/kill-switch behavior, reconciliation, zero
   duplicate outcomes, zero unresolved outcomes, and no stale required state.
6. **Controlled canary.** A separately authorized low-notional testnet canary
   completes its full observation window under a bounded allowlist and cap. The
   canary operator may gather evidence and operate rollback, but cannot change a
   gate or promote to mainnet.
7. **Mainnet promotion authority.** If mainnet is later proposed, the PLAN_3
   matrix must be rerun for the same release/build: Gate 0, allowlist, cap,
   completed observation window, named operator, technical preflight, and
   Josh's separate final go/no-go. Any mismatch invalidates the affected
   approval.

After these conditions are met, this record must be amended or superseded with
a new decision revision. No implementation task should infer authorization
from the conditions merely being planned.

### Events that do not reopen the decision by themselves

The following are explicitly insufficient:

- completion of any design-only sibling document;
- a green build, static test suite, smoke test, or browser test;
- the existing browser-local funded testnet manifest;
- a self-hosted/user-run experiment;
- venue-native orders surviving browser close;
- an opt-in mockup without approved copy, policy, and data handling;
- a canary plan without a completed observation manifest;
- verbal, screenshot, or implied approval;
- a request to expose hosted controls while the authorization and deletion
  contracts remain unresolved.

## 8. Effects on current and future work

### Current work may continue

- Device-local encrypted-agent signing, local journals, local algorithms, and
  reconciliation may continue under the existing release gates.
- Hyperliquid venue-native order types may continue to be disclosed and used
  through the existing local signing path; their venue-side persistence is not
  hosted Vice persistence.
- Current fail-closed smoke and release checks remain mandatory.
- Documentation may refine the future design without enabling it.

### Current work must not begin

- No hosted executor process, control plane, authority gateway, credential
  broker, KMS key hierarchy, Postgres schema deployment, lease service, remote
  mutation route, or hosted-consent surface.
- No remote copy of local journals, agent keys, strategy state, or account
  execution state.
- No claim that the hosted executor is available, certified, or mainnet-ready.

## 9. Decision review trigger

Review this record when Josh requests a scope change or when all proposed
reopening evidence is assembled. The default state between reviews is unchanged:
**no hosted persistent executor; browser-local and venue-native persistence are
the supported modes; hosted mutation remains fail-closed.**

## 10. Acceptance checklist

- [x] Context and current persistence boundary recorded.
- [x] Options considered and selected option recorded.
- [x] Current default explicitly states no hosted persistent executor.
- [x] Browser-local and venue-native modes identified as supported.
- [x] Every implementation and promotion gate has an explicit status.
- [x] Owner and approval needed are named for each gate.
- [x] Conditions that would reopen the decision are actionable.
- [x] Existing local evidence is not misrepresented as hosted evidence.
- [x] No implementation, deployment, or product-code change is authorized by
      this record.
