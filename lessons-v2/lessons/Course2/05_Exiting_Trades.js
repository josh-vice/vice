/* Course2 · 05 — Exiting Trades                        (v2 lesson)
   Source provenance (read-only): YouTube (Course2/05_Exiting_Trades). */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/05_exiting_trades'] = {
  id: 'course2/05_exiting_trades',
  course: 'Course2_Building_Your_Toolbox',
  module: '05_Exiting_Trades',
  title: 'Exiting Trades',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Entering well is only half the trade — now let's conclude one. There's no single best way to exit; it depends on the setup and on you. We'll cover three approaches: set-and-forget, trailing stops, and partial take-profits, and leave the choice to your discretion.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Concluding a Trade',
        lines: [
          'Exiting well is half the trade',
          'No single best method — it depends on the setup',
          'Three approaches to know'
        ]
      }
    },
    {
      id: 'set-and-forget',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'play',
      heading: 'Set & Forget',
      say: "The first approach uses the same LTE logic as the entry, in reverse. You predefine a take-profit level — usually a resistance you expect to hold — and place a limit sell there along with your stop. Then you simply walk away and let one of them fill. Set-and-forget forces you to pick a realistic target up front, which makes it great for gathering clean data as a newer trader.",
      show: [ { kind: 'level', at: 'entry', side: 'left', label: 'entry' },
        { kind: 'level', at: 'stop', side: 'left', label: 'stop — the other order that can fill' },
        { kind: 'level',  at: 'target', label: 'take-profit — limit sell at resistance', side: 'left' },
        { kind: 'marker', at: 'tp', label: 'order fills — booked', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'trailing',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'all',
      heading: 'Trailing Stops',
      say: "The second approach is the trailing stop. Instead of a fixed target, you move your stop up behind price as each new higher low forms, locking in profit while the trend holds. Trail it three ways: a fixed dollar distance from price, a fixed percentage, or stepped behind newly established S/R levels. Done well, it captures a much larger R-multiple.",
      show: [
        { kind: 'marker', at: 'hl1', label: 'trail stop up', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'hl2', label: 'and again', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'hh2', label: 'ride the trend', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'partials',
      type: 'CONCEPT',
      say: "The third approach is partial take-profits. Here you reduce your position by a fixed amount at predefined levels — the first barriers where price might stall. It books consistent profit while keeping some exposure to the larger trend. Behind all of this is opportunity cost: your capital is finite, so every trade you stay in is one you can't put elsewhere.",
      panel: {
        title: 'Partial Take-Profits',
        lines: [
          'Trim a fixed % at each barrier or S/R level',
          'Books profit while keeping trend exposure',
          'Remember **opportunity cost** — capital is finite',
          'Weigh staying in vs. the next opportunity'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So: set-and-forget, trailing stops, or partial take-profits. What works beautifully for one trader can frustrate another — it depends on the setup and the kind of trader you choose to be. Your job is to define your rules, test them, and let your own results decide. Next, we deepen the price-action piece with candlestick formations.",
      panel: {
        title: 'Exiting Trades — Recap',
        lines: [
          'Set-and-forget — a predefined limit target',
          'Trailing stop — ride the trend, lock profit behind it',
          'Partials — book some, keep exposure',
          'Define **your** rules, then test them'
        ]
      }
    }
  ]
};
