// GET /api/vice-headlines?symbol=CRYPTO:SOLUSD -> { count } — whether
// TradingView has recent stories for a symbol (their endpoint has no CORS,
// so the hub's Focus mode asks through here). Edge-cached 10 minutes.
export default async function handler(req, res) {
  const symbol = String(req.query?.symbol ?? '').slice(0, 40);
  if (!/^[A-Za-z0-9:._-]+$/.test(symbol)) {
    res.status(400).json({ error: 'bad symbol' });
    return;
  }
  try {
    const r = await fetch(
      `https://news-headlines.tradingview.com/v2/headlines?client=overview&lang=en&symbol=${encodeURIComponent(symbol)}`,
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(6000) },
    );
    if (!r.ok) {
      res.status(502).json({ error: `tv ${r.status}` });
      return;
    }
    const j = await r.json();
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ count: Array.isArray(j?.items) ? j.items.length : 0 });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
