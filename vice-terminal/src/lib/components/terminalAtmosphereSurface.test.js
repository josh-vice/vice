import { describe, expect, test } from 'bun:test';

const atmosphere = await Bun.file(new URL('./TerminalAtmosphere.svelte', import.meta.url)).text();
const workspace = await Bun.file(new URL('./TerminalWorkspace.svelte', import.meta.url)).text();

describe('terminal atmosphere', () => {
	test('keeps the visual layer behind the trading workspace', () => {
		expect(workspace).toContain("import TerminalAtmosphere from '$lib/components/TerminalAtmosphere.svelte';");
		expect(workspace).toContain('<TerminalAtmosphere />');
		expect(workspace).toContain('relative isolate h-screen');
		expect(workspace).toContain('relative z-10 flex h-full');
		expect(atmosphere).toContain('z-index: 20;');
		expect(atmosphere).toContain('pointer-events: none;');
	});

	test('provides muted ASCII video, independent music, fallbacks, and reduced motion', () => {
		for (const token of [
			'data-testid="terminal-atmosphere"',
			'/vice-flamingo-ascii-landscape-loop.webm',
			'/vice-flamingo-ascii-landscape-loop.mp4',
			'poster="/vice-flamingo-ascii-landscape-poster.webp"',
			'data-testid="terminal-music-toggle"',
			'/vice-login-kissan4-arcade-rush.mp3',
			'aria-pressed={audioEnabled}',
			'videoUnavailable',
			'prefers-reduced-motion: reduce',
			'visibilitychange'
		]) expect(atmosphere).toContain(token);
		expect(atmosphere).not.toContain('AnalyserNode');
		expect(atmosphere).not.toContain('AudioContext');
		expect(atmosphere).not.toContain('requestAnimationFrame');
		expect(atmosphere).not.toContain('<canvas');
	});
});
