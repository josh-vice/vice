'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Practice Simulator v2
   lt-sim-ui.js  |  Terminal-style trading practice with proper risk mechanics
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── PATTERN CONCEPTS ─────────────────────────────────────────────────────── */
const SIM_CONCEPTS = {
  uptrend:         { name:'Uptrend — Higher Highs & Higher Lows',  bias:'long',    course:'Trending Markets',           blurb:'Each Higher Low is a buy opportunity. Trail your stop under each new HL as the trend develops.',                                   slHint:0.025, tpHint:0.06 },
  downtrend:       { name:'Downtrend — Lower Highs & Lower Lows',  bias:'short',   course:'Trending Markets',           blurb:'Each Lower High is a sell. Ride the trend — trail stops above each new LH.',                                                      slHint:0.025, tpHint:0.06 },
  range:           { name:'Range-Bound Market',                     bias:'neutral', course:'Range-Bound Markets',        blurb:'Buy the DBS zone, sell the SSR zone. Stop outside the range. Target midpoint or the opposite boundary.',                            slHint:0.015, tpHint:0.04 },
  bull_flag:       { name:'Bull Flag — Continuation',              bias:'long',    course:'Classical Chart Patterns',   blurb:'Tight pullback on low volume after a strong impulse. Break of the flag high = measured move target (flagpole height).',             slHint:0.02,  tpHint:0.07 },
  bear_flag:       { name:'Bear Flag — Continuation',              bias:'short',   course:'Classical Chart Patterns',   blurb:'Shallow bounce after a sharp drop. Break of the flag low = continuation target. SL above the flag high.',                           slHint:0.02,  tpHint:0.07 },
  breakout:        { name:'Range Breakout',                         bias:'long',    course:'SR Flips and Break of Structure', blurb:'Old resistance becomes new support on the retest. Entry on retest pullback. Stop below the broken level.',                   slHint:0.015, tpHint:0.05 },
  double_top:      { name:'Double Top — Reversal',                  bias:'short',   course:'Classical Chart Patterns',   blurb:'Two equal highs at the same resistance. Break of the neckline confirms reversal. Target = head height below neckline.',             slHint:0.02,  tpHint:0.06 },
  double_bottom:   { name:'Double Bottom — Reversal',               bias:'long',    course:'Classical Chart Patterns',   blurb:'Two equal lows at the same support. Break of the neckline confirms. Target = bottom-to-neckline distance above neckline.',          slHint:0.02,  tpHint:0.06 },
  demand_bounce:   { name:'Demand Zone (DBS) Bounce',               bias:'long',    course:'Supply and Demand Zones',    blurb:'First fresh test of a demand zone with long lower wicks. SL just below the zone. Target the supply zone above.',                    slHint:0.018, tpHint:0.055 },
  supply_reject:   { name:'Supply Zone (SSR) Rejection',            bias:'short',   course:'Supply and Demand Zones',    blurb:'First fresh test of a supply zone with long upper wicks. SL just above the zone. Target the demand zone below.',                    slHint:0.018, tpHint:0.055 },
  reversal_hammer: { name:'Hammer — Seller Exhaustion',             bias:'long',    course:'Understanding Price Action',  blurb:'Long lower wick at the bottom of a downtrend. SL below the wick low. Confirmation: next candle closes higher.',                    slHint:0.025, tpHint:0.05 },
  shooting_star:   { name:'Shooting Star — Buyer Exhaustion',       bias:'short',   course:'Understanding Price Action',  blurb:'Long upper wick at the top of an uptrend. SL above the wick high. Strongest when volume spikes at the top.',                       slHint:0.025, tpHint:0.05 },
  inverted_hammer: { name:'Inverted Hammer — Bullish Reversal',     bias:'long',    course:'Understanding Price Action',  blurb:'Long upper wick at the bottom of a downtrend. Buyers are testing. Wait for next candle confirmation before entering.',             slHint:0.025, tpHint:0.05 },
  doji:            { name:'Doji — Indecision',                      bias:'neutral', course:'Understanding Price Action',  blurb:'Open = close. Neither side won. At the end of a trend it signals reversal. At S/R it adds confluence.',                            slHint:0.02,  tpHint:0.04 },
  sr_flip:         { name:'S/R Flip — Resistance Becomes Support',  bias:'long',    course:'SR Flips and Break of Structure', blurb:'After breaking above resistance, the retest from above is the highest probability entry. Old resistance = new support.',      slHint:0.018, tpHint:0.06 },
  liquidity_sweep: { name:'Swing Failure Pattern (SFP)',            bias:'short',   course:'Identifying Liquidity',      blurb:'Price spikes just above a prior swing high, triggers stops, then reverses sharply. Trapped longs are the fuel. SL above the wick.', slHint:0.015, tpHint:0.055 },
  bos:             { name:'Break of Structure (BOS)',               bias:'short',   course:'What Is Market Structure?',   blurb:'Price breaks a key swing low in an uptrend — bearish BOS. First sign the trend is changing. Stop above the BOS candle high.',       slHint:0.02,  tpHint:0.06 },
};

/* ── CHAPTER TITLE → PATTERN KEY MAPPING ─────────────────────────────────── */
const CHAPTER_PATTERN_MAP = {
  'Understanding Price Action':              ['reversal_hammer','shooting_star','inverted_hammer','doji'],
  'Supply and Demand Zones':                 ['demand_bounce','supply_reject'],
  'Supply & Demand Zones':                   ['demand_bounce','supply_reject'],
  'Support and Resistance':                  ['sr_flip','breakout'],
  'SR Flips and Break of Structure':         ['sr_flip','breakout'],
  'Trending Markets':                        ['uptrend','downtrend'],
  'Range-Bound Markets':                     ['range'],
  'Trading Ranges':                          ['range'],
  'What Is Market Structure?':               ['bos','sr_flip'],
  'Market Structure':                        ['bos','sr_flip'],
  'Classical Chart Patterns':               ['bull_flag','bear_flag','double_top','double_bottom','breakout'],
  'Fibonacci':                               ['sr_flip','demand_bounce'],
  'Ichimoku Kinko Hyo':                      ['sr_flip','breakout'],
  'Oscillators':                             ['reversal_hammer','shooting_star'],
  'Volume Analysis':                         ['reversal_hammer','shooting_star','demand_bounce'],
  'Identifying Liquidity':                   ['liquidity_sweep'],
  'Liquidity Structures':                    ['liquidity_sweep','sr_flip'],
  'Liquidity Theory':                        ['liquidity_sweep','sr_flip','bos'],
  'Kijun-sen Bounces and Rejections':        ['sr_flip','demand_bounce'],
  'Identifying Access Points':               ['demand_bounce','sr_flip'],
  'Trading S/R':                             ['sr_flip','demand_bounce','supply_reject'],
};

const SIM_ALL_PATTERNS = Object.keys(SIM_CONCEPTS);
const SIM_TIMEFRAMES   = ['4h','6h','12h','1d'];
const SIM_STORAGE      = 'lt_sim_stats';
// Chart plot padding — shared by the candlestick render AND the draggable
// order lines so pixel↔price conversions line up exactly.
const SIM_GRID = { left:56, right:16, top:22, bottom:34 };

/* ── STATE ────────────────────────────────────────────────────────────────── */
let _simStats       = null;
let _simMarket      = null;
let _simView        = null;
let _simPattern     = null;
let _simTF          = null;
let _simSeed        = null;
let _simChartInst   = null;
let _simEquityChart = null;
let _simRevealTimer = null;
let _simAnswered    = false;
let _simOpts        = {};     // { pattern, label, courseMode }
let _simLockedPattern = null; // null = random; string = locked to that pattern
let _simDirection   = null;
let _simEntryPrice  = 0;

/* ── HELPERS ──────────────────────────────────────────────────────────────── */
function _bc() { return localStorage.getItem('lt_bullish_color') || '#00d4d4'; }

function simLoadStats() {
  try {
    const r = localStorage.getItem(SIM_STORAGE);
    if (r) {
      const s = JSON.parse(r);
      // backfill fields added in later versions
      if (!Array.isArray(s.history)) s.history = [s.equity || 1000];
      if (!Array.isArray(s.log))     s.log = [];
      if (typeof s.skips !== 'number') s.skips = 0;
      return s;
    }
  } catch(_) {}
  return { equity:1000, trades:0, wins:0, streak:0, bestStreak:0, skips:0, history:[1000], log:[] };
}
function simSaveStats(s) {
  try { localStorage.setItem(SIM_STORAGE, JSON.stringify(s)); } catch(_) {}
}

function _simPickPattern() {
  if (_simLockedPattern) return _simLockedPattern;
  return SIM_ALL_PATTERNS[Math.floor(Math.random() * SIM_ALL_PATTERNS.length)];
}

function _simNewRound() {
  _simPattern  = _simPickPattern();
  _simTF       = SIM_TIMEFRAMES[Math.floor(Math.random() * SIM_TIMEFRAMES.length)];
  _simSeed     = Math.floor(Math.random() * 99999) + 1;
  _simMarket   = generateMarket(_simPattern, _simSeed);
  _simView     = viewMarket(_simMarket, _simTF);
  _simAnswered = false;
  _simDirection = null;
  _simEntryPrice = 0;
}

/* ── POSITION MECHANICS ──────────────────────────────────────────────────── */
function _calcMetrics(direction, entry, sl, tp, riskPct, leverage, equity) {
  const slDist  = entry > 0 ? Math.abs(entry - sl)  / entry : 0;
  const tpDist  = entry > 0 ? Math.abs(tp  - entry) / entry : 0;
  const rr      = slDist > 0 ? (tpDist / slDist) : 0;
  const riskUSD = equity * (riskPct / 100);
  const notional = slDist > 0 ? riskUSD / slDist : 0;
  const margin   = leverage > 0 ? notional / leverage : notional;
  const marginPct = equity > 0 ? (margin / equity) * 100 : 0;
  // Simplified cross-margin liq price (0.5% maintenance)
  const maintenancePct = 0.005;
  const liqOffset = (1 - maintenancePct) / leverage;
  const liqPrice = direction === 'long'
    ? entry * (1 - liqOffset)
    : entry * (1 + liqOffset);
  const liqPct = Math.abs(liqPrice - entry) / entry * 100;
  const valid = margin <= equity && slDist > 0 && tpDist > 0 &&
    (direction === 'long'  ? sl < entry && tp > entry : sl > entry && tp < entry);
  return { slDist, tpDist, rr, riskUSD, notional, margin, marginPct, liqPrice, liqPct, valid };
}

