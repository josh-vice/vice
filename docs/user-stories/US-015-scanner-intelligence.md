# US-015: Scanner intelligence to action

Story schema v2.

As a research-driven trader, I want Scanner, Focus, alerts, news, and positioning data to explain their source and hand off an exact trade context so that I can act without guessing.

## Acceptance criteria

- Scanner, Focus, wallet inspection, alert, news, and positioning views disclose source, cadence, scope, and freshness.
- Symbol-scoped Scanner views use explicit routes/actions and never infer scope from stale state.
- Every action routes through US-013 exact public context and never submits an order from analytics.
- US-015-AC-001: Given a trader viewing an unavailable source, when they attempt a handoff, then the UI retains research context but blocks execution until an exact live destination is available.

- Action IDs: story.us-015

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
- Funded-mainnet evidence: Certified downstream execution uses the relevant trade-story evidence.

## Current evidence

- A Scanner scope that exactly equals the shell's canonical public `apiCoin` shows a Trade action. The action delegates to the same public-only US-013 handoff builder as Hub and carries the validated key, venue, product kind, and bounded timeframe.
- Scanner scopes for any other symbol, aliases such as `kPEPE`, missing context, metadata-only products, or unsupported timeframes have no Trade action. Scanner never receives a signer, account, credential, order, or execution API.
- Coverage: `scripts/hub-route.test.mjs`, widget-catalog validation, source typecheck, Svelte check, and production build. This is static/build proof, not a browser action or funded execution result.
