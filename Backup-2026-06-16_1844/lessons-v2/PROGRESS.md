# Liquidity Theory v2 — build progress (resumable across sessions)

This file is the single source of truth for what's done and what's next. Every session
(interactive or scheduled) reads it first and updates it after **each** module, so work
always resumes cleanly. Build order requested by the user: **Course 2 → Course 3 →
remaining Course 4.**

> **Scheduling:** the `lt-v2-lessons-autobuild` task is currently **disabled** — the user
> is working interactively for now. (Re-enable from the Scheduled sidebar if you want
> unattended runs again.)

> **FINAL STEP (after ALL FOUR courses are complete in v2):** migrate the v2 lessons into
> the **live site**, replacing the v1 lessons. This is the agreed end-goal. It is a large,
> outward-facing change to a production website (liqtheory.com) — plan it carefully and
> get the user's explicit go-ahead at that time before touching live files. Until then,
> the "never touch the live site" rule below stays in force.

## Golden rules (do not break)
- **Isolation:** everything under `/Users/pbot/.openclaw/workspace/lessons-v2/`. NEVER
  touch the live site (`lt-index.html`, `lt-engine.js`, `lt-*.js`, `index.html`) or the
  recon data in `rebuild/`. Source transcripts are **READ-ONLY**.
- **Three layers stay separate:** content (`lessons/CourseN/NN_*.js`) / vocabulary
  (`chart-vocabulary.js`) / renderer (`renderer.js`). Editing content never touches the
  renderer; adding a chart move never touches a lesson.
- **Charts are idealized + TICKER-FREE:** no coins, exchanges, or real prices. Distill any
  real-ticker replay into abstract vocabulary moves on an unlabeled price axis.
- **Co-author narration + visual together** so they always agree. Narration = rewritten,
  spoken-ready prose (the future TTS script). Reuse the user's cleaned recon captions as
  the backbone; never paste raw ASR; no "see below" phrasing.
- **Prefer one evolving chart per concept** (consecutive beats, same `chart`, advancing
  `stage`) over many disconnected charts.
- **Reuse the vocabulary first;** only add a new move when a module genuinely needs one,
  then document it in `CHART_VOCABULARY.md`.
- **Indicators must be REAL, and colors must MATCH the course.** When a module teaches an
  indicator or a proprietary color tool, render the actual thing — never fake it with a
  plain candle chart. See "Indicator & color fidelity" below.

## Indicator & color fidelity (REQUIRED — user-specified)
When a lesson teaches one of these, the chart must actually render it, in the course's
real colors. Build a clean v2 indicator layer (vocabulary returns the computed
series/overlays/sub-panels/per-candle colors; the renderer draws them generically — that
keeps the three layers separate). Reference implementation to match (READ-ONLY, for the
math + exact colors only): `rebuild/recon/lt-recon-player.js` (`_schemeColors`,
`_ichimokuSeries`).

- **Ichimoku** (C2: 13_Ichimoku_Kinko_Hyo, 14_Ichimoku_Market_Scenario; C4: 26_Kijun_Sen,
  27_C_Clamps_and_Kumo_Pockets, 28_Edge_to_Edge, 29_Ichimoku_Market_Scenario): draw
  **Tenkan-sen** (conversion, (HH+LL)/2 over ~9) in **light blue `#5cc8ff`**, **Kijun-sen**
  (base, over ~26) in **bright yellow `#ffcf3f`**, **Senkou A** = (Tenkan+Kijun)/2,
  **Senkou B** = (HH+LL)/2 over ~52, and the **Kumo cloud** filled between A and B —
  **green `rgba(40,200,120,0.18)`** when A>B (bullish), **red `rgba(242,61,92,0.15)`** when
  A<B (bearish). Scale periods down for short idealized charts.
- **Per-candle color schemes** (proprietary tools — C4: 13_Trend_Buddy, 14_PAL,
  15_Heuristics, 17_Crayons, 18_Genie): color each candle by its short-term trend using the
  tool's real palette `[up, down, neutral]`:
  - trendbuddy `['#00d4d4','#ff2e88','#5b5570']`
  - crayons    `['#7cff6b','#f23d5c','#5b5570']`  (green / red / gray)
  - genie      `['#00d4d4','#f23d5c','#8a84a6']`
  - pal        `['#00d4d4','#f23d5c','#5b5570']`
  - heuristics `['#00d4d4','#ff2e88','#5b5570']`
  - rule: `ref = close[i-3]; diff = close[i]-ref; thr = |ref|*0.004;` up if `diff>thr`,
    down if `diff<-thr`, else neutral. (A per-candle `candleColors` array on the move also
    works for exact per-signal fidelity if a module calls for it.)
