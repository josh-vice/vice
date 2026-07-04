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

  var ENTRY = 100, ENTRY_Y = 58, SCALE = 2.55, STOP_PCT = 8;
  var T = 'var(--teal,#00d4d4)', B = 'var(--bear,#ff2e88)', G = 'var(--gold,#e7b53a)', S = '#8b85a3';

  function _liqStyles() {
    if (document.getElementById('lt-liqlab-styles')) return;
    var s = document.createElement('style'); s.id = 'lt-liqlab-styles';
    s.textContent = [
      ".ll-wrap{width:100%;max-width:460px;margin:0 auto;font-family:'Cascadia Code','JetBrains Mono',ui-monospace,monospace;color:var(--text,#f6f5fb);}",
      ".ll-chart{border:1px solid var(--border2,#363049);border-radius:9px;overflow:hidden;padding:8px;background:linear-gradient(180deg,rgba(255,46,136,.05),transparent 60%),var(--bg2,#0d0b18);}",
      ".ll-chart svg{width:100%;height:auto;display:block;}",
      ".ll-chart svg line,.ll-chart svg rect,.ll-chart svg text{transition:y .35s cubic-bezier(.4,0,.2,1),y1 .35s,y2 .35s,height .35s,opacity .3s;}",
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
    ].join('');
    document.head.appendChild(s);
  }

  function renderLiquidationLab(containerId) {
    _liqStyles();
    var el = document.getElementById(containerId);
    if (!el) return;

    var stopY = ENTRY_Y + STOP_PCT * SCALE;
    var svg = '<svg viewBox="0 0 340 172" xmlns="http://www.w3.org/2000/svg" role="img">'
      // liquidated zone (entry → liq) fill
      + '<rect id="ll-zone" x="70" y="' + ENTRY_Y + '" width="256" height="20" fill="rgba(255,46,136,0.13)"/>'
      // typical stop reference
      + '<line id="ll-stopln" x1="70" y1="' + stopY + '" x2="326" y2="' + stopY + '" stroke="' + S + '" stroke-width="1" stroke-dasharray="3 3"/>'
      + '<text id="ll-stoplab" x="326" y="' + (stopY - 3) + '" text-anchor="end" fill="' + S + '" font-size="8.5" font-family="JetBrains Mono,monospace">typical stop −' + STOP_PCT + '%</text>'
      // entry line
      + '<line x1="70" y1="' + ENTRY_Y + '" x2="326" y2="' + ENTRY_Y + '" stroke="' + T + '" stroke-width="1.4" stroke-dasharray="5 3"/>'
      + '<text x="70" y="' + (ENTRY_Y - 5) + '" fill="' + T + '" font-size="9" font-weight="700" font-family="JetBrains Mono,monospace">ENTRY · long $100</text>'
      // liquidation line + label
      + '<line id="ll-liqln" x1="70" y1="90" x2="326" y2="90" stroke="' + B + '" stroke-width="1.8"/>'
      + '<text id="ll-liqlab" x="70" y="102" fill="' + B + '" font-size="9" font-weight="700" font-family="JetBrains Mono,monospace">LIQUIDATION $90.00</text>'
      // distance bracket
      + '<line id="ll-brk" x1="52" y1="' + ENTRY_Y + '" x2="52" y2="90" stroke="' + S + '" stroke-width="1"/>'
      + '<line x1="49" y1="' + ENTRY_Y + '" x2="55" y2="' + ENTRY_Y + '" stroke="' + S + '" stroke-width="1"/>'
      + '<line id="ll-brk2" x1="49" y1="90" x2="55" y2="90" stroke="' + S + '" stroke-width="1"/>'
      + '<text id="ll-distlab" x="46" y="76" text-anchor="end" fill="' + S + '" font-size="8.5" font-family="JetBrains Mono,monospace">−10%</text>'
      + '</svg>';

    el.innerHTML = '<div class="ll-wrap">'
      + '<div class="ll-chart">' + svg + '</div>'
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
    var brk = el.querySelector('#ll-brk'), brk2 = el.querySelector('#ll-brk2'), distLab = el.querySelector('#ll-distlab');
    var vLev = el.querySelector('#ll-v-lev'), vLiq = el.querySelector('#ll-v-liq'), vDist = el.querySelector('#ll-v-dist');
    var verdict = el.querySelector('#ll-verdict');

    function update() {
      var lev = +range.value;
      var distPct = 100 / lev;                    // isolated-margin liq distance
      var liqPrice = ENTRY * (1 - 1 / lev);
      var vis = Math.min(distPct, 44);            // clamp so 2×–2.5× stays on-scale
      var liqY = ENTRY_Y + vis * SCALE;

      liqLn.setAttribute('y1', liqY); liqLn.setAttribute('y2', liqY);
      liqLab.setAttribute('y', Math.min(liqY + 12, 168));
      liqLab.textContent = 'LIQUIDATION $' + liqPrice.toFixed(2);
      zone.setAttribute('height', Math.max(0, liqY - ENTRY_Y));
      brk.setAttribute('y2', liqY); brk2.setAttribute('y1', liqY); brk2.setAttribute('y2', liqY);
      distLab.setAttribute('y', (ENTRY_Y + liqY) / 2 + 3);
      distLab.textContent = '−' + distPct.toFixed(distPct < 10 ? 1 : 0) + '%';

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
