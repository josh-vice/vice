/**
 * enablement.ts — explicit state machine for the "secure trading enablement"
 * (wallet connect → device-local agent unlock) UX.
 *
 * This module is deliberately pure: it imports nothing and holds no Svelte
 * stores. It classifies failures and describes the enablement lifecycle so the
 * UI can render honest, accessible progress instead of a generic spinner, and
 * so a unit test can lock the taxonomy without mounting a browser.
 *
 * It is NOT a second execution path — it only observes and labels the existing
 * certified enablement flow (stores.enableTrading → localExecution.initialize
 * → agentVault.unlockOrCreateAgent) via an injected reporter callback.
 */

/** Ordered lifecycle steps. `idle`/`enabled` are terminal bookends, not steps. */
export type EnablementStep =
	| 'connecting'
	| 'verifying-wallet'
	| 'checking-authority'
	| 'waiting-wallet-approval'
	| 'approval-submitted'
	| 'waiting-venue-confirmation'
	| 'synchronizing-account';

/** Human-readable failure classes we can tell apart (and act on) distinctly. */
export type EnablementErrorKind =
	| 'rejected'
	| 'wallet-mismatch'
	| 'stale-account'
	| 'rate-limited'
	| 'timeout'
	| 'offline'
	| 'uncertain'
	| 'not-connected';

export interface EnablementError {
	kind: EnablementErrorKind;
	message: string;
	/** Whether clicking "Retry" safely re-reads wallet/venue state. */
	retryable: boolean;
	/** Bounded backoff before a retry is offered (rate-limited). */
	backoffMs?: number;
}

export type EnablementPhase =
	| { kind: 'idle' }
	| { kind: 'step'; step: EnablementStep; detail: string }
	| { kind: 'enabled'; detail: string }
	| { kind: 'error'; error: EnablementError; detail: string };

/** Progress order used to render a step index like "Step 2 of 7". */
export const ENABLEMENT_STEP_ORDER: readonly EnablementStep[] = [
	'connecting',
	'verifying-wallet',
	'checking-authority',
	'waiting-wallet-approval',
	'approval-submitted',
	'waiting-venue-confirmation',
	'synchronizing-account'
];

export const ENABLEMENT_STEP_LABEL: Record<EnablementStep, string> = {
	connecting: 'Connecting',
	'verifying-wallet': 'Verifying wallet account',
	'checking-authority': 'Checking trading authority',
	'waiting-wallet-approval': 'Waiting for wallet approval',
	'approval-submitted': 'Approval submitted',
	'waiting-venue-confirmation': 'Waiting for venue confirmation',
	'synchronizing-account': 'Synchronizing account'
};

export const ENABLEMENT_STEP_DETAIL: Record<EnablementStep, string> = {
	connecting: 'Starting device-local secure trading setup.',
	'verifying-wallet':
		'Confirming the connected wallet matches the account you intend to trade.',
	'checking-authority':
		'Checking whether a device-local trading agent already exists for this account.',
	'waiting-wallet-approval':
		'Review and approve the unlock signature in your wallet. This only unlocks an encrypted key stored on this device — it places no order.',
	'approval-submitted':
		'Wallet approval received. Preparing the encrypted device-local agent.',
	'waiting-venue-confirmation':
		'Hyperliquid is confirming the agent approval. This can take a few moments.',
	'synchronizing-account':
		'Reconciling your account, orders, and any persisted strategies before trading goes live.'
};

export const ENABLEMENT_ENABLED_DETAIL =
	'Secure trading is enabled. Orders sign with the device-local agent.';

/** Bounded cap so a rate-limit retry never counts down forever. */
export const ENABLEMENT_MAX_BACKOFF_MS = 30_000;
/** Default base backoff offered after a venue rate limit. */
export const ENABLEMENT_BASE_BACKOFF_MS = 4_000;

/** A reporter that does nothing — default for callers that do not observe. */
export const noopEnablementReporter: EnablementReporter = () => {};

/** Optional callback a surface passes in to observe the enablement lifecycle. */
export type EnablementReporter = (phase: EnablementPhase) => void;

export function enablementStepIndex(step: EnablementStep): number {
	const idx = ENABLEMENT_STEP_ORDER.indexOf(step);
	return idx < 0 ? 0 : idx;
}

/** "Step 2 of 7 — Waiting for wallet approval" style summary. */
export function enablementProgressLabel(step: EnablementStep): string {
	return `Step ${enablementStepIndex(step) + 1} of ${ENABLEMENT_STEP_ORDER.length} — ${ENABLEMENT_STEP_LABEL[step]}`;
}

/** Whether the user can cancel (abandon) the in-flight enablement right now. */
export function enablementIsCancellable(phase: EnablementPhase): boolean {
	return phase.kind === 'step' && phase.step === 'waiting-wallet-approval';
}

/** Whether the progress surface can be dismissed without leaving it blank. */
export function enablementIsDismissable(phase: EnablementPhase): boolean {
	return phase.kind === 'step' || phase.kind === 'error';
}

/** Whether a safe retry is offered for the current phase. */
export function enablementIsRetryable(phase: EnablementPhase): boolean {
	return phase.kind === 'error' && phase.error.retryable;
}

/**
 * Classify an arbitrary thrown value into the enablement error taxonomy.
 * Ordered most-specific first so a "stale account" read does not get mistaken
 * for a generic offline/network error.
 */
export function classifyEnablementError(error: unknown): EnablementError {
	const message = error instanceof Error ? error.message : String(error ?? '');
	const lower = message.toLowerCase();
	let kind: EnablementErrorKind = 'uncertain';

	if (/(connect a browser wallet)/i.test(lower)) {
		kind = 'not-connected';
	} else if (
		/user rejected|user denied|request rejected|user cancelled|user canceled|user declined|request cancelled by user|signature request rejected/i.test(
			lower
		)
	) {
		kind = 'rejected';
	} else if (
		/account changed|account mismatch|wallet mismatch|does not match the account|unexpected account|switched account/i.test(
			lower
		)
	) {
		kind = 'wallet-mismatch';
	} else if (/stale|reconcile account|fresh execution state/i.test(lower)) {
		kind = 'stale-account';
	} else if (/429|too many requests|rate limit|rate-limited|ratelimit/i.test(lower)) {
		kind = 'rate-limited';
	} else if (/timed ?out|timeout/i.test(lower)) {
		kind = 'timeout';
	} else if (
		/network|offline|fetch failed|enotfound|econnrefused|econnreset|net::|websocket.*(close|error)|aborted/i.test(
			lower
		)
	) {
		kind = 'offline';
	}

	return {
		kind,
		message: message || 'Could not enable secure trading.',
		retryable: enablementRetryableKinds.includes(kind),
		backoffMs: kind === 'rate-limited' ? boundedEnablementBackoffMs() : undefined
	};
}

const enablementRetryableKinds: readonly EnablementErrorKind[] = [
	'stale-account',
	'rate-limited',
	'timeout',
	'offline',
	'uncertain'
];

export function boundedEnablementBackoffMs(
	baseMs: number = ENABLEMENT_BASE_BACKOFF_MS
): number {
	if (!Number.isFinite(baseMs) || baseMs <= 0) return ENABLEMENT_BASE_BACKOFF_MS;
	return Math.min(Math.round(baseMs), ENABLEMENT_MAX_BACKOFF_MS);
}
