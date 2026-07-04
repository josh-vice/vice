'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Practice Simulator v3 "Terminal"
   lt-sim-ui.js  |  Live market-replay trading terminal.

   Ground-up rebuild (2026-07-03, owner-directed): the old one-shot
   pick-a-side-and-reveal quiz is gone. This is a live ticking market you trade
   INSIDE — market/limit/stop orders, a managed position (partial closes,
   editable + draggable SL/TP), isolated margin with a proper liquidation
   price, taker/maker fees, slippage, and volume. The pattern generator
   (lt-simulator.js) still seeds every session so each market embeds a course
   concept; the pattern is revealed with coaching when the session ends.

   Public API (unchanged for engine integration):
     renderSimulator(containerId, opts)   opts: {pattern, label, courseMode}
     ltSimTeardown()
     getSimPatternForChapter(title)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── EXCHANGE CONSTANTS ───────────────────────────────────────────────────── */
const SIM_TAKER   = 0.00055;   // 0.055% — market orders / stops (Bybit-style)
const SIM_MAKER   = 0.0002;    // 0.02%  — resting limit fills (incl. TP)
const SIM_MMR     = 0.005;     // maintenance margin rate (isolated)
const SIM_MIN_USD = 10;        // minimum order notional (exchanges reject dust)
const SIM_MAX_LEV = 50;
const SIM_TPB     = 5;         // synthetic ticks per 1h base candle
const SIM_SPEEDS  = [ { label:'1×', ms:520 }, { label:'2×', ms:260 }, { label:'4×', ms:130 }, { label:'10×', ms:52 } ];
const SIM_WINDOW  = 140;       // view candles kept on screen

/* ── PATTERN CONCEPTS (course tie-ins, revealed at session end) ───────────── */
const SIM_CONCEPTS = {
  uptrend:         { name:'Uptrend — Higher Highs & Higher Lows',  bias:'long',    course:'Trending Markets',           blurb:'Each Higher Low is a buy opportunity. Trail your stop under each new HL as the trend develops.' },
  downtrend:       { name:'Downtrend — Lower Highs & Lower Lows',  bias:'short',   course:'Trending Markets',           blurb:'Each Lower High is a sell. Ride the trend — trail stops above each new LH.' },
  range:           { name:'Range-Bound Market',                     bias:'neutral', course:'Range-Bound Markets',        blurb:'Buy the DBS zone, sell the SSR zone. Stop outside the range. Target midpoint or the opposite boundary.' },
  bull_flag:       { name:'Bull Flag — Continuation',              bias:'long',    course:'Classical Chart Patterns',   blurb:'Tight pullback on low volume after a strong impulse. Break of the flag high = measured move target.' },
  bear_flag:       { name:'Bear Flag — Continuation',              bias:'short',   course:'Classical Chart Patterns',   blurb:'Shallow bounce after a sharp drop. Break of the flag low = continuation target. SL above the flag high.' },
  breakout:        { name:'Range Breakout',                         bias:'long',    course:'SR Flips and Break of Structure', blurb:'Old resistance becomes new support on the retest. Entry on retest pullback. Stop below the broken level.' },
  double_top:      { name:'Double Top — Reversal',                  bias:'short',   course:'Classical Chart Patterns',   blurb:'Two equal highs at the same resistance. Break of the neckline confirms reversal.' },
  double_bottom:   { name:'Double Bottom — Reversal',               bias:'long',    course:'Classical Chart Patterns',   blurb:'Two equal lows at the same support. Break of the neckline confirms.' },
  demand_bounce:   { name:'Demand Zone (DBS) Bounce',               bias:'long',    course:'Supply and Demand Zones',    blurb:'First fresh test of a demand zone with long lower wicks. SL just below the zone.' },
  supply_reject:   { name:'Supply Zone (SSR) Rejection',            bias:'short',   course:'Supply and Demand Zones',    blurb:'First fresh test of a supply zone with long upper wicks. SL just above the zone.' },
  reversal_hammer: { name:'Hammer — Seller Exhaustion',             bias:'long',    course:'Understanding Price Action',  blurb:'Long lower wick at the bottom of a downtrend. SL below the wick low.' },
  shooting_star:   { name:'Shooting Star — Buyer Exhaustion',       bias:'short',   course:'Understanding Price Action',  blurb:'Long upper wick at the top of an uptrend. SL above the wick high.' },
  inverted_hammer: { name:'Inverted Hammer — Bullish Reversal',     bias:'long',    course:'Understanding Price Action',  blurb:'Long upper wick at the bottom of a downtrend. Buyers are testing — wait for confirmation.' },
  doji:            { name:'Doji — Indecision',                      bias:'neutral', course:'Understanding Price Action',  blurb:'Open ≈ close, neither side won. At the end of a trend it signals reversal; at S/R it adds confluence.' },
  sr_flip:         { name:'S/R Flip — Resistance Becomes Support',  bias:'long',    course:'SR Flips and Break of Structure', blurb:'After breaking above resistance, the retest from above is the highest-probability entry.' },
  liquidity_sweep: { name:'Swing Failure Pattern (SFP)',            bias:'short',   course:'Identifying Liquidity',      blurb:'Price sweeps a prior swing high, traps breakout longs, then reverses. SL above the wick.' },
  bos:             { name:'Break of Structure (BOS)',               bias:'short',   course:'What Is Market Structure?',   blurb:'Price breaks a key swing low in an uptrend — first sign the trend is changing.' },
};

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
const SIM_STORAGE      = LT_KEYS.simStats;
const SIM_DIFF_KEY     = LT_KEYS.simDifficulty;
const SIM_GRID  = { left:56, right:96, top:18, bottomPricePct:70, volGapPct:6 };

/* ── ACCOUNT (persisted) ──────────────────────────────────────────────────── */
let A = null;   // { v:2, balance, trades, wins, streak, bestStreak, sessions, history[], log[] }

function simLoadAccount() {
  try {
    const r = localStorage.getItem(SIM_STORAGE);
    if (r) {
      const s = JSON.parse(r);
      if (s.v === 2) {
        if (!Array.isArray(s.history)) s.history = [s.balance || 1000];
        if (!Array.isArray(s.log)) s.log = [];
        return s;
      }
      // migrate v1 (equity-based quiz stats) → v2 terminal account
      return { v:2, balance:+(s.equity ?? 1000), trades:s.trades|0, wins:s.wins|0,
               streak:s.streak|0, bestStreak:s.bestStreak|0, sessions:0,
               history:Array.isArray(s.history)?s.history.slice(-200):[s.equity||1000], log:[] };
    }
  } catch(_) {}
  return { v:2, balance:1000, trades:0, wins:0, streak:0, bestStreak:0, sessions:0, history:[1000], log:[] };
}
function simSaveAccount() { try { localStorage.setItem(SIM_STORAGE, JSON.stringify(A)); } catch(_) {} }

/* ── SESSION (ephemeral) ──────────────────────────────────────────────────── */
let S = null;
/* S = {
     market, tf, factor, stepMs, anchorMs, cutView,
     live:{ohlc:[],vols:[],labels:[]}, forming:{o,h,l,c,vol}|null,
     baseIdx, tickBuf:[], tickIdx, price,
     playing, speedIdx, timer,
     pos:null|{side,qty,entry,margin,lev,sl,tp,liq,realized,fees,openLabel},
     orders:[], nextOid:1, fills:[],
     startBal, feesPaid, ended, elapsedTicks
   } */
let _simOpts = {};
let _simLockedPattern = null;
let _simChart = null, _simEqChart = null, _simChartRO = null, _simEqRO = null;

function _simDifficulty() { return localStorage.getItem(SIM_DIFF_KEY) === 'real' ? 'real' : 'learn'; }
window._sim2SetDifficulty = function(mode) {
  localStorage.setItem(SIM_DIFF_KEY, mode === 'real' ? 'real' : 'learn');
  renderSimulator('content-area', _simOpts);
};

/* ── helpers ─────────────────────────────────────────────────────────────── */
function _bc()   { return (typeof getBullishColor === 'function') ? getBullishColor() : '#00d4d4'; }
function _bear() { return (typeof getBearishColor === 'function') ? getBearishColor() : '#ff2e88'; }
const _fmtUsd  = (v, d=2) => (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits:d, maximumFractionDigits:d });
const _fmtPx   = v => '$' + (+v).toLocaleString(undefined, { maximumFractionDigits:0 });
const _fmtQty  = v => (+v).toFixed(4);
const _el      = id => document.getElementById(id);
const _setTxt  = (id, t) => { const e = _el(id); if (e) e.textContent = t; };
function _slip() { return 0.0002 + Math.random() * 0.0003; }   // 2–5 bps market-order slippage

function _liqPx(side, entry, lev) {
  return side === 'long' ? entry * (1 - 1/lev + SIM_MMR) : entry * (1 + 1/lev - SIM_MMR);
}
function _uPnL(pos, price) {
  if (!pos) return 0;
  return pos.side === 'long' ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
}
function _equity() { return A.balance + _uPnL(S && S.pos, S ? S.price : 0); }
function _usedMargin() { return (S && S.pos) ? S.pos.margin : 0; }
function _freeMargin() { return Math.max(0, _equity() - _usedMargin()); }

function _nowLabel() {
  if (!S) return '';
  const i = S.live.ohlc.length;   // index of the forming candle
  const d = new Date(S.anchorMs + (i - S.cutView) * S.stepMs);
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h = d.getUTCHours();
  return MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + (S.tf === '1d' ? '' : ' ' + (h<10?'0':'') + h + ':00');
}

/* ── SESSION BOOTSTRAP ────────────────────────────────────────────────────── */
function _newSession() {
  const pattern = _simLockedPattern || SIM_ALL_PATTERNS[Math.floor(Math.random() * SIM_ALL_PATTERNS.length)];
  const tf      = SIM_TIMEFRAMES[Math.floor(Math.random() * SIM_TIMEFRAMES.length)];
  const seed    = Math.floor(Math.random() * 99999) + 1;
  const outcome = _simDifficulty() === 'real' ? (Math.random() < 0.38 ? 'fail' : 'resolve') : 'resolve';
  const market  = generateMarket(pattern, seed, outcome);
  extendMarket(market, 500);                     // deep runway for live play

  S = {
    market, tf: null, factor: 0, stepMs: 0, anchorMs: 0, cutView: 0,
    live: { ohlc: [], vols: [], labels: [] }, forming: null,
    baseIdx: market.cutIndexBase, tickBuf: [], tickIdx: 0,
    price: market.ohlcBase[market.cutIndexBase - 1][1],
    playing: false, speedIdx: 1, timer: null,
    pos: null, orders: [], nextOid: 1, fills: [],
    startBal: A.balance, feesPaid: 0, ended: false, elapsedTicks: 0
  };
  _applyTF(tf);
}

