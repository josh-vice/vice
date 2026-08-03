import { describe, expect, test } from 'bun:test';
import {
	aggregateAccounts,
	assertAccountHealthRow,
	attributePayloadToAccount,
	mergeAccountHealth,
	summarizeVenueHealth
} from './aggregation';

function account(venue, accountKey) {
	return { accountKey, venue, credentialRef: `creds:${accountKey}`, accountMode: 'single' };
}

function row(venue, accountKey, instrumentKey, health = 'live') {
	return {
		venue,
		environment: 'testnet',
		account: account(venue, accountKey),
		health,
		healthSource: 'venuePrivateSnapshot',
		updatedAtMs: 1_000,
		instrumentKey,
		sourceTimestampUs: '2000000',
		payload: { value: 1 }
	};
}

describe('US-017 account aggregation', () => {
	test('preserves venue, environment, account, instrument, source timestamp, and health for every row', () => {
		const source = [row('hyperliquid', 'hyperliquid:alice', 'hyperliquid:linearPerp:BTC', 'stale')];
		const aggregated = aggregateAccounts(source);
		expect(aggregated).toHaveLength(1);
		expect(aggregated[0].venue).toBe('hyperliquid');
		expect(aggregated[0].environment).toBe('testnet');
		expect(aggregated[0].account.accountKey).toBe('hyperliquid:alice');
		expect(aggregated[0].account.credentialRef).toBe('creds:hyperliquid:alice');
		expect(aggregated[0].instrumentKey).toBe('hyperliquid:linearPerp:BTC');
		expect(aggregated[0].sourceTimestampUs).toBe('2000000');
		expect(aggregated[0].health).toBe('stale');
		expect(aggregated[0].payload.value).toBe(1);
	});

	test('orders rows deterministically by venue, account, instrument', () => {
		const rows = [
			row('nado', 'nado:bob', 'nado:linearPerp:SOL'),
			row('hyperliquid', 'hyperliquid:alice', 'hyperliquid:linearPerp:BTC'),
			row('hyperliquid', 'hyperliquid:alice', 'hyperliquid:linearPerp:ETH')
		];
		const first = aggregateAccounts(rows);
		const second = aggregateAccounts([...rows].reverse());
		expect(first.map((entry) => entry.instrumentKey)).toEqual([
			'hyperliquid:linearPerp:BTC',
			'hyperliquid:linearPerp:ETH',
			'nado:linearPerp:SOL'
		]);
		expect(first.map((entry) => entry.instrumentKey)).toEqual(second.map((entry) => entry.instrumentKey));
	});

	test('a degraded venue marks only its own rows stale and never another venue', () => {
		const rows = [
			row('hyperliquid', 'hyperliquid:alice', 'hyperliquid:linearPerp:BTC'),
			row('nado', 'nado:bob', 'nado:linearPerp:SOL')
		];
		const merged = mergeAccountHealth(
			rows,
			new Map([['nado', { health: 'error', healthSource: 'venuePrivateSnapshot', updatedAtMs: 2_000 }]])
		);
		expect(merged.find((entry) => entry.venue === 'nado')?.health).toBe('error');
		expect(merged.find((entry) => entry.venue === 'hyperliquid')?.health).toBe('live');
		expect(merged.find((entry) => entry.venue === 'hyperliquid')?.updatedAtMs).toBe(1_000);
	});

	test('refuses to attribute a payload across venues or to a different account', () => {
		const hyperliquidRow = row('hyperliquid', 'hyperliquid:alice', 'hyperliquid:linearPerp:BTC');
		expect(() => attributePayloadToAccount(hyperliquidRow, account('nado', 'nado:bob'))).toThrow(/cross-venue/);
		expect(() => attributePayloadToAccount(hyperliquidRow, account('hyperliquid', 'hyperliquid:mallory'))).toThrow(/different account/);
		expect(() => attributePayloadToAccount(hyperliquidRow, account('hyperliquid', 'hyperliquid:alice'))).not.toThrow();
	});

	test('anonymous venue health summary never leaks account identity', () => {
		const rows = [
			row('hyperliquid', 'hyperliquid:alice', 'hyperliquid:linearPerp:BTC', 'live'),
			row('hyperliquid', 'hyperliquid:alice', 'hyperliquid:linearPerp:ETH', 'stale'),
			row('nado', 'nado:bob', 'nado:linearPerp:SOL', 'live')
		];
		const summary = summarizeVenueHealth(rows);
		expect(summary).toEqual({
			hyperliquid: { live: 1, stale: 1 },
			nado: { live: 1 }
		});
		expect(JSON.stringify(summary)).not.toContain('alice');
		expect(JSON.stringify(summary)).not.toContain('creds');
	});

	test('validates row identity fields and fails closed on bad timestamps', () => {
		const bad = row('hyperliquid', 'hyperliquid:alice', 'hyperliquid:linearPerp:BTC');
		bad.sourceTimestampUs = 'not-a-number';
		expect(() => assertAccountHealthRow(bad)).toThrow(/unsigned integer/);
		const badTime = row('hyperliquid', 'hyperliquid:alice', 'hyperliquid:linearPerp:BTC');
		badTime.updatedAtMs = -1;
		expect(() => assertAccountHealthRow(badTime)).toThrow(/non-negative/);
	});
});
