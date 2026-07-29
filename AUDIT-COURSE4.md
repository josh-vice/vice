# COURSE 4 "LIQUIDITY THEORY" CONTENT AUDIT — (30 lessons)

> Companion to `AUDIT.md` §4. Execute Phase 6 from here — every finding carries file:line.
> Paths: `v2/` = `lessons-v2/lessons/Course4/` · `data` = `lt-data-course4.js` · `mq` = `lt-module-quizzes.js` · `vocab` = `lessons-v2/chart-vocabulary.js`.
> Engine chapter id = lesson − 1. L26=data:3047-3163, L27=3164-3282, L28=3283-3413, L29=3414-3539, L30=3540-3645. **Lesson 16 has NO source transcript** (`has_transcript:false`) — audited against curriculum facts. Auditors verified every `show[]` anchor/stage against the vocabulary and executed chartgen to check rendered wick geometry.

**Overall:** engine data largely faithful with ~8 discrete P0 factual errors (PAL inversion worst — it grades wrong answers); v2 lessons clean for 01–12 core doctrine but **systematically diverge for the indicator suite (13–18), Hyblock (19–25), and Ichimoku (27–29)** — invented generic mechanics standing in for the tools' real, quiz-tested behavior. Module quiz keys 95% correct; mq:390 (C-clamp) is the one outright wrong key.

---

## L01 — Introduction
1. CONTENT: mostly OK. P2 `v2/01:39` — missing "who is in control" theme + "to go up you need to go down first" teaser — add one CONCEPT beat.
2. CHART: OK — data:87-93 sweep/reclaim + CVD flip correctly shows the "1-2 punch". 3. PACING: OK. 4. QUIZ: OK (data:106).

## L02 — The Four Principles
1. CONTENT: principles 1-4 letter-for-letter ✓. [P1] `v2/02:67` — liquidity/slippage definition ("filled with minimum slippage", $50 example) never taught though module quiz tests it twice — insert a "What Is Liquidity?" beat. P2 `:81` recap omits "maximum pain" + "liquidity is contextual".
2. CHART: OK (data:163-177 equal-lows→sweep verified). 3. PACING: OK. 4. QUIZ: OK (data:200-207).

## L03 — Identifying Liquidity
1. CONTENT: OK — pools, engineering, SFP + multiple-days rule, depletion, buffers faithful.
2. CHART: OK — geometry verified (vocab:270/:319/:1337).
3. PACING: P2 `v2/03:102` duplicate below-support zone re-drawn (first at :90) — drop one.
4. QUIZ: correct. [P1] `data:305` — "Stop — Above Swept Cluster (buffer)" markLine at 108.5 sits INSIDE the SFP wick (rendered high 112.82) — move to ~114.

## L04 — Liquidity Structures
1. CONTENT: **[P0] `data:371` — "breaks below range low trapping longs" — wrong party; longs get stopped, breakdown SHORTS are trapped — one-word fix.** P2 `v2/04:42,:55` collapses the two victim groups.
2. CHART: [P1] `v2/04:39/:52` — under-over drawn with `liquidity_sweep_*` (single-candle deviation, no time below, no retest) = what the course defines as a POOL, erasing the tested structure-vs-pool distinction — add `under_over`/`over_under` vocab moves with retest anchor. [P1] `data:406` — stop markLine 80 inside the fake-breakdown wick (low 76.36) — move to ~75. P2 `data:436` "above fake-breakout wick" 113 vs wick 113.4 — ~115.
3. PACING: P2 `v2/04:43,:56` — outcome marker listed before trap markers + 4-op dump — reorder + split sweep→reversal.
4. QUIZ: OK (data:452-489).

