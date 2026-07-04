/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Course 1
   lt-engine.js  |  All application logic
   ═══════════════════════════════════════════════════════════════════════════

   Responsibilities:
   · State management + localStorage persistence
   · Chapter rendering: intro, lesson, quiz steps
   · Chart rendering via ECharts (candlestick + line)
   · Quiz answer logic + reveal animations
   · Sidebar: build, toggle, chapter jumping
   · Global & sidebar progress bars
   · Step pills + step dots in nav
   · Welcome Back modal
   · Toast notifications
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════════════════ */
const STORAGE_KEY  = 'lt_course1_state';
const STEP_LABELS  = ['Introduction', 'Lesson', 'Scenario', 'Quiz']; // legacy reference (labels now per-kind)
const KIND_LABEL   = { intro: 'Introduction', lesson: 'Lesson', scenario: 'Scenario', quiz: 'Quiz', demo: 'Demo' };
const TOTAL_STEPS  = LT_CHAPTERS.length * 3; // legacy constant (unused by progress; kept for compat)
let   CHAPTERS     = LT_CHAPTERS;

/* ── Course registry ─────────────────────────────────────────────────────────
   ONE source of truth for the per-course STRUCTURE: chapters array,
   localStorage state key, and sidebar accent (dark + light). Adding a course is
   now one row here (plus its <script> in index.html). Every course→X mapping
   helper below reads from this. Context-specific DISPLAY names stay at their call
   sites — the sidebar / home pages each use a different naming convention,
   so folding the names in here would change behaviour. */
const LT_COURSES = [
  { num: 1, chapters: LT_CHAPTERS,
    stateKey: STORAGE_KEY,        accent: '#00d4d4', accentLight: '#0d9488' },
  { num: 2, chapters: (typeof LT_CHAPTERS_2 !== 'undefined' ? LT_CHAPTERS_2 : null),
    stateKey: 'lt_course2_state', accent: '#ff7a4d', accentLight: '#ea580c' },
  { num: 3, chapters: (typeof LT_CHAPTERS_3 !== 'undefined' ? LT_CHAPTERS_3 : null),
    stateKey: 'lt_course3_state', accent: '#a855f7', accentLight: '#7c3aed' },
  { num: 4, chapters: (typeof LT_CHAPTERS_4 !== 'undefined' ? LT_CHAPTERS_4 : null),
    stateKey: 'lt_course4_state', accent: '#ff2e88', accentLight: '#db2777' }
];
const _courseDef     = (n) => LT_COURSES.find(c => c.num === n) || LT_COURSES[0];
const courseChapters = (n) => _courseDef(n).chapters || LT_CHAPTERS;   // unknown/unloaded → Course 1
const courseStateKey = (n) => _courseDef(n).stateKey;

/* ── Module quiz (multi-question end-of-module assessment) ──────────────────
   One assessment per MODULE (a group of sessions sharing chapter.module). It is
   surfaced as the "Quiz" step ONLY on the module's FINAL session. Data lives in
   lt-module-quizzes.js (window.LT_MODULE_QUIZZES[course][moduleName]). */
function moduleQuizFor(chapter) {
  if (!chapter || !window.LT_MODULE_QUIZZES) return null;
  const byCourse = window.LT_MODULE_QUIZZES[getActiveCourseNum()];
  return (byCourse && chapter.module && byCourse[chapter.module]) || null;
}
function isModuleFinalChapter(chapter) {
  if (!chapter) return false;
  const next = CHAPTERS[chapter.id + 1];                 // ids are 0-indexed = array position
  return !next || next.module !== chapter.module;        // last session of its module group
}
function chapterHasModuleQuiz(chapter) {
  return !!moduleQuizFor(chapter) && isModuleFinalChapter(chapter);
}

/* ── Per-chapter STEP MODEL ──────────────────────────────────────────────────
   Every chapter runs Introduction · Lesson · Scenario (the Scenario is the chart
   decision quiz). The FINAL session of each module additionally gets a Quiz step —
   the module's multi-question Learning Assessment. The Introduction page carries the
   overview text alongside the chapter's chart (or concept diagram / course roadmap);
   the Lesson is the animated v2 player. All step math (dispatch, nav bounds, gating,
   progress, pills, routing) flows through these helpers. */
function chapterStepKeys(chapter) {
  const keys = ['intro', 'lesson', 'scenario'];
  if (chapterHasModuleQuiz(chapter)) keys.push('quiz');
  // A chapter may add ONE bespoke interactive section (e.g. the order-book demo) as its
  // own step — a peer of Introduction/Lesson/Scenario — inserted after chapter.demo.after.
  if (chapter && chapter.demo) {
    const after = chapter.demo.after || 'intro';
    const at = keys.indexOf(after);
    keys.splice(at >= 0 ? at + 1 : 1, 0, 'demo');
  }
  return keys;
}
function chapterStepLabels(chapter) { return chapterStepKeys(chapter).map(k => (k === 'demo' && chapter && chapter.demo && chapter.demo.label) ? chapter.demo.label : KIND_LABEL[k]); }
function stepCount(chapter)         { return chapterStepKeys(chapter).length; }
function lastStepIdx(chapter)       { return stepCount(chapter) - 1; }
function stepKindAt(chapter, step)  { const k = chapterStepKeys(chapter); return k[Math.max(0, Math.min(step | 0, k.length - 1))]; }
function currentChapter()           { return CHAPTERS[state.chapter]; }

