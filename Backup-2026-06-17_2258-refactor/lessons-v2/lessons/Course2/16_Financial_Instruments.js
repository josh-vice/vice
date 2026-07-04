/* Course2 · 16 — Financial Instruments                 (v2 lesson, concept-only) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/16_financial_instruments'] = {
  id: 'course2/16_financial_instruments',
  course: 'Course2_Building_Your_Toolbox',
  module: '16_Financial_Instruments',
  title: 'Financial Instruments',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's meet the financial instruments you'll actually trade. We'll keep it simple. The starting point is the asset itself — a stock, a currency, a commodity, a cryptocurrency. Buying the real thing is trading the spot, or physical, market. Everything else is built on top of that underlying asset.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Financial Instruments',
        lines: [
          'The asset itself = the **spot** (physical) market',
          'Stocks, currencies, commodities, crypto',
          'Everything else is built on this **underlying**'
        ]
      }
    },
    {
      id: 'derivatives',
      type: 'CONCEPT',
      say: "Now the key term: derivatives. To derive means to obtain from something else — and a derivative is a financial product whose value is derived from an underlying asset. It's its own instrument, traded through contracts between parties, but its price simply tracks the asset it's based on. Take gold: it's heavy and expensive to hold, so traders use derivatives to get exposure to gold without ever touching a bar.",
      panel: {
        title: 'Derivatives',
        lines: [
          'A **derivative** derives its value from an underlying',
          'Its own instrument, traded via **contracts**',
          'Price tracks the underlying asset',
          'Gives exposure without holding the asset'
        ]
      }
    },
    {
      id: 'types',
      type: 'CONCEPT',
      say: "There are a few you'll meet often. Futures are contracts to buy or sell an asset at a set price on a future date. Options give you the right, but not the obligation, to do the same. And in crypto especially, perpetual swaps are derivatives with no expiry that track the spot price closely — the workhorse of the markets we'll explore in the advanced course. Each lets you gain exposure, and often leverage, beyond simply owning the asset.",
      panel: {
        title: 'The Main Types',
        lines: [
          '**Futures** — buy/sell at a set price, future date',
          '**Options** — the right, not the obligation',
          '**Perpetual swaps** — no expiry, track spot (crypto)',
          'All offer exposure — and often **leverage**'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So: the spot market is the underlying asset, and derivatives are instruments that draw their value from it through contracts. Futures, options, and perpetual swaps each give you a different way to express a view. Don't worry about mastering them yet — the advanced course dives deep into derivatives, leverage, and the mechanics. That's a wrap on Course Two; one short outro to go.",
      panel: {
        title: 'Instruments — Recap',
        lines: [
          'Spot = the underlying asset',
          'Derivatives draw value from it via contracts',
          'Futures · options · perpetual swaps',
          'The advanced course goes deep on these'
        ]
      }
    }
  ]
};
