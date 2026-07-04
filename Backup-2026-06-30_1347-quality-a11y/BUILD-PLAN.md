# Liquidity Theory — Build Plan

> Authored by Opus (analysis pass). Execute top-to-bottom; phases are ordered by dependency.
> Backups (`MAY 30 BU 2/`, `OG BACKUP/`, `Alpha.zip`) are OFF-LIMITS — do not touch.

## Architecture recap (so the executor has the contract)

Two parallel implementations exist:

1. **`liquidity-theory-course1.html`** — old self-contained single-file app, design system `.panel`/`.qbtn`/`#chart-el`. Works but Course-1-only. Treat as reference/legacy. **Do not build on this.**
2. **Modular version** — `lt-styles.css` + `lt-*.js`, design system `.app-layout`/`.content-card`/`.answer-btn`. This is the future. Its index shell (`lt-index.html`) is a broken stub. **This is what we build out.**

**Script load order is mandatory** (engine reads `LT_CHAPTERS` at parse time → data files must load first):
```
echarts (CDN) → lucide (CDN) → lt-data.js → lt-data-course2.js → lt-data-course3.js
→ lt-data-course4.js → lt-patterns.js → lt-simulator.js → lt-gallery.js
→ lt-settings.js → lt-sim-ui.js (new) → lt-engine.js
```

Global bindings each file provides:
- `lt-data.js` → `LT_CHAPTERS`, `LT_EXAM_QUESTIONS` (⚠ course-1 only — see Phase 3)
- `lt-data-course2/3/4.js` → `LT_CHAPTERS_2/3/4`, `COURSE2/3/4_META`
- `lt-patterns.js` → `LT_PATTERNS`
- `lt-simulator.js` → `generateMarket`, `viewMarket`, `generateScenario` (+ on `window`)
- `lt-gallery.js` → `renderCandlestickGallery()`
- `lt-settings.js` → `renderSettingsPage()`
- `lt-engine.js` → boots on `DOMContentLoaded`, owns all UI

---

## PHASE 1 — Make the modular app actually run (highest priority)

### 1.1 Rewrite `lt-index.html` completely
Current file has the wrong DOM and is missing every dependency. Replace with a shell that (a) loads all scripts in the order above, and (b) provides the exact element IDs the engine queries. **Required element IDs** (from `lt-engine.js`):

Header: `header-tag`, `header-title`, `chapter-counter`, `step-pills`, `step-dots`, `global-progress-fill`, plus `.global-progress-track`, `sidebar-toggle` (menu btn).
Sidebar: `sidebar`, `sidebar-close`, `sidebar-progress-bar`, `sidebar-progress-text`, `chapter-list`, `start-exam-btn` (+ child `exam-lock-icon`), `course-select` (legacy, can be `display:none`), `sidebar-overlay`.
Content: `content-area`.
Nav: `btn-prev`, `btn-next` (each with a `.nav-label` span).
Welcome modal: `welcome-modal` (class `modal-overlay`, start `.hidden`), `modal-progress-info`, `modal-continue`, `modal-restart`.
Exam: `exam-screen` (start `.hidden`), `exam-q-counter`, `exam-progress-fill`, `exam-body`, `exam-result`.
Cert: `cert-screen` (start `.hidden`), `cert-score-display`, `cert-date-display`, `cert-review-btn`, `cert-print-btn`.
Toast: `toast` (start `.hidden`).

**Structural classes** (from `lt-styles.css`, confirmed): outermost `.app-layout` → `.sidebar` (`.sidebar-header` with `.logo`/`.logo-icon`/`.logo-text` + `.sidebar-close-btn#sidebar-close`; `.sidebar-progress-wrap` with `.sidebar-progress-track`>`.sidebar-progress-fill#sidebar-progress-bar` + `.sidebar-progress-text#sidebar-progress-text`; `.chapter-list#chapter-list`; `.sidebar-footer` with `.btn-exam#start-exam-btn` containing an `.exam-lock#exam-lock-icon` icon) + `.main-wrap` (`.top-header` with `.menu-btn.icon-btn#sidebar-toggle`, `.header-info`>`.header-tag#header-tag`+`.header-title#header-title`, `.header-right`>`.step-pills#step-pills`+`.chapter-counter#chapter-counter`+settings btn; `.global-progress-track`>`.global-progress-fill#global-progress-fill`; `.content-area#content-area`; `.nav-footer` with `.nav-btn.nav-prev#btn-prev` and `.nav-btn.nav-next#btn-next`, each containing a `.nav-label`) + `.sidebar-overlay#sidebar-overlay.hidden`. Then `#welcome-modal`, `#exam-screen`, `#cert-screen`, `#toast` as siblings.
- `#step-dots` is referenced by engine but not in the header CSS — add it (e.g. inside `.header-right` or below pills); harmless if unstyled.
- Use lucide via `<script src="https://unpkg.com/lucide@latest"></script>` then engine calls `lucide.createIcons()`.
- Cache-bust query strings are fine (`?v=`).

