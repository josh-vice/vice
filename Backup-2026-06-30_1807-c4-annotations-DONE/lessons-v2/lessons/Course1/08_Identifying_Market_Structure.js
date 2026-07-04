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
      say: "Now let's put swing points to work and identify structure as it forms. Markets move in a rhythm: they consolidate in a range, then contract, then expand into a trend. Spotting where you are in that rhythm is the whole skill.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'Identifying Market Structure',
        lines: [
          'Read structure as it forms — in real time',
          'The rhythm: **consolidation → contraction → expansion**',
          'Swing points tell you where you are in it'
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
      say: "It starts with buyers and sellers in balance, ranging sideways. Then the range tightens and resolves: price breaks out and sets a new high. That break above the range is your first confirmation of bullish structure — the market has chosen a direction.",
      show: [
        { kind: 'level',  at: 'rangeHigh', label: 'range high', side: 'left' },
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
        { kind: 'level',  at: 'support', label: 'support', side: 'left' },
        { kind: 'marker', at: 'sweepLow', label: 'fakeout below', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'reclaim', label: 'reclaim — impulse up', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'sr-flip',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      heading: 'Old Resistance Flips to Support',
      say: "Once price breaks out and holds, the level it broke through flips roles: old resistance becomes new support on the retest. When that flip holds and price pushes to another high, bullish structure is confirmed — you have a higher low and a higher high working together.",
      show: [
        { kind: 'level',  at: 'level', label: 'broken level', side: 'left' },
        { kind: 'marker', at: 'retest', label: 'flips to support', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'top', label: 'structure confirmed', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'bearish-case',
      type: 'CHART',
      chart: 'consolidation_breakout',
      params: { dir: 'down' },
      stage: 'breakout',
      heading: 'The Bearish Case',
      say: "The bearish read is the mirror. Price ranges, then contracts and breaks down instead. The first lower high after support fails is your tell that structure has shifted bearish. Same rhythm, opposite outcome — and the same swing-point logic identifies both.",
      show: [
        { kind: 'level',  at: 'rangeLow', label: 'support breaks', side: 'left' },
        { kind: 'marker', at: 'breakout', label: 'breakdown — bearish shift', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "Recap: identifying structure means reading the rhythm of consolidation, contraction, and expansion. Watch for breakouts that set new swing points, for fakeouts that trap the crowd before the real move, and for S R flips that confirm the new structure. Do that, and you'll know whether the market is building bullish or bearish — before the move is obvious.",
      panel: {
        title: 'Identifying Structure — Recap',
        lines: [
          'Read the rhythm: consolidation → contraction → expansion',
          'New swing points = the trend choosing a direction',
          'Fakeouts trap the crowd just before the real move',
          'S/R flips confirm the new structure'
        ]
      }
    }
  ]
};