function _ltIsLight() { return LTStore.get('theme') === 'light'; }
function getBullishColor() {
  // Default up-candle: bright cyan on dark, a deeper legible teal on white.
  return LTStore.get('bullishColor') || (_ltIsLight() ? '#0d9488' : '#00d4d4');
}
function getBearishColor() {
  // Default down-candle is the brand pink (cyan up / pink down), legible on both themes.
  // A user-chosen "white" is still remapped to a legible slate in light mode (it would be
  // invisible on white otherwise); other chosen colours pass through unchanged.
  var c = LTStore.get('bearishColor');
  if (c) {
    if (_ltIsLight() && /^#(f2f2f2|fff|ffffff)$/i.test(c)) return '#334155';
    return c;
  }
  return '#ff2e88';
}

let TEAL  = getBullishColor();
let BEAR  = getBearishColor();
const TEAL2 = LT_TOKENS.teal2;
const RED   = LT_TOKENS.red;    // bearish annotation colour — the brand pink, matching down-candles
const GOLD  = LT_TOKENS.gold;   // liquidation gold — one gold across charts + the real-data gallery

/* ── Semantic data-viz palette ───────────────────────────────────────────────
   One trading language across every chart so colour always means the same thing:
     teal = bullish · buy · support · bid          pink = bearish · sell · resistance · ask · short
     gold = liquidation levels                     amber = positions-heatmap density
     accent (warm gold) = neutral magnitude lines (open interest, cumulative-delta total)
   Fixed to the Vice-Terminal brand defaults so engine annotations and the hand-authored
   data annotations always agree. */
const VIZ = LT_TOKENS.viz;   // canonical palette lives in lt-tokens.js

/* Brighten a colour so it stays legible as TEXT on the dark callout pills. A dark
   semantic colour (e.g. the bearish red #cc2222) reads as muddy/illegible on near-
   black; we keep the hue but blend toward white until its luminance clears a floor.
   Colours that are already light (teal, gold) pass through unchanged. */
function _legibleOnDark(hex) { return LTUtils.legibleOnDark(hex); }
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
function chartColors() {
  return {
    BG:           cssVar('--bg3', '#0f0f0f'),
    BG3:          cssVar('--bg3', '#0f0f0f'),
    BG4:          cssVar('--bg4', '#141414'),
    BORDER:       cssVar('--border', '#1e1e1e'),
    TEXT2:        cssVar('--text2', '#888888'),
    TEXT3:        cssVar('--text3', '#555555'),
    TOOLTIP_TEXT: cssVar('--text', '#ffffff')
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   REAL DATA FETCHING
   ══════════════════════════════════════════════════════════════════════════ */

// Milliseconds per interval — needed to step one candle past the decision point
const INTERVAL_MS = {
  '1m':60000,'3m':180000,'5m':300000,'15m':900000,'30m':1800000,
  '1h':3600000,'2h':7200000,'4h':14400000,'6h':21600000,'8h':28800000,
  '12h':43200000,'1d':86400000,'3d':259200000,'1w':604800000,'1M':2592000000
};

async function fetchBinanceCandles(symbol, interval, decisionTime, lookback, reveal) {
  const intervalMs  = INTERVAL_MS[interval] || 86400000;
  // Reveal starts at the candle AFTER the decision point
  const revealStart = decisionTime + intervalMs;

  const parse = k => ({
    time:   k[0],
    open:   parseFloat(k[1]),
    high:   parseFloat(k[2]),
    low:    parseFloat(k[3]),
    close:  parseFloat(k[4]),
    volume: parseFloat(k[5])
  });

  // Primary: Binance US — two parallel fetches so setup ends AT decision, reveal starts AFTER
  try {
    const [setupResp, revealResp] = await Promise.all([
      fetch(`https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&endTime=${decisionTime}&limit=${lookback + 2}`),
      fetch(`https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${revealStart}&limit=${reveal + 5}`)
    ]);
    const setupRaw  = await setupResp.json();
    const revealRaw = await revealResp.json();

    if (Array.isArray(setupRaw) && setupRaw.length > 0 &&
        Array.isArray(revealRaw) && revealRaw.length > 0) {
      const setupCandles  = setupRaw.slice(-(lookback)).map(parse);
      const revealCandles = revealRaw.slice(0, reveal + 2).map(parse);
      return { source: 'binance', candles: [...setupCandles, ...revealCandles] };
    }
  } catch(e) {
    console.warn('Binance US fetch failed, trying CoinGecko', e);
  }

  // Fallback: CoinGecko OHLC — filter to the window around decisionTime
  try {
    const cgUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=90`;
    const cgResponse = await fetch(cgUrl);
    const cgRaw = await cgResponse.json();
    if (Array.isArray(cgRaw) && cgRaw.length > 0) {
      const all    = cgRaw.map(k => ({ time: k[0], open: k[1], high: k[2], low: k[3], close: k[4], volume: 0 }));
      const before = all.filter(c => c.time <= decisionTime).slice(-lookback);
      const after  = all.filter(c => c.time >  decisionTime).slice(0, reveal + 2);
      if (before.length > 0) {
        return { source: 'coingecko', candles: [...before, ...after] };
      }
    }
  } catch(e) {
    console.warn('CoinGecko fetch failed, using static data', e);
  }

  return null;
}

/* Calculate one Ichimoku midpoint over `period` candles ending at `endIdx`.
   ohlcData is ECharts format: [open, close, low, high] — low=idx2, high=idx3. */
function _ichimokuMid(ohlcData, period, endIdx) { return LTTa.ichimokuMid(ohlcData, period, endIdx); }

/* Faithful Ichimoku Kinko Hyo computed from candle OHLC ([o,c,l,h]). Mirrors the v2
   lesson renderer exactly so the scenario/intro ECharts charts match the lessons:
     Tenkan / Kijun / Senkou-B = midpoint of the period's (high + low);
     Senkou-A = (Tenkan + Kijun) / 2.
     Senkou A & B are PLOTTED `disp` periods AHEAD → the leading Kumo cloud (its
       arrays run n+disp long; the first disp slots are null, the last disp project
       into blank future x-slots).
     Chikou (lagging span) = the close plotted `disp` periods BEHIND.
   Period windows expand at the start so the cloud forms from the left edge. Periods
   scale down for the short idealized charts; override per-chart via def.ichi. */
const _ICHI_DEFAULT = LTTa.ICHI_DEFAULT;   // shared default periods (also read by _applyIchimokuOverlay)
function _computeIchimoku(ohlc, p) { return LTTa.computeIchimoku(ohlc, p); }

/* Synthesize plausible OFF-SCREEN price history that leads INTO the first displayed
   candle, so the Ichimoku cloud is already mature at the left edge. Deterministic: a
   few ranges/swings (scaled to the chart's own bar size + bias) ending exactly at the
   first open, so it joins the visible candles seamlessly. Returns H bars of [o,c,l,h]. */
function _synthIchiLookback(ohlc, H) { return LTTa.synthIchiLookback(ohlc, H); }

/* Overlay Ichimoku lines onto an already-rendered real-data chart instance.
   Strategy: read existing series via getOption() so the candlestick at index 0
   is preserved at position 0; Ichimoku series are appended after it. */
function applyIchimokuRealData(containerId, ohlcData) {
  const inst = charts[containerId];
  if (!inst || !ohlcData.length) return;

  const tenkan = ohlcData.map((_, i) => i >=  8 ? +_ichimokuMid(ohlcData,  9, i).toFixed(2) : null);
  const kijun  = ohlcData.map((_, i) => i >= 25 ? +_ichimokuMid(ohlcData, 26, i).toFixed(2) : null);
  const spanA  = tenkan.map((t, i) =>
    t != null && kijun[i] != null ? +((t + kijun[i]) / 2).toFixed(2) : null);
  const spanB  = ohlcData.map((_, i) => i >= 51 ? +_ichimokuMid(ohlcData, 52, i).toFixed(2) : null);

  // Kumo cloud: stacked area between Span A and Span B
  const kumoBase  = spanA.map((a, i) =>
    a != null && spanB[i] != null ? +Math.min(a, spanB[i]).toFixed(2) : null);
  const kumoDelta = spanA.map((a, i) =>
    a != null && spanB[i] != null ? +Math.abs(a - spanB[i]).toFixed(2) : null);

  // Read back the current series so the candlestick at index 0 is preserved.
  // Appending after it means ECharts merge-by-index never touches the candlestick.
  const existingSeries = (inst.getOption().series || []).slice();

  inst.setOption({
    series: [
      ...existingSeries,
      {
        name: 'Tenkan-sen',
        type: 'line', data: tenkan,
        symbol: 'none', smooth: false, silent: true, showSymbol: false,
        lineStyle: { color: '#ff6b6b', width: 1.2, type: 'solid' }
      },
      {
        name: 'Kijun-sen',
        type: 'line', data: kijun,
        symbol: 'none', smooth: false, silent: true, showSymbol: false,
        lineStyle: { color: '#00d4d4', width: 1.5, type: 'solid' }
      },
      {
        name: '_kumo_base_real',
        type: 'line', data: kumoBase, stack: 'kumo_real',
        symbol: 'none', smooth: false, silent: true, showSymbol: false,
        lineStyle: { opacity: 0 }, areaStyle: { color: 'transparent' }
      },
      {
        name: '_kumo_fill_real',
        type: 'line', data: kumoDelta, stack: 'kumo_real',
        symbol: 'none', smooth: false, silent: true, showSymbol: false,
        lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(0,212,212,0.15)' }
      }
    ]
  }, { notMerge: false });
}

async function renderRealDataQuiz(containerId, pattern, indicator) {
  const el = document.getElementById(containerId);
  if (el) {
    el.innerHTML = '<div class="chart-loading"><i data-lucide="loader" style="width:14px;height:14px;"></i> Loading real BTC data...</div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  const result = await fetchBinanceCandles(
    pattern.symbol, pattern.interval,
    pattern.decisionTime, pattern.lookback, pattern.reveal
  );

  if (!result) return false;

  const { candles, source } = result;
  const setupCandles  = candles.slice(0, pattern.lookback);
  const revealCandles = candles.slice(pattern.lookback);

  const labels = setupCandles.map(c => {
    const d = new Date(c.time);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const ohlc = setupCandles.map(c => [c.open, c.close, c.low, c.high]);

  const setupDef = {
    ohlc,
    labels,
    markLines: [{ yAxis: pattern.keyLevel, label: pattern.patternLabel, color: TEAL }]
  };
  renderChart(containerId, setupDef, false);

  // Ichimoku overlay — applied after chart renders if the chapter's quiz chart requests it
  if (indicator === 'ichimoku') {
    applyIchimokuRealData(containerId, ohlc);
  }

  window._currentRealPattern = { pattern, revealCandles, setupOhlc: ohlc, setupLabels: labels, source };
  return source;
}

/* ══════════════════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════════════════ */
const state = {
  chapter: 0,   // 0–12
  step:    0,   // 0=intro, 1=lesson, 2=quiz
  progress: {}, // { chapterIndex: { completed, quizAnswered, quizCorrect, quizAnswer } }
  quizAnsweredThisStep: false,
  view:        'course' // 'course' | 'simulator' | 'settings' — what owns #content-area
};

/* ══════════════════════════════════════════════════════════════════════════
   CHART INSTANCE CACHE
   ══════════════════════════════════════════════════════════════════════════ */
const charts = {};

function disposeChart(id) {
  if (charts[id]) {
    try { if (charts[id].__ro) charts[id].__ro.disconnect(); } catch(_) {}   // release the ResizeObserver (it closes over the instance)
    try { charts[id].dispose(); } catch(_) {}
    delete charts[id];
  }
}

function disposeAllCharts() {
  Object.keys(charts).forEach(disposeChart);
  if (typeof disposeV2Player === 'function') disposeV2Player();
  // Simulator owns its own charts/timers/observers — tear them down on any
  // view switch so a mid-reveal exit can't keep painting (B6).
  if (typeof ltSimTeardown === 'function') ltSimTeardown();
}

/* Quiz example toggle state — lets the quiz chart flip between the practice sim
   and the matching real historical BTC example. */
let _quizExample   = null;   // { mode:'sim'|'real', quiz, pattern, indicator, alreadyDone }

/* Replay state — module-level so onclick always resolves the live chart instance */
let _replaySetup    = null;  // { ohlc, labels }
let _replayReveal   = null;  // { ohlc, labels, decisionIndex, pattern }
let _replayChart    = null;  // element id string
let _replayInterval = null;  // active interval reference

/* ══════════════════════════════════════════════════════════════════════════
   LOCAL STORAGE
   ══════════════════════════════════════════════════════════════════════════ */
function getActiveCourseNum() {
  // The stored active-course number is the source of truth: every CHAPTERS swap
  // (switchActiveCourse / boot / route) sets it in lockstep. Prefer it so that if a
  // course's data file failed to load — CHAPTERS then falls back to Course 1's array
  // (courseChapters) — the active course can't be mis-identified as Course 1 and
  // silently save progress under the wrong key. Fall back to array identity when the
  // stored value is missing/invalid (e.g. a brand-new visitor).
  const stored = parseInt(LTStore.get('activeCourse'), 10);
  if (stored >= 1 && stored <= LT_COURSES.length) return stored;
  const def = LT_COURSES.find(c => c.chapters && c.chapters === CHAPTERS);
  return def ? def.num : 1;
}

function getCourseStorageKey() {
  return courseStateKey(getActiveCourseNum());
}

function saveState() {
  try {
    const toSave = {
      chapter:  state.chapter,
      step:     state.step,
      progress: state.progress
    };
    localStorage.setItem(getCourseStorageKey(), JSON.stringify(toSave));
  } catch(_) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(getCourseStorageKey());
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(_) { return null; }
}

function clearState() {
  localStorage.removeItem(getCourseStorageKey());
}

/* ══════════════════════════════════════════════════════════════════════════
   PROGRESS HELPERS
   ══════════════════════════════════════════════════════════════════════════ */
function isChapterCompleted(idx) {
  return !!(state.progress[idx] && state.progress[idx].completed);
}

function isChapterStarted(idx) {
  return !!(state.progress[idx]);
}

function completedCount() {
  return CHAPTERS.filter((_, i) => isChapterCompleted(i)).length;
}

// Count completed chapters in a saved progress map, ignoring stale entries whose
// index is outside the course's CURRENT chapter range. Courses have shed chapters
// across refactors, so old localStorage can hold completed:true for indices that no
// longer exist; counting those unbounded pushes completion past 100% on the home screen.
function _ltCountCompleted(prog, chapterCount) {
  if (!prog) return 0;
  let n = 0;
  for (const k of Object.keys(prog)) {
    const idx = +k;
    if (Number.isInteger(idx) && idx >= 0 && idx < chapterCount && prog[k] && prog[k].completed) n++;
  }
  return n;
}

function allChaptersComplete() {
  return completedCount() === CHAPTERS.length;
}

function globalProgress() {
  // Step counts can vary per chapter (reconstruction chapters have a 4th "Visual"
  // step), so sum cumulatively instead of assuming a uniform 3.
  let total = 0, done = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const sc = stepCount(CHAPTERS[i]);
    total += sc;
    if (i < state.chapter) done += sc;
    else if (i === state.chapter) done += Math.min(state.step, sc);
  }
  return Math.round((done / Math.max(1, total)) * 100);
}

function markChapterStarted(idx) {
  if (!state.progress[idx]) {
    state.progress[idx] = { completed: false, quizAnswered: false, quizCorrect: false, quizAnswer: null };
    saveState();
  }
}

function markChapterCompleted(idx) {
  if (!state.progress[idx]) {
    state.progress[idx] = { completed: false, quizAnswered: false, quizCorrect: false, quizAnswer: null };
  }
  state.progress[idx].completed = true;
  saveState();
}

function markQuizAnswered(idx, answerId, correct) {
  if (!state.progress[idx]) {
    state.progress[idx] = { completed: false, quizAnswered: false, quizCorrect: false, quizAnswer: null };
  }
  state.progress[idx].quizAnswered = true;
  state.progress[idx].quizCorrect  = correct;
  state.progress[idx].quizAnswer   = answerId;
  saveState();
}

/* ═══════════════════════════════════════════════════════════════════════
   INDICATOR OVERLAYS
   ═══════════════════════════════════════════════════════════════════════ */
/* Faithful Ichimoku overlay — computes the indicator from the chart's candles (so it
   matches the v2 lessons), draws the FORWARD-DISPLACED Kumo cloud (green bullish / red
   bearish) with faint Senkou A/B edges, the Chikou lagging span (purple), and Tenkan
   (blue) / Kijun (yellow). Extends the x-axis with `disp` blank slots so the leading
   cloud has open space on the right. `ctx.ohlc` is the candles actually being drawn. */
function _applyIchimokuOverlay(opt, def, ctx) {
  const ohlc = (ctx && ctx.ohlc) || def.ohlc || [];
  if (!ohlc.length) return;
  // Real charts' clouds are built from far MORE history than the visible window (the
  // Kumo at the left edge already reflects ~span periods before it). Our charts only
  // show a short window, so we prepend synthesized OFF-SCREEN history, compute the
  // Ichimoku on the whole thing, then slice back to the displayed candles — giving a
  // MATURE cloud (formed from the left, varied thickness) without touching the visible
  // candles or annotations. Periods are unchanged, so chart-specific setups still hold.
  const p = Object.assign({}, _ICHI_DEFAULT, def.ichi || {});
  const hist = (def.ichiLookback === false) ? [] : _synthIchiLookback(ohlc, p.span + p.disp + 4);
  const off = hist.length;
  const ikF = _computeIchimoku(hist.concat(ohlc), p);
  const ik = {
    tenkan: ikF.tenkan.slice(off), kijun: ikF.kijun.slice(off), chikou: ikF.chikou.slice(off),
    spanA: ikF.spanA.slice(off), spanB: ikF.spanB.slice(off), disp: ikF.disp
  };
  const disp = ik.disp;

  // The real computed cloud + Tenkan/Kijun lines now render, so strip the chart's
  // OLD hand-placed STATIC stand-ins to avoid doubling up: the full-cloud "Kumo" bands
  // (keep "Kumo pocket" highlights) and the flat "Kijun-sen"/"Tenkan-sen" lines (keep
  // trade-level lines like "Cloud Bottom Edge (E2E Entry)" / "...Target").
  const s0 = opt.series[0];
  const labelOf = (d) => { const it = Array.isArray(d) ? d[0] : d; return (it && it.label && it.label.formatter) || (it && it.name) || ''; };
  if (s0 && s0.markArea && s0.markArea.data) {
    s0.markArea.data = s0.markArea.data.filter(d => { const t = labelOf(d); return !(/kumo/i.test(t) && !/pocket/i.test(t)); });
  }
  if (s0 && s0.markLine && s0.markLine.data) {
    s0.markLine.data = s0.markLine.data.filter(d => !/^\s*(kijun-sen|tenkan-sen)\b/i.test(labelOf(d)));
  }

  // leading cloud needs `disp` future category slots on the right
  if (opt.xAxis && Array.isArray(opt.xAxis.data)) {
    for (let e = 0; e < disp; e++) opt.xAxis.data.push('');
  }

  // Per-segment Kumo colour so a bear→bull TWIST is visible (green where Senkou A≥B,
  // red where A<B) instead of one net-bias colour that hides the cross.
  const _bold = !!def.boldCloud;   // opt-in bolder Kumo (thicker fill + defined edges)
  const aEdge = _bold ? 'rgba(40,200,120,0.90)' : 'rgba(40,200,120,0.60)', bEdge = _bold ? 'rgba(242,61,92,0.85)' : 'rgba(242,61,92,0.55)';

  if (!opt.legend) opt.legend = { top: 4, right: 8, data: [], textStyle: { color: '#888', fontSize: 9 }, itemWidth: 16, itemHeight: 2 };
  opt.legend.data = (opt.legend.data || []).concat(['Tenkan', 'Kijun', 'Chikou']);

  // Kumo fill: transparent base = min(A,B); two mutually-exclusive coloured fills
  // stacked on it (bull segments green, bear segments red) → the twist shows.
  const base  = ik.spanA.map((a, i) => a != null && ik.spanB[i] != null ? Math.min(a, ik.spanB[i]) : null);
  const dBull = ik.spanA.map((a, i) => (a != null && ik.spanB[i] != null && a >= ik.spanB[i]) ? (a - ik.spanB[i]) : null);
  const dBear = ik.spanA.map((a, i) => (a != null && ik.spanB[i] != null && a <  ik.spanB[i]) ? (ik.spanB[i] - a) : null);
  opt.series.push({ name: '_kumo_base', type: 'line', data: base,  stack: 'kumo', symbol: 'none', silent: true, showSymbol: false, lineStyle: { opacity: 0 }, areaStyle: { color: 'transparent' }, z: 0, connectNulls: false });
  opt.series.push({ name: '_kumo_bull', type: 'line', data: dBull, stack: 'kumo', symbol: 'none', silent: true, showSymbol: false, lineStyle: { opacity: 0 }, areaStyle: { color: _bold ? 'rgba(40,200,120,0.30)' : 'rgba(40,200,120,0.20)' }, z: 0, connectNulls: false });
  opt.series.push({ name: '_kumo_bear', type: 'line', data: dBear, stack: 'kumo', symbol: 'none', silent: true, showSymbol: false, lineStyle: { opacity: 0 }, areaStyle: { color: _bold ? 'rgba(242,61,92,0.26)' : 'rgba(242,61,92,0.18)' }, z: 0, connectNulls: false });
  // Cloud edges (Senkou A green / Senkou B red) — thicker/more defined when boldCloud is set
  opt.series.push({ name: '_spanA', type: 'line', data: ik.spanA, symbol: 'none', silent: true, showSymbol: false, lineStyle: { color: aEdge, width: _bold ? 1.6 : 1 }, z: 1 });
  opt.series.push({ name: '_spanB', type: 'line', data: ik.spanB, symbol: 'none', silent: true, showSymbol: false, lineStyle: { color: bEdge, width: _bold ? 1.6 : 1 }, z: 1 });
  // Chikou lagging span (purple) — the close shifted back
  opt.series.push({ name: 'Chikou', type: 'line', data: ik.chikou, symbol: 'none', silent: true, showSymbol: false, lineStyle: { color: '#b06cff', width: 1.2 }, z: 1 });
  // Tenkan (blue) + Kijun (yellow) — matches the v2 lessons
  opt.series.push({ name: 'Tenkan', type: 'line', data: ik.tenkan, symbol: 'none', silent: true, showSymbol: false, lineStyle: { color: '#5cc8ff', width: 1.4 }, z: 1 });
  opt.series.push({ name: 'Kijun',  type: 'line', data: ik.kijun,  symbol: 'none', silent: true, showSymbol: false, lineStyle: { color: '#ffcf3f', width: 1.6 }, z: 1 });
}

function _applyFibonacciOverlay(opt, def) {
  if (def.fibHigh == null || def.fibLow == null) return;
  const ratios = def.fibLevels || [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const high = def.fibHigh, low = def.fibLow, range = high - low;
  const up = def.fibDirection === 'up';
  const fibLines = ratios.map(r => {
    const price = up ? +(low + r * range).toFixed(2) : +(high - r * range).toFixed(2);
    return [{
      yAxis: price,
      label: { show: true, formatter: (Math.round(r * 1000) / 10) + '%', color: GOLD, fontSize: 9, fontWeight: 600, position: 'end' },
      lineStyle: { color: GOLD, type: 'dashed', width: 1, opacity: 0.8 }
    }, { yAxis: price }];
  });
  opt.series[0].markLine.data = (opt.series[0].markLine.data || []).concat(fibLines);
}

/* Wilder's RSI from candle closes (ECharts [o,c,l,h] → close = idx1). Null until it
   has `period` deltas of history, then the standard smoothed RSI — the real thing. */
function _computeRSI(ohlc, period) { return LTTa.computeRSI(ohlc, period); }

/* Real RSI oscillator in its OWN ECharts sub-panel (a second grid below price), with
   30/70 reference bands — the faithful replacement for the old price-zone shading. The
   price chart shrinks to make room; the candle series stays on grid 0. */
function _applyRsiPanel(opt, def, ctx) {
  const ohlc = (ctx && ctx.ohlc) || def.ohlc || [];
  if (!ohlc.length) return;
  const C = chartColors();
  const rsi = _computeRSI(ohlc, def.rsiPeriod || 6);
  if (opt._panelFmt) opt._panelFmt['RSI'] = v => Math.round(v);
  const g0 = opt.grid || {};

  // two stacked grids: price on top (shrunk), RSI panel below
  opt.grid = [
    Object.assign({}, g0, { bottom: '30%' }),
    { left: g0.left, right: g0.right, top: '76%', bottom: 28 }
  ];
  // x-axes: price (labels hidden — the RSI panel below carries them) + RSI panel x
  const baseX = opt.xAxis || { type: 'category', data: [] };
  const xData = baseX.data || [];
  opt.xAxis = [
    Object.assign({}, baseX, { gridIndex: 0, axisLabel: { show: false }, axisTick: { show: false } }),
    Object.assign({}, baseX, { gridIndex: 1, data: xData,
      axisLine: { lineStyle: { color: C.BORDER } }, axisTick: { show: false },
      axisLabel: { color: C.TEXT3, fontSize: 9, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', hideOverlap: true } })
  ];
  // y-axes: price (existing) + RSI 0–100
  const baseY = opt.yAxis || {};
  opt.yAxis = [
    Object.assign({}, baseY, { gridIndex: 0 }),
    { gridIndex: 1, min: 0, max: 100, interval: 50, scale: false,
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: C.BORDER, type: 'dashed', opacity: 0.35 } },
      axisLabel: { color: C.TEXT3, fontSize: 9, fontFamily: 'Cascadia Code, JetBrains Mono, monospace' } }
  ];
  // RSI line on the sub-panel with 30/70 bands + an "RSI" tag
  opt.series.push({
    name: 'RSI', type: 'line', data: rsi, xAxisIndex: 1, yAxisIndex: 1,
    symbol: 'none', showSymbol: false, silent: true, smooth: false, connectNulls: false,
    lineStyle: { color: TEAL, width: 1.6 }, z: 2,
    markLine: {
      symbol: ['none', 'none'], silent: true,
      data: [
        { yAxis: 70, label: { show: true, formatter: '70', position: 'start', color: C.TEXT3, fontSize: 9 }, lineStyle: { color: 'rgba(' + VIZ.bearRgb + ',0.5)', type: 'dashed', width: 1 } },
        { yAxis: 30, label: { show: true, formatter: '30', position: 'start', color: C.TEXT3, fontSize: 9 }, lineStyle: { color: 'rgba(' + VIZ.bullRgb + ',0.5)', type: 'dashed', width: 1 } }
      ]
    }
  });
  // Optional annotations ON the RSI line itself (e.g. mark the oscillator's low/higher-low
  // so a divergence is visible on the oscillator, not just described in the price labels).
  // def.rsiMarkPoints = [{ dataIndex, label, position:'top'|'bottom', color? }]
  if (Array.isArray(def.rsiMarkPoints) && def.rsiMarkPoints.length) {
    const rsiSeries = opt.series[opt.series.length - 1];   // the RSI line just pushed
    rsiSeries.markPoint = {
      silent: true,
      symbol: 'circle',
      symbolSize: 7,
      data: def.rsiMarkPoints.map(mp => {
        const v = rsi[mp.dataIndex];
        if (v == null || isNaN(v)) return null;
        const col = mp.color || TEAL;
        return {
          coord: [mp.dataIndex, v],
          value: mp.label,
          itemStyle: { color: col, borderColor: C.BG || '#0a0a0c', borderWidth: 1.5 },
          label: {
            show: true, formatter: '{c}',
            position: mp.position === 'top' ? 'top' : 'bottom',
            distance: 7,
            color: _legibleOnDark(col),
            fontSize: 9, fontWeight: 700,
            fontFamily: 'Cascadia Code, JetBrains Mono, monospace',
            backgroundColor: 'rgba(10,10,12,0.82)', padding: [2, 5], borderRadius: 4
          }
        };
      }).filter(Boolean)
    };
  }
  // link the two panels' crosshair
  if (opt.tooltip) opt.tooltip.axisPointer = Object.assign({}, opt.tooltip.axisPointer, { link: [{ xAxisIndex: 'all' }] });
}

/* ── Hyblock-style tool visualizations (liq levels / heatmap / trading activity) ──
   These DRAW the tools a confluence chart references instead of only naming them. */

// #rrggbb → "r,g,b" (for building rgba() at a chosen alpha). Falls back to gold.
function _hexToRgb(hex) { return LTUtils.hexToRgb(hex); }
// Pick legible pill text for a solid-coloured background: near-black on light pills
// (teal/gold), white on darker/saturated pills (the brand pink). Keeps every colour-coded
// price-tag readable instead of dark-on-pink mud.
function _pillText(hex) { return LTUtils.pillText(hex); }

// Liquidation-cluster ladder — dashed lines at leveraged-liq prices (a magnet price runs
// into). Only the cluster is labelled (so the right-edge pills don't pile). The faint band
// behind the rungs follows the cluster colour, so red/teal pools stay semantically coloured.
// def.liqCluster = { lines:[price,...], label, color }
function _applyLiqCluster(opt, def) {
  const lc = def.liqCluster;
  if (!lc || !lc.lines || !lc.lines.length) return;
  const col = lc.color || '#ffcc00', s0 = opt.series[0], rgb = _hexToRgb(col);
  const labelTxt = _pillText(col);   // dark on gold/teal, white on the brand pink
  // faint colour-matched band behind the rungs so the cluster reads as a visible ZONE
  const lo = Math.min.apply(null, lc.lines), hi = Math.max.apply(null, lc.lines);
  s0.markArea = s0.markArea || { silent: true, data: [] };
  s0.markArea.data.push([{ yAxis: lo - 1, itemStyle: { color: 'rgba(' + rgb + ',0.10)' } }, { yAxis: hi + 1 }]);
  s0.markLine = s0.markLine || { symbol: ['none', 'none'], silent: true, data: [] };
  lc.lines.forEach((y, i) => {
    const labelled = (i === lc.lines.length - 1) && lc.label;
    s0.markLine.data.push([
      { yAxis: y,
        label: labelled ? { show: true, formatter: lc.label, color: labelTxt, fontSize: 9, fontWeight: 700, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', position: 'end', backgroundColor: col, padding: [2, 6], borderRadius: 4 } : { show: false },
        lineStyle: { color: col, type: 'dashed', width: 1.6, opacity: 0.95 } },
      { yAxis: y }
    ]);
  });
}

// Order-book heatmap — stacked horizontal cells whose brightness PEAKS at the densest
// price and fades out (a real heatmap gradient). def.heatmap = [{ center, halfHeight,
// color:'r,g,b', peak, cells, label }, ...]
function _applyHeatmap(opt, def) {
  if (!def.heatmap || !def.heatmap.length) return;
  const s0 = opt.series[0];
  s0.markArea = s0.markArea || { silent: true, data: [] };
  def.heatmap.forEach(b => {
    const center = b.center, hh = b.halfHeight || 5, cells = b.cells || 7, rgb = b.color || '255,46,136', peak = b.peak || 0.55;
    const cellH = (hh * 2) / cells;
    let bestOp = -1, bestY0 = center;
    for (let i = 0; i < cells; i++) {
      const y0 = center - hh + i * cellH, y1 = y0 + cellH, mid = (y0 + y1) / 2, dist = Math.abs(mid - center) / hh;
      const op = peak * (1 - dist * dist);                       // bright at center, fading out
      if (op <= 0.03) continue;
      s0.markArea.data.push([{ yAxis: y0, itemStyle: { color: 'rgba(' + rgb + ',' + op.toFixed(2) + ')' } }, { yAxis: y1 }]);
      if (op > bestOp) { bestOp = op; bestY0 = y0; }
    }
    if (b.label) s0.markArea.data.push([
      { yAxis: bestY0, label: { show: true, formatter: b.label, color: '#fff', fontSize: 9, fontWeight: 700, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', position: 'insideTopLeft', backgroundColor: 'rgba(10,10,12,0.5)', padding: [2, 5], borderRadius: 3 }, itemStyle: { color: 'transparent' } },
      { yAxis: bestY0 + cellH }
    ]);
  });
}

// Cumulative delta from candle bodies (close − open), accumulated.
function _computeCumDelta(ohlc) { return LTTa.cumDelta(ohlc); }

// Compact axis-tick formatter for sub-panels (1.2k / 850 / 0.08).
function _fmtCompact(v) { return LTUtils.fmtCompact(v); }

// Deterministic synthetic volume from candle range + body (mirrors the v2 lessons), with
// optional profile shaping: 'declining' / 'rising' across the chart, or 'pattern' (declines
// into a setup then spikes on the break at breakIndex). opt.spikes = { idx: mult }.
function _synthVolume(ohlc, opt) { return LTTa.synthVolume(ohlc, opt); }

// Shared 2-grid scaffold for every sub-panel (price on top, the panel below). When `fmt`
// is given the panel gets a readable y-axis (ticks + faint gridlines) — otherwise it's
// hidden. Returns the colour set. opts: { fmt, min, max }.
function _subPanelGrids(opt, opts) {
  opts = opts || {};
  const C = chartColors(), g0 = opt.grid || {};
  opt.grid = [
    Object.assign({}, g0, { bottom: '30%' }),
    { left: g0.left, right: g0.right, top: '78%', bottom: 26 }
  ];
  const baseX = opt.xAxis || { type: 'category', data: [] }, xData = baseX.data || [];
  opt.xAxis = [
    Object.assign({}, baseX, { gridIndex: 0, axisLabel: { show: false }, axisTick: { show: false } }),
    Object.assign({}, baseX, { gridIndex: 1, data: xData, axisLine: { lineStyle: { color: C.BORDER } }, axisTick: { show: false }, axisLabel: { color: C.TEXT3, fontSize: 9, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', hideOverlap: true } })
  ];
  const baseY = opt.yAxis || {};
  opt.yAxis = [
    Object.assign({}, baseY, { gridIndex: 0 }),
    { gridIndex: 1, scale: opts.min == null, min: opts.min, max: opts.max,
      splitNumber: 2, axisLine: { show: false }, axisTick: { show: false },
      splitLine: opts.fmt ? { show: true, lineStyle: { color: C.BORDER, type: 'dashed', opacity: 0.25 } } : { show: false },
      axisLabel: opts.fmt ? { show: true, color: C.TEXT2, fontSize: 9, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', formatter: opts.fmt } : { show: false } }
  ];
  if (opt.tooltip) opt.tooltip.axisPointer = Object.assign({}, opt.tooltip.axisPointer, { link: [{ xAxisIndex: 'all' }] });
  return C;
}

// Trading-activity sub-panel: a proper order-flow read — a per-bar delta HISTOGRAM
// (volume × close-location-in-range: close near the high = buying teal, near the low =
// selling red) PLUS the cumulative-delta (CVD) line on top (the chapter's hero). This is
// the real thing platforms show, not a body-sum proxy drawn as bars.
// def.tradingActivity = true (+ optional def.activityLabel)
function _applyActivityPanel(opt, def, ctx) {
  const ohlc = (ctx && ctx.ohlc) || def.ohlc || [];
  if (!ohlc.length) return;
  const vols = _synthVolume(ohlc);
  const perBar = ohlc.map((c, i) => {
    const hi = c[3], lo = c[2], rng = hi - lo;
    const clv = rng ? Math.max(-1, Math.min(1, 2 * (c[1] - lo) / rng - 1)) : 0;  // +1 close@high (buy) … −1 close@low (sell)
    return +(vols[i] * clv).toFixed(2);
  });
  let a = 0; const cvd = perBar.map(d => (a += d, +a.toFixed(2)));
  const C = _subPanelGrids(opt, { fmt: _fmtCompact });
  const _dfmt = v => (v > 0 ? '+' : '') + _fmtCompact(v);
  if (opt._panelFmt) { opt._panelFmt['Δ/bar'] = _dfmt; opt._panelFmt[def.activityLabel || 'Cumulative Delta'] = _dfmt; }
  const si = opt.series.length;
  // per-bar delta histogram (who's aggressive each bar) — sign-coloured (visualMap on a BAR is safe)
  opt.series.push({
    name: 'Δ/bar', type: 'bar', data: perBar, xAxisIndex: 1, yAxisIndex: 1,
    barWidth: '55%', silent: true, z: 2, itemStyle: { opacity: 0.5 }
  });
  opt.visualMap = (opt.visualMap || []).concat([{
    show: false, type: 'piecewise', seriesIndex: si, dimension: 1,
    pieces: [{ lt: 0, color: VIZ.bear }, { gte: 0, color: VIZ.bull }]
  }]);
  // CVD line — the cumulative delta itself, drawn as a line (no visualMap → no ECharts crash)
  opt.series.push({
    name: def.activityLabel || 'Cumulative Delta', type: 'line', data: cvd, xAxisIndex: 1, yAxisIndex: 1,
    symbol: 'none', showSymbol: false, silent: true, smooth: false, lineStyle: { color: VIZ.accent, width: 2 }, z: 3,
    markLine: { symbol: ['none', 'none'], silent: true, data: [
      { yAxis: 0, label: { show: true, formatter: (def.activityLabel || 'Cumulative Δ (CVD)'), position: 'insideStartTop', color: C.TEXT3, fontSize: 9, fontFamily: 'Cascadia Code, JetBrains Mono, monospace' }, lineStyle: { color: C.BORDER, type: 'dashed', width: 1 } }
    ] }
  });
}

// Volume sub-panel — up/down-coloured volume bars (teal = up candle, red = down) with an
// average-volume reference line. def.volume = true | { profile, breakIndex, spikes }.
function _applyVolumePanel(opt, def, ctx) {
  const ohlc = (ctx && ctx.ohlc) || def.ohlc || [];
  if (!ohlc.length) return;
  const cfg = (def.volume && typeof def.volume === 'object') ? def.volume : {};
  const vols = _synthVolume(ohlc, cfg);
  const avg = vols.reduce((s, v) => s + v, 0) / (vols.length || 1);
  const data = ohlc.map((c, i) => ({ value: vols[i], itemStyle: { color: c[1] >= c[0] ? 'rgba(' + VIZ.bullRgb + ',0.5)' : 'rgba(' + VIZ.bearRgb + ',0.5)' } }));
  const C = _subPanelGrids(opt, { fmt: _fmtCompact, min: 0 });
  if (opt._panelFmt) opt._panelFmt['Volume'] = _fmtCompact;
  opt.series.push({
    name: 'Volume', type: 'bar', data: data, xAxisIndex: 1, yAxisIndex: 1, barWidth: '60%', silent: true, z: 2,
    markLine: { symbol: ['none', 'none'], silent: true, data: [
      { yAxis: +avg.toFixed(2), label: { show: true, formatter: (cfg.label || 'Volume') + ' · avg', position: 'insideStartTop', color: C.TEXT3, fontSize: 9, fontFamily: 'Cascadia Code, JetBrains Mono, monospace' }, lineStyle: { color: C.BORDER, type: 'dashed', width: 1, opacity: 0.6 } }
    ] }
  });
}

// Linear-interpolate authored control points [[barIdx,val],...] to an n-length series
// (flat-hold before the first point and after the last). Lets a sub-panel carry a tiny,
// candle-count-agnostic def instead of a hand-typed full array.
function _interpSeries(points, n) {
  if (!points || !points.length) return new Array(n).fill(0);
  const pts = points.slice().sort((a, b) => a[0] - b[0]), last = pts[pts.length - 1];
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    if (i <= pts[0][0]) { out[i] = pts[0][1]; continue; }
    if (i >= last[0]) { out[i] = last[1]; continue; }
    let k = 0; while (k < pts.length - 1 && pts[k + 1][0] <= i) k++;
    const a = pts[k], b = pts[k + 1], t = (i - a[0]) / (b[0] - a[0]);
    out[i] = +(a[1] + (b[1] - a[1]) * t).toFixed(4);
  }
  return out;
}

// Generic sentiment sub-panel (mirrors _applyActivityPanel) for the tools that have no
// price-derivable series — funding rate, futures basis, open interest. Driven by authored
// control points so each chart tells its own story.
//   def.subPanel = { kind:'funding'|'basis'|'oi', points:[[i,v],...], label?, color?, posColor?, negColor? }
// funding/basis → sign-coloured histogram with a zero line (green ≥0 / red <0);
// oi → a single accent line+area (the shape — rising/falling — is the signal).
function _applySubPanel(opt, def, ctx) {
  const sp = def.subPanel;
  if (!sp || !sp.points) return;
  const ohlc = (ctx && ctx.ohlc) || def.ohlc || [];
  const n = (opt.xAxis && opt.xAxis.data && opt.xAxis.data.length) || ohlc.length;
  if (!n) return;
  const data = _interpSeries(sp.points, n);
  // kind-aware y-axis units + a sign-meaning hint so "red ≠ bearish" is never misread
  const fmt = sp.kind === 'funding' ? (v => (v > 0 ? '+' : '') + v.toFixed(2) + '%')
            : sp.kind === 'basis'   ? (v => (v > 0 ? '+$' : '-$') + Math.abs(Math.round(v)))
            : _fmtCompact;
  const C = _subPanelGrids(opt, { fmt });
  const label = sp.label || (sp.kind === 'oi' ? 'Open Interest' : sp.kind === 'basis' ? 'Futures Basis' : 'Funding Rate');
  if (opt._panelFmt) opt._panelFmt[label] = fmt;   // tooltip shows the value under the cursor, with units
  const hint = sp.kind === 'funding' ? '  −=shorts pay'
             : sp.kind === 'basis'   ? '  −=backwardation'
             : '';
  const si = opt.series.length;
  if (sp.kind === 'oi' || sp.type === 'line') {
    const col = sp.color || '231,181,58';   // OI: warm-gold magnitude line, no sign meaning (always +)
    opt.series.push({
      name: label, type: 'line', data: data, xAxisIndex: 1, yAxisIndex: 1,
      symbol: 'none', showSymbol: false, silent: true, smooth: false,
      lineStyle: { color: 'rgb(' + col + ')', width: 2 }, areaStyle: { color: 'rgba(' + col + ',0.14)' }, z: 2,
      markLine: { symbol: ['none', 'none'], silent: true, data: [
        { yAxis: data[0], label: { show: true, formatter: label, position: 'insideStartTop', color: C.TEXT3, fontSize: 9, fontFamily: 'Cascadia Code, JetBrains Mono, monospace' }, lineStyle: { color: C.BORDER, type: 'dashed', width: 1, opacity: 0.5 } }
      ] }
    });
  } else {
    opt.series.push({
      name: label, type: 'bar', data: data, xAxisIndex: 1, yAxisIndex: 1,
      barWidth: '55%', silent: true, z: 2,
      markLine: { symbol: ['none', 'none'], silent: true, data: [
        { yAxis: 0, label: { show: true, formatter: label + hint, position: 'insideStartTop', color: C.TEXT3, fontSize: 9, fontFamily: 'Cascadia Code, JetBrains Mono, monospace' }, lineStyle: { color: C.BORDER, type: 'dashed', width: 1 } }
      ] }
    });
    opt.visualMap = (opt.visualMap || []).concat([{
      show: false, type: 'piecewise', seriesIndex: si, dimension: 1,
      pieces: [{ lt: 0, color: sp.negColor || VIZ.bear }, { gte: 0, color: sp.posColor || VIZ.bull }]
    }]);
  }
}

// Multi sub-panel "confluence board" — N stacked sub-panels below price (e.g. Funding + OI +
// Cumulative Delta + Basis for the SA capstone), each in its own grid with its own y-scale, so
// every SA variable is DRAWN rather than named in a scorecard. Driven by authored control
// points, one entry per panel:
//   def.subPanels = [{ kind:'funding'|'basis'|'oi'|'cvd', points:[[i,v],...], label?, color?, posColor?, negColor? }, ...]
// funding/basis → sign-coloured histogram + zero line; oi → gold line+area; cvd → accent line.
// Price takes the top; the panels split the lower band evenly; only the bottom panel shows the
// date axis. Pairs with the subPanels shift in the context pass.
function _applyMultiSubPanels(opt, def, ctx) {
  const panels = def.subPanels;
  if (!panels || !panels.length) return;
  const ohlc = (ctx && ctx.ohlc) || def.ohlc || [];
  const baseX = opt.xAxis || { type: 'category', data: [] }, xData = baseX.data || [];
  const n = xData.length || ohlc.length;
  if (!n) return;
  const C = chartColors(), g0 = opt.grid || {};
  const left = g0.left != null ? g0.left : 48, right = g0.right != null ? g0.right : 20;
  const N = panels.length;

  // vertical layout (% of container): price on top, N equal sub-panels beneath.
  const topPad = 5, botPad = 9, gap = 2.4;
  const priceH = Math.max(32, 52 - N * 3.5);          // price cedes a little as panels grow
  const subTop = topPad + priceH + gap;
  const panelH = (100 - subTop - botPad - gap * (N - 1)) / N;

  const grids = [{ left: left, right: right, top: topPad + '%', height: priceH + '%' }];
  const xAxes = [Object.assign({}, baseX, { gridIndex: 0, axisLabel: { show: false }, axisTick: { show: false } })];
  const yAxes = [Object.assign({}, (opt.yAxis || {}), { gridIndex: 0 })];
  for (let k = 0; k < N; k++) {
    const gi = k + 1, isLast = k === N - 1;
    grids.push({ left: left, right: right, top: (subTop + k * (panelH + gap)).toFixed(2) + '%', height: panelH.toFixed(2) + '%' });
    xAxes.push(Object.assign({}, baseX, {
      gridIndex: gi, data: xData, axisLine: { lineStyle: { color: C.BORDER } }, axisTick: { show: false },
      axisLabel: isLast ? { color: C.TEXT3, fontSize: 9, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', hideOverlap: true } : { show: false }
    }));
    yAxes.push({ gridIndex: gi, scale: true, splitNumber: 1, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false } });
  }
  opt.grid = grids; opt.xAxis = xAxes; opt.yAxis = yAxes;
  if (opt.tooltip) opt.tooltip.axisPointer = Object.assign({}, opt.tooltip.axisPointer, { link: [{ xAxisIndex: 'all' }] });

  panels.forEach((sp, k) => {
    const gi = k + 1, data = _interpSeries(sp.points, n), kind = sp.kind;
    const label = sp.label || (kind === 'oi' ? 'Open Interest' : kind === 'basis' ? 'Futures Basis' : (kind === 'cvd' || kind === 'delta') ? 'Cumulative Delta' : 'Funding Rate');
    const fmt = kind === 'funding' ? (v => (v > 0 ? '+' : '') + v.toFixed(2) + '%')
              : kind === 'basis'   ? (v => (v > 0 ? '+$' : '-$') + Math.abs(Math.round(v)))
              : _fmtCompact;
    if (opt._panelFmt) opt._panelFmt[label] = fmt;
    const hint = kind === 'funding' ? '  −=shorts pay' : kind === 'basis' ? '  −=backwardation' : '';
    const nameMarkLine = (yv, extra) => ({ symbol: ['none', 'none'], silent: true, data: [
      { yAxis: yv, label: { show: true, formatter: label + (extra || ''), position: 'insideStartTop', color: C.TEXT3, fontSize: 9, fontFamily: 'Cascadia Code, JetBrains Mono, monospace' }, lineStyle: { color: C.BORDER, type: 'dashed', width: 1, opacity: 0.5 } }
    ] });
    const si = opt.series.length;
    if (kind === 'oi' || sp.type === 'line') {
      const col = sp.color || '231,181,58';                 // OI: warm-gold magnitude line
      opt.series.push({ name: label, type: 'line', data: data, xAxisIndex: gi, yAxisIndex: gi, symbol: 'none', showSymbol: false, silent: true, smooth: false, lineStyle: { color: 'rgb(' + col + ')', width: 2 }, areaStyle: { color: 'rgba(' + col + ',0.14)' }, z: 2, markLine: nameMarkLine(data[0]) });
    } else if (kind === 'cvd' || kind === 'delta') {
      opt.series.push({ name: label, type: 'line', data: data, xAxisIndex: gi, yAxisIndex: gi, symbol: 'none', showSymbol: false, silent: true, smooth: false, lineStyle: { color: VIZ.accent, width: 2 }, z: 2, markLine: nameMarkLine(0, hint) });
    } else {                                                 // funding / basis → sign-coloured histogram
      opt.series.push({ name: label, type: 'bar', data: data, xAxisIndex: gi, yAxisIndex: gi, barWidth: '55%', silent: true, z: 2, markLine: nameMarkLine(0, hint) });
      opt.visualMap = (opt.visualMap || []).concat([{ show: false, type: 'piecewise', seriesIndex: si, dimension: 1, pieces: [{ lt: 0, color: sp.negColor || VIZ.bear }, { gte: 0, color: sp.posColor || VIZ.bull }] }]);
    }
  });
}

// Order-book depth ladder — resting-bid rungs BELOW price (green support) and resting-ask
// rungs ABOVE price (red resistance). Rung weight/opacity ∝ size; the largest on each side
// is the labelled "wall". A different visual language from the amber heatmap + gold liq
// ladder, so it reads as the order book it is.
//   def.orderBook = { bids:[{price,size},...], asks:[{price,size},...], bidLabel?, askLabel? }
function _applyOrderBook(opt, def) {
  const ob = def.orderBook;
  if (!ob) return;
  const s0 = opt.series[0];
  s0.markLine = s0.markLine || { symbol: ['none', 'none'], silent: true, data: [] };
  s0.markArea = s0.markArea || { silent: true, data: [] };
  function side(rungs, rgb, label) {
    if (!rungs || !rungs.length) return;
    const maxSize = Math.max.apply(null, rungs.map(r => r.size));
    let wall = rungs[0]; rungs.forEach(r => { if (r.size > wall.size) wall = r; });
    const lo = Math.min.apply(null, rungs.map(r => r.price)), hi = Math.max.apply(null, rungs.map(r => r.price));
    s0.markArea.data.push([{ yAxis: lo, itemStyle: { color: 'rgba(' + rgb + ',0.06)' } }, { yAxis: hi }]);
    rungs.forEach(r => {
      const frac = maxSize ? r.size / maxSize : 0, isWall = (r === wall);
      s0.markLine.data.push([
        { yAxis: r.price,
          label: (isWall && label) ? { show: true, formatter: label, color: '#0a0a0c', backgroundColor: 'rgba(' + rgb + ',0.95)', fontSize: 9, fontWeight: 700, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', padding: [2, 6], borderRadius: 4, position: 'end' } : { show: false },
          lineStyle: { color: 'rgba(' + rgb + ',' + (0.3 + 0.6 * frac).toFixed(2) + ')', width: +(1 + 3 * frac).toFixed(1), type: isWall ? 'solid' : 'dashed' } },
        { yAxis: r.price }
      ]);
    });
  }
  side(ob.bids, ob.bidColor || VIZ.bullRgb, ob.bidLabel || 'Bid Wall (support)');
  side(ob.asks, ob.askColor || VIZ.bearRgb, ob.askLabel || 'Ask Wall (resistance)');
}

/* ── Price-action CONTEXT (lead-in history + follow-through) ──────────────────
   Every teaching chart is a hand-authored setup of ~14–18 candles; in isolation it
   reads "too perfect". This prepends a believable approach and appends a follow-through
   (both via the realistic `ltCandles` generator) so each chart reads as a slice of a
   real chart. Run ONCE at boot, mutating the stored chart defs in place; index-based
   annotations (cutIndex / markPoints / revealMarkPoints / subPanel.points) are shifted
   by the lead-in count. Price-based annotations (markLines / liqCluster / heatmap) are
   untouched. The real-data gallery builds its own defs from fetched candles and is not
   affected. */
const _CTX_LEAD = 10, _CTX_TRAIL = 6;
function _ctxSeed(ohlc) {
  let s = ohlc.length * 2654435761 >>> 0;
  for (let i = 0; i < ohlc.length && i < 6; i++) s = (s * 31 + Math.round((ohlc[i][0] + ohlc[i][3]) * 7)) >>> 0;
  return s || 7;
}
// Lead-in: a prior trend in the SAME direction the setup opens (price was already moving
// into the level), ending exactly at the chart's first open — so each chart's context is
// contextual, not a single repeated template. Direction inferred from the first few candles.
function _genApproach(ohlc, n, range, seed) {
  if (typeof ltCandles !== 'function' || !ohlc.length) return [];
  const endOpen = ohlc[0][0], look = Math.min(5, ohlc.length - 1);
  const perBar = look > 0 ? (ohlc[look][1] - ohlc[0][0]) / look : 0;
  const cap = range * 0.42;
  let drift = Math.max(-cap, Math.min(cap, perBar * n * 0.45));
  if (Math.abs(drift) < range * 0.06) drift = (drift >= 0 ? 1 : -1) * range * 0.12;  // never dead-flat
  const startPrice = endOpen - drift, h = Math.ceil(n * 0.6), k = n - h;             // trend startPrice → endOpen
  return ltCandles(startPrice, [{ to: endOpen - drift * 0.18, bars: h }, { to: endOpen, bars: k }], { seed: seed, wick: 0.6, noise: 0.7 });
}
// Follow-through: continue the setup's LAST move (decaying), then settle — directional, not
// a fixed bounce. Starts at the chart's last close.
function _genTrail(ohlc, n, range, seed) {
  if (typeof ltCandles !== 'function' || !ohlc.length) return [];
  const last = ohlc[ohlc.length - 1][1], look = Math.min(5, ohlc.length - 1);
  const perBar = look > 0 ? (last - ohlc[ohlc.length - 1 - look][1]) / look : 0;
  const cap = range * 0.3;
  const cont = Math.max(-cap, Math.min(cap, perBar * n * 0.3));
  const h = Math.ceil(n / 2), k = n - h;
  return ltCandles(last, [{ to: last + cont, bars: h }, { to: last + cont * 0.5, bars: k }], { seed: seed, wick: 0.6, noise: 0.7 });
}
// Expand ONE chart def in place. Returns the lead-bar count applied (0 if skipped) so
// the caller can shift any SIBLING revealMarkPoints by the same amount.
function _expandChartDef(def) {
  if (!def || def.__ctx) return def && def.__ctxLead || 0;
  if ((def.type && def.type !== 'candlestick') || def.format === 'concept' || def.noContext || !Array.isArray(def.ohlc) || !def.ohlc.length) { def.__ctx = true; def.__ctxLead = 0; return 0; }
  const ohlc = def.ohlc;
  let lo = Infinity, hi = -Infinity;
  ohlc.forEach(c => { if (c[2] < lo) lo = c[2]; if (c[3] > hi) hi = c[3]; });
  const range = Math.max(1, hi - lo), seed = _ctxSeed(ohlc);
  const lead = _genApproach(ohlc, _CTX_LEAD, range, seed);
  const trail = _genTrail(ohlc, _CTX_TRAIL, range, seed + 101);
  const M = lead.length, K = trail.length;
  if (!M && !K) { def.__ctx = true; def.__ctxLead = 0; return 0; }
  def.ohlc = lead.concat(ohlc, trail);
  // blank labels on the context bars so any meaningful original labels are preserved
  def.labels = new Array(M).fill('').concat(def.labels || (typeof ltLabels === 'function' ? ltLabels(ohlc.length) : ohlc.map((_, i) => 'D' + (i + 1))), new Array(K).fill(''));
  if (def.cutIndex != null) def.cutIndex += M;
  (def.markPoints || []).forEach(mp => { if (mp.dataIndex != null) mp.dataIndex += M; });
  (def.revealMarkPoints || []).forEach(mp => { if (mp.dataIndex != null) mp.dataIndex += M; });
  (def.rsiMarkPoints || []).forEach(mp => { if (mp.dataIndex != null) mp.dataIndex += M; });
  if (def.subPanel && Array.isArray(def.subPanel.points)) def.subPanel.points = def.subPanel.points.map(p => [p[0] + M, p[1]]);
  if (Array.isArray(def.subPanels)) def.subPanels.forEach(sp => { if (Array.isArray(sp.points)) sp.points = sp.points.map(p => [p[0] + M, p[1]]); });
  if (Array.isArray(def.candleColors)) def.candleColors = new Array(M).fill(null).concat(def.candleColors, new Array(K).fill(null));
  def.__ctx = true; def.__ctxLead = M;
  return M;
}
function _expandAllChartContext() {
  function chap(arr) {
    if (!arr) return;
    arr.forEach(ch => {
      if (!ch) return;
      _expandChartDef(ch.introChart);
      _expandChartDef(ch.lessonChart);
      if (ch.quiz && ch.quiz.chart) {
        const m = _expandChartDef(ch.quiz.chart);
        if (m && Array.isArray(ch.quiz.revealMarkPoints)) ch.quiz.revealMarkPoints.forEach(mp => { if (mp.dataIndex != null) mp.dataIndex += m; });
      }
    });
  }
  [typeof LT_CHAPTERS !== 'undefined' && LT_CHAPTERS, typeof LT_CHAPTERS_2 !== 'undefined' && LT_CHAPTERS_2,
   typeof LT_CHAPTERS_3 !== 'undefined' && LT_CHAPTERS_3, typeof LT_CHAPTERS_4 !== 'undefined' && LT_CHAPTERS_4].forEach(chap);
}

function _applyIndicatorOverlay(opt, def, ctx) {
  switch (def.indicator) {
    case 'ichimoku':  _applyIchimokuOverlay(opt, def, ctx);  break;
    case 'fibonacci': _applyFibonacciOverlay(opt, def);      break;
    case 'rsi':       _applyRsiPanel(opt, def, ctx);         break;   // real RSI oscillator sub-panel
    case 'volume':    _applyVolumePanel(opt, def, ctx);      break;   // volume sub-panel (was a no-op)
  }
}

/* ── Systemic axis niceties (real dates + round price ticks) ─────────────
   Replaces the old generic "D1..Dn"/blank time axis with an evenly-spaced,
   readable date/time axis, and rounds the price-axis tick labels so an axis
   never reads "74.9905". Per-chart override: def.tf ('15m'|'1h'|'4h'|'6h'|
   '12h'|'1d'|'3d'|'1w'|'1M'). Deterministic (anchor varies per chart by a
   seed off its own data) — no Date.now, identical every load. */
const _ENG_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const _ENG_TF_MS = { '15m':900000,'30m':1800000,'1h':3600000,'2h':7200000,'4h':14400000,'6h':21600000,'12h':43200000,'1d':86400000,'3d':259200000,'1w':604800000,'1M':2629800000 };
function _engGenericLabels(ls){ return Array.isArray(ls) && ls.length > 0 && ls.every(l => l === '' || /^D\d+$/.test(String(l))); }
function _engFmtDate(ms, tf){
  const d = new Date(ms), mo = _ENG_MON[d.getUTCMonth()], day = d.getUTCDate();
  if (tf === '1M') return mo + " '" + String(d.getUTCFullYear()).slice(2);
  if (tf === '1w' || tf === '3d' || tf === '1d') return mo + ' ' + day;
  const h = d.getUTCHours();
  return h === 0 ? mo + ' ' + day : (h < 10 ? '0' : '') + h + ':00';   // intraday: time, date at midnight
}
function _engTimeAxis(n, tf, seed){
  const step = _ENG_TF_MS[tf] || 86400000;
  const base = Date.UTC(2025, 0, 6, 0, 0, 0);            // fixed Monday reference (deterministic)
  const anchor = base - ((seed % 210) * step);            // vary the visible window per chart
  const data = Array.from({ length: n }, (_, i) => _engFmtDate(anchor + i * step, tf));  // one label per candle → never mismatches
  return { data, interval: _engAxisInterval(n) };
}
function _engAxisInterval(n){ const every = Math.max(1, Math.round(n / 7)); return (idx) => idx % every === 0; }  // ~7 evenly-spaced labels
// Resolve a chart def's x-axis labels: generic "D1..Dn" placeholders become a real
// calendar axis; the def's own custom labels (R/%, W/M, real dates) pass through unchanged.
// Seeded off the FULL candle set so a setup slice and the full reveal produce IDENTICAL
// dates — this is what stops the axis flipping back to "D1 D2 …" mid-reveal / on replay.
function _engResolveLabels(def){
  if (!_engGenericLabels(def.labels)) return def.labels;
  const tf = def.tf || '1d';
  const n  = (def.ohlc && def.ohlc.length) || def.labels.length;
  const seed = Math.abs(Math.round((((def.ohlc && def.ohlc[0] && (def.ohlc[0][0] + def.ohlc[0][3])) || 1) * 7)) + n) || 7;
  return _engTimeAxis(n, tf, seed).data;
}
function _engNiceStep(range){ range = Math.abs(range) || 1; const raw = range / 5, mag = Math.pow(10, Math.floor(Math.log10(raw))), nn = raw / mag; const s = nn < 1.5 ? 1 : nn < 3 ? 2 : nn < 7 ? 5 : 10; return s * mag; }
function _engRoundTick(v){ const a = Math.abs(v); if (a >= 1000) return Math.round(v).toLocaleString('en-US'); if (a >= 1) return String(Math.round(v)); if (a === 0) return '0'; return String(Math.round(v * 100) / 100); }

/* ═══════════════════════════════════════════════════════════════════════
   CHART BUILDER — Converts simplified chart defs to ECharts options
   ═══════════════════════════════════════════════════════════════════════ */
function buildCandlestickOption(def, revealMode) {
  const C = chartColors();
  // Compact everything (fonts, margins, marker pills, zone labels) on phones so the
  // candles get more room and the annotations stop colliding.
  const sm = (typeof window !== 'undefined' && window.innerWidth <= 768);
  // Phones: keep only each label's SUBJECT (text before the first delimiter) so the
  // pills stop covering the candles — the explanation lives in the copy around the
  // chart. "Stop — below swing low" → "Stop"; untouched when it has no delimiter.
  const xs = (typeof window !== 'undefined' && window.innerWidth <= 480);
  const _shortLbl = (t) => {
    if (!xs || !t || t.length <= 16) return t;
    let cut = -1;
    for (const d of [' — ', ' → ', ' = ', ' · ', ': ', ' (']) {
      const k = t.indexOf(d);
      if (k > 0 && (cut < 0 || k < cut)) cut = k;
    }
    if (cut > 0) return t.slice(0, cut);
    return t.length > 24 ? t.slice(0, 22).replace(/[\s,;:—→=·(+]+$/, '') + '…' : t;
  };
  const cutIndex    = def.cutIndex  != null ? def.cutIndex  : def.ohlc.length;
  // Real calendar axis (replaces generic D1..Dn), resolved off the FULL def so the setup
  // slice and the reveal share identical dates; custom label arrays (R/%, W/M) pass through.
  const _generic    = _engGenericLabels(def.labels);
  const _fullLabels = _engResolveLabels(def);
  const labels      = revealMode   ? _fullLabels : _fullLabels.slice(0, cutIndex);
  const ohlc        = revealMode   ? def.ohlc    : def.ohlc.slice(0, cutIndex);
  const _timeAxis   = { data: labels, interval: _generic ? _engAxisInterval(labels.length) : 'auto' };
  // Optional per-candle colours (e.g. Course 4 "Crayons" paints trend state into
  // each candle). Sliced in lock-step with the OHLC so reveal mode stays aligned.
  const candleCols  = def.candleColors
    ? (revealMode ? def.candleColors : def.candleColors.slice(0, cutIndex))
    : null;
  const markLines   = (def.markLines  || []);
  const markAreas   = (def.markAreas  || []);
  const markPoints  = revealMode ? (def.revealMarkPoints || def.markPoints || [])
                                 : (def.markPoints       || []);

  // Keep every teaching LEVEL (markLine value / markArea edge) inside the price axis so a
  // "Stop Loss" / "Target" / S-R line never clips off-chart. Implemented as min/max
  // functions of the auto extent, so candlesticks AND overlays (Ichimoku cloud etc.) are
  // never squeezed — the axis only EXPANDS to admit a level that sits beyond the candles.
  const _lvls = [];
  markLines.forEach(m => { if (typeof m.yAxis === 'number') _lvls.push(m.yAxis); });
  markAreas.forEach(a => { if (typeof a.y0 === 'number') _lvls.push(a.y0); if (typeof a.y1 === 'number') _lvls.push(a.y1); });
  const _lvlLo = _lvls.length ? Math.min(..._lvls) : null;
  const _lvlHi = _lvls.length ? Math.max(..._lvls) : null;

  // Build ECharts markPoint data. Dense charts (5+ pins stacked on one side, e.g. the
  // confluence/E2E-prereq charts) get a compact label so the stacked ladder breathes
  // instead of crowding — keeps every callout (no info dropped), just tighter type.
  const _topPins = markPoints.filter(mp => mp.position !== 'bottom').length;
  const _botPins = markPoints.filter(mp => mp.position === 'bottom').length;
  const _densePins = Math.max(_topPins, _botPins) >= 5;
  const _mpFs   = _densePins ? (sm ? 7.5 : 8.5) : (sm ? 8.5 : 10);
  const _mpLh   = _densePins ? (sm ? 10 : 11.5) : (sm ? 11 : 14);
  const _mpPad  = _densePins ? [1, 4] : (sm ? [2, 4] : [3, 6]);
  // Semantic marker icons — a markPoint may set icon:'ok' | 'warn' to render a
  // green check / amber caution glyph (the lucide shape, as an SVG image symbol)
  // instead of the default pin/triangle. Used in place of ✅/⚠️ emoji in labels.
  const _icoOk   = 'image://data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#00c878"/><path d="M7.4 12.4l3 3 6.2-6.6" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  const _icoWarn = 'image://data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" fill="#ffcc00"/><path d="M12 10v3.6" fill="none" stroke="#0a0a0c" stroke-width="2.3" stroke-linecap="round"/><circle cx="12" cy="16.9" r="1.25" fill="#0a0a0c"/></svg>');
  const mpData = markPoints.map(mp => {
    const ohlcVal    = ohlc[mp.dataIndex];
    if (!ohlcVal) return null;
    const [o, c, lo, hi] = ohlcVal;
    const yVal   = mp.position === 'bottom' ? lo : hi;
    const _ico   = mp.icon === 'ok' ? _icoOk : mp.icon === 'warn' ? _icoWarn : null;
    return {
      name:  _shortLbl(mp.label),
      coord: [mp.dataIndex, yVal],
      value: _shortLbl(mp.label),
      label: {
        show:       true,
        formatter:  '{b}',
        color:      _legibleOnDark(mp.color || '#cbd5e1'),
        fontSize:   _mpFs,
        lineHeight: _mpLh,
        fontWeight: 700,
        fontFamily: 'Cascadia Code, JetBrains Mono, monospace',
        position:   mp.position === 'bottom' ? 'bottom' : 'top',
        distance:   sm ? 8 : (_densePins ? 11 : 14),
        backgroundColor: 'rgba(10,10,12,0.82)',
        padding:    _mpPad,
        borderRadius: 4
      },
      itemStyle: { color: mp.color || '#94a3b8' },
      symbol:    _ico || (mp.position === 'bottom' ? 'triangle' : 'pin'),
      symbolSize: _ico ? (sm ? [13,13] : [16,16])
                       : (mp.position === 'bottom' ? (sm ? [9,9] : [12,12]) : (sm ? [11,13] : [14,16])),
      symbolRotate: _ico ? 0 : (mp.position === 'bottom' ? 180 : 0)
    };
  }).filter(Boolean);

  // Build ECharts markLine data — price-tag style label at the right edge
  const mlData = markLines.map(ml => [{
    yAxis:  ml.yAxis,
    name:   ml.label,
    label:  {
      show:      true,
      formatter: _shortLbl(ml.label),
      color:     _pillText(ml.color || TEAL),
      fontSize:  sm ? 8.5 : 10,
      fontWeight: 700,
      fontFamily: 'Cascadia Code, JetBrains Mono, monospace',
      position:  'end',
      backgroundColor: ml.color || TEAL,
      padding:   sm ? [1, 4] : [2, 6],
      borderRadius: 4
    },
    lineStyle: { color: ml.color || TEAL, type: 'dashed', width: 1.5, opacity: 0.8 }
  }, { yAxis: ml.yAxis }]);

  // Decision divider + revealed-region shade. A cut chart has two states:
  //   • pre-answer  — frame the decision on-chart with a faint dashed line at the
  //                   right edge ("decide here; what's next is hidden").
  //   • revealed    — promote that line to a solid teal "Decision" divider and
  //                   softly shade everything to its right so "what happened next"
  //                   reads at a glance. The label sits horizontal (rotate:0) so it
  //                   stays legible instead of running vertically up the line.
  const _hasCut    = def.cutIndex != null && def.cutIndex < def.ohlc.length;
  const _dividerX  = (def.cutIndex || 0) - 0.5;
  const revealDivider = [];
  let   futureArea    = null;
  if (_hasCut && revealMode) {
    revealDivider.push([
      { xAxis: _dividerX,
        label: { show: true, formatter: 'Decision', rotate: 0, position: 'insideEndTop',
                 color: '#0b0b0e', fontSize: sm ? 8 : 9, fontWeight: 700, fontFamily: 'Cascadia Code, JetBrains Mono, monospace',
                 backgroundColor: TEAL, padding: sm ? [1, 4] : [2, 6], borderRadius: 4 },
        lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.9 } },
      { xAxis: _dividerX }
    ]);
    // Soft shade over everything right of the decision so "what happened next" reads
    // at a glance. Anchored from the divider (data x) to the grid's top/right/bottom
    // edges (percent coords) so it fully fills the corner — not just the data bounds.
    futureArea = [
      { xAxis: _dividerX, y: '0%', itemStyle: { color: 'rgba(148,163,184,0.06)' },
        label: { show: !sm, formatter: 'Revealed', position: 'insideTopRight', distance: 8,
                 color: 'rgba(203,213,225,0.5)', fontSize: 9, fontWeight: 700, fontFamily: 'Cascadia Code, JetBrains Mono, monospace' } },
      { x: '100%', y: '100%' }
    ];
  }

  // Build ECharts markArea data — soft zone with a small pill label
  const maData = markAreas.map(ma => [{
    yAxis:     ma.y0,
    label:     {
      show:      !sm,                 // hide the zone text on phones — the shaded band already reads as a zone
      formatter: ma.label,
      color:     '#cbd5e1',           // light text — the pill is always dark, so fixed (not themed) for contrast
      fontSize:  9.5,
      position:  'insideTopLeft',
      fontWeight: 700,
      backgroundColor: 'rgba(10,10,12,0.55)',
      padding:   [2, 6],
      borderRadius: 4
    },
    itemStyle: { color: ma.color || 'rgba(0,212,212,0.06)', borderWidth: 0 }
  }, { yAxis: ma.y1 }]);

  // When per-candle colours are present, emit object data items so each candle's
  // body AND border take its colour (shows regardless of bullish/bearish).
  const seriesData = candleCols
    ? ohlc.map((row, i) => {
        const col = candleCols[i];
        return col
          ? { value: row, itemStyle: { color: col, color0: col, borderColor: col, borderColor0: col } }
          : row;
      })
    : ohlc;

  // seriesName → value formatter, populated by the sub-panel helpers so the tooltip can
  // print the funding/CVD/volume/OI/basis/RSI value under the cursor with the right unit.
  const panelFmt = {};

  const _opt = {
    backgroundColor: C.BG3,
    animation: true,
    animationDuration: 600,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        lineStyle:  { color: 'rgba(148,163,184,0.35)', width: 1, type: 'dashed' },
        crossStyle: { color: 'rgba(148,163,184,0.35)', width: 1, type: 'dashed' },
        // Match the theme instead of ECharts' default white axis boxes.
        label: {
          backgroundColor: C.BG4,
          color:       C.TOOLTIP_TEXT,
          borderColor: C.BORDER,
          borderWidth: 1,
          fontFamily:  'Cascadia Code, JetBrains Mono, monospace',
          fontSize:    10,
          shadowBlur:  0
        }
      },
      backgroundColor: C.BG4,
      borderColor: C.BORDER,
      textStyle: { color: C.TOOLTIP_TEXT, fontSize: 11, fontFamily: 'Cascadia Code, JetBrains Mono, monospace' },
      formatter(params) {
        let html = '';
        const c = params.find(p => p.seriesName === 'Price');
        if (c) {
          // Data item is normally a plain [o,c,l,h] array (ECharts prepends the axis index
          // → length 5), or an object { value:[o,c,l,h], itemStyle } when per-candle colours
          // are set. Handle both.
          const arr = Array.isArray(c.data) ? c.data
                    : (Array.isArray(c.value) ? c.value
                    : (c.data && c.data.value) || []);
          if (arr.length) {
            const off = arr.length >= 5 ? 1 : 0;
            const o = arr[off], cl = arr[off + 1], lo = arr[off + 2], hi = arr[off + 3];
            const col = cl >= o ? TEAL : BEAR;
            html += `<div style="min-width:132px">
              <b style="color:${C.TOOLTIP_TEXT}">${_timeAxis.data[c.dataIndex] || labels[c.dataIndex] || c.dataIndex}</b><br/>
              O: ${o} &nbsp; C: <span style="color:${col};font-weight:700">${cl}</span><br/>
              H: ${hi} &nbsp; L: ${lo}
            </div>`;
          }
        }
        // Sub-panel / indicator values under the cursor (funding · CVD · volume · OI · basis ·
        // RSI · Tenkan/Kijun). Names this also makes the value explicit text, not colour-only
        // (the a11y win). Skip the candle series, ECharts internal cloud series (_-prefixed),
        // and the lagging Chikou (its value at the hovered x is displaced/misleading).
        const skip = { Price: 1, Chikou: 1 };
        const extra = params.filter(p => p.seriesName && !skip[p.seriesName] && p.seriesName.charAt(0) !== '_');
        if (extra.length) {
          let rows = '';
          extra.forEach(p => {
            let v = (typeof p.value === 'number') ? p.value
                  : (p.value && typeof p.value.value === 'number') ? p.value.value
                  : (p.data && typeof p.data.value === 'number') ? p.data.value
                  : (typeof p.data === 'number') ? p.data : null;
            if (v == null || isNaN(v)) return;
            const f = panelFmt[p.seriesName];
            const txt = f ? f(v) : (Math.abs(v) >= 100 ? Math.round(v) : (+v.toFixed(2)));
            rows += `<div style="display:flex;align-items:center;gap:7px;margin-top:3px;font-size:10.5px;">
              <span style="width:8px;height:8px;border-radius:2px;background:${p.color};display:inline-block;flex:none;"></span>
              <span style="color:${C.TEXT2}">${p.seriesName}</span>
              <span style="color:${C.TOOLTIP_TEXT};font-weight:700;margin-left:auto;">${txt}</span></div>`;
          });
          if (rows) html += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid ${C.BORDER};min-width:150px">${rows}</div>`;
        }
        return html;
      }
    },
    grid: {
      left:   sm ? 42 : 52,
      right:  sm ? 38 : 46,
      top:    markPoints.some(mp => mp.position !== 'bottom')  ? (sm ? 50 : 62) : (sm ? 18 : 26),
      bottom: markPoints.some(mp => mp.position === 'bottom') ? (sm ? 48 : 62) : (sm ? 26 : 36)
    },
    xAxis: {
      type: 'category',
      data: _timeAxis.data,
      boundaryGap: true,
      axisLine:  { lineStyle: { color: C.BORDER } },
      axisTick:  { show: false },
      axisLabel: { color: C.TEXT3, fontSize: sm ? 9 : 10, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', hideOverlap: true, interval: _timeAxis.interval },
      splitLine: { show: false }
    },
    yAxis: {
      scale:     true,
      // Expand (never shrink) to include any off-candle teaching level, then round the
      // bounds to a nice step so boundary ticks read clean (no "74.9905" / "139.19").
      min: (v) => { const base = (_lvlLo != null) ? Math.min(v.min, _lvlLo) : v.min; const step = _engNiceStep(v.max - v.min); const pad = ((v.max - v.min) || 1) * 0.03; return Math.floor((base - pad) / step) * step; },
      max: (v) => { const base = (_lvlHi != null) ? Math.max(v.max, _lvlHi) : v.max; const step = _engNiceStep(v.max - v.min); const pad = ((v.max - v.min) || 1) * 0.03; return Math.ceil((base + pad) / step) * step; },
      splitNumber: sm ? 4 : 5,
      splitLine: { lineStyle: { color: C.BORDER, type: 'dashed', opacity: 0.45 } },
      axisLine:  { show: false },
      axisTick:  { show: false },
      // Price axis is the key reference — keep it legible (brighter than the time axis)
      axisLabel: { color: C.TEXT2, fontSize: sm ? 9 : 10, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', formatter: (val) => _engRoundTick(val) }
    },
    series: [{
      name:  'Price',
      type:  'candlestick',
      data:  seriesData,
      barMaxWidth: 20,
      // Hollow-up / filled-down — the universal pro convention. A bullish candle
      // (close ≥ open) uses color+borderColor → transparent body, teal outline;
      // a bearish candle uses color0+borderColor0 → solid fill. Keeps the down
      // moves from overpowering the up moves (a solid near-white body on black
      // was the loudest thing on the chart). Per-candle candleColors objects
      // (Course-4 indicators) override this and stay solid.
      itemStyle: {
        color:        'transparent',
        color0:       BEAR,
        borderColor:  TEAL,
        borderColor0: BEAR,
        borderWidth:  1.5
      },
      // Candles "print" left-to-right like a live tape instead of all growing
      // from the baseline at once.
      animationDelay: idx => idx * 16,
      markPoint: {
        symbol: 'pin',
        symbolSize: 16,
        label: { fontFamily: 'Cascadia Code, JetBrains Mono, monospace' },
        data: mpData
      },
      markLine: {
        symbol: ['none','none'],
        silent: true,
        data:   mlData.concat(revealDivider)
      },
      markArea: {
        silent: true,
        data:   futureArea ? maData.concat([futureArea]) : maData
      }
    }]
  };
  _opt._panelFmt = panelFmt;   // sub-panel helpers register value formatters here for the tooltip
  if (def.indicator) _applyIndicatorOverlay(_opt, def, { ohlc, labels });
  // Hyblock-style tool visualizations (drawn, not just labelled)
  if (def.liqCluster) _applyLiqCluster(_opt, def);
  if (def.heatmap) _applyHeatmap(_opt, def);
  if (def.orderBook) _applyOrderBook(_opt, def);
  if (def.tradingActivity) _applyActivityPanel(_opt, def, { ohlc });
  if (def.subPanel) _applySubPanel(_opt, def, { ohlc });
  if (def.subPanels) _applyMultiSubPanels(_opt, def, { ohlc });
  if (def.volume && def.indicator !== 'volume') _applyVolumePanel(_opt, def, { ohlc });
  return _opt;
}

function buildLineOption(def) {
  const C = chartColors();
  const _smLine = (typeof window !== 'undefined' && window.innerWidth <= 768);
  const { labels, values, series2Label, series2Values, markLines } = def;

  const mlData = (markLines || []).map(ml => [{
    yAxis:     ml.yAxis,
    label:     { show: true, formatter: ml.label, color: ml.color || TEAL, fontSize: 10, fontWeight: 600, position: 'end' },
    lineStyle: { color: ml.color || TEAL, type: 'dashed', width: 1.5, opacity: 0.6 }
  }, { yAxis: ml.yAxis }]);

  const series = [{
    name:  def.series1Label || 'Equity',
    type:  'line',
    data:  values,
    smooth: def.smooth !== false,
    symbol: 'none',
    lineStyle:  { color: TEAL, width: 2.5 },
    areaStyle:  { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        { offset: 0,   color: 'rgba(0,212,212,0.18)' },
        { offset: 1,   color: 'rgba(0,212,212,0.01)' }
      ]}},
    markLine: { symbol: ['none','none'], silent: true, data: mlData }
  }];

  if (series2Values && series2Label) {
    series.push({
      name:  series2Label,
      type:  'line',
      data:  series2Values,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: BEAR, width: 2, type: 'dashed' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(' + VIZ.bearRgb + ',0.10)' },
          { offset: 1, color: 'rgba(' + VIZ.bearRgb + ',0.01)' }
        ]}},
    });
  }

  const hasLegend = !!(series2Values && series2Label);

  return {
    backgroundColor: C.BG3,
    animation: true,
    animationDuration: 700,
    legend: hasLegend ? {
      data: [def.series1Label || 'Equity', series2Label],
      textStyle: { color: C.TEXT2, fontSize: 11, fontFamily: 'Cascadia Code, JetBrains Mono, monospace' },
      top: 4
    } : undefined,
    tooltip: {
      trigger: 'axis',
      backgroundColor: C.BG4,
      borderColor: C.BORDER,
      textStyle: { color: C.TOOLTIP_TEXT, fontSize: 11, fontFamily: 'Cascadia Code, JetBrains Mono, monospace' }
    },
    grid: { left: _smLine ? 46 : 58, right: _smLine ? 18 : 28, top: hasLegend ? 36 : 24, bottom: 36 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine:  { lineStyle: { color: C.BORDER } },
      axisLabel: { color: C.TEXT3, fontSize: _smLine ? 9 : 10, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', hideOverlap: true },
      splitLine: { show: false }
    },
    yAxis: {
      scale:     true,
      splitNumber: _smLine ? 4 : 5,
      splitLine: { lineStyle: { color: C.BORDER, type: 'dashed' } },
      axisLine:  { lineStyle: { color: C.BORDER } },
      axisLabel: { color: C.TEXT2, fontSize: _smLine ? 9 : 10, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', formatter: (v) => (def.yPrefix || '') + _engRoundTick(v) + (def.ySuffix || '') }
    },
    series
  };
}

/* Keep markPoint callout labels from piling on top of each other. ECharts has no
   real collision-avoidance for markPoint labels, so we run our own pixel-based pass
   (the same idea as the v2 canvas renderer): measure each label, and within its side
   (above / below the candles) push overlapping ones further out until they clear,
   applied via each label's pixel `offset`. Recomputed from the nominal position each
   call, so it's safe to re-run on resize / after the reveal animation. */
function _deconflictMarkLabels(elId) {
  const inst = charts[elId];
  if (!inst) return;
  let opt;
  try { opt = inst.getOption(); } catch (e) { return; }
  const s0 = opt && opt.series && opt.series[0];
  if (!s0 || !s0.markPoint || !s0.markPoint.data || !s0.markPoint.data.length) return;
  const data = s0.markPoint.data;
  const meas = document.createElement('canvas').getContext('2d');
  // measure with the labels' actual font size (compact on dense charts) so the stack packs
  // as tight as it renders — otherwise dense ladders over-space and still look crowded
  const fs = (data[0] && data[0].label && data[0].label.fontSize) || 10;
  meas.font = '700 ' + fs + 'px "Cascadia Code", "JetBrains Mono", monospace';
  const GAP = 4;
  const boxes = data.map(m => {
    if (!m || !m.coord) return null;
    const px = inst.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, m.coord);
    if (!px || !isFinite(px[0]) || !isFinite(px[1])) return null;
    const pos = (m.label && m.label.position) || 'top';
    const below = /bottom/i.test(pos);
    const text = String(m.value || (m.label && m.label.formatter) || '');
    const w = meas.measureText(text).width + 14;
    const h = Math.round(fs * 1.9);
    const dist = (m.label && m.label.distance) || 14;
    const baseY = below ? px[1] + dist + h / 2 : px[1] - dist - h / 2;
    return { m, x: px[0], baseY, y: baseY, w, h, below };
  }).filter(Boolean);
  if (!boxes.length) return;
  ['top', 'bottom'].forEach(side => {
    const below = side === 'bottom';
    const items = boxes.filter(b => b.below === below);
    items.sort((a, b) => below ? a.y - b.y : b.y - a.y);   // nearest the candles first
    const placed = [];
    items.forEach(b => {
      for (let guard = 0; guard < 60; guard++) {
        let hit = null;
        for (let k = 0; k < placed.length; k++) {
          const p = placed[k];
          if (Math.abs(b.x - p.x) < (b.w + p.w) / 2 - 2 && Math.abs(b.y - p.y) < (b.h + p.h) / 2 + GAP) { hit = p; break; }
        }
        if (!hit) break;
        b.y += (below ? 1 : -1) * ((b.h + hit.h) / 2 + GAP - Math.abs(b.y - hit.y));
      }
      placed.push(b);
    });
  });
  let moved = false;
  boxes.forEach(b => {
    const dy = Math.round(b.y - b.baseY);
    b.m.label = b.m.label || {};
    const cur = (b.m.label.offset && b.m.label.offset[1]) || 0;
    if (dy !== cur) { b.m.label.offset = [0, dy]; moved = true; }
  });
  if (moved) inst.setOption({ series: [{ markPoint: { data } }] }, { notMerge: false });
}

