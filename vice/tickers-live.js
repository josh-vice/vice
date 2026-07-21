/* Vice Tickers — live demo on the pricebots page.
   Feeds every [data-live-coin] element with REAL prices:
   - crypto rows: one Hyperliquid metaAndAssetCtxs call (markPx + prevDayPx)
   - index rows (data-src="tv:..."): TradingView's scanner, POSTed as
     text/plain — a CORS "simple request", because the scanner's preflight
     doesn't allow a content-type header but its responses do carry ACAO.
   Polls every 5 s like the actual bots. Names flip green/red with the day,
   presence dots follow, prices flash on change, and the status line runs the
   bots' real rotation (change / 🦩 vicesuite.com in 15 s slots).
   If a feed is unreachable the static mock values simply remain. */

const UP = '#16c784';
const DOWN = '#ea3943';
const DOT_UP = '#23a55a';
const DOT_DOWN = '#f23f43';
const STATUS_CYCLE = ['change', '🦩 vicesuite.com'];

let quotes = {}; // key -> { px, prev }
const lastPx = {}; // key -> last painted price, for the change flash

const fmtPrice = (v) => {
  if (v >= 10_000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 1_000) {
    const r = Math.round(v * 10) / 10;
    return r.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(r) ? 0 : 1, maximumFractionDigits: 1 });
  }
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmt2 = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function fetchHl(coins) {
  if (coins.length === 0) return {};
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

async function fetchTv(pairs) {
  // pairs: [{ key, symbol }]
  if (pairs.length === 0) return {};
  const res = await fetch('https://scanner.tradingview.com/global/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // keep it a simple request
    body: JSON.stringify({ symbols: { tickers: pairs.map((p) => p.symbol) }, columns: ['close', 'change_abs'] }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const out = {};
  for (const row of json.data ?? []) {
    const pair = pairs.find((p) => p.symbol === row.s);
    if (!pair) continue;
    const [close, changeAbs] = row.d;
    if (typeof close === 'number') out[pair.key] = { px: close, prev: close - changeAbs };
  }
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
    const indexStyle = row.dataset.fmt === 'index';

    const name = row.querySelector('.dmember-name, .ht-name, .tc-price');
    const status = row.querySelector('.dmember-status, .ht-status');
    const dot = row.querySelector('.dmember-dot');
    if (name) {
      const priceText = indexStyle ? fmt2(q.px) : `$${fmtPrice(q.px)}`;
      name.textContent = `${coin} ${up ? '↗' : '↘'} ${priceText}`;
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
  const seen = new Set();
  const hlCoins = [];
  const tvPairs = [];
  for (const r of rows) {
    const key = r.dataset.liveCoin;
    if (seen.has(key)) continue;
    seen.add(key);
    if (r.dataset.src?.startsWith('tv:')) tvPairs.push({ key, symbol: r.dataset.src.slice(3) });
    else hlCoins.push(key);
  }
  const poll = async () => {
    const [hl, tv] = await Promise.all([
      fetchHl(hlCoins).catch(() => ({})),
      fetchTv(tvPairs).catch(() => ({})),
    ]);
    quotes = { ...quotes, ...hl, ...tv };
    paint();
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
