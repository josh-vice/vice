/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Course 3
   lt-data-course3.js  |  Chapters 0–20 content, chart data, quiz questions
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
const LT_CHAPTERS_3 = [

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 0 — Course 3 Introduction
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 0,
    title: "Course 3 — Sharpening Your Edge",
    tag: "Introduction",
    module: "Course Overview",

    intro: {
      heading: "Welcome to Course 3: Sharpening Your Edge",
      body: "Course 3 bridges theory and live execution. You now understand how markets move — this course teaches you how to actually trade them. Five modules cover everything from exchange mechanics and leverage to building your own trading system and developing the mindset of a consistently profitable trader.",
      bullets: [
        "Module 1 — Getting Started with Derivatives: order types, exchange interface, order book, funding, open interest",
        "Module 2 — Understanding Leverage: what it is, how to use it correctly, cross vs. isolated margin, liquidations",
        "Module 3 — Applying the Basics: DBS/SSR zones, access points, range trading strategies",
        "Module 4 — Crafting Your System: trading system, trading plan, trading journal from scratch",
        "Module 5 — Unlocking Your Potential: trader's mindset, daily routines, meditation, full-time trading realities"
      ]
    },

    lesson: {
      heading: "Five Modules, One Complete Framework",
      body: "Each module of Course 3 layers onto the previous one. Derivatives knowledge gives you the instruments. Leverage gives you the tools. Applying the basics turns theory into executable setups. Your system and plan create consistency. Your mindset sustains it over the long term. All five are required.",
      bullets: [
        "Derivatives: the instruments professional traders use — perpetual swaps, futures, and their mechanics",
        "Leverage: a risk-mitigation and capital-optimization tool — not a means to bet bigger",
        "Applying the Basics: DBS and SSR zones define access points; ranges create high-probability scalp opportunities",
        "Crafting Your System: predefined entry, exit, risk, and management rules eliminate gut-feel decisions",
        "Unlocking Your Potential: screen time, physical health, meditation, and work-life balance all feed your edge"
      ]
    },

    roadmap: {
      title: "Five Modules — Theory to Live Execution",
      sub: "The arc of Course 3",
      icon: "route",
      stops: [
        { label: "Getting started with derivatives", desc: "Order types, the order book, funding, open interest" },
        { label: "Understanding leverage", desc: "Cross vs. isolated margin, liquidations, sizing" },
        { label: "Applying the basics", desc: "DBS/SSR zones, access points, range trading" },
        { label: "Crafting your system", desc: "Your trading plan, rules, and journal from scratch" },
        { label: "Unlocking your potential", desc: "Mindset, routines, the realities of full-time trading" }
      ]
    },

    lessonChart: {
      title: "From Learner to Consistent Trader — The Course 3 Arc",
      type: "candlestick",
      labels: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12","W13","W14","W15","W16"],
      // A realistic equity arc: early drawdown while learning, a give-back, then
      // higher lows as the system takes hold — progress is not a straight line.
      ohlc: ltCandles(82, [
        { to: 88, bars: 3 },
        { to: 79, bars: 3 },
        { to: 92, bars: 3 },
        { to: 86, bars: 3 },
        { to: 108, bars: 4 }
      ], { seed: 135, wick: 0.35 }),
      markPoints: [
        { dataIndex:  0, label: "Start — Learning Phase",  position: "bottom", color: "#00d4d4" },
        { dataIndex:  6, label: "Derivatives + Leverage",  position: "bottom", color: "#00d4d4" },
        { dataIndex: 11, label: "System Building",         position: "bottom", color: "#00d4d4" },
        { dataIndex: 15, label: "Consistent Edge",         position: "top",    color: "#00d4d4" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "Course 3 shifts your focus from understanding how markets move to actually trading them. What does it say ultimately makes a trader consistently profitable?",
      hint: "It isn't a single magic setup or maxing out leverage — think about what creates consistency and sustains it over the long term.",
      style: "choice",
      answers: [
        { id: "a", text: "A repeatable system plus the discipline and mindset to follow it — built up module by module", correct: true,  type: "bullish" },
        { id: "b", text: "Finding one perfect indicator that signals a winning trade every time",                        correct: false, type: "bearish" },
        { id: "c", text: "Using the highest leverage available to compound gains as quickly as possible",               correct: false, type: "neutral" }
      ],
      // Conceptual quiz — chart intentionally suppressed (hideChart:true above).
      // No candlestick can depict "a repeatable system + discipline", so the dead
      // chart/revealMarkPoints block was removed to prevent a misleading regression.
      explanation: "There's no magic indicator and no shortcut through leverage. Course 3 builds a complete edge in layers — derivatives and leverage give you the instruments and tools, applying the basics turns theory into executable setups, your <strong>system and plan create consistency</strong>, and your <strong>mindset sustains it</strong> over the long term. Consistent profitability comes from a repeatable process you actually follow — not from any single setup, and definitely not from maxing out leverage (which accelerates losses just as fast as gains).",
      rule: "Edge = a repeatable system + the discipline to follow it. No single indicator wins every time, and more leverage ≠ more edge."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 1 — Order Types
     Module 1 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 1,
    title: "Order Types",
    tag: "Module 1 · Session 1",
    module: "Getting Started with Derivatives",
    videoUrl: "https://www.youtube.com/embed/eJur_mprEWg",

    intro: {
      heading: "Three Orders. Every Trade Uses One.",
      body: "Before placing a single trade on a derivatives exchange, you need to know the three core order types. Each serves a distinct purpose. Using the wrong order type costs you money in fees, causes slippage, or leaves a position unprotected. The difference between a limit and a market order alone can determine whether your entry is profitable.",
      bullets: [
        "Market Order: immediate execution at current market price; taker fee (higher); no price guarantee",
        "Limit Order: resting order at a specific price; maker fee (lower); price guaranteed; visible in order book",
        "Stop Order: two-part mechanism — trigger price fires, then executes a market or limit order",
        "Limit Buy = placed BELOW market price (waits for price to fall). Limit Sell = placed ABOVE market price",
        "Stop Buy = triggers above market price (breakout entry). Stop Sell = triggers below (stop loss, breakdown)",
        "Always use stop losses — they define your risk and invalidation. Without them you are gambling."
      ]
    },

    lesson: {
      heading: "Market, Limit, and Stop — When to Use Each",
      body: "The choice of order type directly impacts your execution cost, fill quality, and position protection. Limit orders are preferred for planned entries — they guarantee your price and earn the lower maker fee. Market orders are for urgency: breakout entries and emergency exits. Stop orders protect positions and trigger breakouts automatically.",
      bullets: [
        "<strong>Market Order:</strong> executes immediately at current market price; best for riding breakout momentum, compounding winners, or urgent exits; taker fee (higher) charged",
        "<strong>Limit Order:</strong> resting order at your chosen price; fills when price reaches it; best for swing entries at key levels and set-and-forget take-profits; maker fee (lower)",
        "<strong>Stop Order:</strong> two-part trigger — trigger price activates the order, then a market or limit order executes; Stop Loss = Stop Sell with Close on Trigger enabled (for longs; Stop Buy for shorts)",
        "Maker fee = lower (you ADD liquidity to the order book with a resting limit order)",
        "Taker fee = higher (you TAKE liquidity from the order book with a market order)",
        "Stop losses must be set BEFORE entering a trade — know your invalidation first",
        "Stop without Close on Trigger = breakout entry tool, not a stop loss — different use entirely"
      ]
    },

    introChart: {
      title: "Limit Buy — Resting Below Market, Waiting for Price",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 85, bars: 12, reject: 2 },
        { to: 102, bars: 4 }
      ], { seed: 137, wick: 0.4 }),
      markLines: [
        { yAxis: 85, label: "Limit Buy Order", color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 83, y1: 88, label: "", color: "rgba(0,212,212,0.07)" }
      ],
      markPoints: [
        { dataIndex: 11, label: "Limit Buy Fills!", position: "bottom" },
        { dataIndex: 15, label: "Trade Running",    position: "top"    }
      ]
    },

    lessonChart: {
      title: "Stop Loss with Close on Trigger — Position Protection",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(85, [
        { to: 107, bars: 7 },
        { to: 99,  bars: 4 },
        { to: 80,  bars: 5 }
      ], { seed: 138, wick: 0.4 }),
      markLines: [
        { yAxis: 85, label: "Entry",            color: "#00d4d4" },
        { yAxis: 80, label: "Stop Loss (SL)",   color: "#ff2e88" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Entry Long",       position: "bottom" },
        { dataIndex:  6, label: "Trade Running",    position: "top"    },
        { dataIndex:  8, label: "Lower High — Reversal Warning", position: "top" },
        { dataIndex: 15, label: "Stop Hit — Loss Capped", position: "bottom", color: "#ff2e88" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "A trader wants to build a swing long position at a key support level below the current market price. They want the lowest possible fee and a guaranteed fill price. Which order type should they use?",
      hint: "Which order type adds liquidity to the order book, sits as a resting order at a specific price, and charges the lower maker fee?",
      style: "choice",
      answers: [
        { id: "a", text: "Limit Buy — resting below market price; maker fee (lower); fills only when price reaches the level; fill price guaranteed",   correct: true,  type: "bullish" },
        { id: "b", text: "Market Buy — immediate execution guarantees they get into the trade right now at the best available market price",             correct: false, type: "bearish" },
        { id: "c", text: "Stop Buy — place trigger above current market price; executes at market price when the trigger fires",                        correct: false, type: "neutral" }
      ],
      // Conceptual quiz — chart suppressed (hideChart:true). The dead
      // chart/revealMarkPoints block was removed so it can't regress into the
      // render path (it duplicated the introChart's limit-fill story anyway).
      explanation: "A <strong>Limit Buy</strong> is the correct order for a planned swing entry at a known support level. It sits as a resting order in the order book at your chosen price — guaranteeing that exact fill if reached. It also adds liquidity to the order book, earning the lower <strong>maker fee</strong> rather than the higher taker fee on market orders. A market buy would execute immediately at the current (higher) price, and a stop buy triggers above market — both wrong for this use case.",
      rule: "Planned entries at key levels = Limit Order. Lowest fee (maker), price guaranteed, adds liquidity. Set it before price arrives, then leave it alone."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 2 — Deposit and Withdraw
     Module 1 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 2,
    title: "Deposit and Withdraw",
    tag: "Module 1 · Session 2",
    module: "Getting Started with Derivatives",
    videoUrl: "https://www.youtube.com/embed/bcQgBiRmmRo",

    intro: {
      heading: "Getting Capital On — and Off — the Exchange",
      body: "Before you can trade derivatives, you need capital on the exchange. And before you risk that capital, you need to know the interface cold. These two steps — understanding deposits and withdrawals, and practising on testnet — are the mandatory prerequisites to going live.",
      bullets: [
        "Exchange used in the course: BitMEX (testnet = imaginary money; practice everything here first)",
        "XBT = BitMEX's denomination for Bitcoin — same asset, different ticker symbol",
        "Deposit: generate a unique wallet address on the exchange, then send BTC from your spot wallet to it",
        "Withdraw: enter destination address + amount, submit before the 13:00 UTC daily cutoff on BitMEX",
        "All deposits, withdrawals, and realized P&L are reflected in the wallet balance",
        "Testnet: identical interface to the live platform with imaginary funds — practice every action here first"
      ]
    },

    lesson: {
      heading: "Testnet — Your Risk-Free Classroom",
      body: "Testnet is the single most important step before live trading. Every action available on the live exchange — placing limit orders, market orders, stop losses with Close on Trigger, reading positions and P&L — is identical on testnet. Making mistakes on testnet is free. Making the same mistakes on a live account is expensive.",
      bullets: [
        "<strong>Testnet practice:</strong> place limit orders, market orders, stop losses, read the order book, manage positions — all with imaginary money",
        "<strong>Deposit flow:</strong> Exchange → Wallet → Deposit → Generate address → Send BTC from spot exchange to that address",
        "<strong>Withdraw flow:</strong> Exchange → Wallet → Withdraw → Enter destination address + amount → Submit before 13:00 UTC cutoff",
        "Never send funds to the wrong wallet address — crypto transactions are irreversible; always double-check",
        "Keep only the trading capital you need on the exchange — minimize counterparty risk from hacks or insolvency",
        "Treat the exchange as a trading tool, not a savings account — withdraw profits regularly",
        "XBT = BitMEX's ticker for Bitcoin — same asset, different symbol; always check how the pair you trade is denominated",
        "Wrong-chain deposits are unrecoverable — sending BTC to an ETH address loses the funds; double-check every address"
      ]
    },

    introChart: {
      // A wallet balance is a ledger quantity (no OHLC) — drawn as an equity line.
      // Deposit steps it up, realized P&L grows it, and a withdrawal is a genuine
      // DOWN-step (the old candlestick made "Withdraw Profits" sit where price rose).
      title: "Exchange Wallet Balance — Deposit, P&L Growth, then Withdrawal",
      type: "line",
      labels: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12","W13","W14","W15","W16"],
      values: [100,100,104,108,112,116,120,124,128,132,136,118,120,124,128,132],
      markLines: [
        { yAxis: 100, label: "Initial Deposit",        color: "#5a5a78" },
        { yAxis: 136, label: "Peak Balance",           color: "#00d4d4" },
        { yAxis: 118, label: "After Withdrawal (W12)", color: "#ffcc00" }
      ]
    },

    lessonChart: {
      // Testnet uses imaginary money — drawing it as a rising price chart wrongly
      // implies profit grows there. This is a flat "sandbox" equity line: the
      // balance just oscillates around the practice starting balance (no real P&L).
      title: "Testnet — Imaginary Balance, Practice Only (No Real P&L)",
      type: "line",
      labels: ltLabels(16),
      values: [100,101,99,100,102,99,101,100,98,101,100,102,99,100,101,100],
      markLines: [
        { yAxis: 100, label: "Practice Balance — Imaginary Funds", color: "#5a5a78" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "Before trading on a live derivatives exchange with real capital, what is the most important first step a new trader should take?",
      hint: "There is a free, risk-free environment that replicates the live exchange exactly. What is it called and why does it matter so much?",
      style: "choice",
      answers: [
        { id: "a", text: "Practice on testnet (paper trading with imaginary money) to learn the interface and order execution without risking capital",   correct: true,  type: "bullish" },
        { id: "b", text: "Deposit the minimum and start trading small live positions — real money creates the psychological discipline needed to learn",   correct: false, type: "bearish" },
        { id: "c", text: "Complete a simulation in a spreadsheet — the interface is not important; only the technical analysis matters",                  correct: false, type: "neutral" }
      ],
      // Conceptual quiz — chart suppressed (hideChart:true). A candlestick would
      // mislead on a testnet question, so the dead chart/revealMarkPoints block was
      // removed to prevent it from ever regressing into the render path.
      explanation: "Testnet provides an identical trading environment to the live exchange — same interface, same order types, same position management — with imaginary money. Practising here allows you to make every mistake possible (wrong order type, forgotten stop loss, missed cutoff time) without it costing real capital. Interface errors on a live account can be extremely costly. Testnet eliminates that risk entirely before capital is at stake.",
      rule: "Testnet first. Always. Master the interface, order execution, and stop loss setup with imaginary money before any real capital goes on the exchange."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 3 — Understanding the Order Book
     Module 1 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 3,
    title: "Understanding the Order Book",
    tag: "Module 1 · Session 3",
    module: "Getting Started with Derivatives",
    videoUrl: "https://www.youtube.com/embed/9-4WMH2Sv6Q",
    // Bespoke interactive section — its own step (after the Introduction), NOT a chart
    // replacement. The animated depth-of-market demo (lt-orderbook.js) shows resting
    // depth, market-vs-limit fills and maker/taker — things a candlestick chart can't.
    demo: {
      kind: "orderbook",
      label: "Order Book",
      after: "intro",
      heading: "Anatomy of a Live Order Book",
      body: "This is what the depth-of-market ladder looks like on a real exchange. Watch a resting book fill in real time: a <strong>market order</strong> crosses the spread and takes the best offers — a <strong>taker</strong> that moves price and thins the book — then a <strong>limit order</strong> rests on the book and later fills, a <strong>maker</strong> that gets a better price and a lower fee.",
      bullets: [
        "Asks (sellers) rest above the price, bids (buyers) rest below — the gap is the spread",
        "Size = orders waiting at that price; Total = cumulative depth from the spread outward",
        "Market order = fills instantly by crossing the spread → <strong>taker</strong> (pays the spread and a higher fee)",
        "Limit order = rests and waits at your chosen price → <strong>maker</strong> (adds liquidity, lower fee)"
      ]
    },

    intro: {
      heading: "The Order Book — Every Resting Buy and Sell, Live",
      body: "The order book is the real-time record of every resting buy and sell order at each price level on the exchange. It is the most direct view of supply and demand available. Understanding it tells you where buyers are waiting, where sellers are waiting, and where the next area of friction will most likely be.",
      bullets: [
        "Order book = real-time list of all resting buy and sell orders at each price level",
        "Red (asks) = sell orders resting ABOVE current market price — sellers waiting for price to rise to them",
        "Green (bids) = buy orders resting BELOW current market price — buyers waiting for price to fall to them",
        "Grouping = adjust the price interval to view orders at different granularity (5 = detailed, 50 = overview)",
        "Available instruments: Perpetual Swap (no expiry), Futures contracts (specific expiry dates), altcoin pairs",
        "ETH/BTC pair = price denominated in BTC, not USD — always check the denomination before trading"
      ]
    },

    lesson: {
      heading: "Perpetual Swaps, Futures, and Reading Depth",
      body: "The instruments available in a derivatives order book differ from spot markets. The Perpetual Swap is the most important — no expiry, tracks spot via funding, and is the most liquid instrument on every major crypto exchange. Futures have fixed expiry dates for defined-horizon speculation or hedging.",
      bullets: [
        "<strong>Perpetual Swap:</strong> no expiry date; most liquid; price anchored to spot via 8-hour funding payments; used for leveraged speculation and hedging",
        "<strong>Futures Contracts:</strong> fixed expiry dates (quarterly, monthly); must be rolled at expiry; used to hedge or speculate on a future price at a defined point in time",
        "<strong>Grouping:</strong> fine (5) for precision; coarse (50) for overview of major order walls and supply/demand clusters",
        "Large resting order blocks = potential support or resistance — the order book maps supply and demand visually",
        "ETH/BTC pair: a fill price of 0.05 means 0.05 BTC per ETH — not 0.05 USD; always verify denomination",
        "The order book updates in real time every second as orders are placed, filled, or cancelled",
        "Order books can be spoofed — large resting orders are sometimes placed and immediately cancelled to mislead other traders"
      ]
    },

    introChart: {
      // The order-book ladder draws its own labelled wall lines at 84 (bid) and 93
      // (ask), so the duplicate def.markLines at those levels were removed to stop the
      // two overlapping lines / colliding pills that obscured the very levels taught.
      // Wicks are tightened (wick 0.15 + explicit 0.8 reject wicks at each wall tap)
      // and seed 29 harness-verified over the FULL context-expanded series: no candle
      // pierces the deepest bid (82) or the highest ask (95) — the old seed/wick
      // punched through the whole ladder at the very bars labelled absorb/reject.
      title: "Order Book — Buyers Below Market, Sellers Above Market",
      type: "candlestick",
      labels: ltLabels(12),
      ohlc: ltCandles(93, [
        { to: 84, bars: 3, reject: 0.8 },
        { to: 93, bars: 3, reject: 0.8 },
        { to: 84, bars: 3, reject: 0.8 },
        { to: 93, bars: 3, reject: 0.8 }
      ], { seed: 29, wick: 0.15 }),
      // Order-book depth ladder — green resting bids below market, red resting asks above;
      // the heaviest rung on each side is the labelled wall (rung weight ∝ size).
      orderBook: {
        bids: [ { price: 86, size: 4 }, { price: 84, size: 9 }, { price: 82, size: 5 } ],
        asks: [ { price: 91, size: 5 }, { price: 93, size: 9 }, { price: 95, size: 4 } ],
        bidLabel: "Bid Wall (buyers)", askLabel: "Ask Wall (sellers)"
      },
      markPoints: [
        { dataIndex:  2, label: "Bid Wall Absorbs",  position: "bottom" },
        { dataIndex:  5, label: "Ask Wall Rejects",  position: "top"    },
        { dataIndex:  8, label: "Bids Refill",       position: "bottom" }
      ]
    },

    lessonChart: {
      // The defining feature of a perp is that it HUGS spot (via funding) and never
      // expires. The candles now oscillate tightly around a drawn "Spot Price" anchor
      // so "tracks spot" is a visible contrast, not just a repeated "no expiry" label.
      title: "Perpetual Swap — Price Hugs Spot via Funding, Never Expires",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 101, bars: 3 },
        { to: 99,  bars: 3 },
        { to: 102, bars: 3 },
        { to: 98,  bars: 3 },
        { to: 101, bars: 4 }
      ], { seed: 144, wick: 0.35 }),
      markLines: [
        { yAxis: 100, label: "Spot Price — Perp Tracks It", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex: 15, label: "No Expiry — Position Stays Open", position: "top" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "In a derivatives exchange order book, what do the red orders represent?",
      hint: "Think about where red orders sit relative to the current market price. Are they above or below? Are they buyers or sellers?",
      style: "choice",
      answers: [
        { id: "a", text: "Sell orders (asks) resting above current market price — sellers waiting for price to rise to their level",          correct: true,  type: "bearish" },
        { id: "b", text: "Buy orders (bids) — red indicates high-priority buyers protecting a key demand zone at those price levels",         correct: false, type: "bullish" },
        { id: "c", text: "Filled orders — red indicates trades that have already been executed at those price levels on the exchange",        correct: false, type: "neutral" }
      ],
      // Conceptual quiz — chart suppressed (hideChart:true). The dead
      // chart/revealMarkPoints block (a candlestick for an order-book question, with a
      // mis-placed ask pin) was removed so it can't regress into the render path.
      explanation: "Red orders in a derivatives order book are <strong>sell orders (asks)</strong> — they sit above current market price, representing sellers willing to sell at those levels. Green orders are buy orders (bids) sitting below current price. When a market buy fires, it eats through the red asks. When a market sell fires, it eats through the green bids. Understanding this structure is fundamental to reading supply and demand in real time.",
      rule: "Red = asks (sellers above market). Green = bids (buyers below market). The order book is the live supply and demand map for the asset."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 4 — Getting Into Positions
     Module 1 · Session 4
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 4,
    title: "Getting Into Positions",
    tag: "Module 1 · Session 4",
    module: "Getting Started with Derivatives",
    videoUrl: "https://www.youtube.com/embed/MdbfWpG_J0s",

    intro: {
      heading: "Reading Your Positions and Orders",
      body: "Once you place a trade, the exchange gives you a full suite of tabs to monitor and manage it. Knowing what each tab shows — and exactly what the numbers mean — is the difference between controlled informed trading and chaotic guesswork.",
      bullets: [
        "Positions tab: all open positions — entry price, mark price, liquidation price, unrealized P&L, margin used",
        "Active Orders tab: all resting limit orders currently waiting to be filled (both entry orders and take-profits)",
        "Stops tab: all stop orders — stop losses AND breakout stop entries",
        "Closed Positions: realized P&L history for every closed trade",
        "Fills tab: complete order history — type, price, contracts, date/time for every execution",
        "Before any trade: your stop loss must be visible in the Stops tab and entry order in Active Orders"
      ]
    },

    lesson: {
      heading: "Unrealized vs Realized P&L — The Key Distinction",
      body: "The most important concept in position management is the difference between unrealized and realized P&L. A large positive number in your Positions tab feels great — but it is not yours yet. It only becomes real capital when you close the position. Many traders give back all unrealized profits by not having a predefined exit plan.",
      bullets: [
        "<strong>Unrealized P&L:</strong> current paper profit/loss on an open position; calculated from entry price vs mark price; changes every second while the position is open",
        "<strong>Realized P&L:</strong> locked-in profit or loss recorded when a position is closed; added to wallet balance",
        "<strong>Mark price:</strong> the reference price used by the exchange to calculate unrealized P&L and liquidation; different from last traded price; designed to prevent manipulation",
        "Liquidation price: the mark price at which your margin is exhausted and the exchange force-closes the position",
        "Entry price: the average price at which all fills for the position were executed",
        "Margin: the collateral allocated to back the position — always visible in the Positions tab",
        "Tip: before entering any trade, check that all three orders (entry, stop, TP) appear in the correct tabs"
      ]
    },

    introChart: {
      title: "Open Position — Unrealized P&L Building as Price Rises",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(85, [
        { to: 103, bars: 6 },
        { to: 96,  bars: 3 },
        { to: 120, bars: 7 }
      ], { seed: 146, wick: 0.4 }),
      markLines: [ { yAxis: 120, label: "Mark Price", color: "#5a5a78" },
        { yAxis: 85, label: "Entry Price",  color: "#00d4d4" },
        { yAxis: 80, label: "Stop Loss",    color: "#ff2e88" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Entry — Unreal. P&L = 0",  position: "bottom" },
        { dataIndex:  8, label: "Paper Profit Dips — Still Unrealized", position: "bottom" },
        { dataIndex: 15, label: "Unrealized P&L = +35",     position: "top"    }
      ]
    },

    lessonChart: {
      // Price now RUNS TO the take-profit and stops there (lands exactly on 110), so
      // the TP-fill event the slot is about is actually drawn. TP is the only gold
      // line; the mark-price reference is neutral grey (gold is reserved for liq/TP).
      title: "Stops Tab — SL and TP Set Before Entry, Then TP Fills",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(82, [
        { to: 100, bars: 9 },
        { to: 110, bars: 7 }
      ], { seed: 147, wick: 0.4 }),
      markLines: [
        { yAxis: 82,  label: "Entry",       color: "#00d4d4" },
        { yAxis: 77,  label: "Stop Loss",   color: "#ff2e88" },
        { yAxis: 110, label: "Take Profit", color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Entry — All Orders Set",       position: "bottom" },
        { dataIndex:  8, label: "Running — SL & TP Active",     position: "top"    },
        { dataIndex: 15, label: "TP Filled — Position Closed",  position: "top", color: "#ffcc00" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "A trader enters a long position and sees +$850 in their Positions tab. They have not closed the trade. What does this number represent?",
      hint: "Has the position been closed yet? What is the difference between profit that is locked in versus profit that exists only while the position is open?",
      style: "choice",
      answers: [
        { id: "a", text: "Unrealized P&L — paper profit that exists only while the position is open; becomes realized only when the position is closed",    correct: true,  type: "bullish" },
        { id: "b", text: "Realized P&L — the profit has been locked in and is now reflected in the wallet balance",                                         correct: false, type: "bearish" },
        { id: "c", text: "Funding income — periodic payments received from short holders on the perpetual swap",                                            correct: false, type: "neutral" }
      ],
      // Conceptual quiz — chart suppressed (hideChart:true). The dead
      // chart/revealMarkPoints block was removed; its pullback only dipped to 104
      // (above entry 85) so the profit never actually vanished — it couldn't teach.
      explanation: "The +$850 is <strong>Unrealized P&L</strong> — a paper profit that exists only because the position is still open. If price reversed and the trade closed at a loss, that $850 would disappear. Unrealized P&L becomes <strong>Realized P&L</strong> only when the position closes, at which point the amount is added to (or subtracted from) the wallet balance. Never count unrealized profits as money you have.",
      rule: "Unrealized P&L = paper profit only. It is not in your wallet. It becomes real only when you close the position. Always have a predefined exit plan."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 5 — Executing Orders
     Module 1 · Session 5
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 5,
    title: "Executing Orders",
    tag: "Module 1 · Session 5",
    module: "Getting Started with Derivatives",
    videoUrl: "https://www.youtube.com/embed/8L1gojZJY9M",

    intro: {
      heading: "Placing the Trade — From Order Form to Execution",
      body: "Knowing the order types is not enough. You need to know exactly HOW to execute each one correctly on the exchange. A single missed checkbox — like forgetting Close on Trigger on a stop loss — can leave a position completely unprotected, or flip you into a position you never intended to hold.",
      bullets: [
        "Limit order: set price, quantity, buy long/sell short → confirm → appears in Active Orders and order book",
        "Market order: fills immediately at current market price; no resting order appears; taker fee charged",
        "Stop Market: set stop trigger price → MUST check Close on Trigger for all stop loss orders",
        "Last Price trigger = fastest execution reference for stop losses (last traded price on exchange)",
        "Index Price = composite from multiple exchanges (slower). Mark Price = index + basis",
        "Stop without Close on Trigger = breakout entry tool — NOT a stop loss; different use entirely"
      ]
    },

    lesson: {
      heading: "The Critical Rule — Close on Trigger for Every Stop Loss",
      body: "The most common and most costly execution mistake on derivatives exchanges is placing a stop order without enabling Close on Trigger. Close on Trigger ties the stop to your position: when it fires, it immediately stops you out at market — no extra margin needed, guaranteed to close what you hold. Without it, the stop is just a standalone order that can be rejected for insufficient margin or execute after your position has already changed — leaving you unprotected or flipped.",
      bullets: [
        "<strong>Correct Stop Loss setup:</strong> Stop Market order → set trigger below entry (for longs) → check Close on Trigger → confirm",
        "<strong>Without Close on Trigger:</strong> the stop is not tied to your position — it needs its own margin, can be rejected, or can fire after your position has changed, leaving you unprotected or flipped into an unintended position",
        "<strong>Last Price trigger:</strong> fastest execution; recommended for all stop losses; triggers on last traded price of the contract",
        "<strong>Index Price trigger:</strong> slower; less prone to sharp wick spikes; sometimes preferred for larger positions",
        "After placing a stop loss, always verify it appears in the Stops tab with the correct trigger price",
        "Before any trade begins: entry in Active Orders + stop loss in Stops tab = both must show before the market moves",
        "Never enter a trade without all protective orders confirmed and visible in the correct exchange tabs"
      ]
    },

    introChart: {
      // Leg 1 lands at 85 (ABOVE the 83 limit) with a reject wick toward it, so
      // "First Tap — Rejects" is true — the old {to:83} leg landed ON the limit at
      // idx4, which would have filled the order there instead of at the pinned idx9.
      // Seed 111 harness-verified: no bar prints ≤83 before the idx9 fill; the idx4
      // tap (low 83.24) is the deepest pre-fill print and stays above the limit.
      title: "Limit Order Execution — Price Descends to Level, Fills, Bounces",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 85, bars: 5, reject: 1.5 },
        { to: 88, bars: 2 },
        { to: 83, bars: 3 },
        { to: 107, bars: 6 }
      ], { seed: 111, wick: 0.4 }),
      markLines: [
        { yAxis: 83, label: "Limit Buy Level", color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 81, y1: 86, label: "", color: "rgba(0,212,212,0.07)" }
      ],
      markPoints: [
        { dataIndex:  4, label: "First Tap — Rejects",  position: "bottom" },
        { dataIndex:  9, label: "Limit Order Fills!",   position: "bottom" },
        { dataIndex: 15, label: "Trade Running",        position: "top"    }
      ]
    },

    lessonChart: {
      title: "Stop Loss — Close on Trigger Must Be Checked",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(88, [
        { to: 105, bars: 7 },
        { to: 83,  bars: 9 }
      ], { seed: 150, wick: 0.4 }),
      markLines: [
        { yAxis: 88, label: "Entry",          color: "#00d4d4" },
        { yAxis: 83, label: "Stop Loss (SL)", color: "#ff2e88" }
      ],
      markPoints: [
        { dataIndex:  6, label: "Peak — SL Running",  position: "top"    },
        { dataIndex: 15, label: "SL Fires + CoT ON → Position FLAT", position: "bottom", color: "#ffcc00" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "A trader places a stop sell order to protect their long position. They forget to enable Close on Trigger. What is the risk?",
      hint: "Without Close on Trigger, what does the stop sell do when it fires? Does it close the existing long position, or does it open a new position?",
      style: "choice",
      answers: [
        { id: "a", text: "The stop may not actually protect the position — without Close on Trigger it is not tied to the position: it needs its own margin, can be rejected, or can fire after the position has changed, leaving the trader unprotected or flipped", correct: true,  type: "bearish" },
        { id: "b", text: "No risk — stop orders always close the existing position regardless of settings; Close on Trigger is optional for experienced traders",                   correct: false, type: "bullish" },
        { id: "c", text: "The stop executes at a slightly worse price — Close on Trigger only improves fill quality, not whether the position closes",                             correct: false, type: "neutral" }
      ],
      chart: {
        // Rebuilt: Entry (95) with the Stop Trigger correctly BELOW it (88), ~7 units
        // apart so the two lines are readable. Price runs up, comes back, and only
        // then trades DOWN through the stop — the trigger cannot fire on the way up.
        title: "Stop Without Close on Trigger — What Happens?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(13),
        ohlc: ltCandles(95, [
          { to: 101, bars: 4 },
          { to: 95,  bars: 3 },
          { to: 88,  bars: 2 },
          { to: 76,  bars: 4 }
        ], { seed: 151, wick: 0.4 }),
        markLines: [
          { yAxis: 95, label: "Entry",        color: "#00d4d4" },
          { yAxis: 88, label: "Stop Trigger", color: "#ff2e88" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  8, label: "Stop Fires — No CoT!",        position: "bottom", color: "#ff2e88" },
        { dataIndex: 10, label: "Rejected — Long Still Open",  position: "bottom", color: "#ff2e88" },
        { dataIndex: 12, label: "Unprotected — Loss Grows",    position: "bottom", color: "#ff2e88" }
      ],
      explanation: "Close on Trigger ties the stop to your position: when the trigger fires, it <strong>immediately stops you out at market</strong> — closing exactly what you hold, with no extra margin required. Without it, the stop is treated as a standalone order: it needs its own margin and can be <strong>rejected</strong> when it fires (leaving the long completely unprotected as price keeps falling), or it can execute after your position has already changed and flip you into a position you never planned. Stops without Close on Trigger have exactly one legitimate use: breakout <strong>entries</strong>. Always enable Close on Trigger for every stop loss, then verify it in the Stops tab.",
      rule: "ALWAYS enable Close on Trigger on every stop loss — it stops you out at market immediately, guaranteed. Without it the stop can be rejected or fire against a changed position. Non-CoT stops = breakout entries only. Verify in Stops tab before the trade is live."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 6 — Understanding Contracts
     Module 1 · Session 6
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 6,
    title: "Understanding Contracts",
    tag: "Module 1 · Session 6",
    module: "Getting Started with Derivatives",
    videoUrl: "https://www.youtube.com/embed/GLuLKS1Za8k",

    intro: {
      heading: "Open Interest, Funding Rate, and the Calculator",
      body: "Every derivatives contract has key metrics that directly affect your trading. Open Interest tells you the total size of the market and helps gauge participation. The Funding Rate is the cost or income of holding a perpetual swap position over time. The Calculator lets you model any trade before risking capital.",
      bullets: [
        "Contract Details section shows: pricing source (index), 24H turnover, open interest, funding rate",
        "Open Interest = total number of contracts currently open on the exchange (denominated in USD and BTC)",
        "Funding Rate = periodic payment between longs and shorts to keep perpetual swap price near spot",
        "Positive funding = longs pay shorts (market is bullish; long positions are crowded)",
        "Negative funding = shorts pay longs (market is bearish; short positions are crowded)",
        "Funding is paid every 8 hours on most exchanges — factor this into any multi-day leveraged trade"
      ]
    },

    lesson: {
      heading: "Funding Rate and Open Interest — What They Tell You",
      body: "Open Interest and Funding Rate are two of the most important sentiment and cost metrics in derivatives trading. Rising OI with rising price confirms a trend with participation. Rising funding means crowded longs are paying an increasing cost to hold. Ignoring funding on multi-day positions can silently consume a large portion of total profits.",
      bullets: [
        "<strong>Open Interest (OI):</strong> total active contracts outstanding; rising OI in a trend = new money entering confirming the move; falling OI = positions closing",
        "<strong>OI + Price Rising:</strong> bullish confirmation — new longs entering; trend has genuine participation",
        "<strong>OI + Price Falling:</strong> bearish confirmation — new shorts entering; selling has genuine participation",
        "<strong>Positive Funding:</strong> market is bullish; longs pay shorts every 8H; cost erodes long position margins over time",
        "<strong>Negative Funding:</strong> market is bearish; shorts pay longs every 8H; actual payment received by long holders",
        "Calculator: input entry, exit, position size → get liquidation price, P&L, and required margin before entering",
        "Always check funding before planning any multi-day leveraged position — multiply rate × number of 8H periods"
      ]
    },

    introChart: {
      // The concept is funding COST over time — now drawn as the hero: a positive,
      // rising funding-rate histogram beneath price (each 8H bar = longs paying).
      // Price pins were dropped; the funding panel carries the lesson.
      title: "Positive Funding — Longs Pay Every 8H, Rate Climbing",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(90, [{ to: 124, bars: 16 }], { seed: 152, wick: 0.4 }),
      subPanel: {
        kind: "funding",
        label: "8H Funding Rate (longs pay)",
        points: [[0, 0.01], [4, 0.03], [8, 0.05], [12, 0.07], [15, 0.09]]
      }
    },

    lessonChart: {
      // OI + price is a TWO-series relationship — you cannot teach it on price alone.
      // The Open Interest series is now drawn beneath price, climbing in lockstep, so
      // "rising OI confirms the trend" is visible. A small pullback breaks the shape
      // from the intro's clean ramp. Pins reduced to one confirmation callout.
      title: "Open Interest Rising with Price — Trend Confirmation",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(82, [
        { to: 104, bars: 7 },
        { to: 98,  bars: 3 },
        { to: 122, bars: 6 }
      ], { seed: 153, wick: 0.35 }),
      subPanel: {
        kind: "oi",
        // OI holds flat across the idx7–9 price pullback (rising through it blurred
        // the "falling/flat OI = positions closing, rising OI = new money" contrast).
        label: "Open Interest (rising = new money in)",
        points: [[0, 100], [7, 150], [10, 150], [15, 215]]
      },
      markPoints: [
        { dataIndex: 15, label: "Price + OI Rising = Trend Confirmed", position: "top" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "The funding rate on a perpetual swap is currently +0.05% per 8-hour period and the market has been bullish for several weeks. What does this mean for a long position held for 5 days?",
      hint: "There are 3 funding periods per day (every 8 hours). Over 5 days, how many payments are made? Which direction does positive funding flow between longs and shorts?",
      style: "choice",
      answers: [
        { id: "a", text: "The long position pays funding to shorts every 8 hours — over 5 days (15 funding periods) this cost erodes the margin and reduces total profit",       correct: true,  type: "bearish" },
        { id: "b", text: "The long position receives funding payments from shorts — positive funding means longs are compensated for holding in a bullish market",               correct: false, type: "bullish" },
        { id: "c", text: "Funding is irrelevant for positions held under 30 days — only long-term swing trades are meaningfully affected by the funding mechanism",             correct: false, type: "neutral" }
      ],
      chart: {
        // Funding cost is now drawn: a positive funding histogram beneath price makes
        // the "adds up" magnitude visible. Reveal pins re-placed so pin position
        // matches the payment count a learner reads off the chart (Pay 1/8/15).
        title: "Positive Funding Rate — 5-Day Cost for Longs",
        type: "candlestick",
        cutIndex: 10,
        labels: ltLabels(15),
        ohlc: ltCandles(90, [{ to: 115, bars: 15 }], { seed: 154, wick: 0.35 }),
        markLines: [
          { yAxis: 90, label: "Entry", color: "#00d4d4" }
        ],
        subPanel: {
          kind: "funding",
          label: "8H Funding Paid (longs pay shorts)",
          points: [[0, 0.05], [7, 0.05], [14, 0.05]]
        }
      },
      revealMarkPoints: [
        { dataIndex:  0, label: "Pay 1",              position: "top", color: "#ff2e88" },
        { dataIndex:  7, label: "Pay 8",              position: "top", color: "#ff2e88" },
        { dataIndex: 14, label: "Pay 15 — Adds Up!",  position: "top", color: "#ff2e88" }
      ],
      explanation: "Positive funding = <strong>longs pay shorts</strong>. With 3 funding periods per day (every 8 hours), a 5-day hold incurs 15 funding payments. At 0.05% per period that is 0.75% of position notional value paid to short holders — significant on a leveraged position. In extreme bull markets, funding can exceed 0.1% per period. Always calculate total expected funding cost before planning any multi-day leveraged position.",
      rule: "Positive funding = longs pay shorts every 8H. Periods held x rate = total cost. Always calculate this before holding leveraged positions multiple days."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 7 — Understanding Leverage
     Module 2 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 7,
    title: "Understanding Leverage",
    tag: "Module 2 · Session 1",
    module: "Understanding Leverage",
    videoUrl: "https://www.youtube.com/embed/_OyZcObnIos",

    intro: {
      heading: "Leverage — Tool, Not Weapon",
      body: "Leverage is the most misunderstood concept in derivatives trading. Used correctly, it is a risk-management tool that lets you minimize capital exposed to potentially insecure exchanges while maintaining full position size. Used incorrectly, it turns a manageable loss into a catastrophic one.",
      bullets: [
        "Leverage = increased purchasing power via a margin account — you use less of your capital to back a position",
        "Two legitimate uses: (1) mitigate counterparty risk by keeping less capital on the exchange; (2) capital optimization across multiple positions simultaneously",
        "Cross Margin: full account balance used as trading margin — best for swing/position traders scaling into a single trade",
        "Isolated Margin: only the predefined multiplier is used per position; only that amount liquidated if hit",
        "Risk Limit: above a base position size (200 XBT on XBTUSD), margin requirements step up — exchanges demand more margin from larger positions to limit their own risk",
        "Liquidation = forced closure when margin falls below maintenance level — should NEVER happen with proper stop losses",
        "Stop losses are the ONLY defense against liquidation — use them on every single trade without exception"
      ]
    },

    lesson: {
      heading: "Cross vs Isolated Margin — Choosing the Right Mode",
      body: "The choice between cross and isolated margin fundamentally changes how risk is structured across your portfolio. Cross margin pools the entire account balance as a buffer — good for single large positions. Isolated margin ringfences each position — essential when running multiple concurrent positions where one cannot cascade into others.",
      bullets: [
        "<strong>Cross Margin:</strong> full account balance acts as collateral for all open positions; maximum buffer against liquidation on any single position; but one catastrophic position can drain the whole account",
        "<strong>Isolated Margin:</strong> each position has a fixed margin allocation; maximum loss limited to that allocation; other positions completely unaffected if one is liquidated",
        "<strong>Initial Margin:</strong> minimum collateral required to OPEN a position (e.g., 1% of position size at 100x max leverage on BitMEX)",
        "<strong>Maintenance Margin:</strong> minimum equity required to KEEP a position open (e.g., 0.5% of position size)",
        "BitMEX XBTUSD combined requirement: ~1.5% of position size (initial 1% + maintenance 0.5%)",
        "Leverage does NOT change your risk if used correctly — it only changes how much capital sits on the exchange",
        "A liquidation should be theoretically impossible if the stop loss is correctly placed and fires before liquidation"
      ]
    },

    introChart: {
      title: "Isolated Margin — Each Position Ringfenced, Others Safe",
      type: "candlestick",
      labels: ltLabels(16),
      // Isolation of MULTIPLE positions can't be shown on one candle series, so this
      // teaches the one thing it can: the stop fires (84) well ABOVE the isolated
      // liquidation limit (79 — a readable gap, not 1pt), so only this position's
      // fixed margin is ever at risk. The peak "other positions" pin was dropped.
      ohlc: ltCandles(88, [
        { to: 107, bars: 8 },
        { to: 84,  bars: 7 },
        { to: 84,  bars: 1 }
      ], { seed: 155, wick: 0.4 }),
      markLines: [
        { yAxis: 88, label: "Position Entry",                color: "#00d4d4" },
        { yAxis: 84, label: "Stop Loss",                     color: "#ff2e88" },
        { yAxis: 79, label: "Isolated Liq Limit (this position only)", color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Isolated: Fixed Margin",       position: "bottom" },
        { dataIndex: 14, label: "SL Fires — Only This Margin",  position: "bottom" }
      ]
    },

    lessonChart: {
      title: "Liquidation Without Stop Loss — Never Let This Happen",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(90, [{ to: 58, bars: 16 }], { seed: 156, wick: 0.4 }),
      markLines: [
        { yAxis: 90, label: "Entry",                  color: "#00d4d4" },
        { yAxis: 85, label: "Stop Should Be Here",    color: "#ffcc00" },
        { yAxis: 70, label: "Liquidation Price",      color: "#ff2e88" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Entry",                    position: "top"    },
        { dataIndex:  2, label: "Stop Should Have Fired!",  position: "bottom" },
        { dataIndex:  8, label: "Liquidation — No SL Used", position: "bottom" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "A day trader wants to trade multiple crypto assets simultaneously while ensuring that if one position is liquidated, it does not affect the capital reserved for other open trades. Which margin type should they use?",
      hint: "One margin mode pools the full balance across all positions. The other isolates a fixed amount per position. Which one protects other positions from one position's liquidation?",
      style: "choice",
      answers: [
        { id: "a", text: "Isolated Margin — only the predefined margin amount is at risk per position; a liquidation in one does not affect capital allocated to other trades",    correct: true,  type: "bullish" },
        { id: "b", text: "Cross Margin — the full account balance as shared collateral maximises capital efficiency and gives each position the most room before liquidation",      correct: false, type: "bearish" },
        { id: "c", text: "Leverage level — keeping leverage at 3x or below prevents liquidation on any position regardless of the margin mode selected",                          correct: false, type: "neutral" }
      ],
      // Conceptual quiz — chart suppressed (hideChart:true). A candlestick can't depict
      // multi-position isolation, and the dead def had Stop above the Isolated Limit
      // (an impossible ordering). Removed so it can't regress into the render path.
      explanation: "<strong>Isolated Margin</strong> allocates a fixed amount of capital per position. If that position liquidates, only its isolated margin is lost — the rest of the account is completely unaffected. Cross Margin uses the entire account balance as a shared buffer, meaning one catastrophically bad position could drain capital meant for all other trades. For a day trader running multiple concurrent positions, isolated margin is the only correct choice.",
      rule: "Isolated Margin = ringfenced risk per position. Multiple concurrent positions = always isolated. Cross Margin is for single swing/position trades needing maximum liquidation buffer."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 8 — Applying Leverage — ETH Swing Trade Example
     Module 2 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 8,
    title: "Applying Leverage — ETH Swing Trade Example",
    tag: "Module 2 · Session 2",
    module: "Understanding Leverage",
    videoUrl: "https://www.youtube.com/embed/FaU31BaTLNM",

    intro: {
      heading: "Leverage Is Irrelevant — It Does Not Change Your Risk",
      body: "The most important principle about leverage is also the most counterintuitive: used correctly, leverage does not change your risk at all. Your position size, stop loss, and R multiple are determined entirely by your system — not by your leverage level. Leverage only determines how much margin you post to back that position on the exchange.",
      bullets: [
        "Position size = determined by your risk % of portfolio — never by your leverage level",
        "Leverage = reduces the margin posted; keeps more capital off a potentially vulnerable exchange",
        "Example: 750,000 contracts requires 101 BTC collateral without leverage; 10x leverage = only 10 BTC on exchange",
        "Nothing changes: same position size, same stop loss, same R multiple, same risk — just less margin on exchange",
        "Liquidation Price MUST be below stop loss (longs) or above stop loss (shorts) — if liquidation fires first, too much leverage",
        "Wrong use: treating 10x leverage as permission to take a 10x bigger position and 10x bigger risk"
      ]
    },

    lesson: {
      heading: "The Safe Leverage Rule — Liquidation Beyond Stop Loss",
      body: "One simple rule determines whether leverage is being used correctly: the liquidation price must be on the other side of your stop loss. For longs, liquidation must be BELOW the stop. For shorts, liquidation must be ABOVE the stop. If it is not, you will be liquidated before your stop fires — and your position protection is meaningless.",
      bullets: [
        "<strong>The Safe Rule:</strong> Liquidation Price below Stop Loss (for longs); Liquidation Price above Stop Loss (for shorts)",
        "<strong>Correct example (the real ETH trade):</strong> Entry $134.83 | Stop $124.95 | Liq $122.90 → stop fires at $124.95 before liquidation at $122.90 — leverage is correct",
        "<strong>Wrong example:</strong> Entry $134 | Stop $125 | Liq $127 → liquidation fires at $127 BEFORE the stop at $125 — too much leverage",
        "Use the exchange calculator: input entry, stop, position size → it shows liquidation price; verify it is beyond the stop",
        "Capital preservation comes before profitability — if leverage creates any risk of liquidation before your stop, reduce it",
        "Correct leverage use = minimize counterparty risk + optimize capital allocation = no change to risk per trade",
        "Master profitability WITHOUT leverage first — if unprofitable without it, leverage only amplifies the losses"
      ]
    },

    introChart: {
      title: "ETH Swing Long — Entry, Stop, and Target (Scaled to Chart)",
      type: "candlestick",
      labels: ltLabels(16),
      // Frame-verified trade numbers: Liq $122.90 (not the fabricated $115) and TP1
      // $160 (not L10's revised $282). The rip now lands EXACTLY on 91 so the drawn
      // reward (8) over the drawn risk (3) ≈ the trade's real 2.55R — the old 114
      // target drew ~10R for a 2.55R setup. Seed 9 harness-verified: entry tag (idx9)
      // is the global low and stays above the stop; target untouched until idx15.
      ohlc: ltCandles(86, [
        { to: 84, bars: 4 },
        { to: 86, bars: 3 },
        { to: 83, bars: 3, reject: 1.5 },
        { to: 91, bars: 6 }
      ], { seed: 9, wick: 0.4 }),
      markLines: [
        { yAxis: 83, label: "Entry ($134.83 scaled)", color: "#00d4d4" },
        { yAxis: 80, label: "Stop Loss ($124.95)",    color: "#ff2e88" },
        { yAxis: 78, label: "Liquidation ($122.90)",  color: "#ffcc00" },
        { yAxis: 91, label: "Target ($160 — TP1)",    color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  9, label: "Entry Long — Tags Support", position: "bottom" },
        { dataIndex: 15, label: "Target Hit",                position: "top"    }
      ]
    },

    lessonChart: {
      title: "Liquidation Price Below Stop Loss — Correct Leverage Use",
      type: "candlestick",
      labels: ltLabels(16),
      // The walk settles at ~82 (just under the stop), so "SL fires first at 84"
      // visibly ends the move, and there is a readable ~4-unit gap to the Liq line
      // (78) — instead of grinding to 80 two units above liq (razor-thin, confusing).
      ohlc: ltCandles(90, [
        { to: 84, bars: 10 },
        { to: 82, bars: 6 }
      ], { seed: 159, wick: 0.4 }),
      markLines: [
        { yAxis: 90, label: "Entry",             color: "#00d4d4" },
        { yAxis: 84, label: "Stop Loss",         color: "#ff2e88" },
        { yAxis: 78, label: "Liquidation Price", color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Entry",                position: "top"    },
        { dataIndex:  9, label: "SL Fires First at 84", position: "bottom" },
        { dataIndex: 15, label: "Liq at 78 — Not Hit",  position: "bottom" }
      ]
    },

    quiz: {
      question: "A trader is long from $85 with a stop loss at $80 and a liquidation price at $77. Is this setup using leverage correctly, and why?",
      hint: "What is the critical rule for the relationship between liquidation price and stop loss on a long position?",
      style: "direction",
      answers: [
        { id: "a", text: "Yes — the liquidation price ($77) is below the stop loss ($80); the stop fires first; leverage is being used correctly to reduce margin posted, not to increase risk", correct: true,  type: "bullish" },
        { id: "b", text: "No — the liquidation price must always be above the stop loss for longs to give the trade room to breathe before exiting",                                              correct: false, type: "bearish" },
        { id: "c", text: "Cannot determine — whether liquidation is safe depends entirely on the specific exchange maintenance margin formula",                                                   correct: false, type: "neutral" }
      ],
      chart: {
        // REBUILT: the correct answer is "liq (77) is below the stop (80), stop fires
        // first, liq never hit." Price must therefore NEVER reach either level — it
        // holds above the stop the whole time, so both lines sit in clear air below
        // the candles and the drawn action agrees with the answer.
        title: "Long $85 — Stop $80 — Liq $77. Leverage Correct?",
        type: "candlestick",
        cutIndex: 10,
        labels: ltLabels(14),
        ohlc: ltCandles(85, [
          { to: 84, bars: 3 },
          { to: 86, bars: 6 },
          { to: 84, bars: 2 },
          { to: 90, bars: 3 }
        ], { seed: 160, wick: 0.4 }),
        markLines: [
          { yAxis: 85, label: "Entry",         color: "#00d4d4" },
          { yAxis: 80, label: "Stop Loss",     color: "#ff2e88" },
          { yAxis: 77, label: "Liquidation",   color: "#ffcc00" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 10, label: "Stop $80 — Never Touched", position: "bottom", color: "#00d4d4" },
        { dataIndex: 12, label: "Liq $77 — Far Below",      position: "bottom", color: "#00d4d4" },
        { dataIndex: 13, label: "Leverage Used Correctly",  position: "top",    color: "#00d4d4" }
      ],
      explanation: "The setup is using leverage correctly. The liquidation price ($77) is <strong>below the stop loss ($80)</strong>, meaning the stop fires first at $80 — closing the position — long before the exchange-forced liquidation at $77. This is the fundamental test for correct leverage usage: the stop loss is the first line of defense, not the liquidation. Leverage here only reduces margin posted on the exchange, not the actual risk per trade.",
      rule: "Safe leverage rule for longs: Liquidation Price MUST be below Stop Loss. For shorts: Liquidation MUST be above Stop Loss. If liq fires before stop — reduce leverage immediately."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 9 — Margin Management
     Module 2 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 9,
    title: "Margin Management",
    tag: "Module 2 · Session 3",
    module: "Understanding Leverage",
    videoUrl: "https://www.youtube.com/embed/osmzWYAzgFs",

    intro: {
      heading: "The Real Cost of Leverage — Funding Eats Your Margin",
      body: "Even a winning trade can become a problem if held with leverage for too long. Funding rate payments on perpetual swaps erode margin over time — and as margin shrinks, the liquidation price creeps toward your stop loss. This is exactly what happened on the live ETH swing trade detailed in this chapter.",
      bullets: [
        "Real trade: Entry $134.83 | Stop $124.95 | Original Target $160 | R = 2.55",
        "Price blew through original target → the 2D Ichimoku chart showed price closing into the cloud → new potential R = 14.9x ($282 target)",
        "Problem: funding payments every 8H eroded margin → liquidation crept UP and crossed the original stop ($122.95 → $126.35 vs stop $124.95)",
        "Forced to move the stop up to entry ($135) to cover the funding as liquidation passed the original stop",
        "Target $282.00 — price reached $281.90 (10 cents away) then pulled back",
        "Exited around $268 as funding became brutal — funding consumed over 20% of total profits on the trade"
      ]
    },

    lesson: {
      heading: "Margin Management Over Time — Funding, Duration, Instruments",
      body: "When a winning trade runs for days or weeks on a perpetual swap, the funding rate becomes a significant factor. Each 8-hour period charges a percentage of your position notional value. Over weeks, this compounds — the margin you posted shrinks and the liquidation price moves toward your stop. The correct response is either to add margin, reduce size, or switch instruments.",
      bullets: [
        "<strong>Funding math:</strong> funding rate × notional value = payment per period; 3 periods per day × 21 days = 63 payments on a 3-week hold",
        "<strong>Effect on liquidation:</strong> as funding drains margin, the liquidation price rises (for longs) toward the stop loss — an invisible risk that grows daily",
        "<strong>Solutions:</strong> (1) add margin to push liquidation back; (2) reduce position size; (3) switch to a dated futures contract (no funding cost); (4) set max hold duration based on funding budget",
        "The ETH trade: target $282, price reached $281.90 (missed by 10 cents), exited ~$268 as funding became unsustainable",
        "Always calculate total expected funding cost before planning any multi-week leveraged position",
        "Master profitability WITHOUT leverage first — if you cannot trade profitably without it, leverage only accelerates losses",
        "Right use: minimize counterparty exposure + optimize capital allocation. Wrong use: bet larger than your system allows."
      ]
    },

    introChart: {
      // The chapter's point is a DYNAMIC (liq rising toward the stop). Instead of three
      // static gold lines crammed in a 3-pt band, the rising liq level is drawn as a
      // TIME-SERIES sub-panel (80 → 83, converging on the flat stop). One stop line +
      // one final liq line stay on price; Target aligned to the 114 top.
      title: "Leveraged Long — Liquidation Level Rising as Funding Accumulates",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(84, [
        { to: 109, bars: 15 },
        { to: 114, bars: 3 }
      ], { seed: 161, wick: 0.4 }),
      markLines: [
        { yAxis: 84,  label: "Entry",         color: "#00d4d4" },
        { yAxis: 80,  label: "Original Stop", color: "#ff2e88" },
        { yAxis: 114, label: "Target",        color: "#00d4d4" }
      ],
      subPanel: {
        kind: "oi",
        type: "line",
        label: "Liquidation Price (creeping up toward stop $80)",
        color: "255,204,0",
        points: [[0, 76], [7, 78], [14, 80], [17, 81]]
      },
      markPoints: [
        { dataIndex:  0, label: "Entry — Liq Far Below",     position: "bottom" },
        { dataIndex: 14, label: "Liq Creeping Toward Stop!", position: "top"    }
      ]
    },

    lessonChart: {
      title: "ETH Swing Trade — Target Near-Miss at $282, Exit $268",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(80, [
        { to: 119, bars: 17 },
        { to: 115, bars: 1 }
      ], { seed: 162, wick: 0.4 }),
      // Palette fixed: Target $282 is the gold (TP) line, Entry teal, Stop pink, and
      // Exit is neutral grey/white (gold is reserved for liq/TP). The mid-trend
      // "Original Target $160" clutter was dropped. A cumulative-funding sub-panel now
      // SHOWS why the exit was forced ("funding brutal"), instead of only asserting it.
      markLines: [
        { yAxis: 80,  label: "Entry ($134 scaled)",       color: "#00d4d4" },
        { yAxis: 76,  label: "Stop ($125)",               color: "#ff2e88" },
        { yAxis: 120, label: "Target ($282 scaled)",      color: "#ffcc00" },
        { yAxis: 114, label: "Exit ($268 — Funding Cost)",color: "#e6e6ee" }
      ],
      subPanel: {
        kind: "oi",
        type: "line",
        label: "Cumulative Funding Paid (eating profit)",
        color: "255,120,120",
        points: [[0, 0], [8, 6], [17, 22]]
      },
      markPoints: [
        { dataIndex: 16, label: "10c from Target — Miss!", position: "top"    },
        { dataIndex: 17, label: "Exit — Funding Brutal",   position: "top"    }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "A trader holds a leveraged long position on a perpetual swap for 3 weeks. The position is profitable but they notice the liquidation price has been slowly creeping closer to their stop loss each day. What is causing this?",
      hint: "What cost occurs every 8 hours on a perpetual swap long position when the funding rate is positive? How does that affect the margin that was posted?",
      style: "choice",
      answers: [
        { id: "a", text: "Positive funding rate payments — longs pay shorts every 8 hours; over 3 weeks (63 periods) this erodes the margin, raising the liquidation price toward the stop",  correct: true,  type: "bearish" },
        { id: "b", text: "The exchange automatically adjusting maintenance margin upward — a standard risk management adjustment during periods of high market volatility",                   correct: false, type: "bullish" },
        { id: "c", text: "Mark price divergence from index price — the basis spread causes apparent margin erosion on paper but does not affect actual realized P&L",                        correct: false, type: "neutral" }
      ],
      chart: {
        // The creep is drawn as a rising gold liq line (sub-panel) climbing 79 → 81,
        // crossing above the flat stop (80) — the sharpest insight of the chapter, now
        // visible instead of two static lines pinned to price. Entry + Stop stay on price.
        title: "3-Week Long — Why Is the Liquidation Price Rising?",
        type: "candlestick",
        cutIndex: 10,
        labels: ltLabels(15),
        ohlc: ltCandles(84, [{ to: 115, bars: 15 }], { seed: 163, wick: 0.4 }),
        markLines: [
          { yAxis: 84, label: "Entry",     color: "#00d4d4" },
          { yAxis: 80, label: "Stop Loss", color: "#ff2e88" }
        ],
        subPanel: {
          kind: "oi",
          type: "line",
          // Starts at 74 — a visible 6-pt gap below the stop — so the reveal
          // "Liq Far Below SL" is true (the old start of 79 was a 1-pt gap).
          label: "Liquidation Price rising (crosses stop $80 by Day 21)",
          color: "255,204,0",
          points: [[0, 74], [7, 78], [14, 81]]
        }
      },
      revealMarkPoints: [
        { dataIndex:  0, label: "Liq Far Below SL",       position: "bottom", color: "#00d4d4" },
        { dataIndex:  7, label: "Funding Eroding Margin", position: "top",    color: "#ffcc00" },
        { dataIndex: 14, label: "Liq Now Above Stop!",    position: "top",    color: "#ff2e88" }
      ],
      explanation: "Every 8-hour funding period costs the long position a percentage of its notional value. Over 3 weeks (63 funding periods), this compounds — draining the margin posted. As margin decreases, the exchange's liquidation calculation rises toward the entry (and eventually toward the stop loss). This is a well-known risk of holding leveraged positions on perpetual swaps for extended periods. Solutions: add margin, reduce size, or switch to a dated futures contract with no funding cost.",
      rule: "Funding erodes margin over time. 3 weeks = 63 funding periods. Calculate total cost before holding long-duration leveraged positions. If liq approaches stop — act immediately."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 10 — Identifying Access Points — Understanding Consolidation
     Module 3 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 10,
    title: "Identifying Access Points — Understanding Consolidation",
    tag: "Module 3 · Session 1",
    module: "Applying the Basics",
    videoUrl: "https://www.youtube.com/embed/vMSQY_JDXr4",

    intro: {
      heading: "Consolidation = Access Points — the Foundation of All Entries",
      body: "Every tradeable entry point in the market comes from consolidation. When price consolidates, it creates a zone where buyers and sellers have wrestled for control. That zone — whether it ends in a continuation or a reversal — becomes a DBS or SSR access point that price will reference on every future visit.",
      bullets: [
        "Price moves due to imbalance between buyers and sellers — larger imbalance = stronger movement",
        "Three market states: rising (demand > supply), falling (supply > demand), consolidating (roughly equal)",
        "Consolidation zones = access points — the areas where the balance of power was established",
        "DBS Zone (Demand/Buyer/Support): lowest price including wicks (bottom) → highest opening of down candle (top)",
        "SSR Zone (Supply/Seller/Resistance): highest price including wicks (top) → lowest opening of up candle (bottom)",
        "Three fundamentals: Strength (explosive breakout), Time (less = stronger), Depletion Factor (first test strongest)"
      ]
    },

    lesson: {
      heading: "DBS and SSR — Definition, Strength, and Depletion",
      body: "The three fundamentals of a valid DBS or SSR zone are Strength, Time, and the Depletion Factor. Understanding all three lets you immediately assess the quality of any zone — and determine whether it is worth trading. If the zone does not stand out at first glance, it is not a valid zone.",
      bullets: [
        "<strong>DBS Zone:</strong> lowest wick to highest opening of down candle; OR a single dramatic down candle before a new Higher High in an uptrend",
        "<strong>SSR Zone:</strong> highest wick to lowest opening of up candle; OR a single dramatic up candle before a new Lower Low in a downtrend",
        "<strong>Strength:</strong> more explosive breakout from the zone = stronger zone; continuation needs HH or LL; reversal needs a market structure break",
        "<strong>Time:</strong> less time forming = stronger zone; a single-candle zone has maximum strength; multi-session zones are weaker",
        "<strong>Depletion Factor:</strong> first test = most orders present = highest probability; each retest depletes orders; zone weakens with every touch",
        "Quick validity test: if the zone does not stand out immediately when you look at the chart, it is not a valid zone",
        "Depletion factor is the same principle as the Rule of Fives in range trading — more touches = more depleted"
      ]
    },

    introChart: {
      // A prior uptrend to a visible swing high (idx5) comes FIRST, so the later "Higher
      // High" is genuinely higher than a high on-screen — then the drop into the single
      // dramatic DBS down candle (idx16: open 84.9, low 78.8) and the explosive breakout.
      // Zone = lowest wick (78.8) to highest open of the down candle (84.9). Seed 160
      // harness-verified (DBS is a down candle; HH at 124 clears the prior high).
      title: "DBS Zone — Explosive Breakout Defines Maximum Strength",
      markLines: [ { yAxis: 84.9, label: "DBS Top — Highest Open of Down Candle", color: "#00d4d4" }, { yAxis: 78.8, label: "DBS Bottom — Lowest Wick", color: "#00d4d4" } ],
      type: "candlestick",
      labels: ltLabels(24),
      ohlc: ltCandles(96, [
        { to: 115, bars: 6 },
        { to: 107, bars: 3 },
        { to: 80,  bars: 8 },
        { to: 92,  bars: 1 },
        { to: 116, bars: 1 },
        { to: 116, bars: 4 },
        { to: 122, bars: 1 }
      ], { seed: 160, wick: 0.4 }),
      markAreas: [
        { y0: 78.8, y1: 84.9, label: "DBS Zone", color: "rgba(0,212,212,0.08)" }
      ],
      markPoints: [
        { dataIndex:  5, label: "Prior High",               position: "top", color: "#5a5a78" },
        { dataIndex: 16, label: "Single Down Candle = DBS", position: "bottom" },
        { dataIndex: 17, label: "Explosive Breakout Up!",   position: "top"    },
        { dataIndex: 23, label: "Higher High — Strength ✓", position: "top"    }
      ]
    },

    lessonChart: {
      // Zone re-anchored to the actual SSR candle (idx10: open 100, wick high 116.57):
      // per the definition, top = highest price incl. wicks (116.6), bottom = lowest
      // opening of the up candle (100). The SSR Top line is now drawn to bracket the
      // box (was missing); the old 100–105 box covered only the bottom ~45% of the body.
      title: "SSR Zone — Single Candle Maximum Strength, Explosive Rejection",
      markLines: [ { yAxis: 116.6, label: "SSR Top — Highest Wick", color: "#ff2e88" }, { yAxis: 100, label: "SSR Bottom — Lowest Open of Up Candle", color: "#ff2e88" }, { yAxis: 80, label: "Structure Break — Prior Low Taken", color: "#ff2e88" } ],
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(80, [
        { to: 100, bars: 10 },
        { to: 111, bars: 1  },
        { to: 96,  bars: 1  },
        { to: 78,  bars: 6  }
      ], { seed: 165, wick: 0.4 }),
      markAreas: [
        { y0: 100, y1: 116.6, label: "SSR Zone", color: "rgba(255,46,136,0.08)" }
      ],
      markPoints: [
        { dataIndex: 10, label: "Single Up Candle = SSR",  position: "top"    },
        { dataIndex: 11, label: "Explosive Rejection!",    position: "top"    },
        { dataIndex: 17, label: "Lower Low — Strength ✓",  position: "bottom" }
      ]
    },

    quiz: {
      question: "Price drops sharply into a new area and immediately reverses with a strong explosive move up, creating a new Higher High. No consolidation occurred — just a single dramatic down candle before the reversal. What type of zone has formed and what is its key quality?",
      hint: "Which zone type can be defined by a single candle? What does that single candle create? What is the strength quality of a single-candle zone compared to a multi-session consolidation zone?",
      style: "direction",
      answers: [
        { id: "a", text: "DBS Zone — single candlestick with explosive breakout creates maximum strength; first retest will be the highest probability entry",             correct: true,  type: "bullish" },
        { id: "b", text: "SSR Zone — the down candle before the reversal is a supply zone; sellers were momentarily in control at that price level",                     correct: false, type: "bearish" },
        { id: "c", text: "Not a valid zone — a single candle without multi-session consolidation does not meet the minimum criteria for a DBS or SSR zone",              correct: false, type: "neutral" }
      ],
      chart: {
        // Zone re-anchored to the DBS candle (idx8: open 77.06, low 69.73) with named
        // top/bottom lines. Final leg extended to 105 so idx13 closes ABOVE the prior
        // high (~101), making the "new Higher High = strength" the answer relies on a
        // real, drawn higher high; a faint dashed Prior High line makes it visible.
        title: "Single Candle + Explosive Move — What Zone Formed?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(14),
        ohlc: ltCandles(100, [
          { to: 72, bars: 9  },
          { to: 82, bars: 1  },
          { to: 105, bars: 4 }
        ], { seed: 166, wick: 0.4 }),
        markLines: [
          { yAxis: 101, label: "Prior High", color: "#5a5a78" },
          { yAxis: 77.1, label: "DBS Top — Highest Open", color: "#00d4d4" },
          { yAxis: 69.7, label: "DBS Bottom — Lowest Wick", color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 69.7, y1: 77.1, label: "Zone Formed Here", color: "rgba(0,212,212,0.07)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  8, label: "Single Down Candle",        position: "bottom", color: "#00d4d4" },
        { dataIndex:  9, label: "Explosive Move Up = DBS!",  position: "top",    color: "#00d4d4" },
        { dataIndex: 13, label: "New Higher High = Strength",position: "top",    color: "#00d4d4" }
      ],
      explanation: "A <strong>DBS Zone</strong> has formed. The single down candle at the bottom represents the area where buyers completely overwhelmed sellers and launched an explosive move to a new Higher High. A single-candle zone has <strong>maximum strength</strong> because one party dominated in a single session with no ambiguity. The first retest of this zone will be the highest probability entry — the depletion factor is at maximum because all the orders that created the original breakout are still present.",
      rule: "Single candle + explosive breakout = maximum strength DBS (or SSR) zone. First test = highest probability. Zone weakens with each subsequent retest."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 11 — Trading S/R — DBS/SSR Strategies
     Module 3 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 11,
    title: "Trading S/R — DBS/SSR Strategies",
    tag: "Module 3 · Session 2",
    module: "Applying the Basics",
    videoUrl: "https://www.youtube.com/embed/1lDySYkzFpo",

    intro: {
      heading: "From Zone to Trade — Aggressive, Conservative, and S/R Flips",
      body: "Identifying a DBS or SSR zone is only half the job. The other half is knowing how to enter at that zone. Course 3 provides two distinct entry strategies plus the high-probability S/R flip setup that occurs when a zone changes polarity — which is consistently one of the best setups in the entire framework.",
      bullets: [
        "Aggressive entry: bids along the UPPER limit of a DBS zone (longs) / asks at LOWER limit of SSR zone (shorts)",
        "Conservative entry: layer bids or asks WITHIN the zone; stop above/below a stronger key level for invalidation",
        "These are loose frameworks — not guaranteed setups; journal every outcome to find what works for your system",
        "DBS/SSR + LTE: the zone IS the Level in the framework; add a trigger (engulfing, hammer) = complete LTE setup",
        "S/R Flip: SSR broken convincingly above → becomes DBS. DBS broken convincingly below → becomes SSR",
        "First test of flipped zone = highest probability entry — depletion factor is fresh; all original orders still present"
      ]
    },

    lesson: {
      heading: "S/R Flip — The Prime Trading Opportunity",
      body: "When a DBS or SSR zone is convincingly broken, it undergoes a polarity flip. Resistance becomes support; support becomes resistance. The first test of the newly flipped zone is consistently one of the highest probability setups in the toolkit — the depletion factor is at maximum, the invalidation level is clear, and the breakout has already confirmed who is in control.",
      bullets: [
        "<strong>SSR Flip to DBS:</strong> price closes convincingly above SSR zone → on first pullback to that zone from above, it acts as DBS support → enter long",
        "<strong>DBS Flip to SSR:</strong> price closes convincingly below DBS zone → on first retest of that zone from below, it acts as SSR resistance → enter short",
        "<strong>Flip confirmation:</strong> price must CLOSE convincingly above/below the entire zone; a wick through is not enough",
        "<strong>Entry timing:</strong> for long after SSR flip, set limit bids at the top of the now-flipped zone; stop below zone; target at next SSR level above",
        "Be a buyer at DBS (support) — be a seller at SSR (resistance) — this principle never changes, even after a flip",
        "After the zone flips, treat it the same as any fresh DBS or SSR zone and apply the depletion factor rules from there",
        "S/R flips with DBS/SSR zones = clear Level, clear Trigger (LTE), clear Invalidation = ideal complete setup"
      ]
    },

    introChart: {
      title: "Aggressive DBS Entry — Bids at Upper Limit, Stop Below Zone",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(106, [
        { to: 85, bars: 9  },
        { to: 83, bars: 2  },
        { to: 109, bars: 5 }
      ], { seed: 167, wick: 0.4 }),
      markAreas: [
        { y0: 81, y1: 86, label: "DBS Zone", color: "rgba(0,212,212,0.08)" }
      ],
      markLines: [
        { yAxis: 79, label: "Stop Below Zone", color: "#ff2e88" }
      ],
      // The trader's resting bids laddered into the DBS — heaviest at the upper limit (aggressive entry)
      orderBook: {
        bids: [ { price: 86, size: 9 }, { price: 84, size: 5 }, { price: 82, size: 3 } ],
        bidLabel: "Bid Wall — Aggressive DBS Entry"
      },
      markPoints: [
        { dataIndex:  8, label: "Bids at Upper DBS (84–86)", position: "bottom" },
        { dataIndex: 11, label: "Entry Fills at Upper Limit", position: "bottom" },
        { dataIndex: 15, label: "Trade Running",              position: "top"    }
      ]
    },

    lessonChart: {
      // REBUILT so the level ACTS as resistance first: price is rejected at 100 twice
      // (idx4, idx8 — clean reject wicks), THEN a decisive close above the whole zone
      // (idx13 = 108), THEN a first retest that tags the flipped-zone top from above
      // (idx15 = 103), THEN the run to target. A real S/R flip, not one clean impulse.
      title: "S/R Flip Long — Buy Broken Resistance on First Retest",
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(82, [
        { to: 100, bars: 5, reject: 3 },
        { to: 95,  bars: 2 },
        { to: 100, bars: 2, reject: 3 },
        { to: 96,  bars: 2 },
        { to: 108, bars: 3 },
        { to: 103, bars: 2 },
        { to: 118, bars: 2 }
      ], { seed: 168, wick: 0.4 }),
      markLines: [ { yAxis: 104, label: "Entry — Top of Flipped Zone", color: "#00d4d4" }, { yAxis: 96, label: "Stop — Below Flipped Zone", color: "#ff2e88" }, { yAxis: 117, label: "Target — Next SSR Above", color: "#ffcc00" },
        { yAxis: 100, label: "SSR Flip Level — Now DBS", color: "#00d4d4" }
      ],
      markAreas: [
        { y0: 98, y1: 104, label: "Flipped Zone: SSR → DBS", color: "rgba(0,212,212,0.07)" }
      ],
      markPoints: [
        { dataIndex:  4, label: "SSR Resistance — Test 1",   position: "top"    },
        { dataIndex:  8, label: "Rejected Again — Test 2",   position: "top"    },
        { dataIndex: 13, label: "Decisive Break Above",      position: "top"    },
        { dataIndex: 15, label: "First Retest → Flip Entry", position: "bottom" },
        { dataIndex: 17, label: "Target Ahead",              position: "top"    }
      ]
    },

    quiz: {
      question: "A well-defined SSR zone has been tested three times as resistance. On the fourth touch, a high-volume breakout candle closes above the entire zone. Price then pulls back to retest the top of the zone from above. What is the correct trade action?",
      hint: "When a resistance zone is convincingly broken, what happens to its polarity? What is the highest probability entry at a freshly flipped zone?",
      style: "direction",
      answers: [
        { id: "a", text: "Enter long on the first retest of the flipped zone — old SSR is now DBS; the first test after a flip is the highest probability entry; depletion factor is fresh", correct: true,  type: "bullish" },
        { id: "b", text: "Short the retest — price returning to old resistance confirms weakness; the breakout was likely a fake-out and the zone still holds as resistance",                   correct: false, type: "bearish" },
        { id: "c", text: "Wait for a second retest — one touch after the flip is insufficient to confirm the zone has changed polarity; two touches minimum required",                         correct: false, type: "neutral" }
      ],
      chart: {
        // REBUILT to match the question: 100 is tested as resistance THREE times
        // (idx2/6/8 reject wicks), the fourth touch is a decisive breakout (idx10 =
        // 107), then a first retest tags 100 from above (idx12) — the flip entry. The
        // "high-volume breakout candle" the question cites is now drawn (volume panel).
        title: "SSR Broken — Retest from Above. What Is the Trade?",
        type: "candlestick",
        cutIndex: 11,
        labels: ltLabels(15),
        volume: true,
        ohlc: ltCandles(88, [
          { to: 100, bars: 3, reject: 3 },
          { to: 96,  bars: 2 },
          { to: 100, bars: 2, reject: 3 },
          { to: 96,  bars: 1 },
          { to: 100, bars: 1, reject: 3 },
          { to: 107, bars: 2 },
          { to: 100, bars: 2 },
          { to: 112, bars: 2 }
        ], { seed: 169, wick: 0.4 }),
        markLines: [
          { yAxis: 100, label: "SSR Flip Level", color: "#00d4d4" }
        ],
        markAreas: [
          { y0: 98, y1: 103, label: "Flipped Zone", color: "rgba(0,212,212,0.07)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex: 10, label: "Breakout Above SSR",       position: "top",    color: "#00d4d4" },
        { dataIndex: 12, label: "First Retest → Flip Entry Long!", position: "bottom", color: "#00d4d4" },
        { dataIndex: 14, label: "Trade Running",            position: "top",    color: "#00d4d4" }
      ],
      explanation: "When an SSR zone is convincingly broken to the upside, it undergoes a <strong>polarity flip</strong> — it becomes a DBS zone. The first retest from above is the highest probability long entry: the depletion factor is at maximum (all original breakout orders still present), the invalidation level is clear (below the zone), and the prior breakout confirmed buyers are in control. Shorting the retest fights the trend; waiting for a second test wastes the highest probability moment.",
      rule: "SSR broken → becomes DBS. DBS broken → becomes SSR. First test of the flipped zone = highest probability entry. Depletion factor is freshest here — never wait for a second test."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 12 — Trading Ranges
     Module 3 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 12,
    title: "Trading Ranges",
    tag: "Module 3 · Session 3",
    module: "Applying the Basics",
    videoUrl: "https://www.youtube.com/embed/rkB5LZmWGak",

    intro: {
      heading: "Range Trading — Four Rules That Define the Strategy",
      body: "A range-bound market is not a no-trade zone — it is a well-defined structure with predictable bounce points. The key is knowing the four rules that govern range trading: trade first tests, avoid the midpoint chop zone, apply the Rule of Fives, and use swing points as invalidation.",
      bullets: [
        "Range Low = buyers / demand zone / support. Range High = sellers / supply zone / resistance",
        "Midpoint = Fibonacci 50% between Range High and Low — the chop zone to avoid",
        "Rule 1 — Trade First Tests: first touch of Range Low or High = highest hit rate; freshest orders present",
        "Rule 2 — Midpoint = Chop Zone: large unpredictable moves happen at mid; avoid setting up trades here",
        "Rule 3 — Rule of Fives: 5th touch of Range High or Low = likely exhaustion; breakout/breakdown expected",
        "Rule 4 — Swing Points = Invalidation: use swing highs (for shorts) and swing lows (for longs) as stop reference"
      ]
    },

    lesson: {
      heading: "The Four Range Rules in Practice",
      body: "Each of the four range trading rules addresses a specific risk that destroys range traders. The first test rule ensures you enter at peak probability. The midpoint rule keeps you out of the chaotic centre. The Rule of Fives prevents you from shorting an exhausted resistance. Swing point invalidation gives you a stop that survives normal wicks.",
      bullets: [
        "<strong>Rule 1 — First Tests:</strong> mark each touch with a number (1, 2, 3...); first touch has the most orders; each subsequent touch depletes orders; beyond touch 3 or 4, the hit rate drops materially",
        "<strong>Rule 2 — Midpoint:</strong> exact midpoint from Fib 50%; use only to gauge trade progress — above mid = likely heading to Range High; below mid = likely heading to Range Low; never trade setups here",
        "<strong>Rule 3 — Rule of Fives:</strong> when Range High has been touched 4 times and is approached for the 5th — do not short; prepare for a breakout above; same for Range Low",
        "<strong>Rule 4 — Swing Points:</strong> add a buffer around swing lows (for long stops) and swing highs (for short stops); the buffer is essential — wicks regularly probe just beyond swing points",
        "Scalp Long: enter at Range Low → stop below swing low with buffer → target Range High (3:1 to 4:1 RRR)",
        "Scalp Short: enter at Range High → stop above swing high with buffer → target Range Low (3:1 to 4:1 RRR)",
        "Volume confirms: high buy volume on Range Low touch = buyers stepping in; high sell volume on Range High = sellers defending"
      ]
    },

    introChart: {
      title: "Trading Range — Low, High, Midpoint, Touch Numbers",
      type: "candlestick",
      labels: ltLabels(20),
      ohlc: ltCandles(93, [
        { to: 84, bars: 4 },
        { to: 93, bars: 4 },
        { to: 84, bars: 3 },
        { to: 93, bars: 4 },
        { to: 84, bars: 4 },
        { to: 87, bars: 1 }
      ], { seed: 170, wick: 0.4 }),
      markAreas: [
        { y0: 82, y1: 87, label: "Range Low — Demand / Support",  color: "rgba(0,212,212,0.07)" },
        { y0: 91, y1: 96, label: "Range High — Supply / Resistance", color: "rgba(255,46,136,0.07)" }
      ],
      markLines: [
        { yAxis: 88.5, label: "Midpoint (Fib 50%) — Chop Zone, Avoid", color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  3, label: "Low — Touch 1 (best entry)",  position: "bottom" },
        { dataIndex:  7, label: "High — Touch 1 (best entry)", position: "top"    },
        { dataIndex: 10, label: "Low — Touch 2",  position: "bottom" },
        { dataIndex: 14, label: "High — Touch 2", position: "top"    },
        { dataIndex: 18, label: "Low — Touch 3",  position: "bottom" }
      ]
    },

    lessonChart: {
      // REBUILT so a REAL 5th touch exists: after four rejections of 95 (idx1/7/13/17)
      // the 5th approach POKES into the Range High band (idx21 closes 96) — the actual
      // Rule-of-Fives candle — and only THEN confirms with a breakout (idx22 = 106).
      // Previously only four touches rendered and "Touch 5" was pinned on a candle
      // already 5 points clear of the band.
      title: "Rule of Fives — 5th Touch Breaks Out Instead of Bouncing",
      type: "candlestick",
      labels: ltLabels(23),
      ohlc: ltCandles(88, [
        { to: 95, bars: 2 },
        { to: 86, bars: 3 },
        { to: 95, bars: 3 },
        { to: 86, bars: 3 },
        { to: 95, bars: 3 },
        { to: 86, bars: 2 },
        { to: 95, bars: 2 },
        { to: 88, bars: 2 },
        { to: 96, bars: 2 },
        { to: 106, bars: 1 }
      ], { seed: 171, wick: 0.4 }),
      markAreas: [
        { y0: 84, y1: 89, label: "Range Low",  color: "rgba(0,212,212,0.07)" },
        { y0: 93, y1: 98, label: "Range High", color: "rgba(255,46,136,0.07)" }
      ],
      markPoints: [
        { dataIndex:  1, label: "High — Touch 1", position: "top"    },
        { dataIndex:  7, label: "High — Touch 2", position: "top"    },
        { dataIndex: 13, label: "High — Touch 3", position: "top"    },
        { dataIndex: 17, label: "High — Touch 4", position: "top"    },
        { dataIndex: 21, label: "Touch 5 — Do Not Short!", position: "bottom" },
        { dataIndex: 22, label: "Breakout Confirmed — Buy", position: "top" }
      ]
    },

    quiz: {
      question: "A range has been clearly defined. Price has tested the Range High four times, bouncing off each time, and is now approaching the Range High for a fifth time. What does the Rule of Fives say to do?",
      hint: "What happens to orders at a level with each successive test? What does the 5th touch signal about the remaining supply at the Range High?",
      style: "choice",
      answers: [
        { id: "a", text: "Do NOT short the 5th touch — the Rule of Fives signals likely exhaustion and potential breakout above Range High; look to buy the breakout instead", correct: true,  type: "bearish" },
        { id: "b", text: "Short aggressively at the 5th touch — repeated resistance tests confirm the zone is very strong; sellers will step in again at the same level",       correct: false, type: "bullish" },
        { id: "c", text: "The 5th touch has no special significance — trade it the same way as any other Range High touch using the standard entry strategy",                  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Range High — Five Touches. What Does the Rule of Fives Say?",
        type: "candlestick",
        // cutIndex 19 (was 18) so all FOUR touches the stem asserts (idx1/7/13/18)
        // are visible pre-reveal; the 5th approach (idx19) stays behind the cut.
        cutIndex: 19,
        labels: ltLabels(21),
        ohlc: ltCandles(88, [
          { to: 95, bars: 2 },
          { to: 86, bars: 3 },
          { to: 95, bars: 3 },
          { to: 86, bars: 3 },
          { to: 95, bars: 3 },
          { to: 86, bars: 4 },
          { to: 95, bars: 1 },
          { to: 97, bars: 1 },
          { to: 103, bars: 1 }
        ], { seed: 172, wick: 0.4 }),
        markAreas: [
          { y0: 84, y1: 89, label: "Range Low",  color: "rgba(0,212,212,0.07)" },
          { y0: 93, y1: 98, label: "Range High", color: "rgba(255,46,136,0.07)" }
        ],
        markLines: [
          { yAxis: 88.5, label: "Midpoint — Chop Zone", color: "#ffcc00" }
        ]
      },
      // The genuine 5th touch is idx19 (pokes INTO the band, close 97) — it is now
      // labelled as Touch 5, and idx20 (103, clear of the band) gets its own separate
      // "Breakout Confirmed" pin, so the level doesn't appear to jump 95 → 103.
      revealMarkPoints: [
        { dataIndex:  1, label: "Touch 1", position: "top",    color: "#ffcc00" },
        { dataIndex:  7, label: "Touch 2", position: "top",    color: "#ffcc00" },
        { dataIndex: 13, label: "Touch 3", position: "top",    color: "#ffcc00" },
        { dataIndex: 18, label: "Touch 4", position: "top",    color: "#ffcc00" },
        { dataIndex: 19, label: "Touch 5 — Do Not Short!", position: "top", color: "#ff2e88" },
        { dataIndex: 20, label: "Breakout Confirmed — Buy", position: "top", color: "#00d4d4" }
      ],
      explanation: "The Rule of Fives: by the 5th touch of a Range High, the zone has been depleted of most of its resting sell orders. The sellers who were defending that level have gradually been absorbed across four previous tests. The 5th approach is the point of maximum exhaustion — the most likely outcome is a breakout above Range High rather than another rejection. <strong>Do not short the 5th touch. Look to buy the breakout instead.</strong>",
      rule: "Rule of Fives: 5th touch of Range High or Range Low = likely exhaustion. Do not short Range High touch 5. Do not long Range Low touch 5. Wait for and buy/sell the breakout."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 13 — Range Market Scenario — Live Walkthrough
     Module 3 · Session 4
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 13,
    title: "Range Market Scenario — Live Walkthrough",
    tag: "Module 3 · Session 4",
    module: "Applying the Basics",
    videoUrl: "https://www.youtube.com/embed/pZRnkcfs6s0",

    intro: {
      heading: "Applying the Range Rules in Real Market Conditions",
      body: "Theory becomes skill through application. This walkthrough demonstrates the four range rules in real-time conditions: reading structure on multiple timeframes, tracking touch counts, using the midpoint as a progress gauge, and managing a stop loss buffer to survive fake-outs.",
      bullets: [
        "Process: 4H for big picture → 1H to define Range High, Range Low, Midpoint → 30min/15min to fine-tune",
        "Mark each touch of Range High or Range Low with a number (1, 2, 3...) to track depletion",
        "Midpoint as progress gauge: price reclaims mid and holds → increased confidence the trade is heading to target",
        "Buffer on stop: essential — wicks and fake-outs regularly probe just beyond Range High or Range Low by a small margin",
        "HH/HL forming inside the range = early warning that buyers are gaining control → potential Range High breakout ahead",
        "Volume confirms direction: high volume on Range Low bounce = buyers stepping in; high on Range High = sellers defending"
      ]
    },

    lesson: {
      heading: "Long from Range Low, Short from Range High — Key Takeaways",
      body: "The live session demonstrated both a long from Range Low and a short from Range High, with the midpoint guiding confidence at each stage. The most important lesson: fake-outs at Range extremes are common and require a stop buffer. Being stopped out by a wick before the real move is a solvable problem — just add buffer.",
      bullets: [
        "<strong>Long trade process:</strong> enter at Range Low (fresh first/second test) → stop below swing low with buffer → once price crosses midpoint and holds, confidence in Range High target increases significantly",
        "<strong>Short trade process:</strong> enter at Range High (fresh first/second test) → stop above swing high with buffer → if price drops below mid, confidence in Range Low target increases",
        "<strong>Fake-out management:</strong> wicks that spike briefly above Range High or below Range Low before reversing are normal; a stop placed tightly at the zone boundary will get hit; always add buffer above the swing extreme",
        "Market structure within ranges: HH/HL forming inside range = buyers strengthening → lean toward expecting Range High breakout",
        "Rule of Fives in live context: 5th touch of Range High led to a breakout — traders who shorted were stopped out; buyers were right",
        "Midpoint rule confirmed: price below mid moved to Range Low; price above mid moved to Range High — consistently",
        "Journal the RRR of every range trade — typically 3:1 to 4:1 in a clean range; adjust size accordingly"
      ]
    },

    introChart: {
      // Trimmed to ONE clean trade so the midpoint reads as a progress gauge for a
      // single long: bounce off Range Low (idx4) → reclaim + hold above midpoint (idx7)
      // → tag Range High (idx12). Previously it round-tripped (Low→High→back to 87→
      // re-rally), which is really two trades told as one continuous "progress" arc.
      title: "Live Range — Midpoint as Progress Gauge",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(94, [
        { to: 85, bars: 5 },
        { to: 89, bars: 3 },
        { to: 95, bars: 5 },
        { to: 93, bars: 3 }
      ], { seed: 173, wick: 0.4 }),
      markAreas: [
        { y0: 83, y1: 88, label: "Range Low",  color: "rgba(0,212,212,0.07)" },
        { y0: 93, y1: 98, label: "Range High", color: "rgba(255,46,136,0.07)" }
      ],
      markLines: [ { yAxis: 84, label: "Stop — Buffer below Range Low", color: "#ff2e88" },
        { yAxis: 90.5, label: "Midpoint", color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  4, label: "Long Entry — Range Low",  position: "bottom" },
        { dataIndex:  7, label: "Above Mid — Confident",   position: "top"    },
        { dataIndex: 12, label: "Target — Range High Hit", position: "top"    }
      ]
    },

    lessonChart: {
      title: "Fake-out at Range High — Stop Buffer Saves the Short",
      type: "candlestick",
      labels: ltLabels(16),
      // Fixed so the buffer actually HOLDS: the fake-out spike (idx8) now tops ~102.3,
      // and the "Stop with Buffer" sits ABOVE it at 104 — so the probe pierces the
      // Range High but never the stop, exactly demonstrating the lesson. Previously the
      // reject:4 spike reached ~104 and blew through the 101 buffer (contradicting it).
      ohlc: ltCandles(88, [
        { to: 95, bars: 7 },
        { to: 99, bars: 2, reject: 2 },
        { to: 84, bars: 7 }
      ], { seed: 174, wick: 0.4 }),
      markAreas: [
        { y0: 85, y1: 89, label: "Range Low",  color: "rgba(0,212,212,0.07)" },
        { y0: 94, y1: 98, label: "Range High", color: "rgba(255,46,136,0.07)" }
      ],
      markLines: [ { yAxis: 91.5, label: "Midpoint — cross down = target confident", color: "#ffcc00" }, { yAxis: 87, label: "Target — Range Low", color: "#00d4d4" },
        { yAxis: 98, label: "Short Entry",       color: "#ff2e88" },
        { yAxis: 104,label: "Stop with Buffer",  color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  6, label: "Short at Range High",  position: "top"    },
        { dataIndex:  8, label: "Fake-out Spike — Buffer Holds!", position: "top" },
        { dataIndex: 15, label: "Target Range Low Hit", position: "bottom" }
      ]
    },

    quiz: {
      question: "A trader enters short at the Range High. Price briefly spikes 0.4% above the Range High (hitting their stop loss), then immediately reverses and drops through the midpoint toward Range Low. The stop was triggered. What mistake did the trader make?",
      hint: "Wicks that probe just beyond Range extremes before reversing are normal price behavior. What should the stop placement account for to survive these fake-outs?",
      style: "direction",
      answers: [
        { id: "a", text: "Insufficient stop buffer — fake-out wicks regularly probe above Range High by a small margin; the stop should have been placed above the wick extreme with a buffer, not at the Range High itself",   correct: true,  type: "bearish" },
        { id: "b", text: "The trader should not have shorted at all — a spike above Range High confirms a breakout; they should have exited short and gone long immediately",                                                 correct: false, type: "bullish" },
        { id: "c", text: "The trade was correctly set up — being stopped out by a fake-out is an unavoidable and unpreventable part of trading ranges; no mistake was made",                                                correct: false, type: "neutral" }
      ],
      chart: {
        title: "Short at Range High — Stop Hit by Spike. What Went Wrong?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(88, [
          { to: 96, bars: 8 },
          { to: 100, bars: 1, reject: 3 },
          { to: 84,  bars: 6 }
        ], { seed: 175, wick: 0.4 }),
        markAreas: [
          { y0: 85, y1: 89, label: "Range Low",  color: "rgba(0,212,212,0.07)" },
          { y0: 94, y1: 98, label: "Range High", color: "rgba(255,46,136,0.07)" }
        ],
        markLines: [ { yAxis: 91.5, label: "Midpoint", color: "#ffcc00" },
          { yAxis: 98, label: "Short Entry",              color: "#ff2e88" },
          { yAxis: 99, label: "Tight Stop — No Buffer!",  color: "#ffcc00" },
          { yAxis: 106, label: "Buffered Stop (correct — above the wick)", color: "#5a5a78" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "Short Entry at Range High",  position: "top",    color: "#ff2e88" },
        { dataIndex:  8, label: "Spike Hits Tight Stop!",     position: "top",    color: "#ff2e88" },
        { dataIndex: 14, label: "Would Have Hit Target!",     position: "bottom", color: "#00d4d4" }
      ],
      explanation: "Fake-outs — brief spikes beyond Range High or Range Low before reversing — are <strong>normal price behavior</strong> and not signals that the range has broken. The mistake was placing the stop too tightly at the Range High with no buffer. A correctly placed stop should sit above the typical wick extreme, giving enough room to survive these routine probes. With a proper buffer, the short would have remained active and hit the Range Low target.",
      rule: "Always add a buffer above the swing high for short stops (and below swing low for long stops). Fake-out wicks are normal. A buffer-less stop at the zone edge will be hit routinely."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 14 — Crafting Your System
     Module 4 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 14,
    title: "Crafting Your System",
    tag: "Module 4 · Session 1",
    module: "Crafting Your System",
    videoUrl: "https://www.youtube.com/embed/hZC0WUZl_Ls",

    intro: {
      heading: "What Is a Trading System?",
      body: "A trading system is a complete, rules-based framework for engaging with financial markets. It includes risk management, position sizing, entry and exit rules, trade management rules, and defined market conditions for trading. Its primary goal is to remove gut feel and replace it with predefined, consistent decisions that compound over time.",
      bullets: [
        "A trading system removes emotion from decisions — every action is predefined before the market opens",
        "The more explicit and detailed your system, the more consistent your trading will become over time",
        "Seven components: Markets, Time Frames, Risk, Trade Setups, Entry Triggers, Exit Triggers, Trade Management",
        "Trust your system during drawdowns — losing streaks are inevitable for every valid system",
        "Blame lack of discipline, not the system — if the drawdown has not exceeded your maximum acceptable level, the system is valid",
        "When the system exceeds its maximum acceptable drawdown level: that is the time to revamp and rebuild"
      ]
    },

    lesson: {
      heading: "The Seven Components of a Trading System",
      body: "Building a complete trading system requires defining all seven components before you place a single trade. Leaving any component undefined means you will make inconsistent decisions in that area — which undermines the entire system's edge over time.",
      bullets: [
        "<strong>1. Markets:</strong> which markets does the system trade? Range-bound or trending? Volatile or stable? Crypto only or multi-asset?",
        "<strong>2. Time Frames:</strong> which TF for analysis? Which for execution? Expected trade duration (hours, days, weeks)?",
        "<strong>3. Risk:</strong> maximum % risk per trade; total acceptable drawdown before system review; position sizing formula",
        "<strong>4. Trade Setups:</strong> technical (indicators) or discretionary (price structure + LTE)? Clearly defined entry criteria",
        "<strong>5. Entry Triggers:</strong> what specifically triggers a trade entry? Moving average crossover? LTE + bullish engulfing at DBS?",
        "<strong>6. Exit Triggers:</strong> what triggers an exit? LTE at resistance? Kijun close? Trailing stop at swing high? Set & Forget TP?",
        "<strong>7. Trade Management:</strong> how involved are you during the trade? Compound winners? Average into entries? Partial TPs?"
      ]
    },

    introChart: {
      // Retitled — it draws ONE systematic equity curve, not competing "curves".
      // Revamp line lowered 106 → 88: the curve opens at 100 (below the old line!)
      // and the context lead-in bottoms at 88.37 (harness-recomputed), so 88 is the
      // highest level the whole drawn series never trades below.
      title: "System Trading — One Equity Curve, Drawdowns Within Tolerance",
      markAreas: [ { y0: 109, y1: 113, label: "Drawdown (within tolerance)", color: "rgba(255,46,136,0.07)" } ],
      markLines: [ { yAxis: 88, label: "Max Acceptable Drawdown — below = revamp", color: "#ff2e88" } ],
      type: "candlestick",
      labels: ltLabels(18),
      ohlc: ltCandles(100, [
        { to: 113, bars: 7 },
        { to: 110, bars: 5 },
        { to: 135, bars: 6 }
      ], { seed: 176, wick: 0.35 }),
      markPoints: [
        { dataIndex:  0, label: "System: Consistent",  position: "top"    },
        { dataIndex:  6, label: "System: Drawdown OK", position: "bottom" },
        { dataIndex: 11, label: "System: Trust It",    position: "bottom" },
        { dataIndex: 17, label: "System: Compounds",   position: "top"    }
      ]
    },

    lessonChart: {
      title: "Seven System Components in Action on a Single Trade",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(102, [
        { to: 84, bars: 8 },
        { to: 84, bars: 1 },
        { to: 115, bars: 7 }
      ], { seed: 177, wick: 0.4 }),
      markAreas: [
        { y0: 82, y1: 87, label: "Level (DBS Zone)", color: "rgba(0,212,212,0.07)" }
      ],
      markLines: [
        { yAxis: 84,  label: "Entry (Trigger Confirmed)", color: "#00d4d4" },
        { yAxis: 80,  label: "Stop (Risk — Component 3)", color: "#ff2e88" },
        { yAxis: 110, label: "Target (Exit Trigger)",     color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  7, label: "T — Trigger at DBS",   position: "bottom" },
        { dataIndex:  8, label: "E — Entry",            position: "bottom" },
        { dataIndex: 14, label: "System TP Target",     position: "top"    }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "A trader has been profitable for 3 months but then suffers 6 consecutive losses. They abandon their system and start trading based on feel. According to Course 3, what is the correct response to a losing streak?",
      hint: "Are losing streaks expected within a valid trading system? What is the only threshold that triggers a system review?",
      style: "choice",
      answers: [
        { id: "a", text: "Trust the system — losing streaks are inevitable; abandoning it during drawdowns is what causes permanent damage; only revamp if the drawdown exceeds the predefined maximum acceptable level", correct: true,  type: "neutral" },
        { id: "b", text: "Switch to a higher timeframe and increase position size to recover losses more quickly than the system would normally allow",                                                                    correct: false, type: "bullish" },
        { id: "c", text: "The system is broken — 6 consecutive losses is statistically impossible for a valid edge; rebuild from scratch immediately",                                                                   correct: false, type: "bearish" }
      ],
      chart: {
        title: "Losing Streak — Abandon System or Trust It?",
        // Line at 78 (was 80): the deepest wick prints 79.40, so the drawdown stays
        // ABOVE the max-acceptable line and the "Drawdown Was Normal" reveal is true.
        markLines: [ { yAxis: 78, label: "Max Acceptable Drawdown (predefined)", color: "#ff2e88" } ],
        type: "candlestick",
        cutIndex: 8,
        labels: ltLabels(16),
        ohlc: ltCandles(100, [
          { to: 82, bars: 8 },
          { to: 83, bars: 1 },
          { to: 113, bars: 7 }
        ], { seed: 178, wick: 0.4 })
      },
      revealMarkPoints: [
        { dataIndex:  0, label: "Loss 1",                position: "bottom", color: "#ff2e88" },
        { dataIndex:  3, label: "Loss 4",                position: "bottom", color: "#ff2e88" },
        { dataIndex:  7, label: "Loss 6 — Trust System!", position: "bottom", color: "#ffcc00" },
        { dataIndex:  9, label: "System Recovers",       position: "top",    color: "#00d4d4" },
        { dataIndex: 15, label: "Drawdown Was Normal",   position: "top",    color: "#00d4d4" }
      ],
      explanation: "Losing streaks are a <strong>mathematical inevitability</strong> for every trading system, even highly profitable ones. Six consecutive losses does not mean the system is broken — it means the system is experiencing normal variance. Abandoning the system during a drawdown and switching to gut-feel trading is consistently the most destructive decision a trader can make. The only trigger for a genuine system review is if the drawdown has exceeded the predefined maximum acceptable level built into the system.",
      rule: "Trust your system during losing streaks. Only revamp when the drawdown exceeds your predefined maximum. Abandoning the system mid-drawdown destroys the edge."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 15 — Applying Your System — The Trading Plan
     Module 4 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 15,
    title: "Applying Your System — The Trading Plan",
    tag: "Module 4 · Session 2",
    module: "Crafting Your System",
    videoUrl: "https://www.youtube.com/embed/s1RBM13ETf0",

    intro: {
      heading: "The Trading Plan — Session-Level Execution of Your System",
      body: "Your trading system is the permanent framework. Your trading plan is how you execute that system for a specific session — today, this week, or this month. The plan defines the specific markets, levels, directional bias, and size for this session only. System = what you do. Plan = how you do it today.",
      bullets: [
        "Trading plan = session-level rules for executing your system; different from the system itself",
        "Seven components: Markets, Levels, Position Sizing and Compounding, Directional Bias, Expectations, Results, Execution Review",
        "Before every session: determine your directional bias — is it based on price at a HTF level or on emotion?",
        "If bias and setups align and unfold as planned = in sync with the market → higher performance session",
        "If out of sync with the market = reduce position size or sit on hands; do not force trades",
        "Post-session review is mandatory: what happened vs expectations? How did execution measure up?"
      ]
    },

    lesson: {
      heading: "The Seven Components of a Trading Plan",
      body: "A trading plan forces you to articulate your thinking before the session opens. If you cannot clearly state your bias and its specific reason, your directional bias is not a bias — it is a guess. The post-session review is equally important: it reveals the gap between what you planned and what actually happened.",
      bullets: [
        "<strong>1. Markets:</strong> which pairs are you watching this session? How many? Are they directly or inversely correlated?",
        "<strong>2. Levels:</strong> clearly defined price levels to watch — which levels are you looking to buy, which to sell?",
        "<strong>3. Position Sizing and Compounding:</strong> what size for today's trades? Where to add? How much to add?",
        "<strong>4. Directional Bias:</strong> bullish or bearish? WHY? Must cite a specific technical reason: price at HTF level, structure break, or macro catalyst",
        "<strong>5. Expectations:</strong> what do you expect to happen in today's session and why?",
        "<strong>6. Results:</strong> what actually happened vs expectations? Track this every session without exception",
        "<strong>7. Execution Review:</strong> did you cut a winner early? Move a stop? Rush an entry? How will you improve tomorrow?",
        "Post-session questions: Was your bias correct? Did you add to a losing position? Did you rush? What will you do differently?"
      ]
    },

    introChart: {
      title: "Directional Bias Aligned — Price at HTF Support, Bullish Plan",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(108, [
        { to: 87, bars: 8 },
        { to: 87, bars: 2 },
        { to: 111, bars: 6 }
      ], { seed: 179, wick: 0.4 }),
      markAreas: [
        { y0: 84, y1: 89, label: "HTF Support Level", color: "rgba(0,212,212,0.07)" }
      ],
      markLines: [ { yAxis: 111, label: "Expectation / Target — Plan Plays Out", color: "#ffcc00" },
        { yAxis: 87, label: "Plan Bias: Long at HTF Level", color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  7, label: "Price at HTF Support",   position: "bottom" },
        { dataIndex:  9, label: "Bias Confirmed — Enter", position: "bottom" },
        { dataIndex: 15, label: "Plan Executed",          position: "top"    }
      ]
    },

    lessonChart: {
      title: "Out of Sync — Bias Formed on Emotion, Not Price",
      markLines: [ { yAxis: 103, label: "Rejection — No HTF Level Here", color: "#ff2e88" }, { yAxis: 97, label: "Emotion Long Entry — No Cited Reason", color: "#ff2e88" } ],
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(90, [
        { to: 103, bars: 6 },
        { to: 83,  bars: 10 }
      ], { seed: 180, wick: 0.4 }),
      markPoints: [
        { dataIndex:  3, label: "Emotion Bias: Goes Long",   position: "top"    },
        { dataIndex:  5, label: "Price Rejects — No HTF",   position: "top"    },
        { dataIndex: 14, label: "Trend Continues Down",     position: "bottom" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "Before a trading session, a trader decides to go long BTC because it feels like it wants to go up. They open a position without checking HTF levels. According to Course 3, what is wrong with this approach?",
      hint: "A valid directional bias requires a specific articulable reason. Is feeling a valid technical reason for a bias?",
      style: "choice",
      answers: [
        { id: "a", text: "The bias was formed on emotion, not on price vs a HTF level; a valid directional bias requires a specific technical or fundamental reason: price at a key level, a structure break, or a macro catalyst", correct: true,  type: "neutral" },
        { id: "b", text: "Nothing is wrong — intuition built from experience is a valid form of discretionary bias; feel-based entries are a legitimate and proven approach",                                                        correct: false, type: "bullish" },
        { id: "c", text: "The trader should always go in the opposite direction of their initial gut feeling — emotions consistently point the wrong way in trading",                                                               correct: false, type: "bearish" }
      ],
      chart: {
        title: "Emotion Bias vs HTF Level Bias — Which Holds Up?",
        type: "candlestick",
        cutIndex: 6,
        labels: ltLabels(15),
        ohlc: ltCandles(90, [
          { to: 104, bars: 7 },
          { to: 76,  bars: 8 }
        ], { seed: 181, wick: 0.4 })
      },
      revealMarkPoints: [
        { dataIndex:  4, label: "Emotion Bias Long Here",     position: "top",    color: "#ff2e88" },
        { dataIndex:  6, label: "No HTF Level Support!",      position: "top",    color: "#ffcc00" },
        { dataIndex: 11, label: "Price Drops — Bias Wrong",   position: "bottom", color: "#ff2e88" }
      ],
      explanation: "A trading bias formed on feeling rather than technical analysis is not a bias — it is a guess. A valid directional bias must be articulable in one sentence citing a specific technical or fundamental reason: 'I am bullish because price is at the weekly DBS zone' or 'I am bearish because the daily market structure broke lower.' If you cannot clearly state a specific reason for your bias, it has no foundation and should not drive a trade decision.",
      rule: "Directional bias must have a specific articulable reason: price at HTF level, structure break, or macro catalyst. If you cannot explain it in one sentence, it is not a valid bias."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 16 — Recording Your System — The Trading Journal
     Module 4 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 16,
    title: "Recording Your System — The Trading Journal",
    tag: "Module 4 · Session 3",
    module: "Crafting Your System",
    videoUrl: "https://www.youtube.com/embed/2B4s94zhi-0",

    intro: {
      heading: "The Trading Journal — Your Most Powerful Improvement Tool",
      body: "Without a trading journal, you cannot identify patterns in your performance, eliminate recurring mistakes, or understand what ties your winning trades together. The journal is the foundation of every consistently profitable trading system. More detail recorded equals a better ability to find the patterns that matter.",
      bullets: [
        "Without a journal it is effectively impossible to be consistently profitable over the long term",
        "Journal records every trade; reveals what ties winners together; exposes the behaviors that drive losses",
        "Minimum fields: Entry, Stop Loss, Take Profit, chart screenshot, trade thesis, RR profile, actual R multiple",
        "Recommended extras: emotional state, hours of sleep, hunger level, exercise, meditation — all affect performance",
        "Recommended software: Edgewonk — used by the instructor for 4+ years; tracks custom stats and trade screenshots",
        "The power of journaling: find what ties winners → build a system around it; find what ties losers → eliminate those behaviors"
      ]
    },

    lesson: {
      heading: "Real Losing Trade — What the Journal Revealed",
      body: "A losing BTC futures trade from July 2019 revealed three distinct execution mistakes — all of which were only identified through detailed journal review. Without the journal, these mistakes would have repeated indefinitely. With it, the causes were clear: sleep deprivation, greed on the stop adjustment, and impatience on entry.",
      bullets: [
        "<strong>Real trade details:</strong> Entry $11,749 | Stop $10,790 | Target $15,375 | Swing Long | Loss: ~55 BTC (~2.5% of portfolio)",
        "<strong>Mistake 1:</strong> moved stop loss DOWN from $10,790 to $10,590 out of greed — a direct violation of the system rule never to move stops further from entry",
        "<strong>Mistake 2:</strong> watched price hit the stop passively instead of executing at market into a buy wall → actual exit at $10,340 (significant slippage below stop)",
        "<strong>Mistake 3:</strong> rushed more than 50% of entries at market instead of being patient near the invalidation zone",
        "<strong>Journal custom stats revealed:</strong> only 3 hours of sleep + very full stomach on the day of the trade = poor decision-making conditions",
        "The journal directly linked sleep deprivation and fullness to the greed and impatience that caused all three mistakes",
        "Edgewonk tracks custom lifestyle stats alongside trade data — the combination reveals correlations invisible any other way"
      ]
    },

    introChart: {
      title: "Trade Journal — Identifying Loss Pattern Across Multiple Trades",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(90, [
        { to: 84, bars: 3 },
        { to: 90, bars: 4 },
        { to: 84, bars: 1 },
        { to: 90, bars: 2 },
        { to: 84, bars: 1 },
        { to: 90, bars: 2 },
        { to: 84, bars: 1 },
        { to: 85, bars: 2 }
      ], { seed: 182, wick: 0.4 }),
      markPoints: [
        { dataIndex:  2, label: "Loss — 3h Sleep",     position: "bottom" },
        { dataIndex:  7, label: "Loss — 3h Sleep",     position: "bottom" },
        // idx10 (was 9): idx9 is the GREEN top of an up-leg; idx10 is the red bar
        // that lands back on 84 — the bar that can honestly be labelled a loss.
        { dataIndex: 10, label: "Loss — 4h Sleep",     position: "bottom" },
        { dataIndex: 13, label: "Loss — 3h Sleep",     position: "bottom" },
        { dataIndex: 15, label: "Pattern! Journal Reveals", position: "bottom" }
      ]
    },

    lessonChart: {
      // Rebuilt to the real trade's sequence + proportions (Entry $11,749 / Stop
      // $10,790 moved down to $10,590 / slipped exit $10,340 / Target $15,375):
      // drawn risk 9 (105→96) vs drawn reward 34 (105→139) = the trade's real 3.78R
      // (the old 116 target drew ~1.2R). Price touches the original stop at idx6
      // (where the greedy "moved down" pin now sits), crosses the moved stop, and
      // the tail is shortened so the exit bar (idx9) lands exactly ON the 92 exit
      // line instead of the old pin floating 14 pts under it. Seed 27 harness-
      // verified: nothing prints below 96 before idx6 or below 92 before idx9.
      title: "BTC Losing Trade — Stop Moved Down, Slippage on Exit",
      type: "candlestick",
      labels: ltLabels(13),
      ohlc: ltCandles(105, [
        { to: 113, bars: 3 },
        { to: 96,  bars: 4 },
        { to: 92,  bars: 3 },
        { to: 93,  bars: 3 }
      ], { seed: 27, wick: 0.4 }),
      markLines: [ { yAxis: 92, label: "Actual Exit — Slippage Below Stop", color: "#ff2e88" },
        { yAxis: 105, label: "Entry",              color: "#00d4d4" },
        { yAxis: 96,  label: "Original Stop",      color: "#ff2e88" },
        { yAxis: 94,  label: "Stop Moved Down!",   color: "#ffcc00" },
        { yAxis: 139, label: "Target $15,375 (never reached — 3.78R)",     color: "#00d4d4" }
      ],
      markPoints: [
        { dataIndex:  0, label: "Entry",                   position: "bottom" },
        { dataIndex:  6, label: "Stop Moved Down — WRONG", position: "bottom" },
        { dataIndex:  9, label: "Exit with Slippage",      position: "bottom" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "A trader's journal shows that 7 of their last 8 losing trades occurred on days when they slept less than 5 hours. They had no idea until they started tracking sleep. What does this reveal about journaling?",
      hint: "How would this pattern be discovered without tracking sleep alongside trade outcomes? What is the core value of recording non-trade variables in the journal?",
      style: "choice",
      answers: [
        { id: "a", text: "The journal revealed a direct link between personal habits (sleep deprivation) and trading performance — without journaling, this pattern would be invisible and the losses would continue indefinitely", correct: true,  type: "bullish" },
        { id: "b", text: "Correlation is not causation — the losing trades are likely due to poor market conditions on those days, not sleep; tracking personal habits in a journal is unnecessary",                               correct: false, type: "bearish" },
        { id: "c", text: "Sleep tracking is useful but optional — only entry, stop loss, and target are required for a journal to improve trading performance",                                                                  correct: false, type: "neutral" }
      ],
      chart: {
        title: "Journal Data Reveals — Losses Cluster Around Sleep Deprivation",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(100, [
          { to: 93, bars: 10 },
          { to: 112, bars: 5 }
        ], { seed: 184, wick: 0.4 })
      },
      revealMarkPoints: [
        { dataIndex:  5, label: "Loss — 3h sleep",       position: "bottom", color: "#ff2e88" },
        { dataIndex:  7, label: "Loss — 4h sleep",       position: "bottom", color: "#ff2e88" },
        { dataIndex:  9, label: "Loss — 3h sleep",       position: "bottom", color: "#ff2e88" },
        { dataIndex: 11, label: "Win — 8h sleep",        position: "top",    color: "#00d4d4" },
        { dataIndex: 14, label: "Win — 8h sleep",        position: "top",    color: "#00d4d4" }
      ],
      explanation: "This is exactly the kind of insight that a detailed journal produces. Without tracking sleep alongside trade outcomes, this pattern — 7 of 8 losses on under 5 hours of sleep — would be completely invisible. The trader would continue making the same mistakes in the same conditions, believing their losses were caused by market conditions or bad luck. The journal <strong>makes the invisible visible</strong>. Personal habit variables (sleep, hunger, exercise, meditation) directly affect decision quality and must be tracked.",
      rule: "Journal EVERY trade. Track personal habit variables (sleep, hunger, exercise, emotion) alongside trade data. The journal reveals the patterns that cause losses — without it, they repeat forever."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 17 — Developing a Trader's Mindset
     Module 5 · Session 1
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 17,
    title: "Developing a Trader's Mindset",
    tag: "Module 5 · Session 1",
    module: "Unlocking Your Potential",
    videoUrl: "https://www.youtube.com/embed/oAj3-5TFdBg",

    intro: {
      heading: "Finding and Building Your Edge",
      body: "An edge is a trader's ability to consistently generate returns by outsmarting the market. Edges are not found arbitrarily — they require vigorous journaling, frequent reflection, and constant iteration. They are also finite: they degrade over time and must be continuously refined to remain viable.",
      bullets: [
        "Edge = consistent ability to generate returns by outsmarting the market through experience and experimentation",
        "Discretionary Edge: observation-based (e.g., CME gap fills consistently close on BTC futures)",
        "Systemic Edge: parameters-based (e.g., modified Kelly Criterion + Pareto = optimal position sizing formula)",
        "Trading requires the same level of focus and performance as a professional athlete — solo sport, outcomes depend on you",
        "Three key performance areas: Routines and Habits, Work-Life Balance, Discipline",
        "Screen time is the number one way to improve — 10,000 hours to mastery, but only quality screen time counts"
      ]
    },

    lesson: {
      heading: "Three Performance Areas — Routines, Balance, and Discipline",
      body: "Trading performance is an extension of your daily routine. The quality of your decisions on any given day is directly correlated with how well you have managed your physical and mental state. The best traders in the world treat themselves like athletes: consistent routines, physical fitness, deliberate rest, and strict rules around trading hours.",
      bullets: [
        "<strong>Routines and Habits:</strong> the three core routines — screen time (quality hours on the charts), physical health (exercise, sleep, nutrition), and meditation; trading is an extension of your daily routine",
        "<strong>Physical health correlation:</strong> weightlifting, walking, and exercise correlate directly with trading discipline; both require consistency, delayed gratification, and structured effort",
        "<strong>Work-Life Balance:</strong> crypto is 24/7 — MUST set strict trading hours and honor them; establish outlets (fishing, surfing, photography, games) to de-stress between sessions",
        "<strong>Discipline:</strong> discipline in trading mirrors discipline in every other area of life; be accountable for your system, your plan, and your daily rules",
        "<strong>After 5 consecutive losses:</strong> stop trading immediately; walk away; de-stress; engage an outlet; return to the charts fresh the next session",
        "Emotional control does not arrive overnight — it comes with experience and deliberate practice",
        "Discretionary traders are more vulnerable to emotional bias → meditation becomes critical (covered in Module 5 Session 2)"
      ]
    },

    introChart: {
      // Re-legged decline → flat → rise so the phase labels sit over matching price
      // action (the old series rose monotonically under "Losing Phase"/"Break Even").
      // Seed 19 harness-verified: losing leg falls 70→62, break-even closes hold
      // 62.5±1.8, and neither early phase rallies above the 70 start.
      title: "Screen Time vs Performance — Edge Builds Over Time",
      type: "candlestick",
      noContext: true,   // conceptual journey chart — no "prior price"; M1..M18 must cover the full axis
      labels: ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12","M13","M14","M15","M16","M17","M18"],
      ohlc: ltCandles(70, [
        { to: 62, bars: 5 },
        { to: 63, bars: 5 },
        { to: 72, bars: 4 },
        { to: 90, bars: 4 }
      ], { seed: 19, wick: 0.35 }),
      markPoints: [
        { dataIndex:  0, label: "Early — Losing Phase",   position: "bottom" },
        { dataIndex:  6, label: "Break Even Phase",       position: "bottom" },
        { dataIndex: 11, label: "Small Profits",          position: "top"    },
        { dataIndex: 17, label: "Consistent Edge Built",  position: "top"    }
      ]
    },

    lessonChart: {
      // Equity now goes FLAT after "Loss 5 — Stop Trading!" (idx5–8 hold 87±1.5,
      // seed 5 harness-verified) — the old legs kept falling to 84 through the
      // "Rest and De-Stress" pin, as if the trader kept losing while resting.
      title: "Five Losses — Walk Away — Return Fresh",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 87, bars: 5 },
        { to: 87, bars: 4 },
        { to: 94, bars: 2 },
        { to: 108, bars: 5 }
      ], { seed: 5, wick: 0.4 }),
      markPoints: [
        { dataIndex:  0, label: "Loss 1",                   position: "bottom" },
        { dataIndex:  2, label: "Loss 3",                   position: "bottom" },
        { dataIndex:  4, label: "Loss 5 — Stop Trading!",   position: "bottom" },
        { dataIndex:  8, label: "Rest and De-Stress",       position: "bottom" },
        { dataIndex: 10, label: "Return Fresh — Win",       position: "top"    },
        { dataIndex: 15, label: "Back in Control",          position: "top"    }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "A trader has just suffered their 5th consecutive losing trade in a session. They feel frustrated and certain the next trade will recover the losses. According to Course 3, what is the correct action?",
      hint: "What does the course explicitly prescribe when a trader experiences 5 consecutive losses? What does frustration do to decision quality?",
      style: "choice",
      answers: [
        { id: "a", text: "Stop trading immediately — walk away, de-stress, engage an outlet activity; returning to the charts frustrated increases the risk of revenge trading and further losses",    correct: true,  type: "neutral" },
        { id: "b", text: "Increase position size on the next trade — the statistical probability of a 6th consecutive loss is very low; press the edge to recover",                                   correct: false, type: "bullish" },
        { id: "c", text: "Switch to a completely different asset class for the rest of the session — a fresh market will not carry the same negative energy",                                         correct: false, type: "bearish" }
      ],
      chart: {
        title: "5 Losses — What Is the Correct Action?",
        type: "candlestick",
        cutIndex: 5,
        labels: ltLabels(15),
        // Flat leg (87) after the 5th loss replaces the old further slide to 84 —
        // stepping away means the equity stops moving, it doesn't keep bleeding.
        // Seed 6 harness-verified: idx5–7 closes hold 87±1.5 above the reveal pins.
        ohlc: ltCandles(100, [
          { to: 87, bars: 5 },
          { to: 87, bars: 3 },
          { to: 95, bars: 3 },
          { to: 104, bars: 4 }
        ], { seed: 6, wick: 0.4 })
      },
      revealMarkPoints: [
        { dataIndex:  4, label: "5th Loss — STOP NOW!",     position: "bottom", color: "#ff2e88" },
        { dataIndex:  7, label: "Rest and De-Stress",       position: "bottom", color: "#ffcc00" },
        { dataIndex: 10, label: "Fresh Session — Win",      position: "top",    color: "#00d4d4" },
        { dataIndex: 14, label: "Performance Recovers",     position: "top",    color: "#00d4d4" }
      ],
      explanation: "After 5 consecutive losses, a frustrated trader is in the worst possible mental state to make objective, system-based decisions. Frustration leads to revenge trading — increasing size, widening stops, or chasing entries that do not meet system criteria. The course is explicit: <strong>5 losses = walk away</strong>. Engage an outlet, completely disconnect from the charts, and return the next session with a fresh perspective. Forcing more trades in a frustrated state consistently multiplies losses.",
      rule: "5 consecutive losses = walk away immediately. De-stress. Come back fresh the next session. Never trade frustrated. Never revenge trade."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 18 — The Art of Meditation
     Module 5 · Session 2
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 18,
    title: "The Art of Meditation",
    tag: "Module 5 · Session 2",
    module: "Unlocking Your Potential",
    videoUrl: "https://www.youtube.com/embed/ts3f-hXELPE",

    intro: {
      heading: "Meditation — Objectivity as a Tradeable Skill",
      body: "Meditation nurtures peace, calm, and clarity in the mind. For traders — especially discretionary traders — objectivity is a critical performance skill. Meditation prevents subjective bias from driving decisions against the trend, helps traders pull the trigger on planned entries, and supports the discipline to cut losers and manage winners without hesitation.",
      bullets: [
        "Meditation promotes objectivity — critical for discretionary traders who must read price action without bias",
        "Prevents emotional bias from overriding the plan — pulls the trigger on planned trades, manages winners correctly",
        "Basic practice: sit upright, close eyes, focus on breath from start to finish, gently return when mind wanders",
        "The act of noticing the mind has wandered and refocusing back to the breath IS the core exercise of meditation",
        "5-10 minutes daily — try it consistently for the next 30 days and see what impact it has on your trading",
        "Recommended app: Headspace (guided and semi-guided; used by the instructor for 5+ years)"
      ]
    },

    lesson: {
      heading: "The Basic Meditation Practice — Step by Step",
      body: "There is no right or wrong way to meditate — the only requirement is consistency. Try a 5-minute daily practice for the next 30 days and see what impact it has on your objectivity, emotional regulation, and decision quality. The benefits compound over months and years.",
      bullets: [
        "<strong>Step 1:</strong> sit upright — chair or floor; eyes open with a soft unfocused gaze or gently closed; back relatively straight",
        "<strong>Step 2:</strong> take several deep breaths in through the nose, out through the mouth — fill the lungs fully; release slowly",
        "<strong>Step 3:</strong> on the next out breath, close your eyes; let your breathing return to its natural, unforced rhythm",
        "<strong>Step 4:</strong> focus ONLY on the breath — follow each breath from start to finish; do not control it, just observe it",
        "<strong>Step 5:</strong> when the mind wanders (it will — this is normal and expected), gently bring attention back to the breath",
        "The moment of returning attention to the breath is the entire point — this is what builds objectivity over time",
        "Benefits compound: objectivity becomes a natural state; emotional spikes diminish; decision quality improves under pressure"
      ]
    },

    // Objectivity isn't a price you can plot — so instead of inventing fake OHLC
    // "candles" for an abstract skill, the intro shows the actual mechanism: the
    // focus → wander → notice → return loop that trains it. (Adaptive template.)
    introChart: {
      format: "concept",
      title: "The Meditation Loop — How Objectivity Is Trained",
      cycle: true,
      cycleLabel: "Each return to the breath is one rep — repeat for 5–10 minutes",
      steps: [
        { label: "Focus on the breath", icon: "wind",
          desc: "Sit upright, eyes closed. Follow each breath from start to finish — observe it, don't control it." },
        { label: "The mind wanders", icon: "shuffle",
          desc: "Thoughts drift to an open trade, a recent loss, the day ahead. This is normal and expected — not a failure." },
        { label: "Notice the wandering", icon: "eye",
          desc: "At some point you catch it: \"I've stopped watching the breath.\" That moment of noticing IS the skill." },
        { label: "Gently return", icon: "corner-down-left",
          desc: "Without judgement, bring attention back to the breath. This single move is the entire exercise." }
      ],
      checklist: [
        "Builds objectivity — read price action without emotional bias",
        "Strengthens trigger discipline — execute planned entries without hesitation",
        "Supports cutting losers and managing winners calmly",
        "5–10 minutes daily for 30 days — then see what impact it has"
      ],
      note: "There is no \"right\" way to meditate — consistency is the only requirement. A guided app like Headspace is an easy way to start."
    },

    lessonChart: {
      // Range Low band lowered to 83–88 so it CONTAINS the 84 lows it labels (the
      // old 86–91 band excluded them). The 1-bar 95→84 drop that printed a chaotic
      // 23-pt candle is now a 2-bar leg, wicks tightened to 0.3, and seed 223
      // harness-verified: every authored low ≥ 83 (in-band), high ≤ 98 (in-band),
      // and no candle spans more than 8 pts.
      title: "Calm and Objective — Range-Bound Market Read Clearly",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(84, [
        { to: 95, bars: 3 },
        { to: 84, bars: 4 },
        { to: 95, bars: 5 },
        { to: 84, bars: 2 },
        { to: 90, bars: 2 }
      ], { seed: 223, wick: 0.3 }),
      markAreas: [
        { y0: 83, y1: 88, label: "Range Low — Objective Read",  color: "rgba(0,212,212,0.07)" },
        { y0: 93, y1: 98, label: "Range High — Objective Read", color: "rgba(255,46,136,0.07)" }
      ],
      markPoints: [
        { dataIndex:  2, label: "Objective: Sell Range High", position: "top"    },
        { dataIndex:  6, label: "Objective: Buy Range Low",   position: "bottom" },
        { dataIndex: 11, label: "Objective: Sell Range High", position: "top"    },
        { dataIndex: 13, label: "Objective: Buy Range Low",   position: "bottom" }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "During a basic meditation session, a trader's mind starts wandering to thoughts about an open trade. According to Course 3's meditation framework, what is the correct response?",
      hint: "What is the core exercise of meditation? Is mind-wandering a failure or a normal and expected part of the practice?",
      style: "choice",
      answers: [
        { id: "a", text: "Gently bring attention back to the breath — the act of noticing the mind has wandered and refocusing is the core exercise of meditation; it is not a failure but the entire point of the practice", correct: true,  type: "neutral" },
        { id: "b", text: "Open your eyes, check the open trade, then resume meditation — there is no benefit to sitting if trading anxiety is present and unresolved",                                                        correct: false, type: "bullish" },
        { id: "c", text: "Stop the session — if the mind cannot stay focused for the full duration, meditation is not the right tool for that particular trader",                                                            correct: false, type: "bearish" }
      ],
      chart: {
        title: "Meditation — Focus, Wander, Refocus Is the Practice",
        type: "candlestick",
        cutIndex: 8,
        labels: ltLabels(14),
        ohlc: ltCandles(90, [
          { to: 93, bars: 2 },
          { to: 90, bars: 2 },
          { to: 93, bars: 2 },
          { to: 90, bars: 2 },
          { to: 90, bars: 1 },
          { to: 93, bars: 5 }
        ], { seed: 190, wick: 0.35 })
      },
      revealMarkPoints: [
        { dataIndex:  2, label: "Mind Wanders (Normal)",      position: "top",    color: "#ffcc00" },
        { dataIndex:  4, label: "Refocus to Breath",          position: "bottom", color: "#00d4d4" },
        { dataIndex:  6, label: "Wanders Again (Normal)",     position: "top",    color: "#ffcc00" },
        { dataIndex:  8, label: "Refocus = The Exercise",     position: "bottom", color: "#00d4d4" }
      ],
      explanation: "Mind-wandering during meditation is not a failure — it is expected and entirely normal. The <strong>core exercise of meditation</strong> is the moment of noticing that the mind has wandered and gently bringing attention back to the breath. This is the mental equivalent of a muscle rep: each refocus builds objectivity, focus, and emotional regulation. Stopping the session because the mind wandered misunderstands the practice entirely. Practice 5-10 minutes daily for 30 days and see what impact it has.",
      rule: "Mind wandering during meditation is normal. The refocus back to breath IS the exercise. 5-10 minutes daily for 30 days — see what impact it has."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 19 — The Reality Behind Trading Full-Time
     Module 5 · Session 3
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 19,
    title: "The Reality Behind Trading Full-Time",
    tag: "Module 5 · Session 3",
    module: "Unlocking Your Potential",
    videoUrl: "https://www.youtube.com/embed/JzJGzu2MJfE",

    intro: {
      heading: "What Full-Time Trading Actually Looks Like",
      body: "Full-time trading is a profession built on years of accumulated experience, journaling, iteration, and lifestyle discipline. The path is non-linear, often brutal, and requires a rare combination of analytical skill, systematic discipline, and psychological resilience. The insights in this chapter come directly from experienced full-time traders.",
      bullets: [
        "Path of a full-time trader: Big losses → Small losses → Break Even → Profitability (non-linear, takes years)",
        "Journaling is essential throughout every phase — without it you cannot see why you improved",
        "Lifestyle directly impacts trading performance: nutrition, exercise, sleep, and set trading hours all feed performance",
        "Set specific daily trading hours even in 24/7 crypto markets — and honor them unconditionally",
        "Filter out Twitter noise and other traders' opinions; do not let them change a plan built on sound analysis",
        "Strong analyst + poor execution = poor results — execution is a constant iteration process; never fully mastered"
      ]
    },

    lesson: {
      heading: "Key Insights from Experienced Full-Time Traders",
      body: "The most consistent theme across all experienced full-time traders is the centrality of execution discipline and mental management over analytical skill. Knowing the levels is necessary but not sufficient — the ability to execute the plan without hesitation, move-the-stop, or over-management is what separates consistently profitable traders from skilled analysts who lose money.",
      bullets: [
        "<strong>On evolution:</strong> the path runs through big losses to small losses to break-even to profitability; journaling throughout is the only way to understand why each phase ended",
        "<strong>On lifestyle:</strong> you do not put bad fuel in a Ferrari — quality nutrition, exercise, and sleep directly produce quality decision-making; treat your body as performance infrastructure",
        "<strong>On social media noise:</strong> filter Twitter; other traders' opinions are not relevant to your HTF analysis; let price and your system guide decisions, not other participants",
        "<strong>On execution failure:</strong> common failure = knowing the levels perfectly but freezing on the entry, moving the stop to avoid a loss, or micromanaging a trade that was set up correctly",
        "<strong>On arrogance:</strong> hot streaks are real but the market always checks arrogance; never change system parameters or increase risk during winning streaks",
        "<strong>On set and forget:</strong> know your invalidation, your risk, your target — then walk away; micromanagement is the enemy of profitable trend trades",
        "<strong>Daily routine template:</strong> morning — nutrition + exercise (or walk) + meditation + fresh chart look; midday — walk, reassess; afternoon — monitor and execute; evening — journal and shut down at set time"
      ]
    },

    introChart: {
      // Re-legged into the four phases the pins name — steep decline (big losses),
      // shallow decline (small losses), flat (break-even), rise (profitable) — the
      // old legs slipped every label one leg late (e.g. "Small Losses" sat at the
      // bottom of the big-loss leg, "Break Even" on a rising leg). Seed 31 harness-
      // verified: break-even closes hold 76.5±1.8; no early-phase rally above 100.
      title: "Trader Evolution — From Big Losses to Consistent Profitability",
      type: "candlestick",
      noContext: true,   // conceptual journey chart — no "prior price"; M1..M18 must cover the full axis
      labels: ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12","M13","M14","M15","M16","M17","M18"],
      ohlc: ltCandles(100, [
        { to: 80, bars: 4 },
        { to: 76, bars: 4 },
        { to: 77, bars: 5 },
        { to: 96, bars: 5 }
      ], { seed: 31, wick: 0.4 }),
      markPoints: [
        { dataIndex:  1, label: "Big Losses Phase",   position: "bottom" },
        { dataIndex:  5, label: "Small Losses Phase", position: "bottom" },
        { dataIndex: 10, label: "Break Even Phase",   position: "bottom" },
        { dataIndex: 14, label: "Profitable Phase",   position: "top"    },
        { dataIndex: 17, label: "Consistent Edge",    position: "top"    }
      ]
    },

    lessonChart: {
      title: "Execution Failure — Level Identified, Entry Frozen, Chase Too Late",
      markLines: [ { yAxis: 83, label: "Stop / Invalidation — Below DBS", color: "#ff2e88" }, { yAxis: 116, label: "Target — Where the Move Ran", color: "#ffcc00" } ],
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(102, [
        { to: 87, bars: 7 },
        { to: 87, bars: 1 },
        { to: 99, bars: 4 },
        { to: 116, bars: 4 }
      ], { seed: 192, wick: 0.4 }),
      markAreas: [
        { y0: 84, y1: 89, label: "DBS Zone — Entry Should Be Here", color: "rgba(0,212,212,0.07)" }
      ],
      markPoints: [
        { dataIndex:  6, label: "Freeze — Missed Entry!",  position: "bottom" },
        { dataIndex:  7, label: "Frozen Again",            position: "bottom" },
        { dataIndex: 11, label: "Chase Entry — Too Late",  position: "top"    },
        // idx12 (was 15): idx15 IS the target bar — pinning "worse fill" on the bar
        // that tags the target read as if the chase filled at the target itself.
        { dataIndex: 12, label: "Worse Fill — Bigger Risk",position: "top"    }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "A trader has excellent market analysis — they correctly identify key levels and price targets with high accuracy. However, their account continues to lose money. According to Course 3, what is the most likely cause?",
      hint: "The course specifically distinguishes being a good analyst from being a profitable trader. What is the gap between the two?",
      style: "choice",
      answers: [
        { id: "a", text: "Poor execution — knowing the levels but freezing on the entry, moving the stop to avoid a loss, or micromanaging the trade; being a strong analyst does not automatically produce a profitable trader", correct: true,  type: "bearish" },
        { id: "b", text: "Position sizing is too small — correct analysis combined with small position size creates opportunity cost but should still be profitable over time",                                                    correct: false, type: "bullish" },
        { id: "c", text: "The analysis is not as accurate as the trader believes — profitability and analytical accuracy are directly linked; losing money always indicates poor analysis",                                        correct: false, type: "neutral" }
      ],
      chart: {
        title: "Good Analysis, Poor Execution — The Profitable Trader Gap",
        type: "candlestick",
        cutIndex: 8,
        labels: ltLabels(15),
        ohlc: ltCandles(100, [
          { to: 89, bars: 9 },
          { to: 115, bars: 6 }
        ], { seed: 193, wick: 0.4 }),
        markAreas: [
          { y0: 85, y1: 90, label: "DBS Zone — Correct Level Identified", color: "rgba(0,212,212,0.07)" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  5, label: "Level Correct — Froze!",   position: "bottom", color: "#ffcc00" },
        // idx9 (was 8): idx8 closes at 89.00, still INSIDE the 85–90 zone; idx9 is
        // the breakout bar that closes at 98.19, clear of the zone (harness-checked).
        { dataIndex:  9, label: "Entry Missed — Zone Left", position: "bottom", color: "#ff2e88" },
        { dataIndex: 12, label: "Target ~115 Hit — But Missed",  position: "top",    color: "#ffcc00" }
      ],
      explanation: "The course explicitly states: <strong>strong analyst + poor execution = poor results</strong>. Execution is a constant process of iteration that is never fully mastered. Common execution failures include: freezing on the entry at the right level, moving the stop further away to avoid a loss, micromanaging a trade that was set up correctly, and chasing an entry after missing the zone. Analytical skill and execution discipline are separate skills — both are required for consistent profitability.",
      rule: "Strong analysis alone is not enough. Execution — entering at the right price, holding the stop, and walking away from the screen — is a separate skill that must be developed deliberately."
    }
  },

  /* ═══════════════════════════════════════════════════════════════════════
     CHAPTER 20 — Course 3 Recap
     Outro
     ═══════════════════════════════════════════════════════════════════════ */
  {
    id: 20,
    title: "Course 3 Recap",
    tag: "Outro",
    module: "Course Summary",

    intro: {
      heading: "Five Modules, One Complete Framework — Recap",
      body: "Course 3 has taken you from exchange mechanics through leverage, access points, system building, and mindset. Every module contributes a distinct and non-substitutable layer. The tools without the mindset fail in execution. The mindset without the system fails in consistency. The system without the tools has nothing to execute. All five are required.",
      bullets: [
        "Module 1 — Derivatives: order types, order book, deposit/withdraw, open interest, funding rate, contracts",
        "Module 2 — Leverage: cross vs. isolated margin, liquidation, correct vs. wrong use, margin management over time",
        "Module 3 — Applying the Basics: DBS/SSR zones, access points, depletion factor, S/R flips, range trading rules",
        "Module 4 — Crafting Your System: 7-component system, 7-component trading plan, trading journal, Edgewonk",
        "Module 5 — Unlocking Your Potential: routines, screen time, physical health, 5-losses rule, meditation, full-time realities",
        "17 actionable rules govern every aspect of trading covered in Course 3 — from stop loss setup to daily routine"
      ]
    },

    lesson: {
      heading: "17 Actionable Rules — Your Course 3 Checklist",
      body: "Every rule in this list was earned through the content of Course 3. Before every trade, run through the applicable rules. The framework is only as strong as its consistent application. A systematic trader who applies these rules consistently will outperform an intuitive trader over the long run — every single time.",
      bullets: [
        "1. Always use stop losses — without them you are gambling. Period.",
        "2. Enable Close on Trigger on every stop loss order. Verify in Stops tab before the trade opens.",
        "3. Use Limit Orders for planned entries — lowest fee, price guaranteed, adds liquidity.",
        "4. Leverage = only used to reduce margin posted and mitigate counterparty risk; never to increase position size.",
        "5. Liquidation Price MUST be below (long) or above (short) your Stop Loss. If it is not, reduce leverage.",
        "6. Factor funding costs before holding any leveraged position for multiple days. Calculate: periods × rate.",
        "7. Trade DBS zones on fresh first tests — highest probability entry; depletion factor is at maximum.",
        "8. Do NOT trade in the mid-range chop zone. Midpoint = progress gauge only.",
        "9. Apply the Rule of Fives — do NOT trade the 5th touch of Range High or Range Low.",
        "10. Always add a buffer to stops above swing highs and below swing lows — fake-out wicks are normal.",
        "11. Journal EVERY trade with entry, stop, target, R profile, actual R, chart screenshot, and habit variables.",
        "12. Build and trust your trading system; do not abandon it during normal drawdowns.",
        "13. Directional bias must have a specific articulable technical or fundamental reason before each session.",
        "14. Create a session trading plan before opening the charts; review execution after every session.",
        "15. Establish a daily routine: sleep, nutrition, exercise, meditation, screen time — all feed your edge.",
        "16. Set strict daily trading hours in 24/7 crypto markets — honor them unconditionally.",
        "17. After 5 consecutive losses: walk away, de-stress, and come back fresh the next session."
      ]
    },

    roadmap: {
      title: "What You Mastered in Course 3",
      sub: "From exchange mechanics to a complete system",
      icon: "flag",
      stops: [
        { label: "Derivatives & the order book", desc: "The instruments professionals actually trade" },
        { label: "Leverage, used correctly", desc: "A risk tool — never a way to bet bigger" },
        { label: "DBS/SSR zones & ranges", desc: "Turning theory into executable access points" },
        { label: "Your system & plan", desc: "Predefined rules that remove gut-feel decisions" },
        { label: "The trader's mindset", desc: "Screen time, discipline, and sustainability" }
      ]
    },

    lessonChart: {
      // Reseeded 194 → 28 with wick 0.3: the old seed printed a chaotic 24-pt freak
      // candle mid-rally (bar 9). Seed 28 harness-verified: every authored candle
      // range ≤ 10, the stop (82) is never touched, and the idx6–7 zone tags stay
      // inside the 84–89 DBS band.
      title: "All Five Modules in One Trade — From Perpetual Swap to Journal",
      type: "candlestick",
      labels: ltLabels(16),
      ohlc: ltCandles(100, [
        { to: 87, bars: 7 },
        { to: 87, bars: 1 },
        { to: 117, bars: 7 },
        { to: 122, bars: 1 }
      ], { seed: 28, wick: 0.3 }),
      markAreas: [
        { y0: 84, y1: 89, label: "M3: DBS Zone (Access Point)", color: "rgba(0,212,212,0.07)" }
      ],
      markLines: [
        { yAxis: 87,  label: "M1+M2: Perp Swap Entry (Isolated 10x)", color: "#00d4d4" },
        { yAxis: 82,  label: "M2: Stop (Liq below at 79)",            color: "#ff2e88" },
        { yAxis: 117, label: "M4: System Target",                      color: "#ffcc00" }
      ],
      markPoints: [
        { dataIndex:  6, label: "M3: DBS Trigger",    position: "bottom" },
        { dataIndex:  7, label: "M4: System Entry",   position: "bottom" },
        { dataIndex: 14, label: "M5: Held the Plan!", position: "top"    },
        { dataIndex: 15, label: "M4: Journal + Win",  position: "top"    }
      ]
    },

    quiz: {
      hideChart: true,   // conceptual quiz — no chart
      question: "A trader uses a 10x leveraged isolated margin long on a perpetual swap. They enter at a fresh first-test DBS zone using an LTE trigger. They have a stop loss below the zone with liquidation price below the stop. They journal every trade and meditate each morning. Which Course 3 modules does this single trade incorporate?",
      hint: "Map each element of the trade to the module that taught it: the instrument, the margin type, the entry zone, the journaling habit, and the morning meditation practice.",
      style: "choice",
      answers: [
        { id: "a", text: "All five modules — M1 (perpetual swap instrument), M2 (isolated margin + leverage + liq below stop), M3 (DBS zone + LTE access point), M4 (journaling the trade), M5 (daily meditation routine)", correct: true,  type: "bullish" },
        { id: "b", text: "Only Modules 1 and 2 — DBS zones, journaling, and meditation are background habits and not components of the trade itself",                                                                             correct: false, type: "bearish" },
        { id: "c", text: "Modules 1, 2, and 3 only — the trading system and mindset modules are meta-level frameworks not applicable to any individual trade decision",                                                          correct: false, type: "neutral" }
      ],
      chart: {
        title: "One Trade — Five Modules. Which Modules Apply?",
        type: "candlestick",
        cutIndex: 9,
        labels: ltLabels(15),
        ohlc: ltCandles(100, [
          { to: 89, bars: 8 },
          { to: 89, bars: 1 },
          { to: 115, bars: 6 }
        ], { seed: 195, wick: 0.4 }),
        markAreas: [
          { y0: 85, y1: 90, label: "DBS Zone — M3", color: "rgba(0,212,212,0.07)" }
        ],
        markLines: [
          { yAxis: 89, label: "M1+M2: Entry on Perp Swap", color: "#00d4d4" },
          { yAxis: 84, label: "M2: Stop (Liq at 81)",      color: "#ff2e88" }
        ]
      },
      revealMarkPoints: [
        { dataIndex:  7, label: "M3: DBS — 1st Test",       position: "bottom", color: "#00d4d4" },
        { dataIndex:  8, label: "M1+M2: Perp Swap Entry",   position: "bottom", color: "#00d4d4" },
        { dataIndex: 12, label: "M4: System Target",        position: "top",    color: "#ffcc00" },
        { dataIndex: 14, label: "M4: Journal. M5: Meditate",position: "top",    color: "#00d4d4" }
      ],
      explanation: "This single trade incorporates all five Course 3 modules: <strong>Module 1</strong> — the perpetual swap is the instrument; <strong>Module 2</strong> — isolated margin with 10x leverage and liquidation price correctly below the stop; <strong>Module 3</strong> — the DBS zone on first test is the access point and LTE trigger; <strong>Module 4</strong> — journaling the trade is the post-session action; <strong>Module 5</strong> — the daily morning meditation supports the objectivity needed to execute the plan without hesitation. The full framework working together.",
      rule: "All five Course 3 modules apply to every trade. The instrument, the leverage structure, the entry zone, the system journal, and the mindset practice — all five work together or none work at their best."
    }
  }

];

const COURSE3_META = {
  id: "course3",
  title: "Course 3: Sharpening Your Edge",
  chapterCount: 21
};
