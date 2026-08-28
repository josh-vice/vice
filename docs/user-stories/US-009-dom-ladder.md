# US-009: DOM ladder click-trading

Story schema v2. Status: In progress.

As a scalper, I want a depth-of-market price ladder with click and drag trading, so that I can work orders against visible liquidity faster than any ticket, at parity with Insilico's DOM.

## Acceptance criteria

- A DOM panel renders a price-centered ladder from the live book: bid/ask sizes per level, cumulative depth, session volume-at-price, and my resting orders/position row-aligned at their prices.
- Left-click on the bid/ask columns places a limit at that price on the corresponding side; modifier-click places a stop; every placement honors the same armed/consent, identity, precision, and post-only guards as chart click trading (US-003).
- Dragging my order between rows re-prices it with the same modify/rollback semantics as chart dragging; click on my order cancels it immediately with authoritative follow-up.
- A ladder footer exposes flatten and reverse actions plus a quick size field with the shared sizing presets.
- The ladder recenters on last price manually or automatically, never during an active drag, and scrolling/zoom state survives data updates.
- Ladder updates are frame-coalesced; a full book update re-renders only changed rows within one frame at 60 Hz.
- US-009-AC-001: Given an armed DOM, when the trader left-clicks a bid level with a valid size, then exactly one local command is created at that exact price and the resting order appears on the ladder only from the authoritative order stream.
- The DOM is a candidate first surface for the native WASM renderer; adoption requires it to meet the same latency evidence as the DOM's web implementation before replacing it.

- Action IDs: story.us-009

## Operational contract

- Persona: Scalper working resting orders against the live book on one market.
- Preconditions: Live book feed, unlocked local agent, live account snapshot, explicit DOM arming, no unresolved journal entries.
- Success behavior: Ladder placements/modifies/cancels dispatch browser-locally with exact market identity; ladder rows reflect only authoritative order/position state.
- Failure behavior: Rejected placements/modifies surface the semantic venue reason at the affected row and revert optimistic hints; disarmed or stale state blocks placement with an explicit local error.
- Reconnect behavior: Ladder rebuilds from a fresh book snapshot and account reconciliation; my-order rows reappear only from authoritative open-order state.
- Restart behavior: No ladder placement state persists except journaled commands; recovery follows US-002 journal semantics.
- Stale/offline behavior: A non-live book disarms the ladder, shows the stale veil, and blocks placement while cancellation of known orders remains available.
- Custody expectations: All mutations sign browser-locally; the ladder introduces no new transmission paths.
- Latency expectations: Book-update-to-ladder-frame-ready within one frame; click-to-signed-dispatch p99 <10 ms; per-update allocations bounded.
- Telemetry: Record ladder mode, placement/modify/cancel latency, recenter events, and frame-budget violations without order contents.
- Linked tests: ladder placement/guard tests mirroring `chart/clickTrading` coverage, row-alignment identity tests, frame-coalescing scheduler tests, flatten/reverse boundary tests.
- Funded-mainnet evidence: Funded ladder place/modify/cancel/partial-fill/reconnect/restart lifecycle with venue order IDs before exposure; flatten/reverse require position-lifecycle evidence.

## Evidence log

- Armed placement, cancel, drag-modify, position-row, stop-gesture, and side-cancel slice: the live order-book rows now act as a first DOM entry surface. Unarmed clicks only fill the ticket price. With the existing explicit click-placement arm enabled, a bid/ask click checks live account, execution, market, size, exact selected-market identity, and post-only crossing before it calls the shared local limit-order path. Shift-click submits a same-side stop with the clicked trigger price; it blocks rather than silently dropping an incompatible post-only setting. Authoritative resting orders and positions on visible entry-price rows are matched by exact market identity. Resting orders display a pending-safe cancel control and can be dragged to another visible row through the shared exact-identity modify boundary. Side-cancel processes exact-identity orders serially, stops on the first uncertain or rejected cancellation, and reports partial completion rather than claiming a group is gone. An accepted cancellation is likewise not reported as complete when its authoritative open-order refresh is unavailable. If only the book or account snapshot is stale, known orders remain visible and cancellable while all new placement and modify paths stay blocked. Accepted mutations refresh authoritative open orders; rejected mutations retain the row with its venue reason. Automated coverage: `src/lib/components/orderBookDomPlacement.test.js`, `src/lib/chart/chartInteraction.test.js`, and `src/lib/execution/identityBoundary.test.js`.
- Quick-size footer slice: the ladder now exposes the shared base-size draft and 25/50/75/MAX presets. This changes no execution state and the next armed DOM placement reads the same `orderSize` as the ticket.
- Flatten footer slice: “Flatten market” uses the shared selected-market, exact-identity reduce-only close builder and refreshes positions/open orders after the acknowledgement. A failed refresh reports reconciliation as unavailable; it never claims the position is flat from the acknowledgement alone.
- Reverse footer slice: “Reverse market” requires a second confirmation, closes through the shared reverse plan, waits for a fresh exact-identity flat snapshot, then submits the opposite side. A rejected open leg leaves the account flat and says so; any uncertain close, identity, or refresh state blocks the open leg.
- Ladder-viewport slice: the ladder now centers on the last-price divider while auto-follow is active, offers an explicit Center control, and switches to manual mode on user scroll. It never recenters during an order drag. Price-keyed bid and ask rows preserve DOM identity across book updates, while the existing public-feed boundary coalesces commits to one animation frame. Automated coverage: `src/lib/components/orderBookDomPlacement.test.js`. In-app browser verification on 2026-07-28 loaded live public depth, observed the manual state, activated Center, observed the auto-follow state, and found no console errors. It did not place, cancel, drag, or modify an order.
- Scope limit: this is not the complete DOM ladder. Browser drag/cancel and stale/reconnect interaction, measured frame-level row-diff evidence, and funded lifecycle evidence remain open.
