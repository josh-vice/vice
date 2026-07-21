/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — lt-ta.js
   Technical-analysis math, extracted from lt-engine.js. Pure functions over candle
   OHLC arrays in ECharts order: [open, close, low, high].
   ───────────────────────────────────────────────────────────────────────────
   The engine's _ichimokuMid / _computeIchimoku / _synthIchiLookback / _computeRSI /
   _computeCumDelta / _synthVolume now delegate here, so this is the single home for
   the ECharts-side indicator math.

   ⚠ The v2 canvas lessons (lessons-v2/chart-vocabulary.js) keep their OWN Ichimoku /
   RSI, tuned with crypto periods (conv 10 / base 30 / span 60 / disp 30) for a long
   off-screen lookback window, and that module is deliberately dependency-free. Those
   functions produce the lesson visuals and must NOT change, so they are intentionally
   NOT merged here. A verified unification (confirming identical output first) is a
   documented follow-up.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function ichimokuMid(ohlcData, period, endIdx) {
    const start = Math.max(0, endIdx - period + 1);
    const slice = ohlcData.slice(start, endIdx + 1);
    const high = Math.max(...slice.map(c => c[3]));
    const low  = Math.min(...slice.map(c => c[2]));
    return (high + low) / 2;
  }

  /* Faithful Ichimoku Kinko Hyo (mirrors the v2 lesson math): Tenkan / Kijun /
     Senkou-B = midpoint of the period's (high + low); Senkou-A = (T + K) / 2; Senkou
     A & B plotted `disp` periods AHEAD (leading Kumo, arrays n+disp long); Chikou =
     close plotted `disp` periods BEHIND. Periods scale down for short idealized
     charts; override per-chart via def.ichi. */
  const ICHI_DEFAULT = { conv: 4, base: 8, span: 24, disp: 8 };   // span widened 16→24 → wider Senkou A/B gap = thicker Kumo
  function computeIchimoku(ohlc, p) {
    p = Object.assign({}, ICHI_DEFAULT, p || {});
    const n = ohlc.length, d = p.disp;
    const r2 = v => Math.round(v * 100) / 100;
    const tenkan = [], kijun = [], aRaw = [], bRaw = [];
    for (let i = 0; i < n; i++) {
      tenkan.push(r2(ichimokuMid(ohlc, p.conv, i)));
      kijun.push(r2(ichimokuMid(ohlc, p.base, i)));
      bRaw.push(r2(ichimokuMid(ohlc, p.span, i)));
      aRaw.push(r2((tenkan[i] + kijun[i]) / 2));
    }
    const spanA = [], spanB = [];
    for (let s = 0; s < n + d; s++) { spanA.push(s >= d ? aRaw[s - d] : null); spanB.push(s >= d ? bRaw[s - d] : null); }
    const chikou = [];
    for (let k = 0; k < n; k++) chikou.push(k + d < n ? ohlc[k + d][1] : null);
    return { tenkan, kijun, spanA, spanB, chikou, disp: d };
  }

  /* Synthesize plausible OFF-SCREEN history that leads INTO the first displayed candle
     so the cloud is mature at the left edge. Deterministic; returns H bars of OHLC. */
  function synthIchiLookback(ohlc, H) {
    if (!ohlc.length || H <= 0) return [];
    const P0 = ohlc[0][0];
    let r = 0, m = Math.min(ohlc.length, 8);
    for (let i = 0; i < m; i++) r += (ohlc[i][3] - ohlc[i][2]);
    r = (r / m) || (Math.abs(P0) * 0.02);          // avg displayed bar range
    const A = r * 1.3;                               // swing amplitude
    const up = ohlc[ohlc.length - 1][1] >= ohlc[0][1];
    const sgn = up ? 1 : -1;                         // uptrend → history sits below P0
    const offs = [-6.0, -4.6, -5.2, -3.4, -4.0, -2.2, -2.8, -1.0, -1.6, 0];
    const wp = offs.map(f => P0 + sgn * f * A);
    const legs = wp.length - 1, per = Math.max(1, Math.floor(H / legs));
    const out = [];
    let close = wp[0];
    for (let L = 0; L < legs; L++) {
      const from = close, to = wp[L + 1];
      const bars = (L === legs - 1) ? (H - per * (legs - 1)) : per;
      const step = (to - from) / Math.max(1, bars);
      for (let b = 0; b < bars; b++) {
        const o = close;
        const c = (b === bars - 1) ? to : from + step * (b + 1);
        const hi = Math.max(o, c) + r * 0.35, lo = Math.min(o, c) - r * 0.35;
        out.push([+o.toFixed(2), +c.toFixed(2), +lo.toFixed(2), +hi.toFixed(2)]);
        close = c;
      }
    }
    return out;
  }

  /* Wilder RSI (default period 6). Returns an n-length array; the first `period`
     slots are null. */
  function computeRSI(ohlc, period) {
    period = period || 6;
    const n = ohlc.length, out = new Array(n).fill(null);
    if (n <= period) return out;
    let g = 0, l = 0;
    for (let i = 1; i <= period; i++) { const ch = ohlc[i][1] - ohlc[i - 1][1]; if (ch >= 0) g += ch; else l += -ch; }
    let ag = g / period, al = l / period;
    out[period] = al === 0 ? 100 : +(100 - 100 / (1 + ag / al)).toFixed(2);
    for (let j = period + 1; j < n; j++) {
      const d = ohlc[j][1] - ohlc[j - 1][1], gj = d > 0 ? d : 0, lj = d < 0 ? -d : 0;
      ag = (ag * (period - 1) + gj) / period; al = (al * (period - 1) + lj) / period;
      out[j] = al === 0 ? 100 : +(100 - 100 / (1 + ag / al)).toFixed(2);
    }
    return out;
  }

  /* Cumulative delta: running sum of (close - open) per bar. */
  function cumDelta(ohlc) { let a = 0; return ohlc.map(c => (a += (c[1] - c[0]), +a.toFixed(2))); }

  /* Synthetic volume from candle geometry, with optional profile shaping. */
  function synthVolume(ohlc, opt) {
    opt = opt || {};
    const n = ohlc.length, spikes = opt.spikes || {};
    let base = ohlc.map((c, i) => (((c[3] - c[2]) * 0.6 + Math.abs(c[1] - c[0]) * 0.8 + 4) * (spikes[i] || 1)));
    if (opt.profile === 'declining' || opt.profile === 'rising') {
      base = base.map((v, i) => { const t = i / Math.max(1, n - 1); return v * (opt.profile === 'declining' ? 1.5 - t : 0.6 + t); });
    } else if (opt.profile === 'pattern') {
      const bi = opt.breakIndex != null ? opt.breakIndex : Math.floor(n * 0.7);
      base = base.map((v, i) => i >= bi ? v * 2.4 : v * (1.4 - 0.9 * (i / Math.max(1, bi - 1))));
    }
    return base.map(v => +v.toFixed(2));
  }

  root.LTTa = { ICHI_DEFAULT, ichimokuMid, computeIchimoku, synthIchiLookback, computeRSI, cumDelta, synthVolume };
})(typeof window !== 'undefined' ? window : this);
