# US-017: Explicit multi-account and basket execution

Story schema v1.

As a multi-venue trader, I want to inspect accounts together and execute explicit per-account or basket actions so that I can manage fragmented exposure without losing venue-level truth.

## Acceptance criteria

- Account aggregation preserves venue, environment, account reference, instrument identity, source timestamp, and health for every row.
- Basket actions preview all legs, require explicit account selection, journal deterministic child commands, stop on uncertainty, and reconcile every venue before reporting completion.
- A degraded venue never falsely marks another venue stale or accepts a cross-venue inference.
- Given a basket with one partial or uncertain leg, when reconciliation cannot prove final state, then remaining legs pause and the UI reports partial completion.

## Operational contract

- Persona: Trader operating several CEX and DEX accounts.
- Preconditions: Every account and venue adapter is certified for the requested action.
- Success behavior: Aggregation is read-only by default; execution remains explicit, scoped, journaled, and reconcilable.
- Failure behavior: Missing credentials, stale accounts, unsupported venues, or partial results fail closed per leg.
- Reconnect behavior: Per-venue epochs reconnect independently and reconcile authoritative private snapshots.
- Restart behavior: Pending basket journals restore only after exact-account reconciliation.
- Stale/offline behavior: New actions block per stale account; known cancellation/reconciliation remain available where safe.
- Custody expectations: Credentials stay encrypted locally or in the user-controlled runner only.
- Latency expectations: Aggregation is off the active execution hot path; basket preparation never delays manual single-order signing.
- Telemetry: Record anonymous per-venue health and outcome classes without account or order values.
- Linked tests: Venue contract, account identity, basket partial-leg, restart, reconciliation, and funded E2E suites.
- Funded-testnet evidence: Per-venue and multi-leg place, partial-fill, cancel, reconnect, restart, revoked-key, and uncertainty proof.
