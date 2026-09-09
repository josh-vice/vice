import { describe, expect, test } from 'bun:test';
import { readStreamCatalog, validateStreamCatalog } from './stream-catalog.mjs';

describe('mainnet stream catalog', () => {
	test('checked-in streams satisfy the contract', async () => {
		expect(validateStreamCatalog(await readStreamCatalog())).toEqual([]);
	});
	test('rejects a testnet stream in a mainnet catalog', () => {
		expect(validateStreamCatalog({ schemaVersion: 1, streams: [{ id: 'x', network: 'testnet' }] })).toContain('x: network must be mainnet');
	});
});
