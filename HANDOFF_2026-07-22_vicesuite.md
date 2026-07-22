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
- Data: Hyperliquid default → KuCoin fallback; `cb:` Coinbase, `kr:` Kraken;
  `gt:` **GeckoTerminal DEX pools (NEW 2026-07-22)** — `vc gt:pepe` or paste a raw
  contract address (EVM/Solana, auto-detected, case preserved); deepest pool wins,
  prices in USD, timeframes 1m 5m 15m 1h 4h 12h 1d, session pool cache,
  friendly 429 message (free tier = 30 req/min). Onchain alerts NOT built (clear error).
  **Binance & Bybit APIs geo-block this US IP** (bot data only; TV scanner is fine).
- Usage ledger: `data/stats.json` (`vc stats` in Discord). Bio: PATCH /applications/@me.

### Operating the bots
- **Both run under launchd since 2026-07-22 afternoon** (they were found dead — session
  background processes die with the session that spawned them; launchd fixes that + reboots).
  Agents: `~/Library/LaunchAgents/com.vicesuite.price-tickers.plist` and
  `com.vicesuite.chart-bot.plist` (KeepAlive, RunAtLoad, ThrottleInterval 15).
  Logs: `~/Library/Logs/vice-suite/<bot>.log` + `.err.log`.
- **Restart** = `launchctl kickstart -k gui/$UID/com.vicesuite.chart-bot` (or
  `...price-tickers`). Do NOT plain-kill the pid — launchd restarts it anyway.
  Stop for real with `launchctl bootout gui/$UID/<label>`.
- Bot code stays portable (no Mac paths inside the bots) — the launchd layer is
  external, so the planned VPS move (pm2) is unaffected.
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
- **/chartbot**: `demo.js` (v1.1.0) = browser port of the bot engine (same parser/indicators/
  chart builders; keep in sync if bot chart.js changes). Venues in-browser: Hyperliquid +
  `cb:` + **`gt:` GeckoTerminal DEX pools (CORS ok — full in-browser DEX charts, "DEX token"
  example chip)**; kc:/kr:/alerts point to Discord. `best/worst` work. ECharts CDN pinned+SRI.
- Gallery/dmock example images are now **WebP** (near-lossless, ~55% lighter) and were
  REGENERATED 2026-07-22 with the current flamingo+vicesuite.com watermark (the old PNGs
  still said "liqtheory.com" in the subtitle). Originals in Backup-2026-07-22_webp-examples/.
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

### Vice Hub — /hub (NEW 2026-07-22 evening) — customizable live dashboard
- Page `vice/hub/index.html`; assets at vice ROOT per the path rule: `hub.css` v1.3.0,
  `hub.js` v1.1.0. **TV DENSITY TRICK (do not remove)**: every .tv-wrap renders at 80%
  (width/height 125% + scale(.8), origin 0 0, unscaled in :fullscreen) — TV embeds
  otherwise draw 24px desktop type inside small blocks and nothing else fixes their
  cross-origin fonts. Hub type scale: 11px headers / 12px rows / 11.5px deltas /
  tabular-nums; tape is h2 (35px scaled band, centered via tv-fixed). Polish pass (emil-design-eng): 27px hairline widget headers (11px
  muted titles), block action buttons fade in on hover only (always visible on touch +
  edit mode), lighter shadows, compact toolbar, :active scale on every pressable.
  ICON GOTCHA: lucide replaces `<i data-lucide>` with a raw 24×24 `<svg>` — size rules
  MUST target `i AND svg` (i-only selectors silently miss → giant icons); hub chrome
  svgs also get stroke-width 1.5. Ticker tape is h3/minH3 with `tv-fixed` centering
  (tvEmbed 4th arg): TV sizes its own 44px band, we center it instead of stretching
  the iframe over a dark shelf. Macro tape uses CAPITALCOM:DXY (TVC:DXY errors in the
  tape widget). Routing: new `/hub` rewrite in vercel.json (host-conditioned, same
  pattern as /chartbot). Gridstack 12.6.0 via jsdelivr, pinned+SRI (like ECharts).
