/* Course4 · 25 — Hyblock Indicators                    (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/25_hyblock_indicators'] = {
  id: 'course4/25_hyblock_indicators',
  course: 'Course4_Liquidity_Theory',
  module: '25_Hyblock_Indicators',
  title: 'Hyblock Indicators',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's round up the Hyblock indicator suite — the collection of tools that package everything we've discussed into ready-made overlays. Funding, open interest, liquidation heatmaps, and more, each rendered on the chart so you don't have to assemble the picture by hand. Think of it as the dashboard for liquidity theory.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'The Hyblock Suite',
        lines: [
          'Tools that package the sentiment data',
          'Funding, OI, liquidation heatmaps, and more',
          'A dashboard for **liquidity theory**'
        ]
      }
    },
    {
      id: 'colored',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'heuristics' },
      stage: 'all',
      heading: 'Indicators on the Chart',
      say: "Many of these indicators do what the base suite did — colour-code the read and mark the levels — but driven by live positioning data rather than price alone. The colour tells you the prevailing pressure, the levels mark the liquidation magnets. The strength of the suite is having all of it in one consistent view, so your eyes go straight to what matters.",
      show: [
        { kind: 'level',  at: 'resLevel', label: 'liquidation magnet above', side: 'left' },
        { kind: 'level',  at: 'supLevel', label: 'magnet below', side: 'left' },
        { kind: 'marker', at: 'top', label: 'pressure shifts', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "The warning is the same one we've repeated all course, and it matters most here because the suite is so comprehensive: a dashboard is not a decision-maker. These indicators surface the data beautifully, but you still supply the judgment — the level, the structure, the trigger, the risk. Use the suite to see clearly; use your training to decide.",
      panel: {
        title: 'A Dashboard, Not a Decision',
        lines: [
          'The suite **surfaces** the data superbly',
          'You still supply the judgment',
          'Level · structure · trigger · risk',
          'See clearly; decide with your training'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the Hyblock indicators are the convenient front-end for everything in liquidity theory — sentiment and liquidation data, on one chart. Powerful, as long as you stay the decision-maker. That completes the sentiment and platform tooling. To close the course, Zorn returns to his favourite system applied to liquidity: a deep dive on Ichimoku.",
      panel: {
        title: 'Hyblock — Recap',
        lines: [
          'The front-end for sentiment + liquidation data',
          'All on one chart',
          'Powerful — but you stay the decision-maker',
          'Next: a deep dive on Ichimoku'
        ]
      }
    }
  ]
};
