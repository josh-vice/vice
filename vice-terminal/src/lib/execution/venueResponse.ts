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
