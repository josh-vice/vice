/* Course4 · 15 — Heuristics                            (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/15_heuristics'] = {
  id: 'course4/15_heuristics',
  course: 'Course4_Liquidity_Theory',
  module: '15_Heuristics',
  title: 'Heuristics',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Today's tool is Heuristics. Heuristics are problem-solving shortcuts — quick decisions with limited information, which is trading in a nutshell: all we have is price action, and we constantly have to decide long or short. On the chart it isn't coloured candles — it's a moving-average channel of rolling highs and lows, thirty-six periods back by default, drawn over normal candles, plus arrows and exhaustion dots.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Heuristics',
        lines: [
          'Quick decisions with **limited information**',
          'An **MA channel** over normal candles',
          'Lookback **36** by default — adjustable',
          'Plus arrows and **exhaustion dots**'
        ]
      }
    },
    {
      id: 'channel',
      type: 'CHART',
      chart: 'heuristics',
      stage: 'ride',
      heading: 'The Channel Is the Bias',
      say: "The channel is your informed decision-making bias. Price above the channel: we're likely in an uptrend — look for longs. Below it: likely a downtrend — hold back on longs. And this stretch, price riding along the channel, is the meat of the trend — exactly what the tool is built to catch. It won't call the top and it won't call the bottom; it wants the middle, where the money is.",
      show: [
        { kind: 'marker', at: 'meat', label: 'riding the channel — the meat of the trend', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'dots',
      type: 'CHART',
      chart: 'heuristics',
      stage: 'ride',
      heading: 'Exhaustion Dots',
      say: "Riding it, riding it — and then a red dot. Red dots mark buyer exhaustion into a top: the push is running out of steam, so this is a spot to take some profit. Green dots are the mirror — seller exhaustion into a bottom. Just like in the PAL tool, exhaustion flags take-profit spots and potential inflection points, not automatic reversal trades.",
      show: [
        { kind: 'marker', at: 'redDot', label: 'red dot — buyer exhaustion', style: 'sweep', place: 'above' }
      ]
    },
    {
      id: 'flip',
      type: 'CHART',
      chart: 'heuristics',
      stage: 'flip',
      heading: 'Losing the Channel',
      say: "Then the tell: price breaks down and loses the channel. The bias flips — below the channel we're likely in a downtrend, so longs go back on the shelf. The move runs until a green dot prints into the bottom: seller exhaustion, the take-profit spot on shorts and an early warning that an inflection may be near.",
      show: [
        { kind: 'marker', at: 'breakdown', label: 'price loses the channel — bias flips', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'greenDot', label: 'green dot — seller exhaustion', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'reentry',
      type: 'CHART',
      chart: 'heuristics',
      stage: 'all',
      heading: 'Back Above',
      say: "When price reclaims the channel and rides it again, the bias turns long once more. That's the whole loop: channel for direction, dots for profit-taking. Play with the moving-average type — exponential, Hull, T3 — and the lookback, from a fast five to a slow two hundred, and see what fits your system: fewer false positives, or faster signals.",
      show: [
        { kind: 'marker', at: 'reEntry', label: 'back above the channel — bias turns long', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So Heuristics tells you the current trend's likely direction — and it can still be wrong. Don't blindly go long or short off the signal; use it in conjunction with your S/R levels and the rest of your system. Ride the meat, take profit at the dots, stay on the right side of the market. Next, a tool that reads the market through volume: the FSVZO.",
      panel: {
        title: 'Heuristics — Recap',
        lines: [
          'Channel position = trend **bias**',
          'Ride the **meat** — not tops or bottoms',
          'Dots = **take-profit** spots',
          'It can be wrong — confirm with your system',
          'Next: the FSVZO'
        ]
      }
    }
  ]
};
