/* ════════════════════════════════════════════════════════════════════════════
   renderer.js  —  Liquidity Theory v2, LAYER 3 of 3 (the only "code" layer)
   ----------------------------------------------------------------------------
   Consumes ( lesson content  +  chart vocabulary )  →  produces the animation.
   It knows NOTHING lesson-specific: it never names a concept, a level, or a
   move. It is handed a beat (data) and a geometry object (from LTChartVocab) and
   it draws. Editing a lesson never touches this file; adding a chart move never
   touches this file.

   What it does:
     • CONCEPT beat → hide the chart, show a text panel, reveal lines one-by-one.
     • CHART beat   → draw the named move's candles up to the beat's STAGE, then
                      draw the beat's annotations (levels / zones / markers).
                      Consecutive beats that name the SAME chart are treated as
                      ONE evolving chart: only the delta animates on.
     • CANDLE beat  → draw a single named candle large, with wick/body callouts.
     • Beats advance on click or auto (silent for now). Each beat carries `say`
       (narration) shown in the caption bar — the exact point a per-beat audio
       track is cued later (see _cueAudio): authoring never has to change.

   Public:  new LTRenderer(mountEl, lesson, opts?)
            .go(i) .next() .prev() .play() .pause() .destroy()
   ════════════════════════════════════════════════════════════════════════════ */
