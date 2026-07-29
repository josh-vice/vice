import { describe, expect, test } from 'bun:test';

describe('one-command launcher safety', () => {
	test('rejects a backend/frontend host-port collision and exposes service identity', async () => {
		const source = await Bun.file(new URL('./dev.sh', import.meta.url)).text();
		const health = await Bun.file(new URL('../vice-backend/gateway/src/main.rs', import.meta.url)).text();
		const smoke = await Bun.file(new URL('./smoke.mjs', import.meta.url)).text();
		expect(source).toContain('backend and frontend cannot bind the same host/port');
		expect(source).toContain('VICE_SERVICE_ID');
		expect(health).toContain('no_shared_hyperliquid_key');
		expect(health).toContain('serviceId');
		expect(smoke).toContain("d.service === 'vice-backend'");
		expect(smoke).toContain("d.custody === 'no_shared_hyperliquid_key'");
		const verify = await Bun.file(new URL('./dev-verify.sh', import.meta.url)).text();
		expect(verify).toContain('VICE_BACKEND_URL');
		expect(verify).toContain('bun run smoke');
		expect(verify).toContain('bun run test:browser');
		expect(verify).toContain('scripts/live-feed-smoke.mjs');
		const liveFeed = await Bun.file(new URL('./live-feed-smoke.mjs', import.meta.url)).text();
		expect(liveFeed).toContain('criticalTimeoutMs');
		expect(liveFeed).toContain("const critical = new Set(['allMids', 'l2Book', 'trades'])");
		expect(verify).toContain('trap cleanup EXIT INT TERM');
		expect(verify).toContain('kill -TERM');
		expect(verify).toContain('kill -KILL');
		expect(verify).toContain('START_STATUS_FILE');
		expect(verify).toContain('exited before verification completed (status ${status})');
	});
});
