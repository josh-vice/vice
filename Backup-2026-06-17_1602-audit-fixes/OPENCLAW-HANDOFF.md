# Liquidity Theory — OpenClaw Handoff (paste-in ready)

> Self-contained handoff to continue this project in OpenClaw. Paste this whole file (or the
> "▶ PASTE-IN PROMPT" at the bottom) into a fresh OpenClaw session. Canonical detailed log =
> `HANDOFF.md` (top entries); this file is the portable, current-state summary as of 2026-06-15.

## What this is
A **free, no-account crypto-trading education web app**. Pure static client-side: HTML + vanilla-JS
modules + CSS, with **ECharts** (charts) + **Lucide** (icons) via CDN. No backend, no framework, no build
step (except `tools/gen-seo.js` at deploy).
- **Location:** `/Users/pbot/.openclaw/workspace/` (git repo)
- **Run locally:** preview server `lt-app` on port **5173** (`.claude/launch.json`). Landing = `/` →
  `index.html`; the app = `/lt-index.html`. (`:8080` is a separate `player-demo` proof — not the app.)
- **Live:** `https://liqtheory.com` (apex, Vercel).

## ⚠️ DEPLOY — read first
**OpenClaw deploys to Vercel automatically. Do NOT run a manual `vercel --prod`.** (Confirmed by the user
2026-06-15.) A manual CLI deploy also fails on the free plan anyway: the 2,661 audio mp3s trip Vercel's
`api-upload-free` per-file limit (>5000/day, "try again in 24 hours"); `--archive=tgz` is the only manual
workaround. Just commit/push as OpenClaw normally does — everything below ships on the next auto-deploy.

## ⚠️ The two rules
1. **Cache-bust every edit.** Each JS/CSS is loaded in `lt-index.html` with `?v=X.Y.Z` — bump it when you
   edit the file. **Exception — the reconstruction data files** (`rebuild/recon/lt-recon-{course,timelines,
   cues,chartmeta}-course{N}.js`) are lazy-loaded by `lt-engine.js`; their `?v=` lives in the loader code
   **inside `lt-engine.js`** (not `lt-index.html`). The OG image is keyed in `index.html` + `tools/gen-seo.js`
   (`og-image.png?v=N`). `index.html` itself is served no-cache.
2. **The Anthropic key never deploys.** It lives at `rebuild/.anthropic_key` (git- + vercel-ignored — keep
   it that way). Current valid key is in that file.

## Current cache versions (post-2026-06-15 session)
`lt-engine.js 3.92.0` · `lt-recon-player.js 1.9.2` · `lt-styles.css 1.97.5` · `lt-glossary.js 1.18.3` ·
`lt-data.js 1.9.2` · `lt-data-course2.js 1.7.1`. Lazy loaders in lt-engine.js: recon `?v=1.7.0`,
timelines `?v=1.4.0`, cues `?v=1.1.0`, chartmeta `?v=1.0.0`. Mascot imgs `?v=1.1.0`. OG `?v=3`.

## ✅ Shipped this session (all LOCAL + verified in preview, 0 console errors; ships next auto-deploy)
- **Transcript de-stutter (16 modules) + TTS regenerated.** Converted/scenario modules had overlapping
  source captions (tail of each chunk repeated as the head of the next + within-chunk stutters). Tool:
  `rebuild/recon/dedup_captions.py` (deterministic — no args = scan/report, `<vid>` = dry-run, `--write
  [vids]` = rewrite; preserves the `window.LT_RECON_N` footer). Cleaned 16 modules (670/734 chunks), re-ran
  `tts_all.py` (Kokoro `af_heart`, 0 synth failures) → new audio + timelines.
- **Cue track regenerated + deictic highlights.** `build_cues_all.py` → 2,151 cues (re-aligned to clean
  captions/timelines). New DEICTIC PASS: "here / this level / this zone …" → a transient `pulse` cue that
  re-flashes the referenced line/zone/marker at that narration moment (501 pulses). New player primitive
  `pulse` (`pulseCue`/`_matchCueEl` in `lt-recon-player.js`).
- **Player chart labels honor the font setting** (`labelFont()` → Inter when `html.font-inter`, else mono).
- **Colour-word highlighting in lesson prose** (`ltClr()` in lt-engine.js): "green hues / red bars / lime"
  rendered in-hue in intro+lesson body/bullets, concept cards, quiz explanations. **Chart labels untouched.**
- **Glossary 81 → 100 terms** (+ Liquidity Pool, Liquidity Structure (Under/Over), Order Block, Tenkan-sen,
  Chikou Span, C-Clamp, Morning/Evening Star, Soldiers/Crows, Tweezer, Wedge, Trailing Stop, LTE,
  Set&Forget, Realized/Unrealized P&L, Trading Styles, CEX, DEX, Wallet, Cold Storage; 11 with SVG diagrams).
- **Course 1 & 2 intro module roadmaps** (data-only, no chapter-index shift).
- **Mascot renamed pepe → Perpingo** (perp + flamingo). `perpingo-{laptop,cap,builder,ninja,brain}.png`
  (new pink-brand art); `LT_PERPINGO_BY_COURSE` in lt-engine.js; subtle white `drop-shadow` glow on the
  home avatar. The Vice Terminal flamingo logo = `vice-terminal.png` (also the `.vt-flamingo` footer mask).
