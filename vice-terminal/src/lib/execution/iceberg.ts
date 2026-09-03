import { get } from 'svelte/store';
import { fills, localAlgoJobs, marketRegistry, openOrders, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import { loadLocalAlgoJobs, transitionLocalAlgoJob, upsertLocalAlgoJob, type LocalIcebergJob } from './algoJobs';
import { cancelAlgoChildren } from './algoCancellation';
import { createTickGuard } from './tickGuard';
import { loadExecutionJournal } from './commandJournal';
import { recoverPendingChildDispatch } from './childDispatchRecovery';

type IcebergParams = { side: 'buy' | 'sell'; totalSize: number; displaySize: number; price: number; deadmanMs?: number };
const timers = new Map<string, ReturnType<typeof setInterval>>();
const running = new Set<string>();
const tickGuard = createTickGuard();

function sync(): void { localAlgoJobs.set(loadLocalAlgoJobs()); }
function save(job: LocalIcebergJob): void { upsertLocalAlgoJob(job); sync(); }

function recoverPendingDispatch(job: LocalIcebergJob): LocalIcebergJob {
	const owner = get(walletAddress);
	const recovered = recoverPendingChildDispatch(job, owner ? loadExecutionJournal(owner) : []);
	if (recovered !== job) save(recovered);
	return recovered;
}
function stop(jobId: string): void {
	const timer = timers.get(jobId);
	if (timer) clearInterval(timer);
	timers.delete(jobId);
	running.delete(jobId);
}

async function tick(jobId: string): Promise<void> {
	let job = loadLocalAlgoJobs('iceberg').find((candidate) => candidate.id === jobId);
	if (!job || job.status !== 'running') { stop(jobId); return; }
	const { localExecution } = await import('./localExecution');
	if (!running.has(jobId)) return;
	if (!localExecution.isReady()) {
		save(transitionLocalAlgoJob(job, 'paused', 'Secure trading is locked; resume after unlocking the local agent'));
		stop(jobId);
		return;
	}
	if (get(selectedMarket)?.marketKey !== job.marketKey) {
		save(transitionLocalAlgoJob(job, 'paused', 'Select the Iceberg market so its live account state is authoritative'));
		stop(jobId);
		return;
	}
	const market = get(marketRegistry).find((candidate) => candidate.marketKey === job!.marketKey);
	if (!market) return;

	if (job.currentOrderId) {
		let current = get(openOrders).find((order) => order.id === job!.currentOrderId);
		if (!current) {
			const currentOrderId = job.currentOrderId;
			await import('$lib/hl/orders').then(({ fetchOpenOrders }) => fetchOpenOrders());
			if (!running.has(jobId)) return;
			current = get(openOrders).find((order) => order.id === currentOrderId);
		}
		if (current) return;
		const currentOrderId = job.currentOrderId;
		const outcome = await localExecution.getOrderOutcome(currentOrderId);
		if (!running.has(jobId)) return;
		// Keep the current child when the authoritative venue still reports it
		// open; the local account projection may simply be behind.
		if (outcome.status === 'open') return;
		const observedSliceFilled = Math.max(get(fills)
			.filter((fill) => fill.orderId === currentOrderId)
			.reduce((sum, fill) => sum + fill.size, 0), outcome.filled);
		const sliceFilled = Math.min(job.remainingSize, observedSliceFilled);
		if (sliceFilled <= 0 || outcome.status === 'unknown') {
			save(transitionLocalAlgoJob(job, 'paused', 'Iceberg child disappeared without an authoritative fill'));
			stop(jobId);
			return;
		}
		const remainingSize = Math.max(0, job.remainingSize - sliceFilled);
		job = { ...job, currentOrderId: undefined, filledSize: job.filledSize + sliceFilled, remainingSize, updatedAt: Date.now() };
		save(job);
		if (remainingSize <= 0) {
			save(transitionLocalAlgoJob(job, 'completed'));
			if (job.deadmanMs) await localExecution.clearDeadman();
			stop(jobId);
			return;
		}
	}

	const sliceSize = Math.min(job.displaySize, job.remainingSize);
	if (job.deadmanMs) {
		const deadman = await localExecution.armDeadman(job.deadmanMs);
		if (!running.has(jobId)) {
			if (deadman.accepted) await localExecution.clearDeadman();
			return;
		}
		if (!deadman.accepted) {
			save(transitionLocalAlgoJob(job, 'failed', deadman.error ?? 'Dead-man switch could not be armed before child placement'));
			stop(jobId);
			return;
		}
	}
	if (!running.has(jobId)) return;
	const dispatching = { ...job, pendingChildCommandId: crypto.randomUUID(), updatedAt: Date.now() };
	save(dispatching);
	const ack = await localExecution.placeOrder(market, {
		coin: market.apiCoin, isBuy: job.side === 'buy', size: sliceSize, limitPrice: job.price,
		reduceOnly: false, tif: 'Gtc', orderType: 'limit', commandId: dispatching.pendingChildCommandId
	});
	if (!running.has(jobId)) {
		for (const orderId of ack.venueOrderIds) await localExecution.cancelOrder(market, orderId);
		return;
	}
	if (!ack.accepted || ack.venueOrderIds.length !== 1) {
		save({ ...transitionLocalAlgoJob(dispatching, ack.uncertain ? 'paused' : 'failed', ack.error ?? 'Iceberg child placement failed'), pendingChildCommandId: ack.uncertain ? dispatching.pendingChildCommandId : undefined });
		stop(jobId);
		return;
	}
	const placed = { ...dispatching, pendingChildCommandId: undefined, currentOrderId: ack.venueOrderIds[0], childOrderIds: [...dispatching.childOrderIds, ack.venueOrderIds[0]], updatedAt: Date.now() };
	save(placed);
	if (placed.deadmanMs) {
		const deadman = await localExecution.armDeadman(placed.deadmanMs);
		if (!running.has(jobId)) {
			if (deadman.accepted) await localExecution.clearDeadman();
			return;
		}
		if (!deadman.accepted) {
			save(transitionLocalAlgoJob(placed, 'failed', deadman.error ?? 'Dead-man switch could not be armed'));
			stop(jobId);
		}
	}
}

function startTimer(jobId: string): void {
	if (timers.has(jobId)) return;
	running.add(jobId);
	timers.set(jobId, setInterval(() => void tickGuard.run(jobId, () => tick(jobId)).catch((error) => {
		const job = loadLocalAlgoJobs('iceberg').find((candidate) => candidate.id === jobId);
		if (job?.status === 'running') save(transitionLocalAlgoJob(job, 'failed', error instanceof Error ? error.message : 'Iceberg reconciliation failed'));
		stop(jobId);
	}), 500));
	void tickGuard.run(jobId, () => tick(jobId));
}

export async function startIceberg(market: MarketDescriptor, params: IcebergParams): Promise<{ ok: boolean; jobId?: string; error?: string }> {
	if (!get(walletAddress)) return { ok: false, error: 'Connect and unlock the local agent before starting Iceberg' };
	if (get(selectedMarket)?.marketKey !== market.marketKey) return { ok: false, error: 'Select the Iceberg market so its live account state is authoritative' };
	if (params.totalSize <= 0 || params.displaySize <= 0 || params.price <= 0) return { ok: false, error: 'Iceberg requires positive total size, display size, and price' };
	const job: LocalIcebergJob = {
		id: crypto.randomUUID(), type: 'iceberg', marketKey: market.marketKey, apiCoin: market.apiCoin, assetId: market.assetId,
		side: params.side, totalSize: params.totalSize, remainingSize: params.totalSize, displaySize: Math.min(params.displaySize, params.totalSize),
		price: params.price, dispatchRecoveryVersion: 1, childOrderIds: [], filledSize: 0, deadmanMs: params.deadmanMs,
		status: 'running', createdAt: Date.now(), updatedAt: Date.now()
	};
	running.add(job.id);
	save(job);
	try {
		await tick(job.id);
	} catch (error) {
		const current = loadLocalAlgoJobs('iceberg').find((candidate) => candidate.id === job.id);
		if (current?.status === 'running') save(transitionLocalAlgoJob(current, 'paused', error instanceof Error ? error.message : 'Iceberg could not start'));
		stop(job.id);
	}
	const started = loadLocalAlgoJobs('iceberg').find((candidate) => candidate.id === job.id);
	if (!started || started.status !== 'running' || !started.currentOrderId) {
		stop(job.id);
		return { ok: false, error: started?.error ?? 'Iceberg could not place its first child order' };
	}
	startTimer(job.id);
	return { ok: true, jobId: job.id };
}

export async function pauseIceberg(jobId: string): Promise<void> {
	const job = loadLocalAlgoJobs('iceberg').find((candidate) => candidate.id === jobId);
	if (!job) return;
	stop(jobId);
	save(transitionLocalAlgoJob(job, 'paused'));
}

export async function resumeIceberg(jobId: string): Promise<void> {
	const job = loadLocalAlgoJobs('iceberg').find((candidate) => candidate.id === jobId);
	if (!job || !['paused', 'failed'].includes(job.status)) return;
	if (job.restartRecoveryRequired) return;
	const recovered = recoverPendingDispatch(job);
	if (recovered.pendingChildCommandId) return;
	running.add(jobId);
	save({ ...recovered, status: 'running', error: undefined, updatedAt: Date.now() });
	startTimer(jobId);
}

export async function cancelIceberg(jobId: string, emergency = false): Promise<void> {
	const job = loadLocalAlgoJobs('iceberg').find((candidate) => candidate.id === jobId);
	if (!job) return;
	stop(jobId);
	const cancellation = await cancelAlgoChildren([job.currentOrderId], (orderId) => import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(orderId, job.apiCoin)));
	if (!cancellation.ok) { save(transitionLocalAlgoJob(job, 'paused', cancellation.error ?? 'Iceberg cancellation requires reconciliation')); return; }
	if (!emergency && job.deadmanMs) {
		const cleared = await import('./localExecution').then(({ localExecution }) => localExecution.clearDeadman());
		if (!cleared.accepted) { save(transitionLocalAlgoJob(job, 'paused', cleared.error ?? 'Iceberg dead-man clear requires reconciliation')); return; }
	}
	save(transitionLocalAlgoJob(job, emergency ? 'emergencyStopped' : 'cancelled', emergency ? 'Emergency stop requested' : undefined));
}

export function resumePersistedIcebergs(): void {
	sync();
	for (const job of loadLocalAlgoJobs('iceberg').filter((candidate) => candidate.status === 'running')) {
		const recovered = recoverPendingDispatch(job);
		if (recovered.status === 'running') startTimer(recovered.id);
	}
}

export function stopAllIcebergTimers(): void { for (const id of timers.keys()) stop(id); }