function _checkHit(direction, sl, tp, candle, liqPrice) {
  const [, , lo, hi] = candle;
  // Liquidation can fire before the stop if leverage pushes the liq price
  // closer to entry than the SL. The adverse level nearest entry is hit first.
  if (direction === 'long') {
    const adverse = (liqPrice > 0 && liqPrice >= sl) ? { lvl: liqPrice, type: 'liq' } : { lvl: sl, type: 'sl' };
    if (lo <= adverse.lvl) return adverse.type;
    if (hi >= tp) return 'tp';
  }
  if (direction === 'short') {
    const adverse = (liqPrice > 0 && liqPrice <= sl) ? { lvl: liqPrice, type: 'liq' } : { lvl: sl, type: 'sl' };
    if (hi >= adverse.lvl) return adverse.type;
    if (lo <= tp) return 'tp';
  }
  return null;
}

/* ── STYLES ───────────────────────────────────────────────────────────────── */
function _simStyles() {
  if (document.getElementById('lt-sim2-styles')) return;
  const s = document.createElement('style');
  s.id = 'lt-sim2-styles';
  s.textContent = `
  /* ── layout ── */
  .sim2-wrap { width:100%; max-width:1100px; margin:0 auto; padding:0 0 40px; }
  .sim2-back-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0 12px; }
  .sim2-back-btn { display:inline-flex; align-items:center; gap:6px; background:none; border:none; color:var(--teal); font-family:'Barlow',sans-serif; font-size:13px; font-weight:600; cursor:pointer; padding:0; }
  .sim2-back-btn:hover { opacity:.8; }
  .sim2-heading { font-family:'Barlow Condensed',sans-serif; font-size:26px; font-weight:800; color:var(--text); }
  .sim2-sub { font-size:12px; color:var(--text3); margin-top:2px; }

  /* ── pattern selector (single scrollable row) ── */
  .sim2-pattern-bar {
    display:flex; align-items:center; gap:8px; flex-wrap:nowrap; overflow-x:auto;
    background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg);
    padding:9px 14px; margin-bottom:12px; scrollbar-width:thin;
  }
  .sim2-pattern-bar::-webkit-scrollbar { height:5px; }
  .sim2-pattern-bar::-webkit-scrollbar-thumb { background:var(--border2); border-radius:3px; }
  .sim2-pattern-bar::-webkit-scrollbar-track { background:transparent; }
  .sim2-pattern-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--text3); flex-shrink:0; margin-right:2px; position:sticky; left:0; background:var(--bg3); padding-right:6px; z-index:1; }
  .sim2-pat-btn {
    padding:4px 10px; border-radius:10px; border:1px solid var(--border2);
    background:var(--bg4); color:var(--text3); font-size:11px; font-weight:600;
    cursor:pointer; font-family:'Barlow',sans-serif; white-space:nowrap; transition:all .15s;
    flex:0 0 auto;
  }
  .sim2-pat-btn:hover { border-color:var(--teal); color:var(--teal); }
  .sim2-pat-btn.active { background:var(--teal-dim); border-color:var(--teal); color:var(--teal); }
  .sim2-pat-btn.random { color:var(--text2); border-style:dashed; }
  .sim2-pat-btn.random.active { color:var(--teal); border-style:solid; }

  /* ── stats strip ── */
  .sim2-stats { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
  .sim2-stat { flex:1; min-width:100px; background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius); padding:9px 14px; }
  .sim2-stat-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--text3); margin-bottom:3px; }
  .sim2-stat-val { font-size:20px; font-weight:800; font-variant-numeric:tabular-nums; color:var(--teal); }
  .sim2-stat-val.down { color:#cc2222; }

  /* ── main grid (chart + terminal) — equal heights so it snaps together ── */
  .sim2-grid { display:grid; grid-template-columns:1fr 340px; gap:12px; margin-bottom:12px; align-items:stretch; }
  @media(max-width:860px) { .sim2-grid { grid-template-columns:1fr; } }

  /* ── chart card (flex column so the chart fills to match the terminal) ── */
  .sim2-chart-card { background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; display:flex; flex-direction:column; min-width:0; }
  .sim2-chart-topbar { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:7px 12px; border-bottom:1px solid var(--border); flex:0 0 auto; }
  .sim2-chart-topL { display:flex; align-items:center; gap:12px; min-width:0; }
  .sim2-chart-sym { font-size:12px; font-weight:700; color:var(--text); white-space:nowrap; }
  .sim2-chart-badge { font-size:10px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; padding:2px 8px; border-radius:10px; background:var(--teal-dim); border:1px solid var(--teal); color:var(--teal); white-space:nowrap; }
  .sim2-chart-badge.revealing { background:rgba(200,150,12,.12); border-color:#c8960c; color:#c8960c; }
  .sim2-chart-badge.revealed  { background:rgba(0,200,120,.10); border-color:#00c878; color:#00c878; }
  #sim2-chart-el { width:100%; flex:1 1 auto; min-height:420px; }

  /* ── timeframe segmented control ── */
  .sim2-tf-group { display:inline-flex; gap:2px; background:var(--bg4); border:1px solid var(--border2); border-radius:8px; padding:2px; }
  .sim2-tf-btn { padding:2px 9px; border:none; background:none; color:var(--text3); font-size:11px; font-weight:700; cursor:pointer; font-family:'Barlow',sans-serif; border-radius:6px; transition:all .12s; }
  .sim2-tf-btn:hover { color:var(--text); }
  .sim2-tf-btn.active { background:var(--teal-dim); color:var(--teal); }
  .sim2-tf-btn:disabled { opacity:.4; cursor:not-allowed; }

  /* ── terminal panel ── */
  .sim2-terminal {
    background:var(--bg2); border:1px solid var(--border2);
    border-radius:var(--radius-lg); overflow:hidden;
    font-family:'Barlow',monospace; display:flex; flex-direction:column;
  }
  .sim2-term-header {
    padding:10px 14px 8px; border-bottom:1px solid var(--border2);
    display:flex; align-items:center; justify-content:space-between;
  }
  .sim2-term-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--teal); }
  .sim2-acct-equity { font-size:13px; font-weight:800; color:var(--text); }
  .sim2-acct-lbl { font-size:10px; color:var(--text3); margin-bottom:1px; }

  /* direction row */
  .sim2-dir-row { display:flex; gap:0; }
  .sim2-dir-btn {
    flex:1; padding:10px 8px; border:none; font-size:13px; font-weight:800;
    cursor:pointer; font-family:'Barlow',sans-serif; transition:all .12s;
    letter-spacing:.5px; text-transform:uppercase;
  }
  .sim2-dir-btn:disabled { opacity:.35; cursor:not-allowed; }
  .sim2-dir-long  { background:rgba(0,212,212,.10); color:var(--teal); border-right:1px solid var(--border2); }
  .sim2-dir-short { background:rgba(204,34,34,.10);  color:#cc2222; }
  .sim2-dir-btn.sel-long  { background:rgba(0,212,212,.25)!important; }
  .sim2-dir-btn.sel-short { background:rgba(204,34,34,.25)!important; }

  /* entry / sl / tp rows */
  .sim2-fields { padding:0 12px; }
  .sim2-field { padding:10px 0; border-bottom:1px solid var(--border); }
  .sim2-field:last-child { border-bottom:none; }
  .sim2-field-header { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:6px; }
  .sim2-field-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--text3); }
  .sim2-field-pct { font-size:11px; font-weight:700; color:var(--text3); }
  .sim2-field-pct.warn { color:#cc2222; }
  .sim2-field-pct.ok   { color:var(--teal); }
  .sim2-price-input {
    width:100%; background:var(--bg4); border:1px solid var(--border2);
    border-radius:var(--radius); color:var(--text); font-family:'Barlow',monospace;
    font-size:16px; font-weight:700; padding:7px 10px; outline:none;
    transition:border-color .15s;
  }
  .sim2-price-input:focus { border-color:var(--teal); }
  .sim2-price-input.input-sl { border-color:rgba(204,34,34,.4); }
  .sim2-price-input.input-tp { border-color:rgba(0,212,212,.4); }
  .sim2-presets { display:flex; gap:5px; margin-top:6px; flex-wrap:wrap; }
  .sim2-preset-btn {
    padding:2px 8px; border-radius:8px; border:1px solid var(--border2);
    background:var(--bg4); color:var(--text3); font-size:10px; font-weight:700;
    cursor:pointer; font-family:'Barlow',sans-serif; transition:all .12s;
  }
  .sim2-preset-btn:hover { border-color:var(--teal); color:var(--teal); }

  /* risk slider */
  .sim2-risk-row { padding:10px 12px; border-top:1px solid var(--border2); }
  .sim2-risk-header { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px; }
  .sim2-risk-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--text3); }
  .sim2-risk-val { font-size:13px; font-weight:800; color:var(--teal); }
  .sim2-slider {
    -webkit-appearance:none; width:100%; height:4px; border-radius:2px;
    background:var(--border2); outline:none; cursor:pointer;
  }
  .sim2-slider::-webkit-slider-thumb {
    -webkit-appearance:none; width:14px; height:14px; border-radius:50%;
    background:var(--teal); box-shadow:0 0 6px rgba(0,212,212,.4);
  }

  /* leverage row */
  .sim2-lev-row { padding:8px 12px 10px; border-top:1px solid var(--border2); }
  .sim2-lev-header { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px; }
  .sim2-lev-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--text3); }
  .sim2-lev-val { font-size:13px; font-weight:800; color:var(--text2); }

  /* calculated metrics */
  .sim2-calc { background:var(--bg); border-top:1px solid var(--border2); padding:10px 12px; }
  .sim2-calc-title { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--text3); margin-bottom:8px; }
  .sim2-calc-row { display:flex; justify-content:space-between; align-items:baseline; padding:3px 0; }
  .sim2-calc-lbl { font-size:11px; color:var(--text3); }
  .sim2-calc-val { font-size:12px; font-weight:700; color:var(--text2); font-variant-numeric:tabular-nums; }
  .sim2-calc-val.teal  { color:var(--teal); }
  .sim2-calc-val.red   { color:#cc2222; }
  .sim2-calc-val.gold  { color:#c8960c; }
  .sim2-calc-row.rr-row .sim2-calc-val { font-size:13px; }

  /* warning banner */
  .sim2-warn {
    margin:8px 12px; padding:7px 10px; border-radius:var(--radius);
    background:rgba(204,34,34,.08); border:1px solid rgba(204,34,34,.3);
    font-size:11px; color:#ff8888; line-height:1.5; display:none;
  }
  .sim2-warn.show { display:block; }

  /* execute button */
  .sim2-exec-wrap { padding:10px 12px 14px; }
  .sim2-exec-btn {
    width:100%; padding:13px; background:var(--teal); border:none;
    border-radius:var(--radius); color:#000; font-size:14px; font-weight:900;
    cursor:pointer; font-family:'Barlow',sans-serif; letter-spacing:.5px;
    text-transform:uppercase; transition:all .15s;
  }
  .sim2-exec-btn:hover:not(:disabled) { background:var(--teal2); box-shadow:var(--glow-teal); }
  .sim2-exec-btn:disabled { opacity:.35; cursor:not-allowed; }

  /* ── verdict ── */
  .sim2-verdict { border-radius:var(--radius-lg); padding:18px 20px; margin-bottom:14px; border-left:4px solid; animation:sim2FadeIn .3s ease; }
  .sim2-verdict.win  { border-color:var(--teal); background:rgba(0,212,212,.05); }
  .sim2-verdict.loss { border-color:#cc2222;      background:rgba(204,34,34,.04); }
  .sim2-verdict.flat { border-color:var(--border2);background:var(--bg3); }
  .sim2-verdict-top { display:flex; align-items:baseline; gap:14px; margin-bottom:10px; flex-wrap:wrap; }
  .sim2-verdict-result { font-size:24px; font-weight:900; }
  .sim2-verdict-detail { font-size:12px; color:var(--text3); }
  .sim2-verdict-hit { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; padding:3px 10px; border-radius:10px; margin-bottom:8px; }
  .sim2-verdict-hit.sl  { background:rgba(204,34,34,.12); color:#cc2222; border:1px solid rgba(204,34,34,.3); }
  .sim2-verdict-hit.tp  { background:rgba(0,212,212,.12); color:var(--teal); border:1px solid rgba(0,212,212,.3); }
  .sim2-verdict-hit.open{ background:rgba(200,150,12,.10); color:#c8960c; border:1px solid rgba(200,150,12,.3); }
  .sim2-verdict-pattern { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--teal); margin-bottom:5px; }
  .sim2-verdict-blurb { font-size:13px; color:var(--text2); line-height:1.65; }
  .sim2-verdict-bias { font-size:12px; font-weight:700; margin-top:8px; }
  .sim2-verdict-stats { display:flex; gap:18px; margin-top:10px; flex-wrap:wrap; }
  .sim2-verdict-stat { font-size:12px; color:var(--text3); }
  .sim2-verdict-stat strong { color:var(--text); }
  .sim2-next-btn { width:100%; padding:13px; background:var(--teal); border:none; border-radius:var(--radius); color:#000; font-size:14px; font-weight:800; cursor:pointer; font-family:'Barlow',sans-serif; transition:all .15s; margin-bottom:14px; }
  .sim2-next-btn:hover { background:var(--teal2); box-shadow:var(--glow-teal); }

  /* account summary row */
  .sim2-acct-row { display:flex; border-bottom:1px solid var(--border2); }
  .sim2-acct-cell { flex:1; padding:7px 12px; display:flex; flex-direction:column; gap:2px; border-right:1px solid var(--border); }
  .sim2-acct-cell:last-child { border-right:none; }
  .sim2-acct-cell-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text3); }
  .sim2-acct-cell-val { font-size:13px; font-weight:800; color:var(--text2); font-variant-numeric:tabular-nums; }

  /* flat direction button */
  .sim2-dir-flat { background:var(--bg4); color:var(--text2); border-left:1px solid var(--border2); border-right:1px solid var(--border2); }
  .sim2-dir-btn.sel-flat { background:var(--bg3)!important; color:var(--text)!important; box-shadow:inset 0 -2px 0 var(--text3); }

  /* live price + floating P&L in chart topbar */
  .sim2-chart-live { display:flex; align-items:center; gap:10px; font-variant-numeric:tabular-nums; flex:0 0 auto; }
  .sim2-live-price { font-size:13px; font-weight:800; color:var(--text); }
  .sim2-live-pnl   { font-size:12px; font-weight:700; color:var(--text3); min-width:44px; text-align:right; }

  /* lower grid: equity + blotter side by side, equal height */
  .sim2-lower-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; align-items:stretch; }
  @media(max-width:860px) { .sim2-lower-grid { grid-template-columns:1fr; } }

  /* equity card */
  .sim2-equity-card { background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; display:flex; flex-direction:column; }
  .sim2-equity-topbar { display:flex; align-items:center; justify-content:space-between; padding:8px 14px; border-bottom:1px solid var(--border); font-size:12px; font-weight:700; color:var(--text2); flex:0 0 auto; }
  #sim2-equity-el { width:100%; flex:1 1 auto; min-height:188px; }

  /* trade blotter */
  .sim2-blotter-card { background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; display:flex; flex-direction:column; min-height:230px; }
  .sim2-blotter-topbar { display:flex; align-items:center; justify-content:space-between; padding:8px 14px; border-bottom:1px solid var(--border); font-size:12px; font-weight:700; color:var(--text2); }
  .sim2-blotter-meta { font-size:10px; font-weight:600; color:var(--text3); }
  .sim2-blotter-head, .sim2-blotter-row {
    display:grid; grid-template-columns:1.6fr .6fr .8fr .7fr .8fr 1fr;
    gap:6px; align-items:center; padding:5px 14px;
  }
  .sim2-blotter-head { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text3); border-bottom:1px solid var(--border); }
  .sim2-blotter-head span:last-child, .sim2-blotter-row .sim2-blot-pnl,
  .sim2-blotter-head span:nth-child(5), .sim2-blot-rr { text-align:right; }
  .sim2-blotter-body { flex:1 1 auto; max-height:188px; overflow-y:auto; scrollbar-width:thin; }
  .sim2-blotter-body::-webkit-scrollbar { width:5px; }
  .sim2-blotter-body::-webkit-scrollbar-thumb { background:var(--border2); border-radius:3px; }
  .sim2-blotter-row { font-size:11px; border-bottom:1px solid var(--border); font-variant-numeric:tabular-nums; }
  .sim2-blotter-row:last-child { border-bottom:none; }
  .sim2-blot-pat { color:var(--text2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600; }
  .sim2-blot-tf  { color:var(--text3); font-size:10px; }
  .sim2-blot-dir { font-weight:800; font-size:10px; }
  .sim2-blot-dir.long  { color:var(--teal); }
  .sim2-blot-dir.short { color:#cc2222; }
  .sim2-blot-dir.flat  { color:var(--text3); }
  .sim2-blot-hit { color:var(--text3); font-size:10px; text-transform:uppercase; }
  .sim2-blot-rr  { color:var(--text3); }
  .sim2-blot-pnl { font-weight:800; color:var(--text3); }
  .sim2-blot-pnl.pos { color:var(--teal); }
  .sim2-blot-pnl.neg { color:#cc2222; }
  .sim2-blotter-empty { padding:24px 14px; text-align:center; font-size:11px; color:var(--text3); }

  /* reset */
  .sim2-reset-row { display:flex; justify-content:flex-end; }
  .sim2-reset-btn { background:transparent; border:1px solid var(--border2); color:var(--text3); font-size:11px; padding:5px 14px; border-radius:10px; cursor:pointer; font-family:'Barlow',sans-serif; transition:all .15s; }
  .sim2-reset-btn:hover { border-color:#cc2222; color:#cc2222; }

  @keyframes sim2FadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @media(max-width:860px) {
    .sim2-grid { grid-template-columns:1fr; align-items:stretch; }
    #sim2-chart-el { min-height:300px; }
  }
  @media(max-width:600px) {
    #sim2-chart-el { min-height:260px; }
  }
  /* drag hint shown over the chart while an order line is grabbable */
  .sim2-drag-hint { font-size:10px; color:var(--text3); white-space:nowrap; }

  /* (.chapter-practice-btn now lives in lt-styles.css so it is always styled) */
  `;
  document.head.appendChild(s);
}

