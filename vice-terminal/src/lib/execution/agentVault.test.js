import { describe, expect, test } from 'bun:test';
import { assertConnectedAccount, assertProviderAccount, isAgentApprovalCurrent } from './agentVault.ts';

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

	test('requires a current venue approval for a reopened local agent', () => {
		const now = 1_000;
		const agent = '0x00000000000000000000000000000000000000Aa';
		expect(isAgentApprovalCurrent([{ address: agent, validUntil: now + 1 }], agent, now)).toBe(true);
		expect(isAgentApprovalCurrent([{ address: agent, validUntil: now }], agent, now)).toBe(false);
		expect(isAgentApprovalCurrent([{ address: '0x00000000000000000000000000000000000000Bb', validUntil: now + 1 }], agent, now)).toBe(false);
	});

});
