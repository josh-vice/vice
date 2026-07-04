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
      say: "So a position is direction and size, anchored by your entry, watched against the mark and liquidation prices, backed by margin, with a P&L that floats until you close. Liquidation in particular deserves your respect — it's tied directly to leverage, which is exactly where we're headed. Next, executing the orders that open and close these positions.",
      panel: {
        title: 'Positions — Recap',
        lines: [
          'Direction (long/short) + size in contracts',
          'Entry, mark, and the **liquidation** price',
          'Margin backs it; P&L floats until you close',
          'Liquidation ties directly to **leverage**'
        ]
      }
    }
  ]
};
