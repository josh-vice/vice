/* ════════════════════════════════════════════════════════════════════════════
   chart-vocabulary.js  —  Liquidity Theory v2, LAYER 2 of 3 (the vocabulary)
   ----------------------------------------------------------------------------
   A small library of NAMED, hand-built, idealized chart primitives. Lessons
   reference these BY NAME and pass annotations; the geometry lives here, once,
   so every lesson draws the same move the same correct way.

   Hard rules for everything in this file:
     • TICKER-FREE. No BTC/ETH/exchange names, no real prices. The price axis is
       abstract units around an arbitrary baseline — the renderer never prints
       numbers on it.
     • Deterministic. No seeds exposed to content, no randomness a lesson can see.
       Same name + same params → byte-identical geometry every load.
     • Self-describing. Each move returns not just candles but a map of NAMED
       ANCHORS (levels & points) and named reveal STAGES. Content annotates by
       anchor name and reveals by stage name, so content never touches an index,
       a price, or a pixel.

   A move returns:
     {
       candles : [[open, close, low, high], ...]    // OHLC, oldest → newest
       anchors : { name: {type:'level', price} | {type:'point', i, price}, ... }
       stages  : { name: revealCount, ... }          // how many candles are shown
       order   : ['stageA','stageB', ...]            // canonical stage order
       yhint   : {min, max}                          // optional axis padding hint
     }

   A single-candle move (for CANDLE beats) returns:
     { ohlc:[o,c,l,h], anchors:{...}, regions:{...} }   // regions = price bands

   The geometry is grown from "legs" (a vendored copy of the site's ltCandles
   idea — continuous, crypto-style candles where each open = the previous close)
   plus, where a move needs an exact shape (e.g. a sweep candle), a hand-placed
   candle spliced in. Reuse of the legs idea is deliberate; the implementation is
   vendored so v2 has ZERO external dependencies.
   ════════════════════════════════════════════════════════════════════════════ */
