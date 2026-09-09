import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchHlOrderStatus } from '$lib/hl/server';

export const GET: RequestHandler = async ({ url }) => {
	const address = url.searchParams.get('address');
	const coin = url.searchParams.get('coin');
	const orderId = url.searchParams.get('orderId');
	if (!address || !coin || !orderId) throw error(400, 'address, coin, and orderId query params required');
	try {
		return json(await fetchHlOrderStatus(address, coin, orderId));
	} catch (cause) {
		throw error(500, cause instanceof Error ? cause.message : 'Failed to fetch order status');
	}
};

function localSigningRequired(): never {
	throw error(410, 'Server-side trading is disabled. Sign with the encrypted local agent.');
}

export const POST: RequestHandler = localSigningRequired;
export const DELETE: RequestHandler = localSigningRequired;
export const PATCH: RequestHandler = localSigningRequired;
