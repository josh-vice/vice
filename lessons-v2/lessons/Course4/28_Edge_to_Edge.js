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
      say: "Now my personal favourite: the edge-to-edge, or E2E — a high-time-frame setup for trading inflection points. The rule: when the setup is green-lit by a decisive close inside the kumo, price tends to travel from that edge of the cloud all the way to the opposite edge. It's often the earliest indication of a macro trend reversal, and the asymmetric payoff can run four to six R plus.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Edge to Edge (E2E)',
        lines: [
          'Decisive close **inside the kumo** → traverse to the **far edge**',
          'The **earliest signal** of a macro trend reversal',
          'Asymmetric setups — **4–6+ R**',
          'Best on **higher time frames** (solid on 4H/6H too)'
        ]
      }
    },
    {
      id: 'prereqs',
      type: 'CONCEPT',
      say: "Three prerequisites — the setup needs all of them. One: a weak TK crossover, bullish or bearish depending on the direction of the reversal. Two: the chikou span above or below price — above for a long, below for a short; if the chikou is still inside price, the market is ranging and nothing is green-lit. Three: a clean, strong close inside the kumo — a sign of strength, not an indecision candle.",
      panel: {
        title: 'The Three Prerequisites',
        lines: [
          '**1 · Weak TK crossover** in the trade direction',
          '**2 · Chikou span** above price for longs, **below for shorts**',
          '**3 · A clean, strong close inside the kumo**',
          'All three — or no setup'
        ]
      }
    },
    {
      id: 'check',
      type: 'CHART',
      chart: 'ichimoku_e2e',
      stage: 'prereq',
      heading: 'Checking the Boxes',
      say: "This chart is setting up the short version, so run the checklist that way. First, the weak bearish TK cross — the Tenkan slipping under the Kijun. Second, the chikou span sitting below price, confirming we're trending rather than ranging. Two boxes ticked; now everything waits on the close.",
      show: [
        { kind: 'marker', at: 'tkCross', label: 'prereq 1 — weak TK cross', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'chikouRef', label: 'prereq 2 — chikou below price', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'entry',
      type: 'CHART',
      chart: 'ichimoku_e2e',
      stage: 'entry',
      heading: 'Green Light',
      say: "There it is — a strong candle closing decisively inside the kumo, with no dispute about it. Prerequisite three, and the setup is active: we can surmise price is likely to travel to the opposite edge. Invalidation always goes back outside the entered edge — above the cloud top for this short. Defined entry, defined stop.",
      show: [
        { kind: 'note',  at: 'entryClose', label: 'prereq 3 — clean close inside the kumo', place: 'below' },
        { kind: 'level', at: 'edgeNear', label: 'entered edge', side: 'left', tone: 'resistance' },
        { kind: 'level', at: 'stop', label: 'stop — back outside the edge', side: 'right', tone: 'stop' }
      ]
    },
    {
      id: 'travel',
      type: 'CHART',
      chart: 'ichimoku_e2e',
      stage: 'all',
      heading: 'Edge to Edge',
      say: "And price traverses the cloud to the far edge — trade complete. Miss the initial close? Pullback entries can be taken at the Tenkan, the Kijun, or the kumo itself; I always let the trade come to me. And notice the payoff logic: the wider the cloud, the bigger the R — my Ethereum two-day example ran about six and a half R, from a $148 entry to a $279 target.",
      show: [
        { kind: 'level', at: 'edgeFar', label: 'target — the far edge', side: 'right', tone: 'target' },
        { kind: 'note',  at: 'exit', label: 'far edge tagged — E2E complete', place: 'below' }
      ]
    },
    {
      id: 'sharpen',
      type: 'CONCEPT',
      say: "Time frames matter. The E2E works best on the daily and above — that's where wide clouds print the four-to-six-R setups and where it can lead macro reversals; the four-hour and six-hour still test solid. Sometimes price completes the edge-to-edge without ever offering an ideal pullback — that's just part of the game. If I miss my entry, so be it.",
      panel: {
        title: 'Sharpening the E2E',
        lines: [
          'Prefer **higher time frames** — wide cloud = **bigger R**',
          'Pullback entries: **Tenkan, Kijun, or kumo**',
          'Stop always **back outside the entered edge**',
          'Can lead **macro reversals**'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the edge-to-edge: weak TK cross, chikou clear of price, and a clean strong close inside the kumo — then price travels to the far edge, with the stop back outside the entered edge. High time frames, wide clouds, big asymmetric R. Next we take the whole masterclass into real market scenarios.",
      panel: {
        title: 'Edge to Edge — Recap',
        lines: [
          '3 prereqs: **weak TK cross + chikou + clean close inside**',
          'Target the **far edge**; stop outside the entered edge',
          'Wide cloud = **bigger payoff**; HTF preferred',
          'Next: live Ichimoku scenarios'
        ]
      }
    }
  ]
};
