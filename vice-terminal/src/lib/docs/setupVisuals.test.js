import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { docGroups, topics } from './content';

const setup = docGroups.find((group) => group.label === 'Setup');

describe('Setup documentation walkthroughs', () => {
	test('every Setup guide has a dedicated, present screenshot asset', () => {
		expect(setup).toBeDefined();

		for (const [slug] of setup.items) {
			const topic = topics[slug];
			expect(topic.visual?.src).toBe(`/docs/setup/${slug}.png`);
			expect(topic.visual?.alt.length).toBeGreaterThan(20);
			expect(topic.visual?.caption.length).toBeGreaterThan(40);

			const asset = fileURLToPath(
				new URL(`../../../static${topic.visual.src}`, import.meta.url)
			);
			expect(existsSync(asset)).toBe(true);
		}
	});
});
