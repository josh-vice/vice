# Chart Teaching-Annotation Audit — Session Handoff

> Focused handoff for the **"teach it on the chart" pass**. Read alongside the site-wide
> `HANDOFF.md`. Date: 2026-06-30. Working tree backup: `Backup-2026-06-30_1736-chart-annotations/`.

## The directive (owner)
> "Go through each chart, each simulated chart, and lesson — anywhere that has a chart. When
> learning, anything **referenced** while teaching must be **TAUGHT on the chart**. If the text
> says *First TP*, *Stop Loss*, *Entry*, *support*, etc., it must be **drawn and labelled** on the
> chart, not just mentioned."

## Status at a glance
| Track | Scope | Status |
|---|---|---|
| **ECharts course charts** (`lt-data*.js` intro/lesson/quiz) | 81 chapters · 231 candlestick charts | **✅ ALL 81 chapters audited + APPLIED.** C1/C2/C3 + C4 ch0,1,2,3,5,6 (94 edits) then C4 ch4,7–29 (65 edits). All live + verified. |
| **Course 4 remainder** | C4 ch **4, 7–29** (24 chapters) | **✅ DONE (2026-06-30).** 65 vetted edits applied (43 markLine/area inserts via apply.js + 5 hand-fixes + ch26-quiz coord/colour correction). ch8 needed nothing. Sweep: 231 charts · 543 levels · 0 throws · 0 clipped · 0 console errors. Cache `lt-data-course4.js 1.18.0`. |
| **v2 animated lessons** (`lessons-v2/lessons/Course*/*.js`) | 84 lessons · ~392 beats (`say` + `show`) | **NOT started** — the live lesson player; same principle (beat narration ↔ `show` annotations). |
| **Simulator** (`lt-sim-ui.js`) | order-line teaching | **NOT re-checked** (it already draws entry/SL/TP order lines; verify only). |

## What was done (this session, applied + verified)
- Ran an **ultracode workflow**: 81 chapters → deep audit → adversarial verify (high effort, 163 agents,
  ~4.5M tokens). Verifiers **rejected 41 weak proposals**. It died on the session limit partway through C4,
  leaving vetted plans for **57 chapters** (`tools/chart-audit/plans-applied/*.json`).
- **Applied all 94 vetted edits** to the 4 course data files (65 annotation insertions + 29 relabels/coord
  fixes) via the persisted scripts. Every file `node --check`-clean.
- **Engine systemic fix** ([lt-engine.js](lt-engine.js) `buildCandlestickOption`, ~line 1216): the price
  y-axis now **expands to include any markLine/markArea level** (via `min`/`max` functions of the auto
  extent) so a "Stop Loss"/"Target" line can never clip off-chart. Fixed 6 clipped levels (3 pre-existing).
  This is the single most important change — keep it.
- **Verified:** 231 charts render · 0 throws · 268/268 markLines visible · 0 clipped · 0 console errors.

### Cache versions now live in `lt-index.html`
`lt-data.js 1.9.5` · `lt-data-course2.js 1.10.0` · `lt-data-course3.js 1.11.0` · `lt-data-course4.js 1.18.0`
· `lt-engine.js 3.114.0`. (Other modules earlier this session: `lt-styles 1.98.5`, `lt-settings 1.30.3`,
`lt-sim-ui 1.15.13`, `lt-glossary 1.19.1`, `lt-flashcards 1.9.5`, `lt-gallery 1.3.3`,
`lessons-v2/renderer 1.14.1`.)

## Reusable tooling (persisted to the repo — excluded from deploy via `.vercelignore`)
`tools/chart-audit/`:
- **`apply.js`** — surgical, **insert-only** applier. Reads `cN-chID.json` plans from its own dir, inserts
  `addMarkLines/addMarkPoints/addMarkAreas` into the right chapter→slot array (creates the array if absent),
  and `addRevealMarkPoints` into the quiz. **No deletions, no brace-matching** → lowest corruption risk.
  Reports `fixes` for manual handling. Usage: `node apply.js <1|2|3|4> [--write]` (dry-run by default).
- **`fixes.js`** — applies the `fixes` (full-object replacements + label-only changes), scoped to each
  chapter block. Usage: `node fixes.js <1|2|3|4> [--write]`. Anything it can't match verbatim it lists as
  "MANUAL NEEDED" → apply by hand (whitespace-alignment mismatches are common; grep the real string).
- **`plans-applied/`** — the 57 vetted plan JSONs already applied (audit trail + the exact format/shape the
  next audit should emit).
- **Always `node --check <file>` after every write**, and re-run the render+clip sweep (below).

## Plan JSON shape (what the audit must emit, what the appliers consume)
```json
{ "course":1, "chapterId":9, "title":"LTF Entry Scenario", "module":"...",
  "edits":[ { "slot":"lessonChart",
    "addMarkLines":[{"yAxis":102.5,"label":"Stop Loss — just above the flip","color":"#ff2e88"}],
    "addMarkPoints":[{"dataIndex":11,"label":"Entry candle","position":"bottom"}],
    "addMarkAreas":[{"y0":98,"y1":102,"label":"S/R flip zone","color":"rgba(255,46,136,0.07)"}],
    "addRevealMarkPoints":[], "fixes":[{"find":"<verbatim>","replaceWith":"<verbatim>","reason":"..."}],
    "reason":"ties each add to the text it teaches" } ],
  "alreadyGood":["introChart"], "notes":"..." }
```

