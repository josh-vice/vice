// v2 deliberately invalidates layouts that could restore floating/popout
// groups as the primary grid. Those transient presentation surfaces must not
// displace the trader's core workspace on a later launch.
export const WORKSPACE_LAYOUT_SCHEMA = 2;
const STORAGE_KEY = 'vice.workspace-layouts.v1';

export type SavedWorkspaceLayout = {
	schema: typeof WORKSPACE_LAYOUT_SCHEMA;
	updatedAt: number;
	layout: unknown;
};

type SavedWorkspaceLayouts = Record<string, SavedWorkspaceLayout>;

function canUseStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

function validName(name: string): boolean {
	return /^[a-z][a-z0-9_-]{0,31}$/.test(name);
}

function readAll(): SavedWorkspaceLayouts {
	if (!canUseStorage()) return {};
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
		return Object.fromEntries(Object.entries(parsed).filter(([name, value]) => validName(name) && isSavedWorkspaceLayout(value))) as SavedWorkspaceLayouts;
	} catch {
		return {};
	}
}

export function isSavedWorkspaceLayout(value: unknown): value is SavedWorkspaceLayout {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const candidate = value as Record<string, unknown>;
	return candidate.schema === WORKSPACE_LAYOUT_SCHEMA && Number.isFinite(candidate.updatedAt) && candidate.layout !== null && typeof candidate.layout === 'object';
}

export function loadWorkspaceLayout(name: string): SavedWorkspaceLayout | undefined {
	if (!validName(name)) return undefined;
	return readAll()[name];
}

export function saveWorkspaceLayout(name: string, layout: unknown, updatedAt = Date.now()): boolean {
	if (!validName(name) || !layout || typeof layout !== 'object' || !Number.isFinite(updatedAt)) return false;
	const next = { ...readAll(), [name]: { schema: WORKSPACE_LAYOUT_SCHEMA, updatedAt, layout } };
	if (!canUseStorage()) return false;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		return true;
	} catch {
		return false;
	}
}

export function removeWorkspaceLayout(name: string): void {
	if (!validName(name) || !canUseStorage()) return;
	const layouts = readAll();
	if (!(name in layouts)) return;
	delete layouts[name];
	try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts)); } catch { /* local preference only */ }
}