- **Volume** (C2: 09_Volume_Examples): a sub-panel of volume bars below the price chart,
  bar colored by the candle's direction.
- **Oscillators / RSI** (C2: 15_Oscillators): a sub-panel below price with the oscillator
  line and its reference bands (e.g. RSI 30/70).
- **Fibonacci** (C2: 12_Fibonacci): retracement levels (0 / 0.236 / 0.382 / 0.5 / 0.618 /
  0.786 / 1) drawn as labeled horizontal lines across a measured swing.
- **Classical patterns** (C2: 06,07,10,11): head & shoulders, double top/bottom, triangles
  (asc/desc/sym), wedges, flags, etc. — idealized, ticker-free, with the neckline / trendlines
  annotated.

## Method per module (the proven loop)
1. Read the docs once per run: `FORMAT.md`, `CHART_VOCABULARY.md`, `RENDERER.md`.
2. For the next pending module, read its source `manifest.json` under
   `~/Desktop/LiquidityTheory_Transcripts/<Course>/<NN_Module>/` and the matching cleaned
   recon entry in `rebuild/recon/lt-recon-course{N}.js` (cleaned captions + original
   `ltCandles` chart geometry — the faithful structural source). VIEW the chart-bearing
   frames (`f_*.jpg`) where geometry is unclear.
   - Handy: extract per-module digests like the prior run did, e.g.
     `node -e '...read lt-recon-courseN.js, dump caption+scene per chunk...'`.
3. Segment into ~6–13 beats by visual change. Author `lessons/CourseN/NN_Name.js` in the
   v2 format (register into `window.LT_LESSONS['courseN/NN_slug']`). Mix CONCEPT / CHART /
   CANDLE; concept-only modules are fine when the source is text-only.
4. `node --check` the file. Add/justify any new vocabulary move + document it.
5. Verify in the browser (preview tools): the `lt-app` server serves the workspace root at
   `http://localhost:5173/`. Build/extend a `courseN.html` hub (copy `course1.html`,
   swap the script list + crumb) and load it; step the new beats; require **0 console
   errors**. Screenshot a chart-heavy beat to confirm.
6. **Update this file** (tick the module, bump the count) before moving on.
7. Stop when budget runs low; the next run resumes from here.

## Reference
- Built proof + patterns: `lessons/Course4/03_Identifying_Liquidity.js`, all of
  `lessons/Course1/*.js`. Memory: `~/.claude/projects/-Users-pbot/memory/lt-lessons-v2.md`.
- Hub template: `course1.html`. Single-module template: `preview.html`.

---

## Status

### Course 1 — Laying the Foundation — ✅ DONE (15/15)
All modules complete and verified. Hub: `course1.html`.

