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
      id: 'why',
      type: 'CONCEPT',
      say: "Why do derivatives exist? Two main reasons. First, hedging risk: a derivative can limit your risk or losses around uncertainty in future price direction — think of it almost as an insurance policy. Second, speculation: betting on the direction of the underlying asset — a profitability-based strategy rather than risk mitigation. And that fancy term, risk mitigation, just means: how do I limit my exposure to this asset?",
      panel: {
        title: 'Why Derivatives? Two Main Reasons',
        lines: [
          '**Hedging** — limit risk around future price direction',
          'Think of a hedge as an **insurance policy**',
          '**Speculation** — betting on the underlying’s direction',
          'Profit-seeking vs. **risk mitigation**'
        ]
      }
    },
    {
      id: 'types',
      type: 'CONCEPT',
      say: "The types you'll meet. Futures and forwards: contracts to buy or sell an asset at a specified price on a specified date — futures trade on regulated exchanges; forwards are the unregulated, business-to-business cousin. Options: the right, but not the obligation, to do the same. And swaps exchange one asset's cash flows for another's — in crypto, the perpetual swap has no expiry, and it's the workhorse we'll explore later.",
      panel: {
        title: 'The Main Types',
        lines: [
          '**Futures / forwards** — set price, set date (forwards: unregulated)',
          '**Options** — the right, not the obligation',
          '**Swaps** — exchanged cash flows; crypto’s **perpetual swap** never expires',
          'All offer exposure — and often **leverage**'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So: the spot market is the underlying asset; a derivative draws its value from it and trades through contracts. You'll use them for two main reasons — hedging risk, or speculating on direction. Futures and forwards, options, and swaps are the ones to recognize. Don't worry about mastering them yet — the advanced course dives deep into derivatives and leverage. That's a wrap on Course Two; one short outro to go.",
      panel: {
        title: 'Instruments — Recap',
        lines: [
          'Spot = the underlying asset',
          'Derivatives draw value from it via contracts',
          'Hedge (insurance) or speculate (bet on direction)',
          'Futures/forwards · options · swaps',
          'The advanced course goes deep on these'
        ]
      }
    }
  ]
};
