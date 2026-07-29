import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
	response.headers.set('Origin-Agent-Cluster', '?1');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
	response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
	if (event.url.pathname.startsWith('/api/')) response.headers.set('Cache-Control', 'no-store');
	if (event.url.protocol === 'https:') response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

	if (event.url.pathname.startsWith('/wasm/')) {
		response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
	}

	return response;
};
