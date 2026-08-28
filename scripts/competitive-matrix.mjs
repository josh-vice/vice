#!/usr/bin/env bun
import { resolve } from 'node:path';

const matrixPath = resolve(import.meta.dir, '../docs/competitive/terminal-matrix.json');
const validStatuses = new Set(['implemented', 'interactionCertified', 'fundedMainnetCertified', 'mainnetEnabled']);
const validSourceKinds = new Set(['official-doc', 'source', 'release']);
const validEvidenceLevels = new Set(['documented', 'source-verified', 'vice-repo-evidenced', 'unknown']);
/** An outdated source date blocks any current-parity claim. */
export const MAX_SOURCE_AGE_DAYS = 30;
function isIsoDate(value) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '');
}
function isIsoTimestamp(value) {
	return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function dateIsCurrent(iso, now = new Date()) {
	if (!isIsoTimestamp(iso) && !isIsoDate(iso)) return false;
	const at = new Date(isIsoDate(iso) ? `${iso}T00:00:00Z` : iso);
	if (Number.isNaN(at.getTime())) return false;
	const ageDays = (now.getTime() - at.getTime()) / 86_400_000;
	return ageDays >= 0 && ageDays <= MAX_SOURCE_AGE_DAYS;
}

function hasUrl(value) {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && Boolean(url.hostname);
	} catch {
		return false;
	}
}

const STATUS_KEYS = ['implemented', 'interactionCertified', 'fundedMainnetCertified', 'mainnetEnabled'];

function validateStatus(status, id, errors) {
	if (!status || typeof status !== 'object') {
		errors.push(`${id}: status must be an object`);
		return;
	}
	for (const key of STATUS_KEYS) {
		if (typeof status[key] !== 'boolean') errors.push(`${id}: status.${key} must be boolean`);
	}
	if (status.mainnetEnabled && (!status.fundedMainnetCertified || !status.interactionCertified || !status.implemented)) {
		errors.push(`${id}: mainnetEnabled requires implemented, interactionCertified, and fundedMainnetCertified`);
	}
	if (status.fundedMainnetCertified && !status.interactionCertified) {
		errors.push(`${id}: fundedMainnetCertified requires interactionCertified`);
	}
}

export function validateCompetitiveMatrix(matrix, now = new Date()) {
	const errors = [];
	if (matrix?.schemaVersion !== 2) errors.push('matrix schemaVersion must be 2');
	if (!isIsoDate(matrix?.lastIndexed ?? '')) errors.push('matrix lastIndexed must be ISO date');
	else if (!dateIsCurrent(matrix.lastIndexed, now)) errors.push(`matrix lastIndexed ${matrix.lastIndexed} is older than ${MAX_SOURCE_AGE_DAYS} days; an outdated source date blocks a current-parity claim`);
	const sources = Array.isArray(matrix?.sources) ? matrix.sources : [];
	const sourceIds = new Set();
	if (!sources.length) errors.push('matrix must contain source records');
	for (const source of sources) {
		if (!source?.id || sourceIds.has(source.id)) errors.push(`duplicate or missing source id ${source?.id ?? '(missing)'}`);
		sourceIds.add(source?.id);
		if (!hasUrl(source?.url)) errors.push(`${source?.id ?? '(missing)'}: source URL must be exact HTTPS URL`);
		if (!isIsoTimestamp(source?.accessedAt) || !dateIsCurrent(source.accessedAt, now)) errors.push(`${source?.id ?? '(missing)'}: source accessedAt must be current within ${MAX_SOURCE_AGE_DAYS} days`);
		if (!validSourceKinds.has(source?.sourceKind)) errors.push(`${source?.id ?? '(missing)'}: invalid sourceKind`);
		if (!validEvidenceLevels.has(source?.evidenceLevel)) errors.push(`${source?.id ?? '(missing)'}: invalid evidenceLevel`);
	}
	const capabilities = Array.isArray(matrix?.capabilities) ? matrix.capabilities : [];
	if (!capabilities.length) errors.push('matrix must contain capabilities');
	const ids = new Set();
	for (const row of capabilities) {
		if (!row?.id || ids.has(row.id)) errors.push(`duplicate or missing capability id ${row?.id ?? '(missing)'}`);
		ids.add(row?.id);
		if (!row?.category) errors.push(`${row?.id ?? '(missing)'}: missing category`);
		if (!Array.isArray(row?.benchmarkSources) || !row.benchmarkSources.length) errors.push(`${row?.id ?? '(missing)'}: missing benchmark source mapping`);
		for (const sourceId of row?.benchmarkSources ?? []) if (!sourceIds.has(sourceId)) errors.push(`${row.id}: unknown benchmark source ${sourceId}`);
		if (!Array.isArray(row?.viceStories) || !row.viceStories.length) errors.push(`${row?.id ?? '(missing)'}: missing Vice story mapping`);
		if (!Array.isArray(row?.viceActionIds) || !row.viceActionIds.length) errors.push(`${row?.id ?? '(missing)'}: missing Vice action mapping`);
		validateStatus(row?.status, row?.id ?? '(missing)', errors);
		if (!Array.isArray(row?.evidenceIds) || !row.evidenceIds.length) errors.push(`${row?.id ?? '(missing)'}: missing direct evidence IDs`);
		const green = STATUS_KEYS.some((key) => row?.status?.[key] === true);
		if (green && row?.evidenceIds?.length === 0) errors.push(`${row.id}: green status requires direct evidence`);
		if (!row?.nextGate) errors.push(`${row?.id ?? '(missing)'}: missing next gate`);
	}
	return errors;
}

