# COURSE 2 CONTENT AUDIT — Building Your Toolbox (18 lesson files / 17 transcripts)

> Companion to `AUDIT.md` §4. Execute Phase 4 from here — every finding carries file:line.
> Paths: `lt-data-course2.js` (engine ch0–16), `lessons-v2/lessons/Course2/` (v2), `lt-module-quizzes.js:127-217` (mq), `lessons-v2/chart-vocabulary.js` (vocab).

**Method.** 17 ASR manifests under `/Users/pbot/Desktop/LiquidityTheory_Transcripts/Course2_Building_Your_Toolbox/`; engine charts evaluated through a Node harness replicating the runtime 10-lead/6-trail context expansion, `ltCandles` generation, and real RSI/Ichimoku/fib overlay math; vocab geometry computed numerically.

**Automated clean bills (whole course):** every v2 chart/candle/stage/anchor/region reference resolves (0 errors, all 18 lessons); no out-of-range markPoint/reveal indices; all quiz `cutIndex` values genuinely hide their resolutions.

**18-vs-17 RESOLVED:** `18_Divergences.js` has no transcript of its own — it is a **justified split**: the back half of the `15_Oscillators` video teaches divergences in full, and every line of 18_Divergences traces to that transcript verbatim (verified side-by-side); split mirrors the engine (ch13/ch14) and the roadmap. Content justified and accurate; only pacing nits.

**Recurring root causes (fix once):** (a) `lt-chartgen.js:66` occasional-long-wick branch on steep 1-bar legs produces freak candles (ch2, ch4, ch8, ch9, ch12 quiz) — re-run the harness after each seed change; (b) `reject` wicks follow the leg direction, silently inverting intended rejection wicks; (c) Ichimoku pins authored without accounting for the `disp`-forward cloud plot.

---

## 01_Trading_Styles (ch0)
1. CONTENT: OK w/ P2s. P2 `lt-data-course2.js:55` position bullet "daily/weekly" → "weekly/monthly" (transcript ties position to months/years). P2 `:70` "1H/4H for execution" invented (keeps mq answerable; keep or footnote). P2 `01:26` drops crypto-24/7 vs market-hours (stressed twice).
2. CHART: **[P1] `:104` scalp stop line y=82 ABOVE candle lows 81.8/81.3 → `yAxis:80.5`.** P2 `:94` "Swing Low" on a mid-leg bull candle → `dataIndex:1`. P2 `:95,:97` "HH" pins out-wicked by "HL" neighbors → wick 0.35→0.15 at `:91`.
3. PACING: OK.
4. QUIZ: answer correct; **[P1] `:150` vs `:146` — quiz stop y=82 while the revealed "Scalp Entry!" candle wicks to 76.9: the correct trade is stopped out on its entry candle → `reject:1.5` at :146 or stop y=76.** mq:131-136 all 6 correct ✓.

## 02_Introduction (v2 only)
1-4. OK across the board (3 concept beats; roadmap stops `lt-data-course2.js:43-47` map 1:1 to the five modules).

## 03_Types_of_Trades (ch1)
1. CONTENT: OK w/ P2. P2 `03:90-99` — transcript introduces DBS/SSR acronyms + partial-TP levels HERE; v2 has neither → add recap line. P2 `:186` engine omits partial TPs too.
2. CHART: v2 OK; **[P1] `:213` introChart stop y=97 vs retest wick 96.6 → y=96. [P1] `:230` scalp stop y=80 vs low 79.2 → y=78.5.** P2 `:238` wick 101.9 punches the SSR zone (92-97).
3. PACING: P2 'plan' beat 5 ops (`:68-74`) → split; 'flip' beat at `stage:'run'` reveals the rally during a conditional say → `stage:'hold'`.
4. QUIZ: OK. P2 "broken two weeks ago" vs 6 visible candles.