- **Architecture** (hub.js): `HUB_WIDGETS` registry — one manifest per widget type
  (title, icon, category, default/min size, settings schema, mount()→{destroy,refresh}).
  Layouts store INSTANCES `{id,type,x,y,w,h,settings}` only. Settings modals are
  auto-generated from each widget's schema. Unknown types in saved layouts are skipped,
  not fatal. Widgets lazy-mount via IntersectionObserver (2.5s mount-all safety net,
  same rationale as the .sr revealAll rule) and are fully torn down on remove/switch.
- **Canvas**: 24-col grid, cellHeight 36, float:true, drag by title bar, no overlap.
  View mode = staticGrid (default); Edit mode reveals add-tray/settings/remove + grid
  backdrop. GOTCHA: `columnOpts` defaults columnMax to 12 and silently overrides
  `column: 24` — always pass `columnOpts: {columnMax: 24, breakpoints...}`. Mobile
  collapses to 6/2 cols; geometry saves are SKIPPED while collapsed (would clobber
  the desktop layout). `body.hub-dragging iframe{pointer-events:none}` keeps TV
  iframes from eating the mouse mid-drag.
- **Persistence**: localStorage `viceHub.v1` {active, layouts} — local-first, no
  account. Named layouts w/ switcher; factory presets Crypto (default) / Stocks /
  Macro; menu: new/duplicate/rename/delete/reset-to-default/export/import JSON.
  Shared watchlist key `viceHub.watchlist` (Vice Watchlist blocks sync through it).
- **Widgets (22)**: TV embeds (advanced chart, mini chart, ticker tape, crypto/stock/
  ETF/forex heatmaps, crypto+stock screeners, market overview, top stories, TA gauge,
  econ calendar, symbol info/fundamentals) + Vice originals (Vice Watchlist via the
  shared HL 5s poller, Top Movers, Fear & Greed gauge, aggregated Crypto News, Notes,
  Session Clocks, Price Alerts w/ browser notifications, Vice Suite links).
- **Proxies** (repo-root api/, same pattern as vice-stats): `vice-movers.js`
  (CoinGecko /coins/markets top-250, s-maxage 120 — deliberately NOT the paid
  gainers/losers endpoint), `vice-fng.js` (alternative.me, s-maxage 3600),
  `vice-news.js` (CoinDesk/Cointelegraph/Decrypt/TheBlock RSS merged, s-maxage 300).
  Client tries proxy → falls back to direct API (CG + alternative.me allow CORS) so
  local preview works; news has no CORS fallback and shows a friendly message locally.
- **TV embed gotchas learned**: advanced-chart embed refuses index symbols
  (SP:SPX, TVC:DXY → "only available on TradingView") — use AMEX:SPY / OANDA:XAUUSD /
  FOREXCOM:SPXUSD instead; timeline widget has no "economy" market; **screener embeds
  render but return "No symbols match your criteria" on localhost even with TV's own
  canonical config — suspected referrer gating. VERIFY ON PROD after deploy**; they're
  in the add-tray but deliberately NOT in any default preset.
- Site integration: "Hub" nav link on all pages + footer link + full-width purple
  `card-wide` Vice Hub card on the suite index (c-purple/card-wide/btn-purple;
  index copy now "Four tools, one suite"). LANDING GRID (owner-directed, vice.css
  v2.6.0): the big #hub showcase section was built then REMOVED same night — the
  cards grid is now 3 columns: `.card-stack` (compact Vice Tickers + Vice Charts,
  half-height each, no mocks/lists) · Vice Hub (normal card, purple) · Vice Academy.
  `.card-compact p.desc {flex:1}` bottoms the CTA; card-wide class deleted.
  CSS GOTCHA hit twice today: descendant selectors like `.hm-chart svg` also catch
  lucide header icons — scope decorative-svg rules with `>`.
  Backups in Backup-2026-07-22_vicehub/.
