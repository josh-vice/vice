/* Course2 · 18 — Divergences                           (v2 lesson)
   Reuses the `rsi` move (price higher-high while RSI makes a lower-high = regular
   bearish divergence). Teaches the four families (regular vs hidden) via concept
   panels. No new vocabulary. Source: live Course 2 "Divergences" chapter (no video). */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/18_divergences'] = {
  id: 'course2/18_divergences',
  course: 'Course2_Building_Your_Toolbox',
  module: '18_Divergences',
  title: 'Divergences',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now for one of the most useful things an oscillator can show you: divergence. A divergence happens when price and the oscillator tell different stories. Price pushes to a new high or low, but the oscillator refuses to confirm it. That disagreement is a leading signal — momentum is fading underneath the move even though price hasn't turned yet.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'When Price and Momentum Disagree',
        lines: [
          'Price makes a new high or low — the oscillator **fails to confirm**',
          'A **leading** signal: momentum weakens before price turns',
          'Two families: **Regular** (reversal) and **Hidden** (continuation)'
        ]
      }
    },
    {
      id: 'regular-bearish',
      type: 'CHART',
      chart: 'rsi',
      stage: 'all',
      heading: 'Regular Bearish Divergence',
      say: "Here's the classic case. Price grinds out a higher high — the second peak is clearly above the first. But look at the RSI in the panel below: its second peak is lower than the first. Price up, momentum down. That's a regular bearish divergence: the buyers are exhausting, and it warns of a reversal down. Connect tops to tops, and notice the slopes disagree — that's what makes it valid.",
      show: [ { kind: 'trendline', from: 'high1', to: 'high2', style: 'resistance', label: 'price tops: rising' },
        { kind: 'marker', at: 'high2', label: 'price: higher high', style: 'dot', place: 'above' },
        { kind: 'note',   at: 'high1', label: 'RSI: lower high → bearish divergence', place: 'above' }
      ]
    },
    {
      id: 'two-families',
      type: 'CONCEPT',
      say: "There are two families, and mixing them up flips your trade direction entirely. Regular divergences appear at trend extremes and signal exhaustion — a likely reversal. Hidden divergences appear during a pullback inside an ongoing trend and signal continuation — the trend is about to resume. Same tool, opposite meaning, depending on where it shows up.",
      panel: {
        kicker: 'Read It Right',
        title: 'Two Families, Opposite Meaning',
        lines: [
          '**Regular** — at trend *extremes* → exhaustion, likely **reversal**',
          '**Hidden** — during a *pullback* → trend **continuation**',
          'Get the family wrong and you trade the wrong direction'
        ]
      }
    },
    {
      id: 'four-setups',
      type: 'CONCEPT',
      say: "Here are the four setups. Regular bullish: price makes a lower low, the oscillator a higher low — seller exhaustion, reversal up, found at bottoms. Regular bearish: price makes a higher high, the oscillator a lower high — buyer exhaustion, reversal down, found at tops. Hidden bullish: price makes a higher low while the oscillator makes a lower low — buyers re-entering, continuation up. Hidden bearish: price makes a lower high while the oscillator makes a higher high — sellers re-entering, continuation down.",
      panel: {
        title: 'The Four Divergences',
        lines: [
          '**Regular Bullish** — price LL, osc HL → reversal **up** (bottoms)',
          '**Regular Bearish** — price HH, osc LH → reversal **down** (tops)',
          '**Hidden Bullish** — price HL, osc LL → continuation **up** (buy the dip)',
          '**Hidden Bearish** — price LH, osc HH → continuation **down** (sell the rally)'
        ]
      }
    },
    {
      id: 'rules',
      type: 'CONCEPT',
      say: "A few rules to keep you safe. Trade divergences with the higher-time-frame trend, not against it — don't go hunting hidden bearish setups in a macro uptrend. Wait for the oscillator to cross back out of overbought or oversold into the midrange before acting. And never trade a divergence alone: it's strongest when it lands on a key support or resistance zone with a candlestick trigger to confirm. It's a leading clue, not a guarantee.",
      panel: {
        title: 'Divergences — Recap',
        lines: [
          'Trade **with** the higher-time-frame trend',
          'Wait for the oscillator to cross back into the **midrange**',
          'Strongest at a key **S/R zone** with a candlestick trigger',
          'A **leading** signal — confluence, never a standalone trigger'
        ]
      }
    }
  ]
};
