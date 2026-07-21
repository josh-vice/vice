'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Practice Simulator: synthetic market generator
   lt-simulator.js

   Design (rebuilt 2026-06-09):
   • Each pattern injector builds ONLY the setup — the candles up to the
     decision point — and lands the last close AT the key level it teaches
     (so the "Key Level" line sits where you actually trade, not floating off
     the top of the chart). It returns { setup, keyLevel, label, winDir }.
   • winDir is where the textbook says price goes next (+1 up / -1 down).
   • The reveal (post-decision continuation) is built separately from winDir
     and the requested `outcome`:
        outcome='resolve' → price moves the textbook way (the setup works)
        outcome='fail'    → price moves AGAINST it, after a brief lure that
                            traps textbook traders (the setup fails)
     The setup is identical for both outcomes — you cannot tell from the chart
     which one you're getting. Difficulty (Learn vs Realistic) just changes how
     often 'fail' is chosen; that decision lives in the UI.
   ═══════════════════════════════════════════════════════════════════════════ */

// Seeded PRNG
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Base random walk — n candles (1-hour base units; aggregated up by viewMarket).
function baseWalk(rand, n, startPrice, drift, vol) {
  const out = [];
  let prevClose = startPrice;
  for (let i = 0; i < n; i++) {
    const open = prevClose;
    const pct = drift + (rand() * 2 - 1) * vol;
    const close = open * (1 + pct);
    const bodyHi = Math.max(open, close);
    const bodyLo = Math.min(open, close);
    const high = bodyHi * (1 + rand() * vol * 0.6);
    const low = bodyLo * (1 - rand() * vol * 0.6);
    out.push([+open.toFixed(2), +close.toFixed(2), +low.toFixed(2), +high.toFixed(2)]);
    prevClose = close;
  }
  return out;
}

// Aggregate base candles up to a higher timeframe. factor: 4=4h,6=6h,12=12h,24=1d
function aggregateCandles(ohlc, factor) {
  const out = [];
  for (let i = 0; i + factor <= ohlc.length; i += factor) {
    const grp = ohlc.slice(i, i + factor);
    const open = grp[0][0];
    const close = grp[grp.length - 1][1];
    const low = Math.min(...grp.map(c => c[2]));
    const high = Math.max(...grp.map(c => c[3]));
    out.push([+open.toFixed(2), +close.toFixed(2), +low.toFixed(2), +high.toFixed(2)]);
  }
  return out;
}

/* ── build helpers ─────────────────────────────────────────────────────────
   SETUP_N setup candles per scenario; REVEAL_N continuation candles. Chosen so
   every timeframe reads cleanly (4h≈60 setup candles, not 90; 1d≈10).        */
const SETUP_N  = 240;
const REVEAL_N = 140;

// A directional leg from `start` to `target` over n candles. Prices follow a
// deterministic geometric ramp with an AR(1) deviation layered on top, so the
// leg has organic swings BUT reliably lands at `target` (a plain drifted random
// walk compounds variance over 240 candles and wanders ±5% off, which breaks the
// level-pinned candles — sweeps, zone probes, retests — that the patterns rely on).
function legTo(rand, start, target, n, vol) {
  const out = [];
  let prevClose = start, dev = 0;
  const phi = 0.88; // deviation persistence → visible swings, still mean-reverting
  for (let i = 0; i < n; i++) {
    const ramp = start * Math.pow(target / start, (i + 1) / n);
    dev = dev * phi + (rand() * 2 - 1) * vol;
    const open = prevClose;
    const close = ramp * (1 + dev);
    const bodyHi = Math.max(open, close), bodyLo = Math.min(open, close);
    const high = bodyHi * (1 + rand() * vol * 0.6);
    const low  = bodyLo * (1 - rand() * vol * 0.6);
    out.push([+open.toFixed(2), +close.toFixed(2), +low.toFixed(2), +high.toFixed(2)]);
    prevClose = close;
  }
  return out;
}

