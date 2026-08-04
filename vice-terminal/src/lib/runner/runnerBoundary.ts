/**
 * User-controlled runner — certified action boundary.
 *
 * This is the ONLY place a runner job becomes a signed venue dispatch. It
 * maps a `RunnerJob.action` onto the certified `localExecution` client (the
 * same client the terminal, ticket, and sidecar use) and fails closed at
 * every gate the certified client enforces:
 *
 *   - the release kill switch (`assertTradingAllowed`)
 *   - the agent vault being locked / execution not ready
 *   - the market identity resolving to a metadata-only or unregistered record
 *   - the action kind not being on the certified allowlist
 *
 * The module creates NO transport, signer, credential store, or second
 * execution path of its own. It only forwards to the shared certified client
 * and normalizes `ExecutionAck` into the runner's outcome vocabulary
 * (accepted / rejected / uncertain). An uncertain ack pauses the runner
 * (via `runJob`) instead of replaying.
 */
import { get } from 'svelte/store';
import { marketRegistry } from '$lib/stores';
import { localExecution } from '../execution/localExecution';
import { assertTradingAllowed } from '../execution/releaseSafety';
import type { MarketDescriptor } from '$lib/types';
import type { ExecutionAck, NativeOrderIntent } from '../execution/client';
import type { RunnerExecution, RunnerJob, RunnerServices } from './runner';

/** Minimal certified-client surface the boundary needs (real: LocalExecutionClient). */
export interface RunnerBoundaryClient {
	isReady(): boolean;
	placeOrder(market: MarketDescriptor, intent: NativeOrderIntent): Promise<ExecutionAck>;
	placeScale(
		market: MarketDescriptor,
		params: { isBuy: boolean; size: number; reduceOnly: boolean; postOnly: boolean; startPrice: number; endPrice: number; levels: number; skew: number; commandId?: string }
	): Promise<ExecutionAck>;
}

/** Certified action kinds the trade-only runner may dispatch. */
export type RunnerBoundaryActionKind = 'native-limit' | 'native-stop' | 'scale';

export interface RunnerScaleSpec {
	marketKey: string;
	isBuy: boolean;
	size: number;
	reduceOnly: boolean;
	postOnly: boolean;
	startPrice: number;
	endPrice: number;
	levels: number;
	skew: number;
}

export type RunnerBoundarySpec =
	| { marketKey: string; intent: NativeOrderIntent }
	| { marketKey: string; scale: RunnerScaleSpec };

export const RUNNER_BOUNDARY_KINDS: RunnerBoundaryActionKind[] = ['native-limit', 'native-stop', 'scale'];

function assertKnownKind(kind: string): asserts kind is RunnerBoundaryActionKind {
	if (!RUNNER_BOUNDARY_KINDS.includes(kind as RunnerBoundaryActionKind)) {
		throw new Error(`Runner action kind '${kind}' is not on the certified boundary allowlist`);
	}
}

function resolveMarket(marketKey: string): MarketDescriptor {
	const market = get(marketRegistry).find((candidate) => candidate.marketKey === marketKey);
	if (!market) {
		throw new Error(`Unregistered market identity: ${marketKey}. Refresh the market registry and retry.`);
	}
	if (market.tradingAvailability === 'metadataOnly') {
		throw new Error(market.tradingUnavailableReason ?? 'This market is metadata-only until the venue provides complete execution terms');
	}
	return market;
}

function mapAck(ack: ExecutionAck): RunnerExecution {
	if (ack.accepted && ack.venueOrderIds.length > 0) {
		return { status: 'accepted', outcome: { commandId: ack.commandId, venueOrderIds: ack.venueOrderIds } };
	}
	if (ack.uncertain) {
		return { status: 'uncertain', outcome: ack.error ?? 'Runner dispatch outcome is uncertain' };
	}
	return { status: 'rejected', outcome: ack.error ?? 'Runner dispatch was rejected by the venue boundary' };
}

/**
 * Build the certified `RunnerServices` for the trade-only runner. The
 * returned `execute` re-checks every fail-closed gate at dispatch time and
 * forwards ONLY to the certified client (default: the shared `localExecution`
 * singleton) — never to a runner-owned transport. An injected client is
 * accepted for tests; production always resolves to the certified boundary.
 */
export function createRunnerBoundaryServices(client: RunnerBoundaryClient = localExecution): RunnerServices {
	return {
		async execute(job: RunnerJob): Promise<RunnerExecution> {
			try {
				const kind = typeof job.action?.kind === 'string' ? job.action.kind : '';
				assertKnownKind(kind);
				const spec = job.action.spec as RunnerBoundarySpec;
				if (!spec || typeof spec !== 'object' || typeof spec.marketKey !== 'string' || spec.marketKey.trim().length === 0) {
					return { status: 'rejected', outcome: 'Runner job is missing an exact market identity' };
				}
				assertTradingAllowed();
				if (!client.isReady()) {
					return { status: 'rejected', outcome: 'Secure trading is locked. Unlock the agent vault before the runner dispatches.' };
				}
				const market = resolveMarket(spec.marketKey);
				if (kind === 'scale' && 'scale' in spec) {
					const scale = spec.scale;
					if (!scale || typeof scale !== 'object') return { status: 'rejected', outcome: 'Runner scale spec is invalid' };
					return mapAck(
						await client.placeScale(market, {
							isBuy: scale.isBuy,
							size: scale.size,
							reduceOnly: scale.reduceOnly,
							postOnly: scale.postOnly,
							startPrice: scale.startPrice,
							endPrice: scale.endPrice,
							levels: scale.levels,
							skew: scale.skew,
							commandId: job.jobId
						})
					);
				}
				if ('intent' in spec && spec.intent) {
					return mapAck(await client.placeOrder(market, { ...spec.intent, commandId: job.jobId }));
				}
				return { status: 'rejected', outcome: 'Runner action spec does not carry a certified intent' };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return { status: 'rejected', outcome: `Runner dispatch failed closed: ${message}` };
			}
		}
	};
}
