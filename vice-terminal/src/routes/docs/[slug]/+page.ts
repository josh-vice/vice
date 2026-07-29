import { error } from '@sveltejs/kit';
import { topics } from '$lib/docs/content';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const topic = topics[params.slug];
	if (!topic) error(404, 'Documentation page not found');
	return { topic };
};
