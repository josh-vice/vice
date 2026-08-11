# Gate 3 recovery — four basic-order phases certified (limit-maker, stop, stop-limit, modify)

Date: 2026-08-11
Task: `t_f0fc937c` (recovery replacement for the failed th0r predecessor)
Scope: Root-cause repair 1/4 — the four basic order phases against a live
Hyperliquid **testnet** account, browser-local signing, core BTC, low notional.

## Result

**4/4 phases PASS**, **0 uncertain**, **0 duplicates**, **clean end state**
(zero open orders, zero positions after cleanup). Evidence manifest:
`docs/evidence/gate3-basic-four-phase-2026-08-11.json` (machine-validated by
`scripts/validate-gate3-four-phase-evidence.mjs`, wired into the release gate).

## The four failure classes and their fixes

The prior (th0r) certification failed every phase. Root causes and the repair:

| Phase | Old failure | Root cause | Repair (this run + run 44) |
| --- | --- | --- | --- |
| limit-maker | `reconcile-by-limitPx` mismatch | venue canonicalizes integer BTC prices (`"57003.0"`) while the local format is `"57003"`; raw string equality mis-read an applied order as rejected | `venuePriceEqual` normalized decimal compare in the shared `modifyReconcile.ts` primitive; place reconciliation by deterministic cloid identity |
| stop | `waitFor` timeout, trigger "resting" never observed | generic `openOrders` info-type does not carry authoritative trigger shape; the harness polled the wrong projection | read triggers through the authoritative `frontendOpenOrders` projection (production `allDexOpenOrders` already uses it); reconcile by `isTrigger` + `triggerPx` |
| stop-limit | same `waitFor` timeout | same generic-vs-frontend projection gap | same fix; proven as `orderType: "Stop Limit"` |
| modify | venue non-accepted/uncertain ack | Hyperliquid `modify` REPLACES the order with a new oid and returns `{type:"default"}` with no statuses; transport ack alone cannot prove the price change | `modifyOrder` now carries a deterministic cloid, records it in the command journal, and reconciles the authoritative post-state by cloid (new oid recorded); persisted-restart reconciliation does the same via the journal cloid |

## Production repair (committed in this workstream)

- `vice-terminal/src/lib/execution/modifyReconcile.ts` — new shared primitive:
  `reconcileModifyPostState` (applied / rejected / uncertain classes) +
  `venuePriceEqual` (canonical price comparison). Applied by both the live
  `modifyOrder` path and the persisted-restart journal reconciliation.
- `vice-terminal/src/lib/execution/localExecution.ts` — modify now reconciles
  authoritative post-state by cloid, records the replacement (NEW) oid, never
  optimistically acks on a bare transport response, and preserves trigger
  identity into the journal (`targetField: 'triggerPx' | 'limitPx'`).

## Deterministic regression coverage (reproduces the old failures)

- `vice-terminal/src/lib/execution/modifyReconcile.test.js` — applied/rejected/
  uncertain classification, the old `"57003.0"`-vs-`"57003"` mismatch, new-oid
  recording, stale-oid rejection, lost-ack uncertainty.
- `vice-terminal/src/lib/execution/modifyPostStateSurface.test.js` — source
  contract: deterministic cloid, post-state reconcile, no optimistic ack,
  authoritative frontend read path, shared primitive.
- `scripts/gate3-four-phase-evidence.test.mjs` — evidence schema boundary.
- Existing `chartInteraction.test.js` updated to assert the new trigger-identity
  journal contract.

## Live testnet evidence (verbatim from the manifest)

| Phase | oid | venue-returned price | expected | proof |
| --- | --- | --- | --- | --- |
| limit-maker | 57729477519 | `"57003.0"` | `57003` | cloid-identity + normalized limitPx |
| stop | 57729479788 | triggerPx `"60804.0"`, `isTrigger: true` | `60804` | authoritative frontend, `orderType: "Stop Market"` |
| stop-limit | 57729482591 | triggerPx `"60170.0"`, `isTrigger: true` | `60170` | authoritative frontend, `orderType: "Stop Limit"` |
| modify | 57729477519 → **57729484848** | `"58270.0"` | `58270` | post-state by modify cloid; old order gone, new oid recorded |

The modify row is the exact canonicalization case that failed before: the venue
returned `"58270.0"` for a local target `"58270"`, and the order id changed from
`57729477519` to a NEW id `57729484848`. Both are handled: normalized compare +
reconcile-by-cloid records the new id.

## Cleanup proof

`cancel-all` ran twice (idempotent); final authoritative read shows
`finalOpenOrders: 0` and `finalPositions: 0`.

## Scope notes

- Testnet only (`api.hyperliquid-testnet.xyz`), owner address
  `0x60e5f5ec558a1e7E5399765f58a0a245bab0142e`, core BTC, notional ≈ $63 per
  leg (0.001 BTC). Browser-local signing via the device-local testnet key.
- No secrets in the manifest: only public addresses, order ids, cloids, prices,
  and state summaries. Keys remain inside the device boundary.

## Files

- Harness: `scripts/capture-gate3-basic-four-phase.mjs`
- Evidence: `docs/evidence/gate3-basic-four-phase-2026-08-11.json`
- Validator: `scripts/gate3-four-phase-evidence.mjs`,
  `scripts/gate3-four-phase-evidence.test.mjs`,
  `scripts/validate-gate3-four-phase-evidence.mjs`
- Production repair: `vice-terminal/src/lib/execution/modifyReconcile.ts`,
  `vice-terminal/src/lib/execution/localExecution.ts`
