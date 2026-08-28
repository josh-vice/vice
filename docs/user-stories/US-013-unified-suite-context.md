# US-013: Unified Suite context

Story schema v2.

As a trader, I want Hub, Scanner, Gallery, and Trade to share an exact public market context so that I can move from research to action without losing venue truth or leaking private state.

## Acceptance criteria

- The shell exposes Dashboard, Trade, Scanner, Gallery, and Academy on desktop and mobile, with Simple-first and persisted Pro workspace modes.
- A public handoff carries only schema version, venue, environment, canonical instrument key, product kind, timeframe, and optional link group; display symbols never route an order.
- Hub, Scanner, alerts, charts, and widgets open Trade through the same validated public handoff; account, credentials, orders, and signing state never enter it.
- US-013-AC-001: Given a trader who selects a Scanner market, when they choose Trade, then Trade opens the exact venue/instrument/timeframe or fails closed with a visible reason.

- Action IDs: story.us-013

## Operational contract

- Persona: Trader moving between intelligence and execution during a live session.
- Preconditions: A validated public catalog entry exists for the selected venue and instrument.
- Success behavior: Navigation is immediate, context is exact, and private state remains local to the authorized trade session.
- Failure behavior: Missing, stale, malformed, or unroutable context disables the handoff and explains why.
- Reconnect behavior: Public context remains visible but actions wait for the destination feed to become live.
- Restart behavior: Only validated public context and mode preference restore; account state and signing authority do not.
- Stale/offline behavior: The destination labels the context stale and blocks new execution.
- Custody expectations: This story creates no wallet, key, account, or signing channel.
- Latency expectations: Context handoff adds no network round trip and no measurable overhead to execution dispatch.
- Telemetry: Record anonymous route and handoff outcomes without market, account, wallet, or order values.
- Linked tests: Context-schema, malformed-route, deep-link, shell-navigation, privacy-boundary, mobile, and browser handoff suites.
- Funded-mainnet evidence: Certified chart/DOM handoffs reuse the destination action's funded evidence; public-only handoffs require browser evidence only.

## Current evidence

- The SvelteKit shell serves `/`, `/hub`, `/trade`, `/scanner`, and `/gallery`. The preserved Hub island receives only a same-origin, typed public context; its Trade action sends canonical Hyperliquid market identity and a bounded chart timeframe.
- Trade validates version, venue, exact key, API coin, product kind, and timeframe. It waits only while the catalog is unresolved; an unavailable exact identity is visibly rejected without a display-symbol fallback or a market selection.
- Coverage: `src/lib/suite/context.test.js`, `src/lib/suite/handoff.test.js`, `components/tradeHandoffSurface.test.js`, and `scripts/hub-route.test.mjs`. This is local contract/build proof, not browser or funded execution evidence.
