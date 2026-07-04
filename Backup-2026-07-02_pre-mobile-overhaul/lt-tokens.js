/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — lt-tokens.js
   Canonical data-viz palette. ONE place that owns the semantic chart colours so
   "colour always means the same thing" across the app.
   ───────────────────────────────────────────────────────────────────────────
     teal = bullish · buy · support · bid      pink = bearish · sell · resistance · ask · short
     gold = liquidation levels                 amber = positions-heatmap density
     accent (warm gold) = neutral magnitude lines (open interest, cumulative-delta total)

   The engine's VIZ / RED / GOLD / TEAL2 constants alias straight to these values.
   (TEAL / BEAR stay in the engine — they are mutable, theme-aware, and follow the
   learner's custom candle-colour setting.)

   KNOWN, DELIBERATELY-UNCHANGED drift (changing these would alter rendered visuals,
   which is out of scope for a quality-only refactor — tracked as follow-ups):
   · lessons-v2/renderer.js still hardcodes a legacy level red (#cc4444) + zone fill.
   · the four lt-data*.js files carry ~772 hardcoded colour literals.
   Both should later be pointed at this token source behind a visual-diff check. */
(function (root) {
  'use strict';
  root.LT_TOKENS = {
    teal2: '#00b8b8',
    red:   '#ff2e88',   // bearish annotation colour — the brand pink, matching down-candles
    gold:  '#ffcc00',   // liquidation gold — one gold across charts + the real-data gallery
    viz: {
      bull: '#00d4d4', bullRgb: '0,212,212',
      bear: '#ff2e88', bearRgb: '255,46,136',
      liq:  '#ffcc00',
      heat: '255,190,40',
      accent: '#e7b53a'
    }
  };
})(typeof window !== 'undefined' ? window : this);
