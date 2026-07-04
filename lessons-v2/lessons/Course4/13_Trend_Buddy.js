/* Course4 · 13 — Trend Buddy                           (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/13_trend_buddy'] = {
  id: 'course4/13_trend_buddy',
  course: 'Course4_Liquidity_Theory',
  module: '13_Trend_Buddy',
  title: 'Trend Buddy',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's open the indicator suite with the Trend Buddy. One honest caveat first, and it applies to every tool in this course: none of them are ever a hundred percent right. The Trend Buddy is a trend-following tool — its job is to add confluence to what your structure and levels already say. Use it as an informative aid, never a crutch: clutching onto candle colours is a surefire way to get burnt.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Trend Buddy',
        lines: [
          'A **trend-following** candle-colour tool',
          'Adds **confluence** — never the whole thesis',
          'No tool is ever 100% right',
          'An aid, not a crutch'
        ]
      }
    },
    {
      id: 'reversal',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'trendbuddy', script: true },
      stage: 'all',
      heading: 'Reversals: Blue → Lime',
      say: "Let's walk the colour guide off a low. Blue is an unconfirmed reversal — the tool's earliest call that a low may be forming. Highest risk, highest reward; if it prints at a level you predefined, it adds early confluence that the level might hold. Lime green is the confirmed reversal — the follow-through that says the low is likely in. Grey candles mean no discernible trend: information you can't act on.",
      show: [
        { kind: 'marker', at: 'unconfirmed', label: 'blue — unconfirmed reversal', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'confirmed', label: 'lime — confirmed reversal', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'entry',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'trendbuddy', script: true },
      stage: 'all',
      heading: 'Entries and Pivots',
      say: "Turquoise means an uptrend is detected — the rule is to enter within one or two turquoise closes, once you see follow-through; magenta is the same call for downtrends. Orange marks a bearish pivot: its high and low become intra-bar support and resistance. Trail stops below it, take profit into it, treat it as a potential local top, or trigger a short on a close below it.",
      show: [
        { kind: 'marker', at: 'entryClose', label: 'turquoise — enter within 1–2 closes', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'pivotTop', label: 'orange — bearish pivot', style: 'sweep', place: 'above' }
      ]
    },
    {
      id: 'cancel',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'trendbuddy', script: true },
      stage: 'all',
      heading: 'Cancels and Reconfirms',
      say: "Not every confirmed reversal holds — a red candle cancels it: never mind, the trend needs more time, so tighten or exit anything opened on the blue. If buyers keep pushing anyway, a green candle reconfirms the reversal — clear buyers in the market, the uptrend may be starting again. And fuchsia is the bullish pivot: the orange idea mirrored at a low, stops on shorts above its high.",
      show: [
        { kind: 'marker', at: 'canceled', label: 'red — canceled reversal', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'pivotBottom', label: 'fuchsia — bullish pivot', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'reconfirmed', label: 'green — reconfirmed reversal', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'rare',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'trendbuddy', script: true },
      stage: 'all',
      heading: 'The Rare Candles',
      say: "It's very rare for a trend to fully reverse inside a single candle — and when it happens, the tool shouts: purple for the bearish breakdown, dark green for the bullish breakout. A seller swatting price down with supply, or a buyer stepping in out of nowhere. Rarer still is yellow, the combo — a breakdown plus a pivot in one candle: use its high as resistance and its low as support.",
      show: [
        { kind: 'marker', at: 'breakoutCandle', label: 'purple — one-candle trend flip', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'combo', label: 'yellow — breakdown + pivot combo', style: 'sweep', place: 'above' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "So use it as confluence, never as the whole thesis. When the Trend Buddy agrees with your structure, your levels, and your sentiment read, it adds confidence. When it disagrees, that's information too. But taking a trade just because a candle turned a colour, with no level or context behind it, is exactly how the tool gets you burnt.",
      panel: {
        title: 'Use It Right',
        lines: [
          'A point of **confluence**, not the thesis',
          'Agreement adds confidence',
          'Disagreement is information too',
          'Never trade a colour alone'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "To recap: blue hints, lime confirms, red cancels, green reconfirms; turquoise and magenta ride the trends; orange and fuchsia pivot them; purple, dark green and yellow flag the one-candle flips. That's a full trend-following vocabulary — but it stays confluence, not a system. Next, a tool that adds levels to the picture: the PAL.",
      panel: {
        title: 'Trend Buddy — Recap',
        lines: [
          'Blue → lime → red → green: the reversal chain',
          'Turquoise/magenta trends · orange/fuchsia pivots',
          'Confluence, **not** a standalone system',
          'Next: the PAL tool'
        ]
      }
    }
  ]
};
