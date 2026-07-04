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
      id: 'bullish',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'all',
      heading: 'Bullish Structure',
      say: "Here's bullish market structure. Mark the swing lows and swing highs, and a pattern emerges: each swing high is higher than the last, and each swing low is higher than the last. Higher highs and higher lows — as long as that holds, the structure is bullish and buyers are in control.",
      show: [ { kind: 'marker', at: 'high1', style: 'dot', place: 'above', label: 'swing high' }, { kind: 'marker', at: 'start', style: 'reversal', place: 'below', label: 'swing low' },
        { kind: 'marker', at: 'hl1', label: 'swing low', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'hh1', label: 'swing high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'hl2', label: 'higher low', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'hh2', label: 'higher high', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'bos',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'all',
      heading: 'Break of Structure',
      say: "The moment that confirms the trend is the break of structure. When price pushes up and closes above a prior swing high, structure has broken to the upside. And notice where the next pullback lands — right on that old swing high, which now acts as support. That's the S R flip quietly building the next higher low.",
      show: [
        { kind: 'level',  at: 'flipLevel', label: 'prior swing high', side: 'left' },
        { kind: 'marker', at: 'hh1', label: 'breaks above → BOS', style: 'reversal', place: 'above' },
        { kind: 'marker', at: 'hl2', label: 'old high = new support', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'bearish',
      type: 'CHART',
      chart: 'downtrend',
      stage: 'all',
      heading: 'Bearish Structure',
      say: "Bearish structure is the mirror. Mark the swing points and you see lower highs and lower lows. Each bounce fails to take out the prior swing high — that's a lower high — and each drop violates the prior swing low — a lower low. As long as that holds, sellers own the trend.",
      show: [ { kind: 'marker', at: 'start', style: 'dot', place: 'above', label: 'swing high' }, { kind: 'marker', at: 'low1', style: 'sweep', place: 'below', label: 'swing low' },
        { kind: 'marker', at: 'lh1', label: 'lower high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'll1', label: 'lower low', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'lh2', label: 'lower high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'll2', label: 'lower low', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "Recap: swing points define market structure. Higher highs and higher lows is bullish; lower highs and lower lows is bearish. A break of structure — price taking out a prior swing point — is how a trend confirms itself or shifts. Next we'll see how consolidation, contraction, and expansion all revert back to this same bullish-versus-bearish framework.",
      panel: {
        title: 'Market Structure — Recap',
        lines: [
          'Swing points define the structure',
          '**Bullish** = higher highs + higher lows',
          '**Bearish** = lower highs + lower lows',
          'A **break of structure** confirms or shifts the trend'
        ]
      }
    }
  ]
};
