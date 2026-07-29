import { describe, expect, test } from 'bun:test';
import { validateGatewayExposure } from './gateway-policy.mjs';

describe('gateway exposure policy', () => {
	test('allows loopback development binds', () => {
		expect(() => validateGatewayExposure({ host: '127.0.0.1' })).not.toThrow();
		expect(() => validateGatewayExposure({ host: 'localhost' })).not.toThrow();
	});

	test('rejects public binds without explicit controlled-deployment opt-in', () => {
		expect(() => validateGatewayExposure({ host: '0.0.0.0' })).toThrow('VICE_ALLOW_PUBLIC_GATEWAY');
	});

	test('requires HTTPS origin for an explicitly public bind', () => {
		expect(() => validateGatewayExposure({ host: '0.0.0.0', allowPublic: true, origin: 'http://example.com' })).toThrow('https');
		expect(() => validateGatewayExposure({ host: '0.0.0.0', allowPublic: true, origin: 'https://example.com' })).not.toThrow();
	});
});
