'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Practice Simulator
   lt-sim-ui.js  |  Interactive trading practice loop

   Flow per round:
     1. Random pattern + timeframe + seed → generate market via lt-simulator.js
     2. Show setup candles up to cutIndex — student reads the chart
     3. Student picks: Long / Short / Flat  +  size (1–10%) +  leverage (1–20×)
     4. Animated wireframe reveal of outcome candles
     5. P&L scored, equity curve updated, verdict card shown
     6. "Next Round" repeats; stats persist to localStorage
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── SIM CONCEPTS MAP ───────────────────────────────────────────────────────
   Links each simulator injector key to its Liquidity Theory vocabulary.     */
const SIM_CONCEPTS = {
  uptrend:          { name: 'Uptrend — Higher Highs & Higher Lows',     bias: 'long',    blurb: 'In a confirmed uptrend each Higher Low is a buying opportunity. Trade with the trend.' },
  downtrend:        { name: 'Downtrend — Lower Highs & Lower Lows',     bias: 'short',   blurb: 'In a downtrend every Lower High is a sell. The path of least resistance is down.' },
  range:            { name: 'Range-Bound Market',                        bias: 'neutral', blurb: 'Buy the range low (DBS), sell the range high (SSR). Avoid trading the middle.' },
  bull_flag:        { name: 'Bull Flag — Continuation Pattern',         bias: 'long',    blurb: 'A tight pullback after a strong impulse. Breakout above the flag pole signals continuation.' },
  bear_flag:        { name: 'Bear Flag — Continuation Pattern',         bias: 'short',   blurb: 'A shallow bounce after a sharp drop. Break of the flag low confirms continuation down.' },
  breakout:         { name: 'Range Breakout',                            bias: 'long',    blurb: 'Price consolidates then breaks through resistance with force. Old resistance becomes new support on a retest.' },
  double_top:       { name: 'Double Top — Reversal Pattern',            bias: 'short',   blurb: 'Two equal highs at the same resistance signals exhaustion. Break of the neckline confirms reversal.' },
  double_bottom:    { name: 'Double Bottom — Reversal Pattern',         bias: 'long',    blurb: 'Two equal lows at the same support signals buyer absorption. Break of the neckline confirms reversal.' },
  demand_bounce:    { name: 'Demand Zone (DBS) Bounce',                 bias: 'long',    blurb: 'Price returns to a prior demand zone with long wicks. First fresh test of DBS = highest probability long.' },
  supply_reject:    { name: 'Supply Zone (SSR) Rejection',              bias: 'short',   blurb: 'Price rallies into a prior supply zone with upper wicks. First fresh test of SSR = highest probability short.' },
  reversal_hammer:  { name: 'Hammer — Seller Exhaustion Reversal',      bias: 'long',    blurb: 'Long lower wick at the bottom of a downtrend. Sellers pushed hard but buyers rejected the move completely.' },
  shooting_star:    { name: 'Shooting Star — Buyer Exhaustion',         bias: 'short',   blurb: 'Long upper wick at the top of an uptrend. Buyers got rejected at the highs — seller exhaustion signal.' },
  inverted_hammer:  { name: 'Inverted Hammer — Bullish Reversal',       bias: 'long',    blurb: 'Long upper wick at the bottom of a downtrend. Buyers are beginning to fight back — watch for confirmation.' },
  doji:             { name: 'Doji — Indecision / Trend Pause',          bias: 'neutral', blurb: 'Open = close. Neither side won. At the end of a trend, a Doji signals a potential reversal.' },
  sr_flip:          { name: 'S/R Flip — Resistance Becomes Support',    bias: 'long',    blurb: 'After breaking above resistance the retest from above is the highest probability entry. Old resistance = new support.' },
  liquidity_sweep:  { name: 'Swing Failure Pattern (SFP)',              bias: 'short',   blurb: 'Price spikes above a prior high to grab liquidity, then reverses sharply. Trapped breakout longs provide fuel.' },
  bos:              { name: 'Break of Structure (BOS)',                  bias: 'short',   blurb: 'Price breaks a key swing low in an uptrend — bearish BOS. The first sign a trend is changing.' },
};

const SIM_PATTERNS   = Object.keys(SIM_CONCEPTS);
const SIM_TIMEFRAMES = ['4h', '6h', '12h', '1d'];
const SIM_STORAGE    = 'lt_sim_stats';

/* ── STATS PERSISTENCE ────────────────────────────────────────────────────── */
function simLoadStats() {
  try {
    const raw = localStorage.getItem(SIM_STORAGE);
    if (raw) return JSON.parse(raw);
  } catch(_) {}
  return { equity: 1000, trades: 0, wins: 0, streak: 0, bestStreak: 0, history: [] };
}

