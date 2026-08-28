# Vice Terminal competitive gap analysis

Date: 2026-08-27. Benchmark: Insilico Terminal 5.x documentation and changelog, official Hyperliquid documentation, and source-inspected open terminals listed in `docs/competitive/terminal-matrix.json`.

## Release truth

Vice separates `implemented`, `interactionCertified`, `fundedMainnetCertified`, and `mainnetEnabled`. The repository contains implementation and contract evidence, but no capability is promoted to mainnet by source presence or unit tests alone. The normalized matrix is the authoritative comparison surface.

## Current strengths

- Browser-local, non-custodial execution boundary with exact venue/instrument identity.
- Deterministic command IDs, journaled dispatch, bounded retries, and reconciliation-first uncertainty handling.
- Hyperliquid core perp, HIP-3, spot, and outcome metadata represented as distinct market classes.
- Shared catalogued public feeds with freshness and stale-state predicates.
- Local workspace, hotkeys, CLI, chart, DOM, position, and automation implementations guarded by certification state.

## Current gaps blocking beta

- Funded mainnet lifecycle evidence is absent from this checkout; all capability statuses remain disabled in the matrix.
- Live venue adapters beyond Hyperliquid are contract-defined but not certified for private state or mutation.
- Exhaustive interaction inventory now exists, while browser certification still must exercise every route, registry action, loading/error/stale/offline/reconnect state, and legacy Hub iframe control.
- Multi-account/basket recovery and the user-run automation pairing boundary still require live evidence and operator rehearsal.
- Mainnet stream, latency, soak, deployment identity, rollback, support, and remote-halt evidence require external credentials and an observation window.

## Regressions protected by the benchmark

Side-correct Scale skew; CLOSE/reduce coupling; stable mobile row identity during resort; protected algorithm overlays cannot be dragged; Chase cancels before replacement; residual sizing uses actual fills; hedge-mode close cannot open opposite exposure.

## Sources and evidence policy

Every external source, access timestamp, source kind, and evidence level is recorded in `docs/competitive/terminal-matrix.json`. Closed-source Insilico claims remain `documented`; repository behavior is `vice-repo-evidenced` only when an inspected local implementation or test proves it. No row may become green without direct current evidence and a mapped Vice action/story.
