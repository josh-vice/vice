/* Course1 · 05 — Trending Markets                      (v2 lesson)
   Source provenance (read-only): YouTube fLM29ArLZsI.
   Uptrend (HH/HL), downtrend (LH/LL), trade with the trend. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/05_trending_markets'] = {
  id: 'course1/05_trending_markets',
  course: 'Course1_Laying_The_Foundation',
  module: '05_Trending_Markets',
  title: 'Trending Markets',
  source_video: 'fLM29ArLZsI',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now that support and resistance make sense, let's use them to identify the market we're in. Knowing whether price is trending — and which way — gives us a bias, and a bias is what lets us trade effectively instead of guessing. There are two trending markets: uptrends and downtrends.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'Trend Identification',
        lines: [
          'Knowing the market gives you a **bias**',
          'A bias is how you trade with intent, not by guessing',
          'Two trends: **uptrend** and **downtrend**'
        ]
      }
    },
    {
      id: 'uptrend',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'all',
      heading: 'Uptrend — Higher Highs & Higher Lows',
      say: "An uptrend, or bull trend, is defined by two things: higher highs and higher lows. Demand outweighs supply, so buyers keep defending price at progressively higher lows and pushing it to progressively higher highs. As long as you see that staircase climbing, the buyers are in control.",
      show: [
        { kind: 'marker', at: 'high1', label: 'high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'hl1', label: 'higher low', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'hh1', label: 'higher high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'hl2', label: 'higher low', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'hh2', label: 'higher high', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'uptrend-flip',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'all',
      heading: 'Old Highs Become Support',
      say: "Here's a detail worth noticing: many of those higher lows form right where price used to make a high. The old high, once resistance, has flipped to support and become the next higher low. That's the S R flip from the last lesson, doing the structural work that keeps an uptrend climbing.",
      show: [
        { kind: 'level', at: 'flipLevel', label: 'old high → new support', side: 'right' }
      ]
    },
    {
      id: 'downtrend',
      type: 'CHART',
      chart: 'downtrend',
      stage: 'all',
      heading: 'Downtrend — Lower Highs & Lower Lows',
      say: "The downtrend, or bear trend, is the mirror image: lower highs and lower lows. Now supply outweighs demand, so sellers keep capping price at lower highs and dragging it to lower lows. That staircase descending is your signal the sellers are in control.",
      show: [
        { kind: 'marker', at: 'low1', label: 'low', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'lh1', label: 'lower high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'll1', label: 'lower low', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'lh2', label: 'lower high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'll2', label: 'lower low', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'with-the-trend',
      type: 'CONCEPT',
      say: "Our job is to trade in the direction of the larger trend. The trend is your friend — trading against it is like swimming up a running stream, you just won't get far. But also remember trends are finite. A downtrend can live inside a larger uptrend, and eventually one side gets exhausted and breaks the structure — which is exactly what the next module is about.",
      panel: {
        title: 'Trade With the Trend',
        lines: [
          'Take positions in the direction of the larger trend',
          'Against the trend is swimming upstream — don’t',
          'Trends are **finite** — nothing lasts forever',
          'Exhaustion breaks structure → the next module'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "Quick recap: uptrends are higher highs and higher lows; downtrends are lower highs and lower lows. If you don't see either pattern, don't assume there's a trend at all. Use trend identification to know which way to lean — and never assume a trend continues forever. Next, Trip covers the markets with no trend at all: range-bound markets.",
      panel: {
        title: 'Trending Markets — Recap',
        lines: [
          '**Uptrend** = higher highs + higher lows',
          '**Downtrend** = lower highs + lower lows',
          'No clear pattern? Then assume **no trend**',
          'Next: trendless, **range-bound** markets'
        ]
      }
    }
  ]
};
