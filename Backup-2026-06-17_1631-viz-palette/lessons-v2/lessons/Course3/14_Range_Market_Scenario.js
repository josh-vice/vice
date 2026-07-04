/* Course3 · 14 — Range Market Scenario                 (v2 lesson)
   Source was a long real-chart replay; distilled into idealized, ticker-free moves. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/14_range_market_scenario'] = {
  id: 'course3/14_range_market_scenario',
  course: 'Course3_Sharpening_Your_Edge',
  module: '14_Range_Market_Scenario',
  title: 'Range Market Scenario',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's walk a complete range scenario, the way it actually unfolds. We'll define the range, trade an edge with a twist, and then handle the eventual break. This ties together everything from the playbook into one continuous trade.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'A Range Scenario',
        lines: [
          'Define → trade an edge → handle the break',
          'The playbook, in one continuous example',
          'How a range really unfolds'
        ]
      }
    },
    {
      id: 'define',
      type: 'CHART',
      chart: 'range_bound',
      stage: 'all',
      heading: 'Define the Range',
      say: "First, define the field. Several touches confirm a range high acting as resistance and a range low acting as support. Now we have our two edges, our two zones, and a plan: look to sell up at the high, look to buy down at the low. With the structure marked, we wait for price to come to us.",
      show: [
        { kind: 'level', at: 'high', label: 'Range High', side: 'left' },
        { kind: 'level', at: 'low',  label: 'Range Low', side: 'left' },
        { kind: 'zone',  side: 'below', of: 'high', label: 'supply' },
        { kind: 'zone',  side: 'above', of: 'low',  label: 'demand' }
      ]
    },
    {
      id: 'deviation',
      type: 'CHART',
      chart: 'liquidity_sweep_bullish',
      stage: 'reversal',
      heading: 'A Deviation at the Range Low',
      say: "Now the twist. Price drives down to the range low, then pokes just below it — a deviation, or fakeout. The weak hands who sold the breakdown get trapped, price snaps back above the low, and the reclaim is the real signal. Buying that reclaim, rather than the exact touch, is how you trade a range edge without getting wicked out.",
      show: [
        { kind: 'level',  at: 'support', label: 'range low', side: 'left' },
        { kind: 'marker', at: 'sweepLow', label: 'deviation below', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'reclaim', label: 'reclaim = buy', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'break',
      type: 'CHART',
      chart: 'consolidation_breakout',
      params: { dir: 'up' },
      stage: 'breakout',
      heading: 'The Range Breaks',
      say: "Eventually every range resolves. Here the buyers at the low finally overpower the sellers at the high, and price breaks out of the top on expanding volume. That's the cue to switch gears — from fading the edges to trading with the new trend. A clean breakout from a long range often kicks off the strongest moves.",
      show: [
        { kind: 'level',  at: 'rangeHigh', label: 'range high', side: 'left' },
        { kind: 'marker', at: 'breakout', label: 'breakout — switch to trend mode', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the full scenario: define the range, trade its edges using reclaims to dodge fakeouts, and recognise the breakout that ends the range and starts a trend. Ranges reward patience and punish impatience. Get comfortable here, because consolidation is where most of market life is spent. Next, we start crafting your own trading system.",
      panel: {
        title: 'Range Scenario — Recap',
        lines: [
          'Define the range and its zones',
          'Trade edges with **reclaims**, not exact touches',
          'Respect the **breakout** that ends the range',
          'Patience is the whole game'
        ]
      }
    }
  ]
};
