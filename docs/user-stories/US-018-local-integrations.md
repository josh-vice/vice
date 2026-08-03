# US-018: Installable local integrations

Story schema v1.

As a power user, I want a PWA, Stream Deck/local bridge, encrypted preference sync, and a user-controlled runner so that Vice stays available across devices without handing custody to Vice.

## Acceptance criteria

- The PWA remains usable for public monitoring offline and clearly distinguishes offline data from live trading state.
- Stream Deck/local integrations invoke only the shared, certified action boundary and respect focus, consent, health, and kill-switch rules.
- Cross-device preference and runner monitoring payloads are end-to-end encrypted; the relay cannot read credentials, account contents, strategy values, or order contents.
- Given a runner loss, stale feed, revoked pairing, or expired command, when a job cannot be proven safe, then it pauses rather than dispatching late or replaying.

## Operational contract

- Persona: Active trader using several devices and local hardware controls.
- Preconditions: Explicit device pairing, local approval, and certified action scope.
- Success behavior: Integrations improve access while reusing the same identity, journal, reconciliation, and disclosure contracts.
- Failure behavior: Pairing, relay, runner, or bridge failures degrade to local monitoring and never broaden authority.
- Reconnect behavior: Runner and clients establish fresh epochs, verify pairing, and reconcile before job resume.
- Restart behavior: Encrypted local state restores only after explicit unlock and verification.
- Stale/offline behavior: Offline PWA data is labeled; new execution and stale triggers remain blocked.
- Custody expectations: Vice hosts no signer and no plaintext credential or strategy content.
- Latency expectations: Local bridge and runner commands preserve the action-to-signed-dispatch budget or report their separate path.
- Telemetry: Opt-in anonymous health aggregates only; no secrets, addresses, markets, prices, sizes, or strategies.
- Linked tests: Pairing, encryption-envelope, replay, expiry, offline, bridge-policy, runner-restart, and browser suites.
- Funded-testnet evidence: Runner action evidence per certified strategy plus kill/restart/revocation proof.

## Current evidence

- `src/lib/runner/pairing.ts` defines versioned pairing records (device identity, key fingerprint, epoch, revocation) and cross-device encrypted-envelope contracts. Validation rejects malformed records, non-base64url ciphertext, missing fingerprints, envelopes that expire before creation, and any envelope carrying plaintext secret fields (`accountKey`, `secret`, `mnemonic`, `privateKey`, `strategy`, `balances`) so the relay cannot read payload contents. Revocation bumps the epoch and fails freshness immediately. Actual end-to-end encryption is performed by Web Crypto at runtime; this module validates format and fail-closed rules only.
- `src/lib/runner/runner.ts` is the user-controlled runner engine. Jobs dispatch only through the injected certified action boundary (`services.execute`) and never through a runner-owned transport, signer, or credential path. `canDispatchJob` fails closed on an engaged kill switch, missing consent or focus, revoked or expired pairing, a stale feed for the job, an expired command, or an unavailable clock. `runJob` re-checks every rule at dispatch time and re-checks the runner state; an uncertain outcome pauses the runner rather than replaying or reporting success. Restart requires a fresh, un-revoked pairing before any job resumes.
- Telemetry (`runnerTelemetry`) records status and outcome counts only, never job ids, accounts, markets, prices, sizes, or strategies.
- Coverage: `runner/runner.test.js` (15 tests) plus the full source typecheck, Svelte check, and production build. This is local engine/build proof; browser offline-PWA, Stream Deck/local bridge, real relay encryption, and funded runner action evidence remain open.
