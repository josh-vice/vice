/* Course1 · 04 — Support and Resistance               (v2 lesson)
   Source provenance (read-only): YouTube jUKafxO9A4Q.
   Diagonal + horizontal S/R, the rule of fives, and the S/R flip. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/04_support_and_resistance'] = {
  id: 'course1/04_support_and_resistance',
  course: 'Course1_Laying_The_Foundation',
  module: '04_Support_and_Resistance',
  title: 'Support and Resistance',
  source_video: 'jUKafxO9A4Q',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now we turn supply and demand into something we can draw: support and resistance, usually shortened to S R. It sits at the centre of technical analysis — almost every indicator and strategy is built on it. The one rule to carry with you: be a buyer at support, and a seller at resistance.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'Support & Resistance',
        lines: [
          'The visual form of supply & demand',
          'At the centre of all technical analysis',
          'Be a **buyer at support**, a **seller at resistance**'
        ]
      }
    },
    {
      id: 'definitions',
      type: 'CONCEPT',
      say: "Let's pin the terms down. Support is where there's excess demand — clear buyers willing to step in at a price. Resistance is where there's excess supply — clear sellers willing to offload at a price. And one warning to remember: the more a level is tested, the weaker it gets, because each test uses up the orders waiting there.",
      panel: {
        title: 'Support vs Resistance',
        lines: [
          '**Support** = excess demand — buyers defend it',
          '**Resistance** = excess supply — sellers cap it',
          'The more a level is tested, the **weaker** it becomes'
        ]
      }
    },
    {
      id: 'diagonal-support',
      type: 'CHART',
      chart: 'trendline_support',
      stage: 'all',
      heading: 'Diagonal Support — a Trendline',
      say: "The first kind of S R is diagonal — a trendline. Here demand keeps stepping in a little higher each time, so the lows line up along a rising line. Connect at least three touches and you have a valid trendline. The best long entries were exactly where price fell back and bounced off it.",
      show: [
        { kind: 'trendline', from: 'touch1', to: 'touch3', style: 'support', label: 'rising support' },
        { kind: 'marker', at: 'touch1', label: 'buy the bounce', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'touch2', label: 'buy the bounce', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'touch3', label: 'buy the bounce', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'diagonal-resistance',
      type: 'CHART',
      chart: 'trendline_resistance',
      stage: 'all',
      heading: 'Diagonal Resistance — a Trendline',
      say: "Flip it and you get diagonal resistance. Supply gets dumped a little lower each time, so the highs line up along a falling line. Again, three touches make it valid. Sellers looked to enter short exactly where price rallied up and tagged that line.",
      show: [
        { kind: 'trendline', from: 'touch1', to: 'touch3', style: 'resistance', label: 'falling resistance' },
        { kind: 'marker', at: 'touch1', label: 'sell the touch', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'touch2', label: 'sell the touch', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'touch3', label: 'sell the touch', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'horizontal',
      type: 'CHART',
      chart: 'horizontal_sr',
      params: { as: 'support' },
      stage: 'all',
      heading: 'Horizontal Support',
      say: "The second kind is horizontal — a flat level price can't seem to breach. Each time price drops to this level, demand steps in and pushes it back up. But remember the warning: every test spends some of the buyers waiting there. This is the rule of fives — by around the fifth touch there's often no one left, and the level finally gives way.",
      show: [
        { kind: 'level',  at: 'level', label: 'horizontal support', side: 'left', tone: 'reward' },
        { kind: 'marker', at: 'touch1', label: '1', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'touch2', label: '2', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'touch3', label: '3 — weaker each test', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'touch4', label: '4', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'touch5', label: '5 — no buyers left', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'breakdown', label: 'level gives way', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'flip-break',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'breakout',
      heading: 'When Resistance Breaks',
      say: "Now the most useful pattern of all. Here's a level acting as resistance — price tests it, gets rejected, tests it again. Then the buyers overwhelm the sellers and price breaks clean above it. The level that capped price for so long has just been broken.",
      show: [
        { kind: 'level',  at: 'level', label: 'resistance', side: 'left' },
        { kind: 'marker', at: 'test1', label: 'rejected', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'test2', label: 'rejected again', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'breakout', label: 'breaks above', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'flip-retest',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      heading: 'Resistance Becomes Support',
      say: "Watch what happens next. Price comes back down to that same level — but now it holds as support, and price launches higher. That's an S R flip: old resistance becoming new support. These flips are gold for traders, because they offer a clean, low-risk entry in the direction of the trend.",
      show: [
        { kind: 'marker', at: 'retest', label: 'old resistance = new support', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'top', label: 'trend continues', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So, the takeaways: support and resistance are the physical picture of supply and demand. They come in two forms, diagonal and horizontal. Their strength depends on the orders behind them, and every test wears them down. Be a buyer at support and a seller at resistance — and learn to spot S R flips in real time. Next up, we'll use all of this to identify trends.",
      panel: {
        title: 'Support & Resistance — Recap',
        lines: [
          'S/R is the picture of supply & demand',
          'Two forms: **diagonal** (trendlines) and **horizontal**',
          'Each test weakens a level — the rule of fives',
          'Watch for **S/R flips** — they’re your entry points'
        ]
      }
    }
  ]
};
