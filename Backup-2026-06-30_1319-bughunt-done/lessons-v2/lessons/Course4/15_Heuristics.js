/* Course4 · 15 — Heuristics                            (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/15_heuristics'] = {
  id: 'course4/15_heuristics',
  course: 'Course4_Liquidity_Theory',
  module: '15_Heuristics',
  title: 'Heuristics',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Today's tool is the Heuristics indicator. What are heuristics? They're problem-solving shortcuts for making quick decisions with limited information. And that describes trading perfectly — all we have in front of us is price action, and we constantly have to decide: long, or short? The Heuristics tool aims to give us a more complete picture to make that call.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Heuristics',
        lines: [
          'Quick decisions with **limited information**',
          'Exactly the trader’s situation',
          'A fuller picture for the long/short call'
        ]
      }
    },
    {
      id: 'chart',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'heuristics' },
      stage: 'all',
      heading: 'The Heuristics Read',
      say: "Switch it on and the candles are colour-coded by the tool's read of momentum — teal while buyers lead, pink once sellers take over. The idea is to compress a lot of price-action judgment into a fast visual cue, so that when you're staring at a naked chart trying to decide, you have a structured nudge rather than a pure gut guess.",
      show: [
        { kind: 'marker', at: 'top', label: 'sellers step in', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'bottom', label: 'buyers step in', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "The same discipline applies as with every tool here: a heuristic is a shortcut, and shortcuts are wrong sometimes. Use it to speed up and structure your decision, then confirm against your levels, your structures, and your sentiment data. A good heuristic narrows your choices; it doesn't make them for you.",
      panel: {
        title: 'Use It Wisely',
        lines: [
          'A shortcut — and shortcuts can be wrong',
          'Speeds up and **structures** the decision',
          'Confirm against levels, structure, sentiment',
          'It narrows choices; you still choose'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So Heuristics compresses price-action judgment into a fast, structured cue for the long-or-short decision — useful, as long as you keep confirming it. Next, a tool that reads the market through volume: the FSVZO.",
      panel: {
        title: 'Heuristics — Recap',
        lines: [
          'Compresses PA judgment into a fast cue',
          'Structures the long/short decision',
          'Keep confirming it with your read',
          'Next: a volume-based tool, the FSVZO'
        ]
      }
    }
  ]
};
