'use strict';

// Seeded PRNG
function mulberry32(seed) {
 let a = seed >>> 0;
 return function() {
 a |= 0; a = (a + 0x6D2B79F5) | 0;
 let t = Math.imul(a ^ (a >>> 15), 1 | a);
 t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
 return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 };
}

// Base random walk — n 15-minute candles
function baseWalk(rand, n, startPrice, drift, vol) {
 const out = [];
 let prevClose = startPrice;
 for (let i = 0; i < n; i++) {
 const open = prevClose;
 const pct = drift + (rand() * 2 - 1) * vol;
 const close = open * (1 + pct);
 const bodyHi = Math.max(open, close);
 const bodyLo = Math.min(open, close);
 const high = bodyHi * (1 + rand() * vol * 0.6);
 const low = bodyLo * (1 - rand() * vol * 0.6);
 out.push([+open.toFixed(2), +close.toFixed(2), +low.toFixed(2), +high.toFixed(2)]);
 prevClose = close;
 }
 return out;
}

// Aggregate 15m candles up to a higher timeframe. factor: 4=1h,16=4h,48=12h,96=1d
function aggregateCandles(ohlc, factor) {
 const out = [];
 for (let i = 0; i + factor <= ohlc.length; i += factor) {
 const grp = ohlc.slice(i, i + factor);
 const open = grp[0][0];
 const close = grp[grp.length - 1][1];
 const low = Math.min(...grp.map(c => c[2]));
 const high = Math.max(...grp.map(c => c[3]));
 out.push([+open.toFixed(2), +close.toFixed(2), +low.toFixed(2), +high.toFixed(2)]);
 }
 return out;
}

function _injUptrend(rand) {
 const ohlc = baseWalk(rand, 600, 30000, 0.0008, 0.006);
 return { ohlc, cutIndex: 360, keyLevel: ohlc[360][1], patternLabel: 'Uptrend' };
}

function _injDowntrend(rand) {
 const ohlc = baseWalk(rand, 600, 30000, -0.0008, 0.006);
 return { ohlc, cutIndex: 360, keyLevel: ohlc[360][1], patternLabel: 'Downtrend' };
}

function _injRange(rand) {
 // strongly mean-reverting walk that bounces visibly between floor and ceiling
 const mid = 30000, halfBand = 1500; // floor=28500, ceiling=31500
 const floor = mid - halfBand, ceiling = mid + halfBand;
 const ohlc = [];
 let prevClose = mid;
 for (let i = 0; i < 600; i++) {
 const open = prevClose;
 const dist = (mid - open) / halfBand; // -1..+1 normalised distance from mid
 const pull = dist * 0.010; // strong pull back toward mid
 const pct = pull + (rand() * 2 - 1) * 0.004; // gentle noise
 let close = open * (1 + pct);
 // hard-reflect off the bounds so it never runs away
 if (close > ceiling) close = ceiling - (close - ceiling);
 if (close < floor) close = floor + (floor - close);
 const bodyHi = Math.max(open, close), bodyLo = Math.min(open, close);
 const high = bodyHi * (1 + rand() * 0.0025), low = bodyLo * (1 - rand() * 0.0025);
 ohlc.push([+open.toFixed(2), +close.toFixed(2), +low.toFixed(2), +high.toFixed(2)]);
 prevClose = close;
 }
 return { ohlc, cutIndex: 360, keyLevel: ceiling, patternLabel: 'Range' };
}

function _injBullFlag(rand) {
 // impulse up, tight down-drift consolidation, cut at end of flag, resolution continues up
 const impulse = baseWalk(rand, 220, 30000, 0.0014, 0.005);
 const flagStart = impulse[impulse.length - 1][1];
 const flag = baseWalk(rand, 140, flagStart, -0.0004, 0.0025);
 const contStart = flag[flag.length - 1][1];
 const cont = baseWalk(rand, 240, contStart, 0.0014, 0.005);
 const ohlc = impulse.concat(flag, cont);
 return { ohlc, cutIndex: 360, keyLevel: flagStart, patternLabel: 'Bull Flag' };
}

