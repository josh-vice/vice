'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Glossary & Search
   lt-glossary.js  |  Term definitions + cross-course reference index + search UI

   Public API (used by the engine / header):
     LT_GLOSSARY               — the term data
     renderGlossary(id, focus) — render the full glossary page into #id
     ltGlossarySearch(query)   — return matching entries (for the header dropdown)
   Relies on engine globals:
     showGlossary, ltOpenChapter, ltGetCourseProgress, ltIsUnlockAll, ltSetUnlockAll, showToast
   ═══════════════════════════════════════════════════════════════════════════ */

const LT_GLOSSARY = [
  /* ── Price action & candlesticks ── */
  { id:'price-action', term:'Price Action', cat:'Foundations', aliases:['price action','pa'],
    def:'Reading raw price movement — candles, highs/lows and structure — to judge who is in control, without relying on lagging indicators. The basis of every other concept in the courses.' },
  { id:'candlestick', term:'Candlestick', cat:'Foundations', aliases:['candlestick','candle','candles','ohlc'],
    def:'A bar showing the Open, High, Low and Close of a period. The body shows who finished in control; the wicks show how hard the other side fought.' },
  { id:'doji', term:'Doji', cat:'Candlesticks', aliases:['doji'],
    def:'A candle whose open and close are nearly equal — a near-zero body with wicks on both sides. Signals indecision; at the end of a trend it warns of a possible reversal.' },
  { id:'spinning-top', term:'Spinning Top', cat:'Candlesticks', aliases:['spinning top'],
    def:'A small real body with roughly equal wicks on both sides. Unlike a doji (which has almost no body at all), a spinning top has a small but visible body — both signal indecision and a possible pause or reversal after a strong move.' },
  { id:'hammer', term:'Hammer', cat:'Candlesticks', aliases:['hammer'],
    def:'A small body with a long lower wick at the bottom of a downtrend. Sellers pushed price down but buyers rejected it — a bullish reversal signal.' },
  { id:'shooting-star', term:'Shooting Star', cat:'Candlesticks', aliases:['shooting star'],
    def:'A small body with a long upper wick at the top of an uptrend. Buyers pushed up but sellers slammed it back — a bearish reversal signal.' },
  { id:'inverted-hammer', term:'Inverted Hammer', cat:'Candlesticks', aliases:['inverted hammer'],
    def:'A small body with a long upper wick at the BOTTOM of a downtrend — the same shape as a shooting star, but the opposite context. Buyers probed higher and were pushed back, yet its appearance after a sell-off hints downside is fading. Context-dependent: confirm with the next candle.' },
  { id:'marubozu', term:'Marubozu', cat:'Candlesticks', aliases:['marubozu'],
    def:'A candle with almost no wicks — one side dominated the entire period. Maximum conviction in the direction of the body.' },
  { id:'dragonfly-doji', term:'Dragonfly Doji', cat:'Candlesticks', aliases:['dragonfly doji','dragonfly'],
    def:'A doji with the open, high and close all near the top and a long lower wick — almost no body. Sellers drove price down but buyers reclaimed all of it: a bullish reversal signal at the bottom of a move.' },
  { id:'gravestone-doji', term:'Gravestone Doji', cat:'Candlesticks', aliases:['gravestone doji','gravestone'],
    def:'A doji with the open, low and close all near the bottom and a long upper wick — almost no body. Buyers pushed price up but sellers rejected all of it: a bearish reversal signal at the top of a move.' },

  /* ── Structure ── */
  { id:'support-resistance', term:'Support & Resistance', cat:'Structure', aliases:['support','resistance','s/r','sr flip','support and resistance'],
    def:'Price levels where buyers (support) or sellers (resistance) have historically stepped in. Once broken, they often flip roles — old resistance becomes new support.' },
  { id:'supply-demand', term:'Supply & Demand Zones', cat:'Structure', aliases:['supply zone','demand zone','supply','demand','dbs','ssr'],
    def:'Areas where a large imbalance of orders caused a sharp move. Fresh demand zones tend to bounce price; fresh supply zones tend to reject it.' },
  { id:'trend', term:'Trend', cat:'Structure', aliases:['trend','uptrend','downtrend','higher high','higher low','lower high','lower low'],
    def:'A directional sequence of price: higher highs and higher lows (uptrend) or lower highs and lower lows (downtrend). "The trend is your friend until it bends."' },
  { id:'range', term:'Range / Consolidation', cat:'Structure', aliases:['range','range-bound','consolidation','sideways'],
    def:'Price oscillating between a floor and a ceiling with no clear direction. Strategy flips to buying the lows and selling the highs until a breakout.' },
  { id:'breakout', term:'Breakout', cat:'Structure', aliases:['breakout','break out','break above','break below'],
    def:'Price decisively leaving a range or key level. The highest-probability entry is often the retest of the broken level rather than the initial break.' },
  { id:'market-structure', term:'Market Structure', cat:'Structure', aliases:['market structure'],
    def:'The framework of swing highs and lows that defines whether a market is trending or ranging — the map you read before choosing a bias.' },
  { id:'bos', term:'Break of Structure (BOS)', cat:'Structure', aliases:['break of structure','bos'], refs:[[1,5],[1,6]],
    def:'Price breaking a prior swing point in the direction of the trend, confirming continuation. A broken swing low in an uptrend is the first sign of a possible reversal.' },

  /* ── Liquidity ── */
  { id:'liquidity', term:'Liquidity', cat:'Liquidity', aliases:['liquidity','liquid'],
    def:'Resting orders — mostly stop-losses and pending orders — clustered above highs and below lows. Large players push price toward liquidity to fill their size.' },
  { id:'liquidity-sweep', term:'Liquidity Sweep / SFP', cat:'Liquidity', aliases:['liquidity sweep','swing failure','sfp','stop hunt','stop run','sweep'],
    def:'Price briefly spikes past a prior swing to trigger stops, then sharply reverses. The trapped traders become fuel for the move the other way.' },
  { id:'fvg', term:'Fair Value Gap (FVG)', cat:'Liquidity', aliases:['fair value gap','fvg','imbalance'],
    def:'A three-candle gap where price moved so fast it left an untraded "imbalance." Price frequently returns to fill the gap before resuming.' },

  /* ── Indicators ── */
  { id:'ichimoku', term:'Ichimoku Kinko Hyo', cat:'Indicators', aliases:['ichimoku','kumo','kijun','tenkan','senkou','chikou','cloud','kijun-sen'],
    def:'A complete Japanese system ("one-glance equilibrium chart"). The Kumo (cloud) shows support/resistance and trend; the Kijun and Tenkan act as dynamic mean lines for entries.' },
  { id:'fibonacci', term:'Fibonacci Retracement', cat:'Indicators', aliases:['fibonacci','fib','retracement','golden pocket'],
    def:'Ratios (0.382, 0.5, 0.618, 0.786) projected on a move to find likely pullback levels. The 0.618–0.65 "golden pocket" is the most-watched entry zone.' },
  { id:'rsi', term:'RSI', cat:'Indicators', aliases:['rsi','relative strength index'],
    def:'The Relative Strength Index — a 0-100 momentum oscillator. Above 70 is "overbought," below 30 "oversold," but divergence against price is its strongest signal.' },
  { id:'oscillator', term:'Oscillators', cat:'Indicators', aliases:['oscillator','stochastic','macd'],
    def:'Bounded momentum tools (RSI, Stochastic, MACD) that measure the speed of price. Best used for divergence and confluence, not as standalone buy/sell signals.' },
  { id:'moving-average', term:'Moving Average', cat:'Indicators', aliases:['moving average','ema','sma'],
    def:'A smoothed average of price over N periods. Acts as dynamic support/resistance and defines trend direction; the EMA reacts faster than the SMA.' },
  { id:'volume', term:'Volume', cat:'Indicators', aliases:['volume','volume profile','vpvr'],
    def:'How much was traded in a period. Rising volume confirms a move; a breakout on weak volume is suspect. Volume Profile shows which prices traded the most.' },

  /* ── Derivatives & risk ── */
  { id:'funding-rate', term:'Funding Rate', cat:'Derivatives', aliases:['funding rate','funding'],
    def:'Periodic payments between long and short perpetual-futures traders that tether the contract to spot. Extreme funding flags an over-crowded side ripe for a squeeze.' },
  { id:'open-interest', term:'Open Interest', cat:'Derivatives', aliases:['open interest'],
    def:'The total number of open futures contracts. Rising OI with rising price means new money is entering; falling OI means positions are closing.' },
  { id:'leverage', term:'Leverage & Liquidation', cat:'Derivatives', aliases:['leverage','margin','liquidation'],
    def:'Borrowed exposure that multiplies both gains and losses. The liquidation price is where your margin is exhausted and the position is force-closed.' },
  { id:'long-short', term:'Long / Short', cat:'Derivatives', aliases:['going long','going short','long position','short position'],
    def:'Going long profits when price rises; going short profits when price falls. Both are equally valid — direction is chosen from structure and bias.' },
  { id:'order-flow', term:'Order Flow & Delta', cat:'Derivatives', aliases:['order flow','cumulative delta','delta'],
    def:'The real-time balance of aggressive buying vs selling. Cumulative Delta rising while price stalls can reveal hidden absorption before a move.' },

  /* ── Patterns ── */
  { id:'bull-flag', term:'Bull Flag', cat:'Patterns', aliases:['bull flag'],
    def:'A tight downward-drifting pullback after a strong rally. A break of the flag high projects a measured move equal to the flagpole height.' },
  { id:'bear-flag', term:'Bear Flag', cat:'Patterns', aliases:['bear flag'],
    def:'A shallow bounce after a sharp drop. A break of the flag low signals continuation lower, with the stop placed above the flag high.' },
  { id:'double-top', term:'Double Top', cat:'Patterns', aliases:['double top'], refs:[[2,8],[2,9]],
    def:'Two roughly equal highs at the same resistance. A break of the neckline between them confirms a bearish reversal.' },
  { id:'double-bottom', term:'Double Bottom', cat:'Patterns', aliases:['double bottom'], refs:[[2,8],[2,9]],
    def:'Two roughly equal lows at the same support. A break of the neckline confirms a bullish reversal, target measured from low to neckline.' },
  { id:'trendline', term:'Trendline', cat:'Patterns', aliases:['trendline','trend line'],
    def:'A line connecting successive swing points that frames a trend or channel. Breaks and retests of a trendline are common decision points.' },
  { id:'wyckoff', term:'Wyckoff (Accumulation/Distribution)', cat:'Patterns', aliases:['wyckoff','accumulation','distribution'],
    def:'A model of how large operators build (accumulation) or unload (distribution) positions inside a range before the markup or markdown phase.' },

  /* ── Trading discipline ── */
  { id:'stop-loss', term:'Stop Loss', cat:'Risk', aliases:['stop loss','stop-loss'],
    def:'A predefined exit that caps a losing trade. Placed where your thesis is invalidated — beyond a structure point — not at an arbitrary dollar amount.' },
  { id:'take-profit', term:'Take Profit', cat:'Risk', aliases:['take profit','take-profit'],
    def:'A predefined exit that books a winning trade, usually at the next significant structure (opposite zone, range boundary or measured target).' },
  { id:'risk-management', term:'Risk Management', cat:'Risk', aliases:['risk management','position sizing','position size'],
    def:'Sizing each trade so a single loss is survivable — typically risking a small fixed % of equity per trade and never moving a stop against yourself.' },
  { id:'risk-reward', term:'Risk / Reward', cat:'Risk', aliases:['risk/reward','risk reward','reward to risk','r:r'],
    def:'The ratio of potential profit to potential loss. A 1:3 setup can be wrong more than half the time and still be profitable over many trades.' },
  { id:'confluence', term:'Confluence', cat:'Risk', aliases:['confluence'],
    def:'When several independent signals (structure, a zone, a fib level, an indicator) point to the same price. More confluence = higher-probability setups.' },
  { id:'backtesting', term:'Backtesting', cat:'Risk', aliases:['backtest','backtesting'],
    def:'Testing a strategy against historical data to estimate its edge before risking capital. The Practice Simulator is a hands-on form of backtesting.' },
  { id:'sentiment', term:'Sentiment', cat:'Risk', aliases:['sentiment'],
    def:'The crowd\'s prevailing mood (fear vs greed). Extreme one-sided sentiment often precedes reversals as the last buyers/sellers get exhausted.' },

  /* ── Basics / direction ── */
  { id:'bullish', term:'Bullish', cat:'Basics', aliases:['bullish','bull','bull market'], refs:[[1,0],[1,3],[1,5]],
    def:'Expecting price to rise. A bullish bias favors buying (going long). A "bull market" is a sustained uptrend driven by demand outweighing supply.' },
  { id:'bearish', term:'Bearish', cat:'Basics', aliases:['bearish','bear','bear market'], refs:[[1,0],[1,3],[1,5]],
    def:'Expecting price to fall. A bearish bias favors selling (going short). A "bear market" is a sustained downtrend driven by supply outweighing demand.' },
  { id:'long', term:'Long', cat:'Basics', aliases:['long','going long','long position','buy'],
    def:'A position that profits when price goes up — you buy expecting to sell higher. Loss is capped (price can\'t go below zero); upside is open-ended.' },
  { id:'short', term:'Short', cat:'Basics', aliases:['short','going short','short position','sell'],
    def:'A position that profits when price goes down — you sell borrowed units to buy them back cheaper. Used to trade falling markets.' },
  { id:'timeframe', term:'Timeframe', cat:'Basics', aliases:['timeframe','time frame'],
    def:'The duration each candle represents (1m, 1h, 1D…). Higher timeframes show the dominant trend; lower ones show precise entries.' },
  { id:'htf', term:'Higher Timeframe (HTF)', cat:'Basics', aliases:['higher timeframe','high timeframe','htf'],
    def:'A larger candle interval (e.g. 1D, 4H) used to set the overall bias and key levels. HTF structure outranks lower-timeframe noise.' },
  { id:'ltf', term:'Lower Timeframe (LTF)', cat:'Basics', aliases:['lower timeframe','low timeframe','ltf'],
    def:'A smaller candle interval (e.g. 5m, 15m) used to fine-tune entries and stops once the HTF bias is set.' },
  { id:'spot-perp', term:'Spot vs Perpetual', cat:'Basics', aliases:['spot','perpetual','perps','futures contract'],
    def:'Spot is buying the actual asset; perpetual futures are leveraged contracts with no expiry that track spot via the funding rate.' },

  /* ── Candle anatomy ── */
  { id:'wick', term:'Wick (Shadow)', cat:'Candlesticks', aliases:['wick','wicks','shadow','upper wick','lower wick'],
    def:'The thin lines above/below a candle body marking the high and low. Long wicks show rejection — price was pushed there and slammed back.' },
  { id:'body', term:'Candle Body', cat:'Candlesticks', aliases:['candle body','real body'], refs:[[1,0]],
    def:'The thick part of a candle between open and close. A large body shows conviction; a small body shows indecision.' },
  { id:'engulfing', term:'Engulfing Candle', cat:'Candlesticks', aliases:['engulfing','bullish engulfing','bearish engulfing'],
    def:'A candle whose body fully covers the prior candle\'s body. A bullish engulfing at support (or bearish at resistance) signals a momentum shift.' },

  /* ── Structure detail ── */
  { id:'swing', term:'Swing High / Swing Low', cat:'Structure', aliases:['swing high','swing low','swing point'],
    def:'A local peak (swing high) or trough (swing low) surrounded by lower/higher candles. Connecting them defines trend and structure.' },
  { id:'pullback', term:'Pullback', cat:'Structure', aliases:['pullback','pull back'],
    def:'A temporary counter-move against the trend before it resumes. Buying pullbacks in an uptrend offers better risk than chasing.' },
  { id:'retest', term:'Retest', cat:'Structure', aliases:['retest','re-test'],
    def:'Price returning to a broken level (support, resistance or trendline) to confirm it before continuing. A held retest is a high-probability entry.' },
  { id:'channel', term:'Channel', cat:'Structure', aliases:['channel','ascending channel','descending channel'],
    def:'Price moving between two parallel trendlines. Trade the bounces inside it, or the break-and-retest when it ends.' },
  { id:'premium-discount', term:'Premium & Discount', cat:'Structure', aliases:['premium','discount','equilibrium'],
    def:'Relative to a range\'s midpoint (equilibrium), the upper half is "premium" (favor selling) and the lower half is "discount" (favor buying).' },

  /* ── Liquidity detail ── */
  { id:'mitigation', term:'Mitigation', cat:'Liquidity', aliases:['mitigation','mitigate','mitigation block'],
    def:'When price returns to an order block or imbalance so big players can "mitigate" (fill the rest of) their position before the move continues.' },

  /* ── Indicators detail ── */
  { id:'divergence', term:'Divergence', cat:'Indicators', aliases:['divergence','bullish divergence','bearish divergence'],
    def:'When price makes a new high/low but an oscillator (RSI, MACD) does not — a warning that momentum is fading and a reversal may follow.' },
  { id:'overbought-oversold', term:'Overbought / Oversold', cat:'Indicators', aliases:['overbought','oversold'],
    def:'Oscillator extremes (e.g. RSI > 70 / < 30) suggesting a move is overextended. A signal to tighten risk, not an automatic reversal.' },
  { id:'volatility', term:'Volatility (ATR)', cat:'Indicators', aliases:['volatility','atr','average true range'],
    def:'How much price moves over time. ATR measures it and is used to size stops — wider stops in volatile conditions, tighter in calm ones.' },

  /* ── More patterns ── */
  { id:'triangle', term:'Triangle', cat:'Patterns', aliases:['triangle','ascending triangle','descending triangle','symmetrical triangle'],
    def:'A consolidation of converging trendlines. Ascending tilts bullish, descending bearish; the breakout direction sets the bias.' },
  { id:'head-shoulders', term:'Head & Shoulders', cat:'Patterns', aliases:['head and shoulders','head & shoulders','inverse head and shoulders'],
    def:'A three-peak reversal (a higher middle "head" between two "shoulders"). A break of the neckline confirms the reversal and projects a target.' },

  /* ── Derivatives detail ── */
  { id:'squeeze', term:'Short / Long Squeeze', cat:'Derivatives', aliases:['short squeeze','long squeeze','squeeze'],
    def:'A cascade of forced liquidations: shorts (or longs) get stopped/liquidated, their forced buys (or sells) accelerate the move against them.' },
  { id:'spread', term:'Bid / Ask Spread', cat:'Derivatives', aliases:['spread','bid-ask','bid/ask','bid ask'],
    def:'The gap between the best buy (bid) and best sell (ask) price. A tight spread means high liquidity; a wide one raises your entry cost.' },
  { id:'slippage', term:'Slippage', cat:'Derivatives', aliases:['slippage'],
    def:'The difference between your expected fill price and the actual one, worse in fast or thin markets. Market orders slip; limit orders don\'t.' },
  { id:'order-types', term:'Order Types', cat:'Derivatives', aliases:['limit order','market order','stop order','trigger order'],
    def:'Market orders fill instantly at the best available price; limit orders fill only at your chosen price or better; stop/trigger orders activate once a level is hit.' },

  /* ── Risk detail ── */
  { id:'invalidation', term:'Invalidation', cat:'Risk', aliases:['invalidation','invalidated','invalidate'],
    def:'The price that proves your trade idea wrong — where your stop belongs. If it trades there, the setup is void; exit without hesitation.' },
  { id:'drawdown', term:'Drawdown', cat:'Risk', aliases:['drawdown'],
    def:'The peak-to-trough drop in your account equity. Managing maximum drawdown is what keeps you in the game through losing streaks.' },

  /* ── Liquidity Theory terminology & derivatives detail ── */
  { id:'dbs-ssr', term:'DBS & SSR Zones', cat:'Structure', aliases:['dbs','ssr','demand buyer support','seller supply resistance','dbs zone','ssr zone'],
    def:'Liquidity Theory\'s names for the core zones: DBS (Demand Buyer Support) is where concentrated buyers repeatedly step in, and SSR (Seller Supply Resistance) is where sellers repeatedly cap price. Price ping-pongs between them until one breaks.' },
  { id:'kijun-sen', term:'Kijun-sen (Baseline)', cat:'Indicators', aliases:['kijun-sen','kijun'],
    def:'The Ichimoku baseline — the midpoint of the highs and lows over a longer period. It is the backbone of the trend and a dynamic support/resistance: price above is bullish, below is bearish, and it doubles as a trailing stop.' },
  { id:'kumo-twist', term:'Kumo Twist', cat:'Indicators', aliases:['kumo twist'],
    def:'When Ichimoku\'s Senkou Span A crosses Span B the cloud flips colour — an early, forward-projected warning of a potential trend change to watch for ahead of price.' },
  { id:'edge-to-edge', term:'Edge to Edge (E2E)', cat:'Indicators', aliases:['edge to edge','e2e'],
    def:'An Ichimoku setup: when price pushes into a thin part of the Kumo it often travels straight through to the opposite edge of the cloud — enter at one edge, target the other.' },
  { id:'cumulative-delta', term:'Cumulative Delta', cat:'Derivatives', aliases:['cumulative delta','cvd'],
    def:'A running total of aggressive buy volume minus aggressive sell volume. Rising delta means buyers are lifting offers; delta rising while price stalls reveals hidden absorption before a move.' },
  { id:'futures-basis', term:'Basis (Futures Basis)', cat:'Derivatives', aliases:['futures basis','contango','backwardation'],
    def:'The gap between a futures/perp price and spot. A positive basis (contango) means futures trade above spot — bullish leverage demand; a negative basis (backwardation) flags bearish positioning.' },
  { id:'mark-price', term:'Mark Price', cat:'Derivatives', aliases:['mark price','index price'],
    def:'The fair price an exchange uses for liquidations and unrealised P&L — derived from the spot index (and funding), not the last trade. It stops a single manipulative wick from unfairly liquidating positions.' },
  { id:'maker-taker', term:'Maker & Taker', cat:'Derivatives', aliases:['maker','taker','maker fee','taker fee'],
    def:'A maker adds liquidity with a resting limit order and pays a lower fee; a taker removes liquidity by hitting the book with a market order and pays more. Trading on limits saves meaningfully on fees over time.' },
  { id:'liquidation-heatmap', term:'Liquidation Heatmap', cat:'Derivatives', aliases:['liquidation heatmap','liquidation level','liquidation cluster','heatmap'],
    def:'A map of where leveraged positions will be force-closed. Large clusters of liquidations act like magnets — price is often drawn toward them to trigger the cascade, then reverses.' },

  /* ── Added from a full course-wide term sweep ── */
  // Liquidity
  { id:'liquidity-pool', term:'Liquidity Pool', cat:'Liquidity', aliases:['liquidity pool','pool','resting liquidity','equal highs','equal lows'],
    def:'A cluster of resting orders — stop-losses and pending entries — pooled just beyond an obvious level such as a swing high/low or a row of equal highs/lows. Price is drawn into the pool so large players can fill, then often reverses. Unlike a full liquidity structure, a pool is usually taken in a single sharp wick with no retest.' },
  { id:'liquidity-structure', term:'Liquidity Structure (Under Over / Over Under)', cat:'Liquidity', aliases:['liquidity structure','under over','over under','multi-candle trap'],
    def:'A multi-candle trap that takes liquidity over time rather than in one wick: a fake break → a period of uncertainty → a decisive reversal → a retest of the reclaimed level (the optimal entry). Bullish Under Over breaks below a range low (trapping longs) then reverses up, retesting the low as support; bearish Over Under breaks above a range high (trapping shorts) then reverses down, retesting the high as resistance.' },
  { id:'order-block', term:'Order Block', cat:'Liquidity', aliases:['order block','orderblock','ob','last up candle','last down candle'],
    def:'The last opposite-direction candle (or small cluster) before a strong, imbalanced move — marking where large orders were placed. A bullish order block is the final down candle before a sharp rally; price often returns to it for a reaction before continuing.' },
  // Candlesticks
  { id:'morning-evening-star', term:'Morning Star / Evening Star', cat:'Candlesticks', aliases:['morning star','evening star','star pattern'],
    def:'Three-candle reversals. A Morning Star (bullish) is a large down candle, a small indecision candle (the “star”) gapping lower, then a large up candle closing back into the first — a bottom. An Evening Star is the mirror image at a top.' },
  { id:'soldiers-crows', term:'Three White Soldiers / Three Black Crows', cat:'Candlesticks', aliases:['three white soldiers','three black crows','soldiers','crows'],
    def:'Three strong same-direction candles in a row, each opening within the prior body and closing near its extreme — toward the highs (Soldiers, bullish) or lows (Crows, bearish). Sustained one-sided conviction; a momentum reversal or continuation signal.' },
  { id:'tweezer', term:'Tweezer Tops / Bottoms', cat:'Candlesticks', aliases:['tweezer','tweezer top','tweezer bottom','tweezers'],
    def:'Two or more adjacent candles with matching highs (Tweezer Top) or matching lows (Tweezer Bottom). The repeated rejection from the exact same level signals exhaustion and a likely reversal.' },
  // Patterns
  { id:'wedge', term:'Wedge (Rising / Falling)', cat:'Patterns', aliases:['wedge','rising wedge','falling wedge'],
    def:'Two converging trendlines both sloping the same way. A rising wedge (both lines up) is typically bearish — momentum fades into the apex and price breaks down; a falling wedge (both lines down) is typically bullish.' },
  // Indicators — Ichimoku set (completes Kijun/Kumo/E2E already present)
  { id:'tenkan-sen', term:'Tenkan-sen (Conversion Line)', cat:'Indicators', aliases:['tenkan','tenkan-sen','conversion line'],
    def:'Ichimoku’s fast line — the midpoint of the last 9 periods’ high and low. It hugs price closely; a Tenkan/Kijun cross is a momentum trigger, and in a strong trend price keeps snapping back to it.' },
  { id:'chikou-span', term:'Chikou Span (Lagging Span)', cat:'Indicators', aliases:['chikou','chikou span','lagging span'],
    def:'Ichimoku’s lagging line — the current close plotted 26 periods back. When it sits clear of past price with open space (above it for longs, below for shorts), the trend is unobstructed and confirmed.' },
  { id:'c-clamp', term:'C-Clamp', cat:'Indicators', aliases:['c-clamp','c clamp','cclamp'],
    def:'An Ichimoku continuation setup: in a strong trend, price, the Tenkan and the Kijun compress together against the Kumo — a brief “clamp” — before releasing and continuing in the trend direction.' },
  // Risk / methodology
  { id:'trailing-stop', term:'Trailing Stop', cat:'Risk', aliases:['trailing stop','trailing stops','trail stop'],
    def:'A stop-loss that ratchets in the trade’s favour as price moves, locking in profit while leaving room to run. It only ever moves one way — up in a long, down in a short — and never back.' },
  { id:'lte', term:'LTE — Level · Trigger · Entry', cat:'Risk', aliases:['lte','level trigger entry','level trigger'],
    def:'Liquidity Theory’s entry framework. Level: a key S/R or zone found by analysis. Trigger: a confirming signal at that level (a candle, a sweep, or an indicator arrow). Entry: act only when level and trigger align — never on the level alone.' },
  { id:'set-and-forget', term:'Set and Forget (SNF)', cat:'Risk', aliases:['set and forget','snf'],
    def:'Placing entry, stop and target up front, then letting the trade play out without interfering. Removes emotional mid-trade decisions — the plan is committed before price can tempt you to move the stop.' },
  // Derivatives / Basics
  { id:'realized-unrealized', term:'Realized vs Unrealized P&L', cat:'Derivatives', aliases:['realized pnl','unrealized pnl','realized p&l','unrealized p&l','pnl'],
    def:'Unrealized P&L is the paper profit/loss of an open position, moving with mark price; Realized P&L is locked in only when you close. Margin and liquidation are driven by unrealized P&L — paper gains can vanish before you bank them.' },
  { id:'trading-styles', term:'Trading Styles (Scalp · Day · Swing · Position)', cat:'Basics', aliases:['trading style','scalping','scalp','day trading','swing trading','position trading'],
    def:'How long you hold and which timeframe you read. Scalping: minutes on the lowest timeframes. Day trading: intraday, flat by the session’s end. Swing trading: days to weeks around daily/weekly levels. Position trading: weeks to months on the macro trend. Choose the one that fits your schedule and temperament.' },

  /* ── Crypto infrastructure: where you trade & how you custody ── */
  { id:'cex', term:'Centralized Exchange (CEX)', cat:'Basics', aliases:['cex','centralized exchange','centralised exchange'],
    def:'A company-run platform (Binance, Coinbase, BloFin, etc.) that holds your funds and matches trades on its own order book. Fast, liquid and easy to use, but you trust the exchange with custody — “not your keys, not your coins.” Most leverage and perpetual trading happens on a CEX.' },
  { id:'dex', term:'Decentralized Exchange (DEX)', cat:'Basics', aliases:['dex','decentralized exchange','decentralised exchange','amm'],
    def:'An on-chain exchange (Uniswap, dYdX, Hyperliquid, etc.) where you trade directly from your own wallet — no company holds your funds. You keep custody and privacy, but pay network gas fees and take on smart-contract risk; liquidity comes from pools (AMMs) or on-chain order books.' },
  { id:'wallet', term:'Crypto Wallet', cat:'Basics', aliases:['wallet','crypto wallet','hot wallet','self-custody','private key','seed phrase'],
    def:'Software or hardware that stores the private keys controlling your crypto — the keys ARE ownership; the coins themselves live on the blockchain. A “hot” wallet stays connected to the internet (convenient, more exposed). Whoever holds the keys (or the 12–24 word seed phrase) controls the funds, so it is never shared.' },
  { id:'cold-storage', term:'Cold Storage Wallet / Device', cat:'Basics', aliases:['cold storage','cold wallet','hardware wallet','ledger','trezor','offline wallet'],
    def:'A wallet that keeps your private keys completely offline — typically a hardware device (Ledger, Trezor) or a paper backup — so the keys never touch an internet-connected computer. The safest way to hold coins you are not actively trading: immune to remote hacks, at the cost of convenience.' }
];

