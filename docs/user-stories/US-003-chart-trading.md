# US-003: Insilico-style chart trading

Story schema v1.

As an active trader, I want authenticated orders, positions, and local drafts to be directly manipulable on the chart so that chart execution is fast without obscuring venue truth.

## Acceptance criteria

- Only current-market, authenticated open orders and positions render as authoritative overlays; disconnected users see none.
- Draft entry, trigger, take-profit, stop-loss, and scale handles are visually distinct from open orders.
- A chart click updates exactly the active ticket field, including `scaleStartPrice` and `scaleEndPrice`.
- Dragging an order previews its new price; release modifies using exact market identity and precision. Rejection returns to the snapshot price and displays the venue reason.
- Dragging a trigger order modifies its trigger price while preserving stop-vs-stop-limit and take-profit-vs-stop semantics; it cannot be converted into a plain limit order by the chart.
- On-chart order labels show authoritative open/partial status, remaining size, price, side/trigger kind, drag affordance, and immediate cancellation; authenticated positions show average entry, size, side, unrealized PnL, and liquidation price.
- Cancel is immediate but followed by an authoritative open-order snapshot.
- Click Placement submits only while explicitly armed, uses right-click, rejects post-only crossing locally, and disarms with Escape.
- Browser context-menu suppression occurs only while armed.
- Order, position, fill, and final-candle updates never reset the user's zoom.
- Initial history and explicit market/timeframe changes may fit content.
- Mobile timeframe controls use the same shared chart-timeframe action as desktop; changing them reloads the authoritative candle series without changing market identity or resetting chart interaction state.
- Chart order and position labels use coalesced `requestAnimationFrame` coordinate updates tied to Lightweight Charts range changes and pointer movement; they do not poll on a fixed timer, so drag/zoom overlays track the same frame budget as the chart.
- A live mid hydrates a zero-price bootstrap ticket as soon as the public feed arrives; a focused or edited price input is never overwritten by subsequent mid updates.
- Candle history remains authoritative when a snapshot overlaps live events: only candles newer than the snapshot are carried forward, so a partially observed live candle cannot replace accumulated snapshot OHLCV data.

## Verification

- `bun test src/lib/chart`
- Browser interaction tests for active fields, drag accept/reject, cancel, armed/unarmed right-click, Escape, and zoom retention.
- Funded testnet comparison against authoritative open orders after every mutation.
- `chart/overlayScheduling.test.js` guards the frame-coalesced overlay path and rejects regression to fixed 50 ms polling.
- `hl/candleMerge.test.js` guards snapshot precedence and preservation of newer live candles during history hydration.
- Global 1–9 sizing hotkeys now use the same authoritative sizing action as the ticket percentage presets: perp sizes use margin-free and leverage, while spot sizes use the selected quote-token balance with no leverage. Both paths use market price and venue precision; they no longer multiply a zero/current size. `orderSizing.test.js` guards the shared action boundary.
- `mobileParity.test.js` guards the shared mobile timeframe action and active-state binding, confirms mobile uses the same Chart/OrderBook/RecentTrades surfaces and shared `OrderTicket`, and rejects a second mobile-only execution path.
- Chart history refresh identity is keyed by the exact `apiCoin`/`marketKey` descriptor rather than the display symbol, preventing candle-series reuse across colliding labels.
- Latest drag-safety slice: rejected chart modifications now explicitly reschedule the overlay coordinate so the preview returns to the authoritative snapshot with a short transition, and trigger/stop-limit rejection messages identify the authoritative trigger price rather than incorrectly reporting a limit price. Focused chart/execution coverage passes with 13 tests and 61 assertions; funded mutation comparison remains pending.
- Ticket stop-trigger correction: the ticket now forwards its configured stop/stop-limit trigger price and stop semantics to the shared local order boundary. The visible trigger field therefore matches the signed venue intent instead of silently falling back to the limit price. Automated coverage: `src/lib/components/orderTicketStopTrigger.test.js`; browser and funded trigger proof remain required.

## Operational contract

