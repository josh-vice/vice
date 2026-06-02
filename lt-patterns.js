'use strict';

const LT_PATTERNS = [
 { id:"pa-1", concept:"Understanding Price Action", pattern:"Shooting Star Top",
 symbol:"BTCUSDT", interval:"1d", decisionTime:1636934400000,
 lookback:20, reveal:10, correctAnswer:"sell", keyLevel:69000,
 patternLabel:"Shooting Star",
 explanation:"BTC formed a shooting star at the all-time high of $69K on Nov 10 2021. Long upper wick showed buyers got rejected hard. Seller exhaustion at the top of a parabolic run." },

 { id:"pa-2", concept:"Understanding Price Action", pattern:"Hammer Reversal",
 symbol:"BTCUSDT", interval:"1d", decisionTime:1651708800000,
 lookback:20, reveal:10, correctAnswer:"buy", keyLevel:26700,
 patternLabel:"Hammer",
 explanation:"After the LUNA collapse May 2022, BTC printed a hammer at $26.7K. Long lower wick showed sellers exhausted. Buyers stepped in aggressively." },

 { id:"sd-1", concept:"Supply and Demand Zones", pattern:"Demand Zone Bounce",
 symbol:"BTCUSDT", interval:"4h", decisionTime:1652486400000,
 lookback:30, reveal:12, correctAnswer:"buy", keyLevel:25400,
 patternLabel:"Demand Zone",
 explanation:"Price tapped a major demand zone at $25.4K with long lower wicks showing buyers defending. Exhaustion point of the LUNA selling pressure." },

 { id:"sd-2", concept:"Supply and Demand Zones", pattern:"Supply Zone Rejection",
 symbol:"BTCUSDT", interval:"4h", decisionTime:1671321600000,
 lookback:30, reveal:12, correctAnswer:"sell", keyLevel:18500,
 patternLabel:"Supply Zone",
 explanation:"After the FTX collapse BTC rallied into a supply zone at $18.5K in December 2022. Multiple rejections from sellers before the next leg down." },

 { id:"sr-1", concept:"Support and Resistance", pattern:"Resistance Holds",
 symbol:"BTCUSDT", interval:"1d", decisionTime:1619568000000,
 lookback:25, reveal:10, correctAnswer:"sell", keyLevel:58000,
 patternLabel:"Resistance",
 explanation:"BTC tested $58K resistance in April 2021 multiple times. Each test weakened the level. Classic Rule of Fives before the eventual breakout." },

 { id:"sr-2", concept:"Support and Resistance", pattern:"Support at 20K",
 symbol:"BTCUSDT", interval:"1d", decisionTime:1655596800000,
 lookback:25, reveal:10, correctAnswer:"buy", keyLevel:20000,
 patternLabel:"Major Support",
 explanation:"The $20K level held as major support June 2022. Previous 2017 all-time high acting as support — classic S/R flip on the macro timeframe." },

 { id:"tr-1", concept:"Trending Markets", pattern:"Uptrend Higher Highs",
 symbol:"BTCUSDT", interval:"1d", decisionTime:1674864000000,
 lookback:30, reveal:10, correctAnswer:"buy", keyLevel:23000,
 patternLabel:"HH+HL Uptrend",
 explanation:"January 2023 BTC formed clear Higher Highs and Higher Lows off the bottom. Each Higher Low was a buying opportunity in the new uptrend." },

 { id:"tr-2", concept:"Trending Markets", pattern:"Downtrend Lower Highs",
 symbol:"BTCUSDT", interval:"1d", decisionTime:1661385600000,
 lookback:30, reveal:10, correctAnswer:"sell", keyLevel:25000,
 patternLabel:"LH+LL Downtrend",
 explanation:"August 2022 rally to $25K formed a classic Lower High in the bear market. Selling the Lower High was the correct play in a downtrend." },

 { id:"rb-1", concept:"Range-Bound Markets", pattern:"Range High Rejection",
 symbol:"BTCUSDT", interval:"4h", decisionTime:1683072000000,
 lookback:30, reveal:12, correctAnswer:"sell", keyLevel:29500,
 patternLabel:"Range High",
 explanation:"BTC ranged between $25K and $29.5K for months in 2023. Tap of range high at $29.5K was a textbook sell." },

 { id:"rb-2", concept:"Range-Bound Markets", pattern:"Range Low Buy",
 symbol:"BTCUSDT", interval:"4h", decisionTime:1685664000000,
 lookback:30, reveal:12, correctAnswer:"buy", keyLevel:25800,
 patternLabel:"Range Low",
 explanation:"Price returned to range low at $25.8K June 2023. Lower wicks confirmed buyers defending. The mechanical range trade." },

 { id:"ms-1", concept:"What Is Market Structure?", pattern:"Bullish Break of Structure",
 symbol:"BTCUSDT", interval:"1d", decisionTime:1672531200000,
 lookback:25, reveal:10, correctAnswer:"buy", keyLevel:17500,
 patternLabel:"BOS Bullish",
 explanation:"January 2023 BTC broke above a key swing high for the first time in the bear market. First Break of Structure confirming trend change." },

 { id:"ms-2", concept:"What Is Market Structure?", pattern:"Bearish Break of Structure",
 symbol:"BTCUSDT", interval:"1d", decisionTime:1652918400000,
 lookback:25, reveal:10, correctAnswer:"sell", keyLevel:33000,
 patternLabel:"BOS Bearish",
 explanation:"May 2022 BTC broke below the $33K swing low confirming bearish market structure. First clear BOS of the 2022 bear market." },

 { id:"srf-1", concept:"SR Flips and Break of Structure", pattern:"Resistance Becomes Support",
 symbol:"BTCUSDT", interval:"1d", decisionTime:1676764800000,
 lookback:25, reveal:10, correctAnswer:"buy", keyLevel:25000,
 patternLabel:"SR Flip",
 explanation:"February 2023 the $25K resistance that capped multiple rallies finally broke and retested as support. Classic SR flip — old resistance new support." },

 { id:"htf-1", concept:"Timeframes", pattern:"HTF Weekly Support",
 symbol:"BTCUSDT", interval:"1w", decisionTime:1655596800000,
 lookback:20, reveal:8, correctAnswer:"buy", keyLevel:20000,
 patternLabel:"Weekly Support",
 explanation:"On the weekly timeframe the $20K level was the most significant support in BTC history. HTF holds more weight — this level had to be respected." },

 { id:"ltf-1", concept:"LTF Entry Scenario", pattern:"4H Entry at Higher Low",
 symbol:"BTCUSDT", interval:"4h", decisionTime:1675900800000,
 lookback:30, reveal:12, correctAnswer:"buy", keyLevel:22500,
 patternLabel:"LTF Entry",
 explanation:"After confirming bullish market structure on the daily, dropping to 4H showed a clean Higher Low forming at $22.5K. Perfect LTF entry in the direction of the HTF trend." },

 { id:"vol-1", concept:"Volume Analysis", pattern:"Volume Spike Reversal",
  symbol:"BTCUSDT", interval:"1d", decisionTime:1636934400000,
  lookback:20, reveal:10, correctAnswer:"sell", keyLevel:69000,
  patternLabel:"Volume Climax",
  explanation:"BTC hit all time high with massive volume spike — classic climax selling signal. When volume explodes at a top, smart money is distributing to retail buyers." },

 { id:"cp-1", concept:"Classical Chart Patterns", pattern:"Bull Flag Breakout",
  symbol:"BTCUSDT", interval:"1d", decisionTime:1674864000000,
  lookback:25, reveal:10, correctAnswer:"buy", keyLevel:23000,
  patternLabel:"Bull Flag",
  explanation:"January 2023 BTC formed a textbook bull flag after the initial recovery impulse. Tight consolidation on low volume before the breakout continuation." },

 { id:"fib-1", concept:"Fibonacci", pattern:"Fib 618 Retracement Hold",
  symbol:"BTCUSDT", interval:"1d", decisionTime:1677628800000,
  lookback:25, reveal:10, correctAnswer:"buy", keyLevel:23500,
  patternLabel:"0.618 Fib",
  explanation:"February 2023 BTC pulled back exactly to the 0.618 Fibonacci retracement of the January rally. The golden ratio held as support perfectly." },

 { id:"osc-1", concept:"Oscillators", pattern:"RSI Oversold Bounce",
  symbol:"BTCUSDT", interval:"1d", decisionTime:1655596800000,
  lookback:25, reveal:10, correctAnswer:"buy", keyLevel:20000,
  patternLabel:"RSI Oversold",
  explanation:"June 2022 BTC RSI hit extreme oversold readings below 20 while price touched $20K support. Oscillator confluence with key level — high probability bounce." },

 { id:"ichi-1", concept:"Ichimoku Kinko Hyo", pattern:"Kumo Breakout",
  symbol:"BTCUSDT", interval:"1d", decisionTime:1675900800000,
  lookback:30, reveal:12, correctAnswer:"buy", keyLevel:22500,
  patternLabel:"Kumo Break",
  explanation:"February 2023 BTC broke above the Ichimoku cloud for the first time in the bear market. Cloud breakouts signal major trend changes." },

 /* ── Course 3 patterns ─────────────────────────────────────────────── */

 { id:"c3-ap-1",
   concept:"Identifying Access Points — Understanding Consolidation",
   pattern:"DBS Zone — Consolidation Before Explosive Breakout",
   symbol:"BTCUSDT", interval:"1d", decisionTime:1673222400000,
   lookback:20, reveal:10, correctAnswer:"buy", keyLevel:17000,
   patternLabel:"DBS Zone",
   explanation:"Jan 9 2023: BTC had consolidated tightly at $16.5K–$17K for 3 weeks — single-session down candles followed by immediate recovery. Classic DBS zone forming during capitulation. Price then broke explosively to $23K, validating the zone. First retest of the $17K zone was the highest-probability long entry of the early 2023 recovery."},

 { id:"c3-ssr-1",
   concept:"Trading S/R — DBS/SSR Strategies",
   pattern:"SSR Flip to DBS — $50K First Retest",
   symbol:"BTCUSDT", interval:"1d", decisionTime:1708041600000,
   lookback:25, reveal:10, correctAnswer:"buy", keyLevel:50000,
   patternLabel:"S/R Flip Long",
   explanation:"Feb 16 2024: BTC broke above $50K — a major SSR zone that had capped every rally since the Nov 2021 ATH — on the back of spot ETF inflows. On the first pullback retest of $50K from above, the zone acted as DBS support exactly as the S/R flip framework predicts. Highest-probability long of the 2024 bull leg: old resistance, new support, fresh depletion factor."},

 { id:"c3-rng-1",
   concept:"Trading Ranges",
   pattern:"Range High — Rule of Fives Exhaustion at $31K",
   symbol:"BTCUSDT", interval:"4h", decisionTime:1689206400000,
   lookback:30, reveal:12, correctAnswer:"sell", keyLevel:31000,
   patternLabel:"Rule of Fives",
   explanation:"Jul 13 2023: BTC had bounced off the $31K range high four times across a two-month range between $25K and $31K. The 4th test showed thinner rejection wicks each time — the zone was depleting. A Rule of Fives setup: do not short the 5th touch; BTC subsequently broke above $31K. Shorting touch 4 was the last valid short; touch 5 was the exhaustion breakout."},

 { id:"c3-rls-1",
   concept:"Range Market Scenario — Live Walkthrough",
   pattern:"Range Low First Test — Volume Confirmed Entry",
   symbol:"BTCUSDT", interval:"4h", decisionTime:1694390400000,
   lookback:30, reveal:12, correctAnswer:"buy", keyLevel:26000,
   patternLabel:"Range Low Entry",
   explanation:"Sep 11 2023: BTC had been ranging $25.8K–$31K for months. After the Rule of Fives breakout above $31K failed and price pulled back, the $26K range low printed its first fresh test with long lower wicks and high volume — buyers clearly stepping in. The midpoint of the range was $28.4K; once price reclaimed mid and held, confidence in the $31K target was high. Textbook live range walkthrough setup."},

 { id:"c3-ot-1",
   concept:"Order Types",
   pattern:"Limit Buy at Post-Halving Support — $57.5K Retracement",
   symbol:"BTCUSDT", interval:"1d", decisionTime:1714521600000,
   lookback:20, reveal:10, correctAnswer:"buy", keyLevel:57500,
   patternLabel:"Limit Buy Setup",
   explanation:"May 1 2024: BTC had set its pre-halving ATH at $73K before pulling back sharply to $57.5K — a prior breakout level that had flipped to support. A limit buy at $57.5K (not a market buy at wherever price was) captured the optimal fill: maker fee, guaranteed price, at the key level. A market order at the lows would have chased; a limit order at the predefined support waited and filled precisely. Correct order type for a planned swing entry."}


 /* ── Course 4 patterns ─────────────────────────────────────────────── */

 { id:"c4-sfp-1",
   concept:"Identifying Liquidity",
   pattern:"Bearish SFP — Swing Failure at BTC All-Time High",
   symbol:"BTCUSDT", interval:"1d", decisionTime:1636588800000,
   lookback:20, reveal:10, correctAnswer:"sell", keyLevel:69000,
   patternLabel:"Bearish SFP",
   explanation:"Nov 10 2021: BTC briefly exceeded the prior $68K swing high by a small margin to $69K before reversing sharply. Short stop losses above $68K were triggered and eager breakout longs were trapped. A large seller filled their short at the elevated price. This is a textbook Bearish Swing Failure Pattern — HTF liquidity engineered at the prior swing high. Price fell from $69K to $42K over the following weeks as the trapped longs were squeezed out."},

 { id:"c4-uo-1",
   concept:"Liquidity Structures",
   pattern:"Bullish Under Over — Fake Breakdown Below $17.6K, Reversal",
   symbol:"BTCUSDT", interval:"1d", decisionTime:1655510400000,
   lookback:25, reveal:12, correctAnswer:"buy", keyLevel:20000,
   patternLabel:"Under Over",
   explanation:"Jun 18 2022: BTC had been range-bound with key support near $20K. Price broke decisively below that range low to $17.6K, triggering a dense cluster of long stop losses and attracting eager breakdown short sellers. Price then reversed sharply and reclaimed $20K within days. The $20K range low became resistance on the retest — a textbook Bullish Under Over. The optimal long entry was the retest of $20K from above with stop below the $17.6K swing low."},

 { id:"c4-fund-1",
   concept:"Funding Rate",
   pattern:"Extreme Negative Funding Before Jan 2023 Short Squeeze",
   symbol:"BTCUSDT", interval:"1d", decisionTime:1671580800000,
   lookback:20, reveal:10, correctAnswer:"buy", keyLevel:16500,
   patternLabel:"Funding Squeeze",
   explanation:"Dec 21 2022: BTC was trading near $16.5K with funding rates at extreme negative readings across major exchanges — shorts were paying heavily every 8 hours to maintain positions. This was the textbook extreme negative funding at support scenario: shorts off-sides, paying unsustainably, at a key DBS zone. Over the following weeks, the short squeeze drove BTC from $16.5K to $25K by late January 2023, validating the Liquidity Theory + Funding Rate 1-2 punch setup."},

 { id:"c4-oi-1",
   concept:"Open Interest",
   pattern:"Price Falling + OI Rising During FTX Collapse — Strongest Bearish OI Signal",
   symbol:"BTCUSDT", interval:"1d", decisionTime:1668038400000,
   lookback:20, reveal:10, correctAnswer:"sell", keyLevel:20000,
   patternLabel:"OI Divergence Bear",
   explanation:"Nov 10 2022: During the FTX collapse, BTC price fell from $21K toward $15.5K while open interest rose sharply — new short positions were aggressively being added as price crashed. This is the textbook Price Falling + OI Rising pattern: the most bearish OI configuration, backed by real new participant conviction. Any counter-trend long during this period fought a trend with growing OI backing. The correct read was to respect the OI trend and not fade the move until OI began falling (capitulation phase)."},

 { id:"c4-kijun-1",
   concept:"Kijun-sen Bounces and Rejections",
   pattern:"Kijun Bounce During 2023 Uptrend — Daily Kijun at $27.5K",
   symbol:"BTCUSDT", interval:"1d", decisionTime:1680912000000,
   lookback:25, reveal:10, correctAnswer:"buy", keyLevel:27500,
   patternLabel:"Kijun Bounce",
   explanation:"Apr 8 2023: BTC had been in a confirmed uptrend since January, forming consistent Higher Highs and Higher Lows. After the impulse move to $31K, price pulled back to the daily Kijun-sen at approximately $27.5K — the dynamic 50% Fibonacci of the current trend leg. The Kijun acted as support exactly as the Kijun Bounce strategy predicts: price bounced from the Kijun and continued to new highs above $31K. Setting bids at the Kijun during this pullback was the optimal entry — 2+ R to the prior swing high with a clean stop below the recent swing low."}

];
