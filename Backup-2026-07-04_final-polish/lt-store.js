/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — lt-store.js
   Persistence facade: ONE registry of every fixed localStorage key + safe
   accessors with a single try/catch policy.
   ───────────────────────────────────────────────────────────────────────────
   Loaded FIRST (before lt-settings.js, which reads prefs at parse time) so every
   module shares the same key registry.

   ⚠ The key STRINGS are a compatibility contract — existing learners already have
   data stored under these names, and the cross-device sync + JSON backup features
   (lt-settings.js export/import, lt-engine.js _ltCheckSyncImport) sweep the whole
   `lt_` namespace. Never rename a key here without a migration.

   NOT owned here (deliberately):
   · Per-course state keys `lt_course<n>_state` — owned by the LT_COURSES registry
     in lt-engine.js (courseStateKey).
   · The generic `lt_`-prefix sweepers — they iterate the raw namespace by design.
   · lessons-v2/renderer.js — a deliberately dependency-free standalone module; it
     reads lt_lesson_speed / lt_lesson_volume directly (keys still registered below
     for documentation).
   ═══════════════════════════════════════════════════════════════════════════ */
(function (g) {
  'use strict';

  var KEYS = {
    theme:            'lt_theme',
    bullishColor:     'lt_bullish_color',
    bearishColor:     'lt_bearish_color',
    font:             'lt_font',
    captionSize:      'lt_caption_size',
    narration:        'lt_narration',
    lessonSpeed:      'lt_lesson_speed',     // read directly by the standalone v2 renderer
    lessonVolume:     'lt_lesson_volume',    // read directly by the standalone v2 renderer
    sidebarCollapsed: 'lt_sidebar_collapsed',
    certName:         'lt_cert_name',
    activeCourse:     'lt_active_course',
    unlockAll:        'lt_unlock_all',
    fcMode:           'lt_fc_mode',
    simStats:         'lt_sim_stats',
    simDifficulty:    'lt_sim_difficulty'
  };

  // Resolve a logical name ('theme') OR a raw key ('lt_theme') to the stored key.
  function resolve(k) { return Object.prototype.hasOwnProperty.call(KEYS, k) ? KEYS[k] : k; }

  var Store = {
    KEYS: KEYS,

    // Returns the stored string, or `fallback` (default null) when absent / unreadable.
    get: function (k, fallback) {
      var d = arguments.length > 1 ? fallback : null;
      try { var v = localStorage.getItem(resolve(k)); return v == null ? d : v; }
      catch (_) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem(resolve(k), v); } catch (_) {} },
    del: function (k)    { try { localStorage.removeItem(resolve(k)); } catch (_) {} },

    // JSON convenience (parse-safe).
    json: function (k, fallback) {
      var d = arguments.length > 1 ? fallback : null;
      var v = this.get(k);
      if (v == null) return d;
      try { return JSON.parse(v); } catch (_) { return d; }
    },

    // Raw escape hatches for dynamic keys (per-course state, sync sweeps).
    getRaw: function (key, fallback) {
      var d = arguments.length > 1 ? fallback : null;
      try { var v = localStorage.getItem(key); return v == null ? d : v; }
      catch (_) { return d; }
    },
    setRaw: function (key, v) { try { localStorage.setItem(key, v); } catch (_) {} },
    delRaw: function (key)    { try { localStorage.removeItem(key); } catch (_) {} }
  };

  g.LTStore  = Store;
  g.LT_KEYS  = KEYS;
})(typeof window !== 'undefined' ? window : this);
