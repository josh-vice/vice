/* Course4 · 02 — The Four Principles of Liquidity Theory (v2 lesson, concept-only) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/02_liquidity_theory'] = {
  id: 'course4/02_liquidity_theory',
  course: 'Course4_Liquidity_Theory',
  module: '02_Liquidity_Theory',
  title: 'The Four Principles',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's look under the hood at what really drives the volatility we trade. After years in the crypto markets, I developed a school of thought to explain where it all comes from — and it traces back to liquidity, which is why I call it liquidity theory. It rests on four founding principles. Let's go through them one by one.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'The Four Principles',
        lines: [
          'What really drives market volatility',
          'It all traces back to **liquidity**',
          'Four founding principles'
        ]
      }
    },
    {
      id: 'p1',
      type: 'CONCEPT',
      say: "Principle one: trading is a zero-sum game. To transact, you need exactly two participants — a buyer and a seller — and the same holds for winners and losers. For every winner, there's a loser. No new wealth is created inside the market; capital simply changes hands. The market is a machine for redistributing money between participants.",
      panel: {
        title: 'One — Zero-Sum Game',
        lines: [
          'Every trade needs a buyer **and** a seller',
          'For every winner, a loser',
          'No new wealth created — capital changes hands',
          'The market redistributes money'
        ]
      }
    },
    {
      id: 'p2',
      type: 'CONCEPT',
      say: "Principle two: market participants are inherently predatory. The exchange between buyers and sellers is rarely passive — it's aggressive, with each side constantly trying to outsmart the other. Larger players pressure the other side into closing their positions, sometimes by sourcing momentum from their own side. Win, and price moves in your favour. But the war never ends; new battles are fought at new levels.",
      panel: {
        title: 'Two — Participants Are Predatory',
        lines: [
          'The buyer–seller exchange is **aggressive**',
          'Each side tries to outsmart the other',
          'Big players pressure others to close',
          'The war never ends — new battles, new levels'
        ]
      }
    },
    {
      id: 'p3',
      type: 'CONCEPT',
      say: "Principle three: buyers and sellers participate in game theory. Because everyone knows the rules — the game is zero-sum and everyone acts in their own self-interest — we can reason about likely outcomes. Understanding the conditions and the incentives of both sides lets us anticipate what each is likely to do, and position for the highest-probability scenario.",
      panel: {
        title: 'Three — Game Theory',
        lines: [
          'Everyone knows the rules and acts self-interestedly',
          'So outcomes can be **reasoned about**',
          'Read both sides’ incentives',
          'Position for the highest-probability scenario'
        ]
      }
    },
    {
      id: 'p4',
      type: 'CONCEPT',
      say: "And principle four, the big one: price gravitates toward the area with the most liquidity. Wherever the most resting orders sit, price tends to be drawn — because that's where the largest players can fill. Once you can identify where liquidity is pooled, relative to the trend and current price, you can read the buy-versus-sell pressure and forecast where price most likely wants to go.",
      panel: {
        title: 'Four — Price Seeks Liquidity',
        lines: [
          'Price is **drawn** to the most liquidity',
          'That’s where big players can fill',
          'Identify where liquidity pools',
          'Read the pressure → forecast the move'
        ]
      }
    },
    {
      id: 'define',
      type: 'CONCEPT',
      say: "So what is liquidity? It's the ability to buy or sell an asset without causing a significant change in price. Slippage is the difference between the expected trade price and the price where the trade actually executes — market buy at 8,000, get filled at 8,050, and that fifty dollars is slippage. So we define liquidity as the area, or areas, where positions can be filled with minimum slippage. Large players hate that fifty dollars just like you do.",
      panel: {
        title: 'What Is Liquidity?',
        lines: [
          'The ability to buy or sell **without moving price**',
          '*Slippage* — expected trade price vs executed price',
          'Buy at 8,000, filled at 8,050 → **$50 of slippage**',
          'Liquidity = **area(s) where positions fill with minimum slippage**'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So those are the four pillars: the game is zero-sum, the players are predatory, they reason via game theory, and price gravitates toward liquidity. Use them to question the market: what's the obvious level others are watching? What's the maximum pain scenario — how can the market redistribute wealth from the many to the few? And remember, liquidity is contextual — the hourly chart's liquidity is not the daily's. Next, we learn to identify liquidity on a chart.",
      panel: {
        title: 'The Four Principles — Recap',
        lines: [
          'Zero-sum · predatory · game theory · seeks liquidity',
          'Where’s the liquidity? Who’s trapped?',
          'Ask the **maximum pain** scenario — the many pay the few',
          'Liquidity is **contextual** — hourly ≠ daily',
          'Next: identifying liquidity on a chart'
        ]
      }
    }
  ]
};
