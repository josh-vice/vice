import { describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';
import { clearWorkspaceLinkContext, loadWorkspaceLinkContexts, resetWorkspaceLinkContextsForTest, setWorkspaceLinkContext, workspaceLinkContext } from './workspaceLinks.ts';

function storage() {
	const values = new Map();
	globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
	return values;
}

describe('public workspace link contexts', () => {
	test('persists only an exact public market and timeframe per explicit group', () => {
		storage();
		resetWorkspaceLinkContextsForTest();
		expect(setWorkspaceLinkContext('cyan', { marketKey: 'perp:BTC', timeframe: '1h' }, 1)).toBe(true);
		expect(get(workspaceLinkContext('cyan'))).toEqual({ marketKey: 'perp:BTC', timeframe: '1h', updatedAt: 1 });
		expect(localStorage.getItem('vice.workspace-links.v1')).toBe('{"cyan":{"marketKey":"perp:BTC","timeframe":"1h","updatedAt":1}}');
		clearWorkspaceLinkContext('cyan');
		expect(get(workspaceLinkContext('cyan'))).toBeNull();
	});

	test('rejects malformed contexts and clears corrupted local state', () => {
		const values = storage();
		resetWorkspaceLinkContextsForTest();
		expect(setWorkspaceLinkContext('cyan', { marketKey: ' perp:BTC ', timeframe: '1h' })).toBe(false);
		values.set('vice.workspace-links.v1', '{bad');
		loadWorkspaceLinkContexts();
		expect(get(workspaceLinkContext('cyan'))).toBeNull();
	});

	test('strips untrusted extra fields instead of retaining private runtime or stored data', () => {
		const values = storage();
		resetWorkspaceLinkContextsForTest();
		expect(setWorkspaceLinkContext('amber', { marketKey: 'perp:ETH', timeframe: '5m', account: 'never-persist' }, 2)).toBe(true);
		expect(localStorage.getItem('vice.workspace-links.v1')).toBe('{"amber":{"marketKey":"perp:ETH","timeframe":"5m","updatedAt":2}}');
		resetWorkspaceLinkContextsForTest();
		values.set('vice.workspace-links.v1', JSON.stringify({ violet: { marketKey: 'perp:SOL', timeframe: '1m', updatedAt: 3, credential: 'never-retain' } }));
		loadWorkspaceLinkContexts();
		expect(get(workspaceLinkContext('violet'))).toEqual({ marketKey: 'perp:SOL', timeframe: '1m', updatedAt: 3 });
	});
});
