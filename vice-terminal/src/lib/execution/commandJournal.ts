import { hyperliquidNetwork } from '$lib/hl/network';

export type JournalStatus = 'pending' | 'accepted' | 'rejected' | 'uncertain' | 'reconciled';

export interface ExecutionJournalEntry {
	commandId: string;
	network: string;
	account: string;
	sequence: number;
	kind: 'place' | 'scale' | 'modify' | 'cancel' | 'twap' | 'scheduleCancel';
	cloids: string[];
	targetOrderId?: string;
	targetPrice?: string;
	targetField?: 'limitPx' | 'triggerPx';
	targetTwapId?: number;
	status: JournalStatus;
	venueOrderIds: string[];
	error?: string;
	updatedAt: number;
}

export interface ExecutionAuditExport {
	schema: 1;
	kind: 'vice.execution-audit';
	network: string;
	account: string;
	entries: Array<{
		commandId: string;
		sequence: number;
		kind: ExecutionJournalEntry['kind'];
		cloids: string[];
		targetOrderId?: string;
		targetPrice?: string;
		targetField?: ExecutionJournalEntry['targetField'];
		targetTwapId?: number;
		status: JournalStatus;
		venueOrderIds: string[];
		updatedAt: number;
	}>;
}

const PREFIX = 'vice.execution.journal.v1';
const MAX_ENTRIES = 100;

function storageKey(account: string): string {
	return `${PREFIX}:${hyperliquidNetwork.network}:${account.toLowerCase()}`;
}

function storage(): Storage | undefined {
	return typeof localStorage === 'undefined' ? undefined : localStorage;
}

export function loadExecutionJournal(account: string): ExecutionJournalEntry[] {
	const store = storage();
	if (!store) return [];
	try {
		const parsed = JSON.parse(store.getItem(storageKey(account)) ?? '[]');
		return Array.isArray(parsed)
			? parsed.filter((entry) => entry && typeof entry.commandId === 'string' && Array.isArray(entry.cloids))
			: [];
	} catch {
		return [];
	}
}

function saveExecutionJournal(account: string, entries: ExecutionJournalEntry[]): void {
	storage()?.setItem(storageKey(account), JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

export function beginExecutionCommand(entry: Omit<ExecutionJournalEntry, 'status' | 'updatedAt'>): void {
	const entries = loadExecutionJournal(entry.account).filter((candidate) => candidate.commandId !== entry.commandId);
	entries.push({ ...entry, status: 'pending', updatedAt: Date.now() });
	saveExecutionJournal(entry.account, entries);
}

export function finishExecutionCommand(
	account: string,
	commandId: string,
	update: Pick<ExecutionJournalEntry, 'status' | 'venueOrderIds'> & { error?: string }
): void {
	const entries = loadExecutionJournal(account);
	const index = entries.findIndex((entry) => entry.commandId === commandId);
	if (index < 0) return;
	entries[index] = { ...entries[index], ...update, updatedAt: Date.now() };
	saveExecutionJournal(account, entries);
}

export function unresolvedExecutionCommands(account: string): ExecutionJournalEntry[] {
	return loadExecutionJournal(account).filter((entry) => entry.status === 'pending' || entry.status === 'uncertain');
}

export function assertNoUnresolvedExecutionCommands(account: string): void {
	const unresolved = unresolvedExecutionCommands(account);
	if (unresolved.length > 0) {
		throw new Error(`Trading is paused until ${unresolved.length} uncertain execution outcome${unresolved.length === 1 ? '' : 's'} is reconciled`);
	}
}

export function clearExecutionJournal(account: string): void {
	storage()?.removeItem(storageKey(account));
}

function auditEntry(entry: ExecutionJournalEntry, account: string): ExecutionAuditExport['entries'][number] | null {
	if (entry.account.toLowerCase() !== account.toLowerCase() || entry.network !== hyperliquidNetwork.network) return null;
	if (!Number.isSafeInteger(entry.sequence) || entry.sequence < 0 || !Number.isFinite(entry.updatedAt)) return null;
	if (!['place', 'scale', 'modify', 'cancel', 'twap', 'scheduleCancel'].includes(entry.kind)) return null;
	if (!['pending', 'accepted', 'rejected', 'uncertain', 'reconciled'].includes(entry.status)) return null;
	if (!Array.isArray(entry.cloids) || !Array.isArray(entry.venueOrderIds)) return null;
	const base = {
		commandId: entry.commandId,
		sequence: entry.sequence,
		kind: entry.kind,
		cloids: entry.cloids.filter((value): value is string => typeof value === 'string'),
		status: entry.status,
		venueOrderIds: entry.venueOrderIds.filter((value): value is string => typeof value === 'string'),
		updatedAt: entry.updatedAt
	};
	return {
		...base,
		...(typeof entry.targetOrderId === 'string' ? { targetOrderId: entry.targetOrderId } : {}),
		...(typeof entry.targetPrice === 'string' ? { targetPrice: entry.targetPrice } : {}),
		...(entry.targetField === 'limitPx' || entry.targetField === 'triggerPx' ? { targetField: entry.targetField } : {}),
		...(Number.isSafeInteger(entry.targetTwapId) ? { targetTwapId: entry.targetTwapId } : {})
	};
}

/**
 * Build a deterministic, local-user audit record. It deliberately excludes
 * encrypted agent material, signatures, request bodies, and unbounded venue
 * error text. Account identity and command IDs remain because the trader needs
 * them to reconcile the exported evidence with their own venue history.
 */
export function exportExecutionAudit(account: string, entries = loadExecutionJournal(account)): ExecutionAuditExport {
	const normalized = entries
		.map((entry) => auditEntry(entry, account))
		.filter((entry): entry is ExecutionAuditExport['entries'][number] => entry !== null)
		.sort((left, right) => left.sequence - right.sequence || left.commandId.localeCompare(right.commandId));
	return {
		schema: 1,
		kind: 'vice.execution-audit',
		network: hyperliquidNetwork.network,
		account: account.toLowerCase(),
		entries: normalized
	};
}
