#!/usr/bin/env python3
"""Vice dev server — workspace statics + working /api/vice-* locally.

The static python server can't run Vercel functions, so hub panels that need
a proxy (coinalyze, okx rubik, deribit chart-data) sit dark in local preview.
This server fills them in:

  /api/vice-coinalyze  implemented here (mirrors api/vice-coinalyze.js);
                       key read from ~/.openclaw/vice-dev.env — deliberately
                       OUTSIDE the deploy tree so it can never ship
  /api/vice-okx        implemented here (mirrors api/vice-okx.js)
  /api/vice-deribit    implemented here (mirrors api/vice-deribit.js)
  /api/vice-headlines  implemented here (mirrors api/vice-headlines.js —
                       prod may lag the full=1 items mode until deployed)
  /api/vice-hlboard    implemented here (mirrors api/vice-hlboard.js)
  /api/*  (anything else) forwarded to https://vicesuite.com (already live)
  everything else      static files from the workspace root

Run: python3 tools/vice-dev-server.py [port]   (default 5323)
"""
import json
import os
import re
import sys
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, unquote, urlencode, urlparse
from urllib.request import Request, urlopen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 5323))


def qint(q, key, default):
    # prod's Number()||default never 502s on garbage — neither do we
    try:
        return int((q.get(key) or [str(default)])[0] or default)
    except (TypeError, ValueError):
        return default


def load_key():
    try:
        with open(os.path.expanduser('~/.openclaw/vice-dev.env')) as f:
            for line in f:
                if line.startswith('COINALYZE_API_KEY='):
                    return line.split('=', 1)[1].strip()
    except OSError:
        pass
    return None


KEY = load_key()


def fetch_json(url, headers=None, timeout=12):
    req = Request(url, headers={'User-Agent': 'vice-dev', 'accept': 'application/json',
                                **(headers or {})})
    with urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


# ── coinalyze (mirrors api/vice-coinalyze.js — keep the two in lockstep) ───
WANTED = {'Binance': 'BIN', 'Bybit': 'BYB', 'OKX': 'OKX', 'Deribit': 'DER',
          'Hyperliquid': 'HL'}
PERIODS_YR = {'HL': 24 * 365, 'BIN': 3 * 365, 'BYB': 3 * 365, 'OKX': 3 * 365,
              'DER': 3 * 365}
MKT_BASKET = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'LINK', 'HYPE', 'SUI', 'LTC', 'AVAX']
KINDS = {  # path, interval, usd-convert, max days, snapshot?
    'liqs': ('liquidation-history', '1hour', True, 30, False),
    'oi': ('open-interest-history', '1hour', True, 30, False),
    'funding': ('funding-rate-history', '1hour', False, 14, False),
    'cvd': ('ohlcv-history', '1hour', False, 7, False),
    'vol': ('ohlcv-history', 'daily', False, 30, False),
    'volh': ('ohlcv-history', '1hour', False, 30, False),
    'volsnap': ('ohlcv-history', '1hour', False, 2, True),
    'oisnap': ('open-interest-history', '1hour', True, 2, True),
    'mktvol': ('ohlcv-history', '1hour', False, 7, False),
    'mktoi': ('open-interest-history', '1hour', True, 7, False),
}
MARKET_KINDS = {'mktvol', 'mktoi'}
_mkts = {'t': 0, 'by_venue': None}
_mlock = threading.Lock()


# token bucket: the free tier is 40 calls/min and EVERY chunked call counts.
# Bursts queue here instead of erroring; a call that outlives the client's
# timeout still lands in the response cache for the panel's next poll.
_cz_times = []
_cz_lock = threading.Lock()


def _cz_slot(credits):
    while True:
        with _cz_lock:
            now = time.time()
            while _cz_times and now - _cz_times[0][0] > 60:
                _cz_times.pop(0)
            spent = sum(c for _, c in _cz_times)
            if spent + credits <= 34:
                _cz_times.append((now, credits))
                return
            wait = 61 - (now - _cz_times[0][0])
        time.sleep(max(wait, 0.5))


