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
	return history
		.map((item) => ({
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
		}))
		.sort((a, b) => b.updatedAt - a.updatedAt);
}
