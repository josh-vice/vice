# UI Polish — Session Handoff (2026-06-30 → 2026-07-01)

Read alongside `CHART_AUDIT_HANDOFF.md` and `HANDOFF.md`. Everything below is verified live,
`node --check` clean, 0 console errors. **Newest first.**

## ⚡ ACTIVE (2026-07-02 overnight): OVERHAUL COMPLETE — Phases 4–7 ALL SHIPPED, awaiting owner review of the whole batch

Owner authorized an unattended overnight run ("proceed with everything, best judgement") plus a
mobile-clutter fix from their screenshots. Everything below is verified (final sweep: engine 246
charts/600 levels/0 throws/0 clipped · v2 84 lessons/525 beats/0 failures · 0 console errors) and
token-bumped; NOTHING deployed — owner reviews + deploys the whole batch. Full detail per phase is
checked off in `AUDIT.md`; backups per phase under `Backup-2026-07-02_*`.

- **Mobile annotation overhaul** (the owner's screenshots): v2 renderer tight mode <430px plot —
  labels shorten to their subject, pills drop a size step, hover/TAP pops the full text (tap no
  longer advances the beat); level/zone/heatmap chips shortened too; engine ECharts pills get the
  same subject-shortening ≤480px. Verified live at 325px on the exact screenshotted beats.
- **Phase 5 (Course 3)** — engine+mq per AUDIT-COURSE3 (CoT P0 mechanism rewrite, journal stop
  un-swap, 9 chart-fidelity rebuilds w/ harness+seed-scans, P2 batch) + all 20 v2 decks rewritten
  (margin-management funding→liq-creep arc, trading-plan rebuilds, DBS/SSR, four range rules,
  case study, five-loss rule, evolution arc…).
- **Phase 6 (Course 4)** — engine per AUDIT-COURSE4 (PAL absorption polarity un-inverted through
  copy/charts/quiz, real liquidation tiers, E2E $4,900, six tabs, FSVZO, OI doctrine harmonized)
  + 29 v2 decks rewritten on EIGHT new vocab moves built+mechanism-tested this run (under_over/
  over_under structures, heuristics MA-channel, scripted Trend Buddy taxonomy, PAL anchors, basis
  snapback, liquidation rebound, ichimoku_cclamp/_pocket/_e2e with computed displacement-safe
  clouds) + mq:315/344-347/380/390 fixed.
- **Phase 7** — landing "lesson in motion" section (looping canvas lesson excerpt + typed caption,
  index.html); FOUR new labs (Structure Builder C1, Divergence Trainer C2, Volume Interpreter C2,
  Equity-Curve Simulator C1) wired as demo steps and verified incl. remount cycles; 3 timer labs'
  dwell retuned; all-caps chrome sentence-cased; stale ./~/ mirror deleted.
- **Narration audio REGENERATED for all 84 lessons** (Kokoro, 525 beats) so captions/audio match
  the rewritten decks — pre-regen, the karaoke captions still displayed deleted content (timings
  JSON overrides the say text).

## Previous (2026-07-02): Phase 4 (Course 2) — first shipped batch of the day

**Phase 4 — Course 2 content: ✅ SHIPPED 2026-07-02** (backup `Backup-2026-07-01_phase4-course2/`;
owner confirmed Phase 3 review before start). All of `AUDIT-COURSE2.md` executed: 3 P0s (Rising
Wedge inverted definition, trailing-stop short-for-long, crows wick rule); real RSI sub-panels on
ch13+ch14 (the divergence chapters finally SHOW the oscillator; ch13/ch14 intros reshaped so the
RSI arc is honest; rsi_zones legacy alias deleted); Ichimoku displacement fixes (ch12 "All Four
Prerequisites Met" rebuilt with ichi:{disp:4} + extended leg — green cloud + twist BEFORE entry,
verified live; ch11 twist pin on the computed twist; quiz pullback holds Kijun); fib direction
aligned to transcript high→low everywhere; 4-chart stop-line batch; ch4 formation charts obey
their own 3IU/MS rules; ch2/ch8/ch9 re-seeds (freak wicks gone, hanging man is a real hanging
man, H&S neckline honest, LTE Level/Entry bullets un-inverted); volume-pin cluster (declining
ladders drawn, coil suppressed, vocab 2× label now draws 2×); mq:153/:190/:165 fixed; FI dead
quiz chart deleted; all 14 v2 decks rewritten per audit (agent-implemented; 0 unknown vocab refs).
Chart edits verified via a node harness replicating the engine's context expansion + ichimoku/RSI
math, then constraint-scanned seeds. Verify: engine sweep 221+26 exam charts 0 throws/0 clipped ·
v2 84 lessons/428 beats/0 failures · live desktop+375px · 0 console errors. Tokens: data-course2
1.15.0, module-quizzes 1.0.4, chart-vocabulary 1.9.0, chartgen 1.2.0, v2 lesson token 1.0.6,
engine 3.129.0. ⚠ FOLLOW-UP called out in AUDIT.md Phase 4: stale TTS audio/timings still
show+speak the OLD narration over the rewritten C1+C2 decks (karaoke captions read the timings
JSON) — audio regen needed for every rewritten deck. **Next = Phase 5 (Course 3, AUDIT-COURSE3.md)
after owner review/deploy.**

## Previous (2026-07-01 evening): Phase 3 of 7

Owner gave a full-ownership mandate: audit everything, then fix content accuracy / charts /
animation / UX / copy / code / perf, **phase by phase, STOPPING after each phase for owner
review + manual deploy**. The whole engagement is tracked in **`AUDIT.md`** (ranked plan with
checkboxes — the source of truth for what's done/next) + **`AUDIT-COURSE1..4.md`** (per-lesson
findings with file:line, one per course) + **`CLAUDE.md`** (ground rules for every session —
read it first; it corrects several stale claims that were in the owner's original brief).

**Phase 0 — audit: ✅ DONE.** 7 agents + live verification. 84 lessons audited against
`/Users/pbot/Desktop/LiquidityTheory_Transcripts/` (NEVER the stale `./~/` mirror). ~25 content
P0s found (worst: C4 PAL absorption meanings inverted AND graded; C3 Close-on-Trigger invented
mechanism; C1 Pareto/Kelly taught opposite to source; C2 Rising Wedge inverted). Owner-delegated
decisions RESOLVED: keep `#08070f` bg, keep C2 orange/C4 pink accents.

**Phase 1 — bugs & safety rails: ✅ SHIPPED** (backup `Backup-2026-07-01_phase1-bugs/`).
Lab-freeze fix (Order Book/Fib/Sentiment froze on revisit — stop-by-element now), sim y-axis
raw-extent ticks, pattern-selector clip, deep-link s=4 clamp, sidebar gate asymmetry, v2 loader
retry-on-failure, sim teardown (`ltSimTeardown` ← `disposeAllCharts`), keyboard reveal-gate,
renderer `_completeTimer`, import string-filters, state clamps, CDN pins + SRI (echarts 5.6.0 /
lucide 1.23.0 / lz-string 1.5.0 / qrcodejs@commit), `.vercelignore` comment bug + internal-file
exclusions, Barlow purged from gen-seo + `learn/` regenerated on-brand, Mark-All fills module-quiz maps.

**Phase 2 — core systems: ✅ SHIPPED** (backup `Backup-2026-07-01_phase2-core/`).
Render-blocking JS 1.36MB→~50KB (all `defer` except sync theming pair lt-store+lt-settings —
moved up, no-flash preserved); mascots 7.6MB→35KB (`perpingo-*-160.webp` + predecode;
`vice-terminal-64.png` 2.4KB mask; originals excluded from deploy); dead code purge (welcome
modal, chart-legend trio, `_practiceBtnHtml`, `_applyRsiZonesOverlay`, 241 lines dead CSS,
f_*.jpg); sidebar rebuild scoping + `_sbProgCache` (+`ltSidebarInvalidate`); BTC ticker 5s +
hidden-tab pause (app + landing); fonts trimmed; `LTUtils.injectStyles` replaces 10 boilerplate
injectors; labs' grey → `var(--text3)`; `.chart-card--center`; dialog a11y + Escape on
exam/cert/sync; real `/favicon.ico`. Deferred w/ reasons in AUDIT.md: data lazy-load, breakpoint
consolidation, strict-mode ×3.

**Phase 3 — Course 1 content: ⚙ IN FLIGHT.** Done + verified (node harness):
- P0 batch in `lt-data.js`/`lt-module-quizzes.js`: ch12 Kelly→Pareto ×20% method (copy + new
  concept-card intro visual + quiz re-keyed to "×20% → 4%"), ch10 RRR(Triple R)-vs-R-multiple
  fix + 1:2 notation standardized, mq trendline-touches key 0→1 ('3'), mq journaling MULTI →
  [0,3] (emotions optional per transcript), ch6 quiz cutIndex 12→14.
- **Vocab geometry pass** (`lessons-v2/chart-vocabulary.js`, numerically tuned + verified):
  range_bound/consolidation/trendlines/sr_flip/uptrend damped (overshoot ≤~1 unit; trendline
  pierce 5.4→0.6); `horizontal_sr` touch5 i:15→16 / break i:18→19 / hold 16→17 (BOTH variants);
  NEW anchors: `range_bound.mid`, `horizontal_sr(support).longStop`(47), `consolidation_breakout
  (down).touchLo4` (entry/breakout → i15/i17); NEW stages: uptrend/downtrend `{base:5,confirm:8,
  all:13}`, candle_story `{down,reversal,rejection,all}` + hammer reshaped [48,52,41,53].
  Renderer default = LAST stage in order (renderer.js:357) so existing beats unaffected —
  C2-C4 anchor sweep re-run: 69 lessons / 89 chart beats / 0 unknown.
- **Phase 3 COMPLETED** same session: `lt-data.js` chart-regeneration + copy batch landed
  (agent-implemented w/ node harness, 510 checks/0 fail; BONUS: restored ch9 lessonChart's lost
  `labels:` line — it was THROWING in the real builder); all Course-1 v2 decks rewritten (L08
  contraction P0, candle zoo, DBS/SSR/TFA, L14 Kelly ×20% rewrite, pacing splits on the new
  stages). Verified: engine sweep 227/0 throws, v2 sweep 84 lessons/146 beats/0 unknown, live
  desktop+375px, 0 console errors. Tokens bumped: lt-data.js 1.11.0, lt-module-quizzes.js 1.0.3,
  chart-vocabulary.js 1.8.0, v2 lesson token **1.0.5** (in ensureV2LessonsLoaded), engine 3.128.0.
  Full detail + checkboxes in `AUDIT.md` Phase 3. **Awaiting owner review/deploy; next = Phase 4
  (Course 2, from `AUDIT-COURSE2.md`).**

**Then:** Phase 4 (Course 2) → Phase 5 (Course 3) → Phase 6 (Course 4) → Phase 7 (polish +
owner-queued: landing "lesson in motion", new labs, tune the 6 labs, all-caps cleanup) — each
from its `AUDIT-COURSEn.md`, each ending with the full verify sweep + STOP for owner deploy.

The **2026-07-01** session, after clearing the backlog, shipped three big things:
1. **Glossary visual audit** — figures for every *applicable* term (96/100; the 4 crypto-infra terms are
   deliberately text-only), each labelled to show *exactly* its concept, on-brand palette, high-end.
2. **Six "labs"** — the owner's term for these bespoke interactive sections. Each is its own step (a peer of
   Introduction/Lesson/Scenario) via a reusable **`demo` step kind** (driven by `chapter.demo` + the
   `_DEMO_WIDGETS` registry in `lt-engine.js` — internal name stayed `demo`; the owner calls them **labs**).
   Each is a self-contained, leak-safe, reduced-motion-aware widget in its own file; **none replace existing
   charts**. The six labs:
     - **Order Book lab** — `lt-orderbook.js` · C3 ch3 Understanding the Order Book
     - **Pattern Library lab** — `lt-patternlib.js` · C2 ch8 Classical Chart Patterns
     - **Cloud Explorer lab** — `lt-ichimoku.js` · C2 ch11 Ichimoku
     - **Fib Sweep lab** — `lt-fib.js` · C2 ch10 Fibonacci
     - **Liquidation Lab** — `lt-liqlab.js` · C3 ch7 Understanding Leverage
     - **Sentiment Board lab** — `lt-sentiment.js` · C4 ch6 Sentiment Analysis Variables
3. **Clean-design principles** (`emil-design-eng` skill): restraint, hairlines, whitespace, color only for
   meaning, GPU-only transitions with strong ease-out. Applied throughout (esp. Sentiment Board; de-chunked
   the Liquidation Lab).

**To add another lab:** author a widget file exposing `render<X>(containerId)`, register a `kind` in
`_DEMO_WIDGETS` (lt-engine.js), add `demo:{kind,label,after,heading,body,bullets}` to a chapter, and add the
`<script>` + a cache token in `lt-index.html`. `after` = `'intro'` | `'lesson'` | `'scenario'`.
(Terminology: **"lab" = one of these bespoke `demo`-step sections.** The code key is still `demo`; if a
future session wants the code to match the term, rename `demo`→`lab` across the engine + the six `demo:`
blocks — mechanical but touches several files, so it wasn't done unprompted.)

## ✅ DONE (2026-07-01): Bespoke sections #3–#6 + clean-design pass — SHIPPED

Finished the per-lesson bespoke-section list. All use the `demo` step kind + `_DEMO_WIDGETS` registry.
`node --check` clean across all; 0 console errors; each verified live + audited. Owner feedback mid-build:
"clean & minimal, not chunky" → pulled in the `emil-design-eng` skill (restraint, hairlines, whitespace,
color only for meaning, GPU-only transitions with strong ease-out) and applied it. Harnesses deleted.

Widgets (all self-contained, leak-safe, prefers-reduced-motion aware, charts untouched):
- **Cloud Explorer** (`lt-ichimoku.js`, kind `ichimoku`) — C2 ch11 Ichimoku, after intro. Toggle chips for
  Tenkan/Kijun/Kumo/Chikou over price; hover a chip to isolate it (dims the rest) + a description updates.
- **Fib Sweep** (`lt-fib.js`, kind `fib`) — C2 ch10 Fibonacci, after intro. Animated loop: impulse → fib
  levels fan out → price retraces into the 0.618–0.65 golden pocket → bounce. Opacity-reveal phases.
- **Liquidation Lab** (`lt-liqlab.js`, kind `liqlab`) — C3 ch7 Understanding Leverage, **after lesson**.
  A leverage slider; the liquidation line creeps toward entry (liq ≈ entry·(1−1/lev)); readouts + verdict,
  incl. "liquidation is inside your stop" warning past ~12×. De-chunked per feedback (inline hairline stat
  strip instead of filled cards; verdict is plain colored text, no box). Deterministic math, not a sim.
- **Sentiment Board** (`lt-sentiment.js`, kind `sentiment`) — C4 ch6 Sentiment Analysis Variables, **after
  lesson**. Clean animated loop: the 4 SA signals (funding/OI/CVD/basis) hit bearish extremes at a DBS
  support, a slim conviction meter fills 0→4/4, the trapped shorts squeeze up. Hairline rows, scaleX fills.

Placement logic (per-lesson): browse explorers (Ichimoku) + quick illustrators (Fib) go **after intro**;
mechanism demos you watch after reading the theory (Liquidation, Sentiment) go **after lesson**.
Tokens: `lt-ichimoku.js 1.0.0`, `lt-fib.js 1.0.0`, `lt-liqlab.js 1.1.0`, `lt-sentiment.js 1.0.0` (all new);
`lt-engine.js 3.125.0`; data `lt-data-course2.js 1.14.0`, `lt-data-course3.js 1.14.0`, `lt-data-course4.js 1.21.0`.

**Six bespoke sections now live:** Order Book (C3), Pattern Library (C2), Cloud Explorer (C2), Fib Sweep
(C2), Liquidation Lab (C3), Sentiment Board (C4). Adding more = author a widget + register a `kind` + set
`demo:` on a chapter.

## ✅ DONE (2026-07-01): Bespoke section #2 — Classical Chart Pattern Library — SHIPPED

Second bespoke section, using the `demo` step mechanism from the order-book work. `node --check` clean;
0 console errors; verified live desktop (2-col detail) + mobile (3-up grid, stacked detail). Temp harness
`_pl_harness.html` deleted.

**Shipped:** `lt-patternlib.js` (`renderPatternLibrary(containerId)`) — a browse/hover gallery in the
candle-gallery spirit: a grid of 11 pattern thumbnails (shape-only — `<text>` hidden via CSS) + a detail
panel with a LARGE labelled diagram and Structure · The trade (entry/stop/target) · a pro Tip. Patterns:
bull/bear flag, ascending/descending/symmetrical triangle, double top/bottom, head & shoulders + inverse,
rising/falling wedge — each with a hand-authored SVG (price shape + trendlines/neckline + breakout arrow +
measured-move target, all labelled) and Continuation/Reversal + Bullish/Bearish/Neutral badges (bias dot on
each card). Registered `patternlib` in `_DEMO_WIDGETS`; wired onto **C2 ch8 "Classical Chart Patterns"** as
an `after:'intro'` step ("Pattern Library"). Charts untouched (Introduction chart intact). Tokens:
`lt-patternlib.js 1.0.0` (new), `lt-engine.js 3.121.0`, `lt-data-course2.js 1.12.0`.

## ✅ DONE (2026-07-01): Bespoke sections — animated Order Book demo (new step kind) — SHIPPED

First of the "topic-specific interactive area" ideas. Owner wants bespoke visuals for select
lessons — but as their OWN step (peer of Introduction/Lesson/Scenario), **not** replacing the
existing charts, and looking terminal-grade ("ripped from insilico"). `node --check` clean; 0
console errors; verified live desktop + ≤400px mobile + reduced-motion. Backup: full-site snapshot
`Backup-2026-07-01_full-site-pre-orderbook/`. Temp harness `_ob_harness.html` deleted.

**New reusable mechanism — a "demo" step kind.** A chapter can add ONE bespoke interactive section:
set `chapter.demo = { kind, label, after?, heading?, body?, bullets? }`. The engine inserts a `demo`
step after `chapter.demo.after` (default `intro`), labels it from `demo.label`, and dispatches to a
widget registered in `_DEMO_WIDGETS` (engine `renderDemo`). All step math (pills, dots, nav, routing,
gating, sidebar sub-nav) flows through `chapterStepKeys`/`chapterStepLabels`, so it "just works" as a
peer step. **Nothing touches the chapter's charts.** Future bespoke sections (pattern gallery, Ichimoku
explorer, sentiment dashboard…) register a new kind + set `demo` on their chapter.

**Shipped:** `lt-orderbook.js` (`renderOrderBookDemo`/`stopOrderBookDemo`) — a scripted, looping,
leak-safe depth-of-market panel (NOT a live sim): BTC-PERP header + live dot, Price/Size/Total columns,
cumulative depth staircase, spread + %, a last-price with up/down tick. A ~9-phase narrated loop shows a
market order crossing the spread (taker, eats depth, price ticks up) then a limit order resting (maker)
and filling — with a changing caption teaching maker/taker. Build-once DOM + in-place updates so depth
bars animate smoothly; honours `prefers-reduced-motion` (static annotated frame); timer clears itself
when detached. Wired onto **C3 ch3 "Understanding the Order Book"** as an `after:'intro'` step ("Order
Book"). First pass had wrongly hijacked the intro chart — reverted; the candlestick chart is untouched.
Tokens: `lt-orderbook.js 1.1.0` (new), `lt-engine.js 3.120.0`, `lt-data-course3.js 1.13.0`.

**Next:** decide, per lesson, which other topics earn a bespoke `demo` step (candidates in the prior
"5 must / 5 should / few maybe" list — pattern gallery, risk/liquidation, Ichimoku, sentiment board…).

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
`lt-styles.css 1.99.5` · `lt-engine.js 3.125.0` · `lt-glossary.js 1.20.1` · bespoke widgets:
`lt-orderbook.js 1.1.0` · `lt-patternlib.js 1.0.0` · `lt-ichimoku.js 1.0.0` · `lt-fib.js 1.0.0` ·
`lt-liqlab.js 1.1.0` · `lt-sentiment.js 1.0.0` (all new) · `lessons-v2/renderer.js 1.18.1` ·
`lessons-v2/chart-vocabulary.js 1.7.0` · `lessons-v2/player.css 1.10.1` · v2 lesson token `?v=1.0.4`
(hardcoded in `lt-engine.js` `ensureV2LessonsLoaded`) · data: `lt-data.js 1.10.0`,
`lt-data-course2.js 1.14.0`, `lt-data-course3.js 1.14.0`, `lt-data-course4.js 1.21.0`.
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
Backlog cleared; glossary visuals + six bespoke sections shipped. Candidates:
- **More bespoke `demo` sections** — the mechanism makes each cheap. Un-built ideas from the earlier
  "5 must / 5 should / few maybe" list: Market-Structure builder (C1), S/R–DBS/SSR zone lab, Divergence
  trainer (C2 Oscillators), Liquidation-Heatmap explorer (C4 Hyblock), Volume interpreter (C2), Equity-curve
  / compounding simulator (C1). Pick a chapter, author a widget, register a `kind`.
- **Tuning the 6 live sections** — pacing, copy, or a different chapter home for any of them if you click
  through and want changes. (Order Book / Pattern Library are after-intro; Liquidation Lab / Sentiment Board
  are after-lesson by design.)
- **Landing "show a lesson in motion" section** — the landing sells *animated* lessons but never shows one;
  a looping candle-build with labels (mimicking the v2 renderer, or embedding a bespoke widget) would be the
  strongest single landing upgrade. Higher effort/risk.
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
> on a fresh local port with `python3 -m http.server` — **never run `vercel` or deploy**; the owner
> deploys manually after reviewing each phase). **Read `CLAUDE.md` first** (ground rules — it corrects
> stale claims from older briefs), **then `AUDIT.md`** (the ranked, check-boxed plan for the site-wide
> quality overhaul in progress), then the "ACTIVE" section at the top of `UI_POLISH_HANDOFF.md`.
>
> **State: Phases 0–3 are SHIPPED** (0 audit · 1 bugs+safety rails · 2 perf+dead code · 3 Course 1
> content: P0s, vocab geometry pass, engine chart regeneration, 13 v2 decks rewritten — all verified,
> tokens bumped incl. the v2 lesson token `?v=1.0.5` inside `ensureV2LessonsLoaded`). The owner
> reviews/deploys between phases — confirm they've reviewed Phase 3 before starting new work.
>
> **Next: Phase 4 — Course 2**, implemented from `AUDIT-COURSE2.md` (every finding has file:line + a
> concrete fix; treat line numbers as ±30 drift, locate by content). Back up `lt-data-course2.js`,
> `lt-module-quizzes.js`, `lessons-v2/chart-vocabulary.js`, `lessons-v2/lessons/Course2/` to
> `Backup-<date>_phase4-course2/` first. Order of attack: **(1) P0s** — Rising Wedge definition
> inverted (`lt-data-course2.js` ~:1087), trailing-stop example says "short" for a long trade (~:436),
> Three Black Crows wick rule vs transcript (v2 06:94); **(2) root causes** — Ichimoku twist pins are
> displacement-blind (~:1583, ~:1680 — shift +disp or use `ichi:{disp:4}`), fib drawing-direction
> contradiction (v2 12 + Fib Sweep lab copy teach low→high; transcript + mq:182 teach high→low — align
> the lesson/lab), ch13/ch14 oscillator charts (ch13 `rsi_zones` already aliases to the REAL RSI panel
> engine-side — verify visually; ch14 divergence charts have NO `indicator` set → add `indicator:'rsi'`
> + reshape the introChart lead-in); **(3)** stop-line batch, ch4 formation charts, ch2 LTE charts,
> ch9 items, mq:153 + mq:190 keys, volume-pin cluster, v2 deck gaps (04/09/11/14/16) per the audit.
> Note: Phase 3 already damped the shared vocab moves and verified C2's 18 lessons resolve clean — new
> vocab work for C2 is only what AUDIT-COURSE2.md asks (e.g. `vocab:704` volume-spike factor).
>
> **Per-phase discipline:** implement fully → verify (node --check every JS; engine sweep: every def in
> ALL 4 data files through `buildCandlestickOption`, 0 throws; v2 sweep: `ensureV2LessonsLoaded(1..4)`
> → every CHART/CANDLE beat's anchors/stages resolve, 0 unknown; live eyeball the changed charts +
> lessons desktop AND ≤400px; 0 console errors) → bump the matching cache tokens in `lt-index.html`
> (+ the v2 lesson token in `lt-engine.js` if any lesson file changed — and then the engine token) →
> check items off in `AUDIT.md` → **STOP and summarize for the owner.** Then Phase 5 = Course 3
> (`AUDIT-COURSE3.md`), Phase 6 = Course 4 (`AUDIT-COURSE4.md` — biggest: PAL inversion grades wrong
> answers, L27/L28 Ichimoku concepts backwards, Hyblock cluster off-source), Phase 7 = polish + the
> owner-queued features (landing "lesson in motion", new labs, tune the 6 labs, all-caps cleanup).
>
> **Working rules (unchanged, always):** back up files you'll touch to `Backup-<date>_<slug>/` first;
> `node --check` any JS you edit; use the Claude Preview tools (fresh port; don't fight other chats'
> :5173/:5199/:5205/:5210/:5217); design clean & minimal, not chunky (`emil-design-eng` skill); verify
> live before shipping; `ltSetUnlockAll(true)` + `ltOpenChapter(course, chapIdx)` (0-based) opens any
> chapter from the console (reset with `ltSetUnlockAll(false)`); the app scrolls inside
> `.content-area`, not the document; content source of truth =
> `/Users/pbot/Desktop/LiquidityTheory_Transcripts/` (NEVER the stale `./~/` mirror).
