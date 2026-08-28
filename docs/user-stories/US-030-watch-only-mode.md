# US-030: Watch-only mode

Story schema v2.

As a trader, I want a watch-only account mode, so that I can inspect live state without exposing signing authority.

## Acceptance criteria

- US-030-AC-001: Given a watch-only account, when a risk-increasing action is requested, then signing controls remain disabled and the reason is visible.

## Operational contract

- Persona: A trader inspecting a venue account without signing authority.
- Preconditions: A valid public account identity and live public/private read streams.
- Success behavior: Public and authorized read-only state remains visible while mutation paths are unavailable.
- Failure behavior: Missing identity or stale private state is explicit and never treated as authorization.
- Reconnect behavior: The account identity is revalidated before private state is shown.
- Restart behavior: Watch-only mode remains watch-only after restart.
- Stale/offline behavior: Stale values retain age labels and cannot authorize actions.
- Custody expectations: No signing module is loaded for watch-only sessions.
- Latency expectations: Read-only state uses the shared feed freshness thresholds.
- Telemetry: Record mode transitions without wallet addresses or secrets.
- Linked tests: `vice-terminal/src/lib/productionTruth.test.js`, `vice-terminal/src/lib/components/walletConnectionSurface.test.js`.
- Funded-mainnet evidence: Blocked until a dedicated mainnet watch-only lifecycle is captured.
- Action IDs: `wallet.connect`, `auth.logout`.
