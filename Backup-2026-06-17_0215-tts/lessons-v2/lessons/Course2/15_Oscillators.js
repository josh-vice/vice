/* Course2 · 15 — Oscillators                           (v2 lesson)
   Renders an RSI sub-panel with 30/70 bands and a bearish divergence. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/15_oscillators'] = {
  id: 'course2/15_oscillators',
  course: 'Course2_Building_Your_Toolbox',
  module: '15_Oscillators',
  title: 'Oscillators',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's add oscillators to the toolbox. An oscillator is an indicator that moves within a fixed range — usually zero to one hundred — and measures momentum: how fast and how forcefully price is moving. The most common is the RSI, the Relative Strength Index. It won't tell you direction, but it tells you when a move is getting stretched.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Oscillators',
        lines: [
          'Bounded indicators (0–100) measuring **momentum**',
          'The most common is the **RSI**',
          'They flag when a move is getting stretched'
        ]
      }
    },
    {
      id: 'ob-os',
      type: 'CHART',
      chart: 'rsi',
      stage: 'all',
      heading: 'Overbought & Oversold',
      say: "Here's RSI in the panel below the price. The two reference lines are the levels that matter: above 70 is considered overbought — buyers may be overextended — and below 30 is oversold, where sellers may be exhausted. These aren't automatic buy or sell signals; they're a heads-up that the current move is stretched and due for a pause.",
      show: [
        { kind: 'marker', at: 'high1', label: 'overbought (>70)', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'oversold', label: 'oversold (<30)', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'divergence',
      type: 'CHART',
      chart: 'rsi',
      stage: 'all',
      heading: 'Divergence — the Real Signal',
      say: "The most powerful use of an oscillator is divergence. Look closely: price makes a higher high, but the RSI makes a lower high. Price is pushing up while momentum is fading underneath it. That disagreement — bearish divergence — is an early warning that the trend is running out of fuel and a reversal may be near.",
      show: [
        { kind: 'marker', at: 'high2', label: 'price: higher high…', style: 'dot', place: 'above' },
        { kind: 'note',   at: 'high1', label: '…but RSI: lower high = divergence', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So use oscillators to read momentum, not direction. Overbought and oversold flag a stretched move; divergence warns that momentum and price disagree. As always, treat it as one more point of confluence on top of your levels and structure — never a standalone trigger. Next we wrap the course by meeting the financial instruments you'll actually trade.",
      panel: {
        title: 'Oscillators — Recap',
        lines: [
          'Measure **momentum**, not direction',
          'Overbought >70, oversold <30 = stretched',
          '**Divergence** = price and momentum disagree',
          'Confluence, never a standalone trigger'
        ]
      }
    }
  ]
};
