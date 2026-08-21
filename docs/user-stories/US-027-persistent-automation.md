# US-027: Persistent automation with honest disclosure

Story schema v1.

As an experienced Insilico terminal user, I want device-local persistent automation (conditional ladders, TWAP, Scale, chase, trailing, OCO, ice, swarm, ping-pong, POV, VWAP, break-even, maker routing) to run across restarts with explicit disclosure that Vice servers do not run them — pause/resume/cancel/emergency and dead-man behavior included.

## Acceptance criteria

- Given a certified algorithm type, when I start a job, then it persists an exact command ID before signing, dispatches through the certified local-execution boundary, and the ticket labels it as device-local persisted automation.
- Given a trigger engine, when a price-cross, candle-close, candle-volume, time, or synthetic-pair condition is configured, then the job arms only with live exact sources and fires once per edge; stale or missing sources pause and miss rather than fire late.
- Given a restart, when a job was mid-flight, then it adopts exactly one proven journaled child, records rejection, and pauses unresolved placement rather than sending a replacement; incomplete OCO pairs require an explicit exact-market resume.
- Given an account-wide dead-man switch, when armed before the first child and refreshed before subsequent children, then a crash window never leaves children unprotected; emergency stop leaves a short venue-side safety window.
- Given user cancellation, when any known child cancel or dead-man clear is rejected or uncertain, then the job pauses for reconciliation and never reports terminal cancelled from a partial acknowledgement.
- Given browser-local telemetry, when a job runs, then only persistence class, runtime, trigger type, and fire/pause/miss counts are recorded — never strategy parameters or account data.
- Given a runner pair, when a user-run trade-only runner is active, then it fails closed on kill switch, missing consent/focus, revoked/expired pairing, stale feeds, expired commands, and non-running states; uncertain outcomes pause instead of replaying.

## Operational contract

- Persona: Experienced Insilico terminal user running persistent local automation.
- Preconditions: Per-type certification flag; unlocked local agent; live exact market/account/public-flow inputs; persisted job identity; dead-man policy where applicable.
- Success behavior: Every certified job persists exact pre-dispatch IDs, reconciles authoritatively, and survives restart with pause/resume/cancel/emergency controls.
- Failure behavior: Uncertified type, stale input, missing identity, or uncertain outcome fails closed and pauses for review — never re-dispatches from stale state.
- Reconnect behavior: Jobs pause on uncertain outcomes and resume from reconciled state after reconnect; fired edges never backfill.
- Restart behavior: Versioned jobs adopt only complete journaled child IDs; older records pause until they gain recovery proof.
- Stale/offline behavior: All sources require live selected-market data before dispatch; candle-health prevents trade-derived chart fallback from arming candle triggers.
- Custody expectations: Vice servers do not run jobs; no hosted signing path exists; all automation is device-local or venue-native.
- Latency expectations: child→signed dispatch p99 < 10ms; local processing p99 < 2ms; trigger evaluation does not block feed-to-frame work.
- Telemetry: Browser-local counts only; no strategy parameters or account data.
- Linked tests: `execution/conditionalTriggers.test.js`, `conditionalLadderSurface.test.js`, `conditionalLadderMath.test.js`, `execution/algoJobs.test.js`, `execution/algoCancellation.test.js`, `execution/algoTickSafety.test.js`, `execution/deadmanStatus.test.js`, `execution/childDispatchRecovery.test.js`, `execution/scaleLifecycle.test.js`, `execution/scaleDispatchRecovery.test.js`, `execution/adaptiveRestartSurface.test.js`, `execution/breakEvenRestartSurface.test.js`, `execution/chaseRestartSurface.test.js`, `execution/commandJournal.test.js`, `runner/*` tests, `automationTelemetry.test.js`, `orderPersistenceDisclosure.test.js`.
- Funded-testnet evidence: `docs/evidence/advanced-order-certification-2026-08-06.json` (15/15 phases, 22 real venue order IDs, 37 observed fills) — **INVALIDATED 2026-08-11**: hardened validator rejected it (phase `ok: true` masked 44 nested `ok: false` pause/resume/cancel outcomes; certification flags stay disabled pending recertification). Valid: `docs/evidence/trigger-fired-events-2026-08-04.json` (two genuine open→triggered→filled fires) and hermes-sidecar P2 evidence `docs/evidence/hermes-sidecar-p2-2026-08-05.json`.

## Evidence log

- 2026-08-11: The 2026-08-06 advanced-order certification manifest was INVALIDATED by the hardened validator (`scripts/advanced-order-evidence.mjs` + `test:advanced-evidence`): phase-level `ok: true` masked 44 nested `ok: false` pause/resume/cancel outcomes. Recertification required before any advanced flag re-enables. Trigger-lifecycle funded evidence (2026-08-04) remains valid; browser restart evidence for every local algorithm remains open (PLAN_3 "Direct and persistent execution" / "Automation persistence disclosure" rows).
