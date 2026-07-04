# Liquidity Theory — Brand Kit (for Discord banners & graphics)

> A practical brand reference for generating on-brand banners, splash images, event
> covers, emoji and other graphics for the Discord server. Everything here is pulled
> from the live product (`PRODUCT.md`, the design tokens in `lt-settings.js` /
> `lt-tokens.js`, and the brand assets in the repo). Copy-paste prompts are at the end.

---

## 1. At a glance

| | |
|---|---|
| **Name** | Liquidity Theory |
| **Site** | liqtheory.com |
| **Tagline** | "Learn to Trade Crypto, Free" |
| **Hero line** | "Learn to trade crypto, **one candle at a time.**" |
| **Publisher line** | "A Vice Terminal Product" |
| **Aesthetic** | **Vice Terminal** — Miami-Vice teal + pink on near-black, mono type |
| **Three words** | confident · terminal-native · neon-but-grounded |
| **Mascot** | **Perpingo** — a pink flamingo (perp + flamingo). *Never call it "pepe."* |
| **What it is** | A free, no-account web app that teaches crypto technical analysis via animated, narrated lessons |

---

## 2. Personality & voice

Confident and **terminal-native**, with restrained neon play. The register sits deliberately
**between "neon-playful" and "data-serious": credible first, personality second.** A sharp mentor
who is serious about the material — never hyped, occasionally playful.

**Voice for any copy on a graphic:** direct, plain-spoken, expert without arrogance. Calm conviction,
not adrenaline. Sentence case, not SHOUTING.

### Do
- Lead with clarity and craft. One clear idea per graphic.
- Use real charting language (support, liquidity, structure, edge).
- Let the neon + near-black do the work; keep layouts calm and focused.

### Don't (anti-references — these are off-brand)
- ❌ Hype / crypto-bro / get-rich-quick — **no moon, lambo, rocket, 100x, FOMO, "🚀"** energy.
- ❌ Childish / over-gamified — **no confetti, no badge-spam**, no patronizing tone.
- ❌ Generic navy/gray **SaaS-dashboard template** look.
- ❌ Cluttered, data-overload screens. Favor focus and whitespace (well, *blackspace*).
- ❌ Fake-guru certainty or urgency mechanics.

---

## 3. Color palette

The brand lives on a **near-black canvas** with **teal + pink neon** as the twin leads, gold as the
accent. This is the same "VIZ" trading palette used across the app's charts.

### Core (use these for ~90% of graphics)

| Role | Hex | RGB | Notes |
|---|---|---|---|
| **Canvas / background** | `#08070f` | 8, 7, 15 | Near-black, very slightly purple. The default surface. |
| Surface step 2 | `#0d0b18` | 13, 11, 24 | Cards / panels |
| Surface step 3 | `#14121f` | 20, 18, 31 | Raised panels |
| **Teal (primary / bullish)** | `#00d4d4` | 0, 212, 212 | Buy · support · "up." The hero neon. |
| **Pink (secondary / bearish)** | `#ff2e88` | 255, 46, 136 | Sell · resistance · "down." The co-lead. |
| **Gold (liquidation / highlight)** | `#ffcc00` | 255, 204, 0 | Sparingly — emphasis, "liquidity," call-to-action sparkle. |
| Amber (heatmap density) | `rgb(255,190,40)` | 255, 190, 40 | Heat / intensity fills |

### Accents (course identities & support roles)

| Role | Hex | Where it's used |
|---|---|---|
| Purple | `#a855f7` | Course 3 accent; tertiary neon |
| Coral | `#ff7a4d` | Course 2 accent; warm highlight |
| Green | `#21d196` | "positive / correct" (distinct from teal) |
| Warm gold (UI) | `#e7b53a` | Neutral magnitude lines, subtle gold UI |

**Course color coding** (handy for course-specific graphics):
- **Course 1 — Foundations:** teal `#00d4d4`
- **Course 2 — Toolbox:** coral `#ff7a4d`
- **Course 3 — Sharpening Your Edge:** purple `#a855f7`
- **Course 4 — Liquidity Theory:** pink `#ff2e88`

### Text / neutrals (on the dark canvas)

| Role | Hex |
|---|---|
| Primary text | `#f6f5fb` (near-white) |
| Secondary text | `#a8a3bb` (muted lavender-gray) |
| Tertiary text | `#8b85a3` |
| Hairline borders | `#272235` → `#4b4566` |

