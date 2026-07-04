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
      say: "A market order is exactly what it sounds like: buy or sell immediately, right now, at whatever the market price happens to be. It guarantees you get filled — but it does not guarantee your price, because fast markets can run away from you. A limit order is the opposite trade-off: you set a specific price, and it only fills if the market reaches it. You guarantee your price, but not the fill.",
      panel: {
        title: 'Market vs Limit',
        lines: [
          '**Market** — fills now, but **price not guaranteed**',
          '**Limit** — your price guaranteed, but **fill not guaranteed**',
          'Speed vs. precision — pick per situation'
        ]
      }
    },
    {
      id: 'placing',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'play',
      heading: 'Where Your Orders Sit',
      say: "Picture it on a chart. With price here, you'd place a limit buy below the current price, at the level where you actually want in. Below that sits your stop — a stop-loss order that closes the trade if price falls through your invalidation. And above, a limit sell waits at your take-profit. Three orders, each at a deliberate price, define the whole trade before it happens.",
      show: [
        { kind: 'level', at: 'entry',  label: 'limit buy — your entry', side: 'left', tone: 'reward' },
        { kind: 'level', at: 'stop',   label: 'stop-loss', side: 'left', tone: 'risk' },
        { kind: 'level', at: 'target', label: 'limit sell — take profit', side: 'left', tone: 'target' },
        { kind: 'zone',  side: 'below', of: 'entry', depth: 5,  tone: 'risk',   label: 'risk' },
        { kind: 'zone',  side: 'above', of: 'entry', depth: 10, tone: 'reward', label: 'reward' },
        { kind: 'marker', at: 'dip',     label: 'limit buy fills here', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'tp',      label: 'limit sell fills at target', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'stops',
      type: 'CONCEPT',
      say: "A quick word on stops, because they save accounts. A stop order triggers once price hits a chosen level — a stop-loss uses that to cap your downside automatically, no emotion required. The big idea: combine these. Limit in at your level, a stop just beyond your invalidation, and a limit out at your target. Now the trade runs itself, exactly as you planned it.",
      panel: {
        title: 'Stops — Your Safety Net',
        lines: [
          'A **stop** triggers an order at a chosen level',
          'A **stop-loss** caps your downside automatically',
          'Combine: limit in · stop below · limit out',
          'The trade then runs itself'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So: market orders for speed, limit orders for precision, and stops for protection. Master where each one sits relative to price and you can execute any setup cleanly and without hesitation. Next, we look at how to fund an exchange — depositing and withdrawing.",
      panel: {
        title: 'Order Types — Recap',
        lines: [
          'Market = speed; limit = precision; stop = protection',
          'Place each at a deliberate price',
          'Pre-define the trade, then let it run',
          'Execution turns analysis into results'
        ]
      }
    }
  ]
};