/* ── COURSE METADATA ──────────────────────────────────────────────────────── */
const GL_COURSE_LABEL = {
  1: 'Course 1 · Laying the Foundation',
  2: 'Course 2 · Building Your Toolbox',
  3: 'Course 3 · Sharpening Your Edge',
  4: 'Course 4 · Liquidity Theory'
};
const GL_COURSE_ACCENT = { 1:'#00d4d4', 2:'#e0b020', 3:'#a855f7', 4:'#cc2222' };

/* ── REFERENCE INDEX (scan every course's chapters for each term) ─────────── */
function _glCourses() {
  const out = [{ num:1, chapters: typeof LT_CHAPTERS !== 'undefined' ? LT_CHAPTERS : [] }];
  if (typeof LT_CHAPTERS_2 !== 'undefined') out.push({ num:2, chapters: LT_CHAPTERS_2 });
  if (typeof LT_CHAPTERS_3 !== 'undefined') out.push({ num:3, chapters: LT_CHAPTERS_3 });
  if (typeof LT_CHAPTERS_4 !== 'undefined') out.push({ num:4, chapters: LT_CHAPTERS_4 });
  return out;
}

function _glChapterText(ch) {
  const parts = [ch.title, ch.tag, ch.module];
  ['intro', 'lesson'].forEach(k => {
    const s = ch[k];
    if (s) { parts.push(s.heading, s.body); if (Array.isArray(s.bullets)) parts.push(s.bullets.join(' ')); }
  });
  if (ch.quiz) parts.push(ch.quiz.question, ch.quiz.explanation, ch.quiz.rule);
  return parts.filter(Boolean).join(' ').toLowerCase();
}

