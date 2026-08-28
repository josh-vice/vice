import { afterEach, describe, expect, test } from 'bun:test';
import { assertFreshExecutionState, assertTradingAllowed, setRemoteReleaseHalt, tradingKillSwitchActive } from './releaseSafety.ts';

afterEach(() => setRemoteReleaseHalt(false));

describe('release safety policy', () => {
	test('halts new trading when explicitly enabled', () => {
		expect(tradingKillSwitchActive('true')).toBe(true);
		expect(() => assertTradingAllowed('true')).toThrow('release policy');
	});
	test('remote halt blocks existing clients without a reload', () => {
		setRemoteReleaseHalt(true);
		expect(tradingKillSwitchActive('false')).toBe(true);
		expect(() => assertTradingAllowed('false')).toThrow('release policy');
	});
	test('leaves trading enabled by default and validates fresh state', () => {
		expect(tradingKillSwitchActive(undefined)).toBe(false);
		expect(() => assertTradingAllowed('false')).not.toThrow();
		expect(() => assertFreshExecutionState(false, 'live', 'live')).toThrow('account snapshot');
	});
	test('keeps reduce-risk recovery available during a remote halt', () => {
		setRemoteReleaseHalt(true);
		expect(() => assertTradingAllowed('false', 'reduce')).not.toThrow();
	});
});
