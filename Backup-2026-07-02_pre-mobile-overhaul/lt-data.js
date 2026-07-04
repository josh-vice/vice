/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Course 1
   lt-data.js  |  All 13 chapter content, chart data, quiz questions
   ═══════════════════════════════════════════════════════════════════════════

   Chart OHLC format: [open, close, low, high]  (ECharts candlestick standard)

   Each chapter has:
     id, title, tag, module
     intro  { heading, body, bullets[] }
     lesson { heading, body, bullets[] }
     introChart  { title, labels[], ohlc[], type, markLines[], markAreas[], markPoints[] }
     lessonChart { ... }

     ADAPTIVE TEMPLATE — introChart/lessonChart may set `format` to choose how the
     visual slot renders (default 'chart' = candlestick/line):
       format: 'concept' → conceptCardHtml: honest diagram for non-price topics.
                { title, steps:[{label,desc?,icon?}], cycle?, cycleLabel?,
                  checklist:[string|{text}], note? }  — use when the subject is an
                idea/process (mindset, workflow), not price, so no fake OHLC is invented.
       format: 'tool'    → reserved for an annotated UI-mock (exchange screens, etc.).
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

const LT_CHAPTERS = [

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 1 — Understanding Price Action
     Module 1 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 0,
    title: "Understanding Price Action",
    tag: "Module 1 · Session 1",
    module: "Price Action Foundations",
    videoUrl: "https://www.youtube.com/embed/hbQ6Pvauixs",

    // Shown beside this opening chapter's Introduction as the Course 1 overview.
    roadmap: {
      title: "Five Modules — Reading Raw Price",
      sub: "The arc of Course 1",
      icon: "route",
      stops: [
        { label: "Supply and Demand",        desc: "Market participants, the basics of price action, and support & resistance" },
        { label: "Identifying trends",       desc: "Trending vs. range-bound markets — and telling them apart" },
        { label: "Market structure",         desc: "Highs, lows, and the skeleton price moves through" },
        { label: "Time frame analysis",      desc: "Which timeframe to trade — and how to chart watch effectively" },
        { label: "Risk management",          desc: "Sizing trades, reaching profitability, and the math and statistics behind it" }
      ]
    },

    intro: {
      heading: "What Is Price Action?",
      body: "Price action is the foundation of every trading decision. Each candlestick on a chart is a snapshot of the battle between buyers and sellers — who won, by how much, and how convincingly. Before you can read supply and demand, identify trends, or manage risk, you must learn to read individual candles.",
      bullets: [
        "Price Action (PA) illustrates the psychology of all market participants",
        "Candlestick charts show Open, High, Low, and Close — the full story of a session",
        "The body shows who finished in control; the wicks show how hard the other side fought",
        "Large bodies = conviction · Small bodies = indecision · Long wicks = exhaustion"
      ]
    },

    lesson: {
      heading: "The Language of Candlesticks",
      body: "Every candlestick contains four pieces of information. Master the relationship between the body and wicks and you can decode any chart.",
      bullets: [
        "<strong>Marubozu</strong> — Almost no wicks. One party dominated the entire session. Maximum conviction.",
        "<strong>Spinning Top / Doji</strong> — Tiny body, equal wicks. Total indecision. Neither party won.",
        "<strong>Hammer</strong> — Long lower wick, small body at TOP of candle, at the <em>bottom</em> of a downtrend. Seller exhaustion — buyers stepped in hard.",
        "<strong>Shooting Star</strong> — Long upper wick, small body at BOTTOM of candle, at the <em>top</em> of an uptrend. Buyer exhaustion — sellers stepped in hard.",
        "<strong>Dragonfly Doji</strong> — Long lower wick, no body. Sellers completely rejected — very bullish signal.",
        "<strong>Gravestone Doji</strong> — Long upper wick, no body. Buyers completely rejected — very bearish signal.",
        "<strong>Inverted Hammer</strong> — Long upper wick, small body at BOTTOM of move. Context-dependent; watch next candle.",
        "<strong>Context always matters</strong> — the same candle shape at the top of a trend vs. the bottom tells completely different stories."
      ]
    },

    introChart: {
      title: "Candlestick Variety — 20 Sessions",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18","D19","D20"],
      ohlc: [
        [50,54,49,54],   // bullish
        [54,51,50,55],   // small bearish, upper wick
        [51,51,48,54],   // doji
        [51,56,50,57],   // bullish
        [56,60,55,61],   // bullish
        [60,57,56,67],   // shooting star (long upper wick, small lower wick)
        [57,53,52,58],   // bearish
        [53,50,49,54],   // bearish
        [50,52,43,53],   // hammer (long lower wick, small body at TOP)
        [52,54,51,55],   // recovery
        [54,58,53,59],   // bullish
        [58,57,57,65],   // gravestone doji (long upper wick, no body)
        [57,54,53,58],   // bearish
        [54,54,47,55],   // dragonfly doji (long lower wick, no body)
        [54,58,54,59],   // bullish
        [58,64,58,64],   // marubozu (no wicks)
        [64,60,59,65],   // bearish — rally rolls over
        [60,56,55,61],   // bearish — the decline the inverted hammer prints into
        [56,57,55.5,62], // inverted hammer (long upper wick, small body, at BOTTOM of the decline)
        [57,61,56,62]    // bullish confirmation
      ],
      markPoints: [ { dataIndex: 18, label: "Inverted Hammer", position: "top" },
        { dataIndex: 0,  label: "Bullish",     position: "top"    },
        { dataIndex: 2,  label: "Doji",         position: "top"    },
        { dataIndex: 5,  label: "Shooting ★",   position: "top"    },
        { dataIndex: 8,  label: "Hammer",       position: "bottom" },
        { dataIndex: 11, label: "Gravestone",   position: "top"    },
        { dataIndex: 13, label: "Dragonfly",    position: "bottom" },
        { dataIndex: 15, label: "Marubozu",     position: "top"    }
      ]
    },

    lessonChart: {
      title: "Wicks Tell the Story",
      type: "candlestick",
      // An uptrend runs into a long upper wick (buyers exhausted); price rolls over into a
      // downtrend that bottoms on a long lower wick (sellers exhausted), then recovers.
      labels: ltLabels(16),
      ohlc: ltCandles(94, [{ to: 112, bars: 5 }], { seed: 5, wick: 0.4 })
        .concat([[112, 110, 109, 119]])                                   // shooting star — buyers exhausted
        .concat(ltCandles(110, [{ to: 99, bars: 5 }], { seed: 8, wick: 0.4 }))
        .concat([[99, 101, 92, 102]])                                     // hammer — sellers exhausted
        .concat(ltCandles(101, [{ to: 111, bars: 4 }], { seed: 12, wick: 0.4 })),
      markPoints: [
        { dataIndex: 5,  label: "Buyers exhausted",  position: "top"    },
        { dataIndex: 11, label: "Sellers exhausted", position: "bottom" }
      ]
    },

    quiz: {
      question: "Price has trended back down into a demand zone that buyers already defended once before. The most recent candle has a very small body and a long lower wick. What does this candlestick signal?",
      hint: "The zone produced a bounce earlier. What does a long lower wick — a hammer — at that same demand level tell you about seller momentum now?",
      style: "direction",
      answers: [
        { id: "a", text: "● Seller exhaustion — potential bullish reversal",        correct: true,  type: "bullish"  },
        { id: "b", text: "● Downtrend continuation — sellers still fully in control", correct: false, type: "bearish"  },
        { id: "c", text: "● Indecision only — cannot read direction from this alone",  correct: false, type: "neutral"  }
      ],
      chart: {
        title: "Spot the Signal — What Happens Next?",
        type: "candlestick",
        cutIndex: 22,
        labels: ltLabels(25),
        // The zone is EARNED before it's tested: price first sells into 78–87, buyers step
        // in and defend (bounce), and price rallies away — that reaction is what proves the
        // level is demand. Only THEN does price trend back down into the same zone, where a
        // hammer prints (cut here; the outcome is hidden).
        ohlc: ltCandles(118, [{ to: 81, bars: 6 }], { seed: 4, wick: 0.4 })    // first sell-off into demand
          .concat([[81, 85, 78.4, 86]])                                         // buyers defend — long lower wick, closes up
          .concat(ltCandles(85, [{ to: 119, bars: 6 }], { seed: 5, wick: 0.4 })) // rally away — demand held
          .concat(ltCandles(119, [{ to: 86, bars: 8 }], { seed: 4, wick: 0.4 })) // trend back down to the zone
          .concat([[86, 88, 79, 89]])                                           // hammer retest — most recent candle
          .concat(ltCandles(88, [{ to: 104, bars: 3 }], { seed: 9, wick: 0.4 })),
        markAreas: [
          { y0: 78, y1: 87, label: "Demand Zone", color: "rgba(0,212,212,0.06)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 21, label: "Hammer!", position: "bottom", color: "#00d4d4" },
        { dataIndex: 22, label: "Bounce",  position: "top",    color: "#00d4d4" }
      ],
      explanation: "The Hammer shows sellers pushed price dramatically lower (long lower wick) but buyers absorbed all that pressure and drove price back to near the open. That is textbook <strong>seller exhaustion</strong>. The subsequent three candles confirmed buyers were firmly in control.",
      rule: "Long lower wick at the bottom of a downtrend = seller exhaustion = potential long entry"
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 2 — Components of a Market
     Module 1 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 1,
    title: "Components of a Market",
    tag: "Module 1 · Session 2",
    module: "Price Action Foundations",
    videoUrl: "https://www.youtube.com/embed/lx-kTGQxhIs",

    intro: {
      heading: "Who Moves Price?",
      body: "Every market is simply a meeting place for buyers (demand) and sellers (supply). Price only moves when there's an imbalance — more aggressive buyers push price up, more aggressive sellers push it down. Your job as a trader is to identify where these imbalances exist before they play out.",
      bullets: [
        "Buyers = Demand | Sellers = Supply — price moves from imbalance between the two",
        "Demand Zone — price area where concentrated buyers push price upward",
        "Supply Zone — price area where concentrated sellers push price downward",
        "Zones are finite — they run out of buyers or sellers. That's what creates breakouts and breakdowns."
      ]
    },

    lesson: {
      heading: "Reading Supply & Demand Zones",
      body: "Supply and demand zones are the physical footprints of concentrated buying and selling. They are not precise lines — they are areas. Price will often 'ping-pong' between them until one side is exhausted.",
      bullets: [
        "<strong>Long lower wicks at demand zones</strong> = buyers stepping in aggressively",
        "<strong>Long upper wicks at supply zones</strong> = sellers stepping in aggressively",
        "<strong>Tightening consolidation</strong> between zones signals one side is running out of steam",
        "<strong>Exhaustion of demand</strong> → buyers can't hold price → breakdown through demand zone",
        "<strong>Exhaustion of supply</strong> → sellers can't hold price → breakout through supply zone",
        "Trade the bounce: buy at demand zones, sell/short at supply zones",
        "Never assume a zone holds forever — it will eventually be consumed"
      ]
    },

    introChart: {
      title: "Supply & Demand Zones in Action",
      type: "candlestick",
      // Price ping-pongs: every dip into ~82 is bought, every push into ~99 is sold. The
      // repeated reactions are what define the zones — the shaded bands just mark them.
      labels: ltLabels(22),
      ohlc: ltCandles(90, [
        { to: 99, bars: 3, reject: 2.0 }, { to: 82, bars: 4, reject: 2.0 },
        { to: 99, bars: 4, reject: 2.0 }, { to: 82, bars: 4, reject: 2.0 },
        { to: 99, bars: 4, reject: 2.0 }, { to: 88, bars: 3 }
      ], { seed: 5, wick: 0.4 }),
      markAreas: [
        { y0: 78.5, y1: 84, label: "Demand Zone", color: "rgba(0,212,212,0.07)" },
        { y0: 98, y1: 102.5, label: "Supply Zone", color: "rgba(255,46,136,0.07)" }
      ],
      markLines: [
        { yAxis: 99, label: "Supply", color: "#ff2e88" },
        { yAxis: 82, label: "Demand", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  2, label: "Supply reject", position: "top"    },
        { dataIndex:  6, label: "Demand bounce", position: "bottom" }
      ]
    },

    lessonChart: {
      title: "Wicks Confirm Zone Reactions",
      type: "candlestick",
      // The reaction candles confirm the zones are live: a long lower wick where buyers
      // defend demand, then a hand-authored rejection candle at supply — long upper wick
      // tagging the zone, small bearish body (idx 10, verified numerically).
      labels: ltLabels(15),
      ohlc: ltCandles(96, [{ to: 83, bars: 5, reject: 2.6 }], { seed: 6, wick: 0.4 })
        .concat(ltCandles(83, [{ to: 97, bars: 5 }], { seed: 10, wick: 0.4 }))
        .concat([[97, 96.2, 95.8, 101.5]])                                // rejection at supply
        .concat(ltCandles(96.2, [{ to: 89, bars: 4 }], { seed: 14, wick: 0.4 })),
      markAreas: [
        { y0: 78.5, y1: 84,    label: "Demand Zone", color: "rgba(0,212,212,0.07)" },
        { y0: 98,   y1: 102.5, label: "Supply Zone", color: "rgba(255,46,136,0.07)" }
      ],
      markPoints: [
        { dataIndex:  4, label: "Long lower wick — buyers",  position: "bottom" },
        { dataIndex: 10, label: "Long upper wick — sellers", position: "top"    }
      ]
    },

    quiz: {
      question: "Price has been in an uptrend and is pulling back to the demand zone. The last candle shows a long lower wick touching the zone. What does this tell you?",
      hint: "The long lower wick means sellers tried to push deeper but were rejected. Think about what that says about demand at this level.",
      style: "direction",
      answers: [
        { id: "a", text: "● Buyers are defending the demand zone — potential long entry",   correct: true,  type: "bullish" },
        { id: "b", text: "● Demand is failing — expect a breakdown through the zone",        correct: false, type: "bearish" },
        { id: "c", text: "● Wait — the wick alone is not enough information to act",          correct: false, type: "neutral" }
      ],
      chart: {
        title: "Pullback to Demand Zone",
        type: "candlestick",
        cutIndex: 12,
        labels: ltLabels(15),
        // A clean uptrend pulls back into the demand zone and prints a long lower wick —
        // buyers absorbing the dip (cut here). The bounce is hidden until the answer.
        ohlc: ltCandles(82, [{ to: 106, bars: 6 }], { seed: 7, wick: 0.4 })
          .concat(ltCandles(106, [{ to: 91, bars: 5 }], { seed: 11, wick: 0.4 }))
          .concat([[91, 90, 84, 92]])                                     // long lower wick into demand (cut)
          .concat(ltCandles(90, [{ to: 105, bars: 3 }], { seed: 15, wick: 0.4 })),
        markAreas: [
          { y0: 83, y1: 90, label: "Demand Zone", color: "rgba(0,212,212,0.07)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 11, label: "Buyers step in!", position: "bottom", color: "#00d4d4" },
        { dataIndex: 12, label: "Bounce",          position: "top",    color: "#00d4d4" }
      ],
      explanation: "The long lower wick at the demand zone is the market's receipt — sellers pushed price down into the zone but buyers immediately absorbed the supply and pushed price back up. This is the demand zone doing its job.",
      rule: "Long lower wicks at demand zones = buyers defending the zone. Trade with them, not against them."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 3 — Support and Resistance
     Module 1 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 2,
    title: "Support and Resistance",
    tag: "Module 1 · Session 3",
    module: "Price Action Foundations",
    videoUrl: "https://www.youtube.com/embed/jUKafxO9A4Q",

    intro: {
      heading: "The Golden Rule of S/R",
      body: "Support and resistance are the physical, visible representation of supply and demand on your chart. Support is where demand overwhelms supply — price bounces up. Resistance is where supply overwhelms demand — price bounces down. The golden rule: be a BUYER at support and a SELLER at resistance.",
      bullets: [
        "Support = price level where excess demand exists — buyers overwhelm sellers",
        "Resistance = price level where excess supply exists — sellers overwhelm buyers",
        "S/R can be horizontal (price levels) or diagonal (trend lines)",
        "Rule of Fives: each successive test weakens the level — 5th touch often leads to a break"
      ]
    },

    lesson: {
      heading: "The S/R Flip — Your Best Friend",
      body: "When resistance is broken decisively, it becomes support on the retest. When support breaks down, it becomes resistance on the retest. This 'S/R flip' is one of the most reliable and actionable patterns in all of technical analysis.",
      bullets: [
        "<strong>Breakout S/R Flip</strong> — resistance breaks → old resistance becomes new support → buy the retest",
        "<strong>Breakdown S/R Flip</strong> — support breaks → old support becomes new resistance → sell the retest",
        "The first retest of a flipped level is usually the cleanest entry",
        "Valid trend lines require at least <strong>3 touches</strong> along the line",
        "Strength of S/R is determined by volume — more buyers/sellers at that level = stronger zone",
        "More tests of a level = progressively weaker (Rule of Fives applies)",
        "S/R flips are not guaranteed — wait for the retest to hold before committing"
      ]
    },

    introChart: {
      title: "Horizontal S/R — Multiple Touches",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18","D19","D20","D21","D22","D23","D24","D25","D26"],
      // Three rallies all stall and reverse at ~108-109; two dips are both bought at
      // ~88-90. The ALIGNED swing highs and lows are what define the zones — the shaded
      // bands just label what the price action already makes obvious.
      ohlc: [
        [92,95,91,96],[95,99,94,100],[99,103,98,104],[103,107,102,108],[107,105,104,109],
        [105,101,100,106],[101,97,96,102],[97,93,92,98],[93,90,88,94],[90,91,88,93],
        [91,95,90,96],[95,100,94,101],[100,104,99,105],[104,108,103,109],[108,106,105,109],
        [106,102,101,107],[102,98,97,103],[98,94,93,99],[94,90,89,95],[90,92,88,93],
        [92,96,91,97],[96,101,95,102],[101,105,100,106],[105,108,104,109],[108,105,104,109],
        [105,102,101,106]
      ],
      markAreas: [
        { y0: 106, y1: 110, label: "Resistance", color: "rgba(255,46,136,0.10)" },
        { y0: 87,  y1: 91,  label: "Support",    color: "rgba(0,212,212,0.10)" }
      ],
      markPoints: [
        { dataIndex: 4,  label: "Rejected", position: "top"    },
        { dataIndex: 13, label: "Rejected", position: "top"    },
        { dataIndex: 23, label: "Rejected", position: "top"    },
        { dataIndex: 8,  label: "Bought",   position: "bottom" },
        { dataIndex: 18, label: "Bought",   position: "bottom" }
      ]
    },

    lessonChart: {
      title: "S/R Flip — Old Resistance Becomes Support",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18"],
      // $100 caps two rallies (clear rejections) — that's the resistance, shown. Price
      // then breaks above it decisively, pulls back to $100, and the OLD resistance now
      // holds as support: the flip is visible before any label tells you.
      ohlc: [
        [90,93,89,94],[93,97,92,98],[97,99,96,102],[99,98,97,100],[98,95,94,99],
        [95,98,94,99],[98,99,97,102],[99,97,96,100],[97,99,96,100],[99,104,98,105],
        [104,107,103,108],[107,104,103,108],[104,101,100,105],[101,100,99,102],[100,103,99,104],
        [103,107,102,108],[107,111,106,112],[111,114,110,115]
      ],
      markLines: [
        { yAxis: 100, label: "$100", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  2, label: "Resistance",       position: "top"    },
        { dataIndex:  6, label: "Rejected again",   position: "top"    },
        { dataIndex:  9, label: "Breakout",         position: "top"    },
        { dataIndex: 13, label: "Retest → Buy entry", position: "bottom" },
        { dataIndex: 14, label: "Confirmation",     position: "top"    }
      ]
    },

    quiz: {
      question: "Price was resisted at $100 three times, then broke out with a strong candle and closed at $107. It has now pulled back and is touching $100 again. What should you expect at this level?",
      hint: "The breakout closed well above $100. When price returns to test that level, what has $100 now become?",
      style: "direction",
      answers: [
        { id: "a", text: "● S/R Flip — old resistance is now support. Buy the retest.",  correct: true,  type: "bullish" },
        { id: "b", text: "● Trap — it will fall back through $100. Go short.",             correct: false, type: "bearish" },
        { id: "c", text: "● Uncertain — the level has been retested too many times.",      correct: false, type: "neutral" }
      ],
      chart: {
        title: "S/R Flip in Progress",
        type: "candlestick",
        cutIndex: 13,
        labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17"],
        // Setup (shown): $100 rejects price three times, then a strong candle breaks out
        // and closes at $107, and price has now pulled back to touch $100 again. The
        // outcome candles are hidden until the learner commits to an answer.
        ohlc: [
          [92,95,91,96],[95,98,94,99],[98,100,97,101],[100,97,96,101],[97,99,96,100],
          [99,96,95,101],[96,99,95,100],[99,100,98,101],[100,104,99,105],[104,107,103,108],
          [107,104,103,108],[104,101,100,105],[101,100,99,102],
          [100,103,99,104],[103,107,102,108],[107,112,106,113],[112,117,111,118]
        ],
        markLines: [
          { yAxis: 100, label: "$100", color: "#00d4d4" }
        ]
      },
      revealMarkPoints: [ { dataIndex: 16, label: "Confirmed $118", position: "top", color: "#00d4d4" },
        { dataIndex:  7, label: "Resistance ×3", position: "top",    color: "#ff2e88" },
        { dataIndex:  9, label: "Breakout $107", position: "top",    color: "#00d4d4" },
        { dataIndex: 12, label: "Retest $100",   position: "bottom", color: "#00d4d4" },
        { dataIndex: 13, label: "Holds!",        position: "top",    color: "#00d4d4" }
      ],
      explanation: "Once price broke convincingly above $100 and closed at $107, the supply that existed at $100 was consumed. Now there are buyers who missed the breakout waiting at $100 — they see it as cheap. Old resistance has <strong>flipped to support</strong>. The subsequent bounce to $118 confirmed the flip.",
      rule: "Broken resistance becomes support. The first retest of the flipped level is the cleanest entry."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 4 — Trending Markets
     Module 2 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 3,
    title: "Trending Markets",
    tag: "Module 2 · Session 1",
    module: "Identifying Trends",
    videoUrl: "https://www.youtube.com/embed/fLM29ArLZsI",

    intro: {
      heading: "The Trend Is Your Friend",
      body: "A trend is a sustained directional bias in price caused by an imbalance between buyers and sellers. Trading with the trend dramatically increases your probability of success. Trading against it is swimming upstream — possible, but unnecessarily hard.",
      bullets: [
        "Uptrend = Higher Highs (HH) + Higher Lows (HL) — buyers defending each pullback higher",
        "Downtrend = Lower Highs (LH) + Lower Lows (LL) — sellers capping every rally lower",
        "'The trend is your friend' — always identify the dominant trend before entering",
        "Trends are finite — they end when the opposing party gains control"
      ]
    },

    lesson: {
      heading: "Identifying Bullish & Bearish Structure",
      body: "Identifying the trend is simple: mark the swing highs and swing lows. If each successive high is higher and each successive low is higher — you're in an uptrend. Reverse this for a downtrend.",
      bullets: [
        "<strong>Uptrend confirmation</strong>: each HH creates a new swing high; each HL shows buyers defending higher ground",
        "<strong>Downtrend confirmation</strong>: each LH shows sellers capping the rally; each LL shows sellers pushing deeper",
        "<strong>No clear pattern</strong> = ranging market. Never assume a trend that isn't confirmed",
        "Higher Lows in an uptrend often occur at <strong>previous resistance that flipped to support</strong>",
        "The trend continues until the opposing side takes control — watch for the structure break that signals it",
        "Trends live inside larger trends — a 1-hour downtrend can be just a pullback in a daily uptrend; <strong>the higher timeframe takes precedence</strong>",
        "<strong>Never assume a trend continues forever</strong> — no trend is perpetual"
      ]
    },

    introChart: {
      title: "Uptrend — Higher Highs & Higher Lows",
      markLines: [ { yAxis: 89, label: "Old high → support", color: "#00d4d4" } ],
      type: "candlestick",
      // Six rising swings: every high prints above the last (HH) and every pullback
      // bottoms above the last low (HL) — the staircase that defines an uptrend. The
      // first swing pair is the baseline (SH/SL); each pair after it is a genuine HH/HL.
      // Legs widened (5-bar rises / 3-bar pullbacks) so each swing has room to breathe
      // and the HH/HL pills don't crowd. Seed 7 harness-verified: every label sits on the
      // true extreme of its swing.
      labels: ltLabels(36),
      ohlc: ltCandles(76, [
        { to: 89, bars: 5, reject: 0.8 }, { to: 82, bars: 3, reject: 0.6 },
        { to: 96, bars: 5, reject: 0.8 }, { to: 89, bars: 3, reject: 0.6 },
        { to: 104, bars: 5, reject: 0.8 }, { to: 97, bars: 3, reject: 0.6 },
        { to: 110, bars: 5, reject: 0.8 }, { to: 105, bars: 3, reject: 0.6 },
        { to: 116, bars: 4, reject: 0.8 }
      ], { seed: 7, wick: 0.25, noise: 0.15 }),
      markPoints: [
        { dataIndex: 4,  label: "SH", position: "top"    },
        { dataIndex: 7,  label: "SL", position: "bottom" },
        { dataIndex: 12, label: "HH", position: "top"    },
        { dataIndex: 15, label: "HL", position: "bottom" },
        { dataIndex: 20, label: "HH", position: "top"    },
        { dataIndex: 23, label: "HL", position: "bottom" },
        { dataIndex: 28, label: "HH", position: "top"    },
        { dataIndex: 31, label: "HL", position: "bottom" },
        { dataIndex: 35, label: "HH", position: "top"    }
      ]
    },

    lessonChart: {
      title: "Downtrend — Lower Highs & Lower Lows",
      markLines: [ { yAxis: 111, label: "Old low → resistance", color: "#ff2e88" } ],
      type: "candlestick",
      // Mirror image: every rally stalls below the prior high (LH) and every drop
      // undercuts the prior low (LL) — the staircase down. The first swing pair is the
      // baseline (SL/SH); the old swing low at 111 later caps a rally as resistance.
      labels: ltLabels(27),
      ohlc: ltCandles(120, [
        { to: 111, bars: 4, reject: 0.8 }, { to: 118, bars: 2, reject: 0.6 },
        { to: 104, bars: 4, reject: 0.8 }, { to: 111, bars: 2, reject: 0.6 },
        { to: 96, bars: 4, reject: 0.8 }, { to: 103, bars: 2, reject: 0.6 },
        { to: 88, bars: 4, reject: 0.8 }, { to: 95, bars: 2, reject: 0.6 },
        { to: 80, bars: 3, reject: 0.8 }
      ], { seed: 14, wick: 0.25, noise: 0.15 }),  // damped: every label verified the true extreme of its swing
      markPoints: [
        { dataIndex: 3,  label: "SL", position: "bottom" },
        { dataIndex: 5,  label: "SH", position: "top"    },
        { dataIndex: 9,  label: "LL", position: "bottom" },
        { dataIndex: 11, label: "LH", position: "top"    },
        { dataIndex: 15, label: "LL", position: "bottom" },
        { dataIndex: 17, label: "LH", position: "top"    },
        { dataIndex: 21, label: "LL", position: "bottom" },
        { dataIndex: 23, label: "LH", position: "top"    },
        { dataIndex: 26, label: "LL", position: "bottom" }
      ]
    },

    quiz: {
      question: "Looking at this chart, what type of market structure is shown? Identify the pattern.",
      hint: "Trace each swing high and swing low in sequence. Are successive highs getting higher or lower? Are successive lows getting higher or lower?",
      style: "direction",
      answers: [
        { id: "a", text: "● Downtrend — Lower Highs and Lower Lows (LH/LL)",           correct: true,  type: "bearish" },
        { id: "b", text: "● Uptrend — Higher Highs and Higher Lows (HH/HL)",            correct: false, type: "bullish" },
        { id: "c", text: "● Ranging — no clear trend direction confirmed",                correct: false, type: "neutral" }
      ],
      chart: {
        title: "What Is the Market Structure?",
        type: "candlestick",
        cutIndex: 18,
        labels: ltLabels(26),
        ohlc: ltCandles(112, [
          { to: 104, bars: 4, reject: 0.8 }, { to: 108, bars: 2, reject: 0.6 },
          { to: 98, bars: 4, reject: 0.8 }, { to: 102, bars: 2, reject: 0.6 },
          { to: 92, bars: 4, reject: 0.8 }, { to: 96, bars: 2, reject: 0.6 },
          { to: 84, bars: 4, reject: 0.8 }, { to: 88, bars: 2, reject: 0.6 },
          { to: 80, bars: 2, reject: 0.8 }
        ], { seed: 31, wick: 0.45 })
      },
      revealMarkPoints: [
        { dataIndex: 3,  label: "SL", position: "bottom", color: "#ff2e88" },
        { dataIndex: 5,  label: "SH", position: "top",    color: "#ff2e88" },
        { dataIndex: 9,  label: "LL", position: "bottom", color: "#ff2e88" },
        { dataIndex: 11, label: "LH", position: "top",    color: "#ff2e88" },
        { dataIndex: 15, label: "LL", position: "bottom", color: "#ff2e88" },
        { dataIndex: 17, label: "LH", position: "top",    color: "#ff2e88" },
        { dataIndex: 21, label: "LL", position: "bottom", color: "#ff2e88" },
        { dataIndex: 25, label: "LL — new low", position: "bottom", color: "#ff2e88" }
      ],
      explanation: "Each successive high is <em>lower</em> than the last (LH) and each successive low is <em>lower</em> than the last (LL). This is a textbook downtrend / <strong>bearish market structure</strong>. Sellers are firmly in control, capping every rally and pushing to new lows.",
      rule: "Lower Highs + Lower Lows = Downtrend. Trade short, not long, until structure changes."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 5 — Range-Bound Markets
     Module 2 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 4,
    title: "Range-Bound Markets",
    tag: "Module 2 · Session 2",
    module: "Identifying Trends",
    videoUrl: "https://www.youtube.com/embed/nr3a5REunRY",

    intro: {
      heading: "When Price Doesn't Trend",
      body: "Not all markets are trending. A range-bound (consolidation) market sees price oscillate between a horizontal support level and a horizontal resistance level. This is simply supply and demand in equilibrium — neither side has the edge yet. The range ends when one side wins.",
      bullets: [
        "Range High = resistance (sellers/supply zone)",
        "Range Low = support (buyers/demand zone)",
        "Multiple touches of either level confirm the range is valid",
        "Consolidation phases typically precede a significant move — breakout (bullish) or breakdown (bearish)"
      ]
    },

    lesson: {
      heading: "Trading Ranges & Spotting the Break",
      body: "Inside the range: buy at range low support, sell at range high resistance. But be prepared — the range will eventually end. The Rule of Fives tells you when to be cautious.",
      bullets: [
        "<strong>Buy at range low</strong> with confirmation (hammer, long lower wick, bounce candle)",
        "<strong>Sell at range high</strong> with confirmation (shooting star, upper wick, rejection candle)",
        "<strong>Rule of Fives</strong>: each retest weakens the level — the 5th touch often breaks the level",
        "<strong>Fake-outs / deviations</strong>: price briefly pierces a level then snaps back — common trap for new traders",
        "<strong>Tightening consolidation</strong>: if the range compresses inward, a breakout/breakdown is imminent",
        "<strong>Mark the range midpoint</strong> — which half price holds hints at who is in control (marked precisely with the Fibonacci tools covered later)",
        "After a breakout: old resistance becomes new support (S/R flip) — buy the retest"
      ]
    },

    introChart: {
      title: "Price Ranging Between Support & Resistance",
      type: "candlestick",
      // Three rallies all rejected at ~98, three dips all bought at ~85: price is in
      // equilibrium. The repeated, aligned touches are what make it a range.
      labels: ltLabels(26),
      ohlc: ltCandles(90, [
        { to: 98, bars: 3, reject: 0.8 }, { to: 85, bars: 4, reject: 0.8 },
        { to: 98, bars: 4, reject: 0.8 }, { to: 85, bars: 4, reject: 0.8 },
        { to: 98, bars: 4, reject: 0.8 }, { to: 85, bars: 4, reject: 0.8 },
        { to: 92, bars: 3 }
      ], { seed: 10, wick: 0.4 }),
      markAreas: [
        { y0: 97.2, y1: 99,  label: "Resistance", color: "rgba(255,46,136,0.10)" },
        { y0: 83,   y1: 86,  label: "Support",    color: "rgba(0,212,212,0.10)" }
      ],
      markPoints: [
        { dataIndex: 2,  label: "Rejected", position: "top"    },
        { dataIndex: 6,  label: "Bought",   position: "bottom" },
        { dataIndex: 18, label: "Rejected", position: "top"    },
        { dataIndex: 22, label: "Bought",   position: "bottom" }
      ]
    },

    lessonChart: {
      title: "Range With Breakout — Consolidation → Expansion",
      type: "candlestick",
      // Price coils between ~86 and ~98 for several touches, then breaks resistance,
      // pulls back to RETEST 98 as new support (the S/R flip), and expands to 110.
      labels: ltLabels(24),
      ohlc: ltCandles(90, [
        { to: 98, bars: 3, reject: 0.8 }, { to: 86, bars: 4, reject: 0.8 },
        { to: 98, bars: 4, reject: 0.8 }, { to: 86, bars: 3, reject: 0.8 },
        { to: 104, bars: 3 }, { to: 99, bars: 3, reject: 0.8 }, { to: 110, bars: 4 }
      ], { seed: 13, wick: 0.4 }),
      markLines: [
        { yAxis: 98, label: "Resistance → flips to Support", color: "#ff2e88" },
        { yAxis: 86, label: "Support",                       color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex: 15, label: "Breakout!",    position: "top"    },
        { dataIndex: 19, label: "Retest holds", position: "bottom", color: "#00d4d4" },
        { dataIndex: 23, label: "Expansion",    position: "top"    }
      ]
    },

    quiz: {
      question: "Price has been ranging for 12 sessions. It is now touching the range support (low) for the 3rd time with a hammer candle that has a long lower wick. What is the correct action?",
      hint: "You're at the range low with confirmation from the candlestick. The Rule of Fives means this level still has some strength. What does the hammer signal?",
      style: "direction",
      answers: [
        { id: "a", text: "● Buy — support is holding, target the range high",              correct: true,  type: "bullish" },
        { id: "b", text: "● Sell — the 3rd test means it's about to break down",            correct: false, type: "bearish" },
        { id: "c", text: "● Wait — accumulate more confirmations before acting",            correct: false, type: "neutral" }
      ],
      chart: {
        title: "Range Low — 3rd Test",
        type: "candlestick",
        cutIndex: 16,
        labels: ltLabels(20),
        // Two clean range cycles, then a third dip into support that prints a hammer —
        // a long lower wick piercing the zone and closing back inside (cut here). The
        // outcome (the bounce) stays hidden until the learner answers.
        ohlc: ltCandles(96, [
          { to: 85, bars: 3, reject: 1.5 }, { to: 96, bars: 4, reject: 0.8 },
          { to: 85, bars: 3, reject: 1.5 }, { to: 96, bars: 3, reject: 0.8 },
          { to: 88, bars: 2 }
        ], { seed: 17, wick: 0.4 })
          .concat([[88, 90, 81.8, 91]])                                     // 3rd test: bullish hammer at support
          .concat(ltCandles(90, [{ to: 96, bars: 4 }], { seed: 19, wick: 0.4 })),
        markLines: [
          { yAxis: 96, label: "Resistance (range high)",    color: "#ff2e88" },
          { yAxis: 85, label: "Support (3rd)", color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 81.5, y1: 86, label: "Support Zone", color: "rgba(0,212,212,0.08)" }
        ]
      },
      revealMarkPoints: [ { dataIndex: 19, label: "Target hit — range high $96", position: "top", color: "#ffcc00" },
        { dataIndex: 15, label: "Hammer · 3rd test", position: "bottom", color: "#00d4d4" },
        { dataIndex: 17, label: "Bounce",            position: "top",    color: "#00d4d4" }
      ],
      explanation: "A hammer at range support is exactly the entry you're looking for inside a range. The long lower wick shows sellers pushed price into the support zone but buyers immediately rejected them. This is the 3rd test — still well within the Rule of Fives, so the level retains strength. Target: range high at $96.",
      rule: "Buy at range low with candle confirmation. Sell at range high. Rule of Fives: 5th touch often breaks."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 6 — What Is Market Structure?
     Module 3 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 5,
    title: "What Is Market Structure?",
    tag: "Module 3 · Session 1",
    module: "Market Structure",
    videoUrl: "https://www.youtube.com/embed/1OfaKpSl8YI",

    intro: {
      heading: "The Framework for Directional Bias",
      body: "Market Structure (MS) is the framework you use to determine whether the market is in an uptrend, downtrend, or ranging phase — and where it is within that trend. Reading it is called market structure analysis (MSA). It's built entirely from swing points: the significant highs and lows that define the rhythm of price.",
      bullets: [
        "Swing High = a high greater than all immediately surrounding highs",
        "Swing Low = a low lower than all immediately surrounding lows",
        "Bullish MS = each new swing high is higher (HH) and each swing low is higher (HL)",
        "Bearish MS = each new swing high is lower (LH) and each swing low is lower (LL)"
      ]
    },

    lesson: {
      heading: "Reading Swing Points & Market Rhythm",
      body: "Swing points are the skeletal structure of any chart. Mark them correctly and the market reveals its intentions. Focus on HIGH TIMEFRAME swing points — they carry the most weight.",
      bullets: [
        "A new <strong>swing high</strong> is confirmed when price breaks above the previous swing high",
        "A new <strong>swing low</strong> is confirmed when price breaks below the previous swing low",
        "<strong>Bullish MS</strong>: buyers defend at Higher Lows; every new high expands the uptrend",
        "<strong>Bearish MS</strong>: sellers cap at Lower Highs; every new low expands the downtrend",
        "S/R flips occur precisely at swing point levels — making them prime entry zones",
        "<strong>HTF swing points carry more weight</strong> than LTF swing points — always check the higher frame",
        "Market structure breaks are the most important events to identify — a break can <strong>extend</strong> the current structure or <strong>shift</strong> it from bullish to bearish (and vice versa)"
      ]
    },

    introChart: {
      title: "Swing Highs & Swing Lows — Market Skeleton",
      type: "candlestick",
      // The zig-zag of swing highs and swing lows is the skeleton of a trend — here each
      // swing high and each swing low steps higher: the signature of bullish structure.
      // Legs widened (5-bar rises / 3-bar pullbacks) so each swing is clearly separated;
      // seed 7 harness-verified every label sits on the true extreme of its swing.
      labels: ltLabels(29),
      ohlc: ltCandles(80, [
        { to: 90, bars: 5, reject: 0.8 }, { to: 86, bars: 3, reject: 0.6 },
        { to: 96, bars: 5, reject: 0.8 }, { to: 92, bars: 3, reject: 0.6 },
        { to: 102, bars: 5, reject: 0.8 }, { to: 98, bars: 3, reject: 0.6 },
        { to: 107, bars: 5, reject: 0.8 }
      ], { seed: 7, wick: 0.25, noise: 0.15 }),
      markPoints: [
        { dataIndex: 4,  label: "Swing High", position: "top"    },
        { dataIndex: 7,  label: "Swing Low",  position: "bottom" },
        { dataIndex: 12, label: "Swing High", position: "top"    },
        { dataIndex: 15, label: "Swing Low",  position: "bottom" },
        { dataIndex: 20, label: "Swing High", position: "top"    },
        { dataIndex: 23, label: "Swing Low",  position: "bottom" },
        { dataIndex: 28, label: "Swing High", position: "top"    }
      ]
    },

    lessonChart: {
      title: "Bullish Market Structure — HH + HL Sequence",
      type: "candlestick",
      // Every swing high prints above the last (HH) and every pullback holds above the
      // prior low (HL) — the textbook bullish sequence.
      labels: ltLabels(16),
      ohlc: ltCandles(85, [
        { to: 96, bars: 3, reject: 0.8 }, { to: 91, bars: 2, reject: 0.6 },
        { to: 103, bars: 3, reject: 0.8 }, { to: 98, bars: 2, reject: 0.6 },
        { to: 110, bars: 3, reject: 0.8 }, { to: 105, bars: 2, reject: 0.6 },
        { to: 112, bars: 1 }
      ], { seed: 12, wick: 0.25, noise: 0.15 }),  // damped: HH/HL labels verified; final candle holds above the last HL
      markPoints: [
        { dataIndex: 2,  label: "HH", position: "top"    },
        { dataIndex: 4,  label: "HL", position: "bottom" },
        { dataIndex: 7,  label: "HH", position: "top"    },
        { dataIndex: 9,  label: "HL", position: "bottom" },
        { dataIndex: 12, label: "HH", position: "top"    },
        { dataIndex: 14, label: "HL", position: "bottom" }
      ]
    },

    quiz: {
      question: "Price made a new swing high at $114. It has now pulled back to $107. Is this a Higher Low maintaining bullish structure, or a sign of structural weakness?",
      hint: "The previous swing low was around $103. Has price broken below that? What does a Higher Low mean for trend continuation?",
      style: "direction",
      answers: [
        { id: "a", text: "● Higher Low — bullish market structure is maintained",               correct: true,  type: "bullish" },
        { id: "b", text: "● Lower Low — bearish reversal is now in play",                        correct: false, type: "bearish" },
        { id: "c", text: "● Structure break — need more data before determining bias",           correct: false, type: "neutral" }
      ],
      chart: {
        title: "Pullback After Swing High — HL or LL?",
      markLines: [ { yAxis: 103, label: "Prev swing low $103", color: "#00d4d4" }, { yAxis: 114, label: "Swing high $114", color: "#00d4d4" } ],
        type: "candlestick",
        cutIndex: 12,
        labels: ltLabels(14),
        // Uptrend to a swing high at $114, then a pullback. The prior swing low was $103 —
        // does this dip hold above it (HL, bullish) or break it (LL)? Outcome hidden.
        ohlc: ltCandles(96, [
          { to: 108, bars: 4, reject: 0.8 }, { to: 103, bars: 2, reject: 0.6 },
          { to: 114, bars: 4, reject: 0.8 }, { to: 107, bars: 2 }
        ], { seed: 27, wick: 0.4 })
          .concat(ltCandles(107, [{ to: 113, bars: 2 }], { seed: 28, wick: 0.4 })),
        markAreas: []
      },
      revealMarkPoints: [
        { dataIndex: 5,  label: "Prev low $103", position: "bottom", color: "#00d4d4" },
        { dataIndex: 9,  label: "HH $114",       position: "top",    color: "#00d4d4" },
        { dataIndex: 11, label: "HL $107",       position: "bottom", color: "#00d4d4" },
        { dataIndex: 12, label: "HL holds!",     position: "top",    color: "#00d4d4" }
      ],
      explanation: "The previous swing low was at $103. The pullback only reached $107 before bouncing — holding well above the prior swing low, so price did <em>not</em> make a new low below $103. This is a <strong>Higher Low</strong>, which confirms bullish market structure is intact. Bulls are defending at a higher level than the last pullback.",
      rule: "HL confirms bullish MS. Price must break the previous swing low to invalidate the uptrend."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 7 — Identifying Market Structure
     Module 3 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 6,
    title: "Identifying Market Structure",
    tag: "Module 3 · Session 2",
    module: "Market Structure",
    videoUrl: "https://www.youtube.com/embed/bz5NO9P9nGE",
    // Bespoke interactive section (its own step after the Introduction) — the
    // Market-Structure Builder drill (lt-msbuilder.js). Charts untouched.
    demo: {
      kind: "msbuilder",
      label: "Structure Builder",
      after: "intro",
      heading: "Build the Structure Ladder Yourself",
      body: "The chart plays out one candle at a time. Your job: click every candle you believe is a <strong>swing high</strong> or <strong>swing low</strong>. The lab grades each call, labels the swing (HH, HL, LH, LL), connects the ladder as you build it, and keeps a running structure read beneath the chart.",
      bullets: [
        "Press <strong>Play</strong> to let the tape run, or <strong>Step</strong> to advance candle by candle — pause any time a candle looks like a turning point",
        "A swing only confirms once <strong>two candles close either side</strong> of it — the lab won't accept a call before the market has confirmed the turn",
        "Clicks are forgiving: within one candle of the true swing still counts",
        "The read line is the payoff — HH + HL intact means bullish structure; the moment that ladder breaks, so does the long bias"
      ]
    },

    intro: {
      heading: "Expansion, Contraction & Continuation",
      body: "Market structure is dynamic. After consolidation, price either expands bullishly, contracts bearishly, or continues the existing trend. Knowing which is happening tells you which direction to trade and where to place your entries.",
      bullets: [
        "Consolidation → Bullish Expansion = HH + HL forms = go long",
        "Consolidation → Bearish Contraction = LH + LL forms = go short",
        "Consolidation → Continuation = existing trend resumes after a pause",
        "S/R flips are visible at every expansion and contraction — they are your entry zones"
      ]
    },

    lesson: {
      heading: "Expansion, Contraction & the S/R Flip",
      body: "The most reliable sequence: range → fake-out → impulse → S/R flip. Price typically deviates slightly to take out stop losses before the real move begins. The S/R flip that follows the expansion/contraction is your highest-quality entry.",
      bullets: [
        "<strong>Bullish expansion</strong>: impulse breaks above resistance → creates HH → old resistance becomes support",
        "<strong>Bearish contraction</strong>: impulse breaks below support → creates LL → old support becomes resistance",
        "The deviation (fake-out) before the real move is designed to shake out weak hands",
        "First test of the new S/R flip after expansion = cleanest, lowest-risk entry",
        "<strong>MSA applies per timeframe</strong> — bullish on daily, bearish on 4H is not a contradiction",
        "Always confirm the direction of the higher timeframe before acting on the lower timeframe",
        "Chart time builds intuition — mark every swing point you see and review your calls"
      ]
    },

    introChart: {
      title: "Consolidation → Bullish Expansion",
      type: "candlestick",
      // Price coils in a tight range, repeatedly capped at 100 and defended at 90, until
      // one push finally breaks out and expands — the consolidation resolves into a new HH.
      labels: ltLabels(20),
      ohlc: ltCandles(94, [
        { to: 100, bars: 2, reject: 0.6 }, { to: 90, bars: 3, reject: 0.6 },
        { to: 100, bars: 3, reject: 0.6 }, { to: 90, bars: 3, reject: 0.6 },
        { to: 100, bars: 3, reject: 0.6 }, { to: 113, bars: 6 }
      ], { seed: 31, wick: 0.4 }),
      markLines: [
        { yAxis: 100, label: "Resistance", color: "#ff2e88" },
        { yAxis: 90,  label: "Support",    color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 89, y1: 100, label: "Consolidation", color: "rgba(255,255,255,0.012)" }
      ],
      markPoints: [
        { dataIndex: 10, label: "Support holds", position: "bottom", color: "#00d4d4" },
        { dataIndex: 14, label: "Expansion!",    position: "top" },
        { dataIndex: 19, label: "New HH",        position: "top" }
      ]
    },

    lessonChart: {
      title: "Expansion + S/R Flip Retest → Long Entry",
      type: "candlestick",
      // Price tests 100 as resistance, a deviation sweeps the prior swing low (stop hunt),
      // then price reclaims, breaks out, and pulls back to RETEST 100 — old resistance now
      // holds as support (the S/R flip). That first retest on the line is the entry.
      labels: ltLabels(20),
      ohlc: ltCandles(97, [
        { to: 100, bars: 3, reject: 0.8 }, { to: 95, bars: 2, reject: 0.6 },
        { to: 92, bars: 2, reject: 1.5 }, { to: 100, bars: 3, reject: 0.6 },
        { to: 109, bars: 3 }, { to: 100, bars: 3, reject: 0.6 }, { to: 118, bars: 4 }
      ], { seed: 35, wick: 0.4 }),
      markLines: [ { yAxis: 87, label: "Stop — below the swept low", color: "#ff2e88" },  // sweep lows print 88.99/87.54 — the stop sits under BOTH (verified)
        { yAxis: 100, label: "S/R Flip Level", color: "#00d4d4" }
      ],
      markPoints: [ { dataIndex: 6, label: "Deviation — stop hunt", position: "bottom" },
        { dataIndex: 10, label: "Breakout",         position: "top"    },
        { dataIndex: 15, label: "S/R flip — entry", position: "bottom", color: "#00d4d4" },
        { dataIndex: 19, label: "+18%",             position: "top",    color: "#00d4d4" }
      ]
    },

    quiz: {
      question: "Price has been consolidating for 12 sessions between a support zone (~$90) and resistance zone (~$100). The most recent candle broke out above $100 with a large body. What type of market structure event is this?",
      hint: "Price coiled in a range and then broke decisively above the resistance zone. Think about what HH/HL structure begins to form now.",
      style: "direction",
      answers: [
        { id: "a", text: "● Bullish Expansion — new Higher High forming above resistance",   correct: true,  type: "bullish" },
        { id: "b", text: "● Bearish trap / fake-out — expect price to snap back into range", correct: false, type: "bearish" },
        { id: "c", text: "● Continuation of the range — not enough evidence to call a break", correct: false, type: "neutral" }
      ],
      chart: {
        title: "Breakout From Consolidation",
        type: "candlestick",
        // cutIndex 14 (was 12): the question says "the most recent candle broke out above
        // $100" — at 12 the last visible candle still sat ON range support, hiding the
        // breakout the stem asserts (P0, AUDIT-COURSE1 L08).
        cutIndex: 14,
        labels: ltLabels(16),
        // Twelve sessions coiling between 90 support and 100 resistance; the last visible
        // candle sits at range support — the learner must PREDICT the break. The breakout
        // above $100 and its follow-through stay hidden until the answer.
        ohlc: ltCandles(94, [
          { to: 100, bars: 2, reject: 0.6 }, { to: 90, bars: 3, reject: 0.6 },
          { to: 100, bars: 3, reject: 0.6 }, { to: 90, bars: 4, reject: 0.6 },
          { to: 104, bars: 2 }, { to: 117, bars: 2 }
        ], { seed: 49, wick: 0.4 }),
        markLines: [
          { yAxis: 100, label: "Resistance (Breaks!)", color: "#ff2e88" },
          { yAxis:  90, label: "Support",              color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 89, y1: 100, label: "Consolidation Zone", color: "rgba(255,255,255,0.015)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 13, label: "Breakout — new HH", position: "top", color: "#00d4d4" },
        { dataIndex: 15, label: "+17%",              position: "top", color: "#00d4d4" }
      ],
      explanation: "A decisive breakout above resistance with a large bullish body is a <strong>bullish expansion</strong> event — the consolidation phase has ended and a new Higher High is being established. Sellers in the range have been absorbed. Bullish market structure (HH + HL) is now in play.",
      rule: "Breakout from consolidation = bullish expansion. Watch for S/R flip retest at $100 for the cleanest long entry."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 8 — Timeframes
     Module 4 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 7,
    title: "Timeframes",
    tag: "Module 4 · Session 1",
    module: "Time Frame Analysis",
    videoUrl: "https://www.youtube.com/embed/ea3Upvs-Csg",

    intro: {
      heading: "Macro vs. Micro — Where You Start Matters",
      body: "Every chart you look at is just a window into the same price action — at different zoom levels. This is time frame analysis (TFA): the timeframe you analyze determines how much context you see. The golden rule: always start with the highest timeframe and work your way down.",
      bullets: [
        "Macro (HTF) = Monthly, Weekly, Daily → position & swing trading, higher weight",
        "Micro (LTF) = 4H, 1H, 15min, 5min → day trading & scalping, entry precision",
        "HTF levels carry more weight — they represent more money, more participants",
        "Process: identify HTF bias → drop to LTF → look for entries at HTF levels"
      ]
    },

    lesson: {
      heading: "HTF First, LTF Second — Always",
      body: "The HTF chart gives you the map. The LTF chart gives you the route. Never plan a route without looking at the map first.",
      bullets: [
        "<strong>Monthly/Weekly/Daily</strong> → position trading (weeks to months) and swing trading (days to weeks)",
        "<strong>4H / 1H</strong> → day trading (intraday, close by end of day)",
        "<strong>15min / 5min / 1min</strong> → scalping (minutes, very tight risk)",
        "Mark swing points and S/R zones on the <strong>Daily</strong> chart first",
        "<strong>S/R flips carry across timeframes</strong> — resistance becomes support on a breakout, and support becomes resistance on a breakdown",
        "Drop to <strong>4H</strong> to see how price behaves around those daily levels",
        "Drop to <strong>15min</strong> for entry and stop placement at those 4H/daily levels",
        "When a <strong>macro level aligns with a micro level</strong> — that's high-confluence. Prioritize those trades.",
        "<strong>More chart time = better intuition</strong>. Use TradingView's replay tool to practice without seeing the future."
      ]
    },

    introChart: {
      title: "Daily Chart — Key HTF Levels",
      markLines: [ { yAxis: 128, label: "Daily Resistance", color: "#ff2e88" } ],
      type: "candlestick",
      tf: "1d",
      // A rising Daily staircase runs into the 128 resistance and is REJECTED — the last
      // two swing highs stall at ~126 with upper wicks tagging the line but no daily close
      // above it. The HTF level holds, exactly as the chapter teaches.
      labels: ltLabels(18),
      ohlc: ltCandles(104, [
        { to: 116, bars: 3, reject: 1.0 }, { to: 110, bars: 2, reject: 0.8 },
        { to: 121, bars: 3, reject: 1.0 }, { to: 115, bars: 2, reject: 0.8 },
        { to: 126, bars: 3, reject: 1.2 }, { to: 120, bars: 2, reject: 0.8 },
        { to: 126, bars: 3, reject: 1.2 }
      ], { seed: 31, wick: 0.4 }),
      markPoints: [
        { dataIndex:  2, label: "SH", position: "top"    },
        { dataIndex:  4, label: "SL", position: "bottom" },
        { dataIndex:  7, label: "SH", position: "top"    },
        { dataIndex:  9, label: "SL", position: "bottom" },
        { dataIndex: 12, label: "SH", position: "top"    },
        { dataIndex: 14, label: "SL", position: "bottom" },
        { dataIndex: 17, label: "Rejected", position: "top" }
      ]
    },

    lessonChart: {
      title: "15-Minute Chart — HTF Level Provides Entry",
      type: "candlestick",
      tf: "15m",
      labels: ltLabels(14, 'T'),
      // Approach leg rises toward the 4H resistance at 125; the rejection candle wicks up
      // to tag 125 but closes below — and critically stays UNDER the 126 stop, so the
      // confirming wick never stops the trade out. Price then drops cleanly.
      ohlc: ltCandles(120, [
        { to: 118,   bars: 3 },
        { to: 123.5, bars: 5 },
        { to: 124.5, bars: 2, reject: 0.6 },
        { to: 119.5, bars: 4 }
      ], { seed: 10, wick: 0.4 }),
      markLines: [ { yAxis: 126, label: "Stop Loss — above 4H level", color: "#ff2e88" },
        { yAxis: 125, label: "4H Resistance Level", color: "#ff2e88" }
      ],
      markPoints: [ { dataIndex:  9, label: "Rejection —\nupper wick at 4H", position: "top" },
        { dataIndex: 10, label: "Short Entry", position: "bottom", color: "#ff2e88" }
      ]
    },

    quiz: {
      question: "You're analyzing the 15-minute chart and see price approaching a significant horizontal level. Before taking any trade, what is the FIRST step you should take?",
      hint: "A level is only as strong as what's behind it. Where does the significance of a price level come from?",
      style: "choice",
      answers: [
        { id: "a", text: "A) Check the HTF (daily/weekly) to confirm the level's significance",    correct: true  },
        { id: "b", text: "B) Drop to the 1-minute chart for a tighter entry",                       correct: false },
        { id: "c", text: "C) The 15-minute level is sufficient — place the trade immediately",      correct: false },
        { id: "d", text: "D) Check news events to explain the level",                               correct: false }
      ],
      chart: {
        title: "15min Chart Approaching Key Level",
        type: "candlestick",
        tf: "15m",
        cutIndex: 10,
        labels: ltLabels(15, 'T'),
        ohlc: ltCandles(116, [
          { to: 124,   bars: 10 },
          { to: 124,   bars: 2, reject: 2.0 },
          { to: 119,   bars: 3 }
        ], { seed: 55, wick: 0.4 }),
        markLines: [
          { yAxis: 125, label: "Significant Level — Check HTF!", color: "#ff2e88" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 11, label: "Upper Wick\nat HTF Resistance", position: "top",  color: "#ff2e88" },
        { dataIndex: 12, label: "Rejection",                     position: "top",  color: "#ff2e88" }
      ],
      explanation: "The HTF (daily or weekly) is what gives a level its significance. A level that appears on the 15-minute chart is far more significant if it aligns with a daily swing point, S/R zone, or S/R flip. <strong>Always confirm the higher timeframe first</strong>. The 15-minute entry at a confirmed daily level captured the full move as price rejected hard from HTF resistance.",
      rule: "HTF first, always. The macro gives the bias; the micro gives the entry. Never reverse this process."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 9 — HTF Scenario
     Module 4 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 8,
    title: "HTF Scenario Analysis",
    tag: "Module 4 · Session 2",
    module: "Time Frame Analysis",
    videoUrl: "https://www.youtube.com/embed/TD3i7Rv130E",

    intro: {
      heading: "Reading the Monthly & Weekly Chart",
      body: "The monthly and weekly charts hold the most weight of any timeframe — the HTF always outranks the frames below it. When price reaches a monthly swing high or key level, the reaction can last for weeks. Learning to identify these levels is non-negotiable.",
      bullets: [
        "Monthly chart defines the macro trend — is the asset bullish, bearish, or ranging long-term?",
        "Weekly levels often align with monthly — double-confirmation makes them even stronger",
        "Long upper wicks on monthly candles at resistance = massive selling pressure",
        "Mark levels and drop to daily to see how price behaves around them"
      ]
    },

    lesson: {
      heading: "Monthly Levels Hold Weight on Daily Charts",
      body: "A support or resistance level identified on the monthly chart will be visible — and respected — on the daily chart. The process: identify the monthly level → drop to weekly → drop to daily → look for candle structure confirmation.",
      bullets: [
        "<strong>Monthly highs and lows</strong> act as major swing points — mark them first",
        "When price reaches a monthly resistance on the daily chart, look for <strong>rejection wicks</strong>",
        "Long upper wicks on daily candles AT monthly resistance = sellers are present, consider short/exit",
        "S/R flips on monthly charts are among the <strong>highest-conviction entry zones</strong> you can trade",
        "The daily chart can show multiple failed attempts at a monthly level before a breakout",
        "Practice: mark monthly levels, then look at daily candles at those exact levels — train your eye",
        "Use TradingView visibility settings to overlay monthly S/R lines on your daily chart"
      ]
    },

    introChart: {
      title: "Monthly Chart — Major Swing Points",
      type: "candlestick",
      tf: "1M",
      // 420 is tested THREE times with long upper wicks that reject just above it and
      // close under it — a monthly resistance that visibly holds before the final rollover.
      // Generic labels (not a hand-typed month array) so the engine generates a CONTINUOUS
      // per-candle "Mon 'YY" axis across the full context-expanded range — a custom array
      // leaves the +10 lead-context bars blank and the months bunch on the right.
      labels: ltLabels(14),
      ohlc: ltCandles(340, [
        { to: 372, bars: 3 },
        { to: 418, bars: 2, reject: 3 },
        { to: 392, bars: 2 },
        { to: 418, bars: 2, reject: 3 },
        { to: 398, bars: 2 },
        { to: 418, bars: 2, reject: 4 },
        { to: 396, bars: 1 }
      ], { seed: 34, wick: 0.3 }),
      markPoints: [
        { dataIndex:  4, label: "Test 1 · rejected", position: "top", color: "#ff2e88" },
        { dataIndex:  6, label: "Monthly swing low", position: "bottom" },
        { dataIndex:  8, label: "Test 2 · rejected", position: "top", color: "#ff2e88" },
        { dataIndex: 12, label: "Long Upper Wick\n= sellers defend", position: "top", color: "#ff2e88" }
      ],
      markLines: [
        { yAxis: 420, label: "Key Monthly Resistance", color: "#ff2e88" }
      ]
    },

    lessonChart: {
      title: "Daily Chart — Monthly Levels Respected",
      type: "candlestick",
      tf: "1d",
      // Approach with a mid pullback, then a rally to 419 that prints two long upper wicks
      // right under the 420 monthly resistance before a clean multi-day rejection lower.
      labels: ltLabels(18),
      ohlc: ltCandles(391, [
        { to: 410, bars: 5 },
        { to: 400, bars: 3 },
        { to: 419, bars: 4 },
        { to: 419, bars: 1, reject: 4 },
        { to: 419, bars: 1, reject: 5 },
        { to: 401, bars: 4 }
      ], { seed: 67, wick: 0.35 }),
      markLines: [
        { yAxis: 420, label: "Monthly Resistance Level", color: "#ff2e88" }
      ],
      markPoints: [
        { dataIndex: 12, label: "Upper Wick\nat Monthly R", position: "top" },
        { dataIndex: 13, label: "Rejection!",               position: "top" }
      ]
    },

    quiz: {
      question: "On the daily chart, multiple candles are forming long upper wicks at a key monthly resistance level (~$425), each closing back below the level. What does this signal?",
      hint: "Who creates upper wicks? What does it mean when they appear repeatedly at a specific level — especially a monthly resistance?",
      style: "direction",
      answers: [
        { id: "a", text: "● Sellers are defending the monthly resistance — potential short/exit",  correct: true,  type: "bearish" },
        { id: "b", text: "● Buyers are accumulating just below resistance — expect a breakout",    correct: false, type: "bullish" },
        { id: "c", text: "● Inconclusive — daily candles can't tell you anything about monthly",  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Daily Chart at Monthly Resistance",
        type: "candlestick",
        tf: "1d",
        cutIndex: 10,
        labels: ltLabels(14),
        // TWO long-upper-wick rejections (i7, i9) print at the monthly level BEFORE the
        // cut, so the visible window genuinely shows the "multiple candles" the question
        // describes. The confirmed rollover stays hidden until reveal.
        ohlc: ltCandles(400, [
          { to: 419, bars: 7 },
          { to: 421, bars: 1, reject: 5 },
          { to: 418, bars: 1 },
          { to: 419.5, bars: 1, reject: 7 },
          { to: 415, bars: 1 },
          { to: 397, bars: 3 }
        ], { seed: 71, wick: 0.35 }),
        markLines: [
          { yAxis: 424, label: "Monthly Resistance (~$425)", color: "#ff2e88" }
        ],
        markAreas: [
          { y0: 421, y1: 430, label: "Monthly Supply Zone", color: "rgba(255,46,136,0.07)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  9, label: "Long Upper Wick\n= Sellers at Monthly R", position: "top",    color: "#ff2e88" },
        { dataIndex: 10, label: "Rejection Confirmed",                      position: "top",    color: "#ff2e88" },
        { dataIndex: 13, label: "Sharp Decline",                            position: "bottom", color: "#ff2e88" }
      ],
      explanation: "Repeated long upper wicks at a monthly resistance are a high-conviction signal that <strong>sellers are actively defending that level</strong>. The monthly chart represents the heaviest-weight participants. Their selling pressure manifests as upper wicks on daily candles. This was a prime short/exit setup — price fell sharply thereafter.",
      rule: "Long upper wicks at HTF resistance = sellers defending. Don't buy into resistance. Sell it."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 10 — LTF Scenario
     Module 4 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 9,
    title: "LTF Entry Scenario",
    tag: "Module 4 · Session 3",
    module: "Time Frame Analysis",
    videoUrl: "https://www.youtube.com/embed/JUmnSxywtt4",

    intro: {
      heading: "The 4H/15min Entry Framework",
      body: "Once you've identified the macro bias from the daily chart, you drop to the 4H for structure and then to the 15-minute for precision entries. The 15-minute chart reveals exactly where buyers and sellers are positioned around the key 4H levels — giving you the cleanest entry.",
      bullets: [
        "4H chart → identify breakdown S/R flips, swing points, key levels",
        "<strong>DBS / SSR</strong> — the course's shorthand: <strong>D</strong>emand-<strong>B</strong>uyers-<strong>S</strong>upport zones below price, <strong>S</strong>eller-<strong>S</strong>upply-<strong>R</strong>esistance zones above it",
        "15min chart → find entry confirmation candles (wicks, patterns) AT the 4H levels",
        "First test of a new 4H level on the 15-minute chart = cleanest, lowest-risk entry",
        "Breakdown S/R: old support (now resistance) on retest = short entry"
      ]
    },

    lesson: {
      heading: "Short Entry at Breakdown S/R Flip",
      body: "The breakdown S/R flip is a mirror of the breakout S/R flip. Price broke below a key support level — that support is now resistance. On the 15-minute chart, when price rallies back up to test that level, you have a short entry with very clean risk.",
      bullets: [
        "<strong>Identify the 4H breakdown</strong> level — where did support break?",
        "After the breakdown, price often rallies back to <strong>retest the broken support</strong> as resistance",
        "On the 15-minute chart: look for upper wicks, shooting stars, or bearish engulfing AT the flip level",
        "Stop loss: just above the S/R flip level",
        "Target: the next significant S/R level lower",
        "The first retest is the cleanest — later retests have more uncertainty",
        "This pattern works across all timeframes — the concept scales up and down"
      ]
    },

    introChart: {
      title: "4H Chart — Breakdown S/R Flip",
      type: "candlestick",
      tf: "4h",
      labels: ltLabels(18),
      // 100 is first EARNED as support — two dips bounce off it — before it breaks. Price
      // then rallies back to retest 100 from below as new resistance (upper-wick rejection)
      // and drops. The level acts as support first, exactly as a breakdown flip requires.
      ohlc: ltCandles(103, [
        { to: 100, bars: 2, reject: 1.0 },
        { to: 106, bars: 2 },
        { to: 100, bars: 2, reject: 1.0 },
        { to: 105, bars: 2 },
        { to: 94,  bars: 3 },
        { to: 99.5, bars: 3 },
        { to: 99.5, bars: 1, reject: 1.5 },
        { to: 90,  bars: 3 }
      ], { seed: 37, wick: 0.4 }),
      markLines: [
        { yAxis: 100, label: "Breakdown S/R Flip → Now Resistance", color: "#ff2e88" }
      ],
      markPoints: [
        { dataIndex:  1, label: "Support holds", position: "bottom", color: "#00d4d4" },
        { dataIndex:  5, label: "Support holds", position: "bottom", color: "#00d4d4" },
        { dataIndex:  9, label: "BREAKDOWN!",      position: "bottom" },
        { dataIndex: 14, label: "S/R Flip Retest", position: "top"    },
        { dataIndex: 15, label: "Short Entry!",    position: "top"    }
      ]
    },

    lessonChart: {
      title: "15min Chart — Entry at 4H Breakdown SR",
      type: "candlestick",
      tf: "15m",
      labels: ltLabels(16, 'T'),   // restored — the def had lost its labels, which threw in buildCandlestickOption
      ohlc: ltCandles(91, [
        { to: 94.5, bars: 4 },
        { to: 99.5, bars: 5 },
        { to: 99.5, bars: 2, reject: 2.0 },
        { to: 88,   bars: 5 }
      ], { seed: 43, wick: 0.45 }),
      markLines: [
        { yAxis: 100, label: "Entry — 4H Breakdown SR (Resistance)", color: "#ff2e88" },
        { yAxis: 104, label: "Stop Loss — above the flip",           color: "#ff2e88" },
        { yAxis: 88,  label: "Target — next S/R level lower",        color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 98, y1: 102, label: "SR Flip Zone (Resistance)", color: "rgba(255,46,136,0.05)" }
      ],
      markPoints: [
        { dataIndex: 10, label: "Upper Wick\nat SR Flip",  position: "top"    },
        { dataIndex: 11, label: "Short Entry!",            position: "top"    },
        { dataIndex: 15, label: "Target Hit",              position: "bottom" }
      ]
    },

    quiz: {
      question: "The 4H chart broke below $100 (a key support level). On the 15-minute chart, price has now rallied back up and is touching $100 from below. What should you expect and what is the trade?",
      hint: "The support broke on the 4H. Price is now retesting it from below. What has $100 become? What's the trade setup?",
      style: "direction",
      answers: [
        { id: "a", text: "● S/R flip — $100 is now resistance. Look for a short entry here.",  correct: true,  type: "bearish" },
        { id: "b", text: "● $100 reclaimed — it's back to support. Buy the breakout upward.",  correct: false, type: "bullish" },
        { id: "c", text: "● The level is invalidated once broken — ignore it and wait.",        correct: false, type: "neutral" }
      ],
      chart: {
        title: "15min — Retesting the 4H Breakdown SR",
        type: "candlestick",
        tf: "15m",
        cutIndex: 12,
        labels: ltLabels(17, 'T'),
        ohlc: ltCandles(91, [
          { to: 95,   bars: 4 },
          { to: 99.3, bars: 8 },
          { to: 99.5, bars: 2, reject: 2.0 },
          { to: 88,   bars: 3 }
        ], { seed: 61, wick: 0.4 }),
        markLines: [
          { yAxis: 100, label: "4H Breakdown SR → Resistance Now", color: "#ff2e88" }
        ],
        markAreas: [
          { y0: 98, y1: 102, label: "SR Flip Zone (Resistance)", color: "rgba(255,46,136,0.07)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 13, label: "Upper Wick\nat SR Flip",   position: "top",    color: "#ff2e88" },
        { dataIndex: 14, label: "Short Entry",              position: "top",    color: "#ff2e88" },
        { dataIndex: 16, label: "Target Hit — next support (~88)",               position: "bottom", color: "#00d4d4" }
      ],
      explanation: "When support breaks on the 4H chart, that level becomes resistance. The 15-minute retest showed upper wicks at exactly $100 — sellers defending the new resistance level. This is a textbook <strong>breakdown S/R flip short entry</strong>. Clean stop above $104, target at the next support level.",
      rule: "Broken support = new resistance. First 15-minute retest at the 4H breakdown level = highest-quality short entry."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 11 — Risk Management
     Module 5 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 10,
    title: "Risk Management",
    tag: "Module 5 · Session 1",
    module: "Risk Management",
    videoUrl: "https://www.youtube.com/embed/g7EEkEWQQI4",

    intro: {
      heading: "The Most Important Skill in Trading",
      body: "Risk management is the single most critical skill for becoming a long-term profitable trader. Technical analysis tells you where to enter — risk management ensures you survive long enough to benefit from being right. Without it, you're gambling.",
      bullets: [
        "Capital preservation always comes before profitability — protect the account first",
        "Risk per trade: 1–5% of portfolio",
        "Position Size = (Portfolio Value × Risk %) ÷ Stop Loss %",
        "Pre-define risk BEFORE entering — know your stop loss and target in advance"
      ]
    },

    lesson: {
      heading: "R Multiples & Position Sizing",
      body: "Every trade has a defined risk (R). How much you earn relative to that risk is your R Multiple. This single concept separates professional traders from gamblers.",
      bullets: [
        "<strong>Risk</strong> = distance from entry to stop loss in price",
        "<strong>Reward</strong> = distance from entry to target in price",
        "<strong>Risk:Reward Ratio (Triple R)</strong> = Expected Reward ÷ Risk — your expectation, set BEFORE entry",
        "Example: Entry $100, Stop $94, Target $112 → Risk = $6, Reward = $12 → RRR = 2, written <strong>1:2</strong> risk:reward",
        "<strong>R Multiple</strong> = the actual outcome ÷ actual risk, measured AFTER the trade closes — close early with $750 earned on $500 risked and your R multiple is 1.5, not the expected 2",
        "Think in <strong>percentages, not dollar amounts</strong> — scales with portfolio size",
        "<strong>Position Sizing formula</strong>: (Portfolio × Risk%) ÷ Stop Loss% = contracts/shares to buy",
        "<strong>Worked example</strong>: $10,000 portfolio × 1% risk ÷ 5% stop loss = <strong>2,000 contracts</strong>",
        "At 1% risk: takes 100 consecutive losses to go broke. Sustainability over aggression."
      ]
    },

    introChart: {
      title: "Trade Setup — Entry, Stop Loss & Target",
      type: "candlestick",
      // A real setup: price rallies, pulls back to a swing low ~96, reclaims to the $100
      // entry, retests once toward the $94 stop (which HOLDS — the stop's relevance shows),
      // then runs to the $112 target and stalls. The stop is anchored under real structure:
      // every setup low verified > 94.5, so the stop truly sits BELOW the swing low.
      labels: ltLabels(19),
      ohlc: ltCandles(90, [
        { to: 104,  bars: 5 },
        { to: 96.5, bars: 4, reject: 0.6 },
        { to: 100,  bars: 3 },
        { to: 96.5, bars: 2, reject: 0.4 },
        { to: 112,  bars: 5 }
      ], { seed: 9, wick: 0.35, noise: 0.15 }),
      markLines: [
        { yAxis: 100, label: "Entry $100",        color: "#00d4d4" },
        { yAxis:  94, label: "Stop Loss $94",     color: "#ff2e88" },
        { yAxis: 112, label: "Take Profit $112",  color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  8, label: "Swing low", position: "bottom", color: "#00d4d4" },
        { dataIndex: 11, label: "Entry",     position: "top",    color: "#00d4d4" },
        { dataIndex: 18, label: "Target",    position: "top",    color: "#ffcc00" }
      ]
    },

    lessonChart: {
      title: "Visualizing the 2:1 Risk-Reward Ratio",
      type: "candlestick",
      // Entry at $100, the retest dips into the Risk Zone (holding above the $94 stop —
      // verified: every setup low > 94.5), then price runs up and STALLS exactly at the
      // $112 target — tagging the reward ceiling rather than blowing through it.
      labels: ltLabels(19),
      ohlc: ltCandles(90, [
        { to: 104,  bars: 5 },
        { to: 96.5, bars: 4, reject: 0.6 },
        { to: 100,  bars: 3 },
        { to: 96.5, bars: 2, reject: 0.4 },
        { to: 112,  bars: 5 }
      ], { seed: 13, wick: 0.35, noise: 0.15 }),
      markLines: [
        { yAxis: 100, label: "Entry",      color: "#00d4d4" },
        { yAxis:  94, label: "Stop Loss — Risk = 6 pts",  color: "#ff2e88" },
        { yAxis: 112, label: "Target — Reward = 12 pts ↑",  color: "#ffcc00" }
      ],
      markAreas: [
        { y0: 94, y1: 100, label: "Risk Zone (-6)", color: "rgba(255,46,136,0.08)" },
        { y0: 100, y1: 112, label: "Reward Zone (+12)", color: "rgba(0,212,212,0.05)" }
      ]
    },

    quiz: {
      question: "Entry at $100. Stop Loss at $95. Target at $110. What is the Risk:Reward Ratio (Triple R) of this trade?",
      hint: "Calculate: How many dollars at risk? How many dollars potential reward? Divide reward by risk.",
      style: "choice",
      answers: [
        { id: "a", text: "A) 1:2 — risking $5 to make $10 (2R)",                     correct: true  },
        { id: "b", text: "B) 1:1 — equal risk and reward ($5 : $5)",                  correct: false },
        { id: "c", text: "C) 2:1 — risking $10 to make $5 (0.5R)",                   correct: false },
        { id: "d", text: "D) 1:3 — risking $5 to make $15",                           correct: false }
      ],
      chart: {
        title: "Calculate the R Multiple",
        type: "candlestick",
        cutIndex: 10,
        labels: ltLabels(15),
        // A dip prints a swing low near $96 (the stop anchor), price reclaims to the $100
        // entry (cut here), and on reveal the move runs up to tag the $110 target exactly.
        ohlc: ltCandles(99, [
          { to: 97, bars: 4, reject: 0.4 },
          { to: 100, bars: 6 },
          { to: 110, bars: 5 }
        ], { seed: 106, wick: 0.3 }),
        markLines: [
          { yAxis: 100, label: "Entry $100",       color: "#00d4d4" },
          { yAxis:  95, label: "Stop Loss $95",    color: "#ff2e88" },
          { yAxis: 110, label: "Target $110",      color: "#ffcc00" }
        ],
        markAreas: [
          { y0: 95,  y1: 100, label: "Risk (-$5)",    color: "rgba(255,46,136,0.08)"  },
          { y0: 100, y1: 110, label: "Reward (+$10)", color: "rgba(0,212,212,0.05)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 14, label: "Target Hit!\n+$10 (2R)", position: "top", color: "#ffcc00" }
      ],
      explanation: "Risk = $100 − $95 = <strong>$5</strong>. Reward = $110 − $100 = <strong>$10</strong>. Risk:Reward = 5:10 = <strong>1:2</strong> — an RRR of 2. You're risking one unit to potentially earn two. This is the type of asymmetric setup you should consistently seek. If you win only 40% of trades at an RRR of 2, you're profitable. (The <strong>R multiple</strong> is what you measure after the trade closes — the actual result in units of risk.)",
      rule: "Always pre-define risk before entry. Seek an RRR above 1. Ideal: an RRR of 2 or better (1:2 risk:reward)."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 12 — Achieving Profitability
     Module 5 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 11,
    title: "Achieving Profitability",
    tag: "Module 5 · Session 2",
    module: "Risk Management",
    videoUrl: "https://www.youtube.com/embed/eNFuYFTQ53E",

    intro: {
      heading: "Win Rate × R Multiple = Profitability",
      body: "Profitability in trading is not about being right all the time. It's about having a mathematical edge — your average win must outpace your average loss. The Break-Even Win Rate formula quantifies exactly what you need.",
      bullets: [
        "Break-Even Win Rate = 1 ÷ (1 + R Multiple)",
        "At 2:1 R → need only 33% win rate to break even",
        "At 3:1 R → need only 25% win rate to break even",
        "High R multiple + low win rate = profitable. Low R + low win rate = not profitable."
      ]
    },

    lesson: {
      heading: "The Math of Profitable Trading",
      body: "Understanding these relationships transforms how you think about trading. You don't need to be right most of the time — you need to make more when right than you lose when wrong.",
      bullets: [
        "<strong>Break-even formula</strong>: Required Win Rate = 1 ÷ (1 + R Multiple)",
        "R = 0.5 → need 67% win rate to break even — very hard to sustain",
        "R = 1.0 → need 50% win rate — coin flip threshold",
        "R = 2.0 → need 33% win rate — achievable for most traders",
        "R = 3.0 → need 25% win rate — you can lose 75% of trades and still profit",
        "<strong>Drawdowns compound asymmetrically</strong>: a 5% loss needs only 5.3% to recover and 20% needs 25% — but a 50% loss requires a 100% gain",
        "Losing streaks are <strong>statistically inevitable</strong> at any win rate — your system must survive them",
        "The goal is a consistent system with documented win rate and R average — <strong>journal everything</strong>"
      ]
    },

    introChart: {
      title: "Equity Curve — 40 Trades (55% Win Rate, 2:1 R, 2% Risk)",
      type: "line",
      // An HONEST curve computed from a real trade sequence: exactly 22 wins / 18 losses
      // (55%), every win +4% (2R at 2% risk), every loss −2%, compounded and rounded per
      // plotted step. It still survives two losing-streak clusters (incl. 5 losses in a
      // row, ~trades 11-15 and ~27-31, each a ~7.8% drawdown) and ends +64.8% at $16,476.
      // Sequence: WWLWWWWLWW LLLLLW WWLWWWWLWW LLLLWL LWLWLWLW — verified numerically.
      labels: ["0","2","4","6","8","10","12","14","16","18","20","22","24","26","28","30","32","34","36","38","40"],
      values: [10000,10816,11024,11924,12153,13145,12624,12124,12357,13365,13622,14734,15017,16242,15599,14981,15269,15562,15861,16166,16476],
      markLines: [
        { yAxis: 10000, label: "Starting Capital", color: "#5a5a78" },
        { yAxis: 16476, label: "High-Water Mark", color: "#ffcc00" }
      ]
    },

    lessonChart: {
      title: "Break-Even Win Rate vs R Multiple",
      type: "line",
      labels: ["0.5R","1R","1.5R","2R","2.5R","3R","4R","5R"],
      values: [67, 50, 40, 33, 29, 25, 20, 17],
      markLines: [
        { yAxis: 50, label: "50% — Coin Flip (1:1 R)", color: "#5a5a78" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "You have a trading system with a 2:1 Risk:Reward ratio (you make $2 for every $1 you risk). What is the minimum win rate required to break even with this system?",
      hint: "Apply the formula: Required Win Rate = 1 ÷ (1 + R Multiple). R = 2.",
      style: "choice",
      answers: [
        { id: "a", text: "A) 50% — you need to win half your trades",       correct: false },
        { id: "b", text: "B) 33% — win 1 in 3 trades to break even",        correct: true  },
        { id: "c", text: "C) 40% — need a bit better than a coin flip",      correct: false },
        { id: "d", text: "D) 25% — you only need 1 win in 4 trades",        correct: false }
      ],
      revealMarkPoints: [],
      explanation: "Formula: 1 ÷ (1 + 2) = 1 ÷ 3 = <strong>33.3%</strong>. With a 2:1 R system, if you win 1 trade and lose 2, your P&L is: +$2 − $1 − $1 = <strong>$0</strong>. You break even. Win more than 33% and you're profitable. This is why seeking asymmetric setups (R > 1) is so powerful — your win rate threshold drops dramatically.",
      rule: "Break-Even Win Rate = 1 ÷ (1 + R). The higher your R, the lower win rate you need to profit."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 13 — Optimizing Returns
     Module 5 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 12,
    title: "Optimizing Returns",
    tag: "Module 5 · Session 3",
    module: "Risk Management",
    videoUrl: "https://www.youtube.com/embed/WwLYeQPy9vE",

    intro: {
      heading: "Kelly Criterion, Pareto's Principle & Journaling",
      body: "Once you have a profitable edge, the next question is: how much should you risk per trade to grow capital fastest over the long run? The Kelly Criterion answers that — but its raw output is far too aggressive. This course tempers it with Pareto's Principle (the 80/20 rule), then leans on a trade journal to keep the inputs honest.",
      bullets: [
        "Kelly Criterion: K = W − (1 − W) ÷ R  (W = win rate, R = reward-to-risk ratio)",
        "K is the fraction of capital that maximizes long-term geometric growth",
        "If K ≤ 0 → do NOT take the trade. Your edge is negative.",
        "The course's method: multiply the Kelly output by 20% (Pareto) to get your actual position size"
      ]
    },

    lesson: {
      heading: "Kelly Criterion — and Why You Bet a Fraction of It",
      body: "Kelly tells you the bet size that grows capital fastest over many trades. But it assumes you know your true win rate and payoff exactly — and you don't, you estimate them. Overbetting a Kelly built on optimistic estimates leads to brutal drawdowns, so professionals trade a fraction of Kelly.",
      bullets: [
        "<strong>The formula</strong>: K = W − (1 − W) ÷ R  (W = win rate, R = reward-to-risk)",
        "<strong>Example</strong>: W = 55%, R = 3 → K = 0.55 − 0.45 ÷ 3 = 0.55 − 0.15 = <strong>0.40 (40%)</strong>",
        "<strong>Even-money shortcut</strong>: when R = 1, the formula simplifies to K = 2W − 1 (e.g., 60% win rate → 20%)",
        "<strong>Full Kelly is too aggressive</strong>: the worked example (60% win rate, 3R setups) says risk <strong>40%</strong> per trade — 'red flags should pop up in your head'",
        "<strong>Pareto's Principle (the 80/20 rule)</strong>: ~80% of your trades won't drastically move your portfolio; only ~20% become the big winners (or, unmanaged, the big losers)",
        "<strong>The course's method — multiply the modified-Kelly output by 20%</strong>: 40% × 20% = <strong>8% risk</strong> — 'the sweet spot' for position sizing (equivalent to a fifth-Kelly)",
        "Multiplying by 20% accounts for the ~80% of trades that are throwaways, giving your system time to produce results",
        "<strong>Drawdown asymmetry</strong>: losing 50% requires a 100% gain to recover — protect capital first",
        "<strong>Journal EVERY trade</strong>: entry, stop, target, risk%, actual R, screenshot — accurate stats are what make Kelly usable at all"
      ]
    },

    // The chapter's actual topics (Kelly → Pareto → position size) are a formula
    // walk, not a price chart — the concept card steps the worked example from the
    // video. (Replaced two lesson-13 charts that illustrated the wrong topics.)
    introChart: {
      format: "concept",
      title: "From Kelly to Your Position Size — the Worked Example",
      steps: [
        { label: "Start with the setup's stats", icon: "clipboard-list",
          desc: "From your journal: win rate W = 55%, and the setup pays R = 3 (three units earned per unit risked)." },
        { label: "Run the modified Kelly Criterion", icon: "calculator",
          desc: "K = W − (1 − W) ÷ R = 0.55 − 0.45 ÷ 3 = 0.40. The formula says risk 40% of the portfolio — red flags should be popping up." },
        { label: "Apply Pareto's Principle (80/20)", icon: "pie-chart",
          desc: "~80% of trades won't drastically move your portfolio; only ~20% become the big winners. So multiply the Kelly output by 20%." },
        { label: "The sweet spot: 40% × 20% = 8%", icon: "target",
          desc: "8% is the position size that accounts for the throwaway trades and gives the system time to produce results." }
      ],
      checklist: [
        "Kelly alone over-bets — it assumes your edge is known with certainty",
        "×20% (Pareto) tempers it against the ~80% of trades that go nowhere",
        "Your journal supplies the real W and R — without it the formula is guesswork"
      ],
      note: "No holy grail: the author calls this the sweet spot for HIS system — the statistics-based approach is the point."
    },

    lessonChart: {
      title: "Gain Needed to Recover vs. Drawdown Size",
      type: "line",
      // Teal line = the % gain required to recover; dashed line = the drawdown itself. The
      // gap between them IS the asymmetry — a 50% loss needs a 100% gain to get back.
      labels: ["10%","20%","30%","40%","50%","60%"],
      values: [11.1, 25.0, 42.9, 66.7, 100.0, 150.0],
      series2Label: "Drawdown Size (%)",
      series2Values: [10, 20, 30, 40, 50, 60],
      markLines: [
        { yAxis: 100, label: "50% → +100%", color: "#ff2e88" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "Your strategy wins 60% of the time on 1:1 risk/reward trades. The Kelly Criterion works out to ≈20%. Using this course's method, how should you actually size your trades?",
      hint: "With R = 1, Kelly simplifies to K = 2W − 1 = 2(0.60) − 1 = 0.20. Now bring in Pareto's Principle — what do you multiply the Kelly output by?",
      style: "choice",
      answers: [
        { id: "a", text: "Risk the full 20% on every trade — it is the mathematically optimal bet",        correct: false },
        { id: "b", text: "Multiply the Kelly output by 20% (Pareto's Principle) → risk 4% per trade",       correct: true  },
        { id: "c", text: "Risk 60% — your win rate is your position size",                                  correct: false },
        { id: "d", text: "Kelly is negative here, so you should skip the trade entirely",                    correct: false }
      ],
      revealMarkPoints: [],
      explanation: "With R = 1, Kelly simplifies to K = 2W − 1 = 2(0.60) − 1 = <strong>0.20 (20%)</strong>. But full Kelly assumes your edge is known with certainty and produces violent swings. This course's method applies <strong>Pareto's Principle</strong>: since roughly 80% of trades won't meaningfully move your portfolio, multiply the Kelly output by the remaining <strong>20%</strong> → 20% × 20% = <strong>4% risk per trade</strong> — the 'sweet spot' that gives your system time to produce results. None of this works without an honest <strong>trade journal</strong> to measure your true win rate and R.",
      rule: "Modified Kelly × 20% (Pareto) = your position size. And journal every trade — the stats are what make the formula usable."
    }
  }

]; // END LT_CHAPTERS

/* ═══════════════════════════════════════════════════════════════════════════
   FINAL EXAM QUESTIONS
   Pulled from chapter quiz data — one per chapter in order.
   ═══════════════════════════════════════════════════════════════════════════ */
/* Final-exam question POOL — authored separately from the chapter quizzes so the
   exam tests understanding rather than recall of a specific lesson. The engine
   samples EXAM_LENGTH questions at random per attempt and shuffles the options.
   Answer text is clean (no "A)"/"●" prefixes — the exam adds its own letters). */
const LT_EXAM_QUESTIONS = [
  { chapterTitle: 'Candlestick Anatomy', question: 'On a candlestick, what does a long wick (shadow) tell you?',
    answers: [
      { id:'a', text:'Price was pushed to that level but rejected before the close', correct:true },
      { id:'b', text:'Trading was halted at that price', correct:false },
      { id:'c', text:'Guaranteed continuation in the wick’s direction', correct:false },
      { id:'d', text:'Nothing — only the body carries meaning', correct:false } ] },
  { chapterTitle: 'Candlestick Patterns', question: 'A small-bodied candle with a long upper wick prints after an extended uptrend. What is it, and what does it warn of?',
    answers: [
      { id:'a', text:'A shooting star — buyers were rejected at the highs; possible bearish reversal', correct:true },
      { id:'b', text:'A hammer — bullish continuation', correct:false },
      { id:'c', text:'A marubozu — maximum bullish conviction', correct:false },
      { id:'d', text:'A spinning top that guarantees a reversal', correct:false } ] },
  { chapterTitle: 'Reading Context', question: 'Why can the same candle shape (e.g. a hammer) mean different things on different charts?',
    answers: [
      { id:'a', text:'Its location within the trend determines the signal', correct:true },
      { id:'b', text:'Candle shapes always mean the same thing regardless of location', correct:false },
      { id:'c', text:'Only the candle’s colour matters', correct:false },
      { id:'d', text:'Wick length is random and carries no information', correct:false } ] },
  { chapterTitle: 'Conviction vs Indecision', question: 'A marubozu (a candle with almost no wicks) signals:',
    answers: [
      { id:'a', text:'One side dominated the whole session — strong conviction', correct:true },
      { id:'b', text:'Total indecision between buyers and sellers', correct:false },
      { id:'c', text:'A guaranteed reversal of the prior move', correct:false },
      { id:'d', text:'Low liquidity and no real participation', correct:false } ] },
  { chapterTitle: 'Support & Resistance Flips', question: 'A support level breaks, then price rallies back up to it from below. That old level most often:',
    answers: [
      { id:'a', text:'Flips to act as resistance', correct:true },
      { id:'b', text:'Disappears and has no further effect', correct:false },
      { id:'c', text:'Becomes even stronger support than before', correct:false },
      { id:'d', text:'Guarantees an immediate bounce higher', correct:false } ] },
  { chapterTitle: 'Market Structure', question: 'Which sequence defines a bullish market structure?',
    answers: [
      { id:'a', text:'Higher highs and higher lows', correct:true },
      { id:'b', text:'Lower highs and lower lows', correct:false },
      { id:'c', text:'Equal highs and equal lows', correct:false },
      { id:'d', text:'Higher highs and lower lows', correct:false } ] },
  { chapterTitle: 'Break of Structure', question: 'In an uptrend, price fails to make a new higher high and then breaks below the prior higher low. This is best read as:',
    answers: [
      { id:'a', text:'A break of structure — a potential trend change', correct:true },
      { id:'b', text:'A routine pullback that confirms the uptrend', correct:false },
      { id:'c', text:'A grab that always reverses immediately', correct:false },
      { id:'d', text:'Meaningless unless volume triples', correct:false } ] },
  { chapterTitle: 'Timeframe Analysis', question: 'You find a setup on the 15-minute chart. Top-down analysis says your first move is to:',
    answers: [
      { id:'a', text:'Check the higher timeframe to confirm the level’s significance and bias', correct:true },
      { id:'b', text:'Drop to the 1-minute chart for a tighter entry', correct:false },
      { id:'c', text:'Trade it immediately — the 15-minute level is enough', correct:false },
      { id:'d', text:'Switch to the lowest timeframe to take more trades', correct:false } ] },
  { chapterTitle: 'Risk : Reward', question: 'Entry $100, stop $95, target $110. What is the reward-to-risk (R multiple)?',
    answers: [
      { id:'a', text:'2R — risking $5 to make $10', correct:true },
      { id:'b', text:'0.5R — risking $10 to make $5', correct:false },
      { id:'c', text:'1R — equal risk and reward', correct:false },
      { id:'d', text:'5R — risking $1 to make $5', correct:false } ] },
  { chapterTitle: 'Position Sizing', question: 'Position size should be determined primarily by:',
    answers: [
      { id:'a', text:'Your account risk % and the distance to your stop loss', correct:true },
      { id:'b', text:'How confident you feel about the trade', correct:false },
      { id:'c', text:'Always using the maximum leverage available', correct:false },
      { id:'d', text:'A fixed number of contracts regardless of stop distance', correct:false } ] },
  { chapterTitle: 'The Math of Profitability', question: 'At a 2:1 reward-to-risk ratio, roughly what win rate do you need just to break even?',
    answers: [
      { id:'a', text:'About 33%', correct:true },
      { id:'b', text:'About 50%', correct:false },
      { id:'c', text:'About 67%', correct:false },
      { id:'d', text:'About 75%', correct:false } ] },
  { chapterTitle: 'Capital Preservation', question: 'For long-term survival, a trader’s single most important priority is:',
    answers: [
      { id:'a', text:'Capital preservation — protect the account before chasing profit', correct:true },
      { id:'b', text:'Being right on as many trades as possible', correct:false },
      { id:'c', text:'Maximising position size to grow the account fast', correct:false },
      { id:'d', text:'Avoiding stop losses so you’re never shaken out', correct:false } ] },

  /* ── Chart-reading questions (engine guarantees a quota of these per attempt) ── */
  { chapterTitle: 'Candlestick Patterns',
    question: 'Price has returned to a demand zone that buyers defended earlier. The final candle has a small body and a long lower wick. What does it most likely signal?',
    chart: { type:'candlestick', labels: ltLabels(19),
      // The zone is EARNED first: price sells into 80–91, buyers defend (bounce), and price
      // rallies away — proving demand. It then returns to the SAME zone where the hammer's
      // small body sits inside the zone with a long lower wick testing the floor.
      ohlc: ltCandles(103, [{ to: 83, bars: 5 }], { seed: 301, wick: 0.4 })
        .concat([[83, 88, 80.5, 89]])
        .concat(ltCandles(88, [{ to: 104, bars: 5 }], { seed: 307, wick: 0.4 }))
        .concat(ltCandles(104, [{ to: 87, bars: 7 }], { seed: 301, wick: 0.4 }))
        .concat([[87, 90, 80, 91]]),
      markAreas: [{ y0: 80, y1: 91, label: 'Demand Zone', color: 'rgba(0,212,212,0.06)' }],
      markPoints: [{ dataIndex: 18, label: 'Hammer', position: 'bottom', color: '#00d4d4' }] },
    answers: [
      { id:'a', text:'Seller exhaustion at demand — a potential bullish reversal', correct:true },
      { id:'b', text:'Strong continuation — sellers remain fully in control', correct:false },
      { id:'c', text:'A breakout signal to go short below the zone', correct:false },
      { id:'d', text:'Nothing — a single candle never carries information', correct:false } ] },

  { chapterTitle: 'Reading Context',
    question: 'After rallying back into a supply zone that capped price earlier, the latest candle prints a long upper wick and a small body. The most likely read is:',
    chart: { type:'candlestick', labels: ltLabels(19),
      // The zone is EARNED first: price rallies into 111–121, sellers reject it, and price
      // drops away — proving supply. It then rallies back to the SAME zone where the shooting
      // star closes its body inside the zone with only the wick spiking out the top.
      ohlc: ltCandles(97, [{ to: 118, bars: 5 }], { seed: 302, wick: 0.4 })
        .concat([[118, 114, 113, 121]])
        .concat(ltCandles(114, [{ to: 99, bars: 5 }], { seed: 308, wick: 0.4 }))
        .concat(ltCandles(99, [{ to: 116, bars: 7 }], { seed: 302, wick: 0.4 }))
        .concat([[116, 113, 112, 124]]),
      markAreas: [{ y0: 111, y1: 121, label: 'Supply Zone', color: 'rgba(255,46,136,0.06)' }],
      markPoints: [{ dataIndex: 18, label: 'Shooting Star', position: 'top', color: '#ff2e88' }] },
    answers: [
      { id:'a', text:'Buyer exhaustion at supply — a potential bearish reversal', correct:true },
      { id:'b', text:'A breakout — buyers are about to run through resistance', correct:false },
      { id:'c', text:'A hammer signalling more upside', correct:false },
      { id:'d', text:'Maximum bullish conviction (a marubozu)', correct:false } ] },

  { chapterTitle: 'Market Structure',
    question: 'Read the swing highs and swing lows on this chart. How is this market structured?',
    chart: { type:'candlestick', labels: ltLabels(13),
      ohlc: ltCandles(80, [{ to:94, bars:3 }, { to:88, bars:2 }, { to:104, bars:3 }, { to:98, bars:2 }, { to:112, bars:3 }], { seed: 303, wick: 0.4 }) },
    answers: [
      { id:'a', text:'Bullish — higher highs and higher lows', correct:true },
      { id:'b', text:'Bearish — lower highs and lower lows', correct:false },
      { id:'c', text:'Ranging — equal highs and equal lows', correct:false },
      { id:'d', text:'Structure cannot be read from swings', correct:false } ] },

  { chapterTitle: 'Break of Structure',
    question: 'After an uptrend, price made a lower high and then closed below the prior higher low (the dashed level). This is best read as:',
    chart: { type:'candlestick', labels: ltLabels(15),
      ohlc: ltCandles(82, [{ to:96, bars:3 }, { to:90, bars:2 }, { to:108, bars:3 }, { to:99, bars:2 }, { to:104, bars:2 }, { to:88, bars:3 }], { seed: 304, wick: 0.4 }),
      markLines: [{ yAxis: 99, label: 'Prior Higher Low', color: '#ff2e88' }],
      markPoints: [
        { dataIndex: 11, label: 'Lower High', position: 'top',    color: '#ff2e88' },
        { dataIndex: 13, label: 'BOS',        position: 'bottom', color: '#ff2e88' } ] },
    answers: [
      { id:'a', text:'A break of structure — the uptrend is now in question', correct:true },
      { id:'b', text:'A routine pullback that confirms the uptrend', correct:false },
      { id:'c', text:'A guaranteed reversal — go short with no stop', correct:false },
      { id:'d', text:'Meaningless unless volume triples', correct:false } ] },

  { chapterTitle: 'Support & Resistance Flips',
    question: 'The dashed level held as support, then broke. Price has now rallied back up to it from below. On this retest, the level most often:',
    chart: { type:'candlestick', labels: ltLabels(16),
      // 100 is EARNED as support (two clean bounces), then breaks down decisively, then is
      // retested from below with an upper-wick rejection — a textbook support→resistance flip.
      ohlc: ltCandles(105, [
        { to: 100, bars: 2, reject: 0.4 }, { to: 107, bars: 2 },
        { to: 100, bars: 2, reject: 0.4 }, { to: 106, bars: 2 },
        { to: 93,  bars: 3 }, { to: 99, bars: 2, reject: 1.2 }, { to: 90, bars: 3 }
      ], { seed: 335, wick: 0.3 }),
      markLines: [{ yAxis: 100, label: 'Broken Support', color: '#ff2e88' }],
      markPoints: [
        { dataIndex: 1,  label: 'Support holds', position: 'bottom', color: '#00d4d4' },
        { dataIndex: 5,  label: 'Support holds', position: 'bottom', color: '#00d4d4' },
        { dataIndex: 9,  label: 'Breaks down',   position: 'bottom', color: '#ff2e88' },
        { dataIndex: 12, label: 'Retest rejects', position: 'top',   color: '#ff2e88' }
      ] },
    answers: [
      { id:'a', text:'Flips to act as resistance', correct:true },
      { id:'b', text:'Becomes even stronger support than before', correct:false },
      { id:'c', text:'Disappears and has no further effect', correct:false },
      { id:'d', text:'Guarantees an immediate breakout higher', correct:false } ] },

  { chapterTitle: 'Range-Bound Markets',
    question: 'Price has reversed repeatedly at the two highlighted boundaries and has just tagged the upper one again. In a clean range, the higher-probability play is to:',
    chart: { type:'candlestick', labels: ltLabels(19),
      // cutIndex ends the chart ON the final tag of the range high (the decision point) so
      // the auto-trail's breakout — which would contradict the "fade the high" answer — is hidden.
      cutIndex: 19,
      ohlc: ltCandles(90, [{ to:99, bars:3, reject:0.8 }, { to:83, bars:4, reject:0.8 }, { to:99, bars:4, reject:0.8 }, { to:84, bars:4, reject:0.8 }, { to:99, bars:4 }], { seed: 306, wick: 0.4 }),
      markAreas: [
        { y0: 97, y1: 101, label: 'Range High', color: 'rgba(255,46,136,0.06)' },
        { y0: 81, y1: 85,  label: 'Range Low',  color: 'rgba(0,212,212,0.06)' } ] },
    answers: [
      { id:'a', text:'Fade the high — look for shorts back toward the range low', correct:true },
      { id:'b', text:'Buy immediately — every tag of the high breaks out', correct:false },
      { id:'c', text:'Buy the high and sell the low', correct:false },
      { id:'d', text:'Avoid ranges entirely — they are untradeable', correct:false } ] },

  { chapterTitle: 'Risk : Reward',
    question: 'Entry, stop and target are marked on the chart. What is the reward-to-risk on this trade?',
    chart: { type:'candlestick', labels: ltLabels(12),
      // A real setup: price rallies to a prior high at 112 (the target), pulls back to a
      // swing low ~96 (the stop sits just under it), then bounces to the 100 entry. Risk 6,
      // reward 12 → 2:1, and every line is anchored to real structure.
      ohlc: ltCandles(90, [
        { to: 112, bars: 5, reject: 0.6 },
        { to: 96,  bars: 4, reject: 0.6 },
        { to: 100, bars: 3 }
      ], { seed: 307, wick: 0.3 }),
      markLines: [
        { yAxis: 100, label: 'Entry 100',  color: '#00d4d4' },
        { yAxis: 94,  label: 'Stop 94',    color: '#ff2e88' },
        { yAxis: 112, label: 'Target 112', color: '#ffcc00' } ],
      markAreas: [
        { y0: 94,  y1: 100, label: 'Risk (6)',   color: 'rgba(255,46,136,0.08)' },
        { y0: 100, y1: 112, label: 'Reward (12)', color: 'rgba(0,212,212,0.05)' } ],
      markPoints: [
        { dataIndex: 4,  label: 'Prior high', position: 'top',    color: '#ffcc00' },
        { dataIndex: 8,  label: 'Swing low',  position: 'bottom', color: '#00d4d4' },
        { dataIndex: 11, label: 'Entry',      position: 'top',    color: '#00d4d4' } ] },
    answers: [
      { id:'a', text:'2 to 1 — risking 6 to make 12 (2R)', correct:true },
      { id:'b', text:'1 to 2 — risking 12 to make 6 (0.5R)', correct:false },
      { id:'c', text:'1 to 1 — equal risk and reward', correct:false },
      { id:'d', text:'3 to 1 — risking 4 to make 12', correct:false } ] },

  { chapterTitle: 'Trending Markets',
    question: 'Based on the swing structure shown, a trend-following trader should be biased to:',
    chart: { type:'candlestick', labels: ltLabels(13),
      ohlc: ltCandles(112, [{ to:100, bars:3 }, { to:106, bars:2 }, { to:90, bars:3 }, { to:96, bars:2 }, { to:82, bars:3 }], { seed: 308, wick: 0.4 }) },
    answers: [
      { id:'a', text:'Sell rallies — structure is bearish (lower highs, lower lows)', correct:true },
      { id:'b', text:'Buy dips — structure is bullish', correct:false },
      { id:'c', text:'Trade both ways — this is a range', correct:false },
      { id:'d', text:'Stay flat — the trend cannot be determined here', correct:false } ] },

  /* ── Additional concept questions (broaden the pool beyond the original 12) ── */
  { chapterTitle: 'Conviction vs Indecision',
    question: 'A doji (open and close almost equal, little or no body) most directly signals:',
    answers: [
      { id:'a', text:'Indecision — buyers and sellers are in balance', correct:true },
      { id:'b', text:'Maximum bullish conviction', correct:false },
      { id:'c', text:'A guaranteed reversal', correct:false },
      { id:'d', text:'A charting error', correct:false } ] },

  { chapterTitle: 'Components of a Market',
    question: 'Why are supply and demand drawn as zones (areas) rather than single exact price lines?',
    answers: [
      { id:'a', text:'Large orders fill across an area, not at one precise price', correct:true },
      { id:'b', text:'Charts are too imprecise to draw a line', correct:false },
      { id:'c', text:'It is purely a stylistic choice', correct:false },
      { id:'d', text:'Zones and lines are identical — there is no difference', correct:false } ] },

  { chapterTitle: 'Risk Management',
    question: 'A long taken off a demand zone should generally place its protective stop:',
    answers: [
      { id:'a', text:'Just below the zone / swing low, where the idea is invalidated', correct:true },
      { id:'b', text:'At the entry price, to break even instantly', correct:false },
      { id:'c', text:'At a fixed dollar amount, ignoring structure', correct:false },
      { id:'d', text:'Above the entry, to lock in profit early', correct:false } ] },

  { chapterTitle: 'The Math of Profitability',
    question: 'A strategy’s expectancy (its long-run edge) depends on:',
    answers: [
      { id:'a', text:'Win rate and average R per trade together', correct:true },
      { id:'b', text:'Win rate alone — how often you are right', correct:false },
      { id:'c', text:'The total number of trades taken', correct:false },
      { id:'d', text:'How confident each trade feels', correct:false } ] }
];

/* ═══════════════════════════════════════════════════════════════════════════
   MODULE MAP — for sidebar module groupings
   ═══════════════════════════════════════════════════════════════════════════ */
const LT_MODULES = [
  { name: "Supply & Demand",     chapters: [0,1,2] },
  { name: "Identifying Trends",  chapters: [3,4]   },
  { name: "Market Structure",    chapters: [5,6]   },
  { name: "Time Frame Analysis", chapters: [7,8,9] },
  { name: "Risk Management",     chapters: [10,11,12] }
];
