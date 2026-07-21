// GET /api/vice-stats -> { servers: <approximate_guild_count> }
// Live server count for the Vice Charts bot, read from Discord's
// applications/@me endpoint. The bot token lives ONLY in the Vercel env var
// VICE_CHARTS_BOT_TOKEN (Settings -> Environment Variables) — never in page
// code. Edge-cached 5 minutes so Discord sees a handful of requests an hour
// regardless of traffic. Functions resolve before the vicesuite.com rewrites,
// so this same path works on both domains.
export default async function handler(req, res) {
  const token = process.env.VICE_CHARTS_BOT_TOKEN;
  if (!token) {
    res.status(503).json({ error: 'not configured' });
    return;
  }
  try {
    const r = await fetch('https://discord.com/api/v10/applications/@me', {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!r.ok) {
      res.status(502).json({ error: `discord ${r.status}` });
      return;
    }
    const app = await r.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ servers: app.approximate_guild_count ?? null });
  } catch {
    res.status(502).json({ error: 'discord unreachable' });
  }
}
