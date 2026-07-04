/* Course4 · 08 — Funding Rate                          (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/08_funding_rate'] = {
  id: 'course4/08_funding_rate',
  course: 'Course4_Liquidity_Theory',
  module: '08_Funding_Rate',
  title: 'Funding Rate',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Our first sentiment variable is the funding rate, and it's a powerful way to spot who's offside. Funding is essentially the cost to borrow in order to go long or short on margin. On a perpetual swap, it's the mechanism that keeps the contract tethered to the spot price by paying one side to hold the position the market needs.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Funding Rate',
        lines: [
          'The cost to hold a leveraged position',
          'Keeps the **perp tethered to spot**',
          'Pays one side to balance the market'
        ]
      }
    },
    {
      id: 'how',
      type: 'CONCEPT',
      say: "Here's the key mechanic. When funding is positive, longs pay shorts — which means longs are the crowded, eager side. When funding is negative, shorts pay longs — shorts are crowded. The exchange uses this payment to incentivise balance. So the funding rate is a direct readout of which side is over-leveraged and paying for the privilege.",
      panel: {
        title: 'How Funding Works',
        lines: [
          '**Positive** funding → longs pay shorts (longs crowded)',
          '**Negative** funding → shorts pay longs (shorts crowded)',
          'It incentivises balance',
          'A direct readout of the crowded side'
        ]
      }
    },
    {
      id: 'extremes',
      type: 'CHART',
      chart: 'funding_rate',
      stage: 'all',
      heading: 'Reading Funding Extremes',
      say: "Watch the panel below as price rallies. Funding climbs higher and higher into positive territory — longs are piling in and paying more and more to hold. By the top, funding is at an extreme: the long side is dangerously crowded and offside. Then price reverses, those longs get squeezed, and funding flips negative as the crowd flushes out. The extreme marked the exhaustion.",
      show: [
        { kind: 'marker', at: 'rising', label: 'funding climbing into positive', style: 'dot', place: 'above', panel: 'sub' },
        { kind: 'marker', at: 'top', label: 'funding extreme — longs crowded & offside', style: 'reversal', place: 'above', panel: 'sub' },
        { kind: 'marker', at: 'flip', label: 'longs squeezed → funding flips negative', style: 'sweep', place: 'below', panel: 'sub' }
      ]
    },
    {
      id: 'offside',
      type: 'CONCEPT',
      say: "So the lesson: extreme funding tells you the crowd is overexposed on one side, and an overexposed side is fuel for a squeeze in the opposite direction. We don't fade extremes blindly — we wait for them to line up with a key level or a liquidity structure. But when funding is screaming that longs are offside right at resistance, that's a high-conviction setup.",
      panel: {
        title: 'Spotting the Offside Crowd',
        lines: [
          'Extreme funding = an **overexposed** side',
          'Overexposed = fuel for a squeeze',
          'Don’t fade blindly — wait for a level',
          'Extreme funding **+** a structure = conviction'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "To recap: funding is the cost to hold a leveraged position; positive means longs are crowded, negative means shorts are. Extremes mark an offside crowd that's ripe to be squeezed. It's our first and one of our cleanest reads on who's in control. Next, we add open interest to the picture.",
      panel: {
        title: 'Funding Rate — Recap',
        lines: [
          'Funding = cost to hold leverage',
          'Positive = crowded longs; negative = crowded shorts',
          'Extremes mark the **offside** crowd',
          'Confirm with a level before fading'
        ]
      }
    }
  ]
};
