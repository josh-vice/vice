#!/usr/bin/env bun
const url = process.env.VICE_DEPLOYMENT_URL?.trim();
const expectedSha = process.env.VICE_RELEASE_SHA?.trim();
if (!url || !expectedSha) throw new Error('VICE_DEPLOYMENT_URL and VICE_RELEASE_SHA are required for deployed smoke');
if (!/^[a-f0-9]{40}$/i.test(expectedSha)) throw new Error('VICE_RELEASE_SHA must be a full commit SHA');
const response = await fetch(new URL('/api/meta', url), { headers: { accept: 'application/json' }, cache: 'no-store' });
if (!response.ok) throw new Error(`/api/meta returned ${response.status}`);
const meta = await response.json();
if (meta.commit !== expectedSha || meta.releaseBuild !== expectedSha) throw new Error('deployed artifact commit and releaseBuild do not both match expected SHA');
const healthResponse = await fetch(new URL('/api/health', url), { headers: { accept: 'application/json' }, cache: 'no-store' });
let health = null;
try { health = await healthResponse.json(); } catch { /* report below */ }
if (!healthResponse.ok || health?.ok !== true || health?.network !== 'mainnet') throw new Error(`deployed health returned ${healthResponse.status}`);
const failedChecks = Object.entries(health.checks ?? {})
	.filter(([, check]) => check?.ok !== true)
	.map(([name]) => name);
if (failedChecks.length) throw new Error(`deployed health checks failed: ${failedChecks.join(', ')}`);
const page = await fetch(new URL('/trade', url), { headers: { accept: 'text/html' }, cache: 'no-store' });
if (!page.ok) throw new Error(`/trade returned ${page.status}`);
console.log(`Deployed smoke passed for ${expectedSha}.`);
