# Hosted Persistent Executor — Infrastructure Design (KMS, Postgres, Leases)

Status:  DESIGN ONLY — no implementation, no deployment, no code changes.
Owner:   B4LDR (reliability / backup / DR)
Inputs:  PLAN_3 requirement matrix (docs/PLAN_3_REQUIREMENT_MATRIX.md), docs/OPERATIONS.md
Feeds:   docs/decisions/hosted-persistent-executor-scope.md (decision record)

> This document defines the infrastructure that WOULD be required if the hosted
> persistent executor is later built. It is intentionally forward-looking: the
> current product default is **no hosted persistent executor**; browser-local
> and venue-native persistence remain the supported classes. Nothing here is
> deployed. The purpose is to give a platform engineer enough detail to
> estimate cost and schedule, and to give the security/product decision a
> concrete operating envelope to approve or reject.

---

## 0. Scope, assumptions, and non-goals

### 0.1 What "hosted persistent executor" means here

A server-side execution service that, **only after explicit user opt-in** and
under a **revocable authority**, can continue executing user-authorized
strategies (the same command families as local execution: place, cancel,
modify, Scale, TWAP, OCO, baskets, triggers) when the user's terminal is
closed. It is the hosted complement to the existing device-local execution
path, not a replacement.

### 0.2 Assumptions

1. **Custody boundary is absolute.** The server never receives a user wallet
   private key, never signs with the user's wallet identity, and never acts as
   the account authority. The hosted executor operates under a scoped,
   short-lived, revocable authority (agent/delegation) issued by the user's
   wallet — see the revocable authority design (sibling workstream). This
   infrastructure design provides the KMS/Postgres/lease substrate that makes
   that authority durable, enforceable, and revocable.
2. **Opt-in is explicit.** No user data or authority is migrated to the hosted
   executor silently. The opt-in flow (sibling workstream) gates everything.
3. **Testnet first, mainnet fail-closed.** The hosted executor launches on
   testnet with a single opt-in pilot; mainnet requires the full canary and
   promotion gate (mirrors the rollout ladder in OPERATIONS.md).
4. **The venue is Hyperliquid today.** The design is venue-agnostic at the
   infrastructure layer (state, leases, keys) but the execution semantics
   reference Hyperliquid's agent/order model.
5. **Managed cloud services are acceptable** for the initial build (AWS
   preferred for KMS maturity; GCP acceptable). A self-hosted HSM is out of
   scope for v1.

### 0.3 Non-goals (explicitly out of scope for v1)

- Storing or touching user wallet private keys (never).
- Replacing browser-local/venue-native persistence — those remain default.
- Multi-region active-active execution (single-region multi-AZ + DR replica).
- Self-managed HSMs, on-prem, Kubernetes at v1 (containerized fleet OK but
  managed Postgres/KMS are required).
- Real-time co-execution across device and hosted paths simultaneously — one
  active executor per account at a time, enforced by the lease.

### 0.4 External gates (from PLAN_3 matrix, gate "Hosted persistent executor")

The infrastructure described here is only ever stood up AFTER:

| Gate | Status |
| --- | --- |
| Separate product/security decision (Josh) | OPEN — decision record in progress |
| Revocable authority design approved | OPEN — sibling workstream |
| KMS / Postgres / lease infra design (this doc) | OPEN — this document |
| Explicit user opt-in flow approved | OPEN — sibling workstream |
| Low-notional testnet canary + mainnet promotion | NOT STARTED (blocked on above) |

Default while any gate is open: hosted persistent executor stays
intentionally unimplemented.

---

## 1. Architecture overview