function simSaveStats(s) {
  try { localStorage.setItem(SIM_STORAGE, JSON.stringify(s)); } catch(_) {}
}

/* ── MODULE STATE ─────────────────────────────────────────────────────────── */
let _simStats       = null;  // loaded on open
let _simMarket      = null;  // current generateMarket() result
let _simView        = null;  // current viewMarket() result
let _simPattern     = null;  // current pattern key
let _simTF          = null;  // current timeframe
let _simSeed        = null;  // current seed
let _simChartInst   = null;  // ECharts instance for the sim chart
let _simRevealTimer = null;  // active reveal interval
let _simAnswered    = false; // has student made a decision this round

/* ── HELPERS ──────────────────────────────────────────────────────────────── */
function _simBullishColor() {
  return localStorage.getItem('lt_bullish_color') || '#00d4d4';
}

function _simNewRound() {
  _simPattern = SIM_PATTERNS[Math.floor(Math.random() * SIM_PATTERNS.length)];
  _simTF      = SIM_TIMEFRAMES[Math.floor(Math.random() * SIM_TIMEFRAMES.length)];
  _simSeed    = Math.floor(Math.random() * 99999) + 1;
  _simMarket  = generateMarket(_simPattern, _simSeed);
  _simView    = viewMarket(_simMarket, _simTF);
  _simAnswered = false;
}

function _simEquityColor(equity) {
  const base = 1000;
  return equity >= base ? _simBullishColor() : '#cc2222';
}

