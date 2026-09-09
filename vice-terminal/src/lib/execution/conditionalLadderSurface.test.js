import { describe, expect, test } from 'bun:test';

describe('conditional ladder release surface', () => {
	test('is catalogued and persists the trigger intent', async () => {
		const capability = await Bun.file(new URL('./capabilities.ts', import.meta.url)).text();
		const execution = await Bun.file(new URL('./conditionalLadder.ts', import.meta.url)).text();
		const orders = await Bun.file(new URL('../hl/orders.ts', import.meta.url)).text();
		const ticket = await Bun.file(new URL('../components/OrderTicket.svelte', import.meta.url)).text();
		const model = await Bun.file(new URL('../orderTicketModel.ts', import.meta.url)).text();
		expect(capability).toContain("'conditional_ladder'");
		expect(capability).toContain('VITE_HL_CERTIFIED_CONDITIONAL_LADDER');
		expect(execution).toContain("type: 'conditional_ladder'");
		expect(execution).toContain('marketKey: market.marketKey');
		expect(execution).toContain('apiCoin: market.apiCoin');
		expect(execution).toContain('placeScale');
		expect(execution).toContain('armDeadman(job.deadmanMs)');
		expect(execution).toContain('pendingScaleCommandId');
		expect(execution).toContain('recoverPendingScaleDispatch');
		expect(orders).toContain("params.type === 'conditional_ladder'");
		expect(model).toContain("id: 'conditional_ladder'");
		expect(ticket).toContain('conditionalTriggerKind');
		expect(ticket).toContain('conditionalTriggerSource');
		expect(ticket).toContain('conditionalTriggerInterval');
		expect(ticket).toContain('conditionalTriggerAtMs');
		expect(ticket).toContain('conditionalPairMarketKey');
		expect(ticket).toContain('conditionalPairOperation');
		expect(orders).toContain('conditionalTriggerKind');
		expect(orders).toContain('conditionalTriggerSource');
		expect(orders).toContain('conditionalTriggerInterval');
		expect(orders).toContain('conditionalTriggerAtMs');
		expect(orders).toContain('conditionalPairMarketKey');
		expect(orders).toContain('conditionalPairOperation');
	});

	test('conditional ladder never transmits before its trigger', async () => {
		const execution = await Bun.file(new URL('./conditionalLadder.ts', import.meta.url)).text();
		expect(execution).toContain('evaluateConditionalTrigger');
		expect(execution).toContain("type: 'priceCross'");
		expect(execution).toContain("'candleClose' | 'candleVolume'");
		expect(execution).toContain("'time'");
		expect(execution).toContain("'syntheticPair'");
		expect(execution).toContain('exactAllMidIsLive(job.apiCoin, now)');
		expect(execution).toContain('exactAllMidIsLive(job.pairApiCoin, now)');
		expect(execution).toContain('Choose a future local time');
		expect(execution).toContain('candleDataStatus) !== \'live\'');
		expect(execution).toContain('get(chartTimeframe) !== trigger.interval');
		expect(execution).toContain('marketDataStatus) !== \'live\'');
		expect(execution).toContain('pauseConditionalTrigger(job.triggerState, now)');
		expect(execution).toContain('recordAutomationTriggerOutcome');
		expect(execution).toContain('Persist the fired edge before dispatch');
		expect(execution).toContain('resumePersistedConditionalLadders');
	});
});
