import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	throw error(501, 'Advanced algorithms are unavailable until signed child-intent orchestration is enabled.');
};
