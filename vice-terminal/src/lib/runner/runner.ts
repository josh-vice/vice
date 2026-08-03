/**
 * User-controlled runner engine for persistent conditional automation.
 *
 * The runner never signs, never holds credentials, and never opens its own
 * transport: every job is dispatched only through the injected certified
 * action boundary (`services.execute`), which is the same shared boundary the
 * rest of the terminal uses. The runner's job is to decide WHEN a job may run,
 * fail closed on stale feeds, revoked pairings, expired commands, missing
 * consent, or an engaged kill switch, and to pause rather than replay when
 * safety cannot be proven.
 */
import {
	assertPairingRecord,
	pairingIsFresh,
	type PairingRecord
} from './pairing';

export type RunnerStatus = 'stopped' | 'idle' | 'running' | 'paused' | 'killed';

export interface RunnerJob {
	/** Stable, non-blank job identity chosen by the certified strategy. */
	jobId: string;
	/** Opaque to the runner; validated and executed by the certified boundary. */
	action: { kind: string; spec: unknown };
	/** Maximum tolerated feed age before the job must pause. */
	requiredFreshnessMs: number;
	/** Absolute expiry; a late dispatch is always blocked. */
	expiresAtMs: number;
}

export interface RunnerContext {
	pairing: PairingRecord;
	/** Age in ms of the newest trusted feed signal for the job's market. */
	feedFreshnessMs: number;
	consentGranted: boolean;
	focusGranted: boolean;
	killSwitchEngaged: boolean;
	now: number;
}

export interface RunnerDecision {
	allow: boolean;
	reason: string;
}

export interface RunnerExecution {
	status: 'accepted' | 'rejected' | 'uncertain';
	outcome?: unknown;
}

export interface RunnerServices {
	/** The single certified action boundary; never implemented by the runner. */
	execute(job: RunnerJob): Promise<RunnerExecution>;
}

const MAX_PAIRING_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

export function canDispatchJob(job: RunnerJob, context: RunnerContext): RunnerDecision {
	assertPairingRecord(context.pairing);
	if (context.killSwitchEngaged) return { allow: false, reason: 'kill switch is engaged' };
	if (!context.consentGranted) return { allow: false, reason: 'runner consent is not granted' };
	if (!context.focusGranted) return { allow: false, reason: 'integration focus is not granted' };
	if (!pairingIsFresh(context.pairing, context.now, MAX_PAIRING_AGE_MS)) {
		return { allow: false, reason: 'pairing is revoked or expired' };
	}
	if (context.pairing.revoked) return { allow: false, reason: 'pairing is revoked' };
	if (!Number.isFinite(context.feedFreshnessMs) || context.feedFreshnessMs > job.requiredFreshnessMs) {
		return { allow: false, reason: 'feed is stale for this job' };
	}
	if (!Number.isFinite(job.expiresAtMs) || context.now > job.expiresAtMs) {
		return { allow: false, reason: 'command has expired' };
	}
	if (!Number.isFinite(context.now) || context.now < 0) {
		return { allow: false, reason: 'clock is unavailable' };
	}
	return { allow: true, reason: 'ok' };
}

export interface RunnerStateMachine {
	readonly status: RunnerStatus;
	start(): RunnerStatus;
	pause(): RunnerStatus;
	resume(): RunnerStatus;
	stop(): RunnerStatus;
	kill(): RunnerStatus;
}

export function createRunnerState(initial: RunnerStatus = 'stopped'): RunnerStateMachine {
	let status: RunnerStatus = initial;
	const set = (next: RunnerStatus): RunnerStatus => {
		status = next;
		return status;
	};
	return {
		get status() {
			return status;
		},
		start: () => (status === 'stopped' || status === 'idle' ? set('running') : status),
		pause: () => (status === 'running' ? set('paused') : status),
		resume: () => (status === 'paused' ? set('running') : status),
		stop: () => (status === 'running' || status === 'paused' || status === 'idle' ? set('stopped') : status),
		kill: () => set('killed')
	};
}

/**
 * Run one job through the certified boundary only when every fail-closed rule
 * passes at dispatch time. Any unprovable safety state returns without
 * dispatching; it never queues, replays, or retries late.
 */
export async function runJob(
	state: RunnerStateMachine,
	job: RunnerJob,
	context: RunnerContext,
	services: RunnerServices
): Promise<{ dispatched: boolean; decision: RunnerDecision }> {
	const decision = canDispatchJob(job, context);
	if (!decision.allow) return { dispatched: false, decision };
	if (state.status !== 'running') {
		return { dispatched: false, decision: { allow: false, reason: `runner is ${state.status}` } };
	}
	const outcome = await services.execute(job);
	if (outcome.status === 'uncertain') {
		// An uncertain outcome pauses rather than replaying or reporting success.
		state.pause();
	}
	return { dispatched: true, decision };
}

/** Anonymous runner telemetry: counts and outcome classes only. */
export function runnerTelemetry(
	state: RunnerStateMachine,
	decisions: readonly RunnerDecision[],
	executions: readonly RunnerExecution[]
): { status: RunnerStatus; denied: number; allowed: number; accepted: number; rejected: number; uncertain: number } {
	return {
		status: state.status,
		denied: decisions.filter((decision) => !decision.allow).length,
		allowed: decisions.filter((decision) => decision.allow).length,
		accepted: executions.filter((execution) => execution.status === 'accepted').length,
		rejected: executions.filter((execution) => execution.status === 'rejected').length,
		uncertain: executions.filter((execution) => execution.status === 'uncertain').length
	};
}
