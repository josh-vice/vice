import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Dev/verify-only run identity.
 *
 * The one-command runtime verifier (scripts/dev-verify.sh) sets a unique
 * VICE_RUN_TOKEN before launching this frontend and refuses to accept
 * readiness unless this endpoint echoes that exact token back. A pre-existing
 * or unrelated listener can never satisfy the handshake, so a healthy-but-wrong
 * service cannot pass the verifier. Production builds simply return an empty
 * token; the endpoint exposes no account, key, or signing material.
 */
export const GET: RequestHandler = async () => json({
	token: process.env.VICE_RUN_TOKEN ?? ''
});
