# v2 Lessons — Build Complete + MIGRATED LIVE ✅

> Read this together with the site-wide `../HANDOFF.md`. This file covers the **v2
> animated-lessons system**. **MIGRATION DONE (2026-06-16):** v2 is now the DEFAULT lesson
> renderer on the live app (full swap, shipped silent). The recon player is kept in code as
> a fallback. This section documents how it was wired; the original plan follows below.

## Status: MIGRATED LIVE ✅ + V1 FULLY REMOVED (full swap, silent — 2026-06-16)

User chose **full swap + ship silent** (captions only; TTS deferred), then asked to **remove all
v1 legacy lessons and clean the file tree**. Both done. v2 is now the ONLY lesson system.
Verified in the Claude Preview with **0 console errors across all four courses**; OpenClaw
auto-deploys (no manual `vercel`). Backup: `../Backup-2026-06-16_1716/`.

### V1 removal + cleanup (2026-06-16, later)
- **Last orphan authored in v2:** C2 "Divergences" → `lessons-v2/lessons/Course2/18_Divergences.js`
  (reuses the `rsi` move; no live video, so mapped via `LT_V2_NOVIDEO[2][14]`). ALL 81 live chapters
  now map to a v2 lesson. `lessons-v2/lessons/manifest.js` regenerated (C2 = 18).
- **Recon system deleted from `lt-engine.js`** (loaders for recon/timelines/cues/chartmeta,
  `renderReconLesson`/`mountReconPlayer`/`disposeReconPlayer`, the dead `setIntroView`/`toggleIntroVideo`/
  `_ensureVideoButton`/`_reconTabs` intro-video machinery, and the `reconMode` branches in the card
  builders). Kept the YouTube-link helpers (`_watchOriginalHtml`/`_youtubeWatchUrl`).
- **V1 written-lesson path deleted** (`renderLesson` + the real-example toggle helpers). The quiz's
  real-BTC example feature was KEPT (shared helpers). Lesson dispatch is now just `renderV2Lesson`.
- **Step model = 3 steps for every chapter (intro/lesson/quiz).** The separate "Visual" step was first
  decoupled from recon, then **folded back into the Introduction** (user request): `renderIntro` now
  shows the overview text + the chapter's chart (or concept diagram / course roadmap) on one page.
  `renderVisual`, `chapterHasVisual`, and `STEP_LABELS_RECON` were removed; the route clamp is `s<=2`.
  The 2 course-opener chapters (C1/C2 ch0) with BOTH a roadmap and a chart show overview+roadmap with
  the chart full-width below. (`lt-engine.js?v=3.99.0`.)
- **Files deleted (~335 MB):** the whole `rebuild/` tree (recon recipes + 244M audio + 71M frames +
  generators + the old rebuilt-transcript layer), `lt-recon-player.js`, and the `player/` proof dir.
  Tracked files (2682) recoverable from git HEAD; untracked dev artifacts were permanent.
- **API key preserved + secured:** `rebuild/.anthropic_key` → workspace-root `.anthropic_key`, added to
  BOTH `.gitignore` and `.vercelignore` (so it never commits/deploys). `.vercelignore` cleaned of the
  dead `rebuild/` entries.
- Cache bumps: `lt-engine.js?v=3.98.0`, `manifest.js?v=1.1.0`.
- **Verified (0 errors):** all 81 chapters mount v2; resource-timing confirms nothing requests the
  deleted recon/rebuild paths. NOT committed (OpenClaw deploys from the working tree).

### Original migration (full swap)

**What changed (live files):**
- `lt-index.html` — loads the v2 stack before the deferred engine (all `?v=1.0.0`):
  `lessons-v2/player.css`, `chart-vocabulary.js`, `renderer.js`, `lessons/manifest.js`.
  Bumped `lt-engine.js` → `?v=3.97.0`.
