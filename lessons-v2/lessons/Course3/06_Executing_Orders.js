/* Course3 · 06 — Executing Orders                      (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/06_executing_orders'] = {
  id: 'course3/06_executing_orders',
  course: 'Course3_Sharpening_Your_Edge',
  module: '06_Executing_Orders',
  title: 'Executing Orders',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now the fun part: actually placing trades. We know the wallet, the order book, and the position view — so let's bring back the three order types and execute them in practice. This is where your analysis finally becomes a live position.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Executing Orders',
        lines: [
          'Turn analysis into a live position',
          'The three order types, in practice',
          'Where the plan meets the market'
        ]
      }
    },
    {
      id: 'placement-plan',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'plan',
      heading: 'Limit & Stop, Placed in Advance',
      say: "Here's the order panel translated onto a chart. A limit buy rests below the market, waiting to fill your long at the exact level you chose — and as a resting order it earns the cheaper maker fee. A stop sits beneath your invalidation, ready to close the trade and cap the loss. Both are placed before anything happens.",
      show: [
        { kind: 'level', at: 'entry',  label: 'limit order — your entry', side: 'left', tone: 'reward' },
        { kind: 'level', at: 'stop',   label: 'stop — invalidation', side: 'left', tone: 'risk' },
        { kind: 'level', at: 'target', label: 'limit — take profit', side: 'left', tone: 'target' },
        { kind: 'zone',  side: 'below', of: 'entry', depth: 5,  tone: 'risk',   label: 'risk' },
        { kind: 'zone',  side: 'above', of: 'entry', depth: 10, tone: 'reward', label: 'reward' }
      ]
    },
    {
      id: 'placement-play',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'play',
      heading: 'Market Now, or Limit at Your Level',
      say: "A market order is different: it fires right now, at the current price — the fastest way in, but you pay the higher taker fee and get no price guarantee. The limit fills only when price comes to your level. Speed costs; patience is paid. Either way, the stop stays underneath, guarding the trade.",
      show: [
        { kind: 'marker', at: 'runHigh', label: 'market — fills now (taker fee)', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'dip',     label: 'limit fills at your level (maker fee)', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'cot',
      type: 'CONCEPT',
      say: "Now the detail that matters most: Close on Trigger. Tick it on every stop-loss — the stop then immediately stops you out at market, and can only ever close your position. Unticked stops open new exposure — right for breakout entries, but on a stop-loss it can be rejected for margin or leave you unprotected, even flipped. For the trigger price, Last — the last traded price — is fastest; Index is a spot composite; Mark is index plus basis.",
      panel: {
        title: 'Close on Trigger & Trigger Prices',
        lines: [
          '**CoT ticked** → immediately stops you out at market',
          'It can **only close** your position — always tick it on stops',
          'Unticked = new exposure — for **breakout entries** only',
          'Forgot it? Your “stop” can leave you **unprotected**',
          'Trigger price: **Last** (fastest) · Index · Mark'
        ]
      }
    },
    {
      id: 'manage',
      type: 'CONCEPT',
      say: "Once orders are live, you manage them. Your resting limit orders sit in the book until filled. Your stop-loss waits at your invalidation. Filled trades populate your order history, and your open position updates in real time. The whole point of pre-placing these orders is that the trade can play out exactly as planned, without you having to react emotionally in the moment.",
      panel: {
        title: 'Managing the Trade',
        lines: [
          'Resting limits wait in the **order book**',
          'The **stop** guards your invalidation',
          'Fills populate your order history',
          'Pre-placed orders remove emotion'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So executing is the order types from earlier, placed on a real chart: market for speed, limit for precision, stop for protection — with Close on Trigger ticked so your stop-loss actually closes you out at market. Entry, invalidation, and target defined before you commit. Next, a quick primer on contract details, which sets up the advanced course.",
      panel: {
        title: 'Executing — Recap',
        lines: [
          'Market = speed, limit = precision, stop = protection',
          'Stop-losses: **Close on Trigger**, ticked',
          'Define entry, invalidation, and target up front',
          'Decisive execution beats hesitation'
        ]
      }
    }
  ]
};
