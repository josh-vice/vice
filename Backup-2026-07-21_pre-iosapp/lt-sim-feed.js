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
  const _now = () => Date.now();

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
      older(tfMin, beforeMs, limit) {
        const gran = tfMin * 60;
        const end = Math.floor(beforeMs / 1000) - 1;                 // exclusive of the oldest we hold
        const start = end - (Math.min(limit, 300) - 1) * gran;
        return _fetchJson('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=' + gran + '&start=' + start + '&end=' + end)
          .then(rows => {
            rows = rows.reverse();                                    // newest-first → oldest-first
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
      older(tfMin, beforeMs, limit) {
        const iv = { 1: '1m', 5: '5m', 15: '15m', 60: '1h' }[tfMin] || '15m';
        return _fetchJson('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=' + iv + '&endTime=' + (beforeMs - 1) + '&limit=' + Math.min(limit, 1000))
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
    // try the sticky provider first, then the rest of the chain EXCLUDING it
    // (so a sticky Coinbase outage doesn't re-spend a full 7s timeout on
    // Coinbase again before Kraken is even tried).
    const chain = _sticky ? [_sticky].concat(PROVIDERS.filter(p => p !== _sticky)) : PROVIDERS.slice();
    let i = 0;
    const tryNext = err => {
      if (i >= chain.length) {
        _sticky = null;
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

  /* Older-history page for infinite scroll — candles STRICTLY before beforeMs,
     oldest-first, on the sticky provider. Kraken has no clean backward paging,
     so it (and any failure) resolves to an empty page = "no more history". */
  function loadOlder(tfMin, beforeMs, limit) {
    const prov = _sticky;
    const empty = { ohlc: [], vols: [], times: [], provider: prov ? prov.name : '' };
    if (!prov || typeof prov.older !== 'function' || !(beforeMs > 0)) return Promise.resolve(empty);
    return prov.older(tfMin, beforeMs, limit || 300).then(data => {
      const out = { ohlc: [], vols: [], times: [], provider: prov.name };
      const t = data && data.times || [];
      for (let i = 0; i < t.length; i++) {
        if (t[i] < beforeMs) { out.ohlc.push(data.ohlc[i]); out.vols.push(data.vols[i]); out.times.push(t[i]); }
      }
      return out;
    }).catch(() => empty);
  }

  /* Live tick stream. WS first on the sticky provider; if it can't stay
     connected it degrades to REST polling, and if polling also dies it advances
     to the next provider. A liveness watchdog catches half-open sockets (sleep/
     wake, network handoff) that would otherwise leave a frozen 'live' price
     feeding the engine. stop() is final and idempotent. */
  function streamTicks(opts) {
    const onTick   = opts.onTick   || function () {};
    const onStatus = opts.onStatus || function () {};
    // provider list starting at the sticky one — advances on hard failure
    let order = _sticky ? [_sticky].concat(PROVIDERS.filter(p => p !== _sticky)) : PROVIDERS.slice();
    let pi = 0;
    const prov = () => order[Math.min(pi, order.length - 1)];
    let ws = null, pollTimer = null, retries = 0, stopped = false;
    let lastTickAt = 0, pollFails = 0, watchdog = null;

    function emit(px, sz) { lastTickAt = _now(); if (!stopped && px > 0) onTick(px, sz); }

    function nextProvider() {
      // hard failure on the current venue → try the next; wrap to 'dead' if none
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      pi++;
      if (pi >= order.length) { onStatus('dead'); pi = order.length - 1; return false; }
      retries = 0;
      onStatus('reconnecting');
      connect();
      return true;
    }

    function startPolling() {
      if (stopped || pollTimer) return;
      onStatus('polling');
      pollFails = 0;
      let samePx = 0, lastPollPx = 0;
      const poll = () => {
        if (stopped) return;
        const gen = pi;                               // provider generation at fire time
        prov().pollPx().then(px => {
          if (stopped || gen !== pi) return;          // a provider switch happened mid-flight — drop it
          pollFails = 0;
          // a successful-but-frozen ticker is as bad as a failure: escalate if
          // the price hasn't moved for many polls (dead/cached endpoint)
          if (px === lastPollPx) { if (++samePx >= 10) { samePx = 0; nextProvider(); return; } }
          else { samePx = 0; lastPollPx = px; }
          emit(px, 0);
        }).catch(() => { if (gen === pi && ++pollFails >= 5) nextProvider(); });
      };
      poll();
      pollTimer = setInterval(poll, POLL_MS);
    }

    function connect() {
      if (stopped) return;
      const p = prov();
      let sock;
      try { sock = new WebSocket(p.wsUrl); } catch (_) { startPolling(); return; }
      ws = sock;
      sock.onopen = () => {
        if (stopped || sock !== ws) { try { sock.close(); } catch (_) {} return; }
        retries = 0; lastTickAt = _now();
        try { p.wsSubscribe(sock); } catch (_) {}
        onStatus('live');
      };
      sock.onmessage = e => {
        if (sock !== ws) return;
        try { p.wsParse(JSON.parse(e.data), emit); } catch (_) {}
      };
      sock.onerror = () => { try { sock.close(); } catch (_) {} };
      sock.onclose = () => {
        if (sock !== ws || stopped) return;
        ws = null;
        if (retries < WS_RETRIES) { retries++; onStatus('reconnecting'); setTimeout(connect, retries * 1500); }
        else startPolling();   // WS unreachable on this venue → poll it
      };
      // never-opens guard: only close THIS socket, and only while still connecting
      setTimeout(() => {
        if (!stopped && sock === ws && sock.readyState === 0 /* CONNECTING */) { try { sock.close(); } catch (_) {} }
      }, TIMEOUT_MS);
    }

    // liveness watchdog: a socket that says 'live' but stops delivering ticks
    // (half-open) gets force-closed so the reconnect/poll path can recover
    watchdog = setInterval(() => {
      if (stopped) return;
      if (ws && ws.readyState === 1 && lastTickAt && (_now() - lastTickAt) > POLL_MS * 4) {
        try { ws.close(); } catch (_) {}   // triggers onclose → reconnect/poll
      }
    }, POLL_MS * 2);

    connect();
    return {
      stop() {
        if (stopped) return;
        stopped = true;
        if (ws) { const s = ws; ws = null; try { s.onclose = null; s.onerror = null; s.close(); } catch (_) {} }
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        if (watchdog) { clearInterval(watchdog); watchdog = null; }
        onStatus('dead');
      }
    };
  }

  g.LTSimFeed = {
    loadKlines,
    loadOlder,
    streamTicks,
    providerName() { return _sticky ? _sticky.name : ''; }
  };

})(typeof window !== 'undefined' ? window : this);