function renderChart(elId, def, revealMode) {
  disposeChart(elId);
  const el = document.getElementById(elId);
  if (!el) return;
  const instance = echarts.init(el, null, { renderer: 'canvas' });
  charts[elId] = instance;

  if (def.type === 'line') {
    instance.setOption(buildLineOption(def));
  } else {
    instance.setOption(buildCandlestickOption(def, !!revealMode));
    // de-overlap the callout labels once the chart has laid out (and on resize)
    setTimeout(() => _deconflictMarkLabels(elId), 80);
  }

  // Handle resize
  const ro = new ResizeObserver(() => { instance.resize(); if (def.type !== 'line') setTimeout(() => _deconflictMarkLabels(elId), 60); });
  ro.observe(el);
  instance.__ro = ro;   // tracked so disposeChart can disconnect it (was leaking one RO per re-render)
  return instance;
}

function revealChart(elId, def) {
  if (charts[elId] && def.type !== 'line') {
    // Attach reveal mark points and show all candles
    const fullOption = buildCandlestickOption(def, true);
    charts[elId].setOption(fullOption, { notMerge: false });
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   TEACHING CHART RENDERER
   Charts with cutIndex: solid setup candles + animated wireframe outcome candles.
   Charts without cutIndex: rendered solid as normal.
   ══════════════════════════════════════════════════════════════════════════ */
function renderTeachingChart(elId, def) {
  // No before/after structure — render solid as normal
  if (def.type === 'line' || def.cutIndex == null) {
    renderChart(elId, def, true);
    return;
  }

  const _full         = _engResolveLabels(def);   // real calendar labels (or def.labels) — full set
  const setupOhlc     = def.ohlc.slice(0, def.cutIndex);
  const setupLabels   = _full.slice(0, def.cutIndex);
  const outcomeOhlc   = def.ohlc.slice(def.cutIndex);
  const outcomeLabels = _full.slice(def.cutIndex);

  // Render setup candles immediately with solid fill
  renderChart(elId, { ...def, ohlc: setupOhlc, labels: setupLabels, cutIndex: null }, true);

  if (outcomeOhlc.length === 0) return;

  const chartInst  = charts[elId];
  const decisionIdx = setupOhlc.length - 1;
  let count = 0;
  const total = outcomeOhlc.length;

  // Pre-build horizontal markLine data from def
  const mlData = (def.markLines || []).map(ml => [{
    yAxis:     ml.yAxis,
    label:     { show: true, formatter: ml.label, color: _pillText(ml.color || TEAL), fontSize: 10, fontWeight: 700, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', position: 'end', backgroundColor: ml.color || TEAL, padding: [2, 6], borderRadius: 4 },
    lineStyle: { color: ml.color || TEAL, type: 'dashed', width: 1.5, opacity: 0.8 }
  }, { yAxis: ml.yAxis }]);

  // Get or create the replay button below the chart card
  function getTeachReplayBtn() {
    const card = document.getElementById(elId)?.closest('.chart-card');
    if (!card) return null;
    let btn = card.querySelector('.chart-replay-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'chart-replay-btn';
      btn.innerHTML = '<i data-lucide="rotate-ccw"></i> Replay';
      btn.style.display = 'none';
      card.appendChild(btn);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    return btn;
  }

  function runTeachAnimation() {
    const replayBtn = getTeachReplayBtn();
    if (replayBtn) replayBtn.style.display = 'none';

    // Lock both axes to the FULL reveal up front (full x labels + fixed y-range) so
    // the outcome candles slide into fixed slots instead of the chart rescaling on
    // every tick — that per-tick rescale was the choppiness.
    let _lo = Infinity, _hi = -Infinity;
    def.ohlc.forEach(c => { if (c[2] < _lo) _lo = c[2]; if (c[3] > _hi) _hi = c[3]; });
    const _pad = Math.max(0.5, (_hi - _lo) * 0.08);
    const teachDivider = [
      [
        { xAxis: decisionIdx, label: { show: true, formatter: 'Decision', color: '#0b0b0e', fontSize: 10, fontWeight: 700, fontFamily: 'Cascadia Code, JetBrains Mono, monospace', position: 'insideEndTop', backgroundColor: TEAL, padding: [2, 6], borderRadius: 4 }, lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.85 } },
        { xAxis: decisionIdx }
      ],
      ...mlData
    ];

    const instReset = charts[elId];
    if (instReset) {
      instReset.setOption({
        animationDurationUpdate: _REVEAL_MS,
        animationEasingUpdate: 'cubicOut',
        xAxis:  { data: _full },
        yAxis:  { min: +(_lo - _pad).toFixed(2), max: +(_hi + _pad).toFixed(2) },
        series: [{ data: setupOhlc, animationDuration: _REVEAL_MS, animationDelay: 0,
                   markLine: { symbol: ['none', 'none'], silent: true, data: teachDivider } }]
      }, { notMerge: false });
    }

    let count = 0;
    const total = outcomeOhlc.length;

    // Respect prefers-reduced-motion: skip the candle-by-candle stepping and render the
    // fully-revealed outcome in one shot (CSS can't stop a setInterval-driven reveal).
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const fullOutcome = outcomeOhlc.map((c, j) => {
        const col = def.candleColors && def.candleColors[def.cutIndex + j];
        return col ? { value: c, itemStyle: { color: col, color0: col, borderColor: col, borderColor0: col } } : c;
      });
      const instAll = charts[elId];
      if (instAll) instAll.setOption({ series: [{ data: [...setupOhlc, ...fullOutcome], animationDuration: 0, animationDelay: 0 }] }, { notMerge: false });
      const btn = getTeachReplayBtn();
      if (btn) { btn.style.display = 'flex'; btn.onclick = runTeachAnimation; }
      setTimeout(() => _deconflictMarkLabels(elId), 80);
      return;
    }

    /* Silk print — same rAF eased timeline as the quiz reveal: deliberate start,
       flowing middle, decelerated landing; 260ms per-candle grow-ins overlap the
       mid-sequence gaps so the print reads as one continuous motion. */
    const T = Math.max(1300, Math.min(2600, total * 130));
    const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / T);
      const n = Math.max(count, Math.round(easeInOut(p) * total));
      if (n > count) {
        count = n;
        // Outcome candles inherit the standard hollow-up / filled-down style; Course-4
        // indicator charts keep their per-candle colours through the reveal.
        const outcomeData = outcomeOhlc.slice(0, count).map((c, j) => {
          const col = def.candleColors && def.candleColors[def.cutIndex + j];
          return col
            ? { value: c, itemStyle: { color: col, color0: col, borderColor: col, borderColor0: col } }
            : c;
        });
        const instTick = charts[elId];
        if (instTick) {
          instTick.setOption({ series: [{ data: [...setupOhlc, ...outcomeData], animationDuration: 260, animationEasing: 'cubicOut', animationDelay: 0 }] }, { notMerge: false });
        }
      }
      if (p < 1) { requestAnimationFrame(step); return; }
      setTimeout(() => {
        const btn = getTeachReplayBtn();
        if (btn) {
          btn.style.display = 'flex';
          btn.onclick = runTeachAnimation;
        }
        _deconflictMarkLabels(elId);   // de-overlap callouts once revealed
      }, 160);
    };
    requestAnimationFrame(step);
  }

  runTeachAnimation();
}

