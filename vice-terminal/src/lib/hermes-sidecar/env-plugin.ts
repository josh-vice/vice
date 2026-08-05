/**
 * hermes-sidecar — env-plugin.ts
 *
 * Registers a Bun build plugin that rewrites `import.meta.env` (a Vite-only
 * global) to `globalThis.__viceEnv` inside src/lib modules. This lets the
 * certified execution/data modules run unmodified under Bun — the same
 * source, the same behavior, no second execution path.
 *
 * The shim value is set by index.ts BEFORE any lib module evaluates.
 */
export function registerEnvShim(): void {
	if (typeof Bun === 'undefined') return;
	Bun.plugin({
		name: 'vice-import-meta-env-shim',
		setup(build) {
			build.onLoad(
				{ filter: /\/src\/lib\/.*\.(ts|tsx|js|jsx)$/ },
				async (args) => {
					const source = await Bun.file(args.path).text();
					if (!source.includes('import.meta.env')) {
						// Runtime mode requires a full object return for matched
						// paths — emit the source untouched.
						return { contents: source, loader: 'ts' };
					}
					return {
						contents: source.replaceAll('import.meta.env', 'globalThis.__viceEnv'),
						loader: 'ts'
					};
				}
			);
		}
	});
}

registerEnvShim();
