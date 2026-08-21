# Vice Terminal — Vercel Deployment Runbook

Vice Terminal is a PWA-first SvelteKit app deployed to its **own Vercel project**.

This runbook documents the exact project settings and environment variables by
**name only** — no values. Secrets and values are managed in the Vercel
dashboard and never committed. **This card does not deploy anything**; this
document exists so a human can deploy the reviewed artifact correctly.

## Project topology

- Repo: `josh-vice/vice` (private), branch `viceterminal`.
- **Root Directory: `vice-terminal`** (the terminal is its own deployable).
  The root `vercel.json` belongs to the legacy ViceSuite static site and must
  NOT be reused as the terminal artifact.
- Build output: the `@sveltejs/adapter-vercel` build emits `.vercel/output`
  (static assets under `static/`, one function per route under `functions/`).
- The Rust gateway is never deployed. Browser-local signing/execution remains
  authoritative; the served surface is the SvelteKit SSR app + `/api/*` routes
  only.

## Project settings (Vercel dashboard, Project → Settings)

| Setting | Value |
| --- | --- |
| Framework Preset | **Vite** (SvelteKit is detected from `svelte.config.js`) |
| Root Directory | `vice-terminal` |
| Build Command | `bun run build` (bun is auto-detected via `package.json` `packageManager`) |
| Output Directory | `.vercel/output` (adapter default; leave empty) |
| Install Command | `bun install` |
| Node.js Version | **20.x** (matches `svelte.config.js` default runtime) |
| Build System | Vercel (default) |
| Vercel Functions runtime | Node.js 20.x (SSR only; no edge/ISR) |

> Root Directory `vice-terminal` is the single most important setting. Pointing
> the project at the repo root would build the legacy static site instead.

## Environment variables (names only)

Set these in **Project → Settings → Environment Variables**. Values are
deployment-time secrets/configuration and are intentionally absent here.

| Name | Purpose | Applies to |
| --- | --- | --- |
| `VITE_HL_NETWORK` | Network selection for the Hyperliquid client | Production + preview |
| `VITE_HL_TESTNET` | Legacy testnet flag (deprecated alias) | Production + preview |
| `VITE_HL_MAINNET_ACK` | Explicit mainnet acknowledgment (fail-closed promotion) | Production only |
| `VICE_FUNDED_TESTNET_EVIDENCE` | Path to funded testnet evidence manifest (release gate) | Production only |
| `VICE_LATENCY_EVIDENCE` | Path to client latency telemetry (release gate) | Production only |
| `VICE_MAINNET_ALLOWLIST` | Allowlisted pilot addresses for mainnet | Production only |
| `VITE_HL_ENABLE_BUILDER_REVENUE` | Enable optional builder/referral revenue | Production only |
| `VITE_HL_BUILDER_ADDRESS` | Builder fee recipient (only if revenue enabled) | Production only |

**No signing keys, vault paths, or credential values are ever stored in Vercel
env.** Wallet/agent keys live inside the browser-local encrypted vault. Do not
add `owner.json`, `taker.json`, or any private key as an env var or file.

## Deployment flow (human-gated)

1. Check out `viceterminal`, run the gate suite from repo root: `bun run check`
   then `bun run test:release`. The release gate includes the PWA artifact and
   production header tests (`test:pwa`).
2. Build the terminal artifact and run the PWA artifact boundary test:
   `cd vice-terminal && bun run build && bun test scripts/pwa-artifact.test.mjs`
   — confirms the served artifact contains the PWA shell and excludes internal
   trees/signer scripts.
3. Push `viceterminal`. Vercel builds the **production** branch.
4. In the dashboard, deploy the production branch to the configured project
   (or rely on the GitHub integration). Preview deployments behave identically
   for routing/CSP/headers; the network env (`VITE_HL_NETWORK`) governs
   testnet vs mainnet.
5. Smoke the deployed URL:
   - `GET /api/meta` returns `{name, version, testnet, network}` (diagnostics-safe).
   - The page registers `/service-worker.js`; a second deploy surfaces the
     "UPDATE AVAILABLE" banner and reload applies it.
   - Go offline — the cached app shell loads and an OFFLINE banner appears;
     `/api/*` trading endpoints fail closed (no fabricated state).
   - Inspect headers on `/` (no-cache + security headers) and on a hashed
     `/_app/*.js` asset (immutable, long max-age).

## PWA update lifecycle (how a new build reaches users)

The service worker is registered manually (`$lib/pwa.ts`, not SvelteKit's
silent auto-registration). A deployed update:

1. Registers a new service worker that **precaches the new build** and waits.
2. The client detects the waiting worker and shows **UPDATE AVAILABLE**.
3. The user clicks **RELOAD**; the client posts `SKIP_WAITING`, the new worker
   activates, and the page reloads onto the new build.

No silent `skipWaiting` on install — a stale tab never hijacks an update, and
a user mid-trade is never force-reloaded.

## Offline behaviour

Navigations are network-first with a cached **real** app-shell fallback. The
shell is a previously-fetched SSR response — never synthesized data. Trading
and account endpoints (`/api/*`) are **never cached**; an offline client
shows the OFFLINE banner and keeps trading fail-closed.

## Rollback

Rollback is a normal re-deploy of the previous `viceterminal` build in the
dashboard ("Deployments → ⋯ → Redeploy" on the last known-good deployment).
Because the service worker precaches the current build and only activates on a
deliberate reload, a rollback that returns the old bundle is picked up by the
same update handshake on each client's next reload. No database migration or
secret rotation is required — the app is stateless and self-signing.

## Ownership & safety

- This file (`docs/VERCEL_DEPLOYMENT.md`) lives in the repo and is **not**
  deployed — it is documentation for the human operator.
- The terminal artifact is bounded and verified by
  `vice-terminal/scripts/pwa-artifact.test.mjs` (no source, signer, evidence,
  key, or credential trees served) and `vice-terminal/vercel.json` + CSP in
  `svelte.config.js`.
- **Never deploy or push to Vercel from CI.** Production deploys are a manual,
  human-gated action using this runbook after the reviewed artifact passes
  `bun run test:release`.
