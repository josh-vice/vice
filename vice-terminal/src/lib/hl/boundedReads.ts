/** Run venue read fan-outs in small batches so one shared Info API bucket is
 * not overwhelmed by core plus HIP-3 account/catalog slices. Results retain
 * the input order, which keeps venue identities deterministic. */
export async function boundedReadMap<T, R>(
	items: T[],
	operation: (item: T) => Promise<R>,
	concurrency = 2,
	batchDelayMs = 50
): Promise<R[]> {
	const width = Math.max(1, Math.floor(concurrency));
	const results: R[] = [];
	for (let start = 0; start < items.length; start += width) {
		const batch = items.slice(start, start + width);
		results.push(...(await Promise.all(batch.map(operation))));
		if (start + width < items.length && batchDelayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
		}
	}
	return results;
}