def cz(path):
    # the free tier counts each symbol in a batch as one call
    m = re.search(r'symbols=([^&]+)', path)
    credits = len(unquote(m.group(1)).split(',')) if m else 1
    _cz_slot(credits)
    try:
        return fetch_json(f'https://api.coinalyze.net/v1{path}', {'api_key': KEY})
    except Exception as e:  # shared-IP overage can still 429 — one retry
        if '429' not in str(e):
            raise
        time.sleep(3)
        _cz_slot(credits)
        return fetch_json(f'https://api.coinalyze.net/v1{path}', {'api_key': KEY})


def markets():
    with _mlock:
        if _mkts['by_venue'] and time.time() - _mkts['t'] < 6 * 3600:
            return _mkts['by_venue']
        code_to_venue = {e['code']: WANTED[e['name']]
                         for e in cz('/exchanges') if e['name'] in WANTED}
        by_venue = {}
        for m in cz('/future-markets'):
            venue = code_to_venue.get(m.get('exchange'))
            if not venue or not m.get('is_perpetual'):
                continue
            if m.get('quote_asset') not in ('USD', 'USDT', 'USDC'):
                continue
            slot = by_venue.setdefault(venue, {})
            entry = {'symbol': m['symbol'],
                     'usd_native': m.get('oi_lq_vol_denominated_in') == 'QUOTE_ASSET'}
            base = slot.setdefault(m['base_asset'], {'primary': entry, 'all': []})
            base['all'].append(entry)
            if m.get('quote_asset') == 'USDT':
                base['primary'] = entry  # USDT market leads
        _mkts.update(t=time.time(), by_venue=by_venue)
        return by_venue


def points_for(kind, venue, usd_native, history):
    pts = []
    for h in history:
        t = (h.get('t') or 0) * 1000
        if t <= 0:
            continue
        usd = 1 if usd_native else (h.get('c') or 0)
        if kind == 'liqs':
            pts.append([t, h.get('l') or 0, h.get('s') or 0])
        elif kind in ('oi', 'oisnap', 'mktoi'):
            pts.append([t, h.get('c') or 0])
        elif kind == 'funding':
            pts.append([t, (h.get('c') or 0) * PERIODS_YR[venue]])
        elif kind == 'cvd':
            pts.append([t, (2 * (h.get('bv') or 0) - (h.get('v') or 0)) * usd])
        elif kind in ('vol', 'volh', 'volsnap', 'mktvol'):
            pts.append([t, (h.get('v') or 0) * usd])
    pts.sort(key=lambda p: p[0])
    return pts


# prod has Vercel's edge cache in front of the function; locally we need our
# own or a page render (7 kinds) times a few reloads trips the 40 req/min tier
_resp_cache = {}
_rlock = threading.Lock()


def api_coinalyze(q):
    kind = (q.get('kind') or [''])[0]
    sym = (q.get('sym') or [''])[0].upper()
    days_key = (q.get('days') or [''])[0]
    ck = (kind, sym, days_key)
    with _rlock:
        hit = _resp_cache.get(ck)
        if hit and time.time() - hit[0] < 600:
            return hit[1], hit[2]
    try:
        status, payload = _coinalyze_uncached(q, kind, sym)
    except Exception as e:  # 429s arrive as HTTPError — stale beats an error
        if hit:
            return hit[1], hit[2]
        return 502, {'error': str(e)}
    with _rlock:
        if status == 200:
            _resp_cache[ck] = (time.time(), status, payload)
        elif hit:
            return hit[1], hit[2]
    return status, payload