/* ══════════════════════════════════════════════════════════════════════════
   HTML BUILDERS
   ══════════════════════════════════════════════════════════════════════════ */
/* ── colour-name highlighting (lesson TEXT only, never chart labels) ───────────
   Renders colour words in the matching hue so "green hues" / "red bars" / "lime"
   read in the colour they describe on the chart. Operates only on text BETWEEN
   tags (never inside an HTML tag/attribute), so existing <strong> markup is safe.
   Applied to prose cards (intro/lesson body + bullets, concept, quiz explanation);
   chart cards/annotations are intentionally left untouched. */
const LT_COLOR_TERMS = {
  'lime green': 'lime', 'light blue': 'blue', 'lime': 'lime', 'turquoise': 'turquoise',
  'teal': 'turquoise', 'cyan': 'turquoise', 'red': 'red', 'green': 'green',
  'yellow': 'yellow', 'orange': 'orange', 'blue': 'blue', 'purple': 'purple',
  'pink': 'pink', 'white': 'white'
};
// longest phrases first so "lime green" / "light blue" win over the bare colour
const LT_COLOR_RE = /\b(lime green|light blue|lime|turquoise|teal|cyan|red|green|yellow|orange|blue|purple|pink|white)\b/gi;
function ltClr(s) {
  if (s == null) return s;
  return String(s).replace(/(<[^>]+>)|([^<]+)/g, (m, tag, text) =>
    tag ? tag : text.replace(LT_COLOR_RE, w => `<span class="lt-clr-${LT_COLOR_TERMS[w.toLowerCase()]}">${w}</span>`));
}

function bulletsHtml(bullets) {
  return `<ul class="lesson-bullets">
    ${bullets.map(b => `<li>${ltClr(b)}</li>`).join('')}
  </ul>`;
}

function chartCardHtml(id, title, badge, tall, chartHeight, videoUrl) {
  const hStyle = chartHeight ? `height:${chartHeight}px;` : '';
  const hData  = chartHeight ? `data-configured-height="${chartHeight}"` : '';
  // No embedded YouTube: the chart card shows candles; the source video (if any) is reachable
  // via a plain "Watch original ↗" link (new tab), not an in-app iframe.
  const headerControls = badge ? `<span class="chart-card-badge">${badge}</span>` : '';
  return `
    <div class="chart-card chart-card--center">
      <div class="chart-card-header">
        <span class="chart-card-title">${title}</span>
        <div class="chart-card-header-right">
          ${headerControls}
          <button class="chart-expand-btn" id="expand-${id}" onclick="toggleChartExpand('${id}')" title="Expand chart" aria-label="Expand chart"><i data-lucide="maximize-2" style="width:14px;height:14px;"></i></button>
        </div>
      </div>
      <div id="${id}" class="chart-el${tall ? ' chart-el--tall' : ''}" style="${hStyle}" ${hData}></div>
      ${videoUrl ? _watchOriginalHtml(videoUrl) : ''}
    </div>`;
}

/* (chart colour-key feature removed 2026-07-01 — the key button was dropped from
   chartCardHtml earlier; the orphaned legend builders + toggle lived on here.) */

/* ══════════════════════════════════════════════════════════════════════════
   STEP RENDERERS
   ══════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════
   MODULE THEMING — gives each module its own accent colour, icon and tagline so
   sections feel distinct (without changing the underlying layout).
   ══════════════════════════════════════════════════════════════════════════ */
const LT_MODULE_THEME = {
  'Course Overview':                  { color:'#00d4d4', icon:'book-open',         tag:'Orientation & roadmap' },
  'Price Action Foundations':         { color:'#00d4d4', icon:'candlestick-chart', tag:'The building blocks of price' },
  'Identifying Trends':               { color:'#2bd47d', icon:'trending-up',       tag:'Reading directional bias' },
  'Market Structure':                 { color:'#4a9eff', icon:'waypoints',         tag:'The skeleton of price' },
  'Time Frame Analysis':              { color:'#7c83ff', icon:'clock',             tag:'Top-down context' },
  'Risk Management':                  { color:'#e0b020', icon:'shield',            tag:'Protect the downside' },
  'Course Summary':                   { color:'#00c878', icon:'flag',              tag:'Tying it together' },
  'Price Action Concepts':            { color:'#00d4d4', icon:'candlestick-chart', tag:'Reading raw price' },
  'Trading Tools':                    { color:'#a855f7', icon:'wrench',            tag:'Your analysis kit' },
  'Indicator Suite':                  { color:'#a855f7', icon:'gauge',             tag:'Momentum & confirmation' },
  'Ichimoku Masterclass':             { color:'#ff7a45', icon:'cloud',             tag:'Equilibrium at a glance' },
  'Getting Started with Derivatives': { color:'#4a9eff', icon:'rocket',            tag:'Perps & the order book' },
  'Financial Instruments':            { color:'#4a9eff', icon:'landmark',          tag:'What you can trade' },
  'Understanding Leverage':           { color:'#e0b020', icon:'scale',             tag:'Power, used carefully' },
  'Applying the Basics':              { color:'#00d4d4', icon:'check-circle',      tag:'Putting it to work' },
  'Crafting Your System':             { color:'#2bd47d', icon:'settings',          tag:'Build your edge' },
  'Defining a Trade Setup':           { color:'#00d4d4', icon:'target',            tag:'Anatomy of a trade' },
  'Choosing Your Trading Style':      { color:'#7c83ff', icon:'compass',           tag:'Find your fit' },
  'Unlocking Your Potential':         { color:'#e0b020', icon:'key',               tag:'Level up' },
  'Identifying Liquidity':            { color:'#ff5c8a', icon:'droplets',          tag:'Where the orders hide' },
  'Determining Control':              { color:'#f87171', icon:'crosshair',         tag:'Who is in charge?' },
  'Applying Sentiment':               { color:'#ec4899', icon:'activity',          tag:'Crowd psychology' }
};
const LT_MODULE_DEFAULT = { color:'#00d4d4', icon:'book-open', tag:'' };
function moduleTheme(name) { return LT_MODULE_THEME[name] || LT_MODULE_DEFAULT; }

function moduleBannerHtml(chapter) {
  const name = chapter.module;
  if (!name) return '';
  const t = moduleTheme(name);
  return `<div class="module-banner">
      <span class="module-banner-icon"><i data-lucide="${t.icon}" style="width:17px;height:17px;"></i></span>
      <div class="module-banner-text">
        <div class="module-banner-name">${name}</div>
        ${t.tag ? `<div class="module-banner-tag">${t.tag}</div>` : ''}
      </div>
    </div>`;
}

/* Roadmap panel — shown on course overview / recap pages instead of a chart.
   Reflects the course's actual context (its modules / the journey), not a
   decorative candlestick chart. Driven by `chapter.roadmap`. */
function roadmapCardHtml(rm) {
  const stops = (rm.stops || []).map((s, i) => `
        <li class="roadmap-stop">
          <span class="roadmap-node">${i + 1}</span>
          <div class="roadmap-stop-main">
            <div class="roadmap-stop-label">${s.label}</div>
            ${s.desc ? `<div class="roadmap-stop-desc">${s.desc}</div>` : ''}
          </div>
        </li>`).join('');
  return `
      <div class="roadmap-card">
        <div class="roadmap-head">
          <span class="roadmap-head-ic"><i data-lucide="${rm.icon || 'route'}" style="width:18px;height:18px;"></i></span>
          <div class="roadmap-head-text">
            <div class="roadmap-title">${rm.title || 'Course Roadmap'}</div>
            ${rm.sub ? `<div class="roadmap-sub">${rm.sub}</div>` : ''}
          </div>
        </div>
        <ol class="roadmap-path">${stops}</ol>
      </div>`;
}

/* ── ADAPTIVE CHAPTER TEMPLATE ─────────────────────────────────────────────
   A chart def carries a `format` that decides how its visual slot renders:
     'chart'  (default / absent) → candlestick or line (the existing path)
     'concept'                   → conceptCardHtml below (diagram + checklist)
     'tool'                      → reserved for an annotated UI-mock (not yet wired)
   This lets a non-price-action topic (mindset, workflow, an exchange screen) stop
   shoehorning fake OHLC "price" onto an abstract idea. A slot renders an ECharts
   chart iff isChartSlot(def) — used to gate renderTeachingChart in the step renderers. */
function isChartSlot(def) {
  return !!def && (!def.format || def.format === 'chart');
}

/* Concept visual — for chapters whose subject isn't price (objectivity, process,
   discipline). Renders an honest diagram instead of inventing candles: an optional
   ordered flow (set `cycle:true` when the steps loop back on themselves) plus an
   optional checklist of takeaways and a footnote.
   Driven by a chart def with `format:'concept'`. */
function conceptCardHtml(bodyId, def, videoUrl) {
  const steps = (def.steps || []).map((s, i) => `
        <li class="concept-step">
          <span class="concept-node">${s.icon ? `<i data-lucide="${s.icon}" style="width:14px;height:14px;"></i>` : (i + 1)}</span>
          <div class="concept-step-main">
            <div class="concept-step-label">${ltClr(s.label)}</div>
            ${s.desc ? `<div class="concept-step-desc">${ltClr(s.desc)}</div>` : ''}
          </div>
        </li>`).join('');
  const flow = (def.steps && def.steps.length)
    ? `<ol class="concept-flow${def.cycle ? ' concept-flow--cycle' : ''}">${steps}</ol>`
      + (def.cycle ? `<div class="concept-cycle-note"><i data-lucide="rotate-ccw" style="width:13px;height:13px;"></i><span>${def.cycleLabel || 'Repeat — the loop itself is the practice'}</span></div>` : '')
    : '';
  const checklist = (def.checklist && def.checklist.length)
    ? `<ul class="concept-check">${def.checklist.map(c => {
        const t = (typeof c === 'string') ? c : c.text;
        return `<li><i data-lucide="check" style="width:14px;height:14px;"></i><span>${ltClr(t)}</span></li>`;
      }).join('')}</ul>`
    : '';
  const note = def.note ? `<p class="concept-note">${ltClr(def.note)}</p>` : '';

  return `
    <div class="chart-card chart-card--center">
      <div class="chart-card-header">
        <span class="chart-card-title">${def.title}</span>
        <div class="chart-card-header-right"><span class="chart-card-badge">Concept</span></div>
      </div>
      <div id="${bodyId}" class="concept-card">
        ${flow}
        ${checklist}
        ${note}
      </div>
      ${videoUrl ? _watchOriginalHtml(videoUrl) : ''}
    </div>`;
}

/* Positioning note at the very start of Course 4 — it's an advanced, optional
   framework (not the expected next step) that leans on specialized tooling. */
function _course4NoteHtml() {
  if (getActiveCourseNum() !== 4 || state.chapter !== 0) return '';
  return `
    <div class="course-note" role="note">
      <div class="course-note-ic"><i data-lucide="info" style="width:18px;height:18px;"></i></div>
      <div class="course-note-body">
        <strong>Course 4 is an advanced, optional deep-dive.</strong> Liquidity Theory is our own opinionated framework that
        builds on the fundamentals from Courses 1–3 — you don't need it to become a capable trader. It also leans on some
        specialized charting tools to illustrate the ideas; focus on the underlying concepts, which matter far more than any one tool.
      </div>
    </div>`;
}

/* Honest risk gate shown at the top of leverage/derivatives lessons (Course 3+),
   where real-money danger first appears. Matched by module name so it's automatic. */
function _riskCalloutHtml(chapter) {
  const m = (chapter && chapter.module) || '';
  if (!/derivative|leverage/i.test(m)) return '';
  return `
    <div class="risk-callout" role="note">
      <div class="risk-callout-ic"><i data-lucide="alert-triangle" style="width:18px;height:18px;"></i></div>
      <div class="risk-callout-body">
        <strong>Real money, real risk.</strong> Leverage and derivatives can wipe out your entire
        position in minutes, and <strong>most beginners lose money</strong>. Only ever risk what you can
        afford to lose, practice on a testnet first, and treat everything here as education — not financial advice.
      </div>
    </div>`;
}

/* Proprietary-tool disclaimer for Course 4's Indicator Suite (Module 3) and the
   Hyblock-based Applying Sentiment lessons (Module 4). These teach premium / custom
   indicators the average retail trader can't access, so we say so plainly and steer
   focus to the underlying market behaviour. Matched by module name (like the risk
   callout) so it's automatic on every session in those modules. */
function _indicatorDisclaimerHtml(chapter) {
  if (getActiveCourseNum() !== 4) return '';
  const m = (chapter && chapter.module) || '';
  if (!/indicator suite|applying sentiment/i.test(m)) return '';
  return `
    <div class="indicator-note" role="note">
      <div class="indicator-note-ic"><i data-lucide="lock" style="width:18px;height:18px;"></i></div>
      <div class="indicator-note-body">
        <strong>Proprietary tool — most traders won't have this.</strong> The indicator in this session is a
        premium / custom tool that isn't available on standard charting platforms. Focus on <strong>what it
        measures</strong> — the underlying market behaviour — so you can spot the same signal with the tools
        you already have.
      </div>
    </div>`;
}

/* A chart is "cluttered" when several long annotation labels overlap at the
   cramped half-width — those default to expanded (full-width, taller) so the
   learner can actually read them. */
function _isChartCluttered(def) {
  if (!def) return false;
  const anns = [].concat(def.markPoints || [], def.revealMarkPoints || [], def.markLines || [], def.markAreas || []);
  if (!anns.length) return false;
  const chars = anns.reduce((n, a) => n + (a && a.label ? String(a.label).length : 0), 0);
  const longLabels = anns.filter(a => a && a.label && String(a.label).length >= 12).length;
  return longLabels >= 4 || chars >= 120;
}
function _autoExpandIfCluttered(id, def) {
  if (!_isChartCluttered(def) || typeof toggleChartExpand !== 'function') return;
  const card = document.getElementById(id) && document.getElementById(id).closest('.chart-card');
  if (card && card.dataset.expanded !== '1') toggleChartExpand(id);
}

/* ── YouTube "watch original" link helpers (the only survivors of the removed v1
   reconstruction-player layer; used by the v2 lesson step's courtesy link). ───── */
function _youtubeWatchUrl(videoUrl) {
  const id = (videoUrl || '').split('embed/')[1] || '';
  return id ? ('https://www.youtube.com/watch?v=' + id) : (videoUrl || '#');
}
function _watchOriginalHtml(videoUrl) {
  return `<a class="recon-watch-original" href="${_youtubeWatchUrl(videoUrl)}" target="_blank" rel="noopener">Watch original on YouTube ↗</a>`;
}

/* ── V2 ANIMATED-LESSONS LAYER (lessons-v2/) ─────────────────────────────────
   The v2 system — window.LTRenderer (dependency-free Canvas) + window.LT_LESSONS
   (one editable data file per lesson) — is the DEFAULT lesson renderer, in place
   of the recon player. Each live chapter maps to a v2 lesson by its video_id;
   the handful of video-less chapters (course intros / recaps) map by course +
   chapter index. The mapping is validated 1:1 against the live chapters — only
   Course 2's "Divergences" (no v2 counterpart) falls through to the written
   lesson. v2 lesson files lazy-load per course from window.LT_V2_FILES (manifest.js).
   The recon player stays in code as a fallback (see renderV2Lesson). */
const LT_V2_BY_VIDEO = {
  // Course 1
  "hbq6pvauixs": "course1/02_understanding_price_action",  // Understanding Price Action
  "lx-ktgqxhis": "course1/03_components_of_a_market",  // Components of a Market
  "jukafxo9a4q": "course1/04_support_and_resistance",  // Support and Resistance
  "flm29arlzsi": "course1/05_trending_markets",  // Trending Markets
  "nr3a5reunry": "course1/06_rangebound_markets",  // Range-Bound Markets
  "1ofakpsl8yi": "course1/07_what_is_market_structure",  // What Is Market Structure?
  "bz5no9p9nge": "course1/08_identifying_market_structure",  // Identifying Market Structure
  "ea3upvs-csg": "course1/09_timeframes",  // Timeframes
  "td3i7rv130e": "course1/10_htf_scenario",  // HTF Scenario Analysis
  "jumnsxywtt4": "course1/11_ltf_scenario",  // LTF Entry Scenario
  "g7eekewqqi4": "course1/12_risk_management",  // Risk Management
  "enfuyftq53e": "course1/13_achieving_profitability",  // Achieving Profitability
  "wwlyeqpy9ve": "course1/14_optimizing_returns",  // Optimizing Returns
  // Course 2
  "cvgegaehl1i": "course2/01_trading_styles",  // Trading Styles
  "qquynbupnju": "course2/03_types_of_trades",  // Types of Trades — Live Examples
  "3xhrlmrh1p4": "course2/04_entering_trades",  // Entering Trades — The LTE Methodology
  "hoxfz4av21e": "course2/05_exiting_trades",  // Exiting Trades
  "v5gja0gtb0c": "course2/06_price_action_formations",  // Price Action Formations
  "c9mmkb8fa2s": "course2/07_price_action_examples",  // Price Action Examples
  "_e_idqs3fc0": "course2/08_volume_analysis",  // Volume Analysis
  "65vtonegdka": "course2/09_volume_examples",  // Volume Examples
  "j1abq0tlg2o": "course2/10_classical_chart_patterns",  // Classical Chart Patterns
  "xakbic8pnrc": "course2/11_classical_pattern_examples",  // Classical Pattern Examples
  "rzjykrjoqt0": "course2/12_fibonacci",  // Fibonacci
  "dwsbausxys4": "course2/13_ichimoku_kinko_hyo",  // Ichimoku Kinko Hyo
  "9vwugwb9bic": "course2/14_ichimoku_market_scenario",  // Ichimoku Market Scenario
  "a7tyhq9k_6a": "course2/15_oscillators",  // Oscillators
  "3q-zoy2utdq": "course2/16_financial_instruments",  // Financial Instruments
  // Course 3
  "ejur_mprewg": "course3/02_order_types",  // Order Types
  "bcqgbirmmro": "course3/03_deposit_and_withdraw",  // Deposit and Withdraw
  "9-4wmh2sv6q": "course3/04_understanding_the_orderbook",  // Understanding the Order Book
  "mdbfwpg_j0s": "course3/05_getting_into_positions",  // Getting Into Positions
  "8l1gojzjy9m": "course3/06_executing_orders",  // Executing Orders
  "glulks1za8k": "course3/07_understanding_contracts",  // Understanding Contracts
  "_oyzcobnios": "course3/08_understanding_leverage",  // Understanding Leverage
  "fau31batlnm": "course3/09_applying_leverage",  // Applying Leverage — ETH Swing Trade Example
  "osmzwyazgfs": "course3/10_margin_management",  // Margin Management
  "vmsqy_jdxr4": "course3/11_identifying_access_points",  // Identifying Access Points — Understanding Consolidation
  "1ldysykzfpo": "course3/12_trading_sr",  // Trading S/R — DBS/SSR Strategies
  "rkb5lzmwgak": "course3/13_trading_ranges",  // Trading Ranges
  "pzrnkcfs6s0": "course3/14_range_market_scenario",  // Range Market Scenario — Live Walkthrough
  "hzc0wuzl_ls": "course3/15_crafting_your_system",  // Crafting Your System
  "s1rbm13etf0": "course3/16_applying_your_system",  // Applying Your System — The Trading Plan
  "2b4s94zhi-0": "course3/17_recording_your_system",  // Recording Your System — The Trading Journal
  "oaj3-5tfdbg": "course3/18_developing_a_traders_mindset",  // Developing a Trader's Mindset
  "ts3f-hxelpe": "course3/19_the_art_of_meditation",  // The Art of Meditation
  "jzjgzu2mjfe": "course3/20_the_reality_behind_trading_fulltime",  // The Reality Behind Trading Full-Time
  // Course 4
  "vurfjwxz43w": "course4/02_liquidity_theory",  // The Four Principles of Liquidity Theory
  "hxkdu-zfmpa": "course4/03_identifying_liquidity",  // Identifying Liquidity
  "l5apwzw8f28": "course4/04_liquidity_structures",  // Liquidity Structures
  "7w2zq779mo4": "course4/05_liquidity_scenarios",  // Liquidity Scenarios — Live Examples
  "gml6s3mb1lk": "course4/06_who_is_in_control_primer",  // Who Is in Control Primer
  "2nxuyb2e8kg": "course4/07_sentiment_analysis_variables",  // Sentiment Analysis Variables
  "k1ojybsyotk": "course4/08_funding_rate",  // Funding Rate
  "l0zyzzbqtey": "course4/09_open_interest",  // Open Interest
  "7nvins23xay": "course4/10_cumulative_delta",  // Cumulative Delta
  "y6-vwgeitv0": "course4/11_future_basis",  // Futures Basis
  "jpty5yuvfqa": "course4/12_applying_sentiment",  // Applying Sentiment — Summary
  "ke6i9iuyave": "course4/13_trend_buddy",  // Trend Buddy
  "zlaxsnpffyq": "course4/14_pal",  // PAL Tool — Price Action Levels
  "nuwgoxyvwvc": "course4/15_heuristics",  // Heuristics
  "ioxmip6tjsq": "course4/16_fsvzo",  // FSVZO — Volume Zone Oscillator
  "nwzr1qanls0": "course4/17_crayons",  // Crayons
  "a3aog1sdwxq": "course4/18_genie",  // Genie
  "t6aliqq1tas": "course4/19_platform_overview",  // Hyblock Capital — Platform Overview
  "efgms3idy1m": "course4/20_liquidation_levels",  // Liquidation Levels
  "x7cvt7vxe2m": "course4/21_liquidation_level_scenario",  // Liquidation Level Scenario — Live Walkthrough
  "78i9ccmt1lg": "course4/22_positions_heatmap",  // Positions Heatmap
  "m05al1yd598": "course4/23_combining_sentiment_data",  // Combining Sentiment Data
  "wuetl6fdjr8": "course4/24_trading_activity",  // Trading Activity
  "rpusmn4etwe": "course4/25_hyblock_indicators",  // Hyblock Indicators on Chart
  "ieqgvviw-n8": "course4/26_kijun_sen",  // Kijun-sen Bounces and Rejections
  "d0izvw6996i": "course4/27_c_clamps_and_kumo_pockets",  // C-Clamps and Kumo Pockets
  "kpvozoobhr4": "course4/28_edge_to_edge",  // Edge to Edge (E2E)
  "mdwieybaeas": "course4/29_ichimoku_market_scenario",  // Ichimoku Market Scenarios — Live Examples
};
// Video-less live chapters (course intros / recaps / Divergences) → v2 lesson, keyed
// course → chapter index. (C2 ch14 "Divergences" has no source video; it now has a v2 lesson.)
const LT_V2_NOVIDEO = {
  2: { 14: "course2/18_divergences", 16: "course2/17_outro" },
  3: { 0: "course3/01_introduction", 20: "course3/21_outro" },
  4: { 0: "course4/01_introduction", 29: "course4/30_outro" },
};

const _v2LoadState = {};
function ensureV2LessonsLoaded(n) {
  const files = (typeof window.LT_V2_FILES !== 'undefined' && window.LT_V2_FILES) ? window.LT_V2_FILES[n] : null;
  if (!files || !files.length) return Promise.resolve(false);
  if (_v2LoadState[n]) return _v2LoadState[n];
  _v2LoadState[n] = Promise.all(files.map((f) => new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = `lessons-v2/lessons/Course${n}/${f}?v=1.0.9`;
    s.async = false;                       // keep registration order tidy
    s.onload  = () => resolve(true);
    s.onerror = () => { s.remove(); resolve(false); };
    document.head.appendChild(s);
  }))).then((results) => {
    // Don't cache a partial/failed load as success — drop the cache entry so
    // the next lesson visit retries the failed files (B4).
    if (results.some(ok => !ok)) { delete _v2LoadState[n]; return false; }
    return true;
  });
  return _v2LoadState[n];
}

/* The v2 lesson id a chapter maps to (independent of load state), or null. */
function v2LessonIdFor(chapter) {
  if (!chapter) return null;
  if (chapter.videoUrl) {
    const vid = (chapter.videoUrl.split('embed/')[1] || '').split(/[?&]/)[0].toLowerCase();
    if (vid && LT_V2_BY_VIDEO[vid]) return LT_V2_BY_VIDEO[vid];
  }
  const cn = getActiveCourseNum();
  const idx = CHAPTERS.indexOf(chapter);
  if (LT_V2_NOVIDEO[cn] && LT_V2_NOVIDEO[cn][idx] != null) return LT_V2_NOVIDEO[cn][idx];
  return null;
}
function getV2Lesson(chapter) {
  const id = v2LessonIdFor(chapter);
  return (id && typeof window.LT_LESSONS !== 'undefined' && window.LT_LESSONS) ? (window.LT_LESSONS[id] || null) : null;
}

let _v2Player = null;
function disposeV2Player() {
  if (_v2Player) { try { _v2Player.destroy(); } catch (e) {} _v2Player = null; }
}
function mountV2Lesson(hostEl, chapter) {
  disposeV2Player();
  if (!hostEl) return false;
  hostEl.innerHTML = '';
  const lesson = getV2Lesson(chapter);
  if (lesson && typeof LTRenderer !== 'undefined') {
    // Candle colours: honour the learner's custom bull/bear choice so candles match the
    // ECharts visuals/quizzes; default to the dark-stage colours (the player is always dark).
    const _colors = {
      bull: LTStore.get('bullishColor') || '#00d4d4',
      bear: LTStore.get('bearishColor') || '#ff2e88'
    };
    // onComplete: the player's end-of-lesson "continue" cue advances to the Quiz step.
    // Pre-generated narration (Kokoro): pass audioBase only for lessons that actually have
    // audio (per the generated manifest) so the player never requests missing clips.
    const _hasAudio = !!(window.LT_AUDIO_MANIFEST && window.LT_AUDIO_MANIFEST[lesson.id]);
    _v2Player = new LTRenderer(hostEl, lesson, {
      onComplete: function () { navigate('next'); },
      colors: _colors,
      moduleName: chapter.module,                                     // shown on the lesson-complete overlay
      captionSize: LTStore.get('captionSize') || 'md',   // subtitle size (sm/md/lg)
      narration: LTStore.get('narration') !== '0',        // narration on/off (default on)
      audioBase: _hasAudio ? 'lessons-v2/audio/' : null,
      // Cache-busts every clip + timings fetch. MUST be bumped whenever narration is
      // regenerated (tools/tts) — the karaoke captions render the timings' words, so a
      // stale cached timings.json would keep speaking/displaying superseded content.
      audioVersion: '3.0.0'
    });
    return true;
  }
  return false;
}

/* LESSON step — the dependency-free animated LTRenderer IS the lesson (it replaced the
   v1 recon player + written lesson). Every chapter maps to a v2 lesson; the course's
   lesson files lazy-load on demand. If the lesson/renderer can't be reached (e.g. the
   v2 stack failed to load), show a small graceful notice so the step is never blank. */
