#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const commands = [
	['check'],
	['test:catalog'],
	['test:contract'],
	['test:chaos'],
	['test:mobile'],
	['test:load'],
	['test:bundle'],
	['test:streams'],
	['test:release-evidence'],
	['test:release-approval'],
	['test:release-manifest'],
	['test:mainnet-guardrails'],
	['test:e2e:static'],
	['test:streams:mainnet'],
	['test:mainnet-evidence'],
	['test:latency'],
	['test:soak:mainnet'],
	['test:deployed']
];
const results = [];
for (const args of commands) {
	console.log(`\n==> bun run ${args.join(' ')}`);
	const startedAt = new Date().toISOString();
	const result = Bun.spawnSync(['bun', 'run', ...args], { cwd: root, stdout: 'inherit', stderr: 'inherit' });
	results.push({ command: `bun run ${args.join(' ')}`, startedAt, finishedAt: new Date().toISOString(), status: result.success ? 'passed' : 'failed', exitCode: result.exitCode ?? 1 });
}
mkdirSync(resolve(root, 'release'), { recursive: true });
writeFileSync(resolve(root, 'release/test-summary.json'), JSON.stringify({ schemaVersion: 2, run: 'release-gate', generatedAt: new Date().toISOString(), results, passed: results.filter((result) => result.status === 'passed').length, failed: results.filter((result) => result.status === 'failed').length }, null, 2) + '\n');
if (results.some((result) => result.status === 'failed')) {
	console.error(`\nRelease blocked: ${results.filter((result) => result.status === 'failed').length} required checks failed. See release/test-summary.json.`);
	process.exit(1);
}
console.log('\nTrading terminal release gate passed.');
