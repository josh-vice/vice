/* Course2 · 14 — Ichimoku Market Scenario             (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/14_ichimoku_market_scenario'] = {
  id: 'course2/14_ichimoku_market_scenario',
  course: 'Course2_Building_Your_Toolbox',
  module: '14_Ichimoku_Market_Scenario',
  title: 'Ichimoku Market Scenario',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's put Ichimoku to work in a scenario, the way you'd trade it live. The whole game plan flows from one question asked at a glance: where is price relative to the cloud? That single read sets our bias before we look at anything else.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'An Ichimoku Scenario',
        lines: [
          'Trade the system, step by step',
          'First question: price vs. the **cloud**',
          'That read sets the bias'
        ]
      }
    },
    {
      id: 'bias',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Bias: Above the Cloud',
      say: "Price is holding above a green Kumo cloud, so our bias is long — full stop. We are not looking for shorts here; we're looking for opportunities to join the uptrend. The Ichimoku has already told us, at a glance, which side of the market to be on.",
      show: [
        { kind: 'note', at: 'aboveCloud', label: 'above green cloud → bias long', place: 'above' }
      ]
    },
    {
      id: 'entry',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Entry: The Kijun Pullback',
      say: "Now we wait for the trend to offer an entry. Instead of chasing, we let price pull back to the Kijun line. The base line acts as dynamic support, the pullback holds, and the Tenkan turns back up through it — our signal to join the move with risk defined just below the cloud. We're riding the meat of the trend, exactly as intended.",
      show: [
        { kind: 'note', at: 'pullback', label: 'pullback to Kijun = entry', place: 'below' },
        { kind: 'note', at: 'aboveCloud', label: 'ride the trend', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "And that's the rhythm: read the cloud for bias, wait for a pullback to the Kijun for an entry, and ride the trend until price closes back into the cloud, which would flip the picture. Remember the one rule above all — this only works in a trending market. Spot a range, and you set Ichimoku aside.",
      panel: {
        title: 'Ichimoku Scenario — Recap',
        lines: [
          'Cloud sets the **bias**',
          'Kijun pullback offers the **entry**',
          'Ride until price closes back into the cloud',
          'Trending markets only'
        ]
      }
    }
  ]
};
