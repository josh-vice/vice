import { get } from 'svelte/store';
import { fills, localAlgoJobs, marketRegistry, openOrders, orderBook, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import {
	loadLocalAlgoJobs,
	setLocalAlgoOwner,
	transitionLocalAlgoJob,
	upsertLocalAlgoJob,
	type LocalChaseJob
} from './algoJobs';
import { cancelAlgoChildren } from './algoCancellation';
import { createTickGuard } from './tickGuard';
import { loadExecutionJournal } from './commandJournal';
import { recoverPendingChildDispatch } from './childDispatchRecovery';

type ChaseParams = {
	side: 'buy' | 'sell';
	size: number;
	offsetTicks: number;
	maxChases: number;
	deadmanMs?: number;
};

const timers = new Map<string, ReturnType<typeof setInterval>>();
const tickGuard = createTickGuard();
const running = new Set<string>();

function syncJobs(): void {
	localAlgoJobs.set(loadLocalAlgoJobs());
}

function save(job: LocalChaseJob): void {
	upsertLocalAlgoJob(job);
	syncJobs();
}

function recoverPendingDispatch(job: LocalChaseJob): LocalChaseJob {
	const owner = get(walletAddress);
	const recovered = recoverPendingChildDispatch(job, owner ? loadExecutionJournal(owner) : []);
	if (recovered !== job) save(recovered);
	return recovered;
}

function desiredPrice(market: MarketDescriptor, side: 'buy' | 'sell', offsetTicks: number): number | null {
	const book = get(orderBook);
	const level = side === 'buy' ? book.bids[0]?.price : book.asks[0]?.price;
	if (!level || !Number.isFinite(level)) return null;
	const tick = 10 ** -market.priceDecimals;
	return side === 'buy' ? level - tick * offsetTicks : level + tick * offsetTicks;
}

async function tick(jobId: string): Promise<void> {
	if (!running.has(jobId)) return;
	let job = loadLocalAlgoJobs('chase').find((candidate) => candidate.id === jobId);
	if (!job || job.status !== 'running') {
		stopTimer(jobId);
		return;
	}
	const { localExecution } = await import('./localExecution');
	if (!localExecution.isReady()) {
		save(transitionLocalAlgoJob(job, 'paused', 'Secure trading is locked; resume after unlocking the local agent'));
		stopTimer(jobId);
		return;
	}
	if (get(selectedMarket)?.marketKey !== job.marketKey) {
		save(transitionLocalAlgoJob(job, 'paused', 'Select the Chase market so its live order book is authoritative'));
		stopTimer(jobId);
		return;
	}
	const market = get(marketRegistry).find((candidate) => candidate.marketKey === job!.marketKey);
	if (!market) {
		save(transitionLocalAlgoJob(job, 'paused', 'Market identity is not available after reconnect'));
		stopTimer(jobId);
		return;
	}
	const price = desiredPrice(market, job.side, job.offsetTicks);
	if (!price) return;
	const tickSize = 10 ** -market.priceDecimals;

	if (job.currentOrderId) {
		let current = get(openOrders).find((order) => order.id === job!.currentOrderId);
		if (!current) {
			await import('$lib/hl/orders').then(({ fetchOpenOrders }) => fetchOpenOrders());
			current = get(openOrders).find((order) => order.id === job!.currentOrderId);
		}
		if (!current) {
			const filled = get(fills).filter((fill) => fill.orderId === job!.currentOrderId).reduce((sum, fill) => sum + fill.size, 0);
				const remaining = Math.max(0, job!.remainingSize - filled);
			if (remaining <= 0) {
				save(transitionLocalAlgoJob({ ...job, remainingSize: 0 }, 'completed'));
				if (job.deadmanMs) await localExecution.clearDeadman();
				stopTimer(jobId);
			} else {
				save({ ...job, currentOrderId: undefined, remainingSize: remaining, error: 'Child order disappeared from the authoritative snapshot; paused for review', status: 'paused', updatedAt: Date.now() });
				stopTimer(jobId);
			}
			return;
		}
		if (Math.abs((current.price ?? 0) - price) < tickSize) return;
		if (job.chases >= job.maxChases) {
			save(transitionLocalAlgoJob(job, 'paused', 'Maximum chase count reached'));
			stopTimer(jobId);
			return;
		}
		job = { ...job, remainingSize: Math.min(job.remainingSize, current.remaining), updatedAt: Date.now() };
		save(job);
		const cancelled = await import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(current!.id, job!.apiCoin));
		if (!cancelled.ok) {
			save(transitionLocalAlgoJob(job, 'failed', cancelled.error ?? 'Could not cancel previous child order'));
			stopTimer(jobId);
			return;
		}
		job = { ...job, currentOrderId: undefined, chases: job.chases + 1, updatedAt: Date.now() };
		save(job);
	}
	if (job.deadmanMs) {
		const deadman = await localExecution.armDeadman(job.deadmanMs);
		if (!deadman.accepted) {
			save(transitionLocalAlgoJob(job, 'failed', deadman.error ?? 'Dead-man switch could not be armed before child placement'));
			stopTimer(jobId);
			return;
		}
	}

	const dispatching = { ...job, pendingChildCommandId: crypto.randomUUID(), updatedAt: Date.now() };
	save(dispatching);
	const ack = await localExecution.placeOrder(market, {
		coin: market.apiCoin,
		isBuy: job.side === 'buy',
		size: job.remainingSize,
		limitPrice: price,
		reduceOnly: false,
		tif: 'Alo',
		orderType: 'limit',
		commandId: dispatching.pendingChildCommandId
	});
	if (!ack.accepted || ack.venueOrderIds.length !== 1) {
		save({ ...transitionLocalAlgoJob(dispatching, ack.uncertain ? 'paused' : 'failed', ack.error ?? 'Chase child placement failed'), pendingChildCommandId: ack.uncertain ? dispatching.pendingChildCommandId : undefined });
		stopTimer(jobId);
		return;
	}
	const next = { ...dispatching, pendingChildCommandId: undefined, currentOrderId: ack.venueOrderIds[0], childOrderIds: [...dispatching.childOrderIds, ack.venueOrderIds[0]], updatedAt: Date.now() };
	save(next);
	if (next.deadmanMs) {
		const deadman = await localExecution.armDeadman(next.deadmanMs);
		if (!deadman.accepted) {
			save(transitionLocalAlgoJob(next, 'failed', deadman.error ?? 'Dead-man switch could not be armed'));
			stopTimer(jobId);
		}
	}
}

