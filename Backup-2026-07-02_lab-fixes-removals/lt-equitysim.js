'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Equity-Curve Simulator (Monte-Carlo lab)
   lt-equitysim.js

   Four sliders (win rate · R multiple · risk per trade · number of trades).
   Each run draws ~200 Monte-Carlo equity curves: a shaded 10th–90th percentile
   band, the median path, and 5 sampled curves — then prints expectancy, median
   max drawdown and bust probability (any curve losing 50% of its capital).
   Teaches: positive expectancy + sane risk survives variance; sizing busts you
   before your win rate does.

   Seeded PRNG (mulberry32): slider moves re-simulate with the SAME seed (so the
   change you see is the maths, not the dice); the Re-roll button draws new dice.
   Canvas-drawn, no dependencies, no timers — nothing to leak.

   Public:  renderEquitySim(containerId)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  var RUNS = 200, SAMPLES = 5, BUST = 0.5;   // bust = equity down 50% from start

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Simulate: returns { curves[RUNS][T+1], p10[], p50[], p90[], medianDD, bustPct } */
  function simulate(p, seed) {
    var rnd = mulberry32(seed);
    var win = 1 + (p.risk / 100) * p.r, lose = 1 - p.risk / 100;
    var curves = [], dds = [], busts = 0, i, t;
    for (i = 0; i < RUNS; i++) {
      var eq = 1, peak = 1, dd = 0, bust = false, row = [1];
      for (t = 0; t < p.trades; t++) {
        eq *= (rnd() < p.wr / 100) ? win : lose;
        row.push(eq);
        if (eq > peak) peak = eq;
        dd = Math.max(dd, 1 - eq / peak);
        if (eq <= BUST) bust = true;
      }
      curves.push(row); dds.push(dd); if (bust) busts++;
    }
    var lo = [], mid = [], hi = [], col = new Array(RUNS);
    for (t = 0; t <= p.trades; t++) {
      for (i = 0; i < RUNS; i++) col[i] = curves[i][t];
      col.sort(function (a, b) { return a - b; });
      lo.push(col[Math.floor(RUNS * 0.10)]);
      mid.push(col[Math.floor(RUNS * 0.50)]);
      hi.push(col[Math.floor(RUNS * 0.90)]);
    }
    dds.sort(function (a, b) { return a - b; });
    return { curves: curves, p10: lo, p50: mid, p90: hi, medianDD: dds[Math.floor(RUNS / 2)], bustPct: busts / RUNS * 100 };
  }

  function _esStyles() {
    LTUtils.injectStyles('lt-equitysim-styles', [
      ".es-wrap{width:100%;max-width:640px;margin:0 auto;font-family:'Cascadia Code','JetBrains Mono',ui-monospace,monospace;color:var(--text,#f6f5fb);}",
      ".es-ctrls{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;margin-bottom:12px;}",
      ".es-ctrl label{display:flex;justify-content:space-between;align-items:baseline;font-size:10px;letter-spacing:.07em;",
      "  text-transform:uppercase;color:var(--text3,#8b85a3);margin-bottom:4px;}",
      ".es-ctrl label b{font-size:12px;letter-spacing:0;text-transform:none;color:var(--text,#f6f5fb);font-variant-numeric:tabular-nums;}",
      ".es-ctrl input{width:100%;-webkit-appearance:none;appearance:none;height:3px;border-radius:3px;outline:none;cursor:pointer;",
      "  background:var(--border2,#363049);}",
      ".es-ctrl input::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--teal,#00d4d4);",
      "  border:2px solid var(--bg,#08070f);cursor:pointer;}",
      ".es-ctrl input::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:var(--teal,#00d4d4);border:2px solid var(--bg,#08070f);cursor:pointer;}",
      ".es-ctrl input:focus-visible{outline:2px solid var(--teal,#00d4d4);outline-offset:3px;}",
      ".es-canvas{border:1px solid var(--border2,#363049);border-radius:9px;overflow:hidden;",
      "  background:linear-gradient(180deg,rgba(0,212,212,.04),transparent 60%),var(--bg2,#0d0b18);}",
      ".es-canvas canvas{width:100%;height:auto;display:block;}",
      ".es-stats{display:flex;margin-top:12px;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);}",
      ".es-stat{flex:1;text-align:center;padding:9px 4px;}",
      ".es-stat+.es-stat{border-left:1px solid rgba(255,255,255,.06);}",
      ".es-stat .k{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--text3,#8b85a3);margin-bottom:3px;white-space:nowrap;}",
      ".es-stat .v{font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;}",
      ".es-exp .v.pos{color:var(--teal,#00d4d4);}.es-exp .v.neg{color:var(--bear,#ff2e88);}",
      ".es-dd .v{color:var(--gold,#e7b53a);}",
      ".es-bust .v{color:var(--text,#f6f5fb);}.es-bust .v.hot{color:var(--bear,#ff2e88);}",
      ".es-foot{display:flex;align-items:flex-start;gap:12px;margin-top:12px;}",
      ".es-run{flex:none;font-family:inherit;font-size:11px;font-weight:700;color:var(--teal,#00d4d4);background:transparent;",
      "  border:1px solid color-mix(in srgb,var(--teal,#00d4d4) 45%,transparent);border-radius:6px;padding:6px 13px;cursor:pointer;",
      "  transition:border-color .15s,transform .1s;}",
      ".es-run:hover{border-color:var(--teal,#00d4d4);}",
      ".es-run:active{transform:scale(.97);}",
      ".es-run:focus-visible{outline:2px solid var(--teal,#00d4d4);outline-offset:2px;}",
      ".es-verdict{font-size:12px;line-height:1.55;color:var(--text2,#a8a3bb);}",
      ".es-verdict b{color:var(--text,#f6f5fb);font-weight:600;}",
      ".es-verdict .ok{color:var(--teal,#00d4d4);font-weight:700;}",
      ".es-verdict .bad{color:var(--bear,#ff2e88);font-weight:700;}",
      "@media(max-width:460px){.es-ctrls{grid-template-columns:1fr;gap:9px;}.es-foot{flex-direction:column;}.es-stat .v{font-size:13px;}}"
    ].join(''));
  }

  var SLIDERS = [
    { k: 'wr', label: 'Win rate', min: 30, max: 70, step: 1, val: 45, fmt: function (v) { return v + '%'; } },
    { k: 'r', label: 'R multiple', min: 0.5, max: 4, step: 0.25, val: 2, fmt: function (v) { return v + 'R'; } },
    { k: 'risk', label: 'Risk / trade', min: 0.25, max: 5, step: 0.25, val: 1, fmt: function (v) { return v + '%'; } },
    { k: 'trades', label: 'Trades', min: 20, max: 200, step: 10, val: 100, fmt: function (v) { return '' + v; } }
  ];

  function renderEquitySim(containerId) {
    _esStyles();
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;

    var ctrls = SLIDERS.map(function (s) {
      return '<div class="es-ctrl"><label for="es-' + s.k + '"><span>' + s.label + '</span><b id="es-v-' + s.k + '">' + s.fmt(s.val) + '</b></label>'
        + '<input type="range" id="es-' + s.k + '" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '" value="' + s.val + '" aria-label="' + s.label + '"></div>';
    }).join('');

    el.innerHTML = '<div class="es-wrap">'
      + '<div class="es-ctrls">' + ctrls + '</div>'
      + '<div class="es-canvas"><canvas id="es-cv"></canvas></div>'
      + '<div class="es-stats">'
      + '<div class="es-stat es-exp"><div class="k">Expectancy</div><div class="v" id="es-s-exp"></div></div>'
      + '<div class="es-stat es-dd"><div class="k">Median max DD</div><div class="v" id="es-s-dd"></div></div>'
      + '<div class="es-stat es-bust"><div class="k">Bust risk (−50%)</div><div class="v" id="es-s-bust"></div></div>'
      + '</div>'
      + '<div class="es-foot"><button type="button" class="es-run" id="es-run">↻ Re-roll the dice</button>'
      + '<div class="es-verdict" id="es-verdict"></div></div>'
      + '</div>';

    var cv = el.querySelector('#es-cv'), ctx = cv.getContext('2d');
    var sExp = el.querySelector('#es-s-exp'), sDd = el.querySelector('#es-s-dd'), sBust = el.querySelector('#es-s-bust');
    var verdict = el.querySelector('#es-verdict'), runBtn = el.querySelector('#es-run');
    var seed = 20260702;

    function params() {
      var p = {};
      SLIDERS.forEach(function (s) { p[s.k] = +el.querySelector('#es-' + s.k).value; });
      return p;
    }

    /* resolve a CSS var against the mounted element so canvas colours track the theme */
    function cssc(name, fb) {
      try { var v = getComputedStyle(el).getPropertyValue(name).trim(); return v || fb; } catch (_) { return fb; }
    }

    function draw(p, sim) {
      var cssW = Math.max(280, Math.min(640, el.clientWidth || 640)), cssH = Math.round(cssW * 0.44);
      var dpr = window.devicePixelRatio || 1;
      cv.width = cssW * dpr; cv.height = cssH * dpr;
      cv.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      var TEAL = cssc('--teal', '#00d4d4'), DIM = cssc('--text3', '#8b85a3'), BORDER = cssc('--border', '#272235');
      var padL = 8, padR = 44, padT = 10, padB = 18;
      var iw = cssW - padL - padR, ih = cssH - padT - padB;

      /* log-scale y over the visible extent */
      var lmin = Infinity, lmax = -Infinity;
      var scan = function (v) { var lv = Math.log(Math.max(v, 1e-6)); if (lv < lmin) lmin = lv; if (lv > lmax) lmax = lv; };
      sim.p10.forEach(scan); sim.p90.forEach(scan);
      for (var s = 0; s < SAMPLES; s++) sim.curves[Math.floor((s + 0.5) * RUNS / SAMPLES)].forEach(scan);
      scan(1);
      if (lmax - lmin < 0.2) { lmin -= 0.1; lmax += 0.1; }
      var pad = (lmax - lmin) * 0.06; lmin -= pad; lmax += pad;
      function X(t) { return padL + (t / p.trades) * iw; }
      function Y(v) { return padT + (1 - (Math.log(Math.max(v, 1e-6)) - lmin) / (lmax - lmin)) * ih; }

      /* gridlines at ×0.25 ×0.5 ×1 ×2 ×4 … within range */
      ctx.font = '9px "Cascadia Code", "JetBrains Mono", monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (var e = -4; e <= 10; e++) {
        var gv = Math.pow(2, e), gl = Math.log(gv);
        if (gl < lmin || gl > lmax) continue;
        var gy = Y(gv);
        ctx.strokeStyle = BORDER; ctx.lineWidth = gv === 1 ? 1 : 0.5;
        ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(padL + iw, gy); ctx.stroke();
        ctx.fillStyle = DIM;
        ctx.fillText(gv === 1 ? 'start' : '×' + (gv < 1 ? gv.toFixed(2).replace(/0+$/, '') : gv), padL + iw + 5, gy);
      }
      /* bust line */
      var by = Y(BUST);
      if (by > padT && by < padT + ih) {
        ctx.strokeStyle = cssc('--bear', '#ff2e88'); ctx.lineWidth = 0.7;
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(padL, by); ctx.lineTo(padL + iw, by); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = cssc('--bear', '#ff2e88');
        ctx.fillText('−50%', padL + iw + 5, by);
      }

      /* percentile band */
      ctx.beginPath();
      sim.p90.forEach(function (v, t) { t === 0 ? ctx.moveTo(X(t), Y(v)) : ctx.lineTo(X(t), Y(v)); });
      for (var t2 = p.trades; t2 >= 0; t2--) ctx.lineTo(X(t2), Y(sim.p10[t2]));
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,212,212,0.10)';
      ctx.fill();

      /* sample curves */
      ctx.lineWidth = 0.8; ctx.strokeStyle = DIM; ctx.globalAlpha = 0.55;
      for (var s2 = 0; s2 < SAMPLES; s2++) {
        var row = sim.curves[Math.floor((s2 + 0.5) * RUNS / SAMPLES)];
        ctx.beginPath();
        row.forEach(function (v, t) { t === 0 ? ctx.moveTo(X(t), Y(v)) : ctx.lineTo(X(t), Y(v)); });
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* median */
      ctx.lineWidth = 1.6; ctx.strokeStyle = TEAL;
      ctx.beginPath();
      sim.p50.forEach(function (v, t) { t === 0 ? ctx.moveTo(X(t), Y(v)) : ctx.lineTo(X(t), Y(v)); });
      ctx.stroke();

      /* x labels */
      ctx.fillStyle = DIM; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      [0, 0.5, 1].forEach(function (f) {
        ctx.fillText('' + Math.round(p.trades * f), X(p.trades * f), cssH - 5);
      });
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(0,212,212,0.8)';
      ctx.fillText(cssW < 460 ? RUNS + ' runs · 10–90% band' : '10th–90th percentile of ' + RUNS + ' runs · median in teal', padL + 4, padT + 4);
    }

    function refresh() {
      var p = params();
      SLIDERS.forEach(function (s) { el.querySelector('#es-v-' + s.k).textContent = s.fmt(p[s.k]); });
      var sim = simulate(p, seed);
      draw(p, sim);

      var expR = (p.wr / 100) * p.r - (1 - p.wr / 100);          // R per trade
      var expPct = expR * p.risk;                                 // % per trade
      sExp.textContent = (expR >= 0 ? '+' : '') + expR.toFixed(2) + 'R';
      sExp.className = 'v ' + (expR >= 0 ? 'pos' : 'neg');
      sDd.textContent = '−' + (sim.medianDD * 100).toFixed(0) + '%';
      sBust.textContent = sim.bustPct.toFixed(0) + '%';
      sBust.className = 'v' + (sim.bustPct >= 10 ? ' hot' : '');

      var breakEven = (100 / (1 + p.r)).toFixed(0);
      var msg;
      if (expR < 0) {
        msg = '<span class="bad">Negative expectancy</span> — at ' + p.r + 'R you need &gt;' + breakEven + '% wins to break even, and ' + p.wr + '% isn\'t it. No position sizing fixes losing maths.';
      } else if (sim.bustPct >= 10) {
        msg = 'The edge is real (<b>+' + expPct.toFixed(2) + '%/trade</b>) but at ' + p.risk + '% risk, <span class="bad">' + sim.bustPct.toFixed(0) + '% of runs still bust</span>. Same maths, smaller size — try it.';
      } else {
        msg = '<span class="ok">Positive expectancy + sane risk survives variance</span> — every curve rides the same ' + p.wr + '%/' + p.r + 'R maths; the spread between them is pure luck.';
      }
      verdict.innerHTML = msg;
    }

    SLIDERS.forEach(function (s) {
      el.querySelector('#es-' + s.k).addEventListener('input', refresh);
    });
    runBtn.addEventListener('click', function () { seed = (seed + 1) >>> 0; refresh(); });

    refresh();
  }

  /* exposed for the node sanity harness */
  renderEquitySim._sim = simulate;

  window.renderEquitySim = renderEquitySim;
})();
