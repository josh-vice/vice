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

  var T = 'var(--teal,#00d4d4)', G = 'var(--gold,#e7b53a)', GRN = '#21d196', PNK = 'var(--bear,#ff2e88)', S = 'var(--text3,#8b85a3)';

  function _pl(pts, c, w, d) { return '<polyline points="' + pts + '" fill="none" stroke="' + c + '" stroke-width="' + (w || 2) + '"' + (d ? ' stroke-dasharray="4 3"' : '') + ' stroke-linejoin="round" stroke-linecap="round"/>'; }
  // thin candle (up = close above open => c<o in y)
  function _c(x, o, cl, h, l) { var up = cl <= o, col = up ? T : PNK, top = Math.min(o, cl), bh = Math.max(1.6, Math.abs(cl - o)); return '<line x1="' + x + '" y1="' + h + '" x2="' + x + '" y2="' + l + '" stroke="' + col + '" stroke-width="1"/><rect x="' + (x - 2.6) + '" y="' + top + '" width="5.2" height="' + bh + '" rx="0.6" fill="' + col + '"/>'; }

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

  function _chartSvg() {
    // candles: rising trend with a mid pullback
    var candles = [
      [56,120,110,106,124],[74,110,100,96,114],[92,100,104,98,110],[110,104,92,88,108],
      [128,92,84,80,96],[146,84,88,82,94],[164,88,96,86,100],[182,96,90,86,100],
      [200,90,80,76,94],[218,80,74,70,84],[236,74,68,64,78]
    ].map(function (a) { return _c(a[0], a[1], a[2], a[3], a[4]); }).join('');

    var tenkan = _pl('56,112 74,102 92,105 110,94 128,85 146,88 164,95 182,89 200,80 218,73 236,67', T, 2);
    var kijun  = _pl('50,117 92,111 128,101 164,99 200,91 244,84', G, 2.2);
    var senkouA = '100,113 140,99 180,93 220,83 268,74 322,71';
    var senkouB = '100,121 160,117 220,111 322,106';
    var kumoFill = '<polygon points="' + senkouA + ' 322,106 220,111 160,117 100,121" fill="rgba(33,209,150,0.16)"/>';
    var kumo = kumoFill + _pl(senkouA, GRN, 1.5) + _pl(senkouB, PNK, 1.5);
    var chikou = _pl('18,112 36,102 54,105 72,94 90,85 108,88 126,95 144,89 162,80 180,73 198,67', S, 1.8, false);

    return '<svg viewBox="0 0 336 150" xmlns="http://www.w3.org/2000/svg" role="img">'
      + '<g class="ich-l ich-kumo">' + kumo + '</g>'
      + '<g class="ich-l ich-chikou">' + chikou + '</g>'
      + '<g class="ich-l ich-price">' + candles + '</g>'
      + '<g class="ich-l ich-kijun">' + kijun + '</g>'
      + '<g class="ich-l ich-tenkan">' + tenkan + '</g>'
      + '<line x1="248" y1="16" x2="248" y2="140" stroke="#8b85a3" stroke-width="1" stroke-dasharray="2 3" opacity=".45"/>'
      + '<text x="252" y="24" fill="#8b85a3" font-size="8" font-family="JetBrains Mono,monospace">now →</text>'
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
