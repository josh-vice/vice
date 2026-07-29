/* Course4 · 19 — Platform Overview                     (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/19_platform_overview'] = {
  id: 'course4/19_platform_overview',
  course: 'Course4_Liquidity_Theory',
  module: '19_Platform_Overview',
  title: 'Platform Overview',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Courses One through Three built the visual side — structure, S/R, the conversation of buyers and sellers on a chart. Course Four goes under the hood. Hyblock Capital is a sentiment-analysis platform: not Twitter opinions, but actual positioning data — funding, open interest, delta, liquidity pools — that we read alongside our TA to determine who's in control and where price is likely headed.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Hyblock Capital',
        lines: [
          'A **sentiment-analysis** platform',
          'Actual data — not opinions',
          'Funding · OI · delta · liquidity pools',
          'Read alongside your TA'
        ]
      }
    },
    {
      id: 'tabs',
      type: 'CONCEPT',
      say: "Down the side sit six tabs. Chart — TradingView integrated, with Hyblock's proprietary indicators like net longs, net shorts, and cumulative long/short delta. Trading Activity. Market Depth Heatmap. Liquidation Levels — the popular one, colourful bubbles over a price graph. Net Positions Heatmap. And Order Book Depth. We'll focus on Trading Activity, Liquidation Levels, and the Net Positions Heatmap.",
      panel: {
        title: 'The Six Tabs',
        lines: [
          '**1 · Chart** — TradingView + Hyblock indicators',
          '**2 · Trading Activity** · **3 · Market Depth Heatmap**',
          '**4 · Liquidation Levels** · **5 · Net Positions Heatmap**',
          '**6 · Order Book Depth**',
          'Our focus: **2, 4 and 5**'
        ]
      }
    },
    {
      id: 'workflow',
      type: 'CONCEPT',
      say: "How do they combine? The chart tab keeps our regular TA workflow and lets us populate sentiment underneath — cumulative long/short delta right below price. Trading Activity helps us determine who's offside — are longs or shorts getting over their skis. Liquidation Levels and the Positions Heatmap show where the liquidity is, so we can mark it up on our own charts.",
      panel: {
        title: 'How the Tabs Combine',
        lines: [
          'Chart tab — your TA, plus sentiment below',
          'Trading Activity — **who’s offside?**',
          'Liq Levels + Heatmap — **where’s the liquidity?**',
          'Mark it up on your own charts'
        ]
      }
    },
    {
      id: 'teaser',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'approach',
      heading: 'A Taste — Liquidation Levels',
      say: "Here's a taste of where we're going. The Liquidation Levels tab helps us spot where liquidations sit, based on entries and leverage — a cluster of short liquidations above price, long liquidations below. We'll learn to spot those entries, plot the levels on our own charts, and build unique trade ideas where they meet our technical analysis.",
      show: [
        { kind: 'level', at: 'clusterHi', label: 'short liquidations above', side: 'left', tone: 'short' },
        { kind: 'level', at: 'clusterLo', label: 'long liquidations below', side: 'left', tone: 'long' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So Hyblock Capital is our window into sentiment: six tabs, each a different layer of the buyer-seller conversation, all feeding one goal — riding on the backs of the larger players instead of being their liquidity. Each tool gets its own deep dive. Next up, the one everybody asks about: liquidation levels.",
      panel: {
        title: 'Platform — Recap',
        lines: [
          'Sentiment analysis, from **actual data**',
          'Six tabs, one goal: who’s in control',
          'Add it to the TA you’ve mastered',
          'Next: **liquidation levels**'
        ]
      }
    }
  ]
};
