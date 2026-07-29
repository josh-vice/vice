import { get } from 'svelte/store';
import { fills, localAlgoJobs, marketRegistry, openOrders, orderBook, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import { loadLocalAlgoJobs, transitionLocalAlgoJob, upsertLocalAlgoJob, type LocalBreakEvenJob } from './algoJobs';
import { cancelAlgoChildren } from './algoCancellation';
import { createTickGuard } from './tickGuard';
import { ocoExitSide } from './ocoState';
import { loadExecutionJournal } from './commandJournal';
import { recoverPendingChildDispatch } from './childDispatchRecovery';

type BreakEvenParams = { side: 'buy' | 'sell'; size: number; entryPrice: number; triggerDistance: number; offset?: number; deadmanMs?: number };
const timers = new Map<string, ReturnType<typeof setInterval>>();
const tickGuard = createTickGuard();
function sync(): void { localAlgoJobs.set(loadLocalAlgoJobs()); }
function save(job: LocalBreakEvenJob): void { upsertLocalAlgoJob(job); sync(); }
function recoverPendingDispatch(job: LocalBreakEvenJob): LocalBreakEvenJob { const owner = get(walletAddress); const recovered = recoverPendingChildDispatch(job, owner ? loadExecutionJournal(owner) : []); if (recovered !== job) save(recovered); return recovered; }
function stop(id: string): void { const timer = timers.get(id); if (timer) clearInterval(timer); timers.delete(id); }
function mark(): number | null { const book = get(orderBook); const bid = book.bids[0]?.price; const ask = book.asks[0]?.price; return bid && ask ? (bid + ask) / 2 : null; }
function favorable(side: 'buy' | 'sell', entry: number, current: number, distance: number): boolean { return side === 'buy' ? current >= entry + distance : current <= entry - distance; }
function stopPrice(job: LocalBreakEvenJob, market: MarketDescriptor): number { const tick = 10 ** -market.priceDecimals; const raw = job.side === 'buy' ? job.entryPrice + job.offset : job.entryPrice - job.offset; return Math.round(raw / tick) * tick; }

async function tick(id: string): Promise<void> {
	let job = loadLocalAlgoJobs('break_even').find((candidate) => candidate.id === id);
	if (!job || job.status !== 'running') { stop(id); return; }
	const { localExecution } = await import('./localExecution');
	if (!localExecution.isReady()) { save(transitionLocalAlgoJob(job, 'paused', 'Secure trading is locked; resume after unlocking the local agent')); stop(id); return; }
	if (get(selectedMarket)?.marketKey !== job.marketKey) { save(transitionLocalAlgoJob(job, 'paused', 'Select the break-even market so its live book is authoritative')); stop(id); return; }
	const market = get(marketRegistry).find((candidate) => candidate.marketKey === job!.marketKey); const currentMark = mark();
	if (!market || currentMark == null) return;
	if (job.currentOrderId) {
		let current = get(openOrders).find((order) => order.id === job!.currentOrderId);
		if (!current) { await import('$lib/hl/orders').then(({ fetchOpenOrders }) => fetchOpenOrders()); current = get(openOrders).find((order) => order.id === job!.currentOrderId); }
		if (current) return;
		if (get(fills).some((fill) => fill.orderId === job!.currentOrderId)) { save(transitionLocalAlgoJob(job, 'completed')); if (job.deadmanMs) await localExecution.clearDeadman(); } else save(transitionLocalAlgoJob(job, 'paused', 'Break-even child disappeared without an authoritative fill'));
		stop(id); return;
	}
	if (!job.activated && !favorable(job.side, job.entryPrice, currentMark, job.triggerDistance)) return;
	if (!job.activated) { job = { ...job, activated: true, updatedAt: Date.now() }; save(job); }
	if (job.deadmanMs) { const armed = await localExecution.armDeadman(job.deadmanMs); if (!armed.accepted) { save(transitionLocalAlgoJob(job, 'failed', armed.error ?? 'Dead-man switch could not be armed before break-even child')); stop(id); return; } }
	const trigger = stopPrice(job, market);
	const dispatching = { ...job, pendingChildCommandId: crypto.randomUUID(), updatedAt: Date.now() };
	save(dispatching);
	const ack = await localExecution.placeOrder(market, { coin: market.apiCoin, isBuy: ocoExitSide(job.side) === 'buy', size: job.size, limitPrice: trigger, reduceOnly: true, orderType: 'stop', triggerPrice: trigger, triggerKind: 'stop', commandId: dispatching.pendingChildCommandId });
	if (!ack.accepted || ack.venueOrderIds.length !== 1) { save({ ...transitionLocalAlgoJob(dispatching, ack.uncertain ? 'paused' : 'failed', ack.error ?? 'Break-even child placement failed'), pendingChildCommandId: ack.uncertain ? dispatching.pendingChildCommandId : undefined }); stop(id); return; }
	const placed = { ...dispatching, pendingChildCommandId: undefined, currentOrderId: ack.venueOrderIds[0], childOrderIds: [...dispatching.childOrderIds, ack.venueOrderIds[0]], updatedAt: Date.now() };
	save(placed);
	if (placed.deadmanMs) { const armed = await localExecution.armDeadman(placed.deadmanMs); if (!armed.accepted) { save(transitionLocalAlgoJob(placed, 'failed', armed.error ?? 'Dead-man switch could not be re-armed')); stop(id); } }
}
function startTimer(id: string): void { if (timers.has(id)) return; timers.set(id, setInterval(() => void tickGuard.run(id, () => tick(id)).catch((error) => { const job = loadLocalAlgoJobs('break_even').find((candidate) => candidate.id === id); if (job) save(transitionLocalAlgoJob(job, 'failed', error instanceof Error ? error.message : 'Break-even tick failed')); stop(id); }), 250)); void tickGuard.run(id, () => tick(id)); }

export async function startBreakEven(market: MarketDescriptor, params: BreakEvenParams): Promise<{ ok: boolean; jobId?: string; error?: string }> {
	if (!get(walletAddress)) return { ok: false, error: 'Connect and unlock the local agent before starting break-even protection' };
	if (get(selectedMarket)?.marketKey !== market.marketKey) return { ok: false, error: 'Select the break-even market so its live book is authoritative' };
	const offset = params.offset ?? 0;
	if (params.size <= 0 || params.entryPrice <= 0 || params.triggerDistance <= 0 || offset < 0) return { ok: false, error: 'Break-even requires positive size, entry, trigger distance, and non-negative offset' };
	const now = Date.now(); const job: LocalBreakEvenJob = { id: crypto.randomUUID(), type: 'break_even', marketKey: market.marketKey, apiCoin: market.apiCoin, assetId: market.assetId, side: params.side, size: params.size, entryPrice: params.entryPrice, triggerDistance: params.triggerDistance, offset, activated: false, dispatchRecoveryVersion: 1, childOrderIds: [], deadmanMs: params.deadmanMs, status: 'running', createdAt: now, updatedAt: now };
	save(job); await tick(job.id); const started = loadLocalAlgoJobs('break_even').find((candidate) => candidate.id === job.id);
	if (!started || started.status !== 'running') { stop(job.id); return { ok: false, error: started?.error ?? 'Break-even could not start' }; }
	startTimer(job.id); return { ok: true, jobId: job.id };
}
export async function pauseBreakEven(id: string): Promise<void> { stop(id); const job = loadLocalAlgoJobs('break_even').find((candidate) => candidate.id === id); if (job) save(transitionLocalAlgoJob(job, 'paused')); }
export async function resumeBreakEven(id: string): Promise<void> { const job = loadLocalAlgoJobs('break_even').find((candidate) => candidate.id === id); if (job && ['paused', 'failed'].includes(job.status) && !job.restartRecoveryRequired) { const recovered = recoverPendingDispatch(job); if (recovered.pendingChildCommandId) return; save({ ...recovered, status: 'running', error: undefined, updatedAt: Date.now() }); startTimer(id); } }
export async function cancelBreakEven(id: string, emergency = false): Promise<void> { const job = loadLocalAlgoJobs('break_even').find((candidate) => candidate.id === id); if (!job) return; stop(id); const cancellation = await cancelAlgoChildren([job.currentOrderId], (orderId) => import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(orderId, job.apiCoin))); if (!cancellation.ok) { save(transitionLocalAlgoJob(job, 'paused', cancellation.error ?? 'Break-even cancellation requires reconciliation')); return; } if (!emergency && job.deadmanMs && !(await import('./localExecution').then(({ localExecution }) => localExecution.clearDeadman()).then((ack) => ack.accepted))) { save(transitionLocalAlgoJob(job, 'paused', 'Break-even dead-man clear requires reconciliation')); return; } save(transitionLocalAlgoJob(job, emergency ? 'emergencyStopped' : 'cancelled', emergency ? 'Emergency stop requested' : undefined)); }
export function resumePersistedBreakEvens(): void { sync(); for (const job of loadLocalAlgoJobs('break_even').filter((candidate) => candidate.status === 'running')) { const recovered = recoverPendingDispatch(job); if (recovered.status === 'running') startTimer(recovered.id); } }
export function stopAllBreakEvenTimers(): void { for (const id of timers.keys()) stop(id); }
