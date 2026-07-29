# Liquidity Theory — iOS App

Capacitor shell around the existing website. **There is no separate iOS codebase** —
the website at the workspace root is the single source of truth, and every commit
automatically rebuilds the app's web bundle. Fix a bug on the site, commit, and the
app has it on the next build.

## How the auto-sync works

```
workspace root (website)          IOSApp/
  index.html, lt-*.js,   ─sync→    www/            ─cap copy→   ios/App/App/public/
  lt-styles.css, lessons-v2/       (generated,                  (inside the Xcode project)
                                    gitignored)
```

- `sync-www.sh` copies only the app's runtime files (no backups, docs, SEO pages,
  or Vercel config) into `www/`, strips the Vercel analytics tag, and runs
  `npx cap copy ios` to push the bundle into the native project.
- The git **post-commit hook** (`.git/hooks/post-commit`, tracked copy in
  `hooks/post-commit`) runs that sync after every commit. Hooks are local-only:
  on a fresh clone re-install with
  `cp IOSApp/hooks/post-commit .git/hooks/ && chmod +x .git/hooks/post-commit`.
- Manual sync any time: `cd IOSApp && npm run sync`.

## Current status (2026-07-21)

| Step | Status |
|---|---|
| Web bundle (`www/`, 167 MB) | ✅ built, auto-syncs on commit |
| Native Xcode project (`ios/`) | ✅ generated (Capacitor 7) |
| CocoaPods | ✅ installed via Homebrew |
| `pod install` | ⏳ **blocked — needs full Xcode** (only CLT is installed) |
| First build / App Store | ⏳ after Xcode |

## Next steps (in order)

1. **Install Xcode** from the Mac App Store (~15 GB), then:
   ```
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   cd IOSApp/ios/App && pod install
   ```
2. **First run:** `cd IOSApp && npx cap open ios`, pick a simulator, press Run.
   The full site should load in the shell. Test: lessons (audio!), simulator
   live feed, labs, localStorage progress persistence, safe-area insets on a
   notched-device simulator.
3. **Apple Developer Program** — enroll at developer.apple.com ($99/yr).
   Bundle ID is `com.liquiditytheory.app` (change in `capacitor.config.json`
   + Xcode if desired *before* first App Store upload; it's permanent after).
4. **App icon + launch screen** — 1024×1024 icon (no alpha) in
   `ios/App/App/Assets.xcassets`. Follow the LT clean/minimal brand, lucide
   iconography, no emoji.
5. **Native polish before submission** (App Review rejects bare website
   wrappers under guideline 4.2 "minimum functionality" — the interactive
   courses/labs/simulator give us a strong case, but add native value):
   - `@capacitor/splash-screen`, `@capacitor/status-bar` (dark styling)
   - `@capacitor/haptics` on quiz answers / sim fills
   - Offline is basically free: the whole course + audio ships in the bundle;
     make sure the live-BTC sim degrades gracefully with no network
   - Later: push notifications for streaks/new content
6. **App Store Connect** — create the app record, privacy policy URL (required),
   App Privacy questionnaire (currently: no data collected once the Vercel
   analytics tag is stripped — keep it that way if possible), screenshots
   (6.9" and 6.5" iPhone required), TestFlight beta, then submit.

## Rules for future sessions

- **Never edit files in `www/` or `ios/App/App/public/`** — they're overwritten
  on every sync. All web work happens at the workspace root.
- `www/` and `node_modules/` are gitignored; the `ios/` native project is
  tracked (except `Pods/`).
- If a new top-level runtime file is added to the site (new `lt-*.js` is
  covered; anything else is not), add it to the include list in `sync-www.sh`.
- App Review note: this is an *education* app. Do not add anything resembling
  actual trading, brokerage links, or financial advice — that moves it into
  App Store finance-app rules (guideline 3.1.5) and heavy review.
- Version bumps for releases happen in Xcode (`MARKETING_VERSION`), independent
  of website versioning.