function _injBearFlag(rand) {
 const impulse = baseWalk(rand, 220, 30000, -0.0014, 0.005);
 const flagStart = impulse[impulse.length - 1][1];
 const flag = baseWalk(rand, 140, flagStart, 0.0004, 0.0025);
 const contStart = flag[flag.length - 1][1];
 const cont = baseWalk(rand, 240, contStart, -0.0014, 0.005);
 const ohlc = impulse.concat(flag, cont);
 return { ohlc, cutIndex: 360, keyLevel: flagStart, patternLabel: 'Bear Flag' };
}

function _injBreakout(rand) {
 // range, then decisive break up through keyLevel at cut
 const mid = 30000, top = 31500;
 const range = [];
 let prevClose = mid;
 for (let i = 0; i < 360; i++) {
 const open = prevClose;
 const pull = (mid - open) / 1500 * 0.004;
 const pct = pull + (rand() * 2 - 1) * 0.005;
 const close = Math.min(open * (1 + pct), top); // capped under resistance
 const bodyHi = Math.max(open, close), bodyLo = Math.min(open, close);
 range.push([+open.toFixed(2), +close.toFixed(2), +(bodyLo*(1-rand()*0.003)).toFixed(2), +(bodyHi*(1+rand()*0.003)).toFixed(2)]);
 prevClose = close;
 }
 const cont = baseWalk(rand, 240, top, 0.0014, 0.005);
 const ohlc = range.concat(cont);
 return { ohlc, cutIndex: 360, keyLevel: top, patternLabel: 'Breakout' };
}

function _injDoubleTop(rand) {
 // rally to resistance, pull back, rally to ~same resistance, reject at cut, resolution down
 const res = 32000;
 const up1 = baseWalk(rand, 160, 30000, 0.0012, 0.004);
 const pb = baseWalk(rand, 100, up1[up1.length-1][1], -0.0011, 0.004);
 const up2 = baseWalk(rand, 100, pb[pb.length-1][1], 0.0012, 0.004);
 // Smoothly guide the last 20 candles of up2 toward resistance to avoid a teleport jump
 const rampStart = up2.length - 20;
 const rampFrom = up2[rampStart][1]; // close at ramp entry
 const rampTo = res * (0.997 + rand() * 0.003); // target near resistance
 for (let i = rampStart; i < up2.length; i++) {
 const t = (i - rampStart + 1) / 20; // 0..1
 const targetClose = rampFrom + (rampTo - rampFrom) * t;
 const open = i === 0 ? up2[i][0] : up2[i - 1][1]; // continuous open
 const bodyHi = Math.max(open, targetClose), bodyLo = Math.min(open, targetClose);
 const wick = rand() * 0.002;
 up2[i] = [+open.toFixed(2), +targetClose.toFixed(2), +(bodyLo * (1 - wick)).toFixed(2), +(bodyHi * (1 + wick)).toFixed(2)];
 }
 const peakClose = up2[up2.length - 1][1]; // continuous handoff, no gap
 const down = baseWalk(rand, 240, peakClose, -0.0014, 0.005);
 const ohlc = up1.concat(pb, up2, down);
 return { ohlc, cutIndex: 360, keyLevel: res, patternLabel: 'Double Top' };
}

