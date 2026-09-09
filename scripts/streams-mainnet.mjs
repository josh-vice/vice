#!/usr/bin/env bun
import { readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { readStreamCatalog, validateStreamCatalog } from './stream-catalog.mjs';

const catalog = await readStreamCatalog();
const catalogErrors = validateStreamCatalog(catalog);
if (catalogErrors.length) throw new Error(catalogErrors.join('\n'));
const directory = process.env.VICE_STREAM_EVIDENCE_DIR?.trim();
const expectedSha = process.env.VICE_RELEASE_SHA?.trim();
if (!directory || !expectedSha) throw new Error('VICE_STREAM_EVIDENCE_DIR and VICE_RELEASE_SHA are required for mainnet stream certification');
if (!/^[a-f0-9]{40}$/i.test(expectedSha)) throw new Error('VICE_RELEASE_SHA must be a full commit SHA');
const files = new Set(await readdir(resolve(directory)));
const missing = [];
for (const stream of catalog.streams) {
	const name = `${stream.id}.json`;
	if (!files.has(name)) { missing.push(`${stream.id}: missing ${name}`); continue; }
	let evidence;
	try { evidence = JSON.parse(await Bun.file(join(resolve(directory), name)).text()); } catch { missing.push(`${stream.id}: invalid evidence JSON`); continue; }
	if (evidence.streamId !== stream.id || evidence.network !== 'mainnet' || evidence.captureMode !== 'live-mainnet' || evidence.provider !== stream.sourceProtocol || evidence.commit !== expectedSha || evidence.releaseBuild !== expectedSha) missing.push(`${stream.id}: evidence identity/network/provider/build mismatch`);
	if (!Number.isFinite(evidence.firstSourceTimestamp) || !Number.isFinite(evidence.lastSourceTimestamp) || !Number.isFinite(evidence.firstReceiptTimestamp) || !Number.isFinite(evidence.lastReceiptTimestamp) || evidence.lastSourceTimestamp > evidence.lastReceiptTimestamp || evidence.framesObserved < 1) missing.push(`${stream.id}: missing live source/receipt timestamps or observed frames`);
}
if (missing.length) { console.error(`Mainnet stream certification blocked:\n${missing.join('\n')}`); process.exit(1); }
console.log(`Mainnet stream certification passed: ${catalog.streams.length} streams.`);
