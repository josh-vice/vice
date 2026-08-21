import { beforeEach, describe, expect, test } from 'bun:test';

const originalCodes = process.env.VICE_BETA_ACCESS_CODES;
const originalSecret = process.env.VICE_BETA_SESSION_SECRET;

process.env.VICE_BETA_ACCESS_CODES = JSON.stringify({ josh: 'alpha-test-code', 'tester-a': 'beta-test-code' });
process.env.VICE_BETA_SESSION_SECRET = 'unit-test-session-secret';

const auth = await import('./betaAuth');

describe('server-side beta access', () => {
	beforeEach(() => {
		process.env.VICE_BETA_ACCESS_CODES = JSON.stringify({ josh: 'alpha-test-code', 'tester-a': 'beta-test-code' });
		process.env.VICE_BETA_SESSION_SECRET = 'unit-test-session-secret';
	});

	test('accepts labeled invite codes without exposing the code as identity', () => {
		expect(auth.betaGateEnabled()).toBe(true);
		expect(auth.verifyInviteCode('wrong')).toBeNull();
		expect(auth.verifyInviteCode('alpha-test-code')).toEqual({ id: 'josh' });
		expect(auth.verifyInviteCode(' beta-test-code ')).toEqual({ id: 'tester-a' });
	});

	test('creates and verifies a signed session token', () => {
		const token = auth.createSessionToken({ id: 'tester-a' }, 1_700_000_000_000);
		expect(token).not.toContain('beta-test-code');
		expect(auth.verifySessionToken(token, 1_700_000_000_001)).toEqual({ id: 'tester-a' });
		expect(auth.verifySessionToken(`${token}x`, 1_700_000_000_001)).toBeNull();
		expect(auth.verifySessionToken(token, 1_800_000_000_000)).toBeNull();
	});

	test('rejects a session signed with a different secret', () => {
		const token = auth.createSessionToken({ id: 'josh' }, 1_700_000_000_000);
		process.env.VICE_BETA_SESSION_SECRET = 'rotated-secret';
		expect(auth.verifySessionToken(token, 1_700_000_000_001)).toBeNull();
	});
});

if (originalCodes === undefined) delete process.env.VICE_BETA_ACCESS_CODES;
else process.env.VICE_BETA_ACCESS_CODES = originalCodes;
if (originalSecret === undefined) delete process.env.VICE_BETA_SESSION_SECRET;
else process.env.VICE_BETA_SESSION_SECRET = originalSecret;
