# Vice Terminal ↔ Hypeterminal Comparative QA

## Scope

Comparative end-user QA of Vice Terminal against the locally running Hypeterminal reference.

- Vice: `http://127.0.0.1:5173/trade`
- Hypeterminal: `http://127.0.0.1:4173/`
- Target: mainnet UI configuration; no live signing or order mutation
- Viewports: 1440×900, 1024×768, 768×1024, 390×844

## Method

1. Inventory routes, visible controls, charts/canvases, market-data panels, dialogs, and responsive navigation.
2. Exercise every safe end-user interaction and keyboard path.
3. Exercise wallet discovery through the no-provider boundary; do not approve signatures.
4. Assert mutation controls remain gated while disconnected/stale.
5. Compare any Vice failure against the matching Hypeterminal surface.
6. Patch only reproducible Vice defects; add focused regression coverage.
7. Re-run typecheck, Svelte diagnostics, unit tests, build, browser interaction, and runtime health probes.

## Repair log

| ID | Surface | Severity | Reproduction / evidence | Expected | Fix | Verification |
| --- | --- | --- | --- | --- | --- | --- |

## Explicitly not executed

- No wallet unlock or signature approval.
- No order submission, cancellation, flattening, reverse, agent approval, or other signed mutation.
- No deployment, invitation, commit, or push.
