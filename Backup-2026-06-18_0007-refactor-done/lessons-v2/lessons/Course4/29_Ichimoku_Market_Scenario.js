/* Course4 · 29 — Ichimoku Market Scenario             (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/29_ichimoku_market_scenario'] = {
  id: 'course4/29_ichimoku_market_scenario',
  course: 'Course4_Liquidity_Theory',
  module: '29_Ichimoku_Market_Scenario',
  title: 'Ichimoku Market Scenario',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's bring the whole Ichimoku system together in one scenario, the way you'd actually trade it. The sequence is always the same: read the cloud for bias, use the Kijun and the cloud's edges for the entry, and let the components confirm one another at every step.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'An Ichimoku Scenario',
        lines: [
          'Read the cloud → find the entry → confirm',
          'Cloud for bias, Kijun + edges for entry',
          'Components confirm each other'
        ]
      }
    },
    {
      id: 'bias',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Step 1 — Bias from the Cloud',
      say: "First, the cloud. Price is trading above a green kumo, so the bias is firmly bullish — we're hunting longs only. The Tenkan is above the Kijun, confirming upward momentum. Before we even think about an entry, the system has told us which direction to trade, at a single glance.",
      show: [
        { kind: 'note', at: 'aboveCloud', label: 'above green cloud → bias long', place: 'above' }
      ]
    },
    {
      id: 'entry',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Step 2 — Entry at the Kijun',
      say: "Now the entry. Instead of chasing, we wait for price to pull back to the Kijun, our dynamic support. It holds, the Tenkan curls back up, and that's our trigger to join the trend with risk defined just below the cloud. Bias from the cloud, entry from the Kijun — the whole system working in concert, and exactly the meat-of-the-trend trade Ichimoku is built for.",
      show: [
        { kind: 'note', at: 'pullback', label: 'pullback to Kijun = entry', place: 'below' },
        { kind: 'note', at: 'aboveCloud', label: 'ride the trend', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the Ichimoku scenario is bias from the cloud, entry from the Kijun, target via edge-to-edge or the next level, managed until price closes back into the cloud. Layer it onto liquidity and sentiment, and trend-following meets liquidity theory. One thing remains — the most important rule of all: this only works in trending markets. Next, we close out the entire curriculum.",
      panel: {
        title: 'Ichimoku Scenario — Recap',
        lines: [
          'Cloud = bias; Kijun = entry; edge = target',
          'Manage until price re-enters the cloud',
          'Layer onto liquidity & sentiment',
          'Trending markets only'
        ]
      }
    }
  ]
};
