# Vicesuite — Site-Wide Audit Inventory (Phase 0)
Date: 2026-07-28 · Backup: `Backup-2026-07-28_pre-site-audit/` + `~/.openclaw/vice-backup-2026-07-28-pre-audit.tar.gz`
Dev server: `python3 tools/vice-dev-server.py` (running on :56445 this session, API proxies live).
Checks: `node --check` per JS file; no build/lint/test tooling exists (static site).
Browser: Claude browser pane against localhost.

Verdict key: ⬜ not yet exercised · ✅ verified good · 🔧 finding filed (see FINDINGS.md)

## 1. Routes / pages (vicesuite.com host)
| Route | File | Verdict |
|---|---|---|
| `/` landing | vice/index.html + vice.css + vice.js | 🔧 L1-L3 fixed |
| `/chartbot` | vice/charts/index.html + demo.js (in-page live demo) | ✅ (demo runs, gallery, commands) |
| `/pricebots` | vice/tickers/index.html + tickers-live.js | 🔧 T1 fixed |
| `/hub` | vice/hub/index.html + hub.css v1.28.0 + hub.js v2.12.0 + vchart.js + demo.js (engine) | 🔧 see H* |
| Hub `#/` Dashboard | gridstack canvas, 3 presets (DeFi/TradFi/Macro) + user layouts | 🔧 |
| Hub `#/chart` | vChartPro hero + vScreener | ✅ |
| Hub `#/scanner` (+`#/scanner/0x…` deep link) | HL leaderboard/tracked/inspector drawer | 🔧 |
| Hub `#/gallery` | Element Gallery storefront + preview drawer | ✅ |
| API | api/vice-{news,movers,stats,headlines,hlboard,coinalyze,okx,deribit}.js | ✅ code-read, proxied locally |

## 2. Hub modals / overlays (each needs a verdict)
- Add-widget tray (modal, search + recently-removed) — 🔧 H1 (unstyled search + gallery link)
- Settings modal (auto-generated per widget schema) — ✅
- Command palette ⌘K — ✅ (Enter works; B2 not reproducible)
- Focus search (F) — 🔧 H2 (unstyled group headers/sublabels)
- Focus mode board (ephemeral grid) — ✅ (+ H11 hash fix)
- Gallery preview drawer (glass) — ✅
- Scanner wallet inspector drawer — ✅
- ⋮ layout menu (new/dup/rename/export/import/reset/delete + suite links + backup hint) — ✅
- Toasts (with action button) — ✅
- Coach-mark (first visit) — ✅
- Empty state (hub-empty) — ✅
- In-page maximize (.hw-max fallback) + fullscreen — ✅

## 3. Widget catalog (50 types; every one needs a verdict)
TV embeds (12): tvChart ✅ · tvMini ✅ · tvTape ✅ · tvCryptoHeat ✅ · tvStockHeat ✅ · tvEtfHeat ✅ (gallery preview) · tvForexHeat ✅ (Macro preset) · tvOverview ✅ · tvCryptoScreener ✅ (gallery preview) · tvStockScreener ✅ (gallery preview) · tvCal ✅ · tvSymInfo ✅
Native core (12): news ✅ · vWatch ✅ · vMovers ✅ · vNotes ✅ · vClocks ✅ · vAlerts ✅ · vChartPro ✅ · vChart ✅ · vFunding ✅ · vCountdown ✅ · vLiqMap ✅ · vHeat ✅
Futures (13): vVol24h ✅ · vOiSnap ✅ · vFundingHist ✅ · vRetHour ✅ · vRetDay ✅ (gallery preview) · vRetBuckets ✅ · vOIHist ✅ · vVolHist ✅ · vCVD ✅ · vBasis ✅ · vPrice ✅ · vLiqs ✅ · vSessionRet ✅ · vChanges ✅
Options (9): vSpotVol ✅ · vAtmIv ✅ · vSkew ✅ · vIvSlope ✅ · vDvol ✅ · vIvTerm ✅ · vTopOpts ✅ · vOiStrike ✅ · vOiExpiry ✅
Markets/other (6): vFundHeat ✅ · vSectors ✅ · vOiCvd ✅ · vMktVol ✅ · vMktOI ✅ · vScreener ✅ · vPositioning ✅ · vFng ✅ · vSuite ✅

## 4. User flows
1. First visit `/` → read suite → click into each product page → hub. 🔧 stale copy (L1)
2. First hub visit → coach-mark → Customize → drag/resize/add → persists. ✅
3. Daily: open hub → glance dashboard → flip timeframes via face pills → click ticker → linked blocks re-point. ✅
4. Focus: F → search → focus board → pin block → exit. ✅
5. Scanner: leaderboard → star wallet → tracked view → alerts → inspector (deep link). ✅
6. Layout mgmt: new/duplicate/rename/export/import/reset/delete; corrupt-store recovery toast. ✅
7. Chart page: symbol search, TF, indicators, drawings, heatmap → pin to dashboard. ✅
8. Gallery: browse → preview → add to layout. ✅
9. Alerts: add (70k/+5%) → fires → notification/sound/history. ✅ (input parse toast verified)
10. Mobile (≤768px): bar collapses, 2-col grid, sections. ✅ (375px pass, H14 fixed)

## 5. Design vocabulary (as found, 2026-07-28)
- Palette (vice.css tokens): bg #08070f/#0d0b18/#14121f/#1d1a30 · borders #272235/#363049/#4b4566 · text #f6f5fb/#a8a3bb/#8b85a3 · accents teal #00d4d4, pink #ff2e88, gold #e7b53a, green #21d196, red #ff6473, purple #a855f7, blurple #5865F2. Chart-only hues: venue colors (#2dd4bf HL, #38bdf8 OKX, #f0b90b BIN, #b47aff BYB, #e7b53a DER), tenor colors, #5aa7f7 default line blue.
- Type: Geist Mono everywhere. Sizes in use: 8→22px, dominant 10/11/11.5/12/12.5/13. Fractional sizes are deliberate (dense terminal scale).
- Radii: var(--radius)=4px (41), var(--radius-lg)=6px (29), 999px pills, 50% circles. Stray literals: 4px×10, 3px×4, 2px×3, 6px×2, 1px×1 — mostly matching token values; two `border-radius:3px` in Discord-mock (intentional Discord look).
- Motion: 100–240ms interactions (120/140/150/160 dominant), 400–600ms data transitions, ease `cubic-bezier(0.23,1,0.32,1)` (--ease-out). Reduced-motion honored on every animation found.
- Spacing: no formal scale; recurring 4/6/8/10/12/14/16/18/22/24px. Consistent in practice.
- Icons: lucide 1.23.0 pinned+SRI, stroke 1.5 in chrome. Exception: star glyphs (★) as text — deliberate.

## 6. Third-party surface
- CDN: lucide 1.23.0, gridstack 12.6.0, echarts 5.6.0 — all pinned + SRI. TradingView embeds (no SRI possible; runtime-injected).
- Data: Hyperliquid, Deribit, OKX, Binance, Bybit, Coinbase, CoinGecko, GeckoTerminal, TradingView scanner/news, alternative.me, RSS×4 (via proxy), Coinalyze (via proxy, keyed).
