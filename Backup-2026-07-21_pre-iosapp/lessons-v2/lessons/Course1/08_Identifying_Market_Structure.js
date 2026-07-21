/* Course1 · 08 — Identifying Market Structure          (v2 lesson)
   Source provenance (read-only): YouTube bz5NO9P9nGE. The source walked real
   Gold/ETH replays; here those are idealized, ticker-free vocabulary moves. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/08_identifying_market_structure'] = {
  id: 'course1/08_identifying_market_structure',
  course: 'Course1_Laying_The_Foundation',
  module: '08_Identifying_Market_Structure',
  title: 'Identifying Market Structure',
  source_video: 'bz5NO9P9nGE',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now let's put swing points to work and identify structure as it forms. Consolidation, expansion, and contraction all play into this. A range-bound market typically precedes a break: break bullish and it's an expansion; break bearish and it's a contraction. Spotting which one you're watching is the whole skill.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'Identifying Market Structure',
        lines: [
          'Read structure as it forms — in real time',
          'Consolidation typically **precedes the break**',
          '**Expansion** = bullish break · **Contraction** = bearish break',
          'Swing points tell you which one you’re watching'
        ]
      }
    },
    {
      id: 'consolidation',
      type: 'CHART',
      chart: 'consolidation_breakout',
      params: { dir: 'up' },
      stage: 'breakout',
      heading: 'Consolidation → Expansion',
      say: "It starts with buyers and sellers in balance, ranging sideways — consolidation. Then price impulses out of the range to the upside: that bullish break is an expansion. It takes out the old highs and sets a new swing high — your first confirmation of bullish structure. The market has chosen a direction.",
      show: [ { kind: 'level', at: 'rangeLow', side: 'left', label: 'range low', tone: 'reward' },
        { kind: 'level',  at: 'rangeHigh', label: 'range high', side: 'left', tone: 'risk' },
        { kind: 'marker', at: 'breakout', label: 'new swing high — bullish', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'fakeout',
      type: 'CHART',
      chart: 'liquidity_sweep_bullish',
      stage: 'reversal',
      heading: 'A Fakeout Before the Move',
      say: "But structure isn't always clean. Often, just before the real move, price fakes out below support — a quick deviation that traps the sellers — and then reverses hard to the upside. Recognising that the breakdown was fake is what keeps you on the right side of the structure.",
      show: [
        { kind: 'level',  at: 'support', label: 'support', side: 'left', tone: 'reward' },
        { kind: 'marker', at: 'sweepLow', label: 'fakeout below — traps sellers', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'reclaim', label: 'reclaim — impulse up', style: 'reversal', place: 'above' },
        { kind: 'marker', at: 'reversalTop', label: 'reverses hard to the upside', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'sr-flip',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      heading: 'Old Resistance Flips to Support',
      say: "Once price breaks out and holds, the level it broke through flips roles: old resistance becomes new support on the retest. When that flip holds and price pushes to another high, bullish structure is confirmed — you have a higher low and a higher high working together.",
      show: [ { kind: 'marker', at: 'breakout', style: 'reversal', place: 'above', label: 'breaks out & holds' },
        { kind: 'level',  at: 'level', label: 'broken level', side: 'left' },
        { kind: 'marker', at: 'swingLow', label: 'prior low', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'higherLow', label: 'flips to support = higher low', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'higherHigh', label: 'higher high — structure confirmed', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'bearish-case',
      type: 'CHART',
      chart: 'consolidation_breakout',
      params: { dir: 'down' },
      stage: 'breakout',
      heading: 'The Bearish Case — Contraction',
      say: "The bearish read is the mirror: a contraction. Price consolidates, the range low is tested again and again, and then support gives way — an impulse breaks down out of the range. That break below the lows sets a new swing low, and structure has shifted bearish. Same swing-point logic, opposite outcome.",
      show: [ { kind: 'level', at: 'rangeHigh', side: 'left', label: 'range high', tone: 'risk' },
        { kind: 'level',  at: 'rangeLow', label: 'support breaks', side: 'left', tone: 'reward' },
        { kind: 'marker', at: 'entry', label: 'impulse breaks down', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'breakout', label: 'new swing low — bearish', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "Recap: consolidation is the trendless phase — what follows is the break. An expansion breaks bullish, into higher highs and higher lows; a contraction breaks bearish, into lower highs and lower lows. Either break can also be continuation of the trend that came before. Watch for fakeouts that trap the crowd, and S R flips that confirm the shift. And finally: market structure analysis — MSA — is only relevant on the timeframe being analyzed.",
      panel: {
        title: 'Identifying Structure — Recap',
        lines: [
          'Consolidation is **trendless** — what follows is the break',
          '**Expansion** = bullish break · **Contraction** = bearish break',
          'A break can also be **continuation** of the prior trend',
          'Fakeouts trap the crowd; S/R flips confirm the shift',
          'MSA is only relevant on the **timeframe being analyzed**'
        ]
      }
    }
  ]
};
