import { describe, expect, test } from 'bun:test';
import { nativeWidgetPorts } from './widgets';

describe('native widget ports', () => {
	test('maps the first native watchlist port to its legacy identity and story', () => {
		expect(nativeWidgetPorts.vWatch).toEqual({
			legacyId: 'vWatch',
			title: 'Market Watchlist',
			story: 'US-014',
			nativeRoute: '/hub/native/watchlist',
			provenance: 'Hyperliquid canonical public market registry',
			status: 'ported'
		});
	});

	test('maps local price alerts to the native watchlist surface without an execution boundary', () => {
		expect(nativeWidgetPorts.vAlerts).toEqual({
			legacyId: 'vAlerts',
			title: 'Price Alerts',
			story: 'US-014',
			nativeRoute: '/hub/native/watchlist',
			provenance: 'Hyperliquid canonical public market registry (browser-local alerts)',
			status: 'ported'
		});
	});

	test('maps Top Movers to the shared canonical market registry', () => {
		expect(nativeWidgetPorts.vMovers).toEqual({
			legacyId: 'vMovers',
			title: 'Top Movers',
			story: 'US-014',
			nativeRoute: '/hub/native/movers',
			provenance: 'Hyperliquid canonical public market registry (venue 24-hour context)',
			status: 'ported'
		});
	});

	test('maps device-local notes to their own native route', () => {
		expect(nativeWidgetPorts.vNotes).toEqual({
			legacyId: 'vNotes',
			title: 'Notes',
			story: 'US-014',
			nativeRoute: '/hub/native/notes',
			provenance: 'Device-local notes with one-time legacy Hub scratchpad import',
			status: 'ported'
		});
	});

	test('maps regular-hours session clocks to their native route', () => {
		expect(nativeWidgetPorts.vClocks).toEqual({
			legacyId: 'vClocks',
			title: 'Session Clocks',
			story: 'US-014',
			nativeRoute: '/hub/native/session-clocks',
			provenance: 'Browser clock with explicit IANA time zones and regular exchange hours',
			status: 'ported'
		});
	});

	test('maps the UTC candle-close clock to its native route', () => {
		expect(nativeWidgetPorts.vCountdown).toEqual({
			legacyId: 'vCountdown',
			title: 'Candle Close',
			story: 'US-014',
			nativeRoute: '/hub/native/candle-countdown',
			provenance: 'Browser clock with UTC-aligned candle boundaries',
			status: 'ported'
		});
	});

	test('maps the shared-data price chart to its read-only native route', () => {
		expect(nativeWidgetPorts.vPrice).toEqual({
			legacyId: 'vPrice',
			title: 'Price',
			story: 'US-014',
			nativeRoute: '/hub/native/price',
			provenance: 'Shared canonical public market and candle data plane',
			status: 'ported'
		});
	});
});
