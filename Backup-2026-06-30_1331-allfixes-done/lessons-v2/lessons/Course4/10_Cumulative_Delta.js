/* Course4 · 10 — Cumulative Delta                      (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/10_cumulative_delta'] = {
  id: 'course4/10_cumulative_delta',
  course: 'Course4_Liquidity_Theory',
  module: '10_Cumulative_Delta',
  title: 'Cumulative Delta',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Third variable: cumulative delta. Delta is the difference between cumulative buying and cumulative selling — the running net of longs versus shorts. Think of it as the scoreboard of that buyer-versus-seller conversation. When it's rising, buyers are winning the flow; when it's falling, sellers are. And its relationship to price is where the magic is.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Cumulative Delta',
        lines: [
          'Cumulative **buying minus selling**',
          'The running net of longs vs shorts',
          'The scoreboard of order flow'
        ]
      }
    },
    {
      id: 'divergence',
      type: 'CHART',
      chart: 'cumulative_delta',
      stage: 'all',
      heading: 'Delta Divergence',
      say: "Here's the most powerful read. Watch price make a higher high at the top. But look at the delta line below — it makes a lower high. Price pushed up, but there was actually less net buying behind the second move than the first. That's a delta divergence: the rally looks strong on the chart but is hollow underneath. Real participation is fading, and a reversal follows.",
      show: [
        { kind: 'marker', at: 'high1', label: 'delta’s higher peak', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'top', label: 'price higher high, delta LOWER high — divergence', style: 'sweep', place: 'above' }
      ]
    },
    {
      id: 'reading',
      type: 'CONCEPT',
      say: "So the rule is about agreement. When delta rises along with price, the move is genuine — real buying is behind it. When delta diverges, making lower highs while price makes higher highs, the move is hollow: price is being pushed without conviction underneath. That disagreement between price and the order-flow scoreboard is one of the earliest warnings of a reversal.",
      panel: {
        title: 'Reading Delta',
        lines: [
          'Delta agrees with price → the move is **real**',
          'Delta diverges → the move is **hollow**',
          'Lower delta highs into higher price highs = warning',
          'An early read on a fading move'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "To recap: cumulative delta is the net of buying versus selling, and divergence between delta and price exposes a move running out of real fuel. It's a more granular look at the same question — who's actually in control beneath the surface. One variable left: the futures basis.",
      panel: {
        title: 'Cumulative Delta — Recap',
        lines: [
          'Net buying minus selling',
          '**Divergence** exposes a hollow move',
          'A granular read on real control',
          'Next: the futures basis'
        ]
      }
    }
  ]
};
