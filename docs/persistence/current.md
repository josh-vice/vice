# Vice Persistence — Current State (authoritative snapshot)

Date: 2026-08-04
Scope: all persistence classes that exist in the repository today (vice-terminal
SvelteKit app, legacy `vice/` Hub island, `vice-backend` Rust gateway, and the
Bun hermes-sidecar). No code changes accompany this document.

Purpose: give an architect enough detail to make scope decisions about
persistence — what is stored, where, by whom, for how long, and what happens
when it fails.

---

## 1. Executive summary

Every persistence class in Vice is **device-local** or **venue-native**. There
is no server-side persistence of any trading or credential state, and the
hosted persistent executor is intentionally unimplemented (see §2).

Storage backends in use today:

| Backend | Used by |
| --- | --- |
| Browser `localStorage` | All browser-runtime persistence (execution journals, agent vault, algo jobs, market/candle caches, UI preferences) |
| File-backed `localStorage` shim (`~/.vice-hermes/vault.json`, mode 700/600) | Bun hermes-sidecar runtime; mirrors browser localStorage for the certified execution modules |
| IndexedDB (`vice-suite` DB v1) | Legacy Hub mirror of `viceHub.v1` (best-effort durability copy) |
| Venue-native (Hyperliquid exchange state) | Accepted orders (limit/market/stop/stop-limit/bracket/TWAP); authoritative after acceptance, survives browser close |
| None (format contracts only) | Runner / pairing envelopes — explicitly non-persistent, non-transmitting |

Credential material (agent private key, Blofin API secrets) is always stored
AES-GCM-256 encrypted, keyed by PBKDF2-SHA256 (210,000 iterations) derived from
a user signature or unlock phrase. No key material is ever serialized in the
clear, and no credential bytes ever leave the device.

---

## 2. Hosted persistent executor — intentionally unimplemented

There is **no hosted persistent executor**. Every server-side execution surface
is a fail-closed placeholder that returns 410/501, and the product docs state
the feature is intentionally out of scope unless the PLAN_3 external gates
pass.

Explicit placeholders and their current behavior:

| Surface | Behavior | File |
| --- | --- | --- |
| `POST /api/hl/order` (+ DELETE, PATCH) | `410 Server-side trading is disabled. Sign with the encrypted local agent.` (`GET` is read-only order-status fetch) | `vice-terminal/src/routes/api/hl/order/+server.ts` |
| `POST /api/algo/start` | `501 Advanced algorithms are unavailable until signed child-intent orchestration is enabled.` | `vice-terminal/src/routes/api/algo/start/+server.ts` |
| hermes-sidecar `POST /api/algo` | `501` — P3 advanced orders, intentionally fail-closed | `vice-terminal/src/lib/hermes-sidecar/server.ts` |
| Rust gateway `/health` | `execution: "disabled_pending_signed_intents"`, `custody: "no_shared_hyperliquid_key"`; only `/health` route exists | `vice-backend/gateway/src/main.rs` |

Governance references:

- `docs/PLAN_3_REQUIREMENT_MATRIX.md` lists **Hosted persistent executor —
  Intentionally unimplemented**. Required before implementation: a separate
  product/security decision, revocable authority design, KMS/Postgres/lease
  infrastructure, and explicit user opt-in. Decision path: "Approve the
  hosted-authority scope and operating environment; otherwise retain the
  documented browser-local and venue-native persistence classes."
- `docs/user-stories/US-011-persistent-automation.md`: hosted Vice-side signing
  remains prohibited; an optional **self-hosted** orchestrator is user-run,
  holds only that user's own agent key, and must reuse the same journaled
  execution client — no divergent second execution path.
- In-app guide `src/lib/docs/content.ts` (`self-hosted-execution`): "This
  planned feature has no shipped runner or hosted executor. Do not treat
  device-local jobs as headless automation."
- `scripts/smoke.mjs` asserts the fail-closed contract in CI-style smoke tests:
  `POST /api/hl/order → 410`, `POST /api/algo/start → 501`.

