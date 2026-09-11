import { describe, expect, test } from 'bun:test';
import { createSessionCoordinator } from './sessionCoordinator';

const account = {
	accountKey: 'blofin:demo:account-1',
	venue: 'blofin',
	credentialRef: 'credential-1',
	accountMode: 'futures:demo'
};

const market = {
	marketKey: 'blofin:linearPerp:BTC-USDT',
	apiCoin: 'BTC-USDT',
	assetId: 1,
	kind: 'corePerp',
	dex: null,
	baseToken: 'BTC',
	quoteToken: 'USDT',
	szDecimals: 3,
	priceDecimals: 1,
	symbol: 'BTC-USDT',
	name: 'BTC-USDT',
	type: 'perp',
	lastPrice: 35000,
	instrument: {
		instrumentKey: 'blofin:linearPerp:BTC-USDT',
		venue: 'blofin',
		venueSymbol: 'BTC-USDT',
		product: 'linearPerp',
		baseAsset: 'BTC',
		quoteAsset: 'USDT',
		settlementAsset: 'USDT',
		contractMultiplier: '1',
		priceIncrement: '0.1',
		pricePrecision: { kind: 'fixedIncrement', increment: '0.1' },
		sizeIncrement: '0.001'
	}
};

function snapshotFor(receivedAtMs = 1) {
	return {
		account,
		orders: [],
		positions: [],
		fills: [],
		balances: [],
		receivedAtMs
	};
}

function target(overrides = {}) {
	return {
		venue: 'blofin',
		environment: 'demo',
		account,
		...overrides
	};
}

function makeAdapter(log, options = {}) {
	const publicEmitters = [];
	const privateRefreshers = [];
	let readCount = 0;

	const adapter = {
		id: 'blofin',
		capabilities: {},
		publicEmitters,
		privateRefreshers,
		get readCount() {
			return readCount;
		},
		async loadMarkets(environment, signal) {
			log.push(`load:${environment}`);
			if (options.loadMarkets) return options.loadMarkets(environment, signal);
			return [market];
		},
		async startPublic(session, selectedMarket, emit) {
			log.push(`start-public:${session.generation}:${selectedMarket.marketKey}`);
			publicEmitters.push(emit);
			return async () => {
				log.push(`stop-public:${session.generation}`);
			};
		},
		async readAccount(session, signal) {
			readCount += 1;
			log.push(`read-account:${session.generation}`);
			signal.addEventListener('abort', () => log.push(`abort-read:${session.generation}`), { once: true });
			if (options.readAccount) return options.readAccount(session, signal, readCount);
			return { ...snapshotFor(readCount), account: session.account };
		},
		async startPrivate(session, refresh) {
			log.push(`start-private:${session.generation}`);
			privateRefreshers.push(refresh);
			return async () => {
				log.push(`stop-private:${session.generation}`);
			};
		},
		async place() {
			throw new Error('not used');
		},
		async cancel() {
			throw new Error('not used');
		},
		async amend() {
			throw new Error('not used');
		}
	};
	return adapter;
}

function makeCoordinator(adapter, log, effects = {}) {
	return createSessionCoordinator({
		adapters: new Map([['blofin', adapter]]),
		effects: {
			clearState: () => log.push('clear-state'),
			selectMarket: (markets) => {
				log.push(`select-market:${markets[0].marketKey}`);
				return markets[0];
			},
			...effects
		}
	});
}

