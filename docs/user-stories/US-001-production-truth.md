# US-001: Trustworthy production state

Story schema v2.

As a disconnected trader, I want every data and account surface to state its real status so that I never mistake fixtures, stale values, or unsupported functionality for live production state.

## Acceptance criteria

- US-001-AC-001: Given a production build, when the application starts, then positions, orders, fills, balances, the order book, trades, and chart account overlays contain no fixture data.
- US-001-AC-002: Given public market data is live while no wallet is connected, then DATA may show LIVE while ACCOUNT remains OFF and equity remains hidden.
- US-001-AC-003: Given a feed is connecting, stale, failed, or offline, then its panel communicates that state and does not render placeholder rows as actionable data.
- Community/news surfaces without an authenticated live provider show an explicit unavailable state; simulated messages, liquidations, and PnL badges are development-fixture-only.
- US-001-AC-004: Given a wallet disconnects, then private account data and account totals are cleared immediately.
- US-001-AC-005: Given a surface is not operational on Hyperliquid, then it is absent from production navigation and cannot masquerade as an available venue or product.
- Development fixtures require both a development build and `VITE_ENABLE_DEMO_FIXTURES=true`.
- Dormant options/RFQ and cross-venue comparison components are also explicitly unavailable outside the development fixture flag; they cannot render simulated quotes, payoff estimates, or derived DEX metrics in production. They are not exported through the production component barrel, so a new live route must add an explicit authoritative-data and release-gate decision rather than importing an old prototype by default.
- Disconnected desktop and mobile layouts show an empty market identity (`—`) rather than a fabricated BTC/default instrument.

## Verification

- Automated policy test: `bun test src/lib/productionTruth.test.js`
- Unsupported-surface policy test: `bun test src/lib/unsupportedSurface.test.js`
- Production compilation: `bun run build`
- Runtime check: disconnected desktop and narrow-desktop layouts with public feeds online and account state offline.

- Action IDs: story.us-001

## Operational contract

- Persona: Disconnected or partially connected trader observing public Hyperliquid data.
- Preconditions: Production build; no demo-fixture flag; public feed and account connection report independently.
- Success behavior: Public data may be live while private account surfaces remain empty and explicitly offline.
- Failure behavior: Feed/provider failures become loading, stale, degraded, error, or unavailable states; placeholders are never actionable.
- Reconnect behavior: Reconcile public feeds and clear private state until the new wallet/account snapshot is authoritative.
- Restart behavior: Start with empty production account state and rebuild only from live Hyperliquid snapshots/subscriptions.
- Stale/offline behavior: Preserve only clearly labeled last-known public data; never preserve actionable private overlays as current.
- Chart, order-book, and trades surfaces visibly distinguish loading/connecting, stale snapshot baselines, and feed errors instead of leaving an empty or cached panel unlabeled.
- During account reconnect, stale or failed private snapshots are not presented as current: chart order/position overlays, bottom-panel positions/orders/fills, and private P&L are hidden until the authoritative account status returns to `live`.
- Custody expectations: No private key or signing authority exists in hosted services; disconnected users cannot transmit mutations.
- Latency expectations: Public feed-to-store and chart frame-ready remain within shared release budgets without fixture seeding.
- Telemetry: Record feed health, snapshot generation, stale transitions, and feed-to-store/next-frame-ready latency without account contents.
- Linked tests: `productionTruth.test.js`, `unsupportedSurface.test.js`, `mobileParity.test.js`, `bun run test:browser`, and `bun run dev:verify`.
- Funded-mainnet evidence: Funded account-state and live-feed replay remains a release prerequisite for private overlays.
- US-001-AC-006: Given a production build, when a feed or wallet disconnects, then the corresponding surface is empty or explicitly degraded and no fake state is actionable.
- Production import boundary: display-only helpers used by live components must come from fixture-free modules; importing the development data module is permitted only through the explicit development-fixture loader.

## Evidence log

