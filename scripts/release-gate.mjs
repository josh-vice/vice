#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const releaseProfile = (process.env.VICE_RELEASE_PROFILE ?? 'beta').trim().toLowerCase();
if (!['beta', 'full'].includes(releaseProfile)) throw new Error(`VICE_RELEASE_PROFILE must be beta or full, received ${releaseProfile}`);
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
	['test:deployed'],
	['beta:readiness'],
	['test:production-auth']
];
const results = [];
for (const args of commands) {
	console.log(`\n==> bun run ${args.join(' ')}`);
	const startedAt = new Date().toISOString();
	const result = Bun.spawnSync(['bun', 'run', ...args], {
		cwd: root,
		env: {
			...process.env,
			VICE_RELEASE_CHECK: 'true',
			VICE_RELEASE_PROFILE: releaseProfile,
			VICE_BETA_REQUIRED: 'true',
			VITE_HL_TRADING_NETWORK: 'mainnet',
			VITE_HL_MAINNET_ACK: 'I_ACCEPT_REAL_MAINNET_TRADING'
		},
		stdout: 'inherit',
		stderr: 'inherit'
	});
	results.push({ command: `bun run ${args.join(' ')}`, startedAt, finishedAt: new Date().toISOString(), status: result.success ? 'passed' : 'failed', exitCode: result.exitCode ?? 1 });
}
mkdirSync(resolve(root, 'release'), { recursive: true });
const summaryPath = process.env.VICE_RELEASE_GATE_SUMMARY?.trim() ?? 'release/release-gate-summary.json';
writeFileSync(resolve(root, summaryPath), JSON.stringify({ schemaVersion: 2, run: 'release-gate', generatedAt: new Date().toISOString(), results, passed: results.filter((result) => result.status === 'passed').length, failed: results.filter((result) => result.status === 'failed').length }, null, 2) + '\n');
if (results.some((result) => result.status === 'failed')) {
	console.error(`\nRelease blocked: ${results.filter((result) => result.status === 'failed').length} required checks failed. See ${summaryPath}.`);
	process.exit(1);
}
console.log('\nTrading terminal release gate passed.');
