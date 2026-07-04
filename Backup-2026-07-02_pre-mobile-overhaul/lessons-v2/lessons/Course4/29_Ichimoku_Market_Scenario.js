/* Course4 · 29 — Ichimoku Market Scenario             (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/29_ichimoku_market_scenario'] = {
  id: 'course4/29_ichimoku_market_scenario',
  course: 'Course4_Liquidity_Theory',
  module: '29_Ichimoku_Market_Scenario',
  title: 'Ichimoku Market Scenario',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's take the nuances live, on real Bitcoin charts. Notice what we're hunting: not trend-following entries, but counter-trend inflections — the spots where an overextended move is due its mean reversion. An E2E called a macro bottom, a Kijun rejection faded a violent dump, and a weekly kumo pocket topped a huge run. Get in early at the inflection, then ride the meat of the trend.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Ichimoku — Live Scenarios',
        lines: [
          'Hunting **counter-trend inflections**, not trend entries',
          'E2E at the **macro bottom**',
          'A **Kijun rejection** after a dump',
          'A **weekly kumo pocket** short'
        ]
      }
    },
    {
      id: 'watch',
      type: 'CHART',
      chart: 'ichimoku_e2e',
      stage: 'prereq',
      heading: 'The Bottom — Waiting on Prereqs',
      say: "First, the Bitcoin bottom near $3,000. No guessing — we let the prerequisites arrive. Price based for months, a C-clamp partially resolved, and on February 28th the weak TK crossover finally printed with the chikou span clear of price: trending, not ranging. Our chart draws the short-side geometry; at the bottom this exact checklist green-lit the long mirror.",
      show: [
        { kind: 'marker', at: 'tkCross', label: 'weak TK cross — Feb 28', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'chikouRef', label: 'chikou clear of price', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'greenlit',
      type: 'CHART',
      chart: 'ichimoku_e2e',
      stage: 'entry',
      heading: 'Green-Lit at the Bottom',
      say: "A clean close inside the cloud activated the E2E. Entry came around $3,900 — or $3,950 via the LTE method: the $3,800 S/R flip as the level, a bullish engulfing off it as the trigger. Stop below the cloud near $3,600, target the far edge at roughly $4,900 — about three and a half R on a high-probability setup.",
      show: [
        { kind: 'note',  at: 'entryClose', label: 'clean close inside the kumo → green light', place: 'below' },
        { kind: 'level', at: 'stop', label: 'invalidation — outside the cloud', side: 'right', tone: 'stop' }
      ]
    },
    {
      id: 'run',
      type: 'CHART',
      chart: 'ichimoku_e2e',
      stage: 'all',
      heading: 'Edge to Edge — Then Again',
      say: "Price traversed the cloud and tagged the target. Then the zoom-out: on the two-day, a second E2E had green-lit — weak TK cross, chikou well above price, close inside the cloud — with edges up at $5,500 and $5,800. That one completed too, followed by a full kumo breakout. A macro trend reversal, led from the front by the edge-to-edge.",
      show: [
        { kind: 'level', at: 'edgeFar', label: 'target — far edge', side: 'right', tone: 'target' },
        { kind: 'note',  at: 'exit', label: 'E2E complete', place: 'below' }
      ]
    },
    {
      id: 'kijun',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Kijun Rejection at $7,260',
      say: "Scenario two. After a really ambitious dump, the Kijun flattened out at $7,260 — the mean reversion of that whole move. Asks rested right at the line, stop just beyond it. Price rallied back, tapped the Kijun, and rejected for a quick one-hour R multiple. Our chart shows the bullish mirror of the same play — the identical tap-and-react at the mean.",
      show: [
        { kind: 'level', at: 'kijunLevel', label: 'Kijun — the mean of the move', side: 'left', tone: 'support' },
        { kind: 'note',  at: 'pullback', label: 'tap → sharp reaction', place: 'below' },
        { kind: 'level', at: 'kijunStop', label: 'risk just beyond the Kijun', side: 'right', tone: 'stop' }
      ]
    },
    {
      id: 'pocket',
      type: 'CHART',
      chart: 'ichimoku_pocket',
      stage: 'approach',
      heading: 'The Weekly Pocket',
      say: "Scenario three: a massive run-up, higher highs and higher lows, and we want an upside level to sell into. Zoom out to the weekly and there it is — as textbook a kumo pocket as you'll find, sitting overhead around $9,200 to $9,500. Our chart draws the mirrored, support-side pocket; same object either way: untested cloud S/R, high-time-frame context for low-time-frame trades.",
      show: [
        { kind: 'level', at: 'pocketTop', label: 'weekly kumo pocket — top', side: 'left', tone: 'gold' },
        { kind: 'level', at: 'pocketBot', label: 'weekly kumo pocket — bottom', side: 'left', tone: 'gold' }
      ]
    },
    {
      id: 'firsttest',
      type: 'CHART',
      chart: 'ichimoku_pocket',
      stage: 'test',
      heading: 'First Test — Asks In',
      say: "Price ran into the pocket for its very first test and rejected — depletion factor at full strength, exactly like an untested supply zone. The play: asks spread from $9,200 to $9,500, stop beyond the swing high, targets managed on the lower time frames as the rejection confirmed.",
      show: [
        { kind: 'marker', at: 'firstTest', label: 'first test — strongest reaction', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'hns',
      type: 'CHART',
      chart: 'head_and_shoulders',
      stage: 'all',
      heading: 'Confluence — H&S at the Pocket',
      say: "Drop to the lower time frames and price built a head and shoulders right at that weekly pocket — classical charting and Ichimoku pointing at the same level. The neckline break projected a measured target around $8,500, and it landed right on the money. High-time-frame pocket for the bias, low-time-frame pattern for the trigger.",
      show: [
        { kind: 'marker', at: 'head', label: 'head — at the weekly pocket', style: 'dot', place: 'above' },
        { kind: 'level',  at: 'neckline', label: 'neckline', side: 'left', tone: 'resistance' },
        { kind: 'level',  at: 'target', label: 'measured target', side: 'right', tone: 'target' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "Three live inflections: an E2E that led a macro bottom, a Kijun rejection that faded a dump, and a weekly pocket short confirmed by a head and shoulders. Kijun bounces, C-clamps, kumo pockets, and the edge-to-edge give you an abundance of strategies — just don't trade ranges with Ichimoku. Craft the system that fits you. Next: wrapping up the entire curriculum.",
      panel: {
        title: 'Scenarios — Recap',
        lines: [
          'E2E → called the **macro bottom** (then the 2-day E2E)',
          'Kijun tap = **mean reversion** after an impulse',
          'Pocket + **H&S** = confluence short',
          '**Trends only** — never range-trade Ichimoku'
        ]
      }
    }
  ]
};