### Neon glow recipes (for that Vice-Terminal bloom)
- Teal glow: `0 0 20px rgba(0,212,212,0.28)`
- Pink glow: `0 0 20px rgba(255,46,136,0.28)`
- Keep glows soft and tight — a halo, not a smear.

### Discord brand color (for partner/platform lockups)
- Discord blurple: `#5865F2`

> **Contrast rule:** white/near-white text on the near-black canvas. On the pink, use **white** text;
> on teal/gold, use **dark** (`#08070f`) text. Avoid mid-gray text on dark — it muddies.

---

## 4. Typography

**One typeface, on purpose: `JetBrains Mono`.** The single monospace family *is* the terminal-native
voice — don't mix in a second display font.

- **Family:** JetBrains Mono (fallbacks: `ui-monospace, SF Mono, Menlo, monospace`)
- **Weights:** Regular (body), SemiBold/Bold (headings, numbers)
- **Casing:** **sentence case** for headings. Avoid ALL-CAPS tracked "eyebrow" labels — they read as
  an AI/template tell and were deliberately removed from the product.
- **Numbers/tickers** look great in mono — lean into price-like figures (`$5,500`, `2:1 R`, `0.382`).
- **One gradient phrase max:** the brand permits a *single* teal→pink neon gradient phrase as a focal
  moment (like "one candle at a time"). Everything else stays solid color.

If JetBrains Mono isn't available in your image tool, ask for "a clean geometric **monospace** typeface,
terminal/IDE style."

---

## 5. Logo & marks

- **Primary logo:** `lt-logo.svg` — an **ascending candlestick mark** built from rounded-rect candle
  bodies + thin wicks, in **bright aqua-teal `#16E9D0`** and **off-white `#F2F4F4`**. Reads as an
  uptrend / "the chart going up." (Note: the logo's teal `#16E9D0` is a hair brighter than the system
  teal `#00d4d4` — both are on-brand; use system teal for everything else.)
- **Vice Terminal flamingo mark:** `vice-terminal.png` — the publisher/flamingo logo; pairs with the
  "A Vice Terminal Product" line.
- **Social card reference:** `og-image.png` (1200×630) and `og-card.svg` show an approved lockup.

**Candlestick convention (keep it correct — traders will notice):**
- **Up candles = hollow** (outline only) in **teal**.
- **Down candles = filled solid** in **pink**.
- Thin wicks, clean rounded bodies.

**Clear space & don'ts:** give the logo room equal to one candle-width on all sides; don't recolor it
off-palette, don't add drop-shadows beyond a soft neon glow, don't stretch it.

---

## 6. Mascot — Perpingo

- **Perpingo** = "perp" + "flamingo": a **pink flamingo** mascot in the brand's pink neon art style.
- **Never** refer to it as "pepe."
- Existing art (1254×1254 PNGs, transparent): `perpingo-laptop.png`, `perpingo-cap.png`,
  `perpingo-builder.png`, `perpingo-brain.png`, `perpingo-ninja.png` — reuse these directly in graphics
  rather than regenerating when possible (keeps the character consistent).
- Personality: human, un-stuffy, a little playful — the warmth that balances the terminal precision.
  Keep it grounded; the mascot serves the message, it isn't the whole graphic.

---

## 7. Visual motifs & textures

Reach for these to make a graphic unmistakably Liquidity Theory:

- **Candlestick charts** — idealized, **ticker-free** (no real coin names/logos). Clean teal/pink candles.
- **Faint candle-grid backdrop** — a subtle grid of low-opacity lines over the near-black, like a chart
  canvas (the site uses a `~44px` grid with faint teal/pink/purple radial glows in the corners).
- **Soft neon bloom** — tight glow on candles, the logo, and the one focal phrase.
- **Terminal cues** — mono type, hairline borders, the occasional cursor/scanline — restrained, not gimmicky.
- **Depth** — near-black base, slightly lighter cards, neon as the only saturated color. High contrast,
  lots of negative (black) space.

---

## 8. Discord asset specs (target sizes)

| Asset | Size (px) | Notes |
|---|---|---|
| Server icon | 512 × 512 | Keep the mark centered; works as a circle. PNG (or animated GIF on boosted servers). |
| **Server banner** | **960 × 540** (16:9) | Top of the channel list. |
| Invite splash background | 1920 × 1080 | Shown on the invite screen; keep key art off the lower-left (invite UI overlays it). |
| Event cover image | 800 × 320 | |
| Welcome / announcement graphic | 1920 × 1080 or 1200 × 630 | General-purpose. |
| Custom emoji | 128 × 128 | Displays tiny (~32px) — must read at small size. Transparent PNG. |
| Sticker | 320 × 320 | Transparent PNG/APNG. |
| Role icon | 64 × 64 | Simple, single-subject. |

