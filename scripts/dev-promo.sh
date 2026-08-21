#!/bin/bash
# Dev server for the live-types promo recording — all certified order types enabled.
# TEST-ONLY: uses vite.config.promo.ts (explicit --config) so the signing shim
# proxy is NEVER present in normal dev/preview/build/release configs.
export PATH="$HOME/.bun/bin:$PATH"
export VICE_HL_EVIDENCE_CORE_ONLY=true
export VITE_HL_NETWORK=testnet
for t in BRACKET TWAP ADAPTIVE_TWAP VWAP POV SCALE CHASE SWARM ICEBERG OCO PING_PONG TRAILING_STOP BREAK_EVEN MAKER CONDITIONAL_LADDER; do
  export "VITE_HL_CERTIFIED_${t}=true"
done
cd /Users/nichols/Desktop/Viceterminal/vice-viceterminal/vice-terminal
exec bun run dev -- --config vite.config.promo.ts --port 5199
