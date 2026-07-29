# US-014: Complete widget quality

Story schema v1.

As a dashboard user, I want every available widget to be truthful, configurable, fast, accessible, and durable so that the Suite remains useful as I customize it.

## Acceptance criteria

- The widget catalog contains every current manifest and fails CI when a manifest lacks a matching acceptance record.
- Each widget proves source/units/provenance; loading, empty, stale, error, recovery, resize, settings migration, keyboard use, privacy, cleanup, and visual behavior.
- Widgets consume typed public context and shared data services; no widget creates a signing path or silently routes by display symbol.
- Given a user who removes, hides, restores, imports, or resizes a widget, when the layout updates, then data resources are cleaned up and the saved configuration remains valid.

## Operational contract

- Persona: Daily dashboard user with custom layouts across desktop and mobile.
- Preconditions: The widget's declared data dependency and source policy are available.
- Success behavior: Visible widgets render a fresh, sourced result within their declared budget and persist only approved local settings.
- Failure behavior: A widget shows a consistent empty, degraded, stale, or error state without affecting unrelated widgets.
- Reconnect behavior: Widgets resubscribe through the shared coordinator and never replay stale data as live.
- Restart behavior: Versioned settings restore or migrate; corrupt records recover safely with export/import guidance.
- Stale/offline behavior: Stale data receives textual health plus visual treatment and cannot trigger trading.
- Custody expectations: Widgets never persist, transmit, or render secret material.
- Latency expectations: Hidden/off-screen widgets pause; visible updates stay within the per-panel render budget and cannot monopolize a frame.
- Telemetry: Record anonymous widget lifecycle and health aggregates without settings values, markets, or account data.
- Linked tests: Widget-catalog validator, component, visual, accessibility, resize, cleanup, migration, and memory-soak suites.
- Funded-testnet evidence: None unless a widget initiates a certified execution handoff; then it reuses that action's evidence.

## Current evidence

- `vWatch` and `vAlerts` are native Svelte ports at `/hub/native/watchlist`. The route reuses the terminal's existing virtualized `MarketWatchlist`, canonical public registry, selected-market store, local-only favorites/collapse preferences, and local alert UI. It starts the existing browser-local alert monitor against the shared registry; it creates no second feed, account, signer, order, or execution path. The legacy Hub remains available as rollback.
- The explicit port manifest maps both widget identities to US-014 and declares their public provenance. Coverage: `suite/widgets.test.js`, `components/nativeWatchlistPortSurface.test.js`, existing watchlist and price-alert tests, widget catalog/migration tests, source typecheck, Svelte check, and production build.
- This is local component/build evidence. Per-widget visual, accessibility, resize, cleanup, migration, memory-soak, browser, and funded handoff evidence remains open for all 58 widgets.