// cache: chapter text per "courseNum:idx", and refs per entry id
let _glTextCache = null;
function _glBuildTextCache() {
  if (_glTextCache) return _glTextCache;
  _glTextCache = [];
  _glCourses().forEach(c => c.chapters.forEach((ch, i) => {
    _glTextCache.push({ courseNum: c.num, chapterIdx: i, title: ch.title, tag: ch.tag, text: _glChapterText(ch) });
  }));
  return _glTextCache;
}

function _glMatch(text, token) {
  const esc = token.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // boundaries = start/end or any non-alphanumeric char (handles phrases & slashes)
  return new RegExp('(^|[^a-z0-9])' + esc + '([^a-z0-9]|$)', 'i').test(text);
}

// Generic descriptors that appear all over the course text and are NOT a sign a
// chapter actually "covers" the term. Excluded from REFERENCE matching only —
// the header search still uses every alias, so searching "long"/"bull" still works.
const GL_REF_STOP = new Set([
  'long','short','buy','sell','bullish','bull','bearish','bear',
  'candle','candles','trend','range','supply','demand','up','down'
]);

const _glRefCache = {};
function glFindReferences(entry) {
  if (_glRefCache[entry.id]) return _glRefCache[entry.id];
  const cache  = _glBuildTextCache();
  // Match only on the term's *specific* tokens (drop the generic descriptors).
  const tokens = [entry.term, ...(entry.aliases || [])].filter(t => !GL_REF_STOP.has(t.toLowerCase()));
  const refs = tokens.length
    ? cache.filter(rec => tokens.some(t => _glMatch(rec.text, t)))
        .map(rec => ({ courseNum: rec.courseNum, chapterIdx: rec.chapterIdx, title: rec.title, tag: rec.tag }))
    : [];
  // Merge any curated references (entry.refs = [[courseNum, chapterIdx], ...]) —
  // for foundational terms that are taught broadly but keyword-match poorly.
  if (Array.isArray(entry.refs)) {
    entry.refs.forEach(pair => {
      const cn = pair[0], ci = pair[1];
      if (refs.some(r => r.courseNum === cn && r.chapterIdx === ci)) return;
      const rec = cache.find(x => x.courseNum === cn && x.chapterIdx === ci);
      if (rec) refs.push({ courseNum: cn, chapterIdx: ci, title: rec.title, tag: rec.tag });
    });
    refs.sort((a, b) => a.courseNum - b.courseNum || a.chapterIdx - b.chapterIdx);
  }
  _glRefCache[entry.id] = refs;
  return refs;
}

/* ── LOCK STATE ───────────────────────────────────────────────────────────── */
function _glUnlockAll() { return typeof ltIsUnlockAll === 'function' && ltIsUnlockAll(); }
function glRefLocked(ref) {
  if (_glUnlockAll()) return false;
  const prog = typeof ltGetCourseProgress === 'function' ? ltGetCourseProgress(ref.courseNum) : {};
  const p = prog[ref.chapterIdx];
  return !(p && p.completed);
}

/* ── SEARCH (for the header dropdown) ─────────────────────────────────────── */
function ltGlossarySearch(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  LT_GLOSSARY.forEach(e => {
    const term = e.term.toLowerCase();
    const aliasHit = (e.aliases || []).some(a => a.toLowerCase().includes(q));
    let score = 0;
    if (term === q) score = 100;
    else if (term.startsWith(q)) score = 80;
    else if (term.includes(q)) score = 60;
    else if (aliasHit) score = 50;
    else if (e.def.toLowerCase().includes(q)) score = 20;
    if (score > 0) scored.push({ entry: e, score });
  });
  scored.sort((a, b) => b.score - a.score || a.entry.term.localeCompare(b.entry.term));
  return scored.map(s => s.entry);
}

/* ── GLOSSARY PAGE ────────────────────────────────────────────────────────── */
let _glFilter = '';
let _glCategory = 'All';        // active category filter chip
let _glFiltersOpen = false;     // category-chip row hidden until the Filter button is pressed
let _glFocus  = null;
let _glExpanded = {};   // { termId: true } — which cards have refs revealed
let _glContainerId = 'content-area';   // remembered for in-def cross-link jumps

// Category chips, in a logical (not alphabetical) order.
const GL_CATS = ['Basics','Foundations','Candlesticks','Structure','Liquidity','Patterns','Indicators','Derivatives','Risk'];

/* In-definition cross-links: turn the first mention of another glossary term in a
   definition into a clickable link to that term's card. Built once, longest aliases
   first so multi-word phrases win over their substrings. */
const _GL_LINK_STOP = new Set(['long','short','buy','sell','bull','bear','up','down']);
let _glLinkIndex = null;
function _glBuildLinkIndex() {
  if (_glLinkIndex) return _glLinkIndex;
  const list = [];
  LT_GLOSSARY.forEach(e => {
    [e.term, ...(e.aliases || [])].forEach(a => {
      const key = a.toLowerCase();
      if (key.length < 3 || _GL_LINK_STOP.has(key)) return;
      list.push({ key, id: e.id, len: key.length });
    });
  });
  list.sort((a, b) => b.len - a.len);
  _glLinkIndex = list;
  return list;
}
function _glLinkify(def, selfId) {
  const idx = _glBuildLinkIndex();
  const linked = new Set([selfId]);   // never link a term to itself, and once per target
  let out = def;
  idx.forEach(item => {
    if (linked.has(item.id)) return;
    const esc = item.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re  = new RegExp('(^|[^a-zA-Z])(' + esc + ')(?![a-zA-Z])', 'i');
    let did = false;
    out = out.replace(re, (m, b, w) => { did = true; return b + '<a class="gl-link" onclick="_glJump(\'' + item.id + '\')">' + w + '</a>'; });
    if (did) linked.add(item.id);
  });
  return out;
}

function _glStyles() {
  LTUtils.injectStyles('lt-glossary-styles', `
  .gl-wrap { width:100%; max-width:1000px; margin:0 auto; padding:0 0 48px; }
  /* Plain header — NOT sticky. A pinned header over a scrolling list clipped card
     tops and let cards peek above it; this just scrolls away with the page. */
  .gl-head { margin:0 0 18px; padding:0 0 16px; border-bottom:1px solid var(--border); }
  .gl-back-btn { display:inline-flex; align-items:center; gap:6px; background:none; border:none; color:var(--teal); font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:600; cursor:pointer; padding:0; margin-bottom:12px; }
  .gl-back-btn:hover { opacity:.8; }
  .gl-heading { margin-bottom:14px; }
  .gl-title { font-family:'JetBrains Mono',monospace; font-size:21px; letter-spacing:-0.5px; font-weight:800; color:var(--text); margin:0; line-height:1.15; }
  .gl-sub { font-size:12px; color:var(--text3); margin-top:4px; }

  .gl-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
  .gl-search-box { flex:1; min-width:220px; display:flex; align-items:center; gap:8px; background:var(--bg3); border:1px solid var(--border2); border-radius:var(--radius); padding:8px 12px; }
  .gl-search-box input { flex:1; background:none; border:none; outline:none; color:var(--text); font-family:'JetBrains Mono',monospace; font-size:14px; }
  .gl-search-box i { color:var(--text3); }

  /* Tucked-away dev toggle — quiet text control, not a prominent button */
  .gl-bypass { display:inline-flex; align-items:center; gap:6px; flex-shrink:0; font-size:11px; color:var(--text3); cursor:pointer; user-select:none; background:none; border:none; padding:6px 2px; white-space:nowrap; transition:color .15s; }
  .gl-bypass:hover { color:var(--text2); }
  .gl-bypass input { accent-color:var(--teal); width:13px; height:13px; cursor:pointer; }
  .gl-bypass.on { color:var(--teal); }

  /* Filter toggle button (reveals the category chips, hidden by default) */
  .gl-filter-btn { display:inline-flex; align-items:center; gap:7px; background:var(--bg3); border:1px solid var(--border2); border-radius:var(--radius); color:var(--text2); font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:600; padding:8px 13px; cursor:pointer; transition:border-color .15s, color .15s, background .15s; white-space:nowrap; }
  .gl-filter-btn:hover { border-color:var(--teal); color:var(--text); }
  .gl-filter-btn.open, .gl-filter-btn.has-filter { border-color:var(--teal); color:var(--teal); background:color-mix(in srgb, var(--teal) 10%, transparent); }
  .gl-filter-chev { transition:transform .18s; }
  .gl-filter-btn.open .gl-filter-chev { transform:rotate(180deg); }

  /* Category filter chips */
  .gl-cats { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:12px; }
  .gl-cat-pill { display:inline-flex; align-items:center; gap:6px; background:var(--bg3); border:1px solid var(--border2); border-radius:100px; color:var(--text2); font-family:'JetBrains Mono',monospace; font-size:11.5px; font-weight:600; padding:5px 12px; cursor:pointer; transition:border-color .15s, color .15s, background .15s; }
  .gl-cat-pill:hover { border-color:var(--teal); color:var(--text); }
  .gl-cat-pill.active { background:color-mix(in srgb, var(--teal) 12%, transparent); border-color:var(--teal); color:var(--teal); }
  .gl-cat-pill-n { font-size:10px; color:var(--text3); font-variant-numeric:tabular-nums; }
  .gl-cat-pill.active .gl-cat-pill-n { color:var(--teal); }

  /* In-definition cross-links to other terms */
  .gl-link { color:var(--teal); cursor:pointer; border-bottom:1px dotted color-mix(in srgb, var(--teal) 45%, transparent); border-radius:2px; transition:border-color .15s, background .15s; }
  .gl-link:hover { border-bottom-color:var(--teal); background:var(--teal-faint,rgba(0,212,212,.08)); }

  .gl-count { font-size:11px; color:var(--text3); margin:0 0 14px; }

  .gl-card { background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px 18px; margin-bottom:12px; scroll-margin-top:80px; }
  .gl-card.gl-flash { animation:glFlash 1.4s ease; }
  @keyframes glFlash { 0%{box-shadow:0 0 0 2px var(--teal);} 100%{box-shadow:0 0 0 0 transparent;} }
  .gl-card-top { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:7px; }
  .gl-term { font-family:'JetBrains Mono',monospace; font-size:18px; letter-spacing:-0.3px; font-weight:800; color:var(--text); }
  .gl-cat { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:var(--text3); background:var(--bg4); border:1px solid var(--border2); padding:2px 8px; border-radius:10px; }
  .gl-def { font-size:13.5px; color:var(--text2); line-height:1.7; margin-bottom:12px; }
  .gl-def-row { display:flex; gap:18px; align-items:flex-start; margin-bottom:12px; }
  .gl-def-row .gl-def { flex:1; margin-bottom:0; }
  /* Figure — framed, clickable, expandable */
  .gl-figure { flex:0 0 172px; width:172px; padding:0; margin:0; border:none; background:none; cursor:zoom-in; display:block; font-family:inherit; -webkit-appearance:none; }
  .gl-fig-frame { display:block; position:relative; padding:7px; border:1px solid var(--border2); border-radius:var(--radius); overflow:hidden; background:linear-gradient(180deg, rgba(0,212,212,.05), transparent 58%), var(--bg2); transition:border-color .16s, box-shadow .16s, transform .16s; }
  .gl-fig-frame::before { content:""; position:absolute; inset:0; pointer-events:none; opacity:.45; background-image:linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px); background-size:17px 17px; }
  .gl-figure svg { position:relative; z-index:1; width:100%; height:auto; display:block; background:transparent; color:var(--text); }
  .gl-fig-zoom { position:absolute; z-index:2; top:6px; right:6px; width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; background:rgba(4,8,8,.6); border:1px solid var(--border2); color:var(--text2); opacity:.6; transition:all .16s; }
  .gl-figure:hover .gl-fig-frame { border-color:var(--teal); transform:translateY(-2px); box-shadow:0 8px 22px rgba(0,0,0,.45), 0 0 0 1px rgba(0,212,212,.2); }
  .gl-figure:hover .gl-fig-zoom { opacity:1; color:var(--teal); border-color:var(--teal); }
  .gl-figure:focus-visible { outline:2px solid var(--teal); outline-offset:3px; border-radius:var(--radius); }
  @media(max-width:600px){ .gl-def-row{ flex-direction:column-reverse; } .gl-figure{ flex:0 0 auto; width:100%; max-width:240px; } }

  /* Figure lightbox (pop-out) */
  .gl-lightbox { position:fixed; inset:0; z-index:9500; display:none; align-items:center; justify-content:center; padding:24px; background:rgba(0,0,0,.8); backdrop-filter:blur(5px); }
  .gl-lightbox.open { display:flex; animation:glFadeIn .18s ease; }
  .gl-lightbox-box { position:relative; width:100%; max-width:640px; max-height:92vh; overflow:auto; background:var(--bg3); border:1px solid var(--border2); border-radius:var(--radius-lg); padding:22px 24px 24px; box-shadow:0 32px 90px rgba(0,0,0,.7); animation:glPop .22s cubic-bezier(.34,1.56,.64,1); }
  @keyframes glPop { from{opacity:0; transform:scale(.94);} to{opacity:1; transform:scale(1);} }
  .gl-lightbox-head { display:flex; align-items:baseline; gap:11px; margin-bottom:14px; padding-right:34px; flex-wrap:wrap; }
  .gl-lightbox-term { font-family:'JetBrains Mono',monospace; font-size:20px; font-weight:800; color:var(--text); }
  .gl-lightbox-fig { position:relative; border:1px solid var(--border2); border-radius:var(--radius); overflow:hidden; background:linear-gradient(180deg, rgba(0,212,212,.06), transparent 55%), var(--bg2); }
  .gl-lightbox-fig::before { content:""; position:absolute; inset:0; pointer-events:none; opacity:.5; background-image:linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px); background-size:30px 30px; }
  .gl-lightbox-fig svg { position:relative; z-index:1; width:100%; height:auto; display:block; background:transparent; color:var(--text); padding:14px; }
  .gl-lightbox-def { font-size:14px; color:var(--text2); line-height:1.7; margin-top:15px; }
  .gl-lightbox-def strong { color:var(--text); font-weight:600; }
  .gl-lightbox-hint { font-size:11px; color:var(--text3); text-align:center; margin-top:12px; }
  .gl-lightbox-close { position:absolute; top:12px; right:12px; width:30px; height:30px; border-radius:8px; background:var(--bg4); border:1px solid var(--border2); color:var(--text2); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
  .gl-lightbox-close:hover { border-color:var(--teal); color:var(--teal); }

  .gl-refs-toggle {
    display:inline-flex; align-items:center; gap:6px; background:var(--bg4); border:1px solid var(--border2);
    border-radius:var(--radius); color:var(--text2); font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700;
    text-transform:uppercase; letter-spacing:.5px; cursor:pointer; padding:6px 12px; transition:all .15s;
  }
  .gl-refs-toggle:hover { border-color:var(--teal); color:var(--teal); }
  .gl-refs-chevron { transition:transform .18s ease; }
  .gl-refs-toggle.open .gl-refs-chevron { transform:rotate(90deg); }
  .gl-refs { display:none; flex-direction:column; gap:6px; margin-top:10px; }
  .gl-refs.open { display:flex; animation:glFadeIn .2s ease; }
  @keyframes glFadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
  .gl-ref { display:flex; align-items:center; gap:10px; padding:8px 10px; border:1px solid var(--border2); border-radius:var(--radius); background:var(--bg4); cursor:pointer; transition:all .15s; }
  .gl-ref:hover { border-color:var(--teal); }
  .gl-ref.locked { opacity:.6; cursor:not-allowed; }
  .gl-ref.locked:hover { border-color:#cc2222; }
  .gl-ref-accent { width:3px; align-self:stretch; border-radius:2px; flex-shrink:0; }
  .gl-ref-body { flex:1; min-width:0; }
  .gl-ref-title { font-size:13px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .gl-ref-meta { font-size:11px; color:var(--text3); }
  .gl-ref-icon { flex-shrink:0; display:flex; align-items:center; }
  .gl-ref-none { font-size:12px; color:var(--text3); font-style:italic; }

  .gl-empty { text-align:center; padding:50px 20px; color:var(--text3); }

  @media(max-width:600px){
    .gl-head{ padding-top:12px; }
    .gl-title{ font-size:19px; }
    .gl-sub{ display:none; }                 /* drop the verbose meta line on phones */
    .gl-toolbar{ gap:8px; margin-bottom:12px; }
    .gl-search-box{ flex:1 1 100%; }         /* search gets its own full-width row */
    .gl-filter-btn{ flex:1; }                /* Filter fills the second row */
    .gl-bypass{ display:none; }              /* dev/preview-only toggle — hide on mobile */
  }
  `);
}

