# HANDOFF — Vice Suite (bots + vicesuite.com) · 2026-07-22

The Vice Suite is Vice Terminal's product line: **7 Discord price-ticker bots**, the
**Vice Charts bot** (`vc` commands), **Vice Hub** (customizable live dashboard at
/hub, built this session), and **Vice Academy** (= liqtheory.com, untouched).
Site: **vicesuite.com** (same Vercel project as liqtheory.com). Everything is free.

## 0-FINAL-NIGHT. THIRD 2026-07-22 SESSION — VICE CHART PRO (read THIS first)

**PROD still runs v1.14.0.** The deploy batch GREW tonight: everything in the
old 0-FINAL below PLUS the owner-directed Chart-page overhaul.

**LOCAL END-STATE — hub.js v2.9.2 / hub.css v1.17.2 / vchart.js v1.1.1 (NEW
file, vice ROOT) / vice-coinalyze +volh kind (api AND dev server, lockstep):**

- **/hub #/chart is now OUR OWN CHART** (`vice/vchart.js`, `window.VChartPro`,
  registered as widget `vChartPro` — also tray-addable/pinnable, w16 h13).
  TV embed is gone from the page (tvChart widget itself still in registry).
  Owner asked "use TV charts as base + overlay" — NOT possible: the free TV
  embed is a cross-origin iframe (no overlay, no zoom sync); Velo pays for
  TV's self-hosted Charting Library license. Told the owner; ours is ECharts
  canvas (same base as the LT sim chart), TV-styled.
- **Engine**: HL candles (5m/15m/1h/4h/1d, BARS_FOR per TF), 5s live merge,
  pan/zoom (dataZoom inside) w/ follow-live + zoomSpan, crosshair drives
  Velo-style legend rows (OHLC + one row per indicator, live values, hover
  gear→settings popover, ×→remove). Legend rows are built ONCE and only
  values repaint (rebuilding per tick killed popovers/buttons — gotcha).
  Toolbar: TV-style symbol button (BTC USD ⌄) → search modal (HL universe
  by volume, movers-proxy icons, live px/chg, arrows/Enter/Esc, free-typed
  tickers), TF chips, Indicators menu (2-col, all 19), Heatmap toggle,
  opacity slider (heatAlpha, shows only when on), fullscreen. Setup persists
  to localStorage `viceHub.vchartPro` {tf, heat, heatAlpha, active[]}.
- **All 19 <Velo> indicators implemented as <Vice>** (defs researched from
  docs.velo.xyz/web-app/chart.md): Agg Funding (OI-weighted across venues,
  1h/8h/24h/1y standardization — proxy APR ÷ {8760,1095,365,1}), Funding,
  Cross-Exchange Funding, Agg OI (stack/total/delta), OI, Agg Liqs
  (BIN/BYB/OKX only — no DER/HL liq feed exists, footnoted), Liqs, Volume
  ($/coin), Agg Volume (venue stack via NEW volh kind / delta / CVD via cvd
  kind), Agg Spot Volume (CB+KR), Premium + Coinbase Premium (HL perp vs CB
  spot legs), Tape + Agg Tape (HL candle `n` = trade count!) + Spot Tape
  (Kraken OHLC count col), MA (SMA/EMA/VWAP/OIWMA approx), Returns, Realized
  Vol (ann. stdev), Total Return (perp value incl. funding, overlay).
  Hourly Coinalyze series resample to chart TF (stepTo/sumTo w/ smear).
  czKind promise-cache 120s; liveTick refreshes all indicators (cache makes
  it network-free); loadSeq token drops stale async results on sym/tf switch
  (cross-symbol misalign crashed draw before — guarded + per-series try).
- **Toggle Heatmap = MODELED LIQUIDATION MAP (vchart.js v1.2.2)** — the
  live book recorder was built first, but the owner showed Velo's
  before/after: their map covers the WHOLE candle history the instant it's
  toggled, which no free historical depth feed can serve. Rebuilt the way
  the well-known liq maps work: every bar seeds estimated long/short liq
  prices (leverage tiers 10/25/50/100x, maintenance buffer 0.4%, weights
  .18/.30/.32/.20) at bar close, weighted by the bar's $ volume; each level
  glows until a later bar trades through it (runs per price bin, split only
  when intensity moves >35% so the rect count stays low). Instant on
  toggle, all TFs, updates live, cached per (sym,tf,bars). Look tuned to
  the reference over 3 iterations: 430 bins across the loaded range, log
  intensity normalized BETWEEN observed min/max (absolute logs cluster and
  wash out), noise floor 0.3, gamma 0.72 lift, alpha (0.05+rel·0.9)×slider,
  indigo→violet→magenta→straw ramp. The old book recorder is DELETED
  (viceHub.vheat.* localStorage keys are now orphans — harmless).
  Rendered as ECharts custom series UNDER candles;
  **MUST keep `encode:{x:[0,1],y:[2,3]}`** (without it dim1 pollutes the y
  axis → axis to 0) and bins are clipped to the VISIBLE candle range
  (viewIdx tracked from datazoom, redraw 140ms after gesture) or far-tier
  levels stretch the axis flat.
