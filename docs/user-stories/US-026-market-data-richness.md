# US-026: Market-data richness and price awareness

Story schema v2.

As an experienced Insilico terminal user, I want the market data I actually trade on to be rich, exact, and honest: stats strip, liquidations (labeled unavailable when the venue omits them), exact-market price alerts, local sounds, privacy masking, venue-supported book grouping, bounded displayed-depth imbalance, and a min-size tape filter.

## Acceptance criteria

- US-026-AC-001: Given the stats strip, when it renders, then stats use a separately monitored context feed and hourly funding timer; the strip never fabricates values.
- US-026-AC-002: Given the official public Hyperliquid trade feed has no liquidation marker, when liquidation data is displayed, then it is labeled unavailable rather than invented.
- US-026-AC-003: Given price alerts, when I configure one for an exact market, then it monitors that exact all-mids registry entry and fires only on the configured condition; alert state is device-local.
- US-026-AC-004: Given local sounds, when an alert or fill event fires, then the sound plays from local configuration and can be muted; sounds never mask stale data.
- US-026-AC-005: Given privacy mode, when enabled, then account rows, ticket notional/margin, and chart private state mask immediately.
- US-026-AC-006: Given book grouping, when I change significant figures or depth, then the L2 subscription carries the exact grouping-aware identity and the ladder rebuilds; the selection persists across reload.
- US-026-AC-007: Given the DOM, when it renders, then it shows a bounded top-12 displayed-size imbalance and never presents placeholder rows as actionable data.
- US-026-AC-008: Given the tape, when it renders, then it filters to the min-size threshold and labels liquidation data per the venue schema.

- Action IDs: story.us-026

## Operational contract

- Persona: Experienced Insilico terminal user reading depth, tape, and stats.
- Preconditions: Live public feed; exact market registry; device-local alert/sound/privacy stores.
- Success behavior: Stats, alerts, sounds, privacy, grouping, imbalance, and tape behave as labeled and never invent venue data.
- Failure behavior: Feed failure becomes loading/stale/error; alerts pause on stale sources; grouping changes never use ambiguous same-coin traffic.
- Reconnect behavior: Alerts and feeds reconcile on reconnect; fired edges never backfill after a clock outage.
- Restart behavior: Alert config, grouping, depth, sounds, and privacy restore from device-local stores.
- Stale/offline behavior: Dither stale-veil marks stale panels; alerts refuse to fire on stale all-mids.
- Custody expectations: No credential or signing authority in any market-data surface.
- Latency expectations: receipt→store p99 < 5ms; frame-ready p99 < 16.667ms; stat/alert updates within one frame.
- Telemetry: Record feed health, alert fire/pause/miss counts, and latency without account contents.
- Linked tests: `marketStats.test.js`, `marketMovers.test.js`, `priceAlerts.test.js`, `soundNotifications.test.js`, `privacyMode.test.js`, `bookGrouping.test.js`, `bookAnalytics.test.js`, `tradeTape.test.js`, `marketClass.test.js`, `ditherSurface.test.js`.
- Funded-mainnet evidence: Live-feed smoke on funded mainnet (allMids, l2Book, trades) passed 2026-07-29 via `dev:verify`; browser interaction and deliberate reconnect/stale-transition proof remain open (US-008).

## Evidence log

- 2026-08-07: Market-data surface tests green in `bun run check`; browser reconnect/stale-transition evidence remains open (PLAN_3 "Market-data richness" row).