- **HUB V2 (late 2026-07-22, hub.js v1.2.1 / hub.css v1.4.0)**: (1) LINKED SYMBOLS —
  clicking any .vrow.clickable (watchlist/movers/funding) calls linkSymbol(); widgets
  with a manifest `link(settings, sym)` fn + `linked` setting re-point and remount
  (tvChart/tvTA/vChart default on; tvMini/tvSymInfo off); tvSymbolFor maps BTC/ETH →
  BITSTAMP, else CRYPTO:<SYM>USD. (2) TAB TICKER — document.title shows linked-or-BTC
  price ↗/↘ every 5s + canvas-drawn favicon dot (green/red over the flamingo).
  (3) VICE CHART widget — demo.js now exports `window.ViceChartEngine`
  {parseCommand, buildOption} (demo UI still only boots on /chartbot; demo.js v1.2.0
  loaded on BOTH pages + pinned ECharts on hub); full vc command syntax incl gt:/
  addresses/best/worst; brand watermark stripped inside hub (title collision at
  block widths). (4) FUNDING & OI widget — hlFeed map now carries funding/oi/vol
  (was already fetched, previously discarded); watchlist or top-by-OI modes.
  (5) CANDLE CLOSE countdown (1H/4H/1D/1W, weekly = Monday 00:00 UTC, epoch+4d
  offset). (6) CMD/CTRL+K or / command palette (layouts/widgets/edit/export +
  type-a-ticker to link) + shortcuts E=edit, 1-5=switch layout (guarded while
  typing/modals). (7) ALERTS v2 — %-targets (+5%), k/m suffixes, WebAudio
  two-tone beep (settings toggle), fired history (kept in instance settings,
  clearable), per-alert copy of the `vc alert …` Discord command. Crypto preset
  now 12 blocks (adds vChart in band 3; vFunding/vCountdown/tvNews band 4 at y26).
