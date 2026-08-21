# Recovery Manifest — Incident 3/4: Enablement UX + Production Chromium E2E Reconstruction

**Task:** t_baab5e00 — "Recovery 3: Replay erased enablement UX and E2E"
**Date:** 2026-08-11
**Repo:** /Users/nichols/Desktop/Viceterminal/vice-viceterminal (branch `viceterminal`)
**Baseline:** HEAD 64ce8c7 + Recovery 1 (t_d6f224ed) + Recovery 2 (t_ea3d0dca) preserved. No commit/push/deploy performed.

## Incident

The connect + secure-trading enablement UX work (task t_5afd3202, author l0k1) and the
production hydrated Chromium E2E suite (task t_5919031c, author th0r) were erased. This
manifest records the reconstruction from the durable sources, the verification results,
and the acceptance status.

## Source logs (authoritative)

| Workstream | Task log | Original author | Recovered from |
|---|---|---|---|
| Enablement state machine + UI wiring | `~/.hermes/kanban/logs/t_5afd3202.log` | l0k1 | session DB `~/.hermes/profiles/l0k1/state.db` (full write/patch ops, untruncated) |
| Production Chromium E2E suite | `~/.hermes/kanban/logs/t_5919031c.log` | th0r | session DB `~/.hermes/profiles/th0r/state.db` + sk4d1 request dump (final on-disk state) |

Reconstruction method: replay of the exact write/patch diffs recorded in each session's
state.db (the kanban log renders truncate long diffs with "… omitted N diff line(s)", so
the untruncated DB operations were the ground truth). Where the DB held an intermediate
write, the later request-dump read (sk4d1 session t_e2a6b2d4, which read the final files at
11:01, before the 15:25 erasure) was used as the authoritative final content. Every file
was then verified against the real test suite — never fabricated.

## Files reconstructed / modified

### Enablement UX (t_5afd3202, l0k1)
| File | Status |
|---|---|
| `vice-terminal/src/lib/execution/enablement.ts` | NEW (explicit state machine: 7 steps, error taxonomy, bounded backoff, retryable/cancel/dismiss) |
| `vice-terminal/src/lib/execution/enablement.test.js` | NEW (14 tests) |
| `vice-terminal/src/lib/components/enablementSurface.test.js` | NEW (7 surface/reporter-threading tests) |
| `vice-terminal/src/lib/stores.ts` | PATCHED (`enableTrading` gains `onPhase?: EnablementReporter`, classifies errors, threads reporter) |
| `vice-terminal/src/lib/execution/localExecution.ts` | PATCHED (`initialize` gains `onPhase`, reports connecting/synchronizing/enabled phases) |
| `vice-terminal/src/lib/execution/agentVault.ts` | PATCHED (`assertProviderAccount`/`unlockOrCreateAgent` report verifying-wallet/checking-authority/approval-submitted) |
| `vice-terminal/src/lib/components/OrderTicket.svelte` | PATCHED (explicit enablement progress/error region, retry-with-countdown, cancel/dismiss, non-blanking ticket) |
| `vice-terminal/src/lib/docs/content.ts` | PATCHED (onboarding copy for the exact beta flow + enablement-failure guidance) |
| `vice-terminal/src/lib/execution/revenueSurface.test.js` | PATCHED (matches new `enableTrading` signature) |
| `vice-terminal/src/lib/execution/localExecutionFailure.test.js` | already carried the `report` threading (verified) |

