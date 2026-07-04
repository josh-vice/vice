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
      say: "Let's return to Ichimoku and go deep on one of its most useful lines: the Kijun-sen, the base line. While the cloud gives us bias, the Kijun is our workhorse for entries and dynamic support and resistance. In a healthy trend, price respects it almost magnetically, which makes it one of my favourite lines on the whole chart.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Kijun-Sen — the Base Line',
        lines: [
          'Ichimoku’s **base line** (the yellow one)',
          'The cloud gives bias; the Kijun gives **entries**',
          'In a trend, price respects it'
        ]
      }
    },
    {
      id: 'chart',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'The Kijun as Dynamic Support',
      say: "Watch the yellow Kijun line. In this uptrend, every time price pulls back, it finds the Kijun and bounces — the base line is acting as dynamic support that rises with the trend. That gives us a repeatable entry: rather than chasing, we wait for price to return to the Kijun and buy the reaction, with risk just below it.",
      show: [
        { kind: 'note', at: 'pullback', label: 'price pulls back to the Kijun → bounce', place: 'below' },
        { kind: 'note', at: 'aboveCloud', label: 'trend stays above the cloud', place: 'above' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "Two reads make the Kijun powerful. As dynamic support or resistance, it offers low-risk pullback entries in the direction of the trend. And as a momentum gauge: price holding above the Kijun means bulls are in control; a decisive close below it warns that momentum is shifting. Combine the Kijun bounce with a liquidation cluster or a level and you've got real confluence.",
      panel: {
        title: 'Two Reads',
        lines: [
          'Dynamic S/R → low-risk pullback entries',
          'Above the Kijun = bulls in control',
          'Close below = momentum shifting',
          'Pair with a level or cluster for confluence'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the Kijun-sen is your entry and momentum line — respected as dynamic support in a trend and a clean trigger for joining it. Next, we look at some cloud patterns: C-clamps and kumo pockets.",
      panel: {
        title: 'Kijun-Sen — Recap',
        lines: [
          'The base line = entries + momentum',
          'Dynamic support in an uptrend',
          'A close through it flags a shift',
          'Next: C-clamps and kumo pockets'
        ]
      }
    }
  ]
};
