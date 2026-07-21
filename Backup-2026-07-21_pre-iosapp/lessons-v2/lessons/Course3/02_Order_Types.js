/* Course3 · 02 — Order Types                           (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/02_order_types'] = {
  id: 'course3/02_order_types',
  course: 'Course3_Sharpening_Your_Edge',
  module: '02_Order_Types',
  title: 'Order Types',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "We've covered styles, the LTE method, and reading setups — but not the execution itself: how you actually get into a trade, out of it, and where your stop lives. That comes down to order types. Let's start with the three you'll use constantly: market orders, limit orders, and stops.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Order Types',
        lines: [
          'The **execution** piece of trading',
          'How you enter, exit, and place stops',
          'Three core types: market, limit, stop'
        ]
      }
    },
    {
      id: 'market-limit',
      type: 'CONCEPT',
      say: "A market order buys or sells immediately, at whatever the market price is. You're guaranteed the fill — but not the price, because fast markets can run away from you. A limit order is the opposite trade-off: a limit buy rests below the market, a limit sell above, and it only fills if price reaches it. Your price is guaranteed; the fill is not.",
      panel: {
        title: 'Market vs Limit',
        lines: [
          '**Market** — fills now, but **price not guaranteed**',
          '**Limit** — your price guaranteed, but **fill not guaranteed**',
          'Limit **buy below** market · limit **sell above**',
          'Speed vs. precision — pick per situation'
        ]
      }
    },
    {
      id: 'placing-plan',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'plan',
      heading: 'Where Your Orders Sit',
      say: "Picture it on a chart. You place a limit buy below the current price, at the level where you actually want in. Below that sits your stop — the order that closes the trade if price falls through your invalidation. And above, a limit sell waits at your take-profit. Three orders, each at a deliberate price, define the whole trade before it happens.",
      show: [
        { kind: 'level', at: 'entry',  label: 'limit buy — your entry', side: 'left', tone: 'reward' },
        { kind: 'level', at: 'stop',   label: 'stop-loss', side: 'left', tone: 'risk' },
        { kind: 'level', at: 'target', label: 'limit sell — take profit', side: 'left', tone: 'target' },
        { kind: 'zone',  side: 'below', of: 'entry', depth: 5,  tone: 'risk',   label: 'risk' },
        { kind: 'zone',  side: 'above', of: 'entry', depth: 10, tone: 'reward', label: 'reward' }
      ]
    },
    {
      id: 'placing-play',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'play',
      heading: 'The Orders Do the Work',
      say: "Watch it play out. Price dips into your limit buy and fills you at your level; the shakeout that follows never reaches the stop, so it survives. Then the market turns, runs up, and your limit sell fills at the target. The trade executed itself, exactly as planned — no emotion required.",
      show: [
        { kind: 'marker', at: 'dip', label: 'shakeout — stop survives', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'tp',  label: 'limit sell fills at target', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'stops',
      type: 'CONCEPT',
      say: "Now stops, because they save accounts. A stop is a two-part order: a trigger price that, once reached, fires a market or limit order. A stop sell triggers below the market — commonly closing longs — while a stop buy triggers above it, useful for breakout entries. Used as a stop-loss, it defines your risk and invalidation on any position, long or short. Trading without stop losses is gambling.",
      panel: {
        title: 'Stops — Your Safety Net',
        lines: [
          'Two parts: a **trigger** → fires a market/limit order',
          '**Stop sell** triggers below market · **stop buy** above',
          'The stop-loss defines your **risk & invalidation**',
          'Without stops, it’s **gambling**'
        ]
      }
    },
    {
      id: 'fees',
      type: 'CONCEPT',
      say: "One more difference: fees. A resting limit order is visible in the order book — you're providing liquidity, which makes you a maker, and exchanges charge makers less. A market order takes liquidity out of the book — that's a taker order, and it costs more. Same trade, different fee. Favouring limits quietly compounds in your favour.",
      panel: {
        title: 'Maker vs Taker',
        lines: [
          '**Limit** rests in the book → provides liquidity → **maker**',
          '**Market** removes liquidity → **taker**',
          'Maker fees are **lower** than taker fees',
          'Favouring limits minimizes your costs'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So: market orders for speed at a taker fee, limit orders for precision at a maker fee, and stops — the two-part trigger orders — for protection. Define your risk, entry, and exit with them on every trade, because without stop losses it's gambling. Next, we look at how to fund an exchange — depositing and withdrawing.",
      panel: {
        title: 'Order Types — Recap',
        lines: [
          'Market = speed (**taker**) · limit = precision (**maker**)',
          'Stop = trigger → market/limit order',
          'Stops define risk — **no stops = gambling**',
          'Execution turns analysis into results'
        ]
      }
    }
  ]
};