```
                         ┌────────────────────────────────────────────┐
                         │            User's wallet (authority)       │
                         │   (offline; grants/revokes authority)      │
                         └───────────────────┬────────────────────────┘
                                             │ grant / revoke (signed)
                                             ▼
┌──────────────┐   TLS+mTLS   ┌──────────────────────────────────────────┐
│  User client │◄────────────►│              Control plane               │
│ (terminal/   │              │  - opt-in/opt-out API                    │
│  dashboard)  │              │  - authority grant/revoke API            │
│              │              │  - status/audit read API                 │
└──────────────┘              │  - kill switch API (emergency halt)      │
                              └───────────┬───────────────┬──────────────┘
                                          │              │
                     lease acquire/renew  │              │ authority + envelope keys
                                          ▼              ▼
┌─────────────────────────────────────────────────────┐ ┌──────────────────────────┐
│             Postgres (managed, multi-AZ)            │ │         KMS              │
│  - executor_state (commands/journals)               │ │  - master/KEK hierarchy  │
│  - leases (exclusive execution ownership)           │ │  - per-user DEKs         │
│  - authority_grants (scoped, revocable)             │ │  - per-user signing key  │
│  - audit_events (grant/use/revoke)                  │ │    material (HSM-backed) │
│  - kill_switches / config                           │ │  - versioning/rotation   │
└───────────────────────┬─────────────────────────────┘ └──────────────────────────┘
                        │ lease + fence token + fresh venue state
                        ▼
┌─────────────────────────────────────────────────────┐
│              Executor fleet (≥2 instances)          │
│  - one active executor per account (leader)         │
│  - standby follower(s) hold no authority to sign    │
│  - venue client: Hyperliquid (agent authority)      │
│  - reconciliation loop mirrors certified local path  │
└─────────────────────────────────────────────────────┘
```

Control flow (post-opt-in, one active executor):

1. Executor instance acquires the account lease (`leases` row) with a fence
   token; only the current fence token is accepted for mutations.
2. Executor reads durable command state from Postgres, reconciles with the
   venue, then acts (place/cancel/modify via the scoped authority).
3. Every mutation is journaled to Postgres BEFORE dispatch (command ID,
   deterministic cloids/nonces), matching the certified local journal
   discipline; uncertain outcomes pause rather than replay.
4. Lease heartbeat renews on a fixed interval; on expiry the executor must
   stop acting (fail closed) and the fence token is invalidated.
5. All at-rest secrets and journal payloads are envelope-encrypted with KMS
   DEKs; every KMS use is audited.

---

## 2. KMS key hierarchy and rotation

### 2.1 Hierarchy (AWS KMS terminology; GCP Cloud KMS analogous)

```
                    ┌─────────────────────────────┐
                    │  master_kms (account root)  │  HSM-backed, account-scoped
                    └──────────────┬──────────────┘
        ┌──────────────────────────┼───────────────────────────┐
        ▼                          ▼                           ▼
┌───────────────┐      ┌────────────────────┐        ┌─────────────────────┐
│ env_keks      │      │ audit_key          │        │ signing_root        │
│ (per env:     │      │ (signs audit       │        │ (protects executor  │
│  prod/testnet)│      │  events, immutable)│        │  signing keys;      │
│  -> DEKs      │      └────────────────────┘        │  versioning =       │
└───────────────┘                                    │  revocation handle) │
                                                      └─────────────────────┘
```

Key roles:

| Key | Purpose | Rotation | Access |
| --- | --- | --- | --- |
| `master_kms` | Root CMK; wraps all KEKs | 1y automatic (AWS-managed) or on incident | KMS admin only (break-glass) |
| `env_keks.<env>` | Wraps DEKs for a given environment (prod/testnet separation) | 6–12 months; re-wrap DEKs | Control plane service role |
| `deks.<dataset>` | Data encryption keys for Postgres columns/payloads (command payloads, authority grant envelopes, journal blobs) | 1 year or on compromise; re-encrypt data (envelope) | Application role, only in-scope regions |
| `signing_root` | Wraps each user's hosted signing key material; **version pinning is the revocation mechanism for authority keys** | User-initiated revoke = rotate version + disable old version | Control plane + executor (via grant), never a human |
| `audit_key` | Signs/validates audit event chains (tamper-evidence) | 2 years | Audit pipeline only |

### 2.2 Envelope encryption model

- Every secret stored in Postgres or object storage is an **envelope**: random
  256-bit DEK per record/object, the DEK encrypted by the appropriate KEK.
  Plaintext never touches disk or DB; DBAs see ciphertext only.
- Decryption happens in-process with KMS `Decrypt` grants limited by
  (a) role, (b) resource prefix, (c) key version. No long-lived DEKs cached
  beyond a bounded in-memory TTL (e.g. 5 min).
