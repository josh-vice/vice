import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { betaGateEnabled, setBetaSession, verifyInviteCode } from '$lib/server/betaAuth';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	if (!betaGateEnabled()) return json({ ok: true }, { status: 404 });

	let code = '';
	const contentType = request.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		try {
			const body = await request.json() as { code?: unknown };
			if (typeof body.code === 'string') code = body.code;
		} catch {
			// Fall through to the same generic invalid response.
		}
	} else {
		const form = await request.formData();
		const value = form.get('code');
		if (typeof value === 'string') code = value;
	}

	const identity = verifyInviteCode(code);
	if (!identity) return json({ ok: false, error: 'invalid_code' }, { status: 401 });

	setBetaSession(cookies, identity, url.protocol === 'https:');
	return json({ ok: true });
}