function _injDoubleBottom(rand) {
 const sup = 28000;
 const dn1 = baseWalk(rand, 160, 30000, -0.0012, 0.004);
 const bb = baseWalk(rand, 100, dn1[dn1.length-1][1], 0.0011, 0.004);
 const dn2 = baseWalk(rand, 100, bb[bb.length-1][1], -0.0012, 0.004);
 // Smoothly guide the last 20 candles of dn2 toward support to avoid a teleport jump
 const rampStart = dn2.length - 20;
 const rampFrom = dn2[rampStart][1]; // close at ramp entry
 const rampTo = sup * (1.0 + rand() * 0.003); // target near support
 for (let i = rampStart; i < dn2.length; i++) {
 const t = (i - rampStart + 1) / 20; // 0..1
 const targetClose = rampFrom + (rampTo - rampFrom) * t;
 const open = i === 0 ? dn2[i][0] : dn2[i - 1][1]; // continuous open
 const bodyHi = Math.max(open, targetClose), bodyLo = Math.min(open, targetClose);
 const wick = rand() * 0.002;
 dn2[i] = [+open.toFixed(2), +targetClose.toFixed(2), +(bodyLo * (1 - wick)).toFixed(2), +(bodyHi * (1 + wick)).toFixed(2)];
 }
 const troughClose = dn2[dn2.length - 1][1]; // continuous handoff, no gap
 const up = baseWalk(rand, 240, troughClose, 0.0014, 0.005);
 const ohlc = dn1.concat(bb, dn2, up);
 return { ohlc, cutIndex: 360, keyLevel: sup, patternLabel: 'Double Bottom' };
}

function _injDemandBounce(rand) {
 // decline into support with pronounced lower wicks at the level, cut at level, resolution up
 const sup = 28000;
 const decline = baseWalk(rand, 360, 31000, -0.0009, 0.005);
 // last ~90 setup candles probe support; apply wick every 3rd candle
 for (let i = decline.length - 90; i < decline.length; i++) {
 if (i % 3 === 0) {
 const c = decline[i];
 c[2] = +(sup * (1 - rand()*0.004)).toFixed(2); // pronounced lower wick below support
 if (c[1] < sup) c[1] = +(sup * (1 + rand()*0.003)).toFixed(2); // close back above
 }
 }
 const bounce = baseWalk(rand, 240, decline[decline.length-1][1], 0.0014, 0.005);
 const ohlc = decline.concat(bounce);
 return { ohlc, cutIndex: 360, keyLevel: sup, patternLabel: 'Demand Zone' };
}

function _injSupplyReject(rand) {
 const res = 32000;
 const rally = baseWalk(rand, 360, 29000, 0.0009, 0.005);
 // last ~90 setup candles probe resistance; apply wick every 3rd candle
 for (let i = rally.length - 90; i < rally.length; i++) {
 if (i % 3 === 0) {
 const c = rally[i];
 c[3] = +(res * (1 + rand()*0.004)).toFixed(2); // pronounced upper wick above resistance
 if (c[1] > res) c[1] = +(res * (1 - rand()*0.003)).toFixed(2); // close back below
 }
 }
 const drop = baseWalk(rand, 240, rally[rally.length-1][1], -0.0014, 0.005);
 const ohlc = rally.concat(drop);
 return { ohlc, cutIndex: 360, keyLevel: res, patternLabel: 'Supply Zone' };
}

function _injReversalHammer(rand) {
 // downtrend, hammer candle (long lower wick, small body) at index 359 = decision, resolution up
 const down = baseWalk(rand, 360, 32000, -0.0009, 0.005);
 const h = down[down.length-1];
 const o = h[1]; // open near prior close
 const close = +(o * (1 + 0.001)).toFixed(2); // tiny body
 const low = +(o * (1 - 0.02)).toFixed(2); // long lower wick ~2%
 const high = +(Math.max(o, close) * (1 + 0.002)).toFixed(2);
 down[down.length-1] = [o, close, low, high]; // index 359 is the hammer
 const up = baseWalk(rand, 240, close, 0.0014, 0.005);
 const ohlc = down.concat(up);
 return { ohlc, cutIndex: 360, keyLevel: low, patternLabel: 'Hammer' };
}

function _injShootingStar(rand) {
 // uptrend, shooting star candle (long upper wick, small body) at index 359 = decision, resolution down
 const up = baseWalk(rand, 360, 28000, 0.0009, 0.005);
 const s = up[up.length-1];
 const o = s[1];
 const close = +(o * (1 - 0.001)).toFixed(2);
 const high = +(o * (1 + 0.02)).toFixed(2); // long upper wick ~2%
 const low = +(Math.min(o, close) * (1 - 0.002)).toFixed(2);
 up[up.length-1] = [o, close, low, high]; // index 359 is the shooting star
 const down = baseWalk(rand, 240, close, -0.0014, 0.005);
 const ohlc = up.concat(down);
 return { ohlc, cutIndex: 360, keyLevel: high, patternLabel: 'Shooting Star' };
}