/* Build the live view arrays from base data for the given TF (history up to the
   current baseIdx; also mid-session — the base cursor is TF-independent). */
function _applyTF(tf) {
  const v = viewMarket(S.market, tf);            // full-history reference view
  S.tf = tf; S.factor = v.factor; S.stepMs = v.stepMs; S.anchorMs = v.anchorMs; S.cutView = v.cutIndex;
  const fullView = Math.floor(S.baseIdx / S.factor);
  S.live.ohlc   = v.ohlc.slice(0, fullView).map(c => c.slice());
  S.live.vols   = v.vols.slice(0, fullView).slice();
  S.live.labels = v.labels.slice(0, fullView).slice();
  // partially-consumed base candles → forming view candle
  const leftover = S.baseIdx - fullView * S.factor;
  if (leftover > 0) {
    const seg = S.market.ohlcBase.slice(fullView * S.factor, fullView * S.factor + leftover);
    const vol = (S.market.volBase || []).slice(fullView * S.factor, fullView * S.factor + leftover).reduce((a,b)=>a+b,0);
    S.forming = { o: seg[0][0], c: seg[seg.length-1][1], l: Math.min(...seg.map(c=>c[2])), h: Math.max(...seg.map(c=>c[3])), vol };
  } else {
    S.forming = null;
  }
  // replay in-flight ticks of the current base candle into the forming candle
  if (S.tickBuf.length && S.tickIdx > 0) {
    for (let i = 0; i < S.tickIdx; i++) _absorbTick(S.tickBuf[i], false);
  }
}

/* ── TICK ENGINE ──────────────────────────────────────────────────────────── */
function _absorbTick(p, isNewBase) {
  if (!S.forming) {
    S.forming = { o: p, h: p, l: p, c: p, vol: 0 };
  } else {
    S.forming.h = Math.max(S.forming.h, p);
    S.forming.l = Math.min(S.forming.l, p);
    S.forming.c = p;
  }
  if (isNewBase) S.forming.vol += (S.market.volBase[S.baseIdx] || 0) / SIM_TPB;
  else S.forming.vol += (S.market.volBase[S.baseIdx] || 0) / SIM_TPB;
}

function _advanceTick() {
  if (S.ended) return;
  // need a fresh base candle?
  if (S.tickIdx >= S.tickBuf.length) {
    S.baseIdx++;
    if (S.baseIdx >= S.market.ohlcBase.length - 30) extendMarket(S.market, 400);
    // crossing a view-candle boundary → close the forming candle
    if (S.baseIdx % S.factor === 0 && S.forming) {
      S.live.ohlc.push([+S.forming.o.toFixed(2), +S.forming.c.toFixed(2), +S.forming.l.toFixed(2), +S.forming.h.toFixed(2)]);
      S.live.vols.push(+S.forming.vol.toFixed(1));
      S.live.labels.push(_labelFor(S.live.ohlc.length - 1));
      S.forming = null;
    }
    S.tickBuf = synthTicks(S.market.ohlcBase[S.baseIdx], SIM_TPB, (S.market.seed * 7 + S.baseIdx) >>> 0);
    S.tickIdx = 0;
  }
  const p = S.tickBuf[S.tickIdx++];
  S.price = p;
  S.elapsedTicks++;
  _absorbTick(p, true);
  _processOrders(p);
  _processPosition(p);
}

function _labelFor(i) {
  const d = new Date(S.anchorMs + (i - S.cutView) * S.stepMs);
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h = d.getUTCHours();
  return S.tf === '1d' ? MON[d.getUTCMonth()] + ' ' + d.getUTCDate()
       : (h === 0 ? MON[d.getUTCMonth()] + ' ' + d.getUTCDate() : (h<10?'0':'') + h + ':00');
}

function _tickLoop() {
  _advanceTick();
  _paintTick();
}

function _setPlaying(on) {
  if (!S || S.ended) on = false;
  S.playing = on;
  if (S.timer) { clearInterval(S.timer); S.timer = null; }
  if (on) S.timer = setInterval(_tickLoop, SIM_SPEEDS[S.speedIdx].ms);
  const b = _el('sim3-play');
  if (b) b.innerHTML = on ? _icoPause() + '<span>Pause</span>' : _icoPlay() + '<span>Play</span>';
  const badge = _el('sim3-live-badge');
  if (badge) badge.className = 'sim3-badge' + (on ? ' live' : ' paused');
  if (badge) badge.textContent = on ? 'LIVE' : 'PAUSED';
}
window._sim3Play  = function() { _setPlaying(!S.playing); };
window._sim3Speed = function() {
  S.speedIdx = (S.speedIdx + 1) % SIM_SPEEDS.length;
  _setTxt('sim3-speed', SIM_SPEEDS[S.speedIdx].label);
  if (S.playing) _setPlaying(true);   // restart interval at new cadence
};

/* ── ORDER / FILL / POSITION ENGINE ──────────────────────────────────────── */
function _recordFill(side, type, px, qty, fee, note) {
  S.fills.unshift({ t: _nowLabel(), side, type, px:+px.toFixed(2), qty:+qty.toFixed(4), fee:+fee.toFixed(4), note: note || '' });
  if (S.fills.length > 80) S.fills.pop();
  _paintBlotter();
}

/* Net a fill into the one-way position. Handles open / add / reduce / flip.
   Returns realized PnL from any reduced portion (fees handled separately). */
function _net(side, qty, px, lev, isMaker, note, slTp) {
  const fee = px * qty * (isMaker ? SIM_MAKER : SIM_TAKER);
  A.balance -= fee; S.feesPaid += fee;
  _recordFill(side, isMaker ? 'limit' : 'market', px, qty, fee, note);

  const dir = side === 'buy' ? 'long' : 'short';
  let realized = 0;

  if (!S.pos) {
    S.pos = { side: dir, qty, entry: px, lev, margin: px * qty / lev,
              sl: slTp && slTp.sl || 0, tp: slTp && slTp.tp || 0,
              liq: _liqPx(dir, px, lev), realized: 0, fees: fee, openLabel: _nowLabel() };
  } else if (S.pos.side === dir) {
    // add: weighted average entry, margin stacks
    const newQty = S.pos.qty + qty;
    S.pos.entry  = (S.pos.entry * S.pos.qty + px * qty) / newQty;
    S.pos.qty    = newQty;
    S.pos.margin += px * qty / lev;
    S.pos.lev    = (S.pos.entry * S.pos.qty) / S.pos.margin;
    S.pos.liq    = _liqPx(S.pos.side, S.pos.entry, S.pos.lev);
    S.pos.fees  += fee;
    if (slTp) { if (slTp.sl) S.pos.sl = slTp.sl; if (slTp.tp) S.pos.tp = slTp.tp; }
  } else {
    // reduce / flip. Margin is a RESERVATION (tracked via _usedMargin), never
    // deducted from balance at open — so on reduce only the realized PnL moves
    // the balance; the margin share is simply un-reserved.
    const closeQty = Math.min(qty, S.pos.qty);
    const pnl = S.pos.side === 'long' ? (px - S.pos.entry) * closeQty : (S.pos.entry - px) * closeQty;
    realized += pnl;
    S.pos.realized += pnl;
    S.pos.fees += fee;
    A.balance += pnl;
    S.pos.margin *= 1 - closeQty / S.pos.qty;
    S.pos.qty -= closeQty;
    if (S.pos.qty <= 1e-9) {
      _closeTrade(px);
      const flipQty = qty - closeQty;
      if (flipQty > 1e-9) {
        S.pos = { side: dir, qty: flipQty, entry: px, lev, margin: px * flipQty / lev,
                  sl: slTp && slTp.sl || 0, tp: slTp && slTp.tp || 0,
                  liq: _liqPx(dir, px, lev), realized: 0, fees: 0, openLabel: _nowLabel() };
      }
    }
  }
  // opening/adding margin comes out of balance conceptually; we track it as
  // reserved (used margin) rather than deducting — equity math stays correct.
  if (S.pos && (S.pos.side === dir)) { /* margin reserved via _usedMargin() */ }
  return realized;
}

/* Round-trip complete → book the trade into account stats + blotter. */
function _closeTrade(exitPx) {
  const p = S.pos;
  const net = p.realized - p.fees;
  A.trades++;
  if (net > 0) { A.wins++; A.streak++; if (A.streak > A.bestStreak) A.bestStreak = A.streak; }
  else A.streak = 0;
  A.log.unshift({ t: _nowLabel(), side: p.side, qty: +p.qty.toFixed(4), entry: +p.entry.toFixed(2),
                  exit: +exitPx.toFixed(2), fees: +p.fees.toFixed(2), pnl: +net.toFixed(2), tf: S.tf });
  if (A.log.length > 40) A.log.pop();
  A.history.push(+A.balance.toFixed(2));
  if (A.history.length > 200) A.history.shift();
  S.pos = null;
  simSaveAccount();
  _paintBlotter(); _paintEquity();
}

function _processOrders(p) {
  if (!S.orders.length) return;
  const remaining = [];
  for (const o of S.orders) {
    let filled = false;
    if (o.type === 'limit') {
      if ((o.side === 'buy' && p <= o.px) || (o.side === 'sell' && p >= o.px)) {
        _net(o.side, o.qty, o.px, o.lev, true, 'limit fill', o.slTp);   // maker at limit price
        filled = true;
      }
    } else { // stop-market
      if ((o.side === 'buy' && p >= o.px) || (o.side === 'sell' && p <= o.px)) {
        const fillPx = o.side === 'buy' ? p * (1 + _slip()) : p * (1 - _slip());
        _net(o.side, o.qty, fillPx, o.lev, false, 'stop triggered', o.slTp);
        filled = true;
      }
    }
    if (!filled) remaining.push(o);
  }
  if (remaining.length !== S.orders.length) {
    S.orders = remaining;
    _paintOrders(); _paintPosition();
    _toast('Order filled');
  }
}

