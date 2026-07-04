'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Fibonacci Retracement (animated demo)
   lt-fib.js

   A scripted, looping demo: an impulse leg is measured, the Fibonacci levels fan
   out, price pulls back into the 0.618–0.65 "golden pocket", and bounces. Canned
   choreography (opacity reveal per phase) — not a live chart. Leak-safe; honours
   prefers-reduced-motion (shows the finished frame).

   Public:  renderFibDemo(containerId) / stopFibDemo(containerId)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  var STEP_MS = 1500;
  var T = 'var(--teal,#00d4d4)', B = 'var(--bear,#ff2e88)', G = 'var(--gold,#e7b53a)', S = 'var(--text3,#8b85a3)';

  // fib geometry: high y=40, low y=150 (range 110)
  var HI = 40, LO = 150, RNG = LO - HI;
  var LEVELS = [
    { r: 0, lab: '0' }, { r: 0.236, lab: '.236' }, { r: 0.382, lab: '.382' },
    { r: 0.5, lab: '.5' }, { r: 0.618, lab: '.618' }, { r: 0.786, lab: '.786' }, { r: 1, lab: '1.0' }
  ];
  function _y(r) { return HI + r * RNG; }

  function _svg() {
    var fibLines = LEVELS.map(function (L) {
      var y = _y(L.r), gold = (L.r === 0.618);
      return '<line x1="70" y1="' + y + '" x2="326" y2="' + y + '" stroke="' + (gold ? G : S) + '" stroke-width="' + (gold ? 1.3 : 1) + '" stroke-dasharray="4 3" opacity="' + (gold ? 0.9 : 0.5) + '"/>'
        + '<text x="64" y="' + (y + 3) + '" text-anchor="end" fill="' + (gold ? G : S) + '" font-size="8.5" font-family="JetBrains Mono,monospace" font-weight="700">' + L.lab + '</text>';
    }).join('');
    var pocket = '<rect x="70" y="' + _y(0.618) + '" width="256" height="' + (_y(0.66) - _y(0.618)) + '" fill="rgba(231,181,58,0.22)"/>'
      + '<text x="322" y="' + (_y(0.618) - 3) + '" text-anchor="end" fill="' + G + '" font-size="8.5" font-family="JetBrains Mono,monospace" font-weight="700">golden pocket</text>';
    return '<svg viewBox="0 0 340 180" xmlns="http://www.w3.org/2000/svg" role="img">'
      + '<g class="fib-lines">' + fibLines + '</g>'
      + '<g class="fib-pocket">' + pocket + '</g>'
      + '<polyline class="fib-impulse" points="40,150 66,120 88,132 112,80 134,92 150,40" fill="none" stroke="' + T + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>'
      + '<polyline class="fib-retrace" points="150,40 172,66 196,58 218,88 238,110" fill="none" stroke="' + B + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>'
      + '<polyline class="fib-bounce" points="238,110 262,80 286,96 314,22" fill="none" stroke="' + T + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>'
      + '<g class="fib-entry"><circle cx="238" cy="110" r="4" fill="' + G + '"/><circle cx="238" cy="110" r="8" fill="none" stroke="' + G + '" stroke-width="1.2" opacity=".7"/></g>'
      + '</svg>';
  }

  var PHASES = [
    { cls: ['p-impulse'], cap: 'A strong <b>impulse leg</b> up — the move we measure a pullback against.' },
    { cls: ['p-impulse', 'p-fibs'], cap: 'Fibonacci divides that leg into the <b>levels traders watch</b> for a pullback.' },
    { cls: ['p-impulse', 'p-fibs', 'p-pocket'], cap: 'The <span class="fib-hl">0.618–0.65</span> zone is the <b>golden pocket</b> — the highest-interest entry.' },
    { cls: ['p-impulse', 'p-fibs', 'p-pocket', 'p-retrace'], cap: 'Price pulls back… and taps the <b>pocket</b>.' },
    { cls: ['p-impulse', 'p-fibs', 'p-pocket', 'p-retrace', 'p-bounce', 'p-entry'], cap: 'Buyers step in at the pocket and the <b>trend resumes</b> — a textbook long entry.' }
  ];

  function _fibStyles() {
        LTUtils.injectStyles('lt-fib-styles', [
      ".fib-wrap{width:100%;max-width:460px;margin:0 auto;font-family:'Cascadia Code','JetBrains Mono',ui-monospace,monospace;}",
      ".fib-chart{border:1px solid var(--border2,#363049);border-radius:9px;overflow:hidden;padding:8px;background:linear-gradient(180deg,rgba(0,212,212,.05),transparent 60%),var(--bg2,#0d0b18);}",
      ".fib-chart svg{width:100%;height:auto;display:block;}",
      ".fib-lines,.fib-pocket,.fib-impulse,.fib-retrace,.fib-bounce,.fib-entry{opacity:0;transition:opacity .5s ease;}",
      ".fib-wrap.p-impulse .fib-impulse{opacity:1;}",
      ".fib-wrap.p-fibs .fib-lines{opacity:1;}",
      ".fib-wrap.p-pocket .fib-pocket{opacity:1;}",
      ".fib-wrap.p-pocket .fib-pocket rect{animation:fibGlow 1.6s ease-in-out infinite;}",
      "@keyframes fibGlow{0%,100%{opacity:.7;}50%{opacity:1;}}",
      ".fib-wrap.p-retrace .fib-retrace{opacity:1;}",
      ".fib-wrap.p-bounce .fib-bounce{opacity:1;}",
      ".fib-wrap.p-entry .fib-entry{opacity:1;}",
      ".fib-cap{min-height:34px;margin-top:11px;font-size:12.5px;line-height:1.5;color:var(--text2,#a8a3bb);text-align:center;transition:opacity .25s ease;}",
      ".fib-cap b{color:var(--text,#f6f5fb);font-weight:600;}.fib-cap .fib-hl{color:var(--gold,#e7b53a);font-weight:700;}",
      ".fib-dots{display:flex;justify-content:center;gap:6px;margin-top:9px;}",
      ".fib-dot{width:5px;height:5px;border-radius:50%;background:var(--border2,#363049);transition:all .3s;}",
      ".fib-dot.on{background:var(--gold,#e7b53a);transform:scale(1.35);}"
    ].join(''));
  }

  function renderFibDemo(containerId) {
    _fibStyles();
    var el = document.getElementById(containerId);
    if (!el) return;
    stopFibDemo(containerId);

    var dots = PHASES.map(function (_, i) { return '<span class="fib-dot" data-i="' + i + '"></span>'; }).join('');
    el.innerHTML = '<div class="fib-wrap" id="fib-wrap"><div class="fib-chart">' + _svg() + '</div>'
      + '<div class="fib-cap" id="fib-cap"></div><div class="fib-dots">' + dots + '</div></div>';
    var wrap = el.querySelector('#fib-wrap'), cap = el.querySelector('#fib-cap'), dotEls = el.querySelectorAll('.fib-dot');

    var reduce = false; try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

    function paint(i, animate) {
      wrap.className = 'fib-wrap ' + PHASES[i].cls.join(' ');
      if (animate) { cap.style.opacity = '0'; setTimeout(function () { cap.innerHTML = PHASES[i].cap; cap.style.opacity = '1'; }, 130); }
      else cap.innerHTML = PHASES[i].cap;
      dotEls.forEach(function (d) { d.classList.toggle('on', +d.getAttribute('data-i') === i); });
    }

    if (reduce) { paint(PHASES.length - 1, false); return; }

    paint(0, false);
    var i = 0;
    el._fibTimer = setInterval(function () {
      if (!document.body.contains(el)) { stopFibDemo(el); return; }
      i = (i + 1) % PHASES.length;
      paint(i, true);
    }, STEP_MS);
  }

  function stopFibDemo(containerId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (el && el._fibTimer) { clearInterval(el._fibTimer); el._fibTimer = null; }
  }

  window.renderFibDemo = renderFibDemo;
  window.stopFibDemo = stopFibDemo;
})();
