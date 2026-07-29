import { describe, expect, test } from 'bun:test';
import { clearLocalAlgoJobs, loadLocalAlgoJobs, pauseRestartUnsafeLocalAlgoJobs, persistLocalAlgoJobs, setLocalAlgoOwner, transitionLocalAlgoJob } from './algoJobs';

const job = { id: 'j', type: 'chase', marketKey: 'hl:perp:BTC', apiCoin: 'BTC', assetId: 0, side: 'buy', totalSize: 1, remainingSize: 1, offsetTicks: 1, maxChases: 3, chases: 0, childOrderIds: [], status: 'running', createdAt: 1, updatedAt: 1 };
const iceberg = { id: 'i', type: 'iceberg', marketKey: 'hl:perp:ETH', apiCoin: 'ETH', assetId: 1, side: 'sell', totalSize: 3, remainingSize: 3, displaySize: 1, price: 2000, filledSize: 0, childOrderIds: [], status: 'running', createdAt: 2, updatedAt: 2 };
const recoverableIceberg = { ...iceberg, id: 'ri', dispatchRecoveryVersion: 1 };
const swarm = { id: 's', type: 'swarm', marketKey: 'hl:perp:SOL', apiCoin: 'SOL', assetId: 2, side: 'buy', totalSize: 2, sliceSize: 0.5, slicesTotal: 4, slicesPlaced: 4, centerPrice: 100, spreadPct: 1, childOrderIds: ['1'], status: 'running', createdAt: 3, updatedAt: 3 };
const pingPong = { id: 'p', type: 'ping_pong', marketKey: 'hl:perp:AVAX', apiCoin: 'AVAX', assetId: 3, totalSize: 1, cycles: 2, completedLegs: 1, rangePct: 1, pauseMs: 100, centerPrice: 20, nextSide: 'sell', childOrderIds: ['2'], status: 'running', createdAt: 4, updatedAt: 4 };
const oco = { id: 'o', type: 'oco', marketKey: 'hl:perp:BTC', apiCoin: 'BTC', assetId: 0, side: 'sell', size: 1, takeProfit: 110, stopLoss: 90, childOrderIds: ['3', '4'], deadmanMs: 30000, status: 'running', createdAt: 5, updatedAt: 5 };
const recoverableOco = { ...oco, id: 'ro', dispatchRecoveryVersion: 1 };
const scale = { id: 'sc', type: 'scale', marketKey: 'hl:perp:BTC', apiCoin: 'BTC', assetId: 0, side: 'buy', totalSize: 2, startPrice: 90, endPrice: 110, levels: 5, skew: 1, postOnly: true, reduceOnly: false, filledSize: 0, childOrderIds: ['5', '6'], deadmanMs: 30000, status: 'running', createdAt: 6, updatedAt: 6 };
const trailing = { id: 't', type: 'trailing', marketKey: 'hl:perp:BTC', apiCoin: 'BTC', assetId: 0, side: 'sell', size: 1, offset: 2, peakOrTrough: 100, dispatchRecoveryVersion: 1, childOrderIds: ['7'], status: 'running', createdAt: 7, updatedAt: 7 };
const legacyTrailing = { ...trailing, id: 'lt', dispatchRecoveryVersion: undefined };

