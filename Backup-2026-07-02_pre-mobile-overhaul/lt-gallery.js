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

  /* ── sentiment colours ──────────────────────────────────────────────── */
  var sentimentColor = {
    Bullish: { bg: 'var(--teal)',  border: 'var(--teal)', text: '#000000' },
    Bearish: { bg: '#cc2222',     border: '#cc2222',      text: '#ffffff' },
    Neutral: { bg: '#888888',     border: '#888888',      text: '#ffffff' },
  };

  /* ── inject styles once ─────────────────────────────────────────────── */
  var styleId = 'lt-gallery-styles';
  if (!document.getElementById(styleId)) {
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      '@keyframes lt-fade {',
      '  from { opacity: 0; transform: translateY(6px); }',
      '  to   { opacity: 1; transform: translateY(0); }',
      '}',

      '.lt-gallery-wrap {',
      '  width: 100%;',
      '  box-sizing: border-box;',
      '  font-family: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;',
      '}',

      /* candle row */
      '.lt-candle-row {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: flex-end;',
      '  width: 100%;',
      '  gap: 8px;',
      '  padding: 12px 2px 8px;',
      '  box-sizing: border-box;',
      /* horizontal swipe when the candles outgrow the width (e.g. on phones) */
      '  overflow-x: auto;',
      '  overflow-y: hidden;',
      '  -webkit-overflow-scrolling: touch;',
      '  scroll-snap-type: x proximity;',
      '  scrollbar-width: thin;',
      '  scrollbar-color: var(--border3) transparent;',
      '}',
      '.lt-candle-row::-webkit-scrollbar { height: 5px; }',
      '.lt-candle-row::-webkit-scrollbar-thumb { background: var(--border3); border-radius: 3px; }',
      '.lt-candle-row::-webkit-scrollbar-track { background: transparent; }',

      '.lt-candle-item {',
      '  display: inline-flex;',
      '  flex: 0 0 auto;',              /* keep natural width so the row scrolls instead of squishing */
      '  scroll-snap-align: center;',
      '  flex-direction: column;',
      '  align-items: center;',
      '  gap: 6px;',
      '  cursor: pointer;',
      '  padding: 8px 6px 6px;',
      '  border-radius: 8px;',
      '  transition: background 0.15s ease;',
      '  user-select: none;',
      '  -webkit-user-select: none;',
      '}',

      '.lt-candle-item:hover,',
      '.lt-candle-item.active {',
      '  background: rgba(0,212,212,0.07);',
      '}',

      '.lt-candle-item svg {',
      '  display: block;',
      '  transition: filter 0.15s ease;',
      '}',

      '.lt-candle-item:hover svg,',
      '.lt-candle-item.active svg {',
      '  filter: drop-shadow(0 0 4px rgba(0,212,212,0.70));',
      '}',

      '.lt-candle-label {',
      '  font-size: 10px;',
      '  color: var(--text3);',
      '  text-align: center;',
      '  line-height: 1.3;',
      '  white-space: nowrap;',
      '  transition: color 0.15s ease;',
      '}',

      '.lt-candle-item:hover .lt-candle-label,',
      '.lt-candle-item.active .lt-candle-label {',
      '  color: var(--teal);',
      '}',

      /* info panel */
      '.lt-info-panel {',
      '  margin-top: 12px;',
      '  padding: 18px 20px 24px;',
      '  background: var(--bg3);',
      '  border: 1px solid var(--border);',
      '  border-radius: 10px;',
      '  width: 100%;',
      '  max-width: 100%;',
      '  box-sizing: border-box;',
      '}',

      '.lt-info-panel.lt-fading {',
      '  animation: lt-fade 0.2s ease;',
      '}',

      '.lt-info-header {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 10px;',
      '  margin-bottom: 14px;',
      '  flex-wrap: wrap;',
      '}',

      '.lt-info-title {',
      '  font-size: 17px;',
      '  font-weight: 700;',
      '  color: var(--text);',
      '  margin: 0;',
      '}',

      '.lt-info-badge {',
      '  font-size: 10px;',
      '  font-weight: 700;',
      '  letter-spacing: 0.07em;',
      '  text-transform: uppercase;',
      '  padding: 3px 9px;',
      '  border-radius: 20px;',
      '}',

      '.lt-info-cols {',
      '  display: grid;',
      '  grid-template-columns: 1fr 1fr;',
      '  gap: 10px 18px;',
      '  margin-bottom: 12px;',
      '}',

      '@media (max-width: 520px) {',
      '  .lt-info-cols { grid-template-columns: 1fr; }',
      '  .lt-candle-row { gap: 4px; }',
      '  .lt-candle-label { font-size: 9px; }',
      '}',

      '.lt-info-block {',
      '  background: var(--bg4);',
      '  border-radius: 7px;',
      '  padding: 9px 13px;',
      '}',

      '.lt-info-block-label {',
      '  font-size: 10px;',
      '  font-weight: 700;',
      '  letter-spacing: 0.09em;',
      '  text-transform: uppercase;',
      '  color: var(--teal);',
      '  margin-bottom: 5px;',
      '}',

      '.lt-info-block-text {',
      '  font-size: 13px;',
      '  color: var(--text2);',
      '  line-height: 1.55;',
      '}',

      '.lt-info-context {',
      '  background: var(--bg4);',
      '  border-radius: 7px;',
      '  padding: 9px 13px;',
      '  margin-bottom: 12px;',
      '}',

      '.lt-info-tip {',
      '  font-size: 13px;',
      '  font-style: italic;',
      '  color: var(--teal);',
      '  line-height: 1.55;',
      '  padding: 9px 13px;',
      '  border-left: 3px solid var(--teal);',
      '  background: var(--teal-faint);',
      '  border-radius: 0 7px 7px 0;',
      '}',

      '.lt-info-tip-icon { display:inline-flex; vertical-align:middle; margin-right:6px; flex-shrink:0; }',

    ].join('\n');
    document.head.appendChild(style);
  }

  /* ── find content-area and inject after the two-column layout ───────── */
  var ca = document.getElementById('content-area');
  if (!ca) {
    console.error('[lt-gallery] #content-area not found.');
    return;
  }
  var twoCol = ca.firstElementChild;

  /* remove any previous gallery instance */
  var existing = document.getElementById('lt-gallery-root');
  if (existing) existing.parentNode.removeChild(existing);

  var mountPoint = document.createElement('div');
  mountPoint.id = 'lt-gallery-root';
  mountPoint.style.cssText = 'width:100%;padding:0 24px 24px 24px;box-sizing:border-box;';
  if (twoCol && twoCol.nextSibling) {
    ca.insertBefore(mountPoint, twoCol.nextSibling);
  } else {
    ca.appendChild(mountPoint);
  }

  /* ── outer wrapper ──────────────────────────────────────────────────── */
  var wrap = document.createElement('div');
  wrap.className = 'lt-gallery-wrap';

  /* ── candle row ─────────────────────────────────────────────────────── */
  var row = document.createElement('div');
  row.className = 'lt-candle-row';

  /* ── info panel (always visible, default first candle) ────────────── */
  var panel = document.createElement('div');
  panel.className = 'lt-info-panel';

  /* ── active tracking ────────────────────────────────────────────────── */
  var activeItem = null;

  /* ── helper: render panel content ──────────────────────────────────── */
  function showCandle(candle) {
    var sc = sentimentColor[candle.sentiment] || sentimentColor['Neutral'];

    /* trigger fade animation by toggling class */
    panel.classList.remove('lt-fading');
    /* force reflow so animation restarts */
    void panel.offsetWidth;
    panel.classList.add('lt-fading');

    panel.style.display = '';
    panel.innerHTML =
      '<div class="lt-info-header">' +
        '<h3 class="lt-info-title">' + candle.name + '</h3>' +
        '<span class="lt-info-badge" style="' +
          'background:' + sc.bg + ';' +
          'border:1px solid ' + sc.border + ';' +
          'color:' + sc.text + ';">' +
          candle.sentiment +
        '</span>' +
      '</div>' +

      '<div class="lt-info-cols">' +
        '<div class="lt-info-block">' +
          '<div class="lt-info-block-label">Body</div>' +
          '<div class="lt-info-block-text">' + candle.body + '</div>' +
        '</div>' +
        '<div class="lt-info-block">' +
          '<div class="lt-info-block-label">Wicks</div>' +
          '<div class="lt-info-block-text">' + candle.wicks + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="lt-info-context">' +
        '<div class="lt-info-block-label">Context</div>' +
        '<div class="lt-info-block-text">' + candle.context + '</div>' +
      '</div>' +

      '<div class="lt-info-tip"><i data-lucide="lightbulb" class="lt-info-tip-icon" style="width:14px;height:14px;"></i>' + candle.tip + '</div>';
  }

  /* ── build candle items ─────────────────────────────────────────────── */
  candles.forEach(function(candle) {
    var item = document.createElement('div');
    item.className = 'lt-candle-item';
    item.setAttribute('data-id', candle.id);

    item.innerHTML =
      '<svg viewBox="0 0 40 80" width="40" height="80"' +
      ' xmlns="http://www.w3.org/2000/svg"' +
      ' aria-label="' + candle.name + '" role="img">' +
      candle.svg +
      '</svg>' +
      '<div class="lt-candle-label">' + candle.name + '</div>';

    item.addEventListener('mouseenter', function() {
      /* highlight */
      if (activeItem) activeItem.classList.remove('active');
      activeItem = item;
      item.classList.add('active');

      showCandle(candle);
    });

    row.appendChild(item);
  });

  wrap.appendChild(row);
  wrap.appendChild(panel);
  mountPoint.appendChild(wrap);

  /* ── default: show first candle immediately ─────────────────────── */
  var firstItem = row.querySelector('.lt-candle-item');
  if (firstItem) {
    firstItem.classList.add('active');
    activeItem = firstItem;
  }
  showCandle(candles[0]);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
