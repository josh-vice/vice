/* Course3 · 13 — Trading Ranges                        (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/13_trading_ranges'] = {
  id: 'course3/13_trading_ranges',
  course: 'Course3_Sharpening_Your_Edge',
  module: '13_Trading_Ranges',
  title: 'Trading Ranges',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Between trending markets sits consolidation — and ranges are where I live as a trader. Range trading is a backtested part of my own system, a scalping style that helps me read the conversation between buyers and sellers and spot when it's nearing exhaustion. A range hands you clear levels and a repeatable plan. Let's build it.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Trading Ranges',
        lines: [
          'Consolidation sits between trends',
          'A **backtested** part of my own system',
          'Clear levels, repeatable playbook'
        ]
      }
    },
    {
      id: 'components',
      type: 'CHART',
      chart: 'range_bound',
      stage: 'all',
      heading: 'The Three Components',
      say: "A range has three components. The range high is simply your sellers — the supply zone acting as resistance. The range low is your buyers — the demand zone acting as support. And the one most people overlook: the midpoint. The mid tells you who's in control — trading above it, price is more likely to visit the high; below it, more likely to test the low.",
      show: [
        { kind: 'level', at: 'high', label: 'range high — sellers / supply', side: 'left', tone: 'resistance' },
        { kind: 'level', at: 'low',  label: 'range low — buyers / demand',  side: 'left', tone: 'support' },
        { kind: 'level', at: 'mid',  label: 'midpoint — who’s in control?', side: 'right', tone: 'gold' }
      ]
    },
    {
      id: 'playbook',
      type: 'CHART',
      chart: 'range_bound',
      stage: 'all',
      heading: 'The Core Play',
      say: "The core play writes itself: be a buyer at the range low where demand defends, be a seller at the range high where supply defends, and target the opposite edge. Price spends most of its time around the mid — the chop zone — so let the traders with no plan fight it out there while you wait at the tails.",
      show: [
        { kind: 'zone',   side: 'below', of: 'high', tone: 'risk',   label: 'supply — sellers' },
        { kind: 'zone',   side: 'above', of: 'low',  tone: 'reward', label: 'demand — buyers' },
        { kind: 'marker', at: 'touchLo1', label: 'buy the low → target the high', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'touchHi2', label: 'sell the high → target the low', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'tactics',
      type: 'CONCEPT',
      say: "Four rules govern my range trading. One: trade first tests — a fresh test of the low or high is the conservative play with a high hit rate, straight from depletion. Two: the mid is a gauge, not a trade — never position in the chop zone. Three: the Rule of Fives — the fifth touch often breaks the level; don't long or short it. Four: swing points are invalidation — stop beyond them, with a buffer, because wicks happen.",
      panel: {
        title: 'The Four Range Rules',
        lines: [
          '**1 · First tests** — high hit rate (depletion)',
          '**2 · The mid is a gauge** — don’t trade the chop zone',
          '**3 · Rule of Fives** — the 5th touch often breaks; don’t trade it',
          '**4 · Swing-point invalidation** — stop beyond it, **with buffer**'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So in a range: buy the low, sell the high, read control off the mid, count your touches, and anchor stops beyond swing points with a buffer. Scalpers and day traders live in these conditions — and the key skill underneath is still Course One's: correctly identifying the range in the first place. Next, we walk a full range scenario, trades and all.",
      panel: {
        title: 'Trading Ranges — Recap',
        lines: [
          'Buy the low, sell the high, respect the **mid**',
          'Count touches — **Rule of Fives**',
          'Stops beyond swing points, with **buffer**',
          'Next: a full live-range walkthrough'
        ]
      }
    }
  ]
};
