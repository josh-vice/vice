/* Course3 · 10 — Margin Management                     (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/10_margin_management'] = {
  id: 'course3/10_margin_management',
  course: 'Course3_Sharpening_Your_Edge',
  module: '10_Margin_Management',
  title: 'Margin Management',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's continue that swing trade and talk about managing it. Entering well is only half the job; what you do once a trade is working separates a good win from a great one. My journal told me this particular setup had a very high win rate, which earned it a more hands-on exit than my usual set-and-forget.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Margin Management',
        lines: [
          'Managing the trade after entry',
          'A good entry is only half the job',
          'A high-win-rate setup earns active management'
        ]
      }
    },
    {
      id: 'works',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'play',
      heading: 'The Trade Works — and Then Some',
      say: "A couple of weeks in, I got an alert: price had broken clean through my original take-profit and kept going. Now I had a decision. I could book a larger-than-expected win and move on, or I could manage the position and let the winner run. With a swing time horizon, I had room to do the second — so I zoomed out to decide.",
      show: [
        { kind: 'level',  at: 'entry',  label: 'entry', side: 'left', tone: 'reward' },
        { kind: 'level',  at: 'target', label: 'original take-profit', side: 'left', tone: 'target' },
        { kind: 'marker', at: 'tp',      label: 'tagged target', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'runHigh', label: 'blew through target — let it run?', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'cloud',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Zoom Out: the Cloud Green-Lights It',
      say: "On the higher timeframe, something important: price was holding firmly above a green Ichimoku cloud — exactly the confluence my system uses to justify holding a winner. The trend was intact, the cloud was bullish, so instead of taking profit I trailed my stop up beneath structure and let the position keep working in my favour.",
      show: [
        { kind: 'note',  at: 'aboveCloud', label: 'above green cloud → hold the winner', place: 'above' },
        { kind: 'marker', at: 'pullback', label: 'bounced off Kijun — trend intact', style: 'reversal', place: 'below' },
        { kind: 'level',  at: 'kijunLevel', label: 'Kijun — structure', side: 'left', tone: 'support' },
        { kind: 'level',  at: 'stop', label: 'trailed stop beneath structure', side: 'right', tone: 'reward' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So margin management is really about managing winners and your exposure with intention. Don't reflexively take the first target if your system and the higher-timeframe picture say the trend has more to give. Trail your stop, lean on confluence like the cloud, and let your risk management decide how much of the move you keep. Next, we sharpen entries by identifying high-probability access points.",
      panel: {
        title: 'Margin Management — Recap',
        lines: [
          'Manage winners and exposure with intention',
          'Don’t reflexively cap a strong trend',
          'Trail your stop; lean on **confluence**',
          'Let risk management decide how much you keep'
        ]
      }
    }
  ]
};
