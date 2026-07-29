import type { ExecutionJournalEntry } from './commandJournal';

type SwarmDispatchJob = { pendingChildCommandId?: string; pendingChildIndex?: number; childOrderIds: string[]; slicesPlaced: number; slicesTotal: number; status: 'running' | 'paused' | 'completed' | 'cancelled' | 'failed' | 'emergencyStopped'; error?: string; updatedAt: number };

/** Recover one sequential Swarm child; remaining slices always require an explicit resume after restart. */
export function recoverPendingSwarmDispatch<T extends SwarmDispatchJob>(job: T, journal: ExecutionJournalEntry[]): T {
	const commandId = job.pendingChildCommandId;
	if (!commandId) return job;
	const entry = journal.find((candidate) => candidate.commandId === commandId && candidate.kind === 'place');
	if (entry && (entry.status === 'accepted' || entry.status === 'reconciled') && entry.venueOrderIds.length === 1) {
		const slicesPlaced = Math.max(job.slicesPlaced, (job.pendingChildIndex ?? job.slicesPlaced) + 1);
		return { ...job, pendingChildCommandId: undefined, pendingChildIndex: undefined, childOrderIds: [...new Set([...job.childOrderIds, entry.venueOrderIds[0]])], slicesPlaced, status: slicesPlaced === job.slicesTotal ? 'running' : 'paused', error: slicesPlaced === job.slicesTotal ? undefined : 'Swarm restart recovered a child; select the market and explicitly resume remaining slices', updatedAt: Date.now() };
	}
	if (entry?.status === 'rejected') return { ...job, pendingChildCommandId: undefined, pendingChildIndex: undefined, status: 'failed', error: entry.error ?? 'Swarm child placement was rejected before restart recovery', updatedAt: Date.now() };
	return { ...job, status: 'paused', error: entry ? 'Swarm child placement is unresolved; reconcile before resuming' : 'Swarm child placement record is missing; do not resend automatically', updatedAt: Date.now() };
}
