/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Course 2
   lt-data-course2.js  |  Chapters 1–5 content, chart data, quiz questions
   ═══════════════════════════════════════════════════════════════════════════

   Chart OHLC format: [open, close, low, high]  (ECharts candlestick standard)

   Each chapter has:
     id, title, tag, module
     intro  { heading, body, bullets[] }
     lesson { heading, body, bullets[] }
     introChart  { title, labels[], ohlc[], type, markLines[], markAreas[], markPoints[] }
     lessonChart { ... }
     quiz   {
       question, hint,
       style: 'direction' | 'choice'
       answers: [{ id, text, correct, type }]
       chart:  { title, labels[], ohlc[], cutIndex, markLines[], markAreas[] }
       revealMarkPoints: [{ dataIndex, label, position, color }]
       explanation, rule
     }
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const LT_CHAPTERS_2 = [

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 1 — Trading Styles
     Module 1 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 0,
    title: "Trading Styles",
    tag: "Module 1 · Session 1",
    module: "Choosing Your Trading Style",
    videoUrl: "https://www.youtube.com/embed/cVGeGAeHl1I",

    // Shown beside this opening chapter's Introduction as the Course 2 overview.
    roadmap: {
      title: "Five Modules — Building Your Toolbox",
      sub: "The arc of Course 2",
      icon: "route",
      stops: [
        { label: "Choosing your trading style", desc: "Find your fit, with live examples of each trade type" },
        { label: "Defining a trade setup",      desc: "The LTE methodology for entering and exiting trades" },
        { label: "Price action concepts",       desc: "Formations, volume analysis, and classical chart patterns" },
        { label: "Trading tools",               desc: "Fibonacci, Ichimoku, oscillators, and divergences" },
        { label: "Financial instruments",       desc: "What you can actually trade, and how each one works" }
      ]
    },

    intro: {
      heading: "What Kind of Trader Are You?",
      body: "Before you can build a system, you need to know who you are as a trader. Your trading style determines your timeframe, your tools, your risk parameters, and your lifestyle. There is no universally 'best' style — only the one that fits your personality, schedule, and goals. Getting this right is step one of building your edge.",
      bullets: [
        "Position Trading — months to years; catch macro trend inflection points on daily/weekly charts",
        "Swing Trading — days to weeks; focused on key swing points on daily/weekly timeframes",
        "Day Trading — hours; open and close positions within market hours; no overnight exposure",
        "Scalping — minutes to hours; range-bound markets; tight entries between DBS and SSR zones",
        "Your style → defines your system → defines your tools → defines your Edge",
        "The more disciplined you are as a trader, the better your long-term outcomes — regardless of style"
      ]
    },

    lesson: {
      heading: "The Four Trading Styles Explained",
      body: "Each trading style operates in a different timeframe and demands a different mindset. Position trading requires patience over weeks and months. Scalping demands rapid decision-making across minutes. Understanding the mechanics of each style allows you to pick the one that fits your life — and apply it consistently.",
      bullets: [
        "<strong>Position Trading</strong> — HTF macro analysis; identify major trend inflection points using HH/HL or LH/LL confirmation on daily/weekly charts; long holding time; 'set and forget' mentality suits this style best",
        "<strong>Swing Trading</strong> — similar to position trading but with a shorter horizon; focused on key swing points on the daily/weekly; enter at significant S/R flips; hold days to weeks",
        "<strong>Day Trading</strong> — crypto is 24/7; traditional markets have fixed hours; use 1H/4H charts for execution; all positions opened and closed within a single market day; no overnight exposure",
        "<strong>Scalping</strong> — best applied in consolidation and range-bound markets; identify DBS (Demand Buyer Support) and SSR (Seller Supply Resistance) zones; enter the ping-pong between those zones; tight stops and quick exits",
        "<strong>DBS</strong> = Demand Buyer Support — the price zone where concentrated buyers consistently step in and push price higher",
        "<strong>SSR</strong> = Seller Supply Resistance — the price zone where concentrated sellers consistently step in and push price lower",
        "Figuring out your style defines your entire system — use this knowledge to narrow your tools and sharpen your focus"
      ]
    },

    introChart: {
      title: "Macro Uptrend — Position & Swing Trade Opportunities",
      type: "candlestick",
      labels: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12","W13","W14","W15","W16","W17","W18","W19","W20"],
      ohlc: ltCandles(78, [
        { to: 96,  bars: 3 },
        { to: 110, bars: 4 },
        { to: 104, bars: 1 },
        { to: 117, bars: 3 },
        { to: 111, bars: 1 },
        { to: 122, bars: 3 },
        { to: 116, bars: 1 },
        { to: 125, bars: 4 }
      ], { seed: 85, wick: 0.35 }),
      markPoints: [
        { dataIndex:  0, label: "Position Entry", position: "bottom" },
        { dataIndex:  2, label: "Swing Low",      position: "bottom" },
        { dataIndex:  6, label: "HH",             position: "top"    },
        { dataIndex:  7, label: "HL",             position: "bottom" },
        { dataIndex: 14, label: "HH",             position: "top"    },
        { dataIndex: 19, label: "HH",             position: "top"    }
      ]
    },

    lessonChart: {
      title: "Scalping — Range-Bound Market with DBS & SSR",
      markLines: [ { yAxis: 82, label: "Stop — below swing low", color: "#ff2e88" }, { yAxis: 93, label: "Target — exit at SSR", color: "#ffcc00" } ],
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(93, [
        { to: 84, bars: 3 },
        { to: 93, bars: 3 },
        { to: 84, bars: 3 },
        { to: 93, bars: 3 },
        { to: 84, bars: 3 },
        { to: 93, bars: 3 }
      ], { seed: 86, wick: 0.4 }),
      markAreas: [
        { y0: 82, y1: 87, label: "DBS — Demand Buyer Support", color: "rgba(0,212,212,0.07)"  },
        { y0: 91, y1: 96, label: "SSR — Seller Supply Resist.", color: "rgba(255,46,136,0.07)" }
      ],
      markPoints: [
        { dataIndex:  2, label: "DBS Bounce",  position: "bottom" },
        { dataIndex:  5, label: "SSR Reject",  position: "top"    },
        { dataIndex:  8, label: "DBS Bounce",  position: "bottom" },
        { dataIndex: 11, label: "SSR Reject",  position: "top"    }
      ]
    },

    quiz: {
      question: "Price has been bouncing between two clear horizontal zones for six sessions with no new trend highs or lows. It just touched the lower zone again with a long lower wick showing buyer presence. Which trading style is best suited here, and what is the correct entry logic?",
      hint: "Ask yourself first: is this market trending or ranging? One trading style was built specifically for this type of market condition.",
      style: "choice",
      answers: [
        { id: "a", text: "Scalping — enter at the DBS zone with stop below swing low, target SSR", correct: true,  type: "bullish" },
        { id: "b", text: "Position Trading — long lower wick signals macro trend reversal; hold weeks",  correct: false, type: "bearish" },
        { id: "c", text: "Day Trading — use 1H chart to ride a new directional trend trade",             correct: false, type: "neutral" }
      ],
      chart: {
        title: "Identify the Correct Trading Style",
        type: "candlestick",
        cutIndex: 10,
        labels: ltLabels(15),
        ohlc: ltCandles(93, [
          { to: 84, bars: 2 },
          { to: 93, bars: 3 },
          { to: 84, bars: 3 },
          { to: 93, bars: 2 },
          { to: 84, bars: 1, reject: 3 }
        ,  { to: 93, bars: 4 }
        ], { seed: 87, wick: 0.35 }),
        markLines: [
          { yAxis: 82, label: "Stop — below swing low", color: "#ff2e88" }
        ],
        markAreas: [
          { y0: 81, y1: 86, label: "DBS Zone", color: "rgba(0,212,212,0.07)"  },
          { y0: 91, y1: 96, label: "SSR Zone", color: "rgba(255,46,136,0.07)" }
        ]
      },
      revealMarkPoints: [ { dataIndex: 14, label: "Target — SSR", position: "top", color: "#ffcc00" },
        { dataIndex: 10, label: "Scalp Entry!", position: "bottom", color: "#00d4d4" },
        { dataIndex: 12, label: "Bounce",       position: "top",    color: "#00d4d4" }
      ],
      explanation: "This is a range-bound (consolidating) market — price is repeatedly bouncing between the DBS and SSR zones without making a new trend high or low. <strong>Scalping</strong> is specifically designed for this environment: enter at DBS on the first sign of buyers, stop below the swing low (invalidation), target SSR. Position or day trading into a macro trend would be the wrong approach here — there is no trend to trade.",
      rule: "Scalping = range-bound markets. Enter at DBS, target SSR, stop below swing low. Never force a trend trade in a ranging market."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 2 — Types of Trades — Live Examples
     Module 1 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 1,
    title: "Types of Trades — Live Examples",
    tag: "Module 1 · Session 2",
    module: "Choosing Your Trading Style",
    videoUrl: "https://www.youtube.com/embed/qQUyNbupNjU",

    intro: {
      heading: "Putting Styles Into Practice",
      body: "Knowing the four trading styles is the foundation. The real skill is executing the correct setup in the right market condition. A position trader uses weekly charts and months of patience. A scalper uses 5-minute charts and reacts in seconds. Understanding HOW to structure each trade type — with defined entries, stops, and targets — is what separates theory from execution.",
      bullets: [
        "Position/Swing: identify HTF trend → find key S/R level or Sr flip → wait for retest → confirm with buyer candle → set entry, stop, target",
        "Day Trade: identify daily trend for bias → find Sr flip on 1H/4H → enter on retest of flip with trigger confirmation",
        "Scalp: identify range (DBS + SSR) → enter at range low on first sign of buyers → stop below swing low → exit at SSR",
        "Use TradingView's trade setup tool to define entry, stop, and target visually before every trade",
        "Trailing stops lock in profit as the trade moves in your favor — essential for swing and position trades",
        "Always define Entry, Stop Loss (invalidation), and Target BEFORE entering any position"
      ]
    },

    lesson: {
      heading: "Setting Up Each Trade Type",
      body: "The setup process is consistent across all styles — identify structure, find your level, define your risk. The variables are timeframe, holding period, and target distance. Master the setup process and apply it across any timeframe or asset.",
      bullets: [
        "<strong>Position/Swing Setup:</strong> (1) Identify HTF trend (bullish = HH+HL) → (2) Find key S/R or Sr flip on daily/weekly → (3) Wait for price to return to that level → (4) Look for buyer confirmation candle (long lower wick, bullish engulfing) → (5) Set entry, stop below swing low, and target at next Sr breakdown level",
        "<strong>Day/Swing Setup:</strong> identify daily trend and Sr flips → enter on retest of Sr flip with bullish trigger confirmation → use trailing stops to lock in profit as trade moves",
        "<strong>Scalp Setup:</strong> range-bound market identified → enter at DBS on first sign of buyers → stop below swing low (invalidation) → exit at SSR zone",
        "<strong>Trailing Stops:</strong> move stop loss into profit as price creates new Sr flip levels → locks in gains while letting the trend continue",
        "Your trading style defines your bias window — always identify the higher timeframe trend first",
        "Never force a trade that does not fit your predefined style criteria — discipline separates consistent traders from gamblers"
      ]
    },

    introChart: {
      title: "Swing Trade Setup — HTF Sr Flip Retest",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(84, [
        { to: 100, bars: 5 },
        { to: 110, bars: 6 },
        { to: 100, bars: 3, reject: 3 },
        { to: 116, bars: 4 }
      ], { seed: 88, wick: 0.4 }),
      markLines: [ { yAxis: 97, label: "Stop — below swing low", color: "#ff2e88" },
        { yAxis: 100, label: "Sr Flip Level = Entry", color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 115, y1: 118, label: "Target — next resistance", color: "rgba(255,204,0,0.08)" }
      ],
      markPoints: [
        { dataIndex:  4, label: "Resistance",    position: "top"    },
        { dataIndex:  5, label: "Breakout",      position: "top"    },
        { dataIndex: 10, label: "Prior High",    position: "top"    },
        { dataIndex: 13, label: "Retest Entry",  position: "bottom" },
        { dataIndex: 14, label: "Confirmed",     position: "bottom" }
      ]
    },

    lessonChart: {
      title: "Scalp Trade Setup — DBS + SSR Range",
      markLines: [ { yAxis: 80, label: "Stop — below swing low", color: "#ff2e88" } ],
      type: "candlestick",
      labels: ltLabels(12),
      ohlc: ltCandles(93, [
        { to: 84, bars: 3 },
        { to: 93, bars: 3 },
        { to: 84, bars: 3 },
        { to: 93, bars: 3 }
      ], { seed: 89, wick: 0.4 }),
      markAreas: [
        { y0: 81, y1: 86, label: "DBS Zone", color: "rgba(0,212,212,0.07)"  },
        { y0: 92, y1: 97, label: "SSR Zone", color: "rgba(255,46,136,0.07)" }
      ],
      markPoints: [
        { dataIndex:  2, label: "DBS Entry",  position: "bottom" },
        { dataIndex:  5, label: "SSR Exit",   position: "top"    },
        { dataIndex:  8, label: "DBS Entry",  position: "bottom" },
        { dataIndex: 11, label: "SSR Exit",   position: "top"    }
      ]
    },

    quiz: {
      question: "Price is in a confirmed daily uptrend (Higher Highs + Higher Lows). It has pulled back to a prior resistance level that was broken two weeks ago. A candle touching that level has a long lower wick. What is the correct trade setup action?",
      hint: "What happens to resistance once it has been convincingly broken? What is the correct swing trade entry action at this level?",
      style: "direction",
      answers: [
        { id: "a", text: "● Enter long at the Sr flip retest — stop below swing low, target next resistance", correct: true,  type: "bullish" },
        { id: "b", text: "● Short the retest — price is weakening back to the breakout origin",               correct: false, type: "bearish" },
        { id: "c", text: "● Wait — more candles are needed before the level can be considered valid",          correct: false, type: "neutral" }
      ],
      chart: {
        title: "Sr Flip Retest — What's Your Move?",
        type: "candlestick",
        cutIndex: 12,
        labels: ltLabels(16),
        ohlc: ltCandles(86, [
          { to: 100, bars: 5 },
          { to: 110, bars: 4 },
          { to: 100, bars: 3, reject: 3 },
          { to: 102, bars: 1 },
          { to: 115, bars: 3 }
        ], { seed: 90, wick: 0.4 }),
        markLines: [
          { yAxis: 100, label: "Sr Flip Level", color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 113, y1: 116, label: "Next Resistance — Target", color: "rgba(255,204,0,0.08)" }
        ]
      },
      revealMarkPoints: [ { dataIndex: 15, label: "Target — next resistance", position: "top", color: "#ffcc00" },
        { dataIndex:  5, label: "Breakout",     position: "top",    color: "#00d4d4" },
        { dataIndex:  8, label: "Prior High",   position: "top",    color: "#00d4d4" },
        { dataIndex: 11, label: "Retest Entry", position: "bottom", color: "#00d4d4" },
        { dataIndex: 12, label: "Holds!",       position: "top",    color: "#00d4d4" }
      ],
      explanation: "The uptrend is confirmed (HH+HL). Old resistance was broken with a strong candle. Price pulled back to retest that exact level — which has now <strong>flipped to support</strong>. The long lower wick confirms buyers defending the zone. This is a textbook swing trade Sr flip retest entry. Stop goes below the swing low (invalidation), target is the next resistance level above.",
      rule: "Sr flip retest in an uptrend = buy at the flipped level. Stop below swing low. Target the next resistance."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 3 — Entering Trades — The LTE Methodology
     Module 2 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 2,
    title: "Entering Trades — The LTE Methodology",
    tag: "Module 2 · Session 1",
    module: "Defining a Trade Setup",
    videoUrl: "https://www.youtube.com/embed/3xhRlMRh1P4",

    intro: {
      heading: "Ready → Set → Go",
      body: "The LTE Methodology is the systematic framework that turns a general market read into a precise, executable trade. Without it, traders enter too early, too late, or on emotion. LTE removes the guesswork and creates a repeatable, consistent process for every trade — regardless of asset, timeframe, or trading style.",
      bullets: [
        "LTE = Level → Trigger → Entry/Exit — the three steps of every single trade",
        "Level = the predefined S/R zone you watch and observe (a zone, not a precise line)",
        "Trigger = an obvious price action reaction AT the level — confirmation the level may hold",
        "Entry = the predefined order type placed only AFTER a successful trigger fires",
        "⚠️ Critical Rule: Triggers CAN be entries. Entries CANNOT be triggers — order matters",
        "Bias must be established FIRST — your directional view (bullish or bearish) before any LTE setup"
      ]
    },

    lesson: {
      heading: "Level, Trigger, Entry — Step by Step",
      body: "LTE creates a systematic, emotion-free approach to every trade. Every decision is made in advance. The Level is identified on the chart before price arrives. The Trigger tells you the level is reacting. The Entry executes only after both Level and Trigger are confirmed. This sequence is non-negotiable.",
      bullets: [
        "<strong>L — Level:</strong> clearly defined zone expected to act as S/R; can be horizontal or diagonal; a zone, not a line; mastering S/R identification is the entire foundation of this step",
        "<strong>T — Trigger:</strong> obvious price action reaction at the level — bullish engulfing, hammer, dragonfly doji, spinning top, or any indecision candle; adds validity and confluence to the level",
        "<strong>E — Entry Method 1 (Higher Low):</strong> after a trigger fires, wait for price to pull back and form a higher low → then enter with a market or limit order long",
        "<strong>E — Entry Method 2 (Sr Flip):</strong> wait for price to close above a minor resistance level → then set limit orders for the retest of that level",
        "<strong>Bias:</strong> your directional view — bullish or bearish; always establish bias before identifying any LTE setup; the bias is the trading thesis",
        "<strong>Invalidation:</strong> the predefined level where your trade thesis is WRONG; this IS your stop loss placement; never move it to avoid a loss",
        "<strong>First Barrier (FB):</strong> the earliest minor S/R where price could stall or begin to fail — not the stop loss, but the first warning sign your thesis is under pressure"
      ]
    },

    introChart: {
      title: "LTE Setup — Level, Trigger, Entry Identified",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(110, [
        { to: 84, bars: 7 },
        { to: 86, bars: 1, reject: 3 },
        { to: 92, bars: 1 },
        { to: 89, bars: 1 },
        { to: 110, bars: 6 }
      ], { seed: 91, wick: 0.4 }),
      markAreas: [
        { y0: 83, y1: 88, label: "L — Level (Support Zone)", color: "rgba(0,212,212,0.06)" }
      ],
      markPoints: [
        { dataIndex:  7, label: "T — Trigger",        position: "bottom" },
        { dataIndex:  9, label: "E — Entry (HL)",     position: "bottom" }
      ]
    },

    lessonChart: {
      title: "Sr Flip Entry Method — Wait for the Retest",
      type: "candlestick",
      labels: ltLabels(17),
      ohlc: ltCandles(88, [
        { to: 105, bars: 4 },
        { to: 99,  bars: 2 },
        { to: 105, bars: 2 },
        { to: 111, bars: 2 },
        { to: 105, bars: 2 },
        { to: 123, bars: 5 }
      ], { seed: 92, wick: 0.4 }),
      markLines: [ { yAxis: 103, label: "Invalidation / Stop — below flip", color: "#ff2e88" }, { yAxis: 111, label: "First Barrier (FB) — peak", color: "#ff2e88" },
        { yAxis: 105, label: "Sr Flip Level", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  3, label: "Resistance",      position: "top"    },
        { dataIndex:  8, label: "Break Above",     position: "top"    },
        { dataIndex: 11, label: "Retest of Flip",  position: "bottom" },
        { dataIndex: 12, label: "Sr Flip Entry",   position: "bottom" }
      ]
    },

    quiz: {
      question: "A support zone has been identified at the bottom of a downtrend. Price drops into that zone and prints a candle with a long lower wick showing strong buyer presence. Price then pulls back slightly and forms a higher low just above the zone. Which LTE step does each event represent?",
      hint: "Map each event to the LTE framework in sequence: what was the Level, what was the Trigger, and what is happening with the higher low?",
      style: "choice",
      answers: [
        { id: "a", text: "Level = the predefined support zone | Trigger = the long lower wick candle at the zone | Entry = the higher low formed after the trigger", correct: true,  type: "bullish" },
        { id: "b", text: "Level = the higher low | Trigger = the previous candle | Entry = the long lower wick at the zone itself",                                  correct: false, type: "neutral" },
        { id: "c", text: "The trigger must come before the level is identified — find a reversal candle, then look for a zone behind it",                             correct: false, type: "bearish" }
      ],
      chart: {
        title: "Map Each Step to the LTE Framework",
        type: "candlestick",
        cutIndex: 10,
        labels: ltLabels(14),
        ohlc: ltCandles(100, [
          { to: 80, bars: 7 },
          { to: 79, bars: 1, reject: 4 },
          { to: 85, bars: 2 },
          { to: 82, bars: 1 },
          { to: 99, bars: 3 }
        ], { seed: 93, wick: 0.4 }),
        markAreas: [
          { y0: 77, y1: 83, label: "L — Level (Support Zone)", color: "rgba(0,212,212,0.06)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "T — Trigger!",   position: "bottom", color: "#00d4d4" },
        { dataIndex: 10, label: "E — HL Entry",   position: "bottom", color: "#00d4d4" },
        { dataIndex: 11, label: "LTE ✓",          position: "top",    color: "#00d4d4" }
      ],
      explanation: "The <strong>Level</strong> was the predefined support zone at the bottom — identified before price arrived. The <strong>Trigger</strong> was the candle with the long lower wick: sellers pushed deep into the zone but buyers absorbed all of it and closed near the open. That is confirmation the level may hold. The <strong>Entry</strong> was the higher low that formed above the trigger — the signal that buyers were in control and the move was underway.",
      rule: "LTE in order: identify the Level first. Wait for a Trigger AT that level. Execute the Entry only after the trigger fires. Never reverse this sequence."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 4 — Exiting Trades
     Module 2 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 3,
    title: "Exiting Trades",
    tag: "Module 2 · Session 2",
    module: "Defining a Trade Setup",
    videoUrl: "https://www.youtube.com/embed/HoXfz4Av21E",

    intro: {
      heading: "Entries Get You In. Exits Make You Money.",
      body: "Most traders obsess over entries. The real edge lives in exits. A brilliant entry with a terrible exit is still a losing trade. There are three exit strategies — Set and Forget, Trailing Stops, and Partial Take-Profits — each with distinct strengths. Your trading journal will tell you which one performs best for your specific setups over time.",
      bullets: [
        "Set and Forget (SNF) — predefine TP and SL, input limit orders, wait for the outcome",
        "Trailing Stop Loss — move your stop into profit as price creates new Sr flip levels",
        "Partial Take-Profit — reduce position size by a fixed percentage at predefined S/R levels",
        "Consistency matters more than perfection — pick one strategy, apply it systematically, journal the results",
        "Which exit strategy is best? The one your journal shows has the superior hit rate for your setups"
      ]
    },

    lesson: {
      heading: "Three Exit Strategies — When to Use Each",
      body: "Each exit strategy suits a different trading mindset and market condition. Newer traders benefit most from Set and Forget — it forces discipline and removes in-trade emotion entirely. Trailing stops capture the full meat of a strong trend. Partial take-profits balance locking in wins with maintaining exposure to a larger move.",
      bullets: [
        "<strong>Set and Forget (SNF):</strong> predefine entry + TP + SL → input all orders before the trade → wait; best for newer traders; forces realistic target setting; builds analytical discipline over time; avoids cutting winners early and holding losers long",
        "<strong>Trailing Stop Loss:</strong> move stop loss into profit as price makes new Sr flip levels; types: fixed dollar trail, fixed percentage trail, or move stop to each new Sr level (preferred); allows larger R multiples by riding the full trend",
        "<strong>Partial Take-Profit (PTP):</strong> reduce position by a fixed percentage at predefined Sr levels (first barriers); example — 3 levels, close 33% at each; accounts for opportunity cost; lets you lock in wins while maintaining trend exposure",
        "Trailing Stop example: entered short after a higher high set → used trailing stop → stopped out $1,600 above the original fixed target, capturing far more of the move",
        "Partial TP example: 3 predefined levels → reduce 33% at each → guaranteed wins at each level while running the remainder of the position",
        "Newer traders: be LESS involved during a trade — more involvement equals cutting winners early and holding losers too long",
        "Let your <strong>journal data</strong> dictate which exit strategy to use — not emotion in the moment of a live trade"
      ]
    },

    introChart: {
      title: "Trailing Stop Loss — Riding the Full Trend",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(85, [
        { to: 98,  bars: 5 },
        { to: 107, bars: 4 },
        { to: 116, bars: 4 },
        { to: 118, bars: 3 },
        { to: 108, bars: 2 }
      ], { seed: 94, wick: 0.4 }),
      markLines: [
        { yAxis: 85,  label: "Entry",             color: "#00d4d4" },
        { yAxis: 82,  label: "Initial Stop",      color: "#ff2e88" },
        { yAxis: 94,  label: "Trail Stop 1",      color: "#ff2e88" },
        { yAxis: 103, label: "Trail Stop 2",      color: "#ff2e88" },
        { yAxis: 110, label: "Final Trail Stop",  color: "#ff2e88" },
        { yAxis: 104, label: "Original Fixed TP",  color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Entry",       position: "bottom" },
        { dataIndex:  4, label: "Stop → 94",   position: "top" },
        { dataIndex:  8, label: "Stop → 103",  position: "top" },
        { dataIndex: 12, label: "Stop → 110",  position: "top" },
        { dataIndex: 17, label: "Stopped Out", position: "bottom" }
      ]
    },

    lessonChart: {
      title: "Partial Take-Profit — Three Predefined Levels",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(82, [
        { to: 95,  bars: 6 },
        { to: 92,  bars: 1 },
        { to: 105, bars: 4 },
        { to: 103, bars: 1 },
        { to: 114, bars: 4 }
      ], { seed: 95, wick: 0.4 }),
      markLines: [
        { yAxis: 82,  label: "Entry",       color: "#00d4d4" },
        { yAxis: 94,  label: "TP 1 (33%)",  color: "#ffcc00" },
        { yAxis: 104, label: "TP 2 (33%)",  color: "#ffcc00" },
        { yAxis: 113, label: "TP 3 (33%)",  color: "#ffcc00" },
        { yAxis: 78,  label: "Stop Loss",   color: "#ff2e88" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Entry",    position: "bottom" },
        { dataIndex:  5, label: "TP1 Hit",  position: "top"    },
        { dataIndex: 10, label: "TP2 Hit",  position: "top"    },
        { dataIndex: 15, label: "TP3 Hit",  position: "top"    }
      ]
    },

    quiz: {
      question: "A trader enters a long at $82 with stop at $78 and three predefined targets: $94, $104, and $113. They plan to close 33% of their position at each level. Price reaches $94. What exit strategy is this, and what happens to the remaining position?",
      hint: "Which of the three exit strategies involves systematically closing a fraction of the position at multiple predefined S/R levels while keeping some exposure running?",
      style: "choice",
      answers: [
        { id: "a", text: "Partial Take-Profit — 33% closed at TP1; remaining 67% still runs toward TP2 ($104) and TP3 ($113)", correct: true,  type: "bullish" },
        { id: "b", text: "Set and Forget — all positions closed at $94; the trade is fully complete",                            correct: false, type: "neutral" },
        { id: "c", text: "Trailing Stop — the stop should now be moved to $94 to lock in break-even on the full position",      correct: false, type: "bearish" }
      ],
      chart: {
        title: "Which Exit Strategy Is Being Applied?",
        type: "candlestick",
        cutIndex: 6,
        labels: ltLabels(15),
        ohlc: ltCandles(82, [
          { to: 95,  bars: 6 },
          { to: 92,  bars: 1 },
          { to: 105, bars: 3 },
          { to: 103, bars: 1 },
          { to: 114, bars: 4 }
        ], { seed: 96, wick: 0.4 }),
        markLines: [
          { yAxis: 82,  label: "Entry",     color: "#00d4d4" },
          { yAxis: 94,  label: "TP 1",      color: "#ffcc00" },
          { yAxis: 104, label: "TP 2",      color: "#ffcc00" },
          { yAxis: 113, label: "TP 3",      color: "#ffcc00" },
          { yAxis: 78,  label: "Stop Loss", color: "#ff2e88" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  0, label: "Entry",    position: "bottom", color: "#00d4d4" },
        { dataIndex:  5, label: "TP1 Hit!", position: "top",    color: "#ffcc00" },
        { dataIndex:  9, label: "TP2 Hit!", position: "top",    color: "#ffcc00" },
        { dataIndex: 14, label: "TP3 Hit!", position: "top",    color: "#ffcc00" }
      ],
      explanation: "This is the <strong>Partial Take-Profit</strong> exit strategy. The trader closes 33% of the position at each predefined target, progressively locking in profits while keeping exposure to the larger trend. After TP1 at $94, 67% of the position remains open and continues running toward TP2 ($104) and TP3 ($113). This approach balances locking in guaranteed wins with maximising trend exposure on the remaining size.",
      rule: "Partial Take-Profit = reduce position % at each predefined Sr level. Locks in wins. Keeps trend exposure alive on the remainder."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 5 — Price Action Formations
     Module 3 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 4,
    title: "Price Action Formations",
    tag: "Module 3 · Session 1",
    module: "Price Action Concepts",
    videoUrl: "https://www.youtube.com/embed/V5gjA0gtB0c",

    intro: {
      heading: "Multi-Candlestick Formations as LTE Triggers",
      body: "Single candlestick signals are the first layer. Multi-candlestick formations are the second — they provide greater confirmation and higher hit rates when used as LTE triggers. These are not magic patterns. They are visual evidence of a shift in the balance between buyers and sellers across two or three consecutive sessions. Combine them with key S/R levels and volume for the highest probability entries.",
      bullets: [
        "Multi-candle formations = stronger confluence than single candle signals alone",
        "Two-candle: Bullish Engulfing, Bearish Engulfing, Tweezer Tops, Tweezer Bottoms",
        "Three-candle: Morning Star, Evening Star, Three Inside Up/Down, Three White Soldiers, Three Black Crows",
        "⚠️ Always wait for candle CLOSE before acting — never trade a formation mid-candle",
        "Combine formations with key S/R levels — formation at S/R = highest probability LTE trigger",
        "Volume should confirm formations — a volume spike on the confirmation candle = stronger signal"
      ]
    },

    lesson: {
      heading: "Two and Three-Candle Formations",
      body: "Each formation tells a story about who is winning the buyer/seller battle across multiple sessions. Engulfing patterns show sudden, decisive dominance. Stars and inside bars show exhaustion followed by reversal. Soldiers and crows show sustained momentum. Know the story, and you know how to use the pattern as a trigger in your LTE setup.",
      bullets: [
        "<strong>Bullish Engulfing:</strong> down candle → up candle closes above previous open AND high = buyers took full control; valid LTE trigger at support",
        "<strong>Bearish Engulfing:</strong> up candle → down candle closes below previous open AND low = sellers took full control; valid LTE trigger at resistance",
        "<strong>Tweezer Tops:</strong> two sessions with equal highs (often shooting star shapes) = sellers unable to push higher; local top signal at resistance",
        "<strong>Tweezer Bottoms:</strong> two sessions with equal lows = buyers unable to push lower; local bottom signal at support",
        "<strong>Morning Star:</strong> down candle → indecision candle (doji/spinning top) → up candle closes past midpoint of first candle = bullish reversal",
        "<strong>Evening Star:</strong> up candle → indecision candle → down candle closes past midpoint of first candle = bearish reversal",
        "<strong>Three Inside Up:</strong> down candle → up candle closes past midpoint of first → third candle closes above open AND high of first = bullish reversal; highest hit rate as both LTE trigger AND entry simultaneously",
        "<strong>Three Black Crows:</strong> three consecutive bearish candles with large bodies, minimal wicks, each closing lower = strong bearish trend continuation signal"
      ]
    },

    introChart: {
      title: "Bullish & Bearish Engulfing at S/R Levels",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(84, [
        { to: 100, bars: 4 },
        { to: 88,  bars: 3 },
        { to: 100, bars: 3 },
        { to: 101, bars: 1 },
        { to: 90,  bars: 1 },
        { to: 84,  bars: 2 },
        { to: 83,  bars: 1 },
        { to: 93,  bars: 1 },
        { to: 98,  bars: 2 }
      ], { seed: 97, wick: 0.4 }),
      markAreas: [
        { y0: 82, y1: 86,  label: "Support Zone",    color: "rgba(0,212,212,0.07)"  },
        { y0: 98, y1: 102, label: "Resistance Zone", color: "rgba(255,46,136,0.07)"  }
      ],
      markPoints: [
        { dataIndex: 10, label: "Pre-Engulf",        position: "top"    },
        { dataIndex: 11, label: "Bearish Engulfing", position: "top"    },
        { dataIndex: 14, label: "Pre-Engulf",        position: "bottom" },
        { dataIndex: 15, label: "Bullish Engulfing", position: "bottom" }
      ]
    },

    lessonChart: {
      title: "Three-Candle Formations — Morning Star & Three Inside Up",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(105, [
        { to: 84,  bars: 6 },
        { to: 84,  bars: 1 },
        { to: 95,  bars: 1 },
        { to: 99,  bars: 4 },
        { to: 90,  bars: 1 },
        { to: 94,  bars: 1 },
        { to: 103, bars: 1 },
        { to: 114, bars: 3 }
      ], { seed: 98, wick: 0.35 }),
      markPoints: [
        { dataIndex:  5, label: "MS Candle 1",         position: "top"    },
        { dataIndex:  6, label: "MS Candle 2 (Doji)",  position: "bottom" },
        { dataIndex:  7, label: "MS Candle 3 ✓",      position: "top"    },
        { dataIndex: 12, label: "3IU Candle 1",        position: "top"    },
        { dataIndex: 13, label: "3IU Candle 2 (inside)",position: "bottom" },
        { dataIndex: 14, label: "3IU Candle 3 ✓",     position: "top"    }
      ],
      markAreas: [
        { y0: 81, y1: 87, label: "Support Zone", color: "rgba(0,212,212,0.06)" },
        { y0: 89, y1: 91, label: "3IU Base", color: "rgba(0,212,212,0.05)" }
      ]
    },

    quiz: {
      question: "Price has been in a downtrend. At the bottom of that downtrend, three consecutive candles form: a strong bearish candle, followed by a smaller bullish candle that closes past the midpoint of the first, followed by a third bullish candle that closes above the open and high of the first candle. What formation has appeared, and what does it signal?",
      hint: "Count the candles: one bearish, then two progressively bullish. The third candle closes above the first candle's open and high. What is this three-candle formation called?",
      style: "direction",
      answers: [
        { id: "a", text: "● Three Inside Up — bullish reversal; use as LTE trigger AND entry simultaneously", correct: true,  type: "bullish"  },
        { id: "b", text: "● Three Black Crows — bearish continuation; expect the downtrend to extend",         correct: false, type: "bearish"  },
        { id: "c", text: "● Morning Star — possible reversal but need a fourth candle to confirm direction",   correct: false, type: "neutral"  }
      ],
      chart: {
        title: "Identify the Formation — What Comes Next?",
        type: "candlestick",
        cutIndex: 10,
        labels: ltLabels(15),
        ohlc: ltCandles(110, [
          { to: 92, bars: 8 },
          { to: 84, bars: 1 },
          { to: 88, bars: 1 },
          { to: 93, bars: 1 },
          { to: 97, bars: 1 },
          { to: 108, bars: 3 }
        ], { seed: 99, wick: 0.4 }),
        markAreas: [
          { y0: 82, y1: 88, label: "Support Zone", color: "rgba(0,212,212,0.06)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  8, label: "Candle 1 (strong bear)", position: "top",    color: "#00d4d4" },
        { dataIndex:  9, label: "Candle 2 (inside)",      position: "bottom", color: "#00d4d4" },
        { dataIndex: 10, label: "Three Inside Up!",       position: "top",    color: "#00d4d4" },
        { dataIndex: 11, label: "Confirmed Bounce",       position: "top",    color: "#00d4d4" }
      ],
      explanation: "This is the <strong>Three Inside Up</strong> formation. Candle 1 is the final bearish candle of the downtrend. Candle 2 closes bullish, past the midpoint of Candle 1 — showing buyers are pushing back. Candle 3 closes above Candle 1's open and high — buyers have completely taken over. This formation has one of the highest hit rates as an LTE trigger at a support level, and can serve as both the trigger AND the entry simultaneously.",
      rule: "Three Inside Up at support = bullish reversal signal. Always wait for candle 3 to CLOSE before entering. Combine with volume confirmation and a key S/R level."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 6 — Price Action Examples
     Module 3 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 5,
    title: "Price Action Examples",
    tag: "Module 3 · Session 2",
    module: "Price Action Concepts",
    videoUrl: "https://www.youtube.com/embed/C9mMKb8Fa2s",

    intro: {
      heading: "Formations in Context — Seeing the Signal in Real Charts",
      body: "Learning formation names is the first step. The real skill is recognising them in live charts where price is noisy, the structure isn't always clean, and the temptation to jump the gun is strongest. In real trading, formations only matter when they appear at a key S/R level and are confirmed by volume. Context is everything.",
      bullets: [
        "Formations only carry weight at predefined S/R levels — not in the middle of nowhere",
        "Volume confirmation doubles the validity of any formation — always check the volume bar",
        "Candle close is non-negotiable — never act on a pattern mid-candle",
        "Bullish engulfing + volume spike at support = high-probability LTE trigger",
        "Evening Star at resistance + declining volume = high-probability short trigger",
        "Three Inside Up/Down = personal favourite — works as trigger AND entry simultaneously"
      ]
    },

    lesson: {
      heading: "Live Formation Reads — Key Rules in Action",
      body: "Every real-world example in this session reinforces the same core rules: wait for the close, check the volume, and only act when the formation appears at a meaningful level. Pattern recognition without S/R context produces random results. With it, you are reading the exact moment the balance of power shifts.",
      bullets: [
        "<strong>Bullish Engulfing at support + volume spike:</strong> buyers absorbed all selling and closed above the prior candle's open and high — trend continuation likely",
        "<strong>Morning Star at local bottom:</strong> three-candle sequence confirms sellers exhausted and buyers taking control — wait for the third candle to close",
        "<strong>Three Inside Down:</strong> bearish version of Three Inside Up; down candle → closes past midpoint → closes below open/low of candle 1 — downtrend reversal confirmed",
        "<strong>Three Black Crows:</strong> three consecutive large-body bearish candles, minimal upper wicks — bearish continuation; look for this after a failed rally at resistance",
        "<strong>Evening Star at resistance:</strong> up candle → doji at resistance zone → bearish candle closes past midpoint of first — classic short entry trigger",
        "Volume doubles on engulfing confirmation = valid formation; low volume on formation = treat with scepticism",
        "If the candle is still forming, the formation does not exist yet — patience is the edge"
      ]
    },

    introChart: {
      title: "Bullish Engulfing at Support — Volume Confirmed",
      type: "candlestick",
      labels: ltLabels(17),
      volume: { spikes: { 17: 2.0 } },
      ohlc: ltCandles(108, [
        { to: 84, bars: 6 },
        { to: 83, bars: 1 },
        { to: 93, bars: 1 },
        { to: 94, bars: 1 },
        { to: 101, bars: 2 },
        { to: 110, bars: 6 }
      ], { seed: 100, wick: 0.4 }),
      markAreas: [
        { y0: 80, y1: 86, label: "Support Zone", color: "rgba(0,212,212,0.07)" }
      ],
      markPoints: [
        { dataIndex:  6, label: "Pre-Engulf",         position: "bottom" },
        { dataIndex:  7, label: "Bullish Engulfing ✓", position: "bottom" },
        { dataIndex:  9, label: "Confirmation",        position: "top"    }
      ]
    },

    lessonChart: {
      title: "Evening Star at Resistance — Bearish Reversal",
      type: "candlestick",
      labels: ltLabels(16),
      volume: { profile: "declining", spikes: { 18: 2.2 } },
      ohlc: ltCandles(82, [
        { to: 107, bars: 7 },
        { to: 108, bars: 1 },
        { to: 97,  bars: 1 },
        { to: 83,  bars: 7 }
      ], { seed: 101, wick: 0.35 }),
      markLines: [
        { yAxis: 97, label: "Short Entry Trigger", color: "#ff2e88" }
      ],
      markAreas: [
        { y0: 104, y1: 110, label: "Resistance Zone", color: "rgba(255,46,136,0.07)" }
      ],
      markPoints: [
        { dataIndex:  6, label: "ES Candle 1",        position: "top"    },
        { dataIndex:  7, label: "ES Candle 2 (Doji)", position: "top"    },
        { dataIndex:  8, label: "Evening Star ✓",     position: "bottom" }
      ]
    },

    quiz: {
      question: "Price has been in a downtrend for 7 sessions. At the bottom, three candles appear: a strong bearish candle, followed by a doji with equal wicks, then a strong bullish candle that closes well above the midpoint of the first candle. All three appear at a key support level. What formation is this and what does it signal?",
      hint: "Three candles: down → indecision → strong up candle closing past midpoint of candle 1. Where does this appear? What does it signal when found at a support zone?",
      style: "direction",
      answers: [
        { id: "a", text: "● Morning Star at support — bullish reversal; sellers exhausted, buyers taking control", correct: true,  type: "bullish"  },
        { id: "b", text: "● Evening Star — bearish continuation; three candles confirm the downtrend continues",     correct: false, type: "bearish"  },
        { id: "c", text: "● Three Black Crows — the third large candle confirms heavy selling pressure",            correct: false, type: "neutral"  }
      ],
      chart: {
        title: "Identify the Three-Candle Formation",
        type: "candlestick",
        cutIndex: 10,
        labels: ltLabels(14),
        volume: { spikes: { 19: 2.0 } },
        ohlc: ltCandles(105, [
          { to: 84, bars: 7 },
          { to: 80, bars: 1 },
          { to: 80, bars: 1 },
          { to: 91, bars: 1 },
          { to: 97, bars: 1 },
          { to: 107, bars: 3 }
        ], { seed: 102, wick: 0.35 }),
        markAreas: [
          { y0: 77, y1: 83, label: "Support Zone", color: "rgba(0,212,212,0.06)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "Candle 1 (Down)",   position: "bottom", color: "#00d4d4" },
        { dataIndex:  8, label: "Candle 2 (Doji)",   position: "bottom", color: "#00d4d4" },
        { dataIndex:  9, label: "Morning Star! ✓",   position: "top",    color: "#00d4d4" },
        { dataIndex: 11, label: "Confirmed Bounce",  position: "top",    color: "#00d4d4" }
      ],
      explanation: "This is the <strong>Morning Star</strong> — the three-candle bullish reversal. Candle 1 (bearish) shows sellers still in control. Candle 2 (doji) shows complete indecision — neither side winning. Candle 3 (strong bullish closing well past the midpoint of Candle 1) shows buyers have decisively taken over. Found at a support level with volume confirmation, this is a high-probability LTE trigger.",
      rule: "Morning Star at support = bullish reversal trigger. Three candles: down → indecision → strong up. Wait for candle 3 to CLOSE before acting."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 7 — Volume Analysis
     Module 3 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 6,
    title: "Volume Analysis",
    tag: "Module 3 · Session 3",
    module: "Price Action Concepts",
    videoUrl: "https://www.youtube.com/embed/_e_IdqS3Fc0",

    intro: {
      heading: "Volume — The Market's Lie Detector",
      body: "Price tells you where the market went. Volume tells you whether to believe it. A price move without volume support is a whisper. A price move with strong volume is a shout. Volume is a leading indicator that helps you identify who is in control — buyers or sellers — and whether that control is strengthening or weakening.",
      bullets: [
        "Volume = number of units/contracts traded in an asset during a given time period",
        "Stocks = shares; crypto = tokens/coins; derivatives = contracts — volume is recorded for every transaction",
        "Volume confirms breakouts, breakdowns, S/R levels, and candlestick formations",
        "Volume is another point of confluence — adds confirmation to your existing bias",
        "Decreasing volume inside a consolidation = healthy coiling before the move",
        "Spike in volume on the break = confirmation of direction — this is what you are waiting for"
      ]
    },

    lesson: {
      heading: "The Four Volume Scenarios — Who Is in Control?",
      body: "There are only four combinations of price direction and volume direction. Each one tells a specific story about the health of a move and whether it is likely to continue or reverse. Memorise these four scenarios — they are the foundation of all volume analysis.",
      bullets: [
        "<strong>Price Rising + Volume Rising:</strong> ✅ Strong buying — buyers are in full control; trend continuation expected",
        "<strong>Price Rising + Volume Declining:</strong> ⚠️ Weak buying — buyers losing conviction; potential trend exhaustion and reversal ahead",
        "<strong>Price Declining + Volume Rising:</strong> ✅ Strong selling — sellers are in full control; downtrend continuation expected",
        "<strong>Price Declining + Volume Declining:</strong> ⚠️ Weak selling — sellers losing conviction; potential exhaustion and reversal ahead",
        "Look for big volume spikes at S/R flips, breakouts, and breakdowns — that is institutional money moving",
        "Combine volume analysis with S/R levels AND candlestick formations for highest probability setups",
        "Volume works on ALL timeframes — from 5-minute scalp charts to weekly position trade charts"
      ]
    },

    introChart: {
      title: "Four Volume Scenarios — Rising Then Weakening Trend",
      type: "candlestick",
      chartHeight: 440,
      volume: { spikes: { 11: 1.8, 12: 1.9, 16: 0.5, 17: 0.4, 18: 2.0, 19: 1.9, 23: 0.5, 24: 0.4 } },
      labels: ltLabels(20),
      ohlc: ltCandles(80, [
        { to: 108, bars: 8 },
        { to: 76,  bars: 7 },
        { to: 84,  bars: 3 },
        { to: 88,  bars: 2 }
      ], { seed: 103, wick: 0.4 }),
      markLines: [
        { yAxis: 108, label: "Resistance", color: "#ff2e88" },
        { yAxis: 76,  label: "Support",    color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  1, label: "Rising Vol ✅",    position: "bottom" },
        { dataIndex:  7, label: "Weak Buying ⚠️",   position: "top"    },
        { dataIndex:  9, label: "Strong Sell Vol ✅",position: "top"    },
        { dataIndex: 14, label: "Weak Selling ⚠️",  position: "bottom" }
      ]
    },

    lessonChart: {
      title: "Volume Spike Confirms the Breakout",
      type: "candlestick",
      chartHeight: 440,
      volume: { spikes: { 24: 2.6 } },
      labels: ltLabels(18),
      ohlc: ltCandles(87, [
        { to: 90, bars: 4 },
        { to: 84, bars: 4 },
        { to: 91, bars: 4 },
        { to: 88, bars: 1 },
        { to: 87, bars: 1 },
        { to: 100, bars: 1 },
        { to: 108, bars: 3 }
      ], { seed: 104, wick: 0.4 }),
      markLines: [
        { yAxis: 92, label: "Breakout Level", color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 84, y1: 91, label: "Coil 84–91", color: "rgba(0,212,212,0.07)" }
      ],
      markPoints: [ { dataIndex: 17, label: "Trend Continues ✓", position: "top" },
        { dataIndex: 13, label: "Low-Vol Coil",             position: "bottom" },
        { dataIndex: 14, label: "VOLUME SPIKE! Breakout ✓", position: "top"    }
      ]
    },

    quiz: {
      question: "Price has been rising for 6 consecutive sessions. However, each successive up-candle shows lower volume than the previous, with the final candle printing a tiny body on almost no volume at all. What does this volume pattern signal about the move?",
      hint: "Map this to the four volume scenarios: price rising + volume declining = which scenario? What does that tell you about the health of this uptrend?",
      style: "direction",
      answers: [
        { id: "a", text: "● Declining volume on rising price = buyer exhaustion warning — potential reversal ahead",       correct: true,  type: "bearish"  },
        { id: "b", text: "● Rising price with any volume level = buyers in full control; expect continuation upward",       correct: false, type: "bullish"  },
        { id: "c", text: "● No signal — volume patterns require at least 10 sessions to be statistically meaningful",      correct: false, type: "neutral"  }
      ],
      chart: {
        title: "Rising Price — What Does the Volume Pattern Say?",
        type: "candlestick",
        chartHeight: 440,
        volume: { spikes: { 10: 1.5, 12: 1.2, 14: 0.4, 15: 0.2 } },
        cutIndex: 6,
        labels: ltLabels(14),
        ohlc: ltCandles(80, [
          { to: 100, bars: 5 },
          { to: 99,  bars: 1 },
          { to: 92,  bars: 1 },
          { to: 79,  bars: 7 }
        ], { seed: 105, wick: 0.35 })
      },
      revealMarkPoints: [
        { dataIndex:  4, label: "Low Volume ⚠️",         position: "top",    color: "#ffcc00" },
        { dataIndex:  5, label: "Tiny Body — Exhaustion", position: "top",   color: "#ff2e88" },
        { dataIndex:  6, label: "Reversal Begins",       position: "top",    color: "#ff2e88" }
      ],
      explanation: "<strong>Rising price + declining volume</strong> is one of the four volume scenarios — and it is a warning sign, not a green light. When buyers are pushing price higher but doing so with progressively less participation, the move is losing conviction. The tiny-body final candle on almost zero volume is a classic exhaustion signal. The subsequent reversal confirmed what the volume was already telegraphing.",
      rule: "Rising price + declining volume = buyer exhaustion warning. Tighten stops, reduce size, or wait for confirmation before adding to longs."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 8 — Volume Examples
     Module 3 · Session 4
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 7,
    title: "Volume Examples",
    tag: "Module 3 · Session 4",
    module: "Price Action Concepts",
    videoUrl: "https://www.youtube.com/embed/65VTOnegdKA",

    intro: {
      heading: "Volume in Action — Tesla, Ethereum, and Real Setups",
      body: "The four volume scenarios become powerful when applied to real chart data across different assets and timeframes. Tesla weekly and Ethereum 4H both demonstrate how volume leads price, how breakouts are confirmed, and how exhaustion signals the end of a move — all before it is obvious on price alone. Volume works the same way on every chart.",
      bullets: [
        "Tesla weekly: early low volume consolidation → massive volume spike on breakout → trend confirmed",
        "Tesla: price rising + volume rising = buyers in control; price falling + volume falling = sellers losing grip",
        "ETH 4H: high volume selling at range top = sellers dominating; buying volume at support = buyers present",
        "ETH: volume spike on bullish engulfing at support + Sr flip = confirmed breakout",
        "Rising price + rising volume = strong buying; the most reliable trend continuation signal",
        "Volume is most powerful when combined with S/R levels AND candlestick formations — the three-way confluence"
      ]
    },

    lesson: {
      heading: "Reading Volume on Tesla Weekly and Ethereum 4H",
      body: "On Tesla weekly, the early period showed the asset consolidating with low volume — no trend. The breakout from that range came with the highest recorded volume ever at that time — an unmistakable signal of institutional participation. On Ethereum 4H, a range-bound market showed selling at the top and buying at the bottom, until a volume spike on a bullish engulfing at the demand zone confirmed the breakout and the beginning of the trend.",
      bullets: [
        "<strong>Tesla Weekly:</strong> low volume early life = accumulation/range; massive volume spike on range break = start of mega-trend; price rising + vol rising = trend continuation throughout",
        "<strong>Tesla Weekly:</strong> when price fell but volume fell too = selling exhaustion; Morning Star + volume recovery = bottom signal",
        "<strong>Tesla Weekly:</strong> highest ever volume bar = confirmation of the major bull run beginning",
        "<strong>ETH 4H:</strong> identify range (supply at top + demand at bottom); high volume candles at resistance = sellers controlling; long lower wicks at support + buying volume = buyers defending",
        "<strong>ETH 4H:</strong> volume spike on bullish engulfing at demand zone → Sr flip above = confirmed breakout → rising price + rising volume = trend confirmed",
        "Key rule: volume must SPIKE on the breakout candle itself — not the candle before or after",
        "Without the volume spike, the breakout is suspect — treat it as a potential fake-out until volume confirms"
      ]
    },

    introChart: {
      title: "Volume Surge on Breakout — Confirmed Move",
      markAreas: [ { y0: 85, y1: 91, label: "Low-Vol Consolidation", color: "rgba(0,212,212,0.07)" } ],
      type: "candlestick",
      chartHeight: 440,
      volume: { spikes: { 23: 2.6 } },
      labels: ltLabels(18),
      ohlc: ltCandles(86, [
        { to: 91, bars: 4 },
        { to: 85, bars: 4 },
        { to: 91, bars: 4 },
        { to: 88, bars: 1 },
        { to: 100, bars: 1 },
        { to: 114, bars: 4 }
      ], { seed: 106, wick: 0.4 }),
      markLines: [
        { yAxis: 92, label: "Breakout Level", color: "#00d4d4" }
      ],
      markPoints: [ { dataIndex: 17, label: "Price ↑ + Vol ↑ = Trend", position: "top" },
        { dataIndex:  3, label: "Resistance",               position: "top"    },
        { dataIndex: 12, label: "Vol Declining — Coil",     position: "bottom" },
        { dataIndex: 13, label: "Volume Surge — Breakout ✓",position: "top"    }
      ]
    },

    lessonChart: {
      title: "Selling Volume Exhaustion — Reversal Setup",
      type: "candlestick",
      chartHeight: 440,
      volume: { spikes: { 11: 1.9, 12: 1.7, 18: 1.6, 19: 1.8, 20: 2.2 } },
      labels: ltLabels(16),
      ohlc: ltCandles(108, [
        { to: 82, bars: 7 },
        { to: 79, bars: 1 },
        { to: 85, bars: 1 },
        { to: 91, bars: 1 },
        { to: 103, bars: 6 }
      ], { seed: 107, wick: 0.4 }),
      markAreas: [
        { y0: 78, y1: 82, label: "Support / Demand Zone", color: "rgba(0,212,212,0.07)" }
      ],
      markPoints: [
        { dataIndex:  2, label: "Strong Sell Vol",     position: "bottom" },
        { dataIndex:  6, label: "MS 1 (Down)",         position: "bottom" },
        { dataIndex:  7, label: "MS 2 (Doji)",         position: "bottom" },
        { dataIndex:  8, label: "MS 3 — Buyers Step In",position: "top"   },
        { dataIndex:  9, label: "Vol Recovery ✓",      position: "top"    }
      ]
    },

    quiz: {
      question: "Price has been range-bound for 10 sessions between clear support and resistance. Volume has been declining throughout the consolidation. On session 11, price breaks above resistance with a wide-body bullish candle and a major volume spike — the largest in 10 sessions. What does this volume spike confirm?",
      hint: "Apply the volume scenario: price rising sharply + volume spiking = which of the four scenarios? What does that mean for the breakout?",
      style: "direction",
      answers: [
        { id: "a", text: "● Volume spike confirms the breakout — strong institutional buying; expect continuation above resistance", correct: true,  type: "bullish"  },
        { id: "b", text: "● Volume spike is a climactic top signal — exhaustion buying at resistance; expect immediate reversal",     correct: false, type: "bearish"  },
        { id: "c", text: "● Wait for volume confirmation over 3+ sessions before treating this as a valid breakout",             correct: false, type: "neutral"  }
      ],
      chart: {
        title: "Volume Spike on Breakout — What Does It Mean?",
        type: "candlestick",
        chartHeight: 440,
        volume: { spikes: { 20: 2.6 } },
        cutIndex: 10,
        labels: ltLabels(15),
        ohlc: ltCandles(87, [
          { to: 91, bars: 3 },
          { to: 85, bars: 3 },
          { to: 91, bars: 3 },
          { to: 88, bars: 1 },
          { to: 100, bars: 1 },
          { to: 114, bars: 4 }
        ], { seed: 108, wick: 0.4 }),
        markLines: [
          { yAxis: 92, label: "Resistance / Breakout Level", color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 83, y1: 87, label: "Support Zone", color: "rgba(0,212,212,0.06)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  9, label: "Vol Declining — Coil",      position: "bottom", color: "#ffcc00" },
        { dataIndex: 10, label: "VOLUME SPIKE! Breakout ✓",  position: "top",    color: "#00d4d4" },
        { dataIndex: 11, label: "Continuation",              position: "top",    color: "#00d4d4" }
      ],
      explanation: "The declining volume inside the consolidation was healthy — the market was coiling. When price finally broke above resistance on session 11, the major volume spike confirmed the breakout was <strong>real institutional buying</strong>, not a fake-out. Price rising + volume spiking = the strongest bullish signal in volume analysis. The continuation over the following sessions confirmed the breakout was valid.",
      rule: "Volume must spike ON the breakout candle. No volume spike = treat the breakout as suspect until confirmed."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 9 — Classical Chart Patterns
     Module 3 · Session 5
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 8,
    title: "Classical Chart Patterns",
    tag: "Module 3 · Session 5",
    module: "Price Action Concepts",
    videoUrl: "https://www.youtube.com/embed/j1aBq0tLg2o",
    // Bespoke interactive section (its own step after the Introduction) — a browse/hover
    // library of the classical patterns (lt-patternlib.js). Does NOT touch this chapter's charts.
    demo: {
      kind: "patternlib",
      label: "Pattern Library",
      after: "intro",
      heading: "The Classical Chart Pattern Library",
      body: "The formations that repeat across every market and timeframe. Hover any pattern to see how it forms and the exact trade it hands you — the breakout, where the stop belongs, and the measured-move target.",
      bullets: [
        "Continuation patterns (flags, triangles) pause a trend before it resumes; reversal patterns (tops/bottoms, head &amp; shoulders, wedges) end it",
        "Every pattern gives a predefined entry, stop and target — that is the whole point of trading them",
        "Trade a pattern only AFTER it completes (the breakout / neckline break) — never anticipate it",
        "The dot on each card marks the outcome: teal = bullish, pink = bearish"
      ]
    },

    intro: {
      heading: "Patterns Provide Structure — Not Predictions",
      body: "Classical chart patterns are formations that repeat across all markets and timeframes because they reflect recurring human psychology — greed, fear, and indecision playing out the same way, over and over. Patterns give you a predefined entry, stop, target, and invalidation. They do not guarantee outcomes; they define the risk/reward structure of a trade.",
      bullets: [
        "Chart pattern identification is subjective — let price dictate the pattern, not your bias",
        "Only trade patterns AFTER completion — reactive, not anticipatory",
        "Volume must confirm patterns — no volume on the breakout = no confidence in the move",
        "Patterns provide: entry, stop, target, and invalidation — all predefined",
        "Failed reversal pattern = likely continuation of the existing trend",
        "Always wait for a retest of the broken trend line after the initial break — that is your entry"
      ]
    },

    lesson: {
      heading: "Continuation and Reversal Patterns",
      body: "Patterns split into two families: continuation (the trend pauses, then resumes) and reversal (the trend ends and price moves the other direction). Each has a target calculation based on the height of the pattern's key structure — usually called the 'pole' for continuation patterns and the 'head-to-neckline distance' for reversal patterns.",
      bullets: [
        "<strong>Bull Flag:</strong> bullish continuation; only trade in uptrends; descending channel after a sharp pole; volume declines in flag then spikes on breakout; target = height of pole from breakout point",
        "<strong>Bear Flag:</strong> bearish continuation; only in downtrends; ascending channel after a sharp downward pole; volume declines in flag then spikes on breakdown; target = height of pole from breakdown",
        "<strong>Rising Wedge:</strong> bearish; higher highs outpace higher lows; volume declines into wedge → spike on breakdown",
        "<strong>Falling Wedge:</strong> bullish; lower highs outpace lower lows; volume declines into wedge → spike on breakout",
        "<strong>Head & Shoulders (H&S):</strong> bearish reversal at TOP of trend; left shoulder → head (highest) → right shoulder (lower than head) → neckline break; target = head-to-neckline distance",
        "<strong>Inverse H&S:</strong> bullish reversal at BOTTOM of trend; same structure inverted; neckline breakout is the entry",
        "<strong>Ascending Triangle:</strong> higher lows + flat top resistance; bullish bias; target = height of triangle from breakout",
        "<strong>Descending Triangle:</strong> lower highs + flat bottom support; bearish bias; target = height of triangle from breakdown"
      ]
    },

    introChart: {
      title: "Bull Flag — Continuation Pattern Structure",
      markLines: [ { yAxis: 123, label: "Target = flag low + pole height (123)", color: "#ffcc00" },
        { yAxis: 100, label: "Flag Resistance (broken)", color: "#00d4d4" }
      ],
      type: "candlestick",
      volume: { spikes: { 21: 2.4 } },
      chartHeight: 480,
      labels: ltLabels(18),
      ohlc: ltCandles(70, [
        { to: 100, bars: 6 },
        { to: 96,  bars: 2 },
        { to: 93,  bars: 3 },
        { to: 104, bars: 2 },
        { to: 100, bars: 1 },
        { to: 123, bars: 4 }
      ], { seed: 109, wick: 0.4 }),
      markAreas: [
        { y0: 93, y1: 100, label: "Flag — Descending Channel", color: "rgba(0,212,212,0.06)" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Pole Start",    position: "bottom" },
        { dataIndex:  5, label: "Pole Top",      position: "top"    },
        { dataIndex:  8, label: "Flag (LH/LL)",  position: "bottom" },
        { dataIndex: 11, label: "BREAKOUT ↑",    position: "top"    },
        { dataIndex: 13, label: "Retest Entry",  position: "bottom" },
        { dataIndex: 17, label: "Target",        position: "top"    }
      ]
    },

    lessonChart: {
      title: "Head & Shoulders — Bearish Reversal at Trend Top",
      type: "candlestick",
      volume: { profile: "pattern" },
      chartHeight: 480,
      labels: ltLabels(20),
      ohlc: ltCandles(76, [
        { to: 88,   bars: 3 },
        { to: 81.5, bars: 2 },
        { to: 98,   bars: 3 },
        { to: 82.5, bars: 3 },
        { to: 89,   bars: 3 },
        { to: 78,   bars: 2 },
        { to: 82,   bars: 1 },
        { to: 65,   bars: 3 }
      ], { seed: 110, wick: 0.4 }),
      markLines: [ { yAxis: 66, label: "Target = Head→Neckline (66)", color: "#00d4d4" }, { yAxis: 90, label: "Stop — above Right Shoulder", color: "#ff2e88" },
        { yAxis: 82, label: "Neckline", color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  2, label: "Left Shoulder",  position: "top"    },
        { dataIndex:  7, label: "Head (Highest)", position: "top"    },
        { dataIndex: 13, label: "Right Shoulder", position: "top"    },
        { dataIndex: 15, label: "Neckline Break", position: "bottom" },
        { dataIndex: 16, label: "Retest (Entry)", position: "top"    }
      ]
    },

    quiz: {
      question: "Price has made a sharp downward move over 7 sessions (the pole). It then forms an ascending channel with progressively higher highs and higher lows — but this is happening within a confirmed downtrend. The channel is now at resistance. What pattern is forming and what should you expect?",
      hint: "An ascending channel forming within a downtrend is not a bullish reversal. It is a specific continuation pattern with a name. What is it, and what does volume do on the breakdown?",
      style: "direction",
      answers: [
        { id: "a", text: "● Bear Flag — bullish correction within a downtrend; expect breakdown from channel and continuation down", correct: true,  type: "bearish"  },
        { id: "b", text: "● Trend reversal — ascending channel signals buyers taking control; expect upside breakout",               correct: false, type: "bullish"  },
        { id: "c", text: "● Symmetrical Triangle — direction uncertain; wait for a confirmed break of either side",               correct: false, type: "neutral"  }
      ],
      chart: {
        title: "Identify the Pattern — What Comes Next?",
        type: "candlestick",
        chartHeight: 440,
        volume: { spikes: { 23: 2.4 } },
        cutIndex: 12,
        labels: ltLabels(16),
        ohlc: ltCandles(110, [
          { to: 84, bars: 7 },
          { to: 92, bars: 4 },
          { to: 89, bars: 1 },
          { to: 92, bars: 1 },
          { to: 62, bars: 3 }
        ], { seed: 111, wick: 0.4 }),
        markLines: [
          { yAxis: 88, label: "Flag Support (lower channel)", color: "#ff2e88" }
        ],
        markAreas: [
          { y0: 88, y1: 92, label: "Ascending Flag (channel)", color: "rgba(255,46,136,0.06)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  6, label: "Pole Bottom",       position: "bottom", color: "#ff2e88" },
        { dataIndex:  7, label: "Flag Begins",       position: "bottom", color: "#ffcc00" },
        { dataIndex: 12, label: "Flag Top — Level",  position: "top",    color: "#ffcc00" },
        { dataIndex: 13, label: "Breakdown! ↓",      position: "bottom", color: "#ff2e88" },
        { dataIndex: 15, label: "Target = pole height (62)", position: "bottom", color: "#ffcc00" }
      ],
      explanation: "This is a <strong>Bear Flag</strong> — a bearish continuation pattern. The sharp downward pole confirms the sellers are in control. The ascending channel (the flag) is simply the market retracing against the trend with weak buying on declining volume. When price breaks down through the lower channel boundary, the downtrend resumes and the target is measured as the height of the pole from the breakdown point.",
      rule: "Bear Flag = ascending channel within a downtrend. Volume declines inside the flag. Spike on breakdown confirms. Target = height of the pole."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 10 — Classical Pattern Examples
     Module 3 · Session 6
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 9,
    title: "Classical Pattern Examples",
    tag: "Module 3 · Session 6",
    module: "Price Action Concepts",
    videoUrl: "https://www.youtube.com/embed/XaKbiC8pnRc",

    intro: {
      heading: "Patterns in Practice — R Multiples and Live Execution",
      body: "Classical patterns are only as useful as your ability to execute them with discipline. Every pattern provides a Level (the channel boundary or neckline), a Trigger (the breakdown/breakout candle), and an Entry (the retest of the broken level). Combining LTE methodology with pattern trading is how you achieve consistently high R multiples — trades like 3.88:1 and 6.23:1 become repeatable.",
      bullets: [
        "Bear Flag (EOS/USD 12H): entry at Sr flip of flag resistance → trigger = hanging man → stop above resistance → R = 3.88:1",
        "Bull Flag (BTC/USD 4H): entry at Sr flip of bull flag → indecision candle trigger → stop below flag low → R = 6.23:1",
        "Descending Triangle (BTC Daily): waited for neckline retest entry 1 month after breakdown → R = 2.74:1",
        "Ascending Triangle (ETH Daily): higher lows + flat top → breakout + retest entry → R = 2.84:1",
        "Always measure the POLE for your target — this is the objective, predefined price target",
        "Entries come on RETESTS — not immediately on the break; patience after the break is part of the discipline"
      ]
    },

    lesson: {
      heading: "Live Examples — Bear Flag, Bull Flag, and Triangles",
      body: "Real pattern trading requires waiting. After the initial breakout or breakdown from a pattern, it is tempting to chase. The experienced trader waits for the retest of the broken channel wall — that retest is the actual LTE entry. The pattern's pole or height measurement gives a predefined target with no guessing required.",
      bullets: [
        "<strong>Bear Flag execution:</strong> identify downtrend → wait for flag channel to form → Level = upper channel resistance → Trigger = rejection candle at resistance (hanging man) → Entry = breakdown of lower channel support → Stop above flag high → Target = pole distance below breakdown",
        "<strong>Bull Flag execution:</strong> identify uptrend → wait for flag pullback → Level = lower channel support as Sr flip → Trigger = indecision candle → Entry = breakout above upper channel → Stop below flag low → Target = pole distance above breakout",
        "<strong>Descending Triangle:</strong> lower highs + flat bottom → breakdown below flat support → Entry = retest of flat bottom from below (old support now resistance) → Target = height of triangle",
        "<strong>Ascending Triangle:</strong> higher lows + flat top resistance → breakout above flat resistance → Entry = retest of flat top from above (old resistance now support) → Target = height of triangle",
        "Daily timeframe patterns take weeks to months to fully play out — patience is mandatory",
        "Journal R multiples for every pattern trade — data will tell you which pattern type has the highest hit rate in your hands"
      ]
    },

    introChart: {
      title: "Bear Flag — LTE Execution with Entry, Stop, Target",
      type: "candlestick",
      volume: { spikes: { 23: 2.4 } },
      chartHeight: 480,
      labels: ltLabels(18),
      ohlc: ltCandles(108, [
        { to: 82, bars: 7 },
        { to: 93, bars: 3 },
        { to: 89, bars: 2 },
        { to: 93, bars: 1, reject: 3 },
        { to: 88, bars: 1 },
        { to: 67, bars: 4 }
      ], { seed: 112, wick: 0.4 }),
      markLines: [ { yAxis: 95, label: "Stop — Above Flag High", color: "#ff2e88" }, { yAxis: 67, label: "Target — Pole Distance", color: "#ffcc00" },
        { yAxis: 93, label: "Flag Resistance (Level)", color: "#ff2e88" },
        { yAxis: 89, label: "Flag Support (lower channel)", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  6, label: "Pole Bottom",          position: "bottom" },
        { dataIndex:  7, label: "Flag Begins",          position: "bottom" },
        { dataIndex: 12, label: "Level + Trigger (Hanging Man)", position: "top" },
        { dataIndex: 13, label: "Entry — Breakdown",    position: "bottom" },
        { dataIndex: 17, label: "Target Hit",           position: "bottom" }
      ]
    },

    lessonChart: {
      title: "Ascending Triangle — Higher Lows + Flat Top → Breakout",
      type: "candlestick",
      volume: { spikes: { 21: 2.4 } },
      chartHeight: 480,
      labels: ltLabels(17),
      ohlc: ltCandles(76, [
        { to: 80, bars: 2 },
        { to: 92, bars: 3 },
        { to: 86, bars: 2 },
        { to: 92, bars: 2 },
        { to: 88, bars: 2 },
        { to: 95, bars: 2 },
        { to: 92, bars: 1 },
        { to: 108, bars: 3 }
      ], { seed: 113, wick: 0.4 }),
      markLines: [ { yAxis: 108, label: "Target — Triangle Height", color: "#ffcc00" },
        { yAxis: 92, label: "Flat Top Resistance", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  4, label: "Resistance Touch 1", position: "top"    },
        { dataIndex:  6, label: "Higher Low",         position: "bottom" },
        { dataIndex:  8, label: "Resistance Touch 2", position: "top"    },
        { dataIndex: 10, label: "Higher Low 2",       position: "bottom" },
        { dataIndex: 11, label: "BREAKOUT ↑",         position: "top"    },
        { dataIndex: 13, label: "Entry — Retest",     position: "bottom" },
        { dataIndex: 16, label: "Target",             position: "top"    }
      ]
    },

    quiz: {
      question: "Price is making lower highs on every rally while repeatedly bouncing off the same flat support level — touching it four times without breaking lower. The pattern has now formed a third lower high. What pattern is this, and what should you expect next?",
      hint: "Lower highs converging on flat support = a specific triangle pattern with a strong directional bias. What is it called, and which direction does it typically resolve?",
      style: "direction",
      answers: [
        { id: "a", text: "● Descending Triangle — lower highs + flat support = bearish; expect breakdown below the flat level",    correct: true,  type: "bearish"  },
        { id: "b", text: "● Ascending Triangle — flat support signals buyer strength; expect bullish upside breakout",             correct: false, type: "bullish"  },
        { id: "c", text: "● Symmetrical Triangle — lower highs + flat lows is indeterminate; wait for either side to confirm",   correct: false, type: "neutral"  }
      ],
      chart: {
        title: "Lower Highs + Flat Support — What Is This Pattern?",
        type: "candlestick",
        chartHeight: 440,
        volume: { spikes: { 22: 2.4 } },
        cutIndex: 11,
        labels: ltLabels(15),
        ohlc: ltCandles(98, [
          { to: 84, bars: 2 },
          { to: 95, bars: 1 },
          { to: 84, bars: 3 },
          { to: 91, bars: 1 },
          { to: 84, bars: 2 },
          { to: 88, bars: 1 },
          { to: 84, bars: 2 },
          { to: 73, bars: 3 }
        ], { seed: 114, wick: 0.4 }),
        markLines: [
          { yAxis: 84, label: "Flat Support", color: "#ffcc00" }
        ]
      },
      revealMarkPoints: [ { dataIndex: 14, label: "Target — Triangle Height", position: "bottom", color: "#ffcc00" },
        { dataIndex:  2, label: "LH 1",            position: "top",    color: "#ff2e88" },
        { dataIndex:  6, label: "LH 2",            position: "top",    color: "#ff2e88" },
        { dataIndex:  9, label: "LH 3",            position: "top",    color: "#ff2e88" },
        { dataIndex: 11, label: "Setup Complete",  position: "top",    color: "#ffcc00" },
        { dataIndex: 12, label: "Breakdown! ↓",    position: "bottom", color: "#ff2e88" }
      ],
      explanation: "This is a <strong>Descending Triangle</strong> — lower highs converging on flat support. Each successive rally is weaker than the last; sellers are gaining the upper hand. The flat support level has been tested multiple times, progressively weakening it (Rule of Fives). When price finally breaks below the flat support — especially on a volume spike — the measured target is the height of the triangle projected downward from the breakdown point.",
      rule: "Descending Triangle = lower highs + flat support. Bearish bias. Entry on retest of broken flat support from below. Target = triangle height."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 11 — Fibonacci
     Module 4 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 10,
    title: "Fibonacci",
    tag: "Module 4 · Session 1",
    module: "Trading Tools",
    videoUrl: "https://www.youtube.com/embed/RZjYkrjOqt0",
    // Bespoke interactive section (its own step after the Introduction) — the animated
    // Fibonacci retracement demo (lt-fib.js). Charts untouched.
    demo: {
      kind: "fib",
      label: "Fib in Motion",
      after: "intro",
      heading: "Watch a Retracement Find the Golden Pocket",
      body: "Fibonacci measures a pullback against the impulse that came before it. Watch the levels fan out across a move, then price retrace into the 0.618–0.65 <strong>golden pocket</strong> — the most-watched entry zone — and bounce.",
      bullets: [
        "Anchor the tool from the swing low to the swing high of the leg you're measuring",
        "The <strong>0.618–0.65</strong> golden pocket is where the highest-probability entries cluster",
        "Fibonacci is a <em>confluence</em> tool — it's strongest when a level lines up with S/R or a zone, not used alone",
        "Enter on a reaction AT the level (a trigger), never on the level touching alone"
      ]
    },

    intro: {
      heading: "The Golden Ratio in Markets",
      body: "Fibonacci ratios appear throughout nature — snail shells, galaxy spirals, flower petals. They also appear in financial markets, because markets are driven by human psychology, and human perception of proportion follows these same ratios. The Fibonacci retracement tool draws potential support and resistance levels between any two swing points, based on the ratios derived from the famous sequence.",
      bullets: [
        "Fibonacci sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55... each number = sum of the two before it",
        "Key ratio: any number ÷ subsequent number ≈ 0.618 — the Golden Ratio",
        "0.382 = any number ÷ number two places ahead; 0.236 = three places ahead; 0.50 = 1÷2",
        "In TradingView: Fibonacci Retracement tool → draw from swing high to swing low (or reverse)",
        "The tool plots % levels between those two points — these act as potential S/R zones",
        "Key levels: 50% and 61.8% are the primary focus — the highest probability retracement zones"
      ]
    },

    lesson: {
      heading: "How to Use Fibonacci Retracements in Trading",
      body: "Fibonacci retracements are a confirmation tool — not a primary signal. S/R levels come first. Fibonacci is valid when a retracement level aligns with an existing S/R zone or Sr flip. That overlap is called confluence, and it dramatically increases the probability that price will react at that level.",
      bullets: [
        "<strong>Step 1:</strong> identify market structure and trend direction first",
        "<strong>Step 2:</strong> find the key swing high and swing low for the move",
        "<strong>Step 3:</strong> apply the Fibonacci Retracement tool from swing high to swing low (or low to high for uptrend)",
        "<strong>Step 4:</strong> look for the 50% or 61.8% retracement to land near an existing S/R zone or Sr flip level",
        "<strong>Step 5:</strong> the overlap of Fib level + S/R = confluence — treat this as a high-probability LTE level",
        "<strong>Long Setup example:</strong> daily Sr flip at 61.8% Fib → bullish candle trigger → long entry, stop below swing low, target at 61.8% Sr breakdown level above",
        "<strong>Short Setup example:</strong> bearish MS on higher TF → 61.8% Fib = Sr breakdown retest level → short entry, stop above swing high, target at swing low/support",
        "Focus on 50% and 61.8% — other levels (23.6%, 38.2%) are secondary and should be used only with additional confluence",
        "S/R identification comes FIRST — Fib is the magnifying glass that adds precision, not the primary signal"
      ]
    },

    introChart: {
      title: "Fibonacci Retracement — 61.8% as Support (Long Setup)",
      type: "candlestick",
      chartHeight: 480,
      labels: ltLabels(16),
      ohlc: ltCandles(80, [
        { to: 120, bars: 7 },
        { to: 95,  bars: 6 },
        { to: 112, bars: 3 }
      ], { seed: 115, wick: 0.4 }),
      indicator: "fibonacci",
      fibHigh: 120,
      fibLow: 80,
      fibLevels: [0, 0.5, 0.618, 1],
      markLines: [
        { yAxis: 95,  label: "Entry — 61.8%", color: "#00d4d4" },
        { yAxis: 78,  label: "Stop — below swing low", color: "#ff2e88" },
        { yAxis: 118, label: "Target — new highs", color: "#ffcc00" }
      ],
      markAreas: [
        { y0: 93, y1: 97, label: "61.8% Support Zone", color: "rgba(0,212,212,0.07)" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Swing Low",          position: "bottom" },
        { dataIndex:  6, label: "Swing High",         position: "top"    },
        { dataIndex: 12, label: "61.8% Bounce",       position: "bottom" },
        { dataIndex: 15, label: "Continuation ↑",     position: "top"    }
      ]
    },

    lessonChart: {
      title: "Fibonacci Short Setup — 61.8% Retracement as Resistance",
      type: "candlestick",
      chartHeight: 480,
      labels: ltLabels(16),
      ohlc: ltCandles(120, [
        { to: 80,  bars: 7 },
        { to: 104, bars: 5 },
        { to: 98,  bars: 1 },
        { to: 83,  bars: 3 }
      ], { seed: 116, wick: 0.4 }),
      indicator: "fibonacci",
      fibHigh: 120,
      fibLow: 80,
      fibDirection: "up",
      fibLevels: [0, 0.5, 0.618, 1],
      markLines: [ { yAxis: 122, label: "Stop — above swing high", color: "#ff2e88" }, { yAxis: 83, label: "Target — swing low / support", color: "#00d4d4" },],
      markAreas: [
        { y0: 103, y1: 107, label: "61.8% Resistance Zone", color: "rgba(255,46,136,0.07)" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Swing High",             position: "top"    },
        { dataIndex:  6, label: "Swing Low",              position: "bottom" },
        { dataIndex: 11, label: "61.8% Rejection ★",     position: "top"    },
        { dataIndex: 12, label: "Short Entry",            position: "top"    }
      ]
    },

    quiz: {
      question: "An uptrend has been confirmed with a move from swing low to swing high. Price pulls back and the 61.8% Fibonacci retracement level lands exactly on a prior resistance zone that has since flipped to support. Price forms a candle with a long lower wick at this zone. What does the alignment of these two factors tell you, and what is the trade action?",
      hint: "Two separate tools are pointing to the same level: a Fibonacci retracement and an S/R flip. What is this called, and why does it increase the probability of the setup?",
      style: "direction",
      answers: [
        { id: "a", text: "● High-probability long entry — Sr flip + 61.8% Fib confluence; expect bullish bounce toward new highs",  correct: true,  type: "bullish"  },
        { id: "b", text: "● Short entry — Fibonacci retracement signals price is in a downtrend; go short with the retracement",     correct: false, type: "bearish"  },
        { id: "c", text: "● No trade — a single Fibonacci level without volume spike is never sufficient for an entry",             correct: false, type: "neutral"  }
      ],
      chart: {
        title: "Sr Flip + 61.8% Fib — High-Probability Confluence Zone",
        type: "candlestick",
        cutIndex: 12,
        labels: ltLabels(15),
        ohlc: ltCandles(80, [
          { to: 92,  bars: 3 },
          { to: 86,  bars: 2 },
          { to: 92,  bars: 2 },
          { to: 111, bars: 3 },
          { to: 92,  bars: 2, reject: 3 },
          { to: 111, bars: 3 }
        ], { seed: 117, wick: 0.4 }),
        markLines: [
          { yAxis: 95.5, label: "50% Fib",          color: "#ffcc00" },
          { yAxis: 92,   label: "61.8% + Sr Flip",  color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 90, y1: 94, label: "61.8% Confluence Zone", color: "rgba(0,212,212,0.07)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  2, label: "Resistance (92)",     position: "top",    color: "#ff2e88" },
        { dataIndex:  6, label: "Sr Flip Level",       position: "top",    color: "#00d4d4" },
        { dataIndex: 11, label: "61.8% + Sr Flip ✓",  position: "bottom", color: "#00d4d4" },
        { dataIndex: 12, label: "Bounce Confirmed",    position: "top",    color: "#00d4d4" }
      ],
      explanation: "The <strong>Sr flip</strong> at 92 (old resistance broken in D3, now acting as support) and the <strong>61.8% Fibonacci retracement</strong> of the full swing both point to the same price zone. This is <strong>confluence</strong> — two independent technical tools agreeing on the same level. The long lower wick at that zone shows buyers defending it. This is the highest-probability LTE level you can find: a predefined S/R zone amplified by a Fibonacci level.",
      rule: "S/R levels come FIRST. Fibonacci adds precision and confluence. When 61.8% aligns with a Sr flip, treat that zone as a high-priority LTE Level."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 12 — Ichimoku Kinko Hyo
     Module 4 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 11,
    title: "Ichimoku Kinko Hyo",
    tag: "Module 4 · Session 2",
    module: "Trading Tools",
    videoUrl: "https://www.youtube.com/embed/DwSbAuSXYS4",
    // Bespoke interactive section (its own step after the Introduction) — the Ichimoku
    // Cloud Explorer (lt-ichimoku.js): toggle each component on/off. Charts untouched.
    demo: {
      kind: "ichimoku",
      label: "Cloud Explorer",
      after: "intro",
      heading: "Build the Ichimoku Cloud, One Line at a Time",
      body: "Ichimoku looks intimidating because it draws five things at once. Toggle each component on and off — or hover a chip to isolate it — to see exactly what each line adds and how they combine into a single one-glance read of trend, momentum and support/resistance.",
      bullets: [
        "<strong>Tenkan</strong> (fast) and <strong>Kijun</strong> (slow) are momentum lines — their cross is a trigger, and price tends to snap back to them",
        "The <strong>Kumo</strong> (cloud) is projected forward: price above it is bullish, below is bearish; thicker = stronger",
        "The <strong>Chikou</strong> is the close plotted back in time — clear space around it confirms the trend",
        "You rarely trade one line alone — the edge is in the confluence of all five agreeing"
      ]
    },

    intro: {
      heading: "Equilibrium at One Glance",
      body: "Ichimoku Kinko Hyo — 'equilibrium at one glance' in Japanese — is a complete trend identification system. Developed in the 1930s by Goichi Hosoda and refined over 30 years before release, it combines lagging and leading elements to capture 70–80% of any given trend. It tells you the trend direction, the momentum, the strength of S/R, and potential future levels — all on one chart.",
      bullets: [
        "Ichimoku = trend following ONLY — it does NOT work in range-bound markets; never apply it to consolidation",
        "Goal: capture 70–80% of the trend — the 'meat' — not the absolute top or bottom",
        "Five components: Tenkan-sen, Kijun-sen, Senkou Span A, Senkou Span B, Chikou Span",
        "The Kumo (Cloud) is formed by Senkou Span A and B — it acts as dynamic S/R",
        "Thicker Kumo = stronger S/R; thinner Kumo = weaker S/R; Kumo Twist = potential trend change signal",
        "Crypto settings (24/7): 10/30/60/30 or doubled 20/60/120/30 (preferred — fewer, higher-quality signals)"
      ]
    },

    lesson: {
      heading: "The Five Components and the Kumo",
      body: "Each component of Ichimoku answers a specific question about the market. Together they create a self-contained system where every entry, exit, and trend signal can be derived from a single chart. The Kijun-sen is the most important component — it is the backbone of the trend read and the primary trailing stop tool.",
      bullets: [
        "<strong>Tenkan-sen (Conversion Line):</strong> fast moving average (avg of high+low over short period); most responsive to recent price action",
        "<strong>Kijun-sen (Baseline):</strong> slow moving average (avg of high+low over longer period); the most important component; price above = bullish, below = bearish; used as trailing stop",
        "<strong>Senkou Span A:</strong> average of Tenkan + Kijun; forms one boundary of the Cloud; plotted 26 periods ahead",
        "<strong>Senkou Span B:</strong> avg of high+low over longest lookback; forms the other boundary; plotted 26 periods ahead",
        "<strong>Chikou Span (Lagging Span):</strong> current price plotted 26 periods back; above past price = bullish, below = bearish",
        "<strong>Bullish Kumo:</strong> Senkou Span A above B = green cloud = support zone ahead",
        "<strong>Bearish Kumo:</strong> Senkou Span B above A = red cloud = resistance zone ahead",
        "<strong>Kumo Twist:</strong> Span A crosses Span B — signal of a potential trend change; look for this ahead of price"
      ]
    },

    introChart: {
      title: "Ichimoku Bullish Configuration — Price Above Cloud and Kijun",
      type: "candlestick",
      chartHeight: 520,
      labels: ltLabels(20),
      ohlc: ltCandles(90, [
        { to: 93,  bars: 2 },
        { to: 99,  bars: 2 },
        { to: 107, bars: 6 },
        { to: 104, bars: 1 },
        { to: 128, bars: 9 }
      ], { seed: 118, wick: 0.35 }),
      indicator: "ichimoku",
      tenkan: [90,92,93,95,96,98,100,101,103,105,107,108,110,112,113,115,117,118,120,122],
      kijun:  [86,87,88,89,90,91,92,93,94,95,97,98,100,101,103,105,107,109,111,113],
      spanA:  [88,89.5,90.5,92,93,94.5,96,97,98.5,100,102,103,105,106.5,108,110,112,113.5,115.5,117.5],
      spanB:  [80,80,80,81,81,81,82,82,82,83,83,83,84,84,84,85,85,85,86,86],
      markLines: [],
      markAreas: [],
      markPoints: [
        { dataIndex:  3, label: "Above All — Bullish ✓",  position: "top"    },
        { dataIndex: 10, label: "Holds Above Kijun",       position: "bottom" },
        { dataIndex: 19, label: "Trend Intact",           position: "top"    }
      ]
    },

    lessonChart: {
      title: "Kumo Twist — Bearish Cloud Turns Bullish",
      type: "candlestick",
      chartHeight: 520,
      labels: ltLabels(18),
      ohlc: ltCandles(108, [
        { to: 78, bars: 9 },
        { to: 80, bars: 2 },
        { to: 120, bars: 7 }
      ], { seed: 119, wick: 0.35 }),
      indicator: "ichimoku",
      ichiLookback: false,
      markLines: [],
      markAreas: [],
      markPoints: [
        { dataIndex:  5, label: "Below Cloud (Bearish)", position: "bottom" },
        { dataIndex: 10, label: "Price Reclaims Cloud",  position: "bottom" },
        { dataIndex: 13, label: "Kumo Twist → Bullish",  position: "top"    },
        { dataIndex: 16, label: "Above Cloud ✓",         position: "top"    }
      ]
    },

    quiz: {
      question: "An Ichimoku chart shows price trading above the Kumo (Cloud) with both Senkou Span A and B clearly below current price. The Kijun-sen (Baseline) is also below current price. What does this configuration confirm about the trend?",
      hint: "In Ichimoku, two of the most important bullish signals are price above the cloud AND price above the Kijun. What do both being true simultaneously tell you?",
      style: "direction",
      answers: [
        { id: "a", text: "● Bullish — price above cloud + above Kijun confirms strong bullish trend structure in Ichimoku",      correct: true,  type: "bullish"  },
        { id: "b", text: "● Bearish — the Kijun should be above price for a bullish read; Kijun below price is a short signal",   correct: false, type: "bearish"  },
        { id: "c", text: "● No signal yet — Ichimoku requires all 5 components to align simultaneously before any directional read", correct: false, type: "neutral"  }
      ],
      chart: {
        title: "Read the Ichimoku Configuration",
        type: "candlestick",
        indicator: "ichimoku",
        cutIndex: 9,
        labels: ltLabels(14),
        ohlc: ltCandles(88, [
          { to: 105, bars: 9 },
          { to: 103, bars: 1 },
          { to: 114, bars: 4 }
        ], { seed: 120, wick: 0.35 }),
        markLines: [
          { yAxis: 85, label: "Kijun (trailing stop)", color: "#ffcc00" }
        ],
        markAreas: [
          { y0: 78, y1: 86, label: "Bullish Kumo pocket", color: "rgba(40,200,120,0.08)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  0, label: "Above Cloud ✓",   position: "top",    color: "#00d4d4" },
        { dataIndex:  0, label: "Above Kijun ✓",   position: "bottom", color: "#00d4d4" },
        { dataIndex:  9, label: "Bullish ✓",       position: "top",    color: "#00d4d4" },
        { dataIndex: 10, label: "Continuation",    position: "top",    color: "#00d4d4" }
      ],
      explanation: "In Ichimoku, price above the Kumo and price above the Kijun-sen are two of the four Kumo Breakout prerequisites. When price is trading above both simultaneously, the system reads the market as <strong>bullish</strong> with a confirmed trend structure. The Kijun below price also serves as the dynamic trailing stop level — as long as price stays above it, the long bias is intact.",
      rule: "Ichimoku bullish: price above cloud + price above Kijun = trend confirmed. Use Kijun as your trailing stop."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 13 — Ichimoku Market Scenario
     Module 4 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 12,
    title: "Ichimoku Market Scenario",
    tag: "Module 4 · Session 3",
    module: "Trading Tools",
    videoUrl: "https://www.youtube.com/embed/9vwuGWB9bic",

    intro: {
      heading: "The Kumo Breakout — Four Prerequisites, One Entry",
      body: "Ichimoku's power comes from requiring ALL four prerequisites to align before entering a Kumo Breakout trade. This checklist eliminates low-quality signals and keeps you out of choppy markets. The Live ETH example shows how a trade entered at 640 with all four prerequisites confirmed rode to 1,035+ using only the Kijun as a trailing stop — capturing the full meat of the trend.",
      bullets: [
        "P1: Price closing ABOVE the Kumo (for longs) / BELOW the Kumo (for shorts)",
        "P2: Price closing ABOVE the Kijun-sen (for longs) / BELOW Kijun (for shorts)",
        "P3: Bullish Kumo Twist (Span A crosses above Span B) for longs / Bearish twist for shorts",
        "P4: Chikou Span ABOVE price (for longs) / BELOW price (for shorts)",
        "ALL FOUR must be met — if even one is missing, the Kumo Breakout setup is NOT valid",
        "Remember: Ichimoku ONLY works in trending markets — check your higher timeframe for trend first"
      ]
    },

    lesson: {
      heading: "Entering and Exiting with Ichimoku",
      body: "Once all four prerequisites are confirmed, there are three entry options based on your risk tolerance. The exit method is equally systematic: use the Kijun as a trailing stop, moving it up as price creates new swing highs. When price closes below Kijun, the trend is likely over — exit. This captures the full trend without second-guessing.",
      bullets: [
        "<strong>Entry Option 1 (Blind Market Order):</strong> immediately enter long/short once all 4 prerequisites are met; most aggressive; may get a less favourable fill",
        "<strong>Entry Option 2 (Tenkan Retest):</strong> wait for price to pull back to the Tenkan-sen after prerequisites are met; place bids at Tenkan; cleaner entry, slightly lower risk",
        "<strong>Entry Option 3 (Sr Flip LTE):</strong> wait for a retest of a key Sr flip level using the full LTE framework; most conservative and highest probability entry",
        "<strong>Exit — Kijun Trailing Stop:</strong> move stop to below Kijun as each new higher high is set; Kijun dynamically follows the trend; when price CLOSES below Kijun = exit signal",
        "<strong>ETH Live Example:</strong> all 4 prerequisites met at 640 → enter at Tenkan retest → stop at Kijun (603) → rode from 640 to 1,035+ → exited at 890 on Kijun close = massive win",
        "Fake-outs exist — always wait for the candle to CLOSE below Kijun before exiting; do not react mid-candle",
        "Partial profits at key swing levels are also valid inside an Ichimoku trend trade"
      ]
    },

    introChart: {
      title: "Kumo Breakout — All Four Prerequisites Met",
      type: "candlestick",
      chartHeight: 520,
      labels: ltLabels(16),
      indicator: "ichimoku",
      ichiLookback: false,
      ohlc: ltCandles(100, [
        { to: 82, bars: 7 },
        { to: 84, bars: 2 },
        { to: 120, bars: 7 }
      ], { seed: 121, wick: 0.35 }),
      markLines: [],
      markAreas: [],
      markPoints: [
        { dataIndex:  4, label: "Below Cloud (Bearish)", position: "bottom" },
        { dataIndex: 10, label: "P3: Kumo Twist ✓",      position: "top"    },
        { dataIndex: 12, label: "P1: Above Cloud ✓",     position: "top"    },
        { dataIndex: 13, label: "P2: Above Kijun ✓",     position: "bottom" },
        { dataIndex: 14, label: "P4: Chikou Above ✓",    position: "top"    },
        { dataIndex: 15, label: "ENTRY ✔",               position: "top"    }
      ]
    },

    lessonChart: {
      title: "Kijun Trailing Stop — Riding the Full Trend",
      type: "candlestick",
      chartHeight: 520,
      labels: ltLabels(18),
      ohlc: ltCandles(85, [
        { to: 98,  bars: 5 },
        { to: 107, bars: 4 },
        { to: 116, bars: 4 },
        { to: 118, bars: 3 },
        { to: 108, bars: 2 }
      ], { seed: 122, wick: 0.4 }),
      markLines: [
        { yAxis: 85,  label: "Entry",                    color: "#00d4d4" },
        { yAxis: 82,  label: "Initial Stop",             color: "#ff2e88" },
        { yAxis: 94,  label: "Kijun Trail 1",            color: "#ff2e88" },
        { yAxis: 103, label: "Kijun Trail 2",            color: "#ff2e88" },
        { yAxis: 110, label: "Final Kijun (trailing stop)", color: "#ff2e88" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Entry",              position: "bottom" },
        { dataIndex:  4, label: "Kijun → 94",         position: "top"    },
        { dataIndex:  8, label: "Kijun → 103",        position: "top"    },
        { dataIndex: 12, label: "Kijun → 110",        position: "top"    },
        { dataIndex: 17, label: "Close < Kijun EXIT", position: "bottom" }
      ]
    },

    quiz: {
      question: "All four Kumo Breakout prerequisites have been confirmed. You decide to wait for a cleaner entry instead of entering immediately at market. Price then pulls back to touch the Tenkan-sen (Conversion Line). What is the correct entry action?",
      hint: "There are three entry options after prerequisites are met. Which one involves placing bids at the Tenkan-sen for a cleaner, lower-risk fill?",
      style: "choice",
      answers: [
        { id: "a", text: "Enter long at the Tenkan-sen — Entry Option 2: cleaner entry after prerequisites are already confirmed",    correct: true,  type: "bullish" },
        { id: "b", text: "The pullback to Tenkan invalidates the prerequisites — stand aside; do not enter",                            correct: false, type: "bearish" },
        { id: "c", text: "Wait for price to pull back all the way to the Kijun-sen for the most conservative possible entry",          correct: false, type: "neutral" }
      ],
      chart: {
        title: "All 4 Prerequisites Met — Tenkan Pullback. What Now?",
        type: "candlestick",
        indicator: "ichimoku",
        cutIndex: 11,
        labels: ltLabels(14),
        ohlc: ltCandles(90, [
          { to: 107, bars: 10 },
          { to: 100, bars: 1 },
          { to: 107, bars: 1 },
          { to: 113, bars: 2 }
        ], { seed: 123, wick: 0.35 }),
        markAreas: [
          { y0: 80, y1: 88, label: "Bullish Kumo pocket", color: "rgba(40,200,120,0.06)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 10, label: "Tenkan Entry ✓",       position: "bottom", color: "#00d4d4" },
        { dataIndex: 11, label: "Bounce Confirmed",     position: "top",    color: "#00d4d4" },
        { dataIndex: 13, label: "Ichimoku Trend ↑",    position: "top",    color: "#00d4d4" }
      ],
      explanation: "When all four prerequisites are already confirmed, a Tenkan-sen pullback is <strong>Entry Option 2</strong> — not a signal to abort. The prerequisites remain valid unless price closes back below the Kumo or below Kijun. Bidding at the Tenkan gives a lower entry price than the initial breakout while maintaining the same trade thesis. The Kijun remains the stop level.",
      rule: "Tenkan retest after Kumo breakout = Entry Option 2. Prerequisites remain valid. Place bids at Tenkan. Stop below Kijun."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 14 — Oscillators
     Module 4 · Session 4
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 13,
    title: "Oscillators",
    tag: "Module 4 · Session 4",
    module: "Trading Tools",
    videoUrl: "https://www.youtube.com/embed/A7tYHQ9k_6A",

    intro: {
      heading: "Oscillators — Leading Indicators with Limits",
      body: "Oscillators are technical indicators that fluctuate between two extreme values — an upper bound (overbought) and a lower bound (oversold) — with a midpoint in between. They identify potential exhaustion points of buyers or sellers. The most common types are RSI (Relative Strength Index), MACD, and Stochastics. Whichever you choose, the rules are the same.",
      bullets: [
        "Oscillators oscillate between two extreme values with a centre line/midpoint",
        "Overbought = oscillator hovering in upper bound — buyers may be exhausted; be cautious adding longs",
        "Oversold = oscillator in lower bound — sellers may be exhausted; opportunistic buyers may step in",
        "Oscillators alone ≠ trade signal — they are additional CONFLUENCE only, never a standalone entry",
        "Common types: RSI, MACD, Stochastics — each has pros and cons; pick one, learn it deeply, stick to it",
        "An overbought oscillator in a strong trend can STAY overbought for many sessions — never short overbought alone"
      ]
    },

    lesson: {
      heading: "Overbought, Oversold, and the Confluence Rule",
      body: "The most dangerous mistake with oscillators is treating them as standalone signals. An asset can stay overbought for weeks in a strong trend. An asset can stay oversold for weeks in a strong downtrend. Oscillators become powerful when they agree with an existing S/R zone, a candlestick formation, and a volume signal. That three-way confluence is what produces high-probability setups.",
      bullets: [
        "<strong>Overbought:</strong> oscillator in upper bound; caution on adding to longs; watch for reversal formation at nearby resistance",
        "<strong>Oversold:</strong> oscillator in lower bound; watch for buyer signals at nearby support; potential long entry zone",
        "<strong>The Confluence Rule:</strong> oscillator reading + S/R zone + candlestick trigger + volume = valid entry setup",
        "Oscillator alone = 0/4 — not a signal. Oscillator + S/R = 2/4. Oscillator + S/R + candle + vol = 4/4 — trade it",
        "RSI is the most commonly used oscillator for divergence analysis (covered in Chapter 15)",
        "MACD is best for identifying trend momentum shifts; Stochastics for short-term overbought/oversold readings",
        "Oversold at major support + long lower wick + volume spike = extremely high-probability long setup"
      ]
    },

    introChart: {
      title: "RSI Overbought — Caution Zone, Not a Standalone Short",
      markLines: [ { yAxis: 107, label: "Resistance — the S/R that validates the OB reversal", color: "#ff2e88" } ],
      type: "candlestick",
      chartHeight: 480,
      labels: ltLabels(18),
      ohlc: ltCandles(80, [
        { to: 107, bars: 7 },
        { to: 85,  bars: 8 },
        { to: 90,  bars: 3 }
      ], { seed: 124, wick: 0.4 }),
      indicator: "rsi_zones",
      rsiPeriod: 14,
      markPoints: [
        { dataIndex:  4, label: "RSI Entering OB ↑",          position: "top"    },
        { dataIndex:  6, label: "RSI Deeply OB — Caution ⚠️", position: "top"    },
        { dataIndex:  7, label: "Reversal (Not OB Alone!)",   position: "top", color: "#ff2e88" }
      ]
    },

    lessonChart: {
      title: "Oversold at Support — Confluence = High-Probability Long",
      markLines: [ { yAxis: 92, label: "Long Entry — on reversal confirmation", color: "#00d4d4" },
        { yAxis: 73, label: "Stop — below support", color: "#ff2e88" }
      ],
      type: "candlestick",
      chartHeight: 480,
      labels: ltLabels(18),
      ohlc: ltCandles(108, [
        { to: 84, bars: 6 },
        { to: 80, bars: 1 },
        { to: 82, bars: 2 },
        { to: 80, bars: 1, reject: 4 },
        { to: 92, bars: 1 },
        { to: 113, bars: 7 }
      ], { seed: 125, wick: 0.4 }),
      indicator: "rsi_zones",
      rsiPeriod: 14,
      markAreas: [
        { y0: 74, y1: 82, label: "Support + Oversold Zone", color: "rgba(0,212,212,0.07)" }
      ],
      markPoints: [
        { dataIndex:  5, label: "RSI Oversold ↓",             position: "bottom" },
        { dataIndex:  6, label: "Deeply Oversold ⚠️",         position: "bottom" },
        { dataIndex:  9, label: "Hammer + OS = Confluence",   position: "bottom" },
        { dataIndex: 10, label: "Reversal Confirmed",         position: "top"    }
      ]
    },

    quiz: {
      question: "A trader sees price in a strong uptrend. The RSI oscillator has been in overbought territory for several sessions. Their friend says 'RSI is overbought — go short immediately.' Is this correct trading practice?",
      hint: "Oscillators are one of the four confluence factors. How many of the four are needed for a valid entry? Can an oscillator alone trigger a trade?",
      style: "choice",
      answers: [
        { id: "a", text: "No — oscillators are confluence only; overbought alone is never a standalone trade signal; need S/R + candle trigger + volume too", correct: true,  type: "neutral" },
        { id: "b", text: "Yes — RSI overbought is a reliable standalone short signal; immediately exit longs and go short",                                       correct: false, type: "bearish" },
        { id: "c", text: "Yes, but only when RSI exceeds 80 and has been overbought for 3 or more consecutive sessions",                                       correct: false, type: "bullish" }
      ],
      chart: {
        title: "RSI Overbought — Standalone Short Signal?",
        type: "candlestick",
        indicator: "rsi_zones",
        rsiPeriod: 14,
        cutIndex: 5,
        labels: ltLabels(12),
        ohlc: ltCandles(82, [
          { to: 124, bars: 12 }
        ], { seed: 126, wick: 0.35 }),
        markPoints: [
          { dataIndex:  3, label: "RSI Overbought Zone ↑", position: "top" },
          { dataIndex:  5, label: "Still Deeply OB",        position: "top" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  5, label: "OB — But No S/R Resistance",  position: "top",    color: "#ffcc00" },
        { dataIndex:  8, label: "Trend Continues!",            position: "top",    color: "#00d4d4" },
        { dataIndex: 11, label: "OB Can Last for Sessions",    position: "top",    color: "#00d4d4" }
      ],
      explanation: "An overbought oscillator in a strong uptrend can stay overbought for many sessions while price continues to climb. Shorting purely because RSI is overbought — with no S/R resistance level, no bearish candlestick trigger, and no volume reversal signal — is one of the most common and costly beginner mistakes. Oscillators are <strong>confluence</strong> only: one piece of a four-part puzzle.",
      rule: "Oscillators are CONFLUENCE only. Overbought ≠ short. Oversold ≠ long. Always combine with S/R + candlestick + volume."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 15 — Divergences
     Module 4 · Session 5
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 14,
    title: "Divergences",
    tag: "Module 4 · Session 5",
    module: "Trading Tools",

    intro: {
      heading: "When Price and the Oscillator Disagree",
      body: "A divergence occurs when price action and an oscillator tell different stories. Price makes a new high or low, but the oscillator fails to confirm it. This disagreement is a leading signal — it suggests that the momentum behind the move is weakening even though price hasn't reversed yet. There are two families: Regular Divergences (signal reversal) and Hidden Divergences (signal continuation).",
      bullets: [
        "Divergences exist only when price makes: Higher Highs, Lower Lows, or Double Tops/Bottoms",
        "Connect TOPS to TOPS for bearish divergences; BOTTOMS to BOTTOMS for bullish divergences — be consistent",
        "The slope of the connected lines MUST differ for a valid divergence (one up, one down)",
        "Divergences only play out AFTER the oscillator crosses back from overbought/oversold into the midrange",
        "Never trade divergences alone — always combine with S/R, volume, and candlestick structure",
        "Divergences are LEADING indicators — they point to a probable future move, not a guaranteed one"
      ]
    },

    lesson: {
      heading: "Regular and Hidden Divergences — Reversal vs Continuation",
      body: "Regular divergences signal trend exhaustion and potential reversal. Hidden divergences signal trend continuation after a retracement. Understanding which family a divergence belongs to is critical — acting on a hidden divergence as if it were a regular divergence (or vice versa) produces the wrong trade direction entirely.",
      bullets: [
        "<strong>Regular Bullish Divergence:</strong> price makes Lower Low; oscillator makes Higher Low — seller exhaustion; potential reversal UP; found at BOTTOMS",
        "<strong>Regular Bearish Divergence:</strong> price makes Higher High; oscillator makes Lower High — buyer exhaustion; potential reversal DOWN; found at TOPS",
        "<strong>Hidden Bullish Divergence:</strong> price makes Higher Low; oscillator makes Lower Low — buyers re-entering the trend; continuation UP (buy the dip in an uptrend)",
        "<strong>Hidden Bearish Divergence:</strong> price makes Lower High; oscillator makes Higher High — sellers re-entering; continuation DOWN (sell the rally in a downtrend)",
        "Do not look for hidden bearish divergences in a macro uptrend (and vice versa) — trade WITH the HTF trend",
        "The divergence signal is strongest when it appears at a key S/R zone simultaneously with a candlestick trigger",
        "Regular divergences = found at trend extremes; Hidden divergences = found during pullbacks in ongoing trends"
      ]
    },

    introChart: {
      title: "Regular Bullish Divergence — Price LL, Oscillator HL",
      type: "candlestick",
      chartHeight: 480,
      labels: ltLabels(16),
      ohlc: ltCandles(102, [
        { to: 80, bars: 6 },
        { to: 84, bars: 2 },
        { to: 77, bars: 4 },
        { to: 86, bars: 1 },
        { to: 97, bars: 3 }
      ], { seed: 127, wick: 0.4 }),
      markAreas: [
        { y0: 75, y1: 81, label: "Support Zone", color: "rgba(0,212,212,0.07)" }
      ],
      markPoints: [
        { dataIndex:  5, label: "Price LL1 | Osc. Low 1",                          position: "bottom" },
        { dataIndex: 11, label: "Price LL2 (Lower) | Osc. Low 2 (HIGHER) ← Div!", position: "bottom" },
        { dataIndex: 12, label: "Reversal Begins",                                  position: "top"    }
      ]
    },

    lessonChart: {
      title: "Regular Bearish Divergence — Price HH, Oscillator LH",
      type: "candlestick",
      chartHeight: 480,
      labels: ltLabels(16),
      ohlc: ltCandles(80, [
        { to: 101, bars: 6 },
        { to: 95,  bars: 2 },
        { to: 106, bars: 4 },
        { to: 96,  bars: 1 },
        { to: 87,  bars: 3 }
      ], { seed: 128, wick: 0.4 }),
      markAreas: [
        { y0: 101, y1: 108, label: "Resistance Zone", color: "rgba(255,46,136,0.07)" }
      ],
      markPoints: [
        { dataIndex:  5, label: "Price HH1 | Osc. High 1",                          position: "top" },
        { dataIndex: 11, label: "Price HH2 (Higher) | Osc. High 2 (LOWER) ← Div!", position: "top" },
        { dataIndex: 12, label: "Candlestick Trigger → Reversal Down",                                     position: "top" }
      ]
    },

    quiz: {
      question: "On a 4H chart, price makes a new Higher High. At the same time, the RSI oscillator makes a Lower High compared to the previous peak. The setup appears at a known resistance zone. What type of divergence is this and what does it signal?",
      hint: "Price goes UP to a new HH. The oscillator goes DOWN to a LH at the same time. Which divergence family does this belong to? What does it mean for the trend?",
      style: "direction",
      answers: [
        { id: "a", text: "● Regular Bearish Divergence — price HH + oscillator LH = buyer exhaustion; potential reversal DOWN", correct: true,  type: "bearish"  },
        { id: "b", text: "● Hidden Bullish Divergence — higher high in price confirms trend continuation upward",              correct: false, type: "bullish"  },
        { id: "c", text: "● Regular Bullish Divergence — the oscillator's lower high relative to price is a buy signal",     correct: false, type: "neutral"  }
      ],
      chart: {
        title: "Price HH + Oscillator LH — Name This Divergence",
        type: "candlestick",
        cutIndex: 11,
        labels: ltLabels(14),
        ohlc: ltCandles(80, [
          { to: 102, bars: 6 },
          { to: 97,  bars: 3 },
          { to: 106, bars: 3 },
          { to: 96,  bars: 1 },
          { to: 90,  bars: 1 }
        ], { seed: 129, wick: 0.4 }),
        markAreas: [
          { y0: 101, y1: 108, label: "Resistance Zone", color: "rgba(255,46,136,0.07)" }
        ],
        markPoints: [
          { dataIndex:  5, label: "Price HH1 | Osc. High 1",                          position: "top" },
          { dataIndex: 11, label: "Price HH2 (Higher) | Osc. High 2 (LOWER) ← Div",  position: "top" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 11, label: "Bearish Div. Confirmed",  position: "top",    color: "#ff2e88" },
        { dataIndex: 12, label: "Reversal Begins ↓",       position: "top",    color: "#ff2e88" }
      ],
      explanation: "This is a <strong>Regular Bearish Divergence</strong>. Price created a new higher high — suggesting strength. But the RSI made a lower high at the same time — suggesting buyers are losing momentum even as price makes new highs. This disagreement is buyer exhaustion. Found at a resistance zone, it is a high-quality confluence signal to watch for a short trigger. The subsequent reversal confirmed the divergence was valid.",
      rule: "Regular Bearish Div = price HH + oscillator LH = buyer exhaustion → potential reversal DOWN. Never trade it alone — combine with S/R and a candlestick trigger."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 16 — Financial Instruments
     Module 5 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 15,
    title: "Financial Instruments",
    tag: "Module 5 · Session 1",
    module: "Financial Instruments",
    videoUrl: "https://www.youtube.com/embed/3Q-zoy2UTdQ",

    intro: {
      heading: "Beyond Spot — The World of Derivatives",
      body: "A derivative is a financial instrument that derives its value from an underlying asset — stocks, bonds, currencies, commodities, cryptocurrencies, indices. The underlying asset is also called the Spot Market or Physical Market. Derivatives are contracts between two or more parties whose price is determined by changes in the underlying asset. They serve two primary purposes: hedging risk and speculation.",
      bullets: [
        "Spot Market = buying/selling the actual asset itself (BTC, ETH, gold, USD, etc.)",
        "Derivatives Market = contracts that track the value of the spot asset; you never own the underlying",
        "Hedging = using derivatives as insurance to limit losses from adverse price moves",
        "Speculation = using derivatives to bet on the direction of the underlying asset for profit",
        "Underlying assets include: stocks, bonds, currencies, commodities, crypto, and indices (S&P 500, DJIA)",
        "Leverage/Margin = using borrowed capital to amplify position size — covered in Course 3"
      ]
    },

    lesson: {
      heading: "Futures, Options, Swaps, and Perpetual Swaps",
      body: "The derivatives landscape covers several distinct instruments. In crypto, the Perpetual Swap is by far the most important — it is the most liquid instrument on every major exchange, has no expiry date, and is what most active traders use for leveraged speculation. Understanding the difference between these instruments is essential before trading them.",
      bullets: [
        "<strong>Futures:</strong> contract to buy/sell an asset at a specified price and future date; traded on regulated exchanges with a clearing party; fixed expiry date; used for both hedging and speculation",
        "<strong>Forwards:</strong> same as futures but NOT regulated; agreed directly between two parties; common in commercial settings (e.g., wheat farmer and cereal manufacturer)",
        "<strong>Options:</strong> gives the RIGHT (not obligation) to buy/sell at a specified price (strike) by an expiry date; like insurance; requires upfront capital (the premium); can expire worthless",
        "<strong>Swaps:</strong> two parties exchange cash flows from assets over a period; most common form = interest rate swaps",
        "<strong>Perpetual Swaps:</strong> like futures but with NO expiry date; ongoing, continuous contracts; most common and most liquid instrument on crypto exchanges; used with leverage/margin",
        "Perpetual Swaps are the key instrument for Course 3 — understand the difference between spot and perpetuals before going further",
        "A long perpetual swap profits when price rises; a short perpetual swap profits when price falls — without owning any actual coins"
      ]
    },

    introChart: {
      title: "Spot Asset Price — Derivatives Track This Underlying",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(82, [
        { to: 97,  bars: 7 },
        { to: 103, bars: 5 },
        { to: 117, bars: 6 }
      ], { seed: 130, wick: 0.4 }),
      markPoints: [
        { dataIndex:  0, label: "Spot Market Price",          position: "bottom" },
        { dataIndex:  6, label: "Derivative ≈ Spot Price",   position: "top"    },
        { dataIndex: 14, label: "Perp Swap Tracks This",      position: "top"    }
      ]
    },

    lessonChart: {
      title: "Perpetual Swap — No Expiry, Continuous Leverage Trading",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(100, [
        { to: 114, bars: 7 },
        { to: 100, bars: 4 },
        { to: 124, bars: 7 }
      ], { seed: 131, wick: 0.4 }),
      markPoints: [
        { dataIndex:  0, label: "Long Perp — No Expiry",   position: "bottom" },
        { dataIndex:  6, label: "Short Perp — No Expiry",  position: "top"    },
        { dataIndex: 10, label: "Trade Continuously",       position: "bottom" },
        { dataIndex: 17, label: "No Roll Required",         position: "top"    }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "A crypto trader wants to speculate on Bitcoin price direction without owning actual BTC. They want no expiry date on the contract, access to leverage, and to trade on a major crypto exchange. Which financial instrument should they use?",
      hint: "One instrument on crypto exchanges has no expiry, uses leverage, tracks spot price closely, and is the most liquid derivative in crypto. What is it?",
      style: "choice",
      answers: [
        { id: "a", text: "Perpetual Swap — no expiry date, leverage available, tracks spot price, most liquid crypto derivative instrument", correct: true,  type: "bullish" },
        { id: "b", text: "Spot Market — buy/sell actual BTC directly; no leverage by default; you own the underlying asset",               correct: false, type: "neutral" },
        { id: "c", text: "Standard Futures Contract — regulated exchange; fixed expiry date; must be rolled over at expiry",               correct: false, type: "bearish" }
      ],
      chart: {
        title: "Match the Instrument to the Use Case",
        type: "candlestick",
        cutIndex: 7,
        labels: ltLabels(14),
        ohlc: ltCandles(90, [
          { to: 107, bars: 8 },
          { to: 120, bars: 6 }
        ], { seed: 132, wick: 0.35 }),
        markPoints: [
          { dataIndex:  0, label: "Trade Open — No Expiry",  position: "bottom" },
          { dataIndex:  7, label: "Session N+30 — Still Open",position: "top"    }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "No Roll Needed",            position: "top",    color: "#00d4d4" },
        { dataIndex: 10, label: "Leverage Amplifies Move",   position: "top",    color: "#ffcc00" },
        { dataIndex: 13, label: "Perpetual Swap = Answer",   position: "top",    color: "#00d4d4" }
      ],
      explanation: "The <strong>Perpetual Swap</strong> is the answer. Unlike standard futures, it has no expiry date — positions can be held indefinitely without rolling. It tracks the spot price through a funding rate mechanism, is available with leverage on every major crypto exchange, and is the most liquid crypto derivative instrument. Spot markets require you to own the actual asset and provide no leverage. Futures require rolling at expiry.",
      rule: "Perpetual Swap = no expiry + leverage + tracks spot. The most liquid instrument on crypto exchanges. Essential knowledge before Course 3."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 17 — Course 2 Recap
     Outro
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 16,
    title: "Course 2 Recap",
    tag: "Outro",
    module: "Course Summary",

    intro: {
      heading: "Your Toolbox Is Built — Now Use It Systematically",
      body: "Course 2 covered five modules and transformed you from a market reader to a trader with a defined methodology. You now have a trading style, a systematic entry framework (LTE), three exit strategies, a library of price action formations, volume analysis, seven classical chart patterns, Fibonacci retracements, the Ichimoku system, oscillator confluence, divergences, and an understanding of the financial instruments you will be trading.",
      bullets: [
        "Module 1: Trading Styles — identify your style; system flows from style; discipline is the edge",
        "Module 2: LTE Methodology — Level → Trigger → Entry; never move your invalidation; Set & Forget / Trailing / Partial TPs",
        "Module 3: Price Action — engulfing, stars, inside bars, soldiers, crows; volume confirmation; 9 classical patterns",
        "Module 4: Tools — Fibonacci 50%/61.8% confluence; Ichimoku Kumo breakout + Kijun trailing stop; oscillators + divergences",
        "Module 5: Financial Instruments — spot vs derivatives; futures vs perpetual swaps; leverage is Course 3",
        "The toolbox is complete — the next step is building a journal, finding your hit rate, and developing your edge through data"
      ]
    },

    lesson: {
      heading: "14 Actionable Rules — Your Course 2 Checklist",
      body: "Every rule in this list was earned through the content of Course 2. Print this list. Put it on your desk. Before every trade, run through the applicable rules. A systematic trader who follows these rules consistently will outperform an intuitive trader over the long run — every single time.",
      bullets: [
        "1. ✅ Identify your trading style first — your entire system flows from this decision",
        "2. ✅ Use LTE for EVERY trade: Level → Trigger → Entry — no exceptions, no shortcuts",
        "3. ✅ Never move your invalidation/stop loss to avoid a loss — ever",
        "4. ✅ Always wait for candle CLOSE before acting on any formation",
        "5. ✅ Always confirm breakouts with a volume spike — no volume = no confidence",
        "6. ✅ Trade chart pattern completions + retests — never anticipate patterns mid-formation",
        "7. ✅ Fibonacci 50% and 61.8% must align with an existing S/R zone to be a valid level",
        "8. ✅ Only use Ichimoku in trending markets — never in range-bound conditions",
        "9. ✅ All 4 Ichimoku prerequisites must be met before taking a Kumo Breakout trade",
        "10. ✅ Use Kijun as the trailing stop in all Ichimoku trend trades",
        "11. ✅ Divergences are confluence only — combine with S/R + volume + candlestick structure",
        "12. ✅ Journal EVERY trade with entry, stop, target, risk%, actual R, and chart screenshot",
        "13. ✅ Let your journal data dictate which exit strategy to use — not emotion in the moment",
        "14. ✅ Understand derivatives before trading them: spot ≠ perpetual swap ≠ futures"
      ]
    },

    roadmap: {
      title: "Your Course 2 Toolbox",
      sub: "Everything you can now read on a chart",
      icon: "wrench",
      stops: [
        { label: "Trading styles & trade types", desc: "Matching timeframe and approach to your edge" },
        { label: "Entries & exits — the LTE method", desc: "Structured entry, stop, and target placement" },
        { label: "Price action & volume", desc: "Reading formations and confirming them with volume" },
        { label: "Classical chart patterns", desc: "Triangles, flags, head-and-shoulders, and more" },
        { label: "Indicators & confluence", desc: "Fibonacci, Ichimoku, oscillators, divergences" }
      ]
    },

    lessonChart: {
      title: "Journal-Driven Improvement — R Multiples Growing Over Time",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(82, [
        { to: 87,  bars: 3 },
        { to: 85,  bars: 2 },
        { to: 95,  bars: 3 },
        { to: 93,  bars: 2 },
        { to: 108, bars: 3 },
        { to: 136, bars: 5 }
      ], { seed: 133, wick: 0.4 }),
      markPoints: [
        { dataIndex:  0, label: "Trade 1 — R:1.2",  position: "bottom" },
        { dataIndex:  2, label: "TP Hit ✔ Journal",  position: "top"    },
        { dataIndex:  4, label: "Trade 2 — R:2.1",  position: "bottom" },
        { dataIndex:  7, label: "TP Hit ✔ Journal",  position: "top"    },
        { dataIndex:  9, label: "Trade 3 — R:3.4",  position: "bottom" },
        { dataIndex: 12, label: "TP Hit ✔ Journal",  position: "top"    }
      ]
    },

    quiz: {
      question: "On a 4H chart a trader identifies a 61.8% Fibonacci retracement that aligns with an old resistance level that has since flipped to support. At that confluence zone a Three Inside Up formation appears with a volume spike. The trader enters long with stop below the swing low. Which Course 2 concepts are being applied simultaneously?",
      hint: "Walk through the trade step by step: how was the Level identified? What was the Trigger? What confirmed the Entry? Which module taught each concept?",
      style: "choice",
      answers: [
        { id: "a", text: "LTE (Level=61.8%+Sr flip; Trigger=Three Inside Up+vol; Entry=long) + Fibonacci confluence + Candlestick formations + Volume confirmation", correct: true,  type: "bullish" },
        { id: "b", text: "Ichimoku Kumo Breakout with all 4 prerequisites confirmed + RSI divergence as the entry trigger",                                               correct: false, type: "neutral" },
        { id: "c", text: "Scalping at a DBS zone using a Trailing Stop exit with Three Black Crows as the trigger",                                                     correct: false, type: "bearish" }
      ],
      chart: {
        title: "Name All the Course 2 Concepts in This Trade",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(14),
        ohlc: ltCandles(105, [
          { to: 82, bars: 7 },
          { to: 80, bars: 1 },
          { to: 83, bars: 1 },
          { to: 89, bars: 1 },
          { to: 95, bars: 1 },
          { to: 107, bars: 3 }
        ], { seed: 134, wick: 0.4 }),
        markLines: [ { yAxis: 78.5, label: "Stop — below swing low", color: "#ff2e88" },
          { yAxis: 81, label: "61.8% Fib + Sr Flip", color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 79, y1: 85, label: "Confluence Zone", color: "rgba(0,212,212,0.06)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "L — Level",            position: "bottom", color: "#00d4d4" },
        { dataIndex:  8, label: "T — Trigger (3IU)",    position: "bottom", color: "#00d4d4" },
        { dataIndex:  9, label: "E — Entry + Vol ✓",    position: "top",    color: "#00d4d4" },
        { dataIndex: 10, label: "LTE + Fib + Vol ✔",    position: "top",    color: "#00d4d4" }
      ],
      explanation: "This trade combines four distinct Course 2 concepts in one setup: <strong>LTE Methodology</strong> (Level = 61.8% Fib aligned with Sr flip; Trigger = Three Inside Up at the zone; Entry = long after volume spike confirms), <strong>Fibonacci confluence</strong> (Module 4), <strong>candlestick formations</strong> (Three Inside Up, Module 3), and <strong>volume confirmation</strong> (Module 3). This is what 'building your toolbox' means — all tools working together on a single, high-probability setup.",
      rule: "The edge is in the convergence: LTE + Fibonacci + formation + volume + S/R. Journal every trade. Let the data build your system."
    }
  }

];

const COURSE2_META = {
  id: "course2",
  title: "Course 2: Building Your Toolbox",
  chapterCount: 17
};

/* Final-exam question POOL — authored separately from chapter quizzes.
   Engine samples EXAM_LENGTH at random per attempt and shuffles options. */
const LT_EXAM_QUESTIONS_2 = [
  { chapterTitle: 'Trading Styles', question: 'Swing trading is best characterised by:',
    answers: [
      { id:'a', text:'Holding for days to weeks around daily/weekly swing points', correct:true },
      { id:'b', text:'Opening and closing within minutes, many times a day', correct:false },
      { id:'c', text:'Holding for months to years based on fundamentals only', correct:false },
      { id:'d', text:'Never using a stop loss', correct:false } ] },
  { chapterTitle: 'Choosing a Style', question: 'The "best" trading style for you is mainly decided by:',
    answers: [
      { id:'a', text:'Your personality, schedule and risk tolerance', correct:true },
      { id:'b', text:'Whichever style is most profitable for everyone', correct:false },
      { id:'c', text:'The style with the highest leverage', correct:false },
      { id:'d', text:'Whatever is trending on social media', correct:false } ] },
  { chapterTitle: 'Volume — Confirmation', question: 'A breakout above resistance accompanied by a sharp rise in volume suggests:',
    answers: [
      { id:'a', text:'Genuine participation — the breakout is more likely to hold', correct:true },
      { id:'b', text:'A fake-out that should be faded immediately', correct:false },
      { id:'c', text:'Nothing — volume is a lagging coincidence', correct:false },
      { id:'d', text:'The market is about to be halted', correct:false } ] },
  { chapterTitle: 'Volume — Exhaustion', question: 'Price makes a new high but on clearly declining volume. This most often warns of:',
    answers: [
      { id:'a', text:'Waning momentum — a possible exhaustion / reversal', correct:true },
      { id:'b', text:'A guaranteed acceleration higher', correct:false },
      { id:'c', text:'Increased conviction from buyers', correct:false },
      { id:'d', text:'A data error to be ignored', correct:false } ] },
  { chapterTitle: 'Chart Patterns', question: 'What does a classical chart pattern actually give a trader?',
    answers: [
      { id:'a', text:'A predefined entry, stop, target and invalidation — a risk structure', correct:true },
      { id:'b', text:'A guarantee that the target will be hit', correct:false },
      { id:'c', text:'A signal that works without any stop loss', correct:false },
      { id:'d', text:'A reason to ignore market structure', correct:false } ] },
  { chapterTitle: 'Ichimoku', question: 'A key rule when using Ichimoku is that it:',
    answers: [
      { id:'a', text:'Works best in trending markets — check the higher-timeframe trend first', correct:true },
      { id:'b', text:'Works best in tight ranges and chop', correct:false },
      { id:'c', text:'Replaces the need to read price action', correct:false },
      { id:'d', text:'Only uses the candle bodies, never the cloud', correct:false } ] },
  { chapterTitle: 'Fibonacci', question: 'The Fibonacci "golden pocket" that traders watch for retracement entries sits roughly between:',
    answers: [
      { id:'a', text:'The 0.618 and 0.786 retracement levels', correct:true },
      { id:'b', text:'The 0.236 and 0.382 levels', correct:false },
      { id:'c', text:'The 1.0 and 1.618 extension levels', correct:false },
      { id:'d', text:'The 0.5 level only', correct:false } ] },
  { chapterTitle: 'The Trade Setup Process', question: 'The consistent process for building a trade setup across any style is:',
    answers: [
      { id:'a', text:'Identify structure → find your level → define your risk', correct:true },
      { id:'b', text:'Pick a coin → use max leverage → hope', correct:false },
      { id:'c', text:'Enter first → decide the stop later', correct:false },
      { id:'d', text:'Copy the loudest trader you can find', correct:false } ] },
  { chapterTitle: 'LTE Methodology', question: 'The purpose of a repeatable methodology (like LTE) is to:',
    answers: [
      { id:'a', text:'Turn a general market read into a precise, consistent, executable plan', correct:true },
      { id:'b', text:'Guarantee winning trades', correct:false },
      { id:'c', text:'Remove the need for risk management', correct:false },
      { id:'d', text:'Let you trade purely on emotion', correct:false } ] },
  { chapterTitle: 'Patterns Across Markets', question: 'Why do classical chart patterns repeat across different assets and timeframes?',
    answers: [
      { id:'a', text:'They reflect recurring human psychology — fear, greed and indecision', correct:true },
      { id:'b', text:'Exchanges program them deliberately', correct:false },
      { id:'c', text:'They only appear on crypto charts', correct:false },
      { id:'d', text:'They are guaranteed by regulation', correct:false } ] },
  { chapterTitle: 'Timeframe & Patience', question: 'A daily-timeframe chart pattern typically:',
    answers: [
      { id:'a', text:'Takes weeks to months to play out — patience is required', correct:true },
      { id:'b', text:'Resolves within a few minutes', correct:false },
      { id:'c', text:'Is less reliable than a 1-minute pattern', correct:false },
      { id:'d', text:'Should be traded with the tightest possible stop', correct:false } ] },
  { chapterTitle: 'Confluence', question: 'When a higher-timeframe level lines up with a lower-timeframe signal, that trade is:',
    answers: [
      { id:'a', text:'Higher-confluence — generally worth prioritising', correct:true },
      { id:'b', text:'Lower quality and best avoided', correct:false },
      { id:'c', text:'Identical to any other trade', correct:false },
      { id:'d', text:'Only valid without a stop loss', correct:false } ] },

  /* ── Chart-reading questions (engine guarantees a quota of these per attempt) ── */
  { chapterTitle: 'Classical Chart Patterns',
    question: 'A sharp rally (the pole) is followed by a shallow, orderly drift lower on smaller candles. This pattern is a:',
    chart: { type:'candlestick', labels: ltLabels(10),
      ohlc: ltCandles(80, [{ to:110, bars:5 }, { to:103, bars:5 }], { seed: 321, wick: 0.35 }),
      markPoints: [
        { dataIndex: 0, label: 'Pole Start', position: 'bottom' },
        { dataIndex: 4, label: 'Pole Top', position: 'top' },
        { dataIndex: 7, label: 'Flag', position: 'top' }
      ] },
    answers: [
      { id:'a', text:'Bull flag — continuation; expect another leg up', correct:true },
      { id:'b', text:'Double top — a bearish reversal', correct:false },
      { id:'c', text:'Head and shoulders — a bearish reversal', correct:false },
      { id:'d', text:'Descending triangle — a breakdown', correct:false } ] },

  { chapterTitle: 'Classical Pattern Examples',
    question: 'Price made two distinct lows at the same level (highlighted) separated by a peak, with the neckline marked. This is a:',
    chart: { type:'candlestick', labels: ltLabels(12),
      ohlc: ltCandles(100, [{ to:84, bars:3 }, { to:95, bars:3 }, { to:84, bars:3 }, { to:99, bars:3 }], { seed: 322, wick: 0.4 }),
      markLines: [{ yAxis: 95, label: 'Neckline', color: '#00d4d4' }],
      markAreas: [{ y0: 82, y1: 86, label: 'Support', color: 'rgba(0,212,212,0.06)' }],
      markPoints: [
        { dataIndex: 2, label: 'Low 1', position: 'bottom' },
        { dataIndex: 8, label: 'Low 2', position: 'bottom' },
        { dataIndex: 11, label: 'Neckline Break ✓', position: 'top', color: '#00d4d4' }
      ] },
    answers: [
      { id:'a', text:'Double bottom — bullish reversal on a neckline break', correct:true },
      { id:'b', text:'Double top — a bearish reversal', correct:false },
      { id:'c', text:'Bull flag — a continuation', correct:false },
      { id:'d', text:'A range with no actionable signal', correct:false } ] },

  { chapterTitle: 'Classical Pattern Examples',
    question: 'Three peaks — a higher middle peak between two lower, roughly equal peaks — sit over a flat neckline (marked). This is a:',
    chart: { type:'candlestick', labels: ltLabels(14),
      ohlc: ltCandles(90, [{ to:100, bars:2 }, { to:94, bars:2 }, { to:110, bars:2 }, { to:94, bars:2 }, { to:100, bars:2 }, { to:88, bars:4 }], { seed: 323, wick: 0.4 }),
      markLines: [{ yAxis: 94, label: 'Neckline', color: '#ff2e88' }],
      markPoints: [
        { dataIndex: 1, label: 'Left Shoulder', position: 'top' },
        { dataIndex: 5, label: 'Head', position: 'top' },
        { dataIndex: 9, label: 'Right Shoulder', position: 'top' },
        { dataIndex: 13, label: 'Neckline Break ↓', position: 'bottom', color: '#ff2e88' }
      ] },
    answers: [
      { id:'a', text:'Head and shoulders — bearish reversal on a neckline break', correct:true },
      { id:'b', text:'Ascending triangle — a bullish breakout', correct:false },
      { id:'c', text:'Double bottom — a bullish reversal', correct:false },
      { id:'d', text:'Bull flag — a continuation', correct:false } ] },

  { chapterTitle: 'Classical Chart Patterns',
    question: 'Price keeps stalling at the same horizontal resistance (marked) while the lows step progressively higher. This is an:',
    chart: { type:'candlestick', labels: ltLabels(10),
      ohlc: ltCandles(88, [{ to:100, bars:2 }, { to:92, bars:2 }, { to:100, bars:2 }, { to:95, bars:2 }, { to:100, bars:2 }], { seed: 324, wick: 0.35 }),
      markLines: [{ yAxis: 100, label: 'Flat Top Resistance', color: '#ff2e88' }],
      markPoints: [
        { dataIndex: 3, label: 'Higher Low 1', position: 'bottom' },
        { dataIndex: 7, label: 'Higher Low 2', position: 'bottom' },
        { dataIndex: 9, label: 'Flat Top Touch', position: 'top' }
      ] },
    answers: [
      { id:'a', text:'Ascending triangle — pressure building for a bullish breakout', correct:true },
      { id:'b', text:'Descending triangle — a bearish breakdown', correct:false },
      { id:'c', text:'Double top — a bearish reversal', correct:false },
      { id:'d', text:'Bear flag — a continuation lower', correct:false } ] },

  { chapterTitle: 'Fibonacci',
    question: 'After the rally, price has pulled back into the highlighted 0.618–0.786 zone. For a trend-continuation long, this zone is:',
    chart: { type:'candlestick', labels: ltLabels(12),
      ohlc: ltCandles(80, [{ to:120, bars:6 }, { to:92, bars:4 }, { to:94, bars:2 }], { seed: 325, wick: 0.4 }),
      markAreas: [{ y0: 88, y1: 95, label: 'Golden Pocket (0.618–0.786)', color: 'rgba(0,212,212,0.07)' }],
      markPoints: [
        { dataIndex: 0, label: 'Swing Low', position: 'bottom' },
        { dataIndex: 5, label: 'Swing High', position: 'top' },
        { dataIndex: 9, label: 'Pocket Tag', position: 'bottom' }
      ] },
    answers: [
      { id:'a', text:'The higher-probability area to look for long entries', correct:true },
      { id:'b', text:'The place to go short, against the trend', correct:false },
      { id:'c', text:'Irrelevant — Fibonacci does not apply in a trend', correct:false },
      { id:'d', text:'A guaranteed bounce with no stop needed', correct:false } ] },

  { chapterTitle: 'Classical Pattern Examples',
    question: 'Price made two distinct highs at the same level (highlighted) with a dip between, over a neckline (marked). This is a:',
    chart: { type:'candlestick', labels: ltLabels(13),
      ohlc: ltCandles(86, [{ to:104, bars:3 }, { to:94, bars:3 }, { to:104, bars:3 }, { to:90, bars:4 }], { seed: 326, wick: 0.4 }),
      markLines: [{ yAxis: 94, label: 'Neckline', color: '#ff2e88' }],
      markAreas: [{ y0: 102, y1: 106, label: 'Resistance', color: 'rgba(255,46,136,0.06)' }],
      markPoints: [
        { dataIndex: 2, label: 'Top 1', position: 'top' },
        { dataIndex: 8, label: 'Top 2', position: 'top' },
        { dataIndex: 12, label: 'Neckline Break ↓', position: 'bottom', color: '#ff2e88' }
      ] },
    answers: [
      { id:'a', text:'Double top — bearish reversal on a neckline break', correct:true },
      { id:'b', text:'Double bottom — a bullish reversal', correct:false },
      { id:'c', text:'Ascending triangle — a bullish breakout', correct:false },
      { id:'d', text:'Bull flag — a continuation', correct:false } ] },

  { chapterTitle: 'Price Action Formations',
    question: 'A sharp sell-off (the pole) is followed by a shallow, orderly drift higher on smaller candles. This is a:',
    chart: { type:'candlestick', labels: ltLabels(11),
      ohlc: ltCandles(112, [{ to:84, bars:5 }, { to:91, bars:4 }, { to:80, bars:2 }], { seed: 327, wick: 0.35 }),
      markPoints: [
        { dataIndex: 0, label: 'Pole Top', position: 'top' },
        { dataIndex: 4, label: 'Pole Bottom', position: 'bottom' },
        { dataIndex: 7, label: 'Flag', position: 'top' },
        { dataIndex: 10, label: 'Breakdown ↓', position: 'bottom', color: '#ff2e88' }
      ] },
    answers: [
      { id:'a', text:'Bear flag — continuation; expect another leg down', correct:true },
      { id:'b', text:'Double bottom — a reversal higher', correct:false },
      { id:'c', text:'Ascending triangle — a bullish breakout', correct:false },
      { id:'d', text:'Bull flag — a continuation higher', correct:false } ] },

  { chapterTitle: 'Price Action Formations',
    question: 'After an uptrend, price coils into a symmetrical triangle (converging highs and lows). The highest-probability break is:',
    chart: { type:'candlestick', labels: ltLabels(12),
      ohlc: ltCandles(82, [{ to:104, bars:4 }, { to:96, bars:2 }, { to:102, bars:2 }, { to:98, bars:2 }, { to:100, bars:2 }], { seed: 328, wick: 0.3 }),
      markPoints: [
        { dataIndex: 3, label: 'Lower High 1', position: 'top' },
        { dataIndex: 7, label: 'Lower High 2', position: 'top' },
        { dataIndex: 5, label: 'Higher Low 1', position: 'bottom' },
        { dataIndex: 9, label: 'Higher Low 2', position: 'bottom' }
      ] },
    answers: [
      { id:'a', text:'In the direction of the prior trend — a break higher', correct:true },
      { id:'b', text:'Always to the downside', correct:false },
      { id:'c', text:'Random — triangles provide no edge', correct:false },
      { id:'d', text:'Sideways indefinitely', correct:false } ] },

  /* ── Additional concept questions (broaden the pool beyond the original 12) ── */
  { chapterTitle: 'Divergences',
    question: 'Bearish (regular) divergence on an oscillator like RSI is when:',
    answers: [
      { id:'a', text:'Price makes a higher high but the oscillator makes a lower high — momentum is fading', correct:true },
      { id:'b', text:'Price and the oscillator both make higher highs', correct:false },
      { id:'c', text:'Price makes a lower low and the oscillator a lower low', correct:false },
      { id:'d', text:'The oscillator simply crosses its midline', correct:false } ] },

  { chapterTitle: 'Oscillators',
    question: 'An oscillator reading "overbought" (e.g. RSI above 70), on its own, means:',
    answers: [
      { id:'a', text:'Momentum is stretched — not an automatic sell; it can stay overbought in a strong trend', correct:true },
      { id:'b', text:'Sell immediately, every time', correct:false },
      { id:'c', text:'The top is in, guaranteed', correct:false },
      { id:'d', text:'Add to longs with no risk', correct:false } ] },

  { chapterTitle: 'Price Action Formations',
    question: 'A trendline is generally considered valid once it has:',
    answers: [
      { id:'a', text:'At least two touches to draw it, with a third touch confirming it', correct:true },
      { id:'b', text:'A single touch', correct:false },
      { id:'c', text:'At least ten touches', correct:false },
      { id:'d', text:'No touches — they are drawn arbitrarily', correct:false } ] },

  { chapterTitle: 'Chart Patterns',
    question: 'A chart pattern setup is "invalidated" when:',
    answers: [
      { id:'a', text:'Price closes beyond the level that disproves the idea (through its stop)', correct:true },
      { id:'b', text:'It takes longer than you expected', correct:false },
      { id:'c', text:'You simply change your mind', correct:false },
      { id:'d', text:'Volume drops for one candle', correct:false } ] }
];
