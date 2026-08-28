# US-034: Remote halt and reduce-risk recovery

Story schema v2.

As an incident operator, I want a remote halt to reach open clients quickly, so that recovery remains possible without allowing new risk.

## Acceptance criteria

- US-034-AC-001: Given a halted release policy, when an open client receives the next policy update, then local risk-increasing timers stop while cancellation and reconciliation remain enabled.

## Operational contract

- Persona: An incident operator protecting a live beta release.
- Preconditions: A durable release policy, active client monitor, and authoritative venue reads.
- Success behavior: Halt propagation pauses child dispatch and exposes reduce-risk recovery controls.
- Failure behavior: Missing or stale policy is treated as halted rather than silently enabling execution.
- Reconnect behavior: A new epoch revalidates policy before any child resumes.
- Restart behavior: Uncertain journals require explicit reconciliation.
- Stale/offline behavior: Last-known policy never re-enables risk-increasing execution.
- Custody expectations: Halt does not require hosted signing authority.
- Latency expectations: Open clients observe a remote halt within ten seconds.
- Telemetry: Record policy epoch, halt transition, and recovery outcome without wallet data.
- Linked tests: `vice-terminal/src/lib/execution/releaseSafety.test.js`, `vice-terminal/src/lib/execution/algoCancellation.test.js`.
- Funded-mainnet evidence: Blocked until the halt and recovery drill is rehearsed on mainnet.
- Action IDs: `algo.pause`, `algo.reconcile`, `position.flatten`.