### Course 2 — Building Your Toolbox — ✅ DONE (17/17, hub: course2.html, 89 beats, 0 errors)
- [x] 01_Trading_Styles · 02_Introduction · 03_Types_of_Trades · 04_Entering_Trades · 05_Exiting_Trades
- [x] 06_Price_Action_Formations   (formation moves: engulfing_bull/bear, morning/evening_star, three_white_soldiers, three_black_crows)
- [x] 07_Price_Action_Examples     (engulfing + VOLUME sub-panel confirmation)
- [x] 08_Volume_Analysis           (4 price-vs-volume scenarios, each with a volume panel)
- [x] 09_Volume_Examples           (low-vol range → high-vol breakout/breakdown)
- [x] 10_Classical_Chart_Patterns  (rising/falling_wedge, head_and_shoulders + inverse, asc/desc_triangle, bull_flag — all with declining-then-spike volume)
- [x] 11_Classical_Pattern_Examples
- [x] 12_Fibonacci                 (fibonacci move: golden-pocket retracement levels)
- [x] 13_Ichimoku_Kinko_Hyo        (ichimoku move: Tenkan #5cc8ff / Kijun #ffcf3f / green-red Kumo cloud — RENDERS)
- [x] 14_Ichimoku_Market_Scenario  (reuses ichimoku move)
- [x] 15_Oscillators               (rsi move: RSI sub-panel, 30/70 bands, bearish divergence)
- [x] 16_Financial_Instruments     (concept) · [x] 17_Outro (concept)
- [ ]   (12 needs a FIBONACCI move; 13/14 need an ICHIMOKU move; 15 needs an RSI move)

INDICATOR INFRASTRUCTURE STATUS (renderer + vocab helpers now exist):
- DONE in renderer.js: per-candle `candleColors`, filled `cloud` (Senkou A/B, green/red),
  `overlays` (lines, e.g. Tenkan/Kijun), bottom `subpanel`/`volume` sub-panel (bars + oscillator
  line with reference bands). All animate with candle reveal.
- DONE in chart-vocabulary.js helpers: `schemeColors(cs, scheme)` (crayons/trendbuddy/genie/pal/
  heuristics palettes), `ichimoku(cs, periods)` (tenkan/kijun/spanA/spanB), `vol(cs, spikes)`.
- STILL TODO (build the MOVE that uses the helper when you author the module): an `ichimoku_*`
  chart move (return `overlays`+`cloud` from `ichimoku()`, periods scaled ~{conv:5,base:10,span:20}),
  an `rsi`/oscillator move (return `subpanel:{type:'rsi',series,bands:[{v:30},{v:70}],min:0,max:100}`),
  a `fibonacci` move (retracement levels as `level` annotations on a measured swing), and the C4
  proprietary-tool color-scheme moves (use `schemeColors` → `candleColors`).
- BUGFIX (2026-06-16): renderer now threads `params` to the vocabulary (was ignored — `dir:'down'` /
  `as:'resistance'` silently used defaults). Continuity now compares geometry identity.
- [ ] 07_Price_Action_Examples
- [ ] 08_Volume_Analysis
- [ ] 09_Volume_Examples
- [ ] 10_Classical_Chart_Patterns
- [ ] 11_Classical_Pattern_Examples
- [ ] 12_Fibonacci
- [ ] 13_Ichimoku_Kinko_Hyo
- [ ] 14_Ichimoku_Market_Scenario
- [ ] 15_Oscillators
- [ ] 16_Financial_Instruments
- [ ] 17_Outro

### Course 3 — Sharpening Your Edge — ✅ DONE (21/21, hub: course3.html, 88 beats, 0 errors)
- [x] 01–08: Intro, Order Types, Deposit/Withdraw, Order Book, Positions, Executing, Contracts, Leverage
  (exchange-UI walkthroughs distilled into platform-agnostic concept lessons; reused trade_setup_long)
- [x] 09_Applying_Leverage   (added `liquidation` move — entry/stop/safe+danger liquidation lines)
- [x] 10_Margin_Management   (reused trade_setup_long + ichimoku for trade management)
- [x] 11_Identifying_Access_Points · 12_Trading_SR · 13_Trading_Ranges · 14_Range_Market_Scenario
  (reused consolidation_breakout / horizontal_sr / sr_flip / range_bound / liquidity_sweep_bullish)
- [x] 15–21: Crafting/Applying/Recording a System, Trader's Mindset, Meditation, Reality of Full-Time,
  Outro (all concept). Only NEW vocab this course: `liquidation`.
- [ ] 03_Deposit_and_Withdraw
- [ ] 04_Understanding_the_Orderbook
- [ ] 05_Getting_into_Positions
- [ ] 06_Executing_Orders
- [ ] 07_Understanding_Contracts
- [ ] 08_Understanding_Leverage
- [ ] 09_Applying_Leverage
- [ ] 10_Margin_Management
- [ ] 11_Identifying_Access_Points
- [ ] 12_Trading_SR
- [ ] 13_Trading_Ranges
- [ ] 14_Range_Market_Scenario
- [ ] 15_Crafting_Your_System
- [ ] 16_Applying_Your_System
- [ ] 17_Recording_Your_System
- [ ] 18_Developing_a_Traders_Mindset
- [ ] 19_The_Art_of_Meditation
- [ ] 20_The_Reality_Behind_Trading_Fulltime
- [ ] 21_Outro

### Course 4 — Liquidity Theory — ✅ DONE (30/30, hub: course4.html, 129 beats, 0 errors)
- [x] 01–05: Intro, Four Principles, Identifying Liquidity (proof), Liquidity Structures (under-over/
  over-under via liquidity_sweep), Liquidity Scenarios (range_bound + sweeps)
- [x] 06–07: Who's in Control primer, Sentiment Variables (concept)
- [x] 08–11: Funding Rate, Open Interest, Cumulative Delta, Future Basis — SENTIMENT SUB-PANELS
  (added moves funding_rate/open_interest/cumulative_delta/future_basis + renderer `histogram` sub-panel)
- [x] 12: Applying Sentiment (concept)
- [x] 13–18: Trend Buddy, PAL, Heuristics, FSVZO, Crayons, Genie — PROPRIETARY TOOLS (added `color_tool`
  move using schemeColors→candleColors with each tool's real palette; `fsvzo` oscillator)
- [x] 19–25: Platform Overview, Liquidation Levels, Liquidation Scenario, Positions Heatmap, Combining
  Sentiment, Trading Activity, Hyblock (added `liquidation_levels` move — cluster magnets/cascade)
- [x] 26–29: Kijun-Sen, C-Clamps & Kumo Pockets, Edge-to-Edge, Ichimoku Scenario (reused `ichimoku`)
- [x] 30: Outro (closes the whole curriculum)

## 🎉 ALL FOUR COURSES COMPLETE — 83 modules, 392 beats, 0 errors. Hubs: course1–4.html.
## ✅ MIGRATED LIVE + V1 REMOVED (2026-06-16) — v2 is the ONLY lesson renderer on the live app
   (full swap, shipped silent). The v1 recon player + written-lesson path were deleted from the
   engine, and the whole `rebuild/` tree + `lt-recon-player.js` + `player/` (~335 MB) were removed
   (API key preserved at workspace-root `.anthropic_key`). The last orphan (C2 "Divergences") was
   authored as a v2 lesson (`Course2/18_Divergences.js`). 84 lesson files now (C2 = 18). See
   `MIGRATION_HANDOFF.md` "Status: MIGRATED LIVE + V1 FULLY REMOVED". Nothing left to do (optional: TTS).

## Run log
- (each run: append one line — date, modules completed this run)
- 2026-06-15: Course 1 (all 15) + Course 4/03 built by hand; PROGRESS.md + scheduled task created.
- 2026-06-16: Course 2 modules 01–05 built + verified (course2.html, 26 beats, 0 errors). Indicator
  & color fidelity spec added (user request).
- 2026-06-16: Course 2 modules 06 (formations) + 07 (formations + volume sub-panel) built + verified.
  Built indicator infrastructure in renderer (candleColors / cloud / overlays / volume + oscillator
  sub-panel) and vocab helpers (schemeColors, ichimoku, vol). Fixed params-threading bug. Course 2
  now 7/17. NEXT: 08 Volume Analysis (concept), 09 Volume Examples, then pattern moves (10/11), then
  fibonacci/ichimoku/rsi moves (12/13/14/15).
- 2026-06-16: Course 2 modules 08 (4 volume scenarios) + 09 (volume breakout/breakdown confirmation)
  built + verified (volume panel renders rising/declining/spike correctly). Added volume params to
  uptrend/downtrend/consolidation_breakout. Course 2 now 9/17. NEXT: 10/11 classical patterns.
- 2026-06-16: COURSE 2 COMPLETE (17/17, 89 beats, 0 errors). Added 7 classical-pattern moves, the
  fibonacci/ichimoku/rsi moves (the full indicator suite now renders: Ichimoku cloud + Tenkan/Kijun,
  RSI sub-panel + divergence, fib golden pocket). Indicator infrastructure DONE.
- 2026-06-16: COURSE 3 COMPLETE (21/21, 88 beats, 0 errors). Mostly concept; reused existing vocab;
  only new move = `liquidation`.
- 2026-06-16: Course 4 started — 01, 02, 04, 05 built; hub course4.html (5/30).
- 2026-06-16: COURSE 4 COMPLETE (30/30, 129 beats, 0 errors). Built the histogram sub-panel + moves
  funding_rate/open_interest/cumulative_delta/future_basis (sentiment), color_tool (proprietary tools,
  real palettes) + fsvzo, liquidation_levels (heatmap/clusters). 🎉 ALL 83 MODULES / 392 BEATS DONE,
  0 errors. Only remaining step: migrate v2 → live site (replace v1) with user go-ahead. — Liquidity Theory: liquidity
  structures/scenarios, sentiment (funding/OI/cumulative delta/basis), and the PROPRIETARY TOOLS
  (Trend Buddy/PAL/Heuristics/Crayons/Genie → use schemeColors→candleColors), Ichimoku tools
  (Kijun-sen/C-Clamps/Kumo/Edge-to-Edge → use the ichimoku move), liquidation heatmaps, etc.
