# MEMORY.md — Long-Term Memory

## Deploying liqtheory.com (Vercel)

**When the user says "update the live site" / "deploy" / "update the Vercel site":**

```bash
cd /Users/pbot/.openclaw/workspace && vercel --prod --archive=tgz
```

- `--archive=tgz` is **required** — the 2,661 audio mp3s exceed Vercel's 5,000-file-per-upload limit; tgz packs it all into one upload and avoids the "too many requests" error.
- The Vercel CLI is already authenticated (no token needed).
- `.vercel/project.json` has the project ID; `.vercelignore` controls what ships.
- There is **no git remote** — deploy goes direct via CLI, not via git push.
- Do **not** run `vercel --prod` without `--archive=tgz` — it will fail mid-upload.
- After deploy, the site is live at **https://liqtheory.com** (aliased from `www.liqtheory.com`).
- Build runs `node tools/gen-seo.js` on Vercel (generates 81 lesson pages, sitemap, robots.txt).
- Typical deploy time: ~45 seconds after upload completes.
