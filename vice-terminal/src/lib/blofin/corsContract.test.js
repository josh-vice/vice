import { describe, expect, test } from 'bun:test';
import { BLOFIN_ENVIRONMENTS } from './environment.ts';

const DOCUMENTED_ENVIRONMENTS = {
	demo: {
		rest: 'https://demo-trading-openapi.blofin.com',
		publicWs: 'wss://demo-trading-openapi.blofin.com/ws/public',
		privateWs: 'wss://demo-trading-openapi.blofin.com/ws/private'
	},
	production: {
		rest: 'https://openapi.blofin.com',
		publicWs: 'wss://openapi.blofin.com/ws/public',
		privateWs: 'wss://openapi.blofin.com/ws/private'
	}
};

const DOCUMENTED_URLS = new Set(Object.values(DOCUMENTED_ENVIRONMENTS).flatMap((environment) => Object.values(environment)));

describe('BloFin browser transport boundary', () => {
	test('exposes exactly the documented demo and production environments', () => {
		expect(Object.keys(BLOFIN_ENVIRONMENTS).sort()).toEqual(['demo', 'production']);
		expect(BLOFIN_ENVIRONMENTS).toEqual(DOCUMENTED_ENVIRONMENTS);
		expect(Object.isFrozen(BLOFIN_ENVIRONMENTS)).toBe(true);
	});

	test('contains only allowlisted BloFin REST and WebSocket URLs', () => {
		for (const environment of Object.values(BLOFIN_ENVIRONMENTS)) {
			expect(DOCUMENTED_URLS.has(environment.rest)).toBe(true);
			expect(DOCUMENTED_URLS.has(environment.publicWs)).toBe(true);
			expect(DOCUMENTED_URLS.has(environment.privateWs)).toBe(true);
			expect(new URL(environment.rest).protocol).toBe('https:');
			expect(new URL(environment.publicWs).protocol).toBe('wss:');
			expect(new URL(environment.privateWs).protocol).toBe('wss:');
		}
	});

	test('has no arbitrary environment or URL escape hatch', () => {
		expect(BLOFIN_ENVIRONMENTS.sandbox).toBeUndefined();
		expect(DOCUMENTED_URLS.has('https://evil.example')).toBe(false);
		expect(DOCUMENTED_URLS.has('https://openapi.blofin.com.evil.example')).toBe(false);
	});
});
