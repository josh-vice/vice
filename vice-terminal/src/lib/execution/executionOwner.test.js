import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { ExecutionOwnerLease, executionOwnerScope } from './executionOwner.ts';

const storage = new Map();
let lockHeld = false;
const originalNavigator = globalThis.navigator;
const originalLocalStorage = globalThis.localStorage;

globalThis.localStorage = {
	getItem: (key) => storage.get(key) ?? null,
	setItem: (key, value) => storage.set(key, String(value)),
	removeItem: (key) => storage.delete(key)
};
globalThis.navigator = {
	locks: {
		request: async (_name, _options, callback) => {
			if (lockHeld) return callback(null);
			lockHeld = true;
			try { return await callback({}); } finally { lockHeld = false; }
		}
	}
};

afterEach(() => {
	storage.clear();
	lockHeld = false;
});

describe('execution owner lease', () => {
	test('only one tab owns a scope and the record contains no authority data', async () => {
		const first = new ExecutionOwnerLease();
		const second = new ExecutionOwnerLease();
		const scope = executionOwnerScope('testnet', '0xAbC');
		const firstResult = await first.acquire(scope);
		expect(firstResult).toEqual({ ok: true });
		expect(first.isOwner(scope)).toBe(true);
		expect(JSON.parse(storage.get('vice.execution-owner.v1'))).toEqual(expect.objectContaining({ version: 1, scope, expiresAt: expect.any(Number) }));
		expect(JSON.parse(storage.get('vice.execution-owner.v1')).expiresAt).toBeGreaterThan(Date.now());
		expect(await second.acquire(scope)).toEqual({ ok: false, reason: 'Another tab owns secure trading for this account/network scope' });
		await first.release();
	});

	test('expired ownership requires an explicit takeover after the first tab releases', async () => {
		const first = new ExecutionOwnerLease();
		const second = new ExecutionOwnerLease();
		const scope = executionOwnerScope('testnet', '0xabc');
		await first.acquire(scope);
		storage.set('vice.execution-owner.v1', JSON.stringify({ version: 1, scope, ownerId: 'expired-owner', expiresAt: Date.now() - 1 }));
		expect(await second.acquire(scope)).toEqual({ ok: false, reason: 'Execution ownership expired; explicit takeover and fresh reconciliation are required' });
		await first.release();
		expect(await second.acquire(scope, { takeover: true })).toEqual({ ok: true });
		expect(second.isOwner(scope)).toBe(true);
		await second.release();
	});

	test('unsupported Web Locks fail closed instead of competing', async () => {
		const lease = new ExecutionOwnerLease();
		globalThis.navigator = {};
		expect(await lease.acquire(executionOwnerScope('testnet', '0xabc'))).toEqual({ ok: false, reason: 'This browser does not support Web Locks; secure trading remains read-only' });
		globalThis.navigator = { locks: { request: async (_name, _options, callback) => callback(null) } };
	});
});

afterAll(() => {
	globalThis.navigator = originalNavigator;
	globalThis.localStorage = originalLocalStorage;
});
