import { describe, expect, test } from 'bun:test';

const login = await Bun.file(new URL('../../routes/login/+page.svelte', import.meta.url)).text();
const atmosphere = await Bun.file(new URL('../components/TerminalAtmosphere.svelte', import.meta.url)).text();

const loopAssets = [
	'vice-flamingo-ascii-landscape-loop.webm',
	'vice-flamingo-ascii-landscape-loop.mp4',
	'vice-flamingo-ascii-portrait-loop.webm',
	'vice-flamingo-ascii-portrait-loop.mp4'
];

function usesLoopSafeSources(source) {
	expect(source).toContain('-loop.webm');
	expect(source).toContain('-loop.mp4');
	expect(source).not.toContain('src="/vice-flamingo-ascii-landscape.webm"');
	expect(source).not.toContain('src="/vice-flamingo-ascii-landscape.mp4"');
	expect(source).not.toContain('src="/vice-flamingo-ascii-portrait.webm"');
	expect(source).not.toContain('src="/vice-flamingo-ascii-portrait.mp4"');
	expect(source).toContain('loop');
}

describe('ASCII animation loop boundary', () => {
	test('login uses loop-safe landscape and portrait sources', () => {
		usesLoopSafeSources(login);
	});

	test('workspace atmosphere uses a loop-safe landscape source', () => {
		usesLoopSafeSources(atmosphere);
	});

	test('all loop-safe media variants exist', async () => {
		for (const asset of loopAssets) {
			const file = Bun.file(new URL(`../../../static/${asset}`, import.meta.url));
			expect(await file.exists()).toBe(true);
			expect(file.size).toBeGreaterThan(0);
		}
	});
});
