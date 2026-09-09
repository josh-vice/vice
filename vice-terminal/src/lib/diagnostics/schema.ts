/**
 * Diagnostics schema + bounded-size/retention policy.
 *
 * Every support bundle written by this app is governed by ONE deterministic
 * schema version and a hard retention/size budget. Bumping `SUPPORT_BUNDLE_SCHEMA`
 * is a breaking contract change: support tooling must be able to tell which
 * shape it is reading from the version field alone, without guessing.
 *
 * Retention is bounded in TWO dimensions so a bundle can never become an
 * unbounded data dump: per-collector entry caps (see `MAX_*_ENTRIES`) and a
 * serialized byte budget (see `MAX_BUNDLE_BYTES`). Both are enforced in
 * `sanitizeBundle`, not merely documented.
 */
export const SUPPORT_BUNDLE_SCHEMA = 1;
export const SUPPORT_BUNDLE_KIND = 'vice.support-bundle';

/** Cap on health transitions retained per collector (oldest dropped). */
export const MAX_HEALTH_TRANSITIONS = 200;
/** Cap on app errors retained per collector. */
export const MAX_APP_ERRORS = 50;
/** Cap on request-failure records retained per collector. */
export const MAX_REQUEST_FAILURES = 50;
/** Cap on command-status entries retained per collector. */
export const MAX_COMMAND_ENTRIES = 50;
/** Hard cap on a single retained string field (post-redaction). */
export const MAX_STRING_LENGTH = 500;
/** Hard cap on the serialized bundle (post-sanitization). */
export const MAX_BUNDLE_BYTES = 256 * 1024;

/**
 * Collectors whose bounded arrays may be trimmed first if the bundle exceeds
 * the byte budget. `appErrors` and `requestFailures` carry the least
 * diagnostic value per byte after the core identity/health fields, so they
 * shrink before health transitions or commands.
 */
export const TRIM_PRIORITY = ['requestFailures', 'appErrors'] as const;
