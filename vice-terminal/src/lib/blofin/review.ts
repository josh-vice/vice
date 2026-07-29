/**
 * BloFin credential setup is review-only until the venue has passed its
 * public-feed, private-reconciliation, and funded-demo gates. Development is
 * allowed; production needs an explicit operator flag and still exposes no
 * trading path.
 */
export function blofinSetupReviewEnabled(
	development = import.meta.env.DEV,
	flag = import.meta.env.VITE_BLOFIN_SETUP_REVIEW
): boolean {
	return development || flag === 'true';
}

/** Public catalog review has no credentials or order path, but production
 * still requires an operator to make an unintegrated venue visible. */
export function blofinPublicReviewEnabled(
	development = import.meta.env.DEV,
	flag = import.meta.env.VITE_BLOFIN_PUBLIC_REVIEW
): boolean {
	return development || flag === 'true';
}
