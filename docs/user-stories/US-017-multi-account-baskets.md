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

## Current evidence

- `src/lib/venue/aggregation.ts` provides read-only account aggregation. Every row preserves venue, environment, account reference, instrument key, source timestamp, and exact health; rows order deterministically by venue, account, instrument, then source timestamp. Per-venue health updates apply with strict venue isolation: a degraded venue marks only its own rows stale and can never mark another venue stale. Payload attribution rejects cross-venue inference before any account receives a row.
- `src/lib/execution/basket.ts` plans baskets by previewing every leg against exact account and instrument identity plus certified venue capabilities. Uncertified venues and unsupported order types fail the preview before dispatch; legs order deterministically so identical baskets produce identical plans and child command ids; every deterministic child command is journaled before any leg dispatches. Execution stops on the first uncertain outcome, reconciles every involved venue before reporting completion, and reports `complete` only when every leg is reconciled, `partial` otherwise with explicit paused-leg reasons. The module creates no transport, signer, credential, or execution path of its own; dispatch and reconciliation are injected through the shared certified action boundary.
- Telemetry (`summarizeVenueHealth`) records anonymous per-venue health counts only, never account keys, markets, prices, sizes, or credential references.
- Coverage: `venue/aggregation.test.js` and `execution/basket.test.js` (19 tests) plus the full source typecheck, Svelte check, and production build. This is local component/build proof; funded per-leg place/partial-fill/cancel/reconnect/restart/revoked-key and uncertainty evidence remains open.