def _coinalyze_uncached(q, kind, sym):
    spec = KINDS.get(kind)
    if not spec or (kind not in MARKET_KINDS and not re.fullmatch(r'[A-Z0-9]{2,12}', sym)):
        return 400, {'error': 'bad request'}
    path, interval, usd_conv, max_days, snap = spec
    days = min(max(qint(q, 'days', max_days), 1), max_days)
    if not KEY:
        return 200, {'noKey': True}
    wanted = []
    if kind in MARKET_KINDS:
        # primary market only — the free tier counts every batched symbol
        for venue, bases in markets().items():
            for coin in MKT_BASKET:
                if bases.get(coin):
                    wanted.append({'venue': venue, **bases[coin]['primary']})
    else:
        pairs = [(v, m.get(sym)) for v, m in markets().items() if m.get(sym)]
        for venue, m in pairs:
            for mm in ([m['primary']] if kind == 'funding' else m['all']):
                wanted.append({'venue': venue, **mm})
    if not wanted:
        return 200, {'venues': []}
    to = int(time.time())
    frm = to - (26 * 3600 if snap else days * 86400)
    rows = []
    for i in range(0, len(wanted), 20):
        syms = quote(','.join(w['symbol'] for w in wanted[i:i + 20]), safe='')
        rows += cz(f'/{path}?symbols={syms}&interval={interval}&from={frm}&to={to}'
                   + ('&convert_to_usd=true' if usd_conv else '')) or []
    agg = {}
    for row in rows or []:
        w = next((x for x in wanted if x['symbol'] == row.get('symbol')), None)
        if not w:
            continue
        acc = agg.setdefault(w['venue'], {})
        for p in points_for(kind, w['venue'], w['usd_native'], row.get('history') or []):
            cur = acc.get(p[0])
            if cur is None:
                acc[p[0]] = list(p)
            else:
                cur[1] += p[1]
                if len(p) > 2:
                    cur[2] += p[2]
    venues = []
    for venue, acc in agg.items():
        pts = sorted(acc.values(), key=lambda p: p[0])
        if not pts:
            continue
        if snap:
            value = sum(p[1] for p in pts[-24:]) if kind == 'volsnap' else pts[-1][1]
            if value > 0:
                venues.append({'venue': venue, 'value': value})
        else:
            venues.append({'venue': venue, 'points': pts})
    return 200, {'venues': venues}


# ── okx (mirrors api/vice-okx.js) ──────────────────────────────────────────
def api_okx(q):
    kind = (q.get('kind') or [''])[0]
    period = (q.get('period') or ['1H'])[0]
    period = period if period in ('5m', '1H', '1D') else '1H'
    limit = min(max(qint(q, 'limit', 100), 1), 100)
    if kind == 'oi':
        inst = (q.get('instId') or [''])[0]
        if not re.fullmatch(r'[A-Z0-9]{2,12}-USDT-SWAP', inst):
            return 400, {'error': 'bad request'}
        params = {'instId': inst, 'period': period, 'limit': limit}
        path = '/api/v5/rubik/stat/contracts/open-interest-history'
    elif kind == 'taker':
        ccy = (q.get('ccy') or [''])[0]
        if not re.fullmatch(r'[A-Z0-9]{2,12}', ccy):
            return 400, {'error': 'bad request'}
        params = {'ccy': ccy, 'instType': 'CONTRACTS', 'period': period, 'limit': limit}
        path = '/api/v5/rubik/stat/taker-volume'
    elif kind == 'liq':
        uly = (q.get('uly') or [''])[0]
        if not re.fullmatch(r'[A-Z0-9]{2,12}-USDT', uly):
            return 400, {'error': 'bad request'}
        # parity with api/vice-okx.js: period rides along, limit honors the query
        params = {'instType': 'SWAP', 'uly': uly, 'state': 'filled', 'period': period, 'limit': limit}
        path = '/api/v5/public/liquidation-orders'
    else:
        return 400, {'error': 'bad request'}
    return 200, fetch_json(f'https://www.okx.com{path}?{urlencode(params)}')


# ── deribit (mirrors api/vice-deribit.js) ──────────────────────────────────
def api_deribit(q):
    instrument = (q.get('instrument') or [''])[0]
    days = min(max(qint(q, 'days', 7), 1), 31)
    if not re.fullmatch(r'[A-Z0-9_]{2,10}-(PERPETUAL|\d{1,2}[A-Z]{3}\d{2}(-\d+-[CP])?)', instrument):
        return 400, {'error': 'bad instrument'}
    end = int(time.time() * 1000)
    return 200, fetch_json(
        'https://www.deribit.com/api/v2/public/get_tradingview_chart_data'
        f'?instrument_name={instrument}&start_timestamp={end - days * 86400000}'
        f'&end_timestamp={end}&resolution=60')


# ── tradingview headlines (mirrors api/vice-headlines.js) ─────────────────
HEADLINE_MARKETS = {'crypto', 'stock', 'index', 'forex', 'economy'}


