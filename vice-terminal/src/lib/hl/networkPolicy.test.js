import { describe, expect, test } from 'bun:test';
import { MAINNET_ACK, resolveHyperliquidNetwork, resolveHyperliquidPublicNetwork } from './networkPolicy';

describe('mainnet release lock', () => {
	test('defaults to testnet', () => expect(resolveHyperliquidNetwork({}).network).toBe('testnet'));
	test('rejects mainnet without an explicit acknowledgement', () => {
		expect(() => resolveHyperliquidNetwork({ network: 'mainnet' })).toThrow('Mainnet is locked');
		expect(resolveHyperliquidNetwork({ network: 'mainnet', mainnetAck: MAINNET_ACK }).isTestnet).toBe(false);
	});
	test('public market data defaults to mainnet without unlocking trading', () => {
		expect(resolveHyperliquidPublicNetwork({}).network).toBe('mainnet');
		expect(resolveHyperliquidPublicNetwork({}).isTestnet).toBe(false);
	});

	test('public network still validates explicit network names', () => {
		expect(resolveHyperliquidPublicNetwork({ network: 'testnet' }).network).toBe('testnet');
		expect(() => resolveHyperliquidPublicNetwork({ network: 'paper' })).toThrow('Invalid Hyperliquid public network');
	});
});
