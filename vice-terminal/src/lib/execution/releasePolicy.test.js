import { describe, expect, test } from 'bun:test';
import { assertExecutionEntitled } from './releasePolicy.ts';
import { resolveExecutionCapability } from './executionCapability.ts';

const instrument = { instrumentKey: 'hyperliquid:linearPerp:BTC', venue: 'hyperliquid', venueSymbol: 'BTC', product: 'linearPerp', baseAsset: 'BTC', quoteAsset: 'USD', settlementAsset: 'USD', contractMultiplier: '1', pricePrecision: { kind: 'significantFigures', maxSignificantFigures: 5, maxDecimals: 6, integerPricesAllowed: true }, sizeIncrement: '0.001' };
const account = { accountKey: 'hyperliquid:mainnet:owner', venue: 'hyperliquid', credentialRef: 'local-wallet', accountMode: 'cross' };
const entitlement = { releaseBuild: 'build-1', policyVersion: 'policy-1', network: 'mainnet', walletAllowed: true, allowedActionIds: ['order.submit'], allowedVenues: ['hyperliquid'], allowedOrderFamilies: ['limit'], perOrderCapUsd: '100', aggregateCapUsd: '1000', halted: false, mode: 'full', issuedAt: 1_000, expiresAt: Date.now() + 10_000, approvalSha256: 'a'.repeat(64) };
const input = { wallet: '0x0000000000000000000000000000000000000001', actionId: 'order.submit', venue: 'hyperliquid', instrument, orderFamily: 'limit', notionalUsd: '25', risk: 'increase' };

describe('runtime release authorization', () => {
	test('accepts an active allowlisted entitlement under caps', () => {
		expect(() => assertExecutionEntitled(entitlement, input, 2_000)).not.toThrow();
	});
	test('rejects halt, wallet, action, and cap violations before signing', () => {
		expect(() => assertExecutionEntitled({ ...entitlement, halted: true }, input, 2_000)).toThrow('halted');
		expect(() => assertExecutionEntitled({ ...entitlement, walletAllowed: false }, input, 2_000)).toThrow('allowlisted');
		expect(() => assertExecutionEntitled(entitlement, { ...input, notionalUsd: '101' }, 2_000)).toThrow('per-order cap');
	});
	test('rejects a disallowed order family and aggregate cap overflow', () => {
		expect(() => assertExecutionEntitled(entitlement, { ...input, orderFamily: 'market' }, 2_000)).toThrow('order family');
		expect(() => assertExecutionEntitled(entitlement, { ...input, aggregateNotionalUsd: '1001' }, 2_000)).toThrow('aggregate');
	});
	test('resolves one capability decision with exact identity and feed requirements', () => {
		const result = resolveExecutionCapability({ ...input, account, orderFamily: 'limit', persistence: 'device-local', requiredFeeds: ['hl.l2-book'], entitlement });
		expect(result.allowed).toBe(true);
		expect(result.identity.instrumentKey).toBe(instrument.instrumentKey);
		expect(result.requiredFeedIds).toEqual(['hl.l2-book']);
	});
	test('fetches an entitlement using the complete execution identity without hiding reduce-risk mode', async () => {
		const originalFetch = globalThis.fetch;
		let requestUrl = '';
		globalThis.fetch = async (input) => {
			requestUrl = String(input);
			return new Response(JSON.stringify({ ...entitlement, walletAllowed: false, halted: true, mode: 'reduce-risk-only' }), { status: 200, headers: { 'content-type': 'application/json' } });
		};
		try {
			const { getExecutionEntitlement } = await import('./releasePolicy.ts');
			const result = await getExecutionEntitlement({ wallet: input.wallet, actionId: input.actionId, venue: input.venue, instrument: input.instrument, notionalUsd: input.notionalUsd, risk: 'reduce' });
			expect(new URL(requestUrl, 'http://localhost').searchParams.get('instrument')).toBe(input.instrument.instrumentKey);
			expect(new URL(requestUrl, 'http://localhost').searchParams.get('risk')).toBe('reduce');
			expect(result.mode).toBe('reduce-risk-only');
			expect(result.walletAllowed).toBe(false);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
	test('compares decimal caps without binary floating point rounding', () => {
		expect(() => assertExecutionEntitled({ ...entitlement, perOrderCapUsd: '0.3' }, { ...input, notionalUsd: '0.3000000000000000001' }, 2_000)).toThrow('per-order cap');
	});
	test('blocks future or mismatched identities with one explicit reason', () => {
		expect(resolveExecutionCapability({ ...input, account, orderFamily: 'limit', persistence: 'device-local', requiredFeeds: ['hl.l2-book'], entitlement: { ...entitlement, issuedAt: Date.now() + 60_000 } }).disabledReason).toContain('not yet valid');
		expect(resolveExecutionCapability({ ...input, account, orderFamily: 'limit', persistence: 'device-local', requiredFeeds: ['hl.l2-book'], entitlement: { ...entitlement, allowedVenues: ['binance'] } }).disabledReason).toContain('not enabled');
	});
});
