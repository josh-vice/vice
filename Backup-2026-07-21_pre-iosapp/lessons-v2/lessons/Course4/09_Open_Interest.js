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
      say: "Next variable: open interest. Open interest is the total number of derivatives contracts that are currently open and unsettled — every contract a long and a short still in the market. Crucially, it only increases when new positions are opened; closing a position shrinks it, never grows it. So open interest is a direct measure of how much money is actively committed to the game right now.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Open Interest',
        lines: [
          'Total **open, unsettled** contracts',
          'Each is a long and a short still in the game',
          'Rises only when **new** positions open — never on close-outs',
          'Measures money **committed** right now'
        ]
      }
    },
    {
      id: 'newmoney',
      type: 'CHART',
      chart: 'open_interest',
      stage: 'all',
      heading: 'New Money Enters',
      say: "Read open interest alongside price. As the trend rises here, open interest rises with it — new positions opening, fresh money entering. That's the signature of a strong, healthy move.",
      show: [
        { kind: 'marker', at: 'rising', label: 'OI rising with trend = new money', style: 'dot', place: 'above', panel: 'sub' }
      ]
    },
    {
      id: 'stacked',
      type: 'CHART',
      chart: 'open_interest',
      stage: 'all',
      heading: 'Positions Stack Up',
      say: "Notice open interest stays elevated as price tops out. A huge number of positions are now stacked in the market — and stacked positions are fuel for whatever comes next.",
      show: [
        { kind: 'marker', at: 'top', label: 'high OI = positions stacked (fuel)', style: 'reversal', place: 'above', panel: 'sub' }
      ]
    },
    {
      id: 'unwind',
      type: 'CHART',
      chart: 'open_interest',
      stage: 'all',
      heading: 'The Unwind',
      say: "Then price reverses and open interest drops sharply — those positions are being closed and liquidated, not replaced. Falling open interest is the trend bleeding out, and when it gets low enough, participants step back in and you get an inflection point.",
      show: [
        { kind: 'marker', at: 'reversal', label: 'OI falls = positions close / liquidate', style: 'sweep', place: 'below', panel: 'sub' }
      ]
    },
    {
      id: 'quadrant',
      type: 'CONCEPT',
      say: "Put price and open interest together and you get four regimes. Price rising with open interest rising: a strong uptrend — new money confirming the move. Price rising while open interest falls: a weak uptrend — participants leaving. Price falling with open interest rising: a strong downtrend — fresh shorts pressing. And price falling with open interest falling: a weak downtrend — positions just closing out, an inflection point may be near.",
      panel: {
        title: 'The Price / OI Quadrant',
        quadrant: {
          cols: ['OI ↑', 'OI ↓'],
          rows: ['Price ↑', 'Price ↓'],
          cells: [
            { title: 'Strong Uptrend',   sub: 'new money',  tone: 'bull' },
            { title: 'Weak Uptrend',     sub: 'unwinding',  tone: 'weak' },
            { title: 'Strong Downtrend', sub: 'new shorts', tone: 'bear' },
            { title: 'Weak Downtrend',   sub: 'close-outs', tone: 'weak' }
          ]
        }
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So open interest measures committed money, and its direction relative to price — the four quadrants — tells you whether a trend has fresh fuel or is running on fumes. Pair it with funding: crowded positioning plus extreme funding at a key level is a loud signal. Next, we look at cumulative delta.",
      panel: {
        title: 'Open Interest — Recap',
        lines: [
          'Measures **committed** money — new positions only',
          'The four **price/OI quadrants** grade the trend',
          'High OI + extreme funding = a loud signal',
          'Next: cumulative delta'
        ]
      }
    }
  ]
};
