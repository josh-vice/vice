/* Course2 · 03 — Types of Trades                       (v2 lesson)
   Source provenance (read-only): YouTube (Course2/03_Types_of_Trades). The source
   walked real-ticker replays; here the trade-planning method is idealized. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/03_types_of_trades'] = {
  id: 'course2/03_types_of_trades',
  course: 'Course2_Building_Your_Toolbox',
  module: '03_Types_of_Trades',
  title: 'Types of Trades',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's put the foundation to work and plan an actual trade. Whatever your style, the method is the same: read the structure, find a level worth trading, then define your entry, your risk, and your exit before you click a thing.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Planning a Trade',
        lines: [
          'The method is the same for every style',
          'Read structure → find a level → plan the trade',
          'Entry, risk, and exit — all defined up front'
        ]
      }
    },
    {
      id: 'structure',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'all',
      heading: 'Read the Structure First',
      say: "Start by reading market structure. Here price is making higher highs and higher lows — bullish structure. That alone gives us our bias: we're hunting longs, and we want to buy pullbacks into support, not chase the highs.",
      show: [
        { kind: 'marker', at: 'hl1', label: 'higher low', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'hh1', label: 'higher high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'hh2', label: 'bias = long', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'flip',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      heading: 'Find the Level — an S/R Flip',
      say: "Next, find the level. Here a resistance breaks, and on the way back price retests it as support. That S R flip is our zone: a clear, defined level where buyers should defend if our read is right. This is where we'll look to enter.",
      show: [
        { kind: 'level',  at: 'level', label: 'S/R flip — our level', side: 'left' },
        { kind: 'marker', at: 'retest', label: 'buyers should defend here', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'trigger',
      type: 'CANDLE',
      candle: 'long_lower_wick',
      heading: 'Wait for the Buyers',
      say: "Don't enter blind — wait for the level to prove itself. A long lower wick right at the level is exactly what we want: sellers tried to push lower, buyers slammed it back up. That candle is our green light that demand is present and the level is holding.",
      show: [
        { kind: 'region', of: 'lowerWick', label: 'sellers rejected' },
        { kind: 'region', of: 'body',      label: 'buyers defend the level' }
      ]
    },
    {
      id: 'plan',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'plan',
      heading: 'Plan the Trade',
      say: "Now define the trade. Entry at the level. Stop just below it — if price closes under, our thesis is wrong and we're out for a small, known loss. Target at the next key level above. With risk and reward mapped, we know our ratio before we ever take the trade.",
      show: [
        { kind: 'level', at: 'entry',  label: 'Entry — at the level', side: 'left' },
        { kind: 'level', at: 'stop',   label: 'Stop — invalidation', side: 'left' },
        { kind: 'level', at: 'target', label: 'Target — next level', side: 'left' },
        { kind: 'zone',  side: 'below', of: 'entry', depth: 5,  tone: 'risk',   label: 'risk' },
        { kind: 'zone',  side: 'above', of: 'entry', depth: 10, tone: 'reward', label: 'reward' }
      ]
    },
    {
      id: 'play',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'play',
      heading: 'Let It Play Out',
      say: "And we let it run. Price holds the level, never threatens the stop, and reaches the target. Whether this was a months-long position trade or a same-day swing, the framework was identical — only the timeframe changed.",
      show: [
        { kind: 'marker', at: 'target', label: 'target reached', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "That's the whole method, and it scales to any style — position, swing, day, or scalp. One last tool worth knowing: the trailing stop. As price makes new higher lows, you can ratchet your stop up behind them to lock in profit while you ride the trend. Same plan, just managed actively. Next we'll formalise exactly how we enter.",
      panel: {
        title: 'Types of Trades — Recap',
        lines: [
          'Structure → level → plan, for every style',
          'Define entry, stop (invalidation), and target up front',
          '**Trail your stop** behind new higher lows to lock profit',
          'Only the timeframe changes between styles'
        ]
      }
    }
  ]
};
