/* Course2 · 10 — Classical Chart Patterns             (v2 lesson)
   Source provenance (read-only): YouTube (Course2/10_Classical_Chart_Patterns).
   The pattern gallery — each carries the declining-volume-then-spike profile. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/10_classical_chart_patterns'] = {
  id: 'course2/10_classical_chart_patterns',
  course: 'Course2_Building_Your_Toolbox',
  module: '10_Classical_Chart_Patterns',
  title: 'Classical Chart Patterns',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's learn the classical chart patterns. Three ground rules first. Pattern reading is subjective, so stay objective and let price lead, not your bias. Only trade a pattern after it completes — we're reactive, not anticipatory. And every pattern shares a measured target and a volume signature: volume declines as the pattern forms, then spikes on the break.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Classical Chart Patterns',
        lines: [
          'Pattern reading is **subjective** — stay objective',
          'Trade only after **completion** — react, don’t anticipate',
          'Each has a **measured target** and a volume signature'
        ]
      }
    },
    {
      id: 'rising-wedge',
      type: 'CHART',
      chart: 'rising_wedge',
      stage: 'all',
      heading: 'Rising Wedge — Bearish',
      say: "First, the rising wedge. Price makes higher highs and higher lows, but the lows rise faster than the highs, so the two trendlines converge. That's bearish — and notice the volume fading as it forms. When price breaks the lower line, the volume spikes, confirming sellers. The target equals the height of the wedge, and you often get a retest of the broken line to enter short.",
      show: [
        { kind: 'trendline', from: 'upperA', to: 'upperB', style: 'resistance', label: 'converging' },
        { kind: 'trendline', from: 'lowerA', to: 'lowerB', style: 'support' },
        { kind: 'marker', at: 'breakdown', label: 'breakdown on volume', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'falling-wedge',
      type: 'CHART',
      chart: 'falling_wedge',
      stage: 'all',
      heading: 'Falling Wedge — Bullish',
      say: "The falling wedge is the bullish mirror. Converging lower highs and lower lows, volume drying up, then a breakout to the upside on a volume spike. Same rule for the target — the height of the wedge. Sometimes it runs straight to target without a retest, and you simply miss it. That's fine: missing trades beats forcing them.",
      show: [
        { kind: 'trendline', from: 'upperA', to: 'upperB', style: 'resistance' },
        { kind: 'trendline', from: 'lowerA', to: 'lowerB', style: 'support', label: 'converging' },
        { kind: 'marker', at: 'breakout', label: 'breakout on volume', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'head-shoulders',
      type: 'CHART',
      chart: 'head_and_shoulders',
      stage: 'all',
      heading: 'Head & Shoulders — Reversal',
      say: "The head and shoulders is a topping pattern: a high, a higher high, then a lower high — the left shoulder, the head, the right shoulder. Draw a neckline under the two dips between them. When price breaks the neckline on rising volume, the reversal is confirmed, and the target is the distance from the head down to the neckline, projected below it.",
      show: [
        { kind: 'marker', at: 'leftShoulder',  label: 'shoulder', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'head',          label: 'head', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'rightShoulder', label: 'shoulder', style: 'dot', place: 'above' },
        { kind: 'level',  at: 'neckline', label: 'neckline', side: 'left' },
        { kind: 'level',  at: 'target', label: 'target', side: 'right' },
        { kind: 'marker', at: 'breakdown', label: 'neckline break', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'inverse-hs',
      type: 'CHART',
      chart: 'inverse_head_and_shoulders',
      stage: 'all',
      heading: 'Inverse Head & Shoulders — Reversal',
      say: "Flip it for a bottoming pattern: the inverse head and shoulders. A low, a lower low for the head, then a higher low. The neckline runs across the highs between them, and a break above it on a volume spike confirms a bullish reversal. The target is again the head-to-neckline distance, projected upward. Only hunt these at the bottom of a downtrend.",
      show: [ { kind: 'marker', at: 'leftShoulder', style: 'dot', place: 'below', label: 'shoulder' }, { kind: 'marker', at: 'rightShoulder', style: 'dot', place: 'below', label: 'shoulder' },
        { kind: 'marker', at: 'head', label: 'head', style: 'dot', place: 'below' },
        { kind: 'level',  at: 'neckline', label: 'neckline', side: 'left' },
        { kind: 'level',  at: 'target', label: 'target', side: 'right' },
        { kind: 'marker', at: 'breakout', label: 'neckline break', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'asc-triangle',
      type: 'CHART',
      chart: 'ascending_triangle',
      stage: 'all',
      heading: 'Ascending Triangle',
      say: "Triangles next. An ascending triangle has a flat top — equal highs — and a rising series of higher lows pressing up underneath it. Buyers keep defending higher while sellers hold one price, until the top finally gives way. It usually breaks out upward, and the target is the height of the triangle.",
      show: [
        { kind: 'level',  at: 'top', label: 'equal highs (resistance)', side: 'left' },
        { kind: 'trendline', from: 'lowerA', to: 'lowerB', style: 'support', label: 'higher lows' },
        { kind: 'marker', at: 'breakout', label: 'breakout', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'desc-triangle',
      type: 'CHART',
      chart: 'descending_triangle',
      stage: 'all',
      heading: 'Descending Triangle',
      say: "The descending triangle is the bearish counterpart: a flat bottom of equal lows, with lower highs pressing down on top. Sellers keep capping price lower while buyers defend one level, until the floor breaks. It typically breaks down, with the target equal to the triangle's height.",
      show: [
        { kind: 'level',  at: 'bottom', label: 'equal lows (support)', side: 'left' },
        { kind: 'trendline', from: 'upperA', to: 'upperB', style: 'resistance', label: 'lower highs' },
        { kind: 'marker', at: 'breakdown', label: 'breakdown', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'bull-flag',
      type: 'CHART',
      chart: 'bull_flag',
      stage: 'all',
      heading: 'Bull Flag — Continuation',
      say: "Finally, the most useful one: the bull flag. A strong vertical move — the pole — followed by a small, drifting consolidation that looks like a flag, then a breakout that continues the trend. Flags are continuation patterns, so in an uptrend you'll see them constantly as buyers pause to take profit. The target is always the height of the pole, measured from the breakout.",
      show: [
        { kind: 'marker', at: 'poleTop', label: 'pole', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'flagA', label: 'the flag', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'breakout', label: 'continuation', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So that's the gallery: wedges, head and shoulders and its inverse, the three triangles and their pennant cousins, and flags. Three things tie them together — wait for completion, measure the target from the pole or the height, and confirm with the volume signature. And remember: when a reversal pattern fails for lack of volume, price usually just continues the trend. Next, we hunt these on naked charts.",
      panel: {
        title: 'Patterns — Recap',
        lines: [
          'Wait for **completion**; measure the **target**',
          'Confirm with the declining-then-spiking **volume**',
          'Failed reversal → trend likely **continues**',
          'Flags & pennants are continuation; wedges/H&S reverse'
        ]
      }
    }
  ]
};
