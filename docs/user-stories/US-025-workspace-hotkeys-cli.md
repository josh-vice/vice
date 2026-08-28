# US-025: Workspace, hotkeys, and CLI power input

Story schema v2.

As an experienced Insilico terminal user, I want a workspace I can arrange once and drive by keyboard: Dockview layouts, configurable hotkeys for buy/sell/size/timeframe/focus/CLI, CLI chains with local aliases and variables, privacy masking, and exact public snapshot links — with low-latency panel rendering.

## Acceptance criteria

- US-025-AC-001: Given the workspace host, when I drag, redock, tab, float, or pop out panels, then the layout persists locally (schema-versioned) and restores on reload; presentation stays separate from market/account/execution stores.
- US-025-AC-002: Given the PANELS menu, when I toggle panel visibility or reset a layout, then only the selected panel changes and the rest of the dock arrangement is preserved.
- US-025-AC-003: Given configurable hotkeys, when I press a bound key, then buy/sell/size/timeframe/arm-click/CLI/focus actions dispatch through the shared execution path and the capture UI stores the binding locally.
- US-025-AC-004: Given the CLI, when I type a command or chain, then it resolves aliases and variables, bounds repeat (1–10) with stop-on-error, and routes only certified actions; uncertified actions return an explicit error.
- US-025-AC-005: Given privacy mode, when I toggle it, then ticket notional/margin, account rows, and chart private state mask immediately; nothing leaks to screenshots or snapshots.
- US-025-AC-006: Given a market/timeframe selection, when I create a public snapshot link, then the link carries only exact market/timeframe values and opens a read-only public surface (cyan/amber/violet) with no execution, account, book, or chart context.
- When the workspace is measured, then inactive panels use onlyWhenVisible rendering, the lazy Dockview chunk stays under the static 80 KiB gzip cap, and panel frame updates stay within one 60Hz frame.

- Action IDs: story.us-025

## Operational contract

- Persona: Experienced Insilico terminal user arranging a power workspace.
- Preconditions: Production build; workspace host renders; hotkey/CLI/layout stores are device-local.
- Success behavior: Drag/redock/popout, hotkeys, CLI chains, privacy mode, and snapshot links all behave as labeled.
- Failure behavior: Corrupt layout falls back to defaults; unknown hotkey/CLI/alias inputs fail closed with an explicit error; floating groups are not saved as a primary layout.
- Reconnect behavior: Workspace presentation does not depend on feed state; public snapshot links remain valid during reconnect.
- Restart behavior: Layout, hotkeys, CLI preferences, and privacy state restore from device-local stores; schema-v2 rejects malformed floating-layout shapes.
- Stale/offline behavior: Dither stale-veil marks stale market panels; privacy masking stays active regardless of feed state.
- Custody expectations: Snapshot links and CLI have no credential or signing authority; CLI routes only through the certified local-execution boundary.
- Latency expectations: Hotkey→action p99 < 10ms; panel visibility toggles within one frame; workspace chunk stays under 80 KiB gzip.
- Telemetry: Record workspace action class (layout, hotkey, CLI, privacy, snapshot) and latency without account contents.
- Linked tests: `workspaceLayout.test.js`, `workspacePreset.test.js`, `workspaceLinks.test.js`, `privacyMode.test.js`, `hotkeys.test.js`, `cli/executor.test.js`, `cli/preferences.test.js`, `cli/advanced.test.js`, `workspaceHostSurface.test.js`, `workspaceRow9Surface.test.js`, `native*PortSurface.test.js`.
- Funded-mainnet evidence: Not applicable (presentation surface); certified CLI actions inherit the shared execution evidence (advanced-order certification 2026-08-06).

## Evidence log

- 2026-08-07: Workspace, hotkey, CLI, privacy, and native-port surface tests green in `bun run check`; browser drag/redock/popout evidence remains open (PLAN_3 "Workspace and render surfaces" row).
