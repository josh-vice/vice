# ViceTerminal Beta Release Input Template

Use this template when preparing the evidence, immutable checkout, and server environment for the beta release gates.

Keep this file free of secrets. Provide filesystem paths, artifact references, secret-manager references, contacts, and SHA-256 digests only. Never paste private-key values, credentials, auth tokens, or signing material into this document or chat.

```text
CLEAN_CHECKOUT_PATH=
CLEAN_CHECKOUT_SHA=

VICE_MAINNET_EVIDENCE=
VICE_STREAM_EVIDENCE_DIR=
VICE_LATENCY_EVIDENCE=
VICE_SOAK_MAINNET_EVIDENCE=
VICE_RELEASE_SHA=

POLICY_SHA256=
APPROVAL_SHA256=
OBSERVATION_SHA256=

ALLOWLIST_REF=
NOTIONAL_CAP_USD=
OWNER_KEY_REF=
COUNTERPARTY_KEY_REF=
MAINNET_ACK=                 # only if funded mainnet execution is approved

VICE_BETA_SUPPORT_OWNER=
VICE_INCIDENT_OWNER=
VICE_RELEASE_OWNER=

DEPLOYMENT_ENV_REF=
VICE_DEPLOYMENT_URL=
```

## Release identity invariant

`CLEAN_CHECKOUT_SHA` and `VICE_RELEASE_SHA` must be the same full commit SHA. The same SHA must bind the evidence commit, release manifest, artifact, server-side `VICE_MAINNET_RELEASE_BUILD`, and deployed `/api/meta` identity.

## Required handling

- The clean checkout must contain the approved changes and have no modified or untracked files.
- Evidence paths must point to the approved release evidence, not stale testnet fragments.
- `OWNER_KEY_REF` and `COUNTERPARTY_KEY_REF` must identify server-side secret-manager entries or equivalent approved references; do not record key material.
- `MAINNET_ACK` is required only for an approved funded-mainnet run; mainnet execution remains fail-closed without the exact acknowledgement.
- Keep deployment secrets server-side. Do not place them in `VITE_*` client variables.
- Any change to the release SHA, allowlist, cap, observation window, or operator invalidates the associated approval and requires re-verification.
