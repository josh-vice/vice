import { Effect } from 'effect';

/** Run venue read fan-outs in small batches so one shared Info API bucket is
 * not overwhelmed by core plus HIP-3 account/catalog slices. Results retain
 * the input order, which keeps venue identities deterministic.
 *
 * Effect owns the async boundary here: a rejected read fails the whole fan-out
 * without leaving later batches running, and the delay is interruption-safe.
 */
export function boundedReadMap<T, R>(
	items: T[],
	operation: (item: T) => Promise<R>,
	concurrency = 2,
	batchDelayMs = 50
): Promise<R[]> {
	const width = Math.max(1, Math.floor(concurrency));

	return Effect.runPromise(
		Effect.gen(function* () {
			const results: R[] = [];
			for (let start = 0; start < items.length; start += width) {
				if (start > 0 && batchDelayMs > 0) {
					yield* Effect.sleep(batchDelayMs);
				}
				const batch = items.slice(start, start + width);
				const values = yield* Effect.forEach(
					batch,
					(item) => Effect.tryPromise({ try: () => operation(item), catch: (error) => error }),
					{ concurrency: width }
				);
				results.push(...values);
			}
			return results;
		})
	);
}
