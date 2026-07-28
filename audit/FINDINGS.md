# Vicesuite — Findings (Phase 1)
Sources: runtime audit in browser (this session) + 12-agent adversarial code audit (findings marked [wf]).
Status key: OPEN · FIXED · WONTFIX (with reason) · UNVERIFIABLE (automation limit)

Scores (1–5, function/design/cohesion/interaction/copy), evidence-based:
- Landing `/` — 5/4/5/4/2 — copy axis fails: Hub card materially false (see L1). Everything else exercised clean.
- `/chartbot` — 5/5/5/5/5 — live demo ran 2 commands with live data; gallery, reference all coherent.
- `/pricebots` — 5/4/5/4/4 — live prices verified on cards+mock; T1 duplication nit.
- Hub Dashboard — 5/4/4/4/5 — zero console errors through the whole session; H-series below.
- Hub Chart section — 5/5/5/5/5 — symbol/TF/indicators/heatmap exercised; indicator pane mounted live.
- Hub Scanner — 5/5/4/4/5 — board→star→tracked→inspector→deep sections all exercised live.
- Hub Gallery — 5/5/5/4/5 — search/chips/preview drawer/add exercised; H12 truncation nit.
- Add tray — 5/2/2/4/5 — functional, but H1 makes it look broken.
- Focus search — 5/2/2/4/5 — functional; H2 unstyled internals; H4 key leak.
- Focus mode — 5/5/5/4/5 — board composed live for BTC (news/positioning/funding all real).
- Settings modal — 5/5/5/5/5 — schema-generated form rendered correct values, sanitization code-read.
- ⋮ menu — 4/4/5/4/5 — H7 clipping when bar wraps.
- Mobile (375px) — 4/4/4/4/5 — single column works; H8 scroll carry-over; 3-row bar is heavy but tolerable.

## Critical
(none found — no data loss, no crashes, zero console errors across every surface exercised)

## Major
- **H1 — Add tray contains two unstyled elements.** `.hub-tray-search` and `.hub-tray-gallery` are emitted by `openTray()` (hub.js ~3861) but exist in no stylesheet: the search renders as a raw white browser input, the Gallery link as a default gray button. The tray is the storefront; it looks broken. Fix: style both in hub.css to match `.vgal-search` / tray-item language. **FIXED**
- **H2 — Focus search internals unstyled.** `.hub-palette-cat`, `.fs-l`, `.fs-sub` (hub.js `openFocusSearch`) styled nowhere: group headers render as plain full-size text, symbol+name run together in one undifferentiated string. Fix: category header style (10px uppercase muted), `.fs-l` bold text color, `.fs-sub` muted 11px ellipsis. **FIXED**
- **H3 — News widget header reads "· all so…" at the default desktop width.** `.hw-t1` may shrink to zero (context-first truncation), leaving a dangling middot; News's label ("all sources") duplicates the tabs inside the widget anyway. Fix: drop `label` from the news manifest; move the middot into a `.hw-t2::before` so it can never orphan; keep a small min-width on `.hw-t1`. **FIXED**
- **H4 — Shortcut keys leak into the search input.** Pressing `F` opens Focus search with "f" pre-typed (filtered to F-coins) because the handler never calls preventDefault (hub.js `startShortcuts`). Same latent issue for `/` (has preventDefault — fine) and `e`. Fix: preventDefault on the f/e branches. **FIXED**
- **H5 — Editing state leaks into Focus mode and sections.** Enter Customize → click into Focus/Chart/Scanner: `editing` stays true; the dead `Tidy` button sits in the bar (its handler no-ops outside the dashboard) and Focus boards are drag-live. Fix: exit editing when entering Focus or a section; hide `#hub-tidy` under `body.focused`/`body.in-section`. **FIXED**
- **H7 — ⋮ menu clips off-screen when the bar wraps.** Menu is hard-anchored `right:0`; when flex-wrap puts the ⋮ at the row start (editing mode ≤~1300px, mobile), most of the menu renders outside the viewport (screenshot-confirmed). Fix: on open, measure and flip the anchor when there's no room to the left. **FIXED**
- **H8 — Section switches keep the old scroll position.** Scrolled down on Dashboard → tap Scanner → land mid-leaderboard with the header off-screen (screenshot-confirmed on mobile; same on desktop). Fix: scroll to top on section enter/exit and layout switch. **FIXED**
- **L1 — Landing page Hub card is materially false.** "22 widgets" (there are 50), "named layouts: Crypto, Stocks, Macro" (presets are DeFi/TradFi/Macro), "edit mode" (renamed Customize), and none of the differentiators (Scanner, Focus, native chart engine, 22 futures/options analytics) appear. The marketing page undersells the flagship. Fix: rewrite the card + feature list; align description meta. **FIXED**

