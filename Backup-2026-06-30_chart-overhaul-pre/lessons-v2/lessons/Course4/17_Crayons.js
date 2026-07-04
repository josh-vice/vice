/* Course4 · 17 — Crayons                               (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/17_crayons'] = {
  id: 'course4/17_crayons',
  course: 'Course4_Liquidity_Theory',
  module: '17_Crayons',
  title: 'Crayons',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Now we move into the premium indicators, starting with Crayons, developed by In Silico. The simplest way to think about Crayons is as a hybrid: it takes the best of the Trend Buddy and the PAL tool and combines them. From PAL it inherits dynamic levels; from Trend Buddy, the colour-coded trend. Two tools in one overlay.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Crayons',
        lines: [
          'A premium tool by In Silico',
          'A hybrid of **Trend Buddy + PAL**',
          'Dynamic levels **and** colour-coded trend'
        ]
      }
    },
    {
      id: 'chart',
      type: 'CHART',
      chart: 'color_tool',
      params: { scheme: 'crayons' },
      stage: 'all',
      heading: 'Crayons: Levels + Colour',
      say: "Here it is. The candles are crayoned by trend — green while buyers lead, red once sellers take over, and a neutral grey for indecision. And overlaid on top are the dynamic support and resistance levels, which hold no matter the timeframe you analyse. In one glance you get both the trend's colour and the price levels that matter.",
      show: [ { kind: 'marker', at: 'bottom', style: 'dot', place: 'below', label: 'crayon turns green' },
        { kind: 'level',  at: 'resLevel', label: 'dynamic resistance', side: 'left' },
        { kind: 'level',  at: 'supLevel', label: 'dynamic support', side: 'left' },
        { kind: 'marker', at: 'top', label: 'crayon turns red', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'use',
      type: 'CONCEPT',
      say: "Because Crayons bundles trend and levels, it's tempting to treat it as a complete system — don't. The colours and levels are still inputs to your decision, strongest when they agree with your structure and sentiment read. Used as confluence, it's a powerful one-glance tool. Used as a crutch, it's just two ways to get the same false confidence.",
      panel: {
        title: 'Use Crayons as Confluence',
        lines: [
          'Bundles trend colour + levels in one view',
          'Still **inputs**, not a complete system',
          'Strongest when it agrees with your read',
          'Powerful as confluence; dangerous as a crutch'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So Crayons merges the colour-coded trend of the Trend Buddy with the auto-levels of PAL into one premium overlay. Great for a fast read, as long as you keep it in its place as confluence. Next, the tool that's eerily good at calling local tops and bottoms: Genie.",
      panel: {
        title: 'Crayons — Recap',
        lines: [
          'Trend colour + dynamic levels, combined',
          'A fast one-glance read',
          'Keep it as confluence',
          'Next: the Genie indicator'
        ]
      }
    }
  ]
};
