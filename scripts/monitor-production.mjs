#!/usr/bin/env bun
const productionUrl = process.env.VICE_PRODUCTION_URL?.trim();
const expectedSha = process.env.VICE_RELEASE_SHA?.trim();
if (!productionUrl) throw new Error('VICE_PRODUCTION_URL is required');
if (!expectedSha) throw new Error('VICE_RELEASE_SHA is required for immutable production monitoring');
if (!/^[a-f0-9]{40}$/i.test(expectedSha)) throw new Error('VICE_RELEASE_SHA must be a full commit SHA');

async function getJson(path) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15_000);
	try {
		const response = await fetch(new URL(path, productionUrl), { cache: 'no-store', headers: { accept: 'application/json' }, signal: controller.signal });
		let body = null;
		try { body = await response.json(); } catch { /* report below */ }
		return { response, body };
	} finally {
		clearTimeout(timeout);
	}
}

const health = await getJson('/api/health');
if (!health.response.ok || health.body?.ok !== true || health.body?.network !== 'mainnet') {
	throw new Error(`production health failed (${health.response.status})`);
}
const failedChecks = Object.entries(health.body.checks ?? {})
	.filter(([, check]) => check?.ok !== true)
	.map(([name]) => name);
if (failedChecks.length) throw new Error(`production health checks failed: ${failedChecks.join(', ')}`);

const meta = await getJson('/api/meta');
if (!meta.response.ok || meta.body?.network !== 'mainnet') throw new Error(`production metadata failed (${meta.response.status})`);
if (meta.body?.commit !== expectedSha || meta.body?.releaseBuild !== expectedSha) {
	throw new Error('production metadata does not match VICE_RELEASE_SHA');
}

const protectedProbe = await fetch(new URL('/api/hl/book?coin=BTC', productionUrl), { cache: 'no-store', headers: { accept: 'application/json' } });
if (protectedProbe.status !== 401) throw new Error(`beta gate probe expected 401, received ${protectedProbe.status}`);

console.log(JSON.stringify({
	ok: true,
	productionUrl,
	network: health.body.network,
	commit: meta.body.commit ?? null,
	releaseBuild: meta.body.releaseBuild ?? null,
	betaGate: 'closed',
	checkedAt: new Date().toISOString()
}));
