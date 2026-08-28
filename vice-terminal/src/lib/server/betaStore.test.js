import { describe, expect, test } from 'bun:test';
import { normalizeBetaWallet } from './betaStore.ts';

describe('durable beta tester identity', () => {
	test('normalizes valid wallet addresses', () => {
		expect(normalizeBetaWallet(' 0x000000000000000000000000000000000000000A ')).toBe('0x000000000000000000000000000000000000000a');
	});
	test('rejects malformed wallet addresses before persistence', () => {
		expect(() => normalizeBetaWallet('not-a-wallet')).toThrow('wallet address is invalid');
	});
});
