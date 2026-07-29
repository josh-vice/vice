import { describe, expect, test } from 'bun:test';
import { assertFreshExecutionState, assertTradingAllowed, tradingKillSwitchActive } from './releaseSafety.ts';

describe('US-005 release kill switch', () => {
	test('halts new trading when explicitly enabled', () => {
		expect(tradingKillSwitchActive('true')).toBe(true);
		expect(() => assertTradingAllowed('true')).toThrow('release kill switch');
	});

	test('leaves trading enabled by default and when disabled', () => {
		expect(tradingKillSwitchActive(undefined)).toBe(false);
		expect(() => assertTradingAllowed('false')).not.toThrow();
	});

	test('requires a live wallet, account snapshot, and market feed', () => {
		expect(() => assertFreshExecutionState(true, 'live', 'live')).not.toThrow();
		expect(() => assertFreshExecutionState(true, 'stale', 'live')).toThrow('account snapshot');
		expect(() => assertFreshExecutionState(true, 'live', 'stale')).toThrow('market feed');
		expect(() => assertFreshExecutionState(false, 'live', 'live')).toThrow('account snapshot');
	});
});
