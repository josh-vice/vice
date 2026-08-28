# US-014: Complete widget quality

Story schema v2.

As a dashboard user, I want every available widget to be truthful, configurable, fast, accessible, and durable so that the Suite remains useful as I customize it.

## Acceptance criteria

- The widget catalog contains every current manifest and fails CI when a manifest lacks a matching acceptance record.
- Each widget proves source/units/provenance; loading, empty, stale, error, recovery, resize, settings migration, keyboard use, privacy, cleanup, and visual behavior.
- Widgets consume typed public context and shared data services; no widget creates a signing path or silently routes by display symbol.
- US-014-AC-001: Given a user who removes, hides, restores, imports, or resizes a widget, when the layout updates, then data resources are cleaned up and the saved configuration remains valid.

- Action IDs: story.us-014

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
- Funded-mainnet evidence: None unless a widget initiates a certified execution handoff; then it reuses that action's evidence.

## Current evidence

- `vWatch` and `vAlerts` are native Svelte ports at `/hub/native/watchlist`. The route reuses the terminal's existing virtualized `MarketWatchlist`, canonical public registry, selected-market store, local-only favorites/collapse preferences, and local alert UI. It starts the existing browser-local alert monitor against the shared registry; it creates no second feed, account, signer, order, or execution path.
- `vNotes` is a native device-local port at `/hub/native/notes`. It imports all legacy Hub note instances once only when no native record exists, caps untrusted stored payloads, flushes debounced typing on teardown, and has no market, account, or execution dependency. The legacy Hub remains available as rollback for all three ports.
- `vClocks` is a native port at `/hub/native/session-clocks`. It matches the legacy widget's four exchange clocks, uses explicit IANA zones and regular-hours rules, cleans up its one-second timer, and truthfully labels holiday, halt, and venue-status data as unavailable. It has no data, account, or execution dependency.
- `vCountdown` is a native port at `/hub/native/candle-countdown`. It matches the legacy hourly, four-hour, daily, and Monday-UTC weekly countdowns, includes UTC and local clocks, and cleans up its one-second timer. It creates no candle feed, market, account, or execution dependency.
- `vPrice` is a native read-only port at `/hub/native/price`. It reuses the existing canonical selected market, timeframe, and public candle plane, retaining a richer candlestick/volume chart than the legacy area chart without opening a second data connection. Its explicit read-only mode hides chart trading controls, disables click/drag/right-click order operations, and suppresses private account overlays.
- `vMovers` is a native port at `/hub/native/movers`. It ranks the shared, canonical Hyperliquid registry by venue-provided 24-hour change and ties by volume/exact key. This replaces the legacy CoinGecko poller with tradable, exact descriptors, retains gainer/loser and row-limit controls, and creates no second feed or execution path.
- `vSuite` is a native navigation port at `/hub/native/suite`. It preserves every legacy community destination and adds direct links to Trade, Hub, Scanner, and Gallery. It has no data, account, signing, or execution dependency.
- The explicit port manifest maps all eight widget identities to US-014 and declares their provenance. Coverage: `suite/widgets.test.js`, native-port surface and read-only chart tests, mover ranking tests, existing watchlist and price-alert tests, widget catalog/migration tests, source typecheck, Svelte check, and production build.
- This is local component/build evidence. Per-widget visual, accessibility, resize, cleanup, migration, memory-soak, browser, and funded handoff evidence remains open for all 58 widgets.
