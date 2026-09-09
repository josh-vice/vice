import { get } from 'svelte/store';
import { fills, localAlgoJobs, marketRegistry, openOrders, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import { loadLocalAlgoJobs, transitionLocalAlgoJob, upsertLocalAlgoJob, type LocalOcoJob } from './algoJobs';
import { ocoExitSide, reconcileOcoChildren } from './ocoState';
import { cancelAlgoChildren } from './algoCancellation';
import { createTickGuard } from './tickGuard';
import { loadExecutionJournal } from './commandJournal';
import { recoverPendingOcoDispatch } from './ocoDispatchRecovery';
import { localExecution } from './localExecution';

type OcoParams = { side: 'buy' | 'sell'; size: number; takeProfit: number; stopLoss: number; deadmanMs?: number };
const timers = new Map<string, ReturnType<typeof setInterval>>();
const running = new Set<string>();
const lastStatusCheck = new Map<string, number>();
const tickGuard = createTickGuard();

function sync(): void { localAlgoJobs.set(loadLocalAlgoJobs()); }
function save(job: LocalOcoJob): void { upsertLocalAlgoJob(job); sync(); }

function recoverPendingDispatch(job: LocalOcoJob): LocalOcoJob {
	const owner = get(walletAddress);
	const recovered = recoverPendingOcoDispatch(job, owner ? loadExecutionJournal(owner) : []);
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

async function cancelChild(id: string | undefined, market: string): Promise<boolean> {
	if (!id) return true;
	return (await import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(id, market))).ok;
}

async function tick(jobId: string): Promise<void> {
	if (!running.has(jobId)) return;
	const job = loadLocalAlgoJobs('oco').find((candidate) => candidate.id === jobId);
	if (!job || job.status !== 'running') { stop(jobId); return; }
	const now = Date.now();
	if (now - (lastStatusCheck.get(jobId) ?? 0) < 1_500) return;
	lastStatusCheck.set(jobId, now);
	let tp = job.takeProfitOrderId ? get(openOrders).find((order) => order.id === job.takeProfitOrderId) : undefined;
	let sl = job.stopLossOrderId ? get(openOrders).find((order) => order.id === job.stopLossOrderId) : undefined;
	await import('$lib/hl/orders').then(({ fetchOpenOrders }) => fetchOpenOrders());
	if (!running.has(jobId)) return;
	tp = job.takeProfitOrderId ? get(openOrders).find((order) => order.id === job.takeProfitOrderId) : undefined;
	sl = job.stopLossOrderId ? get(openOrders).find((order) => order.id === job.stopLossOrderId) : undefined;

	const tpOutcome = job.takeProfitOrderId ? await localExecution.getOrderOutcome(job.takeProfitOrderId) : undefined;
	const slOutcome = job.stopLossOrderId ? await localExecution.getOrderOutcome(job.stopLossOrderId) : undefined;
	if (!running.has(jobId)) return;
	const filledSize = (orderId: string | undefined, openOrder?: { filled?: number }) => orderId
		? Math.max(
			get(fills).filter((fill) => fill.orderId === orderId).reduce((sum, fill) => sum + fill.size, 0),
			openOrder?.filled ?? 0
		)
		: 0;
	// A single fill event may be only a partial execution. Only a terminal
	// venue status or a full requested size can win the OCO race; otherwise an
	// open child remains active and the sibling must not be canceled early.
	const tpObservedFilled = Math.min(job.size, Math.max(tpOutcome?.filled ?? 0, filledSize(job.takeProfitOrderId, tp)));
	const slObservedFilled = Math.min(job.size, Math.max(slOutcome?.filled ?? 0, filledSize(job.stopLossOrderId, sl)));
	const tpFilled = Boolean(job.takeProfitOrderId && (tpOutcome?.status === 'filled' || tpObservedFilled >= job.size));
	const slFilled = Boolean(job.stopLossOrderId && (slOutcome?.status === 'filled' || slObservedFilled >= job.size));
	const decision = reconcileOcoChildren({
		takeProfitOpen: tpOutcome
			? tpOutcome.status === 'open' || (tpOutcome.status === 'unknown' && Boolean(tp))
			: Boolean(tp),
		stopLossOpen: slOutcome
			? slOutcome.status === 'open' || (slOutcome.status === 'unknown' && Boolean(sl))
			: Boolean(sl),
		takeProfitFilled: tpFilled,
		stopLossFilled: slFilled,
		takeProfitPartiallyFilled: tpObservedFilled > 0 && !tpFilled,
		stopLossPartiallyFilled: slObservedFilled > 0 && !slFilled,
		// If a child is absent from the snapshot and its direct status query
		// failed, sibling cancellation is not safe. A present open row is enough
		// to keep observing that child without inventing a terminal state.
		takeProfitUnknown: Boolean(job.takeProfitOrderId && !tp && tpOutcome?.status === 'unknown'),
		stopLossUnknown: Boolean(job.stopLossOrderId && !sl && slOutcome?.status === 'unknown')
	});
	if (decision.state === 'complete') {
		const siblingId = decision.cancel === 'stopLoss' ? job.stopLossOrderId : job.takeProfitOrderId;
		const siblingCancelled = await cancelChild(siblingId, job.apiCoin);
		if (!running.has(jobId)) return;
		if (!siblingCancelled) {
			save(transitionLocalAlgoJob(job, 'failed', 'OCO sibling cancellation could not be reconciled'));
		} else if (siblingId) {
			// Even an accepted cancel can race a sibling fill. Verify the sibling's
			// terminal projection before declaring the OCO complete; otherwise both
			// exits could have traded while the pre-cancel snapshot was stale.
			const siblingOutcome = await localExecution.getOrderOutcome(siblingId);
			if (!running.has(jobId)) return;
			if (siblingOutcome.status === 'unknown' || siblingOutcome.status === 'open' || siblingOutcome.status === 'filled' || siblingOutcome.filled > 0) {
				save(transitionLocalAlgoJob(job, 'paused', siblingOutcome.status === 'filled' || siblingOutcome.filled > 0
					? 'Both OCO children traded; reconcile the resulting position'
					: 'OCO sibling cancellation is not terminal; reconcile before completing'));
				stop(jobId);
				return;
			}
			save(transitionLocalAlgoJob(job, 'completed'));
			if (job.deadmanMs) await import('./localExecution').then(({ localExecution }) => localExecution.clearDeadman());
		} else {
			save(transitionLocalAlgoJob(job, 'completed'));
			if (job.deadmanMs) await import('./localExecution').then(({ localExecution }) => localExecution.clearDeadman());
		}
		stop(jobId);
		return;
	}

	if (decision.state === 'paused') {
		save(transitionLocalAlgoJob(job, 'paused', decision.reason));
		stop(jobId);
	}
}

function startTimer(jobId: string): void {
	if (timers.has(jobId)) return;
	running.add(jobId);
	timers.set(jobId, setInterval(() => void tickGuard.run(jobId, () => tick(jobId)).catch((error) => {
		const job = loadLocalAlgoJobs('oco').find((candidate) => candidate.id === jobId);
		if (job?.status === 'running') save(transitionLocalAlgoJob(job, 'failed', error instanceof Error ? error.message : 'OCO reconciliation failed'));
		stop(jobId);
	}), 500));
	void tickGuard.run(jobId, () => tick(jobId));
}

async function continuePlacement(job: LocalOcoJob, market: MarketDescriptor): Promise<LocalOcoJob> {
	if (!running.has(job.id)) return loadLocalAlgoJobs('oco').find((candidate) => candidate.id === job.id) ?? job;
	const { localExecution } = await import('./localExecution');
	if (!localExecution.isReady()) return saveAndReturn(transitionLocalAlgoJob(job, 'paused', 'Secure trading is locked; resume after unlocking the local agent'));
	if (job.deadmanMs) {
		const deadman = await localExecution.armDeadman(job.deadmanMs);
		if (!running.has(job.id)) {
			if (deadman.accepted) await localExecution.clearDeadman();
			return loadLocalAlgoJobs('oco').find((candidate) => candidate.id === job.id) ?? job;
		}
		if (!deadman.accepted) return saveAndReturn(transitionLocalAlgoJob(job, 'failed', deadman.error ?? 'Dead-man switch could not be armed before OCO placement'));
	}
	const exitSide = ocoExitSide(job.side);
	if (!running.has(job.id)) return loadLocalAlgoJobs('oco').find((candidate) => candidate.id === job.id) ?? job;
	if (!job.takeProfitOrderId) {
		const dispatching = { ...job, pendingTakeProfitCommandId: crypto.randomUUID(), updatedAt: Date.now() };
		save(dispatching);
		const ack = await localExecution.placeOrder(market, {
			coin: market.apiCoin, isBuy: exitSide === 'buy', size: job.size, limitPrice: job.takeProfit,
			reduceOnly: true, orderType: 'stop', triggerPrice: job.takeProfit, triggerKind: 'takeProfit',
			commandId: dispatching.pendingTakeProfitCommandId
		});
		if (!running.has(job.id)) {
			for (const orderId of ack.venueOrderIds) await localExecution.cancelOrder(market, orderId);
			return loadLocalAlgoJobs('oco').find((candidate) => candidate.id === job.id) ?? dispatching;
		}
		if (!ack.accepted || ack.venueOrderIds.length !== 1) return saveAndReturn({ ...transitionLocalAlgoJob(dispatching, ack.uncertain ? 'paused' : 'failed', ack.error ?? 'OCO take-profit child failed'), pendingTakeProfitCommandId: ack.uncertain ? dispatching.pendingTakeProfitCommandId : undefined });
		job = { ...dispatching, pendingTakeProfitCommandId: undefined, takeProfitOrderId: ack.venueOrderIds[0], childOrderIds: [...dispatching.childOrderIds, ack.venueOrderIds[0]], updatedAt: Date.now() };
		save(job);
	}
	if (!running.has(job.id)) return loadLocalAlgoJobs('oco').find((candidate) => candidate.id === job.id) ?? job;
	if (job.stopLossOrderId) return job;
	const dispatching = { ...job, pendingStopLossCommandId: crypto.randomUUID(), updatedAt: Date.now() };
	save(dispatching);
	const ack = await localExecution.placeOrder(market, {
		coin: market.apiCoin, isBuy: exitSide === 'buy', size: job.size, limitPrice: job.stopLoss,
		reduceOnly: true, orderType: 'stop', triggerPrice: job.stopLoss, triggerKind: 'stop',
		commandId: dispatching.pendingStopLossCommandId
	});
	if (!running.has(job.id)) {
		for (const orderId of ack.venueOrderIds) await localExecution.cancelOrder(market, orderId);
		return loadLocalAlgoJobs('oco').find((candidate) => candidate.id === job.id) ?? dispatching;
	}
	if (!ack.accepted || ack.venueOrderIds.length !== 1) {
		if (ack.uncertain) return saveAndReturn({ ...transitionLocalAlgoJob(dispatching, 'paused', ack.error ?? 'OCO stop-loss child is unresolved'), pendingStopLossCommandId: dispatching.pendingStopLossCommandId });
		const cancelled = await cancelChild(dispatching.takeProfitOrderId, market.apiCoin);
		if (!running.has(job.id)) return loadLocalAlgoJobs('oco').find((candidate) => candidate.id === job.id) ?? dispatching;
		if (!cancelled) return saveAndReturn(transitionLocalAlgoJob({ ...dispatching, pendingStopLossCommandId: undefined }, 'paused', 'OCO stop-loss failed and take-profit cancellation requires reconciliation'));
		if (dispatching.takeProfitOrderId) {
			// The take-profit can fill between the stop-loss rejection and the
			// sibling cancel. A successful cancel response alone does not prove
			// that the TP is terminal, so do not clear protection state until its
			// authoritative post-cancel status is known.
			const takeProfitOutcome = await localExecution.getOrderOutcome(dispatching.takeProfitOrderId);
			if (!running.has(job.id)) return loadLocalAlgoJobs('oco').find((candidate) => candidate.id === job.id) ?? dispatching;
			if (takeProfitOutcome.status === 'unknown' || takeProfitOutcome.status === 'open' || takeProfitOutcome.status === 'filled' || takeProfitOutcome.filled > 0) {
				return saveAndReturn(transitionLocalAlgoJob({ ...dispatching, pendingStopLossCommandId: undefined }, 'paused', takeProfitOutcome.status === 'filled' || takeProfitOutcome.filled > 0
					? 'OCO stop-loss failed while take-profit traded; reconcile the resulting position'
					: 'OCO stop-loss failed and take-profit cancellation is not terminal'));
			}
		}
		if (job.deadmanMs) {
			const cleared = await localExecution.clearDeadman();
			if (!cleared.accepted) return saveAndReturn(transitionLocalAlgoJob({ ...dispatching, pendingStopLossCommandId: undefined }, 'paused', cleared.error ?? 'OCO dead-man clear requires reconciliation'));
		}
		return saveAndReturn(transitionLocalAlgoJob({ ...dispatching, pendingStopLossCommandId: undefined }, 'failed', ack.error ?? 'OCO stop-loss child failed'));
	}
	const complete = { ...dispatching, pendingStopLossCommandId: undefined, stopLossOrderId: ack.venueOrderIds[0], childOrderIds: [...dispatching.childOrderIds, ack.venueOrderIds[0]], updatedAt: Date.now() };
	save(complete);
	if (complete.deadmanMs) {
		const deadman = await localExecution.armDeadman(complete.deadmanMs);
		if (!running.has(job.id)) {
			if (deadman.accepted) await localExecution.clearDeadman();
			return loadLocalAlgoJobs('oco').find((candidate) => candidate.id === job.id) ?? complete;
		}
		if (!deadman.accepted) return saveAndReturn(transitionLocalAlgoJob(complete, 'failed', deadman.error ?? 'Dead-man switch could not be armed after OCO placement'));
	}
	return complete;
}

function saveAndReturn(job: LocalOcoJob): LocalOcoJob { save(job); return job; }

export async function startOco(market: MarketDescriptor, params: OcoParams): Promise<{ ok: boolean; jobId?: string; error?: string }> {
	if (!get(walletAddress)) return { ok: false, error: 'Connect and unlock the local agent before starting OCO' };
	if (get(selectedMarket)?.marketKey !== market.marketKey) return { ok: false, error: 'Select the OCO market so its live account state is authoritative' };
	if (params.size <= 0 || params.takeProfit <= 0 || params.stopLoss <= 0) return { ok: false, error: 'OCO requires positive size, take-profit, and stop-loss prices' };
	const job: LocalOcoJob = {
		id: crypto.randomUUID(), type: 'oco', marketKey: market.marketKey, apiCoin: market.apiCoin, assetId: market.assetId,
		side: params.side, size: params.size, takeProfit: params.takeProfit, stopLoss: params.stopLoss,
		dispatchRecoveryVersion: 1, childOrderIds: [], deadmanMs: params.deadmanMs, status: 'running', createdAt: Date.now(), updatedAt: Date.now()
	};
	running.add(job.id);
	save(job);
	let complete: LocalOcoJob;
	try {
		complete = await continuePlacement(job, market);
	} catch (error) {
		const current = loadLocalAlgoJobs('oco').find((candidate) => candidate.id === job.id);
		if (current?.status === 'running') save(transitionLocalAlgoJob(current, 'paused', error instanceof Error ? error.message : 'OCO could not start'));
		stop(job.id);
		return { ok: false, error: error instanceof Error ? error.message : 'OCO could not start' };
	}
	if (complete.status !== 'running' || !complete.takeProfitOrderId || !complete.stopLossOrderId) { stop(job.id); return { ok: false, error: complete.error ?? 'OCO could not place both child orders' };}
	startTimer(complete.id);
	return { ok: true, jobId: complete.id };
}

export async function cancelOco(jobId: string, emergency = false): Promise<void> {
	const job = loadLocalAlgoJobs('oco').find((candidate) => candidate.id === jobId);
	if (!job) return;
	stop(jobId);
	const cancellation = await cancelAlgoChildren([job.takeProfitOrderId, job.stopLossOrderId], (orderId) =>
		import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(orderId, job.apiCoin))
	);
	if (!cancellation.ok) {
		save(transitionLocalAlgoJob(job, 'paused', cancellation.error ?? 'OCO cancellation requires reconciliation'));
		return;
	}
	if (!emergency && job.deadmanMs) {
		const cleared = await import('./localExecution').then(({ localExecution }) => localExecution.clearDeadman());
		if (!cleared.accepted) {
			save(transitionLocalAlgoJob(job, 'paused', cleared.error ?? 'OCO dead-man clear requires reconciliation'));
			return;
		}
	}
	save(transitionLocalAlgoJob(job, emergency ? 'emergencyStopped' : 'cancelled', emergency ? 'Emergency stop requested' : undefined));
	if (emergency && job.deadmanMs) await import('./localExecution').then(({ localExecution }) => localExecution.armDeadman(5_000));
}

