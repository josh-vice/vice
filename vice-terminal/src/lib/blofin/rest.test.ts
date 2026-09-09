import { afterEach, describe, expect, test } from 'bun:test';
import type { CredentialInput } from '$lib/credentials/types';
import { signBlofinRest } from './auth';
import { blofinRestRequest } from './rest';

const SECRET = 'rest-test-secret-do-not-log';
const CREDENTIALS: CredentialInput = {
	apiKey: 'rest-test-api-key',
	secret: SECRET,
	passphrase: 'rest-test-passphrase'
};

const originalFetch = globalThis.fetch;
const originalAbortTimeout = (AbortSignal as typeof AbortSignal & { timeout?: unknown }).timeout;

function provideCredentials<T>(callback: (credentials: CredentialInput) => T | PromiseLike<T>): Promise<T> {
	return Promise.resolve(callback(CREDENTIALS));
}

function successResponse<T>(data: T): Response {
	return new Response(JSON.stringify({ code: '0', msg: 'success', data }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
}

function requestHeaders(init: RequestInit | undefined): Headers {
	return new Headers(init?.headers);
}

function installFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>): void {
	globalThis.fetch = handler as typeof fetch;
}

afterEach(() => {
	globalThis.fetch = originalFetch;
	if (originalAbortTimeout === undefined) {
		Reflect.deleteProperty(AbortSignal, 'timeout');
	} else {
		Object.defineProperty(AbortSignal, 'timeout', {
			configurable: true,
			writable: true,
			value: originalAbortTimeout
		});
	}
});

describe('bounded BloFin REST transport', () => {
	test('uses the allowlisted demo URL, private headers, one body serialization, and one credential callback', async () => {
		const requestPath = '/api/v1/trade/order';
		let calls = 0;
		let callbackCalls = 0;
		let serializationCalls = 0;
		let seenInput: RequestInfo | URL | undefined;
		let seenInit: RequestInit | undefined;
		const body = {
			instId: 'BTC-USDT',
			marginMode: 'isolated',
			side: 'buy',
			orderType: 'limit',
			price: '35000',
			size: '0.1',
			toJSON() {
				serializationCalls += 1;
				return {
					instId: this.instId,
					marginMode: this.marginMode,
					side: this.side,
					orderType: this.orderType,
					price: this.price,
					size: this.size
				};
			}
		};
		const expectedBody =
			'{"instId":"BTC-USDT","marginMode":"isolated","side":"buy","orderType":"limit","price":"35000","size":"0.1"}';

		installFetch(async (input, init) => {
			calls += 1;
			seenInput = input;
			seenInit = init;
			return successResponse({ orderId: 'order-1' });
		});

		const result = await blofinRestRequest<{ orderId: string }>({
			environment: 'demo',
			method: 'POST',
			requestPath,
			credentials: async (callback) => {
				callbackCalls += 1;
				return callback(CREDENTIALS);
			},
			body
		});

		expect(result).toEqual({ code: '0', msg: 'success', data: { orderId: 'order-1' } });
		expect(calls).toBe(1);
		expect(callbackCalls).toBe(1);
		expect(String(seenInput)).toBe('https://demo-trading-openapi.blofin.com/api/v1/trade/order');
		expect(seenInit?.method).toBe('POST');
		expect(seenInit?.body).toBe(expectedBody);
		expect(serializationCalls).toBe(1);

		const headers = requestHeaders(seenInit);
		expect(headers.get('ACCESS-KEY')).toBe(CREDENTIALS.apiKey);
		expect(headers.get('ACCESS-PASSPHRASE')).toBe(CREDENTIALS.passphrase);
		expect(headers.get('ACCESS-TIMESTAMP')).toMatch(/^\d+$/);
		expect(headers.get('ACCESS-NONCE')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
		expect(headers.get('content-type')).toBe('application/json');
		expect(headers.get('ACCESS-SIGN')).toBe(
			await signBlofinRest(
				SECRET,
				requestPath,
				'POST',
				headers.get('ACCESS-TIMESTAMP') ?? '',
				headers.get('ACCESS-NONCE') ?? '',
				expectedBody
			)
		);
	});

	test('uses the exact query string in GET signatures and sends no body', async () => {
		const requestPath = '/api/v1/account/balance?z=2&a=1';
		let seenInput: RequestInfo | URL | undefined;
		let seenInit: RequestInit | undefined;

		installFetch(async (input, init) => {
			seenInput = input;
			seenInit = init;
			return successResponse({ balance: '10' });
		});

		const result = await blofinRestRequest<{ balance: string }>({
			environment: 'production',
			method: 'GET',
			requestPath,
			credentials: provideCredentials
		});

		expect(result.data.balance).toBe('10');
		expect(String(seenInput)).toBe('https://openapi.blofin.com/api/v1/account/balance?z=2&a=1');
		expect(seenInit?.method).toBe('GET');
		expect(seenInit?.body).toBeUndefined();
	});

	test('uses a seven-second timeout signal', async () => {
		let timeoutMilliseconds: number | undefined;
		const fakeTimeout = (milliseconds: number) => {
			timeoutMilliseconds = milliseconds;
			return new AbortController().signal;
		};
		Object.defineProperty(AbortSignal, 'timeout', {
			configurable: true,
			writable: true,
			value: fakeTimeout
		});
		installFetch(async () => successResponse({ ok: true }));

		await blofinRestRequest<{ ok: boolean }>({
			environment: 'demo',
			method: 'GET',
			requestPath: '/api/v1/account/balance',
			credentials: provideCredentials
		});

		expect(timeoutMilliseconds).toBe(7000);
	});

	test('retries one transient GET network failure with the same serialized request', async () => {
		let calls = 0;
		let firstBody: unknown;
		let secondBody: unknown;
		let callbackCalls = 0;
		installFetch(async (_input, init) => {
			calls += 1;
			if (calls === 1) {
				firstBody = init?.body;
				throw new Error('temporary network failure');
			}
			secondBody = init?.body;
			return successResponse({ balance: '10' });
		});

		const result = await blofinRestRequest<{ balance: string }>({
			environment: 'demo',
			method: 'GET',
			requestPath: '/api/v1/account/balance',
			credentials: async (callback) => {
				callbackCalls += 1;
				return callback(CREDENTIALS);
			}
		});

		expect(result.data.balance).toBe('10');
		expect(calls).toBe(2);
		expect(callbackCalls).toBe(1);
		expect(firstBody).toBeUndefined();
		expect(secondBody).toBeUndefined();
	});

	test.each([429, 503])('retries one transient GET HTTP %s response', async (status: number) => {
		let calls = 0;
		installFetch(async () => {
			calls += 1;
			if (calls === 1) return new Response('{"code":"429","msg":"temporary","data":null}', { status });
			return successResponse({ balance: '10' });
		});

		await expect(
			blofinRestRequest<{ balance: string }>({
				environment: 'demo',
				method: 'GET',
				requestPath: '/api/v1/account/balance',
				credentials: provideCredentials
			})
		).resolves.toMatchObject({ data: { balance: '10' } });
		expect(calls).toBe(2);
	});

	test('never retries a mutation after a network failure', async () => {
		let calls = 0;
		installFetch(async () => {
			calls += 1;
			throw new Error('mutation transport failure');
		});

		await expect(
			blofinRestRequest({
				environment: 'demo',
				method: 'POST',
				requestPath: '/api/v1/trade/order',
				credentials: provideCredentials,
				body: { instId: 'BTC-USDT' }
			})
		).rejects.toThrow();
		expect(calls).toBe(1);
	});

	test('classifies safe BloFin errors without leaking credentials or response data', async () => {
		installFetch(async () =>
			new Response(
				JSON.stringify({
					code: '60009',
					msg: `signature rejected for ${SECRET}`,
					data: { secret: SECRET }
				}),
				{ status: 200, headers: { 'content-type': 'application/json' } }
			)
		);

		let thrown: unknown;
		try {
			await blofinRestRequest({
				environment: 'demo',
				method: 'GET',
				requestPath: '/api/v1/account/balance',
				credentials: provideCredentials
			});
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as Error).message).not.toContain(SECRET);
		expect((thrown as Error).message).not.toContain('data');
	});

	test('rejects non-allowlisted environments, external URLs, and sensitive operation paths before fetch', async () => {
		let calls = 0;
		installFetch(async () => {
			calls += 1;
			return successResponse({});
		});

		await expect(
			blofinRestRequest({
				environment: 'sandbox' as never,
				method: 'GET',
				requestPath: '/api/v1/account/balance',
				credentials: provideCredentials
			})
		).rejects.toThrow();
		await expect(
			blofinRestRequest({
				environment: 'demo',
				method: 'GET',
				requestPath: 'https://evil.example/api/v1/account/balance',
				credentials: provideCredentials
			})
		).rejects.toThrow();

		for (const requestPath of [
			'/api/v1/asset/balances',
			'/api/v1/transfer',
			'/api/v1/withdrawal',
			'/api/v1/sub-account/list'
		]) {
			await expect(
				blofinRestRequest({
					environment: 'demo',
					method: 'GET',
					requestPath,
					credentials: provideCredentials
				})
			).rejects.toThrow();
		}

		expect(calls).toBe(0);
	});
});
