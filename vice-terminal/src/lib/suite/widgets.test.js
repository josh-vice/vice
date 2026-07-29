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
});
