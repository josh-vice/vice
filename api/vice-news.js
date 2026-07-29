// GET /api/vice-news -> [{ t, u, src, ts }] — a few crypto RSS feeds fetched
// server-side (they don't send CORS headers), normalized, merged newest-first.
// Edge-cached 5 minutes.
const FEEDS = [
  { src: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { src: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { src: 'Decrypt', url: 'https://decrypt.co/feed' },
  { src: 'The Block', url: 'https://www.theblock.co/rss.xml' },
];

const decode = (s) => s
  .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&#8217;/g, '’').replace(/&#8216;/g, '‘')
  .replace(/&#8220;/g, '“').replace(/&#8221;/g, '”')
  .replace(/&nbsp;/g, ' ')
  .trim();

function parseItems(xml, src) {
  const out = [];
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) ?? [];
  for (const item of items.slice(0, 20)) {
    const title = /<title[^>]*>([\s\S]*?)<\/title>/.exec(item)?.[1];
    const link = /<link[^>]*>([\s\S]*?)<\/link>/.exec(item)?.[1];
    const date = /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/.exec(item)?.[1];
    if (!title || !link) continue;
    const ts = date ? Date.parse(decode(date)) : NaN;
    out.push({ t: decode(title), u: decode(link), src, ts: Number.isFinite(ts) ? ts : null });
  }
  return out;
}

export default async function handler(req, res) {
  const results = await Promise.allSettled(FEEDS.map(async (f) => {
    const r = await fetch(f.url, {
      headers: { accept: 'application/rss+xml, application/xml, text/xml, */*', 'user-agent': 'ViceSuite/1.0 (+https://vicesuite.com)' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) throw new Error(`${f.src} ${r.status}`);
    return parseItems(await r.text(), f.src);
  }));
  const items = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  if (items.length === 0) {
    res.status(502).json({ error: 'no feeds reachable' });
    return;
  }
  items.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(items.slice(0, 40));
}
