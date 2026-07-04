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
      say: "Price moves on imbalance between buyers and sellers. When demand outweighs supply, price rises. When supply outweighs demand, price falls. And the bigger the imbalance — the more aggressive one side is — the stronger the move. When the two are roughly balanced, price consolidates. Every price movement, continuation or reversal, has consolidation in between — and those zones are our access points into the market.",
      panel: {
        title: 'Imbalance Drives Price',
        lines: [
          'Demand > supply → price **rises**',
          'Supply > demand → price **falls**',
          'Balanced → price **consolidates**',
          'Consolidation zones = **access points**'
        ]
      }
    },
    {
      id: 'zones',
      type: 'CONCEPT',
      say: "Consolidation forms one of two kinds of zone. A DBS zone — demand, buyers, support — is drawn from the low of the range, wicks included, up to the highest opening price. An SSR zone — supply, sellers, resistance — runs from the high, wicks included, down to the lowest opening price. Each can also be a single candlestick: a significant down candle before a higher high makes a DBS; an up candle before a lower low makes an SSR.",
      panel: {
        title: 'DBS & SSR Zones',
        lines: [
          '**DBS** — Demand · Buyers · Support',
          'Low (incl. wicks) → **highest opening price**',
          '**SSR** — Supply · Sellers · Resistance',
          'High (incl. wicks) → **lowest opening price**',
          'Or a **single candle** before the HH / LL'
        ]
      }
    },
    {
      id: 'retest',
      type: 'CHART',
      chart: 'uptrend',
      stage: 'all',
      heading: 'The Zone Is the Access Point',
      say: "Here's the idea at work. A zone forms, price makes a significant higher high away from it — then comes back to retest it. That retest is the access point: buyers step in at the DBS zone and push price to another higher high, continuing the trend. You're not chasing the move; you're entering where demand already proved itself, with invalidation just beyond the zone.",
      show: [
        { kind: 'zone',   side: 'below', of: 'flipLevel', depth: 6, tone: 'reward', label: 'DBS zone' },
        { kind: 'marker', at: 'hh1', label: 'strength — explosive move away', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'hl2', label: 'retest — buyers step in', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'hh2', label: 'trend continues', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'fundamentals',
      type: 'CONCEPT',
      say: "Three fundamentals decide whether a zone is worth trading. Strength: the more explosive the breakout from the zone — speed and distance — the stronger it is. Time: the less time a zone took to form, the stronger it is; a single candle means one side seized control instantly. Depletion: the strongest reaction always comes on the first test — every retest consumes resting orders until the zone gives way. Not obvious at a glance? Not a valid zone.",
      panel: {
        title: 'The Three Fundamentals',
        lines: [
          '**Strength** — explosive breakout = stronger zone',
          '**Time** — less time forming = stronger zone',
          '**Depletion** — best reaction on the **first test**',
          'Retests consume the orders until it gives way',
          'Not obvious at a glance? Not a valid zone'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So: price moves on imbalance, consolidation zones form between moves, and those zones — DBS for demand, SSR for supply — are your access points. Judge them by strength, time, and depletion, and favour the first test. Next, we put this to work with concrete strategies for trading support and resistance.",
      panel: {
        title: 'Access Points — Recap',
        lines: [
          'Price moves on **imbalance**',
          'Consolidation → **DBS / SSR** zones',
          'Judge by **strength · time · depletion**',
          'Favour the **first test**'
        ]
      }
    }
  ]
};
