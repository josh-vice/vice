/* Course1 · 03 — Components of a Market                (v2 lesson)
   Source provenance (read-only): YouTube lx-kTGQxhIs. Supply & demand. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/03_components_of_a_market'] = {
  id: 'course1/03_components_of_a_market',
  course: 'Course1_Laying_The_Foundation',
  module: '03_Components_of_a_Market',
  title: 'Components of a Market',
  source_video: 'lx-kTGQxhIs',
  beats: [
    {
      id: 'what-is-a-market',
      type: 'CONCEPT',
      say: "What is a market? At its core, a market is simply a place where buyers and sellers meet to exchange something. Long ago that meant a physical marketplace; today it's a virtual exchange where we trade assets — stocks, currencies, and, for most of you here, cryptocurrencies.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'What is a Market?',
        lines: [
          'A place where **buyers** and **sellers** meet to exchange',
          'Today: virtual exchanges, traded globally',
          'Our focus — the cryptocurrency markets'
        ]
      }
    },
    {
      id: 'buyers-sellers',
      type: 'CONCEPT',
      say: "Here's the key translation for everything ahead: buyers are demand, and sellers are supply. What we really want to find is the exhaustion point of each side — where the buyers run out of steam to push price higher, and where the sellers run out of steam to push it lower. Those exhaustion points are where price turns.",
      panel: {
        title: 'Buyers = Demand · Sellers = Supply',
        lines: [
          'Buyers are **demand**; sellers are **supply**',
          'We hunt the **exhaustion point** of each side',
          'Where one side runs out of steam, price turns'
        ]
      }
    },
    {
      id: 'zones',
      type: 'CHART',
      chart: 'range_bound',
      stage: 'all',
      heading: 'Supply Above, Demand Below',
      say: "Watch the conversation play out. Up near the highs there's a supply zone — every time price reaches it, sellers step in and push it back down. Down near the lows there's a demand zone — every time price falls to it, buyers step in and lift it. Price ping-pongs between the two, and that back-and-forth is the heartbeat of a market.",
      show: [
        { kind: 'zone',  side: 'below', of: 'high', tone: 'risk',   label: 'supply zone — sellers step in' },
        { kind: 'zone',  side: 'above', of: 'low',  tone: 'reward', label: 'demand zone — buyers step in' }
      ]
    },
    {
      id: 'demand-bounce',
      type: 'CANDLE',
      candle: 'long_lower_wick',
      heading: 'A Demand Bounce, Up Close',
      say: "What does a demand zone actually look like when buyers defend it? Exactly like the hammer we just learned. Price drops into the zone, sellers try to keep pushing, but a long lower wick forms as buyers absorb them and lift the close. That single candle is your evidence that buyers are present.",
      show: [
        { kind: 'region', of: 'lowerWick', label: 'sellers pushed down…' },
        { kind: 'region', of: 'body',      label: '…buyers defended the demand zone' }
      ]
    },
    {
      id: 'finite-holds',
      type: 'CHART',
      chart: 'consolidation_breakout',
      params: { dir: 'down' },
      stage: 'consolidate',
      heading: 'Zones Are Finite',
      say: "But here's the crucial part: there are only so many buyers and sellers. Watch this demand zone — it holds, and holds, and holds. Every time price falls into it, buyers step in and push it away. But each defence uses up some of them.",
      show: [ { kind: 'level', at: 'rangeHigh', side: 'left', label: 'supply zone', tone: 'risk' },
        { kind: 'level',  at: 'rangeLow', label: 'demand zone', side: 'left', tone: 'reward' }
      ]
    },
    {
      id: 'finite-breaks',
      type: 'CHART',
      chart: 'consolidation_breakout',
      params: { dir: 'down' },
      stage: 'breakout',
      say: "Until the buyers are used up. With no one left to defend the zone, price breaks down through it. The same is true of supply: exhaust the sellers and price breaks out. Recognising when a zone is running out is what the rest of the course is about.",
      show: [
        { kind: 'marker', at: 'entry', label: 'buyers exhausted — breakdown', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "To recap: supply and demand is just the conversation between buyers and sellers, drawn on the chart. We mark the zones where each side shows up, we watch for the exhaustion of one side, and we remember that every zone is finite. As a trader, that means at demand zones you look to buy, and at supply zones you look to sell. And this is the foundation of the next idea — support and resistance.",
      panel: {
        title: 'Supply & Demand — Recap',
        lines: [
          'Mark the zones where buyers and sellers show up',
          'Watch for the **exhaustion** of one side',
          'Every zone is **finite** — that’s where breakouts begin',
          'At **demand** look to buy · at **supply** look to sell',
          'This is the foundation of **support & resistance**'
        ]
      }
    }
  ]
};
