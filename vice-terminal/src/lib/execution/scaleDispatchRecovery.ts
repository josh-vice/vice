import type { ExecutionJournalEntry } from './commandJournal';

type ScaleDispatchJob = {
	pendingScaleCommandId?: string;
	childOrderIds: string[];
	status: 'running' | 'paused' | 'completed' | 'cancelled' | 'failed' | 'emergencyStopped';
	error?: string;
	updatedAt: number;
};

/**
 * A Scale batch can be accepted after the browser loses the acknowledgement.
 * Keep its pre-dispatch command ID with the job and recover exact children
 * from the durable command journal. A missing, pending, or uncertain journal
 * row must pause rather than risk a duplicate batch.
 */
export function recoverPendingScaleDispatch<T extends ScaleDispatchJob>(job: T, journal: ExecutionJournalEntry[]): T {
	const commandId = job.pendingScaleCommandId;
	if (!commandId) return job;
	const entry = journal.find((candidate) => candidate.commandId === commandId && candidate.kind === 'scale');
	if (entry && (entry.status === 'accepted' || entry.status === 'reconciled') && entry.venueOrderIds.length > 0) {
		return {
			...job,
			pendingScaleCommandId: undefined,
			childOrderIds: [...new Set([...job.childOrderIds, ...entry.venueOrderIds])],
			status: 'running',
			error: undefined,
			updatedAt: Date.now()
		};
	}
	if (entry?.status === 'rejected') {
		return {
			...job,
			pendingScaleCommandId: undefined,
			status: 'failed',
			error: entry.error ?? 'Scale dispatch was rejected before restart recovery',
			updatedAt: Date.now()
		};
	}
	return {
		...job,
		status: 'paused',
		error: entry ? 'Scale dispatch is unresolved; reconcile before resuming' : 'Scale dispatch record is missing; do not resend automatically',
		updatedAt: Date.now()
	};
}
