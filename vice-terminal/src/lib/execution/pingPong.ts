import { get } from 'svelte/store';
import { fills, localAlgoJobs, marketRegistry, openOrders, orderBook, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import { loadLocalAlgoJobs, transitionLocalAlgoJob, upsertLocalAlgoJob, type LocalPingPongJob } from './algoJobs';
import { cancelAlgoChildren } from './algoCancellation';
import { createTickGuard } from './tickGuard';
import { loadExecutionJournal } from './commandJournal';
import { recoverPendingChildDispatch } from './childDispatchRecovery';

type PingPongParams = { size: number; cycles: number; rangePct: number; pauseMs: number; centerPrice?: number; deadmanMs?: number };
const timers = new Map<string, ReturnType<typeof setInterval>>();
const tickGuard = createTickGuard();
function sync(): void { localAlgoJobs.set(loadLocalAlgoJobs()); }
function save(job: LocalPingPongJob): void { upsertLocalAlgoJob(job); sync(); }
function recoverPendingDispatch(job: LocalPingPongJob): LocalPingPongJob { const owner = get(walletAddress); const recovered = recoverPendingChildDispatch(job, owner ? loadExecutionJournal(owner) : []); if (recovered !== job) save(recovered); return recovered; }
function stop(id: string): void { const timer = timers.get(id); if (timer) clearInterval(timer); timers.delete(id); }
function legPrice(job: LocalPingPongJob): number { return job.nextSide === 'buy' ? job.centerPrice * (1 - job.rangePct / 200) : job.centerPrice * (1 + job.rangePct / 200); }

async function tick(id: string): Promise<void> {
	let job = loadLocalAlgoJobs('ping_pong').find((candidate) => candidate.id === id);
	if (!job || job.status !== 'running') { stop(id); return; }
	if (job.currentOrderId) {
		if (get(openOrders).some((order) => order.id === job!.currentOrderId)) return;
		await import('$lib/hl/orders').then(({ fetchOpenOrders }) => fetchOpenOrders());
		if (get(openOrders).some((order) => order.id === job!.currentOrderId)) return;
		if (!get(fills).some((fill) => fill.orderId === job!.currentOrderId)) { save(transitionLocalAlgoJob(job, 'paused', 'Ping-Pong child disappeared without an authoritative fill')); stop(id); return; }
		job = { ...job, currentOrderId: undefined, completedLegs: job.completedLegs + 1, nextSide: job.nextSide === 'buy' ? 'sell' : 'buy', updatedAt: Date.now() };
		if (job.completedLegs >= job.cycles * 2) { save(transitionLocalAlgoJob(job, 'completed')); if (job.deadmanMs) await import('./localExecution').then(({ localExecution }) => localExecution.clearDeadman()); stop(id); return; }
		save(job);
		if (job.pauseMs > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(job!.pauseMs, 60_000)));
	}
	const market = get(marketRegistry).find((candidate) => candidate.marketKey === job!.marketKey);
	if (!market) { save(transitionLocalAlgoJob(job, 'paused', 'Market identity is unavailable after reconnect')); stop(id); return; }
	const { localExecution } = await import('./localExecution');
	if (job.deadmanMs) {
		const deadman = await localExecution.armDeadman(job.deadmanMs);
		if (!deadman.accepted) {
			save(transitionLocalAlgoJob(job, 'failed', deadman.error ?? 'Dead-man switch could not be armed before child placement'));
			stop(id);
			return;
		}
	}
	const dispatching = { ...job, pendingChildCommandId: crypto.randomUUID(), updatedAt: Date.now() };
	save(dispatching);
	const ack = await localExecution.placeOrder(market, { coin: market.apiCoin, isBuy: job.nextSide === 'buy', size: job.totalSize, limitPrice: legPrice(job), reduceOnly: false, tif: 'Alo', orderType: 'limit', commandId: dispatching.pendingChildCommandId });
	if (!ack.accepted || ack.venueOrderIds.length !== 1) { save({ ...transitionLocalAlgoJob(dispatching, ack.uncertain ? 'paused' : 'failed', ack.error ?? 'Ping-Pong child placement failed'), pendingChildCommandId: ack.uncertain ? dispatching.pendingChildCommandId : undefined }); stop(id); return; }
	save({ ...dispatching, pendingChildCommandId: undefined, currentOrderId: ack.venueOrderIds[0], childOrderIds: [...dispatching.childOrderIds, ack.venueOrderIds[0]], updatedAt: Date.now() });
}
function startTimer(id: string): void { if (timers.has(id)) return; timers.set(id, setInterval(() => void tickGuard.run(id, () => tick(id)).catch((error) => { const job = loadLocalAlgoJobs('ping_pong').find((candidate) => candidate.id === id); if (job) save(transitionLocalAlgoJob(job, 'failed', error instanceof Error ? error.message : 'Ping-Pong reconciliation failed')); stop(id); }), 500)); void tickGuard.run(id, () => tick(id)); }

