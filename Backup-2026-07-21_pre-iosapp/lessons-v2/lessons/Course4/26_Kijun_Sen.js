/* Course4 · 26 — Kijun-Sen                             (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/26_kijun_sen'] = {
  id: 'course4/26_kijun_sen',
  course: 'Course4_Liquidity_Theory',
  module: '26_Kijun_Sen',
  title: 'Kijun-Sen',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Welcome to the fifth and final module: the Ichimoku masterclass. There are four high-probability Ichimoku nuances I've journaled over the years — the Kijun bounce, C-clamps, kumo pockets, and, most importantly, the edge-to-edge. No strategy works one hundred percent of the time, but these hit rates have earned a place in my system. We start with the base line itself: the Kijun-sen.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Ichimoku Masterclass — Kijun-Sen',
        lines: [
          'Four nuances: **Kijun bounce**, C-clamps, kumo pockets, edge-to-edge',
          'High hit rates — never 100%',
          'First up: the **base line**'
        ]
      }
    },
    {
      id: 'define',
      type: 'CONCEPT',
      say: "The Kijun is the midpoint of the last twenty-six periods' high and low — thirty on our crypto settings — which makes it a dynamic 50% Fibonacci retracement: the mean of the current trend. Price always wants to return to the Kijun. Close to it, the trend is in equilibrium; far from it, overextended. So trading the Kijun in a trending market is a mean reversion strategy — the line acts like a magnet.",
      panel: {
        title: 'A Dynamic 50% Fib',
        lines: [
          'Kijun = **midpoint** of the last 26/30 periods’ high–low',
          'A **dynamic 50% Fibonacci** — the mean of the trend',
          'Price **always wants to return** to the Kijun',
          'Trading it = a **mean reversion** strategy',
          'Prerequisite: a **trending** market'
        ]
      }
    },
    {
      id: 'tap',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'The Pullback Tap',
      say: "One rule before anything: Ichimoku only works in a trending environment — it's horribly inefficient in range-bound markets. Here we're trending. Watch the yellow base line: price extends away from the Kijun, then pulls back, taps it, and bounces. On one real leg, the first touch and the next came over one hundred ten days apart — patient bids resting along the Kijun caught that entry.",
      show: [
        { kind: 'level', at: 'kijunLevel', label: 'Kijun — dynamic 50% fib', side: 'left', tone: 'support' },
        { kind: 'note',  at: 'pullback', label: 'pullback taps the Kijun → bounce', place: 'below' }
      ]
    },
    {
      id: 'trade',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Framing the Trade',
      say: "Now a worked example. A sharp impulse from $7,380 to $10,584 — drop the fib on it and the 50% sits around $8,940, exactly where the Kijun is. So: bids at the Kijun, a technical stop below the low of the impulse, target the close of the impulse as resistance. Price reverted, filled us, and ran — a two-plus-R setup I've journaled at roughly a 72% hit rate.",
      show: [
        { kind: 'level',  at: 'kijunStop', label: 'risk just below the Kijun', side: 'right', tone: 'stop' },
        { kind: 'marker', at: 'aboveCloud', label: 'trend resumes — 2R+', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'mirror',
      type: 'CONCEPT',
      say: "The same logic mirrors in downtrends: most significant lower highs print right at the Kijun, so asks resting there provide optimal short entries — over the course of an entire year in one case. And a diagnostic: if the Kijun starts doing a poor job and keeps getting violated, zoom out and ask whether the market is trending or range-bound. The answer won't surprise you.",
      panel: {
        title: 'Bounces and Rejections',
        lines: [
          'Uptrend: significant **higher lows** print at the Kijun → bids',
          'Downtrend: significant **lower highs** print at the Kijun → asks',
          'Kijun keeps getting violated? The market stopped **trending**',
          'Backtest it on your favourite assets'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the Kijun-sen is a dynamic 50% fib — the mean that price always wants to revert to. In a trending market, bids or asks at the Kijun are high-probability entries with risk just beyond it; in a range, leave Ichimoku alone. Next nuance: what happens when the Tenkan tears away from the Kijun — C-clamps — plus the cloud's own S/R, kumo pockets.",
      panel: {
        title: 'Kijun-Sen — Recap',
        lines: [
          'Kijun = dynamic 50% fib = **mean reversion magnet**',
          '**Trending markets only**',
          'Bids/asks at the Kijun, risk just beyond it',
          'Next: C-clamps & kumo pockets'
        ]
      }
    }
  ]
};
