/* Course1 · 07 — What Is Market Structure?            (v2 lesson)
   Source provenance (read-only): YouTube 1OfaKpSl8YI. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/07_what_is_market_structure'] = {
  id: 'course1/07_what_is_market_structure',
  course: 'Course1_Laying_The_Foundation',
  module: '07_What_is_Market_Structure',
  title: 'What Is Market Structure?',
  source_video: '1OfaKpSl8YI',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Market structure, or MS, is how we tell whether a market is bullish, bearish, or ranging. It's built from swing points — and once you can read them, you can judge the overall trend and decide where to trade with it.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'Market Structure',
        lines: [
          'How we read **bullish**, **bearish**, or **ranging**',
          'Built entirely from **swing points**',
          'It tells you the trend — and where to trade with it'
        ]
      }
    },
    {
      id: 'swing-points',
      type: 'CONCEPT',
      say: "First, the building block: swing points. A swing high is a high that stands above the highs around it. A swing low is a low that sits below the lows around it. We focus on high-timeframe swing points, because those are the ones that define the structure that really matters.",
      panel: {
        title: 'Swing Points',
        lines: [
          'A **swing high** stands above the highs around it',
          'A **swing low** sits below the lows around it',
          'Focus on **high-timeframe** swing points'
        ]
      }
    },
    {
      id: 'bullish-base',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'base',
      heading: 'Bullish Structure',
      say: "Here's bullish market structure forming. Price refuses to go lower at the first swing low — see that long lower wick, almost our dragonfly doji from the candlestick lesson — buyers are present. It runs up to the first swing high, where sellers appear, then retraces and stops bleeding at a higher swing low.",
      show: [ { kind: 'marker', at: 'start', style: 'reversal', place: 'below', label: 'swing low' },
        { kind: 'marker', at: 'high1', style: 'dot', place: 'above', label: 'swing high' },
        { kind: 'marker', at: 'hl1', label: 'swing low', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'bullish-confirm',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'confirm',
      say: "Then price pushes up and breaks above that swing high, making a new swing high. The prior high has been taken out — the buyers are winning the argument.",
      show: [
        { kind: 'marker', at: 'hh1', label: 'new swing high', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'bullish-all',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'all',
      say: "And the pattern repeats: a higher low holds, a higher high prints. Each swing high is higher than the last, each swing low is higher than the last. Higher highs and higher lows — as long as that holds, the structure is bullish and buyers are in control.",
      show: [
        { kind: 'marker', at: 'hl2', label: 'higher low', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'hh2', label: 'higher high', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'bos',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'all',
      heading: 'Taking Out a Swing High',
      say: "The moment that confirms the trend is when a prior swing point is taken out. Price pushes up and breaks above the old swing high — structure has shifted to the upside. And notice where the next pullback lands: right on that old swing high, which now acts as support. That's the S R flip quietly building the next higher low.",
      show: [
        { kind: 'level',  at: 'flipLevel', label: 'prior swing high', side: 'left' },
        { kind: 'marker', at: 'hh1', label: 'breaks above the prior high', style: 'reversal', place: 'above' },
        { kind: 'marker', at: 'hl2', label: 'old high = new support', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'bearish-base',
      type: 'CHART',
      chart: 'downtrend',
      stage: 'base',
      heading: 'Bearish Structure',
      say: "Bearish structure is the mirror. Price sets a swing high, drops to a swing low, and the bounce fails to take out that prior swing high — a lower high. The sellers are capping every recovery.",
      show: [ { kind: 'marker', at: 'start', style: 'dot', place: 'above', label: 'swing high' },
        { kind: 'marker', at: 'low1', style: 'reversal', place: 'below', label: 'swing low' },
        { kind: 'marker', at: 'lh1', label: 'lower high', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'bearish-confirm',
      type: 'CHART',
      chart: 'downtrend',
      stage: 'confirm',
      say: "Then the drop violates the prior swing low — a lower low. The prior low has been taken out, and the staircase is descending.",
      show: [
        { kind: 'marker', at: 'll1', label: 'lower low — violates the prior low', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'bearish-all',
      type: 'CHART',
      chart: 'downtrend',
      stage: 'all',
      say: "Watch where the next bounce stalls: almost exactly at the prior swing low. Old support has flipped to resistance — an S R flip zone capping the recovery. Another lower high, another lower low. As long as that holds, sellers own the trend.",
      show: [
        { kind: 'level',  at: 'flipLevel', label: 'prior low → resistance', side: 'left' },
        { kind: 'marker', at: 'lh2', label: 'lower high — at the flip', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'll2', label: 'lower low', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "Recap: swing points define market structure, and reading them is market structure analysis — MSA. Higher highs and higher lows is bullish; lower highs and lower lows is bearish. When a prior swing point is taken out — a swing high broken above, or a swing low violated — the trend confirms itself or shifts. Next we'll see how consolidation, contraction, and expansion all revert back to this same bullish-versus-bearish framework.",
      panel: {
        title: 'Market Structure — Recap',
        lines: [
          'Swing points define the structure — reading them = **MSA**',
          '**Bullish** = higher highs + higher lows',
          '**Bearish** = lower highs + lower lows',
          'Taking out a prior swing point **confirms or shifts** the trend'
        ]
      }
    }
  ]
};