function stopTimer(jobId: string): void {
	const timer = timers.get(jobId);
	if (timer) clearInterval(timer);
	timers.delete(jobId);
	running.delete(jobId);
}

function startTimer(jobId: string): void {
	if (timers.has(jobId)) return;
	running.add(jobId);
	timers.set(jobId, setInterval(() => void tickGuard.run(jobId, () => tick(jobId)).catch((error) => {
		const job = loadLocalAlgoJobs('chase').find((candidate) => candidate.id === jobId);
		if (job) save(transitionLocalAlgoJob(job, 'failed', error instanceof Error ? error.message : 'Chase tick failed'));
		stopTimer(jobId);
	}), 250));
	void tickGuard.run(jobId, () => tick(jobId));
}

export async function startChase(market: MarketDescriptor, params: ChaseParams): Promise<{ ok: boolean; jobId?: string; error?: string }> {
	if (!get(walletAddress)) return { ok: false, error: 'Connect and unlock the local agent before starting Chase' };
	if (params.size <= 0 || params.maxChases < 1 || params.maxChases > 1000) return { ok: false, error: 'Invalid Chase size or max chase count' };
	const id = crypto.randomUUID();
	const job: LocalChaseJob = {
		id, type: 'chase', marketKey: market.marketKey, apiCoin: market.apiCoin, assetId: market.assetId,
		side: params.side, totalSize: params.size, remainingSize: params.size,
		offsetTicks: Math.max(0, params.offsetTicks), maxChases: Math.round(params.maxChases), chases: 0,
		childOrderIds: [], deadmanMs: params.deadmanMs, status: 'running', createdAt: Date.now(), updatedAt: Date.now()
	};
	save(job);
	running.add(id);
	await tick(id);
	const started = loadLocalAlgoJobs('chase').find((candidate) => candidate.id === id);
	if (!started || started.status !== 'running' || !started.currentOrderId) {
		stopTimer(id);
		return { ok: false, error: started?.error ?? 'Chase could not place its first child order' };
	}
	timers.set(id, setInterval(() => void tickGuard.run(id, () => tick(id)).catch((error) => {
		const current = loadLocalAlgoJobs('chase').find((candidate) => candidate.id === id);
		if (current) save(transitionLocalAlgoJob(current, 'failed', error instanceof Error ? error.message : 'Chase tick failed'));
		stopTimer(id);
	}), 250));
	return { ok: true, jobId: id };
}

export async function pauseChase(jobId: string): Promise<void> {
	stopTimer(jobId);
	const job = loadLocalAlgoJobs('chase').find((candidate) => candidate.id === jobId);
	if (job) save(transitionLocalAlgoJob(job, 'paused'));
}

export async function resumeChase(jobId: string): Promise<void> {
	const job = loadLocalAlgoJobs('chase').find((candidate) => candidate.id === jobId);
	if (!job || !['paused', 'failed'].includes(job.status)) return;
	const recovered = recoverPendingDispatch(job);
	if (recovered.pendingChildCommandId) return;
	save({ ...recovered, status: 'running', error: undefined, updatedAt: Date.now() });
	startTimer(jobId);
}

export async function cancelChase(jobId: string, emergency = false): Promise<void> {
	const job = loadLocalAlgoJobs('chase').find((candidate) => candidate.id === jobId);
	if (!job) return;
	stopTimer(jobId);
	const cancellation = await cancelAlgoChildren([job.currentOrderId], (orderId) => import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(orderId, job.apiCoin)));
	if (!cancellation.ok) { save(transitionLocalAlgoJob(job, 'paused', cancellation.error ?? 'Chase cancellation requires reconciliation')); return; }
	if (!emergency && job.deadmanMs) {
		const { localExecution } = await import('./localExecution');
		const cleared = await localExecution.clearDeadman();
		if (!cleared.accepted) { save(transitionLocalAlgoJob(job, 'paused', cleared.error ?? 'Chase dead-man clear requires reconciliation')); return; }
	}
	const next = transitionLocalAlgoJob(job, emergency ? 'emergencyStopped' : 'cancelled', emergency ? 'Emergency stop requested' : undefined);
	save(next);
	if (emergency && job.deadmanMs) {
		const { localExecution } = await import('./localExecution');
		await localExecution.armDeadman(5_000);
	}
}

export function resumePersistedChases(): void {
	syncJobs();
	for (const job of loadLocalAlgoJobs('chase').filter((candidate) => candidate.status === 'running')) {
		const recovered = recoverPendingDispatch(job);
		if (recovered.status === 'running') startTimer(recovered.id);
	}
}

export function stopAllChaseTimers(): void {
	for (const id of timers.keys()) stopTimer(id);
}
