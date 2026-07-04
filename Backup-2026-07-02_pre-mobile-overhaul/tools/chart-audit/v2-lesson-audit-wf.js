export const meta = {
  name: 'v2-lesson-teaching-audit',
  description: 'Audit each v2 animated-lesson beat: anything the spoken `say` references must be drawn+labelled via the beat `show` annotations (anchor-name based). Produce a vetted per-lesson plan.',
  phases: [
    { title: 'Audit', detail: 'per-lesson: for each CHART/CANDLE beat, compare say vs show; propose show items for taught-but-undrawn things, referencing only real vocab anchors' },
    { title: 'Verify', detail: 'adversarial check: every proposed anchor exists for that move, kind matches anchor type, not already shown (accumulation), say-justified; write ready-to-apply plan JSON' },
    { title: 'Synthesize', detail: 'consolidate totals, consistency notes, and a list of noAnchor gaps that would need vocabulary growth' },
  ],
};

const LESSONS = [{"course":"1","file":"02_Understanding_Price_Action.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course1/02_Understanding_Price_Action.js","visualBeats":6},{"course":"1","file":"03_Components_of_a_Market.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course1/03_Components_of_a_Market.js","visualBeats":3},{"course":"1","file":"04_Support_and_Resistance.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course1/04_Support_and_Resistance.js","visualBeats":5},{"course":"1","file":"05_Trending_Markets.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course1/05_Trending_Markets.js","visualBeats":3},{"course":"1","file":"06_Rangebound_Markets.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course1/06_Rangebound_Markets.js","visualBeats":3},{"course":"1","file":"07_What_is_Market_Structure.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course1/07_What_is_Market_Structure.js","visualBeats":3},{"course":"1","file":"08_Identifying_Market_Structure.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course1/08_Identifying_Market_Structure.js","visualBeats":4},{"course":"1","file":"09_Timeframes.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course1/09_Timeframes.js","visualBeats":3},{"course":"1","file":"10_HTF_Scenario.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course1/10_HTF_Scenario.js","visualBeats":3},{"course":"1","file":"11_LTF_Scenario.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course1/11_LTF_Scenario.js","visualBeats":3},{"course":"1","file":"12_Risk_Management.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course1/12_Risk_Management.js","visualBeats":2},{"course":"2","file":"01_Trading_Styles.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/01_Trading_Styles.js","visualBeats":2},{"course":"2","file":"03_Types_of_Trades.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/03_Types_of_Trades.js","visualBeats":5},{"course":"2","file":"04_Entering_Trades.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/04_Entering_Trades.js","visualBeats":3},{"course":"2","file":"05_Exiting_Trades.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/05_Exiting_Trades.js","visualBeats":2},{"course":"2","file":"06_Price_Action_Formations.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/06_Price_Action_Formations.js","visualBeats":6},{"course":"2","file":"07_Price_Action_Examples.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/07_Price_Action_Examples.js","visualBeats":3},{"course":"2","file":"08_Volume_Analysis.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/08_Volume_Analysis.js","visualBeats":4},{"course":"2","file":"09_Volume_Examples.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/09_Volume_Examples.js","visualBeats":2},{"course":"2","file":"10_Classical_Chart_Patterns.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/10_Classical_Chart_Patterns.js","visualBeats":7},{"course":"2","file":"11_Classical_Pattern_Examples.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/11_Classical_Pattern_Examples.js","visualBeats":2},{"course":"2","file":"12_Fibonacci.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/12_Fibonacci.js","visualBeats":1},{"course":"2","file":"13_Ichimoku_Kinko_Hyo.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/13_Ichimoku_Kinko_Hyo.js","visualBeats":2},{"course":"2","file":"14_Ichimoku_Market_Scenario.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/14_Ichimoku_Market_Scenario.js","visualBeats":2},{"course":"2","file":"15_Oscillators.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/15_Oscillators.js","visualBeats":2},{"course":"2","file":"18_Divergences.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course2/18_Divergences.js","visualBeats":1},{"course":"3","file":"02_Order_Types.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course3/02_Order_Types.js","visualBeats":1},{"course":"3","file":"06_Executing_Orders.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course3/06_Executing_Orders.js","visualBeats":1},{"course":"3","file":"09_Applying_Leverage.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course3/09_Applying_Leverage.js","visualBeats":2},{"course":"3","file":"10_Margin_Management.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course3/10_Margin_Management.js","visualBeats":2},{"course":"3","file":"11_Identifying_Access_Points.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course3/11_Identifying_Access_Points.js","visualBeats":1},{"course":"3","file":"12_Trading_SR.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course3/12_Trading_SR.js","visualBeats":2},{"course":"3","file":"13_Trading_Ranges.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course3/13_Trading_Ranges.js","visualBeats":1},{"course":"3","file":"14_Range_Market_Scenario.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course3/14_Range_Market_Scenario.js","visualBeats":3},{"course":"4","file":"03_Identifying_Liquidity.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/03_Identifying_Liquidity.js","visualBeats":8},{"course":"4","file":"04_Liquidity_Structures.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/04_Liquidity_Structures.js","visualBeats":2},{"course":"4","file":"05_Liquidity_Scenarios.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/05_Liquidity_Scenarios.js","visualBeats":2},{"course":"4","file":"08_Funding_Rate.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/08_Funding_Rate.js","visualBeats":1},{"course":"4","file":"09_Open_Interest.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/09_Open_Interest.js","visualBeats":1},{"course":"4","file":"10_Cumulative_Delta.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/10_Cumulative_Delta.js","visualBeats":1},{"course":"4","file":"11_Future_Basis.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/11_Future_Basis.js","visualBeats":1},{"course":"4","file":"13_Trend_Buddy.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/13_Trend_Buddy.js","visualBeats":1},{"course":"4","file":"14_PAL.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/14_PAL.js","visualBeats":1},{"course":"4","file":"15_Heuristics.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/15_Heuristics.js","visualBeats":1},{"course":"4","file":"16_FSVZO.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/16_FSVZO.js","visualBeats":1},{"course":"4","file":"17_Crayons.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/17_Crayons.js","visualBeats":1},{"course":"4","file":"18_Genie.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/18_Genie.js","visualBeats":1},{"course":"4","file":"20_Liquidation_Levels.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/20_Liquidation_Levels.js","visualBeats":1},{"course":"4","file":"21_Liquidation_Level_Scenario.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/21_Liquidation_Level_Scenario.js","visualBeats":2},{"course":"4","file":"22_Positions_Heatmap.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/22_Positions_Heatmap.js","visualBeats":1},{"course":"4","file":"25_Hyblock_Indicators.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/25_Hyblock_Indicators.js","visualBeats":1},{"course":"4","file":"26_Kijun_Sen.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/26_Kijun_Sen.js","visualBeats":1},{"course":"4","file":"27_C_Clamps_and_Kumo_Pockets.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/27_C_Clamps_and_Kumo_Pockets.js","visualBeats":1},{"course":"4","file":"28_Edge_to_Edge.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/28_Edge_to_Edge.js","visualBeats":1},{"course":"4","file":"29_Ichimoku_Market_Scenario.js","path":"/Users/pbot/.openclaw/workspace/lessons-v2/lessons/Course4/29_Ichimoku_Market_Scenario.js","visualBeats":2}];
const SCRATCH = "/private/tmp/claude-501/-Users-pbot/d2ce35aa-dafb-4a49-922b-250f983faa3c/scratchpad/v2-audit";
const VOCAB = "## CHARTS\n- **range_bound** — anchors: high(L), low(L) | stages: all\n- **liquidity_sweep_bullish** — anchors: support(L), firstTest(pt), sweepLow(pt), reclaim(pt), reversalTop(pt) | stages: setup → approach → sweep → reversal\n- **liquidity_sweep_bearish** — anchors: resistance(L), firstTest(pt), sweepHigh(pt), reclaim(pt), reversalBottom(pt) | stages: setup → approach → sweep → reversal\n- **uptrend** — anchors: start(pt), high1(pt), hl1(pt), hh1(pt), hl2(pt), hh2(pt), flipLevel(L) | stages: all\n- **downtrend** — anchors: start(pt), low1(pt), lh1(pt), ll1(pt), lh2(pt), ll2(pt), flipLevel(L) | stages: all\n- **horizontal_sr** — anchors: level(L), touch1(pt), touch2(pt), touch3(pt) | stages: all\n- **sr_flip** — anchors: level(L), test1(pt), breakout(pt), retest(pt), top(pt) | stages: tests → breakout → hold → run\n- **trendline_support** — anchors: touch1(pt), touch2(pt), touch3(pt), top(pt) | stages: all\n- **trendline_resistance** — anchors: touch1(pt), touch2(pt), touch3(pt), bottom(pt) | stages: all\n- **consolidation_breakout** — anchors: rangeHigh(L), rangeLow(L), breakout(pt) | stages: consolidate → breakout\n- **trade_setup_long** — anchors: entry(L), stop(L), target(L) | stages: plan → play\n- **candle_story** — anchors: sellers1(pt), buyers1(pt), sellers2(pt), pause(pt) | stages: all\n- **engulfing_bullish** — anchors: prior(pt), engulf(pt) | stages: all\n- **engulfing_bearish** — anchors: prior(pt), engulf(pt) | stages: all\n- **morning_star** — anchors: star(pt), confirm(pt), midpoint(L) | stages: all\n- **evening_star** — anchors: star(pt), confirm(pt), midpoint(L) | stages: all\n- **three_white_soldiers** — anchors: soldier1(pt), soldier3(pt) | stages: all\n- **three_black_crows** — anchors: crow1(pt), crow3(pt) | stages: all\n- **rising_wedge** — anchors: upperA(pt), upperB(pt), lowerA(pt), lowerB(pt), breakdown(pt) | stages: all\n- **falling_wedge** — anchors: lowerA(pt), lowerB(pt), upperA(pt), upperB(pt), breakout(pt) | stages: all\n- **head_and_shoulders** — anchors: leftShoulder(pt), head(pt), rightShoulder(pt), breakdown(pt), neckline(L), target(L) | stages: all\n- **inverse_head_and_shoulders** — anchors: leftShoulder(pt), head(pt), rightShoulder(pt), breakout(pt), neckline(L), target(L) | stages: all\n- **ascending_triangle** — anchors: top(L), lowerA(pt), lowerB(pt), breakout(pt) | stages: all\n- **descending_triangle** — anchors: bottom(L), upperA(pt), upperB(pt), breakdown(pt) | stages: all\n- **bull_flag** — anchors: poleBottom(pt), poleTop(pt), flagA(pt), flagB(pt), breakout(pt) | stages: all\n- **fibonacci** — anchors: swingLow(pt), swingHigh(pt), bounce(pt), fib382(L), fib500(L), fib618(L), fib786(L) | stages: all\n- **ichimoku** — anchors: pullback(pt), aboveCloud(pt) | stages: all\n- **liquidation** — anchors: entry(L), stop(L), liqSafe(L), liqDanger(L), dip(pt), top(pt) | stages: all\n- **rsi** — anchors: high1(pt), high2(pt), oversold(pt) | stages: all\n- **funding_rate** — anchors: top(pt), reversal(pt) | stages: all\n- **open_interest** — anchors: top(pt), reversal(pt) | stages: all\n- **cumulative_delta** — anchors: high1(pt), top(pt) | stages: all\n- **future_basis** — anchors: top(pt), reversal(pt) | stages: all\n- **color_tool** — anchors: top(pt), bottom(pt), resLevel(L), supLevel(L) | stages: all\n- **liquidation_levels** — anchors: clusterHi(L), clusterLo(L), magnet(pt), reversal(pt) | stages: all\n- **fsvzo** — anchors: buyZone(pt), sellZone(pt) | stages: all\n\n## CANDLES\n- **bullish_sweep** — anchors: low(pt), close(pt) | regions: lowerWick, body\n- **anatomy** — anchors: high(pt), open(pt), close(pt), low(pt) | regions: upperWick, body, lowerWick\n- **doji** — anchors: body(pt), high(pt), low(pt) | regions: upperWick, body, lowerWick\n- **marubozu_bullish** — anchors: open(pt), close(pt) | regions: body\n- **marubozu_bearish** — anchors: open(pt), close(pt) | regions: body\n- **long_upper_wick** — anchors: high(pt), body(pt) | regions: upperWick, body, lowerWick\n- **long_lower_wick** — anchors: low(pt), body(pt) | regions: lowerWick, body, upperWick\n";

