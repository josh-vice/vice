// GET /api/vice-fng -> { value, label, yesterday } — the alternative.me crypto
// Fear & Greed index. Updates daily upstream, edge-cached 1 hour here.
export default async function handler(req, res) {
  try {
    const r = await fetch('https://api.alternative.me/fng/?limit=2', {
      headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      res.status(502).json({ error: `alternative.me ${r.status}` });
      return;
    }
    const j = await r.json();
    const [today, prev] = j?.data ?? [];
    if (!today) {
      res.status(502).json({ error: 'no data' });
      return;
    }
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=21600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      value: Number(today.value),
      label: today.value_classification,
      yesterday: prev ? Number(prev.value) : null,
    });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
