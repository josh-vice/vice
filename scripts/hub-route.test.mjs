import { describe, expect, test } from 'bun:test';

describe('Vice Hub SvelteKit migration boundary', () => {
	test('ships the preserved Hub island and an exact public-context bridge', async () => {
		const [route, island, hub, hubScript, bridge, persistence] = await Promise.all([
			Bun.file(new URL('../vice-terminal/src/routes/hub/+page.svelte', import.meta.url)).text(),
			Bun.file(new URL('../vice-terminal/src/lib/components/HubIsland.svelte', import.meta.url)).text(),
			Bun.file(new URL('../vice-terminal/static/legacy/hub/index.html', import.meta.url)).text(),
			Bun.file(new URL('../vice-terminal/static/legacy/hub.js', import.meta.url)).text(),
			Bun.file(new URL('../vice-terminal/static/legacy/suite-bridge.js', import.meta.url)).text(),
			Bun.file(new URL('../vice-terminal/static/legacy/hub-persistence.js', import.meta.url)).text()
		]);
		expect(route).toContain('<HubIsland />');
		expect(island).toContain('src={legacyUrl}');
		expect(island).toContain("type: 'vice-suite-context'");
		expect(hub).toContain('../suite-bridge.js');
		expect(hub).toContain('../hub-persistence.js');
		expect(hub).toContain('hub-suite-context');
		expect(hub).toContain('hub-open-trade');
		expect(hubScript).toContain("window.addEventListener('vice-suite-context'");
		expect(hubScript).toContain('linkSymbol(market.apiCoin)');
		expect(bridge).toContain("event.origin !== window.location.origin");
		expect(bridge).toContain('marketKey');
		expect(bridge).toContain('timeframe');
		expect(bridge).toContain('window.top.location.assign');
		expect(bridge).toContain('window.viceSuiteOpenTrade');
		expect(bridge).toContain('expectedApiCoin');
		expect(hubScript).toContain('data-suite-trade');
		expect(hubScript).toContain('window.viceSuiteOpenTrade?.(state.scope)');
		expect(bridge).not.toContain('walletAddress');
		expect(bridge).not.toContain('context.account');
		expect(persistence).toContain("const LEGACY_KEY = 'viceHub.v1'");
		expect(persistence).toContain("db.createObjectStore('hubLayouts'");
		expect(persistence).toContain('window.viceHubPersistMirror = scheduleMirror');
		expect(persistence).toContain('window.viceHubRestorePromise = restoreLegacySnapshot()');
		expect(persistence).toContain("objectStore('hubLayouts').get('legacy-v1')");
		expect(persistence).toContain('Never delay a Hub boot that already has a localStorage record');
		expect(hubScript).toContain('window.viceHubPersistMirror?.(raw)');
		expect(hubScript).toContain('restore.finally(boot)');
	});
});
