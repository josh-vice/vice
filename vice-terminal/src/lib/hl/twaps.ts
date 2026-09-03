import type { TwapJob } from '$lib/types';

type VenueTwap = {
	time: number;
	twapId?: number;
	state: {
		coin: string;
		executedNtl: string;
		executedSz: string;
		minutes: number;
		randomize: boolean;
		reduceOnly: boolean;
		side: 'B' | 'A';
		sz: string;
		timestamp: number;
	};
	status: { status: 'finished' | 'activated' | 'terminated' | 'error'; description?: string };
};

export function normalizeTwapHistory(history: VenueTwap[]): TwapJob[] {
	const latestById = new Map<string, TwapJob>();
	for (const item of history) {
		const job: TwapJob = {
			id: item.twapId == null ? `history-${item.state.timestamp}` : String(item.twapId),
			twapId: item.twapId,
			market: item.state.coin,
			side: item.state.side === 'B' ? ('buy' as const) : ('sell' as const),
			size: Number(item.state.sz),
			executedSize: Number(item.state.executedSz),
			executedNotional: Number(item.state.executedNtl),
			minutes: item.state.minutes,
			randomize: item.state.randomize,
			reduceOnly: item.state.reduceOnly,
			startedAt: item.state.timestamp,
			updatedAt: item.time * 1000,
			status: item.status.status === 'activated' ? ('active' as const) : item.status.status,
			error: item.status.status === 'error' ? item.status.description : undefined
		};
		const previous = latestById.get(job.id);
		if (!previous || job.updatedAt >= previous.updatedAt) latestById.set(job.id, job);
	}
	return [...latestById.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}