**Standing rule:** the hosted persistent executor will remain out of scope
unless the PLAN_3 external gates pass. Device-local and venue-native
persistence classes in §3–§6 are the complete current persistence surface.

---

## 3. Execution and credential persistence (device-local)

### 3.1 Vault shim (transport glue, not a credential store)

- Module: `vice-terminal/src/lib/hermes-sidecar/vault.ts`
- Backend: JSON file at `~/.vice-hermes/vault.json` (dir mode 0700, file mode
  0600), exposed as `globalThis.localStorage`; also installs
  `window.isSecureContext = true`. Directory overridable via `VICE_HERMES_DIR`.
- Lifecycle: `installVaultShims()` must run before any `src/lib` execution
  module evaluates; lazy-load on first access; synchronous persist on every
  `setItem`/`removeItem`/`clear`.
- Data model: `Record<string, string>` (string values only). Carries the agent
  vault encrypted record, command journal bytes, execution sequence, and the
  non-secret market catalog cache.
- Durability/privacy: single file, 16 MB cap; only encrypted records and
  journal bytes stored; no key material in the clear. Comments: "transport
  glue, not a second credential store — the certified modules keep all crypto."
- Failure modes: corrupt JSON → starts empty and logs (`store.data = {}`), so
  a read-only sidecar boots but signing fails closed (absent record); oversized
  file → refuses to load; write failure → logged, in-memory state diverges.
- Tests: `vice-terminal/src/lib/hermes-sidecar/vault.test.js` (shim install,
  round-trip, file mode 0700/0600, restart persistence, clear).

### 3.2 Encrypted agent vault (Hyperliquid agent key)

- Module: `vice-terminal/src/lib/execution/agentVault.ts`
- Backend: browser `localStorage` / vault-shim file. Key:
  `vice.hl.agent.v1:<testnet|mainnet>:<mainAddress>`.
- Data model: `AgentRecord { version:1, mainAddress, agentAddress, ciphertext,
  iv, salt, builderApproved, referralAttempted }`.
- Crypto: AES-GCM-256; key derived PBKDF2-SHA256, 210,000 iterations, from a
  `personal_sign` challenge signature (lowercased). No key material stored in
  the clear.
- Lifecycle: `unlockOrCreateAgent` — decrypt existing record with the wallet
  signature, or generate a fresh private key, encrypt, persist, and approve the
  agent on the venue; `assertProviderAccount`/`assertConnectedAccount` lock
  trading if the connected wallet changes; requires `window.isSecureContext`.
- Durability/privacy: device-local only; decrypt verifies
  `agent.address === record.agentAddress` (identity check) before use.
- Failure modes: corrupt/absent record → treated as no agent (fresh create);
  wrong signature → decrypt failure; wallet account change → locked until
  re-authenticated; insecure context → refuses to run.
- Tests: `vice-terminal/src/lib/execution/agentVault.test.js`.

### 3.3 Command journal (execution audit + restart recovery)

- Module: `vice-terminal/src/lib/execution/commandJournal.ts`
- Backend: `localStorage`. Key: `vice.execution.journal.v1:<network>:<account>`.
- Data model: `ExecutionJournalEntry[]` — `{ commandId, network, account,
  sequence, kind (place|scale|modify|cancel|twap|scheduleCancel), cloids,
  targetOrderId?, targetPrice?, targetField?, targetTwapId?, status
  (pending|accepted|rejected|uncertain|reconciled), venueOrderIds, error?,
  updatedAt }`. Ring buffer capped at 100 entries.
- Lifecycle: `beginExecutionCommand` before dispatch; `finishExecutionCommand`
  on ack; `unresolvedExecutionCommands` + `assertNoUnresolvedExecutionCommands`
  **block trading** while any command is pending/uncertain (fail-closed);
  `clearExecutionJournal` on account teardown; `exportExecutionAudit` produces
  schema-1 `vice.execution-audit` export.
- Durability/privacy: device-local; export deliberately excludes encrypted
  agent material, signatures, request bodies, and unbounded venue error text;
  account identity + command IDs retained for user-side reconciliation.