// A clean OHLC candle from open/close + wick fractions (always valid).
function mkCandle(open, close, lowFrac, highFrac) {
  const bodyHi = Math.max(open, close), bodyLo = Math.min(open, close);
  return [+open.toFixed(2), +close.toFixed(2), +(bodyLo * (1 - lowFrac)).toFixed(2), +(bodyHi * (1 + highFrac)).toFixed(2)];
}

// Force an OHLC array valid (low ≤ body ≤ high) — used for hand-shaped candles.
function fixCandle(open, close, low, high) {
  low = Math.min(low, open, close);
  high = Math.max(high, open, close);
  return [+open.toFixed(2), +close.toFixed(2), +low.toFixed(2), +high.toFixed(2)];
}

const _last = arr => arr[arr.length - 1][1];

// Mean-reverting oscillation between floor and ceiling (for ranges).
function rangeWalk(rand, n, mid, half, vol) {
  const floor = mid - half, ceiling = mid + half;
  const out = [];
  let prev = mid;
  for (let i = 0; i < n; i++) {
    const o = prev;
    const dist = (mid - o) / half;
    let c = o * (1 + dist * 0.012 + (rand() * 2 - 1) * vol);
    if (c > ceiling) c = ceiling - (c - ceiling);
    if (c < floor) c = floor + (floor - c);
    out.push(mkCandle(o, c, rand() * 0.003, rand() * 0.003));
    prev = c;
  }
  return out;
}

/* ── reveal builder ────────────────────────────────────────────────────────
   dir = actual outcome direction (+1 up / -1 down). fakeout = brief lure in the
   opposite (textbook-expected) direction before committing — models the trap
   where a setup pulls you in, then reverses.                                  */
function buildReveal(rand, start, dir, n, vol, fakeout) {
  if (!fakeout) return baseWalk(rand, n, start, dir * 0.0014, vol);
  const k = Math.max(3, Math.floor(n * 0.18));
  const lure = baseWalk(rand, k, start, -dir * 0.0011, vol);
  const mid = lure.length ? _last(lure) : start;
  const rest = baseWalk(rand, n - k, mid, dir * 0.0017, vol * 1.05);
  return lure.concat(rest);
}

/* ── PATTERN INJECTORS (setup only) ─────────────────────────────────────────
   Each returns { setup, keyLevel, label, winDir }. setup.length === SETUP_N.  */

function _injUptrend(rand) {
  const setup = legTo(rand, 28000, 28000 * 1.22, SETUP_N, 0.006);
  const keyLevel = Math.min(...setup.slice(SETUP_N - 40).map(c => c[2])); // recent higher-low (support)
  return { setup, keyLevel, label: 'Uptrend', winDir: +1 };
}

function _injDowntrend(rand) {
  const setup = legTo(rand, 36000, 36000 * 0.80, SETUP_N, 0.006);
  const keyLevel = Math.max(...setup.slice(SETUP_N - 40).map(c => c[3])); // recent lower-high (resistance)
  return { setup, keyLevel, label: 'Downtrend', winDir: -1 };
}

function _injRange(rand) {
  const mid = 30000, half = 1800;
  const body = rangeWalk(rand, SETUP_N - 16, mid, half, 0.004);
  // Drift the final candles to one band edge so there's a clear range trade.
  const toCeiling = rand() < 0.5;
  const edge = toCeiling ? mid + half : mid - half;
  const tail = legTo(rand, _last(body), edge * (toCeiling ? 0.998 : 1.002), 16, 0.003);
  const setup = body.concat(tail);
  return { setup, keyLevel: edge, label: 'Range', winDir: toCeiling ? -1 : +1 }; // revert toward mid
}

function _injBullFlag(rand) {
  const impulse = legTo(rand, 30000, 30000 * 1.13, 130, 0.006);
  const flagHigh = _last(impulse);
  const flag = legTo(rand, flagHigh, flagHigh * 0.975, SETUP_N - 130, 0.0028); // tight shallow pullback
  return { setup: impulse.concat(flag), keyLevel: flagHigh, label: 'Bull Flag', winDir: +1 };
}

