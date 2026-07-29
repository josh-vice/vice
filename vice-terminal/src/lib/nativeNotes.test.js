// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';

function storageWith(entries) {
	const storage = new Map(entries);
	globalThis.localStorage = {
		getItem: (key) => storage.get(key) ?? null,
		setItem: (key, value) => storage.set(key, value),
		removeItem: (key) => storage.delete(key)
	};
	return storage;
}

describe('US-014 native Notes migration', () => {
	test('imports every legacy scratchpad once and preserves its text', async () => {
		const legacy = {
			layouts: {
				Macro: { grid: [{ id: 'macro-note', type: 'vNotes', settings: { text: 'CPI levels' } }] },
				DeFi: { grid: [{ id: 'watch', type: 'vWatch', settings: {} }, { id: 'defi-note', type: 'vNotes', settings: { text: 'Funding plan' } }] }
			}
		};
		const storage = storageWith([['viceHub.v1', JSON.stringify(legacy)]]);
		const notes = await import(`./nativeNotes.ts?legacy-migration=${crypto.randomUUID()}`);
		expect(notes.loadNativeNotes()).toEqual([
			expect.objectContaining({ id: 'legacy:macro-note', title: 'Macro scratchpad', text: 'CPI levels' }),
			expect.objectContaining({ id: 'legacy:defi-note', title: 'DeFi scratchpad', text: 'Funding plan' })
		]);
		expect(JSON.parse(storage.get('vice.native-notes.v1'))).toHaveLength(2);
		expect(get(notes.nativeNotes)).toHaveLength(2);
	});

	test('contains a corrupt native record and does not re-import legacy data', async () => {
		storageWith([
			['vice.native-notes.v1', '{bad-json'],
			['viceHub.v1', JSON.stringify({ layouts: { Default: { grid: [{ id: 'old', type: 'vNotes', settings: { text: 'must not return' } }] } } })]
		]);
		const notes = await import(`./nativeNotes.ts?corrupt-native=${crypto.randomUUID()}`);
		expect(notes.loadNativeNotes()).toEqual([]);
	});
});
