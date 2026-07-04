'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Classical Chart Pattern Library (browse/hover explorer)
   lt-patternlib.js

   A bespoke reference gallery (same spirit as the candlestick gallery): a grid of
   pattern thumbnails + a detail panel that shows a large labelled diagram and the
   trade (structure · entry/stop/target · a pro tip). Mounted as its own "demo" step.

   Public:
     renderPatternLibrary(containerId)   — render into #containerId
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  var T = 'var(--teal,#00d4d4)', B = 'var(--bear,#ff2e88)', G = 'var(--gold,#e7b53a)', S = 'var(--text3,#8b85a3)';

  function _svg(inner) { return '<svg viewBox="0 0 224 132" xmlns="http://www.w3.org/2000/svg" role="img">' + inner + '</svg>'; }
  function _pl(pts, c, w, d) { return '<polyline points="' + pts + '" fill="none" stroke="' + c + '" stroke-width="' + (w || 2) + '"' + (d ? ' stroke-dasharray="4 3"' : '') + ' stroke-linejoin="round" stroke-linecap="round"/>'; }
  function _ln(x1, y1, x2, y2, c, w, d) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="' + (w || 1.3) + '"' + (d ? ' stroke-dasharray="4 3"' : '') + '/>'; }
  function _ar(x1, y1, x2, y2, c, w) {
    var a = Math.atan2(y2 - y1, x2 - x1), L = 6.5;
    var ax = (x2 - L * Math.cos(a - 0.5)).toFixed(1), ay = (y2 - L * Math.sin(a - 0.5)).toFixed(1);
    var bx = (x2 - L * Math.cos(a + 0.5)).toFixed(1), by = (y2 - L * Math.sin(a + 0.5)).toFixed(1);
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="' + (w || 2.2) + '" stroke-linecap="round"/><polygon points="' + x2 + ',' + y2 + ' ' + ax + ',' + ay + ' ' + bx + ',' + by + '" fill="' + c + '"/>';
  }
  function _tx(x, y, s, c, anc) { return '<text x="' + x + '" y="' + y + '" fill="' + (c || S) + '" font-size="9" font-family="JetBrains Mono,monospace" font-weight="700" text-anchor="' + (anc || 'start') + '">' + s + '</text>'; }
  function _dt(x, y, c, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 3) + '" fill="' + c + '"/>'; }

  var PATTERNS = [
    {
      id: 'bull-flag', name: 'Bull Flag', type: 'Continuation', bias: 'Bullish',
      svg: _svg(
        _pl('14,116 54,30', T, 2.6)
        + _ln(52,26,102,44, S,1.1,1) + _ln(56,50,106,68, S,1.1,1)
        + _pl('54,30 72,42 86,37 104,52', T, 1.8)
        + _pl('104,52 152,16', T, 2.6) + _ar(142,24,160,10, T, 2.2)
        + _ln(150,16,216,16, G,1.1,1)
        + _tx(20,86,'pole', T) + _tx(80,86,'flag', S,'middle') + _tx(214,13,'target', G,'end')),
      structure: 'A sharp rally (the <b>pole</b>) followed by a tight, slightly down-sloping consolidation (the <b>flag</b>). Buyers pause and weak hands shake out while the trend\'s energy coils.',
      trade: 'Enter on the break of the flag\'s upper trendline. Stop below the flag low. Target a <b>measured move</b> — the pole\'s height projected up from the breakout.',
      tip: 'The tighter and lower-volume the flag, the more explosive the break. A flag that drifts sideways or up is a weaker setup.'
    },
    {
      id: 'bear-flag', name: 'Bear Flag', type: 'Continuation', bias: 'Bearish',
      svg: _svg(
        _pl('14,16 54,102', B, 2.6)
        + _ln(52,106,102,88, S,1.1,1) + _ln(56,82,106,64, S,1.1,1)
        + _pl('54,102 72,90 86,95 104,80', B, 1.8)
        + _pl('104,80 152,116', B, 2.6) + _ar(142,108,160,122, B, 2.2)
        + _ln(150,116,216,116, G,1.1,1)
        + _tx(20,44,'pole', B) + _tx(80,50,'flag', S,'middle') + _tx(214,124,'target', G,'end')),
      structure: 'A sharp drop (the <b>pole</b>) then a weak, up-drifting consolidation. Sellers pause and bounce-buyers get trapped before the next leg down.',
      trade: 'Enter on the break of the flag\'s lower trendline. Stop above the flag high. Target = pole height projected <b>down</b> from the breakdown.',
      tip: 'The counter-trend bounce feels safe — that\'s the trap. The flag is where late longs are absorbed.'
    },
    {
      id: 'asc-triangle', name: 'Ascending Triangle', type: 'Continuation', bias: 'Bullish',
      svg: _svg(
        _ln(20,40,150,40, B,1.3,1)
        + _pl('16,110 42,44 66,84 96,46 120,66 150,42', T, 1.9)
        + _ln(20,112,150,50, S,1.2,1)
        + _pl('150,42 176,20 208,10', T, 2.4) + _ar(190,17,210,8, T, 2.2)
        + _ln(150,14,216,14, G,1.1,1)
        + _tx(24,36,'flat top', B) + _tx(214,11,'target', G,'end')),
      structure: 'A flat resistance ceiling with a rising series of <b>higher lows</b>. Buyers step in earlier each dip — demand is absorbing all the supply at the top.',
      trade: 'Enter on a close above the flat top. Stop below the last higher low. Target = the triangle\'s height added to the breakout.',
      tip: 'Usually resolves up, but wait for a <b>close</b>, not a wick — a failed break traps early buyers.'
    },
    {
      id: 'desc-triangle', name: 'Descending Triangle', type: 'Continuation', bias: 'Bearish',
      svg: _svg(
        _ln(20,92,150,92, T,1.3,1)
        + _pl('16,22 42,88 66,48 96,86 120,66 150,90', B, 1.9)
        + _ln(20,20,150,82, S,1.2,1)
        + _pl('150,90 176,112 208,122', B, 2.4) + _ar(190,115,210,124, B, 2.2)
        + _ln(150,118,216,118, G,1.1,1)
        + _tx(24,102,'flat floor', T) + _tx(214,126,'target', G,'end')),
      structure: 'A flat support floor with a falling series of <b>lower highs</b>. Sellers press harder on each bounce — supply is overwhelming demand at the floor.',
      trade: 'Enter on a close below the flat floor. Stop above the last lower high. Target = triangle height projected down.',
      tip: 'Usually breaks down — but in a strong uptrend it can still break up. Always weigh the higher-timeframe trend.'
    },
    {
      id: 'sym-triangle', name: 'Symmetrical Triangle', type: 'Continuation', bias: 'Neutral',
      svg: _svg(
        _ln(18,26,150,60, S,1.2,1) + _ln(18,110,150,64, S,1.2,1)
        + _pl('18,68 40,34 62,96 88,48 110,80 132,60 150,62', T, 1.8)
        + _pl('150,62 178,34 208,14', T, 2.4) + _ar(190,22,210,10, T, 2.2)
        + _tx(22,22,'lower highs', S) + _tx(22,120,'higher lows', S)),
      structure: 'Lower highs and higher lows converge into an <b>apex</b> — a tightening battle as volatility compresses. Neither side has committed yet.',
      trade: 'React to the break, don\'t predict it. Enter on a close outside a trendline; stop on the opposite side; target = the widest part of the triangle.',
      tip: 'Breaks near two-thirds of the way to the apex are the highest quality. It usually resolves with the prior trend.'
    },
    {
      id: 'double-top', name: 'Double Top', type: 'Reversal', bias: 'Bearish',
      svg: _svg(
        _ln(18,30,190,30, B,1.2,1)
        + _pl('16,96 52,32 92,72 132,32 168,96', T, 2)
        + _dt(52,32,B,3) + _dt(132,32,B,3)
        + _ln(18,72,200,72, S,1.2,1)
        + _pl('168,96 190,114 210,122', B, 2.2) + _ar(196,116,210,124, B, 2.2)
        + _ln(150,114,216,114, G,1.1,1)
        + _tx(60,26,'equal highs', B) + _tx(196,69,'neckline', S,'end') + _tx(214,124,'target', G,'end')),
      structure: 'Price tests a resistance level twice and fails both times — two roughly equal highs (an "M"). The second rejection shows buyers are exhausted.',
      trade: 'It confirms only on a close <b>below the neckline</b> (the low between the peaks). Stop above the second top. Target = pattern height projected down from the neckline.',
      tip: 'It is not a double top until the neckline breaks. Fading the second high early is how people get run over.'
    },
    {
      id: 'double-bottom', name: 'Double Bottom', type: 'Reversal', bias: 'Bullish',
      svg: _svg(
        _ln(18,102,190,102, T,1.2,1)
        + _pl('16,36 52,100 92,60 132,100 168,36', T, 2)
        + _dt(52,100,T,3) + _dt(132,100,T,3)
        + _ln(18,60,200,60, S,1.2,1)
        + _pl('168,36 190,18 210,10', T, 2.2) + _ar(196,16,210,8, T, 2.2)
        + _ln(150,14,216,14, G,1.1,1)
        + _tx(60,116,'equal lows', T) + _tx(196,57,'neckline', S,'end') + _tx(214,11,'target', G,'end')),
      structure: 'Two roughly equal lows at a support level (a "W"). Sellers fail to make a new low the second time — demand is stepping in.',
      trade: 'Confirms on a close <b>above the neckline</b> (the high between the lows). Stop below the second bottom. Target = pattern height projected up.',
      tip: 'Volume should fade into the second low and surge on the neckline break — that\'s the tell it\'s real.'
    },
    {
      id: 'head-shoulders', name: 'Head & Shoulders', type: 'Reversal', bias: 'Bearish',
      svg: _svg(
        _pl('12,88 40,58 64,72 100,30 136,72 164,56 190,88', T, 1.9)
        + _dt(40,58,S,2.8) + _dt(100,30,B,3.4) + _dt(164,56,S,2.8)
        + _ln(14,80,200,80, S,1.2,1)
        + _pl('190,88 206,108 214,120', B, 2.2) + _ar(202,112,214,122, B, 2.2)
        + _ln(150,116,216,116, G,1.1,1)
        + _tx(100,24,'head', B,'middle') + _tx(14,74,'neckline', S) + _tx(214,124,'target', G,'end')),
      structure: 'Three peaks — a higher middle peak (the <b>head</b>) between two lower <b>shoulders</b>. Failing to make a new high on the right shoulder signals the uptrend is breaking.',
      trade: 'Enter on a close below the neckline (drawn under the two troughs). Stop above the right shoulder. Target = head-to-neckline height projected down.',
      tip: 'The right shoulder often forms on lighter volume — a clue the buyers are already gone.'
    },
    {
      id: 'inv-head-shoulders', name: 'Inverse Head & Shoulders', type: 'Reversal', bias: 'Bullish',
      svg: _svg(
        _pl('12,44 40,74 64,60 100,102 136,60 164,76 190,44', T, 1.9)
        + _dt(40,74,S,2.8) + _dt(100,102,T,3.4) + _dt(164,76,S,2.8)
        + _ln(14,52,200,52, S,1.2,1)
        + _pl('190,44 206,24 214,12', T, 2.2) + _ar(202,20,214,10, T, 2.2)
        + _ln(150,16,216,16, G,1.1,1)
        + _tx(100,116,'head', T,'middle') + _tx(14,48,'neckline', S) + _tx(214,13,'target', G,'end')),
      structure: 'Three troughs with a lower middle trough (the head). The higher-low right shoulder shows sellers are losing control at the bottom.',
      trade: 'Enter on a close above the neckline. Stop below the right shoulder. Target = head-to-neckline depth projected up.',
      tip: 'A textbook bottom. Pair it with a higher-timeframe support level for the highest-odds long.'
    },
    {
      id: 'rising-wedge', name: 'Rising Wedge', type: 'Reversal', bias: 'Bearish',
      svg: _svg(
        _ln(16,96,180,28, S,1.3,1) + _ln(16,116,180,56, S,1.3,1)
        + _pl('18,110 44,64 68,92 96,50 120,74 148,40 172,52', T, 1.8)
        + _pl('172,52 192,88 210,116', B, 2.2) + _ar(198,100,212,120, B, 2.2)
        + _tx(20,24,'converging up', S)),
      structure: 'Both trendlines slope up but <b>converge</b> — price makes higher highs and higher lows, yet momentum fades as the range narrows. A rally running out of fuel.',
      trade: 'Enter on the break of the lower trendline. Stop above the last high. Target = the wedge\'s starting height (often a full retrace of the wedge).',
      tip: 'A rising wedge is <b>bearish even in an uptrend</b> — the tell is weakening momentum into the apex despite new highs.'
    },
    {
      id: 'falling-wedge', name: 'Falling Wedge', type: 'Reversal', bias: 'Bullish',
      svg: _svg(
        _ln(16,36,180,104, S,1.3,1) + _ln(16,16,180,76, S,1.3,1)
        + _pl('18,22 44,68 68,40 96,82 120,58 148,92 172,80', T, 1.8)
        + _pl('172,80 192,44 210,16', T, 2.2) + _ar(198,32,212,12, T, 2.2)
        + _tx(20,120,'converging down', S)),
      structure: 'Both trendlines slope down but converge — lower highs and lower lows, but the selling is losing steam as the range tightens.',
      trade: 'Enter on the break of the upper trendline. Stop below the last low. Target = the wedge\'s starting height projected up.',
      tip: 'A falling wedge is <b>bullish even in a downtrend</b> — the coil resolves upward more often than not.'
    }
  ];

  var TYPE_COLOR = { Continuation: { bg: 'color-mix(in srgb,var(--teal,#00d4d4) 15%,transparent)', bd: 'color-mix(in srgb,var(--teal,#00d4d4) 45%,transparent)', tx: 'var(--teal,#00d4d4)' },
    Reversal: { bg: 'color-mix(in srgb,var(--gold,#e7b53a) 16%,transparent)', bd: 'color-mix(in srgb,var(--gold,#e7b53a) 45%,transparent)', tx: 'var(--gold,#e7b53a)' } };
  function _biasColor(b) { return b === 'Bullish' ? 'var(--teal,#00d4d4)' : b === 'Bearish' ? 'var(--bear,#ff2e88)' : 'var(--text3,#8b85a3)'; }

  function _plStyles() {
        LTUtils.injectStyles('lt-patternlib-styles', [
      ".pl-wrap{width:100%;max-width:860px;margin:0 auto;font-family:'Cascadia Code','JetBrains Mono',ui-monospace,monospace;}",
      ".pl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;margin-bottom:16px;}",
      ".pl-card{position:relative;border:1px solid var(--border,#272235);border-radius:8px;background:var(--bg3,#14121f);padding:7px 7px 6px;cursor:pointer;transition:border-color .15s,background .15s,transform .15s;}",
      ".pl-card:hover{border-color:color-mix(in srgb,var(--teal,#00d4d4) 55%,transparent);transform:translateY(-2px);}",
      ".pl-card.active{border-color:var(--teal,#00d4d4);background:color-mix(in srgb,var(--teal,#00d4d4) 8%,var(--bg3,#14121f));box-shadow:0 0 0 1px color-mix(in srgb,var(--teal,#00d4d4) 30%,transparent);}",
      ".pl-card svg{width:100%;height:auto;display:block;background:var(--bg2,#0d0b18);border-radius:5px;color:var(--text,#f6f5fb);}",
      ".pl-card svg text{display:none;}",                     /* thumbnails are shape-only */
      ".pl-card .pl-cname{font-size:9.5px;font-weight:600;color:var(--text2,#a8a3bb);margin-top:5px;text-align:center;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
      ".pl-card .pl-bias{position:absolute;top:10px;right:10px;width:7px;height:7px;border-radius:50%;}",
      ".pl-detail{display:grid;grid-template-columns:300px 1fr;gap:18px;align-items:start;background:var(--bg3,#14121f);border:1px solid var(--border2,#363049);border-radius:10px;padding:16px 18px;}",
      ".pl-fig{border:1px solid var(--border2,#363049);border-radius:8px;overflow:hidden;background:linear-gradient(180deg,rgba(0,212,212,.05),transparent 60%),var(--bg2,#0d0b18);padding:8px;}",
      ".pl-fig svg{width:100%;height:auto;display:block;color:var(--text,#f6f5fb);}",
      ".pl-dhead{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:12px;}",
      ".pl-dtitle{font-size:17px;font-weight:800;color:var(--text,#f6f5fb);margin:0;letter-spacing:-.2px;}",
      ".pl-badge{font-size:9.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 9px;border-radius:20px;}",
      ".pl-block{background:var(--bg4,#1d1a30);border-radius:7px;padding:9px 13px;margin-bottom:9px;}",
      ".pl-blabel{font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--teal,#00d4d4);margin-bottom:5px;}",
      ".pl-btext{font-size:13px;color:var(--text2,#a8a3bb);line-height:1.55;}",
      ".pl-btext b{color:var(--text,#f6f5fb);font-weight:600;}",
      ".pl-tip{font-size:12.5px;font-style:italic;color:var(--gold,#e7b53a);line-height:1.5;padding:9px 13px;border-left:3px solid var(--gold,#e7b53a);background:color-mix(in srgb,var(--gold,#e7b53a) 8%,transparent);border-radius:0 7px 7px 0;}",
      ".pl-tip b{font-style:normal;}",
      ".pl-tip-ico{display:inline-flex;vertical-align:middle;margin-right:6px;}",
      "@media(max-width:640px){.pl-detail{grid-template-columns:1fr;gap:14px;}.pl-fig{max-width:340px;margin:0 auto;}}"
    ].join(''));
  }

  function renderPatternLibrary(containerId) {
    _plStyles();
    var el = document.getElementById(containerId);
    if (!el) return;

    var cards = PATTERNS.map(function (p) {
      return '<div class="pl-card" data-id="' + p.id + '" role="button" tabindex="0">'
        + '<span class="pl-bias" style="background:' + _biasColor(p.bias) + '"></span>'
        + p.svg + '<div class="pl-cname">' + p.name + '</div></div>';
    }).join('');

    el.innerHTML = '<div class="pl-wrap"><div class="pl-grid">' + cards + '</div><div class="pl-detail" id="pl-detail"></div></div>';

    var detail = el.querySelector('#pl-detail');
    var active = null;

    function show(p, card) {
      if (active) active.classList.remove('active');
      if (card) { active = card; card.classList.add('active'); }
      var tc = TYPE_COLOR[p.type] || TYPE_COLOR.Continuation;
      detail.innerHTML =
        '<div class="pl-fig">' + p.svg + '</div>'
        + '<div class="pl-dbody">'
        + '<div class="pl-dhead"><h3 class="pl-dtitle">' + p.name + '</h3>'
        + '<span class="pl-badge" style="background:' + tc.bg + ';border:1px solid ' + tc.bd + ';color:' + tc.tx + '">' + p.type + '</span>'
        + '<span class="pl-badge" style="background:color-mix(in srgb,' + _biasColor(p.bias) + ' 15%,transparent);border:1px solid color-mix(in srgb,' + _biasColor(p.bias) + ' 45%,transparent);color:' + _biasColor(p.bias) + '">' + p.bias + '</span></div>'
        + '<div class="pl-block"><div class="pl-blabel">Structure</div><div class="pl-btext">' + p.structure + '</div></div>'
        + '<div class="pl-block"><div class="pl-blabel">The trade</div><div class="pl-btext">' + p.trade + '</div></div>'
        + '<div class="pl-tip"><i data-lucide="lightbulb" class="pl-tip-ico" style="width:14px;height:14px;"></i>' + p.tip + '</div>'
        + '</div>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    var cardEls = el.querySelectorAll('.pl-card');
    cardEls.forEach(function (c) {
      var p = PATTERNS.filter(function (x) { return x.id === c.getAttribute('data-id'); })[0];
      c.addEventListener('mouseenter', function () { show(p, c); });
      c.addEventListener('click', function () { show(p, c); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(p, c); } });
    });

    if (cardEls[0]) { cardEls[0].classList.add('active'); active = cardEls[0]; }
    show(PATTERNS[0], null);
  }

  window.renderPatternLibrary = renderPatternLibrary;
})();
