/**
 * A returned venue id is only a complete proof when every expected child slot
 * has a corresponding venue id. This prevents a partial batch acknowledgement
 * from being mistaken for a fully reconciled command after a browser restart.
 */
export function venueIdsProveComplete(
	knownVenueOrderIds: string[],
	expectedCloids: string[],
	projectedVenueOrderIds: string[]
): boolean {
	if (expectedCloids.length === 0 || knownVenueOrderIds.length !== expectedCloids.length) return false;
	const projected = new Set(projectedVenueOrderIds.map((id) => String(id)));
	return knownVenueOrderIds.every((id) => projected.has(String(id)));
}
