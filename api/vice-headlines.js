// GET /api/vice-headlines?symbol=CRYPTO:SOLUSD          -> { count }
// GET /api/vice-headlines?symbol=CRYPTO:SOLUSD&full=1   -> { items: [{t,u,src,ts}] }
// GET /api/vice-headlines?market=crypto&full=1          -> { items: [{t,u,src,ts}] }
// TradingView's headline endpoints have no CORS, so the hub asks through here:
// Focus mode still uses the count probe; the unified News widget reads items.
// Edge-cached 10 minutes.
const MARKETS = new Set(['crypto', 'stock', 'index', 'forex', 'economy']);

export default async function handler(req, res) {
  const symbol = String(req.query?.symbol ?? '').slice(0, 40);
  const market = String(req.query?.market ?? '').slice(0, 12);
  const full = String(req.query?.full ?? '') === '1';
  let qs;
  if (symbol) {
    if (!/^[A-Za-z0-9:._-]+$/.test(symbol)) {
      res.status(400).json({ error: 'bad symbol' });
      return;
    }
    qs = `symbol=${encodeURIComponent(symbol)}`;
  } else if (MARKETS.has(market)) {
    qs = `category=${market}`;
  } else {
    res.status(400).json({ error: 'bad request' });
    return;
  }
  try {
    const r = await fetch(
      `https://news-headlines.tradingview.com/v2/headlines?client=overview&lang=en&${qs}`,
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(6000) },
    );
    if (!r.ok) {
      res.status(502).json({ error: `tv ${r.status}` });
      return;
    }
    const j = await r.json();
    const items = Array.isArray(j?.items) ? j.items : [];
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (!full) {
      res.status(200).json({ count: items.length });
      return;
    }
    res.status(200).json({
      items: items.slice(0, 40).map((it) => ({
        t: String(it.title ?? '').slice(0, 300),
        u: it.link ?? (it.storyPath ? `https://www.tradingview.com${it.storyPath}` : null),
        src: it.source ?? it.provider ?? 'TradingView',
        ts: Number.isFinite(it.published) ? it.published * 1000 : null,
      })).filter((x) => x.t && x.u),
    });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
