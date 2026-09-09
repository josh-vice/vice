// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { hyperliquidWsUrl, isPublicPlaneEvent } from './protocol';

describe('US-001 worker public-feed protocol', () => {
	test('keeps mainnet and testnet public sockets explicit', () => {
		expect(hyperliquidWsUrl('mainnet')).toBe('wss://api.hyperliquid.xyz/ws');
		expect(hyperliquidWsUrl('testnet')).toBe('wss://api.hyperliquid-testnet.xyz/ws');
	});

	test('accepts explicit epoch and monotonic receipt clocks only', () => {
		const event = { type: 'allMids', network: 'testnet', epoch: 1, sequence: 1, receivedAtMs: 1_700_000_000_000, receivedAtMonoMs: 42, mids: {} };
		expect(isPublicPlaneEvent(event)).toBe(true);
		expect(isPublicPlaneEvent({ ...event, receivedAt: 42 })).toBe(false);
		expect(isPublicPlaneEvent({ ...event, receivedAtMs: Number.NaN })).toBe(false);
		expect(isPublicPlaneEvent({ ...event, receivedAtMonoMs: -1 })).toBe(false);
		expect(isPublicPlaneEvent({ ...event, epoch: Number.POSITIVE_INFINITY })).toBe(false);
		expect(isPublicPlaneEvent({ ...event, network: 'othernet' })).toBe(false);
		expect(isPublicPlaneEvent({ type: 'allMids', epoch: '1', sequence: 1, receivedAtMs: 1, receivedAtMonoMs: 1, mids: {} })).toBe(false);
		expect(isPublicPlaneEvent({ ...event, sequence: -1 })).toBe(false);
		expect(isPublicPlaneEvent({ ...event, sequence: 1.5 })).toBe(false);
		expect(isPublicPlaneEvent({ type: 'unknown', epoch: 1 })).toBe(false);
	});

	test('status events remain timestamp-free', () => {
		expect(isPublicPlaneEvent({ type: 'status', network: 'testnet', epoch: 1, status: 'open' })).toBe(true);
		expect(isPublicPlaneEvent({ type: 'status', network: 'testnet', epoch: 1, status: 'open', receivedAtMs: 1 })).toBe(false);
	});

	test('rejects missing and malformed trade receipt clocks', () => {
		const event = { type: 'trades', network: 'testnet', epoch: 2, sequence: 1, receivedAtMs: 1_700_000_000_000, receivedAtMonoMs: 1, coin: 'BTC', trades: [] };
		expect(isPublicPlaneEvent(event)).toBe(true);
		expect(isPublicPlaneEvent({ ...event, receivedAtMs: undefined })).toBe(false);
		expect(isPublicPlaneEvent({ ...event, receivedAtMonoMs: '1' })).toBe(false);
	});

	test('rejects missing and malformed candle receipt clocks', () => {
		const candle = { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 };
		const event = { type: 'candle', network: 'testnet', epoch: 2, sequence: 1, receivedAtMs: 1_700_000_000_000, receivedAtMonoMs: 1, coin: 'BTC', interval: '1m', candle };
		expect(isPublicPlaneEvent(event)).toBe(true);
		expect(isPublicPlaneEvent({ ...event, receivedAtMs: -1 })).toBe(false);
		expect(isPublicPlaneEvent({ ...event, receivedAtMonoMs: Number.NaN })).toBe(false);
	});

	test('requires exact trade market identity', () => {
		const event = { type: 'trades', network: 'testnet', epoch: 2, sequence: 1, receivedAtMs: 1_700_000_000_000, receivedAtMonoMs: 1, coin: 'BTC', trades: [] };
		expect(isPublicPlaneEvent(event)).toBe(true);
		expect(isPublicPlaneEvent({ ...event, coin: undefined })).toBe(false);
	});

	test('requires exact candle market and interval identity', () => {
		const candle = { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 };
		const event = { type: 'candle', network: 'testnet', epoch: 2, sequence: 1, receivedAtMs: 1_700_000_000_000, receivedAtMonoMs: 1, coin: 'BTC', interval: '1m', candle };
		expect(isPublicPlaneEvent(event)).toBe(true);
		expect(isPublicPlaneEvent({ ...event, interval: undefined })).toBe(false);
		expect(isPublicPlaneEvent({ ...event, candle: {} })).toBe(false);
	});

});
