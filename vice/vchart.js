/* Vice Chart Pro — the hub's own chart engine. v1.6.0
   Velo-style: candles + stacked indicator panes + an order-book depth
   heatmap (Toggle Heatmap). All indicators are our own implementations of
   the <Velo> set (docs.velo.xyz/web-app/chart), fed by the same sources the
   hub's analytics widgets already use: Hyperliquid (candles incl. trade
   count, funding), /api/vice-coinalyze (multi-venue OI / funding /
   liquidations / volume / CVD, hourly), Coinbase + Kraken spot legs.
   PATH RULE: lives in vice/ ROOT, loaded as ../vchart.js.
   Exposes window.VChartPro = { mount(body, opts) }. */
(() => {
  'use strict';

  /* ── shared helpers ─────────────────────────────────────────────────── */
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtPx = (v) => {
    if (v == null || !Number.isFinite(v)) return '—';
    const abs = Math.abs(v);
    if (abs > 0 && abs < 0.001) return v.toLocaleString('en-US', { maximumSignificantDigits: 3 });
    const digits = abs >= 1000 ? 1 : abs >= 10 ? 2 : abs >= 0.1 ? 4 : 6;
    return v.toLocaleString('en-US', { maximumFractionDigits: digits });
  };
  const fmtCompact = (v) => {
    if (v == null || !Number.isFinite(v)) return '—';
    const a = Math.abs(v);
    const s = v < 0 ? '-' : '';
    if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `${s}${(a / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `${s}${(a / 1e3).toFixed(1)}K`;
    return fmtPx(v);
  };
  const fmtUsd = (v) => (v == null || !Number.isFinite(v) ? '—' : `${v < 0 ? '-' : ''}$${fmtCompact(Math.abs(v))}`);

  async function getJson(url, ms = 10000, init) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
    if (!res.ok) throw new Error(`${new URL(url, location.href).host} HTTP ${res.status}`);
    return res.json();
  }
  const hlInfo = (payload) => getJson('https://api.hyperliquid.xyz/info', 9000, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });

  /* ── theme (matches the hub's panel look) ───────────────────────────── */
  const C = {
    up: '#21d196', down: '#ff6473', upSoft: 'rgba(33,209,150,0.5)', downSoft: 'rgba(255,100,115,0.5)',
    text: '#8b85a3', textStrong: '#f6f5fb', grid: 'rgba(139,133,163,0.10)', axis: '#2a2440',
    accent: '#b47aff', mono: 'Geist Mono, monospace',
    venue: { HL: '#2dd4bf', OKX: '#38bdf8', BIN: '#f0b90b', BYB: '#b47aff', DER: '#e7b53a' },
    lines: ['#e7b53a', '#5aa7f7', '#b47aff', '#2dd4bf', '#ff5ccb', '#f97316'],
  };
  const AXIS_LBL = { color: C.text, fontFamily: C.mono, fontSize: 10 };
  const TIP = {
    backgroundColor: '#0d0b18', borderColor: '#363049', borderWidth: 1, padding: [8, 11],
    textStyle: { color: C.textStrong, fontFamily: C.mono, fontSize: 11.5 },
  };

  /* ── timeframes ─────────────────────────────────────────────────────── */
  /* Timeframes: any Nm/Nh/Nd/Nw plus 1mo. Non-native intervals (10m, 6h,
     45m…) aggregate client-side from the largest Hyperliquid interval that
     divides them. */
  const TF_UNIT_MS = { m: 60e3, h: 3.6e6, d: 86.4e6, w: 604.8e6 };
  function parseTf(raw) {
    const s = String(raw ?? '').trim().toLowerCase();
    if (s === '1mo') return { key: '1mo', label: '1M', ms: 2592e6, base: '1M', agg: 1 };
    const m = /^(\d{1,3})([mhdw])$/.exec(s);
    if (!m) return null;
    const n = Number(m[1]);
    const u = m[2];
    if (!(n >= 1)) return null;
    const ms = n * TF_UNIT_MS[u];
    if (ms < 60e3 || ms > 92 * 86.4e6) return null;
    const bases = { m: [30, 15, 5, 3, 1], h: [12, 8, 4, 2, 1], d: [3, 1], w: [1] }[u];
    const b = bases.find((x) => n % x === 0) ?? bases[bases.length - 1];
    const base = u === 'd' ? (b === 3 ? '3d' : '1d') : u === 'w' ? '1w' : `${b}${u}`;
    const label = u === 'd' ? `${n}D` : u === 'w' ? `${n}W` : `${n}${u}`;
    return { key: `${n}${u}`, label, ms, base, agg: n / b };
  }
  const tfMsOf = (tf) => parseTf(tf)?.ms ?? 3.6e6;
  const tfLabel = (tf) => parseTf(tf)?.label ?? tf;
  const TF_GROUPS = [
    ['MINUTES', ['1m', '5m', '10m', '15m', '30m']],
    ['HOURS', ['1h', '2h', '4h', '6h', '12h']],
    ['DAYS', ['1d', '1w', '1mo']],
  ];
  const DEFAULT_TF_FAVS = ['5m', '15m', '1h', '4h', '1d'];
  // candle window — sized so the venue aggregates (30d max on the free
  // Coinalyze tier) cover most of what's on screen
  function barsFor(ms) {
    const days = ms / 86.4e6;
    if (ms < 3.6e6) return 620;
    if (ms < 86.4e6) return Math.max(200, Math.min(620, Math.round(70 / days)));
    if (ms < 604.8e6) return 365;
    if (ms < 2592e6) return 156;
    return 60;
  }
  // merge fine candles into coarser buckets (10m from 5m, 6h from 2h, …)
  function aggBars(rows, ms) {
    const out = new Map();
    for (const k of rows) {
      const t = Math.floor(k.t / ms) * ms;
      const a = out.get(t);
      if (!a) out.set(t, { t, o: k.o, h: k.h, l: k.l, c: k.c, v: k.v, n: k.n ?? 0 });
      else { a.c = k.c; a.h = Math.max(a.h, k.h); a.l = Math.min(a.l, k.l); a.v += k.v; a.n += k.n ?? 0; }
    }
    return [...out.values()].sort((x, y) => x.t - y.t);
  }
  const YR_MS = 31_536_000_000;

  /* ── data: candles ──────────────────────────────────────────────────── */
  async function hlCandles(sym, tf, sinceMs) {
    const rows = await hlInfo({
      type: 'candleSnapshot',
      req: { coin: sym, interval: parseTf(tf).base, startTime: sinceMs, endTime: Date.now() },
    });
    if (!Array.isArray(rows) || !rows.length) return null;
    const def = parseTf(tf);
    const mapped = rows.map((k) => ({
      t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v, n: +k.n || 0,
    }));
    return def.agg > 1 ? aggBars(mapped, def.ms) : mapped;
  }
  // Coinbase spot legs (premium / spot volume). 4h aggregated from 1h.
  const cbGranFor = (ms) => [86400, 3600, 900, 300, 60].find((g) => g * 1000 <= ms && ms % (g * 1000) === 0) ?? 60;
  const spotCache = new Map(); // `${venue}:${sym}:${tf}` -> {t, p} (60s)
  function spotCached(venue, sym, tf, fn) {
    const key = `${venue}:${sym}:${tf}`;
    const hit = spotCache.get(key);
    if (hit && Date.now() - hit.t < 60_000) return hit.p;
    const p = fn();
    p.catch(() => spotCache.set(key, { t: Date.now() - 30_000, p }));
    spotCache.set(key, { t: Date.now(), p });
    return p;
  }
  const cbCandles = (sym, tf, sinceMs) => spotCached('cb', sym, tf, () => cbCandlesRaw(sym, tf, sinceMs));
  async function cbCandlesRaw(sym, tf, sinceMs) {
    const tfms = tfMsOf(tf);
    const gran = cbGranFor(tfms);
    const out = [];
    let end = Date.now();
    for (let page = 0; page < 4 && end > sinceMs; page++) {
      const start = Math.max(sinceMs, end - gran * 1000 * 300);
      const rows = await getJson(
        `https://api.exchange.coinbase.com/products/${sym}-USD/candles?granularity=${gran}` +
        `&start=${new Date(start).toISOString()}&end=${new Date(end).toISOString()}`, 9000,
      ).catch(() => null);
      if (!Array.isArray(rows) || !rows.length) break;
      out.unshift(...rows.reverse().map((r) => ({ t: r[0] * 1000, l: r[1], h: r[2], o: r[3], c: r[4], v: r[5] })));
      end = start;
    }
    if (!out.length) return null;
    return gran * 1000 === tfms ? out : aggBars(out, tfms);
  }
  // Kraken spot (volume + per-bar trade COUNT — the one spot venue that serves it)
  const krIntFor = (ms) => [1440, 240, 60, 30, 15, 5, 1].find((i) => i * 60e3 <= ms) ?? 1;
  const KR_BASE = { BTC: 'XBT', DOGE: 'XDG' };
  const krCandles = (sym, tf) => spotCached('kr', sym, tf, () => krCandlesRaw(sym, tf));
  async function krCandlesRaw(sym, tf) {
    const tfms = tfMsOf(tf);
    const iv = krIntFor(tfms);
    const j = await getJson(`https://api.kraken.com/0/public/OHLC?pair=${KR_BASE[sym] ?? sym}USD&interval=${iv}`, 9000).catch(() => null);
    if (!j || j.error?.length) return null;
    const key = Object.keys(j.result ?? {}).find((k) => k !== 'last');
    if (!key) return null;
    const rows = j.result[key].map((r) => ({ t: r[0] * 1000, o: +r[1], h: +r[2], l: +r[3], c: +r[4], v: +r[6], n: +r[7] || 0 }));
    return iv * 60e3 === tfms ? rows : aggBars(rows, tfms);
  }

  /* ── data: Coinalyze kinds (shared, cached) ─────────────────────────── */
  // hourly per-venue series via /api/vice-coinalyze — one fetch feeds every
  // indicator that needs the kind for 2 minutes (edge cache does the rest)
  const czCache = new Map(); // `${kind}:${sym}:${days}` -> {t, p:Promise}
  function czKind(kind, sym, days) {
    const key = `${kind}:${sym}:${days}`;
    const hit = czCache.get(key);
    if (hit && Date.now() - hit.t < 120_000) return hit.p;
    const p = getJson(`/api/vice-coinalyze?kind=${kind}&sym=${sym}&days=${days}`, 12000)
      .then((j) => {
        if (j?.noKey) throw new Error('venue aggregates need the API key');
        return j?.venues ?? [];
      });
    // failures keep the entry for 60s — deleting it made every 5s tick refire
    p.catch(() => czCache.set(key, { t: Date.now() - 60_000, p }));
    czCache.set(key, { t: Date.now(), p });
    return p;
  }

  /* ── resampling: hourly venue series → chart bars ───────────────────── */
  // step: last value at-or-before each bar close (stocks: OI, rates)
  function stepTo(times, tfMs, pts, col = 1) {
    const out = new Array(times.length).fill(null);
    let j = 0;
    let last = null;
    for (let i = 0; i < times.length; i++) {
      const end = times[i] + tfMs;
      while (j < pts.length && pts[j][0] < end) { last = pts[j][col]; j++; }
      out[i] = last;
    }
    return out;
  }
  // sum: flows (volume, liqs, delta) falling inside each bar. Hourly points
  // on sub-hour charts get smeared evenly so nothing double-counts.
  function sumTo(times, tfMs, pts, col = 1, srcMs = 3.6e6) {
    const out = new Array(times.length).fill(null);
    if (!pts.length) return out;
    let j = 0;
    for (let i = 0; i < times.length; i++) {
      const t0 = times[i];
      const t1 = t0 + tfMs;
      let acc = null;
      if (tfMs < srcMs) {
        // weight EVERY overlapping source point by its true overlap with the
        // bar — a fixed first-point fraction double-counted on TFs that don't
        // divide the source hour (45m bars showed 150%/75% hours)
        while (j < pts.length && pts[j][0] + srcMs <= t0) j++;
        for (let k = j; k < pts.length && pts[k][0] < t1; k++) {
          const ov = Math.min(t1, pts[k][0] + srcMs) - Math.max(t0, pts[k][0]);
          if (ov > 0) acc = (acc ?? 0) + (pts[k][col] ?? 0) * (ov / srcMs);
        }
      } else {
        while (j < pts.length && pts[j][0] < t0) j++;
        while (j < pts.length && pts[j][0] < t1) { acc = (acc ?? 0) + (pts[j][col] ?? 0); j++; }
      }
      out[i] = acc;
    }
    return out;
  }
  const sumVenues = (venues, times, tfMs, col = 1) => {
    const out = new Array(times.length).fill(null);
    for (const v of venues) {
      const s = sumTo(times, tfMs, v.points, col);
      for (let i = 0; i < out.length; i++) if (s[i] != null) out[i] = (out[i] ?? 0) + s[i];
    }
    return out;
  };

  /* ── indicator math ─────────────────────────────────────────────────── */
  const sma = (xs, p) => xs.map((_, i) => {
    if (i < p - 1) return null;
    let s = 0;
    for (let j = i - p + 1; j <= i; j++) s += xs[j];
    return s / p;
  });
  function ema(xs, p) {
    const k = 2 / (p + 1);
    const out = new Array(xs.length).fill(null);
    let prev = null;
    for (let i = 0; i < xs.length; i++) {
      prev = prev == null ? xs[i] : xs[i] * k + prev * (1 - k);
      if (i >= p - 1) out[i] = prev;
    }
    return out;
  }
  function vwapSeries(bars) {
    const out = [];
    let pv = 0;
    let vv = 0;
    for (const k of bars) {
      const typ = (k.h + k.l + k.c) / 3;
      pv += typ * k.v; vv += k.v;
      out.push(vv > 0 ? pv / vv : null);
    }
    return out;
  }

  /* ── the <Velo> indicator registry ──────────────────────────────────── */
  // Each def: title (legend row), pane 'price'|'sub', opts (settings schema),
  // load(ctx, s) -> data, series(ctx, s, d, grid) -> echarts fragments,
  // value(d, i) -> legend value at bar i. Footnotes stay honest about
  // sources — no venue we can't actually serve.
  const FUND_WIN = [['1h', '1 Hour'], ['8h', '8 Hours'], ['24h', '24 Hours'], ['1y', 'Annualized']];
  const FUND_DIV = { '1h': 8760, '8h': 1095, '24h': 365, '1y': 1 };
  const fundScale = (apr, win) => (apr == null ? null : apr / FUND_DIV[win]);
  // free-tier depth: oi/liqs/volume 30d, funding 14d, cvd 7d
  const czDays = (tf) => (tfMsOf(tf) < 3.6e6 ? 7 : 30);
  const fundDays = (tf) => (tfMsOf(tf) < 3.6e6 ? 7 : 14);

  // short settings label per instance — "which EMA is this" at a glance
  const TAGS = {
    ma: (s) => (s.type === 'vwap' ? 'VWAP' : `${s.type === 'oiwma' ? 'OIWMA' : s.type.toUpperCase()} ${s.len}`),
    cme_gaps: (s) => (s.show === 'all' ? 'all gaps' : 'unfilled'),
    agg_funding: (s) => s.win,
    funding: (s) => `${s.venue} · ${s.win}`,
    oi: (s) => s.venue,
    liqs: (s) => s.venue,
    agg_liqs: (s) => (s.side === 'both' ? '' : s.side),
    agg_oi: (s) => (s.mode === 'stack' ? 'venues' : s.mode),
    agg_vol: (s) => (s.mode === 'stack' ? 'venues' : s.mode),
    vol: (s) => (s.units === 'coin' ? 'coins' : '$'),
    premium: (s) => (s.units === 'usd' ? '$' : '%'),
    cb_premium: (s) => (s.units === 'usd' ? '$' : '%'),
    tape: (s) => (s.mode === 'speed' ? 'per min' : ''),
    spot_tape: (s) => (s.mode === 'speed' ? 'per min' : ''),
    returns: (s) => `${s.n} bar${s.n === '1' ? '' : 's'} · ${s.units === 'abs' ? 'abs' : '%'}`,
    rvol: (s) => `${s.win} bars`,
  };
  const INDICATORS = {
    ma: {
      title: 'Moving Average', pane: 'price',
      opts: [
        ['type', 'Type', 'ema', [['sma', 'SMA'], ['ema', 'EMA'], ['vwap', 'VWAP'], ['oiwma', 'OI-weighted MA']]],
        ['len', 'Length', '50', [['20', '20'], ['50', '50'], ['100', '100'], ['200', '200']]],
      ],
      async load(ctx, s) {
        const closes = ctx.bars.map((k) => k.c);
        const p = Number(s.len);
        if (s.type === 'sma') return { line: sma(closes, p), lbl: `SMA ${p}` };
        if (s.type === 'ema') return { line: ema(closes, p), lbl: `EMA ${p}` };
        if (s.type === 'vwap') return { line: vwapSeries(ctx.bars), lbl: 'VWAP' };
        // OI-weighted rolling average price (position-cost data isn't public;
        // this weights price by aggregate OI, the honest free approximation)
        const venues = await czKind('oi', ctx.sym, czDays(ctx.tf));
        const oi = sumVenues(venues.map((v) => ({ points: v.points })), ctx.times, ctx.tfMs) // step would be righter
          .map((v, i) => v ?? null);
        const out = new Array(closes.length).fill(null);
        for (let i = 0; i < closes.length; i++) {
          if (i < p - 1) continue;
          let sw = 0;
          let ww = 0;
          for (let j = i - p + 1; j <= i; j++) { const w = oi[j] ?? 1; sw += closes[j] * w; ww += w; }
          out[i] = ww > 0 ? sw / ww : null;
        }
        return { line: out, lbl: `OIWMA ${p}` };
      },
      series(ctx, s, d, grid) {
        return [{ name: d.lbl, type: 'line', xAxisIndex: grid.x, yAxisIndex: grid.y, data: d.line, showSymbol: false, z: 4, lineStyle: { color: grid.color, width: 1.4 }, itemStyle: { color: grid.color } }];
      },
      value: (d, i) => fmtPx(d.line[i]),
    },

    cme_gaps: {
      title: 'CME Gaps', pane: 'price',
      opts: [
        ['show', 'Show', 'open', [['open', 'Unfilled only'], ['all', 'Unfilled + filled']]],
        ['span', 'Look back', '180', [['90', '3 months'], ['180', '6 months'], ['365', '1 year']]],
      ],
      note: 'CME halts Fri 16:00, reopens Sun 17:00 America/Chicago — the gap is spot’s move across the halt; it clears when price trades back to the Friday close',
      async load(ctx, s) {
        // gap edges need hourly precision regardless of the chart TF
        const hours = await hlCandles(ctx.sym, '1h', Date.now() - Number(s.span) * 86_400_000);
        if (!hours?.length) throw new Error('no hourly history for gap detection');
        const chi = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: '2-digit', hour12: false });
        const key = (t) => {
          const p = chi.formatToParts(t).reduce((a, x) => ({ ...a, [x.type]: x.value }), {});
          return `${p.weekday}-${Number(p.hour) % 24}`;
        };
        const gaps = [];
        let fri = null;
        for (const k of hours) {
          const kk = key(k.t);
          if (kk === 'Fri-15') fri = k.c;
          else if (kk === 'Sun-17' && fri != null) {
            const pctG = ((k.o - fri) / fri) * 100;
            if (Math.abs(pctG) >= 0.1) gaps.push({ from: fri, to: k.o, t: k.t, up: k.o > fri, pct: pctG, filledAt: null });
            fri = null;
          }
          for (const g of gaps) {
            if (g.filledAt || k.t <= g.t) continue;
            if (g.up ? k.l <= g.from : k.h >= g.from) g.filledAt = k.t;
          }
        }
        const unfilled = gaps.filter((g) => !g.filledAt);
        const px = hours[hours.length - 1].c;
        const near = unfilled.length
          ? unfilled.reduce((a, g) => (Math.abs((g.from + g.to) / 2 - px) < Math.abs((a.from + a.to) / 2 - px) ? g : a))
          : null;
        return { gaps, unfilled, near };
      },
      series(ctx, s, d, grid) {
        const idxAt = (t) => {
          const i = ctx.times.findIndex((bt) => bt + ctx.tfMs > t);
          return i < 0 ? ctx.times.length - 1 : i;
        };
        const last = ctx.times.length - 1;
        const areas = [];
        for (const g of d.gaps) {
          const open = !g.filledAt;
          if (!open && s.show !== 'all') continue;
          const i1 = open ? last : idxAt(g.filledAt);
          if (!open && g.filledAt < ctx.times[0]) continue; // closed before the window
          const i0 = g.t < ctx.times[0] ? 0 : idxAt(g.t);
          areas.push([{
            xAxis: i0, yAxis: Math.min(g.from, g.to),
            itemStyle: open
              ? { color: g.up ? 'rgba(0,212,212,0.12)' : 'rgba(255,46,136,0.11)', borderColor: g.up ? 'rgba(0,212,212,0.5)' : 'rgba(255,46,136,0.5)', borderWidth: 1, borderType: 'dashed' }
              : { color: 'rgba(139,133,163,0.07)', borderColor: 'rgba(139,133,163,0.22)', borderWidth: 1, borderType: 'dashed' },
          }, { xAxis: i1, yAxis: Math.max(g.from, g.to) }]);
        }
        return [{
          name: 'CME gaps', type: 'line', xAxisIndex: grid.x, yAxisIndex: grid.y,
          data: [], silent: true, markArea: { silent: true, data: areas },
        }];
      },
      value: (d) => (d.unfilled.length
        ? `${d.unfilled.length} unfilled · nearest ${fmtPx(Math.min(d.near.from, d.near.to))}–${fmtPx(Math.max(d.near.from, d.near.to))}`
        : 'none unfilled'),
    },

    total_return: {
      title: 'Total Return', pane: 'price',
      note: 'perp long value incl. funding paid — OI-weighted aggregated funding',
      async load(ctx) {
        const [fv, ov] = await Promise.all([
          czKind('funding', ctx.sym, fundDays(ctx.tf)),
          czKind('oi', ctx.sym, czDays(ctx.tf)),
        ]);
        const apr = aggFundingApr(ctx, fv, ov);
        const closes = ctx.bars.map((k) => k.c);
        const perBar = ctx.tfMs / YR_MS;
        const line = new Array(closes.length).fill(null);
        let v = closes[0];
        line[0] = v;
        for (let i = 1; i < closes.length; i++) {
          const r = closes[i] / closes[i - 1] - 1;
          const f = ((apr[i] ?? 0) / 100) * perBar;
          v *= 1 + r - f;
          line[i] = v;
        }
        return { line };
      },
      series(ctx, s, d, grid) {
        return [{ name: 'Total Return', type: 'line', xAxisIndex: grid.x, yAxisIndex: grid.y, data: d.line, showSymbol: false, z: 4, lineStyle: { color: '#9a94b3', width: 1.2 }, itemStyle: { color: '#9a94b3' } }];
      },
      value: (d, i) => fmtPx(d.line[i]),
    },

    agg_funding: {
      title: 'Aggregated Funding Rate (%) OI-Weighted', pane: 'sub',
      opts: [['win', 'Standardize to', '8h', FUND_WIN]],
      async load(ctx, s) {
        const [fv, ov] = await Promise.all([
          czKind('funding', ctx.sym, fundDays(ctx.tf)),
          czKind('oi', ctx.sym, czDays(ctx.tf)),
        ]);
        return { rate: aggFundingApr(ctx, fv, ov).map((v) => fundScale(v, s.win)) };
      },
      series(ctx, s, d, grid) {
        return [{
          name: 'Agg Funding', type: 'bar', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '62%',
          data: d.rate.map((v) => ({ value: v, itemStyle: { color: v != null && v >= 0 ? C.up : '#f97316' } })),
        }];
      },
      fmt: (v) => `${v?.toFixed(4) ?? '—'}%`,
      value: (d, i) => (d.rate[i] == null ? '—' : `${d.rate[i].toFixed(4)}%`),
    },

    funding: {
      title: 'Funding Rate (%)', pane: 'sub',
      opts: [
        ['venue', 'Exchange', 'HL', [['BIN', 'Binance'], ['BYB', 'Bybit'], ['OKX', 'OKX'], ['DER', 'Deribit'], ['HL', 'Hyperliquid']]],
        ['win', 'Standardize to', '8h', FUND_WIN],
      ],
      async load(ctx, s) {
        const venues = await czKind('funding', ctx.sym, fundDays(ctx.tf));
        const v = venues.find((x) => x.venue === s.venue);
        if (!v) throw new Error(`${s.venue} lists no ${ctx.sym} perp`);
        return { rate: stepTo(ctx.times, ctx.tfMs, v.points).map((x) => fundScale(x, s.win)), venue: s.venue };
      },
      series(ctx, s, d, grid) {
        return [{
          name: 'Funding', type: 'bar', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '62%',
          data: d.rate.map((v) => ({ value: v, itemStyle: { color: v != null && v >= 0 ? C.up : '#f97316' } })),
        }];
      },
      fmt: (v) => `${v?.toFixed(4) ?? '—'}%`,
      value: (d, i) => (d.rate[i] == null ? '—' : `${d.rate[i].toFixed(4)}%`),
    },

    x_funding: {
      title: 'Cross Exchange Funding (APR %)', pane: 'sub',
      async load(ctx) {
        const venues = await czKind('funding', ctx.sym, fundDays(ctx.tf));
        if (!venues.length) throw new Error('no funding data');
        return { venues: venues.map((v) => ({ venue: v.venue, line: stepTo(ctx.times, ctx.tfMs, v.points) })) };
      },
      series(ctx, s, d, grid) {
        return d.venues.map((v) => ({
          name: v.venue, type: 'line', xAxisIndex: grid.x, yAxisIndex: grid.y, data: v.line,
          showSymbol: false, lineStyle: { color: C.venue[v.venue], width: 1.2 }, itemStyle: { color: C.venue[v.venue] },
        }));
      },
      fmt: (v) => `${v?.toFixed(1) ?? '—'}%`,
      value: (d, i) => d.venues.map((v) => `${v.venue} ${v.line[i]?.toFixed(1) ?? '—'}%`).join(' · '),
    },

    agg_oi: {
      title: 'Aggregated Open Interest', pane: 'sub',
      opts: [
        ['mode', 'Show as', 'stack', [['stack', 'By venue (stacked)'], ['total', 'Total'], ['delta', 'Bar change']]],
      ],
      note: 'Binance + Bybit + OKX + Deribit + Hyperliquid, USD notional',
      async load(ctx, s) {
        const venues = await czKind('oi', ctx.sym, czDays(ctx.tf));
        if (!venues.length) throw new Error('no OI data');
        const per = venues.map((v) => ({ venue: v.venue, line: stepTo(ctx.times, ctx.tfMs, v.points) }));
        const total = ctx.times.map((_, i) => per.reduce((a, v) => (v.line[i] == null ? a : (a ?? 0) + v.line[i]), null));
        const delta = total.map((v, i) => (i === 0 || v == null || total[i - 1] == null ? null : v - total[i - 1]));
        return { per, total, delta };
      },
      series(ctx, s, d, grid) {
        if (s.mode === 'delta') {
          return [{
            name: 'ΔOI', type: 'bar', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '62%',
            data: d.delta.map((v) => ({ value: v, itemStyle: { color: v != null && v >= 0 ? C.upSoft : C.downSoft } })),
          }];
        }
        if (s.mode === 'total') {
          return [{ name: 'OI', type: 'line', xAxisIndex: grid.x, yAxisIndex: grid.y, data: d.total, showSymbol: false, lineStyle: { color: C.accent, width: 1.4 }, itemStyle: { color: C.accent }, areaStyle: { opacity: 0.12, color: C.accent } }];
        }
        return d.per.map((v) => ({
          name: v.venue, type: 'line', stack: 'oi', xAxisIndex: grid.x, yAxisIndex: grid.y, data: v.line,
          showSymbol: false, lineStyle: { width: 0.8, color: C.venue[v.venue] }, itemStyle: { color: C.venue[v.venue] },
          areaStyle: { opacity: 0.55, color: C.venue[v.venue] },
        }));
      },
      fmt: fmtUsd,
      value: (d, i) => fmtUsd(d.total[i]),
    },

    oi: {
      title: 'Open Interest', pane: 'sub',
      opts: [['venue', 'Exchange', 'BIN', [['BIN', 'Binance'], ['BYB', 'Bybit'], ['OKX', 'OKX'], ['DER', 'Deribit'], ['HL', 'Hyperliquid']]]],
      async load(ctx, s) {
        const venues = await czKind('oi', ctx.sym, czDays(ctx.tf));
        const v = venues.find((x) => x.venue === s.venue);
        if (!v) throw new Error(`${s.venue} lists no ${ctx.sym} perp`);
        return { line: stepTo(ctx.times, ctx.tfMs, v.points), venue: s.venue };
      },
      series(ctx, s, d, grid) {
        const col = C.venue[d.venue];
        return [{ name: `OI ${d.venue}`, type: 'line', xAxisIndex: grid.x, yAxisIndex: grid.y, data: d.line, showSymbol: false, lineStyle: { color: col, width: 1.4 }, itemStyle: { color: col }, areaStyle: { opacity: 0.12, color: col } }];
      },
      fmt: fmtUsd,
      value: (d, i) => fmtUsd(d.line[i]),
    },

    agg_liqs: {
      title: 'Aggregated Liquidations', pane: 'sub',
      opts: [['side', 'Show', 'both', [['both', 'Longs & shorts'], ['long', 'Longs only'], ['short', 'Shorts only'], ['total', 'Total']]]],
      note: 'Binance + Bybit + OKX (no public Deribit/Hyperliquid liq feed exists)',
      async load(ctx) {
        const venues = await czKind('liqs', ctx.sym, czDays(ctx.tf));
        if (!venues.length) throw new Error('no liquidation data');
        const longs = sumVenues(venues, ctx.times, ctx.tfMs, 1);
        const shorts = sumVenues(venues, ctx.times, ctx.tfMs, 2);
        return { longs, shorts };
      },
      series(ctx, s, d, grid) {
        const out = [];
        const side = s.side;
        if (side === 'total') {
          out.push({
            name: 'Liqs', type: 'bar', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '62%',
            data: d.longs.map((v, i) => (v == null && d.shorts[i] == null ? null : (v ?? 0) + (d.shorts[i] ?? 0))),
            itemStyle: { color: '#e7b53a' },
          });
          return out;
        }
        if (side !== 'short') {
          out.push({
            name: 'Long liqs', type: 'bar', stack: 'liq', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '62%',
            data: d.longs.map((v) => (v == null ? null : -v)), itemStyle: { color: '#f97316' },
          });
        }
        if (side !== 'long') {
          out.push({
            name: 'Short liqs', type: 'bar', stack: 'liq', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '62%',
            data: d.shorts, itemStyle: { color: C.up },
          });
        }
        return out;
      },
      fmt: (v) => fmtUsd(Math.abs(v ?? NaN)),
      value: (d, i) => `L ${fmtUsd(d.longs[i])} · S ${fmtUsd(d.shorts[i])}`,
    },

    liqs: {
      title: 'Liquidations', pane: 'sub',
      opts: [['venue', 'Exchange', 'BIN', [['BIN', 'Binance'], ['BYB', 'Bybit'], ['OKX', 'OKX']]]],
      async load(ctx, s) {
        const venues = await czKind('liqs', ctx.sym, czDays(ctx.tf));
        const v = venues.find((x) => x.venue === s.venue);
        if (!v) throw new Error(`no ${s.venue} liquidation feed for ${ctx.sym}`);
        return {
          longs: sumTo(ctx.times, ctx.tfMs, v.points, 1),
          shorts: sumTo(ctx.times, ctx.tfMs, v.points, 2),
        };
      },
      series(ctx, s, d, grid) {
        return [
          { name: 'Long liqs', type: 'bar', stack: 'liq', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '62%', data: d.longs.map((v) => (v == null ? null : -v)), itemStyle: { color: '#f97316' } },
          { name: 'Short liqs', type: 'bar', stack: 'liq', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '62%', data: d.shorts, itemStyle: { color: C.up } },
        ];
      },
      fmt: (v) => fmtUsd(Math.abs(v ?? NaN)),
      value: (d, i) => `L ${fmtUsd(d.longs[i])} · S ${fmtUsd(d.shorts[i])}`,
    },

    vol: {
      title: 'Volume', pane: 'sub',
      opts: [['units', 'Units', 'usd', [['usd', 'Dollars'], ['coin', 'Coins']]]],
      async load(ctx, s) {
        const data = ctx.bars.map((k) => (s.units === 'coin' ? k.v : k.v * k.c));
        return { data, coin: s.units === 'coin' };
      },
      series(ctx, s, d, grid) {
        return [{
          name: 'Volume', type: 'bar', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '70%',
          data: d.data.map((v, i) => ({ value: v, itemStyle: { color: ctx.bars[i].c >= ctx.bars[i].o ? C.upSoft : C.downSoft } })),
        }];
      },
      fmt: fmtCompact,
      value: (d, i) => (d.coin ? fmtCompact(d.data[i]) : fmtUsd(d.data[i])),
    },

    agg_vol: {
      title: 'Aggregated Volume', pane: 'sub',
      opts: [['mode', 'Show as', 'stack', [['stack', 'By venue (stacked)'], ['delta', 'Volume delta'], ['cvd', 'Cumulative delta']]]],
      note: 'perp volume: Binance + Bybit + OKX + Deribit + Hyperliquid',
      async load(ctx, s) {
        if (s.mode === 'stack') {
          const venues = await czKind('volh', ctx.sym, czDays(ctx.tf));
          if (!venues.length) throw new Error('no volume data');
          return { per: venues.map((v) => ({ venue: v.venue, bars: sumTo(ctx.times, ctx.tfMs, v.points) })) };
        }
        const venues = await czKind('cvd', ctx.sym, 7); // free tier caps CVD at 7d
        if (!venues.length) throw new Error('no delta data');
        const delta = sumVenues(venues, ctx.times, ctx.tfMs);
        if (s.mode === 'delta') return { delta };
        let acc = 0;
        let seen = false;
        // bars before the feed's window stay null — a flat fabricated zero
        // line reads as a data glitch and drags the axis
        return { cvd: delta.map((v) => (v == null ? (seen ? acc : null) : (seen = true, acc += v))) };
      },
      series(ctx, s, d, grid) {
        if (d.per) {
          return d.per.map((v) => ({
            name: v.venue, type: 'bar', stack: 'avol', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '70%',
            data: v.bars, itemStyle: { color: C.venue[v.venue] },
          }));
        }
        if (d.delta) {
          return [{
            name: 'Vol Δ', type: 'bar', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '62%',
            data: d.delta.map((v) => ({ value: v, itemStyle: { color: v != null && v >= 0 ? C.up : C.down } })),
          }];
        }
        return [{ name: 'CVD', type: 'line', xAxisIndex: grid.x, yAxisIndex: grid.y, data: d.cvd, showSymbol: false, lineStyle: { color: C.accent, width: 1.4 }, itemStyle: { color: C.accent }, areaStyle: { opacity: 0.1, color: C.accent } }];
      },
      fmt: fmtUsd,
      value(d, i) {
        if (d.per) return fmtUsd(d.per.reduce((a, v) => (v.bars[i] == null ? a : (a ?? 0) + v.bars[i]), null));
        if (d.delta) return fmtUsd(d.delta[i]);
        return fmtUsd(d.cvd[i]);
      },
    },

    spot_vol: {
      title: 'Aggregated Spot Volume', pane: 'sub',
      note: 'Coinbase + Kraken spot (the US-reachable books) — dollars',
      async load(ctx) {
        const since = ctx.bars[0].t;
        const [cb, kr] = await Promise.all([cbCandles(ctx.sym, ctx.tf, since), krCandles(ctx.sym, ctx.tf)]);
        if (!cb && !kr) throw new Error(`${ctx.sym} isn't on Coinbase or Kraken spot`);
        const tot = new Array(ctx.times.length).fill(null);
        for (const rows of [cb, kr]) {
          if (!rows) continue;
          const pts = rows.map((k) => [k.t, k.v * k.c]);
          const s = sumTo(ctx.times, ctx.tfMs, pts, 1, ctx.tfMs);
          for (let i = 0; i < tot.length; i++) if (s[i] != null) tot[i] = (tot[i] ?? 0) + s[i];
        }
        return { tot };
      },
      series(ctx, s, d, grid) {
        return [{
          name: 'Spot vol', type: 'bar', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '70%',
          data: d.tot.map((v, i) => ({ value: v, itemStyle: { color: ctx.bars[i].c >= ctx.bars[i].o ? C.upSoft : C.downSoft } })),
        }];
      },
      fmt: fmtUsd,
      value: (d, i) => fmtUsd(d.tot[i]),
    },

    premium: {
      title: 'Premium', pane: 'sub',
      opts: [['units', 'Units', 'pct', [['pct', 'Percent'], ['usd', 'Dollars']]]],
      note: 'Hyperliquid perp vs Coinbase spot',
      async load(ctx, s) {
        const cb = await cbCandles(ctx.sym, ctx.tf, ctx.bars[0].t);
        if (!cb) throw new Error(`${ctx.sym} has no Coinbase spot pair`);
        const spot = new Map(cb.map((k) => [k.t, k.c]));
        const line = ctx.bars.map((k) => {
          const sc = spot.get(k.t);
          if (!sc) return null;
          return s.units === 'usd' ? k.c - sc : ((k.c - sc) / sc) * 100;
        });
        return { line, pct: s.units !== 'usd' };
      },
      series(ctx, s, d, grid) {
        return [{
          name: 'Premium', type: 'bar', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '62%',
          data: d.line.map((v) => ({ value: v, itemStyle: { color: v != null && v >= 0 ? C.up : '#f97316' } })),
        }];
      },
      fmt: (v) => (v == null ? '—' : `${v.toFixed(3)}`),
      value: (d, i) => (d.line[i] == null ? '—' : d.pct ? `${d.line[i].toFixed(3)}%` : fmtUsd(d.line[i])),
    },

    cb_premium: {
      title: 'Coinbase Premium', pane: 'sub',
      opts: [['units', 'Units', 'pct', [['pct', 'Percent'], ['usd', 'Dollars']]]],
      note: 'Coinbase -USD spot vs the charted series',
      async load(ctx, s) {
        const cb = await cbCandles(ctx.sym, ctx.tf, ctx.bars[0].t);
        if (!cb) throw new Error(`${ctx.sym} has no Coinbase spot pair`);
        const spot = new Map(cb.map((k) => [k.t, k.c]));
        const line = ctx.bars.map((k) => {
          const sc = spot.get(k.t);
          if (!sc) return null;
          return s.units === 'usd' ? sc - k.c : ((sc - k.c) / k.c) * 100;
        });
        return { line, pct: s.units !== 'usd' };
      },
      series(ctx, s, d, grid) {
        return [{
          name: 'CB premium', type: 'line', xAxisIndex: grid.x, yAxisIndex: grid.y, data: d.line,
          showSymbol: false, lineStyle: { color: '#5aa7f7', width: 1.3 }, itemStyle: { color: '#5aa7f7' },
        }];
      },
      fmt: (v) => (v == null ? '—' : `${v.toFixed(3)}`),
      value: (d, i) => (d.line[i] == null ? '—' : d.pct ? `${d.line[i].toFixed(3)}%` : fmtUsd(d.line[i])),
    },

    tape: {
      title: 'Tape', pane: 'sub',
      opts: [['mode', 'Show', 'count', [['count', 'Trade count'], ['speed', 'Tape speed (trades/min)']]]],
      note: 'Hyperliquid perp trade prints per bar',
      async load(ctx, s) {
        const counts = ctx.bars.map((k) => k.n || null);
        if (s.mode === 'speed') {
          const perMin = ctx.tfMs / 60e3;
          return { data: counts.map((v) => (v == null ? null : v / perMin)), speed: true };
        }
        return { data: counts };
      },
      series(ctx, s, d, grid) {
        return [{
          name: 'Tape', type: 'bar', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '70%',
          data: d.data.map((v, i) => ({ value: v, itemStyle: { color: ctx.bars[i].c >= ctx.bars[i].o ? C.upSoft : C.downSoft } })),
        }];
      },
      fmt: fmtCompact,
      value: (d, i) => (d.data[i] == null ? '—' : `${fmtCompact(d.data[i])}${d.speed ? '/min' : ''}`),
    },

    spot_tape: {
      title: 'Aggregated Spot Tape', pane: 'sub',
      opts: [['mode', 'Show', 'count', [['count', 'Trade count'], ['speed', 'Tape speed (trades/min)']]]],
      note: 'Kraken spot prints (the one spot venue publishing per-bar counts)',
      async load(ctx, s) {
        const kr = await krCandles(ctx.sym, ctx.tf);
        if (!kr) throw new Error(`${ctx.sym} isn't on Kraken spot`);
        const pts = kr.map((k) => [k.t, k.n]);
        const counts = sumTo(ctx.times, ctx.tfMs, pts, 1, ctx.tfMs);
        if (s.mode === 'speed') {
          const perMin = ctx.tfMs / 60e3;
          return { data: counts.map((v) => (v == null ? null : v / perMin)), speed: true };
        }
        return { data: counts };
      },
      series(ctx, s, d, grid) {
        return [{
          name: 'Spot tape', type: 'bar', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '70%',
          data: d.data, itemStyle: { color: '#5aa7f7' },
        }];
      },
      fmt: fmtCompact,
      value: (d, i) => (d.data[i] == null ? '—' : `${fmtCompact(d.data[i])}${d.speed ? '/min' : ''}`),
    },

    agg_tape: {
      title: 'Aggregated Tape', pane: 'sub',
      note: 'HL perp + Kraken spot prints per bar (the feeds that publish counts)',
      async load(ctx) {
        const kr = await krCandles(ctx.sym, ctx.tf).catch(() => null);
        const krCounts = kr ? sumTo(ctx.times, ctx.tfMs, kr.map((k) => [k.t, k.n]), 1, ctx.tfMs) : null;
        const data = ctx.bars.map((k, i) => {
          const a = k.n || null;
          const b = krCounts?.[i] ?? null;
          return a == null && b == null ? null : (a ?? 0) + (b ?? 0);
        });
        return { data };
      },
      series(ctx, s, d, grid) {
        return [{
          name: 'Agg tape', type: 'bar', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '70%',
          data: d.data.map((v, i) => ({ value: v, itemStyle: { color: ctx.bars[i].c >= ctx.bars[i].o ? C.upSoft : C.downSoft } })),
        }];
      },
      fmt: fmtCompact,
      value: (d, i) => fmtCompact(d.data[i]),
    },

    returns: {
      title: 'Returns', pane: 'sub',
      opts: [
        ['units', 'Units', 'pct', [['pct', 'Percent'], ['abs', 'Absolute']]],
        ['n', 'Periods', '1', [['1', '1'], ['4', '4'], ['12', '12'], ['24', '24']]],
      ],
      async load(ctx, s) {
        const n = Number(s.n);
        const closes = ctx.bars.map((k) => k.c);
        const data = closes.map((c, i) => {
          if (i < n) return null;
          return s.units === 'abs' ? c - closes[i - n] : ((c / closes[i - n]) - 1) * 100;
        });
        return { data, pct: s.units !== 'abs' };
      },
      series(ctx, s, d, grid) {
        return [{
          name: 'Returns', type: 'bar', xAxisIndex: grid.x, yAxisIndex: grid.y, barWidth: '62%',
          data: d.data.map((v) => ({ value: v, itemStyle: { color: v != null && v >= 0 ? C.up : C.down } })),
        }];
      },
      fmt: (v) => (v == null ? '—' : v.toFixed(2)),
      value: (d, i) => (d.data[i] == null ? '—' : d.pct ? `${d.data[i].toFixed(2)}%` : fmtPx(d.data[i])),
    },

    rvol: {
      title: 'Realized Vol (ann. %)', pane: 'sub',
      opts: [['win', 'Window', '30', [['20', '20 bars'], ['30', '30 bars'], ['60', '60 bars'], ['90', '90 bars']]]],
      async load(ctx, s) {
        const w = Number(s.win);
        const closes = ctx.bars.map((k) => k.c);
        const rets = closes.map((c, i) => (i === 0 ? null : c / closes[i - 1] - 1));
        const perYr = YR_MS / ctx.tfMs;
        const data = closes.map((_, i) => {
          if (i < w) return null;
          const xs = rets.slice(i - w + 1, i + 1);
          const m = xs.reduce((a, b) => a + b, 0) / w;
          const va = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (w - 1);
          return Math.sqrt(va) * Math.sqrt(perYr) * 100;
        });
        return { data };
      },
      series(ctx, s, d, grid) {
        return [{ name: 'RVol', type: 'line', xAxisIndex: grid.x, yAxisIndex: grid.y, data: d.data, showSymbol: false, lineStyle: { color: '#ff5ccb', width: 1.3 }, itemStyle: { color: '#ff5ccb' } }];
      },
      fmt: (v) => (v == null ? '—' : `${v.toFixed(1)}%`),
      value: (d, i) => (d.data[i] == null ? '—' : `${d.data[i].toFixed(1)}%`),
    },
  };

  // OI-weighted cross-venue funding APR at each chart bar
  function aggFundingApr(ctx, fundVenues, oiVenues) {
    const f = fundVenues.map((v) => ({ venue: v.venue, s: stepTo(ctx.times, ctx.tfMs, v.points) }));
    const o = new Map(oiVenues.map((v) => [v.venue, stepTo(ctx.times, ctx.tfMs, v.points)]));
    return ctx.times.map((_, i) => {
      let sw = 0;
      let ww = 0;
      for (const v of f) {
        const rate = v.s[i];
        if (rate == null) continue;
        const w = o.get(v.venue)?.[i] ?? 1;
        sw += rate * w; ww += w;
      }
      return ww > 0 ? sw / ww : null;
    });
  }

  // the picker groups, in Velo's menu order
  const MENU = [
    ['agg_funding', 'Aggregated Funding'], ['agg_liqs', 'Aggregated Liquidations'],
    ['agg_oi', 'Aggregated Open Interest'], ['spot_tape', 'Aggregated Spot Tape'],
    ['spot_vol', 'Aggregated Spot Volume'], ['agg_tape', 'Aggregated Tape'],
    ['agg_vol', 'Aggregated Volume'], ['cme_gaps', 'CME Gaps'],
    ['cb_premium', 'Coinbase Premium'],
    ['x_funding', 'Cross Exchange Funding'], ['funding', 'Funding'],
    ['liqs', 'Liquidations'], ['ma', 'Moving Average'], ['oi', 'Open Interest'],
    ['premium', 'Premium'], ['rvol', 'Realized Vol'], ['returns', 'Returns'],
    ['tape', 'Tape'], ['total_return', 'Total Return'], ['vol', 'Volume'],
  ];

  /* ── liquidation heatmap ────────────────────────────────────────────────
     Velo-style full-history map, available the instant it's toggled. No
     free historical order-book feed exists, so the map is MODELED the way
     the well-known liq maps do it: every bar seeds estimated liquidation
     prices for longs/shorts opened at its close across common leverage
     tiers, weighted by the bar's dollar volume; each level keeps glowing
     until a later bar trades through it. Log-scaled intensity. */
  const LIQ_TIERS = [[10, 0.18], [25, 0.30], [50, 0.32], [100, 0.20]];
  const LIQ_MM = 0.004; // maintenance-margin buffer inside the tier distance
  const liqCache = { key: null, runs: null, binSize: 0, relOf: null };
  function liqHeatRuns(sym, tf, bars) {
    const key = `${sym}:${tf}:${bars.length}:${bars[0].t}:${bars[bars.length - 1].t}`;
    if (liqCache.key === key) return liqCache;
    let lo = Infinity;
    let hi = 0;
    for (const k of bars) { lo = Math.min(lo, k.l); hi = Math.max(hi, k.h); }
    const binSize = Math.max((hi - lo) / 430, hi * 4e-5);
    const runs = []; // [fromIdx, toIdx, binIdx, value]
    const active = new Map(); // binIdx -> {from, val}
    const seed = (i, price, w) => {
      const bin = Math.round(price / binSize);
      const cur = active.get(bin);
      if (!cur) { active.set(bin, { from: i, val: w }); return; }
      const nv = cur.val + w;
      if (nv > cur.val * 1.35) { // the color actually moves — split the run
        if (i > cur.from) runs.push([cur.from, i, bin, cur.val]);
        active.set(bin, { from: i, val: nv });
      } else cur.val = nv;
    };
    for (let i = 0; i < bars.length; i++) {
      const k = bars[i];
      // sweep: everything this bar traded through stops glowing here
      for (const [bin, cur] of active) {
        const p = bin * binSize;
        if (p >= k.l && p <= k.h) {
          if (i > cur.from) runs.push([cur.from, i, bin, cur.val]);
          active.delete(bin);
        }
      }
      const w = (k.v || 0) * k.c;
      if (!(w > 0)) continue;
      for (const [L, share] of LIQ_TIERS) {
        const d = 1 / L - LIQ_MM;
        const lng = k.c * (1 - d);
        const sht = k.c * (1 + d);
        if (lng < k.l || lng > k.h) seed(i + 1, lng, w * share);
        if (sht < k.l || sht > k.h) seed(i + 1, sht, w * share);
      }
    }
    for (const [bin, cur] of active) runs.push([cur.from, bars.length, bin, cur.val]); // still alive → to the edge
    // normalize in log space BETWEEN the observed extremes — absolute logs
    // cluster (every level is millions of $) and wash the ramp out
    let vMin = Infinity;
    let vMax = 1;
    for (const r of runs) { vMin = Math.min(vMin, r[3]); vMax = Math.max(vMax, r[3]); }
    const lMin = Math.log10(vMin + 1);
    const lSpan = Math.max(Math.log10(vMax + 1) - lMin, 1e-6);
    liqCache.key = key;
    liqCache.runs = runs;
    liqCache.binSize = binSize;
    liqCache.relOf = (v) => (Math.log10(v + 1) - lMin) / lSpan;
    return liqCache;
  }

  /* ── persistence of the user's setup ────────────────────────────────── */
  const SETUP_KEY = 'viceHub.vchartPro';
  const mkUid = () => 'i' + Math.random().toString(36).slice(2, 9);
  function loadSetup() {
    try {
      const j = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null');
      if (j && Array.isArray(j.active)) {
        if (!parseTf(j.tf)) j.tf = '1h';
        j.tfFavs = (Array.isArray(j.tfFavs) ? j.tfFavs : DEFAULT_TF_FAVS).filter((t) => parseTf(t));
        if (!j.tfFavs.length) j.tfFavs = DEFAULT_TF_FAVS.slice();
        // validate entries (ids churn between versions) + migrate to uids so
        // the same indicator can run twice (EMA 20 + EMA 200 is table stakes)
        j.active = j.active
          .filter((e) => e && INDICATORS[e.id])
          .map((e) => ({ uid: e.uid ?? mkUid(), id: e.id, settings: (e.settings && typeof e.settings === 'object') ? e.settings : {} }));
        return j;
      }
    } catch { /* defaults */ }
    return { tf: '1h', heat: false, heatAlpha: 70, tfFavs: DEFAULT_TF_FAVS.slice(), active: [{ uid: mkUid(), id: 'vol', settings: {} }] };
  }
  const saveSetup = (setup) => {
    try { localStorage.setItem(SETUP_KEY, JSON.stringify(setup)); } catch { /* fine */ }
  };

  /* ── the widget ─────────────────────────────────────────────────────── */
  function mount(body, opts = {}) {
    const root = el('div', 'vcp');
    body.appendChild(root);

    const setup = loadSetup();
    let sym = (opts.symbol ?? 'BTC').toUpperCase();
    let tf = parseTf(setup.tf) ? setup.tf : '1h';
    let bars = [];
    let chart = null;
    let dead = false;
    let liveTimer = null;
    let keyHandler = null;
    let ro = null;
    const indData = new Map(); // id -> {d, err}
    let hoverIdx = null;
    let follow = true;
    let zoomSpan = null;
    let viewIdx = null; // visible bar window {s,e} — clips the heatmap's axis reach
    let heatRedraw = null;
    let drawT = null;
    const scheduleDraw = () => { clearTimeout(drawT); drawT = setTimeout(() => { if (!dead) draw(); }, 30); };
    let lastSig = null; // structure fingerprint — unchanged => merge in place
    let loadSeq = 0; // bumped on symbol/tf change — stale async results get dropped

    /* toolbar — TV-style: one symbol button, hairline dividers, quiet chips */
    const bar = el('div', 'vcp-bar');
    const symBtn = el('button', 'vcp-symbtn');
    symBtn.title = 'Change symbol';
    const tfWrap = el('div', 'vcp-tfs');
    const indBtn = el('button', 'vcp-btn', '<i data-lucide="activity"></i><span>Indicators</span>');
    const heatBtn = el('button', 'vcp-btn', '<i data-lucide="flame"></i><span>Heatmap</span>');
    const alphaWrap = el('label', 'vcp-alpha');
    alphaWrap.title = 'Heatmap opacity';
    const alphaSlider = document.createElement('input');
    alphaSlider.type = 'range';
    alphaSlider.min = '10';
    alphaSlider.max = '100';
    alphaSlider.step = '5';
    alphaWrap.appendChild(alphaSlider);
    const fsBtn = el('button', 'vcp-btn vcp-ico', '<i data-lucide="maximize-2"></i>');
    fsBtn.title = 'Fullscreen';
    bar.append(symBtn, el('span', 'vcp-div'), tfWrap, el('span', 'vcp-sp'), indBtn, heatBtn, alphaWrap, fsBtn);
    root.appendChild(bar);

    const legend = el('div', 'vcp-legend');
    const box = el('div', 'vcp-box');
    const rail = el('div', 'vcp-rail');
    const drawCv = document.createElement('canvas');
    drawCv.className = 'vcp-draw';
    const stage = el('div', 'vcp-stage');
    stage.append(rail, box, drawCv, legend);
    root.appendChild(stage);
    const errStrip = el('div', 'vcp-err');
    root.appendChild(errStrip);

    const icons = () => { if (window.lucide) window.lucide.createIcons(); };

    function paintSym() {
      symBtn.innerHTML = `<b>${esc(sym)}</b><span class="vcp-symq">USD</span><i data-lucide="chevron-down"></i>`;
      icons();
    }

    /* TV-style symbol search — overlay on the stage, HL perp universe with
       icons + live 24h stats, free-typed tickers accepted */
    let iconsMap = null;
    const loadIcons = () => iconsMap ?? (iconsMap = getJson('/api/vice-movers', 8000)
      .then((j) => {
        const m = {};
        for (const r of Array.isArray(j) ? j : []) {
          const s = (r.s ?? '').toUpperCase();
          if (s && !m[s]) m[s] = { img: r.img ?? null, name: r.n ?? '' };
        }
        return m;
      }).catch(() => ({})));
    function openSymSearch() {
      if (stage.querySelector('.vcp-search')) return;
      const ov = el('div', 'vcp-search');
      const box = el('div', 'vcp-search-box');
      const inp = document.createElement('input');
      inp.className = 'vcp-search-inp';
      inp.placeholder = 'Search symbol…';
      inp.maxLength = 12;
      const list = el('div', 'vcp-search-list');
      box.append(inp, list);
      ov.appendChild(box);
      stage.appendChild(ov);
      inp.focus();
      let uni = [];
      let uniState = 'loading'; // 'loading' | 'ready' | 'failed'
      let sel = 0;
      const paint = () => {
        const q = inp.value.trim().toUpperCase();
        if (uniState === 'loading' && !uni.length && !q) {
          list.innerHTML = '<div class="vcp-snone">loading symbols…</div>';
          return;
        }
        const hits = (q
          ? uni.filter((u) => u.sym.toUpperCase().includes(q) || u.name.toUpperCase().includes(q))
          : uni).slice(0, 40);
        if (q && !hits.some((h) => h.sym.toUpperCase() === q) && /^[A-Z0-9]{2,12}$/.test(q)) {
          hits.push({ sym: q, name: uniState === 'failed' ? 'symbol list unavailable — trying it raw' : 'try it — any Hyperliquid listing works', px: null, chg: null, typed: true });
        }
        sel = Math.min(sel, Math.max(0, hits.length - 1));
        list.innerHTML = hits.map((u, i) =>
          `<button class="vcp-srow${i === sel ? ' sel' : ''}" data-sym="${esc(u.sym)}">` +
          `<span class="vcp-sic">${u.img ? `<img src="${esc(u.img)}" alt="" loading="lazy">` : `<span class="vcp-sletter">${esc(u.sym[0])}</span>`}</span>` +
          `<b>${esc(u.sym)}</b><span class="vcp-sname">${esc(u.name)}</span>` +
          `<span class="vcp-spx">${u.px == null ? '' : fmtPx(u.px)}</span>` +
          `<span class="vcp-schg ${u.chg >= 0 ? 'up' : 'down'}">${u.chg == null ? '' : `${u.chg >= 0 ? '+' : ''}${u.chg.toFixed(2)}%`}</span>` +
          '</button>').join('') || `<div class="vcp-snone">${uniState === 'failed' ? 'symbol list unavailable — type a ticker' : 'nothing matches'}</div>`;
      };
      const close = () => ov.remove();
      const pick = (s) => { close(); setSymbol(s); };
      ov.addEventListener('click', (ev) => { if (ev.target === ov) close(); });
      list.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-sym]');
        if (b) pick(b.dataset.sym);
      });
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') { close(); return; }
        const rows = list.querySelectorAll('[data-sym]');
        if (ev.key === 'ArrowDown') { sel = Math.min(sel + 1, rows.length - 1); paint(); ev.preventDefault(); return; }
        if (ev.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); paint(); ev.preventDefault(); return; }
        if (ev.key === 'Enter') {
          let s = rows[sel]?.dataset.sym ?? inp.value.trim().toUpperCase();
          // resolve HL's real casing (kPEPE, kBONK…) before fetching
          const hit = uni.find((u) => u.sym.toUpperCase() === s.toUpperCase());
          if (hit) s = hit.sym;
          if (/^[A-Za-z0-9]{2,12}$/.test(s)) pick(s);
          return;
        }
        sel = 0;
        setTimeout(paint, 0);
      });
      Promise.all([
        hlInfo({ type: 'metaAndAssetCtxs' }).catch(() => null),
        loadIcons(),
      ]).then(([res, ics]) => {
        if (!ov.isConnected) return;
        uniState = res ? 'ready' : 'failed';
        if (res) {
          const [meta2, ctxs] = res;
          uni = meta2.universe.map((u, i) => {
            const px = Number(ctxs[i].markPx);
            const prev = Number(ctxs[i].prevDayPx);
            return u.isDelisted ? null : {
              sym: u.name,
              name: ics[u.name.toUpperCase()]?.name ?? '',
              img: ics[u.name.toUpperCase()]?.img ?? null,
              px,
              chg: prev > 0 ? ((px - prev) / prev) * 100 : null,
              vol: Number(ctxs[i].dayNtlVlm) || 0,
            };
          }).filter(Boolean).sort((a, b) => b.vol - a.vol);
        }
        paint();
      });
      paint();
    }
    symBtn.addEventListener('click', openSymSearch);
    const setTf = (t) => {
      const def = parseTf(t);
      if (!def || def.key === tf) return;
      tf = def.key;
      setup.tf = def.key;
      saveSetup(setup);
      paintTfs();
      reload();
    };
    function paintTfs() {
      tfWrap.innerHTML = '';
      const b = el('button', 'vcp-chip on vcp-tfchip', esc(tfLabel(tf)));
      b.title = 'Change timeframe';
      b.addEventListener('click', (ev) => { ev.stopPropagation(); openTfMenu(); });
      tfWrap.appendChild(b);
    }
    let tfMenuEl = null;
    const closeTfMenu = () => { tfMenuEl?.remove(); tfMenuEl = null; };
    function openTfMenu() {
      if (tfMenuEl) { closeTfMenu(); return; }
      tfMenuEl = el('div', 'vcp-menu vcp-tfmenu');
      const tfWord = (t) => {
        const d = parseTf(t);
        const n = parseInt(d.key, 10);
        const unit = d.key === '1mo' ? 'month' : { m: 'minute', h: 'hour', d: 'day', w: 'week' }[d.key.slice(-1)];
        return `${n} ${unit}${n === 1 ? '' : 's'}`;
      };
      const paintMenu = () => {
        tfMenuEl.innerHTML = '';
        const groups = setup.tfFavs.length
          ? [['FAVORITES', setup.tfFavs], ...TF_GROUPS]
          : TF_GROUPS;
        for (const [title, keys] of groups) {
          tfMenuEl.appendChild(el('div', 'vcp-tfcat', title));
          for (const t of keys) {
            const fav = setup.tfFavs.includes(t);
            const row = el('button', `vcp-mrow vcp-tfrow${t === tf ? ' on' : ''}`,
              `<span>${esc(tfWord(t))}</span>` +
              `<span class="vcp-tfstar${fav ? ' on' : ''}" data-star="${esc(t)}" title="${fav ? 'Unstar' : 'Star — shows in the toolbar'}">★</span>`);
            row.addEventListener('click', (ev) => {
              const star = ev.target.closest('[data-star]');
              if (star) {
                const key = star.dataset.star;
                setup.tfFavs = setup.tfFavs.includes(key)
                  ? setup.tfFavs.filter((x) => x !== key)
                  : [...setup.tfFavs, key];
                if (!setup.tfFavs.length) setup.tfFavs = [key];
                saveSetup(setup);
                paintTfs();
                paintMenu();
                return;
              }
              closeTfMenu();
              setTf(t);
            });
            tfMenuEl.appendChild(row);
          }
        }
        tfMenuEl.appendChild(el('div', 'vcp-tfcat', 'CUSTOM'));
        const cRow = el('div', 'vcp-tfcustom');
        const cInp = document.createElement('input');
        cInp.placeholder = 'e.g. 45m, 3h, 2d';
        cInp.maxLength = 5;
        const apply = () => {
          const def = parseTf(cInp.value);
          if (!def) { cInp.classList.add('bad'); setTimeout(() => cInp.classList.remove('bad'), 900); return; }
          closeTfMenu();
          setTf(def.key);
        };
        cInp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') apply(); if (ev.key === 'Escape') closeTfMenu(); ev.stopPropagation(); });
        const go = el('button', 'vcp-tfgo', 'Set');
        go.addEventListener('click', apply);
        cRow.append(cInp, go);
        tfMenuEl.appendChild(cRow);
      };
      paintMenu();
      bar.appendChild(tfMenuEl);
      setTimeout(() => document.addEventListener('click', function h(ev) {
        if (!tfMenuEl?.contains(ev.target)) { closeTfMenu(); document.removeEventListener('click', h); }
      }), 0);
    }

    heatBtn.addEventListener('click', () => {
      setup.heat = !setup.heat;
      saveSetup(setup);
      syncHeat();
      buildLegend();
      scheduleDraw();
    });
    alphaSlider.value = String(setup.heatAlpha ?? 70);
    alphaSlider.addEventListener('input', () => {
      setup.heatAlpha = Number(alphaSlider.value);
      saveSetup(setup);
      scheduleDraw();
    });
    const fsHost = () => root.closest('.vpanel') ?? root;
    if (!document.fullscreenEnabled) fsBtn.style.display = 'none'; // iOS Safari
    fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement === fsHost()) document.exitFullscreen();
      else fsHost().requestFullscreen?.().catch(() => {});
    });
    const onFsChange = () => {
      const on = document.fullscreenElement === fsHost();
      fsBtn.innerHTML = `<i data-lucide="${on ? 'minimize-2' : 'maximize-2'}"></i>`;
      icons();
    };
    document.addEventListener('fullscreenchange', onFsChange);

    /* indicator picker */
    let menuEl = null;
    indBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (menuEl) { closeMenu(); return; }
      menuEl = el('div', 'vcp-menu');
      for (const [id, name] of MENU) {
        const n = setup.active.filter((a) => a.id === id).length;
        const row = el('button', `vcp-mrow${n ? ' on' : ''}`,
          `<span>&lt;Vice&gt; ${esc(name)}</span>` +
          (n ? '<span class="vcp-mact"><span class="vcp-madd" title="Add another">+</span><i data-lucide="check"></i></span>' : ''));
        row.addEventListener('click', (ev) => {
          // re-click = off (owner rule); the little + adds a second instance
          if (ev.target.closest('.vcp-madd')) { addIndicator(id); closeMenu(); return; }
          if (n) setup.active.filter((a) => a.id === id).map((a) => a.uid).forEach(removeIndicator);
          else addIndicator(id);
          closeMenu();
        });
        menuEl.appendChild(row);
      }
      bar.appendChild(menuEl);
      icons();
      setTimeout(() => document.addEventListener('click', closeMenu, { once: true }), 0);
    });
    const closeMenu = () => { menuEl?.remove(); menuEl = null; };

    /* settings popover for one active indicator — a second gear click toggles
       instead of stacking another copy (stopPropagation kept the doc-click
       closer from ever seeing repeat clicks) */
    function openSettings(a, anchor) {
      const def = INDICATORS[a.id];
      if (!def.opts?.length) return;
      const already = anchor.querySelector('.vcp-pop');
      root.querySelectorAll('.vcp-pop').forEach((p) => p.remove());
      if (already) return;
      const pop = el('div', 'vcp-pop');
      for (const [key, label, defVal, options] of def.opts) {
        const row = el('label', 'vcp-poprow', `<span>${esc(label)}</span>`);
        const sel = document.createElement('select');
        for (const [val, text] of options) {
          const o = document.createElement('option');
          o.value = val; o.textContent = text;
          if ((a.settings[key] ?? defVal) === val) o.selected = true;
          sel.appendChild(o);
        }
        sel.addEventListener('change', () => {
          a.settings[key] = sel.value;
          saveSetup(setup);
          refreshIndicator(a);
        });
        row.appendChild(sel);
        pop.appendChild(row);
      }
      if (def.note) pop.appendChild(el('div', 'vcp-popnote', esc(def.note)));
      anchor.appendChild(pop);
      setTimeout(() => document.addEventListener('click', function h(ev) {
        if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('click', h); }
      }), 0);
    }

    /* legend rows (Velo-style, top-left of the stage). Rows are built ONCE
       per setup change and only their value spans repaint on live ticks —
       rebuilding wholesale would tear down open popovers and hover state. */
    let legendRows = null; // { ohlc, items: Map(id -> valueSpan) }
    function buildLegend() {
      legend.innerHTML = '';
      legendRows = { ohlc: el('div', 'vcp-lrow vcp-ohlc'), items: new Map() };
      legend.appendChild(legendRows.ohlc);
      for (const a of setup.active) {
        const def = INDICATORS[a.id];
        const row = el('div', 'vcp-lrow',
          `<span class="vcp-lname">&lt;Vice&gt; ${esc(def.title)}</span>`);
        const tag = el('span', 'vcp-ltag');
        row.appendChild(tag);
        const val = el('span', 'vcp-lval', '…');
        row.appendChild(val);
        const btns = el('span', 'vcp-lbtns',
          `${def.opts?.length ? '<button class="vcp-lbtn" data-act="gear" title="Settings"><i data-lucide="settings-2"></i></button>' : ''}` +
          '<button class="vcp-lbtn" data-act="x" title="Remove"><i data-lucide="x"></i></button>');
        row.appendChild(btns);
        btns.querySelector('[data-act="x"]').addEventListener('click', () => removeIndicator(a.uid));
        btns.querySelector('[data-act="gear"]')?.addEventListener('click', (ev) => {
          ev.stopPropagation();
          openSettings(a, row);
        });
        legendRows.items.set(a.uid, { val, tag });
        legend.appendChild(row);
      }
      icons();
      paintLegend();
    }
    function paintLegend() {
      if (!legendRows) return;
      const i = clamp(hoverIdx ?? bars.length - 1, 0, bars.length - 1);
      const k = bars[i];
      if (k) {
        const chg = ((k.c - k.o) / k.o) * 100;
        const cls = k.c >= k.o ? 'up' : 'down';
        legendRows.ohlc.innerHTML =
          `<b>${esc(sym)}USD · ${esc(tf)} · Hyperliquid · UTC</b>` +
          `<span>O <em class="${cls}">${fmtPx(k.o)}</em></span><span>H <em class="${cls}">${fmtPx(k.h)}</em></span>` +
          `<span>L <em class="${cls}">${fmtPx(k.l)}</em></span><span>C <em class="${cls}">${fmtPx(k.c)}</em>` +
          ` <em class="${cls}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</em></span>`;
      }
      for (const a of setup.active) {
        const slot = legendRows.items.get(a.uid);
        if (!slot) continue;
        const tagTxt = TAGS[a.id]?.(mergedSettings(a)) ?? '';
        if (slot.tag.textContent !== tagTxt) slot.tag.textContent = tagTxt;
        const st = indData.get(a.uid);
        if (st?.err) { slot.val.className = 'vcp-lerr'; slot.val.textContent = st.err; }
        else if (st?.d) { slot.val.className = 'vcp-lval'; slot.val.textContent = INDICATORS[a.id].value(st.d, i).replace(/&nbsp;/g, ' '); }
        else { slot.val.className = 'vcp-lval'; slot.val.textContent = '…'; }
      }
    }

    /* indicator lifecycle */
    function ctx() {
      return { sym, tf, tfMs: tfMsOf(tf), bars, times: bars.map((k) => k.t) };
    }
    function mergedSettings(a) {
      const merged = {};
      for (const [key, , defVal] of INDICATORS[a.id].opts ?? []) merged[key] = a.settings[key] ?? defVal;
      return merged;
    }
    async function refreshIndicator(a) {
      const def = INDICATORS[a.id];
      const merged = mergedSettings(a);
      if (!bars.length) { indData.set(a.uid, { err: 'waiting for candles…', s: merged }); return; }
      const seq = loadSeq;
      const mySeq = (a._seq = (a._seq ?? 0) + 1); // settings flips race too
      try {
        const d = await def.load(ctx(), merged);
        if (dead || seq !== loadSeq || mySeq !== a._seq) return; // superseded
        indData.set(a.uid, { d, s: merged });
      } catch (e) {
        if (dead || seq !== loadSeq || mySeq !== a._seq) return;
        const msg = /reading|undefined|null/i.test(e.message) ? 'data unavailable' : e.message;
        indData.set(a.uid, { err: msg, s: merged });
      }
      scheduleDraw();
    }
    const MAX_SUBS = 8;
    function addIndicator(id) {
      if (INDICATORS[id].pane === 'sub'
        && setup.active.filter((a) => INDICATORS[a.id].pane === 'sub').length >= MAX_SUBS) {
        errStrip.textContent = `${MAX_SUBS} panes is the ceiling — remove one first`;
        errStrip.classList.add('on');
        setTimeout(() => errStrip.classList.remove('on'), 2600);
        return;
      }
      setup.active.push({ uid: mkUid(), id, settings: {} });
      saveSetup(setup);
      buildLegend();
      refreshIndicator(setup.active[setup.active.length - 1]);
      scheduleDraw();
    }
    function removeIndicator(uid2) {
      setup.active = setup.active.filter((a) => a.uid !== uid2);
      indData.delete(uid2);
      saveSetup(setup);
      buildLegend();
      scheduleDraw();
    }
    const refreshAllIndicators = () => setup.active.forEach((a) => refreshIndicator(a));

    /* heatmap lifecycle — the model computes from bars, nothing to poll */
    function syncHeat() {
      heatBtn.classList.toggle('on', !!setup.heat);
      alphaWrap.classList.toggle('show', !!setup.heat);
    }

    /* heatmap → custom series rects under the candles. Runs are per price
       bin over bar-index spans, so the layer pans/zooms with the candles. */
    function heatSeries(gridIdx) {
      if (!setup.heat || bars.length < 20) return [];
      const { runs, binSize, relOf } = liqHeatRuns(sym, tf, bars);
      if (!runs.length) return [];
      // clip to the VISIBLE candle range so far-away tiers can't stretch
      // the price axis (re-clipped when the zoom window settles)
      const vis = viewIdx
        ? bars.slice(clamp(viewIdx.s, 0, bars.length - 1), clamp(viewIdx.e, 0, bars.length - 1) + 1)
        : bars;
      let pLo = Infinity;
      let pHi = 0;
      for (const k of (vis.length ? vis : bars)) { pLo = Math.min(pLo, k.l); pHi = Math.max(pHi, k.h); }
      const pad = (pHi - pLo) * 0.04;
      pLo -= pad; pHi += pad;
      const data = [];
      for (const [from, to, bin, val] of runs) {
        const y0 = bin * binSize;
        if (y0 < pLo || y0 > pHi) continue;
        const rel = relOf(val);
        if (rel < 0.3) continue; // noise floor — Velo is mostly black; only real levels glow
        data.push([from - 0.5, to - 0.5, y0, y0 + binSize, Math.pow((rel - 0.3) / 0.7, 0.72)]);
      }
      return [{
        type: 'custom', xAxisIndex: gridIdx.x, yAxisIndex: gridIdx.y, silent: true, z: 1,
        progressive: 0, // paint in one pass — chunked rendering visibly pops in
        // keep the price axis honest: x reads dims 0-1, y reads the bin prices
        encode: { x: [0, 1], y: [2, 3] },
        data,
        renderItem(params, api) {
          const p0 = api.coord([api.value(0), api.value(3)]);
          const p1 = api.coord([api.value(1), api.value(2)]);
          const w = Math.max(p1[0] - p0[0], 0.75);
          const h = Math.max(p1[1] - p0[1], 0.75);
          const rel = api.value(4);
          // Velo's ramp: deep indigo → violet → hot magenta → near-white straw
          const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
          const cr = rel < 0.45 ? mix([49, 24, 132], [122, 40, 228], rel / 0.45)
            : rel < 0.78 ? mix([122, 40, 228], [244, 74, 198], (rel - 0.45) / 0.33)
            : mix([244, 74, 198], [255, 238, 186], (rel - 0.78) / 0.22);
          const alpha = (0.05 + rel * 0.9) * ((setup.heatAlpha ?? 70) / 100);
          return {
            type: 'rect',
            shape: { x: p0[0], y: p0[1], width: w, height: h },
            style: { fill: `rgba(${cr.map((x) => Math.round(x)).join(',')},${alpha.toFixed(2)})` },
          };
        },
      }];
    }

    /* ── render ───────────────────────────────────────────────────────── */
    function draw() {
      if (!chart || !bars.length) { paintLegend(); return; }
      const times = bars.map((k) => k.t);
      const labels = times.map((t) => {
        const d = new Date(t);
        const pad = (n) => String(n).padStart(2, '0');
        return tfMsOf(tf) >= 86.4e6
          ? `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
          : `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
      });

      const subs = setup.active.filter((a) => INDICATORS[a.id].pane === 'sub');
      const overlays = setup.active.filter((a) => INDICATORS[a.id].pane === 'price');

      const H = box.clientHeight || 480;
      const W = box.clientWidth || 900;
      const TOP = 8;
      const BOT = 26;
      const avail = H - TOP - BOT;
      // reserve the price pane FIRST — candles stay dominant, subs compress
      const minPrice = Math.max(160, avail * 0.42);
      const subH = subs.length
        ? clamp((avail - minPrice) / subs.length - 6, 26, 116)
        : 0;
      const priceH = avail - (subH + 6) * subs.length;

      const grids = [{ left: 6, right: 74, top: TOP, height: priceH }];
      priceRect = { x: 6, y: TOP, w: W - 6 - 74, h: priceH };
      const xAxes = [];
      const yAxes = [];
      let series = [];

      const mkX = (gi, show) => ({
        type: 'category', gridIndex: gi, data: labels, boundaryGap: true,
        axisLine: { lineStyle: { color: C.axis } }, axisTick: { show: false },
        axisLabel: show ? { ...AXIS_LBL, hideOverlap: true } : { show: false },
        splitLine: { show: false },
        axisPointer: { show: true, type: 'line', lineStyle: { color: 'rgba(139,133,163,0.4)', type: 'dashed' }, label: { show: false } },
      });
      const mkY = (gi, fmt) => ({
        type: 'value', gridIndex: gi, scale: true, position: 'right',
        splitNumber: gi === 0 ? 5 : 2, // sub panes are short — sparse labels
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { ...AXIS_LBL, formatter: fmt },
        splitLine: { lineStyle: { color: C.grid } },
        axisPointer: { show: gi === 0, type: 'line', lineStyle: { color: 'rgba(139,133,163,0.4)', type: 'dashed' }, label: { show: gi === 0, backgroundColor: '#2a2440', color: C.textStrong, fontFamily: C.mono, fontSize: 10, formatter: (p) => fmtPx(p.value) } },
      });

      xAxes.push(mkX(0, subs.length === 0));
      yAxes.push(mkY(0, fmtPx));

      // heatmap under everything, then candles
      series = series.concat(heatSeries({ x: 0, y: 0 }));
      series.push({
        name: `${sym}USD`, type: 'candlestick', xAxisIndex: 0, yAxisIndex: 0, z: 3,
        data: bars.map((k) => [k.o, k.c, k.l, k.h]),
        itemStyle: { color: C.up, color0: C.down, borderColor: C.up, borderColor0: C.down, borderWidth: 1 },
        barWidth: '62%',
        markLine: {
          silent: true, symbol: 'none', animation: false,
          data: [{ yAxis: bars[bars.length - 1].c }],
          lineStyle: { color: bars[bars.length - 1].c >= bars[bars.length - 1].o ? C.up : C.down, type: 'dashed', width: 1, opacity: 0.7 },
          label: { show: true, position: 'end', backgroundColor: bars[bars.length - 1].c >= bars[bars.length - 1].o ? C.up : C.down, color: '#0d0b18', fontFamily: C.mono, fontSize: 10, padding: [2, 5], formatter: (p) => fmtPx(p.value) },
        },
      });

      for (const a of overlays) {
        const st = indData.get(a.uid);
        if (!st?.d) continue;
        try { series = series.concat(INDICATORS[a.id].series(ctx(), st.s, st.d, { x: 0, y: 0, color: C.lines[0] })); }
        catch { /* misaligned mid-switch — next refresh redraws it */ }
      }

      let y = TOP + priceH + 6;
      subs.forEach((a, n) => {
        const gi = grids.length;
        grids.push({ left: 6, right: 74, top: y, height: subH });
        y += subH + 6;
        const isLast = n === subs.length - 1;
        xAxes.push(mkX(gi, isLast));
        const def = INDICATORS[a.id];
        yAxes.push(mkY(gi, def.fmt ?? fmtCompact));
        const st = indData.get(a.uid);
        let subSeries = null;
        if (st?.d) { try { subSeries = def.series(ctx(), st.s, st.d, { x: gi, y: gi }); } catch { /* mid-switch */ } }
        if (subSeries) series = series.concat(subSeries);
        else {
          // an empty axis keeps the pane visible while it loads/errors
          series.push({ type: 'line', xAxisIndex: gi, yAxisIndex: gi, data: [], showSymbol: false });
        }
      });

      const start = follow && zoomSpan ? Math.max(0, bars.length - zoomSpan) : null;
      if (start != null) viewIdx = { s: start, e: bars.length - 1 };
      // same pane/series structure => merge (keeps crosshair, hover state and
      // zoom alive through live ticks); anything structural => full rebuild
      const sig = `${sym}|${tf}|${W}x${H}|${grids.length}|${series.map((x) => x.type + (x.name ?? '')).join(',')}`;
      const structural = sig !== lastSig;
      lastSig = sig;
      chart.setOption({
        backgroundColor: 'transparent',
        animation: false,
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        tooltip: {
          ...TIP, trigger: 'axis', axisPointer: { type: 'line' },
          formatter: () => '', // legend rows carry the values — no floating box
        },
        grid: grids,
        xAxis: xAxes,
        yAxis: yAxes,
        dataZoom: [{
          type: 'inside', xAxisIndex: xAxes.map((_, i) => i),
          zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false,
          // ALWAYS pin the window — an unpinned dataZoom on a structural
          // rebuild snaps a trader inspecting history back to full range
          ...(start != null
            ? { startValue: start, endValue: bars.length - 1 }
            : viewIdx
              ? { startValue: clamp(viewIdx.s, 0, bars.length - 1), endValue: clamp(viewIdx.e, 0, bars.length - 1) }
              : {}),
        }],
        series,
      }, { notMerge: structural, lazyUpdate: true });
      paintLegend();
      paintDrawings();
    }

    /* ── data lifecycle ───────────────────────────────────────────────── */
    let goodSym = null; // last symbol that actually delivered candles
    async function reload() {
      paintTfs();
      paintSym();
      errStrip.classList.remove('on');
      indData.clear();
      loadSeq += 1;
      const seq = loadSeq;
      const wantSym = sym;
      const wantTf = tf;
      root.classList.add('loading');
      try {
        const since = Date.now() - tfMsOf(tf) * barsFor(tfMsOf(tf));
        const rows = await hlCandles(sym, tf, since);
        if (dead || seq !== loadSeq) return; // a newer switch superseded this fetch
        if (!rows) throw new Error(`${sym} isn't on Hyperliquid — try the search list`);
        bars = rows;
        goodSym = wantSym;
        viewIdx = null;
        zoomSpan = zoomSpan ?? Math.min(160, bars.length);
        draw();
        refreshAllIndicators();
      } catch (e) {
        if (dead || seq !== loadSeq) return;
        errStrip.textContent = e.message;
        errStrip.classList.add('on');
        // a bad ticker must not leave the toolbar lying over the old chart
        if (bars.length && goodSym && wantSym !== goodSym) {
          sym = goodSym;
          if (wantTf === tf) { paintSym(); buildLegend(); }
        }
      } finally {
        if (!dead && seq === loadSeq) root.classList.remove('loading');
      }
    }

    async function liveTick() {
      if (dead || root.classList.contains('loading')) return; // reload owns bars right now
      if (!bars.length) { // first load failed — keep trying instead of dying
        reload();
        return;
      }
      const seq = loadSeq;
      const myBars = bars; // identity guard — a reload swaps the array wholesale
      try {
        const rows = await hlCandles(sym, tf, bars[bars.length - 1].t - tfMsOf(tf));
        if (dead || seq !== loadSeq || bars !== myBars || !rows?.length) return;
        for (const k of rows) {
          const last = bars[bars.length - 1];
          if (k.t === last.t) bars[bars.length - 1] = k;
          else if (k.t > last.t) { bars.push(k); if (bars.length > barsFor(tfMsOf(tf)) + 40) bars.shift(); }
        }
        // keep every indicator aligned with the live bar — candle-derived ones
        // recompute locally, venue aggregates ride the 2-minute promise cache
        errStrip.classList.remove('on');
        refreshAllIndicators();
        scheduleDraw();
      } catch { /* next tick */ }
    }

    function setSymbol(s) {
      if (s === sym) return;
      sym = s;
      drawings = loadDrawings();
      drawSel = null;
      pending = null;
      reload();
    }

    /* ── drawing layer: TV-style tools, anchored in (time, price) so every
       object survives pan/zoom/TF switches; persisted per symbol ───────── */
    const DRAW_KEY = (s) => `viceHub.vchartDraw.${s}`;
    const TOOLS = [
      ['cursor', 'mouse-pointer', 'Select / pan'],
      ['trend', 'trending-up', 'Trend line'],
      ['hline', 'minus', 'Horizontal line'],
      ['vline', 'separator-vertical', 'Vertical line'],
      ['ruler', 'ruler', 'Measure'],
      ['text', 'type', 'Text'],
      ['brush', 'brush', 'Brush'],
    ];
    let drawTool = 'cursor';
    let drawings = [];
    let drawSel = null;
    let drawMagnet = true;
    let drawHidden = false;
    let drawLocked = false;
    let pending = null; // in-progress object
    let dragCtx = null; // {id, ptIdx|-1 (whole), startPx, orig}
    let priceRect = { x: 40, y: 8, w: 600, h: 300 }; // set by draw()
    let drawSaveT = null;

    const loadDrawings = () => {
      try {
        const j = JSON.parse(localStorage.getItem(DRAW_KEY(sym)) ?? 'null');
        return Array.isArray(j?.items) ? j.items.filter((d) => d && d.type && Array.isArray(d.pts)) : [];
      } catch { return []; }
    };
    const saveDrawings = () => {
      clearTimeout(drawSaveT);
      drawSaveT = setTimeout(() => {
        try { localStorage.setItem(DRAW_KEY(sym), JSON.stringify({ v: 1, items: drawings })); }
        catch { /* quota */ }
      }, 250);
    };

    const t2x = (t) => (t - bars[0].t) / tfMsOf(tf);
    const x2t = (x) => bars[0].t + x * tfMsOf(tf);
    const d2px = (pt) => {
      try { return chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [t2x(pt.t), pt.p]); }
      catch { return null; }
    };
    const px2d = (x, y) => {
      try {
        const v = chart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [x, y]);
        return { t: x2t(v[0]), p: v[1] };
      } catch { return null; }
    };
    const snapPt = (pt, py) => {
      if (!drawMagnet || !bars.length) return pt;
      const idx = clamp(Math.round(t2x(pt.t)), 0, bars.length - 1);
      const k = bars[idx];
      let best = null;
      for (const v of [k.o, k.h, k.l, k.c]) {
        const vy = d2px({ t: pt.t, p: v })?.[1];
        if (vy == null) continue;
        if (best == null || Math.abs(vy - py) < Math.abs(best.vy - py)) best = { v, vy };
      }
      if (best && Math.abs(best.vy - py) < 9) return { t: k.t, p: best.v };
      return pt;
    };

    const distSeg = (px, py, a, b) => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len2 = dx * dx + dy * dy || 1;
      const u = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / len2, 0, 1);
      return Math.hypot(px - (a[0] + u * dx), py - (a[1] + u * dy));
    };
    function hitTest(px, py) {
      if (drawHidden) return null;
      for (let i = drawings.length - 1; i >= 0; i--) {
        const d = drawings[i];
        const pts = d.pts.map(d2px);
        if (pts.some((p) => !p)) continue;
        if (d.type === 'hline') { if (Math.abs(py - pts[0][1]) < 6) return { d, ptIdx: -1 }; continue; }
        if (d.type === 'vline') { if (Math.abs(px - pts[0][0]) < 6) return { d, ptIdx: -1 }; continue; }
        if (d.type === 'text') {
          if (px >= pts[0][0] - 4 && px <= pts[0][0] + 8 + (d.text?.length ?? 1) * 7 && Math.abs(py - pts[0][1]) < 12) return { d, ptIdx: -1 };
          continue;
        }
        for (let j = 0; j < pts.length; j++) if (Math.hypot(px - pts[j][0], py - pts[j][1]) < 8) return { d, ptIdx: j };
        for (let j = 0; j + 1 < pts.length; j++) if (distSeg(px, py, pts[j], pts[j + 1]) < 6) return { d, ptIdx: -1 };
      }
      return null;
    }

    function paintDrawings() {
      const dpr = window.devicePixelRatio || 1;
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (drawCv.width !== w * dpr || drawCv.height !== h * dpr) {
        drawCv.width = w * dpr;
        drawCv.height = h * dpr;
      }
      const ctx = drawCv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (drawHidden || !chart || !bars.length) return;
      const railW = rail.offsetWidth;
      ctx.save();
      ctx.beginPath();
      ctx.rect(priceRect.x + railW, priceRect.y, priceRect.w, priceRect.h);
      ctx.translate(railW, 0); // chart canvas sits right of the rail
      ctx.clip();
      const items = pending ? [...drawings, pending] : drawings;
      for (const d of items) {
        const pts = d.pts.map(d2px);
        if (!pts.length || pts.some((p) => !p)) continue;
        const seld = drawSel === d.id;
        ctx.strokeStyle = seld ? '#f6f5fb' : '#2dd4bf';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = d.type === 'brush' ? 1.6 : 1.25;
        ctx.setLineDash([]);
        if (d.type === 'hline') {
          ctx.beginPath();
          ctx.moveTo(priceRect.x, pts[0][1]);
          ctx.lineTo(priceRect.x + priceRect.w, pts[0][1]);
          ctx.stroke();
          ctx.font = '10px Geist Mono, monospace';
          ctx.fillText(fmtPx(d.pts[0].p), priceRect.x + 4, pts[0][1] - 4);
        } else if (d.type === 'vline') {
          ctx.beginPath();
          ctx.moveTo(pts[0][0], priceRect.y);
          ctx.lineTo(pts[0][0], priceRect.y + priceRect.h);
          ctx.stroke();
        } else if (d.type === 'text') {
          ctx.font = '12px Geist Mono, monospace';
          ctx.fillText(d.text ?? '', pts[0][0], pts[0][1]);
        } else if (d.type === 'ruler' && pts.length === 2) {
          const [a, b] = pts;
          ctx.fillStyle = 'rgba(45,212,191,0.09)';
          ctx.fillRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
          ctx.setLineDash([]);
          const dp = d.pts[1].p - d.pts[0].p;
          const pct = (dp / d.pts[0].p) * 100;
          const nb = Math.round((d.pts[1].t - d.pts[0].t) / tfMsOf(tf));
          const lbl = `${dp >= 0 ? '+' : ''}${fmtPx(dp)}  ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%  ${nb} bars`;
          ctx.font = '10.5px Geist Mono, monospace';
          const tw = ctx.measureText(lbl).width + 12;
          const lx = clamp((a[0] + b[0]) / 2 - tw / 2, priceRect.x, priceRect.x + priceRect.w - tw);
          const ly = Math.min(a[1], b[1]) - 20;
          ctx.fillStyle = '#14121f';
          ctx.strokeStyle = '#363049';
          ctx.lineWidth = 1;
          ctx.fillRect(lx, ly, tw, 16);
          ctx.strokeRect(lx, ly, tw, 16);
          ctx.fillStyle = dp >= 0 ? '#21d196' : '#ff6473';
          ctx.fillText(lbl, lx + 6, ly + 11.5);
        } else { // trend / brush
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.stroke();
        }
        if (seld && d.type !== 'brush') {
          ctx.fillStyle = '#f6f5fb';
          for (const p of pts) ctx.fillRect(p[0] - 3, p[1] - 3, 6, 6);
        }
      }
      ctx.restore();
    }

    const syncDrawUi = () => {
      rail.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === drawTool));
      rail.querySelector('[data-dact="magnet"]')?.classList.toggle('on', drawMagnet);
      rail.querySelector('[data-dact="hide"]')?.classList.toggle('on', drawHidden);
      rail.querySelector('[data-dact="lock"]')?.classList.toggle('on', drawLocked);
      drawCv.style.pointerEvents = (drawTool !== 'cursor' && !drawLocked) || drawSel ? 'auto' : 'none';
      box.style.cursor = drawTool === 'cursor' ? '' : 'crosshair';
    };
    function buildRail() {
      rail.innerHTML = '';
      for (const [key, icon, tip] of TOOLS) {
        const b = el('button', 'vcp-tool', `<i data-lucide="${icon}"></i>`);
        b.dataset.tool = key;
        b.title = tip;
        b.addEventListener('click', () => {
          if (drawLocked && key !== 'cursor') return;
          drawTool = drawTool === key ? 'cursor' : key;
          pending = null;
          syncDrawUi();
        });
        rail.appendChild(b);
      }
      rail.appendChild(el('span', 'vcp-rail-sep'));
      const acts = [
        ['magnet', 'magnet', 'Snap to OHLC'],
        ['hide', 'eye', 'Hide drawings'],
        ['lock', 'lock', 'Lock drawings'],
        ['clear', 'trash-2', 'Clear all drawings'],
      ];
      for (const [key, icon, tip] of acts) {
        const b = el('button', 'vcp-tool', `<i data-lucide="${icon}"></i>`);
        b.dataset.dact = key;
        b.title = tip;
        b.addEventListener('click', () => {
          if (key === 'magnet') drawMagnet = !drawMagnet;
          else if (key === 'hide') { drawHidden = !drawHidden; drawSel = null; }
          else if (key === 'lock') { drawLocked = !drawLocked; drawSel = null; if (drawLocked) drawTool = 'cursor'; }
          else if (key === 'clear') { drawings = []; drawSel = null; pending = null; saveDrawings(); }
          syncDrawUi();
          paintDrawings();
        });
        rail.appendChild(b);
      }
      icons();
      syncDrawUi();
    }

    const cvPos = (ev) => {
      const r = drawCv.getBoundingClientRect();
      const railW = rail.offsetWidth;
      return [ev.clientX - r.left - railW, ev.clientY - r.top];
    };
    function openTextInput(pt, px, py) {
      const inp = document.createElement('input');
      inp.className = 'vcp-drawtext';
      inp.style.left = `${px + rail.offsetWidth}px`;
      inp.style.top = `${py - 12}px`;
      inp.maxLength = 60;
      stage.appendChild(inp);
      inp.focus();
      const commit = () => {
        const v = inp.value.trim();
        inp.remove();
        if (v) {
          const d = { id: mkUid(), type: 'text', pts: [pt], text: v };
          drawings.push(d);
          drawSel = d.id;
          saveDrawings();
        }
        drawTool = 'cursor';
        syncDrawUi();
        paintDrawings();
      };
      inp.addEventListener('keydown', (ev) => {
        ev.stopPropagation();
        if (ev.key === 'Enter') commit();
        if (ev.key === 'Escape') { inp.remove(); drawTool = 'cursor'; syncDrawUi(); }
      });
      inp.addEventListener('blur', commit);
    }
    drawCv.addEventListener('pointerdown', (ev) => {
      if (!chart || !bars.length) return;
      const [x, y] = cvPos(ev);
      if (drawTool === 'cursor') {
        const hit = drawLocked ? null : hitTest(x, y);
        if (hit) {
          drawSel = hit.d.id;
          dragCtx = { id: hit.d.id, ptIdx: hit.ptIdx, start: [x, y], orig: JSON.parse(JSON.stringify(hit.d.pts)) };
          drawCv.setPointerCapture(ev.pointerId);
        } else {
          drawSel = null;
          syncDrawUi();
        }
        paintDrawings();
        return;
      }
      let pt = px2d(x, y);
      if (!pt) return;
      pt = snapPt(pt, y);
      if (drawTool === 'hline' || drawTool === 'vline') {
        const d = { id: mkUid(), type: drawTool, pts: [pt] };
        drawings.push(d);
        drawSel = d.id;
        drawTool = 'cursor';
        saveDrawings();
        syncDrawUi();
        paintDrawings();
        return;
      }
      if (drawTool === 'text') { openTextInput(pt, x, y); return; }
      pending = { id: mkUid(), type: drawTool, pts: drawTool === 'brush' ? [pt] : [pt, pt] };
      drawCv.setPointerCapture(ev.pointerId);
    });
    drawCv.addEventListener('pointermove', (ev) => {
      if (!chart || !bars.length) return;
      const [x, y] = cvPos(ev);
      if (dragCtx) {
        const d = drawings.find((q) => q.id === dragCtx.id);
        if (!d) { dragCtx = null; return; }
        const from = px2d(dragCtx.start[0], dragCtx.start[1]);
        const to = px2d(x, y);
        if (!from || !to) return;
        if (dragCtx.ptIdx >= 0) {
          d.pts[dragCtx.ptIdx] = snapPt(to, y);
        } else {
          const dt = to.t - from.t;
          const dp = to.p - from.p;
          d.pts = dragCtx.orig.map((p) => ({ t: p.t + dt, p: p.p + dp }));
        }
        paintDrawings();
        return;
      }
      if (!pending) return;
      let pt = px2d(x, y);
      if (!pt) return;
      pt = snapPt(pt, y);
      if (pending.type === 'brush') {
        const last = pending.pts[pending.pts.length - 1];
        const lp = d2px(last);
        if (!lp || Math.hypot(x - lp[0], y - lp[1]) > 4) pending.pts.push(pt);
      } else pending.pts[1] = pt;
      paintDrawings();
    });
    drawCv.addEventListener('pointerup', () => {
      if (dragCtx) { dragCtx = null; saveDrawings(); return; }
      if (!pending) return;
      const done = pending;
      pending = null;
      const span = done.pts.length > 1 ? Math.hypot(...(() => {
        const a = d2px(done.pts[0]);
        const b = d2px(done.pts[done.pts.length - 1]);
        return a && b ? [b[0] - a[0], b[1] - a[1]] : [0, 0];
      })()) : 0;
      if (done.type !== 'brush' && span < 3) { paintDrawings(); return; } // accidental click
      drawings.push(done);
      drawSel = done.id;
      drawTool = 'cursor';
      saveDrawings();
      syncDrawUi();
      paintDrawings();
    });
    const drawKeyHandler = (ev) => {
      if ((ev.key === 'Delete' || ev.key === 'Backspace') && drawSel
        && !ev.target.closest?.('input, textarea, select, [contenteditable]')) {
        drawings = drawings.filter((d) => d.id !== drawSel);
        drawSel = null;
        saveDrawings();
        syncDrawUi();
        paintDrawings();
        ev.preventDefault();
      }
      if (ev.key === 'Escape' && (pending || drawTool !== 'cursor')) {
        pending = null;
        drawTool = 'cursor';
        syncDrawUi();
        paintDrawings();
      }
    };
    document.addEventListener('keydown', drawKeyHandler);
    // cursor-mode selection without stealing the chart's pan: hit-test on zr
    const zrClickSel = () => {
      chart.getZr().on('mousedown', (e) => {
        if (drawTool !== 'cursor' || drawLocked || drawHidden) return;
        const hit = hitTest(e.offsetX, e.offsetY);
        if (hit) { drawSel = hit.d.id; syncDrawUi(); paintDrawings(); }
        else if (drawSel) { drawSel = null; syncDrawUi(); paintDrawings(); }
      });
    };

    /* boot */
    let tries = 0;
    const start = () => {
      if (dead) return;
      if (!window.echarts) {
        if (++tries > 75) { errStrip.textContent = "the chart engine didn't load — refresh"; errStrip.classList.add('on'); return; }
        setTimeout(start, 200);
        return;
      }
      chart = window.echarts.init(box, null, { renderer: 'canvas' });
      if (window.LTUtils?.echartsZoomShim) window.LTUtils.echartsZoomShim(box);
      drawings = loadDrawings();
      buildRail();
      zrClickSel();
      chart.on('updateAxisPointer', (ev) => {
        const xi = ev.axesInfo?.find((a) => a.axisDim === 'x');
        const next = xi ? clamp(Math.round(xi.value), 0, bars.length - 1) : null;
        if (next !== hoverIdx) { hoverIdx = next; paintLegend(); }
      });
      chart.getZr().on('globalout', () => { hoverIdx = null; paintLegend(); });
      chart.on('datazoom', (ev) => {
        // payload carries the window — getOption() deep-clones the world
        const b = ev.batch?.[0] ?? ev;
        let s = b.startValue;
        let e = b.endValue;
        if (s == null || e == null) {
          const pct = (p, d) => (p == null ? d : Math.round((p / 100) * (bars.length - 1)));
          s = pct(b.start, 0);
          e = pct(b.end, bars.length - 1);
        }
        const dz = { startValue: s, endValue: e };
        const endIdx = dz.endValue ?? bars.length - 1;
        follow = endIdx >= bars.length - 2;
        if (follow) zoomSpan = Math.max(20, Math.round((dz.endValue ?? bars.length - 1) - (dz.startValue ?? 0) + 1));
        viewIdx = { s: Math.round(dz.startValue ?? 0), e: Math.round(endIdx) };
        paintDrawings(); // drawings track the pan/zoom in real time
        if (setup.heat) {
          // the heat clip follows the window — redraw once the gesture settles
          clearTimeout(heatRedraw);
          heatRedraw = setTimeout(() => { if (!dead) draw(); }, 140);
        }
      });
      ro = new ResizeObserver(() => { chart?.resize(); scheduleDraw(); });
      ro.observe(box);
      // TV muscle memory: start typing a ticker anywhere over the chart
      keyHandler = (ev) => {
        if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
        if (!/^[a-zA-Z]$/.test(ev.key)) return;
        const t = ev.target;
        if (t.closest?.('input, textarea, select, [contenteditable]')) return;
        if (!root.closest('body')) return;
        if (stage.querySelector('.vcp-search')) return;
        if (!root.matches(':hover')) return;
        openSymSearch();
        const inp = stage.querySelector('.vcp-search-inp');
        if (inp) { inp.value = ev.key.toUpperCase(); inp.dispatchEvent(new Event('keydown')); }
        ev.preventDefault();
      };
      document.addEventListener('keydown', keyHandler);
      paintSym();
      paintTfs();
      syncHeat();
      buildLegend();
      icons();
      reload();
      liveTimer = setInterval(liveTick, 5000);
    };
    start();

    return {
      destroy() {
        dead = true;
        document.removeEventListener('fullscreenchange', onFsChange);
        document.removeEventListener('keydown', drawKeyHandler);
        if (keyHandler) document.removeEventListener('keydown', keyHandler);
        clearInterval(liveTimer);
        ro?.disconnect();
        chart?.dispose();
        closeMenu();
        root.remove();
      },
      refresh() { reload(); },
      setSymbol,
    };
  }

  window.VChartPro = { mount };
})();
