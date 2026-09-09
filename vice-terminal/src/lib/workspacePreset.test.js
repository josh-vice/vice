import { beforeEach, describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';
import { setWorkspacePanel, setWorkspacePreset, workspacePanels, workspacePreset, WORKSPACE_TOPOLOGIES } from './workspacePreset';

beforeEach(() => {
	globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
	workspacePreset.set('default');
});

describe('US-012 curated workspace presets', () => {
	test('changes only the local named-layout choice', () => {
		setWorkspacePreset('chart');
		expect(get(workspacePreset)).toBe('chart');
		setWorkspacePreset('data');
		expect(get(workspacePreset)).toBe('data');
	});

	test('persists panel visibility separately from the selected preset', () => {
		setWorkspacePanel('ticket', false);
		expect(get(workspacePanels).ticket).toBe(false);
		expect(get(workspacePreset)).toBe('default');
	});
	test('defines distinct minimal, chart, and data topologies', () => {
		expect(WORKSPACE_TOPOLOGIES.default).toEqual({ watchlist: true, marketData: true, ticket: true, bottom: true });
		expect(WORKSPACE_TOPOLOGIES.chart).not.toEqual(WORKSPACE_TOPOLOGIES.default);
		expect(WORKSPACE_TOPOLOGIES.data).not.toEqual(WORKSPACE_TOPOLOGIES.default);
		expect(WORKSPACE_TOPOLOGIES.data.ticket).toBe(false);
	});
});
