# US-022: DOM ladder one-click trading

Story schema v1.

As an experienced Insilico terminal user, I want the depth ladder to trade with one click: click a price level to place a limit, Shift-click to place a stop, drag to reprice, and use the row controls to cancel, size quickly, flatten, or reverse — all with live row-aligned orders and positions.

## Acceptance criteria

- Given a live L2 book for the selected market, when I click an armed price row, then a limit order is placed at that exact price through the certified local-execution boundary.
- Given a live L2 book, when I Shift-click a price row, then a stop order is placed at that price with exact market identity.
- Given a resting row order, when I drag it to a new price, then the order reprices to the new level and the row reflects the change.
- Given a resting row order, when I use its cancel control, then the order cancels only after the refreshed open-order snapshot omits it.
- Given quick-size presets, when I select a size, then the ticket and ladder use the venue-precision size; presets never bypass fat-finger limits or exact identity.
- Given a selected market position, when I use flatten or reverse, then flatten closes exactly the selected market and reverse closes first and opens only after an exact flat account snapshot.
- Given manual/auto recenter, when the book moves, then the ladder recenters per the selected mode without dropping rows or resetting zoom.
- When ladder interactions are measured, then row-diff updates and drag frames stay within one 60Hz frame; book grouping and depth selections persist across reload.

## Operational contract

- Persona: Experienced Insilico terminal user trading directly from depth.
- Preconditions: Live L2 book; authenticated local agent for order actions; bounded displayed-depth imbalance available.
- Success behavior: Click-limit, Shift-click stop, drag-reprice, cancel, quick sizing, flatten/reverse, and recenter all work through the guarded DOM feed and shared local execution boundaries.
- Failure behavior: Missing/stale book, crossed snapshot, wrong market, or uncertified action fails closed before signing; a rejected/cancelled order is never reported from a partial acknowledgement.
- Reconnect behavior: Ladder rebuilds from a new snapshot after reconnect; late HTTP baselines cannot replace an accepted live frame.
- Restart behavior: Grouping, depth, and recenter selections restore from the local workspace store; row orders/positions redraw only from live state.
- Stale/offline behavior: Dither stale-veil marks stale book rows; controls disable until the feed is live again.
- Custody expectations: Ladder actions use the same device-local signer as every other surface; no hosted signing path exists.
- Latency expectations: click→signed dispatch p99 < 10ms; row-diff and drag frame updates within one 60Hz frame.
- Telemetry: Record ladder action class and interaction latency without prices, sizes, or account contents.
- Linked tests: `orderBookDomPlacement.test.js`, `ladder guard/identity/frame tests`, `bookAnalytics.test.js`, `bookGrouping.test.js`, `positionCloseIdentity.test.js`, `flattenAll.test.js`, `flattenSurface.test.js`, `ditherSurface.test.js`.
- Funded-testnet evidence: Funded DOM lifecycle (place, drag-reprice, cancel, flatten, reverse) remains open under US-009; advanced-order certification 2026-08-06 covers the shared signing path.

## Evidence log

- 2026-08-07: Browser interaction and measured frame-level row-diff evidence remain open (PLAN_3 "DOM ladder click trading" row).