/* ── EQUITY CHART ─────────────────────────────────────────────────────────── */
function _sim2RenderEquityChart() {
  const el = document.getElementById('sim2-equity-el');
  if (!el) return;
  if (_simEquityChart) { try { _simEquityChart.dispose(); } catch(_) {} }
  const h = _simStats.history.length ? _simStats.history : [1000];
  const color = _simStats.equity >= 1000 ? _bc() : '#cc2222';
  _simEquityChart = echarts.init(el, null, { renderer:'canvas' });
  _simEquityChart.setOption({
    backgroundColor:'transparent', animation:true, animationDuration:400,
    grid:{ left:52, right:12, top:8, bottom:20 },
    xAxis:{ type:'category', data:h.map((_,i)=>i===0?'Start':'T'+i),
      axisLabel:{color:'#555',fontSize:9}, axisLine:{lineStyle:{color:'#1e1e1e'}}, splitLine:{show:false} },
    yAxis:{ scale:true, splitLine:{lineStyle:{color:'#1e1e1e',type:'dashed'}},
      axisLabel:{color:'#555',fontSize:9,formatter:v=>'$'+v.toFixed(0)} },
    series:[{ type:'line', data:h, smooth:true, symbol:'none',
      lineStyle:{color,width:2},
      areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[
        {offset:0,color:color+'44'},{offset:1,color:color+'08'}
      ]}}
    }]
  });
  const ro = new ResizeObserver(()=>{ try{_simEquityChart&&_simEquityChart.resize();}catch(_){} });
  ro.observe(el);
}

