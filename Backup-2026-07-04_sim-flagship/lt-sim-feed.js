'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Practice Simulator: LIVE BTC market data feed
   lt-sim-feed.js

   Public, key-less market data with a provider fallback chain:
     Coinbase Exchange (BTC-USD) → Kraken (XBT/USD) → Binance (BTCUSDT)
   All three expose CORS-enabled REST klines and a public WebSocket trade/
   ticker stream. The first provider that answers becomes sticky for the
   page session (candles and ticks stay on one venue's prices).

   API (window.LTSimFeed):
     loadKlines(tfMin, limit?) → Promise<{ohlc:[[o,c,l,h]…], vols:[…],
                                          times:[ms…], provider}>
       Oldest-first, INCLUDING the current partial candle as the last entry.
     streamTicks({onTick, onStatus}) → {stop()}
       onTick(price, size)  — every trade (or ticker update / poll result)
       onStatus('live'|'polling'|'reconnecting'|'dead')
     providerName() → display name of the sticky provider ('' if none yet)

   No exchange accounts, no orders, no keys — read-only public data.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (g) {

  const TIMEOUT_MS = 7000;
  const POLL_MS    = 2500;
  const WS_RETRIES = 2;       // reconnect attempts before falling back to polling

  function _fetchJson(url) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    return fetch(url, { signal: ctl.signal, cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .finally(() => clearTimeout(t));
  }

  /* Each provider normalizes to { ohlc:[[o,c,l,h]…], vols, times } oldest-first. */
  const PROVIDERS = [
    {
      key: 'coinbase', name: 'Coinbase',
      klines(tfMin, limit) {
        const gran = tfMin * 60; // 60 | 300 | 900 | 3600
        return _fetchJson('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=' + gran)
          .then(rows => {
            // rows: [time(s), low, high, open, close, volume] NEWEST-first
            rows = rows.slice(0, limit).reverse();
            return {
              ohlc: rows.map(r => [+r[3], +r[4], +r[1], +r[2]]),
              vols: rows.map(r => +(+r[5]).toFixed(3)),
              times: rows.map(r => r[0] * 1000)
            };
          });
      },
      pollPx() { return _fetchJson('https://api.exchange.coinbase.com/products/BTC-USD/ticker').then(j => +j.price); },
      wsUrl: 'wss://ws-feed.exchange.coinbase.com',
      wsSubscribe(ws) { ws.send(JSON.stringify({ type: 'subscribe', product_ids: ['BTC-USD'], channels: ['ticker'] })); },
      wsParse(msg, onTick) { if (msg.type === 'ticker' && msg.price) onTick(+msg.price, +msg.last_size || 0); }
    },
    {
      key: 'kraken', name: 'Kraken',
      klines(tfMin, limit) {
        return _fetchJson('https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=' + tfMin)
          .then(j => {
            if (j.error && j.error.length) throw new Error(j.error[0]);
            const key = Object.keys(j.result).find(k => k !== 'last');
            const rows = j.result[key].slice(-limit); // [time,o,h,l,c,vwap,vol,count] oldest-first
            return {
              ohlc: rows.map(r => [+r[1], +r[4], +r[3], +r[2]]),
              vols: rows.map(r => +(+r[6]).toFixed(3)),
              times: rows.map(r => r[0] * 1000)
            };
          });
      },
      pollPx() {
        return _fetchJson('https://api.kraken.com/0/public/Ticker?pair=XBTUSD')
          .then(j => +Object.values(j.result)[0].c[0]);
      },
      wsUrl: 'wss://ws.kraken.com',
      wsSubscribe(ws) { ws.send(JSON.stringify({ event: 'subscribe', pair: ['XBT/USD'], subscription: { name: 'trade' } })); },
      wsParse(msg, onTick) {
        if (Array.isArray(msg) && msg[2] === 'trade' && Array.isArray(msg[1]))
          for (const t of msg[1]) onTick(+t[0], +t[1] || 0);
      }
    },
    {
      key: 'binance', name: 'Binance',
      klines(tfMin, limit) {
        const iv = { 1: '1m', 5: '5m', 15: '15m', 60: '1h' }[tfMin] || '15m';
        return _fetchJson('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=' + iv + '&limit=' + limit)
          .then(rows => ({
            ohlc: rows.map(r => [+r[1], +r[4], +r[3], +r[2]]),
            vols: rows.map(r => +(+r[5]).toFixed(3)),
            times: rows.map(r => r[0])
          }));
      },
      pollPx() { return _fetchJson('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT').then(j => +j.price); },
      wsUrl: 'wss://stream.binance.com:9443/ws/btcusdt@trade',
      wsSubscribe() {},
      wsParse(msg, onTick) { if (msg.p) onTick(+msg.p, +msg.q || 0); }
    }
  ];

  let _sticky = null;   // provider that answered first — stays for the page session

  function loadKlines(tfMin, limit) {
    limit = limit || 300;
    const chain = _sticky ? [_sticky] : PROVIDERS;
    let i = 0;
    const tryNext = err => {
      if (i >= chain.length) {
        // sticky provider died mid-session → retry the full chain once
        if (_sticky) { _sticky = null; return loadKlines(tfMin, limit); }
        return Promise.reject(err || new Error('all providers failed'));
      }
      const p = chain[i++];
      return p.klines(tfMin, limit).then(data => {
        if (!data.ohlc || data.ohlc.length < 10) throw new Error('thin data from ' + p.key);
        _sticky = p;
        data.provider = p.name;
        return data;
      }).catch(tryNext);
    };
    return tryNext();
  }

  /* Live tick stream on the sticky provider. WS first; after WS_RETRIES failed
     (re)connects it degrades to REST polling every POLL_MS. stop() is final. */
  function streamTicks(opts) {
    const onTick   = opts.onTick   || function () {};
    const onStatus = opts.onStatus || function () {};
    const prov = _sticky || PROVIDERS[0];
    let ws = null, pollTimer = null, retries = 0, stopped = false, everOpened = false;

    function startPolling() {
      if (stopped || pollTimer) return;
      onStatus('polling');
      const poll = () => {
        if (stopped) return;
        prov.pollPx().then(px => { if (!stopped && px > 0) onTick(px, 0); }).catch(() => {});
      };
      poll();
      pollTimer = setInterval(poll, POLL_MS);
    }

    function connect() {
      if (stopped) return;
      let opened = false;
      try { ws = new WebSocket(prov.wsUrl); } catch (_) { startPolling(); return; }
      ws.onopen = () => {
        opened = true; everOpened = true; retries = 0;
        try { prov.wsSubscribe(ws); } catch (_) {}
        onStatus('live');
      };
      ws.onmessage = e => {
        try { prov.wsParse(JSON.parse(e.data), onTick); } catch (_) {}
      };
      ws.onerror = () => { try { ws.close(); } catch (_) {} };
      ws.onclose = () => {
        ws = null;
        if (stopped) return;
        if (retries < WS_RETRIES) {
          retries++;
          onStatus('reconnecting');
          setTimeout(connect, retries * 1500);
        } else {
          startPolling();   // WS unreachable (network/geo) → poll
        }
      };
      // some blocked networks neither open nor error promptly — belt & braces
      setTimeout(() => { if (!opened && !stopped && ws) { try { ws.close(); } catch (_) {} } }, TIMEOUT_MS);
    }

    connect();
    return {
      stop() {
        stopped = true;
        if (ws) { try { ws.onclose = null; ws.close(); } catch (_) {} ws = null; }
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        onStatus('dead');
      }
    };
  }

  g.LTSimFeed = {
    loadKlines,
    streamTicks,
    providerName() { return _sticky ? _sticky.name : ''; }
  };

})(typeof window !== 'undefined' ? window : this);
