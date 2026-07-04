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
      id: 'placement',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'plan',
      heading: 'Limit, Market & Stop in Practice',
      say: "Here's the order panel translated onto a chart. A market order fires right now at the current price — instant, but no price guarantee. A limit order rests below, waiting to fill your long at the exact level you chose. And a stop sits beneath your invalidation, ready to close the trade and cap the loss. You set all three, and the exchange handles the rest.",
      show: [
        { kind: 'level', at: 'entry',  label: 'limit order — your entry', side: 'left' },
        { kind: 'level', at: 'stop',   label: 'stop — invalidation', side: 'left' },
        { kind: 'level', at: 'target', label: 'limit — take profit', side: 'left' },
        { kind: 'zone',  side: 'below', of: 'entry', depth: 5,  tone: 'risk',   label: 'risk' },
        { kind: 'zone',  side: 'above', of: 'entry', depth: 10, tone: 'reward', label: 'reward' }
      ]
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
      say: "So executing is just the order types from earlier, placed on a real chart: market for speed, limit for precision, stop for protection — entry, invalidation, and target all defined before you commit. Get comfortable here and you can act decisively when a setup appears. Next, a quick primer on contract details, which sets up the advanced course.",
      panel: {
        title: 'Executing — Recap',
        lines: [
          'Market = speed, limit = precision, stop = protection',
          'Define entry, invalidation, and target up front',
          'Then manage from the positions view',
          'Decisive execution beats hesitation'
        ]
      }
    }
  ]
};
