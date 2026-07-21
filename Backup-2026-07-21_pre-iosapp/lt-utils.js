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

  /* ── ECharts + body{zoom} coordinate shim ──────────────────────────────────
     The laptop display-scale tiers (lt-styles.css) zoom the whole <body>.
     Under Chromium's standardized zoom, MouseEvent.offsetX reports VISUAL px
     while the chart canvas draws in LAYOUT px; zrender trusts offsetX, so
     every hover/drag lands zoom-times short (verified live: trusted click at
     layout-x 772 reported offsetX 657 at zoom 0.85). Shadowing offsetX/layerX
     on the event forces zrender down its transform-solving path
     (calculateZrXY → marker transform), which measures gBCRs and inverts the
     zoom exactly (verified live: zrX 772.06). Attach to every ECharts host.
     No-op while zoom is 1, so desktop/mobile behavior is untouched. */
  let _bodyZoom = 1;
  function _readBodyZoom() {
    if (document.body) _bodyZoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', _readBodyZoom);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _readBodyZoom);
    else _readBodyZoom();
  }
  function echartsZoomShim(host) {
    if (!host || host._ltZoomShim) return;
    host._ltZoomShim = true;
    const hide = (e) => {
      if (_bodyZoom === 1) return;
      // shadow the instance so zrender's `offsetX != null` check fails and it
      // recomputes coordinates from the (zoom-aware) viewport transform
      for (const k of ['offsetX', 'offsetY', 'layerX', 'layerY']) {
        try { Object.defineProperty(e, k, { value: undefined, configurable: true }); } catch (err) {}
      }
    };
    // pointer* included: zrender binds PointerEvents on some platforms and
    // normalizes them through the same offsetX path — shadowing is harmless
    // where unused. Touch events are left alone (zrender's touch handler
    // already solves the viewport transform itself).
    for (const t of ['mousedown', 'mousemove', 'mouseup', 'click', 'dblclick', 'wheel', 'contextmenu', 'mouseout',
                     'pointerdown', 'pointermove', 'pointerup', 'pointerout']) {
      host.addEventListener(t, hide, true);
    }
  }

  root.LTUtils = { hexToRgb, pillText, fmtCompact, legibleOnDark, injectStyles, echartsZoomShim };
})(typeof window !== 'undefined' ? window : this);