## L05 — Liquidity Scenarios
1. CONTENT: **[P0] `v2/05:42` (+:17,:47) — teaches entry on the RECLAIM candle; transcript AND the engine's own data:521 teach entry on the RETEST — direct in-app contradiction.** [P1] :7-78 only 1 of 3 promised scenarios (bearish over-under + pool-vs-structure walkthrough missing). P2 :53 drops stop-buffer nuance, invents a trailing rule.
2. CHART: [P1] :38-42 single-candle sweep again + continuity break — fix with the under_over move.
3. PACING: P2 :43-48 — 5 annotations one beat vs sequential say — split sweep→reversal.
4. QUIZ: key correct, BUT [P1] `data:562`/`:593` — the "pool" candle `{to:88,bars:1,reject:8}` renders its wick on the UPPER side (high 96.34): "Single Wick — Pool!" labels a non-pool — make the leg downward. P2 `data:540` reclaim wick pre-tags target; `:513` invented midpoint-gauge; `:524` "LTE" typo for "LTF".

## L06 — Who Is in Control Primer
1. CONTENT: OK. P2 `data:643` "SA data often leads TA" invented — soften. P2 `v2/06:25-33` add a line naming the coming variables.
2. CHART: OK (data:650-674). 3. PACING: OK.
4. QUIZ: key right, but [P1] `data:701` (+:644) treats price↓+OI↑ as a bullish squeeze ingredient while ch8's rule (data:1109) forbids it — harmonize (add funding/TA-confluence exception to ch8, or switch to falling OI). Cross-chapter contradiction, fix as one unit with L07/L09.

## L07 — Sentiment Analysis Variables (+ Sentiment Board lab)
1. CONTENT: OK — four variables match exactly. P2 `v2/07:39` add contango/backwardation to the basis preview (quiz-tested).
2. CHART: OK. 3. PACING: OK.
4. QUIZ/LAB: answerable. P2 `data:829-861` position-SIZING framework invented (transcript: confidence/confluence) — reword to conviction. Lab placement OK (data:746-758); P2 :753 "each signal alone is noise" overstates; [P1] :754 (+:782) repeats the OI contradiction — fix with L06/L09.

## L08 — Funding Rate
1. CONTENT: OK core (data:880-886 ✓ 8h×3, interest+premium). P2 `v2/08:25` composition block absent from v2 — add one beat.
2. CHART: extreme→flip genuine (vocab:1162-1178 ✓). P2 `data:920`/`:947` — funding sub-panel crosses zero 1-2 bars BEFORE the labeled "Higher/Lower Low Forming" pins — shift zero-cross to idx14 / hold ≥+0.03 through idx13. P2 v2 shows only the positive-extreme side.
3. PACING: P2 `v2/08:36-48` 3 sequential-story markers one reveal — split rising→extreme→flip.
4. QUIZ: OK. P2 `data:991` explanation −0.15%/8h vs panel −0.085 — align.

## L09 — Open Interest
1. CONTENT: definitions ✓. [P1] `v2/09:36-47` — the four price/OI quadrants (4 module-quiz questions) never presented — add a 2×2 table beat with the video's labels ("Weak Trend"/"Strengthening Trend"). P2 `data:1015-1016` semantically faithful but lexically opposite the slide — add source vocabulary parenthetically.
2. CHART: OK (vocab:1180-1195 ✓). 3. PACING: P2 `v2/09:29-33` 3-marker dump — split.
4. QUIZ: OK, but [P1] `data:1109` absolute "never counter-trend long, wait for OI to fall" contradicts ch5/ch6 max-conviction setup — qualify.

## L10 — Cumulative Delta
1. CONTENT: [P1] `v2/10:22-47` — teaches delta DIVERGENCE (not in transcript), omits the actual mechanism (very red = shorts too aggressive / very green = longs too excited → offside at a level) — make extreme-imbalance primary.
2. CHART: OK for what it draws. 3. PACING: P2 `v2/10:29-32` split. 4. QUIZ: OK.

