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
   · Final Exam (13 questions, scored)
   · Certificate screen
   · Toast notifications
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════════════════ */
const STORAGE_KEY  = 'lt_course1_state';
const STEP_LABELS  = ['Introduction', 'Lesson', 'Quiz'];
const TOTAL_STEPS  = LT_CHAPTERS.length * 3; // 39 (Course 1 default)
let   CHAPTERS     = LT_CHAPTERS;

function getBullishColor() {
  return localStorage.getItem('lt_bullish_color') || '#00d4d4';
}

let TEAL  = getBullishColor();
const TEAL2 = '#00b8b8';
const RED   = '#cc2222';
const GOLD  = '#c8960c';
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
function _ichimokuMid(ohlcData, period, endIdx) {
  const start = Math.max(0, endIdx - period + 1);
  const slice = ohlcData.slice(start, endIdx + 1);
  const high = Math.max(...slice.map(c => c[3]));
  const low  = Math.min(...slice.map(c => c[2]));
  return (high + low) / 2;
}

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
  examMode:    false,
  examQuestion: 0,
  examAnswers:  {},  // { questionIndex: answerId }
  examComplete: false
};

/* ══════════════════════════════════════════════════════════════════════════
   CHART INSTANCE CACHE
   ══════════════════════════════════════════════════════════════════════════ */
const charts = {};

function disposeChart(id) {
  if (charts[id]) {
    try { charts[id].dispose(); } catch(_) {}
    delete charts[id];
  }
}

function disposeAllCharts() {
  Object.keys(charts).forEach(disposeChart);
}

/* Replay state — module-level so onclick always resolves the live chart instance */
let _replaySetup    = null;  // { ohlc, labels }
let _replayReveal   = null;  // { ohlc, labels, decisionIndex, pattern }
let _replayChart    = null;  // element id string
let _replayInterval = null;  // active interval reference

/* ══════════════════════════════════════════════════════════════════════════
   LOCAL STORAGE
   ══════════════════════════════════════════════════════════════════════════ */
function getActiveCourseNum() {
  if (typeof LT_CHAPTERS_4 !== 'undefined' && CHAPTERS === LT_CHAPTERS_4) return 4;
  if (typeof LT_CHAPTERS_3 !== 'undefined' && CHAPTERS === LT_CHAPTERS_3) return 3;
  if (typeof LT_CHAPTERS_2 !== 'undefined' && CHAPTERS === LT_CHAPTERS_2) return 2;
  return 1;
}

function getCourseStorageKey() {
  const n = getActiveCourseNum();
  if (n === 4) return 'lt_course4_state';
  if (n === 3) return 'lt_course3_state';
  if (n === 2) return 'lt_course2_state';
  return STORAGE_KEY;
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

function allChaptersComplete() {
  return completedCount() === CHAPTERS.length;
}

function globalProgress() {
  const globalStep = state.chapter * 3 + state.step;
  return Math.round((globalStep / (CHAPTERS.length * 3)) * 100);
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
function _applyIchimokuOverlay(opt, def) {
  const tenkan = def.tenkan || [];
  const kijun  = def.kijun  || [];
  const spanA  = def.spanA  || [];
  const spanB  = def.spanB  || [];

  if (!opt.legend) opt.legend = { top: 4, right: 8, data: [], textStyle: { color: '#888', fontSize: 9 }, itemWidth: 16, itemHeight: 2 };
  opt.legend.data = (opt.legend.data || []).concat(['Tenkan-sen', 'Kijun-sen']);

  if (tenkan.length) opt.series.push({
    name: 'Tenkan-sen', type: 'line', data: tenkan,
    symbol: 'none', silent: true, showSymbol: false,
    lineStyle: { color: '#ff6b6b', width: 1.2, type: 'solid' }
  });
  if (kijun.length) opt.series.push({
    name: 'Kijun-sen', type: 'line', data: kijun,
    symbol: 'none', silent: true, showSymbol: false,
    lineStyle: { color: '#4ecdc4', width: 1.2, type: 'solid' }
  });
  if (spanA.length && spanB.length) {
    const base  = spanA.map((a, i) => a != null && spanB[i] != null ? Math.min(a, spanB[i]) : null);
    const delta = spanA.map((a, i) => a != null && spanB[i] != null ? Math.abs(a - spanB[i]) : null);
    opt.series.push({ name: '_kumo_base', type: 'line', data: base, stack: 'kumo',
      symbol: 'none', silent: true, showSymbol: false,
      lineStyle: { opacity: 0 }, areaStyle: { color: 'transparent' } });
    opt.series.push({ name: '_kumo_fill', type: 'line', data: delta, stack: 'kumo',
      symbol: 'none', silent: true, showSymbol: false,
      lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(0,212,212,0.18)' } });
  }
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
      label: { show: true, formatter: String(r), color: GOLD, fontSize: 9, fontWeight: 600, position: 'end' },
      lineStyle: { color: GOLD, type: 'dashed', width: 1, opacity: 0.8 }
    }, { yAxis: price }];
  });
  opt.series[0].markLine.data = (opt.series[0].markLine.data || []).concat(fibLines);
}

function _applyRsiZonesOverlay(opt, def) {
  const ohlc = def.ohlc || [];
  if (!ohlc.length) return;
  const lows  = ohlc.map(c => c[2]);
  const highs = ohlc.map(c => c[3]);
  const minP  = Math.min(...lows);
  const maxP  = Math.max(...highs);
  const range = maxP - minP;
  const obLevel = def.overboughtLevel != null ? def.overboughtLevel : minP + range * 0.68;
  const osLevel = def.oversoldLevel   != null ? def.oversoldLevel   : minP + range * 0.32;
  opt.series[0].markArea.data = (opt.series[0].markArea.data || []).concat([
    [{ yAxis: obLevel,
       label: { show: true, formatter: 'Overbought', color: '#ff8888', fontSize: 9, fontWeight: 600, position: 'insideTopLeft' },
       itemStyle: { color: 'rgba(204,34,34,0.07)' } },
     { yAxis: maxP + range * 0.02 }],
    [{ yAxis: minP - range * 0.02,
       label: { show: true, formatter: 'Oversold', color: '#88dd88', fontSize: 9, fontWeight: 600, position: 'insideTopLeft' },
       itemStyle: { color: 'rgba(0,200,100,0.07)' } },
     { yAxis: osLevel }]
  ]);
}

