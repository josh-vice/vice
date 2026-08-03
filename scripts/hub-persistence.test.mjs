import { describe, expect, test } from 'bun:test';

function storage(initial = {}) {
	const values = new Map(Object.entries(initial));
	return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}

function memoryIndexedDb(initial = {}) {
	const stores = new Map(Object.entries(initial).map(([name, entries]) => [name, new Map(Object.entries(entries))]));
	const db = {
		objectStoreNames: { contains: (name) => stores.has(name) },
		createObjectStore(name) { stores.set(name, new Map()); },
		close() {},
		transaction(names) {
			const tx = {
				oncomplete: undefined,
				onerror: undefined,
				onabort: undefined,
				objectStore(name) {
					const store = stores.get(name);
					return {
						get(id) {
							const request = {};
							queueMicrotask(() => { request.result = store?.get(id); request.onsuccess?.(); });
							return request;
						},
						put(value) {
							store.set(value.id, value);
							queueMicrotask(() => tx.oncomplete?.());
						}
					};
				}
			};
			return tx;
		}
	};
	return {
		open() {
			const request = {};
			queueMicrotask(() => {
				request.result = db;
				request.onupgradeneeded?.();
				request.onsuccess?.();
			});
			return request;
		},
		stores
	};
}

async function loadPersistence({ local = {}, records = {} } = {}) {
	const localStorage = storage(local);
	const indexedDB = memoryIndexedDb(records);
	const window = { indexedDB };
	const source = await Bun.file(new URL('../vice-terminal/static/legacy/hub-persistence.js', import.meta.url)).text();
	new Function('window', 'localStorage', 'indexedDB', 'setTimeout', 'clearTimeout', source)(window, localStorage, indexedDB, setTimeout, clearTimeout);
	await window.viceHubRestorePromise;
	return { window, localStorage, indexedDB };
}

describe('Hub IndexedDB migration', () => {
	test('restores a valid mirror only when the legacy local record is absent', async () => {
		const raw = JSON.stringify({ v: 1, active: 'DeFi', layouts: { DeFi: { grid: [] } } });
		const restored = await loadPersistence({ records: { hubLayouts: { 'legacy-v1': { id: 'legacy-v1', raw } }, migrations: {} } });
		expect(restored.localStorage.getItem('viceHub.v1')).toBe(raw);

		const present = await loadPersistence({ local: { 'viceHub.v1': 'not-valid-but-present' }, records: { hubLayouts: { 'legacy-v1': { id: 'legacy-v1', raw } }, migrations: {} } });
		expect(present.localStorage.getItem('viceHub.v1')).toBe('not-valid-but-present');
	});

	test('mirrors only a valid legacy layout payload', async () => {
		const state = await loadPersistence();
		const raw = JSON.stringify({ v: 1, active: 'DeFi', layouts: { DeFi: { grid: [] } } });
		state.window.viceHubPersistMirror(raw);
		await Bun.sleep(350);
		expect(state.indexedDB.stores.get('hubLayouts').get('legacy-v1').raw).toBe(raw);
		state.window.viceHubPersistMirror('{bad');
		await Bun.sleep(350);
		expect(state.indexedDB.stores.get('hubLayouts').get('legacy-v1').raw).toBe(raw);
	});

	test('rolls back to the previous validated raw when the newest mirror record is corrupt', async () => {
		const first = JSON.stringify({ v: 1, active: 'DeFi', layouts: { DeFi: { grid: [] } } });
		const state = await loadPersistence({
			records: { hubLayouts: { 'legacy-v1': { id: 'legacy-v1', raw: '{bad', previousRaw: first } }, migrations: {} }
		});
		expect(state.localStorage.getItem('viceHub.v1')).toBe(first);
		const record = state.indexedDB.stores.get('hubLayouts').get('legacy-v1');
		expect(record.quarantined).toBe(true);
		expect(record.quarantineReason).toBe('corrupt-raw-fallback');
		expect(record.raw).toBe('{bad');
	});

	test('a corrupt mirror with no valid previous raw starts safely without a restore', async () => {
		const state = await loadPersistence({
			records: { hubLayouts: { 'legacy-v1': { id: 'legacy-v1', raw: '{bad' } }, migrations: {} }
		});
		expect(state.localStorage.getItem('viceHub.v1')).toBeNull();
	});

	test('keeps the last validated raw for rollback across successive mirrors', async () => {
		const state = await loadPersistence();
		const first = JSON.stringify({ v: 1, active: 'DeFi', layouts: { DeFi: { grid: [] } } });
		const second = JSON.stringify({ v: 1, active: 'Spot', layouts: { Spot: { grid: [] } } });
		state.window.viceHubPersistMirror(first);
		await Bun.sleep(350);
		state.window.viceHubPersistMirror(second);
		await Bun.sleep(350);
		const record = state.indexedDB.stores.get('hubLayouts').get('legacy-v1');
		expect(record.raw).toBe(second);
		expect(record.previousRaw).toBe(first);
	});
});