- `lt-engine.js` — new V2 layer (after `disposeReconPlayer`): `LT_V2_BY_VIDEO` (75
  video_id→v2id) + `LT_V2_NOVIDEO` (5 video-less intro/recap chapters, by course+index),
  `ensureV2LessonsLoaded(n)` (lazy per-course via `window.LT_V2_FILES`), `v2LessonIdFor` /
  `getV2Lesson`, `renderV2Lesson` (mounts `new LTRenderer(host, lesson)` on the **lesson**
  step), `disposeV2Player` (added to `disposeAllCharts`). Lesson-step dispatch is now
  `v2LessonIdFor ? renderV2Lesson : hasRecon ? renderReconLesson : renderLesson`. The step
  model is UNCHANGED (still gated on `hasRecon`).
- `lessons-v2/lessons/manifest.js` — NEW, auto-generated; `window.LT_V2_FILES = {1:[...],…}`
  (per-course lesson filenames). Regenerate if lesson files are added/renamed.
- `.vercelignore` — ships `lessons-v2/**.js` + `player.css`; excludes `lessons-v2/*.md` +
  the `course*.html` / `preview.html` hubs.

**Mapping (machine-validated):** 80/81 live chapters map to a v2 lesson. The only orphan is
Course 2 **"Divergences"** (no v2 counterpart) → falls back to its v1 written lesson. The v2
lesson FILES were NOT edited — the whole map lives in `lt-engine.js`, so the verified build
is byte-for-byte intact.

**Verified:** full sweep of every chapter's lesson step — C1 13/13, C2 16/16 (+1 fallback),
C3 21/21, C4 30/30 mount the renderer; Ichimoku cloud + Trend Buddy palette render in-app via
the real Next-button flow; 0 errors.

**Optional follow-ups:** (1) per-beat **TTS** from each beat's `say` (renderer has a
`_cueAudio` hook) — currently silent; (2) cosmetic — recon chapters still show the static
"Visual" candle step before the v2 Lesson (inherited from the old step model); (3) once v2 is
proven on prod, the recon player + `rebuild/recon/` can be removed (kept as fallback for now).

---

## Status: BUILD COMPLETE ✅
All four courses are rebuilt in the v2 system and verified (0 console errors, every beat
steps + draws). Still 100% isolated — the live site and `rebuild/recon/` are untouched.

| Course | Modules | Beats |
|--------|---------|-------|
| 1 · Laying the Foundation | 15 | 86 |
| 2 · Building Your Toolbox | 17 | 89 |
| 3 · Sharpening Your Edge | 21 | 88 |
| 4 · Liquidity Theory | 30 | 129 |
| **Total** | **83** | **392** |

Single source of truth for what's built + the chart vocabulary + the rules:
`lessons-v2/PROGRESS.md`, `FORMAT.md`, `CHART_VOCABULARY.md`, `RENDERER.md`.

## What v2 is (architecture)
Three cleanly separated layers, all under `lessons-v2/`:
1. **Content** — `lessons/Course{1..4}/NN_*.js`. One lesson = one editable data file; each
   registers into `window.LT_LESSONS['courseN/NN_slug']`. Beats are `CONCEPT` / `CHART` /
   `CANDLE` with spoken-ready `say` narration (future TTS), `chart`/`candle` + `stage` +
   `show` annotations. Edit a beat = edit one block; no codegen, no seeds.
2. **Vocabulary** — `chart-vocabulary.js` (`window.LTChartVocab`): named, ticker-free,
   deterministic chart primitives + per-candle color schemes + Ichimoku math.
3. **Renderer** — `renderer.js` (`window.LTRenderer`) + `player.css`. Plain Canvas + DOM,
   **zero external deps** (no ECharts/Lucide). Consumes (content + vocabulary), draws
   candle reveal / levels / zones / markers / overlays / Kumo cloud / sub-panels / concept
   text. Has a per-beat `_cueAudio` hook ready for ElevenLabs TTS (no re-authoring needed).

It currently runs standalone in the hubs: `course1.html` … `course4.html` (served by the
`lt-app` server at `http://localhost:5173/lessons-v2/courseN.html`). Each hub:
`new LTRenderer(mountEl, lesson)` after loading the v2 stack + that course's lesson files.

