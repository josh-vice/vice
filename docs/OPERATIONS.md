# ViceTerminal operations runbook

ViceTerminal beta is a Hyperliquid-only, browser-executed trading terminal. The shipped surface is market data, chart, order book/tape, order ticket, account/activity, secure local execution, advanced order safety, and privacy-safe diagnostics.

## Custody boundary

- The browser creates, encrypts, unlocks, and uses the Hyperliquid agent key.
- The connected wallet remains the account authority. The server never receives a user private key and hosted mutation routes are unavailable.
- The encrypted agent is device-local and account/network scoped. Account or network changes invalidate the execution scope.
- `VITE_HL_TRADING_NETWORK` is authoritative; testnet is the default.
- Before enabling trading, verify `/api/hl/session` reports `tradingMode=local-encrypted-agent`, `serverSigning=false`, and `custody=browser-only-encrypted-agent`.

## Local verification

From the repository root:

```bash
bun install
bun run check
bun run test:e2e
```

`bun run check` runs custody/release preflight, TypeScript, Svelte diagnostics, the core frontend suite, and the production build. `bun run test:e2e` builds a fresh terminal artifact and runs the non-mutating Chromium suite against it. No backend, fixture venue, or wallet credentials are required.

Focused gates:

```bash
bun run test:catalog
bun run test:contract
bun run test:chaos
bun run test:mobile
bun run test:load
bun run test:bundle
bun run test:streams
```

## Release controls

`bun run test:release` is the aggregate release gate. It covers the core source/build checks, market and execution contracts, reconciliation/chaos checks, bundle budget, stream catalog, release evidence, approval/manifest integrity, E2E structure, and deployment smoke checks.

Mainnet promotion remains fail-closed. It requires an immutable release manifest, matching full commit SHA, mainnet evidence, operator ownership, clean cleanup state, and measured latency evidence. Latency evidence is never synthesized by unit tests; run `bun run test:latency` with `VICE_LATENCY_EVIDENCE=/path/to/client-latency.json`.

The release workflow builds `vice-terminal/.vercel/output`, binds its checksum to `bun.lock` and the release commit, and uploads the immutable artifact. It does not deploy or publish.

## Diagnostics and incidents

The Report Issue flow is the beta support entry point. It creates a local, privacy-safe support bundle only after an explicit download. The bundle excludes wallet/agent addresses, keys, signatures, auth tokens, and raw order payloads. Redaction and bounded-size behavior are covered by the diagnostics tests.

Assign beta support, diagnostics, incident commander, rollback, and kill-switch owners before enabling mainnet trading. Trading can be halted with `VITE_HL_TRADING_KILL_SWITCH=true`; any uncertain execution state requires reconciliation before retrying.

## Network and feed behavior

The app consumes Hyperliquid public and private feeds directly from the browser. Market catalog bootstrap precedes subscriptions. Each feed carries an epoch and freshness state; stale book/account state blocks mutation rather than fabricating values. The release stream catalog is limited to the shipped market, account, and execution surfaces.
