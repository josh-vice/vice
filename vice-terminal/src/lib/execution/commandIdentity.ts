const SEQUENCE_PREFIX = 'vice.execution.sequence.v1';
const sequenceQueues = new Map<string, Promise<void>>();

type LockManagerLike = {
	request<T>(name: string, options: { mode: 'exclusive' }, callback: () => Promise<T>): Promise<T>;
};

export function sequenceStorageKey(network: string, account: string): string {
	return `${SEQUENCE_PREFIX}:${network}:${account.toLowerCase()}`;
}

export function nextPersistedSequence(
	network: string,
	account: string,
	current: number,
	storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage
): number {
	try {
		const stored = Number(storage?.getItem(sequenceStorageKey(network, account)) ?? 0);
		const next = Math.max(Number.isSafeInteger(stored) ? stored : 0, Number.isSafeInteger(current) ? current : 0) + 1;
		if (storage) storage.setItem(sequenceStorageKey(network, account), String(next));
		return next;
	} catch {
		return (Number.isSafeInteger(current) ? current : 0) + 1;
	}
}

/** Reserve a sequence atomically across tabs when Web Locks is available. */
export async function reservePersistedSequence(
	network: string,
	account: string,
	current: number,
	storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage
): Promise<number> {
	if (!storage) throw new Error('Persistent execution sequence storage is unavailable');
	const key = sequenceStorageKey(network, account);
	const run = async (): Promise<number> => {
		const reserve = async (): Promise<number> => {
			const stored = Number(storage.getItem(key) ?? 0);
			const base = Math.max(Number.isSafeInteger(stored) ? stored : 0, Number.isSafeInteger(current) ? current : 0);
			const next = base + 1;
			if (!Number.isSafeInteger(next)) throw new Error('Execution sequence exhausted');
			storage.setItem(key, String(next));
			return next;
		};
		const locks = (globalThis as typeof globalThis & { navigator?: { locks?: LockManagerLike } }).navigator?.locks;
		return locks ? locks.request(key, { mode: 'exclusive' }, reserve) : reserve();
	};
	const previous = sequenceQueues.get(key) ?? Promise.resolve();
	const currentRun = previous.catch(() => undefined).then(run);
	const queuedRun = currentRun.then(() => undefined, () => undefined);
	sequenceQueues.set(key, queuedRun);
	try {
		return await currentRun;
	} finally {
		if (sequenceQueues.get(key) === queuedRun) sequenceQueues.delete(key);
	}
}

/** Hyperliquid cloids are 16-byte hex values; sequence+slot is stable across transport retries. */
export function deterministicCloid(sequence: number, slot = 0): `0x${string}` {
	if (!Number.isSafeInteger(sequence) || sequence < 1 || !Number.isSafeInteger(slot) || slot < 0 || slot > 255) throw new Error('Invalid command identity');
	const value = BigInt(sequence) * 256n + BigInt(slot);
	return `0x${value.toString(16).padStart(32, '0')}` as `0x${string}`;
}
