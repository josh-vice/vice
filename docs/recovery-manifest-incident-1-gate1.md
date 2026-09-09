# Recovery Manifest — Incident 1/4: Gate 1 Security/Integrity Reconstruction

**Task:** t_d6f224ed — "Recovery 1: Replay erased Gate 1 controls from transcripts"
**Date:** 2026-08-11
**Repo:** /Users/nichols/Desktop/Viceterminal/vice-viceterminal (branch `viceterminal`)
**Baseline:** HEAD 64ce8c7 preserved. No commit/push/deploy performed.

## Incident
At 2026-08-11 15:25 the canonical directory was replaced by a fresh clone, erasing all
uncommitted beta work (promo-signer isolation, advanced-evidence integrity, runtime
verifier hardening, dependency remediation, and the independent Gate 1 review). This
manifest records the reconstruction from the four durable task logs, the verification
results, and the exact acceptance status.

## Source logs (authoritative)
| Workstream | Task log | Original author |
|---|---|---|
| Promo signer isolation + advanced evidence integrity | `~/.hermes/kanban/logs/t_2d99df01.log` | th0r |
| Runtime verifier ownership/cleanup (dev:verify) | `~/.hermes/kanban/logs/t_a50fef49.log` | nj0rd |
| Dependency remediation / audit gate | `~/.hermes/kanban/logs/t_3aa6dc86.log` | l0k1 |
| Independent Gate 1 validator hardening / review fixes | `~/.hermes/kanban/logs/t_66f39c11.log` | sk4d1 |

Reconstruction method: replay of the exact write/patch diffs recorded in each log;
where the log's review-diff was truncated ("… omitted N diff line(s)"), the content was
rebuilt from the surrounding reasoning, the deterministic test expectations, and the
later hardening patches, then verified against the real test suite (never fabricated).

## Files restored / modified
| File | Status | Source log |
|---|---|---|
| `vice-terminal/vite.config.ts` | already clean (no /shim) — verified | t_2d99df01 |
| `vice-terminal/vite.config.promo.ts` | NEW (test-only config, `/shim` isolated) | t_2d99df01 |
| `scripts/dev-promo.sh` | NEW/overwritten (uses `--config vite.config.promo.ts`) | t_2d99df01 |
| `scripts/advanced-order-evidence.mjs` | NEW (recursive validator + sk4d1 hardening) | t_2d99df01 + t_66f39c11 |
| `scripts/advanced-order-evidence.test.mjs` | NEW (14 tests incl. 4 sk4d1 regressions) | t_2d99df01 + t_66f39c11 |
| `docs/evidence/advanced-order-certification-2026-08-06.json` | NEW (negative fixture the validator rejects) | reconstructed from logs |
| `scripts/preflight.mjs` | PATCHED (promo isolation + dependency audit wired) | t_2d99df01 + t_3aa6dc86 |
| `scripts/preflight-policy.test.mjs` | PATCHED (audit-wiring test) | t_3aa6dc86 |
| `scripts/dependency-audit.mjs` | NEW (fail-closed policy gate) | t_3aa6dc86 |
| `scripts/dependency-audit.test.mjs` | NEW (18 deterministic tests) | t_3aa6dc86 |
| `scripts/dependency-audit.exceptions.json` | NEW (empty default) | t_3aa6dc86 |
| `scripts/dependency-audit.exceptions.template.json` | NEW | t_3aa6dc86 |
| `package.json` | PATCHED (`test:advanced-evidence`, `test:audit`, overrides) | t_2d99df01 + t_3aa6dc86 |
| `vice-terminal/package.json` | PATCHED (`@sveltejs/kit` ^2.70.2) | t_3aa6dc86 |
| `bun.lock` | regenerated (root authoritative) | t_3aa6dc86 |
| `scripts/dev-verify.sh` | OVERWRITTEN (run identity + owned group + cleanup) | t_a50fef49 |
| `scripts/dev-verify-lib.sh` | NEW (ownership/cleanup helpers) | t_a50fef49 |
| `scripts/dev-verify-launch.py` | NEW (`os.setsid` group launcher) | t_a50fef49 |
| `scripts/runtime-readiness.mjs` | NEW (identity handshake) | t_a50fef49 |
| `vice-terminal/src/routes/api/run-token/+server.ts` | NEW (run-token endpoint) | t_a50fef49 |
| `scripts/dev-launcher.test.mjs` | OVERWRITTEN (6 tests) | t_a50fef49 |
| `scripts/release-gate.mjs` | PATCHED (`test:launcher`, `test:audit`, `test:advanced-evidence`) | t_a50fef49 + t_3aa6dc86 + t_66f39c11 |
| `.gitignore` | PATCHED (`.hermes/`) | t_66f39c11 |
| `docs/OPERATIONS.md` | PATCHED (one-command runtime-verification) | t_a50fef49 |
| `docs/PLAN_3_REQUIREMENT_MATRIX.md` | PATCHED (dev:verify + dependency gate rows) | t_a50fef49 + t_3aa6dc86 |
| `docs/user-stories/US-005-release-reliability.md` | PATCHED (verifier evidence bullet) | t_a50fef49 |
| `docs/user-stories/US-023-order-ticket-precision-and-presets.md` | PATCHED (artifact invalidated) | t_2d99df01 |
| `docs/user-stories/US-027-persistent-automation.md` | PATCHED (artifact invalidated) | t_2d99df01 |
| `docs/user-stories/README.md` | PATCHED (US-023/US-027 rows) | t_2d99df01 |