describe('US-004 local algo lifecycle', () => {
	test('supports pause, terminal cancel, and emergency stop as explicit states', () => {
		expect(transitionLocalAlgoJob(job, 'paused').status).toBe('paused');
		expect(transitionLocalAlgoJob(job, 'cancelled').status).toBe('cancelled');
		expect(transitionLocalAlgoJob(job, 'emergencyStopped', 'dead-man switch armed').error).toBe('dead-man switch armed');
	});

	test('scopes persisted jobs to the unlocked account', () => {
		const storage = new Map();
		globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
		setLocalAlgoOwner('0x0000000000000000000000000000000000000001');
		persistLocalAlgoJobs([job]);
		setLocalAlgoOwner('0x0000000000000000000000000000000000000002');
		expect(loadLocalAlgoJobs()).toEqual([]);
		setLocalAlgoOwner('0x0000000000000000000000000000000000000001');
		expect(loadLocalAlgoJobs()).toHaveLength(1);
		clearLocalAlgoJobs();
		setLocalAlgoOwner(null);
	});

	test('persists Iceberg jobs with exact type filtering and lifecycle state', () => {
		const storage = new Map();
		globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
		setLocalAlgoOwner('0x0000000000000000000000000000000000000003');
		persistLocalAlgoJobs([iceberg]);
		expect(loadLocalAlgoJobs('iceberg')).toHaveLength(1);
		expect(loadLocalAlgoJobs('iceberg')[0].remainingSize).toBe(3);
		expect(transitionLocalAlgoJob(iceberg, 'paused').status).toBe('paused');
		clearLocalAlgoJobs();
		setLocalAlgoOwner(null);
	});

	test('retains Swarm and Ping-Pong progress after reload', () => {
		const storage = new Map();
		globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
		setLocalAlgoOwner('0x0000000000000000000000000000000000000004');
		persistLocalAlgoJobs([swarm, pingPong]);
		expect(loadLocalAlgoJobs('swarm')[0].slicesPlaced).toBe(4);
		expect(loadLocalAlgoJobs('ping_pong')[0].nextSide).toBe('sell');
		clearLocalAlgoJobs();
		setLocalAlgoOwner(null);
	});

	test('persists OCO dead-man configuration with exact child state', () => {
		const storage = new Map();
		globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
		setLocalAlgoOwner('0x0000000000000000000000000000000000000005');
		persistLocalAlgoJobs([oco]);
		const restored = loadLocalAlgoJobs('oco')[0];
		expect(restored.deadmanMs).toBe(30000);
		expect(restored.childOrderIds).toEqual(['3', '4']);
		clearLocalAlgoJobs();
		setLocalAlgoOwner(null);
	});

	test('persists Scale child identity and progress across reload', () => {
		const storage = new Map();
		globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
		setLocalAlgoOwner('0x0000000000000000000000000000000000000006');
		persistLocalAlgoJobs([scale]);
		const restored = loadLocalAlgoJobs('scale')[0];
		expect(restored.childOrderIds).toEqual(['5', '6']);
		expect(restored.filledSize).toBe(0);
		expect(transitionLocalAlgoJob(restored, 'paused').status).toBe('paused');
		clearLocalAlgoJobs();
		setLocalAlgoOwner(null);
	});

	test('pauses only restart-unsafe local strategies while preserving journal-recoverable strategies', () => {
		const storage = new Map();
		globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
		setLocalAlgoOwner('0x0000000000000000000000000000000000000007');
		persistLocalAlgoJobs([job, scale, trailing, legacyTrailing, iceberg, recoverableIceberg, oco, recoverableOco]);
		const recovered = pauseRestartUnsafeLocalAlgoJobs();
		expect(recovered.find((candidate) => candidate.id === iceberg.id)).toMatchObject({ status: 'paused', restartRecoveryRequired: true });
		expect(recovered.find((candidate) => candidate.id === job.id)).toMatchObject({ status: 'running' });
		expect(recovered.find((candidate) => candidate.id === trailing.id)).toMatchObject({ status: 'running' });
		expect(recovered.find((candidate) => candidate.id === legacyTrailing.id)).toMatchObject({ status: 'paused', restartRecoveryRequired: true });
		expect(recovered.find((candidate) => candidate.id === recoverableIceberg.id)).toMatchObject({ status: 'running' });
		expect(recovered.find((candidate) => candidate.id === oco.id)).toMatchObject({ status: 'paused', restartRecoveryRequired: true });
		expect(recovered.find((candidate) => candidate.id === recoverableOco.id)).toMatchObject({ status: 'running' });
		const preservedScale = recovered.find((candidate) => candidate.id === scale.id);
		expect(preservedScale).toMatchObject({ status: 'running' });
		expect(preservedScale).not.toHaveProperty('restartRecoveryRequired');
		clearLocalAlgoJobs();
		setLocalAlgoOwner(null);
	});
});
