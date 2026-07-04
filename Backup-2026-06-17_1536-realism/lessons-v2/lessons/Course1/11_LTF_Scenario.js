/* Course1 · 11 — LTF Entry Scenario                    (v2 lesson)
   Source provenance (read-only): YouTube JUmnSxywtt4. The source replayed a real
   ETH 4H/15m chart; here the entry method is idealized into vocabulary moves. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/11_ltf_scenario'] = {
  id: 'course1/11_ltf_scenario',
  course: 'Course1_Laying_The_Foundation',
  module: '11_LTF_Scenario',
  title: 'LTF Entry Scenario',
  source_video: 'JUmnSxywtt4',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "With the high-timeframe bias set, we drop down to find the actual entry. The job here is the same as before — mark the key support and resistance around the swing points — just on a lower timeframe, like the four-hour, with execution on the fifteen-minute.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'LTF Entry Scenario',
        lines: [
          'HTF set the bias — now we time the entry',
          'Mark key S/R on the lower timeframe',
          'Execute on an even smaller timeframe (e.g. 15-min)'
        ]
      }
    },
    {
      id: 'mark-and-break',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'breakout',
      heading: 'Mark the Level, Watch the Break',
      say: "Here's a pivotal four-hour level — a spot price has reacted to before. We mark it and wait. Then price pushes up and breaks above it. We don't chase the breakout; instead we get ready, because the real opportunity is what happens on the way back.",
      show: [
        { kind: 'level',  at: 'level', label: '4H S/R level', side: 'left' },
        { kind: 'marker', at: 'breakout', label: 'breaks above', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'retest-entry',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      heading: 'The Retest Is the Entry',
      say: "And there it is. Price comes back to the level we marked, the old resistance holds as new support, and it launches higher. Buying that first test of a fresh S R flip is the clean, low-risk long — the kind of move that can hand you a quick six percent with risk defined right under the level.",
      show: [
        { kind: 'marker', at: 'retest', label: 'first test of S/R flip — long', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'top', label: 'aligned with HTF', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'confirm',
      type: 'CHART',
      chart: 'liquidity_sweep_bullish',
      stage: 'reversal',
      heading: 'Dip Below, Then Reclaim',
      say: "Drop to the fifteen-minute to confirm the entry. Sometimes price dips just below the level first, shaking out weak hands, and then reclaims it. That dip-and-reclaim is healthy bullish structure — buyers stepping in exactly where we expected them. That's your trigger.",
      show: [
        { kind: 'level',  at: 'support', label: 'the level', side: 'left' },
        { kind: 'marker', at: 'sweepLow', label: 'dip below', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'reclaim', label: 'reclaim — bullish structure', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'finite',
      type: 'CONCEPT',
      say: "Two rules to carry out of this. At demand and support, look to buy; at supply and resistance, look to sell — never the other way around. And remember zones are finite: the more times a level is tested, the weaker it gets, so the first clean test is almost always the best one to trade.",
      panel: {
        title: 'Buy Support, Sell Resistance',
        lines: [
          'At support / demand → look to **buy**',
          'At resistance / supply → look to **sell**',
          'Levels are finite — the **first test** is the best',
          'Define your risk right at the level'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "Recap: take the bias from the high timeframe, then drop down and mark your levels. Wait for the breakout, then trade the retest — the S R flip — with confirmation from the candles on a smaller timeframe. Patient, level-based entries in the direction of the bigger trend: that's the whole low-timeframe game.",
      panel: {
        title: 'LTF Entry — Recap',
        lines: [
          'Bias from HTF → levels on LTF',
          'Trade the **retest**, not the breakout',
          'Confirm with candle structure on a smaller timeframe',
          'Patient, level-based entries with the trend'
        ]
      }
    }
  ]
};
