import { get } from 'svelte/store';
import { fills, localAlgoJobs, marketRegistry, openOrders, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import { loadLocalAlgoJobs, transitionLocalAlgoJob, upsertLocalAlgoJob, type LocalOcoJob } from './algoJobs';
import { ocoExitSide, reconcileOcoChildren } from './ocoState';
import { cancelAlgoChildren } from './algoCancellation';
import { createTickGuard } from './tickGuard';
import { loadExecutionJournal } from './commandJournal';
import { recoverPendingOcoDispatch } from './ocoDispatchRecovery';

type OcoParams = { side: 'buy' | 'sell'; size: number; takeProfit: number; stopLoss: number; deadmanMs?: number };
const timers = new Map<string, ReturnType<typeof setInterval>>();
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
}

async function cancelChild(id: string | undefined, market: string): Promise<boolean> {
	if (!id) return true;
	return (await import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(id, market))).ok;
}

async function tick(jobId: string): Promise<void> {
	const job = loadLocalAlgoJobs('oco').find((candidate) => candidate.id === jobId);
	if (!job || job.status !== 'running') { stop(jobId); return; }
	let tp = job.takeProfitOrderId ? get(openOrders).find((order) => order.id === job.takeProfitOrderId) : undefined;
	let sl = job.stopLossOrderId ? get(openOrders).find((order) => order.id === job.stopLossOrderId) : undefined;
	if (tp && sl) return;
	await import('$lib/hl/orders').then(({ fetchOpenOrders }) => fetchOpenOrders());
	tp = job.takeProfitOrderId ? get(openOrders).find((order) => order.id === job.takeProfitOrderId) : undefined;
	sl = job.stopLossOrderId ? get(openOrders).find((order) => order.id === job.stopLossOrderId) : undefined;
	if (tp && sl) return;

	const tpFilled = Boolean(job.takeProfitOrderId && get(fills).some((fill) => fill.orderId === job.takeProfitOrderId));
	const slFilled = Boolean(job.stopLossOrderId && get(fills).some((fill) => fill.orderId === job.stopLossOrderId));
	const decision = reconcileOcoChildren({ takeProfitOpen: Boolean(tp), stopLossOpen: Boolean(sl), takeProfitFilled: tpFilled, stopLossFilled: slFilled });
	if (decision.state === 'complete') {
		const siblingCancelled = await cancelChild(decision.cancel === 'stopLoss' ? job.stopLossOrderId : job.takeProfitOrderId, job.apiCoin);
		if (!siblingCancelled) {
			save(transitionLocalAlgoJob(job, 'failed', 'OCO sibling cancellation could not be reconciled'));
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
	timers.set(jobId, setInterval(() => void tickGuard.run(jobId, () => tick(jobId)).catch((error) => {
		const job = loadLocalAlgoJobs('oco').find((candidate) => candidate.id === jobId);
		if (job) save(transitionLocalAlgoJob(job, 'failed', error instanceof Error ? error.message : 'OCO reconciliation failed'));
		stop(jobId);
	}), 500));
	void tickGuard.run(jobId, () => tick(jobId));
}

async function continuePlacement(job: LocalOcoJob, market: MarketDescriptor): Promise<LocalOcoJob> {
	const { localExecution } = await import('./localExecution');
	if (!localExecution.isReady()) return saveAndReturn(transitionLocalAlgoJob(job, 'paused', 'Secure trading is locked; resume after unlocking the local agent'));
	if (job.deadmanMs) {
		const deadman = await localExecution.armDeadman(job.deadmanMs);
		if (!deadman.accepted) return saveAndReturn(transitionLocalAlgoJob(job, 'failed', deadman.error ?? 'Dead-man switch could not be armed before OCO placement'));
	}
	const exitSide = ocoExitSide(job.side);
	if (!job.takeProfitOrderId) {
		const dispatching = { ...job, pendingTakeProfitCommandId: crypto.randomUUID(), updatedAt: Date.now() };
		save(dispatching);
		const ack = await localExecution.placeOrder(market, {
			coin: market.apiCoin, isBuy: exitSide === 'buy', size: job.size, limitPrice: job.takeProfit,
			reduceOnly: true, orderType: 'stop', triggerPrice: job.takeProfit, triggerKind: 'takeProfit',
			commandId: dispatching.pendingTakeProfitCommandId
		});
		if (!ack.accepted || ack.venueOrderIds.length !== 1) return saveAndReturn({ ...transitionLocalAlgoJob(dispatching, ack.uncertain ? 'paused' : 'failed', ack.error ?? 'OCO take-profit child failed'), pendingTakeProfitCommandId: ack.uncertain ? dispatching.pendingTakeProfitCommandId : undefined });
		job = { ...dispatching, pendingTakeProfitCommandId: undefined, takeProfitOrderId: ack.venueOrderIds[0], childOrderIds: [...dispatching.childOrderIds, ack.venueOrderIds[0]], updatedAt: Date.now() };
		save(job);
	}
	if (job.stopLossOrderId) return job;
	const dispatching = { ...job, pendingStopLossCommandId: crypto.randomUUID(), updatedAt: Date.now() };
	save(dispatching);
	const ack = await localExecution.placeOrder(market, {
		coin: market.apiCoin, isBuy: exitSide === 'buy', size: job.size, limitPrice: job.stopLoss,
		reduceOnly: true, orderType: 'stop', triggerPrice: job.stopLoss, triggerKind: 'stop',
		commandId: dispatching.pendingStopLossCommandId
	});
	if (!ack.accepted || ack.venueOrderIds.length !== 1) {
		if (ack.uncertain) return saveAndReturn({ ...transitionLocalAlgoJob(dispatching, 'paused', ack.error ?? 'OCO stop-loss child is unresolved'), pendingStopLossCommandId: dispatching.pendingStopLossCommandId });
		const cancelled = await cancelChild(dispatching.takeProfitOrderId, market.apiCoin);
		if (!cancelled) return saveAndReturn(transitionLocalAlgoJob({ ...dispatching, pendingStopLossCommandId: undefined }, 'paused', 'OCO stop-loss failed and take-profit cancellation requires reconciliation'));
		if (job.deadmanMs) await localExecution.clearDeadman();
		return saveAndReturn(transitionLocalAlgoJob({ ...dispatching, pendingStopLossCommandId: undefined }, 'failed', ack.error ?? 'OCO stop-loss child failed'));
	}
	const complete = { ...dispatching, pendingStopLossCommandId: undefined, stopLossOrderId: ack.venueOrderIds[0], childOrderIds: [...dispatching.childOrderIds, ack.venueOrderIds[0]], updatedAt: Date.now() };
	save(complete);
	if (complete.deadmanMs) {
		const deadman = await localExecution.armDeadman(complete.deadmanMs);
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
	save(job);
	const complete = await continuePlacement(job, market);
	if (complete.status !== 'running' || !complete.takeProfitOrderId || !complete.stopLossOrderId) return { ok: false, error: complete.error ?? 'OCO could not place both child orders' };
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
	const complete = await continuePlacement({ ...recovered, status: 'running', error: undefined, updatedAt: Date.now() }, market);
	if (complete.status === 'running' && complete.takeProfitOrderId && complete.stopLossOrderId) startTimer(jobId);
}

export function resumePersistedOcos(): void {
	sync();
	for (const job of loadLocalAlgoJobs('oco').filter((candidate) => candidate.status === 'running')) {
		const recovered = recoverPendingDispatch(job);
		if (recovered.status === 'running' && recovered.takeProfitOrderId && recovered.stopLossOrderId) startTimer(recovered.id);
	}
}

export function stopAllOcoTimers(): void { for (const id of timers.keys()) stop(id); }
