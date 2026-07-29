import type { ExecutionJournalEntry } from './commandJournal';

type ChildDispatchJob = {
	pendingChildCommandId?: string;
	currentOrderId?: string;
	childOrderIds: string[];
	status: 'running' | 'paused' | 'completed' | 'cancelled' | 'failed' | 'emergencyStopped';
	error?: string;
	updatedAt: number;
};

/** Recover one journaled child order; ambiguity must pause instead of placing a replacement. */
export function recoverPendingChildDispatch<T extends ChildDispatchJob>(job: T, journal: ExecutionJournalEntry[]): T {
	const commandId = job.pendingChildCommandId;
	if (!commandId) return job;
	const entry = journal.find((candidate) => candidate.commandId === commandId && candidate.kind === 'place');
	if (entry && (entry.status === 'accepted' || entry.status === 'reconciled') && entry.venueOrderIds.length === 1) {
		return {
			...job,
			pendingChildCommandId: undefined,
			currentOrderId: entry.venueOrderIds[0],
			childOrderIds: [...new Set([...job.childOrderIds, entry.venueOrderIds[0]])],
			status: 'running',
			error: undefined,
			updatedAt: Date.now()
		};
	}
	if (entry?.status === 'rejected') {
		return { ...job, pendingChildCommandId: undefined, status: 'failed', error: entry.error ?? 'Child placement was rejected before restart recovery', updatedAt: Date.now() };
	}
	return { ...job, status: 'paused', error: entry ? 'Child placement is unresolved; reconcile before resuming' : 'Child placement record is missing; do not resend automatically', updatedAt: Date.now() };
}