### Production Chromium E2E (t_5919031c, th0r)
| File | Status |
|---|---|
| `vice-terminal/e2e/playwright.config.js` | NEW (production preview, non-mutating testDir, funded excluded) |
| `vice-terminal/e2e/playwright.funded.config.js` | NEW (funded discovery-only config) |
| `vice-terminal/e2e/specs/_fixtures.js` | NEW (evidence capture + assertCleanRuntime quality bar) |
| `vice-terminal/e2e/specs/cold-load.spec.js` | NEW (hydration, chart canvas, honest local status) |
| `vice-terminal/e2e/specs/feed-pwa.spec.js` | NEW (offline shell, service worker, route-aborted read) |
| `vice-terminal/e2e/specs/mobile.spec.js` | NEW (mobile layout + shared order-entry path) |
| `vice-terminal/e2e/specs/panels-status.spec.js` | NEW (panel mount, honest book/tape status, CLI, activity) |
| `vice-terminal/e2e/specs/quality.spec.js` | NEW (kill-switch honesty, console/page/request errors, accessibility) |
| `vice-terminal/e2e/specs/wallet-disconnected.spec.js` | NEW (no-account preconditions, MOCK-provider secure-trading) |
| `vice-terminal/e2e/specs/workspace-layout.spec.js` | NEW (layout lock flow, persist/reset) |
| `vice-terminal/e2e/specs/_probe.spec.js` | NEW (CSP style probe — diagnostic, not in required list) |
| `vice-terminal/e2e/funded/funded-lifecycle.spec.js` | NEW (funded lifecycle DEFINITIONS, gated, excluded from normal suite) |
| `scripts/e2e-gate.mjs` | NEW (build → preview → playwright → artifact sanitization) |
| `scripts/e2e-gate.test.mjs` | NEW (7 static structural tests) |
| `scripts/package.json` | PATCHED (`test:e2e`, `test:e2e:static`, `test:e2e:funded`) |
| `scripts/release-gate.mjs` | PATCHED (`test:e2e:static` wired into release gate) |
| `.github/workflows/ci.yml` | PATCHED (`browser-e2e` job: production hydrated non-mutating suite, no credentials) |
| `.gitignore` | PATCHED (`/scripts/e2e/.artifacts/`) |
| `docs/PLAN_3_REQUIREMENT_MATRIX.md` | PATCHED (E2E row: 20-test suite, CSP bug fix, gates) |
| `vice-terminal/src/lib/components/MobileOrderSheet.svelte` | PATCHED (CSP fix: inline `transform: translateY` → compiled `translate-y-full`/`max-h-[90dvh]`) |
| `vice-terminal/src/lib/mobileParity.test.js` | PATCHED (asserts CSP-safe Tailwind form) |

## Verification

- `bun test src/lib/execution/enablement.test.js` — 14 pass
- `bun test src/lib/components/enablementSurface.test.js` + revenueSurface + localExecutionFailure — 27 pass combined
- `bunx tsc --noEmit -p tsconfig.source.json` — 0 errors
- `bunx svelte-check --tsconfig ./tsconfig.source.json` — 0 errors, 0 warnings
- `bun test src/lib` — 667 pass, 0 fail
- `bun run test:e2e:static` — 7 pass (wired into release gate)
- `bun run check` — EXIT 0 (preflight, typecheck, svelte, frontend, backend, build)
- `bun run test:release` — EXIT 0 (all 28 aggregate gates incl. new `test:e2e:static`)
- Real Chromium hydrated run (`bun run test:e2e`): **16/20 pass**

## Remaining blockers (recovery-accurate, not hidden)

The 4 hydrated E2E tests that fail against the CURRENT tree are blocked on app features
owned by **Recovery 4** (t_5dd931e5, the t_089f93f7 "beta diagnostics" incident) — NOT on
this reconstruction:
- `workspace-layout.spec.js` ×2 — expects the `workspaceLocked` lock UI (Unlock/Lock
  workspace button) which is missing from the current tree (Recovery 4 scope).
- `panels-status.spec.js` ×2 — expects `order-book` mounted in the dockview host; the
  current tree mounts panels `inactive: true` and lacks the eager-mount layout the E2E-era
  app had (Recovery 4 scope). The spec source itself matches the final verified content.

These tests were verified green in the original E2E run against the pre-incident app; they
will go green once Recovery 4 restores the lock/PitChat/eager-panel app features.

## Dependencies

- Added `@playwright/test: ^1.62.1` to `vice-terminal/package.json` devDependencies (was in
  the erased work) and regenerated `bun.lock`.
- The `diagnostics.spec.js` referenced by a later t_089f93f7 patch to `e2e-gate.test.mjs`
  is a separate incident's addition — deliberately NOT in this reconstruction.
