# US-035: Beta access and session lifecycle

Story schema v2.

As a beta operator, I want durable invites and immediate revocation, so that access cannot outlive policy or tester status.

## Acceptance criteria

- US-035-AC-001: Given an active tester session, when the tester is revoked or the session version rotates, then the next protected request is rejected and the cached shell is cleared.

## Operational contract

- Persona: A beta operator issuing or revoking tester access.
- Preconditions: Durable Redis store, server-only HMAC secret, and configured beta support owner.
- Success behavior: Invite codes are single-display secrets and protected requests validate status and session version.
- Failure behavior: Missing production configuration fails closed with a generic response.
- Reconnect behavior: Protected requests re-check durable session state.
- Restart behavior: Durable tester status survives server restart.
- Stale/offline behavior: Unavailable session storage never grants access.
- Custody expectations: Codes, wallet allowlists, and secrets never enter client telemetry.
- Latency expectations: Login throttling and revocation respond within the endpoint budget.
- Telemetry: Counters contain only privacy-preserving hashes and outcome classes.
- Linked tests: `vice-terminal/src/lib/server/betaAuth.test.js`, `vice-terminal/src/lib/server/betaStore.test.js`.
- Funded-mainnet evidence: Blocked until preview access, revocation, and logout are exercised.
- Action IDs: `auth.logout`, `wallet.connect`.
