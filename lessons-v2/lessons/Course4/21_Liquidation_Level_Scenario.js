/* Course4 · 21 — Liquidation Level Scenario            (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/21_liquidation_level_scenario'] = {
  id: 'course4/21_liquidation_level_scenario',
  course: 'Course4_Liquidity_Theory',
  module: '21_Liquidation_Level_Scenario',
  title: 'Liquidation Level Scenario',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now let's apply it — this is how I mark out my charts, and Zor looks at it the same way. On the liquidation map: 50x longs liquidate at $6,307, a 25x long cluster near $6,180, and overhead, clusters of 25x and 50x shorts off entries between $6,600 and $6,800. From the bubbles alone I can almost see support, resistance, and my DBS and SSR zones — before touching the chart.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'A Liquidation Scenario',
        lines: [
          '**$6,307** — 50x long liquidations',
          '**$6,180** — 25x long cluster',
          'Shorts entered **$6,600–6,800** above',
          'The bubbles sketch S/R by themselves'
        ]
      }
    },
    {
      id: 'plot',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'approach',
      heading: 'Plot the Liquidity',
      say: "After identifying liquidity, we plot it. Storyboard first: DBS zone, SSR zone, points of breakout and breakdown — the stuff we've already mastered. Then the secret sauce: the short clusters overhead, and the 50x and 25x long liquidations below. Price has been ranging here, the low tested again and again — liquidity building on both sides.",
      show: [
        { kind: 'level', at: 'clusterHi', label: 'short clusters — entries above', side: 'left', tone: 'short' },
        { kind: 'level', at: 'clusterLo', label: '50x · 25x long liquidations', side: 'left', tone: 'long' }
      ]
    },
    {
      id: 'sweep',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'pierce',
      heading: 'Shorts Taken Out',
      say: "A very big impulse up — and it takes out a stack of 25x and 50x shorts. The liquidity above was just sourced. Distribution sets in up top, and by liquidity theory the odds flip: with the upside pools drained, price is more likely to head down and take out those long bubbles next. Our eye moves to the 50x longs.",
      show: [
        { kind: 'marker', at: 'cascade', label: 'shorts liquidated — pool drained', style: 'sweep', place: 'above' }
      ]
    },
    {
      id: 'longs',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'reversal',
      heading: 'Rule of Fives — Longs Hit',
      say: "The range low has been hit again and again — we're coming into our fifth touch, and the Rule of Fives says don't trust it. Impulse down: the stops under the swing low get run straight into the 50x longs, then the 25x. Forced sells, dumped into the market — exactly where the predictive model said they would be.",
      show: [
        { kind: 'marker', at: 'reversal', label: '50x → 25x longs run', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'rebound',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'rebound',
      heading: 'The Rebound',
      say: "And here's the payoff. The 25x longs were run inside a mini DBS zone — a point of breakout with real support behind it. With the long liquidity sourced and the forced sellers exhausted, we get a bullish reaction: a pretty substantial rebound off the swept longs. Why? Because price got what it came for — the most liquidity — right back at demand.",
      show: [
        { kind: 'marker', at: 'rebound', label: 'rebound — mini DBS reaction', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "People think this is a magic trick — it's not. It's asking where the larger players can fill their orders, and liquidation levels hand you the map. We took our storyboard — DBS, SSR, points of breakout, the Rule of Fives — and layered sentiment on top, and every bounce had a reason. Next tool: the positions heatmap.",
      panel: {
        title: 'Scenario — Recap',
        lines: [
          'Spot the liquidity → **plot it**',
          'Storyboard + liquidation levels = the **why**',
          'Forced sellers exhaust → the rebound',
          'Next: the **positions heatmap**'
        ]
      }
    }
  ]
};
