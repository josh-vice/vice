/* Course4 · 13 — Trend Buddy                           (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/13_trend_buddy'] = {
  id: 'course4/13_trend_buddy',
  course: 'Course4_Liquidity_Theory',
  module: '13_Trend_Buddy',
  title: 'Trend Buddy',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's look at the first of the indicator tools: the Trend Buddy. Before we do, one honest caveat that applies to every tool in this course — none of them are ever a hundred percent right. The Trend Buddy can be used as a crutch or as an informative aid, and I'd much rather you use it as the latter. Clutching onto candle colours is a surefire way to get burnt.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Trend Buddy',
        lines: [
          'A candle-colour **trend** indicator',
          'No tool is ever 100% right',
          'An informative aid — **not a crutch**'
        ]
      }
    },
    {
      id: 'chart',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'trendbuddy' },
      stage: 'all',
      heading: 'Trend Buddy on a Chart',
      say: "Here's the Trend Buddy painting the candles by short-term trend. Teal means buyers are in control, pink means sellers have taken over, and the muted colour marks indecision in between. At a glance you can see the trend flip from up to down and back. It's the same buyer-seller story you already read manually — just colour-coded for speed.",
      show: [
        { kind: 'marker', at: 'flipDown1', label: 'colour flips to pink — sellers', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'flipUp1', label: 'flips to teal — buyers', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "So use it as confluence, never as the whole thesis. When the Trend Buddy agrees with your structure, your levels, and your sentiment read, it adds confidence. When it disagrees, that's information too. But taking a trade just because a candle turned a colour, with no level or context behind it, is exactly how the tool gets you burnt.",
      panel: {
        title: 'Use It Right',
        lines: [
          'A point of **confluence**, not the thesis',
          'Agreement adds confidence',
          'Disagreement is information too',
          'Never trade a colour alone'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "To recap: the Trend Buddy colour-codes the short-term trend for a quick read, but it's an aid, not an oracle. Layer it onto everything you already know. Next, a tool that adds levels to the picture: the PAL.",
      panel: {
        title: 'Trend Buddy — Recap',
        lines: [
          'Colour-codes the short-term trend',
          'An aid, not an oracle',
          'Layer it onto structure and sentiment',
          'Next: the PAL tool'
        ]
      }
    }
  ]
};
