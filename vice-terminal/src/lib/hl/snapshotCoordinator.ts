/** Serialize authoritative snapshots while coalescing event bursts. */
export function createSnapshotCoordinator<T>(run: () => Promise<T>): { request: () => Promise<T>; reset: () => void } {
	type Cycle = { promise: Promise<T>; rerunRequested: boolean };
	let active: Cycle | null = null;

	const request = (): Promise<T> => {
		if (active) {
			active.rerunRequested = true;
			return active.promise;
		}

		const state = { promise: Promise.resolve(undefined as T), rerunRequested: true } as Cycle;
		state.promise = (async () => {
			let result: T;
			do {
				state.rerunRequested = false;
				result = await run();
			} while (state.rerunRequested);
			return result;
		})().finally(() => {
			if (active === state) active = null;
		});
		active = state;
		return state.promise;
	};

	return {
		request,
		// Detach the current cycle. Its response is still guarded by the
		// account generation in the caller, so a new wallet may reconcile
		// independently without inheriting a stale promise.
		reset: () => {
			active = null;
		}
	};
}
