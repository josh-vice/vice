# Product

## Register

product

## Users

Self-directed crypto traders — mostly beginners moving toward early-intermediate — who want to
actually understand technical analysis rather than chase signals. The app is **free and requires no
account**; all progress lives in the browser (localStorage), so users dip in and out across short
sessions, on desktop or phone. They are motivated but skeptical: many have been burned by hype and
distrust "guru" content. The job to be done: **learn TA concepts well enough to apply them** — reading
price action and market structure, using indicators, understanding liquidity and risk — not just watch
and forget. The primary surface is the learning app (`lt-index.html`: sidebar course nav, animated
lessons, quizzes, settings, browser-local progress). A separate marketing landing (`index.html`) feeds it.

## Product Purpose

A free, no-account web app that teaches crypto technical analysis through **animated, narrated lessons
and quizzes** across four courses (Foundations → Toolbox → Sharpening Your Edge → Liquidity Theory). It
exists to turn passive video-watching into genuine comprehension: every concept is shown on an
idealized, ticker-free chart that **builds as the narration explains it**, so the visual and the words
always agree. Success is three-fold and reinforcing: learners (1) **genuinely learn** TA they can
apply, (2) **progress through and finish** the courses, and (3) **trust it as credible, high-quality**
material — a serious alternative to scattered free YouTube content.

## Brand Personality

Confident and **terminal-native**, with restrained neon play. The "Vice Terminal" aesthetic — Miami-Vice
teal + pink on near-black, JetBrains Mono — signals craft and seriousness; the Perpingo flamingo mascot
and the neon palette keep it human and un-stuffy. The register sits deliberately **between "neon-playful"
and "data-serious": credible first, with personality second.** Voice: direct, plain-spoken, expert
without arrogance — a sharp mentor who is serious about the material, never hyped, occasionally playful.
Three words: **confident · terminal-native · neon-but-grounded**.

## Anti-references

- **Hype-y crypto-bro / get-rich-quick.** No moon/lambo/rocket energy, no FOMO urgency, no "100x"
  shilling, no fake-guru certainty. Calm conviction, not adrenaline.
- **Childish / over-gamified.** No confetti-and-badges everywhere, no patronizing tone. Progress and
  momentum cues stay subtle and in service of learning, never the point.
- (Carry-overs from the aesthetic, not chosen but worth stating) Generic navy/gray **SaaS-dashboard
  template** look, and **cluttered data-overload** screens. Favor focus and one clear idea at a time.

## Design Principles

1. **Comprehension over completion.** Optimize for concepts that stick, not just progress bars. Every
   visual must teach; if it only decorates, cut it.
2. **Show, don't tell.** Pair every claim with a chart that builds as the narration explains it. Abstract
   ideas get idealized, ticker-free visuals so the lesson is the structure, not a specific coin.
3. **Credible, never hyped.** Earn trust through clarity and restraint — the opposite of crypto-twitter.
   No urgency mechanics, no shilling, no overclaiming.
4. **Terminal craft, human warmth.** The Vice-Terminal precision signals quality; the mascot and neon
   keep it approachable. Personality serves the learning; it never becomes noise.
5. **Free and frictionless.** No account, no paywall, progress in the browser, works on a phone. Respect
   the learner's time, attention, and bandwidth.

## Accessibility & Inclusion

Target **WCAG AA**. Already in place and to be upheld: `prefers-reduced-motion` honored across lesson and
UI animations; visible `:focus-visible` states and aria labels/roles on controls; **light and dark
themes**; **user-selectable candle colors** (cyan up / pink down by default, with alternates) which
doubles as a color-vision accommodation; a readable mono type with an Inter alternative; a per-learner
**caption-size setting** (phones auto-use the smallest); keyboard navigation in the lesson player
(←/→ beats, ↑/↓ steps, Space play-pause). Maintain ≥4.5:1 contrast for body text — watch muted-gray on
tinted surfaces in particular — and keep captions legible at the smallest size on small screens.
