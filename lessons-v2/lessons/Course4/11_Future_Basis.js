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
      say: "Two states, and two names you need to know. When the futures price trades above spot, that's a premium — the market is in contango; traders are so eager to be long they'll pay up for future exposure. Spot at $1,000, futures at $1,500: contango. When futures trade below spot, that's a discount — backwardation; the shorts are the eager ones. Spot at $1,000, futures at $700: backwardation.",
      panel: {
        title: 'Contango & Backwardation',
        lines: [
          'Futures **above** spot = premium → **CONTANGO**',
          'Futures **below** spot = discount → **BACKWARDATION**',
          'Contango: eager longs pay up',
          'Backwardation: eager shorts sell down'
        ]
      }
    },
    {
      id: 'premium',
      type: 'CHART',
      chart: 'future_basis',
      stage: 'premium',
      heading: 'Contango at an Extreme',
      say: "Watch the basis in the panel as price trends up. The premium swells with the rally, and right as price tops it hits an extreme — the futures contract trading over $600 above spot. That's contango stretched to euphoria: longs are over-eager, paying a fat premium for exposure, and clearly offside. An extreme premium like this marks the exhaustion point of the trend.",
      show: [
        { kind: 'marker', at: 'top', label: 'premium extreme — contango, longs over-eager', style: 'reversal', place: 'above', panel: 'sub' }
      ]
    },
    {
      id: 'collapse',
      type: 'CHART',
      chart: 'future_basis',
      stage: 'collapse',
      heading: 'The Premium Collapses',
      say: "Price rolls over and the premium dissipates — the basis drops, crosses zero, and futures flip to trading below spot. The eager longs have capitulated and now the basis sits at a discount. We've swung from contango into backwardation.",
      show: [
        { kind: 'marker', at: 'rejection', label: 'rejection — premium collapse begins', style: 'sweep', place: 'above', panel: 'sub' },
        { kind: 'marker', at: 'discount', label: 'basis crosses zero — discount', style: 'sweep', place: 'below', panel: 'sub' }
      ]
    },
    {
      id: 'backwardation',
      type: 'CHART',
      chart: 'future_basis',
      stage: 'all',
      heading: 'Backwardation at the Low',
      say: "On the big impulse down, the discount blows out: the deepest backwardation prints right at the price low, futures nearly $800 under spot. Now it's the sellers who've gotten carried away — the same extreme we saw at the top, mirrored.",
      show: [
        { kind: 'marker', at: 'extreme', label: 'backwardation extreme — at the price low', style: 'reversal', place: 'below', panel: 'sub' }
      ]
    },
    {
      id: 'snapback',
      type: 'CHART',
      chart: 'future_basis',
      stage: 'all',
      heading: 'The Snapback',
      say: "Then watch the basis snap back toward zero as price bottoms — the backwardation dissolves, the market comes back in line, and an uptrend begins. That snapback out of extreme backwardation was the bottom signal. Basis extremes, in either direction, are inflection points.",
      show: [
        { kind: 'marker', at: 'snapback', label: 'snapback toward zero — bottom signal', style: 'dot', place: 'above', panel: 'sub' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the basis is the gap between futures and spot: contango at a premium, backwardation at a discount, and the extremes of either are inflection points — a euphoric premium marks tops, a blown-out discount with a snapback marks bottoms. That's all four variables: funding, open interest, cumulative delta, and basis. Next, we bring them together to actually determine who's in control.",
      panel: {
        title: 'Futures Basis — Recap',
        lines: [
          '**Contango** = premium; **backwardation** = discount',
          'Basis extremes = **inflection points**',
          'Extreme premium → top; discount + snapback → bottom',
          'Next: combine all four variables'
        ]
      }
    }
  ]
};
