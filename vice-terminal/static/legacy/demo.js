/* Vice Charts — in-page live demo.
   This is the actual chart-bot engine ported to the browser: same command
   parser, same indicator math, same chart-option builder. Data comes straight
   from the exchanges' public APIs (Hyperliquid + Coinbase + GeckoTerminal
   allow CORS; KuCoin and Kraken don't, so kc:/kr: point users at the real
   bot in Discord).
   Rendering: ECharts in the page instead of the bot's server-side PNG. */

/* ── config / theme (mirrors the bot's config.js) ─────────────────────── */
const DEFAULT_TIMEFRAME = '15m';
const DEFAULT_CANDLES = 300;
const SHORT_CANDLES = 150;
const LONG_CANDLES = 1000;
const MAX_CANDLES = 1400;
const MAX_COMPARE_SYMBOLS = 10;
const WARMUP = 220;

const THEME = {
  bg: '#0d0b18',
  grid: '#1e2530',
  text: '#8b98a9',
  textStrong: '#e6edf3',
  up: '#16c784',
  down: '#ea3943',
  volUp: 'rgba(22,199,132,0.45)',
  volDown: 'rgba(234,57,67,0.45)',
  overlayColors: ['#f0b90b', '#3b82f6', '#a855f7', '#ec4899', '#22d3ee', '#f97316'],
  compareColors: ['#f0b90b', '#3b82f6', '#16c784', '#ea3943', '#a855f7', '#ec4899', '#22d3ee', '#f97316', '#84cc16', '#e6edf3'],
};

/* ── data venues ──────────────────────────────────────────────────────── */
const TF = {
  '1m': { hl: '1m', cb: 60, ms: 60_000 },
  '3m': { hl: '3m', cb: null, ms: 180_000 },
  '5m': { hl: '5m', cb: 300, ms: 300_000 },
  '15m': { hl: '15m', cb: 900, ms: 900_000 },
  '30m': { hl: '30m', cb: null, ms: 1_800_000 },
  '1h': { hl: '1h', cb: 3600, ms: 3_600_000 },
  '2h': { hl: '2h', cb: null, ms: 7_200_000 },
  '4h': { hl: '4h', cb: null, ms: 14_400_000 },
  '6h': { hl: null, cb: 21600, ms: 21_600_000 },
  '8h': { hl: '8h', cb: null, ms: 28_800_000 },
  '12h': { hl: '12h', cb: null, ms: 43_200_000 },
  '1d': { hl: '1d', cb: 86400, ms: 86_400_000 },
  '3d': { hl: '3d', cb: null, ms: 259_200_000 },
  '1w': { hl: '1w', cb: null, ms: 604_800_000 },
  '1mo': { hl: '1M', cb: null, ms: 2_592_000_000 },
};
const TIMEFRAMES = Object.keys(TF);
const tfMs = (tf) => TF[tf].ms;

async function getJson(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${new URL(url).host} HTTP ${res.status}`);
  return res.json();
}

async function hyperliquid(base, timeframe, limit) {
  const tf = TF[timeframe];
  if (!tf.hl) throw new Error(`Hyperliquid doesn't have ${timeframe} candles`);
  const end = Date.now();
  const rows = await getJson('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'candleSnapshot',
      req: { coin: base, interval: tf.hl, startTime: end - tf.ms * (limit + 2), endTime: end },
    }),
  });
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows.map((k) => ({ t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v }));
}

async function coinbase(base, timeframe, limit) {
  const tf = TF[timeframe];
  if (!tf.cb) throw new Error(`Coinbase supports 1m 5m 15m 1h 6h 1d (not ${timeframe})`);
  const out = [];
  let end = Date.now();
  for (let page = 0; page < 2 && out.length < limit; page++) {
    const start = end - tf.cb * 1000 * 300;
    const rows = await getJson(
      `https://api.exchange.coinbase.com/products/${base}-USD/candles?granularity=${tf.cb}` +
      `&start=${new Date(start).toISOString()}&end=${new Date(end).toISOString()}`,
    ).catch((e) => { if (page === 0) throw e; return []; });
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.unshift(...rows.reverse().map((r) => ({ t: r[0] * 1000, o: r[3], h: r[2], l: r[1], c: r[4], v: r[5] })));
    end = start;
  }
  return out.length ? out.slice(-limit) : null;
}

/* GeckoTerminal DEX pools (CORS-friendly): gt:<name> or a pasted contract
   address. Same resolution as the bot: deepest pool wins. */
const GT_API = 'https://api.geckoterminal.com/api/v2';
const GT_TF = {
  '1m': ['minute', 1], '5m': ['minute', 5], '15m': ['minute', 15],
  '1h': ['hour', 1], '4h': ['hour', 4], '12h': ['hour', 12], '1d': ['day', 1],
};
const gtPools = new Map();

async function gtResolve(query) {
  const key = query.toLowerCase();
  if (gtPools.has(key)) return gtPools.get(key);
  const json = await getJson(`${GT_API}/search/pools?query=${encodeURIComponent(query)}&page=1`);
  const pools = json?.data ?? [];
  if (pools.length === 0) return null;
  const best = [...pools.slice(0, 10)].sort(
    (a, b) => Number(b.attributes.reserve_in_usd || 0) - Number(a.attributes.reserve_in_usd || 0),
  )[0];
  const pool = best.attributes.address;
  const resolved = { network: best.id.slice(0, best.id.length - pool.length - 1), pool };
  gtPools.set(key, resolved);
  return resolved;
}

async function gecko(base, timeframe, limit) {
  const tf = GT_TF[timeframe];
  if (!tf) throw new Error(`GeckoTerminal supports 1m 5m 15m 1h 4h 12h 1d (not ${timeframe})`);
  const friendly429 = (err) => {
    if (/HTTP 429/.test(err.message)) throw new Error('GeckoTerminal rate limit hit — try again in a minute');
    throw err;
  };
  const r = await gtResolve(base).catch(friendly429);
  if (!r) return null;
  const json = await getJson(
    `${GT_API}/networks/${r.network}/pools/${r.pool}/ohlcv/${tf[0]}` +
    `?aggregate=${tf[1]}&limit=${Math.min(limit, 1000)}&currency=usd&token=base`,
  ).catch(friendly429);
  const rows = json?.data?.attributes?.ohlcv_list;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const sym = (json.meta?.base?.symbol ?? base).toUpperCase();
  const candles = rows
    .map((k) => ({ t: k[0] * 1000, o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }))
    .sort((x, y) => x.t - y.t);
  return { candles, venueLabel: 'GeckoTerminal', name: sym, pair: `${sym}/USD (${r.network})` };
}

