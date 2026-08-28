import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createHmac } from 'node:crypto';
import { assertBetaConfiguration, betaGateEnabled, setBetaSession, verifyDurableInviteCode, verifyInviteCode } from '$lib/server/betaAuth';
import { consumeBetaRateLimit } from '$lib/server/betaStore';

const MAX_BODY_BYTES = 512;
const WINDOW_MS = 15 * 60 * 1000;

function privacyHash(value: string): string {
	const secret = process.env.VICE_BETA_SESSION_SECRET?.trim();
	if (!secret) throw new Error('VICE_BETA_SESSION_SECRET is required when beta access is enabled');
	return createHmac('sha256', secret).update(value).digest('hex');
}

function sameOrigin(request: Request, url: URL): boolean {
	const fetchSite = request.headers.get('sec-fetch-site');
	if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;
	const origin = request.headers.get('origin');
	return !origin || origin === url.origin;
}

export const POST: RequestHandler = async ({ request, cookies, url, getClientAddress }) => {
	if (!betaGateEnabled()) return json({ ok: true }, { status: 404 });
	try {
		assertBetaConfiguration();
		if (!sameOrigin(request, url)) return json({ ok: false, error: 'invalid_request' }, { status: 403 });
		const length = Number(request.headers.get('content-length') ?? 0);
		if (length > MAX_BODY_BYTES) return json({ ok: false, error: 'invalid_request' }, { status: 400 });
		const contentType = request.headers.get('content-type') ?? '';
		let code = '';
		if (contentType.includes('application/json')) {
			const body = await request.text();
			if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) return json({ ok: false, error: 'invalid_request' }, { status: 400 });
			try {
				const parsed = JSON.parse(body) as { code?: unknown };
				if (typeof parsed.code === 'string') code = parsed.code;
			} catch {
				code = '';
			}
		} else {
			const body = await request.clone().arrayBuffer();
			if (body.byteLength > MAX_BODY_BYTES) return json({ ok: false, error: 'invalid_request' }, { status: 400 });
			const form = await request.formData();
			const value = form.get('code');
			if (typeof value === 'string') code = value;
		}
		if (process.env.VICE_BETA_REQUIRED?.trim().toLowerCase() === 'true') {
			const ipHash = privacyHash(getClientAddress());
			const attemptHash = privacyHash(code.trim());
			const [ipLimit, attemptLimit] = await Promise.all([
				consumeBetaRateLimit(`ip:${ipHash}`, 30, WINDOW_MS),
				consumeBetaRateLimit(`attempt:${attemptHash}`, 8, WINDOW_MS)
			]);
			if (!ipLimit.allowed || !attemptLimit.allowed) {
				const retryAfter = Math.max(ipLimit.retryAfterSeconds, attemptLimit.retryAfterSeconds);
				return json({ ok: false, error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
			}
		}
		const identity = process.env.VICE_BETA_REQUIRED?.trim().toLowerCase() === 'true'
			? await verifyDurableInviteCode(code)
			: verifyInviteCode(code);
		if (!identity) return json({ ok: false, error: 'invalid_code' }, { status: 401 });
		setBetaSession(cookies, identity, url.protocol === 'https:');
		return json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
	} catch {
		return json({ ok: false, error: 'beta_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
	}
};
