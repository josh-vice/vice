// GET /api/vice-hlboard?window=month&sort=pnl&limit=100
//   -> { rows: [{a, n, v, day:{pnl,roi,vlm}, week:{…}, month:{…}, all:{…}}] }
// Hyperliquid's public leaderboard file is ~33 MB of every wallet — far too
// heavy for a browser. This trims it server-side to the top N by the asked
// metric. Warm-invocation memory cache + edge cache keep the 33 MB fetch rare.
const WINDOWS = new Set(['day', 'week', 'month', 'all']);
const SORTS = new Set(['pnl', 'roi', 'vlm', 'value']);

let cache = { t: 0, rows: null };

async function loadRows() {
  if (cache.rows && Date.now() - cache.t < 15 * 60_000) return cache.rows;
  const r = await fetch('https://stats-data.hyperliquid.xyz/Mainnet/leaderboard', {
    headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`leaderboard ${r.status}`);
  const j = await r.json();
  const rows = (j?.leaderboardRows ?? []).map((row) => {
    const w = Object.fromEntries(row.windowPerformances ?? []);
    const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
    const slot = (k) => ({ pnl: num(w[k]?.pnl), roi: num(w[k]?.roi), vlm: num(w[k]?.vlm) });
    return {
      a: row.ethAddress, n: row.displayName ?? null, v: num(row.accountValue),
      day: slot('day'), week: slot('week'), month: slot('month'), all: slot('allTime'),
    };
  });
  cache = { t: Date.now(), rows };
  return rows;
}

export default async function handler(req, res) {
  const win = WINDOWS.has(req.query?.window) ? req.query.window : 'month';
  const sort = SORTS.has(req.query?.sort) ? req.query.sort : 'pnl';
  const limit = Math.min(Math.max(Number(req.query?.limit) || 100, 10), 250);
  try {
    const rows = await loadRows();
    const key = sort === 'value' ? (r) => r.v : (r) => r[win][sort];
    // traders only: system vaults carry billions with zero volume — require
    // real trading in the window; tiny accounts also game ROI boards
    let pool = rows.filter((r) => r[win === 'all' ? 'all' : win].vlm > 0);
    if (sort === 'roi') pool = pool.filter((r) => r.v >= 100_000);
    const top = [...pool].sort((a, b) => key(b) - key(a)).slice(0, limit);
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ rows: top });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
