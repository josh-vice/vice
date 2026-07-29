/* Course1 · 09 — Timeframes                            (v2 lesson)
   Source provenance (read-only): YouTube ea3Upvs-Csg. The source was a multi-
   timeframe replay; here the timeframe relationships are idealized moves. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/09_timeframes'] = {
  id: 'course1/09_timeframes',
  course: 'Course1_Laying_The_Foundation',
  module: '09_Timeframes',
  title: 'Timeframes',
  source_video: 'ea3Upvs-Csg',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Which timeframe should you trade? It's the question that confuses most new traders, and the honest answer is: it depends, because technical analysis is always contextual. The trick isn't picking one timeframe — it's timeframe analysis, or TFA: learning how the timeframes fit together.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'Timeframe Analysis (TFA)',
        lines: [
          'The most confusing part for new traders',
          'There is no single “best” timeframe',
          '**TFA** — timeframe analysis: how they nest inside each other'
        ]
      }
    },
    {
      id: 'top-down',
      type: 'CONCEPT',
      say: "The method is top-down. Start high — the daily or weekly — to read the big-picture trend and set your bias. Then drop to a lower timeframe to time a precise entry in that direction. The high timeframe tells you what to do; the low timeframe tells you when.",
      panel: {
        title: 'Top-Down Analysis',
        lines: [
          'Start **high** — read the trend, set your bias',
          'Drop **low** — find a precise entry',
          'HTF says *what*; LTF says *when*'
        ]
      }
    },
    {
      id: 'htf-bias',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'all',
      heading: 'The Daily Sets the Bias',
      say: "Say the daily is in a clear uptrend — higher highs and higher lows. That's our bias: we're looking for longs, not shorts. Everything we do on lower timeframes should respect this direction.",
      show: [
        { kind: 'note',   at: 'start', place: 'below', label: 'Daily' },
        { kind: 'marker', at: 'hl1', label: 'higher low', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'hh1', label: 'higher high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'hl2', label: 'higher low', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'hh2', label: 'bias = bullish', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'ltf-pullback',
      type: 'CHART',
      chart: 'downtrend',
      stage: 'all',
      heading: 'Zoom In: a Pullback Within It',
      say: "Now zoom into the one-hour, and you might find a downtrend — lower highs and lower lows. Don't panic: this little downtrend is just the higher timeframe's pullback. Fighting it by going short would mean trading against the daily uptrend. Instead, we wait for it to exhaust.",
      show: [
        { kind: 'note',   at: 'start', place: 'above', label: '1H — inside the daily pullback' },
        { kind: 'marker', at: 'lh1', label: 'lower high', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'll1', style: 'dot', place: 'below', label: 'lower low' },
        { kind: 'marker', at: 'll2', label: 'pullback low — wait for exhaustion', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'entry',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'hold',
      heading: 'Find the Entry at an S/R Flip',
      say: "When the pullback ends, the lower timeframe gives the entry. Price breaks above a level and holds, then retests it as support — old resistance flipping to support, back in line with the daily uptrend. That retest is the entry.",
      show: [ { kind: 'marker', at: 'breakout', style: 'reversal', place: 'above', label: 'breaks & holds' },
        { kind: 'level',  at: 'level', label: 'reclaimed level', side: 'left' },
        { kind: 'marker', at: 'entry', label: 'entry — aligned with HTF', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'entry-run',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      say: "And price runs on in the daily's direction. Risk sits just below the flipped level, the target rides the continuation. That's the payoff of top-down analysis: a low-risk entry, timed on the small timeframe, aligned with the big one.",
      show: [
        { kind: 'level',  at: 'stop', label: 'stop — below the flip', side: 'right' },
        { kind: 'level',  at: 'target', label: 'target / continuation', side: 'right' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "Recap: read the high timeframe first to set your bias, then drop down to time your entry. When timeframes disagree, the higher timeframe wins — the lower one is usually just a pullback inside it. And the flips work both ways across timeframes: a breakout turns resistance into support, a breakdown turns support into resistance. Match your strategy to the timeframe — macro for position and swing trading, micro for day-trading and scalping.",
      panel: {
        title: 'Timeframes — Recap',
        lines: [
          'Read the high timeframe first — set the bias',
          'Drop down to time the entry',
          'When they disagree, the **higher timeframe wins**',
          'Breakout flips R→S · breakdown flips **S→R** — on every timeframe',
          'Macro → **position/swing** trades · micro → **day-trading/scalping**'
        ]
      }
    }
  ]
};
