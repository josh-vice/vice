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
      say: "Now let's hunt these patterns the way you would on a live chart, and turn them into trade setups using the LTE methodology. The recipe is the same every time: identify the pattern, wait for the break, measure the target, and let volume confirm. And we'll price every setup in R — the reward we expect per unit of risk.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Patterns in the Wild',
        lines: [
          'Identify → wait for the break → measure → confirm',
          'Patterns + **LTE** become trade setups',
          'Every setup priced in **R** — reward per unit of risk',
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
      say: "Here's a textbook bull flag in an uptrend. Volume fades through the flag and surges on the breakout — but we don't chase the break. We wait for the S/R-flip retest of the flag; an indecision candle there is our trigger, and the entry comes on its close. Stop below the flag low, target the pole projected up. This setup offered 6.23R — six units earned per unit risked.",
      show: [ { kind: 'level',  at: 'stop', side: 'left', label: 'stop below the flag low', tone: 'stop' },
        { kind: 'marker', at: 'poleTop',  label: 'measure the pole', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'breakout', label: 'breakout — don’t chase', style: 'reversal', place: 'above' },
        { kind: 'marker', at: 'retest', label: 'S/R-flip retest — trigger → entry', style: 'dot', place: 'below' },
        { kind: 'level',  at: 'target', label: 'target — pole height · 6.23R', side: 'right', tone: 'target' }
      ]
    },
    {
      id: 'bearflag',
      type: 'CHART',
      chart: 'rising_wedge',
      stage: 'all',
      heading: 'A Bear Flag Setup',
      say: "Now a downtrend — so we hunt shorts. Price coils upward against the trend: a bear flag, a bearish continuation pattern. When the flag gives way, the underside retest of the broken level is the S/R flip we've been waiting for — trigger there, short on the close. Stop above the prior resistance, target the pole height projected down. That setup offered 3.88R.",
      show: [
        { kind: 'marker', at: 'breakdown', label: 'flag gives way', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'retest', label: 'S/R-flip retest — trigger → short', style: 'dot', place: 'above' },
        { kind: 'level',  at: 'stop', label: 'stop — above the prior resistance', side: 'left', tone: 'stop' },
        { kind: 'level',  at: 'target', label: 'target — pole height · 3.88R', side: 'right', tone: 'target' }
      ]
    },
    {
      id: 'more-examples',
      type: 'CONCEPT',
      say: "Three more from the same charts. A bullish pennant — breakout, then a tight symmetrical coil — hit its measured target exactly… but it never gave a successful retest, so no access point, no trade. A descending triangle's throwback retest took a month to arrive: stop above the last lower high, 2.74R. And an ascending triangle set up 2.84R. Daily-timeframe patterns take weeks, even months, to play out.",
      panel: {
        title: 'Three More Walkthroughs',
        lines: [
          '**Pennant** — target hit exactly; no retest = no access point, no trade',
          '**Descending triangle** — throwback retest a month later · 2.74R',
          '**Ascending triangle** — flat-top entry after a valid trigger · 2.84R',
          'Daily patterns take **weeks to months** — patience'
        ]
      }
    },
    {
      id: 'failed',
      type: 'CONCEPT',
      say: "But patterns fail, and that's a lesson in itself. If a pattern breaks its level on weak volume and buyers step right back in, the break is void — and because price only goes up or down, a failed reversal usually means the original trend continues. We don't flip and trade the opposite; we just stand aside and wait for real confirmation. Reacting, not predicting, is what keeps us safe.",
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
      say: "So as you scan charts, trade pattern completions — never anticipate them. Measure your targets, demand volume confirmation, and journal every setup with its R-multiple: that's how your system gets stronger and more profitable. You'll see far more patterns than you should ever trade — and that's the point. Next we move into the trading tools, starting with my favourite: Fibonacci.",
      panel: {
        title: 'Pattern Examples — Recap',
        lines: [
          'Trade pattern **completions** — never anticipate',
          'Measure targets from the pole / pattern height',
          'Demand **volume** confirmation',
          'Journal every setup and its **R-multiple**'
        ]
      }
    }
  ]
};