(function (g) {
  'use strict';

  // ── deterministic candle generator (vendored from lt-chartgen ltCandles) ──
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function r2(v) { return Math.round(v * 100) / 100; }

  // legs: [{to, bars, reject?}]  reject = extra wick (price units) on the leg's
  // final candle, in the leg's direction (a clean rejection at a swing).
  function grow(start, legs, opts) {
    opts = opts || {};
    var rnd = rng(opts.seed != null ? opts.seed : 7);
    var wickF = opts.wick != null ? opts.wick : 0.5;
    var noiseF = opts.noise != null ? opts.noise : 0.4;
    var out = [], close = start;
    for (var li = 0; li < legs.length; li++) {
      var leg = legs[li], bars = Math.max(1, leg.bars | 0), from = close;
      var to = leg.to, step = (to - from) / bars, typical = Math.abs(step) || 1;
      for (var b = 0; b < bars; b++) {
        var o = close;
        var c = (b === bars - 1) ? to : from + step * (b + 1) + (rnd() - 0.5) * typical * noiseF;
        var hi0 = Math.max(o, c), lo0 = Math.min(o, c);
        var baseW = (Math.abs(c - o) * 0.5 + typical * 0.4) * wickF;
        var upW = baseW * (0.5 + rnd()), dnW = baseW * (0.5 + rnd());
        if (b === bars - 1 && leg.reject) { if (to >= from) upW += leg.reject; else dnW += leg.reject; }
        out.push([r2(o), r2(c), r2(lo0 - dnW), r2(hi0 + upW)]);
        close = c;
      }
    }
    return out;
  }
  function lastClose(cs) { return cs.length ? cs[cs.length - 1][1] : 0; }
  function yspan(cs, pad) {
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < cs.length; i++) { if (cs[i][2] < lo) lo = cs[i][2]; if (cs[i][3] > hi) hi = cs[i][3]; }
    pad = pad || 0.06; var d = (hi - lo) * pad;
    return { min: r2(lo - d), max: r2(hi + d) };
  }

  /* ── indicator helpers (colors + math mirror the course / recon player) ── */

  // Per-candle color schemes for the proprietary tools.
  //   MOMENTUM tools (trendbuddy / crayons / heuristics / pal): palette = [up, down,
  //     neutral]; each candle is colored by its short-term trend vs. the close 3 bars
  //     back (teal/green = rising, pink/red = falling).
  //   EXHAUSTION tool (genie): palette = [top-hue, bottom-hue, neutral]; a candle near a
  //     swing HIGH is painted the top hue (RED = buyer exhaustion into a top) and a candle
  //     near a swing LOW is painted the bottom hue (GREEN = seller exhaustion into a
  //     bottom) — the OPPOSITE sense of momentum, matching what Genie actually teaches.
  var SCHEME_PALETTE = {
    trendbuddy: ['#00d4d4', '#ff2e88', '#5b5570'],
    crayons:    ['#7cff6b', '#f23d5c', '#5b5570'],
    genie:      ['#f23d5c', '#7cff6b', '#8a84a6'],   // [red into tops, green into bottoms, neutral]
    pal:        ['#00d4d4', '#f23d5c', '#5b5570'],
    heuristics: ['#00d4d4', '#ff2e88', '#5b5570']
  };
  var EXHAUSTION_SCHEMES = { genie: 1 };
  // momentum coloring: rising vs the close 3 bars back.
  function momentumColors(cs, P) {
    var k = 3, out = [];
    for (var i = 0; i < cs.length; i++) {
      var ref = cs[Math.max(0, i - k)][1], diff = cs[i][1] - ref, thr = Math.abs(ref) * 0.004;
      out.push(diff > thr ? P[0] : diff < -thr ? P[1] : P[2]);
    }
    return out;
  }
  // exhaustion coloring: paint by where the close sits within a rolling window's range.
  // upper band (near the local top) → P[0] (red); lower band (near the local bottom) →
  // P[1] (green); the flat middle → P[2] (neutral). So hues turn red INTO tops and green
  // INTO bottoms — a leading-exhaustion read, not a trailing-momentum one.
  function exhaustionColors(cs, P) {
    var W = 8, out = [];
    for (var i = 0; i < cs.length; i++) {
      var lo = Infinity, hi = -Infinity;
      for (var j = Math.max(0, i - W); j <= Math.min(cs.length - 1, i + W); j++) {
        if (cs[j][1] < lo) lo = cs[j][1]; if (cs[j][1] > hi) hi = cs[j][1];
      }
      var pos = hi > lo ? (cs[i][1] - lo) / (hi - lo) : 0.5;
      out.push(pos >= 0.66 ? P[0] : pos <= 0.34 ? P[1] : P[2]);
    }
    return out;
  }
  function schemeColors(cs, scheme) {
    var P = SCHEME_PALETTE[scheme] || ['#00d4d4', '#f23d5c', '#5b5570'];
    return EXHAUSTION_SCHEMES[scheme] ? exhaustionColors(cs, P) : momentumColors(cs, P);
  }

  // Ichimoku Kinko Hyo from the candles, drawn FAITHFULLY:
  //   Tenkan / Kijun / Senkou-B = midpoint of that period's (high + low);
  //   Senkou-A = (Tenkan + Kijun) / 2.
  //   Senkou A & B are plotted `disp` periods AHEAD → the leading Kumo cloud that
  //     shows future support/resistance (Ichimoku's signature; arrays run n+disp long).
  //   Chikou (lagging span) = the close plotted `disp` periods BEHIND.
  // Periods scale down for a short idealized chart; the period windows expand at the
  // start (no leading nulls) so the cloud forms from the left edge instead of late.
  function ichimoku(cs, p) {
    p = p || { conv: 9, base: 26, span: 52, disp: 26 };
    var n = cs.length, d = p.disp != null ? p.disp : p.base;
    function mid(period, end) {
      var hi = -Infinity, lo = Infinity;
      for (var i = Math.max(0, end - period + 1); i <= end; i++) { if (cs[i][3] > hi) hi = cs[i][3]; if (cs[i][2] < lo) lo = cs[i][2]; }
      return (hi + lo) / 2;
    }
    var tenkan = [], kijun = [], aRaw = [], bRaw = [];
    for (var i = 0; i < n; i++) {
      tenkan.push(r2(mid(p.conv, i)));
      kijun.push(r2(mid(p.base, i)));
      bRaw.push(r2(mid(p.span, i)));
      aRaw.push(r2((tenkan[i] + kijun[i]) / 2));
    }
    // forward-displaced cloud: slot s carries the value computed d bars earlier
    var spanA = [], spanB = [];
    for (var s = 0; s < n + d; s++) { spanA.push(s >= d ? aRaw[s - d] : null); spanB.push(s >= d ? bRaw[s - d] : null); }
    // lagging span: slot k shows the close from d bars in the future
    var chikou = [];
    for (var k = 0; k < n; k++) chikou.push(k + d < n ? cs[k + d][1] : null);
    return { tenkan: tenkan, kijun: kijun, spanA: spanA, spanB: spanB, chikou: chikou, disp: d };
  }

  // Wilder's RSI of the candle closes (period p): null until it has p deltas of
  // history, then the standard smoothed RSI. The oscillator is the REAL computed
  // thing, not a hand-drawn line — so divergences are whatever the price actually does.
  function rsiOf(cs, p) {
    var n = cs.length, out = new Array(n).fill(null);
    if (n <= p) return out;
    var g = 0, l = 0;
    for (var i = 1; i <= p; i++) { var ch = cs[i][1] - cs[i - 1][1]; if (ch >= 0) g += ch; else l += -ch; }
    var ag = g / p, al = l / p;
    out[p] = al === 0 ? 100 : r2(100 - 100 / (1 + ag / al));
    for (var j = p + 1; j < n; j++) {
      var dch = cs[j][1] - cs[j - 1][1], gj = dch > 0 ? dch : 0, lj = dch < 0 ? -dch : 0;
      ag = (ag * (p - 1) + gj) / p; al = (al * (p - 1) + lj) / p;
      out[j] = al === 0 ? 100 : r2(100 - 100 / (1 + ag / al));
    }
    return out;
  }

  // Deterministic synthetic volume from candle range/body, with optional spikes
  // (e.g. { 3: 2.3 } = candle 3 has 2.3× volume — for "engulfing confirmed by volume").
  function vol(cs, spikes) {
    spikes = spikes || {}; var out = [];
    for (var i = 0; i < cs.length; i++) {
      var range = cs[i][3] - cs[i][2], body = Math.abs(cs[i][1] - cs[i][0]);
      out.push(r2((range * 0.6 + body * 0.8 + 4) * (spikes[i] || 1)));
    }
    return out;
  }
  // volume that ramps up ('rising') or fades ('declining') across the chart —
  // for the four price-vs-volume scenarios.
  function volProfile(cs, shape) {
    var base = vol(cs), n = cs.length;
    return base.map(function (v, i) { var t = i / Math.max(1, n - 1); return r2(v * (shape === 'declining' ? 1.5 - t : 0.6 + t)); });
  }
  // low volume before index `from`, a spike after — for breakout confirmation.
  function breakoutVol(cs, from) {
    return vol(cs).map(function (v, i) { return r2(i >= from ? v * 2.2 : v * 0.7); });
  }
  // classical-pattern profile: volume declines through the pattern, then spikes on
  // the break (the gauge the course applies to every chart pattern).
  function patternVol(cs, breakIdx) {
    var base = vol(cs);
    return base.map(function (v, i) {
      if (i >= breakIdx) return r2(v * 2.4);
      var t = i / Math.max(1, breakIdx - 1);
      return r2(v * (1.4 - 0.9 * t));
    });
  }

  /* ══════════════════════════ CHART MOVES ══════════════════════════ */
  var CHARTS = {

    /* range_bound — a clean sideways range with a defined high and low. Price is
       REJECTED at each bound (wick tags the level, close turns away) so the range
       reads as respected S/R, not a series of sweeps. Both bounds are tagged 5×
       and every tag is exposed as a numbered anchor (touchHi1..3 / touchLo1..2)
       so a lesson can draw the rule-of-fives / "both edges tag" story.
       Used to ground "pools sit just beyond the range edges."
       params: { } (none needed; labels come from the lesson's annotations) */
    range_bound: function () {
      var HI = 80, LO = 40;
      // small reject (≈1) so the wick just kisses the bound and the close pulls
      // back INSIDE — a defended edge, not an overshoot/sweep. Damped wick/noise
      // (was the default 0.5/0.4) so no candle out-extremes the drawn bounds —
      // the old settings wicked up to 8 units PAST the levels (AUDIT-COURSE1 §7).
      var cs = grow(60, [
        { to: HI - 1, bars: 3, reject: 1 },   // tag high #1  (idx 2)
        { to: LO + 1, bars: 3, reject: 1 },   // tag low  #1  (idx 5)
        { to: HI - 1, bars: 3, reject: 1 },   // tag high #2  (idx 8)
        { to: LO + 1, bars: 3, reject: 1 },   // tag low  #2  (idx 11)
        { to: HI - 1, bars: 3, reject: 1 },   // tag high #3  (idx 14)
        { to: 60, bars: 3 }                   // drift to mid
      ], { wick: 0.06, noise: 0.12 });
      return {
        candles: cs,
        anchors: {
          high: { type: 'level', price: HI },
          low: { type: 'level', price: LO },
          mid: { type: 'level', price: (HI + LO) / 2 },   // midpoint — control gauge / "don't trade the mid"
          touchHi1: { type: 'point', i: 2, price: HI },
          touchLo1: { type: 'point', i: 5, price: LO },
          touchHi2: { type: 'point', i: 8, price: HI },
          touchLo2: { type: 'point', i: 11, price: LO },
          touchHi3: { type: 'point', i: 14, price: HI },
          // pool bands sit JUST BEYOND each edge (where stops rest) — pass tone
          // from the lesson (supply/sell-stops above = risk/red, demand/buy-stops
          // below = reward/teal) and draw with side:'above' of:'high' / 'below' of:'low'.
          poolAbove: { type: 'level', price: HI },
          poolBelow: { type: 'level', price: LO }
        },
        stages: { all: cs.length },
        order: ['all'],
        yhint: yspan(cs, 0.12)
      };
    },

    /* liquidity_sweep_bullish — structure ABOVE a support level; price returns
       to support, sweeps BELOW it with a long lower wick (grabbing the liquidity
       resting under the level), then reverses up hard. A bullish SFP.
       Reveal stages: setup → approach → sweep → reversal.
       Anchors: support (level), firstTest (point), sweepLow (point),
                reclaim (point), reversalTop (point). */
    liquidity_sweep_bullish: function () {
      var S = 50;
      // setup: come down to support and bounce away (establishes the level)
      var setup = grow(78, [
        { to: S + 1, bars: 5, reject: 2 },   // approach support, touch ~49
        { to: 86, bars: 5 }                  // bounce hard away
      ]);
      // approach: drift back down toward the level over time
      var approach = grow(lastClose(setup), [
        { to: 62, bars: 4 },
        { to: S + 1, bars: 3 }               // back at the level
      ]);
      // sweep: ONE decisive candle — opens at the level, wicks well below S to
      // grab liquidity, closes strong back above (the long-lower-wick reversal).
      var sweepOpen = lastClose(approach);
      var sweepCandle = [r2(sweepOpen), 64, 38, 66];   // [o,c,l,h]
      // reversal: continuation up and away
      var reversal = grow(64, [{ to: 88, bars: 4 }]);

      var cs = setup.concat(approach, [sweepCandle], reversal);
      var nSetup = setup.length;                       // 10
      var nApproach = nSetup + approach.length;         // 17
      var sweepIdx = nApproach;                         // 17 (0-based)
      var nSweep = sweepIdx + 1;                         // 18
      var nReversal = cs.length;                         // 22

      // firstTest = the lowest candle of the setup approach (the prior bounce)
      var ftI = 0, ftLow = Infinity;
      for (var i = 0; i < setup.length; i++) { if (setup[i][2] < ftLow) { ftLow = setup[i][2]; ftI = i; } }

      return {
        candles: cs,
        anchors: {
          support: { type: 'level', price: S },
          firstTest: { type: 'point', i: ftI, price: ftLow },
          sweepLow: { type: 'point', i: sweepIdx, price: 38 },
          reclaim: { type: 'point', i: sweepIdx, price: 64 },
          entry: { type: 'point', i: sweepIdx, price: 64 },   // buyer fills on the reclaim close
          reversalTop: { type: 'point', i: cs.length - 1, price: 88 },
          // risk/reward anchors so a trade beat can draw a real stop + target
          stop: { type: 'level', price: 34 },                 // just below the deviation/sweep low
          target: { type: 'level', price: 88 }                // the reversal continuation high
        },
        stages: { setup: nSetup, approach: nApproach, sweep: nSweep, reversal: nReversal },
        order: ['setup', 'approach', 'sweep', 'reversal'],
        yhint: yspan(cs, 0.1)
      };
    },

    /* liquidity_sweep_bearish — mirror image. Structure BELOW a resistance / range
       high; price returns to resistance, sweeps ABOVE it with a long upper wick,
       then reverses down hard. A bearish SFP.
       Anchors: resistance (level), firstTest, sweepHigh, reclaim, reversalBottom. */
    liquidity_sweep_bearish: function () {
      var R = 50;
      var setup = grow(22, [
        { to: R - 1, bars: 5, reject: 2 },   // approach resistance, touch ~51
        { to: 14, bars: 5 }                  // drop hard away
      ]);
      var approach = grow(lastClose(setup), [
        { to: 38, bars: 4 },
        { to: R - 1, bars: 3 }
      ]);
      var sweepOpen = lastClose(approach);
      var sweepCandle = [r2(sweepOpen), 36, 34, 62];   // long upper wick, bearish body
      var reversal = grow(36, [{ to: 12, bars: 4 }]);

      var cs = setup.concat(approach, [sweepCandle], reversal);
      var nSetup = setup.length;
      var nApproach = nSetup + approach.length;
      var sweepIdx = nApproach;
      var nSweep = sweepIdx + 1;
      var nReversal = cs.length;

      var ftI = 0, ftHi = -Infinity;
      for (var i = 0; i < setup.length; i++) { if (setup[i][3] > ftHi) { ftHi = setup[i][3]; ftI = i; } }

      return {
        candles: cs,
        anchors: {
          resistance: { type: 'level', price: R },
          firstTest: { type: 'point', i: ftI, price: ftHi },
          sweepHigh: { type: 'point', i: sweepIdx, price: 62 },
          reclaim: { type: 'point', i: sweepIdx, price: 36 },
          entry: { type: 'point', i: sweepIdx, price: 36 },   // short fills on the reclaim close
          reversalBottom: { type: 'point', i: cs.length - 1, price: 12 },
          stop: { type: 'level', price: 66 },                 // just above the sweep high
          target: { type: 'level', price: 12 }                // the reversal continuation low
        },
        stages: { setup: nSetup, approach: nApproach, sweep: nSweep, reversal: nReversal },
        order: ['setup', 'approach', 'sweep', 'reversal'],
        yhint: yspan(cs, 0.1)
      };
    },

    /* uptrend — a clean higher-high / higher-low staircase. Exposes each swing
       point so a lesson can label HH/HL, plus `flipLevel` (the first swing high
       that later acts as support) for SR-flip / market-structure teaching. */
    uptrend: function (params) {
      // The second higher low (hl2) is engineered to land RIGHT ON the first swing
      // high (high1 = 58): the old high, once broken, flips to support and becomes
      // the next higher low — the exact "old high = new HL" S/R-flip lesson. base
      // is a level anchor for "buy the base / macro support" at the trend origin.
      var cs = grow(40, [
        { to: 58, bars: 3, reject: 2 },   // high1   (idx 2)
        { to: 48, bars: 2, reject: 1.5 }, // hl1     (idx 4)
        { to: 70, bars: 3, reject: 2 },   // hh1     (idx 7)  breaks the 58 high
        { to: 58, bars: 2, reject: 0.25 }, // hl2     (idx 9)  retests 58 as support — small reject so it "lands right on" the flip level (was 1.5: pierced it by ~3.8)
        { to: 82, bars: 3, reject: 2 }    // hh2     (idx 12)
      ], { wick: 0.16, noise: 0.22 });
      var out = {
        candles: cs,
        anchors: {
          start: { type: 'point', i: 0, price: cs[0][1] },
          base: { type: 'level', price: r2(cs[0][1]) },  // trend origin / macro support
          high1: { type: 'point', i: 2, price: 58 },
          hl1: { type: 'point', i: 4, price: 48 },
          hh1: { type: 'point', i: 7, price: 70 },
          hl2: { type: 'point', i: 9, price: 58 },   // = flipLevel: old high, now the new HL
          hh2: { type: 'point', i: 12, price: 82 },
          flipLevel: { type: 'level', price: 58 }    // prior high → support / BOS line
        },
        // base = the first leg + pullback (high1/hl1); confirm adds the break to hh1;
        // all completes the staircase — so a lesson can walk the swings one at a time.
        stages: { base: 5, confirm: 8, all: cs.length },
        order: ['base', 'confirm', 'all'], yhint: yspan(cs, 0.12)
      };
      if (params && params.volume) out.volume = volProfile(cs, params.volume);
      return out;
    },

    /* downtrend — mirror: lower-high / lower-low staircase. */
    downtrend: function (params) {
      var cs = grow(82, [
        { to: 64, bars: 3, reject: 2 },   // low1  (idx 2)
        { to: 74, bars: 2, reject: 1.5 }, // lh1   (idx 4)
        { to: 52, bars: 3, reject: 2 },   // ll1   (idx 7)
        { to: 62, bars: 2, reject: 1.5 }, // lh2   (idx 9)
        { to: 40, bars: 3, reject: 2 }    // ll2   (idx 12)
      ], { wick: 0.16, noise: 0.22 });
      var out = {
        candles: cs,
        anchors: {
          start: { type: 'point', i: 0, price: cs[0][1] },
          low1: { type: 'point', i: 2, price: 64 },
          lh1: { type: 'point', i: 4, price: 74 },
          ll1: { type: 'point', i: 7, price: 52 },
          lh2: { type: 'point', i: 9, price: 62 },
          ll2: { type: 'point', i: 12, price: 40 },
          flipLevel: { type: 'level', price: 64 }   // prior low → resistance
        },
        // mirror of uptrend's staging: base = low1/lh1, confirm adds the break to ll1.
        stages: { base: 5, confirm: 8, all: cs.length },
        order: ['base', 'confirm', 'all'], yhint: yspan(cs, 0.12)
      };
      if (params && params.volume) out.volume = volProfile(cs, params.volume);
      return out;
    },

    /* horizontal_sr — the RULE OF FIVES: a flat level tested FIVE times with each
       bounce/rejection weaker than the last, and the 5th touch BREAKS the level
       (support gives way below / resistance breaks above). Every touch is exposed as
       an anchor (touch1..touch5) plus a stop and a measured target so a lesson can
       draw the whole "each touch wears it down, the fifth gives way" story and a trade.
       params: { as: 'support' (default) | 'resistance' } */
    horizontal_sr: function (params) {
      var as = (params && params.as) || 'support';
      if (as === 'resistance') {
        var R = 60;
        // 5 taps of resistance with SHRINKING pullbacks (46→50→52→54), 5th breaks up
        var csR = grow(40, [
          { to: 59, bars: 2, reject: 1.5 }, { to: 46, bars: 2 },   // touch1 (idx1) strong reject
          { to: 59, bars: 2, reject: 1.2 }, { to: 50, bars: 2 },   // touch2 (idx5)
          { to: 59, bars: 2, reject: 1 },   { to: 52, bars: 2 },   // touch3 (idx9)
          { to: 59, bars: 2, reject: 0.7 }, { to: 55, bars: 1 },   // touch4 (idx13) weak reject
          { to: 60, bars: 2 },                                      // touch5 (idx15) at the level
          { to: 74, bars: 3 }                                       // 5th BREAKS out above
        ]); // touch ends: 1, 5, 9, 13, 16 ; break ends idx 19  (leg ends recomputed — the old
            // comment said 15/18, one short: legs are 2+2+2+2+2+2+2+1+2+3 = 20 bars, idx 0-19)
        return {
          candles: csR,
          anchors: {
            level: { type: 'level', price: R },
            touch1: { type: 'point', i: 1, price: R },
            touch2: { type: 'point', i: 5, price: R },
            touch3: { type: 'point', i: 9, price: R },
            touch4: { type: 'point', i: 13, price: R },
            touch5: { type: 'point', i: 16, price: R },   // the touch that breaks (was i:15 — one bar early)
            breakout: { type: 'point', i: 19, price: 74 },
            stop: { type: 'level', price: 55 },           // for a break-and-go long, below the level
            target: { type: 'level', price: 74 }
          },
          // 'hold' reveals the five taps WITHOUT the break (level still holding);
          // 'all'/'break' add the 5th-touch break-out. Lessons about a level that
          // holds use 'hold'; rule-of-fives lessons use 'break'/'all'.
          stages: { hold: 17, break: csR.length, all: csR.length },
          order: ['hold', 'break'], yhint: yspan(csR, 0.12)
        };
      }
      var S = 50;
      // 5 taps of support with SHRINKING bounces (64→60→57→54), 5th breaks down
      var cs = grow(70, [
        { to: 51, bars: 2, reject: 1.5 }, { to: 64, bars: 2 },   // touch1 (idx1) strong bounce
        { to: 51, bars: 2, reject: 1.2 }, { to: 60, bars: 2 },   // touch2 (idx5)
        { to: 51, bars: 2, reject: 1 },   { to: 57, bars: 2 },   // touch3 (idx9)
        { to: 51, bars: 2, reject: 0.7 }, { to: 54, bars: 1 },   // touch4 (idx13) weak bounce
        { to: 50, bars: 2 },                                      // touch5 (idx15) at the level
        { to: 36, bars: 3 }                                       // 5th BREAKS down through
      ]); // touch ends: 1, 5, 9, 13, 16 ; break ends idx 19  (leg ends recomputed — the old
          // comment said 15/18, one short: legs are 2+2+2+2+2+2+2+1+2+3 = 20 bars, idx 0-19)
      return {
        candles: cs,
        anchors: {
          level: { type: 'level', price: S },
          touch1: { type: 'point', i: 1, price: S },
          touch2: { type: 'point', i: 5, price: S },
          touch3: { type: 'point', i: 9, price: S },
          touch4: { type: 'point', i: 13, price: S },
          touch5: { type: 'point', i: 16, price: S },   // the touch that breaks (was i:15 — one bar early)
          breakdown: { type: 'point', i: 19, price: 36 },
          stop: { type: 'level', price: 54 },           // for the breakdown SHORT: just above the broken level
          longStop: { type: 'level', price: 47 },       // for a buy-the-support LONG: just beneath S (the old `stop` sat ABOVE the level being bought)
          target: { type: 'level', price: 64 }          // opposite edge / first bounce high
        },
        // 'hold' reveals the five taps WITHOUT the break (support still holding);
        // 'all'/'break' add the 5th-touch break-down.
        stages: { hold: 17, break: cs.length, all: cs.length },
        order: ['hold', 'break'], yhint: yspan(cs, 0.12)
      };
    },

    /* sr_flip — a level acts as resistance and is REJECTED TWICE (test1, test2),
       price breaks above, then retests it from above as SUPPORT and continues up.
       The retest is a HIGHER LOW (above the pre-break pullback low) and the run makes
       a HIGHER HIGH (above the breakout) — so a lesson can draw the "HL + HH working
       together = confirmed bullish structure" story. Exposes stop/entry/target so a
       trade beat can draw defined risk under the flipped level and the measured target.
       Stages: tests → breakout → hold → run. */
    sr_flip: function () {
      var L = 55;
      // Rejects shrunk (2/1.5 → 0.6/0.5) + wick/noise damped: the old tests wicked
      // 2.6–3.4 ABOVE the 55 level before the narrated "break" — the tests should
      // kiss the level and turn away (AUDIT-COURSE1 L04).
      var cs = grow(40, [
        { to: 54, bars: 3, reject: 0.6 }, // test resistance #1   (idx 2)
        { to: 44, bars: 2 },              // pull back (swing low) (idx 4)
        { to: 54, bars: 2, reject: 0.5 }, // test resistance #2    (idx 6)  rejected again
        { to: 66, bars: 3 },              // BREAK above           (idx 9)
        { to: 56, bars: 2, reject: 1 },   // retest, holds support (idx 11) higher low
        { to: 78, bars: 3 }               // run                   (idx 14) higher high
      ], { wick: 0.12, noise: 0.18 });
      return {
        candles: cs,
        anchors: {
          level: { type: 'level', price: L },
          test1: { type: 'point', i: 2, price: L },
          test2: { type: 'point', i: 6, price: L },          // second rejection at resistance
          swingLow: { type: 'point', i: 4, price: 44 },      // the pre-break pullback low
          breakout: { type: 'point', i: 9, price: 66 },
          retest: { type: 'point', i: 11, price: 56 },
          higherLow: { type: 'point', i: 11, price: 56 },    // retest hold = HL (56 > 44)
          top: { type: 'point', i: 14, price: 78 },
          higherHigh: { type: 'point', i: 14, price: 78 },   // run high = HH (78 > 66)
          entry: { type: 'point', i: 11, price: 56 },        // enter on the retest hold
          stop: { type: 'level', price: 51 },                // just below the flipped level
          target: { type: 'level', price: 78 }               // measured continuation / range high
        },
        stages: { tests: 7, breakout: 10, hold: 12, run: cs.length },
        order: ['tests', 'breakout', 'hold', 'run'], yhint: yspan(cs, 0.1)
      };
    },

    /* trendline_support — a rising diagonal: higher lows that line up. Exposes the
       touch points so a lesson can draw the trendline through them. */
    trendline_support: function () {
      // Damped wick/noise + anchors at the actual WICK LOWS: the trendline is drawn
      // through the touch anchors, and anchoring at closes let wicks pierce the drawn
      // diagonal by up to 5.4 units while the narration said "the lows line up"
      // (AUDIT-COURSE1 §7). A trendline hugs extremes, so the anchors now do too.
      var cs = grow(40, [
        { to: 52, bars: 2 }, { to: 44, bars: 2, reject: 1.8 },   // touch1 (idx 3)
        { to: 60, bars: 2 }, { to: 50, bars: 2, reject: 1.8 },   // touch2 (idx 7)
        { to: 68, bars: 2 }, { to: 57, bars: 2, reject: 1.8 },   // touch3 (idx 11)
        { to: 76, bars: 2 }
      ], { wick: 0.05, noise: 0.1 });
      return {
        candles: cs,
        anchors: {
          touch1: { type: 'point', i: 3, price: cs[3][2] },    // wick low of the touch candle
          touch2: { type: 'point', i: 7, price: cs[7][2] },
          touch3: { type: 'point', i: 11, price: cs[11][2] },
          top: { type: 'point', i: 13, price: 76 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* trendline_resistance — a falling diagonal: lower highs that line up. */
    trendline_resistance: function () {
      // Mirror of trendline_support: damped + anchored at the WICK HIGHS.
      var cs = grow(76, [
        { to: 62, bars: 2 }, { to: 70, bars: 2, reject: 1.8 },   // touch1 (idx 3)
        { to: 56, bars: 2 }, { to: 64, bars: 2, reject: 1.8 },   // touch2 (idx 7)
        { to: 50, bars: 2 }, { to: 57, bars: 2, reject: 1.8 },   // touch3 (idx 11)
        { to: 42, bars: 2 }
      ], { wick: 0.05, noise: 0.1 });
      return {
        candles: cs,
        anchors: {
          touch1: { type: 'point', i: 3, price: cs[3][3] },    // wick high of the touch candle
          touch2: { type: 'point', i: 7, price: cs[7][3] },
          touch3: { type: 'point', i: 11, price: cs[11][3] },
          bottom: { type: 'point', i: 13, price: 42 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* consolidation_breakout — a tight range that TAGS BOTH EDGES FIVE TIMES (the
       coiled spring; touchHi1..3 + touchLo1..2 numbered so a lesson can teach "around
       the fifth test it breaks"), then resolves with an impulse. Exposes the entry
       (first close beyond the edge), a stop (the opposite edge = invalidation) and a
       measured target (range height projected from the break).
       params: { dir: 'up' (default) | 'down', volume: true } */
    consolidation_breakout: function (params) {
      var dir = (params && params.dir) || 'up';
      var HI = 58, LO = 48, HGT = HI - LO;   // range height = 10
      if (dir === 'down') {
        // tag high(58)@1,5,9 / low(48)@3,7,11,13 → 5th engagement of the LOW breaks down.
        // (touchLo4 inserted so the 1-2-3-4-5 breakdown counting can be drawn — the low
        // used to be tagged only 3× before the break. Damped like the up-variant.)
        var csD = grow(52, [
          { to: HI, bars: 2, reject: 0.5 },   // touchHi1 (idx1)
          { to: LO, bars: 2, reject: 0.5 },   // touchLo1 (idx3)
          { to: HI, bars: 2, reject: 0.5 },   // touchHi2 (idx5)
          { to: LO, bars: 2, reject: 0.5 },   // touchLo2 (idx7)
          { to: HI, bars: 2, reject: 0.5 },   // touchHi3 (idx9)
          { to: LO, bars: 2, reject: 0.5 },   // touchLo3 (idx11)
          { to: LO, bars: 2 },              // touchLo4 (idx13) 5th test at the edge
          { to: LO - HGT, bars: 4 }         // BREAK down (idx17) target = LO - height
        ], { wick: 0.1, noise: 0.15 });
        return {
          candles: csD,
          anchors: {
            rangeHigh: { type: 'level', price: HI },
            rangeLow: { type: 'level', price: LO },
            touchHi1: { type: 'point', i: 1, price: HI }, touchLo1: { type: 'point', i: 3, price: LO },
            touchHi2: { type: 'point', i: 5, price: HI }, touchLo2: { type: 'point', i: 7, price: LO },
            touchHi3: { type: 'point', i: 9, price: HI }, touchLo3: { type: 'point', i: 11, price: LO },
            touchLo4: { type: 'point', i: 13, price: LO },
            entry: { type: 'point', i: 15, price: LO },        // first bar below the range low
            breakout: { type: 'point', i: 17, price: LO - HGT },
            stop: { type: 'level', price: HI },                 // opposite edge = invalidation
            target: { type: 'level', price: LO - HGT }          // measured move (height projected)
          },
          stages: { consolidate: 14, breakout: csD.length },
          order: ['consolidate', 'breakout'], yhint: yspan(csD, 0.1),
          volume: (params && params.volume) ? breakoutVol(csD, 14) : undefined
        };
      }
      // tag low(48)@3,7 / high(58)@1,5,9 → 5th test (high) breaks up. Damped wick/noise:
      // the old defaults pierced up to 46% of the range height past both edges.
      var cs = grow(52, [
        { to: HI, bars: 2, reject: 0.5 },   // touchHi1 (idx1)
        { to: LO, bars: 2, reject: 0.5 },   // touchLo1 (idx3)
        { to: HI, bars: 2, reject: 0.5 },   // touchHi2 (idx5)
        { to: LO, bars: 2, reject: 0.5 },   // touchLo2 (idx7)
        { to: HI, bars: 2, reject: 0.5 },   // touchHi3 (idx9)
        { to: HI, bars: 2 },              // touchHi4 (idx11) 5th test at the edge
        { to: HI + HGT + 6, bars: 4 }     // BREAK up (idx15) → 74 = HI + height + push
      ], { wick: 0.1, noise: 0.15 });
      return {
        candles: cs,
        anchors: {
          rangeHigh: { type: 'level', price: HI },
          rangeLow: { type: 'level', price: LO },
          touchHi1: { type: 'point', i: 1, price: HI }, touchLo1: { type: 'point', i: 3, price: LO },
          touchHi2: { type: 'point', i: 5, price: HI }, touchLo2: { type: 'point', i: 7, price: LO },
          touchHi3: { type: 'point', i: 9, price: HI }, touchHi4: { type: 'point', i: 11, price: HI },
          entry: { type: 'point', i: 13, price: HI },        // first bar above the range high
          breakout: { type: 'point', i: 15, price: HI + HGT + 6 },
          stop: { type: 'level', price: LO },                 // opposite edge = invalidation
          target: { type: 'level', price: HI + HGT }          // measured move (height projected = 68)
        },
        stages: { consolidate: 12, breakout: cs.length },
        order: ['consolidate', 'breakout'], yhint: yspan(cs, 0.1),
        volume: (params && params.volume) ? breakoutVol(cs, 12) : undefined
      };
    },

    /* trade_setup_long — a risk-management diagram: entry(50) / stop(45) / target(60)
       levels (a clean 1:2 RRR) on a price path that first dips toward the stop (never
       hitting it), then runs UP THROUGH the target and closes decisively above it — so
       "the winner blew clean through take-profit and kept going" is literally on-chart.
       The origin taps 60 twice BEFORE the trade so the target reads as prior resistance.
       Anchors: entry/stop/target levels + dip (the shakeout low) + tp (the exact
       target-tag candle) + runHigh (the overshoot). Stages: plan (levels + dip) → play. */
    trade_setup_long: function () {
      var cs = grow(60, [
        { to: 60, bars: 1, reject: 1.5 },   // prior tap of 60 as resistance (idx0)
        { to: 50, bars: 2 },                // fall to the entry level        (idx2)
        { to: 48, bars: 2, reject: 1 },     // dip toward stop, never hits 45 (idx4)
        { to: 60, bars: 3 },                // rally back to the target       (idx7 = tp)
        { to: 66, bars: 2 }                 // BREAK through & keep going      (idx9 = runHigh)
      ]);
      return {
        candles: cs,
        anchors: {
          entry: { type: 'level', price: 50 },
          stop: { type: 'level', price: 45 },
          target: { type: 'level', price: 60 },
          dip: { type: 'point', i: 4, price: 48 },       // the shakeout low above the stop
          tp: { type: 'point', i: 7, price: 60 },        // the candle that tags the target
          runHigh: { type: 'point', i: 9, price: 66 }    // overshoot — "kept going"
        },
        // plan reveals through the dip (levels + the hold above the stop); play adds
        // the run through target.
        stages: { plan: 5, play: cs.length },
        order: ['plan', 'play'], yhint: { min: 42, max: 70 }
      };
    },

    /* candle_story — a hand-built sequence that strings the single-candle lessons
       into one narrative: doji → marubozu down → long-lower-wick reversal → up →
       long-upper-wick rejection → doji pause → resume. Wick directions are placed
       by hand (legs+reject can't make a reversal wick), so it reads exactly right.
       Anchors mark where each side takes control. */
    candle_story: function () {
      var cs = [
        [60, 59.6, 57, 62],   // 0 doji — indecision at the top
        [59.6, 51, 50.5, 60], // 1 marubozu down — sellers seize control
        [51, 48, 46, 52],     // 2 continuation down
        [48, 52, 41, 53],     // 3 long lower wick — buyers step in (wick 7 > body 4: reads as a real hammer)
        [53, 57, 52, 58],     // 4 push up
        [57, 55, 54, 64],     // 5 long upper wick — sellers step back in
        [55, 50, 49, 56],     // 6 down
        [50, 50.4, 47, 53],   // 7 doji — pause / indecision
        [50.4, 57, 50, 58]    // 8 resume up
      ];
      return {
        candles: cs,
        anchors: {
          topDoji: { type: 'point', i: 0, price: 59.8 },   // the doji at the top (idx0 body)
          sellers1: { type: 'point', i: 1, price: 60 },
          buyers1: { type: 'point', i: 3, price: 41 },
          sellers2: { type: 'point', i: 5, price: 64 },
          pause: { type: 'point', i: 7, price: 50.2 }       // the doji body (not its low)
        },
        // staged so the story can be TOLD candle-group by candle-group instead of
        // dumping all five markers at once: sellers take over → buyers answer →
        // sellers cap it → the pause + resumption.
        stages: { down: 3, reversal: 5, rejection: 7, all: cs.length },
        order: ['down', 'reversal', 'rejection', 'all'], yhint: yspan(cs, 0.1)
      };
    },

    /* ── multi-candle PRICE-ACTION FORMATIONS (Course 2 / 06) ─────────────────
       Each is a hand-built 2–3 candle pattern (precise OHLC so the shape reads
       exactly right). A little lead-in context is included so the pattern sits in
       a trend. Anchors mark the decisive candle(s). */

    engulfing_bullish: function (params) {
      var cs = [
        [56, 53, 52, 57], [55, 52, 51, 56],   // downtrend lead-in
        [53, 49, 48, 54],                       // 2: prior down candle (sellers)
        [48, 57, 47, 58]                        // 3: up candle engulfs the prior body
      ];
      var out = {
        candles: cs,
        anchors: { prior: { type: 'point', i: 2, price: 54 }, engulf: { type: 'point', i: 3, price: 57 } },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
      // spike on the engulfing candle ≈ 2× the prior down day. The engulfing candle's
      // geometric base is already ~1.65× the prior bar, so 1.2 lands the DRAWN height
      // at ~2× — matching the "2× volume" label.
      if (params && params.volume) out.volume = vol(cs, { 3: 1.2 });
      return out;
    },

    engulfing_bearish: function (params) {
      var cs = [
        [44, 47, 43, 48], [45, 49, 44, 50],     // uptrend lead-in
        [47, 51, 46, 52],                        // 2: prior up candle (buyers)
        [52, 43, 42, 53]                         // 3: down candle engulfs the prior body
      ];
      var out = {
        candles: cs,
        anchors: { prior: { type: 'point', i: 2, price: 46 }, engulf: { type: 'point', i: 3, price: 43 } },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
      if (params && params.volume) out.volume = vol(cs, { 3: 1.2 });   // drawn ≈2× prior (base is already 1.65×), matches the label
      return out;
    },

    /* morning_star — down marubozu → doji (indecision) → up candle closing past the
       midpoint of the first body. Bullish reversal. */
    morning_star: function () {
      var cs = [
        [62, 58, 57, 63], [59, 55, 54, 60],     // downtrend lead-in
        [55, 46, 45, 55],                        // 2: strong down marubozu
        [46, 45.6, 43, 47],                      // 3: doji / star (indecision)
        [46, 54, 45, 55]                         // 4: up candle, closes past midpoint (~50.5)
      ];
      return {
        candles: cs,
        anchors: {
          star: { type: 'point', i: 3, price: 43 }, confirm: { type: 'point', i: 4, price: 54 },
          midpoint: { type: 'level', price: 50.5 },
          support: { type: 'level', price: 44 }   // the level the star forms AT (lows idx2/3)
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* evening_star — up marubozu → doji → down candle closing past the midpoint.
       Bearish reversal. */
    evening_star: function () {
      var cs = [
        [38, 42, 37, 43], [41, 45, 40, 46],     // uptrend lead-in
        [45, 54, 44, 54],                        // 2: strong up marubozu
        [54, 54.4, 53, 57],                      // 3: doji / star (indecision)
        [54, 46, 45, 55]                         // 4: down candle, closes past midpoint (~49.5)
      ];
      return {
        candles: cs,
        anchors: {
          star: { type: 'point', i: 3, price: 57 }, confirm: { type: 'point', i: 4, price: 46 },
          midpoint: { type: 'level', price: 49.5 },
          supply: { type: 'level', price: 57 }   // the resistance the buyers stall at (star high)
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* three_white_soldiers — three progressively strong up candles, little/no upper
       wick. Obvious bullish continuation/reversal. */
    three_white_soldiers: function () {
      var cs = [
        [45, 43, 42, 46], [44, 42, 41, 45],     // weak lead-in
        [42, 47, 41.6, 47.4],                    // soldier 1
        [46, 54, 45.6, 54.4],                    // soldier 2 (bigger body)
        [53, 62, 52.6, 62.4]                     // soldier 3 (bigger still)
      ];
      return {
        candles: cs,
        anchors: {
          base: { type: 'point', i: 1, price: 42 },       // the base the soldiers march out of
          soldier1: { type: 'point', i: 2, price: 47 },
          soldier2: { type: 'point', i: 3, price: 54 },
          soldier3: { type: 'point', i: 4, price: 62 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* three_black_crows — three progressively strong down candles, little/no lower
       wick. Obvious bearish continuation/reversal. */
    three_black_crows: function () {
      var cs = [
        [55, 57, 54, 58], [56, 58, 55, 59],     // weak lead-in
        [58, 53, 52.6, 58.4],                    // crow 1
        [54, 46, 45.6, 54.4],                    // crow 2
        [47, 38, 37.6, 47.4]                     // crow 3
      ];
      return {
        candles: cs,
        anchors: {
          crow1: { type: 'point', i: 2, price: 58.4 },
          crow2: { type: 'point', i: 3, price: 54 },
          crow3: { type: 'point', i: 4, price: 38 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* ── classical CHART PATTERNS (Course 2 / 10–11) ──────────────────────────
       Each carries the classic declining-volume-then-spike profile. Trendlines /
       necklines are drawn by the lesson via `trendline` (point anchors) or `level`. */

    rising_wedge: function () {
      // converging up (lows rise faster than highs), breaks DOWN, RETESTS the broken
      // lower line, then falls to the measured target (wedge height ≈ 14 projected
      // down from the break) — bearish.
      var cs = grow(46, [
        { to: 56, bars: 2, reject: 1.5 }, { to: 48, bars: 2 },
        { to: 60, bars: 2, reject: 1.5 }, { to: 54, bars: 2 },
        { to: 62, bars: 2, reject: 1.5 }, { to: 58, bars: 1 },
        { to: 50, bars: 2 },                 // BREAK below the lower line (idx 12)
        { to: 54, bars: 1, reject: 1 },      // RETEST the broken line from below (idx 13)
        { to: 40, bars: 3 }                  // drop to the measured target (idx 16)
      ]); // highs idx 1,5,9 ; lows idx 3,7,10 ; break idx12 ; retest idx13
      return {
        candles: cs,
        anchors: {
          upperA: { type: 'point', i: 1, price: 56 }, upperB: { type: 'point', i: 9, price: 62 },
          lowerA: { type: 'point', i: 3, price: 48 }, lowerB: { type: 'point', i: 10, price: 58 },
          breakdown: { type: 'point', i: 12, price: 50 },
          retest: { type: 'point', i: 13, price: 54 },      // the pullback into the broken line
          target: { type: 'level', price: 40 },             // wedge height projected down
          stop: { type: 'level', price: 63 }                // above the wedge apex / last high
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12),
        volume: patternVol(cs, 11)
      };
    },

    falling_wedge: function () {
      // converging down, breaks OUT up, RETESTS the broken upper line, then runs to
      // the measured target (wedge height projected up from the break) — bullish.
      var cs = grow(54, [
        { to: 44, bars: 2, reject: 1.5 }, { to: 52, bars: 2 },
        { to: 40, bars: 2, reject: 1.5 }, { to: 46, bars: 2 },
        { to: 38, bars: 2, reject: 1.5 }, { to: 42, bars: 1 },
        { to: 50, bars: 2 },                 // BREAK above the upper line (idx 12)
        { to: 46, bars: 1, reject: 1 },      // RETEST the broken line from above (idx 13)
        { to: 60, bars: 3 }                  // run to the measured target (idx 16)
      ]);
      return {
        candles: cs,
        anchors: {
          lowerA: { type: 'point', i: 1, price: 44 }, lowerB: { type: 'point', i: 9, price: 38 },
          upperA: { type: 'point', i: 3, price: 52 }, upperB: { type: 'point', i: 10, price: 42 },
          breakout: { type: 'point', i: 12, price: 50 },
          retest: { type: 'point', i: 13, price: 46 },
          target: { type: 'level', price: 60 },             // wedge height projected up
          stop: { type: 'level', price: 37 }                // below the wedge apex / last low
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12),
        volume: patternVol(cs, 11)
      };
    },

    head_and_shoulders: function () {
      // left shoulder, higher head, lower right shoulder; neckline ~50; breaks down,
      // RETESTS the neckline from below, then falls to the measured target (head→neckline
      // distance projected down = 50-(68-50) = 32). Stop sits above the right shoulder.
      var cs = grow(40, [
        { to: 58, bars: 3, reject: 2 }, { to: 50, bars: 2 },
        { to: 68, bars: 3, reject: 2 }, { to: 50, bars: 2 },
        { to: 58, bars: 3, reject: 2 },
        { to: 46, bars: 2 },                 // BREAK below the neckline (idx 14)
        { to: 50, bars: 1, reject: 1 },      // RETEST the neckline from below (idx 15)
        { to: 32, bars: 3 }                  // drop to the measured target (idx 18)
      ]); // LS idx2, head idx7, RS idx12, break idx14, retest idx15
      return {
        candles: cs,
        anchors: {
          leftShoulder: { type: 'point', i: 2, price: 58 }, head: { type: 'point', i: 7, price: 68 },
          rightShoulder: { type: 'point', i: 12, price: 58 }, breakdown: { type: 'point', i: 14, price: 46 },
          retest: { type: 'point', i: 15, price: 50 },
          neckline: { type: 'level', price: 50 }, target: { type: 'level', price: 32 },
          stop: { type: 'level', price: 60 }                 // just above the right shoulder
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.1),
        volume: patternVol(cs, 13)
      };
    },

    inverse_head_and_shoulders: function () {
      // mirror: breaks OUT above the neckline, RETESTS it from above, then runs to the
      // measured target (50 + (50-32) = 68). Stop sits below the right shoulder.
      var cs = grow(60, [
        { to: 42, bars: 3, reject: 2 }, { to: 50, bars: 2 },
        { to: 32, bars: 3, reject: 2 }, { to: 50, bars: 2 },
        { to: 42, bars: 3, reject: 2 },
        { to: 54, bars: 2 },                 // BREAK above the neckline (idx 14)
        { to: 50, bars: 1, reject: 1 },      // RETEST the neckline from above (idx 15)
        { to: 68, bars: 3 }                  // run to the measured target (idx 18)
      ]);
      return {
        candles: cs,
        anchors: {
          leftShoulder: { type: 'point', i: 2, price: 42 }, head: { type: 'point', i: 7, price: 32 },
          rightShoulder: { type: 'point', i: 12, price: 42 }, breakout: { type: 'point', i: 14, price: 54 },
          retest: { type: 'point', i: 15, price: 50 },
          neckline: { type: 'level', price: 50 }, target: { type: 'level', price: 68 },
          stop: { type: 'level', price: 40 }                 // just below the right shoulder
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.1),
        volume: patternVol(cs, 13)
      };
    },

    ascending_triangle: function () {
      // flat top (equal highs ~60), rising lows, breaks out up, RETESTS the flat top as
      // support, then runs to the measured target (triangle height ~14 projected up = 74).
      var cs = grow(46, [
        { to: 60, bars: 2, reject: 1.5 }, { to: 46, bars: 2 },
        { to: 60, bars: 2, reject: 1.5 }, { to: 51, bars: 2 },
        { to: 60, bars: 2, reject: 1.5 }, { to: 55, bars: 1 },
        { to: 66, bars: 2 },                 // BREAK above the flat top (idx 12)
        { to: 61, bars: 1, reject: 1 },      // RETEST the top as support (idx 13)
        { to: 74, bars: 3 }                  // run to the measured target (idx 16)
      ]);
      return {
        candles: cs,
        anchors: {
          top: { type: 'level', price: 60 },
          lowerA: { type: 'point', i: 3, price: 46 }, lowerB: { type: 'point', i: 10, price: 55 },
          breakout: { type: 'point', i: 12, price: 66 },
          retest: { type: 'point', i: 13, price: 61 },
          target: { type: 'level', price: 74 },              // triangle height projected up
          stop: { type: 'level', price: 55 }                 // below the breakout / last higher low
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12),
        volume: patternVol(cs, 11)
      };
    },

    descending_triangle: function () {
      // flat bottom (equal lows ~40), falling highs, breaks down, RETESTS the flat bottom
      // as resistance, then falls to the measured target (triangle height ~14 down = 26).
      var cs = grow(54, [
        { to: 40, bars: 2, reject: 1.5 }, { to: 54, bars: 2 },
        { to: 40, bars: 2, reject: 1.5 }, { to: 49, bars: 2 },
        { to: 40, bars: 2, reject: 1.5 }, { to: 45, bars: 1 },
        { to: 34, bars: 2 },                 // BREAK below the flat bottom (idx 12)
        { to: 39, bars: 1, reject: 1 },      // RETEST the bottom as resistance (idx 13)
        { to: 26, bars: 3 }                  // fall to the measured target (idx 16)
      ]);
      return {
        candles: cs,
        anchors: {
          bottom: { type: 'level', price: 40 },
          upperA: { type: 'point', i: 3, price: 54 }, upperB: { type: 'point', i: 10, price: 45 },
          breakdown: { type: 'point', i: 12, price: 34 },
          retest: { type: 'point', i: 13, price: 39 },
          target: { type: 'level', price: 26 },              // triangle height projected down
          stop: { type: 'level', price: 45 }                 // above the breakdown / last lower high
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12),
        volume: patternVol(cs, 11)
      };
    },

    bull_flag: function () {
      // strong pole up (40→66, height ≈ 20), a slight downward flag, breakout, a brief
      // RETEST of the flag high, then a run to the measured target (pole height projected
      // up from the pole top = 66+20 = 86 — arithmetically honest). Exposes the flag
      // channel edges + the measured target and a stop below the flag.
      var cs = grow(40, [
        { to: 66, bars: 4 },                 // pole (idx 0–3)  height ≈ 20
        { to: 60, bars: 2, reject: 1 }, { to: 63, bars: 1 },
        { to: 57, bars: 2 }, { to: 60, bars: 1 },   // flag (idx 4–9)
        { to: 72, bars: 2 },                 // BREAK above the flag (idx 11)
        { to: 66, bars: 1, reject: 1 },      // RETEST the flag high (idx 12)
        { to: 86, bars: 3 }                  // run to the pole-height target (idx 15)
      ]);
      return {
        candles: cs,
        anchors: {
          poleBottom: { type: 'point', i: 0, price: cs[0][1] }, poleTop: { type: 'point', i: 3, price: 66 },
          flagA: { type: 'point', i: 4, price: 60 }, flagB: { type: 'point', i: 9, price: 60 },
          breakout: { type: 'point', i: 11, price: 72 },
          retest: { type: 'point', i: 12, price: 66 },
          target: { type: 'level', price: 86 },              // poleTop(66) + pole height(20)
          stop: { type: 'level', price: 56 }                 // below the flag / breakout base
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.1),
        volume: patternVol(cs, 10)
      };
    },

    /* ── TRADING TOOLS (Course 2 / 12–15) ─────────────────────────────────── */

    /* fibonacci — an up-impulse (low→high), a retracement into the golden pocket
       (~0.618), and a bounce. The fib grid is anchored to the TRUE DRAWN EXTREMES of
       the impulse — swingLow = the lowest wick at the impulse origin, swingHigh = the
       highest wick at the impulse top — and fib() is computed from those, so the 0.618
       line lands on the retrace by construction (not by luck of hardcoded constants).
       The continuation stops BELOW the swing high, so the swing high stays the highest
       point on screen and the tool reads as correctly anchored. */
    fibonacci: function () {
      // grow the impulse + retrace + partial bounce first, so we can read the real wicks.
      var cs = grow(40, [
        { to: 80, bars: 5, reject: 2 },   // impulse up (idx 0–4); reject prints the true swing-high wick
        { to: 55, bars: 3 },              // retrace into the golden pocket (~0.618)
        { to: 76, bars: 4 }               // bounce / continuation (stays below the swing high)
      ]);
      var swLowWick = cs[0][2];           // true lowest wick at the impulse origin
      var swHighWick = cs[4][3];          // true highest wick at the impulse top
      var rng = swHighWick - swLowWick;
      function fib(r) { return r2(swHighWick - r * rng); }   // retrace from the real high
      return {
        candles: cs,
        anchors: {
          swingLow: { type: 'point', i: 0, price: swLowWick },
          swingHigh: { type: 'point', i: 4, price: swHighWick },
          bounce: { type: 'point', i: 7, price: 55 },
          fib382: { type: 'level', price: fib(0.382) },
          fib500: { type: 'level', price: fib(0.5) },
          fib618: { type: 'level', price: fib(0.618) },
          fib786: { type: 'level', price: fib(0.786) }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* ichimoku — the full Ichimoku Kinko Hyo: Tenkan (blue), Kijun (yellow), Chikou
       lagging span (purple), and the Kumo cloud (green bullish / red bearish) projected
       forward into open space on the right. The cloud is REALISTIC because it's built
       from far more history than is shown: we generate a long price path across several
       market phases (accumulation → trends → a correction → recovery → pullback), compute
       the full Ichimoku on ALL of it with crypto settings (10/30/60, displaced 30), then
       DISPLAY only the recent window. So the cloud at the left edge already reflects ~60
       periods of OFF-SCREEN data — varied thickness (thin pockets / thick walls) and flat
       Senkou-B plateaus, exactly like a real chart. Price pulls back to the Kijun and
       bounces, then runs above a green cloud. */
    ichimoku: function () {
      var full = grow(44, [
        { to: 46, bars: 4 }, { to: 42, bars: 4 }, { to: 47, bars: 4 }, { to: 43, bars: 4 }, { to: 48, bars: 4 }, // accumulation range
        { to: 60, bars: 6 }, { to: 55, bars: 3 }, { to: 68, bars: 6 },                                            // uptrend leg 1 (+ pullback)
        { to: 72, bars: 3 }, { to: 66, bars: 3 }, { to: 73, bars: 3 }, { to: 67, bars: 3 },                       // distribution range
        { to: 56, bars: 6 }, { to: 62, bars: 3 }, { to: 54, bars: 5 },                                            // correction
        { to: 60, bars: 4 }, { to: 55, bars: 4 }, { to: 61, bars: 4 },                                            // recovery range
        { to: 78, bars: 7 }, { to: 72, bars: 3 }, { to: 88, bars: 7 },                                            // uptrend leg 2 (+ pullback)
        { to: 82, bars: 3 }, { to: 87, bars: 3 }, { to: 80, bars: 3 },                                            // consolidation
        { to: 78, bars: 3, reject: 2 },                                                                           // pullback taps the Kijun
        { to: 104, bars: 8 }                                                                                      // rally above the cloud
      ], { noise: 0.16 });
      // full Ichimoku on the whole history (crypto 10/30/60, displaced 30)…
      var ik = ichimoku(full, { conv: 10, base: 30, span: 60, disp: 30 });
      // …then show only the recent window; the cloud here reflects ~60 bars of prior data.
      var DISPLAY = 44, start = full.length - DISPLAY;
      var cs = full.slice(start);
      var tenkan = ik.tenkan.slice(start), kijun = ik.kijun.slice(start), chikou = ik.chikou.slice(start);
      var spanA = ik.spanA.slice(start), spanB = ik.spanB.slice(start);   // length DISPLAY + disp (leading cloud kept)
      // axis fits the displayed candles + every shown Ichimoku value
      var lo = Infinity, hi = -Infinity;
      for (var i = 0; i < cs.length; i++) { if (cs[i][2] < lo) lo = cs[i][2]; if (cs[i][3] > hi) hi = cs[i][3]; }
      [tenkan, kijun, spanA, spanB, chikou].forEach(function (arr) {
        arr.forEach(function (v) { if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; } });
      });
      var pad = (hi - lo) * 0.1;
      // Find the last bullish Tenkan-over-Kijun cross BEFORE the final rally, so a lesson
      // can pin the actual TK-cross the narration names (not a guessed candle). Fall back
      // to the pullback bar if none is detected.
      var tkI = 35;
      for (var t = 1; t < tenkan.length; t++) {
        if (tenkan[t - 1] != null && kijun[t - 1] != null &&
            tenkan[t - 1] <= kijun[t - 1] && tenkan[t] > kijun[t]) tkI = t;
      }
      var kijunAtPullback = kijun[35] != null ? kijun[35] : 75;
      var tenkanAtPullback = tenkan[35] != null ? tenkan[35] : 78;
      // a below-cloud stop = under the thicker of the two cloud lines at the pullback bar
      var cloudBotAtPull = Math.min(
        spanA[35] != null ? spanA[35] : 70, spanB[35] != null ? spanB[35] : 70
      );
      return {
        candles: cs,
        lead: ik.disp,                              // blank slots on the right for the leading cloud
        overlays: [
          // Senkou Span A & B ARE the two edges of the Kumo cloud — label them so the
          // cloud reads as bounded lines, not just a shaded band (drawn first = behind
          // Tenkan/Kijun). Span A green, Span B red, per convention.
          { points: spanA, color: '#28c878', width: 1.0, label: 'Senkou Span A' },
          { points: spanB, color: '#f23d5c', width: 1.0, label: 'Senkou Span B' },
          { points: tenkan, color: '#5cc8ff', width: 1.4, label: 'Tenkan' },
          { points: kijun, color: '#ffcf3f', width: 1.6, label: 'Kijun' },
          { points: chikou, color: '#b06cff', width: 1.2, label: 'Chikou' }
        ],
        cloud: { a: spanA, b: spanB, bold: true },
        anchors: {
          pullback: { type: 'point', i: 35, price: 75 },     // price taps the Kijun and bounces
          tkCross: { type: 'point', i: tkI, price: r2(tenkan[tkI] != null ? tenkan[tkI] : 70) },  // Tenkan crosses above Kijun = bullish
          kijunLevel: { type: 'level', price: r2(kijunAtPullback) },    // dynamic Kijun support
          tenkanLevel: { type: 'level', price: r2(tenkanAtPullback) },  // faster Tenkan line
          cloudThick: { type: 'point', i: 20, price: r2(cs[20] ? cs[20][1] : 70) },  // a visibly thick cloud pocket = stronger S/R
          stop: { type: 'level', price: r2(cloudBotAtPull - 3) },       // below the cloud = invalidation
          kijunStop: { type: 'level', price: r2(kijunAtPullback - 2) }, // "risk just below the Kijun" (L26)
          aboveCloud: { type: 'point', i: cs.length - 1, price: 104 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: { min: r2(lo - pad), max: r2(hi + pad) }
      };
    },

    /* liquidation — a long with entry(50)/stop(45) and two liquidation lines: one far
       below (liqSafe 38 = low leverage) and one just under entry (liqDanger 48 = high
       leverage). The shakeout dip wicks to ~46.5 — BELOW the danger liq (48) so the
       over-leveraged trader is LIQUIDATED, but ABOVE both the stop (45) and the safe
       liq (38) so the low-leverage trader SURVIVES and catches the rally. The dip is
       hand-placed so its low is controlled exactly between the two liq lines.
       Anchors: entry/stop/liqSafe/liqDanger levels + dip + liqFire (over-lev liq) + top. */
    liquidation: function () {
      var lead = grow(52, [{ to: 50, bars: 2 }]);        // ease down to the entry level
      var dip = [50, 51, 46.5, 51.5];                     // shakeout: wick 46.5 (danger<46.5<stop? no)
      // NB: 46.5 is BELOW liqDanger(48) → high-lev liquidated; ABOVE stop(45)+liqSafe(38) → low-lev holds
      var rally = grow(51, [{ to: 62, bars: 5 }]);
      var cs = lead.concat([dip], rally);
      var dipI = lead.length;                             // index of the dip candle
      return {
        candles: cs,
        anchors: {
          entry: { type: 'level', price: 50 },
          stop: { type: 'level', price: 45 },
          liqSafe: { type: 'level', price: 38 },
          liqDanger: { type: 'level', price: 48 },
          dip: { type: 'point', i: dipI, price: 46.5 },
          liqFire: { type: 'point', i: dipI, price: 48 },  // over-leverage liquidation fires here
          top: { type: 'point', i: cs.length - 1, price: 62 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: { min: 35, max: 66 }
      };
    },

    /* rsi — a fading-momentum top with a REAL Wilder RSI of the closes. A clean
       impulse prints high1 with RSI overbought (>70); then a stalling, choppy crawl
       makes a MARGINAL higher high (high2) on which RSI prints a clearly lower high
       and never reclaims overbought — a textbook bearish divergence — before the
       roll-over into oversold. The divergence is whatever the price genuinely does
       (RSI is computed, not drawn). 30/70 bands on the sub-panel. */
    rsi: function () {
      var cs = grow(50, [
        { to: 50, bars: 3 }, { to: 45, bars: 2 },          // lead-in (seeds the RSI)
        { to: 64, bars: 3 },                                // clean impulse 1 → high1 (idx 7)
        { to: 51, bars: 3 },                                // pullback
        { to: 62, bars: 2 }, { to: 57, bars: 1 },           // crawl up / dip
        { to: 67, bars: 2 }, { to: 62, bars: 1 },           // crawl up / dip
        { to: 70, bars: 2 }, { to: 66, bars: 1 },           // crawl up / dip (momentum fading)
        { to: 73, bars: 2 },                                // marginal higher high → high2 (idx 21)
        { to: 43, bars: 5 }                                 // roll over into oversold
      ]);
      return {
        candles: cs,
        anchors: {
          high1: { type: 'point', i: 7, price: 64 },        // RSI ~80 (overbought)
          high2: { type: 'point', i: 21, price: 73 },       // higher price, RSI ~69 (lower high)
          oversold: { type: 'point', i: cs.length - 1, price: 43 }
        },
        subpanel: { type: 'rsi', series: rsiOf(cs, 6), bands: [{ v: 30 }, { v: 70 }], min: 0, max: 100, label: 'RSI' },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* ── SENTIMENT DATA (Course 4 / 08–11) ────────────────────────────────────
       A shared topping price path (uptrend → higher high at idx 12 → reversal)
       paired with each sentiment series in a sub-panel, to show how the data
       reveals crowded / offside positioning at the top. */

    funding_rate: function () {
      var cs = grow(40, [{ to: 60, bars: 5 }, { to: 54, bars: 3 }, { to: 72, bars: 5 }, { to: 50, bars: 5 }]);
      return {
        candles: cs,
        anchors: {
          rising: { type: 'point', i: 8, price: 66 },   // trend + funding climbing together
          top: { type: 'point', i: 12, price: 72 },
          flip: { type: 'point', i: 15, price: 58 },     // funding crosses zero into negative
          reversal: { type: 'point', i: cs.length - 1, price: 50 }
        },
        subpanel: {
          type: 'histogram', min: -0.6, max: 1, label: 'Funding',
          series: [0.1, 0.2, 0.3, 0.35, 0.4, 0.3, 0.25, 0.3, 0.5, 0.65, 0.8, 0.9, 0.95, 0.6, 0.2, -0.2, -0.4, -0.3]
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    open_interest: function () {
      var cs = grow(40, [{ to: 60, bars: 5 }, { to: 54, bars: 3 }, { to: 72, bars: 5 }, { to: 50, bars: 5 }]);
      return {
        candles: cs,
        anchors: {
          rising: { type: 'point', i: 8, price: 66 },   // OI rising WITH the trend = new money
          top: { type: 'point', i: 12, price: 72 },      // OI peaks with price
          reversal: { type: 'point', i: cs.length - 1, price: 50 }   // OI falls = positions unwinding
        },
        subpanel: {
          type: 'line', color: '#5cc8ff', min: 0, max: 1, label: 'Open Interest',
          series: [0.2, 0.3, 0.4, 0.45, 0.5, 0.52, 0.55, 0.6, 0.7, 0.8, 0.88, 0.93, 0.96, 0.9, 0.8, 0.7, 0.6, 0.5]
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    cumulative_delta: function () {
      var cs = grow(40, [{ to: 60, bars: 5 }, { to: 54, bars: 3 }, { to: 72, bars: 5 }, { to: 50, bars: 5 }]);
      return {
        candles: cs,
        anchors: { high1: { type: 'point', i: 4, price: 60 }, top: { type: 'point', i: 12, price: 72 } },
        subpanel: {
          type: 'line', color: '#ffcf3f', min: 0, max: 1, label: 'Cum. Delta',
          series: [0.2, 0.4, 0.6, 0.75, 0.85, 0.7, 0.6, 0.62, 0.66, 0.68, 0.69, 0.7, 0.7, 0.55, 0.4, 0.25, 0.15, 0.1]
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    future_basis: function () {
      // premium blows out at the top, collapses into a DEEP backwardation extreme at the
      // low, then snaps back toward zero as price bottoms — both halves of the signal
      // (contango extreme = euphoric top; backwardation extreme + snapback = bottom).
      var cs = grow(40, [{ to: 60, bars: 5 }, { to: 54, bars: 3 }, { to: 72, bars: 5 }, { to: 50, bars: 5 }, { to: 56, bars: 3 }]);
      return {
        candles: cs,
        anchors: {
          top: { type: 'point', i: 12, price: 72 },        // premium extreme AT the top (basis 0.9)
          rejection: { type: 'point', i: 13, price: 66 },  // rejection / premium collapse begins
          discount: { type: 'point', i: 16, price: 52 },   // basis crosses zero into discount
          extreme: { type: 'point', i: 17, price: 50 },    // deepest backwardation AT the price low
          snapback: { type: 'point', i: 19, price: 54 },   // basis snapping back toward zero = bottom signal
          reversal: { type: 'point', i: 17, price: 50 }
        },
        subpanel: {
          type: 'histogram', min: -1, max: 1, label: 'Basis',
          series: [0.1, 0.15, 0.25, 0.3, 0.35, 0.3, 0.28, 0.32, 0.5, 0.6, 0.75, 0.85, 0.9, 0.5, 0.1, -0.35, -0.6, -0.8, -0.5, -0.25, -0.1]
        },
        stages: { premium: 14, collapse: 18, all: cs.length }, order: ['premium', 'collapse', 'all'], yhint: yspan(cs, 0.12)
      };
    },

    /* ── PROPRIETARY INDICATOR TOOLS (Course 4 / 13–18) ───────────────────────
       color_tool colours each candle using the tool's real palette. The skeleton is a
       two-swing W: it tags a resistance (64) TWICE (return-and-reject at i4, i14) and a
       support (44) TWICE (return-and-bounce at i9, i19) — so the level tools (PAL/Crayons)
       show levels price actually REACTS to repeatedly, not once-touched swing points.
       MOMENTUM schemes (Trend Buddy / Heuristics / PAL / Crayons) flip color right AFTER
       each swing: flipDown1@i6 / flipUp1@i11 / flipDown2@i16 / flipUp2@i21 — so a "colour
       flips" marker lands on the transition candle, not the extreme. The EXHAUSTION scheme
       (Genie) paints RED into each top (i3-5, i13-15) and GREEN into each bottom (i8-10,
       i18-20), so a "red hues → local top" / "green hues → local bottom" marker sits on
       the correctly-coloured candle. params.scheme picks the palette. */
    color_tool: function (params) {
      var scheme = (params && params.scheme) || 'trendbuddy';
      var cs = grow(44, [
        { to: 64, bars: 5, reject: 1.5 },   // top1 → resistance touch1 (i4)
        { to: 44, bars: 5, reject: 1.5 },   // bot1 → support touch1    (i9)
        { to: 64, bars: 5, reject: 1.5 },   // top2 → resistance touch2 (i14)
        { to: 44, bars: 5, reject: 1.5 },   // bot2 → support touch2    (i19)
        { to: 58, bars: 3 }                 // drift to mid             (i22)
      ]);
      // params.script → the SCRIPTED Trend Buddy colour taxonomy instead of the auto
      // momentum painter: blue unconfirmed / lime confirmed / red canceled / green
      // reconfirmed reversals, orange+fuchsia pivots, purple breakout, yellow combo,
      // turquoise entry closes — each mapped to a named anchor so a lesson can walk
      // the taxonomy candle by candle (L13; mirrors the engine chapter's own colours).
      var N = '#5b5570', TQ = '#00d4d4', colors, scripted = {};
      if (params && params.script) {
        colors = [N, '#5cc8ff', '#a8ff5b', TQ, '#ff9f43', '#f23d5c', '#ff2e88', '#ff2e88', '#ff2e88',
                  '#ff2ef5', '#5cc8ff', '#21d196', TQ, TQ, '#ff9f43', '#f23d5c', '#ff2e88', '#ff2e88', '#ff2e88',
                  '#ff2ef5', '#b06cff', '#ffcf3f', TQ];
        var sp = function (i) { return { type: 'point', i: i, price: cs[i][1] }; };
        scripted = {
          unconfirmed: sp(1),      // blue — unconfirmed reversal
          confirmed: sp(2),        // lime — confirmed reversal
          entryClose: sp(3),       // turquoise — enter within 1–2 closes
          pivotTop: sp(4),         // orange — pivot at the top
          canceled: sp(5),         // red — reversal canceled
          pivotBottom: sp(9),      // fuchsia — pivot at the bottom
          reconfirmed: sp(11),     // green — reconfirmed reversal
          entryClose2: sp(12),
          breakoutCandle: sp(20),  // purple — breakout
          combo: sp(21)            // yellow — combined signal
        };
      } else {
        colors = schemeColors(cs, scheme);
      }
      var out = {
        candles: cs,
        candleColors: colors,
        anchors: {
          // PAL overlay markers (L14): AP letters + exhaustion circles at the level touches
          apSell: { type: 'point', i: 14, price: 64 },   // red AP — large SELLER absorbing at resistance
          apBuy: { type: 'point', i: 9, price: 44 },     // green AP — large BUYER absorbing at support
          circleTop: { type: 'point', i: 4, price: 64 }, // exhaustion circle into the top
          circleBot: { type: 'point', i: 19, price: 44 },// exhaustion circle into the bottom
          // swing extremes (for Genie exhaustion hues — top is red, bottom is green)
          top: { type: 'point', i: 4, price: 64 },
          bottom: { type: 'point', i: 19, price: 44 },
          top2: { type: 'point', i: 14, price: 64 },
          bottom1: { type: 'point', i: 9, price: 44 },
          // repeated S/R touches (for PAL/Crayons — the level is reacted to twice)
          resTouch1: { type: 'point', i: 4, price: 64 },
          resTouch2: { type: 'point', i: 14, price: 64 },
          supTouch1: { type: 'point', i: 9, price: 44 },
          supTouch2: { type: 'point', i: 19, price: 44 },
          // momentum colour-flip candles (Trend Buddy / Heuristics / Crayons)
          flipDown1: { type: 'point', i: 6, price: 55.87 },
          flipUp1: { type: 'point', i: 11, price: 51.37 },
          flipDown2: { type: 'point', i: 16, price: 55.45 },
          flipUp2: { type: 'point', i: 21, price: 52.4 },
          resLevel: { type: 'level', price: 64 },
          supLevel: { type: 'level', price: 44 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
      for (var k in scripted) out.anchors[k] = scripted[k];
      return out;
    },

    /* liquidation_levels — clusters of leveraged liquidation prices above and below price
       (liquidity magnets). Price grinds UP into the dense upper cluster (clusterHi 62),
       spikes through it on a wick (the cascade of forced short-covers, wick ≈ 69), then —
       with no fuel left — REVERSES and falls all the way to TAG the lower cluster
       (clusterLo 46, a reachable target). BOTH magnets are interacted with. A stop sits
       just above the spike. Progressive stages (approach → pierce → reversal) let a lesson
       reveal the trade unfolding instead of showing the whole move at once.
       Density-band anchors (bandHi/bandLo) let a lesson draw the clusters as zones; the
       upper band is DENSER (draw it hotter/deeper) than the lower. */
    liquidation_levels: function () {
      var cs = grow(48, [
        { to: 52, bars: 3 }, { to: 46, bars: 2 }, { to: 58, bars: 4 },   // grind up (idx0–8)
        { to: 64, bars: 2, reject: 3 },   // SPIKE: wick pierces clusterHi up to ≈69 (idx10)
        { to: 52, bars: 3 },              // reject / reverse down (idx13)
        { to: 46, bars: 3, reject: 1 },   // fall to TAG the lower cluster (idx16)
        { to: 54, bars: 3 }               // REBOUND off the swept long cluster (the payoff, idx19)
      ]);
      return {
        candles: cs,
        anchors: {
          clusterHi: { type: 'level', price: 62 },   // dense short-liquidation cluster above
          clusterLo: { type: 'level', price: 46 },   // long-liquidation cluster below (reachable)
          bandHi: { type: 'level', price: 62 },       // draw as a zone: side:'above', deep/hot (denser)
          bandLo: { type: 'level', price: 46 },       // draw as a zone: side:'below', shallow (lighter)
          bandLo2: { type: 'level', price: 43 },      // lower edge of the 2nd (lower) heatmap band: heatmap of:'bandLo' to:'bandLo2'
          magnet: { type: 'point', i: 10, price: 64 },       // price drawn up into the cluster
          cascade: { type: 'point', i: 10, price: 66 },      // the spike wick — forced closures
          reversalPivot: { type: 'point', i: 11, price: 60 },// no fuel left → turns down
          stop: { type: 'level', price: 70 },                 // just above the spike high
          reversal: { type: 'point', i: 16, price: 46 },      // tags the lower cluster (target)
          rebound: { type: 'point', i: cs.length - 1, price: 54 }  // bullish rebound off the swept longs (mini-DBS)
        },
        // approach: grind up (pre-spike); pierce: + spike; reversal: tags the lower
        // cluster; rebound/all: + the bounce off it. Default (last in order) = full story.
        stages: { approach: 9, pierce: 12, reversal: 17, rebound: cs.length, all: cs.length },
        order: ['approach', 'pierce', 'reversal', 'rebound'], yhint: { min: 42, max: 72 }
      };
    },

    /* under_over — the STRUCTURE (vs a pool): price breaks UNDER the range low, spends
       TIME basing below it, RECLAIMS the level, then RETESTS it from above before
       reversing up. The time-below + retest is exactly what separates a liquidity
       structure from a single-wick pool (Course 4 / 04–05). Staged so a lesson can
       reveal break → basing → reclaim → retest → reversal sequentially. */
    under_over: function () {
      var cs = grow(56, [
        { to: 50, bars: 3 }, { to: 56, bars: 3 }, { to: 50.5, bars: 3 }, { to: 56.5, bars: 3 }, // the range (~50–57)
        { to: 46, bars: 2 },                                   // BREAK under the range low (i13)
        { to: 44, bars: 2 }, { to: 46.5, bars: 2 }, { to: 44.5, bars: 2 },   // TIME below — basing (i14–19)
        { to: 52, bars: 2 },                                   // RECLAIM back above the low (i21)
        { to: 50.5, bars: 1, reject: 1.2 },                    // RETEST of the reclaimed level (i22)
        { to: 62, bars: 4 }                                    // reversal up (i26)
      ], { noise: 0.25, wick: 0.45 });
      return {
        candles: cs,
        anchors: {
          rangeLow: { type: 'level', price: 50 },
          rangeHigh: { type: 'level', price: 56.8 },
          breakdown: { type: 'point', i: 13, price: 46 },
          basing: { type: 'point', i: 17, price: 46.5 },      // time spent below = structure, not a wick
          reclaim: { type: 'point', i: 21, price: 52 },
          retest: { type: 'point', i: 22, price: 50.5 },      // the entry the course teaches
          target: { type: 'point', i: cs.length - 1, price: 62 }
        },
        stages: { break: 14, base: 20, reclaim: 22, retest: 23, all: cs.length },
        order: ['break', 'base', 'reclaim', 'retest', 'all'], yhint: yspan(cs, 0.1)
      };
    },

    /* over_under — bearish mirror of under_over: break ABOVE the range high, time
       basing above, reclaim below, retest from beneath, reversal down. */
    over_under: function () {
      var cs = grow(51, [
        { to: 57, bars: 3 }, { to: 51, bars: 3 }, { to: 56.5, bars: 3 }, { to: 50.5, bars: 3 }, // the range (~50–57)
        { to: 61, bars: 2 },                                   // BREAK above the range high (i13)
        { to: 63, bars: 2 }, { to: 60.5, bars: 2 }, { to: 62.5, bars: 2 },   // TIME above — basing (i14–19)
        { to: 55, bars: 2 },                                   // RECLAIM back below the high (i21)
        { to: 56.5, bars: 1, reject: 1.2 },                    // RETEST from beneath (i22)
        { to: 45, bars: 4 }                                    // reversal down (i26)
      ], { noise: 0.25, wick: 0.45 });
      return {
        candles: cs,
        anchors: {
          rangeHigh: { type: 'level', price: 57 },
          rangeLow: { type: 'level', price: 50.5 },
          breakout: { type: 'point', i: 13, price: 61 },
          basing: { type: 'point', i: 17, price: 60.5 },
          reclaim: { type: 'point', i: 21, price: 55 },
          retest: { type: 'point', i: 22, price: 56.5 },
          target: { type: 'point', i: cs.length - 1, price: 45 }
        },
        stages: { break: 14, base: 20, reclaim: 22, retest: 23, all: cs.length },
        order: ['break', 'base', 'reclaim', 'retest', 'all'], yhint: yspan(cs, 0.1)
      };
    },

    /* heuristics — the In Silico Heuristics tool: an MA CHANNEL (rolling highs/lows)
       painted over normal candles, plus exhaustion dots — GREEN dots = seller
       exhaustion into bottoms, RED dots = buyer exhaustion into tops. Bias comes from
       price's position relative to the channel; the dots mark take-profit spots.
       Anchors expose the channel-ride ("meat"), both dots, and the re-entry. */
    heuristics: function () {
      var cs = grow(46, [
        { to: 60, bars: 6 }, { to: 56, bars: 2 }, { to: 68, bars: 6 },   // trend w/ pullback (the meat)
        { to: 70, bars: 2, reject: 1.5 },                                 // top → buyer exhaustion (i15)
        { to: 58, bars: 5 },                                              // decline below the channel
        { to: 56, bars: 2, reject: 1.5 },                                 // bottom → seller exhaustion (i22)
        { to: 66, bars: 4 }                                               // recovery (i26)
      ], { noise: 0.2 });
      function sma(sel, w) {
        var out = [];
        for (var i = 0; i < cs.length; i++) {
          var s = 0, n = 0;
          for (var j = Math.max(0, i - w + 1); j <= i; j++) { s += sel(cs[j]); n++; }
          out.push(r2(s / n));
        }
        return out;
      }
      var chanHi = sma(function (c) { return c[3]; }, 6), chanLo = sma(function (c) { return c[2]; }, 6);
      return {
        candles: cs,
        overlays: [
          { points: chanHi, color: '#5cc8ff', width: 1.2, label: 'channel high' },
          { points: chanLo, color: '#5cc8ff', width: 1.2, label: 'channel low' }
        ],
        anchors: {
          meat: { type: 'point', i: 10, price: cs[10][1] },        // riding the channel = the meat of the trend
          redDot: { type: 'point', i: 15, price: cs[15][3] },      // buyer exhaustion into the top
          breakdown: { type: 'point', i: 19, price: cs[19][1] },   // price loses the channel → bias flips
          greenDot: { type: 'point', i: 22, price: cs[22][2] },    // seller exhaustion into the bottom
          reEntry: { type: 'point', i: cs.length - 2, price: cs[cs.length - 2][1] }
        },
        stages: { ride: 16, flip: 23, all: cs.length }, order: ['ride', 'flip', 'all'], yhint: yspan(cs, 0.12)
      };
    },

    /* ── ICHIMOKU MECHANISMS (Course 4 / 26–29) ────────────────────────────────
       Three moves that compute the REAL Ichimoku (crypto 10/30/60, disp 30) over a
       long off-screen history and expose the specific mechanism each lesson teaches
       as computed, verifiable anchors — nothing hand-painted. The two-pass trick:
       the cloud at bar i is computed from data `disp` bars earlier, so candles
       spliced near the right edge don't move the cloud they interact with. */

    /* ichimoku_cclamp — TENKAN/KIJUN DIVERGENCE: a blow-off leg stretches the Tenkan
       far away from the Kijun (the "C" shape) = overextension → price mean-reverts
       back to the Kijun. Counter-trend by nature. Anchors are computed off the real
       max TK gap, not guessed. */
    ichimoku_cclamp: function () {
      var full = grow(40, [
        { to: 46, bars: 5 }, { to: 42, bars: 4 }, { to: 47, bars: 5 }, { to: 44, bars: 4 },  // base
        { to: 52, bars: 6 }, { to: 49, bars: 3 }, { to: 56, bars: 6 }, { to: 53, bars: 4 },  // steady climb
        { to: 60, bars: 5 }, { to: 57, bars: 3 },
        { to: 78, bars: 7 },                                    // BLOW-OFF: Tenkan tears away from Kijun
        { to: 63, bars: 5 }, { to: 66, bars: 3 }                // mean reversion tags the Kijun
      ], { noise: 0.16 });
      var ik = ichimoku(full, { conv: 10, base: 30, span: 60, disp: 30 });
      var DISPLAY = 42, start = full.length - DISPLAY;
      var cs = full.slice(start);
      var tenkan = ik.tenkan.slice(start), kijun = ik.kijun.slice(start), chikou = ik.chikou.slice(start);
      var spanA = ik.spanA.slice(start), spanB = ik.spanB.slice(start);
      // computed max Tenkan–Kijun gap = the clamp
      var gapI = 0, gapMax = -1;
      for (var i = 0; i < cs.length; i++) {
        if (tenkan[i] == null || kijun[i] == null) continue;
        var gp = tenkan[i] - kijun[i];
        if (gp > gapMax) { gapMax = gp; gapI = i; }
      }
      // first bar after the clamp where price trades back down to the Kijun
      var revI = cs.length - 1;
      for (var rv = gapI + 1; rv < cs.length; rv++) { if (cs[rv][2] <= kijun[rv]) { revI = rv; break; } }
      var lo = Infinity, hi = -Infinity;
      cs.forEach(function (c) { if (c[2] < lo) lo = c[2]; if (c[3] > hi) hi = c[3]; });
      [tenkan, kijun, spanA, spanB, chikou].forEach(function (arr) { arr.forEach(function (v) { if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; } }); });
      var pad = (hi - lo) * 0.1;
      return {
        candles: cs,
        lead: ik.disp,
        overlays: [
          { points: tenkan, color: '#5cc8ff', width: 1.4, label: 'Tenkan' },
          { points: kijun, color: '#ffcf3f', width: 1.6, label: 'Kijun' }
        ],
        cloud: { a: spanA, b: spanB, bold: true },
        anchors: {
          clampPeak: { type: 'point', i: gapI, price: r2(cs[gapI][1]) },       // max TK divergence — the C
          tenkanPeak: { type: 'level', price: r2(tenkan[gapI]) },
          kijunPeak: { type: 'level', price: r2(kijun[gapI]) },
          revert: { type: 'point', i: revI, price: r2(kijun[revI]) },          // mean reversion tags the Kijun
          kijunLevel: { type: 'level', price: r2(kijun[revI]) }
        },
        stages: { extend: gapI + 1, revert: cs.length, all: cs.length },
        order: ['extend', 'revert', 'all'], yhint: { min: r2(lo - pad), max: r2(hi + pad) }
      };
    },

    /* ichimoku_pocket — the KUMO POCKET: a thin stretch of cloud that acts like
       DBS/SSR — high probability of REJECTING price, strongest on the first test.
       Price rides above the cloud, pulls back INTO the thin pocket, and is rejected
       on the first touch. The pocket edges are the computed cloud values at the test
       bar (splice-safe: the cloud there comes from `disp` bars earlier). */
    ichimoku_pocket: function () {
      var lead = grow(44, [
        { to: 48, bars: 5 }, { to: 44, bars: 4 }, { to: 50, bars: 5 },                        // base
        { to: 62, bars: 8 },                                                                  // impulse up
        { to: 58, bars: 3 }, { to: 61, bars: 4 }, { to: 58.5, bars: 4 }, { to: 61.5, bars: 4 }, // drift
        { to: 59, bars: 4 }, { to: 61, bars: 4 },                                             //   …keeps the cloud modest
        { to: 66, bars: 6 }, { to: 64, bars: 3 }, { to: 67, bars: 5 }                          // rise + hold above the pocket
      ], { noise: 0.16 });
      // pass 1: where will the cloud sit at the test bar? (cloud is displacement-fixed —
      // the values at the test slot come from `disp` bars earlier, so splicing is safe)
      var probePath = lead.concat([[67, 67, 66, 68], [67, 67, 66, 68], [67, 67, 66, 68], [67, 67, 66, 68]]);
      var tAbs = lead.length + 3;   // pullback (3 bars) then the test bar
      var ikP = ichimoku(probePath, { conv: 10, base: 30, span: 60, disp: 30 });
      var pTop = Math.max(ikP.spanA[tAbs], ikP.spanB[tAbs]), pBot = Math.min(ikP.spanA[tAbs], ikP.spanB[tAbs]);
      // pullback down to the pocket, then the test candle: wick INTO the pocket, close back out
      var pull = grow(lastClose(lead), [{ to: pTop + 1.5, bars: 3 }], { noise: 0.16, wick: 0.3 });
      var test = [r2(pTop + 1.5), r2(pTop + 1.2), r2(pBot + (pTop - pBot) * 0.35), r2(pTop + 2.6)];
      var rally = grow(pTop + 1.2, [{ to: pTop + 11, bars: 5 }], { noise: 0.16 });
      var full = lead.concat(pull, [test], rally);
      var ik = ichimoku(full, { conv: 10, base: 30, span: 60, disp: 30 });
      var DISPLAY = 42, start = full.length - DISPLAY;
      var cs = full.slice(start);
      var testI = tAbs - start;
      var tenkan = ik.tenkan.slice(start), kijun = ik.kijun.slice(start), chikou = ik.chikou.slice(start);
      var spanA = ik.spanA.slice(start), spanB = ik.spanB.slice(start);
      var lo = Infinity, hi = -Infinity;
      cs.forEach(function (c) { if (c[2] < lo) lo = c[2]; if (c[3] > hi) hi = c[3]; });
      [tenkan, kijun, spanA, spanB].forEach(function (arr) { arr.forEach(function (v) { if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; } }); });
      var pad = (hi - lo) * 0.1;
      return {
        candles: cs,
        lead: ik.disp,
        overlays: [
          { points: tenkan, color: '#5cc8ff', width: 1.4, label: 'Tenkan' },
          { points: kijun, color: '#ffcf3f', width: 1.6, label: 'Kijun' }
        ],
        cloud: { a: spanA, b: spanB },
        anchors: {
          pocketTop: { type: 'level', price: r2(pTop) },      // thin-cloud pocket = S/R zone
          pocketBot: { type: 'level', price: r2(pBot) },
          firstTest: { type: 'point', i: testI, price: r2(cs[testI][2]) },   // wick into the pocket
          rejection: { type: 'point', i: testI, price: r2(cs[testI][1]) },   // …closes back above = rejected
          ride: { type: 'point', i: Math.max(0, testI - 6), price: r2(cs[Math.max(0, testI - 6)][1]) },
          bounce: { type: 'point', i: cs.length - 1, price: r2(cs[cs.length - 1][1]) }
        },
        stages: { approach: testI, test: testI + 1, all: cs.length },
        order: ['approach', 'test', 'all'], yhint: { min: r2(lo - pad), max: r2(hi + pad) }
      };
    },

    /* ichimoku_e2e — EDGE TO EDGE: after a decisive CLOSE INSIDE the cloud, price
       tends to traverse to the far edge. Built on a WIDE cloud (the big-R version the
       course favours): edgeNear/edgeFar are the computed cloud edges at the entry bar,
       the entry candle is spliced to close just inside the near edge, and the travel
       leg targets the computed far edge. Stop sits back outside the entered edge. */
    ichimoku_e2e: function () {
      var lead = grow(40, [
        { to: 44, bars: 5 }, { to: 41, bars: 4 }, { to: 46, bars: 5 },                        // base
        { to: 68, bars: 10 }, { to: 64, bars: 3 }, { to: 74, bars: 6 },                        // strong trend → WIDE cloud `disp` later
        { to: 70, bars: 4 }, { to: 73, bars: 4 }, { to: 71, bars: 4 }, { to: 74, bars: 5 },    // long stall so the entry
        { to: 72, bars: 4 }                                                                    //   sits over that wide cloud
      ], { noise: 0.16 });
      // pass 1: cloud at the entry bar (displacement-fixed, splice-safe)
      var probePath = lead.concat([[72, 72, 71, 73], [72, 72, 71, 73], [72, 72, 71, 73], [72, 72, 71, 73],
                                   [72, 72, 71, 73], [72, 72, 71, 73], [72, 72, 71, 73], [72, 72, 71, 73], [72, 72, 71, 73]]);
      var eAbs = lead.length + 8;   // roll-over (7 bars) + approach bar, then the entry candle
      var ikP = ichimoku(probePath, { conv: 10, base: 30, span: 60, disp: 30 });
      var eTop = Math.max(ikP.spanA[eAbs], ikP.spanB[eAbs]), eBot = Math.min(ikP.spanA[eAbs], ikP.spanB[eAbs]);
      var rollover = grow(lastClose(lead), [{ to: eTop + 4, bars: 7 }], { noise: 0.16, wick: 0.3 });
      var approach = [r2(eTop + 4), r2(eTop + 1.2), r2(eTop + 0.6), r2(eTop + 4.6)];        // sinks onto the cloud top
      var entry = [r2(eTop + 1.2), r2(eTop - (eTop - eBot) * 0.18), r2(eTop - (eTop - eBot) * 0.24), r2(eTop + 1.8)]; // decisive close INSIDE
      var travel = grow(entry[1], [{ to: eBot + (eTop - eBot) * 0.35, bars: 3 }, { to: eBot, bars: 3, reject: 0.8 }], { noise: 0.18 });
      var full = lead.concat(rollover, [approach, entry], travel);
      var ik = ichimoku(full, { conv: 10, base: 30, span: 60, disp: 30 });
      var DISPLAY = 42, start = full.length - DISPLAY;
      var cs = full.slice(start);
      var entryI = eAbs - start;
      var tenkan = ik.tenkan.slice(start), kijun = ik.kijun.slice(start), chikou = ik.chikou.slice(start);
      var spanA = ik.spanA.slice(start), spanB = ik.spanB.slice(start);
      // prerequisite anchors: the latest WEAK (bearish) TK cross at/before entry + chikou
      var tkI = 0;
      for (var t = 1; t <= entryI; t++) {
        if (tenkan[t - 1] != null && kijun[t - 1] != null && tenkan[t - 1] >= kijun[t - 1] && tenkan[t] < kijun[t]) tkI = t;
      }
      var lo = Infinity, hi = -Infinity;
      cs.forEach(function (c) { if (c[2] < lo) lo = c[2]; if (c[3] > hi) hi = c[3]; });
      [tenkan, kijun, spanA, spanB].forEach(function (arr) { arr.forEach(function (v) { if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; } }); });
      var pad = (hi - lo) * 0.1;
      return {
        candles: cs,
        lead: ik.disp,
        overlays: [
          { points: tenkan, color: '#5cc8ff', width: 1.4, label: 'Tenkan' },
          { points: kijun, color: '#ffcf3f', width: 1.6, label: 'Kijun' },
          { points: chikou, color: '#b06cff', width: 1.2, label: 'Chikou' }
        ],
        cloud: { a: spanA, b: spanB, bold: true },
        anchors: {
          edgeNear: { type: 'level', price: r2(eTop) },        // the edge price entered through
          edgeFar: { type: 'level', price: r2(eBot) },         // the target edge
          entryClose: { type: 'point', i: entryI, price: r2(cs[entryI][1]) },  // clean strong close inside the kumo
          tkCross: { type: 'point', i: tkI, price: r2(tenkan[tkI] != null ? tenkan[tkI] : cs[tkI][1]) },  // weak TK crossover
          chikouRef: { type: 'point', i: Math.max(0, entryI - 4), price: r2(chikou[Math.max(0, entryI - 4)] != null ? chikou[Math.max(0, entryI - 4)] : cs[Math.max(0, entryI - 4)][1]) },
          stop: { type: 'level', price: r2(eTop + (eTop - eBot) * 0.18) },     // back outside the entered edge
          exit: { type: 'point', i: cs.length - 1, price: r2(eBot) }           // far edge tagged
        },
        stages: { prereq: entryI, entry: entryI + 1, all: cs.length },
        order: ['prereq', 'entry', 'all'], yhint: { min: r2(lo - pad), max: r2(hi + pad) }
      };
    },

    /* fsvzo — a volume-zone oscillator: a histogram sub-panel that swings into a
       positive (buying) zone during up legs and a negative (selling) zone on down legs. */
    fsvzo: function () {
      var cs = grow(40, [{ to: 62, bars: 6 }, { to: 48, bars: 6 }, { to: 64, bars: 6 }]);
      return {
        candles: cs,
        anchors: {
          buyZone: { type: 'point', i: 4, price: 60 }, sellZone: { type: 'point', i: 10, price: 48 },
          zeroCross: { type: 'point', i: 6, price: cs[6][1] }   // oscillator crosses zero (buying → selling): the flip signal
        },
        subpanel: {
          type: 'histogram', min: -0.7, max: 0.7, label: 'FSVZO',
          series: [0.3, 0.5, 0.6, 0.55, 0.4, 0.3, -0.2, -0.45, -0.55, -0.45, -0.3, -0.2, 0.3, 0.5, 0.6, 0.55, 0.4, 0.3]
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    }
  };

  /* ══════════════════════════ CANDLE MOVES ══════════════════════════ */
  /* Single named candles for CANDLE beats (shown large + centred). Each returns
     OHLC plus named price REGIONS the lesson can label (wick / body). */
  var CANDLES = {

    /* bullish_sweep — the sweep-and-reclaim compressed into one candle: a long
       lower wick (the liquidity grab) under a strong bullish body (the reversal).
       The single-candle signature the worked example resolves to. */
    bullish_sweep: function () {
      var o = 52, c = 64, l = 38, h = 65;
      var level = 50;                         // the support the wick stabs below then reclaims
      return {
        ohlc: [o, c, l, h],
        regions: {
          lowerWick: { from: l, to: o },     // the sweep (stabs below the level)
          body: { from: o, to: c }            // the bullish reversal (closes above the level)
        },
        anchors: {
          level: { type: 'level', price: level },   // support swept & reclaimed
          low: { type: 'point', i: 0, price: l },
          close: { type: 'point', i: 0, price: c }
        }
      };
    },

    /* anatomy — a normal candle with a clear body and both wicks, for teaching the
       four components: open, close, high (upper wick), low (lower wick). */
    anatomy: function () {
      var o = 48, c = 58, l = 42, h = 64;
      return {
        ohlc: [o, c, l, h],
        regions: { upperWick: { from: c, to: h }, body: { from: o, to: c }, lowerWick: { from: l, to: o } },
        anchors: {
          high: { type: 'point', i: 0, price: h }, open: { type: 'point', i: 0, price: o },
          close: { type: 'point', i: 0, price: c }, low: { type: 'point', i: 0, price: l }
        }
      };
    },

    /* doji — tiny body, wicks both sides: indecision, neither side in control. */
    doji: function () {
      var o = 50, c = 50.6, l = 42, h = 58;
      return {
        ohlc: [o, c, l, h],
        regions: { upperWick: { from: c, to: h }, body: { from: o, to: c }, lowerWick: { from: l, to: o } },
        anchors: { body: { type: 'point', i: 0, price: (o + c) / 2 }, high: { type: 'point', i: 0, price: h }, low: { type: 'point', i: 0, price: l } }
      };
    },

    /* marubozu_bullish — full bullish body, no wicks: buyers fully in control. */
    marubozu_bullish: function () {
      var o = 42, c = 64;
      return { ohlc: [o, c, o, c], regions: { body: { from: o, to: c } }, anchors: { open: { type: 'point', i: 0, price: o }, close: { type: 'point', i: 0, price: c } } };
    },

    /* marubozu_bearish — full bearish body, no wicks: sellers fully in control. */
    marubozu_bearish: function () {
      var o = 64, c = 42;
      return { ohlc: [o, c, c, o], regions: { body: { from: c, to: o } }, anchors: { open: { type: 'point', i: 0, price: o }, close: { type: 'point', i: 0, price: c } } };
    },

    /* long_upper_wick — small body near the low, long upper wick (shooting star):
       buyers ran price up but sellers stepped in — buyer exhaustion. */
    long_upper_wick: function () {
      var o = 47, c = 45, l = 44, h = 64;
      return {
        ohlc: [o, c, l, h],
        regions: { upperWick: { from: o, to: h }, body: { from: c, to: o }, lowerWick: { from: l, to: c } },
        anchors: { high: { type: 'point', i: 0, price: h }, body: { type: 'point', i: 0, price: (o + c) / 2 } }
      };
    },

    /* long_lower_wick — small body near the high, long lower wick (hammer):
       sellers pushed price down but buyers stepped in — seller exhaustion. */
    long_lower_wick: function () {
      var o = 55, c = 57, l = 40, h = 58;
      return {
        ohlc: [o, c, l, h],
        regions: { lowerWick: { from: l, to: o }, body: { from: o, to: c }, upperWick: { from: c, to: h } },
        anchors: { low: { type: 'point', i: 0, price: l }, body: { type: 'point', i: 0, price: (o + c) / 2 } }
      };
    }
  };

  /* ══════════════════════════ PUBLIC API ══════════════════════════ */
  g.LTChartVocab = {
    charts: CHARTS,
    candles: CANDLES,
    // resolve a move by kind+name → fresh geometry object (params reserved for
    // future parameterised moves; current moves are fixed idealized shapes).
    get: function (kind, name, params) {
      var bank = kind === 'candle' ? CANDLES : CHARTS;
      var fn = bank[name];
      if (!fn) throw new Error('[LTChartVocab] unknown ' + kind + ' move: ' + name);
      return fn(params || {});
    },
    has: function (kind, name) {
      var bank = kind === 'candle' ? CANDLES : CHARTS;
      return !!bank[name];
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
