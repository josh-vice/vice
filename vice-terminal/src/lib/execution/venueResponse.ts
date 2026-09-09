import { parseVenueError } from './venueErrors';

export type VenueOrderStatus =
	| string
	| { error: string }
	| { resting: { oid: number | string } }
	| { filled: { oid: number | string } };

export type VenueOrderResponse = {
	response: {
		data: {
			statuses: VenueOrderStatus[];
		};
	};
};

export type VenueCancelStatus = 'success' | { error: string };
export type VenueCancelResponse = {
	response?: { data?: { statuses?: VenueCancelStatus[] } };
};

/**
 * Hyperliquid returns an error status (rather than rejecting the request) when
 * a cancel races a fill or an earlier cancel. Those are terminal, reconciled
 * outcomes: the target is no longer an open venue order and must not keep an
 * algorithm paused as though cancellation failed.
 */
export function venueCancelOutcome(response: VenueCancelResponse): { accepted: boolean; reconciled: boolean; uncertain?: boolean; error?: string } {
	const statuses = response.response?.data?.statuses;
	if (!Array.isArray(statuses) || statuses.length !== 1) {
		return { accepted: false, reconciled: false, uncertain: true, error: 'Cancel response did not contain exactly one authoritative status' };
	}
	const status = statuses[0];
	if (status === 'success') return { accepted: true, reconciled: false };
	if (typeof status !== 'object' || status === null || typeof status.error !== 'string') {
		return { accepted: false, reconciled: false, uncertain: true, error: 'Cancel response did not contain exactly one authoritative status' };
	}
	if (/never placed|already canceled|already cancelled|filled/i.test(status.error)) {
		return { accepted: true, reconciled: true };
	}
	return { accepted: false, reconciled: false, error: parseVenueError(status.error).message };
}

export function venueIds(response: VenueOrderResponse): string[] {
	return response.response.data.statuses.flatMap((status) => {
		if (typeof status === 'string' || 'error' in status) return [];
		if ('resting' in status) return [String(status.resting.oid)];
		return [String(status.filled.oid)];
	});
}

export function venueError(response: VenueOrderResponse): string | undefined {
	for (const status of response.response.data.statuses) {
		if (typeof status !== 'string' && 'error' in status) return parseVenueError(status.error).message;
	}
	return undefined;
}

/**
 * A normalTpsl parent order returns `waitingForFill`/`waitingForTrigger` for
 * its linked TP/SL children until the parent fills. Those are accepted child
 * states, not a partial transport response.
 */
export function venueResponseHasAcceptedPendingStatuses(
	response: VenueOrderResponse,
	expectedOrderCount: number,
	venueOrderIds: string[]
): boolean {
	const statuses = response.response.data.statuses;
	return venueOrderIds.length > 0 && statuses.length === expectedOrderCount && statuses.every((status) =>
		typeof status === 'string'
			? status === 'waitingForFill' || status === 'waitingForTrigger'
			: !('error' in status)
	);
}
