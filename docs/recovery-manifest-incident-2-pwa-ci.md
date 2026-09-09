# Recovery Manifest — Incident 2 (Gate 1/PWA + CI Release Artifact)

**Date:** 2026-08-11
**Kanban task:** `t_ea3d0dca`
**Operator:** l0k1 (shapeshifter)

## What happened

Two kanban workstreams — the bounded Vercel PWA release artifact and the
clean-checkout CI + immutable release manifest — were fully implemented in
prior worker runs (transcripts below) but their working-tree output was
**erased** before it could be committed (no `.github/workflows`, no
`vice-terminal/.vercelignore`, no manifest, no `service-worker.ts` rewrite, no
PWA files, no release-manifest tooling). The commits on `viceterminal` never
contained the files. This task reconstructs every erased file from the durable
Hermes run transcripts, re-verifies the full gate suite, and documents the
mapping.

## Source transcripts (ground truth)

| Transcript | Session | What it contains |
| --- | --- | --- |
| `~/.hermes/kanban/logs/t_3fdfc8b7.log` | PWA release artifact (runs 24–29) | vercel.json, .vercelignore, manifest, service-worker rewrite, pwa.ts, PwaBanner, /api/meta, pwa-artifact/prod tests, gen-pwa-icons.py, VERCEL_DEPLOYMENT.md, package.json `test:pwa`, release-gate wiring |
| `~/.hermes/kanban/logs/t_34448159.log` | CI + immutable release manifest (runs 30–31) | ci.yml, release.yml, staging-smoke.yml, release-manifest.mjs + test, release-test-summary.mjs, workflow-boundary.test.mjs, package.json `test:release-manifest`/`test:workflow-boundary`, docs corrections (US-005, OPERATIONS.md, PLAN matrix) |
| `~/.hermes/kanban/logs/t_c56eea4f.log` | Gate 2 SDLC review (run 31) | Later workflow corrections incorporated here: verify-only release dispatch must NOT trigger an unrelated build; release/staging fail closed when a supplied manifest or artifact is missing; release upload/verify paths made conditional |

## File → source mapping

### PWA (from `t_3fdfc8b7.log`)
- `vice-terminal/svelte.config.js` → adapter-vercel (split:true), `serviceWorker.register:false` (run 25 patches, log L1490/L1517)
- `vice-terminal/vercel.json` → headers: `/_app` immutable, PWA/SW no-cache, site-wide security headers (L1582–1635)
- `vice-terminal/.vercelignore` → excludes `.svelte-kit/.vercel/node_modules/*.tsbuildinfo/.env*` (L1636–1656)
- `vice-terminal/static/manifest.webmanifest` → standalone install manifest (L1911–1949)
- `vice-terminal/src/app.html` → manifest link, theme-color, apple meta + touch icon (L1950–1967)
- `vice-terminal/src/service-worker.ts` → precache shell, deliberate SKIP_WAITING reload, network-first nav + shell fallback, `/api/*` never cached (L2042–2124)
- `vice-terminal/src/lib/pwa.ts` → updateAvailable/isOffline stores, registerPwa, checkForUpdates, reloadForUpdate, resetPwaForTests (L2302–2394, L5101)
- `vice-terminal/src/lib/components/PwaBanner.svelte` → offline + update-available banners (L4546–4593)
- `vice-terminal/src/routes/+layout.svelte` → import + render `<PwaBanner />` (L4599–4618)
- `vice-terminal/src/routes/api/meta/+server.ts` → diagnostics-safe build metadata (L4631–4654)
- `vice-terminal/scripts/pwa-artifact.test.mjs` → bounded-artifact gate over `.vercel/output/static` (L4688–4770, corrected forbidden list L5741–5787)
- `vice-terminal/src/lib/pwa.test.js` → manifest + SW source contract + pwa.ts flow (L4802–5325)
- `vice-terminal/scripts/pwa-prod.test.mjs` → production header/CSP contract (L5342–5458)
- `vice-terminal/scripts/gen-pwa-icons.py` → icon generator, run to produce the 4 PNGs (L1766–1878)
- `docs/VERCEL_DEPLOYMENT.md` → deployment runbook (L5465–5547)
- root `package.json` → `test:pwa` script (L5553–5560)
- `scripts/release-gate.mjs` → `test:pwa` wired in (L5565–5575)

