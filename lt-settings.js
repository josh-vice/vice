/**
 * lt-settings.js
 * Plain browser script — no export, no modules.
 *
 * Usage:
 *   renderSettingsPage('my-container-id');
 */

/* ── Constants ────────────────────────────────────────────────────────────── */
var LT_DARK_THEME = {
  '--bg':         '#000000',
  '--bg2':        '#080808',
  '--bg3':        '#0f0f0f',
  '--bg4':        '#141414',
  '--bg5':        '#1a1a1a',
  '--text':       '#ffffff',
  '--text2':      '#888888',
  '--text3':      '#555555',
  '--border':     '#1e1e1e',
  '--border2':    '#2a2a2a',
  '--teal-dim':   'rgba(0,212,212,0.10)',
  '--teal-faint': 'rgba(0,212,212,0.05)',
};

var LT_LIGHT_THEME = {
  '--bg':        '#f0f2f5',
  '--bg2':       '#e5e8ed',
  '--bg3':       '#d8dce3',
  '--bg4':       '#cbd0d9',
  '--bg5':       '#bec4cf',
  '--text':      '#0a0a0f',
  '--text2':     '#2a2a3a',
  '--text3':     '#4a4a5a',
  '--border':    '#c0c5ce',
  '--border2':   '#aab0bb',
  '--teal-dim':  'rgba(0,212,212,0.15)',
  '--teal-faint':'rgba(0,212,212,0.08)',
};

/* ── Apply saved settings on load ────────────────────────────────────────── */
function ltApplySavedSettings() {
  var color = localStorage.getItem('lt_bullish_color');
  if (color) {
    document.documentElement.style.setProperty('--teal', color);
  }

  var theme = localStorage.getItem('lt_theme');
  if (theme === 'light') {
    var vars = LT_LIGHT_THEME;
    Object.keys(vars).forEach(function(k) {
      document.documentElement.style.setProperty(k, vars[k]);
    });
    document.documentElement.style.setProperty('--bg-card', '#ffffff');
    document.documentElement.style.setProperty('--shadow', '0 4px 24px rgba(0,0,0,0.12)');
  } else {
    var vars = LT_DARK_THEME;
    Object.keys(vars).forEach(function(k) {
      document.documentElement.style.setProperty(k, vars[k]);
    });
  }

  ltApplyFont(localStorage.getItem('lt_font') || 'default');
}

function ltApplyFont(f) {
  var html = document.documentElement;
  html.classList.remove('font-pixelify', 'font-inter');
  if (f === 'pixelify') html.classList.add('font-pixelify');
  else if (f === 'inter') html.classList.add('font-inter');
}

/* ── EXPORT / IMPORT PROGRESS (no account needed) ─────────────────────────── */
function ltExportProgress() {
  var data = {};
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.indexOf('lt_') === 0) data[k] = localStorage.getItem(k);
  }
  var payload = { app: 'LiquidityTheory', version: 1, exported: new Date().toISOString(), data: data };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = 'liquidity-theory-progress-' + stamp + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  if (typeof showToast === 'function') showToast('✓ Progress backup downloaded');
}

function ltImportProgress(file) {
  var reader = new FileReader();
  reader.onload = function () {
    var obj;
    try { obj = JSON.parse(reader.result); } catch (e) { obj = null; }
    var data = obj && (obj.data || (obj.app ? null : obj));
    if (!data || typeof data !== 'object') {
      if (typeof showToast === 'function') showToast('⚠ That file isn\'t a valid Liquidity Theory backup.');
      else alert('That file isn\'t a valid Liquidity Theory backup.');
      return;
    }
    if (!window.confirm('Restore this backup? It will replace the progress currently saved in this browser.')) return;
    Object.keys(data).forEach(function (k) {
      if (k.indexOf('lt_') === 0) { try { localStorage.setItem(k, data[k]); } catch (e) {} }
    });
    location.reload();
  };
  reader.readAsText(file);
}

