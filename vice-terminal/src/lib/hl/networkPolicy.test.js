import { describe, expect, test } from 'bun:test';
import { MAINNET_ACK, resolveHyperliquidNetwork } from './networkPolicy';

describe('mainnet release lock', () => {
	test('defaults to testnet', () => expect(resolveHyperliquidNetwork({}).network).toBe('testnet'));
	test('rejects mainnet without an explicit acknowledgement', () => {
		expect(() => resolveHyperliquidNetwork({ network: 'mainnet' })).toThrow('Mainnet is locked');
		expect(resolveHyperliquidNetwork({ network: 'mainnet', mainnetAck: MAINNET_ACK }).isTestnet).toBe(false);
	});
});
