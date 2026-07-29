/* Course4 · 25 — Hyblock Indicators                    (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/25_hyblock_indicators'] = {
  id: 'course4/25_hyblock_indicators',
  course: 'Course4_Liquidity_Theory',
  module: '25_Hyblock_Indicators',
  title: 'Hyblock Indicators',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Finally, the graphing feature: Hyblock's proprietary indicators, drawn straight onto a TradingView chart. The suite: net longs and net shorts, cumulative longs and shorts, the long/short delta, volume delta, and cumulative volume delta — plus the Binance indicators, global accounts and top-trader positioning. Everything from the trading activity tab, now living under your candles at any time interval.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'The Hyblock Indicator Suite',
        lines: [
          'Net longs / shorts · **cumulative** longs / shorts',
          'Long/short delta · volume delta · **CVD**',
          'Binance: **global accounts vs top traders**',
          'All charted under price'
        ]
      }
    },
    {
      id: 'net',
      type: 'CONCEPT',
      say: "Definitions first. Net means entering minus exiting: five contracts open as a short, three close — that's net two. These are market orders, taker positions. Green prints opening, red closing. Cumulative longs and shorts plot each side's running total — longs greenish, shorts pink; when the two curves flatten and shadow each other, nobody's pressing — that can flag consolidation.",
      panel: {
        title: 'Net & Cumulative',
        lines: [
          '**Net** = entering − exiting (5 − 3 = net 2)',
          'Market orders — **taker** positions',
          'Cumulative = each side’s running total',
          'Flat, mirrored curves → **consolidation**'
        ]
      }
    },
    {
      id: 'cvd',
      type: 'CONCEPT',
      say: "Volume delta is market buys minus market sells, per candle; cumulative volume delta adds it up across every interval on the chart. The thing to know about CVD: its peaks tend to line up with price peaks. Mark a vertical line at each CVD spike and you'll often find a local top — that read helped me enter a short at $9,910, backed by a liquidation level below.",
      panel: {
        title: 'Volume Delta & CVD',
        lines: [
          'Volume delta = **market buys − sells**',
          '**CVD** = summed across every candle',
          'CVD **peaks ≈ price tops**',
          'Worked example: short from **$9,910**'
        ]
      }
    },
    {
      id: 'groups',
      type: 'CONCEPT',
      say: "Now the centerpiece — the Binance indicators. Global long/short accounts takes every account on Binance and buckets each one long or short by its own cumulative delta: call that retail. Top trader positions takes the top twenty percent by size and does the same: call them the whales. Drop both into one pane and you're watching retail versus the whales, live.",
      panel: {
        title: 'Retail vs Whales',
        lines: [
          '**Global accounts** — every account → retail',
          '**Top traders** — top 20% by size → whales',
          'Each bucketed by its cumulative delta',
          'Overlay the panes: **retail vs whales**'
        ]
      }
    },
    {
      id: 'divergence',
      type: 'CHART',
      chart: 'cumulative_delta',
      stage: 'all',
      heading: 'The Divergence',
      say: "Read the sub-panel as the top-trader line. Into one top, retail shot up — everyone long — while the whales' positioning rolled over: distribution into retail accumulation. That divergence called the top, and price fell from roughly $9,500 to $8,400. Flip it round for the other signal: top traders long while global accounts go short means big money diverging from the crowd — an upside breakout becomes more likely.",
      show: [
        { kind: 'marker', at: 'high1', panel: 'sub', label: 'top traders peak — distribution', style: 'dot' },
        { kind: 'marker', at: 'top', label: 'retail chases the high', style: 'sweep', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So the suite gives you every sentiment curve on one chart — and uniquely, a BitMEX price chart with Binance indicators, a true multi-exchange view. Layer them, get creative, and combine with the trading activity tab, liquidation levels, and the positions heatmap. None of it is 100% — it's confluence for your bias. That closes the Hyblock toolkit. Next: the Ichimoku masterclass.",
      panel: {
        title: 'Hyblock Indicators — Recap',
        lines: [
          'Every sentiment curve, **on the chart**',
          'Retail vs whales = the strongest tell',
          'Multi-exchange: BitMEX price, Binance data',
          'Confluence, **never certainty**',
          'Next: the **Ichimoku masterclass**'
        ]
      }
    }
  ]
};
