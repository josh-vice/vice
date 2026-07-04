/* ═══════════════════════════════════════════════════════════════════════════
   lt-chartgen.js — deterministic teaching-candle generator
   ---------------------------------------------------------------------------
   Builds realistic OHLC ([open, close, low, high]) for the course charts from a
   compact list of "legs", so every teaching chart carries proper lead-in context
   and visible swing structure — instead of a few candles that only read as a
   level because a label names it.

   ltCandles(start, legs, opts)
     start : opening price of the first candle
     legs  : [{ to, bars, reject? }, ...]
             price walks from the current close to `to` across `bars` candles;
             each candle's open = the previous close (continuous, crypto-style).
             reject (optional, price units) = extra wick on the FINAL candle of the
             leg, in the leg's direction — a clean rejection at a swing high/low.
     opts  : { seed=7, wick=0.5, noise=0.4 }
             seed  — fixes the mild randomness so a chart is identical every load
             wick  — base wick size as a fraction of the typical per-bar move
             noise — jitter on intermediate closes as a fraction of the step
     → [[o,c,l,h], ...] rounded to 2 dp. OHLC is always valid
       (low ≤ min(o,c) ≤ max(o,c) ≤ high).

   ltCutBars(legs, n) → candle count of the first n legs (handy for quiz cutIndex).
   ═══════════════════════════════════════════════════════════════════════════ */
(function (g) {
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function round(v) { return Math.round(v * 100) / 100; }

  function ltCandles(start, legs, opts) {
    opts = opts || {};
    var rnd = rng(opts.seed != null ? opts.seed : 7);
    var wickF = opts.wick != null ? opts.wick : 0.5;
    var noiseF = opts.noise != null ? opts.noise : 0.4;
    var out = [];
    var close = start;
    for (var li = 0; li < legs.length; li++) {
      var leg = legs[li];
      var bars = Math.max(1, leg.bars | 0);
      var from = close;
      var to = leg.to;
      var step = (to - from) / bars;
      var typical = Math.abs(step) || 1;
      for (var b = 0; b < bars; b++) {
        var o = close;
        var c = (b === bars - 1) ? to : from + step * (b + 1) + (rnd() - 0.5) * typical * noiseF;
        var hi0 = Math.max(o, c), lo0 = Math.min(o, c);
        var baseW = (Math.abs(c - o) * 0.5 + typical * 0.4) * wickF;
        var upW = baseW * (0.5 + rnd());
        var dnW = baseW * (0.5 + rnd());
        if (b === bars - 1 && leg.reject) { if (to >= from) upW += leg.reject; else dnW += leg.reject; }
        out.push([round(o), round(c), round(lo0 - dnW), round(hi0 + upW)]);
        close = c;
      }
    }
    return out;
  }

  function ltCutBars(legs, n) { var t = 0; for (var i = 0; i < n && i < legs.length; i++) t += Math.max(1, legs[i].bars | 0); return t; }

  // ltLabels(n) → ["D1","D2",...,"Dn"] so charts don't hand-type label arrays.
  function ltLabels(n, prefix) { prefix = prefix || 'D'; var a = []; for (var i = 1; i <= n; i++) a.push(prefix + i); return a; }

  // ltBars(legs) → total candle count across all legs (label length, full cutIndex).
  function ltBars(legs) { var t = 0; for (var i = 0; i < legs.length; i++) t += Math.max(1, legs[i].bars | 0); return t; }

  g.ltCandles = ltCandles;
  g.ltCutBars = ltCutBars;
  g.ltLabels = ltLabels;
  g.ltBars = ltBars;
})(typeof window !== 'undefined' ? window : globalThis);