function renderV2Lesson(chapter) {
  const _accent = ltCourseAccent(getActiveCourseNum());
  setContent(`
    <div class="lesson-wrap lesson-wrap--player module-themed" style="--mod-accent:${_accent}">
      ${moduleBannerHtml(chapter)}
      <div class="recon-lesson-card">
        <div class="recon-player-host" id="v2-lesson-host"></div>
        ${chapter.videoUrl ? _watchOriginalHtml(chapter.videoUrl) : ''}
      </div>
    </div>`);
  const cn = getActiveCourseNum(), _c = state.chapter, _s = state.step;
  ensureV2LessonsLoaded(cn).then(() => {
    // Navigated away during load? Compare course too — a course switch can land
    // on the same chapter/step indices with a different chapter object (B5).
    if (getActiveCourseNum() !== cn || state.chapter !== _c || state.step !== _s) return;
    const host = document.getElementById('v2-lesson-host');
    if (!mountV2Lesson(host, chapter) && host) {
      host.innerHTML = `<div class="content-card content-card--teal">
          <div class="content-card-tag">Lesson</div>
          <p class="content-card-body">This lesson couldn't be loaded right now. Please refresh the page to try again.</p>
        </div>`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });
}

/* INTRODUCTION step — a single centered column: the module banner, then a readable
   overview (heading · lead · key points), then the chapter's teaching visual (chart /
   concept diagram / course roadmap) full-width beneath it. This replaced the old
   1fr|1fr split, which paired a tall text block against a short chart and left an
   awkward empty quadrant; the copy now runs at a comfortable measure and the chart gets
   the full width it needs to be legible. (The former separate "Visual" step was folded
   back in here once the recon player was retired.) */
function renderIntro(chapter) {
  const { intro, introChart } = chapter;
  const _mt = moduleTheme(chapter.module);
  const _accent = ltCourseAccent(getActiveCourseNum());
  // The "Watch original on YouTube" courtesy link belongs on the Lesson step only,
  // not the Introduction — so the intro chart/concept cards get no videoUrl.

  const hasChart   = introChart && introChart.format !== 'concept';
  const hasConcept = introChart && introChart.format === 'concept';
  const chartCard  = hasChart
    ? chartCardHtml('chart-intro', introChart.title, introChart.type === 'line' ? 'Line' : 'Candles', false, introChart.chartHeight)
    : '';

  // The teaching visual, full-width below the overview: roadmap (course openers) >
  // concept diagram > chart. A roadmap chapter that ALSO teaches with a chart shows both.
  const visualHtml = chapter.roadmap
    ? roadmapCardHtml(chapter.roadmap) + (hasChart ? chartCard : '')
    : hasConcept
      ? conceptCardHtml('concept-intro', introChart)
      : chartCard;

  setContent(`
    ${_riskCalloutHtml(chapter)}
    ${_indicatorDisclaimerHtml(chapter)}
    <div class="intro-layout intro-layout--stack module-themed" style="--mod-accent:${_accent}">
      ${_course4NoteHtml()}
      ${moduleBannerHtml(chapter)}
      ${visualHtml}
      <div class="content-card content-card--teal intro-copy">
        <h2 class="content-card-heading">${intro.heading}</h2>
        <p class="content-card-body">${ltClr(intro.body)}</p>
        ${bulletsHtml(intro.bullets)}
      </div>
    </div>`);

  setTimeout(() => {
    if (isChartSlot(introChart) && document.getElementById('chart-intro')) {
      renderTeachingChart('chart-intro', introChart);
      if (state.chapter === 0 && CHAPTERS === LT_CHAPTERS && typeof renderCandlestickGallery === 'function') {
        renderCandlestickGallery('chart-intro');
      } else {
        _autoExpandIfCluttered('chart-intro', introChart);   // busy charts open expanded so labels are legible
      }
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 80);
}

/* ── Bespoke "Demo" step ─────────────────────────────────────────────────────
   A chapter can add ONE interactive section as its own step (peer of Intro/Lesson).
   Driven by `chapter.demo = { kind, label, after?, heading?, body?, bullets? }`.
   Widget kinds register here — each mounts a self-contained visual (its own chrome).
   Nothing here touches the chapter's existing charts. */
const _DEMO_WIDGETS = {
  orderbook:  { mount: (id) => { if (typeof renderOrderBookDemo === 'function') renderOrderBookDemo(id); } },
  patternlib: { mount: (id) => { if (typeof renderPatternLibrary === 'function') renderPatternLibrary(id); } },
  ichimoku:   { mount: (id) => { if (typeof renderIchimokuExplorer === 'function') renderIchimokuExplorer(id); } },
  fib:        { mount: (id) => { if (typeof renderFibDemo === 'function') renderFibDemo(id); } },
  msbuilder:  { mount: (id) => { if (typeof renderMSBuilder === 'function') renderMSBuilder(id); } },
  divtrainer: { mount: (id) => { if (typeof renderDivTrainer === 'function') renderDivTrainer(id); } },
  volreader:  { mount: (id) => { if (typeof renderVolReader === 'function') renderVolReader(id); } }
};
function renderDemo(chapter) {
  const d = chapter.demo || {};
  const w = _DEMO_WIDGETS[d.kind] || {};
  const _accent = ltCourseAccent(getActiveCourseNum());
  // Visual-first (matches the Introduction step): the widget leads, copy reads beneath.
  setContent(`
    ${_riskCalloutHtml(chapter)}
    ${_indicatorDisclaimerHtml(chapter)}
    <div class="intro-layout intro-layout--stack module-themed" style="--mod-accent:${_accent}">
      ${_course4NoteHtml()}
      ${moduleBannerHtml(chapter)}
      <div class="demo-visual" id="demo-widget" style="margin:0 auto 6px;width:100%;"></div>
      <div class="content-card content-card--teal intro-copy">
        <h2 class="content-card-heading">${d.heading || d.label || 'Interactive demo'}</h2>
        ${d.body ? `<p class="content-card-body">${ltClr(d.body)}</p>` : ''}
        ${d.bullets ? bulletsHtml(d.bullets) : ''}
      </div>
    </div>`);
  setTimeout(() => {
    if (w.mount) w.mount('demo-widget');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 60);
}

/* (in-lesson "Practice This Pattern" CTA removed 2026-07-01 — _practiceBtnHtml had
   no callers; the Simulator is reachable from the home hub + header.) */

/* Net direction of a lesson's teaching chart, read from its own candle data
   (first close → last close). Returns 'bull' | 'bear' | null. This is what's
   actually drawn, so it's the most reliable signal of the example's bias. */
function _lessonNetDirection(chapter) {
  const lc = chapter.lessonChart;
  if (lc && Array.isArray(lc.ohlc) && lc.ohlc.length > 1) {
    const first = lc.ohlc[0][1];                     // close of first candle
    const last  = lc.ohlc[lc.ohlc.length - 1][1];    // close of last candle
    if (last < first * 0.997) return 'bear';
    if (last > first * 1.003) return 'bull';
  }
  return null;
}

/* Find the real historical pattern that matches this chapter's concept, if any.
   A concept can have both a bullish and a bearish variant (e.g. Trending Markets
   has an uptrend and a downtrend example), so when several match we pick the one
   whose direction matches the textbook chart actually being shown. */
function _findRealPattern(chapter) {
  if (typeof LT_PATTERNS === 'undefined') return null;
  const matches = LT_PATTERNS.filter(p => p.concept === chapter.title);
  if (matches.length === 0) return null;
  const dir = _lessonNetDirection(chapter);
  if (dir) {
    const want = dir === 'bear' ? 'sell' : 'buy';
    const m = matches.find(p => p.correctAnswer === want);
    if (m) return m;
    // The lesson simulation clearly moves one way, but the only real example(s) for
    // this concept move the other way. Show nothing rather than an inverse, contradictory
    // chart — the real example must replicate the simulation, not oppose it.
    if (matches.some(p => p.correctAnswer === 'buy' || p.correctAnswer === 'sell')) return null;
  }
  return matches[0];
}

/* Direction a quiz scenario resolves to, read from its chart's revealed outcome
   (close at the decision point → final close). Returns 'bull' | 'bear' | null. */
function _quizDirection(chapter) {
  const q = chapter.quiz;
  const c = q && q.chart;
  // 1) Revealed outcome — decision-point close → final close (best for reversal scenarios)
  if (c && Array.isArray(c.ohlc) && c.ohlc.length > 1) {
    const cut = (c.cutIndex != null) ? c.cutIndex : c.ohlc.length;
    const decisionClose = c.ohlc[Math.max(0, cut - 1)][1];
    const finalClose    = c.ohlc[c.ohlc.length - 1][1];
    if (finalClose > decisionClose * 1.003) return 'bull';
    if (finalClose < decisionClose * 0.997) return 'bear';
  }
  // 2) Correct answer text (best for classification scenarios with no net move)
  const cor = q && q.answers && q.answers.find(a => a.correct);
  if (cor) {
    const t = String(cor.text || '').toLowerCase();
    const bear = /(bear|short|sell|down\s?trend|lower high|lower low|\blh\b|\bll\b|resistance|supply|rejection|breakdown|distribution|shooting star)/.test(t);
    const bull = /(bull|long|buy|up\s?trend|higher high|higher low|\bhh\b|\bhl\b|support|demand|bounce|accumulation|hammer)/.test(t);
    if (bear && !bull) return 'bear';
    if (bull && !bear) return 'bull';
  }
  // 3) Full-chart net direction — last resort
  if (c && Array.isArray(c.ohlc) && c.ohlc.length > 1) {
    const first = c.ohlc[0][1];
    const last  = c.ohlc[c.ohlc.length - 1][1];
    if (last < first * 0.997) return 'bear';
    if (last > first * 1.003) return 'bull';
  }
  return null;
}

/* Like _findRealPattern, but matches the QUIZ scenario's direction so the real
   example agrees with the question and its correct answer (e.g. a bullish
   hammer quiz maps to the Hammer Reversal pattern, not the Shooting Star Top). */
function _findRealPatternForQuiz(chapter) {
  if (typeof LT_PATTERNS === 'undefined') return null;
  const matches = LT_PATTERNS.filter(p => p.concept === chapter.title);
  if (matches.length === 0) return null;
  const dir = _quizDirection(chapter);
  if (dir) {
    const want = dir === 'bear' ? 'sell' : 'buy';
    const m = matches.find(p => p.correctAnswer === want);
    if (m) return m;
    // The quiz asserts a clear direction but no real pattern matches it (e.g. a
    // Bear Flag quiz with only a Bull Flag pattern available). Don't offer a
    // contradictory real example — the simulation already teaches the scenario.
    if (matches.some(p => p.correctAnswer === 'buy' || p.correctAnswer === 'sell')) return null;
  }
  return matches[0];
}

// Deterministic seeded shuffle so a chapter's answer order is stable across visits.
function _seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = (typeof seed === 'number' ? seed : 0) + 1;
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const _LETTERS = ['A','B','C','D','E','F'];

/* ══════════════════════════════════════════════════════════════════════════
   QUIZ EXAMPLE TOGGLE — the quiz chart is a SIMULATION by default; if a real
   historical pattern matches the chapter, a toggle offers the real-life example.
   ══════════════════════════════════════════════════════════════════════════ */
const _QEX_REAL = '<i data-lucide="candlestick-chart" style="width:13px;height:13px;"></i><span>Real Example</span>';
const _QEX_SIM  = '<i data-lucide="cpu" style="width:13px;height:13px;"></i><span>Simulation</span>';

function _removeQuizRealBadge() {
  const card = document.getElementById('chart-quiz');
  if (card) card.querySelectorAll('.real-data-badge, .real-data-year').forEach(el => el.remove());
}

function _renderQuizSim(quiz, alreadyDone) {
  _removeQuizRealBadge();
  const def = { ...quiz.chart, revealMarkPoints: quiz.revealMarkPoints || [] };
  renderChart('chart-quiz', def, alreadyDone);
  const badge = document.querySelector('#chart-quiz')?.closest('.chart-card')?.querySelector('.chart-card-badge');
  if (badge) badge.textContent = alreadyDone ? 'Revealed' : 'Decision Point';
}

function _addQuizRealBadge(pattern) {
  const chartEl = document.getElementById('chart-quiz');
  if (!chartEl) return;
  const rp      = window._currentRealPattern;
  const source  = rp ? rp.source : 'binance';
  const srcName = source === 'coingecko' ? 'CoinGecko' : 'Binance';
  const year    = String(new Date(pattern.decisionTime).getFullYear());
  const binanceSvg   = `<svg width="14" height="14" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill="#F3BA2F" d="M16 0L9.9 6.1l-3.8-3.8L0 8.4l6.1 6.1-6.1 6.1 6.1 6.1 3.8-3.8 6.1 6.1 6.1-6.1 3.8 3.8 6.1-6.1-6.1-6.1 6.1-6.1-6.1-6.1-3.8 3.8z"/></svg>`;
  const coingeckoSvg = `<svg width="14" height="14" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#8DC63F"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="16" font-weight="bold">G</text></svg>`;
  const logo = source === 'coingecko' ? coingeckoSvg : binanceSvg;
  chartEl.style.position = 'relative';
  _removeQuizRealBadge();
  const badge = document.createElement('div');
  badge.className = 'real-data-badge';
  badge.innerHTML = `${logo} ${srcName} · Historical BTC Data`;
  badge.style.cssText = 'position:absolute;top:8px;left:8px;display:flex;align-items:center;gap:5px;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;padding:3px 8px;border-radius:12px;border:1px solid '+getBullishColor()+';z-index:10;pointer-events:none;';
  chartEl.prepend(badge);
  const yearEl = document.createElement('div');
  yearEl.className = 'real-data-year';
  yearEl.textContent = `BTC/USD · ${year}`;
  yearEl.style.cssText = 'position:absolute;top:8px;right:8px;color:#9494b0;font-size:11px;z-index:10;pointer-events:none;';
  chartEl.appendChild(yearEl);
}

// Statically reveal the full real outcome (used when the quiz is already answered)
function _revealQuizRealStatic() {
  const rp = window._currentRealPattern;
  const inst = charts['chart-quiz'];
  if (!rp || !inst) return;
  const setupOhlc = rp.setupOhlc, setupLabels = rp.setupLabels;
  const revealOhlc = rp.revealCandles.map(c => [c.open, c.close, c.low, c.high]);
  const revealLabels = rp.revealCandles.map(c => new Date(c.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const decisionIndex = setupOhlc.length - 1;
  const revealData = revealOhlc.map(c => {
    const isBull = c[1] >= c[0];
    return { value: c, itemStyle: { color: 'transparent', borderColor: isBull ? TEAL : BEAR, borderWidth: 1.5, color0: 'transparent', borderColor0: BEAR } };
  });
  inst.setOption({
    xAxis:  { data: [...setupLabels, ...revealLabels] },
    series: [{
      data: [...setupOhlc, ...revealData],
      markLine: { symbol: ['none', 'none'], silent: true, data: [
        [ { xAxis: decisionIndex, label: { show: true, formatter: 'Decision Point', color: TEAL, fontSize: 10, fontWeight: 700, position: 'insideEndTop' }, lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.8 } }, { xAxis: decisionIndex } ],
        ...(rp.pattern.keyLevel ? [[ { yAxis: rp.pattern.keyLevel, label: { show: true, formatter: rp.pattern.patternLabel, color: TEAL, fontSize: 10, fontWeight: 600, position: 'end' }, lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.75 } }, { yAxis: rp.pattern.keyLevel } ]] : [])
      ] }
    }]
  }, { notMerge: false });
}

function _setupQuizExampleToggle(chapter, quiz, pattern, alreadyDone) {
  const indicator = (quiz.chart && quiz.chart.indicator) || null;
  _quizExample = { mode: 'sim', quiz, pattern, indicator, alreadyDone };
  const cardWrap = document.getElementById('chart-quiz')?.closest('.chart-card');
  if (!cardWrap) return;
  const right = cardWrap.querySelector('.chart-card-header-right');
  if (!right || right.querySelector('.chart-example-toggle')) return;
  const btn = document.createElement('button');
  btn.className = 'chart-example-toggle';
  btn.id = 'quiz-example-toggle';
  btn.setAttribute('onclick', 'toggleQuizExample()');
  btn.title = 'See this scenario in real BTC history';
  btn.innerHTML = _QEX_REAL;
  const expand = right.querySelector('.chart-expand-btn');
  if (expand) right.insertBefore(btn, expand); else right.appendChild(btn);
}

window.toggleQuizExample = async function() {
  if (!_quizExample) return;
  const { quiz, pattern, indicator } = _quizExample;
  const btn = document.getElementById('quiz-example-toggle');

  if (_quizExample.mode === 'sim') {
    if (btn) { btn.disabled = true; btn.classList.add('chart-example-toggle--active'); btn.innerHTML = _QEX_SIM; }
    if (typeof lucide !== 'undefined') lucide.createIcons();
    const ok = await renderRealDataQuiz('chart-quiz', pattern, indicator);
    if (btn) btn.disabled = false;
    if (!ok) {
      _renderQuizSim(quiz, _quizExample.alreadyDone);
      if (btn) { btn.classList.remove('chart-example-toggle--active'); btn.innerHTML = _QEX_REAL; }
      if (typeof lucide !== 'undefined') lucide.createIcons();
      if (typeof showToast === 'function') showToast('Could not load real BTC data — check your connection.');
      return;
    }
    _quizExample.mode = 'real';
    _addQuizRealBadge(pattern);
    const badge = document.querySelector('#chart-quiz')?.closest('.chart-card')?.querySelector('.chart-card-badge');
    const answered = _quizExample.alreadyDone || !!document.querySelector('.quiz-card .explanation-box');
    if (answered) {
      _revealQuizRealStatic();
      window._currentRealPattern = null;   // already answered → no pending reveal
      if (badge) badge.textContent = 'Revealed';
    } else if (badge) {
      badge.textContent = 'Decision Point';  // keep _currentRealPattern for the answer reveal
    }
  } else {
    _quizExample.mode = 'sim';
    window._currentRealPattern = null;
    _renderQuizSim(quiz, _quizExample.alreadyDone);
    if (btn) { btn.classList.remove('chart-example-toggle--active'); btn.innerHTML = _QEX_REAL; }
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

function renderQuiz(chapter) {
  const { quiz }     = chapter;
  const chapterIdx   = chapter.id;
  const savedProg    = state.progress[chapterIdx];
  // alreadyDone is only true for a *correct* answer — wrong answers allow retry
  const alreadyDone  = !!(savedProg && savedProg.quizCorrect);
  const savedAnswer  = savedProg ? savedProg.quizAnswer : null;

  // Shuffle answers using chapter id as seed — stable across revisits
  const displayAnswers = _seededShuffle(quiz.answers, chapter.id);

  // Answer buttons markup
  const isChoice = quiz.style === 'choice';
  let btnHtml = '';

  if (isChoice) {
    // 4 A/B/C/D choice buttons in a 2-col grid
    btnHtml = `<div class="answer-grid answer-grid--2col">
      ${displayAnswers.map((a, i) => {
        let cls = 'answer-btn';
        if (alreadyDone) {
          if (a.id === savedAnswer && a.correct) cls += ' answer-btn--correct';
          else if (a.id === savedAnswer && !a.correct) cls += ' answer-btn--wrong';
          else if (a.correct) cls += ' answer-btn--missed';
          else cls += ' answer-btn--dimmed';
        }
        return `<button class="${cls}" data-answer="${a.id}"
          ${alreadyDone ? 'disabled' : ''}
          onclick="handleAnswer('${a.id}')">
          <span class="answer-letter-badge">${_LETTERS[i]}</span>
          ${a.text.replace(/^[A-D]\)\s*/, '')}
        </button>`;
      }).join('')}
    </div>`;
  } else {
    // Direction buttons: bullish/bearish/neutral
    btnHtml = `<div class="answer-grid">
      ${displayAnswers.map(a => {
        let cls = `answer-btn answer-btn--${a.type}`;
        if (alreadyDone) {
          if (a.id === savedAnswer && a.correct) cls += ' answer-btn--correct';
          else if (a.id === savedAnswer && !a.correct) cls += ' answer-btn--wrong';
          else if (a.correct) cls += ' answer-btn--missed';
          else cls += ' answer-btn--dimmed';
        }
        // Strip the legacy baked-in "● " glyph; a state-aware .answer-dot marker
        // replaces it so the bullet follows the button's hover/correct/wrong colour.
        const txt = a.text.replace(/^●\s*/, '');
        return `<button class="${cls}" data-answer="${a.id}"
          ${alreadyDone ? 'disabled' : ''}
          onclick="handleAnswer('${a.id}')">
          <span class="answer-dot" aria-hidden="true"></span>${txt}
        </button>`;
      }).join('')}
    </div>`;
  }

  // Explanation (shown if already answered)
  const explHtml = alreadyDone ? buildExplanationHtml(quiz, savedAnswer) : '';

  // Conceptual quizzes (funding rates, margin modes, journaling, meditation…) set
  // `hideChart:true` — a candlestick "Decision Point" chart would only mislead, so
  // we show the question alone. The answer-reveal flow degrades gracefully (revealChart
  // no-ops with no chart instance, the badge query is null-guarded).
  const showChart = !!(quiz.chart && !quiz.hideChart);

  const html = `
    ${showChart ? chartCardHtml('chart-quiz', quiz.chart.title, alreadyDone ? 'Revealed' : 'Decision Point', true, quiz.chart.chartHeight) : ''}
    <div class="quiz-card">
      <div class="quiz-label">Scenario</div>
      <div class="quiz-question">${quiz.question}</div>
      <div class="quiz-hint">${quiz.hint}</div>
      ${btnHtml}
      ${explHtml}
    </div>`;

  setContent(html);

  // Render chart — ALWAYS start with the synthetic simulation. If a real
  // historical pattern matches this chapter, wire the optional real-example toggle.
  setTimeout(() => {
    // const realPattern = _findRealPatternForQuiz(chapter); // Real Example disabled
    window._currentRealPattern = null;
    _quizExample = null;
    if (showChart) _renderQuizSim(quiz, alreadyDone);
    // if (realPattern) _setupQuizExampleToggle(chapter, quiz, realPattern, alreadyDone); // Real Example disabled
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 80);

  state.quizAnsweredThisStep = alreadyDone;
  updateNextBtn();
}

/* ══════════════════════════════════════════════════════════════════════════
   MODULE QUIZ — the multi-question end-of-module Learning Assessment. Rendered
   on the "Quiz" step (a module's final session). Each question is answer-to-reveal
   with retry (no hard gate); progress per question is stored in prog.moduleQuiz.
   A results panel offers Relearn the module / Retry the quiz / Skip forward.
   ══════════════════════════════════════════════════════════════════════════ */
/* Need ≥70% of questions right on the FIRST try to "pass" the assessment; below
   that the results panel pushes the learner to relearn the module. */
const MQ_PASS_RATIO = 0.7;

function _moduleProg(chIdx) {
  const prog = state.progress[chIdx] || (state.progress[chIdx] = { completed: false, quizAnswered: false, quizCorrect: false, quizAnswer: null });
  if (!prog.moduleQuiz      || typeof prog.moduleQuiz      !== 'object') prog.moduleQuiz      = {}; // { [qIndex]: true } cleared (answered correctly)
  if (!prog.moduleQuizWrong || typeof prog.moduleQuizWrong !== 'object') prog.moduleQuizWrong = {}; // { [qIndex]: true } missed at least once (first-try wrong)
  return prog;
}
function _mqClearedCount(quiz, prog) {
  return quiz.questions.reduce((n, _q, i) => n + (prog.moduleQuiz[i] ? 1 : 0), 0);
}
function _mqMissedCount(quiz, prog) {
  return quiz.questions.reduce((n, _q, i) => n + (prog.moduleQuizWrong[i] ? 1 : 0), 0);
}
/* Mark a question as missed (got it wrong before getting it right) — once only. */
function _mqMarkWrong(qi) {
  const prog = _moduleProg(state.chapter);
  if (!prog.moduleQuizWrong[qi]) { prog.moduleQuizWrong[qi] = true; saveState(); }
}
/* Overall state of the assessment: still in progress, passed, or "review" (too many missed). */
function _mqOutcome(quiz, prog) {
  const N = quiz.questions.length;
  const cleared = _mqClearedCount(quiz, prog);
  const missed  = _mqMissedCount(quiz, prog);
  if (cleared < N) return { state: 'progress', N, cleared, missed };
  const passed = missed <= Math.floor(N * (1 - MQ_PASS_RATIO));
  return { state: passed ? 'passed' : 'failed', N, cleared, missed };
}

/* Which option index is "correct" for a single-answer question (tf/mc). */
function _mqCorrectIdx(q) { return q.type === 'tf' ? (q.answer ? 0 : 1) : q.answer; }

function _mqQuestionHtml(q, qi, isCleared) {
  const correctSet = q.type === 'multi' ? q.answer : [_mqCorrectIdx(q)];
  let optsHtml;

  if (q.type === 'multi') {
    optsHtml = `<div class="mq-options mq-options--multi">
      ${q.options.map((o, oi) => {
        const ok  = correctSet.includes(oi);
        const cls = 'mq-opt mq-opt--check' + (isCleared && ok ? ' mq-opt--correct' : '');
        return `<button class="${cls}" data-q="${qi}" data-opt="${oi}" ${isCleared ? 'disabled' : ''} onclick="mqToggle(${qi},${oi})">
          <span class="mq-check" aria-hidden="true"></span><span class="mq-opt-text">${o}</span></button>`;
      }).join('')}
      <button class="mq-check-btn" data-q="${qi}" ${isCleared ? 'style="display:none"' : ''} onclick="mqCheckMulti(${qi})">Check answer</button>
    </div>`;
  } else {
    const labels = q.type === 'tf' ? ['True', 'False'] : q.options;
    // Short single-choice answers (e.g. Line / Wick / Stick / Body) pack into a 2-col grid
    // instead of full-width rows — fills the horizontal space and halves the vertical height.
    const compact = q.type !== 'tf' && labels.length >= 3 &&
      labels.every(o => String(o).replace(/<[^>]*>/g, '').trim().length <= 28);
    const optsCls = q.type === 'tf' ? ' mq-options--tf' : (compact ? ' mq-options--grid' : '');
    optsHtml = `<div class="mq-options${optsCls}">
      ${labels.map((o, oi) => {
        const ok  = correctSet.includes(oi);
        const cls = 'mq-opt' + (isCleared && ok ? ' mq-opt--correct' : (isCleared ? ' mq-opt--dimmed' : ''));
        const badge = q.type === 'tf' ? '' : `<span class="mq-opt-badge">${_LETTERS[oi]}</span>`;
        return `<button class="${cls}" data-q="${qi}" data-opt="${oi}" ${isCleared ? 'disabled' : ''} onclick="mqAnswer(${qi},${oi})">
          ${badge}<span class="mq-opt-text">${o}</span></button>`;
      }).join('')}
    </div>`;
  }

  return `<div class="mq-q${isCleared ? ' mq-q--cleared' : ''}" id="mq-q-${qi}" data-type="${q.type}">
    <div class="mq-q-head">
      <span class="mq-q-num">${qi + 1}</span>
      <div class="mq-q-text">${q.q}</div>
      <span class="mq-q-status" aria-hidden="true">${isCleared ? '<i data-lucide="check" style="width:14px;height:14px;"></i>' : ''}</span>
    </div>
    ${optsHtml}
    <div class="mq-feedback${isCleared ? ' mq-feedback--ok' : ''}" id="mq-fb-${qi}">${isCleared ? '<i data-lucide="check-circle" style="width:14px;height:14px;"></i> Correct' : ''}</div>
  </div>`;
}

/* Results / actions panel — adapts to how the learner did:
   • in progress  → Relearn · Retry · Skip forward
   • passed (≥70% first-try) → Relearn · Retry   (no Skip — the nav "Next Session" covers it)
   • failed (too many missed) → Relearn [Suggested, highlighted] · Skip forward   (no Retry) */
function _mqResultsHtml(quiz, prog) {
  const o = _mqOutcome(quiz, prog);
  const suggested = o.state === 'failed';
  const showRetry = o.state !== 'failed';   // failed → drop Retry; relearning is the path forward
  const showSkip  = o.state !== 'passed';   // passed → drop Skip; the bottom "Next Session" handles it

  let stateCls = '', msg;
  if (o.state === 'passed') {
    stateCls = ' mq-results--done';
    msg = '<i data-lucide="award" style="width:16px;height:16px;"></i> Module complete — nicely done. Hit <strong>Next Session</strong> below to continue.';
  } else if (o.state === 'failed') {
    stateCls = ' mq-results--review';
    msg = `<i data-lucide="alert-triangle" style="width:16px;height:16px;"></i> You missed <strong>${o.missed} of ${o.N}</strong> on the first try — a quick refresher will lock it in.`;
  } else {
    msg = 'Answer each question to pass — or choose how to move on:';
  }

  const relearnBtn = `<button class="mq-action${suggested ? ' mq-action--suggested' : ''}" onclick="mqRelearnModule()">
      <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> Relearn the module${suggested ? ' <span class="mq-suggested-tag">Suggested</span>' : ''}</button>`;
  const retryBtn = showRetry
    ? `<button class="mq-action" onclick="mqRetryQuiz()"><i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> Retry the quiz</button>` : '';
  const skipBtn = showSkip
    ? `<button class="mq-action${o.state === 'progress' ? ' mq-action--primary' : ''}" id="mq-skip-btn" onclick="mqSkipForward()"><i data-lucide="arrow-right" style="width:14px;height:14px;"></i> Skip forward anyway</button>` : '';

  return `<div class="mq-results${stateCls}" id="mq-results">
    <div class="mq-results-msg" id="mq-results-msg">${msg}</div>
    <div class="mq-actions">${relearnBtn}${retryBtn}${skipBtn}</div>
  </div>`;
}

function renderModuleQuiz(chapter) {
  const quiz = moduleQuizFor(chapter);
  if (!quiz) {
    setContent(`<div class="mq-wrap"><div class="mq-q"><div class="mq-q-head"><div class="mq-q-text">No assessment is available for this module yet.</div></div></div></div>`);
    return;
  }
  const prog = _moduleProg(state.chapter);
  const N    = quiz.questions.length;
  const c    = _mqClearedCount(quiz, prog);
  const qHtml = quiz.questions.map((q, qi) => _mqQuestionHtml(q, qi, !!prog.moduleQuiz[qi])).join('');

  setContent(`
    <div class="mq-wrap">
      <div class="mq-head">
        <div class="mq-kicker">Module Quiz · Learning Assessment</div>
        <h2 class="mq-title">${quiz.title}</h2>
        <div class="mq-progress"><span id="mq-progress-count">${c}</span> / ${N} answered correctly</div>
        <div class="mq-progress-track"><div class="mq-progress-fill" id="mq-progress-fill" style="width:${Math.round((c / N) * 100)}%"></div></div>
      </div>
      <div class="mq-questions">${qHtml}</div>
      ${_mqResultsHtml(quiz, prog)}
    </div>`);

  if (typeof lucide !== 'undefined') lucide.createIcons();
  // No Scenario gate on the module Quiz — Next stays enabled.
  updateNextBtn();
}

function _mqSetFeedback(qi, ok, msg) {
  const fb = document.getElementById('mq-fb-' + qi);
  if (!fb) return;
  fb.className = 'mq-feedback ' + (ok ? 'mq-feedback--ok' : 'mq-feedback--bad');
  fb.innerHTML = ok
    ? '<i data-lucide="check-circle" style="width:14px;height:14px;"></i> Correct'
    : ('<i data-lucide="alert-circle" style="width:14px;height:14px;"></i> ' + (msg || 'Not quite — try again'));
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function _mqMarkCleared(qi) {
  const prog = _moduleProg(state.chapter);
  prog.moduleQuiz[qi] = true;
  saveState();
  _mqUpdateProgress();
}

function _mqUpdateProgress() {
  const quiz = moduleQuizFor(currentChapter());
  if (!quiz) return;
  const prog = _moduleProg(state.chapter);
  const N = quiz.questions.length;
  const c = _mqClearedCount(quiz, prog);
  const cnt  = document.getElementById('mq-progress-count'); if (cnt)  cnt.textContent = c;
  const fill = document.getElementById('mq-progress-fill');  if (fill) fill.style.width = Math.round((c / N) * 100) + '%';
  // Re-render the whole results panel — its buttons/emphasis change as the outcome
  // moves from in-progress → passed/failed (drop Skip on pass, suggest Relearn on fail).
  const res = document.getElementById('mq-results');
  if (res) res.outerHTML = _mqResultsHtml(quiz, prog);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/* Single-answer (True/False, multiple-choice) — reveal on click. */
window.mqAnswer = function(qi, oi) {
  const quiz = moduleQuizFor(currentChapter());
  if (!quiz) return;
  const q = quiz.questions[qi];
  const prog = _moduleProg(state.chapter);
  if (prog.moduleQuiz[qi]) return;                 // already cleared
  const qEl = document.getElementById('mq-q-' + qi);
  const btn = qEl && qEl.querySelector(`.mq-opt[data-opt="${oi}"]`);
  if (!btn) return;
  const correct = oi === _mqCorrectIdx(q);
  if (!correct) {
    _mqMarkWrong(qi);
    btn.classList.add('mq-opt--wrong', 'mq-opt--shake');
    btn.disabled = true;
    _mqSetFeedback(qi, false);
    setTimeout(() => { btn.classList.remove('mq-opt--wrong', 'mq-opt--shake'); btn.disabled = false; }, 650);
    return;
  }
  qEl.querySelectorAll('.mq-opt').forEach(b => { b.disabled = true; });
  btn.classList.add('mq-opt--correct');
  qEl.classList.add('mq-q--cleared');
  const status = qEl.querySelector('.mq-q-status');
  if (status) status.innerHTML = '<i data-lucide="check" style="width:14px;height:14px;"></i>';
  _mqSetFeedback(qi, true);
  _mqMarkCleared(qi);
};

/* Select-all — toggle options, then validate as a set. */
window.mqToggle = function(qi, oi) {
  const prog = _moduleProg(state.chapter);
  if (prog.moduleQuiz[qi]) return;
  const qEl = document.getElementById('mq-q-' + qi);
  const btn = qEl && qEl.querySelector(`.mq-opt[data-opt="${oi}"]`);
  if (btn) btn.classList.toggle('mq-opt--selected');
};
window.mqCheckMulti = function(qi) {
  const quiz = moduleQuizFor(currentChapter());
  if (!quiz) return;
  const q = quiz.questions[qi];
  const prog = _moduleProg(state.chapter);
  if (prog.moduleQuiz[qi]) return;
  const qEl = document.getElementById('mq-q-' + qi);
  const selected = [...qEl.querySelectorAll('.mq-opt--selected')].map(b => +b.dataset.opt).sort((a, b) => a - b);
  const answer   = [...q.answer].sort((a, b) => a - b);
  const match = selected.length === answer.length && selected.every((v, i) => v === answer[i]);
  if (!match) {
    _mqMarkWrong(qi);
    const cb = qEl.querySelector('.mq-check-btn');
    if (cb) { cb.classList.add('mq-opt--shake'); setTimeout(() => cb.classList.remove('mq-opt--shake'), 650); }
    _mqSetFeedback(qi, false, 'Not quite — adjust your selection and check again.');
    return;
  }
  qEl.querySelectorAll('.mq-opt').forEach(b => {
    b.disabled = true;
    b.classList.remove('mq-opt--selected');
    if (answer.includes(+b.dataset.opt)) b.classList.add('mq-opt--correct');
  });
  const cb = qEl.querySelector('.mq-check-btn'); if (cb) cb.style.display = 'none';
  qEl.classList.add('mq-q--cleared');
  const status = qEl.querySelector('.mq-q-status');
  if (status) status.innerHTML = '<i data-lucide="check" style="width:14px;height:14px;"></i>';
  _mqSetFeedback(qi, true);
  _mqMarkCleared(qi);
};

/* Results-panel actions: relearn the module / retry the quiz / skip forward. */
window.mqRelearnModule = function() {
  const chapter = currentChapter();
  // Reset this module's quiz so it's a fresh attempt when they return after relearning.
  const qprog = _moduleProg(state.chapter);
  qprog.moduleQuiz = {};
  qprog.moduleQuizWrong = {};
  let first = state.chapter;
  while (first > 0 && CHAPTERS[first - 1] && CHAPTERS[first - 1].module === chapter.module) first--;
  state.chapter = first;
  state.step = 0;
  state.quizAnsweredThisStep = false;
  markChapterStarted(first);
  saveState();
  renderCurrentStep();
  updateHeaderUI();
  updateProgressUI();
  updateSidebar();
  updateNavButtons();
  scrollContentToTop();
  showToast('<i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> Back to the start of the module.');
};
window.mqRetryQuiz = function() {
  const prog = _moduleProg(state.chapter);
  prog.moduleQuiz = {};
  prog.moduleQuizWrong = {};
  saveState();
  renderCurrentStep();
  scrollContentToTop();
};
window.mqSkipForward = function() { navigate('next'); };

function buildExplanationHtml(quiz, answerId) {
  const chosen  = quiz.answers.find(a => a.id === answerId);
  const correct = chosen && chosen.correct;
  const cls     = correct ? 'explanation-box--correct' : 'explanation-box--wrong';
  const verdict = correct
    ? '<i data-lucide="check-circle" style="width:15px;height:15px;"></i> Correct!'
    : '<i data-lucide="x-circle" style="width:15px;height:15px;"></i> Not quite — here\'s why:';

  return `
    <div class="explanation-box ${cls}">
      <div class="explanation-verdict">${verdict}</div>
      <div class="explanation-body">${ltClr(quiz.explanation)}</div>
      ${quiz.rule ? `<div class="explanation-rule"><i data-lucide="pin"></i><span>${ltClr(quiz.rule)}</span></div>` : ''}
    </div>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   SYNTHETIC REVEAL — deliberate candle-by-candle reveal for the simulation quiz
   chart (the default, since real-data examples are disabled). The setup candles
   are already on screen; this prints the hidden outcome candles one at a time —
   so the answer lands as a "moment" instead of an instant pop — then applies the
   full reveal styling (revealMarkPoints, Decision divider, revealed-region shade)
   and fires the completion glow.
   ══════════════════════════════════════════════════════════════════════════ */
const _REVEAL_MS = 190;

function _revealGlow(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.style.transition = 'box-shadow 0.3s ease';
  el.style.boxShadow  = '0 0 18px 4px rgba(0,212,212,0.45)';
  setTimeout(() => { el.style.boxShadow = ''; }, 1400);
}

// The "Decision" divider shown live while the outcome candles print in.
function _revealDividerData(dividerX) {
  const sm = (typeof window !== 'undefined' && window.innerWidth <= 768);
  return [[
    { xAxis: dividerX,
      label: { show: true, formatter: 'Decision', rotate: 0, position: 'insideEndTop',
               color: '#0b0b0e', fontSize: sm ? 8 : 9, fontWeight: 700, fontFamily: 'Cascadia Code, JetBrains Mono, monospace',
               backgroundColor: TEAL, padding: sm ? [1, 4] : [2, 6], borderRadius: 4 },
      lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.9 } },
    { xAxis: dividerX }
  ]];
}

function _animateSyntheticReveal(elId, def, onComplete) {
  const inst = charts[elId];
  const cut  = def.cutIndex;
  // Nothing to animate (no hidden outcome) → straight to the full reveal.
  if (!inst || cut == null || cut >= def.ohlc.length) {
    revealChart(elId, def);
    _revealGlow(elId);
    if (onComplete) onComplete();
    return;
  }
  const setupOhlc   = def.ohlc.slice(0, cut);
  const outOhlc     = def.ohlc.slice(cut);
  const candleCols  = def.candleColors || null;
  const divider     = _revealDividerData(cut - 0.5);

  const mkOut = k => outOhlc.slice(0, k).map((c, j) => {
    const col = candleCols && candleCols[cut + j];
    return col ? { value: c, itemStyle: { color: col, color0: col, borderColor: col, borderColor0: col } } : c;
  });

  // Lock both axes BEFORE printing so they never rescale mid-reveal — the per-tick
  // jump (x-axis growing one label at a time, y-axis re-fitting) is what made the
  // reveal choppy. Frame 0 expands to the full x-axis + a fixed y-range while still
  // showing only the setup candles, so the outcome simply slides into fixed slots.
  let lo = Infinity, hi = -Infinity;
  def.ohlc.forEach(c => { if (c[2] < lo) lo = c[2]; if (c[3] > hi) hi = c[3]; });
  const pad = Math.max(0.5, (hi - lo) * 0.08);
  inst.setOption({
    animationDurationUpdate: _REVEAL_MS,
    animationEasingUpdate: 'cubicOut',
    xAxis:  { data: _engResolveLabels(def) },
    yAxis:  { min: +(lo - pad).toFixed(2), max: +(hi + pad).toFixed(2) },
    series: [{ data: setupOhlc, animationDuration: _REVEAL_MS, animationDelay: 0,
               markLine: { symbol: ['none', 'none'], silent: true, data: divider } }]
  }, { notMerge: false });

  const total = outOhlc.length;

  // Reduced motion: land the full outcome in one gentle fade — no print sequence.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    inst.setOption({ series: [{ data: [...setupOhlc, ...mkOut(total)], animationDuration: 220 }] }, { notMerge: false });
    revealChart(elId, def);
    if (onComplete) onComplete();
    return;
  }

  /* Silk print: a requestAnimationFrame timeline eased with cubic in-out replaces
     the old fixed-interval metronome. The sequence starts deliberately, flows
     through the middle and decelerates into the last candle; each candle's own
     grow-in (260ms cubicOut) is LONGER than the mid-sequence gap, so entrances
     overlap and read as one continuous motion instead of discrete pops. A short
     beat after the final candle lets it settle before the pins/shade/glow land. */
  const T = Math.max(1300, Math.min(2600, total * 130));   // whole-reveal duration
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let shown = 0, raf = 0;
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / T);
    const n = Math.max(shown, Math.round(easeInOut(p) * total));
    if (n > shown) {
      shown = n;
      inst.setOption({ series: [{ data: [...setupOhlc, ...mkOut(shown)],
        animationDuration: 260, animationEasing: 'cubicOut', animationDelay: 0 }] }, { notMerge: false });
    }
    if (p < 1) { raf = requestAnimationFrame(step); return; }
    // landing beat — let the last candle settle, then the reveal styling arrives
    setTimeout(() => {
      revealChart(elId, def);
      _revealGlow(elId);
      if (onComplete) onComplete();
    }, 160);
  };
  raf = requestAnimationFrame(step);
}

// Replay button under a revealed synthetic chart — resets to the setup candles
// and re-runs the candle-by-candle reveal.
function _addReplayBtn(elId, def) {
  const card = document.getElementById(elId)?.closest('.chart-card');
  if (!card || card.querySelector('.chart-replay-btn')) return;
  const btn = document.createElement('button');
  btn.className = 'chart-replay-btn';
  btn.innerHTML = '<i data-lucide="rotate-ccw"></i> Replay';
  card.appendChild(btn);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  btn.onclick = () => {
    const cut = def.cutIndex;
    const inst = charts[elId];
    if (!inst || cut == null) return;
    btn.style.display = 'none';
    // Reset to setup candles only — keep price-zone markAreas, drop reveal pins + divider.
    inst.setOption({
      xAxis:  { data: _engResolveLabels(def).slice(0, cut) },
      series: [{ data: def.ohlc.slice(0, cut), markLine: { data: [] }, markPoint: { data: [] } }]
    }, { notMerge: false });
    setTimeout(() => _animateSyntheticReveal(elId, def, () => { btn.style.display = 'flex'; }), 200);
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   QUIZ ANSWER HANDLER
   ══════════════════════════════════════════════════════════════════════════ */
window.handleAnswer = function(answerId) {
  // Only block re-answering if already answered correctly
  const progNow = state.progress[state.chapter];
  if (progNow && progNow.quizCorrect) return;

  const chapter = CHAPTERS[state.chapter];
  const quiz    = chapter.quiz;
  const chosen  = quiz.answers.find(a => a.id === answerId);
  if (!chosen) return;

  const correct = !!chosen.correct;

  if (!correct) {
    // Wrong: shake + red flash on selected button, then re-enable for retry
    // Chart is NOT revealed until the correct answer is chosen
    const wrongBtn = document.querySelector(`.answer-btn[data-answer="${answerId}"]`);
    if (wrongBtn) {
      wrongBtn.disabled = true;
      wrongBtn.classList.add('answer-btn--wrong', 'answer-btn--shake');
      setTimeout(() => {
        wrongBtn.classList.remove('answer-btn--wrong', 'answer-btn--shake');
        wrongBtn.disabled = false;
      }, 650);
    }
    return;
  }

  // Correct: lock all buttons permanently with full visual states
  document.querySelectorAll('.answer-btn').forEach(btn => {
    btn.disabled = true;
    const btnId  = btn.dataset.answer;
    const btnDef = quiz.answers.find(a => a.id === btnId);
    if (!btnDef) return;
    if (btnId === answerId) {
      btn.classList.add('answer-btn--correct');
    } else if (btnDef.correct) {
      btn.classList.add('answer-btn--missed');
    } else {
      btn.classList.add('answer-btn--dimmed');
    }
  });

  // Helper: inject explanation panel into quiz card
  function showExplanation() {
    const quizCard = document.querySelector('.quiz-card');
    if (quizCard) {
      const existing = quizCard.querySelector('.explanation-box');
      if (existing) existing.remove();
      const explDiv = document.createElement('div');
      explDiv.innerHTML = buildExplanationHtml(quiz, answerId);
      if (typeof lucide !== 'undefined') lucide.createIcons();
      quizCard.appendChild(explDiv.firstElementChild);
    }
  }

  // Reveal chart — animated for real data (correct answer), immediate for static
  if (correct && window._currentRealPattern) {
    // Animated sequential real-data reveal
    const { pattern, revealCandles, setupOhlc, setupLabels } = window._currentRealPattern;
    window._currentRealPattern = null;

    const decisionIndex   = setupOhlc.length - 1;
    const revealOhlcAll   = revealCandles.map(c => [c.open, c.close, c.low, c.high]);
    const revealLabelsAll = revealCandles.map(c => {
      const d = new Date(c.time);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // Save at module level so the replay button onclick always has fresh references
    _replaySetup  = { ohlc: setupOhlc,     labels: setupLabels };
    _replayReveal = { ohlc: revealOhlcAll, labels: revealLabelsAll, decisionIndex, pattern };
    _replayChart  = 'chart-quiz';

    // Disable Next during animation
    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) nextBtn.disabled = true;

    const badgeEl = document.querySelector('.chart-card-badge');
    if (badgeEl) badgeEl.textContent = 'Revealing…';

    const chartInst = charts['chart-quiz'];
    let revealCount = 0;
    const total = revealOhlcAll.length;

    const revealTimer = setInterval(() => {
      revealCount++;
      const visibleLabels = [...setupLabels, ...revealLabelsAll.slice(0, revealCount)];
      const revealData    = revealOhlcAll.slice(0, revealCount).map(c => {
        const isBull = c[1] >= c[0];
        return {
          value: c,
          itemStyle: {
            color:        'transparent',
            borderColor:  isBull ? TEAL : BEAR,
            borderWidth:  1.5,
            color0:       'transparent',
            borderColor0: BEAR
          }
        };
      });
      const seriesData = [...setupOhlc, ...revealData];

      if (chartInst) {
        chartInst.setOption({
          xAxis:  { data: visibleLabels },
          series: [{
            data: seriesData,
            markLine: {
              symbol: ['none', 'none'],
              silent: true,
              data: [
                [
                  { xAxis: decisionIndex, label: { show: true, formatter: 'Decision Point', color: TEAL, fontSize: 10, fontWeight: 700, position: 'insideEndTop' }, lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.8 } },
                  { xAxis: decisionIndex }
                ],
                ...(pattern.keyLevel ? [[
                  { yAxis: pattern.keyLevel, label: { show: true, formatter: pattern.patternLabel, color: TEAL, fontSize: 10, fontWeight: 600, position: 'end' }, lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.75 } },
                  { yAxis: pattern.keyLevel }
                ]] : [])
              ]
            }
          }]
        }, { notMerge: false });
      }

      if (revealCount >= total) {
        clearInterval(revealTimer);
        if (badgeEl) badgeEl.textContent = 'Revealed';

        // Glow on chart container
        const chartEl = document.getElementById('chart-quiz');
        if (chartEl) {
          chartEl.style.transition = 'box-shadow 0.3s ease';
          chartEl.style.boxShadow  = '0 0 18px 4px rgba(0,212,212,0.45)';
          setTimeout(() => { chartEl.style.boxShadow = ''; }, 1400);
        }

        // Show explanation after full reveal
        showExplanation();
        // Re-enable Next now that animation is done
        updateNextBtn();

        // Replay button — re-runs the wireframe reveal from scratch
        const quizCard = document.getElementById('chart-quiz')?.closest('.chart-card');
        if (quizCard && !quizCard.querySelector('.chart-replay-btn')) {
          const replayBtn = document.createElement('button');
          replayBtn.className = 'chart-replay-btn';
          replayBtn.innerHTML = '<i data-lucide="rotate-ccw"></i> Replay';
          quizCard.appendChild(replayBtn);
          if (typeof lucide !== 'undefined') lucide.createIcons();
          replayBtn.onclick = () => {
            if (_replayInterval) { clearInterval(_replayInterval); _replayInterval = null; }
            if (!_replaySetup || !_replayReveal || !_replayChart) return;
            replayBtn.style.display = 'none';

            // Reset chart to setup candles only, clear decision line
            const liveInst = charts[_replayChart];
            if (liveInst) {
              liveInst.setOption({
                xAxis:  { data: _replaySetup.labels },
                series: [{ data: _replaySetup.ohlc, markLine: { data: [] } }]
              }, { notMerge: false });
            }

            let rc = 0;
            const rTotal = _replayReveal.ohlc.length;

            setTimeout(() => {
              _replayInterval = setInterval(() => {
                rc++;
                const vl = [..._replaySetup.labels, ..._replayReveal.labels.slice(0, rc)];
                const rd = _replayReveal.ohlc.slice(0, rc).map(c => {
                  const isBull = c[1] >= c[0];
                  return {
                    value: c,
                    itemStyle: {
                      color:        'transparent',
                      borderColor:  isBull ? TEAL : BEAR,
                      borderWidth:  1.5,
                      color0:       'transparent',
                      borderColor0: BEAR
                    }
                  };
                });
                const inst = charts[_replayChart];
                if (inst) {
                  inst.setOption({
                    xAxis:  { data: vl },
                    series: [{
                      data: [..._replaySetup.ohlc, ...rd],
                      markLine: {
                        symbol: ['none', 'none'],
                        silent: true,
                        data: [
                          [
                            { xAxis: _replayReveal.decisionIndex, label: { show: true, formatter: 'Decision Point', color: TEAL, fontSize: 10, fontWeight: 700, position: 'insideEndTop' }, lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.8 } },
                            { xAxis: _replayReveal.decisionIndex }
                          ],
                          ...(_replayReveal.pattern.keyLevel ? [[
                            { yAxis: _replayReveal.pattern.keyLevel, label: { show: true, formatter: _replayReveal.pattern.patternLabel, color: TEAL, fontSize: 10, fontWeight: 600, position: 'end' }, lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.75 } },
                            { yAxis: _replayReveal.pattern.keyLevel }
                          ]] : [])
                        ]
                      }
                    }]
                  }, { notMerge: false });
                }
                if (rc >= rTotal) {
                  clearInterval(_replayInterval);
                  _replayInterval = null;
                  replayBtn.style.display = 'flex';
                }
              }, 280);
            }, 300);
          };
        }
      }
    }, 280);

  } else {
    // Synthetic (simulation) path — deliberate candle-by-candle reveal so the
    // outcome lands as a moment (was an instant pop), then explanation + glow.
    const def     = { ...quiz.chart, revealMarkPoints: quiz.revealMarkPoints || [] };
    const badgeEl = document.querySelector('.chart-card-badge');
    if (def.cutIndex != null && def.cutIndex < def.ohlc.length) {
      window._ltRevealing = true;
      if (badgeEl) badgeEl.textContent = 'Revealing…';
      updateNavButtons();
      _animateSyntheticReveal('chart-quiz', def, () => {
        window._ltRevealing = false;
        if (badgeEl) badgeEl.textContent = 'Revealed';
        showExplanation();
        updateNextBtn();
        _addReplayBtn('chart-quiz', def);
      });
    } else {
      revealChart('chart-quiz', def);
      if (badgeEl) badgeEl.textContent = 'Revealed';
      showExplanation();
    }
  }

  // Save progress — quizCorrect only becomes true on a correct answer
  markQuizAnswered(state.chapter, answerId, correct);
  // quizAnsweredThisStep reflects correct-only so updateNavButtons gates properly
  state.quizAnsweredThisStep = correct;

  // Update UI — Next button enabled only after a correct answer
  updateProgressUI();
  updateSidebar();
  updateNextBtn();
};

/* ══════════════════════════════════════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════════════════════════════════════ */
function navigate(direction) {
  // The simulator / settings own #content-area while open — don't let course
  // navigation (arrow keys, Prev/Next) render over them and destroy that view.
  if (state.view !== 'course') return;
  const prev  = { chapter: state.chapter, step: state.step };
  let ch      = state.chapter;
  let step    = state.step;

  if (direction === 'next') {
    const chObj = CHAPTERS[ch];
    const kind  = stepKindAt(chObj, step);
    const atLastStep = step >= lastStepIdx(chObj);

    // Scenario gate — cannot advance past the chart decision without a correct answer.
    if (kind === 'scenario') {
      const prog = state.progress[ch];
      if (!prog || !prog.quizCorrect) {
        showToast('Answer the question to continue');
        return;
      }
    }

    // A chapter completes when its FINAL step is left via Next. Reaching that step
    // already required clearing the Scenario gate, so completion is legitimate. (The
    // module Quiz, when it is the final step, is intentionally ungated — learners may
    // "skip forward anyway" from its results panel.)
    if (atLastStep) {
      markChapterCompleted(ch);
      // (progress/sidebar refresh happens once in the shared tail below — this
      // path used to rebuild the sidebar TWICE per chapter completion)
      if (allChaptersComplete()) {
        setTimeout(() => showToast('<i data-lucide="check-circle" style="width:14px;height:14px;"></i> Course complete!'), 800);
        setTimeout(() => maybeShowBackupReminder(getActiveCourseNum()), 1900);
      }
    }
    step++;
    if (step > lastStepIdx(CHAPTERS[ch])) {
      step = 0;
      ch++;
      if (ch >= CHAPTERS.length) {
        // End of course — refresh here since we return before the shared tail.
        updateProgressUI();
        updateSidebar();
        showToast('Course complete!', 3000, 'award');
        return;
      }
    }
  } else {
    step--;
    if (step < 0) {
      ch--;
      if (ch < 0) return;
      step = lastStepIdx(CHAPTERS[ch]);
    }
  }

  const chapterChanged = ch !== prev.chapter;
  state.chapter = ch;
  state.step    = step;
  state.quizAnsweredThisStep = false;

  markChapterStarted(ch);
  saveState();

  renderCurrentStep();
  updateHeaderUI();
  updateProgressUI();
  // Same-chapter step moves don't change any sidebar row — renderCurrentStep
  // already refreshed the step pills/dots. Only rebuild on a chapter change.
  if (chapterChanged) updateSidebar(); else scrollActiveChapterIntoView();
  updateNavButtons();
  scrollContentToTop();
}

function jumpToChapter(chapterIdx) {
  // Mirror the sidebar's unlock rule (!prevDone && !isStarted → locked): a
  // chapter that was started via deep link / ltOpenChapter must stay clickable,
  // otherwise the sidebar shows it unlocked but clicks bounce (B3).
  if (chapterIdx === 0 || isChapterCompleted(chapterIdx - 1) || isChapterStarted(chapterIdx)) {
    state.chapter = chapterIdx;
    state.step    = 0;
    state.quizAnsweredThisStep = false;

    markChapterStarted(chapterIdx);
    saveState();

    renderCurrentStep();
    updateHeaderUI();
    updateProgressUI();
    updateSidebar();
    updateNavButtons();
    scrollContentToTop();
    closeSidebar();
  } else {
    showToast('Complete the previous session first.', 3000, 'lock');
  }
}

/* Jump between steps (Introduction / Lesson / Quiz) within the CURRENT chapter —
   driven by the step pills now shown in the sidebar under the active chapter. */
window.goToStep = function(stepIdx) {
  if (state.view !== 'course') return;
  const chapter = currentChapter();
  if (stepIdx < 0 || stepIdx > lastStepIdx(chapter) || stepIdx === state.step) return;
  state.step = stepIdx;
  const prog = state.progress[state.chapter];
  state.quizAnsweredThisStep = stepKindAt(chapter, stepIdx) === 'scenario' && !!(prog && prog.quizCorrect);

  markChapterStarted(state.chapter);
  saveState();

  renderCurrentStep();
  updateHeaderUI();
  updateProgressUI();
  // Step pills/dots were refreshed by renderCurrentStep; the chapter rows are
  // untouched by an intra-chapter step jump — no sidebar rebuild needed.
  updateNavButtons();
  scrollContentToTop();
};

function scrollContentToTop() {
  const ca = document.getElementById('content-area');
  if (ca) ca.scrollTop = 0;
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDER DISPATCH
   ══════════════════════════════════════════════════════════════════════════ */
function renderCurrentStep() {
  state.view = 'course';   // course content now owns #content-area
  setHomeNavActive();
  disposeAllCharts();
  const chapter = CHAPTERS[state.chapter];
  if (!chapter) return;

  // Warm this course's v2 animated-lesson files so the Lesson step mounts instantly.
  ensureV2LessonsLoaded(getActiveCourseNum());

  const kind = stepKindAt(chapter, state.step);
  if (kind === 'intro') {
    renderIntro(chapter);
  } else if (kind === 'demo') {
    renderDemo(chapter);        // a bespoke interactive section (its own step)
  } else if (kind === 'lesson') {
    renderV2Lesson(chapter);    // the v2 animated lesson IS the lesson (every chapter maps to one)
  } else if (kind === 'scenario') {
    const prog = state.progress[state.chapter];
    if (prog && prog.quizCorrect) state.quizAnsweredThisStep = true;
    renderQuiz(chapter);        // the chart "Scenario" — a single decision-point question
  } else { // quiz — the module's multi-question Learning Assessment
    renderModuleQuiz(chapter);
  }
  updateStepPills();
  updateStepDots();
  // Keep the Next button's gate state in sync with the rendered step.
  updateNavButtons();
  // If we arrived here from a glossary reference, flash the referenced term in view.
  if (window._ltGlossaryHighlight) setTimeout(_ltFlashGlossaryTerm, 120);
}

/* Flash-highlight a term in the rendered content — fires ONLY right after a glossary
   module-reference jump (window._ltGlossaryHighlight set by the glossary). Best-effort:
   scans the visible text for the term/aliases, wraps the first match, scrolls to it. */
function _ltFlashGlossaryTerm() {
  const pend = window._ltGlossaryHighlight;
  window._ltGlossaryHighlight = null;                       // one attempt per jump
  if (!pend || !pend.terms || !pend.terms.length || (Date.now() - (pend.ts || 0) > 6000)) return;
  const area = document.getElementById('content-area');
  if (!area) return;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const terms = pend.terms.filter(Boolean).sort((a, b) => b.length - a.length).map(esc);
  let re; try { re = new RegExp('(?<![\\w-])(' + terms.join('|') + ')(?![\\w-])', 'i'); } catch (e) { return; }
  const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if (!p || /^(SCRIPT|STYLE|CANVAS|MARK)$/.test(p.tagName) || p.closest('.lt-gl-flash')) return NodeFilter.FILTER_REJECT;
      return re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const node = walker.nextNode();
  if (!node) return;                                        // not on this screen — leave the jump as-is
  const m = re.exec(node.nodeValue);
  if (!m) return;
  const span = document.createElement('span');
  span.className = 'lt-gl-flash';
  span.textContent = node.nodeValue.slice(m.index, m.index + m[0].length);
  const frag = document.createDocumentFragment();
  const before = node.nodeValue.slice(0, m.index), after = node.nodeValue.slice(m.index + m[0].length);
  if (before) frag.appendChild(document.createTextNode(before));
  frag.appendChild(span);
  if (after) frag.appendChild(document.createTextNode(after));
  node.parentNode.replaceChild(frag, node);
  setTimeout(() => { try { span.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} }, 60);
}

function setContent(html) {
  const ca = document.getElementById('content-area');
  if (ca) ca.innerHTML = html;
}

/* ══════════════════════════════════════════════════════════════════════════
   HEADER UI
   ══════════════════════════════════════════════════════════════════════════ */
/* Per-course identity accent (course 1 teal, 2 gold, 3 purple, 4 red). Drives
   the header's accent (header tag, step pills, progress bar) via --course-accent.
   Light mode uses deeper variants so the accents stay legible on white. */
/* Miami Vice neon spectrum: cyan → hot-pink → purple → sunset-coral.
   Cyan stays the brand primary (C1); light variants are deepened for white. */
function ltCourseAccent(n) {
  const def = LT_COURSES.find(c => c.num === n);
  const c = def && (_ltIsLight() ? def.accentLight : def.accent);
  return c || (_ltIsLight() ? '#0d9488' : '#00d4d4');
}
function applyCourseAccent() {
  document.documentElement.style.setProperty('--course-accent', ltCourseAccent(getActiveCourseNum()));
}

function updateHeaderUI() {
  applyCourseAccent();
  const chapter = CHAPTERS[state.chapter];
  if (!chapter) return;

  const tagEl   = document.getElementById('header-tag');
  const titleEl = document.getElementById('header-title');
  const countEl = document.getElementById('chapter-counter');

  if (tagEl)   tagEl.textContent   = chapter.tag;
  if (titleEl) titleEl.textContent = chapter.title;
  if (countEl) countEl.textContent = `${state.chapter + 1} / ${CHAPTERS.length}`;
}

/* Hub/tool views (Home, Glossary, Flashcards, Simulator, Community, Settings)
   share one header treatment: a "Learning Hub" eyebrow + the page name. Without
   this, a hub view would keep whatever chapter title was last shown in the header. */
function setHubHeader(pageName) {
  applyCourseAccent();
  const tagEl   = document.getElementById('header-tag');
  const titleEl = document.getElementById('header-title');
  if (tagEl)   tagEl.textContent   = 'Learning Hub';
  if (titleEl) titleEl.textContent = pageName;
}

// Step indicators now live in the sidebar, under the active chapter (see buildSidebar).
function stepPillsHtml() {
  return chapterStepLabels(currentChapter()).map((label, i) => {
    let cls = 'sb-step';
    if (i === state.step) cls += ' sb-step--active';
    else if (i < state.step) cls += ' sb-step--done';
    return `<button class="${cls}" type="button"${i === state.step ? ' aria-current="step"' : ''} onclick="goToStep(${i})">${label}</button>`;
  }).join('');
}

function updateStepPills() {
  const container = document.getElementById('sidebar-step-pills');
  if (!container) return;
  container.innerHTML = stepPillsHtml();
}

function updateStepDots() {
  const container = document.getElementById('step-dots');
  if (!container) return;
  container.innerHTML = chapterStepLabels(currentChapter()).map((_, i) => {
    let cls = 'step-dot';
    if (i === state.step) cls += ' step-dot--active';
    else if (i < state.step) cls += ' step-dot--done';
    return `<div class="${cls}"></div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════════════════
   PROGRESS BARS
   ══════════════════════════════════════════════════════════════════════════ */
function updateProgressUI() {
  // Global bar
  const fill   = document.getElementById('global-progress-fill');
  const track  = document.querySelector('.global-progress-track');
  const pct    = globalProgress();
  if (fill) {
    // On the Home hub the strip becomes a full-width flowing-gradient accent (.is-home);
    // everywhere else it's the real progress fill.
    const isHome = state.view === 'home';
    fill.classList.toggle('is-home', isHome);
    fill.style.width = isHome ? '' : pct + '%';
  }
  if (track) track.setAttribute('aria-valuenow', pct);

  // Sidebar bar
  const count  = completedCount();
  const sbFill = document.getElementById('sidebar-progress-bar');
  const sbText = document.getElementById('sidebar-progress-text');
  const sbPct  = Math.round((count / CHAPTERS.length) * 100);
  if (sbFill) sbFill.style.width = sbPct + '%';
  if (sbText) sbText.textContent = `${count} / ${CHAPTERS.length} completed`;

}

/* ══════════════════════════════════════════════════════════════════════════
   NAV BUTTONS
   ══════════════════════════════════════════════════════════════════════════ */
function updateNavButtons() {
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');

  if (prevBtn) {
    prevBtn.disabled = (state.chapter === 0 && state.step === 0);
  }

  if (nextBtn) {
    const chapter   = currentChapter();
    const kind      = stepKindAt(chapter, state.step);
    const atLastStep = state.step >= lastStepIdx(chapter);
    const isVeryLast = (state.chapter === CHAPTERS.length - 1 && atLastStep);
    const nextLabel = document.querySelector('#btn-next .nav-label');
    if (isVeryLast) {
      if (nextLabel) nextLabel.textContent = 'Finish';
    } else if (atLastStep) {
      if (nextLabel) nextLabel.textContent = 'Next Session';
    } else {
      if (nextLabel) nextLabel.textContent = 'Next';
    }
    const prog = state.progress[state.chapter];
    // Only the Scenario gates Next (until answered correctly); the module Quiz is
    // ungated (skip-forward). Also held while a reveal animation is mid-flight.
    const scenarioGate = kind === 'scenario' && !(prog && prog.quizCorrect);
    nextBtn.disabled = scenarioGate || !!window._ltRevealing;
  }
}

function updateNextBtn() {
  updateNavButtons();
}

/* ══════════════════════════════════════════════════════════════════════════
   SIDEBAR
   ══════════════════════════════════════════════════════════════════════════ */
/* Inactive courses' saved progress, memoized — buildSidebar runs on every chapter
   change and re-parsing 3 courses' state blobs each time is waste. Invalidated on
   course switch and by settings' mark-complete / reset (ltSidebarInvalidate). */
let _sbProgCache = {};
window.ltSidebarInvalidate = function (n) {
  if (n == null) _sbProgCache = {}; else delete _sbProgCache[n];
};

/* Settings' "Mark Complete" / "Reset" writes a course's progress straight to
   localStorage. For the ACTIVE course the engine ALSO holds progress in memory
   (state.progress); the next saveState() would flush that stale copy back over
   storage and revert the change — the "current course won't mark complete" bug.
   After such a write, re-sync the in-memory copy from storage so the change sticks
   and the sidebar reflects it immediately. */
window.ltResyncActiveCourseState = function () {
  try {
    const saved = loadState();                        // reads the active course's storage key
    state.progress = (saved && saved.progress) ? saved.progress : {};
    if (typeof buildSidebar === 'function') buildSidebar();
  } catch (_) {}
};

function buildSidebar() {
  const nav = document.getElementById('chapter-list');
  if (!nav) return;

  // Hide legacy course-select if still in DOM
  const legacySel = document.getElementById('course-select');
  if (legacySel) legacySel.style.display = 'none';

  const activeCourseNum = getActiveCourseNum();

  function getProgressForCourse(courseNum) {
    if (courseNum === activeCourseNum) return state.progress;
    if (_sbProgCache[courseNum]) return _sbProgCache[courseNum];
    try {
      const key = courseStateKey(courseNum);
      const raw = localStorage.getItem(key);
      return (_sbProgCache[courseNum] = raw ? (JSON.parse(raw).progress || {}) : {});
    } catch(_) { return {}; }
  }

  function renderChapters(chapters, courseNum) {
    const prog = getProgressForCourse(courseNum);
    return chapters.map((ch, i) => {
      const p           = prog[i];
      const isCompleted = !!(p && p.completed);
      const isStarted   = !!(p);
      const prevDone    = i === 0 || !!(prog[i - 1] && prog[i - 1].completed);
      const isLocked    = !prevDone && !isStarted;
      const isCurrent   = courseNum === activeCourseNum && i === state.chapter;
      const correct     = p && p.quizCorrect;
      const answered    = p && p.quizAnswered;

      let statusIcon = '';
      if (isLocked)                                statusIcon = '<span class="chapter-status" title="Locked"><i data-lucide="lock" style="width:16px;height:16px;color:#555555;"></i></span>';
      else if (isCompleted && answered && correct) statusIcon = '<span class="chapter-status" title="Passed"><i data-lucide="check" style="width:16px;height:16px;color:#00c878;"></i></span>';
      else if (isCompleted && answered)            statusIcon = '<span class="chapter-status" title="Reviewed"><i data-lucide="check" style="width:16px;height:16px;color:#00c878;"></i></span>';
      else if (isCompleted)                        statusIcon = '<span class="chapter-status" title="Complete"><i data-lucide="check" style="width:16px;height:16px;color:#00c878;"></i></span>';
      else if (isCurrent)                          statusIcon = '<span class="chapter-status" title="In Progress"><i data-lucide="clock" style="width:16px;height:16px;color:#c8960c;"></i></span>';

      // Sessions with a bespoke interactive lab (chapter.demo) get a small flask
      // marker on the tag line so the lab is discoverable while the row is collapsed.
      const labMarker = (ch && ch.demo)
        ? ` <span class="chapter-lab" style="color:${ltCourseAccent(courseNum)}" title="Interactive lab: ${ch.demo.label || 'Lab'}" aria-label="Includes an interactive lab"><i data-lucide="flask-conical"></i></span>`
        : '';

      let cls = 'chapter-item chapter-item--indented';
      if (isCurrent)   cls += ' chapter-item--active';
      if (isLocked)    cls += ' chapter-item--locked';
      if (isCompleted) cls += ' chapter-item--completed';

      // The active chapter expands to show its Introduction / Lesson / Quiz steps,
      // which used to live in the top-right header.
      const stepsBlock = isCurrent
        ? `<div class="chapter-steps" id="sidebar-step-pills">${stepPillsHtml()}</div>`
        : '';

      return `
        <div class="${cls}" role="button" tabindex="0"${isCurrent ? ' aria-current="page"' : ''} data-course="${courseNum}" data-chapter="${i}" onclick="jumpToCourseChapter(${courseNum},${i})" title="${ch.title}" aria-label="${ch.title}">
          <span class="chapter-num" style="color:${ltCourseAccent(courseNum)}">${String(i + 1).padStart(2, '0')}</span>
          <div class="chapter-item-info">
            <div class="chapter-item-title">${ch.title}</div>
            <div class="chapter-item-tag">${ch.tag}${labMarker}</div>
          </div>
          ${statusIcon}
        </div>${stepsBlock}`;
    }).join('');
  }

  const _accordionLabels = {
    1: 'Course 1: Laying the Foundation',
    2: 'Course 2: Building Your Toolbox',
    3: 'Course 3: Sharpening Your Edge',
    4: 'Course 4: ' + (typeof COURSE4_META !== 'undefined' ? COURSE4_META.subtitle : 'Advanced Mastery')
  };
  const courseDefs = LT_COURSES
    .filter(c => c.chapters)
    .map(c => ({ num: c.num, label: _accordionLabels[c.num], chapters: c.chapters }));

  // Open the active course's dropdown only when actually inside a course — on the
  // hub it stays collapsed (re-opens where it was on return).
  nav.innerHTML = courseDefs.map(c => {
    const isActive = c.num === activeCourseNum;
    const isOpen   = isActive && state.view === 'course';
    const accent   = ltCourseAccent(c.num);
    return `
      <div class="course-accordion${isActive ? ' course-accordion--active' : ''}" data-course="${c.num}">
        <div class="course-accordion-header" role="button" tabindex="0" onclick="toggleCourseAccordion(${c.num})">
          <span class="course-accordion-label"><span style="color:${accent}">${c.label.split(':')[0]}:</span><span class="course-accordion-name"> ${c.label.split(':').slice(1).join(':').trim()}</span>${c.num === 4 ? '<span class="sb-adv">Advanced</span>' : ''}</span>
          <span class="course-accordion-chevron${isOpen ? ' course-accordion-chevron--open' : ''}" style="color:${accent}">
            <i data-lucide="chevron-right" style="width:16px;height:16px;"></i>
          </span>
        </div>
        <div class="course-accordion-body${isOpen ? ' course-accordion-body--open' : ''}">
          ${renderChapters(c.chapters, c.num)}
        </div>
      </div>`;
  }).join('');


  if (typeof lucide !== 'undefined') lucide.createIcons();
  requestAnimationFrame(scrollActiveChapterIntoView);
}

/* Keep the active chapter (and its step pills) in view as the learner progresses,
   scrolling the sidebar's chapter list only when the active item drifts out of view. */
function scrollActiveChapterIntoView() {
  const list = document.getElementById('chapter-list');
  if (!list) return;
  const active = list.querySelector('.chapter-item--active');
  if (!active) return;
  const steps    = document.getElementById('sidebar-step-pills'); // sits just below the active chapter
  const listRect = list.getBoundingClientRect();
  const aRect    = active.getBoundingClientRect();
  const bRect    = steps ? steps.getBoundingClientRect() : aRect;
  const margin   = 10;

  let delta = 0;
  if (aRect.top < listRect.top + margin) {
    delta = aRect.top - (listRect.top + margin);            // active scrolled above the viewport
  } else if (bRect.bottom > listRect.bottom - margin) {
    delta = bRect.bottom - (listRect.bottom - margin);      // active/steps fell below the viewport
  }
  if (Math.abs(delta) > 1) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollBy({ top: delta, behavior: reduce ? 'auto' : 'smooth' });
  }
}

function updateSidebar() {
  buildSidebar();
}

function openSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const toggle   = document.getElementById('sidebar-toggle');
  if (sidebar) sidebar.classList.add('sidebar--open');
  if (overlay) overlay.classList.remove('hidden');
  if (toggle)  toggle.setAttribute('aria-expanded', 'true');
}

/* Hamburger behaviour: on mobile it opens/closes the off-canvas sidebar; on
   desktop it collapses/expands the sidebar for a wider, focused reading area. */
function toggleSidebar() {
  if (window.matchMedia('(max-width: 768px)').matches) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('sidebar--open')) closeSidebar();
    else openSidebar();
    return;
  }
  const layout = document.querySelector('.app-layout');
  if (!layout) return;
  const collapsed = layout.classList.toggle('sidebar-collapsed');
  try { LTStore.set('sidebarCollapsed', collapsed ? '1' : '0'); } catch(_) {}
  const toggle = document.getElementById('sidebar-toggle');
  if (toggle) toggle.setAttribute('aria-expanded', String(!collapsed));
  // Charts need to re-measure once the layout finishes animating
  setTimeout(() => { Object.values(charts).forEach(c => { try { c.resize(); } catch(_) {} }); }, 320);
}

function closeSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const toggle   = document.getElementById('sidebar-toggle');
  if (sidebar) sidebar.classList.remove('sidebar--open');
  if (overlay) overlay.classList.add('hidden');
  if (toggle)  toggle.setAttribute('aria-expanded', 'false');
}

/* ══════════════════════════════════════════════════════════════════════════
   TOAST
   ══════════════════════════════════════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg, duration = 3000, icon) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.innerHTML = icon ? `<i data-lucide="${icon}"></i><span>${msg}</span>` : msg;
  el.classList.remove('hidden');
  if (icon && typeof lucide !== 'undefined') { try { lucide.createIcons(); } catch(_) {} }
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

/* ══════════════════════════════════════════════════════════════════════════
   WELCOME BACK MODAL — removed 2026-07-01 (showWelcomeModal had no callers; the
   home hub's "Continue learning" card is the resume path).
   ══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════
   FINAL EXAM — removed 2026-07-02 (owner decision). getCourseName stays: the
   flashcards deck header uses it.
   ══════════════════════════════════════════════════════════════════════════ */
function getCourseName() {
  const n = getActiveCourseNum();
  if (n === 4 && typeof COURSE4_META !== 'undefined') return COURSE4_META.title;
  if (n === 3 && typeof COURSE3_META !== 'undefined') return COURSE3_META.title;
  if (n === 2 && typeof COURSE2_META !== 'undefined') return COURSE2_META.title;
  return 'Course 1: Laying the Foundation';
}

/* ══════════════════════════════════════════════════════════════════════════
   CHART EXPAND / COLLAPSE
   ══════════════════════════════════════════════════════════════════════════ */
function injectChartStyles() {
  if (document.getElementById('lt-chart-expand-styles')) return;
  const s = document.createElement('style');
  s.id = 'lt-chart-expand-styles';
  s.textContent = `
    .chart-card-header { display:flex; align-items:center; gap:8px; }
    .chart-expand-btn {
      background: transparent;
      border: 1px solid #1a1a2e;
      border-radius: 6px;
      color: #5a5a78;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3px 4px;
      margin-left: auto;
      flex-shrink: 0;
      line-height: 0;
      transition: color 0.2s, border-color 0.2s;
    }
    .chart-expand-btn:hover { color: var(--teal, #00d4d4); border-color: var(--teal, #00d4d4); }
    .chart-el { transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
    .chart-card { transition: max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
    .intro-layout.chart-layout-expanded { grid-template-columns: 1fr !important; }
    .intro-layout--theater { grid-template-columns: 1fr !important; transition: grid-template-columns 0.3s ease; }
    .intro-layout--theater .chart-card { max-width: 100% !important; order: 1; }
    .intro-layout--theater .content-card { order: 2; margin-top: 12px; }
    .intro-video-wrap { margin-top: 16px; }
    .intro-video-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px solid rgba(255,0,0,0.35);
      border-radius: 20px;
      color: #9494b0;
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      padding: 4px 12px 4px 8px;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s, background 0.2s;
    }
    .intro-video-btn:hover { border-color: #FF0000; color: #e4e4f0; background: rgba(255,0,0,0.06); }
    .intro-video-frame-wrap { margin-top: 8px; }
    .intro-video-close {
      display: block;
      margin: 6px 0 0 auto;
      background: transparent;
      border: none;
      color: #5a5a78;
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      cursor: pointer;
      padding: 2px 0;
      transition: color 0.15s;
    }
    .intro-video-close:hover { color: #9494b0; }
  `;
  document.head.appendChild(s);
}

window.toggleChartExpand = function(id) {
  const chartEl = document.getElementById(id);
  const card    = chartEl?.closest('.chart-card');
  const btn     = document.getElementById('expand-' + id);
  if (!card || !btn) return;

  const isExpanded = card.dataset.expanded === '1';
  const layout     = card.closest('.intro-layout');

  if (isExpanded) {
    // ── Collapse ──────────────────────────────────────────────
    card.dataset.expanded = '0';
    card.style.maxWidth   = '960px';
    // Restore original height: inline configured value or clear to CSS class
    const confH = chartEl.dataset.configuredHeight;
    chartEl.style.height = confH ? confH + 'px' : '';
    btn.innerHTML = '<i data-lucide="maximize-2" style="width:14px;height:14px;"></i>';
    btn.title     = 'Expand chart';
    if (layout) layout.classList.remove('chart-layout-expanded');
  } else {
    // ── Expand ────────────────────────────────────────────────
    card.dataset.expanded = '1';
    // Snapshot current rendered height before we change anything
    if (!chartEl.dataset.origHeight) {
      chartEl.dataset.origHeight = String(chartEl.offsetHeight);
    }
    card.style.maxWidth  = '100%';
    chartEl.style.height = '600px';
    btn.innerHTML = '<i data-lucide="minimize-2" style="width:14px;height:14px;"></i>';
    btn.title     = 'Minimize chart';
    if (layout) layout.classList.add('chart-layout-expanded');
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
  // Resize ECharts instance after CSS transition completes
  setTimeout(() => {
    const inst = charts[id];
    if (inst) inst.resize();
  }, 360);
};

/* ══════════════════════════════════════════════════════════════════════════
   EVENT LISTENERS — wired up after DOM ready
   ══════════════════════════════════════════════════════════════════════════ */
function wireEvents() {
  injectChartStyles();

  // Keyboard activation for custom (div) buttons — Enter/Space triggers click,
  // so the chapter list and course accordions are operable without a mouse.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    const el = e.target;
    if (el && el.getAttribute && el.getAttribute('role') === 'button' && el.hasAttribute('tabindex')) {
      e.preventDefault();
      el.click();
    }
  });

  // Nav buttons
  document.getElementById('btn-prev')?.addEventListener('click', () => navigate('prev'));
  document.getElementById('btn-next')?.addEventListener('click', () => navigate('next'));

  // Sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-close')?.addEventListener('click', closeSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);


  // Keyboard nav
  document.addEventListener('keydown', e => {
    if (state.view !== 'course') return;
    if (window._ltRevealing) return;   // match the disabled Next button during reveals (B8)
    // Don't hijack arrow keys while the user is editing an input (e.g. SL/TP).
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    // On the lesson step the v2 player owns ←/→ (beat navigation); ↑/↓ still move steps.
    const onPlayer = !!_v2Player && stepKindAt(CHAPTERS[state.chapter], state.step) === 'lesson';
    if ((e.key === 'ArrowRight' && !onPlayer) || e.key === 'ArrowDown') navigate('next');
    if ((e.key === 'ArrowLeft'  && !onPlayer) || e.key === 'ArrowUp')   navigate('prev');
  });

  // (global chart-resize loop removed 2026-07-01 — every chart already has its own
  //  ResizeObserver (renderChart), so a window resize double-fired resize() per chart)

}

/* ═══════════════════════════════════════════════════════════════════════
   COURSE ACCORDION
   ═══════════════════════════════════════════════════════════════════════ */
function switchActiveCourse(courseNum, targetChapter) {
  saveState();
  _sbProgCache = {};   // the previously-active course becomes "inactive" with fresh state
  LTStore.set('activeCourse', String(courseNum));
  CHAPTERS = courseChapters(courseNum);
  const key = courseStateKey(courseNum);
  let restored = { chapter: 0, step: 0, progress: {} };
  try {
    const raw = localStorage.getItem(key);
    if (raw) { const p = JSON.parse(raw); restored = { chapter: p.chapter || 0, step: p.step || 0, progress: p.progress || {} }; }
  } catch(_) {}
  Object.assign(state, restored, { quizAnsweredThisStep: false });
  // Deep-link: jump straight to a specific chapter (used by the glossary).
  if (typeof targetChapter === 'number' && targetChapter >= 0 && targetChapter < CHAPTERS.length) {
    state.chapter = targetChapter;
    state.step = 0;
    state.quizAnsweredThisStep = false;
    if (!state.progress[targetChapter]) state.progress[targetChapter] = { completed:false, quizAnswered:false, quizCorrect:false, quizAnswer:null };
  }
  if (stepKindAt(CHAPTERS[state.chapter], state.step) === 'scenario') {
    const prog = state.progress[state.chapter];
    state.quizAnsweredThisStep = !!(prog && prog.quizCorrect);
  }
  buildSidebar();
  updateHeaderUI();
  updateProgressUI();
  updateNavButtons();
  updateStepPills();
  updateStepDots();
  renderCurrentStep();
}

window.toggleCourseAccordion = function(courseNum) {
  const activeCourseNum = getActiveCourseNum();
  if (courseNum !== activeCourseNum) {
    switchActiveCourse(courseNum);
    return;
  }
  // Toggle expand/collapse of the active course's body without switching
  const el = document.querySelector(`.course-accordion[data-course="${courseNum}"]`);
  if (!el) return;
  el.querySelector('.course-accordion-body')?.classList.toggle('course-accordion-body--open');
  el.querySelector('.course-accordion-chevron')?.classList.toggle('course-accordion-chevron--open');
};

window.jumpToCourseChapter = function(courseNum, chIdx) {
  const activeCourseNum = getActiveCourseNum();
  if (courseNum !== activeCourseNum) {
    // Courses are always accessible — no completion requirement on any other course.
    // switchActiveCourse restores the saved position for the target course.
    switchActiveCourse(courseNum);
    return;
  }
  // Same course — within-course chapter ordering still applies.
  jumpToChapter(chIdx);
};

/* "Skip to here" (sidebar right-click) — mark every session BEFORE the target as
   complete so the chosen one unlocks, then open it. Handles the active course or
   any other (writing that course's stored state directly). */
window.ltSkipToChapter = function(courseNum, targetIdx) {
  if (typeof targetIdx !== 'number' || targetIdx < 0) return;
  const fresh = function() { return { completed: false, quizAnswered: false, quizCorrect: false, quizAnswer: null }; };

  if (courseNum === getActiveCourseNum()) {
    for (let i = 0; i < targetIdx; i++) {
      if (!state.progress[i]) state.progress[i] = fresh();
      state.progress[i].completed = true;
    }
    saveState();
    jumpToChapter(targetIdx);                    // now unlocked — opens the target session
  } else {
    const key = courseStateKey(courseNum);
    let saved = {};
    try { const raw = localStorage.getItem(key); if (raw) saved = JSON.parse(raw) || {}; } catch (_) {}
    const prog = saved.progress || {};
    for (let i = 0; i < targetIdx; i++) {
      if (!prog[i]) prog[i] = fresh();
      prog[i].completed = true;
    }
    saved.progress = prog;
    if (typeof saved.step !== 'number') saved.step = 0;
    try { localStorage.setItem(key, JSON.stringify(saved)); } catch (_) {}
    switchActiveCourse(courseNum, targetIdx);    // switch course + deep-link to the target
  }
  if (typeof showToast === 'function' && targetIdx > 0) {
    showToast('Skipped ahead — earlier sessions marked complete', 3000, 'check');
  }
};

/* One-shot "ignore the next click" — used after a long-press so the touch doesn't
   also fire the element's tap action (navigate / open course). The document-level
   capture listener added in _ltInitChapterContextMenu consumes it. */
function _ltSuppressNextClick() {
  window._ltSuppressClick = true;
  setTimeout(function () { window._ltSuppressClick = false; }, 700);
}

/* Right-click (desktop) OR long-press (touch) a sidebar session → a small
   "Skip to here" menu. Attached once to #chapter-list (persists across rebuilds). */
function _ltInitChapterContextMenu() {
  if (window._ltCtxInit) return;
  const list = document.getElementById('chapter-list');
  if (!list) return;
  window._ltCtxInit = true;

  const menu = document.createElement('div');
  menu.className = 'lt-ctx-menu hidden';
  menu.innerHTML =
    '<div class="lt-ctx-title" id="lt-ctx-title"></div>' +
    '<button class="lt-ctx-item" id="lt-ctx-skip" type="button">' +
      '<i data-lucide="fast-forward" style="width:14px;height:14px;"></i>' +
      '<span class="lt-ctx-item-text"><span class="lt-ctx-item-label">Skip to here</span><span class="lt-ctx-item-sub">Mark earlier sessions complete</span></span>' +
    '</button>';
  document.body.appendChild(menu);

  let ctxCourse = null, ctxChapter = null;
  const hide = function () { menu.classList.add('hidden'); };

  function openMenuFor(item, cx, cy) {
    ctxCourse  = parseInt(item.getAttribute('data-course'), 10);
    ctxChapter = parseInt(item.getAttribute('data-chapter'), 10);
    const titleEl = menu.querySelector('#lt-ctx-title');
    if (titleEl) titleEl.textContent = (item.querySelector('.chapter-item-title') || {}).textContent || 'Session';
    menu.classList.remove('hidden');
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let x = cx, y = cy;
    if (x + mw > window.innerWidth  - 8) x = window.innerWidth  - mw - 8;
    if (y + mh > window.innerHeight - 8) y = window.innerHeight - mh - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    menu.style.left = x + 'px';
    menu.style.top  = y + 'px';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // Desktop: right-click
  list.addEventListener('contextmenu', function (e) {
    const item = e.target.closest('.chapter-item[data-chapter]');
    if (!item) { hide(); return; }   // not a session → leave the browser menu alone
    e.preventDefault();
    openMenuFor(item, e.clientX, e.clientY);
  });

  // Touch: long-press (~480ms, cancelled by scroll/move)
  let lpTimer = null, lpXY = null;
  list.addEventListener('touchstart', function (e) {
    const item = e.target.closest('.chapter-item[data-chapter]');
    if (!item) return;
    const t = e.touches[0];
    lpXY = { x: t.clientX, y: t.clientY };
    lpTimer = setTimeout(function () {
      lpTimer = null;
      openMenuFor(item, lpXY.x, lpXY.y);
      _ltSuppressNextClick();                         // don't also navigate to the session
      if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e2) {} }
    }, 480);
  }, { passive: true });
  const lpCancel = function () { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };
  list.addEventListener('touchmove', function (e) {
    if (!lpTimer || !lpXY) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - lpXY.x) > 12 || Math.abs(t.clientY - lpXY.y) > 12) lpCancel();
  }, { passive: true });
  list.addEventListener('touchend', lpCancel);
  list.addEventListener('touchcancel', lpCancel);

  menu.querySelector('#lt-ctx-skip').addEventListener('click', function () {
    hide();
    if (ctxCourse != null && !isNaN(ctxChapter)) ltSkipToChapter(ctxCourse, ctxChapter);
  });

  // Shared: swallow the phantom click that follows a long-press (capture phase),
  // but never the deliberate tap on the menu's own buttons.
  document.addEventListener('click', function (e) {
    if (window._ltSuppressClick && !(e.target.closest && e.target.closest('.lt-ctx-menu'))) {
      window._ltSuppressClick = false; e.stopPropagation(); e.preventDefault();
    }
  }, true);

  // Dismiss the menu on outside click/touch, Escape, resize, or sidebar scroll
  const dismiss = function (e) { if (!menu.contains(e.target)) hide(); };
  document.addEventListener('click', dismiss);
  document.addEventListener('touchstart', dismiss, { passive: true });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  window.addEventListener('resize', hide);
  list.addEventListener('scroll', hide);
}

