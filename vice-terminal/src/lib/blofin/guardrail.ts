import type { BlofinCredentials } from './vault';

/**
 * BloFin no-TRANSFER guardrail — the API client boundary.
 *
 * Every request that reaches BloFin's signed surface (private REST or private
 * WebSocket) must pass this boundary first. It fails closed on two classes of
 * input:
 *
 *   - fund-movement endpoints: any request path that hits the asset transfer,
 *     withdrawal, or deposit families is rejected before a signature exists.
 *   - TRANSFER-scoped credentials: a credential object declaring a permission
 *     other than READ/TRADE is rejected even if it was constructed in memory
 *     and never passed through the local vault.
 *
 * The vault (`vault.ts`) rejects TRANSFER at storage time; this module is the
 * defense-in-depth check at the signing/sending boundary, so a later caller
 * cannot smuggle a fund-movement request past storage validation. Errors are
 * deliberately explicit here (no secrets involved) so the rejection is
 * visible in tests and logs.
 */

/**
 * Fund-movement path families BloFin exposes under its private REST surface.
 * Matching is a lowercase path-segment containment check so that any future
 * endpoint in these families (transfer, withdrawal, deposit, and their
 * sub-resources) is refused without maintaining an exact-path list.
 */
const FUND_MOVEMENT_SEGMENTS = ['transfer', 'withdrawal', 'withdraw', 'deposit'] as const;

export type FundMovementSegment = (typeof FUND_MOVEMENT_SEGMENTS)[number];

/** Whether a private REST request path belongs to a fund-movement family. */
export function isBlofinFundMovementPath(requestPath: string): boolean {
	const path = requestPath.split('?')[0].toLowerCase();
	return FUND_MOVEMENT_SEGMENTS.some((segment) => path.includes(segment));
}

/** Reject any private request path that moves funds. Pure guard; throws on violation. */
export function assertBlofinSignedPathAllowed(requestPath: string): void {
	if (isBlofinFundMovementPath(requestPath)) {
		throw new Error(
			`BloFin request path '${requestPath}' is a transfer/withdrawal endpoint and is rejected by the no-TRANSFER guardrail`
		);
	}
}

/** Reject credentials that declare a scope other than READ/TRADE. Pure guard; throws on violation. */
export function assertBlofinCredentialsNoTransfer(credentials: BlofinCredentials): void {
	if (credentials.permissions.some((permission) => permission !== 'READ' && permission !== 'TRADE')) {
		throw new Error(
			`BloFin credentials declare an unsupported permission scope (${credentials.permissions.join(', ')}); only READ and TRADE are accepted, TRANSFER is never permitted`
		);
	}
}

/** Combined boundary check for a signed request: scope first, then endpoint. */
export function assertBlofinSigningAllowed(credentials: BlofinCredentials, requestPath: string): void {
	assertBlofinCredentialsNoTransfer(credentials);
	assertBlofinSignedPathAllowed(requestPath);
}
