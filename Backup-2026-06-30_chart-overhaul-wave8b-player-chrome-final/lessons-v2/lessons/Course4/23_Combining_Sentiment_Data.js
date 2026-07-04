/* Course4 · 23 — Combining Sentiment Data              (v2 lesson, concept-only) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/23_combining_sentiment_data'] = {
  id: 'course4/23_combining_sentiment_data',
  course: 'Course4_Liquidity_Theory',
  module: '23_Combining_Sentiment_Data',
  title: 'Combining Sentiment Data',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "You now have a whole arsenal of sentiment data — funding, open interest, cumulative delta, basis, and the liquidation heatmap. The skill isn't reading any one of them; it's combining them into a single, coherent read of who's in control. No single data point is gospel, but when several agree, conviction soars.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Combining the Data',
        lines: [
          'Funding · OI · delta · basis · liquidations',
          'The skill is **combining**, not reading one',
          'Several agreeing → high conviction'
        ]
      }
    },
    {
      id: 'stack',
      type: 'CONCEPT',
      say: "Picture a top forming. Price is at a key resistance and a hot liquidation band. Funding is at a positive extreme, the basis is at a fat premium, open interest is sky-high, and cumulative delta is diverging. Every variable is telling the same story: longs are crowded, over-leveraged, and offside, right where the liquidity sits. That's not a guess anymore — that's a stacked, evidence-backed thesis.",
      panel: {
        title: 'Stacking the Evidence',
        lines: [
          'Price at resistance **and** a hot liquidation band',
          'Funding extreme + basis premium + high OI',
          'Delta diverging — all say **longs offside**',
          'A stacked, evidence-backed thesis'
        ]
      }
    },
    {
      id: 'discipline',
      type: 'CONCEPT',
      say: "Two disciplines keep this honest. First, demand a level — sentiment extremes only become tradable when they coincide with a structural price level or a liquidation cluster. Second, accept that the crowd can stay offside longer than you'd think; extreme funding can get more extreme. So you still wait for a trigger and define your risk. Confluence raises your odds; it never removes the need for risk management.",
      panel: {
        title: 'Keeping It Honest',
        lines: [
          'Sentiment is tradable only **at a level**',
          'The crowd can stay offside longer than you think',
          'Still wait for a trigger; define risk',
          'Confluence raises odds — never removes risk'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So combining sentiment data means stacking independent reads until they converge on one answer at a key level. That convergence is the heart of trading liquidity theory — it's how you determine control with real confidence. Next, we look at the raw trading activity behind these numbers.",
      panel: {
        title: 'Combining Data — Recap',
        lines: [
          'Stack independent reads until they converge',
          'Convergence **at a level** is the signal',
          'How you determine control confidently',
          'Next: trading activity'
        ]
      }
    }
  ]
};
