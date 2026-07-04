/**
 * lt-settings.js
 * Plain browser script — no export, no modules.
 *
 * Usage:
 *   renderSettingsPage('my-container-id');
 */

/* ── Constants ────────────────────────────────────────────────────────────── */
/* Both themes carry the FULL set of colour vars so toggling either way fully
   resets the palette (no stale overrides). Light mode is a purpose-built,
   industry-standard scheme — not an inversion. */
/* Miami Vice × synthwave — dark is the hero. Cyan stays primary; hot-pink is the
   signature secondary, with sunset-coral + neon-purple as supporting accents over a
   deep indigo "Miami night" backdrop (not flat black). */
var LT_DARK_THEME = {
  '--bg':'#08070f','--bg2':'#0d0b18','--bg3':'#14121f','--bg4':'#1d1a30','--bg5':'#272240',
  '--border':'#272235','--border2':'#363049','--border3':'#4b4566',
  '--teal':'#00d4d4','--teal2':'#00b8b8','--teal3':'#009696',
  '--teal-dim':'rgba(0,212,212,0.10)','--teal-glow':'rgba(0,212,212,0.22)','--teal-faint':'rgba(0,212,212,0.05)',
  '--pink':'#ff2e88','--pink2':'#ff5fa3','--pink-dim':'rgba(255,46,136,0.12)','--pink-glow':'rgba(255,46,136,0.24)','--pink-faint':'rgba(255,46,136,0.06)',
  '--purple':'#a855f7','--purple-dim':'rgba(168,85,247,0.14)','--purple-faint':'rgba(168,85,247,0.06)',
  '--coral':'#ff7a4d','--coral-dim':'rgba(255,122,77,0.14)',
  '--red':'#f23d5c','--red2':'#cc2f49','--red-dim':'rgba(242,61,92,0.14)','--red-faint':'rgba(242,61,92,0.07)',
  '--gold':'#e7b53a','--gold-dim':'rgba(231,181,58,0.13)',
  '--green':'#21d196','--green-dim':'rgba(33,209,150,0.12)',
  '--text':'#f6f5fb','--text2':'#a8a3bb','--text3':'#8b85a3','--text4':'#3a3a58',
  '--shadow':'0 16px 44px -16px rgba(0,0,0,0.72)','--shadow-sm':'0 2px 10px rgba(0,0,0,0.42)','--glow-teal':'0 0 20px rgba(0,212,212,0.28)','--glow-pink':'0 0 20px rgba(255,46,136,0.28)',
  '--discord-color':'#ffffff',
};

/* Daytime Miami — a sunlit pastel-deco variant. Legibility first (white cards,
   slate text) with a faint lavender canvas and the same pink/coral/purple accents
   in deeper, white-safe shades so light mode reads as the same brand, not an inversion. */
var LT_LIGHT_THEME = {
  '--bg':'#f6f4fb','--bg2':'#ffffff','--bg3':'#ffffff','--bg4':'#f1edf8','--bg5':'#e8e1f3',
  '--border':'#eae4f2','--border2':'#dcd3ea','--border3':'#c7bce0',
  '--teal':'#0d9488','--teal2':'#0f766e','--teal3':'#115e59',          /* deep teal: legible on white, premium */
  '--teal-dim':'rgba(13,148,136,0.10)','--teal-glow':'rgba(13,148,136,0.14)','--teal-faint':'rgba(13,148,136,0.06)',
  '--pink':'#db2777','--pink2':'#e84d97','--pink-dim':'rgba(219,39,119,0.10)','--pink-glow':'rgba(219,39,119,0.16)','--pink-faint':'rgba(219,39,119,0.05)',
  '--purple':'#7c3aed','--purple-dim':'rgba(124,58,237,0.10)','--purple-faint':'rgba(124,58,237,0.05)',
  '--coral':'#ea580c','--coral-dim':'rgba(234,88,12,0.10)',
  '--red':'#dc2626','--red2':'#b91c1c','--red-dim':'rgba(220,38,38,0.10)','--red-faint':'rgba(220,38,38,0.05)',
  '--gold':'#b45309','--gold-dim':'rgba(180,83,9,0.12)',
  '--green':'#16a34a','--green-dim':'rgba(22,163,74,0.10)',
  '--text':'#0f172a','--text2':'#475569','--text3':'#5b6470','--text4':'#94a3b8',   /* text3 darkened for AA (≥4.5:1) small-text on light --bg */
  '--shadow':'0 6px 20px rgba(48,18,76,0.10)','--shadow-sm':'0 1px 3px rgba(48,18,76,0.08)','--glow-teal':'0 0 0 3px rgba(13,148,136,0.18)','--glow-pink':'0 0 0 3px rgba(219,39,119,0.18)',
  '--discord-color':'#5865F2',
};

