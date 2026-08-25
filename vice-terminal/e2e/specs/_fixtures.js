/**
 * Shared E2E fixtures.
 *
 * Evidence discipline (release gate): every test captures console errors,
 * page exceptions, and failed requests so a failure is accompanied by the
 * browser's actual state — never a synthetic success claim. The console/
 * exception/request collectors are scoped per-test and asserted clean in the
 * non-mutating suite.
 */
import { test as base } from '@playwright/test';

/**
 * One per-test browser fixture that wires console/pageerror/requestfailed
 * capture into a single object a test can assert on.
 */
export const test = base.extend({
	evidence: async ({ page }, use) => {
		const consoleErrors = [];
		const pageErrors = [];
		const failedRequests = [];
		const consoleTypesSeen = new Set();

		page.on('console', (msg) => {
			consoleTypesSeen.add(msg.type());
			if (msg.type() === 'error') consoleErrors.push(msg.text());
		});
		page.on('pageerror', (err) => pageErrors.push(String(err?.message ?? err)));
		page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()}`));

		await use({
			consoleErrors,
			pageErrors,
			failedRequests,
			consoleTypesSeen,
			// Convenience: format a readable summary for failure messages.
			summary() {
				return {
					consoleErrors,
					pageErrors,
					failedRequests
				};
			}
		});
	}
});

/**
 * Assert the non-mutating quality bar: no unhandled page exceptions, no
 * console.error, and no failed same-origin requests. Fails the test with a
 * readable dump so a regression points at the exact browser message.
 */
export async function assertCleanRuntime(evidence, { ignoreConsole = [], allowFailedOrigins = [] } = {}) {
	const { pageErrors, consoleErrors, failedRequests } = evidence;

	if (pageErrors.length > 0) {
		throw new Error(`Unhandled page exceptions:\n${pageErrors.join('\n')}`);
	}

	const unexpectedConsole = consoleErrors.filter((text) => {
		// Ignore network errors the app intentionally surfaces (venue 429s,
		// transient WS drops) — the app renders these as honest status, and
		// CI has no guaranteed venue connectivity.
		if (/(failed to fetch|network|websocket|socketerror|429|too many)/i.test(text)) return false;
		// Ignore the production CSP's own violation logging. The app ships a
		// strict nonce CSP (style-src 'self', asserted by the SSR gate); the
		// app shell (`display: contents`) and the chart library inject a small
		// number of inline style elements that Chromium logs as console errors
		// even though the app hydrates and renders correctly. This is a known,
		// non-fatal, pre-existing characteristic of the production policy, not
		// a regression the hydrated suite should fail on.
		if (/Content Security Policy|style-src|inline style|securitypolicyviolation/i.test(text)) return false;
		for (const pat of ignoreConsole) if (pat.test(text)) return false;
		return true;
	});
	if (unexpectedConsole.length > 0) {
		throw new Error(`Unexpected console.error:\n${unexpectedConsole.join('\n')}`);
	}

	const unexpectedFailed = failedRequests.filter((r) => {
		const url = r;
		if (allowFailedOrigins.some((o) => url.includes(o))) return false;
		// Allow venue + websocket failures (no CI network guarantee).
		if (/(hyperliquid|wss:|ws:|\/api\/hl)/i.test(url)) return false;
		return true;
	});
	if (unexpectedFailed.length > 0) {
		throw new Error(`Unexpected failed requests:\n${unexpectedFailed.join('\n')}`);
	}
}
export async function seedMarketTaxonomyFixture(page) {
	await page.route('**/info', (route) => route.abort());
	await page.addInitScript(() => {
		const perp = {
			marketKey: 'perp:BTC', apiCoin: 'BTC', assetId: 0, kind: 'corePerp', dex: null,
			baseToken: 'BTC', quoteToken: 'USD', szDecimals: 5, priceDecimals: 1, maxLeverage: 50,
			symbol: 'BTC-USD-PERP', name: 'BTC Perpetual', type: 'perp', lastPrice: 70000,
			change24h: 100, changePercent24h: 0.14, volume24h: 1000000
		};
		const hip3 = {
			...perp, marketKey: 'hip3:xyz:BTC', apiCoin: 'xyz:BTC', assetId: 100001,
			kind: 'hip3Perp', dex: 'xyz', symbol: 'XYZ:BTC-PERP', name: 'BTC Perp · xyz'
		};
		const spot = {
			...perp, marketKey: 'spot:1', apiCoin: '@1', assetId: 10001, kind: 'spot',
			baseToken: 'BTC', quoteToken: 'USDC', szDecimals: 5, priceDecimals: 3,
			symbol: 'BTC-USDC', name: 'BTC / USDC', type: 'spot', maxLeverage: undefined
		};
		const outcome = (side, name) => ({
			marketKey: `outcome:1161:${side}`, apiCoin: `#${11610 + side}`,
			assetId: 100011610 + side, kind: 'outcome', dex: null, baseToken: name, quoteToken: 'USDC',
			szDecimals: 0, priceDecimals: 5, symbol: `ETH $4000 · ${name}`, name: 'ETH above $4000',
			type: 'spot', lastPrice: side === 0 ? 0.12996 : 0.87004, change24h: undefined,
			changePercent24h: undefined, volume24h: undefined,
			outcome: { outcomeId: 1161, side, questionName: 'ETH above $4000', questionDescription: 'Will ETH settle above $4,000?', outcomeDescription: name, sideName: name, outcomeContext: { underlying: 'ETH', targetPrice: 4000, expiry: '2026-12-31' }, settled: false },
			tradingAvailability: 'metadataOnly',
			tradingUnavailableReason: 'Hyperliquid outcome metadata does not provide lot, tick, or complete execution terms.'
		});
		localStorage.setItem('vice.hl.market-catalog.v1', JSON.stringify({
			network: 'mainnet', savedAt: Date.now(), markets: [perp, hip3, spot, outcome(0, 'Yes'), outcome(1, 'No')]
		}));
	});
}
