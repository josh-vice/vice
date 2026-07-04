/* Course4 · 11 — Futures Basis                         (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/11_future_basis'] = {
  id: 'course4/11_future_basis',
  course: 'Course4_Liquidity_Theory',
  module: '11_Future_Basis',
  title: 'Futures Basis',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "The last sentiment variable is the futures basis. Recall there's a spot market — the cash price of the asset — and a futures market that lets us speculate on its future price. The basis is simply the gap between the two: how far the futures price sits above or below spot. That gap is a thermometer for how eager one side of the market is.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Futures Basis',
        lines: [
          'The gap between **futures** and **spot**',
          'Spot = cash price; futures = future price',
          'A thermometer for market eagerness'
        ]
      }
    },
    {
      id: 'premium-discount',
      type: 'CONCEPT',
      say: "Two states. When futures trade above spot, that's a premium — traders are so eager to be long that they'll pay up for future exposure, a bullish lean. When futures trade below spot, that's a discount — eager shorts, a bearish lean. Like funding, it's the extremes that matter: a large premium or discount tells you one side has gotten carried away.",
      panel: {
        title: 'Premium & Discount',
        lines: [
          'Futures **above** spot = premium (eager longs)',
          'Futures **below** spot = discount (eager shorts)',
          'The extremes are what matter',
          'A big gap = one side carried away'
        ]
      }
    },
    {
      id: 'extremes',
      type: 'CHART',
      chart: 'future_basis',
      stage: 'all',
      heading: 'Basis Extremes',
      say: "Watch the basis in the panel as price runs up. The premium swells to an extreme right as price tops — longs are over-eager, paying a fat premium for exposure, clearly offside. Then price reverses and the premium collapses toward zero and into discount as that crowd capitulates. The extreme basis marked the top, just like extreme funding did.",
      show: [
        { kind: 'marker', at: 'top', label: 'premium extreme — longs over-eager', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'rejection', label: 'rejection — premium collapse begins', style: 'sweep', place: 'above' },
        { kind: 'marker', at: 'discount', label: 'basis crosses into discount', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the basis is the premium or discount of futures to spot, and its extremes reveal an over-eager, offside crowd — the same story funding tells, from a different angle. That's all four variables: funding, open interest, cumulative delta, and basis. Next, we bring them together to actually determine who's in control.",
      panel: {
        title: 'Futures Basis — Recap',
        lines: [
          'Premium = eager longs; discount = eager shorts',
          'Extremes reveal the **offside** crowd',
          'Confirms the funding story from another angle',
          'Next: combine all four variables'
        ]
      }
    }
  ]
};
