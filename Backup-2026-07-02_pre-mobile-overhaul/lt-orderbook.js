'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Animated Order Book / Depth-of-Market (illustrative demo)
   lt-orderbook.js

   A scripted, looping "watch what happens" panel styled like a real exchange DOM
   (depth-of-market ladder) — NOT a live simulator. It shows a resting book, a
   market order crossing the spread (taker) eating depth and moving price, then a
   limit order resting on the book (maker) and getting filled.

   Public:
     renderOrderBookDemo(containerId)   — render + start the loop into #containerId
     stopOrderBookDemo(containerId)     — stop the loop (also auto-stops when detached)

   Build-once DOM + in-place updates so the cumulative depth bars animate smoothly
   via CSS transitions. Honours prefers-reduced-motion (static annotated frame).
   Leak-safe: the phase timer clears itself once its container leaves the DOM.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  var STEP_MS = 2800;                 // dwell per phase (captions are full sentences — give them time to be read)
  var IDS = ['a4', 'a3', 'a2', 'a1', 'lim', 'b1', 'b2', 'b3', 'b4'];

  function _obStyles() {
        LTUtils.injectStyles('lt-orderbook-styles', [
      ".ob-wrap{--ob-ask:var(--bear,#ff2e88);--ob-bid:var(--teal,#00d4d4);width:100%;max-width:440px;margin:0 auto;",
      "  font-family:'Cascadia Code','JetBrains Mono',ui-monospace,monospace;color:var(--text,#f6f5fb);}",
      ".ob-panel{position:relative;border:1px solid var(--border2,#363049);border-radius:9px;overflow:hidden;",
      "  background:var(--bg2,#0d0b18);box-shadow:0 10px 34px rgba(0,0,0,.34);}",
      ".ob-panel::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;z-index:5;",
      "  background:linear-gradient(90deg,transparent,var(--ob-bid),var(--ob-ask),transparent);opacity:.5;}",
      /* header strip */
      ".ob-phead{display:flex;align-items:center;justify-content:space-between;padding:8px 12px 7px;",
      "  border-bottom:1px solid var(--border,#272235);background:rgba(255,255,255,.015);}",
      ".ob-instr{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:700;letter-spacing:.4px;color:var(--text,#f6f5fb);}",
      ".ob-instr .ob-live{width:6px;height:6px;border-radius:50%;background:var(--ob-bid);box-shadow:0 0 6px var(--ob-bid);animation:obPulse 1.8s ease-in-out infinite;}",
      "@keyframes obPulse{0%,100%{opacity:1;}50%{opacity:.35;}}",
      ".ob-grp{font-size:9.5px;color:var(--text3,#8b85a3);border:1px solid var(--border2,#363049);border-radius:5px;padding:2px 7px;letter-spacing:.3px;}",
      /* column header */
      ".ob-colhead{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;padding:5px 12px 4px;",
      "  font-size:9px;letter-spacing:.6px;text-transform:uppercase;color:var(--text3,#8b85a3);border-bottom:1px solid var(--border,#272235);}",
      ".ob-colhead .c-size,.ob-colhead .c-total{text-align:right;}",
      /* rows */
      ".ob-rows{position:relative;}",
      ".ob-row{position:relative;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;height:23px;padding:0 12px;",
      "  font-size:11.5px;font-variant-numeric:tabular-nums;transition:opacity .4s ease;}",
      ".ob-row .c-price{position:relative;z-index:2;font-weight:700;}",
      ".ob-row .c-size{position:relative;z-index:2;text-align:right;color:var(--text2,#a8a3bb);}",
      ".ob-row .c-total{position:relative;z-index:2;text-align:right;color:var(--text3,#8b85a3);font-size:10.5px;}",
      ".ob-ask .c-price{color:var(--ob-ask);}",
      ".ob-bid .c-price{color:var(--ob-bid);}",
      /* cumulative-depth histogram: a FLAT translucent block that grows leftward from the
         total edge with a crisp bright leading edge — the look real DOMs (Bybit/Hyperliquid)
         use, not a soft gradient. */
      ".ob-depth{position:absolute;top:0;bottom:0;right:0;width:0;z-index:0;",
      "  transition:width .5s cubic-bezier(.32,.72,0,1),opacity .3s ease;}",
      ".ob-ask .ob-depth{background:color-mix(in srgb,var(--ob-ask) 15%,transparent);box-shadow:inset 1.5px 0 0 color-mix(in srgb,var(--ob-ask) 60%,transparent);}",
      ".ob-bid .ob-depth{background:color-mix(in srgb,var(--ob-bid) 14%,transparent);box-shadow:inset 1.5px 0 0 color-mix(in srgb,var(--ob-bid) 55%,transparent);}",
      ".ob-row.dim{opacity:.26;}",
      ".ob-row.flash::after{content:'';position:absolute;inset:0;z-index:3;pointer-events:none;",
      "  box-shadow:inset 0 0 0 1.4px var(--ob-flash,var(--gold,#e7b53a));animation:obFlash .75s ease;}",
      "@keyframes obFlash{0%{opacity:.95;}100%{opacity:0;}}",
      ".ob-tag{position:absolute;right:8px;top:50%;transform:translateY(-50%);z-index:4;padding:1.5px 7px;border-radius:20px;",
      "  font-size:9px;font-weight:700;letter-spacing:.2px;white-space:nowrap;animation:obTagIn .3s ease;box-shadow:0 2px 8px rgba(0,0,0,.4);}",
      ".ob-tag--taker{background:color-mix(in srgb,var(--gold,#e7b53a) 88%,#000);color:#161007;}",
      ".ob-tag--maker{background:color-mix(in srgb,var(--ob-bid) 86%,#000);color:#04201f;}",
      "@keyframes obTagIn{from{opacity:0;transform:translateY(-50%) translateX(7px);}to{opacity:1;transform:translateY(-50%);}}",
      /* spread / last-price row */
      ".ob-spread{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;height:36px;",
      "  background:linear-gradient(90deg,color-mix(in srgb,var(--ob-ask) 6%,transparent),transparent 45%,color-mix(in srgb,var(--ob-bid) 6%,transparent));",
      "  border-top:1px solid var(--border,#272235);border-bottom:1px solid var(--border,#272235);}",
      ".ob-last{display:flex;align-items:baseline;gap:7px;font-size:15px;font-weight:800;letter-spacing:.3px;color:var(--text,#f6f5fb);}",
      ".ob-last .ob-arrow{font-size:11px;}",
      ".ob-last.up{color:var(--ob-bid);}.ob-last.up .ob-arrow{color:var(--ob-bid);}",
      ".ob-last.dn{color:var(--ob-ask);}.ob-last.dn .ob-arrow{color:var(--ob-ask);}",
      ".ob-sprd{font-size:9.5px;color:var(--text3,#8b85a3);letter-spacing:.3px;text-align:right;}",
      /* caption + dots */
      ".ob-caption{min-height:34px;margin-top:12px;font-size:12px;line-height:1.5;color:var(--text2,#a8a3bb);text-align:center;transition:opacity .25s ease;}",
      ".ob-caption b{color:var(--text,#f6f5fb);font-weight:600;}",
      ".ob-caption .ob-hl-taker{color:var(--gold,#e7b53a);font-weight:700;}",
      ".ob-caption .ob-hl-maker{color:var(--ob-bid);font-weight:700;}",
      ".ob-dots{display:flex;justify-content:center;gap:6px;margin-top:9px;}",
      ".ob-dot{width:5px;height:5px;border-radius:50%;background:var(--border2,#363049);transition:background .3s,transform .3s;}",
      ".ob-dot.on{background:var(--ob-bid);transform:scale(1.35);}",
      "@media(max-width:600px){.ob-wrap{max-width:100%;}}"
    ].join(''));
  }

  function _baseRows() {
    return {
      a4: { side: 'ask', price: 100.40, size: 1.20 },
      a3: { side: 'ask', price: 100.30, size: 2.50 },
      a2: { side: 'ask', price: 100.20, size: 1.72 },
      a1: { side: 'ask', price: 100.10, size: 2.08 },   // best ask
      lim: { side: 'bid', price: 100.05, size: 0, hidden: true },   // limit-buy slot
      b1: { side: 'bid', price: 100.00, size: 2.30 },   // best bid
      b2: { side: 'bid', price: 99.90, size: 1.64 },
      b3: { side: 'bid', price: 99.80, size: 3.05 },
      b4: { side: 'bid', price: 99.70, size: 1.32 }
    };
  }

  // Phases mutate the working state; phase 0 fully resets, so drift self-corrects each loop.
  function _phases() {
    return [
      function (st) {                                   // 0 — idle / reset
        st.rows = _baseRows(); st.mid = 100.05; st.spread = 0.10; st.tick = '';
        st.caption = 'A resting <b>order book</b>: buyers stack <span class="ob-hl-maker">bids</span> below, sellers stack asks above — the gap between them is the <b>spread</b>.';
      },
      function (st) {                                   // 1 — market buy arrives
        st.rows.a1.tag = { text: 'market buy', kind: 'taker' }; st.rows.a1.flash = true;
        st.caption = 'A <span class="ob-hl-taker">market buy</span> hits the book — it wants in <b>now</b>, at whatever price it can get.';
      },
      function (st) {                                   // 2 — takes the best ask
        st.rows.a1.size = 0; st.rows.a1.dim = true; st.rows.a1.tag = null; st.rows.a1.flash = false;
        st.mid = 100.15; st.spread = 0.05; st.tick = 'up';
        st.caption = 'It <b>crosses the spread</b> and fills against the best ask. Taking liquidity like this makes it a <span class="ob-hl-taker">taker</span>.';
      },
      function (st) {                                   // 3 — eats into next level
        st.rows.a2.size = 0.42; st.rows.a2.flash = true; st.mid = 100.20; st.spread = 0.10; st.tick = 'up';
        st.caption = 'Bigger than one level? It keeps eating into the next ask — and the <b>price ticks up</b> as depth disappears.';
      },
      function (st) {                                   // 4 — settle, thinner book
        st.rows.a2.flash = false; st.tick = '';
        st.caption = 'Trade done. The price <b>moved up</b> and the top of the book is now visibly <b>thinner</b>.';
      },
      function (st) {                                   // 5 — limit buy rests
        st.rows.lim.hidden = false; st.rows.lim.size = 2.00; st.rows.lim.tag = { text: 'limit buy', kind: 'maker' };
        st.caption = 'Now a <span class="ob-hl-maker">limit buy</span> — instead of chasing, it <b>rests on the book</b> at a chosen price and waits.';
      },
      function (st) {                                   // 6 — it's a maker
        st.rows.lim.flash = true;
        st.caption = 'Because it <b>adds</b> liquidity rather than taking it, this resting order is a <span class="ob-hl-maker">maker</span> — and pays a lower fee.';
      },
      function (st) {                                   // 7 — price drifts to it
        st.rows.lim.flash = false; st.mid = 100.08; st.spread = 0.06; st.tick = 'dn';
        st.caption = 'Price drifts back down toward the resting order…';
      },
      function (st) {                                   // 8 — it fills
        st.rows.lim.flash = true; st.rows.lim.size = 0; st.rows.lim.dim = true; st.rows.lim.tag = null;
        st.mid = 100.05; st.tick = 'dn';
        st.caption = '…a seller hits it and it <b>fills</b> — same position as the market order, but at a better price and lower fee. That\'s the <span class="ob-hl-maker">maker\'s</span> edge.';
      }
    ];
  }

  // Depth is cumulative from the inside (best bid/ask) outward, scaled per side.
  function _cumWidths(rows) {
    var w = {};
    var askOrder = ['a1', 'a2', 'a3', 'a4'];      // inner → outer
    var bidOrder = ['lim', 'b1', 'b2', 'b3', 'b4'];
    [askOrder, bidOrder].forEach(function (order) {
      var run = 0, tot = 0;
      order.forEach(function (id) { if (rows[id] && !rows[id].hidden) tot += rows[id].size; });
      order.forEach(function (id) {
        if (!rows[id] || rows[id].hidden) { w[id] = 0; return; }
        run += rows[id].size; w[id] = tot > 0 ? (run / tot) * 94 : 0;
      });
    });
    return w;
  }

  function _skeleton(phaseCount) {
    var rowHtml = function (id) {
      return '<div class="ob-row" data-id="' + id + '"><span class="ob-depth"></span>'
        + '<span class="c-price"></span><span class="c-size"></span><span class="c-total"></span></div>';
    };
    var dots = '';
    for (var i = 0; i < phaseCount; i++) dots += '<span class="ob-dot" data-i="' + i + '"></span>';
    return '<div class="ob-wrap"><div class="ob-panel">'
      + '<div class="ob-phead"><span class="ob-instr"><span class="ob-live"></span>BTC-PERP</span><span class="ob-grp">book · 0.05</span></div>'
      + '<div class="ob-colhead"><span class="c-price">Price</span><span class="c-size">Size</span><span class="c-total">Total</span></div>'
      + '<div class="ob-rows ob-asks">' + rowHtml('a4') + rowHtml('a3') + rowHtml('a2') + rowHtml('a1') + '</div>'
      + '<div class="ob-spread"><span class="ob-last" id="ob-last"><span class="ob-num">100.05</span><span class="ob-arrow"></span></span><span class="ob-sprd" id="ob-sprd"></span></div>'
      + '<div class="ob-rows ob-bids">' + rowHtml('lim') + rowHtml('b1') + rowHtml('b2') + rowHtml('b3') + rowHtml('b4') + '</div>'
      + '</div><div class="ob-caption" id="ob-caption"></div><div class="ob-dots">' + dots + '</div></div>';
  }

  function _cumTotals(rows) {
    var out = {}; var askOrder = ['a1', 'a2', 'a3', 'a4'], bidOrder = ['lim', 'b1', 'b2', 'b3', 'b4'];
    [askOrder, bidOrder].forEach(function (order) { var run = 0; order.forEach(function (id) { if (rows[id] && !rows[id].hidden) { run += rows[id].size; out[id] = run; } else out[id] = 0; }); });
    return out;
  }

  function renderOrderBookDemo(containerId) {
    _obStyles();
    var el = document.getElementById(containerId);
    if (!el) return;
    stopOrderBookDemo(containerId);

    var reduce = false;
    try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

    var phases = _phases();
    el.innerHTML = _skeleton(phases.length);

    var rowEls = {}; IDS.forEach(function (id) { rowEls[id] = el.querySelector('.ob-row[data-id="' + id + '"]'); });
    var lastEl = el.querySelector('#ob-last'), sprdEl = el.querySelector('#ob-sprd');
    var capEl = el.querySelector('#ob-caption'), dotEls = el.querySelectorAll('.ob-dot');

    function apply(st, phaseIdx, animateCaption) {
      var widths = _cumWidths(st.rows), totals = _cumTotals(st.rows);
      IDS.forEach(function (id) {
        var r = st.rows[id], row = rowEls[id]; if (!row) return;
        row.style.display = r.hidden ? 'none' : '';
        if (r.hidden) return;
        row.className = 'ob-row ob-' + r.side + (r.dim ? ' dim' : '');
        row.style.setProperty('--ob-flash', r.side === 'bid' ? 'var(--ob-bid)' : 'var(--gold,#e7b53a)');
        row.querySelector('.ob-depth').style.width = widths[id].toFixed(1) + '%';
        row.querySelector('.ob-depth').style.opacity = r.size <= 0 ? '0' : '1';
        row.querySelector('.c-price').textContent = r.price.toFixed(2);
        row.querySelector('.c-size').textContent = r.size > 0 ? r.size.toFixed(2) : '—';
        row.querySelector('.c-total').textContent = totals[id] > 0 ? totals[id].toFixed(2) : '';
        // tag
        var t = row.querySelector('.ob-tag');
        if (r.tag) { if (!t) { t = document.createElement('span'); row.appendChild(t); } t.className = 'ob-tag ob-tag--' + r.tag.kind; t.textContent = '◂ ' + r.tag.text; }
        else if (t) { t.remove(); }
        // flash (replay)
        if (r.flash) { row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); }
      });
      // last price + tick + spread
      lastEl.querySelector('.ob-num').textContent = st.mid.toFixed(2);
      lastEl.querySelector('.ob-arrow').textContent = st.tick === 'up' ? '▲' : st.tick === 'dn' ? '▼' : '';
      lastEl.className = 'ob-last' + (st.tick ? ' ' + st.tick : '');
      var pct = (st.spread / st.mid * 100).toFixed(2);
      sprdEl.textContent = 'spread ' + st.spread.toFixed(2) + ' · ' + pct + '%';
      // caption
      if (animateCaption) { capEl.style.opacity = '0'; setTimeout(function () { capEl.innerHTML = st.caption; capEl.style.opacity = '1'; }, 130); }
      else { capEl.innerHTML = st.caption; }
      dotEls.forEach(function (d) { d.classList.toggle('on', +d.getAttribute('data-i') === phaseIdx); });
    }

    if (reduce) {
      var s2 = { rows: _baseRows(), mid: 100.05, spread: 0.10, tick: '' };
      s2.rows.a1.tag = { text: 'market = taker', kind: 'taker' };
      s2.rows.b1.tag = { text: 'limit = maker', kind: 'maker' };
      s2.caption = 'A <span class="ob-hl-taker">market</span> order crosses the spread and fills now (taker); a <span class="ob-hl-maker">limit</span> order rests on the book and waits (maker).';
      apply(s2, -1, false);
      return;
    }

    var st = {}; phases[0](st); apply(st, 0, false);
    var i = 0;
    el._obTimer = setInterval(function () {
      if (!document.body.contains(el)) { stopOrderBookDemo(el); return; }
      i = (i + 1) % phases.length;
      phases[i](st);
      apply(st, i, true);
    }, STEP_MS);
  }

  function stopOrderBookDemo(containerId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (el && el._obTimer) { clearInterval(el._obTimer); el._obTimer = null; }
  }

  window.renderOrderBookDemo = renderOrderBookDemo;
  window.stopOrderBookDemo = stopOrderBookDemo;
})();
