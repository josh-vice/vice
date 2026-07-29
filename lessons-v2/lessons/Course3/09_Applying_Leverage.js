/* Course3 · 09 — Applying Leverage                     (v2 lesson)
   Source walked a real ETH swing trade; charts idealized & ticker-free, the
   real numbers (entry 134.83 / stop 124.95 / TP 160 / liq 122.90) live in the narration. */
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
      id: 'setup-trigger',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'breakout',
      heading: 'The LTE Setup — Level & Trigger',
      say: "The level was an important preliminary support that had turned resistance. It wasn't until early March that a valid trigger appeared on the daily timeframe — a bullish engulfing candle that broke and reclaimed the level. Level marked, trigger fired. Now for the entry.",
      show: [
        { kind: 'level',  at: 'level', label: 'preliminary support → resistance', side: 'left', tone: 'support' },
        { kind: 'marker', at: 'breakout', style: 'reversal', place: 'below', label: 'trigger — bullish engulfing, reclaims the level' }
      ]
    },
    {
      id: 'setup-entry',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      heading: 'The LTE Setup — Entry',
      say: "Rather than chase, I waited patiently for a pullback into a higher low and entered there: long at $134.83, stop below the reclaimed level at $124.95, take-profit at the high of the trading range — $160 even. That's a 2.55 reward-to-risk on a setup I'm all too familiar with.",
      show: [
        { kind: 'marker', at: 'entry', label: 'entry — the pullback higher low', style: 'reversal', place: 'below' },
        { kind: 'level',  at: 'stop', label: 'stop — below the reclaimed level', side: 'right', tone: 'stop' },
        { kind: 'level',  at: 'target', label: 'target — the range high', side: 'right', tone: 'target' }
      ]
    },
    {
      id: 'liq-levels',
      type: 'CHART',
      chart: 'liquidation',
      stage: 'all',
      heading: 'Leverage & the Liquidation Price',
      say: "Now, leverage. With the stop just shy of $125, I could use any amount of leverage — as long as the liquidation price stayed below my stop. At ten-x, liquidation sat at $122.90, nearly two dollars beneath the stop: safe. Keep your leverage low and that line sits far below your stop, harmless. If your liquidation would trigger before your stop, you're using too much leverage and trading outside your risk parameters.",
      show: [
        { kind: 'level', at: 'entry', label: 'entry', side: 'left', tone: 'reward' },
        { kind: 'level', at: 'stop', label: 'stop — must trigger first', side: 'left', tone: 'stop' },
        { kind: 'level', at: 'liqSafe', label: 'liquidation — sane leverage', side: 'right', tone: 'liq' },
        { kind: 'level', at: 'liqDanger', label: 'liquidation — too much leverage', side: 'right', tone: 'liq' }
      ]
    },
    {
      id: 'liq-wick',
      type: 'CHART',
      chart: 'liquidation',
      stage: 'all',
      heading: 'The Wick Decides Who Survives',
      say: "Watch what a routine dip does. Price wicks down without ever reaching the stop. The trader whose liquidation sat safely below keeps the position and catches the rally. The over-leveraged trader — liquidation parked above the stop — is force-closed on the wick and misses the whole move. Same setup, same analysis; only the leverage differed.",
      show: [
        { kind: 'marker', at: 'dip', label: 'the dip', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'liqFire', label: 'over-leveraged — liquidated on the wick', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'top', label: 'sane leverage survives → rallies', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'sizing',
      type: 'CONCEPT',
      say: "Here's the real sizing math. Portfolio: 200 Bitcoin. My journal said this setup warranted 3.7% risk — about 7.5 Bitcoin — which worked out to 750,000 contracts. Unleveraged, that needed 101 Bitcoin of collateral, over half the portfolio; at ten-x I posted about 10 instead. Nothing else changed — same size, same risk. The misuse? Believing ten-x means ten times the position: that turns 3.7% into 37% risk — 74 Bitcoin, over a third of the portfolio on one trade.",
      panel: {
        title: 'Sizing With Leverage — the Real Numbers',
        lines: [
          'Portfolio **200 BTC** · journaled risk **3.7%**',
          'Position: **750,000 contracts**',
          'Margin: **101 BTC** unleveraged → **~10 BTC** at 10×',
          'Same size, same risk — only the **collateral** changed',
          'Misuse: 10× the size → **37% risk (74 BTC)**'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "To recap: I built the trade with LTE, sized it from my journaled risk, and used leverage only to post less collateral — keeping the liquidation price safely behind the stop. Leverage never touches position size; risk is set by your stop distance and risk percentage. How the trade actually resolved — including a twist — is next: margin management.",
      panel: {
        title: 'Applying Leverage — Recap',
        lines: [
          'Build with LTE; size from your **journal**',
          'Leverage = less collateral, **never more size**',
          'Liquidation stays behind the stop',
          'Next: how the trade resolved — with a twist'
        ]
      }
    }
  ]
};