- `vice.hl.agent.v1:*` record format (mirroring the local vault naming) is
  stored as an envelope in `authority_grants`, never in plaintext.

### 2.3 Rotation mechanics

1. **Scheduled rotation:** KMS rotates the KEK; old DEK ciphertexts are
   re-wrapped lazily (re-encrypt on read/write path) or via a background
   re-wrap job. No user-visible downtime.
2. **Incident rotation (compromise):** disable the compromised key version
   immediately → all ciphertext under it becomes unreadable → re-issue
   authority (user re-approves) → re-encrypt affected datasets under a fresh
   version. This is also the *fast* revocation path for an executor signing
   key: **disable the key version = the hosted authority can no longer sign.**
3. **Rotation windows:** KEKs 6–12 months; DEKs 12 months; signing key
   versions rotate on every user revoke/re-grant; audit key 24 months.
4. **Automation:** Terraform/IaC-managed key resources; rotation tests in CI;
   a scheduled job (`kms-rotation-drill`) that re-wraps a sample set and
   verifies old-version ciphertext is still decryptable until the cutover.

### 2.4 KMS access control

- KMS key policies grant the minimal service role; humans have no KMS
  permission by default (break-glass via short-lived elevated role, logged).
- All KMS API calls logged to CloudTrail; alert on: Decrypt from unexpected
  region/role, DisableKey outside change window, unusual request volume.
- Key usage quotas monitored; a hosted executor must never hit KMS rate
  limits during a trading burst (batch decrypts, in-memory caching of DEKs).

---

## 3. Postgres schema: durable executor state + lease table

Managed Postgres (AWS RDS/Aurora or GCP Cloud SQL), multi-AZ, PITR on.
Below is the design reference schema — the canonical DDL would be introduced
only if the scope decision approves implementation.

### 3.1 `leases` — exclusive execution ownership

```sql
CREATE TABLE leases (
    lease_key       TEXT NOT NULL,          -- 'account:<network>:<address>' (one active executor per account)
    holder_id       TEXT NOT NULL,          -- executor instance id (uuid)
    token           TEXT NOT NULL,          -- random lease token (proof of possession)
    fence_token     BIGINT NOT NULL,        -- monotonically increasing; bumps on EVERY renewal/acquire
    acquired_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL,   -- TTL = acquired_at + lease_duration
    heartbeat_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    version         BIGINT NOT NULL DEFAULT 1,   -- optimistic concurrency guard
    PRIMARY KEY (lease_key)
);
CREATE INDEX idx_leases_expires ON leases (expires_at);
```

Lease parameters (defaults, tunable):

| Parameter | Default | Rationale |
| --- | --- | --- |
| `lease_duration` | 30 s | Long enough to survive normal GC pauses/venue latency; short enough to bound a dead holder's window |
| `heartbeat_interval` | 10 s | Renewal must comfortably fit inside the TTL (3× margin) |
| `grace_period` | 15 s | After expiry before another holder may acquire (allows network blips without thrash) |
| `fence_token` | bump each acquire/renewal | Every mutation must present the current token; stale holders are rejected |

Acquire (atomic, single statement):

```sql
-- Attempt to take the lease (fails if an unexpired lease exists)
INSERT INTO leases (lease_key, holder_id, token, fence_token, acquired_at, expires_at, heartbeat_at, version)
VALUES ($1, $2, $3, 1, now(), now() + interval '30 seconds', now(), 1)
ON CONFLICT (lease_key) DO NOTHING
RETURNING *;
-- If no row returned, check if it expired; if expired, steal:
UPDATE leases
   SET holder_id = $2, token = $3, fence_token = fence_token + 1,
       acquired_at = now(), expires_at = now() + interval '30 seconds',
       heartbeat_at = now(), version = version + 1
 WHERE lease_key = $1 AND expires_at < now() - interval '15 seconds'  -- grace
RETURNING *;
```

Renewal (must carry the current token — a stale holder cannot renew):

```sql
UPDATE leases
   SET expires_at = now() + interval '30 seconds',
       heartbeat_at = now(),
       fence_token = fence_token + 1,
       version = version + 1
 WHERE lease_key = $1 AND token = $2 AND version = $3   -- token + optimistic concurrency
RETURNING fence_token;
```