/* ── INJECT STYLES (once) ─────────────────────────────────────────────────── */
function _simInjectStyles() {
  if (document.getElementById('lt-sim-styles')) return;
  const s = document.createElement('style');
  s.id = 'lt-sim-styles';
  s.textContent = `
    .sim-wrap { width:100%; max-width:960px; margin:0 auto; padding:0 0 32px; }

    /* ── back bar ── */
    .sim-back-bar {
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 0 10px; margin-bottom:4px;
    }
    .sim-back-btn {
      display:inline-flex; align-items:center; gap:6px;
      background:transparent; border:none; color:var(--teal);
      font-family:'Barlow',sans-serif; font-size:13px; font-weight:600;
      cursor:pointer; padding:0;
    }
    .sim-back-btn:hover { opacity:0.8; }
    .sim-title-row { display:flex; align-items:baseline; gap:12px; }
    .sim-title {
      font-family:'Barlow Condensed',sans-serif;
      font-size:26px; font-weight:800; color:var(--text); margin:0;
    }
    .sim-subtitle { font-size:12px; color:var(--text3); }

    /* ── stats strip ── */
    .sim-stats-strip {
      display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap;
    }
    .sim-stat {
      flex:1; min-width:110px;
      background:var(--bg3); border:1px solid var(--border);
      border-radius:var(--radius); padding:10px 14px;
    }
    .sim-stat-label {
      font-size:10px; font-weight:700; text-transform:uppercase;
      letter-spacing:0.8px; color:var(--text3); margin-bottom:4px;
    }
    .sim-stat-value {
      font-size:20px; font-weight:800; color:var(--teal);
      font-variant-numeric:tabular-nums;
    }
    .sim-stat-value.down { color:#cc2222; }

    /* ── chart card ── */
    .sim-chart-card {
      background:var(--bg3); border:1px solid var(--border);
      border-radius:var(--radius-lg); overflow:hidden; margin-bottom:14px;
    }
    .sim-chart-topbar {
      display:flex; align-items:center; justify-content:space-between;
      padding:9px 16px; border-bottom:1px solid var(--border);
    }
    .sim-chart-title { font-size:13px; font-weight:700; color:var(--text); }
    .sim-chart-badge {
      font-size:10px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;
      padding:2px 8px; border-radius:10px;
      background:var(--teal-dim); border:1px solid var(--teal); color:var(--teal);
    }
    .sim-chart-badge.reveal { background:rgba(200,150,12,0.12); border-color:#c8960c; color:#c8960c; }
    #sim-chart-el { width:100%; height:340px; }

    /* ── decision panel ── */
    .sim-decision-panel {
      background:var(--bg3); border:1px solid var(--border);
      border-radius:var(--radius-lg); padding:20px 22px; margin-bottom:14px;
    }
    .sim-decision-label {
      font-size:10px; font-weight:700; text-transform:uppercase;
      letter-spacing:0.8px; color:var(--teal); margin-bottom:14px;
    }
    .sim-direction-row { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
    .sim-dir-btn {
      flex:1; min-width:90px; padding:12px 10px;
      border-radius:var(--radius); border:2px solid;
      font-size:13px; font-weight:700; cursor:pointer;
      transition:all 0.15s; background:transparent; font-family:'Barlow',sans-serif;
    }
    .sim-dir-btn:disabled { opacity:0.4; cursor:not-allowed; }
    .sim-dir-long  { border-color:var(--teal);  color:var(--teal);  background:var(--teal-faint); }
    .sim-dir-short { border-color:#cc2222;       color:#cc2222;       background:rgba(204,34,34,0.05); }
    .sim-dir-flat  { border-color:var(--border3);color:var(--text3);  background:var(--bg4); }
    .sim-dir-long:hover:not(:disabled)  { background:rgba(0,212,212,0.15); box-shadow:0 0 12px rgba(0,212,212,0.2); }
    .sim-dir-short:hover:not(:disabled) { background:rgba(204,34,34,0.15); box-shadow:0 0 12px rgba(204,34,34,0.2); }
    .sim-dir-flat:hover:not(:disabled)  { background:var(--bg5); border-color:var(--border2); color:var(--text2); }
    .sim-dir-btn.selected-long  { background:rgba(0,212,212,0.18)!important; border-color:var(--teal)!important; }
    .sim-dir-btn.selected-short { background:rgba(204,34,34,0.18)!important; border-color:#cc2222!important; }
    .sim-dir-btn.selected-flat  { background:var(--bg5)!important; border-color:var(--border2)!important; color:var(--text)!important; }

    .sim-controls-row {
      display:flex; gap:14px; align-items:center; flex-wrap:wrap;
    }
    .sim-control-group { display:flex; flex-direction:column; gap:5px; flex:1; min-width:120px; }
    .sim-control-label { font-size:11px; font-weight:600; color:var(--text3); }
    .sim-slider {
      -webkit-appearance:none; appearance:none;
      width:100%; height:4px; border-radius:2px;
      background:var(--border2); outline:none; cursor:pointer;
    }
    .sim-slider::-webkit-slider-thumb {
      -webkit-appearance:none; appearance:none;
      width:14px; height:14px; border-radius:50%;
      background:var(--teal); cursor:pointer;
      box-shadow:0 0 6px rgba(0,212,212,0.4);
    }
    .sim-slider::-moz-range-thumb {
      width:14px; height:14px; border-radius:50%;
      background:var(--teal); cursor:pointer; border:none;
    }
    .sim-slider-val {
      font-size:13px; font-weight:700; color:var(--teal);
      min-width:40px; text-align:right;
    }
    .sim-slider-row { display:flex; align-items:center; gap:8px; }

    .sim-trade-btn {
      padding:12px 28px;
      background:var(--teal); border:none; border-radius:var(--radius);
      color:#000; font-size:14px; font-weight:800;
      cursor:pointer; font-family:'Barlow',sans-serif; white-space:nowrap;
      transition:all 0.15s; flex-shrink:0;
    }
    .sim-trade-btn:hover:not(:disabled) { background:var(--teal2); box-shadow:var(--glow-teal); }
    .sim-trade-btn:disabled { opacity:0.4; cursor:not-allowed; }

    /* ── verdict card ── */
    .sim-verdict {
      border-radius:var(--radius-lg); padding:20px 22px; margin-bottom:14px;
      border-left:4px solid; animation:simFadeIn 0.3s ease;
    }
    .sim-verdict-win  { border-color:var(--teal);  background:rgba(0,212,212,0.05); }
    .sim-verdict-loss { border-color:#cc2222;       background:rgba(204,34,34,0.04); }
    .sim-verdict-flat { border-color:var(--border2);background:var(--bg3); }
    .sim-verdict-header {
      display:flex; align-items:baseline; gap:12px; margin-bottom:10px; flex-wrap:wrap;
    }
    .sim-verdict-result {
      font-size:22px; font-weight:900;
    }
    .sim-verdict-pnl { font-size:13px; font-weight:600; color:var(--text2); }
    .sim-verdict-pattern {
      font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px;
      color:var(--teal); margin-bottom:6px;
    }
    .sim-verdict-blurb { font-size:13px; color:var(--text2); line-height:1.6; }
    .sim-verdict-stats {
      display:flex; gap:16px; margin-top:12px; flex-wrap:wrap;
    }
    .sim-verdict-stat { font-size:12px; color:var(--text3); }
    .sim-verdict-stat strong { color:var(--text); }

    .sim-next-btn {
      width:100%; padding:13px;
      background:var(--teal); border:none; border-radius:var(--radius);
      color:#000; font-size:14px; font-weight:800;
      cursor:pointer; font-family:'Barlow',sans-serif;
      transition:all 0.15s; margin-bottom:4px;
    }
    .sim-next-btn:hover { background:var(--teal2); box-shadow:var(--glow-teal); }

    /* ── equity chart ── */
    .sim-equity-card {
      background:var(--bg3); border:1px solid var(--border);
      border-radius:var(--radius-lg); overflow:hidden; margin-bottom:14px;
    }
    .sim-equity-topbar {
      display:flex; align-items:center; justify-content:space-between;
      padding:9px 16px; border-bottom:1px solid var(--border);
      font-size:12px; font-weight:700; color:var(--text2);
    }
    #sim-equity-el { width:100%; height:120px; }

    /* ── reset row ── */
    .sim-reset-row {
      display:flex; justify-content:flex-end; padding-top:4px;
    }
    .sim-reset-btn {
      background:transparent; border:1px solid var(--border2);
      color:var(--text3); font-size:11px; padding:5px 14px;
      border-radius:10px; cursor:pointer; font-family:'Barlow',sans-serif;
      transition:all 0.15s;
    }
    .sim-reset-btn:hover { border-color:#cc2222; color:#cc2222; }

    @keyframes simFadeIn {
      from { opacity:0; transform:translateY(8px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @media (max-width:600px) {
      #sim-chart-el { height:240px; }
      .sim-direction-row { gap:6px; }
      .sim-dir-btn { padding:10px 6px; font-size:12px; }
    }
  `;
  document.head.appendChild(s);
}

