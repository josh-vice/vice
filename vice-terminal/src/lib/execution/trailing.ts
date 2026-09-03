import { get } from 'svelte/store';
import { localAlgoJobs, marketRegistry, openOrders, orderBook, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import { loadLocalAlgoJobs, transitionLocalAlgoJob, upsertLocalAlgoJob, type LocalTrailingJob } from './algoJobs';
import { nextTrailingExtreme, trailingTrigger } from './trailingMath';
import { cancelAlgoChildren } from './algoCancellation';
import { ocoExitSide } from './ocoState';
import { createTickGuard } from './tickGuard';
import { loadExecutionJournal } from './commandJournal';
import { recoverPendingChildDispatch } from './childDispatchRecovery';

type TrailingParams = { side: 'buy' | 'sell'; size: number; offset: number; deadmanMs?: number };
const timers = new Map<string, ReturnType<typeof setInterval>>();
const running = new Set<string>();
const lastStatusCheck = new Map<string, number>();
const tickGuard = createTickGuard();

function sync(): void { localAlgoJobs.set(loadLocalAlgoJobs()); }
function save(job: LocalTrailingJob): void { upsertLocalAlgoJob(job); sync(); }

function recoverPendingDispatch(job: LocalTrailingJob): LocalTrailingJob {
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
	lastStatusCheck.delete(jobId);
}

function mark(): number | null {
	const book = get(orderBook);
	const bid = book.bids[0]?.price;
	const ask = book.asks[0]?.price;
	return bid && ask ? (bid + ask) / 2 : null;
}

function triggerFor(job: LocalTrailingJob, market: MarketDescriptor, currentMark: number): { trigger: number; peakOrTrough: number } {
	const tick = 10 ** -market.priceDecimals;
	// Trailing math is expressed in terms of the actual exit order side:
	// sell exits trail upward highs, while buy exits trail downward lows.
	const exitSide = ocoExitSide(job.side);
	const nextExtreme = nextTrailingExtreme(exitSide, job.peakOrTrough, currentMark);
	return { trigger: trailingTrigger(exitSide, nextExtreme, job.offset, tick), peakOrTrough: nextExtreme };
}

async function tick(jobId: string): Promise<void> {
	let job = loadLocalAlgoJobs('trailing').find((candidate) => candidate.id === jobId);
	if (!job || job.status !== 'running') { stop(jobId); return; }
	const { localExecution } = await import('./localExecution');
	if (!running.has(jobId)) return;
	if (!localExecution.isReady()) {
		save(transitionLocalAlgoJob(job, 'paused', 'Secure trading is locked; resume after unlocking the local agent'));
		stop(jobId);
		return;
	}
	if (get(selectedMarket)?.marketKey !== job.marketKey) {
		save(transitionLocalAlgoJob(job, 'paused', 'Select the trailing-stop market so its live book is authoritative'));
		stop(jobId);
		return;
	}
	const market = get(marketRegistry).find((candidate) => candidate.marketKey === job!.marketKey);
	const currentMark = mark();
	if (!market || currentMark == null) return;
	const next = triggerFor(job, market, currentMark);
	let current = job.currentOrderId ? get(openOrders).find((order) => order.id === job!.currentOrderId) : undefined;
	if (job.currentOrderId && Date.now() - (lastStatusCheck.get(jobId) ?? 0) >= 1_500) {
		lastStatusCheck.set(jobId, Date.now());
		const outcome = await localExecution.getOrderOutcome(job.currentOrderId);
		if (!running.has(jobId)) return;
		if (outcome.status === 'filled' || outcome.filled >= job.size) {
			save(transitionLocalAlgoJob(job, 'completed'));
			if (job.deadmanMs) await localExecution.clearDeadman();
			stop(jobId);
			return;
		}
		if (outcome.status === 'closed') {
			const remainingSize = Math.max(0, job.size - outcome.filled);
			save(transitionLocalAlgoJob({ ...job, currentOrderId: undefined, size: remainingSize }, 'paused', outcome.filled > 0
				? 'Trailing child partially filled and closed; resume only after reviewing the residual position'
				: 'Trailing child closed without an authoritative fill'));
			stop(jobId);
			return;
		}
		// An authoritative open result can include a partial fill. Keep the
		// existing child instead of treating a stale local snapshot as a gap.
		if (outcome.status === 'unknown' && current) {
			save(transitionLocalAlgoJob(job, 'paused', 'Trailing child outcome is unknown; reconcile before changing protection'));
			stop(jobId);
			return;
		}
		if (!current && outcome.status === 'open') return;
	}
	if (job.currentOrderId && !current) {
		const currentOrderId = job.currentOrderId;
		await import('$lib/hl/orders').then(({ fetchOpenOrders }) => fetchOpenOrders());
		if (!running.has(jobId)) return;
		const refreshed = get(openOrders).find((order) => order.id === currentOrderId);
		if (!refreshed) {
			const outcome = await localExecution.getOrderOutcome(currentOrderId);
			if (!running.has(jobId)) return;
			if (outcome.status === 'filled' || (outcome.status === 'closed' && outcome.filled >= job.size)) {
				save(transitionLocalAlgoJob(job, 'completed'));
			} else if (outcome.status === 'closed') {
				const remainingSize = Math.max(0, job.size - outcome.filled);
				save(transitionLocalAlgoJob({ ...job, currentOrderId: undefined, size: remainingSize }, 'paused', outcome.filled > 0
					? 'Trailing child partially filled and disappeared; review the residual position before resuming'
					: 'Trailing child disappeared after a terminal cancellation'));
			} else {
				save(transitionLocalAlgoJob(job, 'paused', 'Trailing child disappeared without an authoritative fill'));
			}
			stop(jobId);
			return;
		}
	}
	const liveOrder = current ?? get(openOrders).find((order) => order.id === job!.currentOrderId);
	if (liveOrder && liveOrder.triggerPrice != null) {
		const improved = ocoExitSide(job.side) === 'sell' ? next.trigger > liveOrder.triggerPrice : next.trigger < liveOrder.triggerPrice;
		if (!improved) return;
		const cancelled = await localExecution.cancelOrder(market, liveOrder.id);
		if (!running.has(jobId)) return;
		if (!cancelled.accepted) {
			save(transitionLocalAlgoJob(job, 'failed', cancelled.error ?? 'Could not replace trailing child'));
			stop(jobId);
			return;
		}
		// A trigger can fill while its cancel is in flight. Reconcile the old
		// child before placing a replacement, or two reduce-only exits may remain
		// active for the same protected size.
		const cancelledOutcome = await localExecution.getOrderOutcome(liveOrder.id);
		if (!running.has(jobId)) return;
		if (cancelledOutcome.status === 'open' || cancelledOutcome.status === 'unknown') {
			save(transitionLocalAlgoJob(job, 'paused', cancelledOutcome.status === 'open'
				? 'Trailing child remains open after cancellation; reconcile before replacing it'
				: 'Trailing child cancellation outcome is unknown; reconcile before replacing it'));
			stop(jobId);
			return;
		}
		const cancelledFilled = cancelledOutcome.status === 'filled'
			? Math.max(job.size, cancelledOutcome.filled)
			: Math.max(cancelledOutcome.filled, liveOrder.filled ?? 0);
		const remainingProtection = Math.max(0, job.size - cancelledFilled);
		if (remainingProtection <= 0) {
			save(transitionLocalAlgoJob(job, 'completed'));
			if (job.deadmanMs) await localExecution.clearDeadman();
			stop(jobId);
			return;
		}
		job = { ...job, currentOrderId: undefined, size: remainingProtection, peakOrTrough: next.peakOrTrough, updatedAt: Date.now() };
		save(job);
	} else {
		job = { ...job, peakOrTrough: next.peakOrTrough, updatedAt: Date.now() };
		save(job);
	}
	if (job.currentOrderId) return;
	if (!running.has(jobId)) return;
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
		coin: market.apiCoin, isBuy: ocoExitSide(job.side) === 'buy', size: job.size, limitPrice: next.trigger,
		reduceOnly: true, orderType: 'stop', triggerPrice: next.trigger, triggerKind: 'stop',
		commandId: dispatching.pendingChildCommandId
	});
	if (!running.has(jobId)) {
		for (const orderId of ack.venueOrderIds) await localExecution.cancelOrder(market, orderId);
		return;
	}
	if (!ack.accepted || ack.venueOrderIds.length !== 1) {
		save({ ...transitionLocalAlgoJob(dispatching, ack.uncertain ? 'paused' : 'failed', ack.error ?? 'Trailing child placement failed'), pendingChildCommandId: ack.uncertain ? dispatching.pendingChildCommandId : undefined });
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
		const job = loadLocalAlgoJobs('trailing').find((candidate) => candidate.id === jobId);
		if (job?.status === 'running') save(transitionLocalAlgoJob(job, 'failed', error instanceof Error ? error.message : 'Trailing reconciliation failed'));
		stop(jobId);
	}), 250));
	void tickGuard.run(jobId, () => tick(jobId));
}

