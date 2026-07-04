/* Course4 · 16 — FSVZO (Volume Zone Oscillator)        (v2 lesson)
   Not in recon; authored from the source manifest. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/16_fsvzo'] = {
  id: 'course4/16_fsvzo',
  course: 'Course4_Liquidity_Theory',
  module: '16_FSVZO',
  title: 'FSVZO',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Next up is the FSVZO — a volume zone oscillator. Where the colour tools read price, this one reads volume, and it expresses whether the dominant volume is flowing into buying or selling. It lives in a panel below the chart and oscillates between a positive buying zone and a negative selling zone.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'FSVZO — Volume Zones',
        lines: [
          'A **volume**-based oscillator',
          'Reads whether volume is buying or selling',
          'Swings between a buy zone and a sell zone'
        ]
      }
    },
    {
      id: 'chart',
      type: 'CHART',
      chart: 'fsvzo',
      stage: 'all',
      heading: 'Reading the Volume Zones',
      say: "Watch the oscillator in the panel. As price pushes up, it climbs into the positive buying zone — volume is confirming the move. When price rolls over and falls, it drops into the negative selling zone — sellers now dominate the flow. Then it flips back positive as buyers retake control. Those zone flips often line up with momentum shifts on the price chart.",
      show: [
        { kind: 'marker', at: 'buyZone', label: 'buying-volume zone', style: 'dot', place: 'above', panel: 'sub' },
        { kind: 'marker', at: 'zeroCross', label: 'zone flip', style: 'reversal', place: 'below', panel: 'sub' },
        { kind: 'marker', at: 'sellZone', label: 'selling-volume zone', style: 'sweep', place: 'below', panel: 'sub' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "The most useful signal is the flip between zones, and divergence — when price makes a new high but the oscillator can't, the way we saw with cumulative delta. It's another window onto whether real volume is backing a move. As always, it's confluence: a zone flip at a key level is far more meaningful than one in the middle of nowhere.",
      panel: {
        title: 'How to Use FSVZO',
        lines: [
          'The **zone flip** is the key signal',
          'Watch for divergence with price',
          'Confirms whether volume backs a move',
          'Most meaningful **at a level**'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the FSVZO turns volume into a clear buy-zone-versus-sell-zone read, with flips and divergences flagging momentum shifts. It pairs naturally with the sentiment variables from earlier. Next, the premium tools that combine several of these ideas — starting with Crayons.",
      panel: {
        title: 'FSVZO — Recap',
        lines: [
          'Volume as a buy-zone / sell-zone oscillator',
          'Flips and divergences flag shifts',
          'Pairs with the sentiment variables',
          'Next: the Crayons indicator'
        ]
      }
    }
  ]
};
