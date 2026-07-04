/* Course4 · 16 — FSVZO (Volume Zone Oscillator)        (v2 lesson)
   No transcript exists for this session; authored from the curriculum facts. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/16_fsvzo'] = {
  id: 'course4/16_fsvzo',
  course: 'Course4_Liquidity_Theory',
  module: '16_FSVZO',
  title: 'FSVZO',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Next up is the FSVZO — a volume zone oscillator. Where the colour tools read price, this one reads volume: it lives in its own panel below the chart and swings between a positive buying zone and a negative selling zone, showing which side the dominant volume is flowing to. And some of its best work gets painted directly onto the candles above.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'FSVZO — Volume Zones',
        lines: [
          'A **volume**-based oscillator',
          'Lives in a panel below the chart',
          'Positive = buying zone · negative = selling zone',
          'Also paints signals on the candles'
        ]
      }
    },
    {
      id: 'zones',
      type: 'CHART',
      chart: 'fsvzo',
      stage: 'all',
      heading: 'Buying and Selling Zones',
      say: "Watch the histogram. As price pushes up, it climbs into the positive buying zone — buying volume dominates the tape. When price rolls over, it sinks into the negative selling zone — sellers now own the flow. That's the raw read: which side the volume favours right now.",
      show: [
        { kind: 'marker', at: 'buyZone', label: 'buying-volume zone', style: 'dot', place: 'above', panel: 'sub' },
        { kind: 'marker', at: 'sellZone', label: 'selling-volume zone', style: 'dot', place: 'below', panel: 'sub' }
      ]
    },
    {
      id: 'signal',
      type: 'CHART',
      chart: 'fsvzo',
      stage: 'all',
      heading: 'Where the Signals Come From',
      say: "Here's the part people get wrong. The signals come from the bands' positioning relative to the overbought and oversold thresholds — plus and minus eighty by default, and adjustable. Bands stretched deep into overbought say the push is extended; deep into oversold, the flush is. You'll also see the histogram cross zero as the flow flips — worth noting as one observation, but it is not the key signal.",
      show: [
        { kind: 'marker', at: 'zeroCross', label: 'zero cross — an observation, not the signal', style: 'dot', place: 'below', panel: 'sub' }
      ]
    },
    {
      id: 'paints',
      type: 'CHART',
      chart: 'fsvzo',
      stage: 'all',
      heading: 'Painted on the Candles',
      say: "FSVZO also writes on the price candles themselves. A red X is an overbought warning; green arrows flag oversold. And the red and green hues show potential profit-taking zones — when a hue appears under your position, the tool is telling you to start thinking about the exit rather than adding.",
      show: [
        { kind: 'marker', at: 'buyZone', label: 'red X — overbought warning', style: 'sweep', place: 'above' },
        { kind: 'marker', at: 'sellZone', label: 'green arrow — oversold', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'divergence',
      type: 'CONCEPT',
      say: "Its sharpest trick: it paints divergences directly on the candles, so there's no manual divergence-hunting. An R on a candle is a regular divergence — a reversal signal, like price making a higher high while the oscillator makes a lower one. An H is a hidden divergence — a continuation signal, confirming a pullback is just a pullback. Reversal or continuation, labelled for you as it forms.",
      panel: {
        title: 'Painted Divergences',
        lines: [
          '**R** = regular divergence → **reversal** signal',
          '**H** = hidden divergence → **continuation** signal',
          'Painted on the candle as it forms',
          'No manual divergence-hunting needed'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the FSVZO reads the volume zones, signals off the bands' positioning against the overbought and oversold thresholds, paints R and H divergences straight onto the candles, and hues in the profit-taking zones. Best settings? Whatever works for you as a trader — test them. Next, the premium tools that combine several of these ideas — starting with Crayons.",
      panel: {
        title: 'FSVZO — Recap',
        lines: [
          'Bands vs **OB/OS thresholds** (±80) = the signals',
          '**R** reversal · **H** continuation — painted for you',
          'Red/green hues = **profit-taking** zones',
          'Best settings = whatever works for the trader',
          'Next: the Crayons indicator'
        ]
      }
    }
  ]
};
