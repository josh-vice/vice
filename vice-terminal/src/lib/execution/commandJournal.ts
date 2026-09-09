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

type StoredJournalRead = { entries: unknown[]; parseError?: string };

function readStoredJournal(account: string): StoredJournalRead {
	const store = storage();
	if (!store) return { entries: [] };
	try {
		const parsed = JSON.parse(store.getItem(storageKey(account)) ?? '[]');
		if (!Array.isArray(parsed)) return { entries: [], parseError: 'Stored execution journal must be an array' };
		return { entries: parsed };
	} catch {
		return { entries: [], parseError: 'Stored execution journal is invalid JSON' };
	}
}

export function loadExecutionJournal(account: string): ExecutionJournalEntry[] {
	return readStoredJournal(account).entries.filter((entry): entry is ExecutionJournalEntry => {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
		const candidate = entry as Partial<ExecutionJournalEntry>;
		return typeof candidate.commandId === 'string' && Array.isArray(candidate.cloids);
	});
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
	if (
		typeof entry.commandId !== 'string'
		|| entry.commandId.length === 0
		|| typeof entry.account !== 'string'
		|| typeof entry.network !== 'string'
		|| entry.account.toLowerCase() !== account.toLowerCase()
		|| entry.network !== hyperliquidNetwork.network
	) return null;
	if (!Number.isSafeInteger(entry.sequence) || entry.sequence < 0 || !Number.isFinite(entry.updatedAt) || entry.updatedAt < 0) return null;
	if (!['place', 'scale', 'modify', 'cancel', 'twap', 'scheduleCancel'].includes(entry.kind)) return null;
	if (!['pending', 'accepted', 'rejected', 'uncertain', 'reconciled'].includes(entry.status)) return null;
	if (!Array.isArray(entry.cloids) || !entry.cloids.every((value) => typeof value === 'string')) return null;
	if (!Array.isArray(entry.venueOrderIds) || !entry.venueOrderIds.every((value) => typeof value === 'string')) return null;
	if (entry.targetOrderId !== undefined && (typeof entry.targetOrderId !== 'string' || entry.targetOrderId.length === 0)) return null;
	if (entry.targetPrice !== undefined && (typeof entry.targetPrice !== 'string' || entry.targetPrice.length === 0)) return null;
	if (entry.targetField !== undefined && entry.targetField !== 'limitPx' && entry.targetField !== 'triggerPx') return null;
	if (entry.targetTwapId !== undefined && (!Number.isSafeInteger(entry.targetTwapId) || entry.targetTwapId < 0)) return null;
	const validCommandShape = entry.kind === 'cancel'
		? (entry.targetOrderId !== undefined || entry.targetTwapId !== undefined)
		: entry.kind === 'modify'
			? entry.cloids.length > 0 && entry.targetOrderId !== undefined && entry.targetPrice !== undefined && entry.targetField !== undefined
			: entry.kind === 'place' || entry.kind === 'scale'
				? entry.cloids.length > 0
				: true;
	if (!validCommandShape) return null;
	return {
		commandId: entry.commandId,
		sequence: entry.sequence,
		kind: entry.kind,
		cloids: entry.cloids,
		status: entry.status,
		venueOrderIds: entry.venueOrderIds,
		updatedAt: entry.updatedAt,
		...(entry.targetOrderId !== undefined ? { targetOrderId: entry.targetOrderId } : {}),
		...(entry.targetPrice !== undefined ? { targetPrice: entry.targetPrice } : {}),
		...(entry.targetField !== undefined ? { targetField: entry.targetField } : {}),
		...(entry.targetTwapId !== undefined ? { targetTwapId: entry.targetTwapId } : {})
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

export type ExecutionAuditReplay = {
	valid: boolean;
	finalState: 'clean' | 'unresolved' | 'invalid';
	entriesReplayed: number;
	accepted: number;
	rejected: number;
	unknown: number;
	reconciled: number;
	unresolvedCommandIds: string[];
	errors: string[];
};

/**
 * Replay an exported audit without touching storage or the venue.
 * Invalid records are reported instead of being silently discarded.
 */
export function replayExecutionAudit(value: unknown): ExecutionAuditReplay {
	const errors: string[] = [];
	const unresolvedCommandIds: string[] = [];
	const commandIds = new Set<string>();
	let accepted = 0;
	let rejected = 0;
	let unknown = 0;
	let reconciled = 0;
	let entriesReplayed = 0;
	let previousSequence: number | undefined;

	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return { valid: false, finalState: 'invalid', entriesReplayed: 0, accepted, rejected, unknown, reconciled, unresolvedCommandIds, errors: ['Audit must be an object'] };
	}
	const audit = value as Partial<ExecutionAuditExport> & { source?: unknown };
	const requireEntryIdentity = audit.source === 'local-journal';
	if (audit.schema !== 1) errors.push('Audit schema must be 1');
	if (audit.kind !== 'vice.execution-audit') errors.push('Audit kind is invalid');
	if (audit.network !== 'testnet' && audit.network !== 'mainnet') errors.push('Audit network is invalid');
	if (typeof audit.account !== 'string' || audit.account.length === 0) errors.push('Audit account is missing');
	if (!Array.isArray(audit.entries)) {
		errors.push('Audit entries must be an array');
		return { valid: false, finalState: 'invalid', entriesReplayed, accepted, rejected, unknown, reconciled, unresolvedCommandIds, errors };
	}

	for (const [index, entry] of audit.entries.entries()) {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
			errors.push(`entries[${index}] must be an object`);
			continue;
		}
		const candidate = entry as Partial<ExecutionAuditExport['entries'][number]> & { network?: unknown; account?: unknown };
		const validEntryIdentity = !requireEntryIdentity || (
			typeof candidate.network === 'string'
			&& typeof candidate.account === 'string'
			&& typeof audit.network === 'string'
			&& typeof audit.account === 'string'
			&& candidate.network === audit.network
			&& candidate.account.toLowerCase() === audit.account.toLowerCase()
		);
		const validCommandId = typeof candidate.commandId === 'string' && candidate.commandId.length > 0;
		const validSequence = Number.isSafeInteger(candidate.sequence) && (candidate.sequence as number) >= 0;
		const validKind = typeof candidate.kind === 'string' && ['place', 'scale', 'modify', 'cancel', 'twap', 'scheduleCancel'].includes(candidate.kind);
		const validStatus = typeof candidate.status === 'string' && ['pending', 'accepted', 'rejected', 'uncertain', 'reconciled'].includes(candidate.status);
		const validArrays = Array.isArray(candidate.cloids) && candidate.cloids.every((cloid) => typeof cloid === 'string')
			&& Array.isArray(candidate.venueOrderIds) && candidate.venueOrderIds.every((orderId) => typeof orderId === 'string');
		const validUpdatedAt = Number.isFinite(candidate.updatedAt) && (candidate.updatedAt as number) >= 0;
		const validOptionalFields = (candidate.targetOrderId === undefined || (typeof candidate.targetOrderId === 'string' && candidate.targetOrderId.length > 0))
			&& (candidate.targetPrice === undefined || (typeof candidate.targetPrice === 'string' && candidate.targetPrice.length > 0))
			&& (candidate.targetField === undefined || candidate.targetField === 'limitPx' || candidate.targetField === 'triggerPx')
			&& (candidate.targetTwapId === undefined || (Number.isSafeInteger(candidate.targetTwapId) && (candidate.targetTwapId as number) >= 0));
		const validCommandShape = candidate.kind === 'cancel'
			? (typeof candidate.targetOrderId === 'string' && candidate.targetOrderId.length > 0) || (Number.isSafeInteger(candidate.targetTwapId) && (candidate.targetTwapId as number) >= 0)
			: candidate.kind === 'modify'
				? Array.isArray(candidate.cloids) && candidate.cloids.length > 0 && typeof candidate.targetOrderId === 'string' && candidate.targetOrderId.length > 0 && typeof candidate.targetPrice === 'string' && candidate.targetPrice.length > 0 && (candidate.targetField === 'limitPx' || candidate.targetField === 'triggerPx')
				: candidate.kind === 'place' || candidate.kind === 'scale'
					? Array.isArray(candidate.cloids) && candidate.cloids.length > 0
					: true;
		if (!validEntryIdentity || !validCommandId || !validSequence || !validKind || !validStatus || !validArrays || !validUpdatedAt || !validOptionalFields || !validCommandShape) {
			errors.push(`entries[${index}] has invalid identity, command, sequence, kind, status, arrays, command details, or timestamp`);
			continue;
		}
		if (commandIds.has(candidate.commandId!)) errors.push(`entries[${index}] duplicates commandId ${candidate.commandId}`);
		commandIds.add(candidate.commandId!);
		if (previousSequence !== undefined && candidate.sequence! <= previousSequence) {
			errors.push(candidate.sequence! === previousSequence ? `entries[${index}] duplicates sequence ${candidate.sequence}` : `entries[${index}] is out of sequence`);
		}
		previousSequence = candidate.sequence!;
		entriesReplayed += 1;
		switch (candidate.status) {
			case 'accepted':
				accepted += 1;
				break;
			case 'rejected':
				rejected += 1;
				break;
			case 'uncertain':
				unknown += 1;
				unresolvedCommandIds.push(candidate.commandId!);
				break;
			case 'pending':
				unresolvedCommandIds.push(candidate.commandId!);
				break;
			case 'reconciled':
				reconciled += 1;
				break;
		}
	}

	const valid = errors.length === 0;
	return {
		valid,
		finalState: !valid ? 'invalid' : unresolvedCommandIds.length > 0 ? 'unresolved' : 'clean',
		entriesReplayed,
		accepted,
		rejected,
		unknown,
		reconciled,
		unresolvedCommandIds,
		errors
	};
}

/** Replay the raw local journal so malformed records are reported, not filtered out. */
export function replayStoredExecutionAudit(account: string): ExecutionAuditReplay {
	const stored = readStoredJournal(account);
	if (stored.parseError) {
		return { valid: false, finalState: 'invalid', entriesReplayed: 0, accepted: 0, rejected: 0, unknown: 0, reconciled: 0, unresolvedCommandIds: [], errors: [stored.parseError] };
	}
	const envelope = exportExecutionAudit(account, []);
	return replayExecutionAudit({ ...envelope, source: 'local-journal', entries: stored.entries });
}