const SPEC = `
YOU ARE AUDITING the v2 ANIMATED LESSONS of a crypto-trading course app for TEACHING CLARITY.
CORE PRINCIPLE (product owner): "Anything referenced while teaching must be TAUGHT on the chart."
If a beat's spoken narration ('say') references a locatable thing — support, resistance, the swing high,
entry, stop, target, neckline, the sweep, the breakout, the cluster, the cloud edge, a divergence point,
a Fib level, etc. — that thing should be DRAWN and LABELLED on the chart via the beat's 'show' annotations,
not merely spoken. Your job: find each such GAP and specify the exact 'show' item that closes it — OR, if
the vocabulary move exposes no anchor for it, record it as a noAnchorGap (do NOT invent an anchor).

== HOW v2 LESSONS WORK (data format) ==
Each lesson file registers window.LT_LESSONS[id] = { id, course, module, title, beats:[...] }.
Each beat has a 'type' and a 'say' (spoken-ready narration; inline emphasis *teal* / **white**). Three types:
- CONCEPT: text-only panel, NO chart. (Nothing to audit here — skip; it cannot draw anything.)
- CHART: references a vocabulary MOVE by name in 'chart:' (e.g. liquidity_sweep_bullish), revealed up to
  'stage:' (e.g. setup|sweep|reversal), annotated by a 'show:[...]' list.
- CANDLE: references a single named candle in 'candle:' (e.g. bullish_sweep), annotated by 'show:[...]'.

THE ACCUMULATION RULE (critical): consecutive CHART beats that name the SAME 'chart' value are ONE evolving
chart — the renderer KEEPS the chart and ACCUMULATES 'show' annotations across those beats. So a thing the
say references in beat N may already be drawn by a show in beat N-1 (same chart) or get drawn in beat N+1.
When judging a gap, consider the ACCUMULATED show across the whole same-chart run, and attach any new show to
the beat whose 'stage' first makes that anchor visible. A different 'chart' value, or any CONCEPT/CANDLE beat,
starts a fresh chart (accumulation resets).

== THE MOVE DRAWS THE CORE STRUCTURE; 'show' ADDS LABELS ON TOP ==
The vocabulary move itself already renders the core geometry: candles, the Ichimoku cloud/Tenkan/Kijun,
sub-panels (funding/OI/delta/basis histogram or line, volume, RSI, FSVZO oscillator), color-coded candles
(Crayons/Trend Buddy/Genie/PAL/Heuristics via color_tool), liquidation clusters, Fib levels, neckline/target
for H&S, etc. Do NOT propose re-drawing those — they are already on screen. 'show' only ADDS a labelled
level/zone/marker/note/trendline on a NAMED ANCHOR. So: if the say names the cloud and the move is 'ichimoku',
the cloud is ALREADY drawn (no gap) — unless a specific labelable anchor (pullback/aboveCloud) is referenced
and unmarked. Use restraint: a faithful chart needs only the KEY references labelled, not every noun.

== 'show' ANNOTATION KINDS (and which anchor TYPE each needs) ==
  level     -> at: <LEVEL anchor>            opt label, side(left|right)         [horizontal dashed line+label]
  zone      -> of: <LEVEL anchor>, side(above|below)  opt label, depth, tone(risk|reward)  [translucent band]
  marker    -> at: <ANY anchor>              opt label, style(sweep|reversal|dot), place(above|below)  [dot+label]
  note      -> at: <ANY anchor>              opt label, place                     [label only, no dot]
  trendline -> from: <POINT anchor>, to: <POINT anchor>   opt label, style(support|resistance)  [diagonal]
  region    -> of: <CANDLE region name>      opt label                            [CANDLE beats only: price band]
A LEVEL anchor (marked (L) below) is for level/zone. A POINT anchor (pt) is for marker/note/trendline.
A CANDLE 'region' name is for the region kind on CANDLE beats. Using a name the move does not expose makes the
renderer THROW — so EVERY at/of/from/to MUST be one of the exact anchor/region names listed below.

== GROUND-TRUTH ANCHORS PER MOVE (the ONLY valid names — extracted by executing chart-vocabulary.js) ==
${VOCAB}

== PEDAGOGICAL RULES ==
1. For each CHART/CANDLE beat, read the 'say' and enumerate every concrete, locatable thing it teaches.
   Check the move's anchors (above) + the ACCUMULATED 'show' so far. Taught + an anchor exists + not already
   shown = a GAP -> propose a show item on that anchor. Taught + NO anchor exists = a noAnchorGap (record it,
   do not invent).
2. Quote the EXACT 'say' snippet justifying each proposal.
3. RESTRAINT: label the KEY teaching references (the level/event the beat is ABOUT), not every word. Do not
   duplicate what the move already draws or what an earlier same-chart beat already showed. Prefer the minimal
   set that makes the chart teach what the voice says.
4. Match kind to anchor TYPE (level/zone need a (L) anchor; marker/note/trendline need point anchors; region
   needs a CANDLE region). Match label wording to the say. Choose side/place so the label sits clear of candles.
5. If an EXISTING show item is wrong (references a stale anchor, mislabeled vs the say, wrong kind) propose a fix.
`;

