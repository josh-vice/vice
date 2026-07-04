/* Course1 · 14 — Optimizing Returns                   (v2 lesson, concept-only)
   Source provenance (read-only): YouTube WwLYeQPy9vE. Kelly + Pareto + journaling. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/14_optimizing_returns'] = {
  id: 'course1/14_optimizing_returns',
  course: 'Course1_Laying_The_Foundation',
  module: '14_Optimizing_Returns',
  title: 'Optimizing Returns',
  source_video: 'WwLYeQPy9vE',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's sharpen the question of how much to risk with a tool called the Kelly Criterion — a scientific way to size your bets to maximise growth over the long run. In its simplest form, K equals two times your win probability, minus one. And if the formula ever spits out a negative number, that's just math telling you not to take the bet at all.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'Optimizing Returns',
        lines: [
          'The **Kelly Criterion** — how much to risk for max growth',
          'Simple form: **K = 2p − 1**',
          'A negative result means: don’t take the bet'
        ]
      }
    },
    {
      id: 'modified',
      type: 'CONCEPT',
      say: "Real trades don't all pay one-to-one, so we use the modified Kelly, which takes your R-multiple into account alongside your win rate. Plug in a strong setup — say a three-to-one reward and a 55% win rate — and the formula tells you to risk forty percent of your portfolio. Forty percent! If that set off alarm bells after the last lesson, good. It should.",
      panel: {
        title: 'Modified Kelly — and a Red Flag',
        lines: [
          'Modified Kelly uses your **R-multiple** and win rate',
          'Example: 3R, 55% win → it says risk **40%**',
          'Forty percent?! That can’t be right for risk management',
          'Hold that thought — Pareto fixes it'
        ]
      }
    },
    {
      id: 'pareto',
      type: 'CONCEPT',
      say: "Enter Pareto's principle — the 80/20 rule. Eighty percent of your results come from twenty percent of your trades. Most trades are throwaways near break-even; a small fraction are the home runs that move your equity curve. So we temper raw Kelly by that twenty percent: forty percent times twenty percent gives eight percent. Now that's a sane, survivable risk that still captures the strength of the formula.",
      panel: {
        title: "Pareto's 80/20 Rule",
        lines: [
          '**80%** of results come from **20%** of trades',
          'Most trades are throwaways; a few are home runs',
          'Temper Kelly: 40% × 20% → a sane **8%** risk',
          'Captures Kelly’s strength without the blow-up risk'
        ]
      }
    },
    {
      id: 'journaling',
      type: 'CONCEPT',
      say: "But none of this math works without data — and that means journaling. It's the only way to actually improve. Document every trade scientifically: the expected R R R and the actual R-multiple, your entry, stop, target, and risk percent. Add a screenshot of the setup. I even log my mood, sleep, and hunger. Over time, patterns emerge — what your winners share, and what mistake keeps showing up in your losers.",
      panel: {
        title: 'The Power of Journaling',
        lines: [
          'The math needs **data** — journaling provides it',
          'Log expected RRR vs actual R-multiple',
          'Record entry, stop, target, risk%, and a screenshot',
          'Patterns emerge — your edges and your leaks'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "Recap: the Kelly Criterion sizes your trades scientifically, the modified version accounts for varying R-multiples, and Pareto's 80/20 rule keeps it from telling you to bet the farm. Above all, journaling is what turns these frameworks into a real, improving system. Master the foundation, keep your records, and you're ready for the next course.",
      panel: {
        title: 'Optimizing Returns — Recap',
        lines: [
          'Kelly sizes bets scientifically',
          'Modified Kelly accounts for varying R',
          'Pareto’s 80/20 keeps sizing sane',
          '**Journaling** turns frameworks into a real system'
        ]
      }
    }
  ]
};
