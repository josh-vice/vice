import { describe, expect, test } from 'bun:test';
import { WORKSPACE_LAYOUT_SCHEMA, isSavedWorkspaceLayout, loadWorkspaceLayout, removeWorkspaceLayout, saveWorkspaceLayout } from './workspaceLayout.ts';

function storage() {
	const values = new Map();
	globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
	return values;
}

describe('workspace layout persistence', () => {
	test('persists only named, versioned local layouts', () => {
		storage();
		expect(saveWorkspaceLayout('default', { grid: {} }, 1)).toBe(true);
		expect(loadWorkspaceLayout('default')).toEqual({ schema: WORKSPACE_LAYOUT_SCHEMA, updatedAt: 1, layout: { grid: {} } });
		expect(saveWorkspaceLayout('Default', { grid: {} }, 1)).toBe(false);
	});

	test('rejects corrupted or incompatible stored data without throwing', () => {
		const values = storage();
		values.set('vice.workspace-layouts.v1', '{bad json');
		expect(loadWorkspaceLayout('default')).toBeUndefined();
		expect(isSavedWorkspaceLayout({ schema: 0, updatedAt: 1, layout: {} })).toBe(false);
		expect(isSavedWorkspaceLayout({ schema: WORKSPACE_LAYOUT_SCHEMA, updatedAt: 1, layout: {} })).toBe(true);
		expect(WORKSPACE_LAYOUT_SCHEMA).toBe(2);
	});

	test('removes only the requested named layout', () => {
		storage();
		saveWorkspaceLayout('default', { grid: {} }, 1);
		saveWorkspaceLayout('chart', { grid: {} }, 2);
		removeWorkspaceLayout('default');
		expect(loadWorkspaceLayout('default')).toBeUndefined();
		expect(loadWorkspaceLayout('chart')?.updatedAt).toBe(2);
	});
});
