/* Course2 · 08 — Volume Analysis                       (v2 lesson)
   Source provenance (read-only): YouTube (Course2/08_Volume_Analysis).
   The four price-vs-volume scenarios, each rendered with a volume sub-panel. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/08_volume_analysis'] = {
  id: 'course2/08_volume_analysis',
  course: 'Course2_Building_Your_Toolbox',
  module: '08_Volume_Analysis',
  title: 'Volume Analysis',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's layer in another tool: volume. Volume is simply the number of units — shares, tokens, contracts — traded during a given period. It's a leading indicator: it gives us early clues about which side, buyers or sellers, is really in control. And like every tool here, its power is as a point of confluence.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Volume',
        lines: [
          'The number of units traded in a period',
          'A **leading** clue to who’s in control',
          'A point of **confluence** — it confirms your bias'
        ]
      }
    },
    {
      id: 'why',
      type: 'CONCEPT',
      say: "Why does it matter so much? Three reasons. Volume confirms moves at key levels — a big spike on a breakout or an S R flip tells us the move is real. It helps us spot reversals and fakeouts, by showing whether buyers actually have the steam to push through. And it's a measure of liquidity — which becomes the heart of the advanced course. Now let's look at the four core scenarios.",
      panel: {
        title: 'Why Volume Matters',
        lines: [
          'Confirms breakouts and S/R flips (volume spikes)',
          'Exposes reversals and **fakeouts**',
          'Measures **liquidity** — the advanced course’s core',
          'Four scenarios tell you who’s in control'
        ]
      }
    },
    {
      id: 'up-strong',
      type: 'CHART',
      chart: 'uptrend',
      params: { volume: 'rising' },
      stage: 'all',
      heading: 'Price Up + Volume Up = Strong Buying',
      say: "Scenario one. Price is climbing and volume is rising right alongside it — look at the bars growing taller as price makes new highs. That's strong, committed buying. Demand is real and the trend has conviction behind it. This is the healthiest kind of uptrend.",
      show: [
        { kind: 'marker', at: 'hh2', label: 'rising volume = strong, bullish', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'up-weak',
      type: 'CHART',
      chart: 'uptrend',
      params: { volume: 'declining' },
      stage: 'all',
      heading: 'Price Up + Volume Down = Weak Buying',
      say: "Scenario two. Price is still rising, but now volume is fading — the bars shrink as price climbs. That's a warning. The buyers are running out of steam; fewer and fewer are willing to chase. This kind of move often precedes a reversal, as sellers prepare to step in.",
      show: [
        { kind: 'marker', at: 'hh2', label: 'fading volume = weak, reversal risk', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'down-strong',
      type: 'CHART',
      chart: 'downtrend',
      params: { volume: 'rising' },
      stage: 'all',
      heading: 'Price Down + Volume Up = Strong Selling',
      say: "Scenario three is the mirror. Price is falling while volume is rising — heavy, committed selling. The sellers are firmly in control and the downtrend has real force. When you see this, you don't want to be standing in front of it.",
      show: [
        { kind: 'marker', at: 'll2', label: 'rising volume = strong selling', style: 'sweep', place: 'below' }
      ]
    },
    {
      id: 'down-weak',
      type: 'CHART',
      chart: 'downtrend',
      params: { volume: 'declining' },
      stage: 'all',
      heading: 'Price Down + Volume Down = Weak Selling',
      say: "And scenario four. Price keeps dropping, but volume is drying up. The selling is losing conviction — the sellers are exhausting themselves, and buyers may be about to step in. A falling market on fading volume is often closer to a bottom than it looks.",
      show: [
        { kind: 'marker', at: 'll2', label: 'fading volume = sellers exhausting', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the rule of thumb: volume should agree with the move. Rising volume confirms the trend; fading volume warns it's weakening. Stack this on top of your levels and formations and you've got real confluence. Next, Trip walks through these scenarios on live charts.",
      panel: {
        title: 'Volume — Recap',
        lines: [
          'Volume should **agree** with the price move',
          'Rising volume confirms; fading volume warns',
          'Strong vs. weak buying — and selling',
          'Stack with levels + formations for confluence'
        ]
      }
    }
  ]
};
