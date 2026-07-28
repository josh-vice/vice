# Vicesuite — Site-Wide Audit Report
2026-07-28 · hub.js v2.12.0 → **v2.14.0** · hub.css v1.28.0 → **v1.30.0** · demo.js → 1.3.0 · vchart.js → 1.8.0 · tickers-live.js → 1.6.0
**Addendum (same day, owner: "do everything"):** the future-round list was then built too — Tier-2 inspector editor (live-apply drawer replacing the settings modal), the Element Builder's first slice (`Custom Metric` widget: metric × symbol × window × style), skeleton loading states across the native charts, per-widget staleness dots, a widget settle-in motion pass, the tightened two-row mobile bar, and a branded 404 (family-neutral — it serves every host on the project, including liqtheory.com). Details + reasoning in ADDITIONS.md §8-14; all verified live in-browser. A second adversarial review workflow (3 lenses × find+verify) then swept the new code and confirmed 9 unique defects — all fixed and re-verified before commit: inspector debounce timer now flushes-and-clears on close (a late fire could corrupt a removed block's trashed settings), skeletons settle on the engine-load failure path (they shimmered forever over the error note), Custom Metric's pills/inspector/chart now tell one clamped truth (CVD 1M silently drew 7 days), full-precision price tooltip, signed axis labels, OI forward-fill across venue feed gaps, ⌘K blocked over open drawers, gear exits native fullscreen first (the drawer was invisible but ate keystrokes), staleness marker moved to the header icon (the title dot clipped), size presets write the store directly on collapsed grids. Still open by design: hand-check drag/palette-Enter on real hardware; convert-to in the inspector; Vercel deploy is the owner's manual step and must include the api/ functions.
Backup taken FIRST: `Backup-2026-07-28_pre-site-audit/` (workspace) + `~/.openclaw/vice-backup-2026-07-28-pre-audit.tar.gz`. **Nothing deployed** — owner deploys manually per house rules.

## 1. Method (what "verified" means here)
Every page was exercised in a real browser against the live dev server (`tools/vice-dev-server.py`, API proxies live): clicked, resized (1440 / 1280 / 375), keyboard-driven, fed garbage, and abused. In parallel, a 12-agent code audit swept every source slice (6 skeptical finders → 6 adversarial verifiers; 68 raw findings → 65 survived verification, of which ~20 were user-visible defects worth fixing now). Zero console errors across every surface, before and after.
Automation limits (flagged, not fixable from here): gridstack drag and the Enter/`?` keys don't respond to synthesized input — code paths are stock/correct by inspection; hand-check drag + palette-Enter once after deploy (same B2/B3 artifacts as the prior audit).

## 2. Verdict on the product
The engine underneath (registry, store+migrations, linked symbols, Focus, Scanner) is genuinely excellent — that assessment survived an adversarial pass. The failures were at the seams: two prominent surfaces shipped with **no CSS at all** (add-tray search, Focus search internals), navigation state leaked between modes, the marketing site described a product three versions old, and a dozen widgets had error states that stacked, lied, or never appeared. All fixed.

## 3. What changed (worst offenders first)
**Broken-looking surfaces (before → after)**
- Add-tray search + "Browse the Element Gallery" rendered as raw white browser controls → styled in the house language (H1/E-6/C-1).
- Focus search: group headers rendered as plain body text, symbol+name ran together → proper category headers + bold-symbol/muted-name hierarchy (H2/E-7/C-2).
- ⋮ menu opened half off-screen whenever the bar wrapped → smart anchor flip (H7).
- News widget header read "· all so…" at the default desktop width → label removed (its tabs already carry the state), separator moved to CSS so it can never orphan, 3ch title floor (H3, M4-lineage).
- Native prompt()/confirm() for layout ops → in-UI modals with danger styling and consequence copy (H9).

**Real bugs**
- vAlerts: `new Notification()` throws on Android Chrome *inside the alert-clear filter* — crossed alerts re-fired forever, silently (W1-01) → try/caught.
- vLiqMap/vHeat/vFng: error notes stacked every poll and survived recovery, permanently eating hover on the live chart (W1-02/W2-2) → single reusable note, cleared on recovery.
- vNotes lost up to 400ms of typing on every unmount (W1-03) → flush on destroy; plus a pagehide flush for the store's own 250ms debounce (E-13).
- Focus-mode state machine: entering Focus from a section left the stale hash (reload landed in the section); leaving Focus via the brand link stranded a ghost board; the news probe raced navigation; editing state leaked in (dead Tidy button, drag-live ephemeral boards); ⋮ Reset/Delete/Import rebuilt the canvas under a live Focus board (E-1..E-4, H5, H11) → all sequenced correctly now.
- `F`/`E` shortcuts leaked their keystroke into the just-focused input — Focus search opened pre-filtered to "f" (H4).
- Section/layout switches kept the old scroll position — users landed mid-page (H8) → scroll-to-top everywhere it matters.
- Storage reads outside try/catch could kill the whole boot in blocked-storage contexts (E-5).
- vOIHist's direct-venue fallback stacked misaligned series into wrong totals → fallback now draws honest unstacked lines; aggregator path unchanged (W2-1).
- vDvol tooltip showed "Invalid Date" (string axisValue) (W2-3).
- vScreener: news mode never refreshed; fake "Auto" refresh option; sort headers keyboard-unreachable; face tabs didn't persist (W2-5..9).
- A stale mobile rule hid the palette button — the Hub's only search — on ≤768px (C-4). The alerts empty-note blanketed the fired-history list and ate its clear button (C-5). Edit-grid guides drew 24 columns while gridstack snapped to 6 between 769-900px (C-9).
- Chart-bot engine: `btc 6h` was flat broken (HL throw skipped the Coinbase fallback the TF table was built for); pane indicators plotted values from the wrong bars when `from:` trimmed candles; a future `from:` date crashed with a raw TypeError (X-DEMO-*) → all fixed and re-run live.
- vchart sumTo mis-apportioned hourly flows on TFs that don't divide 60 (45m showed 150%/75% hours) → true overlap weighting. Indicator settings popovers stacked on repeat gear clicks → toggle.
- API: vice-coinalyze could cache an empty market map for 6h (poisoned instance); vice-stats had no upstream timeout. Dev mirror drift closed (safe number parsing, OKX liq param parity, docstring).

