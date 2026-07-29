# Vice Terminal vs Insilico Terminal — competitive gap analysis

Date: 2026-07-19. Benchmark target: Insilico Terminal 5.x (docs.insilicoterminal.com, changelog through v5.5.0). Goal: meet or exceed Insilico as a smoother, simpler, lower-latency terminal — starting on Hyperliquid (perps, spot, HIP-3, RWAs, prediction markets), then expanding to Lighter, Nado, Blofin, and Binance, using builder codes where possible and referral codes elsewhere.

Verdict summary: **Vice already meets or exceeds Insilico on Hyperliquid-native execution depth, chart trading, custody, latency discipline, fee economics, a local DOM, and device-local trigger breadth. It still trails on certified venue breadth, aggregate tape/news, multi-account operation, and tab-independent automation.** Everything implemented in Vice remains fail-closed behind certification flags, so shipped surface area is smaller than the local implementation surface.

## 1. Where Vice meets or exceeds Insilico

| Area | Vice | Insilico | Call |
| --- | --- | --- | --- |
| Custody | Non-custodial encrypted device-local agent; server signing routes return 410; kill switch; command journal + lost-ack reconciliation | Non-custodial API keys / HL wallet-sig; less documented reconciliation rigor | **Vice exceeds** |
| HL fee economics | 0.1 bp builder fee (fail-closed, explicit opt-in) | 1 bp builder fee on Hyperliquid | **Vice exceeds (10x cheaper)** |
| Chart trading | Drag-to-modify (incl. trigger semantics preserved), armed right-click placement, click-to-fill any ticket field, designer/draft preview, position + liquidation + order overlays, rAF-coalesced labels, zoom never reset | Drag order handles, click-autofill, Designer mode, order/position lines | **Parity-plus** (Vice adds trigger-semantic safety, liq lines, latency budgets) |
| Order-type library (implemented) | Limit/market/stop/stop-limit/bracket + TWAP (native venue), adaptive TWAP, VWAP, POV, scale (2–100, atomic, skew), chase, swarm, iceberg, OCO, ping-pong, trailing stop, break-even, maker routing, conditional ladder — all as persisted, restart-safe child-order state machines with pause/resume/emergency and dead-man switch | Market/limit/stop variants, chase (rich modes), scale (2–100, distributions), TWAP (anti-detection), swarm, TP/SL bracket, bump; no clear native OCO or classic trailing stop | **Vice exceeds on breadth and lifecycle rigor** — but see §2.1: almost none of it is certified/exposed yet |
| Execution safety | Exact market identity (apiCoin, never display symbol), deterministic cloids, bounded retry, uncertainty-blocking, HIP-3-aware reconciliation | Client-side processing, less documented | **Vice exceeds** |
| Latency discipline | Measured, fail-closed gates: receipt→store p99 <5ms, frame-ready <1 frame, signed dispatch p99 <10ms; native C++/WASM renderer prototype | "<150ms" marketing claim, latency meter | **Vice exceeds methodologically** |
| HL market coverage | Core perps + all HIP-3 DEXs + spot, catalog-complete with virtualized watchlist | HL perps + spot | **Vice exceeds** (HIP-3 account-state fan-out is genuinely hard and done) |
| Release discipline | Versioned story catalog, funded-testnet evidence gates, chaos/load/latency suites | Public changelog, beta-flagged features | **Vice exceeds** |

## 2. Where Vice is behind (the plan drivers)

### 2.1 Certification debt (highest leverage, blocks everything)
Implemented ≠ shipped. Default production surface is limit/market/stop/stop-limit only; every advanced type awaits funded-testnet certification (`VITE_HL_CERTIFIED_*`). Insilico users get chase/scale/TWAP today. **Action: execute the funded-testnet evidence plan in OPERATIONS.md; certify in tiers (TWAP+Scale → Chase+OCO+Trailing → the rest).**

### 2.2 Venue breadth (largest functional gap)
- Vice: Hyperliquid only. Rust `dex-trait` exists but has zero working adapters (Hyperliquid adapter intentionally disabled; Lighter/Nado empty stubs; Blofin/Binance absent from `DexId`).
- Insilico: Binance, Bybit, BitMEX, OKX, Bitget, Coinbase, BloFin, Kraken, Hyperliquid, ApeX (+ Lighter/Extended/Nado/Ondo per setup docs), multi-account and cross-venue baskets.
- Architectural decision needed: browser-local signing model extends naturally to perp DEXs (Lighter, Nado — wallet/agent signatures), but CEXs (Blofin, Binance) need API-key custody UX (encrypted-local like Insilico) and likely a distinct execution client per venue family. See US-006.

### 2.3 Market-data richness
Vice now has a stats strip, min-size tape filter, exact-market alerts, local sounds, privacy masking, venue-supported book grouping, and bounded displayed-depth imbalance. The official public Hyperliquid trade feed has no liquidation marker, so Vice labels liquidation data unavailable rather than inventing it. Remaining gaps are aggregate multi-venue tape, news, richer venue-supported book analytics, browser reconnect proof, and funded evidence. See US-008.

