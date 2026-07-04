/* Course4 · 19 — Platform Overview                     (v2 lesson, concept-only) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/19_platform_overview'] = {
  id: 'course4/19_platform_overview',
  course: 'Course4_Liquidity_Theory',
  module: '19_Platform_Overview',
  title: 'Platform Overview',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "We've covered the concepts of sentiment and the indicator tools; now let's talk about where you actually see all of it. A platform like Hyblock Capital pulls data straight from the exchanges and turns it into readable visuals — the funding, open interest, and especially the liquidation data that brings liquidity theory to life.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'The Platform',
        lines: [
          'Where you actually **see** the data',
          'Exchange data turned into visuals',
          'Funding, open interest, and **liquidations**'
        ]
      }
    },
    {
      id: 'what',
      type: 'CONCEPT',
      say: "The most valuable thing these platforms surface is liquidation data — the map of where leveraged positions will be forced to close. Because price gravitates toward liquidity, and a cluster of liquidations is a dense pool of it, this map is essentially a forecast of where price is magnetically drawn. That's the heatmap and liquidation tools we'll explore next.",
      panel: {
        title: 'Why It Matters',
        lines: [
          'It maps where **liquidations** sit',
          'Liquidation clusters = dense liquidity',
          'Price is drawn toward them',
          'A forecast of the magnets ahead'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So think of the platform as a window onto the order flow and leverage in the market — the stuff a plain price chart hides. Don't get lost in the buttons; focus on what each visual tells you about where liquidity is and who's offside. Next, the centerpiece: liquidation levels.",
      panel: {
        title: 'Platform — Recap',
        lines: [
          'A window onto order flow and leverage',
          'Don’t drown in buttons — read the meaning',
          'Where is liquidity? Who’s offside?',
          'Next: liquidation levels'
        ]
      }
    }
  ]
};
