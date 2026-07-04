/* ═══════════════════════════════════════════════════════════════════════════
   lt-player.js — native RECONSTRUCTION lesson player.

   Plays a reconstruction.json timeline. Every scene is rebuilt as live native
   content — NO images:
     • text  scenes → animated HTML/CSS slides (title, definition, bullets, recap)
     • chart scenes → synthetic candles via the REUSED engine (lt-chartgen.js
       `ltCandles` or lt-simulator.js `generateMarket`→`viewMarket`) rendered with
       ECharts, built in left-to-right then S/R lines / zones / annotations draw on,
       timed to the caption. Diagonal trendlines use ECharts two-coord markLines
       (the proposed `def.trendlines` shape — see reconstruction_notes.md §2).
   Brand: #000 / cyan #00d4d4 / JetBrains Mono ("Terminal"). Self-contained CSS.

   Deps (loaded by the host page): echarts, lt-chartgen.js (ltCandles/ltLabels),
   lt-simulator.js (generateMarket/viewMarket). Usage:
     new LTPlayer(containerEl, reconstructionDoc);   p.destroy();
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var CY = '#00d4d4', RED = '#f23d5c', TXT = '#f6f5fb', DIM = '#716c88';
  var BULL = '#00d4d4', BEAR = '#f23d5c';
  var REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fmtTime(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  // Chart labels are drawn into a <canvas>, so the site font CSS rule can't reach them.
  // Read the active typeface (Terminal/JetBrains Mono default · Inter when chosen) at
  // chart-build time so they match the DOM captions; picked up on the next scene render.
  function labelFont() {
    try { return document.documentElement.classList.contains('font-inter') ? 'Inter, sans-serif' : 'JetBrains Mono'; }
    catch (e) { return 'JetBrains Mono'; }
  }
  // real-price axis label: thousands get commas, sub-$100 keeps cents ($3.79), tiny keeps more.
  function fmtPrice(v) {
    var a = Math.abs(v);
    if (a >= 1000) return Math.round(v).toLocaleString('en-US');
    if (a >= 100)  return String(Math.round(v));
    if (a >= 1)    return String(Math.round(v * 100) / 100);
    return String(Math.round(v * 10000) / 10000);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function emphasize(text, key) {
    if (!key) return esc(text);
    var i = text.toLowerCase().indexOf(String(key).toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<span class="ltp-pop">' + esc(text.slice(i, i + key.length)) +
           '</span>' + esc(text.slice(i + key.length));
  }
  // Per-candle colour schemes mirroring the indicator chapters' candle systems
  // (Crayons / Trend Buddy / Genie …). Colours each candle by its short-term trend.
  function _schemeColors(ohlc, scheme) {
    var P = ({
      trendbuddy: ['#00d4d4', '#ff2e88', '#5b5570'],
      crayons:    ['#7cff6b', '#f23d5c', '#5b5570'],
      genie:      ['#00d4d4', '#f23d5c', '#8a84a6'],
      pal:        ['#00d4d4', '#f23d5c', '#5b5570'],
      heuristics: ['#00d4d4', '#ff2e88', '#5b5570']
    })[scheme] || ['#00d4d4', '#f23d5c', '#5b5570'];
    var k = 3, out = [];
    for (var i = 0; i < ohlc.length; i++) {
      var ref = ohlc[Math.max(0, i - k)][1], diff = ohlc[i][1] - ref, thr = Math.abs(ref) * 0.004;
      out.push(diff > thr ? P[0] : diff < -thr ? P[1] : P[2]);
    }
    return out;
  }

  function LTPlayer(container, doc, timeline, cues, chartmeta) {
    this.container = container;
    this.doc = doc;
    this.chunks = (doc.chunks || []).slice();
    this.tail = doc.tail_secs || 4;
    var n = this.chunks.length;
    this.duration = doc.duration || (n ? this.chunks[n - 1].start_secs + this.tail : 0);
    this.playhead = 0; this.playing = false; this.currentIdx = -1;
    this._raf = null; this._last = null; this._scrubbing = false; this._wasPlaying = false;
    this._chart = null; this._scene = null; this._capText = null;
    try { this.capSize = localStorage.getItem('ltp-cap-size') || 'm'; } catch (e) { this.capSize = 'm'; }
    var _vol = 1, _muted = false;                          // persisted audio volume / mute
    try { var _sv = parseFloat(localStorage.getItem('ltp-vol')); if (_sv >= 0 && _sv <= 1) _vol = _sv; _muted = localStorage.getItem('ltp-muted') === '1'; } catch (e) {}
    this.volume = _vol; this.muted = _muted;

    // AUDIO-DRIVEN mode: REAL measured TTS clip durations (timeline.json) drive pacing —
    // chunk starts/dwells come from audio, not the transcript start_secs.
    this.audioMode = !!(timeline && timeline.chunks && timeline.chunks.length);
    if (this.audioMode) {
      this.gapMs = (timeline.gap_ms || 0);
      this._audioBase = (doc && doc._audioBase) || '';
      var tl = timeline.chunks;
      for (var ai = 0; ai < this.chunks.length && ai < tl.length; ai++) {
        this.chunks[ai].start_secs = tl[ai].audio_start;
        this.chunks[ai]._adur = tl[ai].audio_duration;
        this.chunks[ai]._clip = tl[ai].clip;
      }
      this.duration = timeline.total_timeline || this.duration;
    }

    // CUE TRACK (STEP 1/2): per-chunk timed accent cues fired against the audio timeline.
    // Pre-pass output (lt-recon-cues-courseN.js) — the player NEVER string-matches captions at
    // runtime. Cues are grounded in the scene overlays + dialogue timing (build_cues_all.py).
    this.cueMode = !!(cues && cues.cues && cues.cues.length);
    this._cuesByChunk = {};
    if (this.cueMode) {
      cues.cues.forEach(function (c, k) {
        c._id = c.chunk_index + ':' + k;
        (this._cuesByChunk[c.chunk_index] = this._cuesByChunk[c.chunk_index] || []).push(c);
      }, this);
    }
    this._activeIds = {};

    // CHART META (lt-recon-chartmeta-courseN.js): per-chart-chunk real asset/pair/timeframe
    // (ticker) + price-axis calibration (affine map real = a*synth + b). Inspectable pre-pass —
    // the player applies it; it never guesses an asset/price at runtime.
    this._metaByChunk = (chartmeta && chartmeta.chunks) ? chartmeta.chunks : {};

    this._build();
    this._goto(0, true);
    this._loop(performance.now());
  }

  LTPlayer.prototype.dwell = function (i) {
    var c = this.chunks;
    if (this.audioMode) return c[i]._adur || 0.5;        // the real clip length
    return (i < c.length - 1) ? (c[i + 1].start_secs - c[i].start_secs) : (this.duration - c[i].start_secs);
  };
  LTPlayer.prototype.indexAt = function (t) {
    var c = this.chunks, idx = 0;
    for (var i = 0; i < c.length; i++) { if (c[i].start_secs <= t) idx = i; else break; }
    return idx;
  };

  /* ── DOM ─────────────────────────────────────────────────────────────────── */
  LTPlayer.prototype._build = function () {
    LTPlayer._css();
    var n = this.chunks.length, ticks = '';
    // subtle scrub markers ONLY at chart sections (navigation that means something),
    // not one per chunk — keeps the bar clean on long lessons.
    for (var i = 0; i < n; i++) if (this.chunks[i].frame_type === 'chart')
      ticks += '<span class="ltp-tick" style="left:' +
        (this.chunks[i].start_secs / this.duration * 100) + '%"></span>';
    var root = document.createElement('div'); root.className = 'ltp-root';
    root.innerHTML =
      '<div class="ltp-stage">' +
        '<div class="ltp-chart"></div>' +
        '<div class="ltp-text"></div>' +
        '<div class="ltp-symbol" hidden></div>' +
        '<div class="ltp-tag" hidden></div>' +
        '<div class="ltp-cap-wrap"><span class="ltp-chip" hidden></span><p class="ltp-cap"></p></div>' +
        '<button class="ltp-big" aria-label="Play" tabindex="-1">' + LTPlayer._icon('play') + '</button>' +
      '</div>' +
      '<div class="ltp-bar">' +
        '<button class="ltp-nav ltp-prev" aria-label="Previous section">' + LTPlayer._icon('prev') + '</button>' +
        '<button class="ltp-pp" aria-label="Play">' + LTPlayer._icon('play') + '</button>' +
        '<button class="ltp-nav ltp-next" aria-label="Next section">' + LTPlayer._icon('next') + '</button>' +
        '<span class="ltp-t ltp-cur">0:00</span>' +
        '<div class="ltp-scrub" tabindex="0" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="' +
          Math.round(this.duration) + '" aria-valuenow="0">' +
          '<div class="ltp-scrub-bg"></div><div class="ltp-fill"></div>' +
          '<div class="ltp-ticks">' + ticks + '</div><div class="ltp-handle"></div>' +
          '<div class="ltp-tip" hidden>0:00</div></div>' +
        '<span class="ltp-t ltp-dur">' + fmtTime(this.duration) + '</span>' +
        (this.audioMode ?
          '<div class="ltp-vol-wrap">' +
            '<button class="ltp-vol" aria-label="Mute">' + LTPlayer._icon('vol') + '</button>' +
            '<input class="ltp-vol-slider" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume">' +
          '</div>' : '') +
        '<div class="ltp-cc-wrap">' +
          '<button class="ltp-cc" aria-label="Caption size" aria-haspopup="true">' + LTPlayer._icon('cc') + '</button>' +
          '<div class="ltp-cc-menu" role="menu" hidden>' +
            '<div class="ltp-cc-head">Captions</div>' +
            '<button data-size="s" role="menuitem">Small</button>' +
            '<button data-size="m" role="menuitem">Medium</button>' +
            '<button data-size="l" role="menuitem">Large</button>' +
            '<button data-size="off" role="menuitem">Off</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (this.audioMode ? '<audio class="ltp-audio" preload="auto" style="display:none"></audio>' : '');
    this.container.appendChild(root);
    this.root = root;
    this.audioEl = root.querySelector('.ltp-audio');
    this.stageEl = root.querySelector('.ltp-stage');
    this.chartEl = root.querySelector('.ltp-chart');
    this.textEl = root.querySelector('.ltp-text');
    this.tagEl = root.querySelector('.ltp-tag');
    this.symEl = root.querySelector('.ltp-symbol');
    this.capEl = root.querySelector('.ltp-cap');
    this.chipEl = root.querySelector('.ltp-chip');
    this.bigEl = root.querySelector('.ltp-big');
    this.ppEl = root.querySelector('.ltp-pp');
    this.prevEl = root.querySelector('.ltp-prev');
    this.nextEl = root.querySelector('.ltp-next');
    this.curEl = root.querySelector('.ltp-cur');
    this.scrub = root.querySelector('.ltp-scrub');
    this.fillEl = root.querySelector('.ltp-fill');
    this.handleEl = root.querySelector('.ltp-handle');
    this.tipEl = root.querySelector('.ltp-tip');
    this.ccBtn = root.querySelector('.ltp-cc');
    this.ccMenu = root.querySelector('.ltp-cc-menu');
    this.volBtn = root.querySelector('.ltp-vol');
    this.volSlider = root.querySelector('.ltp-vol-slider');
    var self = this;
    this.stageEl.onclick = function () { self.toggle(); };          // click the media to play/pause
    this.ppEl.onclick = function (e) { e.stopPropagation(); self.toggle(); };
    this.prevEl.onclick = function (e) { e.stopPropagation(); self.step(-1); };
    this.nextEl.onclick = function (e) { e.stopPropagation(); self.step(1); };
    this.ccBtn.onclick = function (e) { e.stopPropagation(); self.ccMenu.hidden = !self.ccMenu.hidden; };
    [].forEach.call(this.ccMenu.querySelectorAll('button'), function (b) {
      b.onclick = function (e) { e.stopPropagation(); self._applyCapSize(b.dataset.size); self.ccMenu.hidden = true; };
    });
    if (this.volBtn) {
      this.volBtn.onclick = function (e) { e.stopPropagation(); self._toggleMute(); };
      this.volSlider.oninput = function () { self._setVolume(parseFloat(self.volSlider.value)); };
      this.volSlider.onclick = function (e) { e.stopPropagation(); };
    }
    this._closeMenu = function () { if (self.ccMenu) self.ccMenu.hidden = true; };
    document.addEventListener('click', this._closeMenu);
    this._bindScrub();
    this._applyCapSize(this.capSize);
    this._applyVolume();
    if (this.audioEl) this.audioEl.addEventListener('ended', function () { self._onAudioEnd(); });
    this._resize = function () { if (self._chart) self._chart.resize(); };
    global.addEventListener('resize', this._resize);
  };

  LTPlayer.prototype._applyCapSize = function (size) {
    this.capSize = size;
    this.root.classList.remove('ltp-cap-s', 'ltp-cap-m', 'ltp-cap-l', 'ltp-cap-off');
    this.root.classList.add('ltp-cap-' + size);
    try { localStorage.setItem('ltp-cap-size', size); } catch (e) {}
    if (this.ccMenu) [].forEach.call(this.ccMenu.querySelectorAll('button'), function (b) {
      b.classList.toggle('ltp-cc-active', b.dataset.size === size);
    });
  };

  /* ── volume ────────────────────────────────────────────────────────────── */
  LTPlayer.prototype._setVolume = function (v) {
    v = clamp(isNaN(v) ? this.volume : v, 0, 1);
    this.volume = v;
    if (v > 0) this.muted = false;                      // dragging up unmutes
    this._persistVol(); this._applyVolume();
  };
  LTPlayer.prototype._toggleMute = function () {
    this.muted = !this.muted;
    if (!this.muted && this.volume === 0) this.volume = 0.5;  // unmute from zero → audible
    this._persistVol(); this._applyVolume();
  };
  LTPlayer.prototype._persistVol = function () {
    try { localStorage.setItem('ltp-vol', String(this.volume)); localStorage.setItem('ltp-muted', this.muted ? '1' : '0'); } catch (e) {}
  };
  LTPlayer.prototype._applyVolume = function () {
    if (this.audioEl) { this.audioEl.volume = this.volume; this.audioEl.muted = this.muted; }
    var shown = this.muted ? 0 : this.volume;
    if (this.volSlider && parseFloat(this.volSlider.value) !== shown) this.volSlider.value = shown;
    if (this.volBtn) {
      var name = (this.muted || this.volume === 0) ? 'volMute' : (this.volume < 0.5 ? 'volLow' : 'vol');
      this.volBtn.innerHTML = LTPlayer._icon(name);
      this.volBtn.setAttribute('aria-label', this.muted ? 'Unmute' : 'Mute');
    }
  };

  LTPlayer.prototype._bindScrub = function () {
    var self = this;
    function at(e) { var r = self.scrub.getBoundingClientRect();
      var x = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width;
      self.seek(clamp(x, 0, 1) * self.duration); }
    function down(e) { self._scrubbing = true; self._wasPlaying = self.playing; self.playing = false;
      at(e); e.preventDefault();
      document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
      document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', up); }
    function move(e) { if (self._scrubbing) { at(e); e.preventDefault(); } }
    function up() { self._scrubbing = false;
      if (self._wasPlaying) { if (self.playhead >= self.duration) self.playhead = 0; self.play(); }
      document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); }
    this.scrub.addEventListener('mousedown', down);
    this.scrub.addEventListener('touchstart', down, { passive: false });
    // hover preview tooltip
    this.scrub.addEventListener('mousemove', function (e) {
      if (self._scrubbing) return;
      var r = self.scrub.getBoundingClientRect(), frac = clamp((e.clientX - r.left) / r.width, 0, 1);
      self.tipEl.hidden = false; self.tipEl.textContent = fmtTime(frac * self.duration);
      self.tipEl.style.left = (frac * 100) + '%';
    });
    this.scrub.addEventListener('mouseleave', function () { self.tipEl.hidden = true; });
    this.scrub.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowRight') self.seek(self.playhead + 5);
      else if (k === 'ArrowLeft') self.seek(self.playhead - 5);
      else if (k === 'ArrowUp' || k === ']') self.step(1);
      else if (k === 'ArrowDown' || k === '[') self.step(-1);
      else if (k === 'Home') self.seek(0);
      else if (k === 'End') self.seek(self.duration);
      else if (k === ' ') self.toggle();
      else return;
      e.preventDefault();
    });
  };

  /* ── transport ─────────────────────────────────────────────────────────── */
  LTPlayer.prototype._playAudio = function () { if (this.audioEl) { var p = this.audioEl.play(); if (p && p.catch) p.catch(function () {}); } };
  LTPlayer.prototype.play = function () {
    if (this.playhead >= this.duration - 0.01) { this.playhead = 0; if (this.audioMode) this.currentIdx = -1; }
    this.playing = true; this._icons(true);
    if (this.audioMode) {
      if (this.currentIdx < 0) this._goto(0, false);     // loads clip 0
      this._playAudio();
    }
  };
  LTPlayer.prototype.pause = function () {
    this.playing = false; this._icons(false);
    if (this.audioMode) { if (this.audioEl) this.audioEl.pause(); if (this._gapTimer) { clearTimeout(this._gapTimer); this._gapWait = false; } }
  };
  LTPlayer.prototype.toggle = function () { this.playing ? this.pause() : this.play(); };
  LTPlayer.prototype.seek = function (t) {
    this.playhead = clamp(t, 0, this.duration);
    if (this.audioMode) {
      if (this._gapTimer) { clearTimeout(this._gapTimer); this._gapWait = false; }
      var idx = this.indexAt(this.playhead);
      if (idx !== this.currentIdx) this._goto(idx, true);            // load that chunk's clip (no autoplay)
      var off = clamp(this.playhead - this.chunks[idx].start_secs, 0, this.dwell(idx));
      if (this.audioEl) { try { this.audioEl.currentTime = off; } catch (e) {} if (this.playing) this._playAudio(); }
    }
    this._sync(true);
    if (!this.playing) this._icons(false);
  };
  LTPlayer.prototype._onAudioEnd = function () {
    if (!this.audioMode || !this.playing || this._scrubbing) return;
    if (this.currentIdx >= this.chunks.length - 1) { this.playhead = this.duration; this.pause(); return; }
    this._gapWait = true;                                            // freeze playhead through the inter-clip gap
    var self = this; this._gapTimer = setTimeout(function () { self._advance(); }, this.gapMs);
  };
  LTPlayer.prototype._advance = function () {
    this._gapWait = false;
    if (this.currentIdx >= this.chunks.length - 1) { this.playhead = this.duration; this.pause(); return; }
    this._goto(this.currentIdx + 1, false);                         // render next scene + load its clip
    if (this.playing) this._playAudio();
  };
  LTPlayer.prototype.step = function (dir) {     // jump to prev / next section (chunk)
    var i = clamp(this.currentIdx + (dir < 0 && (this.playhead - this.chunks[this.currentIdx].start_secs) > 1.2 ? 0 : dir), 0, this.chunks.length - 1);
    this.seek(this.chunks[i].start_secs + 0.001);
  };
  LTPlayer.prototype._icons = function (playing) {
    this.ppEl.innerHTML = LTPlayer._icon(playing ? 'pause' : 'play');
    this.ppEl.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    this.bigEl.classList.toggle('ltp-hide', playing);
    if (!playing) {
      var ended = this.playhead >= this.duration - 0.01;
      this.bigEl.innerHTML = LTPlayer._icon(ended ? 'replay' : 'play');
      this.bigEl.setAttribute('aria-label', ended ? 'Replay' : 'Play');
    }
  };

  LTPlayer.prototype._loop = function (now) {
    if (this._destroyed) return;
    if (this._last == null) this._last = now;
    var dt = Math.min((now - this._last) / 1000, 0.1); this._last = now;
    if (this.audioMode) {
      // the <audio> element is the clock: playhead = chunk start + clip currentTime
      if (this.playing && this.audioEl && !this._gapWait && this.currentIdx >= 0) {
        var ch = this.chunks[this.currentIdx];
        this.playhead = ch.start_secs + Math.min(this.audioEl.currentTime || 0, this.dwell(this.currentIdx));
      }
    } else if (this.playing) {
      this.playhead += dt; if (this.playhead >= this.duration) { this.playhead = this.duration; this.pause(); }
    }
    this._sync(false);
    var self = this; this._raf = requestAnimationFrame(function (t) { self._loop(t); });
  };

  LTPlayer.prototype._sync = function (snap) {
    if (!this.audioMode) {                               // rAF mode: playhead crossing drives chunk change
      var idx = this.indexAt(this.playhead);
      if (idx !== this.currentIdx) this._goto(idx, snap);
    }                                                    // audio mode: the audio 'ended'/seek drives _goto
    if (this.currentIdx < 0) return;
    var ch = this.chunks[this.currentIdx];
    var p = clamp((this.playhead - ch.start_secs) / Math.max(0.4, this.dwell(this.currentIdx)), 0, 1);
    if (this._scene && this._scene.update) this._scene.update(p, snap);
    if (this.cueMode && ch.frame_type === 'chart') this._reconcileAccents(snap);
    this._caption(ch, p);
    this._bar(ch);
  };

  /* ── STEP 2/3: cue execution ───────────────────────────────────────────────
     Declarative reconcile each frame: a cue is "active" when its at_seconds has
     passed and it hasn't expired (duration_ms 0 = persist to chunk end). Newly
     active cues draw their primitive + entrance; expired ones fade out. Works
     identically for play, seek, scrub and reverse. Emphasis (STEP 3): high cues
     get a brief bright/bold flash on entrance; low cues enter subtly. */
  LTPlayer.prototype._reconcileAccents = function (snap) {
    var list = this._cuesByChunk[this.currentIdx] || [];
    if (!list.length || !this._scene || !this._scene.addCue) return;
    var now = performance.now(), ph = this.playhead, self = this;
    var animated = this.playing && !this._scrubbing && !snap && !REDUCED;
    list.forEach(function (c) {
      var on = c.at_seconds <= ph && (c.duration_ms === 0 || (c.at_seconds + c.duration_ms / 1000) > ph);
      var shown = !!self._activeIds[c._id];
      if (on && !shown) {
        self._activeIds[c._id] = true;
        if (c.primitive === 'label_callout') self._flashTag();
        else if (c.primitive === 'pulse') self._scene.pulseCue(c, animated);   // deictic re-highlight: flash an existing element
        else self._scene.addCue(c, animated, now);
      } else if (!on && shown) {
        self._activeIds[c._id] = false;
        if (c.primitive !== 'label_callout' && c.primitive !== 'pulse') self._scene.removeCue(c);
      }
    });
  };
  LTPlayer.prototype._flashTag = function () {
    if (!this.tagEl) return;
    this.tagEl.classList.add('ltp-tag-flash');
    var self = this; clearTimeout(this._tagT);
    this._tagT = setTimeout(function () { self.tagEl.classList.remove('ltp-tag-flash'); }, 800);
  };

  /* ── scene swap on chunk change ────────────────────────────────────────── */
  LTPlayer.prototype._goto = function (idx, snap) {
    this.currentIdx = idx;
    var ch = this.chunks[idx], sc = ch.scene || {};
    this._capText = null;
    var animated = !snap && this.playing;            // animate entrance only during live playback
    if (this._scene && this._scene.dispose) this._scene.dispose();
    this._activeIds = {};                            // reset cue state for the new chunk
    var meta = this._metaByChunk[idx] || null;
    if (ch.frame_type === 'chart') {
      this.textEl.hidden = true; this.textEl.innerHTML = '';
      this.chartEl.style.visibility = 'visible';
      this.tagEl.textContent = sc.title || '';
      this.tagEl.hidden = !sc.title;
      // top-left context label = TIMEFRAME only. We intentionally do NOT show an asset/ticker
      // (BTC/USDT, ETH/USDT…): the candles are a synthetic illustration of the lesson's structure,
      // not a copy of a specific instrument, so naming a coin/price was a false claim. Timeframe is
      // transcript-grounded and useful, so it stays.
      if (meta && meta.timeframe) {
        this.symEl.textContent = meta.timeframe;
        this.symEl.hidden = false;
      } else { this.symEl.hidden = true; }
      this._scene = new ChartScene(this);
      var hasCues = this.cueMode && (this._cuesByChunk[idx] || []).length > 0;
      this._scene.build(sc, animated, hasCues, meta);   // cueMode → candles only; accents from cues
      _fade(this.chartEl);
    } else {
      if (this._chart) this.chartEl.style.visibility = 'hidden';
      this.tagEl.hidden = true;
      this.symEl.hidden = true;
      this._scene = null;
      this.textEl.hidden = false;
      this.textEl.innerHTML = LTPlayer._textHtml(sc);
      _fade(this.textEl);
    }
    this._chipFor(ch);
    if (this.audioMode && this.audioEl) {                // load this chunk's narration clip (no autoplay here)
      var clip = ch._clip || '';
      this.audioEl.src = (this._audioBase || '') + clip;
      try { this.audioEl.currentTime = 0; } catch (e) {}
      this.audioEl.volume = this.volume; this.audioEl.muted = this.muted;
    }
  };
  // retrigger a quick scene crossfade on the active layer
  function _fade(el) { if (REDUCED) return; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = 'ltpScene .22s cubic-bezier(.16,1,.3,1)'; }

  LTPlayer.prototype._chipFor = function (ch) {
    var label = null, sc = ch.scene || {};
    if (ch.frame_type === 'chart') {
      var t = []; (sc.trendlines || []).forEach(function (x) { t.push(x.label || 'Trendline'); });
      (sc.markLines || []).forEach(function (x) { t.push(x.label || 'Level'); });
      (sc.markAreas || []).forEach(function (x) { t.push(x.label || 'Zone'); });
      label = t.slice(0, 2).join(' · ') || (sc.timeframe && sc.timeframe !== '—' ? sc.timeframe.toUpperCase() : null);
    }
    if (!label) { this.chipEl.hidden = true; } else { this.chipEl.textContent = label; this.chipEl.hidden = false; }
  };

  /* ── caption type-on ───────────────────────────────────────────────────── */
  LTPlayer.prototype._caption = function (ch, p) {
    var text = ch.caption || '';
    // audio mode: type the caption across the spoken clip; rAF mode: a quick type-on
    var typeDur = this.audioMode ? Math.max(0.4, this.dwell(this.currentIdx) * 0.85)
                                 : Math.min(this.dwell(this.currentIdx) * 0.28, 1.2);
    var elapsed = this.playhead - ch.start_secs;
    var shown = (this._scrubbing || !this.playing) ? text : text.slice(0, Math.ceil(text.length * clamp(elapsed / typeDur, 0, 1)));
    if (this._capText !== shown) { this.capEl.textContent = shown; this._capText = shown; }
  };

  LTPlayer.prototype._bar = function (ch) {
    var pct = this.duration ? (this.playhead / this.duration * 100) : 0;
    this.fillEl.style.width = pct + '%'; this.handleEl.style.left = pct + '%';
    this.scrub.setAttribute('aria-valuenow', Math.round(this.playhead));
    var label = fmtTime(this.playhead);     // elapsed only — duration sits on the right; chunk ts was clutter
    if (this._curLabel !== label) { this.curEl.textContent = label; this._curLabel = label; }
  };

  LTPlayer.prototype.destroy = function () {
    this._destroyed = true; if (this._raf) cancelAnimationFrame(this._raf);
    if (this._gapTimer) clearTimeout(this._gapTimer);
    if (this.audioEl) { try { this.audioEl.pause(); this.audioEl.src = ''; } catch (e) {} }
    global.removeEventListener('resize', this._resize);
    if (this._closeMenu) document.removeEventListener('click', this._closeMenu);
    if (this._chart) { this._chart.dispose(); this._chart = null; }
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
  };

  /* ── TEXT scene → HTML ─────────────────────────────────────────────────── */
  LTPlayer._textHtml = function (sc) {
    var kicker = sc.kicker ? '<div class="ltp-kicker">' + esc(sc.kicker) + '</div>' : '';
    var title = sc.title ? '<h2 class="ltp-title">' + esc(sc.title) + '</h2>' : '';
    if (sc.layout === 'titlecard' || sc.layout === 'title') {
      return '<div class="ltp-slide ltp-slide--card">' + kicker +
        '<h1 class="ltp-title ltp-title--big">' + esc(sc.title || '') + '</h1>' +
        (sc.subtitle ? '<div class="ltp-sub">' + esc(sc.subtitle) + '</div>' : '') +
        '<div class="ltp-rule"></div></div>';
    }
    var lis = (sc.bullets || []).map(function (b, i) {
      return '<li style="animation-delay:' + (0.12 + i * 0.12).toFixed(2) + 's">' +
        '<span class="ltp-dot"></span><span>' + emphasize(b.text, b.key) + '</span></li>';
    }).join('');
    return '<div class="ltp-slide">' + kicker + title + '<ul class="ltp-bullets">' + lis + '</ul></div>';
  };

  /* ── CHART scene → reused engine + ECharts, one-shot snappy build ──────── */
  function ChartScene(player) { this.p = player; this.r = null; this._timers = []; }
  ChartScene.prototype._clear = function () { this._timers.forEach(clearTimeout); this._timers = []; };
  ChartScene.prototype.dispose = function () { this._clear(); };
  ChartScene.prototype.update = function () {};   // build is one-shot; no per-frame work

  ChartScene.prototype.build = function (recipe, animated, cueMode, meta) {
    animated = animated && !REDUCED;
    this.r = recipe; this._clear(); this._line = []; this._cueEls = [];
    // price calibration: affine map real = a*synth + b (from build_chart_meta.py). When present,
    // candles AND every overlay are mapped through it, so a level drawn at synth X lands at its
    // real spoken price and the axis ticks read real numbers — axis and level always agree.
    this._pmap = (meta && meta.price_map) ? meta.price_map : null;
    // candles from the REUSED engine (never a new generator)
    if (recipe.generator === 'simulator' && typeof generateMarket === 'function') {
      var m = generateMarket(recipe.pattern, recipe.seed, recipe.outcome || 'resolve');
      var v = viewMarket(m, recipe.timeframe || '4h');
      this.ohlc = v.ohlc; this.labels = v.labels; this.keyLevel = v.keyLevel;
    } else {
      this.ohlc = (typeof ltCandles === 'function') ? ltCandles(recipe.start, recipe.legs, { seed: recipe.seed || 7 }) : [];
      this.labels = (typeof ltLabels === 'function') ? ltLabels(this.ohlc.length) : this.ohlc.map(function (_, i) { return i; });
      this.keyLevel = null;
    }
    if (this._pmap) {                       // map the synthetic candle domain into the real one
      var pm = this._pmap;
      this.ohlc = this.ohlc.map(function (row) {
        return [+(pm.a * row[0] + pm.b).toFixed(2), +(pm.a * row[1] + pm.b).toFixed(2),
                +(pm.a * row[2] + pm.b).toFixed(2), +(pm.a * row[3] + pm.b).toFixed(2)];
      });
      if (this.keyLevel != null) this.keyLevel = +(pm.a * this.keyLevel + pm.b).toFixed(2);
    }
    this.n = this.ohlc.length;
    this._range = this._yRange();
    this._ov = this._overlay();
    if (!this.p._chart) this.p._chart = echarts.init(this.p.chartEl, null, { renderer: 'canvas' });
    var chart = this.p._chart;
    if (!this.n) { chart.clear(); return; }
    chart.setOption(this._baseOption(animated), { notMerge: true });
    if (cueMode) return;                 // accents are driven by the cue track (addCue/removeCue)
    if (!animated) { this._apply('all'); return; }
    // staged, snappy entrance: candles sweep in, then overlays fade on in sequence
    var self = this, order = (recipe.build || []).filter(function (b) { return b !== 'candles'; });
    var t = Math.min(460, 150 + this.n * 8) + 40;
    order.forEach(function (which) { self._timers.push(setTimeout(function () { self._apply(which); }, t)); t += 110; });
  };

  /* ── cue-driven accents (STEP 2/3) — each cue maps to one primitive from
     accent_notes.md §B; rebuilt declaratively from the active-cue list. Touches
     only series[0] (candlestick) markLine/markArea/markPoint, so indicator series
     (Ichimoku/Fib/RSI) and per-candle colours are preserved. ─────────────────── */
  ChartScene.prototype._cueLab = function (text, bg) {
    return { show: true, formatter: text, color: '#06121a', fontFamily: labelFont(), fontSize: 10, fontWeight: 700, backgroundColor: bg, padding: [2, 6], borderRadius: 3 };
  };
  ChartScene.prototype._findCue = function (id) {
    for (var i = 0; i < this._cueEls.length; i++) if (this._cueEls[i].cue._id === id) return this._cueEls[i];
    return null;
  };
  ChartScene.prototype.addCue = function (cue, animated, now) {
    if (this._findCue(cue._id)) return;
    var e = { cue: cue, hot: cue.emphasis === 'high' && animated };
    this._cueEls.push(e);
    this._renderCues();
    if (e.hot) {                          // emphasis flash: bright/bold entrance, then settle
      var self = this;
      this._timers.push(setTimeout(function () { e.hot = false; self._renderCues(); }, 230));
    }
  };
  ChartScene.prototype.removeCue = function (cue) {
    var n = this._cueEls.length;
    this._cueEls = this._cueEls.filter(function (e) { return e.cue._id !== cue._id; });
    if (this._cueEls.length !== n) this._renderCues();
  };
  /* Find an already-drawn cue element whose target matches the pulse's params, so a
     deictic "here"/"this level" re-highlights the SAME line/zone/marker (no duplicate). */
  ChartScene.prototype._matchCueEl = function (p) {
    for (var i = 0; i < this._cueEls.length; i++) {
      var q = this._cueEls[i].cue.params || {};
      if (p.dataIndex != null && q.dataIndex === p.dataIndex) return this._cueEls[i];
      if (p.price != null && q.price === p.price) return this._cueEls[i];
      if (p.rel === 'key' && q.rel === 'key' && p.y0 == null && q.y0 == null) return this._cueEls[i];
      if (p.y0 != null && q.y0 === p.y0 && q.y1 === p.y1) return this._cueEls[i];
    }
    return null;
  };
  /* Deictic re-highlight: briefly flash an existing element bright (then settle). Transient —
     not tracked in _activeIds beyond firing once, so it never leaves a duplicate overlay. */
  ChartScene.prototype.pulseCue = function (c, animated) {
    var el = this._matchCueEl(c.params || {});
    if (!el || !animated) return;
    var self = this; el.hot = true; this._renderCues();
    this._timers.push(setTimeout(function () { el.hot = false; self._renderCues(); }, 720));
  };
  ChartScene.prototype._renderCues = function () {
    var ml = [], ma = [], mp = [], self = this;
    this._cueEls.forEach(function (e) { self._pushCue(e, ml, ma, mp); });
    this.p._chart.setOption({ series: [{ type: 'candlestick',
      markLine: { symbol: ['none', 'none'], silent: true, data: ml },
      markArea: { silent: true, data: ma },
      markPoint: { silent: true, data: mp } }] }, { notMerge: false, lazyUpdate: true });
  };
  // map a synthetic overlay price into the real domain (identity when uncalibrated)
  ChartScene.prototype._px = function (v) { var m = this._pmap; return (m && v != null) ? (m.a * v + m.b) : v; };
  ChartScene.prototype._pushCue = function (e, ml, ma, mp) {
    var c = e.cue, p = c.params || {}, hot = e.hot, em = c.emphasis;
    var col = hot ? '#ffffff' : (p.color || CY);
    if (c.primitive === 'draw_horizontal_line') {
      var y = (p.rel === 'key') ? this.keyLevel : this._px(p.price); if (y == null) return;
      var w = hot ? 3.0 : (em === 'high' ? 2.0 : em === 'low' ? 1.1 : 1.5);
      ml.push([{ yAxis: y, name: c.label, label: Object.assign(this._cueLab(c.label, col), { position: 'end' }),
                 lineStyle: { color: col, type: 'dashed', width: w, opacity: 0.95 } }, { yAxis: y }]);
    } else if (c.primitive === 'draw_trendline') {
      var tw = hot ? 3.4 : (em === 'low' ? 1.6 : 2.2);
      var pf = [p.from[0], this._px(p.from[1])], pt = [p.to[0], this._px(p.to[1])];
      ml.push([{ coord: pf, name: c.label, label: this._cueLab(c.label, col) },
               { coord: pt, lineStyle: { color: col, width: tw, opacity: 0.97, type: 'solid' } }]);
    } else if (c.primitive === 'draw_zone') {
      var y0 = p.rel === 'key' ? this.keyLevel * (1 + p.y0) : this._px(p.y0),
          y1 = p.rel === 'key' ? this.keyLevel * (1 + p.y1) : this._px(p.y1);
      if (y0 == null || y1 == null) return;
      ma.push([{ yAxis: y0, itemStyle: { color: hot ? 'rgba(0,212,212,0.28)' : (p.color || 'rgba(0,212,212,0.12)') },
                 label: { show: true, formatter: c.label, color: '#bfeaea', fontFamily: labelFont(), fontSize: 9.5, fontWeight: 700, position: 'insideTopLeft', backgroundColor: 'rgba(8,7,15,0.5)', padding: [2, 5], borderRadius: 3 } }, { yAxis: y1 }]);
    } else if (c.primitive === 'mark_candle') {
      var row = this.ohlc[p.dataIndex]; if (!row) return;
      var bottom = p.position === 'bottom', yy = bottom ? row[2] : row[3];
      var big = em === 'high' || hot, small = em === 'low' && !hot;
      var sz = bottom ? (big ? [12, 12] : small ? [7, 7] : [9, 9]) : (big ? [15, 20] : small ? [9, 12] : [12, 16]);
      mp.push({ coord: [p.dataIndex, yy], value: c.label, symbol: bottom ? 'triangle' : 'pin', symbolRotate: bottom ? 180 : 0,
                symbolSize: sz, itemStyle: { color: col, opacity: small ? 0.85 : 1 },
                label: { show: true, formatter: c.label, color: TXT, fontFamily: labelFont(), fontSize: big ? 11 : 9.5, fontWeight: 700, position: bottom ? 'bottom' : 'top', distance: 8, backgroundColor: 'rgba(8,7,15,0.7)', padding: [2, 5], borderRadius: 3 } });
    }
  };

  ChartScene.prototype._yRange = function () {
    var lo = Infinity, hi = -Infinity, o = this.ohlc;
    for (var i = 0; i < o.length; i++) { lo = Math.min(lo, o[i][2]); hi = Math.max(hi, o[i][3]); }
    var add = function (v) { if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } };
    var kl = this.keyLevel, r = this.r, self = this;
    (r.markLines || []).forEach(function (m) { add(m.rel === 'key' ? kl : self._px(m.yAxis)); });
    (r.trendlines || []).forEach(function (t) { add(self._px(t.from[1])); add(self._px(t.to[1])); });
    (r.markAreas || []).forEach(function (a) { add(a.rel === 'key' ? kl * (1 + a.y0) : self._px(a.y0)); add(a.rel === 'key' ? kl * (1 + a.y1) : self._px(a.y1)); });
    var pad = (hi - lo) * 0.10 || 1;
    return { min: +(lo - pad).toFixed(2), max: +(hi + pad).toFixed(2) };
  };

  // full overlay datasets (computed once) — { hline, trend, area, point }
  ChartScene.prototype._overlay = function () {
    var r = this.r, kl = this.keyLevel, self = this, hline = [], trend = [], area = [], point = [];
    var lab = function (text, bg) { return { show: true, formatter: text, color: '#06121a', fontFamily: labelFont(), fontSize: 10, fontWeight: 700, backgroundColor: bg, padding: [2, 6], borderRadius: 3 }; };
    (r.markLines || []).forEach(function (m) {
      var y = m.rel === 'key' ? kl : self._px(m.yAxis); if (y == null) return;
      var c = m.color || CY;
      hline.push([{ yAxis: y, name: m.label, label: Object.assign(lab(m.label, c), { position: 'end' }), lineStyle: { color: c, type: 'dashed', width: 1.4, opacity: 0.9 } }, { yAxis: y }]);
    });
    (r.trendlines || []).forEach(function (t) {
      var c = t.color || CY;
      trend.push([{ coord: [t.from[0], self._px(t.from[1])], name: t.label, label: lab(t.label, c) }, { coord: [t.to[0], self._px(t.to[1])], lineStyle: { color: c, width: 2.2, opacity: 0.95, type: 'solid' } }]);
    });
    (r.markAreas || []).forEach(function (a) {
      var y0 = a.rel === 'key' ? kl * (1 + a.y0) : self._px(a.y0), y1 = a.rel === 'key' ? kl * (1 + a.y1) : self._px(a.y1);
      area.push([{ yAxis: y0, itemStyle: { color: a.color || 'rgba(0,212,212,0.12)' }, label: { show: true, formatter: a.label, color: '#bfeaea', fontFamily: labelFont(), fontSize: 9.5, fontWeight: 700, position: 'insideTopLeft', backgroundColor: 'rgba(8,7,15,0.5)', padding: [2, 5], borderRadius: 3 } }, { yAxis: y1 }]);
    });
    (r.markPoints || []).forEach(function (m) {
      var row = self.ohlc[m.dataIndex]; if (!row) return;
      var y = m.position === 'bottom' ? row[2] : row[3];
      point.push({ coord: [m.dataIndex, y], value: m.label, symbol: m.position === 'bottom' ? 'triangle' : 'pin', symbolRotate: m.position === 'bottom' ? 180 : 0, symbolSize: m.position === 'bottom' ? [9, 9] : [12, 16], itemStyle: { color: m.color || CY }, label: { show: true, formatter: m.label, color: TXT, fontFamily: labelFont(), fontSize: 9.5, fontWeight: 700, position: m.position === 'bottom' ? 'bottom' : 'top', distance: 8, backgroundColor: 'rgba(8,7,15,0.7)', padding: [2, 5], borderRadius: 3 } });
    });
    return { hline: hline, trend: trend, area: area, point: point };
  };

  // reveal one overlay group via a cheap MERGE update (candles never re-animate)
  ChartScene.prototype._apply = function (which) {
    var o = this._ov, s = { type: 'candlestick' }, self = this;
    function setLine() { s.markLine = { symbol: ['none', 'none'], silent: true, data: self._line }; }
    if (which === 'trendlines') { this._line = this._line.concat(o.trend); setLine(); }
    else if (which === 'markLines') { this._line = this._line.concat(o.hline); setLine(); }
    else if (which === 'markAreas') { s.markArea = { silent: true, data: o.area }; }
    else if (which === 'markPoints') { s.markPoint = { silent: true, data: o.point }; }
    else if (which === 'all') { this._line = o.trend.concat(o.hline); setLine(); s.markArea = { silent: true, data: o.area }; s.markPoint = { silent: true, data: o.point }; }
    else return;
    this.p._chart.setOption({ series: [s] }, { notMerge: false, lazyUpdate: true });
  };

  ChartScene.prototype._baseOption = function (animated) {
    var per = Math.min(10, 420 / Math.max(1, this.n));
    var rsi = this.r.indicator === 'rsi' && this.n >= 6;   // RSI gets its own lower panel
    var catX = function (gi) { return { type: 'category', gridIndex: gi, data: this.labels, boundaryGap: true,
      axisTick: { show: false }, axisLine: { lineStyle: { color: '#241f33' } }, axisLabel: { show: false }, splitLine: { show: false } }; }.bind(this);
    var grid = [rsi ? { left: 10, right: 62, top: 14, height: '56%' } : { left: 10, right: 62, top: 16, bottom: 16, containLabel: false }];
    var xAxis = [catX(0)];
    var yAxis = [{ scale: true, gridIndex: 0, position: 'right', min: this._range.min, max: this._range.max,
      axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.035)' } },
      axisLabel: { color: DIM, fontFamily: labelFont(), fontSize: 10, formatter: function (v) { return fmtPrice(v); } } }];
    if (rsi) {
      grid.push({ left: 10, right: 62, top: '74%', bottom: 14 });
      xAxis.push(catX(1));
      yAxis.push({ gridIndex: 1, min: 0, max: 100, interval: 50, position: 'right',
        axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } },
        axisLabel: { color: DIM, fontFamily: labelFont(), fontSize: 8.5 } });
    }
    return {
      animation: animated, animationDuration: 220, animationEasing: 'cubicOut',
      animationDelay: function (idx) { return idx * per; },
      animationDurationUpdate: 260, animationEasingUpdate: 'cubicOut',
      grid: grid, xAxis: xAxis, yAxis: yAxis,
      series: [{ type: 'candlestick', xAxisIndex: 0, yAxisIndex: 0, data: this._candleData(),
        itemStyle: { color: BULL, color0: BEAR, borderColor: BULL, borderColor0: BEAR, borderWidth: 1.1 },
        markLine: { silent: true, data: [] }, markArea: { silent: true, data: [] }, markPoint: { silent: true, data: [] } }].concat(this._indicatorSeries())
    };
  };

  /* ── indicator overlays (mirror the Candles view) ──────────────────────────
     Ichimoku cloud + Tenkan/Kijun, and per-candle indicator colours (Crayons,
     Trend Buddy, Genie, …) — computed from THIS scene's candles so the animated
     lesson reflects what the chapter's candle section teaches. */
  ChartScene.prototype._candleData = function () {
    var cc = this._candleColors();
    if (!cc) return this.ohlc;
    return this.ohlc.map(function (row, i) {
      var col = cc[i];
      return col ? { value: row, itemStyle: { color: col, color0: col, borderColor: col, borderColor0: col } } : row;
    });
  };
  ChartScene.prototype._candleColors = function () {
    var r = this.r;
    if (r.candleColors && r.candleColors.length) return r.candleColors;        // explicit array
    if (r.colorScheme) return _schemeColors(this.ohlc, r.colorScheme);          // computed scheme
    return null;
  };
  ChartScene.prototype._indicatorSeries = function () {
    var ind = this.r.indicator;
    if (ind === 'ichimoku')  return this._ichimokuSeries();
    if (ind === 'fibonacci') return this._fibSeries();
    if (ind === 'rsi')       return this._rsiSeries();   // its panel grid is added in _baseOption
    return [];
  };
  ChartScene.prototype._ichimokuSeries = function () {
    var o = this.ohlc, n = o.length;
    if (n < 8) return [];
    // scale the 9/26/52 periods down for short synthetic charts so the cloud is visible
    var P = n >= 56 ? [9, 26, 52]
      : [Math.max(4, Math.round(n * 0.10)), Math.max(8, Math.round(n * 0.26)), Math.max(12, Math.round(n * 0.50))];
    function mid(period, end) {
      var s = Math.max(0, end - period + 1), hi = -Infinity, lo = Infinity;
      for (var j = s; j <= end; j++) { if (o[j][3] > hi) hi = o[j][3]; if (o[j][2] < lo) lo = o[j][2]; }
      return (hi + lo) / 2;
    }
    var tenkan = [], kijun = [], spanA = [], spanB = [], i;
    for (i = 0; i < n; i++) {
      tenkan.push(i >= P[0] - 1 ? +mid(P[0], i).toFixed(2) : null);
      kijun.push(i >= P[1] - 1 ? +mid(P[1], i).toFixed(2) : null);
      spanB.push(i >= P[2] - 1 ? +mid(P[2], i).toFixed(2) : null);
    }
    for (i = 0; i < n; i++) spanA.push(tenkan[i] != null && kijun[i] != null ? +((tenkan[i] + kijun[i]) / 2).toFixed(2) : null);
    var base = spanA.map(function (a, i) { return a != null && spanB[i] != null ? +Math.min(a, spanB[i]).toFixed(2) : null; });
    var delta = spanA.map(function (a, i) { return a != null && spanB[i] != null ? +Math.abs(a - spanB[i]).toFixed(2) : null; });
    // split the cloud band into a bullish (Span A ≥ Span B) and bearish part so it reads
    // green/red the way real Ichimoku does; the inactive part is 0-height at each x.
    var bull = spanA.map(function (a, i) { return a != null && spanB[i] != null ? (a >= spanB[i] ? delta[i] : 0) : null; });
    var bear = spanA.map(function (a, i) { return a != null && spanB[i] != null ? (a <  spanB[i] ? delta[i] : 0) : null; });
    var line = function (name, data, color, w) {
      return { name: name, type: 'line', data: data, symbol: 'none', showSymbol: false, silent: true, smooth: false, lineStyle: { color: color, width: w }, z: 3 };
    };
    var band = function (name, data, color) {
      return { name: name, type: 'line', data: data, stack: 'kumo', symbol: 'none', showSymbol: false, silent: true, lineStyle: { opacity: 0 }, areaStyle: { color: color }, z: 1 };
    };
    return [
      // colours match how the narrator names them on screen: Tenkan = light blue, Kijun = bright yellow
      line('Tenkan-sen', tenkan, '#5cc8ff', 1.3),
      line('Kijun-sen', kijun, '#ffcf3f', 1.6),
      band('_kumo_base', base, 'transparent'),
      band('_kumo_bull', bull, 'rgba(40,200,120,0.18)'),
      band('_kumo_bear', bear, 'rgba(242,61,92,0.15)')
    ];
  };

  /* Fibonacci retracement — levels drawn between the chart's swing low and swing high,
     the way the narrator walks through them. 0.618 (the golden pocket) is emphasised. */
  ChartScene.prototype._fibSeries = function () {
    var o = this.ohlc, n = o.length;
    if (n < 4) return [];
    var lo = Infinity, hi = -Infinity, loI = 0, hiI = 0, i;
    for (i = 0; i < n; i++) { if (o[i][2] < lo) { lo = o[i][2]; loI = i; } if (o[i][3] > hi) { hi = o[i][3]; hiI = i; } }
    var up = hiI >= loI, rng = hi - lo || 1, self = this;
    var GOLD = '#ffcf3f', DIM = 'rgba(255,207,63,0.5)';
    var ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    return ratios.map(function (rt) {
      var price = +(up ? (hi - rt * rng) : (lo + rt * rng)).toFixed(2);
      var golden = rt === 0.618, edge = rt === 0 || rt === 1;
      var label = rt.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
      return {
        name: 'fib_' + rt, type: 'line', data: self.ohlc.map(function () { return price; }),
        symbol: 'none', showSymbol: false, silent: true, z: golden ? 4 : 2,
        lineStyle: { color: golden ? GOLD : DIM, width: golden ? 1.7 : 1, type: edge ? 'solid' : 'dashed', opacity: golden ? 1 : 0.85 },
        endLabel: { show: true, formatter: label, color: golden ? '#06121a' : GOLD,
          backgroundColor: golden ? GOLD : 'rgba(8,7,15,0.6)', fontFamily: labelFont(),
          fontSize: 9.5, fontWeight: 700, padding: [2, 5], borderRadius: 3 }
      };
    });
  };

  // RSI(period) from closes (Wilder smoothing); drawn in the lower panel grid (see _baseOption).
  ChartScene.prototype._rsiData = function () {
    var o = this.ohlc, n = o.length, P = Math.max(5, Math.min(14, Math.round(n / 3)));
    var out = [null], gain = 0, loss = 0, ag = 0, al = 0, i;
    var rsi = function () { return +(100 - 100 / (1 + (al === 0 ? 100 : ag / al))).toFixed(1); };
    for (i = 1; i < n; i++) {
      var d = o[i][1] - o[i - 1][1], up = Math.max(0, d), dn = Math.max(0, -d);
      if (i < P) { gain += up; loss += dn; out.push(null); }
      else if (i === P) { gain += up; loss += dn; ag = gain / P; al = loss / P; out.push(rsi()); }
      else { ag = (ag * (P - 1) + up) / P; al = (al * (P - 1) + dn) / P; out.push(rsi()); }
    }
    return out;
  };
  ChartScene.prototype._rsiSeries = function () {
    if (this.ohlc.length < 6) return [];
    var mk = function (y, color, dash) { return { yAxis: y, lineStyle: { color: color, type: dash ? 'dashed' : 'solid', width: 1, opacity: 0.7 },
      label: { show: true, formatter: String(y), position: 'insideEndTop', color: color, fontFamily: labelFont(), fontSize: 8.5 } }; };
    return [{
      name: 'RSI', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: this._rsiData(),
      symbol: 'none', showSymbol: false, smooth: true, silent: true, z: 3,
      lineStyle: { color: '#b07cff', width: 1.6 },
      markLine: { silent: true, symbol: 'none', data: [mk(70, 'rgba(242,61,92,0.6)', true), mk(30, 'rgba(40,200,120,0.6)', true)] }
    }];
  };

  /* ── icons ─────────────────────────────────────────────────────────────── */
  LTPlayer._icon = function (name) {
    var S = function (p) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">' + p + '</svg>'; };
    if (name === 'pause') return S('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>');
    if (name === 'prev') return S('<rect x="6" y="5" width="2.4" height="14" rx="1"/><path d="M19 5v14l-9-7z"/>');
    if (name === 'next') return S('<rect x="15.6" y="5" width="2.4" height="14" rx="1"/><path d="M5 5v14l9-7z"/>');
    if (name === 'replay') return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
    if (name === 'cc') return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="7" y1="12" x2="10.5" y2="12"/><line x1="13.5" y1="12" x2="17" y2="12"/></svg>';
    if (name === 'vol') return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 9v6h3l4 4V5L7 9H4z"/><path d="M14 8.2a4.4 4.4 0 0 1 0 7.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16.6 5.6a8 8 0 0 1 0 12.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    if (name === 'volLow') return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 9v6h3l4 4V5L7 9H4z"/><path d="M14 8.2a4.4 4.4 0 0 1 0 7.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    if (name === 'volMute') return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 9v6h3l4 4V5L7 9H4z"/><path d="M15 9.5l5.5 5.5M20.5 9.5l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    return S('<path d="M8 5v14l11-7z"/>');
  };

  /* ── self-contained CSS ────────────────────────────────────────────────── */
  LTPlayer._css = function () {
    if (document.getElementById('ltp-css')) return;
    var s = document.createElement('style'); s.id = 'ltp-css';
    s.textContent =
'.ltp-root{--cy:#00d4d4;--cyf:rgba(0,212,212,.05);--cyd:rgba(0,212,212,.10);--bg:#08070f;--bg2:#0d0b18;--bg3:#14121f;--bg4:#1d1a30;--bg5:#272240;--bd:#272235;--bd2:#363049;--bd3:#4b4566;--tx:#f6f5fb;--tx2:#a8a3bb;--tx3:#716c88;--rl:6px;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;background:var(--bg);border:1px solid var(--bd);border-radius:var(--rl);overflow:hidden;user-select:none;max-width:980px;margin:0 auto;box-shadow:0 16px 44px -16px rgba(0,0,0,.72),inset 0 1px 0 rgba(255,255,255,.045)}'+
'.ltp-stage{position:relative;width:100%;aspect-ratio:16/9;background:linear-gradient(180deg,var(--bg2),var(--bg) 72%);overflow:hidden;cursor:pointer}'+
'.ltp-chart{position:absolute;inset:0}'+
'.ltp-text{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:6% 8% 23%}'+
'.ltp-symbol{position:absolute;top:12px;left:14px;color:var(--cy);font-size:13px;font-weight:700;letter-spacing:.06em;background:rgba(8,7,15,.72);border:1px solid rgba(0,212,212,.32);padding:4px 11px;border-radius:var(--rl);z-index:4;backdrop-filter:blur(2px);text-shadow:0 0 10px rgba(0,212,212,.35);font-variant-numeric:tabular-nums}'+
'.ltp-symbol[hidden]{display:none}'+
'.ltp-tag{position:absolute;top:44px;left:14px;color:var(--tx2);font-size:11px;font-weight:600;letter-spacing:.04em;background:rgba(8,7,15,.7);border:1px solid var(--bd2);padding:4px 10px;border-radius:var(--rl);z-index:3;backdrop-filter:blur(2px)}'+
'.ltp-tag[hidden]{display:none}'+
'.ltp-tag-flash{color:#06121a;background:var(--cy);border-color:var(--cy);box-shadow:0 0 0 3px rgba(0,212,212,.25),0 0 14px rgba(0,212,212,.5);transition:all .2s}'+
'.ltp-slide{width:100%;max-width:760px}.ltp-slide--card{text-align:center}'+
'.ltp-kicker{color:var(--cy);letter-spacing:1px;text-transform:uppercase;font-size:11px;font-weight:700;margin-bottom:14px;opacity:0;animation:ltpUp .34s cubic-bezier(.16,1,.3,1) .02s forwards}'+
'.ltp-title{color:var(--tx);font-size:clamp(21px,3.4vw,34px);font-weight:700;letter-spacing:-.5px;line-height:1.25;margin:0 0 20px;opacity:0;animation:ltpUp .36s cubic-bezier(.16,1,.3,1) .06s forwards}'+
'.ltp-title--big{font-size:clamp(28px,5.4vw,54px);letter-spacing:-1px;margin:0 0 14px}'+
'.ltp-sub{color:var(--tx2);font-size:clamp(13px,1.8vw,18px);opacity:0;animation:ltpUp .36s cubic-bezier(.16,1,.3,1) .16s forwards}'+
'.ltp-rule{height:2px;width:0;background:linear-gradient(90deg,transparent,var(--cy),transparent);margin:24px auto 0;animation:ltpRule .45s cubic-bezier(.16,1,.3,1) .24s forwards}'+
'.ltp-bullets{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:16px}'+
'.ltp-bullets li{display:flex;gap:13px;align-items:flex-start;color:var(--tx);font-size:clamp(14px,2vw,21px);line-height:1.45;opacity:0;transform:translateX(-9px);animation:ltpIn .3s cubic-bezier(.16,1,.3,1) forwards}'+
'.ltp-dot{flex:none;width:8px;height:8px;margin-top:.55em;background:var(--cy);transform:rotate(45deg)}'+
'.ltp-pop{color:var(--cy);font-weight:700}'+
'@keyframes ltpUp{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}'+
'@keyframes ltpIn{from{opacity:0;transform:translateX(-9px)}to{opacity:1;transform:none}}'+
'@keyframes ltpRule{to{width:128px}}'+
'@keyframes ltpScene{from{opacity:0}to{opacity:1}}'+
'.ltp-cap-wrap{position:absolute;left:0;right:0;bottom:0;padding:30px 22px 16px;background:linear-gradient(to top,rgba(6,5,11,.96) 14%,rgba(6,5,11,.55) 56%,transparent);pointer-events:none;z-index:4}'+
'.ltp-chip{display:inline-block;margin-bottom:11px;padding:2px 8px;border:1px solid rgba(0,212,212,.2);border-radius:10px;color:var(--cy);background:var(--cyf);font-size:10px;font-weight:600;letter-spacing:.4px}'+
'.ltp-chip[hidden]{display:none}'+
'.ltp-cap{margin:0;color:#eef6f6;font-size:clamp(14px,2vw,20px);font-weight:500;line-height:1.4;letter-spacing:.2px;text-shadow:0 1px 8px rgba(0,0,0,.6);min-height:1.3em}'+
'.ltp-big{position:absolute;inset:0;margin:auto;width:58px;height:58px;border-radius:50%;border:1.5px solid var(--cy);background:rgba(8,7,15,.5);color:var(--cy);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5;backdrop-filter:blur(3px);transition:transform .16s cubic-bezier(.16,1,.3,1),opacity .2s,background .16s}'+
'.ltp-big svg{width:24px;height:24px;margin-left:2px}.ltp-big:hover{transform:scale(1.07);background:var(--cyd)}.ltp-big.ltp-hide{opacity:0;transform:scale(.88);pointer-events:none}'+
'.ltp-bar{display:flex;align-items:center;gap:12px;padding:9px 14px;background:var(--bg2);border-top:1px solid var(--bd)}'+
'.ltp-nav{flex:none;width:30px;height:30px;border-radius:var(--rl);border:none;background:transparent;color:var(--tx3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color .14s,background .14s}.ltp-nav svg{width:18px;height:18px}.ltp-nav:hover{color:var(--tx);background:var(--bg4)}'+
'.ltp-pp{flex:none;width:34px;height:34px;border-radius:50%;border:none;background:var(--cy);color:#04161a;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .14s,filter .14s}.ltp-pp svg{width:17px;height:17px}.ltp-pp:hover{transform:scale(1.07);filter:brightness(1.08)}'+
'.ltp-t{flex:none;color:var(--tx2);font-size:12px;min-width:42px;letter-spacing:.02em;font-variant-numeric:tabular-nums}.ltp-dur{text-align:right;min-width:40px;color:var(--tx3)}'+
'.ltp-scrub{position:relative;flex:1;height:24px;cursor:pointer;display:flex;align-items:center;touch-action:none}'+
'.ltp-scrub-bg{position:absolute;left:0;right:0;height:3px;border-radius:2px;background:var(--bg5)}'+
'.ltp-fill{position:absolute;left:0;height:3px;border-radius:2px;background:var(--cy);width:0}'+
'.ltp-ticks{position:absolute;left:0;right:0;height:100%}.ltp-tick{position:absolute;top:50%;transform:translate(-50%,-50%);width:2px;height:6px;background:rgba(0,212,212,.4);border-radius:1px}'+
'.ltp-handle{position:absolute;top:50%;left:0;width:11px;height:11px;border-radius:50%;background:var(--tx);transform:translate(-50%,-50%) scale(.55);transition:transform .14s cubic-bezier(.16,1,.3,1)}'+
'.ltp-scrub:hover .ltp-handle,.ltp-scrub:focus .ltp-handle{transform:translate(-50%,-50%) scale(1)}'+
'.ltp-scrub:focus{outline:none}.ltp-scrub:focus-visible .ltp-handle{box-shadow:0 0 0 4px rgba(0,212,212,.28)}'+
'.ltp-tip{position:absolute;bottom:19px;transform:translateX(-50%);background:var(--bg5);border:1px solid var(--bd2);color:var(--tx);font-size:11px;padding:2px 7px;border-radius:4px;pointer-events:none;white-space:nowrap;font-variant-numeric:tabular-nums}.ltp-tip[hidden]{display:none}'+
'.ltp-cc-wrap{position:relative;flex:none}'+
'.ltp-cc{width:30px;height:30px;border:none;border-radius:var(--rl);background:transparent;color:var(--tx3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color .14s,background .14s}.ltp-cc:hover{color:var(--tx);background:var(--bg4)}'+
'.ltp-cc-menu{position:absolute;bottom:38px;right:0;min-width:118px;background:var(--bg4);border:1px solid var(--bd2);border-radius:var(--rl);padding:5px;display:flex;flex-direction:column;gap:1px;box-shadow:0 12px 30px -10px rgba(0,0,0,.75);z-index:30}.ltp-cc-menu[hidden]{display:none}'+
'.ltp-cc-head{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--tx3);padding:4px 8px 6px}'+
'.ltp-cc-menu button{background:transparent;border:none;color:var(--tx2);font-family:inherit;font-size:12.5px;text-align:left;padding:7px 9px;border-radius:4px;cursor:pointer;letter-spacing:.02em;display:flex;justify-content:space-between;align-items:center}'+
'.ltp-cc-menu button:hover{background:var(--bg5);color:var(--tx)}'+
'.ltp-cc-menu button.ltp-cc-active{color:var(--cy)}.ltp-cc-menu button.ltp-cc-active::after{content:"✓";font-size:11px}'+
'.ltp-vol-wrap{position:relative;flex:none;display:flex;align-items:center}'+
'.ltp-vol{flex:none;width:30px;height:30px;border:none;border-radius:var(--rl);background:transparent;color:var(--tx3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color .14s,background .14s}.ltp-vol:hover{color:var(--tx);background:var(--bg4)}'+
'.ltp-vol-slider{width:0;opacity:0;height:3px;border-radius:2px;background:var(--bg5);-webkit-appearance:none;appearance:none;cursor:pointer;outline:none;vertical-align:middle;transition:width .18s cubic-bezier(.16,1,.3,1),opacity .14s,margin .18s}'+
'.ltp-vol-wrap:hover .ltp-vol-slider,.ltp-vol-wrap:focus-within .ltp-vol-slider{width:60px;opacity:1;margin:0 4px 0 2px}'+
'.ltp-vol-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:11px;height:11px;border-radius:50%;background:var(--cy);border:none;cursor:pointer}'+
'.ltp-vol-slider::-moz-range-thumb{width:11px;height:11px;border-radius:50%;background:var(--cy);border:none;cursor:pointer}'+
'.ltp-vol-slider:focus-visible{box-shadow:0 0 0 3px rgba(0,212,212,.28)}'+
'.ltp-root.ltp-cap-off .ltp-cap-wrap{display:none}'+
'.ltp-root.ltp-cap-s .ltp-cap{font-size:clamp(12px,1.5vw,15px)}'+
'.ltp-root.ltp-cap-l .ltp-cap{font-size:clamp(18px,2.7vw,26px)}'+
'@media (prefers-reduced-motion:reduce){.ltp-root *{animation-duration:.01ms!important;animation-delay:0ms!important;transition-duration:.01ms!important}}';
    document.head.appendChild(s);
  };

  global.LTPlayer = LTPlayer;
})(window);