- Persona: Active trader using Lightweight Charts to inspect and manipulate the selected Hyperliquid market.
- Preconditions: Exact live `MarketDescriptor`, authenticated current-market account projection, live candles/book/trades, and explicitly armed immediate placement.
- Success behavior: Chart coordinates, ticket fields, overlays, and venue commands share exact market identity and authoritative prices.
- Failure behavior: Rejected drags revert to the authoritative price; missing identity, stale state, or unsafe click placement produces an explicit local error with no transmission.
- Reconnect behavior: Re-hydrate the selected market and account overlays, reconcile open orders/positions, and preserve zoom unless market/timeframe changed.
- Restart behavior: Restore only local drafts/preferences; never restore authenticated overlays until a fresh snapshot proves them.
- Stale/offline behavior: Hide or mark private overlays stale and disarm immediate placement when the selected feed is not live.
- Account reconciliation behavior: cached private chart overlays and bottom-panel rows are removed from the actionable view while account synchronization is `stale`, `degraded`, or `error`; drag, cancel, close, and TWAP-cancel handlers fail closed until the snapshot is live again.
- Public-data behavior: an empty chart displays the explicit price-history status, while snapshot-backed books and trades carry a visible non-live health label until the selected feed is live.
- Click Placement safety: armed right-click placement now requires live account reconciliation and a live selected-market feed before dispatch, and chart submissions carry the selected exact `marketKey` rather than relying on implicit selection inference.
- Custody expectations: Chart interactions dispatch only through the browser-local execution client; drafts never masquerade as venue orders.
- Latency expectations: Overlay coordinates update on coalesced animation frames; feed receipt-to-store p99 <5 ms and frame-ready completes within one frame.
- Telemetry: Record chart mode, active field, drag preview/modify latency, cancel outcome, frame scheduling, and zoom resets without account contents.
- Linked tests: `chart/*.test.js`, `mobileParity.test.js`, browser interaction checks, smoke/browser surface, and funded-testnet mutation comparison.
- Latest live-chart fallback slice: recent Hyperliquid trades now seed and update the selected Lightweight Chart candle while history or a long-interval candle event is delayed. The merge is OHLCV-only from venue trades, ignores out-of-order rewrites, and is covered by `hl/candleMerge.test.js`; authoritative candle history still wins for overlapping timestamps.
- Latest partial-feed resilience slice: if the candle WebSocket fails after book/trades are active, the chart keeps the real trade-derived OHLC fallback instead of clearing the canvas. The feed is marked stale until recovery, while order-book/trade data remains visibly available; `subscriptionsIdentity.test.js` guards this degradation path.
- Latest browser-observability slice: the hydrated chart, order book, recent trades, and market-data health surfaces now expose stable `data-testid` hooks. The browser-surface smoke asserts those hooks are present under the CSP-protected terminal shell, while interactive wallet/funded replay remains explicitly separate.
- Mobile live-read slice: at 390×844, the public terminal loaded a live BTC chart, live DOM book, current tape, and the Markets/Trade navigation. Both views remained usable and switched without console warnings or errors; the wallet stayed disconnected and all custody controls were disabled. This does not prove mobile chart placement, order handling, stale/reconnect, or funded behavior.
- Latest venue-sizing slice: percentage sizing and the leverage control now clamp to the selected descriptor's authoritative `maxLeverage` (spot remains 1x). A market switch cannot leave a stale higher leverage active; order-sizing coverage protects the shared calculation and ticket boundary.
- Latest catalog-switch slice: periodic catalog replacement now participates in the same exact-API-coin feed-selection path as user market clicks. A selected market replaced during refresh cannot leave the chart subscribed to a stale API coin while the watchlist shows another descriptor; feed identity coverage passes.
- Latest rapid-switch slice: market and timeframe subscription transitions are serialized with lifecycle invalidation, so rapid clicks or reconnect teardown cannot let an older unsubscribe detach a newer exact-coin feed. Focused identity coverage, source typecheck, production build, and live runtime verification pass.
- Funded-testnet evidence: Compare every chart place/modify/cancel/trigger mutation against authoritative open orders and positions, including partial fills and rejection rollback.
- Given an armed chart interaction, when the trader right-clicks a valid non-crossing price, then exactly one local command is created and its authoritative result is reflected on the chart.

## Current evidence

- The funded-testnet slice of the chart-action family executed 2026-08-03: the same signed action boundary `src/lib/hl/orders.ts` exposes (which `chart/clickTrading.ts` invokes) placed and cancelled orders on Hyperliquid testnet with definitive venue responses, and produced a genuine two-account partial fill (maker resting sell 0.001 BTC partially filled 0.0004 by a second venue-funded account) observed live over the venue `userFills` WebSocket, with the remaining size reconciled and cancelled. Manifest: `docs/evidence/funded-testnet-2026-08-03.json` (venue order IDs `57392234166`, `57392234881`). Browser-chart click replay and mobile chart evidence remain open.