/* Touch: long-press a Home-hub course card to preview it in the Continue card
   (the touch equivalent of the desktop hover). Release restores the resting state. */
function _ltInitCourseTouchPeek() {
  if (window._ltCoursePeekInit) return;
  const area = document.getElementById('content-area');
  if (!area) return;
  window._ltCoursePeekInit = true;

  let timer = null, startXY = null, peeking = false;
  area.addEventListener('touchstart', function (e) {
    const card = e.target.closest('.lt-home-course-card[data-course]');
    if (!card || e.target.closest('.lt-home-course-share')) return;
    const num = parseInt(card.getAttribute('data-course'), 10);
    const t = e.touches[0];
    startXY = { x: t.clientX, y: t.clientY };
    timer = setTimeout(function () {
      timer = null;
      peeking = true;
      if (typeof ltPeekCourse === 'function') ltPeekCourse(num);
      _ltSuppressNextClick();                          // don't also open the course
      if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e2) {} }
    }, 420);
  }, { passive: true });
  area.addEventListener('touchmove', function (e) {
    if (!timer || !startXY) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - startXY.x) > 12 || Math.abs(t.clientY - startXY.y) > 12) { clearTimeout(timer); timer = null; }
  }, { passive: true });
  const endTouch = function () {
    if (timer) { clearTimeout(timer); timer = null; }
    if (peeking) { peeking = false; if (typeof ltPeekReset === 'function') ltPeekReset(); }
  };
  area.addEventListener('touchend', endTouch);
  area.addEventListener('touchcancel', endTouch);
}

