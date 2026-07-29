# Vice Backend

Rust orchestration backend for Vice Terminal.

## Crates

| Crate | Purpose |
|-------|---------|
| `core` | Shared types: `OrderIntent`, `AlgoJob`, `MarketEvent` |
| `dex-trait` | `DexAdapter` trait for multi-DEX routing |
| `dex-hyperliquid` | Closed Hyperliquid adapter boundary; wallet-controlled browser execution is authoritative |
| `algo` | TWAP, Scale, Chase runners |
| `gateway` | loopback-only health server; execution remains closed because signing is owned by the user's local agent |
| `wasm-terminal` | WASM hot-path scaffold for orderbook/DOM |

## Run

```bash
# Terminal 1: SvelteKit frontend
cd ../vice-terminal
bun run dev

# Terminal 2: Rust algo gateway
cargo run -p vice-gateway
```

## API

- `GET /health` — health check
- Execution and algo routes intentionally return unavailable until every child intent is authenticated and signed by the user's local agent.

## WASM build (optional)

```bash
cargo install wasm-pack
wasm-pack build wasm-terminal --target web --out-dir ../vice-terminal/static/wasm
```

## Security boundary

The gateway binds to `127.0.0.1:8080` by default and never receives or stores a shared Hyperliquid private key. Override the loopback bind only with `VICE_GATEWAY_BIND` in a controlled deployment.