Release (clean shutdown):

```sql
DELETE FROM leases WHERE lease_key = $1 AND token = $2;
```

Fencing enforcement — every executor mutation of venue/state MUST be
conditional on the lease being still valid and its fence token unchanged:

```sql
-- Guard executed immediately before dispatch:
SELECT 1 FROM leases
 WHERE lease_key = $1 AND token = $2 AND fence_token = $3 AND expires_at > now();
-- If this returns 0 rows: DO NOT SIGN. Re-acquire or stop.
```

### 3.2 `authority_grants` — scoped, revocable authority

```sql
CREATE TABLE authority_grants (
    grant_id        UUID PRIMARY KEY,
    account_addr    TEXT NOT NULL,          -- user account (public address)
    network         TEXT NOT NULL,          -- 'testnet' | 'mainnet'
    principal       TEXT NOT NULL,          -- user wallet address (authority source)
    scopes          JSONB NOT NULL,         -- allowlist: {max_notional, order_types[], markets[], max_open_orders, daily_limits}
    signing_key_ref TEXT NOT NULL,          -- KMS key version reference for the hosted signing key
    status          TEXT NOT NULL,          -- 'active' | 'revoked' | 'expired' | 'rotating'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ NOT NULL,   -- hard TTL; requires re-approval after
    revoke_epoch    BIGINT NOT NULL DEFAULT 0,   -- bumped on every revoke; envelopes carry it
    PRIMARY KEY (grant_id)
);
CREATE INDEX idx_grants_account ON authority_grants (network, account_addr, status);
```

- `revoke_epoch` is the user-visible revocation counter; the opt-out/revoke
  flow (sibling workstream) bumps it. Any pending command whose envelope
  carries a stale `revoke_epoch` is refused.
- `expires_at` forces periodic re-approval even without an explicit revoke
  (defense in depth, e.g. 90 days default).

### 3.3 `executor_state` — durable command journal

```sql
CREATE TABLE executor_state (
    command_id      UUID PRIMARY KEY,       -- deterministic command id (matches local journal discipline)
    account_addr    TEXT NOT NULL,
    network         TEXT NOT NULL,
    kind            TEXT NOT NULL,          -- place | cancel | modify | scale | twap | oco | basket | trigger ...
    status          TEXT NOT NULL,          -- pending | dispatched | partial | complete | paused | failed | uncertain
    payload_enc     BYTEA NOT NULL,         -- envelope-encrypted command payload (market identity, size, price)
    cloid           TEXT,                   -- deterministic client order id
    venue_order_ids JSONB,                  -- authoritative venue ids when known
    fence_token_at_dispatch BIGINT NOT NULL,-- lease fence token under which this command was valid
    parent_id       UUID,                   -- for multi-leg (OCO/basket) lineage
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    dispatch_attempts INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_state_account_status ON executor_state (account_addr, network, status, created_at);
CREATE INDEX idx_state_parent ON executor_state (parent_id);
```

Discipline (mirrors the certified local journal):
- Insert with status `pending` BEFORE dispatch (exact pre-dispatch IDs).
- `uncertain` outcomes pause the runner — never auto-replay.
- Reconciliation updates status only after authoritative venue response.
- `complete` requires every leg reconciled.

### 3.4 `audit_events` — immutable, tamper-evident

```sql
CREATE TABLE audit_events (
    event_id        BIGSERIAL PRIMARY KEY,
    event_type      TEXT NOT NULL,          -- authority_grant | authority_revoke | command_dispatch | lease_acquire | lease_expire | kill_switch ...
    account_addr    TEXT,
    actor           TEXT NOT NULL,          -- principal or service role
    payload_enc     BYTEA,                  -- envelope-encrypted detail (no keys, no signatures, no raw secrets)
    prev_hash       TEXT NOT NULL,          -- hash chain linkage (tamper evidence)
    event_hash      TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_account_time ON audit_events (account_addr, created_at);
```

Audit records NEVER contain private keys, signatures, or raw request bodies —
same rule as the local audit download (docs/OPERATIONS.md).

