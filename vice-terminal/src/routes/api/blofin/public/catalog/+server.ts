import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchBlofinMarkets } from '$lib/blofin/public';
import { blofinPublicReviewEnabled } from '$lib/blofin/review';

const PUBLIC_READ_TIMEOUT_MS = 8_000;

/** Review-only server read. It has no private endpoint, credential, or order dependency. */
export const GET: RequestHandler = async ({ url, fetch }) => {
	if (!blofinPublicReviewEnabled()) throw error(404, 'BloFin public review is not enabled');
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), PUBLIC_READ_TIMEOUT_MS);
	try {
		const demo = url.searchParams.get('environment') !== 'live';
		const markets = await fetchBlofinMarkets({
			demo,
			fetcher: (input, init) => fetch(input, { ...init, signal: controller.signal })
		});
		return json({ markets }, { headers: { 'cache-control': 'no-store' } });
	} catch (cause) {
		throw error(502, cause instanceof Error ? cause.message : 'BloFin public catalog is unavailable');
	} finally {
		clearTimeout(timeout);
	}
};
