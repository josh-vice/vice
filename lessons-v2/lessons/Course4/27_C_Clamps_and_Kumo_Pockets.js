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
      say: "Two more Ichimoku nuances today, and both are counter-trend. A C-clamp is Ichimoku's way of highlighting overbought and oversold conditions — the Tenkan tearing away from the Kijun. A kumo pocket is an area inside the cloud that acts like a DBS or SSR zone — S/R with a high probability of rejecting price. Both build on the same truth: price always wants to return to the Kijun.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'C-Clamps & Kumo Pockets',
        lines: [
          '**C-clamp** — Tenkan/Kijun divergence = overextension',
          '**Kumo pocket** — cloud S/R, like DBS/SSR',
          'Both are **counter-trend** plays',
          'Built on mean reversion to the Kijun'
        ]
      }
    },
    {
      id: 'clamp',
      type: 'CHART',
      chart: 'ichimoku_cclamp',
      stage: 'extend',
      heading: 'The C-Clamp',
      say: "Watch the blow-off leg. The fast Tenkan gets torn away from the Kijun, and the gap between the two lines curls into a C shape. That divergence is the C-clamp: Ichimoku's way of highlighting an overbought or oversold condition. The wider the gap, the further the trend is from equilibrium — and the more it needs a reversion to the mean before continuing or reversing.",
      show: [
        { kind: 'level',  at: 'tenkanPeak', label: 'Tenkan — torn away', side: 'right', tone: 'risk' },
        { kind: 'level',  at: 'kijunPeak', label: 'Kijun — the mean, left behind', side: 'left', tone: 'support' },
        { kind: 'marker', at: 'clampPeak', label: 'the C — overextension', style: 'sweep', place: 'above' }
      ]
    },
    {
      id: 'revert',
      type: 'CHART',
      chart: 'ichimoku_cclamp',
      stage: 'revert',
      heading: 'Reversion to the Mean',
      say: "Then it resolves: price mean-reverts back down and tags the Kijun. The C-clamp is a counter-trend strategy by nature — you're fading the blow-off back to the mean, not chasing it. And note the other side from last lesson: a first tap of a Kijun that hasn't been tested in weeks gives the strongest reaction — depletion factor. One caution: clamps can draw out for days, even weeks, before resolving.",
      show: [
        { kind: 'marker', at: 'revert', label: 'mean reversion tags the Kijun', style: 'reversal', place: 'below' },
        { kind: 'level',  at: 'kijunLevel', label: 'reversion target — the mean', side: 'right', tone: 'target' }
      ]
    },
    {
      id: 'pocketdef',
      type: 'CONCEPT',
      say: "Nuance two: kumo pockets. A pocket is an area inside the cloud — a spot where a Senkou span rolled over and left a pocket in the kumo — and these carry a high probability of rejecting price. It's simply another way to visualize support and resistance, just like our DBS and SSR zones: be a buyer at support, a seller at resistance. Pockets give us fresh access points into the market.",
      panel: {
        title: 'Kumo Pockets',
        lines: [
          'An area **inside the cloud** where a span rolled over',
          '**High probability of rejecting** price',
          'Another way to visualize **S/R** — like DBS/SSR',
          'Strongest on the **first test** (depletion factor)'
        ]
      }
    },
    {
      id: 'pocket',
      type: 'CHART',
      chart: 'ichimoku_pocket',
      stage: 'approach',
      heading: 'The Pocket',
      say: "Here's one. Senkou span A flattened out and rolled over, leaving this pocket in the kumo — an area of interest sitting under price. Mark its edges like any zone. From my journaling these work best in downtrends, though they work in uptrends too — the mechanism is the same: the pocket is untested S/R waiting for its first visitor.",
      show: [
        { kind: 'level', at: 'pocketTop', label: 'kumo pocket — top', side: 'left', tone: 'support' },
        { kind: 'level', at: 'pocketBot', label: 'kumo pocket — bottom', side: 'left', tone: 'support' }
      ]
    },
    {
      id: 'test',
      type: 'CHART',
      chart: 'ichimoku_pocket',
      stage: 'test',
      heading: 'First Test',
      say: "Price pulls back and probes the pocket for the first time. The wick trades into the zone — and the candle closes straight back out. That's the rejection, and it's the strongest one this pocket will ever give: first test, full depletion factor, exactly like a fresh DBS or SSR zone. Scatter orders through the pocket or at its back end, invalidation beyond the swing.",
      show: [
        { kind: 'marker', at: 'firstTest', label: 'first test — wick into the pocket', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'deplete',
      type: 'CHART',
      chart: 'ichimoku_pocket',
      stage: 'all',
      heading: 'Depletion Applies',
      say: "The rejection sticks and price moves away. If price returns for a second test, that can still provide a valid trade — but every test consumes the pocket. Like any visualization of support and resistance, the more a level gets tested, the weaker it becomes. Best reaction: the first test. Second test: still tradeable. Beyond that, treat the pocket as spent.",
      show: [
        { kind: 'note', at: 'bounce', label: 'rejected → price moves away', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So: a C-clamp is Tenkan–Kijun divergence — Ichimoku's overbought and oversold — resolved by mean reversion back to the Kijun, and traded counter-trend. Kumo pockets are cloud S/R that reject price hardest on the first test, then deplete. Start thinking about rules for incorporating both. Next up, my personal favourite trade setup: the edge-to-edge.",
      panel: {
        title: 'Two Nuances — Recap',
        lines: [
          '**C-clamp** = TK divergence → mean reversion to the Kijun',
          'Ichimoku’s **overbought/oversold** — traded **counter-trend**',
          '**Pocket** = cloud S/R; first test strongest, then depletes',
          'Next: the **edge-to-edge**'
        ]
      }
    }
  ]
};