- Failure modes: corrupt JSON → `[]`; missing storage → no-op.
- Tests: `vice-terminal/src/lib/execution/commandJournal.test.js`,
  `commandJournalExport.test.js`.

### 3.4 Execution sequence (deterministic cloid source)

- Module: `vice-terminal/src/lib/execution/commandIdentity.ts`
- Backend: `localStorage`. Key: `vice.execution.sequence.v1:<network>:<account>`.
- Data model: integer (next sequence).
- Lifecycle: `nextPersistedSequence`/`reservePersistedSequence` (Web Locks +
  in-process queue for cross-tab atomicity); `deterministicCloid(sequence,
  slot)` derives the 16-byte Hyperliquid client order id (stable across
  transport retries).
- Durability/privacy: device-local counter; no account/order content.
- Failure modes: storage unavailable → `reservePersistedSequence` throws
  `Persistent execution sequence storage is unavailable` (callers fail
  closed); sequence exhaustion → explicit throw; corrupt value → falls back to
  in-memory `current + 1`.
- Tests: `vice-terminal/src/lib/execution/commandIdentity.test.js`.

### 3.5 Basket journal

- Module: `vice-terminal/src/lib/execution/basket.ts`
- Backend: `localStorage`. Key: `vice.basket.journal.v1` (single shared key).
- Data model: `BasketLegJournalEntry[]` — `{ basketId, legIndex, commandId,
  venue, accountKey, instrumentKey, status (pending|dispatched|reconciled|
  uncertain|failed), cloids, venueOrderIds, updatedAt }`. Cap 100 entries.
- Lifecycle: `journal.begin` before any leg dispatch; `journal.update` after
  each leg outcome; injectable `BasketJournalLike` (defaults to the
  device-local journal).
- Durability/privacy: device-local; per-leg recovery state for multi-leg
  baskets.
- Failure modes: corrupt JSON → `[]`; missing storage → no-op.
- Tests: `vice-terminal/src/lib/execution/basket.test.js`.

### 3.6 Local algo jobs (browser-local automation)

- Module: `vice-terminal/src/lib/execution/algoJobs.ts`
- Backend: `localStorage`. Key:
  `vice.local-algo-jobs.v1:<network>:<owner|locked>` (account-scoped; `locked`
  when no owner is set).
- Data model: discriminated `LocalAlgoJob[]` — chase, oco, trailing,
  break_even, conditional_ladder, scale, iceberg, swarm, ping_pong,
  adaptive_twap, vwap, pov. Fields include strategy state, `deadmanMs`,
  `dispatchRecoveryVersion`, `pendingChildCommandId`, `childOrderIds`, status,
  timestamps.
- Lifecycle: `upsertLocalAlgoJob`/`persistLocalAlgoJobs` on every state change;
  `loadLocalAlgoJobs(type)` filtered by strategy; `clearLocalAlgoJobs` on
  teardown; `pauseRestartUnsafeLocalAlgoJobs` pauses strategies that lack
  complete child-command recovery evidence after a restart (fail-closed; only
  Scale, conditional ladders, Chase, and versioned child-order jobs auto-recover
  via the journal).
- Durability/privacy: device-local only; explicit persistence-class disclosure
  on the order ticket (`src/lib/components/orderPersistenceDisclosure.*`):
  "It does not run on Vice servers; reopening this device reconciles before
  resuming."
- Failure modes: corrupt JSON → `[]`; jobs without recovery evidence are
  paused, never auto-resumed.
- Tests: `vice-terminal/src/lib/execution/algoJobs.test.js`.

### 3.7 Automation trigger telemetry

- Module: `vice-terminal/src/lib/execution/automationTelemetry.ts`
- Backend: `localStorage`. Key: `vice.automation-trigger-telemetry.v1`.
- Data model: `{ schemaVersion:1, runtime:'browser',
  persistenceClass:'deviceLocal', updatedAt, counts: source × outcome }` for
  sources priceCross/candleClose/candleVolume/time/syntheticPair and outcomes
  fired/paused/missed; per-cell cap 1,000,000.