**Marketing site**
- Landing Hub card was three versions stale ("22 widgets", "Crypto/Stocks/Macro", "edit mode") and sold none of the differentiators → rewritten: 50+ elements, Scanner, Focus, presets/JSON (L1/M-1/M-2/M-11).
- Tickers page: the live repaint destroyed sub-$10 precision (XRP "$1.16", "Up $0.01"), showed "(-0.89%)" double-negatives, only ever flashed the first row per coin, and the roster card repeated the coin code → 4-dp small prices/diffs, bot-accurate status format, per-element flash, "↘ $63,899" roster lines (M-4/5/6, T1).
- All four pages: og:image/twitter:image added (link shares were imageless), heading order h2→h3 fixed, hub footer gained the missing Discord link, one below-fold caption moved to scroll-reveal, ~60 lines of dead CSS removed (vice.css mock-sidebar/hero-kicker/btn-gold; hub.css retired section pages, dead vcp rules, contradicted alert rule, duplicate blocks).

**Copy/honesty**
- vChartPro no longer claims an "order-book heatmap" (it's a modeled liquidation heatmap); gallery provenance corrected for six HL-only widgets that claimed 5-venue aggregates; news empty-state no longer tells production users to visit vicesuite.com; vFunding explains an empty watchlist instead of showing a bare header (W1-07/08, W2-6, X-HEATMAP-COPY).

## 4. Added (Phase 4 — see ADDITIONS.md for reasoning)
Keyboard-shortcuts sheet (`?` + ⋮ entry) · in-UI dialogs · honest live dot (grays when the feed stalls) · native Screener row on the TradFi preset · vPositioning loading state · og:images · seasonality retitles · aria-current on nav · modal focus management (role/aria-modal/initial focus/restore) · ⌘K blocked over open modals · gallery card tooltips · feed-link protocol hardening.

## 5. Stress test results
- Corrupted store → clean recovery + toast with Import action + rescue copy kept. ✓
- 8× rapid layout switching → 10 widgets, no dupes/leaks, zero console errors. ✓
- Deep link `#/scanner/0x000…000` → inspector opens on arrival, every empty state designed. ✓
- Garbage alert input → toast "target can be 70000, 70k, or +5%", row rejected; valid "70k" parses. ✓
- `btc 6h`, `btc from:2027-01-01` → render / friendly error. ✓
- Mobile 375px full pass (bar, boards, Scanner table); iframe scroll-eating noted as inherent to TV embeds. ✓
- Section switches mid-scroll, Focus enter/exit loops, tray restore, settings save, linked-symbol broadcast, TF pills, indicator mount — all re-verified post-fix. ✓
- `node --check` on all 13 JS files + `py_compile` on the dev server: clean. (No build/lint/test tooling exists in this repo.)

## 6. Design-system note (Phase 2)
The token system in vice.css IS the canonical system and the codebase already adheres to it tightly (41 uses of --radius, 29 of --radius-lg, one type family, 100-240ms motion band, reduced-motion on every animation — now including the last three stragglers). Verdict: consolidation meant deleting the dead/contradicting rules and dressing the two unstyled surfaces IN the system, not inventing a new one. The deliberate exceptions stay: Discord-mock palette (depicts Discord), venue/tenor chart hues (data vocabulary).

## 7. Flag for a future round
- Hand-verify drag + palette-Enter on real hardware (automation-blind spots).
- Deploy prerequisites unchanged: prod still needs `api/vice-headlines` (full=1) + `api/vice-hlboard` function deploys for News tabs/symbol stories and Scanner.
- Parked: branded 404 (host-aware decision), per-widget staleness dots (do with Tier-2 inspector), Element Builder (Tier 3), mobile bar redesign (owner-parked), unmount-on-far-scroll for huge layouts (prior-audit §7, unchanged).
- The B4 compositor tearing note from the prior audit remains environment-only.
