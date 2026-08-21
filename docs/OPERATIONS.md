# Vice Terminal operations runbook

This runbook is the release and incident source of truth for the non-custodial Hyperliquid terminal. It describes the controls that exist in this repository; it does not replace venue documentation or funded-testnet evidence.

## Custody boundary

- The browser is the only place that generates, unlocks, encrypts, and uses a Hyperliquid agent key.
- The connected wallet remains the account authority. The server never receives a user private key and hosted mutation routes are intentionally unavailable.
- The encrypted agent is device-local and account/network scoped. A wallet switch or account mismatch must invalidate the active execution scope.
- Testnet is the default. Never enable mainnet by changing only the network variable.

Before enabling trading, verify the session endpoint reports `tradingMode=local-encrypted-agent`, `serverSigning=false`, and `custody=browser-only-encrypted-agent`.

## Local release gate

From the repository root:

```bash
bun install
cd vice-terminal && bun install && cd ..
bun run test:release
```

For runtime verification, the one-command procedure is:

```bash
VICE_BACKEND_PORT=18081 VICE_FRONTEND_PORT=15174 bash scripts/dev-verify.sh
# or: VICE_BACKEND_PORT=18081 VICE_FRONTEND_PORT=15174 bun run dev:verify
```

That single command (a) fails BEFORE launch if either requested port is already
occupied, printing the owning PID and command so you can decide whether to free
it or override `VICE_BACKEND_PORT` / `VICE_FRONTEND_PORT`; (b) launches the
stack in an owned process group with a unique per-run identity (`serviceId` on
`/health`, run token on `/api/run-token`) and only accepts readiness when both
respond with THIS run's identity — a pre-existing or unrelated service can
never satisfy it; (c) runs smoke, browser-surface, and live-feed checks; and
(d) on success OR failure terminates only its own process group, then asserts
both ports have no listeners before printing `One-command runtime verification
passed.` The final port-free assertion is part of the run, not a manual step.

If you need an interactive session instead, run the pieces manually:

```bash
VICE_BACKEND_PORT=18081 VICE_FRONTEND_PORT=15173 VICE_SERVICE_ID=vice-release bun run dev
VICE_BACKEND_URL=http://127.0.0.1:18081 VICE_FRONTEND_URL=http://127.0.0.1:15173 bun run smoke
VICE_FRONTEND_URL=http://127.0.0.1:15173 bun run test:browser
```

The dev launcher still cleans up both services on `Ctrl+C`; confirm the chosen
ports are free afterward (`lsof -nP -iTCP:PORT -sTCP:LISTEN`). The manual path
skips the identity handshake and cleanup assertions that `dev:verify` enforces,
so prefer the one-command procedure whenever you want release-grade evidence.

The gateway defaults to loopback. A non-loopback `VICE_GATEWAY_BIND` fails closed unless `VICE_ALLOW_PUBLIC_GATEWAY=true` and `VICE_GATEWAY_ORIGIN=https://...` are explicitly supplied for a controlled TLS-terminated deployment; the gateway itself never becomes a public signing or user-data service.

`bun run test:release` is the one-command static release gate. Useful focused gates are `bun run test:stories`, `bun run test:contract`, `bun run test:catalog`, `bun run test:chaos`, `bun run test:revenue`, `bun run test:security`, `bun run test:mobile`, `bun run test:load`, and `bun run test:latency:boundary`. Use `bun run dev:verify` for the same bounded runtime path used by CI.

## CI and immutable release evidence

The repository ships three GitHub Actions workflows under `.github/workflows/`:

- **`ci.yml`** — clean-checkout gate on `pull_request` and pushes to `viceterminal`/`main`. Pins Bun 1.3.9 + the Rust toolchain, installs with `bun install --frozen-lockfile`, caches Bun/Cargo strictly on lockfile keys (never mutable build output across SHAs), runs custody preflight, the dependency audit + lockfile-in-sync gate, source typecheck, Svelte check, the frontend suite, Rust `cargo test`, the production build, and the PWA artifact boundary scan, and delegates runtime startup/readiness/smoke/browser/cleanup to the same `bun run dev:verify` path used locally. Least privilege (`contents: read`): it never signs, trades, publishes, or deploys. Validate locally with `bun run test:workflow-boundary` (which also invokes `actionlint` when installed).
- **`release.yml`** — produces an **immutable release artifact + manifest**, or verifies a prior manifest. It never deploys by default. The manifest (`scripts/release-manifest.mjs`) binds the commit SHA, lockfile hash, build time, test summary, and the built artifact's checksum/size; `--release` mode **fails on a dirty or untracked working tree** and enforces the exact-SHA guard, while ordinary local development (no `--release`) stays lenient and records `cleanTree:false`. Artifacts upload with bounded retention (30 days).
- **`staging-smoke.yml`** — read-only runtime smoke gated on an explicit `staging` environment approval. Publish/deploy is deliberately absent/disabled; a human must deploy the artifact manually (see `docs/VERCEL_DEPLOYMENT.md`).

The direct public-feed check is also available independently as `bun run test:live-feed`; it requires first frames from Hyperliquid `allMids`, BTC book, and trades and does not use application fixtures. The application chart separately loads authoritative candle history and aggregates those live trades into the active candle, so a candle WebSocket frame is not treated as a readiness requirement while the venue is waiting for an interval boundary. Override `VICE_LIVE_CRITICAL_FEED_TIMEOUT_MS` only for diagnostics.

Measured latency evidence is a separate gate and is never synthesized by the static suite. The browser export includes receipt-to-store, feed-to-frame-ready, action-to-signed-dispatch, local-processing samples, and privacy-safe runtime-health aggregates (long tasks, long animation frames, Event Timing delay, inferred dropped frames, queue depth, reconnect count, and optional Chromium heap). The release gate requires receipt/store p99 <5ms, feed/frame-ready p99 below one 60Hz frame (16.667ms), signed dispatch p99 <10ms, and local processing p99 <2ms. Frame-ready is the next animation-frame callback, not compositor-confirmed presentation:

```bash
VICE_LATENCY_EVIDENCE=/path/to/client-latency.json bun run test:latency
```

The file must be versioned client telemetry with `schemaVersion: 1`, `source: "client-telemetry"`, `network`, `capturedAt`, and `samples`. The command fails closed if the file is missing, malformed, has no valid samples, or violates any p99 budget.

## Revenue, builder, and referral controls

Revenue is optional and fail-closed. A builder address alone does nothing. To enable it, configure:

```bash
VITE_HL_ENABLE_BUILDER_REVENUE=true
VITE_HL_BUILDER_ADDRESS=0x...
```

The user must explicitly approve the builder fee in the wallet flow. The configured fee is capped by the implementation at 0.1 basis point (`0.001%`). Builder metadata is attached only while the authoritative referral/fee snapshot is live; stale or degraded revenue state disables attribution without disabling user trading. Native Hyperliquid-managed TWAP is intentionally untagged because its current venue action does not accept builder metadata.

Referral assignment is not silent or automatic. An explicit user action may query the account's authoritative referral state and offer the configured referral code only when Hyperliquid reports that the account is unassigned. The flow must show the code and any venue terms, require confirmation, verify the resulting state, and never block trading. An account that already has a referral is left unchanged; the app cannot make every account a referral without the user's informed consent or override Hyperliquid's venue rules.

Do not describe local estimates as earned revenue. The UI may show live referral, fee, and reward values only when the authoritative Info API queries succeed; otherwise it must show degraded/unknown.

## Beta support, diagnostics intake, and incident ownership

The Report Issue flow (navbar lifebuoy) is the beta triage entry point. It
exports a **local, privacy-safe support bundle** the tester attaches to a
ticket. The bundle is built entirely in the browser and never leaves the device
except by an explicit user download; there is no background telemetry or
server intake.