async function fetchCandles(symbol, timeframe, limit) {
  if (symbol.venue === 'gt') {
    // addresses are case-sensitive (Solana) — no uppercasing
    const r = await gecko(symbol.base, timeframe, limit);
    if (!r) throw new Error(`no pool found on GeckoTerminal for "${symbol.base}"`);
    return r;
  }
  const base = symbol.base.toUpperCase();
  if (symbol.venue === 'kc' || symbol.venue === 'kr') {
    throw new Error(`${symbol.venue === 'kc' ? 'KuCoin' : 'Kraken'} data isn't reachable from a browser — the real bot in Discord covers it`);
  }
  if (symbol.venue !== 'cb') {
    // explicit hl: keeps its real error; auto falls through to Coinbase on ANY
    // failure (unsupported TF like 6h, geo-block, timeout) — an HL throw used
    // to kill the whole chart even though the TF table carries cb:21600 for it
    const candles = symbol.venue === 'hl'
      ? await hyperliquid(base, timeframe, limit)
      : await hyperliquid(base, timeframe, limit).catch(() => null);
    if (candles) return { candles, venueLabel: 'Hyperliquid', name: base, pair: `${base} PERP` };
    if (symbol.venue === 'hl') throw new Error(`${base} isn't listed on Hyperliquid`);
  }
  const candles = await coinbase(base, timeframe, Math.min(limit, 580))
    .catch((e) => { if (symbol.venue === 'cb') throw e; return null; });
  if (!candles) throw new Error(`can't find ${base} ${timeframe} on Hyperliquid or Coinbase — check the ticker`);
  return { candles, venueLabel: 'Coinbase', name: base, pair: `${base}/USD` };
}

async function hlAssetContexts() {
  const [meta, ctxs] = await getJson('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
  });
  return meta.universe.map((u, i) => ({
    name: u.name,
    delisted: !!u.isDelisted,
    markPx: +ctxs[i].markPx,
    prevDayPx: +ctxs[i].prevDayPx,
    dayNtlVlm: +ctxs[i].dayNtlVlm,
  }));
}

/* ── indicators (verbatim port of the bot's indicators.js) ────────────── */
function sma(v, n) {
  const out = new Array(v.length).fill(null);
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i];
    if (i >= n) sum -= v[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}
