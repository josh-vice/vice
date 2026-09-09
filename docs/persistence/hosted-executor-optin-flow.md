# Hosted Persistent Executor — Explicit User Opt-In Flow (Design Spec)

Status: DESIGN ONLY — no implementation, no code changes.
Author: L0K1 (UX/policy design) · 2026-08-04 · v1.0
Consumes: current persistence classes audit (sk4d1), revocable authority design (m1m1r),
         infrastructure requirements (b4ldr) — sibling cards of the same decomposition.
Output feeds: t_00cefd93 — hosted persistent executor scope decision record (h31m).

---

## 1. Purpose

Specify how a user would explicitly opt in to a *hosted persistent executor*: a mode in
which Vice infrastructure keeps the user's execution loop running after the app or browser
is closed. Today that mode does not exist; the supported persistence classes are
browser-local (device vault) and venue-native (orders resting on Hyperliquid). This spec
makes the future opt-in flow reviewable by product and security reviewers so the PLAN_3
gate "explicit user opt-in" can be considered met on paper — without building anything.

## 2. Design principles (non-negotiable)

1. **Default off.** Browser-local is the default persistence mode. Hosted execution is
   never the default, never pre-checked, never bundled into a ToS-only notice.
2. **Explicit.** Opt-in requires a deliberate user action: checking a consent box and
   pressing an Enable button. No dark patterns, no implied consent.
3. **Informed.** Consent copy states what the system can do, what data is stored, that
   keys never leave the device, the risk of unattended automated execution, and how to
   revoke — in plain language, at the moment of consent.
4. **Revocable.** One visible action in Settings turns it off. Revocation is immediate,
   durable, auditable, and includes a user-facing receipt.
5. **Fail-closed.** If consent state is unknown, expired, or invalid, hosted execution
   pauses. It never continues on stale consent.
