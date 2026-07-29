import { get, writable, type Readable } from 'svelte/store';

export const WORKSPACE_LINK_GROUPS = ['cyan', 'amber', 'violet'] as const;
export type WorkspaceLinkGroup = (typeof WORKSPACE_LINK_GROUPS)[number];

export type PublicWorkspaceLinkContext = {
	marketKey: string;
	timeframe: string;
	updatedAt: number;
};

const STORAGE_KEY = 'vice.workspace-links.v1';
const contexts = new Map<WorkspaceLinkGroup, ReturnType<typeof writable<PublicWorkspaceLinkContext | null>>>(
	WORKSPACE_LINK_GROUPS.map((group) => [group, writable<PublicWorkspaceLinkContext | null>(null)])
);

function validGroup(group: string): group is WorkspaceLinkGroup {
	return (WORKSPACE_LINK_GROUPS as readonly string[]).includes(group);
}

/**
 * Keep the persisted shape deliberately narrow. Runtime callers and corrupted
 * local storage may contain extra keys even when TypeScript callers do not.
 */
function publicContext(value: unknown): PublicWorkspaceLinkContext | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const candidate = value as Record<string, unknown>;
	if (!(typeof candidate.marketKey === 'string'
		&& candidate.marketKey.trim() === candidate.marketKey
		&& candidate.marketKey.length > 0
		&& candidate.marketKey.length <= 160
		&& typeof candidate.timeframe === 'string'
		&& candidate.timeframe.trim() === candidate.timeframe
		&& candidate.timeframe.length > 0
		&& candidate.timeframe.length <= 16
		&& typeof candidate.updatedAt === 'number'
		&& Number.isSafeInteger(candidate.updatedAt)
		&& candidate.updatedAt >= 0)) return null;
	return { marketKey: candidate.marketKey, timeframe: candidate.timeframe, updatedAt: candidate.updatedAt };
}

function save(): void {
	if (typeof localStorage === 'undefined') return;
	const values = Object.fromEntries(WORKSPACE_LINK_GROUPS.flatMap((group) => {
		const context = get(contexts.get(group)!);
		return context ? [[group, context]] : [];
	}));
	try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch { /* Local presentation preference only. */ }
}

/** Restore only complete public market/timeframe contexts; no account or execution state is stored. */
export function loadWorkspaceLinkContexts(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
		for (const group of WORKSPACE_LINK_GROUPS) contexts.get(group)!.set(publicContext((parsed as Record<string, unknown>)[group]));
	} catch {
		for (const group of WORKSPACE_LINK_GROUPS) contexts.get(group)!.set(null);
	}
}

export function workspaceLinkContext(group: WorkspaceLinkGroup): Readable<PublicWorkspaceLinkContext | null> {
	return contexts.get(group)!;
}

/** Publish one exact public market/timeframe pair to its explicit local link group. */
export function setWorkspaceLinkContext(group: WorkspaceLinkGroup, context: Omit<PublicWorkspaceLinkContext, 'updatedAt'>, updatedAt = Date.now()): boolean {
	const sanitized = publicContext({ ...context, updatedAt });
	if (!validGroup(group) || !sanitized) return false;
	contexts.get(group)!.set(sanitized);
	save();
	return true;
}

export function clearWorkspaceLinkContext(group: WorkspaceLinkGroup): void {
	if (!validGroup(group)) return;
	contexts.get(group)!.set(null);
	save();
}

/** Test-only local reset; production callers can only clear one explicit group. */
export function resetWorkspaceLinkContextsForTest(): void {
	for (const group of WORKSPACE_LINK_GROUPS) contexts.get(group)!.set(null);
}
