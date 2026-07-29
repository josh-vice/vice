import { describe, expect, test } from 'bun:test';
import { builderFeeIsApproved, builderEligibleForOrderType, builderForOrderType, builderRevenueEnabled, configuredBuilder, configuredReferralCode, orderTypeRevenueDisclosure, revenueAttributionReady, shouldRetryWithoutBuilder } from './revenueConfig';

describe('optional builder monetization', () => {
	test('tags only orders covered by the authoritative venue approval', () => {
		expect(builderFeeIsApproved(0)).toBe(false);
		expect(builderFeeIsApproved(1)).toBe(true);
		expect(builderFeeIsApproved(2, 3)).toBe(false);
		expect(builderFeeIsApproved(2, 2)).toBe(false);
	});

	test('starts fail-closed until explicit revenue opt-in', () => {
		expect(builderRevenueEnabled()).toBe(false);
		expect(configuredBuilder()).toBeNull();
	});

	test('keeps native TWAP outside builder attribution', () => {
		expect(builderEligibleForOrderType('limit')).toBe(true);
		expect(builderEligibleForOrderType('scale')).toBe(true);
		expect(builderEligibleForOrderType('twap')).toBe(false);
		expect(orderTypeRevenueDisclosure('twap')).toBeNull();
	});

	test('centralizes eligible-order tagging', () => {
		const builder = { b: '0x0000000000000000000000000000000000000001', f: 1 };
		expect(builderForOrderType(builder, 'limit')).toEqual(builder);
		expect(builderForOrderType(builder, 'bracket')).toEqual(builder);
		expect(builderForOrderType(builder, 'scale')).toEqual(builder);
		expect(builderForOrderType(builder, 'twap')).toBeUndefined();
		expect(builderForOrderType(undefined, 'limit')).toBeUndefined();
		expect(builderForOrderType({ ...builder, f: 2 }, 'limit')).toBeUndefined();
		expect(builderForOrderType({ ...builder, b: 'not-an-address' }, 'limit')).toBeUndefined();
	});

	test('fails builder attribution closed when the authoritative revenue snapshot is stale or degraded', () => {
		expect(revenueAttributionReady('live', { status: 'live' })).toBe(true);
		expect(revenueAttributionReady('stale', { status: 'live' })).toBe(false);
		expect(revenueAttributionReady('live', { status: 'degraded' })).toBe(false);
		expect(revenueAttributionReady('live', null)).toBe(false);
	});

	test('exposes referral configuration only as an explicit consent-preview value', () => {
		const code = configuredReferralCode();
		expect(code === null || code.length > 0).toBe(true);
	});

	test('falls back without builder only on a complete explicit builder rejection', () => {
		expect(shouldRetryWithoutBuilder(true, 'builder_rejected', [])).toBe(true);
		expect(shouldRetryWithoutBuilder(true, 'builder_rejected', ['123'])).toBe(false);
		expect(shouldRetryWithoutBuilder(true, 'network', [])).toBe(false);
		expect(shouldRetryWithoutBuilder(false, 'builder_rejected', [])).toBe(false);
	});
});
