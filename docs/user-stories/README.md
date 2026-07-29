# Vice Terminal user-story acceptance catalog

Every production capability starts with a versioned user story. A story is complete only when its acceptance criteria have automated coverage and the relevant release gates pass. Unsupported or unverified behavior must remain unavailable in production.

Each story uses schema v1 operational-contract fields for persona, preconditions, success/failure, reconnect, restart, stale/offline behavior, custody, latency, telemetry, linked tests, and funded-testnet evidence. `bun run test:stories` validates the catalog and is part of `bun run test:release`.

| ID | Story | Automated coverage | Status |
| --- | --- | --- | --- |
| US-001 | Production state is never confused with fixtures or unsupported functionality | `vice-terminal/src/lib/productionTruth.test.js` | Implemented |
| US-002 | Non-custodial local execution with exact market identity | `vice-terminal/src/lib/execution/venueFormat.test.js`, `venueErrors.test.js`, `commandIdentity.test.js`, `commandJournal.test.js` plus testnet E2E | Local identity and restart-safe command journal hardened; funded testnet E2E pending |
| US-003 | Insilico-style authenticated chart trading | `vice-terminal/src/lib/chart/*.test.js` plus browser/testnet E2E | Hydrated live-data browser replay verified; funded testnet execution E2E pending |
| US-004 | Reliable advanced order lifecycle | `vice-terminal/src/lib/execution/scaleMath.test.js`, `ocoState.test.js`, `adaptiveMath.test.js`, `adaptiveOrderSurface.test.js`, `povMath.test.js`, `povSurface.test.js`, `breakEvenSurface.test.js`, `makerRoutingSurface.test.js`, `conditionalLadderSurface.test.js`, `algoJobs.test.js`, `vice-terminal/src/lib/hl/twaps.test.js`, plus testnet E2E | Native TWAP/Scale plus adaptive TWAP/VWAP/POV/break-even/maker/conditional-ladder routing and hidden persisted state machines implemented; bracket and advanced certification pending |
| US-005 | Observable, gated releases | custody preflight, telemetry tests, CI build and Rust tests | Implemented; canary evidence pending |
| US-006 | Multi-venue trading expansion (Lighter, Nado, Blofin, Binance) | BloFin catalog, credential-vault, credential-setup, private-read, public-book contract suites, and read-only socket smoke | Live-read verified for the BloFin public demo snapshot; private and funded lifecycle proof pending |
| US-007 | Every Hyperliquid market class as a first-class surface (HIP-3, RWA, prediction) | catalog classification tests | In progress; outcome execution terms and RWA classification remain unavailable |
| US-008 | Market-data richness: stats, liquidations, alerts, book grouping | alert, tape, grouping, and stat-timing tests | In progress |
| US-009 | DOM ladder click-trading | ladder guard/identity/frame tests (partial) | In progress |
| US-010 | One-action position and risk ergonomics | position close and reverse identity tests | In progress; funded position-lifecycle proof remains open |
| US-011 | Persistent conditional automation without custody compromise | trigger, persistence-disclosure, conditional-ladder, local-telemetry tests, and partial browser smoke | In progress; user-run orchestrator, lifecycle browser proof, and funded proof remain open |
| US-012 | Dockable workspace, power input, and the dither design language | privacy-mode, hotkey-binding, CLI-chain/preference, workspace-layout, and workspace-host tests | In progress; Dockview workspace, local layouts, and an initial configurable-hotkey slice are implemented; browser evidence and remaining certified actions are open |
| US-013 | Unified Suite context | planned context-schema, shell-navigation, privacy-boundary, and handoff suites | Planned |
| US-014 | Complete widget quality | planned widget-catalog, lifecycle, visual, accessibility, migration, and soak suites | Planned |
| US-015 | Scanner intelligence to action | planned source, scope, stale, handoff, visual, and load-isolation suites | Planned |
| US-016 | Durable customization | planned IndexedDB migration, corruption, import/export, and rollback suites | Planned |
| US-017 | Explicit multi-account and basket execution | planned venue, account, basket, restart, reconciliation, and funded suites | Planned |
| US-018 | Installable local integrations | planned pairing, envelope, replay, offline, bridge, runner, and browser suites | Planned |
| US-019 | Competitive release truth | planned matrix-schema, source-date, release-gate, and documentation suites | Planned |

Competitive context for US-006 through US-012 lives in [`docs/INSILICO_GAP_ANALYSIS.md`](../INSILICO_GAP_ANALYSIS.md).