ltApplySavedSettings();

/* ── Main render function ─────────────────────────────────────────────────── */
function renderSettingsPage(containerId) {

  /* ── inject styles once ───────────────────────────────────────────────── */
  var styleId = 'lt-settings-styles';
  if (!document.getElementById(styleId)) {
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = [

      '.lt-settings-wrap {',
      '  width: 100%;',
      '  max-width: 720px;',
      '  margin: 0 auto;',
      '  padding: 32px 24px 48px;',
      '  box-sizing: border-box;',
      '  font-family: "Barlow", system-ui, -apple-system, sans-serif;',
      '}',

      /* header */
      '.lt-settings-header {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 12px;',
      '  margin-bottom: 6px;',
      '}',

      '.lt-settings-title {',
      '  font-family: "Barlow Condensed", sans-serif;',
      '  font-size: 32px;',
      '  font-weight: 700;',
      '  color: var(--text);',
      '  margin: 0;',
      '  line-height: 1;',
      '}',

      '.lt-settings-subtitle {',
      '  font-size: 13px;',
      '  color: var(--text2);',
      '  margin: 0 0 32px 0;',
      '  padding-left: 2px;',
      '}',

      /* section */
      '.lt-settings-section {',
      '  background: var(--bg3);',
      '  border: 1px solid var(--border);',
      '  border-radius: 8px;',
      '  margin-bottom: 20px;',
      '  overflow: hidden;',
      '}',

      '.lt-settings-section-label {',
      '  font-family: "Barlow Condensed", sans-serif;',
      '  font-size: 10px;',
      '  font-weight: 700;',
      '  letter-spacing: 0.12em;',
      '  text-transform: uppercase;',
      '  color: var(--teal);',
      '  padding: 14px 20px 10px;',
      '  border-bottom: 1px solid var(--border);',
      '  background: var(--bg4);',
      '}',

      /* row */
      '.lt-settings-row {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  padding: 18px 20px;',
      '  gap: 24px;',
      '}',

      '.lt-settings-row + .lt-settings-row {',
      '  border-top: 1px solid var(--border);',
      '}',

      '.lt-settings-row-info {',
      '  flex: 1;',
      '  min-width: 0;',
      '}',

      '.lt-settings-row-label {',
      '  font-size: 14px;',
      '  font-weight: 600;',
      '  color: var(--text);',
      '  margin-bottom: 3px;',
      '}',

      '.lt-settings-row-desc {',
      '  font-size: 12px;',
      '  color: var(--text2);',
      '  line-height: 1.5;',
      '}',

      '.lt-settings-row-control {',
      '  flex-shrink: 0;',
      '}',

      /* color toggle buttons */
      '.lt-color-toggle {',
      '  display: flex;',
      '  gap: 8px;',
      '}',

      '.lt-color-btn {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  padding: 7px 14px 7px 10px;',
      '  background: var(--bg4);',
      '  border: 1.5px solid var(--border2);',
      '  border-radius: 6px;',
      '  cursor: pointer;',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  color: var(--text2);',
      '  font-family: "Barlow", sans-serif;',
      '  transition: border-color 0.15s, color 0.15s, background 0.15s;',
      '}',

      '.lt-color-btn:hover {',
      '  border-color: var(--teal);',
      '  color: var(--text);',
      '}',

      '.lt-color-btn.active {',
      '  border-color: var(--teal);',
      '  color: var(--text);',
      '  background: rgba(0,212,212,0.08);',
      '}',

      /* pill toggle switch */
      '.lt-toggle-wrap {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 10px;',
      '}',

      '.lt-toggle-label {',
      '  font-size: 12px;',
      '  color: var(--text2);',
      '  min-width: 32px;',
      '}',

      '.lt-toggle {',
      '  position: relative;',
      '  width: 44px;',
      '  height: 24px;',
      '  cursor: pointer;',
      '  flex-shrink: 0;',
      '}',

      '.lt-toggle input {',
      '  opacity: 0;',
      '  width: 0;',
      '  height: 0;',
      '  position: absolute;',
      '}',

      '.lt-toggle-track {',
      '  position: absolute;',
      '  inset: 0;',
      '  background: var(--border2);',
      '  border-radius: 12px;',
      '  transition: background 0.2s;',
      '}',

      '.lt-toggle input:checked + .lt-toggle-track {',
      '  background: var(--teal);',
      '}',

      '.lt-toggle-thumb {',
      '  position: absolute;',
      '  top: 3px;',
      '  left: 3px;',
      '  width: 18px;',
      '  height: 18px;',
      '  background: #fff;',
      '  border-radius: 50%;',
      '  transition: transform 0.2s;',
      '  pointer-events: none;',
      '}',

      '.lt-toggle input:checked ~ .lt-toggle-thumb {',
      '  transform: translateX(20px);',
      '}',

      /* reset button */
      '.lt-btn-danger {',
      '  padding: 8px 18px;',
      '  background: transparent;',
      '  border: 1.5px solid #cc2222;',
      '  border-radius: 6px;',
      '  color: #ff6666;',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  font-family: "Barlow", sans-serif;',
      '  cursor: pointer;',
      '  transition: background 0.15s, color 0.15s;',
      '}',

      '.lt-btn-danger:hover {',
      '  background: rgba(204,34,34,0.12);',
      '  color: #ff8888;',
      '}',

      '.lt-btn-secondary {',
      '  padding: 8px 18px;',
      '  background: transparent;',
      '  border: 1.5px solid var(--border3);',
      '  border-radius: 6px;',
      '  color: var(--text2);',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  font-family: "Barlow", sans-serif;',
      '  cursor: pointer;',
      '  transition: all 0.15s;',
      '}',
      '.lt-btn-secondary:hover {',
      '  border-color: var(--teal);',
      '  color: var(--teal);',
      '}',

      /* confirm dialog */
      '.lt-confirm-overlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  background: rgba(0,0,0,0.7);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  z-index: 9999;',
      '}',

      '.lt-confirm-box {',
      '  background: var(--bg3);',
      '  border: 1px solid var(--border2);',
      '  border-radius: 10px;',
      '  padding: 28px 28px 22px;',
      '  max-width: 360px;',
      '  width: 90%;',
      '  box-sizing: border-box;',
      '  font-family: "Barlow", sans-serif;',
      '}',

      '.lt-confirm-title {',
      '  font-family: "Barlow Condensed", sans-serif;',
      '  font-size: 20px;',
      '  font-weight: 700;',
      '  color: var(--text);',
      '  margin-bottom: 10px;',
      '}',

      '.lt-confirm-msg {',
      '  font-size: 13px;',
      '  color: var(--text2);',
      '  line-height: 1.55;',
      '  margin-bottom: 22px;',
      '}',

      '.lt-confirm-actions {',
      '  display: flex;',
      '  gap: 10px;',
      '  justify-content: flex-end;',
      '}',

      '.lt-confirm-cancel {',
      '  padding: 8px 18px;',
      '  background: var(--bg4);',
      '  border: 1px solid var(--border2);',
      '  border-radius: 6px;',
      '  color: var(--text2);',
      '  font-size: 13px;',
      '  font-family: "Barlow", sans-serif;',
      '  cursor: pointer;',
      '  transition: color 0.15s, border-color 0.15s;',
      '}',

      '.lt-confirm-cancel:hover {',
      '  color: var(--text);',
      '  border-color: var(--text2);',
      '}',

      '.lt-confirm-ok {',
      '  padding: 8px 18px;',
      '  background: #cc2222;',
      '  border: 1px solid #cc2222;',
      '  border-radius: 6px;',
      '  color: #fff;',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  font-family: "Barlow", sans-serif;',
      '  cursor: pointer;',
      '  transition: background 0.15s;',
      '}',

      '.lt-confirm-ok:hover {',
      '  background: #aa1c1c;',
      '}',

      /* teal outlined button */
      '.lt-btn-teal {',
      '  padding: 8px 18px;',
      '  background: transparent;',
      '  border: 1.5px solid var(--teal);',
      '  border-radius: 6px;',
      '  color: var(--teal);',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  font-family: "Barlow", sans-serif;',
      '  cursor: pointer;',
      '  transition: background 0.15s;',
      '}',

      '.lt-btn-teal:hover {',
      '  background: rgba(0,212,212,0.12);',
      '}',

      '.lt-confirm-ok--teal {',
      '  background: var(--teal);',
      '  border-color: var(--teal);',
      '  color: #000;',
      '}',

      '.lt-confirm-ok--teal:hover {',
      '  background: rgba(0,212,212,0.85);',
      '}',

    ].join('\n');
    document.head.appendChild(style);
  }

  /* ── get container ────────────────────────────────────────────────────── */
  var container = document.getElementById(containerId);
  if (!container) {
    console.error('[lt-settings] Element #' + containerId + ' not found.');
    return;
  }
  container.innerHTML = '';

  /* ── read saved prefs ─────────────────────────────────────────────────── */
  var savedColor = localStorage.getItem('lt_bullish_color') || '#00d4d4';
  var savedTheme = localStorage.getItem('lt_theme') || 'dark';
  var savedFont  = localStorage.getItem('lt_font') || 'default';

  /* ── sample candle SVG helper ─────────────────────────────────────────── */
  function candleSvg(color) {
    return (
      '<svg width="18" height="32" viewBox="0 0 18 32" xmlns="http://www.w3.org/2000/svg">' +
        '<line x1="9" y1="0" x2="9" y2="6" stroke="' + color + '" stroke-width="1.5"/>' +
        '<rect x="4" y="6" width="10" height="18" fill="' + color + '"/>' +
        '<line x1="9" y1="24" x2="9" y2="32" stroke="' + color + '" stroke-width="1.5"/>' +
      '</svg>'
    );
  }

  /* ── build layout ─────────────────────────────────────────────────────── */
  var wrap = document.createElement('div');
  wrap.className = 'lt-settings-wrap';

  wrap.innerHTML =

    /* ── back button ── */
    '<button onclick="typeof init===\'function\' ? init() : history.back()" style="display:inline-flex;align-items:center;gap:6px;background:transparent;border:none;color:var(--teal);font-family:\'Barlow\',sans-serif;font-size:13px;font-weight:600;cursor:pointer;padding:0 0 18px 0;">' +
      '<i data-lucide="arrow-left" style="width:16px;height:16px;"></i>' +
      'Back to Course' +
    '</button>' +

    /* ── header ── */
    '<div class="lt-settings-header">' +
      '<i data-lucide="settings" style="width:28px;height:28px;color:var(--teal);flex-shrink:0;"></i>' +
      '<h1 class="lt-settings-title">Settings</h1>' +
    '</div>' +
    '<p class="lt-settings-subtitle">Customize your learning experience</p>' +

    /* ══ SECTION 1 — CHART APPEARANCE ══ */
    '<div class="lt-settings-section" id="lt-s-appearance">' +
      '<div class="lt-settings-section-label">Chart Appearance</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Bullish Candle Color</div>' +
          '<div class="lt-settings-row-desc">Choose how bullish candles appear on all charts</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<div class="lt-color-toggle" id="lt-color-toggle">' +
            '<button class="lt-color-btn' + (savedColor === '#00d4d4' ? ' active' : '') + '" data-color="#00d4d4" id="lt-color-cyan">' +
              candleSvg('#00d4d4') +
              'Cyan' +
            '</button>' +
            '<button class="lt-color-btn' + (savedColor === '#00c878' ? ' active' : '') + '" data-color="#00c878" id="lt-color-green">' +
              candleSvg('#00c878') +
              'Green' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ══ SECTION 2 — DISPLAY ══ */
    '<div class="lt-settings-section" id="lt-s-display">' +
      '<div class="lt-settings-section-label">Display</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Theme</div>' +
          '<div class="lt-settings-row-desc">Switch between dark and light mode</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<div class="lt-toggle-wrap">' +
            '<span class="lt-toggle-label" id="lt-theme-label">' + (savedTheme === 'light' ? 'Light' : 'Dark') + '</span>' +
            '<label class="lt-toggle" aria-label="Toggle theme">' +
              '<input type="checkbox" id="lt-theme-toggle"' + (savedTheme === 'light' ? ' checked' : '') + '>' +
              '<div class="lt-toggle-track"></div>' +
              '<div class="lt-toggle-thumb"></div>' +
            '</label>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Font</div>' +
          '<div class="lt-settings-row-desc">Choose the site-wide typeface</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<div class="lt-font-opts">' +
            '<button class="lt-font-btn' + (savedFont === 'default'  ? ' active' : '') + '" data-font="default">Default</button>' +
            '<button class="lt-font-btn' + (savedFont === 'pixelify' ? ' active' : '') + '" data-font="pixelify" style="font-family:\'Pixelify Sans\',sans-serif;">Pixelify</button>' +
            '<button class="lt-font-btn' + (savedFont === 'inter'    ? ' active' : '') + '" data-font="inter" style="font-family:\'Inter\',sans-serif;">Inter</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ══ SECTION 3 — PROGRESS ══ */
    '<div class="lt-settings-section" id="lt-s-progress">' +
      '<div class="lt-settings-section-label">Progress</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Reset Course Progress</div>' +
          '<div class="lt-settings-row-desc">Clear all saved progress and start Course 1 from the beginning</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<button class="lt-btn-danger" id="lt-reset-btn">Reset Progress</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ══ SECTION 3b — BACKUP & RESTORE ══ */
    '<div class="lt-settings-section" id="lt-s-backup">' +
      '<div class="lt-settings-section-label">Backup &amp; Restore</div>' +
      '<div class="lt-settings-row-desc" style="padding:16px 20px 2px;">Your progress is already saved automatically in this browser — no account needed. Export a backup file if you want to keep a copy or move it to another device or browser.</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Export Progress</div>' +
          '<div class="lt-settings-row-desc">Download a backup file of your courses, simulator stats and settings</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<button class="lt-btn-secondary" id="lt-export-btn">Export Backup</button>' +
        '</div>' +
      '</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Import Progress</div>' +
          '<div class="lt-settings-row-desc">Restore from a backup file (replaces your current progress)</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<button class="lt-btn-secondary" id="lt-import-btn">Import Backup</button>' +
          '<input type="file" id="lt-import-file" accept="application/json,.json" style="display:none;">' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ══ SECTION 4 — DEVELOPER TOOLS ══ */
    '<div class="lt-settings-section" id="lt-s-devtools">' +
      '<div class="lt-settings-section-label">Developer Tools</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Mark All Chapters Complete</div>' +
          '<div class="lt-settings-row-desc">Override completion status for all chapters across all courses</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<button class="lt-btn-teal" id="lt-markall-btn">Mark All Complete</button>' +
        '</div>' +
      '</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Reset All Progress</div>' +
          '<div class="lt-settings-row-desc">Clear all progress across all courses</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<button class="lt-btn-danger" id="lt-resetall-btn">Reset All</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  container.appendChild(wrap);

  /* ── wire up Lucide icons ─────────────────────────────────────────────── */
  if (typeof lucide !== 'undefined') lucide.createIcons();

  /* ── CONTROL: bullish color toggle ───────────────────────────────────── */
  var colorBtns = wrap.querySelectorAll('.lt-color-btn');
  colorBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var color = btn.getAttribute('data-color');

      /* update active state */
      colorBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');

      /* apply + persist */
      document.documentElement.style.setProperty('--teal', color);
      localStorage.setItem('lt_bullish_color', color);

      /* sync engine TEAL and re-render charts */
      if (typeof window.TEAL !== 'undefined') window.TEAL = color;
      if (typeof window.ltRefreshCharts === 'function') window.ltRefreshCharts();

      /* re-render gallery if visible */
      if (typeof renderCandlestickGallery === 'function' && document.getElementById('lt-gallery-root')) {
        renderCandlestickGallery('lt-gallery-root');
      }

      if (typeof lucide !== 'undefined') lucide.createIcons();
    });
  });

  /* ── CONTROL: theme toggle ────────────────────────────────────────────── */
  var themeToggle = wrap.querySelector('#lt-theme-toggle');
  var themeLabel  = wrap.querySelector('#lt-theme-label');

  themeToggle.addEventListener('change', function() {
    var isLight = themeToggle.checked;
    var vars    = isLight ? LT_LIGHT_THEME : LT_DARK_THEME;

    Object.keys(vars).forEach(function(k) {
      document.documentElement.style.setProperty(k, vars[k]);
    });

    if (isLight) {
      document.documentElement.style.setProperty('--bg-card', '#ffffff');
      document.documentElement.style.setProperty('--shadow', '0 4px 24px rgba(0,0,0,0.12)');
    } else {
      document.documentElement.style.removeProperty('--bg-card');
      document.documentElement.style.removeProperty('--shadow');
    }

    themeLabel.textContent = isLight ? 'Light' : 'Dark';
    localStorage.setItem('lt_theme', isLight ? 'light' : 'dark');
  });

  /* ── CONTROL: font selector (Default · Pixelify · VT323) ──────────────── */
  var fontBtns = wrap.querySelectorAll('.lt-font-btn');
  fontBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var f = btn.getAttribute('data-font');
      ltApplyFont(f);
      fontBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      localStorage.setItem('lt_font', f);
    });
  });

  /* ── CONTROL: export / import progress ────────────────────────────────── */
  var exportBtn = wrap.querySelector('#lt-export-btn');
  if (exportBtn) exportBtn.addEventListener('click', ltExportProgress);

  var importBtn  = wrap.querySelector('#lt-import-btn');
  var importFile = wrap.querySelector('#lt-import-file');
  if (importBtn && importFile) {
    importBtn.addEventListener('click', function() { importFile.click(); });
    importFile.addEventListener('change', function() {
      if (importFile.files && importFile.files[0]) ltImportProgress(importFile.files[0]);
      importFile.value = '';
    });
  }

  /* ── CONTROL: reset button + confirmation ─────────────────────────────── */
  var resetBtn = wrap.querySelector('#lt-reset-btn');

  resetBtn.addEventListener('click', function() {
    /* build confirm overlay */
    var overlay = document.createElement('div');
    overlay.className = 'lt-confirm-overlay';
    overlay.innerHTML =
      '<div class="lt-confirm-box">' +
        '<div class="lt-confirm-title">Reset Progress</div>' +
        '<div class="lt-confirm-msg">Are you sure? This cannot be undone. All quiz answers, chapter completions, and exam results will be cleared.</div>' +
        '<div class="lt-confirm-actions">' +
          '<button class="lt-confirm-cancel" id="lt-confirm-cancel">Cancel</button>' +
          '<button class="lt-confirm-ok" id="lt-confirm-ok">Yes, Reset</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.querySelector('#lt-confirm-cancel').addEventListener('click', function() {
      document.body.removeChild(overlay);
    });

    overlay.querySelector('#lt-confirm-ok').addEventListener('click', function() {
      localStorage.removeItem('lt_course1_state');
      location.reload();
    });

    /* click outside to dismiss */
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  });

  /* ── CONTROL: mark all chapters complete ───────────────────────────────────── */
  var markAllBtn = wrap.querySelector('#lt-markall-btn');
  markAllBtn.addEventListener('click', function() {
    var overlay = document.createElement('div');
    overlay.className = 'lt-confirm-overlay';
    overlay.innerHTML =
      '<div class="lt-confirm-box">' +
        '<div class="lt-confirm-title">Mark All Complete</div>' +
        '<div class="lt-confirm-msg">Mark all chapters in all courses as complete?</div>' +
        '<div class="lt-confirm-actions">' +
          '<button class="lt-confirm-cancel" id="lt-markall-cancel">Cancel</button>' +
          '<button class="lt-confirm-ok lt-confirm-ok--teal" id="lt-markall-ok">Yes, Mark All</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelector('#lt-markall-cancel').addEventListener('click', function() {
      document.body.removeChild(overlay);
    });

    overlay.querySelector('#lt-markall-ok').addEventListener('click', function() {
      function buildProgress(chapters) {
        var p = {};
        chapters.forEach(function(chapter, i) {
          var correctAnswer = chapter.quiz && chapter.quiz.answers
            ? chapter.quiz.answers.find(function(a) { return a.correct === true; })
            : null;
          var answerId = correctAnswer ? correctAnswer.id : null;
          p[i] = {
            completed:        true,
            quizAnswered:     true,
            quizCorrect:      true,
            quizAnswer:       answerId,
            selectedAnswerId: answerId
          };
        });
        return p;
      }
      var c1 = typeof LT_CHAPTERS   !== 'undefined' ? LT_CHAPTERS   : [];
      var c2 = typeof LT_CHAPTERS_2 !== 'undefined' ? LT_CHAPTERS_2 : [];
      if (c1.length) {
        localStorage.setItem('lt_course1_state', JSON.stringify({
          chapter: c1.length - 1, step: 2, progress: buildProgress(c1)
        }));
      }
      if (c2.length) {
        localStorage.setItem('lt_course2_state', JSON.stringify({
          chapter: c2.length - 1, step: 2, progress: buildProgress(c2)
        }));
      }
      var c3 = typeof LT_CHAPTERS_3 !== 'undefined' ? LT_CHAPTERS_3 : [];
      var c4 = typeof LT_CHAPTERS_4 !== 'undefined' ? LT_CHAPTERS_4 : [];
      if (c3.length) {
        localStorage.setItem('lt_course3_state', JSON.stringify({
          chapter: c3.length - 1, step: 2, progress: buildProgress(c3)
        }));
      }
      if (c4.length) {
        localStorage.setItem('lt_course4_state', JSON.stringify({
          chapter: c4.length - 1, step: 2, progress: buildProgress(c4)
        }));
      }
      if (typeof showToast === 'function') showToast('✅ All chapters marked complete');
      setTimeout(function() { location.reload(); }, 800);
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  });

  /* ── CONTROL: reset all progress ───────────────────────────────────────── */
  var resetAllBtn = wrap.querySelector('#lt-resetall-btn');
  resetAllBtn.addEventListener('click', function() {
    var overlay = document.createElement('div');
    overlay.className = 'lt-confirm-overlay';
    overlay.innerHTML =
      '<div class="lt-confirm-box">' +
        '<div class="lt-confirm-title">Reset All Progress</div>' +
        '<div class="lt-confirm-msg">Clear all progress across all courses? This cannot be undone.</div>' +
        '<div class="lt-confirm-actions">' +
          '<button class="lt-confirm-cancel" id="lt-resetall-cancel">Cancel</button>' +
          '<button class="lt-confirm-ok" id="lt-resetall-ok">Yes, Reset All</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelector('#lt-resetall-cancel').addEventListener('click', function() {
      document.body.removeChild(overlay);
    });

    overlay.querySelector('#lt-resetall-ok').addEventListener('click', function() {
      Object.keys(localStorage)
        .filter(function(k) { return k.indexOf('lt_') === 0; })
        .forEach(function(k) { localStorage.removeItem(k); });
      if (typeof showToast === 'function') showToast('🗑️ Progress reset');
      setTimeout(function() { location.reload(); }, 800);
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  });
}
