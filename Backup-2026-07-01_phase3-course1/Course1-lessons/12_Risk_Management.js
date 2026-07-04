/* Course1 · 12 — Risk Management                       (v2 lesson)
   Source provenance (read-only): YouTube g7EEkEWQQI4.
   Idealized, ticker-free trade-setup diagram (no real prices). */
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/12_risk_management'] = {
  id: 'course1/12_risk_management',
  course: 'Course1_Laying_The_Foundation',
  module: '12_Risk_Management',
  title: 'Risk Management',
  source_video: 'g7EEkEWQQI4',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "We saved the most important skill for last: risk management. Technical analysis helps you make money — risk management is what lets you keep it. Think of a poker player: you can be the best at the table, but one reckless all-in can end your night. We don't gamble; we take measured, statistical risks. And the golden rule is this — preservation of capital comes before profitability.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'Risk Management',
        lines: [
          'TA helps you **make** money; risk management helps you **keep** it',
          'Trade like a statistician, not a gambler',
          'Preservation of capital comes **before** profitability'
        ]
      }
    },
    {
      id: 'risk-reward',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'plan',
      heading: 'Risk vs Reward',
      say: "Before any trade, define three prices: your entry, your stop-loss, and your target. The distance from entry to stop is your risk — one unit, one R. The distance from entry to target is your reward. Here the reward is twice the risk: a two-to-one ratio. That ratio, your R R R, is how you decide whether a setup is even worth taking, before you risk a cent.",
      show: [
        { kind: 'level', at: 'entry',  label: 'Entry', side: 'left' },
        { kind: 'level', at: 'stop',   label: 'Stop-loss', side: 'left' },
        { kind: 'level', at: 'target', label: 'Target', side: 'left' },
        { kind: 'zone',  side: 'below', of: 'entry', depth: 5,  tone: 'risk',   label: 'risk = 1R' },
        { kind: 'zone',  side: 'above', of: 'entry', depth: 10, tone: 'reward', label: 'reward = 2R' }
      ]
    },
    {
      id: 'plays-out',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'play',
      heading: 'How It Plays Out',
      say: "Now watch it play out. Price dips toward the stop but never hits it, then runs up and reaches the target — a clean two-R winner. If instead you'd gotten nervous and closed early, your actual result, your R-multiple, would be whatever you really captured. The expected ratio is your plan; the R-multiple is the postmortem.",
      show: [
        { kind: 'marker', at: 'dip', label: 'dips toward stop — never hits', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'tp', label: 'target hit = +2R', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'sizing',
      type: 'CONCEPT',
      say: "Now the part that keeps you alive: position sizing. Your size on any trade is your equity, times the percent you're willing to risk, divided by your stop distance. Keep risk between one and five percent per trade. At one percent, you could lose a hundred trades in a row before going broke — a hundred chances to recover. Go all-in instead, and a single loss can end you. Same setup, completely different survival odds.",
      panel: {
        title: 'Position Sizing',
        lines: [
          'Size = **equity × risk% ÷ stop distance**',
          'Risk **1–5%** per trade — never go all-in',
          'At 1% risk, you’d need 100 losses in a row to bust',
          'Think in **percentages**, not dollar amounts'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "Recap: risk management is your only real defense against going broke — trading without it is just gambling. Position sizing directly shapes your equity curve, so size every trade deliberately. And never forget: we are not fortune tellers. We can't guarantee returns, but we can always define our risk. Do that, and you're one step closer to a profitable system.",
      panel: {
        title: 'Risk Management — Recap',
        lines: [
          'Your only defense against bankruptcy',
          'Position sizing shapes your **equity curve**',
          'Returns are never guaranteed — **risk** always is',
          'Define risk first; the math comes next lesson'
        ]
      }
    }
  ]
};
