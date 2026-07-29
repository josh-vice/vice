/** Serialize async state-machine ticks per persisted job. Without this guard,
 * a slow venue call can overlap the next interval and submit duplicate child
 * orders before the first acknowledgement is stored. */
export function createTickGuard() {
	const inFlight = new Set<string>();
	return {
		async run(id: string, task: () => Promise<void>): Promise<boolean> {
			if (inFlight.has(id)) return false;
			inFlight.add(id);
			try {
				await task();
				return true;
			} finally {
				inFlight.delete(id);
			}
		}
	};
}