function _applyIndicatorOverlay(opt, def) {
  switch (def.indicator) {
    case 'ichimoku':  _applyIchimokuOverlay(opt, def);  break;
    case 'fibonacci': _applyFibonacciOverlay(opt, def); break;
    case 'rsi_zones': _applyRsiZonesOverlay(opt, def);  break;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   CHART BUILDER — Converts simplified chart defs to ECharts options
   ═══════════════════════════════════════════════════════════════════════ */
function buildCandlestickOption(def, revealMode) {
  const C = chartColors();
  const cutIndex    = def.cutIndex  != null ? def.cutIndex  : def.ohlc.length;
  const labels      = revealMode   ? def.labels : def.labels.slice(0, cutIndex);
  const ohlc        = revealMode   ? def.ohlc   : def.ohlc.slice(0, cutIndex);
  const markLines   = (def.markLines  || []);
  const markAreas   = (def.markAreas  || []);
  const markPoints  = revealMode ? (def.revealMarkPoints || def.markPoints || [])
                                 : (def.markPoints       || []);

  // Build ECharts markPoint data
  const mpData = markPoints.map(mp => {
    const ohlcVal    = ohlc[mp.dataIndex];
    if (!ohlcVal) return null;
    const [o, c, lo, hi] = ohlcVal;
    const yVal   = mp.position === 'bottom' ? lo : hi;
    return {
      name:  mp.label,
      coord: [mp.dataIndex, yVal],
      value: mp.label,
      label: {
        show:       true,
        formatter:  '{b}',
        color:      mp.color || TEAL,
        fontSize:   10,
        fontWeight: 700,
        fontFamily: 'Barlow, sans-serif',
        position:   mp.position === 'bottom' ? 'bottom' : 'top',
        distance:   8
      },
      itemStyle: { color: mp.color || TEAL },
      symbol:    mp.position === 'bottom' ? 'triangle' : 'pin',
      symbolSize: mp.position === 'bottom' ? [14,14] : [16,18],
      symbolRotate: mp.position === 'bottom' ? 180 : 0
    };
  }).filter(Boolean);

  // Build ECharts markLine data
  const mlData = markLines.map(ml => [{
    yAxis:  ml.yAxis,
    name:   ml.label,
    label:  {
      show:      true,
      formatter: ml.label,
      color:     ml.color || TEAL,
      fontSize:  10,
      fontWeight: 600,
      position:  'end'
    },
    lineStyle: { color: ml.color || TEAL, type: 'dashed', width: 1.5, opacity: 0.75 }
  }, { yAxis: ml.yAxis }]);

  // Build ECharts markArea data
  const maData = markAreas.map(ma => [{
    yAxis:     ma.y0,
    label:     {
      show:      true,
      formatter: ma.label,
      color:     C.TEXT3,
      fontSize:  9,
      position:  'insideTopLeft',
      fontWeight: 600
    },
    itemStyle: { color: ma.color || 'rgba(0,212,212,0.05)', borderWidth: 0 }
  }, { yAxis: ma.y1 }]);

  const _opt = {
    backgroundColor: C.BG3,
    animation: true,
    animationDuration: 600,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: C.BG4,
      borderColor: C.BORDER,
      textStyle: { color: C.TOOLTIP_TEXT, fontSize: 11, fontFamily: 'Barlow, sans-serif' },
      formatter(params) {
        const c = params.find(p => p.seriesName === 'Price');
        if (!c || !c.data) return '';
        const [o, cl, lo, hi] = c.data;
        const chg  = cl - o;
        const pct  = ((chg / o) * 100).toFixed(2);
        const sign = chg >= 0 ? '+' : '';
        const col  = chg >= 0 ? TEAL : RED;
        return `<div style="min-width:130px">
          <b style="color:${C.TOOLTIP_TEXT}">${labels[c.dataIndex] || c.dataIndex}</b><br/>
          O: ${o} &nbsp; C: <span style="color:${col};font-weight:700">${cl}</span><br/>
          H: ${hi} &nbsp; L: ${lo}<br/>
          <span style="color:${col}">${sign}${pct}%</span>
        </div>`;
      }
    },
    grid: { left: 52, right: 28, top: 24, bottom: 36 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine:  { lineStyle: { color: C.BORDER } },
      axisLabel: { color: C.TEXT3, fontSize: 10, fontFamily: 'Barlow, sans-serif' },
      splitLine: { show: false }
    },
    yAxis: {
      scale:     true,
      splitLine: { lineStyle: { color: C.BORDER, type: 'dashed' } },
      axisLine:  { lineStyle: { color: C.BORDER } },
      axisLabel: { color: C.TEXT3, fontSize: 10, fontFamily: 'Barlow, sans-serif' }
    },
    series: [{
      name:  'Price',
      type:  'candlestick',
      data:  ohlc,
      barMaxWidth: 20,
      itemStyle: {
        color:        TEAL,
        color0:       RED,
        borderColor:  TEAL,
        borderColor0: RED,
        borderWidth:  1.5
      },
      markPoint: {
        symbol: 'pin',
        symbolSize: 16,
        label: { fontFamily: 'Barlow, sans-serif' },
        data: mpData
      },
      markLine: {
        symbol: ['none','none'],
        silent: true,
        data:   mlData
      },
      markArea: {
        silent: true,
        data:   maData
      }
    }]
  };
  if (def.indicator) _applyIndicatorOverlay(_opt, def);
  return _opt;
}

function buildLineOption(def) {
  const C = chartColors();
  const { labels, values, series2Label, series2Values, markLines } = def;

  const mlData = (markLines || []).map(ml => [{
    yAxis:     ml.yAxis,
    label:     { show: true, formatter: ml.label, color: ml.color || TEAL, fontSize: 10, fontWeight: 600, position: 'end' },
    lineStyle: { color: ml.color || TEAL, type: 'dashed', width: 1.5, opacity: 0.6 }
  }, { yAxis: ml.yAxis }]);

  const series = [{
    name:  'Equity',
    type:  'line',
    data:  values,
    smooth: true,
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
      lineStyle: { color: RED, width: 2, type: 'dashed' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(204,34,34,0.08)' },
          { offset: 1, color: 'rgba(204,34,34,0.01)' }
        ]}},
    });
  }

  const hasLegend = !!(series2Values && series2Label);

  return {
    backgroundColor: C.BG3,
    animation: true,
    animationDuration: 700,
    legend: hasLegend ? {
      data: ['Equity', series2Label],
      textStyle: { color: C.TEXT2, fontSize: 11, fontFamily: 'Barlow, sans-serif' },
      top: 4
    } : undefined,
    tooltip: {
      trigger: 'axis',
      backgroundColor: C.BG4,
      borderColor: C.BORDER,
      textStyle: { color: C.TOOLTIP_TEXT, fontSize: 11, fontFamily: 'Barlow, sans-serif' }
    },
    grid: { left: 58, right: 28, top: hasLegend ? 36 : 24, bottom: 36 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine:  { lineStyle: { color: C.BORDER } },
      axisLabel: { color: C.TEXT3, fontSize: 10, fontFamily: 'Barlow, sans-serif' },
      splitLine: { show: false }
    },
    yAxis: {
      scale:     true,
      splitLine: { lineStyle: { color: C.BORDER, type: 'dashed' } },
      axisLine:  { lineStyle: { color: C.BORDER } },
      axisLabel: { color: C.TEXT3, fontSize: 10, fontFamily: 'Barlow, sans-serif' }
    },
    series
  };
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
  }

  // Handle resize
  const ro = new ResizeObserver(() => instance.resize());
  ro.observe(el);
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

  const setupOhlc     = def.ohlc.slice(0, def.cutIndex);
  const setupLabels   = def.labels.slice(0, def.cutIndex);
  const outcomeOhlc   = def.ohlc.slice(def.cutIndex);
  const outcomeLabels = def.labels.slice(def.cutIndex);

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
    label:     { show: true, formatter: ml.label, color: ml.color || TEAL, fontSize: 10, fontWeight: 600, position: 'end' },
    lineStyle: { color: ml.color || TEAL, type: 'dashed', width: 1.5, opacity: 0.75 }
  }, { yAxis: ml.yAxis }]);

  // Get or create the replay button below the chart card
  function getTeachReplayBtn() {
    const card = document.getElementById(elId)?.closest('.chart-card');
    if (!card) return null;
    let btn = card.querySelector('.chart-replay-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'chart-replay-btn';
      btn.innerHTML = '<i data-lucide="rotate-ccw" style="width:12px;height:12px;"></i> Replay';
      btn.style.cssText = 'display:none;margin:4px 0 2px auto;padding:2px 10px;background:transparent;color:#9494b0;font-size:11px;border:1px solid '+getBullishColor()+';border-radius:10px;cursor:pointer;font-family:Barlow,sans-serif;';
      card.appendChild(btn);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    return btn;
  }

  function runTeachAnimation() {
    const replayBtn = getTeachReplayBtn();
    if (replayBtn) replayBtn.style.display = 'none';

    // Reset chart back to setup candles only — live lookup so stale closure never used
    const instReset = charts[elId];
    if (instReset) {
      instReset.setOption({
        xAxis:  { data: setupLabels },
        series: [{ data: setupOhlc, markLine: { data: [] } }]
      }, { notMerge: false });
    }

    let count = 0;
    const total = outcomeOhlc.length;

    const teachTimer = setInterval(() => {
      count++;
      const visibleLabels = [...setupLabels, ...outcomeLabels.slice(0, count)];
      const wireframeData = outcomeOhlc.slice(0, count).map(c => {
        const isBull = c[1] >= c[0];
        return {
          value: c,
          itemStyle: {
            color:        'transparent',
            borderColor:  isBull ? TEAL : RED,
            borderWidth:  1.5,
            color0:       'transparent',
            borderColor0: RED
          }
        };
      });

      const instTick = charts[elId];
      if (instTick) {
        instTick.setOption({
          xAxis:  { data: visibleLabels },
          series: [{
            data: [...setupOhlc, ...wireframeData],
            markLine: {
              symbol: ['none', 'none'],
              silent: true,
              data: [
                [
                  { xAxis: decisionIdx, label: { show: true, formatter: 'Decision Point', color: TEAL, fontSize: 10, fontWeight: 700, position: 'insideEndTop' }, lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.8 } },
                  { xAxis: decisionIdx }
                ],
                ...mlData
              ]
            }
          }]
        }, { notMerge: false });
      }

      if (count >= total) {
        clearInterval(teachTimer);
        const btn = getTeachReplayBtn();
        if (btn) {
          btn.style.display = 'block';
          btn.onclick = runTeachAnimation;
        }
      }
    }, 280);
  }

  runTeachAnimation();
}

