'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Flashcards
   lt-flashcards.js  |  Per-course term/definition drill.
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
// Course accent — single source of truth is ltCourseAccent() in the engine (it is
// theme-aware: returns the light-mode variants on a white theme). The map below is
// only a standalone fallback and mirrors LT_COURSE_ACCENTS.
const _FC_ACCENT = { 1: '#00d4d4', 2: '#ff7a4d', 3: '#a855f7', 4: '#ff2e88' };
function _fcAccent(n) { return (typeof ltCourseAccent === 'function') ? ltCourseAccent(n) : (_FC_ACCENT[n] || '#00d4d4'); }

function _fcShuffleArr(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

/* ── STYLES ───────────────────────────────────────────────────────────────── */
function _fcStyles() {
  LTUtils.injectStyles('lt-flashcards-styles', `
  .fc-wrap { width:100%; max-width:760px; margin:0 auto; padding:0 0 24px; display:flex; flex-direction:column; flex:1 0 auto; }
  /* Study stage — anchored directly under the control deck. Centering it in the
     leftover viewport height sank the card toward the fold on tall screens (the
     "card sits too low" complaint); top-anchoring keeps card + grade buttons high. */
  .fc-stage { display:flex; flex-direction:column; justify-content:flex-start; gap:16px; padding:8px 0 16px; }
  /* Plain header (not sticky), left-aligned. */
  .fc-head { margin:0 0 14px; }
  .fc-back-btn { display:inline-flex; align-items:center; gap:6px; background:none; border:none; color:var(--teal); font-family:'Geist Mono',monospace; font-size:13px; font-weight:600; cursor:pointer; padding:0; margin-bottom:12px; }
  .fc-back-btn:hover { opacity:.8; }
  .fc-title { font-family:'Geist Mono',monospace; font-size:21px; letter-spacing:-0.5px; font-weight:800; color:var(--text); line-height:1.15; }
  .fc-sub { font-size:12px; color:var(--text3); margin-top:4px; }

  .fc-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:14px 0 14px; flex-wrap:wrap; }
  .fc-mode { display:inline-flex; background:var(--bg4); border:1px solid var(--border2); border-radius:9px; padding:3px; }
  .fc-mode-btn { padding:5px 12px; border:none; background:none; color:var(--text3); font-size:12px; font-weight:700; cursor:pointer; font-family:'Geist Mono',monospace; border-radius:6px; transition:all .12s; white-space:nowrap; }
  .fc-mode-btn.active { background:color-mix(in srgb, var(--fc-accent,var(--teal)) 15%, transparent); color:var(--fc-accent,var(--teal)); }
  .fc-shuffle { display:inline-flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--border2); color:var(--text3); font-size:12px; font-weight:600; cursor:pointer; padding:6px 12px; border-radius:9px; font-family:'Geist Mono',monospace; transition:all .12s; }
  .fc-shuffle:hover { border-color:var(--fc-accent,var(--teal)); color:var(--fc-accent,var(--teal)); }

  .fc-progress-row { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
  .fc-progress-track { flex:1; height:5px; background:var(--bg4); border-radius:3px; overflow:hidden; }
  .fc-progress-fill { height:100%; background:var(--fc-accent,var(--teal)); border-radius:3px; transition:width .25s ease; }
  .fc-progress-text { font-size:11px; font-weight:700; color:var(--text3); font-variant-numeric:tabular-nums; white-space:nowrap; }
  .fc-tally { display:flex; gap:12px; font-size:11px; font-weight:700; }
  .fc-tally .ok, .fc-tally .no { display:inline-flex; align-items:center; gap:4px; }
  .fc-tally .ok { color:#00c878; } .fc-tally .no { color:#cc2222; }

  /* course selector */
  .fc-courses { display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap; }
  .fc-course-tab { padding:6px 14px; border:1px solid var(--border2); background:var(--bg3); color:var(--text3); font-size:12px; font-weight:700; border-radius:9px; cursor:pointer; font-family:'Geist Mono',monospace; transition:all .12s; }
  .fc-course-tab:hover { border-color:var(--c,var(--teal)); color:var(--c,var(--teal)); }
  .fc-course-tab.active { background:color-mix(in srgb, var(--c,#00d4d4) 16%, transparent); border-color:var(--c,#00d4d4); color:var(--c,#00d4d4); }

  /* flip card — snappy 3D flip + quick deal-in when the card changes */
  .fc-card { perspective:1400px; cursor:pointer; margin-bottom:0; animation:fcDeal .26s ease; }
  @keyframes fcDeal { from{opacity:0; transform:translateX(16px);} to{opacity:1; transform:translateX(0);} }
  /* Grid-stack the two faces in one cell so the card auto-sizes to its TALLER
     face — absolutely-positioned faces made long definitions overflow the fixed
     min-height on narrow screens (text spilling past the border, glossary link
     colliding with the grade buttons). min-height stays as a floor only. */
  .fc-card-inner { display:grid; width:100%; min-height:300px; transition:transform .34s cubic-bezier(.2,.75,.25,1); transform-style:preserve-3d; }
  .fc-card.flipped .fc-card-inner { transform:rotateY(180deg); }
  .fc-face { grid-area:1/1; position:relative; backface-visibility:hidden; -webkit-backface-visibility:hidden;
    display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;
    background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); padding:34px 30px;
    box-shadow:0 24px 60px -30px rgba(0,0,0,.75), 0 0 0 1px color-mix(in srgb, var(--fc-accent,var(--teal)) 8%, transparent); }
  .fc-face.back { transform:rotateY(180deg); background:linear-gradient(160deg, var(--bg3), var(--bg2)); }
  .fc-eyebrow { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:var(--text3); margin-bottom:14px; }
  .fc-cat { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:var(--fc-accent,var(--teal)); background:color-mix(in srgb, var(--fc-accent,var(--teal)) 12%, transparent); border:1px solid color-mix(in srgb, var(--fc-accent,var(--teal)) 30%, transparent); padding:2px 9px; border-radius:10px; margin-bottom:14px; }
  .fc-term { font-family:'Geist Mono',monospace; font-size:25px; letter-spacing:-0.5px; font-weight:800; color:var(--text); line-height:1.1; }
  .fc-def { font-size:15px; color:var(--text2); line-height:1.7; max-width:560px; }
  .fc-term-sm { font-size:13px; font-weight:800; color:var(--fc-accent,var(--teal)); margin-bottom:10px; }
  .fc-flip-hint { position:absolute; bottom:12px; left:0; right:0; text-align:center; font-size:10.5px; color:var(--text3); opacity:.75; }
  /* Glossary deep-link on the answer face */
  .fc-gloss-link { display:inline-flex; align-items:center; gap:6px; margin-top:18px; background:transparent; border:1px solid var(--border2); color:var(--text3); font-family:'Geist Mono',monospace; font-size:11px; font-weight:600; padding:5px 12px; border-radius:8px; cursor:pointer; transition:border-color .15s, color .15s; }
  .fc-gloss-link:hover { border-color:var(--fc-accent,var(--teal)); color:var(--fc-accent,var(--teal)); }
  .fc-gloss-link i { width:13px; height:13px; }
  .fc-figure { margin-top:14px; width:150px; }
  .fc-figure svg { width:100%; height:auto; display:block; background:#0f0f0f; border:1px solid var(--border); border-radius:var(--radius-sm); }

  /* grade buttons */
  .fc-grade { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .fc-grade-btn { padding:13px; border-radius:var(--radius); border:1px solid; font-family:'Geist Mono',monospace; font-size:14px; font-weight:800; cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center; gap:7px; }
  .fc-grade-miss { background:rgba(204,34,34,.1); border-color:rgba(204,34,34,.4); color:#ff6a6a; }
  .fc-grade-miss:hover { background:rgba(204,34,34,.2); }
  .fc-grade-got { background:rgba(0,200,120,.1); border-color:rgba(0,200,120,.4); color:#2ee59d; }
  .fc-grade-got:hover { background:rgba(0,200,120,.2); }
  .fc-reveal-hint { text-align:center; font-size:12px; color:var(--text3); padding:6px; }

  /* results */
  .fc-results { text-align:center; background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); padding:36px 28px; }
  .fc-results-score { font-family:'Geist Mono',monospace; font-size:42px; font-weight:800; line-height:1; }
  .fc-results-score.good { color:#00c878; } .fc-results-score.mid { color:#e0b020; } .fc-results-score.low { color:#cc2222; }
  .fc-results-sub { font-size:14px; color:var(--text2); margin:8px 0 4px; }
  .fc-results-line { font-size:12px; color:var(--text3); margin-bottom:22px; }
  .fc-results-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
  .fc-btn { display:inline-flex; align-items:center; gap:7px; padding:11px 20px; border-radius:var(--radius); font-family:'Geist Mono',monospace; font-size:13px; font-weight:700; cursor:pointer; transition:all .15s; border:1px solid var(--border2); background:var(--bg4); color:var(--text2); }
  .fc-btn:hover { border-color:var(--fc-accent,var(--teal)); color:var(--fc-accent,var(--teal)); }
  .fc-btn.primary { background:var(--fc-accent,var(--teal)); border-color:var(--fc-accent,var(--teal)); color:#0b0b0e; }
  .fc-btn.primary:hover { filter:brightness(1.08); color:#0b0b0e; }

  /* Keyboard shortcut hint */
  .fc-kbd-hint { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:8px; margin-top:0; font-size:11px; color:var(--text3); }
  .fc-kbd-hint kbd { font-family:'Geist Mono',monospace; font-size:10px; font-weight:700; color:var(--text2); background:var(--bg4); border:1px solid var(--border2); border-bottom-width:2px; border-radius:5px; padding:1px 6px; }

  .fc-empty { text-align:center; padding:50px 20px; color:var(--text3); }
  @media(max-width:600px){ .fc-term{font-size:28px;} .fc-card-inner{min-height:240px;} .fc-kbd-hint{display:none;} }
  `);
}

/* ── RENDER ───────────────────────────────────────────────────────────────── */
function renderFlashcards(containerId, courseNum, courseName) {
  _fcStyles();
  const container = document.getElementById(containerId);
  if (!container) return;

  // (re)build the session if it's a different course or first run
  if (!_fc || _fc.courseNum !== courseNum) {
    const deck = _fcBuildDeck(courseNum);
    _fc = { courseNum, courseName: _fcCourseName(courseNum), mode: _fcSavedMode(), deck, order: deck.slice(),
            idx: 0, flipped: false, correct: 0, wrong: 0, missed: [], done: false };
  }
  _fcRender();
}

function _fcRender() {
  const container = document.getElementById('content-area');
  if (!container) return;
  const total  = _fc.order.length;
  const accent = _fcAccent(_fc.courseNum);
  const wrapOpen = `<div class="fc-wrap" style="--fc-accent:${accent}">`;

  const head = `
    <div class="fc-head">
      <button class="fc-back-btn" onclick="typeof init==='function'&&init(false)">
        <i data-lucide="arrow-left" style="width:15px;height:15px;"></i> Back to Course
      </button>
      <div class="fc-heading">
        <div class="fc-title">Flashcards</div>
        <div class="fc-sub">${_fcEscape(_fc.courseName)} · ${total} term${total === 1 ? '' : 's'}</div>
      </div>
    </div>`;

  if (!total) {
    container.innerHTML = `${wrapOpen}${head}<div class="fc-stage"><div class="fc-empty">No glossary terms are linked to this course yet.</div></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  if (_fc.done) { container.innerHTML = `${wrapOpen}${head}<div class="fc-stage">${_fcResultsHtml()}</div></div>`; if (typeof lucide !== 'undefined') lucide.createIcons(); return; }

  const entry = _fc.order[_fc.idx];
  const cat = _fcEscape(entry.cat);
  const term = _fcEscape(entry.term);
  const def = _fcEscape(entry.def);
  const fig = (typeof _glFigure === 'function') ? _glFigure(entry.id) : '';
  const figBlock = fig ? `<div class="fc-figure">${fig}</div>` : '';

  // Deep-link to the full glossary entry, shown on the answer face. stopPropagation
  // keeps the click from also flipping the card.
  const glossLink = `<button class="fc-gloss-link" onclick="event.stopPropagation(); typeof showGlossary==='function' && showGlossary('${_fcEscape(entry.id)}')"><i data-lucide="book-open"></i> Open in glossary</button>`;

  // front/back depend on mode
  let front, back;
  // The illustration always travels with the DEFINITION (its labels never name
  // the term, so it's safe to show as the prompt in Definition → Term mode).
  if (_fc.mode === 'term') {
    front = `<div class="fc-eyebrow">Term</div><div class="fc-term">${term}</div><div class="fc-flip-hint">click or press space to reveal</div>`;
    back  = `<span class="fc-cat">${cat}</span><div class="fc-def">${def}</div>${figBlock}${glossLink}`;
  } else {
    front = `<div class="fc-eyebrow">Definition</div><div class="fc-def">${def}</div>${figBlock}<div class="fc-flip-hint">click or press space to reveal</div>`;
    back  = `<span class="fc-cat">${cat}</span><div class="fc-term">${term}</div>${glossLink}`;
  }

  const pct = Math.round(((_fc.idx + 1) / total) * 100);   // matches the "N / M" counter (fills to 100% on the last card)
  const courses = _fcCourses();
  const courseTabs = courses.length > 1
    ? `<div class="fc-courses">${courses.map(c => `<button class="fc-course-tab ${c.num === _fc.courseNum ? 'active' : ''}" style="--c:${_fcAccent(c.num)}" onclick="_fcSetCourse(${c.num})" title="${_fcEscape(c.label)}">Course ${c.num}</button>`).join('')}</div>`
    : '';

  container.innerHTML = `
    ${wrapOpen}
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
        <div class="fc-tally"><span class="ok"><i data-lucide="check" style="width:13px;height:13px;"></i> ${_fc.correct}</span><span class="no"><i data-lucide="x" style="width:13px;height:13px;"></i> ${_fc.wrong}</span></div>
      </div>

      <div class="fc-stage">
        <div class="fc-card ${_fc.flipped ? 'flipped' : ''}" id="fc-card" role="button" tabindex="0" aria-label="Flashcard — click or press space to flip" onclick="_fcFlip()">
          <div class="fc-card-inner">
            <div class="fc-face front">${front}</div>
            <div class="fc-face back">${back}</div>
          </div>
        </div>

        <div id="fc-action">${_fcActionHtml()}</div>

        <div class="fc-kbd-hint">
          <span><kbd>Space</kbd> flip</span>
          <span><kbd>←</kbd> missed · <kbd>→</kbd> got it</span>
          <span><kbd>S</kbd> shuffle</span>
          <span><kbd>T</kbd> flip mode</span>
        </div>
      </div>
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function _fcActionHtml() {
  return _fc.flipped
    ? `<div class="fc-grade">
         <button class="fc-grade-btn fc-grade-miss" onclick="_fcGrade(false)"><i data-lucide="x" style="width:15px;height:15px;"></i> Missed it</button>
         <button class="fc-grade-btn fc-grade-got" onclick="_fcGrade(true)"><i data-lucide="check" style="width:15px;height:15px;"></i> Got it</button>
       </div>`
    : `<div class="fc-reveal-hint">Reveal the definition, then rate how you did</div>`;
}

function _fcResultsHtml() {
  const total = _fc.correct + _fc.wrong || _fc.order.length;
  const pct = total ? Math.round((_fc.correct / total) * 100) : 0;
  const cls = pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low';
  const msg = pct >= 80 ? 'Sharp — you know this course cold.' : pct >= 50 ? 'Solid. Review the misses and run it again.' : 'Worth another pass — run it again.';
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

function _fcSavedMode() { const m = LTStore.get('fcMode'); return (m === 'def' || m === 'term') ? m : 'term'; }
window._fcSetMode = function(m) { if (!_fc) return; _fc.mode = m; _fc.flipped = false; LTStore.set('fcMode', m); _fcRender(); };

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

/* ── KEYBOARD ─────────────────────────────────────────────────────────────────
   Bound once at the document level; only acts while the flashcards view is on
   screen and focus isn't in a text field. Space/Enter/F flip; when flipped,
   ←/1 = missed and →/2 = got it (← / → flip the card when face-down); S shuffle;
   T toggles study direction. */
function _fcKeydown(e) {
  if (!_fc || _fc.done || !document.querySelector('.fc-wrap')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
  const k = e.key;
  if (k === ' ' || k === 'Spacebar' || k === 'Enter' || k === 'f' || k === 'F') { e.preventDefault(); window._fcFlip(); return; }
  if (k === 's' || k === 'S') { e.preventDefault(); window._fcShuffle(); return; }
  if (k === 't' || k === 'T') { e.preventDefault(); window._fcSetMode(_fc.mode === 'term' ? 'def' : 'term'); return; }
  if (_fc.flipped) {
    if (k === 'ArrowLeft'  || k === '1') { e.preventDefault(); window._fcGrade(false); return; }
    if (k === 'ArrowRight' || k === '2') { e.preventDefault(); window._fcGrade(true);  return; }
  } else if (k === 'ArrowLeft' || k === 'ArrowRight') {
    e.preventDefault(); window._fcFlip();
  }
}
if (typeof document !== 'undefined' && !window._fcKbdBound) {
  document.addEventListener('keydown', _fcKeydown);
  window._fcKbdBound = true;
}

window.renderFlashcards = renderFlashcards;
