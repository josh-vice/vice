import { describe, expect, test } from 'bun:test';
import { assertBlofinCredentialsNoTransfer, assertBlofinSignedPathAllowed, assertBlofinSigningAllowed, isBlofinFundMovementPath } from './guardrail.ts';
import { blofinAuthHeaders } from './signing.ts';
import { fetchBlofinPrivateSnapshot } from './private.ts';
import { blofinPrivateLogin } from './privateWs.ts';

const readOnlyCredentials = { apiKey: 'publi...ey', secretKey: 'super-secret', passphrase: 'venue-passphrase', permissions: ['READ'] };
const tradeCredentials = { apiKey: 'publi...ey', secretKey: 'super-secret', passphrase: 'venue-passphrase', permissions: ['READ', 'TRADE'] };
const transferCredentials = { apiKey: 'publi...ey', secretKey: 'super-secret', passphrase: 'venue-passphrase', permissions: ['READ', 'TRADE', 'TRANSFER'] };

describe('BloFin no-TRANSFER guardrail boundary', () => {
	test('classifies every fund-movement family as forbidden', () => {
		for (const path of [
			'/api/v1/asset/transfer',
			'/api/v1/asset/transfer?from=spot&to=futures',
			'/api/v1/asset/withdrawal',
			'/api/v1/asset/withdrawal/cancel',
			'/api/v1/asset/withdrawal/history',
			'/api/v1/asset/deposit',
			'/api/v1/asset/deposit/history'
		]) {
			expect(isBlofinFundMovementPath(path)).toBe(true);
		}
	});

	test('keeps the certified private-read paths allowed', () => {
		for (const path of [
			'/api/v1/asset/balances?accountType=futures',
			'/api/v1/account/positions',
			'/api/v1/trade/orders-pending'
		]) {
			expect(isBlofinFundMovementPath(path)).toBe(false);
			expect(() => assertBlofinSignedPathAllowed(path)).not.toThrow();
		}
	});

	test('rejects transfer/withdrawal endpoints at the path guard', () => {
		for (const path of ['/api/v1/asset/transfer', '/api/v1/asset/withdrawal', '/api/v1/asset/deposit']) {
			expect(() => assertBlofinSignedPathAllowed(path)).toThrow('no-TRANSFER guardrail');
		}
	});

	test('rejects TRANSFER-scoped credentials even when constructed in memory', () => {
		expect(() => assertBlofinCredentialsNoTransfer(transferCredentials)).toThrow('TRANSFER is never permitted');
		expect(() => assertBlofinSigningAllowed(transferCredentials, '/api/v1/account/positions')).toThrow('TRANSFER is never permitted');
		expect(() => assertBlofinCredentialsNoTransfer(readOnlyCredentials)).not.toThrow();
		expect(() => assertBlofinCredentialsNoTransfer(tradeCredentials)).not.toThrow();
	});

	test('refuses to sign a fund-movement request at the auth-header boundary', async () => {
		await expect(blofinAuthHeaders(readOnlyCredentials, '/api/v1/asset/transfer', 'POST', '{}')).rejects.toThrow('no-TRANSFER guardrail');
		await expect(blofinAuthHeaders(transferCredentials, '/api/v1/account/positions', 'GET')).rejects.toThrow('TRANSFER is never permitted');
		await expect(blofinAuthHeaders(readOnlyCredentials, '/api/v1/account/positions', 'GET')).resolves.toMatchObject({ 'ACCESS-KEY': readOnlyCredentials.apiKey });
	});

	test('never constructs a fund-movement URL through the private snapshot boundary', async () => {
		const requests = [];
		const fetcher = async (url, init) => {
			requests.push(String(url));
			const data = String(url).includes('/balances') ? [{ currency: 'USDT', balance: '1000', available: '900', frozen: '100' }]
				: String(url).includes('/positions') ? [{ positionId: 'p-1', instId: 'BTC-USDT', positionSide: 'net', positions: '-1', availablePositions: '-1', averagePrice: '90000', markPrice: '90100', liquidationPrice: '50000', unrealizedPnl: '100', leverage: '3', updateTime: '1700000000000' }]
				: [{ orderId: 'o-1', instId: 'BTC-USDT', side: 'sell', orderType: 'limit', price: '91000', size: '1', filledSize: '0', reduceOnly: 'true', state: 'live', updateTime: '1700000000001' }];
			return new Response(JSON.stringify({ code: '0', data }), { status: 200 });
		};
		await fetchBlofinPrivateSnapshot(tradeCredentials, 'demo', { fetcher, now: 1700000000000, keyFingerprint: '0123456789abcdef01234567', nonceFactory: () => 'nonce-1' });
		for (const url of requests) {
			expect(isBlofinFundMovementPath(url)).toBe(false);
		}
		expect(requests).toHaveLength(3);
	});

	test('rejects a private WebSocket login with TRANSFER-scoped credentials before any frame is built', async () => {
		await expect(blofinPrivateLogin(transferCredentials)).rejects.toThrow('TRANSFER is never permitted');
		await expect(blofinPrivateLogin(readOnlyCredentials, 1700000000000, 'nonce-1')).resolves.toContain('"op":"login"');
	});

	test('keeps the public catalog foundation local-only and unexposed', async () => {
		const publicSource = await Bun.file(new URL('./public.ts', import.meta.url)).text();
		const guardrailSource = await Bun.file(new URL('./guardrail.ts', import.meta.url)).text();
		const routeSource = await Bun.file(new URL('../../routes/api/blofin/public/catalog/+server.ts', import.meta.url)).text();
		// The catalog module has no credential path, signing, private stream, or transfer endpoint.
		for (const forbidden of ['blofinAuthHeaders', 'secretKey', 'TRANSFER', 'transfer', 'withdrawal', 'signBlofinRequest']) {
			expect(publicSource).not.toContain(forbidden);
		}
		// The external catalog route is the only public gateway and it still fails closed on the review gate.
		expect(routeSource).toContain('blofinPublicReviewEnabled');
		expect(routeSource).toContain('fetchBlofinMarkets');
		expect(routeSource).not.toContain('blofinAuthHeaders');
		// The guardrail module itself is the single no-TRANSFER authority used by the signing boundary.
		expect(guardrailSource).toContain('assertBlofinSigningAllowed');
	});
});