- Durability/privacy: explicitly records **no** account, market, price,
  strategy, or order data.
- Failure modes: corrupt JSON → empty telemetry; write failure never blocks a
  safety decision.
- Tests: `vice-terminal/src/lib/execution/automationTelemetry.test.js`.

### 3.8 Blofin credential vault

- Module: `vice-terminal/src/lib/blofin/vault.ts`
- Backend: `localStorage`. Keys:
  `vice.blofin.credentials.v1:<environment>:<keyFingerprint>` (ciphertext
  record) and `vice.blofin.credentials.index.v1:<environment>` (sorted
  one-way fingerprints only).
- Data model: `StoredRecord { version:1, environment, keyFingerprint,
  ciphertext, iv, salt }`; index holds fingerprints, never secrets.
- Crypto: AES-GCM-256; PBKDF2-SHA256, 210,000 iterations, from the user unlock
  phrase.
- Lifecycle: `saveBlofinCredentials` (writes ciphertext then index; if the
  index write fails it removes the ciphertext so no unreachable key is left),
  `unlockBlofinCredentials` (decrypt + fingerprint identity check),
  `removeBlofinCredentials`.
- Durability/privacy: device-local, encrypted; secrets never enter Vice
  infrastructure.
- Failure modes: wrong unlock phrase → decrypt failure; missing/mismatched
  record → "BloFin credentials are not available on this device"; corrupt
  record → treated as absent.
- Tests: `vice-terminal/src/lib/blofin/vault.test.js`.

---

## 4. Market-data caches (non-secret, optimization only)

Both caches are public-data optimizations. Storage failure must never affect
live-feed startup or execution readiness.

### 4.1 Market catalog cache

- Module: `vice-terminal/src/lib/hl/markets.ts`; warm-boot read also in
  `vice-terminal/src/lib/hermes-sidecar/state.ts`.
- Backend: `localStorage`. Key: `vice.hl.market-catalog.v1`.
- Data model: `{ network, savedAt, markets: MarketDescriptor[] }` (≤ 10,000
  markets) with strict per-market validation.
- Lifecycle: read for warm boot (cache-only by design); authoritative refresh
  via the Info API on cold boot and explicit `/api/refresh`; stale in-flight
  refreshes guarded by a generation counter.
- Durability/privacy: public market descriptors only; no account state.
- Failure modes: corrupt/invalid → `[]` (refetch); write failure → ignored.
- Tests: `vice-terminal/src/lib/hl/markets.test.js` (asserts the cache key is
  present in source).

### 4.2 Candle history cache

- Module: `vice-terminal/src/lib/hl/candleCache.ts`
- Backend: `localStorage`. Key: `vice.hl.candle-history.v1`.
- Data model: `{ version:1, entries: [{ network, apiCoin, interval, savedAt,
  candles }] }` — max 8 entries, max 1,500 candles each, 24 h TTL, strict
  candle shape + monotonic-time validation on both read and write.
- Lifecycle: load on chart open; save after fetch; TTL/validation eviction.
- Failure modes: corrupt/invalid → `[]` (refetch); write failure → ignored.
- Tests: `vice-terminal/src/lib/hl/candleCache.test.js`.

---

## 5. UI and preference persistence (browser-local, non-sensitive)

All entries are `localStorage`-backed, best-effort ("local preference only"),
and must never affect trading or live feeds on failure.

