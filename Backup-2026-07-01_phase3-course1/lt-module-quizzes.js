'use strict';

/* ════════════════════════════════════════════════════════════════════════════
   MODULE QUIZZES — multi-question "Learning Assessment" per module
   ----------------------------------------------------------------------------
   Source: "TotT Curriculum Layout" (the official Tales of a Trader curriculum).
   One assessment per MODULE (each module spans several sessions/chapters). The
   engine surfaces this as the 4th step — "Quiz" — on the LAST session of each
   module (see moduleQuizFor / isModuleFinalChapter in lt-engine.js). The current
   per-chapter chart quiz is the "Scenario" step; this is separate.

   Keyed by course number → the chapter's `module` STRING → the assessment.

   Question schema:
     { type:'tf',    q:'…', answer:true|false }
     { type:'mc',    q:'…', options:[…], answer:<index of the correct option> }
     { type:'multi', q:'…', options:[…], answer:[<indices of every correct option>] }

   Answers: True/False come verbatim from the curriculum. Multiple-choice /
   select-all answers are the trading-correct choices (the source PDF's letter
   markings were lost in extraction), matching the curriculum's own teaching
   (e.g. depletion factor → levels weaken with tests; leverage ≠ risk, size does).
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  const TF    = (q, answer)          => ({ type: 'tf',    q, answer });
  const MC    = (q, options, answer) => ({ type: 'mc',    q, options, answer });
  const MULTI = (q, options, answer) => ({ type: 'multi', q, options, answer });

  window.LT_MODULE_QUIZZES = {

    /* ══════════════ COURSE 1 — Laying the Foundation ══════════════ */
    1: {
      'Price Action Foundations': {
        title: 'Module 1 — Supply & Demand',
        questions: [
          MC('What is the area inside the open & close of a candle called?', ['Line', 'Wick', 'Stick', 'Body'], 3),
          MC('What is the area outside the open & close of a candle called?', ['Line', 'Wick', 'Stick', 'Body'], 1),
          TF('A long lower wick = buyer exhaustion', false),
          TF('A small-bodied candle or doji indicates indecision', true),
          TF('Demand = Sellers', false),
          MC('How is supply depicted on a candlestick chart?', ['Support', 'Resistance'], 1),
          MC('How is demand depicted on a candlestick chart?', ['Support', 'Resistance'], 0),
          MC('In trading, we want to be a ___ at support and a ___ at resistance', ['Seller, Buyer', 'Observer, Seller', 'Buyer, Seller', 'Buyer, Observer'], 2),
          MC('How many touches create a valid trendline?', ['2', '3', '4', '1'], 0),
          TF('Trendlines need to be drawn from candle body to candle body in order to be correct', false),
          TF('Horizontal levels define rangebound markets', true),
          TF('Horizontal S/R does not have to be at a fixed price — it can form zones', true),
          MC('The more a level is tested, the ___ it becomes.', ['Stronger', 'Weaker', 'Bigger', 'Smaller'], 1)
        ]
      },
      'Identifying Trends': {
        title: 'Module 2 — Identifying the Trend',
        questions: [
          MC('Downtrends are defined by ___ and ___', ['Higher lows, higher highs', 'Lower lows, higher highs', 'Lower lows, lower highs', 'Higher lows, lower highs'], 2),
          MC('Uptrends are defined by ___ and ___', ['Higher lows, higher highs', 'Lower lows, higher highs', 'Lower lows, lower highs', 'Higher lows, lower highs'], 0),
          TF('Bear trends are the same as uptrends', false),
          TF('Exhaustion is where buyers or sellers lose control', true),
          TF('There can’t be multiple trends within a larger trend', false),
          MULTI('Select all of the following that apply to the range high', ['Buyers', 'Sellers', 'Supply', 'Resistance'], [1, 2, 3]),
          MULTI('Select all of the following that apply to the range low', ['Buyers', 'Sellers', 'Demand', 'Support'], [0, 2, 3]),
          TF('Ranging markets are defined by diagonal trendlines', false),
          MC('What do we call price action that deviates above or below the range before returning inside of it?', ['Breakout', 'Breakdown', 'Confirmation', 'Fakeout'], 3),
          TF('Support or resistance at the range low or high (respectively) is finite', true),
          TF('You can have a ranging market within a larger uptrend', true),
          TF('You can’t have a downtrend within a ranging market', false)
        ]
      },
      'Market Structure': {
        title: 'Module 3 — Market Structure Analysis',
        questions: [
          MULTI('Swing points help define ___ (select all that apply)', ['Uptrends', 'Downtrends', 'Ranges', 'Market Structure'], [0, 1, 2, 3]),
          TF('A swing high is a high that is greater than all other highs positioned around it', true),
          TF('A swing low is a low that is lower than all other lows positioned around it', true),
          TF('Bearish market structure is defined by higher lows & higher highs', false),
          TF('Bullish market structure is defined by lower lows & lower highs', false),
          MC('In a perfect uptrend, higher lows respect previous ___', ['Higher lows', 'Higher highs', 'Lower lows', 'Lower highs'], 1),
          MC('In a perfect downtrend, lower highs respect previous ___', ['Higher lows', 'Higher highs', 'Lower lows', 'Lower highs'], 2),
          TF('Consolidation or range-bound markets are considered trending', false),
          MULTI('When price breaks up out of consolidation it is considered ___ (select all that apply)', ['Contraction', 'Bearish', 'Expansion', 'Bullish'], [2, 3]),
          MULTI('When price breaks down out of consolidation it is considered ___ (select all that apply)', ['Contraction', 'Bearish', 'Expansion', 'Bullish'], [1, 2]),
          TF('Market structure analysis is only relevant on the timeframe being analyzed', true)
        ]
      },
      'Time Frame Analysis': {
        title: 'Module 4 — Time Frame Analysis',
        questions: [
          MULTI('Which of the following are considered macro time frames (select all that apply)', ['Hours', 'Days', 'Weeks', 'Minutes'], [1, 2]),
          MULTI('Which of the following are considered micro time frames (select all that apply)', ['Hours', 'Days', 'Weeks', 'Minutes'], [0, 3]),
          TF('Low time frame provides stronger levels than high time frame', false),
          TF('Resistance on the daily time frame is more relevant than support on the hourly time frame', true),
          TF('Time frame analysis is always contextual', true),
          TF('When planning trades, it’s best to work from low time frame up to high time frame (bottom-up)', false),
          MC('The best time frame to use when trading is ___', ['1 Hour', '4 Hour', '15 Minute', 'None of the above'], 3)
        ]
      },
      'Risk Management': {
        title: 'Module 5 — Risk Management',
        questions: [
          TF('Risk management helps you keep the money you earn.', true),
          TF('Profitability comes before the preservation of capital', false),
          MC('What is the formula for sizing positions appropriately?', ['(Risk% × Stop/Loss) / Total Portfolio', '(Total Portfolio × Stop/Loss) / Risk%', '(Total Portfolio × Risk%) / Stop/Loss', 'None of the above'], 2),
          MC('As a general rule of thumb, what should our average risk per trade be equal to?', ['Under 1%', '1–5%', '5–10%', 'Over 10%'], 1),
          TF('You should define your risk before taking a trade', true),
          TF('Risk is defined as the maximum amount of $ you are expected to earn if a trade goes for you', false),
          TF('Your R-multiple is the expected (planned) risk-to-reward while the RRR is the actual outcome of a trade', false),
          TF('Trading without risk management is essentially gambling', true),
          TF('Position sizing is the sole determinant of a trader’s PnL (profit and loss)', false),
          MULTI('Which of these trades are considered profitable (select all that apply)', ['High win rate % & low R', 'Low win rate % & high R', 'Low win rate % & low R', 'High win rate % & high R'], [0, 1, 3]),
          TF('Profitability is a direct function of win rate & R', true),
          MC('Given the profitability formula (Required Win Rate = 1 / (1 + R-multiple)), a trader with an average R-multiple of 0.5 will need a win rate of at least ___ to be profitable', ['25%', '33%', '50%', '67%'], 3),
          MC('Given the profitability formula (Required Win Rate = 1 / (1 + R-multiple)), a trader with an average R-multiple of 2 will need a win rate of at least ___ to be profitable', ['25%', '33%', '50%', '67%'], 1),
          TF('The larger the drawdown, the larger the rate of recovery needed to break even again', true),
          TF('With a win rate of 75%+, there is a zero percent chance I will ever lose 3 or more trades in a row', false),
          TF('Great traders never go on losing streaks', false),
          TF('The Kelly Criterion is a model for optimizing position sizes to maximize profitability over the long run', true),
          TF('The modified Kelly Criterion allows traders to input dynamic odds in accordance with a trader’s average R-multiple', true),
          TF('Pareto’s principle suggests that 80% of our trades will turn into big wins or losses', false),
          TF('Pareto’s principle suggests that most of our trades will not drastically impact our equity curve', true),
          MC('Multiplying the calculated risk of our modified Kelly output by ___ helps us manage our risk effectively', ['10%', '20%', '30%', '40%'], 1),
          TF('Journaling is a statistics-based approach to improving profitability', true),
          TF('Journaling is not useful for most traders', false),
          TF('Journaling helps traders identify both their strengths and weaknesses', true),
          MULTI('At the bare minimum, journaling should include (check all that apply)', ['Trade setup', 'Reasoning', 'Emotions', 'Invalidation levels'], [0, 1, 2, 3])
        ]
      }
    },

    /* ══════════════ COURSE 2 — Building Your Toolbox ══════════════ */
    2: {
      'Choosing Your Trading Style': {
        title: 'Module 1 — Choosing Your Style',
        questions: [
          TF('Scalpers usually use HTF charts for all their trade setups', false),
          MULTI('Day traders may analyze these timeframes (select all that apply)', ['15 Minute', '1 Hour', '4 Hour', '1 Week'], [0, 1, 2]),
          TF('Swing traders usually stick to higher time frames as opposed to lower time frames', true),
          TF('Position traders usually use sub-15min time frames for executing trades', false),
          TF('Swing traders typically trade from one key swing point to the next', true),
          TF('As a trader you have to pick only one style of trading in order to be successful', false)
        ]
      },
      'Defining a Trade Setup': {
        title: 'Module 2 — Defining Your Setup',
        questions: [
          MC('The LTE framework stands for ___', ['Long, Term, Entry', 'Level, Timed, Entry', 'Long, Trigger, Entry', 'Level, Trigger, Entry'], 3),
          MC('The L in the LTE methodology stands for ___', ['Longs', 'Liquidation', 'Level', 'Loss'], 2),
          MC('The T in the LTE methodology stands for ___', ['Timing', 'Trigger', 'Test', 'Trade'], 1),
          MC('The E in the LTE methodology stands for ___', ['Entry', 'Engineered', 'Execution', 'Equity'], 0),
          TF('The LTE framework provides a repeatable approach for planning and executing trades', true),
          TF('Triggers cannot be entries or exits.', false),
          TF('A bearish engulfing candle is a valid type of trigger', true),
          TF('Invalidation is a predefined level that, when violated, should result in exiting an active trade', true),
          TF('The first barrier (FB) is an area where we place our stop loss', false),
          TF('Bias is the trader’s view on the direction of the trend being analyzed', true),
          TF('Journaling will dictate how active your trade management should be', true),
          MULTI('Which of the following are valid types of exit strategies (select all that apply)', ['Set & Forget', 'LTE Framework', 'Trailing Stop/Loss', 'Partial TP Levels'], [0, 2, 3]),
          TF('Set & Forget works better than partial take-profit levels', false),
          TF('Trailing stops can be moved a specific distance or outside of key technical levels', true),
          TF('The best exit strategy is the one my journal dictates provides the best average R-multiple for my trading style', true)
        ]
      },
      'Price Action Concepts': {
        title: 'Module 3 — Price Action Concepts',
        questions: [
          TF('Japanese candlesticks help traders understand the psychology of market participants', true),
          TF('Price action formations can be used as levels for the LTE methodology', false),
          TF('Combining price action with support & resistance provides high-probability setups', true),
          TF('Volume profile helps confirm candlestick formations', true),
          TF('Engulfing candles show clear strength by closing above or below the previous session’s open', true),
          TF('Evening & morning star formations require an indecision candle for the second candle in the formation', true),
          MC('Price rising while volume is declining is interpreted as ___', ['Bullish Strength', 'Bullish Weakness', 'Bearish Strength', 'Bearish Weakness'], 1),
          MC('Price declining while volume is rising is interpreted as ___', ['Bullish Strength', 'Bullish Weakness', 'Bearish Strength', 'Bearish Weakness'], 2),
          MC('Price rising while volume is rising is interpreted as ___', ['Bullish Strength', 'Bullish Weakness', 'Bearish Strength', 'Bearish Weakness'], 0),
          MC('Price declining while volume is declining is interpreted as ___', ['Bullish Strength', 'Bullish Weakness', 'Bearish Strength', 'Bearish Weakness'], 3),
          TF('Classical chart patterns are subjective in nature', true),
          TF('Traders should always trade patterns before they complete', false),
          TF('Classical chart patterns help traders define their setup', true),
          MC('The head and shoulders pattern is always a ___ pattern', ['Continuation', 'Reversal'], 1),
          MC('A bull or bear flag is always a ___ pattern', ['Continuation', 'Reversal'], 0),
          MC('Most classical patterns show signs of ___ volume, signaling consolidation', ['Ascending', 'Descending'], 1)
        ]
      },
      'Trading Tools': {
        title: 'Module 4 — Trading Tools',
        questions: [
          MULTI('Fibonacci helps us identify ___ (select all that apply)', ['Levels', 'Take-profit targets', 'Entries', 'Invalidation'], [0, 1, 2, 3]),
          TF('The higher fibonacci retracement levels can provide the best asymmetric risk:reward ratios', true),
          TF('Fibonacci is drawn from the previous swing low (or high) to the most recent swing high (or low)', false),
          TF('Fibonacci levels always work', false),
          MC('The kijun-sen (baseline) is similar to a dynamic ___ retracement', ['38.2%', '50%', '61.8%', '78.6%'], 1),
          TF('Ichimoku works best in a ranging market', false),
          MC('Ichimoku can capture up to ___ of any given trend', ['25%', '50%', '75%', '100%'], 2),
          MC('The components of ichimoku are similar to moving averages except they calculate the ___ of the period', ['High', 'Average', 'Low', 'Mean'], 3),
          MC('The ___ can act as a time-based trailing stop using its closing price', ['Tenkan-sen (conversion line)', 'Kijun-sen (base line)', 'Senkou Span A or B (cloud)', 'Chikou span (lagging span)'], 1),
          MC('The ___ is considered the trend setter in the Ichimoku system', ['Tenkan-sen (conversion line)', 'Kijun-sen (base line)', 'Senkou Span A or B (cloud)', 'Chikou span (lagging span)'], 1),
          MC('If the chikou span (lagging span) is below price, then the asset is ___', ['Trending down', 'Ranging', 'Trending upwards'], 0),
          MC('If the chikou span (lagging span) is inside price, then the asset is ___', ['Trending down', 'Ranging', 'Trending upwards'], 1),
          MC('If the chikou span (lagging span) is above price, then the asset is ___', ['Trending down', 'Ranging', 'Trending upwards'], 2),
          MC('The best inputs for ichimoku are ___', ['Standard settings', '“Crypto” settings', 'Smoothed settings', 'The ones that work for me'], 3),
          TF('Oscillators help identify potential exhaustion points from buyers or sellers', true),
          TF('Divergences are considered lagging indicators', false),
          TF('A bullish divergence suggests buyer exhaustion', false),
          TF('Divergences must connect tops to tops or bottoms to bottoms', true),
          TF('A hidden divergence may signal a trend reversal', false),
          TF('In downtrends, hidden bullish divergences usually work well', false)
        ]
      },
      'Financial Instruments': {
        title: 'Module 5 — Financial Instruments',
        questions: [
          TF('A derivative is a product that derives its value from an underlying asset', true),
          TF('A contract is the tradable unit of value for a derivative', true),
          MC('Derivatives can be used for ___', ['Hedging', 'Speculation (trading)', 'All of the above', 'None of the above'], 2),
          TF('Hedging involves increasing risk around future price direction', false),
          MC('Which of the following are derivatives?', ['Futures/Forwards', 'Options', 'Swaps', 'All of the above'], 3)
        ]
      }
    },

    /* ══════════════ COURSE 3 — Sharpening Your Edge ══════════════ */
    3: {
      'Getting Started with Derivatives': {
        title: 'Module 1 — Starting With Derivatives',
        questions: [
          TF('A market order guarantees the execution but not the price at which the order is executed', true),
          TF('A limit order guarantees the price of the order but not the execution of the order', true),
          MC('A stop order can be used for ___', ['Entering trades', 'Exiting trades', 'All of the above', 'None of the above'], 2),
          TF('Stop losses help traders define their risk on any single position', true),
          TF('A stop loss on a new short position should be set below an invalidation level', false),
          TF('Limit orders are useful for quickly entering trades', false),
          TF('Market orders are useful for building positions', false),
          MC('A ___ order removes liquidity from the market', ['Maker', 'Taker', 'All of the above', 'None of the above'], 1),
          MC('A ___ order provides liquidity for the market', ['Maker', 'Taker', 'All of the above', 'None of the above'], 0),
          TF('Maker orders usually have a higher fee structure than taker orders', false)
        ]
      },
      'Understanding Leverage': {
        title: 'Module 2 — Understanding Leverage',
        questions: [
          TF('Leverage is a tool that can be used to increase risk on trades', false),
          MULTI('Leverage can be used for ___ (select all that apply)', ['Increasing risk', 'Mitigating counterparty risk', 'Capitalizing on multiple trades', 'None of the above'], [1, 2]),
          TF('Getting margin-called (or liquidated) is a common occurrence when starting to trade', false),
          TF('Leverage is irrelevant — position size determines PnL', true),
          TF('Isolated margin utilizes the full account balance as margin', false),
          TF('Cross margin restricts losses to only the margin posted on the trade', false),
          TF('Initial margin represents the collateral traders must post in order to take leveraged positions', true),
          TF('Liquidations occur when positions fall below the maintenance margin requirements', true)
        ]
      },
      'Applying the Basics': {
        title: 'Module 3 — Applying the Basics',
        questions: [
          TF('Price moves because of buyers and sellers. The larger the imbalance, the weaker the movement.', false),
          MC('When supply is greater than demand, price ___', ['Rises', 'Falls', 'Consolidates'], 1),
          MC('When supply is equal to demand, price ___', ['Rises', 'Falls', 'Consolidates'], 2),
          MC('When demand is greater than supply, price ___', ['Rises', 'Falls', 'Consolidates'], 0),
          TF('Consolidation zones provide traders access points into the market', true),
          TF('DBS (Demand/Buyers/Support) and SSR (Supply/Sellers/Resistance) zones can be ranges or single candlesticks', true),
          TF('A DBS zone can be defined by the high of the range down to the lowest opening price', false),
          TF('An SSR zone can be defined by an up candle before a lower low', true),
          TF('The more time spent forming a DBS or SSR zone, the stronger the zone.', false),
          TF('Depletion factor states that the best reaction of a zone occurs on the first test', true),
          MC('Complete the sentence regarding S/R flips. Buy (long) last ___ when price is ___', ['Resistance / Below', 'Support / Above', 'Resistance / Above', 'Support / Below'], 2),
          MC('Complete the sentence regarding S/R flips. Sell (short) last ___ when price is ___', ['Resistance / Below', 'Support / Above', 'Resistance / Above', 'Support / Below'], 3),
          MC('Which component of a range helps determine who is in control?', ['High', 'Mid', 'Low', 'All of the above'], 1),
          MC('When trading a range, we want to be sellers at the ___', ['High', 'Mid', 'Low', 'All of the above'], 0),
          MC('When trading a range, we want to be buyers at the ___', ['High', 'Mid', 'Low', 'All of the above'], 2),
          TF('The mid range is a great place to take both long or short positions', false),
          TF('Trading first tests of the range low or high is a conservative strategy with a high hit rate', true),
          TF('The rule of 5’s says that the 5th touch of a range low or high is the best time to long or short (respectively)', false)
        ]
      },
      'Crafting Your System': {
        title: 'Module 4 — Crafting Your System',
        questions: [
          MULTI('Which of the following define a trading system (select all that apply)', ['Complete framework for engaging with financial markets', 'Includes parameters for risk and position sizing', 'Includes predefined rules for entry & exit', 'Requires trust & discipline during periods of drawdown'], [0, 1, 2, 3]),
          MC('Which of the following is NOT a component of a trading system?', ['Markets & timeframe', 'Risks & trade setup', 'Entry & exit triggers', 'Trading journal'], 3),
          TF('You can have multiple systems for trading varying market conditions', true),
          TF('A discretionary trading system focuses mostly on indicators and their conditions', false),
          TF('A technical system relies mostly on market structure and visual cues', false),
          TF('A trading system is the application of a trading plan', false),
          MULTI('Which of the following define a trading plan (select all that apply)', ['Includes a directional bias for the time frame analyzed', 'Builds discipline & consistency', 'Includes markets & key levels to buy or sell', 'Includes rules for executing a discretionary trading system'], [0, 1, 2, 3]),
          TF('A trading plan does not include a review of the trading session', false),
          MULTI('Which of the following define a trading journal? (select all that apply)', ['Ledger for recording each and every trade', 'Includes the setup, reasoning, R-metrics, and outcome', 'Used to review, craft a system, and improve execution', 'Essential for becoming a profitable trader'], [0, 1, 2, 3]),
          MULTI('Which of the following are valid journal components (select all that apply)', ['R-metrics', 'Emotional state', 'Hours of sleep', 'Screenshot of trade setup'], [0, 1, 2, 3])
        ]
      },
      'Unlocking Your Potential': {
        title: 'Module 5 — Unlocking Your Potential',
        questions: [
          TF('An edge is a trader’s ability to outsmart the market to consistently generate returns', true),
          TF('Edges are set in stone and shouldn’t require frequent iteration to maintain', false),
          TF('Systems are static — their parameters should not change', true),
          TF('A systemic edge is an approach based on observation', false),
          TF('A discretionary edge are parameters based on experimentation', false),
          MC('Which of the following are key to developing a trader’s mindset?', ['Routine', 'Work/Life Balance', 'Discipline', 'All of the above'], 3),
          TF('Screen time is an essential routine for improving both your technical-analysis skills as well as trading', true),
          TF('Being physically healthy helps improve your trading performance', true),
          TF('Meditation helps discretionary traders look at the market more objectively', true),
          TF('Every trader should use the same outlet for de-stressing', false),
          MC('Which of the following are valid outlets for stress?', ['Quality time with loved ones', 'Video games', 'Fishing', 'All of the above'], 3),
          TF('Rules for trading hours can only hinder a trader’s profitability', false),
          TF('Emotional control comes with experience', true),
          TF('Meditation cannot help with emotional control', false),
          TF('There is only one way to meditate effectively for traders', false)
        ]
      }
    },

    /* ══════════════ COURSE 4 — Liquidity Theory ══════════════ */
    4: {
      'Identifying Liquidity': {
        title: 'Module 1 — Identifying Liquidity',
        questions: [
          MC('Which of the following apply to Liquidity Theory?', ['Trading is a zero-sum game', 'Market participants are predatory', 'Buyers & sellers participate in game theory', 'Price gravitates towards the area with the most liquidity', 'All of the above'], 4),
          TF('Slippage is the difference between the expected trade price and the price at which a trade is executed', true),
          MC('Liquidity in trading refers to ___', ['The area(s) where positions can be filled with minimum slippage', 'The ability to fully cover margin positions', 'The liquidation price of a leveraged position', 'The speed at which price travels'], 0),
          MC('Game theory helps traders ___', ['Determine who is in control', 'Understand the psychology of market participants', 'Predict which way price will go with absolute certainty', 'All of the above'], 0),
          TF('The purpose of the market is to redistribute wealth from the few to the many', false),
          TF('Liquidity pools tend to be above or below obvious S/R levels', true),
          TF('A trapped position can engineer liquidity for a bigger player', true),
          MC('In order to engineer long liquidity, price needs to go ___', ['Above support', 'Below support', 'Above resistance', 'Below resistance'], 1),
          MC('In order to engineer short liquidity, price needs to go ___', ['Above support', 'Below support', 'Above resistance', 'Below resistance'], 2),
          TF('A swing failure pattern (SFP) is interpreted as a continuation candle', false),
          TF('The time in between the first test of a level and the SFP should be multiple days', true),
          TF('SFPs usually occur near HTF trendlines', false),
          TF('Liquidity pools are always SFPs', false),
          TF('Liquidity pools are finite', true),
          MC('The best way to avoid being part of a liquidity pool is ___', ['Wait for the first test of an obvious level', 'Rethink your setup — “Is my stop-loss someone else’s liquidity?”', 'Leave an appropriate buffer on your stop-loss', 'All of the above'], 3),
          MULTI('Liquidity structures ___ (select all that apply)', ['Provide access points into the market', 'Engineer liquidity', 'Have a 100% hit rate', 'All of the above'], [0, 1]),
          TF('Victims of liquidity structures are usually breakout longs or breakdown shorts', true),
          TF('Liquidity structures usually occur in trending markets', false),
          TF('The retest of a liquidity structure often provides the best trade setup', true),
          TF('A bullish Under-Over structure helps engineer short liquidity', false)
        ]
      },
      'Determining Control': {
        title: 'Module 2 — Determining Control',
        questions: [
          TF('Funding is the cost to lend an asset to go long or short on margin', false),
          TF('Funding incentivizes market participants to provide liquidity on derivative exchanges', true),
          MC('Longs pay shorts when the funding rate is ___', ['Positive', 'Negative', 'Equal', 'None of the above'], 0),
          MC('Shorts pay longs when the funding rate is ___', ['Positive', 'Negative', 'Equal', 'None of the above'], 1),
          TF('Extremes in positive or negative funding can help gauge market sentiment', true),
          MC('Price rising while open interest rises suggests ___', ['Strong uptrend', 'Weak uptrend', 'Strong downtrend', 'Weak downtrend'], 0),
          MC('Price rising while open interest falls suggests ___', ['Strong uptrend', 'Weak uptrend', 'Strong downtrend', 'Weak downtrend'], 1),
          MC('Price falling while open interest rises suggests ___', ['Strong uptrend', 'Weak uptrend', 'Strong downtrend', 'Weak downtrend'], 2),
          MC('Price falling while open interest falls suggests ___', ['Strong uptrend', 'Weak uptrend', 'Strong downtrend', 'Weak downtrend'], 3),
          TF('Open interest increases when positions are closed out', false),
          TF('Cumulative delta is equal to market buy orders minus market sell orders', true),
          TF('Imbalances in the cumulative delta help determine which market participant is offsides', true),
          MC('When the forward price of a futures contract is lower than the spot price, it’s called ___', ['Contango', 'Backwardation', 'Equilibrium', 'None of the above'], 1),
          MC('When the forward price of a futures contract is higher than the spot price, it’s called ___', ['Contango', 'Backwardation', 'Equilibrium', 'None of the above'], 0),
          TF('Extremes in future basis help identify potential inflection points in the market', true),
          MC('Which of the following are considered part of sentiment analysis?', ['Funding Rate', 'Open Interest', 'Cumulative Delta', 'Future Basis', 'All of the above'], 4)
        ]
      },
      'Indicator Suite': {
        title: 'Module 3 — Implementing Indicators',
        questions: [
          TF('The Trend Buddy is a trend-following tool for adding confluence to one’s current trading system', true),
          MULTI('Bearish orange pivot candles can be used for ___ (select all that apply)', ['Trailing stops', 'Intra-bar support and resistance', 'Potential local tops', 'Short entry triggers'], [0, 1, 2, 3]),
          MC('Bearish pivot candles are represented with the color ___', ['Blue', 'Red', 'Green', 'Orange'], 3),
          TF('As it pertains to the PAL indicator, “Ap” stands for absorption.', true),
          TF('The heuristics tool helps traders make decisions in regards to the current trend’s direction', true),
          TF('The heuristics tool will never be wrong on the current trend’s direction', false),
          TF('The Genie tool is a high time-frame swing trading indicator', false),
          MULTI('Which of the following statements are true in regards to FSVZO? (select all that apply)', ['It is an oscillator that can provide signals based on the bands’ positioning to overbought and oversold conditions', 'It shows both regular and hidden divergences by painting price-action candlesticks', 'The red and green hues show potential profit-taking zones', 'Whenever the band crosses over the moving average, a signal forms'], [0, 1, 2]),
          MC('The best settings for all of the indicators showcased in this module are ___', ['Default', 'Smoothed', 'Tripled', 'The settings that work best for the trader'], 3),
          TF('Buyer or seller exhaustion is a potential area for taking profit on positions', true)
        ]
      },
      'Applying Sentiment': {
        title: 'Module 4 — Utilizing Sentiment',
        questions: [
          MC('Hyblock Capital’s platform helps traders perform ___', ['Technical analysis', 'Sentiment analysis', 'Fundamental analysis', 'All of the above'], 1),
          MC('The liquidation levels tool helps traders ___', ['Identify potential pockets of liquidity', 'Works well when overlaid on a technical chart of support & resistance', 'Adds confluence to a trading setup', 'All of the above'], 3),
          TF('Position heatmaps help identify price ranges where net longs or shorts are entering or exiting the market', true),
          TF('As it pertains to the position heatmap, the darker the color, the more positions entered at that price range', false),
          TF('The lower the leverage on the liquidation tool, the higher the hit rate', false),
          TF('The larger the position size on the liquidation tool, the higher the hit rate', true),
          TF('Cumulative L/S delta helps identify the imbalance between buyers and sellers', true),
          TF('Cumulative L/S can be used to identify consolidation', true),
          MULTI('As it pertains to Binance indicators, when top trader positions go long and global accounts go short, ___ (select all that apply)', ['Bigger traders are diverging from retail traders', 'A breakout to the downside is more likely', 'A breakout to the upside is more likely', 'Bigger traders are converging with retail traders'], [0, 2]),
          TF('Hyblock Capital’s tools will always work 100% of the time', false)
        ]
      },
      'Ichimoku Masterclass': {
        title: 'Module 5 — Ichimoku Strategies',
        questions: [
          TF('Price always wants to return to the kijun-sen (base line)', true),
          MC('Trading the kijun in a trending market is a ___ strategy', ['Breakout', 'Mean reversion', 'Counter-trend', 'All of the above'], 1),
          MC('Trading a C-clamp is a ___ strategy', ['Mean reversion', 'Breakout', 'Counter-trend', 'All of the above'], 0),
          TF('A C-clamp is ichimoku’s way of highlighting overbought or oversold', true),
          MC('Kumo pockets are ___', ['Areas within the kumo (cloud) that have a high probability of rejecting price', 'Another way of visualizing S/R', 'Areas that work best on the first retest', 'All of the above'], 3),
          TF('A short edge-to-edge setup requires the chikou span to be above price', false),
          MC('An edge-to-edge setup requires ___', ['A weak TK crossover', 'Chikou span above/below price', 'A clean close inside the kumo', 'All of the above'], 3),
          MULTI('During an e2e setup, entries can occur on a pullback to the ___ (select all that apply)', ['Tenkan-sen (conversion line)', 'Kijun-sen (base line)', 'Kumo (cloud)', 'Chikou span (lagging span)'], [0, 1, 2])
        ]
      }
    }
  };
})();
