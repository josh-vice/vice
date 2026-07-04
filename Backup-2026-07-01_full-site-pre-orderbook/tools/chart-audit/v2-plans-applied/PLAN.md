# V2-Lesson Teaching-Audit — Rollout Plan

Source: 55 per-lesson verifier plans in `./v2-audit/cN-<file>.json`.
Every add below was independently re-verified against ground-truth move anchors
(`chart-vocabulary.js`); verifiers added **0** new gaps and rejected **10** auditor
proposals. All 36 adds are anchor-valid, kind/type-matched, non-redundant, say-justified.

## 1. Totals

| Course | Lessons | Show adds | noAnchor gaps | Verifier adds | Rejected |
|--------|--------:|----------:|--------------:|--------------:|---------:|
| 1      | 11      | 16        | 4             | 0             | 1        |
| 2      | 15      | 11        | 20            | 0             | 5        |
| 3      | 8       | 4         | 6             | 0             | 2        |
| 4      | 21      | 5         | 10            | 0             | 2        |
| **All**| **55**  | **36**    | **40**        | **0**         | **10**   |

- **21** lessons need edits · **34** need NOTHING (`edits:[]`).
- No verifier ever invented an anchor → zero renderer-throw risk in the apply set.

## 2. Per course — what to edit, what to skip

### Course 1 (16 adds across 6 lessons)
| File | #adds | Most important add |
|------|------:|--------------------|
| 02_Understanding_Price_Action | 5 | open/close OHLC markers on anatomy + body-control (say names all four points, only high/low marked) |
| 07_What_is_Market_Structure | 4 | swing high/low first-reference markers on bullish + bearish (completes the higher/lower progression) |
| 08_Identifying_Market_Structure | 3 | sr-flip `breakout` marker ("breaks out and holds") + symmetric range-edge levels |
| 09_Timeframes | 2 | ltf-pullback `ll1` "lower low" (lower-low half of the say was unlabelled) |
| 03_Components_of_a_Market | 1 | `rangeHigh` "supply zone" level on finite |
| 11_LTF_Scenario | 1 | risk `zone` under the flipped level on retest-entry |
**Nothing:** 04_Support_and_Resistance, 05_Trending_Markets, 06_Rangebound_Markets, 10_HTF_Scenario, 12_Risk_Management.

### Course 2 (11 adds across 8 lessons)
| File | #adds | Most important add |
|------|------:|--------------------|
| 10_Classical_Chart_Patterns | 2 | inverse-hs left/right `shoulder` markers (parity with regular H&S) |
| 11_Classical_Pattern_Examples | 2 | trade-stop markers: `flagB` "stop below flag", `rightShoulder` "stop above right shoulder" |
| 12_Fibonacci | 2 | `swingLow`/`swingHigh` endpoint markers ("anchor from swing low to swing high") |
| 01_Trading_Styles | 1 | `flipLevel` "macro support" level on position |
| 03_Types_of_Trades | 1 | sr_flip `breakout` marker on flip (**style fix sweep→dot**) |
| 05_Exiting_Trades | 1 | `stop` level label on set-and-forget (completes the limit/stop order pair) |
| 07_Price_Action_Examples | 1 | morning_star `midpoint` level |
| 18_Divergences | 1 | `high1→high2` trendline "price tops: rising" on regular-bearish |
**Nothing:** 04_Entering_Trades, 06_Price_Action_Formations, 08_Volume_Analysis, 09_Volume_Examples, 13_Ichimoku_Kinko_Hyo, 14_Ichimoku_Market_Scenario, 15_Oscillators.

### Course 3 (4 adds across 4 lessons)
| File | #adds | Most important add |
|------|------:|--------------------|
| 09_Applying_Leverage | 2 | `breakout` "trigger = bullish engulfing" + liquidation `stop` level |
| 12_Trading_SR | 1 | sr_flip `breakout` marker on flip |
| 14_Range_Market_Scenario | 1 | `rangeLow` "range low" level on break |
**Nothing:** 02_Order_Types, 06_Executing_Orders, 10_Margin_Management, 11_Identifying_Access_Points, 13_Trading_Ranges.

### Course 4 (5 adds across 4 lessons)
| File | #adds | Most important add |
|------|------:|--------------------|
| 04_Liquidity_Structures | 2 | `reversalTop`/`reversalBottom` markers (stops-become-fuel closing clause) |
| 05_Liquidity_Scenarios | 1 | `reversalTop` "target — range high" on trap |
| 17_Crayons | 1 | `bottom` "crayon turns green" marker (symmetric to red turn) |
| 22_Positions_Heatmap | 1 | `reversal` "sweep & reverse" marker |
**Nothing:** the other 17 (03, 08, 09, 10, 11, 13, 14, 15, 16, 18, 20, 21, 25, 26, 27, 28, 29).

## 3. Consistency issues to normalize during apply

- **sr_flip `breakout` marker style** — recurring add in c2-03, c3-09, c3-12, c1-08, c1-09.
  A resistance *break* is **not** a sweep: use **dot/reversal**, not `sweep` (c2-03 explicitly
  flagged style sweep→dot). Normalize all breakout-marker styles the same way on apply.
- **Worked-trade beats — stop labels.** Multiple lessons draw the bare stop line but leave it
  unlabelled (c2-05 set-and-forget, c3-09 liquidation). When `entry/stop/target` levels exist,
  ensure all three carry labels, not just entry/target.
