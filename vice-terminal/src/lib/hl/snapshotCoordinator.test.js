import { describe, expect, test } from 'bun:test';
import { createSnapshotCoordinator } from './snapshotCoordinator';

describe('US-002 account snapshot reconciliation', () => {
	test('serializes bursts and performs one follow-up for events during a request', async () => {
		let resolveFirst;
		let calls = 0;
		const first = new Promise((resolve) => (resolveFirst = resolve));
		const coordinator = createSnapshotCoordinator(async () => {
			calls += 1;
			if (calls === 1) await first;
		});

		const active = coordinator.request();
		const sameCycle = coordinator.request();
		expect(active).toBe(sameCycle);
		resolveFirst();
		await active;
		expect(calls).toBe(2);
	});

	test('allows a fresh recovery request after a rejected cycle', async () => {
		let calls = 0;
		const coordinator = createSnapshotCoordinator(async () => {
			calls += 1;
			if (calls === 1) throw new Error('temporary snapshot failure');
		});

		await expect(coordinator.request()).rejects.toThrow('temporary snapshot failure');
		await coordinator.request();
		expect(calls).toBe(2);
	});

	test('reset detaches an old in-flight cycle for a new account', async () => {
		let resolveOld;
		let calls = 0;
		const old = new Promise((resolve) => (resolveOld = resolve));
		const coordinator = createSnapshotCoordinator(async () => {
			calls += 1;
			if (calls === 1) await old;
		});

		const oldCycle = coordinator.request();
		coordinator.reset();
		const newCycle = coordinator.request();
		await newCycle;
		resolveOld();
		await oldCycle;
		expect(calls).toBe(2);
	});

	test('account subscriptions include authoritative perp and spot state streams', async () => {
		const source = await Bun.file(new URL('./account.ts', import.meta.url)).text();
		expect(source).toContain('client.allDexsClearinghouseState');
		expect(source).toContain('client.spotState');
		expect(source).toContain('activeAssetData');
		expect(source).toContain('setActiveAccountAsset');
		expect(source).toContain('activeAssetGeneration');
		expect(source).toContain('generation !== activeAssetGeneration');
		expect(source).toContain('activeAssetSyncStatus.set(\'error\')');
		expect(source).toContain('account snapshot remains authoritative');
		expect(source).toContain('refreshing a snapshot alone would leave active-asset');
		expect(source).toContain('scheduleSubscriptionRecovery(address);');
		const navbar = await Bun.file(new URL('../components/Navbar.svelte', import.meta.url)).text();
		expect(navbar).toContain('activeAssetSyncStatus');
		expect(navbar).toContain('ASSET {healthLabel($activeAssetSyncStatus)}');
		expect(source).toContain('generation-safe snapshot coordinator');
		expect(source).toContain('subscriptions = [ordersSub, fillsSub, twapsSub, clearinghouseSub, spotStateSub]');
		expect(source).toContain('A transient Info API failure must not prevent the WebSocket recovery path');
		const stores = await Bun.file(new URL('../stores.ts', import.meta.url)).text();
		expect(stores).not.toContain("const { fetchOpenOrders, fetchPositions } = await import('./hl/orders');");
	});
});
