#!/usr/bin/env bun
/**
 * Smoke checks for Vice Terminal MVP endpoints.
 * Run with frontend + backend up: bun run dev (then bun run smoke)
 */
import { shouldRetrySmokeStatus } from './smoke-policy.mjs';

const BACKEND = process.env.VICE_BACKEND_URL ?? 'http://127.0.0.1:8080';
const FRONTEND = process.env.VICE_FRONTEND_URL ?? 'http://127.0.0.1:5173';

async function check(name, url, validate) {
	let res;
	let lastError;
	// A clean one-command launch may compile the Rust gateway first. Keep the
	// smoke gate patient enough to distinguish startup latency from failure.
	for (let attempt = 0; attempt < 120; attempt++) {
		try {
			res = await fetch(url);
			if (res.ok || !shouldRetrySmokeStatus(res.status)) break;
			lastError = new Error(`HTTP ${res.status}`);
			res = undefined;
		} catch (error) {
			lastError = error;
		}
		await Bun.sleep(250);
	}
	if (!res) {
		throw new Error(`${name}: service did not become ready at ${url}: ${lastError?.message ?? 'no response'}`);
	}
	if (!res.ok) {
		throw new Error(`${name}: HTTP ${res.status} from ${url}`);
	}
	const data = await res.json();
	if (!validate(data)) {
		throw new Error(`${name}: unexpected payload ${JSON.stringify(data)}`);
	}
	console.log(`✓ ${name}`);
	return data;
}

async function expectStatus(name, url, method, expected) {
	const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : '{}' });
	if (response.status !== expected) {
		throw new Error(`${name}: expected HTTP ${expected}, received ${response.status}`);
	}
	console.log(`✓ ${name}`);
}

async function main() {
	console.log('Vice Terminal smoke test\n');

	await check('backend health', `${BACKEND}/health`, (d) =>
		d.status === 'ok' &&
		d.service === 'vice-backend' &&
		d.execution === 'disabled_pending_signed_intents' &&
		d.custody === 'no_shared_hyperliquid_key' &&
		typeof d.serviceId === 'string' && d.serviceId.length > 0
	);

	await check('HL session', `${FRONTEND}/api/hl/session`, (d) =>
		d.tradingMode === 'local-encrypted-agent' &&
		d.serverSigning === false &&
		d.custody === 'browser-only-encrypted-agent' &&
		d.network === (process.env.VITE_HL_NETWORK ?? 'testnet')
	);

	await check('HL book (BTC)', `${FRONTEND}/api/hl/book?coin=BTC`, (d) => d.bestBid > 0 && d.bestAsk > d.bestBid);

	await expectStatus('hosted order execution disabled', `${FRONTEND}/api/hl/order`, 'POST', 410);
	await expectStatus('hosted algorithm execution disabled', `${FRONTEND}/api/algo/start`, 'POST', 501);

	console.log('\nAll smoke checks passed.');
}

main().catch((err) => {
	console.error('\nSmoke test failed:', err.message ?? err);
	process.exit(1);
});