def api_headlines(q):
    symbol = (q.get('symbol') or [''])[0][:40]
    market = (q.get('market') or [''])[0][:12]
    full = (q.get('full') or [''])[0] == '1'
    if symbol:
        if not re.fullmatch(r'[A-Za-z0-9:._-]+', symbol):
            return 400, {'error': 'bad symbol'}
        qs = f'symbol={quote(symbol, safe="")}'
    elif market in HEADLINE_MARKETS:
        qs = f'category={market}'
    else:
        return 400, {'error': 'bad request'}
    j = fetch_json('https://news-headlines.tradingview.com/v2/headlines'
                   f'?client=overview&lang=en&{qs}', timeout=8)
    items = j.get('items') if isinstance(j, dict) else None
    items = items if isinstance(items, list) else []
    if not full:
        return 200, {'count': len(items)}
    out = []
    for it in items[:40]:
        t = str(it.get('title') or '')[:300]
        u = it.get('link') or (
            f"https://www.tradingview.com{it['storyPath']}" if it.get('storyPath') else None)
        ts = it.get('published')
        if t and u:
            out.append({'t': t, 'u': u, 'src': it.get('source') or it.get('provider') or 'TradingView',
                        'ts': ts * 1000 if isinstance(ts, (int, float)) else None})
    return 200, {'items': out}


# ── hyperliquid leaderboard (mirrors api/vice-hlboard.js) ─────────────────
_hlboard = {'t': 0, 'rows': None}
_hlboard_lock = threading.Lock()


def _hlboard_rows():
    with _hlboard_lock:
        if _hlboard['rows'] and time.time() - _hlboard['t'] < 15 * 60:
            return _hlboard['rows']
        j = fetch_json('https://stats-data.hyperliquid.xyz/Mainnet/leaderboard', timeout=60)
        rows = []
        for row in j.get('leaderboardRows') or []:
            w = dict(row.get('windowPerformances') or [])

            def num(x):
                try:
                    return float(x)
                except (TypeError, ValueError):
                    return 0.0

            def slot(k):
                s = w.get(k) or {}
                return {'pnl': num(s.get('pnl')), 'roi': num(s.get('roi')), 'vlm': num(s.get('vlm'))}
            rows.append({'a': row.get('ethAddress'), 'n': row.get('displayName'),
                         'v': num(row.get('accountValue')),
                         'day': slot('day'), 'week': slot('week'),
                         'month': slot('month'), 'all': slot('allTime')})
        _hlboard.update(t=time.time(), rows=rows)
        return rows


def api_hlboard(q):
    win = (q.get('window') or ['month'])[0]
    win = win if win in ('day', 'week', 'month', 'all') else 'month'
    sort = (q.get('sort') or ['pnl'])[0]
    sort = sort if sort in ('pnl', 'roi', 'vlm', 'value') else 'pnl'
    limit = min(max(qint(q, 'limit', 100), 10), 250)
    rows = _hlboard_rows()
    pool = [r for r in rows if r[win]['vlm'] > 0]  # traders, not idle vaults
    if sort == 'roi':
        pool = [r for r in pool if r['v'] >= 100_000]
    key = (lambda r: r['v']) if sort == 'value' else (lambda r: r[win][sort])
    top = sorted(pool, key=key, reverse=True)[:limit]
    return 200, {'rows': top}


LOCAL_APIS = {'vice-coinalyze': api_coinalyze, 'vice-okx': api_okx,
              'vice-deribit': api_deribit, 'vice-headlines': api_headlines,
              'vice-hlboard': api_hlboard}


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 (http.server naming)
        parsed = urlparse(self.path)
        if parsed.path.startswith('/_vercel/'):  # analytics stub — prod-only
            self.send_response(204)
            self.end_headers()
            return None
        if not parsed.path.startswith('/api/'):
            return super().do_GET()
        name = parsed.path[5:].strip('/')
        q = parse_qs(parsed.query)
        try:
            if name in LOCAL_APIS:
                status, payload = LOCAL_APIS[name](q)
            else:
                # already deployed on prod — just forward
                url = f'https://vicesuite.com{parsed.path}'
                if parsed.query:
                    url += f'?{parsed.query}'
                status, payload = 200, fetch_json(url)
        except Exception as e:  # keep the panel's error strip honest
            status, payload = 502, {'error': str(e)}
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        if any('/api/' in str(a) for a in args):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    print(f'vice dev server on http://localhost:{PORT} '
          f'(coinalyze key: {"loaded" if KEY else "MISSING — panels fall back"})')
    ThreadingHTTPServer(('', PORT), partial(Handler, directory=ROOT)).serve_forever()
