import { afterEach, describe, expect, test } from 'bun:test';
import { signBlofinRest } from './auth.ts';

const SECRET = 'test-secret-do-not-log';
const TIMESTAMP = '1597026383085';
const NONCE = '123e4567-e89b-12d3-a456-426614174000';

const POST_BODY =
	'{"instId":"BTC-USDT","marginMode":"isolated","side":"buy","orderType":"limit","price":"35000","size":"0.1"}';

const originalImportKey = globalThis.crypto.subtle.importKey;

afterEach(() => {
	globalThis.crypto.subtle.importKey = originalImportKey;
});

describe('BloFin REST authentication', () => {
	test('matches the documented deterministic GET signature', async () => {
		await expect(
			signBlofinRest(
				'secret-key',
				'/api/v1/asset/balances?accountType=futures',
				'GET',
				TIMESTAMP,
				NONCE
			)
		).resolves.toBe('ZTdlMjA4OTRjYjFhYmRkNGU1OGVmN2U4NzlhNzVmMzY2Y2RmNjQ1OGFmNThmMTJiMDFhNTI5MDIzZWNmYmU1OQ==');
	});

	test('matches the documented deterministic POST signature and preserves exact body bytes', async () => {
		await expect(
			signBlofinRest('secret-key', '/api/v1/trade/order', 'post', TIMESTAMP, NONCE, POST_BODY)
		).resolves.toBe('NWFlODNjMGM1YzRlNjg4ZmI5ZWY5OTVjODg2NGY4Zjg2ODdmYjVjMWM4NDA4ZmQ1MGUwNWZiYzRiNjc0MWI5NQ==');

		const bodyWithWhitespace = POST_BODY.replaceAll(':', ' : ');
		await expect(
			signBlofinRest('secret-key', '/api/v1/trade/order', 'POST', TIMESTAMP, NONCE, bodyWithWhitespace)
		).resolves.not.toBe(
			await signBlofinRest('secret-key', '/api/v1/trade/order', 'POST', TIMESTAMP, NONCE, POST_BODY)
		);
	});

	test('signs the request path exactly, so query ordering changes the signature', async () => {
		const first = await signBlofinRest(
			SECRET,
			'/api/v1/market/instruments?instId=BTC-USDT&instType=SWAP',
			'GET',
			TIMESTAMP,
			NONCE
		);
		const reordered = await signBlofinRest(
			SECRET,
			'/api/v1/market/instruments?instType=SWAP&instId=BTC-USDT',
			'GET',
			TIMESTAMP,
			NONCE
		);

		expect(first).not.toBe(reordered);
	});

	test('uppercases the method only inside the prehash', async () => {
		const lower = await signBlofinRest(SECRET, '/api/v1/account/balance', 'get', TIMESTAMP, NONCE);
		const upper = await signBlofinRest(SECRET, '/api/v1/account/balance', 'GET', TIMESTAMP, NONCE);

		expect(lower).toBe(upper);
	});

	test('does not expose the secret when Web Crypto signing fails', async () => {
		globalThis.crypto.subtle.importKey = (async () => {
			throw new Error(SECRET);
		}) as typeof globalThis.crypto.subtle.importKey;

		let thrown: unknown;
		try {
			await signBlofinRest(SECRET, '/api/v1/account/balance', 'GET', TIMESTAMP, NONCE);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as Error).message).not.toContain(SECRET);
	});
});
