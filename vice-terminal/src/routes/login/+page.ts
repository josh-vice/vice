/** Login wall data. The server hook owns authorization; this only preserves the safe return path. */
export const ssr = false;

export function load({ url }: { url: URL }) {
	const ref = url.searchParams.get('ref');
	let target = '/';
	if (ref) {
		try {
			const candidate = new URL(ref, url.origin);
			if (candidate.origin === url.origin && candidate.pathname !== '/login') {
				target = `${candidate.pathname}${candidate.search}${candidate.hash}`;
			}
		} catch {
			// Ignore malformed or external return targets.
		}
	}
	return { target };
}