export async function startTrailing(market: MarketDescriptor, params: TrailingParams): Promise<{ ok: boolean; jobId?: string; error?: string }> {
	if (!get(walletAddress)) return { ok: false, error: 'Connect and unlock the local agent before starting trailing stop' };
	if (get(selectedMarket)?.marketKey !== market.marketKey) return { ok: false, error: 'Select the trailing-stop market so its live book is authoritative' };
	if (params.size <= 0 || params.offset <= 0) return { ok: false, error: 'Trailing stop requires positive size and offset' };
	const currentMark = mark();
	if (currentMark == null) return { ok: false, error: 'Live order book is unavailable' };
	const job: LocalTrailingJob = {
		id: crypto.randomUUID(), type: 'trailing', marketKey: market.marketKey, apiCoin: market.apiCoin, assetId: market.assetId,
		side: params.side, size: params.size, offset: params.offset, peakOrTrough: currentMark, dispatchRecoveryVersion: 1,
		childOrderIds: [], deadmanMs: params.deadmanMs, status: 'running', createdAt: Date.now(), updatedAt: Date.now()
	};
	running.add(job.id);
	save(job);
	try {
		await tick(job.id);
	} catch (error) {
		const current = loadLocalAlgoJobs('trailing').find((candidate) => candidate.id === job.id);
		if (current?.status === 'running') save(transitionLocalAlgoJob(current, 'paused', error instanceof Error ? error.message : 'Trailing stop could not start'));
		stop(job.id);
	}
	const started = loadLocalAlgoJobs('trailing').find((candidate) => candidate.id === job.id);
	if (!started || started.status !== 'running' || !started.currentOrderId) {
		stop(job.id);
		return { ok: false, error: started?.error ?? 'Trailing stop could not place its first child order' };
	}
	startTimer(job.id);
	return { ok: true, jobId: job.id };
}