**Acceptance:** open `lt-index.html` → no console errors, Course 1 Ch 1 intro renders with chart + gallery, sidebar lists all 4 courses, can navigate intro→lesson→quiz, answer a quiz, advance, switch courses, open settings, run the exam after marking all complete (dev tool), see certificate.

### 1.2 Add a Settings entry point
Engine defines `showSettings()` but nothing calls it. Add a settings `.icon-btn` in `.header-right` → `onclick="showSettings()"` with a lucide `settings` icon.

### 1.3 Verify cross-course rendering end-to-end
Switch into Course 2/3/4 via the sidebar accordion; confirm chapters render and progress persists under `lt_course{2,3,4}_state`.

---

## PHASE 2 — Bug fixes (do alongside Phase 1)

### 2.1 Sidebar progress reads wrong key for Course 4  (`lt-engine.js`, `getProgressForCourse`, ~line 1535)
```js
const key = courseNum === 3 ? 'lt_course3_state' : courseNum === 2 ? 'lt_course2_state' : STORAGE_KEY;
```
Add course 4: `courseNum === 4 ? 'lt_course4_state' : …`. Without this, Course 4's sidebar lock/complete states read Course 1's progress.

### 2.2 Real-data "reveal" shows the past, not the future  (`lt-engine.js`, `fetchBinanceCandles` ~line 56)
`endTime=decisionTime, limit=lookback+reveal+5` returns only candles **at/before** decisionTime. The code then treats the tail as the "reveal" (what happens next) — but those candles are *before* the decision, so the reveal is not the outcome. **Fix:** fetch so the window spans the future — e.g. `endTime = decisionTime + reveal * intervalMs` (and slice the setup as the first `lookback` ending at decisionTime, reveal as the `reveal` candles after). Validate against one pattern in `lt-patterns.js` (e.g. `pa-1` shooting star at $69K Nov 2021) that the reveal actually drops. If reliable historical fetch is too flaky (CORS/rate limits), gate real-data behind a try and keep the synthetic fallback path (already present).