/* ── EQUITY CHART ─────────────────────────────────────────────────────────── */
let _simEquityChart = null;

function _simRenderEquityChart() {
  const el = document.getElementById('sim-equity-el');
  if (!el) return;

  if (_simEquityChart) { try { _simEquityChart.dispose(); } catch(_) {} }

  const history = _simStats.history;
  const labels  = history.map((_, i) => i === 0 ? 'Start' : `T${i}`);
  const values  = history.length ? history : [_simStats.equity];
  const color   = _simEquityColor(_simStats.equity);

  _simEquityChart = echarts.init(el, null, { renderer: 'canvas' });
  _simEquityChart.setOption({
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 400,
    grid: { left: 52, right: 12, top: 10, bottom: 22 },
    xAxis: {
      type: 'category', data: labels,
      axisLabel: { color: '#555', fontSize: 9, fontFamily: 'Barlow,sans-serif' },
      axisLine: { lineStyle: { color: '#1e1e1e' } }, splitLine: { show: false }
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: '#1e1e1e', type: 'dashed' } },
      axisLabel: { color: '#555', fontSize: 9, fontFamily: 'Barlow,sans-serif',
                   formatter: v => '$' + v.toFixed(0) }
    },
    series: [{
      type: 'line', data: values, smooth: true, symbol: 'none',
      lineStyle: { color, width: 2 },
      areaStyle: { color: { type: 'linear', x:0, y:0, x2:0, y2:1,
        colorStops: [
          { offset: 0, color: color.replace(')', ',0.18)').replace('rgb','rgba') },
          { offset: 1, color: color.replace(')', ',0.02)').replace('rgb','rgba') }
        ]}
      }
    }]
  });

  const ro = new ResizeObserver(() => { try { _simEquityChart && _simEquityChart.resize(); } catch(_) {} });
  ro.observe(el);
}

