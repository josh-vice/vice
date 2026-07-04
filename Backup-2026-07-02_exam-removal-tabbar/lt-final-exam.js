'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Comprehensive Final Exam (window.LT_FINAL_EXAM)
   lt-final-exam.js

   ONE capstone exam of 60 questions — the 15 medium-to-hardest quiz questions
   from EACH of the four courses (15 × 4 = 60). Replaces the old per-course
   10-question exams. Unlocks once all four courses are complete.

   The questions are the course QUIZZES themselves (the Scenario-step questions,
   plus two hard Risk-Management module questions to top Course 1 up to 15). We
   REFERENCE them by chapter title and pull each chapter's `quiz` at load time,
   so the exam always mirrors the live quiz wording + charts — no duplicated copy.
   Reused charts are DEEP-CLONED so the chart renderer (which mutates cutIndex via
   _expandChartDef) can't corrupt the source chapter's chart. Answers are cloned
   to {id,text,correct} (the exam scores by id and shuffles order per attempt).

   Selection was a difficulty pass over every course quiz (applied "what happens
   next / what does this signal / how should conviction differ" + chart-reads +
   multi-step reasoning rank hardest; simple recall ranks easiest). Titles are
   matched normalised (case / curly-quote / dash insensitive) so they stay robust.

   Load order: AFTER the four data files (needs LT_CHAPTERS / _2 / _3 / _4),
   BEFORE lt-engine.js (which reads window.LT_FINAL_EXAM at runtime).
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  /* 15 medium-to-hardest quiz chapters per course (exact-ish titles; matched normalised). */
  var PICKS = {
    1: [
      'Understanding Price Action', 'Components of a Market', 'Support and Resistance',
      'Trending Markets', 'Range-Bound Markets', 'What Is Market Structure?',
      'Identifying Market Structure', 'Timeframes', 'HTF Scenario Analysis',
      'LTF Entry Scenario', 'Risk Management', 'Achieving Profitability', 'Optimizing Returns'
    ],
    2: [
      'Types of Trades — Live Examples', 'Entering Trades — The LTE Methodology', 'Exiting Trades',
      'Price Action Formations', 'Price Action Examples', 'Volume Analysis', 'Volume Examples',
      'Classical Chart Patterns', 'Classical Pattern Examples', 'Fibonacci', 'Ichimoku Kinko Hyo',
      'Ichimoku Market Scenario', 'Oscillators', 'Divergences', 'Course 2 Recap'
    ],
    3: [
      'Applying Leverage — ETH Swing Trade Example', 'Trading S/R — DBS/SSR Strategies',
      'Range Market Scenario — Live Walkthrough', 'Margin Management', 'Trading Ranges',
      'Identifying Access Points — Understanding Consolidation', 'Understanding Contracts',
      'Executing Orders', 'Understanding Leverage', 'Crafting Your System',
      'The Reality Behind Trading Full-Time', 'Recording Your System — The Trading Journal',
      'Applying Your System — The Trading Plan', "Developing a Trader's Mindset", 'Getting Into Positions'
    ],
    4: [
      'Outro — Course 4 Recap', 'Edge to Edge (E2E)', 'Ichimoku Market Scenarios — Live Examples',
      'C-Clamps and Kumo Pockets', 'Sentiment Analysis Variables', 'Combining Sentiment Data',
      'Trading Activity', 'Who Is in Control Primer', 'Cumulative Delta', 'Hyblock Indicators on Chart',
      'Kijun-sen Bounces and Rejections', 'Funding Rate', 'Liquidation Level Scenario — Live Walkthrough',
      'Futures Basis', 'Open Interest'
    ]
  };

  /* Course 1 has only 13 chapter quizzes — top it up to 15 with the two hardest
     Risk-Management module-quiz questions (verbatim from lt-module-quizzes.js). */
  var EXTRA = {
    1: [
      { chapterTitle: 'Risk Management', question: 'Given the profitability formula (Required Win Rate = 1 / (1 + R-multiple)), a trader with an average R-multiple of 0.5 will need a win rate of at least ___ to be profitable', answers: [
        { id: 'a', text: '25%', correct: false }, { id: 'b', text: '33%', correct: false },
        { id: 'c', text: '50%', correct: false }, { id: 'd', text: '67%', correct: true }
      ] },
      { chapterTitle: 'Risk Management', question: 'What is the formula for sizing positions appropriately?', answers: [
        { id: 'a', text: '(Risk% × Stop/Loss) / Total Portfolio', correct: false },
        { id: 'b', text: '(Total Portfolio × Stop/Loss) / Risk%', correct: false },
        { id: 'c', text: '(Total Portfolio × Risk%) / Stop/Loss', correct: true },
        { id: 'd', text: 'None of the above', correct: false }
      ] }
    ]
  };

  function _chapters(n) {
    if (n === 1) return (typeof LT_CHAPTERS   !== 'undefined') ? LT_CHAPTERS   : [];
    if (n === 2) return (typeof LT_CHAPTERS_2 !== 'undefined') ? LT_CHAPTERS_2 : [];
    if (n === 3) return (typeof LT_CHAPTERS_3 !== 'undefined') ? LT_CHAPTERS_3 : [];
    if (n === 4) return (typeof LT_CHAPTERS_4 !== 'undefined') ? LT_CHAPTERS_4 : [];
    return [];
  }
  // normalise for matching: unify curly quotes / en–em dashes / whitespace / case
  function _norm(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’]/g, "'").replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function _clone(o) { try { return JSON.parse(JSON.stringify(o)); } catch (_) { return null; } }

  function _build() {
    var out = [], missing = [];
    [1, 2, 3, 4].forEach(function (n) {
      var byTitle = {};
      _chapters(n).forEach(function (c) { if (c && c.title) byTitle[_norm(c.title)] = c; });
      (PICKS[n] || []).forEach(function (title) {
        var c = byTitle[_norm(title)];
        if (c && c.quiz && c.quiz.question && Array.isArray(c.quiz.answers)) {
          out.push({
            course: n,
            chapterTitle: c.title,
            question: c.quiz.question,
            answers: c.quiz.answers.map(function (a) { return { id: a.id, text: a.text, correct: !!a.correct }; }),
            chart: c.quiz.chart ? _clone(c.quiz.chart) : null
          });
        } else { missing.push(n + ' · ' + title); }
      });
      (EXTRA[n] || []).forEach(function (q) {
        out.push({ course: n, chapterTitle: q.chapterTitle, question: q.question,
          answers: q.answers.map(function (a) { return { id: a.id, text: a.text, correct: !!a.correct }; }), chart: null });
      });
    });
    if (missing.length && typeof console !== 'undefined') {
      console.warn('[LT_FINAL_EXAM] ' + missing.length + ' pick(s) had no matching quiz:', missing);
    }
    return out;
  }

  window.LT_FINAL_EXAM = _build();
  window.LT_FINAL_EXAM_PICKS = PICKS;
})();