/* ── STATS STRIP UPDATE ──────────────────────────────────────────────────── */
function _sim2UpdateStats() {
  const s   = _simStats;
  const pnl = s.equity - 1000;
  const wr  = s.trades > 0 ? Math.round((s.wins/s.trades)*100) : 0;
  const eqEl = document.getElementById('sim2-stat-equity');
  const wrEl = document.getElementById('sim2-stat-wr');
  const trEl = document.getElementById('sim2-stat-trades');
  const skEl = document.getElementById('sim2-stat-streak');
  if (eqEl) { eqEl.textContent=`$${s.equity.toFixed(0)}`; eqEl.className='sim2-stat-val'+(pnl>=0?'':' down'); }
  if (wrEl) { wrEl.textContent=`${wr}%`; wrEl.className='sim2-stat-val'+(wr>=50?'':' down'); }
  if (trEl) trEl.textContent = String(s.trades);
  if (skEl) skEl.textContent = `${s.streak}🔥`;
  const pnlEl = document.getElementById('sim2-equity-pnl');
  if (pnlEl) { pnlEl.textContent=`${pnl>=0?'+':''}$${pnl.toFixed(0)} all-time`; pnlEl.style.color=_simStats.equity>=1000?_bc():'#cc2222'; }
  _sim2RenderEquityChart();
}

/* ── LIVE CALC UPDATE (called from input handlers) ────────────────────────── */
window._sim2Recalc = function(skipLines) {
  const entry = _simEntryPrice;
  if (_simDirection === 'flat') return;   // flat: no SL/TP/margin to recompute
  if (!entry || !_simDirection) return;
  const sl  = parseFloat(document.getElementById('sim2-sl-input')?.value  || 0);
  const tp  = parseFloat(document.getElementById('sim2-tp-input')?.value  || 0);
  const rp  = parseFloat(document.getElementById('sim2-risk-slider')?.value || 1);
  const lev = parseFloat(document.getElementById('sim2-lev-slider')?.value  || 1);

  const m = _calcMetrics(_simDirection, entry, sl, tp, rp, lev, _simStats.equity);

  // % badges
  const slPctEl = document.getElementById('sim2-sl-pct');
  const tpPctEl = document.getElementById('sim2-tp-pct');
  if (slPctEl) {
    const pct = entry > 0 ? ((sl - entry)/entry*100).toFixed(1) : '—';
    slPctEl.textContent = `${pct}%`;
    slPctEl.className   = 'sim2-field-pct' + ((_simDirection==='long'&&sl<entry)||(_simDirection==='short'&&sl>entry) ? ' ok' : ' warn');
  }
  if (tpPctEl) {
    const pct = entry > 0 ? ((tp - entry)/entry*100).toFixed(1) : '—';
    tpPctEl.textContent = `${pct}%`;
    tpPctEl.className   = 'sim2-field-pct' + ((_simDirection==='long'&&tp>entry)||(_simDirection==='short'&&tp<entry) ? ' ok' : ' warn');
  }

  // Calc rows
  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set('sim2-calc-riskusd',  m.slDist > 0 ? `-$${m.riskUSD.toFixed(2)}` : '—');
  set('sim2-calc-notional', m.notional > 0 ? `$${m.notional.toFixed(0)}` : '—');
  set('sim2-calc-margin',   m.margin   > 0 ? `$${m.margin.toFixed(2)} (${m.marginPct.toFixed(1)}%)` : '—');
  set('sim2-calc-rr',       m.rr > 0 ? `1 : ${m.rr.toFixed(2)}` : '—');
  set('sim2-calc-liq',      m.notional > 0 ? `$${m.liqPrice.toFixed(0)} (${m.liqPct.toFixed(1)}% away)` : '—');
  if (m.notional > 0) {
    const potPnl = m.rr * m.riskUSD;
    set('sim2-calc-potential', `+$${potPnl.toFixed(2)}`);
  } else {
    set('sim2-calc-potential', '—');
  }

  // Draggable SL/TP order lines on chart (skip while actively dragging)
  if (!skipLines) _sim2DrawOrderLines();

  // Account summary (Balance / Used Margin / Free Margin)
  const eq = _simStats.equity;
  const free = Math.max(0, eq - (m.notional > 0 ? m.margin : 0));
  set('sim2-acct-balance', `$${eq.toFixed(0)}`);
  set('sim2-acct-margin',  m.notional > 0 ? `$${m.margin.toFixed(0)}` : '$0');
  set('sim2-acct-free',    `$${free.toFixed(0)}`);

  // Lev value label
  const levVal = document.getElementById('sim2-lev-val');
  if (levVal) levVal.textContent = `${lev}×`;

  // Warning
  const warn = document.getElementById('sim2-warn');
  if (warn) {
    if (m.notional > 0 && m.margin > _simStats.equity) {
      warn.textContent = `⚠ Margin required ($${m.margin.toFixed(0)}) exceeds account equity. Reduce leverage or increase SL distance.`;
      warn.classList.add('show');
    } else if (m.notional > 0 && m.liqPrice > (sl || 0) && _simDirection === 'long') {
      warn.textContent = `⚠ Liquidation price ($${m.liqPrice.toFixed(0)}) is ABOVE your stop loss. Reduce leverage.`;
      warn.classList.add('show');
    } else if (m.notional > 0 && m.liqPrice < (sl || 0) && _simDirection === 'short') {
      warn.textContent = `⚠ Liquidation price ($${m.liqPrice.toFixed(0)}) is BELOW your stop loss. Reduce leverage.`;
      warn.classList.add('show');
    } else {
      warn.classList.remove('show');
    }
  }

  // Enable/disable exec button
  const execBtn = document.getElementById('sim2-exec-btn');
  if (execBtn) execBtn.disabled = !m.valid || (m.margin > _simStats.equity);
};

/* ── DIRECTION SELECT ─────────────────────────────────────────────────────── */
window._sim2Dir = function(dir) {
  if (_simAnswered) return;
  _simDirection = dir;
  document.querySelectorAll('.sim2-dir-btn').forEach(b => b.classList.remove('sel-long','sel-short','sel-flat'));
  const btn = document.getElementById(`sim2-dir-${dir}`);
  if (btn) btn.classList.add(`sel-${dir}`);

  const execBtn  = document.getElementById('sim2-exec-btn');
  const fieldsEl = document.querySelector('.sim2-fields');

  // Flat = stand aside. No SL/TP needed; reveal shows what you avoided/missed.
  if (dir === 'flat') {
    if (fieldsEl) fieldsEl.style.opacity = '.4';
    document.querySelectorAll('.sim2-price-input').forEach(i => i.disabled = true);
    if (execBtn) { execBtn.disabled = false; execBtn.textContent = 'Skip — Stay Flat'; }
    const livePnl = document.getElementById('sim2-live-pnl');
    if (livePnl) { livePnl.textContent = 'FLAT'; livePnl.style.color = 'var(--text3)'; }
    _sim2DrawOrderLines();   // drop any SL/TP lines, keep entry line
    return;
  }
  if (fieldsEl) fieldsEl.style.opacity = '1';
  document.querySelectorAll('.sim2-price-input').forEach(i => i.disabled = false);
  if (execBtn) execBtn.textContent = 'Execute Trade';

  // Reveal field labels based on direction
  const slLbl = document.getElementById('sim2-sl-lbl');
  const tpLbl = document.getElementById('sim2-tp-lbl');
  if (slLbl) slLbl.textContent = dir === 'long' ? 'Stop Loss (below entry)' : 'Stop Loss (above entry)';
  if (tpLbl) tpLbl.textContent = dir === 'long' ? 'Take Profit (above entry)' : 'Take Profit (below entry)';

  // Set sensible defaults if fields are empty
  const concept  = SIM_CONCEPTS[_simPattern] || {};
  const slHint   = concept.slHint || 0.02;
  const tpHint   = concept.tpHint || 0.05;
  const entry    = _simEntryPrice;
  const slInput  = document.getElementById('sim2-sl-input');
  const tpInput  = document.getElementById('sim2-tp-input');
  if (slInput && !parseFloat(slInput.value)) {
    slInput.value = dir === 'long'
      ? (entry * (1 - slHint)).toFixed(0)
      : (entry * (1 + slHint)).toFixed(0);
  }
  if (tpInput && !parseFloat(tpInput.value)) {
    tpInput.value = dir === 'long'
      ? (entry * (1 + tpHint)).toFixed(0)
      : (entry * (1 - tpHint)).toFixed(0);
  }
  window._sim2Recalc();
};

/* ── PRESET SL/TP BUTTONS ─────────────────────────────────────────────────── */
window._sim2SetSL = function(pct) {
  const entry = _simEntryPrice;
  if (!entry || !_simDirection) return;
  const price = _simDirection === 'long' ? entry*(1-pct/100) : entry*(1+pct/100);
  const inp = document.getElementById('sim2-sl-input');
  if (inp) inp.value = price.toFixed(0);
  window._sim2Recalc();
};
window._sim2SetTP = function(pct) {
  const entry = _simEntryPrice;
  if (!entry || !_simDirection) return;
  const price = _simDirection === 'long' ? entry*(1+pct/100) : entry*(1-pct/100);
  const inp = document.getElementById('sim2-tp-input');
  if (inp) inp.value = price.toFixed(0);
  window._sim2Recalc();
};
window._sim2RiskInput = function(v) {
  const el = document.getElementById('sim2-risk-val');
  if (el) el.textContent = v + '%';
  window._sim2Recalc();
};
window._sim2LevInput  = function(v) {
  const el = document.getElementById('sim2-lev-val');
  if (el) el.textContent = v + '×';
  window._sim2Recalc();
};

