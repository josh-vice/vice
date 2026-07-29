import { get } from 'svelte/store';
import { fills, localAlgoJobs, marketRegistry, openOrders, orderBook, recentTrades, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import { buildAdaptiveSliceSizes, type AdaptiveMode } from './adaptiveMath';
import { loadLocalAlgoJobs, transitionLocalAlgoJob, upsertLocalAlgoJob, type LocalAdaptiveJob } from './algoJobs';
import { cancelAlgoChildren } from './algoCancellation';
import { createTickGuard } from './tickGuard';
import { loadExecutionJournal } from './commandJournal';
import { recoverPendingChildDispatch } from './childDispatchRecovery';

type AdaptiveParams = {
	side: 'buy' | 'sell';
	size: number;
	durationMinutes: number;
	intervals: number;
	participation: number;
	offsetTicks: number;
	deadmanMs?: number;
};

const timers = new Map<string, ReturnType<typeof setInterval>>();
const tickGuard = createTickGuard();

function sync(): void { localAlgoJobs.set(loadLocalAlgoJobs()); }
function save(job: LocalAdaptiveJob): void { upsertLocalAlgoJob(job); sync(); }
function recoverPendingDispatch(job: LocalAdaptiveJob): LocalAdaptiveJob { const owner = get(walletAddress); const recovered = recoverPendingChildDispatch(job, owner ? loadExecutionJournal(owner) : []); if (recovered !== job) save(recovered); return recovered; }
function stop(id: string): void {
	const timer = timers.get(id);
	if (timer) clearInterval(timer);
	timers.delete(id);
}

function childPrice(market: MarketDescriptor, side: 'buy' | 'sell', offsetTicks: number): number | null {
	const book = get(orderBook);
	const level = side === 'buy' ? book.bids[0]?.price : book.asks[0]?.price;
	if (!level || !Number.isFinite(level)) return null;
	const tick = 10 ** -market.priceDecimals;
	return side === 'buy' ? level - tick * offsetTicks : level + tick * offsetTicks;
}

async function tick(id: string): Promise<void> {
	let job = loadLocalAlgoJobs('adaptive_twap').concat(loadLocalAlgoJobs('vwap')).find((candidate) => candidate.id === id);
	if (!job || job.status !== 'running') { stop(id); return; }
	const { localExecution } = await import('./localExecution');
	if (!localExecution.isReady()) { save(transitionLocalAlgoJob(job, 'paused', 'Secure trading is locked; resume after unlocking the local agent')); stop(id); return; }
	if (get(selectedMarket)?.marketKey !== job.marketKey) { save(transitionLocalAlgoJob(job, 'paused', 'Select the adaptive execution market so its live book is authoritative')); stop(id); return; }
	const market = get(marketRegistry).find((candidate) => candidate.marketKey === job!.marketKey);
	if (!market) { save(transitionLocalAlgoJob(job, 'paused', 'Market identity is unavailable after reconnect')); stop(id); return; }

	if (job.currentOrderId) {
		let current = get(openOrders).find((order) => order.id === job!.currentOrderId);
		if (!current) {
			await import('$lib/hl/orders').then(({ fetchOpenOrders }) => fetchOpenOrders());
			current = get(openOrders).find((order) => order.id === job!.currentOrderId);
		}
		if (current) return;
		const filled = get(fills).filter((fill) => fill.orderId === job!.currentOrderId).reduce((sum, fill) => sum + fill.size, 0);
		if (filled <= 0) { save(transitionLocalAlgoJob(job, 'paused', 'Adaptive child disappeared without an authoritative fill')); stop(id); return; }
		job = { ...job, currentOrderId: undefined, executedSize: job.executedSize + filled, remainingSize: Math.max(0, job.remainingSize - filled), updatedAt: Date.now() };
		save(job);
		if (job.remainingSize <= 0 || job.sliceIndex >= job.intervals) {
			save(transitionLocalAlgoJob(job, 'completed'));
			if (job.deadmanMs) await localExecution.clearDeadman();
			stop(id);
			return;
		}
	}
	if (Date.now() < job.nextSliceAt) return;
	const slices = buildAdaptiveSliceSizes(job.totalSize, job.intervals, job.type as AdaptiveMode, get(recentTrades), job.participation);
	const sliceSize = Math.min(job.remainingSize, slices[job.sliceIndex] ?? job.remainingSize);
	const price = childPrice(market, job.side, job.offsetTicks);
	if (!price || sliceSize <= 0) return;
	if (job.deadmanMs) {
		const deadman = await localExecution.armDeadman(job.deadmanMs);
		if (!deadman.accepted) { save(transitionLocalAlgoJob(job, 'failed', deadman.error ?? 'Dead-man switch could not be armed before adaptive child')); stop(id); return; }
	}
	const dispatching = { ...job, pendingChildCommandId: crypto.randomUUID(), updatedAt: Date.now() };
	save(dispatching);
	const ack = await localExecution.placeOrder(market, { coin: market.apiCoin, isBuy: job.side === 'buy', size: sliceSize, limitPrice: price, reduceOnly: false, tif: 'Alo', orderType: 'limit', commandId: dispatching.pendingChildCommandId });
	if (!ack.accepted || ack.venueOrderIds.length !== 1) { save({ ...transitionLocalAlgoJob(dispatching, ack.uncertain ? 'paused' : 'failed', ack.error ?? 'Adaptive child placement failed'), pendingChildCommandId: ack.uncertain ? dispatching.pendingChildCommandId : undefined }); stop(id); return; }
	const next = { ...dispatching, pendingChildCommandId: undefined, currentOrderId: ack.venueOrderIds[0], childOrderIds: [...dispatching.childOrderIds, ack.venueOrderIds[0]], sliceIndex: dispatching.sliceIndex + 1, nextSliceAt: Date.now() + Math.max(250, Math.round((dispatching.durationMinutes * 60_000) / dispatching.intervals)), updatedAt: Date.now() };
	save(next);
	if (next.deadmanMs) {
		const deadman = await localExecution.armDeadman(next.deadmanMs);
		if (!deadman.accepted) { save(transitionLocalAlgoJob(next, 'failed', deadman.error ?? 'Dead-man switch could not be re-armed')); stop(id); }
	}
}

function startTimer(id: string): void {
	if (timers.has(id)) return;
	timers.set(id, setInterval(() => void tickGuard.run(id, () => tick(id)).catch((error) => {
		const job = loadLocalAlgoJobs('adaptive_twap').concat(loadLocalAlgoJobs('vwap')).find((candidate) => candidate.id === id);
		if (job) save(transitionLocalAlgoJob(job, 'failed', error instanceof Error ? error.message : 'Adaptive execution tick failed'));
		stop(id);
	}), 250));
	void tickGuard.run(id, () => tick(id));
}

export async function startAdaptiveExecution(market: MarketDescriptor, mode: AdaptiveMode, params: AdaptiveParams): Promise<{ ok: boolean; jobId?: string; error?: string }> {
	if (!get(walletAddress)) return { ok: false, error: 'Connect and unlock the local agent before starting adaptive execution' };
	if (get(selectedMarket)?.marketKey !== market.marketKey) return { ok: false, error: 'Select the adaptive execution market so its live book is authoritative' };
	if (params.size <= 0 || params.durationMinutes <= 0 || params.intervals < 2 || params.intervals > 100) return { ok: false, error: 'Invalid adaptive execution size, duration, or interval count' };
	const job: LocalAdaptiveJob = {
		id: crypto.randomUUID(), type: mode, marketKey: market.marketKey, apiCoin: market.apiCoin, assetId: market.assetId,
		side: params.side, totalSize: params.size, remainingSize: params.size, executedSize: 0,
		durationMinutes: Math.min(1440, params.durationMinutes), intervals: Math.round(params.intervals), participation: Math.max(0.01, Math.min(1, params.participation)), offsetTicks: Math.max(0, Math.round(params.offsetTicks)),
		sliceIndex: 0, nextSliceAt: Date.now(), dispatchRecoveryVersion: 1, childOrderIds: [], deadmanMs: params.deadmanMs, status: 'running', createdAt: Date.now(), updatedAt: Date.now()
	};
	save(job);
	await tick(job.id);
	const started = loadLocalAlgoJobs(mode).find((candidate) => candidate.id === job.id);
	if (!started || started.status !== 'running' || !started.currentOrderId) { stop(job.id); return { ok: false, error: started?.error ?? 'Adaptive execution could not place its first child' }; }
	startTimer(job.id);
	return { ok: true, jobId: job.id };
}

export async function pauseAdaptiveExecution(id: string): Promise<void> { stop(id); const job = loadLocalAlgoJobs('adaptive_twap').concat(loadLocalAlgoJobs('vwap')).concat(loadLocalAlgoJobs('pov')).find((candidate) => candidate.id === id); if (job) save(transitionLocalAlgoJob(job, 'paused')); }
export async function resumeAdaptiveExecution(id: string): Promise<void> { const job = loadLocalAlgoJobs('adaptive_twap').concat(loadLocalAlgoJobs('vwap')).concat(loadLocalAlgoJobs('pov')).find((candidate) => candidate.id === id); if (job && ['paused', 'failed'].includes(job.status) && !job.restartRecoveryRequired) { const recovered = recoverPendingDispatch(job); if (recovered.pendingChildCommandId) return; save({ ...recovered, status: 'running', error: undefined, updatedAt: Date.now() }); startTimer(id); } }
export async function cancelAdaptiveExecution(id: string, emergency = false): Promise<void> {
	const job = loadLocalAlgoJobs('adaptive_twap').concat(loadLocalAlgoJobs('vwap')).concat(loadLocalAlgoJobs('pov')).find((candidate) => candidate.id === id);
	if (!job) return;
	stop(id);
	const cancellation = await cancelAlgoChildren([job.currentOrderId], (orderId) => import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(orderId, job.apiCoin)));
	if (!cancellation.ok) { save(transitionLocalAlgoJob(job, 'paused', cancellation.error ?? 'Adaptive cancellation requires reconciliation')); return; }
	if (!emergency && job.deadmanMs) { const cleared = await localExecutionClearDeadman(); if (!cleared) { save(transitionLocalAlgoJob(job, 'paused', 'Adaptive dead-man clear requires reconciliation')); return; } }
	save(transitionLocalAlgoJob(job, emergency ? 'emergencyStopped' : 'cancelled', emergency ? 'Emergency stop requested' : undefined));
}
async function localExecutionClearDeadman(): Promise<boolean> { const { localExecution } = await import('./localExecution'); return (await localExecution.clearDeadman()).accepted; }
export function resumePersistedAdaptiveExecutions(): void { sync(); for (const job of loadLocalAlgoJobs('adaptive_twap').concat(loadLocalAlgoJobs('vwap')).filter((candidate) => candidate.status === 'running')) { const recovered = recoverPendingDispatch(job); if (recovered.status === 'running') startTimer(recovered.id); } }
export function stopAllAdaptiveTimers(): void { for (const id of timers.keys()) stop(id); }
