'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Market-Structure Builder (interactive drill)
   lt-msbuilder.js

   A clean candle chart plays out one candle at a time (Play / Step). The learner
   clicks the candles they believe are swing highs / swing lows; the lab grades
   each call against precomputed swing points (local extreme vs ±2 neighbours,
   ±1-candle click tolerance), labels the swing (SH/SL then HH/HL/LH/LL), draws
   the structure ladder between found swings, and keeps a running structure read.

   Deterministic: one hand-authored candle series; swings computed from the data.
   Leak-safe: the Play timer clears itself once its container leaves the DOM
   (stop-by-ELEMENT — the same self-stop pattern as lt-orderbook.js).
   prefers-reduced-motion: candles appear without transitions.

   Public:  renderMSBuilder(containerId) / stopMSBuilder(containerId)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  var PLAY_MS = 430;                     // reveal cadence on Play (snappier than the old 650)
  var CONFIRM = 2;                       // neighbours needed each side of a swing
  var T = 'var(--teal,#00d4d4)', B = 'var(--bear,#ff2e88)', G = 'var(--gold,#e7b53a)', S = 'var(--text3,#8b85a3)';

  /* Inline icons (raw SVG so they survive a Reset re-render without lucide.createIcons). */
  var PLAY_SVG  = '<svg class="msb-i" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var PAUSE_SVG = '<svg class="msb-i" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var CLICK_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 9l5 12 1.8-5.2L21 14 9 9z"/><path d="M7.2 2.2 8 5.1"/><path d="M5.1 8 2.2 7.2"/><path d="M14 4.1 12 6"/><path d="M6 12l-1.9 2"/></svg>';

  /* Hand-authored close path — coils down to a first low, then builds a clean
     bullish ladder: SL → SH → HL → HH → HL → HH → HL. 28 candles, 7 swings. */
  var CLOSES = [
    100, 99, 97.5, 96, 97, 99, 101, 103, 104.5, 103,
    101.5, 100.5, 102, 104, 106, 108, 106.5, 105, 103.8, 105.5,
    107.5, 109.5, 111, 112.5, 110.5, 109, 107.8, 109.5, 111
  ];
  var SWING_IDX = [3, 8, 11, 15, 18, 23, 26];   // accent wicks land here (verified vs computed swings)

  /* Candles from the close path: open = previous close; small deterministic wicks,
     slightly longer on the swing candles so the extremes read clearly. */
  function _candles() {
    return CLOSES.map(function (c, i) {
      var o = i === 0 ? c + 0.6 : CLOSES[i - 1];
      var w = SWING_IDX.indexOf(i) !== -1 ? 0.8 : 0.3;
      return { o: o, c: c, h: Math.max(o, c) + w, l: Math.min(o, c) - w };
    });
  }

  /* Swing points: a candle whose high (low) is the strict max (min) of the ±CONFIRM
     window. Labelled vs the previous swing of the same side: SH/SL first, then
     HH/LH (highs) or HL/LL (lows). */
  function _swings(candles) {
    var out = [], i, j, k, isHi, isLo;
    for (i = CONFIRM; i < candles.length - CONFIRM; i++) {
      isHi = true; isLo = true;
      for (j = i - CONFIRM; j <= i + CONFIRM; j++) {
        if (j === i) continue;
        if (candles[j].h >= candles[i].h) isHi = false;
        if (candles[j].l <= candles[i].l) isLo = false;
      }
      if (isHi) out.push({ i: i, side: 'high', px: candles[i].h });
      else if (isLo) out.push({ i: i, side: 'low', px: candles[i].l });
    }
    var lastHi = null, lastLo = null;
    for (k = 0; k < out.length; k++) {
      var s = out[k];
      if (s.side === 'high') { s.label = lastHi === null ? 'SH' : (s.px > lastHi ? 'HH' : 'LH'); lastHi = s.px; }
      else { s.label = lastLo === null ? 'SL' : (s.px > lastLo ? 'HL' : 'LL'); lastLo = s.px; }
    }
    return out;
  }

  function _msStyles() {
    LTUtils.injectStyles('lt-msbuilder-styles', [
      ".msb-wrap{width:100%;max-width:640px;margin:0 auto;font-family:'Geist Mono',ui-monospace,monospace;color:var(--text,#f6f5fb);}",
      ".msb-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:9px;}",
      ".msb-tag{display:inline-flex;align-items:center;gap:5px;flex:none;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--teal,#00d4d4);",
      "  border:1px solid color-mix(in srgb,var(--teal,#00d4d4) 40%,transparent);background:color-mix(in srgb,var(--teal,#00d4d4) 9%,transparent);border-radius:20px;padding:3px 9px;}",
      ".msb-hint{flex:1;min-width:200px;font-size:11px;line-height:1.45;color:var(--text3,#8b85a3);}",
      ".msb-hint b{color:var(--text2,#a8a3bb);font-weight:600;}",
      ".msb-i{flex:none;}",
      ".msb-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;}",
      ".msb-btn{display:inline-flex;align-items:center;gap:5px;font-family:inherit;font-size:11px;font-weight:700;letter-spacing:.03em;color:var(--text2,#a8a3bb);",
      "  background:transparent;border:1px solid var(--border2,#363049);border-radius:6px;padding:5px 12px;cursor:pointer;",
      "  transition:border-color .15s,color .15s,transform .1s;}",
      ".msb-btn:hover{border-color:color-mix(in srgb,var(--teal,#00d4d4) 55%,transparent);color:var(--text,#f6f5fb);}",
      ".msb-btn:active{transform:scale(.97);}",
      ".msb-btn:focus-visible{outline:2px solid var(--teal,#00d4d4);outline-offset:2px;}",
      ".msb-btn[disabled]{opacity:.35;cursor:default;}",
      ".msb-btn.primary{color:var(--teal,#00d4d4);border-color:color-mix(in srgb,var(--teal,#00d4d4) 45%,transparent);}",
      ".msb-count{margin-left:auto;font-size:10.5px;color:var(--text3,#8b85a3);font-variant-numeric:tabular-nums;white-space:nowrap;}",
      ".msb-chart{border:1px solid var(--border2,#363049);border-radius:9px;overflow:hidden;padding:8px 6px 4px;",
      "  background:linear-gradient(180deg,rgba(0,212,212,.04),transparent 60%),var(--bg2,#0d0b18);}",
      ".msb-chart svg{width:100%;height:auto;display:block;}",
      ".msb-cndl{opacity:0;transition:opacity .28s ease;cursor:pointer;outline:none;}",
      ".msb-wrap.reduce .msb-cndl{transition:none;}",
      ".msb-cndl.shown{opacity:1;}",
      ".msb-cndl.shown:hover .msb-hit,.msb-cndl.shown:focus-visible .msb-hit{fill:color-mix(in srgb,var(--teal,#00d4d4) 12%,transparent);stroke:color-mix(in srgb,var(--teal,#00d4d4) 45%,transparent);stroke-width:1;}",
      ".msb-cndl:focus-visible .msb-hit{stroke:var(--teal,#00d4d4);stroke-width:1;}",
      ".msb-mark{opacity:0;transition:opacity .3s ease;}",
      ".msb-mark.shown{opacity:1;}",
      ".msb-ladder{opacity:.85;}",
      ".msb-miss{animation:msbMiss .8s ease forwards;}",
      "@keyframes msbMiss{0%{opacity:1;}70%{opacity:1;}100%{opacity:0;}}",
      ".msb-wrap.reduce .msb-miss{animation:none;opacity:1;}",
      ".msb-read{display:flex;align-items:baseline;gap:9px;margin-top:11px;min-height:36px;}",
      ".msb-read .dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--border2,#363049);position:relative;top:1px;transition:background .25s;}",
      ".msb-read.bull .dot{background:var(--teal,#00d4d4);}",
      ".msb-read.bear .dot{background:var(--bear,#ff2e88);}",
      ".msb-read.warn .dot{background:var(--gold,#e7b53a);}",
      ".msb-read .txt{font-size:12.5px;line-height:1.5;color:var(--text2,#a8a3bb);}",
      ".msb-read .txt b{color:var(--text,#f6f5fb);font-weight:600;}",
      ".msb-read .txt .hl{color:var(--teal,#00d4d4);font-weight:700;}",
      ".msb-read .txt .bad{color:var(--bear,#ff2e88);font-weight:700;}",
      "@media(max-width:400px){.msb-btn{padding:5px 9px;font-size:10.5px;}.msb-count{width:100%;margin-left:0;order:9;}.msb-hint{min-width:0;}}"
    ].join(''));
  }

  /* geometry */
  var W = 640, H = 260, PAD_L = 10, PAD_R = 34, PAD_T = 22, PAD_B = 14;

  function renderMSBuilder(containerId) {
    _msStyles();
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    stopMSBuilder(el);

    var reduce = false;
    try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

    var candles = _candles();
    var swings = _swings(candles);
    var n = candles.length;

    var pmin = Infinity, pmax = -Infinity;
    candles.forEach(function (c) { pmin = Math.min(pmin, c.l); pmax = Math.max(pmax, c.h); });
    var span = pmax - pmin;
    var xw = (W - PAD_L - PAD_R) / n;
    function X(i) { return PAD_L + i * xw + xw / 2; }
    function Y(p) { return PAD_T + (1 - (p - pmin) / span) * (H - PAD_T - PAD_B); }

    /* build svg: candles (each its own focusable group) + marker layer */
    var body = '';
    candles.forEach(function (c, i) {
      var up = c.c >= c.o, col = up ? T : B;
      var top = Y(Math.max(c.o, c.c)), bh = Math.max(1.6, Math.abs(Y(c.o) - Y(c.c)));
      body += '<g class="msb-cndl" data-i="' + i + '" tabindex="-1" role="button" aria-label="Candle ' + (i + 1) + '">'
        + '<rect class="msb-hit" x="' + (X(i) - xw / 2 + 0.5).toFixed(1) + '" y="' + PAD_T + '" width="' + (xw - 1).toFixed(1) + '" height="' + (H - PAD_T - PAD_B) + '" rx="2" fill="transparent"/>'
        + '<line x1="' + X(i).toFixed(1) + '" y1="' + Y(c.h).toFixed(1) + '" x2="' + X(i).toFixed(1) + '" y2="' + Y(c.l).toFixed(1) + '" stroke="' + col + '" stroke-width="1" pointer-events="none"/>'
        + '<rect x="' + (X(i) - xw * 0.28).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + (xw * 0.56).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="0.8" fill="' + col + '" pointer-events="none"/>'
        + '</g>';
    });
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Market structure drill chart">'
      + '<g id="msb-candles">' + body + '</g>'
      + '<polyline id="msb-ladder" class="msb-ladder" points="" fill="none" stroke="' + G + '" stroke-width="1.2" stroke-dasharray="5 4" pointer-events="none"/>'
      + '<g id="msb-marks" pointer-events="none"></g>'
      + '<g id="msb-fx" pointer-events="none"></g>'
      + '</svg>';

    el.innerHTML = '<div class="msb-wrap' + (reduce ? ' reduce' : '') + '">'
      + '<div class="msb-head">'
      + '<span class="msb-tag">' + CLICK_SVG + 'Interactive</span>'
      + '<span class="msb-hint">Click each <b>swing high</b> &amp; <b>swing low</b> on the chart — during the tape or after it finishes. A swing locks in once ' + CONFIRM + ' candles close beyond it, so pause when you spot a turn.</span>'
      + '</div>'
      + '<div class="msb-bar">'
      + '<button type="button" class="msb-btn primary" id="msb-play">' + PLAY_SVG + 'Play</button>'
      + '<button type="button" class="msb-btn" id="msb-step">Step</button>'
      + '<button type="button" class="msb-btn" id="msb-reset">Reset</button>'
      + '<span class="msb-count" id="msb-count"></span>'
      + '</div>'
      + '<div class="msb-chart">' + svg + '</div>'
      + '<div class="msb-read" id="msb-read"><span class="dot"></span><span class="txt" id="msb-txt"></span></div>'
      + '</div>';

    var wrap = el.querySelector('.msb-wrap');
    var cndlEls = el.querySelectorAll('.msb-cndl');
    var marks = el.querySelector('#msb-marks'), fx = el.querySelector('#msb-fx'), ladder = el.querySelector('#msb-ladder');
    var playBtn = el.querySelector('#msb-play'), stepBtn = el.querySelector('#msb-step'), resetBtn = el.querySelector('#msb-reset');
    var count = el.querySelector('#msb-count'), read = el.querySelector('#msb-read'), readTxt = el.querySelector('#msb-txt');

    /* drill state */
    var shown = 0, misses = 0, found = {};   // found: swingArrayIdx → true

    function foundCount() { return Object.keys(found).length; }

    function setRead(cls, html) { read.className = 'msb-read' + (cls ? ' ' + cls : ''); readTxt.innerHTML = html; }

    function structureRead() {
      var lastHi = null, lastLo = null;
      swings.forEach(function (s, k) {
        if (!found[k]) return;
        if (s.side === 'high') lastHi = s; else lastLo = s;
      });
      var fc = foundCount();
      if (fc === 0) return null;
      if (!lastHi || !lastLo || lastHi.label === 'SH' || lastLo.label === 'SL') {
        if (lastHi && lastLo) return { cls: 'warn', html: 'First anchors set — <b>' + lastLo.label + ' + ' + lastHi.label + '</b>. Structure grades once the <b>next</b> highs and lows print relative to these.' };
        return { cls: 'warn', html: 'First swing marked. A structure read needs both a <b>swing high</b> and a <b>swing low</b> on the board.' };
      }
      var hi = lastHi.label, lo = lastLo.label;
      if (hi === 'HH' && lo === 'HL') return { cls: 'bull', html: '<span class="hl">Bullish structure</span> — <b>HH + HL intact</b>. Buyers defend every pullback; longs are with the flow.' };
      if (hi === 'LH' && lo === 'LL') return { cls: 'bear', html: '<span class="bad">Bearish structure</span> — <b>LH + LL intact</b>. Sellers cap every bounce; shorts are with the flow.' };
      return { cls: 'warn', html: 'Structure is <b>mixed</b> — ' + hi + ' against ' + lo + '. No clean ladder yet; wait for the next swing to confirm.' };
    }

    function refreshRead() {
      var r = structureRead();
      if (!r) { setRead('', 'Your call — click any candle you think is a <b>swing high</b> or <b>swing low</b>. It must stand out against ' + CONFIRM + ' candles either side.'); return; }
      if (foundCount() === swings.length) {
        setRead(r.cls, r.html + ' <b>All ' + swings.length + ' swings found' + (misses ? ' · ' + misses + ' miss' + (misses > 1 ? 'es' : '') : ' — clean sheet') + '.</b>');
      } else setRead(r.cls, r.html);
    }

    function refreshCount() {
      count.textContent = 'candle ' + shown + '/' + n + ' · swings ' + foundCount() + '/' + swings.length + ' · misses ' + misses;
    }

    function drawLadder() {
      var pts = [];
      swings.forEach(function (s, k) { if (found[k]) pts.push(X(s.i).toFixed(1) + ',' + Y(s.px).toFixed(1)); });
      ladder.setAttribute('points', pts.join(' '));
    }

    function markSwing(k) {
      var s = swings[k];
      var y = s.side === 'high' ? Y(s.px) - 7 : Y(s.px) + 7;
      var ty = s.side === 'high' ? y - 5 : y + 11;
      var col = (s.label === 'HH' || s.label === 'HL') ? T : (s.label === 'LH' || s.label === 'LL') ? B : G;
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'msb-mark shown');
      g.innerHTML = '<circle cx="' + X(s.i).toFixed(1) + '" cy="' + (s.side === 'high' ? Y(s.px) - 3.5 : Y(s.px) + 3.5).toFixed(1) + '" r="2.4" fill="' + col + '"/>'
        + '<text x="' + X(s.i).toFixed(1) + '" y="' + ty.toFixed(1) + '" text-anchor="middle" fill="' + col + '" font-size="10" font-weight="700" font-family="Geist Mono,monospace">' + s.label + '</text>';
      marks.appendChild(g);
    }

    function flashMiss(i) {
      var c = candles[i];
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'msb-miss');
      var mx = X(i), my = Y(c.h) - 8;
      g.innerHTML = '<line x1="' + (mx - 3.4).toFixed(1) + '" y1="' + (my - 3.4).toFixed(1) + '" x2="' + (mx + 3.4).toFixed(1) + '" y2="' + (my + 3.4).toFixed(1) + '" stroke="' + B + '" stroke-width="1.7" stroke-linecap="round"/>'
        + '<line x1="' + (mx + 3.4).toFixed(1) + '" y1="' + (my - 3.4).toFixed(1) + '" x2="' + (mx - 3.4).toFixed(1) + '" y2="' + (my + 3.4).toFixed(1) + '" stroke="' + B + '" stroke-width="1.7" stroke-linecap="round"/>';
      fx.appendChild(g);
      setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 900);
    }

    function reveal() {
      if (shown >= n) return false;
      var c = cndlEls[shown];
      c.classList.add('shown');
      c.setAttribute('tabindex', '0');
      shown++;
      refreshCount();
      if (shown === n) {
        stopPlay();
        var left = swings.length - foundCount();
        if (left > 0) setRead('warn', 'Chart complete — <b>' + left + ' swing' + (left > 1 ? 's' : '') + ' still unmarked</b>. Look for the candles the ladder should turn on.');
        else refreshRead();
      }
      return true;
    }

    function stopPlay() {
      if (el._msTimer) { clearInterval(el._msTimer); el._msTimer = null; }
      playBtn.innerHTML = PLAY_SVG + 'Play';
      playBtn.disabled = shown >= n;
      stepBtn.disabled = shown >= n;
    }

    function startPlay() {
      if (el._msTimer || shown >= n) return;
      playBtn.innerHTML = PAUSE_SVG + 'Pause';
      el._msTimer = setInterval(function () {
        if (!document.body.contains(el)) { clearInterval(el._msTimer); el._msTimer = null; return; }   // MANDATORY self-stop by element
        if (!reveal()) stopPlay();
      }, PLAY_MS);
    }

    function onCandleClick(i) {
      if (i >= shown) return;
      // best matching unfound swing within ±1 of the click
      var hitK = -1, pendingK = -1;
      swings.forEach(function (s, k) {
        if (found[k] || Math.abs(s.i - i) > 1) return;
        if (shown > s.i + CONFIRM) { if (hitK === -1 || Math.abs(swings[k].i - i) < Math.abs(swings[hitK].i - i)) hitK = k; }
        else pendingK = k;
      });
      if (hitK !== -1) {
        found[hitK] = true;
        markSwing(hitK); drawLadder(); refreshCount(); refreshRead();
        return;
      }
      if (pendingK !== -1) {
        setRead('warn', 'Good eye — but a swing only <b>confirms</b> once ' + CONFIRM + ' candles close beyond it. Let the tape run a little further, then click it.');
        return;
      }
      misses++;
      flashMiss(i); refreshCount();
      setRead('', '<span class="bad">Not a swing.</span> Candle ' + (i + 1) + ' doesn\'t stand out against its ' + CONFIRM + ' neighbours either side — no local extreme there.');
    }

    cndlEls.forEach(function (c) {
      var i = +c.getAttribute('data-i');
      c.addEventListener('click', function () { onCandleClick(i); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCandleClick(i); } });
    });

    playBtn.addEventListener('click', function () { if (el._msTimer) stopPlay(); else startPlay(); });
    stepBtn.addEventListener('click', function () { stopPlay(); reveal(); });
    resetBtn.addEventListener('click', function () { renderMSBuilder(el); });

    /* initial frame: first 3 candles visible so there's something to look at */
    reveal(); reveal(); reveal();
    refreshRead();
  }

  function stopMSBuilder(containerId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (el && el._msTimer) { clearInterval(el._msTimer); el._msTimer = null; }
  }

  /* exposed for the node data-sanity harness */
  renderMSBuilder._data = { closes: CLOSES, candles: _candles, swings: _swings };

  window.renderMSBuilder = renderMSBuilder;
  window.stopMSBuilder = stopMSBuilder;
})();
