import { get } from 'svelte/store';
import { fills, localAlgoJobs, marketRegistry, openOrders, orderBook, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import { loadLocalAlgoJobs, transitionLocalAlgoJob, upsertLocalAlgoJob, type LocalSwarmJob } from './algoJobs';
import { buildSwarmPrices } from './swarmMath';
import { cancelAlgoChildren } from './algoCancellation';
import { createTickGuard } from './tickGuard';
import { loadExecutionJournal } from './commandJournal';
import { recoverPendingSwarmDispatch } from './swarmDispatchRecovery';

type SwarmParams = { side: 'buy' | 'sell'; size: number; orders: number; spreadPct: number; centerPrice?: number; deadmanMs?: number };
const timers = new Map<string, ReturnType<typeof setInterval>>();
const tickGuard = createTickGuard();

function sync(): void { localAlgoJobs.set(loadLocalAlgoJobs()); }
function save(job: LocalSwarmJob): void { upsertLocalAlgoJob(job); sync(); }
function recoverPendingDispatch(job: LocalSwarmJob): LocalSwarmJob { const owner = get(walletAddress); const recovered = recoverPendingSwarmDispatch(job, owner ? loadExecutionJournal(owner) : []); if (recovered !== job) save(recovered); return recovered; }
function stop(id: string): void { const timer = timers.get(id); if (timer) clearInterval(timer); timers.delete(id); }

async function tick(id: string): Promise<void> {
	const job = loadLocalAlgoJobs('swarm').find((candidate) => candidate.id === id);
	if (!job || job.status !== 'running') { stop(id); return; }
	const open = job.childOrderIds.filter((orderId) => get(openOrders).some((order) => order.id === orderId));
	if (open.length > 0) return;
	await import('$lib/hl/orders').then(({ fetchOpenOrders }) => fetchOpenOrders());
	const stillOpen = job.childOrderIds.filter((orderId) => get(openOrders).some((order) => order.id === orderId));
	if (stillOpen.length > 0) return;
	const filled = job.childOrderIds.filter((orderId) => get(fills).some((fill) => fill.orderId === orderId));
	if (filled.length === job.childOrderIds.length && job.childOrderIds.length > 0) {
		save(transitionLocalAlgoJob(job, 'completed'));
		stop(id);
	} else if (job.childOrderIds.length > 0) {
		save(transitionLocalAlgoJob(job, 'paused', 'Swarm child disappeared without an authoritative fill'));
		stop(id);
	}
}

function startTimer(id: string): void {
	if (timers.has(id)) return;
	timers.set(id, setInterval(() => void tickGuard.run(id, () => tick(id)).catch((error) => {
		const job = loadLocalAlgoJobs('swarm').find((candidate) => candidate.id === id);
		if (job) save(transitionLocalAlgoJob(job, 'failed', error instanceof Error ? error.message : 'Swarm reconciliation failed'));
		stop(id);
	}), 500));
	void tickGuard.run(id, () => tick(id));
}

async function placeRemaining(market: MarketDescriptor, job: LocalSwarmJob): Promise<LocalSwarmJob> {
	const { localExecution } = await import('./localExecution');
	if (!localExecution.isReady()) return saveAndReturn(transitionLocalAlgoJob(job, 'paused', 'Secure trading is locked; resume after unlocking the local agent'));
	const prices = buildSwarmPrices(job.side, job.centerPrice, job.spreadPct, job.slicesTotal);
	const book = get(orderBook);
	const remainingPrices = prices.slice(job.slicesPlaced);
	const crosses = job.side === 'buy' ? remainingPrices.some((price) => price >= (book.asks[0]?.price ?? Infinity)) : remainingPrices.some((price) => price <= (book.bids[0]?.price ?? -Infinity));
	if (crosses) return saveAndReturn(transitionLocalAlgoJob(job, 'paused', 'Remaining post-only Swarm range would cross the current spread'));
	if (job.deadmanMs) { const deadman = await localExecution.armDeadman(job.deadmanMs); if (!deadman.accepted) return saveAndReturn(transitionLocalAlgoJob(job, 'failed', deadman.error ?? 'Dead-man switch could not be armed before child placement')); }
	let placed = job;
	for (let index = placed.slicesPlaced; index < prices.length; index += 1) {
		const dispatching = { ...placed, pendingChildCommandId: crypto.randomUUID(), pendingChildIndex: index, updatedAt: Date.now() };
		save(dispatching);
		const ack = await localExecution.placeOrder(market, { coin: market.apiCoin, isBuy: placed.side === 'buy', size: placed.sliceSize, limitPrice: prices[index], reduceOnly: false, tif: 'Alo', orderType: 'limit', commandId: dispatching.pendingChildCommandId });
		if (!ack.accepted || ack.venueOrderIds.length !== 1) return saveAndReturn({ ...transitionLocalAlgoJob(dispatching, ack.uncertain ? 'paused' : 'failed', ack.error ?? 'Swarm child placement failed'), pendingChildCommandId: ack.uncertain ? dispatching.pendingChildCommandId : undefined, pendingChildIndex: ack.uncertain ? dispatching.pendingChildIndex : undefined });
		placed = { ...dispatching, pendingChildCommandId: undefined, pendingChildIndex: undefined, slicesPlaced: index + 1, childOrderIds: [...dispatching.childOrderIds, ack.venueOrderIds[0]], updatedAt: Date.now() };
		save(placed);
	}
	if (placed.deadmanMs) { const deadman = await localExecution.armDeadman(placed.deadmanMs); if (!deadman.accepted) return saveAndReturn(transitionLocalAlgoJob(placed, 'failed', deadman.error ?? 'Dead-man switch could not be armed')); }
	return placed;
}

function saveAndReturn(job: LocalSwarmJob): LocalSwarmJob { save(job); return job; }

export async function startSwarm(market: MarketDescriptor, params: SwarmParams): Promise<{ ok: boolean; jobId?: string; error?: string }> {
	if (!get(walletAddress)) return { ok: false, error: 'Connect and unlock the local agent before starting Swarm' };
	if (get(selectedMarket)?.marketKey !== market.marketKey) return { ok: false, error: 'Select the Swarm market so its live book is authoritative' };
	if (params.size <= 0 || !Number.isInteger(params.orders) || params.orders < 1 || params.orders > 100) return { ok: false, error: 'Invalid Swarm size or order count' };
	const book = get(orderBook);
	const center = params.centerPrice ?? ((book.bids[0]?.price ?? 0) + (book.asks[0]?.price ?? 0)) / 2;
	if (!center || !Number.isFinite(center)) return { ok: false, error: 'Swarm requires a live best bid/ask or explicit center price' };
	const prices = buildSwarmPrices(params.side, center, params.spreadPct, params.orders);
	const crossing = params.side === 'buy' ? prices.some((price) => price >= (book.asks[0]?.price ?? Infinity)) : prices.some((price) => price <= (book.bids[0]?.price ?? -Infinity));
	if (crossing) return { ok: false, error: 'Post-only Swarm range would cross the current spread' };
	const job: LocalSwarmJob = {
		id: crypto.randomUUID(), type: 'swarm', marketKey: market.marketKey, apiCoin: market.apiCoin, assetId: market.assetId,
		side: params.side, totalSize: params.size, sliceSize: params.size / params.orders, slicesTotal: params.orders, slicesPlaced: 0,
		centerPrice: center, spreadPct: params.spreadPct, deadmanMs: params.deadmanMs, dispatchRecoveryVersion: 1, childOrderIds: [], status: 'running', createdAt: Date.now(), updatedAt: Date.now()
	};
	save(job);
	const placed = await placeRemaining(market, job);
	if (placed.status !== 'running' || placed.slicesPlaced !== placed.slicesTotal) return { ok: false, error: placed.error ?? 'Swarm child placement failed' };
	startTimer(placed.id);
	return { ok: true, jobId: placed.id };
}

export async function pauseSwarm(id: string): Promise<void> { const job = loadLocalAlgoJobs('swarm').find((candidate) => candidate.id === id); if (job) { stop(id); save(transitionLocalAlgoJob(job, 'paused')); } }
export async function resumeSwarm(id: string): Promise<void> { const job = loadLocalAlgoJobs('swarm').find((candidate) => candidate.id === id); if (!job || !['paused', 'failed'].includes(job.status) || job.restartRecoveryRequired) return; const recovered = recoverPendingDispatch(job); if (recovered.pendingChildCommandId) return; if (get(selectedMarket)?.marketKey !== recovered.marketKey) { save(transitionLocalAlgoJob(recovered, 'paused', 'Select the Swarm market before explicitly resuming remaining slices')); return; } const market = get(marketRegistry).find((candidate) => candidate.marketKey === recovered.marketKey); if (!market) return; const complete = await placeRemaining(market, { ...recovered, status: 'running', error: undefined, updatedAt: Date.now() }); if (complete.status === 'running' && complete.slicesPlaced === complete.slicesTotal) startTimer(id); }
export async function cancelSwarm(id: string, emergency = false): Promise<void> {
	const job = loadLocalAlgoJobs('swarm').find((candidate) => candidate.id === id); if (!job) return; stop(id);
	const liveChildIds = job.childOrderIds.filter((orderId) => get(openOrders).some((order) => order.id === orderId));
	const cancellation = await cancelAlgoChildren(liveChildIds, (orderId) => import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(orderId, job.apiCoin)));
	if (!cancellation.ok) { save(transitionLocalAlgoJob(job, 'paused', cancellation.error ?? 'Swarm cancellation requires reconciliation')); return; }
	if (!emergency && job.deadmanMs) {
		const cleared = await import('./localExecution').then(({ localExecution }) => localExecution.clearDeadman());
		if (!cleared.accepted) { save(transitionLocalAlgoJob(job, 'paused', cleared.error ?? 'Swarm dead-man clear requires reconciliation')); return; }
	}
	save(transitionLocalAlgoJob(job, emergency ? 'emergencyStopped' : 'cancelled', emergency ? 'Emergency stop requested' : undefined));
}
export function resumePersistedSwarms(): void { sync(); for (const job of loadLocalAlgoJobs('swarm').filter((candidate) => candidate.status === 'running')) { const recovered = recoverPendingDispatch(job); if (recovered.status === 'running' && recovered.slicesPlaced === recovered.slicesTotal) startTimer(recovered.id); } }
export function stopAllSwarmTimers(): void { for (const id of timers.keys()) stop(id); }
