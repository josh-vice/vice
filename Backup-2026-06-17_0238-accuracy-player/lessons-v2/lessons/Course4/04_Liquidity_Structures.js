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
      say: "Here's the anatomy. At a range high or low, aggressive players pile in to trade the breakout or breakdown. Larger institutional players, the whales, engineer liquidity just beyond that level — sourcing the orders to fill their own size and, in doing so, trapping retail. Once you understand who's trapped and where, you can wait for the retest of the structure, and that's where the setup lives.",
      panel: {
        title: 'The Anatomy of a Trap',
        lines: [
          'Aggressive traders pile in at the range edge',
          'Whales **engineer** liquidity just beyond it',
          'Retail gets trapped on the wrong side',
          'The **retest** of the structure is the setup'
        ]
      }
    },
    {
      id: 'under-over',
      type: 'CHART',
      chart: 'liquidity_sweep_bullish',
      stage: 'reversal',
      heading: 'Bullish Under-Over (at the Range Low)',
      say: "This is the bullish structure — I call it the under-over, and it's a known pattern others call a Quasimodo. At the range low, price dips under the level, triggering and trapping the breakdown shorts who sold the move. Then it pulls back over the level and reverses up. The shorts are offside, their stops become fuel, and price runs. Under the level, then back over it — under-over.",
      show: [
        { kind: 'level',  at: 'support', label: 'range low', side: 'left' },
        { kind: 'marker', at: 'sweepLow', label: 'under — breakdown shorts trapped', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'reclaim', label: 'over — reclaim and reverse up', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'over-under',
      type: 'CHART',
      chart: 'liquidity_sweep_bearish',
      stage: 'reversal',
      heading: 'Bearish Over-Under (at the Range High)',
      say: "The bearish mirror is the over-under. At the range high, price pokes over the level, triggering and trapping the breakout longs who bought the breakout. Then it drops back under the level and reverses down. Now the longs are offside, and their stops feed the move lower. Over the level, then back under it — over-under. Same trap, opposite direction.",
      show: [
        { kind: 'level',  at: 'resistance', label: 'range high', side: 'left' },
        { kind: 'marker', at: 'sweepHigh', label: 'over — breakout longs trapped', style: 'sweep', place: 'above' },
        { kind: 'marker', at: 'reclaim', label: 'under — reject and reverse down', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the two core structures are the bullish under-over at a range low and the bearish over-under at a range high. Both work by engineering liquidity beyond a level to trap the aggressive crowd, then reversing. Learn to spot them, wait for the reclaim, and you're trading alongside the whale instead of becoming their fuel. Next, we walk these structures through full scenarios.",
      panel: {
        title: 'Liquidity Structures — Recap',
        lines: [
          '**Under-over** (bullish) at the range low',
          '**Over-under** (bearish) at the range high',
          'Both engineer liquidity to trap the crowd',
          'Wait for the reclaim — trade with the whale'
        ]
      }
    }
  ]
};