### 3.5 `kill_switches` / config

```sql
CREATE TABLE kill_switches (
    account_addr    TEXT PRIMARY KEY,
    network         TEXT NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT false,
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      TEXT NOT NULL
);
```

- Hosted equivalent of `VITE_HL_TRADING_KILL_SWITCH`: halts new place/modify/
  TWAP/Scale transmissions for an account; preserves open-order visibility,
  reconciliation, and cancellation.
- Global (all-accounts) kill switch row keyed `*` — one statement to stop the
  whole hosted fleet.

---

## 4. Availability, failover, backup/DR

### 4.1 Targets

| Metric | Target |
| --- | --- |
| Control plane / executor API availability | 99.9% monthly (≈43 min/month) |
| Postgres availability | 99.95% (managed multi-AZ, automatic failover) |
| RPO (point-in-time) | ≤ 5 min (PITR + WAL) |
| RTO (region failure) | ≤ 60 min to restore read/write from DR replica |
| Backup restore drill | ≥ 1 full restore test per quarter, documented |

### 4.2 Topology

- **Single region, multi-AZ** (primary + synchronous standby + reader):
  - Managed Postgres with automatic failover (Aurora/Cloud SQL HA).
  - Executor fleet spread across ≥2 AZs behind a load balancer; leader
    election via the lease table (only one holder signs for an account).
- **DR region (async):** cross-region read replica + nightly snapshots copied
  cross-region + KMS keys replicated (or a KMS multi-region key) + config/
  IaC promoted by runbook. No automatic failover to DR in v1 (human-gated
  runbook decision; automatic failover of a *trading* system is a risk
  decision for Josh).

### 4.3 Backup strategy

- **Continuous:** WAL archiving → PITR window ≥ 7 days (tune to cost).
- **Daily:** full snapshot, retained 30 days; weekly snapshot retained 90 days;
  monthly retained 12 months.
- **Cross-region:** daily snapshot copy to DR region; WAL streaming to DR for
  RPO ≤ 5 min.
- **Backup encryption:** snapshots encrypted with a dedicated backup KEK;
  restore requires KMS access from the DR region.
- **Restore testing:** quarterly automated restore drill — restore the latest
  snapshot + WAL to a throwaway instance, validate: schema integrity, lease
  table sanity, a sample of journal payloads decrypt, and (critically) that
  restored state does NOT accidentally re-authorize an old fence token
  (fence token monotonicity is preserved by the restore — a restored stale
  lease must expire quickly, so `expires_at` is not modified on restore; a
  dead holder's lease just expires and a live executor re-acquires).

### 4.4 Failover behavior

- **Postgres primary loss:** managed failover to standby (seconds–minutes).
  Executor lease holder may see a brief window where its renewal fails → it
  stops acting (fail closed), retries renewal; the lease TTL (30 s) bounds
  the stall.
- **Executor instance loss:** lease expires within 30 s; follower acquires
  after grace (15 s); new holder reconciles venue state from `executor_state`
  + authoritative venue snapshot before resuming. No duplicate dispatch:
  `uncertain` commands are paused, not replayed (same rule as local).
- **Region loss:** human-gated promotion of DR replica per runbook; RTO ≤ 60
  min. Kill switch available during the window.

---

## 5. Lease expiry and recovery

### 5.1 Expiry lifecycle

1. Holder heartbeat stops (crash, network partition, GC stall, AZ loss).
2. `expires_at` passes; no renewal → lease is expired.
3. After `grace_period`, any eligible executor may acquire (fence token
   increments; old token invalid).
4. Old holder, if it comes back, attempts a mutation → fencing check fails
   (token mismatch) → it must re-acquire or stand down. **It can never act
   with a stale token.** This is the split-brain guard.

### 5.2 Recovery sequence (new holder)

1. Acquire lease → new fence token.
2. Load `executor_state` rows for the account: `pending`/`dispatched`/
   `uncertain` entries.
3. Reconcile against authoritative venue state (open orders, positions,
   fills) — reusing the certified reconciliation semantics.
4. `complete` = every leg reconciled; `uncertain` pauses and surfaces in the
   user's terminal for explicit resume on the exact market (mirroring local
   OCO/Swarm pause behavior).
