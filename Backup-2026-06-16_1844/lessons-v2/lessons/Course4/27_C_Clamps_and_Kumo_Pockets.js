/* Course4 · 27 — C-Clamps and Kumo Pockets            (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/27_c_clamps_and_kumo_pockets'] = {
  id: 'course4/27_c_clamps_and_kumo_pockets',
  course: 'Course4_Liquidity_Theory',
  module: '27_C_Clamps_and_Kumo_Pockets',
  title: 'C-Clamps & Kumo Pockets',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now two specific Ichimoku cloud patterns: C-clamps and kumo pockets. The kumo is the cloud, and its shape tells a story. A C-clamp is when the two cloud spans pinch together into a tight, clamp-like squeeze, and a kumo pocket is the small space that forms inside a twist of the cloud. Both mark zones where price tends to compress and then make a decisive move.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'C-Clamps & Kumo Pockets',
        lines: [
          'The **kumo** is the cloud; its shape matters',
          '**C-clamp** — the cloud pinches into a squeeze',
          '**Kumo pocket** — a space inside a cloud twist',
          'Both mark compression before a move'
        ]
      }
    },
    {
      id: 'chart',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Reading the Cloud’s Shape',
      say: "Look at the cloud, not just its colour. Where the two spans squeeze together, the cloud is thin and offers little resistance — price slices through such pockets easily. Where the cloud is thick, it's a strong barrier. A C-clamp pinch ahead of price is often a launchpad: little is holding it back, so a break tends to be sharp and clean.",
      show: [
        { kind: 'note', at: 'pullback', label: 'thin cloud = easy to pierce', place: 'below' },
        { kind: 'note', at: 'aboveCloud', label: 'thick cloud = strong barrier', place: 'above' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "So trade the cloud's geometry. A thin spot or a kumo pocket ahead of price flags where a move can accelerate with little resistance — a good place to expect continuation. A thick cloud flags where a move is likely to stall or reverse. Reading the kumo's thickness adds a layer of anticipation that the lines alone don't give you.",
      panel: {
        title: 'Trading the Geometry',
        lines: [
          'Thin cloud / pocket → price accelerates through',
          'Thick cloud → expect a stall or reversal',
          'A C-clamp pinch is often a launchpad',
          'Anticipate where moves speed up or stall'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So C-clamps and kumo pockets are about reading the cloud's thickness as a map of resistance ahead — thin means go, thick means stop. It turns the kumo from a coloured blob into a forward-looking tool. Next, one of my favourite Ichimoku setups: the edge-to-edge trade.",
      panel: {
        title: 'Cloud Patterns — Recap',
        lines: [
          'Read the **thickness** of the cloud',
          'Thin/pocket = acceleration; thick = barrier',
          'The kumo becomes forward-looking',
          'Next: the edge-to-edge trade'
        ]
      }
    }
  ]
};
