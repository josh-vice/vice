/* Course4 · 09 — Open Interest                         (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/09_open_interest'] = {
  id: 'course4/09_open_interest',
  course: 'Course4_Liquidity_Theory',
  module: '09_Open_Interest',
  title: 'Open Interest',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Next variable: open interest. Open interest is the total number of derivatives contracts that are currently open and unsettled. Every contract is a long and a short still in the market. So open interest is a direct measure of how much money is actively committed to the game right now — and changes in it tell a story.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Open Interest',
        lines: [
          'Total **open, unsettled** contracts',
          'Each is a long and a short still in the game',
          'Measures money **committed** right now'
        ]
      }
    },
    {
      id: 'reading',
      type: 'CHART',
      chart: 'open_interest',
      stage: 'all',
      heading: 'Open Interest + Price',
      say: "Read open interest alongside price. As the trend rises here, open interest rises with it — that's fresh money entering, confirming a strong, healthy move. Notice it stays elevated as price tops out: a huge number of positions are now stacked up, and that's fuel. Then, as price reverses, open interest drops sharply — those positions are being closed and liquidated. Falling open interest is the trend bleeding out.",
      show: [
        { kind: 'marker', at: 'rising', label: 'OI rising with trend = new money', style: 'dot', place: 'above', panel: 'sub' },
        { kind: 'marker', at: 'top', label: 'high OI = positions stacked (fuel)', style: 'reversal', place: 'above', panel: 'sub' },
        { kind: 'marker', at: 'reversal', label: 'OI falls = positions close / liquidate', style: 'sweep', place: 'below', panel: 'sub' }
      ]
    },
    {
      id: 'rules',
      type: 'CONCEPT',
      say: "Two simple reads. Rising open interest with the trend means new money is backing the move — it's strong. Falling open interest means positions are being closed, so the move is losing conviction or unwinding. And when open interest is sky-high after a long run, the market is crowded and primed for a violent flush as all those positions rush for the exit.",
      panel: {
        title: 'Reading Open Interest',
        lines: [
          'Rising OI + trend → **new money**, strong move',
          'Falling OI → positions closing, conviction fading',
          'Sky-high OI → crowded, primed for a flush',
          'Always read it **with** price'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So open interest measures committed money, and its direction relative to price tells you whether a trend has fresh fuel or is running on fumes. Pair it with funding — crowded positioning plus extreme funding at a key level is a loud signal. Next, we look at cumulative delta.",
      panel: {
        title: 'Open Interest — Recap',
        lines: [
          'Measures **committed** money',
          'Rising with trend = fuel; falling = unwinding',
          'High OI + extreme funding = a loud signal',
          'Next: cumulative delta'
        ]
      }
    }
  ]
};