/* ── TERM ILLUSTRATIONS (only for visual concepts) ───────────────────────── */
// Palette — track the brand tokens (and the learner's configured bull/bear colours,
// like _gc does) so figures match the candles + v2 lessons: teal = support/bull,
// pink (--bear) = resistance/stop/bear, gold = target/liquidity, slate = neutral guides.
const _GT = 'var(--teal)', _GR = 'var(--bear)', _GM = '#8b85a3', _GG = 'var(--gold)';
function _gsvg(inner) { return `<svg viewBox="0 0 156 104" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${inner}</svg>`; }
function _gc(x, o, c, h, l) { // candle: y-pixels (smaller y = higher price)
  // candle colours follow the learner's configured bull/bear (cyan up / pink down by default)
  const up = c <= o, col = up ? 'var(--teal)' : 'var(--bear)', top = Math.min(o, c), bh = Math.max(2, Math.abs(c - o));
  return `<line x1="${x}" y1="${h}" x2="${x}" y2="${l}" stroke="${col}" stroke-width="1.4"/><rect x="${x - 3.5}" y="${top}" width="7" height="${bh}" rx="1" fill="${col}"/>`;
}
function _gl(y, col, dash) { return `<line x1="6" y1="${y}" x2="150" y2="${y}" stroke="${col}" stroke-width="1.1" ${dash ? 'stroke-dasharray="4 3"' : ''} opacity="0.85"/>`; }
function _gp(pts, col, w, dash) { return `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${w || 1.6}" ${dash ? 'stroke-dasharray="4 3"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`; }
function _gz(y1, y2, col) { return `<rect x="6" y="${y1}" width="144" height="${y2 - y1}" fill="${col}"/>`; }
function _gtx(x, y, s, col) { return `<text x="${x}" y="${y}" fill="${col || _GM}" font-size="8" font-family="JetBrains Mono,monospace" font-weight="700">${s}</text>`; }
// Flexible label: anchor (start|middle|end) + optional size.
function _glab(x, y, s, col, anchor, size) { return `<text x="${x}" y="${y}" fill="${col || _GM}" font-size="${size || 8}" font-family="JetBrains Mono,monospace" font-weight="700" text-anchor="${anchor || 'start'}">${s}</text>`; }
function _gdot(x, y, col, r) { return `<circle cx="${x}" cy="${y}" r="${r || 2.6}" fill="${col || _GT}"/>`; }
// Arrow: line from (x1,y1) to (x2,y2) with a solid head at the end.
function _garr(x1, y1, x2, y2, col, w) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 5.2;
  const ax = (x2 - L * Math.cos(a - 0.5)).toFixed(1), ay = (y2 - L * Math.sin(a - 0.5)).toFixed(1);
  const bx = (x2 - L * Math.cos(a + 0.5)).toFixed(1), by = (y2 - L * Math.sin(a + 0.5)).toFixed(1);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w || 1.8}" stroke-linecap="round"/><polygon points="${x2},${y2} ${ax},${ay} ${bx},${by}" fill="${col}"/>`;
}
// Zone rect at an explicit x/width (vs _gz which spans the full plot).
function _gzc(x, y, w, h, col) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${col}"/>`; }
// Histogram bar from baseline y0 up/down to y1.
function _gbar(x, y0, y1, w, col) { const top = Math.min(y0, y1); return `<rect x="${x - (w || 5) / 2}" y="${top}" width="${w || 5}" height="${Math.max(1, Math.abs(y1 - y0))}" rx="1" fill="${col}"/>`; }
// Small ✕ (exit / invalidated) and ✓ (target hit) glyphs, drawn as strokes.
function _gx(x, y, col, s) { const r = s || 4; return `<line x1="${x - r}" y1="${y - r}" x2="${x + r}" y2="${y + r}" stroke="${col || _GR}" stroke-width="1.8" stroke-linecap="round"/><line x1="${x + r}" y1="${y - r}" x2="${x - r}" y2="${y + r}" stroke="${col || _GR}" stroke-width="1.8" stroke-linecap="round"/>`; }
function _gck(x, y, col, s) { const r = s || 4.5; return `<polyline points="${x - r},${y} ${x - r * 0.25},${y + r * 0.8} ${x + r},${y - r}" fill="none" stroke="${col || _GT}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`; }

