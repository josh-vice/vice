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
	if (error || partial) {
		const uncertain = venueOrderIds.length > 0;
		return {
			status: uncertain ? 'uncertain' : 'rejected',
			accepted: false,
			uncertain,
			error: partial
				? `Partial venue acceptance (${venueOrderIds.length}/${expectedOrderCount}); ${error ?? 'authoritative child status is required'}`
				: error
		};
	}
	return { status: 'accepted', accepted: true, uncertain: false };
}
