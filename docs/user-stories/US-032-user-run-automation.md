# US-032: User-run automation boundary

Story schema v2.

As an operator, I want authenticated loopback pairing for automation, so that headless jobs remain under my custody.

## Acceptance criteria

- US-032-AC-001: Given a paired user-run agent, when an action exceeds its consent or cap, then dispatch is rejected locally and journaled without venue mutation.

## Operational contract

- Persona: An operator running a local automation agent.
- Preconditions: Authenticated loopback pairing, encrypted local storage, explicit action consent, and approved caps.
- Success behavior: User-run jobs dispatch through the same policy, journal, pause, reconcile, and revoke boundary.
- Failure behavior: Pairing, health, policy, or reconciliation failures fail closed.
- Reconnect behavior: The agent pauses until health and authoritative state converge.
- Restart behavior: Journal recovery requires explicit reconciliation before resuming.
- Stale/offline behavior: Stale policy or feeds pause risk-increasing children.
- Custody expectations: Vice never hosts or stores user signing keys.
- Latency expectations: Local processing and dispatch timings are measured with redacted metadata.
- Telemetry: Record job state and outcome categories without payloads or credentials.
- Linked tests: `vice-terminal/src/lib/runner/runnerBoundary.test.js`, `vice-terminal/src/lib/execution/childDispatchRecovery.test.js`.
- Funded-mainnet evidence: Blocked until two funded mainnet user-run lifecycle passes exist.
- Action IDs: `algo.start`, `algo.pause`, `algo.reconcile`, `algo.revoke`.
