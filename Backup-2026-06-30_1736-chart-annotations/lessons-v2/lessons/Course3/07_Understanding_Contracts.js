/* Course3 · 07 — Understanding Contracts               (v2 lesson, concept-only) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/07_understanding_contracts'] = {
  id: 'course3/07_understanding_contracts',
  course: 'Course3_Sharpening_Your_Edge',
  module: '07_Understanding_Contracts',
  title: 'Understanding Contracts',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's look under the hood at contract details. We won't go deep yet — this is a primer for the sentiment data you'll study in the advanced course. But a few of these numbers are worth knowing now, because they hint at what the broader market is doing beneath the price.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Contract Details',
        lines: [
          'A primer for the advanced course',
          'A few numbers reveal the **market beneath price**',
          'Just the basics for now'
        ]
      }
    },
    {
      id: 'numbers',
      type: 'CONCEPT',
      say: "Three to know. The index price is the contract's fair anchor, built from the prices of several spot exchanges so no single venue can distort it. Twenty-four-hour turnover is the total value of contracts traded in a day — a measure of activity. And open interest is the number of contracts currently open and unsettled — a measure of how much money is actually committed to the market right now.",
      panel: {
        title: 'The Numbers Worth Knowing',
        lines: [
          '**Index price** — fair anchor from many spot exchanges',
          '**24h turnover** — value traded in a day (activity)',
          '**Open interest** — open contracts (committed money)'
        ]
      }
    },
    {
      id: 'why',
      type: 'CONCEPT',
      say: "Why flag these now? Because they're the raw material of sentiment analysis. Rising open interest into a move tells you fresh money is backing it; the funding rate tells you which side is paying to hold their position, hinting at who's offside. In Liquidity Theory you'll use these to gauge where price is likely headed — and who's about to get squeezed.",
      panel: {
        title: 'Why This Matters Later',
        lines: [
          'These feed **sentiment analysis**',
          'Open interest → is fresh money backing the move?',
          'Funding rate → who’s paying, who’s offside',
          'The heart of the **Liquidity Theory** course'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So keep these in your back pocket: the index price anchors fair value, turnover measures activity, and open interest measures commitment. You don't need to act on them yet — just know they exist, because they become powerful tools once we reach sentiment and liquidity theory. Next, the big one: leverage.",
      panel: {
        title: 'Contracts — Recap',
        lines: [
          'Index price = fair anchor',
          'Turnover = activity; open interest = commitment',
          'The raw material of sentiment data',
          'Powerful once you reach Liquidity Theory'
        ]
      }
    }
  ]
};
