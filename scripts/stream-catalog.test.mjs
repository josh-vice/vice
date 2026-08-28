import { describe, expect, test } from 'bun:test';
import { readStreamCatalog, validateStreamCatalog } from './stream-catalog.mjs';

describe('mainnet stream catalog', () => {
	test('checked-in streams satisfy the contract', async () => {
		expect(validateStreamCatalog(await readStreamCatalog())).toEqual([]);
	});
	test('rejects a testnet stream in a mainnet catalog', () => {
		expect(validateStreamCatalog({ schemaVersion: 1, streams: [{ id: 'x', network: 'testnet' }] })).toContain('x: network must be mainnet');
	});
	test('rejects a stream dependency not present in the action catalog', () => {
		const catalog = { schemaVersion: 1, streams: [{ id: 'x', venue: 'hyperliquid', network: 'mainnet', product: 'perp', instrument: 'BTC', sourceProtocol: 'websocket', subscription: { type: 'book' }, authoritativeSourceTimestamp: 'frame.time', receiptTimestamp: 'client.time', epoch: '1', freshnessThresholdMs: 1, bootstrapRule: 'snapshot', reconnectRule: 'resubscribe', consumer: 'book', healthStore: 'feed', degradedBehavior: 'stale', actionDependencies: ['missing.action'], privacy: 'public', evidenceIds: ['evidence'] }] };
		expect(validateStreamCatalog(catalog, { actionIds: new Set(['known.action']) })).toContain('x: unknown action dependency missing.action');
	});
});
