/* Vice Tickers — live demo on the pricebots page.
   Feeds the hero's Discord member-list mock with REAL prices: one Hyperliquid
   metaAndAssetCtxs call covers every coin (markPx + prevDayPx), polled every
   5 s like the actual bots. Names flip green/red with the day, presence dots
   follow, and the status line runs the bots' real rotation:
   change / liqtheory.com / change / discord invite in 15 s slots.
   If the feed is unreachable the static mock values simply remain. */

const UP = '#16c784';
const DOWN = '#ea3943';
const DOT_UP = '#23a55a';
const DOT_DOWN = '#f23f43';
const STATUS_CYCLE = ['change', 'liqtheory.com', 'change', 'discord.gg/LiquidityTheory'];

let quotes = {}; // coin -> { px, prev }
const lastPx = {}; // coin -> last painted price, for the change flash

const fmtPrice = (v) => {
  if (v >= 10_000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1_000) {
    const r = Math.round(v * 10) / 10;
    return r.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(r) ? 0 : 1, maximumFractionDigits: 1 });
  }
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmt2 = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function fetchQuotes(coins) {
  const res = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const [meta, ctxs] = await res.json();
  const out = {};
  meta.universe.forEach((u, i) => {
    if (coins.includes(u.name)) out[u.name] = { px: +ctxs[i].markPx, prev: +ctxs[i].prevDayPx };
  });
  return out;
}

function paint() {
  const slot = STATUS_CYCLE[Math.floor(Date.now() / 15_000) % STATUS_CYCLE.length];
  document.querySelectorAll('[data-live-coin]').forEach((row) => {
    const coin = row.dataset.liveCoin;
    const q = quotes[coin];
    if (!q || !q.prev) return;
    const up = q.px >= q.prev;
    const diff = Math.abs(q.px - q.prev);
    const pct = (diff / q.prev) * 100;

    const name = row.querySelector('.dmember-name, .ht-name');
    const status = row.querySelector('.dmember-status, .ht-status');
    const dot = row.querySelector('.dmember-dot');
    if (name) {
      name.textContent = `${coin} ${up ? '↗' : '↘'} $${fmtPrice(q.px)}`;
      name.style.color = up ? UP : DOWN;
      if (lastPx[coin] !== undefined && lastPx[coin] !== q.px) {
        name.classList.remove('tick-flash');
        void name.offsetWidth; // restart the animation
        name.classList.add('tick-flash');
      }
      lastPx[coin] = q.px;
    }
    if (dot) dot.style.background = up ? DOT_UP : DOT_DOWN;
    if (status) {
      status.textContent = slot === 'change'
        ? `${up ? 'Up' : 'Down'} $${fmt2(diff)} (${up ? '+' : ''}${fmt2(up ? pct : -pct)}%) from prev. close`
        : slot;
    }
  });
}

function initLiveTickers() {
  const rows = [...document.querySelectorAll('[data-live-coin]')];
  if (rows.length === 0) return;
  const coins = rows.map((r) => r.dataset.liveCoin);
  const poll = async () => {
    try {
      quotes = await fetchQuotes(coins);
      paint();
    } catch { /* keep last (or static) values */ }
  };
  poll();
  setInterval(poll, 5_000);
  setInterval(paint, 1_000); // keeps the 15 s status rotation ticking between polls
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLiveTickers);
} else {
  initLiveTickers();
}
