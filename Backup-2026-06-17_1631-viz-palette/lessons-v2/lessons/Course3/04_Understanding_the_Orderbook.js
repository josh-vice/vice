/* Course3 · 04 — Understanding the Order Book          (v2 lesson, concept-only) */
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
      id: 'recap',
      type: 'CONCEPT',
      say: "So the order book shows bids below, asks above, the spread between, and depth as the liquidity at each level. Pair it with the price action and levels you already read, and you get a fuller picture of where the market can move easily and where it'll meet resistance. Next, we open an actual position.",
      panel: {
        title: 'Order Book — Recap',
        lines: [
          'Bids below, asks above, spread between',
          'Depth = liquidity at each price',
          'Thin = slippage; thick = a wall',
          'Read it alongside price and levels'
        ]
      }
    }
  ]
};
