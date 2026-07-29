import { describe, expect, test } from 'bun:test';
import { credentialsFromBlofinForm, submitBlofinCredentialForm, verifyBlofinPrivateCredentials } from './setup.ts';
import { unlockBlofinCredentials } from './vault.ts';

function memoryStorage() {
	const values = new Map();
	return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

const form = {
	environment: 'demo',
	apiKey: ' demo-key ',
	secretKey: ' local-secret ',
	passphrase: ' venue-passphrase ',
	unlockPhrase: 'this is a strong local unlock phrase',
	readPermission: true,
	tradePermission: true
};

function privateFetch() {
	const balance = [{ currency: 'USDT', balance: '10', available: '9', frozen: '1' }];
	const position = [{ positionId: 'p-1', instId: 'BTC-USDT', positionSide: 'long', positions: '1', availablePositions: '1', averagePrice: '60000', markPrice: '61000', liquidationPrice: '50000', unrealizedPnl: '1', leverage: '2', updateTime: '1700000000000' }];
	const order = [{ orderId: 'o-1', clientOrderId: 'vice-1', instId: 'BTC-USDT', side: 'buy', orderType: 'limit', price: '60000', size: '1', filledSize: '0', reduceOnly: 'false', state: 'live', updateTime: '1700000000000' }];
	return async (request) => {
		const path = String(request);
		const data = path.includes('/asset/balances') ? balance : path.includes('/account/positions') ? position : order;
		return new Response(JSON.stringify({ code: '0', data }), { status: 200 });
	};
}

describe('BloFin credential setup', () => {
	test('requires declared read access and never accepts a transfer scope', () => {
		expect(() => credentialsFromBlofinForm({ ...form, readPermission: false })).toThrow('READ permission');
		expect(credentialsFromBlofinForm({ ...form, tradePermission: false })).toEqual({
			apiKey: 'demo-key', secretKey: 'local-secret', passphrase: 'venue-passphrase', permissions: ['READ']
		});
	});

	test('returns only a fingerprint after persisting encrypted local credentials', async () => {
		const storage = memoryStorage();
		const result = await submitBlofinCredentialForm(form, storage);
		expect(result).toMatchObject({ ok: true, permissions: ['READ', 'TRADE'] });
		if (!result.ok) throw new Error(result.error);
		const serialized = [...storage.values.values()][0];
		expect(serialized).not.toContain('local-secret');
		expect(serialized).not.toContain(form.unlockPhrase);
		expect(await unlockBlofinCredentials('demo', result.keyFingerprint, form.unlockPhrase, storage)).toEqual({
			apiKey: 'demo-key', secretKey: 'local-secret', passphrase: 'venue-passphrase', permissions: ['READ', 'TRADE']
		});
	});

	test('verifies one stored key without returning private account values or raw errors', async () => {
		const storage = memoryStorage();
		const saved = await submitBlofinCredentialForm(form, storage);
		if (!saved.ok) throw new Error(saved.error);
		const result = await verifyBlofinPrivateCredentials({ environment: 'demo', keyFingerprint: saved.keyFingerprint, unlockPhrase: form.unlockPhrase }, storage, { fetcher: privateFetch(), now: 1700000000000, nonceFactory: (() => { let index = 0; return () => `nonce-${++index}`; })() });
		expect(result).toEqual({ ok: true, verifiedAt: 1700000000000, balanceCount: 1, positionCount: 1, openOrderCount: 1 });
		const rejected = await verifyBlofinPrivateCredentials({ environment: 'demo', keyFingerprint: saved.keyFingerprint, unlockPhrase: 'wrong but long unlock phrase' }, storage);
		expect(rejected).toEqual({ ok: false, error: 'BloFin private verification failed. Check the selected device key, unlock phrase, venue permissions, and network.' });
	});
});