The sk4d1 probe scripts (`_sk4d1-adversarial-probe.mjs`, `_sk4d1-induced-failure-probe.mjs`)
were scratch and deleted at end-of-task by the original author; not restored (per log).

## Verification results (all PASS)
| Gate | Result |
|---|---|
| `bun test scripts/advanced-order-evidence.test.mjs` | 14 pass / 0 fail |
| `bun test scripts/dependency-audit.test.mjs` | 18 pass / 0 fail |
| `bun run test:audit` | 18 pass + `✓ dependency audit (0 advisories, 0 exempted)` + `✓ lockfile in sync` |
| `bun test scripts/preflight-policy.test.mjs` | 4 pass / 0 fail |
| `bun run test:security` (preflight) | `✓ promo signer isolation`, `✓ dependency audit`, `✓ lockfile in sync` |
| `bun test scripts/dev-launcher.test.mjs` | 6 pass / 0 fail (occupied-port, identity, orphan, early-failure) |
| `bun audit` | `No vulnerabilities found` |
| `bun run test:gate3:evidence` | Gate 3 four-phase evidence still green (4/4) — no regression |
| `bun run test:funded-evidence` | US-002/003/004 passes, reconnect/restart, 0 uncertain/dup |
| `bun run typecheck` | PASS (incl. new run-token route) |
| `bun run test:svelte` | 0 errors / 0 warnings |
| `bun run test:frontend` | 635 pass / 0 fail across 174 files |
| `bun run build` | PASS |
| `bun run test:release` (aggregate) | exit 0 — "Static release gate passed." |
| Isolated runtime `VICE_BACKEND_PORT=18081 VICE_FRONTEND_PORT=15174 bash scripts/dev-verify.sh` | identity proven, smoke + browser-surface + live-feed (real venue WS) passed, cleanup OK |
| Post-run port cleanup | 18081/15174 free, no orphan processes |
| `git diff --check` | clean |

## Acceptance status
1. Normal vite config has no /shim; promo config test-only; release artifact cannot include signer — **DONE** (preflight enforces it; regression test asserts it).
2. Recursive advanced evidence validator rejects historical invalid artifact and all Gate 1 tamper vectors; wired to `test:release`; advanced flags fail closed — **DONE** (14 tests incl. sk4d1's 11-vector coverage; capabilities.ts already default-disabled).
3. dev:verify rejects occupied/unowned services, proves run identity, owns full process group, cleans ports on every path — **DONE** (6 deterministic tests + real isolated run; ports free after).
4. Dependency upgrades/overrides restore zero advisories; fail-closed policy + lockfile sync wired to security/release — **DONE** (bun audit clean; test:audit in release gate; lockfile in sync).
5. Docs/ignore adjustments restored — **DONE** (all listed files patched; `.hermes/` gitignored).
6. Focused tests, bun audit, preflight, check, test:release, isolated dev:verify, port cleanup, git diff --check all run and pass — **DONE**.

## Notes / decisions
- The historical artifact `advanced-order-certification-2026-08-06.json` was reconstructed
  from the documented structure (15 phases, 44 nested `ok:false` pause/resume/cancel
  outcomes with "Unregistered market identity", summary claiming 15/15) so the validator's
  negative-fixture test and the doc invalidation are truthful. Its embedded
  `artifactProvenance` marks it as a reconstructed negative fixture, states that the
  original bytes were not recovered, and forbids treating it as release evidence. It
  carries no fabricated pass claims — it is only the invalid fixture the validator rejects.
- `vice-terminal/bun.lock` (nested, tracked in 64ce8c7 baseline) was left untouched; the
  root `bun.lock` is authoritative and the sync gate uses it.
- No secrets, keys, or signatures in any restored file or output.
