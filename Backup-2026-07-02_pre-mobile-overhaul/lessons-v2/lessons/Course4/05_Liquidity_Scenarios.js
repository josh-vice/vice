/* Course4 · 05 — Liquidity Scenarios                   (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/05_liquidity_scenarios'] = {
  id: 'course4/05_liquidity_scenarios',
  course: 'Course4_Liquidity_Theory',
  module: '05_Liquidity_Scenarios',
  title: 'Liquidity Scenarios',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's take the structures from last lesson into full market scenarios: the bullish under-over, then the bearish over-under, and finally why a liquidity pool differs from both. The plan is always the same — define the range, let the trap spring, wait for the reclaim, and enter on the retest, targeting the far side.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Liquidity Scenarios',
        lines: [
          'Bullish under-over, then the bearish mirror',
          'Range → trap → reclaim → **retest entry** → target',
          'Plus: structure vs **pool** — the time difference'
        ]
      }
    },
    {
      id: 'define',
      type: 'CHART',
      chart: 'range_bound',
      stage: 'all',
      heading: 'Storyboard the Range',
      say: "First, storyboard the scenario. I define my ranges with touch points — a retest here, a touch there — until I can clearly mark a range low, a range high, and the mid. Almost-equal swing lows tell me where the stops sit: tucked below the swing low, with buffer. That's identified liquidity, and the aggressive crowd is watching these exact edges.",
      show: [
        { kind: 'level', at: 'high', label: 'range high', side: 'left', tone: 'resistance' },
        { kind: 'level', at: 'low',  label: 'range low',  side: 'left', tone: 'support' },
        { kind: 'zone',  side: 'below', of: 'low', tone: 'reward', label: 'stops below the swing low — identified liquidity' }
      ]
    },
    {
      id: 'uo-break',
      type: 'CHART',
      chart: 'under_over',
      stage: 'break',
      heading: 'The Sharp Move Down',
      say: "Now the under-over unfolds. A sharp move down takes price through the range low. The longs' stops are triggered — maybe some liquidations too — and the breakdown shorts hop in, aggressive sellers convinced support is gone. Trapped traders are the key component of every liquidity structure, and they just arrived.",
      show: [
        { kind: 'level',  at: 'rangeLow', label: 'the range low', side: 'left', tone: 'support' },
        { kind: 'marker', at: 'breakdown', label: 'stops run — breakdown shorts pile in', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'uo-base',
      type: 'CHART',
      chart: 'under_over',
      stage: 'base',
      heading: 'Time Spent Below',
      say: "Look what's missing: follow-through. The sellers can't push price any lower. Note the time spent down here — this isn't a single wick; price is basing below the level while the larger players fill their bids from the engineered liquidity. Remember this time factor. When we get to liquidity pools, it's the key difference.",
      show: [
        { kind: 'marker', at: 'basing', label: 'basing — the whale fills its bids', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'uo-reclaim',
      type: 'CHART',
      chart: 'under_over',
      stage: 'reclaim',
      heading: 'The Reclaim',
      say: "Then a strong bullish candle back up through the range low. This is an S/R flip: support broke, should have become resistance, and price reclaimed it — support again. The deviation below was a manufactured move to engineer liquidity, and the trapped shorts are now fuel. We don't chase this candle, though. We wait.",
      show: [
        { kind: 'marker', at: 'reclaim', label: 'reclaimed — S/R flip back to support', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'uo-entry',
      type: 'CHART',
      chart: 'under_over',
      stage: 'all',
      heading: 'Entry on the Retest',
      say: "Price comes back down and retests the reclaimed range low — and that retest is our entry. Stop-loss underneath the structure low, with enough buffer below the wick in case we catch any other scary wicks. Target the far side of the range. If this really was manufactured liquidity, the trend should be up — and it is.",
      show: [
        { kind: 'marker', at: 'retest', label: 'retest = long entry', style: 'reversal', place: 'below' },
        { kind: 'note',   at: 'breakdown', label: 'stop below the wick — with buffer', place: 'below' },
        { kind: 'level',  at: 'rangeHigh', label: 'target — range high', side: 'right', tone: 'target' }
      ]
    },
    {
      id: 'ou-trap',
      type: 'CHART',
      chart: 'over_under',
      stage: 'base',
      heading: 'Bearish Over-Under — the Trap',
      say: "Now the bearish mirror, at a swing high. Price runs the high, triggering the short stops resting above it — and the breakout longs arrive, aggressive buyers chasing the move. They're the new trapped victim. Again, watch the time spent: price bases above the level while the larger entities fill their short orders up here.",
      show: [
        { kind: 'level',  at: 'rangeHigh', label: 'the swing high', side: 'left', tone: 'resistance' },
        { kind: 'marker', at: 'breakout', label: 'high run — short stops triggered', style: 'sweep', place: 'above' },
        { kind: 'marker', at: 'basing', label: 'breakout longs — the new trapped victim', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'ou-confirm',
      type: 'CHART',
      chart: 'over_under',
      stage: 'reclaim',
      heading: 'The Breakdown Confirms',
      say: "The move back down through the level is the confirmation. Over, then under. The S/R flip runs in reverse — resistance broke, should have become support, and price fell straight back through it. The breakout longs are offside, closing out or getting liquidated on the way down.",
      show: [
        { kind: 'marker', at: 'reclaim', label: 'back under — confirmation', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'ou-entry',
      type: 'CHART',
      chart: 'over_under',
      stage: 'all',
      heading: 'The Short Retest',
      say: "Price makes its lower low, then moves back up to retest the level from beneath — a lower high into resistance. That's where we enter the short, or where a trapped long should finally sell out. Stop above the structure high, with buffer. Target the range low. Lower highs, lower lows — the structure breaks down.",
      show: [
        { kind: 'marker', at: 'retest', label: 'retest = short entry', style: 'reversal', place: 'above' },
        { kind: 'note',   at: 'breakout', label: 'stop above the high — with buffer', place: 'above' },
        { kind: 'level',  at: 'rangeLow', label: 'target — range low', side: 'right', tone: 'target' }
      ]
    },
    {
      id: 'pool',
      type: 'CANDLE',
      candle: 'bullish_sweep',
      heading: 'Structure vs Pool',
      say: "Last scenario: the liquidity pool. Same range low, same stops below — but here it's one sharp drop and one sharp move back up, all in a single candle wick. A quick liquidity grab: the larger player engineered liquidity on a single wick and filled instantly. You might not even get a retest — maybe just a dip into the candle body. One wick: pool. Time spent beyond the level: structure.",
      show: [
        { kind: 'region', of: 'lowerWick', label: 'one wick — the quick grab' },
        { kind: 'region', of: 'body',      label: 'sharp move back — no time below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the scenario playbook: define the range, let the trap spring beyond a level, watch for time spent — structure, not pool — then the reclaim, and enter on the retest with your stop buffered beyond the structure and the far side of the range as target. Range, trap, reclaim, retest, target. Next, we ask the question all of this builds toward: who is in control?",
      panel: {
        title: 'Liquidity Scenarios — Recap',
        lines: [
          'Range → trap → reclaim → **retest entry** → target',
          'Stop beyond the structure, **with buffer** — wicks happen',
          'Time beyond the level = structure · one wick = **pool**',
          'Next: who is in **control**?'
        ]
      }
    }
  ]
};