// NOTE: figures must NOT spell out the term — they double as the prompt in
// Definition → Term mode. Only generic structural labels (levels, HH/LH) allowed.
const GL_FIGURES = {
  doji:          _gsvg(_gc(78,55,53,18,90) + _gtx(40,100,'open ≈ close')),
  hammer:        _gsvg(_gc(30,28,42,24,46)+_gc(54,42,54,38,58)+_gc(78,54,66,50,70)+_gc(104,70,64,58,96)+_glab(104,102,'long lower wick',_GT,'middle',7)),
  'shooting-star':_gsvg(_gc(30,76,64,80,60)+_gc(54,64,52,68,48)+_gc(78,52,40,56,36)+_gc(104,40,46,14,50)+_glab(104,102,'long upper wick',_GR,'middle',7)),
  marubozu:      _gsvg(_gc(56,82,28,28,82)+_gc(100,28,82,28,82)+_gtx(34,101,'no wicks')),
  wick:          _gsvg(_gc(78,52,60,22,90)+`<line x1="92" y1="22" x2="92" y2="44" stroke="${_GM}"/><line x1="92" y1="76" x2="92" y2="90" stroke="${_GM}"/>`),
  body:          _gsvg(_gc(86,72,36,20,90)+'<rect x="81.5" y="36" width="9" height="36" fill="none" stroke="'+_GT+'" stroke-width="1.3" stroke-dasharray="3 2"/>'+'<line x1="70" y1="72" x2="82" y2="72" stroke="#8b85a3" stroke-width="1" stroke-dasharray="2 2"/><line x1="70" y1="36" x2="82" y2="36" stroke="#8b85a3" stroke-width="1" stroke-dasharray="2 2"/>'+_glab(66,75,'open',_GM,'end',7)+_glab(66,39,'close',_GM,'end',7)),
  engulfing:     _gsvg('<rect x="55" y="46" width="10" height="12" fill="none" stroke="#8b85a3" stroke-width="0.9" stroke-dasharray="2 2"/>'+_gc(60,46,58,42,62)+_gc(86,64,34,30,68)+_glab(80,100,'engulfs prior',_GT,'middle',7)),
  'bull-flag':   _gsvg(_gp('14,92 44,30',_GT,2.4)+_gp('44,30 84,44',_GM,1.2,true)+_gp('44,52 84,66',_GM,1.2,true)+_gp('84,50 138,12',_GT,2.4)+_glab(14,60,'pole',_GT,'start',7)+_glab(62,82,'flag',_GM,'middle',7)),
  'bear-flag':   _gsvg(_gp('14,14 44,76',_GR,2.4)+_gp('44,76 84,62',_GM,1.2,true)+_gp('44,54 84,40',_GM,1.2,true)+_gp('84,56 138,94',_GR,2.4)+_glab(14,46,'pole',_GR,'start',7)+_glab(62,32,'flag',_GM,'middle',7)),
  'double-top':  _gsvg(_gl(28,_GR,true)+_gp('10,82 38,30 58,56 82,30 110,82 138,60',_GT,1.8)+_gl(56,_GM,true)+_gtx(108,52,'neckline')),
  'double-bottom':_gsvg(_gl(82,_GT,true)+_gp('10,28 38,80 58,52 82,80 110,28 138,46',_GT,1.8)+_gl(52,_GM,true)+_gtx(104,46,'neckline')),
  'head-shoulders':_gsvg(_gp('8,72 26,52 42,62 62,28 84,62 102,50 120,72',_GT,1.8)+_gl(62,_GM,true)+_gdot(26,52,_GM,2.4)+_gdot(62,28,_GR,2.8)+_gdot(102,50,_GM,2.4)+_gtx(66,101,'neckline')),
  triangle:      _gsvg(_gp('10,28 140,52',_GM,1.3,true)+_gp('10,82 140,56',_GM,1.3,true)+_gp('10,60 34,40 56,70 78,48 100,62 122,54',_GT,1.6)),
  channel:       _gsvg(_gp('10,30 142,56',_GM,1.3,true)+_gp('10,58 142,84',_GM,1.3,true)+_gp('14,52 40,34 64,56 90,40 116,62 140,48',_GT,1.6)),
  trend:         _gsvg(_gp('10,90 30,58 44,70 66,40 80,52 102,24 116,36 146,12',_GT,2)+_gtx(26,101,'HH / HL',_GT)),
  range:         _gsvg(_gl(30,_GR,true)+_gl(82,_GT,true)+_gp('10,82 30,32 50,80 72,32 94,80 116,32 140,78',_GT,1.6)+_glab(150,27,'sell high',_GR,'end',7)+_glab(8,94,'buy low',_GT,'start',7)),
  breakout:      _gsvg(_gl(40,_GR,true)+_gp('10,72 28,44 46,70 64,44 82,68 100,42 116,30 140,12',_GT,1.8)+_garr(116,30,140,13,_GT,1.8)+_glab(8,36,'level',_GR,'start',7)),
  'support-resistance':_gsvg(_gl(30,_GR,true)+_gl(80,_GT,true)+_gp('12,78 34,32 56,78 78,32 100,78 122,32 144,56',_GT,1.6)+_glab(8,27,'resistance',_GR,'start',7)+_glab(8,93,'support',_GT,'start',7)),
  'supply-demand':_gsvg(_gz(18,34,'rgba(255,46,136,0.16)')+_gz(74,90,'rgba(0,212,212,0.16)')+_gp('10,82 34,30 56,84 80,30 104,84 128,32 146,72',_GT,1.6)+_glab(10,29,'supply',_GR,'start',7)+_glab(10,87,'demand',_GT,'start',7)),
  pullback:      _gsvg(_gp('10,90 46,38 70,58 142,12',_GT,2)+_gdot(70,58,_GG,2.6)+_glab(70,72,'temporary',_GM,'middle',7)+_glab(112,20,'↑ resumes',_GT,'start',7)),
  retest:        _gsvg(_gl(50,_GT,true)+_gp('10,74 42,34',_GT,1.8)+_gp('42,34 74,50',_GM,1.8)+_gp('74,50 120,22 140,14',_GT,1.8)+_gdot(74,50,_GT,2.8)+_glab(18,30,'break ↑',_GT,'start',7)+_glab(150,46,'holds',_GT,'end',7)),
  swing:         _gsvg(_gp('10,80 38,40 64,66 92,28 118,58 144,24',_GT,1.6)+'<circle cx="38" cy="40" r="2.8" fill="'+_GR+'"/><circle cx="92" cy="28" r="2.8" fill="'+_GR+'"/><circle cx="64" cy="66" r="2.8" fill="'+_GT+'"/><circle cx="118" cy="58" r="2.8" fill="'+_GT+'"/>'+_glab(92,20,'high',_GR,'middle',7)+_glab(64,80,'low',_GT,'middle',7)),
  'premium-discount':_gsvg(_gz(20,50,'rgba(255,46,136,0.13)')+_gz(50,80,'rgba(0,212,212,0.13)')+_gl(50,_GG,true)+_glab(12,32,'premium',_GR,'start',7)+_glab(12,70,'discount',_GT,'start',7)+_glab(150,47,'equilibrium',_GG,'end',7)),
  ichimoku:      _gsvg(
                   // Kumo cloud — Senkou A (top) + Senkou B (bottom), angular w/ flat steps and
                   // varied thickness (thin pocket → thick wall), projecting slightly forward
                   '<polygon points="8,80 44,80 44,72 84,66 84,56 120,50 148,46 148,62 120,64 84,72 84,76 44,84 8,84" fill="rgba(40,200,120,0.18)"/>'
                   + _gp('8,80 44,80 44,72 84,66 84,56 120,50 148,46','rgba(40,200,120,0.75)',1.2)   // Senkou A
                   + _gp('8,84 44,84 84,76 84,72 120,64 148,62','rgba(255,46,136,0.6)',1.2)            // Senkou B (flatter)
                   + _gp('8,66 46,66 46,58 96,58 96,50 148,46',_GG,1.9)                               // Kijun — slow, flat steps
                   + _gp('8,60 28,54 48,58 70,44 96,40 122,32 148,26',_GT,1.7)                       // Tenkan — fast, angular
                   + _glab(78,98,'the cloud',_GM,'middle',7)),
  fibonacci:     _gsvg(_gl(20,_GM,true)+_gl(42,_GM,true)+_gl(58,_GG,true)+_gl(80,_GM,true)+_gp('10,80 46,20 78,58 110,30 140,18',_GT,1.8)+_gtx(112,55,'.618',_GG)),
  'moving-average':_gsvg(_gc(24,80,70,84,66)+_gc(44,70,60,74,56)+_gc(64,60,66,56,70)+_gc(84,66,50,70,46)+_gc(104,50,42,54,38)+_gc(124,42,46,38,50)+_gp('20,82 44,68 64,62 84,56 104,46 128,44',_GG,2)),
  rsi:           _gsvg(_gl(28,_GR,true)+_gl(76,_GT,true)+_gp('8,52 28,30 48,60 70,74 92,40 114,30 136,58 148,46','currentColor',1.6)+_gtx(116,24,'70',_GR)+_gtx(116,90,'30',_GT)),
  divergence:    _gsvg(_gp('10,56 40,36 66,50 100,26',_GT,1.6)+_gp('10,84 40,74 66,82 100,78',_GG,1.6)+`<line x1="40" y1="36" x2="100" y2="26" stroke="${_GM}" stroke-dasharray="3 2"/><line x1="40" y1="74" x2="100" y2="78" stroke="${_GM}" stroke-dasharray="3 2"/>`+_gtx(104,28,'HH',_GT)+_gtx(104,82,'LH',_GG)),
  'liquidity-sweep':_gsvg(_gl(34,_GR,true)+_gc(34,72,60,76,56)+_gc(56,60,50,64,46)+_gc(78,50,44,48,40)+_gc(100,44,58,22,62)+_gc(122,58,76,54,80)+_glab(8,30,'stops',_GR,'start',7)+_glab(150,88,'reversal ↓',_GR,'end',7)),
  fvg:           _gsvg('<rect x="62" y="44" width="40" height="16" fill="rgba(0,212,212,0.18)"/>'+_gc(48,78,62,82,58)+_gc(78,60,34,64,30)+_gc(108,40,30,44,26)),
  // Break of Structure: an uptrend pulls back, then breaks ABOVE the prior swing
  // high (dashed level), confirming continuation.
  bos:           _gsvg(_gl(40,_GR,true)+_gp('10,82 30,44 50,60 72,40 92,56 116,28 140,18',_GT,1.9)+_garr(116,28,140,17,_GT,1.8)+_glab(8,36,'prior high',_GR,'start',7)),
  volume:        _gsvg('<rect x="12" y="70" width="9" height="22" fill="var(--teal)"/><rect x="29" y="62" width="9" height="30" fill="var(--bear)"/><rect x="46" y="76" width="9" height="16" fill="var(--teal)"/><rect x="63" y="54" width="9" height="38" fill="var(--teal)"/><rect x="80" y="66" width="9" height="26" fill="var(--bear)"/><rect x="97" y="48" width="9" height="44" fill="var(--teal)"/><rect x="114" y="72" width="9" height="20" fill="var(--bear)"/><rect x="131" y="58" width="9" height="34" fill="var(--teal)"/>')
};
GL_FIGURES.oscillator = GL_FIGURES.rsi;
GL_FIGURES.trendline  = GL_FIGURES.trend;
GL_FIGURES['spinning-top']    = _gsvg(_gc(78,58,50,26,84) + _gtx(40,100,'small body'));
GL_FIGURES['inverted-hammer'] = _gsvg(_gc(30,28,40,24,44)+_gc(54,40,52,36,56)+_gc(78,52,64,48,68)+_gc(104,68,62,28,74)+_glab(104,102,'long upper wick',_GT,'middle',7));
GL_FIGURES['kijun-sen'] = _gsvg(_gc(26,78,68,82,64)+_gc(46,68,58,72,54)+_gc(66,58,64,54,68)+_gc(86,64,48,68,44)+_gc(106,48,40,52,36)+_gc(126,40,46,36,50)+_gp('18,80 46,66 74,60 102,48 134,44',_GG,2.2)+_glab(150,40,'slow line',_GG,'end',7));
GL_FIGURES['kumo-twist'] = _gsvg('<polygon points="8,48 60,52 60,60 8,56" fill="rgba(255,46,136,0.16)"/><polygon points="60,60 100,58 148,40 148,64 100,66 60,60" fill="rgba(0,212,212,0.18)"/>'+_gp('8,48 60,52 100,58 148,40',_GT,1.4)+_gp('8,56 60,60 100,66 148,64',_GR,1.4)+_gdot(60,58,_GG,3.2)+_glab(60,96,'cloud flips',_GG,'middle',7));
GL_FIGURES['edge-to-edge'] = _gsvg('<polygon points="8,46 60,46 148,40 148,64 60,70 8,70" fill="rgba(0,212,212,0.16)"/>'+_gp('8,46 60,46 148,40',_GT,1.4)+_gp('8,70 60,70 148,64',_GR,1.4)+_garr(40,68,120,44,_GT,1.8)+_gdot(40,68,_GT,2.6)+_glab(30,82,'enter',_GT,'start',7)+_glab(126,40,'target',_GT,'start',7));
GL_FIGURES['liquidation-heatmap'] = _gsvg('<rect x="6" y="22" width="144" height="7" fill="rgba(255,46,136,0.5)"/><rect x="6" y="33" width="144" height="7" fill="rgba(255,46,136,0.22)"/><rect x="6" y="74" width="144" height="7" fill="rgba(0,200,120,0.45)"/><rect x="6" y="85" width="144" height="7" fill="rgba(0,200,120,0.2)"/>'+_gp('10,70 36,40 60,56 86,30 112,52 140,26',_GT,1.6)+_glab(148,19,'clusters',_GR,'end',7));
GL_FIGURES['cumulative-delta'] = _gsvg(_gp('10,58 40,40 70,52 100,30 140,22',_GT,1.6)+_gp('10,82 40,72 70,78 100,76 140,84',_GG,1.8)+`<line x1="100" y1="30" x2="100" y2="76" stroke="${_GM}" stroke-dasharray="3 2"/>`+_glab(150,20,'price',_GT,'end',7)+_glab(150,80,'delta',_GG,'end',7));
// Dragonfly: ~zero body at the top, long lower wick — buyers reclaimed it all (bullish, teal).
GL_FIGURES['dragonfly-doji']  = _gsvg(_gc(86, 35, 33, 30, 92)+_glab(80,66,'buyers',_GT,'end',7)+_glab(80,76,'reclaim ↑',_GT,'end',7));
// Gravestone: ~zero body at the bottom, long upper wick — sellers rejected it all (bearish, pink).
GL_FIGURES['gravestone-doji'] = _gsvg(_gc(86, 71, 73, 16, 76)+_glab(80,34,'sellers',_GR,'end',7)+_glab(80,44,'reject ↓',_GR,'end',7));
// ── course-sweep additions ──
// Liquidity pool: price rises into a resting-order level, one wick pierces it, then reverses.
GL_FIGURES['liquidity-pool'] = _gsvg(_gl(28,_GM,true)+_gc(28,78,66,82,62)+_gc(52,66,56,70,52)+_gc(76,56,48,60,44)+_gc(100,48,62,16,66)+_gc(124,62,80,58,84));
// Liquidity structure: range (red top / teal bottom); price fakes BELOW the low then reverses up through.
GL_FIGURES['liquidity-structure'] = _gsvg(_gl(34,_GR,true)+_gl(78,_GT,true)+_gc(22,58,54,54,62)+_gc(44,54,72,50,86)+_gc(66,72,66,86,92)+_gc(88,66,50,70,46)+_gc(110,50,38,54,34)+_gc(132,38,44,28,48)+_glab(38,102,'fake break ↓',_GR,'start',7)+_glab(150,30,'reclaim ↑',_GT,'end',7));
// Order block: highlight the last down candle before a strong up move.
GL_FIGURES['order-block'] = _gsvg('<rect x="36" y="50" width="16" height="24" rx="1.5" fill="rgba(0,212,212,0.18)" stroke="'+_GT+'" stroke-width="0.8"/>'+_gc(44,54,72,50,76)+_gc(68,54,34,58,30)+_gc(92,34,26,38,22)+_gc(116,26,40,22,44)+_glab(44,90,'last down candle',_GT,'middle',7));
// Morning star: large down, small star gapping lower, large up closing back in.
GL_FIGURES['morning-evening-star'] = _gsvg(_gc(40,30,64,26,68)+_gc(74,80,76,74,86)+_gc(108,66,32,28,70)+_glab(74,100,'star',_GG,'middle',7));
// Three white soldiers: three ascending up candles.
GL_FIGURES['soldiers-crows'] = _gsvg(_gc(40,82,58,86,54)+_gc(72,64,40,68,36)+_gc(104,46,22,50,18)+_glab(72,100,'3 strong closes',_GT,'middle',7));
// Tweezer top: two candles rejecting the exact same high (dashed level).
GL_FIGURES['tweezer'] = _gsvg(_gl(34,_GR,true)+_gc(60,64,40,34,68)+_gc(90,40,66,34,70)+_glab(75,28,'equal highs',_GR,'middle',7)+_garr(106,42,106,64,_GR,1.3));
// Rising wedge: two upward-converging lines with price inside.
GL_FIGURES['wedge'] = _gsvg(_gp('10,88 142,32',_GM,1.3,true)+_gp('10,58 142,42',_GM,1.3,true)+_gp('14,78 40,60 64,68 90,52 116,58 140,48',_GT,1.6));
// Tenkan: a FAST line hugging price (teal) — vs Kijun's slower gold line.
GL_FIGURES['tenkan-sen'] = _gsvg(_gc(26,78,68,82,64)+_gc(46,68,58,72,54)+_gc(66,58,64,54,68)+_gc(86,64,48,68,44)+_gc(106,48,40,52,36)+_gc(126,40,46,36,50)+_gp('20,74 46,62 66,60 86,52 106,42 134,42',_GT,2.2)+_glab(150,40,'fast line',_GT,'end',7));
// Chikou: a line offset to the LEFT of price (lagging).
GL_FIGURES['chikou-span'] = _gsvg(_gc(48,78,64,82,60)+_gc(72,64,52,68,48)+_gc(96,52,40,56,36)+_gc(120,40,46,36,50)+_gp('14,82 40,70 66,58 92,46 118,40',_GM,2)+_glab(14,96,'plotted behind price',_GM,'start',7));
// C-Clamp: price/lines compress against the cloud, then break out in trend.
GL_FIGURES['c-clamp'] = _gsvg('<polygon points="8,46 78,48 78,58 8,56" fill="rgba(0,212,212,0.14)"/>'+_gp('8,44 96,46',_GG,1.6)+_gp('8,60 96,58',_GT,1.6)+_gc(34,56,50,52,60)+_gc(54,54,52,50,58)+_gc(74,54,50,50,58)+_gp('96,52 142,18',_GT,2.2)+_garr(120,35,142,18,_GT,1.8)+_glab(48,74,'compress',_GT,'middle',7)+_glab(118,44,'release',_GT,'start',7));
// Trailing stop: price rises (teal); the stop steps up beneath it (dashed red).
GL_FIGURES['trailing-stop'] = _gsvg(_gp('10,86 38,62 66,70 94,40 134,18',_GT,2)+_gp('10,96 38,84 66,84 94,62 134,40',_GR,1.6,true)+_glab(150,44,'stop trails ↑',_GR,'end',7));

/* ═══ Expanded coverage — figures for the remaining terms ════════════════════
   Same rule as above: labels stay GENERIC (never the term itself) so each figure
   is valid as the Definition→Term flashcard prompt. Palette: teal=support/bull,
   pink(--bear)=resistance/stop/bear, gold=target/liquidity, slate=neutral. */
// ── Foundations ──
// Candlestick anatomy: one bull candle with O/H/L/C guide ticks.
GL_FIGURES['candlestick'] = _gsvg(
  _gc(94, 74, 40, 20, 94)
  + '<g stroke="#8b85a3" stroke-width="1" stroke-dasharray="3 2" opacity=".55">'
    + '<line x1="70" y1="20" x2="94" y2="20"/><line x1="70" y1="40" x2="90.5" y2="40"/>'
    + '<line x1="70" y1="74" x2="90.5" y2="74"/><line x1="70" y1="94" x2="94" y2="94"/></g>'
  + _glab(66, 23, 'H', '#8b85a3', 'end') + _glab(66, 43, 'C', _GT, 'end')
  + _glab(66, 77, 'O', _GT, 'end') + _glab(66, 97, 'L', '#8b85a3', 'end')
);
// Price action: raw candles making higher lows (dots) — no indicators, just structure.
GL_FIGURES['price-action'] = _gsvg(
  _gc(24, 80, 68, 84, 64) + _gc(44, 68, 56, 72, 52) + _gc(64, 56, 64, 52, 74)
  + _gc(84, 64, 44, 40, 68) + _gc(104, 44, 52, 40, 66) + _gc(124, 52, 30, 26, 56) + _gc(140, 30, 24, 20, 34)
  + _gdot(64, 74, _GT, 2.2) + _gdot(104, 66, _GT, 2.2)
  + _glab(84, 100, 'higher lows', _GT, 'middle', 7)
);

