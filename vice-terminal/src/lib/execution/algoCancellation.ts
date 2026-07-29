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
	for (const orderId of orderIds.filter((value): value is string => Boolean(value))) {
		const result = await cancel(orderId);
		if (!result.ok) return { ok: false, error: result.error ?? `Child order ${orderId} cancellation was not confirmed` };
	}
	return { ok: true };
}
