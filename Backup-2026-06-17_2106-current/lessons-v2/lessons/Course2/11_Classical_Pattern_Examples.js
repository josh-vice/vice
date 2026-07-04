/* Course2 · 11 — Classical Pattern Examples           (v2 lesson)
   Source provenance (read-only): YouTube (Course2/11_Classical_Pattern_Examples). */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/11_classical_pattern_examples'] = {
  id: 'course2/11_classical_pattern_examples',
  course: 'Course2_Building_Your_Toolbox',
  module: '11_Classical_Pattern_Examples',
  title: 'Classical Pattern Examples',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now let's hunt these patterns the way you would on a live chart, and turn them into trade setups. The recipe is the same every time: identify the pattern, wait for the break, measure the target, and let volume confirm. Let's walk a couple of clean ones.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Patterns in the Wild',
        lines: [
          'Identify → wait for the break → measure → confirm',
          'Patterns become **trade setups**',
          'Volume is the deciding vote'
        ]
      }
    },
    {
      id: 'flag',
      type: 'CHART',
      chart: 'bull_flag',
      stage: 'all',
      heading: 'A Bull Flag Setup',
      say: "Here's a textbook bull flag in an uptrend. We measure the pole, then project that same height up from the breakout to set our target. Volume fades through the flag and surges on the breakout — exactly the signature we want. Entry on the breakout or its retest, stop below the flag, target a pole-height higher.",
      show: [
        { kind: 'marker', at: 'poleTop',  label: 'measure the pole', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'breakout', label: 'breakout + volume → entry', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'hs',
      type: 'CHART',
      chart: 'head_and_shoulders',
      stage: 'all',
      heading: 'A Head & Shoulders Setup',
      say: "And a reversal: a head and shoulders at the top of a trend. We wait — patiently — for price to close below the neckline on a volume spike. Only then is it a setup: short the break or its retest, stop above the right shoulder, and target the head-to-neckline distance projected down. No neckline close, no trade.",
      show: [
        { kind: 'level',  at: 'neckline', label: 'neckline', side: 'left' },
        { kind: 'level',  at: 'target', label: 'target', side: 'right' },
        { kind: 'marker', at: 'breakdown', label: 'close below + volume → short', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'failed',
      type: 'CONCEPT',
      say: "But patterns fail, and that's a lesson in itself. If a head and shoulders breaks the neckline on weak volume and buyers step right back in, the pattern is void — and because price only goes up or down, a failed reversal usually means the original trend continues. We don't flip and trade the opposite; we just stand aside and wait for real confirmation. Reacting, not predicting, is what keeps us safe.",
      panel: {
        title: 'When Patterns Fail',
        lines: [
          'No volume on the break → the pattern is **void**',
          'A failed reversal usually means the **trend continues**',
          'Don’t fade it — just wait for confirmation',
          'Preservation of capital before profit'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So as you scan charts, let patterns complete, measure your targets, and demand volume confirmation before you act. You'll see far more patterns than you should ever trade — and that's the point. The best traders pass on most of them. Next we move into the trading tools, starting with my favourite: Fibonacci.",
      panel: {
        title: 'Pattern Examples — Recap',
        lines: [
          'Let patterns **complete** before trading',
          'Measure targets from the pole / pattern height',
          'Demand **volume** confirmation',
          'You’ll skip most patterns — that’s correct'
        ]
      }
    }
  ]
};
