# Vice Terminal closed-beta access

The terminal requires a durable server-side invite gate when `VICE_BETA_REQUIRED=true`. Local development may use the legacy environment-code shim only while the durable gate is disabled.

## Vercel environment variables

Set these as **server-only** variables. Do not use a `VITE_` prefix — Vite exposes `VITE_*` values to every browser visitor.

```env
VICE_BETA_REQUIRED=true
VICE_BETA_SESSION_SECRET=<long-random-secret-used-for-cookie-signing-and-hashes>
UPSTASH_REDIS_REST_URL=https://<tenant>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<server-only-token>
```

Create a tester record once, then deliver the generated code out of band:

```sh
VICE_BETA_REQUIRED=true bun scripts/beta-access.mjs create \
  --tester-id tester-01 --wallets 0x... \
  --cohort beta --expires-at 2026-09-30T00:00:00Z
```

The store keeps only an HMAC hash of the invite code, tester metadata, wallet
allowlist, session version, status, cohort, expiry, and audit timestamps. Use
`revoke`, `rotate`, `list`, and `revoke-all` for operator lifecycle changes.
`list` never prints codes or wallet addresses. Cookies are 30-day `HttpOnly`,
`Secure` in HTTPS, and `SameSite=Strict`.

## Rotation and revocation

`revoke` marks one tester inactive immediately. `rotate` increments that tester's session version, invalidating all existing sessions for that tester without affecting other testers. `revoke-all` marks every tester inactive. Secret rotation remains an emergency global invalidation fallback.

The implementation is a closed-beta access gate, not a general user account system. It does not collect email addresses, provide password recovery, or replace wallet identity/authentication.