## How the LIVE site renders lessons today (what v2 replaces)
- `lt-index.html` loads `lt-recon-player.js` (line ~56) + lazy-loads `rebuild/recon/
  lt-recon-course{N}.js` etc.
- `lt-engine.js`: `hasRecon(chapter)` gates it; `renderReconLesson(chapter)` builds a doc
  and does `new LTPlayer(hostEl, doc, tline, cues, meta)` (≈ lines 1469 & 3299) — the recon
  animated player **is** the lesson (in place of the YouTube embed). Step keys for a recon
  chapter: `['intro','visual','lesson','quiz']`.
- Recon data is keyed by **video_id**. v2 lessons carry `course` + `module` (and
  `source_video` = the YouTube id on Course 1 & 4; Course 2/3 lessons mostly omit it).

## MIGRATION PLAN (the next session's job)
**Goal:** make the v2 `LTRenderer` render the lessons in the app, replacing the recon
player. Verify in the Claude Preview (0 errors) before any deploy. OpenClaw auto-deploys to
Vercel — do NOT run a manual `vercel --prod`.

Confirm the approach with the user first (they were offered: plan-first / migrate-now /
behind-a-toggle / leave-it, and deferred the decision). Suggested steps once approved:

1. **Decide swap vs toggle.** Safest first pass: a flag (e.g. `?v2=1` or a Settings toggle)
   that routes lessons through `LTRenderer` while keeping the recon player as fallback, so
   you can compare on prod before fully replacing v1.
2. **Load the v2 stack in `lt-index.html`** (with `?v=` cache params — RULE #1): add
   `lessons-v2/chart-vocabulary.js`, `renderer.js`, `player.css`, and a loader for the
   `lessons/Course{N}/*.js` (lazy-load per course like the recon scripts do, or build a
   per-course concat). Keep them isolated; they define their own globals.
3. **Build the chapter→lesson map.** Map each live chapter to its v2 lesson. Cleanest: a
   `video_id → 'courseN/NN_slug'` table (the recon objects already know each chapter's
   video_id + module; v2 ids encode course+module). Or add `source_video` to the C2/C3
   lesson files and match on that.
4. **Add a render path in `lt-engine.js`.** Alongside `renderReconLesson`, add
   `renderV2Lesson(chapter)` that finds the lesson via the map and does
   `new LTRenderer(hostEl, window.LT_LESSONS[id])`. Gate `renderLesson`/`goToStep` on the
   flag. Mind the step model: v2 is one continuous beat sequence, not `intro/visual/lesson/
   quiz` — either map v2 to the single `lesson` step, or simplify the step pills for v2
   chapters. Keep the existing quiz/exam system (that's not part of v2).
5. **Audio:** v2 is silent today. The existing Kokoro TTS mp3s in `rebuild/recon/audio/` are
   keyed to the OLD recon caption timing and DON'T match v2's rewritten `say` narration.
   Either ship v2 silent (captions only) or generate fresh per-beat TTS from each beat's
   `say` and set `beat.audio` (the renderer already cues `beat.audio` on entry).
6. **`.vercelignore`:** make sure `lessons-v2/` (JS + CSS + lesson files) is SHIPPED; exclude
   the `*.md` docs and the hubs if you don't want them public. Watch the 5000-file deploy
   limit (see `../HANDOFF.md`).
7. **Verify** in the Claude Preview: load the app, open lessons across all four courses,
   confirm 0 console errors and that charts/Ichimoku/colors/sub-panels render. Then let
   OpenClaw deploy and re-verify on prod.

## Rules / safety
- **Cache-bust** every edited JS/CSS in `lt-index.html` (`?v=X.Y.Z`).
- **Back up first:** make a timestamped `Backup-<YYYY-MM-DD_HHMM>/` before live edits (see
  `../HANDOFF.md`), so the recon player is one copy-back away if needed.
- **Don't delete** the recon system in the first pass — keep it as fallback until v2 is
  proven on prod.
- Verify in preview with **0 console errors** before deploying; never manual-deploy.
