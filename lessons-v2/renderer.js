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

  // animation tunables (ms) — kept snappy so the player feels as quick as the rest
  // of the site. The candle stagger is also capped (see go()) so long charts don't
  // crawl. Narration audio, not these, paces a playing lesson; these drive the draw-in.
  var CANDLE_MS = 190, STAGGER = 30, ANNO_MS = 320, ANNO_DELAY = 80, REVEAL_TAIL_MAX = 560;

  // colours (mirror the site)
  var C = { teal: '#00d4d4', bear: '#ff2e88', gold: '#ffcc00', grid: 'rgba(255,255,255,.05)', level: '#cc4444',
    zoneBull: 'rgba(0,212,212,.10)', zoneBear: 'rgba(255,46,136,.12)', ink: '#e8e8f0', muted: '#8d8aa3',
    markSweep: '#ffb454', markRev: '#00d4d4', halo: 'rgba(8,7,15,0.9)' };
  // Role-based level colour (palette law): support/demand/entry → teal, resistance/stop/short → pink,
  // target/take-profit/liquidation → gold. Inferred from an explicit `tone` or the label/anchor text.
  function levelColor(item) {
    var t = ((item && item.tone) || '').toLowerCase();
    if (t === 'reward' || t === 'support' || t === 'bull' || t === 'long' || t === 'demand') return C.teal;
    if (t === 'risk' || t === 'resistance' || t === 'stop' || t === 'bear' || t === 'short' || t === 'supply') return C.bear;
    if (t === 'target' || t === 'liq' || t === 'tp' || t === 'gold') return C.gold;
    var s = (((item && item.label) || '') + ' ' + ((item && item.at) || '')).toLowerCase();
    if (/target|take.?profit|\btp\b|liquidation|\bliq\b/.test(s)) return C.gold;
    if (/resist|supply|\bstop\b|\bsl\b|short|bear|ceiling|invalidation/.test(s)) return C.bear;
    if (/support|demand|entry|\bbull|\blong\b|floor|reclaim|kijun|tenkan/.test(s)) return C.teal;
    return C.bear;   // bare S/R level → brand pink (was off-palette #cc4444 red)
  }

  // inline SVG glyphs (dependency-free; colour via currentColor)
  var ICON_CONCEPT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.3h6c0-1.1.4-1.8 1-2.3A7 7 0 0 0 12 2z"/></svg>';
  var ICON_PLAY  = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PREV  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  var ICON_NEXT  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  var ICON_VOL   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var ICON_MUTE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';
  var ICON_SPEED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/><circle cx="12" cy="14" r="8"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

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
    // Text alternative: the canvas is purely visual; the spoken narration/caption carries the
    // content for assistive tech. Mark it as an image and label it per-beat (updated in go()).
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Lesson visualization — described by the narration');
    this.heading = el('div', 'ltp2-heading');
    this.panel = el('div', 'ltp2-panel');
    // .ltp2-panel-inner wraps all concept content so _fitConcept can scale the
    // whole group to the stage box — a concept slide must NEVER scroll.
    this.panel.innerHTML = '<div class="ltp2-panel-inner"><div class="ltp2-pmark" aria-hidden="true">' + ICON_CONCEPT + '</div>' +
      '<div class="ltp2-kicker"></div><div class="ltp2-title"></div><ul class="ltp2-lines"></ul><div class="ltp2-quad"></div></div>';
    this.pInner = this.panel.querySelector('.ltp2-panel-inner');
    this.pKicker = this.panel.querySelector('.ltp2-kicker');
    var selfLines = this;
    this.panel.addEventListener('scroll', function () { selfLines._updateLinesMask(); }, { passive: true, capture: true });
    this.pTitle = this.panel.querySelector('.ltp2-title');
    this.pLines = this.panel.querySelector('.ltp2-lines');
    this.pQuad = this.panel.querySelector('.ltp2-quad');
    stage.appendChild(this.canvas);
    stage.appendChild(this.heading);
    stage.appendChild(this.panel);
    // Lesson-complete overlay — revealed with the quest-complete fanfare so it's visually
    // unmistakable the lesson is over. Non-interactive (pointer-events:none) so the nav
    // underneath stays clickable; auto-fades. Populated in _showComplete().
    this.stage = stage;
    this.complete = el('div', 'ltp2-complete', '\
<div class="ltp2-complete-card">\
<div class="ltp2-complete-mark" aria-hidden="true">' + (typeof ICON_CHECK !== 'undefined' ? ICON_CHECK : '✓') + '</div>\
<div class="ltp2-complete-kicker"></div>\
<div class="ltp2-complete-status">Lesson Complete</div>\
<div class="ltp2-complete-title"></div>\
</div>');
    this.complete.setAttribute('aria-hidden', 'true');
    stage.appendChild(this.complete);
    root.appendChild(stage);

    var cap = el('div', 'ltp2-caption');
    this.capEl = cap;
    this.capSay = el('div', 'say');
    cap.appendChild(this.capSay);
    root.appendChild(cap);
    var selfMask = this;
    // masks track the live scroll state (user swipes included)
    cap.addEventListener('scroll', function () { selfMask._updateCapMask(); }, { passive: true });

    var self = this;
    // ── ONE compact control bar: transport (prev · play · next) + segmented progress
    //    (click to jump) + counter + speed + volume, all on a single row. Replaces the
    //    old two stacked rows (position + transport) that wasted vertical space. ──
    var bar = el('div', 'ltp2-bar');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Lesson controls');

    // transport group (left): prev (icon) · play (icon + label) · next (icon)
    var transport = el('div', 'ltp2-transport');
    this.btnPrev = el('button', 'ltp2-btn ltp2-btn-icon', ICON_PREV);
    this.btnPrev.setAttribute('aria-label', 'Previous beat');
    this.btnPlay = el('button', 'ltp2-btn play', 'Play');
    this.btnPlay.setAttribute('aria-label', 'Play lesson');
    this.btnNext = el('button', 'ltp2-btn ltp2-btn-icon', ICON_NEXT);
    this.btnNext.setAttribute('aria-label', 'Next beat');
    transport.appendChild(this.btnPrev); transport.appendChild(this.btnPlay); transport.appendChild(this.btnNext);

    // segmented progress (centre, flexes to fill)
    this.segWrap = el('div', 'ltp2-seg-track');
    this.counter = el('span', 'ltp2-counter');

    // speed chip + popover menu (right)
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

    // volume (right): mute toggle + slider (slider reveals on hover / tap)
    this.volWrap = el('div', 'ltp2-vol');
    this.btnMute = el('button', 'ltp2-chip ltp2-mute');
    this.btnMute.setAttribute('aria-label', 'Mute narration');
    this.volSlider = el('input', 'ltp2-vol-slider');
    this.volSlider.type = 'range'; this.volSlider.min = '0'; this.volSlider.max = '1'; this.volSlider.step = '0.05';
    this.volSlider.value = String(this._volume);
    this.volSlider.setAttribute('aria-label', 'Narration volume');
    this.volWrap.appendChild(this.btnMute); this.volWrap.appendChild(this.volSlider);

    bar.appendChild(transport); bar.appendChild(this.segWrap); bar.appendChild(this.counter);
    bar.appendChild(this.speedWrap); bar.appendChild(this.volWrap);
    root.appendChild(bar);

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
    // tap a pill (touch devices) → pop it to its full text instead of advancing the
    // beat; tapping it again (or empty canvas) releases it and taps fall through.
    this.canvas.addEventListener('click', function (e) {
      var hit = self._hitLabel(e);
      if (hit) { e.stopPropagation(); self._setHover(hit === self._hoverId ? null : hit); }
      else if (self._hoverId) { e.stopPropagation(); self._setHover(null); }
    });

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
    this._ro = new ResizeObserver(function () {
      self._fit();
      self._fitCaptions();
      self._fitConcept();
      self._draw(performance.now(), true);
    });
    this._ro.observe(stage);
    this._fit();
    this._fitCaptions();
    // real font metrics land late — re-measure both no-scroll fits once loaded
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (!self.root || !self.root.parentNode) return;   // destroyed
        self._fitCaptions(); self._fitConcept();
      });
    }
  };

  /* ── no-scroll invariants ──────────────────────────────────────────────────
     The owner's rule: the animation stage and the caption must NEVER scroll.
     _fitCaptions sizes the caption block to the LESSON's longest narration
     (same height on every beat → the player still never moves between beats;
     the desktop height-fit reads the same --cap-mh so the stage shrinks to
     keep the whole player on screen). _fitConcept scale-to-fits the concept
     slide inside the fixed stage as a last resort — every bullet always
     visible, chart geometry untouched. */
  LTRenderer.prototype._fitCaptions = function () {
    var cap = this.capEl;
    if (!cap || !this.beats.length) return;
    var texts = [];
    for (var i = 0; i < this.beats.length; i++) if (this.beats[i].say) texts.push(this.beats[i].say);
    if (!texts.length) return;
    var m = this._capMeas;
    if (!m) {
      m = this._capMeas = el('div');
      m.setAttribute('aria-hidden', 'true');
      m.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;white-space:normal;';
      this.root.appendChild(m);
    }
    // The caption may only take what the viewport leaves over — the stage is
    // the hero and never shrinks for text. If the longest narration needs
    // more than the remainder, the box becomes a synced lyric window
    // (.ltp2--capflow: bottom fade + the karaoke auto-advance reveals the
    // rest as it plays). Desktop bounds the box at 160px and lets the
    // height-fit formula (max-width ← --cap-mh) trade stage size instead.
    for (var pass = 0; pass < 3; pass++) {
      var cs = getComputedStyle(cap);
      var w = cap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (!(w > 0)) return;
      m.style.width = w + 'px';
      // longhands, not the `font` shorthand — Safari/Firefox serialize the
      // computed shorthand as '' and the measurer would fall back to body size
      m.style.fontFamily = cs.fontFamily;
      m.style.fontSize = cs.fontSize;
      m.style.fontWeight = cs.fontWeight;
      m.style.fontStyle = cs.fontStyle;
      m.style.lineHeight = cs.lineHeight;
      m.style.letterSpacing = cs.letterSpacing;
      // measuring every narration forces a reflow per text — cache per metrics
      var mkey = w.toFixed(1) + '|' + cs.fontSize + '|' + cs.lineHeight;
      var max;
      if (this._capNeedKey === mkey) {
        max = this._capNeedMax;
      } else {
        max = 0;
        for (var t = 0; t < texts.length; t++) {
          m.textContent = texts[t];
          if (m.offsetHeight > max) max = m.offsetHeight;
        }
        this._capNeedKey = mkey; this._capNeedMax = max;
      }
      if (!max) return;
      var need = Math.ceil(max + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) + 1;
      var shown;
      if (window.innerWidth <= 768) {
        // remainder = viewport content box minus everything that isn't the
        // caption, measured from the REAL rendered column (first child top →
        // last child bottom; scrollHeight is useless here — it floors at
        // clientHeight and would count free space as used, ratcheting the
        // caption down while empty screen sat below the player)
        var ca = this.root.closest('.content-area');
        var avail = need;
        if (ca) {
          // first/last VISIBLE children (the module banner is display:none on
          // short phones and would zero the measurement)
          var kids = [].filter.call(ca.children, function (k) { return k.offsetHeight > 0 || k.offsetWidth > 0; });
          if (kids.length) {
            var cs2 = getComputedStyle(ca);
            var box = ca.clientHeight - parseFloat(cs2.paddingTop) - parseFloat(cs2.paddingBottom);
            var used = kids[kids.length - 1].getBoundingClientRect().bottom
                     - kids[0].getBoundingClientRect().top;
            avail = box - (used - cap.offsetHeight) - 2;
          }
        }
        shown = Math.max(72, Math.min(need, avail));
      } else {
        // desktop bound follows the user's caption-size preset so "Small"
        // still means a smaller box / bigger stage
        var bound = this.root.classList.contains('cap-sm') ? 120
                  : this.root.classList.contains('cap-lg') ? 190 : 160;
        shown = Math.min(need, bound);
      }
      var prev = cap.clientHeight;
      this.root.style.setProperty('--cap-mh', shown + 'px');
      this.root.classList.toggle('ltp2--capflow', need > shown + 1);
      if (Math.abs(shown - prev) <= 1) break;
    }
    this._updateCapMask();
  };
  LTRenderer.prototype._fitConcept = function () {
    var inner = this.pInner, panel = this.panel;
    if (!inner || !panel) return;
    inner.style.transform = '';
    panel.classList.remove('ltp2-panel--window');
    if (!panel.classList.contains('on')) return;   // only concept beats
    var cs = getComputedStyle(panel);
    var avail = panel.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var need = inner.offsetHeight;
    if (!(avail > 0) || need <= avail) return;
    var f = avail / need;
    var hasQuad = this.pQuad && this.pQuad.innerHTML && this.pQuad.style.display !== 'none';
    if (f >= 0.72 || hasQuad) {
      // mild overflow (or a quadrant slide, which stays whole): scale to fit
      inner.style.transform = 'scale(' + f.toFixed(4) + ')';
      return;
    }
    // readability floor: below 0.72 the text turns illegible — switch to a
    // windowed bullet list synced to the reveal instead (already-narrated
    // bullets slide up under a top fade; the caption carries the full text)
    panel.classList.add('ltp2-panel--window');
    this._syncLineWindow();
  };
  // keep the newest revealed bullet in view inside the windowed list.
  // No li (rest state — jump/prev/static render): show the TOP of the slide
  // with the bottom fade signalling more; the list is user-scrollable too.
  LTRenderer.prototype._syncLineWindow = function (li) {
    if (!this.panel || !this.panel.classList.contains('ltp2-panel--window')) return;
    var list = this.pLines;
    if (!li) { list.scrollTop = 0; this._updateLinesMask(); return; }
    // gBCR delta (zoom-safe), NOT offsetTop: the li's offsetParent is the
    // panel, so offsetTop includes the header stack and overshoots the scroll
    var lr = li.getBoundingClientRect(), tr = list.getBoundingClientRect();
    var z = list.clientHeight ? (tr.height / list.clientHeight) : 1;
    var bottom = (lr.bottom - tr.top) / z + list.scrollTop;
    var top = Math.max(0, Math.ceil(bottom - list.clientHeight + 30));
    if (this._reduceMotion || !list.scrollTo) list.scrollTop = top;
    else list.scrollTo({ top: top, behavior: 'smooth' });
    this._updateLinesMask();
  };

  LTRenderer.prototype._fit = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    // LAYOUT px, not gBCR: under the app's laptop body{zoom} the drawing space
    // must scale with the zoom like the surrounding DOM (fonts, pads, tight
    // thresholds), and clientWidth is stable across zoom flips so a breakpoint
    // crossing can't leave W/H (and the recorded hit rects) stale.
    var w = this.canvas.clientWidth || this.canvas.getBoundingClientRect().width;
    var h = this.canvas.clientHeight || this.canvas.getBoundingClientRect().height;
    this.W = w; this.H = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
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
      return { id: 'level:' + item.at + ':' + (item.label || ''), kind: 'level', price: L.price, label: item.label, side: item.side || 'left', color: levelColor(item) };
    }
    if (item.kind === 'zone') {
      var Z = anchor(item.of);
      return { id: 'zone:' + item.of + ':' + item.side, kind: 'zone', price: Z.price, dir: item.side, depth: item.depth || null, label: item.label, tone: item.tone || null };
    }
    if (item.kind === 'heatmap') {
      var H1 = anchor(item.of), H2 = anchor(item.to);
      return { id: 'heatmap:' + item.of + '-' + item.to, kind: 'heatmap', p1: H1.price, p2: H2.price, tone: item.tone || 'long', peak: (item.peak != null ? item.peak : 0.5), intensity: (item.intensity != null ? item.intensity : 1), label: item.label };
    }
    if (item.kind === 'marker' || item.kind === 'note') {
      var P = anchor(item.at);
      var i = (P.type === 'point') ? P.i : lastI;
      var place = item.place || (item.style === 'sweep' ? 'below' : 'above');
      return { id: item.kind + ':' + item.at + ':' + (item.label || ''), kind: item.kind, x: i, price: P.price, label: item.label, style: item.style || 'dot', place: place, panel: item.panel || null };
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
    // Group consecutive CHART beats that resolve to the SAME geometry object (same move
    // AND same params) — the "evolving chart" set. Grouping by move NAME alone (ignoring
    // params) is wrong when params differ between neighbours: it (a) resolves an earlier
    // beat's anchors against a later beat's differently-parameterised geom and THROWS on
    // any anchor the later geom lacks (e.g. an up-breakout's touchHi4 on the down geom),
    // and (b) stacks contradictory labels from opposite-param scenarios on the same anchor
    // (e.g. "rising volume" + "fading volume" both on hh2). This mirrors _describe's own
    // continuity test (prev.geom === d.geom), which already treats a param change as a
    // fresh chart. Same-param evolving charts share the cached geom object → still grouped.
    while (start > 0 && this.beats[start - 1].type === 'CHART' && this.beats[start - 1].chart === move &&
           this._geom('chart', this.beats[start - 1].chart, this.beats[start - 1].params) === geom) start--;
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
      return { kind: 'concept', say: b.say, panel: { kicker: p.kicker, title: p.title, lines: p.lines || [], quadrant: p.quadrant || null } };
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
    this._hideComplete();   // any navigation dismisses the lesson-complete overlay
    var prev = this.scene;
    var d = this._describe(index);
    this.i = index;
    // is-* root class BEFORE the scene renders: _showPanel→_fitConcept measures
    // against .is-concept styling (pmark visibility, panel padding) — swapping
    // it after gave wrong fit decisions on chart→concept transitions
    this.root.classList.remove('is-concept', 'is-chart', 'is-candle');
    this.root.classList.add('is-' + d.kind);

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
      // candle appear times — stagger the newly-revealed candles, but CAP the total
      // reveal tail so a 30-candle chart draws in as briskly as a 10-candle one.
      var newCount = Math.max(1, nCandles - prevReveal);
      var stg = Math.min(STAGGER, REVEAL_TAIL_MAX / newCount) / sp;
      d.candleT0 = [];
      for (var ci = 0; ci < nCandles; ci++) {
        if (cont && ci < prevReveal) d.candleT0[ci] = -1e9;          // already settled
        else if (!animate || REDUCED) d.candleT0[ci] = -1e9;          // instant (jump / reduced)
        else d.candleT0[ci] = now + (ci - prevReveal) * stg;          // stagger (speed-scaled, capped)
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
    // Keep the canvas text-alternative in step with the beat for assistive tech.
    var _beat = this.beats[this.i];
    this.canvas.setAttribute('aria-label',
      (_beat && (_beat.heading || _beat.title))
        ? ('Lesson visualization: ' + (_beat.heading || _beat.title))
        : 'Lesson visualization — described by the narration');
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
      self._lineTimers.push(setTimeout(function () {
        li.classList.add('on');
        self._syncLineWindow(li);   // windowed slides follow the reveal
      }, (110 + idx * 165) / sp));
    });
    // Optional 2×2 matrix graphic (e.g. the Price/OI quadrant): row/col axis headers plus
    // colour-toned cells. Cells fade in one-by-one like the text lines.
    this.pQuad.innerHTML = '';
    this.pQuad.style.display = p.quadrant ? '' : 'none';
    if (p.quadrant) {
      var q = p.quadrant, cols = q.cols || [], rows = q.rows || [], cells = q.cells || [];
      var html = '<div class="ltp2-quad-grid"><div class="ltp2-quad-corner"></div>';
      cols.forEach(function (c) { html += '<div class="ltp2-quad-col">' + fmt(c) + '</div>'; });
      var ci = 0;
      rows.forEach(function (r) {
        html += '<div class="ltp2-quad-row">' + fmt(r) + '</div>';
        for (var k = 0; k < cols.length; k++) {
          var cell = cells[ci++] || {};
          html += '<div class="ltp2-quad-cell tone-' + (cell.tone || 'weak') + '"><b>' + fmt(cell.title || '') + '</b><span>' + fmt(cell.sub || '') + '</span></div>';
        }
      });
      this.pQuad.innerHTML = html + '</div>';
      var qc = this.pQuad.querySelectorAll('.ltp2-quad-cell');
      qc.forEach(function (cel, idx) {
        if (!animate) { cel.classList.add('on'); return; }
        self._lineTimers.push(setTimeout(function () { cel.classList.add('on'); }, (150 + idx * 150) / sp));
      });
    }
    this.panel.classList.add('on');
    this._fitConcept();   // no-scroll rule: scale the slide into the stage if needed
    // clear the canvas behind the panel
    this.ctx.clearRect(0, 0, this.W, this.H);
  };

  /* ───────────────────────── caption + controls ───────────────────────── */
  LTRenderer.prototype._setCaption = function (d) {
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
    // every beat starts reading from the top — the karaoke auto-advance (or a
    // swipe) reveals the tail when the text is longer than the lyric window
    this.capEl.scrollTop = 0;
    this._updateCapMask();
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
    // no karaoke on this path — pan an overflowing caption over the dwell so
    // the tail is still revealed (no-clip holds with narration off/missing)
    this._autoScrollCaption(dwell);
    this._autoTimer = setTimeout(function () {
      if (!self.playing) return;
      if (self.i >= self.beats.length - 1) {
        self._showComplete();   // visual completion cue (no fanfare — silent path)
        self.pause();
      }
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
      return this.opts.audioBase + this.lesson.id + '/' + (i < 10 ? '0' : '') + i + '.mp3' +
             (this.opts.audioVersion ? '?v=' + this.opts.audioVersion : '');
    return null;
  };
  LTRenderer.prototype._stopAudio = function () {
    this._audioToken++;                                     // any in-flight callbacks become stale
    clearTimeout(this._autoTimer);
    cancelAnimationFrame(this._capScrollRaf);               // stop the dwell caption pan
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
    var self = this, url = this.opts.audioBase + this.lesson.id + '/timings.json' +
      (this.opts.audioVersion ? '?v=' + this.opts.audioVersion : '');
    fetch(url, { cache: 'force-cache' })   // safe WITH the version token — bumps bust it
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
    if (w && i >= 0 && w[i]) {
      w[i].classList.add('on');
      var cap = this.capEl;
      if (this.root.classList.contains('ltp2--capflow')) {
        // lyric window: scroll the narrated line CLEAR of the bottom fade (the
        // 26px mask) — scrollIntoView 'nearest' would park it inside the fade
        var wr = w[i].getBoundingClientRect(), cr = cap.getBoundingClientRect();
        var z = cap.clientHeight ? (cr.height / cap.clientHeight) : 1;
        var lineBottom = (wr.bottom - cr.top) / z + cap.scrollTop;
        var target = Math.max(0, Math.ceil(lineBottom - cap.clientHeight + 34));
        if (target > cap.scrollTop) cap.scrollTop = target;   // advance only
        this._updateCapMask();
      } else if (w[i].scrollIntoView) {
        try { w[i].scrollIntoView({ block: 'nearest' }); } catch (e) {}
      }
    }
    this._wordI = i;
  };

  /* edge-fade masks reflect the REAL scroll state (a static fade dimmed the
     narrated line and faked "more below" at the end): cap-above/cap-below on
     the caption, lines-above/lines-below on a windowed bullet list. */
  LTRenderer.prototype._updateCapMask = function () {
    var cap = this.capEl; if (!cap) return;
    var more = cap.scrollHeight - cap.clientHeight > 2;
    var atEnd = !more || cap.scrollTop + cap.clientHeight >= cap.scrollHeight - 2;
    var atTop = cap.scrollTop <= 2;
    cap.classList.toggle('cap-below', more && !atEnd);
    cap.classList.toggle('cap-above', more && !atTop);
  };
  LTRenderer.prototype._updateLinesMask = function () {
    var list = this.pLines; if (!list) return;
    var more = list.scrollHeight - list.clientHeight > 2;
    var atEnd = !more || list.scrollTop + list.clientHeight >= list.scrollHeight - 2;
    var atTop = list.scrollTop <= 2;
    list.classList.toggle('lines-below', more && !atEnd);
    list.classList.toggle('lines-above', more && !atTop);
  };
  // silent-dwell tail reveal: with narration off / no timings / blocked audio,
  // the karaoke never scrolls the caption — pan it over the dwell instead so
  // the no-clip promise holds on every playback path.
  LTRenderer.prototype._autoScrollCaption = function (ms) {
    var cap = this.capEl; if (!cap) return;
    cancelAnimationFrame(this._capScrollRaf);
    var maxTop = cap.scrollHeight - cap.clientHeight;
    if (maxTop <= 2 || this._reduceMotion) return;
    var self = this, start = null, from = cap.scrollTop;
    var delay = ms * 0.25, dur = Math.max(400, ms * 0.6);
    var step = function (t) {
      if (!self.playing) return;
      if (start == null) start = t;
      var el = t - start - delay;
      if (el > 0) {
        var f = Math.min(1, el / dur);
        cap.scrollTop = from + (maxTop - from) * f;
        self._updateCapMask();
        if (f >= 1) return;
      }
      self._capScrollRaf = requestAnimationFrame(step);
    };
    this._capScrollRaf = requestAnimationFrame(step);
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
    this._showComplete();   // reveal the on-screen "Lesson Complete" overlay with the fanfare
  };
  // Reveal the lesson-complete overlay (module name + "Lesson Complete" + lesson title) and
  // auto-fade it. Idempotent; honours the reduced-motion preference via CSS.
  LTRenderer.prototype._showComplete = function () {
    if (!this.complete) return;
    var k = this.complete.querySelector('.ltp2-complete-kicker');
    var t = this.complete.querySelector('.ltp2-complete-title');
    if (k) k.textContent = this.opts.moduleName || '';
    if (k) k.style.display = this.opts.moduleName ? '' : 'none';
    if (t) t.textContent = (this.lesson && this.lesson.title) || '';
    // restart the entrance even if it was shown before this session
    this.complete.classList.remove('show');
    void this.complete.offsetWidth;                 // reflow → re-trigger the keyframe
    this.complete.classList.add('show');
    this.complete.setAttribute('aria-hidden', 'false');
    var self = this;
    clearTimeout(this._completeTimer);
    this._completeTimer = setTimeout(function () { self._hideComplete(); }, 4200);
  };
  LTRenderer.prototype._hideComplete = function () {
    if (!this.complete) return;
    clearTimeout(this._completeTimer);
    this.complete.classList.remove('show');
    this.complete.setAttribute('aria-hidden', 'true');
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
      // subBot is captured in a STABLE local: y1 is reassigned below (the price area
      // shrinks), and sy() closes over its variable — using y1 there would squish every
      // oscillator line/histogram into a sliver near the panel top. Use subBot instead.
      var subH = (y1 - y0) * 0.24, gap = 16, subTop = y1 - subH, subBot = y1;
      var vmax = Math.max.apply(null, panel.series.filter(function (v) { return v != null; }).concat([1]));
      var pmin = panel.min != null ? panel.min : 0, pmax = panel.max != null ? panel.max : vmax;
      sub = {
        type: panel.type, series: panel.series, bands: panel.bands || null, y0: subTop, y1: subBot, label: panel.label || panel.type,
        vmax: vmax,
        sy: function (v) { return subBot - (v - pmin) / ((pmax - pmin) || 1) * (subBot - subTop); }
      };
      y1 = subTop - gap;   // price area shrinks to make room
    }
    var n = geom.candles.length;
    // a move may reserve `lead` blank slots on the right (e.g. Ichimoku's leading
    // cloud projected into the future). Candles fill 0..n-1; the cloud can run past.
    var lead = geom.lead || 0, nTotal = n + lead;
    var slot = (x1 - x0) / nTotal;
    var ymin = yhint.min, ymax = yhint.max;
    return {
      x0: x0, x1: x1, y0: y0, y1: y1, slot: slot, n: n, nTotal: nTotal, sub: sub,
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
    // annotations — markers/trendlines queue their labels into this._mq for the layout
    // pass below; level/zone chips reserve their rects (this._reserved) so the pass can
    // dodge them too (one unified collision set).
    this._mq = []; this._reserved = [];
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
  // The arrays may run past the last candle (forward-displaced leading cloud): each
  // segment reveals with the chart, and slots beyond the candles follow the last one.
  LTRenderer.prototype._drawCloud = function (P, geom, reveal, revealA) {
    var ctx = this.ctx, A = geom.cloud.a, B = geom.cloud.b, n = geom.candles.length;
    var bold = !!geom.cloud.bold;   // opt-in bolder Kumo (thicker fill + defined edges)
    var end = Math.min(A.length, B.length) - 1;
    var ra = function (i) { return revealA(Math.min(i, n - 1)); };   // future slots track the last candle
    // fill
    for (var i = 0; i < end; i++) {
      if (A[i] == null || B[i] == null || A[i + 1] == null || B[i + 1] == null) continue;
      var al = Math.min(ra(i), ra(i + 1)); if (al <= 0) continue;
      var x0 = P.xi(i), x1 = P.xi(i + 1);
      var bull = (A[i] + A[i + 1]) >= (B[i] + B[i + 1]);
      ctx.globalAlpha = Math.min(al, 1);
      ctx.fillStyle = bull ? (bold ? 'rgba(40,200,120,0.30)' : 'rgba(40,200,120,0.18)')
                           : (bold ? 'rgba(242,61,92,0.26)' : 'rgba(242,61,92,0.15)');
      ctx.beginPath();
      ctx.moveTo(x0, P.yp(A[i])); ctx.lineTo(x1, P.yp(A[i + 1]));
      ctx.lineTo(x1, P.yp(B[i + 1])); ctx.lineTo(x0, P.yp(B[i]));
      ctx.closePath(); ctx.fill();
    }
    // Defined Senkou A (green) / Senkou B (red) edge lines that bound the cloud, like a
    // real platform — thicker + more opaque so the Kumo reads as a solid, clear band.
    [{ s: B, c: bold ? 'rgba(242,61,92,.85)' : 'rgba(242,61,92,.55)' }, { s: A, c: bold ? 'rgba(40,200,120,.9)' : 'rgba(40,200,120,.6)' }].forEach(function (edge) {
      ctx.strokeStyle = edge.c; ctx.lineWidth = bold ? 1.6 : 1; ctx.beginPath(); var started = false;
      for (var j = 0; j <= end; j++) {
        if (edge.s[j] == null || ra(j) <= 0) { started = false; continue; }
        var x = P.xi(j), y = P.yp(edge.s[j]);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
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
        ctx.fillStyle = ov.color; ctx.font = '10px Geist Mono, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        // the 60px reserve isn't enough for longer overlay names — fit to the edge
        var ovX = Math.min(lastX + 5, P.x1 - 60);
        self._haloText(shortLabel(ctx, ov.label, P.x1 - ovX - 2), ovX, lastY);
      }
    });
    return more;
  };

  // Bottom sub-panel: volume bars or an oscillator line (with reference bands).
  LTRenderer.prototype._drawSub = function (d, P, revealA) {
    var ctx = this.ctx, S = P.sub, geom = d.geom;
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(P.x0, S.y0); ctx.lineTo(P.x1, S.y0); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = '10px Geist Mono, monospace';
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
        ctx.globalAlpha = revealA(hi) * 0.85; ctx.fillStyle = hv >= 0 ? C.teal : C.bear;
        if (hv >= 0) ctx.fillRect(bx - hbw / 2, by, hbw, zeroY - by);
        else ctx.fillRect(bx - hbw / 2, zeroY, hbw, by - zeroY);
        ctx.globalAlpha = 1;
      }
    } else {
      if (S.bands) S.bands.forEach(function (b) {
        var y = S.sy(b.v);
        ctx.strokeStyle = C.grid; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(P.x0, y); ctx.lineTo(P.x1, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.muted; ctx.font = '9px Geist Mono, monospace';
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

  // Tight-viewport label shortening: keep the pill's SUBJECT — the text before the
  // first delimiter (" — ", " → ", " = ", …) — since the narration/say carries the
  // full sentence; hard ellipsis only as a last resort. ctx.font must already be set.
  function shortLabel(ctx, text, maxW) {
    text = String(text);
    if (ctx.measureText(text).width <= maxW) return text;
    var delims = [' — ', ' → ', ' = ', ' · ', ': ', ' ('], cut = -1;
    for (var i = 0; i < delims.length; i++) {
      var k = text.indexOf(delims[i]);
      if (k > 0 && (cut < 0 || k < cut)) cut = k;
    }
    var best = cut > 0 ? text.slice(0, cut) : text;
    if (ctx.measureText(best).width <= maxW) return best;
    while (best.length > 3 && ctx.measureText(best + '…').width > maxW) best = best.slice(0, -1);
    return best.replace(/[\s,;:—→=·(+]+$/, '') + '…';
  }

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
    // Dedup repeated identical labels — a chart that marks the same thing N times (e.g.
    // "sell the touch" ×3) shows the pill ONCE (leftmost) and keeps only the anchor dot on
    // the rest (dots are already drawn in _anno). Cuts clutter without losing any marker.
    if (q.length > 1) {
      var seenText = {};
      q = q.filter(function (L) { if (seenText[L.text]) return false; seenText[L.text] = 1; return true; });
    }
    // Responsive: shrink the font a step and spread a touch harder on a narrow/scaled
    // canvas so pills don't cram together when the chart is small. OFF (base offset) is
    // raised from the old 12 so every pill clears the candles with room for a leader line.
    // TIGHT (phones): pills also drop their metrics a step AND shorten to the label's
    // leading segment (see shortLabel) — hover/tap pops the full text back.
    var plotW = P.x1 - P.x0;
    var narrow = plotW < 540, tight = plotW < 430;
    var FS = tight ? 9 : narrow ? 10 : 11, padX = tight ? 5 : 7, padY = tight ? 3 : 4, H = FS + padY * 2;
    var OFF = narrow ? 14 : 16, GAP = narrow ? 7 : 6;
    this._plotClamp = { x0: P.x0, x1: P.x1, y0: P.y0, y1: P.y1 };

    // 1. natural position + width (edge-aware horizontally); remember the resting
    //    center→anchor distance so the leader-line pass knows when a pill got pushed.
    ctx.font = FS + 'px Geist Mono, monospace';
    q.forEach(function (L) {
      L.full = L.text;
      if (tight) L.text = shortLabel(ctx, L.text, plotW * 0.44);
      L.w = ctx.measureText(L.text).width + padX * 2; L.h = H;
      L.fw = (L.full === L.text) ? L.w : Math.min(ctx.measureText(L.full).width + padX * 2, plotW - 8);
      L.cx = L.anchorX;
      L.cy = L.place === 'below' ? L.anchorY + OFF + H / 2 : L.anchorY - OFF - H / 2;
      if (L.cx - L.w / 2 < P.x0 + 2) L.cx = P.x0 + 2 + L.w / 2;
      if (L.cx + L.w / 2 > P.x1 - 2) L.cx = P.x1 - 2 - L.w / 2;
      L.rest = OFF + H / 2;
    });

    // 2. de-overlap by iterative vertical relaxation. Each label is seeded on its place
    //    side (above/below its anchor, step 1); overlapping pairs are then pushed apart
    //    along Y until clear. Level/zone chips (this._reserved) are immovable blockers so
    //    marker/trendline pills dodge them too — one unified collision set. Splitting the
    //    push (vs the old one-directional stack) means a pill jammed against the plot edge
    //    shoves its neighbour instead of clipping back into an overlap — which is what kept
    //    labels colliding at narrow/scaled widths. Leader lines keep every pill tied to its
    //    anchor, so a pill nudged off its side still reads correctly.
    var blockers = (this._reserved || []).map(function (z) { return { cx: z.cx, cy: z.cy, w: z.w, h: z.h, fixed: true }; });
    var all = q.concat(blockers);
    function overlapPair(A, B) {
      var ox = (A.w + B.w) / 2 - Math.abs(A.cx - B.cx);
      var oy = (A.h + B.h) / 2 + GAP - Math.abs(A.cy - B.cy);
      return (ox > 1 && oy > 0) ? { ox: ox, oy: oy } : null;
    }
    // Phase A — vertical relaxation: markers prefer to stack above/below so each pill stays
    // over its own dot. Overlapping pairs split the push; a fixed blocker takes none of it.
    for (var round = 0; round < 30; round++) {
      var moved = false;
      for (var a = 0; a < all.length; a++) {
        for (var b = a + 1; b < all.length; b++) {
          var A = all[a], B = all[b];
          if (A.fixed && B.fixed) continue;
          var o = overlapPair(A, B); if (!o) continue;
          var dir = (A.cy <= B.cy) ? -1 : 1;                 // A moves away from B (up if above it)
          if (A.fixed) { B.cy -= dir * o.oy; }
          else if (B.fixed) { A.cy += dir * o.oy; }
          else { A.cy += dir * o.oy / 2; B.cy -= dir * o.oy / 2; }
          moved = true;
        }
      }
      q.forEach(function (L) { L.cy = clamp(L.cy, P.y0 + L.h / 2, P.y1 - L.h / 2); });
      if (!moved) break;
    }
    // Phase B — horizontal escape: anything still overlapping (a pill jammed against the plot
    // edge or an immovable level/zone chip that vertical motion can't clear) slides apart in
    // x. The leader line keeps each pill tied to its anchor, so drifting sideways still reads.
    for (var r2 = 0; r2 < 30; r2++) {
      var moved2 = false;
      for (var c = 0; c < all.length; c++) {
        for (var e = c + 1; e < all.length; e++) {
          var C = all[c], E = all[e];
          if (C.fixed && E.fixed) continue;
          var o2 = overlapPair(C, E); if (!o2) continue;
          var dx = (C.cx <= E.cx) ? -1 : 1;                  // C slides away from E
          if (C.fixed) { E.cx -= dx * o2.ox; }
          else if (E.fixed) { C.cx += dx * o2.ox; }
          else { C.cx += dx * o2.ox / 2; E.cx -= dx * o2.ox / 2; }
          moved2 = true;
        }
      }
      q.forEach(function (L) { L.cx = clamp(L.cx, P.x0 + L.w / 2, P.x1 - L.w / 2); });
      if (!moved2) break;
    }

    // 3. ease hover progress, record hit-rects (at the POPPED size while expanded, so
    //    the pointer/finger can rest on the grown pill without dropping the hover)
    var anim = false;
    q.forEach(function (L) {
      var cur = self._hoverP[L.id] || 0, tgt = (L.id === self._hoverId) ? 1 : 0;
      var nv = self._reduceMotion ? tgt : cur + (tgt - cur) * 0.22;
      if (Math.abs(nv - tgt) < 0.012) nv = tgt;
      if (nv !== cur) anim = true;
      self._hoverP[L.id] = nv; L.hp = nv;
      var ew = L.w + ((L.fw || L.w) - L.w) * nv;
      var ecx = clamp(L.cx, P.x0 + ew / 2, P.x1 - ew / 2);
      self._labelRects.push({ id: L.id, x: ecx - ew / 2, y: L.cy - L.h / 2, w: ew, h: L.h });
    });
    // 4. leader lines UNDER the pills (so each pill covers its own line end), then the
    //    pills themselves (hovered last → on top).
    q.forEach(function (L) { self._paintLeader(L); });
    q.slice().sort(function (a, b) { return (a.hp || 0) - (b.hp || 0); }).forEach(function (L) { self._paintLabel(L, FS); });

    ctx.font = '11px Geist Mono, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    return anim;
  };

  // Thin leader line from a pill back to its exact anchor point, with a small dot on the
  // anchor — so a collision-displaced callout still reads as attached to the candle / line /
  // level it describes. 1px + low-alpha so it never fights the candles; the endpoint follows
  // the pill's hover-pop scale and the line brightens slightly with the hover.
  LTRenderer.prototype._paintLeader = function (L) {
    if (L.anchorX == null || L.anchorY == null) return;
    var ctx = this.ctx, ax = L.anchorX, ay = L.anchorY;
    var s = 1 + 0.17 * (L.hp || 0);
    var hw = (L.w / 2) * s, hh = (L.h / 2) * s;
    var ex = clamp(ax, L.cx - hw, L.cx + hw);      // nearest point on the pill's edge
    var ey = clamp(ay, L.cy - hh, L.cy + hh);
    if (Math.hypot(ax - ex, ay - ey) < 5) return;  // pill already sits on the anchor
    var av = (L.av == null ? 1 : L.av), hp = L.hp || 0;
    ctx.save();
    ctx.strokeStyle = L.color; ctx.lineWidth = 1;
    ctx.globalAlpha = av * (0.4 + 0.35 * hp);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = L.color; ctx.globalAlpha = av * (0.7 + 0.3 * hp);
    ctx.beginPath(); ctx.arc(ax, ay, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  LTRenderer.prototype._paintLabel = function (L, FS) {
    var ctx = this.ctx, hp = L.hp || 0, h = L.h;
    // Shortened pill (tight mode) grows back to its FULL text as it pops; the scale
    // pop is reserved for pills that were never shortened (full ones grow in width
    // instead — scaling an already-wide pill would push it off a phone plot).
    var expands = (L.fw || L.w) > L.w + 1;
    var s = expands ? 1 : 1 + 0.17 * hp;
    var w = L.w + ((L.fw || L.w) - L.w) * hp;
    var text = (expands && hp > 0.55) ? L.full : L.text;
    var cx = L.cx, pc = this._plotClamp;
    if (pc) cx = clamp(cx, pc.x0 + w * s / 2, pc.x1 - w * s / 2);
    ctx.save();
    ctx.globalAlpha = L.av;
    ctx.translate(cx, L.cy); ctx.scale(s, s);
    // legibility pill (a touch more opaque + a colour-tinted border as it pops)
    this._roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fillStyle = 'rgba(10,8,18,' + (0.8 + 0.16 * hp) + ')'; ctx.fill();
    // always-on thin colour-tinted border so every chip reads as an intentional tag
    ctx.lineWidth = 1; ctx.strokeStyle = L.color; ctx.globalAlpha = L.av * 0.38;
    this._roundRect(-w / 2, -h / 2, w, h, 6); ctx.stroke(); ctx.globalAlpha = L.av;
    if (hp > 0.01) {   // brighten + glow on hover-pop
      ctx.lineWidth = 1.2; ctx.strokeStyle = L.color; ctx.globalAlpha = L.av * (0.4 + 0.6 * hp);
      ctx.shadowColor = L.color; ctx.shadowBlur = 9 * hp;
      this._roundRect(-w / 2, -h / 2, w, h, 6); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = L.av;
    }
    ctx.fillStyle = L.color; ctx.font = FS + 'px Geist Mono, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0.5);
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  // pointer hover over a marker label → pop it (hit-test the recorded rects)
  LTRenderer.prototype._hitLabel = function (e) {
    var r = this.canvas.getBoundingClientRect();
    // map the pointer (visual px) into the drawing space (this.W/H) by ratio —
    // correct under any body zoom / CSS scaling of the stage
    var sx = r.width ? this.W / r.width : 1, sy = r.height ? this.H / r.height : 1;
    var mx = (e.clientX - r.left) * sx, my = (e.clientY - r.top) * sy;
    var L = this._labelRects || [];
    for (var i = L.length - 1; i >= 0; i--) {
      var b = L[i];
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) return b.id;
    }
    return null;
  };
  LTRenderer.prototype._onHover = function (e) { this._setHover(this._hitLabel(e)); };
  LTRenderer.prototype._setHover = function (id) {
    if (id === this._hoverId) return;
    this._hoverId = id;
    this._kick();   // animate the pop (raf loop restarts if it had settled)
  };

  LTRenderer.prototype._anno = function (P, an, av) {
    var ctx = this.ctx;
    var tight = (P.x1 - P.x0) < 430;   // phones: chips shrink a step + shorten to their subject
    ctx.globalAlpha = av;
    if (an.kind === 'level') {
      var y = P.yp(an.price);
      var _lc = an.color || C.level;
      ctx.strokeStyle = _lc; ctx.lineWidth = 1.4; ctx.setLineDash([7, 5]);
      var xr = P.x0 + (P.x1 - P.x0) * av;          // draw left→right
      ctx.beginPath(); ctx.moveTo(P.x0, y); ctx.lineTo(xr, y); ctx.stroke();
      ctx.setLineDash([]);
      // Label as a solid colour-coded PILL with dark, high-contrast text (matches the
      // ECharts course charts) — far more legible than thin coloured text over candles.
      if (an.label) {
        ctx.font = (tight ? '700 10px' : '700 11px') + ' Geist Mono, monospace';
        var _lt = tight ? shortLabel(ctx, an.label, (P.x1 - P.x0) * 0.48) : an.label;
        var padX = tight ? 5 : 6, padY = tight ? 2 : 3, lh = tight ? 11 : 12, tw = ctx.measureText(_lt).width;
        var pw = tw + padX * 2, ph = lh + padY * 2;
        var pxL = (an.side === 'right') ? (P.x1 - 4 - pw) : (P.x0 + 4);
        var pyT = y - 5 - ph;                       // sit just above the line
        if (pyT < P.y0 + 2) pyT = y + 5;            // flip below if it would clip the top
        ctx.globalAlpha = av;
        this._roundRect(pxL, pyT, pw, ph, 4); ctx.fillStyle = _lc; ctx.fill();
        ctx.fillStyle = '#0b0b0e'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(_lt, pxL + padX, pyT + ph / 2 + 0.5);
        ctx.globalAlpha = 1;
        // reserve this pill so marker/trendline callouts dodge it (see _drawMarkerLabels)
        (this._reserved || (this._reserved = [])).push({ cx: pxL + pw / 2, cy: pyT + ph / 2, w: pw, h: ph });
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
        // dark chip + tone-coloured text (same tag template as marker chips)
        var _zc = an.tone === 'risk' ? C.bear : an.tone === 'reward' ? C.teal : (an.dir === 'above' ? C.bear : C.teal);
        ctx.font = (tight ? '700 9px' : '700 10px') + ' Geist Mono, monospace';
        var _zl = tight ? shortLabel(ctx, an.label, (P.x1 - P.x0) * 0.6) : an.label;
        var zpadX = tight ? 5 : 6, ztw = ctx.measureText(_zl).width, zpw = ztw + zpadX * 2, zph = tight ? 15 : 17;
        var zx = (P.x0 + P.x1) / 2 - zpw / 2, zy = top + depthPx / 2 - zph / 2;
        ctx.globalAlpha = av;
        this._roundRect(zx, zy, zpw, zph, 5); ctx.fillStyle = 'rgba(10,8,18,0.82)'; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = _zc; ctx.globalAlpha = av * 0.38; this._roundRect(zx, zy, zpw, zph, 5); ctx.stroke(); ctx.globalAlpha = av;
        ctx.fillStyle = _zc; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(_zl, zx + zpadX, zy + zph / 2 + 0.5);
        ctx.globalAlpha = 1;
        // reserve this chip so marker/trendline callouts dodge it (see _drawMarkerLabels)
        (this._reserved || (this._reserved = [])).push({ cx: zx + zpw / 2, cy: zy + zph / 2, w: zpw, h: zph });
      }
    } else if (an.kind === 'heatmap') {
      // Intensity-ramped liquidity band: horizontal strips whose brightness follows a
      // density bump peaking at `peak` (0=top … 1=bottom) — brighter = denser liquidity.
      var yA = P.yp(an.p1), yB = P.yp(an.p2), yTop = Math.min(yA, yB), yBot = Math.max(yA, yB), band = Math.max(1, yBot - yTop);
      var rgb = an.tone === 'short' ? '255,46,136' : an.tone === 'liq' ? '255,204,0' : '0,212,212';
      var rows = 16;
      for (var hr = 0; hr < rows; hr++) {
        var hf = hr / (rows - 1);
        var dens = Math.exp(-Math.pow((hf - an.peak) / 0.22, 2));   // gaussian density peak
        // per-band intensity (default 1) lets a lesson draw a lighter secondary band
        ctx.globalAlpha = av * (0.05 + 0.55 * dens) * (an.intensity != null ? an.intensity : 1);
        ctx.fillStyle = 'rgb(' + rgb + ')';
        ctx.fillRect(P.x0, yTop + hf * band, P.x1 - P.x0, band / rows + 1);
      }
      ctx.globalAlpha = av;
      if (an.label) {
        ctx.fillStyle = C.ink; ctx.font = (tight ? '9px' : '10px') + ' Geist Mono, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        this._haloText(tight ? shortLabel(ctx, an.label, (P.x1 - P.x0) * 0.55) : an.label, P.x0 + 6, yTop + an.peak * band);
      }
    } else if (an.kind === 'marker' || an.kind === 'note') {
      var mx = P.xi(an.x), my;
      if (an.panel === 'sub' && P.sub && P.sub.series) { var _sv = P.sub.series[an.x]; my = (_sv != null) ? P.sub.sy(_sv) : (P.sub.y0 + P.sub.y1) / 2; }
      else my = P.yp(an.price);
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
      var tlCol = an.style === 'resistance' ? C.bear : C.teal;
      ctx.strokeStyle = tlCol; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); ctx.stroke();
      // Route the label through the marker-label system (pill + collision + hover + leader
      // line) instead of raw text, so it's hoverable like the marker pills. Anchor it ~65%
      // along the DRAWN portion of the line so it tracks the reveal and sits on its line.
      if (an.label && av > 0.5) {
        var tX = ax + (lx - ax) * 0.65, tY = ay + (ly - ay) * 0.65;
        (this._mq || (this._mq = [])).push({
          id: an.id || ('tl:' + an.x1 + '-' + an.x2 + ':' + an.label),
          text: an.label, color: tlCol, av: av,
          anchorX: tX, anchorY: tY, place: an.style === 'resistance' ? 'above' : 'below'
        });
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
        ctx.fillStyle = C.ink; ctx.font = '12px Geist Mono, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        // fit to the room right of the candle — phone stages clipped these raw
        ctx.fillText(shortLabel(ctx, an.label || '', this.W - lblX - 10), lblX, midY);
      } else if (an.kind === 'marker' || an.kind === 'note') {
        var my = yp(an.price);
        ctx.fillStyle = C.ink; ctx.font = '12px Geist Mono, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(shortLabel(ctx, an.label || '', this.W - lblX - 10), lblX, my);
      }
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    return more;
  };

  LTRenderer.prototype.destroy = function () {
    this.pause(); this._clearLines();
    clearTimeout(this._completeTimer);   // else it fires on detached nodes ≤4.2s later
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