| Class | Module | Storage key(s) | Data model / constraints | Tests |
| --- | --- | --- | --- | --- |
| Workspace layouts | `src/lib/workspaceLayout.ts` | `vice.workspace-layouts.v1` | schema 2; name→`{schema, updatedAt, layout}`; names `[a-z][a-z0-9_-]{0,31}`; v2 invalidates layouts that could restore floating/popout groups as primary grid | `workspaceLayout.test.js` |
| Workspace preset + panels | `src/lib/workspacePreset.ts` | `vice.workspace-preset.v1`, `vice.workspace-panels.v1` | preset ∈ {default, chart, data}; panels map of booleans | `workspacePreset.test.js` |
| Workspace link groups | `src/lib/workspaceLinks.ts` | `vice.workspace-links.v1` | cyan/amber/violet groups; **public** marketKey/timeframe/updatedAt only; no account or execution state | `workspaceLinks.test.js` |
| Native notes | `src/lib/nativeNotes.ts` | `vice.native-notes.v1` (legacy import `viceHub.v1`) | ≤50 notes, ≤50,000 chars text, ≤120-char title; one-shot legacy scratchpad migration when no native record exists | `nativeNotes.test.js` |
| Price alerts | `src/lib/priceAlerts.ts` | `vice.price-alerts.v1:<network>` | ≤64 alerts; validated shape; fire only on live observation (never on cached price) | `priceAlerts.test.js` |
| Sound preferences | `src/lib/soundNotifications.ts` | `vice.sound-preferences.v1:<network>` | boolean (default muted); audio requires user gesture | `soundNotifications.test.js` |
| Hotkeys | `src/lib/hotkeys.ts` | `vice.hotkeys.v1` | full binding map; uniqueness enforced; fallback to defaults on conflict | `hotkeys.test.js` |
| Privacy mode | `src/lib/privacyMode.ts` | `vice.privacy-mode.v1:<network>` | boolean | `privacyMode.test.js` |
| Book grouping | `src/lib/bookGrouping.ts` | `vice.book-sig-figs.v1`, `vice.book-depth.v1` | sig figs ∈ {2,3,4,5}; depth ∈ {12,24,50} | `bookGrouping.test.js` |
| CLI preferences | `src/lib/cli/preferences.ts` | `vice.cli-preferences.v1:<network>` | aliases + variables; ≤32 entries, ≤256-char values, name regex | `cli/preferences.test.js` |
| Order presets + fat-finger limits | `src/lib/stores.ts` | `vice.order-presets.v1:<network>:<address>`, `vice.fat-finger-limits.v1:<network>:<address>` | account-scoped; ≤32 presets; fat-finger fixed-point limits per market | `orderPresets.test.js` |

---

## 6. Venue-native persistence (authoritative, not stored by Vice)