- **Screener rebuilt 1:1 Velo** (same vScreener widget id): Favorites-only +
  News checkboxes, Auto (refresh cadence), All Exchanges (BIN/BYB/OKX/CB/
  KR/KuCoin/Bitget/HTX — TV scanner has NO Hyperliquid), Watchlist filter,
  All|Crypto|TradFi segmented, search, ★ favorites (localStorage
  viceHub.scrFavs), TV coin logos, sortable Price/24h/Volume. Data: TV
  `coin/scan` (composite, text/plain trick) / `crypto/scan` filtered by
  exchange (pair `24h_vol|5` = USD turnover; raw `volume` is base units —
  don't multiply), TRADFI_BOOK quotes w/ logoids, News mode = vice-news
  feed. Row click → linkSymbol.
- **CSS gotchas**: `.vpanel-body .vw-scroll` (0-2-0) beats new single-class
  rules — scope overrides (`.vscr2 .vscr2-scroll`); chart page hides
  `.vpanel-head` via `.vp-chartpro` (engine has its own toolbar).
- **vice-dev launch config is now autoPort** (dev server reads PORT env,
  launch.json runtimeArgs dropped the hardcoded 5323) — parallel sessions
  stop fighting over the port. KEEP api/vice-coinalyze.js + dev server in
  LOCKSTEP (volh added to both tonight).

**UX AUDIT ROUND (same night, after the heatmap rebuild)** — 6-agent
multi-lens audit (85 findings) + hands-on stress test, fixes implemented.
Final versions: **vchart.js 1.4.0 / hub.js 2.10.0 / hub.css 1.19.1 /
vice.css +tokens / demo.js 1.2.1**. What changed:
- **`--mono` was NEVER DEFINED** — every `font: … var(--mono)` shorthand in
  the vcp/vscr2 chrome was invalid and fell back to 15px body scale. Token
  added to vice.css :root (+ `--red`/`--red2`; all hardcoded #ff6473/#ff8b96
  in hub.css replaced). THE reason the toolbar didn't feel terminal-dense.
- **Snappiness**: draw() now computes a structure fingerprint — unchanged
  structure = setOption MERGE (crosshair/hover/zoom survive live ticks; the
  5s full-notMerge rebuild was the flicker), structural changes = notMerge
  with the zoom window ALWAYS pinned from viewIdx. datazoom reads the event
  payload (getOption deep-cloned the world per wheel event). Heatmap
  progressive:0 (chunked paint popped in). Resize→scheduleDraw.
- **Races fixed**: reload() + liveTick() now both hold a loadSeq token
  across their awaits (rapid TF/symbol switches could interleave: 1h bars
  under a 5m header, BTC candle spliced into an ETH series). Per-indicator
  _seq guards settings flips. czKind failures back off 60s (was a 5s retry
  storm); spot legs (CB/KR) got a 60s promise cache (refired every tick).
  First-load failure now retries via liveTick instead of dying. Unknown
  symbol reverts the toolbar to the last good sym.
- **Trader features**: indicators are MULTI-INSTANCE (per-uid — EMA 20 +
  EMA 200 finally possible; menu badge shows counts, click always adds,
  legend × removes; loadSetup migrates + validates old entries). Chart page
  fills the viewport (calc(100dvh−122px) — was a fixed 660px strip). Legend
  title carries "· UTC". Typing a letter over the chart opens symbol search
  prefilled (TV muscle memory). Sub-panes capped at 8 with price pane
  reserved first (was negative-height at 6+ subs). Search is
  case-insensitive vs HL's kPEPE-style listings w/ loading/failed states.
  CVD no longer fabricates a flat zero lead-in. Fullscreen checks element
  identity, flips its icon, hides on iOS.
- **Nav/IA**: section pages hide dashboard-only controls (layout select,
  Edit, Add) AND the ⋮ menu's layout-management entries (suite links stay).
  linkSymbol on the chart page re-points the mounted engine IN PLACE (was a
  full teardown). Palette Edit/Add actions route to the dashboard first;
  'e' hotkey is dashboard-only; enterFocus exits sections first. Hub
  wordmark links to #/. Footers standardized on all 4 pages (Hub added,
  'liqtheory.com' relabeled 'Academy').
