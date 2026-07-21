/**
 * lt-gallery.js
 * Plain browser script — no export, no modules.
 *
 * Usage:
 *   renderCandlestickGallery('my-container-id');
 */

function getBullishColor() {
  return LTStore.get('bullishColor') || '#00d4d4';
}
function getBearishColor() {
  return LTStore.get('bearishColor') || '#f2f2f2';
}

function renderCandlestickGallery(containerId) {

  /* ── candle definitions ─────────────────────────────────────────────── */
  var candles = [
    {
      id: 'marubozu-bull',
      name: 'Marubozu Bull',
      sentiment: 'Bullish',
      svg: '<rect x="13" y="8" width="14" height="64" fill="' + getBullishColor() + '"/>',
      body:    'Full body with no wicks. One side completely dominated price action from open to close.',
      wicks:   'No wicks at all. Buyers controlled every tick — no attempt by sellers to push back.',
      context: 'Appears after breakouts or at the start of strong bullish trends. Often seen after key support holds.',
      tip:     'A Marubozu Bull with high volume is one of the most reliable conviction signals you\'ll see.',
    },
    {
      id: 'marubozu-bear',
      name: 'Marubozu Bear',
      sentiment: 'Bearish',
      svg: '<rect x="13" y="8" width="14" height="64" fill="' + getBearishColor() + '"/>',
      body:    'Full body, no wicks. Sellers were completely in control from open to close — a strong momentum signal.',
      wicks:   'No wicks. Buyers had zero influence. Price opened at the high and closed at the low.',
      context: 'Common after breakdowns below key support or during panic selling. Watch for it at distribution tops.',
      tip:     'A Marubozu Bear after a failed breakout is a high-probability short signal.',
    },
    {
      id: 'hammer',
      name: 'Hammer',
      sentiment: 'Bullish',
      svg: '<rect x="13" y="8" width="14" height="14" fill="' + getBullishColor() + '"/>' +
           '<line x1="20" y1="22" x2="20" y2="72" stroke="' + getBullishColor() + '" stroke-width="1.5"/>',
      body:    'Small body near the top. Buyers stepped in and recovered most of the session\'s losses.',
      wicks:   'Long lower wick — sellers pushed hard but buyers rejected the move and drove price back up.',
      context: 'Must appear at the BOTTOM of a downtrend to be valid. Seller exhaustion signal.',
      tip:     'The longer the lower wick relative to the body, the stronger the rejection. Look for confirmation on the next candle.',
    },
    {
      id: 'hanging-man',
      name: 'Hanging Man',
      sentiment: 'Bearish',
      svg: '<rect x="13" y="8" width="14" height="14" fill="' + getBearishColor() + '"/>' +
           '<line x1="20" y1="22" x2="20" y2="72" stroke="' + getBearishColor() + '" stroke-width="1.5"/>',
      body:    'Same shape as a Hammer, but context changes everything. Small body at the top of an uptrend.',
      wicks:   'Long lower wick at the top of a rally. Buyers are losing control — sellers are starting to win intrabar.',
      context: 'Appears at the TOP of uptrends. A warning sign of reversal. Requires bearish confirmation next candle.',
      tip:     'Don\'t short this alone — wait for the next candle to close lower before acting.',
    },
    {
      id: 'shooting-star',
      name: 'Shooting Star',
      sentiment: 'Bearish',
      svg: '<rect x="13" y="58" width="14" height="14" fill="' + getBearishColor() + '"/>' +
           '<line x1="20" y1="8" x2="20" y2="58" stroke="' + getBearishColor() + '" stroke-width="1.5"/>',
      body:    'Small body near the bottom. Buyers pushed price up sharply but sellers slammed it back down.',
      wicks:   'Long upper wick — buyers tried hard but got completely rejected at highs. Buyer exhaustion signal.',
      context: 'Appears at the TOP of uptrends. One of the most reliable single-candle bearish reversal patterns.',
      tip:     'The upper wick should be at least 2× the body length. The bigger the rejection, the stronger the signal.',
    },
    {
      id: 'inverted-hammer',
      name: 'Inverted Hammer',
      sentiment: 'Bullish',
      svg: '<rect x="13" y="58" width="14" height="14" fill="' + getBullishColor() + '"/>' +
           '<line x1="20" y1="8" x2="20" y2="58" stroke="' + getBullishColor() + '" stroke-width="1.5"/>',
      body:    'Small body near the bottom of the candle. Buyers are attempting to take control after a downtrend.',
      wicks:   'Long upper wick at the bottom of a downtrend. Buyers tried to push price up — that attempt matters.',
      context: 'Appears at the BOTTOM of downtrends. Watch the next candle for bullish confirmation before acting.',
      tip:     'Often confused with Shooting Star — location is everything. Bottom of downtrend = potential reversal.',
    },
    {
      id: 'spinning-top',
      name: 'Spinning Top',
      sentiment: 'Neutral',
      svg: '<rect x="13" y="30" width="14" height="20" fill="' + getBullishColor() + '"/>' +
           '<line x1="20" y1="8" x2="20" y2="30" stroke="' + getBullishColor() + '" stroke-width="1.5"/>' +
           '<line x1="20" y1="50" x2="20" y2="72" stroke="' + getBullishColor() + '" stroke-width="1.5"/>',
      body:    'Small body in the middle. Neither buyers nor sellers could establish dominance.',
      wicks:   'Roughly equal upper and lower wicks. Both sides fought and neither side won.',
      context: 'Can appear anywhere but is most significant after a strong trend. Often precedes a reversal or consolidation.',
      tip:     'A Spinning Top inside a tight range is noise. At the end of a long trend, it\'s a warning.',
    },
    {
      id: 'doji',
      name: 'Doji',
      sentiment: 'Neutral',
      svg: '<line x1="8" y1="40" x2="32" y2="40" style="stroke:var(--text3)" stroke-width="2"/>' +
           '<line x1="20" y1="8" x2="20" y2="72" style="stroke:var(--text3)" stroke-width="1.5"/>',
      body:    'No body — open and close are equal (or nearly so). The market ended exactly where it started.',
      wicks:   'Upper and lower wicks of varying length. Both sides fought hard but settled at a perfect draw.',
      context: 'Most powerful after a strong trending move. At resistance after a rally = bearish. At support after a sell-off = bullish.',
      tip:     'A Doji alone means nothing. Read the candles around it — context determines direction.',
    },
    {
      id: 'dragonfly-doji',
      name: 'Dragonfly Doji',
      sentiment: 'Bullish',
      svg: '<line x1="8" y1="12" x2="32" y2="12" stroke="' + getBullishColor() + '" stroke-width="2"/>' +
           '<line x1="20" y1="12" x2="20" y2="72" stroke="' + getBullishColor() + '" stroke-width="1.5"/>',
      body:    'Body sits at the very top. Sellers pushed price all the way down but buyers recovered the entire move.',
      wicks:   'Long lower wick only, no upper wick. Sellers tried — buyers won completely.',
      context: 'Strongest when appearing at key support levels or the bottom of a downtrend. Strong reversal signal.',
      tip:     'The longer the lower wick, the more powerful the buyer rejection. Pair with volume for confirmation.',
    },
    {
      id: 'gravestone-doji',
      name: 'Gravestone Doji',
      sentiment: 'Bearish',
      svg: '<line x1="8" y1="68" x2="32" y2="68" stroke="' + getBearishColor() + '" stroke-width="2"/>' +
           '<line x1="20" y1="8" x2="20" y2="68" stroke="' + getBearishColor() + '" stroke-width="1.5"/>',
      body:    'Body sits at the very bottom. Buyers pushed price all the way up but sellers dragged it back to the open.',
      wicks:   'Long upper wick only, no lower wick. Buyers tried — sellers won completely.',
      context: 'Strongest at key resistance levels or the top of an uptrend. Strong reversal signal.',
      tip:     'Named "Gravestone" for a reason — it marks the death of the bullish move. Pair with high volume for maximum conviction.',
    },
  ];

  /* ── sentiment chips + glow (app palette: teal bull / pink bear / neutral) ── */
  var SENT = {
    Bullish: { chipBg: 'rgba(0,212,212,0.10)',  chipBr: 'rgba(0,212,212,0.45)',  chipTx: 'var(--teal)', glow: 'rgba(0,212,212,0.55)' },
    Bearish: { chipBg: 'rgba(255,46,136,0.10)', chipBr: 'rgba(255,46,136,0.45)', chipTx: '#ff5f8f',     glow: 'rgba(255,46,136,0.5)' },
    Neutral: { chipBg: 'var(--bg4)',            chipBr: 'var(--border2)',        chipTx: 'var(--text2)', glow: 'rgba(180,180,200,0.4)' }
  };

  /* ── styles ─────────────────────────────────────────────────────────── */
  var styleId = 'lt-gallery-styles';
  var old = document.getElementById(styleId);
  if (old) old.remove();
  var style = document.createElement('style');
  style.id = styleId;
  style.textContent = [
    '.lt-gallery-wrap { width:100%; box-sizing:border-box; font-family:"Geist Mono", ui-monospace, "SFMono-Regular", Menlo, monospace; }',

    /* picker strip — snap-scrolls on narrow screens, soft edge fades */
    '.lt-candle-row { display:flex; justify-content:space-between; align-items:flex-end; gap:6px; padding:10px 2px 6px;',
    '  overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling:touch; scroll-snap-type:x proximity;',
    '  scrollbar-width:none; -webkit-mask-image:linear-gradient(to right, transparent, #000 14px, #000 calc(100% - 14px), transparent);',
    '  mask-image:linear-gradient(to right, transparent, #000 14px, #000 calc(100% - 14px), transparent); }',
    '.lt-candle-row::-webkit-scrollbar { display:none; }',

    '.lt-candle-item { display:inline-flex; flex:0 0 auto; scroll-snap-align:center; flex-direction:column; align-items:center; gap:6px;',
    '  cursor:pointer; padding:8px 7px 6px; border-radius:9px; border:1px solid transparent; background:none;',
    '  transition:background-color .15s ease, border-color .15s ease, transform .14s cubic-bezier(0.23,1,0.32,1); user-select:none; -webkit-user-select:none; -webkit-tap-highlight-color:transparent; }',
    '.lt-candle-item:hover { background:var(--bg4); }',
    '.lt-candle-item:active { transform:scale(0.94); }',
    '.lt-candle-item[aria-selected="true"] { background:var(--bg4); border-color:var(--border2); }',
    '.lt-candle-item[aria-selected="true"] svg { filter:drop-shadow(0 0 5px var(--lt-glow, rgba(0,212,212,0.6))); }',
    '.lt-candle-item:focus-visible { outline:2px solid var(--teal); outline-offset:2px; }',
    '.lt-candle-item svg { display:block; transition:filter .15s ease; }',
    '.lt-candle-label { font-size:10px; color:var(--text3); text-align:center; line-height:1.3; white-space:nowrap; transition:color .15s ease; }',
    '.lt-candle-item:hover .lt-candle-label { color:var(--text2); }',
    '.lt-candle-item[aria-selected="true"] .lt-candle-label { color:var(--text); font-weight:700; }',

    /* detail card — big candle left, anatomy right */
    '.lt-info-panel { margin-top:10px; padding:18px 20px 20px; background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg);',
    '  box-shadow:var(--surface-hi), 0 12px 32px -22px rgba(0,0,0,0.55); }',
    '.lt-info-top { display:flex; align-items:center; gap:10px; margin-bottom:14px; }',
    '.lt-info-title { font-size:16.5px; font-weight:800; letter-spacing:-0.3px; color:var(--text); margin:0; }',
    '.lt-info-badge { font-size:9.5px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; padding:2.5px 9px; border-radius:20px; border:1px solid; }',
    '.lt-info-nav { margin-left:auto; display:flex; align-items:center; gap:6px; }',
    '.lt-info-count { font-size:10.5px; color:var(--text3); font-variant-numeric:tabular-nums; }',
    '.lt-info-arrow { width:26px; height:26px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border2); border-radius:7px;',
    '  background:none; color:var(--text3); cursor:pointer; transition:border-color .15s, color .15s, transform .12s; -webkit-tap-highlight-color:transparent; }',
    '.lt-info-arrow:hover { border-color:var(--teal); color:var(--teal); }',
    '.lt-info-arrow:active { transform:scale(0.92); }',
    '.lt-info-arrow svg { width:13px; height:13px; }',

    '.lt-info-grid { display:grid; grid-template-columns:96px 1fr; gap:14px 18px; align-items:stretch; }',
    '@media (max-width:560px){ .lt-info-grid { grid-template-columns:76px 1fr; gap:10px 12px; } }',
    '.lt-info-hero { display:flex; align-items:center; justify-content:center; background:var(--bg2); border:1px solid var(--border);',
    '  border-radius:var(--radius); position:relative; overflow:hidden; min-height:150px; }',
    '.lt-info-hero::before { content:""; position:absolute; inset:0; opacity:.5;',
    '  background-image:linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px); background-size:15px 15px; }',
    '.lt-info-hero svg { position:relative; filter:drop-shadow(0 0 10px var(--lt-glow, rgba(0,212,212,0.35))); }',

    '.lt-info-cols { display:flex; flex-direction:column; gap:10px; }',
    '.lt-info-block { background:var(--bg4); border-radius:8px; padding:9px 13px; }',
    '.lt-info-block-label { font-size:10px; font-weight:700; letter-spacing:0.09em; text-transform:uppercase; color:var(--teal); margin-bottom:4px; }',
    '.lt-info-block-text { font-size:12.5px; color:var(--text2); line-height:1.6; }',
    '.lt-info-below { margin-top:12px; display:flex; flex-direction:column; gap:10px; }',
    '.lt-info-tip { font-size:12.5px; font-style:italic; color:var(--teal); line-height:1.6; padding:9px 13px;',
    '  border-left:3px solid var(--teal); background:var(--teal-faint); border-radius:0 8px 8px 0; }',
    '.lt-info-tip-icon { display:inline-flex; vertical-align:middle; margin-right:6px; }',

    '.lt-info-swap { transition:opacity .16s ease, transform .16s cubic-bezier(0.23,1,0.32,1); }',
    '.lt-info-swap.out { opacity:0; transform:translateY(5px); }',
    '@media (prefers-reduced-motion: reduce) { .lt-info-swap { transition:none; } .lt-candle-item, .lt-info-arrow { transition:none; } }'
  ].join('\n');
  document.head.appendChild(style);

  /* ── mount into the container the caller gave us (the lab step widget) ── */
  var host = document.getElementById(containerId) || document.getElementById('content-area');
  if (!host) { console.error('[lt-gallery] mount container not found'); return; }
  var prev = document.getElementById('lt-gallery-root');
  if (prev) prev.remove();
  var mountPoint = document.createElement('div');
  mountPoint.id = 'lt-gallery-root';
  host.appendChild(mountPoint);

  var wrap = document.createElement('div');
  wrap.className = 'lt-gallery-wrap';
  var row = document.createElement('div');
  row.className = 'lt-candle-row';
  row.setAttribute('role', 'tablist');
  row.setAttribute('aria-label', 'Candle types');
  var panel = document.createElement('div');
  panel.className = 'lt-info-panel';

  var current = 0;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function paint(idx, animate) {
    var candle = candles[idx];
    var sc = SENT[candle.sentiment] || SENT.Neutral;
    var body =
      '<div class="lt-info-swap">' +
        '<div class="lt-info-top">' +
          '<h3 class="lt-info-title">' + candle.name + '</h3>' +
          '<span class="lt-info-badge" style="background:' + sc.chipBg + ';border-color:' + sc.chipBr + ';color:' + sc.chipTx + ';">' + candle.sentiment + '</span>' +
          '<span class="lt-info-nav">' +
            '<span class="lt-info-count">' + (idx + 1) + ' / ' + candles.length + '</span>' +
            '<button class="lt-info-arrow" data-nav="-1" aria-label="Previous candle type"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>' +
            '<button class="lt-info-arrow" data-nav="1" aria-label="Next candle type"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>' +
          '</span>' +
        '</div>' +
        '<div class="lt-info-grid" style="--lt-glow:' + sc.glow + ';">' +
          '<div class="lt-info-hero"><svg viewBox="0 0 40 80" width="72" height="144" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + candle.svg + '</svg></div>' +
          '<div class="lt-info-cols">' +
            '<div class="lt-info-block"><div class="lt-info-block-label">Body</div><div class="lt-info-block-text">' + candle.body + '</div></div>' +
            '<div class="lt-info-block"><div class="lt-info-block-label">Wicks</div><div class="lt-info-block-text">' + candle.wicks + '</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="lt-info-below">' +
          '<div class="lt-info-block"><div class="lt-info-block-label">Context</div><div class="lt-info-block-text">' + candle.context + '</div></div>' +
          '<div class="lt-info-tip"><i data-lucide="lightbulb" class="lt-info-tip-icon" style="width:14px;height:14px;"></i>' + candle.tip + '</div>' +
        '</div>' +
      '</div>';

    var apply = function() {
      panel.innerHTML = body;
      panel.querySelectorAll('.lt-info-arrow').forEach(function(b) {
        b.addEventListener('click', function() { select((current + parseInt(b.dataset.nav, 10) + candles.length) % candles.length, true); });
      });
      if (typeof lucide !== 'undefined') lucide.createIcons();
      if (animate && !reduced) {
        var sw = panel.querySelector('.lt-info-swap');
        sw.classList.add('out');
        requestAnimationFrame(function() { requestAnimationFrame(function() { sw.classList.remove('out'); }); });
      }
    };

    if (animate && !reduced && panel.querySelector('.lt-info-swap')) {
      var cur = panel.querySelector('.lt-info-swap');
      cur.classList.add('out');
      setTimeout(apply, 130);
    } else apply();
  }

  function select(idx, animate) {
    if (idx === current && panel.innerHTML) return;
    current = idx;
    row.querySelectorAll('.lt-candle-item').forEach(function(it, i) {
      var sc = SENT[candles[i].sentiment] || SENT.Neutral;
      it.setAttribute('aria-selected', i === idx ? 'true' : 'false');
      it.setAttribute('tabindex', i === idx ? '0' : '-1');
      it.style.setProperty('--lt-glow', sc.glow);
    });
    var active = row.children[idx];
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    paint(idx, animate);
  }

  candles.forEach(function(candle, i) {
    var item = document.createElement('button');
    item.type = 'button';
    item.className = 'lt-candle-item';
    item.setAttribute('role', 'tab');
    item.setAttribute('data-id', candle.id);
    item.innerHTML =
      '<svg viewBox="0 0 40 80" width="38" height="76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + candle.svg + '</svg>' +
      '<div class="lt-candle-label">' + candle.name + '</div>';
    item.addEventListener('click', function() { select(i, true); item.focus({ preventScroll: true }); });
    row.appendChild(item);
  });

  /* arrow-key navigation across the strip */
  row.addEventListener('keydown', function(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    e.stopPropagation();   // the engine pages course steps on arrows at document level
    var next = (current + (e.key === 'ArrowRight' ? 1 : -1) + candles.length) % candles.length;
    select(next, true);
    var it = row.children[next];
    if (it) it.focus({ preventScroll: true });
  });

  wrap.appendChild(row);
  wrap.appendChild(panel);
  mountPoint.appendChild(wrap);
  select(0, false);
}
