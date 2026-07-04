/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Course 4
   lt-data-course4.js  |  Chapters 0–29 content, chart data, quiz questions
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

   Indicator-teaching chapters include indicator + chartHeight on introChart/lessonChart:
     Heuristics       → indicator:"rsi_zones",  chartHeight:480
     FSVZO            → indicator:"volume",      chartHeight:480
     Ichimoku (4 ch.) → indicator:"ichimoku",    chartHeight:520
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const LT_CHAPTERS_4 = [

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 0 — Course 4 Introduction
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 0,
    title: "Course 4 — Liquidity Theory Introduction",
    tag: "Introduction",
    module: "Course Overview",

    intro: {
      heading: "Welcome to Course 4: Liquidity Theory",
      body: "Courses 1–3 built your technical analysis foundation. Course 4 completes the framework by revealing WHY price moves — not just where it might go. Through Liquidity Theory and Sentiment Analysis you will learn to ride on the backs of larger players rather than being their prey. Two perspectives combine into one: TA tells you where; SA tells you why and who gets squeezed.",
      bullets: [
        "Module 1 — Identifying Liquidity: Liquidity Theory foundations, liquidity pools, SFPs, bullish and bearish structures",
        "Module 2 — Determining Control: Sentiment analysis — funding rate, open interest, cumulative delta, futures basis",
        "Module 3 — Indicator Suite: Trend Buddy, PAL, Heuristics, FSVZO, Crayons, Genie",
        "Module 4 — Applying Sentiment: Hyblock Capital — liquidation levels, positions heatmap, trading activity",
        "Module 5 — Ichimoku Masterclass: Kijun bounces, C-clamps, Kumo pockets, Edge to Edge",
        "The 1-2 punch: Technical Analysis (where price might go) plus Sentiment Analysis (why it will go there and who gets squeezed) = maximum conviction"
      ]
    },

    lesson: {
      heading: "Why Liquidity Theory Changes How You Read Every Chart",
      body: "Every technical pattern you have learned reflects underlying liquidity mechanics. Breakouts, reversals, false moves — all are engineered by larger participants sourcing the liquidity they need to fill massive positions. Understanding this transforms a chart from a random series of candles into a predictable game played by participants with competing incentives.",
      bullets: [
        "Technical analysis shows WHERE price might react; Sentiment Analysis shows WHY it is likely to react strongly on this specific visit",
        "Larger players engineer liquidity because their position sizes require the forced closure of other traders to get filled",
        "Every stop cluster, breakout order zone, and liquidation level is a potential target for large participants",
        "Combining TA and SA creates higher conviction setups — more variables pointing the same direction = higher probability",
        "This is the final course of the Tools of the Trade curriculum — it completes the framework begun in Course 1",
        "Goal: identify where the most orders are concentrated, understand the incentive to move price there, position alongside the larger player"
      ]
    },

    roadmap: {
      title: "Five Modules to the Complete Framework",
      sub: "The 1-2 punch — where price goes, and why",
      icon: "route",
      stops: [
        { label: "Identifying liquidity", desc: "Pools, SFPs, bullish & bearish structures" },
        { label: "Determining control", desc: "Funding, open interest, cumulative delta, basis" },
        { label: "The indicator suite", desc: "Trend Buddy, PAL, FSVZO — used as confluence" },
        { label: "Applying sentiment — Hyblock", desc: "Liquidation levels, heatmaps, positioning data" },
        { label: "Ichimoku masterclass", desc: "Kijun bounces, C-clamps, Kumo pockets, Edge-to-Edge" }
      ]
    },

    lessonChart: {
      title: "TA + SA Combined — Higher Conviction at Every Level",
      markLines: [ { yAxis: 84, label: "TA Level — where price reacts", color: "#00d4d4" } ],
      type: "candlestick",
      labels: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12","W13","W14","W15","W16"],
      ohlc: ltCandles(88, [
        { to: 84,  bars: 4 },
        { to: 107, bars: 8 },
        { to: 120, bars: 4 }
      ], { seed: 196, wick: 0.35 }),
      markPoints: [
        { dataIndex:  3, label: "TA: Level Identified",      position: "bottom" },
        { dataIndex:  5, label: "SA: Confirms Squeeze Setup", position: "bottom" },
        { dataIndex:  7, label: "Entry — Max Conviction",    position: "bottom" },
        { dataIndex: 15, label: "1-2 Punch Plays Out",       position: "top"    }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "What are the five modules of Course 4: Liquidity Theory?",
      hint: "Think about the journey from understanding WHY price moves, to who is in control, to proprietary indicators, to the Hyblock platform, to Ichimoku mastery.",
      style: "choice",
      answers: [
        { id: "a", text: "Identifying Liquidity, Determining Control, Indicator Suite, Applying Sentiment via Hyblock Capital, Ichimoku Masterclass",  correct: true,  type: "bullish" },
        { id: "b", text: "Market Structure, Wyckoff Theory, Elliott Wave, Fibonacci Confluence, Ichimoku Cloud Basics",                               correct: false, type: "bearish" },
        { id: "c", text: "Order Types, Leverage, DBS and SSR Zones, Trading Ranges, Trader Mindset and Routines",                                    correct: false, type: "neutral" }
      ],
      chart: {
        title: "Course 4 — Five Module Progression",
        type: "candlestick",
        cutIndex: 10,
        labels: ltLabels(15),
        ohlc: ltCandles(80, [{ to: 113, bars: 15 }], { seed: 197, wick: 0.35 })
      },
      revealMarkPoints: [
        { dataIndex:  2, label: "M1: Liquidity",   position: "bottom", color: "#00d4d4" },
        { dataIndex:  5, label: "M2: Sentiment",   position: "bottom", color: "#00d4d4" },
        { dataIndex:  8, label: "M3: Indicators",  position: "top",    color: "#00d4d4" },
        { dataIndex: 11, label: "M4: Hyblock",     position: "top",    color: "#00d4d4" },
        { dataIndex: 14, label: "M5: Ichimoku",    position: "top",    color: "#00d4d4" }
      ],
      explanation: "Course 4's five modules are: <strong>Module 1 — Identifying Liquidity</strong> (Liquidity Theory foundations, pools, SFPs, Under Over and Over Under structures); <strong>Module 2 — Determining Control</strong> (funding rate, open interest, cumulative delta, futures basis); <strong>Module 3 — Indicator Suite</strong> (Trend Buddy, PAL, Heuristics, FSVZO, Crayons, Genie); <strong>Module 4 — Applying Sentiment</strong> (Hyblock Capital: liquidation levels, positions heatmap, trading activity); <strong>Module 5 — Ichimoku Masterclass</strong> (Kijun bounces, C-clamps, Kumo pockets, Edge to Edge).",
      rule: "Course 4 = Liquidity Theory + Sentiment Analysis. Five modules complete the Tools of the Trade curriculum. TA tells you where; SA tells you why. Together = maximum conviction setups."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 1 — The Four Principles of Liquidity Theory
     Module 1 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 1,
    title: "The Four Principles of Liquidity Theory",
    tag: "Module 1 · Session 2",
    module: "Identifying Liquidity",
    videoUrl: "https://www.youtube.com/embed/VurfjWXZ43w",

    intro: {
      heading: "Four Principles That Explain Why Price Moves Where It Does",
      body: "Liquidity Theory is a school of thought — not a rigid system. It rests on four foundational principles that together explain the mechanics behind every significant price move in financial markets. Understanding these transforms a chart from a random series of candles into a predictable game played by participants with competing rational incentives.",
      bullets: [
        "Principle 1 — Trading Is a Zero-Sum Game: for every buyer there must be a seller; for every winner there is a loser; markets redistribute wealth from many to few",
        "Principle 2 — Market Participants Are Inherently Predatory: larger players use strategies to pressure the opposing side into closing positions at a loss",
        "Principle 3 — Buyers and Sellers Participate in Game Theory: rational players trying to maximize outcomes; knowing the rules makes outcomes more predictable",
        "Principle 4 — Price Gravitates Toward the Area with the Most Liquidity: large players need deep pools to fill massive positions with minimal slippage",
        "Slippage = difference between expected and actual execution price; large players minimize it by engineering moves to liquidity pools",
        "Game theory questions: What is the obvious level? How might a larger player exploit it? What is maximum pain? How does wealth redistribute from many to few?"
      ]
    },

    lesson: {
      heading: "Game Theory Applied — Identifying the Maximum Pain Scenario",
      body: "The four principles combine into one actionable framework: identify where the majority of traders have placed their stops or breakout orders, determine what a larger player would do to source liquidity from those positions, and position yourself on the winning side of that transaction. This is the core of Liquidity Theory in practice.",
      bullets: [
        "Zero-sum insight: when you win, another participant loses; identifying who is on the wrong side is your edge",
        "Predatory insight: larger players actively move price to trigger stop losses and fill their own positions — this creates the fake-outs and false breaks you see on every chart",
        "Game theory applied: ask yourself 'Is my stop loss someone else's liquidity?' before every trade placement",
        "Liquidity gravity: consolidation zones, equal highs and lows, stop clusters, and breakout order zones are ALL price targets",
        "Maximum pain scenario: the move that causes the most traders the most pain and forces the most position closures is usually the move that actually happens",
        "The winning question: not 'where will price go?' but 'where are orders most concentrated and who is incentivized to move price there?'"
      ]
    },

    introChart: {
      title: "Price Gravitates to Highest Liquidity — Principle 4 in Action",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(104, [
        { to: 91,  bars: 11 },
        { to: 108, bars: 5 }
      ], { seed: 198, wick: 0.4 }),
      // Liquidity pool / stop cluster drawn as a dashed gold liq ladder (the magnet)
      liqCluster: { lines: [89, 91, 93], label: "Liquidity Pool — Stop Cluster", color: "#ffcc00" },
      markPoints: [
        { dataIndex:  0, label: "Price at 104",              position: "top"    },
        { dataIndex:  8, label: "Drawn to Liquidity Pool",   position: "bottom" },
        { dataIndex: 10, label: "Pool Tapped — Reversal",    position: "bottom" },
        { dataIndex: 15, label: "Direction Resumed",         position: "top"    }
      ]
    },

    lessonChart: {
      title: "Zero-Sum Game — Every Winner Has a Loser on the Other Side",
      markLines: [ { yAxis: 79, label: "Max-Pain Low — Squeeze Pivot", color: "#00d4d4" } ],
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(85, [
        { to: 79,  bars: 10 },
        { to: 104, bars: 6 }
      ], { seed: 199, wick: 0.4 }),
      markPoints: [
        { dataIndex:  0, label: "Shorts Enter — Longs Exit",    position: "top"    },
        { dataIndex:  7, label: "Shorts Winning — Longs Lose",  position: "bottom" },
        { dataIndex:  9, label: "Shorts Off-Sides — Squeeze",   position: "bottom" },
        { dataIndex: 15, label: "Longs Win — Shorts Squeezed",  position: "top"    }
      ]
    },

    quiz: {
      question: "A trader is considering placing a stop loss just below the recent swing low, which is also a level where many other traders likely placed their stops. According to Liquidity Theory Principle 1 and Principle 4, what critical question should the trader ask before confirming that placement?",
      hint: "Who else might benefit from price reaching that exact level? Is your stop someone else's entry?",
      style: "choice",
      answers: [
        { id: "a", text: "Is my stop loss someone else's liquidity? If the stop cluster below the swing low is large enough to attract a larger player, that level will be swept before any real move higher",  correct: true,  type: "bullish" },
        { id: "b", text: "Is the swing low a valid technical level? If it aligns with prior support, the stop below it is well-placed and safe from any engineered moves",                                      correct: false, type: "bearish" },
        { id: "c", text: "How many times has the swing low been tested? More tests means stronger support, which makes the stop below it less likely to be triggered by a fake move",                         correct: false, type: "neutral" }
      ],
      chart: {
        title: "Stop Below Swing Low — Is It Someone Else's Liquidity?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(98, [
          { to: 84, bars: 9 },
          { to: 82, bars: 1, reject: 8 },
          { to: 109, bars: 5 }
        ], { seed: 200, wick: 0.4 }),
        markLines: [
          { yAxis: 84, label: "Swing Low",               color: "#00d4d4" }
        ],
        // Stop cluster / liquidity pool below the swing low → dashed gold liq ladder
        liqCluster: { lines: [78, 80, 82], label: "Stop Cluster / Liquidity Pool", color: "#ffcc00" }
      },
      revealMarkPoints: [
        { dataIndex:  9, label: "Stops Swept — Pool Tapped!",  position: "bottom", color: "#ffcc00" },
        { dataIndex: 10, label: "Reversal — Large Buy",        position: "bottom", color: "#00d4d4" },
        { dataIndex: 14, label: "Direction Resumes UP",        position: "top",    color: "#00d4d4" }
      ],
      explanation: "Liquidity Theory Principles 1 and 4 work together here. <strong>Principle 1 (Zero-Sum Game):</strong> the trader's stop loss, when triggered, becomes a market sell order — exactly the sell-side liquidity a larger buyer needs. <strong>Principle 4 (Price Gravitates to Liquidity):</strong> if enough stops cluster below the swing low, a larger player is incentivized to push price there to source that liquidity. The question every trader must ask before placing a stop is: Is this stop cluster large enough and obvious enough to be a target?",
      rule: "Ask before every trade: Is my stop loss someone else's liquidity? If yes, add buffer beyond the obvious level to survive the engineered sweep. Principle 4 guarantees price will visit high-concentration order areas."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 2 — Identifying Liquidity
     Module 1 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 2,
    title: "Identifying Liquidity",
    tag: "Module 1 · Session 3",
    module: "Identifying Liquidity",
    videoUrl: "https://www.youtube.com/embed/hxkdu-ZfmpA",

    intro: {
      heading: "Liquidity Pools, Engineering, and Swing Failure Patterns",
      body: "Liquidity pools are the specific areas where traders concentrate their stop losses and breakout orders. They sit below key support and above key resistance. Knowing where they are — and how larger players exploit them — lets you anticipate the resulting moves rather than be trapped by them.",
      bullets: [
        "Liquidity Pools: found below support (long stop losses + breakdown shorts) or above resistance (short stop losses + breakout longs)",
        "Engineering Long Liquidity: push below support, trigger long stops and attract eager breakdown shorts, buy the forced closures, push price back up",
        "Engineering Short Liquidity: push above resistance, trigger short stops and attract breakout buyers, fill a large short at elevated price, push price back down",
        "SFP (Swing Failure Pattern): HTF liquidity engineering at prior swing highs or swing lows — creates macro reversals",
        "Depletion factor: liquidity pools are finite — once tapped they are unlikely to hold again; first test = highest probability reaction",
        "Leave adequate buffer on stop losses — engineered fake-outs routinely probe beyond obvious levels before reversing"
      ]
    },

    lesson: {
      heading: "SFPs vs Liquidity Pools — Timeframe and Duration Distinguish Them",
      body: "Both SFPs and Liquidity Pools involve price temporarily exceeding a key level before reversing. The difference is timeframe and duration. LTF liquidity pools happen in a single wick. HTF SFPs develop over days with significant time between the first test and the failure. Both share the same mechanic: larger players engineering liquidity at a level.",
      bullets: [
        "Liquidity Pool (LTF): single wick or candle below range low / above range high; immediate recovery; no extended time outside the level",
        "SFP (HTF): price exceeds a prior swing high or low; reverses; typically multiple days pass between the first test and the failure pattern",
        "Bearish SFP: price exceeds prior swing high, trapping breakout longs; large seller fills position; reversal downward",
        "Bullish SFP: price exceeds prior swing low, trapping breakdown shorts; large buyer fills position; reversal upward",
        "First test of any liquidity area = highest probability reaction; depletion factor is fresh; add buffer to stop to survive the spike",
        "Once a pool is tapped and confirmed — it becomes a strong invalidation level for subsequent trades at that zone"
      ]
    },

    introChart: {
      title: "Engineering Long Liquidity — Sweep Below Support, Trap Shorts, Reverse",
      markLines: [ { yAxis: 83, label: "Support — Range Low", color: "#00d4d4" } ],
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(92, [
        { to: 83, bars: 11 },
        { to: 80, bars: 1, reject: 6 },
        { to: 92, bars: 1 },
        { to: 108, bars: 5 }
      ], { seed: 201, wick: 0.4 }),
      // Long liquidity pool below the range low → dashed teal liq ladder (the swept stops)
      liqCluster: { lines: [80, 82, 84], label: "Long Liquidity Pool — Stops Below", color: "#00d4d4" },
      markPoints: [
        { dataIndex:  0, label: "Range — Longs, Stops at 83", position: "top"    },
        { dataIndex: 11, label: "Sweep Below — Stops Triggered", position: "bottom" },
        { dataIndex: 12, label: "Large Buy + Short Trap",      position: "bottom" },
        { dataIndex: 17, label: "Squeeze Up — Reversal",       position: "top"    }
      ]
    },

    lessonChart: {
      title: "Swing Failure Pattern (SFP) — HTF Liquidity Engineering at Swing High",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(85, [
        { to: 104, bars: 5 },
        { to: 96,  bars: 3 },
        { to: 108, bars: 5, reject: 4 },
        { to: 89,  bars: 5 }
      ], { seed: 202, wick: 0.4 }),
      markLines: [ { yAxis: 108.5, label: "Stop — Above Swept Cluster (buffer)", color: "#ff2e88" },
        { yAxis: 104, label: "Prior Swing High", color: "#ff2e88" }
      ],
      // Short stop cluster above the prior swing high → dashed red liq ladder (SFP fuel)
      liqCluster: { lines: [104.5, 106, 107.5], label: "Short Stop Cluster (SFP)", color: "#ff2e88" },
      markPoints: [
        { dataIndex:  4, label: "Prior Swing High",         position: "top"    },
        { dataIndex: 12, label: "SFP — Exceeds Swing High", position: "top"    },
        { dataIndex: 13, label: "Reversal — Shorts Filled", position: "top"    },
        { dataIndex: 17, label: "HTF Reversal Confirmed",   position: "bottom" }
      ]
    },

    quiz: {
      question: "Price has been in an uptrend and just barely exceeded the prior swing high by a small margin before reversing sharply downward. Several days had passed since the first test of that swing high. Which pattern has formed and what is the correct directional read?",
      hint: "Is this an LTF pool (single wick) or an HTF liquidity engineering pattern that exceeds a prior swing high over multiple days?",
      style: "direction",
      answers: [
        { id: "a", text: "Bearish Swing Failure Pattern — price exceeded the prior swing high triggering short stop losses and trapping breakout longs; a large seller has filled their short position here; the reversal downward is the signal to look for a short entry",  correct: true,  type: "bearish" },
        { id: "b", text: "Bullish continuation breakout — exceeding the prior swing high confirms the uptrend is intact; the pullback is simply a retest of the broken resistance level before the next leg higher", correct: false, type: "bullish" },
        { id: "c", text: "Neutral — not enough information to determine whether this is an SFP or a breakout without checking volume data and the broader HTF structure simultaneously", correct: false, type: "neutral" }
      ],
      chart: {
        title: "Prior Swing High Exceeded Then Reversed — SFP or Breakout?",
        type: "candlestick",
        cutIndex: 12,
        labels: ltLabels(17),
        ohlc: ltCandles(85, [
          { to: 104, bars: 5 },
          { to: 97,  bars: 3 },
          { to: 108, bars: 5, reject: 3 },
          { to: 90,  bars: 4 }
        ], { seed: 203, wick: 0.4 }),
        markLines: [
          { yAxis: 104, label: "Prior Swing High", color: "#ff2e88" }
        ],
        liqCluster: { lines: [104.5, 106, 107.5], label: "Short Stop Cluster", color: "#ff2e88" }
      },
      revealMarkPoints: [
        { dataIndex:  4, label: "Prior Swing High",           position: "top",    color: "#ffcc00" },
        { dataIndex: 12, label: "SFP — Stops Triggered!",     position: "top",    color: "#ff2e88" },
        { dataIndex: 14, label: "Reversal — Large Short",     position: "top",    color: "#ff2e88" },
        { dataIndex: 16, label: "HTF Reversal Confirmed",     position: "bottom", color: "#00d4d4" }
      ],
      explanation: "This is a <strong>Bearish Swing Failure Pattern (SFP)</strong>. The prior swing high had a dense cluster of short stop losses and breakout buy orders just above it. Price exceeded that high by a small margin — sufficient to trigger those stops and trap new breakout longs — then reversed sharply. A large seller used the forced short closures and new eager longs to fill their massive short position. The multiple-day gap between the first swing high and this SFP is the key differentiator from an LTF liquidity pool.",
      rule: "SFP = price exceeds prior swing high or low then reverses. Days between first test and SFP = HTF pattern. Bearish SFP: above swing high → short. Bullish SFP: below swing low → long. First test at HTF level = strongest reaction."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 3 — Liquidity Structures
     Module 1 · Session 4
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 3,
    title: "Liquidity Structures",
    tag: "Module 1 · Session 4",
    module: "Identifying Liquidity",
    videoUrl: "https://www.youtube.com/embed/l5APwZw8f28",

    intro: {
      heading: "Liquidity Structures — Multi-Candle Traps for Retail Traders",
      body: "Liquidity structures are multi-candle patterns that trap retail traders on the wrong side of a move. Where a liquidity pool is a single-wick event, a structure takes time: a fake break, a period of uncertainty, a decisive reversal, and a retest — which is the optimal entry. Two types: the bullish Under Over and the bearish Over Under.",
      bullets: [
        "Liquidity Structure = multi-candle trap; takes time; includes a fake break, reversal, and retest of the reclaimed level",
        "Liquidity Pool = single candle or wick trap; quick and sharp; instant recovery; no retest needed",
        "Bullish Under Over: breaks below range low trapping longs and attracting breakdown shorts, reversal UP, retest of reclaimed range low as support = long entry",
        "Bearish Over Under: breaks above range high trapping shorts and attracting breakout longs, reversal DOWN, retest of reclaimed range high as resistance = short entry",
        "Victims of Under Over: aggressive breakdown short sellers who sold the fake break",
        "Victims of Over Under: aggressive breakout buyers who bought the fake breakout above range high"
      ]
    },

    lesson: {
      heading: "Trading the Under Over and Over Under Structures",
      body: "Both structures follow the same mechanic: a fake break triggers stops and attracts opposite-side traders, then a decisive reversal follows. The retest of the reclaimed level is the optimal entry — the S/R flip is fresh, trapped traders are being squeezed creating momentum, and the stop placement is clean below or above the swing extreme.",
      bullets: [
        "Under Over steps: (1) mark range; (2) identify equal lows as stop cluster; (3) fake break below range low; (4) reversal and close back above range low; (5) retest = long entry",
        "Over Under steps: (1) mark range; (2) identify equal highs as stop cluster; (3) fake break above range high; (4) reversal and close back below range high; (5) retest = short entry",
        "Stop for Under Over long: below the swing low of the fake breakdown with buffer to survive wicks",
        "Stop for Over Under short: above the swing high of the fake breakout with buffer to survive wicks",
        "Confirmation for Under Over: higher high forming after retest = bullish structure intact",
        "Confirmation for Over Under: lower low forming after retest = bearish structure intact",
        "S/R flip is the mechanism: range low becomes support (Under Over); range high becomes resistance (Over Under)"
      ]
    },

    introChart: {
      title: "Bullish Under Over — Fake Breakdown, Reversal, Retest Entry",
      type: "candlestick",
      labels: ltLabels(20),
      ohlc: ltCandles(92, [
        { to: 85, bars: 9 },
        { to: 93, bars: 1 },
        { to: 88, bars: 1 },
        { to: 81, bars: 3 },
        { to: 92, bars: 1 },
        { to: 89, bars: 3 },
        { to: 105, bars: 2 }
      ], { seed: 204, wick: 0.4 }),
      markLines: [ { yAxis: 80, label: "Stop — Below Swing Low", color: "#ff2e88" },
        { yAxis: 85, label: "Range Low → Support (S/R Flip)", color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 83, y1: 88, label: "Under Over Zone", color: "rgba(0,212,212,0.07)" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Range — Stops Below 85",      position: "top"    },
        { dataIndex: 11, label: "Fake Breakdown — Stops Hit",  position: "bottom" },
        { dataIndex: 12, label: "Sharp Reversal UP",           position: "bottom" },
        { dataIndex: 15, label: "Retest — Optimal Long Entry", position: "bottom" },
        { dataIndex: 19, label: "Higher High — Confirmed",     position: "top"    }
      ]
    },

    lessonChart: {
      title: "Bearish Over Under — Fake Breakout, Reversal, Retest Short Entry",
      type: "candlestick",
      labels: ltLabels(20),
      ohlc: ltCandles(88, [
        { to: 100, bars: 8 },
        { to: 107, bars: 3, reject: 4 },
        { to: 96,  bars: 1 },
        { to: 100, bars: 3 },
        { to: 87,  bars: 5 }
      ], { seed: 205, wick: 0.4 }),
      markLines: [ { yAxis: 108, label: "Stop — Above Swing High", color: "#ff2e88" },
        { yAxis: 100, label: "Range High → Resistance (S/R Flip)", color: "#ff2e88" }
      ],
      markAreas: [
        { y0: 98, y1: 103, label: "Over Under Zone", color: "rgba(255,46,136,0.07)" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Range — Stops Above 100",        position: "bottom" },
        { dataIndex: 11, label: "Fake Breakout — Short Stops Hit", position: "top"    },
        { dataIndex: 12, label: "Sharp Reversal DOWN",             position: "top"    },
        { dataIndex: 15, label: "Retest — Optimal Short Entry",    position: "top"    },
        { dataIndex: 19, label: "Lower Low — Confirmed",           position: "bottom" }
      ]
    },

    quiz: {
      question: "Price has been ranging between $85 and $100. It breaks below $85 for several candles, triggering long stop losses and attracting breakdown short sellers. It then reverses sharply and closes back above $85. Price retests $85 from above and holds as support. What is the correct trade and why?",
      hint: "What structure has just completed? What is the optimal entry after a reclaimed Range Low? Who is being squeezed as the trade runs?",
      style: "direction",
      answers: [
        { id: "a", text: "Long on the retest of $85 from above — this is a completed Bullish Under Over; $85 has S/R flipped from support to resistance and back to support; trapped breakdown shorts provide momentum; stop goes below the swing low of the fake breakdown with buffer",  correct: true,  type: "bullish" },
        { id: "b", text: "Short on the retest of $85 — price returning to a previously broken level after a failed breakdown confirms sellers remain in control and $85 has now flipped to resistance on the retest",  correct: false, type: "bearish" },
        { id: "c", text: "No trade — the failed breakdown followed by recovery is conflicting market structure; neither a long nor a short is valid until a new clear range establishes",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Range Low Reclaimed After Fake Breakdown — Under Over Complete",
        type: "candlestick",
        cutIndex: 13,
        labels: ltLabels(18),
        ohlc: ltCandles(92, [
          { to: 85, bars: 8 },
          { to: 80, bars: 2 },
          { to: 80, bars: 1, reject: 8 },
          { to: 93, bars: 1 },
          { to: 89, bars: 3 },
          { to: 104, bars: 3 }
        ], { seed: 206, wick: 0.4 }),
        markLines: [
          { yAxis: 85, label: "Range Low — Reclaimed", color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 83, y1: 88, label: "Under Over Zone", color: "rgba(0,212,212,0.07)" }
        ]
      },
      revealMarkPoints: [ { dataIndex: 10, label: "Stop — Below Swing Low ($80)", position: "bottom", color: "#ff2e88" }, { dataIndex: 15, label: "Target — Range High $100", position: "top", color: "#ffcc00" },
        { dataIndex:  9, label: "Fake Breakdown — Stops Hit",      position: "bottom", color: "#ffcc00" },
        { dataIndex: 10, label: "Reversal — Under Over!",          position: "bottom", color: "#00d4d4" },
        { dataIndex: 13, label: "Retest from Above — Long Entry!", position: "bottom", color: "#00d4d4" },
        { dataIndex: 17, label: "Higher High Confirmed",           position: "top",    color: "#00d4d4" }
      ],
      explanation: "A completed <strong>Bullish Under Over</strong> liquidity structure. The sequence: range low at $85 → fake breakdown (triggers long stops + attracts breakdown shorts) → decisive reversal above $85 → retest from above. Long on the retest is the optimal entry because: the S/R flip is fresh, trapped breakdown shorts are being squeezed upward creating momentum, and the stop below the swing low of the fake breakdown has a clear and logical invalidation. Target: Range High at $100 or next key resistance.",
      rule: "Bullish Under Over = fake breakdown below Range Low + reversal above + retest from above. Long on retest. Stop below swing low with buffer. Bearish Over Under = fake breakout above Range High + reversal below + retest from below. Short on retest."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 4 — Liquidity Scenarios — Live Examples
     Module 1 · Session 5
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 4,
    title: "Liquidity Scenarios — Live Examples",
    tag: "Module 1 · Session 5",
    module: "Identifying Liquidity",
    videoUrl: "https://www.youtube.com/embed/7w2Zq779mO4",

    intro: {
      heading: "Applying Liquidity Concepts in Live Market Conditions",
      body: "Theory becomes skill through live application. This chapter walks through real market examples demonstrating how to identify liquidity structures in real time, mark key levels, recognize the entry trigger, and distinguish a multi-candle structure from a single-wick liquidity pool. Live markets are messier than textbooks — focus on the mechanic, not the aesthetics.",
      bullets: [
        "Process: mark Range High, Range Low, Midpoint first; identify equal lows or equal highs as stop clusters; mark with X",
        "Bullish Under Over anatomy: move down, new low, bounce (lower high), sharp new lower low (stop engineering), strong engulfing through Range Low, retest",
        "Liquidity Pool (live): single sharp wick below Range Low with immediate recovery in 1–2 candles; no extended time below the level",
        "Key distinction: structure = multiple candles + retest required; pool = single candle/wick + no retest",
        "Buffer on stop: wicks and fake-outs routinely probe beyond the Range Low or Range High before reversing; always add buffer",
        "Midpoint as gauge: after a bullish Under Over entry, price crossing and holding above the midpoint increases confidence of Range High being reached"
      ]
    },

    lesson: {
      heading: "Live Under Over, Over Under, and Liquidity Pool Distinctions",
      body: "In live application, patterns are rarely textbook-perfect. Focus on the mechanic: a fake break trapping retail traders on the wrong side, followed by a reversal. The entry is on the retest of the reclaimed level — not on the initial reversal candle. The exception is the liquidity pool, where entry is on the reversal itself since no retest occurs.",
      bullets: [
        "Live Under Over: identify the stop cluster of equal lows at Range Low; wait for the break below, then the close back above; entry is on retest — NOT on the initial snap-back candle",
        "Live Over Under: equal highs at Range High mark the stop cluster; the fake breakout above these is the engineering signal",
        "Liquidity Pool live: the wick is fast and dramatic; recovery is immediate; price returns above Range Low within 1–2 candles — no retest needed",
        "HTF context: does the Under Over sit at an HTF DBS zone? If yes, the LTE setup has the highest conviction possible",
        "Bearish Over Under live confirmation: after the retest of Range High as resistance, a lower high plus lower low forms — bearish structure confirmed",
        "Journal hit rates: track whether the retest holds vs fails; over time this reveals the conditions where Under Overs work best in your preferred markets"
      ]
    },

    introChart: {
      title: "Live Under Over — Equal Lows Mark Stop Cluster, Engineering Sequence",
      markLines: [ { yAxis: 88, label: "Range Low", color: "#00d4d4" }, { yAxis: 93, label: "Range High — Target", color: "#00d4d4" }, { yAxis: 90.5, label: "Midpoint — Conviction Gauge", color: "#8a8f99" } ],
      type: "candlestick",
      labels: ltLabels(20),
      ohlc: ltCandles(95, [
        { to: 88, bars: 9 },
        { to: 93, bars: 1 },
        { to: 88, bars: 1 },
        { to: 81, bars: 3 },
        { to: 92, bars: 1 },
        { to: 89, bars: 3 },
        { to: 105, bars: 2 }
      ], { seed: 207, wick: 0.4 }),
      // Equal-lows stop cluster below the range → dashed teal liq ladder (the engineered magnet)
      liqCluster: { lines: [86, 88], label: "Equal Lows — Stop Cluster", color: "#00d4d4" },
      markPoints: [
        { dataIndex:  8, label: "Equal Low #1 — X",         position: "bottom" },
        { dataIndex: 10, label: "Equal Low #2 — X",         position: "bottom" },
        { dataIndex: 13, label: "Engineering — Drop Below", position: "bottom" },
        { dataIndex: 14, label: "Engulf Through Range Low", position: "bottom" },
        { dataIndex: 17, label: "Retest — Long Entry",      position: "bottom" },
        { dataIndex: 19, label: "Higher High Confirmed",    position: "top"    }
      ]
    },

    lessonChart: {
      title: "Liquidity Pool — Single Wick Below Range Low, Instant Recovery",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(90, [
        { to: 87, bars: 9 },
        { to: 85, bars: 1, reject: 8 },
        { to: 95, bars: 1 },
        { to: 108, bars: 5 }
      ], { seed: 208, wick: 0.35 }),
      markLines: [
        { yAxis: 87, label: "Range Low", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  8, label: "Approaching Range Low",     position: "bottom" },
        { dataIndex:  9, label: "Single Wick — Pool Tapped!", position: "bottom" },
        { dataIndex: 10, label: "Instant Recovery — No Retest Needed", position: "top" },
        { dataIndex: 15, label: "This Was a Pool, Not a Structure", position: "top" }
      ]
    },

    quiz: {
      question: "You are watching a range. Price drops sharply below Range Low on a single candle with a very long lower wick, then immediately recovers and closes back inside the range within one candle. No retest of Range Low from above follows. What pattern is this and how does the entry differ from a full Bullish Under Over structure?",
      hint: "Single wick vs multi-candle. Does a pool require a retest before entry? Does a structure require one?",
      style: "choice",
      answers: [
        { id: "a", text: "This is a Liquidity Pool — identified by a single wick with instant one-candle recovery; no retest is required for entry; the entry is on the reversal candle itself, unlike a full Under Over structure which requires a retest of the reclaimed Range Low",  correct: true,  type: "bullish" },
        { id: "b", text: "This is a Bullish Under Over structure — the wick below Range Low is the fake breakdown phase and the next touch of Range Low from above will serve as the retest and optimal entry",  correct: false, type: "bearish" },
        { id: "c", text: "Neither — a single wick below Range Low is normal price behavior and does not constitute a tradeable liquidity event; only moves that spend multiple candles below the level qualify",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Single Wick Below Range Low — Pool or Under Over Structure?",
        type: "candlestick",
        cutIndex: 10,
        labels: ltLabels(15),
        ohlc: ltCandles(90, [
          { to: 87, bars: 9 },
          { to: 85, bars: 1, reject: 8 },
          { to: 95, bars: 1 },
          { to: 104, bars: 4 }
        ], { seed: 209, wick: 0.35 }),
        markLines: [
          { yAxis: 87, label: "Range Low", color: "#00d4d4" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  8, label: "Approaching Range Low",    position: "bottom", color: "#ffcc00" },
        { dataIndex:  9, label: "POOL! Single Wick",        position: "bottom", color: "#00d4d4" },
        { dataIndex: 10, label: "Entry Here — No Retest",   position: "top",    color: "#00d4d4" },
        { dataIndex: 14, label: "Pool Ran to Range High",   position: "top",    color: "#00d4d4" }
      ],
      explanation: "This is a <strong>Liquidity Pool</strong>. Defining characteristics: (1) a single wick below Range Low, (2) immediate recovery within 1 candle, (3) no extended time below the level, and (4) no retest of Range Low from above. The entry for a pool is on the reversal candle itself — not on a subsequent retest. A full <strong>Liquidity Structure (Under Over)</strong> spends multiple candles below Range Low, then requires a retest of the reclaimed level from above before entry. Same underlying mechanic; completely different execution.",
      rule: "Liquidity Pool = single wick, instant recovery, entry on reversal candle, no retest needed. Liquidity Structure (Under Over) = multiple candles below level, retest from above required before entry. Both are tradeable; execution differs completely."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 5 — Who Is in Control Primer
     Module 2 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 5,
    title: "Who Is in Control Primer",
    tag: "Module 2 · Session 1",
    module: "Determining Control",
    videoUrl: "https://www.youtube.com/embed/Gml6s3MB1lk",

    intro: {
      heading: "Determining Control — TA Meets Sentiment Analysis",
      body: "Technical analysis tells you WHERE price might react. Sentiment Analysis tells you WHO is currently in control — buyers or sellers — and how exhausted or aggressive each side is at any given moment. Combining both perspectives lets you identify inflection points and exhaustion before they fully materialize, producing higher conviction trade setups than either discipline alone could generate.",
      bullets: [
        "Determining control = identifying which party — buyers or sellers — is currently dominant at any given price level",
        "Technical Analysis identifies the LEVELS: DBS zones, SSR zones, ranges, Fibonacci, Ichimoku",
        "Sentiment Analysis identifies the PRESSURE: who is aggressive, who is off-sides, who is about to be squeezed",
        "Four SA variables: funding rate intervals, open interest, cumulative delta, futures basis",
        "Goal: spot exhaustion by either party BEFORE it fully plays out — not after the move has already occurred",
        "Combined approach: TA level plus SA pressure pointing the same direction = highest conviction setup"
      ]
    },

    lesson: {
      heading: "Why Sentiment Analysis Fills the Gaps Technical Analysis Cannot",
      body: "Technical analysis alone leaves a critical gap: it identifies where price MIGHT react, but not why it will react strongly on this particular visit versus any prior visit. Sentiment Analysis fills that gap by showing the real-time state of market participants — how aggressively one side is positioned and how financially vulnerable they are to being squeezed.",
      bullets: [
        "TA signal alone: high probability based on chart structure — solid but incomplete",
        "TA plus SA aligned: TA says reversal likely at this level AND SA says shorts overextended with extreme negative funding = maximum confluence",
        "SA data often leads TA: exhaustion appears in funding and delta data before it shows up on the price chart",
        "Example: price approaching DBS zone with extreme negative funding + rising OI = textbook high-conviction long before the chart even confirms",
        "The 1-2 punch: TA delivers the setup level; SA delivers the conviction and the why behind it",
        "Critical order: always mark TA levels first, then layer in SA confirmation — SA never replaces TA, it amplifies it"
      ]
    },

    introChart: {
      title: "TA Level + SA Confirmation — Inflection Point Determined Early",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 79,  bars: 8 },
        { to: 110, bars: 8 }
      ], { seed: 210, wick: 0.4 }),
      markLines: [ { yAxis: 110, label: "Squeeze Target", color: "#ffcc00" },
        { yAxis: 79, label: "DBS Zone — TA Level", color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 77, y1: 82, label: "DBS + SA Confluence Zone", color: "rgba(0,212,212,0.08)" }
      ],
      // Trading Activity (cumulative delta): red as sellers press the lows, flips teal on the squeeze
      tradingActivity: true,
      activityLabel: "Cum Δ — Who's in Control",
      markPoints: [
        { dataIndex:  1, label: "Cum Δ Red — Shorts Aggressive",  position: "top"    },
        { dataIndex:  7, label: "TA: DBS Zone Approached",        position: "bottom" },
        { dataIndex:  9, label: "TA + SA: Entry — Max Conviction",position: "bottom" },
        { dataIndex: 15, label: "Δ Flips Teal — Squeeze Target",  position: "top"    }
      ]
    },

    lessonChart: {
      title: "SA Leads TA — Exhaustion in Data Before Price Reverses",
      markAreas: [ { y0: 75, y1: 80, label: "DBS + SA Confluence", color: "rgba(0,212,212,0.08)" } ],
      markLines: [ { yAxis: 77, label: "DBS Zone — TA Level", color: "#00d4d4" }, { yAxis: 107, label: "Target — Conviction Played Out", color: "#ffcc00" } ],
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(16),
      ohlc: ltCandles(95, [
        { to: 77,  bars: 8 },
        { to: 107, bars: 8 }
      ], { seed: 211, wick: 0.4 }),
      // Cum Δ exhausts red BEFORE price turns — the sub-panel leads the candles
      tradingActivity: true,
      activityLabel: "Cum Δ — Leads the Reversal",
      markPoints: [
        { dataIndex:  5, label: "SA: Funding Extreme Neg",      position: "bottom" },
        { dataIndex:  6, label: "Cum Δ Red Exhausts First",     position: "bottom" },
        { dataIndex:  9, label: "TA: DBS Bounce — SA Led This!",position: "bottom" },
        { dataIndex: 15, label: "High Conviction Played Out",   position: "top"    }
      ]
    },

    quiz: {
      question: "A trader sees price approaching a daily DBS zone. They also note that the funding rate has been extremely negative for 48 hours and open interest has been rising as price falls. Without yet entering, what do these three combined signals suggest about the trade conviction level?",
      hint: "What does extreme negative funding indicate about which side is paying? What does rising OI with falling price tell you about who is adding aggressively?",
      style: "choice",
      answers: [
        { id: "a", text: "Very high conviction long setup — TA provides the DBS level; extreme negative funding means shorts are paying a heavy unsustainable cost; rising OI with falling price confirms shorts are aggressively adding; all three independently point to a short squeeze at this DBS zone",  correct: true,  type: "bullish" },
        { id: "b", text: "High conviction short continuation — rising OI with falling price is the dominant bearish signal and overrides both the DBS zone and the negative funding; follow the OI trend",  correct: false, type: "bearish" },
        { id: "c", text: "No conclusion — funding and OI are lagging indicators unsuitable for supplementing TA signals; only price action and chart structure are relevant to trade conviction",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "DBS Zone + Extreme Negative Funding + Rising OI — How Convicted?",
        type: "candlestick",
        chartHeight: 460,
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(100, [
          { to: 74,  bars: 9 },
          { to: 106, bars: 6 }
        ], { seed: 212, wick: 0.4 }),
        markLines: [
          { yAxis: 74, label: "DBS Zone", color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 72, y1: 78, label: "DBS + SA Confluence", color: "rgba(0,212,212,0.08)" }
        ],
        tradingActivity: true,
        activityLabel: "Cum Δ — Who's in Control"
      },
      revealMarkPoints: [
        { dataIndex:  8, label: "TA: DBS | SA: Ext Neg Funding + Rising OI", position: "bottom", color: "#00d4d4" },
        { dataIndex:  9, label: "Entry — Three-Way Confluence",               position: "bottom", color: "#00d4d4" },
        { dataIndex: 14, label: "Short Squeeze + TA Target",                  position: "top",    color: "#00d4d4" }
      ],
      explanation: "This is a <strong>maximum confluence setup</strong>. Three independent signals agree: TA (DBS zone — high probability reversal by chart structure), extreme negative funding (shorts are paying a heavy and unsustainable periodic cost), and rising OI with falling price (new shorts are aggressively entering — the most vulnerable position). When three independent variables from different analytical frameworks all point to the same outcome, conviction is at its highest. This is the 1-2 punch framework.",
      rule: "TA level + SA confirmation = maximum conviction. The more independent SA variables that align with the TA level, the higher the conviction. Always mark TA levels first, then layer SA. SA amplifies TA — it never replaces it."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 6 — Sentiment Analysis Variables
     Module 2 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 6,
    title: "Sentiment Analysis Variables",
    tag: "Module 2 · Session 2",
    module: "Determining Control",
    videoUrl: "https://www.youtube.com/embed/2NXUyB2e8Kg",

    intro: {
      heading: "Four Variables That Reveal Who Is in Control",
      body: "Sentiment analysis uses four quantitative variables to assess the real-time state of market participants. Each provides a different lens on the same market: who is paying, who is adding positions, who is more aggressive, and how far the market has drifted from equilibrium. Individually they provide hints. Together they provide conviction.",
      bullets: [
        "Variable 1 — Funding Rate: cost to hold long or short on perpetual swap exchanges; extremes signal participant exhaustion",
        "Variable 2 — Open Interest: total open contracts; relationship to price direction signals trend strength or dangerous divergence",
        "Variable 3 — Cumulative Delta: net market buys minus market sells; imbalances show who is aggressively off-sides",
        "Variable 4 — Futures Basis: spread between spot price and futures price; contango and backwardation extremes signal exhaustion",
        "None are 100% reliable standalone signals — they must combine with TA and with each other for maximum effect",
        "All four pointing the same direction = maximum confluence; even two or three aligned signals significantly raise conviction"
      ]
    },

    lesson: {
      heading: "How the Four Variables Work Together for Maximum Confluence",
      body: "The power of sentiment analysis comes from variable alignment. When multiple independent variables confirm the same trade thesis, their agreement is not coincidental — it reflects a genuine and extreme imbalance in the market. A single variable is a hint. Two is a signal. Three or four is a high-conviction trade.",
      bullets: [
        "Funding alone: useful but easily misread without price and level context",
        "OI alone: tells you whether positions are growing or shrinking; needs price direction for meaningful interpretation",
        "Cumulative Delta alone: shows who is more aggressive right now; can be noise without TA context",
        "Futures Basis alone: shows drift from equilibrium; needs trend context to be useful",
        "All four bearish: funding positive (longs paying), OI rising as price rises then stalls (longs adding), delta very green at resistance (longs aggressive at wrong level), contango extreme (market stretched) = maximum conviction short at SSR",
        "All four bullish: funding negative (shorts paying), OI rising as price falls (shorts adding), delta very red at support (shorts at wrong level), backwardation extreme = maximum conviction long at DBS"
      ]
    },

    introChart: {
      title: "All Four SA Variables Aligning Bullishly at Key DBS Level",
      markLines: [ { yAxis: 79, label: "DBS Support — All 4 SA Aligned", color: "#00d4d4" }, { yAxis: 117, label: "Max Confluence Target", color: "#ffcc00" } ],
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(16),
      ohlc: ltCandles(102, [
        { to: 79,  bars: 9 },
        { to: 117, bars: 7 }
      ], { seed: 213, wick: 0.4 }),
      // Var 3 (Cumulative Delta) drawn as a sub-panel — extreme red into the lows, flips on the squeeze
      tradingActivity: true,
      activityLabel: "Var 3 — Cumulative Delta",
      markPoints: [
        { dataIndex:  2, label: "Var 1: Funding Extreme Neg",  position: "bottom" },
        { dataIndex:  4, label: "Var 2: OI Rising vs Fall",    position: "bottom" },
        { dataIndex:  6, label: "Var 3: Cum Δ Very Red ▼",     position: "bottom" },
        { dataIndex:  7, label: "Var 4: Backwardation",        position: "bottom" },
        { dataIndex:  8, label: "All 4 Aligned — Max Long!",  position: "bottom" },
        { dataIndex: 15, label: "Max Confluence Target Hit",   position: "top"    }
      ]
    },

    lessonChart: {
      title: "Mixed SA Signals — Lower Conviction, Smaller Position Size",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(16),
      ohlc: ltCandles(90, [
        { to: 93, bars: 4 },
        { to: 89, bars: 4 },
        { to: 97, bars: 4 },
        { to: 92, bars: 4 }
      ], { seed: 214, wick: 0.4 }),
      // Choppy Cum Δ — no clean directional read = the "mixed signals" the lesson warns about
      tradingActivity: true,
      activityLabel: "Cum Δ — Choppy / Mixed",
      markPoints: [
        { dataIndex:  3, label: "SA: Mixed — Only 2/4 Signal",  position: "top"    },
        { dataIndex:  8, label: "Cum Δ Indecisive — Less Clarity", position: "top" },
        { dataIndex: 13, label: "Win — But Not Max Size",       position: "bottom" }
      ]
    },

    quiz: {
      question: "A trader sees all four sentiment variables at extreme readings and all pointing bullishly at a key DBS support zone. Funding is extreme negative, OI rising with falling price, cumulative delta extreme red, and the futures basis is deep backwardation. Compared to a setup where only one SA variable is mildly elevated, how should position sizing differ?",
      hint: "What does the number and strength of aligned SA signals say about the probability of this setup working? How does conviction translate to position size?",
      style: "choice",
      answers: [
        { id: "a", text: "Maximum position size on the four-variable alignment — all four independently agree with the TA setup; this represents the highest possible conviction within the framework; size should reflect that; mildly elevated single-variable setups warrant significantly reduced size",  correct: true,  type: "bullish" },
        { id: "b", text: "Same position size for both — position size should always be fixed and determined only by the TA setup; SA variable count does not change the risk-to-reward ratio and therefore should not affect size",  correct: false, type: "bearish" },
        { id: "c", text: "Smaller position size on the four-variable alignment — too many variables pointing the same way is a contrarian indicator; when everyone and every indicator agrees the market will do the opposite",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "One SA Variable Mild vs All Four Extreme — Position Size Impact?",
        type: "candlestick",
        chartHeight: 460,
        cutIndex: 8,
        labels: ltLabels(15),
        ohlc: ltCandles(100, [
          { to: 74,  bars: 9 },
          { to: 113, bars: 6 }
        ], { seed: 215, wick: 0.4 }),
        markLines: [
          { yAxis: 74, label: "DBS Zone — All 4 SA Aligned", color: "#00d4d4" }
        ],
        tradingActivity: true,
        activityLabel: "Var 3 — Cumulative Delta"
      },
      revealMarkPoints: [
        { dataIndex:  8, label: "4/4 SA + TA = Max Conviction", position: "bottom", color: "#00d4d4" },
        { dataIndex:  9, label: "Max Size Entry Here",          position: "bottom", color: "#00d4d4" },
        { dataIndex: 14, label: "Explosive Short Squeeze",      position: "top",    color: "#00d4d4" }
      ],
      explanation: "Position size should be <strong>scaled to conviction, and conviction scales to the number and strength of aligned SA variables</strong>. When all four SA variables are at extremes and all point in the same direction as the TA setup, the probability of success is at its maximum within the framework. That justifies maximum position size. A single mild SA variable with a TA setup is still a valid trade — but at significantly reduced size. Scaling size to conviction is a core component of capital management within this framework.",
      rule: "SA conviction scales to: number of variables aligned + extremity of each reading. All 4 extreme + TA level = maximum size. Single mild SA = reduced size. Always scale position size to conviction level — not just to TA alone."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 7 — Funding Rate
     Module 2 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 7,
    title: "Funding Rate",
    tag: "Module 2 · Session 3",
    module: "Determining Control",
    videoUrl: "https://www.youtube.com/embed/K1oJYbsyOTk",

    intro: {
      heading: "Funding Rate — The Cost of Being on the Wrong Side",
      body: "The funding rate is a periodic payment mechanism on perpetual swap exchanges that anchors the perpetual contract price to the underlying spot price. It is also one of the most powerful sentiment indicators available — extreme funding rates reveal when one side of the market has become dangerously overextended and is paying an unsustainable cost to maintain their position.",
      bullets: [
        "Funding = cost to hold long or short on perpetual swap exchanges; paid on fixed intervals (BitMEX every 8 hours = 3 per day)",
        "Two components: Interest Rate (fixed, unchanging) + Premium/Discount (perp price vs spot index price)",
        "Premium state: perp price greater than spot; longs pay shorts; bullish side may be overextended",
        "Discount state: perp price less than spot; shorts pay longs; bearish side may be overextended",
        "Extreme positive funding at resistance + lower highs forming = high probability long squeeze downward",
        "Extreme negative funding at support + higher lows forming = high probability short squeeze upward"
      ]
    },

    lesson: {
      heading: "Extreme Funding Readings Signal Unsustainable Positions",
      body: "The key insight from funding rate analysis is that extreme readings are financially unsustainable. When funding is extremely negative, short holders pay a high cost every 8 hours. Eventually that cost forces position closure — and when shorts close en masse, price rises sharply. Identifying extreme funding at a TA key level creates a high-probability squeeze setup.",
      bullets: [
        "Extreme positive funding at resistance + lower highs = longs paying unsustainably at the wrong level → long squeeze down",
        "Extreme negative funding at support + higher lows = shorts paying unsustainably at the wrong level → short squeeze up",
        "The more extreme the funding, the more unsustainable the position, and the more explosive the eventual squeeze",
        "Timing: funding alone cannot tell you WHEN the squeeze fires — TA provides the WHERE and the trigger",
        "Best pattern: extreme negative funding at range low DBS zone + price making higher lows = textbook short squeeze",
        "Worst mistake: fading extreme funding without TA confirmation — funding can stay extreme for days before resolving"
      ]
    },

    introChart: {
      title: "Extreme Negative Funding at Support — Short Squeeze Setup",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(18),
      ohlc: ltCandles(100, [
        { to: 80,  bars: 10 },
        { to: 78,  bars: 3  },
        { to: 116, bars: 5  }
      ], { seed: 216, wick: 0.4 }),
      markLines: [ { yAxis: 116, label: "Squeeze Target", color: "#ffcc00" },
        { yAxis: 79, label: "DBS Support Zone (TA)", color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 77, y1: 83, label: "DBS + Extreme Neg Funding", color: "rgba(0,212,212,0.08)" }
      ],
      // THE funding-rate tool — deep red (shorts paying) into the lows, climbs through zero on the squeeze
      subPanel: { kind: "funding", label: "Funding Rate", points: [[0,-0.02],[5,-0.082],[9,-0.085],[12,0],[17,0.025]] },
      markPoints: [
        { dataIndex:  5, label: "Funding: Extreme Negative",     position: "bottom" },
        { dataIndex:  7, label: "Higher Low Forming",            position: "bottom" },
        { dataIndex:  9, label: "Funding Still Extreme — Hold",  position: "bottom" },
        { dataIndex: 12, label: "Short Squeeze Ignites",         position: "bottom" },
        { dataIndex: 17, label: "Squeeze Target Reached",        position: "top"    }
      ]
    },

    lessonChart: {
      title: "Extreme Positive Funding at Resistance — Long Squeeze Setup",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(18),
      ohlc: ltCandles(82, [
        { to: 108, bars: 9 },
        { to: 104, bars: 3 },
        { to: 76,  bars: 6 }
      ], { seed: 217, wick: 0.4 }),
      markLines: [ { yAxis: 76, label: "Long Squeeze Target", color: "#ffcc00" },
        { yAxis: 105, label: "SSR Resistance Zone (TA)", color: "#ff2e88" }
      ],
      markAreas: [
        { y0: 103, y1: 109, label: "SSR + Extreme Pos Funding", color: "rgba(255,46,136,0.07)" }
      ],
      // Funding green/extreme positive (longs paying) at the top, then dives negative as longs squeeze out
      subPanel: { kind: "funding", label: "Funding Rate", points: [[0,0.02],[6,0.085],[8,0.08],[11,0],[17,-0.03]] },
      markPoints: [
        { dataIndex:  6, label: "Funding: Extreme Positive",   position: "top"    },
        { dataIndex:  8, label: "Lower High Forming",          position: "top"    },
        { dataIndex: 10, label: "Longs Squeezed — Down",       position: "top"    },
        { dataIndex: 17, label: "Long Squeeze Target Hit",     position: "bottom" }
      ]
    },

    quiz: {
      question: "The funding rate on a perpetual swap has been at extreme negative readings for two days. Price has been declining but is now approaching a key DBS support zone and making higher lows. What does this configuration signal from a sentiment analysis perspective?",
      hint: "Who is paying the extreme negative funding? How long can they sustain that cost? What happens when they cannot continue holding?",
      style: "direction",
      answers: [
        { id: "a", text: "Bullish short squeeze — extreme negative funding means shorts are paying a very high and unsustainable cost every 8 hours; higher lows forming at a TA support level confirm diminishing bearish pressure; when shorts are forced to close the resulting buy orders create explosive upward momentum",  correct: true,  type: "bullish" },
        { id: "b", text: "Bearish continuation — extreme negative funding confirms shorts are dominant and are confident in their position; the higher cost they pay reflects their strong conviction that price will continue lower",  correct: false, type: "bearish" },
        { id: "c", text: "Neutral — the funding rate signal is ambiguous in isolation and cannot be interpreted directionally without comparing it against multiple exchange funding rates simultaneously",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Extreme Negative Funding + Higher Lows at DBS — Signal?",
        type: "candlestick",
        chartHeight: 460,
        cutIndex: 10,
        labels: ltLabels(16),
        ohlc: ltCandles(100, [
          { to: 78,  bars: 9 },
          { to: 113, bars: 7 }
        ], { seed: 218, wick: 0.4 }),
        markLines: [
          { yAxis: 78, label: "DBS Zone", color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 76, y1: 82, label: "DBS + Extreme Neg Funding", color: "rgba(0,212,212,0.08)" }
        ],
        subPanel: { kind: "funding", label: "Funding Rate", points: [[0,-0.025],[6,-0.085],[9,-0.08],[12,0],[15,0.02]] }
      },
      revealMarkPoints: [
        { dataIndex:  6, label: "Funding: Extreme Negative",  position: "bottom", color: "#ffcc00" },
        { dataIndex:  8, label: "Higher Low — SA + TA",       position: "bottom", color: "#00d4d4" },
        { dataIndex: 10, label: "Entry — Short Squeeze",      position: "bottom", color: "#00d4d4" },
        { dataIndex: 15, label: "Squeeze Target Reached",     position: "top",    color: "#00d4d4" }
      ],
      explanation: "Extreme negative funding means <strong>short holders are paying roughly -0.15% of their position notional every 8 hours</strong> — approximately -0.45% per day. This is financially unsustainable. Combined with higher lows forming at a TA DBS zone, the setup is a textbook short squeeze: shorts are overextended, paying heavily to hold, and positioned against a key support. When forced closures begin, their buy orders compound into explosive upward momentum.",
      rule: "Extreme negative funding at DBS + higher lows = high probability short squeeze. The cost is unsustainable; TA provides the trigger. Do not use funding alone — always pair with TA level and direction structure before entering."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 8 — Open Interest
     Module 2 · Session 4
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 8,
    title: "Open Interest",
    tag: "Module 2 · Session 4",
    module: "Determining Control",
    videoUrl: "https://www.youtube.com/embed/L0ZYzzbQteY",

    intro: {
      heading: "Open Interest — Measuring Participation and Conviction Behind a Move",
      body: "Open Interest is the total number of outstanding derivatives contracts that have not been settled. It tells you how many participants have capital at risk at any moment. More importantly, the relationship between price direction and whether OI is rising or falling reveals the true conviction — and vulnerability — behind any market move.",
      bullets: [
        "OI Increasing = new positions are being opened (new longs OR new shorts entering the market)",
        "OI Decreasing = existing positions are being closed (longs OR shorts exiting the market)",
        "Price Rising + OI Rising = strong bullish trend; new money confirms the move upward",
        "Price Rising + OI Falling = weakening trend; participants are closing into strength; momentum is leaving",
        "Price Falling + OI Rising = strongest bearish signal; new shorts are aggressively entering as price drops",
        "Price Falling + OI Falling = capitulation pattern; weak hands washing out; potential reversal forming"
      ]
    },

    lesson: {
      heading: "The Two Most Important OI Signals for Active Traders",
      body: "Two OI configurations stand out as most actionable. First: price falling while OI is rising — this is the strongest bearish divergence signal and demands respect. Second: price falling while OI is also falling — capitulation, suggesting weak hands are leaving and a reversal at a TA level may be forming. Both must combine with TA structure for full context.",
      bullets: [
        "Price Falling + OI Rising: new shorts entering aggressively as price drops; trend has real participant backing; do not fade this without strong TA confluence",
        "Price Falling + OI Falling: existing positions closing, not new ones opening; market is washing out; when this occurs at a DBS zone it is a high-probability reversal signal",
        "Price Rising + OI Falling: weakening upward move; fewer participants backing it; approaching exhaustion; watch for reversal",
        "Price Rising + OI Rising: safest trend-following environment; new money entering confirms the direction",
        "OI combination: price falling + OI rising + funding extreme negative = maximum bearish setup confirmed by short participation AND unsustainable holding cost",
        "OI alone is never sufficient — always combine with the other three SA variables and TA structure before committing capital"
      ]
    },

    introChart: {
      title: "Price Falling + OI Rising — Strongest Bearish Signal, Respect the Trend",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(16),
      ohlc: ltCandles(105, [{ to: 41, bars: 16 }], { seed: 219, wick: 0.4 }),
      // Open Interest climbing as price falls — new shorts entering with conviction (the bearish read)
      subPanel: { kind: "oi", label: "Open Interest ▲", points: [[0,100],[15,300]] },
      markPoints: [
        { dataIndex:  0, label: "OI Rising as Price Falls",   position: "top"    },
        { dataIndex:  5, label: "OI Still Rising — Respect",  position: "top"    },
        { dataIndex: 10, label: "New Shorts Active — Trend",  position: "top"    },
        { dataIndex: 15, label: "Trend Sustained by OI",      position: "top"    }
      ]
    },

    lessonChart: {
      title: "Price Falling + OI Falling — Capitulation; Potential Bottom at DBS",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 71,  bars: 9 },
        { to: 101, bars: 7 }
      ], { seed: 220, wick: 0.4 }),
      markLines: [
        { yAxis: 71, label: "DBS Zone — OI Falling = Capitulation", color: "#00d4d4" }
      ],
      // OI bleeding lower into the DBS — positions closing, weak hands washing out (capitulation)
      subPanel: { kind: "oi", label: "Open Interest ▼", points: [[0,300],[9,120],[15,150]] },
      markPoints: [
        { dataIndex:  4, label: "OI Falling + Price Falling",  position: "bottom" },
        { dataIndex:  8, label: "OI at Lows — Weak Hands Out", position: "bottom" },
        { dataIndex:  9, label: "Reversal — Capitulation Done",position: "bottom" },
        { dataIndex: 15, label: "New Uptrend",                 position: "top"    }
      ]
    },

    quiz: {
      question: "Over three days, price has declined steadily while open interest has consistently risen. A trader is considering a counter-trend long. What does this OI configuration specifically warn about this trade?",
      hint: "Rising OI with falling price means new positions are being opened. Which side is opening new positions as price falls?",
      style: "choice",
      answers: [
        { id: "a", text: "Strong warning — new shorts are aggressively entering as price falls; rising OI with falling price is the strongest bearish confirmation; a counter-trend long fights a trend backed by real new participants with real conviction; wait for OI to start falling before considering a reversal",  correct: true,  type: "bearish" },
        { id: "b", text: "Bullish signal — rising OI means growing market participation which confirms the next directional move will be explosive; counter-trend longs have the best risk-reward when OI is highest",  correct: false, type: "bullish" },
        { id: "c", text: "Neutral signal — rising OI with falling price simply means futures activity is high; it provides no directional information because OI counts both new longs and new shorts equally",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Falling Price + Rising OI — Counter-Trend Long Safe Here?",
        type: "candlestick",
        chartHeight: 460,
        cutIndex: 12,
        labels: ltLabels(16),
        ohlc: ltCandles(105, [{ to: 54, bars: 16 }], { seed: 221, wick: 0.4 }),
        subPanel: { kind: "oi", label: "Open Interest ▲", points: [[0,120],[15,310]] }
      },
      revealMarkPoints: [
        { dataIndex:  3, label: "OI Rising + Price Falling",    position: "top",    color: "#ff2e88" },
        { dataIndex:  7, label: "New Shorts — Real Conviction", position: "top",    color: "#ff2e88" },
        { dataIndex: 12, label: "OI Still Up — Trend Strong",   position: "top",    color: "#ff2e88" },
        { dataIndex: 15, label: "Counter Long = High Risk",     position: "bottom", color: "#ffcc00" }
      ],
      explanation: "Price Falling + OI Rising is the <strong>most bearish OI signal</strong>. New participants are actively opening short positions as price falls — this is real conviction backed by new capital. Taking a counter-trend long fights a trend with growing participant backing. The correct approach is to <strong>wait for OI to begin declining</strong> (existing positions closing, weak hands washing out) before looking for a reversal long — especially at a key DBS zone where the capitulation signal carries the most weight.",
      rule: "Price falling + OI rising = strongest bearish signal. New shorts entering with conviction. Do not counter-trend long here. Wait for OI to fall (capitulation / position closing) before reversals become high probability. Respect OI trends."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 9 — Cumulative Delta
     Module 2 · Session 5
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 9,
    title: "Cumulative Delta",
    tag: "Module 2 · Session 5",
    module: "Determining Control",
    videoUrl: "https://www.youtube.com/embed/7nvinS23xaY",

    intro: {
      heading: "Cumulative Delta — Real-Time View of Who Is More Aggressive",
      body: "Cumulative Delta measures the net difference between market buys and market sells — who is being more aggressive right now. When buyers fire market orders aggressively, delta spikes green. When sellers fire market orders aggressively, delta spikes red. Extreme imbalances reveal who is off-sides and potentially vulnerable to being squeezed.",
      bullets: [
        "Cumulative Delta = cumulative longs minus cumulative shorts (market buys minus market sells over time)",
        "Green delta spike = buyers are aggressively firing market orders = bullish pressure building at this level",
        "Red delta spike = sellers are aggressively firing market orders = bearish pressure building at this level",
        "Key question: who is being aggressive and at WHICH level? Aggression at the wrong level = off-sides",
        "Longs piling in aggressively at resistance = longs off-sides = potential reversal down",
        "Shorts piling in aggressively at support = shorts off-sides = potential squeeze up"
      ]
    },

    lesson: {
      heading: "Using Cumulative Delta to Identify Who Is Off-Sides",
      body: "The most powerful Cumulative Delta signal occurs when one side is extremely aggressive at a level where they should not be. Shorts piling in aggressively at a DBS support zone — very red cumulative delta — are loading the wrong position at the wrong level. Combined with extreme negative funding and key TA, this is the textbook short squeeze setup.",
      bullets: [
        "Very red delta at DBS support = shorts market-selling aggressively at a demand zone = off-sides and vulnerable",
        "Very green delta at SSR resistance = longs market-buying aggressively at a supply zone = off-sides and vulnerable",
        "The more extreme the delta imbalance at a TA level, the more pronounced the eventual squeeze when those positions close",
        "Three-way confluence: very red delta at DBS + extreme negative funding + DBS zone = maximum conviction long",
        "Divergence signal: price makes a new high but cumulative delta makes a lower high = buyers losing steam = hidden bearish divergence",
        "Cumulative Delta updates with every trade — it is the real-time measure of who is aggressively moving the market right now"
      ]
    },

    introChart: {
      title: "Very Red Cumulative Delta at DBS Support — Shorts Are Off-Sides",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 78,  bars: 8 },
        { to: 78,  bars: 2 },
        { to: 115, bars: 6 }
      ], { seed: 222, wick: 0.4 }),
      markLines: [ { yAxis: 115, label: "Squeeze Target", color: "#ffcc00" },
        { yAxis: 78, label: "DBS Support (TA)", color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 76, y1: 81, label: "DBS + Red Delta Zone", color: "rgba(0,212,212,0.08)" }
      ],
      // THE cumulative-delta tool itself — deep red into the DBS, then flips teal on the squeeze
      tradingActivity: true,
      activityLabel: "Cumulative Delta",
      markPoints: [
        { dataIndex:  6, label: "Delta: Very Red — Shorts Aggressive", position: "bottom" },
        { dataIndex:  7, label: "Delta: Extreme — Shorts at DBS!",     position: "bottom" },
        { dataIndex:  9, label: "Shorts Off-Sides — Squeeze Begins",   position: "bottom" },
        { dataIndex: 15, label: "Short Squeeze Complete",              position: "top"    }
      ]
    },

    lessonChart: {
      title: "Very Green Delta at Resistance — Longs Are Off-Sides",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(16),
      ohlc: ltCandles(82, [
        { to: 105, bars: 9 },
        { to: 81,  bars: 7 }
      ], { seed: 223, wick: 0.4 }),
      markLines: [ { yAxis: 81, label: "Squeeze-Down Target", color: "#ffcc00" },
        { yAxis: 103, label: "SSR Resistance (TA)", color: "#ff2e88" }
      ],
      markAreas: [
        { y0: 101, y1: 107, label: "SSR + Green Delta Zone", color: "rgba(255,46,136,0.07)" }
      ],
      // Cum Δ runs green into the SSR (longs aggressive/off-sides), then rolls red on the drop
      tradingActivity: true,
      activityLabel: "Cumulative Delta",
      markPoints: [ { dataIndex: 8, label: "Bearish Divergence — Price HH / Δ Lower High", position: "top" },
        { dataIndex:  7, label: "Delta: Very Green — Longs Aggressive",position: "top"    },
        { dataIndex:  8, label: "Delta: Extreme — Longs at SSR!",      position: "top"    },
        { dataIndex: 10, label: "Longs Off-Sides — Squeeze Down",      position: "top"    },
        { dataIndex: 15, label: "Long Squeeze Complete",               position: "bottom" }
      ]
    },

    quiz: {
      question: "At a key DBS support zone, cumulative delta is showing extreme red readings — sellers are firing market sell orders aggressively at this level. The funding rate is also at extreme negative. What does this combined SA signal most likely predict?",
      hint: "Who is being aggressive at this level? What position are they loading? What happens when their cost becomes unsustainable and they are forced to close?",
      style: "direction",
      answers: [
        { id: "a", text: "Bullish short squeeze — shorts are aggressively loading at a TA support zone where they are off-sides; extreme negative funding adds financial pressure on every holding period; when forced closures begin the resulting buy orders create explosive upward momentum",  correct: true,  type: "bullish" },
        { id: "b", text: "Bearish continuation — extreme red cumulative delta confirms sellers have overwhelming momentum; the TA support zone will be broken as sellers are too aggressive to be absorbed",  correct: false, type: "bearish" },
        { id: "c", text: "Indeterminate — red delta at support has historically had roughly equal bullish and bearish outcomes regardless of whether funding is also negative",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Extreme Red Delta + Extreme Negative Funding at DBS — Next Move?",
        type: "candlestick",
        chartHeight: 460,
        cutIndex: 9,
        labels: ltLabels(16),
        ohlc: ltCandles(100, [
          { to: 75,  bars: 9 },
          { to: 111, bars: 7 }
        ], { seed: 224, wick: 0.4 }),
        markLines: [
          { yAxis: 75, label: "DBS Zone", color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 72, y1: 78, label: "DBS + Extreme Red Delta + Extreme Neg Funding", color: "rgba(0,212,212,0.08)" }
        ],
        tradingActivity: true,
        activityLabel: "Cumulative Delta"
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "Delta: Extreme Red at DBS", position: "bottom", color: "#ffcc00" },
        { dataIndex:  9, label: "Shorts Off-Sides — Squeeze!",position: "bottom", color: "#00d4d4" },
        { dataIndex: 15, label: "Short Squeeze Complete",    position: "top",    color: "#00d4d4" }
      ],
      explanation: "Two maximum-strength SA signals are combining: <strong>extreme red cumulative delta at DBS</strong> (shorts are aggressively loading at a demand zone where they are positioned incorrectly) plus <strong>extreme negative funding</strong> (those same shorts are paying a heavy and unsustainable holding cost every 8 hours). When those shorts are forced to close, their buy orders become aggressive upward buying pressure — exactly the fuel for an explosive short squeeze from the DBS zone.",
      rule: "Extreme red delta at DBS + extreme negative funding = maximum short squeeze signal. Shorts are both off-sides AND paying unsustainably. Both SA signals agree: trade long at the TA DBS zone with maximum conviction."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 10 — Futures Basis
     Module 2 · Session 6
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 10,
    title: "Futures Basis",
    tag: "Module 2 · Session 6",
    module: "Determining Control",
    videoUrl: "https://www.youtube.com/embed/Y6-VWGeitV0",

    intro: {
      heading: "Futures Basis — Contango and Backwardation as Exhaustion Signals",
      body: "Futures basis is the difference between the futures contract price and the spot market price. When futures trade above spot the market is in Contango — bullish side may be overextended. When futures trade below spot the market is in Backwardation — bearish side may be overextended. Extreme readings in either state signal exhaustion and potential mean reversion.",
      bullets: [
        "Futures Basis = futures contract price minus spot price",
        "Contango: futures price greater than spot price; buyers may be overextended; potential bullish exhaustion warning",
        "Backwardation: futures price less than spot price; sellers may be overextended; potential bearish exhaustion warning",
        "Large positive basis (Contango) at top of uptrend = similar signal to extreme positive funding = longs overextended",
        "Large negative basis (Backwardation) after sharp dump = similar to extreme negative funding = shorts overextended",
        "The more extreme the basis deviation from zero, the higher the probability of a mean reversion back toward equilibrium"
      ]
    },

    lesson: {
      heading: "Using Futures Basis as a Contrarian Exhaustion Signal",
      body: "Extreme futures basis readings function as contrarian signals. When the market has drifted far from equilibrium, it must eventually return. A sharp dump to a TA DBS zone combined with deep backwardation (futures far below spot) is one of the most powerful multi-signal short squeeze setups in the entire framework.",
      bullets: [
        "Extreme contango at market top: futures premiums of $500-$800+ above spot historically signal bullish exhaustion and potential reversal",
        "Extreme backwardation after sharp dump: futures at $500-$800+ below spot historically signals bearish exhaustion and potential reversal",
        "Example pattern: strong uptrend + basis rises to +$600 premium + price makes lower highs + basis drops = confirmed reversal",
        "Example pattern: sharp dump + basis hits -$800 backwardation + price at DBS zone + basis starts normalizing = reversal up",
        "Basis alone is insufficient — it tells you THAT the market is stretched, not when it will normalize; TA provides the when",
        "Combine with funding: extreme backwardation + extreme negative funding at DBS = two independent measurements of the same overextension = maximum conviction"
      ]
    },

    introChart: {
      title: "Deep Backwardation After Sharp Dump — Bearish Exhaustion Signal",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(18),
      ohlc: ltCandles(110, [
        { to: 73,  bars: 11 },
        { to: 79,  bars: 2  },
        { to: 111, bars: 5  }
      ], { seed: 225, wick: 0.4 }),
      markLines: [ { yAxis: 110, label: "Mean-Reversion Target — Equilibrium", color: "#ffcc00" },
        { yAxis: 73, label: "DBS Zone — Deep Backwardation Here", color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 71, y1: 76, label: "DBS + Extreme Backwardation", color: "rgba(0,212,212,0.08)" }
      ],
      // Futures basis — red plunge into deep backwardation (futures far below spot), then normalizes up
      subPanel: { kind: "basis", label: "Futures Basis ($)", points: [[0,-50],[7,-400],[10,-700],[12,-300],[17,60]] },
      markPoints: [
        { dataIndex:  7, label: "Basis: Entering Backwardation",  position: "bottom" },
        { dataIndex: 10, label: "Basis: Deep Backwardation!",     position: "bottom" },
        { dataIndex: 12, label: "Basis Normalizing — Reversal",   position: "bottom" },
        { dataIndex: 17, label: "Target Hit — Exhaustion Play",   position: "top"    }
      ]
    },

    lessonChart: {
      title: "Extreme Contango at Top of Uptrend — Bullish Exhaustion Signal",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(18),
      ohlc: ltCandles(82, [
        { to: 115, bars: 9 },
        { to: 113, bars: 3 },
        { to: 87,  bars: 6 }
      ], { seed: 226, wick: 0.4 }),
      markLines: [ { yAxis: 87, label: "Contango Reversal Target", color: "#00d4d4" },
        { yAxis: 113, label: "SSR — Extreme Contango Here", color: "#ff2e88" }
      ],
      markAreas: [
        { y0: 111, y1: 117, label: "SSR + Extreme Contango", color: "rgba(255,46,136,0.07)" }
      ],
      // Basis spikes green into extreme contango (futures far above spot) at the top, then reverts negative
      subPanel: { kind: "basis", label: "Futures Basis ($)", points: [[0,60],[8,650],[10,500],[11,200],[17,-90]] },
      markPoints: [
        { dataIndex:  8, label: "Basis: Extreme Contango!",  position: "top"    },
        { dataIndex: 10, label: "Lower High — Exhaustion",   position: "top"    },
        { dataIndex: 11, label: "Basis Normalizing — Sell",  position: "top"    },
        { dataIndex: 17, label: "Contango Reversal Target",  position: "bottom" }
      ]
    },

    quiz: {
      question: "After a sharp three-day price dump, the futures basis has moved into deep backwardation — the futures contract is trading $700 below the spot price. Price is now approaching a key DBS support zone. What does this extreme backwardation signal in context?",
      hint: "Deep backwardation after a sharp dump means futures traders are pricing in much more downside than the spot market. Which side is overextended? What does history say about this level of market drift from equilibrium?",
      style: "direction",
      answers: [
        { id: "a", text: "Bullish reversal signal — deep backwardation after a sharp dump indicates bearish exhaustion; futures sellers are overextended and pricing in excessive additional downside; combined with the DBS zone this is a high-probability long entry as the basis normalizes",  correct: true,  type: "bullish" },
        { id: "b", text: "Bearish continuation signal — deep backwardation confirms futures traders expect the dump to continue; the futures market is leading the spot market lower and should be trusted over the TA support level",  correct: false, type: "bearish" },
        { id: "c", text: "Neutral — futures basis extreme readings are driven by institutional hedging activity and are unrelated to retail directional positioning; they cannot be used as a sentiment signal for directional trading",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Deep Backwardation After Dump + DBS Zone — Directional Signal?",
        type: "candlestick",
        chartHeight: 460,
        cutIndex: 10,
        labels: ltLabels(16),
        ohlc: ltCandles(110, [
          { to: 73,  bars: 10 },
          { to: 113, bars: 6  }
        ], { seed: 227, wick: 0.4 }),
        markLines: [
          { yAxis: 73, label: "DBS Zone — Deep Backwardation", color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 71, y1: 77, label: "DBS + Backwardation Zone", color: "rgba(0,212,212,0.08)" }
        ],
        subPanel: { kind: "basis", label: "Futures Basis ($)", points: [[0,-60],[9,-700],[10,-350],[15,60]] }
      },
      revealMarkPoints: [
        { dataIndex:  9, label: "DBS + Deep Backwardation",  position: "bottom", color: "#00d4d4" },
        { dataIndex: 10, label: "Entry — Basis Normalizing", position: "bottom", color: "#00d4d4" },
        { dataIndex: 15, label: "Target Hit — Mean Reversion",position: "top",   color: "#00d4d4" }
      ],
      explanation: "Deep backwardation of $700 means futures traders are pricing in approximately $700 more downside than the spot market reflects. This extreme deviation from equilibrium is a <strong>bearish exhaustion signal</strong>. The market has drifted far from its equilibrium basis and must eventually normalize. At a DBS zone, this creates a powerful layered setup: TA says potential reversal, SA says bearish side is overextended by an extreme margin. As the basis normalizes back toward zero, price rises back toward the spot reference — exactly the reversal the DBS zone was predicting.",
      rule: "Deep backwardation after sharp dump = bearish exhaustion signal. Futures traders are overpricing additional downside. At a DBS zone this is a high-probability long — combine with other SA variables (funding, OI, delta) for maximum conviction."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 11 — Applying Sentiment — Summary
     Module 2 · Session 7
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 11,
    title: "Applying Sentiment — Summary",
    tag: "Module 2 · Session 7",
    module: "Determining Control",
    videoUrl: "https://www.youtube.com/embed/Jpty5yuVFqA",

    intro: {
      heading: "The 1-2 Punch Framework — TA Plus SA for Maximum Conviction",
      body: "Module 2 concludes by bringing all four sentiment variables together into a unified framework. None of these tools are perfect in isolation — they are powerful because of how they combine with technical analysis and with each other. The goal is maximum confluence: multiple independent variables confirming the same high-probability setup.",
      bullets: [
        "Step 1 — Technical Analysis: mark levels (DBS, SSR, Fibonacci, Ichimoku), chart structure, ranges, and LTE setups",
        "Step 2 — Sentiment Analysis: funding intervals + open interest + cumulative delta + futures basis",
        "TA gives you: WHERE price might go and WHY the level is structurally significant",
        "SA gives you: WHO is off-sides at that level, WHY the move is likely to happen now, and HOW explosive it could be",
        "Maximum confluence: all 4 SA variables pointing the same direction at a TA level = highest conviction trade in the framework",
        "Key reminder: none of these tools are 100%; Liquidity Theory is a school of thought; goal is maximum probability — not certainty"
      ]
    },

    lesson: {
      heading: "Combining All Tools — The Complete Decision Framework",
      body: "The complete framework is a layered process: start with HTF TA to identify the macro context, identify the specific key level, then run all four SA variables to assess conviction. When all four SA variables align bullishly or bearishly at a key TA level, you have the highest-probability setup the framework produces. Trade it at maximum size within your risk parameters.",
      bullets: [
        "HTF context first: is the daily in an uptrend or downtrend? Where are the weekly DBS and SSR zones?",
        "Specific level: mark the exact DBS or SSR zone where price is likely to react",
        "SA check 1 — Funding: is funding extreme? Which direction? Does it confirm or conflict with TA?",
        "SA check 2 — OI: is OI rising or falling relative to price direction? Does it confirm the squeeze thesis?",
        "SA check 3 — Cumulative Delta: who is being aggressive at this level? Are they on the right or wrong side?",
        "SA check 4 — Futures Basis: is contango or backwardation extreme? Does it signal exhaustion at this level?",
        "Final call: how many of the four SA variables agree with the TA setup? Scale position size proportionally to that count"
      ]
    },

    introChart: {
      title: "Full Framework — HTF TA Level + All 4 SA Variables Aligned",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(16),
      ohlc: ltCandles(105, [
        { to: 78,  bars: 10 },
        { to: 122, bars: 6  }
      ], { seed: 228, wick: 0.4 }),
      markLines: [ { yAxis: 122, label: "Squeeze Target", color: "#ffcc00" },
        { yAxis: 78, label: "HTF DBS Zone", color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 76, y1: 81, label: "4/4 SA + TA Confluence", color: "rgba(0,212,212,0.08)" }
      ],
      // SA Check 1 drawn — funding extreme negative into the DBS, normalizing on the squeeze
      subPanel: { kind: "funding", label: "Funding Rate (SA 1/4)", points: [[0,-0.02],[6,-0.08],[9,-0.07],[12,0],[15,0.022]] },
      markPoints: [
        { dataIndex:  6, label: "SA Check 1: Funding Extreme Neg",  position: "bottom" },
        { dataIndex:  7, label: "SA Check 2: OI Rising vs Fall",    position: "bottom" },
        { dataIndex:  8, label: "SA 3+4: Delta Red + Backwardation",position: "bottom" },
        { dataIndex:  9, label: "All 4 + TA = Max Conviction Entry",position: "bottom" },
        { dataIndex: 15, label: "Full Squeeze — Target Achieved",   position: "top"    }
      ]
    },

    lessonChart: {
      title: "Two SA Variables vs Four — How Conviction and Size Scale",
      markLines: [ { yAxis: 83, label: "DBS Zone — TA Level", color: "#00d4d4" }, { yAxis: 117, label: "Target — 2R / 4R", color: "#ffcc00" } ],
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 83,  bars: 8 },
        { to: 117, bars: 8 }
      ], { seed: 229, wick: 0.4 }),
      // Only a mild funding tilt here — the "2/4 aligned, half size" lesson
      subPanel: { kind: "funding", label: "Funding (2/4 aligned)", points: [[0,-0.01],[7,-0.045],[15,0.012]] },
      markPoints: [
        { dataIndex:  7, label: "2/4 SA: Half Size Entry",    position: "bottom" },
        { dataIndex:  8, label: "Still Works — But Smaller",  position: "bottom" },
        { dataIndex: 15, label: "Target Hit — 2R vs 4R Size", position: "top"    }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "In the 1-2 punch framework, what is the specific role that Sentiment Analysis plays that Technical Analysis alone cannot provide?",
      hint: "TA identifies WHERE price might react. What gap does SA specifically fill — what does it add that TA cannot tell you?",
      style: "choice",
      answers: [
        { id: "a", text: "SA reveals WHO is off-sides at the TA level and WHY the move is likely to happen on this specific visit — it shows which side is overextended, financially stressed, and vulnerable to being squeezed, turning a probable TA setup into a high-conviction trade",  correct: true,  type: "bullish" },
        { id: "b", text: "SA provides more accurate price targets than TA — it calculates the exact distance of the expected squeeze move based on the size of the imbalance, which TA Fibonacci levels cannot do with the same precision",  correct: false, type: "bearish" },
        { id: "c", text: "SA replaces TA in determining key price levels — sentiment data from funding and OI creates more reliable support and resistance levels than technical chart analysis",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "TA Level — What Does SA Add That TA Cannot Provide?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(100, [
          { to: 74,  bars: 9 },
          { to: 113, bars: 6 }
        ], { seed: 230, wick: 0.4 }),
        markLines: [
          { yAxis: 74, label: "DBS Zone — TA Level", color: "#00d4d4" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  8, label: "TA: DBS Level — SA: Shorts Off-Sides + Funding Extreme", position: "bottom", color: "#00d4d4" },
        { dataIndex:  9, label: "1-2 Punch Entry",    position: "bottom", color: "#00d4d4" },
        { dataIndex: 14, label: "WHY It Worked: SA",  position: "top",    color: "#ffcc00" }
      ],
      explanation: "TA identifies the <strong>WHERE</strong> — the DBS zone where price has a structural reason to react. SA fills the critical gap by revealing the <strong>WHO</strong> and the <strong>WHY NOW</strong>: which side is overextended at this specific level, how much financial pressure they are under (funding cost, OI commitment), and why the resulting squeeze will be explosive when they are forced out. TA alone says 'price might react here.' TA plus SA says 'price will likely squeeze upward here because shorts are off-sides, paying heavily, and aggressively adding at the wrong level.'",
      rule: "TA tells you WHERE. SA tells you WHO is off-sides and WHY the move fires now. Neither replaces the other. The 1-2 punch is always: TA level first, then SA confirmation layered on top. Maximum conviction = all four SA variables aligned with TA."
    }
  },


  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 12 — Trend Buddy
     Module 3 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 12,
    title: "Trend Buddy",
    tag: "Module 3 · Session 1",
    module: "Indicator Suite",
    videoUrl: "https://www.youtube.com/embed/Ke6I9iuyAVE",

    intro: {
      heading: "Trend Buddy — Candle Color System for Trend Identification",
      body: "Trend Buddy is a candle color indicator that visually identifies the current trend type on any timeframe. Each color carries a specific meaning — from confirmed trends to reversals, pivots, and cancellations. Used as confluence with S/R levels and LTE setups, it provides an immediate visual read of market state without manual structure analysis.",
      bullets: [
        "Turquoise: uptrend detected — enter long within 1-2 candle closes of the color change",
        "Magenta: downtrend detected — enter short within 1-2 candle closes of the color change",
        "Gray: no discernible trend — do not trade directionally; wait for color resolution",
        "Blue: unconfirmed bullish reversal — high risk/reward potential; higher risk than Lime Green",
        "Lime Green: confirmed bullish reversal — higher probability long entry than Blue",
        "Orange: bearish pivot — use candle high/low as S/R; take profit on longs or tighten stops",
        "Purple: bearish breakdown in one candle; Dark Green: bullish breakout in one candle — high momentum"
      ]
    },

    lesson: {
      heading: "Reading the Full Color Sequence as Confluence — Not as a Standalone System",
      body: "Trend Buddy is a confluence indicator — never a standalone trading system. Its value is confirming what S/R levels and market structure already suggest. A turquoise candle at a DBS zone after a pullback is more powerful than turquoise in the middle of an extended move. Context always governs which signals carry weight.",
      bullets: [
        "Turquoise and Magenta: trend-following entries; enter within 1-2 candles of color change with TA confirmation",
        "Blue: unconfirmed reversal — use only with strong S/R confluence and clear LTE setup; stops must be tight",
        "Lime Green: confirmed reversal — higher probability than Blue; better entry with smaller stop risk",
        "Orange: profit-taking signal on longs; the candle high/low becomes local S/R for stop management",
        "Fuchsia: profit-taking signal on shorts; the candle high/low becomes local S/R for stop management",
        "Red candle (canceled reversal): exit or tighten any position opened on a Blue signal immediately",
        "Gray: no-trade zone — reducing position size or sitting on hands during gray periods protects capital"
      ]
    },

    introChart: {
      title: "Trend Buddy Color Sequence — Uptrend, Pivot, Gray, Reversal",
      markLines: [ { yAxis: 110, label: "Orange High = S/R", color: "#ff9f1a" } ],
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(82, [
        { to: 110, bars: 8 },
        { to: 103, bars: 5 },
        { to: 111, bars: 5 }
      ], { seed: 231, wick: 0.35 }),
      // Trend Buddy colour system: turquoise=uptrend · orange=bearish pivot · gray=no trend
      // · blue=unconfirmed reversal · lime green=confirmed reversal · turquoise=new uptrend
      candleColors: [
        "#1fd8c8","#1fd8c8","#1fd8c8","#1fd8c8","#1fd8c8","#1fd8c8",
        "#ff9f1a","#ff9f1a",
        "#8a8f99","#8a8f99","#8a8f99","#8a8f99","#8a8f99",
        "#4a9eff","#4a9eff",
        "#9be84f",
        "#1fd8c8","#1fd8c8"
      ],
      markPoints: [
        { dataIndex:  0, label: "Turquoise — Uptrend",    position: "bottom" },
        { dataIndex:  6, label: "Orange — Pivot; TP Long",position: "top"    },
        { dataIndex:  9, label: "Gray — No Trend",        position: "top"    },
        { dataIndex: 13, label: "Blue — Unconf Reversal", position: "bottom" },
        { dataIndex: 15, label: "Lime Green — Confirmed", position: "bottom" },
        { dataIndex: 17, label: "Turquoise — New Trend",  position: "top"    }
      ]
    },

    lessonChart: {
      title: "Trend Buddy at DBS Zone — Color Confirms TA Level",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(98, [
        { to: 77,  bars: 8 },
        { to: 113, bars: 8 }
      ], { seed: 232, wick: 0.4 }),
      // magenta=downtrend · gray=approaching DBS · blue=unconfirmed reversal · lime=confirmed · turquoise=uptrend
      candleColors: [
        "#e83fb0","#e83fb0","#e83fb0","#e83fb0","#e83fb0","#e83fb0",
        "#8a8f99","#8a8f99",
        "#4a9eff",
        "#9be84f",
        "#1fd8c8","#1fd8c8","#1fd8c8","#1fd8c8","#1fd8c8","#1fd8c8"
      ],
      markLines: [ { yAxis: 80, label: "Entry — Turquoise + DBS", color: "#00d4d4" }, { yAxis: 75, label: "Stop — below DBS", color: "#ff2e88" },
        { yAxis: 77, label: "DBS Zone (TA)", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  6, label: "Gray — Approaching DBS",   position: "bottom" },
        { dataIndex:  8, label: "Blue — Unconf Reversal",   position: "bottom" },
        { dataIndex:  9, label: "Lime Green — Confirmed!",  position: "bottom" },
        { dataIndex: 10, label: "Turquoise — Trend UP",     position: "bottom" },
        { dataIndex: 15, label: "Turquoise Confirmed",      position: "top"    }
      ]
    },

    quiz: {
      question: "A Trend Buddy candle turns turquoise on the 4-hour chart after price pulls back to a key DBS support zone. What is the correct action according to Trend Buddy rules?",
      hint: "What does turquoise signal? Within how many candles should you act? Does using it alone violate the indicator's rules?",
      style: "choice",
      answers: [
        { id: "a", text: "Enter long within 1-2 candle closes of the turquoise color change, using the DBS zone as TA confluence — turquoise confirms an uptrend is detected and the DBS level adds structural support",  correct: true,  type: "bullish" },
        { id: "b", text: "Wait for the next Orange candle before entering — turquoise is only a preliminary signal and Orange confirms the trend is mature enough to trade",  correct: false, type: "bearish" },
        { id: "c", text: "Do not trade turquoise candles — they represent trend detection only; actual entries require a Blue or Lime Green reversal signal first",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Turquoise Candle at DBS Zone — What Is the Correct Action?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(100, [
          { to: 76,  bars: 8 },
          { to: 112, bars: 7 }
        ], { seed: 233, wick: 0.4 }),
        // magenta=downtrend · gray=approaching DBS · turquoise=uptrend detected (the candle in question)
        candleColors: [
          "#e83fb0","#e83fb0","#e83fb0","#e83fb0","#e83fb0","#e83fb0","#e83fb0",
          "#8a8f99",
          "#1fd8c8","#1fd8c8","#1fd8c8","#1fd8c8","#1fd8c8","#1fd8c8","#1fd8c8"
        ],
        markLines: [
          { yAxis: 76, label: "DBS Zone", color: "#00d4d4" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "Gray — Approaching DBS",  position: "bottom", color: "#8a8f99" },
        { dataIndex:  8, label: "Turquoise — Enter Long!", position: "bottom", color: "#1fd8c8" },
        { dataIndex: 14, label: "Uptrend Confirmed",       position: "top",    color: "#1fd8c8" }
      ],
      explanation: "Turquoise means <strong>uptrend detected</strong> — the Trend Buddy rule is to enter long within 1–2 candle closes of the turquoise color appearing. The DBS zone provides the TA confluence that gives this signal extra weight: the indicator is confirming what the chart structure already suggested. Trend Buddy is never used as a standalone system — the turquoise here is amplified by the DBS zone, not the other way around. Do not wait for Orange (that is a profit-taking signal, not an entry signal).",
      rule: "Turquoise = uptrend detected; enter long within 1-2 candles. Magenta = downtrend; enter short within 1-2 candles. Never use Trend Buddy as a standalone system — always pair with S/R levels and LTE methodology."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 13 — PAL Tool — Price Action Levels
     Module 3 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 13,
    title: "PAL Tool — Price Action Levels",
    tag: "Module 3 · Session 2",
    module: "Indicator Suite",
    videoUrl: "https://www.youtube.com/embed/zLaxSnpFfyQ",

    intro: {
      heading: "PAL — Real-Time Price Action Signals and Dynamic S/R Levels",
      body: "The PAL Tool (Price Action Levels) serves a dual purpose: it generates real-time price action signals at key candle formations AND draws dynamic S/R levels from those formations. Think of it as a live annotator for the chart — highlighting exhaustion, absorption, and reversal signals as they form, and drawing the levels those formations create.",
      bullets: [
        "Big Red Circle: bullish exhaustion — buyers are drying up; watch for potential reversal down",
        "Big Green Circle: bearish exhaustion — sellers are drying up; watch for potential reversal up",
        "Small Green Circles: bullish pushes — buyers still present despite bearish structure",
        "Red AP: bullish absorption — a large buyer is absorbing all incoming sell orders at this level",
        "Green AP: bearish absorption — a large seller is absorbing all incoming buy orders at this level",
        "F (Outside Bar Failure): potential reversal at the candle high or low",
        "Turquoise Triangles: confirmed bullish reversals; X markers: canceled reversal signals"
      ]
    },

    lesson: {
      heading: "Using PAL Signals as LTE Triggers and Dynamic S/R",
      body: "PAL signals are most powerful when they appear at pre-identified S/R levels from your TA analysis. A Big Green Circle (bearish exhaustion) at an SSR zone is a high-probability short trigger. A Red AP (bullish absorption) at a DBS zone signals a large buyer is defending — this is a potential long entry trigger in the LTE framework.",
      bullets: [
        "Red AP at DBS zone: a large buyer absorbs all sells — this IS the large player filling their long position; high conviction long signal",
        "Green AP at SSR zone: a large seller absorbs all buys — large player filling short; high conviction short signal",
        "Big Red Circle at key resistance: buyer exhaustion at the top — potential short entry or profit taking signal",
        "Big Green Circle at key support: seller exhaustion at the bottom — potential long entry or reversal watch",
        "Turquoise Triangles: confirmed reversal entries; pair with S/R for highest probability",
        "Dynamic levels from PAL: the lines drawn by PAL formations act as real-time S/R zones; S/R flips visible as they happen",
        "Use PAL signals as LTE triggers — the signal itself is the Execution component of the Level-Trigger-Execution framework"
      ]
    },

    introChart: {
      title: "PAL Signals — Circles and AP Markers at Key Price Levels",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(95, [
        { to: 77,  bars: 8 },
        { to: 99,  bars: 4 },
        { to: 94,  bars: 4 }
      ], { seed: 234, wick: 0.4 }),
      markLines: [ { yAxis: 99, label: "Dynamic Resistance (Big Red Circle)", color: "#ff2e88" },
        { yAxis: 77, label: "DBS Zone (TA)", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  3, label: "Big Green Circle — Sellers Drying Up",  position: "bottom" },
        { dataIndex:  6, label: "Red AP — Large Buyer Absorbing Sells",  position: "bottom" },
        { dataIndex:  7, label: "Turquoise Triangle — Confirmed Reversal",position: "bottom" },
        { dataIndex: 11, label: "Big Red Circle — Buyers Drying Up",     position: "top"    }
      ]
    },

    lessonChart: {
      title: "Red AP (Bullish Absorption) at DBS — Large Buyer Identified",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 77,  bars: 8 },
        { to: 77,  bars: 2 },
        { to: 119, bars: 6 }
      ], { seed: 235, wick: 0.4 }),
      markLines: [ { yAxis: 119, label: "Target", color: "#ffcc00" },
        { yAxis: 77, label: "DBS Zone", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  6, label: "Approaching DBS",         position: "bottom" },
        { dataIndex:  7, label: "Red AP — Large Buyer Here!",position: "bottom" },
        { dataIndex:  8, label: "Long Entry — Large Player Confirmed",position: "bottom" },
        { dataIndex: 15, label: "Target Achieved",         position: "top"    }
      ]
    },

    quiz: {
      question: "At a key DBS support zone, the PAL tool displays a Red AP signal. What does a Red AP signal specifically indicate and why is it particularly significant at a DBS zone?",
      hint: "AP stands for Absorption. Red or Green specifies which direction the absorption is happening. Who is absorbing what at a Red AP?",
      style: "choice",
      answers: [
        { id: "a", text: "Red AP = Bullish Absorption — a large buyer is absorbing all incoming sell orders at this price level; at a DBS zone this confirms that the large player the Liquidity Theory framework predicts should be buying here is actually present and filling a long position",  correct: true,  type: "bullish" },
        { id: "b", text: "Red AP = Bearish Absorption — a large seller is absorbing all buy orders; appearing at a DBS zone it confirms sellers are defending this level aggressively and price will continue lower",  correct: false, type: "bearish" },
        { id: "c", text: "Red AP = Rejection at Price — the AP marker simply flags that price was rejected at that candle's high; it has no specific buyer or seller implication at any level",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Red AP at DBS Zone — What Does It Signal?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(100, [
          { to: 77,  bars: 8 },
          { to: 82,  bars: 1 },
          { to: 120, bars: 6 }
        ], { seed: 236, wick: 0.4 }),
        markLines: [
          { yAxis: 77, label: "DBS Zone", color: "#00d4d4" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "Red AP — Large Buyer Absorbing!", position: "bottom", color: "#00d4d4" },
        { dataIndex:  8, label: "Long Entry Confirmed",            position: "bottom", color: "#00d4d4" },
        { dataIndex: 14, label: "Target — Large Player Won",       position: "top",    color: "#00d4d4" }
      ],
      explanation: "A <strong>Red AP (Bullish Absorption)</strong> means a large buyer is actively absorbing every incoming sell order at this price — they are willing to buy every unit being sold at this level. At a DBS zone this is the most direct confirmation possible that the large player predicted by Liquidity Theory is actually present and filling their long position. It is the PAL tool's most powerful signal for a long entry when it appears at a pre-identified DBS zone.",
      rule: "Red AP at DBS = large buyer absorbing sells; highest-conviction long trigger in the PAL system. Green AP at SSR = large seller absorbing buys; highest-conviction short trigger. AP signals confirm the Liquidity Theory mechanic in real time."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 14 — Heuristics
     Module 3 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 14,
    title: "Heuristics",
    tag: "Module 3 · Session 3",
    module: "Indicator Suite",
    videoUrl: "https://www.youtube.com/embed/nuWGOXYVWVc",

    intro: {
      heading: "Heuristics — Moving Average Channel with Exhaustion Signals",
      body: "Heuristics is a quick-decision indicator built around a moving average channel. Price above the channel signals a bullish environment; price below signals bearish. Exhaustion dots — green for seller exhaustion and red for buyer exhaustion — are plotted directly on the chart when the oscillator reaches extreme readings within the channel context.",
      bullets: [
        "Trending Channel: built from a moving average (EMA, HMA, or EHMA); adjustable lookback (default 36)",
        "Above channel: bullish environment — bias longs only; Heuristics confirms uptrend context",
        "Below channel: bearish environment — bias shorts only; Heuristics confirms downtrend context",
        "Green Dots: seller exhaustion signal — potential long entry or addition to existing long",
        "Red Dots: buyer exhaustion signal — potential short entry or addition to existing short",
        "Smoothed version available: reduces false positives at the cost of slightly later signals",
        "Designed to catch the MEAT of a trend — not tops and bottoms"
      ]
    },

    lesson: {
      heading: "Two Use Cases — HTF Bias and LTF Entry Points",
      body: "Heuristics serves two distinct roles depending on the timeframe applied. On higher timeframes (daily, 4H) it provides directional bias — is the market above or below the channel? On lower timeframes (1H, 30min) it provides the entry timing — pull back into channel, exhaustion dot appears, enter in the trend direction. Both uses require TA confluence for maximum effect.",
      bullets: [
        "HTF bias use: if daily chart price is above Heuristics channel and green — trading longs on LTF has the HTF trend behind it",
        "LTF entry use: pull back into channel + exhaustion dot appears = enter in the direction of the HTF bias",
        "The dots catch short-term exhaustion WITHIN the established trend — they are not standalone reversal signals",
        "Day trading application: overlay on daily chart for bias; drop to 4H or 1H for dot-triggered entries",
        "Swing trading application: overlay on weekly chart for macro bias; daily for entry dots",
        "Never trade dots against the channel direction — green dot below the channel is not a long signal",
        "Smoothed setting: use in choppy or high-volatility environments to reduce noise; accepts slightly later signals in exchange for fewer false positives"
      ]
    },

    introChart: {
      title: "Heuristics — MA Channel with Green Exhaustion Dot at Pullback",
      markLines: [ { yAxis: 95, label: "Long Entry — Green Dot", color: "#00d4d4" } ],
      type: "candlestick",
      indicator: "rsi_zones",
      chartHeight: 480,
      labels: ltLabels(18),
      ohlc: ltCandles(82, [
        { to: 100, bars: 8 },
        { to: 95,  bars: 3 },
        { to: 126, bars: 7 }
      ], { seed: 237, wick: 0.4 }),
      markAreas: [
        { y0: 92, y1: 100, label: "Heuristics Channel", color: "rgba(0,212,212,0.07)" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Above Channel — Bullish Bias",  position: "bottom" },
        { dataIndex:  6, label: "Pullback into Channel",         position: "bottom" },
        { dataIndex:  7, label: "Green Dot — Seller Exhaustion", position: "bottom" },
        { dataIndex:  8, label: "Entry — Continue Uptrend",      position: "bottom" },
        { dataIndex: 17, label: "Trend Target Achieved",         position: "top"    }
      ]
    },

    lessonChart: {
      title: "Heuristics — HTF Bias Bearish; Red Dot at Channel for Short Entry",
      markLines: [ { yAxis: 100, label: "Short Entry — Red Dot", color: "#ff2e88" }, { yAxis: 72, label: "Short Target", color: "#ff2e88" } ],
      type: "candlestick",
      indicator: "rsi_zones",
      chartHeight: 480,
      labels: ltLabels(16),
      ohlc: ltCandles(108, [
        { to: 97,  bars: 5 },
        { to: 100, bars: 3 },
        { to: 72,  bars: 8 }
      ], { seed: 238, wick: 0.4 }),
      markAreas: [
        { y0: 94, y1: 100, label: "Heuristics Channel", color: "rgba(255,46,136,0.07)" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Below Channel — Bearish Bias",  position: "top"    },
        { dataIndex:  5, label: "Rally into Channel",            position: "top"    },
        { dataIndex:  6, label: "Red Dot — Buyer Exhaustion",    position: "top"    },
        { dataIndex:  7, label: "Short Entry — With Trend",      position: "top"    },
        { dataIndex: 15, label: "Trend Target Achieved",         position: "bottom" }
      ]
    },

    quiz: {
      question: "The daily chart shows price trading below the Heuristics channel — confirming a bearish environment. On the 4-hour chart, price rallies back into the channel and a red dot appears. What does the red dot signal and what is the correct trade direction?",
      hint: "What does a red dot signal about the buyers currently pushing price up into the channel? Which direction is this exhaustion signal pointing?",
      style: "direction",
      answers: [
        { id: "a", text: "Short — the red dot signals buyer exhaustion at the channel resistance in a bearish HTF environment; buyers have pushed price up into the channel but are running out of steam; the correct trade is short in the direction of the bearish HTF bias",  correct: true,  type: "bearish" },
        { id: "b", text: "Long — the red dot at the channel means buyers are aggressive here; aggressive buying at the channel is a bullish signal regardless of the HTF environment",  correct: false, type: "bullish" },
        { id: "c", text: "No trade — a red dot below the daily channel is a conflicting signal that cancels out the HTF bearish bias; wait for all dots to align on all timeframes",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Below Channel on Daily + Red Dot on 4H — What Is the Trade?",
        type: "candlestick",
        cutIndex: 8,
        labels: ltLabels(16),
        ohlc: ltCandles(105, [
          { to: 97,  bars: 5 },
          { to: 102, bars: 3 },
          { to: 66,  bars: 8 }
        ], { seed: 239, wick: 0.4 }),
        markAreas: [
          { y0: 96, y1: 103, label: "Heuristics Channel", color: "rgba(255,46,136,0.07)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  6, label: "Rally into Channel",        position: "top",    color: "#ffcc00" },
        { dataIndex:  7, label: "Red Dot — Short Entry!",   position: "top",    color: "#ff2e88" },
        { dataIndex: 14, label: "Bearish Target Reached",   position: "bottom", color: "#ff2e88" }
      ],
      explanation: "The daily chart below the Heuristics channel establishes a <strong>bearish HTF bias</strong>. The 4H rally into the channel is a counter-trend move, not a trend change. When the red dot (buyer exhaustion) appears at the channel, it signals that the buyers pushing the counter-trend rally are running out of momentum — exactly when a short entry in the direction of the bearish HTF bias is justified. Never trade exhaustion dots against the established channel direction.",
      rule: "Heuristics: above channel = bullish bias + green dots = long entries. Below channel = bearish bias + red dots = short entries. Never trade dots against the channel direction. HTF channel = bias; LTF dot = entry trigger."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 15 — FSVZO — Volume Zone Oscillator
     Module 3 · Session 4
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 15,
    title: "FSVZO — Volume Zone Oscillator",
    tag: "Module 3 · Session 4",
    module: "Indicator Suite",
    videoUrl: "https://www.youtube.com/embed/Ioxmip6tjsQ",

    intro: {
      heading: "FSVZO — The Oscillator That Paints Divergences Directly on the Chart",
      body: "FSVZO (Volume Zone Oscillator) is a volume-based oscillator with one key advantage over traditional oscillators: it paints divergence signals directly on the price candle as it forms, eliminating the need for manual divergence identification. Regular divergences signal reversals; hidden divergences signal trend continuations.",
      bullets: [
        "Oscillates between overbought (+80) and oversold (-80) thresholds — both adjustable",
        "White Moving Average crosses the band boundaries to generate signals",
        "Red X's on candles: overbought signal (oscillator above +80) — watch for bearish reversal",
        "Green Arrows on candles: oversold signal (oscillator below -80) — watch for bullish reversal",
        "R painted on candle: Regular divergence — reversal signal",
        "H painted on candle: Hidden divergence — continuation signal",
        "Key advantage: divergences are painted ON the candle as it forms — no manual calculation required"
      ]
    },

    lesson: {
      heading: "Four Divergence Types — Reversal and Continuation Signals",
      body: "FSVZO identifies four divergence types, each with a specific implication. Regular divergences signal reversals; hidden divergences signal continuations. The R and H labels painted directly on the chart candle remove the subjectivity of manual divergence identification and provide clear, objective entry signals when combined with TA levels.",
      bullets: [
        "Regular Bullish Divergence (R): price makes a lower low; oscillator makes a higher low — reversal UP expected",
        "Regular Bearish Divergence (R): price makes a higher high; oscillator makes a lower high — reversal DOWN expected",
        "Hidden Bullish Divergence (H): price makes a higher low; oscillator makes a lower low — continuation UP",
        "Hidden Bearish Divergence (H): price makes a lower high; oscillator makes a higher high — continuation DOWN",
        "R at a TA DBS zone = regular bullish divergence confirms the reversal level — highest conviction long trigger",
        "H during an uptrend pullback = hidden bullish divergence confirms pullback is over — continuation long trigger",
        "Red/Green hues on the chart: potential profit-taking areas — do not add to position when hues are present"
      ]
    },

    introChart: {
      title: "FSVZO — Regular Bearish Divergence (R) at Price High",
      markLines: [ { yAxis: 108, label: "Price HH — Momentum Fades", color: "#ff2e88" }, { yAxis: 87, label: "Divergence Target", color: "#00d4d4" } ],
      type: "candlestick",
      indicator: "volume",
      chartHeight: 480,
      labels: ltLabels(16),
      ohlc: ltCandles(82, [
        { to: 108, bars: 8 },
        { to: 87,  bars: 8 }
      ], { seed: 240, wick: 0.4 }),
      markPoints: [
        { dataIndex:  7, label: "Price HH — Oscillator LH",   position: "top"    },
        { dataIndex:  7, label: "R = Reg Bearish Div",        position: "top"    },
        { dataIndex:  8, label: "Reversal Down Begins",       position: "top"    },
        { dataIndex: 15, label: "Divergence Target Hit",      position: "bottom" }
      ]
    },

    lessonChart: {
      title: "FSVZO — Hidden Bullish Divergence (H) During Uptrend Pullback",
      markLines: [ { yAxis: 94, label: "Continuation Entry", color: "#00d4d4" }, { yAxis: 91, label: "Stop — Below HL", color: "#ff2e88" }, { yAxis: 130, label: "Continuation Target", color: "#ffcc00" } ],
      type: "candlestick",
      indicator: "volume",
      chartHeight: 480,
      labels: ltLabels(16),
      ohlc: ltCandles(82, [
        { to: 99,  bars: 5 },
        { to: 93,  bars: 3 },
        { to: 130, bars: 8 }
      ], { seed: 241, wick: 0.4 }),
      markPoints: [
        { dataIndex:  4, label: "Pullback Starts",             position: "top"    },
        { dataIndex:  6, label: "H = Hidden Bull Div — HL",   position: "bottom" },
        { dataIndex:  7, label: "Continuation Entry",         position: "bottom" },
        { dataIndex: 15, label: "Uptrend Continues",          position: "top"    }
      ]
    },

    quiz: {
      question: "At a new price high on the chart, the FSVZO paints an 'R' label on the candle. At the same time you can see that while price made a higher high, the oscillator reading is a lower high than the prior peak. What has formed and what does it signal?",
      hint: "Price makes a higher high. Oscillator makes a lower high. Regular or hidden divergence? Reversal or continuation?",
      style: "choice",
      answers: [
        { id: "a", text: "Regular Bearish Divergence — price higher high with oscillator lower high signals momentum is fading even as price rises; the R label confirms a potential reversal downward is forming and longs should be cautious or begin taking profit",  correct: true,  type: "bearish" },
        { id: "b", text: "Hidden Bearish Divergence — price higher high with oscillator lower high is a hidden divergence signaling the downtrend will continue; the H label would appear instead of R if this were a reversal signal",  correct: false, type: "bullish" },
        { id: "c", text: "Regular Bullish Divergence — any divergence at a price high is bullish because it shows the oscillator is leading price and price will continue to rise to match the oscillator's reading",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Price Higher High + Oscillator Lower High + R Painted — What Formed?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(82, [
          { to: 110, bars: 9 },
          { to: 89,  bars: 6 }
        ], { seed: 242, wick: 0.4 })
      },
      revealMarkPoints: [
        { dataIndex:  4, label: "Prior High — Oscillator Peak",    position: "top",    color: "#ffcc00" },
        { dataIndex:  8, label: "R: Price HH / Osc LH = Reg Bear Div", position: "top", color: "#ff2e88" },
        { dataIndex:  9, label: "Reversal Down Begins",            position: "top",    color: "#ff2e88" },
        { dataIndex: 14, label: "Divergence Target Reached",       position: "bottom", color: "#00d4d4" }
      ],
      explanation: "Price making a <strong>higher high while the oscillator makes a lower high</strong> is the textbook definition of a <strong>Regular Bearish Divergence</strong>. The FSVZO confirms this with the <strong>R label</strong> painted directly on the candle — no manual calculation required. This signals that buying momentum is weakening even as price rises, and a reversal downward is probable. Regular divergences signal reversals. Hidden divergences (H label) signal continuations.",
      rule: "FSVZO R = Regular Divergence = Reversal signal. H = Hidden Divergence = Continuation signal. Regular Bearish: price HH + oscillator LH. Regular Bullish: price LL + oscillator HL. Signals painted directly on candles — no manual calculation needed."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 16 — Crayons
     Module 3 · Session 5
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 16,
    title: "Crayons",
    tag: "Module 3 · Session 5",
    module: "Indicator Suite",
    videoUrl: "https://www.youtube.com/embed/nwZR1qanLs0",

    intro: {
      heading: "Crayons — The Best of Trend Buddy and PAL in One Indicator",
      body: "Crayons is a hybrid indicator that combines the candle color system of Trend Buddy with the price action signal capability of the PAL Tool. It simultaneously identifies trend state via candle colors AND generates price action signals (W, H, B markers) while drawing dynamic S/R levels. It is the most information-dense single indicator in the suite.",
      bullets: [
        "Lime Green: strong uptrend detected — enter long with the trend",
        "Red: strong downtrend detected — enter short with the trend",
        "Gray: no discernible trend — do not trade directionally in gray candle periods",
        "Orange: bearish pivot — use candle high/low as S/R; take profit on longs",
        "Yellow: bullish exhaustion — buyers drying up; potential reversal or profit-taking zone",
        "Turquoise: bearish exhaustion — sellers drying up; potential reversal or addition zone",
        "Dark Green: bullish breakout in one candle; Purple: bearish breakdown in one candle"
      ]
    },

    lesson: {
      heading: "Crayons Special Signals — W, H, and B Markers",
      body: "In addition to the candle color system, Crayons paints three special markers: W (rejection from upside), H (potential local top), and B (confirmed reversal). The B signal is the most powerful — it represents a confirmed reversal with high probability of continuation. Combined with dynamic S/R levels, Crayons allows simultaneous identification of trend state, S/R flips, and entry triggers.",
      bullets: [
        "W marker: rejection from upside — potential profit taking on counter-trend longs; watch for reversal",
        "H marker: potential local top — not a confirmed reversal but a warning to tighten stops or reduce size",
        "B marker: confirmed reversal — high probability of continuation in the new direction; best Crayons entry trigger",
        "Levels input: Crayons draws dynamic S/R pivots from key formations — visible in real time as they develop",
        "S/R flip visible live: a level transitions from resistance to support on the chart as it happens",
        "Best combination: Crayons B signal at a pre-identified DBS zone = Crayons confirms the LTE setup",
        "Same no-standalone rule applies: Crayons is powerful as confluence; always pair with TA S/R levels"
      ]
    },

    introChart: {
      title: "Crayons Color Sequence — Lime Green Trend to Orange Pivot to Gray",
      markLines: [ { yAxis: 109, label: "Orange Pivot High — S/R", color: "#ff9f1a" } ],
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(80, [
        { to: 109, bars: 8 },
        { to: 103, bars: 5 },
        { to: 108, bars: 5 }
      ], { seed: 243, wick: 0.35 }),
      // Crayons colour system, candle-by-candle (matches the intro bullets + markPoints):
      // lime=uptrend · orange=bearish pivot · gray=no trend · turquoise=sellers dry · dark green=breakout
      candleColors: [
        "#9be84f","#9be84f","#9be84f","#9be84f","#9be84f","#9be84f","#9be84f",
        "#ff9f1a","#ff9f1a","#ff9f1a",
        "#8a8f99","#8a8f99","#8a8f99",
        "#1fd8c8","#1fd8c8",
        "#1f9d3a",
        "#9be84f","#9be84f"
      ],
      markPoints: [
        { dataIndex:  0, label: "Lime Green — Uptrend",     position: "bottom" },
        { dataIndex:  7, label: "Orange — Bearish Pivot; TP",position: "top"    },
        { dataIndex: 10, label: "Gray — No Trend; Wait",    position: "top"    },
        { dataIndex: 13, label: "Turquoise — Sellers Dry",  position: "bottom" },
        { dataIndex: 15, label: "B — Confirmed Reversal",   position: "bottom" },
        { dataIndex: 17, label: "Lime Green — New Uptrend", position: "top"    }
      ]
    },

    lessonChart: {
      title: "Crayons B Signal at DBS Zone — Confirmed Reversal Entry",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 78,  bars: 7 },
        { to: 78,  bars: 2 },
        { to: 120, bars: 7 }
      ], { seed: 244, wick: 0.4 }),
      // red=downtrend · gray=approaching DBS · turquoise=sellers dry · dark green=B reversal breakout · lime=new uptrend
      candleColors: [
        "#e23b3b","#e23b3b","#e23b3b","#e23b3b","#e23b3b","#e23b3b",
        "#8a8f99",
        "#1fd8c8",
        "#1f9d3a",
        "#9be84f","#9be84f","#9be84f","#9be84f","#9be84f","#9be84f","#9be84f"
      ],
      markLines: [ { yAxis: 82, label: "Entry — B Signal Long", color: "#00d4d4" }, { yAxis: 120, label: "Target", color: "#ffcc00" },
        { yAxis: 78, label: "DBS Zone (TA)", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  6, label: "Gray — Approaching DBS",   position: "bottom" },
        { dataIndex:  7, label: "Turquoise — Sellers Dry",  position: "bottom" },
        { dataIndex:  8, label: "B — Confirmed Reversal!",  position: "bottom" },
        { dataIndex:  9, label: "Lime Green — Long Entry",  position: "bottom" },
        { dataIndex: 15, label: "Target Achieved",          position: "top"    }
      ]
    },

    quiz: {
      question: "On a Crayons chart, a sequence of Lime Green candles transitions to an Orange candle. What does the Orange candle signal and what action should a long position holder take?",
      hint: "Orange in the Crayons system mirrors Orange in Trend Buddy. What does it indicate about the current trend's health? Is it an entry or an exit signal?",
      style: "choice",
      answers: [
        { id: "a", text: "Orange = Bearish Pivot — the candle high/low becomes a local S/R level; take profit on longs at minimum, tighten trailing stop, or reduce position size; do not add new longs at an Orange candle",  correct: true,  type: "bearish" },
        { id: "b", text: "Orange = Bullish Momentum signal — after a sequence of Lime Green candles, an Orange candle means the trend is accelerating and new long positions should be added at the Orange candle's close",  correct: false, type: "bullish" },
        { id: "c", text: "Orange = Trend reversal — Orange immediately signals the uptrend is over and shorts should be entered at the candle close with a stop above the candle high",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Lime Green Uptrend → Orange Candle. What Action for the Long?",
        type: "candlestick",
        cutIndex: 8,
        labels: ltLabels(16),
        ohlc: ltCandles(80, [
          { to: 110, bars: 8 },
          { to: 108, bars: 2 },
          { to: 95,  bars: 6 }
        ], { seed: 245, wick: 0.4 }),
        // lime=uptrend · orange=bearish pivot (the candle in question) · gray=trend weakening
        candleColors: [
          "#9be84f","#9be84f","#9be84f","#9be84f","#9be84f","#9be84f","#9be84f",
          "#ff9f1a","#ff9f1a",
          "#8a8f99","#8a8f99","#8a8f99","#8a8f99","#8a8f99","#8a8f99","#8a8f99"
        ]
      },
      revealMarkPoints: [ { dataIndex: 8, label: "Orange High = S/R / Stop", position: "bottom", color: "#ff9f1a" },
        { dataIndex:  0, label: "Lime Green Uptrend",      position: "bottom", color: "#9be84f" },
        { dataIndex:  7, label: "Orange Pivot — TP Longs!", position: "top",   color: "#ff9f1a" },
        { dataIndex:  9, label: "Gray — Trend Weakening",  position: "top",    color: "#8a8f99" }
      ],
      explanation: "An Orange candle on Crayons is a <strong>Bearish Pivot signal</strong>. It means the current upward trend is showing pivot behavior — not necessarily a full reversal, but enough of a warning to take profit, tighten trailing stops, or reduce long exposure. The candle's high and low become key S/R levels for stop placement. This is explicitly a profit-taking signal on existing longs, not an entry signal for either direction.",
      rule: "Crayons Orange = Bearish Pivot. Take profit on longs, tighten stops. Crayons Fuchsia = Bullish Pivot. Take profit on shorts, tighten stops. These are not reversal entry signals — they are position management signals."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 17 — Genie
     Module 3 · Session 6
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 17,
    title: "Genie",
    tag: "Module 3 · Session 6",
    module: "Indicator Suite",
    videoUrl: "https://www.youtube.com/embed/a3Aog1SdWxQ",

    intro: {
      heading: "Genie — Local Top and Bottom Identifier for Scalping",
      body: "Genie is designed to identify potential local tops and bottoms and generate momentum entry signals. It is the scalping specialist of the indicator suite — best suited for low timeframe momentum trades rather than swing entries. Red hues signal potential local tops; green hues signal potential local bottoms; colored arrows provide the entry trigger.",
      bullets: [
        "Red Hues: potential local top signal — watch for reversal or profit-taking from long positions",
        "Green Hues: potential local bottom signal — watch for reversal or entry opportunity for longs",
        "Red/Green Arrows: entry trigger signals (enabled via Show Early Trigger setting)",
        "Large lime green bars: strong bullish momentum direction identified",
        "Large red bars: strong bearish momentum direction identified",
        "Best for: scalping and low-timeframe momentum trades where local tops and bottoms matter",
        "Threshold setting (default 0.5) and MA type (HMA, EMA, SMA) are adjustable — experiment for your market"
      ]
    },

    lesson: {
      heading: "Using Genie for Scalp Entries — LTE Trigger Application",
      body: "Genie's arrows serve as the Execution component of the LTE framework for scalp trades. When price is at a key S/R level identified by TA and a Genie arrow fires — confirming the local top or bottom at exactly that level — the scalp entry is triggered. The adaptive filtering in Genie reduces false positives, but it must still always be paired with TA context.",
      bullets: [
        "Green hue at DBS zone + green arrow = scalp long entry trigger; stop below the recent swing low",
        "Red hue at SSR zone + red arrow = scalp short entry trigger; stop above the recent swing high",
        "Combine with Heuristics: if Heuristics shows green dot (seller exhaustion) AND Genie shows green hue = dual-indicator confirmation",
        "Combine with Crayons: Crayons Turquoise (seller exhaustion) + Genie green hue at DBS = three-indicator confluence",
        "Momentum direction: large lime green Genie bars during a move confirm buyers are dominant; large red bars confirm sellers",
        "Adaptive filtering: Genie adjusts its sensitivity based on recent volatility; it naturally reduces noise in choppy conditions",
        "Not for swing trades: Genie signals are short-lived; use them for scalps with defined 1–3 candle holding periods"
      ]
    },

    introChart: {
      title: "Genie — Green Hues at Local Bottom + Arrow Entry Signal",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(96, [
        { to: 80,  bars: 8 },
        { to: 115, bars: 8 }
      ], { seed: 246, wick: 0.4 }),
      // Genie: large red bars=bearish momentum · green hues=potential local bottom · large lime bars=bullish momentum
      candleColors: [
        "#e23b3b","#e23b3b","#e23b3b","#e23b3b",
        "#6fd99a","#6fd99a","#6fd99a","#6fd99a",
        "#9be84f","#9be84f","#9be84f","#9be84f","#9be84f","#9be84f","#9be84f","#9be84f"
      ],
      markLines: [ { yAxis: 78, label: "Stop — Below Swing Low", color: "#ff2e88" }, { yAxis: 115, label: "Scalp Target", color: "#ffcc00" },
        { yAxis: 80, label: "DBS Support Zone", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  4, label: "Green Hues — Local Bottom",   position: "bottom" },
        { dataIndex:  6, label: "Green Hues — Still Here",     position: "bottom" },
        { dataIndex:  7, label: "Green Arrow — Scalp Entry!",  position: "bottom" },
        { dataIndex: 11, label: "Large Lime Bars — Momentum",  position: "top"    },
        { dataIndex: 15, label: "Scalp Target Reached",        position: "top"    }
      ]
    },

    lessonChart: {
      title: "Genie — Red Hues at Local Top + Arrow Short Entry Signal",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(82, [
        { to: 104, bars: 8 },
        { to: 72,  bars: 8 }
      ], { seed: 247, wick: 0.4 }),
      // large lime bars=bullish momentum · red hues=potential local top · large red bars=bearish momentum
      candleColors: [
        "#9be84f","#9be84f","#9be84f","#9be84f","#9be84f","#9be84f",
        "#f08a8a","#f08a8a",
        "#e23b3b","#e23b3b","#e23b3b","#e23b3b","#e23b3b","#e23b3b","#e23b3b","#e23b3b"
      ],
      markLines: [ { yAxis: 106, label: "Stop — Above Swing High", color: "#ff2e88" }, { yAxis: 72, label: "Scalp Short Target", color: "#00d4d4" },
        { yAxis: 103, label: "SSR Resistance Zone", color: "#ff2e88" }
      ],
      markPoints: [
        { dataIndex:  6, label: "Red Hues — Local Top",        position: "top"    },
        { dataIndex:  7, label: "Red Arrow — Short Entry!",    position: "top"    },
        { dataIndex: 10, label: "Large Red Bars — Momentum",   position: "top"    },
        { dataIndex: 15, label: "Scalp Short Target",          position: "bottom" }
      ]
    },

    quiz: {
      question: "The Genie indicator begins showing red hues on the chart as price approaches a key SSR resistance level. A red arrow then fires. What do these signals indicate and what is the appropriate action?",
      hint: "What do red hues signal about price location relative to a potential local top? What does the arrow add to the red hues?",
      style: "direction",
      answers: [
        { id: "a", text: "Bearish — red hues indicate a potential local top forming at the SSR resistance; the red arrow fires as the early entry trigger; the appropriate action is a scalp short entry at the SSR with stop above the swing high and a short 1-3 candle holding target",  correct: true,  type: "bearish" },
        { id: "b", text: "Bullish — red hues and red arrows at resistance signal that buyers are aggressively pushing into resistance; this aggression is bullish and signals a breakout is forming above SSR",  correct: false, type: "bullish" },
        { id: "c", text: "Neutral — Genie hues alone are not sufficient to determine direction; a red hue can appear in both trending and ranging conditions and must be combined with Heuristics channel data before any trade can be considered",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Red Hues + Red Arrow at SSR Resistance — What Is the Signal?",
        type: "candlestick",
        cutIndex: 8,
        labels: ltLabels(16),
        ohlc: ltCandles(82, [
          { to: 104, bars: 8 },
          { to: 71,  bars: 8 }
        ], { seed: 248, wick: 0.4 }),
        // large lime bars=bullish momentum · red hues=potential local top (the candles in question) · large red bars=bearish momentum
        candleColors: [
          "#9be84f","#9be84f","#9be84f","#9be84f","#9be84f","#9be84f",
          "#f08a8a","#f08a8a",
          "#e23b3b","#e23b3b","#e23b3b","#e23b3b","#e23b3b","#e23b3b","#e23b3b","#e23b3b"
        ],
        markLines: [
          { yAxis: 103, label: "SSR Zone", color: "#ff2e88" }
        ]
      },
      revealMarkPoints: [ { dataIndex: 5, label: "Stop — Above Swing High", position: "top", color: "#ff2e88" },
        { dataIndex:  6, label: "Red Hues — Local Top Warning",  position: "top",    color: "#f08a8a" },
        { dataIndex:  7, label: "Red Arrow — Short Entry!",      position: "top",    color: "#e23b3b" },
        { dataIndex: 14, label: "Scalp Short Target Reached",    position: "bottom", color: "#00d4d4" }
      ],
      explanation: "Red hues on Genie signal a <strong>potential local top forming</strong> — price has entered a zone where Genie's adaptive algorithm identifies buyers as exhausted. The red arrow acts as the <strong>early trigger signal</strong> — the moment to enter the scalp short. At an SSR resistance level, this confluence (TA says resistance, Genie says buyer exhaustion and fires the trigger) is the full LTE framework applied with Genie as the Execution tool.",
      rule: "Genie red hues = potential local top; green hues = potential local bottom. Arrow = entry trigger. Best for scalps at pre-identified S/R levels. Combine with Heuristics and Crayons for multi-indicator confirmation at key levels."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 18 — Platform Overview — Hyblock Capital
     Module 4 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 18,
    title: "Hyblock Capital — Platform Overview",
    tag: "Module 4 · Session 1",
    module: "Applying Sentiment",
    videoUrl: "https://www.youtube.com/embed/T6aLiQQ1TAs",

    intro: {
      heading: "Hyblock Capital — Sentiment Analytics for Derivatives Traders",
      body: "Hyblock Capital is a specialized sentiment analytics platform for cryptocurrency derivatives traders. It aggregates real-time data from multiple major exchanges and presents it in five distinct tools, each revealing a different dimension of participant positioning. Integrated with TradingView, it allows chart analysis and sentiment data on the same screen simultaneously.",
      bullets: [
        "TradingView integration: full charting with Hyblock sentiment indicators overlaid on the same screen",
        "Multi-exchange data: combines BitMEX price data with Binance sentiment data for broader market view",
        "Tab 1 — Chart: TradingView charts with Hyblock proprietary indicators available as overlays",
        "Tab 2 — Trading Activity: funding rate, open interest, cumulative delta displayed over time",
        "Tab 3 — Liquidation Levels: predictive model of WHERE leveraged positions will be liquidated",
        "Tab 4 — Net Positions Heatmap: visual clusters of where longs and shorts entered and exited",
        "Tab 5 — Order Book Depth Analysis: real-time order book visualization"
      ]
    },

    lesson: {
      heading: "Five Tabs — Each Revealing a Different Layer of Market Structure",
      body: "The five Hyblock tabs collectively answer the core questions of Liquidity Theory and Sentiment Analysis: WHERE will price likely go next (Liquidation Levels), WHO is positioned there (Positions Heatmap), and HOW extreme is the imbalance (Trading Activity + Chart Indicators). Used together, they provide the most complete sentiment picture available for crypto derivatives traders.",
      bullets: [
        "Chart tab: apply Hyblock's proprietary indicators (CVD, Net Longs/Shorts, Cumulative Delta) on TradingView candles",
        "Trading Activity tab: select instrument + lookback period; overlay funding, OI, and delta simultaneously",
        "Liquidation Levels tab: see bubbles showing WHERE 25x, 50x, and 100x leveraged positions will be liquidated",
        "Positions Heatmap tab: three sub-views: Net Aggressive Long Positions, Net Aggressive Short Positions, Open Interest",
        "Order Book Depth tab: real-time visualization of resting buy and sell orders at each price level",
        "Workflow: Liquidation Levels first (WHERE), then Positions Heatmap (WHO), then Trading Activity (HOW extreme)",
        "Cross-reference everything with TradingView TA: does the Hyblock level align with your DBS or SSR zone?"
      ]
    },

    introChart: {
      title: "Hyblock Platform — Five Tabs Working Together at a Key Level",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 81,  bars: 9 },
        { to: 118, bars: 7 }
      ], { seed: 249, wick: 0.4 }),
      markLines: [ { yAxis: 118, label: "Target — Full Confluence", color: "#ffcc00" },
        { yAxis: 81, label: "DBS", color: "#00d4d4" }
      ],
      // Liq Levels: long-liquidation cluster just below the DBS (the swept magnet)
      liqCluster: { lines: [74, 77], label: "50x Long Liq Cluster", color: "#ffcc00" },
      // Heatmap: bright LONG cluster (green) — dense longs defending the DBS
      heatmap: [{ center: 84, halfHeight: 5, color: "255,190,40", peak: 0.55, cells: 7, label: "Heatmap: Bright Long Cluster" }],
      // Trading Activity: cumulative-delta sub-panel (all 4 SA bullish → delta turns up)
      tradingActivity: true,
      activityLabel: "Trading Activity — Cum Δ",
      markPoints: [
        { dataIndex:  9, label: "TA DBS + Three Hyblock Tools = Entry", position: "bottom", color: "#00d4d4" },
        { dataIndex: 15, label: "Full Confluence — Target Hit",         position: "top"    }
      ]
    },

    lessonChart: {
      title: "Hyblock Workflow — Liquidation Levels → Heatmap → Trading Activity",
      markLines: [ { yAxis: 82, label: "DBS Zone (TA)", color: "#00d4d4" } ],
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(98, [
        { to: 81,  bars: 8 },
        { to: 122, bars: 8 }
      ], { seed: 250, wick: 0.4 }),
      markPoints: [
        { dataIndex:  5, label: "Step 1: Liq Levels — WHERE",    position: "bottom" },
        { dataIndex:  6, label: "Step 2: Heatmap — WHO",         position: "bottom" },
        { dataIndex:  7, label: "Step 3: Trading Activity — HOW",position: "bottom" },
        { dataIndex:  8, label: "Step 4: TA Cross-Reference",    position: "bottom" },
        { dataIndex:  9, label: "Step 5: Execute Trade",         position: "bottom", color: "#00d4d4" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "On the Hyblock Capital platform, which tab shows a predictive model of the specific price levels where leveraged positions at 25x, 50x, and 100x will be forcibly liquidated?",
      hint: "Which tab directly addresses WHERE price is incentivized to move in order for larger players to source liquidity from forced position closures?",
      style: "choice",
      answers: [
        { id: "a", text: "Liquidation Levels tab — it displays bubbles at specific price levels showing where 25x, 50x, and 100x leveraged positions will be liquidated; larger bubbles indicate larger position sizes and therefore more significant liquidity pools",  correct: true,  type: "bullish" },
        { id: "b", text: "Net Positions Heatmap tab — it shows where longs and shorts entered their positions; the entry prices can be used to calculate approximate liquidation levels based on typical leverage assumptions",  correct: false, type: "bearish" },
        { id: "c", text: "Trading Activity tab — the cumulative long/short delta data includes liquidation events which appear as sharp spikes in the delta reading when positions are forcibly closed",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Which Hyblock Tab Shows Liquidation Levels as Price Targets?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(100, [
          { to: 77,  bars: 9 },
          { to: 116, bars: 6 }
        ], { seed: 251, wick: 0.4 }),
        markLines: [
          { yAxis: 77, label: "25x+50x Long Liquidation Cluster", color: "#ffcc00" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  8, label: "Price Reaches Liq Cluster",      position: "bottom", color: "#ffcc00" },
        { dataIndex:  9, label: "Longs Liquidated — Large Buy Fills",position: "bottom", color: "#00d4d4" },
        { dataIndex: 14, label: "Liq Level Was the Price Magnet", position: "top",    color: "#00d4d4" }
      ],
      explanation: "The <strong>Liquidation Levels tab</strong> on Hyblock Capital shows a predictive model of exactly where 25x, 50x, and 100x leveraged positions will be liquidated based on their entry prices and position sizes. Each bubble represents a potential liquidity pool for larger players — the liquidation events force buy or sell orders that larger participants use to fill their own positions. Larger bubbles = more significant liquidity = higher probability that price will reach that level.",
      rule: "Hyblock workflow: Liquidation Levels (WHERE the liquidity is) → Positions Heatmap (WHO is at risk) → Trading Activity (HOW extreme the imbalance is) → Cross-reference with TA → Execute. Always use all three Hyblock tools together."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 19 — Liquidation Levels
     Module 4 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 19,
    title: "Liquidation Levels",
    tag: "Module 4 · Session 2",
    module: "Applying Sentiment",
    videoUrl: "https://www.youtube.com/embed/EFGMS3idY1M",

    intro: {
      heading: "Liquidation Levels — Predictive Map of Forced Closure Prices",
      body: "The Liquidation Levels tool on Hyblock Capital displays the exact price levels where leveraged positions at different leverage multiples will be forcibly closed by the exchange. These liquidation clusters are price magnets — larger players intentionally engineer price moves to reach them, using the forced buy or sell orders as the liquidity they need to fill their own positions.",
      bullets: [
        "Liquidation price calculated from: entry price + position size + leverage multiple",
        "Bubble colors by leverage: 25x, 50x, and 100x each displayed in different colors",
        "Red dot = Short Entry Price (shorts entered here); bubble ABOVE = their liquidation price",
        "Green dot = Long Entry Price (longs entered here); bubble BELOW = their liquidation price",
        "Larger bubble = larger position size at that leverage = more significant liquidity pool at that level",
        "Higher leverage = liquidation price is CLOSER to the entry price = easier to reach",
        "Example: short entered at $6,800; 25x liquidation = ~$7,790; 50x liquidation = ~$7,711"
      ]
    },

    lesson: {
      heading: "Using Liquidation Levels as Price Targets",
      body: "The Liquidation Levels tool converts abstract knowledge — that larger players engineer price to reach stop clusters — into precise, quantifiable levels plotted directly on the chart. The workflow is simple: identify the significant liquidation clusters, note their price ranges, draw those levels on TradingView, and cross-reference with TA. When a liquidation cluster aligns with a DBS or SSR zone, the setup conviction rises substantially.",
      bullets: [
        "Workflow: Open Hyblock Liquidation Levels → identify significant 25x/50x/100x clusters → note price ranges → draw on TradingView chart",
        "Cross-reference with TA: does the liquidation level align with a DBS zone, SSR zone, Fibonacci level, or range extreme?",
        "When price approaches a large liquidation cluster: watch closely for direction signal — which way will it run from here?",
        "Large 50x long liquidation bubble below price: price is incentivized to sweep down to that level; if TA DBS zone aligns = high probability bounce",
        "Large 25x short liquidation bubble above price: price is incentivized to run up to that level; if TA SSR zone aligns = high probability reversal",
        "100x bubbles: closest to entry price; most reachable; indicate where the most highly leveraged (and most vulnerable) positions sit",
        "Not guarantees — they are predictions; price frequently reaches major clusters but is not obligated to"
      ]
    },

    introChart: {
      title: "Liquidation Level as Price Target — Large Bubble Below Price",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(100, [
        { to: 76,  bars: 12 },
        { to: 79,  bars: 2  },
        { to: 112, bars: 4  }
      ], { seed: 252, wick: 0.4 }),
      // Liquidation Levels tool: a dashed 50x long-liq ladder (the swept magnet below price)
      liqCluster: { lines: [74, 76, 78], label: "50x Long Liq Cluster", color: "#ffcc00" },
      markPoints: [
        { dataIndex:  0, label: "Price Above Liq Level",        position: "top"    },
        { dataIndex:  9, label: "Approaching Liq Cluster",      position: "bottom" },
        { dataIndex: 11, label: "Liq Level Hit — Longs Forced!", position: "bottom" },
        { dataIndex: 12, label: "Large Buy + Reversal",         position: "bottom" },
        { dataIndex: 17, label: "Target Achieved",              position: "top"    }
      ]
    },

    lessonChart: {
      title: "Liquidation Level Cross-Referenced with TA DBS Zone",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(98, [
        { to: 78,  bars: 8 },
        { to: 78,  bars: 1 },
        { to: 120, bars: 7 }
      ], { seed: 253, wick: 0.4 }),
      markLines: [ { yAxis: 118, label: "Target / TP", color: "#00d4d4" },
        { yAxis: 78, label: "DBS Zone (TA)", color: "#00d4d4" }
      ],
      // Gold flat line upgraded to a dashed 50x liq ladder, sitting just under the teal DBS
      liqCluster: { lines: [74, 76, 78], label: "50x Liq Cluster (Hyblock)", color: "#ffcc00" },
      markPoints: [
        { dataIndex:  6, label: "DBS + 50x Liq Level — Alignment!", position: "bottom" },
        { dataIndex:  7, label: "Double Confluence — Max Target",    position: "bottom" },
        { dataIndex:  8, label: "Long Entry — TA + Hyblock",        position: "bottom" },
        { dataIndex: 15, label: "Conviction Paid Off",               position: "top"    }
      ]
    },

    quiz: {
      question: "A large 50x long liquidation bubble sits $400 below the current price on the Hyblock Liquidation Levels tool. This level also aligns with a key DBS support zone on the TradingView chart. How should a trader use this information?",
      hint: "What does the liquidation cluster represent in terms of liquidity? What does the DBS zone alignment add to the setup? What is the expected directional outcome when price reaches both levels simultaneously?",
      style: "choice",
      answers: [
        { id: "a", text: "Mark the liquidation level on the TradingView chart; when price sweeps down to the 50x long liquidation zone and reaches the DBS zone simultaneously, look for a long entry — the forced closures from liquidated longs create buying pressure that larger players use, and the TA DBS zone confirms structural support at the same level",  correct: true,  type: "bullish" },
        { id: "b", text: "The liquidation bubble below price is exclusively bearish — it means shorts are positioned there and the liquidation event will cause downward selling pressure when price reaches it",  correct: false, type: "bearish" },
        { id: "c", text: "Liquidation levels are only useful as stop loss placement guides; they should not be used as entry targets because price reaching a liquidation level signals that the losing side was correct all along",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "50x Long Liquidation Cluster + DBS Zone — How to Use This?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(100, [
          { to: 78,  bars: 9 },
          { to: 107, bars: 6 }
        ], { seed: 254, wick: 0.4 }),
        markLines: [
          { yAxis: 78, label: "DBS Zone (TA)", color: "#00d4d4" }
        ],
        liqCluster: { lines: [74, 76, 78], label: "50x Long Liq Cluster", color: "#ffcc00" }
      },
      revealMarkPoints: [
        { dataIndex:  8, label: "DBS + 50x Liq = Sweep Zone",    position: "bottom", color: "#ffcc00" },
        { dataIndex:  9, label: "Long Entry — TA + Hyblock",     position: "bottom", color: "#00d4d4" },
        { dataIndex: 14, label: "Conviction Setup Worked",       position: "top",    color: "#00d4d4" }
      ],
      explanation: "A 50x long liquidation bubble means there is a large cluster of long positions that will be forcibly closed when price reaches that level. Those forced closures generate sell orders — which a larger buyer can accumulate against. When this liquidation level aligns with a <strong>DBS zone from TA</strong>, you have two independent frameworks pointing to the same price as significant: Hyblock says 'liquidity pool here' and TA says 'structural demand here.' The combination produces a high-conviction long entry after the sweep.",
      rule: "Liquidation levels are price magnets for larger players sourcing liquidity. When a liquidation cluster aligns with a TA DBS or SSR zone, conviction rises substantially. Mark liquidation levels on TradingView — when price reaches both simultaneously, the setup is at maximum strength."
    }
  },


  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 20 — Liquidation Level Scenario — Live Walkthrough
     Module 4 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 20,
    title: "Liquidation Level Scenario — Live Walkthrough",
    tag: "Module 4 · Session 3",
    module: "Applying Sentiment",
    videoUrl: "https://www.youtube.com/embed/x7cvT7vxE2M",

    intro: {
      heading: "Applying Liquidation Level Analysis in a Real Trade",
      body: "This chapter walks through a complete live example of identifying and trading from Hyblock liquidation levels. The process: open Hyblock, identify significant clusters, plot them on TradingView, cross-reference with TA, and wait for price to reach the level before executing. The result is not just marking lines — it is understanding WHY price reacted at each specific level.",
      bullets: [
        "Step 1: Open Hyblock Liquidation Levels; identify clusters of 25x, 50x, 100x longs and shorts",
        "Step 2: Note the price ranges of each significant cluster",
        "Step 3: Draw those exact levels on TradingView as horizontal lines",
        "Step 4: Cross-reference with TA — do they align with DBS, SSR, range extremes, or Fibonacci levels?",
        "Step 5: When price approaches those levels, watch for direction signal and execute accordingly",
        "Real example: 50x long liq at $6,307; 25x long liq at $6,180; short clusters at $6,346 = complete liquidity map"
      ]
    },

    lesson: {
      heading: "Live Result — Not Just Lines, But Understanding WHY Price Went There",
      body: "The power of the liquidation level workflow reveals itself in hindsight: price traveled from the DBS zone directly to the 50x long liquidation level, bounced, then ran to the short cluster at the SSR zone — exactly as the liquidity map predicted. This is not coincidence. It is the mechanics of larger players sourcing liquidity at each cluster, which the Hyblock tool made visible in advance.",
      bullets: [
        "Price ran below Range Low (deviation/liquidity pool) → hit 50x long liquidation zone → immediate bounce",
        "Then hit 25x long liquidation zone → another bounce from DBS zone alignment",
        "Then short cluster at $6,346 was squeezed → price ran back to SSR/breakdown zone",
        "Key insight: the trade was not just TA — it was understanding WHY price bounced at each exact level",
        "Rule of Fives triggered at Range Low before the move → anticipated the deviation before plotting liquidation levels",
        "Post-trade analysis: every reaction point had a Hyblock explanation — the framework provides the WHY that TA alone cannot",
        "This process converts a trader from 'marking lines' to understanding the full causal chain behind each price reaction"
      ]
    },

    introChart: {
      title: "Liquidation Map — Price Sweeps to 50x Liq Zone Then Squeezes Short Cluster",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(98, [
        { to: 84,  bars: 7 },
        { to: 82,  bars: 2 },
        { to: 82,  bars: 1, reject: 3 },
        { to: 93,  bars: 1 },
        { to: 91,  bars: 3 },
        { to: 105, bars: 4 }
      ], { seed: 255, wick: 0.4 }),
      markLines: [ { yAxis: 84, label: "25x Long Liq Level", color: "#ffcc00" },
        { yAxis: 85, label: "Range Low / DBS Zone", color: "#00d4d4" },
        { yAxis: 98, label: "SSR / Short Cluster",  color: "#ff2e88" }
      ],
      // 50x long-liq ladder (dashed gold) just under the range low — the deviation magnet
      liqCluster: { lines: [81, 83], label: "50x Long Liq Level", color: "#ffcc00" },
      markPoints: [
        { dataIndex:  7, label: "Rule of Fives at Range Low",     position: "bottom" },
        { dataIndex:  9, label: "Deviation — 50x Liq Hit",        position: "bottom" },
        { dataIndex: 10, label: "Bounce — Large Buy at Liq Zone",  position: "bottom" },
        { dataIndex: 14, label: "Short Cluster Being Squeezed",    position: "top"    },
        { dataIndex: 17, label: "SSR — Short Cluster Reached",     position: "top"    }
      ]
    },

    lessonChart: {
      title: "WHY Price Reacted — Hyblock Explains Every Bounce",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(97, [
        { to: 83,  bars: 7 },
        { to: 83,  bars: 1 },
        { to: 95,  bars: 4 },
        { to: 113, bars: 4 }
      ], { seed: 256, wick: 0.4 }),
      markLines: [ { yAxis: 85, label: "Range Low (Liquidity Pool)", color: "#00d4d4" },
        { yAxis: 95, label: "25x Short Liq + SSR",color: "#ff2e88" }
      ],
      // Dashed 50x long-liq ladder at the DBS bounce level
      liqCluster: { lines: [81, 83], label: "50x Long Liq + DBS", color: "#ffcc00" },
      markPoints: [
        { dataIndex:  6, label: "50x Liq + DBS: Bounce WHY!",  position: "bottom" },
        { dataIndex:  7, label: "Large Buy Fills at Liq Level", position: "bottom" },
        { dataIndex:  9, label: "25x Short Liq: Squeeze WHY!", position: "top"    },
        { dataIndex: 15, label: "Full Liquidity Journey Done", position: "top"    }
      ]
    },

    quiz: {
      question: "In a live Hyblock walkthrough, price deviates below the Range Low into a 50x long liquidation zone, then immediately reverses sharply upward. According to the Liquidation Level and Liquidity Theory frameworks, what just happened and why?",
      hint: "Who was at the 50x long liquidation zone? What happened to those positions? Who used those forced closures to fill their own position?",
      style: "direction",
      answers: [
        { id: "a", text: "Bullish — price swept the 50x long liquidation cluster forcing those longs to be closed; the resulting sell orders from forced closures provided the liquidity a larger buyer needed to fill their long position at that level; the sharp reversal is the larger buyer now pushing price upward",  correct: true,  type: "bullish" },
        { id: "b", text: "Bearish — the deviation below Range Low into the liquidation zone confirms a true breakdown; the snap-back is a temporary dead-cat bounce before price continues lower to the next liquidation cluster",  correct: false, type: "bearish" },
        { id: "c", text: "Neutral — the bounce at the liquidation level is random market noise; liquidation levels are theoretical calculations and real market prices do not consistently react at them",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Range Low Deviation into 50x Liq Zone — Then Immediate Reversal. Why?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(97, [
          { to: 84,  bars: 8 },
          { to: 80,  bars: 2, reject: 3 },
          { to: 117, bars: 5 }
        ], { seed: 257, wick: 0.4 }),
        markLines: [
          { yAxis: 85, label: "Range Low", color: "#00d4d4" }
        ],
        liqCluster: { lines: [79, 81], label: "50x Long Liq Cluster", color: "#ffcc00" }
      },
      revealMarkPoints: [
        { dataIndex:  8, label: "Approaching Liq Zone",         position: "bottom", color: "#ffcc00" },
        { dataIndex:  9, label: "50x Liq Hit — Longs Forced!",  position: "bottom", color: "#00d4d4" },
        { dataIndex: 10, label: "Large Buy Fills + Reversal",   position: "bottom", color: "#00d4d4" },
        { dataIndex: 14, label: "Short Cluster Next Target",    position: "top",    color: "#00d4d4" }
      ],
      explanation: "The 50x long liquidation zone is where a cluster of 50x-leveraged long positions have their mandatory closure price. When price sweeps to that level, those positions are <strong>forcibly closed by the exchange</strong>, generating sell orders. A larger player positioned to buy uses those forced sell orders as liquidity to fill their long position at an optimal price. The immediate sharp reversal is the larger buyer now holding a full long position and pushing price upward. This is Liquidity Theory and Hyblock data working together to explain the exact causal chain.",
      rule: "Liquidation level sweep = forced closure of leveraged positions = liquidity for larger players to fill their own position. The reversal from a liquidation cluster is not random — it is the larger player, now filled, pushing price in their intended direction."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 21 — Positions Heatmap
     Module 4 · Session 4
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 21,
    title: "Positions Heatmap",
    tag: "Module 4 · Session 4",
    module: "Applying Sentiment",
    videoUrl: "https://www.youtube.com/embed/78I9CCMT1Lg",

    intro: {
      heading: "Positions Heatmap — Visual Map of Where Positions Entered and Exited",
      body: "The Positions Heatmap is a visual representation of where net aggressive longs and shorts entered and exited the market. Similar to a volume profile, it shows the price level concentration of participant activity — but instead of volume, it tracks position entries and closures. Bright colors mean heavy positioning activity; dark colors mean closures.",
      bullets: [
        "Brighter color = more positions opening at that price level (more entries than exits)",
        "Darker color = positions closing at that price level (more exits than entries)",
        "Bright Yellow: maximum position opening — most entries concentrated at this price",
        "Dark Purple: maximum position closing — most exits concentrated at this price",
        "Three sub-heatmaps: Net Aggressive Long Positions, Net Aggressive Short Positions, Open Interest Positions",
        "Bright yellow on Long heatmap: large cluster of longs entered here — potential stop cluster (sweepable)",
        "Bright yellow on Short heatmap: large cluster of shorts entered here — potential stop cluster (squeezable)"
      ]
    },

    lesson: {
      heading: "Using Heatmap Clusters as Liquidity Targets",
      body: "Bright heatmap clusters are the positions heatmap's equivalent of the liquidity pools from Liquidity Theory. A bright yellow cluster on the Net Aggressive Long heatmap shows exactly where longs entered — if price drops back to that level, those longs will be squeezed or stopped. A bright yellow cluster on the Short heatmap shows where shorts entered — if price rises to that level, those shorts get squeezed.",
      bullets: [
        "Long heatmap bright cluster below current price: potential short squeeze fuel if price falls there; also a potential buying support level",
        "Short heatmap bright cluster above current price: potential short squeeze if price rises there; shorts will be forced to close",
        "These clusters are the real-world counterpart of the Liquidity Theory 'stop cluster' concept — now you can see exactly WHERE they are",
        "Process: identify bright clusters → note price levels → mark on TradingView chart → cross-reference with TA levels",
        "Historical sub-heatmap: can view positioning at different past dates to understand how the market structure evolved",
        "Combining with Liquidation Levels: if the bright cluster on the Long heatmap aligns with a 50x long liquidation level, that is double confirmation of the same price as a high-probability sweep target",
        "Keyword: Spot the blocks, plot the blocks — identify the clusters, mark them on chart, trade the reaction"
      ]
    },

    introChart: {
      title: "Bright Long Cluster Below Current Price — Liquidity Target Identified",
      markLines: [ { yAxis: 84, label: "Long Cluster — Support / Sweep Target", color: "#00d4d4" } ],
      type: "candlestick",
      chartHeight: 400,
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 84,  bars: 8 },
        { to: 84,  bars: 2 },
        { to: 114, bars: 6 }
      ], { seed: 258, wick: 0.4 }),
      // Positions Heatmap: a real gradient heatmap — bright LONG cluster (green) below
      // price = the liquidity target price gets drawn back to.
      heatmap: [{ center: 84, halfHeight: 6, color: "255,190,40", peak: 0.62, cells: 9, label: "Heatmap: Bright Long Cluster" }],
      markPoints: [
        { dataIndex:  0, label: "Current Price Above Cluster",    position: "top"    },
        { dataIndex:  8, label: "Cluster: Longs Squeezed/Stopped",position: "bottom" },
        { dataIndex:  9, label: "Reversal — Large Buy Fills",     position: "bottom" },
        { dataIndex: 15, label: "Trade Completes",               position: "top"    }
      ]
    },

    lessonChart: {
      title: "Spot the Blocks + Plot the Blocks — Heatmap to TradingView Workflow",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(98, [
        { to: 82,  bars: 8 },
        { to: 82,  bars: 1 },
        { to: 122, bars: 7 }
      ], { seed: 259, wick: 0.4 }),
      markLines: [ { yAxis: 122, label: "Squeeze Target — Trade the Reaction", color: "#ffcc00" },
        { yAxis: 82, label: "Heatmap Short Cluster (Plotted on TradingView)", color: "#ff2e88" }
      ],
      markPoints: [
        { dataIndex:  6, label: "Step 1: Spot — Bright Short Cluster", position: "bottom" },
        { dataIndex:  7, label: "Step 2: Plot — Draw Level on TV Chart", position: "bottom" },
        { dataIndex:  8, label: "Step 3: Trade — Bounce at Short Cluster",position: "bottom" },
        { dataIndex: 15, label: "Short Cluster Squeezed",              position: "top"    }
      ]
    },

    quiz: {
      question: "On the Hyblock Positions Heatmap, a bright yellow cluster appears on the Net Aggressive Short Positions sub-heatmap at a price level $300 above current price. What does this cluster indicate and what is the likely trade if price approaches that level?",
      hint: "Bright yellow on the SHORT heatmap means shorts entered heavily there. What happens to those shorts if price rises to that level?",
      style: "choice",
      answers: [
        { id: "a", text: "This is a short block — heavy short positioning entered at that price level; if price rises to that cluster, those shorts will be squeezed or stopped out, providing upward buying pressure that makes the level a potential target for a long trade or a short-squeeze continuation",  correct: true,  type: "bullish" },
        { id: "b", text: "This is a long block — bright yellow on any sub-heatmap always represents long positions regardless of which sub-heatmap is displayed; the cluster above price is a strong resistance zone",  correct: false, type: "bearish" },
        { id: "c", text: "The bright yellow cluster is a neutral signal — it only indicates high trading activity at that price, not whether longs or shorts are concentrated there; the sub-heatmap label does not change the interpretation",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Bright Short Cluster Above Price on Heatmap — Trade Implication?",
        type: "candlestick",
        chartHeight: 400,
        cutIndex: 8,
        labels: ltLabels(15),
        ohlc: ltCandles(82, [
          { to: 101, bars: 8 },
          { to: 113, bars: 4 },
          { to: 119, bars: 3 }
        ], { seed: 260, wick: 0.35 }),
        markLines: [
          { yAxis: 110, label: "Bright Short Cluster (Heatmap)", color: "#ff2e88" }
        ],
        heatmap: [{ center: 110, halfHeight: 4, color: "255,190,40", peak: 0.6, cells: 7, label: "Heatmap: Bright Short Cluster" }]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "Price Below Short Cluster",      position: "top",    color: "#ffcc00" },
        { dataIndex: 10, label: "Approaching Short Cluster",      position: "top",    color: "#ffcc00" },
        { dataIndex: 12, label: "Short Cluster: Shorts Squeezed!",position: "top",    color: "#ff2e88" },
        { dataIndex: 14, label: "Long Continuation — Post Squeeze",position: "top",   color: "#00d4d4" }
      ],
      explanation: "A bright yellow cluster on the <strong>Net Aggressive Short Positions sub-heatmap</strong> specifically indicates that short sellers entered heavily at that price level. When price rises to that cluster, those short positions face potential forced closure (if near liquidation) or stop-loss triggers. The resulting buy orders from those forced closures create upward momentum — the classic short squeeze. This heatmap cluster is the visual confirmation of a liquidity pool that the Liquidation Levels tool and Liquidity Theory both predict.",
      rule: "Bright cluster on Long heatmap = long block = sweep target if price falls there. Bright cluster on Short heatmap = short block = squeeze target if price rises there. Spot the blocks, plot the blocks, trade the reaction."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 22 — Combining Sentiment Data
     Module 4 · Session 5
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 22,
    title: "Combining Sentiment Data",
    tag: "Module 4 · Session 5",
    module: "Applying Sentiment",
    videoUrl: "https://www.youtube.com/embed/m05al1Yd598",

    intro: {
      heading: "Spot the Blocks, Plot the Blocks — The Full Combination Process",
      body: "The maximum expression of the Hyblock framework is the combination of all three tools in a single setup: Liquidation Levels (WHERE the liquidity is), Positions Heatmap (WHO is at risk), and TA cross-reference (confirming the level's structural significance). When all three point to the same price, conviction is at its peak and execution is straightforward.",
      bullets: [
        "Step 1 — Positions Heatmap: identify bright clusters of longs or shorts at specific price levels",
        "Step 2 — Liquidation Levels: check if 25x/50x/100x liquidation prices sit near those cluster levels",
        "Step 3 — Mark on chart: draw horizontal lines at each identified level on TradingView",
        "Step 4 — Cross-reference with TA: does each line align with a DBS zone, SSR zone, range extreme, or Fibonacci level?",
        "Step 5 — Build the trade: entry, stop, and target all defined using TA structure with Hyblock levels as additional confluence",
        "The phrase: Spot the blocks (heatmap + liq levels) → Plot the blocks (draw on TradingView) → Trade the reaction"
      ]
    },

    lesson: {
      heading: "Live Example — Short Squeeze Setup with Full Three-Tool Confluence",
      body: "A real example demonstrates the power of full combination: a bright short cluster on the heatmap at $6,370 + 25x short liquidation levels at approximately $6,300 + Fibonacci retracement + prior structure all aligned at the same price zone. The result was a textbook short squeeze from that level that validated all four data points simultaneously.",
      bullets: [
        "Heatmap: bright short cluster at $6,370 (shorts entered here) → potential squeeze target",
        "Liquidation Levels: 25x short liquidations at ~$6,300 → nearby cluster adds to the congestion",
        "Chart: $6,346 = Fibonacci confluence + midpoint + prior structure = three TA confirmations",
        "Entry: long from DBS zone below (range low deviation) with target at $6,370 short cluster",
        "Result: price traveled from DBS deviation zone straight to the short cluster and squeezed through it",
        "Post-analysis: the Fibonacci, the heatmap cluster, and the liquidation level all explained WHY price went exactly to that level",
        "This is the complete framework: TA tells you where, Hyblock tells you who and why, SA tells you when"
      ]
    },

    introChart: {
      title: "Triple Confluence — Short Cluster + Liq Level + Fibonacci All at Same Price",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(85, [
        { to: 79,  bars: 4 },
        { to: 101, bars: 5 },
        { to: 105, bars: 3 },
        { to: 96,  bars: 4 }
      ], { seed: 261, wick: 0.4 }),
      markLines: [
        { yAxis: 79, label: "DBS Zone — Entry (Range Low Dev)", color: "#00d4d4" },
        { yAxis: 104, label: "Short Cluster + 25x Liq + Fib = Target", color: "#ff2e88" }
      ],
      // Positions Heatmap: the bright short cluster at the target — what price gets pulled toward
      heatmap: [{ center: 104, halfHeight: 4, color: "255,190,40", peak: 0.6, cells: 7, label: "Heatmap: Short Cluster" }],
      markPoints: [
        { dataIndex:  3, label: "DBS Entry — All Tools Say Long",  position: "bottom" },
        { dataIndex:  7, label: "Progress — Midpoint Crossed",     position: "top"    },
        { dataIndex: 12, label: "Target: Short Cluster Reached!",  position: "top"    },
        { dataIndex: 13, label: "Short Squeeze — Longs Win",       position: "top"    }
      ]
    },

    lessonChart: {
      title: "Four Data Points Validating the Same Price — Maximum Confluence",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(84, [
        { to: 78,  bars: 4 },
        { to: 100, bars: 5 },
        { to: 107, bars: 3 },
        { to: 93,  bars: 4 }
      ], { seed: 262, wick: 0.4 }),
      markLines: [ { yAxis: 101, label: "25x Short Liq — ~$6,300", color: "#ffcc00" }, { yAxis: 103, label: "Fib + Midpoint + Structure — $6,346", color: "#ffcc00" },
        { yAxis: 78, label: "Entry: DBS + Heatmap Long Cluster", color: "#00d4d4" },
        { yAxis: 106, label: "Target: Short Cluster + Liq + Fib + SSR", color: "#ff2e88" }
      ],
      // Two bright heatmap blocks: the long-cluster entry below + the short-cluster target above
      heatmap: [
        { center: 78,  halfHeight: 3.5, color: "255,190,40", peak: 0.55, cells: 6, label: "Long Cluster" },
        { center: 106, halfHeight: 3.5, color: "255,190,40", peak: 0.6,  cells: 6, label: "Short Cluster" }
      ],
      markPoints: [
        { dataIndex:  3, label: "Step 1: DBS + Long Block = Entry",  position: "bottom" },
        { dataIndex:  7, label: "Step 2: Progress Confirmed",        position: "top"    },
        { dataIndex: 11, label: "Step 3: Short Block + Liq = Target",position: "top"    }
      ]
    },

    quiz: {
      question: "A bright short cluster on the heatmap at $6,370, 25x short liquidation levels at $6,300, and Fibonacci retracement all converge at the same price zone. Price is currently at $6,000 at a DBS zone. What is the complete trade setup using the full Hyblock framework?",
      hint: "What is the entry level, what is the target level, and what provides conviction for each? Who will be squeezed as price moves from entry to target?",
      style: "direction",
      answers: [
        { id: "a", text: "Long from the DBS zone at $6,000 with target at the short cluster convergence zone around $6,300-$6,370; the TA provides the entry (DBS zone), the heatmap provides the target (short cluster), the liquidation levels add precision, and the Fibonacci confirms the zone; the shorts at $6,370 will be squeezed fueling momentum to target",  correct: true,  type: "bullish" },
        { id: "b", text: "Short from the $6,370 short cluster targeting the $6,000 DBS zone; the bright short cluster is resistance and the convergence of multiple tools there confirms sellers are defending that level strongly",  correct: false, type: "bearish" },
        { id: "c", text: "No trade — too many tools pointing to the same level creates false confidence; the highest probability setup requires conflicting data to filter out the signal",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "DBS at $6,000 + Short Cluster at $6,370 — What Is the Full Setup?",
        type: "candlestick",
        cutIndex: 8,
        labels: ltLabels(15),
        ohlc: ltCandles(88, [
          { to: 79,  bars: 8 },
          { to: 108, bars: 7 }
        ], { seed: 263, wick: 0.4 }),
        markLines: [
          { yAxis: 79, label: "DBS Zone — Entry", color: "#00d4d4" },
          { yAxis: 106, label: "Short Cluster + Liq + Fib — Target", color: "#ff2e88" }
        ],
        heatmap: [{ center: 106, halfHeight: 4, color: "255,190,40", peak: 0.6, cells: 7, label: "Heatmap: Short Cluster" }]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "Long Entry at DBS",             position: "bottom", color: "#00d4d4" },
        { dataIndex:  9, label: "Midpoint Crossed — Confident",  position: "top",    color: "#ffcc00" },
        { dataIndex: 14, label: "Target: Short Cluster Squeezed!",position: "top",   color: "#00d4d4" }
      ],
      explanation: "The complete Hyblock framework setup: <strong>Entry at DBS zone</strong> ($6,000) — TA provides structural support. <strong>Target at short cluster convergence</strong> ($6,300-$6,370) — heatmap bright short cluster + 25x short liquidation level + Fibonacci all independently identify the same zone as the destination. The trade logic: longs enter at the DBS where structural demand exists, price travels to the short cluster zone, the shorts there are squeezed driving further upward momentum, and the liquidations from the 25x short positions provide additional fuel.",
      rule: "Spot the blocks (heatmap clusters + liquidation levels). Plot the blocks (draw on TradingView). Trade the reaction (entry at TA level, target at block convergence). Maximum confluence = heatmap + liq levels + Fibonacci + TA structure all at same price."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 23 — Trading Activity
     Module 4 · Session 6
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 23,
    title: "Trading Activity",
    tag: "Module 4 · Session 6",
    module: "Applying Sentiment",
    videoUrl: "https://www.youtube.com/embed/WUEtl6fDJR8",

    intro: {
      heading: "Trading Activity Tab — Real-Time Sentiment Variable Dashboard",
      body: "The Trading Activity tab on Hyblock Capital is a configurable dashboard that displays the four sentiment analysis variables — cumulative delta, open interest, funding rate, and position curves — over a chosen time period. It is the practical interface for the sentiment analysis theory covered in Module 2, displaying all four variables simultaneously for the instruments and lookback periods you choose.",
      bullets: [
        "Choose instrument: XBTUSD, ETHUSD, futures contracts",
        "Choose lookback period in hours: customize to your trading timeframe",
        "Overlay multiple indicators simultaneously for maximum coverage",
        "Cumulative Long/Short Delta: which side is growing faster over the period",
        "Cumulative Longs vs Shorts: separate curves showing each side's absolute growth or decline",
        "Open Interest vs Price: confirm trend strength or identify dangerous divergences",
        "Funding Rate: see current and historical funding over the chosen lookback period"
      ]
    },

    lesson: {
      heading: "Three-Tool Maximum Conviction Setup — Liq Levels + Heatmap + Trading Activity",
      body: "The maximum conviction setup in Module 4 combines all three Hyblock tools simultaneously. Liquidation Levels identifies WHERE the liquidity is. The Positions Heatmap identifies WHICH SIDE is at risk. The Trading Activity tab confirms HOW EXTREME the imbalance is and from which direction the pressure is coming. When all three independently agree, conviction is at its peak.",
      bullets: [
        "Liquidation Levels: WHERE — which price level is the most likely target based on leveraged position concentrations",
        "Positions Heatmap: WHO — which side (longs or shorts) is concentrated at that level and vulnerable to being swept",
        "Trading Activity: HOW EXTREME — funding, OI, and delta readings confirming the imbalance magnitude",
        "Example maximum conviction: very red delta + rising shorts in cumulative curves + extreme negative funding + DBS zone = short squeeze at maximum conviction",
        "Trading Activity lookback tip: use 24-hour lookback for day trading setups; 72-hour for swing trades",
        "Most powerful signal: all four SA variables on Trading Activity tab aligning in the same direction at the same time as a key TA level is approached",
        "Do not enter unless at least two of the three Hyblock tools confirm — single-tool confirmation reduces conviction to normal TA levels"
      ]
    },

    introChart: {
      title: "Three-Tool Confluence — Very Red Delta + Shorts Rising + Neg Funding at DBS",
      type: "candlestick",
      chartHeight: 460,
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 75,  bars: 10 },
        { to: 118, bars: 6 }
      ], { seed: 264, wick: 0.4 }),
      markLines: [
        { yAxis: 75, label: "DBS Zone", color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 72, y1: 78, label: "Max Conviction (DBS)", color: "rgba(0,212,212,0.08)" }
      ],
      // Tool 1 — Liq Levels: short-liquidation cluster above price = the squeeze magnet
      liqCluster: { lines: [104, 109, 114], label: "50x Short Liq Cluster", color: "#ffcc00" },
      // Tool 2 — Heatmap: a bright block of resting short orders the squeeze runs through
      heatmap: [{ center: 92, halfHeight: 6, color: "255,190,40", peak: 0.6, cells: 8, label: "Heatmap: Bright Short Block" }],
      // Tool 3 — Trading Activity: cumulative-delta sub-panel (very red, flips on the squeeze)
      tradingActivity: true,
      activityLabel: "Trading Activity — Cum Δ",
      markPoints: [
        { dataIndex:  9, label: "All Three Tools Agree at DBS",  position: "bottom", color: "#00d4d4" },
        { dataIndex: 15, label: "Short Squeeze — Liqs Cascade",  position: "top"    }
      ]
    },

    lessonChart: {
      title: "Trading Activity — Very Red Delta + Shorts Rising = Shorts Off-Sides",
      markAreas: [ { y0: 76, y1: 80, label: "DBS Support Zone", color: "rgba(0,212,212,0.07)" } ],
      markLines: [ { yAxis: 78, label: "Entry — Long (Shorts Off-Sides)", color: "#00d4d4" }, { yAxis: 127, label: "Squeeze Target (TP)", color: "#ffcc00" } ],
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(98, [
        { to: 78,  bars: 8 },
        { to: 127, bars: 8 }
      ], { seed: 265, wick: 0.4 }),
      markPoints: [
        { dataIndex:  5, label: "Delta: Very Red — Shorts Aggressive",  position: "bottom" },
        { dataIndex:  6, label: "Cumul Shorts Curve: Rising",           position: "bottom" },
        { dataIndex:  7, label: "Funding: Extreme Negative",            position: "bottom" },
        { dataIndex:  8, label: "Entry: Shorts Off-Sides = Long!",      position: "bottom" },
        { dataIndex: 15, label: "Short Squeeze Target Achieved",        position: "top"    }
      ]
    },

    quiz: {
      question: "On the Hyblock Trading Activity tab you observe: cumulative delta is very red (sellers aggressive), the cumulative short curve is rising sharply (new shorts entering), and the funding rate is at extreme negative. Price is simultaneously at a key DBS support zone. What is the highest conviction trade?",
      hint: "Three SA variables are all pointing the same direction. Combined with a DBS zone from TA, what does this confluence signal?",
      style: "direction",
      answers: [
        { id: "a", text: "Long — all three Trading Activity indicators confirm shorts are aggressively loading at a TA DBS zone; the extreme negative funding adds financial pressure on those shorts; when they are forced to close the resulting short squeeze will be explosive; this is maximum conviction long territory",  correct: true,  type: "bullish" },
        { id: "b", text: "Short — very red delta and rising shorts confirm sellers are dominant; the funding being negative confirms short-sellers are the paid side which incentivizes more shorts to enter; join the dominant selling flow",  correct: false, type: "bearish" },
        { id: "c", text: "Neutral — three indicators all agreeing is a contrarian signal; when everyone is bearish the market tends to surprise to the upside, but the TA DBS zone provides insufficient reason to act against the sentiment consensus",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Very Red Delta + Rising Shorts + Extreme Neg Funding at DBS — Trade?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(16),
        ohlc: ltCandles(100, [
          { to: 75,  bars: 9 },
          { to: 126, bars: 7 }
        ], { seed: 266, wick: 0.4 }),
        markLines: [
          { yAxis: 75, label: "DBS Zone", color: "#00d4d4" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "3x SA: All Point Long at DBS", position: "bottom", color: "#00d4d4" },
        { dataIndex:  9, label: "Entry — Max Conviction Long",  position: "bottom", color: "#00d4d4" },
        { dataIndex: 15, label: "Short Squeeze — All Confirmed",position: "top",    color: "#00d4d4" }
      ],
      explanation: "Very red cumulative delta + rising short curve + extreme negative funding is the <strong>maximum bearish SA imbalance reading</strong> — all three independently confirm shorts are aggressively off-sides. At a TA DBS zone, this creates the framework's highest conviction long: TA says structural support, the three Trading Activity variables say shorts are overextended and paying unsustainably. When forced to close, the resulting buy orders will be explosive. This is exactly the 1-2 punch at full strength.",
      rule: "Max conviction long = very red delta + rising short curve + extreme negative funding + TA DBS zone. All three Trading Activity variables aligned with TA = enter at maximum size. The squeeze is coming — position ahead of it, not into it."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 24 — Hyblock Indicators on Chart
     Module 4 · Session 7
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 24,
    title: "Hyblock Indicators on Chart",
    tag: "Module 4 · Session 7",
    module: "Applying Sentiment",
    videoUrl: "https://www.youtube.com/embed/rpUsmN4eTWE",

    intro: {
      heading: "Hyblock TradingView Indicators — Retail vs Whales Divergence",
      body: "Hyblock's chart-based indicators extend beyond the standalone tabs and overlay directly onto TradingView candles. The most powerful of these are the Global Long/Short Accounts (retail proxy) and Top Trader Long/Short Positions (whale proxy) indicators. When retail and whales diverge in their positioning, the whales are almost always right — and that divergence is one of the strongest directional signals in the framework.",
      bullets: [
        "Net Shorts/Longs: individual candle opens and closes of net short or long positions",
        "Cumulative Longs/Shorts: total cumulative long (green) vs short (pink) curves overlaid on price chart",
        "Cumulative Long/Short Delta: net difference between cumulative longs and shorts; spikes show imbalances",
        "Volume Delta: market buys minus market sells per candle (updated each candle)",
        "Cumulative Volume Delta (CVD): sum of all volume delta over chart period; CVD peaks often align with price tops",
        "Global Long/Short Accounts (Binance): percentage of ALL Binance accounts long vs short = retail proxy",
        "Top Trader Long/Short Positions (Binance): top 20% largest accounts' cumulative direction = whale proxy"
      ]
    },

    lesson: {
      heading: "Retail vs Whale Divergence — The Most Powerful Chart Signal",
      body: "The divergence between Global Accounts (retail) and Top Trader Positions (whales) is the single most powerful directional signal available on Hyblock's chart overlay. The logic is simple: large accounts (whales) have more resources, more information, and more sophisticated risk management. When retail is overwhelmingly bullish while whales are net short, distribution is occurring and a price drop is likely.",
      bullets: [
        "Retail bullish + whales bearish = distribution; larger players are selling to retail buyers = likely price drop",
        "Retail bearish + whales bullish = accumulation; larger players are buying from retail sellers = likely price rise",
        "The divergence between the two curves is the signal; the wider the divergence, the stronger the signal",
        "CVD peaks: Cumulative Volume Delta peaks often align with price local tops — CVD spike = potential shorting opportunity",
        "Using CVD: draw vertical lines at CVD peaks; these vertical lines often mark exact local tops; watch for RSI or oscillator divergence at the same time",
        "Combining retail-whale divergence with TA: retail 80% long + whales net short at SSR zone = maximum conviction short",
        "Combining retail-whale divergence with liquidation levels: whale short + retail long + 25x long liq below = large player will sweep those longs"
      ]
    },

    introChart: {
      title: "Retail Bullish + Whales Bearish = Distribution Signal",
      markAreas: [ { y0: 104, y1: 108, label: "Distribution Zone — Whales Sell to Retail", color: "rgba(255,46,136,0.07)" } ],
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(82, [
        { to: 108, bars: 10 },
        { to: 76,  bars: 8  }
      ], { seed: 267, wick: 0.4 }),
      markPoints: [
        { dataIndex:  3, label: "Retail: 60% Long — Rising",     position: "top"    },
        { dataIndex:  6, label: "Retail: 75% Long — Bullish",    position: "top"    },
        { dataIndex:  7, label: "Whales: Net Short — Divergence!",position: "top"    },
        { dataIndex:  9, label: "Distribution! Retail Gets Rekt",position: "top"    },
        { dataIndex: 17, label: "Whales Were Right",             position: "bottom" }
      ]
    },

    lessonChart: {
      title: "Retail Bearish + Whales Bullish = Accumulation Signal",
      markAreas: [ { y0: 77, y1: 82, label: "Accumulation Zone — Whales Buy from Retail", color: "rgba(0,212,212,0.07)" } ],
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(100, [
        { to: 77,  bars: 8 },
        { to: 124, bars: 10 }
      ], { seed: 268, wick: 0.4 }),
      markPoints: [
        { dataIndex:  4, label: "Retail: 70% Short — Bearish",   position: "bottom" },
        { dataIndex:  6, label: "Retail: 80% Short — Extreme",   position: "bottom" },
        { dataIndex:  7, label: "Whales: Net Long — Divergence!", position: "bottom" },
        { dataIndex:  9, label: "Accumulation! Retail Gets Rekt",position: "bottom" },
        { dataIndex: 17, label: "Whales Were Right Again",       position: "top"    }
      ]
    },

    quiz: {
      question: "Hyblock data shows that Global Long/Short Accounts (retail) are 80% long, while Top Trader Long/Short Positions (whales — top 20% of accounts) are net short. Price is approaching an SSR resistance zone. What does this retail vs whale divergence signal?",
      hint: "Who is typically right between retail accounts and top-20% whale accounts? What happens to retail longs when whales are distributing into their buying?",
      style: "choice",
      answers: [
        { id: "a", text: "Bearish — retail at 80% long at an SSR zone while whales are net short signals distribution; whales are selling to retail buyers; when retail longs run out of buyers above, price drops sharply and the retail 80% long positioning gets squeezed",  correct: true,  type: "bearish" },
        { id: "b", text: "Bullish — 80% retail long means the vast majority of market participants expect higher prices; this consensus is bullish momentum and whales being short is a contrarian position that rarely succeeds against overwhelming directional bias",  correct: false, type: "bullish" },
        { id: "c", text: "Neutral — retail and whale divergence is always present in markets; an 80/20 long split is within normal ranges and does not represent an extreme reading that warrants directional action",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "80% Retail Long + Whales Net Short at SSR — Signal?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(82, [
          { to: 108, bars: 9 },
          { to: 86,  bars: 6 }
        ], { seed: 269, wick: 0.4 }),
        markLines: [
          { yAxis: 107, label: "SSR Zone", color: "#ff2e88" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "80% Retail Long — Whales Short",  position: "top",    color: "#ffcc00" },
        { dataIndex:  8, label: "Distribution at SSR",             position: "top",    color: "#ff2e88" },
        { dataIndex:  9, label: "Retail Long Squeeze Begins",      position: "top",    color: "#ff2e88" },
        { dataIndex: 14, label: "Whales Correct — Retail Rekt",    position: "bottom", color: "#00d4d4" }
      ],
      explanation: "Retail at 80% long while whales are net short at an SSR zone is the clearest <strong>distribution signal</strong> the Hyblock framework offers. Whales (top 20% of accounts by size) are selling to retail buyers who are eagerly going long at resistance. When the retail buying demand runs out, there is no one left to push price higher. The whales' short positions then begin to squeeze those retail longs, causing a cascading drop. The SSR zone TA confirms where the structural resistance is; the retail-whale divergence explains WHY this visit will fail.",
      rule: "Retail bullish + whales bearish at SSR = distribution = bearish. Retail bearish + whales bullish at DBS = accumulation = bullish. Whale positioning (top 20%) tends to outperform retail consensus. CVD peaks often align with local price tops."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 25 — Kijun-sen Bounces and Rejections
     Module 5 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 25,
    title: "Kijun-sen Bounces and Rejections",
    tag: "Module 5 · Session 1",
    module: "Ichimoku Masterclass",
    videoUrl: "https://www.youtube.com/embed/ieQGvviW-N8",

    intro: {
      heading: "Kijun Bounce — Mean Reversion in Trending Markets",
      body: "The Kijun-sen (Base Line) is the dynamic midpoint of the highest high and lowest low over the last 26 periods — functionally equivalent to a dynamic 50% Fibonacci retracement of the current trend. Price in a strong trend always wants to return to the Kijun. When price is far from the Kijun, the trend is overextended. When it reverts to the Kijun, the highest probability entry in that trend direction appears.",
      bullets: [
        "Kijun = dynamic 50% Fibonacci retracement of the current trend; the mean that price always reverts to",
        "In uptrends: every significant Higher Low occurs AT or near the Kijun; set bids there for long entries",
        "In downtrends: every significant Lower High occurs AT or near the Kijun; set asks there for short entries",
        "The longer price goes without touching the Kijun, the more overextended the trend and the stronger the eventual mean reversion",
        "CRITICAL: Kijun bounces ONLY work in trending markets — completely ineffective in ranging or flat markets",
        "Hit rate documented at approximately 72% on this setup from the instructor's journal — high but not 100%"
      ]
    },

    lesson: {
      heading: "Trading Kijun Bounces — Entry, Stop, and Target",
      body: "The Kijun bounce is mechanically simple: in an uptrend, identify the current Kijun price, set limit bids at or slightly below it, and wait for price to revert. When it does, the Kijun acts as support. Stop goes just below the recent swing low with buffer. Target is the prior resistance or next key level. The setup typically delivers 2+ R in strong trends.",
      bullets: [
        "Entry: set limit bids AT or slightly below the Kijun level; do not chase with market orders",
        "Stop: below the most recent swing low with a buffer to survive wicks; the Kijun should hold as support",
        "Target: prior resistance (for longs); prior support (for shorts); trailing stop at each swing high in a strong uptrend",
        "Example: impulse up from $7,380 to $10,584; Kijun = ~$8,940 (dynamic 50% of the range); bids set at $8,940 → 2+ R setup",
        "Pattern recognition: in a strong uptrend, each major Higher Low should sit at or very close to the Kijun",
        "Warning sign: if price breaks through the Kijun without reversing and closes below it in an uptrend = trend weakening; stop out",
        "Patience required: in strong trends the reversion to the Kijun can take many candles; set the limit and walk away"
      ]
    },

    introChart: {
      title: "Kijun Bounce — Strong Uptrend, Price Reverts to Kijun, Bounces",
      type: "candlestick",
      indicator: "ichimoku",
      chartHeight: 520,
      labels: ltLabels(20),
      ohlc: ltCandles(75, [
        { to: 110, bars: 8 },
        { to: 99,  bars: 4 },
        { to: 130, bars: 8 }
      ], { seed: 270, wick: 0.35 }),
      markLines: [
        { yAxis: 99, label: "Kijun-sen (Dynamic 50% Fib)", color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Uptrend Begins",             position: "bottom" },
        { dataIndex:  7, label: "Overextended — Far from Kijun",position: "top"  },
        { dataIndex: 11, label: "Reversion to Kijun — ENTRY!", position: "bottom" },
        { dataIndex: 12, label: "Kijun Holds as Support",     position: "bottom" },
        { dataIndex: 19, label: "Uptrend Resumes — 2+R",      position: "top"    }
      ]
    },

    lessonChart: {
      title: "Kijun Rejection in Downtrend — Price Reverts to Kijun, Rejected Short",
      type: "candlestick",
      indicator: "ichimoku",
      chartHeight: 520,
      labels: ltLabels(18),
      ohlc: ltCandles(120, [
        { to: 91, bars: 7 },
        { to: 97, bars: 3 },
        { to: 71, bars: 8 }
      ], { seed: 271, wick: 0.4 }),
      markLines: [ { yAxis: 99, label: "Stop — above rally swing high", color: "#ff2e88" }, { yAxis: 73, label: "Target — prior support (2+R)", color: "#00d4d4" },
        { yAxis: 95, label: "Kijun-sen — Rejection Level in Downtrend", color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Downtrend Begins",              position: "top"    },
        { dataIndex:  6, label: "Overextended — Far Below Kijun",position: "bottom" },
        { dataIndex:  8, label: "Rally to Kijun — Short Entry!", position: "top"    },
        { dataIndex:  9, label: "Kijun Rejects — Short Holds",  position: "top"    },
        { dataIndex: 17, label: "Downtrend Resumes — 2+R",      position: "bottom" }
      ]
    },

    quiz: {
      question: "Price is in a clear strong uptrend, making consistent Higher Highs and Higher Lows. After a large impulse move up, price pulls back toward the Kijun-sen level. According to the Kijun bounce strategy, what is the highest probability trade setup?",
      hint: "What does the Kijun represent in a trending market? What happens consistently at the Kijun in a strong uptrend?",
      style: "direction",
      answers: [
        { id: "a", text: "Long — set limit bids at or near the Kijun level; in a strong uptrend the Kijun acts as dynamic 50% Fibonacci support and each major Higher Low occurs there; stop below the most recent swing low with buffer; target prior resistance for 2+ R",  correct: true,  type: "bullish" },
        { id: "b", text: "Short — price pulling back to the Kijun means the uptrend is weakening; the Kijun is a mean reversion target which once reached signals the trend has exhausted and a reversal is more likely than continuation",  correct: false, type: "bearish" },
        { id: "c", text: "No trade — Kijun bounces are only valid in downtrends as rejection setups; in uptrends the Kijun acts as resistance and price typically fails to bounce from it",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Strong Uptrend + Price Reverts to Kijun — Highest Probability Trade?",
        type: "candlestick",
        cutIndex: 10,
        labels: ltLabels(18),
        ohlc: ltCandles(75, [
          { to: 109, bars: 8 },
          { to: 103, bars: 3 },
          { to: 135, bars: 7 }
        ], { seed: 272, wick: 0.35 }),
        markLines: [
          { yAxis: 103, label: "Kijun-sen (Dynamic 50% Fib)", color: "#ffcc00" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  9, label: "Reversion to Kijun",        position: "bottom", color: "#ffcc00" },
        { dataIndex: 10, label: "Long Entry at Kijun!",       position: "bottom", color: "#00d4d4" },
        { dataIndex: 17, label: "2+R — Kijun Bounce Works",  position: "top",    color: "#00d4d4" }
      ],
      explanation: "In a strong uptrend, the Kijun-sen acts as the <strong>dynamic 50% Fibonacci support</strong> — every significant Higher Low in the trend occurs at or near the Kijun. When price extends far above the Kijun, the trend is overextended and a reversion is inevitable. The reversion TO the Kijun is not a sign of weakness — it is the optimal entry point for the continuation. The longer price has been above the Kijun, the stronger the expected bounce. Stop below the swing low; target prior resistance. Documented hit rate ~72%.",
      rule: "Kijun bounce = highest probability entry in a trending market. In uptrend: bids at Kijun = long. In downtrend: asks at Kijun = short. ONLY in trending markets — never in ranges. Kijun = dynamic 50% Fibonacci of the current trend."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 26 — C-Clamps and Kumo Pockets
     Module 5 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 26,
    title: "C-Clamps and Kumo Pockets",
    tag: "Module 5 · Session 2",
    module: "Ichimoku Masterclass",
    videoUrl: "https://www.youtube.com/embed/d0izvW6996I",

    intro: {
      heading: "C-Clamps — Counter-Trend Entries When Trend Is Overextended",
      body: "A C-Clamp forms when the Tenkan-sen and Kijun-sen diverge significantly, creating a C-shape between them. This C-shape signals that the current trend is overextended — the short-term Tenkan has moved far from the longer-term Kijun — and a mean reversion back toward the Kijun is likely. C-Clamps are counter-trend setups; they must be traded only when the divergence begins to resolve.",
      bullets: [
        "Bullish C-Clamp: Tenkan has dropped far below Kijun; sellers may be exhausted; counter-trend long when resolving",
        "Bearish C-Clamp: Tenkan has risen far above Kijun; buyers may be exhausted; counter-trend short when resolving",
        "C-Clamp can persist for many days or weeks before resolving — do not front-run; wait for the gap to start closing",
        "Resolving C-Clamp: Tenkan and Kijun begin converging back toward each other = the signal to enter",
        "Target minimum: price returns to Tenkan; ideally price returns all the way to Kijun",
        "First test of Kijun after a C-Clamp resolves = strongest reaction point — depletion factor at maximum"
      ]
    },

    lesson: {
      heading: "Kumo Pockets — Hidden S/R Zones Within the Cloud",
      body: "Kumo Pockets are areas within the Ichimoku Cloud where Senkou Span A created a flat or pocket area before reversing. These flat zones act as powerful support or resistance when price later returns to them. They are most effective in downtrends. The depletion factor applies: the first test of an untested Kumo pocket produces the strongest reaction.",
      bullets: [
        "Kumo Pocket: formed when Senkou Span A (Leading Span A) flattened and then reversed, creating a 'pocket' within the cloud",
        "The flat area of Span A marks the pocket zone — draw it on the chart as a horizontal zone",
        "When price enters this pocket zone: high probability of rejection (especially in downtrends)",
        "Depletion factor: strongest reaction on FIRST test; subsequent tests progressively weaker",
        "Trading short at Kumo pocket: scatter asks throughout the pocket OR set asks at the back end (more conservative)",
        "Stop: beyond the previous swing high (for shorts); previous swing low (for longs)",
        "Target: next S/R level below (shorts) or above (longs); trailing stop following subsequent swing extremes"
      ]
    },

    introChart: {
      title: "C-Clamp — Tenkan Below Kijun; Gap Starts Closing; Counter-Trend Entry",
      type: "candlestick",
      indicator: "ichimoku",
      chartHeight: 520,
      labels: ltLabels(18),
      ohlc: ltCandles(110, [
        { to: 80,  bars: 7 },
        { to: 84,  bars: 3 },
        { to: 110, bars: 8 }
      ], { seed: 273, wick: 0.4 }),
      markLines: [ { yAxis: 84, label: "Entry — Resolution Begins", color: "#00d4d4" },
        { yAxis: 95, label: "Kijun-sen", color: "#ffcc00" },
        { yAxis: 80, label: "Tenkan — Min Target (Diverged)", color: "#ff2e88" }
      ],
      markPoints: [
        { dataIndex:  0, label: "C-Clamp Forming — T Below K",    position: "top"    },
        { dataIndex:  6, label: "Maximum Divergence — Wait!",     position: "bottom" },
        { dataIndex:  9, label: "C-Clamp Resolving — T Rising",   position: "bottom" },
        { dataIndex: 10, label: "Counter-Trend Long Entry",       position: "bottom" },
        { dataIndex: 17, label: "Kijun Target Achieved",          position: "top"    }
      ]
    },

    lessonChart: {
      title: "Kumo Pocket — First Test at Pocket Zone, Strongest Rejection",
      markLines: [ { yAxis: 102.5, label: "Stop — Above Swing High", color: "#ff2e88" }, { yAxis: 100, label: "Short Entry — Pocket Asks", color: "#ff2e88" }, { yAxis: 76, label: "Target — Next S/R Below", color: "#00d4d4" } ],
      type: "candlestick",
      indicator: "ichimoku",
      chartHeight: 520,
      labels: ltLabels(16),
      ohlc: ltCandles(110, [
        { to: 93,  bars: 7 },
        { to: 101, bars: 3 },
        { to: 76,  bars: 6 }
      ], { seed: 274, wick: 0.4 }),
      markAreas: [
        { y0: 97, y1: 103, label: "Kumo Pocket Zone (First Test!)", color: "rgba(255,46,136,0.08)" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Downtrend Established",           position: "top"    },
        { dataIndex:  7, label: "Rally into Kumo Pocket",          position: "top"    },
        { dataIndex:  8, label: "First Test — Strongest Rejection",position: "top"    },
        { dataIndex:  9, label: "Depletion Factor at Maximum",     position: "top"    },
        { dataIndex: 15, label: "Short Target Achieved",           position: "bottom" }
      ]
    },

    quiz: {
      question: "The Tenkan-sen has dropped far below the Kijun-sen, forming a clear C-shape. The gap between them begins to narrow as the Tenkan starts rising toward the Kijun. According to the C-Clamp strategy, what is the correct response?",
      hint: "Has the C-Clamp fully resolved? What does the gap starting to narrow signal about the timing for a counter-trend entry?",
      style: "choice",
      answers: [
        { id: "a", text: "Enter the counter-trend long now — the C-Clamp is beginning to resolve as the Tenkan rises toward the Kijun; this is the signal to enter; do not wait for full resolution as the best entry is early in the resolution phase; target is at minimum the Tenkan, ideally the Kijun",  correct: true,  type: "bullish" },
        { id: "b", text: "Wait until the Tenkan and Kijun fully cross before entering — a C-Clamp is only resolved when the Tenkan crosses above the Kijun; entering before the crossover is premature and carries significant reversal risk",  correct: false, type: "bearish" },
        { id: "c", text: "Do not trade the C-Clamp at all — it is a counter-trend setup which violates the principle of always trading with the trend; instead use the C-Clamp only as a warning to avoid adding trend-following positions",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Bullish C-Clamp Resolving — Tenkan Rising Toward Kijun. Trade?",
        type: "candlestick",
        cutIndex: 10,
        labels: ltLabels(18),
        ohlc: ltCandles(110, [
          { to: 79,  bars: 7 },
          { to: 83,  bars: 3 },
          { to: 110, bars: 8 }
        ], { seed: 275, wick: 0.4 }),
        markLines: [ { yAxis: 89, label: "Tenkan — Min Target", color: "#ffcc00" },
          { yAxis: 95, label: "Kijun-sen (Target)", color: "#ffcc00" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  6, label: "Max Divergence — Wait",     position: "bottom", color: "#ffcc00" },
        { dataIndex:  9, label: "Resolving — Entry Now!",   position: "bottom", color: "#00d4d4" },
        { dataIndex: 17, label: "Kijun Target Reached",     position: "top",    color: "#00d4d4" }
      ],
      explanation: "The C-Clamp entry is timed to the beginning of resolution — when the Tenkan and Kijun begin to converge, the counter-trend move has already started. Waiting for full crossover misses a significant portion of the move. The minimum target is when the Tenkan reaches the Kijun; the ideal target is a full return to the Kijun level. The first post-C-Clamp test of the Kijun is always the strongest reaction point — the depletion factor is fresh.",
      rule: "C-Clamp = Tenkan and Kijun diverge; trend is overextended. Enter counter-trend WHEN the gap starts to resolve (Tenkan moving back toward Kijun). Target: minimum = Tenkan; ideal = Kijun. First test of Kijun after C-Clamp = strongest reaction."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 27 — Edge to Edge (E2E)
     Module 5 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 27,
    title: "Edge to Edge (E2E)",
    tag: "Module 5 · Session 3",
    module: "Ichimoku Masterclass",
    videoUrl: "https://www.youtube.com/embed/KpvozoObhR4",

    intro: {
      heading: "Edge to Edge — The Highest Probability Ichimoku Trade",
      body: "Edge to Edge (E2E) is the highest probability trade setup in the Ichimoku system. When activated, price travels from one edge of the Kumo cloud to the opposite edge. It acts as a leading indicator for macro trend reversals and typically produces 4–6+ R setups. Three specific prerequisites must ALL be met before the setup is active.",
      bullets: [
        "When activated: price enters the cloud at one edge and travels to the exact opposite edge",
        "Works best on higher timeframes: daily, 2-day, weekly; solid on 4H and 6H",
        "Typical RR: 4 to 6+ R setups; macro trend reversal signal",
        "Prerequisite 1: Weak Bullish or Bearish TK Crossover — Tenkan crosses above (bullish) or below (bearish) Kijun",
        "Prerequisite 2: Chikou Span above price (bullish) or below price (bearish) — confirms directional trend",
        "Prerequisite 3: Strong, clean close INSIDE the Kumo cloud — decisive candle not an indecision doji",
        "ALL THREE prerequisites must be met simultaneously — missing any one invalidates the E2E setup"
      ]
    },

    lesson: {
      heading: "Three Entry Options and Trade Management",
      body: "Once all three E2E prerequisites are met, three entry approaches are available — from most aggressive to most conservative. Trade management is straightforward: stop loss below or above the cloud (depending on direction), target at the opposite edge of the cloud. The high R multiple comes from the distance across the cloud which is often very large on higher timeframes.",
      bullets: [
        "Entry Option 1 (Most Aggressive): blind market order immediately when all 3 prerequisites are met",
        "Entry Option 2 (Moderate): wait for a Tenkan retest after the prerequisites are met; set limit orders at the Tenkan",
        "Entry Option 3 (Most Conservative): use LTE methodology — identify an S/R flip near the Kijun, wait for a trigger (bullish engulfing, etc.)",
        "Stop Loss: below the cloud for bullish E2E; above the cloud for bearish E2E",
        "Target: opposite edge of the Kumo cloud — this is the defined destination once E2E is activated",
        "Cloud width matters: a wide cloud on the daily or weekly chart produces the largest R multiples",
        "Once the opposite edge is reached: the E2E is complete; often the cloud itself is then broken on the next leg"
      ]
    },

    introChart: {
      title: "E2E Prerequisites Met — Close Inside Cloud, Price Targets Opposite Edge",
      type: "candlestick",
      indicator: "ichimoku",
      chartHeight: 520,
      labels: ltLabels(20),
      // Rally → consolidate → PULLBACK that closes inside the (computed) Kumo → rally to the
      // opposite edge. Verified: price actually closes inside the cloud at the entry bar.
      ohlc: ltCandles(70, [
        { to: 90,  bars: 6 },
        { to: 88,  bars: 6 },
        { to: 80,  bars: 3 },
        { to: 108, bars: 5 }
      ], { seed: 276, wick: 0.35 }),
      markLines: [
        { yAxis: 78, label: "Cloud Bottom Edge (E2E Entry)", color: "#00d4d4" },
        { yAxis: 88, label: "Cloud Top Edge (E2E Target)",   color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex: 11, label: "Prereq 1: TK Crossover",       position: "bottom" },
        { dataIndex: 12, label: "Prereq 2: Chikou Above",        position: "bottom" },
        { dataIndex: 14, label: "Prereq 3: Close INSIDE Cloud",  position: "bottom" },
        { dataIndex: 15, label: "E2E Long — Entry",              position: "bottom" },
        { dataIndex: 17, label: "Traveling to Opposite Edge",    position: "top"    },
        { dataIndex: 19, label: "Opposite Edge — Target Hit",    position: "top"    }
      ]
    },

    lessonChart: {
      title: "E2E Stop and Target — Below Cloud / Opposite Edge",
      type: "candlestick",
      indicator: "ichimoku",
      chartHeight: 520,
      labels: ltLabels(18),
      // Same E2E geometry: pullback closes inside the computed cloud, then travels to the
      // opposite edge. Stop sits below the cloud (the E2E invalidation).
      ohlc: ltCandles(70, [
        { to: 88,  bars: 6 },
        { to: 86,  bars: 5 },
        { to: 79,  bars: 3 },
        { to: 112, bars: 6 }
      ], { seed: 277, wick: 0.35 }),
      markLines: [
        { yAxis: 72, label: "Stop Loss — Below Cloud",        color: "#ff2e88" },
        { yAxis: 78, label: "E2E Entry — Close Inside Cloud", color: "#00d4d4" },
        { yAxis: 90, label: "E2E Target — Opposite Edge",     color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex: 13, label: "E2E Activated — Close Inside Cloud", position: "bottom" },
        { dataIndex: 14, label: "Entry — Long (stop below cloud)",    position: "bottom" },
        { dataIndex: 19, label: "Opposite Edge — E2E Complete",       position: "top"    }
      ]
    },

    quiz: {
      question: "All three Edge to Edge prerequisites have been met on the daily chart: a weak bullish TK crossover, the Chikou Span is above price, and there has been a strong decisive candle close inside the Kumo cloud. Where is the defined price target for this E2E setup?",
      hint: "The name Edge to Edge describes exactly what the setup does. Price enters at one edge and travels to what destination?",
      style: "choice",
      answers: [
        { id: "a", text: "The opposite edge of the Kumo cloud — when E2E is activated, price travels from the bottom edge of the cloud (entry close) to the top edge of the cloud (target), or from the top edge to the bottom edge for bearish E2E; the cloud width determines the R multiple",  correct: true,  type: "bullish" },
        { id: "b", text: "The Kijun-sen level — when price closes inside the cloud the next significant Ichimoku level is the Kijun; the E2E target is always the base line that acts as the mean reversion point within the cloud",  correct: false, type: "bearish" },
        { id: "c", text: "The Tenkan-sen level — the TK crossover that triggered the E2E setup defines the first target; price must reach the Tenkan before a secondary target at the cloud edge can be considered",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "E2E Activated — All 3 Prerequisites Met. Where Is the Target?",
        type: "candlestick",
        indicator: "ichimoku",
        chartHeight: 520,
        cutIndex: 15,
        labels: ltLabels(20),
        // pullback closes inside the computed cloud (decision point), reveal = travel to edge
        ohlc: ltCandles(70, [
          { to: 90,  bars: 6 },
          { to: 88,  bars: 5 },
          { to: 77,  bars: 4 },
          { to: 110, bars: 5 }
        ], { seed: 278, wick: 0.35 }),
        markLines: [
          { yAxis: 74, label: "Bottom Edge — E2E Entry", color: "#00d4d4" },
          { yAxis: 86, label: "Top Edge of Kumo Cloud",  color: "#ffcc00" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 14, label: "Prereqs Met — Close in Cloud",  position: "bottom", color: "#00d4d4" },
        { dataIndex: 15, label: "E2E Entry",                     position: "bottom", color: "#00d4d4" },
        { dataIndex: 19, label: "Opposite Edge — E2E Complete!", position: "top",    color: "#ffcc00" }
      ],
      explanation: "The E2E setup is named for exactly what it does: price travels from one <strong>Edge to the opposite Edge</strong> of the Kumo cloud. Once all three prerequisites are met and price closes inside the cloud at the bottom edge (bullish E2E), the target is the top edge of the cloud. The cloud width determines the R multiple — on daily and weekly charts this cloud is often hundreds of dollars wide, producing 4–6+ R setups. Stop loss is placed below the cloud (bullish) or above it (bearish).",
      rule: "E2E: 3 prerequisites required — (1) TK crossover, (2) Chikou above/below price, (3) strong close inside cloud. Target = opposite edge of cloud. Stop = beyond cloud. Highest R setup in Ichimoku. Works best on higher timeframes (daily, 2D, weekly)."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 28 — Ichimoku Market Scenarios — Live Examples
     Module 5 · Session 4
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 28,
    title: "Ichimoku Market Scenarios — Live Examples",
    tag: "Module 5 · Session 4",
    module: "Ichimoku Masterclass",
    videoUrl: "https://www.youtube.com/embed/MdWiEYBAeas",

    intro: {
      heading: "Live Application — BTC Bottom E2E, Kijun Bounce, and Kumo Pocket Short",
      body: "Theory becomes skill through live application. This chapter walks through three real Ichimoku setups on historical BTC charts: the 2018–2019 BTC bottom E2E from $3,800 to $5,500, a Kijun bounce mean reversion trade, and a weekly Kumo pocket short that produced a Head and Shoulders pattern confirming the rejection. Each demonstrates the framework applied in real conditions.",
      bullets: [
        "BTC 3,000 bottom E2E: identified cloud top at $5,500 as target; all three prerequisites met Feb 28; entry at $3,950 via LTE; R = 3.55:1",
        "Then 2-day E2E also activated → rode to $5,500+; full Kumo breakout followed on the larger timeframe",
        "Kijun Bounce live: large dump → Kijun flattened at $7,260 → price reverted to $7,260 → short entry → mean reversion play",
        "Kumo Pocket live: weekly Kumo pocket at $9,200–$9,500 → first test → H&S pattern formed at exact pocket level",
        "H&S target from Kumo Pocket short: $8,500 → hit perfectly → then set bids at Kijun for long (C-clamp + DBS alignment)",
        "Key lesson: every setup confirmed by multiple frameworks — TA, Ichimoku, and LTE all agreeing = highest conviction"
      ]
    },

    lesson: {
      heading: "Multi-Framework Confirmation — When All Tools Agree",
      body: "The live examples demonstrate that the most successful setups occur when multiple independent frameworks confirm the same trade. The BTC bottom E2E was confirmed by the 2-day chart E2E simultaneously. The Kumo Pocket short was confirmed by an H&S pattern forming at the exact pocket level. The Kijun bounce was confirmed by the DBS zone below. No tool works in isolation — combined they create certainty.",
      bullets: [
        "BTC E2E lesson: when the daily E2E activates and the 2-day E2E activates simultaneously = maximum macro conviction",
        "Three Inside Up formation as additional confirmation on the BTC bottom E2E → three independent signals all firing at once",
        "Kumo Pocket lesson: weekly pockets are the most powerful; first test depletion factor is highest on weekly timeframe",
        "H&S at Kumo Pocket: the classical chart pattern (H&S) formed at EXACTLY the Kumo pocket zone = TA and Ichimoku confirming same level",
        "Kijun bounce lesson: after a fast sharp move the Kijun often flattens at a round number level, creating a high-visibility mean reversion target",
        "After Kumo Pocket short: set bids at Kijun below for long; C-Clamp was forming simultaneously; DBS zone also there = three-way confluence long",
        "Real skill: not learning each tool in isolation but layering them simultaneously to identify only the highest-conviction setups"
      ]
    },

    introChart: {
      title: "BTC Bottom E2E — Entry at $3,950, Target Cloud Top Edge at $5,500",
      type: "candlestick",
      indicator: "ichimoku",
      chartHeight: 520,
      labels: ltLabels(20),
      // Bottom E2E: downtrend into a bottom that sits BELOW the (computed) Kumo → rally that
      // closes INSIDE the cloud (entry) → travels edge-to-edge and exits the top edge (target).
      // Verified against the live cloud: close is inside the Kumo at the entry bar (body idx 12)
      // and clears the top edge by the target. (Mirrors the ch27 E2E redesign.)
      ohlc: ltCandles(100, [
        { to: 72,  bars: 6 },
        { to: 74,  bars: 4 },
        { to: 90,  bars: 5 },
        { to: 102, bars: 5 }
      ], { seed: 301, wick: 0.35 }),
      markLines: [ { yAxis: 89, label: "LTE Entry $3,950 — Close Inside Cloud", color: "#00d4d4" },
        { yAxis: 87, label: "Cloud Bottom Edge ($3,800) — E2E Entry", color: "#00d4d4" },
        { yAxis: 96, label: "Cloud Top Edge ($5,500) — E2E Target",   color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  5, label: "C-Clamp Forming at Bottom",      position: "bottom" },
        { dataIndex: 11, label: "E2E Prereqs Met Feb 28",         position: "bottom" },
        { dataIndex: 12, label: "LTE Entry: Close INSIDE Cloud",  position: "bottom" },
        { dataIndex: 15, label: "Midway — 2D E2E Also Active",    position: "top"    },
        { dataIndex: 19, label: "E2E Target Hit! $5,500",         position: "top"    }
      ]
    },

    lessonChart: {
      title: "Weekly Kumo Pocket Short + H&S Confirmation at Pocket Level",
      type: "candlestick",
      indicator: "ichimoku",
      chartHeight: 520,
      labels: ltLabels(18),
      ohlc: ltCandles(95, [
        { to: 98,  bars: 7 },
        { to: 102, bars: 4 },
        { to: 80,  bars: 7 }
      ], { seed: 280, wick: 0.4 }),
      markAreas: [
        { y0: 97, y1: 102, label: "Weekly Kumo Pocket — First Test!", color: "rgba(255,46,136,0.08)" }
      ],
      markLines: [ { yAxis: 96, label: "H&S Neckline — Short Entry on Break", color: "#ff2e88" },
        { yAxis: 84, label: "H&S Target $8,500 + Kijun + DBS Bid (3-way long)", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  6, label: "Approaching Weekly Pocket",       position: "top"    },
        { dataIndex:  7, label: "Pocket: Left Shoulder",          position: "top"    },
        { dataIndex:  9, label: "Pocket: Head — Max Rejection",   position: "top"    },
        { dataIndex: 11, label: "Pocket: Right Shoulder",         position: "top"    },
        { dataIndex: 13, label: "H&S Neckline Break — Short!",    position: "bottom" },
        { dataIndex: 17, label: "H&S Target + Kijun Bid Level",   position: "bottom" }
      ]
    },

    quiz: {
      question: "Price approaches a weekly Kumo pocket at a key level for the very first time. According to the depletion factor principle applied to Kumo pockets, what does this first test represent?",
      hint: "How does the depletion factor apply to Kumo pockets? Is the first test stronger, weaker, or equivalent to subsequent tests of the same pocket?",
      style: "direction",
      answers: [
        { id: "a", text: "Bearish — the first test of an untested Kumo pocket carries the maximum depletion factor; the pocket's resistance orders have never been touched and are at full strength; the strongest rejection of any visit to that pocket occurs on this first test; subsequent tests will be progressively weaker",  correct: true,  type: "bearish" },
        { id: "b", text: "Neutral — the first test of a Kumo pocket carries no special significance; the pocket's strength is consistent across all tests until the price level is fundamentally broken by a clear close through it",  correct: false, type: "bullish" },
        { id: "c", text: "Bullish — the first test of a weekly Kumo pocket is a bullish signal because the untouched pocket acts as a magnet; price tends to move through first-test pockets more easily than subsequent ones as the market has not had time to build orders there",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Weekly Kumo Pocket — First Test. Strongest or Weakest Reaction?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(16),
        ohlc: ltCandles(88, [
          { to: 97,  bars: 8 },
          { to: 99,  bars: 1, reject: 3 },
          { to: 75,  bars: 7 }
        ], { seed: 281, wick: 0.4 }),
        markAreas: [
          { y0: 96, y1: 102, label: "Weekly Kumo Pocket — First Test", color: "rgba(255,46,136,0.08)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  8, label: "First Test — Max Depletion Factor", position: "top",    color: "#ff2e88" },
        { dataIndex:  9, label: "Strongest Rejection — Short Entry", position: "top",    color: "#ff2e88" },
        { dataIndex: 15, label: "First Test Rejection Confirmed",    position: "bottom", color: "#00d4d4" }
      ],
      explanation: "The <strong>depletion factor</strong> states that the first test of any liquidity area or key level carries the maximum order density — the orders at that level have never been consumed by a prior test. At a weekly Kumo pocket, this principle applies with maximum force: the pocket's resistance is at its strongest on the very first visit. Each subsequent test depletes the orders further, producing progressively weaker rejections until the level finally breaks. Trading the first test is always the highest probability trade at any Kumo pocket.",
      rule: "Kumo Pocket depletion factor: first test = strongest rejection. Scatter asks throughout the pocket (or at back end) for shorts in downtrend. Stop above prior swing high. Target: next S/R. Subsequent tests progressively weaker — only first test carries maximum strength."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 29 — Outro — Course 4 Recap
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 29,
    title: "Outro — Course 4 Recap",
    tag: "Outro",
    module: "Course Overview",

    intro: {
      heading: "Course 4 Complete — The Full Framework in Your Hands",
      body: "Course 4 has given you five powerful modules that complete the Tools of the Trade curriculum. You now possess both the technical and the sentiment analytical perspective required to consistently identify high-conviction trade setups. The framework is not a system of rules — it is a school of thought. Apply it with judgment, confirm with confluence, and continuously refine with journaling.",
      bullets: [
        "Module 1 — Liquidity Theory: four principles; liquidity pools; SFPs; Under Over and Over Under structures; ask 'Is my stop someone else's liquidity?'",
        "Module 2 — Determining Control: funding rate, open interest, cumulative delta, futures basis; combine to identify who is off-sides and about to be squeezed",
        "Module 3 — Indicator Suite: Trend Buddy, PAL, Heuristics, FSVZO, Crayons, Genie; use as confluence — never as standalone systems",
        "Module 4 — Hyblock Capital: liquidation levels, positions heatmap, trading activity, chart indicators; spot the blocks, plot the blocks",
        "Module 5 — Ichimoku Masterclass: Kijun bounces (72% hit rate), C-clamps (counter-trend), Kumo pockets (first-test depletion), Edge to Edge (4–6+ R)",
        "The 1-2 punch: TA tells you where; SA tells you why and who gets squeezed; Ichimoku provides the specific setups"
      ]
    },

    lesson: {
      heading: "The Complete Trader — Combining All Four Courses",
      body: "You have now completed all four courses of the Tools of the Trade curriculum. Courses 1 and 2 gave you the market structure and technical analysis foundation. Course 3 gave you the execution mechanics — leverage, orders, ranges, your system, and your mindset. Course 4 gave you the reason WHY markets move and the tools to see it in advance. The combination is your complete edge.",
      bullets: [
        "Never use one tool alone — the framework's power is in combination and convergence of signals",
        "Every loss is a teacher — journal every trade, review patterns, identify conditions where your edge is strongest",
        "The maximum pain scenario is almost always the move that happens — ask this question before every trade setup",
        "Screen time builds pattern recognition — no shortcut exists; 10,000 hours to mastery but every hour of quality screen time counts",
        "Emotional discipline is the final barrier — your system, your plan, and your tools are only as good as your discipline in executing them",
        "The edge is never static — markets evolve; continue to refine, backtest, and adapt your setups as conditions change",
        "Congratulations — you now have the complete Tools of the Trade framework; the next chapter is experience"
      ]
    },

    roadmap: {
      title: "The Complete Journey",
      sub: "Four courses combined into one edge",
      icon: "flag",
      stops: [
        { label: "Course 1 · Foundation", desc: "Candlesticks, market structure, support & resistance" },
        { label: "Course 2 · Toolbox", desc: "Patterns, indicators, entries and exits" },
        { label: "Course 3 · Execution", desc: "Leverage, ranges, your system and mindset" },
        { label: "Course 4 · Liquidity + SA", desc: "Why price moves — and who gets squeezed" },
        { label: "Complete edge — ready", desc: "TA + SA + Ichimoku working in confluence" }
      ]
    },

    lessonChart: {
      title: "Maximum Confluence Trade — All Four Courses in One Setup",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 75,  bars: 10 },
        { to: 125, bars: 6  }
      ], { seed: 282, wick: 0.4 }),
      markLines: [ { yAxis: 125, label: "Target — Framework Wins (~125)", color: "#ffcc00" },
        { yAxis: 75, label: "DBS + Kijun + Liq Level + 4x SA = One Trade", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  7, label: "C1: DBS Zone Identified",    position: "bottom" },
        { dataIndex:  8, label: "C2: Ichimoku Kijun Here",    position: "bottom" },
        { dataIndex:  9, label: "C3: LTE Entry Trigger",      position: "bottom" },
        { dataIndex: 10, label: "C4: SA + Liq Level = Entry", position: "bottom" },
        { dataIndex: 15, label: "Complete Framework Wins",    position: "top"    }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "Which Ichimoku trade setup acts as a leading indicator for macro trend reversals, typically produces 4–6+ R setups, and requires three specific prerequisites to be simultaneously met before it is considered active?",
      hint: "The name of this setup describes exactly what price does geometrically when it activates — it travels from one boundary to the opposite boundary of a specific Ichimoku component.",
      style: "choice",
      answers: [
        { id: "a", text: "Edge to Edge (E2E) — requires: (1) weak bullish or bearish TK crossover, (2) Chikou Span above or below price, and (3) a strong decisive close inside the Kumo cloud; when all three are met, price targets the opposite edge of the cloud for 4-6+ R",  correct: true,  type: "bullish" },
        { id: "b", text: "C-Clamp — requires: (1) Tenkan below Kijun divergence, (2) price making lower lows, and (3) closing below the cloud; when all three are met it is a 4-6+ R counter-trend setup targeting the Kijun",  correct: false, type: "bearish" },
        { id: "c", text: "Kijun Bounce — requires: (1) a strong uptrend, (2) price pulling back to the Kijun, and (3) a bullish engulfing candle at the Kijun; this three-prerequisite setup consistently produces 4-6+ R from the Kijun to the prior swing high",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Which Ichimoku Setup Has 3 Prerequisites and Produces 4-6+ R?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(18),
        ohlc: ltCandles(68, [
          { to: 82,  bars: 8  },
          { to: 130, bars: 10 }
        ], { seed: 283, wick: 0.35 }),
        markAreas: [
          { y0: 80, y1: 118, label: "Kumo Cloud — E2E Range", color: "rgba(0,212,212,0.07)" }
        ],
        markLines: [
          { yAxis: 80, label: "Bottom Edge — E2E Entry", color: "#00d4d4" },
          { yAxis: 118, label: "Top Edge — E2E Target",  color: "#ffcc00" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  6, label: "Prereq 1: TK Cross",        position: "bottom", color: "#00d4d4" },
        { dataIndex:  7, label: "Prereq 2: Chikou Above",     position: "bottom", color: "#00d4d4" },
        { dataIndex:  8, label: "Prereq 3: Close in Cloud",   position: "bottom", color: "#00d4d4" },
        { dataIndex:  9, label: "E2E Activated!",             position: "bottom", color: "#00d4d4" },
        { dataIndex: 17, label: "Opposite Edge = 4-6+R Hit!", position: "top",    color: "#ffcc00" }
      ],
      explanation: "<strong>Edge to Edge (E2E)</strong> is the highest probability Ichimoku trade setup. Three prerequisites must ALL be met simultaneously: (1) weak bullish or bearish TK crossover — Tenkan crosses Kijun; (2) Chikou Span position above or below price confirming the trend direction; (3) a strong, decisive candle close inside the Kumo cloud (not a doji or small-bodied indecision candle). When activated, price travels from the entry edge of the cloud to the opposite edge — typically 4–6+ R on daily and weekly timeframes. It acts as a leading indicator for macro trend reversals.",
      rule: "E2E = 3 prerequisites (TK cross + Chikou + cloud close) = price from one cloud edge to the other = 4-6+ R. The highest probability Ichimoku setup. Works best on daily, 2-day, and weekly charts. Leading indicator for macro trend reversals."
    }
  }

];

const COURSE4_META = { id: "course4", title: "Course 4: Liquidity Theory", subtitle: "Liquidity Theory", chapterCount: 30 };

/* Final-exam question POOL — authored separately from chapter quizzes.
   Engine samples EXAM_LENGTH at random per attempt and shuffles options. */
const LT_EXAM_QUESTIONS_4 = [
  { chapterTitle: 'Principles of Liquidity', question: 'A core principle of Liquidity Theory is that price tends to:',
    answers: [
      { id:'a', text:'Gravitate toward areas of highest liquidity', correct:true },
      { id:'b', text:'Avoid liquidity at all costs', correct:false },
      { id:'c', text:'Move randomly with no relationship to liquidity', correct:false },
      { id:'d', text:'Always trend in one direction forever', correct:false } ] },
  { chapterTitle: 'Zero-Sum Game', question: 'Describing leveraged derivatives as a "zero-sum game" means:',
    answers: [
      { id:'a', text:'For every winner there is a loser on the other side of the trade', correct:true },
      { id:'b', text:'Everyone can win at the same time', correct:false },
      { id:'c', text:'The exchange always loses', correct:false },
      { id:'d', text:'Outcomes are decided purely by luck', correct:false } ] },
  { chapterTitle: 'Stops as Liquidity', question: 'Why does a cluster of stop losses just below an obvious swing low matter?',
    answers: [
      { id:'a', text:'Those stops are resting liquidity that larger players may target', correct:true },
      { id:'b', text:'Stops below support are always perfectly safe', correct:false },
      { id:'c', text:'Stops have no effect on price', correct:false },
      { id:'d', text:'It guarantees the level will hold', correct:false } ] },
  { chapterTitle: 'Swing Failure Pattern', question: 'A Swing Failure Pattern (SFP) occurs when price:',
    answers: [
      { id:'a', text:'Briefly exceeds a prior swing high/low to grab liquidity, then reverses back', correct:true },
      { id:'b', text:'Closes far beyond the level and continues trending', correct:false },
      { id:'c', text:'Consolidates exactly at the level for weeks', correct:false },
      { id:'d', text:'Gaps away from the level and never returns', correct:false } ] },
  { chapterTitle: 'Liquidity Engineering', question: 'A sharp sweep below an obvious support that immediately reverses upward is best read as:',
    answers: [
      { id:'a', text:'Liquidity being grabbed below the level before price moves the other way', correct:true },
      { id:'b', text:'A confirmed breakdown to short into', correct:false },
      { id:'c', text:'A meaningless wick to ignore', correct:false },
      { id:'d', text:'Proof support is permanently broken', correct:false } ] },
  { chapterTitle: 'Under / Over', question: 'A bullish "Under-Over" plays out as:',
    answers: [
      { id:'a', text:'A fake breakdown below a level, reclaimed, then a retest entry from above', correct:true },
      { id:'b', text:'A clean breakout that never looks back', correct:false },
      { id:'c', text:'A slow grind with no level interaction', correct:false },
      { id:'d', text:'A pattern that only forms on the monthly chart', correct:false } ] },
  { chapterTitle: 'Pools vs SFPs', question: 'What mainly distinguishes a low-timeframe liquidity pool from a higher-timeframe SFP?',
    answers: [
      { id:'a', text:'Timeframe and duration — a pool is a single wick; an SFP develops over more time', correct:true },
      { id:'b', text:'One is bullish and the other is always bearish', correct:false },
      { id:'c', text:'They are exactly the same thing', correct:false },
      { id:'d', text:'Pools only happen in stocks, SFPs only in crypto', correct:false } ] },
  { chapterTitle: 'Sentiment — Funding', question: 'Extremely negative funding into a key support suggests crowded shorts and sets up a:',
    answers: [
      { id:'a', text:'Potential short squeeze (upside)', correct:true },
      { id:'b', text:'Guaranteed breakdown lower', correct:false },
      { id:'c', text:'Long squeeze (downside)', correct:false },
      { id:'d', text:'Neutral market with no edge', correct:false } ] },
  { chapterTitle: 'Conviction & Sizing', question: 'In this framework, when all sentiment variables align with a technical level you should:',
    answers: [
      { id:'a', text:'Treat it as higher-conviction — size accordingly versus mixed signals', correct:true },
      { id:'b', text:'Always use identical size regardless of confluence', correct:false },
      { id:'c', text:'Take the trade with maximum leverage every time', correct:false },
      { id:'d', text:'Ignore the level since sentiment overrides it', correct:false } ] },
  { chapterTitle: 'Using the Indicator Suite', question: 'The indicator suite (Trend Buddy, PAL, Crayons, etc.) is best used as:',
    answers: [
      { id:'a', text:'Confluence alongside S/R and structure — not standalone buy/sell signals', correct:true },
      { id:'b', text:'Standalone signals to trade blindly', correct:false },
      { id:'c', text:'A replacement for risk management', correct:false },
      { id:'d', text:'A guarantee of profitable trades', correct:false } ] },
  { chapterTitle: 'TA + SA Together', question: 'Why combine Technical Analysis with Sentiment Analysis?',
    answers: [
      { id:'a', text:'SA can flag exhaustion in the data before price confirms — higher-conviction reads', correct:true },
      { id:'b', text:'So you can stop using stop losses', correct:false },
      { id:'c', text:'Because TA alone never works', correct:false },
      { id:'d', text:'To trade more often regardless of quality', correct:false } ] },
  { chapterTitle: 'Ichimoku — Edge to Edge', question: 'The Ichimoku "edge-to-edge" idea refers to:',
    answers: [
      { id:'a', text:'Price entering the cloud (Kumo) and travelling to its opposite edge', correct:true },
      { id:'b', text:'Trading only when price is far from the cloud', correct:false },
      { id:'c', text:'Ignoring the cloud entirely', correct:false },
      { id:'d', text:'A pattern unrelated to Ichimoku', correct:false } ] },

  /* ── Chart-reading questions (engine guarantees a quota of these per attempt) ── */
  { chapterTitle: 'Liquidity Engineering',
    question: 'Price wicked sharply below the obvious support (marked) and closed back above it on the same candle. This is best read as:',
    chart: { type:'candlestick', labels: ltLabels(10),
      ohlc: ltCandles(110, [{ to:94, bars:5 }, { to:98, bars:2 }, { to:94, bars:2 }], { seed: 361, wick: 0.4 }).concat([[94, 95, 87, 96]]),
      markLines: [{ yAxis: 94, label: 'Support', color: '#ff2e88' }] },
    answers: [
      { id:'a', text:'A liquidity grab / swing failure — stops swept, bias flips long', correct:true },
      { id:'b', text:'A confirmed breakdown to short into', correct:false },
      { id:'c', text:'A meaningless wick to ignore', correct:false },
      { id:'d', text:'Proof that support is permanently broken', correct:false } ] },

  { chapterTitle: 'Swing Failure Pattern',
    question: 'Price spiked above the prior swing high (marked) on a long upper wick, then closed back below it. This Swing Failure Pattern suggests:',
    chart: { type:'candlestick', labels: ltLabels(11),
      ohlc: ltCandles(86, [{ to:104, bars:4 }, { to:96, bars:3 }, { to:104, bars:3 }], { seed: 363, wick: 0.4 }).concat([[104, 103, 103, 111]]),
      markLines: [{ yAxis: 104, label: 'Prior Swing High', color: '#ff2e88' }] },
    answers: [
      { id:'a', text:'Liquidity above was grabbed — bias flips short', correct:true },
      { id:'b', text:'A confirmed breakout to long', correct:false },
      { id:'c', text:'Nothing actionable', correct:false },
      { id:'d', text:'The high will be exceeded again immediately', correct:false } ] },

  { chapterTitle: 'Stops as Liquidity',
    question: 'Price has tapped the same high twice, leaving equal highs (marked). In Liquidity Theory these most likely represent:',
    chart: { type:'candlestick', labels: ltLabels(11),
      ohlc: ltCandles(90, [{ to:100, bars:3 }, { to:92, bars:3 }, { to:100, bars:3 }, { to:94, bars:2 }], { seed: 364, wick: 0.4 }),
      markLines: [{ yAxis: 100, label: 'Equal Highs', color: '#ff2e88' }] },
    answers: [
      { id:'a', text:'Resting liquidity above — a pool of stops/orders that may be targeted', correct:true },
      { id:'b', text:'Permanent resistance that will never break', correct:false },
      { id:'c', text:'A meaningless coincidence', correct:false },
      { id:'d', text:'A signal to short with no stop', correct:false } ] },

  { chapterTitle: 'Under / Over',
    question: 'Price broke below the level (marked), reclaimed it, and is now retesting it from above. This bullish Under-Over sets up:',
    chart: { type:'candlestick', labels: ltLabels(10),
      ohlc: ltCandles(102, [{ to:96, bars:3 }, { to:91, bars:2 }, { to:100, bars:3 }, { to:97, bars:2 }], { seed: 366, wick: 0.4 }),
      markLines: [{ yAxis: 96, label: 'Reclaimed Level', color: '#00d4d4' }] },
    answers: [
      { id:'a', text:'A long on the reclaim/retest — the breakdown was a liquidity grab', correct:true },
      { id:'b', text:'A short — the level is broken for good', correct:false },
      { id:'c', text:'Nothing — wait for a new low', correct:false },
      { id:'d', text:'A breakout short below the level', correct:false } ] },

  { chapterTitle: 'Market Structure Shift',
    question: 'In a downtrend, price has now broken above the most recent lower high (marked). This change of character signals:',
    chart: { type:'candlestick', labels: ltLabels(11),
      ohlc: ltCandles(112, [{ to:98, bars:3 }, { to:104, bars:2 }, { to:92, bars:3 }, { to:106, bars:3 }], { seed: 367, wick: 0.4 }),
      markLines: [{ yAxis: 104, label: 'Last Lower High', color: '#00d4d4' }] },
    answers: [
      { id:'a', text:'A potential shift from bearish to bullish structure', correct:true },
      { id:'b', text:'Trend continuation lower', correct:false },
      { id:'c', text:'Nothing — downtrends never shift', correct:false },
      { id:'d', text:'A guaranteed top is in', correct:false } ] },

  /* ── Additional concept questions (broaden the pool beyond the original 12) ── */
  { chapterTitle: 'Open Interest',
    question: 'Price is falling while open interest rises sharply. This most likely reflects:',
    answers: [
      { id:'a', text:'Aggressive new shorts opening — fuel for a squeeze if price reverses', correct:true },
      { id:'b', text:'Longs quietly taking profit', correct:false },
      { id:'c', text:'Nothing — OI and price are unrelated', correct:false },
      { id:'d', text:'A guaranteed crash', correct:false } ] },

  { chapterTitle: 'Cumulative Delta',
    question: 'Price makes a new high but cumulative delta does not. This divergence suggests:',
    answers: [
      { id:'a', text:'The new high lacks aggressive buying behind it — possible exhaustion', correct:true },
      { id:'b', text:'Very strong buying conviction', correct:false },
      { id:'c', text:'A data error to ignore', correct:false },
      { id:'d', text:'Guaranteed continuation higher', correct:false } ] },

  { chapterTitle: 'Futures Basis',
    question: 'A large positive futures basis (futures trading well above spot) reflects:',
    answers: [
      { id:'a', text:'Crowded, leveraged long positioning — a potential reversal risk', correct:true },
      { id:'b', text:'Heavily bearish positioning', correct:false },
      { id:'c', text:'No useful information', correct:false },
      { id:'d', text:'That spot is about to be delisted', correct:false } ] },

  { chapterTitle: 'Liquidation Levels',
    question: 'Clusters of leveraged longs share similar liquidation prices below. Price is often drawn toward them because:',
    answers: [
      { id:'a', text:'Those liquidations are resting liquidity that can trigger in a cascade', correct:true },
      { id:'b', text:'Liquidations repel price away from them', correct:false },
      { id:'c', text:'They are completely irrelevant to price', correct:false },
      { id:'d', text:'Exchanges keep them perfectly hidden', correct:false } ] },

  { chapterTitle: 'Combining Sentiment Data',
    question: 'The strongest Liquidity Theory setups tend to occur when:',
    answers: [
      { id:'a', text:'A technical level, liquidity, and several sentiment variables all align', correct:true },
      { id:'b', text:'A single indicator flashes a signal', correct:false },
      { id:'c', text:'Funding alone is at an extreme', correct:false },
      { id:'d', text:'Price is far from any meaningful level', correct:false } ] },

  { chapterTitle: 'Course 4 in Context',
    question: 'The Course 4 framework is best understood as:',
    answers: [
      { id:'a', text:'An advanced, optional lens built on the fundamentals of Courses 1–3', correct:true },
      { id:'b', text:'A replacement for risk management', correct:false },
      { id:'c', text:'A guaranteed-profit system', correct:false },
      { id:'d', text:'The only valid way to trade', correct:false } ] },

  { chapterTitle: 'Applying Sentiment',
    question: 'Positioning data (funding, open interest, liquidations) is most useful for:',
    answers: [
      { id:'a', text:'Gauging crowd positioning and where it may unwind — context, not a standalone trigger', correct:true },
      { id:'b', text:'Predicting exact price targets', correct:false },
      { id:'c', text:'Replacing the chart entirely', correct:false },
      { id:'d', text:'Timing entries to the exact second', correct:false } ] }
];