function _injBearFlag(rand) {
  const impulse = legTo(rand, 33000, 33000 * 0.87, 130, 0.006);
  const flagLow = _last(impulse);
  const flag = legTo(rand, flagLow, flagLow * 1.025, SETUP_N - 130, 0.0028);
  return { setup: impulse.concat(flag), keyLevel: flagLow, label: 'Bear Flag', winDir: -1 };
}

function _injBreakout(rand) {
  const res = 31000;
  const range = rangeWalk(rand, 150, res * 0.965, res * 0.03, 0.004); // oscillate under resistance
  const brk = legTo(rand, _last(range), res * 1.022, 35, 0.006);       // decisive break above
  const retest = legTo(rand, _last(brk), res * 1.004, SETUP_N - 185, 0.0035); // pull back to old resistance
  // Last candle taps the level from above and holds (now support).
  const o = retest.length > 1 ? retest[retest.length - 2][1] : _last(brk);
  retest[retest.length - 1] = fixCandle(o, res * 1.004, res * 0.997, Math.max(o, res * 1.004) * 1.002);
  return { setup: range.concat(brk, retest), keyLevel: res, label: 'Breakout', winDir: +1 };
}

function _injDoubleTop(rand) {
  const res = 32000, neck = res * 0.93;
  const up1 = legTo(rand, 29500, res * 0.998, 95, 0.005);
  const pb  = legTo(rand, _last(up1), neck, 65, 0.005);
  const up2 = legTo(rand, _last(pb), res * 0.997, SETUP_N - 160, 0.005);
  // Reject candle: equal-high test of resistance with an upper wick, close back below.
  const o = up2.length > 1 ? up2[up2.length - 2][1] : _last(pb);
  up2[up2.length - 1] = fixCandle(o, res * 0.985, Math.min(o, res * 0.985) * 0.997, res * 1.006);
  return { setup: up1.concat(pb, up2), keyLevel: res, label: 'Double Top', winDir: -1 };
}

function _injDoubleBottom(rand) {
  const sup = 28000, neck = sup * 1.07;
  const dn1 = legTo(rand, 30500, sup * 1.002, 95, 0.005);
  const bb  = legTo(rand, _last(dn1), neck, 65, 0.005);
  const dn2 = legTo(rand, _last(bb), sup * 1.003, SETUP_N - 160, 0.005);
  const o = dn2.length > 1 ? dn2[dn2.length - 2][1] : _last(bb);
  dn2[dn2.length - 1] = fixCandle(o, sup * 1.015, sup * 0.994, Math.max(o, sup * 1.015) * 1.003);
  return { setup: dn1.concat(bb, dn2), keyLevel: sup, label: 'Double Bottom', winDir: +1 };
}

function _injDemandBounce(rand) {
  const zone = 28000;
  const decline = legTo(rand, zone * 1.16, zone, 210, 0.0055); // decline that lands AT the zone
  const probe = [];
  for (let i = 0; i < SETUP_N - 210; i++) {
    const o = i === 0 ? _last(decline) : probe[i - 1][1];
    const close = zone * (1 + (rand() * 0.008 - 0.001)); // mostly closes just above the zone
    const low   = zone * (1 - rand() * 0.006);           // long lower wick below the zone
    const high  = Math.max(o, close) * (1 + rand() * 0.002);
    probe.push(fixCandle(o, close, low, high));
  }
  return { setup: decline.concat(probe), keyLevel: zone, label: 'Demand Zone', winDir: +1 };
}

function _injSupplyReject(rand) {
  const zone = 32000;
  const rally = legTo(rand, zone * 0.84, zone, 210, 0.0055);
  const probe = [];
  for (let i = 0; i < SETUP_N - 210; i++) {
    const o = i === 0 ? _last(rally) : probe[i - 1][1];
    const close = zone * (1 - (rand() * 0.008 - 0.001)); // mostly closes just below the zone
    const high  = zone * (1 + rand() * 0.006);           // long upper wick above the zone
    const low   = Math.min(o, close) * (1 - rand() * 0.002);
    probe.push(fixCandle(o, close, low, high));
  }
  return { setup: rally.concat(probe), keyLevel: zone, label: 'Supply Zone', winDir: -1 };
}

