/* Course3 · 05 — Getting Into Positions                (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/05_getting_into_positions'] = {
  id: 'course3/05_getting_into_positions',
  course: 'Course3_Sharpening_Your_Edge',
  module: '05_Getting_into_Positions',
  title: 'Getting Into Positions',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's open a position and learn to read it. When you buy or sell a derivative, the exchange tracks it in your positions area — your live trades, plus any resting orders waiting to fill. Knowing what every number means is the difference between trading and gambling.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Reading a Position',
        lines: [
          'Your open trades and resting orders',
          'Every number means something',
          'Read it well, or you’re gambling'
        ]
      }
    },
    {
      id: 'long-short',
      type: 'CONCEPT',
      say: "First, direction and size. A long position profits when price rises; a short profits when price falls. Your size is measured in contracts — the unit of the derivatives market. With derivatives you can just as easily be short as long, which means you can aim to profit whether the market goes up or down.",
      panel: {
        title: 'Long, Short & Size',
        lines: [
          '**Long** profits as price rises',
          '**Short** profits as price falls',
          'Size is measured in **contracts**',
          'Profit in either direction'
        ]
      }
    },
    {
      id: 'anatomy',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'plan',
      heading: 'One Trade, Three Tabs',
      say: "Here's a whole trade mapped onto the tabs. The Positions tab shows the open long — in the video, one contract entered at 7173. The Active Orders tab holds the resting limit sell at 7500, waiting in the book to take profit. And the Stops tab holds the stop-market at 7100, untriggered beneath the invalidation. Three tabs, three levels — the entire setup, readable at a glance.",
      show: [
        { kind: 'level', at: 'entry',  label: 'open long — Positions tab', side: 'left', tone: 'reward' },
        { kind: 'level', at: 'target', label: 'resting limit sell — Active Orders tab', side: 'left', tone: 'target' },
        { kind: 'level', at: 'stop',   label: 'stop-market, untriggered — Stops tab', side: 'left', tone: 'risk' }
      ]
    },
    {
      id: 'numbers',
      type: 'CONCEPT',
      say: "Now the key numbers on any open position. Your entry price is where you got in. The mark price is the exchange's fair current value, used to calculate things in real time. The liquidation price is the line you never want to reach — where the exchange force-closes you. Margin is the capital backing the trade. And unrealized P&L is your floating profit or loss, which only becomes realized when you close.",
      panel: {
        title: 'The Numbers That Matter',
        lines: [
          '**Entry** — where you got in',
          '**Mark** — fair current value',
          '**Liquidation** — where you get force-closed',
          '**Margin** — capital backing the trade',
          '**Unrealized P&L** — floating until you close'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So a position is direction and size, anchored by your entry, watched against the mark and liquidation prices, backed by margin, with a P&L that floats until you close. The other tabs complete the picture: Closed Positions and Fills log your history, and when a trade closes, the realized P&L lands in your wallet balance. Liquidation deserves your respect — it's tied directly to leverage, which is where we're headed.",
      panel: {
        title: 'Positions — Recap',
        lines: [
          'Direction (long/short) + size in contracts',
          'Entry, mark, and the **liquidation** price',
          'Tabs: positions · active orders · stops · **fills**',
          'Closed trades → realized P&L → the **wallet**',
          'Liquidation ties directly to **leverage**'
        ]
      }
    }
  ]
};
