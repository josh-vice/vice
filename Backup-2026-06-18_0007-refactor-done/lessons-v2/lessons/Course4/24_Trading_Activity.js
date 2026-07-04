/* Course4 · 24 — Trading Activity                      (v2 lesson, concept-only)
   Not in recon; authored from the source manifest. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/24_trading_activity'] = {
  id: 'course4/24_trading_activity',
  course: 'Course4_Liquidity_Theory',
  module: '24_Trading_Activity',
  title: 'Trading Activity',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's go one level deeper, to the raw trading activity beneath all those aggregated numbers. Funding and open interest are summaries; trading activity is the live flow of orders actually hitting the market — the aggressive buys and sells, the volume printing in real time. It's the closest you get to watching the battle as it happens.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Trading Activity',
        lines: [
          'The **raw order flow** beneath the summaries',
          'Aggressive buys and sells, live',
          'The battle as it happens'
        ]
      }
    },
    {
      id: 'reads',
      type: 'CONCEPT',
      say: "Two things to watch. Aggression: are market buyers lifting offers, or are sellers hitting bids? That tells you who's willing to pay up, which is often who's in control short-term. And absorption: when heavy selling hits a level but price refuses to drop, a large player is quietly absorbing it — a strong tell that the level will hold. Activity reveals intent that a candle alone hides.",
      panel: {
        title: 'What to Read',
        lines: [
          '**Aggression** — who’s lifting or hitting?',
          '**Absorption** — heavy flow, but price holds',
          'Absorption = a big player defending a level',
          'Intent the candle hides'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So trading activity is the live, granular view of the buyer-seller fight — useful for confirming that a level is being defended or attacked in real time. It's advanced, and you don't need it to be profitable, but it sharpens your read at key moments. Next, we round up the Hyblock indicator suite.",
      panel: {
        title: 'Trading Activity — Recap',
        lines: [
          'Live order flow at a level',
          'Confirms defence or attack in real time',
          'Advanced — sharpens key moments',
          'Next: the Hyblock indicators'
        ]
      }
    }
  ]
};