### 2.3 De-dupe `getBullishColor()`
Defined in both `lt-engine.js` and `lt-gallery.js`. Not fatal (function decls can redeclare) but keep one source of truth — leave engine's, delete gallery's (gallery loads before engine though, so instead: keep gallery's OR ensure whichever loads last wins consistently). Lowest priority; only tidy if convenient.

### 2.4 ResizeObserver cleanup  (`renderChart`)
A new `ResizeObserver` is created per render and never disconnected in `disposeChart`. Store it on the instance and `disconnect()` in `disposeChart`. Minor leak; optional.

---

## PHASE 3 — Per-course final exams (content gap)

Only `lt-data.js` builds `LT_EXAM_QUESTIONS` (from `LT_CHAPTERS`). Courses 2/3/4 have **no** exam bank, so the Final Exam always serves Course-1 questions regardless of active course.

**Fix options (pick one):**
- **A (mechanical, recommended first):** in each course data file, generate an exam array the same way Ch-1 does — `const LT_EXAM_QUESTIONS_2 = LT_CHAPTERS_2.map(...)` etc. Then make the engine select the bank for the active course (add a `getExamQuestions()` helper keyed off `getActiveCourseNum()` and use it in `renderExamQuestion`/`finishExam`/`restartExam` instead of the global `LT_EXAM_QUESTIONS`). Update the hardcoded `'Question 1 of 13'` strings to use `getExamQuestions().length`.
- **B (better pedagogy, later):** hand-author a curated exam bank per course.

**Acceptance:** completing Course 3 and starting its exam shows Course-3 questions; pass → certificate names Course 3.

---

## PHASE 4 — Flesh out the Simulator (the big new feature)

Today `lt-simulator.js` is only a market *generator* (PRNG + 17 injectors + `generateMarket`/`viewMarket`), demoed by `sim-test.html`. Build an interactive **trading practice mode** as a new module `lt-sim-ui.js` and wire it into the app.

### 4.1 New module `lt-sim-ui.js` → `renderSimulator('content-area')`
Reuse the engine's chart builders where possible (`renderChart`, `buildLineOption`) and the simulator's `generateMarket`/`viewMarket`.

**Round loop:**
1. Pick a random pattern from the 17 injectors + random timeframe (`4h/6h/12h/1d`) + fresh seed. Don't reveal the pattern name.
2. Render setup candles `ohlc.slice(0, cutIndex)` with the key-level markline; mark the decision point.
3. Player inputs: **Long / Short / Flat**, plus position size (% of equity) and optional leverage (1×–10×). Optional stretch: click-to-set SL/TP on the chart.
4. **Reveal** the outcome candles `ohlc.slice(cutIndex)` with the existing animated wireframe reveal (mirror the teaching-chart/real-data reveal in `lt-engine.js`).
5. Score the round: entry = close at `cutIndex`; exit = last revealed close (or SL/TP hit if set). P&L = direction × (exit−entry)/entry × leverage × size. Update equity, streak, win-rate.
6. Show a verdict card: the pattern's real name + a one-line concept explanation (tie to course material — e.g. "Bull Flag → continuation; longs favored"). Map injector keys → teaching blurbs.
7. "Next Round" repeats.

**Stats panel:** running equity (render with `buildLineOption` equity curve), # trades, win-rate, current/best streak, total R. Persist to `localStorage` key `lt_sim_stats` (and a "Reset Stats" control, consistent with `lt-settings.js` patterns).

**Concept tie-ins (Liquidity Theory framing):** label setups with the same vocabulary the courses use — Break of Structure, Liquidity Sweep / SFP, Demand/Supply zone, SR Flip, Range Rule-of-Fives. The injectors already cover most (`bos`, `liquidity_sweep`, `sr_flip`, `demand_bounce`, `supply_reject`, `double_top/bottom`, flags, `breakout`, `range`, candle reversals). Add a `SIM_CONCEPTS` map: injectorKey → { name, bias, blurb }.

### 4.2 Wire simulator into the app
- Add a "Simulator" `.btn-exam`-style button in the sidebar footer (next to the exam button) and/or a header icon → `onclick="showSimulator()"`.
- Add `window.showSimulator = () => { disposeAllCharts(); renderSimulator('content-area'); }` to the engine (mirror `showSettings`). Provide a "Back to Course" button that calls `init()` like settings does.

### 4.3 Difficulty / progression (stretch)
- Levels: Lvl 1 obvious trend/flag; Lvl 2 adds ranges/reversals; Lvl 3 adds liquidity sweeps/SFP + faster reveal.
- Optional indicator overlays toggle (Ichimoku/Fib/RSI) reusing `_applyIndicatorOverlay`.

**Acceptance:** `showSimulator()` opens a playable loop — decide, reveal animates, P&L + stats update and persist, verdict explains the pattern, "Next Round" works, "Back to Course" returns cleanly.

---

## PHASE 5 — Keep building the core out (roadmap, after 1–4)

- **Home/dashboard screen** instead of dropping into Course 1 Ch 0: course cards with per-course % complete, "Resume", "Simulator", "Exam" entry points.
- **Real-data simulator mode**: same loop but on real `LT_PATTERNS` setups (depends on Phase 2.2 fix).
- **Spaced-review**: surface previously-missed quiz chapters.
- **Certificate per course** + a "master" certificate when all 4 + exams pass.
- **Mobile pass**: sidebar is off-canvas (`sidebar-overlay`); verify the header/nav/exam/cert screens at ≤600px.
- **Light theme parity**: reconcile the engine's inline light-theme set (boot block) with `lt-settings.js` `LT_LIGHT_THEME` (fuller) so toggling is consistent.
- **Decide the fate of legacy files**: once `lt-index.html` works, either retire `liquidity-theory-course1.html` / `trading-demo.html` / `trading-quiz.html` or clearly mark them as legacy. (Confirm with the user before deleting anything.)
- **Version control**: repo has zero commits — everything untracked. Make an initial commit once Phase 1 runs, so future changes are diffable. (Ask the user first.)

---

## Quick reference — confirmed facts
- 4 courses; chapter counts: C1=13 (`LT_CHAPTERS`), C2/C3/C4 per their files; C4 meta says 30 chapters.
- Per-course localStorage state keys: `lt_course1_state` (`STORAGE_KEY`) … `lt_course4_state`; active course in `lt_active_course`; theme `lt_theme`; bullish color `lt_bullish_color`.
- Engine uses lucide icons throughout → lucide MUST be loaded.
- Quiz answers are seeded-shuffled by chapter id (stable across visits); only a **correct** answer unlocks Next + marks chapter complete.
- Exam pass threshold = 70%.
</content>
