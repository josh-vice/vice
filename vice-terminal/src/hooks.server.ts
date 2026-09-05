import { json, redirect, type Handle } from '@sveltejs/kit';
import { betaGateEnabled, betaIdentity, betaLoginRedirect, safeReturnTarget, assertBetaConfiguration } from '$lib/server/betaAuth';

function isStaticAsset(pathname: string): boolean {
	return pathname.startsWith('/_app/') || /\.[a-z0-9]+$/i.test(pathname);
}

function withSecurityHeaders(response: Response, pathname: string, protocol: string): Response {
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
	response.headers.set('Origin-Agent-Cluster', '?1');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
	response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
	if (pathname.startsWith('/api/') || !isStaticAsset(pathname)) response.headers.set('Cache-Control', 'no-store');
	if (protocol === 'https:') response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	if (pathname.startsWith('/wasm/')) response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
	return response;
}

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;
	const gateEnabled = betaGateEnabled();
	const isLogin = pathname === '/login';
	const isLoginApi = pathname === '/api/beta/login';
	const isLogoutApi = pathname === '/api/beta/logout';
	const isPublicDiagnostic = pathname === '/api/meta' || pathname === '/api/health';
	const isPublicAsset = isStaticAsset(pathname);
	if (gateEnabled) {
		try {
			assertBetaConfiguration();
		} catch {
			return withSecurityHeaders(json({ ok: false, error: 'beta_misconfigured' }, { status: 503 }), pathname, event.url.protocol);
		}
	}
	const identity = gateEnabled && !isLoginApi && !isLogoutApi && !isPublicAsset
		? await betaIdentity(event.cookies)
		: null;

	if (!gateEnabled) {
		if (isLogin) throw redirect(303, '/');
		return withSecurityHeaders(await resolve(event), pathname, event.url.protocol);
	}
	if (isLoginApi || isLogoutApi || isPublicDiagnostic) return withSecurityHeaders(await resolve(event), pathname, event.url.protocol);
	if (isPublicAsset && !pathname.startsWith('/api/')) return withSecurityHeaders(await resolve(event), pathname, event.url.protocol);
	if (isLogin) {
		if (identity) throw redirect(303, safeReturnTarget(event.url));
		return withSecurityHeaders(await resolve(event), pathname, event.url.protocol);
	}
	if (identity) return withSecurityHeaders(await resolve(event), pathname, event.url.protocol);
	if (pathname.startsWith('/api/')) {
		return withSecurityHeaders(json({ ok: false, error: 'beta_auth_required' }, { status: 401 }), pathname, event.url.protocol);
	}
	throw redirect(303, betaLoginRedirect(event.url));
};