/* ══════════════════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════════════════ */
/* True only when the saved state reflects ACTUAL progress — the user advanced
   past the first step or completed/answered something. Merely opening the app
   auto-creates progress[0] (all-false) via markChapterStarted(), which must NOT
   trigger the "Welcome back" modal for what is effectively a first-time visit. */
function hasMeaningfulProgress(saved) {
  if (!saved) return false;
  if (saved.chapter > 0 || saved.step > 0) return true;
  const prog = saved.progress || {};
  return Object.keys(prog).some(k => {
    const p = prog[k];
    return p && (p.completed || p.quizAnswered || p.quizCorrect);
  });
}

function init(checkSaved = true) {
  // Restore active course selection
  const savedCourse = LTStore.get('activeCourse');
  if (savedCourse) CHAPTERS = courseChapters(parseInt(savedCourse, 10));

  // Restore saved state FIRST — markChapterStarted() calls saveState() and would
  // overwrite localStorage before we ever read it if called before loadState().
  if (checkSaved) {
    const saved = loadState();
    if (saved && hasMeaningfulProgress(saved)) {
      // Clamp against the live chapter array — content edits can shrink it,
      // and an out-of-range restore blanks the view (B11).
      state.chapter  = Math.min(Math.max(saved.chapter || 0, 0), CHAPTERS.length - 1);
      state.step     = Math.min(Math.max(saved.step || 0, 0), lastStepIdx(CHAPTERS[state.chapter]));
      state.progress = saved.progress || {};
      // Restore quizAnsweredThisStep for the current Scenario step
      if (stepKindAt(CHAPTERS[state.chapter], state.step) === 'scenario') {
        const prog = state.progress[state.chapter];
        state.quizAnsweredThisStep = !!(prog && prog.quizCorrect);
      }
      markChapterStarted(state.chapter);
      buildSidebar();
      updateHeaderUI();
      updateProgressUI();
      updateNavButtons();
      updateStepPills();
      updateStepDots();
      // Land on the Home hub; its Continue card resumes this saved position.
      // (The old "Welcome back" modal is retired in favour of the hub.)
      showHome();
      return;
    }
  }

  // No saved state — fresh start
  markChapterStarted(state.chapter);
  buildSidebar();
  updateHeaderUI();
  updateProgressUI();
  updateNavButtons();
  updateStepPills();
  updateStepDots();
  showHome();
}

/* ══════════════════════════════════════════════════════════════════════════
   URL ROUTING — shareable deep links (?c=<course>&ch=<chapter>&s=<step>),
   plus ?t=<glossaryTermId> and ?view=<name>. The address bar is kept in sync as
   the learner navigates so any link can be copied and reopened.
   ══════════════════════════════════════════════════════════════════════════ */
const _LT_VIEW_PARAMS = ['glossary', 'simulator', 'community', 'flashcards', 'settings'];

function _ltCourseArray(n) {
  const def = LT_COURSES.find(c => c.num === n);
  return def ? (def.chapters || null) : LT_CHAPTERS;   // known-but-unloaded → null; unknown → Course 1
}
function _ltCourseKey(n) {
  return courseStateKey(n);
}

function _ltParseRoute() {
  try {
    const p = new URLSearchParams(location.search);
    if (p.has('c') && p.has('ch')) {
      const c = parseInt(p.get('c'), 10);
      const ch = parseInt(p.get('ch'), 10);
      const s = p.has('s') ? parseInt(p.get('s'), 10) : 0;
      if (c >= 1 && c <= 4 && ch >= 0) {
        // Steps run 0..lastStepIdx; demo + module-final chapters reach s=4.
        // _ltBootLesson clamps against the real chapter's lastStepIdx, so a
        // generous upper bound here is safe (B2 — was s<=3, dropping quiz links).
        return { kind: 'lesson', course: c, chapter: ch, step: (s >= 0 && s <= 6) ? s : 0 };
      }
    }
    if (p.get('t')) return { kind: 'term', term: p.get('t') };
    const v = p.get('view');
    if (v && _LT_VIEW_PARAMS.includes(v)) return { kind: 'view', view: v };
  } catch (_) {}
  return null;
}

/* Open a deep-linked lesson at boot WITHOUT clobbering saved progress.
   (We can't reuse switchActiveCourse here: its leading saveState() would write the
   still-empty in-memory state over the target course's stored progress.) */
function _ltBootLesson(route) {
  const arr = _ltCourseArray(route.course);
  if (!arr) { init(true); return; }
  LTStore.set('activeCourse', String(route.course));
  CHAPTERS = arr;
  let restored = { chapter: 0, step: 0, progress: {} };
  try {
    const raw = localStorage.getItem(_ltCourseKey(route.course));
    if (raw) { const p = JSON.parse(raw); restored = { chapter: p.chapter || 0, step: p.step || 0, progress: p.progress || {} }; }
  } catch (_) {}
  const ch = Math.min(Math.max(0, route.chapter), arr.length - 1);
  state.progress = restored.progress;
  state.chapter  = ch;
  state.step     = Math.min(Math.max(0, route.step), lastStepIdx(arr[ch]));
  state.quizAnsweredThisStep = stepKindAt(arr[ch], state.step) === 'scenario' && !!(state.progress[ch] && state.progress[ch].quizCorrect);
  markChapterStarted(ch);
  buildSidebar();
  updateHeaderUI();
  updateProgressUI();
  updateNavButtons();
  updateStepPills();
  updateStepDots();
  renderCurrentStep();   // sets view='course' and (via setHomeNavActive) syncs the URL
  scrollContentToTop();
}

function _ltRouteOnBoot() {
  const route = _ltParseRoute();
  if (!route) { init(true); return; }
  if (route.kind === 'lesson') { _ltBootLesson(route); return; }
  // term / view routes: boot normally (no welcome-resume), then open the target view
  init(false);
  if (route.kind === 'term') { showGlossary(route.term); return; }
  const fn = 'show' + route.view.charAt(0).toUpperCase() + route.view.slice(1);
  if (typeof window[fn] === 'function') window[fn]();
}

/* Reflect the current view in the address bar (no reload) so links are copyable. */
function _ltSyncURL() {
  try {
    let qs = '';
    if (state.view === 'course') {
      qs = `?c=${getActiveCourseNum()}&ch=${state.chapter}&s=${state.step}`;
    } else if (state.view && state.view !== 'home') {
      qs = `?view=${state.view}`;
    }
    history.replaceState(null, '', location.pathname + qs);
  } catch (_) {}
}