const AUDIT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    course: { type: 'string' }, file: { type: 'string' }, lessonId: { type: 'string' }, title: { type: 'string' },
    beats: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          beatId: { type: 'string', description: 'the beat id slug (or index if no id)' },
          beatType: { type: 'string', enum: ['CHART', 'CANDLE'] },
          move: { type: 'string', description: 'the chart/candle move name' },
          stage: { type: 'string' },
          accumulatedShow: { type: 'string', description: 'short summary of what is already shown on this chart by now (incl. earlier same-chart beats)' },
          alreadyComplete: { type: 'boolean' },
          gaps: {
            type: 'array',
            items: {
              type: 'object', additionalProperties: false,
              properties: {
                concept: { type: 'string' },
                quote: { type: 'string' },
                kind: { type: 'string', enum: ['level', 'zone', 'marker', 'note', 'trendline', 'region', 'fix', 'noAnchor'] },
                anchor: { type: 'string', description: 'the exact anchor/region name (at/of/from-to), or "" for noAnchor' },
                spec: { type: 'string', description: 'the full proposed show item, e.g. { kind:"marker", at:"sweepLow", label:"the sweep", style:"sweep", place:"below" }' },
                confidence: { type: 'string', enum: ['high', 'med', 'low'] },
              },
              required: ['concept', 'quote', 'kind', 'anchor', 'spec', 'confidence'],
            },
          },
        },
        required: ['beatId', 'beatType', 'move', 'accumulatedShow', 'alreadyComplete', 'gaps'],
      },
    },
  },
  required: ['course', 'file', 'lessonId', 'title', 'beats'],
};