### CI + release manifest (from `t_34448159.log`)
- `.github/workflows/ci.yml` → clean-checkout gate (L2255–2440)
- `.github/workflows/release.yml` → immutable artifact + manifest, never deploys (L2625–2707; Gate 2 corrections from `t_c56eea4f.log`)
- `.github/workflows/staging-smoke.yml` → approval-gated read-only smoke (L2713–2795)
- `scripts/release-manifest.mjs` → clean-tree/exact-SHA manifest builder + verifier (L868–1216)
- `scripts/release-manifest.test.mjs` → 14 tests (L1057–1284)
- `scripts/release-test-summary.mjs` → deterministic gate summary into manifest input (L2549–2608)
- `scripts/workflow-boundary.test.mjs` → local workflow security-boundary lint (L2856–2938)
- root `package.json` → `test:release-manifest`, `test:workflow-boundary` scripts
- `scripts/release-gate.mjs` → `test:release-manifest`, `test:workflow-boundary` wired in
- `docs/user-stories/US-005-release-reliability.md` → stale CI-parity claim corrected
- `docs/OPERATIONS.md` → added "CI and immutable release evidence" section
- `docs/PLAN_3_REQUIREMENT_MATRIX.md` → row 28 CI + release-manifest evidence appended

## Reconstruction fidelity notes

- Where a transcript diff was truncated ("omitted N diff line(s)"), the file was
  reconstructed to satisfy the exact test contracts that the transcripts show
  passing, plus the documented design comments in the reasoning blocks.
- Reconstructed files were **re-verified against the real gate suite**, not
  merely copied: `bun run typecheck`, `bun run test:svelte`,
  `bun run test:frontend` (646 pass), `bun run test:pwa` (22 pass),
  `bun run test:release-manifest` (14 pass), `bun run test:workflow-boundary`
  (6 pass), `actionlint` clean, `bun install --frozen-lockfile --dry-run` in
  sync, dependency audit 0 advisories, strict dirty-tree rejection + lenient
  verify round-trip + exact-SHA guard proven at the CLI, and `bun run build`
  (adapter-vercel, no adapter-auto warning).
- Deviations from the transcript (all to make tests actually pass under the
  current tree, matching the transcripts' own final fixed state):
  - `gitStatus` parses porcelain v1 with a regex instead of `line.slice(3)` —
    the transcripts show the slice was buggy ("un.lock" bug) and fixed.
  - `pwa.test.js` manifest/icon paths use `../../static` (the transcript wrote
    `../static` which resolved to `src/static` and errored; the build+test
    evidence shows the working tree used the correct relative path).
  - `pwa.test.js` SW skipWaiting assertion uses a lastIndexOf + message-handler
    guard instead of the over-broad `/install...skipWaiting\(\)/` regex (which
    matched the SW's own "no skipWaiting on install" comment).

## Verification summary (final)

| Gate | Result |
| --- | --- |
| `bun run typecheck` | pass |
| `bun run test:svelte` | pass (0 errors/warnings) |
| `bun run test:frontend` | 646 pass |
| `bun run test:pwa` | 22 pass |
| `bun run test:release-manifest` | 14 pass |
| `bun run test:workflow-boundary` | 6 pass |
| `actionlint` (3 workflows) | pass |
| `bun install --frozen-lockfile --dry-run` | in sync |
| `bun run test:audit` | 0 advisories, 0 exempted |
| strict `--release` on dirty tree | fails (correct) |
| lenient build + verify round-trip | passes |
| exact-SHA guard (wrong SHA) | fails (correct) |
| `bun run build` (adapter-vercel) | pass |
| `bun run test:release` | see task completion |
| `git diff --check` | pass |

## Ownership note

The root repo `vercel.json` and `scripts/*` belong to the Liquidity Theory /
legacy site surface at the repo root. The terminal-local `vice-terminal/vercel.json`
is a separate artifact owned by the Vice Terminal Vercel project (Root
Directory: `vice-terminal`). This recovery does not modify the root legacy
`vercel.json`.
