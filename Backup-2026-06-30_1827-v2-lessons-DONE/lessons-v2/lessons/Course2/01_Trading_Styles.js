/* Course2 · 01 — Trading Styles                        (v2 lesson)
   Source provenance (read-only): YouTube (Course2/01_Trading_Styles). */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/01_trading_styles'] = {
  id: 'course2/01_trading_styles',
  course: 'Course2_Building_Your_Toolbox',
  module: '01_Trading_Styles',
  title: 'Trading Styles',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Before we get into trade setups, you need to choose what kind of trader you want to be. We touched on this in timeframe analysis; now let's go deeper into the four trading styles — and the mentality behind each. The goal is to figure out which one fits you, so you can build your tools around it.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Trading Styles',
        lines: [
          'Choose the kind of trader you want to be',
          'Each style has its own **mentality** and setup',
          'Your style decides which tools you’ll build'
        ]
      }
    },
    {
      id: 'four-styles',
      type: 'CONCEPT',
      say: "There are four. Position trading is high-timeframe macro — holding for months as a trend unfolds. Swing trading is similar but a smaller horizon, working the daily and weekly swing points. Day trading takes a position within a single day and closes before the day ends, avoiding overnight risk. And scalping is the lowest timeframe — quick trades, often inside ranges, on minutes and hours.",
      panel: {
        title: 'Four Styles, by Timeframe',
        lines: [
          '**Position** — high-timeframe macro, held for months',
          '**Swing** — daily/weekly swing points',
          '**Day** — in and out within one session',
          '**Scalping** — lowest timeframe, often inside ranges'
        ]
      }
    },
    {
      id: 'position',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'all',
      heading: 'Position Trading — Catch the Macro Trend',
      say: "Here's the position trader's view. On a high timeframe, you find a key macro support, buy near that inflection point, and hold — looking for higher lows and higher highs to carry the trade. It's the true set-and-forget mentality: get in at the right level, then let the trend do the work over weeks and months.",
      show: [ { kind: 'level', at: 'flipLevel', side: 'left', label: 'macro support' },
        { kind: 'marker', at: 'hl1', label: 'macro entry — buy the inflection', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'hh2', label: 'ride the trend', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'scalp',
      type: 'CHART',
      chart: 'range_bound',
      stage: 'all',
      heading: 'Scalping — Work the Range',
      say: "The scalper lives at the other end. On a low timeframe, ranges and consolidation zones are ideal: that ping-pong conversation between buyers at the demand low and sellers at the supply high gives quick, repeatable entries. Small timeframe, small targets, many trades.",
      show: [
        { kind: 'level', at: 'high', label: 'sell — supply', side: 'left' },
        { kind: 'level', at: 'low',  label: 'buy — demand',  side: 'left' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So which trader are you? It comes down to your time, your temperament, and how much risk you'll carry. Position and swing traders think in macro structure; day traders and scalpers work the lower timeframes. There's no single right answer — but knowing your style tells you which tools to master next.",
      panel: {
        title: 'Which Trader Are You?',
        lines: [
          'Match the style to your time and temperament',
          'Macro thinkers → position & swing',
          'Fast hands → day & scalp',
          'Your style points to the tools you’ll build'
        ]
      }
    }
  ]
};
