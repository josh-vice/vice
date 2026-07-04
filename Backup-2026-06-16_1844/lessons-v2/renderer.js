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
  var C = { teal: '#00d4d4', bear: '#f2f2f2', grid: 'rgba(255,255,255,.05)', level: '#cc4444',
    zoneBull: 'rgba(0,212,212,.10)', zoneBear: 'rgba(204,68,68,.12)', ink: '#e8e8f0', muted: '#8d8aa3',
    markSweep: '#ffb454', markRev: '#00d4d4' };

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
    this.beats = lesson.beats || [];
    this.i = -1;
    this.playing = false;
    this._geomCache = {};
    this._lineTimers = [];
    this._autoTimer = null;
    this._raf = 0;
    this.scene = null;        // currently displayed scene descriptor
    this.audio = null;        // future TTS element, if any
    this._build(mount);
    this.go(0, false);
  }

  /* ───────────────────────── DOM scaffold ───────────────────────── */
  LTRenderer.prototype._build = function (mount) {
    var root = el('div', 'ltp2');
    this.root = root;

    var stage = el('div', 'ltp2-stage');
    this.canvas = el('canvas', 'ltp2-canvas');
    this.heading = el('div', 'ltp2-heading');
    this.panel = el('div', 'ltp2-panel');
    this.panel.innerHTML = '<div class="ltp2-kicker"></div><div class="ltp2-title"></div><ul class="ltp2-lines"></ul>';
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

    var ctr = el('div', 'ltp2-controls');
    this.btnPrev = el('button', 'ltp2-btn', '‹ Back');
    this.btnPlay = el('button', 'ltp2-btn play', 'Play');
    this.btnNext = el('button', 'ltp2-btn', 'Next ›');
    this.counter = el('span', 'ltp2-counter');
    this.dots = el('div', 'ltp2-dots');
    ctr.appendChild(this.btnPrev); ctr.appendChild(this.btnPlay); ctr.appendChild(this.btnNext);
    ctr.appendChild(this.counter); ctr.appendChild(this.dots);
    root.appendChild(ctr);

    mount.appendChild(root);

    // dots
    var self = this;
    this.beats.forEach(function (b, idx) {
      var d = el('button', 'ltp2-dot ' + b.type.toLowerCase());
      d.title = (idx + 1) + '. ' + b.type;
      d.addEventListener('click', function () { self.pause(); self.go(idx, false); });
      self.dots.appendChild(d);
    });

    this.btnPrev.addEventListener('click', function () { self.pause(); self.prev(); });
    this.btnNext.addEventListener('click', function () { self.pause(); self.next(); });
    this.btnPlay.addEventListener('click', function () { self.playing ? self.pause() : self.play(); });
    stage.addEventListener('click', function () { if (!self.playing) self.next(); });

    this._key = function (e) {
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
        else d.candleT0[ci] = now + (ci - prevReveal) * STAGGER;      // stagger the new ones
      }
      d._t0 = (!animate || REDUCED) ? -1e9 : now;   // single-candle beat reveal time
      var lastCandleT0 = d.candleT0.length ? d.candleT0[d.candleT0.length - 1] : now;
      // annotation appear times
      var prevAnno = {};
      if (cont && prev.annos) prev.annos.forEach(function (a) { prevAnno[a.id] = 1; });
      d.annos.forEach(function (a) {
        if ((cont && prevAnno[a.id]) || !animate || REDUCED) a.t0 = -1e9;
        else a.t0 = Math.max(now, lastCandleT0 + CANDLE_MS) + ANNO_DELAY;
      });
      this.heading.textContent = d.heading || '';
      this.heading.classList.toggle('on', !!d.heading);
    } else {
      // concept
      this.heading.classList.remove('on');
      this._showPanel(d.panel, animate && !REDUCED);
    }

    this.scene = d;
    this._setCaption(d);
    this._setControls();
    this._kick();
    this._cueAudio(this.beats[index]);   // future TTS hook (no-op until audio exists)
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
    var self = this;
    (p.lines || []).forEach(function (ln, idx) {
      var li = el('li', null, fmt(ln));
      self.pLines.appendChild(li);
      if (!animate) { li.classList.add('on'); return; }
      self._lineTimers.push(setTimeout(function () { li.classList.add('on'); }, 220 + idx * 420));
    });
    this.panel.classList.add('on');
    // clear the canvas behind the panel
    this.ctx.clearRect(0, 0, this.W, this.H);
  };

  /* ───────────────────────── caption + controls ───────────────────────── */
  LTRenderer.prototype._setCaption = function (d) {
    this.capTag.className = 'tag ' + (d.kind === 'concept' ? 'concept' : d.kind === 'candle' ? 'candle' : '');
    this.capTag.textContent = d.kind.toUpperCase();
    this.capSay.innerHTML = fmt(d.say || '');
  };
  LTRenderer.prototype._setControls = function () {
    this.btnPrev.disabled = this.i <= 0;
    this.btnNext.disabled = this.i >= this.beats.length - 1;
    this.btnPlay.textContent = this.playing ? 'Pause' : 'Play';
    this.counter.innerHTML = '<b>' + (this.i + 1) + '</b> / ' + this.beats.length;
    var kids = this.dots.children;
    for (var k = 0; k < kids.length; k++) kids[k].classList.toggle('on', k === this.i);
  };

  /* ───────────────────────── autoplay ───────────────────────── */
  LTRenderer.prototype.play = function () { this.playing = true; this._setControls(); this._scheduleAuto(); };
  LTRenderer.prototype.pause = function () { this.playing = false; clearTimeout(this._autoTimer); this._setControls(); };
  LTRenderer.prototype._scheduleAuto = function () {
    clearTimeout(this._autoTimer);
    if (!this.playing) return;
    if (this.audio && !this.audio.paused) return;   // audio drives advance via 'ended'
    var b = this.beats[this.i];
    var dwell = b.dwell != null ? b.dwell : clamp(words(b.say) * 300 + 800, 2600, 9000);
    if (this.scene && (this.scene.kind === 'chart' || this.scene.kind === 'candle')) dwell += 700;  // let candles settle
    var self = this;
    this._autoTimer = setTimeout(function () {
      if (self.i >= self.beats.length - 1) { self.pause(); return; }
      self.go(self.i + 1); self._scheduleAuto();
    }, dwell);
  };

  /* ───────── future per-beat audio (ElevenLabs TTS) — cue point only ───────── */
  LTRenderer.prototype._cueAudio = function (beat) {
    // Authoring is already audio-ready: when `beat.audio` exists, play it here and
    // advance on 'ended'. Until then this is a no-op and beats stay silent.
    if (this.audio) { try { this.audio.pause(); } catch (e) {} this.audio = null; }
    if (!beat || !beat.audio) return;
    var self = this;
    var a = new Audio(beat.audio); this.audio = a;
    a.addEventListener('ended', function () { if (self.playing) { self.next(); self._scheduleAuto(); } });
    if (this.playing) a.play().catch(function () {});
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
    var col = colOverride || (bull ? C.teal : C.bear);
    var x = P.xi(i);
    var bw = Math.max(2, P.slot * 0.62);
    var oy = P.yp(o), cy = P.yp(cl);
    // grow body from open as alpha→1
    var topFull = Math.min(oy, cy), botFull = Math.max(oy, cy);
    var top = oy + (topFull - oy) * alpha, bot = oy + (botFull - oy) * alpha;
    // wick
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, bw * 0.14);
    ctx.beginPath(); ctx.moveTo(x, P.yp(hi)); ctx.lineTo(x, P.yp(lo)); ctx.stroke();
    // body — bullish teal, bearish white, both filled (site candle style)
    ctx.fillStyle = col;
    var h = Math.max(1, bot - top);
    ctx.fillRect(x - bw / 2, top, bw, h);
    ctx.globalAlpha = 1;
  };

  LTRenderer.prototype._drawChart = function (now, d) {
    var geom = d.geom, P = this._plot(geom, geom.yhint);
    var revealA = function (i) { return easeOut((now - d.candleT0[i]) / CANDLE_MS); };
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
    // annotations
    for (var j = 0; j < d.annos.length; j++) {
      var an = d.annos[j];
      var av = easeOut((now - an.t0) / ANNO_MS);
      if (av <= 0) { more = true; continue; }
      if (av < 1) more = true;
      this._anno(P, an, av);
    }
    // bottom sub-panel (volume / oscillator)
    if (P.sub) this._drawSub(d, P, revealA);
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
        ctx.fillText(ov.label, Math.min(lastX + 5, P.x1 - 60), lastY);
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
        if (an.side === 'right') { ctx.textAlign = 'right'; ctx.fillText(an.label, P.x1 - 4, y - 4); }
        else { ctx.textAlign = 'left'; ctx.fillText(an.label, P.x0 + 4, y - 4); }
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
        ctx.fillStyle = C.muted; ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(an.label, (P.x0 + P.x1) / 2, top + depthPx / 2);
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
        var below = an.place === 'below';
        ctx.fillStyle = col; ctx.font = '11px JetBrains Mono, monospace';
        ctx.textBaseline = below ? 'top' : 'bottom';
        // edge-aware: keep the label inside the plot instead of clipping at the rim
        var tw = ctx.measureText(an.label).width, tx = mx, al = 'center';
        if (mx + tw / 2 > P.x1) { al = 'right'; tx = P.x1; }
        else if (mx - tw / 2 < P.x0) { al = 'left'; tx = P.x0; }
        ctx.textAlign = al;
        ctx.fillText(an.label, tx, below ? my + 10 : my - 10);
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
        ctx.fillText(an.label, ax + 4, an.style === 'resistance' ? ay - 5 : ay + 5);
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
    var a = easeOut((now - d._t0) / 420);
    var more = a < 1;
    var bull = cl >= o, col = bull ? C.teal : C.bear;
    ctx.globalAlpha = a;
    // wick
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, yp(hi)); ctx.lineTo(cx, yp(lo)); ctx.stroke();
    // body
    var top = Math.min(yp(o), yp(cl)), h = Math.max(2, Math.abs(yp(o) - yp(cl)));
    ctx.fillStyle = col; ctx.fillRect(cx - bw / 2, top, bw, h);
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
    if (this.audio) { try { this.audio.pause(); } catch (e) {} }
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
  };

  g.LTRenderer = LTRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
