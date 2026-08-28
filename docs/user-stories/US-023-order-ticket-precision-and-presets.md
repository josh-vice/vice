# US-023: Order ticket precision and presets

Story schema v2.

As an experienced Insilico terminal user, I want an order ticket that never lies about precision or intent: base/quote amount entry, venue-exact price and size, saved presets, fat-finger caps, and explicit disclosure of which order types are venue-native versus device-local persisted automation.

## Acceptance criteria

- US-023-AC-001: Given a live selected market, when I enter size in base units or quote/USD notional, then conversion uses the current authoritative market price before precision and margin checks; the ticket shows venue-exact price and size increments.
- US-023-AC-002: Given I select an order type, when the type is implemented but not yet certified, then the selector labels and disables it and shows the count locked pending certification; uncertified execution returns an explicit funded-testnet certification error.
- US-023-AC-003: Given a certified order type, when I fill the ticket, then the intent (side, size, type, price, reduce-only/TP/SL semantics) is captured exactly and dispatch routes through the certified local-execution boundary.
- US-023-AC-004: Given I save a preset, when I later load it, then it restores order intent and advanced configuration only — it never bypasses exact market identity, current account state, venue precision, or safety checks; wallet switch and disconnect clear the active preset view.
- US-023-AC-005: Given a fat-finger risk, when a value exceeds the account-local fixed-point cap, then the ticket rejects it before signing and explains the cap.
- US-023-AC-006: Given a wallet disconnect, when the ticket remains open, then account-dependent fields (margin, equity, presets) clear immediately and order submission is disabled until a new authoritative account connects.

- Action IDs: story.us-023

## Operational contract

- Persona: Experienced Insilico terminal user entering orders from the ticket.
- Preconditions: Live selected market; authenticated local agent; certified order type for the action.
- Success behavior: Exact venue precision, base/quote conversion, presets, and fail-closed type gating all behave as labeled.
- Failure behavior: Uncertified type, stale book, wrong market identity, or precision violation fails closed with an explicit error before a venue payload is built.
- Reconnect behavior: Ticket inputs persist during reconnect; account-dependent values recompute from the new authoritative snapshot.
- Restart behavior: Presets are device-local and versioned; active preset view resets on wallet switch/disconnect and starts empty after restart.
- Stale/offline behavior: Ticket disables submission while the selected market is stale; dither stale-veil marks the market panel.
- Custody expectations: The ticket never sees or holds the private key; dispatch is via the same device-local signer as every other surface.
- Latency expectations: action→signed dispatch p99 < 10ms; local processing p99 < 2ms; ticket field edits do not block feed-to-frame work.
- Telemetry: Record ticket action class and latency without prices, sizes, or account contents.
- Linked tests: `orderAmount.test.js`, `orderPresets.test.js`, `orderSizing.test.js`, `fatFinger.test.js`, `orderTicketStopTrigger.test.js`, `execution/venueFormat.test.js`, `execution/commandIdentity.test.js`, `execution/commandJournal.test.js`, `execution/advancedOrderSurface.test.js`.
- Funded-mainnet evidence: Funded ticket lifecycle for certified types covered by `docs/evidence/advanced-order-certification-2026-08-06.json` (15/15 phases, 22 real venue order IDs, 37 observed fills). **INVALIDATED 2026-08-11** — the manifest failed the hardened validator (`scripts/advanced-order-evidence.mjs`): phase-level `ok: true` masked 44 nested `ok: false` pause/resume/cancel outcomes ("Unregistered market identity"). Certification flags stay disabled pending recertification with event-honest phase outcomes.

## Evidence log

- 2026-08-11: Ticket surface tests green; the 2026-08-06 advanced-order certification manifest was INVALIDATED by the hardened validator (phase `ok: true` masked 44 nested `ok: false` pause/resume/cancel outcomes) — ticket certification status stays locked pending recertification.
