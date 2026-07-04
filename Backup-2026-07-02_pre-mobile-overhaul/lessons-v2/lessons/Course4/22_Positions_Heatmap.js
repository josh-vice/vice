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
      say: "Next layer: the positions heatmap. This is a unique form of order-book analysis — a visual of where the clusters of longs and shorts are. It is not a liquidation predictor: it takes the cumulative sum of net long and short position entries and exits at each price level, painted across the visible range. If you know volume profile, it's that idea — for positioning.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'The Positions Heatmap',
        lines: [
          'A unique form of **order-book analysis**',
          'Net position **entries & exits**, by price',
          'Cumulative — like a volume profile',
          'Not a liquidation predictor'
        ]
      }
    },
    {
      id: 'colours',
      type: 'CONCEPT',
      say: "The colour scale is the whole trick: the brighter the colour, the more positions entering at that price range — bright yellow might be six million opening. The darker the colour, the more closing — deep purple is exits. There are three sub-heatmaps: Net Aggressive Long Positions, Net Aggressive Short Positions, and Open Interest. I focus on the aggressive longs and shorts.",
      panel: {
        title: 'Reading the Colours',
        lines: [
          '**Bright = positions opening** at that range',
          '**Dark = positions closing** / exiting',
          'Views: **Net Aggressive Longs · Shorts · OI**',
          'Scale = position size, in contracts'
        ]
      }
    },
    {
      id: 'shortband',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'approach',
      heading: 'A Short Block Above',
      say: "Painted on a chart it looks like this: a full-width band above price on the short heatmap. Bright means shorts opened there — a block of shorts, entered and still sitting overhead. Match the colour to the scale and you know the size. That block is information about positioning — a cluster of entries, not a prediction.",
      show: [
        { kind: 'heatmap', of: 'stop', to: 'bandHi', tone: 'short', peak: 0.7, label: 'short entries — bright = opening' }
      ]
    },
    {
      id: 'longband',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'approach',
      heading: 'A Long Block Below',
      say: "Below price, the long heatmap shows its own band — longs opened into that range and haven't exited. If price were to come back down there, that block could be a real source of liquidity. Put these bands together with your support and resistance and your liquidation levels, and the puzzle starts assembling itself.",
      show: [
        { kind: 'heatmap', of: 'bandLo', to: 'bandLo2', tone: 'long', peak: 0.15, label: 'long entries — a block below' }
      ]
    },
    {
      id: 'story',
      type: 'CONCEPT',
      say: "The colours also tell stories after the fact. In one snapshot, a bright short block sat near $9,100 — nearly eight million opened. Price came down into it, then ripped all the way up to $9,250 — and the same area turned dark: minus four point eight million, those shorts closing out as they were taken out. Opening, pressure, exit — one band, a whole storyboard.",
      panel: {
        title: 'Bright In, Dark Out',
        lines: [
          'Bright block: shorts **open** (~$9,100)',
          'Impulse up → the block turns **dark**',
          'Dark = those shorts **closing out**',
          'The band replays the whole story'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the positions heatmap is a snapshot of where net longs and shorts are entering or exiting across price — bright opens, dark closes. Those clusters of aggressive positions are liquidity pools, and now you can see them. Next, we take it one step further: marking these blocks out on our charts and combining them with liquidation levels.",
      panel: {
        title: 'Positions Heatmap — Recap',
        lines: [
          'Where net positions **enter or exit**',
          '**Brighter = more entered** (not darker)',
          'Clusters = liquidity pools you can see',
          'Next: spot the blocks, plot the blocks'
        ]
      }
    }
  ]
};