/* ── TIMEFRAME SWITCH (re-buckets the SAME scenario, no new round) ─────────── */
window._sim2SetTF = function(tf) {
  if (_simAnswered) return;                 // locked once the trade is live
  if (!_simMarket || tf === _simTF || !SIM_TIMEFRAMES.includes(tf)) return;
  _simTF   = tf;
  _simView = viewMarket(_simMarket, tf);    // same base market, different aggregation
  _simEntryPrice = _simView.ohlc[_simView.cutIndex - 1]?.[1] || _simEntryPrice;

  // active state on the TF buttons
  document.querySelectorAll('.sim2-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf));
  // refresh entry readouts
  const ed = document.getElementById('sim2-entry-display'); if (ed) ed.textContent = '$' + _simEntryPrice.toLocaleString();
  const lp = document.getElementById('sim2-live-price');    if (lp) lp.textContent = '$' + _simEntryPrice.toLocaleString(undefined,{maximumFractionDigits:0});

  // redraw the chart for the new timeframe
  _sim2RenderSetup();

  // entry moved with the new aggregation → reset SL/TP to fresh defaults
  if (_simDirection && _simDirection !== 'flat') {
    const sl = document.getElementById('sim2-sl-input'); if (sl) sl.value = '';
    const tp = document.getElementById('sim2-tp-input'); if (tp) tp.value = '';
    window._sim2Dir(_simDirection);         // re-fills defaults + recalc + redraw lines
  }
};

/* ── SETUP CHART ──────────────────────────────────────────────────────────── */
function _sim2RenderSetup() {
  const el = document.getElementById('sim2-chart-el');
  if (!el || !_simView) return;
  if (_simChartInst) { try { _simChartInst.dispose(); } catch(_) {} }

  const { ohlc, labels, cutIndex, markLines } = _simView;
  const TEAL = _bc();
  const setupOhlc   = ohlc.slice(0, cutIndex);
  const setupLabels = labels.slice(0, cutIndex);
  const mlData = (markLines||[]).map(ml => [{
    yAxis:ml.yAxis,
    label:{show:true,formatter:ml.label,color:TEAL,fontSize:10,fontWeight:600,position:'end'},
    lineStyle:{color:TEAL,type:'dashed',width:1.5,opacity:.75}
  },{yAxis:ml.yAxis}]);

  _simChartInst = echarts.init(el, null, { renderer:'canvas' });
  var _cs = getComputedStyle(document.documentElement);
  var _bg3 = (_cs.getPropertyValue('--bg3') || '#0f0f0f').trim();
  var _bg4 = (_cs.getPropertyValue('--bg4') || '#141414').trim();
  var _bdr = (_cs.getPropertyValue('--border') || '#1e1e1e').trim();
  var _txt = (_cs.getPropertyValue('--text') || '#fff').trim();
  _simChartInst.setOption({
    backgroundColor:_bg3, animation:true, animationDuration:500,
    tooltip:{
      trigger:'axis', axisPointer:{type:'cross'},
      backgroundColor:_bg4, borderColor:_bdr,
      textStyle:{color:_txt,fontSize:11,fontFamily:'Barlow,sans-serif'},
      formatter(params){
        const c=params.find(p=>p.seriesName==='Price'); if(!c||!c.data) return '';
        const d=Array.isArray(c.data)?c.data:c.data.value;
        const [o,cl,lo,hi]=d; const chg=cl-o;
        const col=chg>=0?TEAL:'#cc2222';
        return `<b style="color:#fff">${setupLabels[c.dataIndex]||''}</b><br/>
          O:${o} C:<span style="color:${col};font-weight:700">${cl}</span><br/>
          H:${hi} L:${lo}`;
      }
    },
    grid:{left:SIM_GRID.left,right:SIM_GRID.right,top:SIM_GRID.top,bottom:SIM_GRID.bottom},
    xAxis:{type:'category',data:setupLabels,axisLine:{lineStyle:{color:_bdr}},axisLabel:{color:'#888',fontSize:10,fontFamily:'Barlow,sans-serif',hideOverlap:true},splitLine:{show:false}},
    // Always leave 20% headroom above the highest candle and 20% below the
    // lowest, so price is never flush to an edge. Recomputes every render.
    yAxis:{
      scale:true, position:'left',
      min:(v)=>{ const r=(v.max-v.min)||1; return +(v.min - r*0.2).toFixed(2); },
      max:(v)=>{ const r=(v.max-v.min)||1; return +(v.max + r*0.2).toFixed(2); },
      splitLine:{lineStyle:{color:_bdr,type:'dashed'}},axisLine:{lineStyle:{color:_bdr}},
      axisLabel:{color:'#888',fontSize:10,fontFamily:'Barlow,sans-serif'}
    },
    series:[{
      name:'Price',type:'candlestick',data:setupOhlc,barMaxWidth:20,
      itemStyle:{color:TEAL,color0:'#cc2222',borderColor:TEAL,borderColor0:'#cc2222',borderWidth:1.5},
      markLine:{symbol:['none','none'],silent:true,data:mlData}
    }]
  });
  // Draw the entry / SL / TP order lines on top once layout is ready.
  _sim2DrawOrderLines();
  const ro = new ResizeObserver(()=>{ try{ if(_simChartInst){ _simChartInst.resize(); if(!_simAnswered) _sim2DrawOrderLines(); } }catch(_){} });
  ro.observe(el);
}

/* ── DRAGGABLE ORDER LINES (entry / SL / TP) ──────────────────────────────── */
function _sim2ClearOrderLines() {
  if (!_simChartInst) return;
  try { _simChartInst.setOption({ graphic: [] }, { replaceMerge: ['graphic'] }); } catch(_) {}
}

function _sim2DrawOrderLines() {
  if (!_simChartInst || !_simView) return;
  if (_simAnswered) return;                 // after execution the reveal owns the chart
  const chart = _simChartInst;
  const W = chart.getWidth();
  const x1 = SIM_GRID.left;
  const tagW = 92, tagH = 18, pad = 6;
  const tagX = W - SIM_GRID.right - tagW;   // tag sits at the right edge of the plot
  const lineX2 = tagX - 4;

  const toY = (price) => { try { return chart.convertToPixel({ yAxisIndex: 0 }, price); } catch(_) { return null; } };
  const fromY = (yPix) => { try { return chart.convertFromPixel({ yAxisIndex: 0 }, yPix); } catch(_) { return null; } };

  const fmt = (p) => Math.round(p).toLocaleString();
  const TEAL = _bc();
  const graphics = [];

  // helper to build one horizontal line (optionally draggable)
  const buildLine = (id, price, color, prefix, draggable, onMove) => {
    const y = toY(price);
    if (y == null || isNaN(y)) return null;
    return {
      type: 'group', id, z: 100,
      draggable: draggable ? 'vertical' : false,
      cursor: draggable ? 'ns-resize' : 'default',
      x: 0, y,
      ondrag: draggable ? function () {
        this.x = 0;
        const p = fromY(this.y);
        if (p == null || isNaN(p) || p <= 0) return;
        if (typeof onMove === 'function') onMove(p);
        const t = this.childOfName ? this.childOfName('tag-txt') : null;
        if (t) t.setStyle({ text: `${prefix} ${fmt(p)}` });
      } : undefined,
      ondragend: draggable ? function () { this.x = 0; const p = fromY(this.y); if (p != null && !isNaN(p) && p > 0 && typeof onMove === 'function') onMove(p, true); } : undefined,
      children: [
        // wide invisible hit-area so the whole line is grabbable (not just the tag)
        { type: 'line', silent: !draggable, shape: { x1, y1: 0, x2: lineX2, y2: 0 }, style: { stroke: 'transparent', lineWidth: draggable ? 16 : 1 }, cursor: draggable ? 'ns-resize' : 'default' },
        { type: 'line', silent: true, shape: { x1, y1: 0, x2: lineX2, y2: 0 }, style: { stroke: color, lineWidth: 1.5, lineDash: [5, 4] } },
        { type: 'rect', silent: !draggable, shape: { x: tagX, y: -tagH / 2, width: tagW, height: tagH, r: 3 }, style: { fill: color }, cursor: draggable ? 'ns-resize' : 'default' },
        { type: 'text', name: 'tag-txt', silent: true, style: { text: `${prefix} ${fmt(price)}`, x: tagX + pad, y: -6, fill: '#0b0b0b', font: '700 11px Barlow, sans-serif' } }
      ]
    };
  };

  // Entry (static)
  const entryG = buildLine('sim2-entry-line', _simEntryPrice, '#8a8f98', 'Entry', false, null);
  if (entryG) graphics.push(entryG);

  if (_simDirection && _simDirection !== 'flat') {
    const sl = parseFloat(document.getElementById('sim2-sl-input')?.value || 0);
    const tp = parseFloat(document.getElementById('sim2-tp-input')?.value || 0);
    if (sl > 0) {
      const g = buildLine('sim2-sl-line', sl, '#cc2222', 'SL', true, (p, ended) => {
        const inp = document.getElementById('sim2-sl-input'); if (inp) inp.value = String(Math.round(p));
        window._sim2Recalc(true);
        if (ended) _sim2DrawOrderLines();   // snap to exact price on release
      });
      if (g) graphics.push(g);
    }
    if (tp > 0) {
      const g = buildLine('sim2-tp-line', tp, TEAL, 'TP', true, (p, ended) => {
        const inp = document.getElementById('sim2-tp-input'); if (inp) inp.value = String(Math.round(p));
        window._sim2Recalc(true);
        if (ended) _sim2DrawOrderLines();
      });
      if (g) graphics.push(g);
    }
    // Liquidation line (static, gold) — only when leverage brings it on-chart.
    const lev = parseFloat(document.getElementById('sim2-lev-slider')?.value || 1);
    if (lev > 1) {
      const off = (1 - 0.005) / lev;
      const liq = _simDirection === 'long' ? _simEntryPrice * (1 - off) : _simEntryPrice * (1 + off);
      const ly = toY(liq);
      const H = chart.getHeight();
      if (ly != null && !isNaN(ly) && ly > SIM_GRID.top + 2 && ly < H - SIM_GRID.bottom - 2) {
        const g = buildLine('sim2-liq-line', liq, '#c8960c', 'LIQ', false, null);
        if (g) graphics.push(g);
      }
    }
  }

  try { chart.setOption({ graphic: graphics }, { replaceMerge: ['graphic'] }); } catch(_) {}
}

/* ── EXECUTE TRADE ────────────────────────────────────────────────────────── */
window._sim2Execute = function() {
  if (_simAnswered) return;
  if (!_simDirection) return;
  const lockUI = () => document.querySelectorAll('.sim2-dir-btn,.sim2-exec-btn,.sim2-price-input,.sim2-slider,.sim2-preset-btn').forEach(e=>e.disabled=true);

  // Flat: no position — just reveal the outcome to judge the skip.
  if (_simDirection === 'flat') {
    _simAnswered = true;
    lockUI();
    _sim2ClearOrderLines();
    _sim2Reveal(0, 0, 0, 0, 0, 1);
    return;
  }

  const sl  = parseFloat(document.getElementById('sim2-sl-input')?.value  || 0);
  const tp  = parseFloat(document.getElementById('sim2-tp-input')?.value  || 0);
  const rp  = parseFloat(document.getElementById('sim2-risk-slider')?.value || 1);
  const lev = parseFloat(document.getElementById('sim2-lev-slider')?.value  || 1);
  const m   = _calcMetrics(_simDirection, _simEntryPrice, sl, tp, rp, lev, _simStats.equity);
  if (!m.valid) return;
  _simAnswered = true;
  lockUI();
  _sim2ClearOrderLines();
  _sim2Reveal(sl, tp, m.riskUSD, m.notional, rp, lev, m.liqPrice);
};

/* ── REVEAL ───────────────────────────────────────────────────────────────── */
function _sim2Reveal(sl, tp, riskUSD, notional, riskPct, leverage, liqPrice) {
  if (_simRevealTimer) { clearInterval(_simRevealTimer); _simRevealTimer = null; }
  const { ohlc, labels, cutIndex } = _simView;
  const setupOhlc    = ohlc.slice(0, cutIndex);
  const setupLabels  = labels.slice(0, cutIndex);
  const revealOhlc   = ohlc.slice(cutIndex);
  const revealLabels = labels.slice(cutIndex);
  const decIdx       = setupOhlc.length - 1;
  const TEAL         = _bc();
  const entry        = _simEntryPrice;

  const badge = document.querySelector('.sim2-chart-badge');
  if (badge) { badge.textContent = 'Revealing…'; badge.className = 'sim2-chart-badge revealing'; }

  let count = 0, hitType = null;
  const total = revealOhlc.length;

  // Keep the whole reveal to a roughly constant ~2.2s regardless of how many
  // candles the timeframe produced (a 4h round can have 60+ reveal candles —
  // one-at-a-time at 220ms felt frozen). Reveal several candles per tick.
  const TARGET_MS = 2200, TICK_MS = 110;
  const perTick = Math.max(1, Math.ceil(total / (TARGET_MS / TICK_MS)));

  _simRevealTimer = setInterval(() => {
    count = Math.min(total, count + perTick);
    const thisBatch = revealOhlc.slice(0, count);
    for (const candle of thisBatch) {
      if (!hitType) hitType = _checkHit(_simDirection, sl, tp, candle, liqPrice);
    }
    if (hitType) count = total; // snap to end on hit

    // Live floating P&L on the position as candles print
    _sim2UpdateLivePnL(revealOhlc[count - 1], entry, sl, tp, notional, hitType);

    const visLabels = [...setupLabels, ...revealLabels.slice(0, count)];
    const wireframe = thisBatch.map(c => {
      const isBull = c[1] >= c[0];
      return { value:c, itemStyle:{ color:'transparent', borderColor:isBull?TEAL:'#cc2222', borderWidth:1.5, color0:'transparent', borderColor0:'#cc2222' }};
    });

    if (_simChartInst) {
      _simChartInst.setOption({
        xAxis:{ data:visLabels },
        series:[{ data:[...setupOhlc,...wireframe],
          markLine:{ symbol:['none','none'], silent:true, data:[
            [{ xAxis:decIdx, label:{show:true,formatter:'Entry',color:TEAL,fontSize:10,fontWeight:700,position:'insideEndTop'}, lineStyle:{color:TEAL,type:'dashed',width:1.5,opacity:.8}},{ xAxis:decIdx }],
            ...(sl>0?[[{yAxis:sl,label:{show:true,formatter:`SL $${sl.toFixed(0)}`,color:'#cc2222',fontSize:10,fontWeight:700,position:'end'},lineStyle:{color:'#cc2222',type:'dashed',width:1.5,opacity:.9}},{yAxis:sl}]]:[]),
            ...(tp>0?[[{yAxis:tp,label:{show:true,formatter:`TP $${tp.toFixed(0)}`,color:TEAL,fontSize:10,fontWeight:700,position:'end'},lineStyle:{color:TEAL,type:'dashed',width:1.5,opacity:.9}},{yAxis:tp}]]:[]),
            ...(_simView.markLines||[]).map(ml=>[{yAxis:ml.yAxis,label:{show:true,formatter:ml.label,color:TEAL,fontSize:10,position:'end'},lineStyle:{color:TEAL,type:'dashed',width:1.5,opacity:.5}},{yAxis:ml.yAxis}])
          ]}
        }]
      }, { notMerge:false });
    }

    if (count >= total) {
      clearInterval(_simRevealTimer);
      _simRevealTimer = null;
      if (badge) { badge.textContent = 'Revealed'; badge.className = 'sim2-chart-badge revealed'; }
      const exitPrice  = revealOhlc[total-1][1];
      const finalHit   = hitType || 'open';
      _sim2Score(sl, tp, riskUSD, notional, riskPct, leverage, entry, exitPrice, finalHit);
    }
  }, TICK_MS);
}

/* ── LIVE FLOATING P&L (updates during reveal) ───────────────────────────── */
function _sim2UpdateLivePnL(candle, entry, sl, tp, notional, hitType) {
  if (!candle) return;
  const priceEl = document.getElementById('sim2-live-price');
  const pnlEl   = document.getElementById('sim2-live-pnl');
  // For a flat (skip) position there is no exposure — just track price.
  let mark = candle[1];
  if (hitType === 'sl') mark = sl;
  else if (hitType === 'tp') mark = tp;
  else if (hitType === 'liq') mark = candle[2] !== undefined && _simDirection === 'long' ? candle[2] : candle[3];
  if (priceEl) {
    priceEl.textContent = '$' + mark.toLocaleString(undefined,{maximumFractionDigits:0});
    priceEl.style.color = mark >= entry ? _bc() : '#cc2222';
  }
  if (pnlEl) {
    if (!_simDirection || _simDirection === 'flat' || !notional) {
      pnlEl.textContent = 'FLAT';
      pnlEl.style.color = 'var(--text3)';
    } else {
      const dirMult = _simDirection === 'long' ? 1 : -1;
      const float = dirMult * ((mark - entry) / entry) * notional;
      pnlEl.textContent = (float >= 0 ? '+' : '') + '$' + float.toFixed(2);
      pnlEl.style.color = float >= 0 ? _bc() : '#cc2222';
    }
  }
}

/* ── SCORE ROUND ──────────────────────────────────────────────────────────── */
function _sim2Score(sl, tp, riskUSD, notional, riskPct, leverage, entry, exitPrice, hitType) {
  const concept = SIM_CONCEPTS[_simPattern] || { name:_simPattern, bias:'neutral' };
  const isFlat  = _simDirection === 'flat';

  // What the market actually did (for judging a flat decision)
  const moveAfter = (exitPrice - entry) / entry; // +ve = rose

  let dollarPnL = 0;
  if (!isFlat) {
    if (hitType === 'liq') {
      // Liquidation: the posted margin is wiped out (worse than the planned risk).
      dollarPnL = -(leverage > 0 ? notional / leverage : notional);
    } else if (hitType === 'sl') {
      dollarPnL = -riskUSD;                              // exactly what was risked
    } else if (hitType === 'tp') {
      const tpDist = Math.abs(tp - entry) / entry;
      const slDist = Math.abs(entry - sl) / entry;
      dollarPnL = slDist > 0 ? (tpDist / slDist) * riskUSD : 0;
    } else {
      const dirMult  = _simDirection === 'long' ? 1 : -1;
      dollarPnL      = dirMult * moveAfter * notional;
    }
  }

  const slDist = entry > 0 && sl > 0 ? Math.abs(entry - sl) / entry : 0;
  const rr = slDist > 0 ? Math.abs(tp - entry) / entry / slDist : 0;

  if (isFlat) {
    _simStats.skips = (_simStats.skips || 0) + 1;       // skips don't touch equity/win-rate
  } else {
    const won = dollarPnL > 0;
    _simStats.trades++;
    if (won) { _simStats.wins++; _simStats.streak++; }
    else     { _simStats.streak = 0; }
    if (_simStats.streak > _simStats.bestStreak) _simStats.bestStreak = _simStats.streak;
    _simStats.equity = +Math.max(0, _simStats.equity + dollarPnL).toFixed(2);
    _simStats.history.push(_simStats.equity);
    if (_simStats.history.length > 60) _simStats.history.shift();
  }

  // Blotter entry (most-recent-first)
  _simStats.log = _simStats.log || [];
  _simStats.log.unshift({
    pattern: concept.name.split('—')[0].trim(),
    dir: _simDirection,
    pnl: +dollarPnL.toFixed(2),
    rr: +rr.toFixed(2),
    hit: isFlat ? 'flat' : hitType,
    tf: _simTF
  });
  if (_simStats.log.length > 25) _simStats.log.pop();

  simSaveStats(_simStats);
  _sim2ShowVerdict(dollarPnL, hitType, rr, riskPct, leverage, entry, sl, tp, exitPrice, isFlat, moveAfter);
}

/* ── VERDICT CARD ─────────────────────────────────────────────────────────── */
function _sim2ShowVerdict(dollarPnL, hitType, rr, riskPct, leverage, entry, sl, tp, exitPrice, isFlat, moveAfter) {
  const concept = SIM_CONCEPTS[_simPattern] || { name:_simPattern, bias:'neutral', blurb:'' };
  const existing = document.getElementById('sim2-verdict-wrap');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'sim2-verdict-wrap';

  let topHtml;
  if (isFlat) {
    // No money changed hands — judge the decision instead.
    const movePct  = (moveAfter * 100);
    const dirWord  = movePct >= 0 ? 'rose' : 'fell';
    const cls      = 'flat';
    topHtml = `
      <div class="sim2-verdict ${cls}">
        <div class="sim2-verdict-top">
          <span class="sim2-verdict-result" style="color:var(--text2)">● Stayed Flat</span>
          <span class="sim2-verdict-detail">No risk taken · capital preserved</span>
        </div>
        <span class="sim2-verdict-hit open">
          <i data-lucide="minus-circle" style="width:11px;height:11px;"></i>
          Market ${dirWord} ${Math.abs(movePct).toFixed(1)}% after the decision (exit $${exitPrice.toFixed(0)})
        </span>
        <div class="sim2-verdict-pattern">${concept.name}</div>
        <div class="sim2-verdict-blurb">${concept.blurb}</div>
        <div class="sim2-verdict-bias" style="color:var(--text3)">
          Sitting out is a position too. This setup's textbook bias was <strong style="color:${_bc()}">${concept.bias.toUpperCase()}</strong>.
        </div>
        ${_sim2StatsRowHtml()}
      </div>
      <button class="sim2-next-btn" onclick="window._sim2Next()">Next Round →</button>`;
    wrap.innerHTML = topHtml;
    _sim2MountVerdict(wrap);
    return;
  }

  const won     = dollarPnL > 0;
  const isLiq   = hitType === 'liq';
  const cls     = won ? 'win' : 'loss';
  const emoji   = isLiq ? '💥' : hitType==='tp' ? '🎯' : hitType==='sl' ? '🛑' : won ? '✅' : '❌';
  const hitLabel = isLiq ? 'LIQUIDATED' : hitType==='tp' ? 'Take Profit Hit' : hitType==='sl' ? 'Stop Loss Hit' : 'Position Closed at Market';
  const hitCls   = hitType==='tp' ? 'tp' : 'sl';
  const resultStr = `${dollarPnL>=0?'+':''}$${dollarPnL.toFixed(2)}`;
  const resultColor = dollarPnL >= 0 ? _bc() : '#cc2222';
  const biasMatch   = concept.bias === _simDirection || concept.bias === 'neutral';
  const hitDetail = isLiq ? '— margin wiped out before your stop'
    : hitType === 'open' ? `(exit $${exitPrice.toFixed(0)})`
    : `@ $${hitType==='sl'?sl.toFixed(0):tp.toFixed(0)}`;

  wrap.innerHTML = `
    <div class="sim2-verdict ${cls}">
      <div class="sim2-verdict-top">
        <span class="sim2-verdict-result" style="color:${resultColor}">${emoji} ${resultStr}</span>
        <span class="sim2-verdict-detail">Risk ${riskPct}% · ${leverage}× lev · R:R 1:${rr.toFixed(2)}</span>
      </div>
      <span class="sim2-verdict-hit ${hitType==='open'?'open':hitCls}">
        <i data-lucide="${isLiq?'zap':hitType==='tp'?'check-circle':hitType==='sl'?'shield-off':'clock'}" style="width:11px;height:11px;"></i>
        ${hitLabel} ${hitDetail}
      </span>
      ${isLiq ? `<div class="sim2-verdict-bias" style="color:#cc2222">⚠ ${leverage}× leverage put your liquidation price closer than your stop. Lower leverage keeps the stop in control.</div>` : ''}
      <div class="sim2-verdict-pattern">${concept.name}</div>
      <div class="sim2-verdict-blurb">${concept.blurb}</div>
      <div class="sim2-verdict-bias" style="color:${biasMatch?_bc():'#cc2222'}">
        ${biasMatch ? '✓ Bias aligned with pattern — ' + _simDirection.toUpperCase() : '✗ Against the pattern — bias was ' + concept.bias.toUpperCase()}
      </div>
      ${_sim2StatsRowHtml()}
    </div>
    ${_simStats.equity < 1
      ? '<button class="sim2-next-btn" onclick="window._sim2ResetContinue()">💀 Account blown — Reset & keep practicing</button>'
      : '<button class="sim2-next-btn" onclick="window._sim2Next()">Next Round →</button>'}
  `;
  _sim2MountVerdict(wrap);
}

window._sim2ResetContinue = function() {
  _simStats = { equity:1000, trades:0, wins:0, streak:0, bestStreak:0, skips:0, history:[1000], log:[] };
  simSaveStats(_simStats);
  renderSimulator('content-area', _simOpts);
};

function _sim2StatsRowHtml() {
  return `
      <div class="sim2-verdict-stats">
        <div class="sim2-verdict-stat">Equity <strong>$${_simStats.equity.toFixed(0)}</strong></div>
        <div class="sim2-verdict-stat">Win rate <strong>${_simStats.trades>0?Math.round(_simStats.wins/_simStats.trades*100):0}%</strong></div>
        <div class="sim2-verdict-stat">Streak <strong>${_simStats.streak}</strong></div>
        <div class="sim2-verdict-stat">Best <strong>${_simStats.bestStreak}</strong></div>
      </div>`;
}

function _sim2MountVerdict(wrap) {

  const grid = document.querySelector('.sim2-grid');
  if (grid) grid.after(wrap);
  else document.getElementById('content-area').appendChild(wrap);

  if (typeof lucide !== 'undefined') lucide.createIcons();
  _sim2UpdateStats();
  _sim2RenderBlotter();
}

/* ── TRADE BLOTTER ────────────────────────────────────────────────────────── */
function _sim2RenderBlotter() {
  const body = document.getElementById('sim2-blotter-body');
  if (!body) return;
  const log = _simStats.log || [];
  if (!log.length) {
    body.innerHTML = `<div class="sim2-blotter-empty">No trades yet — your fills will appear here.</div>`;
    return;
  }
  body.innerHTML = log.map(t => {
    const isFlat = t.dir === 'flat';
    const dirCls = isFlat ? 'flat' : (t.dir === 'long' ? 'long' : 'short');
    const dirTxt = isFlat ? 'FLAT' : t.dir.toUpperCase();
    const pnlCls = isFlat ? '' : (t.pnl >= 0 ? 'pos' : 'neg');
    const pnlTxt = isFlat ? '—' : `${t.pnl>=0?'+':''}$${t.pnl.toFixed(2)}`;
    const hitTxt = t.hit==='tp'?'TP':t.hit==='sl'?'SL':t.hit==='liq'?'LIQ':t.hit==='flat'?'skip':'mkt';
    return `<div class="sim2-blotter-row">
      <span class="sim2-blot-pat">${t.pattern}</span>
      <span class="sim2-blot-tf">${(t.tf||'').toUpperCase()}</span>
      <span class="sim2-blot-dir ${dirCls}">${dirTxt}</span>
      <span class="sim2-blot-hit">${hitTxt}</span>
      <span class="sim2-blot-rr">${t.rr?('1:'+t.rr.toFixed(1)):'—'}</span>
      <span class="sim2-blot-pnl ${pnlCls}">${pnlTxt}</span>
    </div>`;
  }).join('');
}

/* ── NEXT ROUND ───────────────────────────────────────────────────────────── */
window._sim2Next = function() {
  if (_simRevealTimer) { clearInterval(_simRevealTimer); _simRevealTimer = null; }
  renderSimulator('content-area', _simOpts);
};

/* ── PATTERN LOCK ─────────────────────────────────────────────────────────── */
window._sim2LockPattern = function(key) {
  // _simOpts.pattern is the single source of truth (renderSimulator derives the
  // lock from it). Manually choosing a pattern drops the course label.
  _simOpts.pattern = (key === 'random') ? null : key;
  _simOpts.label = '';
  renderSimulator('content-area', _simOpts);
};

/* ── RESET ────────────────────────────────────────────────────────────────── */
window._sim2Reset = function() {
  if (!confirm('Reset all simulator stats?')) return;
  _simStats = { equity:1000, trades:0, wins:0, streak:0, bestStreak:0, skips:0, history:[1000], log:[] };
  simSaveStats(_simStats);
  renderSimulator('content-area', _simOpts);
};

/* ═══════════════════════════════════════════════════════════════════════════
   PUBLIC ENTRY POINT
   renderSimulator(containerId, options)
     options.pattern   — lock to a specific pattern key
     options.label     — display label when in course mode
     options.courseMode — boolean
   ═══════════════════════════════════════════════════════════════════════════ */
function renderSimulator(containerId, opts) {
  _simStyles();
  _simOpts = opts || {};

  if (_simRevealTimer) { clearInterval(_simRevealTimer); _simRevealTimer = null; }
  if (_simEquityChart) { try { _simEquityChart.dispose(); } catch(_) {} _simEquityChart = null; }
  if (_simChartInst)   { try { _simChartInst.dispose();   } catch(_) {} _simChartInst   = null; }

  // Pattern lock is driven entirely by _simOpts.pattern: a value locks to that
  // pattern (course "Practice This Pattern" or a chosen pill); empty = random.
  _simLockedPattern = _simOpts.pattern || null;

  _simStats = simLoadStats();
  if (!_simStats.history || !_simStats.history.length) _simStats.history = [1000];

  _simNewRound();

  const container = document.getElementById(containerId);
  if (!container) return;

  _simEntryPrice = _simView.ohlc[_simView.cutIndex - 1]?.[1] || 0;

  const pnl   = _simStats.equity - 1000;
  const wr    = _simStats.trades > 0 ? Math.round((_simStats.wins/_simStats.trades)*100) : 0;
  const TEAL  = _bc();
  const concept = SIM_CONCEPTS[_simPattern] || {};

  // Build pattern selector pills
  const patternPills = [
    `<button class="sim2-pat-btn random ${!_simLockedPattern?'active':''}" data-key="random" onclick="_sim2LockPattern('random')">🎲 Random</button>`,
    ...SIM_ALL_PATTERNS.map(k => {
      const c  = SIM_CONCEPTS[k];
      const active = _simLockedPattern === k ? 'active' : '';
      return `<button class="sim2-pat-btn ${active}" data-key="${k}" onclick="_sim2LockPattern('${k}')" title="${c.name}">${c.name.split('—')[0].trim()}</button>`;
    })
  ].join('');

  // Default SL/TP based on concept hints
  const slDefault = (_simDirection === 'long'
    ? _simEntryPrice * (1 - (concept.slHint||0.02))
    : _simEntryPrice * (1 + (concept.slHint||0.02))).toFixed(0);
  const tpDefault = (_simDirection === 'long'
    ? _simEntryPrice * (1 + (concept.tpHint||0.05))
    : _simEntryPrice * (1 - (concept.tpHint||0.05))).toFixed(0);

  const courseTag = _simOpts.label
    ? `<span style="font-size:11px;color:var(--teal);font-weight:700;background:var(--teal-faint);border:1px solid rgba(0,212,212,.25);padding:2px 10px;border-radius:10px;margin-left:8px;">Practicing: ${_simOpts.label}</span>`
    : '';

  container.innerHTML = `
    <div class="sim2-wrap">

      <div class="sim2-back-row">
        <button class="sim2-back-btn" onclick="typeof init==='function'&&init(false)">
          <i data-lucide="arrow-left" style="width:15px;height:15px;"></i> Back to Course
        </button>
        <div>
          <div class="sim2-heading" style="display:inline;">Practice Simulator</div>${courseTag}
          <div class="sim2-sub">read the chart · set stops · manage risk</div>
        </div>
      </div>

      <!-- Pattern selector -->
      <div class="sim2-pattern-bar">
        <span class="sim2-pattern-label">Pattern:</span>
        ${patternPills}
      </div>

      <!-- Stats -->
      <div class="sim2-stats">
        <div class="sim2-stat"><div class="sim2-stat-lbl">Equity</div><div class="sim2-stat-val ${pnl>=0?'':'down'}" id="sim2-stat-equity">$${_simStats.equity.toFixed(0)}</div></div>
        <div class="sim2-stat"><div class="sim2-stat-lbl">Win Rate</div><div class="sim2-stat-val ${wr>=50?'':'down'}" id="sim2-stat-wr">${wr}%</div></div>
        <div class="sim2-stat"><div class="sim2-stat-lbl">Trades</div><div class="sim2-stat-val" id="sim2-stat-trades">${_simStats.trades}</div></div>
        <div class="sim2-stat"><div class="sim2-stat-lbl">Streak</div><div class="sim2-stat-val" id="sim2-stat-streak">${_simStats.streak}🔥</div></div>
      </div>

      <!-- Chart + Terminal grid -->
      <div class="sim2-grid">

        <!-- Chart -->
        <div class="sim2-chart-card">
          <div class="sim2-chart-topbar">
            <div class="sim2-chart-topL">
              <span class="sim2-chart-sym">BTC/USD · Synthetic</span>
              <div class="sim2-tf-group" id="sim2-tf-group">
                ${SIM_TIMEFRAMES.map(tf=>`<button class="sim2-tf-btn ${tf===_simTF?'active':''}" data-tf="${tf}" onclick="_sim2SetTF('${tf}')">${tf.toUpperCase()}</button>`).join('')}
              </div>
            </div>
            <div class="sim2-chart-live">
              <span class="sim2-live-price" id="sim2-live-price">$${_simEntryPrice.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
              <span class="sim2-live-pnl" id="sim2-live-pnl">FLAT</span>
              <span class="sim2-chart-badge">Decision Point</span>
            </div>
          </div>
          <div id="sim2-chart-el"></div>
        </div>

        <!-- Terminal -->
        <div class="sim2-terminal">
          <div class="sim2-term-header">
            <span class="sim2-term-title">Order Terminal</span>
            <div style="text-align:right;">
              <div class="sim2-acct-lbl">Account Equity</div>
              <div class="sim2-acct-equity" id="sim2-acct-equity">$${_simStats.equity.toFixed(2)}</div>
            </div>
          </div>

          <!-- Account summary -->
          <div class="sim2-acct-row">
            <div class="sim2-acct-cell"><span class="sim2-acct-cell-lbl">Balance</span><span class="sim2-acct-cell-val" id="sim2-acct-balance">$${_simStats.equity.toFixed(0)}</span></div>
            <div class="sim2-acct-cell"><span class="sim2-acct-cell-lbl">Used Margin</span><span class="sim2-acct-cell-val" id="sim2-acct-margin">$0</span></div>
            <div class="sim2-acct-cell"><span class="sim2-acct-cell-lbl">Free Margin</span><span class="sim2-acct-cell-val" id="sim2-acct-free">$${_simStats.equity.toFixed(0)}</span></div>
          </div>

          <!-- Direction -->
          <div class="sim2-dir-row">
            <button class="sim2-dir-btn sim2-dir-long"  id="sim2-dir-long"  onclick="_sim2Dir('long')">▲ Long</button>
            <button class="sim2-dir-btn sim2-dir-flat"  id="sim2-dir-flat"  onclick="_sim2Dir('flat')">● Flat</button>
            <button class="sim2-dir-btn sim2-dir-short" id="sim2-dir-short" onclick="_sim2Dir('short')">▼ Short</button>
          </div>

          <!-- Entry price (read-only) -->
          <div class="sim2-fields">
            <div class="sim2-field">
              <div class="sim2-field-header">
                <span class="sim2-field-lbl">Entry Price (last close)</span>
                <span class="sim2-field-pct" id="sim2-entry-display" style="color:var(--teal);">$${_simEntryPrice.toLocaleString()}</span>
              </div>
            </div>

            <!-- Stop Loss -->
            <div class="sim2-field">
              <div class="sim2-field-header">
                <span class="sim2-field-lbl" id="sim2-sl-lbl">Stop Loss</span>
                <span class="sim2-field-pct" id="sim2-sl-pct">—</span>
              </div>
              <input class="sim2-price-input input-sl" id="sim2-sl-input" type="number" placeholder="Price" oninput="_sim2Recalc()" />
              <div class="sim2-presets">
                <span style="font-size:10px;color:var(--text3);align-self:center;">Quick:</span>
                <button class="sim2-preset-btn" onclick="_sim2SetSL(1)">1%</button>
                <button class="sim2-preset-btn" onclick="_sim2SetSL(2)">2%</button>
                <button class="sim2-preset-btn" onclick="_sim2SetSL(3)">3%</button>
                <button class="sim2-preset-btn" onclick="_sim2SetSL(5)">5%</button>
              </div>
            </div>

            <!-- Take Profit -->
            <div class="sim2-field">
              <div class="sim2-field-header">
                <span class="sim2-field-lbl" id="sim2-tp-lbl">Take Profit</span>
                <span class="sim2-field-pct" id="sim2-tp-pct">—</span>
              </div>
              <input class="sim2-price-input input-tp" id="sim2-tp-input" type="number" placeholder="Price" oninput="_sim2Recalc()" />
              <div class="sim2-presets">
                <span style="font-size:10px;color:var(--text3);align-self:center;">Quick:</span>
                <button class="sim2-preset-btn" onclick="_sim2SetTP(2)">2%</button>
                <button class="sim2-preset-btn" onclick="_sim2SetTP(4)">4%</button>
                <button class="sim2-preset-btn" onclick="_sim2SetTP(6)">6%</button>
                <button class="sim2-preset-btn" onclick="_sim2SetTP(10)">10%</button>
              </div>
            </div>
          </div>

          <!-- Risk % -->
          <div class="sim2-risk-row">
            <div class="sim2-risk-header">
              <span class="sim2-risk-lbl">Risk Per Trade</span>
              <span class="sim2-risk-val" id="sim2-risk-val">1%</span>
            </div>
            <input type="range" class="sim2-slider" id="sim2-risk-slider" min="0.5" max="5" step="0.5" value="1" oninput="_sim2RiskInput(this.value)" />
          </div>

          <!-- Leverage -->
          <div class="sim2-lev-row">
            <div class="sim2-lev-header">
              <span class="sim2-lev-lbl">Leverage <span style="font-weight:400;font-size:10px;color:var(--text3);">(controls margin used, not P&L at SL)</span></span>
              <span class="sim2-lev-val" id="sim2-lev-val">1×</span>
            </div>
            <input type="range" class="sim2-slider" id="sim2-lev-slider" min="1" max="25" step="1" value="1" oninput="_sim2LevInput(this.value)" />
          </div>

          <!-- Calculated metrics -->
          <div class="sim2-calc">
            <div class="sim2-calc-title">Position Mechanics</div>
            <div class="sim2-calc-row"><span class="sim2-calc-lbl">Max Loss (if SL hit)</span><span class="sim2-calc-val red" id="sim2-calc-riskusd">—</span></div>
            <div class="sim2-calc-row"><span class="sim2-calc-lbl">Max Profit (if TP hit)</span><span class="sim2-calc-val teal" id="sim2-calc-potential">—</span></div>
            <div class="sim2-calc-row rr-row"><span class="sim2-calc-lbl">Risk / Reward</span><span class="sim2-calc-val gold" id="sim2-calc-rr">—</span></div>
            <div class="sim2-calc-row"><span class="sim2-calc-lbl">Position Notional</span><span class="sim2-calc-val" id="sim2-calc-notional">—</span></div>
            <div class="sim2-calc-row"><span class="sim2-calc-lbl">Margin Required</span><span class="sim2-calc-val" id="sim2-calc-margin">—</span></div>
            <div class="sim2-calc-row"><span class="sim2-calc-lbl">Liquidation Price</span><span class="sim2-calc-val red" id="sim2-calc-liq">—</span></div>
          </div>

          <!-- Warning -->
          <div class="sim2-warn" id="sim2-warn"></div>

          <!-- Execute -->
          <div class="sim2-exec-wrap">
            <button class="sim2-exec-btn" id="sim2-exec-btn" onclick="_sim2Execute()" disabled>
              Execute Trade
            </button>
          </div>
        </div>

      </div><!-- /.sim2-grid -->

      <!-- Lower grid: equity curve + trade blotter -->
      <div class="sim2-lower-grid">
        <!-- Equity curve -->
        <div class="sim2-equity-card">
          <div class="sim2-equity-topbar">
            <span>Equity Curve</span>
            <span id="sim2-equity-pnl" style="font-size:12px;font-weight:700;color:${pnl>=0?TEAL:'#cc2222'};">${pnl>=0?'+':''}$${pnl.toFixed(0)} all-time</span>
          </div>
          <div id="sim2-equity-el"></div>
        </div>

        <!-- Trade blotter -->
        <div class="sim2-blotter-card">
          <div class="sim2-blotter-topbar">
            <span>Trade History</span>
            <span class="sim2-blotter-meta">${_simStats.skips||0} skips</span>
          </div>
          <div class="sim2-blotter-head">
            <span>Setup</span><span>TF</span><span>Side</span><span>Exit</span><span>R:R</span><span>P&amp;L</span>
          </div>
          <div class="sim2-blotter-body" id="sim2-blotter-body"></div>
        </div>
      </div>

      <div class="sim2-reset-row">
        <button class="sim2-reset-btn" onclick="_sim2Reset()">Reset Stats</button>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  setTimeout(() => {
    _sim2RenderSetup();
    _sim2RenderEquityChart();
    _sim2RenderBlotter();
  }, 60);
}

window.renderSimulator = renderSimulator;

/* ══════════════════════════════════════════════════════════════════════════
   COURSE INTEGRATION HELPERS
   Called from lt-engine.js to get the simulator pattern for a chapter
   ══════════════════════════════════════════════════════════════════════════ */
window.getSimPatternForChapter = function(chapterTitle) {
  for (const [key, patterns] of Object.entries(CHAPTER_PATTERN_MAP)) {
    if (chapterTitle.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(chapterTitle.toLowerCase())) {
      return patterns[0]; // return primary pattern
    }
  }
  return null;
};

window.SIM_CONCEPTS = SIM_CONCEPTS;
window.CHAPTER_PATTERN_MAP = CHAPTER_PATTERN_MAP;