## L11 — Futures Basis
1. CONTENT: **[P0] `v2/11:25` — the words CONTANGO/BACKWARDATION never appear in the lesson (zero grep hits) though both quizzes test them by name — name both states.** [P1] :42-47 backwardation-extreme→snapback→bottom signal (half the transcript) reduced to one clause — add a second CHART beat.
2. CHART: [P1] `vocab:1222` — `future_basis` series only reaches −0.1 on the discount side, no recovery leg — deepen to ≈−0.8 + snapback anchor.
3. PACING: P2 `v2/11:36-48` split premium/collapse.
4. QUIZ: OK (data:1334-1368, true numbers $600/−$800).

## L12 — Applying Sentiment (Summary)
1. CONTENT: v2 OK. [P1] `data:1397` (+1405,1443,1457,1461) — position-size-scales-with-SA-count invented ("max size", "half size on 2/4"); transcript ties count to CONVICTION only — reframe, delete size prescriptions.
2. CHART: OK — 4-sub-panel confluence introChart (data:1409-1439) consistent with L8-11. P2 data:1457-1459 markArea claims "Funding ✓ Δ ✓" but only funding renders — add cvd panel or drop "Δ ✓".
3. PACING: OK. 4. QUIZ: OK (data:1466-1481).

## L13 — Trend Buddy
1. CONTENT: **[P0] `v2/13:29` — the full colour taxonomy (~7 of 9 transcript minutes) absent: blue unconfirmed / lime confirmed / red canceled / green reconfirmed reversals, orange/fuchsia pivots, purple/dark-green breakouts, yellow combo, "enter within 1-2 turquoise closes" — add 2-3 beats; makes mq:359/:360 unanswerable.**
2. CHART: [P1] `vocab:87,:95-101` — 3-colour momentum auto-painter can't show reversal/pivot/breakout candles — add a scripted per-candle colour sequence mirroring data:1540-1547.
3. PACING: OK (coverage is the issue). 4. QUIZ: chapter OK. P2 data:1499-1521 add green-reconfirmed + yellow-combo bullets.

