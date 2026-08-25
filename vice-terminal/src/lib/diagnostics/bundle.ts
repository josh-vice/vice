/**
 * Support-bundle assembler.
 *
 * `buildSupportBundle` snapshots the app's live diagnostic state into a
 * deterministic-schema, bounded-size, privacy-safe JSON document. Every field
 * is either structured (non-secret) metadata or passed through `redactDeep`
 * before serialization, so the guarantee holds at the boundary — not just by
 * convention upstream.
 *
 * The bundle NEVER contains: wallet/agent addresses, private keys, signatures,
 * raw signed payloads, auth tokens, or full order payloads. Account-derived
 * fields that are safe (health status enums, feed/account transition labels)
 * are kept because they are what a support engineer needs to triage; anything
 * key/signature/address-shaped is redacted by `redact.ts`.
 *
 * Build identity (version/SHA) is taken from a single `BuildMeta` injectable so
 * tests and the Report Issue flow can pass the same source of truth without a
 * network round-trip. There is deliberately NO fetch/telemetry call here.
 */
import { get } from 'svelte/store';
import { hyperliquidNetwork } from '$lib/hl/network';
import {
	walletStatus,
	walletAddress,
	marketDataStatus,
	marketCatalogStatus,
	accountSyncStatus,
	activeAssetSyncStatus,
	executionStatus,
	algoServiceStatus,
	candleDataStatus,
	marketContextStatus,
	revenueSyncStatus,
	deadmanStatus,
	marketType,
	demoFixturesEnabled
} from '$lib/stores';
import { workspacePreset, workspaceLocked } from '$lib/workspacePreset';
import { tradingKillSwitchActive } from '$lib/execution/releaseSafety';
import { privacyMode } from '$lib/privacyMode';
import {
	SUPPORT_BUNDLE_SCHEMA,
	SUPPORT_BUNDLE_KIND,
	MAX_BUNDLE_BYTES,
	TRIM_PRIORITY
} from './schema';
import { redactDeep, capStringLength } from './redact';
import {
	getAppErrors,
	getHealthTransitions,
	getRequestFailures
} from './recorder';
import { exportExecutionAudit } from '$lib/execution/commandJournal';

export interface BuildMeta {
	version: string;
	sha?: string;
	ref?: string;
}

export interface SupportBundle {
	schema: typeof SUPPORT_BUNDLE_SCHEMA;
	kind: typeof SUPPORT_BUNDLE_KIND;
	generatedAt: string;
	app: {
		name: string;
		version: string;
		sha?: string;
		ref?: string;
		network: string;
		testnet: boolean;
	};
	environment: {
		userAgent?: string;
		platform?: string;
		language?: string;
		screen?: string;
		viewport?: string;
		online?: boolean;
	};
	featureFlags: {
		marketType: string;
		workspacePreset: string;
		workspaceLocked: boolean;
		demoFixturesEnabled: boolean;
		privacyMode: boolean;
		tradingKillSwitchActive: boolean;
	};
	health: {
		current: Record<string, string>;
		transitions: Array<{ at: number; key: string; from: string; to: string }>;
	};
	requestFailures: Array<{
		at: number;
		category: string;
		method: string;
		url: string;
	}>;
	appErrors: Array<{
		at: number;
		type: string;
		message: string;
		source?: string;
	}>;
	commands: {
		network: string;
		entries: Array<{
			commandId: string;
			sequence: number;
			kind: string;
			status: string;
			updatedAt: number;
		}>;
	};
	operatorNote?: string;
}

/** Read the app's own name from the meta contract. */
const APP_NAME = 'Vice Terminal';

/** Hard-coded defaults when no explicit BuildMeta is injected (no network). */
export const FALLBACK_BUILD_META: BuildMeta = {
	version: '1.0.0'
};

function safeGet<T>(reader: () => T): T | undefined {
	try {
		return reader();
	} catch {
		return undefined;
	}
}

/**
 * Snapshot the current live stores into a redacted, bounded support bundle.
 * Pure — no fetch, no DOM writes. `browserInfo` is injected by the caller so
 * the assembler stays unit-testable without a browser.
 */