export async function pauseTrailing(jobId: string): Promise<void> {
	const job = loadLocalAlgoJobs('trailing').find((candidate) => candidate.id === jobId);
	if (!job) return;
	stop(jobId);
	save(transitionLocalAlgoJob(job, 'paused'));
}

export async function resumeTrailing(jobId: string): Promise<void> {
	const job = loadLocalAlgoJobs('trailing').find((candidate) => candidate.id === jobId);
	if (!job || !['paused', 'failed'].includes(job.status)) return;
	if (job.restartRecoveryRequired) return;
	const recovered = recoverPendingDispatch(job);
	if (recovered.pendingChildCommandId) return;
	running.add(jobId);
	save({ ...recovered, status: 'running', error: undefined, updatedAt: Date.now() });
	startTimer(jobId);
}

export async function cancelTrailing(jobId: string, emergency = false): Promise<void> {
	const job = loadLocalAlgoJobs('trailing').find((candidate) => candidate.id === jobId);
	if (!job) return;
	stop(jobId);
	const cancellation = await cancelAlgoChildren([job.currentOrderId], (orderId) => import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(orderId, job.apiCoin)));
	if (!cancellation.ok) { save(transitionLocalAlgoJob(job, 'paused', cancellation.error ?? 'Trailing-stop cancellation requires reconciliation')); return; }
	if (!emergency && job.deadmanMs) {
		const { localExecution } = await import('./localExecution');
		const cleared = await localExecution.clearDeadman();
		if (!cleared.accepted) { save(transitionLocalAlgoJob(job, 'paused', cleared.error ?? 'Trailing-stop dead-man clear requires reconciliation')); return; }
	}
	save(transitionLocalAlgoJob(job, emergency ? 'emergencyStopped' : 'cancelled', emergency ? 'Emergency stop requested' : undefined));
}

export function resumePersistedTrailings(): void {
	sync();
	for (const job of loadLocalAlgoJobs('trailing').filter((candidate) => candidate.status === 'running')) {
		const recovered = recoverPendingDispatch(job);
		if (recovered.status === 'running') startTimer(recovered.id);
	}
}

export function stopAllTrailingTimers(): void { for (const id of timers.keys()) stop(id); }
