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
      id: 'uptrend-base',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'base',
      heading: 'Uptrend — Higher Highs & Higher Lows',
      say: "An uptrend, or bull trend, is defined by two things: higher highs and higher lows. Demand outweighs supply. It starts like this — price sets a high, pulls back, and buyers defend it at a higher low.",
      show: [
        { kind: 'marker', at: 'high1', label: 'high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'hl1', label: 'higher low', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'uptrend-confirm',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'confirm',
      say: "Then the buyers exert their strength: price pushes up through the old high and sets a higher high. Now both ingredients are in place — the uptrend is confirmed.",
      show: [
        { kind: 'marker', at: 'hh1', label: 'higher high', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'uptrend-all',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'all',
      say: "And the staircase keeps climbing: another higher low defended, another higher high printed. As long as you see that pattern repeating, the buyers are in control.",
      show: [
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
        { kind: 'marker', at: 'll1', label: 'lower low', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'lh2', label: 'lower high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'll2', label: 'lower low', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'nested-trend',
      type: 'CHART',
      chart: 'downtrend',
      stage: 'all',
      heading: 'A Trend Inside a Trend',
      say: "Now imagine this downtrend is the one-hour chart, sitting inside the daily uptrend we just mapped. Zoom in on any bull trend and you can find a whole downtrend living inside it — it's just the daily's pullback. At its final low the sellers exhaust, buyers push price back up, and the larger trend resumes. There can be several trends within a larger trend, depending on the timeframe.",
      show: [
        { kind: 'note', at: 'start', place: 'above', label: '1H — inside the daily uptrend' }
      ]
    },
    {
      id: 'with-the-trend',
      type: 'CONCEPT',
      say: "Our job is to trade in the direction of the larger trend. The trend is your friend — trading against it is like swimming up a running stream, you just won't get far. But also remember trends are finite. Every trend lasts until exhaustion — a pivot point where the buyers or the sellers lose control. That's what breaks structure and sets up a potential reversal — exactly what the next module is about.",
      panel: {
        title: 'Trade With the Trend',
        lines: [
          'Take positions in the direction of the larger trend',
          'Against the trend is swimming upstream — don’t',
          'Trends are **finite** — nothing lasts forever',
          '**Exhaustion** = a pivot point where buyers or sellers lose control',
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