/* ── Apply saved settings on load ────────────────────────────────────────── */
function ltApplySavedSettings() {
  var theme = LTStore.get('theme') === 'light' ? 'light' : 'dark';
  var vars  = theme === 'light' ? LT_LIGHT_THEME : LT_DARK_THEME;
  Object.keys(vars).forEach(function(k) {
    document.documentElement.style.setProperty(k, vars[k]);
  });
  document.documentElement.classList.toggle('theme-light', theme === 'light');

  // Dark mode lets a chosen bullish candle colour also tint the UI accent.
  // Light mode keeps the legible deep-teal accent for contrast.
  var color = LTStore.get('bullishColor');
  if (color && theme === 'dark') document.documentElement.style.setProperty('--teal', color);

  // Bearish candle colour drives --bear (used by chart/glossary down-candles). Mirrors the
  // engine's getBearishColor: default brand pink; a chosen "white" remaps to slate in light mode.
  var bearC = LTStore.get('bearishColor') || '#ff2e88';
  if (theme === 'light' && /^#(f2f2f2|fff|ffffff)$/i.test(bearC)) bearC = '#334155';
  document.documentElement.style.setProperty('--bear', bearC);

  ltApplyFont(LTStore.get('font') || 'default');
}

function ltApplyFont(f) {
  var html = document.documentElement;
  html.classList.remove('font-pixelify', 'font-inter');
  if (f === 'inter') html.classList.add('font-inter');
}

/* Live-apply the lesson caption size to an open lesson player (the renderer also
   reads the setting on mount, so this just covers changing it mid-lesson). */
function ltApplyCaptionSize(sz) {
  sz = (sz === 'sm' || sz === 'lg') ? sz : 'md';
  document.querySelectorAll('.ltp2').forEach(function (p) {
    p.classList.remove('cap-sm', 'cap-md', 'cap-lg');
    p.classList.add('cap-' + sz);
  });
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
  if (typeof showToast === 'function') showToast('Progress backup downloaded', 3000, 'download');
}

function ltImportProgress(file) {
  var reader = new FileReader();
  reader.onload = function () {
    var obj;
    try { obj = JSON.parse(reader.result); } catch (e) { obj = null; }
    var data = obj && (obj.data || (obj.app ? null : obj));
    if (!data || typeof data !== 'object') {
      if (typeof showToast === 'function') showToast('That file isn\'t a valid Liquidity Theory backup.', 3000, 'alert-triangle');
      else alert('That file isn\'t a valid Liquidity Theory backup.');
      return;
    }
    if (!window.confirm('Restore this backup? It will replace the progress currently saved in this browser.')) return;
    // True replace (the dialog promises it): clear existing progress keys first so stale
    // completions can't survive restoring a smaller backup. Appearance/display prefs are
    // kept unless the backup itself carries them (a full export does).
    var KEEP = ['lt_theme','lt_font','lt_caption_size','lt_narration','lt_lesson_speed','lt_lesson_volume','lt_bullish_color','lt_bearish_color','lt_sidebar_collapsed'];
    Object.keys(localStorage).forEach(function (k) {
      if (k.indexOf('lt_') === 0 && KEEP.indexOf(k) === -1) { try { localStorage.removeItem(k); } catch (e) {} }
    });
    Object.keys(data).forEach(function (k) {
      // Only accept string values — a mangled backup would otherwise store "[object Object]".
      if (k.indexOf('lt_') === 0 && typeof data[k] === 'string') { try { localStorage.setItem(k, data[k]); } catch (e) {} }
    });
    location.reload();
  };
  reader.readAsText(file);
}

/* ── SYNC TO ANOTHER DEVICE — QR + compact link, no account, nothing uploaded ──
   The whole progress blob is LZ-compressed into the link's #fragment (fragments
   are never sent to a server). Opening/scanning it on another device triggers
   _ltCheckSyncImport() in lt-engine.js, which confirms + restores it. */
function _ltGatherProgress() {
  var data = {};
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.indexOf('lt_') === 0) data[k] = localStorage.getItem(k);
  }
  return data;
}
function ltBuildSyncLink() {
  if (typeof LZString === 'undefined') return null;
  var packed = LZString.compressToEncodedURIComponent(JSON.stringify(_ltGatherProgress()));
  return location.origin + location.pathname + '#sync=' + packed;
}
function ltOpenSyncModal() {
  var link = ltBuildSyncLink();
  if (!link) { if (typeof showToast === 'function') showToast('Sync isn\'t ready — refresh and try again.', 3000, 'alert-triangle'); return; }
  var ov = document.createElement('div');
  ov.className = 'modal-overlay';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Sync to another device');
  ov.innerHTML =
    '<div class="modal-box" style="max-width:380px;">' +
      '<h2 style="font-size:21px;margin-bottom:6px;">Sync to another device</h2>' +
      '<p class="modal-sub" style="margin-bottom:18px;">Scan the code or open the link on your other device to copy your progress over. Everything is inside the link itself — nothing is uploaded.</p>' +
      '<div id="lt-sync-qr" style="display:flex;justify-content:center;align-items:center;background:#fff;padding:12px;border-radius:10px;margin:0 auto 16px;min-height:176px;"></div>' +
      '<input id="lt-sync-link" readonly style="width:100%;background:var(--bg4);border:1px solid var(--border2);border-radius:var(--radius);color:var(--text2);font-family:\'JetBrains Mono\',monospace;font-size:11px;padding:9px 11px;margin-bottom:14px;" />' +
      '<div class="modal-actions">' +
        '<button class="btn-primary" id="lt-sync-copy">Copy link</button>' +
        '<button class="btn-ghost" id="lt-sync-close">Done</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(ov);
  var inp = ov.querySelector('#lt-sync-link'); if (inp) inp.value = link;
  var qrWrap = ov.querySelector('#lt-sync-qr');
  if (typeof QRCode !== 'undefined' && qrWrap) {
    try {
      // davidshimjs/qrcodejs renders a <canvas> (+ fallback <img>) into the container.
      new QRCode(qrWrap, { text: link, width: 200, height: 200, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.L });
    } catch (e) {
      qrWrap.innerHTML = '<div style="color:#444;font-size:12px;padding:24px 12px;text-align:center;line-height:1.5;">Your progress is a bit large for a QR code — use the link below to transfer it instead.</div>';
    }
  } else if (qrWrap) { qrWrap.style.display = 'none'; }
  function close() { ov.remove(); }
  var copyBtn = ov.querySelector('#lt-sync-copy');
  var closeBtn = ov.querySelector('#lt-sync-close');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function () { if (typeof showToast === 'function') showToast('Sync link copied', 3000, 'check'); });
    } else if (inp) { inp.select(); try { document.execCommand('copy'); } catch (e) {} if (typeof showToast === 'function') showToast('Sync link copied', 3000, 'check'); }
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  if (copyBtn) copyBtn.focus();   // move keyboard focus into the dialog on open
}
window.ltOpenSyncModal = ltOpenSyncModal;