// ── Structure ──
// Market structure: HH/HL uptrend, then a lower high = a structure shift.
GL_FIGURES['market-structure'] = _gsvg(
  _gp('10,84 28,50 44,64 62,34 80,50 98,24', _GT, 1.8)
  + _gp('98,24 116,54 132,42 148,72', _GR, 1.8)
  + _gdot(62, 34, _GT, 2.2) + _gdot(98, 24, _GT, 2.2) + _gdot(44, 64, _GT, 2.2) + _gdot(80, 50, _GT, 2.2)
  + _gdot(116, 54, _GR, 2.4)
  + _glab(18, 30, 'HH', _GT) + _glab(120, 50, 'LH', _GR)
);
// DBS & SSR: sellers cap the top zone, buyers hold the bottom; price ping-pongs.
GL_FIGURES['dbs-ssr'] = _gsvg(
  _gz(18, 32, 'rgba(255,46,136,0.15)') + _gz(72, 86, 'rgba(0,212,212,0.15)')
  + _gp('10,80 30,30 52,82 74,30 96,82 118,30 140,78', _GT, 1.6)
  + _glab(8, 29, 'sellers', _GR, 'start', 7) + _glab(8, 84, 'buyers', _GT, 'start', 7)
);

// ── Liquidity ──
// Liquidity: resting stop orders pooled just above the swing highs.
GL_FIGURES['liquidity'] = _gsvg(
  _gp('10,70 30,44 52,64 74,30 96,58 118,32 140,60', _GT, 1.6) + _gl(24, _GM, true)
  + '<g fill="#8b85a3" opacity=".9">'
    + '<rect x="64" y="19" width="4" height="2.6" rx="1"/><rect x="72" y="19" width="4" height="2.6" rx="1"/><rect x="80" y="19" width="4" height="2.6" rx="1"/>'
    + '<rect x="108" y="19" width="4" height="2.6" rx="1"/><rect x="116" y="19" width="4" height="2.6" rx="1"/><rect x="124" y="19" width="4" height="2.6" rx="1"/></g>'
  + _glab(8, 17, 'stops', _GM, 'start', 7)
);
// Mitigation: impulse up leaves a zone; price returns to tap it, then continues.
GL_FIGURES['mitigation'] = _gsvg(
  _gz(58, 72, 'rgba(0,212,212,0.16)')
  + _gc(30, 70, 58, 74, 60) + _gc(50, 58, 38, 34, 60) + _gc(70, 38, 28, 24, 42)
  + _gp('78,26 104,58', _GM, 1.4, true) + _gc(108, 58, 64, 54, 68)
  + _garr(116, 62, 144, 24, _GT, 1.9)
  + _glab(150, 66, 'revisits zone', _GT, 'end', 7)
);

// ── Derivatives ──
// Funding rate: bars around a zero line — crowded longs (gold spike), then a flip.
GL_FIGURES['funding-rate'] = _gsvg(
  _gl(55, _GM, true)
  + _gbar(20, 55, 47, 6, _GT) + _gbar(36, 55, 43, 6, _GT) + _gbar(52, 55, 33, 6, _GT)
  + _gbar(68, 55, 18, 6, _GG)
  + _gbar(84, 55, 65, 6, _GR) + _gbar(100, 55, 71, 6, _GR) + _gbar(116, 55, 61, 6, _GR) + _gbar(132, 55, 50, 6, _GR)
  + _glab(6, 53, '0', _GM, 'start', 7) + _glab(150, 22, 'longs pay', _GT, 'end', 7) + _glab(150, 92, 'shorts pay', _GR, 'end', 7)
);
// Open interest: price rises (teal) while OI (gold area) climbs, then fades = weak.
GL_FIGURES['open-interest'] = _gsvg(
  '<polygon points="10,92 34,84 58,78 82,66 106,74 140,80 140,96 10,96" fill="rgba(231,181,58,0.16)"/>'
  + _gp('10,44 34,34 58,40 82,24 106,30 140,16', _GT, 1.9)
  + _gp('10,92 34,84 58,78 82,66 106,74 140,80', _GG, 1.5)
  + _garr(110, 70, 132, 80, _GR, 1.4)
  + _glab(10, 30, 'price', _GT, 'start', 7) + _glab(10, 90, 'open contracts', _GG, 'start', 7)
);
// Leverage & liquidation: a tight liq line under entry; a small dip wipes the position.
GL_FIGURES['leverage'] = _gsvg(
  _gl(66, _GR, true)
  + _gc(42, 44, 40, 30, 48) + _gc(64, 40, 52, 36, 60) + _gc(86, 52, 60, 50, 68) + _gc(108, 60, 63, 58, 74)
  + _gx(108, 66, _GR, 4.5)
  + '<line x1="20" y1="42" x2="20" y2="66" stroke="#8b85a3" stroke-width="1"/><line x1="17" y1="42" x2="23" y2="42" stroke="#8b85a3" stroke-width="1"/><line x1="17" y1="66" x2="23" y2="66" stroke="#8b85a3" stroke-width="1"/>'
  + _glab(26, 58, 'small move', _GM, 'start', 7)
);
// Long / Short: buy low → up is profit (left); sell high → down is profit (right).
GL_FIGURES['long-short'] = _gsvg(
  '<line x1="78" y1="16" x2="78" y2="92" stroke="#8b85a3" stroke-width="1" stroke-dasharray="3 3" opacity=".5"/>'
  + _gdot(22, 74, _GT, 2.6) + _garr(22, 74, 64, 28, _GT, 1.9) + _glab(20, 90, 'buy ▲', _GT, 'start', 7)
  + _gdot(92, 30, _GR, 2.6) + _garr(92, 30, 136, 76, _GR, 1.9) + _glab(90, 22, 'sell ▼', _GR, 'start', 7)
);
// Order flow & delta: price stalls while buy delta (teal bars) builds, then breaks up.
GL_FIGURES['order-flow'] = _gsvg(
  _gp('10,38 34,36 58,39 82,37 100,38', _GM, 1.6) + _garr(100, 38, 142, 18, _GT, 1.9)
  + _gl(78, _GM, true)
  + _gbar(20, 78, 68, 6, _GT) + _gbar(36, 78, 62, 6, _GT) + _gbar(52, 78, 56, 6, _GT) + _gbar(68, 78, 50, 6, _GT) + _gbar(84, 78, 46, 6, _GT)
  + _glab(8, 92, 'buyers', _GT, 'start', 7)
);
// Squeeze: grind up to a level, then an accelerating cascade of forced buys.
GL_FIGURES['squeeze'] = _gsvg(
  _gl(60, _GM, true)
  + _gc(24, 76, 70, 72, 80) + _gc(42, 70, 62, 58, 74) + _gc(60, 62, 54, 50, 66)
  + _gc(78, 56, 42, 40, 60) + _gc(96, 44, 28, 26, 48) + _gc(114, 30, 18, 15, 34)
  + _garr(120, 24, 144, 12, _GT, 2.2) + _glab(150, 58, 'stops', _GM, 'end', 7)
);
// Bid/ask spread: ask line above, bid below; the gap between them is the spread.
GL_FIGURES['spread'] = _gsvg(
  _gl(44, _GR) + _gl(60, _GT)
  + '<rect x="28" y="39" width="7" height="5" rx="1" fill="' + _GR + '" opacity=".7"/><rect x="44" y="39" width="7" height="5" rx="1" fill="' + _GR + '" opacity=".7"/>'
  + '<rect x="28" y="60" width="7" height="5" rx="1" fill="' + _GT + '" opacity=".7"/><rect x="44" y="60" width="7" height="5" rx="1" fill="' + _GT + '" opacity=".7"/>'
  + '<line x1="120" y1="44" x2="120" y2="60" stroke="#8b85a3" stroke-width="1"/><line x1="116" y1="44" x2="124" y2="44" stroke="#8b85a3" stroke-width="1"/><line x1="116" y1="60" x2="124" y2="60" stroke="#8b85a3" stroke-width="1"/>'
  + _glab(8, 40, 'ask', _GR, 'start', 7) + _glab(8, 72, 'bid', _GT, 'start', 7)
);
// Slippage: a fast move fills worse than the intended (dashed) price.
GL_FIGURES['slippage'] = _gsvg(
  _gl(60, _GM, true)
  + _gc(30, 74, 58, 78, 54) + _gc(52, 58, 40, 62, 36) + _gc(74, 40, 24, 44, 20)
  + _gdot(74, 60, _GT, 2.6) + _gdot(90, 32, _GR, 2.8) + _garr(76, 58, 88, 36, _GR, 1.5)
  + _glab(8, 58, 'intended', _GM, 'start', 7) + _glab(98, 32, 'actual', _GR, 'start', 7)
);
// Order types: a resting limit below, a stop/trigger above, a market fill now.
GL_FIGURES['order-types'] = _gsvg(
  _gp('10,54 40,44 70,58 100,40 130,50', _GT, 1.6)
  + _gl(74, _GT, true) + _gl(28, _GR, true) + _gdot(130, 50, _GG, 2.8)
  + _glab(8, 72, 'limit', _GT, 'start', 7) + _glab(8, 26, 'stop', _GR, 'start', 7) + _glab(96, 44, 'mkt', _GG, 'start', 7)
);
// Basis: perp (gold) trades above spot (teal) — a positive basis (contango).
GL_FIGURES['futures-basis'] = _gsvg(
  _gp('10,64 40,54 70,58 100,42 130,48 148,34', _GT, 1.9)
  + _gp('10,52 40,42 70,46 100,30 130,36 148,22', _GG, 1.9)
  + '<line x1="100" y1="30" x2="100" y2="42" stroke="#8b85a3" stroke-width="1"/>'
  + _glab(8, 72, 'spot', _GT, 'start', 7) + _glab(8, 48, 'perp', _GG, 'start', 7)
);
// Mark price: a smooth index line ignores a manipulative wick (no unfair liq).
GL_FIGURES['mark-price'] = _gsvg(
  _gl(78, _GM, true)
  + _gc(30, 50, 46, 42, 54) + _gc(54, 46, 50, 44, 56) + _gc(76, 46, 50, 42, 88) + _gc(98, 50, 44, 42, 54) + _gc(120, 44, 40, 36, 48)
  + _gp('10,50 32,47 54,49 76,45 98,47 120,43 146,40', _GG, 2.1)
  + _glab(150, 38, 'fair', _GG, 'end', 7)
);
// Maker & taker: resting limit orders (makers) vs a market order crossing (taker).
GL_FIGURES['maker-taker'] = _gsvg(
  _gl(40, _GR) + _gl(64, _GT)
  + '<rect x="30" y="36" width="8" height="7" rx="1.5" fill="' + _GR + '" opacity=".8"/><rect x="46" y="36" width="8" height="7" rx="1.5" fill="' + _GR + '" opacity=".8"/>'
  + '<rect x="30" y="61" width="8" height="7" rx="1.5" fill="' + _GT + '" opacity=".8"/><rect x="46" y="61" width="8" height="7" rx="1.5" fill="' + _GT + '" opacity=".8"/>'
  + _garr(104, 68, 104, 34, _GG, 2.2)
  + _glab(8, 34, 'resting', _GM, 'start', 7) + _glab(96, 30, 'market', _GG, 'start', 7)
);
// Realized vs unrealized: paper P&L moves (dashed) until it's locked in at close (solid).
GL_FIGURES['realized-unrealized'] = _gsvg(
  _gl(60, _GM, true)
  + _gp('10,60 30,48 50,54 70,36 90,44 108,28', _GT, 1.8, true) + _gdot(108, 28, _GT, 3)
  + _gp('108,28 142,28', _GT, 2.2)
  + _glab(18, 74, 'open', _GM, 'start', 7) + _glab(114, 22, 'locked', _GT, 'start', 7)
);

// ── Patterns ──
// Wyckoff accumulation: down into a range, a spring below support, then markup.
GL_FIGURES['wyckoff'] = _gsvg(
  _gl(40, _GM, true) + _gl(74, _GM, true)
  + _gp('8,26 26,58 40,52 56,72', _GT, 1.6) + _gp('56,72 70,44 84,70 98,46 110,82 122,50', _GT, 1.6)
  + _gdot(110, 82, _GG, 2.6) + _garr(122, 50, 146, 18, _GT, 2) + _glab(96, 94, 'spring', _GG, 'start', 7)
);

