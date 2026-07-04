/* Course2 · 09 — Volume Examples                       (v2 lesson)
   Source provenance (read-only): YouTube (Course2/09_Volume_Examples). The source
   walked a real TSLA chart; here the volume reads are idealized, ticker-free. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/09_volume_examples'] = {
  id: 'course2/09_volume_examples',
  course: 'Course2_Building_Your_Toolbox',
  module: '09_Volume_Examples',
  title: 'Volume Examples',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's see volume do its job. The routine is the same as always: mark your support and resistance first, then turn on volume. What looks like a plain breakout on the price chart alone becomes a confident yes-or-no once you can see the conviction behind it.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Volume in Action',
        lines: [
          'Mark your levels first — then add volume',
          'Volume shows the **conviction** behind a move',
          'It turns a maybe into a yes or a no'
        ]
      }
    },
    {
      id: 'breakout',
      type: 'CHART',
      chart: 'consolidation_breakout',
      params: { dir: 'up', volume: true },
      stage: 'breakout',
      heading: 'Low-Volume Range → High-Volume Breakout',
      say: "Here's a consolidation under a resistance level. Notice the volume in the panel below: it's low and flat while price chops sideways — that's a quiet, indecisive range, nobody committed. Then price breaks the level, and the volume bar explodes. That spike is your confirmation: real buyers showed up and the breakout has teeth.",
      show: [
        { kind: 'level',  at: 'rangeHigh', label: 'resistance', side: 'left' },
        { kind: 'marker', at: 'breakout', label: 'breakout on a volume spike', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'confirm',
      type: 'CONCEPT',
      say: "This is the whole point. With volume off, that breakout looked identical to a dozen fakeouts. With volume on, the expansion confirmed buyers stepped in with force. Flip it around: a breakout on low, limp volume is exactly the kind that snaps back and traps people. Volume is your lie-detector for breakouts.",
      panel: {
        title: 'Volume Confirms the Breakout',
        lines: [
          'A breakout on **rising** volume is trustworthy',
          'A breakout on **low** volume is a fakeout risk',
          'Same price chart — volume settles the question',
          'It’s your lie-detector at key levels'
        ]
      }
    },
    {
      id: 'breakdown',
      type: 'CHART',
      chart: 'consolidation_breakout',
      params: { dir: 'down', volume: true },
      stage: 'breakout',
      heading: '…and the Same for a Breakdown',
      say: "It works identically to the downside. Price coils in a quiet range on thin volume, then breaks down — and the volume bar surges as sellers dump into the move. That expansion confirms the breakdown is driven by real selling pressure, not just a one-off flush. Whichever way price breaks, let the volume vote.",
      show: [
        { kind: 'level',  at: 'rangeLow', label: 'support', side: 'left' },
        { kind: 'marker', at: 'breakout', label: 'breakdown on a volume spike', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So whenever price reaches one of your levels, glance at the volume. Expansion into a breakout or breakdown confirms conviction; a quiet move warns you to be skeptical. Combine volume with your levels, candlestick formations, and structure, and every trade gets one more layer of confluence. Next, we start naming the classical chart patterns.",
      panel: {
        title: 'Volume Examples — Recap',
        lines: [
          'At every level, check the volume',
          'Expansion = conviction; quiet = skepticism',
          'Confirms breakouts **and** breakdowns',
          'One more layer of confluence on every trade'
        ]
      }
    }
  ]
};
