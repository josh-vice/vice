// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { hyperliquidWsUrl, isPublicPlaneEvent } from './protocol';

describe('US-001 worker public-feed protocol', () => {
	test('keeps mainnet and testnet public sockets explicit', () => {
		expect(hyperliquidWsUrl('mainnet')).toBe('wss://api.hyperliquid.xyz/ws');
		expect(hyperliquidWsUrl('testnet')).toBe('wss://api.hyperliquid-testnet.xyz/ws');
	});

	test('accepts only versioned worker events', () => {
		expect(isPublicPlaneEvent({ type: 'allMids', network: 'testnet', epoch: 1, receivedAt: 1, mids: {} })).toBe(true);
		expect(isPublicPlaneEvent({ type: 'allMids', network: 'othernet', epoch: 1 })).toBe(false);
		expect(isPublicPlaneEvent({ type: 'allMids', epoch: '1' })).toBe(false);
		expect(isPublicPlaneEvent({ type: 'unknown', epoch: 1 })).toBe(false);
	});

	test('accepts trade events only when their exact market identity is present', () => {
		expect(isPublicPlaneEvent({ type: 'trades', network: 'testnet', epoch: 2, receivedAt: 1, coin: 'BTC', trades: [] })).toBe(true);
		expect(isPublicPlaneEvent({ type: 'trades', network: 'testnet', epoch: 2, receivedAt: 1, trades: [] })).toBe(false);
	});

	test('accepts candle events only with exact coin and interval identity', () => {
		const candle = { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 };
		expect(isPublicPlaneEvent({ type: 'candle', network: 'testnet', epoch: 2, receivedAt: 1, coin: 'BTC', interval: '1m', candle })).toBe(true);
		expect(isPublicPlaneEvent({ type: 'candle', network: 'testnet', epoch: 2, receivedAt: 1, coin: 'BTC', candle })).toBe(false);
		expect(isPublicPlaneEvent({ type: 'candle', network: 'testnet', epoch: 2, receivedAt: 1, coin: 'BTC', interval: '1m', candle: {} })).toBe(false);
	});
});
