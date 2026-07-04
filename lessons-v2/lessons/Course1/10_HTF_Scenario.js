/* Course1 · 10 — HTF Scenario Analysis                 (v2 lesson)
   Source provenance (read-only): YouTube TD3i7Rv130E. The source replayed a real
   high-timeframe chart; here the method is distilled into idealized moves. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/10_htf_scenario'] = {
  id: 'course1/10_htf_scenario',
  course: 'Course1_Laying_The_Foundation',
  module: '10_HTF_Scenario',
  title: 'HTF Scenario Analysis',
  source_video: 'TD3i7Rv130E',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's walk a high-timeframe scenario end to end. The discipline here is simple but powerful: before you think about any trade, mark the major levels first. On a high timeframe those levels carry the most weight, and price respects them again and again. The method is a drill-down: mark the monthly, refine on the weekly, then work the daily.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'HTF Scenario Analysis',
        lines: [
          'Walk a high-timeframe chart, step by step',
          'Mark the **major levels first** — always',
          'High-timeframe levels carry the most weight',
          'Drill down: **monthly → weekly → daily**'
        ]
      }
    },
    {
      id: 'mark-levels',
      type: 'CHART',
      chart: 'horizontal_sr',
      params: { as: 'resistance' },
      stage: 'hold',
      heading: 'Mark the High-Timeframe Level',
      say: "Here's our high-timeframe level, drawn across several swing highs that all stalled in the same place. Notice how price gets rejected here repeatedly — that's confirmation this level matters. But remember: the orders at a level are finite. Every test eats into them, so the more a level is tested, the weaker it becomes.",
      show: [
        { kind: 'level',  at: 'level', label: 'monthly resistance', side: 'left' },
        { kind: 'marker', at: 'touch1', label: 'rejected', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'touch3', label: 'rejected again', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'touch5', label: 'still holding — but weaker each test', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'the-break',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'breakout',
      heading: 'The Break and Retest',
      say: "Now take a marked level like this one — resistance that's been tested and rejected before. Eventually price breaks it. Here's where the scenario gets interesting: instead of chasing the breakout, we wait.",
      show: [
        { kind: 'level',  at: 'level', label: 'the marked level', side: 'left' },
        { kind: 'marker', at: 'breakout', label: 'breakout', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'the-retest',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      say: "Price returns to the level, and the old resistance holds as new support. That retest is the high-probability long: stop tucked just under the flipped level, target at the continuation. The level we marked hours of analysis ago is now paying us.",
      show: [
        { kind: 'marker', at: 'retest', label: 'retest = the entry', style: 'reversal', place: 'below' },
        { kind: 'level',  at: 'stop', label: 'stop — under the flip', side: 'right' },
        { kind: 'level',  at: 'target', label: 'target', side: 'right' }
      ]
    },
    {
      id: 'defend',
      type: 'CHART',
      chart: 'liquidity_sweep_bullish',
      stage: 'reversal',
      heading: 'Buyers Defend the Level',
      say: "How do you know the retest will hold? Drop to the daily and watch the candles at the level. A long lower wick that dips below it and snaps back is buyers stepping in to defend — the exact signal we learned in price action. On a high-timeframe level, that wick is your green light.",
      show: [
        { kind: 'level',  at: 'support', label: 'HTF level', side: 'left', tone: 'reward' },
        { kind: 'marker', at: 'sweepLow', label: 'wick below', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'reclaim', label: 'buyers defend → long', style: 'reversal', place: 'above' },
        { kind: 'level',  at: 'stop', label: 'stop — below the sweep', side: 'right' },
        { kind: 'level',  at: 'target', label: 'target', side: 'right' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "Recap: on a high timeframe, mark the major levels before anything else, then let price come to them. Layer your levels — monthly and weekly often stack near each other, and where they align is where reactions are strongest. And the flip cuts both ways: on a breakdown, old support becomes resistance overhead. The first test of a fresh level is usually the cleanest. Patience around marked levels is the whole game.",
      panel: {
        title: 'HTF Scenario — Recap',
        lines: [
          'Mark the major levels **before** you trade',
          'Let price come to your levels — don’t chase',
          'Layered levels (monthly + weekly) react strongest',
          'Breakdowns flip too: old **support → resistance**',
          'The **first test** of a fresh level is the cleanest'
        ]
      }
    }
  ]
};