6. **Keys stay local.** The hosted executor operates under a revocable, limited authority
   (delegation), never under the user's private keys. Key custody remains on-device.
   (Mechanism: m1m1r's revocable authority design.)
7. **Consent is versioned and auditable.** Every consent record carries a copy version and
   timestamp; grant/use/revoke events are audited; a material change to the copy requires
   re-consent before hosted action resumes.

## 3. Where the opt-in appears in the product flow

Three surfaces, one shared consent modal:

1. **Settings → Execution (permanent home).** The execution-mode section always shows the
   current mode and the hosted option with an explicit Enable control. This is the durable
   management surface and the only place revocation lives. (Mockup 1, Mockup 4.)

2. **Point of need (primary trigger).** When the user enables any capability that requires
   the app to keep working after it is closed — e.g. checking "Keep running after I close
   the app" on a strategy or conditional order — and hosted execution is not yet consented,
   the consent modal opens. Consent is therefore tied to a concrete action the user just
   asked for, which is the strongest form of informed consent. (Mockup 2, Mockup 3.)

3. **App-close awareness (gentle, dismissible).** If the user closes the app while hosted
   execution is off and active strategies would pause, a one-time, dismissible banner offers
   the option: "N strategies will pause when you close the app. Keep them running with
   hosted execution? [Not now] [Learn more]". This is an offer, not a nag, and never blocks
   closing.

**Never** placed in: first-run onboarding (users cannot meaningfully consent before they
understand their own usage), checkout-like flows, or any place where consent could be
mistaken for acceptance of something else.

## 4. Exact consent copy and data-handling notice

### 4.1 Consent modal (exact text)

Title: **Turn on hosted execution?**

Body:

    Hosted execution keeps your active strategies running on Vice infrastructure even
    when this app — or your browser — is closed. It is OFF by default; today your
    strategies only run from this device.

    What enabling means:

    • Vice runs your execution loop on our servers and can place, modify, and cancel
      orders on your behalf, following the strategies you configure.
    • Your private keys never leave this device. We operate under a revocable, limited
      authority — never your keys.
    • We store: your strategy definitions, execution state, and order activity records.
      This data is encrypted in transit and at rest.
    • We do not sell or share your data. Human access is limited to documented, audited
      support and security events.
    • Automated execution may continue while you are away and may result in losses,
      including liquidation. This is not financial advice.
    • You can revoke at any time in Settings → Execution. Revocation takes effect
      immediately; we stop acting on your behalf and delete your execution data.

    [Data handling details] [Full privacy policy]

    ☐ I understand and want to enable hosted execution

    [Enable]  [Not now]

Behavioral requirements for the modal (reviewer checkpoints):
- **Enable is inactive until the checkbox is checked.** This makes consent an explicit,
  deliberate act rather than a button click.
- "Not now" dismisses without consent; no retry coercion within the session.
- Both helper links open before Enable is possible, so consent can be read before given.
- The modal is not skippable via outside-click; the user must choose Enable or Not now.

### 4.2 Data-handling notice (shown at opt-in; also linked from Settings)

    DATA HANDLING — HOSTED EXECUTION

    What we store
    • Strategy definitions (instruments, sizes, conditions, schedule)
    • Execution state (running/stopped, last heartbeats, lease status)
    • Order activity records (time, symbol, side, size, price, status)
    • Account public address and session timestamps
    All encrypted at rest (KMS-managed keys) and in transit (TLS 1.3).

    What we never store
    • Private keys, seed phrases, or wallet credentials (they remain in your
      device vault)
    • Browser history, other applications' data, or account data unrelated to
      hosted execution

    Access
    • Automated systems only. Human access requires a documented, audited request
      (support or security incident); every access is logged.
    • Subprocessors: the cloud hosting provider named in the privacy policy.
      No data brokers, no advertising, no third-party sharing.

    Retention and deletion
    • On revocation: execution data is deleted immediately; a minimal audit record
      (event, timestamp, order-record references) is retained for 30 days, then
      purged. Backups are purged on the same schedule.
    • You can request earlier deletion via [support channel]; venue-side order
      history at Hyperliquid is outside our control and persists on the venue's
      books under your own account.

    Contact: [support channel] for access, correction, or deletion requests.

## 5. Default persistence mode

**Browser-local is the default.** Concretely:

- Strategies run from the user's device using the existing device-vault persistence class
  (see sk4d1's current-persistence audit). Closing the app pauses them.
- Venue-native persistence is orthogonal and unchanged: orders already resting on
  Hyperliquid's books continue their normal lifecycle regardless of this setting. Hosted
  execution only adds *our* ability to keep the execution loop alive.
- Hosted execution engages only after the consent flow in §4 completes. If consent state
  is unknown, corrupted, or out-of-date, the product behaves as OFF (fail-closed).

Rationale: matches the program's fail-closed posture, matches user expectation that a
trading terminal is device-controlled by default, and keeps the PLAN_3 default "no hosted
persistent executor" intact until the decision card (t_00cefd93) and Josh's gate say
otherwise.

## 6. Opt-out / revocation

**One visible path: Settings → Execution → Hosted persistent execution → Turn off /
Revoke authority.** Also honored: account deletion, and automatic revocation (below).

Revocation sequence (fail-closed):

1. User clicks **Turn off** (or **Revoke authority**).
2. Confirmation dialog states impact explicitly (Mockup 5):
   - We stop acting on your behalf immediately.
   - N resting orders remain on Hyperliquid's books (venue-native) and keep their
     lifecycle unless cancelled; user chooses:
       (•) Cancel all N open orders now — recommended, default
       ( ) Leave orders resting on the venue
   - Execution data will be deleted; audit metadata kept 30 days.
3. On confirm, the client sends the revoke request; the server:
   a. Invalidates the delegation authority (revocation-list entry + lease TTL + KMS key
      version rotation — mechanism per m1m1r's design). Authority is dead before anything
      else happens.
   b. Halts the executor: in-flight order mutations complete or abort; no new actions.
      The flow does not report success until in-flight work is resolved.
   c. Executes the chosen order disposition; if "cancel all", verifies open orders reach
      zero (with bounded retry) before claiming success. If the venue is unreachable,
      revocation still completes and the user is told exactly which residual orders they
      must handle at the venue.
   d. Records audit event `hosted.revoke` (scope, timestamp, outcome, order disposition).
4. Receipt shown with audit reference (Mockup 6). Product state returns to browser-local.

**Automatic revocation** (no user action needed, same data handling):
- 60 days without any authenticated session → auto-revoke, notify by email if on file,
  show notice on next login.
- Lease expiry without renewal → executor pauses (infra, b4ldr); sustained expiry revokes.
- Security incident → service-wide revoke of all delegations; users notified.
- Account deletion → treated as revocation with immediate purge.

**Multi-device note:** revocation is account-scoped, not device-scoped. Revoking on one
device stops hosted execution everywhere. (Browser-local mode remains per-device.)

## 7. What happens to stored data after revocation

Tiered, with a single documented retention window:

| Data | On revocation | After 30 days |
|------|---------------|---------------|
| Strategy definitions | Hard-deleted from primary store | gone |
| Execution state | Hard-deleted | gone |
| Order activity records (our copy) | Hard-deleted | gone |
| Audit metadata (event, timestamp, order-record references, receipt ID) | Retained, encrypted | Purged by nightly job |
| Delegation/authority material | Destroyed (revocation list + key version) | gone |
| Backups | Backup purging runs on the same 30-day schedule — no zombie copies | gone |
| Private keys | Nothing to delete — never left the device | — |

- Venue-native orders persist on Hyperliquid's books per the user's choice at revocation
  (or are cancelled if they chose cancel-all). The venue's own order history under the
  user's account is outside our control and is not "our stored data".
- Earlier-purge requests are honored via [support channel].
- The 30-day audit window exists so support/security can answer "what did the system do
  before revocation" — it holds references and events, not user content. Its deletion is
  enforced by the same purge job that clears backups (requirement handed to b4ldr's infra
  design).

## 8. Consent lifecycle: versioning, re-consent, expiry

- Every consent record: `{account, scope, copy_version, timestamp, device binding,
  hash of copy text, receipt_id}`. Stored device-local and mirrored as an audit event.
- **Copy versioning.** Consent is valid only for the copy version it was given under.
  A material change to the consent copy or data-handling notice (new data category, new
  subprocessor, narrower/wider scope) bumps the version:
  - ON → PAUSED; hosted actions halt immediately (fail-closed).
  - User sees a non-blocking banner → the §4 modal, pre-checked box cleared, must
    re-consent to the new copy. Grace period 7 days, then hard pause (no banner).
- **Scope expansion.** Any future capability needing broader authority (e.g. cross-margin,
  new venue) requires a fresh consent for the expanded scope. Scope is never silently
  widened under an existing consent.
- Consent persists until revoked or invalidated — no arbitrary time-box — but the
  60-day inactivity auto-revoke (§6) keeps stale consent from lingering indefinitely.

State machine:

    OFF (browser-local) ──enable + explicit consent──▶ ON (hosted)
         ▲   ▲                                          │   │
         │   │  revoke / account delete /              │   │  copy bump / security hold
         │   │  inactivity / lease expiry              │   ▼
         │   └────────────── REVOKED ◀───────────────── PAUSED (actions halted)
         │                     │ re-enable requires a fresh consent
         └─────────────────────┘

Transitions:
- OFF → ON: user enables + valid consent on the current copy version.
- ON → PAUSED: consent invalidated (copy bump, security hold). No new hosted actions.
- ON / PAUSED → REVOKED: user revoke, account deletion, auto-revoke (inactivity, lease,
  security incident).
- REVOKED → OFF: data handling complete; product returns to browser-local.
- Any → ON: always requires fresh explicit consent. No remembered consent across REVOKED.

## 9. Mockups (ASCII wireframes)

### Mockup 1 — Settings → Execution (hosted OFF, default)

    ┌───────────────────────────────────────────────────────────┐
    │  ← Back                        Settings · Execution        │
    ├───────────────────────────────────────────────────────────┤
    │  Execution mode                                            │
    │                                                            │
    │  ● Browser-local (current)                                 │
    │    Strategies run from this device. Closing the app        │
    │    pauses them. Keys stay in your device vault.            │
    │                                                            │
    │  ○ Hosted persistent execution                             │
    │    [ Enable ]                                              │
    │    Keep strategies running after you close the app, via    │
    │    Vice infrastructure. Requires explicit opt-in.          │
    │    [ Learn more ]                                          │
    │                                                            │
    │  Venue-native orders                                       │
    │    Resting orders on Hyperliquid are unaffected by this    │
    │    setting. [ Manage ]                                     │
    └───────────────────────────────────────────────────────────┘

### Mockup 2 — Consent modal (shared by all triggers)

    ┌───────────────────────────────────────────────────────────┐
    │  Turn on hosted execution?                                 │
    │                                                            │
    │  Hosted execution keeps your active strategies running     │
    │  on Vice infrastructure even when this app — or your       │
    │  browser — is closed. It is OFF by default; today your     │
    │  strategies only run from this device.                     │
    │                                                            │
    │  What enabling means:                                      │
    │  • Vice runs your execution loop on our servers and can    │
    │    place, modify, and cancel orders per your strategies.   │
    │  • Your private keys never leave this device. We operate   │
    │    under a revocable, limited authority — never your keys. │
    │  • We store strategy definitions, execution state, and     │
    │    order records, encrypted at rest and in transit.        │
    │  • We do not sell or share your data. Human access is      │
    │    limited to documented, audited events.                  │
    │  • Automated execution may continue while you are away     │
    │    and may result in losses, including liquidation.        │
    │  • You can revoke any time in Settings → Execution.        │
    │    Revocation is immediate; we delete your execution data. │
    │                                                            │
    │  [ Data handling details ] [ Full privacy policy ]         │
    │                                                            │
    │  ☐  I understand and want to enable hosted execution       │
    │                                                            │
    │                    [ Enable ]   [ Not now ]                │
    │                  (inactive until ☐ checked)                │
    └───────────────────────────────────────────────────────────┘

### Mockup 3 — Point-of-need trigger (strategy card)

    ┌───────────────────────────────────────────────────────────┐
    │  Strategy · TWAP sell 12%                                  │
    │  Instrument  BTC-PERP     Size  12% of spot                │
    │  Window      4h           Slices  24                       │
    │  ☐ Keep running after I close the app                      │
    │    (requires hosted execution — you'll be asked to         │
    │     enable it)                                             │
    │  [ Save ]                                                  │
    └───────────────────────────────────────────────────────────┘
    Checking the box with hosted OFF opens Mockup 2.

### Mockup 4 — Settings → Execution (hosted ON)

    ┌───────────────────────────────────────────────────────────┐
    │  ← Back                        Settings · Execution        │
    ├───────────────────────────────────────────────────────────┤
    │  Execution mode                                            │
    │                                                            │
    │  ○ Browser-local                                           │
    │  ● Hosted persistent execution            ● Active         │
    │    Since 2026-08-04 14:02 UTC · consent v1 · receipt       │
    │    #HX-8F3A2C                                              │
    │    [ Turn off ] [ Revoke authority ] [ View consent ]      │
    │                                                            │
    │    3 strategies are running hosted.                        │
    │    Last seen: 2 min ago · Lease renews automatically.      │
    └───────────────────────────────────────────────────────────┘

### Mockup 5 — Revocation confirmation

    ┌───────────────────────────────────────────────────────────┐
    │  Turn off hosted execution?                                │
    │                                                            │
    │  This stops Vice from acting on your behalf immediately.   │
    │                                                            │
    │  Your 7 resting orders remain on Hyperliquid's books       │
    │  (venue-native) and keep their normal lifecycle unless     │
    │  you cancel them.                                          │
    │                                                            │
    │  (•) Cancel all 7 open orders now  (recommended)           │
    │  ( ) Leave orders resting on the venue                     │
    │                                                            │
    │  Execution data will be deleted; audit metadata kept for   │
    │  30 days (see policy).                                     │
    │                                                            │
    │                    [ Revoke ]   [ Back ]                   │
    └───────────────────────────────────────────────────────────┘

### Mockup 6 — Post-revocation receipt

    ┌───────────────────────────────────────────────────────────┐
    │  Hosted execution is off                                   │
    │                                                            │
    │  ✓  Authority revoked          14:03:12 UTC                │
    │  ✓  7 open orders cancelled (0 failed — retried)           │
    │  ✓  Execution data deleted                                 │
    │  Audit reference: RV-1B7D9E · consent receipt invalidated  │
    │  [ Done ]                                                  │
    └───────────────────────────────────────────────────────────┘

## 10. Edge cases and failure modes

| Case | Behavior |
|------|----------|
| Revoke while an order mutation is in flight | Finish or abort; never report "revoked" until in-flight work is resolved; audit the outcome. |
| Venue unreachable during cancel-all | Revocation still completes; cancel-all retries with bounded backoff; user told exactly which residual orders remain venue-native. |
| Consent copy bumped | ON → PAUSED immediately; re-consent modal; 7-day grace then hard pause. |
| Consent record corrupted/unknown | Treat as OFF (fail-closed); re-consent required. |
| Multi-device revoke | Account-scoped; effective everywhere immediately. |
| Account deletion | Same as revoke + immediate purge; legal audit records kept per policy window. |
| Service compromise | Service-wide authority revoke (KMS version + revocation list, per m1m1r); users notified; no key material existed on the service to leak. |
| Scope expansion request | New consent required; never silent widening. |
| Lease renewal failure | Executor pauses (no new actions) until lease renewed; sustained failure → auto-revoke (per b4ldr infra + §6). |

## 11. Reviewer checklist

Product reviewer:
- [ ] Opt-in appears at the point of need and in Settings; it is never pre-checked and the
      default mode remains browser-local (§3, §5).
- [ ] Consent copy is plain language and states: what the system can do, that keys stay on
      device, what data is stored, the risk of unattended execution, and how to revoke (§4.1).
- [ ] Enable is gated behind an explicit checkbox (no implied consent) (§4.1).
- [ ] Revocation is one visible action from Settings, with an explicit statement of what
      happens to venue orders (§6, Mockup 5).
- [ ] Consent versioning prevents stale consent after copy changes (§8).

Security reviewer:
- [ ] Private keys never leave the device; the hosted executor holds only a revocable,
      limited delegation (mechanism in m1m1r's design) (§2.6, §4).
- [ ] Fail-closed on unknown/invalid consent: PAUSED halts all hosted action (§8).
- [ ] Revocation is immediate, durable, and audited with a user-facing receipt (§6).
- [ ] Data deletion is tiered and bounded: execution data hard-deleted at revocation,
      audit metadata + backups purged within 30 days on the same schedule (§7).
- [ ] Grant/use/revoke audit events defined and referenced (§6, §8).

## 12. Non-goals (explicit)

- No implementation, no product copy changes, no repo changes — design only.
- Does not choose infrastructure (b4ldr), token formats or revocation mechanics (m1m1r),
  or enumerate today's persistence classes (sk4d1).
- Does not decide whether the hosted persistent executor ships; that decision belongs to
  t_00cefd93 (decision record) and Josh's gate. This spec only defines what the opt-in
  would look like if it ships.

## 13. Open items for the decision record (t_00cefd93)

1. Confirm the 30-day audit retention window and the 60-day inactivity auto-revoke as
   defaults (both are policy choices Josh should ratify).
2. Confirm "cancel all open orders" as the default-selected, recommended disposition at
   revocation (chosen for safety; flagged so it is an explicit product decision).
3. Confirm the support/contact channel placeholders ([support channel]) before any
   implementation phase.
