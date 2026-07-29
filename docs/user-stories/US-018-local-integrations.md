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
