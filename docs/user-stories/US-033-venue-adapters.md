# US-033: Venue adapter coverage

Story schema v2.

As a multi-venue trader, I want each supported adapter to expose one typed contract, so that identity and lifecycle behavior stay comparable.

## Acceptance criteria

- US-033-AC-001: Given a supported venue, when a public or private stream or mutation is unavailable, then the adapter reports a typed degraded or rejected outcome without inferring unsupported terms.

## Operational contract

- Persona: A trader selecting a supported venue and product.
- Preconditions: Source-verified venue identity, precision, signing, rate-limit, and reconnect semantics.
- Success behavior: Adapters expose normalized catalog, feeds, account snapshots, and mutation outcomes.
- Failure behavior: Missing production semantics leave the affected action disabled.
- Reconnect behavior: Subscriptions return a new epoch and converge from an authoritative snapshot.
- Restart behavior: Pending mutations reconcile by client identity before resuming.
- Stale/offline behavior: Stale feeds block risk-increasing actions.
- Custody expectations: CEX credentials remain local, encrypted, and trade-only.
- Latency expectations: Venue acknowledgement is measured independently from local processing.
- Telemetry: Record venue and action identifiers without credentials or raw payloads.
- Linked tests: `vice-terminal/src/lib/venue/identity.test.js`, `vice-terminal/src/lib/blofin/public.test.js`, `vice-terminal/src/lib/lighter/public.test.js`, `vice-terminal/src/lib/nado/public.test.js`.
- Funded-mainnet evidence: Blocked until each enabled venue has two clean funded lifecycle passes.
- Action IDs: `venue.select`, `order.submit`, `order.cancel`.
