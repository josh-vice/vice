# Chart Vocabulary (Layer 2 of 3)

**Named, hand-built, idealized chart primitives, authored once and reused everywhere.**
Lessons reference these by name and pass annotations; the geometry lives here, so the
same move draws the same correct way in every lesson. Implemented in
[`chart-vocabulary.js`](chart-vocabulary.js), exposed as `window.LTChartVocab`.

## Non-negotiables for every primitive

- **Ticker-free.** No coins, exchanges, or real prices. The price axis is abstract
  units around an arbitrary baseline; the renderer prints **no numbers** on it.
- **Deterministic.** No seed or randomness a lesson can see. Same name + params →
  byte-identical geometry every load (verified: OHLC validity + fixed anchors).
- **Self-describing.** A move returns not just candles but **named anchors** (levels &
  points) and named **stages** (reveal checkpoints). Content annotates by anchor name
  and reveals by stage name, so content never touches an index, a price, or a pixel.

## How geometry is built

Candles grow from **legs** — a vendored copy of the site's `ltCandles` idea: continuous
crypto-style candles where each open = the previous close, walking toward a target over
N bars, with an optional `reject` wick at a swing. Where a move needs an exact shape
(e.g. a sweep candle with a long lower wick on an up-candle, which `reject` can't make),
one candle is hand-placed and spliced in. The `ltCandles` logic is **vendored, not
imported**, so v2 has zero external dependencies.

## What a move returns

```js
// chart move
{
  candles : [[open, close, low, high], ...],   // OHLC, oldest → newest
  anchors : { name: {type:'level', price} | {type:'point', i, price}, ... },
  stages  : { name: revealCount, ... },         // how many candles are shown at that stage
  order   : ['setup','approach','sweep','reversal'],
  yhint   : { min, max }                         // axis padding hint
}

// candle move
{
  ohlc    : [o, c, l, h],
  regions : { name: { from, to }, ... },         // price bands the lesson can label
  anchors : { name: {type:'point', i, price}, ... }
}
```

`LTChartVocab.get(kind, name, params?)` returns a fresh geometry object;
`LTChartVocab.has(kind, name)` checks existence. `kind` is `'chart'` or `'candle'`.

---

## Charts

### `range_bound`
A clean sideways range with a defined high and low. Grounds "pools sit just beyond the
range edges."

- **anchors:** `high` (level), `low` (level)
- **stages:** `all`
- **params:** none

### `liquidity_sweep_bullish`
Structure **above** a support level → price returns to support → **sweeps below** it
with a long lower wick (grabbing the liquidity resting under the level) → reverses up
hard. A bullish SFP.

- **anchors:** `support` (level) · `firstTest` (point — the prior bounce low) ·
  `sweepLow` (point — the wick low below support) · `reclaim` (point — close back above) ·
  `reversalTop` (point)
- **stages:** `setup` → `approach` → `sweep` → `reversal`
- **params:** none

### `liquidity_sweep_bearish`
Mirror image. Structure **below** a resistance / range high → price returns → **sweeps
above** with a long upper wick → reverses down hard. A bearish SFP.

- **anchors:** `resistance` (level) · `firstTest` (point — the prior rejection high) ·
  `sweepHigh` (point — the wick high above resistance) · `reclaim` (point — close back
  below) · `reversalBottom` (point)
- **stages:** `setup` → `approach` → `sweep` → `reversal`
- **params:** none

> The bullish and bearish sweeps are deliberate mirrors with parallel anchor/stage
> names, so a lesson (or an editor) reasons about both the same way.

### Course 1 charts (foundations)

| move | what it draws | anchors | stages | params |
|------|---------------|---------|--------|--------|
| `uptrend` | higher-high / higher-low staircase | `start` `high1` `hl1` `hh1` `hl2` `hh2` (points), `flipLevel` (level) | `all` | — |
| `downtrend` | lower-high / lower-low staircase | `start` `low1` `lh1` `ll1` `lh2` `ll2` (points), `flipLevel` (level) | `all` | — |
| `horizontal_sr` | a flat level tested 3× then a reaction | `level` (level), `touch1..3` (points) | `all` | `as: 'support'` (default) `\| 'resistance'` |
| `sr_flip` | resistance breaks → retests as support → runs | `level` (level), `test1` `breakout` `retest` `top` (points) | `tests → breakout → hold → run` | — |
| `trendline_support` | rising diagonal of higher lows | `touch1..3` `top` (points) | `all` | — |
| `trendline_resistance` | falling diagonal of lower highs | `touch1..3` `bottom` (points) | `all` | — |
| `consolidation_breakout` | tight range that resolves with an impulse | `rangeHigh` `rangeLow` (levels), `breakout` (point) | `consolidate → breakout` | `dir: 'up'` (default) `\| 'down'` |
| `trade_setup_long` | risk-mgmt diagram: entry/stop/target + a 2:1 path | `entry` `stop` `target` (levels) | `plan → play` | — |
| `candle_story` | a hand-built 9-candle sequence stringing the single-candle lessons together (doji → marubozu → reversal …) | `sellers1` `buyers1` `sellers2` `pause` (points) | `all` | — |

`uptrend`/`downtrend` carry `flipLevel` (the first swing point that later acts as
support/resistance) so the same move serves both the trend lesson and the
market-structure / break-of-structure lessons.

### Course 2 charts (toolbox)

| move | what it draws |
|------|---------------|
| `engulfing_bullish` / `engulfing_bearish` | 2-candle engulfing (opt. `{volume:true}` → spike bar) |
| `morning_star` / `evening_star` | 3-candle star reversals with the midpoint level |
| `three_white_soldiers` / `three_black_crows` | 3-candle continuation runs |
| `rising_wedge` / `falling_wedge` | converging wedges (trendline anchors `upperA/B`, `lowerA/B`, breakout) |
| `head_and_shoulders` / `inverse_head_and_shoulders` | reversal with `neckline` + `target` levels |
| `ascending_triangle` / `descending_triangle` | flat side + diagonal, with `breakout`/`breakdown` |
| `bull_flag` | pole + flag + breakout |
| `fibonacci` | impulse + golden-pocket retracement levels (`fib382/500/618/786`) |
| `ichimoku` | **Tenkan `#5cc8ff` / Kijun `#ffcf3f` / green-red Kumo cloud** (overlays + `cloud`) |
| `rsi` | RSI sub-panel (30/70 bands) with bearish divergence |

All classical-pattern moves carry the declining-then-spiking `volume` profile.

### Course 3 charts

| move | what it draws |
|------|---------------|
| `liquidation` | entry/stop + safe & danger liquidation lines (leverage teaching) |

### Course 4 charts (liquidity theory)

| move | what it draws |
|------|---------------|
| `funding_rate` / `future_basis` | topping price + **histogram** sub-panel (funding/basis extreme at the top) |
| `open_interest` / `cumulative_delta` | topping price + **line** sub-panel (OI / delta divergence) |
| `color_tool` | `{scheme}` colours each candle via `schemeColors` — the real **Crayons / Trend Buddy / Genie / PAL / Heuristics** palettes; `resLevel`/`supLevel` for the level tools |
| `fsvzo` | volume-zone histogram oscillator |
| `liquidation_levels` | liquidation clusters (`clusterHi/Lo`) as price magnets + cascade |

Renderer sub-panel types in use: `volume` (bars), `rsi`/`line` (line + reference bands),
`histogram` (bars around a zero line, teal positive / red negative).

## Candles

### `bullish_sweep`
The sweep-and-reclaim compressed into one candle: a long lower wick (the liquidity grab)
under a strong bullish body (the reversal). The single-candle signature the worked
example resolves to.

- **regions:** `lowerWick` (the sweep) · `body` (the bullish reversal)
- **anchors:** `low` (point) · `close` (point)

### Course 1 candles (the single-candle vocabulary)

| move | shape / meaning | regions | anchors |
|------|-----------------|---------|---------|
| `anatomy` | a normal candle for teaching the four components | `upperWick` `body` `lowerWick` | `high` `open` `close` `low` |
| `doji` | tiny body, wicks both sides — indecision | `upperWick` `body` `lowerWick` | `body` `high` `low` |
| `marubozu_bullish` | full bullish body, no wick — buyers in control | `body` | `open` `close` |
| `marubozu_bearish` | full bearish body, no wick — sellers in control | `body` | `open` `close` |
| `long_upper_wick` | small body near the low, long upper wick (shooting star) — buyer exhaustion | `upperWick` `body` `lowerWick` | `high` `body` |
| `long_lower_wick` | small body near the high, long lower wick (hammer) — seller exhaustion | `lowerWick` `body` `upperWick` | `low` `body` |

---

## Parameters

Most moves are fixed idealized shapes and take no params. A few now accept one where a
real lesson needed a variant: `horizontal_sr({ as })`, `consolidation_breakout({ dir })`.
`get()` threads a `params` object through to every move, so any move can later accept
tuning (e.g. `range_bound({ touches: 5 })`) **without any change to content or renderer**.
Add a param only when a lesson needs the variant, and document it here.

## Annotation kinds the renderer draws

Vocabulary geometry is inert until a lesson annotates it. The renderer resolves these
`show` kinds against a move's anchors (see FORMAT.md): `level`, `zone` (optional
`tone: 'risk' | 'reward'` to override the default supply/demand colours), `marker`,
`note`, `trendline` (connects two point anchors; `style: 'support' | 'resistance'`), and
`region` (candle beats only).

## Growing the library (the discipline)

Start with only the moves the current module needs; add a move when a later module
demands it. This module needed exactly four: `range_bound`, `liquidity_sweep_bullish`,
`liquidity_sweep_bearish`, `bullish_sweep`.

To add a move:

1. Implement it in `chart-vocabulary.js` under `CHARTS` or `CANDLES`, returning the
   shape above. Keep it ticker-free and deterministic.
2. Expose clear, intention-named anchors and stages (lessons will read these names).
3. Document it here with its anchors, stages, and params.

Obvious near-term additions when a module calls for them: `bearish_sweep` (the upper-wick
mirror candle), `sr_flip`, `bull_flag`, `head_and_shoulders`, `doji`, `marubozu`.
None are built yet — by design.
