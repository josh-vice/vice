# Vice Terminal closed-beta access

The terminal supports a server-side invite gate for private testing. It is disabled when `VICE_BETA_ACCESS_CODES` is empty.

## Vercel environment variables

Set these as **server-only** variables. Do not use a `VITE_` prefix — Vite exposes `VITE_*` values to every browser visitor.

```env
VICE_BETA_SESSION_SECRET=<long-random-secret-used-to-sign-session-cookies>
VICE_BETA_ACCESS_CODES={"josh":"<owner-invite>","tester-01":"<unique-tester-invite>"}
```

`VICE_BETA_ACCESS_CODES` accepts either:

- a JSON object mapping a tester label to a unique invite code, recommended; or
- a JSON array such as `[ {"id":"tester-01","code":"..."} ]`.

For a quick local-only setup, a comma/newline-separated list also works. A code can be labeled as `tester-01=code`.

Each code creates a 30-day, signed, `HttpOnly`, `SameSite=Lax` session cookie. The invite code is never sent to the browser bundle and is never stored in `localStorage`. The SvelteKit server hook gates page routes and `/api/*` before they reach the terminal.

## Rotation and revocation

To revoke everyone, rotate `VICE_BETA_SESSION_SECRET` and redeploy. To revoke one tester, remove that tester's invite code and redeploy; existing signed sessions for that tester remain valid until their 30-day expiry unless the session secret is also rotated. For immediate individual revocation, rotate the session secret or add a persistent session store before beta expansion.

The current implementation is intentionally a closed-beta access gate, not a full user account system. It does not collect email addresses, provide password recovery, or replace production identity/authentication.
