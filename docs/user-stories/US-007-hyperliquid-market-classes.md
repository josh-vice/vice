# US-007: Every Hyperliquid market class as a first-class surface

Story schema v1. Status: In progress.

As a Hyperliquid-native trader, I want perps, spot, HIP-3 builder markets, RWAs, and prediction markets to be discoverable, labeled, and tradable as distinct product classes, so that the entire venue catalog is usable without guessing what an instrument actually is.

## Acceptance criteria

- The catalog classifies every market into a product class: core perp, spot, HIP-3 perp, RWA, or prediction market, using authoritative venue metadata (perp DEX registry, asset metadata) rather than name heuristics alone; unclassifiable markets remain visible as generic HIP-3 with no fabricated class.
- The watchlist can filter/group by product class; search matches class names (e.g. "prediction").
- Prediction markets display outcome-style context (e.g. bounded 0–1 style pricing, resolution/expiry metadata when the venue provides it); RWAs display underlying/issuer metadata when available; nothing is invented client-side.
- Contract details (funding, leverage caps, margin tier, oracle source, HIP-3 DEX owner) are visible per market before trading.
- Sizing, leverage clamps, and precision follow each class's authoritative constraints (already true for spot 1x and HIP-3 maxLeverage; extended to any class-specific rule the venue exposes).
- Every class participates in the same feed-health, identity, and reconciliation guarantees; no class ships as display-only without an explicit unavailable label.
- Given a trader searching "election", when a HIP-3 prediction market matches, then it appears grouped under prediction markets with its resolution metadata and can be traded with the same chart/ticket/book surfaces as any perp.

## Operational contract

- Persona: Trader exploring and trading non-core Hyperliquid market classes.
- Preconditions: Live catalog including perpDexs enumeration; class metadata resolved from authoritative venue responses.
- Success behavior: Each market renders with correct class labeling, class-appropriate stats, and full trade/chart/book functionality.
- Failure behavior: Missing class metadata degrades to explicit generic labeling; no synthetic classification or fabricated fields are shown.
- Reconnect behavior: Catalog refresh preserves selected-market identity and class grouping; replacement descriptors keep exact-API-coin feed selection.
- Restart behavior: Cached catalog restores with class labels and is revalidated against the live catalog before trading.
- Stale/offline behavior: A stale catalog marks class listings explicitly; class filters never present cached rows as complete.
- Custody expectations: Unchanged from US-002; class metadata is read-only public data.
- Latency expectations: Class filtering and grouping stay within the virtualized watchlist frame budget; no added per-frame catalog scans.
- Telemetry: Record class distribution counts, classification-source (authoritative vs generic), and filter usage without account contents.
- Linked tests: catalog classification tests extending `hl/markets.test.js`, watchlist grouping/filter tests, class-constraint sizing tests.
- Funded-testnet evidence: At least one funded trade lifecycle on a HIP-3 market and, where testnet availability allows, an RWA and a prediction market, proving identity, sizing clamps, and reconciliation per class.

## Evidence log

- Prediction identity slice: the catalog reads Hyperliquid's official `outcomeMeta` response and maps each binary side to its documented `#<10 * outcome + side>` API coin and `100_000_000 + 10 * outcome + side` asset ID. Question, outcome, side, and settled metadata remain venue-supplied. The market search includes question text and the watchlist groups these rows as prediction outcomes.
- Product-class disclosure slice: the selected-market header now labels core perpetual, spot, HIP-3, and prediction rows on desktop and mobile. Prediction rows disclose only their venue-supplied question context and metadata-only/settled state. Generic HIP-3 remains generic; no RWA label, issuer, resolution, or execution term is inferred. Automated coverage: `src/lib/marketClass.test.js` and `src/lib/marketClassSurface.test.js`.
- Venue-category slice: the catalog reads Hyperliquid's official `perpCategories` response and applies a category only when it exactly matches a complete core or HIP-3 API coin. Categories such as `stocks`, `commodities`, `indices`, `fx`, and `preipo` are displayed as venue categories; Vice does not infer tokenization, legality, collateral, or execution terms from them. Missing category metadata leaves the field absent and does not hide a market. Coverage: `src/lib/hl/markets.test.js` and `src/lib/marketClass.test.js`. This is live-read schema knowledge plus static/local implementation proof.
- Watchlist category slice: search now recognizes visible class words such as `core`, `hip-3`, `spot`, and `prediction`, as well as an exact official venue category. Core and HIP-3 rows group by their exact official category (and HIP-3 DEX), with unclassified rows remaining generic; categories never alter routing or certification. The virtualized grouping pipeline refreshes when the catalog array changes, so an authoritative category refresh cannot be hidden by an unchanged market count. Coverage: `src/lib/marketWatchlist.test.js`. This is static/local behavior proof.
- Browser class-search check (2026-07-29): an isolated public testnet session rendered the hydrated watchlist with `DATA LIVE` and explicitly `CATALOG DEGRADED`; its available authoritative BTC core row remained in `Core Perps`, and a `core` search returned that group. The catalog was rate-limited and contained no category-bearing row in this run, so this does not claim live category-group evidence. No wallet, account, credential, or order control was used.
- Malformed-spot resilience and browser lookback (2026-07-29): spot identity now requires non-empty, trimmed base and quote token names plus an integer venue size precision from the venue token map. A malformed record is skipped; Vice neither derives assets from a display label, defaults a quote asset, nor turns missing size precision into a whole-unit increment. Focused catalog, identity, and subscription tests cover the boundary. In the isolated public testnet browser, the catalog logged one skipped malformed spot, then rendered `DATA LIVE` with 157 core rows and 1,778 markets. The catalog correctly remained degraded while the separate HIP-3 `tndex` enrichment was rate-limited. Changing DOM precision from 4 to 5 and back to 4 significant figures retained a live book both times. The wallet stayed disconnected, `ACCOUNT OFF` remained visible, and the trade-connect controls stayed disabled. This is browser/public-read proof, not execution certification.
- Safety boundary: `outcomeMeta` does not supply tick, lot, price, or complete execution terms. The terminal therefore marks every discovered outcome metadata-only and rejects an order before it reaches the signer. It does not guess a price range, resolution time, or precision. Automated coverage: `src/lib/hl/markets.test.js`; browser feed, account reconciliation, authoritative execution constraints, and funded lifecycle proof remain required.
- RWA classification: the official category source does not establish a legal RWA or tokenization status. The UI preserves its exact descriptive category rather than applying a broad RWA label from a symbol or DEX-name heuristic.