export async function startPingPong(market: MarketDescriptor, params: PingPongParams): Promise<{ ok: boolean; jobId?: string; error?: string }> {
	if (!get(walletAddress)) return { ok: false, error: 'Connect and unlock the local agent before starting Ping-Pong' };
	if (get(selectedMarket)?.marketKey !== market.marketKey) return { ok: false, error: 'Select the Ping-Pong market so its live book is authoritative' };
	if (params.size <= 0 || !Number.isInteger(params.cycles) || params.cycles < 1 || params.cycles > 100 || params.rangePct <= 0 || params.rangePct >= 100) return { ok: false, error: 'Invalid Ping-Pong size, cycles, or range' };
	const book = get(orderBook); const center = params.centerPrice ?? ((book.bids[0]?.price ?? 0) + (book.asks[0]?.price ?? 0)) / 2;
	if (!center || !Number.isFinite(center)) return { ok: false, error: 'Ping-Pong requires a live best bid/ask or explicit center price' };
	const job: LocalPingPongJob = { id: crypto.randomUUID(), type: 'ping_pong', marketKey: market.marketKey, apiCoin: market.apiCoin, assetId: market.assetId, totalSize: params.size, cycles: params.cycles, completedLegs: 0, rangePct: params.rangePct, pauseMs: Math.max(0, Math.round(params.pauseMs)), centerPrice: center, nextSide: 'buy', deadmanMs: params.deadmanMs, dispatchRecoveryVersion: 1, childOrderIds: [], status: 'running', createdAt: Date.now(), updatedAt: Date.now() };
	save(job); await tick(job.id); const started = loadLocalAlgoJobs('ping_pong').find((candidate) => candidate.id === job.id);
	if (!started?.currentOrderId) { stop(job.id); return { ok: false, error: started?.error ?? 'Ping-Pong could not place its first child order' }; }
	startTimer(job.id); return { ok: true, jobId: job.id };
}
export async function pausePingPong(id: string): Promise<void> { const job = loadLocalAlgoJobs('ping_pong').find((candidate) => candidate.id === id); if (job) { stop(id); save(transitionLocalAlgoJob(job, 'paused')); } }
export async function resumePingPong(id: string): Promise<void> { const job = loadLocalAlgoJobs('ping_pong').find((candidate) => candidate.id === id); if (job && ['paused', 'failed'].includes(job.status) && !job.restartRecoveryRequired) { const recovered = recoverPendingDispatch(job); if (recovered.pendingChildCommandId) return; save({ ...recovered, status: 'running', error: undefined, updatedAt: Date.now() }); startTimer(id); } }
export async function cancelPingPong(id: string, emergency = false): Promise<void> { const job = loadLocalAlgoJobs('ping_pong').find((candidate) => candidate.id === id); if (!job) return; stop(id); const cancellation = await cancelAlgoChildren([job.currentOrderId], (orderId) => import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(orderId, job.apiCoin))); if (!cancellation.ok) { save(transitionLocalAlgoJob(job, 'paused', cancellation.error ?? 'Ping-Pong cancellation requires reconciliation')); return; } if (!emergency && job.deadmanMs) { const cleared = await import('./localExecution').then(({ localExecution }) => localExecution.clearDeadman()); if (!cleared.accepted) { save(transitionLocalAlgoJob(job, 'paused', cleared.error ?? 'Ping-Pong dead-man clear requires reconciliation')); return; } } save(transitionLocalAlgoJob(job, emergency ? 'emergencyStopped' : 'cancelled', emergency ? 'Emergency stop requested' : undefined)); }
export function resumePersistedPingPongs(): void { sync(); for (const job of loadLocalAlgoJobs('ping_pong').filter((candidate) => candidate.status === 'running')) { const recovered = recoverPendingDispatch(job); if (recovered.status === 'running') startTimer(recovered.id); } }
export function stopAllPingPongTimers(): void { for (const id of timers.keys()) stop(id); }
