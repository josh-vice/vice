# US-019: Competitive release truth

Story schema v1.

As an operator, I want a dated feature-by-feature Insilico comparison tied to user stories and evidence so that Vice never claims parity from intention or a narrow test.

## Acceptance criteria

- The benchmark records every current public Insilico capability, source URL, verification date, Vice target, owning story, proof tier, status, and next gate.
- A capability is `meets` only when the same user task has equal-or-better correctness, coverage, action count, and latency evidence; `exceeds` also requires a measured Vice advantage.
- Any changed official capability creates a review item; unavailable or unverified Vice behavior stays labeled and excluded from parity claims.
- Given a release candidate with one behind or unverified benchmark row, when promotion is requested, then the parity claim and final cutover remain blocked.

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
- Funded-testnet evidence: Any execution comparison row references the owning action's funded evidence.