// ── Risk ──
// Stop loss: a protective exit placed below a swing low; price hits it and exits.
GL_FIGURES['stop-loss'] = _gsvg(
  _gl(74, _GR, true)
  + _gc(40, 50, 40, 34, 54) + _gc(60, 40, 48, 36, 52) + _gc(80, 48, 60, 44, 66) + _gc(100, 60, 70, 58, 80)
  + _gx(100, 74, _GR, 4.5) + _glab(8, 72, 'exit', _GR, 'start', 7)
);
// Take profit: an exit booked at a target (gold) above; price reaches it.
GL_FIGURES['take-profit'] = _gsvg(
  _gl(28, _GG, true)
  + _gc(40, 74, 64, 78, 60) + _gc(60, 64, 52, 60, 68) + _gc(80, 52, 40, 36, 56) + _gc(100, 40, 30, 26, 44) + _gc(120, 30, 26, 23, 34)
  + _gck(120, 28, _GT, 5) + _glab(150, 26, 'target', _GG, 'end', 7)
);
// Risk / reward: a small 1R risk below entry vs a 3R reward above.
GL_FIGURES['risk-reward'] = _gsvg(
  _gzc(44, 62, 64, 14, 'rgba(255,46,136,0.18)') + _gzc(44, 20, 64, 42, 'rgba(0,212,212,0.18)')
  + _gl(62, _GM) + '<line x1="44" y1="20" x2="44" y2="76" stroke="#8b85a3" stroke-width="1" opacity=".5"/>'
  + _glab(112, 72, '1R', _GR, 'start', 8) + _glab(112, 34, '3R', _GT, 'start', 8) + _glab(8, 60, 'entry', _GM, 'start', 7)
);
// Risk management: risk only a small slice of equity, so a loss is survivable.
GL_FIGURES['risk-management'] = _gsvg(
  '<rect x="34" y="22" width="36" height="64" rx="2.5" fill="rgba(0,212,212,0.16)" stroke="' + _GT + '" stroke-width="1.2"/>'
  + '<rect x="34" y="79" width="36" height="7" rx="1.5" fill="' + _GR + '"/>'
  + _glab(52, 17, 'equity', _GT, 'middle', 7) + _glab(78, 84, 'risk 1%', _GR, 'start', 7)
);
// Confluence: a level, a trendline and a fib line all crossing at one price point.
GL_FIGURES['confluence'] = _gsvg(
  _gl(56, _GT, true)
  + '<line x1="12" y1="86" x2="150" y2="36" stroke="' + _GG + '" stroke-width="1.7" stroke-dasharray="5 3"/>'
  + '<line x1="40" y1="34" x2="150" y2="76" stroke="#8b85a3" stroke-width="1.4" stroke-dasharray="3 3"/>'
  + '<circle cx="98" cy="56" r="11" fill="rgba(231,181,58,0.14)" stroke="' + _GG + '" stroke-width="1.4"/>' + _gdot(98, 56, _GG, 3.4)
  + _glab(98, 84, 'signals align', _GG, 'middle', 7)
);
// Backtesting: an equity curve (with dips) built from historical trades.
GL_FIGURES['backtesting'] = _gsvg(
  '<polygon points="10,86 30,70 48,76 68,54 86,62 104,40 122,48 140,26 140,92 10,92" fill="rgba(0,212,212,0.12)"/>'
  + _gp('10,86 30,70 48,76 68,54 86,62 104,40 122,48 140,26', _GT, 1.9) + _glab(8, 20, 'equity', _GT, 'start', 7)
);
// Sentiment: a fear/greed gauge with the needle pegged at an extreme.
GL_FIGURES['sentiment'] = _gsvg(
  '<path d="M 28 84 A 50 50 0 0 1 128 84" fill="none" stroke="' + _GT + '" stroke-width="4" stroke-linecap="round"/>'
  + '<path d="M 78 34 A 50 50 0 0 1 128 84" fill="none" stroke="' + _GR + '" stroke-width="4" stroke-linecap="round"/>'
  + '<line x1="78" y1="84" x2="114" y2="52" stroke="' + _GG + '" stroke-width="2.2" stroke-linecap="round"/>' + _gdot(78, 84, _GG, 3)
  + _glab(22, 98, 'fear', _GT, 'start', 7) + _glab(134, 98, 'greed', _GR, 'end', 7)
);
// Invalidation: price closes decisively below the support your thesis relied on.
GL_FIGURES['invalidation'] = _gsvg(
  _gl(58, _GT, true)
  + _gc(30, 72, 60, 76, 56) + _gc(50, 60, 52, 48, 64) + _gc(70, 52, 54, 50, 58) + _gc(92, 54, 76, 52, 80) + _gc(112, 74, 84, 70, 88)
  + _gx(92, 66, _GR, 4) + _glab(8, 54, 'level', _GT, 'start', 7)
);
// Drawdown: the peak-to-trough drop in account equity (highlighted).
GL_FIGURES['drawdown'] = _gsvg(
  _gzc(66, 26, 30, 42, 'rgba(255,46,136,0.16)')
  + _gp('10,70 30,54 48,42 66,26 82,54 96,68 108,58 128,40 146,24', _GT, 1.9)
  + '<line x1="66" y1="26" x2="66" y2="68" stroke="#8b85a3" stroke-width="1" stroke-dasharray="2 2"/><line x1="96" y1="26" x2="96" y2="68" stroke="#8b85a3" stroke-width="1" stroke-dasharray="2 2"/>'
  + _garr(81, 32, 81, 62, _GR, 1.6) + _glab(60, 20, 'peak', _GM, 'start', 7) + _glab(96, 78, 'trough', _GM, 'middle', 7)
);
// LTE framework: (1) a level, (2) a trigger candle at it, (3) the entry + move.
GL_FIGURES['lte'] = _gsvg(
  _gl(58, _GT, true) + _gzc(75, 40, 14, 22, 'rgba(231,181,58,0.16)')
  + _gc(46, 44, 40, 36, 48) + _gc(64, 42, 50, 38, 54) + _gc(82, 54, 44, 58, 40)
  + _gdot(100, 50, _GT, 3) + _garr(100, 50, 140, 20, _GT, 1.9)
  + _glab(30, 54, '1', _GT, 'middle', 9) + _glab(82, 72, '2', _GG, 'middle', 9) + _glab(106, 58, '3', _GT, 'middle', 9)
);
// Set and forget: entry, stop and target set up front; price runs to target untouched.
GL_FIGURES['set-and-forget'] = _gsvg(
  _gl(30, _GG, true) + _gl(80, _GR, true) + _gdot(24, 60, _GT, 3)
  + _gp('24,60 44,52 60,64 80,44 100,50 120,34 140,30', _GT, 1.9) + _gck(140, 28, _GT, 5)
  + _glab(150, 28, 'target', _GG, 'end', 7) + _glab(150, 78, 'stop', _GR, 'end', 7) + _glab(8, 58, 'entry', _GM, 'start', 7)
);

// ── Basics ──
// Bullish: rising candles + an up arrow (expecting price higher).
GL_FIGURES['bullish'] = _gsvg(
  _gc(28, 80, 66, 84, 62) + _gc(52, 66, 50, 46, 70) + _gc(76, 52, 36, 32, 56) + _gc(100, 38, 24, 20, 42)
  + _garr(112, 30, 142, 14, _GT, 2.2)
);
// Bearish: falling candles + a down arrow (expecting price lower).
GL_FIGURES['bearish'] = _gsvg(
  _gc(28, 24, 38, 20, 42) + _gc(52, 38, 54, 34, 60) + _gc(76, 52, 68, 48, 74) + _gc(100, 66, 80, 62, 86)
  + _garr(112, 74, 142, 90, _GR, 2.2)
);
// Long: buy low, price rises, the gain accrues upward.
GL_FIGURES['long'] = _gsvg(
  _gl(74, _GM, true) + _gdot(24, 74, _GT, 3)
  + '<polygon points="24,74 52,60 76,66 100,42 124,48 144,28 144,74" fill="rgba(0,212,212,0.12)"/>'
  + _gp('24,74 52,60 76,66 100,42 124,48 144,28', _GT, 1.9)
  + _glab(8, 72, 'buy', _GT, 'start', 7) + _glab(118, 20, '▲ gain', _GT, 'start', 7)
);
// Short: sell high, price falls, the gain accrues downward.
GL_FIGURES['short'] = _gsvg(
  _gl(30, _GM, true) + _gdot(24, 30, _GR, 3)
  + '<polygon points="24,30 52,44 76,38 100,62 124,56 144,76 144,30" fill="rgba(255,46,136,0.12)"/>'
  + _gp('24,30 52,44 76,38 100,62 124,56 144,76', _GR, 1.9)
  + _glab(8, 28, 'sell', _GR, 'start', 7) + _glab(114, 92, '▼ gain', _GR, 'start', 7)
);
// Timeframe: the same move shown as one big candle vs many small ones.
GL_FIGURES['timeframe'] = _gsvg(
  _gc(30, 80, 30, 22, 88) + _glab(30, 100, '1D', _GM, 'middle', 7)
  + '<line x1="58" y1="14" x2="58" y2="92" stroke="#8b85a3" stroke-width="1" stroke-dasharray="3 3" opacity=".4"/>'
  + _gc(74, 80, 70, 74, 84) + _gc(86, 70, 60, 56, 74) + _gc(98, 60, 52, 48, 64) + _gc(110, 52, 40, 36, 56) + _gc(122, 40, 34, 30, 44) + _gc(134, 34, 24, 20, 38)
  + _glab(104, 100, '1h', _GM, 'middle', 7)
);
// Higher timeframe: the big candle sets the bias; small candles are the detail inside.
GL_FIGURES['htf'] = _gsvg(
  _gc(48, 82, 30, 22, 88) + _glab(48, 100, '1D', _GM, 'middle', 7)
  + _garr(70, 34, 70, 22, _GT, 1.6) + _glab(66, 18, 'bias', _GT, 'start', 7)
  + _gc(96, 78, 70, 74, 82) + _gc(108, 70, 58, 54, 74) + _gc(120, 58, 44, 40, 62) + _gc(132, 44, 32, 28, 48)
  + _glab(114, 100, 'detail', _GM, 'middle', 7)
);
// Lower timeframe: zoom in on the small candles to fine-tune an entry at a level.
GL_FIGURES['ltf'] = _gsvg(
  _gl(56, _GT, true)
  + _gc(24, 74, 66, 78, 62) + _gc(40, 66, 60, 56, 70) + _gc(56, 60, 54, 50, 66) + _gc(72, 58, 52, 50, 44)
  + _gc(88, 52, 44, 40, 56) + _gc(104, 44, 36, 32, 48) + _gc(120, 36, 28, 24, 40)
  + _gdot(72, 54, _GG, 2.8) + _glab(60, 96, 'entry', _GG, 'middle', 7)
);
// Spot vs perp: two prices tracking closely, tethered by funding.
GL_FIGURES['spot-perp'] = _gsvg(
  _gp('10,60 34,50 58,56 82,38 106,44 140,28', _GT, 2) + _gp('10,54 34,44 58,50 82,32 106,38 140,22', _GG, 2)
  + '<g stroke="#8b85a3" stroke-width="1" stroke-dasharray="2 2" opacity=".55"><line x1="34" y1="50" x2="34" y2="44"/><line x1="82" y1="38" x2="82" y2="32"/><line x1="106" y1="44" x2="106" y2="38"/></g>'
  + _glab(8, 68, 'spot', _GT, 'start', 7) + _glab(8, 20, 'perp', _GG, 'start', 7)
);
// Trading styles: hold time grows from scalp (minutes) to position (months).
GL_FIGURES['trading-styles'] = _gsvg(
  '<rect x="20" y="22" width="24" height="9" rx="2" fill="' + _GT + '"/>' + _glab(48, 30, 'min', _GM, 'start', 7)
  + '<rect x="20" y="40" width="48" height="9" rx="2" fill="' + _GT + '"/>' + _glab(72, 48, 'day', _GM, 'start', 7)
  + '<rect x="20" y="58" width="86" height="9" rx="2" fill="' + _GG + '"/>' + _glab(110, 66, 'wk', _GM, 'start', 7)
  + '<rect x="20" y="76" width="120" height="9" rx="2" fill="' + _GG + '"/>' + _glab(144, 84, 'mo', _GM, 'end', 7)
);
// NOTE: CEX / DEX / Crypto Wallet / Cold Storage intentionally have NO figure —
// they're infrastructure concepts, not chart visuals, so they render text-only.

// ── Indicators ──
// Overbought / oversold: the oscillator pushes into the shaded 70 / 30 extremes.
GL_FIGURES['overbought-oversold'] = _gsvg(
  _gz(18, 30, 'rgba(255,46,136,0.14)') + _gz(74, 86, 'rgba(0,212,212,0.14)')
  + _gl(30, _GR, true) + _gl(74, _GT, true)
  + _gp('8,52 26,26 46,58 68,80 90,44 112,24 134,60 148,50', 'currentColor', 1.7)
  + _glab(150, 26, '70', _GR, 'end', 7) + _glab(150, 84, '30', _GT, 'end', 7)
);
// Volatility (ATR): calm, tight candles vs a volatile, wide-range stretch.
GL_FIGURES['volatility'] = _gsvg(
  _gzc(14, 46, 58, 14, 'rgba(0,212,212,0.06)')
  + _gc(22, 56, 50, 48, 58) + _gc(34, 52, 55, 50, 58) + _gc(46, 55, 50, 49, 57) + _gc(58, 50, 55, 48, 58)
  + '<polygon points="78,52 150,26 150,80 78,56" fill="rgba(255,46,136,0.07)"/>'
  + _gc(90, 60, 40, 34, 66) + _gc(106, 42, 64, 36, 72) + _gc(122, 62, 34, 28, 70) + _gc(138, 36, 60, 30, 68)
  + _glab(40, 96, 'tight', _GT, 'middle', 7) + _glab(114, 96, 'wide', _GR, 'middle', 7)
);

/* ── Upgrades to existing figures ── */
// Trendline: an actual drawn diagonal touching the rising swing lows (dots).
GL_FIGURES['trendline'] = _gsvg(
  _gp('10,78 46,66 70,40 86,50 112,30 130,34 146,20', _GT, 1.7)
  + '<line x1="8" y1="80.5" x2="148" y2="27" stroke="' + _GG + '" stroke-width="1.6"/>'
  + _gdot(46, 66, _GG, 2.4) + _gdot(86, 50, _GG, 2.4) + _gdot(130, 34, _GG, 2.4)
  + _glab(150, 96, 'connects the lows', _GG, 'end', 7)
);
// Oscillator: a bounded momentum wave around a midline (no RSI-specific 70/30).
GL_FIGURES['oscillator'] = _gsvg(
  _gl(24, _GM, true) + _gl(80, _GM, true) + _gl(52, _GM)
  + _gp('8,42 26,66 46,34 66,70 88,30 110,66 132,38 148,58', 'currentColor', 1.7)
);
// FVG: the untraded imbalance (band) left between candle 1's high and candle 3's low.
GL_FIGURES['fvg'] = _gsvg(
  _gzc(30, 48, 96, 12, 'rgba(0,212,212,0.16)')
  + '<line x1="30" y1="48" x2="126" y2="48" stroke="' + _GT + '" stroke-width="0.8" stroke-dasharray="3 2" opacity=".7"/><line x1="30" y1="60" x2="126" y2="60" stroke="' + _GT + '" stroke-width="0.8" stroke-dasharray="3 2" opacity=".7"/>'
  + _gc(44, 80, 66, 84, 60) + _gc(74, 64, 30, 68, 26) + _gc(104, 44, 32, 48, 28)
  + _glab(78, 100, 'unfilled gap', _GT, 'middle', 7)
);
// Wick: the upper/lower shadows above and below the body mark the high and low.
GL_FIGURES['wick'] = _gsvg(
  _gc(84, 54, 64, 20, 90)
  + '<line x1="96" y1="20" x2="96" y2="54" stroke="#8b85a3" stroke-width="1" stroke-dasharray="2 2"/><line x1="96" y1="64" x2="96" y2="90" stroke="#8b85a3" stroke-width="1" stroke-dasharray="2 2"/>'
  + _glab(101, 40, 'upper', _GM, 'start', 7) + _glab(101, 80, 'lower', _GM, 'start', 7)
);

function _glFigure(id) { return GL_FIGURES[id] || ''; }

/* ── Figure pop-out (lightbox) ───────────────────────────────────────────── */
const _GL_ZOOM_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
const _GL_X_ICON    = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

function _glEnsureLightbox() {
  let lb = document.getElementById('gl-lightbox');
  if (lb) return lb;
  lb = document.createElement('div');
  lb.id = 'gl-lightbox';
  lb.className = 'gl-lightbox';
  lb.innerHTML = `
    <div class="gl-lightbox-box" role="dialog" aria-modal="true" aria-label="Diagram detail">
      <button type="button" class="gl-lightbox-close" aria-label="Close diagram">${_GL_X_ICON}</button>
      <div class="gl-lightbox-head"><span class="gl-lightbox-term" id="gl-lb-term"></span><span class="gl-cat" id="gl-lb-cat"></span></div>
      <div class="gl-lightbox-fig" id="gl-lb-fig"></div>
      <div class="gl-lightbox-def" id="gl-lb-def"></div>
      <div class="gl-lightbox-hint">Press Esc or click outside to close</div>
    </div>`;
  lb.addEventListener('click', (e) => { if (e.target === lb) glCloseZoom(); });
  lb.querySelector('.gl-lightbox-close').addEventListener('click', glCloseZoom);
  document.body.appendChild(lb);
  return lb;
}

