/* Course4 · 18 — Genie                                 (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/18_genie'] = {
  id: 'course4/18_genie',
  course: 'Course4_Liquidity_Theory',
  module: '18_Genie',
  title: 'Genie',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "The last of the premium tools is the Genie indicator, also from In Silico. Why Genie? Because at a glance, its red hues are really good at calling potential local tops, and its green hues at calling potential local bottoms. It's designed as a confirmation add-on for your existing bias, not a standalone signal.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Genie',
        lines: [
          'A premium tool by In Silico',
          '**Red hues** → potential local tops',
          '**Green hues** → potential local bottoms',
          'A confirmation add-on'
        ]
      }
    },
    {
      id: 'chart',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'genie' },
      stage: 'all',
      heading: 'Genie Hues',
      say: "Here's the Genie at work. As price climbs into a local top, the candles take on red hues — the tool is flagging exhaustion and a possible top. As price bottoms out, the hues shift to teal, suggesting a local bottom forming. Used on a higher timeframe, it's a quick way to estimate where a swing might be running out of room.",
      show: [
        { kind: 'marker', at: 'top', label: 'red hues — possible local top', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'bottom', label: 'green hues — possible local bottom', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "Lean on the Genie as confirmation, not prophecy. When it flashes red at a local high that also lines up with resistance, an extreme funding read, and a liquidity structure, you have real confluence for a top. On its own, a red hue is just a hint. The pattern by now should be familiar: every tool here is a vote, and you want several votes agreeing at a level.",
      panel: {
        title: 'Confirmation, Not Prophecy',
        lines: [
          'Strongest as **confirmation** of a bias',
          'Red at resistance + funding + structure = a top',
          'Alone, a hue is just a hint',
          'Every tool is a vote — want several agreeing'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So Genie flags potential local tops and bottoms through its red and green hues, a handy confirmation layer on a higher timeframe. That wraps the indicator suite. Next we shift to the platform itself and the powerful liquidation data it surfaces — starting with a platform overview.",
      panel: {
        title: 'Genie — Recap',
        lines: [
          'Red hues = tops; green hues = bottoms',
          'A confirmation layer, best on HTF',
          'Confluence over any single hue',
          'Next: the platform and liquidation data'
        ]
      }
    }
  ]
};
