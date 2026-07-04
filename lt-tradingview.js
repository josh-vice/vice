'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — TradingView embed (opt-in reference chart)
   lt-tradingview.js

   A thin, LAZY wrapper around TradingView's free Advanced Chart widget. The
   external script (s3.tradingview.com/tv.js) is injected ONLY the first time a
   user actually opens a TradingView view — normal page loads and the Replay /
   Live BTC simulator modes stay fully dependency-free and tracker-free.

   API (window.LTTradingView):
     load()  → Promise<TradingView>  (resolves once the widget lib is ready)
     mount(containerId, {symbol, theme, interval}) → { remove() }
     isReady() → boolean

   The app has no CSP, so the third-party script + iframe load in prod and local.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (g) {

  const TV_SRC   = 'https://s3.tradingview.com/tv.js';
  const TIMEOUT  = 9000;
  let _loading = null;   // shared Promise so concurrent callers reuse one injection

  function load() {
    if (g.TradingView && g.TradingView.widget) return Promise.resolve(g.TradingView);
    if (_loading) return _loading;
    _loading = new Promise(function (resolve, reject) {
      // reuse an existing tag if one is mid-flight
      let s = document.querySelector('script[data-lt-tv]');
      // a dead/errored tag can never fire load/error again, and a rejected
      // _loading would poison every retry — so ALWAYS clear _loading + drop the
      // tag before rejecting, letting the next open inject a fresh script.
      const fail = (why) => { _loading = null; if (s && s.parentNode) s.parentNode.removeChild(s); reject(new Error(why)); };
      const done = () => {
        if (g.TradingView && g.TradingView.widget) resolve(g.TradingView);
        else fail('TradingView loaded but widget API missing');   // stub/partial tv.js → retryable
      };
      if (!s) {
        s = document.createElement('script');
        s.src = TV_SRC;
        s.async = true;
        s.setAttribute('data-lt-tv', '1');
        s.onload = done;
        s.onerror = () => fail('TradingView script failed to load');
        document.head.appendChild(s);
      } else if (g.TradingView && g.TradingView.widget) {
        done();
      } else {
        s.addEventListener('load', done, { once: true });
        s.addEventListener('error', () => fail('TradingView script failed to load'), { once: true });
      }
      setTimeout(() => { if (!(g.TradingView && g.TradingView.widget)) fail('TradingView load timed out'); }, TIMEOUT);
    });
    return _loading;
  }

  /* Mount a widget into `containerId`. The container is fully owned by the widget
     while mounted; remove() clears it (drops the iframe + any TV listeners). */
  function mount(containerId, opts) {
    opts = opts || {};
    const host = document.getElementById(containerId);
    if (!host || !(g.TradingView && g.TradingView.widget)) return { remove() {} };
    host.innerHTML = '';
    let widget = null;
    try {
      widget = new g.TradingView.widget({
        container_id: containerId,
        symbol:   opts.symbol   || 'BINANCE:BTCUSDT',
        interval: opts.interval || '60',
        theme:    opts.theme === 'light' ? 'light' : 'dark',
        style:    '1',                 // candles
        timezone: 'Etc/UTC',
        locale:   'en',
        autosize: true,
        allow_symbol_change: true,     // users can study any market
        hide_side_toolbar: false,
        withdateranges: true,
        hide_legend: false,
        save_image: false
      });
    } catch (_) { /* leave host empty; caller shows fallback */ }
    return {
      widget: widget,
      remove() {
        try { if (widget && typeof widget.remove === 'function') widget.remove(); } catch (_) {}
        const el = document.getElementById(containerId);
        if (el) el.innerHTML = '';
      }
    };
  }

  function isReady() { return !!(g.TradingView && g.TradingView.widget); }

  g.LTTradingView = { load: load, mount: mount, isReady: isReady };

})(typeof window !== 'undefined' ? window : this);
