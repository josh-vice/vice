/* Course3 · 12 — Trading Support & Resistance          (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/12_trading_sr'] = {
  id: 'course3/12_trading_sr',
  course: 'Course3_Sharpening_Your_Edge',
  module: '12_Trading_SR',
  title: 'Trading Support & Resistance',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now that we can identify DBS and SSR zones, let's actually trade them. The mantra hasn't changed since Course One: be a buyer at support, a seller at resistance. What's new is that the zones give us a clear picture of where support and resistance really live — and two concrete strategies for engaging them.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Trading Support & Resistance',
        lines: [
          'Buy **support**, sell **resistance**',
          'DBS / SSR zones show you where',
          'Two strategies: aggressive & conservative'
        ]
      }
    },
    {
      id: 'strategies',
      type: 'CONCEPT',
      say: "The aggressive strategy for longs: bids along the upper limit of a DBS zone, stop-loss below the zone. Shorts mirror it — asks at the lower limit of an SSR zone, stop above. The conservative strategy layers bids or asks within the zone, stop beyond a separate level where your thesis is invalidated. Zones work beautifully as levels in the LTE framework — but they aren't complete setups with exit targets, so always journal them.",
      panel: {
        title: 'Two Zone Strategies',
        lines: [
          '**Aggressive** — bids at the DBS **upper limit**, stop below the zone',
          '(shorts: asks at the SSR lower limit, stop above)',
          '**Conservative** — **layered** bids/asks in the zone,',
          'stop beyond a separate **invalidation** level',
          'Zones = LTE levels, not full setups — **journal them**'
        ]
      }
    },
    {
      id: 'bounce-hold',
      type: 'CHART',
      chart: 'horizontal_sr',
      params: { as: 'support' },
      stage: 'hold',
      heading: 'Buy the Support',
      say: "Here's a clean horizontal support. Each time price drops into it, demand steps in and lifts it back up. That's the tradable access point: bids at the level, a trigger candle confirming buyers, and the stop just beneath the zone. The first test is the strongest — the depletion factor at work.",
      show: [
        { kind: 'level',  at: 'level', label: 'support — the DBS level', side: 'left', tone: 'support' },
        { kind: 'level',  at: 'longStop', label: 'stop — just beneath the zone', side: 'right', tone: 'stop' },
        { kind: 'marker', at: 'touch1', label: 'buy the first test — strongest', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'bounce-break',
      type: 'CHART',
      chart: 'horizontal_sr',
      params: { as: 'support' },
      stage: 'break',
      heading: 'S/R Is Finite',
      say: "But support and resistance are finite. Every retest consumes more of the resting orders, each bounce comes back weaker, and eventually the level gives way. So respect the count: the later the test, the worse the long — and the closer the breakdown. We'll formalise this as a range rule in the next lesson.",
      show: [
        { kind: 'marker', at: 'touch3', label: 'each test weaker — depletion', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'breakdown', label: 'the level finally gives way', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'flip-break',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'breakout',
      heading: 'The S/R Flip',
      say: "Now the concept I really want to emphasise: the S/R flip — a level flipping from resistance to support, or support to resistance. They tend to occur around the very DBS and SSR zones we've marked. Here price is rejected twice at a resistance… then breaks and trades above it. That's the cue to start looking for the flip trade.",
      show: [
        { kind: 'level',  at: 'level', label: 'resistance — rejected twice', side: 'left', tone: 'resistance' },
        { kind: 'marker', at: 'breakout', style: 'dot', place: 'above', label: 'breaks & trades above' }
      ]
    },
    {
      id: 'flip-retest',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      heading: 'Trade the Flip Retest',
      say: "For longs: buy the broken resistance once price trades above it. Place bids back at the old zone, set the stop below the last higher low, and expect the uptrend to continue. Our old SSR may have just become a DBS. This is the essence of successful trading — a tight stop, a clear invalidation, and entry in the direction of the break.",
      show: [
        { kind: 'marker', at: 'retest', label: 'buy the retest — SSR → DBS', style: 'reversal', place: 'below' },
        { kind: 'level',  at: 'stop', label: 'stop — below the higher low', side: 'right', tone: 'stop' },
        { kind: 'marker', at: 'top', label: 'uptrend continuation', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So: buyers at support, sellers at resistance — both at established levels and at the new ones created by S/R flips in real time. Choose aggressive or conservative zone entries, keep your stop tied to a real invalidation, and journal every setup, because that's how these loose frameworks become your system. Next, the markets that aren't trending: ranges.",
      panel: {
        title: 'Trading S/R — Recap',
        lines: [
          'Buy support, sell resistance — old **and flipped**',
          'Aggressive edge bids vs **layered** conservative entries',
          'Stop = a real **invalidation**, not a guess',
          '**Journal** every setup'
        ]
      }
    }
  ]
};
