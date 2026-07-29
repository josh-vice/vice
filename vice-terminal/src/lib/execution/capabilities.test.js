import { describe, expect, test } from 'bun:test';
import { advancedOrderTypes, certificationEnvKey, isAdvancedOrderCertified, unavailableOrderTypeMessage } from './capabilities.ts';

describe('US-004 advanced capability release gate', () => {
	test('keeps advanced types unavailable until explicitly certified', () => {
		expect(isAdvancedOrderCertified('twap', undefined)).toBe(false);
		expect(isAdvancedOrderCertified('scale', 'false')).toBe(false);
		expect(isAdvancedOrderCertified('twap', 'true', 'true')).toBe(true);
	});

	test('keeps basic and simple conditional order types available', () => {
		expect(isAdvancedOrderCertified('limit', undefined)).toBe(true);
		expect(isAdvancedOrderCertified('market', undefined)).toBe(true);
		expect(isAdvancedOrderCertified('bracket', undefined)).toBe(false);
		expect(certificationEnvKey('bracket')).toBe('VITE_HL_CERTIFIED_BRACKET');
	});

	test('returns an explicit certification message', () => {
		expect(unavailableOrderTypeMessage('scale')).toContain('funded-testnet');
	});

	test('supports independent certification flags without allowing a global flag to override an explicit denial', () => {
		expect(certificationEnvKey('oco')).toBe('VITE_HL_CERTIFIED_OCO');
		expect(isAdvancedOrderCertified('oco', 'true', 'false')).toBe(false);
		expect(isAdvancedOrderCertified('oco', 'false', 'true')).toBe(false);
		expect(isAdvancedOrderCertified('oco', 'true', undefined)).toBe(false);
		expect(isAdvancedOrderCertified('oco', 'true', 'true')).toBe(true);
	});

	test('requires a named certification flag for every advanced family', () => {
		for (const type of advancedOrderTypes()) {
			expect(certificationEnvKey(type)).toMatch(/^VITE_HL_CERTIFIED_/);
			expect(isAdvancedOrderCertified(type, 'true', undefined)).toBe(false);
		}
	});
});
