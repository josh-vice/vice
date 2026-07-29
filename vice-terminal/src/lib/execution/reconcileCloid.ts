export interface CloidReconciliationRecord {
	cloid?: string | null;
	oid: string | number;
}

export interface CloidReconciliation {
	found: boolean;
	complete: boolean;
	accepted: boolean;
	orderIds: string[];
	matchedCloids: string[];
}

/**
 * Match a lost-ack command against authoritative open orders and fills.
 * Hyperliquid's orderStatus endpoint accepts a numeric venue oid, not a cloid;
 * reconciliation must therefore search the account projections by cloid.
 */
export function reconcileCloids(
	cloids: string[],
	openOrders: CloidReconciliationRecord[],
	fills: CloidReconciliationRecord[]
): CloidReconciliation {
	const wanted = new Set(cloids.map((cloid) => cloid.toLowerCase()));
	const matches = [...openOrders, ...fills]
		.filter((record) => record.cloid && wanted.has(record.cloid.toLowerCase()));
	const orderIds = matches.map((record) => String(record.oid));
	const matchedCloids = [...new Set(matches.map((record) => record.cloid!.toLowerCase()))];
	return {
		found: orderIds.length > 0,
		complete: wanted.size > 0 && matchedCloids.length >= wanted.size,
		accepted: orderIds.length > 0,
		orderIds: [...new Set(orderIds)],
		matchedCloids
	};
}
