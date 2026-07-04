/* Course3 · 08 — Understanding Leverage                (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/08_understanding_leverage'] = {
  id: 'course3/08_understanding_leverage',
  course: 'Course3_Sharpening_Your_Edge',
  module: '08_Understanding_Leverage',
  title: 'Understanding Leverage',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now the most misunderstood tool in all of trading: leverage. Traditionally, leverage means using borrowed money to invest — a company takes a loan to build a factory, betting the profits beat the cost of the debt. In trading, leverage is your increased buying power when you trade on a margin account. And here's the key word to hold onto: leverage and margin mean essentially the same thing.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Understanding Leverage',
        lines: [
          'The most **misunderstood** tool in trading',
          'Increased buying power via a margin account',
          '**Leverage** and **margin** are used interchangeably'
        ]
      }
    },
    {
      id: 'what',
      type: 'CONCEPT',
      say: "Concretely, leverage lets you take a position larger than your own capital. With ten-to-one leverage, a thousand dollars of margin controls a ten-thousand-dollar position. The trade-off is symmetrical and unforgiving: leverage amplifies your gains and your losses by exactly the same factor. It does not make you more likely to be right — it only makes being right, or wrong, count for more.",
      panel: {
        title: 'What Leverage Actually Does',
        lines: [
          'Take a position **larger** than your capital',
          '10× → $1,000 controls a $10,000 position',
          'It amplifies **gains and losses** equally',
          'It does not improve your odds — only the stakes'
        ]
      }
    },
    {
      id: 'why',
      type: 'CONCEPT',
      say: "So why use it at all? Two reasons. It's capital-efficient — you control a full position while posting only a fraction, freeing the rest for other opportunities. And it mitigates counterparty risk: crypto exchanges can be hacked or go insolvent, so keeping less of your money on the exchange, while still holding your full position, is genuinely safer. Used with discipline, leverage is a risk tool as much as a return tool.",
      panel: {
        title: 'Why Use It',
        lines: [
          '**Capital efficiency** — post a fraction, control the whole',
          '**Counterparty risk** — keep less on the exchange',
          'A tool for managing **risk**, not just chasing return',
          'Only ever with discipline'
        ]
      }
    },
    {
      id: 'iso-cross',
      type: 'CONCEPT',
      say: "Two modes you must understand. Cross margin backs the position with your entire account balance — it suits swing and position traders who may size up as a trade progresses. Isolated margin restricts the leverage to a predefined amount: if the position falls below maintenance, only that margin is liquidated — which is why day traders and scalpers running several positions at once often prefer it. Pros and cons to both; know which your trade calls for.",
      panel: {
        title: 'Cross vs Isolated',
        lines: [
          '**Cross** — full balance backs the trade',
          'Suits **swing/position** traders sizing up',
          '**Isolated** — only the posted margin is at risk',
          'Suits **day traders/scalpers** on multiple assets'
        ]
      }
    },
    {
      id: 'liquidation',
      type: 'CONCEPT',
      say: "Now the ugly word: liquidation, also known as a margin call — the forced closing of your position, triggered when it falls below its maintenance margin requirements. Let me be very clear: liquidations are not, and should never be, a normal part of your trading journey. And as you fold leverage into your system, remember — stop losses are the only defense against liquidations.",
      panel: {
        title: 'Liquidation (Margin Call)',
        lines: [
          'The **forced closing** of a position',
          'Triggers below **maintenance margin** requirements',
          'Never a normal part of trading',
          '**Stop losses are the only defense**'
        ]
      }
    },
    {
      id: 'requirements',
      type: 'CONCEPT',
      say: "How margin is posted. Initial margin is the collateral you must put up to open a leveraged position — on BitMEX's perpetual swap, one percent. Maintenance margin is the equity you must keep to avoid the margin call — half a percent there. You post the sum of the two; fall below maintenance and you're force-closed. And note the risk limit: as your positions grow, the exchange steps those percentages up to protect itself.",
      panel: {
        title: 'Initial vs Maintenance Margin',
        lines: [
          '**Initial** — collateral to open (perp: **1%**)',
          '**Maintenance** — equity to keep (perp: **0.5%**)',
          'Below maintenance → **liquidated**',
          '**Risk limit** — requirements rise with position size'
        ]
      }
    },
    {
      id: 'where',
      type: 'CHART',
      chart: 'liquidation',
      stage: 'all',
      heading: 'Where the Liquidation Price Sits',
      say: "Here's the geometry to internalize. Your entry and your stop define the trade. Leverage decides where the liquidation line sits: keep it low and liquidation sits far below your stop, harmless. Crank it up and the line creeps inside your trade, above your stop — where ordinary noise can force-close you. The rule: your stop must always trigger before your liquidation ever could.",
      show: [
        { kind: 'level', at: 'entry',     label: 'entry', side: 'left', tone: 'reward' },
        { kind: 'level', at: 'stop',      label: 'stop — your real exit', side: 'left', tone: 'risk' },
        { kind: 'level', at: 'liqSafe',   label: 'liquidation — low leverage (safe)', side: 'right', tone: 'liq' },
        { kind: 'level', at: 'liqDanger', label: 'liquidation — high leverage (danger)', side: 'right', tone: 'liq' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So leverage is borrowed buying power that amplifies both sides of the ledger equally. Use it for efficiency and to keep funds off the exchange, never to gamble bigger. Know cross from isolated, initial from maintenance margin, and keep your liquidation price behind your stop — because stops are the only defense. Next, we apply leverage to a real trade I took.",
      panel: {
        title: 'Leverage — Recap',
        lines: [
          'Borrowed buying power — amplifies both sides',
          'Use for efficiency and safety, not to gamble',
          'Cross vs isolated · **initial vs maintenance**',
          'Liquidation behind the stop — **stops are the only defense**'
        ]
      }
    }
  ]
};