## 04_Entering_Trades (ch2)
1. CONTENT: [P1] `04:67` v2 omits Entry Method 2 (S/R-flip retest, [06:04–06:53]) → add an `sr_flip` beat. [P1] bias / **First Barrier** / invalidation-discipline (~40% of video) absent from v2; FB defined nowhere in v2 C2 yet module-quizzed (`mq:150-151`) → add a CONCEPT beat. P2 `:310` "Bias FIRST" over-extrapolated.
2. CHART: **[P1] `:343` "T — Trigger" pinned on a long-UPPER-wick candle (mis-aimed `reject:3` at :334; the example trigger is a bullish engulfing) → move reject to the down-leg (:333). [P1] `:337` freak candle wick to 76.8, 6pts through the taught zone between Trigger and Entry pins → reseed :338. [P1] `:365` "Break Above" pinned on a red candle closing 104.2 BELOW the 105 flip level → `dataIndex:9`.** P2 `:360` retest wick exactly tags stop 103 → stop 102.
3. PACING: OK/P2 ('entry' 5 ops; bullets `:318-324` run-ons).
4. QUIZ: OK (mq:142-152 all correct). P2 "just above the zone" wording (`:372`).

## 05_Exiting_Trades (ch3)
1. CONTENT: **[P0] `:436` — trailing-stop example says "entered short"; the transcript's trade is a LONG with a $500 trailing sell-stop (stopped $10,700 vs $9,100 target — "stopped above target" is only a win if long) → reword.** Otherwise all three strategies + numbers ($1,600, 33%×3) ✓. P2 v2 omits the three trailing variants — one line (`05:42`).
2. CHART: OK. 3. PACING: OK (bullets `:433-435` walls — split at "→").
4. QUIZ: chapter ✓. **[P1] `mq:153` — MULTI marks 'LTE Framework' an INVALID exit strategy, but the transcript's first exit approach IS exit-via-LTE [00:51] → swap the distractor.**

## 06_Price_Action_Formations (ch4)
1. CONTENT: [P1] `06:67` — 3IU/3ID never defined in v2 ("follow the same logic" — the point is they DIFFER: candle 2 real body, candle 3 closes above open AND high); chapter quiz tests exactly this → state the two rules. **[P1] `06:94` — crows taught as "little or no LOWER wick"; transcript says no UPPER wicks [07:40]** → "minimal wicks" or match transcript (classical texts side with v2 — decide convention). P2 soldiers sizing rules softened.
2. CHART: **[P1] `:613-614` lessonChart 3IU fails both taught rules (candle 2 close 94 < midpoint 94.5; candle 3 close 103 < candle-1 high 105.4) → `{to:95.5}`/`{to:106.5}`. [P1] `:608/:616` MS candle 1 too weak + candle 3 a freak 16.5-pt-wick bar → reshape + reseed. [P1] `:648-649` quiz chart contradicts its own question (candle 3 close 93 < candle-1 high 96.1; candle 2 exactly AT midpoint) → `{to:89}`/`{to:97}`.** v2 vocab geometry exact ✓.
3. PACING: OK. 4. QUIZ: OK (mq:162-167 ✓; P2 `:165` "volume profile"→"volume").

## 07_Price_Action_Examples (ch5)
1. CONTENT: OK w/ P2s. P2 `07:50-63` v2 walks three white soldiers; transcript walked crows/3ID/3IU/tweezer/evening star → swap for `three_black_crows`. P2 `:684` "doubles the validity" mangles "twice the volume"; P2 `:687` "declining volume" contradicts its own chart's 2.2× spike.
2. CHART: OK w/ P2 — `vocab:704` "2× volume" label draws ~3.3× → `{3:2.0}`→`{3:1.2}` (also `:719`).
3-4. PACING/QUIZ: OK (verified).

## 08_Volume_Analysis (ch6)
1. CONTENT: OK — all four price/volume scenarios exact.
2. CHART: OK w/ P2s. P2 `:849` "Weak Selling ⚠️" pinned on a GREEN candle → `dataIndex:13`. P2 lessonChart coil bars not visibly lower.
3. PACING: OK. 4. QUIZ: OK w/ P2 `:893` "each successive up-candle lower volume" broken by bar i=12 (16.9 > 13.9) → declining spike ladder. mq:168-171 ✓.

