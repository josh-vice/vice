import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

const MAX_REPORT_BYTES = 16 * 1024;

export const POST: RequestHandler = async ({ request }) => {
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > MAX_REPORT_BYTES) return json({ ok: false, error: 'report_too_large' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
	const body = await request.arrayBuffer();
	if (body.byteLength > MAX_REPORT_BYTES) return json({ ok: false, error: 'report_too_large' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
	// Deliberately do not persist or log the browser-supplied report: violation
	// payloads can contain URLs, paths, and policy-sensitive document details.
	return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
};
