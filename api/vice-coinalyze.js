// Multi-venue futures series via Coinalyze (free key in COINALYZE_API_KEY):
//   ?kind=liqs&sym=BTC&days=7      liquidations   [ms, longs$, shorts$]
//   ?kind=oi&sym=BTC&days=4        OI history     [ms, oi$]
//   ?kind=funding&sym=BTC&days=7   funding        [ms, apr%]
//   ?kind=cvd&sym=BTC&days=4       taker delta    [ms, (buy-sell)$]  (client cumsums)
//   ?kind=vol&sym=BTC&days=14      daily volume   [ms, vol$]
//   ?kind=volsnap&sym=BTC          24h volume     value $
//   ?kind=oisnap&sym=BTC           current OI     value $
// Venues: Binance, Bybit, OKX, Deribit, Hyperliquid (whatever answers).
// Calibration facts (verified 2026-07-22): funding values are the venue rate
// ×100 (percent per period — hourly on HL, 8h elsewhere); ohlcv v/bv are in
// BASE units unless the market is QUOTE_ASSET-denominated (Deribit inverse);
// convert_to_usd only converts OI + liquidation series. Deribit/Hyperliquid
// return no liquidation rows — nobody aggregates those. Without a key this
// answers { noKey: true } and the hub falls back to direct venue APIs.

const WANTED = { Binance: 'BIN', Bybit: 'BYB', OKX: 'OKX', Deribit: 'DER', Hyperliquid: 'HL' };
// whole-market kinds sum this basket — top coins carrying ~95% of futures flow
const MKT_BASKET = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'LINK', 'HYPE', 'SUI', 'LTC', 'AVAX'];
const API = 'https://api.coinalyze.net/v1';
let meta = { t: 0, byVenue: null }; // venue -> base -> {primary, all[]} market refs

