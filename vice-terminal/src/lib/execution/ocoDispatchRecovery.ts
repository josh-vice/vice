import type { ExecutionJournalEntry } from './commandJournal';

type OcoDispatchJob = {
	pendingTakeProfitCommandId?: string;
	pendingStopLossCommandId?: string;
	takeProfitOrderId?: string;
	stopLossOrderId?: string;
	childOrderIds: string[];
	status: 'running' | 'paused' | 'completed' | 'cancelled' | 'failed' | 'emergencyStopped';
	error?: string;
	updatedAt: number;
};

type Recovery = { orderId?: string; pending?: string; error?: string; rejected?: boolean };

function recover(commandId: string | undefined, journal: ExecutionJournalEntry[]): Recovery {
	if (!commandId) return {};
	const entry = journal.find((candidate) => candidate.commandId === commandId && candidate.kind === 'place');
	if (entry && (entry.status === 'accepted' || entry.status === 'reconciled') && entry.venueOrderIds.length === 1) return { orderId: entry.venueOrderIds[0] };
	if (entry?.status === 'rejected') return { rejected: true, error: entry.error ?? 'OCO child placement was rejected before restart recovery' };
	return { pending: commandId, error: entry ? 'OCO child placement is unresolved; reconcile before resuming' : 'OCO child placement record is missing; do not resend automatically' };
}

/** Recover each sequential OCO child without inventing, replacing, or cancelling a venue order. */
export function recoverPendingOcoDispatch<T extends OcoDispatchJob>(job: T, journal: ExecutionJournalEntry[]): T {
	if (!job.pendingTakeProfitCommandId && !job.pendingStopLossCommandId) return job;
	const tp = recover(job.pendingTakeProfitCommandId, journal);
	const sl = recover(job.pendingStopLossCommandId, journal);
	const takeProfitOrderId = tp.orderId ?? job.takeProfitOrderId;
	const stopLossOrderId = sl.orderId ?? job.stopLossOrderId;
	const childOrderIds = [...new Set([...job.childOrderIds, ...[takeProfitOrderId, stopLossOrderId].filter((id): id is string => Boolean(id))])];
	if (tp.rejected || sl.rejected) {
		return { ...job, pendingTakeProfitCommandId: undefined, pendingStopLossCommandId: undefined, takeProfitOrderId, stopLossOrderId, childOrderIds, status: 'failed', error: tp.error ?? sl.error, updatedAt: Date.now() };
	}
	if (tp.pending || sl.pending) {
		return { ...job, pendingTakeProfitCommandId: tp.pending, pendingStopLossCommandId: sl.pending, takeProfitOrderId, stopLossOrderId, childOrderIds, status: 'paused', error: tp.error ?? sl.error, updatedAt: Date.now() };
	}
	return {
		...job,
		pendingTakeProfitCommandId: undefined,
		pendingStopLossCommandId: undefined,
		takeProfitOrderId,
		stopLossOrderId,
		childOrderIds,
		status: takeProfitOrderId && stopLossOrderId ? 'running' : 'paused',
		error: takeProfitOrderId ? 'Stop-loss placement was interrupted; select the market and explicitly resume' : 'OCO placement was interrupted; select the market and explicitly resume',
		updatedAt: Date.now()
	};
}
