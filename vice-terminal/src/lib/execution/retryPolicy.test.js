import { describe, expect, test } from 'bun:test';
import { withOneTransportRetry } from './retryPolicy';

describe('US-002 bounded transport retry', () => {
	test('reuses the same operation once after a lost-ack transport failure', async () => {
		let attempts = 0;
		const value = await withOneTransportRetry(async () => {
			attempts += 1;
			if (attempts === 1) throw new Error('lost ack');
			return 'accepted';
		}, 0);
		expect(value).toBe('accepted');
		expect(attempts).toBe(2);
	});

	test('does not retry beyond the bounded second attempt', async () => {
		let attempts = 0;
		await expect(withOneTransportRetry(async () => { attempts += 1; throw new Error('offline'); }, 0)).rejects.toThrow('offline');
		expect(attempts).toBe(2);
	});
});
