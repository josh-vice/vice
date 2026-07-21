// Vercel Edge Middleware — serves the Vice Suite hub at the vicesuite.com ROOT.
//
// Why this exists: vercel.json `rewrites` run AFTER the filesystem check, and
// "/" always matches the Liquidity Theory app's index.html, so a plain rewrite
// can never re-point the root. Middleware runs BEFORE file serving, so it can.
// Every other vicesuite.com path (/chartbot, /pricebots, assets) is handled by
// the host-conditioned rewrites in vercel.json.
//
// Scope: matcher is "/" only — liqtheory.com's root falls through untouched,
// and no other path invokes this at all.

export const config = { matcher: '/' };

export default function middleware(request) {
  const host = (request.headers.get('host') ?? '').toLowerCase();
  if (host === 'vicesuite.com' || host === 'www.vicesuite.com') {
    const url = new URL('/vice/index.html', request.url);
    return new Response(null, {
      headers: { 'x-middleware-rewrite': url.toString() },
    });
  }
  // Any other host (liqtheory.com): return nothing -> normal routing continues.
}
