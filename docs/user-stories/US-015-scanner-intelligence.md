# US-015: Scanner intelligence to action

Story schema v1.

As a research-driven trader, I want Scanner, Focus, alerts, news, and positioning data to explain their source and hand off an exact trade context so that I can act without guessing.

## Acceptance criteria

- Scanner, Focus, wallet inspection, alert, news, and positioning views disclose source, cadence, scope, and freshness.
- Symbol-scoped Scanner views use explicit routes/actions and never infer scope from stale state.
- Every action routes through US-013 exact public context and never submits an order from analytics.
- Given a trader viewing an unavailable source, when they attempt a handoff, then the UI retains research context but blocks execution until an exact live destination is available.

## Operational contract

- Persona: Trader validating a setup from wallet flow, positioning, news, and market structure.
- Preconditions: Public providers respond within declared source policy.
- Success behavior: Research is source-labeled, filterable, shareable, and trade-ready through explicit context.
- Failure behavior: Provider degradation is isolated, labeled, and never replaced with fabricated data.
- Reconnect behavior: Feeds resume from the shared coordinator with generation-safe updates.
- Restart behavior: Saved public filters and watchlists restore; private account state does not.
- Stale/offline behavior: Stale research stays readable but loses actionability.
- Custody expectations: Scanner remains public/read-only until an explicit Trade handoff.
- Latency expectations: Scanner polling or aggregation cannot contend with active trade rendering.
- Telemetry: Record anonymous feature use and source health only.
- Linked tests: Source-provenance, route, scope, stale, handoff, visual, and load-isolation suites.
- Funded-testnet evidence: Certified downstream execution uses the relevant trade-story evidence.