const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    course: { type: 'string' }, file: { type: 'string' }, lessonId: { type: 'string' },
    wrotePath: { type: 'string' },
    editsApproved: { type: 'integer', description: 'count of show items to add across beats' },
    beatsTouched: { type: 'array', items: { type: 'string' } },
    addedByVerifier: { type: 'integer' },
    rejected: { type: 'integer' },
    noAnchorGaps: { type: 'integer' },
    highlights: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['course', 'file', 'lessonId', 'wrotePath', 'editsApproved', 'beatsTouched', 'addedByVerifier', 'rejected', 'noAnchorGaps', 'highlights', 'notes'],
};

phase('Audit');
const results = await pipeline(
  LESSONS,
  (L) => agent(
    `${SPEC}

== YOUR LESSON ==
Course ${L.course} · file ${L.file} · ${L.visualBeats} CHART/CANDLE beat(s). Path: ${L.path}

STEPS:
1. Read the lesson file. Identify every CHART and CANDLE beat in order (ignore CONCEPT beats).
2. Track the accumulation: group consecutive same-'chart' beats; carry the union of their 'show' forward.
3. For each CHART/CANDLE beat, list the move + stage, summarize the accumulated show, then read the 'say' and
   find everything it teaches that is locatable but not drawn. For each: if the move exposes a valid anchor,
   propose a precise 'show' item (exact kind + exact anchor name from the ground-truth list); if not, record a
   noAnchor gap. Justify each with a quoted say snippet and a confidence.
Return ONLY the structured analysis. Do NOT edit any files.`,
    { label: `audit:c${L.course}/${L.file}`, phase: 'Audit', schema: AUDIT_SCHEMA, effort: 'high' }
  ).then(a => ({ L, audit: a })),

  ({ L, audit }) => {
    if (!audit) return null;
    return agent(
      `${SPEC}

== ADVERSARIAL VERIFICATION ==
Course ${L.course} · file ${L.file}. Path: ${L.path}

An auditor produced this proposal (JSON):
${JSON.stringify(audit)}

Independently re-read the lesson file, then for EVERY proposed gap act as a skeptic:
- ANCHOR VALIDITY (hard gate): the anchor name in at/of/from/to MUST be one of the exact ground-truth anchors
  for THAT move (see the map). If it is not, REJECT it (it would make the renderer throw) — or, if a correct
  anchor for the concept does exist, fix the name. region kinds only on CANDLE beats with a valid region name.
- KIND/TYPE MATCH: level/zone need a (L) level anchor; marker/note/trendline need point anchors. Reject mismatches.
- NON-REDUNDANT: not already drawn by the move itself, and not already in the ACCUMULATED show (respect the
  accumulation rule across same-chart beats). Reject duplicates.
- SAY-JUSTIFIED & RESTRAINT: the quoted say must really teach it; reject inventions and over-annotation.
- LABEL/SIDE/PLACE sane and matching the say wording.
Also ADD anything correct the auditor MISSED. Move genuinely-undrawable references to noAnchorGaps.

Then WRITE a ready-to-apply plan to: ${SCRATCH}/c${L.course}-${L.file.replace(/\\.js$/, '')}.json
Valid JSON of EXACTLY this shape:
{
  "course": ${JSON.stringify(L.course)}, "file": ${JSON.stringify(L.file)}, "lessonId": "<the lesson id from the file>",
  "edits": [
    { "beatId": "<beat id slug>", "beatType": "CHART", "move": "<move name>",
      "addShow": [ { "kind": "marker", "at": "sweepLow", "label": "the sweep", "style": "sweep", "place": "below" } ],
      "fixes": [ { "find": "<verbatim existing show item>", "replaceWith": "<verbatim>", "reason": "..." } ],
      "reason": "ties each add to the say snippet it teaches; confirms the anchor exists for this move" }
  ],
  "noAnchorGaps": [ { "beatId": "...", "concept": "...", "quote": "...", "why": "move <X> exposes no anchor for this" } ],
  "alreadyGood": [ "<beatId>", ... ],
  "notes": "..."
}
Only include beats/arrays with something to add or fix (omit empty arrays). If the lesson needs NOTHING, write
"edits": [] and list beats in "alreadyGood". 'beatId' must match the beat's 'id:' in the file (for the applier).
Return the structured summary (including the path you wrote). Do NOT edit the lesson files — only write the plan JSON.`,
      { label: `verify:c${L.course}/${L.file}`, phase: 'Verify', schema: VERIFY_SCHEMA, effort: 'high' }
    );
  }
);

