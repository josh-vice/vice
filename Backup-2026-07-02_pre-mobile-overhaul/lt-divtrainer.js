'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Divergence Trainer (drill)
   lt-divtrainer.js

   One randomly-picked scenario at a time: a price panel + an RSI(6) panel
   computed live from the drawn closes (Wilder smoothing via LTTa.computeRSI).
   The learner answers with one of five calls — Regular Bullish / Regular
   Bearish / Hidden Bullish / Hidden Bearish / No Divergence. Feedback draws the
   two anchor swings on BOTH panels and explains exactly which highs/lows
   disagreed (with the real numbers). Score chip tracks the streak.

   Deterministic per scenario (hand-authored close arrays, verified against the
   RSI math). No timers — nothing to leak.

   Public:  renderDivTrainer(containerId)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  var RSI_P = 6;
  var T = 'var(--teal,#00d4d4)', B = 'var(--bear,#ff2e88)', G = 'var(--gold,#e7b53a)', S = 'var(--text3,#8b85a3)';

  var ANSWERS = [
    { id: 'reg-bull', label: 'Regular Bullish' },
    { id: 'reg-bear', label: 'Regular Bearish' },
    { id: 'hid-bull', label: 'Hidden Bullish' },
    { id: 'hid-bear', label: 'Hidden Bearish' },
    { id: 'none', label: 'No Divergence' }
  ];

  /* Each scenario: hand-authored closes (16 bars), the two anchor bars to compare
     (a1 < a2, both ≥ RSI period so RSI exists), which side the anchors are
     (lows/highs), the correct call, and the takeaway line. The WHY line is built
     at runtime from the actual prices + computed RSI, so it can never disagree
     with the panels. */
  var SCENARIOS = [
    {
      id: 'reg-bull', side: 'low',
      closes: [100, 98.5, 99.2, 96.5, 95, 95.8, 93, 91.5, 90.2, 92.5, 94.5, 93, 91.5, 90.5, 89.6, 92],
      a1: 8, a2: 14,
      takeaway: 'Seller momentum failed to confirm the new low — <b>regular bullish</b>: potential reversal UP, found at bottoms.'
    },
    {
      id: 'reg-bear', side: 'high',
      closes: [100, 101.5, 100.8, 103.5, 105, 104.2, 107, 108.5, 109.8, 107.5, 105.5, 107, 108.5, 109.5, 110.4, 108],
      a1: 8, a2: 14,
      takeaway: 'Buyer momentum failed to confirm the new high — <b>regular bearish</b>: potential reversal DOWN, found at tops.'
    },
    {
      id: 'hid-bull', side: 'low',
      closes: [91, 93, 92.2, 94.5, 96, 95.2, 94.4, 96.5, 99, 101.5, 103.5, 101, 99, 97.6, 100, 102.5],
      a1: 6, a2: 13,
      takeaway: 'A HIGHER price low on a LOWER oscillator low inside an uptrend — <b>hidden bullish</b>: continuation UP; buy-the-dip signal.'
    },
    {
      id: 'hid-bear', side: 'high',
      closes: [109, 107, 107.8, 105.5, 104, 104.8, 105.6, 103.5, 101, 98.5, 96.5, 99, 101, 102.4, 100, 97.5],
      a1: 6, a2: 13,
      takeaway: 'A LOWER price high on a HIGHER oscillator high inside a downtrend — <b>hidden bearish</b>: continuation DOWN; sell-the-rally signal.'
    },
    {
      id: 'none', side: 'high',
      closes: [92, 94, 93.2, 95.5, 97, 96.2, 98.5, 100, 99, 98.2, 100.8, 103.2, 104, 105.8, 104.4, 105.2],
      a1: 7, a2: 13,
      takeaway: 'Price and RSI agree — both printing higher highs. Healthy trend, <b>no divergence</b>: nothing to fade here.'
    },
    {
      id: 'none-2', answerId: 'none', side: 'low',
      closes: [108, 106.8, 107.6, 105.8, 106.6, 104.6, 105.4, 103.4, 102.2, 103.6, 102.8, 100.4, 98, 98.9, 95.5, 93],
      a1: 8, a2: 15,
      takeaway: 'Price and RSI agree — lower lows on BOTH panels means momentum confirms the selling. <b>No divergence</b>; the slopes must disagree.'
    }
  ];

  function _candles(closes) {
    return closes.map(function (c, i) {
      var o = i === 0 ? c + (closes[1] > c ? -0.5 : 0.5) : closes[i - 1];
      var w = 0.35 + ((i * 7) % 3) * 0.15;
      return { o: o, c: c, h: Math.max(o, c) + w, l: Math.min(o, c) - w };
    });
  }

  function _rsi(candles) {
    var ohlc = candles.map(function (c) { return [c.o, c.c, c.l, c.h]; });
    if (window.LTTa && LTTa.computeRSI) return LTTa.computeRSI(ohlc, RSI_P);
    /* minimal Wilder fallback (matches lt-ta.js) */
    var n = ohlc.length, out = new Array(n).fill(null);
    if (n <= RSI_P) return out;
    var g = 0, l = 0, i;
    for (i = 1; i <= RSI_P; i++) { var ch = ohlc[i][1] - ohlc[i - 1][1]; if (ch >= 0) g += ch; else l += -ch; }
    var ag = g / RSI_P, al = l / RSI_P;
    out[RSI_P] = al === 0 ? 100 : +(100 - 100 / (1 + ag / al)).toFixed(2);
    for (i = RSI_P + 1; i < n; i++) {
      var d = ohlc[i][1] - ohlc[i - 1][1];
      ag = (ag * (RSI_P - 1) + (d > 0 ? d : 0)) / RSI_P; al = (al * (RSI_P - 1) + (d < 0 ? -d : 0)) / RSI_P;
      out[i] = al === 0 ? 100 : +(100 - 100 / (1 + ag / al)).toFixed(2);
    }
    return out;
  }

  function _dtStyles() {
    LTUtils.injectStyles('lt-divtrainer-styles', [
      ".dt-wrap{width:100%;max-width:640px;margin:0 auto;font-family:'Cascadia Code','JetBrains Mono',ui-monospace,monospace;color:var(--text,#f6f5fb);}",
      ".dt-head{display:flex;align-items:center;gap:10px;margin-bottom:9px;}",
      ".dt-title{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--text3,#8b85a3);}",
      ".dt-score{margin-left:auto;font-size:10.5px;color:var(--text3,#8b85a3);font-variant-numeric:tabular-nums;white-space:nowrap;}",
      ".dt-score b{color:var(--teal,#00d4d4);font-weight:700;}",
      ".dt-chart{border:1px solid var(--border2,#363049);border-radius:9px;overflow:hidden;padding:8px 6px 4px;",
      "  background:linear-gradient(180deg,rgba(0,212,212,.04),transparent 60%),var(--bg2,#0d0b18);}",
      ".dt-chart svg{width:100%;height:auto;display:block;}",
      ".dt-anno{opacity:0;transition:opacity .4s ease;}",
      ".dt-anno.shown{opacity:1;}",
      ".dt-btns{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;}",
      ".dt-btn{font-family:inherit;font-size:11px;font-weight:700;color:var(--text2,#a8a3bb);background:transparent;",
      "  border:1px solid var(--border2,#363049);border-radius:6px;padding:6px 11px;cursor:pointer;",
      "  transition:border-color .15s,color .15s,transform .1s;}",
      ".dt-btn:hover:not([disabled]){border-color:color-mix(in srgb,var(--teal,#00d4d4) 55%,transparent);color:var(--text,#f6f5fb);}",
      ".dt-btn:active{transform:scale(.97);}",
      ".dt-btn:focus-visible{outline:2px solid var(--teal,#00d4d4);outline-offset:2px;}",
      ".dt-btn[disabled]{cursor:default;opacity:.45;}",
      ".dt-btn.right{border-color:var(--teal,#00d4d4);color:var(--teal,#00d4d4);opacity:1;}",
      ".dt-btn.wrong{border-color:var(--bear,#ff2e88);color:var(--bear,#ff2e88);opacity:1;}",
      ".dt-btn.next{margin-left:auto;color:var(--teal,#00d4d4);border-color:color-mix(in srgb,var(--teal,#00d4d4) 45%,transparent);}",
      ".dt-fb{margin-top:11px;min-height:52px;font-size:12.5px;line-height:1.55;color:var(--text2,#a8a3bb);transition:opacity .25s ease;}",
      ".dt-fb b{color:var(--text,#f6f5fb);font-weight:600;}",
      ".dt-fb .ok{color:var(--teal,#00d4d4);font-weight:700;}",
      ".dt-fb .no{color:var(--bear,#ff2e88);font-weight:700;}",
      ".dt-fb .why{display:block;margin-top:5px;color:var(--text3,#8b85a3);font-size:11.5px;}",
      "@media(max-width:420px){.dt-btn{font-size:10px;padding:5px 8px;}.dt-btn.next{margin-left:0;width:100%;text-align:center;}}"
    ].join(''));
  }

  /* geometry: price panel on top, RSI beneath, shared x */
  var W = 640, PH = 170, RH = 84, GAP = 12, PAD_L = 12, PAD_R = 40, PAD_T = 14;
  var H = PH + GAP + RH + 10;

  function _panelSvg(sc) {
    var candles = _candles(sc.closes), rsi = _rsi(candles), n = candles.length;
    var pmin = Infinity, pmax = -Infinity;
    candles.forEach(function (c) { pmin = Math.min(pmin, c.l); pmax = Math.max(pmax, c.h); });
    var span = (pmax - pmin) || 1;
    var xw = (W - PAD_L - PAD_R) / n;
    function X(i) { return PAD_L + i * xw + xw / 2; }
    function PY(p) { return PAD_T + (1 - (p - pmin) / span) * (PH - PAD_T - 6); }
    var rTop = PH + GAP;
    function RY(v) { return rTop + (1 - v / 100) * RH; }

    var body = '';
    candles.forEach(function (c, i) {
      var up = c.c >= c.o, col = up ? T : B;
      var top = PY(Math.max(c.o, c.c)), bh = Math.max(1.4, Math.abs(PY(c.o) - PY(c.c)));
      body += '<line x1="' + X(i).toFixed(1) + '" y1="' + PY(c.h).toFixed(1) + '" x2="' + X(i).toFixed(1) + '" y2="' + PY(c.l).toFixed(1) + '" stroke="' + col + '" stroke-width="1"/>'
        + '<rect x="' + (X(i) - xw * 0.27).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + (xw * 0.54).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="0.8" fill="' + col + '"/>';
    });

    var rpts = [];
    rsi.forEach(function (v, i) { if (v !== null) rpts.push(X(i).toFixed(1) + ',' + RY(v).toFixed(1)); });
    var guides = [70, 50, 30].map(function (v) {
      return '<line x1="' + PAD_L + '" y1="' + RY(v).toFixed(1) + '" x2="' + (W - PAD_R + 26) + '" y2="' + RY(v).toFixed(1) + '" stroke="' + S + '" stroke-width="' + (v === 50 ? 0.6 : 1) + '" stroke-dasharray="3 4" opacity=".4"/>'
        + '<text x="' + (W - PAD_R + 30) + '" y="' + (RY(v) + 3).toFixed(1) + '" fill="' + S + '" font-size="8.5" font-family="JetBrains Mono,monospace" opacity=".8">' + v + '</text>';
    }).join('');

    /* anchor annotations (revealed after an answer) */
    var yAt = function (i) { return sc.side === 'low' ? PY(candles[i].l) + 3 : PY(candles[i].h) - 3; };
    var anno = '<g id="dt-anno" class="dt-anno">'
      + '<line x1="' + X(sc.a1).toFixed(1) + '" y1="' + yAt(sc.a1).toFixed(1) + '" x2="' + X(sc.a2).toFixed(1) + '" y2="' + yAt(sc.a2).toFixed(1) + '" stroke="' + G + '" stroke-width="1.4" stroke-dasharray="5 3"/>'
      + '<circle cx="' + X(sc.a1).toFixed(1) + '" cy="' + yAt(sc.a1).toFixed(1) + '" r="2.6" fill="' + G + '"/>'
      + '<circle cx="' + X(sc.a2).toFixed(1) + '" cy="' + yAt(sc.a2).toFixed(1) + '" r="2.6" fill="' + G + '"/>'
      + '<line x1="' + X(sc.a1).toFixed(1) + '" y1="' + RY(rsi[sc.a1]).toFixed(1) + '" x2="' + X(sc.a2).toFixed(1) + '" y2="' + RY(rsi[sc.a2]).toFixed(1) + '" stroke="' + G + '" stroke-width="1.4" stroke-dasharray="5 3"/>'
      + '<circle cx="' + X(sc.a1).toFixed(1) + '" cy="' + RY(rsi[sc.a1]).toFixed(1) + '" r="2.6" fill="' + G + '"/>'
      + '<circle cx="' + X(sc.a2).toFixed(1) + '" cy="' + RY(rsi[sc.a2]).toFixed(1) + '" r="2.6" fill="' + G + '"/>'
      + '</g>';

    return {
      rsi: rsi, candles: candles,
      svg: '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Price and RSI panels">'
        + '<text x="' + PAD_L + '" y="10" fill="' + S + '" font-size="8.5" letter-spacing="1" font-family="JetBrains Mono,monospace">PRICE</text>'
        + body
        + '<line x1="' + PAD_L + '" y1="' + (PH + GAP / 2) + '" x2="' + (W - 8) + '" y2="' + (PH + GAP / 2) + '" stroke="var(--border,#272235)" stroke-width="1"/>'
        + '<text x="' + PAD_L + '" y="' + (rTop - 1) + '" fill="' + S + '" font-size="8.5" letter-spacing="1" font-family="JetBrains Mono,monospace">RSI · ' + RSI_P + '</text>'
        + guides
        + '<polyline points="' + rpts.join(' ') + '" fill="none" stroke="' + G + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>'
        + anno
        + '</svg>'
    };
  }

  /* Build the WHY line from the actual data so it always matches the panels. */
  function _why(sc, candles, rsi) {
    var noun = sc.side === 'low' ? 'low' : 'high';
    var p1 = candles[sc.a1][sc.side === 'low' ? 'l' : 'h'], p2 = candles[sc.a2][sc.side === 'low' ? 'l' : 'h'];
    var r1 = rsi[sc.a1], r2 = rsi[sc.a2];
    var pDir = p2 > p1 ? 'HIGHER' : 'LOWER', rDir = r2 > r1 ? 'HIGHER' : 'LOWER';
    var agree = pDir === rDir;
    return 'Bars ' + (sc.a1 + 1) + ' → ' + (sc.a2 + 1) + ': price ' + noun + ' ' + p1.toFixed(1) + ' → ' + p2.toFixed(1)
      + ' (' + pDir + ') while RSI printed ' + r1.toFixed(0) + ' → ' + r2.toFixed(0) + ' (' + rDir + ') — the slopes '
      + (agree ? 'AGREE, so there is no divergence.' : 'DISAGREE.');
  }

  function renderDivTrainer(containerId) {
    _dtStyles();
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;

    var score = { streak: 0, right: 0, total: 0 };
    var current = -1;

    var btns = ANSWERS.map(function (a) {
      return '<button type="button" class="dt-btn" data-a="' + a.id + '">' + a.label + '</button>';
    }).join('');

    el.innerHTML = '<div class="dt-wrap">'
      + '<div class="dt-head"><span class="dt-title">What do you see?</span><span class="dt-score" id="dt-score"></span></div>'
      + '<div class="dt-chart" id="dt-chart"></div>'
      + '<div class="dt-btns" id="dt-btns">' + btns + '<button type="button" class="dt-btn next" id="dt-next" hidden>Next chart →</button></div>'
      + '<div class="dt-fb" id="dt-fb"></div>'
      + '</div>';

    var chart = el.querySelector('#dt-chart'), fb = el.querySelector('#dt-fb');
    var scoreEl = el.querySelector('#dt-score'), nextBtn = el.querySelector('#dt-next');
    var answerBtns = Array.prototype.slice.call(el.querySelectorAll('.dt-btn[data-a]'));
    var panel = null, sc = null;

    function refreshScore() {
      scoreEl.innerHTML = 'streak <b>' + score.streak + '</b> · ' + score.right + '/' + score.total;
    }

    function pick() {
      var i;
      do { i = Math.floor(Math.random() * SCENARIOS.length); } while (SCENARIOS.length > 1 && i === current);
      current = i;
      sc = SCENARIOS[i];
      panel = _panelSvg(sc);
      chart.innerHTML = panel.svg;
      answerBtns.forEach(function (b) { b.disabled = false; b.className = 'dt-btn'; });
      nextBtn.hidden = true;
      fb.innerHTML = 'Read both panels, then make the call. Connect tops to tops, bottoms to bottoms — do the slopes agree?';
      refreshScore();
    }

    function answer(id, btn) {
      var correct = sc.answerId || sc.id;
      var right = id === correct;
      score.total++;
      if (right) { score.right++; score.streak++; } else { score.streak = 0; }
      answerBtns.forEach(function (b) {
        b.disabled = true;
        if (b.getAttribute('data-a') === correct) b.classList.add('right');
      });
      if (!right) btn.classList.add('wrong');
      var anno = chart.querySelector('#dt-anno');
      if (anno) anno.classList.add('shown');
      var lbl = ANSWERS.filter(function (a) { return a.id === correct; })[0].label;
      fb.innerHTML = (right ? '<span class="ok">Correct — ' + lbl + '.</span> ' : '<span class="no">Not quite — this is ' + lbl + '.</span> ')
        + sc.takeaway
        + '<span class="why">' + _why(sc, panel.candles, panel.rsi) + '</span>';
      nextBtn.hidden = false;
      refreshScore();
      nextBtn.focus();
    }

    answerBtns.forEach(function (b) {
      b.addEventListener('click', function () { answer(b.getAttribute('data-a'), b); });
    });
    nextBtn.addEventListener('click', pick);

    pick();
  }

  /* exposed for the node data-sanity harness */
  renderDivTrainer._data = { scenarios: SCENARIOS, candles: _candles, rsi: _rsi };

  window.renderDivTrainer = renderDivTrainer;
})();