function _processPosition(p) {
  const pos = S.pos;
  if (!pos) return;
  // liquidation first — the exchange checks it before your orders
  if ((pos.side === 'long' && p <= pos.liq) || (pos.side === 'short' && p >= pos.liq)) {
    const lost = pos.margin;
    A.balance -= lost;                    // isolated: the posted margin is wiped
    pos.realized -= lost;
    _recordFill(pos.side === 'long' ? 'sell' : 'buy', 'liq', pos.liq, pos.qty, 0, 'LIQUIDATED');
    _closeTrade(pos.liq);
    _toast('Position liquidated — margin lost', true);
    _paintPosition(); _paintAccount();
    return;
  }
  if (pos.sl > 0 && ((pos.side === 'long' && p <= pos.sl) || (pos.side === 'short' && p >= pos.sl))) {
    const px = pos.side === 'long' ? pos.sl * (1 - _slip()) : pos.sl * (1 + _slip());
    _net(pos.side === 'long' ? 'sell' : 'buy', pos.qty, px, pos.lev, false, 'stop loss');
    _toast('Stop loss hit');
    _paintPosition(); _paintAccount();
    return;
  }
  if (pos.tp > 0 && ((pos.side === 'long' && p >= pos.tp) || (pos.side === 'short' && p <= pos.tp))) {
    _net(pos.side === 'long' ? 'sell' : 'buy', pos.qty, pos.tp, pos.lev, true, 'take profit');
    _toast('Take profit hit');
    _paintPosition(); _paintAccount();
  }
}

/* ── ORDER SUBMISSION (from the panel) ───────────────────────────────────── */
window._sim3Submit = function() {
  if (!S || S.ended) return;
  const side  = S.uiSide  || 'buy';
  const type  = S.uiType  || 'market';
  const usd   = parseFloat(_el('sim3-size')?.value || 0);
  const lev   = parseFloat(_el('sim3-lev')?.value || 1);
  const pxIn  = parseFloat(_el('sim3-px')?.value || 0);
  const slIn  = parseFloat(_el('sim3-att-sl')?.value || 0);
  const tpIn  = parseFloat(_el('sim3-att-tp')?.value || 0);
  if (!(usd > 0)) return _toast('Enter an order size', true);
  if (usd < SIM_MIN_USD) return _toast('Minimum order size is $' + SIM_MIN_USD, true);
  if (!Number.isFinite(usd)) return _toast('Invalid order size', true);
  const margin = usd / lev;
  if (margin > _freeMargin() + 1e-9) return _toast('Not enough free margin', true);

  const slTp = (slIn > 0 || tpIn > 0) ? { sl: slIn > 0 ? slIn : 0, tp: tpIn > 0 ? tpIn : 0 } : null;
  // sanity: SL/TP on the correct side of price for the direction
  if (slTp) {
    const dirLong = side === 'buy';
    const ref = type === 'market' ? S.price : pxIn;
    if (slTp.sl && (dirLong ? slTp.sl >= ref : slTp.sl <= ref)) return _toast('SL is on the wrong side of entry', true);
    if (slTp.tp && (dirLong ? slTp.tp <= ref : slTp.tp >= ref)) return _toast('TP is on the wrong side of entry', true);
  }

  const clearAttach = () => { const a=_el('sim3-att-sl'), b=_el('sim3-att-tp'); if (a) a.value=''; if (b) b.value=''; };
  if (type === 'market') {
    const px = side === 'buy' ? S.price * (1 + _slip()) : S.price * (1 - _slip());
    _net(side, usd / px, px, lev, false, 'market', slTp);
    clearAttach();
    _toast((side === 'buy' ? 'Bought ' : 'Sold ') + _fmtQty(usd / px) + ' BTC @ ' + _fmtPx(px));
  } else if (type === 'limit') {
    if (!(pxIn > 0)) return _toast('Enter a limit price', true);
    const marketable = (side === 'buy' && pxIn >= S.price) || (side === 'sell' && pxIn <= S.price);
    if (marketable) {
      // real exchanges fill marketable limits immediately as taker
      const px = side === 'buy' ? S.price * (1 + _slip()) : S.price * (1 - _slip());
      _net(side, usd / px, px, lev, false, 'marketable limit', slTp);
      _toast('Limit was marketable — filled now as taker');
    } else {
      S.orders.push({ id: S.nextOid++, type: 'limit', side, px: pxIn, qty: usd / pxIn, lev, slTp });
      clearAttach();
      _toast('Limit order placed @ ' + _fmtPx(pxIn));
    }
  } else { // stop-market
    if (!(pxIn > 0)) return _toast('Enter a trigger price', true);
    const through = (side === 'buy' && S.price >= pxIn) || (side === 'sell' && S.price <= pxIn);
    if (through) return _toast('Trigger is already through — use market', true);
    S.orders.push({ id: S.nextOid++, type: 'stop', side, px: pxIn, qty: usd / pxIn, lev, slTp });
    clearAttach();
    _toast('Stop order armed @ ' + _fmtPx(pxIn));
  }
  _paintOrders(); _paintPosition(); _paintAccount(); _paintOrderPanel(); _drawLines();
};

window._sim3Cancel = function(id) {
  S.orders = S.orders.filter(o => o.id !== id);
  _paintOrders(); _drawLines();
  _toast('Order cancelled');
};

window._sim3ClosePct = function(pct) {
  if (!S.pos) return;
  const qty = S.pos.qty * (pct / 100);
  const side = S.pos.side === 'long' ? 'sell' : 'buy';
  const px = side === 'sell' ? S.price * (1 - _slip()) : S.price * (1 + _slip());
  _net(side, qty, px, S.pos.lev, false, 'close ' + pct + '%');
  _toast('Closed ' + pct + '% @ ' + _fmtPx(px));
  _paintPosition(); _paintAccount(); _paintOrders(); _drawLines();
};

window._sim3ApplySlTp = function() {
  if (!S.pos) return;
  const sl = parseFloat(_el('sim3-pos-sl')?.value || 0);
  const tp = parseFloat(_el('sim3-pos-tp')?.value || 0);
  const long = S.pos.side === 'long';
  if (sl > 0 && (long ? sl >= S.price : sl <= S.price)) return _toast('SL must be on the loss side of the market', true);
  if (tp > 0 && (long ? tp <= S.price : tp >= S.price)) return _toast('TP must be on the profit side of the market', true);
  S.pos.sl = sl > 0 ? sl : 0;
  S.pos.tp = tp > 0 ? tp : 0;
  _toast('Position SL/TP updated');
  _drawLines();
};

window._sim3SizePct = function(pct) {
  const lev = parseFloat(_el('sim3-lev')?.value || 1);
  const max = _freeMargin() * lev * 0.98;   // 2% headroom so the entry fee never busts the margin check
  const el = _el('sim3-size');
  if (el) el.value = Math.max(0, Math.floor(max * pct / 100)).toString();
  _paintOrderPanel();
};

window._sim3UseLast = function() { const el = _el('sim3-px'); if (el) { el.value = Math.round(S.price); _paintOrderPanel(); } };
window._sim3Side = function(side) { S.uiSide = side; _paintOrderPanel(true); };
window._sim3Type = function(type) { S.uiType = type; _paintOrderPanel(true); };

/* ── SESSION END ─────────────────────────────────────────────────────────── */
window._sim3End = function() {
  if (!S || S.ended) return;
  _setPlaying(false);
  // flatten at market, cancel all
  if (S.pos) {
    const side = S.pos.side === 'long' ? 'sell' : 'buy';
    const px = side === 'sell' ? S.price * (1 - _slip()) : S.price * (1 + _slip());
    _net(side, S.pos.qty, px, S.pos.lev, false, 'session end — flatten');
  }
  S.orders = [];
  S.ended = true;
  A.sessions = (A.sessions || 0) + 1;
  simSaveAccount();
  _paintAll();
  _showVerdict();
};

window._sim3New = function() { renderSimulator('content-area', _simOpts); };

