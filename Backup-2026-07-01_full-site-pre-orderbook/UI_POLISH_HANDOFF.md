# UI Polish — Session Handoff (2026-06-30)

Focused handoff for the **v2 lesson chart-label overlap / leader-line** task, plus a broad
UI/UX pass across the app + landing. Read alongside `CHART_AUDIT_HANDOFF.md` and `HANDOFF.md`.
The 2026-07-01 session shipped **10 things** (all verified live, `node --check` clean, 0 console
errors, backed up per wave). Newest first below.

## ✅ DONE (2026-07-01): Glossary visual audit — applicable figures, high-end + labeled — SHIPPED

Owner asked to audit the Glossary visuals, THEN refined: "not every term needs an image — only the ones that
are applicable; the ones that keep a figure must be labeled properly, show *exactly* what they're talking about,
be high-end." All in `lt-glossary.js`; `node --check` clean; **0 console errors** (glossary + flashcards);
verified live desktop + ≤400px mobile + lightbox + flashcard Definition→Term reuse. Cache token bumped
**lt-glossary.js 1.19.1 → 1.20.1**. Backup: `Backup-2026-07-01_glossary-visuals/`. Temp harness deleted.

**Audit finding:** only **54/100** terms had a figure — the glossary's best feature (framed, zoomable diagrams,
reused as flashcard prompts) was missing from ~half, and many *unlabeled* older figures were ambiguous.

**Shipped (two passes):**
1. **Coverage — figures for every APPLICABLE term → 96/100 illustrated.** Authored accurate diagrams for the
   chart-native missing terms (Derivatives, Risk, Basics, Structure/Liquidity/Indicators/Foundations/Patterns) in
   the existing `_gc/_gl/_gp/_gz/_gtx` vocabulary. Added primitives: `_garr` (arrow), `_gdot`, `_glab` (anchored
   label), `_gzc` (placed zone), `_gbar` (histogram), `_gx`/`_gck` (✕/✓). Per owner, the **4 crypto-infrastructure
   terms are intentionally text-only** (no figure): `cex`, `dex`, `wallet`, `cold-storage` — they're icons, not
   price visuals. (First pass had briefly added all 100 + key/lock icons; those 4 + `_glKey`/`_glLock` removed.)
2. **High-end labeling + accuracy pass on ALL kept figures.** Went category-by-category (verified each on a
   contact-sheet harness) adding a precise generic callout to every previously-unlabeled figure so it shows
   *exactly* its concept: candlesticks (`long lower/upper wick`, `engulfs prior`, `star`, `buyers reclaim ↑`,
   `equal highs`, `3 strong closes`, O/H/L/C anatomy), structure (`resistance/support`, `supply/demand`,
   `sell high/buy low`, `break ↑/holds`, swing `high/low`, `prior high`, `premium/discount/equilibrium`),
   liquidity (`stops/reversal ↓`, `fake break ↓/reclaim ↑`, `last down candle`, `revisits zone` — mitigation
   rebuilt to actually return to its origin zone), indicators (`the cloud`, `slow line`/`fast line`,
   `plotted behind price`, `cloud flips`, `enter/target`, `compress/release`), derivatives (`longs/shorts pay`,
   `price/delta`, `clusters`, `price/open contracts`), risk (`signals align`, `peak/trough`, `stop trails ↑`),
   patterns (`pole/flag`, H&S peak dots). Labels stay GENERIC so figures remain valid as the Definition→Term
   flashcard prompt.