- **Polish**: focus-visible teal rings across chart toolbar + screener,
  radius scale normalized to var(--radius)/var(--radius-lg) (5px/8px drift
  gone), legend buttons reveal via opacity (no width jump), veils fade
  (veilIn) with the card doing the motion, toast keyframe keeps its
  translateX centering, ⋮ menu scales from its corner, countdown bar
  animates scaleX not width, edit-grid guides track the dynamic cell height
  (--hub-cell), screener star got a real hit area + touch visibility,
  hover transforms gated to (hover:hover), container queries adapt the
  vcp bar/menu + vscr2 columns inside narrow widgets (page media queries
  lied there), 16px inputs at coarse pointers (iOS zoom), safe-area insets
  consumed, demo.js/demo panel joined the suite palette (#0d0b18).
- **NOT done (roadmap)**: /pricebots→/tickers slug rename (owner call: URL
  change + 301s), absolute→relative internal links, bar-close countdown on
  the price axis, per-widget vchart setups (two pinned Pro charts still
  share viceHub.vchartPro + clobber each other's prefs), screener/vFunding
  per-tick innerHTML rebuilds, gridstack touch resize handle.

**NAV/DENSITY ROUND (owner: "still clunky and too big")** — final batch is
now **hub.js 2.10.4 / hub.css 1.21.1 / vice.css 2.7.0**:
- Hub bar 51px → 35px: buttons/select/nav DEBOXED (quiet text, hover
  reveals surface; only Edit-active/primary keep fills), brand 18px,
  11.5px controls. Chart toolbar matches (deboxed, 36px); chart height
  calc(100dvh−104px). Site header (.top) tightened to match.
- **TICKER TAPE was broken** (owner screenshot: prices clipped, header
  half the widget): the tape widget was h:2 = 60px total (27px header +
  19px body) vs TV's 72px band. Fix: displayMode 'regular' (one-line
  marquee, prices inline), manifest h/minH 3, PRESETS rewritten (all 3
  tapes h:3, every row below shifted +1) and a load() migration that
  grows stored tapes AND shifts the rows below — growing h alone made
  gridstack exile the tape to the board's bottom (learned the hard way).
- Screener controls compacted to app scale (10.5px chks/selects/tabs,
  custom-chevron selects, 5px paddings) — they rendered ~1.5× the rest
  of the site.
- GOTCHA for anyone probing: pages are cached without headers by the
  python dev server — a stale index.html serves OLD ?v= asset URLs; hard
  refresh (Cmd+Shift+R) before judging whether a change landed.

**LATE-NIGHT OWNER ROUNDS** (final: vchart.js 1.6.1 / hub.js 2.10.6 /
hub.css 1.25.0 / vice.css 2.7.1):
- Indicator menu: re-click TOGGLES OFF (owner rule; removes every instance
  of that id); hovering an active row reveals a small "+" to add a second
  instance (EMA 20 + EMA 200 path). Legend rows carry a settings TAG
  ("EMA 50", "BIN · 8h", "$"/"%", "30 bars") that live-updates — TAGS map
  in vchart.js.
- FULL TIMEFRAME SYSTEM: parseTf() accepts any Nm/Nh/Nd/Nw + 1mo; menu
  groups MINUTES/HOURS/DAYS + CUSTOM input; starrable favorites
  (setup.tfFavs) render as toolbar chips, current-but-unstarred tf shows
  as an extra chip. Non-native intervals (10m, 6h, 45m…) aggregate
  client-side via aggBars() from the largest dividing HL base interval;
  Coinbase/Kraken spot legs re-bucket to the tf too (cbGranFor/krIntFor).
  barsFor(ms) sizes the window; czDays/fundDays now threshold on ms.
- RACE FIX (bug seen live): liveTick interleaving a TF-switch reload
  merged new-TF candles into the old bars array (chimera chart showing
  month-old data). liveTick now skips while root.loading and drops its
  result unless `bars` is the SAME ARRAY it started with (identity guard)
  — the seq token alone did not cover the swap.
- vChart widget removed from the DeFi preset (owner: redundant vs Pro) —
  slot now vLiqs; stored boards migrate ONLY the preset-born instance
  (command still 'eth 1h ema20 ema55'). vChart stays in the tray (only
  widget that charts gt: DEX tokens / ratios / best-worst).
- Ticker tape: CHROMELESS (hw-chromeless — no header in view mode, header
  returns in edit mode), displayMode 'regular' single-line band, h:2,
  presets/migrations reverted-and-rebalanced. GOTCHA: growing a stored
  instance's h without shifting the rows below makes gridstack exile it
  to the board bottom.
- Chart page gutters: .hub-sec clamp(8px,2.5vw,56px) + max-width 1760px
  centered; hub bar rebalanced to ~41px after the 35px round was "way too
  small"; screener controls compacted to 10.5px scale.

**DRAWING TOOLS + TF-CHIP + STOCK FOCUS ROUND** (final: vchart.js 1.7.0 /
hub.js 2.10.7 / hub.css 1.26.0):
- **DRAWING SUITE** (owner sent TV's rail): left rail on the chart —
  cursor / trend line / horizontal line / vertical line / ruler (Δ$ Δ%
  bars label) / text / brush, then magnet (OHLC snap, on by default),
  hide, lock, clear-all. Overlay <canvas class="vcp-draw"> over the stage;
  objects anchored in (timestamp, price) — survive pan/zoom/TF/reload —
  persisted per symbol at localStorage `viceHub.vchartDraw.<SYM>`.
  Select in cursor mode (zr mousedown hit-test), drag endpoints or whole
  object, Del removes, Esc cancels. paintDrawings() runs after draw(),
  on datazoom, on resize; coords via convertToPixel/FromPixel with
  fractional category index (t ↔ idx via bars[0].t + i·tfMs). The canvas
  spans the stage; chart coords shift by rail width (cvPos/translate).
  Rail hidden in <560px containers.
- **Single TF chip** (owner): toolbar shows ONLY the current interval;
  clicking it opens the menu (full words: "5 minutes", "1 hour"…) with a
  FAVORITES group pinned on top (stars still work) + custom input.
- **Focus searches real stocks**: live TV scanner america/scan
  name,description match (debounced 220ms, market-cap ranked, TV logos),
  "$NVDA"/"nvidia" resolve; curated TRADFI_BOOK still answers instantly;
  leading $ stripped.
- Hub wordmark de-blued (owner: "remove the blue") — neutral text, hover
  = surface only.

**GITHUB PREP (owner request)**: workspace repo slimmed 21,357 → ~1,146
tracked files. MOVED to ~/.openclaw/workspace-archive/: every Backup-*,
audit_frames, discord-banners, notes/ (third-party Dalton transcripts —
must never go public), course*-notes.md, superseded handoffs (07-02/03/04,
BUILD-PLAN, CHART/UI audit handoffs, OPENCLAW-HANDOFF), the junk `~` dir.
UNTRACKED-but-kept-on-disk (OpenClaw runtime — gitignored): SOUL/IDENTITY/
USER/MEMORY/PRODUCT/TOOLS/AGENTS/HEARTBEAT .md, memory/, .agents/.claude/
.codex/.clawhub/.openclaw, openclaw-workspace-state.json, .anthropic_key.
Secret scan over tracked content: clean. Site verified serving after moves.
~/DiscordBots: git init'd w/ .gitignore FIRST (.env tokens + */data/ +
node_modules excluded; .env.example templates tracked), 28 files staged,
backups + config.js.bak → ~/DiscordBots-archive/. BOTH repos are STAGED,
NOT committed — owner commits/pushes. Bots verified still running.

**DEPLOY (owner)**: unchanged — add COINALYZE_API_KEY env → `vercel --prod`.
Post-deploy adds: /hub serves hub.js 2.9.2 + vchart.js 1.1.1 (cache-bust!),
#/chart shows OUR chart (candles + toolbar, no TV iframe), indicators fill
(agg funding/OI/liqs need the env key), Toggle Heatmap starts recording,
screener fills w/ TV logos + exchange filter works,
`/api/vice-coinalyze?kind=volh&sym=BTC&days=2` returns venues.

**STILL OPEN**: owner deploy + env key · rotate BTC bot token + Coinalyze key
someday · www→apex flip · chart-bot phase-3 (mc view, daily/weekly movers,
OI, categories, baskets, Polymarket, gt: alerts — APIs verified working this
session: CG markets w/ 7d% + market_chart + categories, Polymarket
gamma public-search + clob prices-history, GT pool price, HL openInterest;
backup at DiscordBots/Backup-2026-07-22_phase3/, nothing built yet) ·
optional page restores from ~/Desktop/veloclone. NOTE: ticker app icons are
DONE — owner already uploaded coin logos for all 7 apps (verified via API).
Backups: workspace Backup-2026-07-22_vchartpro/ (hub.js/hub.css/index/
coinalyze/dev-server pre-overhaul).

---

## 0-FINAL. END OF 2026-07-22 (historical — superseded by 0-FINAL-NIGHT)

**PROD** runs the v1.14.0 batch (deployed midday). Everything below is LOCAL,
verified, waiting on one deploy.

**LOCAL END-STATE — hub.js v2.7.0 / hub.css v1.15.0 (+ vice.css 2.6.0):**
- /hub = **Dashboard + Chart only** (2-tab nav; dead hashes → Dashboard).
  The multi-page Velo clone was built, then owner clarified he only wanted
  the two pages — the FULL clone (v2.6.0, all 7 pages) is snapshotted at
  **~/Desktop/veloclone/** with a restore README. Do not rebuild pages
  unless asked; restore from the snapshot instead.
- The **widget registry keeps every analytics widget** built tonight, all
  tray-addable + pinnable: venue vol/OI snapshots, Funding Rate (APR),
  OI history, Price, CVD, Liquidations, 3M Basis, Volume, seasonality ×2,
  session returns, DVOL/IV-term/top-options/ATM-IV/25d-skew/spot-vol/
  IV-slope, Funding APR heatmap, sectors, OI-normalized CVD, market
  vol/OI, cross-asset screener, funding matrix (BIN/OKX/BYB/HL/DER).
- Critical fixes riding this batch: **layout-corruption fix** (hidden-tab
  load collapsed gridstack cols and persisted garbage — prod still bites
  until deploy; users can menu→Reset), window-fit cellHeight, segmented
  nav redesign, TV-embed fill in section panels, HYPE→COINBASE:HYPEUSD
  everywhere (+ store migration + Market Overview lead:indices migration).
- **API functions in the batch**: vice-coinalyze (multi-venue liqs/oi/
  funding/cvd/vol + snap + whole-market kinds; credit-aware), vice-okx
  (rubik+liq proxy), vice-deribit (chart-data incl. OPTION instruments),
  vice-movers (adds fdv + c7d). vice-fng stays deleted.
- **Ticker bot**: HYPE feed switched to COINBASE:HYPEUSD, restarted,
  verified. Both bots healthy under launchd.

**DEPLOY (owner)**: add Vercel env **COINALYZE_API_KEY** (free key, also at
~/.openclaw/vice-dev.env) → `vercel --prod`. Post-deploy: /hub serves
v2.7.0 (cache-bust when probing!), nav = Dashboard|Chart, layout survives
background-tab load, /api/vice-coinalyze?kind=oisnap&sym=BTC returns
venues [BIN,BYB,OKX,DER,HL], tray widgets fill (liqs/OI/CVD panels).

**DEV HARNESS**: launch config "vice-dev" (port 5323) runs
tools/vice-dev-server.py — statics + real /api/vice-* locally (reads the
key file; forwards deployed fns to prod). KEEP IT IN LOCKSTEP with the
api/*.js functions. Coinalyze free tier is **SYMBOL-WEIGHTED: every coin
in a batched request counts toward 40/min** — the dev server has a
credit-weighted queue + caches; don't hammer it with curls.

**STILL OPEN**: owner deploy + env key · coin-logo Discord icons for the
6 newer ticker apps · rotate BTC bot token + Coinalyze key someday ·
www→apex flip · chart-bot phase-3 remainder (see §3) · optional page
restores from ~/Desktop/veloclone.

---

## 0-NEW. SECOND 2026-07-22 SESSION (historical — superseded by 0-FINAL)

**Owner deployed the v1.14.0 batch mid-day.** Post-deploy checklist ran clean:
/hub live, vice-news/headlines/movers all answering, vice-fng 404 as intended,
**crypto screener FILLS on the real domain** (localhost ghosting was referrer
gating). Stock screener ghosts even standalone on tradingview-widget.com —
TV-side, not our config. Watch for STALE EDGE CACHE on first probes after a
deploy: re-curl with a cache-buster before diagnosing.

Built this session (hub.js **v2.0.0** / hub.css **v1.12.0** + new
`api/vice-okx.js` — verified locally, **NOT deployed**):
- **CRITICAL FIX — layout corruption**: loading /hub in a hidden/narrow window
  collapsed gridstack to 2/6 cols; re-expanding to 24 was lossy (widths ×2,
  rows cascade into a broken stack) and got PERSISTED because the change event
  fires with getColumn() already 24. boot() now tracks lastCol and re-applies
  store geometry on any return to 24 cols (store insts are never clamped =
  authoritative), plus a resize backstop. **Prod v1.14.0 still corrupts until
  the next deploy** — users who hit it: menu → Reset to default.
- **fitCells()**: cellHeight now tracks grid width (owner: "scale to the
  window") — gridW/24×0.68, clamped 30–52.
- **HYPE = COINBASE:HYPEUSD** everywhere (CRYPTO:HYPEUSD has no scanner data —
  dead tape slot). Ticker bot config updated + restarted + verified live.
  load() migration patches saved tapes and sets Market Overview lead:'indices'
  on migrated TradFi/Macro layouts (owner-reported "still shows crypto" bug).
- **VELO CLONE phase 1** (owner: replicate velo.xyz pages 1:1 with our UI;
  Dashboard untouched; pinnable panels): hash-routed pages on /hub —
  `#/chart` (TV chart + cross-asset screener), `#/news`, `#/futures/SYM`
  (venue vol/OI snapshots, funding APR history, OI history, price, taker CVD,
  daily volume, annualized basis, seasonality hour/day, session returns,
  liquidity map — asset chips BTC/ETH/SOL/HYPE/XRP/ZEC), `#/options` (Deribit:
  DVOL candles, IV term structure, top-volume options, OI by strike/expiry,
  BTC/ETH), `#/market` (return buckets, price/OI change leaders, funding
  matrix, heatmap), `#/tradfi` (dated-futures OI/volume/basis/funding + TradFi
  quote board + stock heatmap). Every panel has a **pin** button →
  pinInstance() appends {type, settings} to the active dashboard layout.
  All new panels are real registry widgets (also in the Add tray).
- **Data facts learned**: OKX rubik endpoints have NO CORS → `api/vice-okx.js`
  proxy (strict allowlist; OI-history + taker-CVD panels only fill via proxy =
  on prod); rubik caps ~100 points; Bybit geo-blocks US like Binance; Deribit
  is fully CORS-open; **CME blocks unlicensed access (ToS — do NOT scrape)**,
  so the TradFi page runs the same chart types on dated crypto futures until
  the owner licenses CME data or buys a Velo API key; aggregated liquidations
  have no free REST source (panel omitted, told owner); ATM-IV/skew HISTORY
  panels need snapshot storage we don't have yet.
- **NAV OVERHAUL (owner: "jumbled mess") — hub.css v1.13.0**: the section nav
  is one segmented control (text-only tabs, active = filled; icons hidden —
  words read as places, seven icons read as noise); Focus + palette are
  icon-only chips (labels in tooltips; Focus speaks only when focused:
  "SOL · exit"); ⌘K kbd hint hidden; below 800px the nav takes its own
  full-width scrollable row. Subtle 220ms page glide-in (reduced-motion safe).
- **TV CHART FILL BUG**: the tv-wrap density trick was scoped `.hw-body >`
  (dashboard only) — TV iframes inside section panels collapsed to their min
  height. Now also scoped `.vpanel-body >` + `.vpanel:fullscreen` unscale.
  GOTCHA for future containers: any new widget host needs the .tv-wrap sizing
  rules extended to it.
- **CLASS COLLISION GOTCHA**: #hub-section briefly wore class `hub-page` —
  which is the BODY's frame class; its padding leaked page-wide. Renamed to
  `.hub-sec`. Check for body-level class names before minting container ones.
- **FULL PANEL PARITY (hub.js v2.1.0 / hub.css v1.14.0)**: Futures = the
  reference page's exact 12 panels in its 4-col order (cols4 grid ≥1500px):
  vol/OI venue snapshots, funding APR, OI stacked, price area (vPrice),
  taker CVD, liquidations (vLiqs — OKX public liquidation-orders, the one
  venue with a public liq feed; recent window only), 3M annualized basis
  (OKX + Deribit dated futures), daily volume, seasonality ×2, session
  returns; plus a MARKETCAP/FDV stats strip (movers proxy now carries fdv).
  DERIBIT is a 5th venue (DER, gold #e7b53a): snapshots (inverse perp OI/vol
  are USD-native), funding APR (get_funding_rate_history), basis line.
  Options page adds vSpotVol (rolling 2d correlation: HL hourly returns vs
  DVOL moves — Deribit's get_tradingview_chart_data is their ONE CORS-closed
  public endpoint, hence api/vice-deribit.js proxy for the basis candle legs;
  price legs use HL instead). vTopOpts is vertical C/P-colored bars.
  STILL NOT 1:1 (data-blocked, told owner): ATM-IV/skew/term-slope HISTORY
  panels need IV snapshot storage; CVD is a taker buy/sell-volume
  approximation, not tick-level.
- **MULTI-VENUE LIQS + OI (hub.js v2.2.0 + api/vice-coinalyze.js)**: owner
  wants BIN/BYB/HL/OKX on liquidations + OI history. Those venues have no
  public liq REST and geo-block US browsers AND AWS egress — the only honest
  path is the Coinalyze aggregator (free API key). Built end-to-end:
  api/vice-coinalyze.js (kinds liqs|oi, resolves per-venue perp symbols from
  /future-markets, cached 6h per instance; filters to Binance/Bybit/OKX/
  Hyperliquid-if-listed; normalizes to {venues:[{venue,points}]}) reading env
  **COINALYZE_API_KEY**; vLiqs renders per-venue stacks (shorts up, longs
  down at 0.62 opacity, venue hues) and vOIHist consumes the same feed.
  Without the key the function answers {noKey:true} and both panels fall
  back to today's behavior (OKX public feeds). **OWNER ACTION: free signup
  at coinalyze.net → API key → add COINALYZE_API_KEY in the Vercel project
  env → redeploy.**
- **COINALYZE VALIDATED WITH THE OWNER'S KEY (2026-07-22 eve)**: exchange
  codes Binance=A Bybit=6 OKX=3 Hyperliquid=H Deribit=2; BTC perp symbols
  BTCUSDT_PERP.A / BTCUSDT.6 / BTCUSDT_PERP.3 / BTC.H; OI history covers
  ALL FOUR incl. Hyperliquid; liquidation history covers BIN/BYB/OKX (no HL
  liq rows — Coinalyze doesn't track HL liqs). Shapes exactly as the proxy
  assumed ({t seconds, l, s} / OHLC close, convert_to_usd works). The key
  lives in **~/.openclaw/vice-dev.env** (OUTSIDE the deploy tree, chmod 600)
  — it still needs adding to Vercel env as COINALYZE_API_KEY (prompt given
  to owner). Key passed through chat — regenerate someday.
- **LOCAL DEV SERVER — tools/vice-dev-server.py (launch config "vice-dev",
  port 5323)**: workspace statics + WORKING /api/vice-* locally: implements
  coinalyze/okx/deribit (mirrors the Vercel fns, reads the env file above),
  forwards every other /api/vice-* to prod vicesuite.com. This is now THE
  preview for hub work — every futures/options panel lights up with real
  data (multi-venue liqs verified incl. the same $15M spike the reference
  chart shows; dual-venue basis DER+OKX both ~4%). /_vercel/* answered 204
  to hush analytics 404s. Owner can watch at
  http://localhost:5323/vice/hub/index.html while sessions edit.
- **FIVE-VENUE FUTURES SPEC (owner-directed, hub.js v2.3.0)**: panels 1/2/3/
  4/6/9 (24h Volume, OI Snapshot, Funding Rate (APR), Open Interest, CVD
  Dollars, Volume) now serve Binance+Bybit+OKX+Deribit+Hyperliquid to every
  visitor via an expanded vice-coinalyze proxy (kinds: liqs, oi, funding,
  cvd, vol, volsnap, oisnap; Deribit added to WANTED); direct venue APIs
  remain the keyless fallback. Panel titles renamed to the owner's exact
  list; vVenueBars split into vVol24h+vOiSnap and vSeasonality into
  vRetHour+vRetDay (factories venueSnapWidget/seasonalityWidget — type
  renames safe, v2.x never deployed). CALIBRATION FACTS baked into both
  proxies: Coinalyze funding values = venue rate ×100 (percent per period;
  HL hourly ×8760, others ×1095 → APR); ohlcv v/bv are BASE-coin units
  unless oi_lq_vol_denominated_in=QUOTE_ASSET (Deribit) → ×close for USD;
  convert_to_usd only affects OI/liq endpoints. LIQUIDATIONS CEILING:
  Coinalyze has NO Deribit or Hyperliquid liq rows — panel 7 is BIN/BYB/OKX
  (venue-side reality, told owner). Free tier = 40 req/min → dev server got
  a 150s TTL cache with stale-serve-on-429 (prod is behind Vercel's edge
  cache); a 429 storm looks like empty panels — check the dev-server log.
  KEEP tools/vice-dev-server.py IN LOCKSTEP with api/vice-coinalyze.js.
- **1:1 NUMBERS PASS (hub.js v2.4.0)**: the reference aggregates WHOLE
  venues, so vice-coinalyze now SUMS each venue's USD/USDT/USDC perp markets
  per timestamp for oi/vol/volsnap/oisnap/cvd/liqs (funding stays on the
  venue's USDT lead market — it's a rate, not a quantity). Verified vs the
  reference: OI snapshot BIN $7.77B / BYB $4.0B, 24h vol BIN ~$10B, OI stack
  ~$18-21B — magnitudes now track theirs. vBasis gained the missing THIRD
  line: Binance's own /futures/data/basis feed (CURRENT_QUARTER, expiry =
  computed last-Friday-of-quarter 08:00 UTC; geo-blocked US visitors see
  OKX+DER, everyone else all three). Dev server got a one-shot 429 retry in
  cz(); a fresh dev-server restart can still drop 1-2 kinds on the very
  first render (cold cache burst) — panels self-heal on their next poll,
  reloads after ~1min are clean. Prod rides the shared edge cache and
  won't show this.
- **OPTIONS PAGE 1:1 (hub.js v2.5.0 / hub.css v1.15.0)**: layout = large
  DVOL hero on the left (grid-row span 3, ≥1350px; stacks below that) + six
  panels 2×3 right: IV Term Structure, 24h Top Volume Options, ATM Implied
  Volatility (1w/1m/3m/6m), 25 Delta Skew (1w/1m/3m/6m), Spot-Vol
  Correlation, IV Term Structure Slope (1m−6m). BTC/ETH only, per the
  reference. THE HISTORY PANELS NEED NO SNAPSHOT STORAGE after all:
  Deribit serves per-instrument PRICE history (get_tradingview_chart_data,
  via the vice-deribit proxy — regex now allows option names
  CUR-DDMMMYY-STRIKE-C/P) and mark prices are BS-consistent, so hub.js
  inverts Black-Scholes (bisection, price×spot vs strike/T) against the
  perp spot series to recover IV histories. Helpers: normCdf/bsPrice/
  impliedVol, deribitTenors() (nearest listed expiry per 1w/1m/3m/6m),
  strike25d() (±0.25-delta strike from ATM vol), ivSeries(). TENOR_C
  palette shared across panels. vOiStrike/vOiExpiry removed from the PAGE
  (still in registry/tray/pinnable). METHOD FOOTNOTE: we track the nearest
  LISTED expiry per tenor (the reference interpolates constant maturity),
  so slope extremes can read slightly deeper — same shape/regime, verified
  side-by-side (ATM IV band 27-45% w/ 6m on top, skew's Jul-17 1w spike,
  spot-vol −0.5→0, slope ~−6%). GOTCHA: dev-server restarts are needed
  after editing tools/vice-dev-server.py (a stale process rejected option
  instruments with 400 until restarted).
- **OWNER PIVOT (late 2026-07-22, hub.js v2.7.0)**: the Velo-page direction
  was a misunderstanding. FULL SNAPSHOT of the complete clone (hub.js v2.6.0
  with News/Futures/Options/Market/TradFi pages + all ten market panels)
  lives at **~/Desktop/veloclone/** (vice/ + api/ + dev server + routing +
  README with restore notes). The live hub now keeps ONLY Dashboard + Chart:
  SECTION_META reduced to chart, nav stripped to two tabs, futures palette
  action + linkSymbol futures branches removed, PAGE_STATE gone. Dead hashes
  (#/futures etc) fall back to the Dashboard. EVERYTHING ELSE SURVIVES: the
  full widget registry (all Velo-parity analytics widgets — venue snapshots,
  funding APR, OI history, CVD, liquidations, basis, seasonality, sessions,
  DVOL/IV suite, APR heatmap, sectors, OI-CVD, market volume/OI, screener)
  stays in the Add tray and pinnable to dashboards, and all four API
  functions (vice-coinalyze/okx/deribit/movers) stay in the deploy batch —
  the widgets need them. Market-page work (task ledger) ended mid-verify:
  7/10 panels confirmed live; the 3 aggregator-heavy ones were fighting the
  free tier's SYMBOL-WEIGHTED 40-credit/min limit (each batched symbol = 1
  call — the last discovery of the night; primary-market baskets + credit-
  weighted dev bucket + 900s edge cache were the fix, all in the snapshot
  AND in the live api/vice-coinalyze.js).
- Rollback copies of deployed v1.14.0 assets: `Backup-2026-07-22_hub-colfix/`.

Post-deploy checks for THIS batch: /hub loads at v2.0.0 (cache-bust!), layout
survives loading in a background tab then focusing (the corruption fix),
`/api/vice-okx?kind=oi&instId=BTC-USDT-SWAP` returns data, futures page OI +
CVD panels fill, options page fills, HYPEUSD live in the tape, TradFi layout's
Market Overview leads with Indices.

Velo-parity still open: per-panel CSV/PNG export buttons, chart-page drawing
tools (we embed TV's widget, not their licensed charting library), VeloNews-
style tagged feed, options IV/skew history, liquidations, CME data decision.

---

## 0. PREVIOUS STATE (first 2026-07-22 session — deployed)

Shipped today, ALL verified locally, NOTHING deployed (owner runs `vercel --prod`):
- Bots: launchd persistence (com.vicesuite.*), DEX charts in the vc bot (gt:/addresses
  via GeckoTerminal), example images regenerated + WebP'd.
- **Vice Hub** (/hub): the big one — see section 2's Vice Hub blocks for every detail.
  Final versions: `hub.js v1.14.0`, `hub.css v1.11.2`, `demo.js v1.2.0` (exports
  ViceChartEngine; loaded on /chartbot AND /hub), `vice.css v2.6.0`.
  Widgets removed on owner's orders: TV Technical Analysis (tvTA), Fear & Greed
  (vFng — `api/vice-fng.js` deleted too). Saved layouts referencing them skip
  gracefully; DeFi preset gives F&G's column to Top Movers (19,2,5,14).
- API functions: vice-stats, vice-movers (now with `img` icon URLs), vice-news,
  vice-headlines (NEW). vice-fng.js DELETED.
- Landing: cards grid reworked (compact Tickers+Charts stack · Hub · Academy).
- Tickers page: dmock shows all 7 fleet members live.

Post-deploy verification list (first session after the owner deploys):
vicesuite.com/hub loads + layouts persist · /api/vice-news returns items ·
/api/vice-headlines?symbol=CRYPTO:SOLUSD returns a count · TV screener widgets
fill on the real domain (they ghost on localhost — suspected referrer gating) ·
from a non-US connection the funding table's BIN/BYB columns populate.

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
  (A frosted-translucent "Vice Heatmap" was built and REVERTED — owner disliked
  the washed-out tiles.)
- **vHeat REBUILT SOLID + tvTA REMOVED (owner-directed, hub.js v1.11.0)**: TV's
  crypto-heatmap embed CANNOT cap the universe (tested: unknown dataSource values
  silently fall back), so "top 100" = native vHeat treemap with SOLID saturated
  TV-style tiles (dim tone at 0% → full color by ±6%, NO translucency this time),
  top 50/100/150 setting (default 100), stable/wrapped filter, click-to-link,
  CoinGecko via /api/vice-movers, in the DeFi preset heatmap slot (tvCryptoHeat
  still in the tray). TradingView Technical Analysis (tvTA) is DELETED from the
  registry — DeFi preset gives its slot to a 12-wide Vice Chart; Focus board
  widened Symbol Info; saved layouts with tvTA skip it gracefully.

- **ICONS + VENUE FUNDING + NEWS-AWARE FOCUS (owner-directed, hub.js v1.12.0 /
  hub.css v1.10.0)**: (1) coin artwork left of every ticker row (watchlist,
  movers, funding, alerts) — CoinGecko image URLs now ride the movers proxy
  (`img` field, shared fetchMarkets() + coinIcons registry, letter-circle
  fallback). (2) Funding & OI is a PER-VENUE 8h table: HL (hourly×8, live) ·
  OKX (per-symbol, CORS works everywhere incl US) · BIN · BYB (bulk endpoints,
  geo-blocked for US visitors → "—" columns there, populate abroad); columns
  drop via container queries as the block narrows. (3) NEW api/vice-headlines.js
  proxies TV's news-headlines endpoint (no CORS upstream) → Focus checks story
  count and OMITS the Top Stories block when a ticker has no news (mini chart
  widens to 16); locally/proxy-down it defaults to showing news. Verified with
  a mocked count:0 → newsless SOL board.

- **FOCUS SEARCH v2 + TAPE PURITY (owner-directed, hub.js v1.13.0 / hub.css
  v1.11.0)**: Focus search is dual-universe — DeFi section (live HL universe,
  coin artwork, name search via coinNames registry: "solana"→SOL) + TradFi
  section (curated TRADFI_BOOK: indices/ETFs/mega-caps/metals/FX/yields with
  embed-safe TV symbols, "apple"→AAPL) + as-typed fallback; the ACTIVE layout's
  universe lists first; TradFi picks pass a display label so the chip reads
  "AAPL · exit" not "SPXUSD". DeFi preset tape is now CRYPTO-ONLY (BTC ETH SOL
  XRP BNB DOGE ADA HYPE ZEC — indices/DXY/gold removed; TradFi tape was already
  pure; Macro stays cross-asset by design). GOTCHA: a bad splice duplicated the
  navPrice+focus region (end-marker sat BEFORE start) — repaired; when splicing
  hub.js verify marker ORDER first.

- **CANDLE CLOSE CLOCK (owner-directed, hub.js v1.13.2 / hub.css v1.11.2)**:
  the countdown widget now leads with a clock — large UTC time + small
  "HH:MM:SS <TZ> · your time" (Intl short zone name), hairline divider, then
  the 1H/4H/1D/1W countdown rows. Also fixed in passing: `.hub-empty[hidden]`
  needed an explicit display:none (class display:flex beat the hidden
  attribute — SAME trap as the old .hero-stat bug; watch for it on any
  flex/grid element that uses the hidden attribute).

### LT app touchpoint (only one)
`lt-community.js` v2.1.0: "The Vice Suite" row (flamingo, pink hue) → vicesuite.com.
Nothing else in the app/course content was touched.

---

## 3. Roadmap / open items

1. **OWNER: deploy** the batch (everything in section 0) — then run the post-deploy
   verification list. Also still pending owner-side: upload coin-logo app icons for
   the ETH/SOL/SPX/HYPE/ZEC/XRP ticker apps in the Discord dev portal.
2. Hub ideas queued (discussed + owner-seen, not yet requested-built): kiosk mode
   (fullscreen + Screen Wake Lock + auto-rotating layouts), layout sharing via URL
   hash (no backend needed), Document-PiP pop-out widget, watchlist sparklines /
   drag-reorder / multiple named lists, watchlist-filtered news, deeper hub↔Discord
   alert bridge.
3. Chart-bot phase 3 remainder: onchain alerts (GT rate limit needs a slower poll
   lane), mc view, daily/weekly movers, OI, categories, baskets, Polymarket, trade
   tape. Blocked w/o proprietary data: news system, liq heatmap/SL-TP, treasuries,
   stocks/TV symbols.
4. Bot hosting: launchd on the mini is DONE; VPS later (Hetzner+pm2 was the rec;
   Binance/Bybit unlock as bot venues from a non-US VPS).
5. Nice-to-have: rotate the BTC bot token (passed through chat long ago); flip
   Vercel primary domain www→apex (suggested, still pending).

Full running history: memory file `lt-discord-bots.md` in the assistant's memory dir.
