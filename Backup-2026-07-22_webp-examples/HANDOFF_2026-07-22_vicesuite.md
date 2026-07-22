# HANDOFF — Vice Suite (bots + vicesuite.com) · 2026-07-22

The Vice Suite is Vice Terminal's product line: **7 Discord price-ticker bots**, the
**Vice Charts bot** (`vc` commands), and **Vice Academy** (= liqtheory.com, untouched).
Site: **vicesuite.com** (same Vercel project as liqtheory.com). Everything is free.

---

## 1. The bots (run on the Mac mini, NOT deployed anywhere)

### price-tickers — `/Users/pbot/DiscordBots/price-tickers/`
One Node process runs all 7 tickers (config-driven): **BTC ETH SOL SPX HYPE ZEC XRP**.
- Nickname = live price (`BTC ↗ $66,355`, SPX index-style: `7,509.20`, 2dec no $).
- Name color green/red via self-managed roles **Ticker Green / Ticker Red** (#16c784/#ea3943).
- Custom status rotates 15s slots: **change ×3 / "🦩 vicesuite.com" ×1** (75/25 — owner rule:
  vicesuite.com 25% MAX). Sub-cent diffs show 4 decimals ("Up $0.0020").
- Data: TradingView scanner (`scanner.tradingview.com/global/scan`), poll 5s,
  nickname edits gated ≥15s. HYPE has no `CRYPTO:` composite → `BYBIT:HYPEUSDT`.
- Tokens in `.env` (one per ticker: `DISCORD_TOKEN`, `_ETH`, `_SOL`, `_SPX`, `_HYPE`, `_ZEC`, `_XRP`).
- App ids: BTC 1529222506593128548 · ETH 1529272734624776433 · SOL 1529273091962835074
  · SPX 1529273423879077960 · HYPE 1529278347698245733 · ZEC 1529278947903275198
  · XRP 1529279198730911935. All bios = `https://vicesuite.com`.
- Invite URL pattern (perms = Change Nickname + Manage Roles):
  `https://discord.com/oauth2/authorize?client_id=<ID>&scope=bot&permissions=335544320`

### chart-bot — `/Users/pbot/DiscordBots/chart-bot/` ("Vice Chart Bot"#0050)
Prefix **`vc`** (Message Content intent ON). Nimbus-clone, ~80% parity:
21 indicators, compare/ratio (cross-venue), best/worst movers, multichart `|`,
X/Discord/TruthSocial timestamp markers, time:/from:, weekends/usmarket shading,
full channel-scoped alert system (persists to `data/alerts.json`), jokes, meta cmds.
- Every render carries the **flamingo + vicesuite.com watermark top-right** (title-sized,
  `assets/vice-terminal-64.png` as data URI in `src/chart.js`).
- Data: Hyperliquid default → KuCoin fallback; `cb:` Coinbase, `kr:` Kraken.
  **Binance & Bybit APIs geo-block this US IP** (bot data only; TV scanner is fine).
- Usage ledger: `data/stats.json` (`vc stats` in Discord). Bio: PATCH /applications/@me.

### Operating the bots
- Both run as session background processes (`npm start` in each dir).
  **They do NOT survive a reboot — launchd/pm2 setup is still TODO** (owner plans a VPS later;
  keep bot code portable, no Mac-specific paths).
- **Restart carefully**: both processes match `node src/index.js` — kill by cwd:
  `for pid in $(pgrep -f "node src/index.js"); do lsof -a -p $pid -d cwd ... ; done`
  (kill only the one whose cwd matches the bot you're restarting).
- **KNOWN ISSUE (owner action pending)**: ETH/SOL/SPX (and likely HYPE/ZEC/XRP) were added
  via the profile "Add App" button = **zero permissions** → color roles fail
  ("Missing Permissions" in logs). Fix per server: give each bot role **Manage Roles**
  AND drag it **above Ticker Green/Red**. The ticker process retries failed color roles
  every 60s and logs "color role recovered" — no restart needed.

---

## 2. The website — `vice/` in this workspace (+ root `vercel.json`, `middleware.js`, `api/`)

Pages: hub `vice/index.html`, `vice/tickers/` (**/pricebots**), `vice/charts/` (**/chartbot**).
Shared: `vice/vice.css` (v2.3.2), `vice/vice.js` (scroll-reveal + server-count),
`vice/tickers-live.js` (v1.5.0, live prices), `vice/demo.js` (v1.0.4, in-page chart engine).

### Routing / deploy (CRITICAL knowledge)
- vicesuite.com + liqtheory.com = ONE Vercel project. `vercel.json` has HOST-conditioned
  rewrites (`(www.)?vicesuite.com`): `/`→vice/index.html (via **middleware.js** — rewrites
  can't override `/` because filesystem wins), `/chartbot`, `/pricebots`, catch-all `/:path*`→`/vice/:path*`.
  liqtheory.com is untouched by all of it.
- **PATH RULE**: deep pages serve at `/chartbot` & `/pricebots` (no directory!) so every
  asset they reference must live in `vice/` ROOT and be referenced `../<file>`.
  NEVER put page assets inside vice/charts/ or vice/tickers/.
- Deploy = owner/OpenClaw runs `vercel --prod` (NEVER deploy from this session).
  Verify after: vicesuite.com (hub), /pricebots, /chartbot, and liqtheory.com unchanged.
- `api/vice-stats.js` (Vercel function) → Discord approximate_guild_count using env
  `VICE_CHARTS_BOT_TOKEN` (owner added it). Page stat `#vc-servers` stays hidden until >0
  (Discord computes the count lazily for new apps; it read 0 on 2026-07-21).

### In-page live demos (both verified working in prod)
- **/chartbot**: `demo.js` = browser port of the bot engine (same parser/indicators/chart
  builders; keep in sync if bot chart.js changes). Venues in-browser: Hyperliquid + `cb:`
  (CORS ok); kc:/kr:/alerts point to Discord. `best/worst` work. ECharts CDN pinned+SRI.
- **/pricebots**: `tickers-live.js` paints all `[data-live-coin]` elements (hero mock rows +
  roster tcards) every 5s. Crypto via HL metaAndAssetCtxs; **SPX via TV scanner CORS trick**:
  POST body as `text/plain` = simple request (their preflight rejects content-type but
  responses carry ACAO). Status rotation mirrors the bots (75/25 incl. 🦩).

### Design/owner rules (do not regress)
- Brand: Geist Mono, #08070f, radii 4/6px, app glow-field+44px grid (on `body::before` —
  NOT background-attachment:fixed, which janks iOS), full-bleed sticky blurred nav with
  **edge-to-edge content** (30px item gap), animated water-gradient on "Vice Suite" h1.
- Accents: Tickers **gold** · Charts **pink** · Academy **teal**. Header brand = "Vice Suite";
  Vice Terminal attribution in footer only. Deep pages use a `.back-btn` chip (not text kicker).
- Roster: 7 `$CODE` tcards FIRST on /pricebots (compact "Add to server" btns), Discord mock
  demoted below. liqtheory.com links open in NEW tabs. Favicon = flamingo (not LT candles).
- **NO OG image** for vicesuite links (owner reversed it — text-only previews; don't re-add).
- No emoji in site UI (lucide only); the 🦩 in bot status/live-demo is bot-output depiction, exempt.
- Scroll-reveal `.sr` must never hide content: 3s revealAll safety net stays.

### LT app touchpoint (only one)
`lt-community.js` v2.1.0: "The Vice Suite" row (flamingo, pink hue) → vicesuite.com.
Nothing else in the app/course content was touched.

---

## 3. Roadmap / open items
1. Owner: fix role perms for the 6 newer tickers (see KNOWN ISSUE) + upload app icons
   (coin logos) for ETH/SOL/SPX/HYPE/ZEC/XRP in the dev portal.
2. Deploy the latest batch ($ codes, nav spacing, back-btn, favicon, OG removal…).
3. Bot persistence: launchd (mini) now, VPS later (Hetzner+pm2 was the recommendation;
   Binance/Bybit become available as venues from a non-US VPS).
4. Chart-bot phase 3+: DEX tokens (GeckoTerminal), mc view, daily/weekly movers, OI,
   categories, baskets, Polymarket, trade tape. Blocked w/o proprietary data: news system,
   liq heatmap/SL-TP, treasuries, stocks/TV symbols.
5. Nice-to-have: WebP the /chartbot example PNGs (~1MB page weight).

Full running history: memory file `lt-discord-bots.md` in the assistant's memory dir.
