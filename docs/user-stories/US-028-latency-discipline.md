# US-028: Latency discipline end to end

Story schema v2.

As an experienced Insilico terminal user, I want the terminal to feel instant: receipt→store p99 < 5ms, feed→frame-ready p99 < one 60Hz frame, action→signed dispatch p99 < 10ms, local processing p99 < 2ms, no long tasks, no dropped frames — with measured, fail-closed evidence, not a marketing claim.

## Acceptance criteria

- US-028-AC-001: Given a live production session, when market frames arrive, then receipt→store p99 stays under 5ms and feed→frame-ready p99 stays under 16.667ms; the store never queues unbounded.
- US-028-AC-002: Given a user action (ticket, chart, ladder, hotkey, CLI), when it is dispatched, then action→signed dispatch p99 stays under 10ms and local processing p99 stays under 2ms.
- US-028-AC-003: Given the runtime health surface, when measured, then long-task count, long-animation-frame count, event-delay count, inferred dropped-frame count, max frame interval, reconnect count, and queue depths stay within the release budgets.
- US-028-AC-004: Given a client-telemetry evidence file, when `VICE_LATENCY_EVIDENCE` points at it, then `bun run test:latency` validates schema v2 and fails closed on any budget violation or malformed file.
- US-028-AC-005: Given the workspace, when rendered, then inactive panels use onlyWhenVisible rendering and the lazy Dockview chunk stays under the static 80 KiB gzip cap.
- US-028-AC-006: Given the data plane, when feeds reconnect, then serialized recovery never blocks the UI thread and the store stays within budget.
- When the full terminal flow is measured, then no single long task or dropped frame occurs during cold start, market selection, ticket editing, chart drag, ladder interaction, or workspace drag.

- Action IDs: story.us-028

## Operational contract

- Persona: Experienced Insilico terminal user whose edge depends on the terminal keeping up with the market.
- Preconditions: Production build; live feed; client-telemetry collection active; `VICE_LATENCY_EVIDENCE` present for mainnet gate.
- Success behavior: All latency SLOs measured and passing from a real client capture; no fixture or synthetic sample satisfies the gate.
- Failure behavior: Any budget violation, malformed evidence, missing evidence file, or no valid samples fails the gate closed.
- Reconnect behavior: Recovery paths keep the UI thread within budget and never reorder or duplicate frames.
- Restart behavior: Cold start reaches live data within budget; no long task during boot.
- Stale/offline behavior: Stale transitions mark panels without blocking the UI thread.
- Custody expectations: Telemetry excludes keys, signatures, account contents, prices, and sizes.
- Latency expectations: receipt→store p99 < 5ms; feed→frame-ready p99 < 16.667ms; action→signed dispatch p99 < 10ms; local processing p99 < 2ms.
- Telemetry: Schema-v2 client evidence with receipt/store/frame-ready samples plus privacy-safe runtime-health aggregates.
- Linked tests: `scripts/latency-gate.mjs`, `scripts/latency-gate.test.mjs`, `src/lib/execution/latencyGates.ts`, `src/lib/native/performance.test.js`, `bun run test:latency`.
- Funded-mainnet evidence: Runtime health and latency budgets are part of the release gate; no desktop capture is certified yet (PLAN_3 "Release and performance gates" row).

## Evidence log

- 2026-08-07: Static latency-gate and performance tests green in `bun run check`; a measured Chromium client-latency capture remains open (PLAN_3 "Release and performance gates" row).
