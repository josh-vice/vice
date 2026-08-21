#!/usr/bin/env bun
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const commands = [
	['check'],
	['test:bundle'],
	['test:smoke-policy'],
	['test:launcher'],
	['test:stories'],
	['test:widgets'],
	['test:competitive'],
	['test:release-evidence'],
	['test:gate3:evidence'],
	['test:release-approval'],
	['test:release-manifest'],
	['test:workflow-boundary'],
	['test:pwa'],
	['test:mainnet-guardrails'],
	['test:preflight-policy'],
	['test:gateway-policy'],
	['test:catalog'],
	['test:contract'],
	['test:chaos'],
	['test:revenue'],
	['test:mobile'],
	['test:load'],
	['test:latency:boundary'],
	['test:audit'],
	['test:advanced-evidence'],
	['test:e2e:static'],
	['test:security']
];

for (const args of commands) {
	console.log(`\n==> bun run ${args.join(' ')}`);
	const result = Bun.spawnSync(['bun', 'run', ...args], { cwd: root, stdout: 'inherit', stderr: 'inherit' });
	if (!result.success) process.exit(result.exitCode ?? 1);
}

console.log('\nStatic release gate passed. Run `bun run dev:verify` for one-command runtime smoke/browser evidence.');