/* ── Per-course progress helpers ──────────────────────────────────────────── */
var LT_COURSE_NAMES = ['Laying the Foundation', 'Building Your Toolbox', 'Sharpening Your Edge', 'Liquidity Theory'];

function _ltCourseChapters(n) {
  if (n === 1) return typeof LT_CHAPTERS   !== 'undefined' ? LT_CHAPTERS   : [];
  if (n === 2) return typeof LT_CHAPTERS_2 !== 'undefined' ? LT_CHAPTERS_2 : [];
  if (n === 3) return typeof LT_CHAPTERS_3 !== 'undefined' ? LT_CHAPTERS_3 : [];
  if (n === 4) return typeof LT_CHAPTERS_4 !== 'undefined' ? LT_CHAPTERS_4 : [];
  return [];
}

/* Build a fully-completed progress map for a course's chapters (quiz marked
   correct using each chapter's actual correct answer; module quizzes on each
   module-final chapter marked fully cleared so assessments read N/N). */
function _ltBuildCompleteProgress(chapters, courseNum) {
  var p = {};
  var mqByModule = (window.LT_MODULE_QUIZZES && window.LT_MODULE_QUIZZES[courseNum]) || {};
  chapters.forEach(function(chapter, i) {
    var correctAnswer = chapter.quiz && chapter.quiz.answers
      ? chapter.quiz.answers.find(function(a) { return a.correct === true; })
      : null;
    var answerId = correctAnswer ? correctAnswer.id : null;
    p[i] = { completed: true, quizAnswered: true, quizCorrect: true, quizAnswer: answerId, selectedAnswerId: answerId };
    // Module quiz lives on the module's final chapter (next chapter = new module).
    var next = chapters[i + 1];
    var isModuleFinal = !next || next.module !== chapter.module;
    var mq = chapter.module && mqByModule[chapter.module];
    if (isModuleFinal && mq && mq.questions && mq.questions.length) {
      var cleared = {};
      mq.questions.forEach(function(_q, qi) { cleared[qi] = true; });
      p[i].moduleQuiz = cleared;
    }
  });
  return p;
}