- **liquidity-sweep reversal endpoints.** Several lessons label support+sweep+reclaim but drop
  the completing `reversalTop`/`reversalBottom` (c4-04, c4-05, c4-22). Apply a uniform
  "target/reverse" label + place (above for Top, below for Bottom) so the trade's third pillar
  reads consistently.
- **place/side convention** (already mostly followed; enforce on apply): uptrend/high points
  `place:above`, downtrend/low points `place:below`; risk zones `tone:risk` on the (L) anchor
  below the level. Tighten label wording to the exact say snippet (done piecemeal in c4-04, c4-22).

## 4. noAnchor gaps grouped by move → candidate vocabulary growth (40 gaps)

Ranked by frequency — these are real say-taught events with **no exposed anchor**; adding an
anchor to the move would let the renderer draw them.

- **ichimoku (6)** — biggest win. Needs: a **(L) stop/risk-below-cloud level** (c2-14, c4-26,
  c4-29) and a **Tenkan/Kijun cross point** + **TK-cross marker** (c4-29, c4-10-adjacent).
  Also Tenkan/Kijun line-ID labels + cloud S/R zone (c2-13, c4-27 C-clamp pinch). One anchor
  pack unblocks the whole Ichimoku family.
- **trade_setup_long (4)** — no **point anchor on the price path** (dip-toward-stop / higher-low
  entry / market-order-at-current-price): c1-12, c2-04, c3-06. Add a `dip`/`pullback` (pt) and a
  `current`/`market` (pt).
- **sr_flip (3)** — no **stop/invalidation (L)** below the flipped level (c3-12 ×2) and no
  **trigger-candle (pt)** (c3-12). Also second-rejection/test2 (c1-04).
- **horizontal_sr (2+)** — no **4th/5th touch** anchor (c1-04 fifth-touch breakdown) and no
  **stop/trigger-candle** (c3-12).
- **consolidation_breakout (1)** — `breakdown` dir=down has no dedicated breakdown point
  (c1-06 worked around it; a `breakdown` (pt) would clean this up).
- **liquidity_sweep_bullish (1)** — no **stop (L)** below the deviation low (c4-05).
- **Single-anchor oscillator/flow moves** — cumulative_delta no `reversal` (c4-10);
  open_interest no up-leg anchor (c4-09); fsvzo no zone-flip anchor (c4-16);
  liquidation_levels no spike-high stop (c4-21). Lower priority (one-off).
- **Pattern moves with no measured-target / extra-shoulder anchors** — rising_wedge /
  falling_wedge / bull_flag have **no `target` (L)** (c2-10 ×3, c2-11 bull_flag); engulfing /
  evening_star expose no tweezer / three-inside anchor (c2-06 ×2); morning_star no support,
  three_white_soldiers no base (c2-07 ×2).

**Top vocab investments:** (1) Ichimoku stop-level + TK-cross, (2) trade_setup_long price-path
point, (3) sr_flip stop-level. These three retire ~13 of the 40 gaps.

## 5. Low-confidence / risky adds to eyeball on apply

- **c1-02** — open/close markers were the two *low*-confidence CANDLE adds (say names open/close
  as discrete points but existing shows only band the body region). Confirm they don't visually
  collide with the body band.
- **c1-07** — all 4 swing-point markers self-rated *low* (each beat already labels 2 highs + 2
  lows); these complete the first reference points but verify they don't crowd the chart.
- **c2-03** — flip `breakout` marker required a **style change (sweep→dot)**; don't apply the
  auditor's original sweep style.
- **c2-18** — `high1→high2` trendline is cross-reference-sensitive: confirm both endpoints are in
  the **same panel** (the sibling c2-15 oscillator trendline was *rejected* precisely because
  high1=RSI-panel and high2=price-panel — make sure this one isn't the same trap).
- **Rejected set (10) — do NOT reintroduce:** c1-08 fakeout/reversalTop (redundant),
  c2-03 structure/hl2 (redundant), c2-11 poleBottom + head (over-annotation), c2-15 cross-panel
  trendline (incoherent), c2-18 high1 "first peak" (redundant), c3-10 works/stop (wrong beat),
  c3-11 rangeLow "tight risk" (weak say), c4-03 ×2 reversal "filled at lows/highs"
  (geometrically incoherent / misattributed).

---
### Executive summary
- **55 lessons audited → 36 show-item adds, 40 noAnchor gaps; 0 verifier-invented anchors, 10 auditor proposals rejected.** 21 lessons need edits, 34 need nothing.
- **Apply order:** Course 1 first (16 adds, densest, includes the high-value OHLC + swing-point completions), then Course 2 (11 adds), Course 3 (4), Course 4 (5 — mostly liquidity-sweep reversal endpoints).
- **Top theme — sr_flip `breakout` marker** recurs in 5 lessons; normalize its style to **dot/reversal (not sweep)** across all of them.
- **Worked-trade beats** repeatedly draw an **unlabelled stop**; ensure entry/stop/target all carry labels on apply.
- **Biggest vocab gap is Ichimoku (6 gaps):** add a stop/risk (L) level below the cloud + a Tenkan/Kijun cross point — that plus a trade_setup_long price-path point and an sr_flip stop-level retires ~13 of 40 gaps.
- **Cautions:** eyeball the low-confidence OHLC/swing markers (c1-02, c1-07) for crowding; verify the c2-18 divergence trendline is single-panel (its c2-15 twin was rejected as cross-panel); and do **not** reintroduce any of the 10 rejected adds.
