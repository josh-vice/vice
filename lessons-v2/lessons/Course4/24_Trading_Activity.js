/* Course4 · 24 — Trading Activity                      (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/24_trading_activity'] = {
  id: 'course4/24_trading_activity',
  course: 'Course4_Liquidity_Theory',
  module: '24_Trading_Activity',
  title: 'Trading Activity',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "The Trading Activity tab is a dashboard for the sentiment variables we studied in module two. Pick your instrument — the XBT perpetual swap, Ethereum, futures — choose a lookback period in hours, and populate the graph: cumulative long/short delta, cumulative aggressive longs and shorts, open interest, funding, all drawn against price. We can already spot the liquidity; this tab helps find the inflection points.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'The Trading Activity Tab',
        lines: [
          'A **dashboard** of sentiment variables',
          'Instrument + **hours lookback** window',
          'Cum. L/S delta · aggressive longs & shorts',
          'Open interest · funding — vs price'
        ]
      }
    },
    {
      id: 'delta',
      type: 'CONCEPT',
      say: "Start with the cumulative long/short delta — the difference between cumulative longs and cumulative shorts. When both sides are growing, the delta shows which is growing faster: that's your imbalance, and often who's offside. Green spikes are the longs; red, the shorts. Add cumulative aggressive longs and shorts to watch each side's curve separately — together they're a powerful trigger tool on short timeframes.",
      panel: {
        title: 'Cumulative Long/Short Delta',
        lines: [
          '**Cumulative longs − cumulative shorts**',
          'Shows which side is **growing faster**',
          'The imbalance = who may be **offside**',
          'Pair with the aggressive longs & shorts curves'
        ]
      }
    },
    {
      id: 'divergence',
      type: 'CHART',
      chart: 'cumulative_delta',
      stage: 'all',
      heading: 'Delta vs Price',
      say: "Watch them disagree. Price grinds to a higher high while the delta rolls over — sellers hammering into a market that refuses to drop. Every red print is a short that has to buy back later. When the delta keeps sinking and price keeps holding, the shorts are offside, and that disagreement is short-squeeze fuel.",
      show: [
        { kind: 'marker', at: 'top', label: 'price — higher high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'high1', panel: 'sub', label: 'delta peaks — then sags', style: 'dot' }
      ]
    },
    {
      id: 'setup',
      type: 'CONCEPT',
      say: "The full setup I love: the delta is very red, cumulative aggressive shorts keep rising, and predicted funding sits in the negative zone — yet price is popping. No longs even in the market, and it still won't drop. That's actually very bullish: the shorts are over their skis, and there's potential for a large squeeze. Open interest against price adds one more point of confluence.",
      panel: {
        title: 'The Squeeze Read',
        lines: [
          'Delta **deep red** — shorts aggressive',
          'Aggressive shorts **rising**',
          'Funding **negative** — shorts crowded',
          'Price **holds / rises** → squeeze fuel'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the trading activity tab turns module two's variables into a live dashboard — the delta, the aggressive curves, open interest, funding, over whatever lookback you choose. Combine it with liquidation levels and the positions heatmap and you're forming a directional bias from what buyers and sellers are actually doing. Next: these same indicators, charted — the Hyblock indicator suite.",
      panel: {
        title: 'Trading Activity — Recap',
        lines: [
          'A dashboard: **delta · curves · OI · funding**',
          'Spots who’s **offside** — inflection points',
          'Combine with liq levels + heatmap',
          'Next: **Hyblock indicators** on the chart'
        ]
      }
    }
  ]
};
