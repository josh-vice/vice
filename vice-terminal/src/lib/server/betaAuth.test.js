import { beforeEach, describe, expect, test } from 'bun:test';

const originalCodes = process.env.VICE_BETA_ACCESS_CODES;
const originalSecret = process.env.VICE_BETA_SESSION_SECRET;

process.env.VICE_BETA_ACCESS_CODES = JSON.stringify({ josh: 'alpha-test-code', 'tester-a': 'beta-test-code' });
process.env.VICE_BETA_SESSION_SECRET = 'unit-test-session-secret';

const auth = await import('./betaAuth');
const store = await import('./betaStore.ts');

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

	test('accepts an active durable session whose token expiry is in Unix seconds', async () => {
		const previousFetch = globalThis.fetch;
		const previousRequired = process.env.VICE_BETA_REQUIRED;
		const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
		const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
		try {
			process.env.VICE_BETA_REQUIRED = 'true';
			process.env.VICE_BETA_SESSION_SECRET = 'unit-test-session-secret';
			process.env.UPSTASH_REDIS_REST_URL = 'https://unit-test.upstash.invalid';
			process.env.UPSTASH_REDIS_REST_TOKEN = 'unit-test-token';
			const tester = {
				testerId: 'tester-a', inviteHash: 'redacted', wallets: [], sessionVersion: 3,
				status: 'active', cohort: 'beta', expiresAt: Date.now() + 60_000,
				createdAt: Date.now(), updatedAt: Date.now()
			};
			globalThis.fetch = async (_input, init) => {
				const command = JSON.parse(String(init?.body));
				return new Response(JSON.stringify({ result: command[0] === 'GET' ? JSON.stringify(tester) : null }), { status: 200, headers: { 'content-type': 'application/json' } });
			};
			expect(await store.isBetaSessionActive({ testerId: 'tester-a', sessionVersion: 3, expiresAt: Math.floor((Date.now() + 60_000) / 1000) })).toBe(true);
			expect(await store.isBetaSessionActive({ testerId: 'tester-a', sessionVersion: 3, expiresAt: Math.floor((Date.now() - 1) / 1000) })).toBe(false);
		} finally {
			globalThis.fetch = previousFetch;
			if (previousRequired === undefined) delete process.env.VICE_BETA_REQUIRED; else process.env.VICE_BETA_REQUIRED = previousRequired;
			if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
			if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
		}
	});
});

if (originalCodes === undefined) delete process.env.VICE_BETA_ACCESS_CODES;
else process.env.VICE_BETA_ACCESS_CODES = originalCodes;
if (originalSecret === undefined) delete process.env.VICE_BETA_SESSION_SECRET;
else process.env.VICE_BETA_SESSION_SECRET = originalSecret;