function ltMarkCourseComplete(n) {
  var ch = _ltCourseChapters(n);
  if (!ch.length) return false;
  localStorage.setItem(_ltCourseStateKey(n), JSON.stringify({
    chapter: ch.length - 1, step: 2, progress: _ltBuildCompleteProgress(ch, n)
  }));
  if (typeof window.ltSidebarInvalidate === 'function') window.ltSidebarInvalidate(n);
  // If this is the course currently loaded in the engine, its stale in-memory
  // state.progress would overwrite what we just wrote on the next saveState()
  // (that's the "current course won't mark complete" bug). Re-sync from storage.
  if (typeof getActiveCourseNum === 'function' && n === getActiveCourseNum()
      && typeof window.ltResyncActiveCourseState === 'function') window.ltResyncActiveCourseState();
  return true;
}

function ltResetCourse(n) {
  localStorage.removeItem(_ltCourseStateKey(n));
  if (typeof window.ltSidebarInvalidate === 'function') window.ltSidebarInvalidate(n);
  // Same active-course sync as mark-complete: clear the engine's in-memory progress
  // too, so a later saveState() can't restore the just-cleared course.
  if (typeof getActiveCourseNum === 'function' && n === getActiveCourseNum()
      && typeof window.ltResyncActiveCourseState === 'function') window.ltResyncActiveCourseState();
}

/* Per-course state keys are owned by the engine's LT_COURSES registry
   (courseStateKey). Delegate when the engine is up; the literal fallback only
   exists for a settings call before the deferred engine parses. */
function _ltCourseStateKey(n) {
  return (typeof courseStateKey === 'function') ? courseStateKey(n) : 'lt_course' + n + '_state';
}

