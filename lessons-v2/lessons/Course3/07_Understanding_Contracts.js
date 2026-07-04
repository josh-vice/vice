/* Course3 · 07 — Understanding Contracts               (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/07_understanding_contracts'] = {
  id: 'course3/07_understanding_contracts',
  course: 'Course3_Sharpening_Your_Edge',
  module: '07_Understanding_Contracts',
  title: 'Understanding Contracts',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's look under the hood at contract details. We won't go deep yet — this is a primer for the sentiment data you'll study in the advanced course. But a few of these numbers are worth knowing now, because they hint at what the broader market is doing beneath the price.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Contract Details',
        lines: [
          'A primer for the advanced course',
          'A few numbers reveal the **market beneath price**',
          'Just the basics for now'
        ]
      }
    },
    {
      id: 'numbers',
      type: 'CONCEPT',
      say: "Four to know. The index price is the contract's fair anchor, built from several spot exchanges so no single venue can distort it. Twenty-four-hour turnover is the value of contracts traded in a day — activity. Open interest is the number of contracts currently open — committed money. And the funding rate is what you pay, or receive, to hold a perp position: it's set by the swap price relative to the index, and charged every funding period.",
      panel: {
        title: 'The Numbers Worth Knowing',
        lines: [
          '**Index price** — fair anchor from many spot exchanges',
          '**24h turnover** — value traded in a day (activity)',
          '**Open interest** — open contracts (committed money)',
          '**Funding rate** — what you pay or receive to hold a perp'
        ]
      }
    },
    {
      id: 'oi',
      type: 'CHART',
      chart: 'open_interest',
      stage: 'all',
      heading: 'Open Interest, Read Against Price',
      say: "Here's why open interest earns its place. When it climbs alongside a trend, fresh money is entering and backing the move. When it peaks with price and then falls, positions are closing — the commitment behind the move is unwinding. That single line under the chart tells you whether a move is being funded or abandoned.",
      show: [
        { kind: 'marker', at: 'rising',   label: 'OI climbs — fresh money backs the move', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'top',      label: 'peaks with price', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'reversal', label: 'OI falls — positions unwinding', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'funding',
      type: 'CHART',
      chart: 'funding_rate',
      stage: 'all',
      heading: 'The Funding Rate Shows Who Pays',
      say: "And the funding rate tells you which side is paying to stay in. Positive and climbing means longs are paying shorts — the crowd is leaning long, and holding costs them every period. When it flips negative, shorts pay. In the advanced course this becomes a core sentiment tool for spotting who's offside; for now, know that holding a perp is never free.",
      show: [
        { kind: 'marker', at: 'rising', label: 'funding climbs — longs pay shorts', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'flip',   label: 'flips negative — shorts pay', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'calculator',
      type: 'CONCEPT',
      say: "One last tool: the exchange calculator, three tabs deep. The profit-and-loss tab gives you a quick-and-dirty read on what a take-profit or stop would mean in P&L and percentage terms. The target-price tab works backwards from a desired return. And the liquidation-price tab — the one that matters — takes your contracts, entry, and leverage and tells you exactly where liquidation sits. Check it before you execute, and place your stop accordingly.",
      panel: {
        title: 'The Calculator',
        lines: [
          '**P&L tab** — quick maths on TP and stop outcomes',
          '**Target price** — works back from a desired return',
          '**Liquidation price** — where the force-close sits',
          'Check it **before** you execute'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So keep these in your back pocket: the index anchors fair value, turnover measures activity, open interest measures commitment, and funding is the cost of holding a perp. Together they're the raw material of sentiment analysis — the heart of the Liquidity Theory course. Next, the big one: leverage.",
      panel: {
        title: 'Contracts — Recap',
        lines: [
          'Index = fair anchor · turnover = activity',
          'Open interest = commitment · **funding = holding cost**',
          'The raw material of **sentiment analysis**',
          'Powerful once you reach Liquidity Theory'
        ]
      }
    }
  ]
};
