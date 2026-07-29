/* Course2 · 06 — Price Action Formations              (v2 lesson)
   Source provenance (read-only): YouTube (Course2/06_Price_Action_Formations).
   Multi-candle formations as LTE triggers. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/06_price_action_formations'] = {
  id: 'course2/06_price_action_formations',
  course: 'Course2_Building_Your_Toolbox',
  module: '06_Price_Action_Formations',
  title: 'Price Action Formations',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "In Course One we read single candles — dojis, hammers, marubozus. Now let's take it further. When two or three candles combine into a formation, they tell a richer story about who just won control. Paired with a key level, these formations become powerful triggers in the LTE method.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Price Action Formations',
        lines: [
          'From single candles to **multi-candle** formations',
          'Each formation shows a shift in control',
          'At a key level, they become LTE **triggers**'
        ]
      }
    },
    {
      id: 'engulf-bull',
      type: 'CHART',
      chart: 'engulfing_bullish',
      stage: 'all',
      heading: 'Bullish Engulfing',
      say: "First, the engulfing pattern — two candles. We start with a down candle, sellers in control. Then the next candle is a strong up candle whose body completely swallows the previous one, closing above its open and high. Buyers didn't just step in; they erased the prior session. That's a bullish engulfing.",
      show: [
        { kind: 'marker', at: 'prior',  label: 'sellers’ candle', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'engulf', label: 'buyers engulf it', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'engulf-bear',
      type: 'CHART',
      chart: 'engulfing_bearish',
      stage: 'all',
      heading: 'Bearish Engulfing',
      say: "The mirror is a bearish engulfing. After an up candle from the buyers, a large down candle engulfs it entirely, closing below the prior open and low. Sellers have wrenched control back. Tweezer tops and bottoms work on a similar idea — two candles with matching highs or lows showing one side can't push any further.",
      show: [
        { kind: 'marker', at: 'prior',  label: 'buyers’ candle', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'engulf', label: 'sellers engulf it', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'morning-star',
      type: 'CHART',
      chart: 'morning_star',
      stage: 'all',
      heading: 'Morning Star',
      say: "Now three-candle formations. A morning star marks a bottom: first a strong down candle, then a small indecision candle — a doji or spinning top — that pauses the move, and finally an up candle that closes back past the midpoint of that first candle. The close is what matters; it confirms control has flipped to the buyers.",
      show: [
        { kind: 'level',  at: 'midpoint', label: 'midpoint of candle 1', side: 'right' },
        { kind: 'marker', at: 'star',    label: 'indecision', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'confirm', label: 'closes past midpoint — bullish', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'evening-star',
      type: 'CHART',
      chart: 'evening_star',
      stage: 'all',
      heading: 'Evening Star',
      say: "Flip it and you get an evening star at a top. A strong up candle, then an indecision candle as buyers stall at a supply zone, then a down candle that closes past the midpoint of the first. Sellers confirm the reversal. Next up: two formations that look similar to the stars — but play by stricter rules.",
      show: [
        { kind: 'level',  at: 'supply', label: 'supply — buyers stall', side: 'left', tone: 'supply' },
        { kind: 'level',  at: 'midpoint', label: 'midpoint of candle 1', side: 'right' },
        { kind: 'marker', at: 'star',    label: 'indecision', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'confirm', label: 'closes past midpoint — bearish', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'three-inside',
      type: 'CONCEPT',
      say: "My personal favorites for LTE triggers: three-inside-up and three-inside-down. They start like the stars with a strong first candle, but candle two is no indecision candle — it has a larger real body closing past the midpoint of candle one's body. Candle three seals it: in a 3IU it closes above candle one's open and high; in a 3ID, below its open and low.",
      panel: {
        title: 'Three-Inside-Up / Three-Inside-Down',
        lines: [
          '**Candle 1** — a strong down (3IU) or up (3ID) candle',
          '**Candle 2** — larger real body; closes past candle 1’s **midpoint**',
          '**Candle 3** — closes above candle 1’s open **and high** (3IU), or below its open **and low** (3ID)',
          'A successful 3IU can be both the **trigger and the entry**'
        ]
      }
    },
    {
      id: 'soldiers',
      type: 'CHART',
      chart: 'three_white_soldiers',
      stage: 'all',
      heading: 'Three White Soldiers',
      say: "Some formations are unmistakable. Three white soldiers are three strong up candles in a row, each with little or no upper wick and a bigger body than the last. It's the buyers flexing, marching price higher session after session — one of the clearest signals of continuation to the upside.",
      show: [
        { kind: 'marker', at: 'soldier1', label: 'buyers take over', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'soldier2', label: 'marching higher', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'soldier3', label: 'continuation up', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'crows',
      type: 'CHART',
      chart: 'three_black_crows',
      stage: 'all',
      heading: 'Three Black Crows',
      say: "And the bearish twin: three black crows. Three strong, full-bodied down candles in sequence with minimal wicks — sellers pressing price lower every session. When you see this after an uptrend, it's a loud warning that control has flipped decisively to the downside.",
      show: [
        { kind: 'marker', at: 'crow1', label: 'sellers take over', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'crow2', label: 'pressing lower', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'crow3', label: 'continuation down', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So that's our formation toolkit: engulfing candles and tweezers, morning and evening stars, the three-inside formations, three soldiers and three crows. On their own they're hints — but placed at a key support or resistance, they become high-probability triggers in the LTE framework. Next we'll add volume to confirm them, then look at real examples. As always: the more chart time you put in, the faster you'll spot these live.",
      panel: {
        title: 'Formations — Recap',
        lines: [
          'Two- and three-candle formations show shifts in control',
          'At a key level, they become LTE **triggers**',
          'Combine with S/R — and soon, **volume** — for confluence',
          'Screen time is how you learn to spot them live'
        ]
      }
    }
  ]
};