export async function pauseOco(jobId: string): Promise<void> {
	const job = loadLocalAlgoJobs('oco').find((candidate) => candidate.id === jobId);
	if (!job) return;
	stop(jobId);
	save(transitionLocalAlgoJob(job, 'paused'));
}

export async function resumeOco(jobId: string): Promise<void> {
	const job = loadLocalAlgoJobs('oco').find((candidate) => candidate.id === jobId);
	if (!job || !['paused', 'failed'].includes(job.status)) return;
	if (job.restartRecoveryRequired) return;
	const recovered = recoverPendingDispatch(job);
	if (recovered.pendingTakeProfitCommandId || recovered.pendingStopLossCommandId) return;
	if (get(selectedMarket)?.marketKey !== recovered.marketKey) {
		save(transitionLocalAlgoJob(recovered, 'paused', 'Select the OCO market before explicitly resuming interrupted placement'));
		return;
	}
	const market = get(marketRegistry).find((candidate) => candidate.marketKey === recovered.marketKey);
	if (!market) return;
	running.add(jobId);
	let complete: LocalOcoJob;
	try {
		complete = await continuePlacement({ ...recovered, status: 'running', error: undefined, updatedAt: Date.now() }, market);
	} catch (error) {
		const current = loadLocalAlgoJobs('oco').find((candidate) => candidate.id === jobId);
		if (current?.status === 'running') save(transitionLocalAlgoJob(current, 'paused', error instanceof Error ? error.message : 'OCO resume failed'));
		stop(jobId);
		return;
	}
	if (complete.status === 'running' && complete.takeProfitOrderId && complete.stopLossOrderId) startTimer(jobId); else stop(jobId);
}

export function resumePersistedOcos(): void {
	sync();
	for (const job of loadLocalAlgoJobs('oco').filter((candidate) => candidate.status === 'running')) {
		const recovered = recoverPendingDispatch(job);
		if (recovered.status === 'running' && recovered.takeProfitOrderId && recovered.stopLossOrderId) startTimer(recovered.id);
	}
}

export function stopAllOcoTimers(): void { for (const id of timers.keys()) stop(id); }