5. Resume only paused-eligible work; never auto-replay a dispatch whose
   outcome is unknown.

### 5.3 Clock and partition safety

- Executors run NTP-synced; lease checks use DB `now()` (not local clock) as
  the source of truth for expiry.
- Renewal is 3× inside TTL; a 20 s partition cannot cause a false expiry.
- A real expiry during a partition causes, at worst, a ≤ 45 s execution gap
  (TTL 30 s + grace 15 s) — never a double-sign.

---

## 6. Security and guardrails

### 6.1 Fail-closed rules (non-negotiable)

- No mutation without: valid lease + current fence token + `grant.status =
  'active'` + `revoke_epoch` current + kill switch off + fresh authoritative
  venue state.
- Any of these missing → refuse to sign; surface degraded state.
- `uncertain` outcomes pause; never replay blindly.
- Mainnet requires the full promotion gate (allowlist, caps, observation
  window, named operator). Testnet is the default network.
- Hosted executor never holds a wallet private key; signing identity is the
  scoped agent authority only.

### 6.2 Network and secret hygiene

- All APIs TLS 1.2+ with mTLS between control plane, executors, and Postgres
  (IAM/Cloud SQL auth, no passwords in env).
- Secrets never in env/commits: KMS envelope + short-lived grants only.
- Postgres in a private subnet; no public endpoint. Executor → venue egress
  via allowlisted egress; no inbound from the internet.
- VPC/SDN isolation between environments (prod/testnet keys, networks, DBs).

### 6.3 Monitoring and alerting

- Alert on: lease expiry storms, fence-token rejections (possible split-
  brain), repeated `uncertain` outcomes, KMS decrypt anomalies, kill switch
  activation, backup job failures, restore-drill failures.
- Dashboards: leases per account, heartbeat lag, dispatch/reconcile latency,
  KMS request volume, backup age, DR replica lag.

### 6.4 Compromise/failure scenarios (summary)

| Scenario | Containment | Recovery |
| --- | --- | --- |
| Executor instance compromised | Kill switch + revoke authority; KMS disable signing key version; fence token invalidates lease | Re-issue authority after review; reconcile venue state |
| Postgres DB dumped | Data is envelope-encrypted; DEKs not in DB; KMS grants prevent mass decrypt | Rotate DEKs; audit; no key material exposed |
| KMS key compromise | Disable key version immediately (all ciphertext unreadable); rotate KEKs | Re-issue authorities (user re-approves); re-encrypt datasets |
| Authority grant compromised (revocable authority flow) | Bump `revoke_epoch`; disable signing key version; user-facing revoke | User re-grants with fresh scopes |
| Venue outage / feed stale | Executor pauses (same rule as local: no stale state trading) | Reconcile on venue recovery; resume paused-eligible work only |
| Split-brain attempt (stale holder) | Fence token check rejects the mutation at the DB | Log + alert; stale holder stands down |

---

## 7. Migration / rollout plan

Design only — phases would be executed only after the scope decision.

### Phase 0 — Decision and foundation (2–4 weeks)
- Scope decision recorded (docs/decisions/...), external gates reviewed.
- Cost estimate sign-off (Section 8), IaC skeleton, KMS hierarchy created,
  managed Postgres instance provisioned in **testnet** account.
- No user-facing feature; no executor fleet.

### Phase 1 — Testnet pilot, single opt-in user (4–6 weeks)
- Control plane + executor fleet (2 instances) on testnet.
- Opt-in flow wired (gated by the approved consent copy).
- Lease/authority/journal plumbing + fencing verified with synthetic
  kill/restart/partition drills.
- Acceptance: one real testnet account runs a low-notional strategy via the
  hosted path; every mutation journaled; kill switch halts it; revoke stops
  it; restart recovery reconciles.

### Phase 2 — Limited allowlist on testnet (4–6 weeks)
- N opt-in testnet users (allowlist), scopes enforced (max notional, order
  types, markets, daily limits).
- Backup/DR drill #1 executed and documented (quarterly cadence begins).
- Chaos: AZ loss, Postgres failover, executor kill mid-dispatch, lease
  expiry storm — all must fail closed with zero double-signs.

