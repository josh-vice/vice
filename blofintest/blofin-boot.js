/* ═══════════════════════════════════════════════════════════════════════════
   BloFin Academy staging boot patch (/blofintest)
   Loads deferred AFTER lt-engine.js (its top-level globals exist) but BEFORE
   the engine's DOMContentLoaded boot. CSS lives in blofin-theme.css plus the
   recolored file copies from build-blofin-skin.sh; this file owns every
   JS-side colour and branding hook:
     · candles forced to market green/red (stage ignores the custom setting)
     · a global echarts setOption wrapper remaps ALL residual LT colours —
       including the hardcoded literals inside the lt-data*.js chart defs
     · course accents → BloFin orange family
     · share-site + welcome-hero say BloFin Academy                          */
(function () {
  'use strict';

  var GREEN = '#04b97d', RED_C = '#f13c54';   /* market up/down */

  /* string → string colour remap (idempotent; case-insensitive hex) */
  var MAP = [
    [/#00d4d4/gi, GREEN], [/0, ?212, ?212/g, '4,185,125'],
    [/#00b8b8/gi, '#039e6b'], [/#009696/gi, '#03855a'],
    [/#16e9d0/gi, '#ff8802'],
    [/#ff2e88/gi, RED_C], [/255, ?46, ?136/g, '241,60,84'],
    [/#ff5fa3/gi, '#f4677a'], [/#ff2ef5/gi, '#c72e42'],
    [/#a855f7/gi, '#e67a00'], [/168, ?85, ?247/g, '230,122,0'],
    [/#ff7a4d/gi, '#ff8802'], [/255, ?122, ?77/g, '255,136,2']
  ];
  function mapStr(s) {
    for (var i = 0; i < MAP.length; i++) s = s.replace(MAP[i][0], MAP[i][1]);
    return s;
  }
  function deepMap(v) {
    if (typeof v === 'string') return mapStr(v);
    if (typeof v === 'function') {
      return function () {
        var r = v.apply(this, arguments);
        return typeof r === 'string' ? mapStr(r) : r;
      };
    }
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) v[i] = deepMap(v[i]); return v; }
    if (v && typeof v === 'object') { for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) v[k] = deepMap(v[k]); return v; }
    return v;
  }

  /* ── candles: green up / red down, always ── */
  try {
    window.getBullishColor = function () { return GREEN; };
    window.getBearishColor = function () { return RED_C; };
    if (typeof TEAL !== 'undefined') TEAL = GREEN;   /* engine captured the old getters at parse */
    if (typeof BEAR !== 'undefined') BEAR = RED_C;
  } catch (e) {}

  /* v2 animated player: the engine captures its candle colours at PARSE time
     (before this file runs), so the old LT cyan/pink can reach LTRenderer via
     opts.colors — wrap the constructor and force the stage palette */
  try {
    if (typeof window.LTRenderer === 'function') {
      var OrigRenderer = window.LTRenderer;
      window.LTRenderer = function (mount, lesson, opts) {
        opts = opts || {};
        opts.colors = { bull: GREEN, bear: RED_C };
        return OrigRenderer.call(this, mount, lesson, opts);
      };
      window.LTRenderer.prototype = OrigRenderer.prototype;
      for (var rk in OrigRenderer) if (Object.prototype.hasOwnProperty.call(OrigRenderer, rk)) window.LTRenderer[rk] = OrigRenderer[rk];
    }
  } catch (e) {}

  /* late readers of the token registry (engine's own consts were captured at
     parse and are unreachable — the echarts wrapper below covers their output) */
  try {
    if (window.LT_TOKENS) {
      LT_TOKENS.teal2 = '#039e6b'; LT_TOKENS.red = RED_C;
      LT_TOKENS.viz.bull = GREEN;  LT_TOKENS.viz.bullRgb = '4,185,125';
      LT_TOKENS.viz.bear = RED_C;  LT_TOKENS.viz.bearRgb = '241,60,84';
    }
  } catch (e) {}

  /* ── every echarts chart passes through here ── */
  try {
    if (window.echarts && !echarts.__blofin) {
      var origInit = echarts.init;
      echarts.init = function () {
        var chart = origInit.apply(this, arguments);
        var origSet = chart.setOption;
        chart.setOption = function (opt) {
          arguments[0] = deepMap(opt);
          return origSet.apply(this, arguments);
        };
        return chart;
      };
      echarts.__blofin = true;
    }
  } catch (e) {}

  /* ── course accents → distinct warm hues, all orange-adjacent (owner ask):
     C1 brand orange · C2 gold · C3 vermilion · C4 copper-salmon ── */
  try {
    if (typeof LT_COURSES !== 'undefined') {
      var ACC = [
        ['#ff8802', '#e07000'], ['#ffc21a', '#b28500'],
        ['#ff5f2e', '#d9481a'], ['#f4845f', '#c96a4a']
      ];
      for (var c = 0; c < LT_COURSES.length && c < ACC.length; c++) {
        LT_COURSES[c].accent = ACC[c][0];
        LT_COURSES[c].accentLight = ACC[c][1];
      }
    }
  } catch (e) {}

  /* ── branding: share link, course-4 name, residual LT mentions ── */
  try {
    window.ltShareSite = function () {
      if (typeof _ltCopy === 'function') _ltCopy(location.origin + '/blofintest', 'BloFin Academy link copied');
    };
  } catch (e) {}

  /* header live-BTC ticker → jump straight to the simulator's Live BTC feed
     (the source button renders with the sim view, so retry until it exists) */
  window.bfOpenLiveBTC = function () {
    try { if (typeof showSimulator === 'function') showSimulator(); } catch (e) { return; }
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var btns = document.querySelectorAll('#content-area button');
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].textContent.trim() === 'Live BTC') {
          btns[i].click();
          clearInterval(t);
          return;
        }
      }
      if (tries > 20) clearInterval(t);
    }, 150);
  };

  /* "Liquidity Theory" the CONCEPT (Course 4's name, the methodology taught,
     glossary prose) is KEPT — the website was named after the course, not the
     other way round (owner ruling). Only the SITE-brand greeting is swapped. */
  document.addEventListener('DOMContentLoaded', function () {
    var area = document.getElementById('content-area');
    if (!area) return;
    var swap = function () {
      /* course/tool views must keep the fixed Next/Back bar visible: any
         body scroll (focus-scrolling, a leftover position from reading the
         footer on Home) would slide the site footer up over it — pin the
         window to the top whenever we're NOT on the Home hub */
      if (!area.querySelector('.lt-home-hero') && window.scrollY > 0) window.scrollTo(0, 0);
      var walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = walker.nextNode())) {
        if (n.nodeValue.indexOf('Welcome to Liquidity Theory') !== -1) {
          n.nodeValue = n.nodeValue.replace(/Welcome to Liquidity Theory/g, 'Welcome to BloFin Academy');
        }
        /* the settings "Share ..." row names the SITE, not the course concept */
        if (n.nodeValue.indexOf('Share Liquidity Theory') !== -1) {
          n.nodeValue = n.nodeValue.replace(/Share Liquidity Theory/g, 'Share BloFin Academy');
        }
      }
      /* mascots: original pepes (recovered from backup history) replace the
         flamingo set — sips on this Mac can't write webp, so the stage keeps
         PNG copies and we retarget the img tags */
      var imgs = area.querySelectorAll('img[src*="perpingo-"]');
      for (var i = 0; i < imgs.length; i++) {
        var src = imgs[i].getAttribute('src');
        if (src.indexOf('.webp') === -1) continue;   /* already retargeted */
        imgs[i].src = src.replace(/^.*perpingo-([a-z]+)-160\.webp.*$/, '/blofintest/perpingo-$1-160.png');
      }
      /* Settings brand foot: "A Vice Terminal product" + flamingo → BloFin
         mark + their tagline (idempotent via data flag) */
      var brand = area.querySelector('.lt-settings-brand:not([data-blofin])');
      if (brand) {
        brand.setAttribute('data-blofin', '1');
        brand.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" style="width:16px;height:16px;flex-shrink:0" aria-label="BloFin">' +
            '<path d="M18.491 5.66919L15.1386 8.18853L11.1748 11.162V14.4308L19.4167 8.24191C19.4167 8.2296 19.4187 8.2183 19.4187 8.20598C19.4187 7.1773 19.1095 6.33239 18.491 5.66919Z" fill="#FF8802"/>' +
            '<path d="M18.3813 12.3085C18.2477 12.2356 18.106 12.1709 17.956 12.1103L15.408 14.0086C15.6803 14.2796 15.8179 14.641 15.8179 15.0937C15.8179 15.6235 15.6361 16.0485 15.2703 16.3216C14.9056 16.5947 14.359 16.7312 13.6296 16.7312H8.9699V7.15996H13.3779C13.9553 7.15996 14.4073 7.3006 14.734 7.58087C14.9262 7.74513 15.0597 7.9484 15.1388 8.18761L18.4912 5.66827C18.2899 5.45268 18.0566 5.25556 17.7895 5.07898C16.7025 4.36035 15.1173 4 13.0358 4H5.07959V19.9127H12.9669C15.2775 19.9127 17.0395 19.5257 18.256 18.7536C19.4714 17.9806 20.0796 16.8595 20.0796 15.3894C20.0796 14.6769 19.9388 14.064 19.6573 13.5476C19.3758 13.0323 18.9505 12.6196 18.3803 12.3095L18.3813 12.3085Z" fill="currentColor"/>' +
          '</svg>' +
          '<span>Where <strong style="color:#ff8802">Whales</strong> Are Made</span>';
      }

      /* engine-inline colours: lt-engine templates carry hardcoded LT hexes in
         style/fill/stroke attributes (the engine file itself is shared with
         prod, so it can't be recolored) — remap them in the rendered DOM */
      var els = area.querySelectorAll('[style*="#"], [style*="rgba"], [fill], [stroke], [stop-color]');
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        for (var a = 0; a < 4; a++) {
          var name = ['style', 'fill', 'stroke', 'stop-color'][a];
          var val = el.getAttribute(name);
          if (!val) continue;
          var mapped = mapStr(val);
          if (mapped !== val) el.setAttribute(name, mapped);
        }
      }
    };
    new MutationObserver(swap).observe(area, { childList: true, subtree: true });
    swap();
    /* body scroll exists only to reach the site footer below the app — that
       is a Home-hub affordance; everywhere else snap back so the fixed
       Next/Back bar is always on screen */
    window.addEventListener('scroll', function () {
      if (window.scrollY > 0 && !area.querySelector('.lt-home-hero')) window.scrollTo(0, 0);
    }, { passive: true });

    /* size the app to (viewport − masthead) EMPIRICALLY: the display-scale
       body{zoom} tiers mix zoomed and physical pixels, so a pure CSS calc
       can't be right on every tier — measure the rendered masthead instead */
    var sizeApp = function () {
      var mast = document.querySelector('.bf-masthead');
      var app = document.querySelector('.app-layout');
      if (!mast || !app) return;
      var mh = mast.getBoundingClientRect().height;      /* visual px */
      var zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
      app.style.setProperty('height', ((window.innerHeight - mh) / zoom) + 'px', 'important');
    };
    sizeApp();
    window.addEventListener('resize', sizeApp);
    setTimeout(sizeApp, 300);   /* after fonts settle */
  });
})();
