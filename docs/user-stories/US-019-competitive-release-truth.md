# US-019: Competitive release truth

Story schema v2.

As an operator, I want a dated feature-by-feature Insilico comparison tied to user stories and evidence so that Vice never claims parity from intention or a narrow test.

## Acceptance criteria

- US-019-AC-001: Given the current benchmark sources, when the matrix is indexed, then every capability has source metadata, Vice stories, action IDs, status, evidence level, and a next gate.
- US-019-AC-002: Given a capability status, when direct evidence is absent or stale, then it cannot be promoted to interactionCertified, fundedMainnetCertified, or mainnetEnabled.
- US-019-AC-003: Given a release candidate with one behind or unverified benchmark row, when promotion is requested, then the parity claim and final cutover remain blocked.

- Action IDs: story.us-019

## Operational contract

- Persona: Release owner responsible for truthful competitive claims.
- Preconditions: Current public benchmark sources and current Vice evidence are available.
- Success behavior: Release notes and product labels match the dated matrix exactly.
- Failure behavior: Unavailable sources or missing evidence mark the row blocked, never green.
- Reconnect behavior: Not applicable; benchmark retrieval is not an execution dependency.
- Restart behavior: The versioned matrix remains reviewable in the repository.
- Stale/offline behavior: An outdated source date prevents a current-parity claim.
- Custody expectations: Benchmarking introduces no account, credential, or execution access.
- Latency expectations: Benchmark checks run outside trader-facing hot paths.
- Telemetry: None required beyond CI outcome and matrix version.
- Linked tests: Matrix schema, source-date, status, release-gate, and documentation consistency tests.
- Funded-mainnet evidence: Any execution comparison row references the owning action's funded evidence.

## Current evidence

- `scripts/competitive-matrix.mjs` validates `docs/competitive/terminal-matrix.json` schema v2: every source has an exact HTTPS URL, source kind, evidence level, and access time within 30 days; every capability has normalized category, Vice story/action mappings, separate implementation/interaction/funded/mainnet states, and direct evidence IDs.
- The checked-in matrix is dated 2026-08-27 and every capability remains unpromoted because funded-mainnet and deployment evidence are external prerequisites. No parity claim is implied until the exact release manifest and observed evidence pass.
