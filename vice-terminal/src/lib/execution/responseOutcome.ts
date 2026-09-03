export type VenueResponseJournalStatus = 'accepted' | 'rejected' | 'uncertain';

export type VenueResponseOutcome = {
	status: VenueResponseJournalStatus;
	accepted: boolean;
	uncertain: boolean;
	error?: string;
};

/**
 * A batched venue action is not safely rejected when any child was accepted.
 * Keep the journal unresolved until the authoritative open-order/fill
 * projection proves the final state; otherwise the next mutation could race
 * an already-live child and violate the duplicate/uncertainty boundary.
 */
export function classifyVenueResponse(
	error: string | undefined,
	venueOrderIds: string[],
	expectedOrderCount: number
): VenueResponseOutcome {
	const partial = venueOrderIds.length > 0 && venueOrderIds.length < expectedOrderCount;
	const countMismatch = venueOrderIds.length !== expectedOrderCount;
	if (error || countMismatch) {
		// An empty, non-error response is not proof of rejection: the venue may
		// have accepted a child while the response was truncated. Conversely,
		// extra IDs are also unsafe to treat as a complete expected batch.
		const uncertain = venueOrderIds.length > 0 || !error;
		return {
			status: uncertain ? 'uncertain' : 'rejected',
			accepted: false,
			uncertain,
			error: partial
				? `Partial venue acceptance (${venueOrderIds.length}/${expectedOrderCount}); ${error ?? 'authoritative child status is required'}`
				: error ?? (countMismatch
					? `Venue response contained ${venueOrderIds.length}/${expectedOrderCount} venue order ids; authoritative child status is required`
					: undefined)
		};
	}
	return { status: 'accepted', accepted: true, uncertain: false };
}
