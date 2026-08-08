# US-021: Chart trading parity for the power user

Story schema v1.

As an experienced Insilico terminal user, I want the interactive chart to place, modify, and cancel orders the way Insilico's Designer/Interactive Chart does — drag to modify, armed right-click placement, click-to-fill — so that I can trade from price action without leaving the chart.

## Acceptance criteria

- Given a live selected market with an authenticated agent, when I right-click arm the chart and click a price level, then a limit order is placed at the exact clicked price with the selected market identity, and the ticket reflects it.
- Given a resting chart order, when I drag its handle to a new price, then the order modifies to that price and trigger semantics are preserved (a stop stays a stop, a limit stays a limit).
- Given a chart order line or position line, when I interact with it, then the overlay shows exact identity and price and the underlying order/position is the same canonical record shown in the account panel.
- Given a filled or partially filled entry, when position and liquidation lines are drawn, then they reflect authoritative account state and update only from live snapshots (never stale cached state).
- Given a public-only session, when the chart renders, then all order controls are hidden or disabled; chart trading is impossible without an authenticated agent.
- When chart interactions are measured, then label updates are rAF-coalesced, zoom never resets on data arrival, and feed→frame-ready p99 stays under one 60Hz frame.
- Given a reconnect during chart editing, when the account snapshot returns authoritative, then chart overlays reappear only after `live` status; they are never restored from stale private state.

## Operational contract

- Persona: Experienced Insilico terminal user trading from the chart.
- Preconditions: Live selected market; authenticated local agent for order actions; chart data live.
- Success behavior: Arm-place, drag-modify with trigger semantics, click-to-fill, and exact overlays all route through the certified local-execution boundary.
- Failure behavior: Missing/stale book, wrong market identity, or uncertified action fails closed with an explicit error before a venue payload is built.
- Reconnect behavior: Chart overlays wait for authoritative account state; public chart data continues during account reconnect.
- Restart behavior: Restored chart session reflects persisted market/timeframe; orders/positions are redrawn only from live snapshots.
- Stale/offline behavior: Dither stale-veil marks stale chart data; private overlays hide when account state is not `live`.
- Custody expectations: Chart actions use the same device-local signer as the ticket; no hosted signing path exists.
- Latency expectations: drag-to-modify dispatch p99 < 10ms; label and overlay updates within one frame of the underlying store change.
- Telemetry: Record chart action class and latency without prices, sizes, or account contents.
- Linked tests: `vice-terminal/src/lib/chart/*.test.js`, `chartReadOnlySurface.test.js`, `ditherSurface.test.js`, `bun run test:browser`, funded chart-execution E2E.
- Funded-testnet evidence: Chart order place/modify/cancel lifecycle on funded testnet (US-003 E2E pending; advanced-order certification 2026-08-06 covers the shared signing path).

## Evidence log

- 2026-08-07: Hydrated live-data browser replay verified previously (US-003); this story adds the experienced-user interaction framing and reuses the same linked coverage.