/* ══════════════════════════════════════════════════════════════════════════
   HTML BUILDERS
   ══════════════════════════════════════════════════════════════════════════ */
function bulletsHtml(bullets) {
  return `<ul class="lesson-bullets">
    ${bullets.map(b => `<li>${b}</li>`).join('')}
  </ul>`;
}

function chartCardHtml(id, title, badge, tall, chartHeight) {
  const hStyle = chartHeight ? `height:${chartHeight}px;` : '';
  const hData  = chartHeight ? `data-configured-height="${chartHeight}"` : '';
  return `
    <div class="chart-card" style="max-width:960px;margin:0 auto;">
      <div class="chart-card-header">
        <span class="chart-card-title">${title}</span>
        ${badge ? `<span class="chart-card-badge">${badge}</span>` : ''}
        <button class="chart-expand-btn" id="expand-${id}" onclick="toggleChartExpand('${id}')" title="Expand chart" aria-label="Expand chart"><i data-lucide="maximize-2" style="width:14px;height:14px;"></i></button>
      </div>
      <div id="${id}" class="chart-el${tall ? ' chart-el--tall' : ''}" style="${hStyle}" ${hData}></div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP RENDERERS
   ══════════════════════════════════════════════════════════════════════════ */
/* Inject the Watch Video button into .content-card--teal if videoUrl is present
   and the button isn't already in the DOM. Called twice: once right after
   setContent (covers normal renders) and once inside setTimeout (covers any
   post-render DOM operations such as renderCandlestickGallery on chapter 0). */
function _ensureVideoButton(chapter) {
  if (!chapter.videoUrl) return;
  if (document.getElementById('intro-video-btn')) return; // already present
  const card = document.querySelector('.content-card--teal');
  if (!card) return;
  let wrap = document.getElementById('intro-video-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'intro-video-wrap';
    wrap.id = 'intro-video-wrap';
    card.appendChild(wrap);
  }
  const url = chapter.videoUrl;
  const btn = document.createElement('button');
  btn.className = 'intro-video-btn';
  btn.id = 'intro-video-btn';
  btn.setAttribute('onclick', `toggleIntroVideo('${url}')`);
  btn.innerHTML =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="#FF0000" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">'
    + '<path d="M21.582 6.186a2.506 2.506 0 0 0-1.765-1.773C18.265 4 12 4 12 4s-6.265 0-7.817.413'
    + 'A2.506 2.506 0 0 0 2.418 6.186C2 7.747 2 12 2 12s0 4.253.418 5.814a2.506 2.506 0 0 0 1.765'
    + ' 1.773C5.735 20 12 20 12 20s6.265 0 7.817-.413a2.506 2.506 0 0 0 1.765-1.773C22 16.253 22 12'
    + ' 22 12s0-4.253-.418-5.814zM10 15.464V8.536L16 12l-6 3.464z"/>'
    + '</svg><span>Watch Video</span>';
  wrap.appendChild(btn);
}

function renderIntro(chapter) {
  const { intro, introChart } = chapter;

  // Build button markup inline — used when chapter.videoUrl is available at
  // template time. _ensureVideoButton() below is the guaranteed fallback.
  const videoBtnHtml = chapter.videoUrl
    ? `<div class="intro-video-wrap" id="intro-video-wrap"><button class="intro-video-btn" id="intro-video-btn" onclick="toggleIntroVideo('${chapter.videoUrl}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="#FF0000" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;"><path d="M21.582 6.186a2.506 2.506 0 0 0-1.765-1.773C18.265 4 12 4 12 4s-6.265 0-7.817.413A2.506 2.506 0 0 0 2.418 6.186C2 7.747 2 12 2 12s0 4.253.418 5.814a2.506 2.506 0 0 0 1.765 1.773C5.735 20 12 20 12 20s6.265 0 7.817-.413a2.506 2.506 0 0 0 1.765-1.773C22 16.253 22 12 22 12s0-4.253-.418-5.814zM10 15.464V8.536L16 12l-6 3.464z"/></svg><span>Watch Video</span></button></div>`
    : '';

  const html = `
    <div class="intro-layout">
      <div>
        <div class="content-card content-card--teal">
          <div class="content-card-tag">Introduction</div>
          <h2 class="content-card-heading">${intro.heading}</h2>
          <p class="content-card-body">${intro.body}</p>
          ${bulletsHtml(intro.bullets)}
          ${videoBtnHtml}
        </div>
      </div>
      <div>
        ${chartCardHtml('chart-intro', introChart.title, introChart.type === 'line' ? 'Line' : 'Candles', false, introChart.chartHeight)}
      </div>
    </div>`;

  setContent(html);
  // Guarantee #1 — synchronous check right after innerHTML is set.
  // Handles chapters where videoUrl is present but template expansion missed it.
  _ensureVideoButton(chapter);

  setTimeout(() => {
    renderTeachingChart('chart-intro', introChart);
    if (state.chapter === 0 && state.step === 0 && CHAPTERS === LT_CHAPTERS && typeof renderCandlestickGallery === 'function') {
      renderCandlestickGallery('chart-intro');
    }
    // Guarantee #2 — after renderCandlestickGallery (chapter 0) or any other
    // post-render call that could modify .content-card--teal.
    _ensureVideoButton(chapter);
  }, 80);
}

