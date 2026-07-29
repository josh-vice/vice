/* Course4 · 23 — Combining Sentiment Data              (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/23_combining_sentiment_data'] = {
  id: 'course4/23_combining_sentiment_data',
  course: 'Course4_Liquidity_Theory',
  module: '23_Combining_Sentiment_Data',
  title: 'Combining Sentiment Data',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Time to combine. Just like we plotted liquidity from liquidation levels, we're going to spot the blocks and plot the blocks — blocks being those clusters of longs and shorts from the positions heatmap. Remember the colour rule: bright is positions opening, dark is positions closing. And this walkthrough runs the other direction: shorts that could get squeezed.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Spot the Blocks, Plot the Blocks',
        lines: [
          '**Blocks** = clusters of longs / shorts',
          'Bright = opening · dark = closing',
          'Heatmap + liquidation levels + TA',
          'Today: hunting a **short squeeze**'
        ]
      }
    },
    {
      id: 'spot',
      type: 'CONCEPT',
      say: "Spot them first. On the net aggressive short heatmap, a bright yellow block sits between $6,350 and $6,400 — call it $6,370: shorts opened there, and price is sitting just below it. Flip to liquidation levels: a 100x, a 50x, and 25x short liquidations stacked around $6,300. Interesting. If enough buying pressure shows up, that's a nice short squeeze waiting to happen.",
      panel: {
        title: 'The Sentiment Read',
        lines: [
          'Short block **~$6,370** — bright = opened',
          'Short liquidations stacked **~$6,300**',
          'Price sitting **below** both',
          'Buying pressure → **squeeze fuel above**'
        ]
      }
    },
    {
      id: 'plot',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'approach',
      heading: 'Plot the Blocks',
      say: "Now plot it. Bullish structure — higher lows, higher highs — has settled into a range, and the mid-range lands at $6,346: right on top of the short block and those 25x liquidations. That's not a line we drew for fun; it's where the trapped sellers live. Price holds the range low, and buyers keep showing up at a point of breakout.",
      show: [
        { kind: 'level', at: 'clusterHi', label: 'mid-range — short block confluence', side: 'left', tone: 'resistance' },
        { kind: 'heatmap', of: 'stop', to: 'bandHi', tone: 'short', peak: 0.7, label: 'short block — bright = opened' }
      ]
    },
    {
      id: 'squeeze',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'pierce',
      heading: 'The Squeeze',
      say: "Price dips once more, does a point of breakout right where the buyers defended before, and impulses up — the 25x shorts liquidate, the block gets squeezed, and price accelerates through the mid-range. Forced buy-backs from trapped shorts are the fuel. This is why the level mattered: we knew exactly who was standing there.",
      show: [
        { kind: 'marker', at: 'cascade', label: 'short squeeze — block taken out', style: 'sweep', place: 'above' }
      ]
    },
    {
      id: 'fib',
      type: 'CONCEPT',
      say: "Where does a squeeze run to? Take the Fibonacci tool — swing high to swing low — and a key fib zone lands right on the prior point of breakdown, where sellers came in hard. That's the upside target. The outcome: price ran it, came back to test prior resistance, flipped the breakdown into support — a very strong S/R flip — then broke out through the range high.",
      panel: {
        title: 'Targeting with Fibonacci',
        lines: [
          'Fib from **swing high → swing low**',
          'Key fib zone + point of breakdown = **target**',
          'Ran it → retest → **S/R flip**',
          'Then broke the range high'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "That's the full walkthrough: spot the blocks on the heatmap, confirm with liquidation levels, plot them against your range, mid, and points of breakout — then let the squeeze play out into a fib target. Two Hyblock tools plus TA, and price's reaction finally has a why. Next: the trading activity tab, which helps explain the reason behind these squeezes.",
      panel: {
        title: 'The Walkthrough — Recap',
        lines: [
          '**Spot** the blocks → **plot** the blocks',
          'Mid-range + short block + liqs aligned',
          'Squeeze up → fib + breakdown = target',
          'Next: **trading activity**'
        ]
      }
    }
  ]
};
