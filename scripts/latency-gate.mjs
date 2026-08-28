#!/usr/bin/env bun
/**
 * Consume client-captured latency evidence and evaluate the production SLOs.
 * This is deliberately separate from the synthetic unit tests and fails closed
 * when a real evidence file is missing, malformed, or contains no valid data.
 */

import { evaluateLatencyGates } from '../vice-terminal/src/lib/execution/latencyGates.ts';

const SCHEMA_VERSION = 2;
const RUNTIME_HEALTH_FIELDS = [
	'longTaskCount', 'longTaskMaxMs', 'longAnimationFrameCount', 'longAnimationFrameMaxMs',
	'eventDelayCount', 'eventDelayMaxMs', 'inferredDroppedFrameCount', 'maxFrameIntervalMs',
	'reconnectCount', 'maxStoreQueueDepth', 'maxFrameReadyQueueDepth'
];

export function parseLatencyEvidence(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('latency evidence must be an object');
	}
	if (value.schemaVersion !== SCHEMA_VERSION) {
		throw new Error(`latency evidence schemaVersion must be ${SCHEMA_VERSION}`);
	}
	if (value.source !== 'client-telemetry') {
		throw new Error('latency evidence source must be client-telemetry');
	}
	if (!['testnet', 'mainnet'].includes(value.network)) {
		throw new Error('latency evidence network must be testnet or mainnet');
	}
	if (typeof value.capturedAt !== 'string' || !Number.isFinite(Date.parse(value.capturedAt))) {
		throw new Error('latency evidence capturedAt must be an ISO timestamp');
	}
	if (!value.runtimeHealth || typeof value.runtimeHealth !== 'object' || Array.isArray(value.runtimeHealth)) {
		throw new Error('latency evidence runtimeHealth must be an object');
	}
	for (const field of RUNTIME_HEALTH_FIELDS) {
		if (!Number.isFinite(value.runtimeHealth[field]) || value.runtimeHealth[field] < 0) {
			throw new Error(`latency evidence runtimeHealth.${field} must be a non-negative number`);
		}
	}
	if (value.runtimeHealth.usedJsHeapBytes !== undefined && (!Number.isFinite(value.runtimeHealth.usedJsHeapBytes) || value.runtimeHealth.usedJsHeapBytes < 0)) {
		throw new Error('latency evidence runtimeHealth.usedJsHeapBytes must be a non-negative number when supplied');
	}
	if (!Array.isArray(value.samples)) {
		throw new Error('latency evidence samples must be an array');
	}
	for (const [index, sample] of value.samples.entries()) {
		if (!sample || typeof sample !== 'object' || typeof sample.feed !== 'string' || !sample.feed ||
			!Number.isSafeInteger(sample.sequence) || sample.sequence < 0) {
			throw new Error(`latency evidence samples[${index}] must carry a bounded feed/sequence key`);
		}
		for (const field of ['receiptToStoreMs', 'feedToFrameReadyMs']) {
			if (!Number.isFinite(sample[field]) || sample[field] < 0) {
				throw new Error(`latency evidence samples[${index}].${field} must be a non-negative number`);
			}
		}
	}
	if (!Array.isArray(value.dispatchSamples)) {
		throw new Error('latency evidence dispatchSamples must be an array');
	}
	for (const [index, sample] of value.dispatchSamples.entries()) {
		if (!sample || typeof sample !== 'object' ||
			!Number.isFinite(sample.actionToSignedDispatchMs) || sample.actionToSignedDispatchMs < 0 ||
			!Number.isFinite(sample.localProcessingMs) || sample.localProcessingMs < 0) {
			throw new Error(`latency evidence dispatchSamples[${index}] must contain measured non-negative timings`);
		}
	}
	return value;
}

export async function readLatencyEvidence(path) {
	if (!path) throw new Error('VICE_LATENCY_EVIDENCE is required for mainnet');
	const file = Bun.file(path);
	let parsed;
	try {
		parsed = JSON.parse(await file.text());
	} catch {
		throw new Error(`latency evidence is not valid JSON: ${path}`);
	}
	return parseLatencyEvidence(parsed);
}

export async function runLatencyGate(path) {
	const evidence = await readLatencyEvidence(path);
	const result = evaluateLatencyGates(evidence.samples, evidence.dispatchSamples);
	return { ...result, schemaVersion: evidence.schemaVersion, network: evidence.network, commit: evidence.commit ?? null, releaseBuild: evidence.releaseBuild ?? null, policySha256: evidence.policySha256 ?? null, capturedAt: evidence.capturedAt };
}

if (import.meta.main) {
	const path = process.env.VICE_LATENCY_EVIDENCE;
	if (!path) {
		console.error('Latency certification requires VICE_LATENCY_EVIDENCE=/path/to/client-latency.json');
		process.exit(1);
	}
	try {
		const expectedSha = process.env.VICE_RELEASE_SHA?.trim();
		if (!/^[a-f0-9]{40}$/i.test(expectedSha ?? '')) throw new Error('VICE_RELEASE_SHA must be a full commit SHA for mainnet latency certification');
		const evidence = await readLatencyEvidence(path);
		if (evidence.network !== 'mainnet' || evidence.commit !== expectedSha || evidence.releaseBuild !== expectedSha) throw new Error('latency evidence network or build identity does not match');
		const result = await runLatencyGate(path);
		console.log(JSON.stringify(result, null, 2));
		if (!result.pass) process.exit(1);
	} catch (error) {
		console.error(`Latency certification failed closed: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
}