- Public-plane slice: Hyperliquid all-mids now runs in an origin-wide SharedWorker, with a dedicated-worker fallback for browsers without SharedWorker. The worker keeps separate sockets and epochs for testnet and mainnet, so one tab cannot replace another network's public feed. The main thread receives versioned network events, keeps exact API-coin indexing, and marks the worker receipt-to-store handoff separately. A worker close or error marks market data stale and uses the existing serialized recovery path. Automated coverage: `src/lib/data-plane/protocol.test.js`, `src/lib/hl/subscriptionsIdentity.test.js`, and `src/lib/native/performance.test.js`.
- Public-book isolation slice: Hyperliquid L2 payloads identify a coin but not the requested `nSigFigs`, so the selected book stays outside the SharedWorker until the venue supplies a grouping-safe response identity. Each terminal instance now creates a dedicated public L2 transport; context subscriptions never share it, and either socket enters the same stale-and-serialized-recovery path. Shutdown clears both transports and the read-only client; every bound socket captures its feed lifecycle, so an old close/open event cannot restart a stopped or newer feed generation. On 2026-08-04 the grouping-safe identity arrived: the canonical Hyperliquid book event now carries a venue-scoped `subscriptionKey` (`hyperliquid:l2Book:BTC@nSigFigs=4`) built from a validated `BookSubscriptionIdentity` (venue, canonical instrument, coin, exact `BookGrouping`, and an explicit `BookSequenceSupport` declaration), and the dedupe key includes the grouping so same-coin frames from different `nSigFigs` can never collide. Automated coverage: `src/lib/hl/clientBoundary.test.js`, `src/lib/hl/subscriptionsIdentity.test.js`, `src/lib/venue/identity.test.js`, and `src/lib/venue/hyperliquid.test.js`. On 2026-07-29, `dev:verify` observed testnet all-mids, L2-book, and trades after the split; a hydrated local terminal then reached `DATA LIVE` with account sync off and trading disabled. This proves public reachability and the grouping-aware identity, not cross-tab worker book multiplexing, venue sequencing, or burst/reconnect performance.
- Trade worker slice: the selected-market live trades subscription now also runs in that worker. It parses and validates coin, side, numeric price/size, trade ID, and time before forwarding only display-safe fields to tabs that requested the exact API coin. It coalesces equal tab requests into one venue subscription and removes it only after the last tab leaves. HTTP recent-trade snapshots remain the bounded startup and recovery baseline. Automated coverage: `src/lib/data-plane/protocol.test.js` and `src/lib/hl/subscriptionsIdentity.test.js`.
- Candle worker slice: the selected `(coin, interval)` candle subscription now also runs in the worker. It rejects malformed or impossible OHLCV frames, sends normalized display data only to matching tabs, and removes old subscriptions on market or timeframe change. HTTP candle history remains the authoritative bounded startup snapshot. Automated coverage: `src/lib/data-plane/protocol.test.js`, `src/lib/hl/subscriptionsIdentity.test.js`, and `src/lib/hl/candleMerge.test.js`.
- Scope limit: this is not a complete data-plane migration. Book reconstruction, asset contexts, ring buffers, and burst/reconnect browser evidence are still required before the worker performance budgets or full SharedWorker architecture can be claimed.
- Book snapshot boundary: the current Hyperliquid L2 payload has no sequence field, so the terminal cannot truthfully claim sequence-gap reconstruction for it. It now rejects empty, malformed, unordered, or crossed snapshots before committing them to the ladder, marks market data stale, and runs the existing recovery path. On 2026-08-04 the sequence support became an explicit, validated declaration: `HYPERLIQUID_BOOK_SEQUENCE_SUPPORT = 'none'` and every canonical book event's `BookSubscriptionIdentity` carries `sequenceSupport: 'none'`, so no downstream consumer can claim gap recovery until the venue publishes an authoritative per-frame sequence. Automated coverage: `src/lib/hl/normalize.test.js`, `src/lib/hl/subscriptionsIdentity.test.js`, `src/lib/venue/hyperliquid.test.js`, and `src/lib/venue/identity.test.js`. Worker-side book parsing and authoritative sequence support remain open.
- Isolated runtime check: `VICE_BACKEND_PORT=18081 VICE_FRONTEND_PORT=15174 bun run dev:verify` passed backend health, terminal smoke, browser-surface smoke, and testnet all-mids/book/trades feeds. A live browser session at that isolated URL rendered `DATA LIVE` with no console errors. The browser inspection surface does not reveal whether it used SharedWorker or the dedicated-worker fallback, so that selection remains unverified.
