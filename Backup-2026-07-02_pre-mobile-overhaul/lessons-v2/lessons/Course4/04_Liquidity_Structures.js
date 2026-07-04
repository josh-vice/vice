/* Course4 · 04 — Liquidity Structures                  (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/04_liquidity_structures'] = {
  id: 'course4/04_liquidity_structures',
  course: 'Course4_Liquidity_Theory',
  module: '04_Liquidity_Structures',
  title: 'Liquidity Structures',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now that you can see liquidity, let's name the structures it forms. The whole purpose of a liquidity structure is to identify trapped traders — eager breakout longs and breakdown shorts who got caught on the wrong side. These show up most often in range-bound markets, and once you see the anatomy, the charts start to explain themselves.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Liquidity Structures',
        lines: [
          'Structures that reveal **trapped traders**',
          'Victims: aggressive breakout longs / breakdown shorts',
          'Most common in **range-bound** markets'
        ]
      }
    },
    {
      id: 'anatomy',
      type: 'CONCEPT',
      say: "Here's the anatomy. At a range high or low, aggressive players pile in to trade the breakout or breakdown. Larger institutional players, the whales, engineer liquidity just beyond that level — sourcing the orders to fill their own size and, in doing so, trapping retail. Once you understand who's trapped and where, you wait — because the retest of the structure often provides the best trade setup.",
      panel: {
        title: 'The Anatomy of a Trap',
        lines: [
          'Aggressive traders pile in at the range edge',
          'Whales **engineer** liquidity just beyond it',
          'Retail gets trapped on the wrong side',
          'The **retest** of the structure often provides the best setup'
        ]
      }
    },
    {
      id: 'uo-break',
      type: 'CHART',
      chart: 'under_over',
      stage: 'break',
      heading: 'Bullish Under-Over — the Break',
      say: "Here's the bullish structure. I call it the under-over — I stumbled on it as a student of the range, and later learned others know it as a QM, or Quasimodo. We're in a range: buyers bid the low, and their stops rest beneath the swing low. Then price breaks under the level. That break engineers long liquidity below the range low — victim group one, the resting long stop-losses, swept.",
      show: [
        { kind: 'level',  at: 'rangeLow', label: 'range low', side: 'left', tone: 'support' },
        { kind: 'marker', at: 'breakdown', label: 'under — long stops swept', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'uo-base',
      type: 'CHART',
      chart: 'under_over',
      stage: 'base',
      heading: 'Time Below = Structure',
      say: "Now victim group two: the eager breakdown shorts. They see support failing and hop in aggressively — but price doesn't follow through. Watch the time spent below the level. A pool is a single wick; a structure spends time down here, basing, while the larger player fills a long position from all that engineered liquidity. The shorts are now trapped.",
      show: [
        { kind: 'marker', at: 'basing', label: 'basing — breakdown shorts trapped', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'uo-reclaim',
      type: 'CHART',
      chart: 'under_over',
      stage: 'reclaim',
      heading: 'The Reclaim',
      say: "Then the move: price shoots back up through the prior range low, squeezing the aggressive shorts. It's an S/R flip you already know — support broke, so it should be resistance, but price broke back out through it, so it's support again. Under the level, then back over it. Under-over.",
      show: [
        { kind: 'marker', at: 'reclaim', label: 'over — reclaim through the low', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'uo-retest',
      type: 'CHART',
      chart: 'under_over',
      stage: 'all',
      heading: 'The Retest',
      say: "And here's the payoff. Price comes back down into the reclaimed level — the retest of the S/R flip — and that retest of the structure often provides the best trade setup. You're entering long where the trapped shorts must cover and where the whale has already filled. Higher high off the retest, and price runs.",
      show: [
        { kind: 'marker', at: 'retest', label: 'retest — the best setup', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'target', label: 'higher high — the run', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'ou-trap',
      type: 'CHART',
      chart: 'over_under',
      stage: 'base',
      heading: 'Bearish Over-Under — the Trap',
      say: "The bearish mirror is the over-under, at a range high. Price pushes over the level — victim group one, the short stop-losses above the swing, swept. In come victim group two: breakout longs, aggressive buyers chasing the move. But price bases up here instead of continuing — time spent above the level while larger players fill short positions. The longs are trapped.",
      show: [
        { kind: 'level',  at: 'rangeHigh', label: 'range high', side: 'left', tone: 'resistance' },
        { kind: 'marker', at: 'breakout', label: 'over — short stops swept', style: 'sweep', place: 'above' },
        { kind: 'marker', at: 'basing', label: 'time above — breakout longs trapped', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'ou-reclaim',
      type: 'CHART',
      chart: 'over_under',
      stage: 'reclaim',
      heading: 'Back Under the Level',
      say: "Then price drops back under the range high — over, then under. The breakout longs are offside now, closing out or getting liquidated, and their selling feeds the move down. The S/R flip runs in reverse: resistance broke and should have become support, but price fell back through — resistance again.",
      show: [
        { kind: 'marker', at: 'reclaim', label: 'under — back through the high', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'ou-retest',
      type: 'CHART',
      chart: 'over_under',
      stage: 'all',
      heading: 'The Retest From Below',
      say: "And the mirror setup: price makes a lower low, then rises back into the underside of the level — a retest of it as resistance. That's an optimal area to enter a short, or to finally sell out of a trapped long. The liquidity engineered up top filled large short positions, and now market structure breaks down.",
      show: [
        { kind: 'marker', at: 'retest', label: 'retest — optimal short area', style: 'reversal', place: 'above' },
        { kind: 'marker', at: 'target', label: 'lower low — structure breaks down', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the two core structures: the bullish under-over engineers long liquidity below a range low, and the bearish over-under engineers short liquidity above a range high. Both sweep one side's stops and trap the other side's breakout traders — two victim groups — and both spend time beyond the level, which is what separates a structure from a single-wick pool. They live in range-bound markets, and the retest is the setup. Next: full scenarios.",
      panel: {
        title: 'Liquidity Structures — Recap',
        lines: [
          '**Under-over** — engineers *long* liquidity below the range low',
          '**Over-under** — engineers *short* liquidity above the range high',
          'Two victims: stops swept **and** breakout traders trapped',
          '**Time beyond the level** — structure, not pool',
          'The **retest** = the setup · next: full scenarios'
        ]
      }
    }
  ]
};
