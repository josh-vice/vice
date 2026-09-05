import { describe, expect, test } from 'bun:test';
import {
	HL_WS_RELIABILITY_LIMITS,
	getMarketReconnectDelayMs,
	getSdkReconnectionDelayMs,
	isPublicPlaneFrameWithinLimit,
	utf8ByteLength
} from './reliability';

describe('Hyperliquid stream reliability policy', () => {
	test('uses capped exponential SDK reconnect delays', () => {
		expect(getSdkReconnectionDelayMs(0)).toBe(HL_WS_RELIABILITY_LIMITS.sdkReconnect.baseDelayMs);
		expect(getSdkReconnectionDelayMs(1)).toBe(1_000);
		expect(getSdkReconnectionDelayMs(20)).toBe(HL_WS_RELIABILITY_LIMITS.sdkReconnect.maxDelayMs);
		expect(getSdkReconnectionDelayMs(-1)).toBe(HL_WS_RELIABILITY_LIMITS.sdkReconnect.baseDelayMs);
	});

	test('uses a short capped delay for local feed rebuilds', () => {
		expect(getMarketReconnectDelayMs(0)).toBe(250);
		expect(getMarketReconnectDelayMs(1)).toBe(500);
		expect(getMarketReconnectDelayMs(20)).toBe(HL_WS_RELIABILITY_LIMITS.marketReconnect.maxDelayMs);
	});

	test('measures frame limits in UTF-8 bytes', () => {
		expect(utf8ByteLength('abc')).toBe(3);
		expect(utf8ByteLength('€')).toBe(3);
		expect(isPublicPlaneFrameWithinLimit('a'.repeat(HL_WS_RELIABILITY_LIMITS.publicFrame.maxBytes))).toBe(true);
		expect(isPublicPlaneFrameWithinLimit('a'.repeat(HL_WS_RELIABILITY_LIMITS.publicFrame.maxBytes + 1))).toBe(false);
	});
});
