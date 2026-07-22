/* Vice Hub — customizable live market dashboard + Velo-style section boards. v2.7.0
   Architecture: a widget REGISTRY (manifest per type: title, sizes, settings
   schema, mount/destroy lifecycle) + a Gridstack canvas (float mode, 24-col
   fine grid). Saved layouts store INSTANCES ({id,type,x,y,w,h,settings}),
   never implementations. Local-first: everything persists to localStorage.
   TradingView embeds do the heavy lifting; Vice-native widgets go through
   the cached /api/vice-* proxies (direct-API fallback keeps local dev alive).
   PATH RULE: this file lives in vice/ ROOT and is loaded as ../hub.js. */
(() => {
  'use strict';

  /* ── constants ─────────────────────────────────────────────────────── */
  const GRID_COLS = 24;
  const CELL_H = 36;
  const LS_KEY = 'viceHub.v1';
  const LS_WATCH = 'viceHub.watchlist';
  const SCHEMA_V = 1;

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => 'w' + Math.random().toString(36).slice(2, 9);
  const icons = () => { if (window.lucide) window.lucide.createIcons(); };

  const fmtPx = (v) => {
    if (v == null || !Number.isFinite(v)) return '—';
    const abs = Math.abs(v);
    if (abs > 0 && abs < 0.001) return v.toLocaleString('en-US', { maximumSignificantDigits: 3 });
    const digits = abs >= 1000 ? 0 : abs >= 10 ? 2 : abs >= 0.1 ? 4 : 6;
    return v.toLocaleString('en-US', { maximumFractionDigits: digits });
  };
  const fmtChg = (v) => (v == null || !Number.isFinite(v)) ? '—'
    : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
  const fmtCompact = (v) => {
    if (v == null || !Number.isFinite(v)) return '—';
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return fmtPx(v);
  };
  const ago = (ts) => {
    if (!ts) return '';
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return 'now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  async function getJson(url, ms = 12000) {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) throw new Error(`${new URL(url, location.href).host} HTTP ${res.status}`);
    return res.json();
  }
  // Cached proxy first (protects rate limits in prod); direct API fallback so
  // the page still works on a static local preview with no functions runtime.
  async function viaProxy(proxyPath, directFn) {
    try { return await getJson(proxyPath, 8000); }
    catch { return directFn(); }
  }

  /* ── shared Hyperliquid poller (one 5s loop for every subscriber) ───── */
  const hlFeed = (() => {
    const subs = new Set();
    let timer = null;
    let last = null;
    async function tick() {
      try {
        const res = await fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
          signal: AbortSignal.timeout(9000),
        });
        if (!res.ok) return;
        const [meta, ctxs] = await res.json();
        const map = {};
        meta.universe.forEach((u, i) => {
          if (u.isDelisted) return;
          const px = Number(ctxs[i].markPx);
          const prev = Number(ctxs[i].prevDayPx);
          map[u.name] = {
            px,
            chg: prev > 0 ? ((px - prev) / prev) * 100 : null,
            funding: Number(ctxs[i].funding),        // hourly rate
            oi: Number(ctxs[i].openInterest),        // coin units
            vol: Number(ctxs[i].dayNtlVlm),          // 24h notional $
          };
        });
        last = map;
        subs.forEach((fn) => { try { fn(map); } catch { /* widget's problem */ } });
      } catch { /* transient — next tick */ }
    }
    return {
      snap: () => last,
      sub(fn) {
        subs.add(fn);
        if (last) fn(last);
        if (!timer) { timer = setInterval(tick, 5000); tick(); }
        return () => {
          subs.delete(fn);
          if (subs.size === 0 && timer) { clearInterval(timer); timer = null; }
        };
      },
    };
  })();

  // await the first HL snapshot (widgets that mount before the 5s poller ticks)
  const hlSnap = () => (hlFeed.snap()
    ? Promise.resolve(hlFeed.snap())
    : new Promise((resolve) => { const un = hlFeed.sub((m) => { un(); resolve(m); }); }));

  // one-shot HL info queries (fundingHistory, candleSnapshot, …) — the 5s
  // poller above only covers the live snapshot
  const hlInfo = (payload) => fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(9000),
  }).then((r) => { if (!r.ok) throw new Error(`Hyperliquid HTTP ${r.status}`); return r.json(); });

  /* ── venue analytics scaffolding (futures widgets) ──────────────────── */
  // one hue per venue, consistent across every futures widget
  const VENUE_C = { HL: '#2dd4bf', OKX: '#38bdf8', BIN: '#f0b90b', BYB: '#b47aff', DER: '#e7b53a' };
  const VENUE_ORDER = ['BIN', 'BYB', 'OKX', 'DER', 'HL'];
  const byVenueOrder = (key = (x) => x) => (a, b) => VENUE_ORDER.indexOf(key(a)) - VENUE_ORDER.indexOf(key(b));
  const AXIS_LBL = { color: '#8b85a3', fontFamily: 'Geist Mono, monospace', fontSize: 10 };
  const AXIS_LINE = { lineStyle: { color: '#2a2440' } };
  const AXIS_SPLIT = { lineStyle: { color: 'rgba(139,133,163,0.12)' } };
  const TIP_BOX = {
    backgroundColor: '#0d0b18', borderColor: '#363049', borderWidth: 1, padding: [8, 11],
    textStyle: { color: '#f6f5fb', fontFamily: 'Geist Mono, monospace', fontSize: 12 },
  };
  // Deribit options book (CORS-open, no key) — one fetch feeds every options
  // widget for a minute; instrument names parse as CUR-DDMMMYY-STRIKE-C/P
  const deribitCache = {};
  async function deribitBook(cur) {
    const c = deribitCache[cur];
    if (c && Date.now() - c.t < 60_000) return c.rows;
    const j = await getJson(`https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${cur}&kind=option`, 12000);
    const rows = (j?.result ?? []).map((r) => {
      const m = r.instrument_name.split('-'); // [CUR, 26SEP26, 70000, C]
      return {
        name: r.instrument_name, exp: m[1], strike: Number(m[2]), cp: m[3],
        oi: Number(r.open_interest) || 0, vol: Number(r.volume) || 0,
        iv: Number(r.mark_iv), px: Number(r.underlying_price) || null,
      };
    });
    deribitCache[cur] = { t: Date.now(), rows };
    return rows;
  }
  const DERIBIT_MON = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
  function deribitExpMs(exp) {
    const m = /^(\d{1,2})([A-Z]{3})(\d{2})$/.exec(exp ?? '');
    if (!m || DERIBIT_MON[m[2]] == null) return null;
    return Date.UTC(2000 + Number(m[3]), DERIBIT_MON[m[2]], Number(m[1]), 8); // Deribit expires 08:00 UTC
  }

  /* ── options math: recover IV from option PRICE history ─────────────────
     Deribit serves per-instrument price history but not historical IV — and
     mark prices are Black-Scholes-consistent with mark IV, so inverting BS
     against the spot series reproduces the IV history faithfully. */
  const YR_MS = 31_536_000_000;
  const normCdf = (x) => {
    // Zelen & Severo polynomial — plenty for vol inversion
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989422804014327 * Math.exp(-x * x / 2);
    const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return x >= 0 ? 1 - p : p;
  };
  function bsPrice(S, K, T, sigma, isPut) {
    const sq = sigma * Math.sqrt(T);
    const d1 = (Math.log(S / K) + 0.5 * sigma * sigma * T) / sq;
    const call = S * normCdf(d1) - K * normCdf(d1 - sq);
    return isPut ? call - S + K : call;
  }
  function impliedVol(price, S, K, T, isPut) {
    if (!(price > 0) || !(S > 0) || !(K > 0) || !(T > 0)) return null;
    const intrinsic = Math.max(0, isPut ? K - S : S - K);
    if (price <= intrinsic + 1e-9) return null;
    let lo = 0.005;
    let hi = 5;
    if (bsPrice(S, K, T, hi, isPut) < price) return null;
    for (let i = 0; i < 48; i++) {
      const mid = (lo + hi) / 2;
      if (bsPrice(S, K, T, mid, isPut) > price) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }

  // constant-maturity tenors, colored the same on every options panel
  const TENORS = [['1w', 7], ['1m', 30], ['3m', 91], ['6m', 182]];
  const TENOR_C = { '1w': '#5aa7f7', '1m': '#b47aff', '3m': '#2dd4bf', '6m': '#e7b53a' };

  // pick the live expiry closest to each tenor target + its strike grid
  async function deribitTenors(cur) {
    const rows = await deribitBook(cur);
    const px = rows.find((r) => r.px)?.px;
    if (!px) throw new Error('Deribit feed returned nothing');
    const byExp = {};
    for (const r of rows) {
      const t = deribitExpMs(r.exp);
      if (!t || t < Date.now() + 86_400_000) continue;
      (byExp[r.exp] ??= { exp: r.exp, expMs: t, strikes: new Set(), iv: {} }).strikes.add(r.strike);
      if (Number.isFinite(r.iv) && r.iv > 0) byExp[r.exp].iv[`${r.strike}${r.cp}`] = r.iv;
    }
    const all = Object.values(byExp);
    const used = new Set();
    const tenors = [];
    for (const [label, dAhead] of TENORS) {
      const target = Date.now() + dAhead * 86_400_000;
      const best = all.filter((e) => !used.has(e.exp))
        .sort((a, b) => Math.abs(a.expMs - target) - Math.abs(b.expMs - target))[0];
      if (!best) continue;
      used.add(best.exp);
      tenors.push({ label, ...best, strikes: [...best.strikes].sort((a, b) => a - b) });
    }
    return { px, tenors };
  }
  const nearestStrike = (strikes, k) =>
    strikes.reduce((a, b) => (Math.abs(b - k) < Math.abs(a - k) ? b : a));
  // strike whose Black-Scholes delta is ±0.25 at the tenor's ATM vol
  function strike25d(px, sigma, T, isPut) {
    const z = 0.67449; // Φ⁻¹(0.75)
    const sq = sigma * Math.sqrt(T);
    return px * Math.exp((isPut ? -z : z) * sq + 0.5 * sigma * sigma * T);
  }

  // hourly spot closes for the IV inversion (proxied — no CORS on chart data)
  const spotHist = (cur) =>
    getJson(`/api/vice-deribit?instrument=${cur}-PERPETUAL&days=7`, 9000).then((j) => {
      const m = new Map();
      (j?.result?.ticks ?? []).forEach((t, i) => m.set(t, j.result.close[i]));
      if (!m.size) throw new Error('no spot history');
      return m;
    });

  // option price history (quoted in base coin) → [ts, iv%] via BS inversion
  async function ivSeries(name, expMs, K, isPut, spot) {
    const j = await getJson(`/api/vice-deribit?instrument=${encodeURIComponent(name)}&days=7`, 9000).catch(() => null);
    const ticks = j?.result?.ticks ?? [];
    const out = [];
    for (let i = 0; i < ticks.length; i++) {
      const S = spot.get(ticks[i]);
      if (!S) continue;
      const T = (expMs - ticks[i]) / YR_MS;
      const iv = impliedVol(j.result.close[i] * S, S, K, T, isPut);
      if (iv != null) out.push([ticks[i], iv * 100]);
    }
    return out;
  }

  // ECharts lifecycle shared by the native analytics widgets: wait for the
  // library, init, poll, resize, surface errors in the vchart error strip
  function chartMount(body, draw, pollMs) {
    const box = el('div', 'vchart');
    const err = el('div', 'vchart-err');
    body.append(box, err);
    let chart = null;
    let timer = null;
    let ro = null;
    let dead = false;
    let tries = 0;
    const run = async () => {
      try {
        await draw(chart);
        if (!dead) err.classList.remove('on');
      } catch (e) {
        if (!dead) { err.textContent = e.message; err.classList.add('on'); }
      }
    };
    const start = () => {
      if (dead) return;
      if (!window.echarts) {
        if (++tries > 75) { note(body, 'alert-triangle', "the chart engine didn't load — refresh the page"); return; }
        setTimeout(start, 200);
        return;
      }
      chart = window.echarts.init(box, null, { renderer: 'canvas' });
      run();
      if (pollMs) timer = setInterval(run, pollMs);
      ro = new ResizeObserver(() => chart?.resize());
      ro.observe(box);
    };
    start();
    return {
      destroy() { dead = true; clearInterval(timer); ro?.disconnect(); chart?.dispose(); },
      refresh() { if (chart) run(); },
    };
  }

  /* ── TradingView embed helper ───────────────────────────────────────── */
  function tvEmbed(body, script, config, fixedHeight = false) {
    const wrap = el('div', fixedHeight ? 'tv-wrap tv-fixed' : 'tv-wrap');
    const container = el('div', 'tradingview-widget-container');
    container.appendChild(el('div', 'tradingview-widget-container__widget'));
    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${script}.js`;
    s.async = true;
    s.textContent = JSON.stringify({ colorTheme: 'dark', locale: 'en', isTransparent: true, width: '100%', height: '100%', ...config });
    container.appendChild(s);
    wrap.appendChild(container);
    body.appendChild(wrap);
    return { destroy() { wrap.remove(); } };
  }

  const note = (body, icon, msg) => {
    const n = el('div', 'hw-note', `<i data-lucide="${icon}"></i><span>${msg}</span>`);
    body.appendChild(n);
    icons();
    return n;
  };

  /* ── settings schema field shorthands ───────────────────────────────── */
  const F = {
    text: (key, label, def, help) => ({ key, label, kind: 'text', def, help }),
    area: (key, label, def, help) => ({ key, label, kind: 'textarea', def, help }),
    num: (key, label, def, min, max) => ({ key, label, kind: 'number', def, min, max }),
    sel: (key, label, def, options) => ({ key, label, kind: 'select', def, options }),
    tog: (key, label, def, help) => ({ key, label, kind: 'toggle', def, help }),
  };
  const INTERVALS = [['1', '1m'], ['5', '5m'], ['15', '15m'], ['60', '1h'], ['240', '4h'], ['D', '1D'], ['W', '1W']];
  const LINKED = () => F.tog('linked', 'Follow linked symbol', true,
    'Clicking a row in a watchlist, movers, or funding block re-points this widget');


  /* ── coin icons + shared markets fetch (CoinGecko via the movers proxy) ── */
  const coinIcons = {};
  const coinNames = {};
  const registerIcons = (rows) => {
    for (const r of rows ?? []) {
      if (!r?.s) continue;
      if (r.img && !coinIcons[r.s]) coinIcons[r.s] = r.img;
      if (r.n && !coinNames[r.s]) coinNames[r.s] = r.n;
    }
  };
  const iconFor = (sym) => coinIcons[sym]
    ? `<img class="vic" src="${esc(coinIcons[sym])}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />`
    : `<span class="vic vic-f">${esc((sym ?? '?')[0])}</span>`;
  // one markets fetch feeds every widget for a minute — the market page has
  // half a dozen consumers, and unmemoized fan-out rate-limits CoinGecko
  let mktMemo = { t: 0, p: null };
  const fetchMarkets = () => {
    if (mktMemo.p && Date.now() - mktMemo.t < 60_000) return mktMemo.p;
    const p = fetchMarketsRaw().catch((e) => {
      if (mktMemo.p === p) mktMemo = { t: 0, p: null }; // failed — retry next call
      throw e;
    });
    mktMemo = { t: Date.now(), p };
    return p;
  };
  const fetchMarketsRaw = async () => {
    const direct = async () => {
      const raw = await getJson('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h%2C7d');
      return raw.map((c) => ({ s: (c.symbol || '').toUpperCase(), n: c.name, p: c.current_price, c24: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? null, c7d: c.price_change_percentage_7d_in_currency ?? null, mc: c.market_cap, fdv: c.fully_diluted_valuation ?? null, img: c.image ?? null }));
    };
    let rows = await viaProxy('/api/vice-movers', direct);
    // a deployed proxy that predates the 7d field starves the weekly panels —
    // go direct once, keep the proxy rows if CoinGecko won't answer either
    if (rows?.length && rows.every((r) => r.c7d == null)) {
      try { rows = await direct(); } catch { /* keep proxy rows */ }
    }
    registerIcons(rows);
    return rows;
  };

  /* ── linked symbols: click a row anywhere → linked widgets follow ───── */
  const TV_SYM = { BTC: 'BITSTAMP:BTCUSD', ETH: 'BITSTAMP:ETHUSD', HYPE: 'COINBASE:HYPEUSD' };
  const tvSymbolFor = (sym) => TV_SYM[sym] ?? `CRYPTO:${sym}USD`;
  let linkedSym = null;
  function linkSymbol(sym) {
    linkedSym = String(sym).toUpperCase();
    let hits = 0;
    for (const [id, rec] of live) {
      const man = HUB_WIDGETS[rec.inst.type];
      if (!man.link) continue;
      const merged = { ...defaults(man), ...rec.inst.settings };
      if (!merged.linked) continue;
      rec.inst.settings = { ...rec.inst.settings, ...man.link(merged, linkedSym) };
      remount(id);
      hits++;
    }
    persist();
    // the chart page follows the new symbol wholesale
    if (currentSection === 'chart') { renderSection(); return; }
    if (hits) toast(`linked ${hits} block${hits === 1 ? '' : 's'} to ${linkedSym}`);
  }
  const rowLinker = (container) => container.addEventListener('click', (ev) => {
    const r = ev.target.closest('.vrow.clickable');
    if (r?.dataset.sym) linkSymbol(r.dataset.sym);
  });

  /* ── widget registry ────────────────────────────────────────────────── */
  // venue snapshot bars (24h volume / OI): the aggregator serves all five
  // venues to every visitor; direct venue APIs are the keyless fallback
  // (Binance/Bybit vanish for US visitors on that path)
  const venueSnapWidget = (mode) => ({
    title: mode === 'oi' ? 'Open Interest Snapshot' : '24h Volume',
    icon: mode === 'oi' ? 'database' : 'bar-chart-4', cat: 'Futures', vice: true,
    w: 8, h: 8, minW: 4, minH: 5,
    settings: [
      F.text('symbol', 'Symbol', 'BTC', 'Coin ticker — venues that answer are drawn'),
      LINKED(),
    ],
    link: (s, sym) => ({ symbol: sym }),
    label: (s) => s.symbol.trim().toUpperCase(),
    mount(body, s) {
      const SYM = s.symbol.trim().toUpperCase();
      const h = chartMount(body, async (chart) => {
        let out = [];
        const agg = await getJson(`/api/vice-coinalyze?kind=${mode === 'oi' ? 'oisnap' : 'volsnap'}&sym=${SYM}`, 9000).catch(() => null);
        if (agg?.venues?.length) out = agg.venues.map((v) => [v.venue, v.value]);
        if (!out.length) {
          const hl = hlFeed.snap()?.[SYM];
          if (hl) out.push(['HL', mode === 'oi' ? hl.oi * hl.px : hl.vol]);
          await Promise.allSettled([
            (mode === 'oi'
              ? getJson(`https://www.okx.com/api/v5/public/open-interest?instId=${SYM}-USDT-SWAP`, 6000)
                .then((j) => Number(j?.data?.[0]?.oiUsd))
              : getJson(`https://www.okx.com/api/v5/market/ticker?instId=${SYM}-USDT-SWAP`, 6000)
                .then((j) => Number(j?.data?.[0]?.volCcy24h) * Number(j?.data?.[0]?.last))
            ).then((v) => { if (Number.isFinite(v) && v > 0) out.push(['OKX', v]); }),
            (mode === 'oi'
              ? Promise.all([
                getJson(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${SYM}USDT`, 6000),
                getJson(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${SYM}USDT`, 6000),
              ]).then(([o, p]) => Number(o?.openInterest) * Number(p?.price))
              : getJson(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${SYM}USDT`, 6000)
                .then((j) => Number(j?.quoteVolume))
            ).then((v) => { if (Number.isFinite(v) && v > 0) out.push(['BIN', v]); }),
            getJson(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${SYM}USDT`, 6000)
              .then((j) => {
                const d = j?.result?.list?.[0];
                const v = Number(mode === 'oi' ? d?.openInterestValue : d?.turnover24h);
                if (Number.isFinite(v) && v > 0) out.push(['BYB', v]);
              }),
            // Deribit inverse perps report OI and volume in USD directly
            getJson(`https://www.deribit.com/api/v2/public/ticker?instrument_name=${SYM}-PERPETUAL`, 6000)
              .then((j) => {
                const r = j?.result;
                const v = Number(mode === 'oi' ? r?.open_interest : r?.stats?.volume_usd);
                if (Number.isFinite(v) && v > 0) out.push(['DER', v]);
              }),
          ]);
        }
        if (!out.length) throw new Error(`no venue answered for ${SYM} — try a coin with a USDT perp`);
        out.sort(byVenueOrder((r) => r[0]));
        chart.setOption({
          backgroundColor: 'transparent',
          grid: { left: 8, right: 8, top: 14, bottom: 4, containLabel: true },
          tooltip: { ...TIP_BOX, formatter: (p) => `<b>${esc(p.name)}</b> · $${fmtCompact(p.value)}` },
          xAxis: { type: 'category', data: out.map((r) => r[0]), axisLabel: AXIS_LBL, axisLine: AXIS_LINE, axisTick: { show: false } },
          yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: (v) => `$${fmtCompact(v)}` }, splitLine: AXIS_SPLIT },
          series: [{
            type: 'bar', barMaxWidth: 46, data: out.map((r) => ({ value: r[1], itemStyle: { color: VENUE_C[r[0]], borderRadius: [3, 3, 0, 0] } })),
            label: { show: true, position: 'top', ...AXIS_LBL, fontSize: 10, formatter: (p) => `$${fmtCompact(p.value)}` },
          }],
        }, { notMerge: true });
      }, 60_000);
      // first paint often beats the HL snapshot — redraw once it lands
      if (!hlFeed.snap()) setTimeout(() => h.refresh(), 4000);
      return h;
    },
  });

  // seasonality bars (avg return by UTC hour / weekday over the last month)
  const seasonalityWidget = (byHour) => ({
    title: byHour ? '1m Average Return By Hour (UTC)' : '1m Average Return By Day (UTC)',
    icon: byHour ? 'clock-4' : 'calendar', cat: 'Futures', vice: true,
    w: 8, h: 7, minW: 4, minH: 5,
    settings: [
      F.text('symbol', 'Symbol', 'BTC', 'Coin ticker (Hyperliquid history)'),
      LINKED(),
    ],
    link: (s, sym) => ({ symbol: sym }),
    label: (s) => s.symbol.trim().toUpperCase(),
    mount(body, s) {
      const SYM = s.symbol.trim().toUpperCase();
      return chartMount(body, async (chart) => {
        const rows = await hlInfo({ type: 'candleSnapshot', req: { coin: SYM, interval: byHour ? '1h' : '1d', startTime: Date.now() - 30 * 86_400_000, endTime: Date.now() } });
        if (!Array.isArray(rows) || rows.length < 8) throw new Error(`no Hyperliquid history for ${SYM}`);
        const n = byHour ? 24 : 7;
        const sum = Array(n).fill(0);
        const cnt = Array(n).fill(0);
        for (const r of rows) {
          const o = Number(r.o);
          const c = Number(r.c);
          if (!(o > 0)) continue;
          const slot = byHour ? new Date(Number(r.t)).getUTCHours() : new Date(Number(r.t)).getUTCDay();
          sum[slot] += ((c - o) / o) * 100;
          cnt[slot] += 1;
        }
        const idx = byHour ? [...Array(24).keys()] : [1, 2, 3, 4, 5, 6, 0]; // weekdays Mon-first
        const labels = byHour ? idx.map((hh) => `${hh}:00`) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const data = idx.map((i) => (cnt[i] ? sum[i] / cnt[i] : 0));
        chart.setOption({
          backgroundColor: 'transparent',
          grid: { left: 8, right: 8, top: 14, bottom: 4, containLabel: true },
          tooltip: { ...TIP_BOX, formatter: (p) => `<b>${esc(p.name)}</b> UTC · avg ${p.value >= 0 ? '+' : ''}${Number(p.value).toFixed(3)}%` },
          xAxis: { type: 'category', data: labels, axisLabel: { ...AXIS_LBL, interval: byHour ? 3 : 0 }, axisLine: AXIS_LINE, axisTick: { show: false } },
          yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: (v) => `${v.toFixed(2)}%` }, splitLine: AXIS_SPLIT },
          series: [{
            type: 'bar', barMaxWidth: 30,
            data: data.map((v) => ({ value: v, itemStyle: { color: v >= 0 ? '#21d196' : '#ff6473', borderRadius: v >= 0 ? [2, 2, 0, 0] : [0, 0, 2, 2] } })),
          }],
        }, { notMerge: true });
      }, 900_000);
    },
  });

  const HUB_WIDGETS = {

    /* — TradingView: charts — */
    tvChart: {
      title: 'Advanced Chart', icon: 'candlestick-chart', cat: 'Charts',
      w: 12, h: 12, minW: 6, minH: 7,
      settings: [
        F.text('symbol', 'Symbol', 'BITSTAMP:BTCUSD', 'Any TradingView symbol, e.g. NASDAQ:AAPL, SP:SPX, BITSTAMP:ETHUSD'),
        F.sel('interval', 'Interval', '60', INTERVALS),
        F.sel('style', 'Style', '1', [['1', 'Candles'], ['3', 'Line'], ['8', 'Heikin Ashi'], ['9', 'Hollow candles']]),
        F.tog('toolbar', 'Show top toolbar', true),
        LINKED(),
      ],
      link: (s, sym) => ({ symbol: tvSymbolFor(sym) }),
      label: (s) => s.symbol.split(':').pop(),
      mount(body, s) {
        return tvEmbed(body, 'advanced-chart', {
          autosize: true, symbol: s.symbol, interval: s.interval, style: s.style,
          theme: 'dark', timezone: 'Etc/UTC', backgroundColor: 'rgba(13,11,24,1)',
          gridColor: 'rgba(39,34,53,0.6)', hide_top_toolbar: !s.toolbar,
          allow_symbol_change: true, calendar: false, support_host: 'https://www.tradingview.com',
        });
      },
    },
    tvMini: {
      title: 'Mini Chart', icon: 'line-chart', cat: 'Charts',
      w: 6, h: 6, minW: 4, minH: 4,
      settings: [
        F.text('symbol', 'Symbol', 'BITSTAMP:BTCUSD'),
        F.sel('range', 'Range', '1M', [['1D', '1 day'], ['1M', '1 month'], ['3M', '3 months'], ['12M', '1 year'], ['60M', '5 years'], ['ALL', 'All']]),
        { ...LINKED(), def: false },
      ],
      link: (s, sym) => ({ symbol: tvSymbolFor(sym) }),
      label: (s) => s.symbol.split(':').pop(),
      mount(body, s) {
        return tvEmbed(body, 'mini-symbol-overview', {
          symbol: s.symbol, dateRange: s.range, autosize: true,
          trendLineColor: 'rgba(0,212,212,1)', underLineColor: 'rgba(0,212,212,0.12)',
          underLineBottomColor: 'rgba(0,212,212,0)', chartOnly: false, noTimeScale: false,
        });
      },
    },
    tvTape: {
      title: 'Ticker Tape', icon: 'move-horizontal', cat: 'Charts',
      w: 24, h: 2, minW: 8, minH: 2,
      settings: [
        F.area('symbols', 'Symbols (comma-separated)',
          'BITSTAMP:BTCUSD, BITSTAMP:ETHUSD, CRYPTO:SOLUSD, CRYPTO:XRPUSD, CRYPTO:BNBUSD, CRYPTO:DOGEUSD, CRYPTO:ADAUSD, COINBASE:HYPEUSD'),
        F.tog('logos', 'Show symbol logos', true),
      ],
      mount(body, s) {
        const symbols = s.symbols.split(',').map((x) => x.trim()).filter(Boolean)
          .map((proName) => ({ proName, title: proName.split(':').pop() }));
        return tvEmbed(body, 'ticker-tape', { symbols, showSymbolLogo: s.logos, displayMode: 'adaptive' }, true);
      },
    },

    /* — TradingView: markets — */
    tvCryptoHeat: {
      title: 'Crypto Heatmap', icon: 'grid-3x3', cat: 'Markets',
      w: 12, h: 10, minW: 6, minH: 6,
      settings: [
        F.sel('block', 'Block size', 'market_cap_calc', [['market_cap_calc', 'Market cap'], ['24h_vol_cmc', '24h volume']]),
        F.sel('color', 'Color by', '24h_close_change|5', [['24h_close_change|5', '24h change'], ['Perf.W', '1-week change'], ['Perf.1M', '1-month change']]),
      ],
      mount(body, s) {
        return tvEmbed(body, 'crypto-coins-heatmap', {
          dataSource: 'Crypto', blockSize: s.block, blockColor: s.color,
          hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true,
          hasSymbolTooltip: true, isMonoSize: false,
        });
      },
    },
    tvStockHeat: {
      title: 'Stock Heatmap', icon: 'layout-grid', cat: 'Markets',
      w: 12, h: 10, minW: 6, minH: 6,
      settings: [
        F.sel('source', 'Universe', 'SPX500', [['SPX500', 'S&P 500'], ['NASDAQ100', 'Nasdaq 100'], ['DJDJI', 'Dow Jones'], ['AllUSA', 'All US']]),
        F.sel('color', 'Color by', 'change', [['change', 'Daily change'], ['Perf.W', '1-week change'], ['Perf.1M', '1-month change']]),
      ],
      mount(body, s) {
        return tvEmbed(body, 'stock-heatmap', {
          dataSource: s.source, exchanges: [], grouping: 'sector',
          blockSize: 'market_cap_basic', blockColor: s.color,
          hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true,
          hasSymbolTooltip: true, isMonoSize: false,
        });
      },
    },
    tvEtfHeat: {
      title: 'ETF Heatmap', icon: 'boxes', cat: 'Markets',
      w: 12, h: 10, minW: 6, minH: 6,
      settings: [
        F.sel('color', 'Color by', 'change', [['change', 'Daily change'], ['Perf.W', '1-week change'], ['Perf.1M', '1-month change']]),
      ],
      mount(body, s) {
        return tvEmbed(body, 'etf-heatmap', {
          dataSource: 'AllUSEtf', grouping: 'asset_class', blockSize: 'aum',
          blockColor: s.color, hasTopBar: false, isDataSetEnabled: false,
          isZoomEnabled: true, hasSymbolTooltip: true, isMonoSize: false,
        });
      },
    },
    tvForexHeat: {
      title: 'Forex Heatmap', icon: 'arrow-left-right', cat: 'Markets',
      w: 10, h: 8, minW: 6, minH: 5,
      settings: [],
      mount(body) {
        return tvEmbed(body, 'forex-heat-map', {
          currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'CNY'],
        });
      },
    },
    tvOverview: {
      title: 'Market Overview', icon: 'globe', cat: 'Markets',
      w: 7, h: 12, minW: 5, minH: 8,
      settings: [
        F.sel('lead', 'First tab', 'crypto', [['crypto', 'Crypto'], ['indices', 'Indices'], ['forex', 'Forex'], ['futures', 'Futures']]),
        F.tog('chart', 'Show chart', true),
      ],
      label: (s) => ({ crypto: 'Crypto', indices: 'Indices', forex: 'Forex', futures: 'Futures' })[s.lead],
      mount(body, s) {
        const TABS = {
          crypto: { title: 'Crypto', symbols: [
            { s: 'BITSTAMP:BTCUSD', d: 'Bitcoin' }, { s: 'BITSTAMP:ETHUSD', d: 'Ethereum' },
            { s: 'CRYPTO:SOLUSD', d: 'Solana' }, { s: 'CRYPTO:XRPUSD', d: 'XRP' },
            { s: 'CRYPTO:ZECUSD', d: 'Zcash' }, { s: 'COINBASE:HYPEUSD', d: 'Hyperliquid' } ] },
          indices: { title: 'Indices', symbols: [
            { s: 'SP:SPX', d: 'S&P 500' }, { s: 'NASDAQ:NDX', d: 'Nasdaq 100' },
            { s: 'DJ:DJI', d: 'Dow 30' }, { s: 'TVC:VIX', d: 'VIX' }, { s: 'TVC:DXY', d: 'Dollar index' } ] },
          forex: { title: 'Forex', symbols: [
            { s: 'FX:EURUSD', d: 'EUR/USD' }, { s: 'FX:GBPUSD', d: 'GBP/USD' },
            { s: 'FX:USDJPY', d: 'USD/JPY' }, { s: 'FX:AUDUSD', d: 'AUD/USD' } ] },
          futures: { title: 'Futures', symbols: [
            { s: 'TVC:GOLD', d: 'Gold' }, { s: 'TVC:SILVER', d: 'Silver' },
            { s: 'TVC:USOIL', d: 'WTI crude' }, { s: 'TVC:UKOIL', d: 'Brent' } ] },
        };
        const order = [s.lead, ...Object.keys(TABS).filter((k) => k !== s.lead)];
        return tvEmbed(body, 'market-overview', {
          showChart: s.chart, showSymbolLogo: true, showFloatingTooltip: true,
          plotLineColorGrowing: 'rgba(0,212,212,1)', plotLineColorFalling: 'rgba(255,46,136,1)',
          gridLineColor: 'rgba(39,34,53,0)', scaleFontColor: 'rgba(168,163,187,1)',
          belowLineFillColorGrowing: 'rgba(0,212,212,0.10)', belowLineFillColorFalling: 'rgba(255,46,136,0.10)',
          belowLineFillColorGrowingBottom: 'rgba(0,0,0,0)', belowLineFillColorFallingBottom: 'rgba(0,0,0,0)',
          symbolActiveColor: 'rgba(0,212,212,0.12)',
          tabs: order.map((k) => TABS[k]),
        });
      },
    },

    /* — TradingView: screeners — */
    tvCryptoScreener: {
      title: 'Crypto Screener', icon: 'list-filter', cat: 'Screeners',
      w: 12, h: 10, minW: 8, minH: 6,
      settings: [],
      mount(body) {
        return tvEmbed(body, 'screener', {
          defaultColumn: 'overview', screener_type: 'crypto_mkt',
          displayCurrency: 'USD', market: 'crypto', showToolbar: true,
          isTransparent: false,
        });
      },
    },
    tvStockScreener: {
      title: 'Stock Screener', icon: 'filter', cat: 'Screeners',
      w: 12, h: 10, minW: 8, minH: 6,
      settings: [
        F.sel('screen', 'Default screen', 'most_capitalized',
          [['most_capitalized', 'Largest caps'], ['volume_leaders', 'Volume leaders'], ['top_gainers', 'Top gainers'], ['top_losers', 'Top losers'], ['ath', 'All-time highs'], ['atl', 'All-time lows']]),
      ],
      mount(body, s) {
        return tvEmbed(body, 'screener', {
          defaultColumn: 'overview', defaultScreen: s.screen,
          market: 'america', showToolbar: true, isTransparent: false,
        });
      },
    },

    /* — TradingView: news & data — */
    tvNews: {
      title: 'Top Stories', icon: 'newspaper', cat: 'News & data',
      w: 6, h: 10, minW: 4, minH: 6,
      settings: [
        F.sel('market', 'Market', 'crypto', [['crypto', 'Crypto'], ['stock', 'TradFi (stocks)'], ['index', 'Indices'], ['forex', 'Forex']]),
        F.text('symbol', 'Symbol (optional — overrides market)', '', 'A TradingView symbol, e.g. CRYPTO:SOLUSD or NASDAQ:AAPL'),
      ],
      label: (s) => (s.symbol ? s.symbol.split(':').pop() : ({ crypto: 'Crypto', stock: 'TradFi', index: 'Indices', forex: 'Forex' })[s.market]),
      mount(body, s) {
        return tvEmbed(body, 'timeline', s.symbol
          ? { feedMode: 'symbol', symbol: s.symbol, displayMode: 'regular' }
          : { feedMode: 'market', market: s.market, displayMode: 'regular' });
      },
    },
    tvCal: {
      title: 'Economic Calendar', icon: 'calendar-clock', cat: 'News & data',
      w: 6, h: 10, minW: 4, minH: 6,
      settings: [
        F.sel('importance', 'Importance', '0,1', [['-1,0,1', 'All events'], ['0,1', 'Medium + high'], ['1', 'High only']]),
        F.text('countries', 'Countries', 'us,eu,gb,jp,cn', 'Comma country codes, e.g. us,eu,gb'),
      ],
      mount(body, s) {
        return tvEmbed(body, 'events', { importanceFilter: s.importance, countryFilter: s.countries });
      },
    },
    tvSymInfo: {
      title: 'Symbol Info', icon: 'info', cat: 'News & data',
      w: 6, h: 6, minW: 4, minH: 4,
      settings: [
        F.text('symbol', 'Symbol', 'NASDAQ:AAPL'),
        F.sel('mode', 'View', 'info', [['info', 'Quote & profile'], ['fundamentals', 'Fundamentals']]),
        { ...LINKED(), def: false },
      ],
      link: (s, sym) => ({ symbol: tvSymbolFor(sym) }),
      label: (s) => s.symbol.split(':').pop(),
      mount(body, s) {
        return s.mode === 'fundamentals'
          ? tvEmbed(body, 'financials', { symbol: s.symbol, displayMode: 'regular' })
          : tvEmbed(body, 'symbol-info', { symbol: s.symbol });
      },
    },

    /* — Vice-native — */
    vWatch: {
      title: 'Vice Watchlist', icon: 'star', cat: 'Vice', vice: true,
      w: 5, h: 8, minW: 4, minH: 4,
      settings: [
        F.area('symbols', 'Symbols (comma-separated)', 'BTC, ETH, SOL, HYPE, ZEC, XRP',
          'Hyperliquid perp tickers. With sync on, this list is shared by every Vice Watchlist block.'),
        F.tog('shared', 'Sync with the suite watchlist', true),
      ],
      mount(body, s, inst) {
        const scroll = el('div', 'vw-scroll');
        body.appendChild(scroll);
        const readShared = () => { try { return JSON.parse(localStorage.getItem(LS_WATCH)); } catch { return null; } };
        let syms = s.shared
          ? (readShared() ?? s.symbols.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean))
          : s.symbols.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
        if (s.shared) localStorage.setItem(LS_WATCH, JSON.stringify(syms));
        const lastPx = {};
        scroll.innerHTML = syms.map((sym) =>
          `<div class="vrow clickable" data-sym="${esc(sym)}" title="Link charts to ${esc(sym)}"><span class="vic-slot">${iconFor(sym)}</span><span class="sym">${esc(sym)}</span><span class="px">—</span><span class="chg">—</span></div>`).join('')
          || '<div class="hw-note">watchlist is empty — add symbols in settings</div>';
        rowLinker(scroll);
        const unsub = hlFeed.sub((map) => {
          for (const row of scroll.querySelectorAll('.vrow')) {
            const slot = row.querySelector('.vic-slot');
            if (slot && !slot.dataset.ok && coinIcons[row.dataset.sym]) {
              slot.innerHTML = iconFor(row.dataset.sym);
              slot.dataset.ok = '1';
            }
            const q = map[row.dataset.sym];
            if (!q) { row.querySelector('.px').textContent = 'n/a'; continue; }
            const pxEl = row.querySelector('.px');
            const chgEl = row.querySelector('.chg');
            pxEl.textContent = `$${fmtPx(q.px)}`;
            chgEl.textContent = `${q.chg >= 0 ? '\u2197' : '\u2198'} ${fmtChg(q.chg)}`;
            chgEl.className = `chg ${q.chg >= 0 ? 'up' : 'down'}`;
            if (lastPx[row.dataset.sym] != null && lastPx[row.dataset.sym] !== q.px) {
              row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
            }
            lastPx[row.dataset.sym] = q.px;
          }
        });
        return { destroy() { unsub(); } };
      },
      // shared-list edits flow back to localStorage when settings are saved
      onSettingsSaved(s) {
        if (s.shared) {
          const syms = s.symbols.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
          localStorage.setItem(LS_WATCH, JSON.stringify(syms));
        }
      },
    },
    vMovers: {
      title: 'Top Movers', icon: 'trending-up', cat: 'Vice', vice: true,
      w: 5, h: 8, minW: 4, minH: 5,
      settings: [
        F.num('count', 'Rows per tab', 15, 5, 50),
        F.sel('universe', 'Universe', '250', [['100', 'Top 100 by mcap'], ['250', 'Top 250 by mcap']]),
      ],
      mount(body, s) {
        const col = el('div', 'vcol');
        const tabs = el('div', 'vtabs',
          '<button class="vtab on" data-tab="g">Gainers</button><button class="vtab" data-tab="l">Losers</button>');
        const scroll = el('div', 'vw-scroll');
        col.append(tabs, scroll);
        body.appendChild(col);
        let rows = [];
        let tab = 'g';
        let timer = null;
        const paint = () => {
          const uni = rows.slice(0, Number(s.universe)).filter((c) => c.c24 != null);
          const list = [...uni].sort((a, b) => (tab === 'g' ? b.c24 - a.c24 : a.c24 - b.c24)).slice(0, s.count);
          scroll.innerHTML = list.map((c) =>
            `<div class="vrow clickable" data-sym="${esc(c.s)}" title="Link charts to ${esc(c.s)}"><span class="vic-slot">${iconFor(c.s)}</span><span class="sym">${esc(c.s)}</span><span class="name">${esc(c.n)}</span>` +
            `<span class="px">$${fmtPx(c.p)}</span><span class="chg ${c.c24 >= 0 ? 'up' : 'down'}">${c.c24 >= 0 ? '\u2197' : '\u2198'} ${fmtChg(c.c24)}</span></div>`).join('')
            || '<div class="hw-note">no data yet</div>';
        };
        rowLinker(scroll);
        const load = async () => {
          try {
            rows = await fetchMarkets();
            paint();
          } catch (e) {
            scroll.innerHTML = '';
            note(scroll, 'wifi-off', `movers feed unreachable — ${esc(e.message)}`);
          }
        };
        tabs.addEventListener('click', (ev) => {
          const b = ev.target.closest('.vtab');
          if (!b) return;
          tab = b.dataset.tab;
          tabs.querySelectorAll('.vtab').forEach((x) => x.classList.toggle('on', x === b));
          b.classList.toggle('down', tab === 'l');
          paint();
        });
        load();
        timer = setInterval(load, 120_000);
        return { destroy() { clearInterval(timer); }, refresh: load };
      },
    },
    vNews: {
      title: 'Crypto News (aggregated)', icon: 'rss', cat: 'Vice', vice: true,
      w: 6, h: 10, minW: 4, minH: 5,
      settings: [F.num('max', 'Max headlines', 25, 5, 40)],
      mount(body, s) {
        const scroll = el('div', 'vw-scroll vnews');
        body.appendChild(scroll);
        let timer = null;
        const load = async () => {
          try {
            const items = await getJson('/api/vice-news', 9000);
            scroll.innerHTML = items.slice(0, s.max).map((it) =>
              `<a href="${esc(it.u)}" target="_blank" rel="noopener noreferrer">${esc(it.t)}` +
              `<span class="meta">${esc(it.src)} · ${ago(it.ts)}</span></a>`).join('');
          } catch {
            scroll.innerHTML = '';
            note(scroll, 'rss', 'aggregated news needs the deployed /api/vice-news proxy (RSS feeds block browser CORS) — it lights up on vicesuite.com');
          }
        };
        load();
        timer = setInterval(load, 300_000);
        return { destroy() { clearInterval(timer); }, refresh: load };
      },
    },
    vNotes: {
      title: 'Notes', icon: 'sticky-note', cat: 'Vice', vice: true,
      w: 5, h: 6, minW: 3, minH: 3,
      settings: [],
      mount(body, s, inst) {
        const ta = el('textarea', 'vnotes');
        ta.placeholder = 'scratchpad — saved locally, survives reloads';
        ta.value = inst.settings.text ?? '';
        let t = null;
        ta.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(() => { inst.settings.text = ta.value; persist(); }, 400);
        });
        body.appendChild(ta);
        return { destroy() { clearTimeout(t); } };
      },
    },
    vClocks: {
      title: 'Session Clocks', icon: 'clock', cat: 'Vice', vice: true,
      w: 10, h: 4, minW: 5, minH: 3,
      settings: [],
      mount(body) {
        const CITIES = [
          { city: 'New York', tz: 'America/New_York', open: 9.5, close: 16, label: 'NYSE' },
          { city: 'London', tz: 'Europe/London', open: 8, close: 16.5, label: 'LSE' },
          { city: 'Tokyo', tz: 'Asia/Tokyo', open: 9, close: 15, label: 'TSE' },
          { city: 'Sydney', tz: 'Australia/Sydney', open: 10, close: 16, label: 'ASX' },
        ];
        const box = el('div', 'vclocks');
        body.appendChild(box);
        const paint = () => {
          box.innerHTML = CITIES.map((c) => {
            const parts = new Intl.DateTimeFormat('en-US', {
              timeZone: c.tz, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
            }).formatToParts(new Date()).reduce((a, p) => ({ ...a, [p.type]: p.value }), {});
            const wd = parts.weekday;
            const hours = (+parts.hour % 24) + (+parts.minute) / 60;
            const open = wd !== 'Sat' && wd !== 'Sun' && hours >= c.open && hours < c.close;
            return `<div class="vclock${open ? ' open' : ''}"><div class="city">${c.city}</div>` +
              `<div class="time">${parts.hour}:${parts.minute}:${parts.second}</div>` +
              `<div class="mkt ${open ? 'open' : 'closed'}">${c.label} ${open ? 'open' : 'closed'}</div></div>`;
          }).join('');
        };
        paint();
        const timer = setInterval(paint, 1000);
        return { destroy() { clearInterval(timer); } };
      },
    },
    vAlerts: {
      title: 'Price Alerts', icon: 'bell', cat: 'Vice', vice: true,
      w: 5, h: 6, minW: 4, minH: 4,
      settings: [
        F.tog('sound', 'Play a sound when an alert fires', true),
        F.num('keep', 'Fired history to keep', 8, 0, 20),
      ],
      mount(body, s, inst) {
        inst.settings.alerts ??= [];
        inst.settings.history ??= [];
        const col = el('div', 'vcol');
        const add = el('div', 'valerts-add',
          '<input class="sym" placeholder="BTC" maxlength="10" aria-label="symbol" />' +
          '<input class="tgt" placeholder="70000 · 70k · +5%" inputmode="decimal" aria-label="target" />' +
          '<button class="hub-btn" type="button" title="Add alert"><i data-lucide="plus"></i></button>');
        const scroll = el('div', 'vw-scroll');
        col.append(add, scroll);
        body.appendChild(col);
        let prices = {};
        const vcCmd = (a) => `vc alert ${a.sym.toLowerCase()} ${a.target}`;
        const paint = () => {
          const active = inst.settings.alerts.map((a, i) =>
            `<div class="valert-row">` +
            `<span class="vic-slot">${iconFor(a.sym)}</span><span class="sym">${esc(a.sym)}</span>` +
            `<span class="cond">${a.dir === 'above' ? '≥' : '≤'} $${fmtPx(a.target)}</span>` +
            `<span class="now">${prices[a.sym]?.px != null ? `$${fmtPx(prices[a.sym].px)}` : ''}</span>` +
            `<button class="hw-btn del" data-copy="${i}" title="Copy the Discord bot command"><i data-lucide="copy"></i></button>` +
            `<button class="hw-btn del" data-i="${i}" title="Remove"><i data-lucide="x"></i></button></div>`).join('');
          const hist = inst.settings.history.length && s.keep > 0
            ? '<div class="vhist-h"><span>fired</span><button type="button" data-clear>clear</button></div>' +
              inst.settings.history.map((h) =>
                `<div class="valert-row fired"><span class="sym">${esc(h.sym)}</span>` +
                `<span class="cond">crossed $${fmtPx(h.target)}</span>` +
                `<span class="now">${ago(h.at)}</span></div>`).join('')
            : '';
          scroll.innerHTML = (active || '<div class="hw-note">no alerts — add one above.<br/>notification + sound when crossed; targets take 70k or +5% too.</div>') + hist;
          icons();
        };
        const parseTarget = (raw, now) => {
          const t = raw.trim().toLowerCase();
          const pct = /^([+-]?)(\d+(?:\.\d+)?)%$/.exec(t);
          if (pct) {
            if (now == null) throw new Error('no live price yet for % targets — try again in a second');
            return now * (1 + ((pct[1] === '-' ? -1 : 1) * Number(pct[2])) / 100);
          }
          const suf = /^(\d+(?:\.\d+)?)([km])$/.exec(t);
          if (suf) return Number(suf[1]) * { k: 1e3, m: 1e6 }[suf[2]];
          const n = Number(t.replace(/[$,\s]/g, ''));
          if (Number.isFinite(n) && n > 0) return n;
          throw new Error('target can be 70000, 70k, or +5%');
        };
        add.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') add.querySelector('button').click();
        });
        add.querySelector('button').addEventListener('click', () => {
          const sym = add.querySelector('.sym').value.trim().toUpperCase();
          if (!sym) return;
          let target;
          try { target = parseTarget(add.querySelector('.tgt').value, prices[sym]?.px); }
          catch (e) { toast(e.message); return; }
          const now = prices[sym]?.px;
          const dir = now != null && target < now ? 'below' : 'above';
          inst.settings.alerts.push({ sym, target: Number(target.toPrecision(8)), dir });
          persist();
          add.querySelector('.tgt').value = '';
          if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
          paint();
        });
        scroll.addEventListener('click', (ev) => {
          if (ev.target.closest('[data-clear]')) {
            inst.settings.history = [];
            persist(); paint(); return;
          }
          const cp = ev.target.closest('[data-copy]');
          if (cp) {
            const a = inst.settings.alerts[Number(cp.dataset.copy)];
            if (a) navigator.clipboard?.writeText(vcCmd(a)).then(() => toast(`copied "${vcCmd(a)}" — paste it in Discord`));
            return;
          }
          const b = ev.target.closest('[data-i]');
          if (!b) return;
          inst.settings.alerts.splice(Number(b.dataset.i), 1);
          persist();
          paint();
        });
        const unsub = hlFeed.sub((map) => {
          prices = map;
          let dirty = false;
          inst.settings.alerts = inst.settings.alerts.filter((a) => {
            const px = map[a.sym]?.px;
            if (px == null) return true;
            const crossed = a.dir === 'above' ? px >= a.target : px <= a.target;
            if (!crossed) return true;
            dirty = true;
            inst.settings.history.unshift({ sym: a.sym, target: a.target, at: Date.now() });
            inst.settings.history = inst.settings.history.slice(0, s.keep);
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`${a.sym} crossed $${fmtPx(a.target)}`, { body: `now $${fmtPx(px)} — Vice Hub` });
            }
            if (s.sound) beep();
            return false;
          });
          if (dirty) persist();
          paint();
        });
        paint();
        return { destroy() { unsub(); } };
      },
    },
    vChart: {
      title: 'Vice Chart', icon: 'bar-chart-3', cat: 'Charts', vice: true,
      w: 8, h: 9, minW: 4, minH: 5,
      settings: [
        F.text('command', 'Command', 'btc 1h ema20 ema55',
          'Full vc syntax: any symbol (btc, gt:pepe, a pasted contract address), timeframe, 21 indicators, %, ratios (btc/eth), compare (btc,eth,sol), best/worst'),
        LINKED(),
      ],
      link: (s, sym) => ({ command: s.command.replace(/^\s*\S+/, sym.toLowerCase()) }),
      label: (s) => s.command,
      mount(body, s) {
        const box = el('div', 'vchart');
        const err = el('div', 'vchart-err');
        body.append(box, err);
        let chart = null;
        let timer = null;
        let ro = null;
        let dead = false;
        let tries = 0;
        const run = async () => {
          try {
            const option = await window.ViceChartEngine.buildOption(s.command, box.clientHeight || 320);
            option.backgroundColor = 'transparent';
            // the brand watermark collides with titles at block widths — the hub
            // IS the brand; keep only text graphics (the NOT REAL joke stamp)
            if (Array.isArray(option.graphic)) option.graphic = option.graphic.filter((g) => g.type === 'text');
            if (!dead && chart) {
              chart.setOption(option, { notMerge: true });
              err.classList.remove('on');
            }
          } catch (e) {
            if (!dead) { err.textContent = e.message; err.classList.add('on'); }
          }
        };
        const start = () => {
          if (dead) return;
          if (!window.echarts || !window.ViceChartEngine) {
            if (++tries > 75) { note(body, 'alert-triangle', "the chart engine didn't load — refresh the page"); return; }
            setTimeout(start, 200);
            return;
          }
          chart = window.echarts.init(box, null, { renderer: 'canvas' });
          run();
          timer = setInterval(run, 60_000); // live-ish: refetch each minute
          ro = new ResizeObserver(() => { chart?.resize(); run(); });
          ro.observe(box);
        };
        start();
        return { destroy() { dead = true; clearInterval(timer); ro?.disconnect(); chart?.dispose(); } };
      },
    },
    vFunding: {
      title: 'Funding', icon: 'percent', cat: 'Vice', vice: true,
      w: 10, h: 7, minW: 5, minH: 4,
      settings: [
        F.sel('mode', 'Rows', 'watchlist', [['watchlist', 'My watchlist'], ['top', 'Top by open interest']]),
        F.num('count', 'Max rows', 10, 4, 20),
        F.tog('linked', 'Follow linked symbol', false,
          'Single-symbol mode only — the futures board turns this on'),
      ],
      // only single-symbol boards (focus/futures) re-point; table modes no-op
      link: (s, sym) => (s.only ? { only: sym } : {}),
      label: (s) => s.only ?? (s.mode === 'top' ? 'top OI' : 'watchlist'),
      mount(body, s) {
        const scroll = el('div', 'vw-scroll');
        body.appendChild(scroll);
        const readShared = () => { try { return JSON.parse(localStorage.getItem(LS_WATCH)) ?? []; } catch { return []; } };
        // 8h funding across venues: HL (live feed, hourly ×8), OKX (per-symbol,
        // CORS everywhere), Binance + Bybit (bulk — geo-blocked for US visitors,
        // their columns show — there), Deribit (bulk book summaries)
        const rates = { okx: {}, bin: {}, byb: {}, der: {} };
        let venueTimer = null;
        const rowSyms = (map) => s.only ? [s.only]
          : s.mode === 'watchlist' ? readShared().filter((sym) => map[sym])
          : Object.entries(map).sort((a, b) => (b[1].oi * b[1].px) - (a[1].oi * a[1].px)).slice(0, s.count).map(([k]) => k);
        const loadVenues = async () => {
          const map = hlFeed.snap() ?? {};
          const syms = rowSyms(map).slice(0, 15);
          getJson('https://fapi.binance.com/fapi/v1/premiumIndex', 6000).then((j) => {
            if (!Array.isArray(j)) return;
            const m = {};
            for (const r of j) if (r.symbol?.endsWith('USDT')) m[r.symbol.slice(0, -4)] = Number(r.lastFundingRate);
            rates.bin = m;
          }).catch(() => { /* geo-blocked — column stays — */ });
          getJson('https://api.bybit.com/v5/market/tickers?category=linear', 6000).then((j) => {
            const l = j?.result?.list;
            if (!Array.isArray(l)) return;
            const m = {};
            for (const r of l) if (r.symbol?.endsWith('USDT')) m[r.symbol.slice(0, -4)] = Number(r.fundingRate);
            rates.byb = m;
          }).catch(() => { /* geo-blocked — column stays — */ });
          // Deribit funds continuously — funding_8h is the comparable figure.
          // BTC/ETH ride inverse perps; alts live under the USDC book.
          Promise.all(['BTC', 'ETH', 'USDC'].map((c) =>
            getJson(`https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${c}&kind=future`, 8000).catch(() => null)))
            .then((books) => {
              const m = {};
              for (const b of books) {
                for (const r of b?.result ?? []) {
                  const match = /^([A-Z0-9]+?)(?:_USDC)?-PERPETUAL$/.exec(r.instrument_name ?? '');
                  if (match && Number.isFinite(r.funding_8h)) m[match[1]] = Number(r.funding_8h);
                }
              }
              rates.der = m;
            });
          await Promise.all(syms.map((sym) =>
            getJson(`https://www.okx.com/api/v5/public/funding-rate?instId=${sym}-USDT-SWAP`, 6000)
              .then((j) => { const r = j?.data?.[0]?.fundingRate; if (r != null) rates.okx[sym] = Number(r); })
              .catch(() => { /* not listed on OKX */ })));
        };
        const cell = (v, cls) => (v == null || !Number.isFinite(v))
          ? `<span class="chg fr ${cls}">—</span>`
          : `<span class="chg fr ${cls} ${v >= 0 ? 'up' : 'down'}">${(v * 100).toFixed(4)}%</span>`;
        const unsub = hlFeed.sub((map) => {
          const syms = rowSyms(map);
          if (s.only && !map[s.only]) {
            scroll.innerHTML = `<div class="hw-note">no Hyperliquid perp for ${esc(s.only)}</div>`;
            return;
          }
          scroll.innerHTML =
            '<div class="vrow vrow-h"><span class="vic-slot"></span><span class="sym">coin</span><span class="name"></span>' +
            '<span class="chg fr cbin">binance</span><span class="chg fr cokx">okx</span>' +
            '<span class="chg fr cbyb">bybit</span><span class="chg fr">hyperliquid</span>' +
            '<span class="chg fr cder">deribit</span></div>' +
            syms.slice(0, s.only ? 1 : s.count).map((sym) => {
              const q = map[sym];
              return `<div class="vrow clickable" data-sym="${esc(sym)}" title="Link charts to ${esc(sym)}">` +
                `<span class="vic-slot">${iconFor(sym)}</span><span class="sym">${esc(sym)}</span><span class="name"></span>` +
                cell(rates.bin[sym], 'cbin') + cell(rates.okx[sym], 'cokx') + cell(rates.byb[sym], 'cbyb') +
                cell(Number.isFinite(q?.funding) ? q.funding * 8 : null, '') +
                cell(rates.der[sym], 'cder') + '</div>';
            }).join('');
        });
        rowLinker(scroll);
        setTimeout(loadVenues, 1200); // let the HL snapshot land first
        venueTimer = setInterval(loadVenues, 60_000);
        return { destroy() { unsub(); clearInterval(venueTimer); } };
      },
    },
    vCountdown: {
      title: 'Candle Close', icon: 'timer', cat: 'Vice', vice: true,
      w: 4, h: 7, minW: 3, minH: 4,
      settings: [],
      mount(body) {
        const box = el('div', 'vcd');
        body.appendChild(box);
        // weekly candles roll Monday 00:00 UTC — epoch is a Thursday, offset 4d
        const FRAMES = [
          { label: '1H', ms: 3_600_000, off: 0 },
          { label: '4H', ms: 14_400_000, off: 0 },
          { label: '1D', ms: 86_400_000, off: 0 },
          { label: '1W', ms: 604_800_000, off: 345_600_000 },
        ];
        const pad = (n) => String(n).padStart(2, '0');
        const paint = () => {
          const now = Date.now();
          const d = new Date(now);
          const utc = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
          const lp = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'short',
          }).formatToParts(d).reduce((a, p) => ({ ...a, [p.type]: p.value }), {});
          const clock = `<div class="vcd-clock"><div class="utc">${utc}<span>UTC</span></div>` +
            `<div class="local">${pad(lp.hour % 24)}:${lp.minute}:${lp.second} ${esc(lp.timeZoneName ?? '')} · your time</div></div>`;
          box.innerHTML = clock + FRAMES.map(({ label, ms, off }) => {
            const into = (now - off) % ms;
            const left = ms - into;
            const h = Math.floor(left / 3_600_000);
            const m = Math.floor((left % 3_600_000) / 60_000);
            const sec = Math.floor((left % 60_000) / 1000);
            const t = h >= 24 ? `${Math.floor(h / 24)}d ${pad(h % 24)}:${pad(m)}:${pad(sec)}`
              : `${pad(h)}:${pad(m)}:${pad(sec)}`;
            return `<div class="vcd-row"><span class="tf">${label}</span><span class="left">${t}</span>` +
              `<span class="bar"><span style="width:${((into / ms) * 100).toFixed(2)}%"></span></span></div>`;
          }).join('');
        };
        paint();
        const timer = setInterval(paint, 1000);
        return { destroy() { clearInterval(timer); } };
      },
    },
    vLiqMap: {
      title: 'Liquidity Map', icon: 'align-start-horizontal', cat: 'Vice', vice: true,
      w: 6, h: 10, minW: 4, minH: 6,
      settings: [
        F.text('symbol', 'Symbol', 'BTC', 'Coin ticker — book from Binance where available, else Coinbase, else Hyperliquid'),
        F.sel('range', 'Range around price', '2', [['1', '±1%'], ['2', '±2%'], ['5', '±5%']]),
        LINKED(),
      ],
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => s.symbol.toUpperCase(),
      mount(body, s) {
        const box = el('div', 'vliq');
        body.appendChild(box);
        const SYM = s.symbol.trim().toUpperCase();
        let chart = null;
        let timer = null;
        let ro = null;
        let dead = false;
        let tries = 0;
        let venue = null; // sticky: first source that answers keeps the job
        const num2 = (rows) => rows.map((r) => [Number(r[0]), Number(r[1])]);
        const fetchBook = async () => {
          if (venue == null || venue === 'Binance') {
            try {
              const j = await getJson(`https://api.binance.com/api/v3/depth?symbol=${SYM}USDT&limit=500`, 6000);
              if (j?.bids?.length) { venue = 'Binance'; return { venue, bids: num2(j.bids), asks: num2(j.asks) }; }
            } catch { /* geo-blocked or unlisted — fall through */ }
          }
          if (venue == null || venue === 'Coinbase') {
            try {
              const j = await getJson(`https://api.exchange.coinbase.com/products/${SYM}-USD/book?level=2`, 8000);
              if (j?.bids?.length) { venue = 'Coinbase'; return { venue, bids: num2(j.bids), asks: num2(j.asks) }; }
            } catch { /* not listed — fall through */ }
          }
          const res = await fetch('https://api.hyperliquid.xyz/info', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'l2Book', coin: SYM }),
            signal: AbortSignal.timeout(8000),
          });
          const j = await res.json();
          if (!j?.levels?.[0]?.length) throw new Error(`no order book found for ${SYM}`);
          venue = 'Hyperliquid';
          return { venue, bids: j.levels[0].map((l) => [Number(l.px), Number(l.sz)]), asks: j.levels[1].map((l) => [Number(l.px), Number(l.sz)]) };
        };
        const paint = ({ venue: v, bids, asks }) => {
          const mid = (bids[0][0] + asks[0][0]) / 2;
          const span = mid * (Number(s.range) / 100);
          const lo = mid - span;
          const hi = mid + span;
          const NBINS = 36; // even → clean bid/ask split at mid
          const step = (hi - lo) / NBINS;
          const bins = new Array(NBINS).fill(0);
          const side = new Array(NBINS).fill(0); // 1 bid, -1 ask
          for (const [px, sz] of bids) {
            if (px < lo) break;
            const i = Math.min(NBINS - 1, Math.floor((px - lo) / step));
            bins[i] += px * sz; side[i] = 1;
          }
          for (const [px, sz] of asks) {
            if (px > hi) break;
            const i = Math.min(NBINS - 1, Math.floor((px - lo) / step));
            bins[i] += px * sz; side[i] = -1;
          }
          const max = Math.max(...bins, 1);
          const idx = [...Array(NBINS).keys()].reverse(); // high price on top
          chart?.setOption({
            backgroundColor: 'transparent', animation: false,
            grid: { left: 6, right: 64, top: 24, bottom: 6 },
            xAxis: { type: 'value', max, axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false } },
            yAxis: {
              type: 'category', position: 'right',
              data: idx.map((i) => fmtPx(lo + (i + 0.5) * step)),
              axisLabel: { color: '#8b85a3', fontSize: 9.5, fontFamily: 'Geist Mono, monospace', interval: 3 },
              axisLine: { show: false }, axisTick: { show: false },
            },
            tooltip: {
              backgroundColor: '#0d0b18', borderColor: '#363049', borderWidth: 1, padding: [7, 10],
              textStyle: { color: '#f6f5fb', fontFamily: 'Geist Mono, monospace', fontSize: 12 },
              formatter: (p) => `$${p.name}<br/><span style="color:${side[idx[p.dataIndex]] >= 0 ? '#21d196' : '#ff6473'}">` +
                `$${fmtCompact(bins[idx[p.dataIndex]])} resting</span>`,
            },
            graphic: [{
              type: 'text', left: 8, top: 6, silent: true,
              style: { text: `mid $${fmtPx(mid)} · ${v}`, fill: '#8b85a3', fontSize: 10, fontFamily: 'Geist Mono, monospace' },
            }],
            series: [{
              type: 'bar', barWidth: '68%', barCategoryGap: '20%',
              data: idx.map((i) => {
                const bid = side[i] >= 0;
                const rel = bins[i] / max;
                const a = 0.35 + rel * 0.55; // walls glow
                return { value: bins[i], itemStyle: {
                  color: bid ? `rgba(22,199,132,${a.toFixed(2)})` : `rgba(234,57,67,${a.toFixed(2)})`,
                  borderRadius: [0, 2, 2, 0],
                } };
              }),
            }],
          }, { notMerge: true });
        };
        const load = async () => {
          try {
            const book = await fetchBook();
            if (!dead) paint(book);
          } catch (e) {
            if (!dead && !chart?.getOption()?.series?.length) { note(body, 'wifi-off', esc(e.message)); }
          }
        };
        const start = () => {
          if (dead) return;
          if (!window.echarts) {
            if (++tries > 75) { note(body, 'alert-triangle', "the chart engine didn't load — refresh the page"); return; }
            setTimeout(start, 200);
            return;
          }
          chart = window.echarts.init(box, null, { renderer: 'canvas' });
          load();
          timer = setInterval(load, 10_000);
          ro = new ResizeObserver(() => chart?.resize());
          ro.observe(box);
        };
        start();
        return { destroy() { dead = true; clearInterval(timer); ro?.disconnect(); chart?.dispose(); } };
      },
    },
    vHeat: {
      title: 'Vice Heatmap', icon: 'blocks', cat: 'Vice', vice: true,
      w: 12, h: 10, minW: 6, minH: 5,
      settings: [
        F.sel('count', 'Coins', '100', [['50', 'Top 50'], ['100', 'Top 100'], ['150', 'Top 150']]),
        F.sel('metric', 'Change window', '24h', [['24h', '24 hours'], ['7d', '1 week']]),
        F.tog('clean', 'Hide stablecoins & wrapped assets', true),
      ],
      label: (s) => `top ${s.count} · ${s.metric}`,
      mount(body, s) {
        const box = el('div', 'vheat');
        body.appendChild(box);
        const NOISE = new Set(['USDT', 'USDC', 'DAI', 'USDE', 'USDS', 'FDUSD', 'PYUSD', 'TUSD', 'USD1', 'USDF',
          'WBTC', 'WETH', 'STETH', 'WSTETH', 'WEETH', 'WBETH', 'CBBTC', 'RETH', 'LSETH', 'SUSDE', 'BSC-USD', 'USDTB']);
        // solid, saturated tiles (TV-style): dim tone at 0%, full color by ±6%
        const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
        const tile = (chg) => {
          const t = 0.22 + 0.78 * Math.min(Math.abs(chg) / 6, 1);
          const [r, g, b2] = chg >= 0 ? mix([27, 43, 38], [13, 148, 106], t) : mix([48, 27, 32], [201, 55, 68], t);
          return `rgb(${r},${g},${b2})`;
        };
        let chart = null;
        let timer = null;
        let ro = null;
        let dead = false;
        let tries = 0;
        const paint = (rows) => {
          const list = rows.filter((c) => c.mc && (!s.clean || !NOISE.has(c.s))).slice(0, Number(s.count))
            .map((c) => (s.metric === '7d' ? { ...c, c24: c.c7d ?? c.c24 } : c));
          chart?.setOption({
            backgroundColor: 'transparent',
            tooltip: {
              backgroundColor: '#0d0b18', borderColor: '#363049', borderWidth: 1, padding: [8, 11],
              textStyle: { color: '#f6f5fb', fontFamily: 'Geist Mono, monospace', fontSize: 12 },
              formatter: (p) => `<b>${esc(p.data.coin)}</b> · ${esc(p.name)}<br/>$${fmtPx(p.data.px)}  ` +
                `<span style="color:${p.data.chg >= 0 ? '#21d196' : '#ff6473'}">${fmtChg(p.data.chg)}</span><br/>` +
                `<span style="color:#8b85a3">mcap $${fmtCompact(p.value)}</span>`,
            },
            series: [{
              type: 'treemap', left: 0, top: 0, right: 0, bottom: 0,
              roam: false, nodeClick: false, breadcrumb: { show: false },
              label: {
                color: 'rgba(255,255,255,0.94)', fontFamily: 'Geist Mono, monospace',
                fontSize: 11.5, fontWeight: 600, lineHeight: 15, overflow: 'truncate',
                formatter: (p) => `${p.name}\n${fmtChg(p.data.chg)}`,
              },
              itemStyle: { gapWidth: 2, borderWidth: 0, borderColor: '#0d0b18' },
              emphasis: { label: { color: '#fff' } },
              data: list.map((c) => ({
                name: c.s, value: c.mc, chg: c.c24 ?? 0, px: c.p, coin: c.n,
                itemStyle: { color: tile(c.c24 ?? 0) },
              })),
            }],
          }, { notMerge: true });
        };
        const load = async () => {
          try {
            const rows = await fetchMarkets();
            if (!dead) paint(rows);
          } catch (e) {
            if (!dead && !chart?.getOption()?.series?.length) { note(body, 'wifi-off', `heatmap feed unreachable — ${esc(e.message)}`); }
          }
        };
        const start = () => {
          if (dead) return;
          if (!window.echarts) {
            if (++tries > 75) { note(body, 'alert-triangle', "the chart engine didn't load — refresh the page"); return; }
            setTimeout(start, 200);
            return;
          }
          chart = window.echarts.init(box, null, { renderer: 'canvas' });
          chart.on('click', (p) => { if (p?.name) linkSymbol(p.name); });
          load();
          timer = setInterval(load, 120_000);
          ro = new ResizeObserver(() => chart?.resize());
          ro.observe(box);
        };
        start();
        return { destroy() { dead = true; clearInterval(timer); ro?.disconnect(); chart?.dispose(); } };
      },
    },
    vVol24h: venueSnapWidget('vol'),
    vOiSnap: venueSnapWidget('oi'),
    vFundingHist: {
      title: 'Funding Rate (APR)', icon: 'line-chart', cat: 'Futures', vice: true,
      w: 8, h: 8, minW: 5, minH: 5,
      settings: [
        F.text('symbol', 'Symbol', 'BTC', 'Coin ticker'),
        F.sel('days', 'Window', '7', [['3', '3 days'], ['7', '1 week'], ['14', '2 weeks']]),
        LINKED(),
      ],
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => `${s.symbol.trim().toUpperCase()} · APR`,
      mount(body, s) {
        const SYM = s.symbol.trim().toUpperCase();
        const days = Number(s.days);
        return chartMount(body, async (chart) => {
          const start = Date.now() - days * 86_400_000;
          const series = [];
          const push = (name, pts) => { if (pts?.length > 1) series.push([name, pts.sort((a, b) => a[0] - b[0])]); };
          // aggregator first: all five venues, already annualized, any geography
          const agg = await getJson(`/api/vice-coinalyze?kind=funding&sym=${SYM}&days=${days}`, 9000).catch(() => null);
          if (agg?.venues?.length) for (const v of agg.venues) push(v.venue, v.points);
          if (!series.length) await Promise.allSettled([
            hlInfo({ type: 'fundingHistory', coin: SYM, startTime: start })
              .then((rows) => push('HL', rows.map((r) => [Number(r.time), Number(r.fundingRate) * 24 * 365 * 100]))),
            getJson(`https://www.okx.com/api/v5/public/funding-rate-history?instId=${SYM}-USDT-SWAP&limit=100`, 6000)
              .then((j) => push('OKX', (j?.data ?? []).map((r) => [Number(r.fundingTime), Number(r.fundingRate) * 3 * 365 * 100]).filter((p) => p[0] >= start))),
            getJson(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${SYM}USDT&limit=100`, 6000)
              .then((j) => push('BIN', (Array.isArray(j) ? j : []).map((r) => [Number(r.fundingTime), Number(r.fundingRate) * 3 * 365 * 100]).filter((p) => p[0] >= start))),
            getJson(`https://api.bybit.com/v5/market/funding/history?category=linear&symbol=${SYM}USDT&limit=100`, 6000)
              .then((j) => push('BYB', (j?.result?.list ?? []).map((r) => [Number(r.fundingRateTimestamp), Number(r.fundingRate) * 3 * 365 * 100]).filter((p) => p[0] >= start))),
            // Deribit: hourly points carrying the trailing 8h rate
            getJson(`https://www.deribit.com/api/v2/public/get_funding_rate_history?instrument_name=${SYM}-PERPETUAL&start_timestamp=${start}&end_timestamp=${Date.now()}`, 9000)
              .then((j) => push('DER', (j?.result ?? []).map((r) => [Number(r.timestamp), Number(r.interest_8h) * 3 * 365 * 100]))),
          ]);
          if (!series.length) throw new Error(`no funding history for ${SYM}`);
          series.sort(byVenueOrder((r) => r[0]));
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: {
              ...TIP_BOX, trigger: 'axis',
              valueFormatter: (v) => (v == null ? '—' : `${Number(v).toFixed(1)}% APR`),
            },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: '{value}%' }, splitLine: AXIS_SPLIT },
            series: series.map(([name, pts]) => ({
              name, type: 'line', data: pts, showSymbol: false, smooth: 0.2,
              lineStyle: { width: 1.4, color: VENUE_C[name] }, itemStyle: { color: VENUE_C[name] },
            })),
          }, { notMerge: true });
        }, 300_000);
      },
    },
    vRetHour: seasonalityWidget(true),
    vRetDay: seasonalityWidget(false),
    vRetBuckets: {
      title: 'Return Buckets', icon: 'bar-chart', cat: 'Futures', vice: true,
      w: 8, h: 7, minW: 4, minH: 5,
      settings: [
        F.sel('window', 'Returns over', '24h', [['24h', '24 hours'], ['1w', '1 week']]),
        F.sel('universe', 'Universe', '100', [['50', 'Top 50'], ['100', 'Top 100'], ['250', 'Top 250']]),
      ],
      label: (s) => `${s.window} · top ${s.universe}`,
      mount(body, s) {
        const chg = (c) => (s.window === '1w' ? c.c7d : c.c24);
        return chartMount(body, async (chart) => {
          const rows = (await fetchMarkets()).slice(0, Number(s.universe))
            .map((c) => ({ ...c, c24: chg(c) })).filter((c) => Number.isFinite(c.c24));
          if (!rows.length) throw new Error('markets feed unreachable');
          const edges = [-15, -10, -5, 0, 5, 10, 15];
          const labels = ['<-15%', '-15..-10', '-10..-5', '-5..0', '0..+5', '+5..+10', '+10..+15', '>+15%'];
          const counts = Array(8).fill(0);
          for (const c of rows) {
            let b = edges.findIndex((e) => c.c24 < e);
            if (b === -1) b = 7;
            counts[b] += 1;
          }
          const reds = ['#e5484d', '#d8494f', '#c2545e', '#a4606f'];
          const greens = ['#3a8f77', '#2ba57f', '#1fbd8b', '#21d196'];
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 14, bottom: 4, containLabel: true },
            tooltip: { ...TIP_BOX, formatter: (p) => `<b>${esc(p.name)}</b> · ${p.value} coins` },
            xAxis: { type: 'category', data: labels, axisLabel: { ...AXIS_LBL, fontSize: 9, interval: 0 }, axisLine: AXIS_LINE, axisTick: { show: false } },
            yAxis: { type: 'value', axisLabel: AXIS_LBL, splitLine: AXIS_SPLIT },
            series: [{
              type: 'bar', barMaxWidth: 40,
              data: counts.map((v, i) => ({ value: v, itemStyle: { color: i < 4 ? reds[i] : greens[i - 4], borderRadius: [3, 3, 0, 0] } })),
              label: { show: true, position: 'top', ...AXIS_LBL, fontSize: 10 },
            }],
          }, { notMerge: true });
        }, 120_000);
      },
    },
    vOIHist: {
      title: 'Open Interest', icon: 'area-chart', cat: 'Futures', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [
        F.text('symbol', 'Symbol', 'BTC', 'Coin ticker'),
        F.sel('window', 'Window', '4d', [['4d', '4 days (hourly)'], ['1m', '1 month (daily)']]),
        LINKED(),
      ],
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => `${s.symbol.trim().toUpperCase()} · $`,
      mount(body, s) {
        const SYM = s.symbol.trim().toUpperCase();
        const hourly = s.window === '4d';
        return chartMount(body, async (chart) => {
          const series = [];
          const push = (name, pts) => { if (pts?.length > 1) series.push([name, pts.sort((a, b) => a[0] - b[0])]); };
          // preferred: aggregator history — all four venues for every visitor
          // (Binance/Bybit geo-block US browsers AND our proxy's AWS egress)
          const agg = await getJson(`/api/vice-coinalyze?kind=oi&sym=${SYM}&days=${hourly ? 4 : 30}`, 9000).catch(() => null);
          if (agg?.venues?.length) {
            for (const v of agg.venues) push(v.venue, v.points.map((p) => [p[0], p[1]]));
          }
          if (!series.length) await Promise.allSettled([
            // rubik has no CORS — the vice-okx proxy answers in prod, direct is
            // the (local-only, usually blocked) fallback
            viaProxy(`/api/vice-okx?kind=oi&instId=${SYM}-USDT-SWAP&period=${hourly ? '1H' : '1D'}&limit=${hourly ? 100 : 30}`,
              () => getJson(`https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-history?instId=${SYM}-USDT-SWAP&period=${hourly ? '1H' : '1D'}&limit=${hourly ? 100 : 30}`, 8000))
              .then((j) => push('OKX', (j?.data ?? []).map((r) => [Number(r[0]), Number(r[3])]))),
            getJson(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${SYM}USDT&period=${hourly ? '1h' : '1d'}&limit=${hourly ? 96 : 30}`, 8000)
              .then((j) => push('BIN', (Array.isArray(j) ? j : []).map((r) => [Number(r.timestamp), Number(r.sumOpenInterestValue)]))),
            getJson(`https://api.bybit.com/v5/market/open-interest?category=linear&symbol=${SYM}USDT&intervalTime=${hourly ? '1h' : '1d'}&limit=${hourly ? 96 : 30}`, 8000)
              .then(async (j) => {
                const list = j?.result?.list ?? [];
                const px = hlFeed.snap()?.[SYM]?.px;
                if (px) push('BYB', list.map((r) => [Number(r.timestamp), Number(r.openInterest) * px]));
              }),
          ]);
          if (!series.length) throw new Error(`no OI history for ${SYM}`);
          series.sort(byVenueOrder((r) => r[0]));
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => `$${fmtCompact(v)}` },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: (v) => `$${fmtCompact(v)}` }, splitLine: AXIS_SPLIT },
            series: series.map(([name, pts]) => ({
              name, type: 'line', data: pts, showSymbol: false, stack: 'oi',
              lineStyle: { width: 1, color: VENUE_C[name] }, itemStyle: { color: VENUE_C[name] },
              areaStyle: { color: VENUE_C[name], opacity: 0.55 },
            })),
          }, { notMerge: true });
        }, 120_000);
      },
    },
    vVolHist: {
      title: 'Volume', icon: 'bar-chart-2', cat: 'Futures', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [
        F.text('symbol', 'Symbol', 'BTC', 'Coin ticker'),
        F.sel('days', 'Window', '14', [['7', '1 week'], ['14', '2 weeks'], ['30', '1 month']]),
        LINKED(),
      ],
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => `${s.symbol.trim().toUpperCase()} · daily $`,
      mount(body, s) {
        const SYM = s.symbol.trim().toUpperCase();
        const days = Number(s.days);
        return chartMount(body, async (chart) => {
          const perVenue = {};
          const put = (name, ts, v) => {
            if (!Number.isFinite(v) || v <= 0) return;
            (perVenue[name] ??= new Map()).set(ts, v);
          };
          // aggregator first: daily $ volume for all five venues
          const agg = await getJson(`/api/vice-coinalyze?kind=vol&sym=${SYM}&days=${days}`, 9000).catch(() => null);
          if (agg?.venues?.length) for (const v of agg.venues) for (const [t, val] of v.points) put(v.venue, t, val);
          if (!Object.keys(perVenue).length) await Promise.allSettled([
            getJson(`https://www.okx.com/api/v5/market/candles?instId=${SYM}-USDT-SWAP&bar=1Dutc&limit=${days}`, 8000)
              .then((j) => { for (const r of j?.data ?? []) put('OKX', Number(r[0]), Number(r[7])); }),
            getJson(`https://fapi.binance.com/fapi/v1/klines?symbol=${SYM}USDT&interval=1d&limit=${days}`, 8000)
              .then((j) => { for (const r of (Array.isArray(j) ? j : [])) put('BIN', Number(r[0]), Number(r[7])); }),
            getJson(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${SYM}USDT&interval=D&limit=${days}`, 8000)
              .then((j) => { for (const r of j?.result?.list ?? []) put('BYB', Number(r[0]), Number(r[6])); }),
          ]);
          const names = VENUE_ORDER.filter((n) => perVenue[n]?.size > 1);
          if (!names.length) throw new Error(`no volume history for ${SYM}`);
          const stamps = [...new Set(names.flatMap((n) => [...perVenue[n].keys()]))].sort((a, b) => a - b).slice(-days);
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `$${fmtCompact(v)}`) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'category', data: stamps.map((t) => new Date(t).toISOString().slice(5, 10)), axisLabel: AXIS_LBL, axisLine: AXIS_LINE, axisTick: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: (v) => `$${fmtCompact(v)}` }, splitLine: AXIS_SPLIT },
            series: names.map((name) => ({
              name, type: 'bar', stack: 'vol', barMaxWidth: 26,
              data: stamps.map((t) => perVenue[name].get(t) ?? null),
              itemStyle: { color: VENUE_C[name] },
            })),
          }, { notMerge: true });
        }, 300_000);
      },
    },
    vCVD: {
      title: 'CVD Dollars', icon: 'git-commit', cat: 'Futures', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [
        F.text('symbol', 'Symbol', 'BTC', 'Coin ticker'),
        LINKED(),
      ],
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => `${s.symbol.trim().toUpperCase()} · $ delta`,
      mount(body, s) {
        const SYM = s.symbol.trim().toUpperCase();
        return chartMount(body, async (chart) => {
          const series = [];
          const cum = (pts) => { let acc = 0; return pts.sort((a, b) => a[0] - b[0]).map(([t, d]) => [t, (acc += d)]); };
          // aggregator first: buy/sell taker flow for all five venues
          const agg = await getJson(`/api/vice-coinalyze?kind=cvd&sym=${SYM}&days=4`, 9000).catch(() => null);
          if (agg?.venues?.length) for (const v of agg.venues) series.push([v.venue, cum(v.points)]);
          if (!series.length) await Promise.allSettled([
            // OKX rubik taker volume: [ts, sellVol, buyVol] in USD (no CORS —
            // proxy in prod, direct fallback for completeness)
            viaProxy(`/api/vice-okx?kind=taker&ccy=${SYM}&period=1H&limit=100`,
              () => getJson(`https://www.okx.com/api/v5/rubik/stat/taker-volume?ccy=${SYM}&instType=CONTRACTS&period=1H&limit=100`, 8000))
              .then((j) => {
                const pts = (j?.data ?? []).map((r) => [Number(r[0]), Number(r[2]) - Number(r[1])]);
                if (pts.length > 1) series.push(['OKX', cum(pts)]);
              }),
            // Binance taker vol is in base units — dollars via current mark (close enough at week scale)
            getJson(`https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${SYM}USDT&period=1h&limit=100`, 8000)
              .then(async (j) => {
                const px = hlFeed.snap()?.[SYM]?.px;
                if (!px || !Array.isArray(j)) return;
                const pts = j.map((r) => [Number(r.timestamp), (Number(r.buyVol) - Number(r.sellVol)) * px]);
                if (pts.length > 1) series.push(['BIN', cum(pts)]);
              }),
          ]);
          if (!series.length) throw new Error(`no taker-flow data for ${SYM}`);
          series.sort(byVenueOrder((r) => r[0]));
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `${v < 0 ? '-' : ''}$${fmtCompact(Math.abs(v))}`) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: (v) => `${v < 0 ? '-' : ''}$${fmtCompact(Math.abs(v))}` }, splitLine: AXIS_SPLIT },
            series: series.map(([name, pts]) => ({
              name, type: 'line', data: pts, showSymbol: false,
              lineStyle: { width: 1.4, color: VENUE_C[name] }, itemStyle: { color: VENUE_C[name] },
            })),
          }, { notMerge: true });
        }, 120_000);
      },
    },
    vBasis: {
      title: '3 Month Annualized Basis', icon: 'git-branch', cat: 'Futures', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [
        F.text('symbol', 'Symbol', 'BTC', 'Coin ticker (needs listed dated futures)'),
        LINKED(),
      ],
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => `${s.symbol.trim().toUpperCase()} · front quarter`,
      mount(body, s) {
        const SYM = s.symbol.trim().toUpperCase();
        return chartMount(body, async (chart) => {
          const series = [];
          const annualize = (fut, spot, expMs, t) => {
            const yrs = (expMs - t) / 31_536_000_000;
            return yrs > 0.005 ? ((fut / spot - 1) / yrs) * 100 : null;
          };
          // front quarter = the listed dated future expiring 60-120d out (falls
          // back to the furthest listed when nothing sits in that window)
          const pickFront = (list) =>
            list.find((i) => i.exp - Date.now() > 55 * 86_400_000) ?? list[list.length - 1];
          const expTag = (ms) => new Date(ms).toISOString().slice(2, 10).replace(/-/g, '');
          await Promise.allSettled([
            (async () => {
              // Binance publishes its own basisRate series for dated futures;
              // quarterlies expire the last Friday of Mar/Jun/Sep/Dec 08:00 UTC
              // (geo-blocked for US visitors, like the rest of fapi)
              const rows = await getJson(`https://fapi.binance.com/futures/data/basis?pair=${SYM}USDT&contractType=CURRENT_QUARTER&period=1h&limit=168`, 8000);
              if (!Array.isArray(rows) || rows.length < 2) return;
              const qEnd = (d) => {
                const m = Math.floor(d.getUTCMonth() / 3) * 3 + 2; // Mar/Jun/Sep/Dec
                const last = new Date(Date.UTC(d.getUTCFullYear(), m + 1, 0, 8));
                last.setUTCDate(last.getUTCDate() - ((last.getUTCDay() + 2) % 7)); // back to Friday
                return last.getTime();
              };
              let exp = qEnd(new Date());
              if (exp < Date.now()) exp = qEnd(new Date(Date.now() + 45 * 86_400_000));
              const pts = rows.map((r) => {
                const t = Number(r.timestamp);
                const yrs = (exp - t) / 31_536_000_000;
                return yrs > 0.005 ? [t, (Number(r.basisRate) / yrs) * 100] : null;
              }).filter(Boolean).sort((a, b) => a[0] - b[0]);
              if (pts.length > 1) series.push([`BIN ${expTag(exp)}`, pts, VENUE_C.BIN]);
            })(),
            (async () => {
              const inst = await getJson(`https://www.okx.com/api/v5/public/instruments?instType=FUTURES&uly=${SYM}-USD`, 8000);
              const list = (inst?.data ?? []).map((i) => ({ id: i.instId, exp: Number(i.expTime) }))
                .filter((i) => i.exp > Date.now()).sort((a, b) => a.exp - b.exp);
              if (!list.length) return;
              const target = pickFront(list);
              const [futC, idxC] = await Promise.all([
                getJson(`https://www.okx.com/api/v5/market/candles?instId=${target.id}&bar=1H&limit=168`, 8000),
                getJson(`https://www.okx.com/api/v5/market/index-candles?instId=${SYM}-USD&bar=1H&limit=168`, 8000),
              ]);
              const idx = new Map((idxC?.data ?? []).map((r) => [Number(r[0]), Number(r[4])]));
              const pts = (futC?.data ?? []).map((r) => {
                const t = Number(r[0]);
                const spot = idx.get(t);
                const v = spot ? annualize(Number(r[4]), spot, target.exp, t) : null;
                return v == null ? null : [t, v];
              }).filter(Boolean).sort((a, b) => a[0] - b[0]);
              if (pts.length > 1) series.push([`OKX ${target.id.split('-').pop()}`, pts, VENUE_C.OKX]);
            })(),
            (async () => {
              // Deribit: dated future vs its own perp (tracks index tightly)
              const inst = await getJson(`https://www.deribit.com/api/v2/public/get_instruments?currency=${SYM}&kind=future`, 8000);
              const list = (inst?.result ?? []).filter((i) => i.settlement_period !== 'perpetual')
                .map((i) => ({ id: i.instrument_name, exp: Number(i.expiration_timestamp) }))
                .filter((i) => i.exp > Date.now()).sort((a, b) => a.exp - b.exp);
              if (!list.length) return;
              const target = pickFront(list);
              const end = Date.now();
              const startT = end - 7 * 86_400_000;
              // get_tradingview_chart_data is Deribit's one CORS-closed public
              // endpoint — the vice-deribit proxy answers in prod
              const tv = (name) => viaProxy(`/api/vice-deribit?instrument=${name}&days=7`,
                () => getJson(`https://www.deribit.com/api/v2/public/get_tradingview_chart_data?instrument_name=${name}&start_timestamp=${startT}&end_timestamp=${end}&resolution=60`, 9000));
              const [futC, perpC] = await Promise.all([tv(target.id), tv(`${SYM}-PERPETUAL`)]);
              const perp = new Map((perpC?.result?.ticks ?? []).map((t, i) => [t, perpC.result.close[i]]));
              const pts = (futC?.result?.ticks ?? []).map((t, i) => {
                const spot = perp.get(t);
                const v = spot ? annualize(futC.result.close[i], spot, target.exp, t) : null;
                return v == null ? null : [t, v];
              }).filter(Boolean).sort((a, b) => a[0] - b[0]);
              if (pts.length > 1) series.push([`DER ${target.id.split('-').pop()}`, pts, VENUE_C.DER]);
            })(),
          ]);
          if (!series.length) throw new Error(`no basis series for ${SYM}`);
          series.sort((a, b) => a[0].localeCompare(b[0]));
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `${Number(v).toFixed(2)}% ann.`) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: (v) => `${v.toFixed(1)}%` }, splitLine: AXIS_SPLIT },
            series: series.map(([name, pts, color]) => ({
              name, type: 'line', data: pts, showSymbol: false, smooth: 0.2,
              lineStyle: { width: 1.4, color }, itemStyle: { color },
            })),
          }, { notMerge: true });
        }, 300_000);
      },
    },
    vPrice: {
      title: 'Price', icon: 'mountain', cat: 'Futures', vice: true,
      w: 12, h: 9, minW: 4, minH: 5,
      settings: [
        F.text('symbol', 'Symbol', 'BTC', 'Coin ticker (Hyperliquid history)'),
        F.sel('days', 'Window', '7', [['3', '3 days'], ['7', '1 week'], ['30', '1 month']]),
        LINKED(),
      ],
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => `${s.symbol.trim().toUpperCase()} · ${s.days}d`,
      mount(body, s) {
        const SYM = s.symbol.trim().toUpperCase();
        const days = Number(s.days);
        return chartMount(body, async (chart) => {
          const rows = await hlInfo({ type: 'candleSnapshot', req: { coin: SYM, interval: days > 7 ? '4h' : '1h', startTime: Date.now() - days * 86_400_000, endTime: Date.now() } });
          if (!Array.isArray(rows) || rows.length < 2) throw new Error(`no Hyperliquid history for ${SYM}`);
          const pts = rows.map((r) => [Number(r.t), Number(r.c)]);
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 6, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => `$${fmtPx(v)}` },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', scale: true, axisLabel: { ...AXIS_LBL, formatter: (v) => `$${fmtCompact(v)}` }, splitLine: AXIS_SPLIT },
            series: [{
              type: 'line', data: pts, showSymbol: false,
              lineStyle: { width: 1.4, color: '#5aa7f7' }, itemStyle: { color: '#5aa7f7' },
              areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
                { offset: 0, color: 'rgba(90,167,247,0.45)' }, { offset: 1, color: 'rgba(90,167,247,0.04)' }] } },
            }],
          }, { notMerge: true });
        }, 60_000);
      },
    },
    vLiqs: {
      title: 'Liquidations', icon: 'zap', cat: 'Futures', vice: true,
      w: 12, h: 9, minW: 4, minH: 5,
      settings: [
        F.text('symbol', 'Symbol', 'BTC', 'Coin ticker'),
        LINKED(),
      ],
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => s.symbol.trim().toUpperCase(),
      mount(body, s) {
        const SYM = s.symbol.trim().toUpperCase();
        const liqAxes = (hours) => ({
          backgroundColor: 'transparent',
          grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
          tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null || v === 0 ? '—' : `${v < 0 ? '-' : ''}$${fmtCompact(Math.abs(v))}`) },
          legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
          xAxis: { type: 'category', data: hours.map((h) => new Date(h).toISOString().slice(5, 13).replace('T', ' ')), axisLabel: { ...AXIS_LBL, fontSize: 9 }, axisLine: AXIS_LINE, axisTick: { show: false } },
          yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: (v) => `${v < 0 ? '-' : ''}$${fmtCompact(Math.abs(v))}` }, splitLine: AXIS_SPLIT },
        });
        return chartMount(body, async (chart) => {
          // preferred: the aggregator proxy — BIN/BYB/OKX (+HL when listed)
          // liq history for EVERY visitor, shorts up / longs down per venue
          const agg = await getJson(`/api/vice-coinalyze?kind=liqs&sym=${SYM}&days=7`, 9000).catch(() => null);
          if (agg?.venues?.length) {
            const vs = agg.venues.slice().sort(byVenueOrder((v) => v.venue));
            const hours = [...new Set(vs.flatMap((v) => v.points.map((p) => p[0])))].sort((a, b) => a - b);
            const series = vs.flatMap((v) => {
              const m = new Map(v.points.map((p) => [p[0], p]));
              return [
                { name: v.venue, type: 'bar', stack: 's', barMaxWidth: 12, data: hours.map((h) => m.get(h)?.[2] ?? 0), itemStyle: { color: VENUE_C[v.venue] } },
                // longs plot downward in the same venue hue, no second legend entry
                { name: v.venue, type: 'bar', stack: 'l', barMaxWidth: 12, data: hours.map((h) => -(m.get(h)?.[1] ?? 0)), itemStyle: { color: VENUE_C[v.venue], opacity: 0.62 } },
              ];
            });
            chart.setOption({ ...liqAxes(hours), series }, { notMerge: true });
            return;
          }
          // fallback (no aggregator key yet / local preview): OKX's public
          // feed — the one venue with open liquidation data, recent window
          const [instJ, liqJ] = await Promise.all([
            getJson(`https://www.okx.com/api/v5/public/instruments?instType=SWAP&instId=${SYM}-USDT-SWAP`, 8000),
            viaProxy(`/api/vice-okx?kind=liq&uly=${SYM}-USDT`,
              () => getJson(`https://www.okx.com/api/v5/public/liquidation-orders?instType=SWAP&uly=${SYM}-USDT&state=filled&limit=100`, 8000)),
          ]);
          const ctVal = Number(instJ?.data?.[0]?.ctVal) || 1;
          const rows = (liqJ?.data ?? []).flatMap((d) => d.details ?? []);
          if (!rows.length) throw new Error(`no recent liquidations reported for ${SYM}`);
          const byHour = {}; // hour -> {long (neg $), short (pos $)}
          for (const r of rows) {
            const t = Number(r.ts);
            const usd = Number(r.sz) * ctVal * Number(r.bkPx);
            if (!Number.isFinite(usd) || usd <= 0) continue;
            const h = Math.floor(t / 3_600_000) * 3_600_000;
            const b = (byHour[h] ??= { long: 0, short: 0 });
            if (r.posSide === 'long') b.long -= usd; else b.short += usd;
          }
          const hours = Object.keys(byHour).map(Number).sort((a, b) => a - b);
          chart.setOption({
            ...liqAxes(hours),
            series: [
              { name: 'OKX shorts', type: 'bar', stack: 'l', barMaxWidth: 14, data: hours.map((h) => byHour[h].short), itemStyle: { color: '#21d196' } },
              { name: 'OKX longs', type: 'bar', stack: 'l', barMaxWidth: 14, data: hours.map((h) => byHour[h].long), itemStyle: { color: '#ff6473' } },
            ],
          }, { notMerge: true });
        }, 120_000);
      },
    },
    vSpotVol: {
      title: 'Spot-Vol Correlation', icon: 'waves', cat: 'Options', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [F.sel('cur', 'Currency', 'BTC', [['BTC', 'BTC'], ['ETH', 'ETH']])],
      label: (s) => `${s.cur} · trailing 2d`,
      mount(body, s) {
        return chartMount(body, async (chart) => {
          const end = Date.now();
          const start = end - 9 * 86_400_000; // 7d shown + 2d warm-up window
          const [dvolJ, pxRows] = await Promise.all([
            getJson(`https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=${s.cur}&start_timestamp=${start}&end_timestamp=${end}&resolution=3600`, 9000),
            // price leg from Hyperliquid — CORS-open hourly candles
            hlInfo({ type: 'candleSnapshot', req: { coin: s.cur, interval: '1h', startTime: start, endTime: end } }),
          ]);
          const dvol = new Map((dvolJ?.result?.data ?? []).map((r) => [r[0], r[4]]));
          const pairs = []; // [t, dPx%, dVol]
          let prev = null;
          for (const r of pxRows ?? []) {
            const t = Number(r.t);
            const v = dvol.get(t);
            if (v == null) continue;
            const px = Number(r.c);
            if (prev) pairs.push([t, (px / prev[0] - 1), v - prev[1]]);
            prev = [px, v];
          }
          const W = 48; // trailing 2 days of hourly pairs
          if (pairs.length < W + 4) throw new Error('not enough overlapping history yet');
          const pts = [];
          for (let i = W; i < pairs.length; i++) {
            const win = pairs.slice(i - W, i);
            const mx = win.reduce((a, p) => a + p[1], 0) / W;
            const my = win.reduce((a, p) => a + p[2], 0) / W;
            let sxy = 0;
            let sxx = 0;
            let syy = 0;
            for (const p of win) {
              sxy += (p[1] - mx) * (p[2] - my);
              sxx += (p[1] - mx) ** 2;
              syy += (p[2] - my) ** 2;
            }
            const denom = Math.sqrt(sxx * syy);
            if (denom > 0) pts.push([pairs[i][0], sxy / denom]);
          }
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => Number(v).toFixed(2) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', min: -1, max: 1, axisLabel: AXIS_LBL, splitLine: AXIS_SPLIT },
            series: [{
              name: 'price returns vs DVOL moves', type: 'line', data: pts, showSymbol: false,
              lineStyle: { width: 1.4, color: '#5aa7f7' }, itemStyle: { color: '#5aa7f7' },
              markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: 'rgba(139,133,163,0.4)', type: 'dashed' }, data: [{ yAxis: 0 }] },
            }],
          }, { notMerge: true });
        }, 300_000);
      },
    },
    vAtmIv: {
      title: 'ATM Implied Volatility', icon: 'gauge', cat: 'Options', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [F.sel('cur', 'Currency', 'BTC', [['BTC', 'BTC'], ['ETH', 'ETH']])],
      label: (s) => `${s.cur} · 1w 1m 3m 6m`,
      mount(body, s) {
        return chartMount(body, async (chart) => {
          const [{ px, tenors }, spot] = await Promise.all([deribitTenors(s.cur), spotHist(s.cur)]);
          const series = (await Promise.all(tenors.map(async (tn) => {
            const K = nearestStrike(tn.strikes, px);
            const pts = await ivSeries(`${s.cur}-${tn.exp}-${K}-C`, tn.expMs, K, false, spot);
            return pts.length > 1 ? [tn.label, pts] : null;
          }))).filter(Boolean);
          if (!series.length) throw new Error('no option price history yet');
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `${Number(v).toFixed(1)}% IV`) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', scale: true, axisLabel: { ...AXIS_LBL, formatter: '{value}%' }, splitLine: AXIS_SPLIT },
            series: series.map(([label, pts]) => ({
              name: label, type: 'line', data: pts, showSymbol: false,
              lineStyle: { width: 1.3, color: TENOR_C[label] }, itemStyle: { color: TENOR_C[label] },
            })),
          }, { notMerge: true });
        }, 600_000);
      },
    },
    vSkew: {
      title: '25 Delta Skew', icon: 'scale', cat: 'Options', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [F.sel('cur', 'Currency', 'BTC', [['BTC', 'BTC'], ['ETH', 'ETH']])],
      label: (s) => `${s.cur} · put IV − call IV`,
      mount(body, s) {
        return chartMount(body, async (chart) => {
          const [{ px, tenors }, spot] = await Promise.all([deribitTenors(s.cur), spotHist(s.cur)]);
          const series = (await Promise.all(tenors.map(async (tn) => {
            const T = (tn.expMs - Date.now()) / YR_MS;
            const atmK = nearestStrike(tn.strikes, px);
            const atmIv = (tn.iv[`${atmK}C`] ?? tn.iv[`${atmK}P`] ?? 55) / 100;
            const kc = nearestStrike(tn.strikes, strike25d(px, atmIv, T, false));
            const kp = nearestStrike(tn.strikes, strike25d(px, atmIv, T, true));
            const [cs, ps] = await Promise.all([
              ivSeries(`${s.cur}-${tn.exp}-${kc}-C`, tn.expMs, kc, false, spot),
              ivSeries(`${s.cur}-${tn.exp}-${kp}-P`, tn.expMs, kp, true, spot),
            ]);
            const calls = new Map(cs);
            const pts = ps.map(([t, piv]) => (calls.has(t) ? [t, piv - calls.get(t)] : null)).filter(Boolean);
            return pts.length > 1 ? [tn.label, pts] : null;
          }))).filter(Boolean);
          if (!series.length) throw new Error('no option price history yet');
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', scale: true, axisLabel: { ...AXIS_LBL, formatter: '{value}%' }, splitLine: AXIS_SPLIT },
            series: series.map(([label, pts]) => ({
              name: label, type: 'line', data: pts, showSymbol: false,
              lineStyle: { width: 1.3, color: TENOR_C[label] }, itemStyle: { color: TENOR_C[label] },
              markLine: label === '1w' ? { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: 'rgba(139,133,163,0.4)', type: 'dashed' }, data: [{ yAxis: 0 }] } : undefined,
            })),
          }, { notMerge: true });
        }, 600_000);
      },
    },
    vIvSlope: {
      title: 'IV Term Structure Slope', icon: 'move-diagonal', cat: 'Options', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [F.sel('cur', 'Currency', 'BTC', [['BTC', 'BTC'], ['ETH', 'ETH']])],
      label: (s) => `${s.cur} · 1m−6m`,
      mount(body, s) {
        return chartMount(body, async (chart) => {
          const [{ px, tenors }, spot] = await Promise.all([deribitTenors(s.cur), spotHist(s.cur)]);
          const near = tenors.find((t) => t.label === '1m');
          const far = tenors.find((t) => t.label === '6m');
          if (!near || !far) throw new Error('not enough live expiries');
          const [ns, fs] = await Promise.all([near, far].map((tn) => {
            const K = nearestStrike(tn.strikes, px);
            return ivSeries(`${s.cur}-${tn.exp}-${K}-C`, tn.expMs, K, false, spot);
          }));
          const farMap = new Map(fs);
          const pts = ns.map(([t, iv]) => (farMap.has(t) ? [t, iv - farMap.get(t)] : null)).filter(Boolean);
          if (pts.length < 2) throw new Error('no option price history yet');
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', scale: true, axisLabel: { ...AXIS_LBL, formatter: '{value}%' }, splitLine: AXIS_SPLIT },
            series: [{
              name: '1m−6m', type: 'line', data: pts, showSymbol: false,
              lineStyle: { width: 1.4, color: '#5aa7f7' }, itemStyle: { color: '#5aa7f7' },
              markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: 'rgba(139,133,163,0.4)', type: 'dashed' }, data: [{ yAxis: 0 }] },
            }],
          }, { notMerge: true });
        }, 600_000);
      },
    },
    vSessionRet: {
      title: 'Cumulative Return By Session', icon: 'sunrise', cat: 'Futures', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [
        F.text('symbol', 'Symbol', 'BTC', 'Coin ticker (Hyperliquid history)'),
        LINKED(),
      ],
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => `${s.symbol.trim().toUpperCase()} · US / EU / APAC`,
      mount(body, s) {
        const SYM = s.symbol.trim().toUpperCase();
        // UTC session bands (approx cash hours): APAC 22-07, EU 07-13, US 13-21
        const sessionOf = (h) => (h >= 13 && h < 21 ? 'US' : h >= 7 && h < 13 ? 'EU' : 'APAC');
        const S_COLOR = { US: '#5aa7f7', EU: '#b47aff', APAC: '#e7b53a' };
        return chartMount(body, async (chart) => {
          const rows = await hlInfo({ type: 'candleSnapshot', req: { coin: SYM, interval: '1h', startTime: Date.now() - 30 * 86_400_000, endTime: Date.now() } });
          if (!Array.isArray(rows) || rows.length < 48) throw new Error(`no Hyperliquid history for ${SYM}`);
          const acc = { US: 0, EU: 0, APAC: 0 };
          const lines = { US: [], EU: [], APAC: [] };
          for (const r of rows) {
            const o = Number(r.o);
            const c = Number(r.c);
            if (!(o > 0)) continue;
            const t = Number(r.t);
            const ses = sessionOf(new Date(t).getUTCHours());
            acc[ses] += ((c - o) / o) * 100;
            lines[ses].push([t, acc[ses]]);
          }
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: '{value}%' }, splitLine: AXIS_SPLIT },
            series: Object.entries(lines).map(([name, pts]) => ({
              name, type: 'line', data: pts, showSymbol: false, step: 'end',
              lineStyle: { width: 1.3, color: S_COLOR[name] }, itemStyle: { color: S_COLOR[name] },
            })),
          }, { notMerge: true });
        }, 900_000);
      },
    },

    /* — options (Deribit public API — CORS-open, no key) — */
    vDvol: {
      title: 'DVOL Index', icon: 'activity', cat: 'Options', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [
        F.sel('cur', 'Currency', 'BTC', [['BTC', 'BTC'], ['ETH', 'ETH']]),
        F.sel('days', 'Window', '7', [['3', '3 days'], ['7', '1 week'], ['30', '1 month']]),
      ],
      label: (s) => `${s.cur} · Deribit IV index`,
      mount(body, s) {
        const days = Number(s.days);
        return chartMount(body, async (chart) => {
          const end = Date.now();
          const res = days > 7 ? 43200 : 3600;
          const j = await getJson(`https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=${s.cur}&start_timestamp=${end - days * 86_400_000}&end_timestamp=${end}&resolution=${res}`, 9000);
          const rows = j?.result?.data ?? []; // [ts, open, high, low, close]
          if (rows.length < 2) throw new Error('DVOL feed returned nothing');
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 6, containLabel: true },
            tooltip: {
              ...TIP_BOX, trigger: 'axis',
              formatter: (ps) => {
                const p = ps.find((x) => x.seriesType === 'candlestick') ?? ps[0];
                const [o, c, l, h] = p.data.slice(1);
                return `<b>${new Date(p.axisValue).toUTCString().slice(5, 22)}</b><br/>O ${o.toFixed(2)} H ${h.toFixed(2)} L ${l.toFixed(2)} C ${c.toFixed(2)}`;
              },
            },
            xAxis: { type: 'category', data: rows.map((r) => r[0]), axisLabel: { ...AXIS_LBL, formatter: (t) => new Date(Number(t)).toISOString().slice(5, 10) }, axisLine: AXIS_LINE, axisTick: { show: false } },
            yAxis: { type: 'value', scale: true, axisLabel: AXIS_LBL, splitLine: AXIS_SPLIT },
            series: [{
              type: 'candlestick',
              data: rows.map((r) => [r[1], r[4], r[3], r[2]]),
              itemStyle: { color: '#21d196', color0: '#ff6473', borderColor: '#21d196', borderColor0: '#ff6473' },
            }],
          }, { notMerge: true });
        }, 300_000);
      },
    },
    vIvTerm: {
      title: 'IV Term Structure', icon: 'trending-up', cat: 'Options', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [F.sel('cur', 'Currency', 'BTC', [['BTC', 'BTC'], ['ETH', 'ETH']])],
      label: (s) => `${s.cur} · ATM by expiry`,
      mount(body, s) {
        return chartMount(body, async (chart) => {
          const rows = await deribitBook(s.cur);
          const px = rows.find((r) => r.px)?.px;
          if (!px) throw new Error('Deribit feed returned nothing');
          const byExp = {};
          for (const r of rows) (byExp[r.exp] ??= []).push(r);
          const pts = Object.entries(byExp).map(([exp, list]) => {
            const t = deribitExpMs(exp);
            if (!t || t < Date.now()) return null;
            // ATM = the strike closest to spot; average the C/P mark IVs there
            const strikes = [...new Set(list.map((r) => r.strike))].sort((a, b) => Math.abs(a - px) - Math.abs(b - px));
            const atm = list.filter((r) => r.strike === strikes[0] && Number.isFinite(r.iv) && r.iv > 0);
            if (!atm.length) return null;
            return [t, atm.reduce((a, r) => a + r.iv, 0) / atm.length];
          }).filter(Boolean).sort((a, b) => a[0] - b[0]);
          if (pts.length < 2) throw new Error('not enough live expiries');
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 6, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => `${Number(v).toFixed(1)}% IV` },
            xAxis: { type: 'time', axisLabel: { ...AXIS_LBL, formatter: (t) => new Date(t).toISOString().slice(2, 10) }, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', scale: true, axisLabel: { ...AXIS_LBL, formatter: '{value}%' }, splitLine: AXIS_SPLIT },
            series: [{
              type: 'line', data: pts, smooth: 0.3, symbolSize: 5,
              lineStyle: { width: 1.4, color: '#5aa7f7' }, itemStyle: { color: '#5aa7f7' },
            }],
          }, { notMerge: true });
        }, 300_000);
      },
    },
    vTopOpts: {
      title: 'Top Volume Options', icon: 'flame', cat: 'Options', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [F.sel('cur', 'Currency', 'BTC', [['BTC', 'BTC'], ['ETH', 'ETH']])],
      label: (s) => `${s.cur} · 24h`,
      mount(body, s) {
        return chartMount(body, async (chart) => {
          const rows = (await deribitBook(s.cur)).filter((r) => r.vol > 0)
            .sort((a, b) => b.vol - a.vol).slice(0, 7).reverse();
          if (!rows.length) throw new Error('no options traded today');
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 4, containLabel: true },
            tooltip: { ...TIP_BOX, formatter: (p) => `<b>${esc(p.name)}</b> · ${fmtCompact(p.value)} ${s.cur} traded` },
            xAxis: { type: 'category', data: rows.map((r) => r.name), axisLabel: { ...AXIS_LBL, fontSize: 8.5, rotate: 38 }, axisLine: AXIS_LINE, axisTick: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: (v) => fmtCompact(v) }, splitLine: AXIS_SPLIT },
            series: [{
              type: 'bar', barMaxWidth: 34,
              data: rows.map((r) => ({ value: r.vol, itemStyle: { color: r.cp === 'C' ? '#21d196' : '#ff6473', borderRadius: [3, 3, 0, 0] } })),
            }],
          }, { notMerge: true });
        }, 300_000);
      },
    },
    vOiStrike: {
      title: 'OI by Strike', icon: 'align-end-vertical', cat: 'Options', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [F.sel('cur', 'Currency', 'BTC', [['BTC', 'BTC'], ['ETH', 'ETH']])],
      label: (s) => `${s.cur} · calls vs puts`,
      mount(body, s) {
        return chartMount(body, async (chart) => {
          const rows = await deribitBook(s.cur);
          const px = rows.find((r) => r.px)?.px ?? 0;
          const agg = {};
          for (const r of rows) {
            if (r.strike < px * 0.4 || r.strike > px * 2.2) continue; // tails bury the middle
            (agg[r.strike] ??= { C: 0, P: 0 })[r.cp] += r.oi;
          }
          const strikes = Object.keys(agg).map(Number).sort((a, b) => a - b);
          if (!strikes.length) throw new Error('Deribit feed returned nothing');
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => `${fmtCompact(v)} ${s.cur}` },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'category', data: strikes.map((k) => fmtCompact(k)), axisLabel: { ...AXIS_LBL, fontSize: 9 }, axisLine: AXIS_LINE, axisTick: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: (v) => fmtCompact(v) }, splitLine: AXIS_SPLIT },
            series: [
              { name: 'Calls', type: 'bar', stack: 'oi', barMaxWidth: 16, data: strikes.map((k) => agg[k].C), itemStyle: { color: '#21d196' } },
              { name: 'Puts', type: 'bar', stack: 'oi', barMaxWidth: 16, data: strikes.map((k) => agg[k].P), itemStyle: { color: '#ff6473' } },
            ],
          }, { notMerge: true });
        }, 300_000);
      },
    },
    vOiExpiry: {
      title: 'OI by Expiry', icon: 'calendar-range', cat: 'Options', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [F.sel('cur', 'Currency', 'BTC', [['BTC', 'BTC'], ['ETH', 'ETH']])],
      label: (s) => `${s.cur} · calls vs puts`,
      mount(body, s) {
        return chartMount(body, async (chart) => {
          const rows = await deribitBook(s.cur);
          const agg = {};
          for (const r of rows) {
            const t = deribitExpMs(r.exp);
            if (!t || t < Date.now()) continue;
            (agg[t] ??= { exp: r.exp, C: 0, P: 0 })[r.cp] += r.oi;
          }
          const stamps = Object.keys(agg).map(Number).sort((a, b) => a - b);
          if (!stamps.length) throw new Error('Deribit feed returned nothing');
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => `${fmtCompact(v)} ${s.cur}` },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'category', data: stamps.map((t) => agg[t].exp), axisLabel: { ...AXIS_LBL, fontSize: 9, rotate: 32 }, axisLine: AXIS_LINE, axisTick: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: (v) => fmtCompact(v) }, splitLine: AXIS_SPLIT },
            series: [
              { name: 'Calls', type: 'bar', stack: 'oi', barMaxWidth: 22, data: stamps.map((t) => agg[t].C), itemStyle: { color: '#21d196' } },
              { name: 'Puts', type: 'bar', stack: 'oi', barMaxWidth: 22, data: stamps.map((t) => agg[t].P), itemStyle: { color: '#ff6473' } },
            ],
          }, { notMerge: true });
        }, 300_000);
      },
    },
    vChanges: {
      title: 'Change Leaders', icon: 'line-chart', cat: 'Futures', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [
        F.sel('mode', 'Series', 'price', [['price', 'Price % (top gainers)'], ['oi', 'Open interest % (top gainers)']]),
        F.sel('days', 'Window', '7', [['2', '2 days'], ['4', '4 days'], ['7', '1 week']]),
      ],
      label: (s) => (s.mode === 'price' ? 'price % · top gainers' : 'OI % · top gainers'),
      mount(body, s) {
        const days = Number(s.days);
        const PALETTE = ['#5aa7f7', '#b47aff', '#2dd4bf', '#f0b90b', '#ff6473', '#21d196', '#f97316', '#e879f9', '#38bdf8', '#e7b53a'];
        // top gainers over the window, restricted to coins we can chart
        const gainers = async (uni, n) => {
          try {
            const rows = await fetchMarkets();
            const list = rows.filter((r) => uni[r.s] && Number.isFinite(r.c7d ?? r.c24))
              .sort((a, b) => (b.c7d ?? b.c24) - (a.c7d ?? a.c24)).slice(0, n).map((r) => r.s);
            if (list.length) return list;
          } catch { /* fall through to the live feed */ }
          return Object.entries(uni).filter(([, q]) => q.vol > 3e6 && Number.isFinite(q.chg))
            .sort((a, b) => b[1].chg - a[1].chg).slice(0, n).map(([k]) => k);
        };
        return chartMount(body, async (chart) => {
          const start = Date.now() - days * 86_400_000;
          const uni = await hlSnap();
          let series = [];
          if (s.mode === 'price') {
            const movers = await gainers(uni, 10);
            const all = await Promise.allSettled(movers.map((sym) =>
              hlInfo({ type: 'candleSnapshot', req: { coin: sym, interval: '1h', startTime: start, endTime: Date.now() } })
                .then((rows) => {
                  const base = Number(rows?.[0]?.o);
                  if (!(base > 0)) return null;
                  return [sym, rows.map((r) => [Number(r.t), (Number(r.c) / base - 1) * 100])];
                })));
            series = all.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
          } else {
            // whole-venue OI per coin via the aggregator; OKX rubik fallback
            const movers = await gainers(uni, 8);
            const all = await Promise.allSettled(movers.map(async (sym) => {
              const agg = await getJson(`/api/vice-coinalyze?kind=oi&sym=${sym}&days=${Math.min(days, 7)}`, 9000).catch(() => null);
              let rows = [];
              if (agg?.venues?.length) {
                const total = new Map();
                for (const v of agg.venues) for (const [t, val] of v.points) total.set(t, (total.get(t) ?? 0) + val);
                rows = [...total.entries()].sort((a, b) => a[0] - b[0]);
              } else {
                const j = await viaProxy(`/api/vice-okx?kind=oi&instId=${sym}-USDT-SWAP&period=1H&limit=${Math.min(100, days * 24)}`,
                  () => getJson(`https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-history?instId=${sym}-USDT-SWAP&period=1H&limit=${Math.min(100, days * 24)}`, 8000));
                rows = (j?.data ?? []).map((r) => [Number(r[0]), Number(r[3])]).sort((a, b) => a[0] - b[0]);
              }
              const base = rows[0]?.[1];
              if (!(base > 0)) return null;
              return [sym, rows.map(([t, v]) => [t, (v / base - 1) * 100])];
            }));
            series = all.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
          }
          if (!series.length) throw new Error('no change series available');
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: '{value}%' }, splitLine: AXIS_SPLIT },
            series: series.map(([name, pts], i) => ({
              name, type: 'line', data: pts, showSymbol: false,
              lineStyle: { width: 1.2, color: PALETTE[i % PALETTE.length] }, itemStyle: { color: PALETTE[i % PALETTE.length] },
            })),
          }, { notMerge: true });
        }, 300_000);
      },
    },
    vScreener: {
      title: 'Cross-Asset Screener', icon: 'table-2', cat: 'Vice', vice: true,
      w: 24, h: 10, minW: 8, minH: 5,
      settings: [
        F.sel('tab', 'Universe', 'all', [['all', 'All'], ['crypto', 'Crypto'], ['tradfi', 'TradFi']]),
        F.num('count', 'Crypto rows', 30, 10, 100),
      ],
      label: (s) => (s.tab === 'all' ? 'crypto + TradFi' : s.tab),
      mount(body, s) {
        const scroll = el('div', 'vw-scroll vscr');
        body.appendChild(scroll);
        let tvRows = {}; // label -> {px, chg}
        let sortKey = 'vol';
        let sortDir = -1;
        const wantTv = s.tab !== 'crypto';
        const wantCr = s.tab !== 'tradfi';
        const tvList = TRADFI_BOOK.slice(0, 14);
        const loadTv = () => fetch('https://scanner.tradingview.com/global/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' }, // simple request — their preflight rejects JSON
          body: JSON.stringify({ symbols: { tickers: tvList.map((e) => e[1]) }, columns: ['close', 'change'] }),
          signal: AbortSignal.timeout(9000),
        }).then((r) => r.json()).then((j) => {
          const m = {};
          for (const d of j?.data ?? []) {
            const entry = tvList.find((e) => e[1] === d.s);
            if (entry) m[entry[0]] = { px: d.d[0], chg: d.d[1] };
          }
          tvRows = m;
          paint(hlFeed.snap() ?? {});
        }).catch(() => { /* scanner unreachable — crypto rows still paint */ });
        const paint = (map) => {
          const rows = [];
          if (wantCr) {
            for (const [sym, q] of Object.entries(map)) {
              rows.push({ kind: 'crypto', sym, name: coinNames[sym] ?? '', px: q.px, chg: q.chg, vol: q.vol, apr: q.funding * 24 * 365 * 100 });
            }
            rows.sort((a, b) => (b.vol ?? 0) - (a.vol ?? 0));
            rows.length = Math.min(rows.length, Number(s.count));
          }
          if (wantTv) {
            for (const [label, q] of Object.entries(tvRows)) {
              rows.push({ kind: 'tradfi', sym: label, name: tvList.find((e) => e[0] === label)?.[1] ?? '', px: q.px, chg: q.chg, vol: null, apr: null });
            }
          }
          const dir = sortDir;
          rows.sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            return av > bv ? dir : av < bv ? -dir : 0; // dir -1 = descending
          });
          const arrow = (k) => (sortKey === k ? (sortDir === -1 ? ' ↓' : ' ↑') : '');
          scroll.innerHTML =
            `<div class="vrow vrow-h vscr-r"><span class="vic-slot"></span><span class="sym">sym</span>` +
            `<span class="chg fr vscr-c" data-k="px">price${arrow('px')}</span>` +
            `<span class="chg fr vscr-c" data-k="chg">24h${arrow('chg')}</span>` +
            `<span class="chg fr vscr-c cvol" data-k="vol">24h vol${arrow('vol')}</span>` +
            `<span class="chg fr vscr-c capr" data-k="apr">funding apr${arrow('apr')}</span></div>` +
            rows.map((r) => {
              const icon = r.kind === 'crypto' ? iconFor(r.sym) : '<i data-lucide="landmark"></i>';
              return `<div class="vrow clickable vscr-r" data-sym="${esc(r.kind === 'crypto' ? r.sym : r.name)}" title="Link charts">` +
                `<span class="vic-slot">${icon}</span><span class="sym">${esc(r.sym)}</span>` +
                `<span class="chg fr">$${fmtPx(r.px)}</span>` +
                `<span class="chg fr ${r.chg >= 0 ? 'up' : 'down'}">${fmtChg(r.chg)}</span>` +
                `<span class="chg fr cvol">${r.vol == null ? '—' : `$${fmtCompact(r.vol)}`}</span>` +
                `<span class="chg fr capr ${r.apr >= 0 ? 'up' : 'down'}">${r.apr == null ? '—' : `${r.apr.toFixed(2)}%`}</span></div>`;
            }).join('');
          icons();
        };
        scroll.addEventListener('click', (ev) => {
          const th = ev.target.closest('.vscr-c');
          if (th) {
            const k = th.dataset.k;
            if (sortKey === k) sortDir = -sortDir;
            else { sortKey = k; sortDir = -1; }
            paint(hlFeed.snap() ?? {});
            return;
          }
          const r = ev.target.closest('.vrow.clickable');
          if (r?.dataset.sym) linkSymbol(r.dataset.sym.replace(/^.*:/, ''));
        });
        const unsub = wantCr ? hlFeed.sub(paint) : null;
        let tvTimer = null;
        if (wantTv) { loadTv(); tvTimer = setInterval(loadTv, 15_000); if (!wantCr) paint({}); }
        return { destroy() { unsub?.(); clearInterval(tvTimer); } };
      },
    },
    vFundHeat: {
      title: 'Funding APR Heatmap', icon: 'grid', cat: 'Markets', vice: true,
      w: 12, h: 10, minW: 6, minH: 6,
      settings: [F.sel('count', 'Coins', '24', [['15', 'Top 15'], ['24', 'Top 24']])],
      label: (s) => `top ${s.count} by OI · 1w`,
      mount(body, s) {
        return chartMount(body, async (chart) => {
          const map = await hlSnap();
          const coins = Object.entries(map)
            .sort((a, b) => (b[1].oi * b[1].px) - (a[1].oi * a[1].px))
            .slice(0, Number(s.count)).map(([k]) => k);
          const start = Date.now() - 7 * 86_400_000;
          const hist = await Promise.all(coins.map((c) =>
            hlInfo({ type: 'fundingHistory', coin: c, startTime: start }).catch(() => [])));
          const stamps = [...new Set(hist.flat().map((r) => Number(r.time)))].sort((a, b) => a - b);
          if (!stamps.length) throw new Error('no funding history yet');
          const idx = new Map(stamps.map((t, i) => [t, i]));
          const data = [];
          const aprs = [];
          hist.forEach((rows, y) => {
            for (const r of rows) {
              const x = idx.get(Number(r.time));
              if (x == null) continue;
              const apr = Number(r.fundingRate) * 24 * 365 * 100;
              data.push([x, y, Number(apr.toFixed(2))]);
              aprs.push(apr);
            }
          });
          aprs.sort((a, b) => a - b);
          const clamp = (p) => aprs[Math.floor(p * (aprs.length - 1))] ?? 0;
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 8, bottom: 34, containLabel: true },
            tooltip: { ...TIP_BOX, formatter: (p) => `<b>${esc(coins[p.data[1]])}</b> · ${new Date(stamps[p.data[0]]).toUTCString().slice(5, 22)}<br/>${p.data[2] >= 0 ? '+' : ''}${p.data[2]}% APR` },
            xAxis: { type: 'category', data: stamps.map((t) => new Date(t).toISOString().slice(5, 10)), axisLabel: { ...AXIS_LBL, interval: 23 }, axisLine: AXIS_LINE, axisTick: { show: false }, splitArea: { show: false } },
            yAxis: { type: 'category', data: coins, axisLabel: { ...AXIS_LBL, fontSize: 8.5 }, axisLine: AXIS_LINE, axisTick: { show: false }, inverse: true },
            visualMap: {
              min: Math.min(clamp(0.02), -1), max: Math.max(clamp(0.98), 15),
              calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
              itemWidth: 10, itemHeight: 90, textStyle: { ...AXIS_LBL, fontSize: 9 },
              inRange: { color: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'] },
            },
            series: [{ type: 'heatmap', data, progressive: 2000, emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } } }],
          }, { notMerge: true });
        }, 900_000);
      },
    },
    vSectors: {
      title: 'Sector Performance', icon: 'network', cat: 'Markets', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [F.sel('days', 'Window', '7', [['2', '2 days'], ['7', '1 week']])],
      label: (s) => `${s.days}d · equal-weight`,
      mount(body, s) {
        // curated equal-weight baskets over Hyperliquid perps
        const SECTORS = {
          DeFi: ['UNI', 'AAVE', 'LDO', 'CRV'],
          L1: ['ETH', 'SOL', 'AVAX', 'ADA'],
          L2: ['ARB', 'OP', 'POL', 'STRK'],
          AI: ['TAO', 'FET', 'RENDER', 'WLD'],
          Gaming: ['IMX', 'GALA', 'SAND', 'AXS'],
          Meme: ['DOGE', 'SHIB', 'PEPE', 'WIF'],
        };
        const S_COLOR = { DeFi: '#5aa7f7', L1: '#ff6473', L2: '#2dd4bf', AI: '#b47aff', Gaming: '#e7b53a', Meme: '#21d196' };
        const days = Number(s.days);
        return chartMount(body, async (chart) => {
          const uni = await hlSnap();
          const start = Date.now() - days * 86_400_000;
          const series = (await Promise.all(Object.entries(SECTORS).map(async ([name, coins]) => {
            const live = coins.filter((c) => uni[c]);
            if (live.length < 2) return null;
            const hists = await Promise.all(live.map((c) =>
              hlInfo({ type: 'candleSnapshot', req: { coin: c, interval: '1h', startTime: start, endTime: Date.now() } }).catch(() => null)));
            const byTs = new Map(); // ts -> {sum, n}
            for (const rows of hists) {
              const base = Number(rows?.[0]?.o);
              if (!(base > 0)) continue;
              for (const r of rows) {
                const t = Number(r.t);
                const v = (Number(r.c) / base - 1) * 100;
                const slot = byTs.get(t) ?? { sum: 0, n: 0 };
                slot.sum += v; slot.n += 1;
                byTs.set(t, slot);
              }
            }
            const pts = [...byTs.entries()].filter(([, v]) => v.n >= 2)
              .map(([t, v]) => [t, v.sum / v.n]).sort((a, b) => a[0] - b[0]);
            return pts.length > 1 ? [name, pts] : null;
          }))).filter(Boolean);
          if (!series.length) throw new Error('no sector history yet');
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: '{value}%' }, splitLine: AXIS_SPLIT },
            series: series.map(([name, pts]) => ({
              name, type: 'line', data: pts, showSymbol: false,
              lineStyle: { width: 1.2, color: S_COLOR[name] }, itemStyle: { color: S_COLOR[name] },
            })),
          }, { notMerge: true });
        }, 600_000);
      },
    },
    vOiCvd: {
      title: 'OI-Normalized CVD', icon: 'divide', cat: 'Markets', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [],
      label: () => 'top gainers · 1w',
      mount(body) {
        const PALETTE = ['#5aa7f7', '#b47aff', '#2dd4bf', '#f0b90b', '#ff6473', '#21d196'];
        return chartMount(body, async (chart) => {
          const uni = await hlSnap();
          let movers = [];
          try {
            const rows = await fetchMarkets();
            movers = rows.filter((r) => uni[r.s] && Number.isFinite(r.c7d ?? r.c24))
              .sort((a, b) => (b.c7d ?? b.c24) - (a.c7d ?? a.c24)).slice(0, 6).map((r) => r.s);
          } catch { /* HL fallback below */ }
          if (!movers.length) {
            movers = Object.entries(uni).filter(([, q]) => q.vol > 3e6)
              .sort((a, b) => b[1].chg - a[1].chg).slice(0, 6).map(([k]) => k);
          }
          const series = (await Promise.all(movers.map(async (sym, i) => {
            const [cvdJ, oiJ] = await Promise.all([
              getJson(`/api/vice-coinalyze?kind=cvd&sym=${sym}&days=7`, 20000).catch(() => null),
              getJson(`/api/vice-coinalyze?kind=oisnap&sym=${sym}`, 20000).catch(() => null),
            ]);
            const totOi = (oiJ?.venues ?? []).reduce((a, v) => a + v.value, 0);
            if (!cvdJ?.venues?.length || !(totOi > 0)) return null;
            const total = new Map();
            for (const v of cvdJ.venues) for (const [t, d] of v.points) total.set(t, (total.get(t) ?? 0) + d);
            let acc = 0;
            const pts = [...total.entries()].sort((a, b) => a[0] - b[0]).map(([t, d]) => [t, (acc += d) / totOi]);
            return pts.length > 1 ? [sym, pts, PALETTE[i % PALETTE.length]] : null;
          }))).filter(Boolean);
          if (!series.length) throw new Error('aggregator warming up — this panel refills itself');
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : Number(v).toFixed(2)) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', axisLabel: AXIS_LBL, splitLine: AXIS_SPLIT },
            series: series.map(([name, pts, color]) => ({
              name, type: 'line', data: pts, showSymbol: false,
              lineStyle: { width: 1.2, color }, itemStyle: { color },
            })),
          }, { notMerge: true });
        }, 600_000);
      },
    },
    vMktVol: {
      title: 'Market Volume', icon: 'bar-chart-2', cat: 'Markets', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [],
      label: () => 'top-12 basket · hourly $',
      mount(body) {
        return chartMount(body, async (chart) => {
          const agg = await getJson('/api/vice-coinalyze?kind=mktvol&days=7', 30000).catch(() => 'busy');
          if (agg === 'busy') throw new Error('aggregator warming up — this panel refills itself');
          if (agg?.noKey) throw new Error('needs the aggregator key (fills on vicesuite.com)');
          if (!agg?.venues?.length) throw new Error('no market volume series yet');
          const vs = agg.venues.slice().sort(byVenueOrder((v) => v.venue));
          const stamps = [...new Set(vs.flatMap((v) => v.points.map((p) => p[0])))].sort((a, b) => a - b);
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `$${fmtCompact(v)}`) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'category', data: stamps.map((t) => new Date(t).toISOString().slice(5, 13).replace('T', ' ')), axisLabel: { ...AXIS_LBL, fontSize: 9, interval: 23 }, axisLine: AXIS_LINE, axisTick: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: (v) => `$${fmtCompact(v)}` }, splitLine: AXIS_SPLIT },
            series: vs.map((v) => {
              const m = new Map(v.points);
              return { name: v.venue, type: 'bar', stack: 'mv', barMaxWidth: 8, data: stamps.map((t) => m.get(t) ?? 0), itemStyle: { color: VENUE_C[v.venue] } };
            }),
          }, { notMerge: true });
        }, 300_000);
      },
    },
    vMktOI: {
      title: 'Total Open Interest', icon: 'layers', cat: 'Markets', vice: true,
      w: 12, h: 9, minW: 5, minH: 5,
      settings: [],
      label: () => 'top-12 basket · $',
      mount(body) {
        return chartMount(body, async (chart) => {
          const agg = await getJson('/api/vice-coinalyze?kind=mktoi&days=7', 30000).catch(() => 'busy');
          if (agg === 'busy') throw new Error('aggregator warming up — this panel refills itself');
          if (agg?.noKey) throw new Error('needs the aggregator key (fills on vicesuite.com)');
          if (!agg?.venues?.length) throw new Error('no open-interest series yet');
          const vs = agg.venues.slice().sort(byVenueOrder((v) => v.venue));
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: 22, containLabel: true },
            tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => (v == null ? '—' : `$${fmtCompact(v)}`) },
            legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } },
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: { type: 'value', axisLabel: { ...AXIS_LBL, formatter: (v) => `$${fmtCompact(v)}` }, splitLine: AXIS_SPLIT },
            series: vs.map((v) => ({
              name: v.venue, type: 'line', data: v.points, showSymbol: false, stack: 'toi',
              lineStyle: { width: 1, color: VENUE_C[v.venue] }, itemStyle: { color: VENUE_C[v.venue] },
              areaStyle: { color: VENUE_C[v.venue], opacity: 0.6 },
            })),
          }, { notMerge: true });
        }, 300_000);
      },
    },
    vSuite: {
      title: 'Vice Suite', icon: 'layout-grid', cat: 'Vice', vice: true,
      w: 5, h: 6, minW: 3, minH: 4,
      settings: [],
      mount(body) {
        const box = el('div', 'vsuite',
          '<a class="gold" href="https://vicesuite.com/pricebots" target="_blank" rel="noopener"><i data-lucide="activity"></i>Vice Tickers — live prices in your sidebar</a>' +
          '<a class="pink" href="https://vicesuite.com/chartbot" target="_blank" rel="noopener"><i data-lucide="bar-chart-2"></i>Vice Charts — the vc chart bot</a>' +
          '<a class="teal" href="https://liqtheory.com/" target="_blank" rel="noopener"><i data-lucide="book-open"></i>Vice Academy — free trading course</a>' +
          '<a href="https://discord.gg/LiquidityTheory" target="_blank" rel="noopener"><i data-lucide="message-circle"></i>Join the Discord</a>');
        body.appendChild(box);
        icons();
        return {};
      },
    },
  };

  /* ── factory presets ────────────────────────────────────────────────── */
  const P = (type, x, y, w, h, settings = {}) => ({ id: uid(), type, x, y, w, h, settings });
  const PRESETS = {
    DeFi: () => [
      P('tvTape', 0, 0, 24, 2, { symbols: 'BITSTAMP:BTCUSD, BITSTAMP:ETHUSD, CRYPTO:SOLUSD, CRYPTO:XRPUSD, CRYPTO:BNBUSD, CRYPTO:DOGEUSD, CRYPTO:ADAUSD, COINBASE:HYPEUSD, CRYPTO:ZECUSD' }),
      P('tvChart', 0, 2, 14, 14, { symbol: 'BITSTAMP:BTCUSD', interval: '60' }),
      P('vWatch', 14, 2, 5, 8),
      P('vMovers', 19, 2, 5, 14),
      P('vNews', 14, 10, 5, 6),
      P('vHeat', 0, 16, 12, 10),
      P('vChart', 12, 16, 12, 10, { command: 'eth 1h ema20 ema55' }),
      P('vFunding', 0, 26, 10, 7),
      P('vCountdown', 10, 26, 4, 7),
      P('tvNews', 14, 26, 10, 7, { market: 'crypto' }),
    ],
    TradFi: () => [
      P('tvTape', 0, 0, 24, 2, { symbols: 'FOREXCOM:SPXUSD, FOREXCOM:NSXUSD, TVC:VIX, NASDAQ:AAPL, NASDAQ:NVDA, NASDAQ:TSLA, NASDAQ:MSFT, AMEX:SPY' }),
      P('tvChart', 0, 2, 14, 12, { symbol: 'AMEX:SPY', interval: 'D' }),
      P('tvOverview', 14, 2, 5, 12, { lead: 'indices' }),
      P('tvCal', 19, 2, 5, 12),
      P('tvStockHeat', 0, 14, 12, 10),
      P('tvNews', 12, 14, 6, 10, { market: 'stock' }),
      P('tvMini', 18, 14, 6, 10, { symbol: 'NASDAQ:NVDA', range: '3M' }),
    ],
    Macro: () => [
      P('tvTape', 0, 0, 24, 2, { symbols: 'CAPITALCOM:DXY, TVC:GOLD, TVC:USOIL, TVC:US10Y, FOREXCOM:SPXUSD, BITSTAMP:BTCUSD, FX:EURUSD' }),
      P('tvOverview', 0, 2, 7, 12, { lead: 'indices' }),
      P('tvCal', 7, 2, 8, 12),
      P('tvForexHeat', 15, 2, 9, 8),
      P('vClocks', 15, 10, 9, 4),
      P('tvChart', 0, 14, 12, 11, { symbol: 'OANDA:XAUUSD', interval: 'D' }),
      P('tvNews', 12, 14, 6, 11, { market: 'index' }),
      P('vNotes', 18, 14, 6, 11),
    ],
  };
  const defaultLayout = (name) => ({ grid: (PRESETS[name] ?? PRESETS.DeFi)() });

  /* ── store (localStorage) ───────────────────────────────────────────── */
  let store;
  function load() {
    try {
      const j = JSON.parse(localStorage.getItem(LS_KEY));
      if (j && j.v === SCHEMA_V && j.layouts && j.layouts[j.active]) {
        // 2026-07-22 terminology: Crypto→DeFi, Stocks→TradFi (order preserved)
        const ren = { Crypto: 'DeFi', Stocks: 'TradFi' };
        j.layouts = Object.fromEntries(Object.entries(j.layouts).map(([k, v]) => [ren[k] ?? k, v]));
        j.active = ren[j.active] ?? j.active;
        // stored settings outlive preset changes — patch the ones that went stale:
        // CRYPTO:HYPEUSD never had scanner data (dead tape slot) → COINBASE:HYPEUSD;
        // TradFi/Macro Market Overview should lead with Indices unless the user chose
        for (const [name, doc] of Object.entries(j.layouts)) {
          for (const inst of doc.grid ?? []) {
            if (inst.type === 'tvTape' && inst.settings?.symbols?.includes('CRYPTO:HYPEUSD'))
              inst.settings.symbols = inst.settings.symbols.replace(/CRYPTO:HYPEUSD/g, 'COINBASE:HYPEUSD');
            if (inst.type === 'tvOverview' && (name === 'TradFi' || name === 'Macro'))
              (inst.settings ??= {}).lead ??= 'indices';
          }
        }
        return j;
      }
    } catch { /* fresh start */ }
    return {
      v: SCHEMA_V,
      active: 'DeFi',
      layouts: { DeFi: defaultLayout('DeFi'), TradFi: defaultLayout('TradFi'), Macro: defaultLayout('Macro') },
    };
  }
  let saveT = null;
  function persist() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(store)); }
      catch { /* storage full/blocked — dashboard still works, just won't stick */ }
    }, 250);
  }

  /* ── engine ─────────────────────────────────────────────────────────── */
  let grid = null;
  let editing = false;
  const live = new Map(); // id -> { inst, elItem, body, handle, mounted }
  let observer = null;

  const activeGrid = () => store.layouts[store.active].grid;

  function toast(msg, action) {
    document.querySelectorAll('.hub-toast').forEach((t) => t.remove());
    const t = el('div', 'hub-toast', esc(msg));
    if (action) {
      const b = el('button', 'hub-toast-act', esc(action.label));
      b.addEventListener('click', () => { t.remove(); action.run(); });
      t.appendChild(b);
    }
    document.body.appendChild(t);
    setTimeout(() => t.remove(), action ? 5000 : 2600);
  }

  function widgetShell(inst, man) {
    const item = el('div', 'grid-stack-item');
    item.dataset.hid = inst.id;
    const content = el('div', 'grid-stack-item-content hw');
    const head = el('div', 'hw-head');
    // focus boards + section boards are ephemeral — their blocks offer a pin
    // that copies {type, settings} into the active dashboard layout
    const ephemeral = focusMode || currentSection !== 'dash';
    head.innerHTML = `<i data-lucide="${man.icon}"></i><span class="hw-title">${esc(man.title)}</span>` +
      '<span class="hw-btns">' +
      '<button class="hw-btn" data-act="refresh" title="Refresh"><i data-lucide="rotate-cw"></i></button>' +
      (man.settings?.length ? '<button class="hw-btn" data-act="settings" title="Settings"><i data-lucide="settings-2"></i></button>' : '') +
      (ephemeral ? '<button class="hw-btn hw-pin" data-act="pin" title="Pin to my Dashboard"><i data-lucide="pin"></i></button>' : '') +
      '<button class="hw-btn" data-act="expand" title="Fullscreen"><i data-lucide="maximize-2"></i></button>' +
      '<button class="hw-btn" data-act="remove" title="Remove"><i data-lucide="x"></i></button>' +
      '</span>';
    const body = el('div', 'hw-body');
    content.append(head, body);
    item.appendChild(content);
    head.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.hw-btn');
      if (!btn) return;
      ev.preventDefault();
      const act = btn.dataset.act;
      if (act === 'refresh') remount(inst.id);
      else if (act === 'settings') openSettings(inst.id);
      else if (act === 'expand') {
        if (document.fullscreenElement) document.exitFullscreen();
        else content.requestFullscreen?.().catch(() => toast('fullscreen was blocked by the browser'));
      } else if (act === 'pin') pinInstance(inst);
      else if (act === 'remove') removeInstance(inst.id);
    });
    return { item, body };
  }

  function mountNow(id) {
    const rec = live.get(id);
    if (!rec || rec.mounted) return;
    const man = HUB_WIDGETS[rec.inst.type];
    rec.mounted = true;
    const settings = { ...defaults(man), ...rec.inst.settings };
    // contextual header: "Advanced Chart · SOLUSD" beats five blocks all reading alike
    const titleEl = rec.elItem.querySelector('.hw-title');
    if (titleEl) {
      const suffix = man.label?.(settings);
      titleEl.textContent = suffix ? `${man.title} · ${suffix}` : man.title;
    }
    try {
      rec.handle = man.mount(rec.body, settings, rec.inst) ?? {};
    } catch (e) {
      note(rec.body, 'alert-triangle', `widget failed to start — ${esc(e.message)}`);
      rec.handle = {};
    }
    icons();
  }

  function unmount(rec) {
    try { rec.handle?.destroy?.(); } catch { /* already gone */ }
    rec.handle = null;
    rec.mounted = false;
    rec.body.innerHTML = '';
  }

  function remount(id) {
    const rec = live.get(id);
    if (!rec) return;
    unmount(rec);
    mountNow(id);
  }

  const defaults = (man) => Object.fromEntries((man.settings ?? []).map((f) => [f.key, f.def]));

  function addToGrid(inst, autoPos = false) {
    const man = HUB_WIDGETS[inst.type];
    if (!man) return; // unknown type in a saved layout — skip, keep the data
    // saved layouts may predate a raised minW/minH — grow them, never clip
    inst.w = Math.max(inst.w, man.minW);
    inst.h = Math.max(inst.h, man.minH);
    const { item, body } = widgetShell(inst, man);
    const rec = { inst, elItem: item, body, handle: null, mounted: false };
    live.set(inst.id, rec);
    $('#hub-grid').appendChild(item);
    grid.makeWidget(item, {
      x: autoPos ? undefined : inst.x, y: autoPos ? undefined : inst.y,
      w: inst.w, h: inst.h, minW: man.minW, minH: man.minH,
      autoPosition: autoPos, id: inst.id,
    });
    if (autoPos) {
      const n = item.gridstackNode;
      if (n) { inst.x = n.x; inst.y = n.y; }
    }
    observer.observe(body);
    icons();
  }

  function removeInstance(id) {
    const rec = live.get(id);
    if (!rec) return;
    if (focusMode || currentSection !== 'dash') { // ephemeral boards — no trash, no undo, no store
      unmount(rec);
      observer.unobserve(rec.body);
      grid.removeWidget(rec.elItem);
      live.delete(id);
      return;
    }
    const man = HUB_WIDGETS[rec.inst.type];
    const inst = rec.inst;
    unmount(rec);
    observer.unobserve(rec.body);
    grid.removeWidget(rec.elItem);
    live.delete(id);
    const g = activeGrid();
    const i = g.findIndex((x) => x.id === id);
    if (i >= 0) g.splice(i, 1);
    // removed blocks keep their settings and wait in the tray's Recently removed
    const doc = store.layouts[store.active];
    doc.trash ??= [];
    doc.trash.unshift(inst);
    doc.trash = doc.trash.slice(0, 10);
    persist();
    updateEmpty();
    // a misclick shouldn't cost a configured block — 5s to take it back
    toast(`removed ${man.title}`, { label: 'Undo', run: () => restoreInstance(inst.id) });
  }

  function restoreInstance(id) {
    const doc = store.layouts[store.active];
    const i = (doc.trash ?? []).findIndex((x) => x.id === id);
    if (i < 0) return;
    const inst = doc.trash.splice(i, 1)[0];
    doc.grid.push(inst);
    addToGrid(inst, false);
    persist();
    updateEmpty();
  }

  function updateEmpty() {
    const empty = $('#hub-empty');
    if (empty) empty.hidden = activeGrid().length > 0;
  }

  function clearCanvas() {
    for (const rec of live.values()) {
      unmount(rec);
      observer.unobserve(rec.body);
    }
    live.clear();
    grid.removeAll();
  }

  function renderLayout() {
    teardownPage();
    showCanvas('grid');
    clearCanvas();
    grid.batchUpdate();
    for (const inst of activeGrid()) addToGrid(inst);
    grid.batchUpdate(false);
    $('#hub-layout').value = store.active;
    updateEmpty();
    navPriceSync?.();
  }

  function addInstance(type) {
    const man = HUB_WIDGETS[type];
    const inst = { id: uid(), type, x: 0, y: 0, w: man.w, h: man.h, settings: {} };
    activeGrid().push(inst);
    addToGrid(inst, true);
    persist();
    updateEmpty();
    live.get(inst.id)?.elItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ── settings modal (auto-generated from the widget's schema) ───────── */
  function modal(title, icon, bodyEl, foot) {
    const veil = el('div', 'hub-modal-veil');
    const box = el('div', 'hub-modal');
    const head = el('div', 'hub-modal-head',
      `<i data-lucide="${icon}"></i>${esc(title)}<button class="hw-btn x" title="Close"><i data-lucide="x"></i></button>`);
    const body = el('div', 'hub-modal-body');
    body.appendChild(bodyEl);
    box.append(head, body);
    if (foot) {
      const f = el('div', 'hub-modal-foot');
      foot.forEach((b) => f.appendChild(b));
      box.appendChild(f);
    }
    veil.appendChild(box);
    const close = () => { veil.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    veil.addEventListener('click', (e) => { if (e.target === veil) close(); });
    head.querySelector('.x').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(veil);
    icons();
    return { veil, box, close };
  }

  function buildForm(fields, values) {
    const form = el('div');
    for (const f of fields) {
      const field = el('div', 'hf-field');
      const val = values[f.key] ?? f.def;
      if (f.kind === 'toggle') {
        field.innerHTML = `<label class="hf-toggle"><input type="checkbox" data-k="${f.key}" ${val ? 'checked' : ''}/> ${esc(f.label)}</label>`;
      } else {
        field.appendChild(el('label', 'hf-label', esc(f.label)));
        if (f.kind === 'select') {
          const sel = el('select', 'hf-select');
          sel.dataset.k = f.key;
          for (const [v, lab] of f.options) {
            const o = el('option', null, esc(lab));
            o.value = v;
            if (String(v) === String(val)) o.selected = true;
            sel.appendChild(o);
          }
          field.appendChild(sel);
        } else if (f.kind === 'textarea') {
          const ta = el('textarea', 'hf-textarea');
          ta.dataset.k = f.key;
          ta.value = val ?? '';
          field.appendChild(ta);
        } else {
          const inp = el('input', 'hf-input');
          inp.dataset.k = f.key;
          inp.type = f.kind === 'number' ? 'number' : 'text';
          if (f.min != null) inp.min = f.min;
          if (f.max != null) inp.max = f.max;
          inp.value = val ?? '';
          field.appendChild(inp);
        }
      }
      if (f.help) field.appendChild(el('div', 'hf-help', esc(f.help)));
      form.appendChild(field);
    }
    const read = () => {
      const out = {};
      for (const f of fields) {
        const input = form.querySelector(`[data-k="${f.key}"]`);
        if (!input) continue;
        out[f.key] = f.kind === 'toggle' ? input.checked
          : f.kind === 'number' ? Number(input.value)
          : input.value;
      }
      return out;
    };
    return { form, read };
  }

  function openSettings(id) {
    const rec = live.get(id);
    if (!rec) return;
    const man = HUB_WIDGETS[rec.inst.type];
    if (!man.settings?.length) { toast('this widget has no settings'); return; }
    const { form, read } = buildForm(man.settings, { ...defaults(man), ...rec.inst.settings });
    const cancel = el('button', 'hub-btn', 'Cancel');
    const save = el('button', 'hub-btn primary', 'Save');
    const m = modal(`${man.title} — settings`, 'settings-2', form, [cancel, save]);
    cancel.addEventListener('click', m.close);
    save.addEventListener('click', () => {
      // sanitize: blank required text falls back to the default, numbers clamp
      const values = read();
      for (const f of man.settings) {
        const v = values[f.key];
        if ((f.kind === 'text' || f.kind === 'textarea') && typeof v === 'string' && !v.trim()) {
          values[f.key] = f.def ?? v;
        } else if (f.kind === 'number') {
          let n = Number(v);
          if (!Number.isFinite(n)) n = f.def;
          if (f.min != null) n = Math.max(f.min, n);
          if (f.max != null) n = Math.min(f.max, n);
          values[f.key] = n;
        }
      }
      rec.inst.settings = { ...rec.inst.settings, ...values };
      man.onSettingsSaved?.(rec.inst.settings);
      persist();
      m.close();
      remount(id);
    });
  }

  /* ── add-widget tray ────────────────────────────────────────────────── */
  function openTray() {
    const cats = ['Charts', 'Markets', 'Futures', 'Options', 'Screeners', 'News & data', 'Vice'];
    const wrap = el('div');
    const trash = store.layouts[store.active].trash ?? [];
    if (trash.length) {
      wrap.appendChild(el('div', 'hub-tray-cat', 'Recently removed'));
      const gridEl = el('div', 'hub-tray-grid');
      for (const inst of trash) {
        const m = HUB_WIDGETS[inst.type];
        if (!m) continue;
        const b = el('button', 'hub-tray-item',
          `<i data-lucide="rotate-ccw"></i><span><strong>${esc(m.title)}</strong>` +
          '<span class="d">restore with its settings</span></span>');
        b.addEventListener('click', () => { m2.close(); restoreInstance(inst.id); });
        gridEl.appendChild(b);
      }
      wrap.appendChild(gridEl);
    }
    for (const cat of cats) {
      const types = Object.entries(HUB_WIDGETS).filter(([, m]) => m.cat === cat);
      if (!types.length) continue;
      wrap.appendChild(el('div', 'hub-tray-cat', esc(cat === 'Vice' ? 'Vice originals' : cat)));
      const gridEl = el('div', 'hub-tray-grid');
      for (const [type, m] of types) {
        const b = el('button', 'hub-tray-item',
          `<i data-lucide="${m.icon}"></i><span><strong>${esc(m.title)}</strong>` +
          `<span class="d">${m.vice ? 'Vice original' : 'TradingView'} · ${m.w}×${m.h}</span></span>`);
        b.addEventListener('click', () => { m2.close(); addInstance(type); });
        gridEl.appendChild(b);
      }
      wrap.appendChild(gridEl);
    }
    const m2 = modal('Add a widget', 'plus', wrap);
    m2.box.classList.add('wide');
  }

  /* ── layout management ──────────────────────────────────────────────── */
  function switchLayout(name) {
    if (!store.layouts[name]) return;
    if (focusMode) exitFocus(false);
    if (currentSection !== 'dash') {
      // picking a layout is a dashboard action — leave the section cleanly
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      exitSection(false);
    }
    store.active = name;
    persist();
    renderLayout();
  }

  function refreshLayoutSelect() {
    const sel = $('#hub-layout');
    sel.innerHTML = '';
    for (const name of Object.keys(store.layouts)) {
      const o = el('option', null, esc(name));
      o.value = name;
      if (name === store.active) o.selected = true;
      sel.appendChild(o);
    }
  }

  function exportLayout() {
    const doc = { app: 'vice-hub', v: SCHEMA_V, name: store.active, layout: store.layouts[store.active] };
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-hub-${store.active.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importLayout(file) {
    file.text().then((txt) => {
      const doc = JSON.parse(txt);
      const layout = doc?.layout ?? doc; // accept bare {grid:[...]} too
      if (!Array.isArray(layout?.grid)) throw new Error('bad shape');
      layout.grid = layout.grid
        .filter((i) => i && HUB_WIDGETS[i.type])
        .map((i) => ({ id: uid(), type: i.type, x: i.x | 0, y: i.y | 0, w: i.w || HUB_WIDGETS[i.type].w, h: i.h || HUB_WIDGETS[i.type].h, settings: i.settings ?? {} }));
      if (!layout.grid.length) throw new Error('no known widgets in that file');
      let name = String(doc?.name ?? 'Imported').slice(0, 40) || 'Imported';
      while (store.layouts[name]) name += ' 2';
      store.layouts[name] = { grid: layout.grid };
      store.active = name;
      persist();
      refreshLayoutSelect();
      renderLayout();
      toast(`imported "${name}"`);
    }).catch(() => toast("import failed — that file isn't a Vice Hub layout"));
  }

  /* ── alert beep (best effort — browsers gate audio behind a gesture) ── */
  let audioCtx = null;
  function beep() {
    try {
      audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t0 = audioCtx.currentTime;
      [880, 1318].forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + i * 0.13);
        g.gain.exponentialRampToValueAtTime(0.15, t0 + i * 0.13 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.13 + 0.12);
        o.connect(g).connect(audioCtx.destination);
        o.start(t0 + i * 0.13);
        o.stop(t0 + i * 0.13 + 0.13);
      });
    } catch { /* no audio — notification still fires */ }
  }

  /* ── tab-title + favicon ticker (the hub works even when buried) ────── */
  function startTitleTicker() {
    const fav = document.querySelector('link[rel="icon"]');
    const base = new Image();
    base.src = '../vice-terminal-64.png';
    let last = '';
    hlFeed.sub((map) => {
      const sym = linkedSym && map[linkedSym] ? linkedSym : 'BTC';
      const q = map[sym];
      if (!q) return;
      const up = (q.chg ?? 0) >= 0;
      const title = `${sym} ${fmtPx(q.px)} ${up ? '↗' : '↘'} · Vice Hub`;
      if (title === last) return;
      last = title;
      document.title = title;
      if (fav && base.complete && base.naturalWidth) {
        const c = document.createElement('canvas');
        c.width = 64; c.height = 64;
        const x = c.getContext('2d');
        x.drawImage(base, 0, 0, 64, 64);
        x.beginPath();
        x.arc(49, 49, 13, 0, Math.PI * 2);
        x.fillStyle = up ? '#21d196' : '#ea3943';
        x.fill();
        x.lineWidth = 5;
        x.strokeStyle = '#08070f';
        x.stroke();
        fav.href = c.toDataURL('image/png');
      }
    });
  }



  /* ── navbar live price: BTC on DeFi, S&P 500 on TradFi ─────────────── */
  let navPriceSync = null;
  function startNavPrice() {
    const btn = $('#hub-price');
    if (!btn) return;
    const txt = btn.querySelector('.hp-txt');
    let spx = null;
    let spxTimer = null;
    const wantSPX = () => store.active === 'TradFi';
    const paint = () => {
      const sym = wantSPX() ? 'S&P 500' : 'BTC';
      const q = wantSPX() ? spx : hlFeed.snap()?.BTC;
      if (!q) { txt.innerHTML = `<b>${sym}</b> —`; return; }
      const up = (q.chg ?? 0) >= 0;
      txt.innerHTML = `<b>${sym}</b> ${wantSPX() ? fmtPx(q.px) : `$${fmtPx(q.px)}`} ` +
        `<em class="${up ? 'up' : 'down'}">${up ? '\u2197' : '\u2198'} ${fmtChg(q.chg)}</em>`;
    };
    // SPX via the TV scanner simple-request trick (same as tickers-live.js):
    // no content-type header = no preflight; responses carry ACAO.
    const pollSPX = async () => {
      try {
        const res = await fetch('https://scanner.tradingview.com/global/scan', {
          method: 'POST',
          body: JSON.stringify({ symbols: { tickers: ['SP:SPX'] }, columns: ['close', 'change'] }),
          signal: AbortSignal.timeout(9000),
        });
        const d = (await res.json())?.data?.[0]?.d;
        if (d) { spx = { px: Number(d[0]), chg: Number(d[1]) }; paint(); }
      } catch { /* keep the last quote */ }
    };
    navPriceSync = () => {
      if (wantSPX()) {
        if (!spxTimer) { spxTimer = setInterval(pollSPX, 10_000); pollSPX(); }
      } else if (spxTimer) { clearInterval(spxTimer); spxTimer = null; }
      paint();
    };
    hlFeed.sub(() => { if (!wantSPX()) paint(); });
    btn.addEventListener('click', () => enterFocus(wantSPX() ? 'FOREXCOM:SPXUSD' : 'BTC'));
    navPriceSync();
  }

  /* ── Focus mode: one ticker, every angle — ephemeral, never persisted ─── */
  let focusMode = false;
  let focusSym = null;

  function focusMeta(raw) {
    const SYM = raw.trim().toUpperCase();
    const coin = SYM.replace(/^.*:/, '');
    const isCrypto = !!hlFeed.snap()?.[coin];
    const tvSym = raw.includes(':') ? raw.trim() : (isCrypto ? tvSymbolFor(coin) : SYM);
    return { coin, isCrypto, tvSym };
  }

  function focusInsts({ coin, isCrypto, tvSym }, hasNews) {
    const base = [
      P('tvChart', 0, 0, 14, 13, { symbol: tvSym, interval: '60' }),
      P('tvSymInfo', 14, 0, 10, 6, { symbol: tvSym, mode: 'info' }),
    ];
    if (hasNews) {
      base.push(P('tvNews', 0, 13, 8, 9, { symbol: tvSym }), P('tvMini', 8, 13, 8, 9, { symbol: tvSym, range: '12M' }));
    } else {
      base.push(P('tvMini', 0, 13, 16, 9, { symbol: tvSym, range: '12M' }));
    }
    if (isCrypto) {
      base.push(
        P('vChart', 14, 6, 10, 7, { command: `${coin.toLowerCase()} 4h ema20 ema55`, linked: false }),
        P('vFunding', 16, 13, 8, 4, { only: coin }),
        P('vCountdown', 16, 17, 8, 5),
      );
    } else {
      base.push(
        P('tvSymInfo', 14, 6, 10, 7, { symbol: tvSym, mode: 'fundamentals' }),
        P('vCountdown', 16, 13, 8, 9),
      );
    }
    return base;
  }

  function renderInsts(insts) {
    teardownPage();
    showCanvas('grid');
    clearCanvas();
    grid.batchUpdate();
    for (const inst of insts) addToGrid(inst);
    grid.batchUpdate(false);
    const empty = $('#hub-empty');
    if (empty) empty.hidden = true;
  }

  async function enterFocus(raw, displaySym) {
    const meta = focusMeta(raw);
    // no stories for this ticker → skip the news block (needs the deployed
    // /api/vice-headlines proxy; locally we can't know, so news stays)
    let hasNews = true;
    try {
      const j = await getJson(`/api/vice-headlines?symbol=${encodeURIComponent(meta.tvSym)}`, 2500);
      hasNews = (j.count ?? 1) > 0;
    } catch { /* proxy unavailable — keep news */ }
    const insts = focusInsts(meta, hasNews);
    const sym = displaySym ?? meta.coin;
    focusMode = true;
    focusSym = sym;
    linkedSym = sym; // tab title follows the focused ticker
    document.body.classList.add('focused');
    const btn = $('#hub-focus');
    btn.classList.add('focus-on');
    btn.innerHTML = `<i data-lucide="crosshair"></i><span>${esc(sym)} · exit</span>`;
    renderInsts(insts);
    icons();
  }

  function exitFocus(rerender = true) {
    focusMode = false;
    focusSym = null;
    document.body.classList.remove('focused');
    const btn = $('#hub-focus');
    btn.classList.remove('focus-on');
    btn.innerHTML = '<i data-lucide="crosshair"></i><span>Focus</span>';
    // leaving focus lands back where the user was: section board or dashboard
    if (rerender) (currentSection !== 'dash' ? renderSection() : renderLayout());
    icons();
  }

  /* ── sections: Velo-style replica pages — the Dashboard stays the custom
     gridstack canvas, untouched. Each section is a STATIC page (no drag, no
     cells): a control bar + a fixed 2-col grid of panels. Panels host the
     same widget mounts the dashboard uses, invisibly — the one addition is
     a pin button that copies {type, settings} into the active layout. ── */
  let currentSection = 'dash';
  const sectionSym = () => (linkedSym && hlFeed.snap()?.[linkedSym] ? linkedSym : 'BTC');

  let pageMounts = []; // live panels on the current section page

  function teardownPage() {
    for (const pm of pageMounts) { try { pm.handle?.destroy?.(); } catch { /* gone */ } }
    pageMounts = [];
    const root = $('#hub-section');
    if (root) root.innerHTML = '';
  }

  function showCanvas(kind) {
    const gridEl = $('#hub-grid');
    const page = $('#hub-section');
    if (gridEl) gridEl.style.display = kind === 'page' ? 'none' : '';
    if (page) page.hidden = kind !== 'page';
    if (kind === 'page') { const e = $('#hub-empty'); if (e) e.hidden = true; }
  }

  // a section panel: our chrome, Velo's structure — title, refresh/pin/full,
  // the widget mounted inside. Panels re-point when a linked symbol changes.
  function panel(gridEl, type, settings = {}, cls = '') {
    const man = HUB_WIDGETS[type];
    if (!man) return null;
    const p = el('div', `vpanel${cls ? ` ${cls}` : ''}`);
    const head = el('div', 'vpanel-head');
    const bodyEl = el('div', 'vpanel-body');
    p.append(head, bodyEl);
    gridEl.appendChild(p);
    const pm = { man, type, settings: { ...settings }, handle: null };
    const title = () => {
      const merged = { ...defaults(man), ...pm.settings };
      const suffix = man.label?.(merged);
      return `${man.title}${suffix ? ` · ${suffix}` : ''}`;
    };
    const mountIt = () => {
      const merged = { ...defaults(man), ...pm.settings };
      head.innerHTML = `<i data-lucide="${man.icon}"></i><span class="vp-title">${esc(title())}</span>` +
        '<span class="hw-btns">' +
        '<button class="hw-btn" data-act="refresh" title="Refresh"><i data-lucide="rotate-cw"></i></button>' +
        '<button class="hw-btn hw-pin" data-act="pin" title="Pin to my Dashboard"><i data-lucide="pin"></i></button>' +
        '<button class="hw-btn" data-act="expand" title="Fullscreen"><i data-lucide="maximize-2"></i></button></span>';
      bodyEl.innerHTML = '';
      try { pm.handle = man.mount(bodyEl, merged) ?? {}; }
      catch (e) { note(bodyEl, 'alert-triangle', `panel failed to start — ${esc(e.message)}`); pm.handle = {}; }
    };
    pm.remount = () => { try { pm.handle?.destroy?.(); } catch { /* gone */ } mountIt(); icons(); };
    head.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.hw-btn');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'refresh') pm.remount();
      else if (act === 'pin') pinInstance({ type, w: man.w, h: man.h, settings: { ...pm.settings } });
      else if (act === 'expand') {
        if (document.fullscreenElement) document.exitFullscreen();
        else p.requestFullscreen?.().catch(() => toast('fullscreen was blocked by the browser'));
      }
    });
    mountIt();
    pageMounts.push(pm);
    return p;
  }

  // section control bar: Velo puts the asset switch up top — so do we
  function pageSwitcher(root, current, choices, onPick) {
    const bar = el('div', 'vpage-bar');
    for (const c of choices) {
      const b = el('button', `vpage-chip${c === current ? ' on' : ''}`, esc(c));
      b.addEventListener('click', () => { if (c !== current) onPick(c); });
      bar.appendChild(b);
    }
    root.appendChild(bar);
    return bar;
  }

  const SECTION_META = {
    chart: {
      title: 'Chart', icon: 'candlestick-chart',
      render(root) {
        const sym = sectionSym();
        const grid = el('div', 'vpage-grid');
        root.appendChild(grid);
        panel(grid, 'tvChart', { symbol: tvSymbolFor(sym), interval: '60' }, 'span2 vp-hero');
        panel(grid, 'vScreener', { tab: 'all', count: 30 }, 'span2 vp-tall');
      },
    },
  };


  function navSync() {
    document.querySelectorAll('#hub-nav a').forEach((a) => {
      a.classList.toggle('active', (a.dataset.sec ?? 'dash') === currentSection);
    });
  }

  function renderSection() {
    teardownPage();
    clearCanvas(); // any grid leftovers (dashboard widgets, focus board)
    showCanvas('page');
    SECTION_META[currentSection].render($('#hub-section'));
    icons();
  }

  function enterSection(name, sym) {
    if (!SECTION_META[name]) return;
    if (focusMode) exitFocus(false);
    if (sym && /^[A-Z0-9]{2,12}$/i.test(sym)) linkedSym = sym.toUpperCase();
    currentSection = name;
    document.body.classList.add('in-section');
    navSync();
    renderSection();
  }

  function exitSection(rerender = true) {
    const was = currentSection !== 'dash';
    currentSection = 'dash';
    document.body.classList.remove('in-section');
    teardownPage();
    showCanvas('grid');
    navSync();
    if (rerender && was) renderLayout();
  }

  function applyRoute() {
    const [seg, arg] = location.hash.replace(/^#\/?/, '').split('/');
    const name = (seg ?? '').toLowerCase();
    if (SECTION_META[name]) enterSection(name, arg);
    else { if (focusMode) exitFocus(false); exitSection(); }
  }

  function pinInstance(inst) {
    const man = HUB_WIDGETS[inst.type];
    if (!man) return;
    const doc = store.layouts[store.active];
    const copy = {
      id: uid(), type: inst.type, x: 0,
      y: Math.max(0, ...doc.grid.map((i) => (i.y ?? 0) + (i.h ?? 1))),
      w: inst.w, h: inst.h, settings: { ...inst.settings },
    };
    doc.grid.push(copy);
    persist();
    toast(`pinned ${man.title} to "${store.active}"`);
  }

  // the TradFi side of the search book: display label · TV symbol · search keys
  const TRADFI_BOOK = [
    ['S&P 500', 'FOREXCOM:SPXUSD', 'spx sp500 index'],
    ['Nasdaq 100', 'FOREXCOM:NSXUSD', 'ndx nasdaq index'],
    ['Dow Jones', 'FOREXCOM:DJI', 'dji dow index'],
    ['VIX', 'TVC:VIX', 'vix volatility index'],
    ['SPY', 'AMEX:SPY', 'spy etf'],
    ['QQQ', 'NASDAQ:QQQ', 'qqq etf'],
    ['GLD', 'AMEX:GLD', 'gld gold etf'],
    ['TLT', 'NASDAQ:TLT', 'tlt bonds etf'],
    ['AAPL', 'NASDAQ:AAPL', 'apple'],
    ['NVDA', 'NASDAQ:NVDA', 'nvidia'],
    ['MSFT', 'NASDAQ:MSFT', 'microsoft'],
    ['TSLA', 'NASDAQ:TSLA', 'tesla'],
    ['AMZN', 'NASDAQ:AMZN', 'amazon'],
    ['GOOGL', 'NASDAQ:GOOGL', 'google alphabet'],
    ['META', 'NASDAQ:META', 'facebook'],
    ['AMD', 'NASDAQ:AMD', 'amd'],
    ['NFLX', 'NASDAQ:NFLX', 'netflix'],
    ['COIN', 'NASDAQ:COIN', 'coinbase'],
    ['MSTR', 'NASDAQ:MSTR', 'microstrategy strategy'],
    ['HOOD', 'NASDAQ:HOOD', 'robinhood'],
    ['Gold', 'OANDA:XAUUSD', 'xau metals'],
    ['Silver', 'OANDA:XAGUSD', 'xag metals'],
    ['WTI Crude', 'TVC:USOIL', 'oil energy'],
    ['Dollar Index', 'CAPITALCOM:DXY', 'dxy usd'],
    ['EUR/USD', 'FX:EURUSD', 'eurusd forex euro'],
    ['US 10Y', 'TVC:US10Y', 'yields bonds treasury'],
  ];

  function openFocusSearch() {
    if (document.querySelector('.hub-palette-veil')) return;
    const veil = el('div', 'hub-palette-veil');
    const pal = el('div', 'hub-palette');
    const input = el('input', 'hub-palette-input');
    input.placeholder = 'Focus — sol, apple, S&P 500, NASDAQ:AAPL…';
    const list = el('div', 'hub-palette-list');
    pal.append(input, list);
    veil.appendChild(pal);
    const close = () => veil.remove();

    const cryptoUniverse = () => {
      let watch = [];
      try { watch = JSON.parse(localStorage.getItem(LS_WATCH)) ?? []; } catch { /* none */ }
      const rest = Object.entries(hlFeed.snap() ?? {})
        .sort((a, b) => (b[1].oi * b[1].px) - (a[1].oi * a[1].px))
        .map(([k]) => k)
        .filter((k) => !watch.includes(k));
      return [...watch, ...rest];
    };
    const cryptoMatch = (q) => {
      const u = cryptoUniverse();
      if (!q) return u.slice(0, 6);
      const starts = u.filter((sym) => sym.startsWith(q));
      const named = u.filter((sym) => !starts.includes(sym) &&
        (sym.includes(q) || (coinNames[sym] ?? '').toUpperCase().includes(q)));
      return [...starts, ...named].slice(0, 6);
    };
    const tradfiMatch = (q) => {
      if (!q) return TRADFI_BOOK.slice(0, 6);
      const ql = q.toLowerCase();
      const starts = TRADFI_BOOK.filter(([label]) => label.toUpperCase().startsWith(q));
      const rest = TRADFI_BOOK.filter((e) => !starts.includes(e) &&
        (`${e[0]} ${e[1]} ${e[2]}`.toLowerCase().includes(ql)));
      return [...starts, ...rest].slice(0, 6);
    };

    let flat = []; // [{html, run}] in render order
    let sel = 0;
    const build = () => {
      const q = input.value.trim().toUpperCase();
      flat = [];
      const groups = [];
      const crypto = {
        title: 'DeFi',
        items: cryptoMatch(q).map((sym) => ({
          html: `${iconFor(sym)}<span class="fs-l">${esc(sym)}</span><span class="fs-sub">${esc(coinNames[sym] ?? 'Hyperliquid perp')}</span>`,
          run: () => enterFocus(sym),
        })),
      };
      const tradfi = {
        title: 'TradFi',
        items: tradfiMatch(q).map(([label, tv]) => ({
          html: `<i data-lucide="landmark"></i><span class="fs-l">${esc(label)}</span><span class="fs-sub">${esc(tv)}</span>`,
          run: () => enterFocus(tv, label),
        })),
      };
      // honor the active layout: its universe leads
      groups.push(...(store.active === 'TradFi' ? [tradfi, crypto] : [crypto, tradfi]));
      if (q && /^[A-Z0-9:._-]{2,20}$/.test(q) &&
          !groups.some((g) => g.items.some((it) => it.html.includes(`>${q}<`)))) {
        groups.push({ title: 'Anything else', items: [{
          html: `<i data-lucide="crosshair"></i><span class="fs-l">${esc(q)}</span><span class="fs-sub">as typed</span>`,
          run: () => enterFocus(q),
        }] });
      }
      let html = '';
      for (const g of groups) {
        if (!g.items.length) continue;
        html += `<div class="hub-palette-cat">${g.title}</div>`;
        for (const it of g.items) {
          html += `<button type="button" class="hub-palette-item${flat.length === sel ? ' sel' : ''}" data-i="${flat.length}">${it.html}</button>`;
          flat.push(it);
        }
      }
      list.innerHTML = html || '<div class="hub-palette-empty">nothing matches</div>';
      icons();
    };
    const refilter = () => { sel = 0; build(); };
    input.addEventListener('input', refilter);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, flat.length - 1); build(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); build(); }
      else if (e.key === 'Enter') { const it = flat[sel]; if (it) { close(); it.run(); } }
    });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('.hub-palette-item');
      if (!b) return;
      const it = flat[Number(b.dataset.i)];
      close();
      it?.run();
    });
    veil.addEventListener('click', (e) => { if (e.target === veil) close(); });
    document.body.appendChild(veil);
    input.focus();
    refilter();
  }

  /* ── command palette (Cmd/Ctrl+K or /) ──────────────────────────────── */
  function openPalette() {
    if (document.querySelector('.hub-palette-veil')) return;
    const veil = el('div', 'hub-palette-veil');
    const pal = el('div', 'hub-palette');
    const input = el('input', 'hub-palette-input');
    input.placeholder = 'Search actions, layouts, widgets — or type a ticker…';
    const list = el('div', 'hub-palette-list');
    pal.append(input, list);
    veil.appendChild(pal);
    const close = () => veil.remove();
    const actions = [
      { icon: 'layout-dashboard', label: 'Go to: Dashboard', run: () => { location.hash = '#/'; } },
      ...Object.entries(SECTION_META).map(([k, m]) => ({
        icon: m.icon, label: `Go to: ${m.title}`,
        run: () => { location.hash = `#/${k}`; },
      })),
      ...Object.keys(store.layouts).map((n) => ({
        icon: 'layout-grid', label: `Switch layout: ${n}`,
        run: () => switchLayout(n),
      })),
      { icon: 'pencil', label: editing ? 'Done editing' : 'Edit layout', run: () => $('#hub-edit').click() },
      ...Object.entries(HUB_WIDGETS).map(([t, m]) => ({
        icon: m.icon, label: `Add widget: ${m.title}`,
        run: () => { if (!editing) $('#hub-edit').click(); addInstance(t); },
      })),
      { icon: 'download', label: 'Export layout as JSON', run: exportLayout },
    ];
    let filtered = actions;
    let sel = 0;
    const paint = () => {
      list.innerHTML = filtered.slice(0, 12).map((a, i) =>
        `<button type="button" class="hub-palette-item${i === sel ? ' sel' : ''}" data-i="${i}">` +
        `<i data-lucide="${a.icon}"></i>${esc(a.label)}</button>`).join('')
        || '<div class="hub-palette-empty">nothing matches</div>';
      icons();
    };
    const refilter = () => {
      const q = input.value.trim().toLowerCase();
      filtered = q ? actions.filter((a) => a.label.toLowerCase().includes(q)) : actions;
      if (q && /^[a-z0-9]{2,10}$/.test(q)) {
        filtered = [{
          icon: 'crosshair', label: `Focus on ${q.toUpperCase()}`,
          run: () => enterFocus(q.toUpperCase()),
        }, {
          icon: 'link', label: `Link charts to ${q.toUpperCase()}`,
          run: () => linkSymbol(q.toUpperCase()),
        }, ...filtered];
      }
      sel = 0;
      paint();
    };
    input.addEventListener('input', refilter);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, Math.min(filtered.length, 12) - 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(); }
      else if (e.key === 'Enter') { const a = filtered[sel]; if (a) { close(); a.run(); } }
    });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('.hub-palette-item');
      if (!b) return;
      const a = filtered[Number(b.dataset.i)];
      close();
      a?.run();
    });
    veil.addEventListener('click', (e) => { if (e.target === veil) close(); });
    document.body.appendChild(veil);
    input.focus();
    refilter();
  }

  function startShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const a = document.activeElement;
      const typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
      if (typing || document.querySelector('.hub-modal-veil, .hub-palette-veil')) return;
      if (e.key === '/') { e.preventDefault(); openPalette(); }
      else if (e.key.toLowerCase() === 'f') { focusMode ? exitFocus() : openFocusSearch(); }
      else if (e.key.toLowerCase() === 'e') $('#hub-edit').click();
      else if (/^[1-5]$/.test(e.key)) {
        const name = Object.keys(store.layouts)[Number(e.key) - 1];
        if (name) switchLayout(name);
      }
    });
  }

  /* ── boot ───────────────────────────────────────────────────────────── */
  function boot() {
    if (!window.GridStack) {
      const main = $('.hub-main');
      main.innerHTML = '';
      note(main, 'alert-triangle', "the layout engine didn't load — refresh the page");
      return;
    }
    store = load();

    grid = GridStack.init({
      column: GRID_COLS,
      cellHeight: CELL_H,
      margin: 6,
      float: true,
      handle: '.hw-head',
      staticGrid: false, // geometry is always live — drag by header, resize by corner
      animate: true,
      // columnMax MUST match column — columnOpts defaults it to 12, which
      // silently overrides the 24-col fine grid (learned the hard way)
      columnOpts: { columnMax: GRID_COLS, breakpoints: [{ w: 900, c: 6 }, { w: 560, c: 2 }] },
    }, '#hub-grid');

    observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = e.target.closest('.grid-stack-item')?.dataset.hid;
        if (id) mountNow(id);
      }
    }, { rootMargin: '250px' });
    // safety net (mirrors the site's reveal rule): if IO never fires — hidden
    // pane, zero-height viewport — mount everything after 2.5s
    setTimeout(() => { for (const id of live.keys()) mountNow(id); }, 2500);

    // persist geometry on drag/resize — but never while collapsed to fewer
    // columns (mobile), or we'd overwrite the desktop layout.
    // COLLAPSE-RETURN TRAP: when the page loads in a zero/narrow-width window
    // (hidden browser pane, background tab) gridstack collapses to 2/6 cols and
    // its scale-up back to 24 is lossy (widths double, rows cascade) — and that
    // junk arrives here with getColumn() already 24, so it used to get saved.
    // The instances in the store are never clamped, so they stay authoritative:
    // on any return to 24 cols we re-apply store geometry and skip that save.
    let lastCol = grid.getColumn(); // may be <24 already (width-0 load)
    function reapplyGeometry() {
      grid.batchUpdate();
      for (const rec of live.values()) {
        const { inst, elItem } = rec;
        grid.update(elItem, { x: inst.x, y: inst.y, w: inst.w, h: inst.h });
      }
      grid.batchUpdate(false);
    }
    grid.on('change', (ev, items) => {
      const col = grid.getColumn();
      if (col !== GRID_COLS) { lastCol = col; return; }
      if (lastCol !== GRID_COLS) { lastCol = GRID_COLS; reapplyGeometry(); return; }
      if (!items) return;
      const g = activeGrid();
      for (const n of items) {
        const id = n.id ?? n.el?.dataset.hid;
        const inst = g.find((x) => x.id === id);
        if (inst) { inst.x = n.x; inst.y = n.y; inst.w = n.w; inst.h = n.h; }
      }
      persist();
    });
    // scale to the window: rows track column width so blocks keep their shape
    // on any monitor (fixed 36px rows squash layouts on wide screens and
    // overflow small ones). Same clamp band as the old constant at ~1280.
    function fitCells() {
      const gridEl = $('#hub-grid');
      if (!gridEl || !gridEl.clientWidth || grid.getColumn() !== GRID_COLS) return;
      const cell = Math.max(30, Math.min(52, Math.round((gridEl.clientWidth / GRID_COLS) * 0.68)));
      if (cell !== grid.getCellHeight()) grid.cellHeight(cell);
    }
    fitCells();
    // backstop for expand paths that emit no change event
    let colT = 0;
    window.addEventListener('resize', () => {
      clearTimeout(colT);
      colT = setTimeout(() => {
        if (!grid) return;
        const col = grid.getColumn();
        if (col === GRID_COLS && lastCol !== GRID_COLS) { lastCol = GRID_COLS; reapplyGeometry(); }
        else if (col !== GRID_COLS) lastCol = col;
        fitCells();
      }, 150);
    });
    // iframes eat mouse events mid-drag — disable them while interacting
    grid.on('dragstart resizestart', () => document.body.classList.add('hub-dragging'));
    grid.on('dragstop resizestop', () => document.body.classList.remove('hub-dragging'));

    /* toolbar wiring */
    refreshLayoutSelect();
    $('#hub-layout').addEventListener('change', (e) => switchLayout(e.target.value));

    const editBtn = $('#hub-edit');
    editBtn.addEventListener('click', () => {
      editing = !editing;
      document.body.classList.toggle('editing', editing);
      editBtn.classList.toggle('editing-on', editing);
      editBtn.innerHTML = editing
        ? '<i data-lucide="check"></i><span>Done</span>'
        : '<i data-lucide="pencil"></i><span>Edit</span>';
      icons();
    });
    $('#hub-add').addEventListener('click', openTray);
    $('#hub-pal')?.addEventListener('click', openPalette);
    $('#hub-focus')?.addEventListener('click', () => (focusMode ? exitFocus() : openFocusSearch()));
    $('#hub-empty-add')?.addEventListener('click', () => {
      if (!editing) $('#hub-edit').click();
      openTray();
    });
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) {
      const kbd = $('#hub-pal kbd');
      if (kbd) kbd.textContent = 'Ctrl K';
    }

    const menuBtn = $('#hub-more');
    const menu = $('#hub-menu');
    menuBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.classList.remove('open'); });

    menu.addEventListener('click', (e) => {
      const act = e.target.closest('[data-menu]')?.dataset.menu;
      if (!act) return;
      menu.classList.remove('open');
      if (act === 'new') {
        const name = (prompt('Name for the new layout:', 'My layout') ?? '').trim().slice(0, 40);
        if (!name) return;
        if (store.layouts[name]) { toast('a layout with that name already exists'); return; }
        store.layouts[name] = defaultLayout('DeFi');
        switchLayout(name);
        refreshLayoutSelect();
      } else if (act === 'dup') {
        let name = `${store.active} copy`;
        while (store.layouts[name]) name += ' 2';
        store.layouts[name] = JSON.parse(JSON.stringify(store.layouts[store.active]));
        store.layouts[name].grid.forEach((i) => { i.id = uid(); });
        switchLayout(name);
        refreshLayoutSelect();
        toast(`duplicated as "${name}"`);
      } else if (act === 'rename') {
        const name = (prompt('Rename layout:', store.active) ?? '').trim().slice(0, 40);
        if (!name || name === store.active) return;
        if (store.layouts[name]) { toast('a layout with that name already exists'); return; }
        store.layouts[name] = store.layouts[store.active];
        delete store.layouts[store.active];
        store.active = name;
        persist();
        refreshLayoutSelect();
      } else if (act === 'delete') {
        if (Object.keys(store.layouts).length <= 1) { toast("can't delete the last layout"); return; }
        if (!confirm(`Delete layout "${store.active}"?`)) return;
        delete store.layouts[store.active];
        store.active = Object.keys(store.layouts)[0];
        persist();
        refreshLayoutSelect();
        renderLayout();
      } else if (act === 'reset') {
        if (!confirm(`Reset "${store.active}" to its default?`)) return;
        store.layouts[store.active] = defaultLayout(PRESETS[store.active] ? store.active : 'DeFi');
        persist();
        renderLayout();
      } else if (act === 'export') {
        exportLayout();
      }
    });
    $('#hub-import').addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) importLayout(f);
      e.target.value = '';
    });

    startNavPrice();
    // route straight into a section when the URL names one — rendering the
    // dashboard first would mount every TV iframe twice
    const bootSeg = location.hash.replace(/^#\/?/, '').split('/')[0].toLowerCase();
    if (SECTION_META[bootSeg]) applyRoute();
    else { navSync(); renderLayout(); }
    window.addEventListener('hashchange', applyRoute);
    startTitleTicker();
    startShortcuts();
    icons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
