import { describe, expect, test } from 'bun:test';
import {
	redactString,
	redactDeep,
	isOrderPayload,
	capStringLength,
	REDACTED
} from './redact';
import {
	resetDiagnosticsRecorders,
	recordHealthTransition,
	recordRequestFailure,
	recordAppError,
	sanitizeRequestUrl,
	getHealthTransitions,
	getRequestFailures,
	getAppErrors
} from './recorder';
import { MAX_HEALTH_TRANSITIONS, MAX_APP_ERRORS, MAX_REQUEST_FAILURES } from './schema';

describe('redactString — adversarial secrets', () => {
	const cases = [
		// 64-hex private key
		['key 0x' + 'a'.repeat(64), 'key [REDACTED]'],
		// EIP-712 65-byte signature (130 hex)
		['sig 0x' + 'b'.repeat(130), 'sig [REDACTED]'],
		// 40-hex address
		['send to 0x' + 'c'.repeat(40), 'send to [REDACTED]'],
		// 24+ hex blob fallback
		['blob 0x' + 'd'.repeat(32), 'blob [REDACTED]'],
		// JWT
		['token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.abcdefghijklmnopqrstuvwxyz', 'token [REDACTED]'],
		// Bearer token
		['Authorization: bearer abcdefghijklmnopqrstuvwxyz123456', 'Authorization: [REDACTED]'],
		// 12-word mnemonic
		[
			'seed abandon ability able about above absent absorb abstract absurd abuse access',
			'[REDACTED]'
		]
	];

	test.each(cases)('redacts %p', (input, expected) => {
		expect(redactString(input)).toBe(expected);
	});

	test('leaves normal terminal text alone', () => {
		const normal = 'Market BTC is live, equity 1,000 USD, no issues';
		expect(redactString(normal)).toBe(normal);
	});

	test('does not mangle ordinary numbers/prices', () => {
		expect(redactString('PNL +$1,234.56 at price 67,000.25')).toContain('1,234.56');
	});
});

describe('isOrderPayload', () => {
	test('detects Hyperliquid order envelopes', () => {
		expect(isOrderPayload({ coin: 'BTC', sz: '0.5', isBuy: true, limitPx: '67000' })).toBe(true);
		expect(isOrderPayload({ cloid: 'abc', side: 'buy' })).toBe(true);
	});
	test('rejects non-order objects', () => {
		expect(isOrderPayload({ name: 'Vice', version: '1' })).toBe(false);
		expect(isOrderPayload({ health: 'live' })).toBe(false);
	});
});

describe('redactDeep — nested structured data', () => {
	test('drops sensitive keys regardless of value', () => {
		const input = {
			privateKey: '0x' + 'a'.repeat(64),
			address: '0x' + 'c'.repeat(40),
			token: 'sometoken',
			safe: 'Vice Terminal v1',
			nested: { signature: '0x' + 'b'.repeat(130), child: { secret: 'shh' } }
		};
		const out = redactDeep(input);
		expect(out.privateKey).toBe(REDACTED);
		expect(out.address).toBe(REDACTED);
		expect(out.token).toBe(REDACTED);
		expect(out.safe).toBe('Vice Terminal v1');
		expect(out.nested.signature).toBe(REDACTED);
		expect(out.nested.child.secret).toBe(REDACTED);
	});

	test('replaces whole order-payload objects', () => {
		const out = redactDeep({ order: { coin: 'BTC', sz: '1', isBuy: false, limitPx: '60000' } });
		expect(out.order).toBe(REDACTED);
	});

	test('walks arrays and leaves non-secret values', () => {
		const out = redactDeep(['live', 'BTC', 123.45, { status: 'ok' }]);
		expect(out).toEqual(['live', 'BTC', 123.45, { status: 'ok' }]);
	});
});

describe('capStringLength', () => {
	test('truncates long strings with marker', () => {
		const s = capStringLength('x'.repeat(1000), 50);
		expect(s.length).toBeLessThan(1000);
		expect(s.endsWith('…[truncated]')).toBe(true);
	});
	test('leaves short strings untouched', () => {
		expect(capStringLength('short', 50)).toBe('short');
	});
});

describe('recorder — bounded retention', () => {
	test('health transitions bound at MAX_HEALTH_TRANSITIONS', () => {
		resetDiagnosticsRecorders();
		for (let i = 0; i < MAX_HEALTH_TRANSITIONS + 50; i++) {
			recordHealthTransition('accountSync', `s${i}`, `s${i + 1}`);
		}
		expect(getHealthTransitions().length).toBe(MAX_HEALTH_TRANSITIONS);
		// Oldest dropped, newest kept.
		expect(getHealthTransitions()[0].from).toBe('s50');
	});

	test('request failures bound and URL sanitized', () => {
		resetDiagnosticsRecorders();
		for (let i = 0; i < MAX_REQUEST_FAILURES + 10; i++) {
			recordRequestFailure({ category: 'network', method: 'GET', url: 'https://api.example.com/path?secret=1' });
		}
		expect(getRequestFailures().length).toBe(MAX_REQUEST_FAILURES);
		const first = getRequestFailures()[0];
		expect(first.url).toBe('https://api.example.com/path'); // query stripped
	});

	test('app errors bound', () => {
		resetDiagnosticsRecorders();
		for (let i = 0; i < MAX_APP_ERRORS + 10; i++) {
			recordAppError({ type: 'error', message: `err ${i}` });
		}
		expect(getAppErrors().length).toBe(MAX_APP_ERRORS);
	});

	test('sanitizeRequestUrl strips query/hash and credentials', () => {
		expect(sanitizeRequestUrl('https://user:pass@host.example/x?k=v#frag')).toBe('https://host.example/x');
		expect(sanitizeRequestUrl('relative/path?secret=1')).toBe('relative/path');
	});
});

describe('health transition dedup', () => {
	test('same from==to is not recorded', () => {
		resetDiagnosticsRecorders();
		recordHealthTransition('wallet', 'live', 'live');
		expect(getHealthTransitions().length).toBe(0);
		recordHealthTransition('wallet', 'idle', 'live');
		expect(getHealthTransitions().length).toBe(1);
	});
});
