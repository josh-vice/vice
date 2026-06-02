'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Flashcards
   lt-flashcards.js  |  Per-course term/definition drill before the final exam.
   Pulls the glossary terms that are referenced in the active course only.
   Public: renderFlashcards(containerId, courseNum, courseName)
   ═══════════════════════════════════════════════════════════════════════════ */

let _fc = null;   // active session state

function _fcEscape(s) { return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

// A term belongs to the FIRST course that introduces it, so each course's deck
// is distinct (foundational terms appear in many courses, but only count once —
// in the earliest course — instead of being repeated in every deck).
function _fcBuildDeck(courseNum) {
  if (typeof LT_GLOSSARY === 'undefined' || typeof glFindReferences !== 'function') return [];
  return LT_GLOSSARY.filter(e => {
    const refs = glFindReferences(e);
    if (!refs.length) return false;
    const home = Math.min.apply(null, refs.map(r => r.courseNum));
    return home === courseNum;
  });
}

function _fcCourses() {
  const list = [{ num: 1, label: 'Laying the Foundation' }];
  if (typeof LT_CHAPTERS_2 !== 'undefined') list.push({ num: 2, label: 'Building Your Toolbox' });
  if (typeof LT_CHAPTERS_3 !== 'undefined') list.push({ num: 3, label: 'Sharpening Your Edge' });
  if (typeof LT_CHAPTERS_4 !== 'undefined') list.push({ num: 4, label: 'Liquidity Theory' });
  return list;
}
function _fcCourseName(num) {
  const c = _fcCourses().find(c => c.num === num);
  return 'Course ' + num + (c ? ' — ' + c.label : '');
}
// Course accent palette — matches the sidebar course colours.
const _FC_ACCENT = { 1: '#00d4d4', 2: '#e0b020', 3: '#a855f7', 4: '#cc2222' };

function _fcShuffleArr(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

/* ── STYLES ───────────────────────────────────────────────────────────────── */
function _fcStyles() {
  if (document.getElementById('lt-flashcards-styles')) return;
  const s = document.createElement('style');
  s.id = 'lt-flashcards-styles';
  s.textContent = `
  .fc-wrap { width:100%; max-width:760px; margin:0 auto; padding:0 0 48px; }
  .fc-back-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0 6px; flex-wrap:wrap; gap:10px; }
  .fc-back-btn { display:inline-flex; align-items:center; gap:6px; background:none; border:none; color:var(--teal); font-family:'Barlow',sans-serif; font-size:13px; font-weight:600; cursor:pointer; padding:0; }
  .fc-back-btn:hover { opacity:.8; }
  .fc-title { font-family:'Barlow Condensed',sans-serif; font-size:28px; font-weight:800; color:var(--text); }
  .fc-sub { font-size:12px; color:var(--text3); margin-top:2px; }

  .fc-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:14px 0 16px; flex-wrap:wrap; }
  .fc-mode { display:inline-flex; background:var(--bg4); border:1px solid var(--border2); border-radius:9px; padding:3px; }
  .fc-mode-btn { padding:5px 12px; border:none; background:none; color:var(--text3); font-size:12px; font-weight:700; cursor:pointer; font-family:'Barlow',sans-serif; border-radius:6px; transition:all .12s; white-space:nowrap; }
  .fc-mode-btn.active { background:var(--teal-dim); color:var(--teal); }
  .fc-shuffle { display:inline-flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--border2); color:var(--text3); font-size:12px; font-weight:600; cursor:pointer; padding:6px 12px; border-radius:9px; font-family:'Barlow',sans-serif; transition:all .12s; }
  .fc-shuffle:hover { border-color:var(--teal); color:var(--teal); }

  .fc-progress-row { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
  .fc-progress-track { flex:1; height:5px; background:var(--bg4); border-radius:3px; overflow:hidden; }
  .fc-progress-fill { height:100%; background:var(--teal); border-radius:3px; transition:width .25s ease; }
  .fc-progress-text { font-size:11px; font-weight:700; color:var(--text3); font-variant-numeric:tabular-nums; white-space:nowrap; }
  .fc-tally { display:flex; gap:12px; font-size:11px; font-weight:700; }
  .fc-tally .ok { color:#00c878; } .fc-tally .no { color:#cc2222; }

  /* course selector */
  .fc-courses { display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; }
  .fc-course-tab { padding:6px 14px; border:1px solid var(--border2); background:var(--bg3); color:var(--text3); font-size:12px; font-weight:700; border-radius:9px; cursor:pointer; font-family:'Barlow',sans-serif; transition:all .12s; }
  .fc-course-tab:hover { border-color:var(--c,var(--teal)); color:var(--c,var(--teal)); }
  .fc-course-tab.active { background:color-mix(in srgb, var(--c,#00d4d4) 16%, transparent); border-color:var(--c,#00d4d4); color:var(--c,#00d4d4); }

  /* flip card — snappy 3D flip + quick deal-in when the card changes */
  .fc-card { perspective:1400px; cursor:pointer; margin-bottom:16px; animation:fcDeal .26s ease; }
  @keyframes fcDeal { from{opacity:0; transform:translateX(16px);} to{opacity:1; transform:translateX(0);} }
  .fc-card-inner { position:relative; width:100%; min-height:260px; transition:transform .34s cubic-bezier(.2,.75,.25,1); transform-style:preserve-3d; }
  .fc-card.flipped .fc-card-inner { transform:rotateX(180deg); }
  .fc-face { position:absolute; inset:0; backface-visibility:hidden; -webkit-backface-visibility:hidden;
    display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;
    background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); padding:34px 30px; }
  .fc-face.back { transform:rotateX(180deg); background:linear-gradient(160deg, var(--bg3), var(--bg2)); }
  .fc-eyebrow { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:var(--text3); margin-bottom:14px; }
  .fc-cat { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:var(--teal); background:var(--teal-faint,rgba(0,212,212,.1)); border:1px solid rgba(0,212,212,.25); padding:2px 9px; border-radius:10px; margin-bottom:14px; }
  .fc-term { font-family:'Barlow Condensed',sans-serif; font-size:34px; font-weight:800; color:var(--text); line-height:1.1; }
  .fc-def { font-size:15px; color:var(--text2); line-height:1.7; max-width:560px; }
  .fc-term-sm { font-size:13px; font-weight:800; color:var(--teal); margin-bottom:10px; }
  .fc-flip-hint { position:absolute; bottom:12px; left:0; right:0; text-align:center; font-size:10.5px; color:var(--text3); opacity:.75; }
  .fc-figure { margin-top:14px; width:150px; }
  .fc-figure svg { width:100%; height:auto; display:block; background:#0f0f0f; border:1px solid var(--border); border-radius:var(--radius-sm); }

  /* grade buttons */
  .fc-grade { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .fc-grade-btn { padding:13px; border-radius:var(--radius); border:1px solid; font-family:'Barlow',sans-serif; font-size:14px; font-weight:800; cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center; gap:7px; }
  .fc-grade-miss { background:rgba(204,34,34,.1); border-color:rgba(204,34,34,.4); color:#ff6a6a; }
  .fc-grade-miss:hover { background:rgba(204,34,34,.2); }
  .fc-grade-got { background:rgba(0,200,120,.1); border-color:rgba(0,200,120,.4); color:#2ee59d; }
  .fc-grade-got:hover { background:rgba(0,200,120,.2); }
  .fc-reveal-hint { text-align:center; font-size:12px; color:var(--text3); padding:6px; }

  /* results */
  .fc-results { text-align:center; background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); padding:36px 28px; }
  .fc-results-score { font-family:'Barlow Condensed',sans-serif; font-size:56px; font-weight:800; line-height:1; }
  .fc-results-score.good { color:#00c878; } .fc-results-score.mid { color:#e0b020; } .fc-results-score.low { color:#cc2222; }
  .fc-results-sub { font-size:14px; color:var(--text2); margin:8px 0 4px; }
  .fc-results-line { font-size:12px; color:var(--text3); margin-bottom:22px; }
  .fc-results-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
  .fc-btn { display:inline-flex; align-items:center; gap:7px; padding:11px 20px; border-radius:var(--radius); font-family:'Barlow',sans-serif; font-size:13px; font-weight:700; cursor:pointer; transition:all .15s; border:1px solid var(--border2); background:var(--bg4); color:var(--text2); }
  .fc-btn:hover { border-color:var(--teal); color:var(--teal); }
  .fc-btn.primary { background:var(--teal); border-color:var(--teal); color:#04201f; }
  .fc-btn.primary:hover { filter:brightness(1.08); color:#04201f; }

  .fc-empty { text-align:center; padding:50px 20px; color:var(--text3); }
  @media(max-width:600px){ .fc-term{font-size:28px;} .fc-card-inner{min-height:240px;} }
  `;
  document.head.appendChild(s);
}

/* ── RENDER ───────────────────────────────────────────────────────────────── */
function renderFlashcards(containerId, courseNum, courseName) {
  _fcStyles();
  const container = document.getElementById(containerId);
  if (!container) return;

  // (re)build the session if it's a different course or first run
  if (!_fc || _fc.courseNum !== courseNum) {
    const deck = _fcBuildDeck(courseNum);
    _fc = { courseNum, courseName: _fcCourseName(courseNum), mode: 'term', deck, order: deck.slice(),
            idx: 0, flipped: false, correct: 0, wrong: 0, missed: [], done: false };
  }
  _fcRender();
}

function _fcRender() {
  const container = document.getElementById('content-area');
  if (!container) return;
  const total = _fc.order.length;

  const head = `
    <div class="fc-back-row">
      <button class="fc-back-btn" onclick="typeof init==='function'&&init(false)">
        <i data-lucide="arrow-left" style="width:15px;height:15px;"></i> Back to Course
      </button>
      <div>
        <div class="fc-title">Flashcards</div>
        <div class="fc-sub">${_fcEscape(_fc.courseName)} · ${total} term${total === 1 ? '' : 's'}</div>
      </div>
    </div>`;

  if (!total) {
    container.innerHTML = `<div class="fc-wrap">${head}<div class="fc-empty">No glossary terms are linked to this course yet.</div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  if (_fc.done) { container.innerHTML = `<div class="fc-wrap">${head}${_fcResultsHtml()}</div>`; if (typeof lucide !== 'undefined') lucide.createIcons(); return; }

  const entry = _fc.order[_fc.idx];
  const cat = _fcEscape(entry.cat);
  const term = _fcEscape(entry.term);
  const def = _fcEscape(entry.def);
  const fig = (typeof _glFigure === 'function') ? _glFigure(entry.id) : '';
  const figBlock = fig ? `<div class="fc-figure">${fig}</div>` : '';

  // front/back depend on mode
  let front, back;
  // The illustration always travels with the DEFINITION (its labels never name
  // the term, so it's safe to show as the prompt in Definition → Term mode).
  if (_fc.mode === 'term') {
    front = `<div class="fc-eyebrow">Term</div><div class="fc-term">${term}</div><div class="fc-flip-hint">click to reveal the definition</div>`;
    back  = `<span class="fc-cat">${cat}</span><div class="fc-def">${def}</div>${figBlock}`;
  } else {
    front = `<div class="fc-eyebrow">Definition</div><div class="fc-def">${def}</div>${figBlock}<div class="fc-flip-hint">click to reveal the term</div>`;
    back  = `<span class="fc-cat">${cat}</span><div class="fc-term">${term}</div>`;
  }

  const pct = Math.round((_fc.idx / total) * 100);
  const courses = _fcCourses();
  const courseTabs = courses.length > 1
    ? `<div class="fc-courses">${courses.map(c => `<button class="fc-course-tab ${c.num === _fc.courseNum ? 'active' : ''}" style="--c:${_FC_ACCENT[c.num] || '#00d4d4'}" onclick="_fcSetCourse(${c.num})" title="${_fcEscape(c.label)}">Course ${c.num}</button>`).join('')}</div>`
    : '';

  container.innerHTML = `
    <div class="fc-wrap">
      ${head}
      ${courseTabs}
      <div class="fc-toolbar">
        <div class="fc-mode">
          <button class="fc-mode-btn ${_fc.mode === 'term' ? 'active' : ''}" onclick="_fcSetMode('term')">Term → Definition</button>
          <button class="fc-mode-btn ${_fc.mode === 'def' ? 'active' : ''}" onclick="_fcSetMode('def')">Definition → Term</button>
        </div>
        <button class="fc-shuffle" onclick="_fcShuffle()"><i data-lucide="shuffle" style="width:13px;height:13px;"></i> Shuffle</button>
      </div>

      <div class="fc-progress-row">
        <div class="fc-progress-track"><div class="fc-progress-fill" style="width:${pct}%"></div></div>
        <span class="fc-progress-text">${_fc.idx + 1} / ${total}</span>
        <div class="fc-tally"><span class="ok">✓ ${_fc.correct}</span><span class="no">✗ ${_fc.wrong}</span></div>
      </div>

      <div class="fc-card ${_fc.flipped ? 'flipped' : ''}" id="fc-card" onclick="_fcFlip()">
        <div class="fc-card-inner">
          <div class="fc-face front">${front}</div>
          <div class="fc-face back">${back}</div>
        </div>
      </div>

      <div id="fc-action">${_fcActionHtml()}</div>
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function _fcActionHtml() {
  return _fc.flipped
    ? `<div class="fc-grade">
         <button class="fc-grade-btn fc-grade-miss" onclick="_fcGrade(false)"><i data-lucide="x" style="width:15px;height:15px;"></i> Missed it</button>
         <button class="fc-grade-btn fc-grade-got" onclick="_fcGrade(true)"><i data-lucide="check" style="width:15px;height:15px;"></i> Got it</button>
       </div>`
    : `<div class="fc-reveal-hint">Tap the card to flip it over</div>`;
}

function _fcResultsHtml() {
  const total = _fc.correct + _fc.wrong || _fc.order.length;
  const pct = total ? Math.round((_fc.correct / total) * 100) : 0;
  const cls = pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low';
  const msg = pct >= 80 ? 'Sharp — you know this course cold.' : pct >= 50 ? 'Solid. Review the misses and run it again.' : 'Worth another pass before the exam.';
  const hasMissed = _fc.missed.length > 0;
  // When you missed some, reviewing the incorrect ones is the primary next step.
  const reviewBtn = hasMissed
    ? `<button class="fc-btn primary" onclick="_fcReviewMissed()"><i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> Review ${_fc.missed.length} incorrect</button>`
    : '';
  const restartBtn = `<button class="fc-btn ${hasMissed ? '' : 'primary'}" onclick="_fcRestart()">Restart deck</button>`;
  return `
    <div class="fc-results">
      <div class="fc-results-score ${cls}">${pct}%</div>
      <div class="fc-results-sub">${_fc.correct} of ${total} correct</div>
      <div class="fc-results-line">${msg}</div>
      <div class="fc-results-actions">
        ${reviewBtn}
        ${restartBtn}
      </div>
    </div>`;
}

/* ── INTERACTIONS ─────────────────────────────────────────────────────────── */
// Flip by toggling the class on the live element so the 3D transition animates
// (a full re-render would snap instantly with no animation).
window._fcFlip = function() {
  if (!_fc || _fc.done) return;
  _fc.flipped = !_fc.flipped;
  const card = document.getElementById('fc-card');
  if (card) card.classList.toggle('flipped', _fc.flipped);
  const act = document.getElementById('fc-action');
  if (act) { act.innerHTML = _fcActionHtml(); if (typeof lucide !== 'undefined') lucide.createIcons(); }
};

window._fcSetCourse = function(n) {
  if (!_fc || n === _fc.courseNum) return;
  const deck = _fcBuildDeck(n);
  _fc = { courseNum: n, courseName: _fcCourseName(n), mode: _fc.mode, deck, order: deck.slice(),
          idx: 0, flipped: false, correct: 0, wrong: 0, missed: [], done: false };
  _fcRender();
};

window._fcGrade = function(ok) {
  if (!_fc || !_fc.flipped) return;
  const entry = _fc.order[_fc.idx];
  if (ok) _fc.correct++; else { _fc.wrong++; if (!_fc.missed.find(m => m.id === entry.id)) _fc.missed.push(entry); }
  _fc.flipped = false;
  if (_fc.idx + 1 >= _fc.order.length) { _fc.done = true; }
  else { _fc.idx++; }
  _fcRender();
};

window._fcSetMode = function(m) { if (!_fc) return; _fc.mode = m; _fc.flipped = false; _fcRender(); };

window._fcShuffle = function() {
  if (!_fc) return;
  _fc.order = _fcShuffleArr(_fc.order);
  _fc.idx = 0; _fc.flipped = false; _fc.correct = 0; _fc.wrong = 0; _fc.missed = []; _fc.done = false;
  _fcRender();
};

window._fcRestart = function() {
  if (!_fc) return;
  _fc.order = _fc.deck.slice();
  _fc.idx = 0; _fc.flipped = false; _fc.correct = 0; _fc.wrong = 0; _fc.missed = []; _fc.done = false;
  _fcRender();
};

window._fcReviewMissed = function() {
  if (!_fc || !_fc.missed.length) return;
  _fc.order = _fc.missed.slice();
  _fc.idx = 0; _fc.flipped = false; _fc.correct = 0; _fc.wrong = 0; _fc.missed = []; _fc.done = false;
  _fcRender();
};

window.renderFlashcards = renderFlashcards;