(function (g) {
  'use strict';

  var V = g.LTChartVocab;
  var REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // animation tunables (ms)
  var CANDLE_MS = 240, STAGGER = 42, ANNO_MS = 440, ANNO_DELAY = 140;

  // colours (mirror the site)
  var C = { teal: '#00d4d4', bear: '#ff2e88', grid: 'rgba(255,255,255,.05)', level: '#cc4444',
    zoneBull: 'rgba(0,212,212,.10)', zoneBear: 'rgba(204,68,68,.12)', ink: '#e8e8f0', muted: '#8d8aa3',
    markSweep: '#ffb454', markRev: '#00d4d4', halo: 'rgba(8,7,15,0.9)' };

  // inline SVG glyphs (dependency-free; colour via currentColor)
  var ICON_CONCEPT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.3h6c0-1.1.4-1.8 1-2.3A7 7 0 0 0 12 2z"/></svg>';
  var ICON_PLAY  = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  var ICON_VOL   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var ICON_MUTE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';
  var ICON_SPEED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/><circle cx="12" cy="14" r="8"/></svg>';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function words(s) { return (s || '').trim().split(/\s+/).filter(Boolean).length; }

  // light inline markup for narration/lines: *teal* and **white**
  function fmt(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  function LTRenderer(mount, lesson, opts) {
    this.lesson = lesson;
    this.opts = opts || {};
    // Candle colours — honour the site's custom bull/bear setting if the host passes it,
    // else the dark defaults (the player stage is always dark). Per-candle scheme colours
    // (Crayons/Genie/…) still override per beat.
    this.cBull = (this.opts.colors && this.opts.colors.bull) || C.teal;
    this.cBear = (this.opts.colors && this.opts.colors.bear) || C.bear;
    this.beats = lesson.beats || [];
    this.i = -1;
    this.playing = false;
    this._geomCache = {};
    this._lineTimers = [];
    this._autoTimer = null;
    this._raf = 0;
    this.scene = null;        // currently displayed scene descriptor
    this.audio = null;        // current <audio> element (per-beat narration), if any
    this._audioToken = 0;     // invalidates stale audio callbacks across go()/pause()
    // playback speed (audio + animations) and narration volume — persisted per learner
    this._speed  = clamp(parseFloat(localStorage.getItem('lt_lesson_speed')) || 1, 0.5, 2);
    var _v = parseFloat(localStorage.getItem('lt_lesson_volume'));
    this._volume = isNaN(_v) ? 1 : clamp(_v, 0, 1);
    this._timings = null;     // { "<NN>": [ {t,s,e} ] } word timings for the current lesson
    this._words   = null;     // caption word <span>s for the current beat (karaoke highlight)
    this._wordI   = -1;       // currently highlighted word index
    this._hlRaf   = 0;        // rAF id driving the caption highlight from audio.currentTime
    this._build(mount);
    this._loadTimings();
    this.go(0, false);
  }

  /* ───────────────────────── DOM scaffold ───────────────────────── */
  LTRenderer.prototype._build = function (mount) {
    var root = el('div', 'ltp2');
    this.root = root;
    // caption (subtitle) size preset from the host setting — Medium default
    var capSize = this.opts.captionSize;
    root.classList.add('cap-' + (capSize === 'sm' || capSize === 'lg' ? capSize : 'md'));

    var stage = el('div', 'ltp2-stage');
    this.canvas = el('canvas', 'ltp2-canvas');
    this.heading = el('div', 'ltp2-heading');
    this.panel = el('div', 'ltp2-panel');
    this.panel.innerHTML = '<div class="ltp2-pmark" aria-hidden="true">' + ICON_CONCEPT + '</div>' +
      '<div class="ltp2-kicker"></div><div class="ltp2-title"></div><ul class="ltp2-lines"></ul>';
    this.pKicker = this.panel.querySelector('.ltp2-kicker');
    this.pTitle = this.panel.querySelector('.ltp2-title');
    this.pLines = this.panel.querySelector('.ltp2-lines');
    stage.appendChild(this.canvas);
    stage.appendChild(this.heading);
    stage.appendChild(this.panel);
    root.appendChild(stage);

    var cap = el('div', 'ltp2-caption');
    this.capTag = el('span', 'tag');
    this.capSay = el('div', 'say');
    cap.appendChild(this.capTag); cap.appendChild(this.capSay);
    root.appendChild(cap);

    var self = this;
    // ── position row: speed control · segmented progress (click to jump) · counter ·
    //    volume. The transport row below stays just Back/Play/Next. ──
    var seg = el('div', 'ltp2-seg');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'Lesson controls');

    // speed chip + popover menu (left)
    this.speedWrap = el('div', 'ltp2-speed-wrap');
    this.btnSpeed = el('button', 'ltp2-chip ltp2-speed');
    this.btnSpeed.innerHTML = ICON_SPEED + '<span class="ltp2-speed-val">1×</span>';
    this.btnSpeed.setAttribute('aria-label', 'Playback speed');
    this.btnSpeed.setAttribute('aria-haspopup', 'true');
    this.speedMenu = el('div', 'ltp2-speed-menu');
    ['0.75', '1', '1.25', '1.5', '2'].forEach(function (v) {
      var b = el('button', 'ltp2-speed-opt', v === '1' ? '1×' : v + '×');
      b.setAttribute('data-sp', v);
      self.speedMenu.appendChild(b);
    });
    this.speedWrap.appendChild(this.btnSpeed); this.speedWrap.appendChild(this.speedMenu);

    this.segWrap = el('div', 'ltp2-seg-track');
    this.counter = el('span', 'ltp2-counter');

    // volume (right): mute toggle + slider
    this.volWrap = el('div', 'ltp2-vol');
    this.btnMute = el('button', 'ltp2-chip ltp2-mute');
    this.btnMute.setAttribute('aria-label', 'Mute narration');
    this.volSlider = el('input', 'ltp2-vol-slider');
    this.volSlider.type = 'range'; this.volSlider.min = '0'; this.volSlider.max = '1'; this.volSlider.step = '0.05';
    this.volSlider.value = String(this._volume);
    this.volSlider.setAttribute('aria-label', 'Narration volume');
    this.volWrap.appendChild(this.btnMute); this.volWrap.appendChild(this.volSlider);

    seg.appendChild(this.speedWrap); seg.appendChild(this.segWrap); seg.appendChild(this.counter); seg.appendChild(this.volWrap);
    root.appendChild(seg);

    // ── transport row (Back · Play · Next) ──
    var ctr = el('div', 'ltp2-controls');
    this.btnPrev = el('button', 'ltp2-btn', '‹ Back');
    this.btnPrev.setAttribute('aria-label', 'Previous beat');
    this.btnPlay = el('button', 'ltp2-btn play', 'Play');
    this.btnPlay.setAttribute('aria-label', 'Play lesson');
    this.btnNext = el('button', 'ltp2-btn', 'Next ›');
    this.btnNext.setAttribute('aria-label', 'Next beat');
    ctr.appendChild(this.btnPrev); ctr.appendChild(this.btnPlay); ctr.appendChild(this.btnNext);
    root.appendChild(ctr);

    // end-of-lesson cue (shown on the last beat) — a right-aligned "✓ Lesson complete"
    // badge; the app's bottom nav "Next" advances to the next step.
    this.done = el('div', 'ltp2-done');
    this.done.innerHTML = '<span class="ltp2-done-txt"><span class="ltp2-done-check">✓</span> Lesson complete</span>';
    root.appendChild(this.done);

    mount.appendChild(root);

    // segments — one per beat; click to jump
    var self = this;
    this.segs = [];
    this.beats.forEach(function (b, idx) {
      var s = el('button', 'ltp2-seg-item ' + b.type.toLowerCase());
      s.title = (idx + 1) + '. ' + b.type;
      s.setAttribute('aria-label', 'Go to beat ' + (idx + 1) + ' of ' + self.beats.length + ' (' + b.type.toLowerCase() + ')');
      s.addEventListener('click', function () { self.pause(); self.go(idx, false); });
      self.segWrap.appendChild(s);
      self.segs.push(s);
    });

    this.btnPrev.addEventListener('click', function () { self.pause(); self.prev(); });
    this.btnNext.addEventListener('click', function () { self.pause(); self.next(); });
    this.btnPlay.addEventListener('click', function () { self.playing ? self.pause() : self.play(); });
    stage.addEventListener('click', function () { if (!self.playing) self.next(); });

    // speed popover
    this.btnSpeed.addEventListener('click', function (e) { e.stopPropagation(); self.speedWrap.classList.toggle('open'); });
    this.speedMenu.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-sp]') : null;
      if (!b) return; self.setSpeed(parseFloat(b.getAttribute('data-sp'))); self.speedWrap.classList.remove('open');
    });
    this._docClick = function () {
      if (self.speedWrap) self.speedWrap.classList.remove('open');
      if (self.volWrap) self.volWrap.classList.remove('open');
    };
    document.addEventListener('click', this._docClick);
    // volume — slider stays hidden until hover (desktop) / tap (touch); speaker click
    // reveals on touch, mutes on desktop (where hover already reveals the slider).
    this.volSlider.addEventListener('input', function () { self.setVolume(parseFloat(self.volSlider.value)); });
    this.volSlider.addEventListener('click', function (e) { e.stopPropagation(); });
    this.btnMute.addEventListener('click', function (e) {
      e.stopPropagation();
      if (self._noHover) { self.volWrap.classList.toggle('open'); return; }   // touch: reveal/hide slider
      if (self._volume > 0) { self._preMute = self._volume; self.setVolume(0); } // desktop: mute toggle
      else self.setVolume(self._preMute || 1);
      self.volSlider.value = String(self._volume);
    });

    // hover-pop for marker labels (collision-aware layout records hit-rects each draw)
    this._mq = []; this._labelRects = []; this._hoverId = null; this._hoverP = {};
    this._reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this._noHover = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);  // touch → tap to reveal volume
    this.canvas.addEventListener('mousemove', function (e) { self._onHover(e); });
    this.canvas.addEventListener('mouseleave', function () { self._setHover(null); });

    this._key = function (e) {
      // don't hijack typing
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') { self.pause(); self.next(); }
      else if (e.key === 'ArrowLeft') { self.pause(); self.prev(); }
      else if (e.key === ' ') { e.preventDefault(); self.playing ? self.pause() : self.play(); }
    };
    document.addEventListener('keydown', this._key);

    this.ctx = this.canvas.getContext('2d');
    this._ro = new ResizeObserver(function () { self._fit(); self._draw(performance.now(), true); });
    this._ro.observe(stage);
    this._fit();
  };

  LTRenderer.prototype._fit = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = this.canvas.getBoundingClientRect();
    this.W = r.width; this.H = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  /* ─────────────────── geometry + scene description ─────────────────── */
  LTRenderer.prototype._geom = function (kind, name, params) {
    var key = kind + ':' + name + ':' + (params ? JSON.stringify(params) : '');
    if (!this._geomCache[key]) this._geomCache[key] = V.get(kind, name, params);
    return this._geomCache[key];
  };

  // Resolve a content-level `show` item against a chart move's anchors → draw spec
  LTRenderer.prototype._resolveChartAnno = function (geom, item, revealCount) {
    var lastI = Math.max(0, revealCount - 1);
    function anchor(name) {
      var a = geom.anchors[name];
      if (!a) throw new Error('[renderer] unknown anchor "' + name + '"');
      return a;
    }
    if (item.kind === 'level') {
      var L = anchor(item.at);
      return { id: 'level:' + item.at + ':' + (item.label || ''), kind: 'level', price: L.price, label: item.label, side: item.side || 'left' };
    }
    if (item.kind === 'zone') {
      var Z = anchor(item.of);
      return { id: 'zone:' + item.of + ':' + item.side, kind: 'zone', price: Z.price, dir: item.side, depth: item.depth || null, label: item.label, tone: item.tone || null };
    }
    if (item.kind === 'marker' || item.kind === 'note') {
      var P = anchor(item.at);
      var i = (P.type === 'point') ? P.i : lastI;
      var place = item.place || (item.style === 'sweep' ? 'below' : 'above');
      return { id: item.kind + ':' + item.at + ':' + (item.label || ''), kind: item.kind, x: i, price: P.price, label: item.label, style: item.style || 'dot', place: place };
    }
    if (item.kind === 'trendline') {
      var A = anchor(item.from), B = anchor(item.to);
      return { id: 'trendline:' + item.from + '-' + item.to, kind: 'trendline', x1: A.i, p1: A.price, x2: B.i, p2: B.price, label: item.label, style: item.style || 'support', extend: item.extend !== false };
    }
    throw new Error('[renderer] unknown show kind "' + item.kind + '"');
  };

  // Cumulative annotations for a CHART beat = this beat's `show` plus every
  // preceding consecutive beat that names the SAME chart (the evolving chart).
  LTRenderer.prototype._chartAnnos = function (index, geom, revealCount) {
    var move = this.beats[index].chart, start = index;
    while (start > 0 && this.beats[start - 1].type === 'CHART' && this.beats[start - 1].chart === move) start--;
    var out = [], seen = {};
    for (var j = start; j <= index; j++) {
      var show = this.beats[j].show || [];
      for (var k = 0; k < show.length; k++) {
        var spec = this._resolveChartAnno(geom, show[k], revealCount);
        if (!seen[spec.id]) { seen[spec.id] = 1; out.push(spec); }
      }
    }
    return out;
  };

  LTRenderer.prototype._describe = function (index) {
    var b = this.beats[index], kind = b.type.toLowerCase();
    if (kind === 'concept') {
      var p = b.panel || {};
      return { kind: 'concept', say: b.say, panel: { kicker: p.kicker, title: p.title, lines: p.lines || [] } };
    }
    if (kind === 'chart') {
      var g1 = this._geom('chart', b.chart, b.params);
      var stage = b.stage || g1.order[g1.order.length - 1];
      var reveal = g1.stages[stage];
      if (reveal == null) throw new Error('[renderer] unknown stage "' + stage + '" for ' + b.chart);
      return { kind: 'chart', move: b.chart, geom: g1, reveal: reveal, heading: b.heading || null,
        annos: this._chartAnnos(index, g1, reveal), say: b.say };
    }
    if (kind === 'candle') {
      var g2 = this._geom('candle', b.candle, b.params);
      var annos = (b.show || []).map(function (it) {
        if (it.kind === 'region') return { id: 'region:' + it.of, kind: 'region', of: it.of, label: it.label };
        if (it.kind === 'marker' || it.kind === 'note') {
          var a = g2.anchors[it.at]; return { id: it.kind + ':' + it.at, kind: it.kind, price: a.price, label: it.label, style: it.style || 'dot' };
        }
        throw new Error('[renderer] unknown candle show kind "' + it.kind + '"');
      });
      return { kind: 'candle', move: b.candle, geom: g2, heading: b.heading || null, annos: annos, say: b.say };
    }
    throw new Error('[renderer] unknown beat type "' + b.type + '"');
  };

  /* ───────────────────────── navigation ───────────────────────── */
  LTRenderer.prototype.go = function (index, animate) {
    index = clamp(index, 0, this.beats.length - 1);
    if (animate == null) animate = true;
    var prev = this.scene;
    var d = this._describe(index);
    this.i = index;

    // continuity: same evolving chart as what's on screen → animate only the delta
    // continuity = the SAME geometry object on screen (identity holds across same
    // move+params via the cache); distinguishes e.g. consolidation_breakout up vs down.
    var cont = animate && !REDUCED && d.kind === 'chart' && prev && prev.kind === 'chart' && prev.geom === d.geom;
    var now = performance.now();
    var sp = this._speed || 1;   // playback speed scales the reveal timings

    if (d.kind === 'chart' || d.kind === 'candle') {
      this._clearLines();
      this.panel.classList.remove('on');
      var nCandles = d.kind === 'chart' ? d.reveal : 1;
      var prevReveal = cont ? prev.reveal : 0;
      // candle appear times
      d.candleT0 = [];
      for (var ci = 0; ci < nCandles; ci++) {
        if (cont && ci < prevReveal) d.candleT0[ci] = -1e9;          // already settled
        else if (!animate || REDUCED) d.candleT0[ci] = -1e9;          // instant (jump / reduced)
        else d.candleT0[ci] = now + (ci - prevReveal) * (STAGGER / sp); // stagger the new ones (speed-scaled)
      }
      d._t0 = (!animate || REDUCED) ? -1e9 : now;   // single-candle beat reveal time
      var lastCandleT0 = d.candleT0.length ? d.candleT0[d.candleT0.length - 1] : now;
      // annotation appear times
      var prevAnno = {};
      if (cont && prev.annos) prev.annos.forEach(function (a) { prevAnno[a.id] = 1; });
      d.annos.forEach(function (a) {
        if ((cont && prevAnno[a.id]) || !animate || REDUCED) a.t0 = -1e9;
        else a.t0 = Math.max(now, lastCandleT0 + CANDLE_MS / sp) + ANNO_DELAY / sp;
      });
      this.heading.textContent = d.heading || '';
      this.heading.classList.toggle('on', !!d.heading);
    } else {
      // concept
      this.heading.classList.remove('on');
      this._showPanel(d.panel, animate && !REDUCED);
    }

    this.scene = d;
    this.root.classList.remove('is-concept', 'is-chart', 'is-candle');
    this.root.classList.add('is-' + d.kind);
    this._setCaption(d);
    this._setControls();
    this._kick();
    this._cueAudio();                    // narration: play this beat's clip (or silent dwell)
  };
  LTRenderer.prototype.next = function () { if (this.i < this.beats.length - 1) this.go(this.i + 1); else this.pause(); };
  LTRenderer.prototype.prev = function () { if (this.i > 0) this.go(this.i - 1, false); };

  /* ───────────────────────── concept panel ───────────────────────── */
  LTRenderer.prototype._clearLines = function () {
    this._lineTimers.forEach(clearTimeout); this._lineTimers = [];
  };
  LTRenderer.prototype._showPanel = function (p, animate) {
    this._clearLines();
    this.pKicker.innerHTML = fmt(p.kicker || '');
    this.pKicker.style.display = p.kicker ? '' : 'none';
    this.pTitle.innerHTML = fmt(p.title || '');
    this.pTitle.style.display = p.title ? '' : 'none';
    this.pLines.innerHTML = '';
    var self = this, sp = this._speed || 1;
    (p.lines || []).forEach(function (ln, idx) {
      var li = el('li', null, fmt(ln));
      self.pLines.appendChild(li);
      if (!animate) { li.classList.add('on'); return; }
      self._lineTimers.push(setTimeout(function () { li.classList.add('on'); }, (220 + idx * 420) / sp));
    });
    this.panel.classList.add('on');
    // clear the canvas behind the panel
    this.ctx.clearRect(0, 0, this.W, this.H);
  };

  /* ───────────────────────── caption + controls ───────────────────────── */
  LTRenderer.prototype._setCaption = function (d) {
    this.capTag.className = 'tag ' + (d.kind === 'concept' ? 'concept' : d.kind === 'candle' ? 'candle' : '');
    this.capTag.textContent = d.kind.toUpperCase();
    this._stopHighlight(); this._words = null; this._wordI = -1;
    var words = this._beatWords();
    if (words && words.length) {
      // karaoke: render each spoken word as a span the highlight loop lights up
      var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
      this.capSay.innerHTML = words.map(function (w, i) { return '<span class="ltp2-w" data-i="' + i + '">' + esc(w.t) + '</span>'; }).join(' ');
      this._words = [].slice.call(this.capSay.querySelectorAll('.ltp2-w'));
      if (this.playing && this.audio) this._startHighlight();
    } else {
      this.capSay.innerHTML = fmt(d.say || '');
    }
  };
  LTRenderer.prototype._setControls = function () {
    var n = this.beats.length, last = this.i >= n - 1;
    this.btnPrev.disabled = this.i <= 0;
    this.btnNext.disabled = last;
    this.btnPlay.innerHTML = (this.playing ? ICON_PAUSE : ICON_PLAY) + '<span>' + (this.playing ? 'Pause' : 'Play') + '</span>';
    this.btnPlay.classList.toggle('playing', this.playing);
    this.btnPlay.setAttribute('aria-pressed', this.playing ? 'true' : 'false');
    this.btnPlay.setAttribute('aria-label', this.playing ? 'Pause lesson' : 'Play lesson');
    this.counter.innerHTML = '<b>' + (this.i + 1) + '</b> / ' + n;
    // segmented progress: past beats filled, current beat highlighted, future empty
    if (this.segs) for (var k = 0; k < this.segs.length; k++) {
      this.segs[k].classList.toggle('done', k < this.i);
      this.segs[k].classList.toggle('cur',  k === this.i);
    }
    // end-of-lesson "✓ Lesson complete" badge on the final beat
    if (this.done) this.done.classList.toggle('on', last);
    // speed chip value + menu state, mute icon
    if (this.btnSpeed) { var sv = this.btnSpeed.querySelector('.ltp2-speed-val'); if (sv) sv.textContent = (this._speed === 1 ? '1×' : this._speed + '×'); }
    if (this.speedMenu) for (var s = 0; s < this.speedMenu.children.length; s++) {
      var opt = this.speedMenu.children[s];
      opt.classList.toggle('on', parseFloat(opt.getAttribute('data-sp')) === this._speed);
    }
    if (this.btnMute) this.btnMute.innerHTML = this._volume <= 0 ? ICON_MUTE : ICON_VOL;
  };

  /* ───────────────────────── autoplay ───────────────────────── */
  LTRenderer.prototype.play = function () {
    this.playing = true; this._setControls(); this._cueAudio();   // plays the current beat's clip (or dwell)
  };
  LTRenderer.prototype.pause = function () {
    this.playing = false; this._stopAudio(); this._setControls();
  };
  // Silent autoplay fallback (no audio for this beat): advance after a text-length dwell.
  LTRenderer.prototype._scheduleAuto = function () {
    clearTimeout(this._autoTimer);
    if (!this.playing) return;
    var b = this.beats[this.i];
    var dwell = b.dwell != null ? b.dwell : clamp(words(b.say) * 300 + 800, 2600, 9000);
    if (this.scene && (this.scene.kind === 'chart' || this.scene.kind === 'candle')) dwell += 700;  // let candles settle
    dwell /= this._speed;                              // playback speed shortens/lengthens the dwell
    var self = this;
    this._autoTimer = setTimeout(function () {
      if (!self.playing) return;
      if (self.i >= self.beats.length - 1) self.pause();
      else self.go(self.i + 1);                       // go() re-cues (audio or dwell)
    }, dwell);
  };

  /* ───────────────────────── per-beat narration (pre-generated mp3s) ─────────────────────────
     Audio is generated per lesson by tools/tts (Kokoro) → lessons-v2/audio/<lessonId>/<NN>.mp3.
     The host enables it by passing opts.audioBase ONLY for lessons that have audio (it checks
     the generated manifest), so we never request files that don't exist. While playing, the
     current beat's clip plays and, on end, advances to the next beat (which re-cues) — so audio
     drives the autoplay. Lessons without audio fall back to the silent text-length dwell. */
  LTRenderer.prototype._narrationOn = function () {
    return this.opts.narration !== false && !!this.opts.audioBase;
  };
  LTRenderer.prototype._audioSrc = function (i) {
    var b = this.beats[i];
    if (b && b.audio) return b.audio;                       // explicit override wins
    if (this.opts.audioBase && this.lesson && this.lesson.id)
      return this.opts.audioBase + this.lesson.id + '/' + (i < 10 ? '0' : '') + i + '.mp3';
    return null;
  };
  LTRenderer.prototype._stopAudio = function () {
    this._audioToken++;                                     // any in-flight callbacks become stale
    clearTimeout(this._autoTimer);
    this._stopHighlight();
    if (this.audio) { try { this.audio.pause(); } catch (e) {} this.audio = null; }
  };
  // Cue the current beat (called on every go() and on play). Plays its clip while playing;
  // on end advances to the next beat. No clip / load error → silent text-length dwell.
  LTRenderer.prototype._cueAudio = function () {
    this._stopAudio();
    if (!this.playing) return;
    var src = this._narrationOn() ? this._audioSrc(this.i) : null;
    if (!src) { this._scheduleAuto(); return; }
    var self = this, tok = this._audioToken, a = new Audio(src);
    a.preload = 'auto';
    a.volume = this._volume;
    try { a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true; } catch (e) {}
    a.playbackRate = this._speed;
    this.audio = a;
    var advance = function () {
      if (tok !== self._audioToken || !self.playing) return;
      if (self.i >= self.beats.length - 1) { self._playQuestComplete(); self.pause(); }  // narrator finished the lesson
      else self.go(self.i + 1);                             // go() re-cues the next beat
    };
    var fallback = function () { if (tok === self._audioToken) { self.audio = null; self._scheduleAuto(); } };
    a.addEventListener('ended', advance);
    a.addEventListener('error', fallback);                  // missing/blocked clip → dwell
    var p = a.play();
    if (p && p.catch) p.catch(fallback);                    // autoplay rejected → dwell
    this._startHighlight();                                 // karaoke caption highlight
  };

  /* ─────────── word-level caption highlighting (karaoke) ───────────
     Per-lesson word timings (tools/tts → timings.json) drive a rAF that highlights the
     spoken word in the caption as the clip plays. Degrades gracefully: no timings →
     the caption renders as plain text (see _setCaption) and nothing highlights. */
  LTRenderer.prototype._loadTimings = function () {
    if (!this.opts.audioBase || !this.lesson || !this.lesson.id || typeof fetch === 'undefined') return;
    var self = this, url = this.opts.audioBase + this.lesson.id + '/timings.json';
    fetch(url, { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) { self._timings = j; if (self.scene) self._setCaption(self.scene); } })  // re-render current caption with spans
      .catch(function () {});
  };
  LTRenderer.prototype._beatWords = function () {
    if (!this._timings) return null;
    return this._timings[(this.i < 10 ? '0' : '') + this.i] || null;
  };
  LTRenderer.prototype._startHighlight = function () {
    this._stopHighlight();
    var words = this._beatWords();
    if (!this._words || !this._words.length || !words || !this.audio) return;
    var self = this;
    var step = function () {
      if (!self.audio) { self._hlRaf = 0; return; }
      var t = self.audio.currentTime, idx = self._wordI;
      if (idx < 0 || (words[idx] && t < words[idx].s)) idx = 0;       // jumped back / not started
      while (idx + 1 < words.length && t >= words[idx + 1].s) idx++;
      self._setWord(words[idx] && t < words[idx].s ? -1 : idx);
      self._hlRaf = requestAnimationFrame(step);
    };
    this._hlRaf = requestAnimationFrame(step);
  };
  LTRenderer.prototype._stopHighlight = function () {
    if (this._hlRaf) { cancelAnimationFrame(this._hlRaf); this._hlRaf = 0; }
  };
  LTRenderer.prototype._setWord = function (i) {
    if (i === this._wordI) return;
    var w = this._words;
    if (w && this._wordI >= 0 && w[this._wordI]) w[this._wordI].classList.remove('on');
    if (w && i >= 0 && w[i]) w[i].classList.add('on');
    this._wordI = i;
  };

  /* ─────────── playback speed (audio + animations) + narration volume ─────────── */
  LTRenderer.prototype.setSpeed = function (sp) {
    this._speed = clamp(sp, 0.5, 2);
    try { localStorage.setItem('lt_lesson_speed', String(this._speed)); } catch (e) {}
    if (this.audio) this.audio.playbackRate = this._speed;        // audio retimes instantly
    this._setControls();                                          // animations pick it up next beat
  };
  LTRenderer.prototype.setVolume = function (v) {
    this._volume = clamp(v, 0, 1);
    try { localStorage.setItem('lt_lesson_volume', String(this._volume)); } catch (e) {}
    if (this.audio) this.audio.volume = this._volume;
    this._setControls();
  };
  // Celebratory "quest complete" fanfare — plays ONLY when the narrator finishes the
  // final beat's audio (i.e. the learner pressed Play and listened through). Picks one of
  // three at random; skipped if narration is muted/off (they weren't listening).
  LTRenderer.prototype._playQuestComplete = function () {
    if (!this.opts.audioBase || this._volume <= 0) return;
    try { if (this._fx) this._fx.pause(); } catch (e) {}
    try {
      var fx = new Audio(this.opts.audioBase + '_fx/quest-' + (1 + Math.floor(Math.random() * 3)) + '.mp3');
      fx.volume = clamp(this._volume, 0, 1);
      this._fx = fx;
      fx.play().catch(function () {});
    } catch (e) {}
  };

  /* ───────────────────────── drawing ───────────────────────── */
  LTRenderer.prototype._kick = function () {
    if (this._raf) return;
    var self = this;
    var loop = function () {
      var now = performance.now();
      var more = self._draw(now, false);
      if (more) self._raf = requestAnimationFrame(loop);
      else self._raf = 0;
    };
    this._raf = requestAnimationFrame(loop);
  };

  // returns true if any animation is still running
  LTRenderer.prototype._draw = function (now) {
    var d = this.scene;
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    if (!d || d.kind === 'concept') return false;
    if (d.kind === 'chart') return this._drawChart(now, d);
    if (d.kind === 'candle') return this._drawCandle(now, d);
    return false;
  };

  LTRenderer.prototype._plot = function (geom, yhint) {
    var padL = 26, padR = 26, padT = 64, padB = 26;
    var x0 = padL, x1 = this.W - padR, y0 = padT, y1 = this.H - padB;
    // reserve a bottom sub-panel when the move carries a volume or oscillator series
    var sub = null, panel = geom.subpanel || (geom.volume ? { type: 'volume', series: geom.volume } : null);
    if (panel) {
      var subH = (y1 - y0) * 0.24, gap = 16, subTop = y1 - subH;
      var vmax = Math.max.apply(null, panel.series.filter(function (v) { return v != null; }).concat([1]));
      var pmin = panel.min != null ? panel.min : 0, pmax = panel.max != null ? panel.max : vmax;
      sub = {
        type: panel.type, series: panel.series, bands: panel.bands || null, y0: subTop, y1: y1, label: panel.label || panel.type,
        vmax: vmax,
        sy: function (v) { return y1 - (v - pmin) / ((pmax - pmin) || 1) * (y1 - subTop); }
      };
      y1 = subTop - gap;   // price area shrinks to make room
    }
    var n = geom.candles.length;
    var slot = (x1 - x0) / n;
    var ymin = yhint.min, ymax = yhint.max;
    return {
      x0: x0, x1: x1, y0: y0, y1: y1, slot: slot, n: n, sub: sub,
      xi: function (i) { return x0 + (i + 0.5) * slot; },
      yp: function (p) { return y1 - (p - ymin) / (ymax - ymin) * (y1 - y0); }
    };
  };

  LTRenderer.prototype._grid = function (P) {
    var ctx = this.ctx;
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (var k = 0; k <= 4; k++) {
      var y = P.y0 + (P.y1 - P.y0) * k / 4;
      ctx.beginPath(); ctx.moveTo(P.x0, y); ctx.lineTo(P.x1, y); ctx.stroke();
    }
  };

  LTRenderer.prototype._candle = function (P, c, i, alpha, colOverride) {
    var ctx = this.ctx;
    var o = c[0], cl = c[1], lo = c[2], hi = c[3];
    var bull = cl >= o;
    // Site candle convention: hollow-up (transparent body, coloured outline) / filled-down.
    // A per-candle scheme colour (Crayons/Genie/…) overrides → solid filled either way.
    var line = colOverride || (bull ? this.cBull : this.cBear);
    var hollow = !colOverride && bull;
    var x = P.xi(i);
    var bw = Math.max(2, P.slot * 0.62);
    var oy = P.yp(o), cy = P.yp(cl);
    // grow body from open as alpha→1
    var topFull = Math.min(oy, cy), botFull = Math.max(oy, cy);
    var top = oy + (topFull - oy) * alpha, bot = oy + (botFull - oy) * alpha;
    var h = Math.max(1, bot - top);
    ctx.globalAlpha = alpha;
    // wicks: upper (high → body top) + lower (body bottom → low), so the line never
    // shows through a hollow (transparent) body
    ctx.strokeStyle = line; ctx.lineWidth = Math.max(1, bw * 0.14);
    ctx.beginPath();
    ctx.moveTo(x, P.yp(hi)); ctx.lineTo(x, top);
    ctx.moveTo(x, bot); ctx.lineTo(x, P.yp(lo));
    ctx.stroke();
    // body
    if (hollow) { ctx.lineWidth = 1.5; ctx.strokeRect(x - bw / 2, top, bw, h); }
    else { ctx.fillStyle = line; ctx.fillRect(x - bw / 2, top, bw, h); }
    ctx.globalAlpha = 1;
  };

  LTRenderer.prototype._drawChart = function (now, d) {
    var geom = d.geom, P = this._plot(geom, geom.yhint);
    var sp = this._speed || 1;   // playback speed scales reveal durations
    var revealA = function (i) { return easeOut((now - d.candleT0[i]) * sp / CANDLE_MS); };
    this._grid(P);
    var more = false;
    // indicator layers behind price: cloud first, then overlay lines
    if (geom.cloud) this._drawCloud(P, geom, d.reveal, revealA);
    if (geom.overlays && this._drawOverlays(P, geom, d.reveal, revealA)) more = true;
    // candles (with optional per-candle color scheme)
    var cc = geom.candleColors;
    for (var i = 0; i < d.reveal; i++) {
      var a = revealA(i);
      if (a < 1) more = true;
      this._candle(P, geom.candles[i], i, a, cc ? cc[i] : null);
    }
    // annotations — markers queue their labels into this._mq for the layout pass below
    this._mq = [];
    for (var j = 0; j < d.annos.length; j++) {
      var an = d.annos[j];
      var av = easeOut((now - an.t0) * sp / ANNO_MS);
      if (av <= 0) { more = true; continue; }
      if (av < 1) more = true;
      this._anno(P, an, av);
    }
    // bottom sub-panel (volume / oscillator)
    if (P.sub) this._drawSub(d, P, revealA);
    // marker labels last (on top), with collision-avoidance + hover-pop
    if (this._drawMarkerLabels(P)) more = true;
    return more;
  };

  // Kumo cloud — a filled band between two price series (Senkou A & B); green where
  // A>B (bullish), red where A<B (bearish). Drawn segment-by-segment so it can flip.
  LTRenderer.prototype._drawCloud = function (P, geom, reveal, revealA) {
    var ctx = this.ctx, A = geom.cloud.a, B = geom.cloud.b;
    for (var i = 0; i < reveal - 1; i++) {
      if (A[i] == null || B[i] == null || A[i + 1] == null || B[i + 1] == null) continue;
      var al = Math.min(revealA(i), revealA(i + 1)); if (al <= 0) continue;
      var x0 = P.xi(i), x1 = P.xi(i + 1);
      var bull = (A[i] + A[i + 1]) >= (B[i] + B[i + 1]);
      ctx.globalAlpha = Math.min(al, 1);
      ctx.fillStyle = bull ? 'rgba(40,200,120,0.18)' : 'rgba(242,61,92,0.15)';
      ctx.beginPath();
      ctx.moveTo(x0, P.yp(A[i])); ctx.lineTo(x1, P.yp(A[i + 1]));
      ctx.lineTo(x1, P.yp(B[i + 1])); ctx.lineTo(x0, P.yp(B[i]));
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // Overlay lines (moving averages, Tenkan/Kijun, etc.). Each: {points:[v|null...],
  // color, width, dashed, label}. Drawn up to the revealed candle count.
  LTRenderer.prototype._drawOverlays = function (P, geom, reveal, revealA) {
    var ctx = this.ctx, more = false, self = this;
    geom.overlays.forEach(function (ov) {
      ctx.strokeStyle = ov.color; ctx.lineWidth = ov.width || 1.4;
      if (ov.dashed) ctx.setLineDash([5, 4]);
      ctx.beginPath(); var started = false, lastX = 0, lastY = 0;
      for (var i = 0; i < reveal; i++) {
        var v = ov.points[i]; if (v == null) { started = false; continue; }
        if (revealA(i) < 1) more = true;
        var x = P.xi(i), y = P.yp(v);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        lastX = x; lastY = y;
      }
      ctx.stroke(); ctx.setLineDash([]);
      if (ov.label && started) {
        ctx.fillStyle = ov.color; ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        self._haloText(ov.label, Math.min(lastX + 5, P.x1 - 60), lastY);
      }
    });
    return more;
  };

  // Bottom sub-panel: volume bars or an oscillator line (with reference bands).
  LTRenderer.prototype._drawSub = function (d, P, revealA) {
    var ctx = this.ctx, S = P.sub, geom = d.geom;
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(P.x0, S.y0); ctx.lineTo(P.x1, S.y0); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(S.label, P.x0 + 2, S.y0 + 3);
    if (S.type === 'volume') {
      for (var i = 0; i < d.reveal; i++) {
        var v = S.series[i]; if (v == null) continue;
        var h = (v / S.vmax) * (S.y1 - S.y0) * 0.84;
        var c = geom.candles[i], bull = c[1] >= c[0];
        var col = geom.candleColors ? geom.candleColors[i] : (bull ? C.teal : C.bear);
        var x = P.xi(i), bw = Math.max(2, P.slot * 0.62);
        ctx.globalAlpha = revealA(i) * 0.85; ctx.fillStyle = col;
        ctx.fillRect(x - bw / 2, S.y1 - h, bw, h); ctx.globalAlpha = 1;
      }
    } else if (S.type === 'histogram') {
      // bars from a zero baseline: positive teal (above), negative red (below)
      var zeroY = S.sy(0);
      ctx.strokeStyle = C.muted; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(P.x0, zeroY); ctx.lineTo(P.x1, zeroY); ctx.stroke(); ctx.globalAlpha = 1;
      for (var hi = 0; hi < d.reveal; hi++) {
        var hv = S.series[hi]; if (hv == null) continue;
        var by = S.sy(hv), bx = P.xi(hi), hbw = Math.max(2, P.slot * 0.62);
        ctx.globalAlpha = revealA(hi) * 0.85; ctx.fillStyle = hv >= 0 ? C.teal : C.level;
        if (hv >= 0) ctx.fillRect(bx - hbw / 2, by, hbw, zeroY - by);
        else ctx.fillRect(bx - hbw / 2, zeroY, hbw, by - zeroY);
        ctx.globalAlpha = 1;
      }
    } else {
      if (S.bands) S.bands.forEach(function (b) {
        var y = S.sy(b.v);
        ctx.strokeStyle = C.grid; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(P.x0, y); ctx.lineTo(P.x1, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.muted; ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.v), P.x1 - 2, y);
      });
      ctx.strokeStyle = S.color || C.teal; ctx.lineWidth = 1.6;
      ctx.beginPath(); var started = false;
      for (var k = 0; k < d.reveal; k++) {
        var val = S.series[k]; if (val == null) { started = false; continue; }
        var px = P.xi(k), py = S.sy(val);
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  };

  // draw label text with a dark halo so it stays legible over candles/overlays
  LTRenderer.prototype._haloText = function (text, x, y) {
    var ctx = this.ctx, fill = ctx.fillStyle;
    ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = C.halo;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
  };

  LTRenderer.prototype._roundRect = function (x, y, w, h, r) {
    var ctx = this.ctx; r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  /* ── Marker label layout: pill background + collision-avoidance + hover-pop ──
     Floating marker callouts ("swing high", "higher low", …) used to draw straight
     onto the canvas, so when anchors were close the text cramped or overlapped. We
     now collect them (this._mq, filled in _anno) and lay them out here: each gets a
     legibility pill, overlapping labels are pushed apart (stacked outward from the
     candles), and the hovered one eases up in scale + brightness, drawn on top.
     Returns true while a hover transition is still animating. */
  LTRenderer.prototype._drawMarkerLabels = function (P) {
    var ctx = this.ctx, self = this;
    var q = this._mq || []; this._labelRects = [];
    if (!q.length) return false;
    var FS = 11, padX = 7, padY = 4, H = FS + padY * 2, OFF = 12, GAP = 4;

    // 1. natural position + width (edge-aware horizontally)
    ctx.font = FS + 'px JetBrains Mono, monospace';
    q.forEach(function (L) {
      L.w = ctx.measureText(L.text).width + padX * 2; L.h = H;
      L.cx = L.anchorX;
      L.cy = L.place === 'below' ? L.anchorY + OFF + H / 2 : L.anchorY - OFF - H / 2;
      if (L.cx - L.w / 2 < P.x0 + 2) L.cx = P.x0 + 2 + L.w / 2;
      if (L.cx + L.w / 2 > P.x1 - 2) L.cx = P.x1 - 2 - L.w / 2;
    });

    // 2. resolve overlaps within each placement group — push later labels outward
    ['above', 'below'].forEach(function (grp) {
      var below = grp === 'below';
      var items = q.filter(function (L) { return (L.place === 'below') === below; });
      items.sort(function (a, b) { return below ? a.cy - b.cy : b.cy - a.cy; });   // closest to candles first
      var placed = [];
      items.forEach(function (L) {
        for (var guard = 0; guard < 40; guard++) {
          var hit = null;
          for (var k = 0; k < placed.length; k++) {
            var Pl = placed[k];
            if (Math.abs(L.cx - Pl.cx) < (L.w + Pl.w) / 2 - 1 &&
                Math.abs(L.cy - Pl.cy) < (L.h + Pl.h) / 2 + GAP) { hit = Pl; break; }
          }
          if (!hit) break;
          L.cy += (below ? 1 : -1) * ((L.h + hit.h) / 2 + GAP - Math.abs(L.cy - hit.cy));
        }
        // keep inside the plot
        L.cy = clamp(L.cy, P.y0 + L.h / 2, P.y1 - L.h / 2);
        placed.push(L);
      });
    });

    // 3. ease hover progress, record hit-rects, draw (hovered last → on top)
    var anim = false;
    q.forEach(function (L) {
      var cur = self._hoverP[L.id] || 0, tgt = (L.id === self._hoverId) ? 1 : 0;
      var nv = self._reduceMotion ? tgt : cur + (tgt - cur) * 0.22;
      if (Math.abs(nv - tgt) < 0.012) nv = tgt;
      if (nv !== cur) anim = true;
      self._hoverP[L.id] = nv; L.hp = nv;
      self._labelRects.push({ id: L.id, x: L.cx - L.w / 2, y: L.cy - L.h / 2, w: L.w, h: L.h });
    });
    q.slice().sort(function (a, b) { return (a.hp || 0) - (b.hp || 0); }).forEach(function (L) { self._paintLabel(L, FS); });

    ctx.font = '11px JetBrains Mono, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    return anim;
  };

  LTRenderer.prototype._paintLabel = function (L, FS) {
    var ctx = this.ctx, hp = L.hp || 0, s = 1 + 0.17 * hp, w = L.w, h = L.h;
    ctx.save();
    ctx.globalAlpha = L.av;
    ctx.translate(L.cx, L.cy); ctx.scale(s, s);
    // legibility pill (a touch more opaque + a colour-tinted border as it pops)
    this._roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fillStyle = 'rgba(10,8,18,' + (0.6 + 0.34 * hp) + ')'; ctx.fill();
    if (hp > 0.01) {
      ctx.lineWidth = 1; ctx.strokeStyle = L.color; ctx.globalAlpha = L.av * (0.2 + 0.6 * hp);
      ctx.shadowColor = L.color; ctx.shadowBlur = 9 * hp;
      this._roundRect(-w / 2, -h / 2, w, h, 6); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = L.av;
    }
    ctx.fillStyle = L.color; ctx.font = FS + 'px JetBrains Mono, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(L.text, 0, 0.5);
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  // pointer hover over a marker label → pop it (hit-test the recorded rects)
  LTRenderer.prototype._onHover = function (e) {
    var r = this.canvas.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top, hit = null;
    var L = this._labelRects || [];
    for (var i = L.length - 1; i >= 0; i--) {
      var b = L[i];
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) { hit = b.id; break; }
    }
    this._setHover(hit);
  };
  LTRenderer.prototype._setHover = function (id) {
    if (id === this._hoverId) return;
    this._hoverId = id;
    this._kick();   // animate the pop (raf loop restarts if it had settled)
  };

  LTRenderer.prototype._anno = function (P, an, av) {
    var ctx = this.ctx;
    ctx.globalAlpha = av;
    if (an.kind === 'level') {
      var y = P.yp(an.price);
      ctx.strokeStyle = C.level; ctx.lineWidth = 1.4; ctx.setLineDash([7, 5]);
      var xr = P.x0 + (P.x1 - P.x0) * av;          // draw left→right
      ctx.beginPath(); ctx.moveTo(P.x0, y); ctx.lineTo(xr, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.level; ctx.font = '11px ' + 'JetBrains Mono, monospace';
      ctx.textBaseline = 'bottom';
      if (an.label) {
        if (an.side === 'right') { ctx.textAlign = 'right'; this._haloText(an.label, P.x1 - 4, y - 4); }
        else { ctx.textAlign = 'left'; this._haloText(an.label, P.x0 + 4, y - 4); }
      }
    } else if (an.kind === 'zone') {
      var yz = P.yp(an.price);
      var depthPx = an.depth ? Math.abs(P.yp(an.price) - P.yp(an.price + an.depth)) : 34;
      var top = an.dir === 'above' ? yz - depthPx : yz;
      // tone overrides direction-based colour (risk=red, reward=teal) for trade setups
      ctx.fillStyle = an.tone === 'risk' ? C.zoneBear : an.tone === 'reward' ? C.zoneBull
        : (an.dir === 'above' ? C.zoneBear : C.zoneBull);
      ctx.fillRect(P.x0, top, P.x1 - P.x0, depthPx);
      if (an.label) {
        ctx.fillStyle = C.ink; ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        this._haloText(an.label, (P.x0 + P.x1) / 2, top + depthPx / 2);
      }
    } else if (an.kind === 'marker' || an.kind === 'note') {
      var mx = P.xi(an.x), my = P.yp(an.price);
      var col = an.style === 'sweep' ? C.markSweep : an.style === 'reversal' ? C.markRev : C.ink;
      if (an.kind === 'marker') {
        var rr = 5 * av;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(mx, my, rr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = col; ctx.globalAlpha = av * 0.4; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(mx, my, rr + 4, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = av;
      }
      if (an.label) {
        // Defer the label to the post-pass (_drawMarkerLabels): pill + collision-
        // avoidance + hover-pop. The dot is already drawn above, in place.
        (this._mq || (this._mq = [])).push({
          id: an.id || ('mk:' + an.x + ':' + an.label), text: an.label, color: col, av: av,
          anchorX: mx, anchorY: my, place: an.place === 'below' ? 'below' : 'above'
        });
      }
    } else if (an.kind === 'trendline') {
      var ax = P.xi(an.x1), ay = P.yp(an.p1), bx = P.xi(an.x2), by = P.yp(an.p2), ex = bx, ey = by;
      if (an.extend) { var slope = (by - ay) / ((bx - ax) || 1); ex = P.x1; ey = ay + slope * (ex - ax); }
      var lx = ax + (ex - ax) * av, ly = ay + (ey - ay) * av;   // draw out from A
      ctx.strokeStyle = an.style === 'resistance' ? C.level : C.teal; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); ctx.stroke();
      if (an.label && av > 0.55) {
        ctx.fillStyle = an.style === 'resistance' ? C.level : C.teal; ctx.font = '11px JetBrains Mono, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = an.style === 'resistance' ? 'bottom' : 'top';
        this._haloText(an.label, ax + 4, an.style === 'resistance' ? ay - 5 : ay + 5);
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  };

  LTRenderer.prototype._drawCandle = function (now, d) {
    var ctx = this.ctx, geom = d.geom, o = geom.ohlc[0], cl = geom.ohlc[1], lo = geom.ohlc[2], hi = geom.ohlc[3];
    var pad = 70, y0 = pad, y1 = this.H - 40;
    var ymin = lo - (hi - lo) * 0.12, ymax = hi + (hi - lo) * 0.12;
    var yp = function (p) { return y1 - (p - ymin) / (ymax - ymin) * (y1 - y0); };
    var cx = this.W * 0.26, bw = Math.min(96, this.W * 0.12);
    if (d._t0 == null) d._t0 = now;
    var a = easeOut((now - d._t0) * (this._speed || 1) / 420);
    var more = a < 1;
    // hollow-up / filled-down, matching the site (and the chart-beat candles)
    var bull = cl >= o, col = bull ? this.cBull : this.cBear;
    ctx.globalAlpha = a;
    var top = Math.min(yp(o), yp(cl)), bot = Math.max(yp(o), yp(cl)), h = Math.max(2, bot - top);
    // wicks above + below the body (never through a hollow body)
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, yp(hi)); ctx.lineTo(cx, top);
    ctx.moveTo(cx, bot); ctx.lineTo(cx, yp(lo));
    ctx.stroke();
    // body — bullish hollow (outlined), bearish solid
    if (bull) { ctx.lineWidth = 2.5; ctx.strokeRect(cx - bw / 2, top, bw, h); }
    else { ctx.fillStyle = col; ctx.fillRect(cx - bw / 2, top, bw, h); }
    ctx.globalAlpha = 1;
    // callouts
    var lblX = cx + bw / 2 + 28;
    for (var j = 0; j < d.annos.length; j++) {
      var an = d.annos[j];
      if (an.kind === 'region') {
        var reg = geom.regions[an.of]; if (!reg) continue;
        var ry0 = yp(reg.to), ry1 = yp(reg.from), midY = (ry0 + ry1) / 2;
        ctx.strokeStyle = C.muted; ctx.globalAlpha = 0.7; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(cx + bw / 2, ry0); ctx.lineTo(lblX - 6, ry0);
        ctx.moveTo(cx + bw / 2, ry1); ctx.lineTo(lblX - 6, ry1); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.fillStyle = C.ink; ctx.font = '12px JetBrains Mono, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(an.label || '', lblX, midY);
      } else if (an.kind === 'marker' || an.kind === 'note') {
        var my = yp(an.price);
        ctx.fillStyle = C.ink; ctx.font = '12px JetBrains Mono, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(an.label || '', lblX, my);
      }
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    return more;
  };

  LTRenderer.prototype.destroy = function () {
    this.pause(); this._clearLines();
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._ro) this._ro.disconnect();
    document.removeEventListener('keydown', this._key);
    if (this._docClick) document.removeEventListener('click', this._docClick);
    this._stopAudio();   // stop any in-flight narration clip
    try { if (this._fx) this._fx.pause(); } catch (e) {}   // and the quest fanfare
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
  };

  g.LTRenderer = LTRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
