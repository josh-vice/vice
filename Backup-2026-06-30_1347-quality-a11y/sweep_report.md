# sweep_report.md — Liquidity Theory audit/fix/polish sweep

Date: 2026-06-15. Pairs with `audit.md` (evidence-first defect log) and `rebuild/recon/qa_report.md`
(animated-player depth pass). All changes local, **not deployed**. 0 console errors throughout.

## 1. Resolutions (every logged defect)

| ID | Issue | Resolution | Verified |
|---|---|---|---|
| **N1** | 95× `'JetBrains Mono', sans-serif` fallback → terminal aesthetic collapses to sans if the web font fails | Replaced the fallback with `monospace` across `lt-styles.css`, `lt-engine.js`, `lt-sim-ui.js`, `lt-settings.js`, `lt-flashcards.js`, `lt-community.js`, `lt-glossary.js`, and `index.html` (×3). `Inter, sans-serif` (the alternate-font option) left intact. | Live: `getComputedStyle(body).fontFamily` = `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`; **0** elements compute a `Mono…sans-serif` family; `document.fonts.check('12px "JetBrains Mono"')` = true. `node --check` clean on all JS. |
| **N2** | `.lt-gallery-wrap` used `system-ui … sans-serif` | → full mono stack (double-quoted to stay valid inside the single-quoted CSS-string array) | `node --check lt-gallery.js` OK; 0 `system-ui` left |
| K1–K9 | The brief's "known carried issues" | **No code change needed — already resolved.** See `audit.md §2` for the per-item evidence (settings cover all 4 courses; range/sweep injectors correct; both OHLC tooltips correct incl. index-offset; pattern selector is a grouped `<select>`; seeded shuffle correct + unbiased; 0 Barlow refs; colour constants consistent; light theme complete). | Node harnesses + live probes |

**Cache-bumped** in `lt-index.html`: `lt-styles.css 1.97.0→1.97.1`, `lt-gallery.js 1.3.0→1.3.1`,
`lt-settings.js 1.28.0→1.28.1`, `lt-sim-ui.js 1.15.10→1.15.11`, `lt-glossary.js 1.18.0→1.18.1`,
`lt-flashcards.js 1.9.2→1.9.3`, `lt-community.js 1.10.3→1.10.4`, `lt-engine.js 3.80.0→3.81.0`.
(`index.html` is served no-cache — no bump needed.) **Shared-engine edits flagged for review:** the
N1 fallback change touched `lt-engine.js` chart-label `fontFamily` strings — purely the fallback
token (`sans-serif`→`monospace`), no behavioural change.

## 2. Responsive results (rendered + inspected at real widths)

| View | Mobile 375 | Laptop 1280 | Notes |
|---|---|---|---|
| Chapter (intro/lesson) | ✅ no h-scroll; definition rows, Lesson/Candles tabs, big labelled Back/Next; mono throughout | ✅ sidebar 230 / content 1050; no h-scroll | — |
| Animated player | ✅ mounts, captions + transport legible at 375 | ✅ (prior session: 9 modules verified) | canvas resizes to container (ECharts `resize` on viewport change) |
| Simulator | ✅ candles legible, axis labels readable, 2×2 stat grid, pattern `<select>` 180px fits (right 209 < 375), no overflow | ✅ | the old pattern-selector cut-off is gone (native dropdown) |
| Glossary | ✅ (mobile header rules from prior sessions) | ✅ term cards + SVG figures, category pills, no overflow | — |
| Document scroll width == viewport width at both breakpoints (no horizontal overflow anywhere checked). |

## 3. Player (animated lesson) — carried from this session's earlier pass
Full detail in `rebuild/recon/qa_report.md`. Summary: the transcript-reactive **cue track** is live
on all 46 chart modules (1,653 grounded cues); **9 modules verified live across all 4 courses**
(HTF/LTF Scenario, Liquidity/Ichimoku/Liquidation/Range/Volume/Classical scenarios + a concept
module), accents fire on the spoken beat, indicator overlays (Ichimoku/Fib/RSI) coexist with cues,
0 console errors. Remaining 37 chart modules: generated + load-verified, not yet individually walked.

## 4. Performance results (measured, not assumed)
- **Interaction latency:** chapter step-nav `goToStep` = **17 ms**; full view switch (`showGlossary`,
  builds 79 terms + 41 inline SVG figures) = **97 ms**. Both < the 100 ms target. The glossary
  rebuild is the heaviest single interaction (still under budget).
- **Load/runtime:** recon/timeline/cue data is **lazy-loaded per active course** (3 `<script>`
  injections gated on first chapter visit), so initial paint isn't blocked by the ~0.5–0.9 MB/course
  recon payload; the engine is `defer`-loaded; the lesson player preloads each chunk's audio clip
  (`<audio preload="auto">`). Web font uses `&display=swap` (no FOIT) with preconnect.
- **Animations:** chart reveals are one-shot ECharts canvas tweens (`cubicOut`, ~220–460 ms);
  scene crossfades use `opacity` transforms (GPU-friendly). 0 console errors / no thrown frames in
  the probed sessions.

## 5. Left / deferred (with reason)
- **Glossary view-switch ~97 ms.** Under budget but the heaviest rebuild (41 synchronous SVG
  figures). Optional future win: lazy-render figures on scroll. *Deferred — within target, not a
  regression.*
- **37 of 46 cue-track modules not yet individually walked in preview** (generated + load-verified).
  *Deferred — depth-first continuation; priority list in `rebuild/recon/qa_plan.md §C`.*
- **C2 Oscillators divergence** still needs price+RSI constructed to actually diverge (generator
  addition). *Pre-existing, queued.*
- **Vercel redeploy** of the large local-only backlog. *Pre-existing, queued — nothing here is
  deployed.*

## 6. Net
Evidence-based pass over the whole app. The brief's defect list was already resolved in current
code (proven, not assumed); the one real systemic defect — the sans-serif font fallback undermining
the terminal aesthetic — is fixed sitewide and verified. Responsive (375 + 1280) and latency
(<100 ms) targets hold against live measurement; 0 console errors.