- Surface: accepted Hyperliquid orders — limit, market, stop, stop-limit,
  bracket, and native TWAP — live on the venue after acceptance and survive
  browser close. Disclosed on the order ticket before submission (venue-native
  set: `['limit','market','stop','stop_limit','bracket','twap']`; disclosure
  copy: "The venue manages this order after it is accepted. It can survive
  this browser closing.").
- Role: the venue is the authoritative record; Vice reads venue state via the
  Info client and reconciles the local journal against it
  (`reconcileCloids`, `reconciliationCompleteness`, dead-man `scheduleCancel`
  as the offline safety floor).
- No Vice-side copy is authoritative; device-local journals are recovery aids.
- Tests: `src/lib/components/orderPersistenceDisclosure.test.js` (static
  source assertions on the disclosure surface), plus the execution
  reconciliation suites in `src/lib/execution/`.

---

## 7. Legacy Hub persistence (preserved island)

- **Legacy Hub localStorage** — `vice/hub.js` (legacy island): `viceHub.v1`
  layouts plus watch-list/favorites/read-state keys (`LS_WATCH`, `FAVS_KEY`,
  `READ_KEY`). Local-first by design ("everything persists to localStorage").
  The terminal's native-notes and Hub-mirror code read `viceHub.v1` for
  migration/mirroring.
- **IndexedDB mirror** — `vice-terminal/static/legacy/hub-persistence.js`:
  DB `vice-suite` v1, object stores `migrations` + `hubLayouts`. Debounced
  (300 ms) best-effort mirror of `viceHub.v1` after every successful legacy
  save (including page-hide flush). Restore only when the localStorage record
  is absent (never overwrites a present/corrupt record). Keeps last validated
  raw as `previousRaw`; on corrupt-newest-record, rolls back to `previousRaw`
  and quarantines the corrupt raw (marked `quarantined` + reason/timestamp).
  Failure never delays Hub boot.
- Tests: `scripts/hub-persistence.test.mjs`.

---

## 8. Runner / pairing (explicitly non-persistent contracts)

- Module: `vice-terminal/src/lib/runner/runner.ts` + `runner/pairing.ts`
- Backend: none. `pairing.ts` validates **format and fail-closed rules only**
  ("Nothing here ever persists, transmits, or derives credential material");
  actual E2E encryption is browser Web Crypto at runtime.
- Data model (in-memory / envelope contract): `PairingRecord { deviceId,
  keyFingerprint, pairedAtMs, lastSeenMs, epoch, revoked }`;
  `EncryptedEnvelope { schema:1, kind:'vice.pairing-envelope', version:1,
  deviceId, ciphertext, iv, keyFingerprint, createdAtMs, expiresAtMs }`.
  Envelopes reject plaintext secret keys (accountKey/secret/mnemonic/
  privateKey/strategy/balances).
- Lifecycle: `canDispatchJob` gates on kill switch, consent, focus, fresh
  pairing, feed freshness, command expiry; uncertain outcomes pause rather
  than replay; runner telemetry is counts only.
- Note: the user-controlled runner is a **decision engine**, not a shipped
  orchestrator — it never signs, holds credentials, or opens its own
  transport, and dispatches only through the injected certified action
  boundary. No job state is persisted by the runner itself.
- Tests: `vice-terminal/src/lib/runner/runner.test.js` (kill switch, consent,
  pairing, stale feed, expiry, uncertain pause, telemetry, no-transport
  surface, envelope format).

---

## 9. Test matrix (coverage by class)

| Persistence class | Test file(s) |
| --- | --- |
| Vault shim | `hermes-sidecar/vault.test.js` |
| Agent vault | `execution/agentVault.test.js` |
| Command journal | `execution/commandJournal.test.js`, `execution/commandJournalExport.test.js` |
| Execution sequence | `execution/commandIdentity.test.js` |
| Basket journal | `execution/basket.test.js` |
| Local algo jobs | `execution/algoJobs.test.js` |
| Automation trigger telemetry | `execution/automationTelemetry.test.js` |
| Blofin vault | `blofin/vault.test.js` |
| Market catalog cache | `hl/markets.test.js` |
| Candle cache | `hl/candleCache.test.js` |
| UI preferences (each class) | `workspaceLayout`, `workspacePreset`, `workspaceLinks`, `nativeNotes`, `priceAlerts`, `soundNotifications`, `hotkeys`, `privacyMode`, `bookGrouping`, `cli/preferences`, `orderPresets` (`.test.js`) |
| Venue-native disclosure | `components/orderPersistenceDisclosure.test.js` |
| Legacy Hub IndexedDB | `scripts/hub-persistence.test.mjs` |
| Runner / pairing | `runner/runner.test.js` |
| Hosted-executor fail-closed | `scripts/smoke.mjs` (410/501 assertions) |

---

## 10. Notes for architects making scope decisions

1. **Durability tiering is explicit and disclosed**: venue-native (highest) >
   device-local journals/algos (survive browser restart on same device,
   reconcile before resume) > UI preferences (best-effort, disposable).
2. **All execution safety state is device-local and fail-closed**: the command
   journal blocks trading on unresolved outcomes; algo jobs pause unless
   recovery evidence exists; sequence reservation fails closed without
   storage.
3. **No server-side credential or execution state exists today**; the only
   server surfaces (SvelteKit routes, hermes-sidecar, Rust gateway) return
   410/501 or health facts. Any hosted persistent executor is out of scope
   until the PLAN_3 external gates pass (§2).
4. **The Rust gateway (`vice-backend`) persists nothing**; it is a health-only
   stub with execution `disabled_pending_signed_intents` and custody
   `no_shared_hyperliquid_key`.
5. **Encrypted secrets are uniformly AES-GCM-256 + PBKDF2-SHA256 (210k
   iterations)** across the agent vault and the Blofin vault; fingerprints,
   never secrets, index the Blofin store.
6. **Caches are explicitly optimization-only** and never allowed to affect
   live-feed startup or execution readiness.