- **New OG card** — `tools/build-og.js`, full terminal-aesthetic redesign (JetBrains Mono, teal/pink glows,
  Perpingo, "A Vice Terminal Product" + flamingo, balanced spacing). Regen needs JetBrains Mono in the
  rasterizer: `mkdir -p /tmp/og-render && cd /tmp/og-render && npm i @resvg/resvg-js` + download JBM ttfs
  (Regular/Medium/Bold/ExtraBold) into `fonts/` (commands in the build-og.js header), then
  `NODE_PATH=/tmp/og-render/node_modules OG_FONTS=/tmp/og-render/fonts node tools/build-og.js`.
- **.vercelignore hygiene:** excludes `Backup*`, `~`, `rebuild/frames` (unused, 71MB), `audit*`, `f_*.jpg`,
  `og-render`, the key, generators, `player/`, reports. (`rebuild/frames` is dead — the live player uses
  synthetic ECharts, not video frames.)

## ▶ NEXT WORK (priority order)
1. **Apply the visual-fidelity audit fixes (the OpenClaw work being brought over).** The audit compares
   source frames (`/Users/pbot/Desktop/LiquidityTheory_Transcripts/`) against what the app teaches and
   writes `…/_AUDIT/claude_code_fixes.md`. Apply those — **most are RECON-layer**: edit the chunk `scene`
   overlays in `rebuild/recon/lt-recon-course{N}.js` (hand-editable JSON-in-JS) and/or `gen_recipes_llm.py`;
   STATIC-layer fixes edit `lt-data*.js` charts. After editing recon scenes, regenerate cues
   (`python3 build_cues_all.py`) and bump the cue loader `?v=` in lt-engine.js. **There is no `lt-charts.js`**
   (chart code = `lt-chartgen.js` + `lt-engine.js` + `lt-simulator.js`).
2. **Walk the cue track on the 16 de-stuttered modules** in the preview — confirm accents + deictic pulses
   fire on the right beats and audio matches (C2 M1 S2 `qQUyNbupNjU` was the worst offender; verified clean).
3. **Price-calibration QA** — optionally use the Anthropic API over the 19 price-calibrated chunks
   (`rebuild/recon/ticker_price_report.md`) to confirm spoken price ↔ structural level; widen calibration.
   Edit `rebuild/recon/lt-recon-chartmeta-course{N}.js`.
4. **C2 Oscillators (`A7tYHQ9k_6A`) divergence** — construct price+RSI to actually diverge (small generator
   addition in `gen_recipes_llm.py`); a generic pattern can't show divergence.

## Key facts for whoever picks this up
- **Mascot = Perpingo** (perp + flamingo). Never call it "pepe."
- **Reconstruction player is the teaching surface** for the 76 recon modules (animated synthetic-candle
  ECharts + audio narration + cue track), NOT the static `lt-data` chart. Per-chunk `scene` in
  `lt-recon-course{N}.js` is the frame-by-frame visual; keyed by `video_id` with `start_secs` (aligns 1:1
  with the source manifest chunks). 7 modules (6 Hyblock + FSVZO) keep YouTube/static charts.
- Regenerate pre-passes deterministically (no API): `cd rebuild/recon && python3 build_cues_all.py` and
  `python3 build_chart_meta.py`. Re-do TTS (resumable; delete a module's `audio/<vid>/` to force regen):
  `python3 tts_all.py` (needs Kokoro at `~/kokoro-models/`).

---

## ▶ PASTE-IN PROMPT (for a fresh OpenClaw session)

Read `HANDOFF.md` (top entries) and `OPENCLAW-HANDOFF.md` first. The Liquidity Theory app is at
`/Users/pbot/.openclaw/workspace/` — vanilla JS + ECharts, no build step, run via the `lt-app` preview on
:5173 (app = `/lt-index.html`). Live at liqtheory.com.

Rules: (1) cache-bump `?v=` for every edited JS/CSS in `lt-index.html` — EXCEPT the `rebuild/recon/lt-recon-*`
files, whose `?v=` lives in the loader inside `lt-engine.js`. (2) `rebuild/.anthropic_key` must never be
committed/deployed (git- + vercel-ignored). (3) **Do NOT run `vercel` manually — OpenClaw auto-deploys;**
just commit/push and it ships.

Priority work:
1. Apply the visual-fidelity audit fixes from `~/Desktop/LiquidityTheory_Transcripts/_AUDIT/claude_code_fixes.md`
   — mostly RECON-layer scene-overlay edits in `rebuild/recon/lt-recon-course{N}.js` (+ regenerate cues with
   `python3 build_cues_all.py` after, bump cue `?v=` in lt-engine.js). No `lt-charts.js` exists.
2. Walk the cue track on the 16 de-stuttered modules in the preview (accents/deictic pulses + audio).
3. Price-calibration QA over the 19 chunks (`ticker_price_report.md`) — Anthropic key available if needed.
4. C2 Oscillators divergence (generator addition).

Verify every change in the Claude Preview (don't ask me to check manually). Mascot is **Perpingo**, not pepe.
