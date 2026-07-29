export type HealthStatus = 'idle' | 'connecting' | 'live' | 'stale' | 'degraded' | 'error';

export function fixturesEnabled(dev: boolean, flag: string | undefined): boolean {
	return dev && flag === 'true';
}

export function canPresentAccountState(connected: boolean, status: HealthStatus): boolean {
	return connected && status === 'live';
}

export function healthLabel(status: HealthStatus): string {
	if (status === 'live') return 'LIVE';
	if (status === 'connecting') return 'SYNC';
	if (status === 'stale') return 'STALE';
	if (status === 'degraded') return 'DEGRADED';
	if (status === 'error') return 'ERROR';
	return 'OFF';
}

export function unavailableFeedMessage(resource: string, status: HealthStatus): string {
	if (status === 'connecting') return `Loading live ${resource}…`;
	if (status === 'error') return `${resource} unavailable`;
	if (status === 'stale') return `${resource} is stale`;
	if (status === 'degraded') return `${resource} is partially unavailable`;
	return `Live ${resource} is offline`;
}