async function cz(path, key) {
  const r = await fetch(`${API}${path}`, {
    headers: { accept: 'application/json', api_key: key },
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error(`coinalyze ${r.status}`);
  return r.json();
}

async function markets(key) {
  // an EMPTY map must never count as a hit — a degraded upstream answer would
  // otherwise poison every request from this warm instance for 6 hours
  if (meta.byVenue && Object.keys(meta.byVenue).length && Date.now() - meta.t < 6 * 3_600_000) return meta.byVenue;
  const [exch, mkts] = await Promise.all([cz('/exchanges', key), cz('/future-markets', key)]);
  const codeToVenue = {};
  for (const e of exch ?? []) if (WANTED[e.name]) codeToVenue[e.code] = WANTED[e.name];
  const byVenue = {};
  for (const m of mkts ?? []) {
    const venue = codeToVenue[m.exchange];
    if (!venue || !m.is_perpetual) continue;
    if (!/^(USD|USDT|USDC)$/.test(m.quote_asset ?? '')) continue;
    const slot = (byVenue[venue] ??= {});
    const entry = { symbol: m.symbol, usdNative: m.oi_lq_vol_denominated_in === 'QUOTE_ASSET' };
    const base = (slot[m.base_asset] ??= { primary: entry, all: [] });
    base.all.push(entry);
    if (m.quote_asset === 'USDT') base.primary = entry; // USDT market leads
  }
  if (Object.keys(byVenue).length) meta = { t: Date.now(), byVenue };
  return byVenue;
}

// funding periods per year: HL funds hourly, everyone else on 8h epochs
const PERIODS_YR = { HL: 24 * 365, BIN: 3 * 365, BYB: 3 * 365, OKX: 3 * 365, DER: 3 * 365 };

const KINDS = {
  liqs: { path: '/liquidation-history', interval: '1hour', usd: true, maxDays: 30 },
  oi: { path: '/open-interest-history', interval: '1hour', usd: true, maxDays: 30 },
  funding: { path: '/funding-rate-history', interval: '1hour', usd: false, maxDays: 14 },
  cvd: { path: '/ohlcv-history', interval: '1hour', usd: false, maxDays: 7 },
  vol: { path: '/ohlcv-history', interval: 'daily', usd: false, maxDays: 30 },
  volh: { path: '/ohlcv-history', interval: '1hour', usd: false, maxDays: 30 },
  volsnap: { path: '/ohlcv-history', interval: '1hour', usd: false, maxDays: 2, snap: true },
  oisnap: { path: '/open-interest-history', interval: '1hour', usd: true, maxDays: 2, snap: true },
  mktvol: { path: '/ohlcv-history', interval: '1hour', usd: false, maxDays: 7, market: true },
  mktoi: { path: '/open-interest-history', interval: '1hour', usd: true, maxDays: 7, market: true },
};

function pointsFor(kind, venue, usdNative, history) {
  const usd = (h, v) => (usdNative ? v : v * (h.c || 0));
  switch (kind) {
    case 'liqs':
      return history.map((h) => [h.t * 1000, Number(h.l) || 0, Number(h.s) || 0]);
    case 'oi':
    case 'oisnap':
    case 'mktoi':
      return history.map((h) => [h.t * 1000, Number(h.c) || 0]);
    case 'funding':
      return history.map((h) => [h.t * 1000, (Number(h.c) || 0) * PERIODS_YR[venue]]);
    case 'cvd':
      return history.map((h) => [h.t * 1000, usd(h, 2 * (Number(h.bv) || 0) - (Number(h.v) || 0))]);
    case 'vol':
    case 'volh':
    case 'volsnap':
    case 'mktvol':
      return history.map((h) => [h.t * 1000, usd(h, Number(h.v) || 0)]);
    default:
      return [];
  }
}

export default async function handler(req, res) {
  const key = process.env.COINALYZE_API_KEY;
  const q = req.query ?? {};
  const sym = String(q.sym ?? '').toUpperCase();
  const spec = KINDS[q.kind];
  if (!spec || (!spec.market && !/^[A-Z0-9]{2,12}$/.test(sym))) {
    res.status(400).json({ error: 'bad request' });
    return;
  }
  const days = Math.min(Math.max(parseInt(q.days, 10) || spec.maxDays, 1), spec.maxDays);
  if (!key) {
    res.setHeader('Cache-Control', 's-maxage=600');
    res.status(200).json({ noKey: true });
    return;
  }
  try {
    const byVenue = await markets(key);
    // funding is a per-market rate (lead market speaks for the venue);
    // everything else SUMS the venue's USD/USDT/USDC perps — whole-venue
    // aggregates are what the big dashboards chart, single markets read light.
    // market kinds sum the whole basket per venue instead of one coin.
    let wanted = [];
    if (spec.market) {
      // primary market per venue per coin — the free tier counts EVERY symbol
      // in a batch as a call, so whole-market sums must spend sparingly
      for (const [venue, bases] of Object.entries(byVenue)) {
        for (const coin of MKT_BASKET) {
          if (bases[coin]) wanted.push({ venue, ...bases[coin].primary });
        }
      }
    } else {
      const pairs = Object.entries(byVenue)
        .map(([venue, m]) => [venue, m[sym]])
        .filter(([, m]) => m);
      wanted = pairs.flatMap(([venue, m]) =>
        (q.kind === 'funding' ? [m.primary] : m.all).map((mm) => ({ venue, ...mm })));
    }
    if (!wanted.length) {
      res.status(200).json({ venues: [] });
      return;
    }
    const to = Math.floor(Date.now() / 1000);
    const from = to - (spec.snap ? 26 * 3600 : days * 86_400);
    const chunks = [];
    for (let i = 0; i < wanted.length; i += 20) chunks.push(wanted.slice(i, i + 20));
    const rows = (await Promise.all(chunks.map((ch) => cz(
      `${spec.path}?symbols=${encodeURIComponent(ch.map((w) => w.symbol).join(','))}` +
      `&interval=${spec.interval}&from=${from}&to=${to}${spec.usd ? '&convert_to_usd=true' : ''}`, key,
    )))).flat();
    const agg = {}; // venue -> Map(ts -> point)
    for (const row of Array.isArray(rows) ? rows : []) {
      const w = wanted.find((x) => x.symbol === row.symbol);
      if (!w) continue;
      const acc = (agg[w.venue] ??= new Map());
      for (const p of pointsFor(q.kind, w.venue, w.usdNative, row.history ?? [])) {
        if (!(p[0] > 0)) continue;
        const cur = acc.get(p[0]);
        if (!cur) acc.set(p[0], p.slice());
        else { cur[1] += p[1]; if (p.length > 2) cur[2] += p[2]; }
      }
    }
    const venues = [];
    for (const [venue, acc] of Object.entries(agg)) {
      const pts = [...acc.values()].sort((a, b) => a[0] - b[0]);
      if (!pts.length) continue;
      if (spec.snap) {
        // volsnap: trailing-24h sum · oisnap: latest hour's total
        const value = q.kind === 'volsnap'
          ? pts.slice(-24).reduce((a, p) => a + p[1], 0)
          : pts[pts.length - 1][1];
        if (value > 0) venues.push({ venue, value });
      } else {
        venues.push({ venue, points: pts });
      }
    }
    res.setHeader('Cache-Control', spec.market
      ? 's-maxage=900, stale-while-revalidate=3600'
      : 's-maxage=300, stale-while-revalidate=1800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ venues });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
