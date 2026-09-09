import { boundedReadMap } from './boundedReads';

describe('bounded venue read fan-out', () => {
	test('preserves input order while limiting concurrent work', async () => {
		let active = 0;
		let peak = 0;
		const values = await boundedReadMap(['core', 'xyz', 'abc', 'spot'], async (item) => {
			active += 1;
			peak = Math.max(peak, active);
			await new Promise((resolve) => setTimeout(resolve, item === 'core' ? 2 : 1));
			active -= 1;
			return item.toUpperCase();
		}, 2, 0);
		expect(values).toEqual(['CORE', 'XYZ', 'ABC', 'SPOT']);
		expect(peak).toBeLessThanOrEqual(2);
	});

	test('propagates a required slice failure instead of returning an incomplete account', async () => {
		await expect(boundedReadMap(['core', 'hip3'], async (item) => {
			if (item === 'hip3') throw new Error('rate limited');
			return item;
		}, 2, 0)).rejects.toThrow('rate limited');
	});
});
