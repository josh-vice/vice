/* Course1 · 06 — Range-Bound Markets                  (v2 lesson)
   Source provenance (read-only): YouTube nr3a5REunRY. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/06_rangebound_markets'] = {
  id: 'course1/06_rangebound_markets',
  course: 'Course1_Laying_The_Foundation',
  module: '06_Rangebound_Markets',
  title: 'Range-Bound Markets',
  source_video: 'nr3a5REunRY',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "We've covered uptrends and downtrends. So what happens in between? A range-bound, or horizontal, market — where price simply bounces between a high and a low. The range high is resistance, the range low is support, and multiple touches of each confirm the range.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'Range-Bound Markets',
        lines: [
          'The market between trends — no clear direction',
          'Price bounces between a **range high** and a **range low**',
          'High = resistance, low = support — touches confirm it'
        ]
      }
    },
    {
      id: 'the-range',
      type: 'CHART',
      chart: 'range_bound',
      stage: 'all',
      heading: 'Range High & Range Low',
      say: "Here's a range. At the top, sellers and supply step in every time price reaches the range high. At the bottom, buyers and demand step in at the range low. Price ping-pongs between the two, and the levels are defined by repeated touches — this is just horizontal support and resistance doing its job.",
      show: [
        { kind: 'level', at: 'high', label: 'Range High — resistance', side: 'left' },
        { kind: 'level', at: 'low',  label: 'Range Low — support', side: 'left' },
        { kind: 'zone',  side: 'below', of: 'high', label: 'sellers / supply' },
        { kind: 'zone',  side: 'above', of: 'low',  label: 'buyers / demand' }
      ]
    },
    {
      id: 'players',
      type: 'CONCEPT',
      say: "How do we trade it? Be a buyer at the range low and a seller at the range high. But remember the finite rule: the range high holds only so many sellers, the range low only so many buyers. Each touch brings one side closer to exhaustion — the rule of fives. And the range low isn't a line in the sand; expect the occasional fakeout, or deviation, where price pokes through before snapping back.",
      panel: {
        title: 'The Players & the Rule of Fives',
        lines: [
          'Buy the range **low**, sell the range **high**',
          'Each touch wears one side down — the rule of fives',
          'Watch for **fakeouts** — the edges aren’t exact lines',
          'A range is a **consolidation** — it precedes a big move'
        ]
      }
    },
    {
      id: 'breakout',
      type: 'CHART',
      chart: 'consolidation_breakout',
      params: { dir: 'up' },
      stage: 'breakout',
      heading: 'Consolidation → Breakout',
      say: "A range is a coiled spring. Watch what happens when the sellers at the top finally run out: around that fifth test, the buyers win, and price breaks out above the range. A consolidation always resolves — and here it resolved to the upside.",
      show: [
        { kind: 'level',  at: 'rangeHigh', label: 'range high', side: 'left' },
        { kind: 'level',  at: 'rangeLow',  label: 'range low',  side: 'left' },
        { kind: 'marker', at: 'breakout', label: 'sellers exhausted — breakout', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'breakdown',
      type: 'CHART',
      chart: 'consolidation_breakout',
      params: { dir: 'down' },
      stage: 'breakout',
      heading: '…or Breakdown',
      say: "Or the other way. If the buyers at the range low give way first, price breaks down instead and a downtrend begins. Same coiled range, opposite resolution. The lesson is the same: define the high and the low, and watch which side gets exhausted to anticipate the breakout or breakdown.",
      show: [
        { kind: 'level',  at: 'rangeHigh', label: 'range high', side: 'left' },
        { kind: 'level',  at: 'rangeLow',  label: 'range low',  side: 'left' },
        { kind: 'marker', at: 'breakout', label: 'buyers exhausted — breakdown', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "To recap: range-bound markets aren't trending — they're defined by horizontal support and resistance, and they're also called consolidation phases. Trade the low as a buyer and the high as a seller, remember both edges are finite, and stay alert for fakeouts. A range is usually the calm before an expansion.",
      panel: {
        title: 'Range-Bound — Recap',
        lines: [
          'Not trending — defined by horizontal S/R',
          'Buy the low, sell the high — both edges are **finite**',
          'Beware fakeouts and deviations at the edges',
          'Consolidation precedes a breakout or breakdown'
        ]
      }
    }
  ]
};
