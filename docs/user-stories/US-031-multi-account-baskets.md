# US-031: Multi-account and basket execution

Story schema v2.

As a portfolio trader, I want stable multi-account basket previews, so that every leg is reconciled independently.

## Acceptance criteria

- US-031-AC-001: Given multiple account identities, when a basket is submitted, then each leg reports accepted, rejected, or uncertain and partial acceptance is never shown as complete.

## Operational contract

- Persona: A trader coordinating approved accounts across a basket.
- Preconditions: Stable account references, live venue snapshots, and a policy entitlement for every leg.
- Success behavior: Preview, submit, status, recovery, and cleanup preserve leg identity.
- Failure behavior: Any uncertain or rejected leg blocks a complete-success state and opens reconciliation.
- Reconnect behavior: Every leg converges from authoritative account snapshots before the basket resumes.
- Restart behavior: Durable journal state is restored before new legs dispatch.
- Stale/offline behavior: Stale legs are blocked while safe cancellation and reconciliation remain available.
- Custody expectations: Each account retains its own local signing boundary.
- Latency expectations: Per-leg dispatch and venue acknowledgement are recorded separately.
- Telemetry: Record redacted basket and leg outcome categories only.
- Linked tests: `vice-terminal/src/lib/execution/basket.test.js`, `vice-terminal/src/lib/venue/aggregation.test.js`.
- Funded-mainnet evidence: Blocked until two clean funded mainnet basket recovery passes exist.
- Action IDs: `basket.submit`, `position.flatten`.