### 2.4 DOM ladder
Vice now has a guarded DOM ladder with click-limit and Shift-click stop entry, drag-reprice, cancel controls, quick sizing, selected-market flatten/reverse, and manual/auto recenter. It still needs measured row-diff performance, browser interaction/reconnect proof, and funded lifecycle certification. See US-009.

### 2.5 Position management ergonomics
Vice now has reverse, selected-market flatten, per-position market/limit-at-quote/Scale/TWAP close, bid/ask/both cancel-all, long/short/all flatten, account-local fixed-point fat-finger limits, and opt-in auto-TP on the separately certified Scale path. The remaining gap is proof: browser restart/interaction, funded multi-market and partial-leg lifecycle evidence, and certification before any advanced control can be exposed. See US-010.

### 2.6 Persistent automation (Cortex equivalent)
Insilico's client algos die with the tab too, but Cortex (server-side, HL-only) provides persistent conditional orders (price cross, candle close/volume, time, synthetic pair triggers). Vice has all five trigger semantics in its device-local conditional ladder, with exact identities, stale pauses, miss-not-late behavior, restart-safe fired edges, and privacy-safe local outcome counters. It still needs a user-run local orchestrator or venue-native conditionals for tab-independent behavior; hosted signing remains prohibited. See US-011.

### 2.7 Workspace flexibility & multi-account
Vice has Dockview local layouts, privacy masking, local sounds, configurable hotkeys, and independent read-only public snapshots with explicit cyan/amber/violet market/timeframe links. The remaining scope is independently fed chart/book/ticket and crosshair links, multi-account aggregation, and browser proof for drag, redock, popout, and mobile. See US-012.

### 2.8 CLI depth
Vice CLI now has chaining, bounded repeat, local aliases and variables, UI controls, and configurable hotkey-bound commands through the shared execution path. Remaining scope is certified-action coverage and browser/mobile proof. See US-012.

### 2.9 Dormant scaffolding to resolve
Options/RFQ/StrategyBuilder/Trollbox/DexPanel remain development-only fixture scaffolds and are absent from the public component barrel. The Rust gateway remains a loopback health/runtime-verification service with execution closed; the Rust algo crate is not reachable from product execution; `wasm-terminal` remains a performance research scaffold. There is no checked-in `vice-native-order` event sender or listener. Any future native renderer order path must enter through the same certified local-execution boundary, never a private event channel.

## 3. Differentiators to protect (Vice's moat)
1. 10x cheaper HL builder fee (0.1 bp vs 1 bp) — market loudly.
2. Fail-closed truth discipline (no stale/fixture data ever presented as live) — Insilico has nothing comparable; now visually reinforced by the dither stale-veil language.
3. Restart-safe, journaled, reconciliation-first algo lifecycle.
4. Measured latency evidence as a release gate, plus the native renderer roadmap.
5. Simplicity: one fixed, fast view vs Insilico's "overwhelming" learning curve (its most common user complaint).

## 4. Priority plan
| # | Workstream | Stories | Effort signal |
| --- | --- | --- | --- |
| P0 | Certify advanced orders on funded testnet, tiered | US-004 | Evidence capture, not new code |
| P0 | Funded lifecycle and browser/reconnect proof for implemented surfaces | US-002/003/004/008/009/010/011/012 | Evidence capture, not new execution behavior |
| P1 | Position ergonomics certification and lifecycle evidence | US-010 | Browser and funded evidence; no new execution path |
| P1 | Explicit HIP-3 product classes: RWA + prediction market labeling/UX | US-007 | Catalog metadata + UI |
| P1 | Workspace polish: layout presets, privacy mode, sounds, programmable hotkeys, CLI chaining/aliases | US-012 | Contained frontend |
| P2 | DOM row-diff measurement and native-renderer follow-on | US-009 | Large; reuse the guarded DOM feed and execution boundary |
| P2 | Multi-venue: Lighter → Nado (DEX family), then Blofin → Binance (CEX family) with per-venue builder/referral attribution | US-006 | Largest; needs custody design for CEX keys |
| P3 | Persistent automation decision (Cortex answer) | US-011 | Architecture decision first |

## 5. Sources
Internal: frontend/backend/renderer architecture audits (2026-07-19), `docs/user-stories/*`, `docs/OPERATIONS.md`. External: Insilico docs (FAQ, Interactive Chart, Designer, DOM, Orderbook, Chase, Scale, TWAP, TP/SL, Positions, Basket, Cortex, v5.5.0 changelog), Insilico builder-fee announcement, DefiLlama builder revenue, third-party reviews (Finestel, CoinCodeCap, TradersList). Uncertain Insilico items treated conservatively: OCO (likely absent), classic trailing stop (likely absent), book heatmap (absent), price alerts (absent as dedicated feature).
