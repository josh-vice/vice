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
      say: "Let's walk a complete range scenario, the way it actually unfolded in the replay: define the range, buy the low, short the high — including one short that lost, exactly as the rules predicted — and recognise the break at the end. The full playbook, wins and losses both.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'A Range Scenario',
        lines: [
          'Define → trade the edges → handle the break',
          'Includes a **losing** trade — by the rules',
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
      say: "First, define the field — high, low, and mid. The range high ran back into a key higher-timeframe level, old support turned resistance; the range low sat on a strong buyer reaction. Between them, the midpoint, marked with the fib tool at zero-point-five. Structure drawn, we wait for price to come to us at the edges.",
      show: [
        { kind: 'level', at: 'high', label: 'range high — key HTF level', side: 'left', tone: 'resistance' },
        { kind: 'level', at: 'low',  label: 'range low — buyers proved here', side: 'left', tone: 'support' },
        { kind: 'level', at: 'mid',  label: 'mid — progress gauge', side: 'right', tone: 'gold' },
        { kind: 'zone',  side: 'above', of: 'low',  tone: 'reward', label: 'demand' }
      ]
    },
    {
      id: 'long',
      type: 'CHART',
      chart: 'liquidity_sweep_bullish',
      stage: 'reversal',
      heading: 'The Long — a Buffer Earns Its Keep',
      say: "The long: a resting bid at the range low on its second test — still fresh, still high hit rate — risking about four percent, targeting the range high for roughly four-to-one. The stop went below the swing low with a deliberate buffer, because wicks happen. And one did: price stabbed under the level, the buffer held, and the trade ran back through the mid to target.",
      show: [
        { kind: 'level',  at: 'support', label: 'range low — bid the 2nd test', side: 'left', tone: 'support' },
        { kind: 'marker', at: 'firstTest', label: 'first test — demand proved', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'sweepLow', label: 'the wick — buffer survives it', style: 'sweep', place: 'below' },
        { kind: 'level',  at: 'stop', label: 'stop — below the swing low, with buffer', side: 'right', tone: 'stop' },
        { kind: 'level',  at: 'target', label: 'target — the range high (~4R)', side: 'right', tone: 'target' }
      ]
    },
    {
      id: 'mid',
      type: 'CONCEPT',
      say: "Notice how the mid managed the trade. Back above the midpoint and holding, the position was more inclined to take the trip to the range high — the mid gauges each step of the trade, and can even guide a trailing stop. Scalpers on lower timeframes can also play low-to-mid, because price returns to the midpoint more often than not. What you never do is enter in the mid — that's the chop zone.",
      panel: {
        title: 'The Mid as Progress Gauge',
        lines: [
          'Reclaim + hold the mid → the high is likely',
          'Gauge each **step** of the trade; even trail off it',
          'Scalp variant: **low → mid**',
          'Never enter **in** the mid — chop zone'
        ]
      }
    },
    {
      id: 'loss',
      type: 'CHART',
      chart: 'horizontal_sr',
      params: { as: 'resistance' },
      stage: 'break',
      heading: 'The Losing Short — Rule of Fives, Live',
      say: "Later came a short at the range high — but that edge had now been tested again and again, and sellers were running dry. The level broke on the fifth touch, right through the buffered stop. Straight to the journal: support held, higher lows were forming, resistance had been hit too many times — not a trade to take again. The loss proved the rule.",
      show: [
        { kind: 'level',  at: 'level', label: 'range high — worn thin', side: 'left', tone: 'resistance' },
        { kind: 'marker', at: 'touch1', label: 'test 1 — strong rejection', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'touch5', label: 'our short — the 5th touch', style: 'reversal', place: 'above' },
        { kind: 'marker', at: 'breakout', label: 'breaks — stopped out → journal it', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'break',
      type: 'CHART',
      chart: 'consolidation_breakout',
      params: { dir: 'up', volume: true },
      stage: 'breakout',
      heading: 'The Range Breaks — Flip the Playbook',
      say: "And that was the range's ending: the worn-out high gave way and price broke out on expanding volume. A broken range high is resistance flipping to support — a potential buy area on the retest, via a simple S/R flip. The cue to stop fading edges and start trading with the new trend.",
      show: [
        { kind: 'level',  at: 'rangeHigh', label: 'range high → new support (S/R flip)', side: 'left', tone: 'support' },
        { kind: 'marker', at: 'entry', label: 'breakout — switch to trend mode', style: 'reversal', place: 'above' },
        { kind: 'marker', at: 'breakout', label: 'expanding volume confirms', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "The full scenario: define high, low, and mid; buy fresh tests of the low with buffered stops below swing points; use the mid to gauge progress; skip the fifth touch — and when you take it anyway, let the journal teach you. Then respect the break that ends the range. Ranges reward patience and punish impatience. Next, we start crafting your own trading system.",
      panel: {
        title: 'Range Scenario — Recap',
        lines: [
          'Fresh tests, **buffered** stops beyond swing points',
          'The **mid** gauges the trade’s progress',
          'The 5th touch broke — the journal caught it',
          'Respect the **breakout** that ends the range'
        ]
      }
    }
  ]
};
