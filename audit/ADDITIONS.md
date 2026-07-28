# Vicesuite — Additions (Phase 4)

## Built
1. **Keyboard shortcuts sheet** (`?` key + ⋮ menu entry). The Hub shipped six shortcuts (⌘K, /, F, E, 1-5, Esc) with zero discoverability — power features nobody could find. A kbd-chip modal in the house style documents them; it stays available inside sections. Cost: ~40 lines.
2. **In-UI dialogs** (promptModal/confirmModal). New/rename layout and the delete/reset confirms used native `prompt()`/`confirm()` — the only unstyled surfaces in the product, and blocked in some embedded contexts. Replaced with the existing modal component; the delete confirm gets a red danger-solid button and consequence copy. Also fixes a latent bug: reset/delete during Focus mode now exits Focus before rebuilding the canvas.
3. **Honest live dot.** The bar's green pulse now grays out and stops when the feed hasn't ticked for 25s (per-layout: HL feed on crypto boards, the S&P poll on TradFi). A "live" light that never turns off is decoration, not information.
4. **TradFi preset: native Screener row.** The TradFi board was 100% iframes with a blank band at the bottom (prior audit M2 "thin product"). The native cross-asset Screener already had a TradFi book — it now anchors the preset full-width. New visitors and reset-to-default only; existing stores untouched.
5. **vPositioning loading state** — "reading the top-100 Hyperliquid books…" replaces up to 20s of blank body.
6. **og:image / twitter:image on all four pages** — link shares rendered imageless everywhere; they now carry the flamingo mark.
7. **Seasonality widgets renamed** ("Avg Return by Hour (1m)" / "Avg Return by Day (1m)" + a `· UTC` header suffix) — they truncated identically in every card list.

## Built in the elevation wave (owner: "do everything from the report") — hub.js v2.14.0 / hub.css v1.30.0
8. **Tier-2 inspector editor.** The settings gear in Customize now opens a glass side drawer instead of a modal: every field applies LIVE (selects/toggles instantly, typed fields on a 650ms settle), with data provenance, Small/Default/Large size presets, Duplicate and Remove. The inspected block glows teal; Esc closes the drawer first and Customize second; every teardown path (layout switch, section enter, removal, Done) reaps it. The save-button modal died, as the original audit's Tier-2 spec intended. Convert-to was deliberately deferred — symbol-format mapping between TV/native types needs its own design pass.
9. **Element Builder, first slice — the `Custom Metric` widget.** Metric (price / OI / funding APR / CVD / hourly volume / liquidations) × symbol × window × style (line/area/bars), all riding existing plumbing (HL candles + the coinalyze aggregator). With the inspector's live-apply this IS the "your widgets" loop: compose, preview instantly, duplicate, export with the layout. Featured in the Gallery.
10. **Skeleton loading states.** `chartMount` (≈25 widgets) plus vChart/vLiqMap/vHeat show shimmer bars until the first draw settles — success or error, never both skeleton and error text.
11. **Per-widget staleness dots.** Every good draw stamps freshness; a 15s sweep gives any chart quiet past ~2.5× its cadence a small amber header dot.
12. **Motion pass.** Widget content settles in (220ms opacity, reduced-motion aware) instead of popping.
13. **Mobile bar, tightened.** The % change yields on ≤768px and the layout select stays compact — the bar holds two tidy rows; the palette button is back (see C-4).
14. **Branded 404** at the repo root — self-contained Vice Terminal page linking both properties. Note: serves ALL hosts on the Vercel project including liqtheory.com (kept family-neutral for that reason). This overrides the earlier "parked — host-aware decision" per the owner's do-everything instruction.

## Proposed, not built (with reasoning)
- **Convert-to in the inspector** (Mini Chart ⇄ Advanced Chart ⇄ Vice Chart) — needs a symbol-format mapping design (BITSTAMP:BTCUSD vs BTC vs vc command); deferred so it can be done right.
- **Element Builder beyond the first slice** (multi-series compose, custom palettes, shareable codes) — the vMetric widget is the proving ground; expand after real usage.