/* Reusable confirm dialog matching the settings .lt-confirm-* styles. */
function _ltConfirmDialog(title, msg, okLabel, tealOk, onOk) {
  var overlay = document.createElement('div');
  overlay.className = 'lt-confirm-overlay';
  overlay.innerHTML =
    '<div class="lt-confirm-box">' +
      '<div class="lt-confirm-title">' + title + '</div>' +
      '<div class="lt-confirm-msg">' + msg + '</div>' +
      '<div class="lt-confirm-actions">' +
        '<button class="lt-confirm-cancel">Cancel</button>' +
        '<button class="lt-confirm-ok' + (tealOk ? ' lt-confirm-ok--teal' : '') + '">' + okLabel + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  function close() { if (overlay.parentNode) document.body.removeChild(overlay); }
  overlay.querySelector('.lt-confirm-cancel').addEventListener('click', close);
  overlay.querySelector('.lt-confirm-ok').addEventListener('click', function() { close(); onOk(); });
  overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
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
      '  padding: 28px 24px 48px;',
      '  box-sizing: border-box;',
      '  font-family: "JetBrains Mono", ui-monospace, monospace;',
      '}',

      /* header */
      '.lt-settings-header {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 12px;',
      '  margin-bottom: 6px;',
      '}',

      '.lt-settings-title {',
      '  font-family: "JetBrains Mono", monospace;',
      '  font-size: 29px;',
      '  letter-spacing: -0.8px;',
      '  font-weight: 800;',
      '  color: var(--text);',
      '  margin: 0;',
      '  line-height: 1;',
      '}',

      '.lt-settings-subtitle {',
      '  font-size: 13px;',
      '  color: var(--text2);',
      '  margin: 0 0 22px 0;',
      '  padding-left: 2px;',
      '}',

      /* section */
      '.lt-settings-section {',
      '  background: var(--bg3);',
      '  border: 1px solid var(--border);',
      '  border-radius: var(--radius-lg);',
      '  margin-bottom: 14px;',
      '  overflow: hidden;',
      '}',

      '.lt-settings-section-label {',
      '  font-family: "JetBrains Mono", monospace;',
      '  font-size: 12.5px;',
      '  font-weight: 700;',
      '  letter-spacing: 0.3px;',
      '  color: var(--text3);',
      '  padding: 12px 18px 11px;',
      '  border-bottom: 1px solid var(--border);',
      '}',

      /* short note line under a section label (replaces verbose intro paragraphs) */
      '.lt-settings-note {',
      '  font-size: 11.5px;',
      '  color: var(--text3);',
      '  padding: 12px 18px 2px;',
      '}',

      /* row */
      '.lt-settings-row {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  padding: 14px 18px;',
      '  gap: 20px;',
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
      '  border-radius: var(--radius);',
      '  cursor: pointer;',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  color: var(--text2);',
      '  font-family: "JetBrains Mono", monospace;',
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
      '  padding: 7px 15px;',
      '  background: transparent;',
      '  border: 1.5px solid var(--border2);',
      '  border-radius: var(--radius);',
      '  color: #ff5f8f;',
      '  font-size: 12.5px;',
      '  font-weight: 600;',
      '  font-family: "JetBrains Mono", monospace;',
      '  cursor: pointer;',
      '  transition: background 0.15s, color 0.15s;',
      '}',

      '.lt-btn-danger:hover {',
      '  background: rgba(255,46,136,0.10);',
      '  border-color: rgba(255,46,136,0.55);',
      '}',

      '.lt-btn-secondary {',
      '  padding: 7px 15px;',
      '  background: transparent;',
      '  border: 1.5px solid var(--border2);',
      '  border-radius: var(--radius);',
      '  color: var(--text2);',
      '  font-size: 12.5px;',
      '  font-weight: 600;',
      '  font-family: "JetBrains Mono", monospace;',
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
      '  border-radius: var(--radius-lg);',
      '  padding: 28px 28px 22px;',
      '  max-width: 360px;',
      '  width: 90%;',
      '  box-sizing: border-box;',
      '  font-family: "JetBrains Mono", monospace;',
      '}',

      '.lt-confirm-title {',
      '  font-family: "JetBrains Mono", monospace;',
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
      '  border-radius: var(--radius);',
      '  color: var(--text2);',
      '  font-size: 13px;',
      '  font-family: "JetBrains Mono", monospace;',
      '  cursor: pointer;',
      '  transition: color 0.15s, border-color 0.15s;',
      '}',

      '.lt-confirm-cancel:hover {',
      '  color: var(--text);',
      '  border-color: var(--text2);',
      '}',

      '.lt-confirm-ok {',
      '  padding: 8px 18px;',
      '  background: var(--red);',
      '  border: 1px solid var(--red);',
      '  border-radius: var(--radius);',
      '  color: #fff;',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  font-family: "JetBrains Mono", monospace;',
      '  cursor: pointer;',
      '  transition: background 0.15s;',
      '}',

      '.lt-confirm-ok:hover {',
      '  background: var(--red2);',
      '}',

      /* teal outlined button */
      '.lt-btn-teal {',
      '  padding: 7px 15px;',
      '  background: transparent;',
      '  border: 1.5px solid var(--border2);',
      '  border-radius: var(--radius);',
      '  color: var(--text2);',
      '  font-size: 12.5px;',
      '  font-weight: 600;',
      '  font-family: "JetBrains Mono", monospace;',
      '  cursor: pointer;',
      '  transition: background 0.15s;',
      '}',

      '.lt-btn-teal:hover {',
      '  background: rgba(0,212,212,0.10);',
      '  border-color: var(--teal);',
      '  color: var(--teal);',
      '}',

      '.lt-confirm-ok--teal {',
      '  background: var(--teal);',
      '  border-color: var(--teal);',
      '  color: #000;',
      '}',

      '.lt-confirm-ok--teal:hover {',
      '  background: rgba(0,212,212,0.85);',
      '}',

      /* per-course action buttons */
      '.lt-course-actions {',
      '  display: flex;',
      '  gap: 8px;',
      '}',

      '.lt-btn-sm {',
      '  padding: 7px 13px;',
      '  font-size: 12px;',
      '}',

      '/* parent-brand line at the foot of settings */',
      '.lt-settings-brand {',
      '  display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;',
      '  margin-top: 22px; padding: 18px 10px 6px;',
      '  border-top: 1px solid var(--border);',
      '  font-size: 11.5px; color: var(--text3); text-align: center;',
      '}',
      '.lt-settings-brand strong { color: var(--text2); font-weight: 700; }',
      '.lt-settings-brand .vt-pink { color: var(--pink); }',
      '.lt-settings-brand .vt-flamingo { width: 16px; height: 16px; }',

      '/* Mobile: stack each row so labels never crush against their controls. */',
      '@media (max-width: 768px) {',
      '  .lt-settings-row { flex-direction: column; align-items: stretch; gap: 12px; }',
      '  .lt-settings-row-control { width: 100%; }',
      '  .lt-course-actions { width: 100%; }',
      '  .lt-course-actions > * { flex: 1 1 0; }',
      '  .lt-font-opts, .lt-color-toggle { width: 100%; }',
      '  .lt-font-opts > *, .lt-color-toggle > * { flex: 1 1 0; }',
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
  var savedColor = LTStore.get('bullishColor') || '#00d4d4';
  var savedBear  = LTStore.get('bearishColor') || '#ff2e88';
  var savedTheme = LTStore.get('theme') || 'dark';
  var savedFont  = LTStore.get('font') || 'default';
  var savedCap   = LTStore.get('captionSize') || 'md';
  var narrOn     = LTStore.get('narration') !== '0';   // narration default on

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

  /* ── per-course progress rows (only courses that have chapters loaded) ──── */
  var courseRowsHtml = '';
  [1, 2, 3, 4].forEach(function(n) {
    if (!_ltCourseChapters(n).length) return;
    var name = LT_COURSE_NAMES[n - 1] || ('Course ' + n);
    var accent = (typeof ltCourseAccent === 'function')
      ? ltCourseAccent(n)
      : ({ 1: '#00d4d4', 2: '#e0b020', 3: '#a855f7', 4: '#f87171' }[n] || 'inherit');
    courseRowsHtml +=
      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label"><span style="color:' + accent + '">Course ' + n + '</span> · ' + name + '</div>' +
        '</div>' +
        '<div class="lt-settings-row-control lt-course-actions">' +
          '<button class="lt-btn-teal lt-btn-sm" data-course="' + n + '" data-action="complete">Mark Complete</button>' +
          '<button class="lt-btn-danger lt-btn-sm" data-course="' + n + '" data-action="reset">Reset</button>' +
        '</div>' +
      '</div>';
  });

  wrap.innerHTML =

    /* ── back button ── */
    '<button onclick="typeof init===\'function\' ? init() : history.back()" style="display:inline-flex;align-items:center;gap:6px;background:transparent;border:none;color:var(--teal);font-family:\'JetBrains Mono\',sans-serif;font-size:13px;font-weight:600;cursor:pointer;padding:0 0 18px 0;">' +
      '<i data-lucide="arrow-left" style="width:16px;height:16px;"></i>' +
      'Back to Course' +
    '</button>' +

    /* ── header ── */
    '<div class="lt-settings-header">' +
      '<h1 class="lt-settings-title">Settings</h1>' +
    '</div>' +
    '<p class="lt-settings-subtitle">Customize your learning experience</p>' +

    /* ══ APPEARANCE — theme, font, candle colours ══ */
    '<div class="lt-settings-section" id="lt-s-appearance">' +
      '<div class="lt-settings-section-label">Appearance</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Theme</div>' +
          '<div class="lt-settings-row-desc">Dark or light mode</div>' +
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
          '<div class="lt-settings-row-desc">Site-wide typeface</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<div class="lt-font-opts">' +
            '<button class="lt-font-btn' + (savedFont === 'default'  ? ' active' : '') + '" data-font="default" style="font-family:\'JetBrains Mono\',monospace;">Terminal</button>' +
            '<button class="lt-font-btn' + (savedFont === 'inter'    ? ' active' : '') + '" data-font="inter" style="font-family:\'Inter\',sans-serif;">Inter</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Lesson Caption Size</div>' +
          '<div class="lt-settings-row-desc">Subtitle text in animated lessons · phones always use Small</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<div class="lt-font-opts" id="lt-capsize-toggle">' +
            '<button class="lt-font-btn' + (savedCap === 'sm' ? ' active' : '') + '" data-cap="sm">Small</button>' +
            '<button class="lt-font-btn' + (savedCap === 'md' ? ' active' : '') + '" data-cap="md">Medium</button>' +
            '<button class="lt-font-btn' + (savedCap === 'lg' ? ' active' : '') + '" data-cap="lg">Large</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Lesson Narration</div>' +
          '<div class="lt-settings-row-desc">Read each lesson aloud as it plays (press Play in a lesson)</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<div class="lt-font-opts" id="lt-narration-toggle">' +
            '<button class="lt-font-btn' + (narrOn ? ' active' : '') + '" data-narr="on">On</button>' +
            '<button class="lt-font-btn' + (!narrOn ? ' active' : '') + '" data-narr="off">Off</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Bullish Candle Color</div>' +
          '<div class="lt-settings-row-desc">Up candles on every chart</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<div class="lt-color-toggle" id="lt-color-toggle">' +
            '<button class="lt-color-btn' + (savedColor === '#00d4d4' ? ' active' : '') + '" data-color="#00d4d4" id="lt-color-cyan">' + candleSvg('#00d4d4') + 'Cyan</button>' +
            '<button class="lt-color-btn' + (savedColor === '#00c878' ? ' active' : '') + '" data-color="#00c878" id="lt-color-green">' + candleSvg('#00c878') + 'Green</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Bearish Candle Color</div>' +
          '<div class="lt-settings-row-desc">Down candles on every chart</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<div class="lt-color-toggle" id="lt-bear-toggle">' +
            '<button class="lt-color-btn' + (savedBear === '#ff2e88' ? ' active' : '') + '" data-color="#ff2e88" id="lt-bear-pink">' + candleSvg('#ff2e88') + 'Pink</button>' +
            '<button class="lt-color-btn' + (savedBear === '#f2f2f2' ? ' active' : '') + '" data-color="#f2f2f2" id="lt-bear-white">' + candleSvg('#f2f2f2') + 'White</button>' +
            '<button class="lt-color-btn' + (savedBear === '#cc2222' ? ' active' : '') + '" data-color="#cc2222" id="lt-bear-red">' + candleSvg('#cc2222') + 'Red</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ══ PROGRESS — per-course + all (browser-local) ══ */
    '<div class="lt-settings-section" id="lt-s-progress">' +
      '<div class="lt-settings-section-label">Progress</div>' +
      '<div class="lt-settings-note">Saved in this browser only.</div>' +
      courseRowsHtml +
      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">All Courses</div>' +
        '</div>' +
        '<div class="lt-settings-row-control lt-course-actions">' +
          '<button class="lt-btn-teal lt-btn-sm" id="lt-markall-btn">Mark All Complete</button>' +
          '<button class="lt-btn-danger lt-btn-sm" id="lt-resetall-btn">Reset All</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ══ SYNC & BACKUP — move / keep / share your progress ══ */
    '<div class="lt-settings-section" id="lt-s-data">' +
      '<div class="lt-settings-section-label">Sync &amp; Backup</div>' +
      '<div class="lt-settings-note">Progress saves automatically in this browser — nothing is uploaded.</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Sync to Another Device</div>' +
          '<div class="lt-settings-row-desc">QR code &amp; link to copy your progress to your phone or another browser</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<button class="lt-btn-secondary" id="lt-sync-btn">Create Sync Link</button>' +
        '</div>' +
      '</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Export Backup</div>' +
          '<div class="lt-settings-row-desc">Download a backup file of your progress and settings</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<button class="lt-btn-secondary" id="lt-export-btn">Export</button>' +
        '</div>' +
      '</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Import Backup</div>' +
          '<div class="lt-settings-row-desc">Restore from a backup file (replaces current progress)</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<button class="lt-btn-secondary" id="lt-import-btn">Import</button>' +
          '<input type="file" id="lt-import-file" accept="application/json,.json" style="display:none;">' +
        '</div>' +
      '</div>' +

      '<div class="lt-settings-row">' +
        '<div class="lt-settings-row-info">' +
          '<div class="lt-settings-row-label">Share Liquidity Theory</div>' +
          '<div class="lt-settings-row-desc">Copy a link to the site. Per-lesson / per-course share lives on the lesson header &amp; course cards.</div>' +
        '</div>' +
        '<div class="lt-settings-row-control">' +
          '<button class="lt-btn-secondary" id="lt-share-site-btn">Copy Link</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="lt-settings-brand">' +
      '<span class="vt-flamingo" role="img" aria-label="Vice Terminal"></span>' +
      '<span>A <strong class="vt-pink">Vice Terminal</strong> product</span>' +
    '</div>';

  container.appendChild(wrap);

  /* ── wire up Lucide icons ─────────────────────────────────────────────── */
  if (typeof lucide !== 'undefined') lucide.createIcons();

  /* ── CONTROL: bullish color toggle ───────────────────────────────────── */
  var colorBtns = wrap.querySelector('#lt-color-toggle').querySelectorAll('.lt-color-btn');
  colorBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var color = btn.getAttribute('data-color');

      /* update active state */
      colorBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');

      /* apply + persist */
      document.documentElement.style.setProperty('--teal', color);
      LTStore.set('bullishColor', color);

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

  /* ── CONTROL: bearish color toggle ───────────────────────────────────── */
  var bearBtns = wrap.querySelector('#lt-bear-toggle').querySelectorAll('.lt-color-btn');
  bearBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var color = btn.getAttribute('data-color');

      /* update active state (scoped to the bearish toggle) */
      bearBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');

      /* persist + sync engine BEAR + the --bear var (glossary/chart down-candles) + re-render */
      LTStore.set('bearishColor', color);
      if (typeof window.BEAR !== 'undefined') window.BEAR = color;
      var bcol = color;
      if (document.documentElement.classList.contains('theme-light') && /^#(f2f2f2|fff|ffffff)$/i.test(bcol)) bcol = '#334155';
      document.documentElement.style.setProperty('--bear', bcol);
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
    LTStore.set('theme', isLight ? 'light' : 'dark');  // write first so theme-aware getters read it
    ltApplySavedSettings();                                        // full palette + accent + font
    themeLabel.textContent = isLight ? 'Light' : 'Dark';
    // Re-render the surfaces that bake accent/candle colours at render time.
    if (typeof applyCourseAccent === 'function') applyCourseAccent();
    if (typeof buildSidebar === 'function') buildSidebar();
    if (typeof ltRefreshCharts === 'function') ltRefreshCharts();
  });

  /* ── CONTROL: font selector (Terminal · Inter) ───────────────────────── */
  var fontBtns = wrap.querySelectorAll('.lt-font-btn[data-font]');
  fontBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var f = btn.getAttribute('data-font');
      ltApplyFont(f);
      fontBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      LTStore.set('font', f);
    });
  });

  /* ── CONTROL: lesson caption size (Small · Medium · Large) ────────────── */
  var capBtns = wrap.querySelectorAll('.lt-font-btn[data-cap]');
  capBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var sz = btn.getAttribute('data-cap');
      capBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      LTStore.set('captionSize', sz);
      ltApplyCaptionSize(sz);   // live-apply to an open lesson
    });
  });

  /* ── CONTROL: lesson narration on/off (takes effect on the next lesson mount) ── */
  var narrBtns = wrap.querySelectorAll('.lt-font-btn[data-narr]');
  narrBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var on = btn.getAttribute('data-narr') === 'on';
      narrBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      LTStore.set('narration', on ? '1' : '0');
    });
  });

  /* ── CONTROL: share whole site ────────────────────────────────────────── */
  var shareSiteBtn = wrap.querySelector('#lt-share-site-btn');
  if (shareSiteBtn) shareSiteBtn.addEventListener('click', function() {
    if (typeof window.ltShareSite === 'function') window.ltShareSite();
  });

  /* ── CONTROL: sync to another device (QR + link) ──────────────────────── */
  var syncBtn = wrap.querySelector('#lt-sync-btn');
  if (syncBtn) syncBtn.addEventListener('click', ltOpenSyncModal);

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

  /* ── CONTROL: per-course mark-complete / reset ────────────────────────── */
  wrap.querySelectorAll('[data-course][data-action]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var n    = parseInt(btn.getAttribute('data-course'), 10);
      var name = LT_COURSE_NAMES[n - 1] || ('Course ' + n);
      if (btn.getAttribute('data-action') === 'complete') {
        _ltConfirmDialog('Mark Course ' + n + ' Complete',
          'Mark every session in Course ' + n + ' (' + name + ') as complete?',
          'Yes, Mark Complete', true, function() {
            ltMarkCourseComplete(n);
            if (typeof showToast === 'function') showToast('Course ' + n + ' marked complete', 3000, 'check-circle');
            setTimeout(function() { location.reload(); }, 700);
          });
      } else {
        _ltConfirmDialog('Reset Course ' + n,
          'Clear all saved progress for Course ' + n + ' (' + name + ')? This cannot be undone.',
          'Yes, Reset', false, function() {
            ltResetCourse(n);
            if (typeof showToast === 'function') showToast('Course ' + n + ' progress reset', 3000, 'rotate-ccw');
            setTimeout(function() { location.reload(); }, 700);
          });
      }
    });
  });

  /* ── CONTROL: mark ALL courses complete ───────────────────────────────── */
  var markAllBtn = wrap.querySelector('#lt-markall-btn');
  if (markAllBtn) markAllBtn.addEventListener('click', function() {
    _ltConfirmDialog('Mark All Complete',
      'Mark all chapters in all four courses as complete?',
      'Yes, Mark All', true, function() {
        [1, 2, 3, 4].forEach(function(n) { ltMarkCourseComplete(n); });
        if (typeof showToast === 'function') showToast('All chapters marked complete', 3000, 'check-circle');
        setTimeout(function() { location.reload(); }, 800);
      });
  });

  /* ── CONTROL: reset ALL progress (keeps appearance/display preferences) ── */
  var resetAllBtn = wrap.querySelector('#lt-resetall-btn');
  if (resetAllBtn) resetAllBtn.addEventListener('click', function() {
    _ltConfirmDialog('Reset All Progress',
      'Clear all progress across all courses? This cannot be undone.',
      'Yes, Reset All', false, function() {
        var keep = ['lt_theme', 'lt_font', 'lt_caption_size', 'lt_narration', 'lt_lesson_speed', 'lt_lesson_volume', 'lt_bullish_color', 'lt_bearish_color', 'lt_sidebar_collapsed'];
        Object.keys(localStorage)
          .filter(function(k) { return k.indexOf('lt_') === 0 && keep.indexOf(k) === -1; })
          .forEach(function(k) { localStorage.removeItem(k); });
        if (typeof showToast === 'function') showToast('Progress reset', 3000, 'rotate-ccw');
        setTimeout(function() { location.reload(); }, 800);
      });
  });
}
