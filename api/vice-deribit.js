// GET /api/vice-deribit?instrument=BTC-26SEP26&days=7 -> Deribit hourly
// candles. Almost all Deribit public endpoints are CORS-open — this one
// (get_tradingview_chart_data) is not, and the hub's dated-futures basis
// panel needs it. Strict instrument allowlist. Edge-cached 5 minutes.
export default async function handler(req, res) {
  const instrument = String(req.query?.instrument ?? '');
  const days = Math.min(Math.max(parseInt(req.query?.days, 10) || 7, 1), 31);
  if (!/^[A-Z0-9_]{2,10}-(PERPETUAL|\d{1,2}[A-Z]{3}\d{2}(-\d+-[CP])?)$/.test(instrument)) {
    res.status(400).json({ error: 'bad instrument' });
    return;
  }
  try {
    const end = Date.now();
    const r = await fetch(
      `https://www.deribit.com/api/v2/public/get_tradingview_chart_data?instrument_name=${instrument}` +
      `&start_timestamp=${end - days * 86_400_000}&end_timestamp=${end}&resolution=60`,
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(9000) },
    );
    if (!r.ok) {
      res.status(502).json({ error: `deribit ${r.status}` });
      return;
    }
    const j = await r.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(j);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