/* ── STATS STRIP ──────────────────────────────────────────────────────────── */
function _simUpdateStats() {
  const s   = _simStats;
  const pnl = s.equity - 1000;

  const eq = document.getElementById('sim-stat-equity');
  const wr = document.getElementById('sim-stat-winrate');
  const tr = document.getElementById('sim-stat-trades');
  const sk = document.getElementById('sim-stat-streak');

  if (eq) {
    eq.textContent = `$${s.equity.toFixed(0)}`;
    eq.className   = 'sim-stat-value' + (pnl >= 0 ? '' : ' down');
  }
  const wr_pct = s.trades > 0 ? Math.round((s.wins / s.trades) * 100) : 0;
  if (wr) { wr.textContent = `${wr_pct}%`; wr.className = 'sim-stat-value' + (wr_pct >= 50 ? '' : ' down'); }
  if (tr) tr.textContent = String(s.trades);
  if (sk) sk.textContent = `${s.streak}🔥`;

  // Update equity card header P&L label
  const pnlLabel = document.getElementById('sim-equity-pnl');
  if (pnlLabel) {
    pnlLabel.textContent  = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)} all-time`;
    pnlLabel.style.color  = _simEquityColor(s.equity);
  }

  _simRenderEquityChart();
}

/* ── MAIN CHART RENDER ────────────────────────────────────────────────────── */
function _simRenderSetup() {
  const el = document.getElementById('sim-chart-el');
  if (!el || !_simView) return;

  if (_simChartInst) { try { _simChartInst.dispose(); } catch(_) {} }

  const { ohlc, labels, cutIndex, markLines } = _simView;
  const setupOhlc   = ohlc.slice(0, cutIndex);
  const setupLabels = labels.slice(0, cutIndex);

  const TEAL = _simBullishColor();
  const RED  = '#cc2222';

  const C = {
    BG3: 'transparent', BG4: '#141414', BORDER: '#1e1e1e',
    TEXT3: '#555555', TOOLTIP_TEXT: '#ffffff'
  };

  _simChartInst = echarts.init(el, null, { renderer: 'canvas' });

  const mlData = (markLines || []).map(ml => [{
    yAxis: ml.yAxis,
    label: { show: true, formatter: ml.label, color: TEAL, fontSize: 10, fontWeight: 600, position: 'end' },
    lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.75 }
  }, { yAxis: ml.yAxis }]);

  _simChartInst.setOption({
    backgroundColor: '#0f0f0f',
    animation: true, animationDuration: 500,
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'cross' },
      backgroundColor: C.BG4, borderColor: C.BORDER,
      textStyle: { color: C.TOOLTIP_TEXT, fontSize: 11, fontFamily: 'Barlow,sans-serif' },
      formatter(params) {
        const c = params.find(p => p.seriesName === 'Price');
        if (!c || !c.data) return '';
        const d = Array.isArray(c.data) ? c.data : c.data.value;
        const [o, cl, lo, hi] = d;
        const chg = cl - o, pct = ((chg/o)*100).toFixed(2);
        const col = chg >= 0 ? TEAL : RED;
        return `<b style="color:#fff">${setupLabels[c.dataIndex] || ''}</b><br/>
          O:${o} C:<span style="color:${col};font-weight:700">${cl}</span><br/>
          H:${hi} L:${lo}<br/><span style="color:${col}">${chg>=0?'+':''}${pct}%</span>`;
      }
    },
    grid: { left: 52, right: 28, top: 24, bottom: 36 },
    xAxis: {
      type: 'category', data: setupLabels,
      axisLine: { lineStyle: { color: C.BORDER } },
      axisLabel: { color: C.TEXT3, fontSize: 10, fontFamily: 'Barlow,sans-serif' },
      splitLine: { show: false }
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: C.BORDER, type: 'dashed' } },
      axisLine: { lineStyle: { color: C.BORDER } },
      axisLabel: { color: C.TEXT3, fontSize: 10, fontFamily: 'Barlow,sans-serif' }
    },
    series: [{
      name: 'Price', type: 'candlestick', data: setupOhlc, barMaxWidth: 20,
      itemStyle: { color: TEAL, color0: RED, borderColor: TEAL, borderColor0: RED, borderWidth: 1.5 },
      markLine: { symbol: ['none','none'], silent: true, data: mlData }
    }]
  });

  const ro = new ResizeObserver(() => { try { _simChartInst && _simChartInst.resize(); } catch(_) {} });
  ro.observe(el);
}

/* ── REVEAL ANIMATION ─────────────────────────────────────────────────────── */
function _simReveal(direction, entryPrice, onComplete) {
  if (_simRevealTimer) { clearInterval(_simRevealTimer); _simRevealTimer = null; }

  const { ohlc, labels, cutIndex } = _simView;
  const setupOhlc    = ohlc.slice(0, cutIndex);
  const setupLabels  = labels.slice(0, cutIndex);
  const revealOhlc   = ohlc.slice(cutIndex);
  const revealLabels = labels.slice(cutIndex);

  const TEAL = _simBullishColor();
  const RED  = '#cc2222';
  const decisionIdx = setupOhlc.length - 1;

  // Mark decision point on chart
  if (_simChartInst) {
    _simChartInst.setOption({
      series: [{
        markLine: {
          symbol: ['none','none'], silent: true,
          data: [
            [{ xAxis: decisionIdx,
               label: { show: true, formatter: 'Decision', color: TEAL, fontSize: 10, fontWeight: 700, position: 'insideEndTop' },
               lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.8 } },
             { xAxis: decisionIdx }],
            ...(_simView.markLines || []).map(ml => [{
              yAxis: ml.yAxis,
              label: { show: true, formatter: ml.label, color: TEAL, fontSize: 10, fontWeight: 600, position: 'end' },
              lineStyle: { color: TEAL, type: 'dashed', width: 1.5, opacity: 0.75 }
            }, { yAxis: ml.yAxis }])
          ]
        }
      }]
    }, { notMerge: false });
  }

  // Update badge
  const badge = document.querySelector('.sim-chart-badge');
  if (badge) { badge.textContent = 'Revealing…'; badge.className = 'sim-chart-badge reveal'; }

  let count = 0;
  const total = revealOhlc.length;

  _simRevealTimer = setInterval(() => {
    count++;
    const visibleLabels  = [...setupLabels, ...revealLabels.slice(0, count)];
    const wireframeData  = revealOhlc.slice(0, count).map(c => {
      const isBull = c[1] >= c[0];
      return { value: c, itemStyle: {
        color: 'transparent', borderColor: isBull ? TEAL : RED,
        borderWidth: 1.5, color0: 'transparent', borderColor0: RED
      }};
    });

    if (_simChartInst) {
      _simChartInst.setOption({
        xAxis:  { data: visibleLabels },
        series: [{ data: [...setupOhlc, ...wireframeData] }]
      }, { notMerge: false });
    }

    if (count >= total) {
      clearInterval(_simRevealTimer);
      _simRevealTimer = null;
      if (badge) badge.textContent = 'Revealed';

      // Glow on chart based on outcome
      const exitPrice = revealOhlc[total - 1][1];
      const outcome   = direction === 'long' ? exitPrice - entryPrice
                      : direction === 'short' ? entryPrice - exitPrice
                      : 0;
      const glowColor = outcome > 0 ? 'rgba(0,212,212,0.45)' : outcome < 0 ? 'rgba(204,34,34,0.45)' : 'rgba(100,100,100,0.3)';
      const chartEl   = document.getElementById('sim-chart-el');
      if (chartEl) {
        chartEl.style.transition = 'box-shadow 0.3s ease';
        chartEl.style.boxShadow  = `0 0 18px 4px ${glowColor}`;
        setTimeout(() => { if (chartEl) chartEl.style.boxShadow = ''; }, 1400);
      }

      if (onComplete) onComplete(exitPrice);
    }
  }, 240);
}

/* ── SCORE ROUND ──────────────────────────────────────────────────────────── */
function _simScoreRound(direction, size, leverage, entryPrice, exitPrice) {
  const pricePct = (exitPrice - entryPrice) / entryPrice;
  const dirMult  = direction === 'long' ? 1 : direction === 'short' ? -1 : 0;
  const rawPnL   = dirMult * pricePct * leverage;          // % return on position
  const dollarPnL = rawPnL * (_simStats.equity * (size / 100));

  const newEquity = Math.max(0, _simStats.equity + dollarPnL);
  const won       = direction !== 'flat' && dollarPnL > 0;
  const lost      = direction !== 'flat' && dollarPnL < 0;

  _simStats.trades++;
  if (won) { _simStats.wins++; _simStats.streak++; }
  else if (lost) { _simStats.streak = 0; }
  if (_simStats.streak > _simStats.bestStreak) _simStats.bestStreak = _simStats.streak;

  _simStats.equity = +newEquity.toFixed(2);
  _simStats.history.push(_simStats.equity);
  if (_simStats.history.length > 50) _simStats.history.shift(); // cap history

  simSaveStats(_simStats);

  return { dollarPnL: +dollarPnL.toFixed(2), pricePct: +(pricePct * 100).toFixed(2), won, lost };
}

/* ── VERDICT CARD ─────────────────────────────────────────────────────────── */
function _simShowVerdict(direction, size, leverage, result) {
  const existing = document.getElementById('sim-verdict-wrap');
  if (existing) existing.remove();

  const concept   = SIM_CONCEPTS[_simPattern] || { name: _simPattern, bias: 'neutral', blurb: '' };
  const isFlat    = direction === 'flat';
  const verdictCls = isFlat ? 'sim-verdict-flat' : result.won ? 'sim-verdict-win' : 'sim-verdict-loss';
  const emoji      = isFlat ? '⏸' : result.won ? '✅' : '❌';
  const resultText = isFlat
    ? 'Sat Out'
    : `${result.dollarPnL >= 0 ? '+' : ''}$${result.dollarPnL.toFixed(2)}`;
  const resultColor = isFlat ? 'var(--text2)' : result.won ? _simBullishColor() : '#cc2222';

  // Bias match
  const biasMatch = concept.bias === direction || concept.bias === 'neutral';
  const biasNote  = isFlat ? '' : biasMatch
    ? `<span style="color:var(--teal);font-size:12px;font-weight:700;">✓ Correct read — ${direction.toUpperCase()} aligned with pattern bias</span>`
    : `<span style="color:#cc2222;font-size:12px;font-weight:700;">✗ Against the pattern — bias was ${concept.bias.toUpperCase()}</span>`;

  const wrap = document.createElement('div');
  wrap.id = 'sim-verdict-wrap';
  wrap.innerHTML = `
    <div class="sim-verdict ${verdictCls}">
      <div class="sim-verdict-header">
        <span class="sim-verdict-result" style="color:${resultColor}">${emoji} ${resultText}</span>
        ${!isFlat ? `<span class="sim-verdict-pnl">${size}% size · ${leverage}× lev · ${result.pricePct >= 0 ? '+' : ''}${result.pricePct}% move</span>` : ''}
      </div>
      <div class="sim-verdict-pattern">${concept.name}</div>
      <div class="sim-verdict-blurb">${concept.blurb}</div>
      ${biasNote ? `<div style="margin-top:8px;">${biasNote}</div>` : ''}
      <div class="sim-verdict-stats">
        <div class="sim-verdict-stat">Equity: <strong>$${_simStats.equity.toFixed(0)}</strong></div>
        <div class="sim-verdict-stat">Win rate: <strong>${_simStats.trades > 0 ? Math.round((_simStats.wins/_simStats.trades)*100) : 0}%</strong></div>
        <div class="sim-verdict-stat">Streak: <strong>${_simStats.streak}</strong></div>
        <div class="sim-verdict-stat">Best: <strong>${_simStats.bestStreak}</strong></div>
      </div>
    </div>
    <button class="sim-next-btn" onclick="window._simNextRound()">
      Next Round <span style="font-size:16px;">→</span>
    </button>
  `;

  // Insert after the decision panel
  const decPanel = document.getElementById('sim-decision-panel');
  if (decPanel) decPanel.after(wrap);
  else document.getElementById('content-area').appendChild(wrap);

  _simUpdateStats();
}

/* ── HANDLE TRADE SUBMISSION ─────────────────────────────────────────────── */
window._simSubmitTrade = function() {
  if (_simAnswered) return;
  _simAnswered = true;

  const direction = document.getElementById('sim-dir-hidden')?.value || 'flat';
  const size      = parseInt(document.getElementById('sim-size-slider')?.value || '5', 10);
  const leverage  = parseInt(document.getElementById('sim-lev-slider')?.value || '1', 10);

  // Disable all controls
  document.querySelectorAll('.sim-dir-btn, .sim-trade-btn, .sim-slider').forEach(el => el.disabled = true);

  const { ohlc, cutIndex } = _simView;
  const entryPrice = ohlc[cutIndex - 1][1]; // close of last setup candle

  _simReveal(direction, entryPrice, (exitPrice) => {
    const result = _simScoreRound(direction, size, leverage, entryPrice, exitPrice);
    _simShowVerdict(direction, size, leverage, result);
  });
};

/* ── DIRECTION BUTTON HANDLER ─────────────────────────────────────────────── */
window._simSelectDir = function(dir) {
  if (_simAnswered) return;
  document.querySelectorAll('.sim-dir-btn').forEach(b => {
    b.classList.remove('selected-long', 'selected-short', 'selected-flat');
  });
  const btn = document.getElementById(`sim-dir-${dir}`);
  if (btn) btn.classList.add(`selected-${dir}`);
  const hidden = document.getElementById('sim-dir-hidden');
  if (hidden) hidden.value = dir;
  // Auto-enable trade button
  const tradeBtn = document.getElementById('sim-trade-btn');
  if (tradeBtn) tradeBtn.disabled = false;
};

/* ── SLIDER DISPLAY UPDATES ─────────────────────────────────────────────── */
window._simSizeInput = function(v) {
  const el = document.getElementById('sim-size-val');
  if (el) el.textContent = v + '%';
};
window._simLevInput = function(v) {
  const el = document.getElementById('sim-lev-val');
  if (el) el.textContent = v + '×';
};

/* ── NEXT ROUND ────────────────────────────────────────────────────────────── */
window._simNextRound = function() {
  if (_simRevealTimer) { clearInterval(_simRevealTimer); _simRevealTimer = null; }
  renderSimulator('content-area');
};

/* ── RESET STATS ──────────────────────────────────────────────────────────── */
window._simResetStats = function() {
  if (!confirm('Reset all simulator stats? This cannot be undone.')) return;
  _simStats = { equity: 1000, trades: 0, wins: 0, streak: 0, bestStreak: 0, history: [1000] };
  simSaveStats(_simStats);
  renderSimulator('content-area');
};

/* ═══════════════════════════════════════════════════════════════════════════
   PUBLIC ENTRY POINT
   ═══════════════════════════════════════════════════════════════════════════ */
function renderSimulator(containerId) {
  _simInjectStyles();

  // Stop any running reveal
  if (_simRevealTimer) { clearInterval(_simRevealTimer); _simRevealTimer = null; }
  if (_simEquityChart) { try { _simEquityChart.dispose(); } catch(_) {} _simEquityChart = null; }
  if (_simChartInst)   { try { _simChartInst.dispose();   } catch(_) {} _simChartInst   = null; }

  _simStats = simLoadStats();
  if (!_simStats.history.length) _simStats.history = [1000];

  _simNewRound();

  const container = document.getElementById(containerId);
  if (!container) return;

  const TEAL = _simBullishColor();
  const pnl  = _simStats.equity - 1000;
  const wr   = _simStats.trades > 0 ? Math.round((_simStats.wins / _simStats.trades) * 100) : 0;

  container.innerHTML = `
    <div class="sim-wrap">

      <!-- Back bar -->
      <div class="sim-back-bar">
        <button class="sim-back-btn" onclick="typeof init === 'function' && init()">
          <i data-lucide="arrow-left" style="width:15px;height:15px;"></i>
          Back to Course
        </button>
        <div class="sim-title-row">
          <h1 class="sim-title">Practice Simulator</h1>
          <span class="sim-subtitle">read the chart · make the call</span>
        </div>
      </div>

      <!-- Stats strip -->
      <div class="sim-stats-strip">
        <div class="sim-stat">
          <div class="sim-stat-label">Equity</div>
          <div class="sim-stat-value ${pnl >= 0 ? '' : 'down'}" id="sim-stat-equity">$${_simStats.equity.toFixed(0)}</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">Win Rate</div>
          <div class="sim-stat-value ${wr >= 50 ? '' : 'down'}" id="sim-stat-winrate">${wr}%</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">Trades</div>
          <div class="sim-stat-value" id="sim-stat-trades">${_simStats.trades}</div>
        </div>
        <div class="sim-stat">
          <div class="sim-stat-label">Streak</div>
          <div class="sim-stat-value" id="sim-stat-streak">${_simStats.streak}🔥</div>
        </div>
      </div>

      <!-- Chart card -->
      <div class="sim-chart-card">
        <div class="sim-chart-topbar">
          <span class="sim-chart-title">BTC/USD · ${_simTF.toUpperCase()} (Synthetic)</span>
          <span class="sim-chart-badge" id="sim-chart-badge">Decision Point</span>
        </div>
        <div id="sim-chart-el"></div>
      </div>

      <!-- Decision panel -->
      <div class="sim-decision-panel" id="sim-decision-panel">
        <div class="sim-decision-label">Your Call — What happens next?</div>

        <!-- Hidden field stores the selected direction -->
        <input type="hidden" id="sim-dir-hidden" value="" />

        <div class="sim-direction-row">
          <button class="sim-dir-btn sim-dir-long"  id="sim-dir-long"  onclick="_simSelectDir('long')">
            <i data-lucide="trending-up" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>
            Long
          </button>
          <button class="sim-dir-btn sim-dir-short" id="sim-dir-short" onclick="_simSelectDir('short')">
            <i data-lucide="trending-down" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>
            Short
          </button>
          <button class="sim-dir-btn sim-dir-flat"  id="sim-dir-flat"  onclick="_simSelectDir('flat')">
            <i data-lucide="minus" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>
            Flat / Skip
          </button>
        </div>

        <div class="sim-controls-row">
          <div class="sim-control-group">
            <div class="sim-control-label">Position Size</div>
            <div class="sim-slider-row">
              <input type="range" class="sim-slider" id="sim-size-slider"
                     min="1" max="20" value="5"
                     oninput="_simSizeInput(this.value)" />
              <span class="sim-slider-val" id="sim-size-val">5%</span>
            </div>
          </div>
          <div class="sim-control-group">
            <div class="sim-control-label">Leverage</div>
            <div class="sim-slider-row">
              <input type="range" class="sim-slider" id="sim-lev-slider"
                     min="1" max="20" value="1"
                     oninput="_simLevInput(this.value)" />
              <span class="sim-slider-val" id="sim-lev-val">1×</span>
            </div>
          </div>
          <button class="sim-trade-btn" id="sim-trade-btn" onclick="_simSubmitTrade()" disabled>
            Reveal →
          </button>
        </div>
      </div>

      <!-- Equity curve -->
      <div class="sim-equity-card">
        <div class="sim-equity-topbar">
          <span>Equity Curve</span>
          <span id="sim-equity-pnl" style="color:${pnl >= 0 ? _simBullishColor() : '#cc2222'};font-size:12px;font-weight:700;">
            ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)} all-time
          </span>
        </div>
        <div id="sim-equity-el"></div>
      </div>

      <!-- Reset row -->
      <div class="sim-reset-row">
        <button class="sim-reset-btn" onclick="_simResetStats()">Reset Stats</button>
      </div>

    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Render charts after DOM settles
  setTimeout(() => {
    _simRenderSetup();
    _simRenderEquityChart();
  }, 60);
}

window.renderSimulator = renderSimulator;
