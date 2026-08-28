# US-016: Durable customization

Story schema v2.

As a returning user, I want layouts, widgets, notes, alerts, and preferences to survive upgrades and recover safely so that customization never becomes a source of trading risk.

## Acceptance criteria

- Existing Suite localStorage records migrate through versioned IndexedDB with dual-read, validation, backup/export, rollback, and corruption recovery.
- GridStack dashboard layouts and Dockview trade layouts remain separate but share approved public context and design tokens.
- Imports reject malformed, incompatible, private, or executable content.
- US-016-AC-001: Given an upgrade or interrupted migration, when the user reopens Vice, then the prior valid state restores or the app preserves a recoverable export and starts safely.

- Action IDs: story.us-016

## Operational contract

- Persona: Long-term trader with custom dashboards and workspaces.
- Preconditions: Local storage or IndexedDB is available; otherwise the app reports reduced persistence.
- Success behavior: Changes save atomically, export/import predictably, and restore without recreating private sessions.
- Failure behavior: Invalid data is quarantined with a visible recovery path.
- Reconnect behavior: Layout state is independent from feed recovery and cannot alter data truth.
- Restart behavior: Public preferences restore; credentials, account snapshots, and signing unlocks never restore automatically.
- Stale/offline behavior: Layout actions remain available locally; live panels show their actual feed health.
- Custody expectations: Persistence contains no raw keys, signatures, or hosted signing authority.
- Latency expectations: Persistence is debounced and cannot block chart, DOM, or signing hot paths.
- Telemetry: Record anonymous migration version/outcome counts only.
- Linked tests: Migration, corruption, rollback, import, export, layout, browser-reload, and performance suites.
- Funded-mainnet evidence: None; execution controls retain their own certification gates after restore.

## Current evidence

- The preserved Hub now performs a versioned, validated, debounced best-effort mirror of `viceHub.v1` into `vice-suite` IndexedDB after every successful legacy localStorage save, including the page-hide flush. On startup, a present localStorage record remains authoritative; only an absent record may restore from a validated IndexedDB mirror before the first Hub render. IndexedDB failure cannot delay a normal Hub boot or overwrite a present record.
- The mirror stores the source key, raw record, parsed payload, schema version, and migration timestamp. It rejects invalid shapes before scheduling a write and contains no account, credential, signer, or execution data path.
- Coverage: `scripts/hub-persistence.test.mjs` exercises valid mirror, absent-record restore, and present-record preservation against the shipped script; `scripts/hub-route.test.mjs`, widget catalog validation, source typecheck, Svelte check, and production build cover the integration boundary. This is local behavior/build proof, not browser recovery; interrupted migration, browser reload, corruption recovery, and rollback drills remain open.

- Corruption recovery and rollback drills now pass: every mirror keeps the last validated raw as `previousRaw`; when the newest IndexedDB record is corrupt and no valid local record exists, restore rolls back to `previousRaw`, writes it to localStorage, and quarantines the corrupt raw (marked `quarantined` with reason and timestamp) so the user can recover it and a later healthy mirror visibly replaces it. A corrupt mirror with no valid previous raw starts safely without any restore. Coverage: `scripts/hub-persistence.test.mjs` (5 tests) plus the widget-catalog and release gates. Browser reload and multi-tab interrupted-migration drills remain open.
