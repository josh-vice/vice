/* Course4 · 22 — Positions Heatmap                     (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/22_positions_heatmap'] = {
  id: 'course4/22_positions_heatmap',
  course: 'Course4_Liquidity_Theory',
  module: '22_Positions_Heatmap',
  title: 'Positions Heatmap',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's look at the tool that makes liquidation clusters visual: the positions heatmap. Instead of a few drawn lines, the heatmap shades the whole chart by how dense the liquidations are at each price. Brighter, hotter bands mean more positions stacked there — and therefore a stronger magnet for price.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'The Positions Heatmap',
        lines: [
          'Shades the chart by **liquidation density**',
          'Hotter bands = more positions stacked',
          'More density = a stronger magnet'
        ]
      }
    },
    {
      id: 'reading',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'all',
      heading: 'Reading the Heatmap',
      say: "Here the heatmap highlights the dense band above price and a lighter one below. The brightest band is the one to respect — it's the biggest pool of liquidity and the most likely target. Watch price get drawn straight up into the hot band, sweep it, and reverse. The heatmap turned an abstract idea into a literal picture of where price wants to go.",
      show: [ { kind: 'zone',  side: 'above', of: 'bandHi', depth: 7, tone: 'risk',   label: 'hot band — densest liquidations' },
        { kind: 'level', at: 'clusterHi', label: 'magnet', side: 'left' },
        { kind: 'zone',  side: 'below', of: 'bandLo', depth: 3, tone: 'reward', label: 'lighter band' },
        { kind: 'marker', at: 'magnet', label: 'price seeks the hot band', style: 'sweep', place: 'above' },
        { kind: 'marker', at: 'reversalPivot', style: 'reversal', place: 'above', label: 'sweep & reverse' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "Use the heatmap to prioritise. Not every level is equal — the hottest band is where the real liquidity and the real reaction live, so that's where you focus your setups. Combine it with your structure and sentiment: a hot liquidation band that lines up with resistance and extreme funding is about as high-conviction as a target gets.",
      panel: {
        title: 'How to Use It',
        lines: [
          'Prioritise the **hottest** band',
          'That’s where the real reaction lives',
          'Hot band + resistance + funding = conviction',
          'Focus your setups there'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the positions heatmap paints liquidation density right onto the chart, showing you the magnets in order of strength. It's the most direct visual of liquidity theory's core idea. Next, we talk about combining all of this sentiment and liquidation data into one decision.",
      panel: {
        title: 'Heatmap — Recap',
        lines: [
          'Liquidation density, painted on the chart',
          'Magnets ranked by strength',
          'The most direct view of the core idea',
          'Next: combining the data'
        ]
      }
    }
  ]
};
