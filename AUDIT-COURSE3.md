# COURSE 3 CONTENT AUDIT — Consolidated Report (all 21 lessons)

> Companion to `AUDIT.md` §4. Execute Phase 5 from here — every finding carries file:line.
> Paths: `DATA = lt-data-course3.js`, `V2 = lessons-v2/lessons/Course3`, `QUIZ = lt-module-quizzes.js`, `VOCAB = lessons-v2/chart-vocabulary.js`.

**Method.** Source of truth: `/Users/pbot/Desktop/LiquidityTheory_Transcripts/Course3_Sharpening_Your_Edge/` (de-stuttered ASR + sampled video frames; frames recovered exact numerics for the leverage trades and journal case study). Audited surfaces: v2 decks, engine chapters 0–20 + `LT_EXAM_QUESTIONS_3`, module quizzes (`QUIZ:217–305`), vocab geometry + `lt-chartgen.js` leg semantics (each leg's final candle lands exactly on `to`; `reject` adds wick).

**Headline pattern.** Engine chapters largely faithful and math-clean; the systemic weakness is the **v2 decks** — 13 of 21 are CONCEPT-only, and several replaced the transcript's actual teaching with invented generic copy (worst: 10, 16, 11, 20). Three P0s are factual-error class.

---

## 01 — Introduction
1. CONTENT: OK. v2 (3 beats) + engine ch0 track the 5-module roadmap exactly (transcript 00:17–01:51). Engine's DBS/SSR/meditation mentions (`DATA:41,43`) are forward-synthesis matching real module contents.
2. CHART: OK. Talking-head source; concept-only appropriate. Engine equity-arc (`DATA:72–91`) markPoints land on real bars (recomputed).
3. PACING: OK. 3 short beats for a 2-min intro.
4. QUIZ: OK. `DATA:93–108` key (a) correct, answerable; dead chart block already removed.

## 02 — Order Types
1. CONTENT: [P1] `V2/02_Order_Types.js` omits **maker/taker fees entirely** (transcript 07:38, 10:57–12:04; own slide f_00674; no Course-3 v2 lesson covers it, but Module-1 quiz Q8–10 test it) — add one CONCEPT beat after `stops` (line 66). [P1] `V2/02:53–65` drops stop-buy/stop-sell direction semantics + the two-part trigger→market/limit mechanism — extend the stops beat. [P2] signature line "without stops it's gambling" dropped from v2 (engine keeps it, `DATA:131`).
2. CHART: OK on geometry — `trade_setup_long` (VOCAB:624–654) draws 1:2 RRR exactly; dip 46.03 never hits stop 45. [P2] "limit buy fills here" pinned at `dip` (48) below the 50 limit line — fill really occurs at first touch of 50 (i2); relabel "shakeout — stop survives". Engine ch1 charts verified: limit fills exactly idx11 (`DATA:164`), stop hit exactly idx15 (`DATA:186`).
3. PACING: [P2] `V2/02:42–50` — 7 show-ops revealed simultaneously while narration walks orders sequentially; split into `stage:'plan'` → `stage:'play'` beats.
4. QUIZ: OK — ch1 quiz key correct (`DATA:196`); exam 2512/2662 correct. [P2] `DATA:200–219` dead `chart` block behind `hideChart:true` — delete. [P2] `DATA:141` "Stop Loss = Stop Sell with CoT" true only for longs — add "(for longs; stop buy for shorts)".

## 03 — Deposit and Withdraw
1. CONTENT: OK — engine ch2 matches transcript + on-screen 13:00 UTC batch (frame f_00295). v2 is a declared platform-agnostic distillation, faithful. [P2] `DATA:260` conflates XBT ticker with chain-address risk — split the bullet. [P2] v2 `wallet` beat (`V2/03:26–34`) drops address-irreversibility + know-your-withdrawal-windows — one panel line each.
2. CHART: OK — wallet ledger line verified (peak 136 W11, withdrawal step to 118 W12, `DATA:271–276`); testnet flat line correct. [P2] v2 has no wallet-ledger visual; fold the step-up/step-down mechanic into panel lines.
3. PACING: [P2] 4 consecutive CONCEPT beats; tolerable for a UI walkthrough.
4. QUIZ: OK — ch2 key correct; exam 2560 correct.

## 04 — Understanding the Order Book
1. CONTENT: [P1] `V2/04_Understanding_the_Orderbook.js` **drops the transcript's entire second half** — perp-vs-futures instrument tabs, contracts as unit, ETH/XBT BTC-denomination warning, grouping (transcript 01:23–05:16; covered nowhere else in C3 v2) — add an "one book per instrument" beat + grouping line. [P2] v2's spread/depth/walls/spoof copy is invented (accurate, consistent with the lab, but displaced source material).
2. CHART: [P1] engine ch3 introChart (`DATA:364–389`) contradicts its own annotations — recomputed wicks pierce the whole ladder (idx7 low 80.92 < deepest bid 82; idx10 high 96.93 > highest ask 95) at the very bars labeled "Bid Wall Absorbs"/"Ask Wall Rejects"; tighten to `wick:0.15, reject:0.8` and re-verify. [P1] v2 deck is text-only for the module's most visual topic — add a depth-ladder CHART beat (heatmap bands on `range_bound`, or a new `orderbook_depth` move). Engine lessonChart (perp hugs spot 100) verified OK.
3. PACING: [P2] 4 CONCEPT beats narrating spatial structure never shown — fixed by the chart beat above.
4. QUIZ: OK — red = asks key correct (`DATA:419`). **Lab OK** — Order Book demo placement (`after:'intro'`, `DATA:323–335`) and copy fit; maker/taker/spread copy accurate.

## 05 — Getting Into Positions
1. CONTENT: OK on facts; introChart math verified (+35 = 120−85, `DATA:485`). [P2] v2 drops realized-P&L-hits-wallet + the tab taxonomy (Active Orders/Stops/Fills, ~40% of video) — one recap line.
2. CHART: [P1] `V2/05_Getting_into_Positions.js` 100% text for a visual trade-anatomy walkthrough (long 7173 + resting sell 7500 + stop 7100) — insert a `trade_setup_long, stage:'plan'` beat mapping position/order/stop tabs to levels. Engine charts verified OK (TP lands exactly 110).
3. PACING: [P2] 4 consecutive CONCEPT beats, zero relief.
4. QUIZ: OK — unrealized-P&L key correct (`DATA:518`).

## 06 — Executing Orders
1. CONTENT: **[P0] `DATA:543,556–559,615,640–644` — Close-on-Trigger taught via an invented, self-contradicting mechanism.** Claims a non-CoT stop sell "opens a new short on top of the existing long — two active positions" and "both positions lose simultaneously, doubling the damage": (a) BitMEX nets positions — a same-size sell closes the long regardless; (b) even granting it, a short *gains* as price falls, so "Doubled Loss!" is arithmetically impossible; (c) the transcript teaches CoT = "immediately stops us out at market" with non-CoT stops reserved for breakout *entries*. Real risk: non-CoT stop isn't reduce-only / needs margin → can be rejected or fire after your position changed, leaving you **unprotected or flipped**. Rewrite lesson body, quiz answer (a), reveal labels, explanation, rule. [P1] `V2/06_Executing_Orders.js` omits CoT entirely — the transcript's declared main takeaway — plus Last/Index/Mark trigger prices; add one CONCEPT beat between `placement` and `manage`. [P2] taker-fee mention dropped from the market line.
2. CHART: [P1] `DATA:572–588` introChart — leg 1 `{to:83,bars:5,reject:2}` lands idx4 exactly at the 83 limit with a wick through it, so "First Tap — Rejects" (idx4) is false: the limit buy fills there, not at the annotated idx9. Fix: `{to:85,bars:5,reject:1.5}`. v2 `placement` beat geometry OK.
3. PACING: [P2] 7 show-ops in one beat vs sequential narration — split into 3 continuity beats.
4. QUIZ: **[P0]** ch5 quiz key (a) (`DATA:615`) encodes the false mechanism (and no current option is correct post-fix — the corrected option must be "may fail to close → unprotected"). Exam 2518 OK; exam 2670 (maker) OK.

## 07 — Understanding Contracts
1. CONTENT: [P1] `V2/07_Understanding_Contracts.js:25–33` — "Three to know" **excludes the funding rate** (transcript singles it out) and drops the whole calculator segment (P&L/target/liquidation tabs — ch8 later depends on it). Make funding the 4th number + add a calculator beat. Engine ch6 accurate (8h cadence, longs-pay direction).
2. CHART: [P1] v2 text-only while purpose-built vocab moves sit unused — add CHART beats on `open_interest` (VOCAB:1180) and `funding_rate` (VOCAB:1162). Engine charts OK. [P2] `DATA:717` OI rises 150→158 during the price pullback, blurring "falling OI = closing"; flatten.
3. PACING: [P2] 4 CONCEPT beats — flattest of Module 1 given ready-made moves.
4. QUIZ: OK — funding math recomputed: 3/day × 5 days = 15 payments × 0.05% = **0.75%** ✓ (`DATA:757`). **Module-1 quiz `QUIZ:219–233`: all 10 keys verified correct.** Exam 2524/2530/2536 all correct.

## 08 — Understanding Leverage
1. CONTENT: [P1] `V2/08_Understanding_Leverage.js` never defines **liquidation/margin call, initial vs maintenance margin, risk limit, or "stops are the only defense"** (transcript 04:10–08:34); recap says "respect the liquidation price" without defining it. Add two beats (liquidation; initial 1% + maintenance 0.5% BitMEX example). [P2] "start isolated" advice (line 53) is invented; transcript pairs cross→swing, isolated→day traders (engine right, `DATA:794–795`). [P2] engine ch7 omits **risk limit** — one bullet at `DATA:791–798`.
2. CHART: [P1] all-CONCEPT deck for a spatial mechanism — add a `liquidation`-move CHART beat (levels only). Engine charts verified: entry 88 > stop 84 > iso-liq 79 correct; no-stop disaster chart correct.
3. PACING: [P2] 5 consecutive text panels.
4. QUIZ: OK — ch7 key correct. **Module-2 quiz `QUIZ:234–246`: all 8 keys correct.** [P2] Q7/Q8 unanswerable from the v2 deck alone — fixed by the content P1. **Lab OK** — Liquidation Lab placement + math check out (100%÷L; ~12× threshold vs taught 7.3% stop).

## 09 — Applying Leverage
Frame-verified trade: Entry $134.83 | Stop $124.95 | TP1 $160 | RRR 2.547≈2.55 ✓ | 750k contracts ✓ | 101→10.27 BTC margin at 10x ✓ | Liq $122.90 ✓ | misuse = 74 BTC = 37% ✓.
1. CONTENT: [P1→CHART] engine copy `DATA:903` uses fabricated Liq $115 with the real entry/stop — use the video's $122.90. [P2] v2 drops the marquee sizing math (200 BTC / 3.7% / 750k / 101→10 / 37%-misuse) — fold the 101→10 example into the `sizing` beat (`V2/09:56`). [P2] line 43 "**Size** it conservatively and that line sits far below your stop" — forbidden conflation; say "Keep leverage low…". [P2] line 70 "played out exactly as planned" contradicts lesson 10's near-miss.
2. CHART: [P1] `DATA:926–929` introChart labels the flagship worked example **"Liquidation ($115)"** (real: $122.90) and **"Target ($282)"** (that's L10's revised target; TP1 was $160) — relabel both. [P2] `V2/09:34` target label "(2.5R)" over sr_flip geometry that draws 4.4R — drop the figure. `liquidation` move geometry verified perfect.
3. PACING: [P2] 7-op `liquidation` beat + single-stage jump to sr_flip `run` — split each into two accumulating beats.
4. QUIZ: OK — ch8 $85/$80/$77 recomputed correct (`DATA:960–997`); exam 2548 ✓, 2628 ✓.

## 10 — Margin Management
1. CONTENT: **[P0] `V2/10_Margin_Management.js` fails to teach its subject and contradicts the source.** No funding, no liquidation-creep ($122.95→$126.35 **past** the $124.95 stop — frame-verified), no $282/$281.90 10-cent near-miss, no $268 exit, no 14.9R, no "funding ate >20% of profits". Line 42 invents "I trailed my stop up beneath structure" — transcript: same entry/stop held, then stop moved **to entry $135 specifically to cover funding**. Line 53 redefines margin management as generic winner-management. Rebuild the back half around the real arc. [P2] `DATA:1017` "cloud **breakout**" — source shows price closing **into** the cloud; reword. [P2] `DATA:1018` "crept UP toward the stop" — it *crossed* it (reveal at `DATA:1133` already says so).
2. CHART: [P1] v2 `cloud` beat (36–49) narrates "above a green cloud / Kijun bounce" — a different confluence than the source's cloud-entry setup; re-narrate honestly or add a cloud-entry vocab variant. [P1] the module's namesake visual — funding-driven liq creep — has no v2 counterpart while the engine draws it twice (`DATA:1038–1066`, `1109–1129`); add a CHART beat (flat stop + climbing liq line). Engine charts verified ✓.
3. PACING: [P2] `works`/`cloud` beats dump 4 ops each; use `plan`→`play` stages. [P2] `V2/10:47` trailed stop drawn `tone:'reward'` (teal); stop → pink.
4. QUIZ: OK — ch9 mechanism true (63 periods ✓); exam 2554 ✓. [P2] `DATA:1131` "Liq Far Below SL" vs a 1-pt gap — start sub-panel at 74.

## 11 — Identifying Access Points
1. CONTENT: [P1] `V2/11_Identifying_Access_Points.js` **never mentions DBS or SSR** — the transcript's core (zone acronyms, construction rules: low-incl-wicks→highest open / high-incl-wicks→lowest open, single-candle zones, Strength/Time/Depletion). Module-3 quiz `QUIZ:255–259` tests exactly these — unanswerable from the deck. The `confluence` beat (52–63) is invented. Fix: replace `confluence` with a DBS/SSR definitions beat + a three-fundamentals beat. [P2] `consolidation` beat reframes the access point as breakout-edge entry; transcript frames zones as retest entries.
2. CHART: Engine ch10 charts exemplary (DBS 79.4–85.3 on idx9's open/low `DATA:1178–1200`; SSR 100–116.6 `DATA:1203–1226`). OK. [P2] v2 `consolidation` labels the opposite range edge `'stop — tight risk'` (full range height!) — relabel "stop — opposite edge = invalidation".
3. PACING: OK — 5 beats, one CHART; no dumps.
4. QUIZ: OK — ch10 key correct (`DATA:1246–1263`); `QUIZ:255–259` all correct; exam 2566 ✓, 2602 ✓.

## 12 — Trading S/R
1. CONTENT: [P1] `V2/12_Trading_SR.js` omits the titular strategies — **aggressive** (bids at DBS upper limit, stop below zone) vs **conservative** (layered bids, stop beyond separate invalidation) — and the zones-as-LTE-levels/journaling caveat; the `bounce` beat imports Rule-of-Fives material from L13. Fix: add a strategies CONCEPT beat; move rule-of-fives emphasis to L13.
2. CHART: [P1] `bounce` beat (`V2/12:30–39`) draws `at:'stop'` on `horizontal_sr(as:'support')` whose stop anchor is **54 — above the 50 support being bought** (`VOCAB` support branch `stop:{price:54}`; value fits the breakdown-short, not the long) — while narration says "stop just beneath". Fix: add a `longStop` anchor (~47) to the support branch or drop the op. [P2] same beat narrates a holding level over stage `'all'` whose final candles **break it down** — use `'hold'` then `'break'`. `flip` beat verified correct.
3. PACING: [P2] `bounce` = 8 ops, `flip` = 6 ops dumped at once — split by stage.
4. QUIZ: OK — ch11 key + chart verified (`DATA:1376–1406`); exam 2613 ✓ / 2646 ✓. [P2] ch11 introChart fill marker at idx11 though bids at 86 first fill at idx8 — move pin or start bids later.

## 13 — Trading Ranges
1. CONTENT: [P1] `V2/13_Trading_Ranges.js` drops the four named rules: **first tests = high hit rate** (`QUIZ:266`), **midpoint = control gauge / don't trade the mid** (`QUIZ:262,265`), **Rule of Fives by name** (`QUIZ:267`), **swing-point invalidation + buffer**. Rewrite `tactics` into the four rules, naming them. [P2] "Markets trend only about a third of the time" (line 11) — invented statistic; cut.
2. CHART: [P2] `range_bound` exposes no mid anchor yet mid is the signature concept — add a `mid` level anchor to `VOCAB range_bound` + a level op. Engine ch12 charts verified (touch numbering exact, midpoint 88.5 ✓, 5th-touch poke + breakout ✓).
3. PACING: OK — 4 beats (mild [P2]: split zones from markers in the 6-op beat).
4. QUIZ: OK — ch12 key matches transcript + L14's live outcome. [P2] quiz chart `cutIndex:18` (`DATA:1526`) shows 3 touches where the stem asserts four — set `cutIndex:19`. Exam 2572 ✓, 2586 ✓.

## 14 — Range Market Scenario
1. CONTENT: [P1] `V2/14_Range_Market_Scenario.js` replaces the walkthrough's trades with invented methodology. Real long: **resting bid at range low (2nd test), ~4% risk, ~4R, stop below swing low with buffer**; the `deviation` beat (38–49) instead teaches sweep-reclaim entries (Course-4 SFP material the transcript explicitly defers). Missing: the **losing 5th-touch short** (rule-of-fives live proof + journaling) and mid-as-progress-gauge. Fix: re-narrate `deviation` around buffer-survives-the-wick; add a 5th-touch stop-out → journal beat.
2. CHART: OK mechanically — all moves/stages/anchors verified; fidelity issue is the narration mapping. Engine ch13 verified (fake-out spike ~102.3 vs buffered stop 104 ✓; short entry 98/target 87 ✓).
3. PACING: OK — 5 beats, ≤4 ops.
4. QUIZ: OK — buffer quiz verified (`DATA:1667–1691`). **Module-3 quiz `QUIZ:247–268`: all 18 keys correct.** Exam 2586 ✓.

## 15 — Crafting Your System
1. CONTENT: **[P0]** `V2/15_Crafting_Your_System.js:37–48` — `plan` beat mis-defines the trading plan (assigns the system's markets/timeframes to it; invents "daily routine / max loss before you step away"); transcripts 15/16 define plan = session-level rules for executing the system. [P1] lines 25–34: the canonical **seven system components** (Markets, Timeframes, Risk, Trade Setups, Entry Triggers, Exit Triggers, Trade Management — slide f_00146) never listed; quiz + exam test them. [P1] trust-during-drawdown rule + technical-vs-discretionary distinction omitted (Module-4 quiz tests both).
2. CHART: [P1] text-only for a slide-driven source — add a seven-component diagram beat. [P2] `DATA:1736–1741` introChart titled "…Equity Curves" draws ONE curve and starts below its own 106 revamp line — retitle + lower line to ~96. Engine lessonChart OK.
3. PACING: [P1] flat 4-beat CONCEPT run.
4. QUIZ: OK on ch14 key; **[P1]** `DATA:1790,1794–1798` quiz chart contradicts itself — bar-10 wick 79.4 breaches the 80 "Max Acceptable Drawdown" line while reveals say "Drawdown Was Normal"; move line to 78 or `wick:0.25`.

## 16 — Applying Your System
1. CONTENT: **[P0]** `V2/16_Applying_Your_System.js` — the deck never says "trading plan"; the source is entirely about the plan (definition, components slide f_00065, bias formation, session review). Rebuild: definition → components → bias/expectations → review. Engine ch15 faithful. [P2] `DATA:1828,1837,2393` "six components" vs the slide's seven.
2. CHART: [P1] text-only; add a plan-components checklist beat. [P2] `DATA:1854–1869` introChart bar-12 wick 115.32 punches the 111 target line 3 bars before "Plan Executed"; `wick:0.25` or move pin. Engine "Out of Sync" chart OK.
3. PACING: [P1] flat 4-beat run (part of rebuild).
4. QUIZ: OK on ch15 key. [P1-answerability] `QUIZ:278–280` unanswerable from the live deck (fixed by rebuild). [P2] `QUIZ:279` drop stray "discretionary".

## 17 — Recording Your System
1. CONTENT: **[P0] `DATA:1946–1947` — stop prices swapped**: says "Stop $10,590" and "moved stop DOWN from $10,590 to $10,790" (that's up, and backwards). Frame f_00226 + transcript: original stop **$10,790**, moved down to **$10,590**, slipped exit **$10,340** ($250 slippage ✓). Fix both lines. Other arithmetic verified (−54.72 BTC ≈ −2.56%; planned RRR 3.78; ~1.47R realized). [P1] `V2/17_Recording_Your_System.js` omits the worked losing-trade case study (~60% of transcript) + Edgewonk — add a 1–2 beat case study. [P2] soft variables = emotional state/sleep/hunger/meditation/exercise, not "discipline".
2. CHART: [P1] `DATA:1987–1997` lessonChart annotation order broken — "Stop Moved Down — WRONG" pinned at idx9 after price passed all stop lines, "Exit with Slippage" at idx14 floating 14 pts below the 92 exit line; move markers to idx6–7 and idx9, shorten tail. [P1] `DATA:1973` "Loss — 3h/4h Sleep" pinned on a GREEN up-bar; dataIndex 9→10. [P1] v2 needs a journal-template mockup beat. [P2] drawn RRR ~1.2 vs real 3.78 — stretch target line.
3. PACING: [P1] flat 4-beat run for the module's longest lesson.
4. QUIZ: OK — ch16 key correct, reveal markers on-bar. **Module-4 quiz `QUIZ:270–284`: all keys correct** (276/277 both FALSE ✓ per transcript's tech/discretionary swap; 278 FALSE ✓). [P2] `QUIZ:275` "multiple systems" true only by inference — reword.

## 18 — Developing a Trader's Mindset
1. CONTENT: [P1] `V2/18:36–76` drops the three routines (screen time/10,000 hrs, physical health, meditation), Rules of Engagement (9 p.m. example) and the **five-losses rule**, while inventing a "process over outcome" beat; discretionary-vs-systemic edge taxonomy (slide f_00165) missing though `QUIZ:291–292` test it. Replace invented beats. [P2] "Patience" pillar invented (line 39); engine `DATA:2060` reshapes the three routines — name them.
2. CHART: [P1] `DATA:2074–2084` introChart monotonically rising yet labeled "Early — Losing Phase"/"Break Even Phase" — re-leg with a decline + flat. [P2] `DATA:2091–2097,2123–2128` equity keeps falling after "Loss 5 — Stop Trading!"; flatten. [P2] v2 needs the edge-table or five-loss timeline visual.
3. PACING: [P2] 5-beat CONCEPT-only run.
4. QUIZ: OK — ch17 key exact. **Module-5 quiz `QUIZ:285–304`: all 15 keys correct** (290 TRUE correct — "parameters shouldn't change **with the market**"; [P2] append that qualifier for precision). [P2] `QUIZ:292` grammar ("edge are parameters"). [P2] exam `DATA:2694` tests the invented "process" framing — reground.

## 19 — The Art of Meditation
1. CONTENT: [P1] `V2/19:22–49` never says "objectivity" or "discretionary" — the headline benefit and the tested term (`QUIZ:296`, exam `DATA:2713`); omits guided practice + "refocusing… is the essence". Rewrite `why` around calm→clarity→objectivity; add a practice beat. [P2] Headspace/5–10 min/30-day trial dropped. [P2] engine hardens "see what impact it has" into "measurable improvements within 30 days" — soften (`DATA:2160,2167,2259–2260`).
2. CHART: OK — engine concept-format loop (`DATA:2182–2204`) right choice. [P2] lessonChart "Range Low" band (86–91) excludes its own lows at 84 (`DATA:2206–2227`) — lower to 83–88; [P2] quiz reveal maps loop onto candles — reuse concept format; [P2] v2 should carry the loop visual.
3. PACING: [P2] 4-beat text run for the most animatable topic in the course.
4. QUIZ: OK — key correct; `QUIZ:296/301/302` ✓; exam 2710 ✓ (answerable only from engine copy until the P1 is fixed).

## 20 — The Reality Behind Trading Full-Time
1. CONTENT: [P1] `V2/20:25,39,53` fabricates first-person claims (capital-to-pay-rent, "most don't last", 20/80 screen statistic, keep-your-day-job) absent from the 23-min transcript, while omitting the marquee teachings: trader-evolution arc (big losses→small→break-even→profit), "a trader is a strong analyst with superb execution skills", hot-streak rule, 5-loss × 5% ≥ 25% drawdown callback, "don't impose your will on the market", HTF-precedence noise filtering. Rebuild from these. Engine ch19 faithful; [P2] add 25% math + "don't impose your will" bullets.
2. CHART: [P1] v2 needs the trader-evolution curve (engine draws one at `DATA:2302`). [P2] `DATA:2306–2318` phase labels slip one leg — re-leg. [P2] `DATA:2335–2340` "Worse Fill — Bigger Risk" pinned on the target bar; move to idx11–12. [P2] quiz reveal "Entry Missed — Zone Left" at idx8 still inside the zone — shift to idx9–10.
3. PACING: [P2] 4 beats compressing 23 minutes; flat.
4. QUIZ: OK — key correct; `QUIZ:297/298/300` ✓. [P2] exam `DATA:2702` "income is irregular / needs capital" not taught — reword to evolution/discipline framing.

## 21 — Outro
1. CONTENT: OK — five modules named correctly (`DATA:2390–2394,2427–2433`). [P2] `DATA:2393` "6-component trading plan" (slide shows seven). [P2] `V2/21:26–34` recap should list the five modules one per line; drop "part most courses skip" editorializing. [P2] the "17 Actionable Rules" (`DATA:2399–2420`) are invented-but-consistent synthesis — acceptable.
2. CHART: OK — "All Five Modules in One Trade" verified. [P2] bar 9 is a chaotic 24-pt candle — re-seed/`wick:0.3`.
3. PACING: OK — 3 beats for a 3:34 outro.
4. QUIZ: OK — "Which Modules Apply?" maps all five modules correctly (`DATA:2464–2497`).

---

## TOP FINDINGS — RANKED

**P0 (factual/math errors)**
1. ch5/L06 Close-on-Trigger — `DATA:543,556–559,611–617,638–644`: invented "new short on top of the long / doubled loss" mechanism. Rewrite around: non-CoT stop isn't reduce-only → unprotected/flipped. Quiz key + reveals + rule too.
2. L10 v2 deck — `V2/10:42,53`: omits the funding→liq-creep thesis + invents a trailing-stop narrative contradicting the source (stop held, then moved to entry to cover funding).
3. ch16/L17 — `DATA:1946–1947`: stop prices swapped. Truth: $10,790 → down to $10,590 → slipped exit $10,340.
4. L16 v2 deck — never mentions the trading plan; 3 Module-4 quiz questions unanswerable from it.
5. L15 v2 `plan` beat — `V2/15:37–48`: mis-defines the trading plan.

**P1**
6. ch8/L09 introChart labels Liq $115 (real $122.90) / Target $282 (real TP1 $160) — `DATA:926–929`.
7. ch3/L04 introChart wicks pierce the whole ladder at "wall absorbs/rejects" bars — `DATA:364–389`.
8. ch5/L06 introChart first tap lands ON the 83 limit ("rejects" is false) — `DATA:572–588`.
9. ch17/L18 introChart rises monotonically under "Losing Phase" labels — `DATA:2074–2084`.
10. v2 L12 `bounce` + VOCAB bug: `horizontal_sr` support-branch stop anchor 54 ABOVE the 50 support — add `longStop` (~47).
11. v2 L14 `deviation` teaches deferred C4 sweep-reclaim material; losing 5th-touch short absent.
12. v2 L11: DBS/SSR never mentioned; construction rules + Strength/Time/Depletion missing.
13. v2 content-gap cluster: L02 fees+stop-semantics; L04 instruments/denomination/grouping; L06 CoT beat; L07 funding+calculator; L08 liquidation/margin; L13 four range rules; L15 seven components; L17 case study; L18 routines/five-loss/edges; L19 objectivity; L20 evolution arc + strip fabrications.
14. ch16/L17 lessonChart annotation order broken + sleep pin on green bar — `DATA:1973,1987–1997`.
15. ch14/L15 quiz chart wick breaches the drawdown line the reveal denies — `DATA:1790,1794`.
16. Text-only decks needing one visual each (vocab-ready): 04, 05, 07, 08, 10, 15, 16, 17, 18, 20.

**P2 (top of list)**
17. Show-op dumps: L02 placing (7), L06 placement (7), L09 liquidation (7), L12 bounce (8) — split into staged continuity beats.
18. `DATA:200–219` dead quiz chart; `DATA:1526` cutIndex 18→19; `DATA:717` OI flatten; `DATA:1131` sub-panel start 74; six-vs-seven components (`DATA:2393/1828/1837`); `QUIZ:275/279/290/292` wording; `range_bound` mid anchor; `V2/10:47` stop tone pink.

**Clean bills (no action):** all 51 module-quiz keys; full exam pool except 2694/2702 rewords + ch5's P0-linked quiz; all liquidation-ordering charts; funding + position-sizing math; both labs' placement/copy; lessons 01, 03, 21 essentially clean.

*Coverage: 5 of 6 sub-audits returned full reports; the 11–14 slice was audited directly by the compiling agent at the same evidence standard.*
