# Recovery Manifest — Incident 4/4: Diagnostics/Pit, Gate 2 fixes, Gate 3 evidence

**Task:** `t_5dd931e5` — "Recovery 4: Reconstruct erased diagnostics/Pit, Gate 2 reviewer fixes, Gate 3 failure evidence/harness"
**Date:** 2026-08-11
**Repo:** /Users/nichols/Desktop/Viceterminal/vice-viceterminal (branch `viceterminal`)
**Baseline:** HEAD `64ce8c7` + Recovery 1/2/3 preserved. **No commit/push/deploy performed.**

## Incident

The beta-diagnostics + local-only Pit work (task `t_089f93f7`, author nj0rd), the Gate 2
reviewer fixes (task `t_c56eea4f`, author h31m), and the Gate 3 basic-lifecycle evidence
(task `t_a35ae7dd`, author sk4d1) were erased. This manifest records the reconstruction
from the durable sources, the verification results, and the acceptance status.

## Authoritative sources

| Workstream | Task log | Original author | Recovered from |
|---|---|---|---|
| Beta diagnostics + local-only Pit + Report Issue | `~/.hermes/kanban/logs/t_089f93f7.log` | nj0rd | session DB `~/.hermes/profiles/nj0rd/state.db` session `20260811_102210_edda16` (full untruncated write_file/patch tool_calls + read results) |
| Gate 2 fail-closed workflow/import fixes | `~/.hermes/kanban/logs/t_c56eea4f.log` | h31m | session DB `~/.hermes/profiles/h31m/state.db` + log diffs |
| Gate 3 basic lifecycle harness/validator/report | `~/.hermes/kanban/logs/t_a35ae7dd.log` | sk4d1 | session DB `~/.hermes/profiles/sk4d1/state.db` session `20260811_110144_7c438e` |
| workspaceLocked lock UI / eager canonical panel mounting | t_089f93f7 + t_5919031c (th0r E2E) | nj0rd / th0r | th0r pre-erasure reads (`20260811_091414_f6ca6b`) |

Reconstruction method: for NEW files the full untruncated `write_file` content from the
session DB `tool_calls` column was the ground truth (the kanban log truncates long diffs).
For files later PATCHED, the log's complete patch hunks were applied on top of the write.
For files built purely from patches on an erased base (PitChat), the pre-erasure full
read capture (nj0rd DB + th0r DB reads) was used as the base and the documented local-only
patches were applied. Every file was then verified against the real test/build/E2E suite —
never fabricated.

## Files reconstructed / modified

### t_089f93f7 — Beta diagnostics + local-only Pit (P1)
| File | Status |
|---|---|
| `vice-terminal/src/lib/diagnostics/schema.ts` | NEW (deterministic schema v1, kind `vice.support-bundle`, bounded retention/size, trim priority) |
| `vice-terminal/src/lib/diagnostics/redact.ts` | NEW (adversarial redaction gate: keys/signatures/addresses/JWT/mnemonics/order payloads) |
| `vice-terminal/src/lib/diagnostics/recorder.ts` | NEW (bounded health-transition/app-error/request-failure collectors + sanitizeRequestUrl) |
| `vice-terminal/src/lib/diagnostics/bundle.ts` | NEW (support-bundle assembler, redactDeep at boundary, byte-budget trim, deterministic schema) |
| `vice-terminal/src/lib/diagnostics/wire.ts` | NEW (installDiagnostics: health/error listeners + fetch-failure capture; no telemetry) |
| `vice-terminal/src/lib/diagnostics/download.ts` | NEW (local-only download via `supportBundleFilename`, no upload path) |
| `vice-terminal/src/lib/diagnostics/redact.test.js` | NEW (35 diagnostics tests, adversarial) |
| `vice-terminal/src/lib/diagnostics/bundle.test.js` | NEW (schema/kind/size/redaction/boundary) |
| `vice-terminal/src/lib/components/ReportIssue.svelte` | NEW (in-app Report Issue modal: optional screenshot + description + downloadable privacy-safe bundle, Esc/tabindex a11y) |
| `vice-terminal/src/lib/components/PitChat.svelte` | RECONSTRUCTED from pre-erasure base + local-only patches (local · beta label, slash-command-only, plain peer input refused, `docked` warning removed, Send→Run) |
| `vice-terminal/src/lib/chat/` (commands/policy/rateLimit/links/types) | NEW (PitChat dependency; reconstructed from nj0rd reads; links.ts rebuilt to satisfy policy.test.js contract) |
| `vice-terminal/src/lib/chat/policy.test.js` | NEW (18 tests) |
| `vice-terminal/src/lib/pitLocalBoundary.test.js` | NEW (source-token boundary gate) |
| `vice-terminal/src/lib/components/Navbar.svelte` | PATCHED (Report Issue trigger + dialog, installDiagnostics onMount, lock button + preset/PANELS disabled-when-locked, `$state` conversions for 0 warnings) |
| `vice-terminal/src/lib/workspacePreset.ts` | PATCHED (workspaceLocked store + setWorkspaceLocked + LOCK_STORAGE_KEY + chat panel) |
| `vice-terminal/src/lib/components/WorkspaceHost.svelte` | RECONSTRUCTED (eager canonical panel mounting, lock flow, chat/The Pit panel) |
| `vice-terminal/e2e/specs/diagnostics.spec.js` | NEW (3 tests: Report Issue modal, privacy-safe bundle download, Pit local-only) |
| `vice-terminal/src/lib/components/MobileOrderSheet.svelte` | PATCHED (gate OrderTicket on `open` to avoid duplicate DOM markers with eager desktop ticket) |
| `scripts/e2e-gate.test.mjs` | PATCHED (require diagnostics.spec.js in non-mutating suite) |
| `docs/OPERATIONS.md` | PATCHED (beta support/diagnostics intake/incident ownership) |