3. **On-brand palette** (kept from first pass): repointed `_GT/_GR/_GG` → `var(--teal)/var(--bear)/var(--gold)`
   (tracks the learner's configured bull/bear colours) and shifted legacy maroon `rgba(204,34,34)` fills to pink,
   so every bearish element matches the candles + v2 lessons. Neutral `_GM` → `#8b85a3` for legible guide labels.
4. **Upgraded 4 weak figures:** `trendline` (was alias of `trend` → real drawn diagonal on the swing lows +
   `connects the lows`), `oscillator` (was alias of `rsi` → generic bounded wave), `fvg` (explicit untraded-gap
   band), `wick` (clear upper/lower labels).

## ✅ DONE (2026-07-01): landing polish · mobile audit · quiz layout · chart key button — SHIPPED

Four owner-requested UI passes after the backlog was cleared:

1. **Landing page (`index.html`) polish — "make it reflect the app's quality."** It read like a
   competent dark-SaaS template; now it reads like the same bespoke terminal as the app.
   - **Brand alignment:** headings/wordmark → **Cascadia Code** (the app's display voice, body stays
     JetBrains Mono); every bg/border/text token re-pointed to the app's live values; fixed the
     too-dark `--text3` (`#675d82` → `#8b85a3`, WCAG-AA).
   - **Killed template tells:** course-card **3px colored side-stripe** → tinted border + corner glow +
     accent chip; feature **boxed rounded icons** → bare accent glyphs; **all-caps eyebrows** →
     sentence case (hero + pillbar).
   - **Motion robustness:** reveal content is now **visible by default**, the hidden start state gated
     behind an `html.js` class set in `<head>` before paint (no blank page if JS/observer fails; no
     flash); app easing curve + subtle hero load-in. Hero headline made fluid/bolder, column widened
     so the 2-line break holds. No cache token (it's the HTML entry). Backup: `Backup-2026-07-01_landing-pre-index.html`.
2. **Mobile UX audit + fixes (app @375px).** Verdict: already ~85% solid (core lesson player, charts,
   scenarios all legible — the leader-line/dedup work holds at a 341px canvas). Fixed the localized
   issues (all in `lt-styles.css`): home course cards **2-up→1-col** at ≤480px (were 166px cramped);
   nav drawer **210→320px** + chapter titles **wrap** instead of truncating; header tap targets → **44×44**;
   **font floor** ~10–11px for the tiny 8–9px badges/eyebrows; un-truncated the "Get Started" title;
   **sentence-cased** the noisy all-caps labels ("Learning Hub", "Your Courses", "Course N", …) — the raw
   text was already cased, CSS just uppercased it, so this was pure `text-transform` removal (improves
   desktop too; kept small pill badges + the drawer course-switcher as intentional terminal chrome).
3. **Quiz UI — compact/clean.** Single-choice options were full-width rows even for one-word answers
   (Line/Wick/Stick/Body) → lots of dead gutter. Added an **answer-length-aware layout** in
   `_mqQuestionHtml` (`lt-engine.js`): short answers (≤28 chars, 3+ options) get an `.mq-options--grid`
   **2-col grid** (1-col on ≤560px phones); long answers (formulas/sentences) stay full-width; trimmed
   `.mq-opt` padding. 57+/77 module-quiz MC questions now grid; adapts per question automatically.
4. **Removed the chart colour-key button** (the 🔑 "Show colour key" toggle) from `chartCardHtml` — gone
   from every chart (intro/scenario/quiz), plus the orphaned legend div + its `_renderChartLegend` call.
   Dead `toggleChartLegend`/`_renderChartLegend`/`_chartLegendItems` + CSS left inert (harmless).

## ✅ DONE (2026-07-01): scenario "D1 D2…" axis bug + Introduction-step redesign — SHIPPED

Two owner-reported items, both in `lt-engine.js` (+ `lt-styles.css` for the layout). Verified live;
`node --check` clean; **0 console errors**. Cache tokens bumped: **lt-engine.js 3.116.4 → 3.118.1**,
**lt-styles.css 1.99.2 → 1.99.3**.

**1. Scenario x-axis flashed generic `D1 D2 …` instead of real dates.** Root cause: `buildCandlestickOption`
already builds a real calendar axis, but three *reveal/replay* paths overwrote it with the raw generic
`def.labels` — `renderTeachingChart` reveal (`xAxis:{data:def.labels}`), `_animateSyntheticReveal` frame-0,
and the synthetic replay reset. So the moment a scenario's answer revealed (candle-by-candle animation),
the axis flipped to `D1..Dn`. Fix: one shared resolver `_engResolveLabels(def)` — generic labels →
deterministic real calendar dates seeded off the FULL candle set (so a setup slice and the full reveal
share **identical** dates); custom labels (R/%, W/M) pass through. `buildCandlestickOption` and all three
reveal paths now route through it. Verified: **144 candlestick charts across all 4 courses, 0 D-labels** in
setup or reveal; a live candle-by-candle reveal stays on real dates at every frame; setup dates are a
consistent prefix of the revealed dates (the only "mismatches" are the 3 Ichimoku charts whose forward-
displaced Kumo pads blank future slots — expected).

**2. Introduction step read strange (tall text | short half-width chart, awkward empty quadrant).** Rebuilt
`renderIntro` from the 2-col `1fr\|1fr` grid to a **single centered column, visual-first**: module banner →
full-width teaching visual (chart / roadmap / concept) → readable overview card (heading · lead · key
points) capped at a 720px measure. The chart is now full-width and legible (was a cramped ~460px half-
column) and leads the page ("show, don't tell"); the framework reads beneath it. Also dropped the off-brand
ALL-CAPS "Introduction" eyebrow (`.content-card-tag`, kept on the Lesson step). CSS: new
`.intro-layout--stack` + `.intro-copy` (kept the `.intro-layout` class on the wrapper so the chart
expand/theater logic — `card.closest('.intro-layout')` — still resolves). Verified: **all 81 intro chapters
render the stack, 0 throws**; chart / roadmap (course openers, roadmap→chart→copy) / concept variants all
clean; responsive down to 402px (chart + copy flow full-width). Reversible: order is one line in
`renderIntro` (swap `visualHtml` above/below the copy) if the owner prefers text-first.

## ✅ DONE (2026-07-01): leader-line callouts for chart labels — SHIPPED

Implemented in `lessons-v2/renderer.js` (cache token bumped **1.16.3 → 1.17.0** in `lt-index.html`).
Pure layout/paint — no vocabulary-anchor changes. Verified: `node --check` clean, full v2 render
sweep **0 throws / 0 unknown anchors** (84 lessons / 397 beats / ~2000 forced frames), **0 deep
overlaps at desktop 980px AND realistic-narrow 640px across all 84 lessons** (only sub-4px grazes),
0 console errors, live end-to-end open of C1 Ch4 confirms it.

What shipped:
1. **Trendline label → `_mq`** — now a pill with collision + hover-pop + leader (anchored ~65% along
   the drawn line; `above` for resistance / `below` for support). Fixes "can't highlight falling
   resistance". (`_anno` trendline branch.)
2. **Leader lines** (`_paintLeader`, called from `_drawMarkerLabels`) — thin 1px, low-alpha, colour-
   tinted connector from each pill's nearest edge to its exact anchor + a 2px dot on the anchor; the
   endpoint follows the hover-pop scale and brightens on hover. Skipped only when the pill already
   sits on the anchor (<5px).
3. **Push into clear space + responsive** — base offset `OFF` 12→16 (14 narrow), `GAP` 4→6 (7 narrow);
   font shrinks 11→10px when the plot is <540px wide.
4. **Unified collision set** — level pills + zone chips now reserve their rects (`this._reserved`) as
   immovable blockers so marker/trendline pills dodge them. The resolver was rewritten from a per-group
   directional stack to a two-phase relaxation: **Phase A** vertical (labels stack over their own dot),
   **Phase B** horizontal escape for anything still overlapping (a pill jammed at the plot edge or an
   immovable level chip). Leaders keep every nudged pill tied to its anchor.

**Also fixed 2 pre-existing renderer crashes/bugs (surfaced by the render sweep, NOT introduced here):**
`_chartAnnos` grouped consecutive same-named CHART beats by move NAME only, ignoring `params`. That
(a) **crashed** `course1/06_rangebound_markets` beat 4 (resolved an up-breakout's `touchHi4` marker
against the down-breakout geom → `unknown anchor "touchHi4"` on normal navigation) and (b) stacked
**contradictory labels** in `course2/08_volume_analysis` (beat 3 showed both "rising volume = strong"
and "fading volume = weak" on `hh2`). Now it groups by **geom identity** (same move AND params),
matching `_describe`'s own `prev.geom === d.geom` continuity test. Only 3 differing-param neighbour
pairs exist in the whole codebase and all 3 misbehaved before; same-param evolving charts are untouched.

Residual: only at sub-480px chart widths (below any size the site renders — canvas runs 720–960, ~480
at half-width) do a couple of extreme cases still touch; leaders keep them legible. Optional future
polish (not needed): dedup repeated identical labels ("sell the touch" ×N → label once, dot the rest).

---

## ▶ ORIGINAL TASK BRIEF (now done — kept for reference): leader-line callouts for chart labels

**Problem (owner-reported, with screenshot):** on the v2 animated-lesson charts, when the site scales
down the annotation callouts still **overlap** each other, and the **trendline label** (e.g. "falling
resistance") **can't be highlighted/hovered** like the marker pills ("sell the touch") — it renders as
raw text with no pill, no hover, no collision handling.

**Root cause (verified in `lessons-v2/renderer.js`):**
- Marker/`note` labels are queued into `this._mq` and laid out by **`_drawMarkerLabels`** (`renderer.js`
  ~922–975): they get a pill (`_paintLabel` ~977), a collision pass that pushes overlapping labels
  outward (above/below groups), hover-pop, and hit-rects (`this._labelRects`). **BUT** the collision
  pass moves a label away from its anchor **without drawing any connector**, so a pushed pill floats
  free of the candle it describes.
- The **trendline** label is drawn **directly** in `_anno` (the `an.kind === 'trendline'` branch,
  ~1065–1075) via `_haloText` — it is NOT in `_mq`, so it has no pill, no hover, no collision. Same is
  true of **level** labels (pill, drawn directly ~1018–1042) and **zone** labels (chip, ~1051–1055):
  they don't participate in the marker collision system, so they can collide with marker pills.

**Agreed solution (owner + design lens):** one unified, collision-managed callout system + **thin
leader lines**.
1. **Route the trendline label through `_mq`** (queue it like a marker) so it gets the pill + collision
   + hover. Anchor it to a point on the line (≈65% along, or the last drawn point); `place:'above'` for
   `style:'resistance'`, `'below'` for `'support'`. → fixes "can't highlight falling resistance".
2. **Add leader lines** in `_drawMarkerLabels` / `_paintLabel`: after layout, if a label's center
   (`L.cx,L.cy`) is offset from its anchor (`L.anchorX,L.anchorY`) beyond a small threshold (~14px),
   draw a **1px** connector from the anchor point to the nearest edge/corner of the pill, in `L.color`
   at ~0.5 alpha, with a 2px dot at the anchor. → "give them space + a thin line to the specific thing".
3. **Now that the link is preserved, push labels further into clear space** — raise the base offset
   (`OFF`, currently 12) and/or allow left/right placement, so the collision resolver can spread labels
   out instead of cramping. This is what actually removes the scaled-down overlap.
4. **Bring level + zone labels into the same collision set** (or at minimum make them reserve space so
   marker pills dodge them) for full consistency. Optional but recommended.
5. **Responsive:** at small canvas widths, shrink the label font a step and/or spread more aggressively;
   consider hiding purely-decorative duplicate labels ("sell the touch" ×3 → label once, dot the rest).

**Key code (all in `lessons-v2/renderer.js`):**
- `_drawMarkerLabels` (~922) — the layout/collision/hover pass; `_mq` is the queue.
- `_paintLabel` (~977) — draws the pill (add the leader line here or in the pass).
- `_anno` (~1015) — per-kind draw: `level` (pill), `zone` (chip), `marker`/`note` (→ `_mq`),
  `trendline` (raw text — MOVE THIS INTO `_mq`), `heatmap`.
- `_resolveChartAnno` (~280) — resolves show-ops to specs (no anchor changes needed for this task).
- Hover: `this._labelRects` (hit-rects) + `this._hoverId` / `this._hoverP` — find the pointermove
  handler that sets `_hoverId` from `_labelRects` and make sure it still maps to the pushed pill.

**Gotchas:** keep the leader line thin + low-alpha so it never fights the candles; the pill scales on
hover-pop (`L.hp`) so the leader endpoint should follow; honor `prefers-reduced-motion` (already wired
via `self._reduceMotion`); this is pure layout/paint — do NOT change vocabulary anchors, so the v2
render sweep must stay green.

**Verify + ship (unchanged rules):** `node --check lessons-v2/renderer.js` → reload preview → run the
v2 render sweep (drive every lesson through the real renderer; require **0 throws / 0 unknown
anchors**) → eyeball a *busy* chart (C4 "DBS + Funding + OI" scenario, C1 Ch4 `sr_flip`/`trendline`) at
**desktop AND a narrow/scaled width** to confirm no overlap, the trendline label is hoverable, and every
pushed label has a leader line → `preview_console_logs` level error must be empty → **bump
`lessons-v2/renderer.js` cache token in `lt-index.html`** → back up (`Backup-<date>/`) → OpenClaw
auto-deploys, **never run a manual `vercel`**.

---

## What shipped THIS session (all verified live, 0 console errors, backed up per wave)

1. **Systemic engine (ECharts course charts)** — real date/time x-axis (replaced generic `D1..Dn` +
   blank context; per-chart `def.tf`), round y-axis ticks (no more `74.9905`), line-chart brand-pink
   palette + real series names + rounded ticks, **Fibonacci `61.8%`** labels, RSI-zone palette,
   **per-segment Ichimoku Kumo** (twists render). Robust time-axis generated per candle (auto-fixed the
   C4 Ch27 E2E label/candle mismatch).
2. **4 course data files** — every audit fix + rebuild (levels established before break/sweep/flip; pins
   on the event candle; palette fixes; volume/indicator panels added; non-price "candlestick" charts →
   line charts). Includes re-audited C2 Ch6 + C4 Ch12 gap chapters, and C2 Ch12/13 Ichimoku twist rebuild.
3. **v2 animated lessons** — rebuilt `chart-vocabulary.js` moves (real structure + new
   stop/target/entry/HH-HL/TK-cross anchors; fixed inverted Genie/Trend-Buddy colors); `renderer.js`
   role-toned level colors (support teal / resistance-stop pink / target-liq gold) + on-palette
   trendlines/histograms; all 84 lessons rewired to close say/show gaps.
4. **New renderer primitives** — `panel:'sub'` markers (callouts on the funding/OI/CVD/basis/FSVZO/volume
   sub-panel series) + an intensity-ramped `heatmap` band; wired into the C4 sentiment/liquidation +
   C2 volume lessons.
5. **Chart-tag template** — levels = solid color pills; markers + zones = dark chips + colored text/border
   (unified, legible on candles).
6. **Cascadia site-wide** — `Cascadia Code` is now the primary in `--font-display` + `--font` + the
   player + all chart canvases (IBM Plex Mono / JetBrains Mono kept as fallbacks); loaded via Google Fonts.
   NOTE: Cascadia Code has programming **ligatures** and tops out at weight **700** — switch to
   "Cascadia Mono" or `font-feature-settings:"calt" off` if literal chars are ever wanted.
7. **Spacing fixes** — normalized the block rhythm to a single **18px** source (killed the grid
   `row-gap` + card-margin compounding; `module-banner` 14→18); fixed the scenario chart↔question gap
   (inline `margin:0 auto` → `…18px`).
8. **Scenario chart default size** — was 720px ("small"); now **960px (medium)** by default, expand →
   large unchanged. (Intro-step chart is still the deliberate side-by-side half-width — owner may want it
   full-width later.)
9. **Player-chrome polish** — collapsed 3 stacked shaded slabs → one quiet footer surface + single
   hairline; ghost transport with a **solid teal Play** pill (dark text) as the one primary; prev/next
   chevrons at mid-ink; unified right-cluster chips; thinner progress; softer frame shadow; radius scale
   tightened to 6/8/12/14.

## Current cache tokens (live in `lt-index.html`)
`lt-styles.css 1.99.5` · `lt-engine.js 3.119.3` · `lt-glossary.js 1.20.1` · `lessons-v2/renderer.js 1.18.1` ·
`lessons-v2/chart-vocabulary.js 1.7.0` · `lessons-v2/player.css 1.10.1` · v2 lesson token
`?v=1.0.4` (hardcoded in `lt-engine.js` `ensureV2LessonsLoaded`) · data: `lt-data.js 1.10.0`,
`lt-data-course2.js 1.11.2`, `lt-data-course3.js 1.12.0`, `lt-data-course4.js 1.20.1`.
Google Fonts link now includes `Cascadia+Code`.

## Backups (newest last)
2026-06-30 waves: `Backup-2026-06-30_chart-overhaul-pre` → `…-wave1-echarts` → `…-wave2-v2-done` →
`…-wave3-primitives` → `…-wave4-polish` → `…-wave5-font-spacing` → `…-wave6-cascadia-sitewide` →
`…-wave7-chart-default-size` → `…-wave8-player-chrome` → `…-wave8b-player-chrome-final`.
2026-07-01: `Backup-2026-07-01_leader-lines-{pre,done}` → `…_intro-axis-{pre,done}` →
`…_vocab-capstone-{pre,done}` → `…_landing-pre-index.html` → `…_mobile-audit-pre-styles.css` →
`…_quiz-pre-{engine.js,styles.css}`.

## Handy verification helpers (already proven this session)
- **Open any (locked) chapter for testing:** in the preview console, `ltSetUnlockAll(true)` then
  `ltOpenChapter(courseNum, chapterIdx)` (0-based; e.g. `ltOpenChapter(1,2)` = C1 "Support & Resistance").
  Reset with `ltSetUnlockAll(false)` — it's a localStorage flag, never a file change.
- **v2 render sweep (0 unknown anchors):** load all courses via `ensureV2LessonsLoaded(1..4)`, then for
  every `LT_LESSONS[id].beats` CHART/CANDLE beat, `LTChartVocab.get(kind,name)` and check each show-op's
  `at`/`of`/`from`/`to` against `geom.anchors` (and `region` ops against `geom.regions`). Must be 0 bad.
- **Static server for preview:** the site is static; served on `:5199` this session via
  `python3 -m http.server`. Course app entry = `lt-index.html`. Never manual-deploy.

## Open / optional follow-ups (owner's call — nothing on fire)
The original backlog is fully cleared. New candidates surfaced during the 07-01 UI passes:
- **Landing "show a lesson in motion" section** (the one ambitious item I deferred). The landing sells
  *animated* lessons but never shows one — a looping candle-build with labels appearing (mimicking the v2
  renderer) would be the strongest single upgrade. This is "push bolder" territory, higher effort/risk.
- **Sentence-case the last all-caps chrome** (left as intentional terminal chrome for now): the drawer
  course-switcher labels (`.sidebar-course-label` "COURSE 1: …"), the module-quiz kicker
  ("MODULE QUIZ · LEARNING ASSESSMENT"), and the module banner name ("PRICE ACTION FOUNDATIONS").
- **Module banner left accent stripe** — a themed `border-left` on the chapter module banner (minor;
  more acceptable on a banner than a card, but it is a side-stripe).
- **Extreme <480px chart pill touches** — a couple of leader-line pills still touch at sub-480px canvas
  widths (below any size the site renders; leaders keep them legible). Only worth it if you want it perfect.
- Two still-tiny v2 vocab gaps from the original chart audit are now closed (FSVZO zero-cross + 2nd lower
  heatmap band shipped 07-01).

## ✅ DONE (2026-07-01): remaining backlog cleared — SHIPPED

`node --check` clean; **0 console errors**; v2 render sweep **0 throws / 0 unknown anchors** (84 lessons);
engine chart sweep **222 charts / 0 throws**. Tokens bumped: **chart-vocabulary.js 1.6.0 → 1.7.0**,
**lessons-v2/renderer.js 1.17.0 → 1.18.1**, **lt-engine.js 3.118.2 → 3.119.0**, **lt-data-course4.js
1.19.0 → 1.20.1**, v2 lesson token **1.0.3 → 1.0.4** (in `ensureV2LessonsLoaded`).

1. **FSVZO zero-cross anchor.** Added `zeroCross` (i:6, the buying→selling flip) to the `fsvzo` vocab move
   and a "zone flip" marker to `16_FSVZO.js` — the lesson narration calls the flip "the key signal" but the
   chart never marked it; now it does.
2. **2nd lower liquidation heatmap band.** Added `bandLo2` (price 43) to `liquidation_levels`, plus a small
   backward-compatible `intensity` param on the heatmap primitive (`renderer.js` `_resolveChartAnno` +
   `_anno`, default 1). `22_Positions_Heatmap.js` now draws the lower band as a genuine (dimmer, teal)
   heatmap instead of a flat zone — matching the "dense band above, lighter one below" narration.
3. **v2 leader-line dedup.** `_drawMarkerLabels` filters the label queue to unique text: a chart that marks
   the same thing N times (e.g. "sell the touch" ×3) draws the pill once (leftmost) and keeps only the
   anchor dot on the rest (dots are already drawn in `_anno`). Cuts clutter, loses no marker.
4. **C4 capstone 4-panel confluence board.** New engine `_applyMultiSubPanels` (paired with a `subPanels`
   shift in the context pass + builder wire-up) renders N stacked sub-panels, each its own grid/y-scale:
   funding/basis → sign-coloured histogram, oi → gold line+area, cvd → accent line; only the bottom panel
   shows the date axis. The capstone `introChart` (C4 "Applying Sentiment — Summary") now DRAWS all four SA
   variables — Funding · Open Interest · Cumulative Delta · Basis — telling the aligned-into-the-DBS →
   squeeze story, replacing the "4/4 SA aligned" scorecard label. Single-`subPanel`/volume/activity charts
   are untouched (backward-compatible; the one 5-grid chart is the capstone). The chapter's `lessonChart`
   was left as the scorecard version — it isn't rendered (the Lesson step is the v2 animated player).

---

## Paste-in prompt for the next session
> On the Liquidity Theory app at `/Users/pbot/.openclaw/workspace/` (static site; serve `lt-index.html`
> on a local port — a launch config `lt-app-ll` on **:5205** works; **never run a manual `vercel`** —
> OpenClaw auto-deploys). Read `UI_POLISH_HANDOFF.md` first — the last session cleared the whole backlog
> and shipped a broad UI/UX pass (leader-line callouts, scenario date-axis fix, single-column visual-first
> Introduction step, FSVZO/heatmap vocab anchors, C4 capstone 4-panel confluence board, leader-line dedup,
> landing-page polish, mobile audit fixes, compact quiz grid, removed the chart colour-key button).
>
> There is **no single open task** — see "Open / optional follow-ups" for the candidates (the strongest is
> a landing section that actually *shows an animated lesson in motion*). Pick one with me, or tell me what
> you want next.
>
> **Working rules (unchanged, always):** back up the files you'll touch to `Backup-<date>_<slug>/` first;
> `node --check` any JS you edit; use the Claude Preview tools (serve on :5205, don't fight the other
> chat's :5173); verify live — for v2 lessons run the **render sweep** (`ensureV2LessonsLoaded(1..4)` then
> drive every `LT_LESSONS[id].beats` CHART/CANDLE beat through `new LTRenderer(...)` → require **0 throws /
> 0 unknown anchors**), for engine charts build every `def` through `buildCandlestickOption` → 0 throws,
> and eyeball **desktop AND ≤400px mobile**; confirm `preview_console_logs` error level is empty; then
> **bump the matching cache token(s) in `lt-index.html`** (and the hardcoded v2 lesson `?v=` in
> `ensureV2LessonsLoaded` if you touch lesson files). The app scrolls inside `.content-area`, not the
> document; unlock chapters with `ltSetUnlockAll(true)` + `ltOpenChapter(courseNum, chapterIdx)`.
