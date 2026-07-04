/* Course3 · 09 — Applying Leverage                     (v2 lesson)
   Source walked a real ETH swing trade; idealized here, ticker-free. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/09_applying_leverage'] = {
  id: 'course3/09_applying_leverage',
  course: 'Course3_Sharpening_Your_Edge',
  module: '09_Applying_Leverage',
  title: 'Applying Leverage',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's apply leverage to a real swing trade, start to finish, using the LTE framework from Course Two. I'll show you how leverage played its role — not as a way to bet bigger, but as a tool for sizing and capital efficiency on a setup I knew well.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Applying Leverage',
        lines: [
          'A full swing trade via the **LTE** framework',
          'Leverage as a **sizing** tool, not a bigger bet',
          'Level → trigger → entry → manage'
        ]
      }
    },
    {
      id: 'setup',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      heading: 'The LTE Setup',
      say: "The level was a preliminary support that had flipped to resistance, then got reclaimed. The trigger came weeks later as a bullish engulfing candle on the daily. Rather than chase, I waited for a pullback into a higher low and entered there — stop below the reclaimed level, target up at the range high, a clean 2.5-to-1 reward-to-risk.",
      show: [
        { kind: 'level',  at: 'level', label: 'reclaimed level', side: 'left' },
        { kind: 'marker', at: 'retest', label: 'enter the pullback (higher low)', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'top', label: 'target = range high', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'liquidation',
      type: 'CHART',
      chart: 'liquidation',
      stage: 'all',
      heading: 'Leverage & the Liquidation Price',
      say: "Here's the part most traders get wrong. Leverage creates a liquidation price — the level where the exchange force-closes you. Size it conservatively and that line sits far below your stop, harmless. Crank the leverage up and it creeps right under your entry. Watch: price dipped here. A low-leverage trader's liquidation was safely down here, untouched, and they caught the rally. An over-leveraged trader was liquidated on the wick and missed the whole move.",
      show: [
        { kind: 'level',  at: 'entry', label: 'entry', side: 'left' },
        { kind: 'level',  at: 'liqDanger', label: 'liquidation — high leverage', side: 'right' },
        { kind: 'level',  at: 'liqSafe', label: 'liquidation — low leverage', side: 'right' },
        { kind: 'marker', at: 'dip', label: 'the dip', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'top', label: 'low-leverage survives → rallies', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'sizing',
      type: 'CONCEPT',
      say: "So the lesson on sizing is this: your risk is set by your stop distance and your risk percentage — never by your leverage. Leverage only decides how much margin you post and where your liquidation sits. Size from your system's risk per trade, keep your effective leverage low enough that a normal wick can't liquidate you, and leverage becomes a quiet efficiency tool instead of a loaded gun.",
      panel: {
        title: 'Sizing With Leverage',
        lines: [
          'Risk = stop distance × risk % — **not** leverage',
          'Leverage sets your margin and **liquidation price**',
          'Keep effective leverage low — survive the wicks',
          'A tool for efficiency, not a bigger gamble'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "To recap: I built the trade with LTE, sized it from my journaled risk, and used leverage only for efficiency — keeping the liquidation price far from the action. The setup played out exactly as planned. Next, we manage the trade once it's deep in profit: margin management.",
      panel: {
        title: 'Applying Leverage — Recap',
        lines: [
          'Build the trade with LTE; size from your system',
          'Leverage for efficiency, liquidation kept far away',
          'Survive the noise to capture the move',
          'Next: managing a winning trade'
        ]
      }
    }
  ]
};
