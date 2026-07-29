import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchHlBook } from '$lib/hl/server';

export const GET: RequestHandler = async ({ url }) => {
	const coin = url.searchParams.get('coin');
	if (!coin) throw error(400, 'coin query param required');

	try {
		return json(await fetchHlBook(coin));
	} catch (cause) {
		throw error(500, cause instanceof Error ? cause.message : 'Failed to fetch book');
	}
};
