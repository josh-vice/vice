export type ChildCancelResult = { ok: boolean; error?: string };

/**
 * A local algorithm may only enter a terminal cancelled state after every
 * known live child has an accepted/reconciled cancellation outcome. Missing
 * acknowledgements are deliberately surfaced to the caller as uncertainty.
 */
export async function cancelAlgoChildren(
	orderIds: Array<string | undefined>,
	cancel: (orderId: string) => Promise<ChildCancelResult>
): Promise<ChildCancelResult> {
	let firstError: string | undefined;
	for (const orderId of orderIds.filter((value): value is string => Boolean(value))) {
		try {
			const result = await cancel(orderId);
			if (!result.ok) firstError ??= result.error ?? `Child order ${orderId} cancellation was not confirmed`;
		} catch (error) {
			firstError ??= error instanceof Error ? error.message : `Child order ${orderId} cancellation was not confirmed`;
		}
	}
	return firstError ? { ok: false, error: firstError } : { ok: true };
}
