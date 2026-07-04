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
      say: "Let's sharpen the question of how much to risk with a tool called the Kelly Criterion — a scientific way to size your bets to maximise growth over the long run. In its simplest form, K equals two times your win probability, minus one. Take a loaded coin that lands heads sixty percent of the time, paying even odds: two times point-six, minus one — bet twenty percent of the bankroll. And if the formula ever spits out a negative number, that's math telling you not to take the bet at all.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'Optimizing Returns',
        lines: [
          'The **Kelly Criterion** — how much to risk for max growth',
          'Simple form: **K = 2p − 1**',
          'Loaded coin: 60% win, even odds → K = 2×0.6 − 1 = **20%**',
          'A negative result means: don’t take the bet'
        ]
      }
    },
    {
      id: 'modified',
      type: 'CONCEPT',
      say: "Real trades don't all pay one-to-one, so we use the modified Kelly, which allows dynamic odds: K equals b times p, minus q, all over b — where b is your R-multiple, p your win rate, and q your probability of losing. Plug in a strong setup — a three-to-one R and a 55% win rate — and it says risk forty percent of your portfolio. Forty percent! Red flags should be popping up in your head right now.",
      panel: {
        title: 'Modified Kelly — and a Red Flag',
        lines: [
          'Modified Kelly allows **dynamic odds** — your R-multiple',
          '**K = (b·p − q) ÷ b** — b = R, p = win rate, q = 1 − p',
          'Example: 3R, 55% win → it says risk **40%**',
          'Forty percent?! That can’t be right for risk management',
          'Hold that thought — Pareto fixes it'
        ]
      }
    },
    {
      id: 'pareto',
      type: 'CONCEPT',
      say: "Enter Pareto's principle — the 80/20 rule. Roughly eighty percent of your trades won't move the portfolio — throwaways near break-even. The remaining twenty percent are the home runs that push your equity curve higher — or, left unmanaged, the big losers that sink the ninety percent of traders who quit. So multiply the modified Kelly output by that twenty percent: forty percent times twenty percent gives eight percent. That's the sweet spot — sane, survivable risk that still captures the strength of the formula.",
      panel: {
        title: "Pareto's 80/20 Rule",
        lines: [
          '~**80%** of trades won’t move the portfolio — throwaways',
          'The **20%**: home runs — or, unmanaged, the **big losers**',
          'Multiply the Kelly output by 20%: **40% × 20% = 8%** risk',
          '8% — “the sweet spot” for position sizing'
        ]
      }
    },
    {
      id: 'journaling',
      type: 'CONCEPT',
      say: "But none of this math works without a much larger data set to draw from — and that means journaling. It's the only way to actually improve. Document every trade scientifically: the expected risk-reward ratio and the actual R-multiple, your entry, stop, target, and risk percent. Add a screenshot of the setup. I even log my mood, sleep, and hunger. Over time, patterns emerge — what your winners share, and what mistake keeps showing up in your losers.",
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
      say: "Recap: the Kelly Criterion sizes your trades scientifically, and the modified version accounts for varying R-multiples — but its raw output can be extreme. The method is to multiply that output by Pareto's twenty percent: forty percent becomes eight. Above all, journaling is what turns these frameworks into a real, improving system. Master the foundation, keep your records, and you're ready for the next course.",
      panel: {
        title: 'Optimizing Returns — Recap',
        lines: [
          'Kelly sizes bets scientifically',
          'Modified Kelly accounts for varying R — but runs hot',
          'The method: **modified Kelly × 20%** → 40% becomes **8%**',
          '**Journaling** turns frameworks into a real system'
        ]
      }
    }
  ]
};