function _injReversalHammer(rand) {
  const down = legTo(rand, 32000, 28500, SETUP_N - 1, 0.0055);
  const o = _last(down);
  const close = o * 1.001;            // tiny body
  const hammer = fixCandle(o, close, o * 0.978, Math.max(o, close) * 1.002); // long lower wick
  return { setup: down.concat([hammer]), keyLevel: hammer[2], label: 'Hammer', winDir: +1 };
}

function _injShootingStar(rand) {
  const up = legTo(rand, 28000, 31500, SETUP_N - 1, 0.0055);
  const o = _last(up);
  const close = o * 0.999;
  const star = fixCandle(o, close, Math.min(o, close) * 0.998, o * 1.022); // long upper wick
  return { setup: up.concat([star]), keyLevel: star[3], label: 'Shooting Star', winDir: -1 };
}

function _injInvertedHammer(rand) {
  const down = legTo(rand, 32000, 28500, SETUP_N - 1, 0.0055);
  const o = _last(down);
  const close = o * 1.001;
  const ih = fixCandle(o, close, Math.min(o, close) * 0.998, o * 1.02); // long upper wick at the bottom
  return { setup: down.concat([ih]), keyLevel: o, label: 'Inverted Hammer', winDir: +1 };
}

function _injDoji(rand) {
  const up = legTo(rand, 29000, 31000, SETUP_N - 1, 0.005);
  const o = _last(up);
  const close = o * (1 + (rand() * 0.0006 - 0.0003)); // open ≈ close
  const doji = fixCandle(o, close, o * 0.991, o * 1.009);
  return { setup: up.concat([doji]), keyLevel: o, label: 'Doji', winDir: rand() < 0.5 ? +1 : -1 };
}

function _injSrFlip(rand) {
  const level = 30000;
  const approach = legTo(rand, 28000, level * 1.012, 130, 0.005);            // rally through the level
  const retest = legTo(rand, _last(approach), level * 1.004, SETUP_N - 130, 0.004); // pull back to it
  const o = retest.length > 1 ? retest[retest.length - 2][1] : _last(approach);
  retest[retest.length - 1] = fixCandle(o, level * 1.004, level * 0.998, Math.max(o, level * 1.004) * 1.002);
  return { setup: approach.concat(retest), keyLevel: level, label: 'S/R Flip', winDir: +1 };
}

function _injLiquiditySweep(rand) {
  const priorHigh = 31000;
  const run = legTo(rand, priorHigh * 0.93, priorHigh * 0.992, SETUP_N - 1, 0.005); // approach from below
  const o = _last(run);
  // Sweep candle: spikes ABOVE the prior high then closes back below it = failure.
  const sweep = fixCandle(o, priorHigh * 0.986, Math.min(o, priorHigh * 0.986) * 0.998, priorHigh * 1.014);
  return { setup: run.concat([sweep]), keyLevel: priorHigh, label: 'Liquidity Sweep', winDir: -1 };
}

function _injBos(rand) {
  const up = legTo(rand, 28000, 33000, 200, 0.0055);                       // uptrend making HH/HL
  const hl = Math.min(...up.slice(160).map(c => c[2]));                    // most recent higher-low
  const brk = legTo(rand, _last(up), hl * 0.975, SETUP_N - 200, 0.006);    // break DOWN below it (visible BOS)
  return { setup: up.concat(brk), keyLevel: +hl.toFixed(2), label: 'Break of Structure', winDir: -1 };
}

// Map pattern keys to injector functions
const _INJECTORS = {
  uptrend: _injUptrend,
  downtrend: _injDowntrend,
  range: _injRange,
  bull_flag: _injBullFlag,
  bear_flag: _injBearFlag,
  breakout: _injBreakout,
  double_top: _injDoubleTop,
  double_bottom: _injDoubleBottom,
  demand_bounce: _injDemandBounce,
  supply_reject: _injSupplyReject,
  reversal_hammer: _injReversalHammer,
  shooting_star: _injShootingStar,
  inverted_hammer: _injInvertedHammer,
  doji: _injDoji,
  sr_flip: _injSrFlip,
  liquidity_sweep: _injLiquiditySweep,
  bos: _injBos
};

