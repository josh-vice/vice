/* Course3 · 11 — Identifying Access Points             (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/11_identifying_access_points'] = {
  id: 'course3/11_identifying_access_points',
  course: 'Course3_Sharpening_Your_Edge',
  module: '11_Identifying_Access_Points',
  title: 'Identifying Access Points',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's deepen the basics and learn to find access points — the spots that offer high-probability entries. It starts with one question we answered back in Course One: how does price actually move? The answer is the foundation for everything we do here.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Identifying Access Points',
        lines: [
          'Find the **high-probability** entries',
          'Starts with: how does price move?',
          'The foundation for sharper setups'
        ]
      }
    },
    {
      id: 'imbalance',
      type: 'CONCEPT',
      say: "Price moves on imbalance between buyers and sellers. When demand outweighs supply, price rises. When supply outweighs demand, price falls. And the bigger the imbalance — the more aggressive one side is — the stronger the move. When the two are roughly balanced, price goes nowhere: it consolidates. That simple table is the engine under every chart.",
      panel: {
        title: 'Imbalance Drives Price',
        lines: [
          'Demand > supply → price **rises**',
          'Supply > demand → price **falls**',
          'Balanced → price **consolidates**',
          'Bigger imbalance → bigger move'
        ]
      }
    },
    {
      id: 'consolidation',
      type: 'CHART',
      chart: 'consolidation_breakout',
      params: { dir: 'up' },
      stage: 'breakout',
      heading: 'Consolidation Builds the Access Point',
      say: "This is why consolidation matters so much. While price chops sideways, buyers and sellers are coiling against each other, building the imbalance that will eventually resolve. The edge of that range is the access point: when the balance finally tips and price breaks out, you have a defined level, a clear direction, and tight risk. The best entries are born from boredom.",
      show: [
        { kind: 'level',  at: 'rangeHigh', label: 'the access point', side: 'left', tone: 'resistance' },
        { kind: 'level',  at: 'stop', label: 'stop — tight risk', side: 'left', tone: 'stop' },
        { kind: 'marker', at: 'entry', label: 'imbalance tips → entry', style: 'reversal', place: 'above' },
        { kind: 'marker', at: 'breakout', label: 'impulse runs', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'confluence',
      type: 'CONCEPT',
      say: "The highest-probability access points are where everything you've learned lines up. A key level, a clean trigger, the right market structure, supporting volume — when these stack at one price, that's a confluence zone, and that's where you want to deploy risk. One signal is a guess; four agreeing signals is an edge.",
      panel: {
        title: 'High-Probability = Confluence',
        lines: [
          'The best entries are **confluence** zones',
          'Level + trigger + structure + volume aligned',
          'One signal is a guess; four is an **edge**',
          'Deploy risk where they stack'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So: price moves on imbalance, consolidation coils that imbalance, and the access point is where it resolves at a level. Stack your tools for confluence and you turn a vague chart into a precise, repeatable opportunity. Next, we put this to work trading support and resistance directly.",
      panel: {
        title: 'Access Points — Recap',
        lines: [
          'Price moves on **imbalance**',
          'Consolidation coils it; the edge is the access point',
          'Stack tools for **confluence**',
          'Vague chart → precise opportunity'
        ]
      }
    }
  ]
};