function ema(v, n) {
  const out = new Array(v.length).fill(null);
  const k = 2 / (n + 1);
  let prev = null;
  let seed = 0;
  for (let i = 0; i < v.length; i++) {
    if (v[i] == null) continue;
    if (prev == null) {
      seed += v[i];
      if (i >= n - 1) { prev = seed / n; out[i] = prev; }
      continue;
    }
    prev = v[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}
function rma(v, n) {
  const out = new Array(v.length).fill(null);
  let prev = null;
  let seed = 0;
  let seen = 0;
  for (let i = 0; i < v.length; i++) {
    if (v[i] == null) continue;
    if (prev == null) {
      seed += v[i];
      if (++seen === n) { prev = seed / n; out[i] = prev; }
      continue;
    }
    prev = (prev * (n - 1) + v[i]) / n;
    out[i] = prev;
  }
  return out;
}
function wma(v, n) {
  const out = new Array(v.length).fill(null);
  const denom = (n * (n + 1)) / 2;
  for (let i = n - 1; i < v.length; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += v[i - j] * (n - j);
    out[i] = sum / denom;
  }
  return out;
}
function dema(v, n) {
  const e1 = ema(v, n);
  const e2 = ema(e1, n);
  return v.map((_, i) => (e1[i] != null && e2[i] != null ? 2 * e1[i] - e2[i] : null));
}
function tema(v, n) {
  const e1 = ema(v, n);
  const e2 = ema(e1, n);
  const e3 = ema(e2, n);
  return v.map((_, i) =>
    e1[i] != null && e2[i] != null && e3[i] != null ? 3 * e1[i] - 3 * e2[i] + e3[i] : null);
}
function hma(v, n) {
  const half = wma(v, Math.max(2, Math.round(n / 2)));
  const full = wma(v, n);
  const diff = v.map((_, i) => (half[i] != null && full[i] != null ? 2 * half[i] - full[i] : null));
  const first = diff.findIndex((x) => x != null);
  if (first < 0) return diff;
  const tail = wma(diff.slice(first), Math.max(2, Math.round(Math.sqrt(n))));
  const out = new Array(v.length).fill(null);
  for (let i = 0; i < tail.length; i++) out[first + i] = tail[i];
  return out;
}
function alma(v, n, offset = 0.85, sigma = 6) {
  const out = new Array(v.length).fill(null);
  const m = offset * (n - 1);
  const s = n / sigma;
  const w = [];
  let wSum = 0;
  for (let j = 0; j < n; j++) { w[j] = Math.exp(-((j - m) ** 2) / (2 * s * s)); wSum += w[j]; }
  for (let i = n - 1; i < v.length; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += v[i - n + 1 + j] * w[j];
    out[i] = sum / wSum;
  }
  return out;
}
function lsma(v, n) {
  const out = new Array(v.length).fill(null);
  const sx = (n * (n - 1)) / 2;
  const sxx = ((n - 1) * n * (2 * n - 1)) / 6;
  for (let i = n - 1; i < v.length; i++) {
    let sy = 0;
    let sxy = 0;
    for (let j = 0; j < n; j++) { sy += v[i - n + 1 + j]; sxy += j * v[i - n + 1 + j]; }
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    out[i] = (sy - slope * sx) / n + slope * (n - 1);
  }
  return out;
}
function vwma(candles, n) {
  const out = new Array(candles.length).fill(null);
  for (let i = n - 1; i < candles.length; i++) {
    let pv = 0;
    let vol = 0;
    for (let j = i - n + 1; j <= i; j++) { pv += candles[j].c * candles[j].v; vol += candles[j].v; }
    out[i] = vol > 0 ? pv / vol : null;
  }
  return out;
}
function vwap(candles) {
  const out = new Array(candles.length).fill(null);
  let pv = 0;
  let vol = 0;
  for (let i = 0; i < candles.length; i++) {
    const typ = (candles[i].h + candles[i].l + candles[i].c) / 3;
    pv += typ * candles[i].v;
    vol += candles[i].v;
    out[i] = vol > 0 ? pv / vol : null;
  }
  return out;
}
function bollinger(v, n, mult = 2) {
  const mid = sma(v, n);
  const upper = new Array(v.length).fill(null);
  const lower = new Array(v.length).fill(null);
  for (let i = n - 1; i < v.length; i++) {
    let variance = 0;
    for (let j = i - n + 1; j <= i; j++) variance += (v[j] - mid[i]) ** 2;
    const sd = Math.sqrt(variance / n);
    upper[i] = mid[i] + mult * sd;
    lower[i] = mid[i] - mult * sd;
  }
  return { mid, upper, lower };
}
function trueRange(candles) {
  return candles.map((k, i) => {
    if (i === 0) return k.h - k.l;
    const pc = candles[i - 1].c;
    return Math.max(k.h - k.l, Math.abs(k.h - pc), Math.abs(k.l - pc));
  });
}
const atr = (candles, n) => rma(trueRange(candles), n);
function supertrend(candles, n = 10, mult = 3) {
  const a = atr(candles, n);
  const line = new Array(candles.length).fill(null);
  const dir = new Array(candles.length).fill(null);
  let finalUp = null;
  let finalDn = null;
  let trend = 1;
  for (let i = 0; i < candles.length; i++) {
    if (a[i] == null) continue;
    const mid = (candles[i].h + candles[i].l) / 2;
    const basicUp = mid - mult * a[i];
    const basicDn = mid + mult * a[i];
    const prevClose = i > 0 ? candles[i - 1].c : candles[i].c;
    finalUp = finalUp == null || basicUp > finalUp || prevClose < finalUp ? basicUp : finalUp;
    finalDn = finalDn == null || basicDn < finalDn || prevClose > finalDn ? basicDn : finalDn;
    if (candles[i].c > finalDn) trend = 1;
    else if (candles[i].c < finalUp) trend = -1;
    line[i] = trend === 1 ? finalUp : finalDn;
    dir[i] = trend;
  }
  return { line, dir };
}
function rsi(v, n) {
  const out = new Array(v.length).fill(null);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < v.length; i++) {
    const d = v[i] - v[i - 1];
    const g = Math.max(d, 0);
    const l = Math.max(-d, 0);
    if (i <= n) {
      gain += g;
      loss += l;
      if (i === n) {
        gain /= n; loss /= n;
        out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
      }
      continue;
    }
    gain = (gain * (n - 1) + g) / n;
    loss = (loss * (n - 1) + l) / n;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}
function macd(v, fast = 12, slow = 26, signalN = 9) {
  const emaFast = ema(v, fast);
  const emaSlow = ema(v, slow);
  const line = v.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null);
  const signal = ema(line, signalN);
  const hist = line.map((x, i) => (x != null && signal[i] != null ? x - signal[i] : null));
  return { line, signal, hist };
}
function stoch(candles, n = 14, kSmooth = 3, dSmooth = 3) {
  const raw = candles.map((k, i) => {
    if (i < n - 1) return null;
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - n + 1; j <= i; j++) { hh = Math.max(hh, candles[j].h); ll = Math.min(ll, candles[j].l); }
    return hh === ll ? 50 : ((k.c - ll) / (hh - ll)) * 100;
  });
  const smaNN = (arr, m) => {
    const first = arr.findIndex((x) => x != null);
    if (first < 0) return arr;
    const tail = sma(arr.slice(first), m);
    const out = new Array(arr.length).fill(null);
    for (let i = 0; i < tail.length; i++) out[first + i] = tail[i];
    return out;
  };
  const k = smaNN(raw, kSmooth);
  return { k, d: smaNN(k, dSmooth) };
}
function adx(candles, n = 14) {
  const len = candles.length;
  const plusDM = new Array(len).fill(0);
  const minusDM = new Array(len).fill(0);
  for (let i = 1; i < len; i++) {
    const up = candles[i].h - candles[i - 1].h;
    const down = candles[i - 1].l - candles[i].l;
    plusDM[i] = up > down && up > 0 ? up : 0;
    minusDM[i] = down > up && down > 0 ? down : 0;
  }
  const atrN = rma(trueRange(candles), n);
  const pdi = rma(plusDM, n).map((x, i) => (x != null && atrN[i] ? (100 * x) / atrN[i] : null));
  const mdi = rma(minusDM, n).map((x, i) => (x != null && atrN[i] ? (100 * x) / atrN[i] : null));
  const dx = pdi.map((p, i) => {
    const m = mdi[i];
    if (p == null || m == null || p + m === 0) return null;
    return (100 * Math.abs(p - m)) / (p + m);
  });
  return { adx: rma(dx, n), pdi, mdi };
}
function cci(candles, n = 20) {
  const tp = candles.map((k) => (k.h + k.l + k.c) / 3);
  const mid = sma(tp, n);
  const out = new Array(candles.length).fill(null);
  for (let i = n - 1; i < candles.length; i++) {
    let dev = 0;
    for (let j = i - n + 1; j <= i; j++) dev += Math.abs(tp[j] - mid[i]);
    dev /= n;
    out[i] = dev === 0 ? 0 : (tp[i] - mid[i]) / (0.015 * dev);
  }
  return out;
}
function mfi(candles, n = 14) {
  const out = new Array(candles.length).fill(null);
  const tp = candles.map((k) => (k.h + k.l + k.c) / 3);
  for (let i = n; i < candles.length; i++) {
    let pos = 0;
    let neg = 0;
    for (let j = i - n + 1; j <= i; j++) {
      const flow = tp[j] * candles[j].v;
      if (tp[j] > tp[j - 1]) pos += flow;
      else if (tp[j] < tp[j - 1]) neg += flow;
    }
    out[i] = neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
  }
  return out;
}
function obv(candles) {
  const out = new Array(candles.length).fill(0);
  for (let i = 1; i < candles.length; i++) {
    out[i] = out[i - 1] + (candles[i].c > candles[i - 1].c ? candles[i].v
      : candles[i].c < candles[i - 1].c ? -candles[i].v : 0);
  }
  return out;
}
const MA_FNS = { ema, sma, wma, dema, tema, hma, alma, lsma, rma };

/* ── command parser (port of the bot's parse.js) ──────────────────────── */
const PANES = ['rsi', 'macd', 'stoch', 'atr', 'adx', 'cci', 'mfi', 'obv'];
const IND_DEFAULTS = {
  ema: 20, sma: 20, wma: 20, dema: 21, tema: 21, hma: 14, alma: 20, lsma: 25,
  rma: 14, vwma: 20, bb: 20, rsi: 14, stoch: 14, atr: 14, adx: 14, cci: 20, mfi: 14,
};
const IND_RE = /^(ema|sma|wma|dema|tema|hma|alma|lsma|rma|vwma|vwap|bb|supertrend|rsi|macd|stoch|atr|adx|cci|mfi|obv)(\d{1,3})?$/i;
const SYMBOL_RE = /^(?:(hl|kc|cb|kr):)?([a-z0-9]{2,20})$/i;
const DEX_ADDR_RE = /^(?:0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/;
const PENDING = {
  oi: 'open interest overlay', liq: 'liquidation heatmap', sl: 'stop-loss clusters',
  tp: 'take-profit clusters', news: 'news overlay', table: 'news table',
  mc: 'market-cap view', trades: 'trade bubbles', tl: 'trade tape', tradeslist: 'trade tape',
};
const TZ_OFFSET_MIN = { utc: 0, est: -300, edt: -240, cst: -360, cdt: -300, mst: -420, mdt: -360, pst: -480, pdt: -420 };

function parseSymbol(token) {
  const gt = /^gt:(.+)$/i.exec(token);
  if (gt) return { base: gt[1], venue: 'gt' };
  if (DEX_ADDR_RE.test(token)) return { base: token, venue: 'gt' };
  const m = SYMBOL_RE.exec(token);
  if (!m) throw new Error(`can't read symbol "${token}"`);
  return { base: m[2].toUpperCase(), venue: m[1]?.toLowerCase() ?? 'auto' };
}
function urlTimestamp(url) {
  let m = /(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d+)/.exec(url);
  if (m) return Number((BigInt(m[1]) >> 22n) + 1288834974657n);
  m = /discord\.com\/channels\/\d+\/\d+\/(\d+)/.exec(url);
  if (m) return Number((BigInt(m[1]) >> 22n) + 1420070400000n);
  m = /truthsocial\.com\/@[^/]+\/(?:posts\/)?(\d+)/.exec(url);
  if (m) return Number(BigInt(m[1]) >> 16n);
  return null;
}
function parseDateToken(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[tT](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
}
function todayAt(hh, mm, offsetMin) {
  const now = new Date();
  let ts = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh, mm) - offsetMin * 60_000;
  if (ts > Date.now()) ts -= 86_400_000;
  return ts;
}
function nyOpenToday() {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date()).reduce((acc, x) => ({ ...acc, [x.type]: x.value }), {});
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  const offsetMin = Math.round((asUTC - Date.now()) / 60_000);
  let ts = Date.UTC(+p.year, +p.month - 1, +p.day, 9, 30) - offsetMin * 60_000;
  if (ts > Date.now()) ts -= 86_400_000;
  return ts;
}

