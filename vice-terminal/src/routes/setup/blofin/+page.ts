import { error } from '@sveltejs/kit';
import { blofinSetupReviewEnabled } from '$lib/blofin/review';

export function load() {
	if (!blofinSetupReviewEnabled()) error(404, 'BloFin setup is not enabled');
}