export function buildSupportBundle(
	meta: BuildMeta = FALLBACK_BUILD_META,
	browserInfo?: {
		userAgent?: string;
		platform?: string;
		language?: string;
		screen?: string;
		viewport?: string;
		online?: boolean;
	},
	operatorNote?: string
): SupportBundle {
	const health = safeGet(() => ({
		wallet: get(walletStatus),
		marketData: get(marketDataStatus),
		marketCatalog: get(marketCatalogStatus),
		accountSync: get(accountSyncStatus),
		activeAssetSync: get(activeAssetSyncStatus),
		execution: get(executionStatus),
		algoService: get(algoServiceStatus),
		candleData: get(candleDataStatus),
		marketContext: get(marketContextStatus),
		revenueSync: get(revenueSyncStatus),
		deadman: get(deadmanStatus)
	})) ?? {};

	// Command journal is account-scoped; only include entries when a wallet is
	// live. Entries carry commandId/sequence/kind/status — never account
	// address, cloids, venue order IDs, or order payloads.
	const account = safeGet(() => get(walletAddress)) ?? '';
	const audit = safeGet(() => exportExecutionAudit(account));
	const commandEntries = (audit?.entries ?? [])
		.slice(0, 50)
		.map((entry) => ({
			commandId: entry.commandId,
			sequence: entry.sequence,
			kind: entry.kind,
			status: entry.status,
			updatedAt: entry.updatedAt
		}));

	const environment = {
		...(browserInfo?.userAgent ? { userAgent: browserInfo.userAgent } : {}),
		...(browserInfo?.platform ? { platform: browserInfo.platform } : {}),
		...(browserInfo?.language ? { language: browserInfo.language } : {}),
		...(browserInfo?.screen ? { screen: browserInfo.screen } : {}),
		...(browserInfo?.viewport ? { viewport: browserInfo.viewport } : {}),
		...(browserInfo?.online !== undefined ? { online: browserInfo.online } : {})
	};

	const bundle: SupportBundle = {
		schema: SUPPORT_BUNDLE_SCHEMA,
		kind: SUPPORT_BUNDLE_KIND,
		generatedAt: new Date().toISOString(),
		app: {
			name: APP_NAME,
			version: meta.version,
			...(meta.sha ? { sha: meta.sha } : {}),
			...(meta.ref ? { ref: meta.ref } : {}),
			network: hyperliquidNetwork.network,
			testnet: hyperliquidNetwork.isTestnet
		},
		environment,
		...(operatorNote?.trim() ? { operatorNote: operatorNote.trim() } : {}),
		featureFlags: {
			marketType: get(marketType),
			workspacePreset: get(workspacePreset),
			workspaceLocked: get(workspaceLocked),
			demoFixturesEnabled,
			privacyMode: safeGet(() => get(privacyMode)) ?? false,
			tradingKillSwitchActive: safeGet(() => tradingKillSwitchActive()) ?? false
		},
		health: {
			current: health,
			transitions: getHealthTransitions()
		},
		requestFailures: getRequestFailures().map((r) => ({
			at: r.at,
			category: r.category,
			method: r.method,
			url: r.url
		})),
		appErrors: getAppErrors().map((e) => ({
			at: e.at,
			type: e.type,
			message: e.message,
			...(e.source ? { source: e.source } : {})
		})),
		commands: {
			network: hyperliquidNetwork.network,
			entries: commandEntries
		}
	};

	return trimAndSanitize(bundle);
}

/**
 * Apply the strict redaction contract across the assembled bundle and enforce
 * the byte budget. Structured string fields are length-capped; free-text
 * fields are redacted; any residual secret-shaped value is replaced.
 */
export function trimAndSanitize(bundle: SupportBundle): SupportBundle {
	// Redact free-text/unknown fields (defense-in-depth on top of the
	// structured shape, which already excludes secrets by construction).
	const redacted = redactDeep(bundle) as SupportBundle;

	if (redacted.operatorNote) redacted.operatorNote = capStringLength(redacted.operatorNote, 488);
	if (redacted.environment.userAgent) redacted.environment.userAgent = capStringLength(redacted.environment.userAgent);
	for (const err of redacted.appErrors) {
		err.message = capStringLength(err.message);
		if (err.source) err.source = capStringLength(err.source);
	}
	// Enforce the serialized byte budget by trimming the lowest-value collectors.
	let json = JSON.stringify(redacted);
	if (json.length <= MAX_BUNDLE_BYTES) return redacted;
	// Both collectors are arrays of objects with the same `length` contract;
	// index them through the shared record shape to satisfy the narrowing.
	const trimTarget = redacted as unknown as Record<string, { length: number }>;
	for (const key of TRIM_PRIORITY) {
		while (json.length > MAX_BUNDLE_BYTES && trimTarget[key].length > 0) {
			redacted[key] = redacted[key].slice(0, -1) as never;
			json = JSON.stringify(redacted);
		}
	}
	return redacted;
}

/** Serialize a bundle to the exact JSON text a support engineer reads. */
export function stringifyBundle(bundle: SupportBundle): string {
	return JSON.stringify(bundle, null, 2);
}

/** Convenience: parse + re-stringify to confirm round-trip / schema validity. */
export function parseBundle(text: string): SupportBundle {
	return JSON.parse(text) as SupportBundle;
}
