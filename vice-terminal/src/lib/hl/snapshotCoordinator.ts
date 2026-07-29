/** Serialize authoritative snapshots while coalescing event bursts. */
export function createSnapshotCoordinator(run: () => Promise<void>): { request: () => Promise<void>; reset: () => void } {
	type Cycle = { promise: Promise<void>; rerunRequested: boolean };
	let active: Cycle | null = null;

	const request = (): Promise<void> => {
		if (active) {
			active.rerunRequested = true;
			return active.promise;
		}

		const state = { promise: Promise.resolve(), rerunRequested: true } as Cycle;
		state.promise = (async () => {
			do {
				state.rerunRequested = false;
				await run();
			} while (state.rerunRequested);
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