## L14 — PAL
1. CONTENT: **[P0] `v2/14:29` — "colours the candles by trend" invented; PAL overlays circles/AP/F/triangles on normal candles (frame-confirmed) — rewrite beat, drop `scheme:'pal'`.** [P1] zero mention of absorption/AP/exhaustion circles; mq:361 unanswerable.
2. CHART: [P1] `vocab:1239-1272` — no circle/AP anchors — add exhaustion-circle + AP markers at the W-shape's touches.
3. PACING: P2 `v2/14:30-37` 6-annotation dump — split levels/reactions.
4. QUIZ: **[P0] `data:1640-1641` — Red/Green AP absorption meanings INVERTED vs transcript ("red AP… seller absorption"); [P0] `data:1651-1652,1682-1698,1701-1730` — lesson section, lessonChart, AND quiz all built on the inversion → the chapter TEACHES AND GRADES THE WRONG ANSWER. Swap Green AP = large buyer everywhere. (Exhaustion circles at 1637-1638 correct — don't touch.)**

## L15 — Heuristics
1. CONTENT: **[P0] `v2/15:29` — "candles colour-coded by momentum" invented; the tool is an MA channel + arrows + exhaustion dots (frame-confirmed) — rewrite around channel-relative bias.** [P1] channel bias, MA lookback 36, green dots = seller / red dots = buyer exhaustion, "meat of the trend" all missing.
2. CHART: [P1] `vocab:1239` — no move can draw an MA channel + dots — add a `heuristics` move mirroring data:1773-1793.
3. PACING: OK post-rebuild. 4. QUIZ: chapter OK (red dot = buyer exhaustion ✓). P2 data:1752-1753 add dots-as-take-profit (mq:367 tests it).

## L16 — FSVZO *(no source transcript)*
1. CONTENT: **[P0] `data:1870` — "White MA crosses the band boundaries to generate signals" is exactly the statement mq:365 marks WRONG — reword to band-positioning vs OB/OS.** [P1] `v2/16:39,:43` zone-flip framed as the key signal vs curriculum's OB/OS + painted divergences. [P1] :12-63 — 3 of 4 official facts missing (R+H divergences painted on price, OB/OS thresholds, hues = profit-taking). **[P1] `data:1863` — videoUrl `Ioxmip6tjsQ` vs manifest `IoxmIP6tjsQ` (case-sensitive → broken embed).** P2 align v2 to engine mechanics.
2. CHART: OK-with-caveat (anchors exist); P2 no OB/OS band lines in the sub-panel.
3. PACING: P2 `v2/16:27-34` split; second flip unmarked. 4. QUIZ: OK. P2 data:1938 distractor references nonexistent downtrend.

## L17 — Crayons
1. CONTENT: [P1] `v2/17:11-63` — only 3 of ~8 colours, no W/H/B signals, no yellow/turquoise exhaustion, no blue/dark-blue hierarchy, no "first/second green close" entry (legend frame-confirmed) — add beats. P2 :11 premium-handoff clash; `data:1975` reword.
2. CHART: OK. 3. PACING: P2 `v2/17:23-34` split.
4. QUIZ: correct (orange pivot → TP longs). [P1] `data:2092` — invented "Fuchsia = Bullish Pivot" rule — delete/verify.

## L18 — Genie
1. CONTENT: **[P0] `v2/18:58` (+:30,:53) — teaches "best on HTF" with zero scalping mention; transcript pitches an LTF scalping/momentum tool, and mq:364 marks the HTF-swing claim FALSE — the lesson primes students to fail the quiz.** [P1] arrows/triggers omitted. [P1] `data:2131` (+2109,2191) invented "not for swing trades / 1-3 candle holds" — soften (transcript allows HTF top/bottom estimation).
2. CHART: mechanism OK; P2 real Genie renders in a sub-panel, not painted candles — note in narration.
3. PACING: OK. 4. QUIZ: OK; trim invented holding-period in :2191.

## L19 — Hyblock Platform Overview
1. CONTENT: **[P0] `data:2237` (+2241-2245,2251) — "five tabs" vs the transcript's SIX (Market Depth Heatmap omitted) — fix count + add tab.** [P1] `v2/19:11-49` — no tab tour at all though both quizzes test tab knowledge — add tabs + workflow beats. P2 :25 pre-empts L20; `data:2258,:2335` WHERE→WHO→HOW invented (harmless, flag).
2. CHART: OK. 3. PACING: P2 3 CONCEPT beats, zero visuals — add one CHART beat. 4. QUIZ: OK.

## L20 — Liquidation Levels
1. CONTENT: **[P0] `data:2360` — liquidation numbers off by one leverage tier + invented impossible $6,800 entry; transcript: 25x→$7,955, 50x→$7,790, 100x→$7,711 — replace.** [P1] `data:2353-2361` headline claim missing (higher position size → higher hit rate; mq:378's source) — add bullet. [P1] `v2/20:11-67` tool mechanics absent (red/green entry dots, tier bubble colours, bubble size ∝ position size, size filter, S/R matching) — add a legend beat.
2. CHART: theory geometry OK (vocab:1283-1307 ✓); [P1] `v2/20:26-37` the tool's own visual language never rendered.
3. PACING: [P1] `v2/20:27` — stage `'all'` + 6 ops defeats the move's approach/pierce/reversal stages; un-narrated reversal pre-drawn — split into 2-3 staged beats. P2 :35-36 stacked labels at i10.
4. QUIZ: scenario OK, but [P1] `data:2425` — answer says liquidated longs "create buying pressure"; they are forced SELLS (own explanation :2448 agrees) — reword.

## L21 — Liquidation Level Scenario
1. CONTENT: [P1] `v2/21:42` — story ends at the lower-cluster tag; the payoff (bullish rebound off swept 50x/25x longs in the mini-DBS) missing — add closing beat/marker. P2 :28,:42 storyboard cross-ref + rule-of-fives missing; invented "short the failure".
2. CHART: OK — all anchors verified; caveat: vocab move has no rebound leg (needed for the P1).
3. PACING: P2 :32-33 magnet+cascade labels stack on same candle; :44 re-adds a third — drop duplicates.
4. QUIZ: key correct. **[P0] `data:2474` (+`:2484`) — "$6,346 short cluster" misattributed: that's L23's mid-range; this lesson's shorts sit off ~$6,600-6,800 entries — replace figure.**

## L22 — Positions Heatmap
1. CONTENT: **[P0] `v2/22:11,16-17,28,53` — heatmap misdefined as LIQUIDATION DENSITY; it is cumulative net long/short position entries/exits (order-book/volume-profile style) — reword all four spots.** [P1] :11-34 three sub-heatmaps + bright=entries/dark=exits scale missing. (Brightness direction itself correct.)
2. CHART: [P1] :25-34 — reuses the L20/21 liquidation-magnet chart; real tool is full-width bands — draw short-block above / long-block below bands, drop the sweep replay.
3. PACING: P2 :29-34 5-op dump — split. 4. QUIZ: OK (data:2658-2690 ✓).

## L23 — Combining Sentiment Data
1. CONTENT: **[P0] `v2/23:11,25` — the "spot the blocks / plot the blocks" walkthrough (short block ~6,370 + short liqs ~6,300 + mid-range 6,346 → short squeeze) replaced by a generic lecture whose worked example runs the OPPOSITE direction — rewrite around the transcript's example.** **[P0] bright=opening / dark=closing definition absent from v2 22 AND 23 — add.** P2 :53 retitle recap.
2. CHART: [P1] zero CHART beats for a chart-walkthrough lesson — add range + short-block band + squeeze/retest beats.
3. PACING: [P1] four consecutive CONCEPT panels (fixed by CHART beats).
4. QUIZ: OK (data:2782-2812). P2 `data:2724` (+:2766) Fib misplaced into the 6,346 confluence; transcript applies Fib to the upside target — reattach.

## L24 — Trading Activity
1. CONTENT: **[P0] `v2/24:12,26,40` — entire lesson is invented "aggression/absorption" order-flow content; the real Trading Activity tab is a dashboard (cumulative L/S delta, cumulative aggressive longs/shorts, OI, funding, hours lookback) with the red-delta + rising-shorts + negative-funding squeeze setup — rewrite all three beats.** P2 :40 editorializing.
2. CHART: [P1] no CHART beat; reuse `cumulative_delta` (vocab:1197) with sub-panel staying negative while price rises.
3. PACING: [P1] three CONCEPT beats, no chart (fixed above).
4. QUIZ: OK (data:2902-2930). P2 `data:2849` invented 24h/72h prescription; `:2851` invented "two-of-three tools"; `:2908` distractor inverts a funding mechanic — reword.

## L25 — Hyblock Indicators
1. CONTENT: **[P0] `v2/25:11,29,53` — suite misdescribed (funding/OI/heatmap-magnets); real suite is net + cumulative longs/shorts, L/S delta, volume delta, CVD, Binance indicators — and the centerpiece retail-vs-whales accumulation/distribution divergence (incl. 9,500→8,400 top call, CVD peaks at tops) entirely absent — rewrite.**
2. CHART: [P1] :25-34 — uses candle-painting + invented "liquidation magnet" labels; real visual is two sub-panel lines (Global L/S vs Top Traders) — replace with two-line sub-panel comparison.
3. PACING: P2 two-stage reveal after replacement.
4. QUIZ: OK (data:3009-3038 ✓). P2 `data:2967` drop unsourced RSI clause.

## L26 — Kijun-sen
1. CONTENT: [P1] `v2/26:11` core definition missing: Kijun = dynamic 50% Fib / mean-reversion magnet. [P1] :11-61 "Ichimoku only works in trending markets" prerequisite absent. P2 :28 downtrend rejections untaught; :39 invented "close below = momentum shift" while the 7,380/10,584/8,940, 72% worked example absent.
2. CHART: bounce OK. P2 :32 + `vocab:1092` — "risk just below the Kijun" but `stop` anchor computes cloudBottom−3 — add `kijunStop` anchor or relabel.
3. PACING: P2 :22-35 one static beat/4 ops vs the 4-chart walk — split into 2-3 accumulating beats.
4. QUIZ: OK (data:3126-3155 verbatim-faithful).

## L27 — C-Clamps and Kumo Pockets
1. CONTENT: **[P0] `v2/27:11,17-18` — C-clamp defined as "cloud spans pinch together"; actually TENKAN/KIJUN DIVERGENCE forming a C = overextension → mean reversion (frame-confirmed) — rewrite.** **[P0] :11,29,38 — kumo pocket taught as "thin cloud, easy to pierce"; transcript: HIGH PROBABILITY OF REJECTING price, S/R like DBS/SSR, strongest first test — the app teaches the OPPOSITE.** **[P0] :29,44,52 — "pinch = launchpad; thin means go, thick means stop" wholly invented — delete.** [P1] depletion factor missing.
2. CHART: [P1] :30-33 + `vocab:1086-1094` — no TK-gap/pocket-zone/rejection anchors exist; mechanism undrawable — add `cClamp`/`ichimokuPocket` moves or anchors.
3. PACING: moot until rewrite.
4. QUIZ: OK (data:3245-3274 gap-closing entry correct). Engine ch copy faithful; P2 `data:3223/:3234` stop 102.5 sits inside the 97-103 pocket — move above 103.

## L28 — Edge to Edge
1. CONTENT: **[P0] `v2/28:11,28` — the three prerequisites (weak TK crossover, chikou above/below price, clean strong close inside the kumo) entirely absent — add a checklist beat.** **[P0] :37,41,52,57 — "works best when the cloud is thin — a kumo pocket" invented AND contradicts the source (thick cloud = the 4-6.5R payoff; pocket ≠ thin cloud) — replace with HTF preference + wide-cloud-big-R.** [P1] missing: macro-reversal leading indicator, stop outside cloud, pullback entries, 6.5R example.
2. CHART: [P1] :29-32 + `vocab:1086-1094` — no cloud-edge anchors; "near/far edge" pinned to a Kijun tap and a point above the cloud — add `ichimokuE2E` move (close-inside candles, edgeNear/edgeFar, tkCross, chikou, stop).
3. PACING: P2 flagship setup one static beat/2 ops — stage prereqs → entry/stop → travel.
4. QUIZ: OK (data:3371-3405). Engine ch copy faithful.

## L29 — Ichimoku Market Scenarios
1. CONTENT: [P1] `v2/29:11-51` — none of the transcript's live examples survive (BTC bottom E2E 3,900-3,950→4,900→2-day 5,500/5,800; 7,260 Kijun rejection; weekly pocket short + H&S to 8,500) — rebuilt as a generic template. [P1] :28 "above green kumo → longs only" inverts the counter-trend inflection-hunting framing.
2. CHART: P2 anchors valid but 4th reuse of the same generic Kijun-bounce chart — follows the content rebuild.
3. PACING: OK — only v2 lesson of its block with proper accumulating CHART beats.
4. QUIZ: OK. Engine: **[P0] `data:3424` (+3422,3465) — daily E2E target stated as $5,500 with R=3.55; the 3.5R trade targeted $4,900 ($5,500/5,800 came via the later 2-day E2E; bullet :3425 already says so) — correct numbers/labels.** P2 :3437 "simultaneously" → sequential; :3439 invented "weekly pockets most powerful" ranking.

## L30 — Outro
1. CONTENT: [P1] `v2/30:25` — recap replaces Course 4's five modules with an invented four-course arc — mirror the correct engine version (data:3549-3553).
2-4. CHART/PACING/QUIZ: OK (data:3605-3640 ✓).

---

## MODULE QUIZZES (mq = lt-module-quizzes.js)
- Identifying Liquidity (308-333): 19/20 ✓. P2 mq:315 game-theory distractor ambiguous — reword.
- Determining Control (334-354): ✓ incl. the intentional lend/borrow trap (:337). [P1] mq:344 + [P1] mq:345 — OI quadrant options use vocabulary lexically inverting the video's slide labels; reword options to lesson vocabulary (semantic keys unchanged).
- Indicator Suite (355-369): all keys ✓. Answerability gaps resolve via L13/14/16/18 content fixes.
- Applying Sentiment (370-384): ✓ (hit-rate ties to position SIZE only, letter-verified). [P1] mq:380 — "Cumulative L/S can identify consolidation" = TRUE has zero transcript support — verify vs original platform quiz or reword.
- Ichimoku Masterclass (385-397): 7/8 ✓. **[P0] mq:390 — C-clamp keyed "Mean reversion" while "Counter-trend" sits as a distractor; transcript explicit ("C-clamps are considered a counter-trend strategy") and data:3172 agrees — re-key.**
- FINAL EXAM (data:3650-3861): OK — no keyed answer contradicts course doctrine.

---

## RANKED TOP FINDINGS

1. **[P0]** data:1640-1641 (+1651-1730) — PAL Red/Green AP absorption inverted; chapter teaches AND grades the wrong answer.
2. **[P0]** v2/27 — both concepts invented backwards (C-clamp; pocket) — full rewrite + new vocab anchors.
3. **[P0]** v2/28 — E2E prerequisites missing + invented "favour thin clouds" contradicting thick-cloud/big-R.
4. **[P0]** Hyblock cluster v2/22-25 — heatmap = "liquidation density" (22); spot/plot-the-blocks lost (23); invented aggression/absorption (24); retail-vs-whales centerpiece missing (25).
5. **[P0]** v2/05 — entry on reclaim vs retest (in-app contradiction with data:521).
6. **[P0]** v2/13/14/15 — In Silico suite lessons invent candle-colouring mechanics, omit real taxonomies; blocks 4+ mq items.
7. **[P0]** mq:390 — C-clamp key wrong.
8. **[P0] data cluster** — :2360 liquidation tier numbers; :2474/:2484 $6,346 misattribution; :3424 E2E target $5,500 vs $4,900; :2237 five-vs-six tabs; :1870 FSVZO MA-cross = mq:365's wrong answer; :371 wrong trapped party; v2/11 contango/backwardation never named; v2/18 Genie HTF vs LTF identity.
9. **[P1]** data:1109 vs :701/:644/:754/:782 — cross-chapter OI contradiction — qualify with funding/TA-confluence exception.
10. **[P1] vocab gaps** — no `under_over`/`over_under` (04/05), no ichimoku edge/pocket/TK-gap anchors (27/28), no heuristics channel move (15), no basis snapback leg (11), no rebound leg after clusterLo (21).
11. **[P1]** data:562/:593 pool wick on wrong side; data:305/:406 stops inside the wicks they should buffer beyond.
12. **[P1]** mq:344-345 quadrant vocabulary; mq:380 unsupported TRUE; data:1863 broken YouTube ID case; data:2425 liquidated longs "buying pressure" (forced sells); data:2092 invented Fuchsia rule; data:1397+ invented SA-count sizing.
13. **[P2] pacing cluster** — single `stage:'all'` dumps of 3-6 ops vs sequential narration (v2 04:43/:56, 05:43, 08:36, 09:29, 10:29, 11:36, 14:30, 16:27, 17:23, 20:27, 22:29, 26:22), stacked duplicate labels (20:35, 21:32/:44, 03:102), funding zero-cross desyncs (data:920/:947).