const vetted = results.filter(Boolean);
log(`Verified ${vetted.length}/${LESSONS.length} lessons.`);

phase('Synthesize');
let totalEdits = 0, totalAdded = 0, totalRejected = 0, totalNoAnchor = 0;
const byCourse = {};
for (const v of vetted) {
  byCourse[v.course] = byCourse[v.course] || { lessons: 0, edits: 0, noAnchor: 0 };
  byCourse[v.course].lessons++; byCourse[v.course].edits += v.editsApproved; byCourse[v.course].noAnchor += v.noAnchorGaps;
  totalEdits += v.editsApproved; totalAdded += v.addedByVerifier; totalRejected += v.rejected; totalNoAnchor += v.noAnchorGaps;
}

const plan = await agent(
  `You are consolidating a v2-lesson teaching-audit for a crypto course app. Per-lesson verification summaries
(each wrote a JSON plan under ${SCRATCH}/cN-<file>.json):
${JSON.stringify(vetted)}

Write a prioritized rollout plan to ${SCRATCH}/PLAN.md that:
1. Per-course totals (lessons audited, show items to add, noAnchor gaps) and a grand total.
2. Per course, the lessons needing edits (file · #adds · the 1 most important add) and which need NOTHING.
3. CONSISTENCY issues to normalize during application (label-style drift, side/place conventions, a recurring
   missing label like "entry/stop/target not drawn on the worked-trade beats").
4. The noAnchor gaps grouped by the vocabulary move that would need a new anchor (candidate vocabulary growth).
5. Any low-confidence or risky adds to eyeball.
Keep it skimmable. Return a 6-10 line executive summary (totals + top themes + cautions).`,
  { label: 'synthesize', phase: 'Synthesize', effort: 'high' }
);

return {
  lessonsVerified: vetted.length,
  totalShowAddsToApply: totalEdits,
  addedByVerifiers: totalAdded,
  rejectedByVerifiers: totalRejected,
  noAnchorGaps: totalNoAnchor,
  perCourse: byCourse,
  planDir: SCRATCH,
  executiveSummary: plan,
};
