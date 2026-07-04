/* Course2 · 13 — Ichimoku Kinko Hyo                    (v2 lesson)
   Renders the real Ichimoku: Tenkan (blue), Kijun (yellow), Kumo cloud (green/red). */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/13_ichimoku_kinko_hyo'] = {
  id: 'course2/13_ichimoku_kinko_hyo',
  course: 'Course2_Building_Your_Toolbox',
  module: '13_Ichimoku_Kinko_Hyo',
  title: 'Ichimoku Kinko Hyo',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's talk about my favourite standalone indicator: the Ichimoku Kinko Hyo. The name translates to 'equilibrium at one glance.' It was built in the 1930s by a journalist named Goichi Hosoda, who spent over thirty years perfecting it. It's a trend-following system designed to capture the meat of a trend — 70 to 80 percent of the move.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Ichimoku Kinko Hyo',
        lines: [
          '“Equilibrium at one glance”',
          'A complete **trend-following** system',
          'Aims to capture the **meat of the trend**',
          '⚠ Poor in ranges — use it only when trending'
        ]
      }
    },
    {
      id: 'components',
      type: 'CONCEPT',
      say: "Ichimoku has five components. The Tenkan-sen, or conversion line, is a fast average. The Kijun-sen, or base line, is a slower one. Senkou Span A and Span B project forward and form the cloud, called the Kumo. And the Chikou span plots price in the past to gauge momentum. The clever part: instead of closing prices, every line uses the average of the high and low — moving averages on steroids.",
      panel: {
        title: 'The Five Components',
        lines: [
          '**Tenkan-sen** — fast conversion line',
          '**Kijun-sen** — slower base line',
          '**Senkou A & B** — form the **Kumo** cloud',
          '**Chikou** — lagging momentum line',
          'All use the **(high + low) / 2**, not the close'
        ]
      }
    },
    {
      id: 'cloud',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Reading the Cloud',
      say: "Here it all is on a chart. The blue line is the Tenkan, the yellow is the Kijun, and the shaded band is the Kumo cloud. The first read is the simplest and most powerful: price is trading above the cloud, and the cloud is green — both say the trend is bullish. Above a green cloud, you favour longs; below a red cloud, you favour shorts.",
      show: [
        { kind: 'note', at: 'aboveCloud', label: 'price above a green cloud = bullish', place: 'above' }
      ]
    },
    {
      id: 'signals',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Tenkan, Kijun & Dynamic Support',
      say: "Now the finer signals. When the fast Tenkan crosses above the slower Kijun, that's a bullish momentum signal — and a cross below is bearish. The Kijun also acts as a dynamic support line: notice how pullbacks find it and bounce. And the cloud itself is a thick zone of support or resistance — the thicker it is, the stronger it holds.",
      show: [
        { kind: 'marker', at: 'tkCross', label: 'Tenkan crosses Kijun — bullish', style: 'reversal', place: 'above' },
        { kind: 'level',  at: 'kijunLevel', label: 'Kijun — dynamic support', side: 'left' },
        { kind: 'note',   at: 'pullback', label: 'Kijun holds as support', place: 'below' },
        { kind: 'note',   at: 'cloudThick', label: 'thicker cloud = stronger', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So Ichimoku gives you trend, momentum, and support-resistance in a single glance — but only when a market is actually trending. In a range it produces false signal after false signal, so use the market-identification skills from Course One first. Used in the right conditions, it's a beautiful confluence tool. Next, we'll walk a full Ichimoku scenario.",
      panel: {
        title: 'Ichimoku — Recap',
        lines: [
          'Trend + momentum + S/R, at one glance',
          'Above green cloud = bullish; below red = bearish',
          'Tenkan/Kijun cross = momentum; Kijun = support',
          'Only trustworthy in **trending** markets'
        ]
      }
    }
  ]
};