function _injInvertedHammer(rand) {
 // downtrend then inverted hammer (long upper wick, small body) at the bottom, resolution up
 const down = baseWalk(rand, 360, 32000, -0.0009, 0.005);
 const o = down[359][1];
 const close = +(o*(1+0.001)).toFixed(2); // tiny body
 const high = +(o*(1+0.02)).toFixed(2); // long upper wick
 const low = +(Math.min(o,close)*(1-0.002)).toFixed(2);
 down[359] = [o, close, low, high];
 const up = baseWalk(rand, 240, close, 0.0013, 0.005);
 return { ohlc: down.concat(up), cutIndex: 360, keyLevel: high, patternLabel: 'Inverted Hammer' };
}

function _injDoji(rand) {
 // mild uptrend into a doji (open ≈ close, wicks both sides) at the decision point
 const up = baseWalk(rand, 360, 29000, 0.0006, 0.005);
 const o = up[359][1];
 const close = +(o*(1+0.0002)).toFixed(2); // open ≈ close
 const high = +(o*(1+0.01)).toFixed(2);
 const low = +(o*(1-0.01)).toFixed(2);
 up[359] = [o, close, low, high];
 const after = baseWalk(rand, 240, close, 0.0, 0.004); // indecision → drift ~flat
 return { ohlc: up.concat(after), cutIndex: 360, keyLevel: o, patternLabel: 'Doji' };
}

function _injSrFlip(rand) {
 // resistance-becomes-support: break above level, retest from above, continuation up
 const level = 30000;
 const approach = baseWalk(rand, 200, 28500, 0.0009, 0.005); // rally toward level
 const breakUp = baseWalk(rand, 80, level*1.01, 0.0011, 0.005); // break above level
 const retest = baseWalk(rand, 80, breakUp[breakUp.length-1][1], -0.0009, 0.004); // pull back to level
 // force the retest low to tag the level from above
 retest[retest.length-1][2] = +(level*0.998).toFixed(2);
 retest[retest.length-1][1] = +(level*1.003).toFixed(2); // close back above = support holds
 const cont = baseWalk(rand, 240, retest[retest.length-1][1], 0.0013, 0.005);
 return { ohlc: approach.concat(breakUp, retest, cont), cutIndex: 360, keyLevel: level, patternLabel: 'S/R Flip' };
}

function _injLiquiditySweep(rand) {
 // price pokes just past a prior high to grab liquidity, then sharply reverses (Swing Failure Pattern)
 const priorHigh = 31000;
 const run = baseWalk(rand, 340, 29000, 0.0008, 0.005); // rally to just under prior high
 // sweep candle: spikes above priorHigh then closes back below
 const o = run[run.length-1][1];
 const sweepHigh = +(priorHigh*1.012).toFixed(2); // pokes above the high
 const sweepClose = +(priorHigh*0.992).toFixed(2); // closes back below = failure
 const sweep = [o, sweepClose, +(o*0.998).toFixed(2), sweepHigh];
 const reversal = baseWalk(rand, 240, sweepClose, -0.0014, 0.006);
 const ohlc = run.concat([sweep], reversal);
 return { ohlc, cutIndex: run.length + 1, keyLevel: priorHigh, patternLabel: 'Liquidity Sweep' };
}

function _injBos(rand) {
 // Break of Structure: uptrend making HH/HL, then price breaks the most recent higher-low
 const up = baseWalk(rand, 360, 28000, 0.0010, 0.005); // uptrend making HH/HL
 const lastHL = Math.min(...up.slice(300, 360).map(c => c[2])); // recent higher-low level
 const breakDown = baseWalk(rand, 240, up[359][1], -0.0013, 0.006); // breaks below structure
 return { ohlc: up.concat(breakDown), cutIndex: 360, keyLevel: +lastHL.toFixed(2), patternLabel: 'Break of Structure' };
}