## 09_Volume_Examples (ch7)
1. CONTENT: [P1] the second headline read (declining sell volume = exhaustion → morning-star reversal; half the walkthrough) absent from v2 → add one `downtrend`+`{volume:'declining'}` beat. P2 `:946` invented absolute rule — soften.
2. CHART: **[P1] `:969,:971` — "Vol Declining — Coil" pinned on the coil's TALLEST bar; "Price ↑ + Vol ↑" pinned where volume just fell 16.7→7.0 → author spike keys at :956 (`{20:0.8,21:0.6,22:0.5,23:2.6,25:1.1,26:1.3,27:1.5}`).** P2 `:984/:995` "MS 2 (Doji)" has a real 3-pt bearish body → `{to:81.5}`. lessonChart exhaustion sequence ✓ excellent.
3. PACING: OK. 4. QUIZ: OK w/ P2 `:1002/:1014` "declining throughout" not drawn → declining keys.

## 10_Classical_Chart_Patterns (ch8 + Pattern Library lab)
1. CONTENT: **[P0] `:1087` — Rising Wedge bullet INVERTED: "higher highs outpace higher lows"; transcript [02:55], v2, and the chapter's own charts say higher LOWS outpace higher HIGHS → one-word swap.** [P1] `:1084-1093` symmetrical triangle / pennants (taught; target = pole) missing from bullets yet used as quiz distractor in ch8 AND ch9 → add bullet. P2 `10:135` + demo bullet `:1061` "wedges reverse" vs "continuation or reversal depending on location". P2 v2 `:89/:103` triangle break-direction bias nuance dropped.
2. CHART: all 7 vocab pattern builders geometrically exact ✓. **[P1] `:1175-1176` ch8 quiz reveal candle wicks to 101.9 (~10 pts above the bear-flag top) before crashing → damp wick/reseed.** P2 `:1098` target labeled from flag low; P2 `:1143` neckline 82 above left trough low 80.
3. PACING: OK. Lab placement/copy fits ✓.
4. QUIZ: OK (pole arithmetic exact; mq:172-177 ✓). P2 `:1155` "now at resistance" vs visible close at flag support.

