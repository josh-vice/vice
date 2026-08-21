#!/usr/bin/env bun
/**
 * Identity-bound readiness check for the one-command runtime verifier.
 *
 * Readiness is not "any healthy listener": it only passes when
 *   - the backend /health echoes `status: ok`, `service: vice-backend`, and
 *     EXACTLY the expected serviceId for this run, and
 *   - the frontend / returns HTTP ok and /api/run-token echoes EXACTLY the
 *     expected run token for this run.
 *
 * A pre-existing or unrelated service on the same port therefore can never
 * satisfy the handshake; the verifier fails closed instead of producing a
 * false positive.
 *
 * Usage:
 *   bun scripts/runtime-readiness.mjs \
 *     --backend-url http://127.0.0.1:8081 \
 *     --backend-service-id vice-devverify-<run> \
 *     --frontend-url http://127.0.0.1:5173 \
 *     --frontend-token <run-token> \
 *     --timeout-ms 2500
 */

const args = process.argv.slice(2);

function flag(name, fallback) {
	for (let i = 0; i < args.length - 1; i++) {
		if (args[i] === name) return args[i + 1];
	}
	return fallback;
}

const backendUrl = flag('--backend-url', '');
const expectedServiceId = flag('--backend-service-id', '');
const frontendUrl = flag('--frontend-url', '');
const expectedToken = flag('--frontend-token', '');
const timeoutMs = Number(flag('--timeout-ms', '2500'));

if (!backendUrl || !expectedServiceId || !frontendUrl || !expectedToken) {
	console.error('usage: runtime-readiness.mjs --backend-url URL --backend-service-id ID --frontend-url URL --frontend-token TOKEN [--timeout-ms MS]');
	process.exit(2);
}

async function verifyOnce() {
	let res;
	try {
		res = await fetch(`${backendUrl}/health`);
	} catch (error) {
		throw new Error(`backend ${backendUrl}/health unreachable: ${error.message}`);
	}
	if (!res.ok) throw new Error(`backend /health HTTP ${res.status} from ${backendUrl}`);
	const health = await res.json();
	if (health.status !== 'ok' || health.service !== 'vice-backend') {
		throw new Error(`backend ${backendUrl} is not the vice-backend service (got ${JSON.stringify(health)})`);
	}
	if (health.serviceId !== expectedServiceId) {
		throw new Error(`backend ${backendUrl} belongs to a different run: expected serviceId '${expectedServiceId}', got '${health.serviceId}'`);
	}

	try {
		res = await fetch(`${frontendUrl}/`);
	} catch (error) {
		throw new Error(`frontend ${frontendUrl}/ unreachable: ${error.message}`);
	}
	if (!res.ok) throw new Error(`frontend / HTTP ${res.status} from ${frontendUrl}`);

	try {
		res = await fetch(`${frontendUrl}/api/run-token`);
	} catch (error) {
		throw new Error(`frontend ${frontendUrl}/api/run-token unreachable: ${error.message}`);
	}
	if (!res.ok) throw new Error(`frontend /api/run-token HTTP ${res.status} from ${frontendUrl}`);
	const body = await res.json();
	if (body.token !== expectedToken) {
		throw new Error(`frontend ${frontendUrl} belongs to a different run: expected run token '${expectedToken}', got '${body.token ?? '(missing)'}'`);
	}
}

const deadline = Date.now() + timeoutMs;
let lastError = null;

while (Date.now() < deadline) {
	try {
		await verifyOnce();
		console.log(`✓ run identity proven: backend ${expectedServiceId} / frontend token ${expectedToken}`);
		process.exit(0);
	} catch (error) {
		lastError = error;
	}
	await new Promise((resolve) => setTimeout(resolve, 250));
}

console.error(`readiness timed out: ${lastError ? lastError.message : 'no response'}`);
process.exit(1);