Design tip: keep critical text in the **center-safe area** and large; Discord crops/overlays edges.

---

## 9. Ready-to-use image-generation prompts

Paste these into your image generator (Midjourney, DAL·E, etc.). Start from the **style block**, then
append the specific scene. Add the **negative prompt** to stay on-brand.

### ⭐ Reusable style block (prepend to any prompt)
```
Vice-Terminal aesthetic: Miami-Vice neon on a near-black #08070f canvas, twin neon leads
teal #00d4d4 and hot pink #ff2e88 with sparing gold #ffcc00 accents; clean idealized
candlestick chart motifs (hollow teal up-candles, solid pink down-candles), a faint
44px chart grid with soft corner glows, tight neon bloom; JetBrains-Mono / terminal
typography, sentence case; high contrast, lots of black negative space; confident,
credible, premium — a sharp trading terminal, not a hype poster. 8k, crisp, flat-but-glowing.
```

### Negative prompt (append to all)
```
no lambo, no rocket, no moon, no 🚀, no get-rich-quick, no FOMO, no "100x", no gold coins
piles, no confetti, no badges, no generic navy/gray SaaS dashboard, no clutter, no real coin
logos or tickers, no stock-photo people, no childish cartoon style, no all-caps tracked labels.
```

### Server banner (960×540)
```
[STYLE BLOCK] Wide 16:9 Discord server banner for "Liquidity Theory". An ascending
teal-and-pink candlestick chart sweeping left-to-right across a near-black grid, soft neon
glow; the wordmark "LIQUIDITY THEORY" in clean white monospace, lower third, with the single
phrase "one candle at a time" as a small teal→pink gradient accent. Calm, premium, lots of
dark space. 960x540.
```

### Invite splash (1920×1080)
```
[STYLE BLOCK] Cinematic 16:9 invite background. A glowing idealized candlestick chart rising
toward an upper-right target on a near-black grid, faint teal and pink corner glows, a thin
gold "liquidity" level line. Minimal text. Key art kept center/right so the invite UI in the
lower-left stays clean. 1920x1080.
```

### Event cover (800×320)
```
[STYLE BLOCK] Slim 5:2 event banner. Left: bold white monospace event title (sentence case).
Right: a tight teal/pink candlestick cluster with neon bloom on a near-black grid. One gold
accent. 800x320.
```

### Welcome / announcement card (1200×630)
```
[STYLE BLOCK] Welcome graphic featuring Perpingo, a friendly pink flamingo mascot in neon
brand style, standing beside a small glowing candlestick chart on a near-black grid; headline
space top-left in white monospace. Warm but premium, terminal-native. 1200x630.
(If possible, composite the existing perpingo-laptop.png rather than redrawing the mascot.)
```

### Server icon (512×512)
```
[STYLE BLOCK] App-icon: the ascending candlestick "LT" mark in bright aqua-teal #16E9D0 and
off-white, centered on a near-black rounded-square with a tight teal neon glow. Simple, reads
at small sizes, works cropped to a circle. 512x512.
```

### Emoji / role-icon ideas (128×128 / 64×64, transparent)
```
[STYLE BLOCK] Single-subject icon on transparent background, bold and legible at 32px:
- a single hollow teal up-candle
- a single solid pink down-candle
- a tiny gold "liquidity" level tag
- a minimal Perpingo flamingo head
```

### Tips for legible text in generated art
- Generators mangle long text — keep on-image words to **1–4 words**, or add the wordmark yourself
  afterward (place `lt-logo.svg` / type "Liquidity Theory" in JetBrains Mono).
- Ask for "**space left for a headline**" and overlay copy in your editor for crisp type.
- Reuse the real `perpingo-*.png` and `lt-logo.svg` assets by compositing — most reliable way to keep
  the mascot and mark exactly on-brand.

---

## 10. One-line cheat sheet

> Near-black `#08070f` + **teal `#00d4d4`** & **pink `#ff2e88`** neon (+ gold `#ffcc00`), JetBrains
> Mono, ascending teal/pink candlesticks on a faint grid, soft glow, sentence case, calm & credible.
> Mascot = **Perpingo** the pink flamingo. Never hype-y, never cluttered. *"A Vice Terminal Product."*
