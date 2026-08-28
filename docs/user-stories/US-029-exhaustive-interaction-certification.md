# US-029: Exhaustive interaction certification

Story schema v2.

As a beta release operator, I want every exposed interaction and system transition mapped to executable evidence so invitations cannot bypass an incomplete capability.

## Acceptance criteria

- US-029-AC-001: Given the production route and action catalog, when the catalog validator runs, then every discovered control has one stable action ID and one story record.
- US-029-AC-002: Given a mutating action, when certification is evaluated, then hydrated UI, contract, funded-mainnet, reconnect, restart, cleanup, and release-policy proof are all present.
- US-029-AC-003: Given a stale, offline, rejected, halted, or uncertain transition, when the user acts, then the surface remains fail-closed and exposes recovery state without claiming completion.
- US-029-AC-004: Given an authenticated beta tester, when logout or revocation occurs, then server session state and cached client authority are cleared before access is restored.

- Action IDs: auth.logout, release.readiness, action.catalog

## Operational contract

- Persona: Beta release operator and invited tester.
- Preconditions: Exact deployed artifact, current action catalog, and evidence manifest exist.
- Success behavior: Every action, criterion, feed, and release gate is green for the same artifact identity.
- Failure behavior: Missing, stale, placeholder, invalidated, or mismatched evidence blocks invitations.
- Reconnect behavior: Feed and session epochs converge before dependent actions re-enable.
- Restart behavior: Journal and release identity are reconciled before mutation resumes.
- Stale/offline behavior: Presentation may retain last-good values only with visible age; execution remains blocked.
- Custody expectations: Browser and user-run custody boundaries remain explicit and server routes cannot sign.
- Latency expectations: Required latency dimensions use real samples and fail closed when undersampled.
- Telemetry: Counters and evidence redact addresses, keys, signatures, tokens, codes, and raw order payloads.
- Linked tests: scripts/action-catalog.test.mjs, scripts/mainnet-evidence.test.mjs, scripts/release-manifest.test.mjs.
- Funded-mainnet evidence: Blocked until dedicated mainnet accounts, approval digest, deployment, and operator window are available.
