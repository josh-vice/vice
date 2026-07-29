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
      say: "Third variable: cumulative delta. The calculation is simple: market buy orders minus market sell orders, kept as a running cumulative total. Think of it as the scoreboard of that buyer-versus-seller conversation — the longs and shorts hitting the market. When it's rising, market buyers are winning the flow; when it's falling, market sellers are. What we're hunting in that scoreboard is imbalance.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Cumulative Delta',
        lines: [
          '**Market buys − market sells**, cumulatively',
          'The scoreboard of longs vs shorts',
          'We’re hunting **imbalances**'
        ]
      }
    },
    {
      id: 'surge',
      type: 'CHART',
      chart: 'cumulative_delta',
      stage: 'all',
      heading: 'The Flow Builds',
      say: "Watch the delta line as this rally builds. Market buys are overwhelming market sells and the line surges — the crowd is leaning long, and leaning hard.",
      show: [
        { kind: 'marker', at: 'high1', label: 'delta surging — aggressive market buying', style: 'dot', place: 'above', panel: 'sub' }
      ]
    },
    {
      id: 'imbalance',
      type: 'CHART',
      chart: 'cumulative_delta',
      stage: 'all',
      heading: 'Extreme Imbalance at the Top',
      say: "Into the high, delta is still stretched deep in the green — longs are getting too excited, right where sellers defend. That's an extreme imbalance: the buying side is overexposed and offside, and it's fuel for the flush that follows. Notice, as a secondary tell, that delta's second push was weaker than its first — real participation was already fading into the top.",
      show: [
        { kind: 'marker', at: 'top', label: 'delta very green at the high — longs offside', style: 'reversal', place: 'above', panel: 'sub' }
      ]
    },
    {
      id: 'reading',
      type: 'CONCEPT',
      say: "So the primary read is the extreme. When the delta is very green, longs are too excited — an offside crowd at resistance. When it's very red, shorts and market sellers are far too aggressive — and if that prints into a support level, they're offside and it's fuel for a squeeze up. Imbalances in the cumulative delta tell you which market participant is offside.",
      panel: {
        title: 'Reading the Imbalance',
        lines: [
          'Very **green** delta → longs too excited (offside at resistance)',
          'Very **red** delta → sellers too aggressive (squeeze fuel at support)',
          'Imbalance = who’s **offside**',
          'Extremes into a level are the signal'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "To recap: cumulative delta is market buys minus market sells, and its imbalances expose which side is overexposed beneath the surface. Stack it with funding and the open-interest read and you've got a one-two-three punch of confluence for your setups. One variable left: the futures basis.",
      panel: {
        title: 'Cumulative Delta — Recap',
        lines: [
          '**Market buys − market sells**',
          'Extreme imbalance = the offside crowd',
          'Funding + OI + delta = the one-two-three punch',
          'Next: the futures basis'
        ]
      }
    }
  ]
};
