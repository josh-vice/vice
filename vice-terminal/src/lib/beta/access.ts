/**
 * Client-side compatibility shim.
 *
 * Beta authorization is deliberately server-side. The old implementation put
 * the invite code in VITE_* and stored a matching value in localStorage, which
 * is not an access-control boundary. New code must use the server hook and the
 * /api/beta/login action instead.
 */
export function isBetaGating(): boolean {
	return false;
}

export function hasBetaAccess(): boolean {
	return false;
}

export function signOut(): void {
	// Sign-out is intentionally a server-cookie operation; this shim is retained
	// only so stale imports fail closed rather than reintroducing local auth.
}
