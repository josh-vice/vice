'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Sentiment Board (animated demo)
   lt-sentiment.js

   A scripted, looping panel: the four Sentiment-Analysis signals (funding · open
   interest · cumulative delta · basis) reach bearish extremes together at a DBS
   support, a conviction meter fills, and the trapped shorts squeeze up. Canned
   choreography — not live data. Clean/minimal: one panel, hairline rows, GPU-only
   transitions (transform/opacity), strong ease-out. prefers-reduced-motion aware.

   Public:  renderSentimentBoard(containerId) / stopSentimentBoard(containerId)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  var STEP_MS = 1400;
  var T = 'var(--teal,#00d4d4)', B = 'var(--bear,#ff2e88)', G = 'var(--gold,#e7b53a)', S = '#8b85a3';

  var SIGNALS = [
    { k: 'funding', label: 'Funding', v: 0.94, val: '−0.09%' },
    { k: 'oi', label: 'Open interest', v: 0.80, val: '▲ +38%' },
    { k: 'cvd', label: 'Cum. delta', v: 0.96, val: '−1.4M δ' },
    { k: 'basis', label: 'Basis', v: 0.72, val: 'backwardation' }
  ];

  var PHASES = [
    { hot: [], cap: 'Four sentiment signals, read together at a key <b>DBS support</b>.' },
    { hot: ['funding'], cap: 'Funding is deeply negative — the crowd is <b>short</b>, and paying to stay there.' },
    { hot: ['funding', 'oi'], cap: 'Open interest keeps climbing — <b>more shorts</b> piling in.' },
    { hot: ['funding', 'oi', 'cvd'], cap: 'Cumulative delta is deep red — <b>aggressive selling</b> into support.' },
    { hot: ['funding', 'oi', 'cvd', 'basis'], cap: 'Basis flips to backwardation — <b>bearish positioning everywhere</b>.' },
    { hot: ['funding', 'oi', 'cvd', 'basis'], squeeze: true, cap: 'All four aligned at the DBS. The shorts are <span class="sb-hl">trapped</span> — the squeeze up is the high-conviction long.' }
  ];

  function _price() {
    return '<svg viewBox="0 0 320 58" xmlns="http://www.w3.org/2000/svg" role="img">'
      + '<rect x="8" y="40" width="304" height="12" fill="color-mix(in srgb,var(--teal,#00d4d4) 12%,transparent)"/>'
      + '<line x1="8" y1="40" x2="312" y2="40" stroke="' + T + '" stroke-width="1" stroke-dasharray="4 3" opacity=".55"/>'
      + '<text x="12" y="37" fill="' + T + '" font-size="8" font-family="JetBrains Mono,monospace" opacity=".8">DBS support</text>'
      + '<polyline points="10,16 56,28 104,24 152,38 208,44 250,45" fill="none" stroke="' + S + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>'
      + '<polyline class="sb-squeeze" points="250,45 278,28 308,8" fill="none" stroke="' + T + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>'
      + '<text class="sb-sqlab" x="308" y="18" text-anchor="end" fill="' + T + '" font-size="8.5" font-weight="700" font-family="JetBrains Mono,monospace">squeeze ↑</text>'
      + '</svg>';
  }

  function _sentStyles() {
    if (document.getElementById('lt-sentiment-styles')) return;
    var s = document.createElement('style'); s.id = 'lt-sentiment-styles';
    var EO = 'cubic-bezier(0.23,1,0.32,1)';
    s.textContent = [
      ".sb-wrap{--eo:" + EO + ";width:100%;max-width:440px;margin:0 auto;font-family:'Cascadia Code','JetBrains Mono',ui-monospace,monospace;color:var(--text,#f6f5fb);}",
      ".sb-panel{border:1px solid var(--border2,#363049);border-radius:10px;background:var(--bg2,#0d0b18);padding:14px 16px 4px;}",
      ".sb-price{margin:-2px -4px 6px;}.sb-price svg{width:100%;height:auto;display:block;}",
      ".sb-squeeze,.sb-sqlab{opacity:0;transition:opacity .5s var(--eo);}",
      ".sb-wrap.squeeze .sb-squeeze,.sb-wrap.squeeze .sb-sqlab{opacity:1;}",
      /* signal rows — hairline separated, no boxes */
      ".sb-row{display:grid;grid-template-columns:96px 1fr 78px;align-items:center;gap:12px;height:30px;border-top:1px solid rgba(255,255,255,.045);}",
      ".sb-label{font-size:12px;color:var(--text3,#8b85a3);transition:color .3s var(--eo);white-space:nowrap;}",
      ".sb-row.hot .sb-label{color:var(--text,#f6f5fb);}",
      ".sb-meter{height:3px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden;}",
      ".sb-fill{display:block;height:100%;width:100%;border-radius:3px;background:var(--bear,#ff2e88);transform:scaleX(0);transform-origin:left;transition:transform .55s var(--eo);}",
      ".sb-row.hot .sb-fill{transform:scaleX(var(--v));}",
      ".sb-val{font-size:11px;text-align:right;color:var(--bear,#ff2e88);font-variant-numeric:tabular-nums;opacity:0;transform:translateX(4px);transition:opacity .35s var(--eo),transform .35s var(--eo);}",
      ".sb-row.hot .sb-val{opacity:1;transform:none;}",
      /* conviction meter — slim */
      ".sb-conv{display:flex;align-items:center;gap:9px;margin:11px 0 12px;}",
      ".sb-conv-k{font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--text3,#8b85a3);}",
      ".sb-conv-track{display:flex;gap:4px;flex:1;}",
      ".sb-seg{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.08);transition:background .35s var(--eo),box-shadow .35s var(--eo);}",
      ".sb-seg.on{background:var(--gold,#e7b53a);box-shadow:0 0 8px color-mix(in srgb,var(--gold,#e7b53a) 55%,transparent);}",
      ".sb-conv.full .sb-seg.on{background:var(--teal,#00d4d4);box-shadow:0 0 8px color-mix(in srgb,var(--teal,#00d4d4) 55%,transparent);}",
      ".sb-conv-n{font-size:11px;font-weight:700;color:var(--text2,#a8a3bb);font-variant-numeric:tabular-nums;min-width:24px;text-align:right;}",
      ".sb-conv.full .sb-conv-n{color:var(--teal,#00d4d4);}",
      ".sb-cap{min-height:34px;font-size:12.5px;line-height:1.5;color:var(--text2,#a8a3bb);text-align:center;transition:opacity .25s var(--eo);}",
      ".sb-cap b{color:var(--text,#f6f5fb);font-weight:600;}.sb-cap .sb-hl{color:var(--teal,#00d4d4);font-weight:700;}",
      ".sb-dots{display:flex;justify-content:center;gap:6px;margin-top:9px;}",
      ".sb-dot{width:5px;height:5px;border-radius:50%;background:var(--border2,#363049);transition:transform .3s var(--eo),background .3s var(--eo);}",
      ".sb-dot.on{background:var(--teal,#00d4d4);transform:scale(1.35);}"
    ].join('');
    document.head.appendChild(s);
  }

  function renderSentimentBoard(containerId) {
    _sentStyles();
    var el = document.getElementById(containerId);
    if (!el) return;
    stopSentimentBoard(containerId);

    var rows = SIGNALS.map(function (s) {
      return '<div class="sb-row" data-k="' + s.k + '"><span class="sb-label">' + s.label + '</span>'
        + '<span class="sb-meter"><span class="sb-fill" style="--v:' + s.v + '"></span></span>'
        + '<span class="sb-val">' + s.val + '</span></div>';
    }).join('');
    var segs = SIGNALS.map(function () { return '<span class="sb-seg"></span>'; }).join('');
    var dots = PHASES.map(function (_, i) { return '<span class="sb-dot" data-i="' + i + '"></span>'; }).join('');

    el.innerHTML = '<div class="sb-wrap" id="sb-wrap"><div class="sb-panel">'
      + '<div class="sb-price">' + _price() + '</div>'
      + rows
      + '<div class="sb-conv" id="sb-conv"><span class="sb-conv-k">Conviction</span><span class="sb-conv-track">' + segs + '</span><span class="sb-conv-n" id="sb-conv-n">0/4</span></div>'
      + '</div>'
      + '<div class="sb-cap" id="sb-cap"></div><div class="sb-dots">' + dots + '</div></div>';

    var wrap = el.querySelector('#sb-wrap'), cap = el.querySelector('#sb-cap');
    var rowEls = el.querySelectorAll('.sb-row'), segEls = el.querySelectorAll('.sb-seg');
    var conv = el.querySelector('#sb-conv'), convN = el.querySelector('#sb-conv-n'), dotEls = el.querySelectorAll('.sb-dot');

    function paint(i, animate) {
      var p = PHASES[i];
      rowEls.forEach(function (r) { r.classList.toggle('hot', p.hot.indexOf(r.getAttribute('data-k')) !== -1); });
      var n = p.hot.length;
      segEls.forEach(function (sg, j) { sg.classList.toggle('on', j < n); });
      convN.textContent = n + '/4';
      conv.classList.toggle('full', n === 4);
      wrap.classList.toggle('squeeze', !!p.squeeze);
      if (animate) { cap.style.opacity = '0'; setTimeout(function () { cap.innerHTML = p.cap; cap.style.opacity = '1'; }, 130); }
      else cap.innerHTML = p.cap;
      dotEls.forEach(function (d) { d.classList.toggle('on', +d.getAttribute('data-i') === i); });
    }

    var reduce = false; try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
    if (reduce) { paint(PHASES.length - 1, false); return; }

    paint(0, false);
    var i = 0;
    el._sbTimer = setInterval(function () {
      if (!document.body.contains(el)) { stopSentimentBoard(containerId); return; }
      i = (i + 1) % PHASES.length;
      paint(i, true);
    }, STEP_MS);
  }

  function stopSentimentBoard(containerId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (el && el._sbTimer) { clearInterval(el._sbTimer); el._sbTimer = null; }
  }

  window.renderSentimentBoard = renderSentimentBoard;
  window.stopSentimentBoard = stopSentimentBoard;
})();