window._sim3SetTF = function(tf) {
  if (!S || S.ended || tf === S.tf || !SIM_TIMEFRAMES.includes(tf)) return;
  _applyTF(tf);
  document.querySelectorAll('.sim3-tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === tf));
  _renderChart();
};

window._sim3LockPattern = function(key) {
  _simOpts.pattern = (key === 'random') ? null : key;
  _simOpts.label = '';
  renderSimulator('content-area', _simOpts);
};

window._sim3Reset = function() {
  if (!confirm('Reset the simulator account back to $1,000? Trade history is cleared.')) return;
  A = { v:2, balance:1000, trades:0, wins:0, streak:0, bestStreak:0, sessions:0, history:[1000], log:[] };
  simSaveAccount();
  renderSimulator('content-area', _simOpts);
};

/* ── TOASTS (terminal-local, non-blocking) ───────────────────────────────── */
let _toastTimer = null;
function _toast(msg, warn) {
  const t = _el('sim3-toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'sim3-toast show' + (warn ? ' warn' : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className = 'sim3-toast'; }, 2600);
}

/* ── STYLES ───────────────────────────────────────────────────────────────── */
function _simStyles() {
  LTUtils.injectStyles('lt-sim3-styles', `
  .sim3-wrap { width:100%; max-width:1180px; margin:0 auto; padding:0 0 40px; font-family:'Geist Mono',monospace; }
  .sim3-back-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0 12px; flex-wrap:wrap; gap:8px; }
  .sim3-back-btn { display:inline-flex; align-items:center; gap:6px; background:none; border:none; color:var(--teal); font-size:13px; font-weight:600; cursor:pointer; padding:0; font-family:inherit; }
  .sim3-back-btn:hover { opacity:.8; }
  .sim3-heading { font-size:21px; letter-spacing:-.5px; font-weight:800; color:var(--text); display:inline; }
  .sim3-sub { font-size:12px; color:var(--text3); margin-top:2px; }
  .sim3-beta { display:inline-block; font-size:10px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:var(--text2); background:var(--bg4); border:1px solid var(--border2); border-radius:10px; padding:2px 9px; margin-left:10px; vertical-align:middle; }

  /* controls */
  .sim3-controls { display:flex; flex-wrap:wrap; gap:10px 22px; align-items:center; background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); padding:10px 14px; margin-bottom:14px; }
  .sim3-ctrl-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--text3); }
  .sim3-ctrl-group { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .sim3-seg { display:inline-flex; gap:2px; background:var(--bg4); border:1px solid var(--border2); border-radius:8px; padding:2px; }
  .sim3-seg-btn { padding:4px 12px; border:none; background:none; color:var(--text3); font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; border-radius:6px; transition:all .12s; }
  .sim3-seg-btn.active { background:var(--teal-dim); color:var(--teal); }
  .sim3-pat-select { background:var(--bg4); border:1px solid var(--border2); border-radius:8px; color:var(--text2); font-family:inherit; font-size:11px; font-weight:600; padding:5px 8px; cursor:pointer; max-width:240px; }
  .sim3-end-btn { margin-left:auto; padding:6px 16px; border-radius:8px; border:1px solid var(--border2); background:var(--bg4); color:var(--text2); font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .15s; }
  .sim3-end-btn:hover { border-color:#e0a030; color:#e0a030; }

  /* stats strip */
  .sim3-stats { display:flex; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
  .sim3-stat { flex:1; min-width:96px; background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius); padding:10px 14px; }
  .sim3-stat-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--text3); margin-bottom:3px; }
  .sim3-stat-val { font-size:19px; font-weight:800; font-variant-numeric:tabular-nums; color:var(--text); }
  .sim3-stat-val.up { color:var(--teal); } .sim3-stat-val.down { color:#ff5f8f; }

  /* main grid */
  .sim3-grid { display:grid; grid-template-columns:1fr 340px; gap:14px; margin-bottom:14px; align-items:stretch; }
  @media(max-width:900px){ .sim3-grid { grid-template-columns:1fr; } }

  /* chart card */
  .sim3-chart-card { background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; display:flex; flex-direction:column; min-width:0; position:relative; }
  .sim3-topbar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px 12px; padding:8px 12px; border-bottom:1px solid var(--border); }
  .sim3-topL { display:flex; align-items:center; gap:10px; min-width:0; flex-wrap:wrap; }
  .sim3-sym { font-size:12px; font-weight:700; color:var(--text); white-space:nowrap; }
  .sim3-tf-group { display:inline-flex; gap:2px; background:var(--bg4); border:1px solid var(--border2); border-radius:8px; padding:2px; }
  .sim3-tf-btn { padding:2px 9px; border:none; background:none; color:var(--text3); font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; border-radius:6px; }
  .sim3-tf-btn.active { background:var(--teal-dim); color:var(--teal); }
  .sim3-topR { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .sim3-price { font-size:15px; font-weight:800; font-variant-numeric:tabular-nums; color:var(--text); }
  .sim3-badge { font-size:9.5px; font-weight:800; letter-spacing:1px; padding:2px 9px; border-radius:9px; border:1px solid var(--border2); color:var(--text3); }
  .sim3-badge.live { border-color:var(--teal); color:var(--teal); background:var(--teal-dim); animation:sim3Pulse 1.6s infinite; }
  .sim3-badge.paused { border-color:#e0a030; color:#e0a030; background:rgba(224,160,48,.08); }
  .sim3-badge.ended { border-color:var(--border2); color:var(--text3); }
  @keyframes sim3Pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
  .sim3-countdown { font-size:10px; color:var(--text3); font-variant-numeric:tabular-nums; }
  .sim3-transport { display:flex; align-items:center; gap:6px; }
  .sim3-tr-btn { display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:8px; border:1px solid var(--border2); background:var(--bg4); color:var(--text2); font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .12s; }
  .sim3-tr-btn:hover { border-color:var(--teal); color:var(--teal); }
  .sim3-tr-btn svg { width:11px; height:11px; }
  #sim3-chart-el { width:100%; flex:1 1 auto; min-height:460px; }
  .sim3-toast { position:absolute; left:50%; bottom:14px; transform:translateX(-50%) translateY(8px); background:var(--bg4); border:1px solid var(--teal); color:var(--text); font-size:11.5px; font-weight:600; padding:7px 14px; border-radius:9px; opacity:0; pointer-events:none; transition:opacity .18s, transform .18s; z-index:50; white-space:nowrap; }
  .sim3-toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
  .sim3-toast.warn { border-color:#e0a030; color:#ffcf87; }

  /* ── order terminal ── */
  .sim3-term { background:var(--bg2); border:1px solid var(--border2); border-radius:var(--radius-lg); overflow:hidden; display:flex; flex-direction:column; }
  .sim3-acct-row { display:flex; border-bottom:1px solid var(--border2); }
  .sim3-acct-cell { flex:1; padding:8px 12px; display:flex; flex-direction:column; gap:2px; border-right:1px solid var(--border); }
  .sim3-acct-cell:last-child { border-right:none; }
  .sim3-acct-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--text3); }
  .sim3-acct-val { font-size:12.5px; font-weight:800; color:var(--text2); font-variant-numeric:tabular-nums; }

  .sim3-type-tabs { display:flex; border-bottom:1px solid var(--border2); }
  .sim3-type-tab { flex:1; padding:9px 4px; border:none; background:none; color:var(--text3); font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; text-transform:uppercase; letter-spacing:.5px; border-bottom:2px solid transparent; transition:all .12s; }
  .sim3-type-tab.active { color:var(--text); border-bottom-color:var(--teal); }

  .sim3-side-row { display:flex; gap:8px; padding:12px 14px 4px; }
  .sim3-side-btn { flex:1; padding:10px 6px; border-radius:9px; border:1px solid var(--border2); background:var(--bg4); font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; letter-spacing:.5px; text-transform:uppercase; transition:all .12s; color:var(--text3); }
  .sim3-side-btn.buy.active  { background:rgba(0,212,212,.16); border-color:var(--teal); color:var(--teal); }
  .sim3-side-btn.sell.active { background:rgba(255,46,136,.14); border-color:#ff2e88; color:#ff5f8f; }

  .sim3-fields { padding:4px 14px 0; }
  .sim3-frow { padding:9px 0 2px; }
  .sim3-flbl { display:flex; justify-content:space-between; align-items:baseline; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:var(--text3); margin-bottom:5px; }
  .sim3-flbl .hint { font-weight:600; text-transform:none; letter-spacing:0; color:var(--text3); font-size:10px; }
  .sim3-input-row { display:flex; gap:6px; }
  .sim3-input { width:100%; background:var(--bg4); border:1px solid var(--border2); border-radius:var(--radius); color:var(--text); font-family:inherit; font-size:14px; font-weight:700; padding:8px 10px; outline:none; transition:border-color .15s; min-width:0; }
  .sim3-input:focus { border-color:var(--teal); }
  .sim3-chip { padding:4px 9px; border-radius:8px; border:1px solid var(--border2); background:var(--bg4); color:var(--text3); font-size:10px; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; transition:all .12s; }
  .sim3-chip:hover { border-color:var(--teal); color:var(--teal); }
  .sim3-chips { display:flex; gap:5px; margin-top:6px; flex-wrap:wrap; }

  .sim3-lev-row { padding:10px 14px 2px; }
  .sim3-lev-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px; }
  .sim3-lev-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:var(--text3); }
  .sim3-lev-val { font-size:13px; font-weight:800; color:var(--text); }
  .sim3-slider { -webkit-appearance:none; width:100%; height:4px; border-radius:2px; background:var(--border2); outline:none; cursor:pointer; }
  .sim3-slider::-webkit-slider-thumb { -webkit-appearance:none; width:15px; height:15px; border-radius:50%; background:var(--teal); box-shadow:0 0 6px rgba(0,212,212,.4); }

  .sim3-est { padding:10px 14px 2px; }
  .sim3-est-row { display:flex; justify-content:space-between; padding:2.5px 0; font-size:11px; }
  .sim3-est-lbl { color:var(--text3); }
  .sim3-est-val { color:var(--text2); font-weight:700; font-variant-numeric:tabular-nums; }
  .sim3-est-val.gold { color:#e0a030; }

  .sim3-submit-wrap { padding:12px 14px 14px; }
  .sim3-submit { width:100%; padding:12px; border:none; border-radius:10px; font-size:13.5px; font-weight:900; cursor:pointer; font-family:inherit; letter-spacing:.5px; text-transform:uppercase; transition:all .15s; }
  .sim3-submit.buy  { background:var(--teal); color:#03211f; }
  .sim3-submit.sell { background:#ff2e88; color:#2b0313; }
  .sim3-submit:hover { filter:brightness(1.1); }
  .sim3-submit:disabled { opacity:.4; cursor:not-allowed; }

  /* position card */
  .sim3-pos { border-top:1px solid var(--border2); padding:11px 14px 13px; }
  .sim3-pos-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:7px; }
  .sim3-pos-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--text3); }
  .sim3-pos-side { font-size:10px; font-weight:800; letter-spacing:.6px; padding:2px 9px; border-radius:9px; }
  .sim3-pos-side.long  { background:rgba(0,212,212,.14); color:var(--teal); border:1px solid rgba(0,212,212,.35); }
  .sim3-pos-side.short { background:rgba(255,46,136,.12); color:#ff5f8f; border:1px solid rgba(255,46,136,.35); }
  .sim3-pos-grid { display:grid; grid-template-columns:1fr 1fr; gap:3px 14px; margin-bottom:8px; }
  .sim3-pos-kv { display:flex; justify-content:space-between; font-size:11px; padding:2px 0; }
  .sim3-pos-k { color:var(--text3); } .sim3-pos-v { color:var(--text2); font-weight:700; font-variant-numeric:tabular-nums; }
  .sim3-pos-pnl { font-size:17px; font-weight:900; font-variant-numeric:tabular-nums; }
  .sim3-pos-roe { font-size:11px; font-weight:700; margin-left:7px; }
  .sim3-pos-sltp { display:flex; gap:6px; margin:7px 0 8px; }
  .sim3-pos-sltp .sim3-input { font-size:12px; padding:6px 8px; }
  .sim3-apply-btn { padding:6px 12px; border-radius:8px; border:1px solid var(--border2); background:var(--bg4); color:var(--text2); font-size:10.5px; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; }
  .sim3-apply-btn:hover { border-color:var(--teal); color:var(--teal); }
  .sim3-close-row { display:flex; gap:6px; }
  .sim3-close-btn { flex:1; padding:7px 4px; border-radius:8px; border:1px solid var(--border2); background:var(--bg4); color:var(--text2); font-size:10.5px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .12s; }
  .sim3-close-btn:hover { border-color:#ff2e88; color:#ff5f8f; }
  .sim3-flat { font-size:11px; color:var(--text3); text-align:center; padding:6px 0 2px; }

  /* open orders */
  .sim3-orders { border-top:1px solid var(--border2); padding:9px 14px 12px; }
  .sim3-ord-row { display:flex; align-items:center; gap:8px; font-size:10.5px; padding:4px 0; border-bottom:1px dashed var(--border); font-variant-numeric:tabular-nums; }
  .sim3-ord-row:last-child { border-bottom:none; }
  .sim3-ord-type { font-weight:800; text-transform:uppercase; font-size:9px; letter-spacing:.5px; color:var(--text3); width:38px; }
  .sim3-ord-side { font-weight:800; width:34px; } .sim3-ord-side.buy{color:var(--teal);} .sim3-ord-side.sell{color:#ff5f8f;}
  .sim3-ord-px { color:var(--text2); font-weight:700; }
  .sim3-ord-qty { color:var(--text3); margin-left:auto; }
  .sim3-ord-x { background:none; border:none; color:var(--text3); cursor:pointer; font-size:13px; padding:0 2px; font-family:inherit; }
  .sim3-ord-x:hover { color:#ff5f8f; }

  /* lower grid */
  .sim3-lower { display:grid; grid-template-columns:1fr 1.2fr; gap:14px; margin-bottom:14px; align-items:stretch; }
  @media(max-width:900px){ .sim3-lower { grid-template-columns:1fr; } }
  .sim3-panel { background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; display:flex; flex-direction:column; }
  .sim3-panel-top { display:flex; align-items:center; justify-content:space-between; padding:8px 14px; border-bottom:1px solid var(--border); font-size:12px; font-weight:700; color:var(--text2); }
  .sim3-panel-meta { font-size:10px; font-weight:600; color:var(--text3); }
  #sim3-eq-el { width:100%; flex:1 1 auto; min-height:180px; }
  .sim3-blot-head, .sim3-blot-row { display:grid; grid-template-columns:.9fr .55fr .9fr 1.4fr .8fr .9fr; gap:6px; align-items:center; padding:5px 14px; }
  .sim3-blot-head { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text3); border-bottom:1px solid var(--border); }
  .sim3-blot-body { flex:1 1 auto; max-height:190px; overflow-y:auto; scrollbar-width:thin; }
  .sim3-blot-row { font-size:10.5px; border-bottom:1px solid var(--border); font-variant-numeric:tabular-nums; color:var(--text3); }
  .sim3-blot-row:last-child { border-bottom:none; }
  .sim3-blot-side { font-weight:800; } .sim3-blot-side.long{color:var(--teal);} .sim3-blot-side.short{color:#ff5f8f;}
  .sim3-blot-pnl { font-weight:800; text-align:right; } .sim3-blot-pnl.pos{color:var(--teal);} .sim3-blot-pnl.neg{color:#ff5f8f;}
  .sim3-blot-empty { padding:22px 14px; text-align:center; font-size:11px; color:var(--text3); }
  .sim3-blot-fees { text-align:right; }

  /* verdict */
  .sim3-verdict { border-radius:var(--radius-lg); padding:18px 20px; margin-bottom:14px; border-left:4px solid; animation:sim3In .3s ease; background:var(--bg3); }
  .sim3-verdict.win { border-color:var(--teal); } .sim3-verdict.loss { border-color:#ff2e88; } .sim3-verdict.flat { border-color:var(--border2); }
  @keyframes sim3In { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  .sim3-verd-top { display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; margin-bottom:8px; }
  .sim3-verd-pnl { font-size:24px; font-weight:900; font-variant-numeric:tabular-nums; }
  .sim3-verd-meta { font-size:11.5px; color:var(--text3); }
  .sim3-verd-pattern { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--teal); margin:6px 0 4px; }
  .sim3-verd-blurb { font-size:12.5px; color:var(--text2); line-height:1.6; }
  .sim3-verd-coach { display:flex; gap:7px; font-size:12.5px; color:var(--text2); line-height:1.55; margin-top:10px; padding-top:10px; border-top:1px dashed var(--border2); }
  .sim3-verd-stats { display:flex; gap:18px; margin-top:10px; flex-wrap:wrap; font-size:11.5px; color:var(--text3); }
  .sim3-verd-stats strong { color:var(--text); }
  .sim3-new-btn { width:100%; padding:13px; background:var(--teal); border:none; border-radius:10px; color:#03211f; font-size:14px; font-weight:800; cursor:pointer; font-family:inherit; margin-bottom:14px; }
  .sim3-new-btn:hover { filter:brightness(1.08); }

  .sim3-reset-row { display:flex; justify-content:flex-end; }
  .sim3-reset-btn { background:transparent; border:1px solid var(--border2); color:var(--text3); font-size:11px; padding:5px 14px; border-radius:10px; cursor:pointer; font-family:inherit; }
  .sim3-reset-btn:hover { border-color:#ff2e88; color:#ff5f8f; }

  @media(max-width:600px) {
    #sim3-chart-el { min-height:320px; }
    .sim3-sym { display:none; }
    .sim3-stat { flex:1 1 calc(50% - 5px); min-width:0; }
    .sim3-end-btn { margin-left:0; }
  }
  `);
}

const _icoPlay  = () => '<svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M8 5v14l11-7z"/></svg>';
const _icoPause = () => '<svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';

/* ── CHART ───────────────────────────────────────────────────────────────── */
function _chartData() {
  const ohlc = S.live.ohlc.slice(-SIM_WINDOW);
  const vols = S.live.vols.slice(-SIM_WINDOW);
  const labels = S.live.labels.slice(-SIM_WINDOW);
  if (S.forming) {
    ohlc.push([+S.forming.o.toFixed(2), +S.forming.c.toFixed(2), +S.forming.l.toFixed(2), +S.forming.h.toFixed(2)]);
    vols.push(+S.forming.vol.toFixed(1));
    labels.push(_labelFor(S.live.ohlc.length));
  }
  return { ohlc, vols, labels };
}

function _renderChart() {
  const el = _el('sim3-chart-el');
  if (!el || !S) return;
  if (_simChart) { try { _simChart.dispose(); } catch(_) {} }
  const TEAL = _bc(), BEAR = _bear();
  const cs = getComputedStyle(document.documentElement);
  const bg3 = (cs.getPropertyValue('--bg3') || '#0f0f0f').trim();
  const bdr = (cs.getPropertyValue('--border') || '#1e1e1e').trim();
  const { ohlc, vols, labels } = _chartData();

  _simChart = echarts.init(el, null, { renderer: 'canvas' });
  _simChart.setOption({
    backgroundColor: bg3, animation: false,
    axisPointer: { link: [{ xAxisIndex: [0, 1] }] },
    grid: [
      { left: SIM_GRID.left, right: SIM_GRID.right, top: SIM_GRID.top, height: '62%' },
      { left: SIM_GRID.left, right: SIM_GRID.right, top: '74%', height: '16%' }
    ],
    xAxis: [
      { type: 'category', data: labels, gridIndex: 0, axisLine: { lineStyle: { color: bdr } }, axisLabel: { show: false }, splitLine: { show: false }, axisTick: { show: false } },
      { type: 'category', data: labels, gridIndex: 1, axisLine: { lineStyle: { color: bdr } }, axisLabel: { color: '#777', fontSize: 9, fontFamily: 'Geist Mono,monospace', hideOverlap: true }, splitLine: { show: false } }
    ],
    yAxis: [
      { scale: true, gridIndex: 0, position: 'left',
        splitLine: { lineStyle: { color: bdr, type: 'dashed' } }, axisLine: { lineStyle: { color: bdr } },
        axisLabel: { color: '#888', fontSize: 10, fontFamily: 'Geist Mono,monospace' } },
      { scale: true, gridIndex: 1, position: 'left', splitNumber: 2,
        splitLine: { show: false }, axisLine: { lineStyle: { color: bdr } },
        axisLabel: { color: '#666', fontSize: 8, formatter: v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v } }
    ],
    series: [
      { name: 'Price', type: 'candlestick', data: ohlc, xAxisIndex: 0, yAxisIndex: 0, barMaxWidth: 16,
        itemStyle: { color: 'transparent', color0: BEAR, borderColor: TEAL, borderColor0: BEAR, borderWidth: 1.4 },
        markLine: { symbol: ['none','none'], silent: true, data: (S.market ? [
          [{ yAxis: S.market.keyLevel, label: { show: true, formatter: 'Key Level', color: '#8a8f98', fontSize: 10, position: 'insideStartTop' }, lineStyle: { color: '#8a8f98', type: 'dashed', width: 1, opacity: .55 } }, { yAxis: S.market.keyLevel }]
        ] : []) } },
      { name: 'Vol', type: 'bar', data: vols.map((v, i) => ({ value: v, itemStyle: { color: (ohlc[i] && ohlc[i][1] >= ohlc[i][0]) ? TEAL + '55' : BEAR + '44' } })), xAxisIndex: 1, yAxisIndex: 1, barMaxWidth: 16 }
    ]
  });
  _drawLines();
  if (_simChartRO) { try { _simChartRO.disconnect(); } catch(_) {} }
  _simChartRO = new ResizeObserver(() => { try { if (_simChart) { _simChart.resize(); _drawLines(); } } catch(_) {} });
  _simChartRO.observe(el);
}

/* Per-tick incremental paint — data + lines only, no full re-init. */
function _paintTick() {
  if (!_simChart) return;
  const TEAL = _bc(), BEAR = _bear();
  const { ohlc, vols, labels } = _chartData();
  _simChart.setOption({
    xAxis: [{ data: labels }, { data: labels }],
    series: [
      { data: ohlc },
      { data: vols.map((v, i) => ({ value: v, itemStyle: { color: (ohlc[i] && ohlc[i][1] >= ohlc[i][0]) ? TEAL + '55' : BEAR + '44' } })) }
    ]
  });
  _drawLines();
  _paintHeader();
  _paintPosition(true);   // light: just the live numbers
  _paintAccount();
}

/* ── price/order/position line overlays (draggable SL/TP + orders) ───────── */
function _drawLines() {
  if (!_simChart || !S) return;
  const chart = _simChart;
  const W = chart.getWidth();
  const tagW = 88, tagH = 17, pad = 5;
  const tagX = W - tagW - 4;
  const lineX2 = W - SIM_GRID.right;
  const x1 = SIM_GRID.left;
  const toY   = px => { try { return chart.convertToPixel({ gridIndex: 0, yAxisIndex: 0 }, px); } catch(_) { return null; } };
  const fromY = y  => { try { return chart.convertFromPixel({ gridIndex: 0, yAxisIndex: 0 }, y); } catch(_) { return null; } };
  const priceGridTop = SIM_GRID.top, priceGridBot = chart.getHeight() * 0.62 + SIM_GRID.top;
  const inGrid = y => y != null && !isNaN(y) && y > priceGridTop - 1 && y < priceGridBot + 8;
  const fmt = p => Math.round(p).toLocaleString();
  const TEAL = _bc();
  const g = [];

  const line = (id, price, color, label, draggable, onMove, solidTag) => {
    const y = toY(price);
    if (!inGrid(y)) return null;
    return {
      type: 'group', id, z: 100, x: 0, y,
      draggable: draggable ? 'vertical' : false,
      cursor: draggable ? 'ns-resize' : 'default',
      ondrag: draggable ? function() {
        this.x = 0;
        const p = fromY(this.y);
        if (p == null || isNaN(p) || p <= 0) return;
        const t = this.childOfName ? this.childOfName('t') : null;
        if (t) t.setStyle({ text: label + ' ' + fmt(p) });
      } : undefined,
      ondragend: draggable ? function() {
        this.x = 0;
        const p = fromY(this.y);
        if (p != null && !isNaN(p) && p > 0 && typeof onMove === 'function') onMove(p);
      } : undefined,
      children: [
        { type: 'line', silent: !draggable, shape: { x1, y1: 0, x2: lineX2, y2: 0 }, style: { stroke: 'transparent', lineWidth: draggable ? 14 : 1 }, cursor: draggable ? 'ns-resize' : 'default' },
        { type: 'line', silent: true, shape: { x1, y1: 0, x2: lineX2, y2: 0 }, style: { stroke: color, lineWidth: 1.3, lineDash: [5, 4] } },
        { type: 'rect', silent: !draggable, shape: { x: tagX, y: -tagH/2, width: tagW, height: tagH, r: 3 }, style: { fill: solidTag ? color : 'rgba(14,14,18,.95)', stroke: color, lineWidth: solidTag ? 0 : 1 }, cursor: draggable ? 'ns-resize' : 'default' },
        { type: 'text', name: 't', silent: true, style: { text: label + ' ' + fmt(price), x: tagX + pad, y: -6, fill: solidTag ? '#0b0b0b' : '#e8ebf0', font: '700 10px "Geist Mono",monospace' } }
      ]
    };
  };

  // last price (always)
  const lp = line('sim3-l-last', S.price, S.pos ? (_uPnL(S.pos, S.price) >= 0 ? TEAL : '#ff2e88') : '#aeb4c0', '▸', false, null, true);
  if (lp) g.push(lp);

  if (S.pos) {
    const e = line('sim3-l-entry', S.pos.entry, '#aeb4c0', 'Entry', false, null, false);
    if (e) g.push(e);
    const lq = line('sim3-l-liq', S.pos.liq, '#e0a030', 'Liq', false, null, false);
    if (lq) g.push(lq);
    if (S.pos.sl > 0) {
      const sl = line('sim3-l-sl', S.pos.sl, '#ff2e88', 'SL', !S.ended, p => {
        const long = S.pos.side === 'long';
        if (long ? p >= S.price : p <= S.price) { _toast('SL must stay on the loss side', true); _drawLines(); return; }
        S.pos.sl = +p.toFixed(2);
        const el = _el('sim3-pos-sl'); if (el) el.value = Math.round(p);
        _toast('SL moved to ' + _fmtPx(p)); _drawLines();
      }, false);
      if (sl) g.push(sl);
    }
    if (S.pos.tp > 0) {
      const tp = line('sim3-l-tp', S.pos.tp, TEAL, 'TP', !S.ended, p => {
        const long = S.pos.side === 'long';
        if (long ? p <= S.price : p >= S.price) { _toast('TP must stay on the profit side', true); _drawLines(); return; }
        S.pos.tp = +p.toFixed(2);
        const el = _el('sim3-pos-tp'); if (el) el.value = Math.round(p);
        _toast('TP moved to ' + _fmtPx(p)); _drawLines();
      }, false);
      if (tp) g.push(tp);
    }
  }
  for (const o of S.orders) {
    const col = o.side === 'buy' ? TEAL : '#ff2e88';
    const ln = line('sim3-l-o' + o.id, o.px, col, (o.type === 'limit' ? 'LMT' : 'STP'), !S.ended, p => {
      o.px = +p.toFixed(2);                                  // qty keeps its BTC size
      _toast((o.type === 'limit' ? 'Limit' : 'Stop') + ' moved to ' + _fmtPx(p));
      _paintOrders(); _drawLines();
    }, false);
    if (ln) g.push(ln);
  }
  try { chart.setOption({ graphic: g }, { replaceMerge: ['graphic'] }); } catch(_) {}
}

/* ── PANEL PAINTERS ──────────────────────────────────────────────────────── */
function _paintHeader() {
  const pxEl = _el('sim3-price-el');
  if (pxEl) {
    pxEl.textContent = _fmtPx(S.price);
    const prev = +pxEl.dataset.prev || S.price;
    pxEl.style.color = S.price > prev ? _bc() : S.price < prev ? '#ff5f8f' : 'var(--text)';
    pxEl.dataset.prev = S.price;
  }
  // candle countdown (real seconds until the forming view candle closes)
  const cEl = _el('sim3-countdown');
  if (cEl) {
    const ticksPerView = SIM_TPB * S.factor;
    const done = (S.baseIdx % S.factor) * SIM_TPB + S.tickIdx;
    const rem = Math.max(0, ticksPerView - done);
    const secs = Math.ceil(rem * SIM_SPEEDS[S.speedIdx].ms / 1000);
    cEl.textContent = S.playing ? ('candle closes ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0')) : '';
  }
}

function _paintAccount() {
  const eq = _equity();
  _setTxt('sim3-acct-eq',   _fmtUsd(eq));
  _setTxt('sim3-acct-used', _fmtUsd(_usedMargin()));
  _setTxt('sim3-acct-free', _fmtUsd(_freeMargin()));
  const st = _el('sim3-stat-balance'); if (st) { st.textContent = _fmtUsd(A.balance, 0); }
  const sp = _el('sim3-stat-session');
  if (sp) {
    const d = eq - S.startBal;
    sp.textContent = (d >= 0 ? '+' : '') + _fmtUsd(d, 2).replace('$-','-$');
    sp.className = 'sim3-stat-val ' + (d >= 0 ? 'up' : 'down');
  }
  const wr = _el('sim3-stat-wr');
  if (wr) { const w = A.trades ? Math.round(A.wins / A.trades * 100) : 0; wr.textContent = w + '%'; wr.className = 'sim3-stat-val' + (A.trades ? (w >= 50 ? ' up' : ' down') : ''); }
  _setTxt('sim3-stat-trades', String(A.trades));
}

function _paintPosition(lightOnly) {
  const box = _el('sim3-pos-box');
  if (!box) return;
  if (!S.pos) {
    box.innerHTML = '<div class="sim3-pos-head"><span class="sim3-pos-title">Position</span></div><div class="sim3-flat">No open position</div>';
    return;
  }
  const p = S.pos;
  const u = _uPnL(p, S.price);
  const roe = p.margin > 0 ? u / p.margin * 100 : 0;
  const col = u >= 0 ? _bc() : '#ff5f8f';
  if (lightOnly && _el('sim3-pos-upnl')) {
    const el = _el('sim3-pos-upnl');
    el.textContent = (u >= 0 ? '+' : '') + _fmtUsd(u).replace('$-','-$');
    el.style.color = col;
    const r = _el('sim3-pos-roe'); if (r) { r.textContent = (roe >= 0 ? '+' : '') + roe.toFixed(1) + '%'; r.style.color = col; }
    const mk = _el('sim3-pos-mark'); if (mk) mk.textContent = _fmtPx(S.price);
    return;
  }
  box.innerHTML = `
    <div class="sim3-pos-head">
      <span class="sim3-pos-title">Position</span>
      <span class="sim3-pos-side ${p.side}">${p.side.toUpperCase()} ${p.lev.toFixed(0)}×</span>
    </div>
    <div style="margin-bottom:6px;">
      <span class="sim3-pos-pnl" id="sim3-pos-upnl" style="color:${col}">${(u>=0?'+':'')+_fmtUsd(u).replace('$-','-$')}</span>
      <span class="sim3-pos-roe" id="sim3-pos-roe" style="color:${col}">${(roe>=0?'+':'')+roe.toFixed(1)}%</span>
    </div>
    <div class="sim3-pos-grid">
      <div class="sim3-pos-kv"><span class="sim3-pos-k">Size</span><span class="sim3-pos-v">${_fmtQty(p.qty)} BTC</span></div>
      <div class="sim3-pos-kv"><span class="sim3-pos-k">Entry</span><span class="sim3-pos-v">${_fmtPx(p.entry)}</span></div>
      <div class="sim3-pos-kv"><span class="sim3-pos-k">Mark</span><span class="sim3-pos-v" id="sim3-pos-mark">${_fmtPx(S.price)}</span></div>
      <div class="sim3-pos-kv"><span class="sim3-pos-k">Liq</span><span class="sim3-pos-v" style="color:#e0a030">${_fmtPx(p.liq)}</span></div>
      <div class="sim3-pos-kv"><span class="sim3-pos-k">Margin</span><span class="sim3-pos-v">${_fmtUsd(p.margin)}</span></div>
      <div class="sim3-pos-kv"><span class="sim3-pos-k">Fees</span><span class="sim3-pos-v">${_fmtUsd(p.fees)}</span></div>
    </div>
    <div class="sim3-pos-sltp">
      <input class="sim3-input" id="sim3-pos-sl" type="number" placeholder="SL price" value="${p.sl > 0 ? Math.round(p.sl) : ''}" />
      <input class="sim3-input" id="sim3-pos-tp" type="number" placeholder="TP price" value="${p.tp > 0 ? Math.round(p.tp) : ''}" />
      <button class="sim3-apply-btn" onclick="_sim3ApplySlTp()">Set</button>
    </div>
    <div class="sim3-close-row">
      <button class="sim3-close-btn" onclick="_sim3ClosePct(25)">Close 25%</button>
      <button class="sim3-close-btn" onclick="_sim3ClosePct(50)">Close 50%</button>
      <button class="sim3-close-btn" onclick="_sim3ClosePct(100)">Close All</button>
    </div>`;
}

function _paintOrders() {
  const box = _el('sim3-orders-box');
  if (!box) return;
  if (!S.orders.length) { box.innerHTML = ''; box.style.display = 'none'; return; }
  box.style.display = '';
  box.innerHTML = '<div class="sim3-pos-title" style="margin-bottom:5px;">Open Orders</div>' + S.orders.map(o => `
    <div class="sim3-ord-row">
      <span class="sim3-ord-type">${o.type === 'limit' ? 'LMT' : 'STP'}</span>
      <span class="sim3-ord-side ${o.side}">${o.side.toUpperCase()}</span>
      <span class="sim3-ord-px">${_fmtPx(o.px)}</span>
      <span class="sim3-ord-qty">${_fmtQty(o.qty)} BTC</span>
      <button class="sim3-ord-x" onclick="_sim3Cancel(${o.id})" title="Cancel">×</button>
    </div>`).join('');
}

function _paintOrderPanel(retab) {
  const side = S.uiSide || 'buy', type = S.uiType || 'market';
  if (retab) {
    document.querySelectorAll('.sim3-side-btn').forEach(b => b.classList.toggle('active', b.dataset.side === side));
    document.querySelectorAll('.sim3-type-tab').forEach(b => b.classList.toggle('active', b.dataset.type === type));
    const pxRow = _el('sim3-px-row');
    if (pxRow) pxRow.style.display = type === 'market' ? 'none' : '';
    const pxLbl = _el('sim3-px-lbl');
    if (pxLbl) pxLbl.textContent = type === 'stop' ? 'Trigger Price' : 'Limit Price';
    const sub = _el('sim3-submit');
    if (sub) {
      sub.className = 'sim3-submit ' + side;
      sub.textContent = (side === 'buy' ? 'Buy / Long' : 'Sell / Short') + (type === 'market' ? ' · Market' : type === 'limit' ? ' · Limit' : ' · Stop');
    }
  }
  // estimates
  const usd = parseFloat(_el('sim3-size')?.value || 0);
  const lev = parseFloat(_el('sim3-lev')?.value || 1);
  _setTxt('sim3-lev-val', lev.toFixed(0) + '×');
  const refPx = (type === 'market' ? S.price : (parseFloat(_el('sim3-px')?.value || 0) || S.price));
  const qty = refPx > 0 ? usd / refPx : 0;
  const margin = usd / lev;
  const feeRate = type === 'limit' ? SIM_MAKER : SIM_TAKER;
  const liq = qty > 0 ? _liqPx(side === 'buy' ? 'long' : 'short', refPx, lev) : 0;
  _setTxt('sim3-est-qty', qty > 0 ? _fmtQty(qty) + ' BTC' : '—');
  _setTxt('sim3-est-margin', usd > 0 ? _fmtUsd(margin) : '—');
  _setTxt('sim3-est-fee', usd > 0 ? _fmtUsd(usd * feeRate) + ' (' + (feeRate * 100).toFixed(3) + '%)' : '—');
  _setTxt('sim3-est-liq', qty > 0 && lev > 1 ? _fmtPx(liq) : '—');
  const sub = _el('sim3-submit');
  if (sub) sub.disabled = S.ended || !(usd >= SIM_MIN_USD) || !Number.isFinite(usd) || margin > _freeMargin() + 1e-9;
  const warn = _el('sim3-size-hint');
  if (warn) warn.textContent =
    usd > 0 && usd < SIM_MIN_USD ? 'min $' + SIM_MIN_USD
    : usd > 0 && margin > _freeMargin() + 1e-9 ? 'exceeds free margin' : '';
}

function _paintEquity() {
  const el = _el('sim3-eq-el');
  if (!el) return;
  if (_simEqChart) { try { _simEqChart.dispose(); } catch(_) {} }
  const h = A.history.length ? A.history : [1000];
  const up = A.balance >= (h[0] || 1000);
  const color = up ? _bc() : '#ff2e88';
  _simEqChart = echarts.init(el, null, { renderer: 'canvas' });
  _simEqChart.setOption({
    backgroundColor: 'transparent', animation: false,
    grid: { left: 52, right: 12, top: 10, bottom: 20 },
    xAxis: { type: 'category', data: h.map((_, i) => i ? 'T' + i : 'Start'), axisLabel: { color: '#555', fontSize: 9 }, axisLine: { lineStyle: { color: '#1e1e1e' } } },
    yAxis: { scale: true, splitLine: { lineStyle: { color: '#1e1e1e', type: 'dashed' } }, axisLabel: { color: '#555', fontSize: 9, formatter: v => '$' + (+v).toFixed(0) } },
    series: [{ type: 'line', data: h, smooth: true, symbol: 'none', lineStyle: { color, width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '3a' }, { offset: 1, color: color + '06' }] } } }]
  });
  if (_simEqRO) { try { _simEqRO.disconnect(); } catch(_) {} }
  _simEqRO = new ResizeObserver(() => { try { _simEqChart && _simEqChart.resize(); } catch(_) {} });
  _simEqRO.observe(el);
}

