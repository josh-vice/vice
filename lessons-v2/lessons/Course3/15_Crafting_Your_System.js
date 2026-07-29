/* Course3 · 15 — Crafting Your System                  (v2 lesson, concept-only) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/15_crafting_your_system'] = {
  id: 'course3/15_crafting_your_system',
  course: 'Course3_Sharpening_Your_Edge',
  module: '15_Crafting_Your_System',
  title: 'Crafting Your System',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "You've heard the word system thrown around all course — today we take the deep dive. A trading system is a complete framework for engaging with financial markets. It includes specifics for both risk and position sizing, plus clear, predefined rules for which trades you take and how you enter and exit them. The goal: remove the guesswork, so your trading gets consistent.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Crafting Your System',
        lines: [
          'A **complete framework** for engaging markets',
          'Specifics for **risk** and **position sizing**',
          'Predefined rules for **entries** and **exits**',
          'Remove guesswork → become consistent'
        ]
      }
    },
    {
      id: 'components',
      type: 'CONCEPT',
      say: "A trading system will include — but isn't limited to — seven components: the markets it trades, the timeframes it uses, the risk it allows, the specific trade setups it takes, its entry triggers, its exit triggers, and its trade management rules. Let's break each one down.",
      panel: {
        title: 'The Seven Components',
        lines: [
          '**1 · Markets** — 2 · **Timeframes**',
          '**3 · Risk** — 4 · **Trade Setups**',
          '**5 · Entry Triggers** — 6 · **Exit Triggers**',
          '**7 · Trade Management**'
        ]
      }
    },
    {
      id: 'markets-risk',
      type: 'CONCEPT',
      say: "Markets: does your system prefer range-bound or trending conditions, volatile or quiet? Timeframes: which one do you analyze and which do you execute on — say, analyze the daily for swings, execute on the four-hour — and how long do you expect to hold? Risk and setups: the maximum risk each trade warrants, and your total acceptable drawdown, tied to the win rate and average R multiple in your journal.",
      panel: {
        title: 'Markets · Timeframes · Risk',
        lines: [
          '**Markets** — ranging vs trending, volatile vs quiet',
          '**Timeframes** — analyze one, execute another',
          '**Risk** — max risk per trade, per your journal',
          'State your **total acceptable drawdown**'
        ]
      }
    },
    {
      id: 'triggers',
      type: 'CONCEPT',
      say: "Is your system technical or discretionary? A technical system leans on indicators and their conditions — say, long when price is above a moving average and an oscillator crosses a threshold. A discretionary system relies on market structure and visual cues, like the LTE framework. Triggers also define which order types you use — limits that wait, or stops and markets that take liquidity — and management: hands-off, or compounding and averaging by rule.",
      panel: {
        title: 'Setups · Triggers · Management',
        lines: [
          '**Technical** — indicators and their conditions',
          '**Discretionary** — market structure, visual cues (LTE)',
          'Triggers name your **order types**',
          'Management: hands-off vs **compounding** by rule'
        ]
      }
    },
    {
      id: 'trust',
      type: 'CONCEPT',
      say: "One point is crucial: trust your system after you've crafted it. Losing streaks are inevitable, even for the most robust systems — a strong one simply produces more winners than losers over time. Stay disciplined through drawdown; if you abandon it after a few losses, blame your discipline, not the system. But if it loses more than your total acceptable drawdown, that's the cue to revamp or rebuild.",
      panel: {
        title: 'Trust the System',
        lines: [
          'Losing streaks are **inevitable** — even for robust systems',
          'Discipline through drawdown, or blame yourself',
          'Breach the acceptable drawdown → **revamp**',
          'You can run **multiple systems** for different conditions'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So a system is your complete framework: markets, timeframes, risk, trade setups, entry triggers, exit triggers, and trade management. The more explicit it is, the more consistent your trading becomes — add discretion only as experience grows. Next lesson we look at how to implement a system, with a trading plan.",
      panel: {
        title: 'Crafting Your System — Recap',
        lines: [
          'Seven components, written down',
          'More **explicit** → more consistent',
          'Trust and follow it to a tee',
          'Next: implementing it with a **trading plan**'
        ]
      }
    }
  ]
};
