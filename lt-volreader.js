'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Volume Interpreter (drill)
   lt-volreader.js

   One micro-scenario at a time: a price panel with its volume bars beneath.
   The learner picks the read from the four price/volume scenarios; feedback
   quotes the applicable rule from the lesson and explains the tell. Score chip
   tracks the streak. 8 hand-authored scenarios covering all four reads plus
   breakout-confirmation and exhaustion shapes.

   Deterministic (hand-authored closes + volumes). No timers — nothing to leak.

   Public:  renderVolReader(containerId)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  var T = 'var(--teal,#00d4d4)', B = 'var(--bear,#ff2e88)', G = 'var(--gold,#e7b53a)', S = 'var(--text3,#8b85a3)';

  var ANSWERS = [
    { id: 'buy-strong',  label: 'Strong buying — continuation' },
    { id: 'buy-weak',    label: 'Weak buying — exhaustion risk' },
    { id: 'sell-strong', label: 'Strong selling — continuation' },
    { id: 'sell-weak',   label: 'Weak selling — exhaustion risk' }
  ];

  var RULES = {
    'buy-strong':  'Price Rising + Volume Rising = strong buying — buyers are in full control; trend continuation expected.',
    'buy-weak':    'Price Rising + Volume Declining = weak buying — buyers losing conviction; potential trend exhaustion and reversal ahead.',
    'sell-strong': 'Price Declining + Volume Rising = strong selling — sellers are in full control; downtrend continuation expected.',
    'sell-weak':   'Price Declining + Volume Declining = weak selling — sellers losing conviction; potential exhaustion and reversal ahead.'
  };

  /* 12 bars each: closes + volume units (relative). `tell` is the scenario-specific
     line appended after the quoted rule. */
  var SCENARIOS = [
    {
      id: 'buy-strong', name: 'steady rally',
      closes: [100, 101.5, 101, 103, 104.5, 104, 106, 107.5, 107, 109, 111, 112.5],
      vols:   [3.0, 3.4, 3.1, 3.9, 4.4, 4.0, 5.0, 5.6, 5.2, 6.2, 7.0, 7.8],
      tell: 'Every push up prints on MORE volume than the last — real participation behind the move.'
    },
    {
      id: 'buy-weak', name: 'fading grind up',
      closes: [100, 101.5, 101, 102.8, 104, 103.6, 105, 106.2, 105.8, 106.8, 107.6, 108.2],
      vols:   [7.6, 7.0, 6.4, 5.8, 5.2, 4.7, 4.1, 3.6, 3.1, 2.7, 2.3, 1.9],
      tell: 'New highs keep printing, but each one on LESS volume — the crowd is not following. Classic exhaustion tell.'
    },
    {
      id: 'sell-strong', name: 'expanding selloff',
      closes: [110, 108.5, 109, 107, 105.5, 106, 104, 102.5, 103, 101, 99, 97.5],
      vols:   [3.0, 3.5, 3.1, 4.1, 4.6, 4.2, 5.3, 5.9, 5.4, 6.5, 7.3, 8.1],
      tell: 'Every leg down prints on MORE volume — sellers pressing, not covering. Do not knife-catch this.'
    },
    {
      id: 'sell-weak', name: 'drift lower',
      closes: [110, 108.8, 109.2, 107.8, 106.6, 107, 105.8, 104.8, 105.2, 104.2, 103.4, 102.8],
      vols:   [7.4, 6.8, 6.2, 5.6, 5.0, 4.5, 3.9, 3.4, 2.9, 2.5, 2.1, 1.8],
      tell: 'Lower lows, but conviction is draining out of the tape — sellers are running dry, watch for the reversal.'
    },
    {
      id: 'buy-strong', name: 'confirmed breakout',
      closes: [100, 101, 99.5, 100.8, 99.8, 100.5, 99.6, 100.6, 99.8, 103.5, 105.5, 107],
      vols:   [4.2, 3.8, 3.5, 3.1, 2.8, 2.5, 2.3, 2.1, 2.0, 8.5, 7.8, 6.9],
      tell: 'Declining volume inside the range was healthy coiling — then the breakout candle printed the SPIKE. Volume must spike ON the breakout candle: spike present, breakout confirmed.'
    },
    {
      id: 'buy-weak', name: 'suspect breakout',
      closes: [100, 101, 99.5, 100.8, 99.8, 100.5, 99.6, 100.6, 99.8, 102.5, 103.2, 103.6],
      vols:   [4.2, 3.8, 3.5, 3.1, 2.8, 2.5, 2.3, 2.1, 2.0, 2.2, 2.0, 1.8],
      tell: 'Price cleared the range but the breakout candle printed NO spike. No volume spike = treat the breakout as suspect until confirmed — prime fake-out conditions.'
    },
    {
      id: 'buy-weak', name: 'parabolic top',
      closes: [100, 102, 104.5, 107.5, 111, 113.5, 115.5, 117, 118.2, 119, 119.6, 120],
      vols:   [5.5, 6.5, 7.5, 8.2, 7.2, 6.0, 4.9, 3.9, 3.1, 2.4, 1.9, 1.5],
      tell: 'The vertical push keeps stalling — smaller candles on collapsing volume. The last buyers are already in; nobody is left to pay higher.'
    },
    {
      id: 'sell-weak', name: 'late-stage flush',
      closes: [112, 109.5, 107.5, 105, 103, 103.8, 101.8, 100.4, 100.9, 99.6, 98.8, 98.2],
      vols:   [8.2, 7.6, 6.9, 6.1, 5.3, 4.6, 3.9, 3.2, 2.7, 2.2, 1.8, 1.5],
      tell: 'New lows on shrinking volume deep into the downtrend — the aggressive sellers are done. Exhaustion, not strength.'
    }
  ];

  function _candles(closes) {
    return closes.map(function (c, i) {
      var o = i === 0 ? c + (closes[1] > c ? -0.4 : 0.4) : closes[i - 1];
      var w = 0.25 + ((i * 5) % 3) * 0.12;
      return { o: o, c: c, h: Math.max(o, c) + w, l: Math.min(o, c) - w };
    });
  }

  function _vrStyles() {
    LTUtils.injectStyles('lt-volreader-styles', [
      ".vr-wrap{width:100%;max-width:560px;margin:0 auto;font-family:'Geist Mono',ui-monospace,monospace;color:var(--text,#f6f5fb);}",
      ".vr-head{display:flex;align-items:center;gap:10px;margin-bottom:9px;}",
      ".vr-title{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--text3,#8b85a3);}",
      ".vr-score{margin-left:auto;font-size:10.5px;color:var(--text3,#8b85a3);font-variant-numeric:tabular-nums;white-space:nowrap;}",
      ".vr-score b{color:var(--teal,#00d4d4);font-weight:700;}",
      ".vr-chart{border:1px solid var(--border2,#363049);border-radius:9px;overflow:hidden;padding:8px 6px 4px;",
      "  background:linear-gradient(180deg,rgba(0,212,212,.04),transparent 60%),var(--bg2,#0d0b18);}",
      ".vr-chart svg{width:100%;height:auto;display:block;}",
      ".vr-btns{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px;}",
      ".vr-btn{font-family:inherit;font-size:11px;font-weight:700;color:var(--text2,#a8a3bb);background:transparent;",
      "  border:1px solid var(--border2,#363049);border-radius:6px;padding:7px 10px;cursor:pointer;text-align:left;",
      "  transition:border-color .15s,color .15s,transform .1s;}",
      ".vr-btn:hover:not([disabled]){border-color:color-mix(in srgb,var(--teal,#00d4d4) 55%,transparent);color:var(--text,#f6f5fb);}",
      ".vr-btn:active{transform:scale(.98);}",
      ".vr-btn:focus-visible{outline:2px solid var(--teal,#00d4d4);outline-offset:2px;}",
      ".vr-btn[disabled]{cursor:default;opacity:.45;}",
      ".vr-btn.right{border-color:var(--teal,#00d4d4);color:var(--teal,#00d4d4);opacity:1;}",
      ".vr-btn.wrong{border-color:var(--bear,#ff2e88);color:var(--bear,#ff2e88);opacity:1;}",
      ".vr-next{grid-column:1 / -1;font-family:inherit;font-size:11px;font-weight:700;color:var(--teal,#00d4d4);background:transparent;",
      "  border:1px solid color-mix(in srgb,var(--teal,#00d4d4) 45%,transparent);border-radius:6px;padding:7px 10px;cursor:pointer;text-align:center;}",
      ".vr-next:focus-visible{outline:2px solid var(--teal,#00d4d4);outline-offset:2px;}",
      ".vr-fb{margin-top:11px;min-height:56px;font-size:12.5px;line-height:1.55;color:var(--text2,#a8a3bb);}",
      ".vr-fb b{color:var(--text,#f6f5fb);font-weight:600;}",
      ".vr-fb .ok{color:var(--teal,#00d4d4);font-weight:700;}",
      ".vr-fb .no{color:var(--bear,#ff2e88);font-weight:700;}",
      ".vr-fb .rule{display:block;margin-top:5px;padding-left:10px;border-left:2px solid var(--gold,#e7b53a);color:var(--gold,#e7b53a);font-size:11.5px;line-height:1.5;}",
      ".vr-fb .tell{display:block;margin-top:5px;color:var(--text3,#8b85a3);font-size:11.5px;}",
      "@media(max-width:380px){.vr-btns{grid-template-columns:1fr;}}"
    ].join(''));
  }

  /* geometry: price panel + volume strip, shared x */
  var W = 560, PH = 150, VH = 56, GAP = 10, PAD_L = 10, PAD_R = 10, PAD_T = 14;
  var H = PH + GAP + VH + 6;

  function _sceneSvg(sc) {
    var candles = _candles(sc.closes), n = candles.length;
    var pmin = Infinity, pmax = -Infinity, vmax = 0;
    candles.forEach(function (c) { pmin = Math.min(pmin, c.l); pmax = Math.max(pmax, c.h); });
    sc.vols.forEach(function (v) { vmax = Math.max(vmax, v); });
    var span = (pmax - pmin) || 1;
    var xw = (W - PAD_L - PAD_R) / n;
    function X(i) { return PAD_L + i * xw + xw / 2; }
    function PY(p) { return PAD_T + (1 - (p - pmin) / span) * (PH - PAD_T - 6); }
    var vTop = PH + GAP, vBase = vTop + VH;

    var body = '';
    candles.forEach(function (c, i) {
      var up = c.c >= c.o, col = up ? T : B;
      var top = PY(Math.max(c.o, c.c)), bh = Math.max(1.4, Math.abs(PY(c.o) - PY(c.c)));
      body += '<line x1="' + X(i).toFixed(1) + '" y1="' + PY(c.h).toFixed(1) + '" x2="' + X(i).toFixed(1) + '" y2="' + PY(c.l).toFixed(1) + '" stroke="' + col + '" stroke-width="1"/>'
        + '<rect x="' + (X(i) - xw * 0.26).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + (xw * 0.52).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="0.8" fill="' + col + '"/>';
      var vh = (sc.vols[i] / vmax) * (VH - 4);
      body += '<rect x="' + (X(i) - xw * 0.3).toFixed(1) + '" y="' + (vBase - vh).toFixed(1) + '" width="' + (xw * 0.6).toFixed(1) + '" height="' + vh.toFixed(1) + '" rx="0.8" fill="' + (up ? T : B) + '" opacity="0.45"/>';
    });

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Price and volume panels">'
      + '<text x="' + PAD_L + '" y="10" fill="' + S + '" font-size="8.5" letter-spacing="1" font-family="Geist Mono,monospace">PRICE</text>'
      + '<line x1="' + PAD_L + '" y1="' + (PH + GAP / 2) + '" x2="' + (W - 8) + '" y2="' + (PH + GAP / 2) + '" stroke="var(--border,#272235)" stroke-width="1"/>'
      + '<text x="' + PAD_L + '" y="' + (vTop + 2) + '" fill="' + S + '" font-size="8.5" letter-spacing="1" font-family="Geist Mono,monospace">VOLUME</text>'
      + body
      + '</svg>';
  }

  function renderVolReader(containerId) {
    _vrStyles();
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;

    var score = { streak: 0, right: 0, total: 0 };
    var current = -1;

    var btns = ANSWERS.map(function (a) {
      return '<button type="button" class="vr-btn" data-a="' + a.id + '">' + a.label + '</button>';
    }).join('');

    el.innerHTML = '<div class="vr-wrap">'
      + '<div class="vr-head"><span class="vr-title">Who is in control?</span><span class="vr-score" id="vr-score"></span></div>'
      + '<div class="vr-chart" id="vr-chart"></div>'
      + '<div class="vr-btns" id="vr-btns">' + btns + '<button type="button" class="vr-next" id="vr-next" hidden>Next chart →</button></div>'
      + '<div class="vr-fb" id="vr-fb"></div>'
      + '</div>';

    var chart = el.querySelector('#vr-chart'), fb = el.querySelector('#vr-fb');
    var scoreEl = el.querySelector('#vr-score'), nextBtn = el.querySelector('#vr-next');
    var answerBtns = Array.prototype.slice.call(el.querySelectorAll('.vr-btn[data-a]'));
    var sc = null;

    function refreshScore() {
      scoreEl.innerHTML = 'streak <b>' + score.streak + '</b> · ' + score.right + '/' + score.total;
    }

    function pick() {
      var i;
      do { i = Math.floor(Math.random() * SCENARIOS.length); } while (SCENARIOS.length > 1 && i === current);
      current = i;
      sc = SCENARIOS[i];
      chart.innerHTML = _sceneSvg(sc);
      answerBtns.forEach(function (b) { b.disabled = false; b.className = 'vr-btn'; });
      nextBtn.hidden = true;
      fb.innerHTML = 'Price direction × volume direction. Read both, then make the call.';
      refreshScore();
    }

    function answer(id, btn) {
      var right = id === sc.id;
      score.total++;
      if (right) { score.right++; score.streak++; } else { score.streak = 0; }
      answerBtns.forEach(function (b) {
        b.disabled = true;
        if (b.getAttribute('data-a') === sc.id) b.classList.add('right');
      });
      if (!right) btn.classList.add('wrong');
      var lbl = ANSWERS.filter(function (a) { return a.id === sc.id; })[0].label;
      fb.innerHTML = (right ? '<span class="ok">Correct — ' + lbl.toLowerCase() + '.</span>' : '<span class="no">Not quite — this is ' + lbl.toLowerCase() + '.</span>')
        + '<span class="rule">' + RULES[sc.id] + '</span>'
        + '<span class="tell">' + sc.tell + '</span>';
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
  renderVolReader._data = { scenarios: SCENARIOS };

  window.renderVolReader = renderVolReader;
})();
