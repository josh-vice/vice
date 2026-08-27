import { describe, expect, test } from 'bun:test';
import { advancedOrderTypes, certificationEnvKey, isAdvancedOrderCertified } from './capabilities';

describe('adaptive order surface', () => {
	test('adaptive TWAP and VWAP are real gated capabilities', async () => {
		const source = await Bun.file(new URL('../hl/orders.ts', import.meta.url)).text();
		const model = await Bun.file(new URL('../orderTicketModel.ts', import.meta.url)).text();
		expect(advancedOrderTypes()).toEqual(expect.arrayContaining(['adaptive_twap', 'vwap']));
		expect(certificationEnvKey('adaptive_twap')).toBe('VITE_HL_CERTIFIED_ADAPTIVE_TWAP');
		expect(certificationEnvKey('vwap')).toBe('VITE_HL_CERTIFIED_VWAP');
		expect(isAdvancedOrderCertified('adaptive_twap', undefined)).toBe(false);
		expect(source).toContain("params.type === 'adaptive_twap' || params.type === 'vwap'");
		expect(source).toContain("import('$lib/execution/adaptiveTwap')");
		expect(model).toContain("id: 'adaptive_twap'");
		expect(model).toContain("id: 'vwap'");
	});

	test('adaptive jobs persist exact market identity and expose lifecycle controls', async () => {
		const execution = await Bun.file(new URL('./adaptiveTwap.ts', import.meta.url)).text();
		const jobs = await Bun.file(new URL('./algoJobs.ts', import.meta.url)).text();
		const panel = await Bun.file(new URL('../components/BottomPanel.svelte', import.meta.url)).text();
		for (const token of ['marketKey', 'apiCoin', 'assetId', 'childOrderIds', 'deadmanMs', 'resumePersistedAdaptiveExecutions']) expect(execution).toContain(token);
		expect(jobs).toContain("'adaptive_twap', 'vwap'");
		expect(panel).toContain('pauseAdaptiveExecution');
		expect(panel).toContain('cancelAdaptiveExecution');
	});
});
