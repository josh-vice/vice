/* Course4 · 05 — Liquidity Scenarios                   (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/05_liquidity_scenarios'] = {
  id: 'course4/05_liquidity_scenarios',
  course: 'Course4_Liquidity_Theory',
  module: '05_Liquidity_Scenarios',
  title: 'Liquidity Scenarios',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's walk a liquidity structure through a full scenario, the way you'd actually trade it. The plan is always the same: define the range, wait for the trap to spring, enter on the reclaim, and target the far side. Let's see it unfold.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'A Liquidity Scenario',
        lines: [
          'Define the range → wait for the trap',
          'Enter on the **reclaim**, not the deviation',
          'Target the far side of the range'
        ]
      }
    },
    {
      id: 'define',
      type: 'CHART',
      chart: 'range_bound',
      stage: 'all',
      heading: 'Define the Battlefield',
      say: "First, the range. A defined high and low, tested repeatedly — this is where liquidity structures form. The aggressive crowd is watching these exact edges, ready to chase a breakout above the high or a breakdown below the low. Those eager orders are precisely the liquidity a larger player wants to harvest.",
      show: [
        { kind: 'level', at: 'high', label: 'range high', side: 'left' },
        { kind: 'level', at: 'low',  label: 'range low', side: 'left' },
        { kind: 'zone',  side: 'below', of: 'high', label: 'breakout longs wait here' },
        { kind: 'zone',  side: 'above', of: 'low',  label: 'breakdown shorts wait here' }
      ]
    },
    {
      id: 'trap',
      type: 'CHART',
      chart: 'liquidity_sweep_bullish',
      stage: 'reversal',
      heading: 'The Trap Springs',
      say: "Now watch the under-over fire at the range low. Price deviates below the low, the breakdown shorts pile in convinced the range is breaking, and then — snap — price reclaims the level. The shorts are trapped. The reclaim candle is our signal: we enter long there, place our stop below the deviation low, and target the range high.",
      show: [
        { kind: 'level',  at: 'support', label: 'range low', side: 'left' },
        { kind: 'marker', at: 'sweepLow', label: 'deviation — shorts trapped', style: 'sweep', place: 'below' },
        { kind: 'marker', at: 'reclaim', label: 'reclaim = long entry', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'manage',
      type: 'CONCEPT',
      say: "From there it's the risk management you already know. Stop just below the deviation low — if price closes back under, the structure failed and we're out small. Target the opposite edge of the range, where the next pool of liquidity and the breakout crowd sit. Often you'll trail as price approaches the high, since that's where the next over-under could form. One structure flows into the next.",
      panel: {
        title: 'Managing the Scenario',
        lines: [
          'Stop just **below the deviation low**',
          'Target the opposite range edge',
          'Trail as you approach the high',
          'One structure flows into the next'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the liquidity scenario is range, trap, reclaim, target. Define the battlefield, let the aggressive crowd get trapped beyond a level, enter on the reclaim with tight risk, and aim for the far side. This is liquidity theory turned into an actual, repeatable trade. Next, we ask the question all of this is building toward: who is in control?",
      panel: {
        title: 'Liquidity Scenario — Recap',
        lines: [
          'Range → trap → **reclaim** → target',
          'Let the crowd get trapped beyond a level',
          'Enter on the reclaim, tight risk',
          'Liquidity theory as a repeatable trade'
        ]
      }
    }
  ]
};
