/* Course3 · 04 — Understanding the Order Book          (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/04_understanding_the_orderbook'] = {
  id: 'course3/04_understanding_the_orderbook',
  course: 'Course3_Sharpening_Your_Edge',
  module: '04_Understanding_the_Orderbook',
  title: 'Understanding the Order Book',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "With capital on the exchange, let's open the order book — the live ledger of every resting buy and sell order for an asset. If price action is the story of who won, the order book is the story of who's waiting. It's where supply and demand become literal, order by order.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'The Order Book',
        lines: [
          'A live ledger of every **resting** order',
          'Price action = who won; the book = who’s **waiting**',
          'Supply and demand, made literal'
        ]
      }
    },
    {
      id: 'bids-asks',
      type: 'CONCEPT',
      say: "The book has two halves. Bids are resting buy orders, stacked just below the current price — that's demand. Asks are resting sell orders, stacked just above — that's supply. The small gap between the best bid and best ask is the spread. And the quantity waiting at each price, the depth, tells you how much firepower sits at that level.",
      panel: {
        title: 'Bids, Asks & Depth',
        lines: [
          '**Bids** — resting buys below price (demand)',
          '**Asks** — resting sells above price (supply)',
          'The gap between them is the **spread**',
          'Quantity at each price = **depth**'
        ]
      }
    },
    {
      id: 'ladder',
      type: 'CHART',
      chart: 'range_bound',
      stage: 'all',
      heading: 'The Depth Ladder, On the Chart',
      say: "Here's the same idea drawn over price. Below the market sits the green half of the ladder — bids, contracts waiting to buy at each level. Above it sits the red half — asks, contracts for sale. Price trades in the gap between them, and every tick is an order from one side consuming an order from the other.",
      show: [
        { kind: 'level',   at: 'mid',  label: 'market price — the spread lives here', side: 'left', tone: 'gold' },
        { kind: 'heatmap', of: 'mid',  to: 'low',  tone: 'long',  peak: 0.2, label: 'bids — resting buys (demand)' },
        { kind: 'heatmap', of: 'high', to: 'mid',  tone: 'short', peak: 0.8, label: 'asks — resting sells (supply)' }
      ]
    },
    {
      id: 'why',
      type: 'CONCEPT',
      say: "Why care? Depth is liquidity. A thin book — few orders waiting — means price can lurch and your market orders slip badly. A thick book absorbs size and can act as a wall of support or resistance. Large resting orders can also be clues, though in the advanced course you'll learn they're sometimes bait. For now: read depth as the fuel available at each price.",
      panel: {
        title: 'Why the Book Matters',
        lines: [
          'Depth **is** liquidity',
          'Thin book → slippage and fast moves',
          'Thick book → absorbs size; acts as a wall',
          'Big orders are clues (and sometimes bait)'
        ]
      }
    },
    {
      id: 'instruments',
      type: 'CONCEPT',
      say: "One book per instrument. The perpetual swap has its own order book; each dated future — June, September — has its own; every altcoin pair has its own. The unit throughout is contracts. And watch the denomination: a pair like ETH/XBT is priced in Bitcoin, not dollars, so the numbers mean something different. Use the grouping control to bucket prices — 5, 25, 50 — and read the ladder at the zoom level that suits you.",
      panel: {
        title: 'One Book Per Instrument',
        lines: [
          'Perp, each **future**, each pair — separate books',
          'The unit is **contracts**',
          'Check denomination: **ETH/XBT is priced in BTC**',
          '**Grouping** buckets the ladder (5 / 25 / 50)'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the order book shows bids below, asks above, the spread between, and depth as the liquidity at each level — one book per instrument, denominated in that pair's terms. Pair it with the price action and levels you already read, and you get a fuller picture of where the market can move easily and where it'll meet resistance. Next, we open an actual position.",
      panel: {
        title: 'Order Book — Recap',
        lines: [
          'Bids below, asks above, spread between',
          'Depth = liquidity at each price',
          'One book per **instrument**; mind the denomination',
          'Read it alongside price and levels'
        ]
      }
    }
  ]
};