function _paintBlotter() {
  const body = _el('sim3-blot-body');
  if (!body) return;
  const rows = [];
  // recent fills first (session), then closed trades (account)
  for (const f of S.fills.slice(0, 12)) {
    rows.push(`<div class="sim3-blot-row">
      <span>${f.t}</span>
      <span class="sim3-blot-side ${f.side === 'buy' ? 'long' : 'short'}">${f.side.toUpperCase()}</span>
      <span>${f.type.toUpperCase()}${f.note && f.note !== f.type ? ' · ' + f.note : ''}</span>
      <span>${_fmtQty(f.qty)} @ ${_fmtPx(f.px)}</span>
      <span class="sim3-blot-fees">${_fmtUsd(f.fee)}</span>
      <span></span>
    </div>`);
  }
  for (const t of A.log.slice(0, 14)) {
    rows.push(`<div class="sim3-blot-row">
      <span>${t.t || ''}</span>
      <span class="sim3-blot-side ${t.side}">${(t.side || '').toUpperCase()}</span>
      <span>CLOSED</span>
      <span>${_fmtQty(t.qty)} · ${_fmtPx(t.entry)} → ${_fmtPx(t.exit)}</span>
      <span class="sim3-blot-fees">${_fmtUsd(t.fees)}</span>
      <span class="sim3-blot-pnl ${t.pnl >= 0 ? 'pos' : 'neg'}">${(t.pnl >= 0 ? '+' : '') + _fmtUsd(t.pnl).replace('$-','-$')}</span>
    </div>`);
  }
  body.innerHTML = rows.length ? rows.join('') : '<div class="sim3-blot-empty">No activity yet — fills and closed trades land here.</div>';
}