/* ── Share links ────────────────────────────────────────────────────────────
   Lesson/course shares are IN-APP deep links (?c&ch&s) — they open the exact
   lesson or course straight inside the interactive app (parsed by _ltParseRoute /
   _ltBootLesson), not the standalone /learn/ SEO wrapper page. The generalized
   "Share Liquidity Theory" link (ltShareSite) points at the site root (the app —
   the marketing landing was retired 2026-07-02). Uses location.origin +
   location.pathname so links work on any domain and app path. */
function _ltCopy(text, msg) {
  const done = () => showToast('<i data-lucide="link" style="width:14px;height:14px;"></i> ' + msg);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => showToast('Press Ctrl/Cmd+C to copy'));
  } else {
    showToast('Press Ctrl/Cmd+C to copy');
  }
}

// Build an in-app deep link to an exact lesson (mirrors what _ltSyncURL writes).
function _ltAppUrl(course, chapter, step) {
  return location.origin + location.pathname + '?c=' + course + '&ch=' + chapter + '&s=' + (step || 0);
}

// Share the current lesson — opens straight to this lesson inside the app.
window.ltCopyLessonLink = function() {
  if (state.view !== 'course') { _ltCopy(location.href, 'Link copied'); return; }
  _ltCopy(_ltAppUrl(getActiveCourseNum(), state.chapter, state.step), 'Lesson link copied');
};

// Share a whole course — opens straight to the course (chapter 1) inside the app.
window.ltShareCourse = function(n) {
  _ltCopy(_ltAppUrl(n, 0, 0), 'Course link copied');
};

// Share the whole project — the generalized landing page (Settings button).
window.ltShareSite = function() {
  _ltCopy(location.origin + '/', 'Liquidity Theory link copied');
};

/* ══════════════════════════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════════════════════════ */
/* Cross-device sync: a #sync=<lz> fragment carries another device's progress blob
   (built by ltBuildSyncLink in lt-settings.js). On boot we decode it, confirm, write
   it to localStorage, drop the hash, and reload so the app starts on the imported
   state. Fragments are never sent to a server — nothing is uploaded anywhere. */
function _ltCheckSyncImport() {
  const m = (location.hash || '').match(/[#&]sync=([^&]+)/);
  if (!m) return false;
  const cleanUrl = location.pathname + location.search;
  let data = null;
  try {
    const json = (typeof LZString !== 'undefined') ? LZString.decompressFromEncodedURIComponent(m[1]) : null;
    data = json ? JSON.parse(json) : null;
  } catch (e) { data = null; }
  if (!data || typeof data !== 'object') {
    history.replaceState(null, '', cleanUrl);
    if (typeof showToast === 'function') showToast('That sync link looks invalid or expired.', 3000, 'alert-triangle');
    return false;
  }
  if (!window.confirm('Import saved progress from another device?\n\nThis replaces the progress currently saved in this browser.')) {
    history.replaceState(null, '', cleanUrl);
    return false;
  }
  // True replace (the confirm dialog promises it): clear this browser's existing progress
  // keys first so stale completions can't survive importing a smaller blob. Appearance/
  // display prefs are kept unless the imported blob itself carries them (it usually does).
  const _KEEP = ['lt_theme','lt_font','lt_caption_size','lt_narration','lt_lesson_speed','lt_lesson_volume','lt_bullish_color','lt_bearish_color','lt_sidebar_collapsed'];
  Object.keys(localStorage).forEach((k) => { if (k.indexOf('lt_') === 0 && _KEEP.indexOf(k) === -1) { try { localStorage.removeItem(k); } catch (e) {} } });
  // Only accept string values — a mangled blob would otherwise store "[object Object]" (B10).
  Object.keys(data).forEach((k) => { if (k.indexOf('lt_') === 0 && typeof data[k] === 'string') { try { localStorage.setItem(k, data[k]); } catch (e) {} } });
  history.replaceState(null, '', cleanUrl);   // drop the #sync hash so the reload boots clean
  location.reload();
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  // A cross-device sync link takes priority — import + reload before anything else renders.
  if (_ltCheckSyncImport()) return;
  // Add lead-in/follow-through context to every teaching chart (once, before any render).
  try { _expandAllChartContext(); } catch (e) { console.warn('chart-context expansion skipped', e); }
  /* Theme, bullish-color and font are applied by ltApplySavedSettings() in
     lt-settings.js (runs at parse time, before this) — it is the single source
     of truth for the palette, so we must NOT re-apply a different override here. */
  wireEvents();
  _ltInitChapterContextMenu();
  _ltInitCourseTouchPeek();
  // Restore desktop sidebar-collapsed preference (focus mode)
  if (LTStore.get('sidebarCollapsed') === '1' && !window.matchMedia('(max-width: 768px)').matches) {
    document.querySelector('.app-layout')?.classList.add('sidebar-collapsed');
    document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', 'false');
  }
  _ltRouteOnBoot();
  startBtcTicker();
  _ltInitCardTilt();
});

/* ══════════════════════════════════════════════════════════════════════════
   CARD TILT — subtle 3D perspective that follows the pointer over the home
   course/tool cards and community team cards (≤2.4°). Decorative depth only:
   delegated on #content-area so it survives every re-render; disabled for
   touch, coarse pointers and prefers-reduced-motion. Leaving a card hands the
   transform back to the stylesheet (inline style cleared), so the existing
   hover/peek behaviours are untouched.
   ══════════════════════════════════════════════════════════════════════════ */
function _ltInitCardTilt() {
  if (window.matchMedia('(hover: none), (pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
  const area = document.getElementById('content-area');
  if (!area || area._ltTiltWired) return;
  area._ltTiltWired = true;
  const SEL = '.lt-home-course-card, .lt-home-tool, .cm-card';
  const MAX = 2.4;                                   // degrees — felt, not seen
  area.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest(SEL);
    if (!card) return;
    const r = card.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.classList.add('lt-tilt');
    card.style.transition = 'transform 60ms linear';
    card.style.transform = `perspective(720px) rotateX(${(-py * MAX).toFixed(2)}deg) rotateY(${(px * MAX).toFixed(2)}deg) translateY(-2px)`;
  }, { passive: true });
  area.addEventListener('pointerout', (e) => {
    const card = e.target.closest && e.target.closest(SEL);
    if (!card || (e.relatedTarget && card.contains(e.relatedTarget))) return;
    card.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
    card.style.transform = '';
    setTimeout(() => { card.classList.remove('lt-tilt'); if (!card.style.transform) card.style.transition = ''; }, 420);
  }, { passive: true });
}


/* ══════════════════════════════════════════════════════════════════════════
   LIVE BTC TICKER — streams the price from Binance (constant updates), with a
   1s polling fallback if the WebSocket can't connect (e.g. region-blocked).
   ══════════════════════════════════════════════════════════════════════════ */
let _btcTickerStarted = false;
let _btcInFlight = false;
let _btcLastChg = 0;

// Live price by fast polling — reliable across networks. Tries Binance (best,
// gives 24h %), then Binance.US, then Coinbase (price only), then CoinGecko.
function startBtcTicker() {
  if (_btcTickerStarted) return;
  _btcTickerStarted = true;
  const tick = async () => {
    if (_btcInFlight || document.hidden) return;   // don't poll a hidden tab
    _btcInFlight = true;
    try { const d = await _fetchBtcPrice(); if (d) _renderBtcTicker(d.price, d.chg); } finally { _btcInFlight = false; }
  };
  tick();
  setInterval(tick, 5000);                          // was 1.2s — 5s is plenty for a header ticker
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}

async function _fetchBtcPrice() {
  const tickers = [
    'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
    'https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT'
  ];
  for (const u of tickers) {
    try {
      const r = await fetch(u, { cache: 'no-store' });
      if (r.ok) { const d = await r.json(); const p = parseFloat(d.lastPrice), c = parseFloat(d.priceChangePercent);
        if (isFinite(p)) return { price: p, chg: isFinite(c) ? c : _btcLastChg }; }
    } catch (_) {}
  }
  // Coinbase spot — CORS-friendly, frequent; keep the last known 24h %.
  try {
    const r = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', { cache: 'no-store' });
    if (r.ok) { const d = await r.json(); const p = parseFloat(d && d.data && d.data.amount);
      if (isFinite(p)) return { price: p, chg: _btcLastChg }; }
  } catch (_) {}
  // CoinGecko — last resort (price + 24h %).
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', { cache: 'no-store' });
    if (r.ok) { const d = await r.json(); if (d.bitcoin) return { price: d.bitcoin.usd, chg: d.bitcoin.usd_24h_change || 0 }; }
  } catch (_) {}
  return null;
}
let _btcRenderedPrice = NaN;
function _renderBtcTicker(price, chg) {
  const pEl = document.getElementById('btc-ticker-price');
  if (!pEl) return;
  _btcLastChg = chg;
  const up = chg >= 0;
  pEl.textContent = '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  pEl.className = 'btc-ticker-price ' + (up ? 'up' : 'down');
  if (!isNaN(_btcRenderedPrice) && price !== _btcRenderedPrice) {
    const dir = price > _btcRenderedPrice ? 'tick-up' : 'tick-down';
    pEl.classList.remove('tick-up', 'tick-down');
    void pEl.offsetWidth;
    pEl.classList.add(dir);
  }
  _btcRenderedPrice = price;
}

/* ══════════════════════════════════════════════════════════════════════════
   GLOBAL JUMP FUNCTION (used by sidebar onclick)
   ══════════════════════════════════════════════════════════════════════════ */
window.jumpToChapter = jumpToChapter;

window.ltRefreshCharts = function() {
  TEAL = getBullishColor();
  BEAR = getBearishColor();
  // Only the course view owns the engine charts; settings/simulator redraw
  // their own previews, so don't render course content over them.
  if (state.view !== 'course') return;
  disposeAllCharts();
  renderCurrentStep();
};

function showSettings() {
  state.view = 'settings';
  const area = document.getElementById('content-area');
  area.innerHTML = '';
  renderSettingsPage('content-area');
  setHubHeader('Settings');
  setHomeNavActive();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/* ══════════════════════════════════════════════════════════════════════════
   HOME HUB — in-app landing view: per-course progress, overall progress,
   a continue card, quick-launch tools, and a Discord invite. Separate from the
   marketing landing page (index.html). state.view === 'home'.
   ══════════════════════════════════════════════════════════════════════════ */

/* Toggle the static sidebar Home button's active state to match the current view,
   and hide the Back/Next footer on the hub (it has no chapters to page through). */
function setHomeNavActive() {
  const onHome = state.view === 'home';
  const b = document.getElementById('sidebar-home-btn');
  if (b) b.classList.toggle('sidebar-home-btn--active', onHome);
  // Hide the Back/Next footer on every non-course view — it only pages through
  // chapters, so it's inert (and now removed) on Home, Glossary, Simulator,
  // Flashcards, Community and Settings. Each of those has its own way back.
  const footer = document.querySelector('.nav-footer');
  if (footer) footer.classList.toggle('hidden', state.view !== 'course');
  const ca = document.getElementById('content-area');
  if (ca) ca.classList.toggle('content-area--home', onHome);  // grid backdrop on the hub only
  const cl = document.getElementById('copy-link-btn');
  if (cl) cl.classList.toggle('hidden', state.view !== 'course');  // share button only matters on a lesson
  // Collapse the open course dropdown on the hub (Continue just brings you back);
  // the active course's dropdown re-opens where it was once you're back in a course.
  const activeNum = getActiveCourseNum();
  document.querySelectorAll('.course-accordion').forEach(acc => {
    const open = (+acc.dataset.course === activeNum) && state.view === 'course';
    acc.querySelector('.course-accordion-body')?.classList.toggle('course-accordion-body--open', open);
    acc.querySelector('.course-accordion-chevron')?.classList.toggle('course-accordion-chevron--open', open);
  });
  if (typeof _ltSyncURL === 'function') _ltSyncURL();         // keep the address bar in sync with the current view
}

/* The four courses, with display names + accents, filtered to those actually loaded. */
function _ltHomeCourses() {
  const names = (typeof LT_COURSE_NAMES !== 'undefined') ? LT_COURSE_NAMES : ['Course 1','Course 2','Course 3','Course 4'];
  return LT_COURSES.filter(c => c.chapters).map(c => ({
    num: c.num,
    chapters: c.chapters,
    name: names[c.num - 1] || ('Course ' + c.num),
    accent: ltCourseAccent(c.num)
  }));
}

function _ltCourseCompleted(courseNum) {
  const prog = (typeof window.ltGetCourseProgress === 'function') ? window.ltGetCourseProgress(courseNum) : {};
  const def = _courseDef(courseNum);
  return _ltCountCompleted(prog, def && def.chapters ? def.chapters.length : Infinity);
}

/* Term of the Day — deterministic daily pick from the glossary. The index is
   floor(Date.now()/86400000), i.e. days since the epoch in UTC, so it rolls over
   at exactly 00:00 UTC. */
function _ltTermOfDay() {
  if (typeof LT_GLOSSARY === 'undefined' || !LT_GLOSSARY.length) return null;
  const dayIndex = Math.floor(Date.now() / 86400000);
  return LT_GLOSSARY[dayIndex % LT_GLOSSARY.length];
}

/* Term-of-Day card HTML (id'd so an open page can refresh it at UTC midnight). */
function _ltTermSectionHtml() {
  const tod = _ltTermOfDay();
  if (!tod) return '';
  // Compact, low-key card — a fun daily bite, not a headline feature.
  return `
      <div class="lt-home-term" id="lt-home-term-section">
        <div class="lt-home-term-head">
          <span class="lt-home-term-eyebrow">Term of the day</span>
          <span class="lt-home-term-name">${tod.term}</span>
          <span class="lt-home-term-cat">${tod.cat}</span>
          <button class="lt-home-term-link" onclick="showGlossary('${tod.id}')">Open →</button>
        </div>
        <div class="lt-home-term-def">${tod.def}</div>
      </div>`;
}

/* Refresh the Term card exactly at the next 00:00 UTC so a page left open updates
   without a reload (rescheduled each day; only touches the DOM if the card exists). */
let _ltTermTimer = null;
function _ltScheduleTermRefresh() {
  if (_ltTermTimer) { clearTimeout(_ltTermTimer); _ltTermTimer = null; }
  const msToUtcMidnight = 86400000 - (Date.now() % 86400000) + 50;  // +50ms past the boundary
  _ltTermTimer = setTimeout(function () {
    const el = document.getElementById('lt-home-term-section');
    if (el) {
      el.outerHTML = _ltTermSectionHtml();
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    _ltScheduleTermRefresh();
  }, msToUtcMidnight);
}

/* Hovering a course card turns the Continue card into a quick preview of that
   course — its mascot avatar, "Course N", the course name, and a one-line blurb.
   Leaving restores the resting content (default laptop Perpingo + resume info). */
/* 160px WebP exports (~7KB each) replaced the 1254px PNGs (1.2–1.8MB each) that
   were being rendered at 60px — 2026-07-01. Regenerate: draw the source PNG onto a
   160×160 canvas → toDataURL('image/webp', 0.82). */
const LT_PERPINGO_BY_COURSE = { 1: 'perpingo-cap-160.webp', 2: 'perpingo-builder-160.webp', 3: 'perpingo-ninja-160.webp', 4: 'perpingo-brain-160.webp' };
// Pre-decode the four hover-swap avatars so the first course-card hover is instant.
setTimeout(() => { try { Object.values(LT_PERPINGO_BY_COURSE).forEach(f => { const i = new Image(); i.src = f + '?v=1.0.0'; }); } catch (_) {} }, 2500);
const LT_COURSE_BLURB = {
  1: 'Price-action fundamentals — candles, supply & demand, market structure, and risk.',
  2: 'The trader’s toolkit — chart patterns, Fibonacci, Ichimoku, oscillators, and volume.',
  3: 'Derivatives, leverage, trade execution, and the psychology of staying consistent.',
  4: 'Our advanced framework — liquidity, control, and sentiment for high-conviction trades.'
};
let _ltContinueDefault = null;   // resting Continue-card content, captured in renderHome
window.ltPeekCourse = function(num) {
  const card = document.querySelector('.lt-home-continue');
  const img = document.getElementById('lt-continue-avatar');
  const eb  = document.getElementById('lt-continue-eyebrow');
  const ti  = document.getElementById('lt-continue-title');
  const me  = document.getElementById('lt-continue-meta');
  const file = LT_PERPINGO_BY_COURSE[num];
  const name = (typeof LT_COURSE_NAMES !== 'undefined' && LT_COURSE_NAMES[num - 1]) || ('Course ' + num);
  if (img && file) img.src = file + '?v=1.0.0';
  if (eb) eb.textContent = 'Course ' + num;
  if (ti) ti.textContent = name;
  if (me) me.textContent = LT_COURSE_BLURB[num] || '';
  if (card) {
    card.style.setProperty('--peek-accent', (typeof ltCourseAccent === 'function' ? ltCourseAccent(num) : '') || '');
    card.classList.add('lt-home-continue--peek');   // drives the accent / hidden-button / avatar transitions
  }
};
window.ltPeekReset = function() {
  const card = document.querySelector('.lt-home-continue');
  const img = document.getElementById('lt-continue-avatar');
  const eb  = document.getElementById('lt-continue-eyebrow');
  const ti  = document.getElementById('lt-continue-title');
  const me  = document.getElementById('lt-continue-meta');
  const d = _ltContinueDefault || {};
  if (img) img.src = 'perpingo-laptop-160.webp?v=1.0.0';
  if (eb && d.eyebrow != null) eb.textContent = d.eyebrow;
  if (ti && d.title   != null) ti.textContent = d.title;
  if (me && d.meta    != null) me.textContent = d.meta;
  // keep --peek-accent set so the colour transitions back out; the class controls whether it applies
  if (card) card.classList.remove('lt-home-continue--peek');
};

window.showHome = function() {
  disposeAllCharts();
  state.view = 'home';
  const area = document.getElementById('content-area');
  if (area) { area.scrollTop = 0; area.innerHTML = ''; }
  renderHome('content-area');
  // Header reflects the hub rather than a chapter
  setHubHeader('Home');
  updateProgressUI();          // flips the top strip into its full-width flowing-gradient state
  setHomeNavActive();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  closeSidebar();
};

function renderHome(containerId) {
  const area = document.getElementById(containerId);
  if (!area) return;

  const courses = _ltHomeCourses();

  // Overall progress across all loaded courses
  let totDone = 0, totAll = 0;
  const courseStats = courses.map(c => {
    const done = _ltCourseCompleted(c.num);
    const all  = c.chapters.length;
    totDone += done; totAll += all;
    return { ...c, done, all, pct: all ? Math.round((done / all) * 100) : 0 };
  });
  const overallPct = totAll ? Math.round((totDone / totAll) * 100) : 0;
  const coursesDone = courseStats.filter(c => c.all && c.done === c.all).length;

  // Continue card — active course's saved position
  const activeNum   = getActiveCourseNum();
  const activeName  = (typeof LT_COURSE_NAMES !== 'undefined' ? LT_COURSE_NAMES[activeNum - 1] : null) || ('Course ' + activeNum);
  const activeCh    = CHAPTERS[state.chapter];
  const chTitle     = activeCh ? activeCh.title : 'Get started';
  const stepLabel   = chapterStepLabels(activeCh)[state.step] || 'Introduction';

  // First-time visitor (nothing completed and sitting at the very first step) gets a
  // "start here" framing instead of "resume".
  const firstTime   = totDone === 0 && state.chapter === 0 && state.step === 0;
  const heroTitle   = firstTime ? 'Welcome to Liquidity Theory' : 'Welcome back';
  const heroSub     = firstTime
    ? 'Start your trading education from the very first candle — free, no account needed.'
    : 'Pick up where you left off, or jump into any course.';
  const contEyebrow = firstTime ? 'Get started' : 'Continue learning';
  const contBtn     = firstTime ? 'Start learning →' : 'Resume →';
  // Stash the resting Continue-card content so the course-hover preview can restore it.
  _ltContinueDefault = { eyebrow: contEyebrow, title: chTitle, meta: `${activeName} · ${stepLabel}` };

  const courseCards = courseStats.map(c => {
    const isDone = c.all && c.done === c.all;
    const right  = isDone
      ? `<span class="lt-home-course-done"><i data-lucide="check" style="width:13px;height:13px;"></i> Complete</span>`
      : `<span class="lt-home-course-stat-count">${c.done} / ${c.all} sessions</span>`;
    return `
      <button class="lt-home-course-card" data-course="${c.num}" style="--caccent:${c.accent}" onclick="ltOpenCourse(${c.num})" onmouseenter="ltPeekCourse(${c.num})" aria-label="Open ${c.name}">
        <span class="lt-home-course-share" role="button" tabindex="0" title="Share this course" aria-label="Share ${c.name}"
          onclick="event.stopPropagation(); ltShareCourse(${c.num})"
          onkeydown="if(event.key==='Enter'||event.key===' '){event.stopPropagation();event.preventDefault();ltShareCourse(${c.num});}">
          <i data-lucide="share-2" style="width:13px;height:13px;"></i>
        </span>
        <div class="lt-home-course-label">Course ${c.num}${c.num === 4 ? ' <span class="lt-home-course-adv">Advanced</span>' : ''}</div>
        <div class="lt-home-course-name">${c.name}</div>
        <div class="lt-home-course-track"><div class="lt-home-course-fill" style="width:${c.pct}%"></div></div>
        <div class="lt-home-course-stat">
          <span class="lt-home-course-stat-pct">${c.pct}%</span>
          ${right}
        </div>
      </button>`;
  }).join('');

  const tools = [
    { fn: 'showSimulator',  ic: 'activity',  name: 'Simulator', wip: true },
    { fn: 'showGlossary',   ic: 'book-open', name: 'Glossary'   },
    { fn: 'showFlashcards', ic: 'layers',    name: 'Flashcards' },
    { fn: 'showCommunity',  ic: 'users',     name: 'Community'  },
    { fn: 'showSettings',   ic: 'settings',  name: 'Settings'   }
  ].map(t => `
    <button class="lt-home-tool" onclick="${t.fn}()">
      ${t.wip ? '<span class="lt-home-tool-wip">WIP</span>' : ''}
      <span class="lt-home-tool-ic"><i data-lucide="${t.ic}" style="width:20px;height:20px;"></i></span>
      <span class="lt-home-tool-name">${t.name}</span>
    </button>`).join('');

  const coursesDoneTxt = coursesDone ? ` · <strong>${coursesDone}</strong> course${coursesDone > 1 ? 's' : ''} done` : '';

  const termSection = _ltTermSectionHtml();

  area.innerHTML = `
    <div class="lt-home-wrap">

      <div class="lt-home-hero">
        <div class="lt-home-hero-text">
          <div class="lt-home-hero-title">${heroTitle}</div>
          <div class="lt-home-hero-sub">${heroSub}</div>
        </div>
        <div class="lt-home-overall">
          <div class="lt-home-overall-top">
            <span class="lt-home-overall-pct">${overallPct}%</span>
            <span class="lt-home-overall-meta"><strong>${totDone}</strong> / ${totAll} sessions${coursesDoneTxt}</span>
          </div>
          <div class="lt-home-overall-track"><div class="lt-home-overall-fill" style="width:${overallPct}%"></div></div>
        </div>
      </div>

      <div class="lt-home-continue">
        <div class="lt-home-continue-left">
          <div class="lt-home-continue-avatar"><img id="lt-continue-avatar" src="perpingo-laptop-160.webp?v=1.0.0" alt="Perpingo" width="60" height="60" /></div>
          <div class="lt-home-continue-info">
            <div class="lt-home-continue-eyebrow" id="lt-continue-eyebrow">${contEyebrow}</div>
            <div class="lt-home-continue-title" id="lt-continue-title">${chTitle}</div>
            <div class="lt-home-continue-meta" id="lt-continue-meta">${activeName} · ${stepLabel}</div>
          </div>
        </div>
        <button class="btn-primary" onclick="ltOpenCourse(${activeNum})">${contBtn}</button>
      </div>

      <div class="lt-home-section">
        <div class="lt-home-section-label">Your Courses</div>
        <div class="lt-home-courses" onmouseleave="ltPeekReset()">${courseCards}</div>
      </div>

      <div class="lt-home-section">
        <div class="lt-home-section-label">Tools</div>
        <div class="lt-home-tools">${tools}</div>
      </div>

      ${termSection}

    </div>`;

  _ltScheduleTermRefresh();   // keep the Term of the Day current at 00:00 UTC on open pages
}

/* Open a course from the hub. Switches active course if needed, else resumes it. */
window.ltOpenCourse = function(num) {
  if (num !== getActiveCourseNum()) {
    switchActiveCourse(num);          // already renders current step + sets view='course'
  } else {
    renderCurrentStep();              // sets view='course'
    updateHeaderUI();
    updateProgressUI();
    updateNavButtons();
    scrollContentToTop();
  }
  setHomeNavActive();
  closeSidebar();
};

/* ══════════════════════════════════════════════════════════════════════════
   BACKUP REMINDER — one-time-per-course nudge about exporting progress
   ══════════════════════════════════════════════════════════════════════════ */
function maybeShowBackupReminder(courseNum) {
  const key = 'lt_backupReminded_' + courseNum;
  try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (_) {}
  showBackupReminder();
}

function showBackupReminder() {
  if (document.getElementById('lt-backup-pop')) return;
  if (!document.getElementById('lt-backup-pop-styles')) {
    const st = document.createElement('style');
    st.id = 'lt-backup-pop-styles';
    st.textContent = `
      .lt-backup-pop { position:fixed; right:20px; bottom:20px; z-index:400; width:330px; max-width:calc(100vw - 40px);
        background:var(--bg3); border:1px solid var(--border2); border-left:3px solid var(--teal);
        border-radius:var(--radius-lg); box-shadow:0 12px 36px rgba(0,0,0,.55); padding:16px 18px 14px;
        animation:ltBackupIn .35s cubic-bezier(.2,.8,.2,1); }
      .lt-backup-pop.leaving { animation:ltBackupOut .35s ease forwards; }
      @keyframes ltBackupIn { from{opacity:0; transform:translateY(16px);} to{opacity:1; transform:translateY(0);} }
      @keyframes ltBackupOut { to{opacity:0; transform:translateY(16px);} }
      .lt-backup-pop-x { position:absolute; top:8px; right:10px; background:none; border:none; color:var(--text3); font-size:13px; cursor:pointer; padding:2px 4px; }
      .lt-backup-pop-x:hover { color:var(--text); }
      .lt-backup-pop-title { font-family:'JetBrains Mono',monospace; font-size:18px; font-weight:800; color:var(--text); margin-bottom:6px; }
      .lt-backup-pop-msg { font-size:12.5px; line-height:1.6; color:var(--text2); margin-bottom:13px; }
      .lt-backup-pop-actions { display:flex; gap:8px; justify-content:flex-end; }
      .lt-backup-pop-btn { font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:700; padding:7px 13px; border-radius:var(--radius); cursor:pointer; transition:all .15s; }
      .lt-backup-pop-btn.ghost { background:transparent; border:1px solid var(--border2); color:var(--text3); }
      .lt-backup-pop-btn.ghost:hover { border-color:var(--border3); color:var(--text2); }
      .lt-backup-pop-btn.primary { background:var(--teal); border:1px solid var(--teal); color:#04201f; }
      .lt-backup-pop-btn.primary:hover { filter:brightness(1.08); }
    `;
    document.head.appendChild(st);
  }
  const pop = document.createElement('div');
  pop.id = 'lt-backup-pop';
  pop.className = 'lt-backup-pop';
  pop.innerHTML = `
    <button class="lt-backup-pop-x" onclick="window._dismissBackupPop()" aria-label="Dismiss"><i data-lucide="x" style="width:14px;height:14px;"></i></button>
    <div class="lt-backup-pop-title"><i data-lucide="award" style="width:18px;height:18px;vertical-align:-3px;"></i> Course complete!</div>
    <div class="lt-backup-pop-msg">Your progress is already saved automatically in this browser — nothing you need to do. If you'd like a copy to keep or move to another device, you can <strong>export a backup</strong> in Settings. Completely optional, and you can still jump to any course freely.</div>
    <div class="lt-backup-pop-actions">
      <button class="lt-backup-pop-btn ghost" onclick="window._dismissBackupPop()">Maybe later</button>
      <button class="lt-backup-pop-btn primary" onclick="window._dismissBackupPop(); showSettings(); setTimeout(function(){var el=document.getElementById('lt-s-backup'); if(el) el.scrollIntoView({behavior:'smooth',block:'center'});},160);">Back up progress</button>
    </div>`;
  document.body.appendChild(pop);
  if (typeof lucide !== 'undefined') { try { lucide.createIcons(); } catch(_) {} }
  // Auto-dismiss after a while if ignored
  pop._timer = setTimeout(() => window._dismissBackupPop(), 16000);
}

window._dismissBackupPop = function() {
  const pop = document.getElementById('lt-backup-pop');
  if (!pop) return;
  if (pop._timer) clearTimeout(pop._timer);
  pop.classList.add('leaving');
  setTimeout(() => { pop.remove(); }, 360);
};

window.showSimulator = function(opts) {
  disposeAllCharts();
  if (typeof renderSimulator === 'function') {
    state.view = 'simulator';
    renderSimulator('content-area', opts || {});
    setHubHeader('Simulator');
    setHomeNavActive();
  } else {
    showToast('Simulator not available.');
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   GLOSSARY / SEARCH SUPPORT
   ══════════════════════════════════════════════════════════════════════════ */
window.showGlossary = function(termId) {
  if (typeof renderGlossary !== 'function') { showToast('Glossary not available.'); return; }
  disposeAllCharts();
  state.view = 'glossary';
  const area = document.getElementById('content-area');
  if (area) area.innerHTML = '';
  // No termId → start at the top; with a termId, renderGlossary scrolls to it.
  if (!termId) scrollContentToTop();
  renderGlossary('content-area', termId);
  setHubHeader('Glossary');
  setHomeNavActive();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  closeSidebar();
};

window.showFlashcards = function() {
  if (typeof renderFlashcards !== 'function') { showToast('Flashcards not available.'); return; }
  disposeAllCharts();
  state.view = 'flashcards';
  const area = document.getElementById('content-area');
  if (area) { area.scrollTop = 0; area.innerHTML = ''; }
  renderFlashcards('content-area', getActiveCourseNum(), getCourseName());
  setHubHeader('Flashcards');
  setHomeNavActive();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  closeSidebar();
};

window.showCommunity = function() {
  if (typeof renderCommunity !== 'function') { showToast('Community page not available.'); return; }
  disposeAllCharts();
  state.view = 'community';
  const area = document.getElementById('content-area');
  if (area) { area.scrollTop = 0; area.innerHTML = ''; }
  renderCommunity('content-area');
  setHubHeader('Community');
  setHomeNavActive();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  closeSidebar();
};

// Read any course's saved progress map (active course returns the live state).
window.ltGetCourseProgress = function(courseNum) {
  if (courseNum === getActiveCourseNum()) return state.progress || {};
  try {
    const key = courseStateKey(courseNum);
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw).progress || {}) : {};
  } catch(_) { return {}; }
};

// Global "unlock everything" bypass (used by the glossary lock state).
window.ltIsUnlockAll = function() { return LTStore.get('unlockAll') === '1'; };
window.ltSetUnlockAll = function(on) { LTStore.set('unlockAll', on ? '1' : '0'); };

// Deep-link open of a specific chapter in a specific course (bypasses gating).
window.ltOpenChapter = function(courseNum, chIdx) {
  const active = getActiveCourseNum();
  if (courseNum !== active) {
    switchActiveCourse(courseNum, chIdx);
  } else {
    state.view = 'course';
    state.chapter = chIdx;
    state.step = 0;
    state.quizAnsweredThisStep = false;
    markChapterStarted(chIdx);
    saveState();
    renderCurrentStep();
    updateHeaderUI();
    updateProgressUI();
    updateSidebar();
    updateNavButtons();
    scrollContentToTop();
  }
  closeSidebar();
};
