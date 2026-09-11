import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { POST } from '../../routes/api/beta/login/+server';

const original = {
	code: process.env.VICE_BETA_ACCESS_CODE,
	codes: process.env.VICE_BETA_ACCESS_CODES,
	secret: process.env.VICE_BETA_SESSION_SECRET,
	required: process.env.VICE_BETA_REQUIRED,
	redisUrl: process.env.UPSTASH_REDIS_REST_URL,
	redisToken: process.env.UPSTASH_REDIS_REST_TOKEN
};

function restore(name, value) {
	if (value === undefined) delete process.env[name];
	else process.env[name] = value;
}

function request(code) {
	return new Request('http://localhost/api/beta/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin: 'http://localhost' },
		body: JSON.stringify({ code })
	});
}

function context(code) {
	const writes = [];
	return {
		writes,
		input: {
			request: request(code),
			cookies: { set: (...args) => writes.push(args) },
			url: new URL('http://localhost/api/beta/login'),
			getClientAddress: () => '127.0.0.1'
		}
	};
}

describe('shared-password beta login', () => {
	beforeEach(() => {
		process.env.VICE_BETA_ACCESS_CODE = 'test-only-access-key';
		process.env.VICE_BETA_SESSION_SECRET = 'test-only-session-secret-with-enough-entropy';
		delete process.env.VICE_BETA_ACCESS_CODES;
		delete process.env.VICE_BETA_REQUIRED;
		delete process.env.UPSTASH_REDIS_REST_URL;
		delete process.env.UPSTASH_REDIS_REST_TOKEN;
	});

	afterEach(() => {
		restore('VICE_BETA_ACCESS_CODE', original.code);
		restore('VICE_BETA_ACCESS_CODES', original.codes);
		restore('VICE_BETA_SESSION_SECRET', original.secret);
		restore('VICE_BETA_REQUIRED', original.required);
		restore('UPSTASH_REDIS_REST_URL', original.redisUrl);
		restore('UPSTASH_REDIS_REST_TOKEN', original.redisToken);
	});

	test('issues an HTTP-only signed session for the configured password', async () => {
		const { input, writes } = context('test-only-access-key');
		const response = await POST(input);
		expect(response.status).toBe(200);
		expect(writes).toHaveLength(1);
		expect(writes[0][0]).toBe('vice_beta_session');
		expect(writes[0][2]).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/' });
	});

	test('rejects an incorrect password without creating a session', async () => {
		const { input, writes } = context('incorrect-key');
		const response = await POST(input);
		expect(response.status).toBe(401);
		expect(writes).toHaveLength(0);
	});

	test('uses the branded ASCII-video composition and real flamingo mark', async () => {
		const source = await Bun.file(new URL('../../routes/login/+page.svelte', import.meta.url)).text();
		expect(source).toContain('<video');
		expect(source).toContain('/vice-flamingo-ascii-landscape-loop.webm');
		expect(source).toContain('/vice-flamingo-ascii-portrait-loop.webm');
		expect(source).toContain('/vice-flamingo-ascii-landscape-poster.webp');
		expect(source).toContain('/vice-flamingo-ascii-portrait-poster.webp');
		expect(source).toContain('/flamingo.png');
		expect(source).toContain('<audio');
		expect(source).toContain('/vice-login-kissan4-arcade-rush.mp3');
		for (const asset of [
			'flamingo.png',
			'vice-flamingo-ascii-landscape-loop.webm',
			'vice-flamingo-ascii-landscape-loop.mp4',
			'vice-flamingo-ascii-landscape-poster.webp',
			'vice-flamingo-ascii-portrait-loop.webm',
			'vice-flamingo-ascii-portrait-loop.mp4',
			'vice-flamingo-ascii-portrait-poster.webp',
			'vice-login-kissan4-arcade-rush.mp3'
		]) {
			expect(await Bun.file(new URL(`../../../static/${asset}`, import.meta.url)).exists()).toBe(true);
		}
	});

	test('keeps the terminal login accessible and dependency-free', async () => {
		const source = await Bun.file(new URL('../../routes/login/+page.svelte', import.meta.url)).text();
		expect(source).toContain("type={revealPassword ? 'text' : 'password'}");
		expect(source).toContain("aria-label={revealPassword ? 'Hide password' : 'Show password'}");
		expect(source).toContain('autocomplete="current-password"');
		expect(source).not.toContain('\n						required');
		expect(source).toContain('prefers-reduced-motion: reduce');
		expect(source).toContain('aria-pressed={audioEnabled}');
		expect(source).toContain('autoplay loop preload="metadata"');
		expect(source).toContain('void startAudio()');
		expect(source).toContain('await synthwaveAudio.play()');
		expect(source).toContain('miami-ambient');
		expect(source).toContain('crt-flicker');
		expect(source).toContain('horizon-sweep');
		expect(source).toContain('button-sheen');
		expect(source).toContain('async function startAudio(): Promise<void>');
		expect(source).not.toContain('createAnalyser');
		expect(source).not.toContain('AudioContext');
		expect(source).not.toContain('requestAnimationFrame');
		expect(source).not.toContain('flamingo-equalizer');
		expect(source).not.toContain('hero-flamingo-visualizer');
		expect(source).not.toContain('MUSIC_BPM');
		expect(source).not.toContain('userInitiated');
		expect(source).not.toContain('VICE_BETA_ACCESS_CODE');
	});

	test('supports the trick-login flamingo signal and ASCII boot transition', async () => {
		const source = await Bun.file(new URL('../../routes/login/+page.svelte', import.meta.url)).text();
		expect(source).toContain('activateFlamingoSignal');
		expect(source).toContain('onclick={activateFlamingoSignal}');
		expect(source).toContain('flamingo-mark');
		expect(source).toContain('booting');
		expect(source).toContain('&& !booting');
		expect(source).toContain('boot-overlay');
		expect(source).toContain('ascii-fullscreen');
		expect(source).toContain('ACCESS DENIED // FIND THE SIGNAL');
		expect(source).not.toContain("fetch('/api/beta/login'");
	});

	test('server gate allows login without authentication', async () => {
		const hooks = await Bun.file(new URL('../../hooks.server.ts', import.meta.url)).text();
		expect(hooks).toContain('return withSecurityHeaders(await resolve(event), event.url.pathname, event.url.protocol)');
		expect(hooks).not.toContain('betaGateEnabled');
		expect(hooks).not.toContain('betaIdentity');
		expect(hooks).not.toContain('throw redirect(303, betaLoginRedirect');
	});
});
