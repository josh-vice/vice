/**
 * In-memory, bounded diagnostic recorders.
 *
 * These recorders are the source for the support bundle's runtime observability:
 * feed/account health transitions, request-failure categories, and app errors.
 * All buffers are bounded (see `schema.ts`) — the oldest entries are dropped
 * when a cap is hit, so a long-lived terminal session never grows an unbounded
 * diagnostics blob. Nothing here performs a network call; the recorders are
 * purely local state that the bundle assembler snapshots on demand.
 *
 * The recorder is framework-agnostic and safe to import under bun (no DOM at
 * module scope). Browser-only wiring (subscriptions + event listeners) lives in
 * `wire.ts`.
 */

import {
	MAX_APP_ERRORS,
	MAX_HEALTH_TRANSITIONS,
	MAX_REQUEST_FAILURES,
	MAX_STRING_LENGTH
} from './schema';
import { capStringLength } from './redact';

export interface HealthTransition {
	at: number;
	key: string;
	from: string;
	to: string;
}

export type RequestFailureCategory =
	| 'network'
	| 'aborted'
	| 'http-error'
	| 'timeout'
	| 'other';

export interface RequestFailureRecord {
	at: number;
	category: RequestFailureCategory;
	method: string;
	/** Sanitized: origin + path only, no query/hash, no credentials. */
	url: string;
}

export interface AppErrorRecord {
	at: number;
	type: 'error' | 'unhandledrejection' | 'resource';
	message: string;
	source?: string;
}

// ---------------------------------------------------------------------------
// Bounded buffers
// ---------------------------------------------------------------------------
let healthTransitions: HealthTransition[] = [];
let requestFailures: RequestFailureRecord[] = [];
let appErrors: AppErrorRecord[] = [];

function pushBounded<T>(buffer: T[], entry: T, cap: number): T[] {
	buffer.push(entry);
	if (buffer.length > cap) buffer.splice(0, buffer.length - cap);
	return buffer;
}

// ---------------------------------------------------------------------------
// Public record API
// ---------------------------------------------------------------------------
export function recordHealthTransition(key: string, from: string, to: string): void {
	if (from === to) return;
	healthTransitions = pushBounded(
		healthTransitions,
		{ at: Date.now(), key, from, to },
		MAX_HEALTH_TRANSITIONS
	);
}

/** Sanitize a URL to origin + pathname only (strips query, hash, credentials). */
export function sanitizeRequestUrl(raw: string): string {
	if (!raw) return '';
	// Relative URLs stay relative (no host to leak); just strip query/hash.
	if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) {
		return capStringLength(raw.replace(/[?#].*$/, ''), 120);
	}
	try {
		const url = new URL(raw);
		return `${url.origin}${url.pathname}`;
	} catch {
		// Not a parseable URL — keep only a bounded fragment of the raw string.
		return capStringLength(raw.replace(/[?#].*$/, ''), 120);
	}
}

export function recordRequestFailure(
	input: Omit<RequestFailureRecord, 'at'> & { at?: number }
): void {
	const url = sanitizeRequestUrl(input.url);
	const category: RequestFailureCategory = input.category;
	requestFailures = pushBounded(
		requestFailures,
		{ at: input.at ?? Date.now(), category, method: input.method, url },
		MAX_REQUEST_FAILURES
	);
}

export function recordAppError(
	input: Omit<AppErrorRecord, 'at' | 'message'> & { message: string; at?: number }
): void {
	const message = capStringLength(input.message, MAX_STRING_LENGTH);
	const source = input.source ? capStringLength(input.source, MAX_STRING_LENGTH) : undefined;
	appErrors = pushBounded(
		appErrors,
		{ at: input.at ?? Date.now(), type: input.type, message, ...(source ? { source } : {}) },
		MAX_APP_ERRORS
	);
}

// ---------------------------------------------------------------------------
// Snapshot API (read-only copies)
// ---------------------------------------------------------------------------
export function getHealthTransitions(): HealthTransition[] {
	return [...healthTransitions];
}
export function getRequestFailures(): RequestFailureRecord[] {
	return [...requestFailures];
}
export function getAppErrors(): AppErrorRecord[] {
	return [...appErrors];
}

/** Test/telemetry-reset: clear all recorder buffers. */
export function resetDiagnosticsRecorders(): void {
	healthTransitions = [];
	requestFailures = [];
	appErrors = [];
}

/** Re-export for the bundle assembler / tests. */
export { capStringLength };
