import { get, writable, type Writable } from 'svelte/store';

export type WorkspacePreset = 'default' | 'chart' | 'data';
export type WorkspacePanel = 'watchlist' | 'marketData' | 'ticket' | 'bottom';
export type WorkspacePanels = Record<WorkspacePanel, boolean>;

const STORAGE_KEY = 'vice.workspace-preset.v1';
const PANELS_STORAGE_KEY = 'vice.workspace-panels.v1';
const VALID = new Set<WorkspacePreset>(['default', 'chart', 'data']);
const DEFAULT_PANELS: WorkspacePanels = { watchlist: true, marketData: true, ticket: true, bottom: true };

export const workspacePreset: Writable<WorkspacePreset> = writable('default');
export const workspacePanels: Writable<WorkspacePanels> = writable(DEFAULT_PANELS);
let loaded = false;

export function loadWorkspacePreset(): WorkspacePreset {
	if (loaded) return get(workspacePreset);
	loaded = true;
	if (typeof localStorage === 'undefined') return 'default';
	try {
		const value = localStorage.getItem(STORAGE_KEY);
		const preset = VALID.has(value as WorkspacePreset) ? value as WorkspacePreset : 'default';
		workspacePreset.set(preset);
		const panelValue = JSON.parse(localStorage.getItem(PANELS_STORAGE_KEY) ?? 'null');
		if (panelValue && typeof panelValue === 'object') {
			workspacePanels.set({
				watchlist: typeof panelValue.watchlist === 'boolean' ? panelValue.watchlist : true,
				marketData: typeof panelValue.marketData === 'boolean' ? panelValue.marketData : true,
				ticket: typeof panelValue.ticket === 'boolean' ? panelValue.ticket : true,
				bottom: typeof panelValue.bottom === 'boolean' ? panelValue.bottom : true
			});
		}
		return preset;
	} catch { return 'default'; }
}

export function setWorkspacePanel(panel: WorkspacePanel, visible: boolean): void {
	workspacePanels.update((current) => {
		const next = { ...current, [panel]: visible };
		if (typeof localStorage !== 'undefined') {
			try { localStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify(next)); } catch { /* local preference only */ }
		}
		return next;
	});
}

export function setWorkspacePreset(preset: WorkspacePreset): void {
	workspacePreset.set(preset);
	loaded = true;
	if (typeof localStorage === 'undefined') return;
	try { localStorage.setItem(STORAGE_KEY, preset); } catch { /* local preference only */ }
}

/** Ask the client-only workspace host to rebuild the selected local layout. */
export function requestWorkspaceLayoutReset(): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new Event('vice:workspace-layout-reset'));
}
