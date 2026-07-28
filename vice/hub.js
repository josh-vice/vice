/* Vice Hub — customizable live market dashboard + Velo-style section boards. v2.14.0
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
  let hlTickAt = 0; // last successful feed tick — the bar dot keys honesty off it
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
        hlTickAt = Date.now();
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

  // per-wallet perp state, cached 3m — the Scanner's enrichment and the HL
  // Positioning widget read the SAME books instead of double-hitting the API
  const hlWalletState = (() => {
    const cache = new Map(); // addr -> { t, p }
    return (addr) => {
      const hit = cache.get(addr);
      if (hit && Date.now() - hit.t < 180_000) return hit.p;
      const p = hlInfo({ type: 'clearinghouseState', user: addr });
      cache.set(addr, { t: Date.now(), p });
      p.catch(() => cache.delete(addr));
      return p;
    };
  })();
  // top trader addresses (month pnl board), memoized 5m
  let hlTopMemo = { t: 0, p: null };
  const hlTopTraders = () => {
    if (hlTopMemo.p && Date.now() - hlTopMemo.t < 300_000) return hlTopMemo.p;
    const p = getJson('/api/vice-hlboard?window=month&sort=pnl&limit=100', 45_000)
      .then((j) => (j?.rows ?? []).map((r) => r.a).filter(Boolean));
    p.catch(() => { if (hlTopMemo.p === p) hlTopMemo = { t: 0, p: null }; });
    hlTopMemo = { t: Date.now(), p };
    return p;
  };

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
  // library, init, poll, resize, surface errors in the vchart error strip.
  // A shimmer skeleton holds the space until the first draw settles, and every
  // successful draw stamps freshness for the header staleness dot.
  function chartMount(body, draw, pollMs) {
    const box = el('div', 'vchart');
    const err = el('div', 'vchart-err');
    let skel = el('div', 'hw-skel', '<span></span><span></span><span></span><span></span>');
    body.append(box, skel, err);
    const hw = body.closest('.hw, .vpanel');
    if (hw && pollMs) hw.dataset.staleAfter = String(Math.max(pollMs * 2.5, 90_000));
    let chart = null;
    let timer = null;
    let ro = null;
    let dead = false;
    let tries = 0;
    const settle = () => { skel?.remove(); skel = null; };
    const run = async () => {
      try {
        await draw(chart);
        if (!dead) {
          settle();
          err.classList.remove('on');
          if (hw) { hw.dataset.freshAt = String(Date.now()); hw.classList.remove('hw-stale'); }
        }
      } catch (e) {
        if (!dead) { settle(); err.textContent = e.message; err.classList.add('on'); }
      }
    };
    const start = () => {
      if (dead) return;
      if (!window.echarts) {
        if (++tries > 75) { settle(); note(body, 'alert-triangle', "the chart engine didn't load — refresh the page"); return; }
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
    // TV iframes paint white for a beat on slow loads — hold them invisible
    // until their document loads (belt: a 4s failsafe reveals no matter what)
    const reveal = () => wrap.classList.add('tv-ready');
    const mo = new MutationObserver(() => {
      const frame = wrap.querySelector('iframe');
      if (!frame) return;
      mo.disconnect();
      frame.addEventListener('load', reveal, { once: true });
    });
    mo.observe(container, { childList: true, subtree: true });
    const failsafe = setTimeout(() => { mo.disconnect(); reveal(); }, 4000);
    return { destroy() { clearTimeout(failsafe); mo.disconnect(); wrap.remove(); } };
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
  // on-widget quick controls (audit C1): daily flips live on the widget FACE,
  // the settings modal keeps identity/configuration. A manifest declares
  //   controls: [{ key, opts: [[value, label], …], set?, is? }]
  // set(merged, v) → settings patch (default {[key]: v}); is(merged, v) → active
  const CTL = (key, opts) => ({ key, opts });
  // the vc command's timeframe token (mirrors demo.js TF table)
  const VC_TF = /^(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d|3d|1w|1mo)$/i;


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
    titleSync();
    // the chart page follows the new symbol in place — a full renderSection()
    // teardown refetched everything and dropped indicator/zoom state
    if (currentSection === 'chart') {
      const pm = pageMounts.find((m) => m.type === 'vChartPro');
      if (pm?.handle?.setSymbol) { pm.settings.symbol = linkedSym; pm.handle.setSymbol(linkedSym); }
      else renderSection();
      return;
    }
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
    // titles diverge early — "1m Average Retur…" twice in a truncated card
    // told nobody which was which
    title: byHour ? 'Avg Return by Hour (1m)' : 'Avg Return by Day (1m)',
    icon: byHour ? 'clock-4' : 'calendar', cat: 'Futures', vice: true,
    label: () => 'UTC',
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

  // Custom Metric window ceilings (mirror api/vice-coinalyze maxDays)
  const VMETRIC_MAXD = { price: 30, oi: 30, funding: 14, cvd: 7, vol: 30, liqs: 30 };

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
      controls: [CTL('interval', [['5', '5m'], ['15', '15m'], ['60', '1h'], ['240', '4h'], ['D', '1D'], ['W', '1W']])],
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
      controls: [CTL('range', [['1D', '1D'], ['1M', '1M'], ['3M', '3M'], ['12M', '1Y'], ['ALL', 'ALL']])],
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
      title: 'Ticker Tape', icon: 'move-horizontal', cat: 'Charts', chromeless: true,
      w: 24, h: 1, minW: 8, minH: 1, maxH: 1, // a marquee has ONE height
      settings: [
        F.area('symbols', 'Symbols (comma-separated)',
          'BITSTAMP:BTCUSD, BITSTAMP:ETHUSD, CRYPTO:SOLUSD, CRYPTO:XRPUSD, CRYPTO:BNBUSD, CRYPTO:DOGEUSD, CRYPTO:ADAUSD, COINBASE:HYPEUSD'),
        F.tog('logos', 'Show symbol logos', true),
      ],
      mount(body, s) {
        const symbols = s.symbols.split(',').map((x) => x.trim()).filter(Boolean)
          .map((proName) => ({ proName, title: proName.split(':').pop() }));
        // regular = the one-line marquee (44px band, prices inline) — adaptive
        // picked the 72px stacked variant, which clipped inside short cells
        return tvEmbed(body, 'ticker-tape', { symbols, showSymbolLogo: s.logos, displayMode: 'regular' }, true);
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
      controls: [CTL('color', [['24h_close_change|5', '24h'], ['Perf.W', '1W'], ['Perf.1M', '1M']])],
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
      controls: [CTL('color', [['change', '1D'], ['Perf.W', '1W'], ['Perf.1M', '1M']])],
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
      controls: [CTL('color', [['change', '1D'], ['Perf.W', '1W'], ['Perf.1M', '1M']])],
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
        // 7 currencies — 8 clipped the last column at the preset width
        return tvEmbed(body, 'forex-heat-map', {
          currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD'],
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
          // raw index tickers (SP:SPX, DJ:DJI…) return "no data" in this
          // embed — same gotcha as the tape's TVC:DXY; use CFD proxies
          indices: { title: 'Indices', symbols: [
            { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' }, { s: 'FOREXCOM:NSXUSD', d: 'Nasdaq 100' },
            { s: 'FOREXCOM:DJI', d: 'Dow 30' }, { s: 'CAPITALCOM:VIX', d: 'VIX' }, { s: 'CAPITALCOM:DXY', d: 'Dollar index' } ] },
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

    /* — News & data — */
    // ONE news widget (audit C3): native renderer over every feed — the old
    // tvNews (TV iframe timeline) + vNews (RSS list) pair migrates onto its
    // source tabs via migrateInst()
    news: {
      title: 'News', icon: 'newspaper', cat: 'News & data', vice: true,
      w: 6, h: 10, minW: 4, minH: 5,
      settings: [
        F.sel('tab', 'Source', 'all', [['all', 'All sources'], ['rss', 'Crypto RSS'], ['tv', 'TradingView wire'], ['symbol', 'Symbol stories']]),
        F.sel('market', 'TradingView market', 'crypto', [['crypto', 'Crypto'], ['stock', 'TradFi (stocks)'], ['index', 'Indices'], ['forex', 'Forex']]),
        F.text('symbol', 'Symbol (for Symbol stories)', '', 'A TradingView symbol, e.g. CRYPTO:SOLUSD or NASDAQ:AAPL'),
        F.num('max', 'Max headlines', 30, 5, 50),
        F.sel('density', 'Density', 'comfortable', [['comfortable', 'Comfortable'], ['compact', 'Compact']]),
        { ...LINKED(), def: false },
      ],
      link: (s, sym) => ({ symbol: tvSymbolFor(sym), tab: 'symbol' }),
      // no label: the source tabs on the face already carry that state — a
      // header suffix duplicated them and orphaned into "· all so…" when tight
      mount(body, s, inst) {
        const READ_KEY = 'viceHub.newsRead';
        const read = (() => { try { return new Set(JSON.parse(localStorage.getItem(READ_KEY)) ?? []); } catch { return new Set(); } })();
        const saveRead = () => { try { localStorage.setItem(READ_KEY, JSON.stringify([...read].slice(-400))); } catch { /* fine */ } };
        const col = el('div', `vcol vnews2${s.density === 'compact' ? ' compact' : ''}`);
        const tabsEl = el('div', 'vtabs');
        const scroll = el('div', 'vw-scroll vnews');
        col.append(tabsEl, scroll);
        body.appendChild(col);
        const TABS = [['all', 'All'], ['rss', 'RSS'], ['tv', 'TV'], ['symbol', 'Symbol']];
        let tab = TABS.some(([k]) => k === s.tab) ? s.tab : 'all';
        const symNow = () => (inst.settings.symbol ?? s.symbol ?? '').trim();
        const paintTabs = () => {
          tabsEl.innerHTML = TABS.map(([k, lab]) =>
            `<button class="vtab${k === tab ? ' on' : ''}" data-t="${k}">${k === 'symbol' && symNow() ? esc(symNow().split(':').pop()) : lab}</button>`).join('');
        };
        const cache = { rss: null, tv: null, symbol: null };
        let timer = null;
        let dead = false;
        const fetchers = {
          rss: () => getJson('/api/vice-news', 9000).then((j) => (Array.isArray(j) ? j : [])),
          tv: () => getJson(`/api/vice-headlines?market=${encodeURIComponent(s.market)}&full=1`, 9000).then((j) => j?.items ?? []),
          symbol: () => (symNow()
            ? getJson(`/api/vice-headlines?symbol=${encodeURIComponent(symNow())}&full=1`, 9000).then((j) => j?.items ?? [])
            : Promise.resolve([])),
        };
        const paint = () => {
          const pool = tab === 'all' ? [...(cache.rss ?? []), ...(cache.tv ?? [])] : (cache[tab] ?? []);
          const seen = new Set();
          const list = pool.filter((it) => {
            const k = (it.t ?? '').toLowerCase();
            // hostile feed hardening: only real web links render as links
            if (!k || seen.has(k) || !/^https?:\/\//i.test(it.u ?? '')) return false;
            seen.add(k);
            return true;
          }).sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0)).slice(0, s.max);
          scroll.innerHTML = list.map((it) =>
            `<a href="${esc(it.u)}" target="_blank" rel="noopener noreferrer" class="${read.has(it.u) ? 'seen' : ''}" data-u="${esc(it.u)}">${esc(it.t)}` +
            `<span class="meta">${esc(it.src ?? '')}${it.ts ? ` · ${ago(it.ts)}` : ''}</span></a>`).join('');
          if (!list.length) {
            scroll.innerHTML = '';
            note(scroll, tab === 'symbol' && !symNow() ? 'crosshair' : 'rss',
              tab === 'symbol' && !symNow()
                ? 'set a symbol in settings — or turn on “follow linked symbol” and click any ticker row'
                : 'no headlines right now — the feeds refresh every few minutes');
          }
        };
        const load = async (force) => {
          const wants = tab === 'all' ? ['rss', 'tv'] : [tab];
          await Promise.allSettled(wants.map(async (w) => {
            if (!force && cache[w]) return;
            try { cache[w] = await fetchers[w](); }
            catch { cache[w] ??= []; }
          }));
          if (!dead) paint();
        };
        tabsEl.addEventListener('click', (ev) => {
          const b = ev.target.closest('.vtab');
          if (!b) return;
          tab = b.dataset.t;
          inst.settings.tab = tab;
          persist();
          paintTabs();
          paint();
          load();
        });
        scroll.addEventListener('click', (ev) => {
          const a = ev.target.closest('a[data-u]');
          if (a) { read.add(a.dataset.u); saveRead(); a.classList.add('seen'); }
        });
        paintTabs();
        paint();
        load();
        timer = setInterval(() => load(true), 300_000);
        return { destroy() { dead = true; clearInterval(timer); }, refresh: () => load(true) };
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
      // shared-list edits flow back to localStorage when settings are saved —
      // and every other mounted watchlist follows (the help text promises it)
      onSettingsSaved(s, inst) {
        if (s.shared) {
          const syms = s.symbols.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
          localStorage.setItem(LS_WATCH, JSON.stringify(syms));
          for (const [oid, orec] of live) {
            if (orec.inst !== inst && orec.inst.type === 'vWatch') remount(oid);
          }
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
        return { destroy() {
          clearTimeout(t);
          // flush the debounce window — teardown must never eat keystrokes
          if (inst.settings.text !== ta.value) { inst.settings.text = ta.value; persist(); }
        } };
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
          '<input class="tgt" placeholder="70k or +5%" inputmode="decimal" aria-label="target" />' +
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
          // the empty note must flow inline — the absolute .hw-note blanketed
          // the fired-history list below it and ate its clear button
          scroll.innerHTML = (active || '<div class="hw-note hw-note-flow">no alerts — add one above.<br/>notification + sound when crossed; targets take 70k or +5% too.</div>') + hist;
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
            // Android Chrome throws from the bare constructor even when
            // granted — a throw here would wedge the filter and re-fire forever
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`${a.sym} crossed $${fmtPx(a.target)}`, { body: `now $${fmtPx(px)} — Vice Hub` });
              }
            } catch { /* the beep + row still deliver it */ }
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
    vChartPro: {
      title: 'Vice Chart Pro', icon: 'candlestick-chart', cat: 'Charts', vice: true,
      w: 16, h: 13, minW: 8, minH: 8,
      settings: [
        F.text('symbol', 'Symbol', 'BTC', 'Hyperliquid perp ticker — BTC, ETH, SOL, XRP, HYPE…'),
        LINKED(),
      ],
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => s.symbol.toUpperCase(),
      mount(body, s) {
        // the engine lives in vchart.js (loaded on the hub page); candles +
        // indicator panes + the order-book depth heatmap, all ours
        let handle = null;
        let dead = false;
        let tries = 0;
        const start = () => {
          if (dead) return;
          if (!window.VChartPro || !window.echarts) {
            if (++tries > 75) { note(body, 'alert-triangle', "the chart engine didn't load — refresh the page"); return; }
            setTimeout(start, 200);
            return;
          }
          handle = window.VChartPro.mount(body, { symbol: s.symbol.trim().toUpperCase() });
        };
        start();
        return {
          destroy() { dead = true; handle?.destroy?.(); },
          refresh() { handle?.refresh?.(); },
          setSymbol(sym2) { handle?.setSymbol?.(sym2); },
        };
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
      // face pills swap the command's timeframe token in place (insert after
      // the symbol when the command never named one)
      controls: [{
        key: 'command',
        opts: [['15m', '15m'], ['1h', '1h'], ['4h', '4h'], ['1d', '1D']],
        set: (s, v) => {
          const parts = s.command.trim().split(/\s+/);
          const i = parts.findIndex((p, idx) => idx > 0 && VC_TF.test(p));
          if (i > 0) parts[i] = v; else parts.splice(1, 0, v);
          return { command: parts.join(' ') };
        },
        is: (s, v) => s.command.trim().split(/\s+/).some((p, idx) => idx > 0 && p.toLowerCase() === v),
      }],
      link: (s, sym) => ({ command: s.command.replace(/^\s*\S+/, sym.toLowerCase()) }),
      label: (s) => s.command,
      mount(body, s) {
        const box = el('div', 'vchart');
        const err = el('div', 'vchart-err');
        let skel = el('div', 'hw-skel', '<span></span><span></span><span></span><span></span>');
        body.append(box, skel, err);
        const settle = () => { skel?.remove(); skel = null; };
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
              settle();
              chart.setOption(option, { notMerge: true });
              err.classList.remove('on');
            }
          } catch (e) {
            if (!dead) { settle(); err.textContent = e.message; err.classList.add('on'); }
          }
        };
        const start = () => {
          if (dead) return;
          if (!window.echarts || !window.ViceChartEngine) {
            if (++tries > 75) { settle(); note(body, 'alert-triangle', "the chart engine didn't load — refresh the page"); return; }
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
          if (!s.only && !syms.length) {
            // a bare header row over nothing read as broken — say why it's empty
            scroll.innerHTML = '<div class="hw-note hw-note-flow">watchlist is empty — add symbols in a Vice Watchlist block, or switch Rows to “Top by open interest” in settings</div>';
            return;
          }
          // short venue codes — the full names clipped the last column at the
          // preset width ("DERIBIT" → "DERIE"); codes match every futures legend
          scroll.innerHTML =
            '<div class="vrow vrow-h"><span class="vic-slot"></span><span class="sym">coin</span><span class="name"></span>' +
            '<span class="chg fr cbin" title="Binance">BIN</span><span class="chg fr cokx" title="OKX">OKX</span>' +
            '<span class="chg fr cbyb" title="Bybit">BYB</span><span class="chg fr" title="Hyperliquid">HL</span>' +
            '<span class="chg fr cder" title="Deribit">DER</span></div>' +
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
              `<span class="bar"><span style="transform:scaleX(${(into / ms).toFixed(4)})"></span></span></div>`;
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
      controls: [CTL('range', [['1', '±1%'], ['2', '±2%'], ['5', '±5%']])],
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => s.symbol.toUpperCase(),
      mount(body, s) {
        const box = el('div', 'vliq');
        let skel = el('div', 'hw-skel', '<span></span><span></span><span></span><span></span>');
        body.append(box, skel);
        const settle = () => { skel?.remove(); skel = null; };
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
        let noteEl = null; // ONE error note, cleared on recovery — they used to stack every poll
        const load = async () => {
          try {
            const book = await fetchBook();
            if (!dead) { settle(); noteEl?.remove(); noteEl = null; paint(book); }
          } catch (e) {
            if (!dead && !chart?.getOption()?.series?.length) {
              settle();
              if (noteEl) noteEl.querySelector('span').textContent = e.message;
              else noteEl = note(body, 'wifi-off', esc(e.message));
            }
          }
        };
        const start = () => {
          if (dead) return;
          if (!window.echarts) {
            if (++tries > 75) { settle(); note(body, 'alert-triangle', "the chart engine didn't load — refresh the page"); return; }
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
      controls: [CTL('metric', [['24h', '24h'], ['7d', '1W']])],
      label: (s) => `top ${s.count} · ${s.metric}`,
      mount(body, s) {
        const box = el('div', 'vheat');
        let skel = el('div', 'hw-skel', '<span></span><span></span><span></span><span></span>');
        body.append(box, skel);
        const settle = () => { skel?.remove(); skel = null; };
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
        let noteEl = null; // single reusable error note (same fix as vLiqMap)
        const load = async () => {
          try {
            const rows = await fetchMarkets();
            if (!dead) { settle(); noteEl?.remove(); noteEl = null; paint(rows); }
          } catch (e) {
            if (!dead && !chart?.getOption()?.series?.length) {
              settle();
              if (noteEl) noteEl.querySelector('span').textContent = `heatmap feed unreachable — ${e.message}`;
              else noteEl = note(body, 'wifi-off', `heatmap feed unreachable — ${esc(e.message)}`);
            }
          }
        };
        const start = () => {
          if (dead) return;
          if (!window.echarts) {
            if (++tries > 75) { settle(); note(body, 'alert-triangle', "the chart engine didn't load — refresh the page"); return; }
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
      controls: [CTL('days', [['3', '3d'], ['7', '1W'], ['14', '2W']])],
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
      controls: [CTL('window', [['4d', '4d'], ['1m', '1M']])],
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
          // the aggregator serves aligned hourly stamps, safe to stack; the
          // direct-venue fallback mixes cadences — stacked-by-index it drew
          // wrong totals, so that path renders honest overlapping lines
          const aligned = series.length > 0;
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
              name, type: 'line', data: pts, showSymbol: false, stack: aligned ? 'oi' : undefined,
              lineStyle: { width: aligned ? 1 : 1.4, color: VENUE_C[name] }, itemStyle: { color: VENUE_C[name] },
              areaStyle: { color: VENUE_C[name], opacity: aligned ? 0.55 : 0.18 },
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
      controls: [CTL('days', [['7', '1W'], ['14', '2W'], ['30', '1M']])],
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
      controls: [CTL('days', [['3', '3d'], ['7', '1W'], ['30', '1M']])],
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
      controls: [CTL('cur', [['BTC', 'BTC'], ['ETH', 'ETH']])],
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
      controls: [CTL('cur', [['BTC', 'BTC'], ['ETH', 'ETH']])],
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
      controls: [CTL('cur', [['BTC', 'BTC'], ['ETH', 'ETH']])],
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
      controls: [CTL('cur', [['BTC', 'BTC'], ['ETH', 'ETH']])],
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
      controls: [CTL('cur', [['BTC', 'BTC'], ['ETH', 'ETH']]), CTL('days', [['3', '3d'], ['7', '1W'], ['30', '1M']])],
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
                // axisValue is the category STRING — Date needs the number back
                return `<b>${new Date(Number(p.axisValue)).toUTCString().slice(5, 22)}</b><br/>O ${o.toFixed(2)} H ${h.toFixed(2)} L ${l.toFixed(2)} C ${c.toFixed(2)}`;
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
      controls: [CTL('cur', [['BTC', 'BTC'], ['ETH', 'ETH']])],
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
      controls: [CTL('cur', [['BTC', 'BTC'], ['ETH', 'ETH']])],
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
      controls: [CTL('cur', [['BTC', 'BTC'], ['ETH', 'ETH']])],
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
      controls: [CTL('cur', [['BTC', 'BTC'], ['ETH', 'ETH']])],
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
      title: 'Screener', icon: 'table-2', cat: 'Vice', vice: true,
      w: 24, h: 10, minW: 8, minH: 5,
      settings: [
        F.sel('tab', 'Universe', 'all', [['all', 'All'], ['crypto', 'Crypto'], ['tradfi', 'TradFi']]),
        F.num('count', 'Crypto rows', 100, 20, 200),
      ],
      label: (s) => (s.tab === 'all' ? 'crypto + TradFi' : s.tab),
      // Velo-style screener on TradingView scanner data: coin composite by
      // default, per-exchange pairs when filtered, TradFi quote book, TV
      // logos, favorites, watchlist filter, search, sortable columns, and a
      // News mode that swaps the table for the aggregated feed.
      mount(body, s, inst) {
        const FAVS_KEY = 'viceHub.scrFavs';
        // the venues TradingView's crypto scanner actually indexes (no HL there)
        const EXCHANGES = [['', 'All Exchanges'], ['BINANCE', 'Binance'], ['BYBIT', 'Bybit'], ['OKX', 'OKX'], ['COINBASE', 'Coinbase'], ['KRAKEN', 'Kraken'], ['KUCOIN', 'KuCoin'], ['BITGET', 'Bitget'], ['HTX', 'HTX']];
        // honest refresh choices — "Auto" was a duplicate of 15s in disguise
        const AUTO = [['15000', '15s'], ['5000', '5s'], ['60000', '60s']];
        const readFavs = () => { try { return new Set(JSON.parse(localStorage.getItem(FAVS_KEY)) ?? []); } catch { return new Set(); } };
        const favs = readFavs();
        const saveFavs = () => { try { localStorage.setItem(FAVS_KEY, JSON.stringify([...favs])); } catch { /* fine */ } };
        const readWatch = () => { try { return new Set(JSON.parse(localStorage.getItem(LS_WATCH)) ?? []); } catch { return new Set(); } };

        const ui = { favOnly: false, news: false, ms: 15000, exch: '', watch: false, tab: s.tab, q: '', sortKey: 'vol', sortDir: -1 };
        let cryptoRows = [];
        let tradfiRows = [];
        let newsItems = [];
        let timer = null;
        let dead = false;

        const wrap = el('div', 'vscr2');
        body.appendChild(wrap);
        const barEl = el('div', 'vscr2-bar');
        const mkChk = (label, key) => {
          const l = el('label', 'vscr2-chk', `<input type="checkbox"><span>${label}</span>`);
          l.querySelector('input').addEventListener('change', (ev) => { ui[key] = ev.target.checked; if (key === 'news' && ev.target.checked && !newsItems.length) loadNews(); paint(); });
          return l;
        };
        const mkSel = (opts, key, onchange) => {
          const sel = document.createElement('select');
          sel.className = 'vscr2-sel';
          for (const [v, t] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); }
          sel.addEventListener('change', () => onchange(sel.value));
          return sel;
        };
        const autoSel = mkSel(AUTO, 'ms', (v) => { ui.ms = Number(v); schedule(); });
        const exchSel = mkSel(EXCHANGES, 'exch', (v) => { ui.exch = v; cryptoRows = []; paint(); loadCrypto(); });
        const watchSel = mkSel([['', 'No Watchlist'], ['1', 'My Watchlist']], 'watch', (v) => { ui.watch = !!v; paint(); });
        const tabs = el('div', 'vscr2-tabs');
        for (const t of ['all', 'crypto', 'tradfi']) {
          const b = el('button', `vscr2-tab${ui.tab === t ? ' on' : ''}`, t === 'all' ? 'All' : t === 'crypto' ? 'Crypto' : 'TradFi');
          b.addEventListener('click', () => {
            ui.tab = t;
            if (inst) { inst.settings.tab = t; persist(); } // the face tab IS the setting — survive reloads
            tabs.querySelectorAll('.vscr2-tab').forEach((x) => x.classList.toggle('on', x === b));
            paint();
          });
          tabs.appendChild(b);
        }
        barEl.append(mkChk('Favorites only', 'favOnly'), mkChk('News', 'news'), autoSel, exchSel, watchSel, tabs);
        const searchEl = el('div', 'vscr2-search', '<i data-lucide="search"></i>');
        const inp = document.createElement('input');
        inp.placeholder = 'Search';
        inp.addEventListener('input', () => { ui.q = inp.value.trim().toUpperCase(); paint(); });
        searchEl.appendChild(inp);
        const scroll = el('div', 'vw-scroll vscr2-scroll');
        wrap.append(barEl, searchEl, scroll);
        icons();

        const tvIcon = (logoid) => (logoid
          ? `<img class="vscr2-logo" src="https://s3-symbol-logo.tradingview.com/${esc(logoid)}.svg" alt="" loading="lazy">`
          : '<i data-lucide="landmark"></i>');
        const scan = (path, payload) => fetch(`https://scanner.tradingview.com/${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' }, // simple request — their preflight rejects JSON
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(12000),
        }).then((r) => r.json());

        async function loadCrypto() {
          try {
            if (!ui.exch) {
              const j = await scan('coin/scan', {
                columns: ['base_currency', 'base_currency_desc', 'base_currency_logoid', 'close', '24h_close_change|5', '24h_vol_cmc'],
                sort: { sortBy: '24h_vol_cmc', sortOrder: 'desc' },
                range: [0, Number(s.count)],
              });
              cryptoRows = (j?.data ?? []).map((d) => ({
                kind: 'crypto', sym: d.d[0], name: d.d[1] ?? '', logoid: d.d[2],
                px: d.d[3], chg: d.d[4], vol: d.d[5],
              })).filter((r) => r.sym && r.px != null);
            } else {
              // pair-level: 24h_vol|5 is the venue pair's 24h USD turnover;
              // keep each coin's deepest USD/USDT/USDC market
              const j = await scan('crypto/scan', {
                filter: [{ left: 'exchange', operation: 'equal', right: ui.exch }],
                columns: ['base_currency', 'base_currency_desc', 'base_currency_logoid', 'close', 'change', '24h_vol|5'],
                range: [0, 3000],
              });
              const best = new Map();
              for (const d of j?.data ?? []) {
                if (!/USDT?C?(\.P)?$/.test(d.s.split(':')[1] ?? '')) continue;
                const vol = d.d[5] ?? 0;
                const cur = best.get(d.d[0]);
                if (!cur || vol > cur.vol) best.set(d.d[0], {
                  kind: 'crypto', sym: d.d[0], name: d.d[1] ?? '', logoid: d.d[2],
                  px: d.d[3], chg: d.d[4], vol,
                });
              }
              cryptoRows = [...best.values()].sort((a, b) => (b.vol ?? 0) - (a.vol ?? 0)).slice(0, Number(s.count));
            }
          } catch { /* scanner unreachable — stale rows stay */ }
          if (!dead) paint();
        }
        async function loadTradfi() {
          try {
            const j = await scan('global/scan', {
              symbols: { tickers: TRADFI_BOOK.map((e) => e[1]) },
              columns: ['close', 'change', 'logoid', 'description'],
            });
            tradfiRows = (j?.data ?? []).map((d) => {
              const entry = TRADFI_BOOK.find((e) => e[1] === d.s);
              return entry ? {
                kind: 'tradfi', sym: entry[0], name: d.d[3] ?? entry[1], logoid: d.d[2],
                tv: entry[1], px: d.d[0], chg: d.d[1], vol: null,
              } : null;
            }).filter(Boolean);
          } catch { /* stale rows stay */ }
          if (!dead) paint();
        }
        const loadNews = () => getJson('/api/vice-news', 9000).then((j) => {
          // proxy shape: [{ t: title, u: url, src, ts }] — web links only
          newsItems = (Array.isArray(j) ? j : []).filter((n) => /^https?:\/\//i.test(n?.u ?? '')).slice(0, 40);
          if (!dead) paint();
        }).catch(() => { /* local preview — news needs the proxy */ });

        function paint() {
          if (ui.news) {
            scroll.innerHTML = newsItems.length
              ? newsItems.map((n) =>
                `<a class="vscr2-news" href="${esc(n.u)}" target="_blank" rel="noopener">` +
                `<span class="vscr2-nsrc">${esc(n.src ?? '')}</span><span class="vscr2-nt">${esc(n.t)}</span>` +
                `<span class="vscr2-nago">${ago(n.ts)}</span></a>`).join('')
              : '<div class="vscr2-none">news feed needs the site proxy — works on vicesuite.com</div>';
            return;
          }
          const watch = ui.watch ? readWatch() : null;
          let rows = [];
          if (ui.tab !== 'tradfi') rows = rows.concat(cryptoRows);
          if (ui.tab !== 'crypto') rows = rows.concat(tradfiRows);
          if (watch) rows = rows.filter((r) => r.kind !== 'crypto' || watch.has(r.sym));
          if (ui.favOnly) rows = rows.filter((r) => favs.has(r.sym));
          if (ui.q) rows = rows.filter((r) => r.sym.toUpperCase().includes(ui.q) || r.name.toUpperCase().includes(ui.q));
          const dir = ui.sortDir;
          const k = ui.sortKey;
          rows.sort((a, b) => {
            const av = a[k];
            const bv = b[k];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            return av > bv ? dir : av < bv ? -dir : 0;
          });
          const arrow = (key) => (ui.sortKey === key ? (ui.sortDir === -1 ? ' ↓' : ' ↑') : '');
          scroll.innerHTML =
            `<div class="vscr2-r vscr2-h"><span class="vscr2-star"></span><span class="vscr2-sym">Symbol</span>` +
            `<button class="vscr2-c fr" data-k="px" type="button">Price${arrow('px')}</button>` +
            `<button class="vscr2-c fr" data-k="chg" type="button">24h Chg${arrow('chg')}</button>` +
            `<button class="vscr2-c fr cvol" data-k="vol" type="button">24h Volume${arrow('vol')}</button></div>` +
            (rows.map((r) =>
              `<div class="vscr2-r clickable" data-sym="${esc(r.sym)}" data-kind="${r.kind}">` +
              `<button class="vscr2-star${favs.has(r.sym) ? ' on' : ''}" data-fav="${esc(r.sym)}" title="Favorite">★</button>` +
              `<span class="vscr2-sym">${tvIcon(r.logoid)}<b>${esc(r.sym)}</b><span class="vscr2-name">${esc(r.name)}</span></span>` +
              `<span class="vscr2-c fr">$${fmtPx(r.px)}</span>` +
              `<span class="vscr2-c fr ${r.chg >= 0 ? 'up' : 'down'}">${fmtChg(r.chg)}</span>` +
              `<span class="vscr2-c fr cvol">${r.vol == null ? '—' : `$${fmtCompact(r.vol)}`}</span></div>`).join('')
            || '<div class="vscr2-none">nothing matches</div>');
          icons();
        }
        scroll.addEventListener('click', (ev) => {
          const fav = ev.target.closest('[data-fav]');
          if (fav) {
            const symK = fav.dataset.fav;
            if (favs.has(symK)) favs.delete(symK); else favs.add(symK);
            saveFavs();
            paint();
            return;
          }
          const th = ev.target.closest('.vscr2-c[data-k]');
          if (th) {
            const k = th.dataset.k;
            if (ui.sortKey === k) ui.sortDir = -ui.sortDir;
            else { ui.sortKey = k; ui.sortDir = -1; }
            paint();
            return;
          }
          const r = ev.target.closest('.vscr2-r.clickable');
          if (r?.dataset.sym) linkSymbol(r.dataset.sym);
        });
        let newsAt = 0;
        const loadAll = () => {
          loadCrypto(); loadTradfi();
          // news mode must not ossify — refresh on the edge-cache cadence
          if (ui.news && Date.now() - newsAt > 120_000) { newsAt = Date.now(); loadNews(); }
        };
        const schedule = () => { clearInterval(timer); timer = setInterval(loadAll, ui.ms); };
        loadAll();
        schedule();
        return { destroy() { dead = true; clearInterval(timer); } };
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
    vPositioning: {
      // the Scanner's crowd, distilled to one symbol: how the top-100 HL
      // books are leaning, from where, and where they get liquidated
      title: 'HL Positioning', icon: 'users', cat: 'Futures', vice: true,
      w: 8, h: 8, minW: 4, minH: 5,
      settings: [
        F.text('symbol', 'Symbol', 'BTC', 'Hyperliquid perp ticker'),
        LINKED(),
      ],
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => `${s.symbol.trim().toUpperCase()} · top 100 books`,
      mount(body, s) {
        const SYM = s.symbol.trim().toUpperCase();
        const box = el('div', 'vposn');
        body.appendChild(box);
        let timer = null;
        let dead = false;
        let painted = false;
        // scanning 100 books takes a while — a blank body read as broken
        note(box, 'users', `reading the top-100 Hyperliquid books for ${esc(SYM)}…`);
        const money = (v) => `${v < 0 ? '-' : ''}$${fmtCompact(Math.abs(v))}`;
        const wAvg = (rows, key) => {
          let num = 0;
          let den = 0;
          for (const r of rows) {
            const k = r[key];
            if (!Number.isFinite(k) || k <= 0) continue;
            num += k * r.ntl;
            den += r.ntl;
          }
          return den > 0 ? num / den : null;
        };
        const load = async () => {
          try {
            const addrs = await hlTopTraders();
            if (dead) return;
            const longs = [];
            const shorts = [];
            let scanned = 0;
            for (let i = 0; i < addrs.length && !dead; i += 10) {
              const batch = await Promise.allSettled(addrs.slice(i, i + 10).map((a) => hlWalletState(a)));
              for (let bi = 0; bi < batch.length; bi++) {
                const r = batch[bi];
                if (r.status !== 'fulfilled') continue;
                scanned++;
                for (const ap of r.value?.assetPositions ?? []) {
                  const p = ap.position;
                  if (!p || p.coin !== SYM) continue;
                  const rec = {
                    addr: addrs[i + bi],
                    ntl: Math.abs(Number(p.positionValue) || 0),
                    entry: Number(p.entryPx),
                    liq: Number(p.liquidationPx),
                    upl: Number(p.unrealizedPnl) || 0,
                    lev: Number(p.leverage?.value) || null,
                  };
                  (Number(p.szi) >= 0 ? longs : shorts).push(rec);
                }
              }
            }
            if (dead) return;
            const ln = longs.reduce((a, r) => a + r.ntl, 0);
            const sn = shorts.reduce((a, r) => a + r.ntl, 0);
            const total = ln + sn;
            const n = longs.length + shorts.length;
            if (!n) {
              painted = true;
              box.innerHTML = '';
              note(box, 'users', `none of the top ${scanned} HL traders holds a ${esc(SYM)} perp right now`);
              return;
            }
            painted = true;
            const shortPct = Math.round((sn / total) * 100);
            const mark = hlFeed.snap()?.[SYM]?.px ?? null;
            // distance from mark — beyond ±150% it's noise, not information
            const dist = (px) => {
              if (!mark || !px) return '';
              const d = ((px - mark) / mark) * 100;
              return Math.abs(d) > 150 ? '' : ` (${d >= 0 ? '+' : ''}${d.toFixed(1)}%)`;
            };
            const upl = [...longs, ...shorts].reduce((a, r) => a + r.upl, 0);
            const lead = shortPct >= 50
              ? `<em class="down">${shortPct}% short</em>`
              : `<em class="up">${100 - shortPct}% long</em>`;
            const avgS = wAvg(shorts, 'entry');
            const avgL = wAvg(longs, 'entry');
            // cross-margin liq prices sit absurdly far out and one whale book
            // would own the average — only near-mark liqs carry information
            const nearLiq = (rows) => (mark
              ? rows.filter((r) => Number.isFinite(r.liq) && r.liq > 0 && Math.abs(r.liq - mark) / mark <= 1.5)
              : rows);
            const liqS = wAvg(nearLiq(shorts), 'liq');
            const liqL = wAvg(nearLiq(longs), 'liq');
            const stat = (label, val) => `<span><label>${label}</label><b>${val}</b></span>`;
            const top = [...longs, ...shorts].sort((a, b) => b.ntl - a.ntl).slice(0, 4);
            box.innerHTML =
              `<div class="vposn-lead">${n} of the top ${scanned} are in ${esc(SYM)} — ${lead} by notional</div>` +
              `<div class="vposn-meter" role="img" aria-label="${100 - shortPct}% long, ${shortPct}% short">` +
              `<span class="l" style="width:${100 - shortPct}%">${longs.length}L</span>` +
              `<span class="s" style="width:${shortPct}%">${shorts.length}S</span></div>` +
              '<div class="vposn-grid">' +
              stat('shorting from', avgS ? `$${fmtPx(avgS)}${dist(avgS)}` : '—') +
              stat('longing from', avgL ? `$${fmtPx(avgL)}${dist(avgL)}` : '—') +
              stat('short liq (avg)', liqS ? `$${fmtPx(liqS)}${dist(liqS)}` : '—') +
              stat('long liq (avg)', liqL ? `$${fmtPx(liqL)}${dist(liqL)}` : '—') +
              stat('open interest here', money(total)) +
              stat('crowd upl', `<i class="${upl >= 0 ? 'up' : 'down'}">${money(upl)}</i>`) +
              '</div>' +
              '<div class="vposn-top">' + top.map((r) => {
                const isL = longs.includes(r);
                return `<button type="button" class="vposn-row" data-w="${esc(r.addr)}" title="Open in the Scanner">` +
                  `<span class="side ${isL ? 'up' : 'down'}">${isL ? 'LONG' : 'SHORT'}${r.lev ? ` ${r.lev}x` : ''}</span>` +
                  `<b>${esc(`${r.addr.slice(0, 6)}…${r.addr.slice(-4)}`)}</b>` +
                  `<span class="num">${money(r.ntl)} @ ${fmtPx(r.entry)}</span>` +
                  `<span class="num ${r.upl >= 0 ? 'up' : 'down'}">${money(r.upl)}</span></button>`;
              }).join('') + '</div>';
          } catch (e) {
            if (!dead && !painted) {
              box.innerHTML = ''; // swap the loading note for the error
              note(box, 'wifi-off', `positioning feed unreachable — ${esc(e.message)}`);
            }
          }
        };
        box.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-w]');
          if (b) location.hash = `#/scanner/${b.dataset.w}`;
        });
        load();
        timer = setInterval(load, 180_000);
        return { destroy() { dead = true; clearInterval(timer); }, refresh: load };
      },
    },
    vFng: {
      // the .fng styles waited in hub.css for exactly this widget
      title: 'Fear & Greed', icon: 'gauge-circle', cat: 'Vice', vice: true,
      w: 5, h: 6, minW: 3, minH: 4,
      settings: [],
      mount(body) {
        const box = el('div', 'fng');
        body.appendChild(box);
        let timer = null;
        let dead = false;
        // gauge geometry (degrees, 180=left … 0=right, SVG y grows down)
        const xy = (deg, r) => [100 + r * Math.cos(deg * Math.PI / 180), 100 - r * Math.sin(deg * Math.PI / 180)];
        const pt = (deg, r) => xy(deg, r).map((n) => n.toFixed(1)).join(' ');
        const seg = (a0, a1, color) =>
          `<path d="M ${pt(a0, 78)} A 78 78 0 0 1 ${pt(a1, 78)}" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="butt"/>`;
        const paint = (rows) => {
          const v = Math.max(0, Math.min(100, Number(rows[0].value)));
          const prev = rows[1];
          const [nx, ny] = xy(180 - v * 1.8, 60);
          const COLORS = ['#ea3943', '#ea8c00', '#f3d42f', '#93d900', '#16c784'];
          box.innerHTML =
            `<svg viewBox="0 0 200 108" role="img" aria-label="Fear and greed ${v}">` +
            COLORS.map((c, i) => seg(180 - i * 36, 180 - (i + 1) * 36 + 1.5, c)).join('') +
            `<line x1="100" y1="100" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#f6f5fb" stroke-width="2.5" stroke-linecap="round"/>` +
            '<circle cx="100" cy="100" r="4.5" fill="#f6f5fb"/>' +
            '</svg>' +
            `<div class="val">${v}</div>` +
            `<div class="lab">${esc(rows[0].value_classification ?? '')}</div>` +
            `<div class="sub">${prev ? `yesterday ${esc(prev.value)} · ${esc((prev.value_classification ?? '').toLowerCase())}` : ''}</div>`;
        };
        let noteEl = null; // single error note in the box — cleared when the dial paints
        const load = async () => {
          try {
            const j = await getJson('https://api.alternative.me/fng/?limit=2', 9000);
            if (!dead && j?.data?.length) { noteEl?.remove(); noteEl = null; paint(j.data); }
          } catch (e) {
            if (!dead && !box.innerHTML) {
              if (noteEl) noteEl.querySelector('span').textContent = `fear & greed feed unreachable — ${e.message}`;
              else noteEl = note(box, 'wifi-off', `fear & greed feed unreachable — ${esc(e.message)}`);
            }
          }
        };
        load();
        timer = setInterval(load, 3_600_000);
        return { destroy() { dead = true; clearInterval(timer); }, refresh: load };
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
    /* — the element builder's first slice: metric × symbol × window × style.
       Every leg reuses plumbing that already exists (HL candles, the
       coinalyze aggregator) — this widget is pure composition. — */
    vMetric: {
      title: 'Custom Metric', icon: 'sliders-horizontal', cat: 'Vice', vice: true,
      // per-metric window ceilings mirror the aggregator's maxDays — every
      // surface (pills, inspector, chart) must tell the same clamped truth
      w: 10, h: 8, minW: 4, minH: 5,
      settings: [
        F.text('symbol', 'Symbol', 'BTC', 'Coin ticker'),
        F.sel('metric', 'Metric', 'price', [
          ['price', 'Price'], ['oi', 'Open interest ($, all venues)'],
          ['funding', 'Funding APR (per venue)'], ['cvd', 'Taker CVD ($, all venues)'],
          ['vol', 'Hourly volume ($, all venues)'], ['liqs', 'Liquidations ($/h, all venues)']]),
        // (funding always draws per-venue lines; CVD holds 1 week, funding 2)
        F.sel('days', 'Window', '7', [['2', '2 days'], ['7', '1 week'], ['14', '2 weeks'], ['30', '1 month']]),
        F.sel('style', 'Style', 'line', [['line', 'Line'], ['area', 'Area'], ['bars', 'Bars']]),
        LINKED(),
      ],
      controls: [
        {
          key: 'days',
          opts: [['2', '2d'], ['7', '1W'], ['14', '2W'], ['30', '1M']],
          set: (s, v) => ({ days: String(Math.min(Number(v), VMETRIC_MAXD[s.metric] ?? 30)) }),
          is: (s, v) => Math.min(Number(s.days), VMETRIC_MAXD[s.metric] ?? 30) === Number(v),
        },
        {
          key: 'style',
          opts: [['line', 'L'], ['area', 'A'], ['bars', 'B']],
          set: (s, v) => ({ style: s.metric === 'funding' ? 'line' : v }),
          is: (s, v) => (s.metric === 'funding' ? v === 'line' : s.style === v),
        },
      ],
      // switching to a shorter-history metric clamps the stored window so the
      // pills, the inspector and the chart never disagree
      onSettingsSaved(s) {
        const cap = VMETRIC_MAXD[s.metric] ?? 30;
        if (Number(s.days) > cap) s.days = String(cap);
      },
      link: (s, sym) => ({ symbol: sym }),
      label: (s) => `${s.symbol.trim().toUpperCase()} · ${({ price: 'price', oi: 'OI $', funding: 'funding APR', cvd: 'CVD $', vol: 'vol $/h', liqs: 'liqs $/h' })[s.metric] ?? s.metric}`,
      mount(body, s) {
        const SYM = s.symbol.trim().toUpperCase();
        const days = Math.min(Number(s.days), VMETRIC_MAXD[s.metric] ?? 30);
        const isMoney = s.metric !== 'funding';
        const seriesStyle = (name, pts, color) => (s.style === 'bars' && s.metric !== 'funding'
          ? { name, type: 'bar', barMaxWidth: 10, data: pts, itemStyle: { color } }
          : {
            name, type: 'line', data: pts, showSymbol: false,
            lineStyle: { width: 1.4, color }, itemStyle: { color },
            ...(s.style === 'area' && s.metric !== 'funding' ? {
              areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
                { offset: 0, color: `${color}55` }, { offset: 1, color: `${color}08` }] } },
            } : {}),
          });
        const sumVenues = (venues, map = (p) => p[1]) => {
          const total = new Map();
          for (const v of venues) for (const p of v.points) total.set(p[0], (total.get(p[0]) ?? 0) + map(p));
          return [...total.entries()].sort((a, b) => a[0] - b[0]);
        };
        return chartMount(body, async (chart) => {
          let series = [];
          if (s.metric === 'price') {
            const rows = await hlInfo({ type: 'candleSnapshot', req: { coin: SYM, interval: days > 7 ? '4h' : '1h', startTime: Date.now() - days * 86_400_000, endTime: Date.now() } });
            if (!Array.isArray(rows) || rows.length < 2) throw new Error(`no Hyperliquid history for ${SYM}`);
            series = [seriesStyle('price', rows.map((r) => [Number(r.t), Number(r.c)]), '#5aa7f7')];
          } else {
            const agg = await getJson(`/api/vice-coinalyze?kind=${s.metric === 'vol' ? 'volh' : s.metric}&sym=${SYM}&days=${days}`, 20000).catch(() => null);
            if (agg?.noKey) throw new Error('needs the aggregator key (fills on vicesuite.com)');
            if (!agg?.venues?.length) throw new Error(`no ${s.metric} series for ${SYM} yet — aggregator may be warming up`);
            if (s.metric === 'funding') {
              series = agg.venues.slice().sort(byVenueOrder((v) => v.venue))
                .map((v) => seriesStyle(v.venue, v.points, VENUE_C[v.venue]));
            } else if (s.metric === 'cvd') {
              let acc = 0;
              series = [seriesStyle('CVD', sumVenues(agg.venues).map(([t, d]) => [t, (acc += d)]), '#2dd4bf')];
            } else if (s.metric === 'liqs') {
              // liq points are [t, long$, short$] — chart the hourly total
              series = [seriesStyle('liqs', sumVenues(agg.venues, (p) => (p[1] ?? 0) + (p[2] ?? 0)), '#ff6473')];
            } else if (s.metric === 'oi') {
              // forward-fill each venue across feed gaps — a missing
              // venue-hour used to read as a multi-billion-dollar OI crash
              const stamps = [...new Set(agg.venues.flatMap((v) => v.points.map((p) => p[0])))].sort((a, b) => a - b);
              const filled = stamps.map((t) => [t, 0]);
              for (const v of agg.venues) {
                const m = new Map(v.points);
                let last = null;
                stamps.forEach((t, i) => {
                  if (m.has(t)) last = m.get(t);
                  if (last != null) filled[i][1] += last;
                });
              }
              series = [seriesStyle('OI', filled, '#b47aff')];
            } else {
              series = [seriesStyle('volume', sumVenues(agg.venues), '#e7b53a')];
            }
          }
          chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 8, right: 8, top: 12, bottom: s.metric === 'funding' ? 22 : 6, containLabel: true },
            tooltip: {
              ...TIP_BOX, trigger: 'axis',
              valueFormatter: (v) => (v == null ? '—'
                : s.metric === 'price' ? `$${fmtPx(v)}` // full precision — 3 sig figs hid the whole move
                : isMoney ? `${v < 0 ? '-' : ''}$${fmtCompact(Math.abs(v))}` : `${Number(v).toFixed(1)}% APR`),
            },
            ...(s.metric === 'funding' ? { legend: { bottom: 0, itemWidth: 14, itemHeight: 2, icon: 'rect', textStyle: { ...AXIS_LBL, fontSize: 10 } } } : {}),
            xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
            yAxis: {
              type: 'value', scale: s.metric === 'price' || s.metric === 'oi',
              axisLabel: { ...AXIS_LBL, formatter: (v) => (isMoney ? `${v < 0 ? '-' : ''}$${fmtCompact(Math.abs(v))}` : `${v}%`) },
              splitLine: AXIS_SPLIT,
            },
            series,
          }, { notMerge: true });
        }, 120_000);
      },
    },
  };

  /* ── element descriptions (gallery + add tray) — one line, what it DOES ── */
  const WIDGET_DESC = {
    tvChart: 'Full TradingView chart — any symbol, any interval, drawing tools and all.',
    tvMini: 'A compact sparkline of one symbol with quick 1D→ALL range flips.',
    tvTape: 'A one-line scrolling price marquee for the symbols you pick.',
    tvCryptoHeat: 'Crypto market heatmap — tiles sized by cap, colored by change.',
    tvStockHeat: 'US equities heatmap grouped by sector — S&P, Nasdaq, Dow or all.',
    tvEtfHeat: 'ETF heatmap grouped by asset class, sized by assets under management.',
    tvForexHeat: 'Currency-pair strength matrix across the majors.',
    tvOverview: 'Tabbed mini-charts of crypto, indices, forex and futures majors.',
    tvCryptoScreener: 'TradingView’s full crypto screener with sortable columns.',
    tvStockScreener: 'TradingView’s stock screener — gainers, losers, caps, highs, lows.',
    news: 'Every feed in one place: crypto RSS, TradingView wires, and per-symbol stories on tabs.',
    tvCal: 'Economic calendar — filter by country and event importance.',
    tvSymInfo: 'One symbol’s quote, profile and fundamentals at a glance.',
    vWatch: 'Your watchlist with live Hyperliquid prices — click a row to re-point linked blocks.',
    vMovers: 'Top gainers and losers across the top-250 by market cap.',
    vNotes: 'A plain scratchpad that survives reloads — trade plans, levels, reminders.',
    vClocks: 'World session clocks with open/closed state for NYSE, LSE, TSE, ASX.',
    vAlerts: 'Price alerts with sound + notification — targets take 70000, 70k or +5%.',
    vChartPro: 'The native Vice chart engine: candles, indicator suite, liquidation heatmap.',
    vChart: 'A vc chart-bot panel — full command syntax, 21 indicators, ratios, compares.',
    vFunding: 'Live 8h funding across Binance, OKX, Bybit, Hyperliquid and Deribit.',
    vCountdown: 'Candle-close countdowns for 1H, 4H, 1D and 1W plus a UTC clock.',
    vLiqMap: 'Resting order-book depth around price — where the walls sit.',
    vHeat: 'The native crypto heatmap — top-150 tiles, 24h or weekly change.',
    vVol24h: '24h perp volume compared venue by venue.',
    vOiSnap: 'Open interest right now, compared venue by venue.',
    vFundingHist: 'Funding rate history as APR, one line per venue.',
    vRetHour: 'Average return by hour of day (UTC) over the last month.',
    vRetDay: 'Average return by weekday (UTC) over the last month.',
    vRetBuckets: 'How many coins sit in each 24h/weekly return bucket.',
    vOIHist: 'Open interest history stacked across venues.',
    vVolHist: 'Daily perp volume stacked across venues.',
    vCVD: 'Cumulative taker buy-minus-sell dollars per venue.',
    vBasis: 'Front-quarter futures basis, annualized, per venue.',
    vPrice: 'A clean price area chart from Hyperliquid history.',
    vLiqs: 'Hourly liquidations — shorts up, longs down, colored by venue.',
    vSpotVol: 'Rolling correlation between price moves and DVOL moves.',
    vAtmIv: 'At-the-money implied volatility history across four tenors.',
    vSkew: '25-delta put-minus-call skew — what the crowd pays for protection.',
    vIvSlope: 'IV term-structure slope (1m−6m) — inversion flags stress.',
    vSessionRet: 'Cumulative return earned in US, EU and APAC sessions.',
    vDvol: 'Deribit’s DVOL index as candles — the crypto VIX.',
    vIvTerm: 'Today’s ATM IV by expiry — the live volatility curve.',
    vTopOpts: 'The most-traded option contracts today, calls vs puts.',
    vOiStrike: 'Options open interest by strike — the pin and the walls.',
    vOiExpiry: 'Options open interest by expiry — where the size rolls off.',
    vChanges: 'Top gainers raced against each other — price % or OI %.',
    vScreener: 'The native cross-asset screener: crypto + TradFi, favorites, search, news mode.',
    vFundHeat: 'A week of funding APR for the top coins as a heatmap.',
    vSectors: 'Equal-weight sector baskets raced — DeFi, L1, L2, AI, gaming, meme.',
    vOiCvd: 'CVD normalized by open interest — flow relative to positioning.',
    vMktVol: 'Whole-market hourly volume for a top-12 basket, stacked by venue.',
    vMktOI: 'Whole-market open interest for a top-12 basket, stacked by venue.',
    vFng: 'The crypto Fear & Greed index as a dial — extremes mark a crowded boat.',
    vPositioning: 'How the top-100 Hyperliquid books lean on one symbol — short %, average entries, average liq levels.',
    vSuite: 'Quick links to the rest of the Vice Suite.',
    vMetric: 'Build your own block: any metric × symbol × window × style — price, OI, funding, CVD, volume, liquidations.',
  };
  for (const [t, m] of Object.entries(HUB_WIDGETS)) m.desc ??= WIDGET_DESC[t] ?? '';

  // gallery sketch per element (thumbSvg kind) + data-source line (trader hat:
  // provenance matters). One map each — the manifests stay lean.
  const WIDGET_THUMB = {
    tvChart: 'candles', tvMini: 'area', tvTape: 'tape',
    tvCryptoHeat: 'heat', tvStockHeat: 'heat', tvEtfHeat: 'heat', tvForexHeat: 'matrix',
    tvOverview: 'list', tvCryptoScreener: 'screener', tvStockScreener: 'screener',
    news: 'news', tvCal: 'cal', tvSymInfo: 'quote',
    vWatch: 'list', vMovers: 'list', vNotes: 'note', vClocks: 'clock', vAlerts: 'bell',
    vChartPro: 'candles', vChart: 'candles', vFunding: 'table', vCountdown: 'timer',
    vLiqMap: 'depth', vHeat: 'heat', vVol24h: 'bars', vOiSnap: 'bars', vFundingHist: 'line',
    vRetHour: 'bars', vRetDay: 'bars', vRetBuckets: 'bars', vOIHist: 'area', vVolHist: 'bars',
    vCVD: 'line', vBasis: 'line', vPrice: 'area', vLiqs: 'liqbars', vSpotVol: 'line',
    vAtmIv: 'line', vSkew: 'line', vIvSlope: 'line', vSessionRet: 'line', vDvol: 'candles',
    vIvTerm: 'line', vTopOpts: 'bars', vOiStrike: 'bars', vOiExpiry: 'bars', vChanges: 'line',
    vScreener: 'screener', vFundHeat: 'heat', vSectors: 'line', vOiCvd: 'line',
    vMktVol: 'bars', vMktOI: 'area', vFng: 'gauge', vSuite: 'links', vPositioning: 'meter',
    vMetric: 'area',
  };
  const WIDGET_SRC = {
    vWatch: 'Hyperliquid live feed · 5s', vMovers: 'CoinGecko top-250 · 2m',
    news: 'RSS + TradingView wires · 5m', vFunding: 'BIN OKX BYB HL DER · live',
    vLiqMap: 'Binance / Coinbase / HL book · 10s', vHeat: 'CoinGecko top-250 · 2m',
    vChartPro: 'Hyperliquid + venue books · live', vChart: 'vc engine · 1m',
    vFng: 'alternative.me index · daily', vScreener: 'TradingView scanner · 15s',
    vAlerts: 'Hyperliquid live feed · 5s', vFundHeat: 'Hyperliquid history',
    vPositioning: 'top-100 HL trader books · 3m',
    // provenance must be exact — these are Hyperliquid-only, not 5-venue
    vRetHour: 'Hyperliquid history · 1m', vRetDay: 'Hyperliquid history · 1m',
    vSessionRet: 'Hyperliquid history · 1m', vPrice: 'Hyperliquid history',
    vSectors: 'Hyperliquid history · equal-weight', vChanges: 'HL candles / venue OI aggregate',
    vMetric: 'HL history / multi-venue aggregate · 2m',
  };
  const srcFor = (t, m) => WIDGET_SRC[t] ?? (m.vice
    ? ({ Futures: 'multi-venue aggregate · BIN OKX BYB HL DER', Options: 'Deribit public API', Markets: 'multi-venue aggregate' })[m.cat] ?? 'Vice native'
    : 'TradingView embed');

  // tiny generative sketches — hairline strokes, one accent, no fills shouting
  function thumbSvg(kind) {
    const T = 'var(--text3)';
    const A = 'var(--teal)';
    const G = 'var(--green, #21d196)';
    const R = 'var(--red, #ff6473)';
    const inner = {
      candles: `<path d="M8 26V12M5 15h6M16 30V8M13 12h6M24 24V14M21 17h6M32 20V6M29 9h6M40 28V16M37 19h6M48 22V10M45 13h6" stroke="${T}"/><path d="M16 30V8M13 12h6M40 28V16M37 19h6" stroke="${R}"/><path d="M32 20V6M29 9h6M48 22V10M45 13h6" stroke="${G}"/>`,
      line: `<path d="M4 28 14 20 24 24 34 12 44 16 52 8" stroke="${A}" fill="none"/>`,
      area: `<path d="M4 28 14 18 24 22 34 10 44 14 52 6V32H4Z" fill="${A}" opacity="0.18" stroke="none"/><path d="M4 28 14 18 24 22 34 10 44 14 52 6" stroke="${A}" fill="none"/>`,
      bars: `<path d="M7 32V20M15 32V14M23 32V24M31 32V10M39 32V18M47 32V26" stroke="${T}" stroke-width="4"/>`,
      liqbars: `<path d="M7 16V8M15 16V4M23 16V11M31 16V6" stroke="${G}" stroke-width="4"/><path d="M7 20v6M15 20v10M23 20v4M31 20v8" stroke="${R}" stroke-width="4"/>`,
      heat: ['M4 4h14v12H4z', 'M20 4h10v12H20z', 'M32 4h20v12H32z', 'M4 18h10v14H4z', 'M16 18h16v14H16z', 'M34 18h18v14H34z'].map((d, i) => `<path d="${d}" fill="${i % 2 ? G : R}" opacity="${0.28 + (i % 3) * 0.16}" stroke="none"/>`).join(''),
      matrix: [...Array(9)].map((_, i) => `<rect x="${6 + (i % 3) * 16}" y="${4 + Math.floor(i / 3) * 10}" width="12" height="7" fill="${i % 2 ? G : R}" opacity="${0.25 + (i % 4) * 0.12}" stroke="none"/>`).join(''),
      table: `<path d="M6 8h44M6 16h44M6 24h44M6 32h44" stroke="${T}"/><path d="M6 8h12" stroke="${A}"/>`,
      list: `<circle cx="9" cy="9" r="3" fill="${T}" stroke="none"/><path d="M16 9h22M40 9h8" stroke="${T}"/><circle cx="9" cy="19" r="3" fill="${T}" stroke="none"/><path d="M16 19h22M40 19h8" stroke="${T}"/><circle cx="9" cy="29" r="3" fill="${T}" stroke="none"/><path d="M16 29h22M40 29h8" stroke="${A}"/>`,
      news: `<path d="M6 7h30M6 13h44M6 19h38M6 25h44M6 31h24" stroke="${T}"/><path d="M6 7h30" stroke="${A}"/>`,
      cal: `<rect x="8" y="6" width="40" height="26" rx="2" stroke="${T}" fill="none"/><path d="M8 13h40M16 6v-3M40 6v-3" stroke="${T}"/><circle cx="20" cy="21" r="2.5" fill="${A}" stroke="none"/><circle cx="30" cy="21" r="2.5" fill="${T}" stroke="none"/><circle cx="40" cy="27" r="2.5" fill="${T}" stroke="none"/>`,
      quote: `<text x="6" y="18" fill="${A}" font-size="13" font-family="inherit" stroke="none">$64,120</text><path d="M6 26h28M6 32h20" stroke="${T}"/>`,
      note: `<rect x="8" y="4" width="40" height="30" rx="3" stroke="${T}" fill="none"/><path d="M14 12h28M14 19h28M14 26h16" stroke="${T}"/>`,
      clock: `<circle cx="18" cy="18" r="11" stroke="${T}" fill="none"/><path d="M18 11v7l5 4" stroke="${A}" fill="none"/><circle cx="42" cy="18" r="8" stroke="${T}" fill="none"/><path d="M42 13v5l3 3" stroke="${T}" fill="none"/>`,
      timer: `<path d="M6 10h30" stroke="${A}"/><path d="M38 10h12" stroke="${T}"/><path d="M6 19h20" stroke="${A}"/><path d="M28 19h22" stroke="${T}"/><path d="M6 28h38" stroke="${A}"/><path d="M46 28h4" stroke="${T}"/>`,
      depth: `<path d="M52 6H30M52 12H38M52 18H26" stroke="${R}"/><path d="M52 24H20M52 30H34" stroke="${G}"/>`,
      gauge: `<path d="M10 30a18 18 0 0 1 36 0" stroke="${T}" fill="none" stroke-width="4"/><path d="M10 30a18 18 0 0 1 10-16" stroke="${R}" fill="none" stroke-width="4"/><path d="M42 17a18 18 0 0 1 4 13" stroke="${G}" fill="none" stroke-width="4"/><path d="M28 30 22 18" stroke="var(--text)" fill="none"/>`,
      bell: `<path d="M28 6c-6 0-10 4-10 10v6l-4 6h28l-4-6v-6c0-6-4-10-10-10Z" stroke="${T}" fill="none"/><path d="M24 30a4 4 0 0 0 8 0" stroke="${A}" fill="none"/>`,
      links: `<rect x="6" y="5" width="44" height="8" rx="2" stroke="${T}" fill="none"/><rect x="6" y="16" width="44" height="8" rx="2" stroke="${T}" fill="none"/><rect x="6" y="27" width="44" height="8" rx="2" stroke="${A}" fill="none"/>`,
      screener: `<path d="M6 6h44M6 14h44M6 22h44M6 30h44" stroke="${T}"/><path d="M6 6h10" stroke="${A}"/><circle cx="46" cy="14" r="2" fill="${G}" stroke="none"/><circle cx="46" cy="22" r="2" fill="${R}" stroke="none"/>`,
      tape: `<path d="M2 19h8M14 19h10M28 19h8M40 19h12" stroke="${T}"/><path d="M14 19h10" stroke="${G}"/><path d="M40 19h12" stroke="${R}"/>`,
      meter: `<path d="M4 10h28" stroke="${G}" stroke-width="6"/><path d="M34 10h18" stroke="${R}" stroke-width="6"/><path d="M6 24h20M6 30h26" stroke="${T}"/><path d="M40 24h10M40 30h10" stroke="${T}"/>`,
    }[kind] ?? `<path d="M6 30 20 16 32 24 50 8" stroke="${A}" fill="none"/>`;
    return `<svg class="vgal-thumb" viewBox="0 0 56 38" aria-hidden="true" stroke-width="1.5" stroke-linecap="round">${inner}</svg>`;
  }

  /* ── factory presets ────────────────────────────────────────────────── */
  const P = (type, x, y, w, h, settings = {}) => ({ id: uid(), type, x, y, w, h, settings });
  const PRESETS = {
    DeFi: () => [
      P('tvTape', 0, 0, 24, 1, { symbols: 'BITSTAMP:BTCUSD, BITSTAMP:ETHUSD, CRYPTO:SOLUSD, CRYPTO:XRPUSD, CRYPTO:BNBUSD, CRYPTO:DOGEUSD, CRYPTO:ADAUSD, COINBASE:HYPEUSD, CRYPTO:ZECUSD' }),
      P('tvChart', 0, 1, 14, 14, { symbol: 'BITSTAMP:BTCUSD', interval: '60' }),
      P('vWatch', 14, 1, 5, 8),
      P('vMovers', 19, 1, 5, 14),
      P('news', 14, 9, 5, 6, { tab: 'all' }), // ONE news block (audit C3)
      P('vHeat', 0, 15, 12, 10),
      P('vLiqs', 12, 15, 12, 10, { symbol: 'BTC' }),
      P('vFunding', 0, 25, 10, 7),
      P('vCountdown', 10, 25, 4, 7),
      P('vLiqMap', 14, 25, 10, 7, { symbol: 'BTC' }), // the duplicate news slot went native
    ],
    TradFi: () => [
      P('tvTape', 0, 0, 24, 1, { symbols: 'FOREXCOM:SPXUSD, FOREXCOM:NSXUSD, TVC:VIX, NASDAQ:AAPL, NASDAQ:NVDA, NASDAQ:TSLA, NASDAQ:MSFT, AMEX:SPY' }),
      P('tvChart', 0, 1, 14, 12, { symbol: 'AMEX:SPY', interval: 'D' }),
      P('tvOverview', 14, 1, 5, 12, { lead: 'indices' }),
      P('tvCal', 19, 1, 5, 12),
      P('tvStockHeat', 0, 13, 12, 10),
      P('news', 12, 13, 6, 10, { tab: 'tv', market: 'stock' }),
      P('tvMini', 18, 13, 6, 10, { symbol: 'NASDAQ:NVDA', range: '3M' }),
      // the one native analytics row on the TradFi board — the preset was
      // all iframes and ended in a blank band (audit M2)
      P('vScreener', 0, 23, 24, 9, { tab: 'tradfi' }),
    ],
    Macro: () => [
      P('tvTape', 0, 0, 24, 1, { symbols: 'CAPITALCOM:DXY, TVC:GOLD, TVC:USOIL, TVC:US10Y, FOREXCOM:SPXUSD, BITSTAMP:BTCUSD, FX:EURUSD' }),
      P('tvOverview', 0, 1, 7, 12, { lead: 'indices' }),
      P('tvCal', 7, 1, 8, 12),
      P('tvForexHeat', 15, 1, 9, 8),
      P('vClocks', 15, 9, 9, 6), // h:4 clipped the second clock row (audit §3.3)
      P('tvChart', 0, 15, 12, 11, { symbol: 'OANDA:XAUUSD', interval: 'D' }),
      P('news', 12, 15, 6, 11, { tab: 'tv', market: 'index' }),
      P('vNotes', 18, 15, 6, 11),
    ],
  };
  const defaultLayout = (name) => ({ grid: (PRESETS[name] ?? PRESETS.DeFi)() });

  /* ── store (localStorage) ───────────────────────────────────────────── */
  // retired-type migration (audit C3): tvNews (TV timeline) + vNews (RSS)
  // became one native 'news' widget — remap stored/imported instances onto
  // its source tabs. Runs on load, import, and trash restore paths.
  function migrateInst(inst) {
    if (!HUB_WIDGETS.news || !inst) return inst;
    if (inst.type === 'tvNews') {
      inst.type = 'news';
      inst.settings = {
        tab: inst.settings?.symbol ? 'symbol' : 'tv',
        market: inst.settings?.market ?? 'crypto',
        symbol: inst.settings?.symbol ?? '',
      };
    } else if (inst.type === 'vNews') {
      inst.type = 'news';
      inst.settings = { tab: 'rss', max: inst.settings?.max ?? 25 };
    }
    return inst;
  }

  let store;
  let storeRecovered = false; // B6: an unreadable store recovers silently — flag it for a toast
  // storage access itself can throw (blocked third-party context, some private
  // modes) — reads must never kill the boot
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  function load() {
    const raw = lsGet(LS_KEY);
    try {
      const j = JSON.parse(raw);
      if (j && j.v === SCHEMA_V && j.layouts && j.layouts[j.active]) {
        // 2026-07-22 terminology: Crypto→DeFi, Stocks→TradFi (order preserved)
        const ren = { Crypto: 'DeFi', Stocks: 'TradFi' };
        j.layouts = Object.fromEntries(Object.entries(j.layouts).map(([k, v]) => [ren[k] ?? k, v]));
        j.active = ren[j.active] ?? j.active;
        // stored settings outlive preset changes — patch the ones that went stale:
        // CRYPTO:HYPEUSD never had scanner data (dead tape slot) → COINBASE:HYPEUSD;
        // TradFi/Macro Market Overview should lead with Indices unless the user chose
        for (const [name, doc] of Object.entries(j.layouts)) {
          (doc.grid ?? []).forEach(migrateInst);
          (doc.trash ?? []).forEach(migrateInst);
          for (const inst of doc.grid ?? []) {
            if (inst.type === 'tvTape' && inst.settings?.symbols?.includes('CRYPTO:HYPEUSD'))
              inst.settings.symbols = inst.settings.symbols.replace(/CRYPTO:HYPEUSD/g, 'COINBASE:HYPEUSD');
            if (inst.type === 'tvOverview' && (name === 'TradFi' || name === 'Macro'))
              (inst.settings ??= {}).lead ??= 'indices';
          }
          // 2026-07-22 owner: the preset vChart duplicated the chart above it
          for (const inst of doc.grid ?? []) {
            if (inst.type === 'vChart' && inst.settings?.command === 'eth 1h ema20 ema55') {
              inst.type = 'vLiqs';
              inst.settings = { symbol: 'BTC' };
            }
          }
          // tape is a fixed single-row strip — shrink taller tapes from the
          // interim builds and pull the rows below back up
          for (const inst of doc.grid ?? []) {
            if (inst.type !== 'tvTape' || (inst.h ?? 0) <= 1) continue;
            const d = inst.h - 1;
            const edge = inst.y + inst.h;
            for (const other of doc.grid) {
              if (other !== inst && other.y >= edge) other.y -= d;
            }
            inst.h = 1;
          }
          // 2026-07-28 audit: Macro's preset Session Clocks (h:4) clipped its
          // second row of clocks — grow the untouched preset block to 6 and
          // push the rows below down to make room
          for (const inst of doc.grid ?? []) {
            if (name !== 'Macro' || inst.type !== 'vClocks') continue;
            if (inst.x !== 15 || inst.y !== 9 || inst.w !== 9 || inst.h !== 4) continue;
            const edge = inst.y + inst.h;
            for (const other of doc.grid) {
              if (other !== inst && other.y >= edge) other.y += 2;
            }
            inst.h = 6;
          }
        }
        return j;
      }
    } catch { /* fall through to the fresh default */ }
    if (raw != null) {
      // there WAS a store and it couldn't be read — keep a copy for rescue,
      // recover clean, and let boot() tell the user (silence was the bug)
      storeRecovered = true;
      try { localStorage.setItem(`${LS_KEY}.corrupt`, raw); } catch { /* best effort */ }
    }
    return {
      v: SCHEMA_V,
      active: 'DeFi',
      layouts: { DeFi: defaultLayout('DeFi'), TradFi: defaultLayout('TradFi'), Macro: defaultLayout('Macro') },
    };
  }
  let saveT = null;
  const bootedAt = Date.now();
  function persist() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try {
        // first user-made change stamps the store — the backup nudge only
        // speaks to people who actually built something (boot writes don't count)
        if (Date.now() - bootedAt > 5000) (store.meta ??= {}).touched ??= Date.now();
        localStorage.setItem(LS_KEY, JSON.stringify(store));
      }
      catch { /* storage full/blocked — dashboard still works, just won't stick */ }
    }, 250);
  }
  // a tab closed inside the 250ms debounce must not eat the last edit
  window.addEventListener('pagehide', () => {
    if (!saveT) return;
    clearTimeout(saveT);
    saveT = null;
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch { /* best effort */ }
  });

  // gentle backup nudge (audit C4): edited layouts + no export for 14 days →
  // one toast, at most weekly
  function maybeNudgeBackup() {
    const meta = store.meta ?? {};
    if (!meta.touched) return;
    if (Date.now() - (meta.lastExport ?? meta.touched) < 14 * 86_400_000) return;
    let lastNudge = 0;
    try { lastNudge = Number(localStorage.getItem('viceHub.nudged')) || 0; } catch { /* fine */ }
    if (Date.now() - lastNudge < 7 * 86_400_000) return;
    setTimeout(() => {
      try { localStorage.setItem('viceHub.nudged', String(Date.now())); } catch { /* fine */ }
      toast('your layouts live only in this browser — keep a backup file?',
        { label: 'Export all', run: exportAll }, 10000);
    }, 8000);
  }

  /* ── engine ─────────────────────────────────────────────────────────── */
  let grid = null;
  let editing = false;
  const live = new Map(); // id -> { inst, elItem, body, handle, mounted }
  let observer = null;

  const activeGrid = () => store.layouts[store.active].grid;

  function toast(msg, action, ms) {
    document.querySelectorAll('.hub-toast').forEach((t) => t.remove());
    const t = el('div', 'hub-toast', esc(msg));
    if (action) {
      const b = el('button', 'hub-toast-act', esc(action.label));
      b.addEventListener('click', () => { t.remove(); action.run(); });
      t.appendChild(b);
    }
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms ?? (action ? 5000 : 2600));
  }

  // fullscreen with an in-page fallback (B5): requestFullscreen is gated on
  // gestures and can be denied — a fixed-position maximize always works
  function expandEl(target) {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (target.classList.contains('hw-max')) {
      target.classList.remove('hw-max');
      document.body.classList.remove('hub-maxed');
      return;
    }
    const fallback = () => {
      target.classList.add('hw-max');
      document.body.classList.add('hub-maxed');
      toast('expanded in-page — ⤢ or Esc restores');
    };
    const p = target.requestFullscreen?.();
    if (p?.catch) p.catch(fallback); else fallback();
  }
  function unmaxAll() {
    document.querySelectorAll('.hw-max').forEach((n) => n.classList.remove('hw-max'));
    document.body.classList.remove('hub-maxed');
  }

  // face pills reflect the instance's current settings (audit C1)
  function syncControls(rec) {
    const man = HUB_WIDGETS[rec.inst.type];
    if (!man.controls?.length) return;
    const merged = { ...defaults(man), ...rec.inst.settings };
    rec.elItem.querySelectorAll('.hw-ctl-pill').forEach((b) => {
      const c = man.controls[Number(b.dataset.ci)];
      if (!c) return;
      const on = c.is ? c.is(merged, b.dataset.v) : String(merged[c.key]) === b.dataset.v;
      b.classList.toggle('on', on);
    });
  }

  function widgetShell(inst, man) {
    const item = el('div', 'grid-stack-item');
    item.dataset.hid = inst.id;
    const content = el('div', 'grid-stack-item-content hw');
    if (man.chromeless) content.classList.add('hw-chromeless');
    const head = el('div', 'hw-head');
    // focus boards + section boards are ephemeral — their blocks offer a pin
    // that copies {type, settings} into the active dashboard layout
    const ephemeral = focusMode || currentSection !== 'dash';
    const ctls = (man.controls ?? []).map((c, ci) =>
      `<span class="hw-ctl" role="group">${c.opts.map(([v, lab]) =>
        `<button class="hw-ctl-pill" type="button" data-ci="${ci}" data-v="${esc(String(v))}">${esc(lab)}</button>`).join('')}</span>`).join('');
    head.innerHTML = `<i data-lucide="${man.icon}"></i><span class="hw-title">${esc(man.title)}</span>` +
      ctls +
      '<span class="hw-btns">' +
      '<button class="hw-btn" data-act="refresh" title="Refresh"><i data-lucide="rotate-cw"></i></button>' +
      // every block gets the gear in Customize — the inspector carries size
      // presets and actions even when a widget has no settings of its own
      (ephemeral ? '' : '<button class="hw-btn" data-act="settings" title="Inspect — settings, size, actions"><i data-lucide="settings-2"></i></button>') +
      (ephemeral ? '' : '<button class="hw-btn" data-act="dup" title="Duplicate"><i data-lucide="copy"></i></button>') +
      (ephemeral ? '<button class="hw-btn hw-pin" data-act="pin" title="Pin to my Dashboard"><i data-lucide="pin"></i></button>' : '') +
      '<button class="hw-btn" data-act="expand" title="Fullscreen"><i data-lucide="maximize-2"></i></button>' +
      '<button class="hw-btn" data-act="remove" title="Remove"><i data-lucide="x"></i></button>' +
      '</span>';
    const body = el('div', 'hw-body');
    content.append(head, body);
    item.appendChild(content);
    head.addEventListener('click', (ev) => {
      const pill = ev.target.closest('.hw-ctl-pill');
      if (pill) {
        ev.preventDefault();
        const c = man.controls?.[Number(pill.dataset.ci)];
        if (!c) return;
        const merged = { ...defaults(man), ...inst.settings };
        const patch = c.set ? c.set(merged, pill.dataset.v) : { [c.key]: pill.dataset.v };
        inst.settings = { ...inst.settings, ...patch };
        persist();
        remount(inst.id);
        return;
      }
      const btn = ev.target.closest('.hw-btn');
      if (!btn) return;
      ev.preventDefault();
      const act = btn.dataset.act;
      if (act === 'refresh') remount(inst.id);
      else if (act === 'settings') openInspector(inst.id);
      else if (act === 'dup') duplicateInstance(inst);
      else if (act === 'expand') expandEl(content);
      else if (act === 'pin') pinInstance(inst);
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
    // contextual header: "Advanced Chart · SOLUSD" beats five blocks all reading
    // alike. The title HALF shrinks away first — context matters more (audit M4)
    const titleEl = rec.elItem.querySelector('.hw-title');
    if (titleEl) {
      const suffix = man.label?.(settings);
      titleEl.innerHTML = `<span class="hw-t1">${esc(man.title)}</span>` +
        (suffix ? `<span class="hw-t2">${esc(suffix)}</span>` : ''); // the "· " lives in CSS ::before — it can never orphan
      titleEl.title = suffix ? `${man.title} · ${suffix}` : man.title;
    }
    syncControls(rec);
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
      ...(man.maxH ? { maxH: man.maxH } : {}),
      autoPosition: autoPos, id: inst.id,
    });
    if (autoPos) {
      const n = item.gridstackNode;
      if (n) { inst.x = n.x; inst.y = n.y; }
    }
    observer.observe(body);
    icons();
  }

  function duplicateInstance(inst) {
    if (focusMode || currentSection !== 'dash') return;
    const man = HUB_WIDGETS[inst.type];
    const copy = { id: uid(), type: inst.type, x: inst.x, y: inst.y + inst.h, w: inst.w, h: inst.h, settings: JSON.parse(JSON.stringify(inst.settings ?? {})) };
    activeGrid().push(copy);
    addToGrid(copy, true);
    persist();
    toast(`duplicated ${man.title}`);
  }

  function removeInstance(id) {
    const rec = live.get(id);
    if (!rec) return;
    if (inspector?.id === id) closeInspector(); // the drawer must not outlive its block
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
    // only materialize onto the dashboard canvas — a restore triggered while a
    // Focus board is up (undo toast outliving the switch) must not join it
    if (!focusMode && currentSection === 'dash') { addToGrid(inst, false); updateEmpty(); }
    persist();
  }

  function updateEmpty() {
    const empty = $('#hub-empty');
    if (empty) empty.hidden = activeGrid().length > 0;
  }

  function clearCanvas() {
    unmaxAll(); // an in-page-maximized block must never outlive its canvas
    closeInspector(); // neither must the inspector drawer
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
    // auto-sized blocks obey the no-blank-space rule: once data paints,
    // shrink the fresh block to its content
    setTimeout(() => {
      const rec = live.get(inst.id);
      if (!rec) return;
      const want = contentCells(rec);
      if (want && want < rec.inst.h) grid.update(rec.elItem, { h: want });
    }, 2600);
  }

  /* ── tidy: compact the mess + fit row-list blocks to their content ────
     (owner: "if the user makes a mess everything moves back … hide the
     blank room"). Explicit action with Undo — never fights a drag. ────── */
  // natural content height in px for row-list widgets; null = fills-its-box
  // (charts, embeds, maps, notes stretch by design and are left alone)
  function contentCells(rec) {
    const man = HUB_WIDGETS[rec.inst.type];
    if (!rec.mounted || man.chromeless) return null;
    const body = rec.body;
    if (body.querySelector('.tv-wrap, .vchart, .vheat, .vliq, .vcp, .vnotes, .vscr2, .vclocks, .vcd, .fng')) return null;
    const inner = (sc) => {
      const last = sc.lastElementChild;
      return last ? last.offsetTop + last.offsetHeight : 0;
    };
    let px = 0;
    const scroll = body.querySelector(':scope > .vw-scroll');
    const col = body.querySelector(':scope > .vcol');
    const suite = body.querySelector(':scope > .vsuite');
    if (scroll) px = inner(scroll);
    else if (col) px = [...col.children].reduce((a, c) => a + (c.classList.contains('vw-scroll') ? inner(c) : c.offsetHeight), 0);
    else if (suite) px = inner(suite) + 14;
    else return null;
    if (px < 40) return null; // nothing painted yet — never collapse a loading block
    // the truth about row height lives in --hub-cell (fitCells writes it)
    const cell = parseFloat(getComputedStyle($('#hub-grid')).getPropertyValue('--hub-cell'))
      || grid.getCellHeight(true) || CELL_H;
    return Math.max(man.minH, Math.ceil((px + 28 + 14) / cell)); // + head + margins
  }

  function tidyLayout() {
    if (focusMode || currentSection !== 'dash') return;
    const snapshot = activeGrid().map((i) => ({ id: i.id, x: i.x, y: i.y, w: i.w, h: i.h }));
    grid.batchUpdate();
    for (const rec of live.values()) {
      const want = contentCells(rec);
      if (want && want < rec.inst.h) grid.update(rec.elItem, { h: want });
    }
    grid.batchUpdate(false);
    grid.compact('compact');
    persist();
    toast('tidied — packed the grid and trimmed blank space', {
      label: 'Undo',
      run() {
        grid.batchUpdate();
        for (const s of snapshot) {
          const rec = live.get(s.id);
          if (rec) grid.update(rec.elItem, { x: s.x, y: s.y, w: s.w, h: s.h });
        }
        grid.batchUpdate(false);
        persist();
      },
    });
  }

  /* ── tracked wallets + trade alerts (Scanner) ─────────────────────────
     Star a wallet → it lands here; a background poller watches its fills
     and speaks up when the trader acts, wherever you are in the Hub. ──── */
  const WALLET_WATCH_KEY = 'viceHub.scWatch';
  const WALLET_SEEN_KEY = 'viceHub.scSeen';
  const WALLET_ALERTS_KEY = 'viceHub.scAlerts';
  const readWalletWatch = () => { try { return JSON.parse(localStorage.getItem(WALLET_WATCH_KEY)) ?? []; } catch { return []; } };
  const saveWalletWatch = (arr) => { try { localStorage.setItem(WALLET_WATCH_KEY, JSON.stringify(arr.slice(0, 30))); } catch { /* fine */ } };
  const toggleWalletWatch = (addr) => {
    const list = readWalletWatch();
    const i = list.indexOf(addr);
    if (i >= 0) list.splice(i, 1); else {
      list.unshift(addr);
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    }
    saveWalletWatch(list);
    return i < 0; // now starred?
  };
  const readWalletAlerts = () => { try { return JSON.parse(localStorage.getItem(WALLET_ALERTS_KEY)) ?? []; } catch { return []; } };
  function pushWalletAlert(entry) {
    const log = readWalletAlerts();
    log.unshift(entry);
    try { localStorage.setItem(WALLET_ALERTS_KEY, JSON.stringify(log.slice(0, 50))); } catch { /* fine */ }
    toast(`${entry.who} ${entry.what}`, { label: 'Scanner', run: () => { location.hash = `#/scanner/${entry.a}`; } }, 7000);
    // Android Chrome throws from the bare constructor — never abort the loop
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${entry.who} — Vice Scanner`, { body: entry.what });
      }
    } catch { /* toast already delivered it */ }
  }
  function startWalletAlerts() {
    const seen = (() => { try { return JSON.parse(localStorage.getItem(WALLET_SEEN_KEY)) ?? {}; } catch { return {}; } })();
    const saveSeen = () => { try { localStorage.setItem(WALLET_SEEN_KEY, JSON.stringify(seen)); } catch { /* fine */ } };
    const poll = async () => {
      if (document.hidden) return; // resume picks it up — no background burn
      // matches the saveWalletWatch cap — EVERY tracked wallet alerts
      // (worst case ~30 × weight-20 fills queries per 90s ≈ 400/min, in budget)
      const watch = readWalletWatch().slice(0, 30);
      for (const addr of watch) {
        try {
          const fills = await hlInfo({ type: 'userFills', user: addr });
          if (!Array.isArray(fills) || !fills.length) continue;
          const latest = Number(fills[0].time) || 0;
          const last = seen[addr];
          seen[addr] = latest;
          if (last == null || latest <= last) continue; // first sight arms silently
          const fresh = fills.filter((f) => Number(f.time) > last).slice(0, 3);
          for (const f of fresh.reverse()) {
            pushWalletAlert({
              a: addr, t: Number(f.time), coin: f.coin,
              who: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
              what: `${String(f.dir ?? (f.side === 'B' ? 'buy' : 'sell')).toLowerCase()} ${fmtCompact(Number(f.sz))} ${f.coin} @ ${fmtPx(Number(f.px))}`,
            });
          }
        } catch { /* next round */ }
      }
      saveSeen();
    };
    setInterval(poll, 90_000);
    setTimeout(poll, 6000); // arm shortly after boot
  }

  /* ── wake refresh: numbers must never sit silently stale after sleep ── */
  function startWakeRefresh() {
    let hiddenAt = null;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      const away = hiddenAt && Date.now() - hiddenAt > 5 * 60_000;
      hiddenAt = null;
      if (!away) return;
      let n = 0;
      const kick = (h) => { try { h.refresh(); n++; } catch { /* its problem */ } };
      for (const rec of live.values()) if (rec.mounted && rec.handle?.refresh) kick(rec.handle);
      for (const pm of pageMounts) if (pm.handle?.refresh) kick(pm.handle);
      if (n) toast(`welcome back — refreshed ${n} block${n === 1 ? '' : 's'}`);
    });
  }

  /* ── settings modal (auto-generated from the widget's schema) ───────── */
  function modal(title, icon, bodyEl, foot) {
    const veil = el('div', 'hub-modal-veil');
    const box = el('div', 'hub-modal');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', title);
    box.tabIndex = -1;
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
    const prevFocus = document.activeElement; // keyboard users get their place back
    const close = () => {
      veil.remove();
      document.removeEventListener('keydown', onKey);
      if (prevFocus?.isConnected) prevFocus.focus?.();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    veil.addEventListener('click', (e) => { if (e.target === veil) close(); });
    head.querySelector('.x').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(veil);
    // land focus on the first field if there is one, else the dialog itself
    (box.querySelector('input, textarea, select') ?? box).focus();
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

  // sanitize: blank required text falls back to the default, numbers clamp
  function sanitizeValues(man, values) {
    for (const f of man.settings ?? []) {
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
    return values;
  }

  /* ── Tier-2 inspector: the settings surface is a live-apply side drawer —
     select a block in Customize, every change previews instantly on the
     canvas. The old save-button modal died here. ─────────────────────────── */
  let inspector = null; // { id, veil, elItem, onKey, prevFocus, flush }
  function closeInspector() {
    if (!inspector) return;
    const insp = inspector;
    inspector = null; // re-entrancy guard — flush may persist/remount
    insp.flush?.(); // a pending typed edit lands instead of dying with the timer
    document.removeEventListener('keydown', insp.onKey);
    insp.elItem?.querySelector('.hw')?.classList.remove('hw-inspected');
    insp.veil.remove();
    if (insp.prevFocus?.isConnected) insp.prevFocus.focus?.();
  }
  function openInspector(id) {
    if (focusMode || currentSection !== 'dash') return;
    // a native-fullscreened block would render the drawer invisible under the
    // top layer while its form silently ate keystrokes — leave fullscreen first
    if (document.fullscreenElement) document.exitFullscreen()?.catch?.(() => {});
    const rec = live.get(id);
    if (!rec) return;
    if (inspector?.id === id) { closeInspector(); return; } // gear toggles
    closeInspector();
    const man = HUB_WIDGETS[rec.inst.type];
    const veil = el('div', 'vgal-veil hub-insp-veil');
    const pane = el('div', 'vgal-drawer hub-insp');
    pane.setAttribute('role', 'dialog');
    pane.setAttribute('aria-modal', 'true');
    pane.setAttribute('aria-label', `${man.title} — inspector`);
    pane.tabIndex = -1;
    veil.appendChild(pane);
    document.body.appendChild(veil);

    pane.appendChild(el('div', 'vgal-d-head',
      `<i data-lucide="${man.icon}"></i><b>${esc(man.title)}</b>` +
      `<span class="vgal-badge${man.vice ? ' vice' : ''}">${man.vice ? 'Vice' : 'TV'}</span>` +
      '<button class="hw-btn x" data-x title="Close (Esc)"><i data-lucide="x"></i></button>'));
    pane.appendChild(el('div', 'vgal-d-meta',
      `<span><label>data</label>${esc(srcFor(rec.inst.type, man))}</span>`));

    let form = null;
    let flush = null;
    if (man.settings?.length) {
      pane.appendChild(el('div', 'hub-insp-sec', 'settings · apply live'));
      const built = buildForm(man.settings, { ...defaults(man), ...rec.inst.settings });
      form = built.form;
      pane.appendChild(form);
      let t = null;
      let dirty = false;
      const apply = () => {
        dirty = false;
        if (!live.has(id)) return; // a late timer must never touch a removed block
        const values = sanitizeValues(man, built.read());
        rec.inst.settings = { ...rec.inst.settings, ...values };
        man.onSettingsSaved?.(rec.inst.settings, rec.inst);
        persist();
        remount(id);
      };
      // selects/toggles land instantly; typed fields settle for 650ms first
      form.addEventListener('change', () => { clearTimeout(t); apply(); });
      form.addEventListener('input', (ev) => {
        const f = (man.settings ?? []).find((x) => x.key === ev.target?.dataset?.k);
        if (!f || f.kind === 'select' || f.kind === 'toggle') return;
        dirty = true;
        clearTimeout(t);
        t = setTimeout(apply, 650);
      });
      flush = () => { clearTimeout(t); if (dirty) apply(); };
    } else {
      pane.appendChild(el('div', 'hub-insp-sec', 'no settings — size and actions below'));
    }

    pane.appendChild(el('div', 'hub-insp-sec', 'size'));
    const sizes = el('div', 'hub-insp-row');
    const SIZES = [
      ['Small', () => [man.minW, man.minH]],
      ['Default', () => [man.w, man.h]],
      ['Large', () => [Math.min(GRID_COLS, Math.round(man.w * 1.5)), Math.round(man.h * 1.4)]],
    ];
    for (const [lab, fn] of SIZES) {
      const b = el('button', 'vgal-btn', lab);
      b.type = 'button';
      b.addEventListener('click', () => {
        const [w, h] = fn();
        if (grid.getColumn() === GRID_COLS) {
          grid.update(rec.elItem, { w, h }); // the change event persists geometry
        } else {
          // collapsed grids (mobile/narrow) discard live geometry — write the
          // store directly so the size takes on the next desktop render
          rec.inst.w = w;
          rec.inst.h = h;
          persist();
          toast('size saved — applies at desktop width');
        }
      });
      sizes.appendChild(b);
    }
    pane.appendChild(sizes);

    pane.appendChild(el('div', 'hub-insp-sec', 'actions'));
    const acts = el('div', 'hub-insp-row');
    const dup = el('button', 'vgal-btn', '<i data-lucide="copy"></i>Duplicate');
    dup.type = 'button';
    dup.addEventListener('click', () => duplicateInstance(rec.inst));
    const rem = el('button', 'vgal-btn hub-insp-danger', '<i data-lucide="trash-2"></i>Remove');
    rem.type = 'button';
    rem.addEventListener('click', () => { closeInspector(); removeInstance(id); });
    acts.append(dup, rem);
    pane.appendChild(acts);

    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeInspector(); } };
    document.addEventListener('keydown', onKey);
    veil.addEventListener('click', (e) => { if (e.target === veil) closeInspector(); });
    pane.querySelector('[data-x]').addEventListener('click', closeInspector);
    rec.elItem.querySelector('.hw')?.classList.add('hw-inspected');
    inspector = { id, veil, elItem: rec.elItem, onKey, prevFocus: document.activeElement, flush };
    icons();
    (form?.querySelector('input, select, textarea') ?? pane).focus();
  }

  /* ── in-UI prompt/confirm — native dialogs were the one unstyled surface
     left in the product (and some embedded contexts block them outright) ── */
  function promptModal(title, def, cb) {
    const wrap = el('div');
    const inp = el('input', 'hf-input');
    inp.value = def ?? '';
    inp.maxLength = 40;
    wrap.appendChild(inp);
    const cancel = el('button', 'hub-btn', 'Cancel');
    const ok = el('button', 'hub-btn primary', 'Save');
    const m = modal(title, 'pen-line', wrap, [cancel, ok]);
    cancel.addEventListener('click', m.close);
    const submit = () => { const v = inp.value.trim(); m.close(); if (v) cb(v); };
    ok.addEventListener('click', submit);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    inp.select();
  }
  function confirmModal(title, bodyText, danger, cb) {
    const wrap = el('div', null, `<p style="margin:0;color:var(--text2);font-size:12.5px;line-height:1.6;">${esc(bodyText)}</p>`);
    const cancel = el('button', 'hub-btn', 'Cancel');
    const ok = el('button', `hub-btn ${danger ? 'danger-solid' : 'primary'}`, danger ? 'Delete' : 'Confirm');
    const m = modal(title, danger ? 'trash-2' : 'help-circle', wrap, [cancel, ok]);
    cancel.addEventListener('click', m.close);
    ok.addEventListener('click', () => { m.close(); cb(); });
    ok.focus();
  }

  /* ── keyboard shortcuts sheet (⋮ menu or "?") — the shortcuts existed,
     nothing taught them ─────────────────────────────────────────────────── */
  function openShortcuts() {
    if (document.querySelector('.hub-modal-veil')) return;
    const mac = /Mac|iPhone|iPad/i.test(navigator.userAgentData?.platform ?? navigator.platform ?? '');
    const rows = [
      [mac ? '⌘ K' : 'Ctrl K', 'Command palette — actions, layouts, widgets, tickers'],
      ['/', 'Command palette'],
      ['F', 'Focus on a ticker (an instant one-symbol desk)'],
      ['E', 'Customize the layout — drag, resize, add'],
      ['1 – 5', 'Switch between your layouts'],
      ['Esc', 'Close dialogs · exit Customize · restore an expanded block'],
      ['?', 'This sheet'],
    ];
    const grid = el('div', 'hub-keys', rows.map(([k, d]) => `<kbd>${esc(k)}</kbd><span>${esc(d)}</span>`).join(''));
    modal('Keyboard shortcuts', 'keyboard', grid);
  }

  /* ── add-widget tray: the quick picker (the Gallery section is the deep
     storefront — searchable here, one line of what each block does) ────── */
  function openTray() {
    const cats = ['Charts', 'Markets', 'Futures', 'Options', 'Screeners', 'News & data', 'Vice'];
    const wrap = el('div');
    const search = el('div', 'hub-tray-search', '<i data-lucide="search"></i>');
    const inp = document.createElement('input');
    inp.placeholder = 'Search elements…';
    search.appendChild(inp);
    const listEl = el('div');
    wrap.append(search, listEl);
    const build = () => {
      const q = inp.value.trim().toLowerCase();
      listEl.innerHTML = '';
      const trash = store.layouts[store.active].trash ?? [];
      if (trash.length && !q) {
        listEl.appendChild(el('div', 'hub-tray-cat', 'Recently removed'));
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
        listEl.appendChild(gridEl);
      }
      for (const cat of cats) {
        const types = Object.entries(HUB_WIDGETS).filter(([, m]) => m.cat === cat &&
          (!q || `${m.title} ${m.desc}`.toLowerCase().includes(q)));
        if (!types.length) continue;
        listEl.appendChild(el('div', 'hub-tray-cat', esc(cat === 'Vice' ? 'Vice originals' : cat)));
        const gridEl = el('div', 'hub-tray-grid');
        for (const [type, m] of types) {
          const b = el('button', 'hub-tray-item',
            `<i data-lucide="${m.icon}"></i><span><strong>${esc(m.title)}</strong>` +
            `<span class="d">${esc(m.desc || `${m.vice ? 'Vice original' : 'TradingView'} · ${m.w}×${m.h}`)}</span></span>`);
          b.title = `${m.vice ? 'Vice original' : 'TradingView'} · default ${m.w}×${m.h}`;
          b.addEventListener('click', () => { m2.close(); addInstance(type); });
          gridEl.appendChild(b);
        }
        listEl.appendChild(gridEl);
      }
      if (!listEl.children.length) listEl.appendChild(el('div', 'hub-palette-empty', 'nothing matches'));
      icons();
    };
    inp.addEventListener('input', build);
    const galleryLink = el('button', 'hub-tray-gallery',
      '<i data-lucide="shapes"></i>Browse the Element Gallery — live previews of everything');
    galleryLink.addEventListener('click', () => { m2.close(); location.hash = '#/gallery'; });
    wrap.appendChild(galleryLink);
    build();
    const m2 = modal('Add a widget', 'plus', wrap);
    m2.box.classList.add('wide');
    inp.focus();
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
    window.scrollTo(0, 0);
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

  // any export counts as a backup — the nudge in ⋮ keys off this stamp
  function markBackedUp() {
    (store.meta ??= {}).lastExport = Date.now();
    persist();
  }
  const download = (doc, filename) => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  function exportLayout() {
    download({ app: 'vice-hub', v: SCHEMA_V, name: store.active, layout: store.layouts[store.active] },
      `vice-hub-${store.active.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`);
    markBackedUp();
  }

  // whole-store backup: every layout in one file (audit C4 — localStorage is
  // a single point of loss; one file restores everything)
  function exportAll() {
    download({ app: 'vice-hub', v: SCHEMA_V, all: true, active: store.active, layouts: store.layouts },
      `vice-hub-backup-${new Date().toISOString().slice(0, 10)}.json`);
    markBackedUp();
  }

  const sanitizeGrid = (grid) => grid
    .map((i) => (i ? migrateInst({ ...i }) : i))
    .filter((i) => i && HUB_WIDGETS[i.type])
    .map((i) => ({ id: uid(), type: i.type, x: i.x | 0, y: i.y | 0, w: i.w || HUB_WIDGETS[i.type].w, h: i.h || HUB_WIDGETS[i.type].h, settings: i.settings ?? {} }));

  function importLayout(file) {
    file.text().then((txt) => {
      const doc = JSON.parse(txt);
      if (focusMode) exitFocus(false); // the import lands on the dashboard canvas
      // whole-store backups restore every layout (fresh names when they clash)
      if (doc?.all && doc.layouts) {
        let added = 0;
        for (const [rawName, layout] of Object.entries(doc.layouts)) {
          if (!Array.isArray(layout?.grid)) continue;
          const grid = sanitizeGrid(layout.grid);
          if (!grid.length) continue;
          let name = String(rawName).slice(0, 40) || 'Imported';
          while (store.layouts[name]) name += ' 2';
          store.layouts[name] = { grid };
          if (rawName === doc.active || !added) store.active = name;
          added++;
        }
        if (!added) throw new Error('no known widgets in that file');
        persist();
        refreshLayoutSelect();
        renderLayout();
        toast(`restored ${added} layout${added === 1 ? '' : 's'} from the backup`);
        return;
      }
      const layout = doc?.layout ?? doc; // accept bare {grid:[...]} too
      if (!Array.isArray(layout?.grid)) throw new Error('bad shape');
      const grid = sanitizeGrid(layout.grid);
      if (!grid.length) throw new Error('no known widgets in that file');
      let name = String(doc?.name ?? 'Imported').slice(0, 40) || 'Imported';
      while (store.layouts[name]) name += ' 2';
      store.layouts[name] = { grid };
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

  /* ── tab-title + favicon ticker (the hub works even when buried) ──────
     SINGLE owner of document.title, driven by focus/link state (B1: the old
     subscriber read a leaked linkedSym forever after leaving Focus). */
  let titleSync = () => {};
  function startTitleTicker() {
    const fav = document.querySelector('link[rel="icon"]');
    const base = new Image();
    base.src = '../vice-terminal-64.png';
    let last = '';
    const paint = (map) => {
      if (!map) return;
      const want = focusMode ? focusSym : linkedSym;
      const sym = want && map[want] ? want : 'BTC';
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
    };
    titleSync = () => paint(hlFeed.snap());
    hlFeed.sub(paint);
  }



  /* ── navbar live price: BTC on DeFi, S&P 500 on TradFi ─────────────── */
  let navPriceSync = null;
  function startNavPrice() {
    const btn = $('#hub-price');
    if (!btn) return;
    const txt = btn.querySelector('.hp-txt');
    let spx = null;
    let spxAt = 0;
    let spxTimer = null;
    // the dot only glows when the feed actually ticks — an honest pulse
    const dot = btn.querySelector('.dot');
    setInterval(() => {
      const age = Date.now() - (store.active === 'TradFi' ? spxAt : hlTickAt);
      dot?.classList.toggle('stale', age > 25_000);
    }, 5000);
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
        if (d) { spx = { px: Number(d[0]), chg: Number(d[1]) }; spxAt = Date.now(); paint(); }
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
  let preFocusLinked = null; // linkedSym as it stood before Focus (B1 restore)

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
      base.push(P('news', 0, 13, 8, 9, { tab: 'symbol', symbol: tvSym }), P('tvMini', 8, 13, 8, 9, { symbol: tvSym, range: '12M' }));
    } else {
      base.push(P('tvMini', 0, 13, 16, 9, { symbol: tvSym, range: '12M' }));
    }
    if (isCrypto) {
      base.push(
        P('vChart', 14, 6, 10, 7, { command: `${coin.toLowerCase()} 4h ema20 ema55`, linked: false }),
        P('vFunding', 16, 13, 8, 4, { only: coin }),
        P('vCountdown', 16, 17, 8, 5),
        // the Scanner's crowd for this exact symbol — the focus board's edge
        P('vPositioning', 0, 22, 16, 8, { symbol: coin, linked: false }),
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

  let focusSeq = 0; // stale-probe guard: navigation during the await must win
  async function enterFocus(raw, displaySym) {
    if (editing) $('#hub-edit').click(); // focus boards are for reading, not editing
    if (currentSection !== 'dash') {
      exitSection(false); // focus renders on the grid canvas
      // the section's hash must not survive into Focus — a reload would land
      // back in the section, and the nav link for it would read active-but-dead
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    }
    const myReq = ++focusSeq;
    const meta = focusMeta(raw);
    // no stories for this ticker → skip the news block (needs the deployed
    // /api/vice-headlines proxy; locally we can't know, so news stays)
    let hasNews = true;
    try {
      const j = await getJson(`/api/vice-headlines?symbol=${encodeURIComponent(meta.tvSym)}`, 2500);
      hasNews = (j.count ?? 1) > 0;
    } catch { /* proxy unavailable — keep news */ }
    // the user may have navigated somewhere else while the probe ran
    if (myReq !== focusSeq || currentSection !== 'dash') return;
    const insts = focusInsts(meta, hasNews);
    const sym = displaySym ?? meta.coin;
    if (!focusMode) preFocusLinked = linkedSym; // refocusing keeps the ORIGINAL restore point
    focusMode = true;
    focusSym = sym;
    linkedSym = sym; // focus-board linked blocks follow the focused ticker
    titleSync();
    document.body.classList.add('focused');
    const btn = $('#hub-focus');
    btn.classList.add('focus-on');
    btn.innerHTML = `<i data-lucide="crosshair"></i><span>${esc(sym)} · exit</span>`;
    renderInsts(insts);
    window.scrollTo(0, 0);
    icons();
  }

  function exitFocus(rerender = true) {
    focusSeq++; // cancel any in-flight enterFocus probe
    focusMode = false;
    focusSym = null;
    linkedSym = preFocusLinked; // B1: the focus feed used to leak into the tab title forever
    preFocusLinked = null;
    titleSync();
    document.body.classList.remove('focused');
    const btn = $('#hub-focus');
    btn.classList.remove('focus-on');
    btn.innerHTML = '<i data-lucide="crosshair"></i><span>Focus</span>';
    // leaving focus lands back where the user was: section board or dashboard
    if (rerender) {
      (currentSection !== 'dash' ? renderSection() : renderLayout());
      window.scrollTo(0, 0);
    }
    icons();
  }

  /* ── sections: Velo-style replica pages — the Dashboard stays the custom
     gridstack canvas, untouched. Each section is a STATIC page (no drag, no
     cells): a control bar + a fixed 2-col grid of panels. Panels host the
     same widget mounts the dashboard uses, invisibly — the one addition is
     a pin button that copies {type, settings} into the active layout. ── */
  let currentSection = 'dash';
  let scannerBootAddr = null; // #/scanner/0x… deep link → inspector on arrival
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
      else if (act === 'expand') expandEl(p);
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
        // our own engine (vchart.js) — candles, <Vice> indicator suite, book heatmap
        panel(grid, 'vChartPro', { symbol: sym }, 'span2 vp-hero vp-chartpro');
        panel(grid, 'vScreener', { tab: 'all' }, 'span2 vp-tall');
      },
    },
    // Vice Scanner (owner ask): the Hyperliquid wallet tracker — leaderboard
    // with live UPL + crowd aggregates, starred wallets with live positions
    // and trade alerts, and a full inspector for any address
    scanner: {
      title: 'Scanner', icon: 'radar',
      render(root) {
        const wrap = el('div', 'vsc');
        root.appendChild(wrap);
        const intro = el('div', 'vgal-intro',
          '<b>Vice Scanner</b><span>the sharpest wallets on Hyperliquid — or paste any address. Star a trader to track their book and get trade alerts.</span>');
        const viewsEl = el('div', 'vsc-views');
        const aggEl = el('div', 'vsc-agg');
        const bar = el('div', 'vsc-bar');
        const search = el('div', 'vgal-search vsc-search', '<i data-lucide="search"></i>');
        const inp = document.createElement('input');
        inp.placeholder = 'Any wallet address — 0x…';
        inp.setAttribute('aria-label', 'Wallet address');
        search.appendChild(inp);
        const modeEl = el('div', 'vgal-chips');
        const winEl = el('div', 'vgal-chips');
        bar.append(search, modeEl, el('span', 'vsc-sp'), winEl);
        const scroll = el('div', 'vsc-scroll');
        const trackedEl = el('div', 'vsc-tracked');
        wrap.append(intro, viewsEl, aggEl, bar, scroll, trackedEl);

        const MODES = [['all', 'All'], ['crypto', 'Crypto'], ['tradfi', 'TradFi']];
        const WINS = [['day', '24h'], ['week', '7d'], ['month', '30d'], ['all', 'All-time']];
        const state = { view: 'board', mode: 'all', win: 'month', sort: 'pnl', dir: -1, rows: [], loading: true, err: null };
        const enrich = new Map(); // addr -> { upl, uplPct, cls, value, npos, coins, ln, sn, book }
        let enrichRun = 0;
        let dead = false;
        let trackedTimer = null;
        // closeWallet is declared below — destroy only runs at teardown, long after
        pageMounts.push({ handle: { destroy() { dead = true; clearInterval(trackedTimer); closeWallet(); } } });

        // TradFi on Hyperliquid: builder-dex markets carry a "dex:COIN" name;
        // bare equity/metal tickers cover the pre-HIP-3 unit listings
        const TRADFI_SET = new Set(['TSLA', 'AAPL', 'NVDA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'GOOG', 'COIN', 'HOOD', 'MSTR', 'PLTR', 'AMD', 'NFLX', 'SPY', 'QQQ', 'SPX', 'NDX', 'GOLD', 'XAU', 'SILVER', 'XAG', 'OIL', 'CL', 'EURUSD', 'US500', 'US10Y']);
        const isTradfi = (coin) => coin.includes(':') || TRADFI_SET.has(coin.replace(/^U/, ''));
        const shortA = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
        // coin icons: HL names normalize onto the CoinGecko icon cache —
        // kPEPE is 1000×PEPE, UBTC is Unit-wrapped BTC, dex:COIN is a builder market
        const coinIconFor = (coin) => {
          const c = String(coin).replace(/^.*:/, '');
          for (const k of [c, c.replace(/^k/, ''), c.replace(/^U/, '')]) {
            if (coinIcons[k]) return iconFor(k);
          }
          return iconFor(c);
        };
        // sections mount no market widgets — warm the icon cache ourselves
        fetchMarkets().then(() => { if (!dead) { paint(); paintTracked(); } }).catch(() => { /* letter avatars */ });
        const fmtSign = (v, fmt = fmtCompact) => (v == null ? '—' : `${v < 0 ? '-' : ''}$${fmt(Math.abs(v))}`);
        const pct = (v, digits = 2) => (v == null || !Number.isFinite(v) ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(digits)}%`);
        const cls2 = (v) => (v == null ? '' : v >= 0 ? 'up' : 'down');
        let starred = readWalletWatch();
        const starBtn = (a, extra = '') => {
          const on = starred.includes(a);
          return `<button class="vsc-star${on ? ' on' : ''} ${extra}" data-star="${esc(a)}" aria-pressed="${on}" ` +
            `title="${on ? 'Untrack this wallet' : 'Track this wallet — live positions + trade alerts'}" type="button">★</button>`;
        };

        /* ── header views: Leaderboard ⇄ Tracked ── */
        const paintViews = () => {
          viewsEl.innerHTML =
            `<button class="vsc-view${state.view === 'board' ? ' on' : ''}" data-v="board" type="button"><i data-lucide="list-ordered"></i>Leaderboard</button>` +
            `<button class="vsc-view${state.view === 'tracked' ? ' on' : ''}" data-v="tracked" type="button"><i data-lucide="star"></i>Tracked<span class="n">${starred.length}</span></button>`;
          icons();
        };
        const syncView = () => {
          const board = state.view === 'board';
          aggEl.hidden = !board;
          bar.hidden = !board;
          scroll.hidden = !board;
          trackedEl.hidden = board;
          if (board) { clearInterval(trackedTimer); trackedTimer = null; }
          else { paintTracked(); loadTracked(); }
        };

        /* ── aggregate strip: what the whole cohort is doing ── */
        const paintAgg = () => {
          // scope to the DISPLAYED cohort — enrich caches across window
          // switches and would otherwise mix retired rows into the stats
          const es = state.rows.map((r) => enrich.get(r.a)).filter(Boolean);
          if (state.loading || es.length < 8) { aggEl.innerHTML = ''; return; }
          const withPos = es.filter((e) => e.npos > 0);
          const ln = es.reduce((a, e) => a + (e.ln ?? 0), 0);
          const sn = es.reduce((a, e) => a + (e.sn ?? 0), 0);
          const shortPct = ln + sn > 0 ? Math.round((sn / (ln + sn)) * 100) : 0;
          const shortWallets = withPos.filter((e) => (e.sn ?? 0) > (e.ln ?? 0)).length;
          const inProfit = withPos.filter((e) => e.upl > 0).length;
          const uplSum = es.reduce((a, e) => a + e.upl, 0);
          const crowd = {};
          for (const e of es) for (const [c, ntl] of e.book ?? []) crowd[c] = (crowd[c] ?? 0) + Math.abs(ntl);
          const top = Object.entries(crowd).sort((a, b) => b[1] - a[1]).slice(0, 5);
          const t10 = state.rows.slice(0, 10);
          const t10pnl = t10.reduce((a, r) => a + r[state.win].pnl, 0);
          const t10vlm = t10.reduce((a, r) => a + r[state.win].vlm, 0);
          const winLab = WINS.find(([k]) => k === state.win)?.[1] ?? '';
          const card = (label, body2, sub) =>
            `<div class="vsc-card"><label>${label}</label><div class="v">${body2}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
          aggEl.innerHTML =
            card(`cohort bias · ${es.length} books`,
              `<span class="vposn-meter slim"><span class="l" style="width:${100 - shortPct}%"></span><span class="s" style="width:${shortPct}%"></span></span>`,
              `<b class="${shortPct >= 50 ? 'down' : 'up'}">${shortPct >= 50 ? `${shortPct}% short` : `${100 - shortPct}% long`}</b> by notional · ${shortWallets}/${withPos.length} wallets net short`) +
            card('open upl', `<b class="${cls2(uplSum)}">${fmtSign(uplSum)}</b>`,
              `${inProfit}/${withPos.length} books in profit`) +
            card('most crowded', top.length
              ? `<span class="vsc-coins big">${top.map(([c]) => coinIconFor(c)).join('')}</span>`
              : '—', top.map(([c]) => esc(c.replace(/^.*:/, ''))).join(' · ')) +
            card(`top 10 · ${winLab}`, `<b class="${cls2(t10pnl)}">${fmtSign(t10pnl)}</b>`,
              `on $${fmtCompact(t10vlm)} traded`);
        };

        /* ── leaderboard table ── */
        const paintBars = () => {
          modeEl.innerHTML = MODES.map(([k, lab]) =>
            `<button class="vpage-chip${state.mode === k ? ' on' : ''}" data-m="${k}" type="button">${lab}</button>`).join('');
          winEl.innerHTML = WINS.map(([k, lab]) =>
            `<button class="vpage-chip${state.win === k ? ' on' : ''}" data-w="${k}" type="button">${lab}</button>`).join('');
        };
        const arrow = (k) => (state.sort === k ? (state.dir < 0 ? ' ↓' : ' ↑') : '');
        const visibleRows = () => {
          let rows = state.rows.map((r) => ({ ...r, e: enrich.get(r.a) }));
          if (state.mode !== 'all') rows = rows.filter((r) => r.e?.cls === state.mode);
          const key = {
            value: (r) => r.v, pnl: (r) => r[state.win].pnl, roi: (r) => r[state.win].roi,
            vlm: (r) => r[state.win].vlm, upl: (r) => r.e?.upl, uplpct: (r) => r.e?.uplPct,
          }[state.sort];
          rows.sort((a, b) => {
            const av = key(a);
            const bv = key(b);
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            return state.dir < 0 ? bv - av : av - bv;
          });
          return rows;
        };
        function paint() {
          if (state.view !== 'board') return;
          paintAgg();
          if (state.err) {
            scroll.innerHTML = '';
            note(scroll, 'wifi-off', esc(state.err));
            return;
          }
          if (state.loading) {
            scroll.innerHTML = [...Array(9)].map(() =>
              '<div class="vsc-r vsc-skel"><span></span><span></span><span></span><span></span><span></span></div>').join('');
            return;
          }
          const rows = visibleRows();
          scroll.innerHTML =
            '<div class="vsc-r vsc-h">' +
            '<span class="st"></span><span class="rk">#</span><span class="who">trader</span>' +
            `<button class="num sortable" data-s="value" type="button">equity${arrow('value')}</button>` +
            `<button class="num sortable" data-s="pnl" type="button">pnl${arrow('pnl')}</button>` +
            `<button class="num sortable cvol" data-s="vlm" type="button">volume${arrow('vlm')}</button>` +
            `<button class="num sortable cupl" data-s="upl" type="button">upl $${arrow('upl')}</button>` +
            `<button class="num sortable cupct" data-s="uplpct" type="button">upl %${arrow('uplpct')}</button>` +
            '<span class="cls"></span></div>' +
            (rows.map((r, i) => {
              const e = r.e;
              const roi = r[state.win].roi;
              return `<div class="vsc-r clickable" data-a="${esc(r.a)}" tabindex="0" role="button" aria-label="Inspect ${esc(r.n ?? shortA(r.a))}">` +
                `<span class="st">${starBtn(r.a)}</span>` +
                `<span class="rk${i < 3 ? ' top' : ''}">${i + 1}</span>` +
                `<span class="who"><b>${esc(r.n ?? shortA(r.a))}</b><span class="sub">${pct(roi)} ${WINS.find(([k]) => k === state.win)?.[1] ?? ''} roi</span></span>` +
                `<span class="num">$${fmtCompact(r.v)}</span>` +
                `<span class="num ${cls2(r[state.win].pnl)}">${fmtSign(r[state.win].pnl)}</span>` +
                `<span class="num cvol">$${fmtCompact(r[state.win].vlm)}</span>` +
                `<span class="num cupl ${cls2(e?.upl)}">${e ? fmtSign(e.upl) : '…'}</span>` +
                `<span class="num cupct ${cls2(e?.uplPct)}">${e ? pct(e.uplPct) : '…'}</span>` +
                `<span class="cls">${e?.coins?.length ? `<span class="vsc-coins" title="${esc(e.coins.join(' · '))}">${e.coins.map(coinIconFor).join('')}</span>` : ''}` +
                `${e ? (e.cls === 'flat' ? '<i class="t3">flat</i>' : `<i class="${e.cls}">${e.cls === 'crypto' ? 'CRYPTO' : e.cls === 'tradfi' ? 'TRADFI' : 'MIX'}</i>`) : ''}</span>` +
                '</div>';
            }).join('') || `<div class="vgal-none">no ${esc(state.mode)} wallets in this slice yet — classification is still filling in</div>`);
        }

        const classify = (positions) => {
          if (!positions.length) return 'flat';
          let tf = 0;
          let total = 0;
          for (const p of positions) {
            const ntl = Math.abs(Number(p.positionValue) || 0);
            total += ntl;
            if (isTradfi(p.coin)) tf += ntl;
          }
          if (!(total > 0)) return 'flat';
          return tf / total >= 0.6 ? 'tradfi' : tf / total <= 0.4 ? 'crypto' : 'mix';
        };
        const digest = (ch, fallbackV) => {
          const positions = (ch?.assetPositions ?? []).map((p) => p.position).filter(Boolean);
          const upl = positions.reduce((a, p) => a + (Number(p.unrealizedPnl) || 0), 0);
          const value = Number(ch?.marginSummary?.accountValue) || fallbackV || 0;
          let ln = 0;
          let sn = 0;
          for (const p of positions) {
            const ntl = Math.abs(Number(p.positionValue) || 0);
            if (Number(p.szi) >= 0) ln += ntl; else sn += ntl;
          }
          const sorted = [...positions].sort((a, b) =>
            Math.abs(Number(b.positionValue) || 0) - Math.abs(Number(a.positionValue) || 0));
          return {
            upl, value, ln, sn, npos: positions.length, positions: sorted,
            uplPct: value > 0 ? upl / value : null,
            cls: classify(positions),
            coins: sorted.slice(0, 4).map((p) => p.coin),
            book: sorted.map((p) => [p.coin, (Number(p.szi) >= 0 ? 1 : -1) * Math.abs(Number(p.positionValue) || 0)]),
          };
        };
        async function enrichRows() {
          const run = ++enrichRun;
          const want = state.rows.filter((r) => !enrich.has(r.a));
          for (let i = 0; i < want.length && !dead && run === enrichRun; i += 8) {
            await Promise.allSettled(want.slice(i, i + 8).map(async (r) => {
              enrich.set(r.a, digest(await hlWalletState(r.a), r.v));
            }));
            if (!dead && run === enrichRun) paint();
          }
        }
        async function loadBoard() {
          state.loading = true;
          state.err = null;
          paint();
          try {
            const sort = ['upl', 'uplpct', 'value'].includes(state.sort) ? 'value' : state.sort;
            const j = await getJson(`/api/vice-hlboard?window=${state.win}&sort=${sort}&limit=80`, 45_000);
            if (dead) return;
            if (!j?.rows?.length) throw new Error('the leaderboard proxy returned nothing');
            state.rows = j.rows;
            state.loading = false;
            paint();
            enrichRows();
          } catch (e) {
            if (dead) return;
            state.loading = false;
            state.err = `leaderboard unreachable — ${e.message}`;
            paint();
          }
        }

        /* ── Tracked view: starred wallets, their LIVE books, trade alerts ── */
        const trackedState = new Map(); // addr -> digest
        function paintTracked() {
          if (state.view !== 'tracked') return;
          const alerts = readWalletAlerts();
          const feed = alerts.length
            ? alerts.slice(0, 20).map((a2) =>
              `<button class="vsc-al" data-a="${esc(a2.a)}" type="button">${coinIconFor(a2.coin ?? '')}` +
              `<span class="txt"><b>${esc(a2.who)}</b> ${esc(a2.what)}</span><span class="ago">${ago(a2.t)}</span></button>`).join('')
            : '<div class="vsc-none">quiet so far — alerts land here when a tracked trader fills an order</div>';
          const cards = starred.length ? starred.map((a2) => {
            const d = trackedState.get(a2);
            const row = state.rows.find((r) => r.a === a2);
            const head =
              `<div class="vsc-tw-head">${starBtn(a2)}<b>${esc(row?.n ?? shortA(a2))}</b>` +
              `${d ? `<span class="eq">$${fmtCompact(d.value)}</span><span class="upl ${cls2(d.upl)}">${fmtSign(d.upl)} upl</span>` : '<span class="eq">…</span>'}` +
              `<button class="hw-btn" data-open="${esc(a2)}" title="Full inspector"><i data-lucide="maximize-2"></i></button></div>`;
            const body2 = !d
              ? '<div class="vsc-none">reading the book…</div>'
              : (d.positions.length
                ? d.positions.slice(0, 6).map((p) => {
                  const sz = Number(p.szi);
                  const pnl = Number(p.unrealizedPnl) || 0;
                  return `<div class="vsc-r vsc-pos"><span class="who"><span class="wrow">${coinIconFor(p.coin)}<b>${esc(p.coin)}</b></span>` +
                    `<span class="sub ${sz >= 0 ? 'up' : 'down'}">${sz >= 0 ? 'long' : 'short'} ${esc(String(p.leverage?.value ?? ''))}x</span></span>` +
                    `<span class="num">$${fmtCompact(Math.abs(Number(p.positionValue) || 0))}</span>` +
                    `<span class="num">@ ${fmtPx(Number(p.entryPx))}</span>` +
                    `<span class="num ${cls2(pnl)}">${fmtSign(pnl)}</span></div>`;
                }).join('') + (d.positions.length > 6 ? `<div class="vsc-none">+ ${d.positions.length - 6} more — open the inspector</div>` : '')
                : '<div class="vsc-none">flat — no open perps</div>');
            return `<div class="vsc-tw">${head}${body2}</div>`;
          }).join('') : '';
          trackedEl.innerHTML =
            '<div class="vsc-cols">' +
            `<div class="vsc-col-main">${cards ||
              '<div class="vsc-teach"><i data-lucide="star"></i><p>Nothing tracked yet.</p><p class="d">Star any wallet on the leaderboard — its live positions appear here and every new fill fires an alert.</p></div>'}</div>` +
            `<div class="vsc-col-side"><div class="vsc-sec">trade alerts${alerts.length ? '<button class="vsc-clear" data-clear type="button">clear</button>' : ''}</div><div class="vsc-feed">${feed}</div></div>` +
            '</div>';
          icons();
        }
        async function loadTracked() {
          if (dead) return; // a stale toast closure must not resurrect the poller
          clearInterval(trackedTimer);
          const pull = async () => {
            await Promise.allSettled(readWalletWatch().map(async (a2) => {
              trackedState.set(a2, digest(await hlWalletState(a2)));
            }));
            if (!dead) paintTracked();
          };
          pull();
          trackedTimer = setInterval(pull, 60_000);
        }

        /* ── wallet inspector — works for any address ── */
        const drawerMounts = [];
        const closeWallet = () => {
          for (const h of drawerMounts.splice(0)) { try { h.destroy?.(); } catch { /* gone */ } }
          root.querySelector('.vsc-veil')?.remove();
        };
        async function openWallet(addr) {
          closeWallet();
          const veil = el('div', 'vgal-veil vsc-veil');
          const pane = el('div', 'vgal-drawer vsc-drawer');
          pane.setAttribute('role', 'dialog');
          pane.setAttribute('aria-modal', 'true');
          pane.setAttribute('aria-label', `Wallet ${shortA(addr)}`);
          pane.tabIndex = -1;
          veil.appendChild(pane);
          root.appendChild(veil);
          veil.addEventListener('click', (e) => { if (e.target === veil) closeWallet(); });
          const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeWallet(); } };
          document.addEventListener('keydown', onKey);
          // EVERY close path (veil, X, Esc, reopen, section teardown) reaps the
          // listener and hands focus back — closeWallet drains drawerMounts
          const prevFocus = document.activeElement;
          drawerMounts.push({ destroy() {
            document.removeEventListener('keydown', onKey);
            if (prevFocus?.isConnected) prevFocus.focus?.();
          } });
          pane.focus();
          const row = state.rows.find((r) => r.a === addr);
          pane.innerHTML =
            `<div class="vgal-d-head">${starBtn(addr, 'lg')}<b>${esc(row?.n ?? shortA(addr))}</b>` +
            `<button class="hw-btn" data-copy title="Copy address"><i data-lucide="copy"></i></button>` +
            `<a class="hw-btn" href="https://app.hyperliquid.xyz/explorer/address/${esc(addr)}" target="_blank" rel="noopener noreferrer" title="Hyperliquid explorer"><i data-lucide="external-link"></i></a>` +
            `<a class="hw-btn" href="https://etherscan.io/address/${esc(addr)}" target="_blank" rel="noopener noreferrer" title="Etherscan"><i data-lucide="link"></i></a>` +
            '<button class="hw-btn x" data-x title="Close"><i data-lucide="x"></i></button></div>' +
            '<div class="vsc-stats" data-stats></div>' +
            '<div class="vsc-sec">equity curve<span class="vgal-chips" data-eqwins></span></div>' +
            '<div class="vsc-eq" data-eq></div>' +
            '<div class="vsc-sec">open positions</div><div data-pos></div>' +
            '<div class="vsc-sec">recent closed pnl by coin</div><div data-closed></div>' +
            '<div class="vsc-sec">spot holdings</div><div data-spot></div>' +
            '<div class="vsc-sec">last fills</div><div data-fills></div>';
          icons();
          pane.querySelector('[data-x]').addEventListener('click', closeWallet);
          pane.querySelector('[data-copy]').addEventListener('click', () =>
            navigator.clipboard?.writeText(addr).then(() => toast('address copied')));
          pane.addEventListener('click', (ev) => {
            const sb = ev.target.closest('[data-star]');
            if (sb) onStar(sb);
          });
          const statsEl = pane.querySelector('[data-stats]');
          const stat = (label, val, cl = '') => `<span><label>${label}</label><b class="${cl}">${val}</b></span>`;
          statsEl.innerHTML = stat('equity', '…') + stat('upl', '…') + stat('win rate', '…') + stat('bias', '…');

          let eqChart = null;
          drawerMounts.push({ destroy() { eqChart?.dispose(); } });
          const eqBox = pane.querySelector('[data-eq]');
          const eqWins = pane.querySelector('[data-eqwins]');
          let eqData = null;
          let eqWin = 'month';
          const EQMAP = { day: '24h', week: '7d', month: '30d', allTime: 'all' };
          const paintEqWins = () => {
            eqWins.innerHTML = Object.entries(EQMAP).map(([k, lab]) =>
              `<button class="vpage-chip${eqWin === k ? ' on' : ''}" data-ew="${k}" type="button">${lab}</button>`).join('');
          };
          const drawEq = () => {
            if (!eqData || !window.echarts) return;
            const hist = (Object.fromEntries(eqData)[eqWin]?.accountValueHistory ?? []).map(([t, v]) => [t, Number(v)]);
            if (hist.length < 2) { eqBox.innerHTML = '<div class="vgal-none">no history for this window</div>'; eqChart?.dispose(); eqChart = null; return; }
            if (!eqChart) { eqBox.innerHTML = ''; eqChart = window.echarts.init(eqBox, null, { renderer: 'canvas' }); }
            const up = hist.at(-1)[1] >= hist[0][1];
            const c = up ? '#21d196' : '#ff6473';
            eqChart.setOption({
              backgroundColor: 'transparent',
              grid: { left: 8, right: 8, top: 10, bottom: 4, containLabel: true },
              tooltip: { ...TIP_BOX, trigger: 'axis', valueFormatter: (v) => `$${fmtCompact(v)}` },
              xAxis: { type: 'time', axisLabel: AXIS_LBL, axisLine: AXIS_LINE, splitLine: { show: false } },
              yAxis: { type: 'value', scale: true, axisLabel: { ...AXIS_LBL, formatter: (v) => `$${fmtCompact(v)}` }, splitLine: AXIS_SPLIT },
              series: [{
                type: 'line', data: hist, showSymbol: false,
                lineStyle: { width: 1.4, color: c }, itemStyle: { color: c },
                areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
                  { offset: 0, color: up ? 'rgba(33,209,150,0.32)' : 'rgba(255,100,115,0.32)' }, { offset: 1, color: 'rgba(0,0,0,0)' }] } },
              }],
            }, { notMerge: true });
          };
          eqWins.addEventListener('click', (ev) => {
            const b = ev.target.closest('[data-ew]');
            if (!b) return;
            eqWin = b.dataset.ew;
            paintEqWins();
            drawEq();
          });
          paintEqWins();

          const posEl = pane.querySelector('[data-pos]');
          const closedEl = pane.querySelector('[data-closed]');
          const spotEl = pane.querySelector('[data-spot]');
          const fillsEl = pane.querySelector('[data-fills]');
          const results = await Promise.allSettled([
            hlWalletState(addr),
            hlInfo({ type: 'portfolio', user: addr }),
            hlInfo({ type: 'userFills', user: addr }),
            hlInfo({ type: 'spotClearinghouseState', user: addr }),
          ]);
          if (root.querySelector('.vsc-veil') !== veil) return; // closed meanwhile
          const [ch, port, fills, spot] = results.map((r) => (r.status === 'fulfilled' ? r.value : null));

          const positions = (ch?.assetPositions ?? []).map((p) => p.position).filter(Boolean);
          const equity = Number(ch?.marginSummary?.accountValue) || null;
          const upl = positions.reduce((a, p) => a + (Number(p.unrealizedPnl) || 0), 0);
          const notional = positions.reduce((a, p) => a + Math.abs(Number(p.positionValue) || 0), 0);
          const longNtl = positions.reduce((a, p) => a + (Number(p.szi) > 0 ? Math.abs(Number(p.positionValue) || 0) : 0), 0);
          const closedFills = (Array.isArray(fills) ? fills : []).filter((f) => Number(f.closedPnl) !== 0);
          const wins = closedFills.filter((f) => Number(f.closedPnl) > 0).length;
          const bias = notional > 0 ? longNtl / notional : null;
          statsEl.innerHTML =
            stat('equity', equity != null ? `$${fmtCompact(equity)}` : '—') +
            stat('upl', `${fmtSign(upl)} (${equity > 0 ? pct(upl / equity) : '—'})`, cls2(upl)) +
            stat('exposure', notional ? `$${fmtCompact(notional)} · ${(notional / (equity || notional)).toFixed(1)}x` : 'flat') +
            stat('bias', bias == null ? '—' : `${Math.round(bias * 100)}% long`, bias == null ? '' : bias >= 0.5 ? 'up' : 'down') +
            stat('win rate', closedFills.length ? `${Math.round((wins / closedFills.length) * 100)}% of ${closedFills.length}` : '—');

          if (port) { eqData = port; drawEq(); } else eqBox.innerHTML = '<div class="vgal-none">portfolio history unreachable</div>';

          posEl.innerHTML = positions.length
            ? positions.sort((a, b) => Math.abs(Number(b.positionValue)) - Math.abs(Number(a.positionValue))).map((p) => {
              const sz = Number(p.szi);
              const pnl = Number(p.unrealizedPnl);
              return `<div class="vsc-r vsc-pos"><span class="who"><span class="wrow">${coinIconFor(p.coin)}<b>${esc(p.coin)}</b></span>` +
                `<span class="sub ${sz >= 0 ? 'up' : 'down'}">${sz >= 0 ? 'long' : 'short'} ${esc(String(p.leverage?.value ?? ''))}x</span></span>` +
                `<span class="num">$${fmtCompact(Math.abs(Number(p.positionValue) || 0))}</span>` +
                `<span class="num">@ ${fmtPx(Number(p.entryPx))}</span>` +
                `<span class="num ${cls2(pnl)}">${fmtSign(pnl)} (${pct(Number(p.returnOnEquity), 1)})</span></div>`;
            }).join('')
            : '<div class="vsc-none">no open perp positions</div>';

          const byCoin = {};
          for (const f of closedFills) (byCoin[f.coin] ??= { pnl: 0, n: 0 }), byCoin[f.coin].pnl += Number(f.closedPnl), byCoin[f.coin].n += 1;
          const topClosed = Object.entries(byCoin).sort((a, b) => Math.abs(b[1].pnl) - Math.abs(a[1].pnl)).slice(0, 6);
          closedEl.innerHTML = topClosed.length
            ? topClosed.map(([coin, o]) =>
              `<div class="vsc-r vsc-pos"><span class="who"><span class="wrow">${coinIconFor(coin)}<b>${esc(coin)}</b></span><span class="sub">${o.n} closing fills</span></span>` +
              `<span class="num ${cls2(o.pnl)}">${fmtSign(o.pnl)}</span></div>`).join('')
            : '<div class="vsc-none">no recent closed positions</div>';

          const bals = (spot?.balances ?? []).filter((b) => Number(b.total) > 0);
          spotEl.innerHTML = bals.length
            ? bals.map((b) => `<div class="vsc-r vsc-pos"><span class="who"><span class="wrow">${coinIconFor(b.coin)}<b>${esc(b.coin)}</b></span></span>` +
              `<span class="num">${fmtCompact(Number(b.total))}</span>` +
              `<span class="num t3">${Number(b.entryNtl) > 0 ? `in @ $${fmtCompact(Number(b.entryNtl))}` : ''}</span></div>`).join('')
            : '<div class="vsc-none">no spot holdings</div>';

          fillsEl.innerHTML = (Array.isArray(fills) ? fills : []).slice(0, 15).map((f) => {
            const pnl = Number(f.closedPnl);
            return `<div class="vsc-r vsc-pos"><span class="who"><span class="wrow">${coinIconFor(f.coin)}<b>${esc(f.coin)}</b></span>` +
              `<span class="sub">${esc(f.dir ?? (f.side === 'B' ? 'buy' : 'sell'))} · ${ago(Number(f.time))}</span></span>` +
              `<span class="num">${fmtCompact(Number(f.sz))} @ ${fmtPx(Number(f.px))}</span>` +
              `<span class="num ${pnl ? cls2(pnl) : 't3'}">${pnl ? fmtSign(pnl) : ''}</span></div>`;
          }).join('') || '<div class="vsc-none">no fills yet</div>';
        }

        /* ── wiring ── */
        const onStar = (btn) => {
          const a2 = btn.dataset.star;
          const nowOn = toggleWalletWatch(a2);
          starred = readWalletWatch();
          // dataset reads decode entities — the selector needs its own escaping
          document.querySelectorAll(`[data-star="${CSS.escape(a2)}"]`).forEach((b) => {
            b.classList.toggle('on', nowOn);
            b.setAttribute('aria-pressed', String(nowOn));
            b.title = nowOn ? 'Untrack this wallet' : 'Track this wallet — live positions + trade alerts';
          });
          paintViews();
          if (nowOn) { toast('tracking — live positions + trade alerts', { label: 'View', run: () => { state.view = 'tracked'; paintViews(); syncView(); } }); loadTracked(); }
          else if (state.view === 'tracked') paintTracked();
        };
        viewsEl.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-v]');
          if (!b) return;
          state.view = b.dataset.v;
          paintViews();
          syncView();
          if (state.view === 'board') paint();
        });
        modeEl.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-m]');
          if (!b) return;
          state.mode = b.dataset.m;
          paintBars();
          paint();
        });
        winEl.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-w]');
          if (!b) return;
          state.win = b.dataset.w;
          paintBars();
          loadBoard();
        });
        scroll.addEventListener('click', (ev) => {
          const sb = ev.target.closest('[data-star]');
          if (sb) { onStar(sb); return; }
          const th = ev.target.closest('.sortable');
          if (th) {
            const k = th.dataset.s;
            if (state.sort === k) state.dir = -state.dir;
            else { state.sort = k; state.dir = -1; }
            paint();
            return;
          }
          const r = ev.target.closest('.vsc-r.clickable');
          if (r?.dataset.a) openWallet(r.dataset.a);
        });
        // rows are focusable — Enter/Space must open them like a click would
        scroll.addEventListener('keydown', (ev) => {
          if (ev.key !== 'Enter' && ev.key !== ' ') return;
          const r = ev.target.closest?.('.vsc-r.clickable');
          if (!r?.dataset.a || ev.target.closest('button')) return;
          ev.preventDefault();
          openWallet(r.dataset.a);
        });
        trackedEl.addEventListener('click', (ev) => {
          const sb = ev.target.closest('[data-star]');
          if (sb) { onStar(sb); return; }
          if (ev.target.closest('[data-clear]')) {
            try { localStorage.removeItem(WALLET_ALERTS_KEY); } catch { /* fine */ }
            paintTracked();
            return;
          }
          const op = ev.target.closest('[data-open]');
          if (op) { openWallet(op.dataset.open); return; }
          const al = ev.target.closest('.vsc-al');
          if (al?.dataset.a) openWallet(al.dataset.a);
        });
        inp.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter') return;
          const a2 = inp.value.trim().toLowerCase();
          if (/^0x[0-9a-f]{40}$/.test(a2)) openWallet(a2);
          else toast('that doesn’t look like a wallet address (0x + 40 hex)');
        });
        paintViews();
        paintBars();
        syncView();
        paint();
        loadBoard();
        // deep link: #/scanner/0x… opens the inspector straight away
        if (scannerBootAddr) {
          const a2 = scannerBootAddr;
          scannerBootAddr = null;
          openWallet(a2);
        }
      },
    },
    // the storefront (audit C2 + owner ask): every element organized by
    // category, sketch thumbnails, live preview in an inspector drawer,
    // one-click add with on-board counts
    gallery: {
      title: 'Gallery', icon: 'shapes',
      render(root) {
        const wrap = el('div', 'vgal');
        root.appendChild(wrap);
        const intro = el('div', 'vgal-intro',
          `<b>Element Gallery</b><span>every block the Hub can render — click one for a live preview, add it to “${esc(store.active)}” in one click.</span>`);
        const bar = el('div', 'vgal-bar');
        const search = el('div', 'vgal-search', '<i data-lucide="search"></i>');
        const inp = document.createElement('input');
        inp.placeholder = 'Search elements…';
        inp.setAttribute('aria-label', 'Search elements');
        search.appendChild(inp);
        const chips = el('div', 'vgal-chips');
        bar.append(search, chips);
        const listEl = el('div', 'vgal-list');
        wrap.append(intro, bar, listEl);
        const CATS = ['All', 'Featured', 'Charts', 'Markets', 'Futures', 'Options', 'Screeners', 'News & data', 'Vice'];
        const FEATURED = ['vMetric', 'vChartPro', 'vPositioning', 'vScreener', 'news', 'vHeat', 'vLiqMap', 'vFunding', 'vFng'];
        let cat = 'All';
        let q = '';
        const onBoard = () => {
          const counts = {};
          for (const i of activeGrid()) counts[i.type] = (counts[i.type] ?? 0) + 1;
          return counts;
        };
        const card = (t, m, counts) =>
          `<button class="vgal-card" data-t="${t}" type="button" title="${esc(m.title)} — ${esc(m.desc)}">` +
          thumbSvg(WIDGET_THUMB[t]) +
          '<span class="vgal-main">' +
          `<span class="vgal-head"><b>${esc(m.title)}</b>` +
          (counts[t] ? `<span class="vgal-on">on board${counts[t] > 1 ? ` ×${counts[t]}` : ''}</span>` : '') +
          `<span class="vgal-badge${m.vice ? ' vice' : ''}">${m.vice ? 'Vice' : 'TV'}</span></span>` +
          `<span class="vgal-desc">${esc(m.desc)}</span>` +
          '</span>' +
          `<span class="vgal-add" data-add="${t}" role="button" aria-label="Add ${esc(m.title)}" title="Add to the dashboard"><i data-lucide="plus"></i></span>` +
          '</button>';
        const paintChips = () => {
          chips.innerHTML = CATS.map((c) =>
            `<button class="vpage-chip${c === cat ? ' on' : ''}" data-c="${esc(c)}" type="button">${esc(c === 'Vice' ? 'Vice originals' : c)}</button>`).join('');
        };
        const matches = () => {
          const ql = q.toLowerCase();
          return Object.entries(HUB_WIDGETS).filter(([t, m]) => {
            if (cat === 'Featured' && !FEATURED.includes(t)) return false;
            if (cat !== 'All' && cat !== 'Featured' && m.cat !== cat) return false;
            return !ql || `${m.title} ${m.desc} ${m.cat}`.toLowerCase().includes(ql);
          });
        };
        const paint = () => {
          const counts = onBoard();
          const list = matches();
          if (!list.length) { listEl.innerHTML = '<div class="vgal-none">nothing matches</div>'; return; }
          if (cat === 'All' && !q) {
            // grouped storefront: section headers keep 50 blocks scannable
            listEl.innerHTML = CATS.slice(2).map((c) => {
              const group = list.filter(([, m]) => m.cat === c);
              if (!group.length) return '';
              return `<div class="vgal-cat">${esc(c === 'Vice' ? 'Vice originals' : c)}<span>${group.length}</span></div>` +
                `<div class="vgal-grid">${group.map(([t, m]) => card(t, m, counts)).join('')}</div>`;
            }).join('');
          } else {
            listEl.innerHTML = `<div class="vgal-grid">${list.map(([t, m]) => card(t, m, counts)).join('')}</div>`;
          }
          icons();
        };
        /* inspector drawer: the card's live twin — one mount at a time */
        let drawer = null;
        const closeDrawer = () => {
          if (!drawer) return;
          try { drawer.handle?.destroy?.(); } catch { /* gone */ }
          drawer.veil.remove();
          document.removeEventListener('keydown', drawer.onKey);
          drawer = null;
        };
        const openDrawer = (t) => {
          const m = HUB_WIDGETS[t];
          if (!m) return;
          if (drawer?.t === t) { closeDrawer(); return; }
          closeDrawer();
          const veil = el('div', 'vgal-veil');
          const pane = el('div', 'vgal-drawer');
          pane.innerHTML =
            `<div class="vgal-d-head"><i data-lucide="${m.icon}"></i><b>${esc(m.title)}</b>` +
            `<span class="vgal-badge${m.vice ? ' vice' : ''}">${m.vice ? 'Vice original' : 'TradingView'}</span>` +
            '<button class="hw-btn" data-x title="Close"><i data-lucide="x"></i></button></div>' +
            '<div class="vgal-d-prev"></div>' +
            `<div class="vgal-d-desc">${esc(m.desc)}</div>` +
            '<div class="vgal-d-meta">' +
            `<span><label>data</label>${esc(srcFor(t, m))}</span>` +
            `<span><label>default size</label>${m.w}×${m.h} of 24 columns</span>` +
            `<span><label>category</label>${esc(m.cat)}</span>` +
            '</div>' +
            `<div class="vgal-d-foot"><button class="vgal-btn primary big" data-add="${t}" type="button"><i data-lucide="plus"></i>Add to “${esc(store.active)}”</button></div>`;
          veil.appendChild(pane);
          root.appendChild(veil);
          const prevBox = el('div', 'vgal-preview');
          pane.querySelector('.vgal-d-prev').appendChild(prevBox);
          let handle = {};
          try { handle = m.mount(prevBox, defaults(m), { id: 'preview', type: t, settings: {} }) ?? {}; }
          catch (e) { note(prevBox, 'alert-triangle', esc(e.message)); }
          pageMounts.push({ handle }); // section teardown reaps the live preview
          const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeDrawer(); } };
          document.addEventListener('keydown', onKey);
          veil.addEventListener('click', (e) => { if (e.target === veil) closeDrawer(); });
          pane.querySelector('[data-x]').addEventListener('click', closeDrawer);
          pane.querySelector('[data-add]').addEventListener('click', (e) => {
            pinInstance({ type: t, w: m.w, h: m.h, settings: {} });
            const b = e.currentTarget;
            b.innerHTML = '<i data-lucide="check"></i>Added — add another?';
            icons();
            paint();
          });
          drawer = { t, veil, handle, onKey };
          // section teardown must reap the drawer too — its document keydown
          // listener used to outlive the Gallery page
          pageMounts.push({ handle: { destroy: closeDrawer } });
          icons();
        };
        chips.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-c]');
          if (!b) return;
          cat = b.dataset.c;
          paintChips();
          paint();
        });
        inp.addEventListener('input', () => { q = inp.value.trim(); paint(); });
        listEl.addEventListener('click', (ev) => {
          const add = ev.target.closest('[data-add]');
          if (add) {
            ev.stopPropagation();
            const t = add.dataset.add;
            const m = HUB_WIDGETS[t];
            pinInstance({ type: t, w: m.w, h: m.h, settings: {} });
            paint();
            return;
          }
          const c = ev.target.closest('.vgal-card');
          if (c) openDrawer(c.dataset.t);
        });
        paintChips();
        paint();
      },
    },
  };


  function navSync() {
    document.querySelectorAll('#hub-nav a').forEach((a) => {
      const on = (a.dataset.sec ?? 'dash') === currentSection;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
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
    if (editing) $('#hub-edit').click(); // sections are static pages — Customize is dashboard business
    if (focusMode) exitFocus(false);
    if (name === 'scanner' && /^0x[0-9a-fA-F]{40}$/.test(sym ?? '')) scannerBootAddr = sym.toLowerCase();
    else if (sym && /^[A-Z0-9]{2,12}$/i.test(sym)) linkedSym = sym.toUpperCase();
    currentSection = name;
    document.body.classList.add('in-section');
    navSync();
    renderSection();
    window.scrollTo(0, 0); // a page switch starts at the top, never mid-scroll
  }

  function exitSection(rerender = true) {
    const was = currentSection !== 'dash';
    currentSection = 'dash';
    document.body.classList.remove('in-section');
    teardownPage();
    showCanvas('grid');
    navSync();
    if (rerender && was) { renderLayout(); window.scrollTo(0, 0); }
  }

  function applyRoute() {
    const [seg, arg] = location.hash.replace(/^#\/?/, '').split('/');
    const name = (seg ?? '').toLowerCase();
    if (SECTION_META[name]) enterSection(name, arg);
    else {
      // leaving via hash (brand link, back button): a live Focus board must
      // rerender to the dashboard, not linger as a ghost with focusMode off
      const wasFocus = focusMode;
      if (focusMode) exitFocus(false);
      exitSection(!wasFocus);
      if (wasFocus) { renderLayout(); window.scrollTo(0, 0); }
    }
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
    // live US stock/ETF search — the curated book only covers the majors;
    // "$NVDA" or "nvidia" should just work (TV scanner, market-cap ranked)
    let stockHits = [];
    let stockQ = '';
    let stockT = null;
    const searchStocks = (q) => {
      clearTimeout(stockT);
      if (!q || q.length < 2) { stockHits = []; stockQ = ''; return; }
      stockT = setTimeout(async () => {
        try {
          const r = await fetch('https://scanner.tradingview.com/america/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // simple request — no preflight
            body: JSON.stringify({
              filter: [{ left: 'name,description', operation: 'match', right: q }],
              columns: ['name', 'description', 'close', 'logoid', 'market_cap_basic'],
              sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
              range: [0, 6],
            }),
            signal: AbortSignal.timeout(6000),
          });
          const j = await r.json();
          stockHits = (j?.data ?? []).map((d) => ({
            tv: d.s, sym: d.d[0], name: d.d[1] ?? '', logoid: d.d[3], px: d.d[2],
          }));
          stockQ = q;
          build();
        } catch { /* scanner unreachable — curated book still answers */ }
      }, 220);
    };

    let flat = []; // [{html, run}] in render order
    let sel = 0;
    const build = () => {
      const q = input.value.trim().replace(/^\$/, '').toUpperCase();
      flat = [];
      const groups = [];
      const crypto = {
        title: 'DeFi',
        items: cryptoMatch(q).map((sym) => ({
          html: `${iconFor(sym)}<span class="fs-l">${esc(sym)}</span><span class="fs-sub">${esc(coinNames[sym] ?? 'Hyperliquid perp')}</span>`,
          run: () => enterFocus(sym),
        })),
      };
      const bookItems = tradfiMatch(q).map(([label, tv]) => ({
        html: `<i data-lucide="landmark"></i><span class="fs-l">${esc(label)}</span><span class="fs-sub">${esc(tv)}</span>`,
        run: () => enterFocus(tv, label),
      }));
      const liveItems = (q && q === stockQ ? stockHits : [])
        .filter((h) => !bookItems.some((b) => b.html.includes(`>${h.sym}<`)))
        .map((h) => ({
          html: `${h.logoid ? `<img class="fs-logo" src="https://s3-symbol-logo.tradingview.com/${esc(h.logoid)}.svg" alt="">` : '<i data-lucide="landmark"></i>'}` +
            `<span class="fs-l">${esc(h.sym)}</span><span class="fs-sub">${esc(h.name)}</span>`,
          run: () => enterFocus(h.tv, h.sym),
        }));
      const tradfi = { title: 'TradFi', items: [...liveItems, ...bookItems].slice(0, 8) };
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
    const refilter = () => {
      sel = 0;
      searchStocks(input.value.trim().replace(/^\$/, ''));
      build();
    };
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
      { icon: 'pencil', label: editing ? 'Done customizing' : 'Customize layout', run: () => { if (currentSection !== 'dash') location.hash = '#/'; $('#hub-edit').click(); } },
      { icon: 'wand-2', label: 'Tidy layout (pack + trim blank space)', run: () => { if (currentSection !== 'dash') location.hash = '#/'; setTimeout(tidyLayout, 100); } },
      ...Object.entries(HUB_WIDGETS).map(([t, m]) => ({
        icon: m.icon, label: `Add widget: ${m.title}`,
        run: () => {
          if (focusMode) exitFocus(); // adds are dashboard business, never the focus board
          if (currentSection !== 'dash') location.hash = '#/';
          if (!editing) $('#hub-edit').click();
          addInstance(t);
        },
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
        // never over an open modal OR drawer — stacked surfaces fight over Esc
        if (!document.querySelector('.hub-modal-veil, .vgal-veil')) openPalette();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const a = document.activeElement;
      const typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
      // drawers (gallery preview, wallet inspector, block inspector) own Esc
      if (typing || document.querySelector('.hub-modal-veil, .hub-palette-veil, .vgal-veil')) return;
      if (e.key === 'Escape') {
        if (document.querySelector('.hw-max')) unmaxAll();
        else if (editing) $('#hub-edit').click();
        return;
      }
      if (e.key === '/') { e.preventDefault(); openPalette(); }
      else if (e.key === '?') { e.preventDefault(); openShortcuts(); }
      // preventDefault: without it the released key lands as text in the
      // search input these shortcuts focus (F used to open pre-typed "f")
      else if (e.key.toLowerCase() === 'f') { e.preventDefault(); focusMode ? exitFocus() : openFocusSearch(); }
      else if (e.key.toLowerCase() === 'e') { e.preventDefault(); if (currentSection === 'dash' && !focusMode) $('#hub-edit').click(); }
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
      // geometry is LOCKED in view mode — Customize unlocks drag/resize.
      // (audit M3: always-live drag meant accidental shuffles on every misclick)
      staticGrid: true,
      resizable: { handles: 'n,e,s,w,ne,se,sw,nw' }, // any edge, any corner
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
      gridEl.style.setProperty('--hub-cell', `${cell}px`); // edit-grid guides track it
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

    // first-visit coach-mark: nothing on the page said it was editable (audit §6)
    let coachEl = null;
    const dismissCoach = (remember) => {
      coachEl?.remove();
      coachEl = null;
      if (remember) { try { localStorage.setItem('viceHub.coached', '1'); } catch { /* fine */ } }
    };
    if (!lsGet('viceHub.coached') && !storeRecovered) {
      coachEl = el('div', 'hub-coach',
        '<i data-lucide="hand"></i><span>This whole page is yours — drag, resize and add blocks with <b>Customize</b>.</span>');
      const gotIt = el('button', 'hub-coach-x', '<i data-lucide="x"></i>');
      gotIt.title = 'Got it';
      gotIt.addEventListener('click', () => dismissCoach(true));
      coachEl.appendChild(gotIt);
      $('.hub-main').insertBefore(coachEl, $('#hub-grid'));
    }

    const editBtn = $('#hub-edit');
    editBtn.addEventListener('click', () => {
      editing = !editing;
      document.body.classList.toggle('editing', editing);
      editBtn.classList.toggle('editing-on', editing);
      editBtn.innerHTML = editing
        ? '<i data-lucide="check"></i><span>Done</span>'
        : '<i data-lucide="pencil"></i><span>Customize</span>';
      grid.setStatic(!editing);
      if (editing) dismissCoach(true);
      else closeInspector(); // leaving Customize closes the inspector with it
      icons();
    });
    $('#hub-add').addEventListener('click', openTray);
    $('#hub-tidy')?.addEventListener('click', tidyLayout);
    $('#hub-pal')?.addEventListener('click', openPalette);
    $('#hub-focus')?.addEventListener('click', () => (focusMode ? exitFocus() : openFocusSearch()));
    $('#hub-empty-add')?.addEventListener('click', () => {
      if (!editing) $('#hub-edit').click();
      openTray();
    });
    // the shortcut lives in the tooltip (the bar stays quiet); platform-correct
    // combo via userAgentData first — navigator.platform is deprecated/empty in spots
    const isMac = /Mac|iPhone|iPad/i.test(navigator.userAgentData?.platform ?? navigator.platform ?? '');
    $('#hub-pal')?.setAttribute('title', `Command palette (${isMac ? '⌘K' : 'Ctrl K'})`);

    const menuBtn = $('#hub-more');
    const menu = $('#hub-menu');
    const syncBackupHint = () => {
      const hint = $('#hub-backup-hint');
      if (!hint) return;
      const t = store.meta?.lastExport;
      hint.textContent = t ? `backed up ${ago(t)}` : 'layouts live only in this browser';
    };
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
      syncBackupHint();
      // smart anchoring: when the wrapped bar parks ⋮ near the left edge, a
      // right-anchored menu rendered mostly off-screen — flip it
      if (menu.classList.contains('open')) {
        const r = menuBtn.getBoundingClientRect();
        menu.classList.toggle('flip', r.right - (menu.offsetWidth || 240) < 8);
      }
    });
    document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.classList.remove('open'); });

    menu.addEventListener('click', (e) => {
      const act = e.target.closest('[data-menu]')?.dataset.menu;
      if (!act) return;
      menu.classList.remove('open');
      if (act === 'new') {
        promptModal('New layout', 'My layout', (name) => {
          name = name.slice(0, 40);
          if (store.layouts[name]) { toast('a layout with that name already exists'); return; }
          store.layouts[name] = defaultLayout('DeFi');
          switchLayout(name);
          refreshLayoutSelect();
        });
      } else if (act === 'dup') {
        let name = `${store.active} copy`;
        while (store.layouts[name]) name += ' 2';
        store.layouts[name] = JSON.parse(JSON.stringify(store.layouts[store.active]));
        store.layouts[name].grid.forEach((i) => { i.id = uid(); });
        switchLayout(name);
        refreshLayoutSelect();
        toast(`duplicated as "${name}"`);
      } else if (act === 'rename') {
        promptModal('Rename layout', store.active, (name) => {
          name = name.slice(0, 40);
          if (name === store.active) return;
          if (store.layouts[name]) { toast('a layout with that name already exists'); return; }
          store.layouts[name] = store.layouts[store.active];
          delete store.layouts[store.active];
          store.active = name;
          persist();
          refreshLayoutSelect();
        });
      } else if (act === 'delete') {
        if (Object.keys(store.layouts).length <= 1) { toast("can't delete the last layout"); return; }
        confirmModal('Delete layout', `Delete "${store.active}" permanently? Its blocks and their settings go with it.`, true, () => {
          if (focusMode) exitFocus(false); // never rebuild the canvas under a live focus board
          delete store.layouts[store.active];
          store.active = Object.keys(store.layouts)[0];
          persist();
          refreshLayoutSelect();
          renderLayout();
        });
      } else if (act === 'reset') {
        confirmModal('Reset layout', `Put "${store.active}" back to its default arrangement? Blocks you added here will be removed.`, false, () => {
          if (focusMode) exitFocus(false);
          store.layouts[store.active] = defaultLayout(PRESETS[store.active] ? store.active : 'DeFi');
          persist();
          renderLayout();
        });
      } else if (act === 'export') {
        exportLayout();
      } else if (act === 'exportall') {
        exportAll();
      } else if (act === 'keys') {
        openShortcuts();
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
    startWakeRefresh();
    startWalletAlerts();
    // staleness sweep: chart widgets stamp data-fresh-at on every good draw;
    // one gone quiet past ~2.5× its cadence wears an amber header dot
    setInterval(() => {
      document.querySelectorAll('.hw[data-fresh-at], .vpanel[data-fresh-at]').forEach((hw) => {
        const after = Number(hw.dataset.staleAfter) || 300_000;
        hw.classList.toggle('hw-stale', Date.now() - Number(hw.dataset.freshAt) > after);
      });
    }, 15_000);
    icons();
    // B6: recovery must never be silent — the store existed and couldn't be read
    if (storeRecovered) {
      toast("your saved layouts couldn't be read — started fresh (a copy was kept)",
        { label: 'Import a backup', run: () => $('#hub-import')?.click() }, 12000);
    } else {
      maybeNudgeBackup();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
