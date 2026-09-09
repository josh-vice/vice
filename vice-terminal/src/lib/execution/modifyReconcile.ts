/**
 * Shared primitives for reconciling a modify against the authoritative venue
 * post-state. Hyperliquid `modify` REPLACES the order with a new oid and
 * returns `{type:"default"}` with no statuses, so the transport call alone is
 * not proof the price change was applied. Reconciliation must read the
 * authoritative frontend open-order projection and confirm BOTH identity (the
 * deterministic cloid carried by the replacement) and the applied price.
 */

export interface AuthoritativeOrder {
	oid: number | string;
	cloid?: string | null;
	limitPx?: string;
	triggerPx?: string;
	isTrigger?: boolean;
	coin?: string;
}

export type ModifyReconciliationStatus = 'applied' | 'rejected' | 'uncertain';

export interface ModifyReconciliation {
	status: ModifyReconciliationStatus;
	/** The authoritative order id that currently rests after the modify. */
	orderId?: string;
	/** The venue-returned price field after the modify (canonical string). */
	price?: string;
	reason?: string;
}

/**
 * Compare a venue-returned price string against a locally formatted target.
 * The venue canonicalizes prices (e.g. `"53847.0"` for an integer BTC price)
 * while `formatVenuePrice` trims trailing zeros (`"53847"`). A raw string
 * equality therefore mis-reports an APPLIED modify as rejected/uncertain.
 * Normalize both sides to a canonical decimal form before comparing.
 */
export function venuePriceEqual(
	left: string | number | undefined,
	right: string | number | undefined
): boolean {
	if (left === undefined || right === undefined) return false;
	return canonicalPrice(left) === canonicalPrice(right);
}

function canonicalPrice(value: string | number): string {
	const s = String(value);
	if (s.indexOf('.') < 0) return s;
	// Strip trailing zeros and a trailing decimal point ("53847.0" -> "53847").
	return s.replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * Classify the outcome of a modify against the authoritative open-order
 * projection:
 *   - `applied`: the deterministic modify cloid is present and its price field
 *     matches the requested target -> record the NEW order id.
 *   - `rejected`: the modify cloid is absent AND the original order is still
 *     resting (unchanged) -> the venue did not apply the change. Deterministic.
 *   - `uncertain`: neither the modify cloid nor the original order is visible
 *     (transport/lost read) -> must be kept unresolved, never marked accepted.
 */
export function reconcileModifyPostState(opts: {
	modifyCloid?: string | null;
	targetField: 'limitPx' | 'triggerPx';
	targetPrice: string;
	oldOrderId: string | number;
	orders: AuthoritativeOrder[];
}): ModifyReconciliation {
	const wanted = opts.modifyCloid?.toLowerCase();
	const replacement = opts.orders.find(
		(order) => order.cloid && order.cloid.toLowerCase() === wanted
	);
	if (replacement) {
		const actual = opts.targetField === 'triggerPx' ? replacement.triggerPx : replacement.limitPx;
		if (venuePriceEqual(actual, opts.targetPrice)) {
			return {
				status: 'applied',
				orderId: String(replacement.oid),
				price: actual === undefined ? opts.targetPrice : canonicalPrice(actual)
			};
		}
		return {
			status: 'rejected',
			orderId: String(replacement.oid),
			price: actual === undefined ? undefined : canonicalPrice(actual),
			reason: `Order found by cloid but ${opts.targetField} did not match the requested target`
		};
	}

	const original = opts.orders.find((order) => String(order.oid) === String(opts.oldOrderId));
	if (original) {
		const oldPrice = opts.targetField === 'triggerPx' ? original.triggerPx : original.limitPx;
		return {
			status: 'rejected',
			orderId: String(original.oid),
			price: oldPrice === undefined ? undefined : canonicalPrice(oldPrice),
			reason: 'Original order is still resting unchanged; the modify was not applied'
		};
	}

	return {
		status: 'uncertain',
		reason: 'Neither the modify cloid nor the original order is visible in the authoritative projection'
	};
}
