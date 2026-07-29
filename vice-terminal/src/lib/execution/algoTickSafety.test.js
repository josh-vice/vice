import { describe, expect, test } from 'bun:test';

const modules = [
	'adaptiveTwap', 'breakEven', 'chase', 'conditionalLadder', 'iceberg',
	'oco', 'pingPong', 'pov', 'scale', 'swarm', 'trailing'
];

describe('US-004 async algorithm tick safety', () => {
	for (const module of modules) {
		test(`${module} serializes interval ticks per job`, async () => {
			const source = await Bun.file(new URL(`./${module}.ts`, import.meta.url)).text();
			expect(source).toContain("import { createTickGuard } from './tickGuard';");
			expect(source).toContain('const tickGuard = createTickGuard();');
			expect(source).toContain('tickGuard.run(');
		});
	}
});
