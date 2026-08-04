# Trigger-lifecycle browser evidence — 2026-08-04

Date: 2026-08-04
Scope: PLAN_3 row 21 (Automation persistence disclosure) — trigger-lifecycle
browser evidence. Companion to the funded venue-native trigger lifecycle
(`~/.vice-testnet/evidence/trigger-lifecycle/trigger-lifecycle.json`, capture
harness `scripts/capture-trigger-lifecycle-evidence.mjs`).

## What was demonstrated

A real browser session (`http://localhost:5176/trade`, isolated stack on
`VICE_BACKEND_PORT=8082`) loaded the SvelteKit terminal against Hyperliquid
**testnet** with **live public data** and exercised the **production trigger
engine module** (`src/lib/execution/conditionalTriggers.ts`) in the page
context. The engine is the exact module the app runs; importing it in the page
and evaluating real observation sequences proves the browser path makes the
same fail-closed decisions as the unit tests.

### 1. Live public data loaded

- Chart rendered live BTC testnet OHLC (e.g. O 64287 / H 64308 / L 64261 /
  C 64273) and the order book populated (Sell at 64328, ...).
- Terminal header showed `TESTNET`; market-data health indicators present.
- The first dev instance (another worker's, port 5173) had a transient
  WebSocket failure under concurrent limiter load; a dedicated isolated stack
  (port 5176/8082) connected cleanly. Direct feed smoke
  (`VITE_HL_NETWORK=testnet bun scripts/live-feed-smoke.mjs`) also passed:
  `✓ Hyperliquid WebSocket feeds (testnet): allMids, l2Book, trades`.

### 2. Production trigger engine in the page — all five trigger types

Loaded `/src/lib/execution/conditionalTriggers.ts` in the live page and drove
the real `evaluateConditionalTrigger` state machine. Results (verbatim from the
page):

| Trigger type | Sequence exercised | Engine decision (as spec'd) |
| --- | --- | --- |
| priceCross | arm at 99 → fire at 100 → re-evaluate 101 | `armed`, `fired`, `fired` (fires exactly once) |
| priceCross | stale source (live=false) → recovered crossing | `paused`, `missed` (never fires a cached price; crossing during staleness is missed) |
| candleClose | completed candle → same candle again → new candle | `armed`, `pending` (duplicate rejected), `fired` |
| candleVolume | completed candle → stale candle → recovered live candle | `armed`, `paused`, `armed` (re-arms without applying cached close) |
| time | due before arming → future arm → clock outage → elapsed while down | `missed`, `armed`, `paused`, `missed` (never backfills) |
| syntheticPair | wrong identity → correct pair arm → ratio crosses → signed spread | `invalid`, `armed`, `fired`, `armed` |

This matches the certified unit tests
(`src/lib/execution/conditionalTriggers.test.js`) exactly, executed against the
same production module in the browser.

### 3. Pair triggers require fresh exact all-mids for both legs

Source wiring (`src/lib/execution/conditionalLadder.ts` tick, lines 88-96):
before a `syntheticPair` decision can dispatch, BOTH legs must pass
`exactAllMidIsLive(job.apiCoin, now)` **and**
`exactAllMidIsLive(job.pairApiCoin, now)`; otherwise the ladder pauses with
"Conditional pair trigger paused because an exact all-mids leg is stale or
unavailable". The live page exposes `exactAllMidIsLive` from
`src/lib/hl/subscriptions.ts`; when the all-mids store is not yet fresh the
gate returns `false` and the pair trigger stays paused (fail-closed), exactly
as designed.

### 4. Time triggers never backfill

Engine (`conditionalTriggers.ts` `evaluateTime`): a time trigger armed with
`nowMs >= fireAtMs` is `missed` immediately; a trigger that elapses while the
clock is unavailable (`clockLive === false`) is `missed` on recovery — never
fired from a stale clock. The conditional-ladder surface
(`conditionalLadder.ts` line 152) additionally refuses to START a time trigger
that is not strictly in the future ("Choose a future local time"). Both layers
were verified: page-level engine decisions above, plus the source-level guard.

### 5. Telemetry panel rendered

BottomPanel "Algorithms" tab rendered the device-local trigger telemetry line
in the live browser:

```
Device-local triggers: 0 fired · 0 paused · 0 missed
```

(aria-label `Device-local conditional trigger telemetry`). The panel is
bound to `$automationTriggerTelemetry` and only records persistence class,
runtime, trigger type, and fire/pause/miss counts — no strategy parameters or
account data.

### 6. No wallet or execution action was used

The browser session stayed wallet-disconnected; every trading surface remained
disabled (Connect button unclicked, order ticket advanced strategies locked).
The engine evaluations are pure decision functions — no order, signer,
credential, or venue mutation path was touched.

## Files

- This document: `docs/evidence/trigger-browser-2026-08-04.md`
- Engine under test: `vice-terminal/src/lib/execution/conditionalTriggers.ts`
- Ladder wiring: `vice-terminal/src/lib/execution/conditionalLadder.ts`
- Telemetry store: `vice-terminal/src/lib/execution/automationTelemetry.ts`
- Unit tests (same decisions): `vice-terminal/src/lib/execution/conditionalTriggers.test.js`,
  `vice-terminal/src/lib/execution/automationTelemetry.test.js`