function _paintAll() {
  _paintHeader(); _paintAccount(); _paintPosition(); _paintOrders(); _paintOrderPanel(true); _paintEquity(); _paintBlotter();
}

/* ── VERDICT ─────────────────────────────────────────────────────────────── */
function _maxDrawdown(hist) {
  let peak = -Infinity, dd = 0;
  for (const v of hist) { peak = Math.max(peak, v); if (peak > 0) dd = Math.max(dd, (peak - v) / peak); }
  return dd * 100;
}

function _showVerdict() {
  const concept = SIM_CONCEPTS[S.market.pattern] || { name: S.market.pattern, bias: 'neutral', blurb: '', course: '' };
  const pnl = A.balance - S.startBal;
  const win = pnl > 0;
  const cls = Math.abs(pnl) < 0.01 ? 'flat' : win ? 'win' : 'loss';
  const badge = _el('sim3-live-badge');
  if (badge) { badge.className = 'sim3-badge ended'; badge.textContent = 'SESSION ENDED'; }

  const gross = pnl + S.feesPaid;
  const biasWord = concept.bias === 'neutral' ? 'NEUTRAL — the test was patience, not direction'
                 : concept.bias.toUpperCase();
  const outcomeLine = S.market.outcome === 'fail'
    ? 'This one was a trap round — the textbook setup failed. '
    : '';
  const wrap = document.createElement('div');
  wrap.id = 'sim3-verdict';
  wrap.innerHTML = `
    <div class="sim3-verdict ${cls}">
      <div class="sim3-verd-top">
        <span class="sim3-verd-pnl" style="color:${pnl >= 0 ? _bc() : '#ff5f8f'}">${(pnl >= 0 ? '+' : '') + _fmtUsd(pnl).replace('$-','-$')}</span>
        <span class="sim3-verd-meta">session net · gross ${(gross >= 0 ? '+' : '') + _fmtUsd(gross).replace('$-','-$')} · fees ${_fmtUsd(S.feesPaid)}</span>
      </div>
      <div class="sim3-verd-pattern">${concept.name} · ${concept.course}</div>
      <div class="sim3-verd-blurb">${outcomeLine}${concept.blurb}</div>
      <div class="sim3-verd-coach">
        <span>Textbook bias for this market: <strong>${biasWord}</strong>.
        ${S.feesPaid > Math.abs(gross) && S.feesPaid > 1 ? ' Your fees outweighed the edge — fewer, better-placed orders.' : ''}</span>
      </div>
      <div class="sim3-verd-stats">
        <span>Balance <strong>${_fmtUsd(A.balance, 0)}</strong></span>
        <span>Win rate <strong>${A.trades ? Math.round(A.wins / A.trades * 100) : 0}%</strong></span>
        <span>Trades <strong>${A.trades}</strong></span>
        <span>Max DD <strong>${_maxDrawdown(A.history).toFixed(1)}%</strong></span>
        <span>Sessions <strong>${A.sessions}</strong></span>
      </div>
    </div>
    <button class="sim3-new-btn" onclick="_sim3New()">New Session →</button>`;
  const grid = document.querySelector('.sim3-grid');
  const existing = _el('sim3-verdict');
  if (existing) existing.remove();
  if (grid) grid.after(wrap);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { wrap.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); } catch(_) {}
}

