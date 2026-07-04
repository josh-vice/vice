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
      say: "Markets trend only about a third of the time — the rest, they range. So learning to trade sideways is not optional. The good news: a range hands you two clear levels and a repeatable plan. Let's build the range playbook.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Trading Ranges',
        lines: [
          'Markets range most of the time',
          'A range gives you two clear levels',
          'A repeatable, two-sided playbook'
        ]
      }
    },
    {
      id: 'playbook',
      type: 'CHART',
      chart: 'range_bound',
      stage: 'all',
      heading: 'The Range Playbook',
      say: "Here's a range: a defined high acting as resistance, a defined low acting as support. The core play writes itself — sell near the range high where sellers defend, buy near the range low where buyers defend, and target the opposite edge. Price ping-pongs between the two until the range eventually breaks. Inside it, the edges are your bread and butter.",
      show: [
        { kind: 'level', at: 'high', label: 'sell here — range high', side: 'left' },
        { kind: 'level', at: 'low',  label: 'buy here — range low',  side: 'left' },
        { kind: 'zone',  side: 'below', of: 'high', label: 'sellers / supply' },
        { kind: 'zone',  side: 'above', of: 'low',  label: 'buyers / demand' }
      ]
    },
    {
      id: 'tactics',
      type: 'CONCEPT',
      say: "Three tactics sharpen it. First, the edges aren't exact lines — expect fakeouts and deviations, so wait for a reaction rather than a precise touch. Second, mark the midpoint; it often acts as a magnet and a decision point. And third, the more times an edge is tested, the closer it is to breaking, so stay alert for the consolidation to resolve into a breakout or breakdown.",
      panel: {
        title: 'Range Tactics',
        lines: [
          'Edges aren’t exact — expect **fakeouts**',
          'Mark the **midpoint** — a magnet and decision point',
          'More tests → closer to a break',
          'Be ready for the breakout or breakdown'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So in a range, sell the high, buy the low, respect the fakeouts, and watch for the eventual break. Scalpers and day traders live in these conditions. The key skill underneath it all is the one from Course One: correctly identifying that you're in a range in the first place. Next, we walk a full range scenario from start to finish.",
      panel: {
        title: 'Trading Ranges — Recap',
        lines: [
          'Sell the high, buy the low',
          'Respect fakeouts; watch the midpoint',
          'Anticipate the eventual **break**',
          'First, correctly identify the range'
        ]
      }
    }
  ]
};
