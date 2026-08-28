# US-037: Immutable deployed-artifact promotion

Story schema v2.

As a release operator, I want deployment, policy, evidence, and runtime identity bound to one full SHA, so that readiness proves the artifact being served.

## Acceptance criteria

- US-037-AC-001: Given a release manifest and deployment, when readiness runs, then any SHA, artifact, policy, evidence, or deployment mismatch blocks promotion.

## Operational contract

- Persona: A release operator promoting a mainnet beta build.
- Preconditions: Clean checkout, full commit SHA, immutable artifact, signed approval, evidence, and deployment probe.
- Success behavior: Release and readiness reports identify the same artifact digest and commit.
- Failure behavior: Missing, stale, or mismatched provenance blocks invitations.
- Reconnect behavior: Client updates and rollback preserve the expected artifact identity.
- Restart behavior: Runtime metadata remains bound to the promoted SHA.
- Stale/offline behavior: Unavailable deployment or policy evidence is blocked.
- Custody expectations: Release workflows never sign or trade.
- Latency expectations: Deployment probes complete within the release smoke budget.
- Telemetry: Reports contain digests and outcome categories, not secrets.
- Linked tests: `scripts/release-manifest.test.mjs`, `scripts/release-approval.test.mjs`, `scripts/deployed-smoke.mjs`.
- Funded-mainnet evidence: Blocked until an exact mainnet artifact observation window and rollback drill pass.
- Action IDs: `release.verify`, `release.readiness`.
