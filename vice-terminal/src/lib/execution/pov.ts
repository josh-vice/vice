import { get } from 'svelte/store';
import { fills, localAlgoJobs, marketRegistry, openOrders, orderBook, recentTrades, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import { loadLocalAlgoJobs, transitionLocalAlgoJob, upsertLocalAlgoJob, type LocalAdaptiveJob } from './algoJobs';
import { cancelAlgoChildren } from './algoCancellation';
import { participationSlice } from './povMath';
import { createTickGuard } from './tickGuard';
import { loadExecutionJournal } from './commandJournal';
import { recoverPendingChildDispatch } from './childDispatchRecovery';

type PovParams = { side: 'buy' | 'sell'; size: number; durationMinutes: number; participation: number; windowTrades: number; offsetTicks: number; deadmanMs?: number };
const timers = new Map<string, ReturnType<typeof setInterval>>();
const running = new Set<string>();
const tickGuard = createTickGuard();
function sync(): void { localAlgoJobs.set(loadLocalAlgoJobs()); }
function save(job: LocalAdaptiveJob): void { upsertLocalAlgoJob(job); sync(); }
function recoverPendingDispatch(job: LocalAdaptiveJob): LocalAdaptiveJob { const owner = get(walletAddress); const recovered = recoverPendingChildDispatch(job, owner ? loadExecutionJournal(owner) : []); if (recovered !== job) save(recovered); return recovered; }
function stop(id: string): void { const timer = timers.get(id); if (timer) clearInterval(timer); timers.delete(id); running.delete(id); }
function priceFor(market: MarketDescriptor, side: 'buy' | 'sell', offsetTicks: number): number | null {
	const book = get(orderBook); const level = side === 'buy' ? book.bids[0]?.price : book.asks[0]?.price;
	if (!level || !Number.isFinite(level)) return null;
	const offset = 10 ** -market.priceDecimals * Math.max(0, Math.round(offsetTicks));
	return side === 'buy' ? level - offset : level + offset;
}

async function tick(id: string): Promise<void> {
	let job = loadLocalAlgoJobs('pov').find((candidate) => candidate.id === id);
	if (!job || job.status !== 'running') { stop(id); return; }
	const { localExecution } = await import('./localExecution');
	if (!running.has(id)) return;
	if (!localExecution.isReady()) { save(transitionLocalAlgoJob(job, 'paused', 'Secure trading is locked; resume after unlocking the local agent')); stop(id); return; }
	if (get(selectedMarket)?.marketKey !== job.marketKey) { save(transitionLocalAlgoJob(job, 'paused', 'Select the POV market so its live book is authoritative')); stop(id); return; }
	const market = get(marketRegistry).find((candidate) => candidate.marketKey === job!.marketKey);
	if (!market) { save(transitionLocalAlgoJob(job, 'paused', 'Market identity is unavailable after reconnect')); stop(id); return; }
	if (Date.now() > job.createdAt + job.durationMinutes * 60_000) { save(transitionLocalAlgoJob(job, 'paused', 'POV duration elapsed with unexecuted size')); stop(id); return; }

	if (job.currentOrderId) {
		let current = get(openOrders).find((order) => order.id === job!.currentOrderId);
		if (!current) { await import('$lib/hl/orders').then(({ fetchOpenOrders }) => fetchOpenOrders()); if (!running.has(id)) return; current = get(openOrders).find((order) => order.id === job!.currentOrderId); }
		if (current) return;
		const currentOrderId = job.currentOrderId;
		const outcome = await localExecution.getOrderOutcome(currentOrderId);
		if (!running.has(id)) return;
		// A missing local row can be a stale account snapshot, not a terminal
		// child outcome. Keep the child and wait when the venue still reports it
		// open (including a partial fill).
		if (outcome.status === 'open') return;
		const observedFilled = Math.max(get(fills).filter((fill) => fill.orderId === currentOrderId).reduce((sum, fill) => sum + fill.size, 0), outcome.filled);
		if (observedFilled <= 0 || outcome.status === 'unknown') { save(transitionLocalAlgoJob(job, 'paused', 'POV child disappeared without an authoritative fill')); stop(id); return; }
		const filled = Math.min(job.remainingSize, observedFilled);
		job = { ...job, currentOrderId: undefined, executedSize: job.executedSize + filled, remainingSize: Math.max(0, job.remainingSize - filled), updatedAt: Date.now() };
		save(job);
		if (job.remainingSize <= 0) { save(transitionLocalAlgoJob(job, 'completed')); if (job.deadmanMs) await localExecution.clearDeadman(); stop(id); return; }
	}
	if (Date.now() < job.nextSliceAt) return;
	const size = participationSlice(job.remainingSize, get(recentTrades), job.participation, job.intervals);
	const price = priceFor(market, job.side, job.offsetTicks);
	if (size <= 0 || !price) return;
	if (!running.has(id)) return;
	if (job.deadmanMs) { const armed = await localExecution.armDeadman(job.deadmanMs); if (!running.has(id)) { if (armed.accepted) await localExecution.clearDeadman(); return; } if (!armed.accepted) { save(transitionLocalAlgoJob(job, 'failed', armed.error ?? 'Dead-man switch could not be armed before POV child')); stop(id); return; } }
	if (!running.has(id)) return;
	const dispatching = { ...job, pendingChildCommandId: crypto.randomUUID(), updatedAt: Date.now() };
	save(dispatching);
	const ack = await localExecution.placeOrder(market, { coin: market.apiCoin, isBuy: job.side === 'buy', size, limitPrice: price, reduceOnly: false, tif: 'Alo', orderType: 'limit', commandId: dispatching.pendingChildCommandId });
	if (!running.has(id)) { for (const orderId of ack.venueOrderIds) await localExecution.cancelOrder(market, orderId); return; }
	if (!ack.accepted || ack.venueOrderIds.length !== 1) { save({ ...transitionLocalAlgoJob(dispatching, ack.uncertain ? 'paused' : 'failed', ack.error ?? 'POV child placement failed'), pendingChildCommandId: ack.uncertain ? dispatching.pendingChildCommandId : undefined }); stop(id); return; }
	const next = { ...dispatching, pendingChildCommandId: undefined, currentOrderId: ack.venueOrderIds[0], childOrderIds: [...dispatching.childOrderIds, ack.venueOrderIds[0]], sliceIndex: dispatching.sliceIndex + 1, nextSliceAt: Date.now() + 250, updatedAt: Date.now() };
	save(next);
	if (next.deadmanMs) { const armed = await localExecution.armDeadman(next.deadmanMs); if (!running.has(id)) { if (armed.accepted) await localExecution.clearDeadman(); return; } if (!armed.accepted) { save(transitionLocalAlgoJob(next, 'failed', armed.error ?? 'Dead-man switch could not be re-armed')); stop(id); } }
}

function startTimer(id: string): void { if (timers.has(id)) return; running.add(id); timers.set(id, setInterval(() => void tickGuard.run(id, () => tick(id)).catch((error) => { const job = loadLocalAlgoJobs('pov').find((candidate) => candidate.id === id); if (job?.status === 'running') save(transitionLocalAlgoJob(job, 'failed', error instanceof Error ? error.message : 'POV tick failed')); stop(id); }), 250)); void tickGuard.run(id, () => tick(id)); }

export async function startPov(market: MarketDescriptor, params: PovParams): Promise<{ ok: boolean; jobId?: string; error?: string }> {
	if (!get(walletAddress)) return { ok: false, error: 'Connect and unlock the local agent before starting POV' };
	if (get(selectedMarket)?.marketKey !== market.marketKey) return { ok: false, error: 'Select the POV market so its live book is authoritative' };
	if (params.size <= 0 || params.durationMinutes <= 0 || params.participation <= 0 || params.participation > 1) return { ok: false, error: 'Invalid POV size, duration, or participation' };
	const now = Date.now();
	const job: LocalAdaptiveJob = { id: crypto.randomUUID(), type: 'pov', marketKey: market.marketKey, apiCoin: market.apiCoin, assetId: market.assetId, side: params.side, totalSize: params.size, remainingSize: params.size, executedSize: 0, durationMinutes: Math.min(1440, params.durationMinutes), intervals: Math.max(1, Math.round(params.windowTrades)), participation: Math.min(1, params.participation), offsetTicks: Math.max(0, Math.round(params.offsetTicks)), sliceIndex: 0, nextSliceAt: now, dispatchRecoveryVersion: 1, childOrderIds: [], deadmanMs: params.deadmanMs, status: 'running', createdAt: now, updatedAt: now };
	running.add(job.id);
	save(job);
	try {
		await tick(job.id);
	} catch (error) {
		const current = loadLocalAlgoJobs('pov').find((candidate) => candidate.id === job.id);
		if (current?.status === 'running') save(transitionLocalAlgoJob(current, 'paused', error instanceof Error ? error.message : 'POV could not start'));
		stop(job.id);
	}
	const started = loadLocalAlgoJobs('pov').find((candidate) => candidate.id === job.id);
	if (!started || started.status !== 'running' || !started.currentOrderId) { stop(job.id); return { ok: false, error: started?.error ?? 'POV requires live public trade flow before placing its first child' }; }
	startTimer(job.id); return { ok: true, jobId: job.id };
}
export async function pausePov(id: string): Promise<void> { stop(id); const job = loadLocalAlgoJobs('pov').find((candidate) => candidate.id === id); if (job) save(transitionLocalAlgoJob(job, 'paused')); }
export async function resumePov(id: string): Promise<void> { const job = loadLocalAlgoJobs('pov').find((candidate) => candidate.id === id); if (job && ['paused', 'failed'].includes(job.status) && !job.restartRecoveryRequired) { const recovered = recoverPendingDispatch(job); if (recovered.pendingChildCommandId) return; running.add(id); save({ ...recovered, status: 'running', error: undefined, updatedAt: Date.now() }); startTimer(id); } }
export async function cancelPov(id: string, emergency = false): Promise<void> { const job = loadLocalAlgoJobs('pov').find((candidate) => candidate.id === id); if (!job) return; stop(id); const cancellation = await cancelAlgoChildren([job.currentOrderId], (orderId) => import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(orderId, job.apiCoin))); if (!cancellation.ok) { save(transitionLocalAlgoJob(job, 'paused', cancellation.error ?? 'POV cancellation requires reconciliation')); return; } if (!emergency && job.deadmanMs && !(await import('./localExecution').then(({ localExecution }) => localExecution.clearDeadman()).then((ack) => ack.accepted))) { save(transitionLocalAlgoJob(job, 'paused', 'POV dead-man clear requires reconciliation')); return; } save(transitionLocalAlgoJob(job, emergency ? 'emergencyStopped' : 'cancelled', emergency ? 'Emergency stop requested' : undefined)); }
export function resumePersistedPovs(): void { sync(); for (const job of loadLocalAlgoJobs('pov').filter((candidate) => candidate.status === 'running')) { const recovered = recoverPendingDispatch(job); if (recovered.status === 'running') startTimer(recovered.id); } }
export function stopAllPovTimers(): void { for (const id of timers.keys()) stop(id); }