function glZoom(id) {
  const fig = _glFigure(id);
  if (!fig) return;
  const e = (typeof LT_GLOSSARY !== 'undefined') ? LT_GLOSSARY.find((x) => x.id === id) : null;
  const lb = _glEnsureLightbox();
  lb.querySelector('#gl-lb-term').textContent = e ? e.term : '';
  lb.querySelector('#gl-lb-cat').textContent  = e ? e.cat : '';
  lb.querySelector('#gl-lb-fig').innerHTML     = fig;
  lb.querySelector('#gl-lb-def').innerHTML      = e ? e.def : '';
  lb.classList.add('open');
}

function glCloseZoom() {
  const lb = document.getElementById('gl-lightbox');
  if (lb) lb.classList.remove('open');
}

if (typeof window !== 'undefined' && !window._glZoomKeyBound) {
  window._glZoomKeyBound = true;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const lb = document.getElementById('gl-lightbox');
      if (lb && lb.classList.contains('open')) glCloseZoom();
    }
  });
}
window.glZoom = glZoom;
window.glCloseZoom = glCloseZoom;

function _glRefRowHtml(ref, entry) {
  const locked = glRefLocked(ref);
  const accent = GL_COURSE_ACCENT[ref.courseNum] || '#00d4d4';
  const icon = locked
    ? '<i data-lucide="lock" style="width:15px;height:15px;color:#cc2222;"></i>'
    : '<i data-lucide="circle-check" style="width:15px;height:15px;color:#00c878;"></i>';
  return `<div class="gl-ref${locked ? ' locked' : ''}" onclick="_glRef(${ref.courseNum},${ref.chapterIdx},${locked},'${entry ? entry.id : ''}')">
      <span class="gl-ref-accent" style="background:${accent}"></span>
      <div class="gl-ref-body">
        <div class="gl-ref-title">${ref.title}</div>
        <div class="gl-ref-meta">${GL_COURSE_LABEL[ref.courseNum]} · ${ref.tag}</div>
      </div>
      <span class="gl-ref-icon">${icon}</span>
    </div>`;
}

function _glCardHtml(entry) {
  const refs = glFindReferences(entry);
  const open = !!_glExpanded[entry.id];
  let refsBlock;
  if (!refs.length) {
    refsBlock = `<div class="gl-ref-none">Not yet referenced in the course material.</div>`;
  } else {
    refsBlock = `
      <button class="gl-refs-toggle${open ? ' open' : ''}" onclick="_glToggleRefs('${entry.id}')" aria-expanded="${open}">
        <i data-lucide="chevron-right" class="gl-refs-chevron" style="width:15px;height:15px;"></i>
        <span>${open ? 'Hide' : 'Show'} ${refs.length} module reference${refs.length === 1 ? '' : 's'}</span>
      </button>
      <div class="gl-refs${open ? ' open' : ''}" id="gl-refs-${entry.id}">${refs.map(function(r){ return _glRefRowHtml(r, entry); }).join('')}</div>`;
  }
  const fig = _glFigure(entry.id);
  const defHtml = _glLinkify(entry.def, entry.id);
  const defBlock = fig
    ? `<div class="gl-def-row"><div class="gl-def">${defHtml}</div><button type="button" class="gl-figure" onclick="glZoom('${entry.id}')" title="Click to enlarge" aria-label="Enlarge diagram"><span class="gl-fig-frame">${fig}<span class="gl-fig-zoom">${_GL_ZOOM_ICON}</span></span></button></div>`
    : `<div class="gl-def">${defHtml}</div>`;
  return `<div class="gl-card" id="gl-card-${entry.id}">
      <div class="gl-card-top">
        <span class="gl-term">${entry.term}</span>
        <span class="gl-cat">${entry.cat}</span>
      </div>
      ${defBlock}
      ${refsBlock}
    </div>`;
}

function _glListHtml() {
  let entries = LT_GLOSSARY.slice();
  const q = _glFilter.trim().toLowerCase();
  if (q) {
    const matched = ltGlossarySearch(q);
    entries = matched.length ? matched : [];
  } else {
    entries.sort((a, b) => a.term.localeCompare(b.term));
  }
  if (_glCategory && _glCategory !== 'All') {
    entries = entries.filter(e => e.cat === _glCategory);
  }
  if (!entries.length) {
    const safe = String(_glFilter).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
    const where = (_glCategory && _glCategory !== 'All') ? ` in ${_glCategory}` : '';
    return `<div class="gl-empty">${q ? `No terms match “${safe}”${where}.` : `No terms${where}.`}</div>`;
  }
  return entries.map(_glCardHtml).join('');
}

/* Category filter chips (with per-category counts). */
function _glCatsHtml() {
  // Count against the active search results (not the full glossary) so the chip badges
  // never overstate what clicking a category will actually show. With no query active
  // this is the full set. Categories with no matches under the query are omitted.
  const q = _glFilter.trim().toLowerCase();
  const base = q ? ltGlossarySearch(q) : LT_GLOSSARY;
  const counts = {};
  base.forEach(e => { counts[e.cat] = (counts[e.cat] || 0) + 1; });
  const pill = (cat, label, n) =>
    `<button class="gl-cat-pill${_glCategory === cat ? ' active' : ''}" data-cat="${cat}" onclick="_glSetCategory('${cat}')">${label}<span class="gl-cat-pill-n">${n}</span></button>`;
  let html = pill('All', 'All', base.length);
  GL_CATS.forEach(c => { if (counts[c]) html += pill(c, c, counts[c]); });
  return html;
}

function renderGlossary(containerId, focusId) {
  _glStyles();
  const container = document.getElementById(containerId);
  if (!container) return;
  _glContainerId = containerId;
  if (typeof focusId === 'string') { _glFocus = focusId; _glExpanded[focusId] = true; }

  const bypass = _glUnlockAll();
  container.innerHTML = `
    <div class="gl-wrap">
      <div class="gl-head">
        <button class="gl-back-btn" onclick="typeof init==='function'&&init(false)">
          <i data-lucide="arrow-left" style="width:15px;height:15px;"></i> Back to Course
        </button>
        <div class="gl-heading">
          <div class="gl-title">Glossary &amp; Definitions</div>
          <div class="gl-sub">${LT_GLOSSARY.length} terms across all four courses · search, or filter by category</div>
        </div>

        <div class="gl-toolbar">
          <div class="gl-search-box">
            <i data-lucide="search" style="width:16px;height:16px;"></i>
            <input id="gl-page-search" type="text" placeholder="Search terms…" value="${_glFilter.replace(/"/g,'&quot;')}" oninput="_glFilterPage(this.value)" autocomplete="off" />
          </div>
          <button class="gl-filter-btn${_glFiltersOpen ? ' open' : ''}${_glCategory !== 'All' ? ' has-filter' : ''}" id="gl-filter-btn" onclick="_glToggleFilters()" aria-expanded="${_glFiltersOpen}">
            <i data-lucide="sliders-horizontal" style="width:15px;height:15px;"></i>
            <span id="gl-filter-label">${_glCategory !== 'All' ? _glCategory : 'Filter'}</span>
            <i data-lucide="chevron-down" class="gl-filter-chev" style="width:14px;height:14px;"></i>
          </button>
          <label class="gl-bypass${bypass ? ' on' : ''}" id="gl-bypass-label" title="Preview/dev: unlock every linked module">
            <input type="checkbox" id="gl-bypass-cb" ${bypass ? 'checked' : ''} onchange="_glToggleBypass(this)" />
            Unlock all
          </label>
        </div>

        <div class="gl-cats${_glFiltersOpen ? '' : ' hidden'}" id="gl-cats">${_glCatsHtml()}</div>
      </div>

      <div id="gl-list">${_glListHtml()}</div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // focus / scroll to a specific term (deferred a frame so icon layout has settled)
  if (_glFocus) {
    const id = _glFocus; _glFocus = null;
    requestAnimationFrame(() => {
      const card = document.getElementById('gl-card-' + id);
      const scroller = container.closest('.content-area') || container;
      if (!card) return;
      const cr = card.getBoundingClientRect();
      const sr = scroller.getBoundingClientRect();
      scroller.scrollTop += (cr.top - sr.top) - 14;
      card.classList.add('gl-flash');
      setTimeout(() => card.classList.remove('gl-flash'), 1500);
    });
  }
}

/* ── PAGE INTERACTIONS ────────────────────────────────────────────────────── */
window._glFilterPage = function(v) {
  _glFilter = v;
  const list = document.getElementById('gl-list');
  if (list) { list.innerHTML = _glListHtml(); if (typeof lucide !== 'undefined') lucide.createIcons(); }
  // Keep the category-chip counts in sync with the live search results.
  const cats = document.getElementById('gl-cats');
  if (cats) cats.innerHTML = _glCatsHtml();
};

window._glSetCategory = function(cat) {
  _glCategory = cat;
  document.querySelectorAll('.gl-cat-pill').forEach(p => p.classList.toggle('active', p.getAttribute('data-cat') === cat));
  // Reflect the active category on the Filter button (stays visible when chips are collapsed)
  const lbl = document.getElementById('gl-filter-label');
  if (lbl) lbl.textContent = cat !== 'All' ? cat : 'Filter';
  const fbtn = document.getElementById('gl-filter-btn');
  if (fbtn) fbtn.classList.toggle('has-filter', cat !== 'All');
  const list = document.getElementById('gl-list');
  if (list) { list.innerHTML = _glListHtml(); if (typeof lucide !== 'undefined') lucide.createIcons(); }
};

// Show/hide the category-chip row (hidden by default).
window._glToggleFilters = function() {
  _glFiltersOpen = !_glFiltersOpen;
  const cats = document.getElementById('gl-cats');
  if (cats) cats.classList.toggle('hidden', !_glFiltersOpen);
  const btn = document.getElementById('gl-filter-btn');
  if (btn) { btn.classList.toggle('open', _glFiltersOpen); btn.setAttribute('aria-expanded', String(_glFiltersOpen)); }
};

// Cross-link jump from inside a definition — clear filters and focus the target card.
window._glJump = function(id) {
  _glFilter = '';
  _glCategory = 'All';
  renderGlossary(_glContainerId, id);
};

window._glToggleRefs = function(id) {
  const wrap = document.getElementById('gl-refs-' + id);
  const btn  = document.querySelector('#gl-card-' + id + ' .gl-refs-toggle');
  if (!wrap) return;
  const open = wrap.classList.toggle('open');
  _glExpanded[id] = open;
  if (btn) {
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    const label = btn.querySelector('span');
    if (label) label.textContent = label.textContent.replace(/^(Show|Hide)/, open ? 'Hide' : 'Show');
  }
};

window._glToggleBypass = function(cb) {
  if (typeof ltSetUnlockAll === 'function') ltSetUnlockAll(cb.checked);
  const lbl = document.getElementById('gl-bypass-label');
  if (lbl) lbl.classList.toggle('on', cb.checked);
  const list = document.getElementById('gl-list');
  if (list) { list.innerHTML = _glListHtml(); if (typeof lucide !== 'undefined') lucide.createIcons(); }
  if (typeof showToast === 'function') showToast(cb.checked ? 'All modules unlocked.' : 'Lock state restored to your progress.', 3000, cb.checked ? 'unlock' : 'lock');
};

window._glRef = function(courseNum, chIdx, locked, entryId) {
  if (locked && !_glUnlockAll()) {
    if (typeof showToast === 'function') showToast('Locked — complete this chapter, or toggle “Unlock all modules”.', 3000, 'lock');
    return;
  }
  // Remember which term to flash once we land — this is what makes the highlight fire
  // ONLY when the jump was launched from a glossary reference.
  if (entryId) {
    var e = LT_GLOSSARY.find(function(g){ return g.id === entryId; });
    if (e) window._ltGlossaryHighlight = { terms: [e.term].concat(e.aliases || []), ts: Date.now() };
  }
  if (typeof ltOpenChapter === 'function') ltOpenChapter(courseNum, chIdx);
};

/* ── HEADER SEARCH (dropdown) ─────────────────────────────────────────────── */
let _glSearchInit = false;
function ltInitSearch() {
  if (_glSearchInit) return;
  const input = document.getElementById('lt-search-input');
  const results = document.getElementById('lt-search-results');
  if (!input || !results) return;
  _glSearchInit = true;

  let activeIdx = -1;
  let current = [];

  const close = () => { results.classList.add('hidden'); results.innerHTML = ''; activeIdx = -1; };

  const renderResults = (list) => {
    current = list;
    if (!list.length) {
      results.innerHTML = `<div class="lt-search-empty">No matches. Try “Ichimoku”, “Liquidity”, “RSI”…</div>`;
      results.classList.remove('hidden');
      return;
    }
    results.innerHTML = list.slice(0, 8).map((e, i) => `
      <div class="lt-search-item${i === activeIdx ? ' active' : ''}" data-id="${e.id}" onmousedown="event.preventDefault();showGlossary('${e.id}');document.getElementById('lt-search-input').value='';document.getElementById('lt-search-results').classList.add('hidden');">
        <div class="lt-search-item-term">${e.term}</div>
        <div class="lt-search-item-cat">${e.cat}</div>
        <div class="lt-search-item-def">${e.def}</div>
      </div>`).join('');
    results.classList.remove('hidden');
  };

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q) { close(); return; }
    activeIdx = -1;
    renderResults(ltGlossarySearch(q));
  });

  input.addEventListener('keydown', (e) => {
    const items = current.slice(0, 8);
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(items.length - 1, activeIdx + 1); renderResults(current); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(0, activeIdx - 1); renderResults(current); }
    else if (e.key === 'Enter') {
      const pick = items[activeIdx >= 0 ? activeIdx : 0];
      if (pick) { showGlossary(pick.id); input.value = ''; close(); }
    } else if (e.key === 'Escape') { close(); input.blur(); }
  });

  input.addEventListener('focus', () => { if (input.value.trim()) renderResults(ltGlossarySearch(input.value.trim())); });
  document.addEventListener('click', (e) => { if (!results.contains(e.target) && e.target !== input) close(); });
}

/* ── EXPORTS ──────────────────────────────────────────────────────────────── */
window.LT_GLOSSARY = LT_GLOSSARY;
window.renderGlossary = renderGlossary;
window.ltGlossarySearch = ltGlossarySearch;
window.glFindReferences = glFindReferences;
window.ltInitSearch = ltInitSearch;

document.addEventListener('DOMContentLoaded', () => { try { ltInitSearch(); } catch(_) {} });