describe('atomic venue session coordination', () => {
	test('switches in teardown-to-start order and fences each generation', async () => {
		const log = [];
		const adapter = makeAdapter(log);
		const snapshots = [];
		const selected = [];
		const coordinator = makeCoordinator(adapter, log, {
			onAccountSnapshot: (value) => snapshots.push(value),
			onMarketSelected: (value) => selected.push(value)
		});

		await coordinator.switchTo(target());
		expect(log).toEqual([
			'clear-state',
			'load:demo',
			'select-market:blofin:linearPerp:BTC-USDT',
			'start-public:1:blofin:linearPerp:BTC-USDT',
			'read-account:1',
			'start-private:1'
		]);
		expect(coordinator.snapshot()).toMatchObject({
			status: 'live',
			generation: 1,
			session: { venue: 'blofin', environment: 'demo', account },
			market,
			accountSnapshot: snapshots[0]
		});
		expect(selected).toEqual([market]);

		log.length = 0;
		await coordinator.switchTo(target({ account: { ...account, accountKey: 'blofin:demo:account-2', credentialRef: 'credential-2' } }));
		expect(log).toEqual([
			'stop-private:1',
			'stop-public:1',
			'abort-read:1',
			'clear-state',
			'load:demo',
			'select-market:blofin:linearPerp:BTC-USDT',
			'start-public:2:blofin:linearPerp:BTC-USDT',
			'read-account:2',
			'start-private:2'
		]);
		expect(coordinator.snapshot().generation).toBe(2);
		expect(coordinator.snapshot().session.account.accountKey).toBe('blofin:demo:account-2');
	});

	test('ignores late public frames and private refresh triggers from an old generation', async () => {
		const log = [];
		const acceptedEvents = [];
		const committedSnapshots = [];
		const adapter = makeAdapter(log);
		const coordinator = makeCoordinator(adapter, log, {
			onPublicEvent: (event) => acceptedEvents.push(event),
			onAccountSnapshot: (snapshot) => committedSnapshots.push(snapshot)
		});

		await coordinator.switchTo(target());
		const oldEmit = adapter.publicEmitters[0];
		const oldRefresh = adapter.privateRefreshers[0];
		oldEmit({ dedupeKey: 'old-before-switch' });
		expect(acceptedEvents).toHaveLength(1);

		await coordinator.switchTo(target({ environment: 'testnet' }));
		const newEmit = adapter.publicEmitters[1];
		const newRefresh = adapter.privateRefreshers[1];
		oldEmit({ dedupeKey: 'old-after-switch' });
		await oldRefresh();
		newEmit({ dedupeKey: 'new-after-switch' });
		await newRefresh();

		expect(acceptedEvents.map((event) => event.dedupeKey)).toEqual(['old-before-switch', 'new-after-switch']);
		expect(adapter.readCount).toBe(3);
		expect(committedSnapshots).toHaveLength(3);
		expect(coordinator.snapshot()).toMatchObject({ generation: 2, status: 'live' });
	});

	test('serializes rapid switches behind the active transition', async () => {
		const log = [];
		let releaseFirstLoad;
		let loadCount = 0;
		const adapter = makeAdapter(log, {
			loadMarkets: async () => {
				loadCount += 1;
				if (loadCount === 1) await new Promise((resolve) => (releaseFirstLoad = resolve));
				return [market];
			}
		});
		const coordinator = makeCoordinator(adapter, log);

		const first = coordinator.switchTo(target());
		const second = coordinator.switchTo(target({ environment: 'testnet' }));
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(loadCount).toBe(1);
		releaseFirstLoad();
		await first;
		await second;

		expect(loadCount).toBe(2);
		expect(coordinator.snapshot()).toMatchObject({ generation: 2, session: { environment: 'testnet' } });
		expect(log.indexOf('stop-private:1')).toBeGreaterThan(log.indexOf('start-private:1'));
		expect(log.indexOf('load:demo')).toBeLessThan(log.indexOf('load:testnet'));
	});

	test('fails closed when bootstrapping the new session fails', async () => {
		const log = [];
		const adapter = makeAdapter(log, {
			readAccount: async (_session, _signal, count) => {
				if (count === 1) throw new Error('account unavailable');
				return snapshotFor(count);
			}
		});
		const coordinator = makeCoordinator(adapter, log);

		await expect(coordinator.switchTo(target())).rejects.toThrow('account unavailable');
		expect(coordinator.snapshot()).toMatchObject({ status: 'error', session: null, market: null, accountSnapshot: null });
		expect(log).not.toContain('start-private:1');
	});
});
