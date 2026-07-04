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

  // Per-candle color schemes for the proprietary tools. Palette = [up, down, neutral];
  // each candle is colored by its short-term trend vs. the close 3 bars back.
  var SCHEME_PALETTE = {
    trendbuddy: ['#00d4d4', '#ff2e88', '#5b5570'],
    crayons:    ['#7cff6b', '#f23d5c', '#5b5570'],
    genie:      ['#00d4d4', '#f23d5c', '#8a84a6'],
    pal:        ['#00d4d4', '#f23d5c', '#5b5570'],
    heuristics: ['#00d4d4', '#ff2e88', '#5b5570']
  };
  function schemeColors(cs, scheme) {
    var P = SCHEME_PALETTE[scheme] || ['#00d4d4', '#f23d5c', '#5b5570'], k = 3, out = [];
    for (var i = 0; i < cs.length; i++) {
      var ref = cs[Math.max(0, i - k)][1], diff = cs[i][1] - ref, thr = Math.abs(ref) * 0.004;
      out.push(diff > thr ? P[0] : diff < -thr ? P[1] : P[2]);
    }
    return out;
  }

  // Ichimoku series from the candles. Tenkan/Kijun/Senkou-B = (period-high + period-low)/2;
  // Senkou-A = (Tenkan + Kijun)/2. Periods scale down for short idealized charts.
  function ichimoku(cs, p) {
    p = p || { conv: 9, base: 26, span: 52 };
    var n = cs.length, tenkan = [], kijun = [], spanA = [], spanB = [];
    function mid(period, end) {
      var hi = -Infinity, lo = Infinity;
      for (var i = Math.max(0, end - period + 1); i <= end; i++) { if (cs[i][3] > hi) hi = cs[i][3]; if (cs[i][2] < lo) lo = cs[i][2]; }
      return (hi + lo) / 2;
    }
    for (var i = 0; i < n; i++) {
      tenkan.push(i >= p.conv - 1 ? r2(mid(p.conv, i)) : null);
      kijun.push(i >= p.base - 1 ? r2(mid(p.base, i)) : null);
      spanB.push(i >= p.span - 1 ? r2(mid(p.span, i)) : null);
    }
    for (var j = 0; j < n; j++) spanA.push(tenkan[j] != null && kijun[j] != null ? r2((tenkan[j] + kijun[j]) / 2) : null);
    return { tenkan: tenkan, kijun: kijun, spanA: spanA, spanB: spanB };
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

    /* range_bound — a clean sideways range with a defined high and low.
       Used to ground "pools sit just beyond the range edges."
       params: { } (none needed; labels come from the lesson's annotations) */
    range_bound: function () {
      var HI = 80, LO = 40;
      var cs = grow(60, [
        { to: HI, bars: 3, reject: 2 },
        { to: LO, bars: 4, reject: 2 },
        { to: HI, bars: 4, reject: 2 },
        { to: LO + 1, bars: 4, reject: 2 },
        { to: HI - 2, bars: 4, reject: 2 },
        { to: 60, bars: 3 }
      ]);
      return {
        candles: cs,
        anchors: {
          high: { type: 'level', price: HI },
          low: { type: 'level', price: LO }
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
          reversalTop: { type: 'point', i: cs.length - 1, price: 88 }
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
          reversalBottom: { type: 'point', i: cs.length - 1, price: 12 }
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
      var cs = grow(40, [
        { to: 58, bars: 3, reject: 2 },   // high1   (idx 2)
        { to: 48, bars: 2, reject: 1.5 }, // hl1     (idx 4)
        { to: 70, bars: 3, reject: 2 },   // hh1     (idx 7)
        { to: 60, bars: 2, reject: 1.5 }, // hl2     (idx 9)
        { to: 82, bars: 3, reject: 2 }    // hh2     (idx 12)
      ]);
      var out = {
        candles: cs,
        anchors: {
          start: { type: 'point', i: 0, price: cs[0][1] },
          high1: { type: 'point', i: 2, price: 58 },
          hl1: { type: 'point', i: 4, price: 48 },
          hh1: { type: 'point', i: 7, price: 70 },
          hl2: { type: 'point', i: 9, price: 60 },
          hh2: { type: 'point', i: 12, price: 82 },
          flipLevel: { type: 'level', price: 58 }   // prior high → support / BOS line
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
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
      ]);
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
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
      if (params && params.volume) out.volume = volProfile(cs, params.volume);
      return out;
    },

    /* horizontal_sr — a flat level tested several times then a reaction.
       params: { as: 'support' (default) | 'resistance' } */
    horizontal_sr: function (params) {
      var as = (params && params.as) || 'support';
      if (as === 'resistance') {
        var R = 60;
        var csR = grow(40, [
          { to: 59, bars: 3, reject: 2 }, { to: 46, bars: 2 },
          { to: 59, bars: 2, reject: 2 }, { to: 48, bars: 2 },
          { to: 59, bars: 2, reject: 2 }, { to: 38, bars: 3 }
        ]); // touch ends: 2, 6, 10
        return {
          candles: csR,
          anchors: {
            level: { type: 'level', price: R },
            touch1: { type: 'point', i: 2, price: R },
            touch2: { type: 'point', i: 6, price: R },
            touch3: { type: 'point', i: 10, price: R }
          },
          stages: { all: csR.length }, order: ['all'], yhint: yspan(csR, 0.12)
        };
      }
      var S = 50;
      var cs = grow(70, [
        { to: 51, bars: 3, reject: 2 }, { to: 64, bars: 2 },
        { to: 51, bars: 2, reject: 2 }, { to: 62, bars: 2 },
        { to: 51, bars: 2, reject: 2 }, { to: 74, bars: 3 }
      ]); // touch ends: 2, 6, 10
      return {
        candles: cs,
        anchors: {
          level: { type: 'level', price: S },
          touch1: { type: 'point', i: 2, price: S },
          touch2: { type: 'point', i: 6, price: S },
          touch3: { type: 'point', i: 10, price: S }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* sr_flip — a level acts as resistance, price breaks above, then retests it
       from above as support and continues up. Stages: tests → breakout → hold → run. */
    sr_flip: function () {
      var L = 55;
      var cs = grow(40, [
        { to: 54, bars: 3, reject: 2 },   // test resistance      (idx 2)
        { to: 44, bars: 2 },              // pull back            (idx 4)
        { to: 54, bars: 2, reject: 1.5 }, // test again           (idx 6)
        { to: 66, bars: 3 },              // BREAK above          (idx 9)
        { to: 56, bars: 2, reject: 1.5 }, // retest, holds support(idx 11)
        { to: 78, bars: 3 }               // run                  (idx 14)
      ]);
      return {
        candles: cs,
        anchors: {
          level: { type: 'level', price: L },
          test1: { type: 'point', i: 2, price: L },
          breakout: { type: 'point', i: 9, price: 66 },
          retest: { type: 'point', i: 11, price: 56 },
          top: { type: 'point', i: 14, price: 78 }
        },
        stages: { tests: 7, breakout: 10, hold: 12, run: cs.length },
        order: ['tests', 'breakout', 'hold', 'run'], yhint: yspan(cs, 0.1)
      };
    },

    /* trendline_support — a rising diagonal: higher lows that line up. Exposes the
       touch points so a lesson can draw the trendline through them. */
    trendline_support: function () {
      var cs = grow(40, [
        { to: 52, bars: 2 }, { to: 44, bars: 2, reject: 1 },   // touch1 (idx 3)
        { to: 60, bars: 2 }, { to: 50, bars: 2, reject: 1 },   // touch2 (idx 7)
        { to: 68, bars: 2 }, { to: 57, bars: 2, reject: 1 },   // touch3 (idx 11)
        { to: 76, bars: 2 }
      ]);
      return {
        candles: cs,
        anchors: {
          touch1: { type: 'point', i: 3, price: 44 },
          touch2: { type: 'point', i: 7, price: 50 },
          touch3: { type: 'point', i: 11, price: 57 },
          top: { type: 'point', i: 13, price: 76 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* trendline_resistance — a falling diagonal: lower highs that line up. */
    trendline_resistance: function () {
      var cs = grow(76, [
        { to: 62, bars: 2 }, { to: 70, bars: 2, reject: 1 },   // touch1 (idx 3)
        { to: 56, bars: 2 }, { to: 64, bars: 2, reject: 1 },   // touch2 (idx 7)
        { to: 50, bars: 2 }, { to: 57, bars: 2, reject: 1 },   // touch3 (idx 11)
        { to: 42, bars: 2 }
      ]);
      return {
        candles: cs,
        anchors: {
          touch1: { type: 'point', i: 3, price: 70 },
          touch2: { type: 'point', i: 7, price: 64 },
          touch3: { type: 'point', i: 11, price: 57 },
          bottom: { type: 'point', i: 13, price: 42 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* consolidation_breakout — a tight range that resolves with an impulse.
       params: { dir: 'up' (default) | 'down' } */
    consolidation_breakout: function (params) {
      var dir = (params && params.dir) || 'up';
      if (dir === 'down') {
        var csD = grow(52, [
          { to: 48, bars: 2, reject: 1 }, { to: 58, bars: 2, reject: 1 },
          { to: 49, bars: 2, reject: 1 }, { to: 57, bars: 2, reject: 1 },
          { to: 50, bars: 2, reject: 1 }, { to: 34, bars: 4 }
        ]);
        return {
          candles: csD,
          anchors: {
            rangeHigh: { type: 'level', price: 58 },
            rangeLow: { type: 'level', price: 48 },
            breakout: { type: 'point', i: 13, price: 34 }
          },
          stages: { consolidate: 10, breakout: csD.length },
          order: ['consolidate', 'breakout'], yhint: yspan(csD, 0.1),
          volume: (params && params.volume) ? breakoutVol(csD, 10) : undefined
        };
      }
      var cs = grow(52, [
        { to: 58, bars: 2, reject: 1 }, { to: 49, bars: 2, reject: 1 },
        { to: 57, bars: 2, reject: 1 }, { to: 48, bars: 2, reject: 1 },
        { to: 58, bars: 2, reject: 1 }, { to: 74, bars: 4 }
      ]);
      return {
        candles: cs,
        anchors: {
          rangeHigh: { type: 'level', price: 58 },
          rangeLow: { type: 'level', price: 48 },
          breakout: { type: 'point', i: 13, price: 74 }
        },
        stages: { consolidate: 10, breakout: cs.length },
        order: ['consolidate', 'breakout'], yhint: yspan(cs, 0.1),
        volume: (params && params.volume) ? breakoutVol(cs, 10) : undefined
      };
    },

    /* trade_setup_long — a risk-management diagram: entry / stop / target levels on
       a price path that dips toward the stop, then runs to the target (2:1 RRR).
       Stages: plan (levels + entry) → play (price reaches target). */
    trade_setup_long: function () {
      var cs = grow(50, [
        { to: 48, bars: 2, reject: 1 },   // dip toward stop (not hit)
        { to: 60, bars: 5 }               // rally to target
      ]);
      return {
        candles: cs,
        anchors: {
          entry: { type: 'level', price: 50 },
          stop: { type: 'level', price: 45 },
          target: { type: 'level', price: 60 }
        },
        stages: { plan: 2, play: cs.length },
        order: ['plan', 'play'], yhint: { min: 40, max: 64 }
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
        [48, 53, 42, 54],     // 3 long lower wick — buyers step in
        [53, 57, 52, 58],     // 4 push up
        [57, 55, 54, 64],     // 5 long upper wick — sellers step back in
        [55, 50, 49, 56],     // 6 down
        [50, 50.4, 47, 53],   // 7 doji — pause / indecision
        [50.4, 57, 50, 58]    // 8 resume up
      ];
      return {
        candles: cs,
        anchors: {
          sellers1: { type: 'point', i: 1, price: 60 },
          buyers1: { type: 'point', i: 3, price: 42 },
          sellers2: { type: 'point', i: 5, price: 64 },
          pause: { type: 'point', i: 7, price: 47 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.1)
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
      if (params && params.volume) out.volume = vol(cs, { 2: 0.7, 3: 2.3 });   // spike on the engulfing candle
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
      if (params && params.volume) out.volume = vol(cs, { 2: 0.7, 3: 2.3 });
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
        anchors: { star: { type: 'point', i: 3, price: 43 }, confirm: { type: 'point', i: 4, price: 54 }, midpoint: { type: 'level', price: 50.5 } },
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
        anchors: { star: { type: 'point', i: 3, price: 57 }, confirm: { type: 'point', i: 4, price: 46 }, midpoint: { type: 'level', price: 49.5 } },
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
        anchors: { soldier1: { type: 'point', i: 2, price: 47 }, soldier3: { type: 'point', i: 4, price: 62 } },
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
        anchors: { crow1: { type: 'point', i: 2, price: 58.4 }, crow3: { type: 'point', i: 4, price: 38 } },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* ── classical CHART PATTERNS (Course 2 / 10–11) ──────────────────────────
       Each carries the classic declining-volume-then-spike profile. Trendlines /
       necklines are drawn by the lesson via `trendline` (point anchors) or `level`. */

    rising_wedge: function () {
      // converging up (lows rise faster than highs), then breaks down — bearish
      var cs = grow(46, [
        { to: 56, bars: 2, reject: 1.5 }, { to: 48, bars: 2 },
        { to: 60, bars: 2, reject: 1.5 }, { to: 54, bars: 2 },
        { to: 62, bars: 2, reject: 1.5 }, { to: 58, bars: 1 },
        { to: 46, bars: 3 }
      ]); // highs idx 1,5,9 ; lows idx 3,7,10 ; breakdown ends idx 13
      return {
        candles: cs,
        anchors: {
          upperA: { type: 'point', i: 1, price: 56 }, upperB: { type: 'point', i: 9, price: 62 },
          lowerA: { type: 'point', i: 3, price: 48 }, lowerB: { type: 'point', i: 10, price: 58 },
          breakdown: { type: 'point', i: 13, price: 46 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12),
        volume: patternVol(cs, 11)
      };
    },

    falling_wedge: function () {
      // converging down, then breaks out — bullish
      var cs = grow(54, [
        { to: 44, bars: 2, reject: 1.5 }, { to: 52, bars: 2 },
        { to: 40, bars: 2, reject: 1.5 }, { to: 46, bars: 2 },
        { to: 38, bars: 2, reject: 1.5 }, { to: 42, bars: 1 },
        { to: 54, bars: 3 }
      ]);
      return {
        candles: cs,
        anchors: {
          lowerA: { type: 'point', i: 1, price: 44 }, lowerB: { type: 'point', i: 9, price: 38 },
          upperA: { type: 'point', i: 3, price: 52 }, upperB: { type: 'point', i: 10, price: 42 },
          breakout: { type: 'point', i: 13, price: 54 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12),
        volume: patternVol(cs, 11)
      };
    },

    head_and_shoulders: function () {
      // left shoulder, higher head, lower right shoulder; neckline ~50; breaks down
      var cs = grow(40, [
        { to: 58, bars: 3, reject: 2 }, { to: 50, bars: 2 },
        { to: 68, bars: 3, reject: 2 }, { to: 50, bars: 2 },
        { to: 58, bars: 3, reject: 2 }, { to: 44, bars: 3 }
      ]); // LS idx2, head idx7, RS idx12, breakdown idx15
      return {
        candles: cs,
        anchors: {
          leftShoulder: { type: 'point', i: 2, price: 58 }, head: { type: 'point', i: 7, price: 68 },
          rightShoulder: { type: 'point', i: 12, price: 58 }, breakdown: { type: 'point', i: 15, price: 44 },
          neckline: { type: 'level', price: 50 }, target: { type: 'level', price: 32 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.1),
        volume: patternVol(cs, 13)
      };
    },

    inverse_head_and_shoulders: function () {
      var cs = grow(60, [
        { to: 42, bars: 3, reject: 2 }, { to: 50, bars: 2 },
        { to: 32, bars: 3, reject: 2 }, { to: 50, bars: 2 },
        { to: 42, bars: 3, reject: 2 }, { to: 56, bars: 3 }
      ]);
      return {
        candles: cs,
        anchors: {
          leftShoulder: { type: 'point', i: 2, price: 42 }, head: { type: 'point', i: 7, price: 32 },
          rightShoulder: { type: 'point', i: 12, price: 42 }, breakout: { type: 'point', i: 15, price: 56 },
          neckline: { type: 'level', price: 50 }, target: { type: 'level', price: 68 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.1),
        volume: patternVol(cs, 13)
      };
    },

    ascending_triangle: function () {
      // flat top (equal highs ~60), rising lows, breakout up — bullish
      var cs = grow(46, [
        { to: 60, bars: 2, reject: 1.5 }, { to: 46, bars: 2 },
        { to: 60, bars: 2, reject: 1.5 }, { to: 51, bars: 2 },
        { to: 60, bars: 2, reject: 1.5 }, { to: 55, bars: 1 },
        { to: 72, bars: 3 }
      ]);
      return {
        candles: cs,
        anchors: {
          top: { type: 'level', price: 60 },
          lowerA: { type: 'point', i: 3, price: 46 }, lowerB: { type: 'point', i: 10, price: 55 },
          breakout: { type: 'point', i: 13, price: 72 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12),
        volume: patternVol(cs, 11)
      };
    },

    descending_triangle: function () {
      // flat bottom (equal lows ~40), falling highs, breakdown — bearish
      var cs = grow(54, [
        { to: 40, bars: 2, reject: 1.5 }, { to: 54, bars: 2 },
        { to: 40, bars: 2, reject: 1.5 }, { to: 49, bars: 2 },
        { to: 40, bars: 2, reject: 1.5 }, { to: 45, bars: 1 },
        { to: 28, bars: 3 }
      ]);
      return {
        candles: cs,
        anchors: {
          bottom: { type: 'level', price: 40 },
          upperA: { type: 'point', i: 3, price: 54 }, upperB: { type: 'point', i: 10, price: 45 },
          breakdown: { type: 'point', i: 13, price: 28 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12),
        volume: patternVol(cs, 11)
      };
    },

    bull_flag: function () {
      // strong pole up, a slight downward flag, then breakout — continuation
      var cs = grow(40, [
        { to: 66, bars: 4 },                 // pole (idx 0–3)
        { to: 60, bars: 2, reject: 1 }, { to: 63, bars: 1 },
        { to: 57, bars: 2 }, { to: 60, bars: 1 },   // flag (idx 4–9)
        { to: 80, bars: 4 }                  // breakout (idx 10–13)
      ]);
      return {
        candles: cs,
        anchors: {
          poleBottom: { type: 'point', i: 0, price: cs[0][1] }, poleTop: { type: 'point', i: 3, price: 66 },
          flagA: { type: 'point', i: 4, price: 60 }, flagB: { type: 'point', i: 9, price: 60 },
          breakout: { type: 'point', i: 13, price: 80 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.1),
        volume: patternVol(cs, 10)
      };
    },

    /* ── TRADING TOOLS (Course 2 / 12–15) ─────────────────────────────────── */

    /* fibonacci — an up-impulse (low→high), a retracement into the golden pocket
       (~0.618), and a bounce. Exposes the key retracement levels for annotation. */
    fibonacci: function () {
      var lo = 40, hi = 80, rng = hi - lo;
      function fib(r) { return r2(hi - r * rng); }
      var cs = grow(lo, [
        { to: hi, bars: 5 },          // impulse up (idx 0–4, high at idx 4)
        { to: 55, bars: 3 },          // retrace into golden pocket (~0.618 = 55.3)
        { to: 88, bars: 4 }           // bounce / continuation
      ]);
      return {
        candles: cs,
        anchors: {
          swingLow: { type: 'point', i: 0, price: cs[0][1] },
          swingHigh: { type: 'point', i: 4, price: hi },
          bounce: { type: 'point', i: 7, price: 55 },
          fib382: { type: 'level', price: fib(0.382) },
          fib500: { type: 'level', price: fib(0.5) },
          fib618: { type: 'level', price: fib(0.618) },
          fib786: { type: 'level', price: fib(0.786) }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* ichimoku — a trending chart with the full Ichimoku Kinko Hyo: Tenkan (blue),
       Kijun (yellow), and the Kumo cloud (green when bullish, red when bearish).
       Periods scaled down for a short idealized chart. */
    ichimoku: function () {
      var cs = grow(50, [
        { to: 46, bars: 3 }, { to: 58, bars: 5 }, { to: 52, bars: 4 },
        { to: 66, bars: 5 }, { to: 60, bars: 3 }, { to: 80, bars: 6 }
      ]);
      var ik = ichimoku(cs, { conv: 4, base: 8, span: 13 });
      return {
        candles: cs,
        overlays: [
          { points: ik.tenkan, color: '#5cc8ff', width: 1.4, label: 'Tenkan' },
          { points: ik.kijun, color: '#ffcf3f', width: 1.6, label: 'Kijun' }
        ],
        cloud: { a: ik.spanA, b: ik.spanB },
        anchors: {
          pullback: { type: 'point', i: 11, price: 52 },
          aboveCloud: { type: 'point', i: cs.length - 1, price: 80 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.14)
      };
    },

    /* liquidation — a long with entry/stop and two liquidation lines: one far below
       (low leverage, safe) and one just under entry (high leverage, dangerous). Price
       dips below the danger line but holds above the safe one, then rallies — showing
       how leverage moves your liquidation price. */
    liquidation: function () {
      var cs = grow(50, [{ to: 46, bars: 3, reject: 1 }, { to: 62, bars: 5 }]);
      return {
        candles: cs,
        anchors: {
          entry: { type: 'level', price: 50 },
          stop: { type: 'level', price: 45 },
          liqSafe: { type: 'level', price: 38 },
          liqDanger: { type: 'level', price: 48 },
          dip: { type: 'point', i: 2, price: 46 },
          top: { type: 'point', i: cs.length - 1, price: 62 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: { min: 35, max: 66 }
      };
    },

    /* rsi — price makes a higher high while RSI makes a lower high (bearish
       divergence), then rolls over. RSI sub-panel with 30/70 bands. */
    rsi: function () {
      var cs = grow(40, [
        { to: 62, bars: 4 }, { to: 54, bars: 3 }, { to: 70, bars: 4 }, { to: 44, bars: 5 }
      ]); // high1 idx3 (62), high2 idx10 (70, higher), drop to idx15 (44)
      var series = [50, 58, 66, 73, 60, 50, 46, 55, 62, 66, 64, 55, 46, 38, 32, 28];
      return {
        candles: cs,
        anchors: {
          high1: { type: 'point', i: 3, price: 62 },
          high2: { type: 'point', i: 10, price: 70 },
          oversold: { type: 'point', i: 15, price: 44 }
        },
        subpanel: { type: 'rsi', series: series, bands: [{ v: 30 }, { v: 70 }], min: 0, max: 100, label: 'RSI' },
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
        anchors: { top: { type: 'point', i: 12, price: 72 }, reversal: { type: 'point', i: cs.length - 1, price: 50 } },
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
        anchors: { top: { type: 'point', i: 12, price: 72 }, reversal: { type: 'point', i: cs.length - 1, price: 50 } },
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
      var cs = grow(40, [{ to: 60, bars: 5 }, { to: 54, bars: 3 }, { to: 72, bars: 5 }, { to: 50, bars: 5 }]);
      return {
        candles: cs,
        anchors: { top: { type: 'point', i: 12, price: 72 }, reversal: { type: 'point', i: cs.length - 1, price: 50 } },
        subpanel: {
          type: 'histogram', min: -0.3, max: 1, label: 'Basis',
          series: [0.1, 0.15, 0.25, 0.3, 0.35, 0.3, 0.28, 0.32, 0.5, 0.6, 0.75, 0.85, 0.9, 0.5, 0.2, 0.0, -0.1, -0.05]
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* ── PROPRIETARY INDICATOR TOOLS (Course 4 / 13–18) ───────────────────────
       color_tool colours each candle by its short-term trend using the tool's real
       palette (Trend Buddy / PAL / Heuristics / Crayons / Genie). params.scheme picks
       the palette; params.levels exposes dynamic S/R for the level-drawing tools. */
    color_tool: function (params) {
      var scheme = (params && params.scheme) || 'trendbuddy';
      var cs = grow(40, [
        { to: 64, bars: 6 }, { to: 50, bars: 5 }, { to: 58, bars: 4 },
        { to: 44, bars: 4 }, { to: 60, bars: 5 }
      ]); // ends: 5(top), 10, 14, 18(bottom), 23
      return {
        candles: cs,
        candleColors: schemeColors(cs, scheme),
        anchors: {
          top: { type: 'point', i: 5, price: 64 },
          bottom: { type: 'point', i: 18, price: 44 },
          resLevel: { type: 'level', price: 64 },
          supLevel: { type: 'level', price: 44 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: yspan(cs, 0.12)
      };
    },

    /* liquidation_levels — clusters of leveraged liquidation prices above and below
       price (liquidity magnets). Price is drawn up into the upper cluster, cascades
       through it on a wick, then reverses — liquidity theory's principle 4 in action. */
    liquidation_levels: function () {
      var cs = grow(48, [
        { to: 52, bars: 3 }, { to: 46, bars: 3 }, { to: 58, bars: 5 },
        { to: 64, bars: 2, reject: 2 }, { to: 50, bars: 4 }
      ]); // spike (cascade) ends idx 12; reversal idx 16
      return {
        candles: cs,
        anchors: {
          clusterHi: { type: 'level', price: 62 },   // dense short-liquidation cluster above
          clusterLo: { type: 'level', price: 40 },   // long-liquidation cluster below
          magnet: { type: 'point', i: 12, price: 64 },
          reversal: { type: 'point', i: cs.length - 1, price: 50 }
        },
        stages: { all: cs.length }, order: ['all'], yhint: { min: 36, max: 68 }
      };
    },

    /* fsvzo — a volume-zone oscillator: a histogram sub-panel that swings into a
       positive (buying) zone during up legs and a negative (selling) zone on down legs. */
    fsvzo: function () {
      var cs = grow(40, [{ to: 62, bars: 6 }, { to: 48, bars: 6 }, { to: 64, bars: 6 }]);
      return {
        candles: cs,
        anchors: { buyZone: { type: 'point', i: 4, price: 60 }, sellZone: { type: 'point', i: 10, price: 48 } },
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
      var o = 50, c = 64, l = 38, h = 65;
      return {
        ohlc: [o, c, l, h],
        regions: {
          lowerWick: { from: l, to: o },     // the sweep
          body: { from: o, to: c }            // the bullish reversal
        },
        anchors: {
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
