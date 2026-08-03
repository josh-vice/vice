import { describe, expect, test } from 'bun:test';
import {
	assertEncryptedEnvelope,
	assertPairingRecord,
	envelopeExpired,
	pairingIsFresh,
	revokePairing
} from './pairing';
import {
	canDispatchJob,
	createRunnerState,
	runJob,
	runnerTelemetry
} from './runner';

function pairing(overrides = {}) {
	return {
		deviceId: 'desk-01',
		keyFingerprint: 'f'.repeat(16),
		pairedAtMs: 1_000,
		lastSeenMs: 1_000,
		epoch: 0,
		revoked: false,
		...overrides
	};
}

function job(overrides = {}) {
	return {
		jobId: 'job-1',
		action: { kind: 'conditional-take-profit', spec: { marketKey: 'hyperliquid:BTC' } },
		requiredFreshnessMs: 5_000,
		expiresAtMs: 1_000_000,
		...overrides
	};
}

function context(overrides = {}) {
	return {
		pairing: pairing(),
		feedFreshnessMs: 1_000,
		consentGranted: true,
		focusGranted: true,
		killSwitchEngaged: false,
		now: 10_000,
		...overrides
	};
}

describe('US-018 user-controlled runner', () => {
	test('dispatch is denied when the kill switch is engaged', () => {
		const decision = canDispatchJob(job(), context({ killSwitchEngaged: true }));
		expect(decision.allow).toBe(false);
		expect(decision.reason).toContain('kill switch');
	});

	test('dispatch is denied without explicit consent or focus', () => {
		expect(canDispatchJob(job(), context({ consentGranted: false })).reason).toContain('consent');
		expect(canDispatchJob(job(), context({ focusGranted: false })).reason).toContain('focus');
	});

	test('dispatch is denied when the pairing is revoked or expired', () => {
		const revoked = canDispatchJob(job(), context({ pairing: revokePairing(pairing(), 10_000) }));
		expect(revoked.allow).toBe(false);
		const expired = canDispatchJob(
			job(),
			context({ pairing: pairing({ lastSeenMs: 0, pairedAtMs: 0 }), now: 2_600_000_000 })
		);
		expect(expired.allow).toBe(false);
		expect(expired.reason).toContain('pairing');
	});

	test('dispatch is denied on a stale feed and never replayed late', () => {
		const decision = canDispatchJob(job(), context({ feedFreshnessMs: 9_000 }));
		expect(decision.allow).toBe(false);
		expect(decision.reason).toContain('stale');
	});

	test('dispatch is denied after the command expires', () => {
		const decision = canDispatchJob(job({ expiresAtMs: 9_000 }), context({ now: 10_000 }));
		expect(decision.allow).toBe(false);
		expect(decision.reason).toContain('expired');
	});

	test('a provably safe job dispatches through the certified boundary only', async () => {
		const state = createRunnerState('running');
		const executed = [];
		const result = await runJob(state, job(), context(), {
			execute: async (dispatched) => {
				executed.push(dispatched.jobId);
				return { status: 'accepted', outcome: { venueOrderIds: ['1'] } };
			}
		});
		expect(result.dispatched).toBe(true);
		expect(executed).toEqual(['job-1']);
	});

	test('an uncertain outcome pauses the runner instead of replaying', async () => {
		const state = createRunnerState('running');
		await runJob(state, job(), context(), {
			execute: async () => ({ status: 'uncertain' })
		});
		expect(state.status).toBe('paused');
	});

	test('a stopped or killed runner never dispatches', async () => {
		const executed = [];
		for (const initial of ['stopped', 'killed', 'paused']) {
			const state = createRunnerState(initial);
			const result = await runJob(state, job(), context(), {
				execute: async (dispatched) => {
					executed.push(dispatched.jobId);
					return { status: 'accepted' };
				}
			});
			expect(result.dispatched).toBe(false);
		}
		expect(executed).toEqual([]);
	});

	test('restart requires a fresh, un-revoked pairing before any job resumes', () => {
		// A restarted runner with a stale lastSeen or bumped epoch fails closed.
		expect(pairingIsFresh(pairing({ lastSeenMs: 1_000 }), 100_000, 30_000)).toBe(false);
		expect(pairingIsFresh(revokePairing(pairing(), 10_000), 10_000, 30_000)).toBe(false);
		expect(pairingIsFresh(pairing(), 2_000, 30_000)).toBe(true);
	});

	test('telemetry records counts only and never job, account, or market values', () => {
		const state = createRunnerState('paused');
		const summary = runnerTelemetry(
			state,
			[{ allow: false, reason: 'kill switch is engaged' }, { allow: true, reason: 'ok' }],
			[{ status: 'uncertain' }, { status: 'accepted' }]
		);
		expect(summary).toEqual({ status: 'paused', denied: 1, allowed: 1, accepted: 1, rejected: 0, uncertain: 1 });
	});

	test('surface: the runner module creates no transport, signer, or credential path', async () => {
		const source = await Bun.file(new URL('./runner.ts', import.meta.url)).text();
		for (const token of ['fetch(', 'WebSocket', 'privateKey', 'sign(', 'credentialRef']) expect(source).not.toContain(token);
		expect(source).toContain('services.execute');
	});
});

describe('US-018 pairing and envelope contracts', () => {
	test('a valid pairing record passes validation', () => {
		expect(assertPairingRecord(pairing())).toEqual(pairing());
	});

	test('revocation bumps the epoch and fails freshness', () => {
		const revoked = revokePairing(pairing(), 10_000);
		expect(revoked.revoked).toBe(true);
		expect(revoked.epoch).toBe(1);
		expect(pairingIsFresh(revoked, 10_000, 30_000)).toBe(false);
	});

	test('an envelope with plaintext secrets is rejected', () => {
		expect(() =>
			assertEncryptedEnvelope({
				schema: 1,
				kind: 'vice.pairing-envelope',
				version: 1,
				deviceId: 'desk-01',
				ciphertext: 'A'.repeat(24),
				iv: 'B'.repeat(16),
				keyFingerprint: 'f'.repeat(16),
				createdAtMs: 1_000,
				expiresAtMs: 2_000,
				accountKey: 'hyperliquid:alice'
			})
		).toThrow(/plaintext/);
	});

	test('an envelope without ciphertext or with an invalid expiry is rejected', () => {
		const base = {
			schema: 1,
			kind: 'vice.pairing-envelope',
			version: 1,
			deviceId: 'desk-01',
			ciphertext: 'A'.repeat(24),
			iv: 'B'.repeat(16),
			keyFingerprint: 'f'.repeat(16),
			createdAtMs: 1_000,
			expiresAtMs: 2_000
		};
		expect(assertEncryptedEnvelope(base)).toBeTruthy();
		expect(() => assertEncryptedEnvelope({ ...base, ciphertext: 'short' })).toThrow(/ciphertext/);
		expect(() => assertEncryptedEnvelope({ ...base, expiresAtMs: 500 })).toThrow(/expire/);
		expect(envelopeExpired(base, 3_000)).toBe(true);
		expect(envelopeExpired(base, 1_500)).toBe(false);
	});
});