export function validateLegacyCompetitiveMatrix(matrix, now = new Date()) {
	const errors = [];
	if (matrix?.schemaVersion !== 1) errors.push('legacy matrix schemaVersion must be 1');
	if (!isIsoDate(matrix?.lastIndexed ?? '')) errors.push('legacy matrix lastIndexed must be ISO date');
	else if (!dateIsCurrent(matrix.lastIndexed, now)) errors.push(`legacy matrix lastIndexed ${matrix.lastIndexed} is older than ${MAX_SOURCE_AGE_DAYS} days`);
	const capabilities = Array.isArray(matrix?.capabilities) ? matrix.capabilities : [];
	if (!capabilities.length) errors.push('legacy matrix must contain capabilities');
	const ids = new Set();
	for (const row of capabilities) {
		if (!row?.id || ids.has(row.id)) errors.push(`duplicate or missing capability id ${row?.id ?? '(missing)'}`);
		ids.add(row?.id);
		if (!hasUrl(row?.sourceUrl)) errors.push(`${row?.id}: missing official source URL`);
		if (!Array.isArray(row?.viceStories) || !row.viceStories.length) errors.push(`${row?.id}: missing Vice story mapping`);
		if (!['unverified', 'behind', 'partial', 'meets', 'exceeds', 'blocked'].includes(row?.status)) errors.push(`${row?.id}: invalid status ${row?.status}`);
		if (!row?.nextGate) errors.push(`${row?.id}: missing next gate`);
		if (['meets', 'exceeds'].includes(row?.status) && !row?.evidence) errors.push(`${row?.id}: green status requires direct evidence`);
		if (['meets', 'exceeds'].includes(row?.status) && !dateIsCurrent(row?.verificationDate, now)) errors.push(`${row?.id}: green status requires a current verificationDate within ${MAX_SOURCE_AGE_DAYS} days`);
	}
	return errors;
}

export async function validateCheckedInCompetitiveMatrix() {
	return validateCompetitiveMatrix(await Bun.file(matrixPath).json());
}

if (import.meta.main) {
	const errors = await validateCheckedInCompetitiveMatrix();
	if (errors.length) {
		console.error(`Competitive matrix validation failed:\n${errors.join('\n')}`);
		process.exit(1);
	}
	console.log('Competitive matrix schema passed; no unsupported parity claim is implied.');
}
