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
      say: "Next is the PAL tool, short for Price Action Levels. It's a nifty one, especially for newer traders, because it helps you get a footing on price action and identify potential S/R in real time. Two inputs: price action, and levels. And note — PAL doesn't paint your candles. It overlays signals on top of normal candles — circles, letters, triangles — and it draws the levels.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'PAL — Price Action Levels',
        lines: [
          'Reads price action in **real time**',
          'Two inputs: **price action** + **levels**',
          'Overlays signals on normal candles',
          'Draws dynamic **S/R levels**'
        ]
      }
    },
    {
      id: 'levels',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'pal' },
      stage: 'all',
      heading: 'The Levels Input',
      say: "Start with the levels input. PAL draws dynamic pivots — support and resistance built from the price action itself, updating live. Here it's flagged a resistance overhead and a support below: the exact zones price keeps reacting to. You can watch S/R flips happen in real time — a level breaks, flips, gets retested — and turn those pivots into actionable setups.",
      show: [
        { kind: 'level', at: 'resLevel', label: 'PAL dynamic resistance', side: 'left' },
        { kind: 'level', at: 'supLevel', label: 'PAL dynamic support', side: 'left' }
      ]
    },
    {
      id: 'exhaustion',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'pal' },
      stage: 'all',
      heading: 'Exhaustion Circles',
      say: "Now the price-action input. The big circles mark exhaustion. A red circle into a top means buyers are drying up — it won't take much for sellers to push price back down. A green circle into a bottom means sellers are drying up, and it won't take much for bulls to push it back up. Exhaustion marks a potential take-profit area, and a clue to who holds control next.",
      show: [
        { kind: 'marker', at: 'circleTop', label: 'red circle — buyers drying up', style: 'sweep', place: 'above' },
        { kind: 'marker', at: 'circleBot', label: 'green circle — sellers drying up', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'absorption',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'pal' },
      stage: 'all',
      heading: 'AP — Absorption',
      say: "The AP letters stand for absorption — a large player present while price refuses to move. A green AP at support: sellers keep hammering the bid and price just isn't going lower, because a large buyer is absorbing every sell. That's a long signal. A red AP at resistance is the mirror — a large seller absorbing all the buys. That's a short signal.",
      show: [
        { kind: 'marker', at: 'apBuy', label: 'green AP — large buyer absorbing sells', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'apSell', label: 'red AP — large seller absorbing buys', style: 'sweep', place: 'above' }
      ]
    },
    {
      id: 'legend',
      type: 'CONCEPT',
      say: "A few more overlays round out the kit. F marks an outside-bar failure — the candle's high or low becomes a potential reversal point, almost like an SFP pinned to one candle. Turquoise triangles are confirmed reversals — cross-check them with Trend Buddy's lime green — and X's are canceled ones. Small green circles flag bullish pushes, and notations like IH and the star patterns call out inflection candles: wait for confirmation.",
      panel: {
        title: 'The Rest of the Overlay',
        lines: [
          '**F** — outside-bar failure: high/low = reversal point',
          'Turquoise **triangles** — confirmed reversals · **X** — canceled',
          'Small green circles — bullish pushes',
          'Candle notations (IH, stars) — inflection points',
          'Always wait for **confirmation**'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So PAL overlays exhaustion circles, absorption letters, failure flags and reversal triangles on your candles, and draws the S/R those formations create. Treat its levels like levels you drew yourself — zones for triggers and confluence, not automatic signals — and play with the S/R flips it exposes. Next, a tool built for quick decisions with limited information: Heuristics.",
      panel: {
        title: 'PAL — Recap',
        lines: [
          'Signals **overlaid** on normal candles',
          'Circles = exhaustion → potential **take-profit**',
          '**AP = absorption** — green buyer, red seller',
          'Dynamic S/R levels in real time',
          'Next: the Heuristics tool'
        ]
      }
    }
  ]
};
