import { describe, expect, test } from 'bun:test';
import { normalizeTwapHistory } from './twaps';

describe('US-004 authoritative TWAP lifecycle', () => {
	test('normalizes active jobs with venue ids and execution progress', () => {
		const [job] = normalizeTwapHistory([{ time: 20, twapId: 7, state: {
			coin: 'BTC', executedNtl: '101.5', executedSz: '0.002', minutes: 30,
			randomize: true, reduceOnly: false, side: 'B', sz: '0.01', timestamp: 10_000
		}, status: { status: 'activated' } }]);
		expect(job).toMatchObject({ id: '7', twapId: 7, market: 'BTC', side: 'buy', status: 'active', executedSize: 0.002 });
	});

	test('preserves terminal errors and sorts newest first', () => {
		const jobs = normalizeTwapHistory([
			{ time: 1, state: { coin: 'ETH', executedNtl: '0', executedSz: '0', minutes: 5, randomize: false, reduceOnly: true, side: 'A', sz: '1', timestamp: 1 }, status: { status: 'error', description: 'margin' } },
			{ time: 2, twapId: 8, state: { coin: 'BTC', executedNtl: '10', executedSz: '0.1', minutes: 5, randomize: false, reduceOnly: false, side: 'B', sz: '0.1', timestamp: 2 }, status: { status: 'finished' } }
		]);
		expect(jobs.map((job) => job.status)).toEqual(['finished', 'error']);
		expect(jobs[1].error).toBe('margin');
	});
});
