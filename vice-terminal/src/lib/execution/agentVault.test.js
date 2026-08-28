import { describe, expect, test } from 'bun:test';
import { assertConnectedAccount, assertProviderAccount } from './agentVault.ts';

describe('US-002 local signer custody boundary', () => {
	test('requires the provider to expose the exact displayed account', () => {
		expect(() => assertConnectedAccount(['0x1234'], '0x1234')).not.toThrow();
		expect(() => assertConnectedAccount(['0xABCD'], '0xabcd')).not.toThrow();
	});

	test('locks when the provider account differs', () => {
		expect(() => assertConnectedAccount(['0x1234'], '0x5678')).toThrow('account changed');
	});

	test('re-reads the provider before a master-wallet mutation', async () => {
		const provider = { request: async () => ['0xABCD'] };
		await expect(assertProviderAccount(provider, '0xabcd')).resolves.toBeUndefined();
		const switched = { request: async () => ['0x5678'] };
		await expect(assertProviderAccount(switched, '0xabcd')).rejects.toThrow('account changed');
	});

});
