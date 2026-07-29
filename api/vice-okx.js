// GET /api/vice-okx?kind=oi&instId=BTC-USDT-SWAP&period=1H&limit=100
// GET /api/vice-okx?kind=taker&ccy=BTC&period=1H&limit=100
// OKX's rubik/stat endpoints send no CORS headers, so the hub's futures
// analytics (OI history, taker CVD) ask through here. Strict allowlist —
// two endpoints, validated params, nothing else. Edge-cached 2 minutes.
const KINDS = {
  oi: {
    path: '/api/v5/rubik/stat/contracts/open-interest-history',
    params: (q) => ({ instId: q.instId, period: q.period, limit: q.limit }),
    ok: (q) => /^[A-Z0-9]{2,12}-USDT-SWAP$/.test(q.instId ?? ''),
  },
  taker: {
    path: '/api/v5/rubik/stat/taker-volume',
    params: (q) => ({ ccy: q.ccy, instType: 'CONTRACTS', period: q.period, limit: q.limit }),
    ok: (q) => /^[A-Z0-9]{2,12}$/.test(q.ccy ?? ''),
  },
  liq: {
    path: '/api/v5/public/liquidation-orders',
    params: (q) => ({ instType: 'SWAP', uly: q.uly, state: 'filled', limit: q.limit }),
    ok: (q) => /^[A-Z0-9]{2,12}-USDT$/.test(q.uly ?? ''),
  },
};

export default async function handler(req, res) {
  const q = req.query ?? {};
  const kind = KINDS[q.kind];
  const period = ['5m', '1H', '1D'].includes(q.period) ? q.period : '1H';
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 100, 1), 100);
  if (!kind || !kind.ok(q)) {
    res.status(400).json({ error: 'bad request' });
    return;
  }
  try {
    const params = new URLSearchParams({ ...kind.params(q), period, limit: String(limit) });
    const r = await fetch(`https://www.okx.com${kind.path}?${params}`, {
      headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      res.status(502).json({ error: `okx ${r.status}` });
      return;
    }
    const j = await r.json();
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(j);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
