# audit.md — Liquidity Theory full-site audit (evidence-first)

Date: 2026-06-15. Method: read the real files + run the real code (Node harnesses) + render the
live app in the Claude Preview at real widths. Every claim below is backed by an observation, not
an assumption. **Headline: the codebase is mature — every "known carried issue" on the brief was
already resolved in current code; the one real systemic defect found (font fallback) is fixed this
pass.** Companion: `sweep_report.md` (resolutions + responsive/perf results).

## 1. Inventory (actual)

**Files (runtime):** `index.html` (landing, self-contained, no-cache), `lt-index.html` (app shell;
versioned `?v=` script/link tags), `lt-styles.css`. Engine: `lt-engine.js` (210 KB — state, nav,
chart builders `buildCandlestickOption`/`renderChart`, quiz/exam/cert, settings glue). Charts:
`lt-chartgen.js` (`ltCandles`) + ECharts assembly in the engine + `lt-simulator.js`. **Note: the
brief names `lt-charts.js` — that file does not exist;** chart code lives in `lt-chartgen.js` +
`lt-engine.js` + `lt-simulator.js`. UI modules: `lt-gallery.js`, `lt-settings.js`, `lt-sim-ui.js`,
`lt-glossary.js`, `lt-flashcards.js`, `lt-community.js`. Lesson player: `lt-recon-player.js`
(+ lazy `rebuild/recon/lt-recon-{course,timelines,cues}-courseN.js`). Data: `lt-data.js`,
`lt-data-course{2,3,4}.js` (`LT_CHAPTERS`, `LT_CHAPTERS_2..4`).

**Views:** course (intro / lesson / quiz steps), home hub, glossary, flashcards, simulator,
community, settings, exam, certificate, answer-key. Per-course state keys
`lt_course{1..4}_state`. Course accents: C1 cyan · C2 coral · C3 purple · C4 pink.

**Data shape:** chapter `{ id, module, intro, introChart, lesson, lessonChart, quiz{ style, answers:
[{id,text,correct,type}], chart }, … }`. OHLC convention everywhere = `[open, close, low, high]`.

## 2. Defect log — the brief's "known carried issues" (each re-checked with evidence)

| # | Issue (as briefed) | Severity | Actual state (evidence) | Action |
|---|---|---|---|---|
| K1 | Settings "Reset All" / "Mark All Complete" cover only Courses 1–2 | blocker→ | **Already fixed.** `lt-settings.js:948` markAll iterates `[1,2,3,4]`; `:961` resetAll clears *all* `lt_` keys except an appearance keep-list → covers every course incl. exam/cert flags. | none (verify only) |
| K2 | `range` injector broken | major→ | **Already correct.** Node test: `range/{4h,6h,12h,1d}` → 0 invalid candles; builds a mean-reverting range then drifts to a band edge; keyLevel = the edge (28200) with last close at it. | none |
| K3 | `liquidity_sweep` injector broken | major→ | **Already correct.** Node test: last setup candle H=31434 pierces the prior high (keyLevel 31000) and C=30566 closes back below → textbook sweep; winDir −1. Survives TF aggregation. | none |
| K4 | W20 tooltip — open truncated, H/L swapped, wrong candle colour | major→ | **Already correct in both tooltips.** Engine `lt-engine.js:614` handles the ECharts index-prepend (`off = arr.length>=5?1:0`) → O/C/L/H map right; colour `cl>=o?TEAL:BEAR`. Sim `lt-sim-ui.js:737` destructures `[o,cl,lo,hi]` from `[open,close,low,high]` data, colour `cl-o`. | none |
| K5 | Pattern selector cut off — needs two-row wrap | major→ | **Already fixed by redesign.** It is now a native grouped `<select>` (`lt-sim-ui.js:1311`, 8 optgroups / 18 options), not a button row. Live @375px: width 180, right edge 209 < 375, no overflow. | none |
| K6 | Seeded answer-shuffle correctness across Courses 2–4 | major→ | **Already correct.** Correctness travels with the answer object (`a.correct`/`a.id`), so the shuffle cannot desync it. Distribution: the 4 four-option quizzes site-wide land A/B/C/D = 1/1/1/1; the LCG is unbiased over seeds 0–119 (32/26/29/33). Most quizzes are 3-option by design (no D). | none |
| K7 | Remaining Barlow Condensed references | polish→ | **Already removed.** `grep -rin "barlow\|condensed\|Oswald\|Bebas\|Anton"` across all js/css/html = **0**. | none |
| K8 | Chart colour-constant inconsistencies | polish | **Consistent.** Teal `#00d4d4` ×323 (plus intentional `#0d9488` light-theme + `#00b8b8` hover). Red `#cc2222` ×172 (constant `RED`); the only other reds are `#ff0000`/`#cc0000` = YouTube-brand, `#dc2626`/`#b91c1c` = light-theme `--red/--red2`, `#f23d5c` = the self-contained recon-player bear. No stray/divergent value. | none |
| K9 | Light theme half-built? | polish | **Real & maintained**, not half-built: `LT_LIGHT_THEME` (`lt-settings.js:35`) + `html.theme-light` overrides at `lt-styles.css:88,134,761,1891,2768,…`. Kept (not disabled). | verify live |

## 3. Defect log — NEW findings this pass

| # | Finding | File·loc | Severity | Evidence | Action |
|---|---|---|---|---|---|
| N1 | **Font fallback collapses to `sans-serif`.** 95 declarations led with `'JetBrains Mono'` but fell back to `sans-serif`, not a monospace family. If the web font fails to load (offline/slow/blocked), the entire terminal aesthetic degrades to a proportional sans — directly against the design language. | lt-styles.css ×27, lt-engine.js ×22, lt-sim-ui.js ×14, lt-settings.js ×10, lt-flashcards.js ×8, lt-community.js ×8, lt-glossary.js ×6; + index.html ×3 | **major (brand)** | `grep` counts above; only 1 legit `Inter, sans-serif` (the Inter font option). | **FIXED** → `monospace` (see sweep_report N1) |
| N2 | **Gallery wrap used a sans stack.** `.lt-gallery-wrap` declared `font-family: system-ui, -apple-system, sans-serif` — off-brand for the candlestick gallery. | lt-gallery.js:152 | minor | grep | **FIXED** → mono stack |

## 4. Live baseline (pre-existing, confirmed good)
- **0 console errors** on load and across course/glossary/simulator navigation.
- **Mobile @375:** chapter view, definition rows, Lesson/Candles tabs, big Back/Next, the
  audio-narrated player, and the **simulator** (candles legible, 2×2 stats, dropdown fits) all
  render with **no horizontal scroll**.
- **Laptop @1280:** sidebar 230 / content 1050, no h-scroll; glossary + chapter clean.
- **Interaction latency:** chapter step-nav 17 ms; full view switch (glossary, 79 terms + 41 SVG
  figures) 97 ms — both within the <100 ms target (glossary is the heaviest single rebuild).

## 5. Conclusion / where the work is
The site is already well past "rough." The brief's defect list reflects an earlier state; current
code resolves all of it. Net real work this pass: **N1/N2 font fallback** (systemic, brand-correct)
+ a rigorous evidence pass that *proves* the rest is sound rather than assuming. Anything further is
incremental polish/perf, logged in `sweep_report.md`.
