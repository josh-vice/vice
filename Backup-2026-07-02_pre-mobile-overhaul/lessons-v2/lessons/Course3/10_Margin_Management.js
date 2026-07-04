/* Course3 · 10 — Margin Management                     (v2 lesson)
   Source: the real ETH swing-long continuation (funding, liq creep, the 10-cent miss).
   Charts idealized & ticker-free; the real numbers live in the narration. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/10_margin_management'] = {
  id: 'course3/10_margin_management',
  course: 'Course3_Sharpening_Your_Edge',
  module: '10_Margin_Management',
  title: 'Margin Management',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's finish that swing long and talk about managing margin over a long trade. Extensive journaling showed this setup had an extremely high win rate, and my system said to enter it via the LTE framework — but the exit called for a more hands-on approach than my usual set-and-forget. Here's what happened as the trade progressed.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Margin Management',
        lines: [
          'The swing long, continued',
          'Journal: a **high-win-rate** setup',
          'Exit: hands-on, not set-and-forget'
        ]
      }
    },
    {
      id: 'works-plan',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'plan',
      heading: 'The Original Trade Parameters',
      say: "Recall the plan: entry at $134.83, stop at $124.95, and the original take-profit at $160 — a 2.55 reward-to-risk. The trade was live, sized from my system, with every level predefined. Then, a couple of weeks in, I got an alert one afternoon.",
      show: [
        { kind: 'level', at: 'entry',  label: 'entry', side: 'left', tone: 'reward' },
        { kind: 'level', at: 'stop',   label: 'stop-loss', side: 'left', tone: 'risk' },
        { kind: 'level', at: 'target', label: 'original take-profit', side: 'left', tone: 'target' }
      ]
    },
    {
      id: 'works-play',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'play',
      heading: 'The Trade Blows Through Target',
      say: "Price had broken my original take-profit — and by the time I checked the chart it had blown right through the level and was still trading above it. Two choices: take profit and book a larger-than-expected win, or manage the position and let the winner run. This was a swing trade, so the time horizon let me zoom out and decide.",
      show: [
        { kind: 'marker', at: 'tp',      label: 'tagged the original target', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'runHigh', label: 'blew through — take it, or let it run?', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'cloud',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Zoom Out: a New, Stronger Setup',
      say: "On the two-day timeframe, price was about to close into the Ichimoku cloud — the green light for one of my bread-and-butter setups. I'll save the specifics for the next course, but my journal showed this setup had an even higher win rate. Same entry, same stop — new take-profit of $282, a potential 14.9 R multiple.",
      show: [
        { kind: 'note',   at: 'cloudThick', label: 'the cloud — my system’s green light', place: 'below' },
        { kind: 'marker', at: 'aboveCloud', label: 'trend intact → new target far above', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'creep',
      type: 'CHART',
      chart: 'liquidation',
      stage: 'all',
      heading: 'Funding Makes the Liquidation Creep',
      say: "Then the catch. A perpetual swap has funding periods: every eight hours, a slice of my margin went to short traders to hold the long. As funding ate the margin, my liquidation price crept up — from $122.95 to $126.35, past my $124.95 stop. I took a calculated risk that the trend would outpace the drain, and moved my stop up to my $135 entry — specifically to cover funding if the market reversed.",
      show: [
        { kind: 'level', at: 'entry',     label: 'entry — stop later moved here to cover funding', side: 'left', tone: 'reward' },
        { kind: 'level', at: 'stop',      label: 'original stop — held flat', side: 'left', tone: 'risk' },
        { kind: 'level', at: 'liqSafe',   label: 'liquidation — day one, safely below', side: 'right', tone: 'liq' },
        { kind: 'level', at: 'liqDanger', label: 'liquidation — weeks later, ABOVE the stop', side: 'right', tone: 'liq' }
      ]
    },
    {
      id: 'twist',
      type: 'CONCEPT',
      say: "Price kept trending toward the new target — and missed my limit order by ten cents. The high was $281.90; my sell orders sat at $282. Meanwhile funding turned brutal: at one point over one percent of my notional position per day. I decided I'd milked the position for all it was worth, dropped to a lower timeframe, and exited around $268 via the LTE framework.",
      panel: {
        title: 'The 10-Cent Twist',
        lines: [
          'High: **$281.90** — sells at **$282**',
          'Missed by **ten cents**',
          'Funding: at times **>1% per day**',
          'Exit ~**$268** on a lower timeframe, via LTE'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "The post-mortem: funding ate over twenty percent of my total profits on this trade. Closing at the original target would have paid far less funding — but earned far less too. That's the trade-off you weigh when managing margin over weeks or months. And the rule stands: margin mitigates counterparty risk and capitalizes on your system's edge — it never increases risk. Leverage is irrelevant; it must never affect position size.",
      panel: {
        title: 'Margin Management — Recap',
        lines: [
          'Funding ate **>20%** of the profits',
          'Pay funding vs. exit early — a real trade-off',
          'Right use: counterparty risk + your system’s **edge**',
          'Wrong use: arbitrarily increasing risk',
          '**Leverage never affects position size**'
        ]
      }
    }
  ]
};