/* ── RENDER ──────────────────────────────────────────────────────────────── */
function renderSimulator(containerId, opts) {
  _simStyles();
  _simOpts = opts || {};
  ltSimTeardown();
  _simLockedPattern = _simOpts.pattern || null;
  A = simLoadAccount();
  _newSession();

  const container = document.getElementById(containerId);
  if (!container) return;

  const byCourse = {};
  SIM_ALL_PATTERNS.forEach(k => { const c = SIM_CONCEPTS[k]; (byCourse[c.course] = byCourse[c.course] || []).push(k); });
  const patternOptions = Object.keys(byCourse).map(course =>
    `<optgroup label="${course}">` + byCourse[course].map(k =>
      `<option value="${k}"${_simLockedPattern === k ? ' selected' : ''}>${SIM_CONCEPTS[k].name.split('—')[0].trim()}</option>`).join('') + '</optgroup>').join('');
  const diff = _simDifficulty();
  const courseTag = _simOpts.label
    ? `<span style="font-size:11px;color:var(--teal);font-weight:700;background:var(--teal-faint);border:1px solid rgba(0,212,212,.25);padding:2px 10px;border-radius:10px;margin-left:8px;">Practicing: ${_simOpts.label}</span>` : '';

  container.innerHTML = `
  <div class="sim3-wrap">
    <div class="sim3-back-row">
      <button class="sim3-back-btn" onclick="typeof init==='function'&&init(false)">
        <i data-lucide="arrow-left" style="width:15px;height:15px;"></i> Back to Course
      </button>
      <div>
        <div class="sim3-heading">Practice Simulator</div><span class="sim3-beta">Live Replay</span>${courseTag}
        <div class="sim3-sub">a live market · real order types · manage the position, not the prediction</div>
      </div>
    </div>

    <div class="sim3-controls">
      <div class="sim3-ctrl-group">
        <span class="sim3-ctrl-lbl">Mode</span>
        <div class="sim3-seg">
          <button class="sim3-seg-btn ${diff === 'learn' ? 'active' : ''}" onclick="_sim2SetDifficulty('learn')">Learn</button>
          <button class="sim3-seg-btn ${diff === 'real' ? 'active' : ''}" onclick="_sim2SetDifficulty('real')">Realistic</button>
        </div>
      </div>
      <div class="sim3-ctrl-group">
        <span class="sim3-ctrl-lbl">Market</span>
        <select class="sim3-pat-select" onchange="_sim3LockPattern(this.value)" aria-label="Choose the pattern seeding this market">
          <option value="random"${!_simLockedPattern ? ' selected' : ''}>Random (blind)</option>
          ${patternOptions}
        </select>
      </div>
      <button class="sim3-end-btn" onclick="_sim3End()">End Session · Reveal Pattern</button>
    </div>

    <div class="sim3-stats">
      <div class="sim3-stat"><div class="sim3-stat-lbl">Balance</div><div class="sim3-stat-val" id="sim3-stat-balance">${_fmtUsd(A.balance, 0)}</div></div>
      <div class="sim3-stat"><div class="sim3-stat-lbl">Session P&amp;L</div><div class="sim3-stat-val" id="sim3-stat-session">+$0.00</div></div>
      <div class="sim3-stat"><div class="sim3-stat-lbl">Win Rate</div><div class="sim3-stat-val" id="sim3-stat-wr">${A.trades ? Math.round(A.wins / A.trades * 100) + '%' : '—'}</div></div>
      <div class="sim3-stat"><div class="sim3-stat-lbl">Closed Trades</div><div class="sim3-stat-val" id="sim3-stat-trades">${A.trades}</div></div>
    </div>

    <div class="sim3-grid">
      <div class="sim3-chart-card">
        <div class="sim3-topbar">
          <div class="sim3-topL">
            <span class="sim3-sym">BTC/USDT · Perp (sim)</span>
            <div class="sim3-tf-group">
              ${SIM_TIMEFRAMES.map(tf => `<button class="sim3-tf-btn ${tf === S.tf ? 'active' : ''}" data-tf="${tf}" onclick="_sim3SetTF('${tf}')">${tf.toUpperCase()}</button>`).join('')}
            </div>
          </div>
          <div class="sim3-topR">
            <span class="sim3-countdown" id="sim3-countdown"></span>
            <span class="sim3-price" id="sim3-price-el">${_fmtPx(S.price)}</span>
            <span class="sim3-badge paused" id="sim3-live-badge">PAUSED</span>
            <div class="sim3-transport">
              <button class="sim3-tr-btn" id="sim3-play" onclick="_sim3Play()">${_icoPlay()}<span>Play</span></button>
              <button class="sim3-tr-btn" onclick="_sim3Speed()" title="Playback speed"><span id="sim3-speed">${SIM_SPEEDS[S.speedIdx].label}</span></button>
            </div>
          </div>
        </div>
        <div id="sim3-chart-el"></div>
        <div class="sim3-toast" id="sim3-toast"></div>
      </div>

      <div class="sim3-term">
        <div class="sim3-acct-row">
          <div class="sim3-acct-cell"><span class="sim3-acct-lbl">Equity</span><span class="sim3-acct-val" id="sim3-acct-eq">${_fmtUsd(A.balance)}</span></div>
          <div class="sim3-acct-cell"><span class="sim3-acct-lbl">Used Margin</span><span class="sim3-acct-val" id="sim3-acct-used">$0.00</span></div>
          <div class="sim3-acct-cell"><span class="sim3-acct-lbl">Free</span><span class="sim3-acct-val" id="sim3-acct-free">${_fmtUsd(A.balance)}</span></div>
        </div>

        <div class="sim3-type-tabs">
          <button class="sim3-type-tab active" data-type="market" onclick="_sim3Type('market')">Market</button>
          <button class="sim3-type-tab" data-type="limit" onclick="_sim3Type('limit')">Limit</button>
          <button class="sim3-type-tab" data-type="stop" onclick="_sim3Type('stop')">Stop</button>
        </div>

        <div class="sim3-side-row">
          <button class="sim3-side-btn buy active" data-side="buy" onclick="_sim3Side('buy')">Long</button>
          <button class="sim3-side-btn sell" data-side="sell" onclick="_sim3Side('sell')">Short</button>
        </div>

        <div class="sim3-fields">
          <div class="sim3-frow" id="sim3-px-row" style="display:none;">
            <div class="sim3-flbl"><span id="sim3-px-lbl">Limit Price</span><span class="hint"></span></div>
            <div class="sim3-input-row">
              <input class="sim3-input" id="sim3-px" type="number" placeholder="Price" oninput="_paintOrderPanel && _paintOrderPanel()" />
              <button class="sim3-chip" onclick="_sim3UseLast()">Last</button>
            </div>
          </div>
          <div class="sim3-frow">
            <div class="sim3-flbl"><span>Order Size (USD)</span><span class="hint" id="sim3-size-hint"></span></div>
            <input class="sim3-input" id="sim3-size" type="number" placeholder="Notional in USD" oninput="_paintOrderPanel && _paintOrderPanel()" />
            <div class="sim3-chips">
              <button class="sim3-chip" onclick="_sim3SizePct(10)">10%</button>
              <button class="sim3-chip" onclick="_sim3SizePct(25)">25%</button>
              <button class="sim3-chip" onclick="_sim3SizePct(50)">50%</button>
              <button class="sim3-chip" onclick="_sim3SizePct(100)">Max</button>
            </div>
          </div>
          <div class="sim3-frow">
            <div class="sim3-flbl"><span>Attach TP / SL <span style="text-transform:none;letter-spacing:0;">(optional)</span></span></div>
            <div class="sim3-input-row">
              <input class="sim3-input" id="sim3-att-tp" type="number" placeholder="TP price" />
              <input class="sim3-input" id="sim3-att-sl" type="number" placeholder="SL price" />
            </div>
          </div>
        </div>

        <div class="sim3-lev-row">
          <div class="sim3-lev-head">
            <span class="sim3-lev-lbl">Leverage</span>
            <span class="sim3-lev-val" id="sim3-lev-val">3×</span>
          </div>
          <input type="range" class="sim3-slider" id="sim3-lev" min="1" max="${SIM_MAX_LEV}" step="1" value="3" oninput="_paintOrderPanel && _paintOrderPanel()" />
        </div>

        <div class="sim3-est">
          <div class="sim3-est-row"><span class="sim3-est-lbl">Qty</span><span class="sim3-est-val" id="sim3-est-qty">—</span></div>
          <div class="sim3-est-row"><span class="sim3-est-lbl">Margin</span><span class="sim3-est-val" id="sim3-est-margin">—</span></div>
          <div class="sim3-est-row"><span class="sim3-est-lbl">Est. Fee</span><span class="sim3-est-val" id="sim3-est-fee">—</span></div>
          <div class="sim3-est-row"><span class="sim3-est-lbl">Liq Price</span><span class="sim3-est-val gold" id="sim3-est-liq">—</span></div>
        </div>

        <div class="sim3-submit-wrap">
          <button class="sim3-submit buy" id="sim3-submit" onclick="_sim3Submit()" disabled>Buy / Long · Market</button>
        </div>

        <div class="sim3-pos" id="sim3-pos-box"></div>
        <div class="sim3-orders" id="sim3-orders-box" style="display:none;"></div>
      </div>
    </div>

    <div class="sim3-lower">
      <div class="sim3-panel">
        <div class="sim3-panel-top"><span>Account Equity Curve</span><span class="sim3-panel-meta">${A.sessions || 0} sessions</span></div>
        <div id="sim3-eq-el"></div>
      </div>
      <div class="sim3-panel">
        <div class="sim3-panel-top"><span>Fills &amp; Closed Trades</span><span class="sim3-panel-meta">taker ${(SIM_TAKER*100).toFixed(3)}% · maker ${(SIM_MAKER*100).toFixed(2)}%</span></div>
        <div class="sim3-blot-head"><span>Time</span><span>Side</span><span>Type</span><span>Detail</span><span style="text-align:right">Fee</span><span style="text-align:right">P&amp;L</span></div>
        <div class="sim3-blot-body" id="sim3-blot-body"></div>
      </div>
    </div>

    <div class="sim3-reset-row">
      <button class="sim3-reset-btn" onclick="_sim3Reset()">Reset Account</button>
    </div>
  </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  S.uiSide = 'buy'; S.uiType = 'market';

  setTimeout(() => {
    _renderChart();
    _paintAll();
    _setPlaying(true);   // sessions start live — pause is one click away
  }, 60);
}

/* keyboard: space toggles play/pause while the simulator is on screen */
document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || !S || !_el('sim3-chart-el')) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  e.preventDefault();
  window._sim3Play();
});

/* Full teardown — idempotent; called on re-entry and by the engine on nav-away. */
function ltSimTeardown() {
  if (S && S.timer) { clearInterval(S.timer); S.timer = null; }
  if (S) S.playing = false;
  if (_simEqChart) { try { _simEqChart.dispose(); } catch(_) {} _simEqChart = null; }
  if (_simChart)   { try { _simChart.dispose();   } catch(_) {} _simChart   = null; }
  if (_simChartRO) { try { _simChartRO.disconnect(); } catch(_) {} _simChartRO = null; }
  if (_simEqRO)    { try { _simEqRO.disconnect();    } catch(_) {} _simEqRO    = null; }
}
window.ltSimTeardown = ltSimTeardown;
window.renderSimulator = renderSimulator;

/* course integration (unchanged API) */
window.getSimPatternForChapter = function(chapterTitle) {
  for (const [key, patterns] of Object.entries(CHAPTER_PATTERN_MAP)) {
    if (chapterTitle.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(chapterTitle.toLowerCase())) {
      return patterns[0];
    }
  }
  return null;
};
window.SIM_CONCEPTS = SIM_CONCEPTS;
window.CHAPTER_PATTERN_MAP = CHAPTER_PATTERN_MAP;
window._paintOrderPanel = _paintOrderPanel;   // input oninput handlers reference it
