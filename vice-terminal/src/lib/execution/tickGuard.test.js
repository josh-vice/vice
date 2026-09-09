import { createTickGuard } from './tickGuard';

describe('algorithm tick guard', () => {
	test('does not overlap the same job while an async tick is pending', async () => {
		const guard = createTickGuard();
		let active = 0;
		let peak = 0;
		const task = async () => {
			active += 1;
			peak = Math.max(peak, active);
			await new Promise((resolve) => setTimeout(resolve, 5));
			active -= 1;
		};
		const first = guard.run('job', task);
		const second = guard.run('job', task);
		await Promise.all([first, second]);
		expect(peak).toBe(1);
		await expect(guard.run('job', task)).resolves.toBe(true);
	});

	test('keeps different jobs independent', async () => {
		const guard = createTickGuard();
		await expect(Promise.all([
			guard.run('one', async () => undefined),
			guard.run('two', async () => undefined)
		])).resolves.toEqual([true, true]);
	});
});
