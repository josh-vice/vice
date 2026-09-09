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

	test('does not resend a definitive venue rejection', async () => {
		let attempts = 0;
		await expect(withOneTransportRetry(async () => { attempts += 1; throw new Error('Price too far from oracle asset=3'); }, 0)).rejects.toThrow('Price too far');
		expect(attempts).toBe(1);
	});

	test('retries a bounded rate-limit failure with the same operation', async () => {
		let attempts = 0;
		await expect(withOneTransportRetry(async () => {
			attempts += 1;
			if (attempts === 1) throw new Error('429 Too Many Requests');
			return 'accepted';
		}, 0)).resolves.toBe('accepted');
		expect(attempts).toBe(2);
	});

	test('surfaces a definitive rejection returned by the retry', async () => {
		let attempts = 0;
		await expect(withOneTransportRetry(async () => {
			attempts += 1;
			if (attempts === 1) throw new Error('429 Too Many Requests');
			throw new Error('Price too far from oracle asset=3');
		}, 0)).rejects.toThrow('Price too far');
		expect(attempts).toBe(2);
	});
});