### t_c56eea4f — Gate 2 reviewer fixes
| File | Status |
|---|---|
| `vice-terminal/src/lib/stores.ts` | PATCHED (dynamic-import `setActiveAccountAsset` from `./hl/account` — removes account-module static import; also preserved Recovery 3 `enableTrading` onPhase reporter) |
| `vice-terminal/src/lib/cli/executor.ts` | PATCHED (dynamic-import `refreshAccountSnapshot` via `refreshCliAccountSnapshot`) |
| `vice-terminal/src/lib/hl/index.ts` | PATCHED (stop re-exporting account subscriptions from barrel) |
| `.github/workflows/release.yml` | PATCHED (fail-closed: manifest-missing → `::error` + exit 1) — verified present |
| `.github/workflows/staging-smoke.yml` | PATCHED (fail-closed manifest check) — verified present |

### t_a35ae7dd — Gate 3 basic lifecycle evidence + validators
| File | Status |
|---|---|
| `scripts/capture-basic-lifecycle-certification.mjs` | NEW (12-phase basic lifecycle capture harness, sidecar boundary) |
| `scripts/capture-browser-perf-evidence.mjs` | NEW (real-Chromium cold-load perf capture) |
| `scripts/validate-basic-lifecycle-evidence.mjs` | NEW (evidence-integrity validator: recomputes phase outcomes, flags `ok:false`/error/uncertain) |
| `docs/evidence/gate3-basic-beta-certification-report.md` | NEW (FAIL report documenting the six failed phases + root causes + browser perf) |

> **Evidence note:** the six-failed-phase manifest (`docs/evidence/basic-lifecycle-certification-2026-08-11.json`)
> and browser perf evidence were RUNTIME-GENERATED against the live funded testnet and
> their content is not recoverable from the session DB. They are not reconstructed (no
> fabrication). The report documents the six failures durably; the harness + validator
> reproduce them on a funded re-run. The **newer passing four-phase artifact**
> (`docs/evidence/gate3-basic-four-phase-2026-08-11.json/.md` from `64ce8c7`) was NOT
> touched and remains machine-validated.

## Verification (all real tool output)

- `bun test src/lib/diagnostics/` + `src/lib/pitLocalBoundary.test.js` — **35 pass, 0 fail**
- `bun test src/lib/chat/policy.test.js` — **18 pass, 0 fail**
- `bunx tsc --noEmit -p tsconfig.source.json` — **0 errors**
- `bunx svelte-check --tsconfig ./tsconfig.source.json` — **0 errors, 0 warnings**
- `bun test src/lib` — **720 pass, 0 fail**
- `bun run check` — **EXIT 0** (preflight, typecheck, svelte, frontend, backend, build)
- `bun run test:release` — **EXIT 0** (all 28 aggregate gates incl. test:e2e:static, test:security, audit)
- Real Chromium hydrated run (`bun run test:e2e`) — **23/23 pass** (all non-mutating hydrated tests green)
- `bun scripts/validate-gate3-four-phase-evidence.mjs` — PASS (4/4, 0 uncertain, 0 dup, clean end)
- `bun run test:funded-evidence` — PASS (US-002/003/004 ≥2 passes, reconnect+restart)
- `bun run test:stories` / `bun run test:widgets` — PASS
- Isolated `dev:verify` (18081/15174) — EXIT 0 (smoke + browser + live WS feed), ports cleaned
- `git diff --check` — clean; preflight security + dependency audit (0 advisories) — PASS
- No secrets/PII in evidence or bundles; `.e2e/.artifacts` gitignored + sanitized (SANITIZATION.md present)

## Acceptance status

- **Functional equivalence to prior completed handoffs** while preserving the newer
  4/4 order repair — verified.
- **Zero external telemetry** in diagnostics (no fetch/sendBeacon/analytics — local-only).
- **Pit local command console** enforced (slash-commands only; plain peer input refused).
- **0 compiler warnings** (docked removed, Navbar `$state` conversions).
- **23/23 production E2E** green (the four Recovery-3 failures + 3 new diagnostics all pass).
- **Gate 3**: harness + validator + FAIL report reconstructed; newer four-phase PASS preserved.
- **No commit/push/deploy performed.**

## Caveats
- `vice-terminal/src/lib/chat/links.ts` was reconstructed from its test contract (the erased
  original content was not captured); `chat/policy.test.js` (18 tests) verifies it exactly.
- The Gate 3 six-failed-phase evidence JSON and browser-perf JSON are runtime artifacts not
  recoverable from logs; the report documents them (see note above).