const _TF_FACTOR = { '4h': 4, '6h': 6, '12h': 12, '1d': 24 }; // 1h base units
const _TF_HOURS  = { '4h': 4, '6h': 6, '12h': 12, '1d': 24 };
const _SIM_MON   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Format a candle timestamp for the x-axis. Higher TF → date only; intraday →
// time, with the date shown at each midnight boundary.
function _simFmtTime(d, tf) {
  const mo = _SIM_MON[d.getUTCMonth()], day = d.getUTCDate();
  if (tf === '1d') return mo + ' ' + day;
  const h = d.getUTCHours();
  return h === 0 ? mo + ' ' + day : (h < 10 ? '0' : '') + h + ':00';
}

/* ── Synthetic volume ───────────────────────────────────────────────────────
   The generator has no order flow, so volume is derived from the candle itself:
   range (body + wicks) drives magnitude, with seeded noise and a mild boost on
   direction changes (real markets print volume where price fights). Units are
   arbitrary "BTC" — only relative size matters on the chart. */
function _volFor(rand, c, prev) {
  const [o, cl, lo, hi] = c;
  const range = Math.abs(hi - lo) / (o || 1);
  const body  = Math.abs(cl - o)  / (o || 1);
  const flip  = prev ? ((cl >= o) !== (prev[1] >= prev[0]) ? 1.25 : 1) : 1;
  const v = (140 + range * 52000 + body * 30000) * flip * (0.65 + rand() * 0.7);
  return +v.toFixed(1);
}
function buildVolumes(rand, ohlc) {
  const out = new Array(ohlc.length);
  for (let i = 0; i < ohlc.length; i++) out[i] = _volFor(rand, ohlc[i], i ? ohlc[i - 1] : null);
  return out;
}

/* Generate the single source-of-truth base market (1h units, no timeframe).
   outcome: 'resolve' (setup works) | 'fail' (setup fails). Default 'resolve'.
   The setup is identical for both — only the reveal differs. */
function generateMarket(simPattern, seed, outcome) {
  const rand = mulberry32((seed | 0) + 1);
  const inj  = (_INJECTORS[simPattern] || _injUptrend);
  const built = inj(rand);                         // { setup, keyLevel, label, winDir }
  outcome = outcome === 'fail' ? 'fail' : 'resolve';
  const dir = outcome === 'fail' ? -built.winDir : built.winDir;
  const reveal = buildReveal(rand, _last(built.setup), dir, REVEAL_N, 0.006, outcome === 'fail');
  const ohlcBase = built.setup.concat(reveal);
  return {
    ohlcBase,
    volBase: buildVolumes(mulberry32((seed | 0) + 77), ohlcBase),
    cutIndexBase: built.setup.length,
    keyLevel: +built.keyLevel.toFixed(2),
    patternLabel: built.label,
    pattern: simPattern,
    seed,
    winDir: built.winDir,
    outcome
  };
}

/* ── Live-session extension ─────────────────────────────────────────────────
   Appends n more 1h candles past the scripted reveal so a live session never
   runs out of market. Regime machine: alternating drift/volatility legs (trend,
   chop, squeeze) seeded off the market seed + current length → deterministic
   per market, different every leg. */
function extendMarket(market, n) {
  const start = market.ohlcBase.length;
  const rand  = mulberry32(((market.seed | 0) * 31 + start) >>> 0);
  let prevClose = _last(market.ohlcBase);
  let left = n;
  const fresh = [];
  while (left > 0) {
    const legLen = Math.min(left, 18 + Math.floor(rand() * 30));
    const r = rand();
    const drift = r < 0.38 ? (rand() * 2 - 1) * 0.0022        // trend leg
               : r < 0.75 ? (rand() * 2 - 1) * 0.0005        // chop
               : 0;                                           // squeeze
    const vol = r >= 0.75 ? 0.0028 : 0.005 + rand() * 0.004;  // squeeze = tight
    const leg = baseWalk(rand, legLen, prevClose, drift, vol);
    fresh.push(...leg);
    prevClose = _last(leg);
    left -= legLen;
  }
  market.ohlcBase = market.ohlcBase.concat(fresh);
  const vr = mulberry32(((market.seed | 0) * 91 + start) >>> 0);
  market.volBase = (market.volBase || []).concat(buildVolumes(vr, fresh));
  return market;
}

