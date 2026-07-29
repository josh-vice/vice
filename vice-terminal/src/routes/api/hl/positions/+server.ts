import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchHlPositions } from '$lib/hl/server';

export const GET: RequestHandler = async ({ url }) => {
	const address = url.searchParams.get('address');
	if (!address) throw error(400, 'address query param required');

	try {
		const positions = await fetchHlPositions(address);
		return json({ positions });
	} catch (e) {
		throw error(500, e instanceof Error ? e.message : 'Failed to fetch positions');
	}
};
