# Liquidity Theory — Session Handoff

> Paste-in context for a fresh session. Read this first, then `lt-index.html` and `lt-styles.css`.

## What this is
A **free, no-account crypto trading education web app**. Pure static client-side: HTML + vanilla-JS modules + CSS, with **ECharts** (charts) and **Lucide** (icons) loaded via CDN. No backend, no build step, no framework. All learner progress lives in the browser's `localStorage`.

- **Location:** `/Users/pbot/.openclaw/workspace/` (a git repo)
- **Run locally:** preview server `lt-app` on port **5173** (`.claude/launch.json`). Landing page = `/` → `index.html`; the app = `/lt-index.html`.
- **Live (Vercel):** custom domain **`https://liqtheory.com`** (apex; `www.liqtheory.com` should 301→apex via the Vercel dashboard's primary-domain setting). The old `workspace-mu-rust.vercel.app` still resolves. Deployed with `vercel --prod --token "$VERCEL_TOKEN"`. **Canonical domain is now baked into the code** (`index.html` meta + `tools/gen-seo.js` `BASE_URL`); in-app share/sync links are domain-agnostic (`location.origin`).

## Backups (restore points)
Local snapshots live in the workspace root (each excludes `node_modules`/`.git`/`.vercel`/infra):
- `Backup/` — flat, oldest (Jun 13, ~`lt-styles.css 1.71.0`).
- `Backup-2026-06-14_1615/` — older milestone (`lt-styles.css 1.94.0`, `lt-engine.js 3.67.0`, …).
- `Backup-2026-06-17_0004/` — Scenario+module-Quiz step, adaptive results panel, chart-label
  pills/collision/hover, lesson-complete button removal.
- `Backup-2026-06-17_0215-tts/` — code-only snapshot of the Kokoro TTS narration milestone.
- `Backup-2026-06-17_0238-accuracy-player/` — before the lesson chart-accuracy + player-compaction pass.
- `Backup-2026-06-17_1036-scenarios/` — code only; before the scenario/ECharts Ichimoku + RSI-panel pass.
- `Backup-2026-06-17_1347-toolviz/` — code only; before the Hyblock tool-visualization rollout (`later⁷`).
- `Backup-2026-06-17_1536-realism/` — code only; before the PA-realism + chart-context pass (`later⁸`).
- `Backup-2026-06-17_1602-audit-fixes/` — code only; before the trader-audit fixes (`later⁹`).
- `Backup-2026-06-17_1631-viz-palette/` — **latest** (code only; audio regenerable). Snapshot BEFORE the
  UX/UI palette-unification pass (`later¹⁰`). Cache at that point: `lt-engine.js 3.104.0`, `lt-data.js 1.9.2`,
  `lt-data-course2.js 1.8.0`, `lt-data-course3.js 1.9.0`, `lt-data-course4.js 1.14.1`. **After this session:**
  `lt-engine.js 3.105.0`, `lt-data.js 1.9.3`, `lt-data-course2.js 1.9.0`, `lt-data-course3.js 1.10.0`,
  `lt-data-course4.js 1.15.0` (chartgen 1.1.0 unchanged; `lt-styles.css 1.98.3`, `lessons-v2/renderer.js 1.13.0`, …).

New backups use a timestamped name (`Backup-<YYYY-MM-DD_HHMM>`) so they never overwrite an older one.

## ⚠️ The two rules you must follow
1. **Cache-bust after every edit.** Each JS/CSS is loaded in `lt-index.html` with `?v=X.Y.Z`. If you edit a file, **bump its version** there or the browser serves stale code. (HTML itself is served no-cache via `serve.json` locally / `vercel.json` in prod.)
2. **Local ≠ deployed.** Lots of recent work is in local files but **not yet pushed**. A redeploy is pending (see below).

## ▶ NEXT SESSION — pending work

### ✅ DONE (2026-06-17 later⁷): Hyblock TOOL VISUALIZATIONS rolled out across Courses 3 & 4
The full sweep is complete + verified (43 touched charts render with 0 console errors). Two NEW engine helpers
were built (`_applySubPanel` for funding/basis/OI, `_applyOrderBook` for order-book depth) and a **pre-existing
latent bug** was found + fixed (`_applyActivityPanel` drew the delta line via a piecewise `visualMap`, which
throws "reading 'coord'" on a `line` series in this ECharts build — it had been silently breaking the 3
"already-done" delta charts ch18/ch23 too; now a sign-coloured **bar** histogram). Cache: `lt-engine.js 3.102.2`,
`lt-data-course4.js 1.13.0`, `lt-data-course3.js 1.9.0`. Details in the `later⁷` log entry below.

**Deploy:** OpenClaw auto-deploys to Vercel from the **working tree** — do NOT run a manual `vercel --prod`.
Nothing is git-committed (commit if you want git as a net). `.vercelignore` ships `lessons-v2/**` runtime
(JS + `player.css` + `audio/**` mp3s/timings/manifest/_fx) and excludes the `*.md` docs, the `course*.html`
/`preview.html` hubs, `tools/tts/.venv`, `rebuild`/`player`, `.anthropic_key`, `PRODUCT.md`, etc.

### ✅ Shipped recently (full detail in the dated log below)
- **Lesson narration (Kokoro TTS)** — all 84 lessons narrated; per-lesson audio with selective regen;
  speed (0.75–2×, audio+animation), hover-reveal volume, karaoke word-highlight, quest-complete fanfare.
  (2026-06-17.)
- **Scenario + per-module Quiz** — the chart quiz is now the "Scenario"; a new multi-question "Quiz" step
  (20 module assessments in `lt-module-quizzes.js`) lands on each module's final session.
- **Lesson player UI** — decluttered chrome (segmented progress bar), roomier desktop transport, chart-label
  pills + collision-avoidance + hover-pop, audio marker, removed in-player "Continue" button.

### Open / optional work
1. **Quiz answer spot-check** — ~10 multiple-choice answers in `lt-module-quizzes.js` were set from
   domain knowledge (the PDF's letter markings didn't survive extraction). The flagged list is in the
   "SCENARIO + per-module Quiz" session entry below — worth the owner's eyeball.
2. **`impeccable` skill** is installed (`.claude`/`.agents` + a PostToolUse design hook; run flows via the
   reference docs — `/impeccable` is not a registered slash command). Open follow-ups:
   - `/impeccable document` → generate **DESIGN.md** (nothing captures the token system yet).
   - **Simulator candles** inconsistent (`lt-sim-ui.js:757` solid-up vs `:933` hollow) — align to the
     site's hollow-up/filled-down + cyan/pink for full-app uniformity.
3. **(Optional) Audio weight** — narration is ~96MB / ~486 files at 96k mp3. Fine for Vercel CDN, but drop
   the bitrate in `tools/tts/generate.py` (re-run `--force`) if it ever needs to be lighter. ElevenLabs
   swap = change the synth call in `generate.py`.
4. **(Optional) Glossary term-flash** only scans the **intro** HTML (the lesson is canvas); could extend to
   the other steps. **(Optional, cosmetic)** dead recon CSS (`.ltp-*`/`.chart-view-tabs`/…) lingers in
   `lt-styles.css` (harmless).

## Latest session (2026-06-17, later¹²) — Chart P2/P3 polish: sub-panel tooltips · a11y · pin density · colour-key toggle

Cleared the four remaining audit items. Backup: `Backup-2026-06-17_1710-p2p3-polish/`. Cache: **`lt-engine.js
3.106.0`** (only file touched). Verified in Claude Preview (incl. a real-DOM legend screenshot), 0 console errors.

- **Sub-panel tooltip values (P2)** — the axis tooltip now prints the value under the cursor for every sub-panel
  / indicator series (funding `-0.07%`, futures basis `±$`, CVD + per-bar Δ, volume, OI, RSI, Tenkan/Kijun),
  each with a colour dot + the value right-aligned. Mechanism: each sub-panel helper registers a value
  formatter in `_opt._panelFmt[seriesName]` (a closed-over `panelFmt` the tooltip formatter reads); the
  formatter now renders a Price block + an "extras" block, skipping `Price`, the lagging `Chikou`, and the
  `_`-prefixed internal Ichimoku cloud series.
- **a11y — Sam (P2)** — same change closes the hover path: sub-panel bull/bear was colour+position only; the
  value is now explicit text in the tooltip (not colour-alone).
- **Pin density (P3)** — charts with ≥5 markPoints on one side (ch6 SA-vars, E2E prereqs) now use a compact
  label (smaller font/line-height/padding) so the stacked ladder breathes — **no callouts dropped** (chose
  compaction over a hard cap to preserve teaching info). `_deconflictMarkLabels` now measures with the labels'
  actual font size so dense stacks pack as tight as they render.
- **Colour-key toggle (P3, off by default)** — a "key" button in each chart-card header (`toggleChartLegend`)
  reveals a context-aware colour legend strip below the chart, listing ONLY the swatches present on that chart
  (candles always; then delta/funding/basis/OI/volume/liq/heatmap/order-book/ichimoku/RSI as applicable).
  Hidden by default per the owner's request; candle swatches honour the learner's custom bull/bear colours.
  `chartCardHtml` gained the button + `#legend-<id>` container; `renderChart` calls `_renderChartLegend`
  (hidden for line charts); styles in `injectChartStyles` (fade-in respects reduced-motion).

## Latest session (2026-06-17, later¹¹) — Lesson-complete overlay · community overhaul · landing logo + audit

Three UI tasks. Cache: **`lessons-v2/renderer.js 1.14.0`, `lessons-v2/player.css 1.8.0`, `lt-engine.js 3.105.1`,
`lt-community.js 1.11.1`**; `index.html` is no-cache (no bump). Verified in Claude Preview (desktop + mobile),
0 console errors. Restore point: `Backup-2026-06-17_1631-viz-palette/` (pre-dates all three).

1. **Lesson-complete overlay** — a stage overlay (module name in teal + "Lesson Complete" + lesson title + a
   check in a glowing ring) revealed WITH the OSRS quest-complete fanfare so the end of a lesson is visually
   unmistakable. `renderer.js`: `_showComplete()`/`_hideComplete()` + `ICON_CHECK`; triggered from
   `_playQuestComplete` (so it's gated to the same audio-played-through condition as the sound), auto-fades
   after 4.2s, `pointer-events:none` (nav stays clickable), dismissed on any `go()`. Engine passes
   `moduleName: chapter.module` into the player opts. CSS `.ltp2-complete*` in `player.css` (scale/fade-in,
   `prefers-reduced-motion` → crossfade). Not childish: clean teal/gold reveal, no confetti (per PRODUCT.md).
2. **Community page overhaul** (`lt-community.js`) — rebuilt to fit the site: removed the absolute-ban
   side-stripe (`.cm-about` border-left), removed the 6 tracked-uppercase eyebrows (`cm-section-label` /
   hero eyebrow) → clean sentence-case headings with a small teal tick, and calmed the three loud platform-
   brand gradient cards into ONE cohesive `.cm-feature` component (site surface + hairline border; the
   platform colour lives only on the icon + CTA via a per-card `--pc` var). Added a hero trust strip
   (Free · No account · ~9,000 Discord). BloFin wordmark chip sizes to the logo (was overflowing a 54px square).
3. **Landing (`index.html`)** — the hero "number logo" (digit-grid candlestick mark) used
   `transform:scaleX(1.667)` + a `scale(0.5)` mobile hack that doesn't reflow the box → it overflowed its
   column even on desktop (943px in a 566px column) and broke on phones. Fixed properly: cell aspect corrected
   with `line-height:0.6` (not a transform) + a fluid `font-size:clamp(2px,0.3vw,3.7px)` so the grid AND its
   layout box scale — now fits the column on desktop and ~343px (no page overflow) at 375px. Also removed the
   4 repeated section `.kicker` eyebrows (AI-grammar tell) for confident standalone headings; kept the single
   hero gradient phrase + hero pill as deliberate Vice-Terminal brand moments.

## Latest session (2026-06-17, later¹⁰) — UX/UI senior-designer pass: unified Vice-Terminal data-viz palette + legibility

Ran the `impeccable` skill (register: product) over the chart system, combining design-director + trading
lenses. Backup: `Backup-2026-06-17_1631-viz-palette/`. Cache: **`lt-engine.js 3.105.0`, `lt-data.js 1.9.3`,
`lt-data-course2.js 1.9.0`, `lt-data-course3.js 1.10.0`, `lt-data-course4.js 1.15.0`**. Verified: 182/182
candlestick charts build with 0 errors; full palette renders + distinguishable; desktop + mobile clean; 0
console errors. (Detector's only hit — "single font" — is a FALSE POSITIVE: JetBrains/IBM Plex Mono is the
deliberate terminal-native brand voice; the product register endorses one family.)

- **Headline finding + fix — the data-viz palette was fragmented.** Down-candles are brand pink `#ff2e88`
  (`--bear`) but every resistance/short/stop annotation used an off-brand muddy red `#cc2222` (137×) +
  `rgba(204,34,34)` zone fills (41×); "bullish/positive" was variously teal `#00d4d4`, green `#28c878`, and
  `40,200,120`. Unified the WHOLE system to one trading language via a new engine `VIZ` palette:
  **teal = bull/buy/support/bid · pink = bear/sell/resistance/ask/short · gold `#ffcc00` = liquidation ·
  amber `255,190,40` = heatmap · warm-gold `#e7b53a` = neutral magnitude lines (OI, CVD).** Swept all four
  data files (`#cc2222`→`#ff2e88`, `rgba(204,34,34,…)`→`rgba(255,46,136,…)`) and pointed every engine helper
  (delta bars, funding/basis, order-book bid/ask, volume up/down, RSI 70/30 bands) at `VIZ`.
- **Deliberate exception:** the **Ichimoku cloud stays green/red** — universal Ichimoku convention AND it
  keeps the cloud visually distinct from the teal/pink candles (a teal cloud behind teal candles would blend).
- **Legibility:** new `_pillText(hex)` makes every colour-coded price-tag pill contrast-aware — **white text on
  the brand pink** (was near-black-on-pink mud), dark on teal/gold. Applied to markLine pills (both the normal
  and teaching-reveal paths) and the liqCluster label. Sub-panel y-axis ticks bumped to 9px `--text2` (was
  8.5px `--text3`) to match the price axis; funding/basis sign-hint shortened (`−=shorts pay` /
  `−=backwardation`) so it can't overflow the narrow panel.

## Latest session (2026-06-17, later⁹) — Trader-audit fixes: volume panel, real CVD, sub-panel units, E2E redesign, directional context

Acted on a leaderboard-trader audit of the charts. Backup before edits: `Backup-2026-06-17_1602-audit-fixes/`.
Cache: **`lt-engine.js 3.104.0`, `lt-data-course2.js 1.8.0`, `lt-data-course4.js 1.14.1`** (chartgen still 1.1.0).
Verified in Claude Preview: 56-chart regression sweep builds with 0 errors; E2E now closes inside the cloud
(measured); desktop + mobile clean; 0 console errors throughout.

1. **Volume panel (was totally absent on ECharts charts).** New `_applyVolumePanel` + `_synthVolume` (range/body
   volume, up=teal / down=red bars, avg-volume reference line, profiles `'declining'`/`'rising'`/`'pattern'`).
   Wired via `def.volume = true | {profile,breakIndex,spikes}` AND the previously-dead `indicator:'volume'`
   (FSVZO C4 ch15 now draws volume). Applied to **C2 ch6–9** (Volume Analysis/Examples → declining/pattern;
   Classical Patterns → pattern; intro+lesson+scen each, chartHeight 440).
2. **"Cumulative Delta" fixed.** `_applyActivityPanel` rewritten: a per-bar delta HISTOGRAM (volume × close-
   location-in-range — close@high=buy teal / close@low=sell red, sign-coloured via visualMap on a BAR) PLUS the
   CVD **line** on top (gold, no visualMap → no crash). Real order-flow read, not a body-sum drawn as bars.
3. **Edge-to-Edge actually shows E2E now.** Was 36/36 bars ABOVE the cloud. Redesigned C4 ch27 intro/lesson/scen
   candle paths (rally → consolidate → PULLBACK that closes inside the computed Kumo → travel to opposite edge),
   tuned + verified against the live cloud (intro/lesson 1 inside bar at the entry; scen 4 inside bars). Added
   `indicator:'ichimoku'` to the scen so it draws the real cloud; markLines/markPoints repointed to the entry.
4. **Sub-panels got scale + units + a sign hint.** Shared `_subPanelGrids` now shows a y-axis (ticks + faint
   gridlines) with kind-aware formatters: funding `-0.08%`, basis `-$700`, OI/delta/volume compact (`1.2k`).
   Funding/basis panels carry a directional hint in the zero-line label (`− = shorts pay (squeeze fuel)` /
   `− = backwardation`) so red bars aren't misread as bearish.
5. **Context lead-in/follow-through is now DIRECTIONAL** (`_genApproach`/`_genTrail` infer the setup's own
   slope): a chart that drops into support gets a prior downtrend lead-in; one that rises into resistance gets a
   prior uptrend; the trail continues the last move then settles. Kills the old one-shape "bump up into start"
   template. (Pin crowding: the `_deconflictMarkLabels` vertical-stacking pass already separates dense clusters;
   directional context also varies layouts — left as-is, functioning.)

Audit strengths confirmed (unchanged): v2 lesson math is correct (Ichimoku displacement/Chikou, Wilder RSI,
declining-then-spike volume), hollow-up/filled-down candles, decision/reveal UX, liq-cluster sides.

## Latest session (2026-06-17, later⁸) — Chart REALISM: richer ltCandles + lead-in/follow-through context

Owner: "all charts/intros/scenarios would benefit from more context — they're too textbook-perfect. Maybe use
real historical data so the PA looks realistic." After auditing: the 264 course charts (+ exam charts) are all
synthetic via `ltCandles`, with **every annotation hand-coupled** to those candles (prices + bar indices). Real
OHLC exists ONLY via the runtime gallery fetch (`fetchBinanceCandles`). Owner chose (confirmed): **upgrade the
synthetic generator** (real OHLC would break every hand-tuned level/pin and can't carry funding/OI/delta) +
**generous context (~+16 bars)**. Backup: `Backup-2026-06-17_1536-realism/`. Cache: **`lt-chartgen.js 1.1.0`,
`lt-engine.js 3.103.0`**. Verified in Claude Preview: 107/107 candlestick charts build with 0 errors, 0
out-of-range indices, real render pipeline + scenario reveal + mobile all clean (0 console errors).

- **`ltCandles` rewritten for realistic PA** (`lt-chartgen.js 1.1.0`) — same API/legs/seed. Now: counter-trend
  candles INSIDE a leg (jitter can flip a bar against the trend), varied body + wick sizes, occasional long
  wicks (12%), and a random-walking **volatility-clustering** state (calm vs choppy stretches). Crucially it
  **preserves the teaching structure**: each leg still lands EXACTLY on its `to`, closes are clamped to the leg
  envelope (±0.6·typical) so swing levels + annotated prices stay put, flat legs get a price-scaled `minTypical`
  so consolidations aren't dead-flat, and it's still fully deterministic per seed. (Verified: leg endpoints
  exact, 0 invalid OHLC, ~8 counter-trend candles per 14, envelope stable.)
- **Lead-in + follow-through CONTEXT** (`lt-engine.js 3.103.0`, `_expandAllChartContext` + `_expandChartDef` /
  `_genApproach` / `_genTrail` / `_ctxSeed`). Runs ONCE at boot (top of `DOMContentLoaded`), mutating each stored
  chart def in place: prepends **`_CTX_LEAD=10`** approach bars (last close == the chart's first open) + appends
  **`_CTX_TRAIL=6`** follow-through bars (from the last close), both via the realistic `ltCandles`, bounded to
  ~±10% of the chart's price range so the y-axis/levels don't shift. Index-based annotations are shifted by the
  lead count: `cutIndex`, `markPoints`, sibling `quiz.revealMarkPoints` (and exam `q.revealMarkPoints`), and
  `subPanel.points`. Price-based annotations (`markLines`/`liqCluster`/`heatmap`) are untouched. Context bars get
  blank x-labels so meaningful original labels (e.g. course-1 hardcoded `D#`, month/seasonality) survive.
  Charts go from ~14–18 → ~30–36 bars. Idempotent (`__ctx` guard) so re-renders/navigation never re-expand.
- **Why boot-time def mutation (not a render wrapper):** the scenario reveal reads `chapter.quiz.chart` +
  `chapter.quiz.revealMarkPoints` from several functions (`_renderQuizSim`, `_animateSyntheticReveal`,
  `revealChart`); mutating the stored def once makes every path consistent with no per-render cloning. Line/
  concept charts (no `ohlc`) are skipped. **The real-data gallery is untouched** — it builds defs from fetched
  candles, never from the stored synthetic defs.
- **Note:** the cumulative-delta sub-panel is still a bar histogram (the `later⁷` ECharts line+visualMap fix).
  If the bar look isn't preferred, the alternative is two masked teal/red line series (no visualMap).

## Latest session (2026-06-17, later⁷) — Hyblock tool VISUALIZATIONS: FULL rollout (Courses 3 & 4) + delta-panel bugfix

Completed the whole remaining sweep the `later⁶` entry queued (owner: "I want everything"). Backup before edits:
`Backup-2026-06-17_1347-toolviz/`. Verified in the Claude Preview: a 43-chart render harness (every touched
chart, both reveal + non-reveal) = **0 errors**; spot-checked the live UI (delta panel pixel-sampled red/teal,
order-book + liqCluster options read back from `echarts.getInstanceByDom`). Cache bumped: **`lt-engine.js 3.102.2`,
`lt-data-course4.js 1.13.0`, `lt-data-course3.js 1.9.0`** (all in `lt-index.html`).

- **🐛 Pre-existing bug fixed — `_applyActivityPanel` (delta sub-panel) threw on render.** It drew cumulative
  delta as a `line` series coloured by a piecewise `visualMap` — and **piecewise visualMap on a `line` series
  throws "Cannot read properties of undefined (reading 'coord')"** in this ECharts build (bars are fine).
  This had been silently breaking the 3 charts `later⁶` called "done + verified" (ch18 Platform Overview, ch23
  Trading Activity — both carry `tradingActivity`). Fix: render the delta as a **sign-coloured bar histogram**
  (red <0 sellers / teal ≥0 buyers), same proven path as the new funding/basis bars. All delta charts work now.
- **NEW engine helper `_applySubPanel(opt, def, ctx)`** (mirrors `_applyActivityPanel`) for the tools with no
  price-derivable series. `def.subPanel = { kind:'funding'|'basis'|'oi', points:[[barIdx,val],...], label?, color?,
  posColor?, negColor? }`. `_interpSeries` linearly interpolates the authored control points to the candle count
  (flat-hold before first / after last) so each def stays tiny + length-agnostic. funding/basis → sign-coloured
  **bar** histogram + zero line; oi → a single amber **line+area** (the shape is the signal). Wired in
  `buildCandlestickOption` via `if (def.subPanel)`.
- **NEW engine helper `_applyOrderBook(opt, def)`** — order-book depth ladder. `def.orderBook = { bids:[{price,size}],
  asks:[{price,size}], bidLabel?, askLabel?, bidColor?, askColor? }`. Green resting-bid rungs + red resting-ask
  rungs; rung width/opacity ∝ size; the heaviest rung per side is solid + labelled the "wall"; faint colour-matched
  band per side. A distinct visual language from the amber heatmap + gold liq ladder. Wired via `if (def.orderBook)`.
- **`_applyLiqCluster` enhanced** — the faint band behind the rungs now follows `lc.color` (new `_hexToRgb`) instead
  of being hardcoded gold, so red/teal liquidity pools stay semantically coloured; the cluster label pill text is
  now contrast-aware (`_lum > 140 ? dark : white` → dark on gold/teal, white on red). Gold charts unchanged.
- **Course 4 data (`1.13.0`):**
  1. **Delta panels** (`tradingActivity:true`): ch5 Who-Is-In-Control, ch6 Sentiment Vars, ch9 Cumulative Delta —
     intro + lesson + scenario each (chartHeight 460; pins repointed onto the Δ panel).
  2. **Funding/basis/OI panels** (`subPanel`): ch7 Funding Rate, ch10 Futures Basis (intro+lesson+scen each);
     **ch8 Open Interest** (owner opted to include it — OI line on intro+lesson+scen); ch11 Applying Sentiment
     (intro+lesson; its scenario is `hideChart:true` → skipped).
  3. **Amber heatmaps** (`"255,190,40"`): ch21 Positions Heatmap scenario; ch22 Combining Sentiment intro
     (short cluster) + lesson (long+short two-band) + scenario.
  4. **Flat gold band → dashed `liqCluster` ladder:** ch19 Liquidation Levels + ch20 Liq Scenario (intro+lesson+scen,
     keeping the teal DBS / red SSR markLines alongside); ch1 (intro gold pool, scen stop cluster), ch2 (intro teal
     long pool, lesson+scen red short-stop SFP cluster), ch4 intro (teal equal-lows stop cluster). ch4 lesson/scen
     were left as plain Range-Low reference lines (no band to upgrade; a single-wick pool isn't a multi-rung ladder).
- **Course 3 data (`1.9.0`):** ch3 Order Book intro → two-sided `orderBook` (bid wall below / ask wall above);
  ch11 DBS/SSR intro → bids-only `orderBook` laddered into the DBS (heaviest at the upper limit = aggressive entry).
  ch3's scenario quiz is `hideChart:true` (skipped). Single-liq-level charts ch8/ch9/ch20 already have markLines — left.

## Latest session (2026-06-17, later⁶) — Hyblock tool VISUALIZATIONS (liq levels / heatmap / trading activity)

Owner: the confluence charts NAME the three tools (Liq Levels, Heatmap, Trading Activity) in text pins but
don't DRAW them. Added engine rendering for all three (`lt-engine.js?v=3.101.9`), applied to the Trading
Activity intro chart first (owner chose "this chart, then roll out"). 0 errors; verified full-width.
- `_applyLiqCluster(opt, def)` — `def.liqCluster:{lines:[],label,color}` → dashed gold liquidation rungs +
  a faint gold cluster BAND (the squeeze magnet). Only the top rung is labelled (avoids pill pile-up).
- `_applyHeatmap(opt, def)` — `def.heatmap:[{center,halfHeight,color:'r,g,b',peak,cells,label}]` → stacked
  markArea cells whose opacity peaks at the densest price and fades (a real gradient heatmap, owner's choice).
- `_applyActivityPanel(opt, def, ctx)` + `_computeCumDelta` — `def.tradingActivity:true` → a cumulative-delta
  sub-panel (2nd grid) coloured by sign via visualMap (red <0 sellers / teal ≥0 buyers) + zero line + area.
- Wired in `buildCandlestickOption` after `_applyIndicatorOverlay` (gated on the def flags). Data: the
  `Trading Activity` introChart (course4 ch23, `lt-data-course4.js?v=1.9.0`) now carries `liqCluster` +
  `heatmap` + `tradingActivity` + `chartHeight:460`, and its 3 text pins were repointed onto the visuals.
- **Rollout (in progress).** Applied the tool visuals to: **Trading Activity** intro (ch23 idx), **Hyblock
  Platform Overview** intro (ch18 idx — long cluster: green heatmap + gold liq band + Δ panel), **Positions
  Heatmap** intro (ch21 idx — flat gold band upgraded to a gradient heatmap). `lt-data-course4.js?v=1.12.0`.
  All verified, 0 errors. **Heatmap colour: owner chose Hyblock AMBER `"255,190,40"`** (matches the lesson's
  "bright yellow = dense"); the 3 done charts were switched green/magenta → amber. Use amber for ALL future
  heatmaps. (On dual-tool charts the amber heatmap + gold liq band are close in hue — consider a dashed
  `liqCluster` ladder for the liq so it stays visually distinct.)
- **Refined finding:** the audit over-counted. Most LIQ charts (ch19 Liquidation Levels, ch20 Liq Scenario)
  ALREADY draw a gold liq band + markLine, so they convey the tool (could be upgraded to a `liqCluster`
  ladder for consistency, but not broken). The genuinely-missing visuals are:
  1. the SENTIMENT sub-panel charts (Funding ch7, Cumulative Delta ch9, Futures Basis ch10, Sentiment Vars
     ch6, Applying Sentiment ch11) — their ECharts intro/scenario draw NOTHING for the tool (the v2 lessons
     do). Need a delta panel (have it) + a NEW funding/basis sub-panel helper.
  2. a couple of short-cluster heatmap SCENARIO charts (ch21/ch22).
  3. Course-3 order-book bid/ask zones (ch3, ch11) — a different viz; single liq-level charts (ch8/ch9/ch20)
     mostly already have markLines.

## Latest session (2026-06-17, later⁵) — Ichimoku "step" experiment → REVERTED to angular polylines

Owner said the Ichimoku lines looked "too fluid"; wanted angular/rigid lines. First attempt rendered the
midpoint components as STEP lines (staircase) — WRONG (owner: "dropped the ball"; shared a real TradingView
Ichimoku screenshot showing the lines are clean **angular polylines** — straight segments + sharp corners +
natural flat plateaus, NOT a staircase). **Reverted** the step rendering in all three files back to
`smooth:false` polylines / sloped cloud (`lt-engine.js?v=3.101.5`, `lessons-v2/renderer.js?v=1.13.0`,
`lessons-v2/chart-vocabulary.js?v=1.3.0`). 0 errors; verified ECharts intro + v2 lesson — back to polylines.
- **Realistic history-based cloud (owner: "needs more price action… cloud based on 60-120 periods prior").
  v2 lesson DONE** (`lessons-v2/chart-vocabulary.js?v=1.5.0`): the `ichimoku` move now generates a LONG
  ~110-bar price history (accumulation → trends → correction → recovery → pullback), computes the full
  Ichimoku on ALL of it with crypto settings (conv 10 / base 30 / span 60 / disp 30), then slices to a
  44-bar DISPLAY window. So the cloud at the left edge reflects ~60 bars of OFF-SCREEN data — varied
  thickness (thin pocket ~1.7 → thick wall ~9.9), flat Senkou-B plateaus, angular Tenkan/Kijun. The helper
  `ichimoku(cs,p)` is unchanged; the move slices `ik.*.slice(start)` (spanA/B keep the +disp leading tail).
  Anchors window-relative (`pullback` i:35/price 75, `aboveCloud` price 104). Chikou only spans the left
  ~14 slots (authentic: close shifted back 30).
- **Mature cloud everywhere — DONE (ECharts intro + scenario, all courses).** Rather than reshape each
  chart's candle array, the engine now PREPENDS synthesized off-screen history (`_synthIchiLookback`):
  `_applyIchimokuOverlay` computes the Ichimoku on `history.concat(displayed)` then slices back to the
  displayed window — so every cloud is mature (formed from the left, varied thickness) without touching the
  visible candles or annotations, and (periods unchanged) every chart-specific setup still holds. Verified:
  C2 ch11 scenario cloud 22/22 slots (was right-half only), C4 C-Clamp cloud matured + Tenkan-below-Kijun
  still −8.6, C4 Kijun-bounce 28/28 + setup intact. Opt out per chart with `def.ichiLookback:false`.
- **Glossary Ichimoku figure — DONE** (`lt-glossary.js?v=1.19.0`): `GL_FIGURES['ichimoku']` redrawn as an
  angular mini-Ichimoku (stepped gold Kijun, reactive teal Tenkan, varied green Kumo w/ red Senkou-B edge).
- **Scenario UI de-stretched — DONE** (`chartCardHtml` max-width 960→720): the scenario/intro chart was
  846×350 (2.42:1, 14 candles 60px apart, looked stretched) → now ~718-wide, centered.
- **Still open:** the 2 Edge-to-Edge charts (C4 ch27/28) render a mature cloud now but price still sits
  ABOVE it (the literal "close INSIDE the Kumo" E2E geometry needs a candle-path redesign — pre-existing TODO).

## Latest session (2026-06-17, later⁴) — ECharts markPoint label de-collision (intro + scenario charts)

The Ichimoku/E2E intro charts pile callout labels on top of each other (worst: E2E's 4 prereqs at one
entry). ECharts has no real collision-avoidance for markPoint labels (native `labelLayout.moveOverlap`
barely helped on dense clusters). Added `_deconflictMarkLabels(elId)` (`lt-engine.js?v=3.101.2`): a
pixel-based pass (same idea as the v2 canvas) — measures each label, and within its side (above/below the
candles) pushes overlapping ones outward until they clear, applied via each label's `offset`. Recomputed
from the nominal position each call (idempotent), wired into `renderChart` (after layout + on resize) and
the reveal-animation completion. 0 errors; verified E2E intro (clean ladder now), C-Clamp, E2E Live
Examples, a scenario (reveal path), and mobile.

- **Legible callout text** (`lt-engine.js?v=3.101.3`): the bearish-red (#cc2222) markPoint label text was
  muddy/illegible on the dark pill. New `_legibleOnDark(hex)` keeps the hue but blends a too-dark colour
  toward white until it clears a luminance floor (red → light coral); already-light colours (teal/gold)
  pass through. Applied to the markPoint label text only (the pin keeps the true semantic colour); pill
  opacity nudged 0.7 → 0.82. General across all charts.

## Latest session (2026-06-17, later³) — SCENARIO/INTRO ECharts: faithful Ichimoku + real RSI sub-panel

Extended the full-faithful treatment to the **ECharts** charts (the Scenario quizzes + the Introduction
charts), which are a SEPARATE renderer from the v2 canvas lessons. `lt-engine.js?v=3.101.1`. 0 console
errors; verified every Ichimoku chart (Courses 2 & 4, intro + scenario incl. the reveal animation) and
both RSI charts, desktop. Backup before edits: `Backup-2026-06-17_1036-scenarios/`.

- **Audit finding:** only 1 of 7 Ichimoku charts (C2 ch11 intro) actually rendered indicator series; the
  other 6 carried `indicator:'ichimoku'` with NO data — Ichimoku was implied only by hand-placed STATIC
  horizontal `markLine`s ("Kijun-sen") + `markArea` "Kumo" bands + annotations. The 2 `rsi_zones` charts
  shaded overbought/oversold PRICE bands (not a real oscillator).
- **Faithful Ichimoku, computed from the candles** (`_computeIchimoku`, mirrors the v2 `ichimoku()`):
  Tenkan/Kijun/Senkou-B = period (high+low)/2; Senkou-A = (T+K)/2; **Senkou A/B forward-displaced** (leading
  Kumo into extended x-axis slots); **Chikou** (close shifted back). Rewrote `_applyIchimokuOverlay` to draw
  it: green/red cloud (by net bias) + faint Senkou edges, Chikou (purple), Tenkan (blue), Kijun (yellow) —
  matching the lessons. The overlay also **extends `opt.xAxis.data` by `disp` blank slots** for the leading
  cloud, and **strips the now-redundant static stand-ins** (full-cloud "Kumo" markAreas — keeps "Kumo
  pocket" highlights; flat "Kijun-sen"/"Tenkan-sen" markLines — keeps trade-level lines like "Cloud Bottom
  Edge (E2E Entry)"). Per-chart period override via `def.ichi`.
- **The teaching candles mostly already produce their setup under real math** — verified the computed
  indicator genuinely shows: C2 ch11 bullish config, **Kijun bounce** (ch25: price reverts to the computed
  Kijun), **C-Clamp** (ch26: Tenkan dips below Kijun then converges), and the 2 C2 scenarios. So NO candle
  redesign was needed for 5 of 7.
- **Real RSI sub-panel** (`_applyRsiPanel` + `_computeRSI`, Wilder period 6): converts the old `rsi_zones`
  price-shading into a genuine RSI oscillator in a second ECharts grid below price, with 30/70 bands.
  `indicator:'rsi_zones'` now routes to it (legacy `_applyRsiZonesOverlay` retired). Verified on C2 ch13
  (Oscillators) + C4 ch14 (Heuristics) — Heuristics' own MA-channel markArea is preserved.
- **⚠ Still TODO — the 2 Edge-to-Edge charts (C4 ch27 + ch28):** they now render a faithful Ichimoku, but
  their candle paths put price ABOVE the computed cloud, so the literal E2E setup ("strong close INSIDE the
  Kumo, then travel to the opposite edge") isn't shown. These specifically need a candle-data REDESIGN so the
  displaced cloud straddles the entry (a consolidation that forms the cloud, then price pulls back into it).
  Everything else (engine infra + the other 5 ichimoku + both RSI) is done & verified.
- Out of scope (noted): `indicator:'volume'` (C4 FSVZO ch15/16) has no overlay case in `_applyIndicatorOverlay`
  (always was a no-op) — the FSVZO oscillator only exists in the v2 lesson, not the ECharts intro chart.

## Latest session (2026-06-17, later²) — CHART ACCURACY (full-faithful) + SNAPPIER ANIMS + COMPACT PLAYER BAR

Big autonomous pass (owner: "make all charts full faithful in accuracy… player feels sluggish + the
bottom is fat — make it compact/clean"). Cache: `lessons-v2/chart-vocabulary.js?v=1.1.0` +
`lessons-v2/renderer.js?v=1.11.2` + `lessons-v2/player.css?v=1.7.2`. 0 console errors; verified Ichimoku,
RSI/divergence, funding-rate histogram, concept/chart/candle beats, desktop + mobile, speed/volume/seg-jump.
Backup before edits: `Backup-2026-06-17_0238-accuracy-player/`. NOT committed (OpenClaw deploys the tree).

- **Full accuracy audit of the chart vocabulary first.** Most of it was already textbook-correct (engulfing
  bodies truly engulf; morning/evening star close past the first body's midpoint; H&S uses the correct
  measured-move target 32/68; wedges/triangles converge + break the right way; Fibonacci levels are exact;
  classical declining-then-spike volume). Two genuine gaps + one rendering bug found and fixed:
- **Ichimoku — now faithful.** The `ichimoku()` helper rewrite: Senkou A/B are **forward-displaced by the
  base period** (the leading Kumo cloud projected into open space on the right — the signature future-S/R
  look), a **Chikou lagging span** (close shifted back) was added (purple overlay), and the periods moved
  toward truer ratios (`conv 4 / base 9 / span 18 / disp 9`, expanding windows so the cloud forms from the
  left). New price path: pullback taps the Kijun (~idx 11) and bounces, runs above a green cloud (preserves
  the `pullback` + `aboveCloud` anchors the 7 ichimoku lessons use → no lesson edits). Renderer: `_plot`
  reserves `geom.lead` blank slots on the right (candles narrow slightly); `_drawCloud` iterates the
  displaced arrays, reveals leading slots with the last candle, and now also draws faint Senkou A/B edge
  lines.
- **RSI — now a REAL computed oscillator.** New `rsiOf(cs,p)` (Wilder's RSI, period 6) replaces the
  hand-written series. The price path is a fading-momentum top tuned (verified in Node) so the bearish
  divergence falls out of the math: high1 RSI ≈ 80 (overbought) → marginal higher-high high2 RSI ≈ 69
  (lower high, never reclaims 70). Anchors high1/high2/oversold preserved for the 2 RSI lessons.
- **🐛 Sub-panel rendering bug (fixed) — affected EVERY oscillator panel.** In `_plot`, the sub-panel's
  `sy()` closure captured `y1` by reference, but `y1` is reassigned to `subTop-gap` right after — so RSI /
  funding / open-interest / cumulative-delta / basis / FSVZO were all squished into a ~16px sliver near the
  panel top and rendered nearly flat. Captured the panel bottom in a stable `subBot` local → all oscillator
  lines/histograms now span the full sub-panel (verified by canvas pixel-sampling: RSI peaks land where the
  math says; funding histogram climbs into the positive extreme then flips red below zero).
- **Snappier animations (renderer + player.css).** Reveal constants tightened (`CANDLE_MS 240→190`,
  `STAGGER 42→30`, `ANNO_MS 440→320`, `ANNO_DELAY 140→80`) + a new `REVEAL_TAIL_MAX=560` cap so a 30-candle
  chart draws in as briskly as a 10-candle one (annotations no longer wait on a long candle tail). Concept
  lines cascade faster (`220+i·420` → `110+i·165` ms). Panel/heading/line fades moved off the weak built-in
  `ease` onto the site's `--ease-out` with shorter durations. (Narration audio still paces a *playing*
  lesson; these govern the draw-in + manual-nav feel.)
- **Compact single-bar player footer.** The two stacked control rows (position + transport, ~120px on
  desktop) merged into ONE `.ltp2-bar`: icon transport (‹ · ▶ Play · ›) left, segmented progress filling
  the middle, counter + speed + volume right (≈61px — roughly half). `_build` rewritten (new `.ltp2-transport`
  group, `ICON_PREV`/`ICON_NEXT` chevrons, `.ltp2-btn-icon`); removed `.ltp2-seg`/`.ltp2-controls` rules.
  **Mobile** (`≤560px`) keeps the liked layout via `flex-wrap`: progress + chips on top, three thumb-sized
  (44px) transport buttons on the row below.

## Latest session (2026-06-17, later) — Module-banner volume glyph removed + YouTube link scoped to the Lesson

Two small UI cleanups (owner request). `lt-engine.js?v=3.100.5` + `lt-styles.css?v=1.98.3`. 0 console
errors; verified the Introduction (no icon, no YouTube link) and the Lesson (no icon, link kept) via the
real `goToStep` flow.

- **Removed the top-right "narrated lesson" volume glyph** from the module banner — redundant now that
  every lesson is narrated. Dropped the `audio` param + `audioMark` from `moduleBannerHtml` (and the `true`
  arg in `renderV2Lesson`), and deleted the now-dead `.module-banner-audio` CSS.
- **"Watch original on YouTube ↗" now shows on the Lesson step only**, not the Introduction. `renderIntro`
  no longer passes `chapter.videoUrl` into `chartCardHtml`/`conceptCardHtml`; the Lesson step keeps its own
  `_watchOriginalHtml` call (the Scenario chart never passed a videoUrl, so it's unaffected).

## Latest session (2026-06-17) — LESSON NARRATION: Kokoro TTS audio + speed/volume/karaoke + quest-complete

Big one. v2 lessons are now **narrated** with pre-generated audio (the user rejected browser Web
Speech as "horrible"). Cache: `renderer.js?v=1.10.0` + `player.css?v=1.7.0` + `lt-engine.js?v=3.100.4`
+ `lt-settings.js?v=1.29.0` + NEW `lessons-v2/audio/manifest.js?v=1.1.0`. 0 errors; verified all 4
courses, desktop + mobile. Backup (code only): `Backup-2026-06-17_0215-tts/`.

- **Engine = Kokoro (open-source, voice `af_heart`), same as v1.** Set up in an isolated **Python 3.12
  venv via `uv`** (`tools/tts/.venv`, ~750MB torch — this box's Python 3.14 is too new for Kokoro;
  `brew install uv espeak-ng` first). Pipeline: `tools/tts/extract.mjs` (Node, dumps every beat's `say`
  → `beats.json`) → `tools/tts/generate.py` (Kokoro → mp3 + per-word timings). **Eventually swappable
  for ElevenLabs** — just change the synth call in generate.py.
- **Per-lesson files + SELECTIVE REGEN** (the explicit ask): `lessons-v2/audio/<lessonId>/<NN>.mp3` +
  `timings.json`. Change one lesson's dialogue → `source tools/tts/.venv/bin/activate && python
  tools/tts/generate.py course1/05_trending_markets` rebuilds ONLY that folder. No args = all missing
  (resumable); `--force` = all. **397 clips, 84 lessons, ~96MB** (96k mp3). `manifest.js`
  (`window.LT_AUDIO_MANIFEST = {lessonId: beatCount}`) gates which lessons get audio so the player never
  requests missing clips; loaded by lt-index.html before the engine.
- **Player (renderer.js):** `_cueAudio` plays the beat's mp3 (volume + playbackRate + preservesPitch),
  advances on `ended`; missing/error → silent text-dwell fallback. Engine passes `audioBase` only when
  the lesson is in the manifest. Settings: **Lesson Narration On/Off** (`lt_narration`, default on).
- **Speed** (`lt_lesson_speed`, 0.75/1/1.25/1.5/2×) — a **timer-icon chip** opening a popover; scales
  BOTH audio `playbackRate` AND every animation (candle/anno reveal, concept-line stagger, dwell — via
  `this._speed`). **Volume** (`lt_lesson_volume`) — speaker chip; the slider is **hidden until hover**
  (desktop) / tap (`.open`, touch via `_noHover`). Both live in the position row (transport row stays
  Back/Play/Next).
- **Karaoke captions:** Kokoro emits per-word `start_ts/end_ts` → `timings.json`. `_setCaption` renders
  the caption as `.ltp2-w` word spans (when timings exist); a rAF synced to `audio.currentTime` lights
  the spoken word (`.on`, teal) — accurate at any speed. No timings → plain `fmt()` caption.
- **Quest-complete fanfare:** 3 OSRS mp3s in `lessons-v2/audio/_fx/quest-{1,2,3}.mp3` (128k). One plays
  at random when the **final beat's narration audio ENDS** (`_playQuestComplete` in `_cueAudio`'s advance)
  — i.e. ONLY if the learner pressed Play + listened through (gated to the audio path + `volume>0`);
  manual click-through / muted / narration-off → no fanfare.
- **Deploy:** `lessons-v2/audio/**` ships (mp3 + timings + manifest + _fx). `.vercelignore`/`.gitignore`
  exclude `tools/tts/.venv` (+ scratch). ~486 audio files / 96MB — fine for Vercel static/CDN + file
  count, but it's real deploy weight; drop the 96k bitrate if it ever needs to be lighter.

## Latest session (2026-06-16, later¹⁵) — Lesson player transport: roomier on desktop

User: the new player controls are nice on mobile but cramped on laptop/desktop. Added a
`@media (min-width: 561px)` comfort block to `player.css` (mobile ≤560px left exactly as-is):
bigger transport buttons (`padding 11px 24px`, `min-width 112/128`, ~42px tall), more gap (16px),
more breathing room between the segmented bar and the buttons (seg `14px 22px 5px` / controls
`14px 18px 18px`), seg hit-area 18px + 6px segment gap. `player.css?v=1.5.1`. 0 errors; verified
desktop (roomier) + mobile (unchanged: 44px fill, 22px segments).

## Latest session (2026-06-16, later¹⁴) — Audio-lesson marker on the module banner

Added a **subtle sound glyph** (`volume-2`, faded accent, opacity 0.5, right-aligned) to the module
banner to mark a narrated lesson. Shown on the **Lesson step only** (the animated player) via a new
optional `audio` flag on `moduleBannerHtml(chapter, audio)` — `renderV2Lesson` passes `true`; the
Introduction's banner stays unmarked. `.module-banner-audio` in `lt-styles.css`. `lt-engine.js?v=3.100.2`
+ `lt-styles.css?v=1.98.2`. 0 errors; verified desktop + mobile. (Lessons are still silent — this is the
indicator/affordance; the `_cueAudio` TTS hook remains the path to real audio.)

## Latest session (2026-06-16, later¹³) — Lesson player chrome: declutter + mobile fix (impeccable polish)

User: the lesson player's bottom chrome is cluttered/clunky, worse on mobile. Ran an `impeccable polish`
pass (product register). `renderer.js?v=1.6.0` + `player.css?v=1.5.0`. 0 errors; verified desktop + mobile.

- **Audit:** three redundant position cues (thin progress strip + `2/6` counter + 6 beat-dots) = the
  "cluttered data-overload" PRODUCT.md bans; three stacked bg/divider bars; dot ring-noise; and on mobile
  the Back/Play/Next buttons **wrapped their own glyphs** into two lines (dots were hidden, so mobile also
  lost jump-to-beat).
- **Fix — folded the three position cues into ONE segmented progress bar.** `.ltp2-seg` = one
  `.ltp2-seg-item` per beat (`done`/`cur`/`future` states; current glows), **click-to-jump**, in a
  dedicated "position row" with a compact `.ltp2-counter`. Removed `.ltp2-progress`/`progFill` + the
  `.ltp2-dots`/`.ltp2-dot` grid entirely (renderer `_setControls` now drives `this.segs`).
- **Unified footer:** the position row + transport row share `--panel` with no divider between them, so
  the footer reads as one block instead of stacked bars. Transport row is a clean centered **Back ·
  Play · Next** (Play is the accent primary); button hover now uses `--accent` (course-themed).
- **Mobile:** buttons `white-space:nowrap`, `flex:1` equal-fill, `min-height:44px` (proper touch
  targets, no wrapping); segments `height:22px` for tapping; the segmented bar + counter are now shown
  on mobile (mobile **gains** jump-to-beat it never had). 44px confirmed.
- Tokenized the two flagged stray hexes → `--tag-concept (#6f6cff)` / `--tag-candle (#ffb454)`.
  The engine-rendered "Watch original on YouTube" link was left as-is (unobtrusive courtesy link).

## Latest session (2026-06-16, later¹²) — Lesson player: drop the in-player "Continue to the quiz" button

User asked to remove the v2 lesson player's end-of-lesson **"Continue to the quiz →"** button and just
show the **"✓ Lesson complete"** badge, right-aligned. Done (`renderer.js?v=1.5.1` + `player.css?v=1.4.1`).
The app's bottom nav **"Next"** is the way forward now (it advances lesson → Scenario as before). 0 errors;
verified desktop + mobile. Removed: the `doneBtn` element/click-listener + its `_setControls` display line
(`opts.onComplete` is now unused but still passed by the engine — harmless); CSS `.ltp2-done-txt` got
`margin-left:auto` and the `.ltp2-done-btn` rules (incl. the mobile full-width one) were deleted.

## Latest session (2026-06-16, later¹¹) — Lesson chart labels: pills + collision-avoidance + hover-pop

Fixed cramped/overlapping marker callouts on the v2 lesson charts (e.g. the "Bullish Structure"
beat's swing high/low · higher high/low). `lessons-v2/renderer.js?v=1.5.0` (canvas-only; no CSS).
0 console errors; verified across chart/candle/concept beats + all four courses.

- **Marker labels now go through a layout pass** (`_drawMarkerLabels`, called at the end of
  `_drawChart`). `_anno`'s marker/note branch no longer draws the text inline — it queues each label
  into `this._mq` (id/text/color/av/anchor/place); the dot still draws in place.
- **Legibility:** every label gets a subtle rounded **pill** (`_roundRect`, `rgba(10,8,18,~0.6)`) so
  text never bleeds into candles (replaces the old halo-only treatment for markers).
- **Collision-avoidance:** labels are grouped above/below, sorted closest-to-candles first, and pushed
  **outward** until they clear all placed rects (x- AND y-overlap test + gap), clamped to the plot.
  Verified: 0 overlaps across real beats; a same-anchor synthetic pair separates by >1 label-height.
- **Hover-pop:** `mousemove`/`mouseleave` on the canvas hit-test the recorded `_labelRects`; the hovered
  label eases up in scale (`_hoverP`, ~0.22 lerp) + brighter pill + colour-tinted border + glow, drawn
  **on top** (z-order). `_setHover` re-`_kick`s the raf loop only during the transition (it had settled);
  `prefers-reduced-motion` snaps instead of easing. Touch (no hover) still gets pills + collision.

## Latest session (2026-06-16, later¹⁰) — SCENARIO + per-module multi-question QUIZ step

Restructured the per-chapter step rail and added the curriculum's **multi-question module quizzes**.
New cache versions: `lt-engine.js?v=3.100.1` + `lt-styles.css?v=1.98.1` + NEW `lt-module-quizzes.js?v=1.0.0`.
0 console errors; verified desktop + mobile across all 4 courses. NOT git-committed (OpenClaw deploys
from the working tree). Backup before changes: `Backup-2026-06-16_2256-quizscenario/`.

- **Results panel adapts to performance (first-try accuracy).** Each question records a first-try miss
  (`prog.moduleQuizWrong`). At completion, `_mqOutcome` → **passed** (≥70% first-try, `MQ_PASS_RATIO`)
  shows Relearn + Retry and **drops "Skip forward"** (the nav "Next Session" covers it); **failed** (too
  many missed) shows a gold "review" panel with **"Relearn the module ·[Suggested]"** (teal-filled +
  `mqPop`/`mqSuggestPulse` attention animation) and **drops "Retry the quiz"** (+ keeps "Skip forward
  anyway"); in-progress shows all three. Retry/Relearn both reset `moduleQuiz` + `moduleQuizWrong`
  (Relearn also resets the quiz so it's fresh on return). `.mq-action--suggested` / `.mq-results--review`
  styles in `lt-styles.css` (reduced-motion disables the pulse).

- **Step model is now chapter-aware (`lt-engine.js`).** The chart "Quiz" was **renamed → "Scenario"**
  (kind `'scenario'`; same single decision-point chart quiz, same `prog.quizCorrect` gate/storage). A NEW
  4th step **"Quiz"** (kind `'quiz'`) holds the module's multi-question **Learning Assessment** and appears
  **only on the FINAL session of each module** (`chapterStepKeys` appends `'quiz'` when
  `chapterHasModuleQuiz` = `moduleQuizFor(ch) && isModuleFinalChapter(ch)`). So most chapters show
  Intro/Lesson/Scenario; each module's last session shows Intro/Lesson/Scenario/**Quiz**. 5 module quizzes
  per course (C1 ch 2,4,6,9,12 · C2 1,3,9,14,15 · C3 6,9,13,16,19 · C4 4,11,17,24,28). "Course Overview/Summary"
  wrapper chapters have no assessment → no Quiz step.
- **All the step math went chapter-aware.** `chapterStepLabels` maps kinds via `KIND_LABEL`; nav `route clamp`
  widened to `s<=3`; chapter **completion now fires on leaving the FINAL step** (was hard-keyed to the quiz
  kind); the **Scenario still gates Next** (must answer correctly), the **module Quiz is ungated** (skip-forward).
  Every former `kind==='quiz'` (scenario) ref updated → `'scenario'` (goToStep, init, boot, updateNavButtons).
- **`renderModuleQuiz` + handlers (`lt-engine.js`).** Renders all questions; **answer-to-reveal w/ retry**
  (wrong shakes + re-enables; right locks green). Types: `tf` (True/False), `mc` (single A–E), `multi`
  (select-all → "Check answer"). Per-question progress in `prog.moduleQuiz = {qIndex:true}`; live score bar.
  **Results panel** (user-chosen) offers **Relearn the module** (`mqRelearnModule` → module's first session),
  **Retry the quiz** (`mqRetryQuiz` → clears `moduleQuiz`), **Skip forward anyway** (`mqSkipForward` →
  `navigate('next')`); turns into "Module complete / Continue" when all correct.
- **Data: NEW `lt-module-quizzes.js`** — `window.LT_MODULE_QUIZZES[course][moduleName] = {title, questions[]}`.
  **20 assessments / 255 questions**, transcribed verbatim from the "TotT Curriculum Layout.pdf". T/F answers
  are the PDF's; MC/select-all answers are the curriculum-correct choices (the PDF's letter markings didn't
  survive extraction). Keyed by the exact `module` strings in the data files. `.mq-*` styles in `lt-styles.css`.
- ⚠️ **Answer spot-check list (a handful used judgment, flag for owner):** C1 M1 Q9 trendline touches (chose **2**);
  C1 M5 Q4 risk/trade (chose **1–5%**) & Q21 Kelly multiplier (chose **20%**); C2 M4 Q7 Ichimoku %-of-trend
  (**75%**) & Q8 "calculates the ___ of the period" (**Mean**); C4 M1 Q4 game theory (**Determine who is in
  control**, since "absolute certainty"/"all of the above" are wrong) & Q16 liquidity structures select-all
  (chose **[access points, engineer liquidity]**, not "100% hit rate"/"all of the above"); C4 M3 Q8 FSVZO
  select-all (chose first three, not "band crosses MA → signal"); C4 M5 Q3 C-clamp strategy (**Mean reversion**).

## Latest session (2026-06-16, later⁹) — Home flowing-gradient bar + glossary→term flash

`lt-styles.css?v=1.97.11` + `lt-engine.js?v=3.99.5` + `lt-glossary.js?v=1.18.5`. 0 errors; verified.
(The glossary flash was then made **persistent** — the arrival pulse settles into a lasting soft
`--teal-dim` highlight (`.lt-gl-flash`) that stays until you leave the chapter, instead of fading out.)

- **Home top bar = full-width flowing gradient.** The `#global-progress-fill` 3px strip under the header
  gets `.is-home` on the Home view → `width:100%` + a flowing Miami gradient (`linear-gradient` teal→
  purple→pink→purple→teal at `background-size:300%`, `@keyframes glProgressFlow` sliding background-
  position, 7s linear). `updateProgressUI()` toggles `.is-home` off `state.view==='home'` (and `showHome`
  now calls it); off-home it reverts to the real progress fill. Reduced-motion disables the flow.
- **Glossary reference → term flash.** Clicking a module reference in the glossary now flash-highlights
  the term in the landing chapter so it's easy to find — ONLY when arrived from the glossary. `_glRef`
  gained an `entryId` arg (passed via `_glRefRowHtml(ref, entry)`) and sets `window._ltGlossaryHighlight =
  {terms:[term,...aliases], ts}`; `renderCurrentStep` calls new `_ltFlashGlossaryTerm()` which scans
  `#content-area` text (TreeWalker, skips script/style/canvas), wraps the first whole-word match in
  `<span class="lt-gl-flash">` (teal↔pink pulse, `@keyframes ltGlFlash`), scrolls it into view, and clears
  the flag (one attempt). Best-effort: lands on the intro (step 0) where the term text is HTML; if not on
  screen it no-ops. Verified across bullish/bearish/candlestick/wick/trend.

## Latest session (2026-06-16, later⁸) — Glossary candle examples follow the configured candle colours

The glossary figures (`lt-glossary.js`) drew candles via `_gc()` with hardcoded `_GT`(#00d4d4)/`_GR`(#cc2222 red)
— so bearish examples were RED, not the configured pink, and didn't follow the candle-colour settings.
Fix: candle bodies + the volume figure's bars now use `var(--teal)` (bullish) / `var(--bear)` (bearish),
which resolve live. Added a **`--bear` token** (`lt-styles.css` :root default `#ff2e88`) wired from
`lt_bearish_color`: set inline in `ltApplySavedSettings` (with the white→slate light-mode remap, mirroring
`getBearishColor`) and updated live in the bearish settings handler. Bullish already followed `--teal`
(the bullish setting sets it). `lt-styles.css?v=1.97.9` + `lt-settings.js?v=1.28.5` + `lt-glossary.js?v=1.18.4`.
Verified: 32 bearish (pink) + 54 bullish (cyan) candle rects bind to the vars; live re-colour confirmed; 0 errors.

## Latest session (2026-06-16, later⁷) — impeccable critique+audit, then fixes (contrast / side-stripes / display font)

Ran `/impeccable critique` (lesson player → 35/40) + `/impeccable audit` (app → 18/20) manually
(the skill installed mid-session isn't a registered slash command, so executed via its reference docs).
Then applied the top findings. `lt-styles.css?v=1.97.8` + `player.css?v=1.4.0` + `lt-settings.js?v=1.28.4`.
0 errors; verified.

- **P1 muted-text contrast:** `--text3` `#716c88` (4.01:1, fails AA) → **`#8b85a3` (5.71:1)**. NOTE the
  theme palette is applied **inline via JS** (`lt-settings.js` `LT_DARK_THEME`/`LT_LIGHT_THEME` objects),
  which OVERRIDES the CSS `:root` — so the real fix was in `lt-settings.js:27` (dark palette), not just
  the CSS token. (Both updated to match.)
- **P2 side-stripe borders** (impeccable absolute ban) removed: the home **Continue card**
  (`.lt-home-continue` had `border-left: 2px var(--teal)` → full 1px border; `--peek` now sets full
  `border-color`) and the **concept-beat rail** (`.ltp2.is-concept .ltp2-panel` `border-left: 3px` removed;
  the lightbulb icon + title underline already carry the accent).
- **Secondary display font (user choice): IBM Plex Mono.** Added to the Google Fonts link; new token
  `--font-display: 'IBM Plex Mono', 'JetBrains Mono', …`; applied to headings/titles/large numerals
  (`.content-card-heading`, `.lt-home-hero-title`, `.lt-home-overall-pct`, `.lt-home-continue-title`,
  `.lt-home-course-name`, `.modal-title`, `.cert-title`) and the lesson player (`.ltp2-title`/`.ltp2-heading`).
  Pairs two monospaces deliberately to keep the terminal aesthetic; the Inter setting still overrides all.
- **PRODUCT.md written** (impeccable init, earlier this turn). `/impeccable document` (DESIGN.md) + the
  remaining audit items (onboard affordances, tokenize stray player hexes) are still open.

## Latest session (2026-06-16, later⁶) — LESSON CAPTION SIZE SETTING + impeccable skill installed

- **Caption (subtitle) size setting** for the v2 lessons. `player.css?v=1.3.0` + `renderer.js?v=1.4.0`
  + `lt-engine.js?v=3.99.4` + `lt-settings.js?v=1.28.3`. Sizes Small/Medium/Large via `.ltp2.cap-{sm,md,lg}`
  (CSS vars `--cap-fs/--cap-pad/--cap-mh`); renderer applies `cap-<size>` from `opts.captionSize`; engine
  passes `localStorage.lt_caption_size` (default `md`, slightly smaller than the old 14px). New Settings
  row "Lesson Caption Size" (reuses the font-toggle style, distinguished by `data-cap`; font handler scoped
  to `[data-cap]`→`[data-font]`). **Mobile (≤560px) force-uses the smallest** (`.ltp2-caption` direct
  override in the mobile media block, beats the cap-* var). Live-applies via `ltApplyCaptionSize()`.
  Added `lt_caption_size` to the settings reset keep-list. 0 errors; verified desktop + mobile.
- **Installed `impeccable` skill** (`npx impeccable install` → `.claude/skills/impeccable` + `.agents`,
  + a PostToolUse design-detector hook in `.claude/settings.local.json` that flags UI-edit findings as
  system reminders). `/impeccable init` (writes PRODUCT.md/DESIGN.md) is pending the strategic interview.

## Latest session (2026-06-16, later⁵) — CANDLE COLOURS (cyan/pink) + HOLLOW-WICK FIX

`lessons-v2/renderer.js?v=1.3.0` + `lt-engine.js?v=3.99.3` + `lt-settings.js?v=1.28.2`. 0 errors; verified.

- **Bearish candles: white → brand pink `#ff2e88`** (cyan up / pink down), kept uniform across
  visuals/lessons/quizzes: `getBearishColor()` default, the v2 player colour pass, the renderer's
  `C.bear`, and the Settings picker (added a "Pink" option, now default; White/Red still selectable).
  `BEAR` is candle-only in the engine, so nothing else recoloured.
- **Hollow-candle wick fix:** the wick was a single high→low line drawn under the body, so a hollow
  (bullish) candle showed the line through its transparent interior. Now drawn as two segments
  (high→body-top, body-bottom→low) in `_candle` + `_drawCandle` — never crosses the body.

## Latest session (2026-06-16, later⁴) — ANIMATION/INTERACTION AUDIT (emil-design-eng skill)

Installed the **`emil-design-eng`** skill (`npx skills add emilkowalski/skill` →
`.agents/skills/emil-design-eng/SKILL.md`, symlinked to Claude Code) and audited the app's
interactions/animations against it. `lt-styles.css?v=1.97.6` + `lessons-v2/player.css?v=1.2.0`.
0 console errors; home + lesson player verified.

- **Custom easing tokens** added: `--ease-out: cubic-bezier(0.23,1,0.32,1)` + `--ease-in-out` in
  `:root` (and `--ease-out` in `.ltp2` for the standalone hubs). The built-in CSS eases are weak.
- **Killed all 14 `transition: all`** in `lt-styles.css` → explicit GPU-friendly props
  (background-color/border-color/color/box-shadow/opacity/transform), transform on `--ease-out`.
- **Press feedback (`:active` scale 0.97)** added to the main pressables (nav-btn, btn-exam,
  practice, sidebar-home, cvt-tab, chapter-item, icon-btn, course-card press-settle) + the lesson
  player buttons (`.ltp2-btn` 0.97) and dots (`.ltp2-dot` 0.85). Site had only 4 `:active` rules before.
- **Hover-lift gating:** the course-card `translateY(-2px)` hover (a transform) is now disabled under
  `@media (hover: none)` so taps on touch don't stick the lifted state; `.ltp2-dot:hover` grow gated to
  `(hover: hover) and (pointer: fine)`.
- Player dot/button/progress transitions now use `--ease-out`.
- Left as-is (already good or intentional): entrance keyframes use `scale(0.9)` not `scale(0)`; no bare
  `ease-in` misuse; modal `scaleIn` mild overshoot; the lesson concept-line reveal cadence (~420ms/line,
  deliberate teaching pacing) and the 600ms ECharts chart draw-in (explanatory content).

## Latest session (2026-06-16, later³) — UNIFORM CANDLE STYLING

Made candles look identical across **visuals / lessons / quizzes**. `lessons-v2/renderer.js?v=1.2.0`
+ `lt-engine.js?v=3.99.2`. 0 console errors; verified side-by-side in the preview.

- The site convention (engine ECharts, `lt-engine.js:676`, shared by the intro "visual" chart AND the
  quiz chart) is **hollow-up / filled-down** (bullish = transparent body + teal outline; bearish = solid).
  The v2 lesson canvas drew bullish SOLID — the only mismatch. Fixed `_candle` + `_drawCandle` to hollow-up.
- **Exception preserved:** per-candle tool schemes (Crayons/Genie/Trend Buddy/PAL/Heuristics) still render
  SOLID filled.
- Renderer reads `opts.colors.{bull,bear}`; the engine passes the learner's custom `lt_bullish_color`/
  `lt_bearish_color` (else dark defaults) so the lesson honours the same colours as the ECharts charts.
- Out of scope / flagged: the SIMULATOR candles are still internally inconsistent (`lt-sim-ui.js:757`
  solid-up vs `:933` hollow) — align those too if you want full-app uniformity.

## Latest session (2026-06-16, later²) — LESSON PLAYER UI POLISH (4 tracks)

Improved the v2 lesson player UI. `lessons-v2/renderer.js?v=1.1.0` + `lessons-v2/player.css?v=1.1.0`
+ `lt-engine.js?v=3.99.1`. Verified in the Claude Preview (desktop + mobile), 0 console errors,
all four courses (16 lessons / 59 beats swept). Backup before changes: `Backup-2026-06-16_1844/`
(now includes the `lessons-v2/` stack). NOT committed (OpenClaw deploys from the working tree).

1. **Concept beats** — stage now hugs content (root carries `is-concept`/`is-chart`/`is-candle`; the
   concept panel goes in-flow with `aspect-ratio:auto`), removing the dead 16:9 space. Added a lightbulb
   glyph, title underline, left accent rail, and `--accent: var(--mod-accent, var(--teal))` so the
   kicker/bullets follow the course colour.
2. **Playback** — thin per-beat progress bar, Play↔Pause icon that lights when playing, and a final-beat
   "✓ Lesson complete → Continue to the quiz" cue (engine passes `opts.onComplete = navigate('next')`).
3. **Mobile** (`@media ≤560px`) — chart/candle stage → 4/3 (taller), beat dots hidden (bar+counter carry
   position), caption capped at 40vh+scroll. Plus a dark text-halo behind canvas labels for legibility.
4. **Keyboard/a11y** — FIXED a conflict where the engine's ←/→ step-nav fired alongside the player's ←/→
   beat-nav. Now: on the lesson step the player owns ←/→ (beats), engine keeps ↑/↓ (steps), Space = play/
   pause. Added `:focus-visible` outlines, aria-labels/roles, and an input-typing guard.

## Latest session (2026-06-16, later) — V1 LESSONS REMOVED + ~335 MB OF FILES DELETED

Follow-up to the migration: user asked to "remove all the legacy lessons (v1)" and clean the file
tree. Done — v2 is now the ONLY lesson system. 0 console errors across all four courses in the
Claude Preview; resource-timing confirms nothing requests the deleted paths. NOT committed
(OpenClaw deploys from the working tree). Detail: `lessons-v2/MIGRATION_HANDOFF.md`.

- **Authored the last orphan in v2:** C2 "Divergences" → `lessons-v2/lessons/Course2/18_Divergences.js`
  (reuses the `rsi` move; no live video → mapped via `LT_V2_NOVIDEO[2][14]`). ALL 81 live chapters now
  map to a v2 lesson. Regenerated `lessons-v2/lessons/manifest.js` (C2 = 18).
- **Removed the recon system from `lt-engine.js`** (~102 lines): loaders (recon/timelines/cues/chartmeta),
  `renderReconLesson`/`mountReconPlayer`/`disposeReconPlayer`, the dead `setIntroView`/`toggleIntroVideo`/
  `_ensureVideoButton`/`_reconTabs` intro-video machinery, the `reconMode` branches of the card builders.
  Kept `_watchOriginalHtml`/`_youtubeWatchUrl` (v2's courtesy link).
- **Removed the v1 written-lesson path:** `renderLesson` + `renderLessonRealExample` +
  `_setupLessonExampleToggle`/`toggleLessonExample` + `_lessonExample`. The quiz's real-BTC feature was
  KEPT (shared helpers). Lesson dispatch is now just `renderV2Lesson` (+ graceful fallback notice).
- **Step model = 3 steps for every chapter (intro/lesson/quiz).** The separate "Visual" step was first
  decoupled from recon, then **folded back into the Introduction** (user request, same day): `renderIntro`
  shows overview + the chapter's chart (or concept diagram / roadmap) on one page. `renderVisual`/
  `chapterHasVisual`/`STEP_LABELS_RECON` removed; route clamp `s<=2`. The 2 course openers (C1/C2 ch0)
  with both a roadmap and a chart show overview+roadmap with the chart full-width below. `lt-engine.js?v=3.99.0`.
- **Deleted (~335 MB):** the whole `rebuild/` tree (recon recipes + 244M audio + 71M frames + generators
  + old rebuilt-transcript layer), `lt-recon-player.js`, `player/`. Tracked files (2682) recoverable from
  git HEAD; untracked dev artifacts permanent. **API key preserved:** `rebuild/.anthropic_key` →
  `.anthropic_key` (workspace root), added to `.gitignore` + `.vercelignore` FIRST. `.vercelignore` cleaned.
- Cache bumps: `lt-engine.js?v=3.98.0`, `manifest.js?v=1.1.0`.

## Latest session (2026-06-16) — v2 ANIMATED-LESSONS MIGRATED LIVE (full swap, silent)

Executed pending item #0. The isolated v2 system (`lessons-v2/`) is now the **default lesson
renderer on the live app**, in place of the recon player. User-approved approach: **full swap**
(v2 is the default for every mapped chapter; recon kept as fallback) + **ship silent** (captions
only; TTS deferred). 0 console errors across all four courses in the Claude Preview; OpenClaw
auto-deploys. Backup: `Backup-2026-06-16_1716/`. Full detail: `lessons-v2/MIGRATION_HANDOFF.md`.

- **Wiring (live files):** `lt-index.html` loads the v2 stack before the deferred engine —
  `lessons-v2/player.css` + `chart-vocabulary.js` + `renderer.js` + `lessons/manifest.js`
  (all `?v=1.0.0`); `lt-engine.js` bumped `3.96.2 → 3.97.0`.
- **Engine V2 layer** (after `disposeReconPlayer`): `LT_V2_BY_VIDEO` (75 video_id→v2id) +
  `LT_V2_NOVIDEO` (5 video-less intro/recap chapters by course+index), `ensureV2LessonsLoaded(n)`
  (lazy per-course via `window.LT_V2_FILES`, warmed in the step preload), `v2LessonIdFor` /
  `getV2Lesson`, `renderV2Lesson` (mounts `new LTRenderer(host, lesson)` on the lesson step),
  `disposeV2Player`. Dispatch: `v2LessonIdFor ? renderV2Lesson : hasRecon ? renderReconLesson :
  renderLesson`. **Step model unchanged** (still gated on `hasRecon`).
- **New file:** `lessons-v2/lessons/manifest.js` (auto-generated `window.LT_V2_FILES`). v2 lesson
  files themselves were NOT edited — the chapter→lesson map lives entirely in the engine.
- **`.vercelignore`:** ships `lessons-v2/**.js` + `player.css`; excludes `lessons-v2/*.md` + the
  `course*.html` / `preview.html` hubs.
- **Mapping machine-validated:** 80/81 live chapters map to a v2 lesson; only Course 2
  **"Divergences"** (no v2) falls back to its v1 written lesson (verified — not blank).
- **Verified live (0 errors):** full sweep — C1 13/13, C2 16/16 (+1 fallback), C3 21/21, C4 30/30
  mount; Ichimoku cloud + Trend Buddy palette render via the real Next-button flow.

## Latest session (2026-06-15, later⁶) — Transcript de-stutter + TTS/cue regen, deictic highlights, font/colorize, glossary, Perpingo rename, new OG card (all local, auto-deployed by OpenClaw)

Big multi-part session. 0 console errors throughout; verified in the Claude Preview. Cache versions now:
`lt-engine.js 3.92.0` (cue loader `?v=1.1.0`), `lt-recon-player.js 1.9.2`, `lt-styles.css 1.97.5`,
`lt-glossary.js 1.18.3`, `lt-data.js 1.9.2`, `lt-data-course2.js 1.7.1`, perpingo imgs `?v=1.1.0`, og `?v=3`.

- **Transcript repeats FIXED (16 modules) + TTS regenerated.** The de-stutter pass had MISSED every
  converted/scenario module — their source captions overlapped (tail of each chunk repeated as the head
  of the next, plus within-chunk stutters). New `rebuild/recon/dedup_captions.py` (deterministic; scan
  with no args, dry-run `<vid>`, rewrite `--write [vids]`) cleaned 16 modules (670/734 chunks changed,
  366–700 repeated words each removed, content preserved, footer kept). Re-ran `tts_all.py` (Kokoro
  `af_heart`, 0 synth failures) → fresh audio + timelines. The 16: C1 ea3Upvs-Csg/TD3i7Rv130E/JUmnSxywtt4/
  jUKafxO9A4Q · C2 65VTOnegdKA/XaKbiC8pnRc/qQUyNbupNjU · C3 pZRnkcfs6s0/8L1gojZJY9M/MdbfWpG_J0s/9-4WMH2Sv6Q
  · C4 MdWiEYBAeas/7w2Zq779mO4/x7cvT7vxE2M/Y6-VWGeitV0/ieQGvviW-N8. (Other 60 modules untouched.)
- **Cue track regenerated + deictic highlights (#3/#4).** User chose "tighten synthetic + cues" (NOT
  frames/video). `build_cues_all.py` re-run → 2151 cues (re-aligned to clean captions/timelines). Added a
  DEICTIC PASS (`deictic_pulses()`): "here / right here / this level / this zone …" → a transient `pulse`
  cue that re-flashes the already-drawn line/zone/marker at that narration moment (501 pulses; concept/
  side-matched, deduped 1.4s, capped 5/chunk). New player primitive `pulse` (`pulseCue`/`_matchCueEl` in
  lt-recon-player.js) re-flashes an existing element by params — no duplicate geometry.
- **Player chart labels follow the font setting (fix B).** The 10 hardcoded `fontFamily:'JetBrains Mono'`
  ECharts labels now read `labelFont()` → Inter when `html.font-inter`, else mono (canvas can't inherit CSS).
- **Colour-word highlighting in lesson PROSE.** `ltClr()` in lt-engine.js colours "green hues / red bars /
  lime …" in intro+lesson body/bullets, concept cards, quiz explanations (palette in lt-styles.css +
  light-theme overrides). Operates only between tags; **chart labels deliberately untouched.**
- **Glossary 81 → 100 terms.** Course-wide term sweep added Liquidity Pool, Liquidity Structure (Under/
  Over), Order Block, Tenkan-sen, Chikou Span, C-Clamp, Morning/Evening Star, Soldiers/Crows, Tweezer,
  Wedge, Trailing Stop, LTE, Set&Forget, Realized/Unrealized P&L, Trading Styles (11 with SVG diagrams),
  plus CEX, DEX, Crypto Wallet, Cold Storage. lt-glossary.js 1.18.3.
- **Mascot renamed pepe → Perpingo** (perp + flamingo). Files `perpingo-{laptop,cap,builder,ninja,brain}.png`
  (swapped to new pink-brand art from "New Icons-2.zip"); `LT_PERPINGO_BY_COURSE` in lt-engine.js; subtle
  white `drop-shadow` glow on the home avatar (0.35/5px rest, 0.45/8px on course-hover).
- **New OG card** (`tools/build-og.js`): full terminal-aesthetic redesign — all JetBrains Mono (rasterizer
  needs JBM in `OG_FONTS`; setup docs updated), teal/pink VT glows, bigger centered "Liquidity Theory"
  wordmark, Perpingo (laptop) with glow, and the Vice Terminal flamingo logo (`vice-terminal.png`) +
  "A Vice Terminal Product" at the bottom. Re-rasterized og-image.png; bumped og `?v=2→3` (index.html +
  gen-seo.js). Run: `NODE_PATH=/tmp/og-render/node_modules OG_FONTS=/tmp/og-render/fonts node tools/build-og.js`.

## Latest session (2026-06-15, later⁵) — Course 1 & 2 intro module roadmaps + deploy clarification (all local, auto-deployed by OpenClaw)

User noticed Courses **1 & 2** opened straight into a lesson with empty space on the Introduction,
while **3 & 4** show a "Five Modules — …" roadmap (their first chapter is a dedicated *Course Overview*).
Gave 1 & 2 the same module-overview on their opening chapter's Introduction — **without adding a new
chapter** (no index shift → existing localStorage progress + deep links stay valid). 0 console errors;
verified in the Claude Preview. `lt-engine.js 3.86→3.87.0`, `lt-data.js 1.9.1→1.9.2`,
`lt-data-course2.js 1.7.0→1.7.1`.

- **Engine (`renderIntro`):** the recon-chapter intro (overview-only solo layout) now renders the
  two-column `intro-layout` with `roadmapCardHtml(chapter.roadmap)` on the right **when the chapter
  defines a `roadmap`** — same layout the non-recon overview chapters (C3/C4 ch0) use. Falls back to
  the solo layout when there's no roadmap (every other recon chapter is unchanged).
- **Engine (`renderVisual`):** dropped the `chapter.roadmap ? roadmapCardHtml : …` branch (and the
  `!chapter.roadmap` chart-render guard). The Visual step is the candle/structure read and must
  **never** show a roadmap. This was latent dead code (no recon chapter had a roadmap before); needed
  now that C1/C2 ch0 carry one, else the roadmap would have hijacked their Visual step.
- **Data:** added a `roadmap:{title,sub,icon,stops[]}` to **C1 ch0** ("Understanding Price Action",
  *"Five Modules — Reading Raw Price"*) and **C2 ch0** ("Trading Styles", *"Five Modules — Building Your
  Toolbox"*); stops = each course's 5 teaching modules with one-line descriptions.
- **Verified live:** C1/C2 Introduction = two-column overview + module roadmap (5 stops each); C1/C2
  **Visual step still shows its candle chart** (no roadmap); C3/C4 roadmaps unchanged; 0 console errors.
- **`.vercelignore` hygiene (this session):** added `Backup` / `Backup-*` / `~` (internal source
  snapshots + a stray mis-expanded-`~` transcripts dir) so they're never published. `rebuild/frames`
  was already excluded.

## Latest session (2026-06-15, later⁴) — Real ticker + price-calibrated axis on lesson charts (all local, NOT deployed)

Made synthetic lesson charts read like the actual chart: a real **asset ticker** top-left and a
**price-accurate y-axis** calibrated to the spoken levels. `lt-recon-player.js 1.8→1.9.0`,
`lt-engine.js 3.85→3.86.0`. Report: `rebuild/recon/ticker_price_report.md`. 0 console errors.

- **Resolver `rebuild/recon/build_chart_meta.py`** → `lt-recon-chartmeta-course{N}.js`
  (`LT_CHARTMETA_N` : vid → {chunks:{i:{asset,pair,timeframe,price_anchors,price_map,price_range}}}),
  inspectable/hand-editable. Per chart chunk, from the recipe `caption` + scene overlays:
  (1) detect asset → `BTC/USDT` etc., **carry the module's asset forward**, attach the named TF,
  never invent an asset (→ no ticker if the module names none); (2) parse spoken prices ($9,000 /
  8.4k / 64k), keep only CHART-LEVEL ones (level-language + chart chunk), pair by rank with the
  scene's synthetic structural levels to solve an affine map **real = a·synth + b**.
  Totals: **619 ticker-chunks, 19 price-calibrated** (9 C2 + 10 C4). Re-run: `python3 build_chart_meta.py`.
- **Player (`lt-recon-player.js`):** 5th ctor arg `chartmeta`; `.ltp-symbol` top-left (cyan/mono,
  glow) shows `PAIR · TF`; `ChartScene._pmap` maps candles + keyLevel at build and every overlay
  price via `_px()` (cues, eager overlays, `_yRange`), so a level at synth X lands at its real
  price and the axis agrees; new `fmtPrice()` axis labels (commas ≥1000, cents <100).
- **Engine:** `ensureChartMetaLoaded`/`getChartMeta` (lazy per course, in the step-0 preload),
  threaded into both `new LTPlayer(...)` sites (`mountReconPlayer` + `setIntroView('play')`).
- **Verified live:** S/R proof (`jUKafxO9A4Q`) — every chart chunk shows **BTC/USDT** (· 4H on the
  4-hour chunks 17/19/20/21), **no $ spoken → no faked axis** (calibration off, correct). Calibration
  demo — Entering Trades (`3xhRlMRh1P4`) chunk 21: candles mapped to **$7.9k–8.7k**, axis ticks
  **8,200 / 8,400 / 8,600 / 8,800**, synth-100 level → **$8,000** (axis + level agree). Also wrote the
  resolved asset/pair into the proof `player/reconstruct/reconstruction.json` (13 chart chunks).

## Latest session (2026-06-15, later³) — 4th "Visual" step on reconstruction chapters (all local, NOT deployed)

User-requested chapter-flow change: reconstruction chapters now run **Introduction · Visual ·
Lesson · Quiz** (was Introduction · Lesson · Quiz). **Final shape (after a correction):** no per-card
view toggle — each step is its own thing. **Introduction** = overview text · **Visual** = the candle
chart only (no tabs) · **Lesson** = the **animated reconstruction player** (replaces the written
lesson card) + a "Watch original" link · **Quiz** unchanged. Steps are navigated linearly by Next
(no watch-gate). Scope: **all 76 reconstruction chapters** (the 21 YouTube-only modules keep the
classic 3 steps + their written lesson). `lt-engine.js 3.81→3.84.0`, `lt-styles.css 1.97.1→1.97.3`.

(First pass put candles+player behind a toggle on the Visual step with a "must switch to Lesson"
gate — the user corrected it: drop the toggle, put the player on the Lesson step, candles on Visual.
The `visualSeen` gate + `_markVisualSeen` + `.visual-step-hint` were removed.)

**Embedded YouTube removed sitewide (`lt-engine.js 3.84→3.85.0`).** The 9 non-reconstruction
chapters (6 Hyblock + FSVZO + course-4 intro/outro) still showed a `Candles | 🔴 Video` toggle that
embedded a YouTube iframe via `setIntroView('video')`. Removed the embedded-video tab from
`chartCardHtml` AND `conceptCardHtml` → they now show the candle chart with just a `Candles`/`Concept`
badge + a non-embedded **"Watch original on YouTube ↗"** link (same courtesy link recon chapters use;
opens a new tab, no in-app iframe). `_ensureVideoButton`/`toggleIntroVideo`/`setIntroView('video')`
are now dead (no callers). Verified live: all 9 non-recon chapters have 0 video-tabs / 0 iframes,
candles render, 0 console errors.

- **Per-chapter step model** (replaces the hardcoded 3): `chapterStepKeys/chapterStepLabels/stepCount/
  lastStepIdx/stepKindAt(chapter,step)` near the top of `lt-engine.js`. `hasRecon(chapter)` →
  4 steps else 3. ALL step math flows through these (dispatch, `navigate()` bounds, `goToStep`,
  `updateNavButtons`, pills/dots, `globalProgress` is now cumulative, route parse `s<=3`, saved-state
  labels). `renderCurrentStep` also calls `updateNavButtons()` so nav state matches the rendered step
  after the recon-load re-render.
- **Renderers:** `renderIntro` (recon) = overview only. New `renderVisual` = candle chart only via
  plain `chartCardHtml` (no tabs/player). New `renderReconLesson` mounts the player via
  `mountReconPlayer(host, chapter)` (factored from `setIntroView('play')`'s mount). Dispatch:
  `lesson` kind → `hasRecon ? renderReconLesson : renderLesson`. Non-recon `renderIntro`/`renderLesson`
  unchanged (written lesson preserved).
- **Verified live (0 console errors), via eval probes (screenshot tool was stuck this session):**
  E2E (c4 ch27) shows 4 pills; Introduction = overview; **Visual = candles canvas, no `.chart-view-tabs`,
  no player, Next not gated**; **Lesson = `.ltp-root` player mounted, no written-lesson card, "Watch
  original" link**; Visual→Lesson→Quiz at steps 1→2→3. Non-recon ch (Hyblock "Liquidation Levels") =
  3 steps, written lesson card present, no player. c4 = 21 recon (4 steps) / 9 non-recon (3 steps).

## Latest session (2026-06-15, later²) — Full-site audit/fix/polish sweep (evidence-first) (all local, NOT deployed)

Objective sweep of the whole app. **Finding: the codebase is mature — every "known carried issue"
on the brief was already resolved in current code** (proven, not assumed). Deliverables: `audit.md`
(Phase-0 evidence log) + `sweep_report.md` (resolutions/responsive/perf). 0 console errors.

- **Re-verified & cleared (no change needed):** settings Reset-All/Mark-All-Complete cover all 4
  courses (`lt-settings.js:948/961`); `range` + `liquidity_sweep` injectors correct (Node test: 0
  invalid candles, sweep pierces+closes-below the level); both OHLC tooltips correct incl. the
  ECharts index-offset (`lt-engine.js:614`, `lt-sim-ui.js:737`); pattern selector is now a grouped
  `<select>` (no cut-off); seeded shuffle correct + LCG unbiased (the 4 four-option quizzes land
  A/B/C/D evenly; rest are 3-option by design); **0 Barlow refs**; colour constants consistent;
  light theme complete (not half-built). `lt-charts.js` named in briefs **does not exist** (chart
  code = `lt-chartgen.js` + engine + `lt-simulator.js`).
- **Real defect found + FIXED:** **95 `'JetBrains Mono', sans-serif` fallbacks** → if the web font
  fails, the terminal aesthetic collapses to a proportional sans. Replaced fallback with `monospace`
  across 7 JS/CSS files + `index.html` (Inter option left intact); also fixed `.lt-gallery-wrap`'s
  `system-ui` stack. Verified live: body computes the full mono stack, **0** elements fall back to
  `Mono…sans-serif`, `document.fonts.check` true.
- **Responsive verified live:** mobile @375 (chapter, player, simulator — candles legible, dropdown
  fits, no h-scroll) + laptop @1280 (sidebar 230/content 1050, no h-scroll). **Latency measured:**
  step-nav 17 ms, glossary view-switch 97 ms — both < 100 ms.
- **Cache-bumped:** `lt-styles.css 1.97.1`, `lt-gallery.js 1.3.1`, `lt-settings.js 1.28.1`,
  `lt-sim-ui.js 1.15.11`, `lt-glossary.js 1.18.1`, `lt-flashcards.js 1.9.3`, `lt-community.js 1.10.4`,
  `lt-engine.js 3.81.0`.

## Latest session (2026-06-15, later) — Cue track ROLLED to the live app (scenario drift fix) (all local, NOT deployed)

Executed the handoff's #1 next-step. The transcript-reactive **cue track** (built as a standalone
S/R proof the prior session) is now **live on every chart module**. 0 console errors throughout;
verified in the Claude Preview. Full log in `rebuild/recon/qa_report.md`; STEP-0 primitive map +
76-module checklist in `rebuild/recon/qa_plan.md`.

- **Generalised the cue pre-pass:** `player/reconstruct/build_cues.py` (single proof,
  `reconstruction.json`) → **`rebuild/recon/build_cues_all.py`** — runs per-module against the live
  `lt-recon-course{N}.js` scenes + `lt-recon-timelines-course{N}.js`, emits one **`lt-recon-cues-course{N}.js`** (`LT_CUES_N`, keyed by video_id) per course. **1,653 cues / 46 chart modules**; 30
  slides-only modules correctly got none. Grounding unchanged: `params` copied from the scene
  overlay (never an invented level); the caption only sets *timing* + *emphasis*. Re-run anytime
  (deterministic, no API): `cd rebuild/recon && python3 build_cues_all.py`.
- **Ported the cue executor** into the live **`lt-recon-player.js` (1.7.0→1.8.0)**: `_reconcileAccents`
  (declarative reconcile vs the audio clock — play/seek/scrub/reverse) + `ChartScene.addCue/removeCue/_pushCue` + `.ltp-tag-flash`. Cue mode suppresses the eager overlay build (candles only); chart
  chunks **without** cues fall back to the eager build. **`_renderCues` only writes `series[0]`
  markLine/markArea/markPoint → Ichimoku/Fib/RSI/scheme overlays are preserved** (verified: the
  Ichimoku scenario renders 6 series + the cue line).
- **Engine wiring** `lt-engine.js (3.79.0→3.80.0)`: `ensureCuesLoaded`/`getCues` (lazy per course,
  `?v=1.0.0`), folded into the step-0 preload `Promise.all`, `cues` threaded into `new LTPlayer(host, doc, tline, cues)`.
- **Verified live (0 console errors):** C1 HTF Scenario `TD3i7Rv130E` (accents fire on the spoken
  beat — probed at 5 timestamps; screenshot), C4 Liquidity Scenarios `7w2Zq779mO4` (8 chunks
  sampled), C4 Ichimoku Market Scenarios `MdWiEYBAeas` (indicator + cue coexistence; screenshot).
- **Cache-bumped** in `lt-index.html`: `lt-recon-player.js?v=1.8.0`, `lt-engine.js?v=3.80.0`.
  `.vercelignore` excludes `build_cues_all.py` / `chart_audit.md` / `player/`; ships the cue JS.
- **Flagged (see qa_report.md):** the cue track is global (not just scenarios) per the AFK "do all"
  request — 3 modules walked live, the other 43 are generated + load-verified but not yet visually
  walked (priority list in `qa_plan.md §C`). Cue timing is heuristic (±1–2 s on long clips) but the
  files are hand-editable JSON. Still queued: C2 Oscillators divergence; the Vercel redeploy.

## Latest session (2026-06-15) — YouTube→native conversions · indicator rendering · transcript-reactive cue track · player UI cleanup (all local, NOT deployed)

Big session. Four threads, all on the **reconstruction player** layer (`rebuild/recon/` + `lt-recon-player.js`). 0 console errors throughout; every step verified in the preview.

### A. Converted 14 YouTube-only modules → native reconstruction
Policy was "62 reconstruct · 21 keep-YouTube" (the `verbal_vs_visual=="visual"` gate in `gen_recipes_llm.py:~150` skips live-walkthrough modules). User wanted them converted. Added **`FORCE_IDS`** (9 scoped) + later 5 more that the *gated re-assembly had silently dropped* — to `gen_recipes_llm.py` so they bypass the gate:
- **Converted (14):** C1 HTF Scenario, LTF Entry, **Timeframes**; C2 Types-of-Trades-Live, Volume Examples, Classical-Pattern Examples; C3 Range Market Scenario, **Order Book**, **Getting Into Positions**, **Executing Orders**; C4 Liquidity Scenarios, Futures Basis, Liquidation-Level Scenario, **Ichimoku Market Scenarios**. (bold = the 5 "restore" ones that were native before.)
- **Deliberately NOT converted (7, still YouTube):** the 6 **Hyblock paid-platform screen-recordings** (Platform Overview, Liquidation Levels, Positions Heatmap, Combining Sentiment Data, Trading Activity, Hyblock Indicators) + **FSVZO** (`Ioxmip6tjsQ` — no transcript chunks in the rebuilt pipeline, can't reconstruct). Engine auto-switches on recipe presence (`hasRecon`), so converting = generating a recipe; no allow-list.
- LLM recipes generated (claude-sonnet, cached in `llm_cache/`); **TTS audio generated for all (76 modules, 0 synth failures)** — `cd rebuild/recon && python3 tts_all.py`. The 14 verified: recipe chunks == timeline chunks == clip count.
- **`.anthropic_key` lives at `rebuild/.anthropic_key`** (gitignored). Added it + `tts_all.py`/`.log` + `caption_clean/` to `.vercelignore` (**the key must never deploy**).

### B. Indicator rendering — the player's `_indicatorSeries`/`_schemeColors` were DORMANT
Root cause: `lt-recon-player.js` could draw Ichimoku/colour-schemes but the generator **never tagged any chart scene**, so every indicator lesson showed bare candles. Fixed in `gen_recipes_llm.py` (`INDICATOR_BY_VID`, `SCHEME_BY_VID`, classical-pattern builder) — tags chart chunks; re-assemble is **cached (0 API)**. In `lt-recon-player.js`:
- **Ichimoku** (6 modules): Tenkan **light-blue `#5cc8ff`**, Kijun **yellow `#ffcf3f`**, **green/red Kumo cloud** — colours match the narration ("light blue Tenkan / bright yellow Kijun").
- **Fibonacci** (`_fibSeries`): 7 retracement levels, 0.618 golden pocket emphasised.
- **RSI** (`_rsiSeries` + `_baseOption` 2nd grid): lower oscillator panel, 30/70 bands.
- **Colour schemes** (`_schemeColors`): Crayons/Trend Buddy/Genie recolour candles. **PAL + Heuristics intentionally NOT schemed** (they only paint markers — would be a false recolour).
- **Classical patterns** (C2): reused `ltCandles` "legs" to trace H&S / triangles / wedges / flags / double-tops + neckline/trendline guides via the existing overlay system — **no player change**, done entirely in `gen_recipes_llm.py` (`PATTERN_DEFS`, `classify_pattern`, `pattern_scene`).

### C. Transcript-reactive **cue track** (standalone S/R proof — `player/reconstruct/`)
Accents that react to the narration, fired on the audio timeline. **Live app untouched.** Files:
- `accent_notes.md` — STEP-0 primitive map (`draw_horizontal_line`/`draw_trendline`/`draw_zone`/`mark_candle`) + flagged gaps (liquidity-sweep, FVG box, candle-pulse, **C-Clamp/Ichimoku** — needs the live player's ichimoku primitive).
- `build_cues.py` → `cues.json` — **pre-pass** (NOT runtime string-matching), 29 cues grounded in scene-overlays + dialogue timing; inspectable/hand-editable.
- `lt-player.js` (the standalone demo copy) — `_reconcileAccents` (declarative per-frame) + `ChartScene.addCue/removeCue/_pushCue`; emphasis flash (high = white/bold → settle).
- `accent_report.md` — per-chunk concepts→cues, gaps, skipped chunks. `player-demo.html` loads `cues.json`.

### D. Player UI cleanup + all-lessons audit
- `lt-recon-player.js`: scrub ticks → **chart sections only** (subtle teal, ~13 not 25); time readout → **elapsed only** (dropped redundant chunk-ts).
- `rebuild/recon/chart_audit.md` — pro-trader pass over all 2,661 chunks: **frame-type is already 1:1 with the video** (0 forced/0 missed; 35% chart/65% slide). Concept charts match narration; **scenario/walkthrough modules drift** (one synthetic pattern can't follow a live walkthrough). **Did NOT mass-edit patterns** (directional heuristic too noisy — would inject errors). **The fix = roll the cue-track (C) to the scenario modules.**

### Cache versions bumped this session
`lt-engine.js 3.79.0` (recon loader `?v=1.6.0`, timelines loader `?v=1.3.0`), `lt-recon-player.js 1.7.0`. Recon data files regenerated; timelines regenerated by TTS.

### Next (in priority order)
1. **Roll the cue-track to the scenario modules** (HTF/LTF Scenario, Liquidity Scenarios, Range/Volume/Classical Examples, Ichimoku/Liquidation scenarios) — the real fix for chart drift. `build_cues.py` is per-module; generalise it from the S/R proof into the live engine path.
2. **Divergence** (C2 Oscillators): construct price+RSI to actually diverge (small generator addition).
3. **REDEPLOY** — huge local-only backlog now (conversions + indicator system + audio ~96 MB + cue track). `vercel --prod --token "$VERCEL_TOKEN"`; check `.vercelignore` ships audio/recon JS but not the key/generators.

---

## Latest session (2026-06-14) — TTS narration + audio-driven player (sitewide, ⚠️ UNFINISHED)
Replaced the flamingo mascot with **Kokoro TTS narration**; the reconstruction player is now
**audio-driven** (a single `<audio>` plays each chunk's clip; real measured durations pace the
scene/caption; play/pause/scrubber act on the audio timeline). Applied to the **live app**.

**DONE & verified live (0 console errors):**
- **Mascot fully removed** (demo): deleted `lt-mascot.js`, `player/assets/mascot/`, all wiring. No orphans.
- **TTS pipeline** — `synthesize(text, out)` is a **one-function engine swap** (Kokoro local default → OpenAI/ElevenLabs documented; macOS `say` fallback). Kokoro set up via `kokoro-onnx` (int8 model + voices in `~/kokoro-models/`, voice `af_heart`). Resumable.
- **Standalone demo** (`player/reconstruct/`): `tts_pipeline.py`, 25 clips in `audio/`, `timeline.json` (real durations, 250ms gaps), `tts_report.md`. Demo player = `player/reconstruct/lt-player.js` (audio-driven). Verified: plays, auto-advances clips, pause/seek on the audio timeline.
- **App integration:** ported audio player → `lt-recon-player.js` (copy of demo player); engine adds `getTimeline`/`ensureTimelinesLoaded` (lazy per course) and passes the timeline to `LTPlayer` in `setIntroView('play')`. Timelines = `rebuild/recon/lt-recon-timelines-courseN.js` (`LT_TIMELINES_N`); audio = `rebuild/recon/audio/<video_id>/chunk_NN.mp3`. **`lt-engine.js 3.72→3.73.0`, `lt-recon-player.js 1.1→1.2.0`** (cache-bumped). Verified live: S/R chapter → audio-driven player, chunk 0 loaded, duration **6:25** (real audio), plays.
- **Batch generator** `rebuild/recon/tts_all.py` (lean mono 56k mp3, resumable, incremental per-course timeline writes).

**⚠️ UNFINISHED — pick up here:**
1. **Full TTS generation is INCOMPLETE — only 2 of 62 modules done** (~3.4 MB; the bg job was interrupted). **RESUME:** `cd rebuild/recon && python3 tts_all.py` (resumable, skips done; ~1 hr, ~96 MB total). Only course-1 timelines file exists and is partial; courses 2/3/4 timeline files don't exist yet.
2. **Graceful state meanwhile:** modules without a timeline → player falls back to **silent rAF mode** (text captions, no audio) — app works for all modules, audio only where generated. NOTE: until all 4 `lt-recon-timelines-courseN.js` exist, courses 2/3/4 will 404 that script (caught by `onerror`, harmless, may add console 404 noise).
3. **`.vercelignore` not yet updated:** add `rebuild/recon/tts_all.py` + `rebuild/recon/tts_all.log` to exclusions (the audio dir + timeline JS files SHOULD ship). Deploy weight: audio ~96 MB + frames ~71 MB — consider before prod.
4. **Not deployed.** Engine validated (`node --check`), 0 console errors at last check.

## Latest session (2026-06-14) — Native reconstruction player, INTEGRATED LIVE
A flagship "play the lesson" feature: every reconstruct-default module is rebuilt as live native content (animated HTML slides + synthetic candles via the **reused** `lt-chartgen`/`lt-simulator` engine into ECharts), playing timeline-synced to captions — **NO images, NO YouTube** on those modules.

- **Player:** `lt-recon-player.js` (root, `window.LTPlayer`) — self-contained, JetBrains-Mono/site-token styled, transport (play/pause, section prev/next, scrub+ticks+hover-tip, replay), one-shot snappy chart build-in, reduced-motion. Standalone proof + demo live in `player/reconstruct/`.
- **Policy (data-driven):** **62 reconstruct-default · 21 keep-YouTube**. Concept/lecture/mindset modules → player; live chart-walkthroughs (Scenario/Examples/Platform/Orderbook/Heatmap/Indicators — the "visual" deictic bucket) → keep the real video. **The presence of a recipe in `rebuild/recon/lt-recon-courseN.js` IS the policy** (the 21 video modules have none).
- **Recipes:** LLM pass (`rebuild/recon/gen_recipes_llm.py`, claude-sonnet, 1 call/module, cached in `llm_cache/`) — model classifies + writes slide titles/bullets + picks chart structure; Python builds chart geometry. **All 62 modules, 0 rule-fallback modules, ~14/2300 fallback chunks.** Proof module is a hand-authored override. Re-run: `python3 rebuild/recon/gen_recipes_llm.py` (cache → bills nothing).
- **Engine integration (APPLIED):** `lt-engine.js` **3.69.0→3.71.0** — `getRecon`/`ensureReconLoaded` (lazy per course), `setIntroView('play')` mounts the player in the intro chart slot in place of the YouTube iframe, `chartCardHtml`/`conceptCardHtml` get a `reconMode` (Lesson⇆Candles tabs + "Watch original on YouTube ↗" link), teardown via `disposeReconPlayer()` in `disposeAllCharts`. `lt-styles.css` **1.95→1.96** (`.recon-*`). `lt-index.html` loads `lt-recon-player.js`. Backups in `rebuild/_integ_backup/`.
- **Old rebuilt "transcript companion" REMOVED** (engine `3.71→3.72`, styles `1.96→1.97`): the prior session's collapsible "Rebuilt lesson — transcript + N frames" on the Lesson step is gone — call sites, helper fns (`getRebuilt`/`rebuiltBodyHtml`/`ensureRebuiltLoaded`/…), and `.rebuilt-*` CSS all deleted; the reconstruction player replaces it. `rebuild/lt-data-rebuilt-courseN.js` stay as the offline SOURCE for recipe regeneration but are no longer loaded at runtime.
- **Verified live (preview, 0 console errors):** concept chapter → player replaces video (title slide + bulleted definition slides + engine charts render); Lesson step shows only its normal content (no transcript companion); Timeframes/HTF/LTF scenarios → YouTube unchanged.
- **Deploy:** recon files ship via `.vercelignore` (only `lt-recon-course{1..4}.js` + `lt-recon-player.js`; generators/cache excluded). **Not deployed yet.**

## Latest session (2026-06-14) — Rebuilt-content parallel layer (`rebuild/`)
Built a standalone rebuilt version of all **83 transcript modules** (cleaned transcript + AI frame descriptions) **alongside** the video course, plus a per-module video-replacement assessment. **Fully additive — original course data and video links untouched.** Source: `~/Desktop/LiquidityTheory_Transcripts/` (read-only).

- **Pipeline** (`rebuild/pipeline/`): `clean.py` (dedup captions) · `describe.py` (vision, resumable cache) · `assemble.py` (score + emit). Re-run `assemble.py --copy-frames` any time to regenerate data + report.
- **Vision:** 2,786 frames described via **claude-sonnet-4-6**, 0 failures, cached in `descriptions_cache.json`.
- **Output:** `rebuild/lt-data-rebuilt-course{1..4}.js` (globals `LT_REBUILT_1..4`, keyed to app chapters by YouTube id) · `rebuild/replacement_report.md` (all 83 ranked) · `rebuild/integration_notes.md` (schema + §10 outcome) · `rebuild/frames/` (2,786 jpgs, ~71 MB).
- **Recommendation = 44 standalone / 39 hybrid / 1 video.** Driven by **deictic density** (visual_density is ~1.0 everywhere in a chart course, so it can't discriminate). Every `human_decision` is `null`; effective `contentMode` is **hybrid** for all until a human edits the report. Claude recommends; it does not decide.
- **Engine patch APPLIED** (additive): `lt-engine.js` **3.67.0→3.69.0** (`getRebuilt`/`rebuiltBodyHtml` + 3-way branch in `renderLesson` + standalone video-suppression in `renderIntro`; **`ensureRebuiltLoaded` lazy-loads only the active course's rebuilt file on demand**); `lt-styles.css` **1.94.0→1.95.0** (`.rebuilt-*`); `lt-index.html` no eager rebuilt tags. Original behaviour unchanged when mode is `video`/unmatched. Verified in-browser, 0 console errors. Pre-edit copies in `rebuild/_patch_backup/`.
- **Deploy-ready:** lazy-load means ~0.6–1.2 MB up front (active course only) instead of 3.6 MB; frames (~71 MB) are `loading="lazy"` inside the collapsed companion so runtime cost ≈ 0. `.vercelignore` ships only `rebuild/lt-data-rebuilt-course{1..4}.js` + `rebuild/frames/` (pipeline/cache/backups excluded). Orphan modules = the 8 per-course Intro/Outro (no app chapter; `appChapterId:null`).

## File map
| File | Role |
|---|---|
| `index.html` | Landing page (root). Self-contained: inline `<style>`/`<script>`. Has OG/Twitter meta + `og-image.png`. |
| `lt-index.html` | App shell. Loads every module with `?v=` cache params. Boots `lt-engine.js` on DOMContentLoaded. |
| `lt-styles.css` | All app styling. |
| `lt-engine.js` | Core: `state`, navigation, chart rendering (`buildCandlestickOption`, `renderChart`, `renderTeachingChart`), quiz/exam/cert, sidebar, real-data fetch (`fetchBinanceCandles`), `goToStep`, `scrollActiveChapterIntoView`, `init()`/boot. |
| `lt-chartgen.js` | Deterministic teaching-candle generator. `ltCandles(start, legs, opts)` produces realistic OHLC from a compact "legs" description. `ltLabels(n)`, `ltBars(legs)`, `ltCutBars(legs, n)` helpers. Loaded before data files in `lt-index.html`. |
| `lt-data.js`, `lt-data-course2/3/4.js` | Course content: `LT_CHAPTERS`, `LT_CHAPTERS_2/3/4`. Chapters use `ltCandles()` for teaching charts. Also `LT_EXAM_QUESTIONS_*`. |
| `lt-patterns.js` | `LT_PATTERNS` — 42 real historical BTC setups. Powers the "Real Example" toggle (currently disabled). |
| `lt-simulator.js` | Synthetic candle generator for the practice sim. |
| `lt-sim-ui.js` | Practice Simulator UI. Bearish candles use `_bear()` (white default). |
| `lt-glossary.js` | 79 terms, `glFindReferences`, `GL_FIGURES` (41 SVG diagrams), figure **lightbox** (click to enlarge), header search. |
| `lt-flashcards.js` | Per-course decks. |
| `lt-community.js` | Community page. `LT_SOCIAL.blofin` = `https://partner.blofin.com/d/LiquidityTheory`. |
| `lt-gallery.js` | Candlestick gallery on Course-1 chapter 0. Bearish candles use `getBearishColor()`. |
| `lt-settings.js` | Settings page: theme, font, Bullish/Bearish Candle Color, Export/Import, per-course + all-courses Mark Complete / Reset, reset. Also holds `LT_DARK_THEME` / `LT_LIGHT_THEME` vars applied at boot. |
| `lt-logo.svg` | Brand mark (candlestick logo, teal `#16E9D0` + off-white). `fill-rule="nonzero"` — do NOT change to `evenodd`. |
| `og-image.png`, `og-card.svg` | Social share card. |
| `serve.json` | Local `npx serve` headers (no-cache HTML/SVG/PNG). |
| `vercel.json`, `.vercelignore` | Vercel config. |

## Conventions & gotchas
- **OHLC format** everywhere: `[open, close, low, high]`. In the glossary SVG figures, **smaller y = higher price**.
- **localStorage keys** (all `lt_`): `lt_course1_state`…`4`, `lt_active_course`, `lt_sim_stats`, `lt_theme`, `lt_font`, `lt_bullish_color`, `lt_bearish_color`, `lt_unlock_all`, `lt_sidebar_collapsed`, `lt_backupReminded_<n>`.
- **`state.view`** ('course'|'simulator'|'glossary'|'flashcards'|'settings'|'community') guards against course-nav wiping other views.
- **Course accent colors** (single source of truth = `LT_COURSE_ACCENTS` / `ltCourseAccent(n)` in lt-engine.js, theme-aware): C1 cyan `#00d4d4`, C2 coral `#ff7a4d`, C3 purple `#a855f7`, C4 hot-pink `#ff2e88`. Light-mode deepened variants in `LT_COURSE_ACCENTS_LIGHT`.
- **RED constant** (`const RED = '#cc2222'`) stays unchanged — used only for structural sell-signal annotations and chart markLines. Never candle bodies. Never Course 4 accent.
- **Fonts:** **JetBrains Mono everywhere** (Barlow Condensed fully removed — see the FONT note below). Settings font options: Terminal(default)/Inter.
- **iOS Safari:** full-height containers use `height:100dvh` (with `100vh` fallback).
- **`ltCandles(start, legs, opts)`** — always use for new teaching charts instead of hand-authoring OHLC.
- **`candleColors` array** — optional per-candle color override on any chart def. Same length as `ohlc`. Used by Crayons, Trend Buddy, Genie to match their indicator color systems. Engine handles it in `buildCandlestickOption`.

## Candle colors (site-wide)
- **Bullish:** `getBullishColor()` → `TEAL` var in engine. Default cyan `#00d4d4`, green option `#00c878`.
- **Bearish:** `getBearishColor()` → `BEAR` var in engine. **Default white `#f2f2f2`**, red option `#cc2222`.
- `RED = '#cc2222'` is kept as a **fixed constant** for annotations, levels, and structural markers — never candle bodies.
- `ltRefreshCharts()` updates both `TEAL` and `BEAR`, then re-renders the current step.

## Current cache versions (in `lt-index.html`)
**Reconstruction (current, 2026-06-15 later³):** `lt-engine.js 3.85.0` · `lt-styles.css 1.97.3` · `lt-recon-player.js 1.8.0` · recon-data loader `?v=1.6.0` · timelines loader `?v=1.3.0` · **cues loader `?v=1.0.0`** (all hardcoded in `lt-engine.js`'s `ensureReconLoaded`/`ensureTimelinesLoaded`/`ensureCuesLoaded`).
**Others (current, 2026-06-15 later²):** `lt-styles.css 1.97.1` · `lt-gallery.js 1.3.1` · `lt-settings.js 1.28.1` · `lt-sim-ui.js 1.15.11` · `lt-glossary.js 1.18.1` · `lt-flashcards.js 1.9.3` · `lt-community.js 1.10.4` · `lt-chartgen.js 1.0.0` · `lt-data.js 1.9.1` · `lt-data-course2.js 1.7.0` · `lt-data-course3.js 1.8.0` · `lt-data-course4.js 1.8.0` · `lt-patterns.js 1.5.0` · `lt-simulator.js 1.3.1`.
**Others (may be stale below — trust the per-session notes):** `lt-styles.css 1.94.0` · `lt-chartgen.js 1.0.0` · `lt-data.js 1.9.1` · `lt-data-course2.js 1.7.0` · `lt-data-course3.js 1.8.0` · `lt-data-course4.js 1.8.0` · `lt-patterns.js 1.5.0` · `lt-simulator.js 1.3.1` · `lt-gallery.js 1.3.0` · `lt-settings.js 1.28.0` · `lt-sim-ui.js 1.15.10` · `lt-glossary.js 1.18.0` · `lt-flashcards.js 1.9.2` · `lt-community.js 1.10.3`

## ⚠️ FONT: single typeface now — **JetBrains Mono ("Terminal") everywhere**. Barlow Condensed fully removed (font-family + Google Fonts load). The Settings Terminal/Inter toggle still works (Inter swaps the whole site). Mono is fixed-width → when adding/resizing headings, size by SIZE + letter-spacing, not weight; check long strings don't overflow (sidebar wordmark, landing hero). **In injected-CSS JS files that build styles as single-quoted string arrays (lt-settings.js), write font-family with DOUBLE quotes (`"JetBrains Mono"`) — single quotes break the JS string.**

## Session — 2026-06-14 (latest²) — Full-site QoL "clean coat" pass (all local, not deployed, 0 console errors)

Objective audit of every section (landing, home hub, sidebar, intro/lesson/quiz, glossary, flashcards, simulator, community, settings, exam). Verdict: the site is already mature/polished — so this pass made high-value changes, not churn. Four shipped:

1. **Lesson & intro bullets → definition rows (flagship; every lesson, courses 1–3).** `.lesson-bullets` (lt-styles.css) redesigned: thin "–" marker → a crisp 6px accent **square**; leading **`strong:first-child` term/label now accent-coloured** (theme-aware via `--mod-accent`) so the "key" of each line pops like a glossary entry; gap 7→10px, line-height bump. Pure CSS, scoped precisely — leading terms accent, mid-sentence `<em>`/`<strong>` stay neutral. Verified C1 (teal) / C3 (purple) / C4 (pink, markers only) + light + mobile.
2. **Header consistency across all 6 hub views.** New `setHubHeader(pageName)` helper (lt-engine.js) wired into `showHome/showGlossary/showFlashcards/showSimulator/showCommunity/showSettings` → header now reads "Learning Hub / <Page>" instead of a stale chapter title. (Bug: tool views never updated the header.)
3. **Quiz direction-answer marker (courses 1/2, 57 answers).** Replaced the baked-in flat "● " glyph in the data render with a state-aware `.answer-dot` (outline circle in `currentColor`) — neutral at rest, teal on hover/correct, red on wrong. Engine strips a leading "● " from the answer text; CSS draws the dot. Verified correct→teal.
4. **Flashcard copy redundancy.** Pre-flip below-card hint was a 3rd "flip" instruction ("Tap the card to flip it over"); changed to preview the grade step → "Reveal the definition, then rate how you did" (lt-flashcards.js).

**Tooling note for next session:** the preview's native window is narrow (~395px = mobile) and renders faithful screenshots; 768 (tablet) is also faithful. Large widths (1280/1440) are faithful **only after a viewport-size *change*** — right after a `location.href` reload the screenshot canvas is stale (content crammed into the top-left over black); fix by calling `preview_resize` to a *different* width, then screenshot. DOM measurements (`getBoundingClientRect`/`getComputedStyle`) are always reliable regardless. Checked source before "fixing" 2 phantom issues (simulator hint text, exam progress bar) — both were fine.

**Bolder second pass (same day) — 3 more surfaces (0 console errors):**
- **Flashcards → centered study stage (lt-flashcards.js 1.9.2).** `.fc-wrap` now `flex:1 0 auto` column filling the content-area; new `.fc-stage` (`flex:1; justify-content:center`) vertically centres the card+grade+kbd group so the card is the focal point instead of floating over a void. Card min-height 260→300, added a float shadow + faint accent ring on `.fc-face`. Empty/results branches also wrapped in `.fc-stage`. Verified desktop + mobile, flip + grade still work.
- **Simulator order terminal — breathing room (lt-sim-ui.js 1.15.10).** Horizontal-only (won't push the Execute button down): terminal column 340→364px, grid gap 12→16; side padding 12→16 across term-header / fields / risk-row / lev-row / calc / exec-wrap / warn; `.sim2-field` 10→11px. Dense-but-functional trading layout left intact.
- **Quiz answer buttons — tactile + consistent (lt-styles.css 1.94.0).** Unified the teal hover onto *all* answers (was direction-only) + added `:active` press-down. **Styled the A/B/C/D `.answer-letter-badge` which previously had NO CSS** (plain text) → a 24px rounded chip that adopts the button's state colour (muted at rest; currentColor on hover/correct/wrong), matching the direction-quiz `.answer-dot` from the first pass.

## Session — 2026-06-14 (latest) — Adaptive chapter template, the keystone (all local, not deployed, 0 console errors)

- **Adaptive chapter template — framework built + first concept chapter piloted (audit #1).** Charts now carry a `format` so a visual slot can opt out of candlesticks instead of inventing fake OHLC for an abstract idea.
  - **Engine (`lt-engine.js`):** new `isChartSlot(def)` (true when `format` is absent/`'chart'`) gates `renderTeachingChart` in both `renderIntro` and `renderLesson`. New `conceptCardHtml(bodyId, def, videoUrl)` renders an honest visual: ordered flow (`steps[]`, optional `cycle`/`cycleLabel`) + `checklist[]` + `note`, inside a `.chart-card` shell that inherits `--mod-accent`. `renderIntro`/`renderLesson` dispatch on `introChart.format`/`lessonChart.format === 'concept'`. `setIntroView` generalized to also toggle `#concept-intro` (so the Diagram⇆Video tab works on concept cards — `'chart'` view = show diagram). `'tool'` format reserved (annotated UI-mock) but not yet wired.
  - **CSS (`lt-styles.css`):** new `.concept-card`/`.concept-flow`/`.concept-step`/`.concept-node`/`.concept-cycle-note`/`.concept-check`/`.concept-note` (modeled on `.roadmap-*`, theme-aware via `--mod-accent`) + mobile overrides. No collision with the existing `.concept-table`.
  - **Pilot — C3 Ch18 "The Art of Meditation" intro (`lt-data-course3.js`):** replaced the nonsensical "Decision Objectivity" rising-candles chart with a `format:'concept'` card: the focus → wander → notice → return loop (`cycle:true`) + a "what it builds" checklist + a Headspace note. The **lesson** chart (a legit range-bound read) was left as candlesticks on purpose — proves per-slot routing works within one chapter.
  - **Schema documented** in the `lt-data.js` header comment (`format: 'concept' | 'tool'`).
  - **Verified** in preview: concept card renders (4 steps / 4 checks / cycle note), Diagram⇆Video toggle hides/shows the diagram + theater mode, lesson step still mounts a real candlestick (no regression), light + dark + mobile all clean, 0 console errors.
  - **Remaining for the template:** `'tool'` format (annotated UI-mock) for exchange-screen chapters like C3 "Deposit and Withdraw"; then sweep other forced-chart concept chapters (e.g. C3 trader-mindset/journaling sessions) onto `format:'concept'`.

## Session — 2026-06-14 (later) — "line boxes" bug + font unification to Terminal (all local, not deployed)

- **"Weird line boxes" on the sides — FIXED (took two tries).** First wrongly blamed the `.content-area` `background-attachment:fixed` (de-fixed it — didn't help). Real cause: the **film-grain `body::after`** (added in later-4) used `mix-blend-mode:soft-light` on a fixed full-viewport layer → forced an isolated GPU compositing layer that left visible **seams down the content/sidebar edges**. Diagnosed via `elementsFromPoint` (no element had any border/shadow at the edges → render artifact, not CSS border). **Removed the grain entirely** (its 4.5% texture wasn't worth a visible bug; the ambient glow still carries depth).
- **Single font: JetBrains Mono ("Terminal") everywhere; Barlow Condensed removed.** Bulk `sed` replaced `'Barlow Condensed'`→`'JetBrains Mono'` across all files + removed the Barlow Google-Fonts loads (added weight 800 to the JetBrains load). **Regression I caused + fixed:** the `"Barlow Condensed"` (double-quoted) → `'JetBrains Mono'` (single-quoted) replacement broke 3 lines in **lt-settings.js** (single-quoted JS string array) → the file failed to parse → `LT_COURSE_NAMES`/settings fns vanished → home cards showed "Course 1/2/3/4". Fixed to `"JetBrains Mono"` (double quotes). `node --check` all JS clean now.
- **Heading re-tune for mono** (mono is wider + heavier than condensed Barlow): logo wordmark 19→14px (was clipping the sidebar), landing hero 67→41px (+responsive), sec-head/cta heads, `.content-card-heading` 20→17, `.lt-home-hero-title` 27→22, glossary/sim/flashcards/community titles, exam title/score, cert recipient/name/course. Weights 800/900→700, tighter negative letter-spacing. Verified home/lesson/quiz/glossary/landing/cert: nothing clips, headings sized cleanly, course names restored, **0 console errors**.
- **NOT done this turn (honest — deferred to avoid cramming more after the regression):** the **teaching-chart + quiz-reveal UI overhaul** (user emphasised "don't yes-man me on chart scenarios"), the **mobile step-indicator / swipe gestures** ("nobody touches desktop"), and a **full spacing audit** (the heading retune covered a chunk). These are the next focus.

## Session — 2026-06-14 — side-seam bug + glossary mobile header + C2/C4 colour swap (all local, not deployed)

Three user-reported items. `lt-styles.css 1.83.0`, `lt-glossary.js 1.16.4`, `lt-engine.js 3.59.0`, `index.html` (no-cache). **0 console errors.**

- **"Boxes on the sides" colour bug (desktop).** The `.content-area` ambient glow used **`background-attachment: fixed`**, which sizes/positions the gradient to the *viewport* while the element is offset by the sidebar — producing visible rectangular seams down the side gutters (worsened by the `mix-blend-mode` grain compositing on top). Removed `background-attachment: fixed` (→ default `scroll`, which anchors the glow to the content-area's own frame — the intended "stays put while content scrolls" behaviour anyway, minus the seam). Light override too. Gutters verified clean.
- **Glossary header ate ~half the mobile screen.** The `≤600px` rule stacked the toolbar 3-tall (search / Filter / dev "Unlock all" each full-width) on top of a 2-line title + 2-line meta. Rewrote it: title 28→21px, **`.gl-sub` (verbose meta) hidden**, **`.gl-bypass` (dev/preview-only "Unlock all") hidden on mobile**, search gets its own full row + Filter fills row 2. First term card now starts ~222px down (was ~400+). Desktop unchanged.
- **Swapped Course 2 ⇄ Course 4 accents.** `LT_COURSE_ACCENTS` + `_LIGHT` (`lt-engine.js`): C2 now **coral** (`#ff7a4d` / light `#ea580c`), C4 now **hot-pink** (`#ff2e88` / light `#db2777`). Landing cards (`index.html`): C2 `--coral`, C4 `--pink`. Propagates everywhere via `ltCourseAccent(n)` (sidebar, hub cards, progress duotone, settings, charts). New spectrum: C1 cyan · C2 coral · C3 purple · C4 pink.

## Session — 2026-06-13 (later 6) — mobile overhaul + Vice Terminal brand relocation (all local, not deployed)

User: revamp mobile to be as good as desktop; **remove "by Vice Terminal" from the sidebar header** and rehome it. `lt-styles.css 1.82.0`, `lt-settings.js 1.26.0`, `lt-sim-ui.js 1.15.7`, `lt-index.html` + `index.html` (markup, no-cache). **Verified dark + light, mobile + desktop, 0 console errors.**

- **Brand relocation.** Removed the cramped "by 🦩 VICE TERMINAL" lockup from the **app sidebar header** (`lt-index.html` `.logo` → just candle + "Liquidity Theory") and the **landing nav** brand (kept the landing *footer* brand). Rehomed the parent brand to clean, intentional spots: (1) **`.sidebar-brand-foot`** — "🦩 A **Vice Terminal** product" pinned at the foot of the sidebar / mobile drawer (classic product-top / parent-foot separation); (2) a centered **"A Vice Terminal product"** line at the bottom of **Settings**; (3) landing **footer** (unchanged). All use the masked-gradient `.vt-flamingo` (theme-recolours). Dropped the now-dead `.logo-by*`/`.logo-textwrap` CSS.
- **Settings rows were BROKEN on mobile (real bug).** `.lt-settings-row` stayed `display:flex` row at all widths → labels like "Course 1 · Laying the Foundation" wrapped to 5 lines and the Mark Complete/Reset buttons overlapped the text. Fixed via a `≤768px` block **inside the injected settings styles** (correct cascade — they load after lt-styles.css): rows `flex-direction:column; align-items:stretch`, controls `width:100%`, button groups (`.lt-course-actions`, `.lt-font-opts`, `.lt-color-toggle`) `> * { flex:1 }` → big 50/50 split buttons. Huge improvement.
- **Mobile footer nav** (`≤768`): Back/Next went from arrow-only minimal buttons → **two big labelled equal-width buttons** (`flex:1`, "← Back" / neon "Next →") filling the footer. Far clearer + thumb-friendly.
- **Header touch targets** (`≤768`): `.icon-btn`/`.menu-btn` → 40×40 inline-flex (were ~28px); Discord 30→38.
- **Simulator stats** (`≤600`): were a ragged 3+1; now an even **2×2** (`.sim2-stat{flex:1 1 calc(50% - 5px)}`). (Topbar wrap from later-5 holds.)
- **Home Tools 3+2** (`≤600`): the Tools tiles are now the primary mobile nav to Sim/Glossary/Flashcards/Community/Settings (those header icons are hidden on phones since later-5), so made them a tidy `repeat(3,1fr)` grid instead of a ragged 2+2+1.
- **Native-feel globals:** `-webkit-tap-highlight-color:transparent` (no grey tap-flash) + `text-size-adjust:100%` (no iOS type inflation).
- **Verified:** drawer (header clean / foot-brand both themes), Settings stacked + brand line, sim 2×2, footer labelled buttons, home tools 3+2, landing nav cleaned + footer brand kept, **desktop unchanged** (all mobile rules scoped ≤768/≤600), 0 errors.
- **Known/!done (engine-level, deferred):** the **top header shows stale lesson context** on non-course views (Simulator/Settings/Glossary keep the last lesson title) — needs `header-info` to update per view in `lt-engine.js`. Bigger "kickass" ideas not done: a mobile-visible step indicator (Intro/Lesson/Quiz), swipe-to-page gestures.

## Session — 2026-06-13 (later 5) — full QA sweep: formatting/scaling fixes + cert glow (all local, not deployed)

Swept every surface (home, lesson, quiz, glossary, settings, simulator, flashcards, community, exam, cert, landing) × dark/light × desktop/laptop(1120)/mobile(375)/tiny(320). Found + fixed **4 real bugs**; rest verified clean. `lt-styles.css 1.80.0`, `lt-sim-ui.js 1.15.6`, `index.html` (landing, no-cache). **0 console errors.**

- **Simulator chart topbar overlap (bug).** `.sim2-chart-topbar` used `justify-content:space-between` and wrapped only via a *window-width* media query — but the chart sits in a 2-col panel that's narrow even on desktop, so the symbol/price/timeframe collided ("Synt$33,215 4H FLAT"). Fixed: base `flex-wrap:wrap` + `flex-shrink` + ellipsis on `.sim2-chart-sym` → wraps to two tidy rows on narrow panels, never overlaps. (`lt-sim-ui.js`)
- **Landing nav cramped at 921–1080px (bug).** `.nav-links` only hid at ≤920, so in the 921–1080 band the links wrapped ("How it works" → 3 lines) and the "Open the app" CTA clipped off-screen. Fixed: hide nav-links at **≤1100px** + `white-space:nowrap` on links. (`index.html`)
- **Landing CTA clipped at ≤~360px (bug).** Brand(169) + CTA(148) exceeded 320 (spacer collapsed → 4–66px overflow). Fixed: added a `≤380px` compaction tier (brand 22px logo / 15px wordmark, CTA 12px/8-11pad, gap 8) → CTA right lands exactly at the 16px padding edge at 320; verified clean + well-proportioned at 375 too. (`index.html`)
- **Mobile header crowded out the lesson title (bug).** 6 header icons + Discord crushed the title to "SE…2" at 320. Fixed: `@media(max-width:768px)` hides Simulator/Flashcards/Community/share header icons (all reachable via the Home-hub Tools row) — keeps Glossary + Settings + Discord; title now readable (gained ~134px). (`lt-styles.css`)
- **"Amazing" beat:** the **certificate** (a shareable moment) was on flat black → added a celebratory cyan/magenta/purple glow field behind it (+ light-mode override). It floats now. The exam screen was left calm (focus) by choice.
- **Verified clean (no change needed):** flashcards (accent course tabs), community (honest copy, blurple Discord), exam (2×2 answers), laptop 1120 lesson (sidebar 210, no overflow), all the later-4 atmosphere/grain/neon across views.
- **Noted, not changed (minor/optional):** exam screen stays flat (intentional); Community "About Liquidity Theory" heading still cyan-only gradient vs the landing's cyan→magenta sweep (could unify); glossary schematic figures still draw structural red `#cc2222`.

## Session — 2026-06-13 (later 4) — clunky-lockup fix + atmosphere/grain/neon "make it great" (all local, not deployed)

User: lockup "looks clunky, find a cleaner solution" + "make it great, don't say good enough." `lt-styles.css 1.78.0` only (markup unchanged; all CSS). **Verified dark + light + mobile, 0 console errors.**

- **Brand lockup — root cause fixed.** The app sidebar wordmark `.logo-text` used the wide **mono** body font, so "Liquidity Theory" *wrapped to two lines* → a cramped 3-line stack next to the icon. Switched it to **Barlow Condensed 800 / 19px / `white-space:nowrap`** (matches the landing wordmark) → one confident line. Refined the parent line (`by` 8px muted · flamingo 13px · `VICE TERMINAL` 9px pink, 1.6px tracking) so it's a tidy 2-line lockup. Candle icon bumped 22→24px. (Landing brand already used Barlow → untouched.)
- **Atmosphere (the big "great" lever).** The flat near-black canvas was the template tell. `.content-area` now carries an **ambient neon glow field** (cyan top-right, purple left, magenta bottom — `background-attachment:fixed` so it sits still while content scrolls) on *every* view; the home variant keeps its grid on top. Light-mode override with deep-teal/violet/rose. Previously-flat views (glossary/settings/lesson) now have real depth.
- **Film grain.** Fixed full-viewport `body::after` noise overlay (`feTurbulence` SVG, **base64-encoded** — the `;utf8,` inline form was malformed and silently failed; base64 fixed it), `mix-blend-mode:soft-light`, opacity .045 dark / .03 light, `z-index:400` (above chrome, below modals/toasts), `pointer-events:none`. Kills gradient banding + adds a tactile premium quality.
- **Neon primary CTA.** `.btn-primary` flat fill → theme-aware vertical gradient (`color-mix(--teal, white)` top) + a layered neon shadow (1px ring + soft coloured drop + inset top highlight); intensifies on hover, settles on `:active`. The Resume/Start CTAs now glow.
- **Branded text selection** (`::selection` cyan dark / deep-teal light) — a small craft detail.
- **Verified:** wordmark one line (dark+light+mobile, no overflow), grain SVG decodes (160×160, was failing), atmosphere on glossary/home, neon button both themes, 0 console errors. Rules kept: cyan primary, candle logo + structural `RED` untouched, breakpoints intact.

## Session — 2026-06-13 (later 3) — "Neon-noir" pro-UI overhaul (all local, not deployed)

User mandate: "overhaul… as clean and professional as possible, proper design principles." **Thesis = "neon-noir terminal":** resolved the Miami-loud ↔ clean-pro tension toward *discipline* — sophisticated near-black foundation, **cyan as the single primary**, **magenta as a precise accent** (not a rainbow), restrained purposeful glow, crisp borders, off-white text, polished interaction states. Kept the mono/Barlow type identity (it *is* "Vice Terminal") + the Miami palette. `lt-styles.css 1.75.0`, `lt-settings.js 1.25.0` (theme objects), `lt-glossary.js 1.16.3`. **Verified dark + light + mobile (lesson/glossary/home), 0 console errors.**

- **Refined token foundation** (dark `LT_DARK_THEME` + `:root` mirror): off-white text `#f6f5fb` (pure white reads harsh), crisper borders for card definition (`--border #272235` etc.), tighter *natural* shadows (`0 16px 44px -16px rgba(0,0,0,.72)` — dark-on-dark drop-shadows don't read, so elevation leans on borders), slightly lighter raised surfaces (`--bg4/5`). New `--surface-hi` token = a 1px top-edge inner highlight ("lit from above") applied to `.content-card`/`.quiz-card`; overridden to `none` in `html.theme-light` (white cards don't need it).
- **Header decluttered → ghost icon buttons.** `.icon-btn` lost its resting border (the right cluster was 5 boxed icons); now transparent at rest, subtle `--bg4` fill + hairline on hover, `--bg5` on `:active`. Big cleanliness win on every screen.
- **Wayfinding tied to course colour.** `.chapter-item--active` was hard-coded teal → now `color-mix` of `--course-accent` (cyan/pink/purple/coral), neutral `--bg3` hover. The active session now matches its course.
- **Colour discipline.** Glossary card category badges (`.gl-cat`) were teal on *every* card — overloading teal (which also = links via the cross-links). Muted to neutral metadata (`--text3`/`--bg4`), reserving teal for interaction.
- **Interaction polish.** `.btn-primary:active` press state (settle + dim). (Course-card / tool hover-glow + masked-gradient flamingo + duotone progress system carried over from later/later-2.)
- **Verified:** home (dark+light+mobile, no overflow), C1 lesson (content card elevation + chart intact), glossary (muted chips, teal links), header ghost icons across views, light-mode `--surface-hi:none`. **Rules kept:** cyan primary, candle logo + structural `RED` untouched, breakpoints intact, every changed file cache-bumped.
- **Deliberately NOT churned (risk vs reward):** the mono body font (brand-correct for a "terminal"; user has an Inter toggle), global radius scale, and the per-lesson chart internals. Open if the user wants a specific surface pushed further.

## Session — 2026-06-13 (later 2) — Miami Vice UI audit + polish + flamingo upgrade (all local, not deployed)

Pro-designer audit of the Miami reskin + the Vice Terminal lockup, then fixes. **Diagnosis:** the first pass read as "dark theme + pink sprinkles," not a cyan↔magenta *system* — no gradients (the soul of synthwave), flat low-separation surfaces, no hero focal energy, and a muddy 12px flat-pink flamingo. `lt-styles.css 1.74.0`, `lt-index.html` (markup), `index.html` (landing). **Verified dark + light + mobile, 0 console errors.**

- **Signature duotone gradient SYSTEM.** New tokens `--grad-miami` (90° cyan→magenta), `--grad-miami-d` (135° cyan→purple→magenta sunset), `--grad-flamingo` (dimensional pink) in `:root` + an `html.theme-light` override block (deep-teal→rose, white-safe) — gradients live in CSS, not the JS theme objects (simpler, still theme-resets). Applied to every progress indicator: **global top strip** + **sidebar fill** = `course-accent → --pink` (keeps per-course context, flies the duotone: C1 cyan→pink, C3 purple→pink, C4 coral→pink), **home overall fill** = `--grad-miami`, course-card fills inherit. Landing **hero headline** ("one candle at a time") regraded cyan-only → `cyan→purple→magenta` sunset sweep — the page's focal point.
- **Flamingo upgraded to a masked gradient mark (the "better way").** Instead of a flat-pink `<img>`, the flamingo is now a `<span>` painted with `--grad-flamingo` and clipped by `-webkit-mask/mask: url(vice-terminal.png?v=1)` — so it's crisp at any size, **theme-recolourable** (deeper rose in light), carries a neon `--pink-glow` drop-shadow, and reads as a dimensional neon sign. Shared `.vt-flamingo`/`.logo-flamingo` (app) + `.brand-flamingo` (landing). Lockup typography refined: bumped to 15px, `by` = small muted lowercase, `VICE TERMINAL` = pink uppercase tracked (1.3px). Updated all 3 placements (sidebar + landing nav + footer).
- **Surface depth.** Course cards + tool tiles gained an **accent-coloured hover glow + 2px lift** (`box-shadow` via `color-mix` in the card's `--caccent` / teal-glow). Cards no longer blend into the bg.
- **Verified:** painted progress widths to confirm the duotone bars in both themes; masked flamingo renders + recolours (dark `#ff6cae→#d61f6f`, light `#ec4899→#be185d`); hover glow tasteful + drives the existing course-peek; landing hero sweep; no overflow; 0 console errors. **Rules kept:** cyan still primary (CTAs/nav-next solid cyan), candle logo + structural `RED` untouched, laptop breakpoints intact.
- **Optional next (not done):** could regrade the primary CTA / `nav-next` to a subtle cyan gradient, add the duotone to landing stat/step numbers, or a faint synth-horizon glow on the app shell — held back to avoid over-glowing.

## Session — 2026-06-13 (later) — Vice Terminal parent-brand lockup (all local, not deployed)

Introduced the **parent brand "Vice Terminal"** (pink flamingo) alongside the existing product brand. The framing is **"Liquidity Theory by Vice Terminal"** — the **candle mark + "Liquidity Theory" wordmark stays the primary product logo**; a small **flamingo + "Vice Terminal"** lockup sits beneath it as the publisher. (User context: Vice Terminal will be the umbrella site/terminal they plug this into later; this section stays Liquidity Theory.) `lt-styles.css 1.73.0`, `lt-index.html` (markup + title, no-cache), `index.html` (landing, no-cache), NEW asset `vice-terminal.png`. **Verified in preview, desktop + mobile, 0 console errors.**

- **NEW asset `vice-terminal.png`** — the flamingo, 1254² transparent RGBA (hot-pink `~#ff2e88`, matches `--pink`). Sourced from the user's Desktop (`…-Photoroom.png`, bg already removed); copied in as-is (no PIL/ImageMagick available to trim — handled via CSS `object-fit:contain`). Referenced with `?v=1`.
- **Reusable "by Vice Terminal" lockup.** App side (`lt-styles.css`): `.logo-textwrap` wraps the wordmark in a column; `.logo-by` = `by` (`--text3`) + `.logo-flamingo` (12px, `object-fit:contain`, `--pink-glow` drop-shadow) + `.logo-by-name` (`--pink`, bold, uppercase). Landing side mirrors it with `.brand-stack`/`.brand-name`/`.brand-by`/`.brand-flamingo`/`.brand-by-name`.
- **Placements (always-visible chrome):** (1) **App sidebar header** (`lt-index.html` `.logo`) — restructured to candle-icon + stacked `Liquidity Theory` / `BY 🦩 VICE TERMINAL`. (2) **Landing nav** + (3) **landing footer** brand (`index.html`, both `.brand` instances) — same stacked lockup; added `flex-shrink:0` on `.brand` + `white-space:nowrap` on `.brand-name` so the wordmark stays one line when the nav is tight. (4) **Landing footer copy** → "© [year] **Vice Terminal · Liquidity Theory** — Educational content only, not financial advice." (5) **App `<title>`** → "Liquidity Theory · Vice Terminal".
- **Candle logo glow** already dual cyan/pink from the Miami pass; the landing `.brand-logo` was bumped to match (cyan+pink drop-shadow, 28px).
- **Verified:** flamingo loads in all 4 spots (app sidebar + 2 landing brands), pink name renders, app title updated, **no horizontal overflow at 375px**, 0 console errors.
- **NOT done (deliberate — flagged for later when the Vice Terminal umbrella is built):** the deeper rebrand is untouched — landing SEO `<title>`/meta description, the **OG share image** (still Liquidity-Theory-only — `tools/build-og.js`/`og-image.png`), `tools/gen-seo.js` page titles, and the `liqtheory.com` domain. Also did not add the flamingo to the exam header / certificate / (retired) welcome modal — easy follow-ups if wanted.

## Session — 2026-06-13 — Miami Vice × synthwave theme reskin (all local, not deployed)

Re-skinned the whole site to a **Miami Vice + hint-of-cyberpunk/synthwave** aesthetic per user direction. **Cyan stays the brand primary**; **hot-pink/magenta** is the new signature secondary, with **neon-purple** and **sunset-coral** as supporting accents over a deep indigo **"Miami night"** backdrop (no longer flat black). Tasteful-neon intensity — legibility preserved. **Both themes** done (dark is the hero; light = a "Daytime Miami" pastel variant). `lt-settings.js 1.24.0`, `lt-engine.js 3.58.0`, `lt-styles.css 1.72.0`, `index.html` (landing, no-cache). **Verified in preview, dark + light, 0 console errors.**

- **Palette (the foundation).** Rewrote `LT_DARK_THEME` / `LT_LIGHT_THEME` (`lt-settings.js`) and the matching `:root` defaults (`lt-styles.css`) — both carry the full var set so toggling fully resets. Dark bg ramp `#070510 → #241d3f` (indigo night), purple-tinted borders, body text → lavender-grey `#a39ab8`. New theme-aware tokens added to **both** theme objects + `:root`: `--pink/--pink2/--pink-dim/--pink-glow/--pink-faint`, `--purple/--purple-dim/--purple-faint`, `--coral/--coral-dim`, plus `--glow-pink`. `--green` nudged to neon-mint `#21d196`, `--red` (CSS UI var only) to rose `#f23d5c`, `--gold` warmed. **Light** keeps white cards + slate text (legibility first) on a faint lavender canvas `#f6f4fb`, with deeper white-safe accents (pink `#db2777`, purple `#7c3aed`, coral `#ea580c`).
- **Course accents → Miami neon spectrum** (`lt-engine.js`): `LT_COURSE_ACCENTS = {1 cyan #00d4d4, 2 hot-pink #ff2e88, 3 purple #a855f7, 4 sunset-coral #ff7a4d}`; light variants `{1 #0d9488, 2 #db2777, 3 #7c3aed, 4 #ea580c}`. Ripples through sidebar, home hub, in-course header/banner/bullets, settings, charts via `ltCourseAccent(n)`.
- **Synth "hints" (restrained).** Dual cyan/pink **neon-sign glow** on the brand logo (`.logo-icon`) + welcome-modal mark. Home-hub backdrop (`.content-area--home`) + landing `body::before` gained a **hot-pink sunset radial** alongside the cyan/purple glows, with grid lines retinted purple (both light + dark variants updated to match).
- **Landing page** (`index.html`): `:root` tokens → Miami night + new `--pink/--coral`; Course-02 card accent gold → **hot-pink**; `--c4` → coral. Served no-cache (no `?v=` bump).
- **Rules respected:** cyan primary untouched; candle defaults unchanged (cyan up / white down — didn't destabilize the 232 teaching charts / `candleColors`); the chart **`RED='#cc2222'` JS constant for structural annotations is unchanged** (verified the "Hammer!" sell annotation still draws `#cc2222`); laptop breakpoints untouched at end of CSS.
- **Verified:** home hub, C4 indicator lesson (candleColors chart intact), C1 quiz (cyan "correct" + neon-mint explanation + chart reveal with structural-red annotation), light mode home, landing hero — all clean, 0 console errors.
- **Possible follow-ups (not done):** could push candles to a cyan/magenta synthwave dual-tone (bigger change — would touch all teaching charts + `candleColors`); could add a faint scanline/horizon-grid texture to the app shell; exam/cert/glossary/flashcards/community/sim screens use themed vars so should inherit cleanly but weren't each screenshotted.

## Session — 2026-06-09 (later 17) — 3 requested fixes + youtube icon

- **Live BTC hero chart hidden on mobile (`index.html`).** `@media(max-width:768px){ .hero-chart-card{display:none} }` AND the chart's IIFE now early-returns on `matchMedia('(max-width:768px)')` so it skips ECharts init + the Binance fetch entirely (no wasted work / hidden-node render). Nav BTC ticker is a separate IIFE, untouched. Mobile hero is now text-first (logo → headline → CTAs).
- **Sim entry indicator legible over candles (`lt-sim-ui.js 1.15.4`).** The Entry order-line tag was a muted grey pill (`#8a8f98`) with near-black text — hard to read on the candles. `buildLine` gained an `opts.contrastTag` mode: opaque tag bg + coloured border + contrasting text, **theme-aware** (dark mode: dark pill / light text; light mode: light pill / dark text), and the entry line itself brightened (`#aeb4c0` dark / `#64748b` light). SL/TP keep their solid red/teal fills. Verified both themes.
- **Glossary filters hidden behind a Filter button (`lt-glossary.js 1.16.2`).** The category-chip row (`.gl-cats`) is now `hidden` by default; a new **Filter** button (`#gl-filter-btn`, sliders icon + chevron) in the toolbar toggles it (`_glToggleFilters`, `_glFiltersOpen` state). The button shows the active category when one is picked (e.g. "Filter" → "Candlesticks") and keeps the `has-filter`/active style even when the chips are collapsed, so an active filter is always visible. Page search placeholder renamed "Filter terms…" → "Search terms…" to disambiguate from the category Filter. Verified: hidden by default, opens/closes, selecting filters the list + updates the button, closing keeps the filter active.
- **Fixed an invalid Lucide icon (`lt-community.js 1.10.1`).** The YouTube "Browse Playlists" button used `data-lucide="youtube"` — a brand icon removed from the loaded Lucide build, so it rendered blank AND spammed the console ("icon name not found"). Swapped to `play-circle` (the card still has the real YouTube logo SVG). 0 remaining `youtube` refs.

- **Sim order-tag positioning fixed (`lt-sim-ui.js 1.15.5`).** Follow-up: the Entry/SL/TP price tags were pinned to the right edge of the plot but the candles filled that far too, so the tags overlapped the most recent bars. Gave them a dedicated **right gutter** (TradingView-style): `SIM_GRID.right 16 → 98`, `tagX = W - tagW - 4` (tags pinned far-right, in the gutter), `lineX2 = W - SIM_GRID.right` (dashed line spans the candle area and stops at the gutter edge). Moved the grey "Key Level" markLine label `position:'end' → 'insideStartTop'` so it doesn't land in the gutter with the tags. Verified desktop + mobile: tags sit beside the candles, never on them (candle area ~187px on a 341px mobile chart — tighter but readable).

All local, 0 console errors, versions bumped. **Needs a push/deploy to go live.**

## Session — 2026-06-09 (later 16) — landing page mobile scaling fix (`index.html`)

The marketing landing (`index.html`) "scaled weird and wouldn't lock" on phones. **Root cause:** the hero text-art logo (`<pre id="hero-logo">`, a 64-char digit grid stretched by `transform:scaleX(1.667)`) renders ~545px wide on mobile and **its width is driven by the transform, not `font-size`** (the digit grid ignores font-size — a min-font-size clamp), so it had no mobile handling and forced the browser to **zoom the layout viewport out** (to ~569px), which then pushed past the `≤560px` breakpoint so the mobile rules never even fired (classic trap). Compounded by `html` lacking `overflow-x:hidden` (only `body` had it).
- **Fixes:** (1) `html{overflow-x:hidden}` — the actual "lock to device-width" fix. (2) `.hero-logo` reverted to `font-size:4px`; on `≤560px` it's scaled with `transform:scaleX(1.667) scale(0.5)` (uniform shrink, preserves the 1.667 aspect, immune to the font clamp) → fits at ~273px. (3) New `≤380px` block: side padding 24→16 + `.hcc-head{flex-wrap:wrap}` so the nav CTA + chart "LIVE" badge don't clip on tiny phones (also makes the 375 chart-card header cleaner — symbol row over a prominent price/LIVE row). (4) `.foot-links{flex-wrap:wrap}`.
- **Verified:** viewport locks at **320 / 375 / desktop**, 0 overflowing elements, logo fits, headers clean, **desktop unchanged** (mobile rules don't apply ≥561px), 0 console errors. `index.html` is served no-cache (no `?v=` bump needed). **Local — needs a push/deploy to go live on liqtheory.com.**

## Session — 2026-06-09 (later 15) — custom domain liqtheory.com (all local, not deployed)

Acquired `liqtheory.com` + `www.liqtheory.com`. Baked the **apex** (`https://liqtheory.com`) in as the canonical domain everywhere the code hardcodes an absolute URL:
- **`index.html`** — `canonical`, `og:url`, `og:image`, `twitter:image` (and the stale "replace this domain" comment) → `liqtheory.com` (og/twitter image keep `?v=2`; the domain change alone busts social unfurl caches).
- **`tools/gen-seo.js`** — `BASE_URL` → `https://liqtheory.com`. Everything else (lesson canonicals, JSON-LD, `OG_IMAGE`, sitemap URLs, robots `Sitemap:`) derives from it. Re-ran the generator: 81 lesson pages + hub, **sitemap 83 urls**, robots — all `liqtheory.com`, 0 `vercel.app` leftover.
- **In-app links unchanged** — share (`_ltAppUrl`, `ltShareSite`, `ltCopyLessonLink`, `ltShareCourse`) and cross-device sync (`ltBuildSyncLink`) all build from `location.origin`/`location.pathname`, so they auto-produce `liqtheory.com` URLs once served from the new domain. No hardcoded domains in any `lt-*.js`.
- **`vercel.json` untouched** — domains/redirects are dashboard-managed, not config. The www→apex 301 is the Vercel primary-domain setting (see deferred #6 for the exact dashboard + DNS steps). Chose apex over www (cleaner brand); flipping to www later = change `BASE_URL` + the 5 `index.html` lines.

## Session — 2026-06-09 (later 14) — emoji→icon sweep + verdict cleanup + site audit (all local, not deployed)

De-emoji'd the app (replaced colourful emoji with Lucide icons), cleaned up the sim verdict copy, and ran a critical site audit. `lt-engine.js 3.57.0`, `lt-styles.css 1.70.0`, `lt-sim-ui.js 1.15.2`, `lt-settings.js 1.23.1`, `lt-glossary.js 1.16.1`, `lt-data*.js +0.0.1`. **Verified in preview, 0 console errors.**

### Sim verdict card — de-cluttered (user feedback: "feels clunky and too AI")
- **Emoji removed:** the result line's 🛑/🎯/💥/✅/❌ are gone — the big colour-coded number + the icon'd status chip (`shield-off`/`check-circle`/`zap`/`clock`) carry the outcome. Streak 🔥, Random 🎲 (→ `dices`), direction ▲/●/▼ (→ `trending-up`/`minus`/`trending-down`), flat ●, account-blown 💀, and the margin/liq ⚠ warnings all removed/iconified.
- **Merged + tightened:** the separate "✓ Bias aligned" line and the coaching line are now ONE icon-led `.sim2-verdict-coach` row (check = good read / alert-triangle = warn / x = wrong / minus = neutral, colour on the icon only). Copy rewritten terse, trader-voice (e.g. "Right read. It failed anyway — that's what the stop is for." instead of the old wordy "Even A+ setups fail ~1 in 3; this is exactly why…"). Flat verdict "● Stayed Flat" → "Stood Aside".

### Site-wide emoji → Lucide icons
- **`showToast(msg, dur, icon)`** gained an optional icon arg (renders `<i data-lucide>` + `createIcons()`; `.toast` is now flex). All emoji toasts across engine/settings/glossary updated (🎉→award, ⚠️→alert-triangle/lock, ✓→check, ✅→check-circle, 🗑️→rotate-ccw, 🔓→unlock, 🔒→lock).
- **Quiz "rule" callouts:** stripped the leading 📌 from **all 81** `rule:` strings in the data files; `buildExplanationHtml` now prepends a Lucide `pin` icon (`.explanation-rule` is flex). Verified the pin renders, no emoji.
- **Certificate:** 🏆 badge + watermark → Lucide `award` (gold badge / faint outline watermark; svg-sized in CSS).
- **Backup-completion popup:** 🎉 title → `award`, ✕ close → `x` (added a `createIcons()` after the popup mounts).
- **Left alone (not emojis):** chart-annotation glyphs (✓ ↑ ★ → on markPoints), answer-option ● bullets, nav arrows ← →, and the standalone **legacy prototype HTML files** (`trading-quiz.html`, `trading-demo.html`, `liquidity-theory-course1.html`, `sim-test.html`) — these aren't loaded by the app (see audit findings re: deleting them).

### Full-site audit (continued) — 2 bugs FOUND + FIXED, rest of the app spot-checked
Drove every remaining surface hands-on (flashcards, community, settings, exam→cert, light mode, mobile).
- **BUG FIXED — sim candles weren't theme-aware (`lt-sim-ui.js 1.15.3`).** The sim's own `_bc()`/`_bear()` returned the dark defaults (cyan / near-white `#f2f2f2`), so in **light mode the down-candles were white-on-white = nearly invisible**. Now they delegate to the engine's `getBullishColor()`/`getBearishColor()` (slate down / deep-teal up in light). The rest of the app already used the theme-aware versions; the sim had its own copies that were missed.
- **BUG FIXED — laptop breakpoints clobbered the mobile layout (`lt-styles.css 1.71.0`).** The `@media (max-width:1400px)` "Laptop L" block (chart-el 300/350, plus heading/body/padding sizes) sits AFTER the `max-width:768px` mobile block, and at phone widths BOTH match → the later laptop rules won, so **mobile charts rendered at 350px instead of the intended 270px** (and headings/body/padding got laptop values too), silently defeating the documented mobile pass. Fixed by floor-scoping that block to `@media (min-width:769px) and (max-width:1400px)` so it no longer overlaps mobile. Verified: mobile tall chart 350→270. (The `≤1150`/`≤1024` blocks only set sidebar-width/ticker-hide, which are benign at phone widths, so they were left as-is.)
- **Verified working:** flashcards (flip, both modes, self-grade, deck switch, completion screen with score + "Review N incorrect" spaced-repetition); community (all links `rel=noopener`, honest copy); settings (3 sections, theme/font/candle toggles, sync modal renders QR + link); exam→cert (gated by `allChaptersComplete`, neutral selection until submit, 10/10 scoring correct, certificate renders with the new `award` icon + editable name + correct date). **Stress tests held:** search XSS doesn't fire, malformed `#sync=` handled, 57px answer tap-targets, no horizontal overflow at 375px.
- **Minor finds (not fixed):** flashcard ✓/✗ grade-button glyphs could be Lucide icons for consistency; the in-course header tag ("Module 1 · Session 1") wraps a little awkwardly at 375px; the sim hardcodes `#cc2222` reds rather than the theme red (legible, low priority).

### Flagged findings — actioned (per user)
User confirmed "9,000 members" is accurate and `@MikeBTC` is the real handle (both kept). Fixed the rest:
- **Landing numbers reconciled (`index.html`):** stat "240+ Interactive lessons" → **"80+ Interactive sessions"** (matches the app's "Session" noun + the real 81-session count; the home hub shows "/ 81 sessions"), and the stale "75+ Glossary terms" → **"80+"** (glossary is 81). Left the `/learn/` SEO path + "Lessons" nav label as-is (changing them would unravel the SEO; they're a section name, not a quantified claim).
- **Softened 3 overstated Course-4 SA claims (`lt-data-course4.js 1.7.2`):** "Whale positioning… **consistently outperforms**" → "**tends to outperform**"; two "CVD peaks **(consistently) align with** tops" → "**often align with**." (Other "consistently" uses are factual scenario descriptions or distractor answers — left.)
- **Deleted 4 dead prototype files:** `trading-quiz.html`, `trading-demo.html`, `liquidity-theory-course1.html`, `sim-test.html` — unreferenced anywhere, git-tracked (recoverable), emoji-laden, were deployed + crawlable. Only `index.html` (landing) + `lt-index.html` (app) remain.
- **Flashcard tally → icons (`lt-flashcards.js 1.8.1`):** the `✓ N / ✗ N` header tally now uses Lucide `check`/`x` (the grade buttons already did). Minor consistency.
- **CORRECTION — the "quiz teaching-chart spoiler" finding was a false alarm.** On inspection, every pattern-name annotation lives in a `lessonChart` (teaching) or `revealMarkPoints` (shown only AFTER you answer); the pre-answer quiz `chart` blocks use neutral zones (Demand/Supply/Support) and hide the pattern name until reveal — the same hide-until-reveal principle as the sim. 85 quizzes use `revealMarkPoints`. Nothing to fix; "fixing" it would have stripped legitimate teaching labels. (I'd misread an already-answered quiz screenshot.)

### Critical audit — findings (NOT all fixed; flagged for decisions)
A two-hat (trader + UX) pass + stress tests. **Security held:** glossary search doesn't echo the query into innerHTML (an `<img onerror>` payload did not fire); a malformed `#sync=` fragment is handled gracefully (no crash). Open findings:
1. **Trading content is largely accurate** (break-even WR = 1/(1+R) ✓, Kelly ✓, 3 weeks = 63 funding periods ✓). A few SA claims are overstated as fact — "Whale positioning (top 20%) **consistently** outperforms retail" and "CVD peaks **align with** local price tops" (course 4) — recommend softening to "often/tends to."
2. **Landing vs app count/term mismatch:** `index.html` advertises **"240 lessons"** (counts intro+lesson+quiz steps, 81 sessions × 3) while the app now says **"Session"** everywhere and there are 81 sessions; and **"75+ terms"** while the glossary is now **81**. Reconcile the marketing numbers + noun with the app.
3. **"~9,000 members"** Discord count is **hardcoded** in `lt-community.js` and `lt-engine.js` (home banner). Verify it's true before public launch or it's a credibility risk.
4. **Quiz spoiler-ish bits:** some teaching-chart annotations name the pattern ("Hammer!") on quizzes that ask you to identify the signal, and a few hints lightly telegraph the answer. Lower stakes than the sim (guided teaching, not a blind test) but worth a pass.
5. **Dead prototype files** (`trading-quiz.html` etc.) are still deployed (Vercel serves all files) — emoji-laden, off-brand, and crawlable. Recommend deleting them.

## Session — 2026-06-09 (later 13) — Practice Simulator deep-dive audit + overhaul (all local, not deployed)

`lt-simulator.js 1.3.1`, `lt-sim-ui.js 1.15.1`. A two-hat (expert-trader + UX) audit of the Practice Simulator, **tested hands-on** (drove the terminal, swept all 17 patterns × 40+ seeds in the browser, tried to break the inputs), then a full overhaul. **Verified in preview, desktop + mobile, 0 console errors.**

### Audit findings (what was wrong)
- **The chart printed the answer.** Every round drew a dashed line labeled with the exact pattern name ("Double Top", "Liquidity Sweep"). In Random mode that handed you the answer.
- **The textbook answer won ~100% of the time.** A 40-seed sweep showed following the stated bias paid on ~100% of rounds — no fakeouts, no failed setups. Trained false certainty.
- **4 generators were broken — the chart contradicted its own label.** `liquidity_sweep` rendered a *clean uptrend to new highs* (entry +22% above the "swept" level, no sweep visible — the sweep candle was an invalid downward teleport). `demand_bounce` blew −20% *through* the zone; `supply_reject` +25% through; `bos` cut at the *top of an intact uptrend* before any structure break. `double_top`/`double_bottom` used a "ramp" that made an artificial cliff with unequal tops.
- **Input-validation holes:** SL=0, SL=−500 (negative), and empty SL all let you Execute (`value||0` coerced blank → 0, which passed the `sl<entry` check). Wrong-side SL/TP disabled Execute **silently**.
- **UX:** the 18-pill pattern selector was a **361px wall on mobile** that pushed the chart entirely offscreen; 4h/6h rendered **90 setup candles**; "Next Round" landed below the fold after a reveal; chart topbar text overlapped at 375px; loud WIP caution tape; `confirm()` dialogs.

### What was rebuilt
- **Generators (`lt-simulator.js`, full rewrite).** Each injector now builds **only the setup** (candles up to the decision) and lands the last close **at** the key level it teaches, returning `{ setup, keyLevel, label, winDir }`. The reveal is built separately from `winDir` + an `outcome` param. **`generateMarket(pattern, seed, outcome)`** — `outcome: 'resolve'` (setup works) | `'fail'` (setup fails, after a brief lure that traps textbook traders). **The setup is byte-identical for resolve vs fail** (proven in Node) so the outcome is undetectable from the chart. All 4 broken setups fixed (sweep/zone-probe/BOS-break/double-top now visibly match their label).
  - **Key fix — guided walk.** `legTo()` was a drifted random walk whose variance compounded ±5% over 240 candles, so level-pinned candles (sweeps, probes, retests) gapped. Replaced with a deterministic geometric ramp + **AR(1) deviation** (organic swings, but reliably lands at target).
  - **Candle budget** retuned: SETUP_N 240 / REVEAL_N 140 → 4h≈60 setup candles (was 90), 1d≈10.
  - **Validated in Node:** 0 bad bars across ~1.03M base candles + all TFs; entry-vs-key within ±4.1% for every pattern; 6 structural assertions (sweep spikes>key & closes<key, zones probed, double-top tests resistance, sr_flip enters at level, bos enters below the broken HL) pass **160/160**; resolve→textbook 100%, fail→flipped 100%.
- **Difficulty toggle (per the chosen design).** `Learn` (default) = setups always resolve textbook; `Realistic` = ~38% fail. Stored in `lt_sim_difficulty`; `_simPickOutcome()` picks per round (sampled: Learn 0% fail, Realistic 38.6%). Verdict is **outcome-aware** — a correct read that *failed* in Realistic mode shows "*You read the setup right — it just failed. Even A+ setups fail ~1 in 3; this is exactly why every trade needs a stop.*"; a correct read that lost in Learn mode coaches on stop placement; against-bias wins are flagged as variance, not edge.
- **Spoiler removed.** The chart markLine is now a neutral grey **"Key Level"** line (price reference, never the pattern name); the pattern name is revealed only in the **verdict** card.
- **Input validation fixed.** `_calcMetrics` now requires positive, finite SL/TP on the correct side (SL=0/negative/empty/NaN all rejected). A new **`#sim2-exec-hint`** line explains *why* Execute is disabled ("Enter a stop-loss price.", "Stop loss must be below your entry.", "Margin exceeds your equity — lower leverage…").
- **Pattern selector redesigned.** The 18-pill wall → one compact **control row**: `Mode [Learn|Realistic]` + `Pattern [🎲 Random] [Specific pattern… ▾]` (a `<select>` grouped by concept area via optgroups). Mobile control height **361px → 145px**; the chart is reachable on the first screen again.
- **Layout/mobile polish.** WIP caution tape → subtle **`Beta`** chip by the heading. Verdict **scrolls into view** after the reveal (Next Round no longer below the fold). Chart topbar wraps cleanly at ≤600px (the "BTC/USD · Synthetic" symbol hides to reclaim width). No horizontal overflow at 375px.

**Cache versions bumped:** `lt-simulator.js 1.2.0→1.3.1`, `lt-sim-ui.js 1.14.0→1.15.1`. `lt-styles.css` untouched (all sim styles are injected by `_simStyles()` in `lt-sim-ui.js`). **Sim is still flagged Beta.**

**Possible follow-ups:** default could be flipped to Realistic if Learn-first feels too soft; the flat/skip verdict could get an outcome-aware note too (skipping a setup that *would have failed* is a good skip); `_sim2Reset()` still uses native `confirm()` (could use the app's `_ltConfirmDialog`); touch-dragging SL/TP lines on the chart vs. page-scroll on mobile not stress-tested.

## Session — 2026-06-09 (later 12) — glossary audit + 4 improvements (all local, not deployed)

Two-hat (UX + pro-trader) audit of the glossary. **Accuracy verdict: clean** — all definitions trader-correct, the SVG candle figures (`_gc(x,open,close,high,low)`, y-pixels, smaller = higher price) verified correct (rendered Hammer = textbook; code-audited shooting-star/inverted-hammer/doji/marubozu/engulfing/liquidity-sweep/FVG/BOS/double-top-bottom/RSI/divergence/supply-demand/premium-discount/flags). Search already matches term + aliases + **definitions**. Then implemented all 4 recommended improvements (`lt-glossary.js 1.16.0`):
1. **Category filter chips** — `_glCatsHtml()` renders an `All + 9 category` pill row (with per-category counts) in the sticky header; `_glSetCategory(cat)` filters the list (`_glCategory` state, applied in `_glListHtml`). Verified: Candlesticks → 11 cards, all correct category.
2. **In-definition cross-links** — `_glLinkify(def, selfId)` links the first mention of any other term (via an alias→id index, longest-first, ≥3 chars, minus a small generic stop-set) to its card; `_glJump(id)` clears filters, re-renders, and focuses+expands the target (125 links live across the list, verified a jump). New `.gl-link` style (teal dotted underline).
3. **Dragonfly & Gravestone Doji split into their own entries** (were folded as aliases of Hammer/Shooting-Star — technically wrong, they're bodiless doji). New entries + figures (`dragonfly-doji` teal, body-at-top + long lower wick; `gravestone-doji` red, body-at-bottom + long upper wick); removed the `dragonfly`/`gravestone` aliases from hammer/shooting-star. Glossary now **81 terms**, Candlesticks 9 → 11.
4. **Tucked the "Unlock all modules" dev toggle** — from a prominent boxed checkbox to a quiet, dim text toggle (`.gl-bypass` restyled: no box, `--text3`, smaller; shortened to "Unlock all").
Verified in preview, 0 console errors.

## Session — 2026-06-09 (later 11) — Settings page rebuild (all local, not deployed)

`lt-settings.js 1.22.0`. UX audit found Settings read like a "legacy" page because it's a **bespoke design system** that ignored the app's tokens. Full rebuild (markup + injected CSS), **wiring untouched** — every control keeps its ID/`data-*` so the existing handlers work.
- **5 sections → 3:** **Appearance** (Theme · Font · Bullish · Bearish — merged the old "Chart Appearance" + "Display"), **Progress** (per-course + All Courses), **Sync & Backup** (Sync · Export · Import · Share — merged the old "Share" + "Backup & Restore").
- **Aligned to app design tokens:** radii now `var(--radius)` / `var(--radius-lg)` (were hardcoded 6/8/10px); destructive buttons use `var(--red)` / `var(--red-dim)` / `var(--red2)` instead of hardcoded `#cc2222`/`#ff6666` — **now theme-aware** (verified: reds correct in light mode, which they weren't before). Section labels calmed from loud teal → `--text2`; wrap font dropped the `system-ui` fallback.
- **De-cluttered:** removed the repeated per-course descriptions ("Mark every session complete, or clear this course only" ×4) and the two verbose section-intro paragraphs, replaced with a single `.lt-settings-note` line per section. Tightened row/section padding. Renamed Export/Import buttons to "Export"/"Import". Net: the whole page now fits ~one screen vs a long scroll.
- Verified in dark + light: 3 sections, all 12 controls present + functional (font swap, candle-colour swap + persistence, theme toggle), 0 console errors.
- **Follow-up (`lt-settings.js 1.23.0`):** in the Progress section each **"Course N"** prefix is now coloured with that course's accent via `ltCourseAccent(n)` (theme-aware: teal/gold/purple/red) — matching the sidebar/home-hub; the "· Name" stays default. Falls back to the hardcoded accent map if `ltCourseAccent` isn't loaded.

## Session — 2026-06-09 (later 10) — "Welcome back, Anon" + swipeable candle gallery (all local, not deployed)

- **Home hero greeting** stays **"Welcome back"** — a "Welcome back, Anon" variant (mono/grey handle) was tried and then **reverted by request** (`.lt-anon` span + CSS removed; `lt-engine.js 3.56.0`, `lt-styles.css 1.69.0`).
- **Candlestick gallery now horizontally swipeable** (`lt-gallery.js 1.3.0`) — the Course-1 Ch-0 candle row (`renderCandlestickGallery`, 10 candle types) overflowed and clipped on phones. Fix: `.lt-candle-row` is now an `overflow-x:auto` scroll container (`-webkit-overflow-scrolling:touch`, `scroll-snap-type:x proximity`, thin styled scrollbar) and `.lt-candle-item` is `flex:0 0 auto` + `scroll-snap-align:center` so items keep their natural width and the row scrolls instead of squishing. Verified at 375px: row scrollWidth 752 in a 275px viewport, scrolls the full range to reveal Gravestone Doji. Desktop is unchanged (fits → no scrollbar; `justify-content:space-between` still distributes).

## Session — 2026-06-09 (later 9) — touch long-press + Settings "All Courses" merge (all local, not deployed)

`lt-engine.js 3.53.0`, `lt-settings.js 1.21.0`.
- **Long-press = the touch equivalent of desktop interactions** (touch has no `contextmenu`/`hover`):
  - **Sidebar session long-press (~480ms) → the "Skip to here" menu** (same one as desktop right-click). `_ltInitChapterContextMenu` refactored: extracted `openMenuFor(item,x,y)`, added `touchstart`/`move`/`end` long-press (cancelled if the finger moves >12px, i.e. a scroll), with `navigator.vibrate(15)` haptic.
  - **Home course-card long-press (~420ms) → previews that course in the Continue card** (calls `ltPeekCourse(n)`; release → `ltPeekReset()`). New `_ltInitCourseTouchPeek()` delegated on the persistent `#content-area`; cards now carry `data-course`.
  - **Phantom-tap suppression:** a long-press would otherwise also fire the element's tap (navigate / open course). `_ltSuppressNextClick()` sets `window._ltSuppressClick`; a **document capture-phase click listener** swallows that one click — **except** clicks inside `.lt-ctx-menu` (so the "Skip to here" button still works; this exclusion was the fix for a bug where the menu button's own tap got suppressed). Desktop right-click/hover paths unchanged. Verified both flows with synthetic TouchEvents (peek shows/reverts; long-press→menu→skip marked 0–5 + opened session 7), 0 console errors.
- **Settings → Progress: merged the two "All Courses" rows into one** (matching the per-course row format): a single `lt-settings-row` labelled **All Courses** with **Mark All Complete** + **Reset All** side-by-side in a `lt-course-actions` control group (`lt-btn-sm`). Button IDs (`#lt-markall-btn`/`#lt-resetall-btn`) unchanged, so the existing wiring still works.

## Session — 2026-06-09 (later 8) — Flashcards icon consistency (all local, not deployed)

`lt-engine.js 3.51.0`, `lt-index.html`. The home-hub Tools row had Flashcards (between Glossary and Community) but the top-right header didn't, and the left sidebar had a separate Flashcards button — inconsistent.
- **Added a Flashcards `icon-btn` to the top-right header** (`#flashcards-sidebar-btn`, `layers` icon, `data-tip="Flashcards"`, `onclick=showFlashcards()`) **between Glossary and Community** — so the header now matches the hub Tools order: Simulator · Glossary · Flashcards · Community · Settings.
- **Removed the left-sidebar Flashcards button** (`.btn-flashcards` in `buildSidebar`'s `.sidebar-exam-slot` — only the Final Exam button remains) and its now-dead `setHomeNavActive` hide-on-hub toggle. The `.btn-flashcards` CSS rule in `lt-styles.css` is now orphaned (harmless `margin-bottom`).
- Verified: header order correct, header Flashcards button opens the deck, sidebar button gone, 0 console errors. (Mobile note still open: the header now has 5 icon buttons — the pre-existing "consider an overflow menu on narrow screens" item is a touch more relevant.)

## Session — 2026-06-09 (later 7) — "Skip to here" right-click + OG-cache diagnosis (all local, not deployed)

`lt-engine.js 3.50.0`, `lt-styles.css 1.66.0`.
- **Right-click a sidebar session → "Skip to here".** `renderChapters` now stamps each `.chapter-item` with `data-course`/`data-chapter`. `_ltInitChapterContextMenu()` (called once in `DOMContentLoaded`; attaches to the persistent `#chapter-list`) shows a small themed `.lt-ctx-menu` on `contextmenu` of a session, with the session title + a "Skip to here" action. `window.ltSkipToChapter(courseNum, targetIdx)` marks every session **before** the target as `completed` (active course → `state.progress` + `saveState`; other course → writes that course's `lt_courseN_state` directly), then opens the target (`jumpToChapter` for the active course since the predecessor is now complete → passes the gate; `switchActiveCourse(n, targetIdx)` for others). Verified: skip-to index 5 completed 0–4 + opened session 6; the menu button completed 0–8 + opened session 10; stored state matches; 0 console errors. Desktop-only (right-click) by design.
- **OG "not updating when shared" — diagnosed, NOT a deploy bug.** Confirmed the LIVE site (`workspace-mu-rust.vercel.app`) already serves the **current** brain-Pepe card (`/og-image.png` is byte-identical to local; the deployed `<meta og:image>` carries `?v=2` and the new alt text). So a deploy of the OG **did** happen. The reason a shared link still shows the old card is **social-platform unfurl caching** (Discord/iMessage/X/LinkedIn cache the preview per page-URL for a long time). Fixes for the user: re-scrape via the platform debugger (FB Sharing Debugger, LinkedIn Post Inspector), or share the link with a throwaway query (`…/?v=2`) so the platform treats it as a new URL and re-fetches; Discord especially honours the query trick. (Note: this means the live site is further along than the blanket "not deployed" notes below — at least the landing page + OG are live; this session's JS/CSS is still local pending the next deploy.)

## Session — 2026-06-09 (later 6) — cross-device sync (QR/link) + avatar blur removed (all local, not deployed)

`lt-settings.js 1.20.0`, `lt-engine.js 3.49.0`, `lt-styles.css 1.65.0`, plus 2 NEW CDN libs in `lt-index.html`.
- **No-account cross-device progress sync (QR + link).** Decided against accounts/backends (keeps the "NO ACCOUNT" ethos + zero data liability). Settings → Backup gains a **"Sync to Another Device"** row → `ltOpenSyncModal()` shows a **QR code + copyable link**. The whole `lt_*` localStorage blob is `JSON.stringify`'d and **LZ-compressed into the link's `#fragment`** (`ltBuildSyncLink()` → `origin+path+'#sync='+LZString.compressToEncodedURIComponent(...)`). Fragments are never sent to a server — **nothing is uploaded**. On the receiving device, `_ltCheckSyncImport()` (first thing in the engine's `DOMContentLoaded`) matches `#sync=`, decompresses, `confirm()`s, writes the keys to localStorage, strips the hash, and `location.reload()`s onto the imported state. Verified: round-trips 14 keys incl. all course states; modal renders QR + link; 0 console errors. **Caveat:** the link always works (any size); the QR is best-effort — a heavily-progressed user's blob (~2 KB) makes a dense v40 QR that's hard to scan, and the modal shows a "use the link instead" fallback if `qrcodejs` overflows. Could be made QR-friendlier later by compacting the progress shape before compression (bitmask per course) or trimming non-essential keys (`lt_sim_stats`, `lt_sidebar_collapsed`, `lt_backupReminded_*`).
- **NEW client deps (first beyond ECharts/Lucide):** `lz-string@1.5.0` (jsdelivr/npm) + `qrcodejs` (jsdelivr/gh `davidshimjs/qrcodejs` — note: the npm `qrcode` build path 404s on jsdelivr, davidshimjs works and exposes `window.QRCode` with `new QRCode(el, {text,width,height,correctLevel})`). Both load before `lt-settings.js`/`lt-engine.js`. The `gen-seo.js` Node build does NOT load these (engine/settings aren't run there), so no build impact.
- **Removed the avatar "blur" on hover** (`lt-styles.css`): dropped the `filter: drop-shadow(...)` glow from `.lt-home-continue--peek .lt-home-continue-avatar img` (and the now-unused `filter` from its base transition). The scale(1.08) pop + accent border/eyebrow remain.

## Session — 2026-06-09 (later 5) — course-hover Pepe preview + Term UTC refresh (all local, not deployed)

`lt-engine.js 3.48.0`, `lt-styles.css 1.64.0`. Five transparent Pepe cutouts in the repo root: `pepe-cap.png` (C1), `pepe-builder.png` (C2), `pepe-ninja.png` (C3 — karate Pepe, replaced the earlier `pepe-sword.png` which was deleted), `pepe-brain.png` (C4), plus `pepe-laptop.png` (default Continue-card avatar).
- **Final behaviour — hovering a course card previews it in the Continue card** (per user pref; iterated away from per-card reveals which looked clunky on the small cards). On `onmouseenter` of a `.lt-home-course-card`, `ltPeekCourse(n)` swaps the Continue card's **avatar** (`#lt-continue-avatar` → that course's Pepe via `LT_PEPE_BY_COURSE`), **eyebrow** (`#lt-continue-eyebrow` → "Course N"), **title** (`#lt-continue-title` → course name), **meta** (`#lt-continue-meta` → blurb from `LT_COURSE_BLURB`), sets `--peek-accent` to `ltCourseAccent(n)`, and adds the class `lt-home-continue--peek`. **Reset is on the GRID** (`.lt-home-courses` `onmouseleave="ltPeekReset()"`, not per-card) so moving card→card morphs smoothly instead of flickering through the default; only leaving the whole grid restores `_ltContinueDefault` + laptop avatar + removes the class.
- **Peek visuals (`lt-styles.css 1.64.0`):** the `--peek` class drives an **accent change** (left border + eyebrow colour + a `drop-shadow` glow on the avatar, all in `--peek-accent`), a **popped avatar** (`scale(1.08)`), and the **Resume button fades out** (`opacity:0; translateX(12px); pointer-events:none` — its space is kept, no layout shift). Everything animates via `transition` on the base elements (border-color/color/transform/opacity ~0.3s), so static↔hover and card↔card (accent morph) are smooth. Reduced-motion handled by the global rule.
- **Term of the Day now refreshes at 00:00 UTC on open pages:** `_ltTermOfDay` was already UTC-day-based (`floor(Date.now()/86400000)`), so it rolls at 00:00 UTC by design — the gap was that an open page didn't update until reload. Factored the card into `_ltTermSectionHtml()` (wrapper `#lt-home-term-section`) and added `_ltScheduleTermRefresh()` (called at the end of `renderHome`): a `setTimeout` to the next UTC midnight that re-renders the card in place and reschedules. Module timer `_ltTermTimer`, cleared+reset each render.
- Verified in preview (engine 3.47.0): hover swaps avatar+eyebrow+title+blurb for all 4, leave restores; term section id present; timer scheduled; 0 console errors.

## Session — 2026-06-09 (later 4) — home hub mascot swap (all local, not deployed)

`lt-engine.js 3.44.0`, `lt-styles.css 1.58.0`, NEW asset `pepe-laptop.png`.
- **Continue card avatar:** added a Pepe-on-a-laptop image (`pepe-laptop.png`, 1254² transparent PNG, from the user's Downloads) as a **60px leading avatar on the left of the `.lt-home-continue` card**, before the "Trending Markets / Resume" text. Markup wraps the avatar + info in a new `.lt-home-continue-left` flex group so the card's space-between still parks the Resume button at the far right. Styles: `.lt-home-continue-left` / `.lt-home-continue-avatar` (img `object-fit:contain`, 60×60) in `lt-styles.css`.
- **Removed the animated knight sprite:** deleted the `.lt-home-mascot` div from `renderHome` (was under the Discord banner) and its CSS (`.lt-home-mascot`, `@keyframes lt-mascot-walk`, the reduced-motion rule). **`pepe-knight.png` deleted** (no longer referenced; only a stale ref remains in the `Backup2/` snapshot, which is harmless).
- Verified in preview (engine 3.44.0): avatar loads + renders 60×60 left of "Trending Markets", Resume stays right, mascot gone, 0 console errors.

## Session — 2026-06-09 (later 3) — new OG share image (all local, not deployed)

Redesigned the social share card to reflect the product + ethos. NEW source `tools/build-og.js`, regenerated `og-card.svg` + `og-image.png` (1200×630).
- **Design (text-forward, no chart — per user pref):** dark brand card — enlarged logo mark (`scale(0.40)`) + "LIQUIDITY THEORY" wordmark in **Barlow Condensed 800 / 48px**, a teal eyebrow **FREE CRYPTO TRADING ACADEMY** (Barlow), a big two-line headline "Learn to trade, / knowledge freely shared." in **Barlow Condensed** (white + brand teal `#16E9D0`), a contents+ethos subhead in **JetBrains Mono 22px** (the app's "Terminal" font), and a **faint "big-brain" Pepe** (NEW asset `pepe-brain.png`, converted from a 500² webp; 13% opacity) bleeding off the bottom-right as a background watermark — brain = knowledge/learning, on-theme for the academy. (The home-hub Continue card keeps the separate `pepe-laptop.png`.) ("Four interactive courses, live charts, and a practice sim. / Honest, ad-free, open to everyone — no account required."), and pills **100% FREE · NO ACCOUNT · NO HYPE**. Teal (top-right) + purple (bottom-left) glows fill the negative space. (An earlier draft had a faux app chart-card on the right showing the new hollow/filled candles — removed at user request in favour of the cleaner text-forward layout; the candle-drawing code is gone from `build-og.js`.)
- **Rasterization:** the card uses brand fonts, so it can't be re-rendered by a plain SVG tool. `tools/build-og.js` generates the SVG **and** rasterizes it via `@resvg/resvg-js` with the real Barlow Condensed / Barlow / JetBrains Mono TTFs. Those deps + fonts live OUTSIDE the repo (in `/tmp/og-render`, to keep the app dependency-free) — see the script header for the one-time setup + the `NODE_PATH=… OG_FONTS=… node tools/build-og.js` run line. Edit the design in `tools/build-og.js`, not the SVG/PNG directly.
- **Cache-bust:** the image filename is unchanged, but its content changed, so the share-image URLs got `?v=2` to force social scrapers to re-fetch — `index.html` (`og:image` + `twitter:image`) and `tools/gen-seo.js` `OG_IMAGE` (the `/learn` pages). After deploy, run the platform share-debuggers (or just confirm Discord/X unfurl the new card) to refresh their caches.

## Session — 2026-06-09 (later 2) — course cohesion audit + fixes (all local, not deployed)

A trader/UX audit of the course UI for places where presentation and content disagreed, then fixes. `lt-engine.js 3.43.0`, `lt-styles.css 1.57.0`, `lt-settings.js 1.18.0`, `lt-data*.js`.

### #1 Terminology unified to "Session" (`lt-engine.js`, `lt-settings.js`)
The same unit was called three things: header/sidebar `Module M · Session K`, quiz label `Quiz — Chapter N`, and home hub / progress / exam strings `… chapters` — with mismatched numbers (live: header "Module 1 · Session 6" sat above "Quiz — Chapter 7"). Standardized on **Session**:
- Quiz label `Quiz — Chapter ${id+1}` → just **`Quiz`** (the misleading per-course number is dropped; the header already shows Module · Session).
- `chapters` → `sessions` in: home course-card stat, home overall meta, welcome/continue card ("sessions complete"), exam-unlock toast + gate toast + sidebar exam tooltip, "Next Chapter" → "Next Session", "previous chapter first" toast.
- Settings: the three per-course / all-courses "Mark every **chapter** …" strings → "session".
- Internal JS identifiers (`CHAPTERS`, `state.chapter`, `isChapterCompleted`, `chapter.id`, etc.) intentionally **unchanged** — strings only. Sidebar "N / M completed" left as-is (no noun).

### #2 Conceptual quizzes no longer show a decorative candlestick chart (`lt-engine.js` + `lt-data*.js`)
`renderQuiz` rendered a candlestick chart badged **"Decision Point"** for *every* quiz — but many quizzes are pure concept/recall (order types, funding-rate %, margin modes, the order book, journaling, **meditation**), where the chart is at best irrelevant and at worst misleading (the meditation quiz literally re-labeled price swings "Mind Wanders / Refocus to Breath"). Per user decision (**suppress chart + badge**):
- **Engine:** `renderQuiz` now computes `showChart = !!(quiz.chart && !quiz.hideChart)` and only emits the chart card + runs `_renderQuizSim` when true. The answer-reveal path already degrades gracefully (`revealChart` no-ops with no chart instance; the `.chart-card-badge` query is null-guarded; `showExplanation` appends to `.quiz-card`). Verified: the meditation quiz shows no chart, answering still reveals the explanation + enables Next.
- **Data:** added `hideChart: true` to **23 conceptual quizzes** — C1 ids 11,12 (R:R/Kelly formula lessons, line charts) · C2 id 15 (financial-instrument definition) · C3 ids 0,1,2,3,4,5,6,7,9,14,15,16,17,18,19,20 (derivatives mechanics + all psychology — 16 of 21) · C4 ids 0,11,18,29 (pure recall: "five modules", "role of SA", "which Hyblock tab", "which Ichimoku setup"). All four data files re-validated in Node (parse OK, flags on the right ids, no broken quizzes).
- **Kept charts** on every genuinely chart-based quiz (zones, ranges, structure, indicator scenarios). **Borderline-but-kept (flagged for review):** C4's Hyblock liquidation/heatmap scenario quizzes (ids 19–24) reference a *different* tool's dashboards, but their candlestick still shows the price/DBS-zone context, so they were left charted. Revisit if you'd rather suppress those too.

### #3 "Practice This Pattern" CTA now signals the WIP destination (`lt-engine.js`, `lt-styles.css`)
The in-lesson **Practice This Pattern** button opened the Simulator, which is plastered with `🚧 Work in Progress` caution tape — the button gave no hint. Added a muted **`Beta`** chip (`.chapter-practice-beta`, neutral styling matching `.lt-home-tool-wip`) so the framing matches the destination. (Alternative if preferred: hide the CTA entirely while the sim is WIP — one-line gate in `_practiceBtnHtml`.)

### Verified cohesive, no change needed
Module banners (all 22 module names themed — zero fallbacks), directional language (no "see chart on the right" that breaks on mobile), quiz hints (Socratic, not answer-telegraphing). **All verified in preview, engine 3.43.0, 0 console errors.**

## Session — 2026-06-09 (later) — chart styling pass (all local, not deployed)

### Candlestick chart restyle — pro-trader/UX pass (`lt-engine.js 3.42.0`) — ✅ VERIFIED (local)
A styling/animation pass on the teaching charts themselves (no content/data changed). All in `buildCandlestickOption`, `buildLineOption`, and `renderTeachingChart`.
- **Hollow-up / filled-down candles (the headline).** Default series `itemStyle` is now `color:'transparent'` (bullish body) + `color0:BEAR` (bearish body) with `borderColor:TEAL`/`borderColor0:BEAR`. Bull candles render as hollow teal outlines; bear candles stay solid. Fixes the old problem where a **solid near-white down-candle was the loudest thing on a black chart** (inverted visual weight). Theme-aware via TEAL/BEAR (light = `#0d9488` outline / `#334155` slate fill). **Per-candle `candleColors` objects (Course-4 Crayons/TrendBuddy/Genie) override this and stay solid** — verified Crayons keeps all 18 indicator colours through the reveal.
- **Left-to-right "print" animation.** Added `animationDelay: idx => idx*16` to the candlestick series so candles print like a live tape instead of all growing from the baseline at once.
- **Themed crosshair labels.** `tooltip.axisPointer` was `{type:'cross'}` with ECharts' default white axis-value boxes (the one element ignoring the dark theme). Now styles `axisPointer.label` to `BG4`/text + hairline border, and the cross lines to dashed slate `rgba(148,163,184,0.35)` — reads in both themes (light label flips to `#f1f4f9`/`#0f172a`).
- **Price-axis legibility.** y-axis `axisLabel` color bumped `TEXT3 → TEXT2` (the price axis is the key reference; `#555` on black was barely legible). x-axis (time) stays dim at `TEXT3`. Same bump applied to the line-chart y-axis.
- **Teaching-animation outcome candles unified.** `renderTeachingChart` previously drew outcome candles as all-transparent **wireframes** (a different convention from the solid setup candles, and it dropped Course-4 indicator colours on the outcome side). Now outcome candles pass plain arrays → inherit the standard hollow-up/filled-down style and **respect `candleColors`** (`def.candleColors[def.cutIndex + j]`). The dashed "Decision" line + one-by-one print still mark them as the reveal. Net: setup and outcome now match, and C4 indicator charts keep their colours through the whole animation.
- **Verified in preview** (engine 3.42.0 loaded, 0 console errors): C1 intro/quiz charts hollow-up/filled-down; quiz reveal + "Revealed" divider intact; Crayons 18 coloured bars preserved; light mode legible (teal outline / slate fill, themed crosshair). Gallery (`lt-gallery.js`) + Simulator (`lt-sim-ui.js`) build their own options and were **not** touched.

## Session — 2026-06-09 (all local, not deployed)

### Home hub mascot — animated frog-knight pixel sprite (`lt-engine.js 3.41.0`, `lt-styles.css 1.54.0`, NEW `pepe-knight.png`)
Added an animated pixel-art mascot (Pepe frog-knight resting beside a flaming sword) **directly under the Discord banner on the in-app Home hub** (`renderHome`), per request to put it "under the discord embed on the home page." (Interpreted "home page" as the in-app Home hub — it has the singular `.lt-home-discord` embed; the marketing landing page only has a Discord card among YouTube/X. Offer stands to mirror it onto `index.html` if that was meant.)
- **Asset:** `pepe-knight.png` (768×768 sprite sheet, 3×3 grid = nine 256px frames; copied from the user's `~/Downloads/pixellab--…png`).
- **Markup:** a single `<div class="lt-home-mascot" role="img" aria-label="…">` appended after the `.lt-home-discord` `<a>` in `renderHome`.
- **CSS (`lt-styles.css`, near `.lt-home-discord`):** 256×256 display (native 1×, crispest — no scaling), `background-size:768px 768px`, `image-rendering:pixelated`. Animation `lt-mascot-walk 1.08s steps(1) infinite` with 9 keyframes stepping `background-position` (offsets at multiples of 256) left→right, top→bottom (`steps(1)` snaps frame-to-frame, no sliding interpolation). `@media (prefers-reduced-motion: reduce)` pins it to the center frame and disables the animation. (Tuned over follow-ups: 128px/0.9s → 173px/1.08s → 256px/1.08s; current = native size, −20% slower than initial.)
- Verified in preview: asset loads (768²), frames cycle, sits right after the Discord banner, only renders on the hub (0 elsewhere), survives re-renders, no console errors.

### Share links now deep-link into the app (`lt-engine.js 3.40.0`, `lt-settings.js 1.17.0`)
Share buttons used to copy the standalone `/learn/<course>/<session>/` SEO wrapper page ("the page with all the site's context"). Now lesson/course shares open the **exact lesson/course straight inside the interactive app** via the existing `?c&ch&s` deep-link router.
- **`ltCopyLessonLink()`** (header share-2 button, course view only) → `origin + pathname + ?c=N&ch=I&s=S` for the current lesson (e.g. Ichimoku → `/lt-index?c=2&ch=11&s=0`). Verified it round-trips: the router opens that exact lesson.
- **`ltShareCourse(n)`** (home course-card share icon) → `?c=N&ch=0&s=0` — opens the course at chapter 1.
- New **`ltShareSite()`** → `origin + '/'` (marketing landing page) — the generalized "share the whole project" link.
- New **"Share" section in Settings** (`lt-settings.js`, between Progress and Backup) with a "Share Liquidity Theory" row + "Copy Link" button wired to `ltShareSite`; desc points users to the header/home-card controls for per-lesson/per-course shares.
- New helper `_ltAppUrl(course, chapter, step)` mirrors what `_ltSyncURL` writes; uses `location.pathname` so links keep whichever app path (`/lt-index.html` or clean `/lt-index`) is in use.
- **Removed** the now-unused `/learn/` slug helpers from the engine (`_LT_SHARE_NAMES`, `_ltSlug`, `_ltCourseSlug`, `_ltSessionSlug`). The `/learn/` static pages still exist for SEO (gen-seo.js retains the canonical slug logic) — they're just no longer the share target.
- Verified in preview: all three share URLs correct, Settings button copies the root, no console errors. **Note (local-only quirk, unchanged):** `npx serve` drops the query on `.html?…`; test in-app deep links with the clean path `/lt-index?c=…`. Vercel serves `.html?…` fine.

### Teaching-chart rollout — complete for all four courses (`lt-data*.js`)
All 232 candlestick charts across all four courses converted from hand-authored OHLC arrays to `ltCandles()`. 0 bad bars across all files.

**Course 1 (`lt-data.js 1.7.0`)** — 6 remaining charts converted (ids 8 and 10):
- id=8 "HTF Scenario Analysis": introChart (14 monthly bars, seed 63), lessonChart (18 bars, seed 67), quiz chart (14 bars, seed 71)
- id=10 "Risk Management": introChart (15 bars, seed 73), lessonChart (15 bars, seed 79), quiz chart (15 bars, seed 83)
- Note: ids 11–12 ("Achieving Profitability", "Optimizing Returns") are line charts — no ohlc to convert.

**Course 2 (`lt-data-course2.js 1.5.0`)** — all 50 charts converted (seeds 85–134), 17 chapters.

**Course 3 (`lt-data-course3.js 1.5.0`)** — all 61 charts converted (seeds 135–195), 21 chapters.

**Course 4 (`lt-data-course4.js 1.6.0`)** — all 88 charts converted (seeds 196–283), 30 chapters.
- Chapters 12 (Trend Buddy), 16 (Crayons), 17 (Genie) have `candleColors` arrays — bar counts preserved exactly to keep those arrays valid.

**Teaching-chart rollout status: ✅ ALL COURSES COMPLETE**

---

## Session — 2026-06-08 afternoon (all local, not deployed)

### Landing page (`index.html`)
- **Logos band removed:** "Live prices come from" strip (Binance / Coinbase / CoinGecko logos) deleted — HTML block + CSS (`.logos-band`, `.logos-inner`, `.logos-label`, `.logos-row`, `.logo-pill`) + orphaned responsive refs.
- **Course 04 card accent fixed** to `#f87171` (pastel red, matching the app). Added `--c4:#f87171` token; structural `--red:#cc2222` left intact.
- **Simulator spark bars** switched to white `#f2f2f2` down-bars (matching the app's default bearish candle; old code used `#cc2222`).
- **Hero logo — text art:** swapped the `<canvas>` pixel-art logo for a `<pre id="hero-logo">`. Renders the same `logo_data.py` grid as literal `t`/`w`/`.` characters: `t` = teal `#1ff5f0`, `w` = white `#ffffff`, `.` = blank space. Each cell is printed with a per-color `<span>`. A `setInterval` flickers ~10% of colored cells to random digits every 90ms — live data-stream aesthetic. Properly decodes the source's 2-stacked-pixel-per-row format into the true 56×64 grid via `scaleX(1.667)` to keep square pixels.

### App — UI/UX
- **Quiz answer hover — uniform teal:** all three answer-type hover variants (`.answer-btn--bullish/bearish/neutral:hover`) consolidated into one teal rule. Color no longer telegraphs bullish/bearish/neutral on hover.
- **Quiz reveal divider:** vertical dotted line (`#94a3b8`, type `dotted`, width 1.6) injected in `buildCandlestickOption` at `cutIndex − 0.5` when rendering in reveal mode. Labels "Revealed" at top. Separates pre-answer candles (left) from newly revealed candles (right). Coexists with per-candle `candleColors`.
- **Candles ⇆ Video segmented tabs:** intro chart-card header now shows a segmented tab control (`[ Candles | Video ]`) when a `videoUrl` exists, replacing the old static badge + separate "Watch/Hide Video" button. `setIntroView('chart'|'video', url)` is the single source of truth. `toggleIntroVideo` kept as a thin back-compat shim.
- **Nav buttons constrained to content width:** `.nav-footer` wraps buttons in `.nav-footer-inner` (`max-width: 960px`, centered), aligning Back/Next exactly with the page content band above. Mobile padding tracks `.content-area` (16px).
- **Nav button text centered:** `.nav-prev` and `.nav-next` both use `justify-content: center` (were `flex-start`/`flex-end`).
- **Step indicators moved to sidebar:** Introduction / Lesson / Quiz pills are now rendered under the active chapter in the sidebar as `.chapter-steps` / `.sb-step` buttons. Clicking any step pill calls `window.goToStep(i)` to navigate within the current chapter. `updateStepPills()` targets `#sidebar-step-pills`. Old `#step-pills`, `#step-dots`, `#chapter-counter` removed from the header.
- **Global icon buttons in top navbar:** Practice Simulator, Glossary & Definitions, Community & Social moved from sidebar footer to the top-right header as `.icon-btn` buttons (alongside Settings). Sidebar footer removed. `.header-right` gap tightened to 6px.
- **Header icon tooltips:** custom CSS `::after` tooltips on `[data-tip]` icon buttons. Positioned **below** (`.top: calc(100% + 8px)`), fade-slide in on hover, match app dark style. `title` attributes removed (prevents double-tooltip). Applies to all four header icon buttons.
- **Sidebar auto-scroll:** `scrollActiveChapterIntoView()` called via `requestAnimationFrame` at end of `buildSidebar`. Smooth-scrolls `#chapter-list` to keep the active chapter + its step pills in view after every navigation. Respects `prefers-reduced-motion`.

### App — Settings (`lt-settings.js`)
- **Per-course progress controls** added to the Progress section: each loaded course gets its own row with **Mark Complete** (teal) and **Reset** (red) buttons. Wired to new helpers `ltMarkCourseComplete(n)` and `ltResetCourse(n)`.
- **All-courses controls** (Mark All Complete / Reset All) moved from the old "Shortcuts" section into Progress. Shortcuts section removed.
- Shared `_ltConfirmDialog(title, msg, okLabel, tealOk, onOk)` helper added (replaces inline confirm overlay duplicates).
- **Reset All now preserves appearance prefs** (theme, font, candle colors, sidebar state) — only clears progress keys.
- New module-level helpers: `_ltCourseChapters(n)`, `_ltBuildCompleteProgress(chapters)`, `LT_COURSE_NAMES`.

### App — Indicator candle colors (`lt-data-course4.js`)
All three candle-recoloring indicators in Course 4 now have `candleColors` arrays on every chart (intro, lesson, quiz), matched candle-by-candle to the indicator's described color system. Quiz reveal-pin colors also aligned.

**Audit result — only these three indicators recolor candles:**
- ✅ **Crayons** (Ch 16): lime=uptrend · orange=bearish pivot · gray=no-trend · turquoise=sellers-dry · dark-green=breakout · red=downtrend
- ✅ **Trend Buddy** (Ch 12): turquoise=uptrend · magenta=downtrend · gray=no-trend · blue=unconfirmed reversal · lime=confirmed reversal · orange=bearish pivot
- ✅ **Genie** (Ch 17): large-red-bars=bearish-momentum · red-hues=local-top · large-lime-bars=bullish-momentum · green-hues=local-bottom
- **PAL, Heuristics, FSVZO** — paint markers/dots/labels only; default candle colors correct.
- **Courses 1–3** — no candle-recoloring indicators.

**Color palette used (consistent across all three):**
- Lime green / uptrend: `#9be84f` · Turquoise / uptrend (Trend Buddy): `#1fd8c8`
- Magenta / downtrend: `#e83fb0` · Red / downtrend: `#e23b3b`
- Gray / no-trend: `#8a8f99` · Orange / pivot: `#ff9f1a`
- Blue / unconfirmed: `#4a9eff` · Dark green / breakout: `#1f9d3a`
- Green hues (Genie bottom): `#6fd99a` · Red hues (Genie top): `#f08a8a`

## Session — 2026-06-08 evening (all local, not deployed)

### Exam question bank — audit item #5a (`lt-data*.js`, `lt-engine.js 3.34.0`)
The Final Exam was just the chapter quizzes recycled. Now each course has an **authored question pool, separate from the chapter quizzes**, and the exam samples a fresh subset per attempt.
- **Authored ~12 questions/course (48 total)** replacing the old `LT_EXAM_QUESTIONS_* = LT_CHAPTERS_*.map(...)` derivations. Shape: `{ chapterTitle (topic label), question, answers:[{id,text,correct}] }`. Answer text is clean (no "A)"/"●" prefixes — the exam renders its own A–D letters). Validated: 12 each, exactly one correct, 4 options. **Author should still spot-check wording/accuracy.**
- **Engine sampling** (`lt-engine.js`): `_examPool()` = full authored pool; `_buildExamSet()` Fisher–Yates samples `EXAM_LENGTH = 10`; `getExamQuestions()` returns the fixed sampled set during an attempt (`state.examSet`) else the pool. `startExam`/`restartExam` rebuild `state.examSet`, so each attempt is a different 10-of-12 with shuffled options. Removed the `Chapter N:` label (was `q.chapterIndex`) → shows the topic label instead.
- Verified: pool 12 → exam 10, topic labels, 4 options, resamples per attempt, no console errors. (5b spaced repetition was declined.)

### Header tooltip z-index fix (`lt-styles.css 1.53.0`)
The glossary's sticky header (`.gl-head` z-index:30) is a root-level stacking context that sat above `.top-header` (z-index:10), so the header icon-button tooltips/dropdowns were clipped behind it on the glossary. Fixed: `.top-header` → `position:relative; z-index:50` (above in-page sticky headers, below sidebar z:200 / overlays). Verified the tooltips now render on top over the glossary.

### High-end light mode rebuild (`lt-settings.js 1.16.0`, `lt-engine.js 3.39.0`, `lt-styles.css 1.52.0`) — ✅ VERIFIED (local)
Rebuilt light mode as a purpose-built scheme (not an inversion). Theme = CSS vars set on `<html>` from `LT_DARK_THEME`/`LT_LIGHT_THEME` (lt-settings.js).

**Done:**
- **Both theme objects now carry the FULL var set** (bg/bg2-5, border/2/3, teal/2/3 + dim/glow/faint, red/2 + dim/faint, gold + dim, green + dim, text/2/3/4, shadow/shadow-sm/glow-teal, discord-color) so toggling either way fully resets the palette (the old light theme only overrode a subset → stale vars).
- **Light palette (industry-standard):** canvas `#f4f6fa`, white cards, borders `#e6e9f0`/`#d8dee8`, text `#0f172a`/`#475569`/`#64748b`, **accent deep teal `#0d9488`** (the bright `#00d4d4` cyan is illegible on white), red `#dc2626`, gold `#b45309`, green `#16a34a`, soft light shadows, `--glow-teal` → a soft focus ring.
- **`ltApplySavedSettings()` refactored:** apply theme first, add `html.theme-light` class, then (dark mode only) let a chosen bullish candle colour tint `--teal`; light keeps the legible accent. Theme **toggle** now routes through it + `applyCourseAccent()` + `buildSidebar()` + `ltRefreshCharts()` so accents/candles update live.
- **White-candle fix (the headline ask):** `getBullishColor()`/`getBearishColor()` are theme-aware — light defaults to bullish `#0d9488` / **bearish `#334155` (dark slate, legible on white)**; a user-chosen "white" bearish is remapped to slate in light; the red option stays red. `_ltIsLight()` helper added.
- **Course accents theme-aware:** `LT_COURSE_ACCENTS_LIGHT = {1:#0d9488, 2:#b45309, 3:#7c3aed, 4:#dc2626}` + `ltCourseAccent(n)`; replaced all `LT_COURSE_ACCENTS[...]` reads (intro/lesson `--mod-accent`, `applyCourseAccent`, sidebar chapter-num + accordion, welcome modal, home cards). Module colours (`LT_MODULE_THEME.color`) are unused for rendering, so no change needed there.
- **Chart markArea label** changed from themed `C.TEXT2` (→ dark text on the always-dark pill = invisible in light) to fixed light `#cbd5e1`. Other chart pills already use light text on dark pills (fine in both).
- **`.content-area--home` light override** (`html.theme-light`): dark grid lines + cooler glows so the backdrop reads on white.

**VERIFIED in light (desktop + mobile, no console errors):** Home hub · course lesson (candles legible — teal up / **slate down**, zones + labels readable) · quiz (answers, green "Correct!" explanation, reveal chart) · glossary (sticky header + cards + figures) · Settings page · Community. **Dark mode re-checked and intact** (black bg, white text, cyan/white candles) — the refactor didn't regress it.

**Minor polish left (optional, non-blocking):**
- Settings → Bearish "White" swatch icon is faint on the light button (the label is clear, and the rendered candle is correctly slate). Could show the actual rendered colour on the swatch.
- Per-candle indicator colours (Course 4 Crayons/TrendBuddy/Genie `candleColors`, e.g. lime/turquoise) on white can be low-contrast — secondary; revisit if it bothers you.
- Exam/cert overlay screens + flashcards not explicitly screenshotted in light (they use themed vars, so should be fine) — glance when convenient.
- **Not deployed** — redeploy to see it live.

### UX batch 2 (`lt-engine.js 3.38.0`, `lt-styles.css 1.51.0`, `lt-glossary.js 1.15.0`)
- **Glossary no-clip**: `.gl-head::before` mask made full-viewport (`left/right:-50vw; height:100vh`) so list items never peek above OR through the pinned sticky header (clipped by the scroll container).
- **Course accent on label + bar (always)**: `.lt-home-course-label` and `.lt-home-course-fill` now use `var(--caccent)` (per-course teal/gold/purple/red) at rest — not just on hover. Card body stays neutral; border still goes accent on hover. A measured amount of colour, not the old rainbow.
- **Cluttered charts default to expanded**: `_isChartCluttered(def)` (≥4 long labels OR ≥120 label chars across markPoints/Lines/Areas) + `_autoExpandIfCluttered(id,def)` → calls `toggleChartExpand` on render. Wired in `renderIntro` (the 2-col `.intro-layout` is the only place charts are half-width; `.lesson-wrap` is already full-width). Flags scale with complexity: C1 1/13, C2 7/17, C3 16/21, C4 28/30. User can still collapse via the chart's minimize button.
- **Home collapses the sidebar course dropdown**: `buildSidebar` only opens the active course's accordion when `state.view==='course'`; `setHomeNavActive` collapses all accordions on the hub and re-opens the active course's on return ("where it was"). Verified: Resume re-expands the course's dropdown.

### Share buttons (`lt-engine.js 3.37.0`, `lt-styles.css 1.50.0`) — dynamic OG images DEFERRED
Share courses + sessions by copying their crawlable `/learn/` URLs (they have OG tags → unfurl; currently the generic `og-image.png`). Per-session dynamic preview images were **deferred** by user decision (next step: `@vercel/og` `/api/og` edge fn — adds first real dep; see below).
- Helpers in `lt-engine.js`: `_ltSlug`/`_ltCourseSlug`/`_ltSessionSlug` **mirror `tools/gen-seo.js` slug + de-dupe exactly** (so shared links resolve — verified parity, e.g. ch7→`timeframes`). `_ltCopy(text,msg)` (clipboard + toast). URLs use `location.origin` (domain-agnostic).
- `window.ltCopyLessonLink()` (header `#copy-link-btn`, now a `share-2` icon, "Share lesson") → `/learn/<courseSlug>/<sessionSlug>/`.
- `window.ltShareCourse(n)` → `/learn/#<courseSlug>` (hub anchored to the course). Wired to a `.lt-home-course-share` span (role=button, `stopPropagation` so it doesn't open the course) top-right of each home course card; neutral, accent on hover.
- Verified: 4 share controls render; generated URLs resolve (200) and match static paths; no console errors. Clipboard needs a real user gesture (headless eval can't fully test the toast).

**TODO when ready — dynamic embed images:** add `@vercel/og` + `/api/og?c=&ch=` edge function rendering a branded PNG (course/session title, accent, logo); point the static pages' `og:image` (in `tools/gen-seo.js`) + share links at it. First real dependency for the project.

### UX tweaks batch (`lt-engine.js 3.36.0`, `lt-styles.css 1.49.0`, `lt-glossary.js 1.14.0`)
- **Full-width risk banner**: `_riskCalloutHtml()` moved OUT of the intro-layout left column to a direct `.content-area` child ABOVE `.intro-layout` in `renderIntro` → spans the full content band above both the lesson text and the chart.
- **Sticky glossary header**: back-row + toolbar wrapped in `.gl-head` (`position:sticky; top:0; z-index:30`) so it stays pinned while the term list scrolls. A `.gl-head::before` paints over the content-area's top padding (clipped by the scroller) to stop list items peeking above it.
- **Course-card hover accent**: home cards stay neutral at rest but on hover the border + "Course N" label take that course's accent (`--caccent` restored inline; `.lt-home-course-card:hover` rules). Keeps the de-toy'd resting look while restoring per-course identity on interaction.

### Home hub "de-toy" refinement (`lt-engine.js 3.35.0`, `lt-styles.css 1.48.0`)
User felt the hub looked "childish/toy-like." Cause was diagnosed as: 4-colour rainbow accents, emoji + streak gamification, loud pill badges, a gauge ring, and chunky gradient cards. Refined to "restrained, single-accent":
- **Streak removed entirely** — deleted `_ltStudyStreak()`/`_ltDateKey()` + the `🔥` chip (gamification cut). `lt_streak` localStorage key is now orphaned (harmless).
- **Rainbow → single teal accent**: course cards are now neutral (no per-course top border, neutral label), with **teal-only** progress fills. The per-course identity colours still live in the sidebar/header/in-course — just not on the hub.
- **Gauge ring → thin linear bar**: `.lt-home-overall` is now a right-aligned `NN% · X/Y chapters` readout above a 3px teal track (removed the conic-gradient ring).
- **Badges muted**: Course-4 "Advanced" (`.lt-home-course-adv`/`.sb-adv`) and Simulator "WIP" (`.lt-home-tool-wip`) changed from red/yellow pills to neutral muted tags.
- **Flatter**: home cards/tools/continue/term use `--radius` (4px) not `--radius-lg`, removed bouncy `translateY` hovers (hover = border/colour only), tool icons neutral→teal on hover only, continue card left-border = teal (not per-course).
- Discord banner (brand blurple) + Term-of-Day kept. Verified desktop + mobile, no console errors.

### Real founder bios (`lt-community.js 1.9.0`)
Replaced placeholder team identities with real names + lightly-trimmed bios (kept existing X handles/avatars per user). `LT_SOCIAL.team`: Zoran Kole (@Captain_Kole) — "Founder, Liquidity Theory · CEO, GigaChad Ventures" / "Crypto investor since 2013 · early $FTM backer · Bybit #1 PNL award winner."; Michael (@MikeBTC) — "Co-Founder, Liquidity Theory" / "COO, GigaChad Ventures · CEO, PerpMonkey Management." Team cards now render a `.cm-card-bio` line (cards top-aligned). The trust "Who We Are" section now names **Zoran Kole and Michael** (linked) instead of bare handles. (Runescape/"10+ years" flex trimmed for credibility, per user.)

### Course 4 positioning — audit item #3 (`lt-engine.js 3.33.0`, `lt-styles.css 1.47.0`, `index.html`)
Decisions: "Advanced" label everywhere + intro disclaimer; soft tooling note (don't flag which tools are paid).
- **"Advanced" badge** on Course 4: home hub card (`.lt-home-course-adv`), sidebar accordion header (`.sb-adv`) — both course-4 red (#f87171). Added in `renderHome` + `buildSidebar` (gated `c.num===4`).
- **Intro disclaimer**: `_course4NoteHtml()` renders a teal `.course-note` at the top of `renderIntro` only when `getActiveCourseNum()===4 && state.chapter===0` — "Course 4 is an advanced, optional deep-dive… you don't need it to become a capable trader… leans on some specialized charting tools; focus on the concepts." Soft tooling mention (no paid/third-party naming, per decision).
- **Landing card** (`index.html`): rewrote the Course 4 card copy from "The headline curriculum" → "An advanced, optional deep-dive… not required to become a capable trader" and chips Mastery/30 sessions → **Advanced / Optional track**.

### Credibility / trust + risk framing — audit item #2 (`lt-community.js 1.8.0`, `lt-engine.js 3.32.0`, `lt-styles.css 1.46.0`)
Decisions: identity = handles + honest framing; affiliate = downplay; risk framing = gate before derivatives/leverage.
- **Trust section** on the Community page (`lt-community.js`): new `.cm-about` block after the hero — "Who We Are & What We Promise". Honest, credential-light copy (two traders by handle, *not* licensed advisors, don't sell signals, don't promise profits, **most people lose money**, think for yourself, manage risk). Links to the team's X handles via `LT_SOCIAL.team`.
- **BloFin**: was downplayed to a low-key `.cm-affiliate` line in #2, but **restored to the full orange "Support This Project (Optional)" feature card** (logo + perks + "Visit BloFin" button, `.cm-blofin*`) per user request (`lt-community.js 1.10.0`). The `.cm-affiliate` line is removed. Trust section + founder cards are unaffected.
- **Risk gate before leverage/derivatives** (`lt-engine.js` `_riskCalloutHtml()` + `.risk-callout` in `lt-styles.css`): an amber "Real money, real risk — most beginners lose money…" banner injected at the top of `renderIntro` for any chapter whose `module` matches `/derivative|leverage/i` (Course 3's "Getting Started with Derivatives" + "Understanding Leverage"). Automatic by module name — no data edits. Verified present on Course 3 derivatives, absent on Course 1. Not a hard blocker (a prominent callout, not a click-gate) to avoid friction.

### SEO + shareable deep links — audit item #1 (`lt-engine.js 3.31.0`, NEW `tools/gen-seo.js`, `package.json`, `vercel.json`, `serve.json`, `index.html`)

The app rendered all content client-side → invisible to search engines, and there were no linkable lesson URLs. Fixed in two parts.

**A. In-app deep links (`lt-engine.js`).** New URL router:
- `?c=<1-4>&ch=<chapterIndex>&s=<0-2>` opens an exact lesson; `?t=<glossaryTermId>` opens a term; `?view=<glossary|simulator|community|flashcards|settings>` opens a view. Parsed by `_ltParseRoute()`; dispatched by `_ltRouteOnBoot()` (replaces the old `init(true)` call in `DOMContentLoaded`).
- Lessons open via `_ltBootLesson()` — deliberately NOT `switchActiveCourse` (its leading `saveState()` would clobber the target course's stored progress with the still-empty boot state). It loads the target course's saved progress, sets chapter/step, renders. Deep links bypass chapter gating (shareable).
- `_ltSyncURL()` (called from `setHomeNavActive()`, the every-view chokepoint) keeps the address bar in sync via `history.replaceState`: course → `?c&ch&s`, home → bare path, other views → `?view=`.
- **Copy-link button** `#copy-link-btn` in the header (`lt-index.html`), course-view-only (toggled in `setHomeNavActive`), calls `window.ltCopyLessonLink()` → clipboard + toast.

**B. Static crawlable pages (`tools/gen-seo.js`, zero-dep Node).** Loads `lt-chartgen.js` + `lt-data*.js` via `vm` (fake window/document; course names hardcoded — do NOT load `lt-settings.js`, it runs settings logic at parse time and throws in Node). Emits:
- `/learn/<course-slug>/<chapter-slug>/index.html` — one per lesson (81 total): full intro+lesson+quiz text, `<title>`/description/canonical/OG/Twitter/JSON-LD (`LearningResource`), a CTA deep-link `/lt-index.html?c&ch&s=0`, prev/next links, on-brand inline CSS.
- `/learn/index.html` — curriculum hub (all courses → lessons, internal-link graph).
- `sitemap.xml` (83 urls) + `robots.txt`. `BASE_URL` constant at top — **update when the custom domain lands.**
- `/learn`, `/sitemap.xml`, `/robots.txt` are git-ignored build artifacts.

**Build wiring.** `package.json` (no deps) `build` script; `vercel.json` `buildCommand: "node tools/gen-seo.js"` (runs on every deploy; no `outputDirectory` → defaults to repo root). Run locally with `node tools/gen-seo.js` after editing course content.

**`serve.json`** now sets `cleanUrls: false` to mirror Vercel (so `lt-index.html?params` isn't redirected, dropping the query). Local-only quirk: with cleanUrls off, `npx serve` won't resolve `/dir/` → `index.html`, so locally open `/learn/.../index.html` explicitly; **Vercel serves directory indexes fine.**

**Deploy note:** after `vercel --prod`, confirm `/learn/`, `/sitemap.xml`, and a lesson page return crawlable HTML (view-source shows text). If Vercel rejects the build/output setup, fallback = drop `buildCommand` and commit the generated `/learn` + sitemap + robots (un-ignore them).

### Hub/flashcards chrome tweaks (`lt-engine.js 3.30.0`)
All in `setHomeNavActive()` (runs on every view entry):
- **Sidebar Flashcards button hidden on the hub** (`.btn-flashcards` → `.hidden` when `state.view==='home'`) — it's already a hub tool tile, so the sidebar copy was redundant there. Reappears on every other view.
- **Back/Next footer hidden on ALL non-course views** — the footer only pages through chapters and `navigate()` early-returns when `view!=='course'`, so it was dead UI on Home, Glossary, Simulator, Flashcards, Community and Settings. Condition is now simply `footer.classList.toggle('hidden', state.view !== 'course')`. Each of those views has its own "Back to Course"/Home path. Course view restores it (regression-checked: home/glossary/simulator/community/settings/flashcards all hidden, course shown).

### Mobile chart declutter — responsive ECharts options (`lt-engine.js 3.28.0`)
CSS-level mobile scaling (the `.chart-el` height earlier) couldn't fix clutter *inside* the canvas — axis fonts, grid margins, marker pills, and zone labels were all desktop-sized. `buildCandlestickOption` and `buildLineOption` now compute `sm = window.innerWidth <= 768` and scale accordingly:
- **Grid margins** tighter (left 52→42, right 46→38, top/bottom marker reserves trimmed) → more candle width.
- **Axis labels** 10→9px, yAxis `splitNumber` 5→4 (fewer gridlines).
- **markPoint pins** smaller symbol + label 10→8.5px, tighter `distance` (14→8) and padding so adjacent annotations stop colliding.
- **markLine price tags** 10→8.5px.
- **markArea zone labels hidden on mobile** (`label.show:!sm`) — the shaded band still reads as a zone; the text was the worst overlap offender.
- Reveal divider label 9→8px.
- Desktop rendering is byte-for-byte unchanged (only the `sm` branch differs). The option is built at render time per viewport width; resizing only calls `chart.resize()`, so a desktop↔mobile rotation mid-view keeps the prior sizing until the next navigation — acceptable.

### Home hub — 3 additions (`lt-engine.js 3.27.0`, `lt-styles.css 1.45.0`)
- **Study streak** — `lt_streak` localStorage `{ last:'YYYY-MM-DD', count:N }`; `_ltStudyStreak()` increments on consecutive local-calendar days (resets if a day is missed), idempotent within a day. Shown as a "🔥 N-day streak" chip in the hero. Uses local date via `_ltDateKey()` (not UTC).
- **Smart first-timer hero** — when `totDone===0 && state.chapter===0 && state.step===0`, the hero/continue card switch to onboarding copy: "Welcome to Liquidity Theory" / "Get started" eyebrow / "Start learning →" (vs "Welcome back" / "Continue learning" / "Resume →"). Same `ltOpenCourse(activeNum)` action.
- **Glossary Term of the Day** — `_ltTermOfDay()` picks `LT_GLOSSARY[floor(Date.now()/86400000) % len]` (deterministic, rotates daily). Card sits between Tools and the Discord banner; "Open in glossary →" calls `showGlossary(id)` to deep-link. New `.lt-home-term*` + `.lt-home-streak` styles.

### Home hub grid backdrop (`lt-styles.css 1.44.0`, `lt-engine.js 3.26.0`)
Ported the landing page's `body::before` candle-grid backdrop (two radial glows — teal top-right, purple top-left — over a 44px grid) to the Home hub. Lives as `.content-area--home` in `lt-styles.css`; `setHomeNavActive()` toggles that class on `#content-area` so the grid shows **only** on the hub and is removed on every other view.

### Community page cleanup + YouTube link (`lt-community.js 1.7.0`)
- **Removed the YouTube `<iframe>` embed.** The YouTube section is now a clean single-row feature card (red accent, matching the Discord/BloFin cards) with a **"Browse Playlists"** button linking to `LT_SOCIAL.playlists` (`youtube.com/@LiquidityTheory/playlists`). Dropped `LT_SOCIAL.featuredVideo` and the `.cm-yt-head`/`.cm-yt-video` styles.
- **Slimmed the hero** (title 42 → 33px, less padding) and tightened section-label spacing for a less clunky feel.
- **Reordered** so the optional BloFin support card is last: Hero → Discord → Team/X → YouTube → BloFin → footer.

### Simulator "Work in Progress" tape + Discord member counts

- **Caution tape** (`lt-sim-ui.js 1.14.0` + `.caution-tape` in `lt-styles.css 1.43.0`): black/yellow diagonal-stripe banner (`repeating-linear-gradient(45deg,#f5c518/#141414)`) with a dark center chip reading "🚧 Work in Progress · In Development", injected at the top of the Practice Simulator view (between the back-row and the pattern selector). Reusable class — drop `<div class="caution-tape"><span>…</span></div>` anywhere.
- **WIP badge** on the home hub **Simulator** tool tile (`lt-engine.js 3.25.0`, `.lt-home-tool-wip`): small yellow corner pill. Driven by a `wip:true` flag on the tool entry in `renderHome()`.
- **Discord member count** ("~9,000 members" pill, blurple with a green online dot) added to **both** Discord CTAs: the Community page card (`lt-community.js 1.6.0`, `.cm-discord-members`) and the home hub banner (`.lt-home-discord-members`). Hardcoded string — update if the real count changes.

### Responsive scaling pass — mobile + laptop (`lt-styles.css 1.42.0`)

Course content was rendering at full desktop size on phones — the `@media (max-width:768px)` block only repositioned the sidebar and tweaked a few items, never scaling the cards/type/charts/quiz. Made the in-course experience hard to navigate (excessive scrolling). Fixed with a comprehensive mobile pass and a lighter laptop touch.

**Mobile (`≤768px`, appended to the existing block):**
- Reclaimed vertical space: `--header-h: 52px`, `--footer-h: 54px`.
- Header tightened (gap 8px, smaller tag, icon-btn padding 6px 7px, Discord 30px) so the icon row fits 375px.
- **Content cards**: padding 24/26 → 16; heading 20 → 17; body 14/1.7 → 13/1.6; bullets 13.5 → 12.5; concept-table 12px.
- **Module banner**: padding/icon/name all reduced.
- **Charts**: `.chart-el` 320 → **230px** (`--tall` 380 → 270); tighter chart header. This is the biggest navigation win — chart + question + answers now share a screen.
- **Quiz**: card padding 22/24 → 16; question 16 → 14.5; hint 12.5 → 11.5; `.answer-grid--2col` forced to 1 col; answer-btn 13.5 → 12.5; explanation box + rule reduced.
- **Roadmap** + **Home hub** elements scaled down to match.
- Verified: no horizontal overflow (scrollWidth == innerWidth == 375).

**Laptop (`≤1400px`, in the laptop block which stays last):**
- Dialed back content sizing so cards/charts aren't oversized on 13–15" screens: content-area padding 24/32 → 20/26; content-card 24/26 → 20/22; heading 20 → 18.5; body → 13.5; quiz-question → 15; `.chart-el` 320 → 300 (`--tall` 380 → 350).

Landing page (`index.html`) checked on mobile — already responsive; large hero headline is intentional, left as-is.

### Home Hub — new in-app landing view (`lt-engine.js 3.22.0`, `lt-styles.css 1.40.0`, `lt-index.html`)

A dedicated in-app **Home hub** (`state.view === 'home'`), separate from the marketing landing page (`index.html`). Follows the same render-into-`#content-area` pattern as Settings/Glossary/Simulator/Community.

- **App now boots on Home** every time. `init()` routes both the returning-user and fresh-start branches to `showHome()`. The old **"Welcome back" modal is retired** — `showWelcomeModal()` is left in place but no longer called. Saved course/state is still restored underneath so the Continue card + per-course %s are accurate.
- **Static sidebar "Home" button** (`#sidebar-home-btn` in `lt-index.html`): sits below the logo, above the courses. Placed *outside* `#chapter-list` (the only scrolling element) with `flex-shrink:0`, so it never scrolls with the chapter list. Gets `.sidebar-home-btn--active` (teal) when on the hub.
- **Hub sections** (`renderHome()`):
  - **Hero** — greeting + overall progress %: `Σ completed / Σ chapters` across all loaded courses, plus "N courses finished".
  - **Continue card** — active course's saved chapter title + step, with a Resume button → `ltOpenCourse(getActiveCourseNum())`. Left border uses `--course-accent`.
  - **Your Courses** — responsive grid of 4 cards, each in its course accent (`LT_COURSE_ACCENTS`): name (`LT_COURSE_NAMES`), accent progress bar, `NN%` + `X / Y chapters` (or "✓ Complete"). Whole card → `ltOpenCourse(num)`.
  - **Tools** — grid of quick-launch buttons: Practice Simulator, Glossary, Flashcards, Community, Settings (wired to existing `show*()` fns).
  - **Discord highlight** — blurple banner linking to `discord.gg/LiquidityTheory`.
- **New helpers** in `lt-engine.js`: `showHome()`, `renderHome()`, `window.ltOpenCourse(num)` (switch/resume a course from the hub), `setHomeNavActive()` (toggles the sidebar button's active class — called from `showHome` + `renderCurrentStep` + every other `show*()` view entry), `_ltHomeCourses()`, `_ltCourseCompleted(n)`.
- **Progress source:** reuses `ltGetCourseProgress(num)` (reads each course's `lt_courseN_state`).
- Verified in preview: lands on Home, course cards show correct %s, card-click opens the course (Home deactivates), Resume returns to active course, all tool buttons route correctly, mobile collapses to single column. No new console errors (pre-existing `disc-check`/`youtube` lucide warnings are unrelated).

**Cleanup pass (`lt-styles.css 1.41.0`, `lt-engine.js 3.23.0`)** — first version felt clunky; redesigned for a lighter, more integrated look:
- **Sidebar button** is now a clean nav row (transparent, `border-left` accent on active) matching the course-accordion headers — not a heavy boxed button.
- **Hero** is a compact one-line band: "Welcome back" + sub on the left, a **conic-gradient circular progress ring** (`--pct`) + "X/Y chapters · N courses done" on the right (replaced the big number + full-width bar).
- **Course cards** use `margin-top:auto` on the progress track so bars are **bottom-aligned** → uniform rows regardless of name length (removed the awkward `min-height`). Top accent thinned to 2px.
- **Tools** are compact **centered icon tiles** (icon + label only; descriptions dropped) that tint teal on hover.
- **Discord banner** slimmed (flat bg, smaller padding). Mobile: course cards go 2-up, Discord sub hides.
- **Back/Next footer hidden on the hub** (`lt-engine.js 3.24.0`): `setHomeNavActive()` now also toggles `.nav-footer.hidden` when `state.view==='home'` (the hub has no chapters to page through). Footer returns automatically on every other view since that helper runs from every view entry point.

### Teaching-chart rework — Chs 8 & 10 (`lt-data.js 1.5.0`)

Diagnosed three categories of broken charts in the un-reworked Time Frame Analysis module (Chs 8–10):
1. **OHLC data told the wrong story** — lesson/quiz charts had candles closing *above* the resistance level being taught as a rejection signal; also the Ch 10 "BREAKDOWN!" markPoint was 2 candles early (pointing at close=97 instead of the actual sub-100 close).
2. **Overcrowded time-of-day labels** — Ch 8 lessonChart used 20 candles labeled "9:00"→"13:45"; Ch 10 used "15m-1"→"15m-18".
3. **Hand-authored OHLC** throughout, no `ltCandles()`.

**Six charts redesigned with `ltCandles()`:**

- **Ch 8 introChart** ("Daily Chart — Key HTF Levels"): upgraded to ltCandles, 18 bars, 3+2 alternating up/down legs, SH/SL annotations aligned to last bar of each leg (indices 2,4,7,9,12,14,17). seed:31.
- **Ch 8 lessonChart** ("15-Minute Chart — HTF Level Provides Entry"): 14 bars (T1–T14), pullback→approach→wick through 125 resistance (reject:2.0 on up-leg, close≈124.5)→drop. markPoints at index 9 (wick) and 10 (rejection). seed:42.
- **Ch 8 quiz chart**: 15 bars, cutIndex:10, ltCandles approach from 116→124 (all closes <125), then wick reveal at index 11, rejection at 12. seed:55.
- **Ch 10 introChart** ("4H Chart — Breakdown S/R Flip"): 17 bars, resistance changed from 95→100 (consistent with lessonChart), BREAKDOWN! now at index 5 (first close below 100 at 96), S/R Flip Retest at index 13, Short Entry! at 14. seed:37.
- **Ch 10 lessonChart** ("15min Chart — Entry at 4H Breakdown SR"): 16 bars (T1–T16), approach from 91→99.5, wick into 100 zone (reject:2.0, close≈99.5) at index 10, Short Entry! at 11, Target Hit at 15. seed:43.
- **Ch 10 quiz chart**: 17 bars, cutIndex:12, approach from 91→99.5 across 12 pre-cut bars, wick reveal at 13, Short Entry at 14, Target Hit at 16. seed:61.

Teaching-chart rollout status: ✅ Ch 0–8, ✅ Ch 10. ❌ Ch 9, 11, 12 still to rework.

---

## Audit-fix session — 2026-06-08 morning (all local, not deployed)

A two-hat (trader + UX/UI) audit of the whole site, followed by fixes. All verified in the live preview.

### Content / trading accuracy (trader hat)
- **Kelly/Pareto lesson + quiz rewritten** (`lt-data.js`, Course 1 Ch 12 "Optimizing Returns"). Now uses the real `K = W − (1 − W) ÷ R`, the `K = 2W − 1` even-money shortcut, and **fractional Kelly**.
- **Glossary candlestick fixes** (`lt-glossary.js`): inverted hammer now its own entry; spinning top now its own entry; Fibonacci `0.705` → `0.786`. 79 terms / 41 figures.
- **Course 1 first module renamed** "Supply & Demand" → **"Price Action Foundations"** in both `lt-data.js` and the `LT_MODULE_THEME` key in `lt-engine.js`.
- **In-app BloFin card softened** (`lt-community.js`): tone reduced.
- **Landing stats made honest** (`index.html`): "300+ lessons" → 240+, "80+ glossary terms" → 75+.

### UX/UI
- **Final Exam integrity** (`lt-engine.js`): `handleExamAnswer` no longer reveals per-question correctness — neutral `.exam-answer-btn--selected` state until submission.
- **Exam exit**: persistent `.exam-exit-btn` calling `exitExam()`.
- **Certificate** (`lt-index.html` + `lt-engine.js` + CSS): editable recipient-name `<input id="cert-name">`, course line uses `getCourseName()`.
- **Light theme** (`lt-settings.js` `LT_LIGHT_THEME`): white cards + crisper borders.
- **Settings "Developer Tools" → "Shortcuts"** (then removed in afternoon session — merged into Progress).
- **Flashcard flip** (`lt-flashcards.js`): `rotateX(180deg)` → `rotateY(180deg)`.
- **Pixelify font removed** as an option.

## Earlier changes (all local, not deployed)

### Sidebar completed-chapter icon
Changed from `check-circle` to bare `check`. All three completed states use `check` in green `#00c878`. Located in `buildSidebar()`.

### Lesson bullet redesign
No background/border. Teal `–` dash marker, plain left-padded text, `gap: 7px`.

### Chart markPoint clipping fix
`grid.top` and `grid.bottom` in `buildCandlestickOption` are dynamic: `62px` when markPoints are present, `26/36px` otherwise.

### Tooltip bug fix (ECharts axis index prepend)
`const [, o, cl, lo, hi] = c.data` — skip the leading axis index. Also removed `% change` line (meaningless on synthetic prices). Tooltip formatter now also handles object data items (from `candleColors` per-candle style).

### Quiz wrong-answer behavior
Wrong answers shake red (`answer-btn--shake`, 0.55s) and re-enable after 650ms. Chart only reveals on correct answer.

### Real Example toggle — temporarily disabled
"Real Example" button removed from lesson and quiz chart headers. Code preserved; four comment-out lines in `renderLesson()` / `renderQuiz()` to re-enable.

### Video theater mode → Candles/Video tabs
Originally added as Watch/Hide Video button. Replaced in afternoon session with segmented Candles|Video tab control.

### Nav bar
- **BTC live ticker** in top nav bar (left of Discord). Animated green pulse dot. Responsive hide at ≤1024px.
- **Discord icon** white in dark mode, `#5865F2` in light mode.

### Responsive / laptop scaling
Breakpoints at the **very end** of `lt-styles.css` (must stay there):
- `≤1400px`: `--sidebar-w: 230px`
- `≤1150px`: `--sidebar-w: 210px`, hide step-pill labels
- `≤1024px`: `--sidebar-w: 200px`, hide BTC ticker

### Chart markers / annotations
markPoint fallback color: pin `#94a3b8`, label `#cbd5e1`. `distance: 14`.

### Welcome back modal
LT logo, "LIQUIDITY THEORY" wordmark, course-accent top border, "Resume Course" CTA. `--modal-accent` from `LT_COURSE_ACCENTS[getActiveCourseNum()]`.

## Real Example (historical data) — fully built, currently disabled
`_findRealPattern()` / `_findRealPatternForQuiz()`. `LT_PATTERNS` has 42 patterns covering both directions. To re-enable: uncomment 4 lines in `renderLesson()` and `renderQuiz()`.

## Teaching-chart rollout — ✅ COMPLETE (all four courses)
All 232 candlestick charts converted to `ltCandles()`. 0 bad bars. Seeds 4–283 used across all files.
- Course 1 (`lt-data.js`): 33 charts ✅
- Course 2 (`lt-data-course2.js`): 50 charts ✅
- Course 3 (`lt-data-course3.js`): 61 charts ✅
- Course 4 (`lt-data-course4.js`): 88 charts ✅ (C4 Trend Buddy/Crayons/Genie candleColors preserved)

### Validation command (run from workspace):
```bash
node -e '
const fs=require("fs"),vm=require("vm");
const ctx={document:{addEventListener(){}},console}; ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("./lt-chartgen.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("./lt-data.js","utf8")+"\n;this.__LT=LT_CHAPTERS;",ctx);
const LT=ctx.__LT; let charts=0,prob=0;
LT.forEach(c=>[c.introChart,c.lessonChart,c.quiz&&c.quiz.chart].filter(x=>x&&x.ohlc).forEach(x=>{charts++;if(x.labels.length!==x.ohlc.length||x.ohlc.some(a=>a[2]>Math.min(a[0],a[1])||a[3]<Math.max(a[0],a[1])))prob++;}));
console.log("Course1 charts:",charts,"problems:",prob);
'
```

## Course overview pages — roadmaps
Course overview/recap pages render a **roadmap panel** instead of a chart. Driven by `chapter.roadmap` field; `renderIntro()` branches on its presence.

## Landing page (`index.html`)
- Public-resource tone: "A free, open learning resource" / no account, no ads, no paywall.
- Nav + footer: "Open the app". Hero: text-art logo (live digit animation) + live BTC ECharts chart.
- BTC nav ticker: green pulse dot + "BTC " + bold price. No % change.
- **No logos band** (removed this session).

## Glossary figure lightbox
Clicking any glossary figure opens a **pop-out lightbox** (`.gl-lightbox`). Close via ×, click-outside, or Esc.

## Deferred / next steps
1. **REDEPLOY to Vercel** — large backlog of local-only changes. Run `vercel --prod --token "$VERCEL_TOKEN"` from the workspace. **NOTE:** deploy now runs a build step (`buildCommand` → `node tools/gen-seo.js`) that generates `/learn`, `sitemap.xml`, `robots.txt`. After deploy, verify `/learn/` + `/sitemap.xml` resolve and a lesson page is crawlable (view-source). Fallback if the build setup misbehaves: remove `buildCommand` from `vercel.json`, run the generator locally, un-ignore + commit the output.
2. ~~**Continue teaching-chart rollout**~~ ✅ DONE (2026-06-09) — all 232 charts across all four courses converted to `ltCandles()`. 0 bad bars.
3. ~~**Exam question bank**~~ ✅ DONE (2026-06-09) — authored 12 Qs/course, exam samples 10/attempt. Author should spot-check wording.
4. **Course 4 tool dependence (deferred):** decide how to handle proprietary/paid tools (Hyblock, Trend Buddy, PAL, Crayons, Genie, FSVZO).
5. **Re-enable Real Example toggle** — uncomment 4 lines in `renderLesson()` and `renderQuiz()`.
6. ~~**Custom domain**~~ ✅ DONE (2026-06-09) — `liqtheory.com` acquired; `index.html` meta (canonical/og:url/og:image/twitter:image) + `tools/gen-seo.js` `BASE_URL` updated to the apex. **Still requires (Vercel dashboard, user action):** add `liqtheory.com` + `www.liqtheory.com` to the project, set `liqtheory.com` as **primary** (auto-301s www→apex), point DNS (apex A → `76.76.21.21`, www CNAME → `cname.vercel-dns.com`), then `vercel --prod` to regenerate sitemap/robots/`/learn` on the new domain. After deploy: re-scrape the OG via the platform debuggers (the domain change busts most unfurl caches anyway).
7. **Glossary figures (optional):** schematic down-candles in `GL_FIGURES` still draw in red — could update to white/`getBearishColor()`.
8. **Mobile header overflow (optional):** top-right now has 4 icon buttons; consider an overflow menu on narrow screens if needed.
