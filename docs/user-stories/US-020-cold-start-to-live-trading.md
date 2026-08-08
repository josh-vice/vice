# US-020: Cold start to live trading in bounded time

Story schema v1.

As an experienced Insilico terminal user, I want a cold start that reaches live market data and a usable order ticket in bounded time so that I never wait on the terminal between deciding to trade and seeing a live market.

## Acceptance criteria

- Given a production build and no prior session state, when the terminal route loads, then the shell renders immediately (SSR shell visible, no blank screen) and market data reaches the DATA LIVE state without fixture seeding.
- Given a public Hyperliquid feed is reachable, when all-mids, L2 book, and trades subscriptions are requested for the selected market, then live values arrive and the panels render them; no panel shows a placeholder row as actionable data.
- Given a stale or failing feed during cold start, when data is not yet live, then the panel communicates loading/connecting/stale state and never presents cached or placeholder values as current.
- Given an experienced user expects the market watchlist, chart, depth and tape, ticket, and account surfaces, when the workspace renders, then the default layout contains those panels and the selected market identity is exact (`apiCoin`, never a display symbol).
- Given wallet disconnected, when the account surface renders, then ACCOUNT is OFF and equity/positions are hidden; the user can still watch public data.
- When every cold-start interaction is measured, then receipt→store p99 < 5ms, feed→frame-ready p99 < one 60Hz frame, and no long task or dropped frame occurs during the first interactive window.

## Operational contract

- Persona: Experienced Insilico terminal user opening Vice on a funded or watch-only session.
- Preconditions: Production build; no `VITE_ENABLE_DEMO_FIXTURES=true`; public feed reachable; no wallet required for public surfaces.
- Success behavior: Shell, live data, exact market selection, and ticket usable within the latency budgets; DATA LIVE reached from live feeds.
- Failure behavior: Feed/provider failure becomes loading, stale, degraded, error, or unavailable; placeholders are never actionable; the ticket stays disabled without a live market.
- Reconnect behavior: Reconnect public feeds through the serialized recovery path; keep the exact selected market; never replace a newer feed with an older reconnect.
- Restart behavior: Start with empty production account state; rebuild only from live Hyperliquid snapshots/subscriptions; restored layout and selections come from the local workspace store.
- Stale/offline behavior: Dither stale-veil language marks stale public panels; private overlays hide until the account snapshot is authoritative.
- Custody expectations: No hosted key or signing authority exists; watch-only cold start never transmits a mutation.
- Latency expectations: receipt→store p99 < 5ms; feed→frame-ready p99 < 16.667ms; action→signed dispatch p99 < 10ms; local processing p99 < 2ms.
- Telemetry: Record feed health, snapshot generation, stale transitions, and feed-to-store/next-frame-ready latency without account contents.
- Linked tests: `productionTruth.test.js`, `unsupportedSurface.test.js`, `mobileParity.test.js`, `workspaceRow9Surface.test.js`, `bun run test:browser`, `bun run dev:verify`, `bun run test:latency`.
- Funded-testnet evidence: Funded account-state and live-feed replay remains a release prerequisite for private overlays (US-002/003/004 evidence).

## Evidence log

- 2026-08-07: Full `bun run check` green after vendor cleanup (561 tests, 155 files); isolated runtime verification replayed below in US-027's evidence log.
