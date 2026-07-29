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
      id: 'makeup',
      type: 'CONCEPT',
      say: "How is it calculated? Funding is made of two parts: an interest rate — stagnant, not variable — plus a premium or discount, the perpetual swap's price measured against the spot index price. Perp above the index is a premium; below it, a discount. And it's paid at set intervals — every eight hours on the exchanges we've used, so three funding payments a day.",
      panel: {
        title: 'What Funding Is Made Of',
        lines: [
          '**Interest rate** (stagnant) + **premium / discount**',
          'Premium = perp **above** the index (spot) price',
          'Discount = perp **below** the index price',
          'Paid every **8 hours** — three times a day'
        ]
      }
    },
    {
      id: 'how',
      type: 'CONCEPT',
      say: "Here's the key mechanic. When funding is positive, longs pay shorts — which means longs are the crowded, eager side. When funding is negative, shorts pay longs — shorts are crowded. The exchange uses this payment to incentivise participants to provide liquidity and keep the market balanced. So the funding rate is a direct readout of which side is over-leveraged and paying for the privilege.",
      panel: {
        title: 'How Funding Works',
        lines: [
          '**Positive** funding → longs pay shorts (longs crowded)',
          '**Negative** funding → shorts pay longs (shorts crowded)',
          'It incentivises **liquidity provision**',
          'A direct readout of the crowded side'
        ]
      }
    },
    {
      id: 'climb',
      type: 'CHART',
      chart: 'funding_rate',
      stage: 'all',
      heading: 'Funding Climbs with Price',
      say: "Watch the panel below as price rallies. Funding climbs higher and higher into positive territory — longs are piling in, and every eight hours they're paying more and more to stay in the trade.",
      show: [
        { kind: 'marker', at: 'rising', label: 'funding climbing into positive', style: 'dot', place: 'above', panel: 'sub' }
      ]
    },
    {
      id: 'extreme',
      type: 'CHART',
      chart: 'funding_rate',
      stage: 'all',
      heading: 'The Positive Extreme',
      say: "By the top, funding is at a positive extreme — longs are paying handsomely to hold. That's the exhaustion point we hunt for: the long side is dangerously crowded, and crowded means offside.",
      show: [
        { kind: 'marker', at: 'top', label: 'funding extreme — longs crowded & offside', style: 'reversal', place: 'above', panel: 'sub' }
      ]
    },
    {
      id: 'flip',
      type: 'CHART',
      chart: 'funding_rate',
      stage: 'all',
      heading: 'The Flush — and the Mirror',
      say: "Then price reverses, those longs get squeezed, and funding flips negative as the crowd flushes out. The extreme marked the exhaustion. And the mirror read matters just as much: sustained negative funding — shorts paying heavily, especially at a range low or support — means shorts are the crowded side. That's short-squeeze fuel and often marks a bottom.",
      show: [
        { kind: 'marker', at: 'flip', label: 'longs squeezed → funding flips negative', style: 'sweep', place: 'below', panel: 'sub' }
      ]
    },
    {
      id: 'offside',
      type: 'CONCEPT',
      say: "So the lesson: extreme funding tells you the crowd is overexposed on one side, and an overexposed side is fuel for a squeeze in the opposite direction. We don't fade extremes blindly — we wait for them to line up with a key level or a liquidity structure. Longs paying up at resistance, or shorts paying heavily at support — that's a high-conviction setup.",
      panel: {
        title: 'Spotting the Offside Crowd',
        lines: [
          'Extreme funding = an **overexposed** side',
          'Positive extreme at resistance → long-squeeze risk',
          'Negative extreme at support → **short-squeeze fuel**',
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