### Support-bundle contract (schema v1)

- Deterministic schema/kind: `{ "schema": 1, "kind": "vice.support-bundle" }`.
- Captures only non-secret build/environment identity, feed/account health
  transitions, request-failure categories, sanitized app errors, command
  IDs/status/reconciliation, and feature-flag state.
- The bundle **never contains**: wallet/agent addresses, private keys,
  signatures, raw signed payloads, auth tokens, or full order payloads. Any
  key/signature/address/JWT-shaped value is redacted at the serialization
  boundary by `src/lib/diagnostics/redact.ts`.
- Bounded retention and size: collectors cap their entries and the serializer
  trims lowest-value fields to fit the byte budget
  (`MAX_BUNDLE_BYTES` in `src/lib/diagnostics/schema.ts`).
- Sanitization is covered by adversarial tests in
  `src/lib/diagnostics/redact.test.js`.

### Intake workflow (owner placeholders — assign before beta)

| Role | Placeholder | Duty |
|---|---|---|
| Beta support owner | `<OWNER: beta-support>` | Triages tickets, routes to the right engineer, tracks SLA |
| Diagnostics owner | `<OWNER: diagnostics>` | Owns schema/redaction changes, release evidence of the boundary |
| Incident commander | `<OWNER: incident-cmdr>` | Leads any execution incident, owns kill-switch + rollback |
| Kill-switch operator | `<OWNER: kill-switch>` | Executes `VITE_HL_TRADING_KILL_SWITCH=true` under IC direction |

Intake flow for each ticket:

1. Confirm the attach is a valid v1 bundle (`schema: 1`,
   `kind: "vice.support-bundle"`). Reject bundles that are not v1.
2. Verify the bundle contains no address/key/signature-shaped values before
   it is shared beyond the owner. If it does, redact and file a boundary
   regression against the diagnostics owner.
3. Record severity, network, build version/SHA, first-seen timestamp, and the
   command/feed context from the bundle.
4. Route to the owning engineer with the bundle path and a one-line repro.
5. After resolution, add a `feedback-loop` entry and (for severity 1–2) a
   post-incident note to `docs/OPERATIONS.md`.

### Severity definitions

- **Severity 1 (critical):** potential or actual loss of funds, unauthorized
  signing/transmission, key/signature exfiltration, or a custody-boundary
  breach. Requires immediate kill-switch evaluation and IC invocation.
- **Severity 2 (high):** trading is materially unsafe or unavailable — stale
  account/feed treated as live, uncertain outcomes unresolved, reconciliation
  failure, or a diagnostic boundary leak exposing secret-shaped data.
- **Severity 3 (medium):** a functional defect that blocks a documented
  workflow but does not risk custody or correctness (e.g. a panel fails to
  hydrate, a command returns the wrong status).
- **Severity 4 (low):** cosmetic, copy, or minor UX issues with a clear
  workaround.

A severity 1–2 diagnosis or any diagnostic-boundary leak pauses the beta
until reviewed; the reviewer must be someone other than the reporter.

## Kill switch and incident response

To halt new local signing/transmission while preserving cancellation and reconciliation access:

```bash
VITE_HL_TRADING_KILL_SWITCH=true
```

Restart the frontend after changing this build-time variable. The UI must show `TRADING HALTED`. The kill switch blocks place, modify, TWAP, and Scale transmissions; it does not hide open orders, reconciliation, or cancellation controls.

For a suspected execution incident:

1. Enable the kill switch and stop promotion/canary traffic.
2. Keep the affected browser open if possible; do not clear its local storage before journal inspection.
3. Reconcile open orders, fills, positions, balances, TWAP history, and dead-man status against Hyperliquid. Treat every pending or uncertain journal entry as unresolved until an authoritative response proves its outcome.
4. If risk is increasing, cancel known orders through the browser wallet flow and confirm venue acknowledgement. Do not replay an uncertain place or modify command.
5. If the browser is unavailable, use Hyperliquid's own account controls or wallet tooling to reduce risk. Vice cannot recover a user key or sign on the user's behalf.
6. Record the command ID, venue order/TWAP ID when available, network, market key, error category, timestamps, and reconciliation result. Never record private keys, signatures, or raw wallet secrets.
7. Revoke or rotate the local agent from the connected wallet if compromise is suspected, then create a fresh agent after the incident review.

Promotion remains blocked while any uncertain execution, stale account state, stale market identity, failed reconciliation, or unexplained child-order disappearance remains.

## Rollout ladder

1. **Local/testnet:** run `bun run check`, runtime smoke, browser surface checks, and all focused suites. Confirm no fixture account state is visible with `VITE_ENABLE_DEMO_FIXTURES=false`.
2. **Funded testnet:** execute the user stories in `docs/user-stories/US-002-non-custodial-execution.md`, `US-003-chart-trading.md`, and `US-004-advanced-orders.md` with a funded testnet wallet. Capture venue IDs, latency samples, reconnects, duplicate events, partial fills, rejected modifications, restart recovery, and dead-man outcomes.
3. **Strategy certification:** enable only the specific `VITE_HL_CERTIFIED_*` flag for a strategy after its funded-testnet lifecycle and recovery evidence passes. An explicit per-type `false` always wins over the global flag.
4. **Low-notional canary:** use a controlled allowlist and low notional on the target network. Keep the kill switch ready and require zero unresolved outcomes during the observation window.
5. **Mainnet promotion:** require `VITE_HL_NETWORK=mainnet`, `VITE_HL_MAINNET_ACK=I_ACCEPT_REAL_MAINNET_TRADING`, a valid builder configuration if revenue is enabled, completed custody/revenue review, and signed evidence for every exposed strategy. Mainnet is not approved by a green build alone.

Mainnet preflight also requires `VICE_FUNDED_TESTNET_EVIDENCE=/path/to/funded-evidence.json`, `VICE_LATENCY_EVIDENCE=/path/to/client-latency.json`, and a non-empty `VICE_MAINNET_ALLOWLIST`. The funded evidence manifest must prove at least two funded-testnet passes for US-002/003/004, reconnect and restart behavior, venue order IDs, zero duplicates, zero uncertain outcomes, and an allowlisted low-notional pilot. Latency evidence must be client-telemetry captured on testnet and pass every production SLO. Missing, malformed, wrong-network, or failing evidence blocks promotion. A builder address is required on mainnet only when `VITE_HL_ENABLE_BUILDER_REVENUE=true`.

Rollback means enabling the kill switch, stopping new sessions, preserving journals and telemetry, reconciling authoritative state, and reverting the deployment only after venue risk is controlled.

## Performance and reliability targets

The release target is receipt-to-store p99 < 5 ms, action-to-signed-dispatch p99 < 10 ms, local processing p99 < 2 ms, and feed/chart frame-ready within one animation frame on the reference desktop. Client-observed venue acknowledgement is p50 <= 250 ms and p99 <= 1,000 ms during normal venue health. Measure these from client-local telemetry without logging wallet addresses or order contents. Empty or invalid latency evidence fails closed; a green result without observed samples is not certification. A faster path is not acceptable if it bypasses exact market identity, deterministic cloids/nonces, bounded retries, authoritative reconciliation, or the custody boundary.

## Required evidence before declaring operational

- All production checks pass from a clean checkout.
- Runtime launcher, smoke, SSR/CSP surface, and shutdown checks pass.
- Funded-testnet stories pass for every exposed order type.
- No pending or uncertain journal entry remains.
- Catalog is complete/live, or the product is visibly degraded and promotion is blocked.
- Builder/referral behavior is explicitly approved, accurately disclosed, and verified against authoritative venue state.
- Incident owner, rollback command, and kill-switch operator are identified for the deployment.