- **STRESS-TEST + AUDIT PASS (hub.js v1.3.0 / hub.css v1.5.0)**: all 25 widget types
  mount-verified; rapid layout switching leak-free; fixes shipped: blank text settings
  fall back to defaults (empty symbol used to brick TV widgets), numbers clamp to
  min/max, settings modal has Cancel, gear hidden on settings-less widgets, remove
  shows a 5s Undo toast, empty-layout state with add CTA (#hub-empty), ⌘K/Ctrl-K hint
  button in toolbar (#hub-pal, hidden mobile), Enter submits alert inputs, import
  errors are friendly. Tickers page: dmock member list updated 4→7 (HYPE/ZEC/XRP rows,
  "LIVE PRICE — 7"). Charts demo re-verified (ratio/best/kr:/error paths all clean).
- **SINGLE-BAR CHROME (owner-directed, hub.css v1.5.1)**: the hub page has NO site
  header — one 51px toolbar: flamingo (links to vicesuite.com) + "Vice Hub" wordmark
  + live dot + controls; the four suite links live at the bottom of the ⋮ menu.
  Do not re-add `<header class="top">` to /hub.
- **ALWAYS-LIVE GEOMETRY + TRASH (owner-directed, hub.js v1.4.0 / hub.css v1.6.0)**:
  staticGrid is FALSE permanently — drag (header) and resize (hover-reveal corner
  grip) work in view mode; Edit mode now only gates the settings gears, Add tray,
  and grid backdrop. Remove (X) is always available (hover-revealed); removed blocks
  go to a per-layout `trash` array (cap 10, persisted) and appear as a "Recently
  removed" section at the top of the Add-widget tray — restore keeps settings + old
  position (restoreInstance()). Fear & Greed slimmed (manifest 4×5, preset 5×5,
  smaller gauge CSS; movers gained the row); TA gauge renders denser via
  `.tv-wrap.tv-ta` (scale .725 / 138% dims).
- **PER-WIDGET POLISH (hub.js v1.5.0 / hub.css v1.7.1)**: `.hw-body` is a CSS
  CONTAINER (inline-size) — row widgets adapt to the BLOCK's width: at 250px and
  under the name column drops + rows tighten, at 210px and under the price drops
  (sym + change only); no more clipped columns or horizontal scrollbar pills
  (overflow-x hidden + scrollbar-gutter stable on .vw-scroll). Headers are
  CONTEXTUAL via manifest `label(s)` fns: "Advanced Chart · SOLUSD",
  "Vice Chart · <command>", "Funding & OI · watchlist", "Top Stories · Crypto"
  (set in mountNow, refreshes on remount/link). Watchlist + movers change cells
  carry the bots' up/down arrows. Session Clocks highlight open markets
  (.vclock.open green border/label).
- **DeFi / TradFi TERMS (owner-directed, hub.js v1.6.0)**: preset layouts renamed
  Crypto→DeFi, Stocks→TradFi (Macro unchanged); load() migrates existing stores
  (key + active renamed, order preserved). Market Overview gained a `lead` setting
  (first tab: crypto/indices/forex/futures) — TradFi + Macro presets lead with
  Indices, DeFi with Crypto; header shows "Market Overview · <lead>". Top Stories
  stock market now labels as "TradFi" (option text + header suffix). NOTE: layouts
  migrated from old stores keep their saved settings — only reset/fresh picks up
  the new lead defaults.

- **FOCUS MODE (owner-directed, hub.js v1.7.0 / hub.css v1.8.0)**: toolbar "Focus"
  button (or `F`) opens a ticker search (shared watchlist first, then HL universe by
  OI; free-typed input incl "NASDAQ:AAPL" accepted) → renders an EPHEMERAL
  single-symbol board: advanced chart, TA gauge, symbol info, symbol-filtered Top
  Stories (tvNews gained an optional `symbol` setting → feedMode:'symbol'), 12M mini
  chart, + for HL coins a 4h Vice Chart and single-row Funding & OI (vFunding hidden
  `only` setting); non-crypto swaps those for a fundamentals block. The saved store
  is NEVER touched (verified byte-identical): persistence no-ops by id-mismatch,
  removeInstance short-circuits in focusMode (no trash), switchLayout auto-exits.
  Button flips to teal "SYM · exit"; layout/add/edit controls hidden while focused;
  tab title follows the focused symbol; palette ticker queries offer Focus + Link.

- **NAVBAR LIVE PRICE (owner-directed, hub.js v1.8.0 / hub.css v1.9.0)**: the
  toolbar live-dot is now #hub-price — BTC (HL feed) on every layout except
  TradFi, which shows SPX via the TV-scanner simple-request trick (10s poll,
  runs ONLY while TradFi is active; navPriceSync called from renderLayout).
  Clicking it focuses that market (BTC / FOREXCOM:SPXUSD).

- **LIQUIDITY MAP widget (owner-directed, hub.js v1.10.0 / hub.css v1.9.3)**:
  tray-only Vice original (not in presets) — order-book depth histogram: 36 price
  bins across ±1/2/5% of mid, bar = resting $ notional, bids green / asks red,
  wall alpha scales with size, mid+venue caption, 10s refresh, linked-symbol aware.
  Venue chain BINANCE (deep 500-level book; geo-blocked for US IPs — fine, this
  runs in the VISITOR's browser) → Coinbase (level=2 = full aggregated book,
  US-friendly) → Hyperliquid l2Book; first venue that answers is sticky.
  (A native "Vice Heatmap" treemap was built and REVERTED same night — owner
  disliked the washed-out translucent tiles; don't rebuild without asking.)

### LT app touchpoint (only one)
`lt-community.js` v2.1.0: "The Vice Suite" row (flamingo, pink hue) → vicesuite.com.
Nothing else in the app/course content was touched.

---

## 3. Roadmap / open items
1. Owner: role perms for the newer tickers **look fixed** (zero "Missing Permissions"
   since the 2026-07-22 launchd restart — color roles applied cleanly at startup);
   still pending: upload app icons (coin logos) for ETH/SOL/SPX/HYPE/ZEC/XRP in the portal.
2. Deploy the latest batch ($ codes, nav spacing, back-btn, favicon, OG removal…
   **+ 2026-07-22: WebP/regenerated examples, DEX venue on /chartbot page + demo.js v1.1.0,
   VICE HUB (/hub page + vercel.json rewrite + api/vice-movers|fng|news + nav/card
   integration, vice.css v2.4.0)**). After deploy verify: vicesuite.com/hub loads,
   /api/vice-news returns items, and whether the TV screener widgets fill on the real
   domain (they ghost on localhost — see Hub section).
3. ~~Bot persistence: launchd~~ **DONE 2026-07-22** (see "Operating the bots"). VPS later
   (Hetzner+pm2 was the recommendation; Binance/Bybit become available from a non-US VPS).
4. ~~DEX tokens (GeckoTerminal)~~ **DONE 2026-07-22** (bot + demo). Still open, phase 3+:
   onchain alerts (needs a slower GT poll lane), mc view, daily/weekly movers, OI,
   categories, baskets, Polymarket, trade tape. Blocked w/o proprietary data: news system,
   liq heatmap/SL-TP, treasuries, stocks/TV symbols.

Full running history: memory file `lt-discord-bots.md` in the assistant's memory dir.
