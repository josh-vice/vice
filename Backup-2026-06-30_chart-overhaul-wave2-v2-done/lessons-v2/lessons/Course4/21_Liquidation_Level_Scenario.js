/* Course4 · 21 — Liquidation Level Scenario            (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/21_liquidation_level_scenario'] = {
  id: 'course4/21_liquidation_level_scenario',
  course: 'Course4_Liquidity_Theory',
  module: '21_Liquidation_Level_Scenario',
  title: 'Liquidation Level Scenario',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's trade a liquidation-level scenario from start to finish. The plan: identify the dense cluster that price is likely drawn to, anticipate the cascade into it, and position for the reversal that often follows once the liquidity is consumed.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'A Liquidation Scenario',
        lines: [
          'Find the cluster price is drawn to',
          'Anticipate the **cascade** into it',
          'Position for the reversal after'
        ]
      }
    },
    {
      id: 'setup',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'pierce',
      heading: 'Drawn to the Cluster',
      say: "Price is grinding higher, and above it sits a fat cluster of short liquidations. Liquidity theory says price wants to reach it. As price approaches, the shorts' stops start triggering, and a cascade carries it up in a sharp spike that pierces the cluster. The fuel is being consumed exactly where the map said it would be.",
      show: [
        { kind: 'level',  at: 'clusterHi', label: 'target cluster', side: 'left' },
        { kind: 'zone',   side: 'above', of: 'bandHi', depth: 6, tone: 'risk', label: 'fat cluster — dense short liquidations' },
        { kind: 'marker', at: 'magnet', label: 'spike into the cluster', style: 'sweep', place: 'above' },
        { kind: 'marker', at: 'cascade', label: 'cascade pierces the cluster', style: 'sweep', place: 'above' }
      ]
    },
    {
      id: 'reversal',
      type: 'CHART',
      chart: 'liquidation_levels',
      stage: 'reversal',
      heading: 'Liquidity Consumed → Reversal',
      say: "Now the key move. Once that cluster is swept and the liquidations are exhausted, there's nothing left to fuel the move — the spike has no follow-through, and price reverses hard. This is the engineered sweep with a data confirmation: the cluster told us where the trap was, the cascade sprung it, and the reversal is the trade. Short the failure, stop above the spike, target back toward the lower cluster.",
      show: [
        { kind: 'marker', at: 'cascade', label: 'liquidity consumed', style: 'sweep', place: 'above' },
        { kind: 'level',  at: 'stop', label: 'stop — above the spike', side: 'right' },
        { kind: 'marker', at: 'reversalPivot', label: 'no fuel left → reverse (short)', style: 'reversal', place: 'below' },
        { kind: 'level',  at: 'clusterLo', label: 'target — lower cluster', side: 'left' },
        { kind: 'marker', at: 'reversal', label: 'tags the lower cluster', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the scenario is: map the cluster, expect the cascade into it, and fade the exhaustion once the liquidity is gone. It's everything from this course in one trade — liquidity structures, the sweep, sentiment, and a literal map of the fuel. This is liquidity theory firing on all cylinders. Next, the heatmap that visualises cluster density.",
      panel: {
        title: 'Scenario — Recap',
        lines: [
          'Map the cluster → expect the cascade',
          'Fade the **exhaustion** once liquidity is gone',
          'Structure + sweep + sentiment + the map',
          'Next: the positions heatmap'
        ]
      }
    }
  ]
};
