import { beforeEach, describe, expect, test } from 'bun:test';
import { cliPreferences, expandCliInput, setCliPreference } from './preferences';

beforeEach(() => {
	globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
	cliPreferences.set({ aliases: {}, variables: {} });
});

describe('US-012 CLI local preferences', () => {
	test('expands a bounded alias and variable without inventing command semantics', () => {
		expect(setCliPreference('variables', 'size', '0.1')).toBeNull();
		expect(setCliPreference('aliases', 'probe', 'buy $size BTC-USD-PERP @ market')).toBeNull();
		expect(expandCliInput('probe')).toEqual({ value: 'buy 0.1 BTC-USD-PERP @ market' });
	});

	test('rejects unsafe preference names', () => {
		expect(setCliPreference('aliases', 'bad name', 'help')).toContain('Names must');
	});
});
