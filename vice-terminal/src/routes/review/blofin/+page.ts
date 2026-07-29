import { error } from '@sveltejs/kit';
import { blofinPublicReviewEnabled } from '$lib/blofin/review';

export function load() {
	if (!blofinPublicReviewEnabled()) error(404, 'BloFin public review is not enabled');
}
