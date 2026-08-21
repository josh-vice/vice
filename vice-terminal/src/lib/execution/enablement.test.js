import { describe, expect, test } from 'bun:test';
import {
	ENABLEMENT_MAX_BACKOFF_MS,
	ENABLEMENT_STEP_ORDER,
	ENABLEMENT_STEP_LABEL,
	boundedEnablementBackoffMs,
	classifyEnablementError,
	enablementIsCancellable,
	enablementIsDismissable,
	enablementIsRetryable,
	enablementProgressLabel,
	enablementStepIndex
} from './enablement';

describe('enablement error classification', () => {
	test('classifies a wallet-approval rejection as non-retryable rejected', () => {
		const e = classifyEnablementError(new Error('The user rejected the request.'));
		expect(e.kind).toBe('rejected');
		expect(e.retryable).toBe(false);
	});

	test('classifies a provider account switch as a wallet mismatch', () => {
		const e = classifyEnablementError(
			new Error('The connected wallet account changed; secure trading remains locked.')
		);
		expect(e.kind).toBe('wallet-mismatch');
		expect(e.retryable).toBe(false);
	});

	test('classifies a stale execution state read as stale-account', () => {
		const e = classifyEnablementError(
			new Error('Execution state is stale; reconcile account before enabling trading.')
		);
		expect(e.kind).toBe('stale-account');
		expect(e.retryable).toBe(true);
	});

	test('classifies a venue 429 as retryable rate-limited with bounded backoff', () => {
		const e = classifyEnablementError(new Error('HTTP 429: Too Many Requests from Hyperliquid'));
		expect(e.kind).toBe('rate-limited');
		expect(e.retryable).toBe(true);
		expect(e.backoffMs).toBeDefined();
		expect(e.backoffMs).toBeLessThanOrEqual(ENABLEMENT_MAX_BACKOFF_MS);
	});

	test('classifies a timeout and an offline read separately, both retryable', () => {
		const timeout = classifyEnablementError(new Error('Request timed out after 10s'));
		expect(timeout.kind).toBe('timeout');
		expect(timeout.retryable).toBe(true);
		const offline = classifyEnablementError(new Error('fetch failed: ENOTFOUND hyperliquid.xyz'));
		expect(offline.kind).toBe('offline');
		expect(offline.retryable).toBe(true);
	});

	test('classifies a missing wallet as not-connected', () => {
		const e = classifyEnablementError(new Error('Connect a browser wallet before enabling trading'));
		expect(e.kind).toBe('not-connected');
		expect(e.retryable).toBe(false);
	});

	test('falls back to uncertain for an unknown failure', () => {
		const e = classifyEnablementError(new Error('something unexpected happened'));
		expect(e.kind).toBe('uncertain');
		expect(e.retryable).toBe(true);
	});
});

describe('enablement lifecycle helpers', () => {
	test('exposes exactly the documented step order', () => {
		expect(ENABLEMENT_STEP_ORDER).toEqual([
			'connecting',
			'verifying-wallet',
			'checking-authority',
			'waiting-wallet-approval',
			'approval-submitted',
			'waiting-venue-confirmation',
			'synchronizing-account'
		]);
		for (const step of ENABLEMENT_STEP_ORDER) {
			expect(ENABLEMENT_STEP_LABEL[step]).toBeTruthy();
		}
	});

	test('progress label renders a human 1-based step index', () => {
		expect(enablementProgressLabel('waiting-wallet-approval')).toBe(
			`Step ${enablementStepIndex('waiting-wallet-approval') + 1} of ${ENABLEMENT_STEP_ORDER.length} — Waiting for wallet approval`
		);
		expect(enablementStepIndex('connecting')).toBe(0);
	});

	test('cancel is only offered while waiting for wallet approval', () => {
		expect(enablementIsCancellable({ kind: 'step', step: 'waiting-wallet-approval', detail: '' })).toBe(true);
		expect(enablementIsCancellable({ kind: 'step', step: 'verifying-wallet', detail: '' })).toBe(false);
		expect(enablementIsCancellable({ kind: 'idle' })).toBe(false);
	});

	test('dismiss is offered for any in-flight step or error, never while idle', () => {
		expect(enablementIsDismissable({ kind: 'step', step: 'checking-authority', detail: '' })).toBe(true);
		expect(
			enablementIsDismissable({
				kind: 'error',
				error: { kind: 'timeout', message: 'x', retryable: true },
				detail: 'x'
			})
		).toBe(true);
		expect(enablementIsDismissable({ kind: 'idle' })).toBe(false);
	});

	test('retry is offered only for a retryable error phase', () => {
		expect(
			enablementIsRetryable({
				kind: 'error',
				error: { kind: 'rate-limited', message: '429', retryable: true },
				detail: '429'
			})
		).toBe(true);
		expect(
			enablementIsRetryable({
				kind: 'error',
				error: { kind: 'rejected', message: 'no', retryable: false },
				detail: 'no'
			})
		).toBe(false);
		expect(enablementIsRetryable({ kind: 'enabled', detail: '' })).toBe(false);
	});
});

describe('enablement backoff bounds', () => {
	test('caps a rate-limit backoff at the documented maximum', () => {
		expect(boundedEnablementBackoffMs(120_000)).toBe(ENABLEMENT_MAX_BACKOFF_MS);
	});

	test('keeps a sane base backoff and rejects bad input', () => {
		expect(boundedEnablementBackoffMs(4_000)).toBe(4_000);
		expect(boundedEnablementBackoffMs(NaN)).toBeGreaterThan(0);
		expect(boundedEnablementBackoffMs(0)).toBeGreaterThan(0);
	});
});
