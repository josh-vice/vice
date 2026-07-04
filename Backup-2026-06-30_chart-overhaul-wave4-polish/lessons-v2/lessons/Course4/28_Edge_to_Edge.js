/* Course4 · 28 — Edge to Edge                          (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/28_edge_to_edge'] = {
  id: 'course4/28_edge_to_edge',
  course: 'Course4_Liquidity_Theory',
  module: '28_Edge_to_Edge',
  title: 'Edge to Edge',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Here's a clean, recurring Ichimoku setup: the edge-to-edge trade. The idea is simple. When price breaks into one edge of the cloud, it very often travels all the way through to the opposite edge. So an entry at the near edge gives you a defined, high-probability target at the far edge.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Edge to Edge',
        lines: [
          'Price enters one edge of the cloud…',
          '…and often travels to the **opposite** edge',
          'A defined entry and a defined target'
        ]
      }
    },
    {
      id: 'chart',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'The Edge-to-Edge Move',
      say: "Watch price interact with the cloud. When it pushes up into the lower edge of the kumo and closes inside, that's the trigger — we enter, targeting the upper edge. The cloud itself defines both ends of the trade: the near edge is the entry, the far edge is the take-profit. Price tends to want to cross the whole cloud, so the move plays out edge to edge.",
      show: [
        { kind: 'note', at: 'pullback', label: 'enter at the near edge', place: 'below' },
        { kind: 'note', at: 'aboveCloud', label: 'target the far edge', place: 'above' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "Two things sharpen it. The trade works best when the cloud is reasonably thin — a kumo pocket, from the last lesson — because price crosses it cleanly; a very thick cloud can stall the move. And like everything in this course, it's stronger with confluence: an edge-to-edge entry that also sits at a Kijun bounce or a liquidation level is the version worth pressing.",
      panel: {
        title: 'Sharpening the Setup',
        lines: [
          'Works best when the cloud is **thin**',
          'A thick cloud can stall the crossing',
          'Stack with a Kijun bounce or a level',
          'Defined risk, defined target'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So edge-to-edge is the Ichimoku setup with a built-in target: enter at the near edge of the cloud, aim for the far edge, and favour thin clouds with confluence. It's a beautifully self-contained trade. Next, we tie the whole Ichimoku system together in a full market scenario.",
      panel: {
        title: 'Edge to Edge — Recap',
        lines: [
          'Enter the near edge, target the far edge',
          'The cloud defines both ends',
          'Favour thin clouds + confluence',
          'Next: the full Ichimoku scenario'
        ]
      }
    }
  ]
};
