/* Vice Hub — customizable live market dashboard. v1.0.0
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
  const fetchMarkets = async () => {
    const rows = await viaProxy('/api/vice-movers', async () => {
      const raw = await getJson('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h');
      return raw.map((c) => ({ s: (c.symbol || '').toUpperCase(), n: c.name, p: c.current_price, c24: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? null, mc: c.market_cap, img: c.image ?? null }));
    });
    registerIcons(rows);
    return rows;
  };

  /* ── linked symbols: click a row anywhere → linked widgets follow ───── */
  const TV_SYM = { BTC: 'BITSTAMP:BTCUSD', ETH: 'BITSTAMP:ETHUSD' };
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
    if (hits) toast(`linked ${hits} block${hits === 1 ? '' : 's'} to ${linkedSym}`);
  }
  const rowLinker = (container) => container.addEventListener('click', (ev) => {
    const r = ev.target.closest('.vrow.clickable');
    if (r?.dataset.sym) linkSymbol(r.dataset.sym);
  });

  /* ── widget registry ────────────────────────────────────────────────── */
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
          'BITSTAMP:BTCUSD, BITSTAMP:ETHUSD, CRYPTO:SOLUSD, CRYPTO:XRPUSD, CRYPTO:BNBUSD, CRYPTO:DOGEUSD, CRYPTO:ADAUSD, CRYPTO:HYPEUSD'),
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
            { s: 'CRYPTO:ZECUSD', d: 'Zcash' }, { s: 'CRYPTO:HYPEUSD', d: 'Hyperliquid' } ] },
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
      title: 'Funding & OI', icon: 'percent', cat: 'Vice', vice: true,
      w: 10, h: 7, minW: 5, minH: 4,
      settings: [
        F.sel('mode', 'Rows', 'watchlist', [['watchlist', 'My watchlist'], ['top', 'Top by open interest']]),
        F.num('count', 'Max rows', 10, 4, 20),
      ],
      label: (s) => s.only ?? (s.mode === 'top' ? 'top OI' : 'watchlist'),
      mount(body, s) {
        const scroll = el('div', 'vw-scroll');
        body.appendChild(scroll);
        const readShared = () => { try { return JSON.parse(localStorage.getItem(LS_WATCH)) ?? []; } catch { return []; } };
        // 8h funding across venues: HL (live feed, hourly ×8), OKX (per-symbol,
        // CORS everywhere), Binance + Bybit (bulk — geo-blocked for US visitors,
        // their columns show — there)
        const rates = { okx: {}, bin: {}, byb: {} };
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
            '<div class="vrow vrow-h"><span class="vic-slot"></span><span class="sym">sym</span><span class="name"></span>' +
            '<span class="chg fr">hl</span><span class="chg fr cokx">okx</span><span class="chg fr cbin">bin</span>' +
            '<span class="chg fr cbyb">byb</span><span class="chg coi">open int</span></div>' +
            syms.slice(0, s.only ? 1 : s.count).map((sym) => {
              const q = map[sym];
              return `<div class="vrow clickable" data-sym="${esc(sym)}" title="Link charts to ${esc(sym)}">` +
                `<span class="vic-slot">${iconFor(sym)}</span><span class="sym">${esc(sym)}</span><span class="name"></span>` +
                cell(Number.isFinite(q?.funding) ? q.funding * 8 : null, '') +
                cell(rates.okx[sym], 'cokx') + cell(rates.bin[sym], 'cbin') + cell(rates.byb[sym], 'cbyb') +
                `<span class="chg coi">$${fmtCompact(q ? q.oi * q.px : null)}</span></div>`;
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
        F.tog('clean', 'Hide stablecoins & wrapped assets', true),
      ],
      label: (s) => `top ${s.count}`,
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
          const list = rows.filter((c) => c.mc && (!s.clean || !NOISE.has(c.s))).slice(0, Number(s.count));
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
      P('tvTape', 0, 0, 24, 2, { symbols: 'BITSTAMP:BTCUSD, BITSTAMP:ETHUSD, CRYPTO:SOLUSD, CRYPTO:XRPUSD, CRYPTO:BNBUSD, CRYPTO:DOGEUSD, CRYPTO:ADAUSD, CRYPTO:HYPEUSD, CRYPTO:ZECUSD' }),
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
    head.innerHTML = `<i data-lucide="${man.icon}"></i><span class="hw-title">${esc(man.title)}</span>` +
      '<span class="hw-btns">' +
      '<button class="hw-btn" data-act="refresh" title="Refresh"><i data-lucide="rotate-cw"></i></button>' +
      (man.settings?.length ? '<button class="hw-btn" data-act="settings" title="Settings"><i data-lucide="settings-2"></i></button>' : '') +
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
      } else if (act === 'remove') removeInstance(inst.id);
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
    if (focusMode) { // focus boards are ephemeral — no trash, no undo, no store
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
    const cats = ['Charts', 'Markets', 'Screeners', 'News & data', 'Vice'];
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
    if (rerender) renderLayout();
    icons();
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
    // columns (mobile), or we'd overwrite the desktop layout
    grid.on('change', (ev, items) => {
      if (grid.getColumn() !== GRID_COLS || !items) return;
      const g = activeGrid();
      for (const n of items) {
        const id = n.id ?? n.el?.dataset.hid;
        const inst = g.find((x) => x.id === id);
        if (inst) { inst.x = n.x; inst.y = n.y; inst.w = n.w; inst.h = n.h; }
      }
      persist();
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
        store.layouts[name] = defaultLayout('Crypto');
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
    renderLayout();
    startTitleTicker();
    startShortcuts();
    icons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
