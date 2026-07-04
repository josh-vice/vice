/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — lt-utils.js
   Pure colour / number-format helpers extracted from lt-engine.js. No DOM, no app
   state — safe to call from anywhere. The engine's _hexToRgb / _pillText /
   _fmtCompact / _legibleOnDark now delegate here.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // "#rrggbb" → "r,g,b" (falls back to liquidation gold's rgb on bad input).
  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    return m ? parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) : '255,204,0';
  }

  // Legible pill text for a solid-coloured background: near-black on light pills
  // (teal/gold), white on darker/saturated pills (the brand pink).
  function pillText(hex) {
    const p = hexToRgb(hex).split(',').map(Number);
    return (p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114) > 140 ? '#0b0b0e' : '#fff';
  }

  // Compact number label (1.2k / 42 / 3.1 / 0.07).
  function fmtCompact(v) {
    const a = Math.abs(v);
    if (a >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    if (a >= 10)  return '' + Math.round(v);
    if (a === 0)  return '0';
    if (a >= 1)   return v.toFixed(1);
    return v.toFixed(2);
  }

  // Brighten a too-dark colour so it stays legible as TEXT on dark callout pills,
  // keeping the hue. Already-light colours pass through unchanged.
  function legibleOnDark(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;   // 0..255
    const FLOOR = 150;
    if (lum >= FLOOR) return '#' + m[1];
    const t = ((FLOOR - lum) / FLOOR) * 0.72;            // blend toward white
    r = Math.round(r + (255 - r) * t);
    g = Math.round(g + (255 - g) * t);
    b = Math.round(b + (255 - b) * t);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // Inject a <style> block once (idempotent by id). Replaces the identical
  // boilerplate every lab/module used to carry.
  function injectStyles(id, css) {
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }

  root.LTUtils = { hexToRgb, pillText, fmtCompact, legibleOnDark, injectStyles };
})(typeof window !== 'undefined' ? window : this);