## Polish
- **H6 — vPositioning mounts blank.** Scanning 100 books takes ~10-20s with no loading state (screenshot-confirmed). Fix: immediate "reading the top-100 books…" note on mount. **FIXED**
- **H9 — Native prompt()/confirm() in layout management.** New/rename/delete/reset use browser dialogs — the only unstyled surfaces left in the product; jarring against the modal system. Fix: tiny promptModal/confirmModal built on the existing `modal()`. **FIXED**
- **H10 — The bar's live dot always pulses green** even when the HL feed is dead (price shows "—"). Fix: tie dot color/animation to feed freshness (gray + paused when stale >15s). **FIXED**
- **H11 — Focus entered from a section leaves that section's hash.** `#/scanner` stays in the URL while the Focus board renders; reload lands back in Scanner. Fix: clear the hash (replaceState) when entering Focus from a section. **FIXED**
- **H12 — Gallery card titles truncate ambiguously.** The two seasonality widgets both render "1m Average Retur…"; cards have no title tooltip. Fix: `title` attr on cards; retitle the pair "Avg Return by Hour (1m)" / "Avg Return by Day (1m)". **FIXED**
- **H13 — Dead CSS from retired section pages.** `.vpage-grid.cols4`, `.vpage-opt`, `.vpage-stats` blocks (~40 lines) have no emitters since the Futures/Options/Markets pages were folded into the catalog. Fix: delete. **FIXED**
- **H14 — Mobile bar in sections wastes a row** on a lone ⋮. Fix: (small) let the nav row absorb it — moved ⋮ ordering fix out of scope; instead reduced bar row gap on mobile. **FIXED (light)**
- **T1 — Tickers roster card repeats the coin code** ("$BTC / Bitcoin / BTC ↘ $63,733"). The third line is meant to preview the bot's nickname; on a card under a $BTC heading it reads as duplication. Fix: keep the line (it IS the nickname preview) but drop the leading code: "↘ $63,733". **FIXED**
- **N1 — News/screener feed links unhardened.** RSS-derived hrefs are escaped but not protocol-checked. Fix: only http(s) URLs render as links. **FIXED**
- **A11y-1 — Active nav tab lacks aria-current; sections/nav have no shortcut discoverability.** Fix: aria-current="page" in navSync; add a Keyboard-shortcuts modal (⋮ menu + `?` key). **FIXED**

## Cohesion section (where the Hub disagrees with itself)
1. The two unstyled surfaces (H1/H2) vs. the otherwise-consistent chrome — worst offenders, fixed.
2. Native browser dialogs (H9) vs. the custom modal system — fixed.
3. Marketing copy vs. product reality (L1) — fixed.
4. Truncation behavior: header context-first truncation produced orphan separators (H3) — fixed.
5. Toast/action patterns, chip/pill language, focus rings, empty states, reduced-motion coverage: **checked and consistent** across dashboard, sections, drawers, modals (evidence: exercised every surface; every interactive class has hover+active+focus-visible in hub.css; every animation has a reduced-motion guard — verified by grep and by the css audit agent).

## Workflow-confirmed code findings folded in ([wf], see REPORT for full list)
- W-vNotes-dup: duplicating a Notes widget copies the note text (settings.text) — intended (settings copy); verified acceptable. WONTFIX.
- E-tape-h: legacy tapes taller than 1 row are migrated at load — verified working; no action.
- X-okx-liq: vice-okx `liq` path caps `limit` at 100 but dev mirror hardcodes 100 — parity confirmed; no action.
- (Full verifier-confirmed list with dispositions lives in audit/REPORT.md §3.)

## Unverifiable under automation (flagged for a human hand-check)
- Gridstack drag/resize via real pointer (B3 lineage): synthesized drags don't move blocks; config is stock and geometry-lock toggling was verified. Check drag on trackpad once after deploy.
- Palette/search Enter key (B2 lineage): automation sends key="Return"; handlers listen for "Enter" (correct per spec). Click paths verified working.
- requestFullscreen (gesture-gated); in-page maximize fallback code-read and styled.
