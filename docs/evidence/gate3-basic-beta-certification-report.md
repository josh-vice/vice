# Gate 3 — Funded Testnet Basic Beta Lifecycle Certification Report

**Date:** 2026-08-11
**Candidate tree:** `viceterminal` @ `d43af57a2a128167b6f0ef5d92762d1993b535b5` (working tree non-clean; 97 modified, 58 untracked at session start)
**App version:** `vice-terminal/package.json` → 1.0.0
**Production build:** `bun run build` — ✓ built in 6.59s (adapter-vercel)
**Wallet (testnet):** `0x60e5f5ec558a1e7E5399765f58a0a245bab0142e` — owner `~/.vice-testnet/owner.json`, taker `~/.vice-testnet/taker.json`
**Account value at report time:** 795.05 USDC; **clean end-state confirmed live** (0 open orders, 0 positions)

---

## VERDICT: **FAIL — basic beta lifecycle is BLOCKED**

Per the card's integrity rule — *a phase failure is recorded and the final status is FAIL unless ALL phases pass; a phase with any `ok:false`/`error`/`uncertain` nested outcome is a FAIL; phase `ok` is derived from the event log, never assumed* — the certification does not pass. **6 of 12 basic lifecycle phases failed.**

## 1. Basic lifecycle certification (sidecar transport boundary)

Source manifest: `docs/evidence/basic-lifecycle-certification-2026-08-11.json`
Harness: `scripts/capture-basic-lifecycle-certification.mjs` (drives the hermes-sidecar
`/api/execute`, `/api/cancel`, `/api/modify`, `/api/cancel-all`, `/api/flatten` boundary).

**Evidence-integrity check** (`scripts/validate-basic-lifecycle-evidence.mjs`, written this session):
- `summaryDerivedCorrectly: true` — recomputed 6 pass / 6 fail **exactly** matches the stored summary.
- `duplicateOrders: 0`, `uncertainOutcomes: 0`, `problems: []` — the manifest is internally consistent, **no hand-editing**.
- `INTEGRITY=FAIL` for the correct reason: real phase failures.

### Per-phase result (recomputed from event logs)

| Phase | Result | Root cause |
|---|---|---|
| connect-enable | PASS | fresh sidecar, unlock, sync live |
| market | PASS | IOC fill observed, long position appears |
| limit-maker | **FAIL** | resting-confirmed `ok:false` — venue reconcile-by-limitPx did not match within budget |
| stop | **FAIL** | `waitFor timeout: stop: trigger resting` — trigger never observed resting in venue openOrders |
| stop-limit | **FAIL** | `waitFor timeout: stop-limit: resting` — same |
| partial-fill | PASS | maker rested, taker crossed half, partial remaining proven |
| modify | **FAIL** | `{"ok":false,"ack":{...,"accepted":false,"uncertain"...}}` — venue non-accepted/uncertain ack, 4 retries exhausted |
| cancel | PASS | order cancelled, gone from openOrders |
| reduce-only-close | PASS | open long → reduce-only sell closed it |
| reconnect-restart | **FAIL** | `phase is not defined` — **harness code defect**, not a venue failure |
| revoke-reenable | **FAIL** | unlock timed out (900s budget) under hot shared-IP testnet limiter |
| cleanup | PASS | cancel-all + flatten → zero exposure (verified live) |

**Classification:** 4 of 6 failures (`stop`, `stop-limit`, `modify`, `revoke-reenable`) are
testnet-limiter / reconcile-timing pressure under the 60s-cooldown, fresh-vault-per-phase regime;
1 (`reconnect-restart`) is a harness defect; 1 (`limit-maker`) is a reconcile-by-price race. None
of the passing-event logs or the failures indicate a defect in the certified order path itself, but
**per the integrity rule the certification is FAIL regardless.**

## 2. Real-Chromium browser evidence

### Cold-load performance — `scripts/e2e/perf-evidence/browser-perf-evidence.json`
12 **true cold runs** (fresh incognito context, HTTP cache disabled) against the production build
served via `vite preview`, Hyperliquid testnet. Read-only; no signer/order path.

| Metric | p50 | p95 | mean |
|---|---|---|---|
| TTFB | 2.5 ms | 3.6 ms | 2.6 ms |
| FCP | 52.9 ms | 55.6 ms | 53.2 ms |
| LCP | 125.0 ms | 129.5 ms | 123.7 ms |
| JS transfer | 461 KiB | 461 KiB | 461 KiB (39 requests) |
| long tasks | 0 | 0 | 0 |
| candle paint | 52.9 ms | 55.6 ms | — |
| interaction-ready | 1499.6 ms | 1642.1 ms | — |

- **chartHydratedRate: 100%** (12/12 runs painted ≥1 candle).
- No long tasks; 461 KiB JS on 39 script requests; LCP ≈125 ms.

**Scope gap against the card:** the perf capture navigates the UI read-only. It does **not**
exercise the browser lifecycle the card requires (UI-driven orders, browser restart/reload,
verify displayed account through the real UI). **No real-browser lifecycle automation harness
exists** — the lifecycle evidence above is transport-level only.

## 3. Feed resilience / kill-switch
**Not evidenced.** No disconnect/stale/reconnect or kill-switch harness exists in the tree
(`search_files` for kill-switch/feed-disconnect/resilience returned nothing). No evidence was
produced for this card requirement.

## 4. Latency SLO
**Not evidenced (fails closed).** `scripts/latency-gate.mjs` requires `VICE_LATENCY_EVIDENCE`
pointing at real client telemetry (schemaVersion 2, `source: 'client-telemetry'`, runtimeHealth +
samples). No such capture harness or evidence file exists. The gate fails closed without it.

## 5. Deliverables produced this session
- `scripts/validate-basic-lifecycle-evidence.mjs` — evidence-integrity validator (recursively
  recomputes phase outcomes, flags `ok:false`/`error`/`uncertain` leaves, checks summary is derived,
  duplicate ids, pilot invariants). Exits nonzero unless ALL phases pass.
- `scripts/e2e/perf-evidence/browser-perf-evidence.json` — 12 cold Chromium runs (real).
- This report.

## Recommendation / blockers to clear before re-certification
1. **Real-browser lifecycle harness** must be built (UI-driven orders + browser restart/reload via
   Playwright) — the card's core requirement is currently unmet; transport evidence does not satisfy it.
2. **Longer limiter cooldowns / warm-up** for the flaky phases (stop, stop-limit, modify,
   revoke-reenable) OR fix the venue reconcile/timing paths they exposed.
3. **Fix the `reconnect-restart` harness defect** (`phase is not defined`).
4. **Feed-resilience harness** (disconnect/stale/reconnect kill-switch) and **client-latency
   telemetry capture** must be added.
