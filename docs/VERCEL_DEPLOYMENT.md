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
| `VITE_HL_TRADING_NETWORK` | Authoritative Hyperliquid trading network selector | Production + preview |
| `VITE_HL_NETWORK` | Legacy alias, accepted only when unambiguous | Production + preview |
| `VITE_HL_MAINNET_ACK` | Exact mainnet acknowledgment (fail-closed promotion) | Production only |
| `VICE_BETA_REQUIRED` | Durable beta gate switch | Production + preview |
| `VICE_BETA_SESSION_SECRET` | Server-only HMAC secret | Production + preview |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Durable beta sessions, revocation, and throttling | Production + preview |
| `VICE_RELEASE_POLICY_JSON` | Server-only wallet/action/venue caps and halt policy | Production only |
| `VICE_MAINNET_EVIDENCE` | Exact-build funded mainnet evidence manifest | Production only |
| `VICE_LATENCY_EVIDENCE` | Mainnet client latency telemetry | Production only |
| `VICE_MAINNET_ALLOWLIST` | Approved mainnet wallet addresses | Production only |
| `VICE_MAINNET_RELEASE_BUILD` | Full release build identity | Production only |
| `VICE_BETA_SUPPORT_OWNER` / `VICE_INCIDENT_OWNER` / `VICE_RELEASE_OWNER` | Named operational owners | Production only |
| `VITE_HL_ENABLE_BUILDER_REVENUE` | Enable optional builder/referral revenue | Production only |
| `VITE_HL_BUILDER_ADDRESS` | Builder fee recipient (only if revenue enabled) | Production only |

**No signing keys, vault paths, or credential values are ever stored in Vercel
env.** Wallet/agent keys live inside the browser-local encrypted vault. Do not
add `owner.json`, `taker.json`, or any private key as an env var or file.

## Deployment flow (human-gated)

1. Check out the exact release SHA and run `bun run test:release`. The aggregate
   writes `release/test-summary.json`; every hard check affects its exit status.
2. Build once, create `release/vice-manifest.json`, and verify it with
   `bun scripts/release-manifest.mjs --verify ... --expected-sha=<full-sha>`.
3. Publish that immutable artifact through the release workflow. Vercel builds
   must not rebuild from a different source revision.
4. Download and verify the artifact, deploy it behind the durable beta gate,
   then run `VICE_DEPLOYMENT_URL=<url> VICE_RELEASE_SHA=<full-sha> bun run test:deployed`.
5. Smoke `/api/meta`, `/service-worker.js`, `/trade`, every live mainnet stream,
   policy freshness, access throttling/revocation, and remote-halt propagation.
6. Keep invitation creation disabled until `bun run beta:readiness -- --deployment=<url> --expected-sha=<full-sha>` passes.

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

## Monitoring and alerting

The minimum closed-beta monitoring path is the public, sanitized
`/api/health` endpoint plus the scheduled GitHub Actions workflow
`.github/workflows/production-monitor.yml`. The endpoint checks mainnet
configuration, release identity, durable beta-store reachability, and the
Hyperliquid public market API. The workflow runs every five minutes and a
failed workflow produces the repository owner's normal GitHub notification.
Set the workflow secret `VICE_PRODUCTION_URL` to the production origin only;
never put credentials in the workflow or URL.

Vercel's Logs, Analytics, Speed Insights, and Observability panels are useful
additional provider telemetry. Grafana is optional for this closed beta; it is
not required unless we need custom dashboards, long-retention metrics, or
cross-service alert routing. Browser-local feed/account/execution diagnostics
remain in the redacted support bundle because private wallet state and signed
commands must not be sent to a hosted metrics service.

## Rollback

For the first release, create two production deployments from the same reviewed
SHA so rollback has a known-good target. Record both deployment URLs/IDs in the
release evidence, then run:

```sh
VICE_ROLLBACK_TARGET=<first-production-deployment-url-or-id> \\
VICE_PRODUCTION_URL=<production-origin> \\
VICE_RELEASE_SHA=<full-reviewed-sha> \\
bun run rollback:vercel
```

The rollback helper invokes the supported Vercel rollback command and then reads
`/api/meta` from production. It exits nonzero unless both `commit` and
`releaseBuild` equal the expected full SHA. After rollback, run the health probe
and deployed smoke again. The service worker activates updates only after a
user-controlled reload, so do not force a reload during an active trade.

## First deployment flow

1. Create/import a dedicated Vercel project for this repository under the
   intended account. Set Root Directory to `vice-terminal` and keep production
   deployment manual.
2. Configure the production-only variables in the Vercel dashboard, including
   durable beta auth, Redis, release identity, policy, evidence paths, and the
   three named owners. Never configure wallet keys or agent secrets there.
3. Build and verify the exact candidate SHA locally, deploy it, and record the
   resulting production URL and deployment ID.
4. Run `VICE_DEPLOYMENT_URL=<url> VICE_RELEASE_SHA=<sha> bun run test:deployed`.
5. Run `VICE_PRODUCTION_URL=<url> bun run monitor:production` or dispatch the
   scheduled workflow after storing its URL secret.
6. Do not create beta invitations until the final aggregate release gate is
   green.

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
