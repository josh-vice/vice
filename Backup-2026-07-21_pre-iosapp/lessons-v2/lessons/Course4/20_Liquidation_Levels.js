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
      say: "The Liquidation Levels tool predicts regions of potential liquidations. Every leveraged position has a liquidation price — calculable from entry, position size, and leverage, like the BitMEX calculator showed. Hyblock's predictive model spots where trades entered, applies a leverage component — 25x, 50x, or 100x — and spits out where they'd be force-closed. And the higher the position size, the higher the hit rate for the liquidation.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Liquidation Levels',
        lines: [
          'Predicts **regions of potential liquidations**',
          'Entry + size + leverage → liquidation price',
          'Modelled at **25x · 50x · 100x**',
          '**Higher position size → higher hit rate**'
        ]
      }
    },
    {
      id: 'legend',
      type: 'CONCEPT',
      say: "Reading the tool. A red dot is a short entry price — its liquidation bubbles sit above it, because that's where shorts liquidate. A green dot is a long entry — bubbles below. Bubble colour is the leverage tier: 25x, 50x, or 100x. Bubble size scales with the position size. And a position-size filter lets you hide the small stuff and focus on the clusters that matter.",
      panel: {
        title: 'Reading the Bubbles',
        lines: [
          '**Red dot** = short entry → bubbles **above**',
          '**Green dot** = long entry → bubbles **below**',
          'Bubble **colour** = leverage tier (25x / 50x / 100x)',
          'Bubble **size** ∝ position size',
          'Size filter — hide the noise'
        ]
      }
    },
    {
      id: 'tiers',
      type: 'CONCEPT',
      say: "Higher leverage liquidates closer to entry. From one short entry cluster: the 25x bubble liquidated at about $7,955, the 50x at $7,790, the 100x at $7,711 — each tier tighter to the entry. Three useful pieces of data off a single red dot. These are pockets of liquidity — maybe exactly where larger players are looking to fill their orders.",
      panel: {
        title: 'The Leverage Tiers',
        lines: [
          'Higher leverage → liquidation **closer to entry**',
          'One short cluster: **25x ≈ $7,955**',
          '**50x ≈ $7,790** · **100x ≈ $7,711**',
          'Each bubble = a pocket of liquidity'
        ]
      }
    },
    {
      id: 'plot',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'approach',
      heading: 'Plot the Levels',
      say: "So we plot them. A cluster of short liquidations above price, a cluster of long liquidations below. Now overlay them on your own chart: do they match up with a key support and resistance zone, a DBS or an SSR? When a liquidation level lands on your structure, you're formulating a plan — that's the confluence this tool is for.",
      show: [
        { kind: 'level', at: 'clusterHi', label: 'short liquidation cluster', side: 'left', tone: 'short' },
        { kind: 'level', at: 'clusterLo', label: 'long liquidation cluster', side: 'left', tone: 'long' },
        { kind: 'heatmap', of: 'stop', to: 'bandHi', tone: 'short', peak: 0.7, label: 'dense short liqs — big positions' }
      ]
    },
    {
      id: 'pierce',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'pierce',
      heading: 'The Magnet Pulls',
      say: "Price gravitates toward the most liquidity — and that dense short cluster above is a magnet. Watch it get pulled up and pierce the level: the shorts are force-closed one after another, and every forced buy-back shoves price higher into the next tier. That spike is the cascade — the liquidity being consumed.",
      show: [
        { kind: 'marker', at: 'cascade', label: 'cascade — forced buy-backs', style: 'sweep', place: 'above' }
      ]
    },
    {
      id: 'reversal',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'reversal',
      heading: 'After the Fuel Burns',
      say: "Once the cluster is consumed there's no fuel left, and the move stalls — invalidation for any fade sits just above the spike. From here the eye moves to the opposite magnet: price rotates down and tags the long cluster. And remember what that means — liquidated longs are forced sells, dumped straight into the market.",
      show: [
        { kind: 'level',  at: 'stop', label: 'stop — above the spike', side: 'right', tone: 'gold' },
        { kind: 'marker', at: 'reversalPivot', label: 'no fuel left — turn', style: 'reversal', place: 'above' },
        { kind: 'marker', at: 'reversal', label: 'long cluster tagged — forced sells', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So: spot the entries, read the bubbles, and plot the liquidation levels on your chart. Ask whether they match a key support and resistance zone, a DBS or SSR — that confluence is a strategic approach to where price is potentially going. It's a predictive model, not a guarantee. Next, a full worked example: marking these levels out and watching it unfold.",
      panel: {
        title: 'Liquidation Levels — Recap',
        lines: [
          'Pockets of liquidity, mapped in advance',
          'Overlay on your **S/R · DBS · SSR**',
          'Confluence → unique trade ideas',
          'A model, **not a guarantee**',
          'Next: a full scenario'
        ]
      }
    }
  ]
};