## 11_Classical_Pattern_Examples (ch9)
1. CONTENT: [P1] `11:23-53` — transcript walks five LTE/R-multiple examples (bear flag 3.88R, bull flag 6.23R, pennant, desc. triangle 2.74R, asc. triangle); v2 walks a bull flag + an H&S NOT in this video, never mentions LTE or R:R → swap H&S beat for a bear flag; add an R-multiple line. **[P1] `:1224-1225` lesson bullets invert the LTE Level/Entry mapping for both flag examples (vs transcript and the chapter's own :1211).** Engine intro R-multiples match to the decimal ✓.
2. CHART: **[P1] `:1266-1275` ascending-triangle "flat top 92" wicked through twice (99.4, 97.2) BEFORE the pinned breakout → reseed/damp. [P1] `:1254` "Hanging Man" pinned on a shooting-star-shaped candle → relabel or re-author.** P2 `:1247` stop "above flag high" inside the flag's real range; P2 `:1235-1250` pinned entry→target ≠ pole by 5 pts.
3. PACING: P2 v2 'hs' beat 8 annotations one say → split.
4. QUIZ: OK. P2 `:1304` cut hides the question's 4th touch → `cutIndex:12`; P2 arrival wick 78.7 pierces the "never broken" flat 84.

## 12_Fibonacci (ch10 + Fib Sweep lab)
1. CONTENT: **[P1] drawing-direction contradiction across surfaces: transcript (twice) "measure from swing HIGH to swing LOW"; mq:182 accordingly marks low→high False. But v2 (`12:29` + recap `:63`) AND the Fib Sweep demo copy (`:1349-1355`) teach low→high — a learner following the lesson fails its own quiz. Align v2 + demo to the engine bullet (`:1315`) or reword the quiz.** P2 v2 `:34-37` shows 78.6 instead of the transcript's 23.6. P2 "golden pocket 0.618–0.65" is advanced-course terminology (absent from this transcript) — keep with awareness.
2. CHART: OK — engine fib overlay computed exact (61.8% at 95.28 / 104.72 match zones + reaction candles); v2 fib anchors ratio-exact to 3 decimals ✓. P2 ch10 quiz chart draws static fib markLines not derived from an anchored swing; P2 `:1483` quiz explanation references axis label "D3" (engine now renders real dates).
3. PACING: P2 v2 'measure' beat 7 ops → split fan-out from bounce.
4. QUIZ: OK (chapter ✓; mq:180/181/183 ✓; 182 is the P1 above). Lab placement fits ✓.

## 13_Ichimoku_Kinko_Hyo (ch11 + Cloud Explorer lab)
1. CONTENT: OK w/ P2s. Settings 10/30/60/30 & 20/60/120/30 frame-verified (`:1521`) ✓. P2 `13:27,35` "All use (high+low)/2" false for Chikou + Senkou A → "its moving averages use…". P2 `:34` Chikou role. P2 `:1531-1533` "26 periods" beside 30-disp settings.
2. CHART: **[P1] `:1583` "Kumo Twist → Bullish" pinned at idx23 where the computed cloud is still red (SpanA 95 < SpanB 105); real bull twist renders at idx33 (displacement ignored) → move pin +10 or `ichi:{disp:4}`. [P1] `:1582` "Price Reclaims Cloud" where price is ~24 units BELOW the cloud → `dataIndex:14`.** introChart pins ✓. v2 vocab cloud has no twist and correctly never claims one ✓.
3. PACING: OK. Lab placement/copy fits ✓.
4. QUIZ: OK w/ P2 `:1609/:1612` — static flat "Kijun (trailing stop)" markLine + hand-painted "Kumo pocket" duplicate/contradict the computed overlay → delete both. **[P1] `mq:190` — options 'Average' and 'Mean' are synonyms → replace 'Average' with 'Close'.**

## 14_Ichimoku_Market_Scenario (ch12)
1. CONTENT: engine checklist + entry options + Kijun-trail + 640/603/1035/890 transcript-exact ✓, but: **[P1] `:1639,:1658` "Live ETH example" is frame-verified BTCUSD → one-word fix. [P1] `:1658` the Tenkan bid was MISSED (front-ran); the 640 entry was the S/R-flip retest → reword. [P1] `14:40,:51` v2 swaps the taught system: Kijun-pullback entry + "close into cloud" exit replace Tenkan entry + close-below-Kijun trailing stop; omits the 4-prerequisite checklist; narrates a Tenkan re-cross not in the geometry → fix recap exit + add prerequisites beat.**
2. CHART: **[P1] `:1680` "P3: Kumo Twist ✓" at displayed 20; computed twist at 30 — the "All Four Prerequisites Met" chart shows a RED cloud under the P1-P4 + ENTRY pins → shift +10 or `ichi:{disp:4}`. [P1] `:1733` quiz pullback candle wicks through BOTH Tenkan and Kijun (low 95 vs ≈102), contradicting "touches the Tenkan" → raise leg/damp wick.** lessonChart trail logic sound (P2: five flat lines instead of a stepped trail).
3. PACING: OK/P2 (duplicate `aboveCloud` notes in beats 2+3).
4. QUIZ: answer correct (Entry Option 2); premise-chart contradiction is the P1. mq Chikou trio + Kijun ✓.

## 15_Oscillators (ch13)
1. CONTENT: OK w/ P2 — "&gt;70/&lt;30" thresholds invented (transcript gives no numbers); industry-standard, keep with awareness (`15:31-36`).
2. CHART: **[P1] `:1800,:1825,:1850` — all three ch13 charts use `indicator:'rsi_zones'`, which shades the top/bottom ~32% of the PRICE range and ignores `rsiPeriod:14` (lt-engine.js:563-585); the chapter that defines oscillators renders no oscillator → switch to the real `indicator:'rsi'` sub-panel (lt-engine.js:592), tune rsiPeriod, verify pins still read OB/OS.** v2's chart honest (real RSI panel, computed peaks 80→69, oversold at RSI 22 ✓).
3. PACING: OK. 4. QUIZ: OK (mq:197-198 ✓).

## 16_Financial_Instruments (ch15)
1. CONTENT: engine definitions transcript-exact ✓. [P1] `16:8-63` v2 omits hedging-vs-speculation (the "two main reasons") + forwards/swaps — all module-quizzed (`mq:210-212`) → add a use-case beat + name forwards/swaps in 'types'.
2. CHART: OK. 3. PACING: OK (one 79-word say → trim).
4. QUIZ: OK (mq ✓). P2 `:2063-2090` dead quiz chart + 3 revealMarkPoints behind `hideChart:true` → delete one or the other.

## 17_Outro (ch16)
1. CONTENT: recap faithful; C3 preview verified ✓. **[P1] `:2108` vs `:2112` — "seven classical chart patterns" vs "9 classical patterns" in the same chapter (8 actually taught in ch8; 11 in the lab) → drop the numerals.**
2. CHART: OK. 3. PACING: OK.
4. QUIZ: OK w/ P2s — `:2189-2196` revealed "Trigger (3IU)" candles actually form a bullish engulfing; `:2176` narrates a volume spike with no volume pane (`volume:{spikes:{19:2.6}}`); `:2197` stop 78.5 below the whole range.

## 18_Divergences (ch14)
1. CONTENT: OK — all four setups, both families, slope rule, midrange-crossback, HTF-trend rule verbatim to transcript 15's back half.
2. CHART: **[P1] `:1884-1994` — all three ch14 charts label oscillator behavior ("Osc. Low 2 (HIGHER) ← Div!") but render NO oscillator panel (`indicator` unset) — the divergence is invisible. Add `indicator:'rsi'`; verified feasible (RSI(6) genuinely diverges on lessonChart 92→81 vs price HH, quiz 98→84); reshape introChart lead-in first (monotonic decline flatlines RSI at 0 for ~10 bars).** v2's divergence chart honest ✓.
3. PACING: P2 beats 'four-setups' (83w) / 'rules' (75w) / 'regular-bearish' (71w) exceed ~70w — trim.
4. QUIZ: OK (mq:199-203 ✓).

---

## RANKED TOP FINDINGS

**P0:**
1. `:1087` Rising Wedge definition inverted — one-word swap.
2. `:436` trailing-stop example "entered short" — the trade is a long — reword.
3. `06:94` Three Black Crows wick rule mirror-opposite of transcript — decide convention, align.

**P1:**
4. Ichimoku Kumo-twist pins ignore cloud displacement (`:1583`, `:1680`) — ch12's "All Four Prerequisites Met" shows a red cloud at ENTRY.
5. Fibonacci drawing-direction contradiction (v2 12 + Fib Sweep demo vs transcript + mq:182) — lesson fails its own quiz.
6. Oscillator chapters render no oscillator: ch13 `rsi_zones` fake (`:1800,:1825,:1850`), ch14 divergence charts panel-less (`:1884-1994`) — switch to real `indicator:'rsi'`.
7. Systematic stop-above-the-low bug ×4 (`:104,:150,:213,:230`) — worst: ch0 quiz's correct scalp stopped out on its entry candle.
8. ch4 formation charts break their own rules (`:613-614`, `:608/:616`, `:648-649`).
9. ch2 LTE charts: trigger on non-trigger candle (`:334/:343`), freak wick (`:337`), "Break Above" on red candle below level (`:365`).
10. v2 gaps breaking mq answerability: 04 (Entry Method 2 + bias/FB/invalidation), 16 (hedging + forwards/swaps), 11 (five LTE/R examples replaced by invented H&S), 14 (prereq checklist + wrong exit rule), 09 (exhaustion read).
11. ch9: asc-triangle wicked pre-break (`:1266-1275`); "Hanging Man" mislabel (`:1254`); LTE Level/Entry inverted (`:1224-1225`); ch8 quiz reveal wick (`:1175-1176`); pennants missing bullet (`:1093`).
12. mq landmines: `mq:153` (LTE Framework marked invalid exit) + `mq:190` (Average/Mean synonyms).
13. `:1639,:1658` ETH→BTCUSD + entry misattribution; `:1733` quiz pullback pierces both lines; `:2108` vs `:2112` pattern-count clash.

**P2 clusters:** volume-pin/spike mismatches (ch6 `:849,:893`; ch7 `:969,:971,:984,:1002`); vocab "2× volume" draws 3.3× (`vocab:704,:719`); pacing hot-spots (03/04 5-op, 11 8-op, 12 7-op beats; 18's long says); stale "D3" reference (`:1483`); static Kijun line + painted pocket (`:1609,:1612`); dead quiz chart (`:2063-2090`); invented-but-sound touches to keep with awareness (70/30 RSI, golden pocket, funding mechanism).