## The bar / conventions (so the next pass matches what's already applied)
- **Palette:** teal `#00d4d4` = bull/support/long-entry · pink `#ff2e88` = bear/resistance/short/stop ·
  gold `#ffcc00` = liquidation & take-profit/target · zone fills `rgba(...,0.07)`.
- **Tools:** `markLines` for LEVELS (entry/stop/TP/support/resistance/range/Kijun) — primary. `markPoints`
  for EVENTS at a bar (breakout!, entry candle, sweep, rejection). `markAreas` for ZONES.
- **Coordinates:** `yAxis` = price within the chart's `ltCandles(start, legs)` band. `dataIndex` = authored
  0-based over summed legs — **author like existing pins; the engine auto-shifts +10 for lead-in context.**
- **Restraint:** intro = illustrate the concept; lesson = the worked trade (entry/stop/target); quiz = the
  decision — **never spoil a `cutIndex` scenario pre-reveal; route outcomes to `revealMarkPoints`.** Don't
  invent levels the text doesn't teach; don't duplicate existing annotations.

## ▶ NEXT SESSION — exact resume steps
**Agent limit resets 5:20pm America/New_York** (the audit needs subagents).

1. ~~**Audit + apply Course-4 remainder (ch 4, 7–29).**~~ **✅ DONE 2026-06-30** (cache `lt-data-course4.js 1.18.0`; backups `Backup-2026-06-30_1759-c4-annotations` pre / `…_1807-c4-annotations-DONE` post). Below kept for reference. Re-run the audit workflow for just those chapters.
   - Workflow script (persisted, parameterized, args-parse already patched):
     `/Users/pbot/.claude/projects/-Users-pbot/a8a8dd00-e4d1-441b-8386-8005c5ca8a98/workflows/scripts/chart-teaching-audit-wf_06009a5a-6df.js`
   - Re-invoke `Workflow({scriptPath, args})` with `args.chapters` = ONLY the 24 remaining C4 chapters
     (course 4, ids 4,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29), `args.files` =
     the 4 data-file paths, `args.scratchDir` = a fresh writable dir (the new session's scratchpad).
     (Note: `resumeFromRunId` is **same-session-only** — in a new session just run fresh with the trimmed args.)
   - Then copy the emitted `c4-ch*.json` into `tools/chart-audit/`, run `node apply.js 4 --write` +
     `node fixes.js 4 --write`, `node --check`, bump `lt-data-course4.js` cache, run the sweep, back up.
   - NOTE: C4 ch27 (E2E) intro was already redesigned this session; C4 chapters are indicator-heavy
     (funding/OI/CVD/heatmap/liquidation/ichimoku) — the "thing taught" is often a sub-panel value, liq
     cluster, heatmap band, or cloud edge. Audit accordingly.
2. **v2 animated lessons** — separate workflow. Each beat has `say` (narration) + optional `show` annotations
   (`chart-vocabulary.js` specs: levels/zones/markers/notes). Same principle: anything the `say` references
   must be in `show`. Different annotation system than ECharts — read `lessons-v2/CHART_VOCABULARY.md` first.
3. **Simulator** — verify `lt-sim-ui.js` draws entry/SL/TP order lines clearly (it does today; confirm + label clarity).

## Verify after ANY chart edit (paste-able sweep, run in the Claude Preview on `/lt-index.html`)
Render every candlestick chart across all 4 courses into a hidden host; assert 0 throws and that every
markLine maps to an in-grid pixel (`inst.convertToPixel({yAxisIndex:0}, ml.yAxis)` within `[-1, 341]`).
0 throws · 0 clipped · 0 console errors before considering it done. (The full sweep used this session is in
the transcript; re-derive or ask.) Then OpenClaw auto-deploys — **no manual `vercel`.**

## Safety rules (unchanged)
Cache-bust every edited JS/CSS in `lt-index.html`. Back up first (`Backup-<date>/`, exclude
node_modules/.git/.vercel/audio/discord-banners/tools/chart-audit). Verify in preview with 0 console errors
before deploy. Don't manual-deploy.

---

## Paste-in prompt for the next session
> Resume the **chart teaching-annotation pass** on the Liquidity Theory app at
> `/Users/pbot/.openclaw/workspace/`. First read `CHART_AUDIT_HANDOFF.md` (this file) AND the site-wide
> `HANDOFF.md`. The directive: **anything referenced while teaching must be drawn+labelled on the chart**
> (Entry/Stop/TP/support/resistance/etc.). 57 chapters are already done and live; the engine y-axis fix that
> keeps levels from clipping is in place (lt-engine.js 3.114.0) — keep it.
>
> Do, in order: (1) **Course-4 remainder** — re-run the persisted audit workflow
> (`scriptPath` in the handoff) with `args.chapters` = C4 ids 4,7–29 only, then apply with
> `tools/chart-audit/apply.js` + `fixes.js`, `node --check`, bump `lt-data-course4.js`, run the render+clip
> sweep (0 throws/0 clipped/0 errors), back up. (2) **v2 animated lessons** — separate workflow auditing each
> beat's `say` vs its `show` annotations (read `lessons-v2/CHART_VOCABULARY.md`). (3) **Simulator** label check.
> Use **ultracode** (workflows) for the audit phases. Cache-bust + back up + verify-in-preview before any
> deploy; OpenClaw auto-deploys, never manual `vercel`. The agent limit resets 5:20pm ET if you hit it again.
