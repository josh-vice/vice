import { describe, expect, test } from 'bun:test';

describe('US-002 session custody disclosure', () => {
	test('SSR session policy explicitly rules out server signing', async () => {
		const source = await Bun.file(new URL('../../routes/api/hl/session/+server.ts', import.meta.url)).text();
		expect(source).toContain("serverSigning: false");
		expect(source).toContain("custody: 'browser-only-encrypted-agent'");
	});
});
