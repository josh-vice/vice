/* Course4 · 20 — Liquidation Levels                    (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/20_liquidation_levels'] = {
  id: 'course4/20_liquidation_levels',
  course: 'Course4_Liquidity_Theory',
  module: '20_Liquidation_Levels',
  title: 'Liquidation Levels',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now the centerpiece of liquidity theory in practice: liquidation levels. Every leveraged position has a liquidation price — the level where the exchange force-closes it. When many positions share a similar liquidation price, they form a cluster, and that cluster is a dense pool of guaranteed orders. Remember principle four: price gravitates toward the most liquidity.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Liquidation Levels',
        lines: [
          'Every leveraged position has a **liquidation price**',
          'Shared prices form **clusters**',
          'A cluster = a dense pool of forced orders',
          'And price is drawn toward liquidity'
        ]
      }
    },
    {
      id: 'magnets',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'all',
      heading: 'Clusters Are Magnets',
      say: "Here's price with a liquidation cluster above and one below. Above sit the stops of the shorts; below, the longs. These clusters act as magnets — price tends to drift toward the denser one because that's where the largest players can fill, and where a cascade of forced closures awaits. Watch how price gets pulled up into the cluster above.",
      show: [
        { kind: 'level', at: 'clusterHi', label: 'short liquidations (magnet)', side: 'left' },
        { kind: 'level', at: 'clusterLo', label: 'long liquidations', side: 'left' },
        { kind: 'heatmap', of: 'stop', to: 'bandHi', tone: 'short', peak: 0.8, label: 'liquidity heatmap — brightest = densest' },
        { kind: 'zone',  side: 'below', of: 'bandLo', depth: 3, tone: 'reward', label: 'lighter cluster' },
        { kind: 'marker', at: 'magnet', label: 'price drawn up to the cluster', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'cascade', label: 'cascade of forced closures', style: 'sweep', place: 'above' }
      ]
    },
    {
      id: 'cascade',
      type: 'CONCEPT',
      say: "When price reaches a dense cluster, the forced liquidations trigger in a chain — each one pushing price further, triggering the next, a cascade. That violent spike is the liquidity being consumed. It's exactly the engineered sweep we studied in module three, now with a data-backed map of where the fuel is. The clusters tell you in advance where the fireworks are likely.",
      panel: {
        title: 'The Cascade',
        lines: [
          'A dense cluster triggers a **chain** of liquidations',
          'Each forced close pushes price into the next',
          'The violent spike consumes the liquidity',
          'The map shows the fuel **in advance**'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So liquidation levels turn liquidity theory from intuition into a map: clusters of forced orders that magnetise price and fuel cascades. Identify the dense cluster, and you have a high-probability target for where price wants to go. Next, we walk a full liquidation-level scenario.",
      panel: {
        title: 'Liquidation Levels — Recap',
        lines: [
          'Clusters of liquidations magnetise price',
          'A dense cluster fuels a **cascade**',
          'A data-backed map of the sweeps',
          'Next: a full scenario'
        ]
      }
    }
  ]
};
