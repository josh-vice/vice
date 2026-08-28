#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { recordBetaTester, getBetaTester, revokeBetaTester, rotateBetaTesterSession, revokeAllBetaTesters, newBetaInviteCode, hashBetaValue, normalizeBetaWallet } from '../vice-terminal/src/lib/server/betaStore.ts';

const args = process.argv.slice(2);
const command = args[0] ?? 'help';
function option(name, fallback = '') { const at = args.indexOf(name); return at >= 0 ? args[at + 1] ?? fallback : fallback; }
function requireValue(name) { const value = option(name); if (!value.trim()) throw new Error(`${name} is required`); return value.trim(); }
function usage() { console.log('Usage: beta-access create|revoke|rotate|list|revoke-all'); }
async function requirePassingReadiness() {
	const path = resolve(process.env.VICE_BETA_READINESS_REPORT?.trim() || 'release/readiness-report.json');
	let report;
	try { report = JSON.parse(await readFile(path, 'utf8')); } catch { throw new Error(`passing beta readiness report is required: ${path}`); }
	const { sha256, ...unsigned } = report;
	const digest = createHash('sha256').update(JSON.stringify(unsigned)).digest('hex');
	if (report.ready !== true || report.sha256 !== digest || !/^[a-f0-9]{40}$/i.test(report.commit ?? '') || !report.deployment) throw new Error('beta readiness report is not passing, intact, and deployment-bound');
	const expectedSha = process.env.VICE_MAINNET_RELEASE_BUILD?.trim();
	if (expectedSha && expectedSha.toLowerCase() !== report.commit.toLowerCase()) throw new Error('VICE_MAINNET_RELEASE_BUILD does not match readiness report');
}

if (command === 'help') { usage(); process.exit(0); }
if (process.env.VICE_BETA_REQUIRED?.trim().toLowerCase() !== 'true') throw new Error('VICE_BETA_REQUIRED=true is required');
if (command === 'create') {
	await requirePassingReadiness();
	const testerId = requireValue('--tester-id');
	const wallets = requireValue('--wallets').split(',').map(normalizeBetaWallet);
	const cohort = option('--cohort', 'beta');
	const expiresAt = Date.parse(option('--expires-at'));
	if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error('--expires-at must be a future ISO timestamp');
	const code = newBetaInviteCode();
	await recordBetaTester({ testerId, inviteHash: hashBetaValue(code, 'invite'), wallets, sessionVersion: 1, status: 'active', cohort, expiresAt });
	console.log(JSON.stringify({ testerId, cohort, expiresAt: new Date(expiresAt).toISOString(), code }, null, 2));
} else if (command === 'revoke') {
	await revokeBetaTester(requireValue('--tester-id'));
	console.log('revoked');
} else if (command === 'rotate') {
	const record = await rotateBetaTesterSession(requireValue('--tester-id'));
	console.log(JSON.stringify({ testerId: record.testerId, sessionVersion: record.sessionVersion, status: record.status }));
} else if (command === 'list') {
	const record = await getBetaTester(requireValue('--tester-id'));
	if (!record) throw new Error('beta tester not found');
	console.log(JSON.stringify({ testerId: record.testerId, sessionVersion: record.sessionVersion, status: record.status, cohort: record.cohort, expiresAt: record.expiresAt, createdAt: record.createdAt, updatedAt: record.updatedAt }));
} else if (command === 'revoke-all') {
	console.log(JSON.stringify({ revoked: await revokeAllBetaTesters() }));
} else {
	usage(); process.exit(2);
}
