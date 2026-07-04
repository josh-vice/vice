'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Ichimoku Cloud Explorer (browse/toggle explorer)
   lt-ichimoku.js

   An interactive diagram: the full Ichimoku system layered over price. Toggle any
   component (Tenkan · Kijun · Kumo cloud · Chikou) on/off, or hover a chip to isolate
   it and read what it does. Not a live chart — a fixed, hand-built teaching diagram.

   Public:  renderIchimokuExplorer(containerId)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  var T = 'var(--teal,#00d4d4)', G = 'var(--gold,#e7b53a)', GRN = '#21d196', PNK = 'var(--bear,#ff2e88)', CHK = '#a855f7', S = 'var(--text3,#8b85a3)';

  function _pl(pts, c, w, d) { return '<polyline points="' + pts + '" fill="none" stroke="' + c + '" stroke-width="' + (w || 2) + '"' + (d ? ' stroke-dasharray="4 3"' : '') + ' stroke-linejoin="round" stroke-linecap="round"/>'; }

  var COMPONENTS = [
    { k: 'price', label: 'Price', color: 'var(--text2,#a8a3bb)',
      desc: 'The candles. Ichimoku layers everything else <b>on top of</b> raw price — the goal is a one-glance read of trend, momentum and support/resistance together.' },
    { k: 'tenkan', label: 'Tenkan', color: '#00d4d4',
      desc: '<b>Tenkan-sen</b> (Conversion Line) — the <b>fast</b> line, the midpoint of the last 9 highs/lows. It hugs price closely; a Tenkan-crossing-Kijun is a momentum trigger.' },
    { k: 'kijun', label: 'Kijun', color: '#e7b53a',
      desc: '<b>Kijun-sen</b> (Baseline) — the <b>slow</b> line, midpoint of the last 26 highs/lows. The backbone of the trend and a dynamic support/resistance; price above it is bullish, and it doubles as a trailing stop.' },
    { k: 'kumo', label: 'Kumo (cloud)', color: '#21d196',
      desc: 'The <b>Kumo</b> — Senkou Span A &amp; B, projected 26 periods <b>forward</b>. Price above the cloud is bullish, below is bearish; a thicker cloud is stronger support/resistance, and a colour flip (twist) warns of a trend change ahead.' },
    { k: 'chikou', label: 'Chikou', color: '#a855f7',
      desc: '<b>Chikou Span</b> (Lagging Span) — the current close plotted 26 periods <b>back</b>. When it sits in open space, clear of old price, the trend is unobstructed and confirmed.' }
  ];

  /* Deterministic close path: base drift down → strong rally → pullback to the
     Kijun → continuation higher. 40 bars so the COMPUTED Kumo has real body and a
     bear→bull twist, instead of the old 11-bar hand-drawn sliver. */
  var CLOSES = [
    104, 103, 101.5, 100, 99, 97.5, 96, 95, 94.5, 94,
    95, 97, 99.5, 102, 104.5, 107, 109, 111.5, 113, 115,
    117, 119, 120.5, 122, 121, 120, 117.5, 115.5, 114, 113,
    114.5, 117, 119.5, 122, 124.5, 126.5, 128, 129, 129.5, 130
  ];
  function _series() {
    return CLOSES.map(function (c, i) {
      var o = i === 0 ? c + 0.5 : CLOSES[i - 1];
      return [+o.toFixed(2), +c.toFixed(2), +(Math.min(o, c) - 0.7).toFixed(2), +(Math.max(o, c) + 0.7).toFixed(2)]; // ECharts order [o,c,l,h]
    });
  }

  function _chartSvg() {
    var TA = (typeof window !== 'undefined' && window.LTTa) ? window.LTTa : (typeof LTTa !== 'undefined' ? LTTa : null);
    var ohlc = _series();
    var ich = TA ? TA.computeIchimoku(ohlc, { conv: 4, base: 8, span: 16, disp: 8 }) : null;
    if (!ich) return '<svg viewBox="0 0 480 190" xmlns="http://www.w3.org/2000/svg"></svg>';

    var W = 480, H = 190, PL = 8, PR = 12, PT = 14, PB = 12;
    var n = ohlc.length, d = ich.disp, slots = n + d;   // spans run n+disp long (projected forward)
    var xw = (W - PL - PR) / (slots - 1);
    function X(s) { return PL + s * xw; }

    var vals = [];
    ohlc.forEach(function (c) { vals.push(c[2], c[3]); });
    [ich.tenkan, ich.kijun, ich.spanA, ich.spanB, ich.chikou].forEach(function (arr) {
      arr.forEach(function (v) { if (v != null) vals.push(v); });
    });
    var pmin = Math.min.apply(null, vals), pmax = Math.max.apply(null, vals);
    var pad = (pmax - pmin) * 0.07 || 1; pmin -= pad; pmax += pad;
    function Y(p) { return PT + (1 - (p - pmin) / (pmax - pmin)) * (H - PT - PB); }

    function polyPts(arr, from, to) {
      var pts = [];
      for (var s = from; s < to; s++) if (arr[s] != null) pts.push(X(s).toFixed(1) + ',' + Y(arr[s]).toFixed(1));
      return pts.join(' ');
    }

    /* Kumo — filled per-segment so the twist reads as a colour flip: green where
       Senkou A leads (bullish), pink where Senkou B leads (bearish). */
    var cloud = '';
    for (var s = d; s < slots - 1; s++) {
      var a0 = ich.spanA[s], a1 = ich.spanA[s + 1], b0 = ich.spanB[s], b1 = ich.spanB[s + 1];
      if (a0 == null || a1 == null || b0 == null || b1 == null) continue;
      var bull = (a0 + a1) >= (b0 + b1);
      cloud += '<polygon points="' + X(s).toFixed(1) + ',' + Y(a0).toFixed(1) + ' ' + X(s + 1).toFixed(1) + ',' + Y(a1).toFixed(1)
        + ' ' + X(s + 1).toFixed(1) + ',' + Y(b1).toFixed(1) + ' ' + X(s).toFixed(1) + ',' + Y(b0).toFixed(1) + '" '
        + 'fill="' + (bull ? 'rgba(33,209,150,0.20)' : 'rgba(255,46,136,0.15)') + '" stroke="none"/>';
    }
    var kumo = cloud + _pl(polyPts(ich.spanA, d, slots), GRN, 1.6) + _pl(polyPts(ich.spanB, d, slots), PNK, 1.6);

    var bw = Math.max(2.6, xw * 0.5), candles = '';
    ohlc.forEach(function (c, i) {
      var o = c[0], cl = c[1], lo = c[2], hi = c[3], up = cl >= o, col = up ? T : PNK;
      var x = X(i), top = Y(Math.max(o, cl)), bh = Math.max(1.4, Math.abs(Y(o) - Y(cl)));
      candles += '<line x1="' + x.toFixed(1) + '" y1="' + Y(hi).toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + Y(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1"/>'
        + '<rect x="' + (x - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="0.6" fill="' + col + '"/>';
    });

    var tenkan = _pl(polyPts(ich.tenkan, 0, n), T, 1.8);
    var kijun  = _pl(polyPts(ich.kijun, 0, n), G, 2);
    var chikou = _pl(polyPts(ich.chikou, 0, n), CHK, 1.6);

    var xNow = X(n - 1) + xw * 0.5;
    var divider = '<line x1="' + xNow.toFixed(1) + '" y1="' + (PT - 4) + '" x2="' + xNow.toFixed(1) + '" y2="' + (H - PB + 2) + '" stroke="#8b85a3" stroke-width="1" stroke-dasharray="2 3" opacity=".5"/>'
      + '<text x="' + (xNow + 4).toFixed(1) + '" y="' + (PT + 2) + '" fill="#8b85a3" font-size="8.5" font-family="JetBrains Mono,monospace">cloud →</text>';

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ichimoku cloud diagram">'
      + '<g class="ich-l ich-kumo">' + kumo + '</g>'
      + '<g class="ich-l ich-chikou">' + chikou + '</g>'
      + '<g class="ich-l ich-price">' + candles + '</g>'
      + '<g class="ich-l ich-kijun">' + kijun + '</g>'
      + '<g class="ich-l ich-tenkan">' + tenkan + '</g>'
      + divider
      + '</svg>';
  }

  function _ichStyles() {
        LTUtils.injectStyles('lt-ichimoku-styles', [
      ".ich-wrap{width:100%;max-width:600px;margin:0 auto;font-family:'Cascadia Code','JetBrains Mono',ui-monospace,monospace;}",
      ".ich-toggles{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-bottom:12px;}",
      ".ich-tog{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:20px;cursor:pointer;",
      "  border:1px solid var(--border2,#363049);background:var(--bg3,#14121f);color:var(--text3,#8b85a3);transition:all .15s;user-select:none;}",
      ".ich-tog .ich-sw{width:9px;height:9px;border-radius:2px;background:currentColor;opacity:.9;}",
      ".ich-tog.on{color:var(--c);border-color:color-mix(in srgb,var(--c) 55%,transparent);background:color-mix(in srgb,var(--c) 10%,var(--bg3,#14121f));}",
      ".ich-tog:not(.on){opacity:.5;}",
      ".ich-tog:not(.on) .ich-sw{background:var(--text3,#8b85a3);}",
      ".ich-chart{border:1px solid var(--border2,#363049);border-radius:9px;overflow:hidden;padding:10px 8px;",
      "  background:linear-gradient(180deg,rgba(0,212,212,.05),transparent 60%),var(--bg2,#0d0b18);}",
      ".ich-chart svg{width:100%;height:auto;display:block;color:var(--text,#f6f5fb);}",
      ".ich-l{transition:opacity .3s ease;}",
      /* toggled off */
      ".ich-wrap.off-price .ich-price,.ich-wrap.off-tenkan .ich-tenkan,.ich-wrap.off-kijun .ich-kijun,.ich-wrap.off-kumo .ich-kumo,.ich-wrap.off-chikou .ich-chikou{display:none;}",
      /* isolate on hover: dim the rest */
      ".ich-wrap.iso-price .ich-l:not(.ich-price),.ich-wrap.iso-tenkan .ich-l:not(.ich-tenkan),.ich-wrap.iso-kijun .ich-l:not(.ich-kijun),.ich-wrap.iso-kumo .ich-l:not(.ich-kumo),.ich-wrap.iso-chikou .ich-l:not(.ich-chikou){opacity:.14;}",
      ".ich-desc{margin-top:12px;font-size:12.5px;line-height:1.55;color:var(--text2,#a8a3bb);background:var(--bg3,#14121f);border:1px solid var(--border,#272235);border-radius:8px;padding:11px 14px;min-height:62px;transition:opacity .2s;}",
      ".ich-desc b{color:var(--text,#f6f5fb);font-weight:600;}",
      ".ich-desc .ich-dname{font-weight:800;color:var(--c,#00d4d4);}",
      ".ich-read{margin-top:9px;font-size:11.5px;color:var(--text3,#8b85a3);text-align:center;}",
      ".ich-read b{color:var(--teal,#00d4d4);}",
      "@media(max-width:600px){.ich-tog{font-size:10.5px;padding:4px 9px;}}"
    ].join(''));
  }

  function renderIchimokuExplorer(containerId) {
    _ichStyles();
    var el = document.getElementById(containerId);
    if (!el) return;

    var toggles = COMPONENTS.map(function (c) {
      return '<button class="ich-tog on" data-k="' + c.k + '" style="--c:' + c.color + '"><span class="ich-sw"></span>' + c.label + '</button>';
    }).join('');

    el.innerHTML = '<div class="ich-wrap" id="ich-wrap">'
      + '<div class="ich-toggles">' + toggles + '</div>'
      + '<div class="ich-chart">' + _chartSvg() + '</div>'
      + '<div class="ich-desc" id="ich-desc"></div>'
      + '<div class="ich-read">Reading this chart: price is <b>above the cloud</b> and Tenkan is <b>above Kijun</b> → bullish, trend confirmed.</div>'
      + '</div>';

    var wrap = el.querySelector('#ich-wrap');
    var desc = el.querySelector('#ich-desc');
    var overview = 'Ichimoku overlays <b>five</b> components on price for a one-glance read of trend, momentum and support/resistance. <b>Toggle</b> any layer to see what it adds, or <b>hover</b> a chip to isolate it.';
    function setDesc(c) {
      desc.style.opacity = '0';
      setTimeout(function () {
        if (c) { desc.style.setProperty('--c', c.color); desc.innerHTML = '<span class="ich-dname">' + c.label + '</span> — ' + c.desc.replace(/^<b>[^<]*<\/b>[^—]*—\s*/, ''); }
        else { desc.style.removeProperty('--c'); desc.innerHTML = overview; }
        desc.style.opacity = '1';
      }, 120);
    }
    setDesc(null);

    el.querySelectorAll('.ich-tog').forEach(function (btn) {
      var k = btn.getAttribute('data-k');
      var comp = COMPONENTS.filter(function (c) { return c.k === k; })[0];
      btn.addEventListener('click', function () {
        var on = btn.classList.toggle('on');
        wrap.classList.toggle('off-' + k, !on);
      });
      btn.addEventListener('mouseenter', function () { wrap.classList.add('iso-' + k); setDesc(comp); });
      btn.addEventListener('mouseleave', function () { wrap.classList.remove('iso-' + k); setDesc(null); });
    });
  }

  window.renderIchimokuExplorer = renderIchimokuExplorer;
})();