### Phase 3 — Mainnet canary (conditional, 4–8 weeks)
- Only after Phase 2 evidence + product/security sign-off + named operator.
- Low-notional allowlist, observation window, kill switch ready.
- Mainnet promotion review identical in spirit to OPERATIONS.md rollout
  ladder step 5.

### Phase 4 — General availability (conditional)
- Broad opt-in; cost model finalized; runbooks complete; DR drill annual.

### Rollback
- Kill switch (per-account or global) halts new transmissions immediately.
- Revoke authorities → hosted executor loses signing ability (KMS version
  disable + `revoke_epoch` bump).
- Data: hosted state deleted per opt-out/revocation policy (sibling flow);
  browser-local/venue-native persistence unaffected — users can always
  return to the default modes.

### Migration of data
- No silent migration. Users opt in; their local journals/positions are
  reconciled FROM the venue into hosted state at first activation (venue is
  the source of truth, as everywhere else in this program). Local journal
  files remain user-owned; hosted state is a separate, opt-in dataset.

---

## 8. Cost and operational considerations

Rough monthly figures (single region, small start; USD, managed services).
A platform engineer should re-quote for the chosen cloud; these are sizing
anchors, not a commitment.

| Component | Sizing (v1 start) | Est. monthly |
| --- | --- | --- |
| KMS | ~10 keys + API volume (low) | $5–15 |
| Postgres (managed, multi-AZ) | db.t4g.small/large, 100–200 GB, PITR 7 d, snapshots 30/90 d | $150–450 |
| DR replica (async, standby) | same size, cross-region | $100–300 |
| Executor fleet | 2 × small containers (testnet), 2–4 × medium (mainnet) | $60–300 |
| Control plane + LB + networking | small | $50–150 |
| Backup storage + cross-region copy | 3× snapshot growth | $20–80 |
| Monitoring/alerting | managed | $30–100 |
| **Total v1 (testnet pilot)** | | **≈ $400–1,400/mo** |
| **Total steady-state (mainnet, small)** | | **≈ $600–2,400/mo** |

Scale drivers: number of active accounts (leases/state rows), journal volume,
KMS decrypt volume, snapshot retention. The dominant cost is managed Postgres
+ DR; consider reducing PITR to 3 days or dropping the DR replica until
Phase 3 if cost is binding.

### Operational burden (per week, steady state)
- ~0.5–1 h: monitor dashboards, review alerts.
- ~1–2 h/month: backup/restore drill execution + documentation.
- ~2–4 h/month: KMS rotation windows, version audits.
- Incident response: kill switch operator named per deployment (matches
  OPERATIONS.md "Incident owner, rollback command, and kill-switch operator").

### Schedule (cumulative)
- Phase 0: weeks 0–4. Phase 1: weeks 4–10. Phase 2: weeks 10–16.
  Phase 3 (conditional): weeks 16–24. GA: not before week 24, and only on
  gates. Total engineering estimate: ~2–3 engineers for 4–6 months to reach
  a Phase-2-credible hosted executor; mainnet promotion is a separate,
  evidence-gated decision.

---

## 9. Open questions for the decision record

1. Region choice and cloud provider (AWS assumed; confirm).
2. Maximum notional / per-account caps for hosted execution (needed for
   `authority_grants.scopes` defaults and cost model).
3. Who is the named kill-switch operator on mainnet.
4. Retention policy for hosted state after opt-out (sibling opt-in flow
   decides; infra supports hard delete + snapshot purge).
5. Whether DR failover stays human-gated forever or becomes automatic after
   N quarters of drills.

---

## 10. Acceptance checklist (this design)

- [x] KMS key hierarchy and rotation defined (Section 2)
- [x] Postgres schema for durable executor state + lease table (fields, TTL,
      renewal, fencing tokens) (Section 3)
- [x] Availability, failover, backup/DR (Section 4)
- [x] Lease expiry and recovery (Section 5)
- [x] Security/guardrails (Section 6)
- [x] Migration/rollout plan (Section 7)
- [x] Cost/operational considerations (Section 8)
- [x] No code changes made; design only
