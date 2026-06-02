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
    module: "Supply & Demand",
    videoUrl: "https://www.youtube.com/embed/hbQ6Pvauixs",

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
      title: "Candlestick Variety — 18 Sessions",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18"],
      ohlc: [
        [50,54,49,54],   // bullish
        [54,51,50,55],   // small bearish, upper wick
        [51,51,48,54],   // doji
        [51,56,50,57],   // bullish
        [56,60,55,61],   // bullish
        [60,57,53,67],   // shooting star (long upper wick)
        [57,53,52,58],   // bearish
        [53,50,49,54],   // bearish
        [50,50,43,51],   // hammer (long lower wick, tiny body)
        [50,54,50,55],   // recovery
        [54,58,53,59],   // bullish
        [58,57,57,65],   // gravestone doji (long upper wick, no body)
        [57,54,53,58],   // bearish
        [54,54,47,55],   // dragonfly doji (long lower wick, no body)
        [54,58,54,59],   // bullish
        [58,64,58,64],   // marubozu (no wicks)
        [64,64,64,72],   // inverted hammer (upper wick)
        [64,69,63,70]    // bullish continuation
      ],
      markPoints: [
        { dataIndex: 0,  label: "Marubozu",     position: "top"    },
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
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15"],
      ohlc: [
        [100,104,99,105],
        [104,102,100,108],
        [102,106,101,107],
        [106,110,105,111],
        [110,109,105,117],  // shooting star at top
        [109,104,103,110],
        [104,100,99,105],
        [100,98,92,101],    // long lower wick — seller exhaustion
        [98,102,97,103],
        [102,107,101,108],
        [107,106,103,113],  // upper wick
        [106,102,101,107],
        [102,101,95,103],   // hammer
        [101,106,100,107],
        [106,112,105,113]
      ],
      markPoints: [
        { dataIndex: 4,  label: "Buyer Exhaustion",  position: "top"    },
        { dataIndex: 7,  label: "Seller Exhaustion", position: "bottom" },
        { dataIndex: 12, label: "Hammer Signal",     position: "bottom" }
      ]
    },

    quiz: {
      question: "A downtrend has been in place for 11 sessions. The most recent candle has a very small body and a long lower wick. What does this candlestick signal?",
      hint: "Focus on the last candle. What does a long lower wick at the bottom of a downtrend tell you about seller momentum?",
      style: "direction",
      answers: [
        { id: "a", text: "● Seller exhaustion — potential bullish reversal",        correct: true,  type: "bullish"  },
        { id: "b", text: "● Downtrend continuation — sellers still fully in control", correct: false, type: "bearish"  },
        { id: "c", text: "● Indecision only — cannot read direction from this alone",  correct: false, type: "neutral"  }
      ],
      chart: {
        title: "Spot the Signal — What Happens Next?",
        type: "candlestick",
        cutIndex: 12,
        labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15"],
        ohlc: [
          [120,115,113,121],
          [115,110,108,116],
          [110,106,104,111],
          [106,102,100,107],
          [102, 98, 96,103],
          [ 98, 95, 93, 99],
          [ 95, 92, 90, 96],
          [ 92, 89, 87, 93],
          [ 89, 87, 85, 90],
          [ 87, 85, 83, 88],
          [ 85, 84, 82, 86],
          [ 84, 85, 77, 86],  // ← HAMMER (cutIndex=12, this is last shown)
          [ 85, 91, 84, 92],  // reveal: bounce begins
          [ 91, 97, 90, 98],  // reveal: strong recovery
          [ 97,104, 96,105]   // reveal: reversal confirmed
        ],
        markAreas: [
          { y0: 77, y1: 87, label: "Demand Zone", color: "rgba(0,212,212,0.06)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 11, label: "Hammer!",  position: "bottom", color: "#00d4d4" },
        { dataIndex: 12, label: "Bounce",   position: "top",    color: "#00d4d4" }
      ],
      explanation: "The Hammer shows sellers pushed price dramatically lower (long lower wick) but buyers absorbed all that pressure and drove price back to near the open. That is textbook <strong>seller exhaustion</strong>. The subsequent three candles confirmed buyers were firmly in control.",
      rule: "📌 Long lower wick at the bottom of a downtrend = seller exhaustion = potential long entry"
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
    module: "Supply & Demand",
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
      body: "Supply and demand zones are the physical footprints of institutional buying and selling. They are not precise lines — they are areas. Price will often 'ping-pong' between them until one side is exhausted.",
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
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18","D19","D20"],
      ohlc: [
        [90,95,89,96], [95,92,91,97], [92,88,87,93],
        [88,84,83,89], [84,82,80,85], [82,85,80,86],
        [85,89,84,90], [89,93,88,94], [93,97,92,98],
        [97,99,96,101],[99,96,95,100],[96,93,91,97],
        [93,89,88,94], [89,86,84,90], [86,83,81,87],
        [83,82,80,84], [82,86,80,87], [86,90,85,91],
        [90,94,89,95], [94,98,93,99]
      ],
      markAreas: [
        { y0: 79, y1: 85, label: "Demand Zone",  color: "rgba(0,212,212,0.07)"  },
        { y0: 97, y1: 102,label: "Supply Zone",  color: "rgba(204,34,34,0.07)"  }
      ],
      markPoints: [
        { dataIndex:  4, label: "Demand Bounce", position: "bottom" },
        { dataIndex: 10, label: "Supply Reject",  position: "top"   },
        { dataIndex: 15, label: "Demand Bounce", position: "bottom" }
      ]
    },

    lessonChart: {
      title: "Wicks Confirm Zone Reactions",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18"],
      ohlc: [
        [92,96,91,97], [96,99,95,102],[99,97,93,101],
        [97,94,91,98], [94,89,87,95], [89,85,83,90],
        [85,82,79,86], [82,80,78,83], [80,83,78,84],
        [83,87,82,88], [87,91,86,92], [91,95,90,96],
        [95,98,94,102],[98,96,92,100],[96,93,91,97],
        [93,90,88,94], [90,87,85,91], [87,83,81,88]
      ],
      markAreas: [
        { y0: 77, y1: 83, label: "Demand Zone", color: "rgba(0,212,212,0.07)" },
        { y0: 98, y1:103, label: "Supply Zone", color: "rgba(204,34,34,0.07)" }
      ],
      markPoints: [
        { dataIndex:  7, label: "Long Lower Wick\n= Buyers at Demand", position: "bottom" },
        { dataIndex: 13, label: "Upper Wick\n= Sellers at Supply",      position: "top"   }
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
        labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15"],
        ohlc: [
          [82,87,81,88], [87,91,86,92], [91,95,90,96],
          [95,99,94,100],[99,103,98,104],[103,106,102,107],
          [106,103,100,107],[103,99,97,104],[99,96,94,100],
          [96,92,90,97],  [92,89,87,93],  [89,88,83,90],  // ← wick at demand (cut here)
          [88,93,87,94],  [93,98,92,99],  [98,104,97,105] // reveal: bounce
        ],
        markAreas: [
          { y0: 82, y1: 89, label: "Demand Zone", color: "rgba(0,212,212,0.07)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 11, label: "Buyers Step In!",  position: "bottom", color: "#00d4d4" },
        { dataIndex: 12, label: "Bounce",           position: "top",    color: "#00d4d4" }
      ],
      explanation: "The long lower wick at the demand zone is the market's receipt — sellers pushed price down into the zone but buyers immediately absorbed the supply and pushed price back up. This is the demand zone doing its job.",
      rule: "📌 Long lower wicks at demand zones = buyers defending the zone. Trade with them, not against them."
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
    module: "Supply & Demand",
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
        "S/R flips are not guaranteed — always use the higher timeframe for confirmation"
      ]
    },

    introChart: {
      title: "Horizontal S/R — Multiple Touches",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18","D19","D20"],
      ohlc: [
        [88,93,87,106],[93,97,92,107],[97,101,96,108],
        [101,98,97,109],[98,94,93,99],[94,90,89,95],
        [90,93,89,106],[93,97,92,107],[97,101,96,108],
        [101,98,97,109],[98,95,94,99],[95,91,90,96],
        [91,94,90,106],[94,97,93,108],[97,100,96,107],
        [100,97,96,108],[97,94,93,99],[94,90,89,95],
        [90,93,89,105],[93,96,92,107]
      ],
      markLines: [
        { yAxis: 107, label: "Resistance Zone", color: "#cc2222"  },
        { yAxis:  89, label: "Support Zone",    color: "#00d4d4"  }
      ]
    },

    lessonChart: {
      title: "S/R Flip — Old Resistance Becomes Support",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18"],
      ohlc: [
        [88,92,87,93],[92,95,91,96],[95,98,94,99],
        [98,99,97,102],[99,97,96,100],[97,100,96,101],
        [100,98,97,101],[98,99,97,102],[99,102,98,103],
        [102,107,101,108],[107,111,106,112],
        [111,108,106,112],[108,104,103,109],
        [104,101,100,105],[101,103,100,104],
        [103,107,102,108],[107,111,106,112],[111,115,110,116]
      ],
      markLines: [
        { yAxis: 100, label: "S/R Flip at $100", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  9, label: "Breakout!",            position: "top"    },
        { dataIndex: 14, label: "S/R Flip Retest",      position: "bottom" },
        { dataIndex: 15, label: "Confirmed Support",    position: "bottom" }
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
        cutIndex: 12,
        labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16"],
        ohlc: [
          [90,93,89,94],[93,96,92,97],[96,98,95,99],
          [98,97,96,101],[97,99,96,101],[99,98,97,102],
          [98,101,97,102],[101,105,100,106],[105,109,104,110],
          [109,107,105,110],[107,103,102,108],
          [103,101,99,104],  // at old resistance/new support (cut)
          [101,104,100,105],[104,108,103,109],[108,113,107,114],[113,118,112,119]
        ],
        markLines: [
          { yAxis: 100, label: "S/R Level ($100)", color: "#00d4d4" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "Breakout",     position: "top",    color: "#00d4d4" },
        { dataIndex: 11, label: "Flip Retest",  position: "bottom", color: "#00d4d4" },
        { dataIndex: 12, label: "Holds!",       position: "top",    color: "#00d4d4" }
      ],
      explanation: "Once price broke convincingly above $100 and closed at $107, the supply that existed at $100 was consumed. Now there are buyers who missed the breakout waiting at $100 — they see it as cheap. Old resistance has <strong>flipped to support</strong>. The subsequent bounce to $118 confirmed the flip.",
      rule: "📌 Broken resistance becomes support. The first retest of the flipped level is the cleanest entry."
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
        "The trend continues until a new S/R flip fails — then watch for a structure break",
        "A trend within a larger trend is called a <strong>sub-trend</strong> — the higher timeframe trend always takes precedence",
        "<strong>Never assume a trend continues forever</strong> — no trend is perpetual"
      ]
    },

    introChart: {
      title: "Uptrend — Higher Highs & Higher Lows",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18"],
      ohlc: [
        [80,84,79,85],[84,81,80,85],[81,87,80,88],
        [87,85,84,89],[85,90,84,91],[90,88,87,92],
        [88,94,87,95],[94,92,91,96],[92,97,91,98],
        [97,95,94,99],[95,101,94,102],[101,99,98,103],
        [99,104,98,105],[104,102,101,106],[102,108,101,109],
        [108,106,105,110],[106,112,105,113],[112,110,109,114]
      ],
      markPoints: [
        { dataIndex:  2, label: "HL",  position: "bottom" },
        { dataIndex:  6, label: "HH",  position: "top"    },
        { dataIndex:  7, label: "HL",  position: "bottom" },
        { dataIndex: 10, label: "HH",  position: "top"    },
        { dataIndex: 11, label: "HL",  position: "bottom" },
        { dataIndex: 14, label: "HH",  position: "top"    },
        { dataIndex: 17, label: "HH",  position: "top"    }
      ]
    },

    lessonChart: {
      title: "Downtrend — Lower Highs & Lower Lows",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18"],
      ohlc: [
        [120,116,115,121],[116,119,115,122],[119,114,113,120],
        [114,111,110,115],[111,114,110,116],[114,109,108,115],
        [109,106,105,110],[106,109,105,111],[109,104,103,110],
        [104,101,100,105],[101,104,100,106],[104, 99, 98,105],
        [ 99, 96, 95,100],[ 96, 99, 95,101],[ 99, 94, 93,100],
        [ 94, 91, 90, 95],[ 91, 94, 90, 96],[ 94, 89, 88, 95]
      ],
      markPoints: [
        { dataIndex:  1, label: "LH",  position: "top"    },
        { dataIndex:  3, label: "LL",  position: "bottom" },
        { dataIndex:  5, label: "LH",  position: "top"    },
        { dataIndex:  6, label: "LL",  position: "bottom" },
        { dataIndex:  8, label: "LH",  position: "top"    },
        { dataIndex:  9, label: "LL",  position: "bottom" },
        { dataIndex: 12, label: "LL",  position: "bottom" },
        { dataIndex: 17, label: "LL",  position: "bottom" }
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
        cutIndex: 16,
        labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16"],
        ohlc: [
          [110,106,104,111],[106,109,105,111],[109,104,102,110],
          [104,101, 99,105],[101,104,100,106],[104, 99, 97,105],
          [ 99, 96, 94,100],[ 96, 99, 95,101],[ 99, 94, 92,100],
          [ 94, 91, 89, 95],[ 91, 94, 90, 96],[ 94, 89, 87, 95],
          [ 89, 86, 84, 90],[ 86, 89, 85, 91],[ 89, 84, 82, 90],
          [ 84, 81, 79, 85]
        ],
        markAreas: []
      },
      revealMarkPoints: [
        { dataIndex:  1, label: "LH", position: "top",    color: "#cc2222" },
        { dataIndex:  3, label: "LL", position: "bottom", color: "#cc2222" },
        { dataIndex:  5, label: "LH", position: "top",    color: "#cc2222" },
        { dataIndex:  6, label: "LL", position: "bottom", color: "#cc2222" },
        { dataIndex:  8, label: "LH", position: "top",    color: "#cc2222" },
        { dataIndex: 11, label: "LL", position: "bottom", color: "#cc2222" },
        { dataIndex: 15, label: "LL", position: "bottom", color: "#cc2222" }
      ],
      explanation: "Each successive high is <em>lower</em> than the last (LH) and each successive low is <em>lower</em> than the last (LL). This is a textbook downtrend / <strong>bearish market structure</strong>. Sellers are firmly in control, capping every rally and pushing to new lows.",
      rule: "📌 Lower Highs + Lower Lows = Downtrend. Trade short, not long, until structure changes."
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
        "<strong>Volume compression</strong> during consolidation → volume spike on breakout = confirmation",
        "After a breakout: old resistance becomes new support (S/R flip) — buy the retest"
      ]
    },

    introChart: {
      title: "Price Ranging Between Support & Resistance",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18","D19","D20"],
      ohlc: [
        [93,96,92,97],[96,93,92,98],[93,88,87,94],
        [88,87,85,89],[87,92,85,93],[92,96,91,97],
        [96,93,92,98],[93,89,87,94],[89,87,85,90],
        [87,93,85,94],[93,97,92,98],[97,94,92,99],
        [94,89,88,95],[89,87,85,90],[87,91,84,92],
        [91,95,90,96],[95,93,91,98],[93,88,87,94],
        [88,86,84,89],[86,91,84,92]
      ],
      markLines: [
        { yAxis: 98, label: "Range Resistance", color: "#cc2222" },
        { yAxis: 84, label: "Range Support",    color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 84, y1: 99, label: "Consolidation Range", color: "rgba(255,255,255,0.015)" }
      ]
    },

    lessonChart: {
      title: "Range With Breakout — Consolidation → Expansion",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18","D19","D20","D21","D22"],
      ohlc: [
        [95,91,89,96],[91,95,90,97],[95,92,90,96],
        [92,88,86,93],[88,87,85,90],[87,92,85,93],
        [92,96,91,98],[96,93,91,97],[93,89,87,94],
        [89,87,85,91],[87,92,85,93],[92,96,91,98],
        [96,93,91,98],[93,89,87,94],[89,87,85,91],
        [87,91,85,93],[91,96,90,97],[96,94,92,99],
        [94,96,93,100],[96,98,95,101],[98,104,97,105],
        [104,109,103,110]
      ],
      markLines: [
        { yAxis: 99, label: "Resistance → Breaks!", color: "#cc2222" },
        { yAxis: 85, label: "Support",              color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex: 20, label: "Breakout!",  position: "top" },
        { dataIndex: 21, label: "+5.7%",      position: "top" }
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
        cutIndex: 13,
        labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16"],
        ohlc: [
          [93,96,92,97],[96,93,92,98],[93,88,87,94],
          [88,87,85,89],[87,92,85,93],[92,96,91,97], // test 1 of support
          [96,93,91,98],[93,88,87,94],[88,87,85,89],
          [87,92,85,93],[92,96,91,97],[96,93,91,98],
          [93,87,82,94], // test 3: hammer wick touches support (cut here)
          [87,92,86,93],[92,97,91,98],[97,101,96,102]
        ],
        markLines: [
          { yAxis: 97, label: "Resistance",    color: "#cc2222" },
          { yAxis: 85, label: "Support (3rd)", color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 83, y1: 88, label: "Support Zone", color: "rgba(0,212,212,0.07)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 12, label: "Hammer\n3rd Test",  position: "bottom", color: "#00d4d4" },
        { dataIndex: 13, label: "Bounce",            position: "top",    color: "#00d4d4" }
      ],
      explanation: "A hammer at range support is exactly the entry you're looking for inside a range. The long lower wick shows sellers pushed price into the support zone but buyers immediately rejected them. This is the 3rd test — still well within the Rule of Fives, so the level retains strength. Target: range high at $97.",
      rule: "📌 Buy at range low with candle confirmation. Sell at range high. Rule of Fives: 5th touch often breaks."
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
      body: "Market Structure (MS) is the framework you use to determine whether the market is in an uptrend, downtrend, or ranging phase — and where it is within that trend. It's built entirely from swing points: the significant highs and lows that define the rhythm of price.",
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
        "Market structure breaks are the most important events to identify — they signal a potential trend reversal"
      ]
    },

    introChart: {
      title: "Swing Highs & Swing Lows — Market Skeleton",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18","D19","D20"],
      ohlc: [
        [80,84,79,85],[84,82,80,86],[82,88,81,89],
        [88,86,85,91],[86,91,85,92],[91,88,87,93],
        [88,93,87,94],[93,90,89,95],[90,95,89,96],
        [95,92,91,97],[92,97,91,98],[97,94,93,99],
        [94,99,93,100],[99,96,95,101],[96,101,95,102],
        [101,98,97,103],[98,103,97,104],[103,100,99,105],
        [100,105,99,106],[105,102,101,107]
      ],
      markPoints: [
        { dataIndex:  2, label: "SL",   position: "bottom" },
        { dataIndex:  5, label: "SH",   position: "top"    },
        { dataIndex:  7, label: "SL",   position: "bottom" },
        { dataIndex: 10, label: "SH",   position: "top"    },
        { dataIndex: 13, label: "SL",   position: "bottom" },
        { dataIndex: 16, label: "SH",   position: "top"    },
        { dataIndex: 18, label: "SL",   position: "bottom" },
        { dataIndex: 19, label: "SH",   position: "top"    }
      ]
    },

    lessonChart: {
      title: "Bullish Market Structure — HH + HL Sequence",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16"],
      ohlc: [
        [85,90,84,91],[90,87,86,92],[87,93,86,94],
        [93,91,90,95],[91,96,90,97],[96,93,92,98],
        [93,98,92,99],[98,95,94,100],[95,101,94,102],
        [101,98,97,103],[98,103,97,104],[103,100,99,105],
        [100,106,99,107],[106,103,102,108],[103,109,102,110],
        [109,106,105,111]
      ],
      markPoints: [
        { dataIndex:  1, label: "HL",   position: "bottom" },
        { dataIndex:  4, label: "HH",   position: "top"    },
        { dataIndex:  5, label: "HL",   position: "bottom" },
        { dataIndex:  8, label: "HH",   position: "top"    },
        { dataIndex:  9, label: "HL",   position: "bottom" },
        { dataIndex: 12, label: "HH",   position: "top"    },
        { dataIndex: 15, label: "HL",   position: "bottom" }
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
        type: "candlestick",
        cutIndex: 12,
        labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14"],
        ohlc: [
          [88,93,87,94],[93,97,92,98],[97,101,96,102],
          [101,98,97,103],[98,103,97,104],[103,107,102,108],
          [107,110,106,111],[110,108,107,112],[108,113,107,114],
          [113,110,109,115],[110,107,106,111],[107,104,103,108],
          [104,107,103,108],    // pullback, is this HL? (cut)
          [107,112,106,113]     // reveal: bounce, HL confirmed
        ],
        markAreas: []
      },
      revealMarkPoints: [
        { dataIndex:  8, label: "HH ($114)", position: "top",    color: "#00d4d4" },
        { dataIndex: 11, label: "HL ($103)", position: "bottom", color: "#00d4d4" },
        { dataIndex: 12, label: "HL holds!", position: "bottom", color: "#00d4d4" }
      ],
      explanation: "The previous swing low was at $103. The pullback only reached $103 before bouncing — price did <em>not</em> make a new low below $103. This is a <strong>Higher Low</strong>, which confirms bullish market structure is intact. Bulls are defending at a higher level than the last pullback.",
      rule: "📌 HL confirms bullish MS. Price must break the previous swing low to invalidate the uptrend."
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

    intro: {
      heading: "Expansion, Contraction & Continuation",
      body: "Market structure is dynamic. After consolidation, price either expands bullishly, contracts bearishly, or continues the existing trend. Knowing which is happening tells you which direction to trade and where to place your entries.",
      bullets: [
        "Consolidation →● Bullish Expansion = HH + HL forms = go long",
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
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18","D19","D20"],
      ohlc: [
        [95,91,89,96],[91,95,90,97],[95,92,90,96],
        [92,95,90,97],[95,92,90,97],[92,96,90,98],
        [96,93,90,97],[93,96,90,98],[96,93,90,98],
        [93,97,90,98],[97,93,90,98],[93,97,90,99],
        [97,94,90,99],[94,97,90,99],[97,96,90,100],
        [96,99,90,100],[99,96,90,100],[96,100,90,101],
        [100,107,99,108],[107,113,106,114]
      ],
      markLines: [
        { yAxis: 99, label: "Resistance Zone", color: "#cc2222" },
        { yAxis: 90, label: "Support Zone",    color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 89, y1: 100, label: "Consolidation", color: "rgba(255,255,255,0.012)" }
      ],
      markPoints: [
        { dataIndex: 18, label: "EXPANSION!",  position: "top" },
        { dataIndex: 19, label: "New HH",      position: "top" }
      ]
    },

    lessonChart: {
      title: "Expansion + S/R Flip Retest → Long Entry",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18"],
      ohlc: [
        [90,93,89,94],[93,96,92,97],[96,93,91,97],
        [93,97,92,98],[97,94,92,98],[94,97,92,99],
        [97,98,93,100],[98,95,93,100],[95,99,93,101],
        [99,104,98,105],[104,109,103,110],
        [109,106,104,110],[106,103,102,107],
        [103,101,99,104],[101,104,100,105],
        [104,108,103,109],[108,113,107,114],[113,118,112,119]
      ],
      markLines: [
        { yAxis: 100, label: "S/R Flip Level", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  9, label: "Breakout",         position: "top"    },
        { dataIndex: 13, label: "S/R Flip\n(Entry!)", position: "bottom" },
        { dataIndex: 17, label: "+18%",             position: "top"    }
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
        cutIndex: 13,
        labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16"],
        ohlc: [
          [91,94,90,95],[94,91,90,96],[91,95,90,96],
          [95,92,90,96],[92,96,90,97],[96,93,90,97],
          [93,96,90,98],[96,93,90,98],[93,96,90,99],
          [96,94,90,99],[94,97,90,100],[97,96,90,100],
          [96,103,95,104],  // BREAKOUT (cut here)
          [103,108,102,109],[108,113,107,114],[113,117,112,118]
        ],
        markLines: [
          { yAxis: 100, label: "Resistance (Breaks!)", color: "#cc2222" },
          { yAxis:  90, label: "Support",              color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 89, y1: 100, label: "Consolidation Zone", color: "rgba(255,255,255,0.015)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 12, label: "BREAKOUT!\nNew HH",  position: "top",    color: "#00d4d4" },
        { dataIndex: 15, label: "+17%",               position: "top",    color: "#00d4d4" }
      ],
      explanation: "A decisive breakout above resistance with a large bullish body is a <strong>bullish expansion</strong> event — the consolidation phase has ended and a new Higher High is being established. Sellers in the range have been absorbed. Bullish market structure (HH + HL) is now in play.",
      rule: "📌 Breakout from consolidation = bullish expansion. Watch for S/R flip retest at $100 for the cleanest long entry."
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
      body: "Every chart you look at is just a window into the same price action — at different zoom levels. The timeframe you analyze determines how much context you see. The golden rule: always start with the highest timeframe and work your way down.",
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
        "Drop to <strong>4H</strong> to see how price behaves around those daily levels",
        "Drop to <strong>15min</strong> for entry and stop placement at those 4H/daily levels",
        "When a <strong>macro level aligns with a micro level</strong> — that's high-confluence. Prioritize those trades.",
        "<strong>More chart time = better intuition</strong>. Use TradingView's replay tool to practice without seeing the future."
      ]
    },

    introChart: {
      title: "Daily Chart — Key HTF Levels",
      type: "candlestick",
      labels: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12","W13","W14","W15","W16"],
      ohlc: [
        [105,110,104,111],[110,107,106,112],[107,113,106,114],
        [113,110,109,115],[110,116,109,117],[116,113,112,118],
        [113,119,112,120],[119,115,114,120],[115,121,114,122],
        [121,117,116,122],[117,123,116,124],[123,119,118,125],
        [119,124,118,125],[124,120,119,126],[120,126,119,127],
        [126,122,121,128]
      ],
      markPoints: [
        { dataIndex:  6, label: "SH",  position: "top"    },
        { dataIndex:  7, label: "SL",  position: "bottom" },
        { dataIndex: 10, label: "SH",  position: "top"    },
        { dataIndex: 11, label: "SL",  position: "bottom" },
        { dataIndex: 14, label: "SH",  position: "top"    },
        { dataIndex: 15, label: "SL",  position: "bottom" }
      ]
    },

    lessonChart: {
      title: "15-Minute Chart — HTF Level Provides Entry",
      type: "candlestick",
      labels: ["9:00","9:15","9:30","9:45","10:00","10:15","10:30","10:45","11:00","11:15","11:30","11:45","12:00","12:15","12:30","12:45","13:00","13:15","13:30","13:45"],
      ohlc: [
        [119,121,118,122],[121,120,119,123],[120,122,119,123],
        [122,123,121,124],[123,121,120,124],[121,123,120,124],
        [123,121,120,125],[121,124,120,125],[124,122,121,126],
        [122,125,121,126],[125,123,122,127],[123,125,122,127],
        [125,124,122,128],[124,126,123,128],[126,124,123,129],
        [124,127,123,129],[127,125,124,130],[125,128,124,130],
        [128,126,125,131],[126,129,125,131]
      ],
      markLines: [
        { yAxis: 125, label: "4H Resistance Level", color: "#cc2222" }
      ],
      markPoints: [
        { dataIndex: 16, label: "Upper Wick\nat 4H Level", position: "top" },
        { dataIndex: 17, label: "Rejection",              position: "top" }
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
        cutIndex: 10,
        labels: ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12","T13","T14"],
        ohlc: [
          [116,118,115,119],[118,120,117,121],[120,119,118,122],
          [119,121,118,122],[121,120,119,123],[120,122,119,123],
          [122,121,120,124],[121,123,120,124],[123,122,121,125],
          [122,124,121,125],  // approaching the level (cut)
          [124,126,123,127],[126,123,121,128],[123,121,119,124],[121,118,116,122]
        ],
        markLines: [
          { yAxis: 125, label: "Significant Level — Check HTF!", color: "#cc2222" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 10, label: "Upper Wick\nat HTF Resistance", position: "top",  color: "#cc2222" },
        { dataIndex: 11, label: "Rejection",                     position: "top",  color: "#cc2222" }
      ],
      explanation: "The HTF (daily or weekly) is what gives a level its significance. A level that appears on the 15-minute chart is far more significant if it aligns with a daily swing point, S/R zone, or S/R flip. <strong>Always confirm the higher timeframe first</strong>. The 15-minute entry at a confirmed daily level captured the full move as price rejected hard from HTF resistance.",
      rule: "📌 HTF first, always. The macro gives the bias; the micro gives the entry. Never reverse this process."
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
      body: "The monthly and weekly charts hold the most weight of any timeframe. Major institutions, hedge funds, and central banks make decisions based on these charts. When price reaches a monthly swing high or key level, the reaction can last for weeks. Learning to identify these levels is non-negotiable.",
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
        "S/R flips on monthly charts are the <strong>highest conviction entry zones</strong> in all of trading",
        "The daily chart can show multiple failed attempts at a monthly level before a breakout",
        "Practice: mark monthly levels, then look at daily candles at those exact levels — train your eye",
        "Use TradingView visibility settings to overlay monthly S/R lines on your daily chart"
      ]
    },

    introChart: {
      title: "Monthly Chart — Major Swing Points",
      type: "candlestick",
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb"],
      ohlc: [
        [300,340,290,350],[340,310,300,355],[310,360,305,370],
        [360,330,320,375],[330,380,325,390],[380,350,340,385],
        [350,390,345,400],[390,360,350,400],[360,400,355,415],
        [400,370,360,410],[370,410,365,420],[410,380,370,415],
        [380,420,375,430],[420,390,380,425]
      ],
      markPoints: [
        { dataIndex:  4, label: "Monthly SH", position: "top"    },
        { dataIndex:  5, label: "Monthly SL", position: "bottom" },
        { dataIndex:  8, label: "Monthly SH", position: "top"    },
        { dataIndex: 12, label: "Monthly SH", position: "top"    }
      ],
      markLines: [
        { yAxis: 420, label: "Key Monthly Resistance", color: "#cc2222" }
      ]
    },

    lessonChart: {
      title: "Daily Chart — Monthly Levels Respected",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15","D16","D17","D18"],
      ohlc: [
        [390,395,388,400],[395,400,393,405],[400,404,398,410],
        [404,402,400,410],[402,406,400,411],[406,404,402,412],
        [404,408,402,413],[408,405,403,415],[405,409,403,416],
        [409,407,405,418],[407,411,405,419],[411,408,406,420],
        [408,413,406,422],[413,409,407,423],
        [409,411,406,424],[411,407,405,420],
        [407,402,400,408],[402,397,395,403]
      ],
      markLines: [
        { yAxis: 420, label: "Monthly Resistance Level", color: "#cc2222" }
      ],
      markPoints: [
        { dataIndex: 13, label: "Upper Wicks\nat Monthly R", position: "top" },
        { dataIndex: 14, label: "Rejection!",               position: "top" }
      ]
    },

    quiz: {
      question: "On the daily chart, multiple candles are forming long upper wicks at a key monthly resistance level (~$425). The most recent daily candle closed well below the level. What does this signal?",
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
        cutIndex: 10,
        labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14"],
        ohlc: [
          [395,399,393,400],[399,403,398,405],[403,407,402,408],
          [407,411,406,412],[411,414,410,416],[414,417,413,419],
          [417,415,414,421],[415,418,413,422],[418,420,414,424],
          [420,419,415,427],  // upper wick touching resistance (cut)
          [419,414,411,421],[414,409,407,416],[409,403,401,410],[403,397,395,404]
        ],
        markLines: [
          { yAxis: 424, label: "Monthly Resistance ($424)", color: "#cc2222" }
        ],
        markAreas: [
          { y0: 421, y1: 430, label: "Monthly Supply Zone", color: "rgba(204,34,34,0.07)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  9, label: "Long Upper Wick\n= Sellers at Monthly R", position: "top",    color: "#cc2222" },
        { dataIndex: 10, label: "Rejection Confirmed",                      position: "top",    color: "#cc2222" },
        { dataIndex: 13, label: "Sharp Decline",                            position: "bottom", color: "#cc2222" }
      ],
      explanation: "Repeated long upper wicks at a monthly resistance are a high-conviction signal that <strong>sellers are actively defending that level</strong>. The monthly chart represents the heaviest-weight participants. Their selling pressure manifests as upper wicks on daily candles. This was a prime short/exit setup — price fell sharply thereafter.",
      rule: "📌 Long upper wicks at HTF resistance = sellers defending. Don't buy into resistance. Sell it."
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
      labels: ["4H-1","4H-2","4H-3","4H-4","4H-5","4H-6","4H-7","4H-8","4H-9","4H-10","4H-11","4H-12","4H-13","4H-14"],
      ohlc: [
        [100,103,99,104],[103,106,102,107],[106,104,103,108],
        [104,107,103,108],[107,103,101,108],[103,97,95,104],
        [97,95,93,98],[95,92,91,96],
        [92,95,91,96],[95,98,94,99],
        [98,96,95,100],[96,99,95,101],[99,95,94,100],
        [95,91,89,96]
      ],
      markLines: [
        { yAxis: 95, label: "Breakdown S/R Flip → Now Resistance", color: "#cc2222" }
      ],
      markPoints: [
        { dataIndex:  5, label: "BREAKDOWN!",      position: "bottom" },
        { dataIndex: 12, label: "S/R Flip Retest", position: "top"    },
        { dataIndex: 13, label: "Short Entry!",    position: "top"    }
      ]
    },

    lessonChart: {
      title: "15min Chart — Entry at 4H Breakdown SR",
      type: "candlestick",
      labels: ["15m-1","15m-2","15m-3","15m-4","15m-5","15m-6","15m-7","15m-8","15m-9","15m-10","15m-11","15m-12","15m-13","15m-14","15m-15","15m-16","15m-17","15m-18"],
      ohlc: [
        [91,93,90,94],[93,95,92,96],[95,97,94,98],
        [97,99,96,100],[99,100,97,102],[100,99,97,103],
        [99,101,97,103],[101,99,97,104],[99,101,97,103],
        [101,100,97,104],[100,102,97,104],[102,100,97,105],
        [100,97,96,101],[97,94,92,98],[94,90,88,95],
        [90,87,85,91],[87,84,82,88],[84,81,79,85]
      ],
      markLines: [
        { yAxis: 100, label: "4H Breakdown SR (Resistance)", color: "#cc2222" }
      ],
      markAreas: [
        { y0: 98, y1: 103, label: "SR Flip Zone (Resistance)", color: "rgba(204,34,34,0.07)" }
      ],
      markPoints: [
        { dataIndex: 11, label: "Upper Wick\nat SR Flip",  position: "top"    },
        { dataIndex: 12, label: "Short Entry!",            position: "top"    },
        { dataIndex: 17, label: "-19% from entry",         position: "bottom" }
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
        cutIndex: 12,
        labels: ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12","T13","T14","T15"],
        ohlc: [
          [92,94,91,95],[94,97,93,98],[97,100,96,101],
          [100,98,97,102],[98,100,97,102],[100,99,97,103],
          [99,101,97,103],[101,99,97,104],[99,101,97,103],
          [101,100,97,104],[100,102,97,104],[102,100,97,105],  // at SR flip zone (cut)
          [100,97,96,101],[97,94,92,98],[94,90,88,95]
        ],
        markLines: [
          { yAxis: 100, label: "4H Breakdown SR → Resistance Now", color: "#cc2222" }
        ],
        markAreas: [
          { y0: 98, y1: 104, label: "SR Flip Zone (Resistance)", color: "rgba(204,34,34,0.07)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 11, label: "Upper Wick\nat SR Flip",   position: "top",    color: "#cc2222" },
        { dataIndex: 12, label: "Short Entry",              position: "top",    color: "#cc2222" },
        { dataIndex: 14, label: "Target Hit",               position: "bottom", color: "#00d4d4" }
      ],
      explanation: "When support breaks on the 4H chart, that level becomes resistance. The 15-minute retest showed upper wicks at exactly $100 — sellers defending the new resistance level. This is a textbook <strong>breakdown S/R flip short entry</strong>. Clean stop above $104, target at the next support level.",
      rule: "📌 Broken support = new resistance. First 15-minute retest at the 4H breakdown level = highest-quality short entry."
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
        "Risk per trade: 1–5% of portfolio (beginners: stick to 1–2%)",
        "Position Size = (Portfolio Value × Risk %) ÷ Stop Loss %",
        "Pre-define risk BEFORE entering — never move stop losses against your position"
      ]
    },

    lesson: {
      heading: "R Multiples & Position Sizing",
      body: "Every trade has a defined risk (R). How much you earn relative to that risk is your R Multiple. This single concept separates professional traders from gamblers.",
      bullets: [
        "<strong>Risk</strong> = distance from entry to stop loss in price",
        "<strong>Reward</strong> = distance from entry to target in price",
        "<strong>R Multiple</strong> = Expected Reward ÷ Risk (Risk:Reward Ratio)",
        "Example: Entry $100, Stop $95, Target $110 → Risk = $5, Reward = $10 → <strong>2:1 R</strong>",
        "Actual R Multiple = what you actually earned ÷ your actual risk (post-trade)",
        "Think in <strong>percentages, not dollar amounts</strong> — scales with portfolio size",
        "<strong>Position Sizing formula</strong>: (Portfolio × Risk%) ÷ Stop Loss% = contracts/shares to buy",
        "At 1% risk: takes 100 consecutive losses to go broke. Sustainability over aggression."
      ]
    },

    introChart: {
      title: "Trade Setup — Entry, Stop Loss & Target",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15"],
      ohlc: [
        [86,89,85,90],[89,92,88,93],[92,95,91,96],
        [95,98,94,99],[98,101,97,102],[101,99,98,103],
        [99,97,96,100],[97,100,96,101],
        [100,103,99,104],[103,107,102,108],[107,111,106,112],
        [111,114,110,115],[114,112,111,116],[112,115,111,116],[115,118,114,119]
      ],
      markLines: [
        { yAxis: 100, label: "Entry $100",        color: "#00d4d4" },
        { yAxis:  94, label: "Stop Loss $94",     color: "#cc2222" },
        { yAxis: 112, label: "Take Profit $112",  color: "#00d4d4" }
      ]
    },

    lessonChart: {
      title: "Visualizing the 2:1 Risk-Reward Ratio",
      type: "candlestick",
      labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15"],
      ohlc: [
        [86,89,85,90],[89,92,88,93],[92,95,91,96],
        [95,98,94,99],[98,101,97,102],[101,99,98,103],
        [99,97,96,100],[97,100,96,101],
        [100,103,99,104],[103,107,102,108],[107,111,106,112],
        [111,114,110,115],[114,112,111,116],[112,115,111,116],[115,118,114,119]
      ],
      markLines: [
        { yAxis: 100, label: "Entry",      color: "#00d4d4" },
        { yAxis:  94, label: "Stop Loss — Risk = 6 pts",  color: "#cc2222" },
        { yAxis: 112, label: "Target — Reward = 12 pts ↑",  color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 94, y1: 100, label: "Risk Zone (-6)", color: "rgba(204,34,34,0.07)" },
        { y0: 100, y1: 112, label: "Reward Zone (+12)", color: "rgba(0,212,212,0.05)" }
      ]
    },

    quiz: {
      question: "Entry at $100. Stop Loss at $95. Target at $110. What is the Risk:Reward Ratio (R Multiple) of this trade?",
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
        labels: ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10","D11","D12","D13","D14","D15"],
        ohlc: [
          [86,89,85,90],[89,93,88,94],[93,96,92,97],
          [96,99,95,100],[99,97,96,101],[97,100,96,101],
          [100,99,97,102],[99,102,97,103],[102,100,98,104],
          [100,101,99,103],  // at entry level (cut)
          [101,104,100,105],[104,107,103,108],[107,110,106,111],[110,108,107,112],[108,111,107,112]
        ],
        markLines: [
          { yAxis: 100, label: "Entry $100",       color: "#00d4d4" },
          { yAxis:  95, label: "Stop Loss $95",    color: "#cc2222" },
          { yAxis: 110, label: "Target $110",      color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 95,  y1: 100, label: "Risk (-$5)",    color: "rgba(204,34,34,0.07)"  },
          { y0: 100, y1: 110, label: "Reward (+$10)", color: "rgba(0,212,212,0.05)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 13, label: "Target Hit!\n+$10 (2R)", position: "top", color: "#00d4d4" }
      ],
      explanation: "Risk = $100 − $95 = <strong>$5</strong>. Reward = $110 − $100 = <strong>$10</strong>. Reward ÷ Risk = 10 ÷ 5 = <strong>2:1 (2R)</strong>. You're risking one unit to potentially earn two. This is the type of asymmetric setup you should consistently seek. If you win only 40% of trades with 2:1 R, you're profitable.",
      rule: "📌 Always pre-define risk before entry. Seek R multiples > 1. Ideal: 2:1 or better."
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
        "<strong>Drawdowns compound asymmetrically</strong>: 50% loss requires 100% gain to recover",
        "Losing streaks are <strong>statistically inevitable</strong> at any win rate — your system must survive them",
        "The goal is a consistent system with documented win rate and R average — <strong>journal everything</strong>"
      ]
    },

    introChart: {
      title: "Equity Curve — 50 Trades (55% Win Rate, 2:1 R)",
      type: "line",
      labels: ["0","5","10","15","20","25","30","35","40","45","50"],
      values: [10000,10400,10700,11200,11600,12000,12500,13100,13800,14400,15000],
      markLines: [
        { yAxis: 10000, label: "Starting Capital", color: "#5a5a78" }
      ]
    },

    lessonChart: {
      title: "Break-Even Win Rate vs R Multiple",
      type: "line",
      labels: ["0.5R","1R","1.5R","2R","2.5R","3R","4R","5R"],
      values: [67, 50, 40, 33, 29, 25, 20, 17],
      markLines: [
        { yAxis: 50, label: "50% — Coin Flip",  color: "#5a5a78" },
        { yAxis: 33, label: "33% — At 2:1 R",   color: "#00d4d4" }
      ]
    },

    quiz: {
      question: "You have a trading system with a 2:1 Risk:Reward ratio (you make $2 for every $1 you risk). What is the minimum win rate required to break even with this system?",
      hint: "Apply the formula: Required Win Rate = 1 ÷ (1 + R Multiple). R = 2.",
      style: "choice",
      answers: [
        { id: "a", text: "A) 50% — you need to win half your trades",       correct: false },
        { id: "b", text: "B) 33% — win 1 in 3 trades to break even",        correct: true  },
        { id: "c", text: "C) 40% — need a bit better than a coin flip",      correct: false },
        { id: "d", text: "D) 25% — you only need 1 win in 4 trades",        correct: false }
      ],
      chart: {
        title: "Equity Curve Context — 2:1 R System",
        type: "line",
        labels: ["0","10","20","30","40","50"],
        values: [10000,10500,11200,12100,13200,14500],
        markLines: []
      },
      revealMarkPoints: [],
      explanation: "Formula: 1 ÷ (1 + 2) = 1 ÷ 3 = <strong>33.3%</strong>. With a 2:1 R system, if you win 1 trade and lose 2, your P&L is: +$2 − $1 − $1 = <strong>$0</strong>. You break even. Win more than 33% and you're profitable. This is why seeking asymmetric setups (R > 1) is so powerful — your win rate threshold drops dramatically.",
      rule: "📌 Break-Even Win Rate = 1 ÷ (1 + R). The higher your R, the lower win rate you need to profit."
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
      heading: "Kelly Criterion, Pareto & Journaling",
      body: "Once you have a profitable edge, the next question is: how much should you risk per trade to maximize long-term growth? The Kelly Criterion provides a scientific answer. Combined with the Pareto Principle and rigorous journaling, you can build a compounding trading machine.",
      bullets: [
        "Kelly Criterion (simple): K = 2P − 1 (K = % to risk, P = win rate probability)",
        "If K is negative → do NOT take the trade. Your edge is negative.",
        "Pareto Principle: ~80% of your gains come from ~20% of your trades (the outliers)",
        "Modified Kelly × 20% = Optimal Risk % per trade (accounts for the 80% 'throwaway' trades)"
      ]
    },

    lesson: {
      heading: "Kelly Criterion + Pareto = Optimal Risk",
      body: "Raw Kelly often suggests betting too aggressively. The Pareto adjustment accounts for the reality that most trades are average — only 20% are exceptional winners.",
      bullets: [
        "<strong>Simple Kelly</strong>: K = 2P − 1 (P = win rate). Example: 60% win rate → K = 20%",
        "<strong>Modified Kelly</strong>: K = ((B × P) − Q) ÷ B  (B = R multiple, P = win rate, Q = 1 − P)",
        "Modified Kelly example: R=3, P=55% → K = ((3×0.55) − 0.45) ÷ 3 = 40%",
        "<strong>Pareto adjustment</strong>: Optimal Risk = Modified Kelly × 20%  → 40% × 20% = <strong>8%</strong>",
        "This 8% is your theoretical maximum — most professionals use <strong>half-Kelly</strong> for safety",
        "<strong>Drawdown asymmetry</strong>: losing 50% requires a 100% gain to recover — minimize drawdowns aggressively",
        "<strong>Compounding</strong> is the long-term edge: consistent small gains compound exponentially over time",
        "<strong>Journal EVERY trade</strong>: entry, stop, target, risk%, actual R, screenshot — this is the only path to improvement"
      ]
    },

    introChart: {
      title: "Drawdown Recovery — The Asymmetry Problem",
      type: "line",
      labels: ["10%","20%","30%","40%","50%","60%"],
      values: [11.1, 25.0, 42.9, 66.7, 100.0, 150.0],
      series2Label: "Drawdown Size",
      series2Values: [10, 20, 30, 40, 50, 60],
      markLines: [
        { yAxis: 100, label: "50% loss → 100% gain needed to recover", color: "#cc2222" }
      ]
    },

    lessonChart: {
      title: "Compounding Equity Curve — Conservative vs. Aggressive",
      type: "line",
      labels: ["0","20","40","60","80","100"],
      values:  [10000, 11800, 14100, 17200, 21500, 27000],
      series2Label: "Aggressive (Over-Leveraged)",
      series2Values: [10000, 12500, 9800, 14200, 8900, 12000],
      markLines: [
        { yAxis: 10000, label: "Starting Capital", color: "#5a5a78" }
      ]
    },

    quiz: {
      question: "Your win rate is 60%. Using the simple Kelly formula (K = 2P − 1), what percentage of your portfolio should you risk per trade?",
      hint: "Substitute P = 0.60 into K = 2P − 1. This gives the theoretical maximum. Remember Pareto brings this down further in practice.",
      style: "choice",
      answers: [
        { id: "a", text: "A) 10% — 2(0.5) − 1 = 0%... wrong win rate",     correct: false },
        { id: "b", text: "B) 20% — K = 2(0.60) − 1 = 0.20 = 20%",         correct: true  },
        { id: "c", text: "C) 30% — K = 2(0.65) − 1 (wrong win rate)",       correct: false },
        { id: "d", text: "D) 40% — only correct with modified Kelly at 3:1R", correct: false }
      ],
      chart: {
        title: "Two Equity Curves — Optimal vs. Over-Leveraged",
        type: "line",
        labels: ["0","10","20","30","40","50"],
        values:  [10000, 11200, 12800, 14700, 17100, 20000],
        series2Label: "Over-Leveraged",
        series2Values: [10000, 13000, 10500, 14500, 9200, 13800],
        markLines: [
          { yAxis: 10000, label: "Starting Capital", color: "#5a5a78" }
        ]
      },
      revealMarkPoints: [],
      explanation: "K = 2(0.60) − 1 = 1.20 − 1 = <strong>0.20 = 20%</strong>. However, <strong>apply the Pareto adjustment</strong>: 20% × 20% = 4% is closer to optimal in practice. The Pareto principle tells us 80% of trades are average — only 20% produce outsized returns. Sizing down for the average and letting winners run is the professional approach. Never forget: <strong>journal everything</strong> to build the data set needed to apply Kelly correctly.",
      rule: "📌 Simple Kelly: K = 2P−1. Apply Pareto: Optimal Risk = Modified Kelly × 20%. Journal every trade."
    }
  }

]; // END LT_CHAPTERS

/* ═══════════════════════════════════════════════════════════════════════════
   FINAL EXAM QUESTIONS
   Pulled from chapter quiz data — one per chapter in order.
   ═══════════════════════════════════════════════════════════════════════════ */
const LT_EXAM_QUESTIONS = LT_CHAPTERS.map((ch, i) => ({
  chapterIndex: i,
  chapterTitle: ch.title,
  question:     ch.quiz.question,
  answers:      ch.quiz.answers.map(a => ({
    id:      a.id,
    text:    a.text,
    correct: a.correct
  }))
}));

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
