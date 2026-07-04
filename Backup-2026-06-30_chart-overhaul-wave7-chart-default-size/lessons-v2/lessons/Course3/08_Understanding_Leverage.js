/* Course3 · 08 — Understanding Leverage                (v2 lesson, concept-only) */
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
      say: "So why use it at all? Two reasons. It's capital-efficient — you control a full position while posting only a fraction, freeing the rest. And it mitigates counterparty risk: crypto exchanges can be hacked or go insolvent, so keeping less of your money on the exchange, while still holding your full position, is genuinely safer. Used with discipline, leverage is a risk tool as much as a return tool.",
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
      say: "Finally, two modes you must understand. Isolated margin walls off a set amount of capital for a single position — if it's liquidated, only that margin is lost, and the rest of your account is safe. Cross margin backs the position with your entire balance, which lowers the liquidation risk on that one trade but puts your whole account on the line. Newer traders should almost always start with isolated.",
      panel: {
        title: 'Isolated vs Cross',
        lines: [
          '**Isolated** — only the position’s margin is at risk',
          '**Cross** — your whole balance backs the trade',
          'Cross lowers single-trade liquidation risk…',
          '…but risks the **whole account**. Start isolated.'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So leverage is borrowed buying power that amplifies both sides of the ledger equally. Use it for efficiency and to keep funds off the exchange, never to gamble bigger. Know the difference between isolated and cross, and respect the liquidation price it creates. Next, we apply leverage to real setups and see exactly how that liquidation price is born.",
      panel: {
        title: 'Leverage — Recap',
        lines: [
          'Borrowed buying power — amplifies both sides',
          'Use for efficiency and safety, not to gamble',
          'Know **isolated vs cross**',
          'Respect the **liquidation price**'
        ]
      }
    }
  ]
};
