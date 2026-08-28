import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { clearBetaSession } from '$lib/server/betaAuth';

export const POST: RequestHandler = async ({ cookies }) => {
	clearBetaSession(cookies);
	return json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
};
