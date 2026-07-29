#!/usr/bin/env bun
/**
 * Browser-surface smoke for the SSR deployment. It verifies only the stable
 * server-rendered shell. Dockview mounts chart, DOM, ticket, and tape after
 * hydration, so interactive controls belong to the browser replay gate.
 */

const frontend = process.env.VICE_FRONTEND_URL ?? 'http://127.0.0.1:5173';

async function expect(name, url, predicate) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${name}: HTTP ${response.status} from ${url}`);
	const body = await response.text();
	if (!predicate(response, body)) throw new Error(`${name}: unexpected response from ${url}`);
	console.log(`✓ ${name}`);
}

await expect('SSR terminal shell', `${frontend}/`, (response, body) =>
	response.headers.get('content-security-policy')?.includes("style-src 'self'") === true &&
	body.includes('Vice Terminal') &&
	body.includes('data-testid="terminal-shell"') &&
	body.includes('data-testid="workspace-host"') &&
	body.includes('data-testid="market-data-health"') &&
	body.includes('data-feed-status')
);

await expect('local execution session policy', `${frontend}/api/hl/session`, (_response, body) => {
	const session = JSON.parse(body);
	return session.tradingMode === 'local-encrypted-agent' && session.serverSigning === false;
});

await expect('BloFin public review policy', `${frontend}/review/blofin`, (response, body) =>
	response.headers.get('content-security-policy')?.includes('https://openapi.blofin.com') === true &&
	response.headers.get('content-security-policy')?.includes('https://demo-trading-openapi.blofin.com') === true &&
	body.includes('BloFin futures catalog') &&
	body.includes('no wallet, API key, account, order, or transfer control') &&
	!body.includes('BloFin credential review')
);

console.log('Browser-surface smoke passed.');