/* ── Intra-candle tick path ─────────────────────────────────────────────────
   Deterministic price path through one candle for live playback: open → first
   extreme → second extreme → close, with seeded jitter between waypoints. Bull
   candles sweep the low first (O→L→H→C), bear candles the high first — the
   standard replay heuristic. Returns k prices; the OPEN prints first and the
   extremes/close are exact waypoints so intra-candle SL/TP/liq hits are exact. */
function synthTicks(candle, k, seed) {
  const [o, c, lo, hi] = candle;
  const bull = c >= o;
  const way = bull ? [o, lo, hi, c] : [o, hi, lo, c];
  const rand = mulberry32((seed | 0) >>> 0);
  k = Math.max(4, k | 0);
  const out = [+o.toFixed(2)];                     // the open always prints
  const segs = way.length - 1;                     // 3 segments
  const per = Math.max(1, Math.floor((k - 1) / segs));
  for (let s = 0; s < segs; s++) {
    const a = way[s], b = way[s + 1];
    const steps = s === segs - 1 ? Math.max(1, k - out.length) : per;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      let p = a + (b - a) * t;
      if (i !== steps) p *= 1 + (rand() * 2 - 1) * 0.0008;   // jitter, never on waypoints
      p = Math.min(hi, Math.max(lo, p));
      out.push(+p.toFixed(2));
    }
  }
  out[out.length - 1] = c;                          // land exactly on close
  return out;
}

// Aggregate volumes to a higher timeframe (sum per bucket) — mirrors aggregateCandles.
function aggregateVolumes(vols, factor) {
  const out = [];
  for (let i = 0; i + factor <= vols.length; i += factor) {
    let s = 0;
    for (let j = i; j < i + factor; j++) s += vols[j] || 0;
    out.push(+s.toFixed(1));
  }
  return out;
}

// View an already-generated market at a timeframe — pure re-bucketing, no randomness.
function viewMarket(market, timeframe) {
  const factor = _TF_FACTOR[timeframe] || 24;
  const ohlc = aggregateCandles(market.ohlcBase, factor);
  const vols = aggregateVolumes(market.volBase || [], factor);
  const cutIndex = Math.max(1, Math.min(ohlc.length - 2, Math.floor(market.cutIndexBase / factor)));
  const stepMs   = (_TF_HOURS[timeframe] || 24) * 3600 * 1000;
  const anchorMs = Date.UTC(2024, 0, 1) + ((market.seed || 1) % 200) * 86400000;
  const labels = ohlc.map((_, i) => _simFmtTime(new Date(anchorMs + (i - cutIndex) * stepMs), timeframe));
  return {
    ohlc, vols, labels, cutIndex,
    factor, stepMs, anchorMs,
    // Neutral level line — never names the pattern (that would give away the answer).
    markLines: [{ yAxis: +market.keyLevel.toFixed(2), label: 'Key Level', color: '#8a8f98' }],
    keyLevel: +market.keyLevel.toFixed(2),
    winDir: market.winDir,
    outcome: market.outcome,
    patternLabel: market.patternLabel,
    source: 'simulation',
    meta: { pattern: market.pattern, timeframe, seed: market.seed, outcome: market.outcome }
  };
}

// Convenience wrapper — keeps old call sites working. Defaults to '1d'.
function generateScenario(simPattern, seed, timeframe, outcome) {
  return viewMarket(generateMarket(simPattern, seed, outcome), timeframe || '1d');
}

// Exports (plain-script global access — no modules)
window.mulberry32 = mulberry32;
window.baseWalk = baseWalk;
window.aggregateCandles = aggregateCandles;
window.aggregateVolumes = aggregateVolumes;
window.generateMarket = generateMarket;
window.viewMarket = viewMarket;
window.generateScenario = generateScenario;
window.extendMarket = extendMarket;
window.synthTicks = synthTicks;
