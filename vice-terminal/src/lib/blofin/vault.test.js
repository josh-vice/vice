import { describe, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { blofinAuthHeaders, signBlofinRequest } from './signing.ts';
import { blofinAccountRef, listBlofinCredentialFingerprints, removeBlofinCredentials, saveBlofinCredentials, unlockBlofinCredentials } from './vault.ts';

function memoryStorage() {
	const values = new Map();
	return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

const credentials = { apiKey: 'public-demo-key', secretKey: 'super-secret', passphrase: 'venue-passphrase', permissions: ['READ', 'TRADE'] };
const unlockPhrase = 'this is a strong local unlock phrase';

describe('BloFin encrypted local credential vault', () => {
	test('encrypts credentials locally and detects a wrong unlock phrase', async () => {
		const storage = memoryStorage();
		const { keyFingerprint } = await saveBlofinCredentials('demo', credentials, unlockPhrase, storage);
		expect(listBlofinCredentialFingerprints('demo', storage)).toEqual([keyFingerprint]);
		const serialized = [...storage.values.values()][0];
		expect(serialized).not.toContain(credentials.secretKey);
		expect(serialized).not.toContain(unlockPhrase);
		expect(await unlockBlofinCredentials('demo', keyFingerprint, unlockPhrase, storage)).toEqual(credentials);
		await expect(unlockBlofinCredentials('demo', keyFingerprint, 'wrong but long unlock phrase', storage)).rejects.toThrow('could not be unlocked');
		removeBlofinCredentials('demo', keyFingerprint, storage);
		expect(listBlofinCredentialFingerprints('demo', storage)).toEqual([]);
		await expect(unlockBlofinCredentials('demo', keyFingerprint, unlockPhrase, storage)).rejects.toThrow('not available');
	});

	test('keeps the local fingerprint index environment-scoped and secret-free', async () => {
		const storage = memoryStorage();
		const demo = await saveBlofinCredentials('demo', credentials, unlockPhrase, storage);
		const live = await saveBlofinCredentials('live', { ...credentials, apiKey: 'separate-live-key' }, unlockPhrase, storage);
		expect(listBlofinCredentialFingerprints('demo', storage)).toEqual([demo.keyFingerprint]);
		expect(listBlofinCredentialFingerprints('live', storage)).toEqual([live.keyFingerprint]);
		const indexRecords = [...storage.values.entries()].filter(([key]) => key.includes('.index.'));
		expect(indexRecords).toHaveLength(2);
		for (const [, value] of indexRecords) {
			expect(value).not.toContain(credentials.secretKey);
			expect(value).not.toContain(unlockPhrase);
		}
	});

	test('rejects transfer permission before any credential is stored', async () => {
		const storage = memoryStorage();
		await expect(saveBlofinCredentials('demo', { ...credentials, permissions: ['READ', 'TRANSFER'] }, unlockPhrase, storage)).rejects.toThrow('TRANSFER');
		expect(storage.values.size).toBe(0);
	});

	test('creates only environment-scoped, non-secret account references', () => {
		expect(blofinAccountRef('demo', '0123456789abcdef01234567')).toEqual({
			accountKey: 'blofin:demo:0123456789abcdef01234567',
			venue: 'blofin',
			credentialRef: '0123456789abcdef01234567',
			accountMode: 'futures:demo'
		});
		expect(() => blofinAccountRef('live', 'not-a-fingerprint')).toThrow('credential identity');
	});

	test('uses BloFin’s hex-then-base64 HMAC encoding and exact body', async () => {
		const path = '/api/v1/trade/order';
		const body = '{"instId":"BTC-USDT","size":"0.1"}';
		const expected = createHmac('sha256', credentials.secretKey).update(`${path}POST1700000000000nonce-1${body}`).digest('hex');
		expect(await signBlofinRequest(credentials.secretKey, path, 'POST', '1700000000000', 'nonce-1', body)).toBe(Buffer.from(expected).toString('base64'));
		const headers = await blofinAuthHeaders(credentials, path, 'POST', body, 1700000000000, 'nonce-1');
		expect(headers).toMatchObject({ 'ACCESS-KEY': credentials.apiKey, 'ACCESS-TIMESTAMP': '1700000000000', 'ACCESS-NONCE': 'nonce-1' });
	});
});
