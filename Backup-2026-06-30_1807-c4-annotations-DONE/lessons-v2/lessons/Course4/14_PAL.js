/* Course4 · 14 — PAL (Price Action Levels)             (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/14_pal'] = {
  id: 'course4/14_pal',
  course: 'Course4_Liquidity_Theory',
  module: '14_PAL',
  title: 'PAL — Price Action Levels',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Next is the PAL tool, short for Price Action Levels. It's a handy one, especially for newer traders, because it helps you get a footing on price action and identify potential support and resistance levels in real time. It has two simple inputs: price action, and levels.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'PAL — Price Action Levels',
        lines: [
          'Helps you read price action in real time',
          'Surfaces potential **S/R levels** automatically',
          'Two inputs: **price action** and **levels**'
        ]
      }
    },
    {
      id: 'chart',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'pal' },
      stage: 'all',
      heading: 'PAL: Price Action + Levels',
      say: "Turn it on and two things appear. The price-action input colours the candles by trend, so you read momentum at a glance. The levels input draws dynamic support and resistance for you — here a clear resistance up top and support below, the exact zones price keeps reacting to. For a newer trader still training their eye, having those levels surfaced automatically is genuinely useful.",
      show: [
        { kind: 'level', at: 'resLevel', label: 'PAL level — resistance', side: 'left' },
        { kind: 'level', at: 'supLevel', label: 'PAL level — support', side: 'left' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "Use the PAL levels the same way you'd use any level you draw yourself: as zones to watch for triggers and confluence, not as automatic buy and sell signals. The tool is a training aid that helps you see what experienced traders see. As your own eye sharpens, you'll lean on it less — and that's a good thing.",
      panel: {
        title: 'How to Use PAL',
        lines: [
          'Treat its levels like levels **you** drew',
          'Zones to watch for triggers and confluence',
          'Not automatic buy/sell signals',
          'A training aid that you’ll outgrow'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So PAL pairs colour-coded price action with auto-drawn levels, a nice on-ramp for reading a chart in real time. Keep treating its levels as confluence on top of your own analysis. Next, a tool built to give a more complete decision-making picture: Heuristics.",
      panel: {
        title: 'PAL — Recap',
        lines: [
          'Colour-coded price action + auto S/R levels',
          'A real-time reading aid',
          'Levels are confluence, not signals',
          'Next: the Heuristics tool'
        ]
      }
    }
  ]
};
