/* Course3 · 12 — Trading Support & Resistance          (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/12_trading_sr'] = {
  id: 'course3/12_trading_sr',
  course: 'Course3_Sharpening_Your_Edge',
  module: '12_Trading_SR',
  title: 'Trading Support & Resistance',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's trade the most reliable access points of all: support and resistance. You already know what they are — now we turn them into concrete entries. The mantra hasn't changed since Course One: be a buyer at support, a seller at resistance. Here's how that looks in practice.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Trading Support & Resistance',
        lines: [
          'The most reliable access points',
          'Turn levels into concrete entries',
          'Buy support, sell resistance'
        ]
      }
    },
    {
      id: 'bounce',
      type: 'CHART',
      chart: 'horizontal_sr',
      params: { as: 'support' },
      stage: 'all',
      heading: 'Buy the Support',
      say: "Here's a clean horizontal support. Each time price drops to it, demand steps in and lifts it back up. That's a tradable access point — you wait for price to reach the level, look for a trigger candle confirming buyers, and enter long with your stop just beneath. The first tests are the strongest; remember the rule of fives, because each touch wears the level down.",
      show: [
        { kind: 'level',  at: 'level', label: 'support', side: 'left' },
        { kind: 'marker', at: 'touch1', label: 'buy the first test', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'touch3', label: 'weaker each time', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'flip',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      heading: 'Trade the S/R Flip',
      say: "The single highest-quality S R trade is the flip. Price breaks a resistance, comes back to retest it, and the old resistance now holds as support. Buying that first retest gives you a tight stop, a clear invalidation, and an entry in the direction of the breakout. When you spot a flip forming in real time, pay close attention — it's where the cleanest risk-reward lives.",
      show: [
        { kind: 'level',  at: 'level', label: 'old resistance → support', side: 'left' },
        { kind: 'marker', at: 'retest', label: 'buy the flip retest', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'top', label: 'trend continues', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So trading S R is about patience at a level: wait for price to arrive, demand a trigger, and enter with risk defined just beyond the line. Favour first tests and S R flips, and stack volume or a formation on top for confluence. Master this one pattern and you'll never lack for setups. Next, we trade the markets that aren't trending: ranges.",
      panel: {
        title: 'Trading S/R — Recap',
        lines: [
          'Wait for price to **arrive** at the level',
          'Demand a trigger; risk just beyond the line',
          'Favour first tests and **S/R flips**',
          'Stack volume or a formation for confluence'
        ]
      }
    }
  ]
};