// Map pattern keys to injector functions
const _INJECTORS = {
 uptrend: _injUptrend,
 downtrend: _injDowntrend,
 range: _injRange,
 bull_flag: _injBullFlag,
 bear_flag: _injBearFlag,
 breakout: _injBreakout,
 double_top: _injDoubleTop,
 double_bottom: _injDoubleBottom,
 demand_bounce: _injDemandBounce,
 supply_reject: _injSupplyReject,
 reversal_hammer: _injReversalHammer,
 shooting_star: _injShootingStar,
 inverted_hammer: _injInvertedHammer,
 doji: _injDoji,
 sr_flip: _injSrFlip,
 liquidity_sweep: _injLiquiditySweep,
 bos: _injBos
};

const _TF_FACTOR = { '4h': 4, '6h': 6, '12h': 12, '1d': 24 };
const _TF_HOURS  = { '4h': 4, '6h': 6, '12h': 12, '1d': 24 };
const _SIM_MON   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Format a candle timestamp for the x-axis. Higher TF → date only; intraday →
// time, with the date shown at each midnight boundary.
function _simFmtTime(d, tf) {
 const mo = _SIM_MON[d.getUTCMonth()], day = d.getUTCDate();
 if (tf === '1d') return mo + ' ' + day;
 const h = d.getUTCHours();
 return h === 0 ? mo + ' ' + day : (h < 10 ? '0' : '') + h + ':00';
}

// Generate the single source-of-truth base (1h) market. No timeframe — callers view it via viewMarket.
function generateMarket(simPattern, seed) {
 const rand = mulberry32((seed | 0) + 1);
 const inj = (_INJECTORS[simPattern] || _injUptrend);
 const raw = inj(rand); // { ohlc(1h base), cutIndex(1h base), keyLevel, patternLabel }
 return { ohlcBase: raw.ohlc, cutIndexBase: raw.cutIndex, keyLevel: raw.keyLevel, patternLabel: raw.patternLabel, pattern: simPattern, seed };
}

// View an already-generated market at a timeframe — pure re-bucketing, no randomness.
function viewMarket(market, timeframe) {
 const factor = _TF_FACTOR[timeframe] || 24; // 4h=4, 6h=6, 12h=12, 1d=24
 const ohlc = aggregateCandles(market.ohlcBase, factor);
 const cutIndex = Math.max(1, Math.min(ohlc.length - 2, Math.floor(market.cutIndexBase / factor)));
 // Coordinated simulated time axis: each candle is `timeframe` apart, anchored
 // (midnight-aligned, varied per seed) so the dates/times line up with the TF.
 const stepMs   = (_TF_HOURS[timeframe] || 24) * 3600 * 1000;
 const anchorMs = Date.UTC(2024, 0, 1) + ((market.seed || 1) % 200) * 86400000;
 const labels = ohlc.map((_, i) => _simFmtTime(new Date(anchorMs + (i - cutIndex) * stepMs), timeframe));
 return {
 ohlc, labels, cutIndex,
 markLines: [{ yAxis: +market.keyLevel.toFixed(2), label: market.patternLabel, color: '#00d4d4' }],
 source: 'simulation',
 meta: { pattern: market.pattern, timeframe, seed: market.seed }
 };
}

// Convenience wrapper — keeps old call sites working. Defaults to '1d'.
function generateScenario(simPattern, seed, timeframe) {
 return viewMarket(generateMarket(simPattern, seed), timeframe || '1d');
}

// Exports (plain-script global access — no modules)
window.mulberry32 = mulberry32;
window.baseWalk = baseWalk;
window.aggregateCandles = aggregateCandles;
window.generateMarket = generateMarket;
window.viewMarket = viewMarket;
window.generateScenario = generateScenario;
