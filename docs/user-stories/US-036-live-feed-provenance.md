# US-036: Live feed provenance HUD

Story schema v2.

As a trader, I want every live chart, book, tape, and trigger source to show freshness, so that stale data cannot look authoritative.

## Acceptance criteria

- US-036-AC-001: Given a feed transition, when a frame becomes stale or reconnects, then the HUD exposes source, epoch, age, rate, and state without pausing measurement.

## Operational contract

- Persona: A trader relying on public and private live data.
- Preconditions: A catalogued provider, exact subscription identity, and feed health store.
- Success behavior: First-frame, freshness, stale, recovering, and live states are observable.
- Failure behavior: Invalid identity, late frame, crossed book, or stale source is rejected.
- Reconnect behavior: Backoff resets only after the first valid frame of the new epoch.
- Restart behavior: Bootstrap converges before dependent execution is enabled.
- Stale/offline behavior: Last-good values remain labeled and cannot satisfy execution gates.
- Custody expectations: Private feed credentials remain server-only or device-local.
- Latency expectations: Receipt-to-store and frame-ready timings are recorded separately.
- Telemetry: Feed IDs and timing metadata exclude account addresses and payloads.
- Linked tests: `vice-terminal/src/lib/hl/feedHealth.test.js`, `vice-terminal/src/lib/hl/subscriptionsIdentity.test.js`.
- Funded-mainnet evidence: Blocked until every required mainnet stream has sustained freshness evidence.
- Action IDs: `feed.refresh`, `feed.freshness`, `chart.surface`.
