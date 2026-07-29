import { describe, expect, test } from 'bun:test';
import { deterministicCloid, nextPersistedSequence, reservePersistedSequence, sequenceStorageKey } from './commandIdentity';
import { withOneTransportRetry } from './retryPolicy';

describe('US-002 persisted command identity', () => {
	test('increments an account/network-scoped sequence across reloads', () => {
		const values = new Map();
		const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
		expect(nextPersistedSequence('testnet', '0xAbC', 0, storage)).toBe(1);
		expect(nextPersistedSequence('testnet', '0xAbC', 0, storage)).toBe(2);
		expect(nextPersistedSequence('mainnet', '0xAbC', 0, storage)).toBe(1);
		expect(values.get(sequenceStorageKey('testnet', '0xabc'))).toBe('2');
	});

	test('creates stable, distinct 16-byte cloids for command slots', () => {
		expect(deterministicCloid(7, 0)).toBe(deterministicCloid(7, 0));
		expect(deterministicCloid(7, 0)).not.toBe(deterministicCloid(7, 1));
		expect(deterministicCloid(7, 0)).toMatch(/^0x[0-9a-f]{32}$/);
	});

	test('keeps 10,000 lost-ack retries unique and idempotent', async () => {
		const values = new Map();
		const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
		const seen = new Set();
		for (let index = 0; index < 10_000; index += 1) {
			const sequence = nextPersistedSequence('testnet', '0xChaos', 0, storage);
			const cloid = deterministicCloid(sequence, 0);
			let attempts = 0;
			const result = await withOneTransportRetry(async () => {
				attempts += 1;
				if (attempts === 1) throw new Error('lost ack');
				return cloid;
			}, 0);
			expect(result).toBe(cloid);
			expect(attempts).toBe(2);
			expect(seen.has(cloid)).toBe(false);
			seen.add(cloid);
		}
		expect(seen.size).toBe(10_000);
	});

	test('serializes concurrent persisted reservations', async () => {
		const values = new Map();
		const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
		const sequences = await Promise.all(
			Array.from({ length: 256 }, () => reservePersistedSequence('testnet', '0xConcurrent', 0, storage))
		);
		expect(new Set(sequences).size).toBe(256);
		expect(Math.max(...sequences)).toBe(256);
	});
});