function parseCommand(text) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) throw new Error('no symbol given');
  const cmd = {
    mode: 'candles', symbols: [], timeframe: DEFAULT_TIMEFRAME, count: DEFAULT_CANDLES,
    indicators: [], percent: false, markers: [], fromTs: null, shade: [], joke: null,
  };
  // raw, not lowercased — DEX addresses are case-sensitive
  const symExpr = tokens.shift();
  if (symExpr.includes('/') && !/^https?:/i.test(symExpr)) {
    const [a, b] = symExpr.split('/');
    cmd.mode = 'ratio';
    cmd.symbols = [parseSymbol(a), parseSymbol(b)];
  } else if (symExpr.includes(',')) {
    cmd.mode = 'compare';
    cmd.symbols = symExpr.split(',').filter(Boolean).map(parseSymbol);
    if (cmd.symbols.length > MAX_COMPARE_SYMBOLS) throw new Error(`max ${MAX_COMPARE_SYMBOLS} symbols in a comparison`);
    if (cmd.symbols.length < 2) throw new Error('comparison needs at least 2 symbols');
  } else {
    cmd.symbols = [parseSymbol(symExpr)];
  }
  let pendingFromTime = null;
  for (const raw of tokens) {
    const token = raw.toLowerCase();
    if (pendingFromTime && TZ_OFFSET_MIN[token] !== undefined) {
      cmd.fromTs = todayAt(pendingFromTime.hh, pendingFromTime.mm, TZ_OFFSET_MIN[token]);
      pendingFromTime = null;
      continue;
    }
    pendingFromTime = null;
    if (TIMEFRAMES.includes(token)) { cmd.timeframe = token; continue; }
    if (token === 's') { cmd.count = SHORT_CANDLES; continue; }
    if (token === 'l') { cmd.count = LONG_CANDLES; continue; }
    if (token === '%') { cmd.percent = true; continue; }
    if (token === 'weekends' || token === 'usmarket') { cmd.shade.push(token); continue; }
    if (token === 'over' || token === 'bear' || token === 'bull') { cmd.joke = token; continue; }
    const custom = /^c:(\d{2,5})$/.exec(token);
    if (custom) { cmd.count = Math.max(30, Math.min(MAX_CANDLES, +custom[1])); continue; }
    if (token.startsWith('time:')) {
      const ts = parseDateToken(raw.slice(5));
      if (ts == null) throw new Error(`bad time: "${raw}" — use time:2026-07-04 or time:2026-07-04T14:30`);
      cmd.markers.push({ ts, label: raw.slice(5) });
      continue;
    }
    if (token.startsWith('from:')) {
      const val = raw.slice(5);
      if (val.toLowerCase() === 'do') { const n = new Date(); cmd.fromTs = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()); continue; }
      if (val.toLowerCase() === 'nyo') { cmd.fromTs = nyOpenToday(); continue; }
      const asDate = parseDateToken(val);
      if (asDate != null) { cmd.fromTs = asDate; continue; }
      const asTime = /^(\d{1,2}):(\d{2})$/.exec(val);
      if (asTime) {
        pendingFromTime = { hh: +asTime[1], mm: +asTime[2] };
        cmd.fromTs = todayAt(pendingFromTime.hh, pendingFromTime.mm, 0);
        continue;
      }
      throw new Error(`bad from: "${raw}" — use from:2026-07-04, from:09:30 [EST], from:nyo, from:do`);
    }
    if (/^https?:\/\//.test(token)) {
      const ts = urlTimestamp(raw);
      if (ts == null) throw new Error('can\'t read a timestamp from that link (X/Twitter, Discord, and Truth Social links work)');
      cmd.markers.push({ ts, label: null });
      continue;
    }
    const ind = IND_RE.exec(token);
    if (ind) {
      const key = ind[1].toLowerCase();
      const period = ind[2] ? +ind[2] : IND_DEFAULTS[key] ?? null;
      cmd.indicators.push({
        key, period,
        pane: PANES.includes(key) ? 'pane' : 'overlay',
        label: ['macd', 'vwap', 'obv', 'adx', 'stoch', 'supertrend'].includes(key)
          ? key.toUpperCase() : `${key.toUpperCase()}${period}`,
      });
      continue;
    }
    if (PENDING[token]) throw new Error(`${PENDING[token]} isn't built yet — it's on the roadmap`);
    throw new Error(`don't understand "${raw}" — try \`vc help\``);
  }
  if (cmd.mode !== 'candles' && cmd.indicators.length > 0) throw new Error('indicators only work on single-symbol charts for now');
  if (cmd.mode !== 'candles' && cmd.joke) throw new Error(`${cmd.joke} only works on single-symbol charts`);
  cmd.markers.sort((a, b) => a.ts - b.ts);
  return cmd;
}

