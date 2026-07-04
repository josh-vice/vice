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
      say: "The last premium tool is the Genie, coded and developed by In Silico. Why Genie? At a glance, its red hues are really good at calling potential local tops, and its green hues potential local bottoms. At heart it's a low-timeframe scalping and momentum tool — you dial in and let it tell you where to fade a stretched push — though it can also help you estimate higher-timeframe tops and bottoms. A confirmation add-on for your bias, not a standalone.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Genie',
        lines: [
          'A premium tool by **In Silico**',
          '**Red hues** → potential local tops',
          '**Green hues** → potential local bottoms',
          'A **low-timeframe scalping** + momentum tool'
        ]
      }
    },
    {
      id: 'hues',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'genie' },
      stage: 'all',
      heading: 'Reading the Hues',
      say: "One note first: the real Genie renders in its own panel below the chart — here we paint its hues straight onto the candles so you can see the read. As price climbs into a local top, the hues turn red: buyer exhaustion. As it flushes into a bottom, they turn green: seller exhaustion. And exhaustion, as always, marks a potential take-profit area — and a spot to consider fading the move.",
      show: [
        { kind: 'marker', at: 'top', label: 'red hues — buyer exhaustion into the top', style: 'sweep', place: 'above' },
        { kind: 'marker', at: 'bottom1', label: 'green hues — seller exhaustion into the bottom', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'triggers',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'genie' },
      stage: 'all',
      heading: 'Arrows and Triggers',
      say: "The hues build the picture; the arrows time it. Show-early-trigger is on by default — red and green arrows that act as triggers for actually getting into a trade if you're not already building a position. Sometimes you scalp the momentum of the big bars themselves; sometimes you use the arrows in confluence with the hues. Here the second top and bottom hand you the same reads again.",
      show: [
        { kind: 'marker', at: 'top2', label: 'red again — arrow triggers the fade', style: 'sweep', place: 'above' },
        { kind: 'marker', at: 'bottom', label: 'green again — trigger for the long scalp', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "Under the hood it's tunable: the hue filter runs off a moving average — Hull, exponential, simple — with adjustable sensitivity and length, a default threshold of 0.5, and adaptive filtering to smooth out false positives. None of it works a hundred percent. Backtest it, play with it, and use it as confluence to inform the bias for your trades — it's caught plenty of clean long and short entries used exactly that way.",
      panel: {
        title: 'Tune It, Then Trust Structure',
        lines: [
          'Hue filter runs off an **MA** — type + length adjustable',
          'Threshold 0.5 default · adaptive filtering',
          'Arrows = triggers · hues = context',
          'Confluence for your bias — never 100%'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So Genie is the suite's scalping specialist: red hues into tops, green hues into bottoms, arrows for triggers — at its best dialled into the low timeframes, momentum and market structure, while still helping you estimate higher-timeframe tops and bottoms. That wraps the indicator suite. Next we shift to the platform itself and the powerful liquidation data it surfaces.",
      panel: {
        title: 'Genie — Recap',
        lines: [
          '**LTF scalping** + momentum — its home turf',
          'Red into tops · green into bottoms',
          'Arrows trigger · hues confirm',
          'Next: the platform and liquidation data'
        ]
      }
    }
  ]
};
