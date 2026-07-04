'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Liquidation Lab (interactive, deterministic)
   lt-liqlab.js

   Drag the leverage slider and watch the liquidation line creep toward your entry.
   Pure isolated-margin arithmetic (liq ≈ entry·(1 − 1/leverage)) — NOT a live sim,
   no positions, no P&L. Teaches: more leverage = less room = a small move wipes you.

   Public:  renderLiquidationLab(containerId)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  // Price→y ladder: entry ($100) near the top, a $48 baseline near the bottom, so the
  // liquidation line sweeps the FULL height as leverage changes (100× hugs entry; 2× sits
  // near the floor). PXD = pixels per dollar.
  var ENTRY = 100, P_BOT = 48, Y_TOP = 30, Y_BOT = 188, STOP_PCT = 8;
  var PXD = (Y_BOT - Y_TOP) / (ENTRY - P_BOT);
  var X0 = 16, X1 = 300;                 // plot line span
  var MONO = "'Cascadia Code',ui-monospace,monospace";
  var T = 'var(--teal,#00d4d4)', B = 'var(--bear,#ff2e88)', G = 'var(--gold,#e7b53a)', S = 'var(--text3,#8b85a3)';
  function yOf(p) { return Y_TOP + (ENTRY - p) * PXD; }

  function _liqStyles() {
        LTUtils.injectStyles('lt-liqlab-styles', [
      ".ll-wrap{width:100%;max-width:460px;margin:0 auto;font-family:'Cascadia Code','JetBrains Mono',ui-monospace,monospace;color:var(--text,#f6f5fb);}",
      ".ll-chart{position:relative;border:1px solid var(--border2,#363049);border-radius:9px;overflow:hidden;background:var(--bg2,#0d0b18);}",
      ".ll-chart::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;z-index:2;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--bear,#ff2e88) 60%,transparent),transparent);opacity:.55;}",
      ".ll-chart svg{width:100%;height:auto;display:block;}",
      /* only the risk-driven elements move/tint on drag — springy iOS-like curve */
      ".ll-chart .ll-anim{transition:y .4s cubic-bezier(.32,.72,0,1),y1 .4s cubic-bezier(.32,.72,0,1),y2 .4s cubic-bezier(.32,.72,0,1),height .4s cubic-bezier(.32,.72,0,1),fill .3s ease,opacity .25s ease;}",
      ".ll-chart .ll-chip{display:flex;align-items:center;justify-content:space-between;padding:6px 11px 7px;border-bottom:1px solid var(--border,#272235);}",
      ".ll-chart .ll-chip .sym{font-size:11.5px;font-weight:700;letter-spacing:.4px;color:var(--text,#f6f5fb);display:flex;align-items:center;gap:6px;}",
      ".ll-chart .ll-chip .sym i{width:6px;height:6px;border-radius:50%;background:var(--teal,#00d4d4);box-shadow:0 0 6px var(--teal,#00d4d4);font-style:normal;}",
      ".ll-chart .ll-chip .side{font-size:9.5px;font-weight:700;letter-spacing:.4px;color:var(--teal,#00d4d4);border:1px solid color-mix(in srgb,var(--teal,#00d4d4) 45%,transparent);border-radius:5px;padding:2px 7px;}",
      ".ll-read{display:flex;margin-top:14px;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);}",
      ".ll-stat{flex:1;text-align:center;padding:9px 6px;}",
      ".ll-stat+.ll-stat{border-left:1px solid rgba(255,255,255,.06);}",
      ".ll-stat .k{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--text3,#8b85a3);margin-bottom:3px;}",
      ".ll-stat .v{font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;}",
      ".ll-lev .v{color:var(--gold,#e7b53a);}.ll-liq .v{color:var(--bear,#ff2e88);}.ll-dist .v{color:var(--text,#f6f5fb);}",
      ".ll-slider{margin-top:14px;}",
      ".ll-slider input{width:100%;-webkit-appearance:none;appearance:none;height:5px;border-radius:5px;outline:none;cursor:pointer;",
      "  background:linear-gradient(90deg,var(--teal,#00d4d4),var(--gold,#e7b53a) 45%,var(--bear,#ff2e88));}",
      ".ll-slider input::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--text,#f6f5fb);border:2px solid var(--bg,#08070f);cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.5);}",
      ".ll-slider input::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--text,#f6f5fb);border:2px solid var(--bg,#08070f);cursor:pointer;}",
      ".ll-scale{display:flex;justify-content:space-between;font-size:9.5px;color:var(--text3,#8b85a3);margin-top:5px;}",
      ".ll-verdict{margin-top:13px;font-size:12.5px;line-height:1.55;text-align:center;color:var(--text2,#a8a3bb);transition:color .25s;}",
      ".ll-verdict b{font-weight:700;}",
      ".ll-verdict.safe b{color:var(--teal,#00d4d4);}",
      ".ll-verdict.mod b{color:var(--gold,#e7b53a);}",
      ".ll-verdict.hot b{color:var(--bear,#ff2e88);}"
    ].join(''));
  }

  function renderLiquidationLab(containerId) {
    _liqStyles();
    var el = document.getElementById(containerId);
    if (!el) return;

    var stopY = yOf(ENTRY * (1 - STOP_PCT / 100));       // $92
    // static price ladder: faint gridlines + a right-edge price axis, so the panel reads
    // as a real chart pane instead of a few lines floating in empty space.
    var ticks = [100, 90, 80, 70, 60, 50], grid = '';
    ticks.forEach(function (p) {
      var y = yOf(p);
      grid += '<line x1="' + X0 + '" y1="' + y + '" x2="' + X1 + '" y2="' + y + '" stroke="rgba(255,255,255,.045)" stroke-width="1"/>'
        + '<text x="' + (X1 + 9) + '" y="' + (y + 3) + '" fill="' + S + '" font-size="8.5" font-family="' + MONO + '">' + p + '</text>';
    });

    var svg = '<svg viewBox="0 0 340 208" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Liquidation distance versus leverage">'
      + grid
      // buffer zone (entry → liq): the survivable range. Height + tint track the risk.
      + '<rect id="ll-zone" class="ll-anim" x="' + X0 + '" y="' + Y_TOP + '" width="' + (X1 - X0) + '" height="60" fill="rgba(0,212,212,0.11)"/>'
      // typical stop reference
      + '<line x1="' + X0 + '" y1="' + stopY + '" x2="' + X1 + '" y2="' + stopY + '" stroke="' + S + '" stroke-width="1" stroke-dasharray="3 3"/>'
      + '<text x="' + X1 + '" y="' + (stopY - 4) + '" text-anchor="end" fill="' + S + '" font-size="8.5" font-family="' + MONO + '">typical stop −' + STOP_PCT + '%</text>'
      // entry / mark line
      + '<line x1="' + X0 + '" y1="' + Y_TOP + '" x2="' + X1 + '" y2="' + Y_TOP + '" stroke="' + T + '" stroke-width="1.4" stroke-dasharray="5 3"/>'
      + '<circle cx="' + X1 + '" cy="' + Y_TOP + '" r="2.6" fill="' + T + '"/>'
      + '<text x="' + X0 + '" y="' + (Y_TOP - 6) + '" fill="' + T + '" font-size="9" font-weight="700" font-family="' + MONO + '">ENTRY · MARK $100.00</text>'
      // liquidation line + label (dynamic)
      + '<line id="ll-liqln" class="ll-anim" x1="' + X0 + '" y1="120" x2="' + X1 + '" y2="120" stroke="' + B + '" stroke-width="1.8"/>'
      + '<text id="ll-liqlab" class="ll-anim" x="' + X0 + '" y="133" fill="' + B + '" font-size="9" font-weight="700" font-family="' + MONO + '">LIQUIDATION $90.00</text>'
      // distance pill (dynamic) — the measured gap, centered in the buffer
      + '<rect id="ll-distbg" class="ll-anim" x="' + ((X0 + X1) / 2 - 26) + '" y="72" width="52" height="16" rx="8" fill="rgba(10,8,18,0.85)" stroke="rgba(255,255,255,.14)" stroke-width="1"/>'
      + '<text id="ll-disttx" class="ll-anim" x="' + ((X0 + X1) / 2) + '" y="83" text-anchor="middle" fill="' + T + '" font-size="9.5" font-weight="700" font-family="' + MONO + '">−10%</text>'
      + '</svg>';

    el.innerHTML = '<div class="ll-wrap">'
      + '<div class="ll-chart">'
      + '<div class="ll-chip"><span class="sym"><i></i>BTC-PERP</span><span class="side">LONG · ISOLATED</span></div>'
      + svg + '</div>'
      + '<div class="ll-read">'
      + '<div class="ll-stat ll-lev"><div class="k">Leverage</div><div class="v" id="ll-v-lev">10×</div></div>'
      + '<div class="ll-stat ll-liq"><div class="k">Liq price</div><div class="v" id="ll-v-liq">$90.00</div></div>'
      + '<div class="ll-stat ll-dist"><div class="k">Move to liq</div><div class="v" id="ll-v-dist">−10%</div></div>'
      + '</div>'
      + '<div class="ll-slider"><input type="range" min="2" max="100" step="1" value="10" id="ll-range" aria-label="Leverage"></div>'
      + '<div class="ll-scale"><span>2×</span><span>25×</span><span>50×</span><span>100×</span></div>'
      + '<div class="ll-verdict" id="ll-verdict"></div>'
      + '</div>';

    var range = el.querySelector('#ll-range');
    var liqLn = el.querySelector('#ll-liqln'), liqLab = el.querySelector('#ll-liqlab'), zone = el.querySelector('#ll-zone');
    var distBg = el.querySelector('#ll-distbg'), distTx = el.querySelector('#ll-disttx');
    var vLev = el.querySelector('#ll-v-lev'), vLiq = el.querySelector('#ll-v-liq'), vDist = el.querySelector('#ll-v-dist');
    var verdict = el.querySelector('#ll-verdict');

    function update() {
      var lev = +range.value;
      var distPct = 100 / lev;                    // isolated-margin liq distance
      var liqPrice = ENTRY * (1 - 1 / lev);
      var liqY = Math.min(yOf(liqPrice), Y_BOT);
      var zoneH = Math.max(0, liqY - Y_TOP);

      // risk colour drives the buffer tint + the distance pill (matches the verdict band)
      var risk = lev <= 5 ? T : lev <= 20 ? G : B;
      var riskRgb = lev <= 5 ? '0,212,212' : lev <= 20 ? '231,181,58' : '255,46,136';

      zone.setAttribute('height', zoneH);
      zone.setAttribute('fill', 'rgba(' + riskRgb + ',0.12)');
      liqLn.setAttribute('y1', liqY); liqLn.setAttribute('y2', liqY);
      liqLab.setAttribute('y', Math.min(liqY + 13, Y_BOT + 15));
      liqLab.textContent = 'LIQUIDATION $' + liqPrice.toFixed(2);

      // pill sits centered in the buffer; when the sliver gets tiny it drops just below the liq line
      var pillY = zoneH >= 30 ? (Y_TOP + liqY) / 2 : liqY + 15;
      distBg.setAttribute('y', pillY - 8);
      distTx.setAttribute('y', pillY + 3.5);
      distTx.setAttribute('fill', risk);
      distTx.textContent = '−' + distPct.toFixed(distPct < 10 ? 1 : 0) + '%';

      vLev.textContent = lev + '×';
      vLiq.textContent = '$' + liqPrice.toFixed(2);
      vDist.textContent = '−' + distPct.toFixed(distPct < 10 ? 1 : 0) + '%';

      var cls, msg;
      if (lev <= 5) { cls = 'safe'; msg = '<b>Conservative.</b> Liquidation is ' + distPct.toFixed(0) + '% away — only a major move gets you. Plenty of room for a real stop.'; }
      else if (lev <= 20) { cls = 'mod'; msg = '<b>Moderate.</b> A routine <b>' + distPct.toFixed(1) + '%</b> pullback reaches liquidation. Your stop must sit above it.'; }
      else { cls = 'hot'; msg = '<b>Extreme.</b> A <b>' + distPct.toFixed(1) + '%</b> wick liquidates the whole position — crypto does that in minutes.'; }
      // Is liquidation now inside a sensible stop?
      if (distPct < STOP_PCT) msg += ' At this leverage, <b>liquidation is inside a −' + STOP_PCT + '% stop</b> — you\'re wiped before the stop even triggers.';
      verdict.className = 'll-verdict ' + cls;
      verdict.innerHTML = msg;
    }

    range.addEventListener('input', update);
    update();
  }

  window.renderLiquidationLab = renderLiquidationLab;
})();