function renderLesson(chapter) {
  const { lesson, lessonChart } = chapter;

  const html = `
    <div class="content-card">
      <div class="content-card-tag">Lesson</div>
      <h2 class="content-card-heading content-card-heading--lesson">${lesson.heading}</h2>
      <p class="content-card-body">${lesson.body}</p>
      ${bulletsHtml(lesson.bullets)}
    </div>
    ${chartCardHtml('chart-lesson', lessonChart.title, lessonChart.type === 'line' ? 'Line' : 'Candles', true, lessonChart.chartHeight)}`;

  setContent(html);
  setTimeout(() => {
    renderTeachingChart('chart-lesson', lessonChart);
  }, 80);
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
        return `<button class="${cls}" data-answer="${a.id}"
          ${alreadyDone ? 'disabled' : ''}
          onclick="handleAnswer('${a.id}')">
          ${a.text}
        </button>`;
      }).join('')}
    </div>`;
  }

  // Explanation (shown if already answered)
  const explHtml = alreadyDone ? buildExplanationHtml(quiz, savedAnswer) : '';

  const html = `
    ${chartCardHtml('chart-quiz', quiz.chart.title, alreadyDone ? 'Revealed' : 'Decision Point', true, quiz.chart.chartHeight)}
    <div class="quiz-card">
      <div class="quiz-label">Quiz — Chapter ${chapterIdx + 1}</div>
      <div class="quiz-question">${quiz.question}</div>
      <div class="quiz-hint">${quiz.hint}</div>
      ${btnHtml}
      ${explHtml}
    </div>`;

  setContent(html);

  // Render chart
  setTimeout(async () => {
    const realPattern = (typeof LT_PATTERNS !== 'undefined')
      ? LT_PATTERNS.find(p => p.concept === chapter.title)
      : null;

    if (realPattern) {
      const ok = await renderRealDataQuiz('chart-quiz', realPattern, quiz.chart.indicator);
      if (ok) {
        const rp      = window._currentRealPattern;
        const source  = rp ? rp.source : 'binance';
        const srcName = source === 'coingecko' ? 'CoinGecko' : 'Binance';
        const firstTs = rp && rp.setupLabels.length > 0 && rp.revealCandles.length > 0
          ? new Date(rp.revealCandles[0].time).getFullYear()
          : (rp && rp.setupOhlc.length > 0 ? '' : '');
        const year = (() => {
          if (!rp) return '';
          const ts = rp.revealCandles && rp.revealCandles.length > 0
            ? rp.revealCandles[0].time
            : null;
          return ts ? String(new Date(ts).getFullYear()) : '';
        })();
        const binanceSvg   = `<svg width="14" height="14" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill="#F3BA2F" d="M16 0L9.9 6.1l-3.8-3.8L0 8.4l6.1 6.1-6.1 6.1 6.1 6.1 3.8-3.8 6.1 6.1 6.1-6.1 3.8 3.8 6.1-6.1-6.1-6.1 6.1-6.1-6.1-6.1-3.8 3.8z"/></svg>`;
        const coingeckoSvg = `<svg width="14" height="14" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#8DC63F"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="16" font-weight="bold">G</text></svg>`;
        const logo    = source === 'coingecko' ? coingeckoSvg : binanceSvg;
        const chartEl = document.getElementById('chart-quiz');
        if (chartEl) {
          chartEl.style.position = 'relative';
          // Top-left: logo + source name + label
          const badge = document.createElement('div');
          badge.className = 'real-data-badge';
          badge.innerHTML = `${logo} ${srcName} · Historical BTC Data`;
          badge.style.cssText = 'position:absolute;top:8px;left:8px;display:flex;align-items:center;gap:5px;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;padding:3px 8px;border-radius:12px;border:1px solid '+getBullishColor()+';z-index:10;pointer-events:none;';
          chartEl.prepend(badge);
          // Top-right: year derived from first candle timestamp
          if (year) {
            const yearEl = document.createElement('div');
            yearEl.className = 'real-data-year';
            yearEl.textContent = `BTC/USD · ${year}`;
            yearEl.style.cssText = 'position:absolute;top:8px;right:8px;color:#9494b0;font-size:11px;z-index:10;pointer-events:none;';
            chartEl.appendChild(yearEl);
          }
        }
      } else {
        // Binance fetch failed — fall back to static chart
        const def = { ...quiz.chart, revealMarkPoints: quiz.revealMarkPoints || [] };
        renderChart('chart-quiz', def, alreadyDone);
      }
    } else {
      // use existing static chart rendering
      const def = { ...quiz.chart, revealMarkPoints: quiz.revealMarkPoints || [] };
      renderChart('chart-quiz', def, alreadyDone);
    }
  }, 80);

  state.quizAnsweredThisStep = alreadyDone;
  updateNextBtn();
}

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
      <div class="explanation-body">${quiz.explanation}</div>
      ${quiz.rule ? `<div class="explanation-rule">${quiz.rule}</div>` : ''}
    </div>`;
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

  if (correct) {
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
  } else {
    // Wrong: briefly highlight the wrong choice, then re-enable all buttons for retry
    document.querySelectorAll('.answer-btn').forEach(btn => {
      if (btn.dataset.answer === answerId) btn.classList.add('answer-btn--wrong');
    });
    setTimeout(() => {
      document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.remove('answer-btn--wrong');
        btn.disabled = false;
      });
    }, 1200);
  }

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
            borderColor:  isBull ? TEAL : RED,
            borderWidth:  1.5,
            color0:       'transparent',
            borderColor0: RED
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
          replayBtn.innerHTML = '<i data-lucide="rotate-ccw" style="width:12px;height:12px;"></i> Replay';
          replayBtn.style.cssText = 'display:block;margin:4px 0 2px auto;padding:2px 10px;background:transparent;color:#9494b0;font-size:11px;border:1px solid '+getBullishColor()+';border-radius:10px;cursor:pointer;font-family:Barlow,sans-serif;';
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
                      borderColor:  isBull ? TEAL : RED,
                      borderWidth:  1.5,
                      color0:       'transparent',
                      borderColor0: RED
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
                  replayBtn.style.display = 'block';
                }
              }, 280);
            }, 300);
          };
        }
      }
    }, 280);

  } else if (!correct && window._currentRealPattern) {
    // Wrong answer on real data: red glow + immediate explanation; keep pattern for retry
    const chartEl = document.getElementById('chart-quiz');
    if (chartEl) {
      chartEl.style.transition = 'box-shadow 0.3s ease';
      chartEl.style.boxShadow  = '0 0 18px 4px rgba(204,34,34,0.45)';
      setTimeout(() => { chartEl.style.boxShadow = ''; }, 1400);
    }
    showExplanation();

  } else {
    // Static chart path: reveal all candles immediately
    const def = { ...quiz.chart, revealMarkPoints: quiz.revealMarkPoints || [] };
    revealChart('chart-quiz', def);
    const badgeEl = document.querySelector('.chart-card-badge');
    if (badgeEl) badgeEl.textContent = 'Revealed';
    showExplanation();
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
  const prev  = { chapter: state.chapter, step: state.step };
  let ch      = state.chapter;
  let step    = state.step;

  if (direction === 'next') {
    // BUG 1 + BUG 2: Quiz gating — cannot advance from quiz step without a correct answer
    if (step === 2) {
      const prog = state.progress[ch];
      if (!prog || !prog.quizCorrect) {
        showToast('Answer the question to continue');
        return;
      }
      // BUG 2: Mark chapter complete only here — correct answer + clicking Next
      markChapterCompleted(ch);
      updateProgressUI();
      updateSidebar();
      if (allChaptersComplete()) {
        const examBtn = document.getElementById('start-exam-btn');
        if (examBtn) {
          examBtn.disabled = false;
          const lockIcon = document.getElementById('exam-lock-icon');
          if (lockIcon) lockIcon.style.display = 'none';
        }
        setTimeout(() => showToast('<i data-lucide="award" style="width:14px;height:14px;"></i> All chapters complete! Final Exam is now unlocked.'), 800);
      }
    }
    step++;
    if (step > 2) {
      step = 0;
      ch++;
      if (ch >= CHAPTERS.length) {
        // End of course
        showToast('🎉 Course complete! Take the Final Exam.');
        return;
      }
    }
  } else {
    step--;
    if (step < 0) {
      ch--;
      if (ch < 0) return;
      step = 2;
    }
  }

  state.chapter = ch;
  state.step    = step;
  state.quizAnsweredThisStep = false;

  markChapterStarted(ch);
  saveState();

  renderCurrentStep();
  updateHeaderUI();
  updateProgressUI();
  updateSidebar();
  updateNavButtons();
  scrollContentToTop();
}

function jumpToChapter(chapterIdx) {
  if (chapterIdx === 0 || isChapterCompleted(chapterIdx - 1) || isChapterCompleted(chapterIdx)) {
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
    showToast('⚠️ Complete the previous chapter first.');
  }
}

function scrollContentToTop() {
  const ca = document.getElementById('content-area');
  if (ca) ca.scrollTop = 0;
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDER DISPATCH
   ══════════════════════════════════════════════════════════════════════════ */
function renderCurrentStep() {
  disposeAllCharts();
  const chapter = CHAPTERS[state.chapter];
  if (!chapter) return;

  if (state.step === 0) {
    renderIntro(chapter);
    updateStepPills();
    updateStepDots();
  } else if (state.step === 1) {
    renderLesson(chapter);
    updateStepPills();
    updateStepDots();
  } else if (state.step === 2) {
    // Check if already answered from saved state
    const prog = state.progress[state.chapter];
    if (prog && prog.quizCorrect) {
      state.quizAnsweredThisStep = true;
    }
    renderQuiz(chapter);
    updateStepPills();
    updateStepDots();
  }
}

function setContent(html) {
  const ca = document.getElementById('content-area');
  if (ca) ca.innerHTML = html;
}

/* ══════════════════════════════════════════════════════════════════════════
   HEADER UI
   ══════════════════════════════════════════════════════════════════════════ */
function updateHeaderUI() {
  const chapter = CHAPTERS[state.chapter];
  if (!chapter) return;

  const tagEl   = document.getElementById('header-tag');
  const titleEl = document.getElementById('header-title');
  const countEl = document.getElementById('chapter-counter');

  if (tagEl)   tagEl.textContent   = chapter.tag;
  if (titleEl) titleEl.textContent = chapter.title;
  if (countEl) countEl.textContent = `${state.chapter + 1} / ${CHAPTERS.length}`;
}

function updateStepPills() {
  const container = document.getElementById('step-pills');
  if (!container) return;

  container.innerHTML = STEP_LABELS.map((label, i) => {
    let cls = 'step-pill';
    if (i === state.step) cls += ' step-pill--active';
    else if (i < state.step) cls += ' step-pill--done';
    return `<div class="${cls}">${i < state.step ? '✓ ' : ''}${label}</div>`;
  }).join('');
}

function updateStepDots() {
  const container = document.getElementById('step-dots');
  if (!container) return;
  container.innerHTML = STEP_LABELS.map((_, i) => {
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
  if (fill) fill.style.width = pct + '%';
  if (track) track.setAttribute('aria-valuenow', pct);

  // Sidebar bar
  const count  = completedCount();
  const sbFill = document.getElementById('sidebar-progress-bar');
  const sbText = document.getElementById('sidebar-progress-text');
  const sbPct  = Math.round((count / CHAPTERS.length) * 100);
  if (sbFill) sbFill.style.width = sbPct + '%';
  if (sbText) sbText.textContent = `${count} / ${CHAPTERS.length} completed`;

  // Exam button unlock
  const examBtn  = document.getElementById('start-exam-btn');
  const lockIcon = document.getElementById('exam-lock-icon');
  if (examBtn) examBtn.disabled = !allChaptersComplete();
  if (lockIcon) lockIcon.style.display = allChaptersComplete() ? 'none' : '';
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
    const isLast = (state.chapter === CHAPTERS.length - 1 && state.step === 2);
    const nextLabel = document.querySelector('#btn-next .nav-label');
    if (isLast) {
      if (nextLabel) nextLabel.textContent = 'Finish';
    } else if (state.step === 2) {
      if (nextLabel) nextLabel.textContent = 'Next Chapter';
    } else {
      if (nextLabel) nextLabel.textContent = 'Next';
    }
    // BUG 1: Keep Next disabled on quiz step until the student answers correctly
    const isQuizStep = state.step === 2;
    const quizPassed = isQuizStep && !!(state.progress[state.chapter] && state.progress[state.chapter].quizCorrect);
    nextBtn.disabled = isQuizStep && !quizPassed;
  }
}

function updateNextBtn() {
  updateNavButtons();
}

/* ══════════════════════════════════════════════════════════════════════════
   SIDEBAR
   ══════════════════════════════════════════════════════════════════════════ */
function buildSidebar() {
  const nav = document.getElementById('chapter-list');
  if (!nav) return;

  // Hide legacy course-select if still in DOM
  const legacySel = document.getElementById('course-select');
  if (legacySel) legacySel.style.display = 'none';

  const activeCourseNum = getActiveCourseNum();

  function getProgressForCourse(courseNum) {
    if (courseNum === activeCourseNum) return state.progress;
    try {
      const key = courseNum === 4 ? 'lt_course4_state' : courseNum === 3 ? 'lt_course3_state' : courseNum === 2 ? 'lt_course2_state' : STORAGE_KEY;
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw).progress || {}) : {};
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
      else if (isCompleted && answered && correct) statusIcon = '<span class="chapter-status" title="Passed"><i data-lucide="check-circle" style="width:16px;height:16px;color:#00c878;"></i></span>';
      else if (isCompleted && answered)            statusIcon = '<span class="chapter-status" title="Reviewed"><i data-lucide="check-circle" style="width:16px;height:16px;color:#00c878;"></i></span>';
      else if (isCompleted)                        statusIcon = '<span class="chapter-status" title="Complete"><i data-lucide="check-circle" style="width:16px;height:16px;color:#00c878;"></i></span>';
      else if (isCurrent)                          statusIcon = '<span class="chapter-status" title="In Progress"><i data-lucide="clock" style="width:16px;height:16px;color:#c8960c;"></i></span>';

      let cls = 'chapter-item chapter-item--indented';
      if (isCurrent)   cls += ' chapter-item--active';
      if (isLocked)    cls += ' chapter-item--locked';
      if (isCompleted) cls += ' chapter-item--completed';

      return `
        <div class="${cls}" onclick="jumpToCourseChapter(${courseNum},${i})" title="${ch.title}">
          <span class="chapter-num" style="color:${COURSE_ACCENTS[courseNum] || '#00d4d4'}">${String(i + 1).padStart(2, '0')}</span>
          <div class="chapter-item-info">
            <div class="chapter-item-title">${ch.title}</div>
            <div class="chapter-item-tag">${ch.tag}</div>
          </div>
          ${statusIcon}
        </div>`;
    }).join('');
  }

  const courseDefs = [
    { num: 1, label: 'Course 1: Laying the Foundation', chapters: LT_CHAPTERS },
    { num: 2, label: 'Course 2: Building Your Toolbox', chapters: typeof LT_CHAPTERS_2 !== 'undefined' ? LT_CHAPTERS_2 : null },
    { num: 3, label: 'Course 3: Sharpening Your Edge', chapters: typeof LT_CHAPTERS_3 !== 'undefined' ? LT_CHAPTERS_3 : null },
    { num: 4, label: 'Course 4: ' + (typeof COURSE4_META !== 'undefined' ? COURSE4_META.subtitle : 'Advanced Mastery'), chapters: typeof LT_CHAPTERS_4 !== 'undefined' ? LT_CHAPTERS_4 : null }
  ].filter(c => c.chapters);

  const COURSE_ACCENTS = { 1: '#00d4d4', 2: '#e0b020', 3: '#a855f7', 4: '#cc2222' };

  nav.innerHTML = courseDefs.map(c => {
    const isActive = c.num === activeCourseNum;
    const accent   = COURSE_ACCENTS[c.num] || '#00d4d4';
    return `
      <div class="course-accordion${isActive ? ' course-accordion--active' : ''}" data-course="${c.num}">
        <div class="course-accordion-header" onclick="toggleCourseAccordion(${c.num})">
          <span class="course-accordion-label"><span style="color:${accent}">${c.label.split(':')[0]}:</span><span style="color:#ffffff"> ${c.label.split(':').slice(1).join(':').trim()}</span></span>
          <span class="course-accordion-chevron${isActive ? ' course-accordion-chevron--open' : ''}" style="color:${accent}">
            <i data-lucide="chevron-right" style="width:16px;height:16px;"></i>
          </span>
        </div>
        <div class="course-accordion-body${isActive ? ' course-accordion-body--open' : ''}">
          ${renderChapters(c.chapters, c.num)}
        </div>
      </div>`;
  }).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
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
function showToast(msg, duration = 3000) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.innerHTML = msg;
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

/* ══════════════════════════════════════════════════════════════════════════
   WELCOME BACK MODAL
   ══════════════════════════════════════════════════════════════════════════ */
function showWelcomeModal(savedData) {
  const modal     = document.getElementById('welcome-modal');
  const infoEl    = document.getElementById('modal-progress-info');
  const chapter   = CHAPTERS[savedData.chapter];
  const completed = Object.values(savedData.progress || {}).filter(p => p.completed).length;

  if (infoEl && chapter) {
    const stepName = STEP_LABELS[savedData.step] || 'Introduction';
    infoEl.innerHTML = `
      <strong>${chapter.title}</strong><br/>
      Step: ${stepName} · ${completed} / ${CHAPTERS.length} chapters complete`;
  }

  if (modal) modal.classList.remove('hidden');
}

function hideWelcomeModal() {
  const modal = document.getElementById('welcome-modal');
  if (modal) modal.classList.add('hidden');
}

/* ══════════════════════════════════════════════════════════════════════════
   EXAM HELPERS
   ══════════════════════════════════════════════════════════════════════════ */
function getExamQuestions() {
  const n = getActiveCourseNum();
  if (n === 4 && typeof LT_EXAM_QUESTIONS_4 !== 'undefined') return LT_EXAM_QUESTIONS_4;
  if (n === 3 && typeof LT_EXAM_QUESTIONS_3 !== 'undefined') return LT_EXAM_QUESTIONS_3;
  if (n === 2 && typeof LT_EXAM_QUESTIONS_2 !== 'undefined') return LT_EXAM_QUESTIONS_2;
  return LT_EXAM_QUESTIONS;
}

function getCourseName() {
  const n = getActiveCourseNum();
  if (n === 4 && typeof COURSE4_META !== 'undefined') return COURSE4_META.title;
  if (n === 3 && typeof COURSE3_META !== 'undefined') return COURSE3_META.title;
  if (n === 2 && typeof COURSE2_META !== 'undefined') return COURSE2_META.title;
  return 'Course 1: Laying the Foundation';
}

/* ══════════════════════════════════════════════════════════════════════════
   FINAL EXAM
   ══════════════════════════════════════════════════════════════════════════ */
function startExam() {
  if (!allChaptersComplete()) {
    showToast(`⚠️ Complete all ${CHAPTERS.length} chapters first.`);
    return;
  }

  state.examMode     = true;
  state.examQuestion = 0;
  state.examAnswers  = {};
  state.examComplete = false;

  const examScreen = document.getElementById('exam-screen');
  const examResult = document.getElementById('exam-result');
  const examBody   = document.getElementById('exam-body');

  if (examResult) examResult.classList.add('hidden');
  if (examBody)   examBody.innerHTML = '';
  if (examScreen) examScreen.classList.remove('hidden');

  renderExamQuestion();
}

function renderExamQuestion() {
  const q   = getExamQuestions()[state.examQuestion];
  const idx = state.examQuestion;

  const counter = document.getElementById('exam-q-counter');
  const fill    = document.getElementById('exam-progress-fill');
  const body    = document.getElementById('exam-body');

  if (counter) counter.textContent = `Question ${idx + 1} of ${getExamQuestions().length}`;
  if (fill)    fill.style.width = `${Math.round((idx / getExamQuestions().length) * 100)}%`;

  if (!body) return;

  const letters = ['A','B','C','D','E'];

  body.innerHTML = `
    <div class="exam-q-card">
      <div class="exam-q-num">Question ${idx + 1} of ${getExamQuestions().length}</div>
      <div class="exam-q-text">${q.question}</div>
      <div class="exam-q-chapter">Chapter ${q.chapterIndex + 1}: ${q.chapterTitle}</div>
      <div class="exam-answers" id="exam-answers-${idx}">
        ${q.answers.map((a, ai) => `
          <button class="exam-answer-btn" data-qidx="${idx}" data-aid="${a.id}"
            onclick="handleExamAnswer(${idx}, '${a.id}')">
            <span class="exam-answer-letter">${letters[ai] || a.id.toUpperCase()}</span>
            ${a.text}
          </button>
        `).join('')}
      </div>
      <button class="exam-next-btn" id="exam-next-btn" onclick="examNext()">
        ${idx === getExamQuestions().length - 1 ? 'Submit Exam <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>' : 'Next Question <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>'}
      </button>
    </div>`;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.handleExamAnswer = function(qIdx, answerId) {
  if (state.examAnswers[qIdx] !== undefined) return;

  state.examAnswers[qIdx] = answerId;

  const q      = getExamQuestions()[qIdx];
  const correct = q.answers.find(a => a.id === answerId && a.correct);

  // Style buttons
  document.querySelectorAll(`#exam-answers-${qIdx} .exam-answer-btn`).forEach(btn => {
    btn.disabled = true;
    const bid = btn.dataset.aid;
    const bDef = q.answers.find(a => a.id === bid);
    if (!bDef) return;
    if (bid === answerId && bDef.correct) btn.classList.add('exam-answer-btn--correct');
    else if (bid === answerId && !bDef.correct) btn.classList.add('exam-answer-btn--wrong');
    else if (bDef.correct) btn.classList.add('exam-answer-btn--missed');
  });

  // Show next button
  const nextBtn = document.getElementById('exam-next-btn');
  if (nextBtn) nextBtn.classList.add('show');
};

