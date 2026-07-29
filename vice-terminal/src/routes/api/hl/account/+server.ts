import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchHlAccountSnapshot } from '$lib/hl/server';

export const GET: RequestHandler = async ({ url }) => {
	const address = url.searchParams.get('address');
	if (!address) throw error(400, 'address query param required');
	try {
		return json(await fetchHlAccountSnapshot(address));
	} catch (cause) {
		throw error(500, cause instanceof Error ? cause.message : 'Failed to fetch account');
	}
};
