/* Course4 · 17 — Crayons                               (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/17_crayons'] = {
  id: 'course4/17_crayons',
  course: 'Course4_Liquidity_Theory',
  module: '17_Crayons',
  title: 'Crayons',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now we move into the premium indicators, starting with Crayons, developed by In Silico. Think of it as a robust hybrid: it takes the best of both the Trend Buddy and the PAL tool. From PAL it inherits the dynamic levels; from Trend Buddy, the colour-coded trend — and the trend-following side is where its real strength lives.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Crayons',
        lines: [
          'A premium tool by **In Silico**',
          'A hybrid of **Trend Buddy + PAL**',
          'Levels from PAL · colours from Trend Buddy',
          'Its strength: **trend following**'
        ]
      }
    },
    {
      id: 'levels',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'crayons' },
      stage: 'all',
      heading: 'The Levels Side',
      say: "Toggle the levels input and Crayons draws its dynamic support, resistance and pivot points — the PAL system carried over — and you can overlay them no matter the timeframe being analysed. Price keeps reacting to the same lines, so you can spot S/R flips in real time: a level breaks, flips, and becomes the floor or ceiling for the next leg.",
      show: [
        { kind: 'level', at: 'resLevel', label: 'dynamic resistance', side: 'left' },
        { kind: 'level', at: 'supLevel', label: 'dynamic support', side: 'left' },
        { kind: 'marker', at: 'resTouch2', label: 'the same line, reacted to again', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'trend',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'crayons' },
      stage: 'all',
      heading: 'The Crayon Colours',
      say: "Now the crayons. Lime green means a strong uptrend has been detected — and the aim is to get in on the first or second green candle close, then ride the meat of the trend. Red is the strong downtrend, same rule mirrored: in within one or two candles of the start. Grey means no discernible trend — a point of information, not action; reversal or continuation is for the trends to decide.",
      show: [
        { kind: 'marker', at: 'flipDown1', label: 'crayon turns red — strong downtrend', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'flipUp1', label: 'crayon turns lime — strong uptrend detected', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'pivots',
      type: 'CONCEPT',
      say: "Around the trend colours sits a richer palette. Orange is the bearish pivot: its high and low become support and resistance, and it's a potential profit-taking candle on longs — price breaks below it, get out and reassess; breaks above, move stops up and let the trend run. Yellow is bullish exhaustion — buyers drying up after a climb: take some profit. Turquoise is bearish exhaustion — sellers drying up: watch for a pullback or a full reversal.",
      panel: {
        title: 'Pivots and Exhaustion',
        lines: [
          '**Orange** — bearish pivot: high/low = S/R, TP longs',
          '**Yellow** — bullish exhaustion: buyers dry up',
          '**Turquoise** — bearish exhaustion: sellers dry up',
          'Early warnings — not guaranteed reversals'
        ]
      }
    },
    {
      id: 'letters',
      type: 'CONCEPT',
      say: "The blues carry a confidence hierarchy: blue is the unconfirmed reversal — high risk, high reward, within a bar or two of the low — and dark blue a weaker one; the darkness of the hue shows the confidence. Dark green and purple are the one-candle flips — bullish breakout, bearish breakdown. Then the letters: W is a rejection from the upside, H a potential local top, B a confirmed reversal — after which continuation is rather likely.",
      panel: {
        title: 'Hierarchy and Letters',
        lines: [
          '**Blue** unconfirmed · **dark blue** weaker — hue = confidence',
          '**Dark green** breakout · **purple** breakdown — one candle',
          '**W** upside rejection · **H** potential local top',
          '**B** confirmed reversal → continuation likely'
        ]
      }
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "Settings matter. The H sensitivity is adjustable — there's no magic value that catches every local top, so backtest and see what makes sense to you. Same with the smooth input: disable it and you get more signals but more false positives. An indicator is only as good as the trader who uses it — keep Crayons as confluence with your structure, on any timeframe you trade.",
      panel: {
        title: 'Make It Yours',
        lines: [
          'H sensitivity — **no magic setting**; backtest it',
          'Smooth off = more signals, more false positives',
          'Only as good as the trader using it',
          'Confluence with your structure — any timeframe'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So Crayons merges Trend Buddy's colour vocabulary with PAL's dynamic levels, adds the exhaustion crayons and the W-H-B letters, and hands you the first-or-second-green-close entry for fresh trends. A powerful one-glance read — kept in its place as confluence. Next, the tool that's eerily good at momentum on the low timeframes: Genie.",
      panel: {
        title: 'Crayons — Recap',
        lines: [
          'Trend colours + dynamic levels, combined',
          'Enter on the **first or second green close**',
          'W/H/B letters + exhaustion crayons',
          'Next: the Genie indicator'
        ]
      }
    }
  ]
};
