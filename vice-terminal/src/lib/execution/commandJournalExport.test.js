import { describe, expect, test } from 'bun:test';
import { exportExecutionAudit } from './commandJournal.ts';

const account = '0xA11CE';
const configuredNetwork = process.env.VITE_HL_TRADING_NETWORK?.trim().toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
const oppositeNetwork = configuredNetwork === 'mainnet' ? 'testnet' : 'mainnet';

describe('local execution audit export', () => {
	test('keeps deterministic reconciliable evidence while excluding errors and private command material', () => {
		const exportFile = exportExecutionAudit(account, [
			{ commandId: 'later', network: configuredNetwork, account, sequence: 2, kind: 'cancel', cloids: [], targetOrderId: '77', status: 'reconciled', venueOrderIds: ['77'], error: 'raw upstream body and token', updatedAt: 20 },
			{ commandId: 'first', network: configuredNetwork, account, sequence: 1, kind: 'place', cloids: ['cloid-1'], status: 'accepted', venueOrderIds: ['66'], error: 'signature=secret', updatedAt: 10 }
		]);
		expect(exportFile).toEqual({
			schema: 1,
			kind: 'vice.execution-audit',
			network: configuredNetwork,
			account: '0xa11ce',
			entries: [
				{ commandId: 'first', sequence: 1, kind: 'place', cloids: ['cloid-1'], status: 'accepted', venueOrderIds: ['66'], updatedAt: 10 },
				{ commandId: 'later', sequence: 2, kind: 'cancel', cloids: [], status: 'reconciled', venueOrderIds: ['77'], updatedAt: 20, targetOrderId: '77' }
			]
		});
		expect(JSON.stringify(exportFile)).not.toContain('signature=secret');
		expect(JSON.stringify(exportFile)).not.toContain('raw upstream');
	});

	test('omits malformed, wrong-account, and wrong-network records', () => {
		const exportFile = exportExecutionAudit(account, [
			{ commandId: 'wrong-account', network: configuredNetwork, account: '0xother', sequence: 1, kind: 'place', cloids: [], status: 'accepted', venueOrderIds: [], updatedAt: 1 },
			{ commandId: 'bad-sequence', network: configuredNetwork, account, sequence: 1.5, kind: 'place', cloids: [], status: 'accepted', venueOrderIds: [], updatedAt: 1 },
			{ commandId: 'wrong-network', network: oppositeNetwork, account, sequence: 3, kind: 'place', cloids: [], status: 'accepted', venueOrderIds: [], updatedAt: 1 }
		]);
		expect(exportFile.entries).toEqual([]);
	});
});