/* ── chart option builders (port of the bot's chart.js) ───────────────── */
const fmtPrice = (v) => {
  if (v == null || !Number.isFinite(v)) return '';
  const abs = Math.abs(v);
  if (abs > 0 && abs < 0.001) return v.toLocaleString('en-US', { maximumSignificantDigits: 3 });
  const digits = abs >= 1000 ? 0 : abs >= 10 ? 2 : abs >= 0.1 ? 4 : 6;
  return v.toLocaleString('en-US', { maximumFractionDigits: digits });
};
const fmtCompact = (v) => {
  if (v == null) return '';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return fmtPrice(v);
};
const fmtTime = (ms, timeframe) => {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  if (['1d', '3d', '1w', '1mo'].includes(timeframe)) {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  return `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const fmtDelta = (ms) => {
  const s = Math.round(ms / 1000);
  const parts = [];
  if (s >= 86400) parts.push(`${Math.floor(s / 86400)}d`);
  if (s % 86400 >= 3600) parts.push(`${Math.floor((s % 86400) / 3600)}h`);
  if (s % 3600 >= 60) parts.push(`${Math.floor((s % 3600) / 60)}m`);
  if (parts.length === 0) parts.push(`${s}s`);
  return parts.slice(0, 2).join(' ');
};
const baseAxis = (labels, show) => ({
  type: 'category', data: labels, boundaryGap: true,
  axisLine: { lineStyle: { color: THEME.grid } },
  axisTick: { show: false },
  axisLabel: show ? { color: THEME.text, fontSize: 11 } : { show: false },
  splitLine: { show: false },
});
const valueAxis = (extra = {}) => ({
  type: 'value', scale: true, position: 'right',
  axisLine: { show: false }, axisTick: { show: false },
  axisLabel: { color: THEME.text, fontSize: 11, formatter: fmtPrice },
  splitLine: { lineStyle: { color: THEME.grid } },
  ...extra,
});
const mkTitle = (text, subtext) => ({
  text, subtext, left: 12, top: 8,
  textStyle: { color: THEME.textStrong, fontSize: 16, fontWeight: 700 },
  subtextStyle: { color: THEME.text, fontSize: 11.5 },
});
const mkLegend = (names, top = 54) => ({
  data: names, top, left: 12,
  textStyle: { color: THEME.text, fontSize: 11 },
  icon: 'roundRect', itemWidth: 12, itemHeight: 3,
});
const brandMark = () => ({
  // sized to match the demo chart title (16px bold)
  type: 'group', right: 14, top: 8, silent: true,
  children: [
    { type: 'image', x: 0, y: 0, style: { image: '../vice-terminal-64.png', width: 21, height: 21 } },
    { type: 'text', x: 27, y: 3, style: { text: 'vicesuite.com', fill: THEME.textStrong, fontSize: 16, fontWeight: 700 } },
  ],
});
const watermark = () => ({
  type: 'text', left: 'center', top: 'middle', rotation: Math.PI / 12, silent: true,
  style: { text: 'NOT REAL CHART', fontSize: 52, fontWeight: 900, fill: 'rgba(230,237,243,0.14)' },
});
const tsToIndex = (display, ts) => {
  let idx = display.findIndex((k) => k.t >= ts);
  if (idx < 0) idx = display.length - 1;
  return Math.max(0, idx);
};
const markerLineData = (display, markers, timeframe) => markers.map((m, i) => ({
  xAxis: tsToIndex(display, m.ts),
  label: { formatter: `T${i + 1} ${fmtTime(m.ts, timeframe)}`, color: THEME.textStrong, fontSize: 10, position: 'insideEndTop' },
  lineStyle: { color: '#f0b90b', type: 'dashed', width: 1.2, opacity: 0.9 },
}));
const markerSubtitle = (markers) => {
  if (markers.length < 2) return '';
  const deltas = [];
  for (let i = 1; i < markers.length; i++) deltas.push(fmtDelta(markers[i].ts - markers[i - 1].ts));
  return `   ·   Δ ${deltas.join(' · ')}`;
};
function shadeAreas(display, kinds) {
  const inKind = (kind, ms) => {
    if (kind === 'weekends') {
      const day = new Date(ms).getUTCDay();
      return day === 0 || day === 6;
    }
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date(ms)).reduce((a, p) => ({ ...a, [p.type]: p.value }), {});
    if (parts.weekday === 'Sat' || parts.weekday === 'Sun') return false;
    const mins = (+parts.hour % 24) * 60 + +parts.minute;
    return mins >= 570 && mins < 960;
  };
  const areas = [];
  for (const kind of kinds) {
    let start = null;
    for (let i = 0; i <= display.length; i++) {
      const inside = i < display.length && inKind(kind, display[i].t);
      if (inside && start == null) start = i;
      if (!inside && start != null) {
        areas.push([{ xAxis: start, itemStyle: { color: 'rgba(139,152,169,0.08)' } }, { xAxis: i - 1 }]);
        start = null;
      }
    }
  }
  return areas;
}
function jokeSeries(joke, display, timeframe) {
  const last = display[display.length - 1];
  const step = tfMs(timeframe);
  if (joke === 'over') {
    const drops = [0.94, 0.86, 0.75, 0.68, 0.63, 0.6];
    let prev = last.c;
    return drops.map((mult, i) => {
      const close = last.c * mult;
      const k = { t: last.t + step * (i + 1), o: prev, c: close, h: prev * 1.005, l: close * 0.985, v: 0, fake: true };
      prev = close;
      return k;
    });
  }
  const n = Math.min(Math.max(40, Math.floor(display.length / 3)), 150);
  const target = joke === 'bear' ? 0.25 : 4.6;
  const out = [];
  for (let i = 1; i <= n; i++) {
    const p = i / n;
    const eased = p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2;
    const wiggle = 1 + Math.sin(i * 0.9) * 0.03 + Math.sin(i * 0.23) * 0.05;
    const px = last.c * Math.exp(Math.log(target) * eased) * wiggle;
    out.push({ t: last.t + step * i, o: px, c: px, h: px, l: px, v: 0, fake: true, lineOnly: true });
  }
  return out;
}
function overlaySeries(cmd, candles, offset, nextColor) {
  const closes = candles.map((k) => k.c);
  const out = [];
  const legendNames = [];
  for (const ind of cmd.indicators) {
    if (ind.pane === 'pane') continue;
    if (ind.key === 'bb') {
      const { mid, upper, lower } = bollinger(closes, ind.period);
      const color = nextColor();
      legendNames.push(ind.label);
      out.push(
        { name: ind.label, data: mid.slice(offset), color },
        { name: `${ind.label}+`, data: upper.slice(offset), color, faint: true },
        { name: `${ind.label}-`, data: lower.slice(offset), color, faint: true },
      );
      continue;
    }
    if (ind.key === 'supertrend') {
      const { line, dir } = supertrend(candles);
      legendNames.push(ind.label);
      out.push(
        { name: ind.label, data: line.map((v, i) => (dir[i] === 1 ? v : null)).slice(offset), color: THEME.up, width: 1.8 },
        { name: `${ind.label}-`, data: line.map((v, i) => (dir[i] === -1 ? v : null)).slice(offset), color: THEME.down, width: 1.8 },
      );
      continue;
    }
    const data = ind.key === 'vwap' ? vwap(candles)
      : ind.key === 'vwma' ? vwma(candles, ind.period)
      : MA_FNS[ind.key](closes, ind.period);
    const color = nextColor();
    legendNames.push(ind.label);
    out.push({ name: ind.label, data: data.slice(offset), color });
  }
  return { out, legendNames };
}

function candleOption(cmd, dataset, H) {
  const { venueLabel, pair } = dataset;
  let candles = dataset.candles;
  if (cmd.fromTs) candles = candles.filter((k) => k.t >= cmd.fromTs - tfMs(cmd.timeframe));
  // raw = filtered but unscaled — pane indicators must index the SAME array
  // the display offset is computed from, or from: shifts their values in time
  const rawCandles = candles;
  const rawCloses = rawCandles.map((k) => k.c);
  let display = candles.slice(-cmd.count);
  if (!display.length) {
    throw new Error(cmd.fromTs
      ? `no candles on or after ${new Date(cmd.fromTs).toISOString().slice(0, 10)} — is that date in the future?`
      : 'no candles came back for that market');
  }
  const realCount = display.length;
  let pctBase = null;
  if (cmd.percent) {
    pctBase = display[0].o;
    const rb = (x) => ((x / pctBase) - 1) * 100;
    candles = candles.map((k) => ({ ...k, o: rb(k.o), h: rb(k.h), l: rb(k.l), c: rb(k.c) }));
    display = candles.slice(-realCount);
  }
  const offset = candles.length - display.length;
  const joke = cmd.joke ? jokeSeries(cmd.joke, display, cmd.timeframe) : [];
  const shown = [...display, ...joke];
  const labels = shown.map((k) => fmtTime(k.t, cmd.timeframe));
  let colorIdx = 0;
  const nextColor = () => THEME.overlayColors[colorIdx++ % THEME.overlayColors.length];
  const { out: overlays, legendNames } = overlaySeries(cmd, candles, offset, nextColor);
  const panes = cmd.indicators.filter((i) => i.pane === 'pane');
  const pad = (arr) => [...arr, ...new Array(joke.length).fill(null)];

  const grids = [];
  const xAxes = [];
  const yAxes = [];
  const series = [];
  const TOPPX = legendNames.length ? 76 : 56;
  const BOTPX = 38;
  const usable = H - TOPPX - BOTPX;
  const paneH = panes.length ? Math.min(usable * 0.18, usable * 0.5 / panes.length) : 0;
  const volH = usable * 0.11;
  const priceH = usable - volH - paneH * panes.length;
  let y = TOPPX;
  const addGrid = (h) => { grids.push({ left: 10, right: 64, top: y, height: h }); y += h; return grids.length - 1; };
  const yFmt = cmd.percent ? (v) => `${v.toFixed(1)}%` : fmtPrice;

  const gP = addGrid(priceH);
  xAxes.push({ ...baseAxis(labels, false), gridIndex: gP });
  yAxes.push({ ...valueAxis({ axisLabel: { color: THEME.text, fontSize: 11, formatter: yFmt } }), gridIndex: gP });
  const candleSeries = {
    name: pair, type: 'candlestick', xAxisIndex: gP, yAxisIndex: gP,
    data: shown.map((k) => (k.lineOnly ? [null, null, null, null] : [k.o, k.c, k.l, k.h])),
    itemStyle: { color: THEME.up, color0: THEME.down, borderColor: THEME.up, borderColor0: THEME.down },
    barWidth: '70%',
  };
  if (cmd.markers.length) candleSeries.markLine = { silent: true, symbol: 'none', data: markerLineData(display, cmd.markers, cmd.timeframe) };
  if (cmd.shade.length) candleSeries.markArea = { silent: true, data: shadeAreas(display, cmd.shade) };
  series.push(candleSeries);

  if (cmd.joke === 'bear' || cmd.joke === 'bull') {
    series.push({
      name: cmd.joke, type: 'line', xAxisIndex: gP, yAxisIndex: gP,
      data: [...new Array(display.length - 1).fill(null), display[display.length - 1].c, ...joke.map((k) => k.c)],
      showSymbol: false,
      lineStyle: { color: cmd.joke === 'bull' ? THEME.up : THEME.down, width: 2, type: 'dashed' },
    });
  }
  for (const ov of overlays) {
    series.push({
      name: ov.name, type: 'line', xAxisIndex: gP, yAxisIndex: gP,
      data: pad(cmd.percent && pctBase ? ov.data.map((v) => (v == null ? null : ((v / pctBase) - 1) * 100)) : ov.data),
      showSymbol: false,
      lineStyle: { color: ov.color, width: ov.width ?? (ov.faint ? 1 : 1.6), opacity: ov.faint ? 0.5 : 1 },
      itemStyle: { color: ov.color },
    });
  }
  const gV = addGrid(volH);
  xAxes.push({ ...baseAxis(labels, panes.length === 0), gridIndex: gV });
  yAxes.push({ ...valueAxis({ splitLine: { show: false }, axisLabel: { show: false } }), gridIndex: gV });
  series.push({
    name: 'Volume', type: 'bar', xAxisIndex: gV, yAxisIndex: gV,
    data: shown.map((k) => ({ value: k.v, itemStyle: { color: k.c >= k.o ? THEME.volUp : THEME.volDown } })),
    barWidth: '70%',
  });
  // rawCloses/rawCandles were captured above, right after the from: filter
  for (let p = 0; p < panes.length; p++) {
    const ind = panes[p];
    const isLast = p === panes.length - 1;
    const g = addGrid(paneH);
    xAxes.push({ ...baseAxis(labels, isLast), gridIndex: g });
    const push = (name, data, color, extra = {}) => series.push({
      name, type: 'line', xAxisIndex: g, yAxisIndex: g,
      data: pad(data.slice(offset)), showSymbol: false,
      lineStyle: { color, width: 1.5 }, itemStyle: { color }, ...extra,
    });
    const dashedAt = (levels) => ({
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: THEME.text, type: 'dashed', opacity: 0.35 },
        data: levels.map((yv) => ({ yAxis: yv })), label: { show: false },
      },
    });
    if (ind.key === 'rsi') {
      yAxes.push({ ...valueAxis({ min: 0, max: 100, interval: 30 }), gridIndex: g });
      push(ind.label, rsi(rawCloses, ind.period), '#a855f7', dashedAt([30, 70]));
    } else if (ind.key === 'mfi') {
      yAxes.push({ ...valueAxis({ min: 0, max: 100, interval: 30 }), gridIndex: g });
      push(ind.label, mfi(rawCandles, ind.period), '#22d3ee', dashedAt([20, 80]));
    } else if (ind.key === 'stoch') {
      const st = stoch(rawCandles, ind.period);
      yAxes.push({ ...valueAxis({ min: 0, max: 100, interval: 30 }), gridIndex: g });
      push('%K', st.k, '#3b82f6', dashedAt([20, 80]));
      push('%D', st.d, '#f0b90b');
    } else if (ind.key === 'macd') {
      const m = macd(rawCloses);
      yAxes.push({ ...valueAxis({ axisLabel: { color: THEME.text, fontSize: 10, formatter: fmtCompact } }), gridIndex: g });
      series.push({
        name: 'hist', type: 'bar', xAxisIndex: g, yAxisIndex: g,
        data: pad(m.hist.slice(offset)).map((v) => ({
          value: v, itemStyle: { color: v != null && v >= 0 ? THEME.volUp : THEME.volDown },
        })),
        barWidth: '60%',
      });
      push('MACD', m.line, '#3b82f6');
      push('signal', m.signal, '#f0b90b');
    } else if (ind.key === 'adx') {
      const a = adx(rawCandles, ind.period);
      yAxes.push({ ...valueAxis({ min: 0 }), gridIndex: g });
      push('ADX', a.adx, '#e6edf3');
      push('+DI', a.pdi, THEME.up);
      push('-DI', a.mdi, THEME.down);
    } else if (ind.key === 'atr') {
      yAxes.push({ ...valueAxis({ axisLabel: { color: THEME.text, fontSize: 10, formatter: fmtCompact } }), gridIndex: g });
      push(ind.label, atr(rawCandles, ind.period), '#f97316');
    } else if (ind.key === 'cci') {
      yAxes.push({ ...valueAxis({ axisLabel: { color: THEME.text, fontSize: 10, formatter: fmtCompact } }), gridIndex: g });
      push(ind.label, cci(rawCandles, ind.period), '#ec4899', dashedAt([-100, 100]));
    } else if (ind.key === 'obv') {
      yAxes.push({ ...valueAxis({ axisLabel: { color: THEME.text, fontSize: 10, formatter: fmtCompact } }), gridIndex: g });
      push(ind.label, obv(rawCandles), '#84cc16');
    }
  }
  const lastK = display[display.length - 1];
  const firstK = display[0];
  const chg = cmd.percent ? lastK.c - firstK.o : ((lastK.c - firstK.o) / firstK.o) * 100;
  const sign = chg >= 0 ? '+' : '';
  const lastLabel = cmd.percent ? fmtPrice(dataset.candles[dataset.candles.length - 1].c) : fmtPrice(lastK.c);
  const option = {
    backgroundColor: THEME.bg, animation: false,
    title: mkTitle(
      `${pair} · ${cmd.timeframe} · ${venueLabel}${cmd.percent ? ' · %' : ''}`,
      `${lastLabel}   ${sign}${chg.toFixed(2)}% over ${display.length} candles${markerSubtitle(cmd.markers)}`,
    ),
    legend: legendNames.length ? mkLegend(legendNames) : undefined,
    grid: grids, xAxis: xAxes, yAxis: yAxes, series,
  };
  option.graphic = cmd.joke ? [watermark(), brandMark()] : [brandMark()];
  return option;
}

function compareOption(cmd, datasets, opts = {}) {
  const n = Math.min(...datasets.map((d) => d.candles.length), cmd.count);
  const trimmed = datasets.map((d) => ({ ...d, candles: d.candles.slice(-n) }));
  const display = trimmed[0].candles;
  const labels = display.map((k) => fmtTime(k.t, cmd.timeframe));
  const entries = trimmed.map((d, i) => {
    const base = d.candles[0].c;
    const pct = d.candles.map((k) => ((k.c - base) / base) * 100);
    return { name: d.name, pct, last: pct[pct.length - 1], color: THEME.compareColors[i % THEME.compareColors.length] };
  }).sort((a, b) => b.last - a.last);
  const option = {
    backgroundColor: THEME.bg, animation: false,
    title: mkTitle(
      opts.titleText ?? `${entries.map((e) => e.name).join(' vs ')} · ${cmd.timeframe}`,
      `% change over ${n} candles${markerSubtitle(cmd.markers)}`,
    ),
    legend: mkLegend(entries.map((e) => `${e.name} ${e.last >= 0 ? '+' : ''}${e.last.toFixed(2)}%`), 54),
    graphic: [brandMark()],
    grid: [{ left: 10, right: 64, top: entries.length > 5 ? 108 : 88, bottom: 38 }],
    xAxis: [baseAxis(labels, true)],
    yAxis: [valueAxis({ axisLabel: { color: THEME.text, fontSize: 11, formatter: (v) => `${v.toFixed(1)}%` } })],
    series: entries.map((e) => ({
      name: `${e.name} ${e.last >= 0 ? '+' : ''}${e.last.toFixed(2)}%`,
      type: 'line', data: e.pct, showSymbol: false,
      lineStyle: { color: e.color, width: 1.8 }, itemStyle: { color: e.color },
    })),
  };
  if (cmd.markers.length) option.series[0].markLine = { silent: true, symbol: 'none', data: markerLineData(display, cmd.markers, cmd.timeframe) };
  return option;
}

function ratioOption(cmd, datasets) {
  const [a, b] = datasets;
  const n = Math.min(a.candles.length, b.candles.length, cmd.count);
  const ca = a.candles.slice(-n);
  const cb = b.candles.slice(-n);
  const ratio = ca.map((k, i) => k.c / cb[i].c);
  const labels = ca.map((k) => fmtTime(k.t, cmd.timeframe));
  const chg = ((ratio[n - 1] - ratio[0]) / ratio[0]) * 100;
  const name = `${a.name}/${b.name}`;
  const venues = a.venueLabel === b.venueLabel ? a.venueLabel : `${a.venueLabel} / ${b.venueLabel}`;
  const option = {
    backgroundColor: THEME.bg, animation: false,
    title: mkTitle(
      `${name} · ${cmd.timeframe} · ${venues} · ratio`,
      `${ratio[n - 1].toPrecision(6)}   ${chg >= 0 ? '+' : ''}${chg.toFixed(2)}% over ${n} candles${markerSubtitle(cmd.markers)}`,
    ),
    graphic: [brandMark()],
    grid: [{ left: 10, right: 74, top: 56, bottom: 38 }],
    xAxis: [baseAxis(labels, true)],
    yAxis: [valueAxis({ axisLabel: { color: THEME.text, fontSize: 11, formatter: (v) => v.toPrecision(5) } })],
    series: [{
      name, type: 'line', data: ratio, showSymbol: false,
      lineStyle: { color: chg >= 0 ? THEME.up : THEME.down, width: 1.8 },
      areaStyle: { opacity: 0.08, color: chg >= 0 ? THEME.up : THEME.down },
    }],
  };
  if (cmd.markers.length) option.series[0].markLine = { silent: true, symbol: 'none', data: markerLineData(ca, cmd.markers, cmd.timeframe) };
  return option;
}

async function moversOption(direction) {
  const ctxs = await hlAssetContexts();
  const ranked = ctxs
    .filter((c) => !c.delisted && c.prevDayPx > 0 && c.dayNtlVlm >= 300_000)
    .map((c) => ({ ...c, chg: (c.markPx - c.prevDayPx) / c.prevDayPx }))
    .sort((a, b) => (direction === 'best' ? b.chg - a.chg : a.chg - b.chg))
    .slice(0, 20);
  if (ranked.length === 0) throw new Error('no movers data right now');
  const datasets = (await Promise.all(
    ranked.map((c) => fetchCandles({ base: c.name, venue: 'hl' }, '15m', 97).catch(() => null)),
  )).filter(Boolean);
  return compareOption({ timeframe: '15m', count: 97, markers: [] }, datasets, {
    titleText: `Top ${datasets.length} ${direction === 'best' ? 'gainers' : 'losers'} · 24h · Hyperliquid`,
  });
}

/* ── the demo widget ──────────────────────────────────────────────────── */
const HELP_TEXT = [
  'charts: btc · eth 4h · sol 5m s · btc 1h %',
  'indicators: btc 1h ema20 ema55 bb20 rsi14 macd (21 available)',
  'compare: btc,eth,sol 1h — ratio: btc/eth 4h — movers: best / worst',
  'dex: gt:pepe 1h, or paste a contract address (deepest pool wins)',
  'extras: weekends · usmarket · time:2026-07-04 · from:nyo · over/bear/bull',
  'venues here: Hyperliquid (default) + cb: Coinbase + gt: DEX pools — kc:/kr: need the real bot',
].join('\n');

function initDemo() {
  const root = document.getElementById('vc-demo');
  if (!root) return;
  // ECharts arrives via a deferred CDN script — poll for it instead of racing
  // it, and say so plainly if it never shows up (adblock, CDN hiccup).
  const started = Date.now();
  if (!window.echarts) {
    if (Date.now() - (initDemo._t0 ?? (initDemo._t0 = started)) > 15_000) {
      const skel = root.querySelector('.demo-skel');
      const msg = root.querySelector('.demo-msg');
      if (skel) skel.textContent = 'chart engine failed to load';
      if (msg) {
        msg.textContent = "the chart library didn't load — refresh the page, or see real bot output below";
        msg.classList.add('demo-msg--err');
      }
      return;
    }
    setTimeout(initDemo, 200);
    return;
  }
  const input = root.querySelector('.demo-input');
  const runBtn = root.querySelector('.demo-run');
  const msg = root.querySelector('.demo-msg');
  const chartEl = root.querySelector('.demo-chart');
  const chart = echarts.init(chartEl, null, { renderer: 'canvas' });
  window.addEventListener('resize', () => chart.resize());
  let busy = false;

  const say = (text, isError = false) => {
    msg.textContent = text;
    msg.classList.toggle('demo-msg--err', isError);
  };

  async function run(raw) {
    if (busy) return;
    const body = raw.replace(/^\s*(vc|nb)\s+/i, '').trim();
    if (!body) { say('type a command — e.g. btc 1h ema20 ema55'); return; }
    const first = body.split(/\s+/)[0].toLowerCase();

    if (first === 'help') { say(HELP_TEXT); return; }
    if (first === 'exchanges') { say('Hyperliquid perps (default), cb: Coinbase, and gt: GeckoTerminal DEX pools work right here in the browser. KuCoin + Kraken need the real bot in Discord.'); return; }
    if (first === 'trumpdays') { say(`${Math.ceil((Date.UTC(2029, 0, 20) - Date.now()) / 86_400_000)} days until Jan 20, 2029`); return; }
    if (first === 'alert' || first === 'alerts' || first === 'unalert') {
      say('alerts ping a Discord channel, so they live in the real bot — add Vice Charts to your server to use them'); return;
    }
    if (first === 'stats' || first === 'whoami') { say('that one only makes sense inside Discord — this is the demo'); return; }
    if (body.includes('|')) { say('multichart stacking works in Discord — here, run the charts one at a time'); return; }

    busy = true;
    runBtn.disabled = true;
    try {
      let option;
      if (first === 'best' || first === 'worst') {
        say(`ranking 24h ${first === 'best' ? 'gainers' : 'losers'} across Hyperliquid…`);
        option = await moversOption(first);
      } else {
        const cmd = parseCommand(body);
        let count = cmd.count;
        const oldest = Math.min(cmd.fromTs ?? Infinity, ...cmd.markers.map((m) => m.ts));
        if (Number.isFinite(oldest)) {
          count = Math.min(MAX_CANDLES, Math.max(count, Math.ceil((Date.now() - oldest) / tfMs(cmd.timeframe)) + 5));
        }
        const effective = { ...cmd, count };
        say(`fetching ${cmd.symbols.map((s) => s.base).join(', ')} ${cmd.timeframe} candles…`);
        const fetchLimit = cmd.mode === 'candles' ? count + WARMUP : count;
        const datasets = await Promise.all(cmd.symbols.map((s) => fetchCandles(s, cmd.timeframe, fetchLimit)));
        option =
          cmd.mode === 'ratio' ? ratioOption(effective, datasets)
          : cmd.mode === 'compare' ? compareOption(effective, datasets)
          : candleOption(effective, datasets[0], chartEl.clientHeight);
      }
      chart.setOption(option, { notMerge: true });
      root.querySelector('.demo-skel')?.remove();
      say('rendered — same engine the Discord bot runs');
    } catch (err) {
      say(err.message, true);
    } finally {
      busy = false;
      runBtn.disabled = false;
    }
  }

  runBtn.addEventListener('click', () => run(input.value));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(input.value); });
  root.querySelectorAll('.demo-eg').forEach((b) => {
    b.addEventListener('click', () => { input.value = b.dataset.cmd; run(b.dataset.cmd); });
  });
  run('btc 1h ema20 ema55'); // opening render so the demo is alive on arrival
}

/* Engine export for Vice Hub's native chart widget (../hub.js). The demo UI
   above only boots when #vc-demo exists, so on /hub this file is a pure
   library: full bot parser + venues (HL/Coinbase/GeckoTerminal) + builders. */
window.ViceChartEngine = {
  parseCommand,
  async buildOption(body, height) {
    const text = body.trim();
    const first = text.split(/\s+/)[0]?.toLowerCase();
    if (first === 'best' || first === 'worst') return moversOption(first);
    const cmd = parseCommand(text);
    let count = cmd.count;
    const oldest = Math.min(cmd.fromTs ?? Infinity, ...cmd.markers.map((m) => m.ts));
    if (Number.isFinite(oldest)) {
      count = Math.min(MAX_CANDLES, Math.max(count, Math.ceil((Date.now() - oldest) / tfMs(cmd.timeframe)) + 5));
    }
    const effective = { ...cmd, count };
    const fetchLimit = cmd.mode === 'candles' ? count + WARMUP : count;
    const datasets = await Promise.all(cmd.symbols.map((s) => fetchCandles(s, cmd.timeframe, fetchLimit)));
    return cmd.mode === 'ratio' ? ratioOption(effective, datasets)
      : cmd.mode === 'compare' ? compareOption(effective, datasets)
      : candleOption(effective, datasets[0], height);
  },
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}
