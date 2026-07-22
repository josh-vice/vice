// GET /api/vice-movers -> [{ s, n, p, c24, mc, r }] — top-250 coins by market
// cap with 24h change, from CoinGecko's free /coins/markets endpoint (the paid
// gainers/losers endpoint is deliberately NOT used; clients sort by c24).
// Edge-cached 2 minutes so CoinGecko sees ~30 req/hour max regardless of
// traffic. Functions resolve before the vicesuite.com rewrites, so this same
// path works on both domains.
export default async function handler(req, res) {
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc' +
      '&per_page=250&page=1&sparkline=false&price_change_percentage=24h',
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) },
    );
    if (!r.ok) {
      res.status(502).json({ error: `coingecko ${r.status}` });
      return;
    }
    const rows = await r.json();
    const slim = rows.map((c) => ({
      s: (c.symbol || '').toUpperCase(),
      n: c.name,
      p: c.current_price,
      c24: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? null,
      mc: c.market_cap,
      r: c.market_cap_rank,
    }));
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(slim);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