window.examNext = function() {
  const idx = state.examQuestion;
  if (state.examAnswers[idx] === undefined) {
    showToast('Please select an answer first.');
    return;
  }

  if (idx === getExamQuestions().length - 1) {
    finishExam();
  } else {
    state.examQuestion++;
    renderExamQuestion();
  }
};

function finishExam() {
  state.examComplete = true;

  const fill    = document.getElementById('exam-progress-fill');
  const counter = document.getElementById('exam-q-counter');
  if (fill)    fill.style.width = '100%';
  if (counter) counter.textContent = `Complete!`;

  // Score
  let correct = 0;
  getExamQuestions().forEach((q, i) => {
    const ans     = state.examAnswers[i];
    const answerDef = q.answers.find(a => a.id === ans);
    if (answerDef && answerDef.correct) correct++;
  });

  const total    = getExamQuestions().length;
  const pct      = Math.round((correct / total) * 100);
  const passed   = pct >= 70;

  const body     = document.getElementById('exam-body');
  const result   = document.getElementById('exam-result');

  if (body)   body.classList.add('hidden');
  if (result) result.classList.remove('hidden');

  // Find weak chapters
  const weak = getExamQuestions()
    .filter((q, i) => {
      const ans = state.examAnswers[i];
      const def = q.answers.find(a => a.id === ans);
      return !(def && def.correct);
    })
    .map(q => q.chapterTitle);

  const weakHtml = weak.length > 0 && !passed ? `
    <div class="exam-weak-chapters">
      <div class="exam-weak-title">Chapters to Review</div>
      <div class="exam-weak-list">
        ${weak.map(w => `<div class="exam-weak-item">${w}</div>`).join('')}
      </div>
    </div>` : '';

  if (result) {
    result.innerHTML = `
      <div class="exam-result-icon">${passed ? '<i data-lucide="award" style="width:48px;height:48px;"></i>' : '<i data-lucide="book-open" style="width:48px;height:48px;"></i>'}</div>
      <div class="exam-result-score">${correct}/${total}</div>
      <div class="exam-result-label">${pct}% — ${passed ? 'Pass' : 'Not Yet'}</div>
      <div class="${passed ? 'exam-result-pass' : 'exam-result-fail'}">
        ${passed
          ? '<i data-lucide="check-circle" style="width:15px;height:15px;"></i> Excellent work! You\'ve earned your certificate.'
          : '<i data-lucide="x-circle" style="width:15px;height:15px;"></i> Score 70%+ to pass. Review the chapters above and try again.'}
      </div>
      ${weakHtml}
      <div class="exam-result-actions">
        ${passed
          ? `<button class="btn-primary" onclick="showCertificate(${correct}, ${total})">View Certificate <i data-lucide="award" style="width:14px;height:14px;"></i></button>`
          : ''}
        <button class="btn-ghost" onclick="restartExam()">Retry Exam</button>
        <button class="btn-ghost" onclick="exitExam()">Back to Course</button>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

window.restartExam = function() {
  state.examAnswers  = {};
  state.examQuestion = 0;
  state.examComplete = false;

  const result = document.getElementById('exam-result');
  const body   = document.getElementById('exam-body');
  if (result) { result.innerHTML = ''; result.classList.add('hidden'); }
  if (body)   body.classList.remove('hidden');

  renderExamQuestion();

  const fill    = document.getElementById('exam-progress-fill');
  const counter = document.getElementById('exam-q-counter');
  if (fill)    fill.style.width = '0%';
  if (counter) counter.textContent = `Question 1 of ${getExamQuestions().length}`;
};

window.exitExam = function() {
  const examScreen = document.getElementById('exam-screen');
  if (examScreen) examScreen.classList.add('hidden');
  state.examMode = false;
};

/* ══════════════════════════════════════════════════════════════════════════
   CERTIFICATE
   ══════════════════════════════════════════════════════════════════════════ */
window.showCertificate = function(correct, total) {
  const pct = Math.round((correct / total) * 100);

  const certScreen = document.getElementById('cert-screen');
  const scoreEl    = document.getElementById('cert-score-display');
  const dateEl     = document.getElementById('cert-date-display');

  if (scoreEl) scoreEl.textContent = `Final Exam Score: ${correct}/${total} (${pct}%)`;
  if (dateEl)  dateEl.textContent  = `Completed: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`;

  const examScreen = document.getElementById('exam-screen');
  if (examScreen) examScreen.classList.add('hidden');
  if (certScreen) certScreen.classList.remove('hidden');
};

/* ══════════════════════════════════════════════════════════════════════════
   INTRO VIDEO BUTTON
   ══════════════════════════════════════════════════════════════════════════ */
window.toggleIntroVideo = function(videoUrl) {
  const wrap = document.getElementById('intro-video-wrap');
  const btn  = document.getElementById('intro-video-btn');
  if (!wrap) return;

  const existing = wrap.querySelector('.intro-video-frame-wrap');
  if (existing) {
    // Close: remove iframe, restore button
    existing.remove();
    if (btn) btn.style.display = 'inline-flex';
    return;
  }

  // Hide the button while video is showing
  if (btn) btn.style.display = 'none';

  const frameWrap = document.createElement('div');
  frameWrap.className = 'intro-video-frame-wrap';
  frameWrap.innerHTML = `
    <iframe
      src="${videoUrl}"
      width="100%" height="360"
      style="border:0;border-radius:8px;display:block;"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"
    ></iframe>
    <button class="intro-video-close" onclick="toggleIntroVideo('${videoUrl}')">
      ✕ Close Video
    </button>`;
  wrap.appendChild(frameWrap);
};

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
      font-family: Barlow, sans-serif;
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
      font-family: Barlow, sans-serif;
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
  // Nav buttons
  document.getElementById('btn-prev')?.addEventListener('click', () => navigate('prev'));
  document.getElementById('btn-next')?.addEventListener('click', () => navigate('next'));

  // Sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', openSidebar);
  document.getElementById('sidebar-close')?.addEventListener('click', closeSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

  // Welcome modal
  document.getElementById('modal-continue')?.addEventListener('click', () => {
    hideWelcomeModal();
    renderCurrentStep();
    updateHeaderUI();
    updateProgressUI();
    updateSidebar();
    updateNavButtons();
    updateStepPills();
    updateStepDots();
  });

  document.getElementById('modal-restart')?.addEventListener('click', () => {
    clearState();
    Object.assign(state, {
      chapter: 0, step: 0, progress: {}, quizAnsweredThisStep: false,
      examMode: false, examQuestion: 0, examAnswers: {}, examComplete: false
    });
    hideWelcomeModal();
    init(false);
  });

  // Final exam button
  document.getElementById('start-exam-btn')?.addEventListener('click', startExam);

  // Certificate buttons
  document.getElementById('cert-review-btn')?.addEventListener('click', () => {
    const certScreen = document.getElementById('cert-screen');
    if (certScreen) certScreen.classList.add('hidden');
  });

  document.getElementById('cert-print-btn')?.addEventListener('click', () => {
    window.print();
  });

  // Keyboard nav
  document.addEventListener('keydown', e => {
    if (state.examMode) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate('next');
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   navigate('prev');
  });

  // Global resize
  window.addEventListener('resize', () => {
    Object.values(charts).forEach(c => { try { c.resize(); } catch(_) {} });
  });

}

/* ═══════════════════════════════════════════════════════════════════════
   COURSE ACCORDION
   ═══════════════════════════════════════════════════════════════════════ */
function switchActiveCourse(courseNum) {
  saveState();
  localStorage.setItem('lt_active_course', String(courseNum));
  if (courseNum === 4 && typeof LT_CHAPTERS_4 !== 'undefined') CHAPTERS = LT_CHAPTERS_4;
  else if (courseNum === 3 && typeof LT_CHAPTERS_3 !== 'undefined') CHAPTERS = LT_CHAPTERS_3;
  else if (courseNum === 2 && typeof LT_CHAPTERS_2 !== 'undefined') CHAPTERS = LT_CHAPTERS_2;
  else CHAPTERS = LT_CHAPTERS;
  const key = courseNum === 4 ? 'lt_course4_state' : courseNum === 3 ? 'lt_course3_state' : courseNum === 2 ? 'lt_course2_state' : STORAGE_KEY;
  let restored = { chapter: 0, step: 0, progress: {} };
  try {
    const raw = localStorage.getItem(key);
    if (raw) { const p = JSON.parse(raw); restored = { chapter: p.chapter || 0, step: p.step || 0, progress: p.progress || {} }; }
  } catch(_) {}
  Object.assign(state, restored, { quizAnsweredThisStep: false, examMode: false, examQuestion: 0, examAnswers: {}, examComplete: false });
  if (state.step === 2) {
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

/* ══════════════════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════════════════ */
function init(checkSaved = true) {
  // Restore active course selection
  const savedCourse = localStorage.getItem('lt_active_course');
  if (savedCourse === '4' && typeof LT_CHAPTERS_4 !== 'undefined') {
    CHAPTERS = LT_CHAPTERS_4;
  } else if (savedCourse === '3' && typeof LT_CHAPTERS_3 !== 'undefined') {
    CHAPTERS = LT_CHAPTERS_3;
  } else if (savedCourse === '2' && typeof LT_CHAPTERS_2 !== 'undefined') {
    CHAPTERS = LT_CHAPTERS_2;
  }

  // Restore saved state FIRST — markChapterStarted() calls saveState() and would
  // overwrite localStorage before we ever read it if called before loadState().
  if (checkSaved) {
    const saved = loadState();
    if (saved && (saved.chapter > 0 || saved.step > 0 || Object.keys(saved.progress || {}).length > 0)) {
      state.chapter  = saved.chapter  || 0;
      state.step     = saved.step     || 0;
      state.progress = saved.progress || {};
      // Restore quizAnsweredThisStep for the current quiz step
      if (state.step === 2) {
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
      showWelcomeModal(saved);
      return; // Don't render until user confirms modal
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
  renderCurrentStep();
}

/* ══════════════════════════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* apply saved settings before first render */
  var savedColor = localStorage.getItem('lt_bullish_color');
  if (savedColor) document.documentElement.style.setProperty('--teal', savedColor);
  var savedTheme = localStorage.getItem('lt_theme');
  if (savedTheme === 'light') {
    var _lt = { '--bg':'#f5f5f5','--bg2':'#ebebeb','--bg3':'#e0e0e0','--bg4':'#d5d5d5',
                '--text':'#000000','--text2':'#333333','--border':'#cccccc','--border2':'#bbbbbb' };
    Object.keys(_lt).forEach(function(k){ document.documentElement.style.setProperty(k,_lt[k]); });
  }
  wireEvents();
  init(true);
});

/* ══════════════════════════════════════════════════════════════════════════
   GLOBAL JUMP FUNCTION (used by sidebar onclick)
   ══════════════════════════════════════════════════════════════════════════ */
window.jumpToChapter = jumpToChapter;

window.ltRefreshCharts = function() {
  TEAL = getBullishColor();
  disposeAllCharts();
  renderCurrentStep();
};

function showSettings() {
  const area = document.getElementById('content-area');
  area.innerHTML = '';
  renderSettingsPage('content-area');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.showSimulator = function() {
  disposeAllCharts();
  if (typeof renderSimulator === 'function') {
    renderSimulator('content-area');
  } else {
    showToast('Simulator not available.');
  }
};
