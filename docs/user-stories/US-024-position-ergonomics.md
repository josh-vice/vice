# US-024: Position ergonomics in one action

Story schema v1.

As an experienced Insilico terminal user, I want one-action position management: reverse, selected-market flatten, per-position market/limit-at-quote/Scale/TWAP close, bid/ask/both cancel-all, and long/short/all flatten — all with exact account-local fixed-point fat-finger limits and authoritative reconciliation.

## Acceptance criteria

- Given a live position on the selected market, when I choose close, then the close intent uses the exact position identity and routes through the certified local-execution boundary; market close, limit-at-quote, Scale close, and TWAP close are available.
- Given a live position, when I choose reverse, then the system closes first and opens only after an exact flat account snapshot; it never nets or skips the close leg.
- Given multiple positions, when I flatten long, short, or all, then the plan targets exactly those markets and dispatches serially using live feed selection for each target.
- Given resting orders on a market, when I cancel by bid, ask, or both, then an order is reported cancelled only after the refreshed open-order snapshot omits it.
- Given an account-local fat-finger cap, when a close/reverse size exceeds it, then the action rejects before signing and explains the cap.
- Given a partial fill or reconnect during close/reverse, when the snapshot returns authoritative, then the remaining legs resume only from the reconciled state; nothing re-dispatches from stale state.
- When position actions are measured, then click→signed dispatch p99 < 10ms and frame updates stay within one 60Hz frame.

## Operational contract

- Persona: Experienced Insilico terminal user managing risk in one action.
- Preconditions: Live position snapshot; authenticated local agent; exact market identity.
- Success behavior: Close, reverse, flatten, and cancel-all behave with exact identity and authoritative reconciliation.
- Failure behavior: Missing/stale position, wrong market, partial identity, or cap violation fails closed before signing.
- Reconnect behavior: Close/reverse/flatten legs pause on uncertain outcomes and resume only from reconciled state after reconnect.
- Restart behavior: Persisted position plans adopt only complete journaled child IDs; incomplete work pauses for explicit exact-market resume.
- Stale/offline behavior: Position actions disable while the account snapshot is stale; overlays hide until `live`.
- Custody expectations: Position actions use the device-local signer; no hosted signing path exists.
- Latency expectations: action→signed dispatch p99 < 10ms; frame updates within one 60Hz frame.
- Telemetry: Record position action class and latency without prices, sizes, or account contents.
- Linked tests: `positionCloseIdentity.test.js`, `positionClose.test.js`, `positionReverse.test.js`, `flattenAll.test.js`, `flattenSurface.test.js`, `cancelAll.test.js`, `fatFinger.test.js`, `execution/scaleMath.test.js`, `execution/twaps.test.js`.
- Funded-testnet evidence: Funded position-lifecycle proof (multi-market close, partial-leg, reconnect) remains open under US-010.

## Evidence log

- 2026-08-07: Static position close/reverse/flatten/cancel-all tests green in `bun run check`; funded position-lifecycle proof remains open (PLAN_3 "Position management ergonomics" row).
